/* dawCAT — AI provider catalog and request building. Every provider is called
   directly from the browser with fetch() (no proxy), so this module only
   builds { url, headers, body } shapes and parses responses. Pure: no DOM,
   no fetch of its own — the session injects fetch, which keeps it testable.

   Two wire formats cover everything: the OpenAI-style /chat/completions that
   llama-server, LM Studio, Ollama, vLLM, OpenRouter, Gemini, Groq, Mistral,
   DeepSeek and xAI all speak, and Anthropic's /messages. */

export const PROVIDERS = [
  { id: 'local', label: 'llama-server (llama.cpp)', group: 'local', api: 'openai', baseUrl: 'http://127.0.0.1:8080/v1', model: 'local-model', needsKey: false, structured: 'json_schema', nCtx: 8192, hint: 'llama-server -m model.gguf --port 8080 --ctx-size 16384 --jinja' },
  { id: 'lmstudio', label: 'LM Studio', group: 'local', api: 'openai', baseUrl: 'http://127.0.0.1:1234/v1', model: 'local-model', needsKey: false, structured: 'json_schema', nCtx: 8192, hint: 'Developer tab → Start Server (port 1234), enable CORS' },
  { id: 'ollama', label: 'Ollama', group: 'local', api: 'openai', baseUrl: 'http://127.0.0.1:11434/v1', model: 'qwen3:8b', needsKey: false, structured: 'json_object', nCtx: 4096, hint: 'set OLLAMA_ORIGINS=* and OLLAMA_CONTEXT_LENGTH=16384, then ollama serve' },
  { id: 'custom', label: 'Custom OpenAI-compatible (vLLM, Jan, KoboldCpp…)', group: 'local', api: 'openai', baseUrl: 'http://127.0.0.1:3000/v1', model: 'custom-model', needsKey: false, structured: 'json_object', nCtx: 8192, hint: 'any server exposing /v1/chat/completions with CORS enabled' },
  { id: 'openai', label: 'OpenAI', group: 'cloud', api: 'openai', baseUrl: 'https://api.openai.com/v1', model: 'gpt-5.2', needsKey: true, structured: 'json_schema', nCtx: 128000 },
  { id: 'anthropic', label: 'Anthropic (Claude)', group: 'cloud', api: 'anthropic', baseUrl: 'https://api.anthropic.com/v1', model: 'claude-opus-5-5', needsKey: true, structured: 'none', nCtx: 200000 },
  { id: 'openrouter', label: 'OpenRouter', group: 'cloud', api: 'openai', baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-5.2', needsKey: true, structured: 'json_object', nCtx: 128000 },
  { id: 'gemini', label: 'Google Gemini', group: 'cloud', api: 'openai', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.5-flash', needsKey: true, structured: 'json_schema', nCtx: 128000 },
  { id: 'groq', label: 'Groq', group: 'cloud', api: 'openai', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile', needsKey: true, structured: 'json_object', nCtx: 32000 },
  { id: 'mistral', label: 'Mistral', group: 'cloud', api: 'openai', baseUrl: 'https://api.mistral.ai/v1', model: 'mistral-large-latest', needsKey: true, structured: 'json_object', nCtx: 128000 },
  { id: 'deepseek', label: 'DeepSeek', group: 'cloud', api: 'openai', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', needsKey: true, structured: 'json_object', nCtx: 64000 },
  { id: 'xai', label: 'xAI (Grok)', group: 'cloud', api: 'openai', baseUrl: 'https://api.x.ai/v1', model: 'grok-4', needsKey: true, structured: 'json_object', nCtx: 128000 }
];

const BY_ID = new Map(PROVIDERS.map((p) => [p.id, p]));

export function providerInfo(id) { return BY_ID.get(id) || BY_ID.get('local'); }

export const REASONING_LEVELS = ['none', 'low', 'medium', 'high'];
export const STRUCTURED_MODES = ['auto', 'json_schema', 'json_object', 'off'];
export const APPLY_MODES = ['auto', 'review'];
export const CONTEXT_DETAILS = ['auto', 'full', 'compact', 'minimal'];

function finite(value, fallback, min = -Infinity, max = Infinity) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);

// 0.0.0.0 is a *bind* address meaning "listen on every interface" — not one
// you can connect to. llama-server prints the URL it bound ("http://0.0.0.0:8080"),
// so pasting that is natural and then fails in Safari/Firefox. The server that
// bound 0.0.0.0 is listening on 127.0.0.1, so connect there instead.
export function normalizeBaseUrl(value) {
  const trimmed = String(value || '').trim().replace(/\/+$/, '');
  try {
    const url = new URL(trimmed);
    if (url.hostname === '0.0.0.0' || url.hostname === '[::]') {
      url.hostname = '127.0.0.1';
      return url.toString().replace(/\/+$/, '');
    }
  } catch { /* not absolute yet (still being typed) — leave it alone */ }
  return trimmed;
}

export function normalizeSettings(input = {}) {
  const info = BY_ID.get(input.provider) || BY_ID.get('local');
  return {
    provider: info.id,
    baseUrl: normalizeBaseUrl(input.baseUrl || info.baseUrl),
    model: String(input.model || info.model),
    apiKey: String(input.apiKey || ''),
    temperature: finite(input.temperature, 0.4, 0, 2),
    topP: finite(input.topP, 0.9, 0.01, 1),
    maxTokens: Math.round(finite(input.maxTokens, 4096, 256, 128000)),
    reasoning: pick(input.reasoning, REASONING_LEVELS, 'medium'),
    structured: pick(input.structured, STRUCTURED_MODES, 'auto'),
    repairAttempts: Math.round(finite(input.repairAttempts, 2, 0, 3)),
    applyMode: pick(input.applyMode, APPLY_MODES, 'auto'),
    contextDetail: pick(input.contextDetail, CONTEXT_DETAILS, 'auto'),
    stream: input.stream !== false,
    rememberKey: input.rememberKey === true
  };
}

/* Which structured-output mechanism to request: the user's explicit choice,
   or the provider's known-good default. */
export function structuredMode(settings) {
  if (settings.structured === 'off') return 'none';
  if (settings.structured !== 'auto') return settings.structured;
  return providerInfo(settings.provider).structured;
}

/* ---------------- Anthropic model capabilities ---------------- */

// Current Claude generations: adaptive thinking controlled by
// output_config.effort; sampling params and thinking budgets are rejected.
const CLAUDE_ADAPTIVE = /^claude-(fable|mythos|opus-5|sonnet-5|haiku-5|opus-4-[6-9]|sonnet-4-6)/;
// Models that accept the server-side refusal fallback in its "default" form.
const CLAUDE_FALLBACK = /^claude-(fable-5-1|opus-5-5|opus-5|sonnet-5-5)$/;
const EFFORT = { none: 'low', low: 'low', medium: 'medium', high: 'high' };
const BUDGET = { low: 1024, medium: 2048, high: 4096 };

function anthropicRequest(settings, { system, messages, schema, stream }) {
  const model = settings.model;
  const body = { model, max_tokens: settings.maxTokens, system, messages: messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content) })) };
  if (stream) body.stream = true;
  const headers = {
    'content-type': 'application/json',
    'x-api-key': settings.apiKey,
    'anthropic-version': '2023-06-01',
    // Opts a page like this one into calling the API directly from the
    // browser with a user-supplied key instead of going through a backend.
    'anthropic-dangerous-direct-browser-access': 'true'
  };
  const outputConfig = {};
  if (CLAUDE_ADAPTIVE.test(model)) {
    // Thinking can't be switched off on the newest models — "none" means
    // the lightest effort. Summarized display so the panel can show it.
    body.thinking = { type: 'adaptive', display: 'summarized' };
    outputConfig.effort = EFFORT[settings.reasoning];
  } else if (settings.reasoning !== 'none' && settings.maxTokens >= 2048) {
    body.thinking = { type: 'enabled', budget_tokens: Math.min(settings.maxTokens - 1024, BUDGET[settings.reasoning]) };
  } else {
    body.temperature = settings.temperature;
    body.top_p = settings.topP;
  }
  if (structuredMode(settings) === 'json_schema' && schema) outputConfig.format = { type: 'json_schema', schema };
  if (Object.keys(outputConfig).length) body.output_config = outputConfig;
  let host = '';
  try { host = new URL(settings.baseUrl).hostname; } catch { /* relative */ }
  if (CLAUDE_FALLBACK.test(model) && host === 'api.anthropic.com') {
    body.fallbacks = 'default';
    headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
  }
  return { url: `${settings.baseUrl}/messages`, headers, body };
}

/* ---------------- OpenAI-style ---------------- */

const STREAM_USAGE = new Set(['openai', 'openrouter', 'groq', 'deepseek', 'xai']);

function openaiRequest(settings, { system, messages, schema, stream }) {
  const id = settings.provider;
  const body = {
    model: settings.model,
    messages: [{ role: 'system', content: system }, ...messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content) }))]
  };
  if (stream) {
    body.stream = true;
    if (STREAM_USAGE.has(id)) body.stream_options = { include_usage: true };
  }
  const reasoning = settings.reasoning;
  // OpenAI's reasoning models reject custom sampling and the old max_tokens.
  if (id === 'openai') {
    body.max_completion_tokens = settings.maxTokens;
    if (reasoning !== 'none') body.reasoning_effort = reasoning;
    else { body.temperature = settings.temperature; body.top_p = settings.topP; }
  } else {
    body.max_tokens = settings.maxTokens;
    body.temperature = settings.temperature;
    body.top_p = settings.topP;
    if (id === 'openrouter' && reasoning !== 'none') body.reasoning = { effort: reasoning };
    // Qwen3-style templates think by default; llama-server forwards this to
    // the chat template so "Reasoning: none" really skips the thinking pass.
    if (id === 'local' && reasoning === 'none') body.chat_template_kwargs = { enable_thinking: false };
  }
  const mode = structuredMode(settings);
  if (mode === 'json_schema' && schema) body.response_format = { type: 'json_schema', json_schema: { name: 'dawcat_plan', schema, strict: false } };
  else if (mode === 'json_object' || (mode === 'json_schema' && !schema)) body.response_format = { type: 'json_object' };
  const headers = { 'content-type': 'application/json' };
  if (settings.apiKey) headers.authorization = `Bearer ${settings.apiKey}`;
  if (id === 'openrouter') { headers['HTTP-Referer'] = 'http://127.0.0.1/dawCAT'; headers['X-Title'] = 'Michi-Neko dawCAT'; }
  return { url: `${settings.baseUrl}/chat/completions`, headers, body };
}

/* { system, messages:[{role, content}], schema?, stream } → { url, headers, body } */
export function buildChatRequest(settings, payload) {
  return providerInfo(settings.provider).api === 'anthropic' ? anthropicRequest(settings, payload) : openaiRequest(settings, payload);
}

/* A server that rejects one of our optional parameters usually says which.
   Returns a copy of `body` with that parameter dropped or downgraded, or null
   when the error isn't about a parameter we can adapt. The session retries
   once per adaptation, so one picky server never strands the user. */
export function adaptRequestForError(body, message) {
  const msg = String(message || '').toLowerCase();
  const next = JSON.parse(JSON.stringify(body));
  if (/max_tokens/.test(msg) && /max_completion_tokens/.test(msg) && next.max_tokens != null) {
    next.max_completion_tokens = next.max_tokens;
    delete next.max_tokens;
    return next;
  }
  if (/(temperature|top_p)/.test(msg) && (next.temperature != null || next.top_p != null)) {
    delete next.temperature; delete next.top_p;
    return next;
  }
  if (/reasoning_effort|reasoning/.test(msg) && (next.reasoning_effort != null || next.reasoning != null)) {
    delete next.reasoning_effort; delete next.reasoning;
    return next;
  }
  if (/stream_options/.test(msg) && next.stream_options) { delete next.stream_options; return next; }
  if (/chat_template_kwargs/.test(msg) && next.chat_template_kwargs) { delete next.chat_template_kwargs; return next; }
  if (/(response_format|json_schema|json_object|grammar|schema)/.test(msg) && next.response_format) {
    if (next.response_format.type === 'json_schema' && !/json_object/.test(msg)) next.response_format = { type: 'json_object' };
    else delete next.response_format;
    return next;
  }
  if (/(output_config|format|schema)/.test(msg) && next.output_config && next.output_config.format) {
    delete next.output_config.format;
    if (!Object.keys(next.output_config).length) delete next.output_config;
    return next;
  }
  if (/fallbacks/.test(msg) && next.fallbacks) { delete next.fallbacks; return next; }
  return null;
}

/* ---------------- models + probes ---------------- */

function authHeaders(settings) {
  if (providerInfo(settings.provider).api === 'anthropic') {
    return { 'x-api-key': settings.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' };
  }
  return settings.apiKey ? { authorization: `Bearer ${settings.apiKey}` } : {};
}

export function buildModelsRequest(settings) {
  return { url: `${settings.baseUrl}/models`, headers: authHeaders(settings) };
}

/* OpenAI/Anthropic {data:[{id}]}, a bare array, or Ollama {models:[{name}]}. */
export function parseModelList(response) {
  const list = Array.isArray(response?.data) ? response.data
    : Array.isArray(response?.models) ? response.models
    : Array.isArray(response) ? response
    : [];
  return list.map((m) => (typeof m === 'string' ? m : m && (m.id || m.name || m.model))).filter(Boolean);
}

export function serverRoot(baseUrl) { return String(baseUrl).replace(/\/v1$/, ''); }

/* Connection-test requests. Always the model list; for llama-server also
   /health (is a model loaded?) and /props (context size, model file). */
export function buildProbeRequests(settings) {
  const probes = [{ label: 'models', ...buildModelsRequest(settings) }];
  if (settings.provider === 'local') {
    const root = serverRoot(settings.baseUrl);
    probes.push({ label: 'health', url: `${root}/health`, headers: {} });
    probes.push({ label: 'props', url: `${root}/props`, headers: {} });
  }
  return probes;
}

export function parseProps(json) {
  const gen = json && json.default_generation_settings;
  const nCtx = Number(json?.n_ctx ?? gen?.n_ctx ?? gen?.params?.n_ctx) || null;
  const path = json?.model_alias || json?.model_path || '';
  const model = String(path).split(/[\\/]/).pop().replace(/\.gguf$/i, '') || null;
  return { nCtx, model };
}

/* ---------------- non-streaming responses ---------------- */

function partsText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((p) => (typeof p === 'string' ? p : p && (p.text || ''))).join('');
  return '';
}

export function normalizeUsage(u) {
  if (!u) return null;
  const input = u.input_tokens ?? u.prompt_tokens;
  const output = u.output_tokens ?? u.completion_tokens;
  return input == null && output == null ? null : { input: input ?? 0, output: output ?? 0 };
}

export function parseCompletion(api, json) {
  if (api === 'anthropic') {
    const blocks = Array.isArray(json?.content) ? json.content : [];
    return {
      text: blocks.filter((b) => b.type === 'text').map((b) => b.text).join(''),
      thinking: blocks.filter((b) => b.type === 'thinking').map((b) => b.thinking || '').join(''),
      truncated: json?.stop_reason === 'max_tokens',
      refusal: json?.stop_reason === 'refusal',
      usage: normalizeUsage(json?.usage)
    };
  }
  const choice = json?.choices?.[0] || {};
  const message = choice.message || {};
  const content = partsText(message.content);
  const thinking = message.reasoning_content || message.reasoning || '';
  return {
    // reasoning_content is the fallback, not the preference: llama.cpp splits a
    // thinking model's output into reasoning_content + content, and a few
    // servers put everything in the former and leave content empty.
    text: content || (thinking && /[{[]/.test(thinking) ? thinking : '') || json?.output_text || '',
    thinking: content ? thinking : (thinking && /[{[]/.test(thinking) ? '' : thinking),
    truncated: choice.finish_reason === 'length' || choice.finish_reason === 'max_tokens',
    refusal: choice.finish_reason === 'content_filter',
    usage: normalizeUsage(json?.usage)
  };
}

/* Curated popular model catalog per provider so users can select a model from a
   dropdown immediately even before scanning or when a cloud endpoint restricts /models. */
export const POPULAR_MODELS = {
  local: [
    'local-model',
    'qwen3-14b-instruct',
    'qwen2.5-coder-14b-instruct',
    'llama-3.3-70b-instruct',
    'gemma-3-12b-it',
    'mistral-nemo-12b-instruct',
    'deepseek-r1-distill-qwen-14b'
  ],
  lmstudio: [
    'local-model',
    'qwen2.5-14b-instruct',
    'llama-3.2-8b-instruct',
    'mistral-7b-instruct'
  ],
  ollama: [
    'qwen3:8b',
    'qwen3:14b',
    'qwen2.5-coder:14b',
    'llama3.2:latest',
    'gemma3:12b',
    'mistral:latest',
    'deepseek-r1:14b'
  ],
  custom: ['custom-model', 'local-model'],
  openai: ['gpt-5.2', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4o', 'o3-mini'],
  anthropic: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  openrouter: [
    'openai/gpt-5.2',
    'anthropic/claude-sonnet-4-6',
    'google/gemini-2.5-flash',
    'meta-llama/llama-3.3-70b-instruct',
    'deepseek/deepseek-chat'
  ],
  gemini: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
  groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'qwen-qwq-32b', 'deepseek-r1-distill-llama-70b'],
  mistral: ['mistral-large-latest', 'codestral-latest', 'ministral-8b-latest'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  xai: ['grok-4', 'grok-3-mini']
};

/* Probes standard local LLM ports concurrently (llama-server :8080, LM Studio :1234,
   Ollama :11434, custom :3000) and returns all reachable local servers. */
export async function autoDetectLocalServers({ fetchImpl = globalThis.fetch, timeoutMs = 1500 } = {}) {
  const candidates = PROVIDERS.filter((p) => p.group === 'local');
  const results = await Promise.all(candidates.map(async (prov) => {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
    try {
      const req = buildModelsRequest({ provider: prov.id, baseUrl: prov.baseUrl, apiKey: '' });
      const res = await fetchImpl(req.url, { headers: req.headers, signal: ctrl?.signal });
      if (!res || !res.ok) return null;
      const json = await res.json();
      let models = parseModelList(json);
      let nCtx = prov.nCtx;
      if (prov.id === 'local') {
        try {
          const pRes = await fetchImpl(`${serverRoot(prov.baseUrl)}/props`, { signal: ctrl?.signal });
          if (pRes && pRes.ok) {
            const props = parseProps(await pRes.json());
            if (props.nCtx) nCtx = props.nCtx;
            if (props.model && !models.includes(props.model)) models = [props.model, ...models];
          }
        } catch { /* optional props */ }
      }
      return {
        provider: prov.id,
        label: prov.label,
        baseUrl: prov.baseUrl,
        models: models.length ? models : [prov.model],
        model: models[0] || prov.model,
        nCtx
      };
    } catch {
      return null;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }));
  return results.filter(Boolean);
}
