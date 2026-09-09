/* dawCAT — AI composition agent protocol: provider-agnostic request building,
   prompt construction, and strict plan validation. Mirrors cadJS's
   src/agent-protocol.mjs (same provider set, same JSON-only contract), swapping
   the CAD action vocabulary for a DAW one. Runs unmodified in both the browser
   (agent-panel.js) and the Node proxy (server.mjs) — no DOM, no Node built-ins. */

export const AGENT_PROTOCOL_VERSION = 1;

export const SUPPORTED_AGENT_ACTIONS = new Set([
  'addTrack', 'renameTrack', 'deleteTrack', 'setTrackMix', 'setTrackPreset',
  'addDevice', 'addClip', 'deleteClip', 'setTempo', 'setKeyScale', 'setSwing'
]);

export function agentProtocolSchema() {
  return {
    protocol: AGENT_PROTOCOL_VERSION,
    actions: [...SUPPORTED_AGENT_ACTIONS],
    response: { summary: 'string', actions: [{ type: 'action name', target: 'selection|track id|trackId:clipId', params: 'object' }], caveats: ['string'] }
  };
}

const SYSTEM_PROMPT = `You are the dawCAT music composition agent for the Michi-Neko game soundtrack. Return JSON only.
Create a small, musically coherent plan of DAW actions the browser editor can execute directly. Never return audio data, JavaScript, shell commands, markdown, or unsupported actions.
The response must match:
{"summary":"short explanation","actions":[{"type":"supported action","target":"selection|track id|trackId:clipId","params":{}}],"caveats":["optional caveat"]}
Supported actions and params:
- addTrack { name?, kind:"synth"|"drum", preset?:"pluck|pad|lead|bass|keys|chime" (synth only), drumKit?:"soft|punch|lofi" (drum only) } — target is ignored; the new track becomes "selection" for later actions in this plan.
- renameTrack { name }
- deleteTrack {}
- setTrackMix { volume?:0..1, pan?:-1..1, mute?:boolean, solo?:boolean, sends?:{a?:0..1,b?:0..1} }
- setTrackPreset { preset:"pluck|pad|lead|bass|keys|chime", patch?:{cutoff?:20..12000,res?:0..8,attack?:0..4,decay?:0..4,sustain?:0..1,release?:0..6,detune?:0..50,gain?:0..1} } (synth tracks only)
- addDevice { type:"eq8|comp|delay|reverb|filter|chorus|utility" }
- addClip { name?, start:bars, length:bars, loop?:boolean, loopLen?:beats, notes?:[{midi:0-127,start:beats,len:beats,vel:0-1}], steps?:{"kick|snare|clap|hatC|hatO|tom|rim|perc":[[stepIndex 0-15, velocity 0-1], ...]} } — use \`notes\` for a synth track's melody, \`steps\` for a drum track's rhythm, never both.
- deleteClip {} — target must be "trackId:clipId"
- setTempo { bpm:40..220 }
- setKeyScale { key:"C|C#|D|D#|E|F|F#|G|G#|A|A#|B", scale:"major|minor|dorian|pentatonic minor|pentatonic major|hirajoshi|in sen|chromatic" }
- setSwing { swing:0..1 }
"selection" (the default target) means the most recently created/targeted track earlier in this same plan, or the editor's current selection if this is the first action to need one. Reference an existing track from CONTEXT by its id. Prefer a handful of coherent tracks/clips over a wall of actions. Do not delete a track or clip unless explicitly asked to. When the request references the game's mood (e.g. "dawn", "dusk", a Game Cue name) or CONTEXT lists matching gameCues, match their root/scale/chord so the result fits the game's own musical DNA.`;

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
    anthropic: { baseUrl: 'https://api.anthropic.com/v1', model: 'claude-opus-4-6' }
  }[provider];
  return {
    provider,
    baseUrl: String(input.baseUrl || defaults.baseUrl).replace(/\/+$/, ''),
    model: String(input.model || defaults.model),
    apiKey: String(input.apiKey || ''),
    temperature: finiteNumber(input.temperature, 0.4, 0, 2),
    topP: finiteNumber(input.topP, 0.9, 0.01, 1),
    maxTokens: Math.round(finiteNumber(input.maxTokens, 3000, 128, 32000)),
    reasoning: ['none', 'low', 'medium', 'high'].includes(input.reasoning) ? input.reasoning : 'medium',
    autonomy: ['plan', 'confirm', 'auto'].includes(input.autonomy) ? input.autonomy : 'confirm'
  };
}

export function buildAgentPrompt({ instruction, context }) {
  return `${SYSTEM_PROMPT}\n\nUSER REQUEST:\n${String(instruction || '').trim()}\n\nDAW CONTEXT:\n${JSON.stringify(context)}`;
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

export function createProviderRequest(settingsInput, payload) {
  const settings = normalizeAgentSettings(settingsInput);
  const prompt = buildAgentPrompt(payload);
  if (settings.provider === 'anthropic') {
    const body = { model: settings.model, max_tokens: settings.maxTokens, messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }] };
    if (settings.reasoning !== 'none' && settings.maxTokens >= 1152) body.thinking = { type: 'enabled', budget_tokens: Math.min(settings.maxTokens - 128, { low: 1024, medium: 2048, high: 4096 }[settings.reasoning] || 2048) };
    else { body.temperature = settings.temperature; body.top_p = settings.topP; }
    return { url: `${settings.baseUrl}/messages`, headers: { 'content-type': 'application/json', 'x-api-key': settings.apiKey, 'anthropic-version': '2023-06-01' }, body };
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
