/* dawCAT — AI agent conversation session. Owns the turns of a chat with the
   model: builds each request (system prompt + compact history + the current
   project context), streams the reply, extracts and validates the JSON plan,
   and — when the model gets something wrong — hands the exact error back and
   asks for a corrected plan, up to `repairAttempts` times. That repair loop is
   what makes small local models usable.

   DOM-free: fetch, settings, context and plan execution are all injected. */
import { normalizeSettings, providerInfo, buildChatRequest, adaptRequestForError } from './providers.js';
import { readCompletionStream } from './stream.js';
import { diagnoseNetworkFailure, notJsonHint, httpErrorHint } from './diagnose.js';
import { extractJson, validatePlan, planJsonSchema } from './schema.js';
import { MODES, buildSystemPrompt, buildUserMessage, compactContext, chooseDetail } from './prompt.js';

const HISTORY_TURNS = 6;
const MAX_ADAPTATIONS = 4;
let turnCounter = 0;

function newTurnId() { turnCounter += 1; return `turn${Date.now().toString(36)}${turnCounter}`; }

function redactHeaders(headers) {
  const out = {};
  for (const [k, v] of Object.entries(headers || {})) out[k] = /authorization|api-key/i.test(k) ? '••••' : v;
  return out;
}

function repairMessage(problems) {
  const list = problems.slice(0, 12).map((p) => `- ${p}`).join('\n');
  return `Your previous response could not be used:\n${list}\nReturn the COMPLETE corrected JSON plan (every action, not just the fixed ones) as a single JSON object, nothing else.`;
}

/* One line per earlier turn for the model's memory of the conversation —
   what was asked, what it did, and whether that worked. */
function historyFor(turn) {
  const msgs = [{ role: 'user', content: `[${(MODES[turn.mode] || MODES.free).label} mode] ${turn.prompt}` }];
  const p = turn.plan;
  const parts = [];
  if (p && p.summary) parts.push(`summary: ${p.summary}`);
  if (p && p.reply) parts.push(`reply: ${p.reply.slice(0, 600)}`);
  if (p && p.actions && p.actions.length) parts.push(`actions: ${p.actions.map((a) => `${a.type}${a.target && a.target !== 'selection' ? `(${a.target})` : ''}`).join(', ')}`);
  const outcome = { applied: 'applied OK', answered: 'answered', review: 'waiting for the user to apply', failed: `failed — ${turn.message || 'error'}`, stopped: 'stopped by the user' }[turn.status] || turn.status;
  parts.push(`outcome: ${outcome}`);
  msgs.push({ role: 'assistant', content: parts.join('\n') });
  return msgs;
}

export class AgentSession extends EventTarget {
  constructor({ fetchImpl, getSettings, getContext, executePlan, pageOrigin = '', pageHost = '', sfxTemplates = [], log } = {}) {
    super();
    this.fetchImpl = fetchImpl;
    this.getSettings = getSettings;
    this.getContext = getContext;
    this.executePlan = executePlan;
    this.pageOrigin = pageOrigin;
    this.pageHost = pageHost || (() => { try { return new URL(pageOrigin).host; } catch { return ''; } })();
    this.sfxTemplates = sfxTemplates;
    this.logFn = log || (() => {});
    this.turns = [];
    this.nCtx = null;
    this.controller = null;
    this.lastExchange = null;
  }

  get busy() { return !!this.controller; }

  emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }
  log(message) { this.logFn(message); }

  turn(id) { return this.turns.find((t) => t.id === id) || null; }

  setStatus(turn, status, message) {
    turn.status = status;
    if (message !== undefined) turn.message = message;
    if (!['streaming', 'repairing'].includes(status)) turn.finishedAt = Date.now();
    this.emit('turn', turn);
  }

  stop() { if (this.controller) this.controller.abort(); }

  reset() { this.stop(); this.turns = []; this.emit('turn', null); }

  async send(prompt, mode = 'free', extra = {}) {
    if (this.controller) this.stop();
    const turn = {
      id: newTurnId(), mode: MODES[mode] ? mode : 'free', prompt: String(prompt || '').trim(),
      status: 'streaming', message: '', text: '', thinking: '', plan: null, errors: [], repairs: [],
      attempts: 0, usage: null, detail: null, startedAt: Date.now(), finishedAt: null, result: null
    };
    const history = this.turns.filter((t) => t.status !== 'streaming').slice(-HISTORY_TURNS);
    this.turns.push(turn);
    this.emit('turn', turn);
    const controller = new AbortController();
    this.controller = controller;
    try {
      const settings = normalizeSettings(this.getSettings());
      const info = providerInfo(settings.provider);
      if (info.needsKey && !settings.apiKey) throw new Error(`${info.label} needs an API key — paste one in Settings (it stays in this browser).`);
      await this.run(turn, settings, history, extra, controller.signal);
    } catch (err) {
      if (err && err.name === 'AbortError') this.setStatus(turn, 'stopped', 'Stopped.');
      else this.setStatus(turn, 'failed', err && err.message ? err.message : String(err));
    } finally {
      if (this.controller === controller) this.controller = null;
    }
    return turn;
  }

  async run(turn, settings, history, extra, signal) {
    const info = providerInfo(settings.provider);
    const fullContext = this.getContext({ mode: turn.mode, ...extra });
    const detail = settings.contextDetail === 'auto'
      ? chooseDetail(JSON.stringify(fullContext).length, this.nCtx || info.nCtx)
      : settings.contextDetail;
    turn.detail = detail;
    const system = buildSystemPrompt(turn.mode, { sfxTemplates: this.sfxTemplates });
    const messages = [];
    for (const h of history) messages.push(...historyFor(h));
    messages.push({ role: 'user', content: buildUserMessage({ prompt: turn.prompt, context: compactContext(fullContext, detail), mode: turn.mode, detail }) });

    const maxAttempts = 1 + settings.repairAttempts;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      turn.attempts = attempt;
      if (attempt > 1) { turn.text = ''; turn.thinking = ''; this.setStatus(turn, 'repairing'); }
      const result = await this.complete(turn, settings, system, messages, signal);
      const canRepair = attempt < maxAttempts;
      if (result.refusal) throw new Error('The model declined this request. Try rephrasing it, or pick a different model.');

      let raw;
      try {
        raw = extractJson(result.text);
      } catch (err) {
        if (err.code === 'truncated' || (result.truncated && err.code !== 'no-json')) {
          throw new Error(`The model hit the Max tokens limit (${settings.maxTokens}) before it finished the plan. Reasoning models spend tokens thinking before they answer — raise Max tokens (try 8000+), set Reasoning to "none", or ask for less in one go.`);
        }
        if (err.code === 'no-json' && (turn.mode === 'ask' || !canRepair)) {
          turn.plan = { protocol: 2, reply: err.prose, summary: '', actions: [], caveats: turn.mode === 'ask' ? [] : ['The model answered in prose, so nothing was changed.'] };
          this.setStatus(turn, 'answered');
          return;
        }
        if (!canRepair) throw new Error(err.message);
        turn.repairs.push(err.message);
        messages.push({ role: 'assistant', content: result.text.slice(0, 4000) || '(empty)' });
        messages.push({ role: 'user', content: repairMessage([err.code === 'no-json' ? 'It was prose, not a JSON object. Put any explanation in "reply".' : err.message]) });
        continue;
      }

      const { plan, errors } = validatePlan(raw);
      turn.plan = plan;
      turn.errors = errors;
      if (errors.length) {
        if (!canRepair) throw new Error(`The plan had ${errors.length} problem(s): ${errors.slice(0, 4).join('; ')}`);
        turn.repairs.push(...errors);
        this.log(`Repairing plan (attempt ${attempt + 1}): ${errors[0]}`);
        messages.push({ role: 'assistant', content: result.text.slice(0, 4000) });
        messages.push({ role: 'user', content: repairMessage(errors) });
        continue;
      }

      if (!plan.actions.length) { this.setStatus(turn, 'answered'); return; }
      if (settings.applyMode === 'review') { this.setStatus(turn, 'review'); return; }

      try {
        turn.result = await this.executePlan(plan);
        this.setStatus(turn, 'applied');
        return;
      } catch (err) {
        const message = err && err.message ? err.message : String(err);
        if (!canRepair) throw new Error(`Plan failed and was rolled back: ${message}`);
        turn.repairs.push(message);
        this.log(`Plan rolled back, repairing: ${message}`);
        messages.push({ role: 'assistant', content: result.text.slice(0, 4000) });
        messages.push({ role: 'user', content: repairMessage([`Applying the plan failed and the project was rolled back: ${message}`]) });
      }
    }
  }

  /* One model call: fetch (adapting rejected params), then stream it in. */
  async complete(turn, settings, system, messages, signal) {
    const info = providerInfo(settings.provider);
    const request = buildChatRequest(settings, { system, messages, schema: planJsonSchema(), stream: settings.stream });
    let body = request.body;
    let response = null;
    for (let i = 0; i <= MAX_ADAPTATIONS; i++) {
      this.lastExchange = { at: Date.now(), url: request.url, headers: redactHeaders(request.headers), body, status: null, responseText: '' };
      try {
        response = await this.fetchImpl(request.url, { method: 'POST', headers: request.headers, body: JSON.stringify(body), signal });
      } catch (err) {
        if (err && err.name === 'AbortError') throw err;
        throw new Error(await diagnoseNetworkFailure(request.url, { pageOrigin: this.pageOrigin, fetchImpl: this.fetchImpl }));
      }
      this.lastExchange.status = response.status;
      if (response.ok) break;
      const text = await response.text();
      this.lastExchange.responseText = text.slice(0, 4000);
      let data;
      try { data = JSON.parse(text); } catch { throw new Error(notJsonHint(request.url, response.status, text, this.pageHost)); }
      const message = (data && data.error && (data.error.message || (typeof data.error === 'string' ? data.error : ''))) || (data && data.message) || '';
      if ((response.status === 400 || response.status === 422) && i < MAX_ADAPTATIONS) {
        const adapted = adaptRequestForError(body, message);
        if (adapted) { this.log(`Server rejected a parameter, retrying without it: ${message.slice(0, 160)}`); body = adapted; continue; }
      }
      throw new Error(httpErrorHint(response.status, message, settings));
    }
    const result = await readCompletionStream(info.api, response, {
      onText: (t) => { turn.text += t; this.emit('delta', { turnId: turn.id, text: t }); },
      onThinking: (t) => { turn.thinking += t; this.emit('delta', { turnId: turn.id, thinking: t }); },
      onUsage: (u) => { turn.usage = u; }
    });
    if (!turn.text && result.text) turn.text = result.text;
    if (this.lastExchange) this.lastExchange.responseText = result.text.slice(0, 8000);
    return result;
  }

  /* Applies a plan parked by Review mode. */
  async applyTurn(id) {
    const turn = this.turn(id);
    if (!turn || turn.status !== 'review' || !turn.plan) return turn;
    try {
      turn.result = await this.executePlan(turn.plan);
      this.setStatus(turn, 'applied');
    } catch (err) {
      this.setStatus(turn, 'failed', `Plan failed and was rolled back: ${err.message}`);
    }
    return turn;
  }

  discardTurn(id) {
    const turn = this.turn(id);
    if (turn && turn.status === 'review') this.setStatus(turn, 'stopped', 'Discarded.');
  }

  retry(id) {
    const turn = this.turn(id);
    return turn ? this.send(turn.prompt, turn.mode) : null;
  }

  toJSON() {
    return this.turns.filter((t) => !['streaming', 'repairing'].includes(t.status)).slice(-30).map((t) => ({ ...t, text: t.text.slice(0, 12000), thinking: t.thinking.slice(0, 4000) }));
  }

  load(turns) {
    if (Array.isArray(turns)) this.turns = turns.filter((t) => t && t.id && t.status);
    this.emit('turn', null);
  }
}
