/* dawCAT — AI composition agent protocol: provider-agnostic request building,
   prompt construction, and strict plan validation. No server involved — the
   browser (agent-panel.js) calls the provider directly with these request
   shapes, the same way you'd curl it. Pure functions only: no DOM, no Node
   built-ins, so this file needs nothing beyond a browser to run. */

export const AGENT_PROTOCOL_VERSION = 1;

export const SUPPORTED_AGENT_ACTIONS = new Set([
  'addTrack', 'renameTrack', 'deleteTrack', 'setTrackMix', 'setTrackPreset',
  'addDevice', 'setDeviceParams', 'addClip', 'deleteClip', 'setTempo', 'setKeyScale', 'setSwing', 'setMaster'
]);

const SYSTEM_PROMPT = `You are the dawCAT music composition agent for the Michi-Neko game soundtrack. Return JSON only.
Create a small, musically coherent plan of DAW actions the browser editor can execute directly and automatically the moment you respond — there is no separate confirmation step, so only include actions you actually intend to happen. Never return audio data, JavaScript, shell commands, markdown, or unsupported actions.
The response must match:
{"summary":"short explanation","actions":[{"type":"supported action","target":"selection|track id|trackId:clipId","params":{}}],"caveats":["optional caveat"]}
Supported actions and params:
- addTrack { name?, kind:"synth"|"drum", preset?:"pluck|pad|lead|bass|keys|chime" (synth only), drumKit?:"soft|punch|lofi" (drum only) } — target is ignored; the new track becomes "selection" for later actions in this plan.
- renameTrack { name }
- deleteTrack {}
- setTrackMix { volume?:0..1, pan?:-1..1, mute?:boolean, solo?:boolean, sends?:{a?:0..1,b?:0..1} }
- setTrackPreset { preset:"pluck|pad|lead|bass|keys|chime", patch?:{cutoff?:20..12000,res?:0..8,attack?:0..4,decay?:0..4,sustain?:0..1,release?:0..6,detune?:0..50,gain?:0..1} } (synth tracks only)
- addDevice { type:"eq8|comp|delay|reverb|filter|chorus|utility" } — adds a new device even if the track already has one of this type.
- setDeviceParams { type:"eq8|comp|delay|reverb|filter|chorus|utility", params:{...device-specific params, any subset} } — adjusts the FIRST device of this type already on the track; adds one with these params if none exists yet. Use this to tweak an existing effect instead of stacking duplicates.
- addClip { name?, start:bars, length:bars, loop?:boolean, loopLen?:beats, notes?:[{midi:0-127,start:beats,len:beats,vel:0-1}], steps?:{"kick|snare|clap|hatC|hatO|tom|rim|perc":[[stepIndex 0-15, velocity 0-1], ...]} } — use \`notes\` for a synth track's melody, \`steps\` for a drum track's rhythm, never both. To REPLACE an existing clip's content (remix), pair a deleteClip of the old "trackId:clipId" with an addClip of the new content on the same track — addClip never overwrites in place.
- deleteClip {} — target must be "trackId:clipId"
- setTempo { bpm:40..220 }
- setKeyScale { key:"C|C#|D|D#|E|F|F#|G|G#|A|A#|B", scale:"major|minor|dorian|pentatonic minor|pentatonic major|hirajoshi|in sen|chromatic" }
- setSwing { swing:0..1 }
- setMaster { volume:0..1 } — target ignored, applies to the master fader
"selection" (the default target) means the most recently created/targeted track earlier in this same plan, or the editor's current selection if this is the first action to need one. Reference an existing track/clip from DAW CONTEXT by its real id — CONTEXT lists every track's clips with their ids and full note/step content so you can reason about and rework what's already there. Prefer a handful of coherent tracks/clips over a wall of actions. Do not delete a track or clip unless explicitly asked to (remixing an existing clip via delete+add on the SAME track doesn't count as an unrequested deletion). When the request references the game's mood (e.g. "dawn", "dusk", a Game Cue name) or CONTEXT lists matching gameCues, match their root/scale/chord so the result fits the game's own musical DNA.`;

const MODE_GUIDANCE = {
  remix: 'MODE: Remix — the user wants you to rework the EXISTING composition described in DAW CONTEXT below. Prefer altering what is already there (setTrackPreset, setTrackMix, setDeviceParams, and delete+add to replace clip content) over piling on unrelated new tracks, unless the request clearly asks for something additional.',
  write: 'MODE: Write — the user wants a NEW composition. Prefer addTrack + addClip to build fresh tracks; only touch existing tracks/clips if the request asks for it or they conflict (e.g. reuse the same key/tempo/scale already in CONTEXT unless told to change it).',
  free: 'MODE: Free — follow the request exactly as given. It may be one small targeted tweak, a full remix, a brand-new composition, or any mix of these.'
};

function finiteNumber(value, fallback, min = -Infinity, max = Infinity) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

export function normalizeAgentSettings(input = {}) {
  const provider = ['local', 'custom', 'openai', 'openrouter', 'anthropic'].includes(input.provider) ? input.provider : 'local';
  const defaults = {
    local: { baseUrl: 'http://127.0.0.1:8080/v1', model: 'local-model' },
    custom: { baseUrl: 'http://127.0.0.1:3000/v1', model: 'custom-model' },
    openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-5.2' },
    openrouter: { baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-5.2' },
    anthropic: { baseUrl: 'https://api.anthropic.com/v1', model: 'claude-opus-5' }
  }[provider];
  return {
    provider,
    baseUrl: String(input.baseUrl || defaults.baseUrl).replace(/\/+$/, ''),
    model: String(input.model || defaults.model),
    apiKey: String(input.apiKey || ''),
    temperature: finiteNumber(input.temperature, 0.4, 0, 2),
    topP: finiteNumber(input.topP, 0.9, 0.01, 1),
    maxTokens: Math.round(finiteNumber(input.maxTokens, 3000, 128, 32000)),
    reasoning: ['none', 'low', 'medium', 'high'].includes(input.reasoning) ? input.reasoning : 'medium'
  };
}

export function buildAgentPrompt({ instruction, context, mode }) {
  const guidance = MODE_GUIDANCE[mode] || MODE_GUIDANCE.free;
  return `${SYSTEM_PROMPT}\n\n${guidance}\n\nUSER REQUEST:\n${String(instruction || '').trim()}\n\nDAW CONTEXT:\n${JSON.stringify(context)}`;
}

export function extractJson(text) {
  const raw = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(raw); } catch {}
  const start = raw.indexOf('{'), end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
  throw new Error('The model did not return a JSON plan');
}

export function validateAgentPlan(input) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.actions)) throw new Error('Agent plan must contain an actions array');
  if (input.actions.length > 40) throw new Error('Agent plan exceeds the 40 action safety limit');
  const actions = input.actions.map((item, index) => {
    if (!item || !SUPPORTED_AGENT_ACTIONS.has(item.type)) throw new Error(`Unsupported agent action at ${index}: ${item?.type || 'missing'}`);
    return { type: item.type, target: String(item.target || 'selection'), params: item.params && typeof item.params === 'object' ? item.params : {} };
  });
  return {
    protocol: AGENT_PROTOCOL_VERSION,
    summary: String(input.summary || 'dawCAT agent plan'),
    actions,
    caveats: Array.isArray(input.caveats) ? input.caveats.map(String).slice(0, 12) : []
  };
}

// Anthropic's API blocks cross-origin browser requests unless this header
// opts in — it exists specifically so a page like this one can call the API
// directly with a user-supplied key instead of needing a backend.
const ANTHROPIC_BROWSER_HEADER = { 'anthropic-dangerous-direct-browser-access': 'true' };

export function createProviderRequest(settingsInput, payload) {
  const settings = normalizeAgentSettings(settingsInput);
  const prompt = buildAgentPrompt(payload);
  if (settings.provider === 'anthropic') {
    const body = { model: settings.model, max_tokens: settings.maxTokens, messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }] };
    if (settings.reasoning !== 'none' && settings.maxTokens >= 1152) body.thinking = { type: 'enabled', budget_tokens: Math.min(settings.maxTokens - 128, { low: 1024, medium: 2048, high: 4096 }[settings.reasoning] || 2048) };
    else { body.temperature = settings.temperature; body.top_p = settings.topP; }
    return { url: `${settings.baseUrl}/messages`, headers: { 'content-type': 'application/json', 'x-api-key': settings.apiKey, 'anthropic-version': '2023-06-01', ...ANTHROPIC_BROWSER_HEADER }, body };
  }
  const body = { model: settings.model, messages: [{ role: 'user', content: prompt }], temperature: settings.temperature, top_p: settings.topP, max_tokens: settings.maxTokens, response_format: { type: 'json_object' } };
  if (settings.reasoning !== 'none' && !['local', 'custom'].includes(settings.provider)) body.reasoning_effort = settings.reasoning;
  const headers = { 'content-type': 'application/json' };
  if (settings.apiKey) headers.authorization = `Bearer ${settings.apiKey}`;
  if (settings.provider === 'openrouter') { headers['HTTP-Referer'] = 'http://127.0.0.1/dawCAT'; headers['X-Title'] = 'Michi-Neko dawCAT'; }
  return { url: `${settings.baseUrl}/chat/completions`, headers, body };
}

export function extractProviderText(provider, response) {
  if (provider === 'anthropic') return (response.content || []).filter((item) => item.type === 'text').map((item) => item.text).join('\n');
  return response.choices?.[0]?.message?.content || response.output_text || '';
}

// GET request for the provider's model list (the "🔍 scan" button next to
// Model). Every provider here follows (or tolerates) the OpenAI-style
// GET /models -> {data:[{id}, ...]} convention, including Anthropic's own
// models endpoint and every local/OpenAI-compatible server.
export function createModelsRequest(settingsInput) {
  const settings = normalizeAgentSettings(settingsInput);
  const headers = {};
  if (settings.provider === 'anthropic') Object.assign(headers, { 'x-api-key': settings.apiKey, 'anthropic-version': '2023-06-01' }, ANTHROPIC_BROWSER_HEADER);
  else if (settings.apiKey) headers.authorization = `Bearer ${settings.apiKey}`;
  return { url: `${settings.baseUrl}/models`, headers };
}

// Normalizes whatever shape a /models response comes back in (OpenAI/
// Anthropic-style {data:[{id}]}, a bare array, or Ollama-style {models:[{name}]})
// into a flat list of model id strings.
export function extractModelList(response) {
  const list = Array.isArray(response?.data) ? response.data
    : Array.isArray(response?.models) ? response.models
    : Array.isArray(response) ? response
    : [];
  return list.map((m) => (typeof m === 'string' ? m : m.id || m.name)).filter(Boolean);
}
