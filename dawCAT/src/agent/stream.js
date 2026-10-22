/* dawCAT — server-sent-events streaming for both provider wire formats.
   Chunks arrive at arbitrary byte boundaries (mid-line, even mid-UTF-8
   character), so decoding is streaming and events are only emitted once
   their terminating blank line has arrived. Pure: works on any object with
   body.getReader(), which is how the tests drive it. */
import { parseCompletion, normalizeUsage } from './providers.js';

/* Incremental SSE parser: push() text as it arrives, onEvent({event, data})
   fires per complete event. Comment lines (":") are ignored; multiple data
   lines join with "\n" per the spec. */
export function createSseParser(onEvent) {
  let buffer = '';
  const flush = (block) => {
    let event = 'message';
    const data = [];
    for (const line of block.split(/\r?\n/)) {
      if (!line || line.startsWith(':')) continue;
      const i = line.indexOf(':');
      const field = i < 0 ? line : line.slice(0, i);
      const value = i < 0 ? '' : line.slice(i + 1).replace(/^ /, '');
      if (field === 'event') event = value;
      else if (field === 'data') data.push(value);
    }
    if (data.length) onEvent({ event, data: data.join('\n') });
  };
  return {
    push(text) {
      buffer += text;
      let m;
      while ((m = /\r?\n\r?\n/.exec(buffer))) {
        const block = buffer.slice(0, m.index);
        buffer = buffer.slice(m.index + m[0].length);
        flush(block);
      }
    },
    end() { if (buffer.trim()) flush(buffer); buffer = ''; }
  };
}

function streamError(message) {
  const err = new Error(message);
  err.code = 'stream-error';
  return err;
}

/* Reads a provider response to completion, reporting text/thinking deltas as
   they arrive. Resolves { text, thinking, truncated, refusal, usage }. */
export async function readCompletionStream(api, response, { onText, onThinking, onUsage } = {}) {
  const type = (response.headers && response.headers.get && response.headers.get('content-type')) || '';
  if (/application\/json/i.test(type) && !/event-stream/i.test(type)) {
    const out = parseCompletion(api, await response.json());
    if (out.thinking && onThinking) onThinking(out.thinking);
    if (out.text && onText) onText(out.text);
    if (out.usage && onUsage) onUsage(out.usage);
    return out;
  }

  const state = { text: '', thinking: '', truncated: false, refusal: false, usage: null };
  const addText = (t) => { if (!t) return; state.text += t; if (onText) onText(t); };
  const addThinking = (t) => { if (!t) return; state.thinking += t; if (onThinking) onThinking(t); };
  const setUsage = (u) => {
    const n = normalizeUsage(u);
    if (!n) return;
    state.usage = { input: n.input || (state.usage && state.usage.input) || 0, output: n.output || (state.usage && state.usage.output) || 0 };
    if (onUsage) onUsage(state.usage);
  };
  let failure = null;

  const handleOpenAI = (data) => {
    if (data === '[DONE]') return;
    let json; try { json = JSON.parse(data); } catch { return; }
    if (json.error) { failure = streamError(json.error.message || JSON.stringify(json.error)); return; }
    const choice = json.choices && json.choices[0];
    if (choice) {
      const d = choice.delta || choice.message || {};
      addThinking(d.reasoning_content || d.reasoning || '');
      addText(typeof d.content === 'string' ? d.content : Array.isArray(d.content) ? d.content.map((p) => p.text || '').join('') : '');
      if (choice.finish_reason === 'length' || choice.finish_reason === 'max_tokens') state.truncated = true;
      if (choice.finish_reason === 'content_filter') state.refusal = true;
    }
    if (json.usage) setUsage(json.usage);
  };

  const handleAnthropic = (event, data) => {
    let json; try { json = JSON.parse(data); } catch { return; }
    const kind = json.type || event;
    if (kind === 'error') { failure = streamError((json.error && json.error.message) || 'Provider stream error'); return; }
    if (kind === 'message_start' && json.message) setUsage(json.message.usage);
    if (kind === 'content_block_delta' && json.delta) {
      if (json.delta.type === 'text_delta') addText(json.delta.text);
      else if (json.delta.type === 'thinking_delta') addThinking(json.delta.thinking);
    }
    if (kind === 'message_delta') {
      const reason = json.delta && json.delta.stop_reason;
      if (reason === 'max_tokens') state.truncated = true;
      if (reason === 'refusal') state.refusal = true;
      if (json.usage) setUsage(json.usage);
    }
  };

  const parser = createSseParser(({ event, data }) => {
    if (failure) return;
    if (api === 'anthropic') handleAnthropic(event, data);
    else handleOpenAI(data);
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.push(typeof value === 'string' ? value : decoder.decode(value, { stream: true }));
      if (failure) break;
    }
    parser.push(decoder.decode());
    parser.end();
  } finally {
    try { reader.releaseLock(); } catch { /* already released */ }
  }
  if (failure) throw failure;
  return state;
}
