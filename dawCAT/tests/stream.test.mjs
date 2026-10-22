import { test, assert, fakeResponse } from './harness.mjs';
import { createSseParser, readCompletionStream } from '../src/agent/stream.js';

const sse = (obj) => `data: ${JSON.stringify(obj)}\n\n`;

test('the SSE parser reassembles events split across chunks', () => {
  const events = [];
  const p = createSseParser((e) => events.push(e));
  p.push('data: {"a":');
  p.push('1}\n');
  p.push('\nevent: x\ndata: {"b":2}\n\n: comment\n\n');
  p.end();
  assert.deepEqual(events, [{ event: 'message', data: '{"a":1}' }, { event: 'x', data: '{"b":2}' }]);
});

test('CRLF line endings are handled', () => {
  const events = [];
  const p = createSseParser((e) => events.push(e));
  p.push('data: one\r\n\r\ndata: two\r\n\r\n');
  assert.deepEqual(events.map((e) => e.data), ['one', 'two']);
});

test('OpenAI-style deltas stream text and reasoning', async () => {
  const text = [], thinking = [];
  const res = fakeResponse({ chunks: [
    sse({ choices: [{ delta: { reasoning_content: 'hm' } }] }),
    'data: {"choices":[{"delta":{"content":"he',
    'llo"}}]}\n\n',
    sse({ choices: [{ delta: { content: ' world' }, finish_reason: 'stop' }] }),
    sse({ choices: [], usage: { prompt_tokens: 5, completion_tokens: 7 } }),
    'data: [DONE]\n\n'
  ] });
  const out = await readCompletionStream('openai', res, { onText: (t) => text.push(t), onThinking: (t) => thinking.push(t) });
  assert.equal(out.text, 'hello world');
  assert.equal(out.thinking, 'hm');
  assert.equal(out.truncated, false);
  assert.deepEqual(out.usage, { input: 5, output: 7 });
  assert.deepEqual(text, ['hello', ' world']);
});

test('a multi-byte character split across chunks decodes intact', async () => {
  const bytes = new TextEncoder().encode(sse({ choices: [{ delta: { content: '猫🐈' } }] }));
  const res = fakeResponse({ chunks: [bytes.slice(0, 40), bytes.slice(40)] });
  const out = await readCompletionStream('openai', res, {});
  assert.equal(out.text, '猫🐈');
});

test('finish_reason length marks the stream truncated', async () => {
  const res = fakeResponse({ chunks: [sse({ choices: [{ delta: { content: '{"actions":[' }, finish_reason: 'length' }] })] });
  assert.equal((await readCompletionStream('openai', res, {})).truncated, true);
});

test('Anthropic events route text and thinking deltas', async () => {
  const thinking = [];
  const res = fakeResponse({ chunks: [
    `event: message_start\ndata: ${JSON.stringify({ type: 'message_start', message: { usage: { input_tokens: 11, output_tokens: 1 } } })}\n\n`,
    `event: content_block_delta\ndata: ${JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'plan' } })}\n\n`,
    `event: content_block_delta\ndata: ${JSON.stringify({ type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: '{"actions":[]}' } })}\n\n`,
    `event: message_delta\ndata: ${JSON.stringify({ type: 'message_delta', delta: { stop_reason: 'max_tokens' }, usage: { output_tokens: 9 } })}\n\n`,
    `event: message_stop\ndata: {"type":"message_stop"}\n\n`
  ] });
  const out = await readCompletionStream('anthropic', res, { onThinking: (t) => thinking.push(t) });
  assert.equal(out.text, '{"actions":[]}');
  assert.equal(out.thinking, 'plan');
  assert.equal(out.truncated, true);
  assert.deepEqual(out.usage, { input: 11, output: 9 });
  assert.deepEqual(thinking, ['plan']);
});

test('stream errors are thrown with the provider message', async () => {
  const res = fakeResponse({ chunks: [`event: error\ndata: ${JSON.stringify({ type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } })}\n\n`] });
  await assert.rejects(readCompletionStream('anthropic', res, {}), /Overloaded/);
  const oai = fakeResponse({ chunks: [sse({ error: { message: 'context length exceeded' } })] });
  await assert.rejects(readCompletionStream('openai', oai, {}), /context length/);
});

test('a server that ignores stream:true and returns JSON still works', async () => {
  const res = fakeResponse({ json: { choices: [{ message: { content: 'plain' }, finish_reason: 'stop' }] } });
  const texts = [];
  const out = await readCompletionStream('openai', res, { onText: (t) => texts.push(t) });
  assert.equal(out.text, 'plain');
  assert.deepEqual(texts, ['plain']);
});
