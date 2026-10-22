import { test, assert } from './harness.mjs';
import {
  PROVIDERS, providerInfo, normalizeSettings, normalizeBaseUrl, buildChatRequest, buildModelsRequest,
  parseModelList, buildProbeRequests, parseProps, parseCompletion, adaptRequestForError
} from '../src/agent/providers.js';
import { diagnoseNetworkFailure, notJsonHint, httpErrorHint } from '../src/agent/diagnose.js';

const chat = (settings, extra = {}) => buildChatRequest(normalizeSettings(settings), {
  system: 'SYS', messages: [{ role: 'user', content: 'hi' }], schema: { type: 'object' }, stream: true, ...extra
});

test('v1 settings keep loading: provider "local" means llama-server on 8080', () => {
  const s = normalizeSettings({ provider: 'local' });
  assert.equal(s.provider, 'local');
  assert.equal(s.baseUrl, 'http://127.0.0.1:8080/v1');
  assert.equal(normalizeSettings({ provider: 'nope' }).provider, 'local');
});

test('settings defaults and clamps', () => {
  const s = normalizeSettings({ temperature: 9, maxTokens: 5, repairAttempts: 99, applyMode: 'weird' });
  assert.equal(s.temperature, 2);
  assert.equal(s.maxTokens, 256);
  assert.equal(s.repairAttempts, 3);
  assert.equal(s.applyMode, 'auto');
  assert.equal(s.structured, 'auto');
  assert.equal(s.stream, true);
});

test('0.0.0.0 bind addresses are rewritten to loopback', () => {
  assert.equal(normalizeBaseUrl('http://0.0.0.0:8080/v1/'), 'http://127.0.0.1:8080/v1');
  assert.equal(normalizeSettings({ provider: 'local', baseUrl: 'http://0.0.0.0:8080/v1' }).baseUrl, 'http://127.0.0.1:8080/v1');
});

test('the catalog has local and cloud providers with base URLs', () => {
  for (const id of ['local', 'lmstudio', 'ollama', 'custom', 'openai', 'anthropic', 'openrouter', 'gemini', 'groq', 'mistral', 'deepseek', 'xai']) {
    const p = providerInfo(id);
    assert.ok(p && /^https?:\/\//.test(p.baseUrl), id);
  }
  assert.ok(PROVIDERS.some((p) => p.group === 'local') && PROVIDERS.some((p) => p.group === 'cloud'));
});

test('OpenAI-style requests put the system message first and stream', () => {
  const r = chat({ provider: 'local' });
  assert.equal(r.url, 'http://127.0.0.1:8080/v1/chat/completions');
  assert.deepEqual(r.body.messages[0], { role: 'system', content: 'SYS' });
  assert.equal(r.body.messages[1].content, 'hi');
  assert.equal(r.body.stream, true);
  assert.equal(r.body.response_format.type, 'json_schema');
  assert.deepEqual(r.body.response_format.json_schema.schema, { type: 'object' });
});

test('structured output follows provider capability and the user override', () => {
  assert.equal(chat({ provider: 'openai', apiKey: 'k' }).body.response_format.type, 'json_schema');
  assert.equal(chat({ provider: 'groq', apiKey: 'k' }).body.response_format.type, 'json_object');
  assert.equal(chat({ provider: 'local', structured: 'off' }).body.response_format, undefined);
  assert.equal(chat({ provider: 'local', structured: 'json_object' }).body.response_format.type, 'json_object');
});

test('OpenAI reasoning models get reasoning_effort and max_completion_tokens, not temperature', () => {
  const r = chat({ provider: 'openai', apiKey: 'sk', reasoning: 'high' });
  assert.equal(r.body.reasoning_effort, 'high');
  assert.equal(r.body.temperature, undefined);
  assert.ok(r.body.max_completion_tokens > 0);
  assert.equal(r.body.max_tokens, undefined);
  assert.equal(r.headers.authorization, 'Bearer sk');
  const plain = chat({ provider: 'openai', apiKey: 'sk', reasoning: 'none', temperature: 0.3 });
  assert.equal(plain.body.temperature, 0.3);
  assert.equal(plain.body.reasoning_effort, undefined);
});

test('llama-server with reasoning off disables template thinking', () => {
  const r = chat({ provider: 'local', reasoning: 'none' });
  assert.deepEqual(r.body.chat_template_kwargs, { enable_thinking: false });
  assert.equal(chat({ provider: 'local', reasoning: 'medium' }).body.chat_template_kwargs, undefined);
});

test('OpenRouter sends attribution headers and its reasoning object', () => {
  const r = chat({ provider: 'openrouter', apiKey: 'k', reasoning: 'low' });
  assert.ok(r.headers['HTTP-Referer']);
  assert.ok(r.headers['X-Title']);
  assert.deepEqual(r.body.reasoning, { effort: 'low' });
});

test('Anthropic requests use top-level system, browser header and adaptive thinking on current models', () => {
  const r = chat({ provider: 'anthropic', apiKey: 'ak', model: 'claude-opus-5-5', reasoning: 'high' });
  assert.equal(r.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(r.body.system, 'SYS');
  assert.equal(r.body.messages[0].role, 'user');
  assert.equal(r.headers['x-api-key'], 'ak');
  assert.equal(r.headers['anthropic-version'], '2023-06-01');
  assert.equal(r.headers['anthropic-dangerous-direct-browser-access'], 'true');
  assert.deepEqual(r.body.thinking, { type: 'adaptive', display: 'summarized' });
  assert.equal(r.body.output_config.effort, 'high');
  assert.equal(r.body.temperature, undefined);
  assert.equal(r.body.top_p, undefined);
  assert.equal(r.body.fallbacks, 'default');
  assert.equal(r.headers['anthropic-beta'], 'server-side-fallback-2026-07-01');
});

test('Anthropic with reasoning "none" lowers effort instead of disabling thinking', () => {
  const r = chat({ provider: 'anthropic', apiKey: 'ak', model: 'claude-opus-5-5', reasoning: 'none' });
  assert.equal(r.body.output_config.effort, 'low');
});

test('older Claude models use budget thinking or sampling', () => {
  const think = chat({ provider: 'anthropic', apiKey: 'ak', model: 'claude-haiku-4-5', reasoning: 'medium', maxTokens: 8000 });
  assert.equal(think.body.thinking.type, 'enabled');
  assert.ok(think.body.thinking.budget_tokens >= 1024 && think.body.thinking.budget_tokens < 8000);
  assert.equal(think.body.fallbacks, undefined);
  const plain = chat({ provider: 'anthropic', apiKey: 'ak', model: 'claude-haiku-4-5', reasoning: 'none', temperature: 0.5 });
  assert.equal(plain.body.thinking, undefined);
  assert.equal(plain.body.temperature, 0.5);
});

test('Anthropic json_schema mode uses output_config.format', () => {
  const r = chat({ provider: 'anthropic', apiKey: 'ak', model: 'claude-opus-5-5', structured: 'json_schema' });
  assert.deepEqual(r.body.output_config.format, { type: 'json_schema', schema: { type: 'object' } });
  assert.equal(chat({ provider: 'anthropic', apiKey: 'ak' }).body.output_config.format, undefined);
});

test('model list requests and parsing', () => {
  const m = buildModelsRequest(normalizeSettings({ provider: 'anthropic', apiKey: 'ak' }));
  assert.equal(m.url, 'https://api.anthropic.com/v1/models');
  assert.equal(m.headers['x-api-key'], 'ak');
  assert.deepEqual(parseModelList({ data: [{ id: 'a' }, { id: 'b' }] }), ['a', 'b']);
  assert.deepEqual(parseModelList({ models: [{ name: 'q' }] }), ['q']);
  assert.deepEqual(parseModelList(['x']), ['x']);
  assert.deepEqual(parseModelList({}), []);
});

test('llama-server probes hit /health and /props at the server root', () => {
  const urls = buildProbeRequests(normalizeSettings({ provider: 'local' })).map((p) => p.url);
  assert.ok(urls.includes('http://127.0.0.1:8080/health'));
  assert.ok(urls.includes('http://127.0.0.1:8080/props'));
  assert.ok(urls.includes('http://127.0.0.1:8080/v1/models'));
  assert.deepEqual(parseProps({ default_generation_settings: { n_ctx: 16384 }, model_path: 'C:\\m\\qwen3-8b-q4.gguf' }), { nCtx: 16384, model: 'qwen3-8b-q4' });
  assert.deepEqual(parseProps({ n_ctx: 4096, model_alias: 'm' }), { nCtx: 4096, model: 'm' });
});

test('parseCompletion normalises both API shapes', () => {
  const o = parseCompletion('openai', { choices: [{ message: { content: 'T', reasoning_content: 'R' }, finish_reason: 'length' }], usage: { prompt_tokens: 3, completion_tokens: 4 } });
  assert.deepEqual(o, { text: 'T', thinking: 'R', truncated: true, refusal: false, usage: { input: 3, output: 4 } });
  const a = parseCompletion('anthropic', { content: [{ type: 'thinking', thinking: 'R' }, { type: 'text', text: 'T' }], stop_reason: 'refusal', usage: { input_tokens: 1, output_tokens: 2 } });
  assert.equal(a.text, 'T');
  assert.equal(a.thinking, 'R');
  assert.equal(a.refusal, true);
  assert.equal(parseCompletion('openai', { choices: [{ message: { content: '', reasoning_content: '{"actions":[]}' } }] }).text, '{"actions":[]}');
});

test('adaptRequestForError drops parameters a server rejects', () => {
  const body = { model: 'm', temperature: 0.4, top_p: 0.9, reasoning_effort: 'medium', response_format: { type: 'json_schema' }, max_tokens: 10, stream_options: { include_usage: true } };
  const a = adaptRequestForError(body, "Unsupported value: 'temperature' does not support 0.4 with this model");
  assert.equal(a.temperature, undefined);
  assert.equal(a.top_p, undefined);
  const b = adaptRequestForError(body, 'Unrecognized request argument supplied: reasoning_effort');
  assert.equal(b.reasoning_effort, undefined);
  const c = adaptRequestForError(body, "'response_format.type' must be 'json_schema' or 'text'... json_schema not supported");
  assert.equal(c.response_format.type, 'json_object');
  const d = adaptRequestForError({ ...body, response_format: { type: 'json_object' } }, 'response_format json_object is not supported');
  assert.equal(d.response_format, undefined);
  const e = adaptRequestForError(body, "Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead.");
  assert.equal(e.max_tokens, undefined);
  assert.equal(e.max_completion_tokens, 10);
  assert.equal(adaptRequestForError(body, 'something unrelated'), null);
});

test('diagnoseNetworkFailure explains HTTPS pages calling plain-http servers', async () => {
  const msg = await diagnoseNetworkFailure('http://127.0.0.1:8080/v1/models', { pageOrigin: 'https://example.github.io', fetchImpl: async () => { throw new Error('x'); } });
  assert.match(msg, /HTTPS/);
});

test('diagnoseNetworkFailure tells CORS blocks from nothing listening', async () => {
  const cors = await diagnoseNetworkFailure('http://127.0.0.1:8080/v1/models', { pageOrigin: 'http://localhost:8000', fetchImpl: async () => ({}) });
  assert.match(cors, /CORS/);
  const down = await diagnoseNetworkFailure('http://localhost:8080/v1/models', { pageOrigin: 'http://localhost:8000', fetchImpl: async () => { throw new TypeError('Failed to fetch'); } });
  assert.match(down, /Nothing answered/);
  assert.match(down, /127\.0\.0\.1/);
  const same = await diagnoseNetworkFailure('http://localhost:8000/v1/models', { pageOrigin: 'http://localhost:8000', fetchImpl: async () => { throw new TypeError('x'); } });
  assert.match(same, /dawCAT itself/);
});

test('notJsonHint flags dawCAT\'s own file server', () => {
  assert.match(notJsonHint('http://localhost:8000/v1/models', 404, '<html>', 'localhost:8000'), /dawCAT/);
  assert.match(notJsonHint('http://127.0.0.1:8080/models', 404, 'Not Found', 'localhost:8000'), /\/v1/);
});

test('httpErrorHint gives a concrete fix per status', () => {
  assert.match(httpErrorHint(401, 'invalid x-api-key', { provider: 'anthropic' }), /API key/);
  assert.match(httpErrorHint(404, 'model not found', { provider: 'openai', model: 'gpt-x' }), /model/i);
  assert.match(httpErrorHint(429, 'slow down', { provider: 'openai' }), /rate/i);
  assert.match(httpErrorHint(400, 'This model\'s maximum context length is 8192 tokens', { provider: 'local' }), /context/i);
});
