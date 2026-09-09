export const AGENT_PROTOCOL_VERSION = 1;

export const SUPPORTED_AGENT_ACTIONS = new Set([
  'select', 'setTransform', 'setMaterial', 'addPrimitive', 'duplicate', 'delete',
  'distort', 'rename', 'setVisibility', 'applyTexture', 'focus'
]);

export function agentProtocolSchema() {
  return { protocol:AGENT_PROTOCOL_VERSION, actions:[...SUPPORTED_AGENT_ACTIONS], response:{ summary:'string', actions:[{ type:'action name', target:'selection|workspace|uuid', params:'object' }], notes:['string'] } };
}

const SYSTEM_PROMPT = `You are the Michi-Neko CAD design agent. Return JSON only.
Create a safe, reversible plan for the browser Three.js editor. Never return JavaScript, shell commands, file edits, markdown, or unsupported actions.
The response must match:
{"summary":"short explanation","actions":[{"type":"supported action","target":"selection|workspace|object uuid","params":{}}],"notes":["optional caveat"]}
Supported actions and params:
- select { target }
- setTransform { position?:[x,y,z], rotation?:[degrees,degrees,degrees], scale?:[x,y,z] }
- setMaterial { color?:"#rrggbb", emissive?:"#rrggbb", roughness?:0..1, metalness?:0..1, opacity?:0..1, flatShading?:boolean, wireframe?:boolean }
- addPrimitive { geometry:"box|sphere|cylinder|cone|plane|torus|capsule|icosahedron", name?, position?, rotation?, scale?, color? }
- duplicate {}
- delete {}
- distort { mode:"twist|bend|taper|noise|flatten|inflate|pinch|shear|spherize", amount?:-2..2, axis?:"x|y|z", frequency?:0.1..20, seed?:number }
- rename { name }
- setVisibility { visible:boolean }
- applyTexture { source:"reference", referenceIndex:0, scope:"selected|descendants", repeat?:[x,y], offset?:[x,y], rotation?:degrees, wrap?:"repeat|clamp|mirror" }
- focus {}
Use selection as the target unless a listed object UUID is clearly required. Prefer a small coherent plan. Do not delete unless explicitly requested.`;

function finiteNumber(value, fallback, min = -Infinity, max = Infinity) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

export function normalizeAgentSettings(input = {}) {
  const provider = ['local', 'mcp', 'openai', 'openrouter', 'anthropic'].includes(input.provider) ? input.provider : 'local';
  const defaults = {
    local: { baseUrl: 'http://127.0.0.1:8080/v1', model: 'local-model' },
    mcp: { baseUrl: 'http://127.0.0.1:3000/v1', model: 'agent-model' },
    openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-5.2' },
    openrouter: { baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-5.2' },
    anthropic: { baseUrl: 'https://api.anthropic.com/v1', model: 'claude-opus-4-6' }
  }[provider];
  return {
    provider,
    baseUrl: String(input.baseUrl || defaults.baseUrl).replace(/\/+$/, ''),
    model: String(input.model || defaults.model),
    apiKey: String(input.apiKey || ''),
    temperature: finiteNumber(input.temperature, 0.25, 0, 2),
    topP: finiteNumber(input.topP, 0.9, 0.01, 1),
    maxTokens: Math.round(finiteNumber(input.maxTokens, 3000, 128, 32000)),
    reasoning: ['none', 'low', 'medium', 'high'].includes(input.reasoning) ? input.reasoning : 'medium',
    autonomy: ['plan', 'confirm', 'auto'].includes(input.autonomy) ? input.autonomy : 'confirm'
  };
}

export function buildAgentPrompt({ instruction, context, references = [] }) {
  const referenceSummary = references.map((item, index) => ({ index, name: item.name, type: item.type, width: item.width, height: item.height }));
  return `${SYSTEM_PROMPT}\n\nUSER REQUEST:\n${String(instruction || '').trim()}\n\nCAD CONTEXT:\n${JSON.stringify(context)}\n\nREFERENCE IMAGES:\n${JSON.stringify(referenceSummary)}`;
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
  if (input.actions.length > 64) throw new Error('Agent plan exceeds the 64 action safety limit');
  const actions = input.actions.map((item, index) => {
    if (!item || !SUPPORTED_AGENT_ACTIONS.has(item.type)) throw new Error(`Unsupported agent action at ${index}: ${item?.type || 'missing'}`);
    return { type: item.type, target: String(item.target || 'selection'), params: item.params && typeof item.params === 'object' ? item.params : {} };
  });
  return {
    protocol: AGENT_PROTOCOL_VERSION,
    summary: String(input.summary || 'CAD agent plan'),
    actions,
    notes: Array.isArray(input.notes) ? input.notes.map(String).slice(0, 12) : []
  };
}

function imageParts(references) {
  return references.filter((item) => /^data:image\//.test(item.dataUrl || '')).map((item) => ({ type: 'image_url', image_url: { url: item.dataUrl } }));
}

export function createProviderRequest(settingsInput, payload) {
  const settings = normalizeAgentSettings(settingsInput);
  const prompt = buildAgentPrompt(payload);
  if (settings.provider === 'anthropic') {
    const content = [{ type: 'text', text: prompt }];
    for (const reference of payload.references || []) {
      const match = String(reference.dataUrl || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (match) content.push({ type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } });
    }
    const body = { model: settings.model, max_tokens: settings.maxTokens, messages: [{ role: 'user', content }] };
    if (settings.reasoning !== 'none' && settings.maxTokens >= 1152) body.thinking = { type: 'enabled', budget_tokens: Math.min(settings.maxTokens - 128, { low: 1024, medium: 2048, high: 4096 }[settings.reasoning] || 2048) };
    else { body.temperature = settings.temperature; body.top_p = settings.topP; }
    return { url: `${settings.baseUrl}/messages`, headers: { 'content-type': 'application/json', 'x-api-key': settings.apiKey, 'anthropic-version': '2023-06-01' }, body };
  }
  const content = [{ type: 'text', text: prompt }, ...imageParts(payload.references || [])];
  const body = { model: settings.model, messages: [{ role: 'user', content }], temperature: settings.temperature, top_p: settings.topP, max_tokens: settings.maxTokens, response_format: { type: 'json_object' } };
  if (settings.reasoning !== 'none' && !['local','mcp'].includes(settings.provider)) body.reasoning_effort = settings.reasoning;
  const headers = { 'content-type': 'application/json' };
  if (settings.apiKey) headers.authorization = `Bearer ${settings.apiKey}`;
  if (settings.provider === 'openrouter') { headers['HTTP-Referer'] = 'http://127.0.0.1/cadJS'; headers['X-Title'] = 'Michi-Neko cadJS'; }
  return { url: `${settings.baseUrl}/chat/completions`, headers, body };
}

export function extractProviderText(provider, response) {
  if (provider === 'anthropic') return (response.content || []).filter((item) => item.type === 'text').map((item) => item.text).join('\n');
  return response.choices?.[0]?.message?.content || response.output_text || '';
}