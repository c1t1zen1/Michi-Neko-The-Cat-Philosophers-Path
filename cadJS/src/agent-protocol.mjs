export const AGENT_PROTOCOL_VERSION = 2;

export const SUPPORTED_AGENT_ACTIONS = new Set([
  'select', 'setTransform', 'setMaterial', 'addPrimitive', 'duplicate', 'delete',
  'distort', 'rename', 'setVisibility', 'applyTexture', 'focus',
  'addProceduralAsset', 'generateProceduralTexture', 'arrayClone', 'mirrorObject',
  'alignObject', 'groupObjects', 'applyPalette', 'poseCharacter', 'scatterObjects',
  'subdivideGeometry'
]);

export const PROVIDER_CATALOG = {
  local: {
    id: 'local',
    label: 'Local / llama-server (llama.cpp)',
    baseUrl: 'http://127.0.0.1:8080/v1',
    model: 'local-model',
    requiresKey: false,
    supportsVision: true,
    popularModels: ['local-model', 'qwen2.5-coder-14b-instruct', 'qwen3-14b', 'llama-3.3-70b-instruct', 'gemma-3-12b-it', 'deepseek-r1-distill-qwen-14b', 'llava-v1.6-mistral-7b']
  },
  ollama: {
    id: 'ollama',
    label: 'Local / Ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: 'qwen2.5-coder:14b',
    requiresKey: false,
    supportsVision: true,
    popularModels: ['qwen2.5-coder:14b', 'qwen2.5-coder:7b', 'llama3.2-vision:11b', 'gemma3:12b', 'deepseek-r1:14b', 'mistral:7b']
  },
  lmstudio: {
    id: 'lmstudio',
    label: 'Local / LM Studio',
    baseUrl: 'http://127.0.0.1:1234/v1',
    model: 'local-model',
    requiresKey: false,
    supportsVision: true,
    popularModels: ['local-model', 'qwen2.5-coder-14b-instruct', 'gemma-3-12b-it', 'llama-3.2-11b-vision-instruct']
  },
  builtin: {
    id: 'builtin',
    label: 'Built-in Instant CAD Copilot (Offline)',
    baseUrl: 'builtin://procedural-engine',
    model: 'cadjs-kyoto-architect-v2',
    requiresKey: false,
    supportsVision: true,
    popularModels: ['cadjs-kyoto-architect-v2']
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-5.2',
    requiresKey: true,
    supportsVision: true,
    popularModels: ['gpt-5.2', 'gpt-4.1', 'gpt-4.1-mini', 'o3', 'o4-mini', 'gpt-4o']
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-opus-4-6',
    requiresKey: true,
    supportsVision: true,
    popularModels: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-3-7-sonnet-latest', 'claude-3-5-haiku-latest']
  },
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.5-pro',
    requiresKey: true,
    supportsVision: true,
    popularModels: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash']
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-5.2',
    requiresKey: true,
    supportsVision: true,
    popularModels: ['openai/gpt-5.2', 'anthropic/claude-sonnet-4-6', 'google/gemini-2.5-pro', 'deepseek/deepseek-r1', 'qwen/qwen-2.5-coder-32b-instruct', 'meta-llama/llama-3.3-70b-instruct']
  },
  groq: {
    id: 'groq',
    label: 'Groq Cloud (Ultra-Fast)',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    requiresKey: true,
    supportsVision: true,
    popularModels: ['llama-3.3-70b-versatile', 'deepseek-r1-distill-llama-70b', 'qwen-qwq-32b', 'llama-3.2-90b-vision-preview']
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek API',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    requiresKey: true,
    supportsVision: false,
    popularModels: ['deepseek-chat', 'deepseek-reasoner']
  },
  xai: {
    id: 'xai',
    label: 'xAI Grok',
    baseUrl: 'https://api.x.ai/v1',
    model: 'grok-3',
    requiresKey: true,
    supportsVision: true,
    popularModels: ['grok-3', 'grok-3-mini', 'grok-2-vision-1212']
  },
  mistral: {
    id: 'mistral',
    label: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    model: 'codestral-latest',
    requiresKey: true,
    supportsVision: true,
    popularModels: ['codestral-latest', 'mistral-large-latest', 'pixtral-large-latest']
  },
  mcp: {
    id: 'mcp',
    label: 'MCP / Custom OpenAI Gateway',
    baseUrl: 'http://127.0.0.1:3000/v1',
    model: 'agent-model',
    requiresKey: false,
    supportsVision: true,
    popularModels: ['agent-model', 'default']
  }
};

export function agentProtocolSchema() {
  return {
    protocol: AGENT_PROTOCOL_VERSION,
    actions: [...SUPPORTED_AGENT_ACTIONS],
    providers: Object.values(PROVIDER_CATALOG),
    response: {
      summary: 'string',
      actions: [{ type: 'action name', target: 'selection|workspace|uuid|name', params: 'object' }],
      notes: ['string']
    }
  };
}

const SYSTEM_PROMPT = `You are the Michi-Neko CAD & 3D Asset Design Agent inside cadJS. Return JSON only.
Create a safe, reversible, artistic plan for the browser Three.js CAD editor. Never return JavaScript, shell commands, file edits, markdown prose outside JSON, or unsupported actions.
The response MUST be a valid JSON object matching:
{"summary":"short explanation of the 3D design changes","actions":[{"type":"supported action","target":"selection|workspace|object uuid or part name","params":{}}],"notes":["optional design tip or follow-up"]}

Supported actions and params:
- select { target:"selection|workspace|uuid|partName" }
- setTransform { position?:[x,y,z], rotation?:[degreesX,degreesY,degreesZ], scale?:[x,y,z] }
- setMaterial { color?:"#rrggbb", emissive?:"#rrggbb", emissiveIntensity?:0..3, roughness?:0..1, metalness?:0..1, opacity?:0..1, flatShading?:boolean, wireframe?:boolean }
- addPrimitive { geometry:"box|sphere|cylinder|cone|plane|torus|capsule|icosahedron|dodecahedron|octahedron|ring", name?, position?:[x,y,z], rotation?:[degX,degY,degZ], scale?:[x,y,z], color?:"#rrggbb", roughness?:0..1, metalness?:0..1 }
- addProceduralAsset { prefab:"torii|lantern|pagoda|bridge|shrine|bamboo|sakura|bonsai|water_basin|stepping_stones|rock_garden|teacup|cat_statue|toro_floating|ema_board", name?, position?:[x,y,z], rotation?:[degX,degY,degZ], scale?:[x,y,z], primaryColor?:"#rrggbb", secondaryColor?:"#rrggbb", accentColor?:"#rrggbb", tiers?:2..7, seed?:number }
- generateProceduralTexture { pattern:"tabby_stripes|calico_patches|tortoiseshell|soft_fur|weathered_stone|mossy_stone|raked_sand|cedar_wood|lacquer_wood|bamboo_grain|shoji_paper|tatami_weave|seigaiha_waves|sakura_petals|autumn_momiji|gold_kintsugi", primaryColor?:"#rrggbb", secondaryColor?:"#rrggbb", accentColor?:"#rrggbb", scope?:"selected|descendants", repeat?:[x,y], rotation?:degrees, seed?:number }
- applyPalette { palette:"kyoto_shrine|sakura_spring|moss_garden|autumn_temple|moonlit_zen|calico_cat|golden_tabby|midnight_kuro|celadon_ceramic|warm_lantern" }
- poseCharacter { pose:"reset|sit|walk|stretch|loaf|curious_tilt|play_bow|sleep_curl", intensity?:0.1..1.5 }
- duplicate { offset?:[x,y,z], name? }
- arrayClone { mode:"linear|radial|grid", count?:2..32, offset?:[x,y,z], radius?:number, angleDegrees?:number, rotateToCenter?:boolean, grid?:[nx,ny,nz], spacing?:[sx,sy,sz] }
- mirrorObject { axis?:"x|y|z", offset?:number, keepOriginal?:boolean }
- alignObject { mode:"ground|center|origin|stack", axis?:"all|x|y|z" }
- scatterObjects { count?:3..32, radius?:1..25, minScale?:0.5..1.5, maxScale?:0.6..2.5, seed?:number }
- groupObjects { name?:string }
- subdivideGeometry { iterations?:1..2, smooth?:boolean }
- delete {}
- distort { mode:"twist|bend|taper|noise|flatten|inflate|pinch|shear|spherize", amount?:-2..2, axis?:"x|y|z", frequency?:0.1..20, seed?:number }
- rename { name:string }
- setVisibility { visible:boolean }
- applyTexture { source:"reference", referenceIndex:0, scope:"selected|descendants", repeat?:[x,y], offset?:[x,y], rotation?:degrees, wrap?:"repeat|clamp|mirror" }
- focus {}

Design rules:
1. Michi-Neko uses a serene painterly Kyoto aesthetic (warm wood, mossy granite, vermilion lacquer, soft sakura pinks, golden lantern glow, 256px procedural textures).
2. You can target specific character parts or child meshes by UUID or semantic/part name (e.g. "Head", "Tail 1", "Left Ear", "Right Ear", "Body", "Muzzle") or use "selection" / "workspace".
3. Prefer high-leverage actions like addProceduralAsset, generateProceduralTexture, applyPalette, poseCharacter, arrayClone, and alignObject when building or restyling assets.
4. Never delete objects unless explicitly asked.`;

function finiteNumber(value, fallback, min = -Infinity, max = Infinity) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

export function normalizeAgentSettings(input = {}) {
  const provider = PROVIDER_CATALOG[input.provider] ? input.provider : 'local';
  const defaults = PROVIDER_CATALOG[provider];
  return {
    provider,
    baseUrl: String(input.baseUrl || defaults.baseUrl).replace(/\/+$/, ''),
    model: String(input.model || defaults.model),
    apiKey: String(input.apiKey || ''),
    temperature: finiteNumber(input.temperature, 0.25, 0, 2),
    topP: finiteNumber(input.topP, 0.9, 0.01, 1),
    maxTokens: Math.round(finiteNumber(input.maxTokens, 3000, 128, 32000)),
    reasoning: ['none', 'low', 'medium', 'high'].includes(input.reasoning) ? input.reasoning : 'medium',
    autonomy: ['plan', 'confirm', 'auto'].includes(input.autonomy) ? input.autonomy : 'confirm',
    fallbackToBuiltin: input.fallbackToBuiltin !== false
  };
}

export function buildAgentPrompt({ instruction, context, references = [], history = [] }) {
  const referenceSummary = references.map((item, index) => ({
    index,
    name: item.name,
    type: item.type,
    width: item.width,
    height: item.height
  }));
  const historyBlock = Array.isArray(history) && history.length
    ? `\n\nRECENT CONVERSATION HISTORY:\n${history.slice(-6).map((turn) => `${String(turn.role || 'user').toUpperCase()}: ${String(turn.content || '').slice(0, 600)}`).join('\n')}`
    : '';
  return `${SYSTEM_PROMPT}${historyBlock}\n\nUSER REQUEST:\n${String(instruction || '').trim()}\n\nCAD CONTEXT:\n${JSON.stringify(context)}\n\nREFERENCE IMAGES:\n${JSON.stringify(referenceSummary)}`;
}

export function extractReasoningAndText(text) {
  const raw = String(text || '');
  const thoughts = [];
  const stripped = raw.replace(/<think>([\s\S]*?)<\/think>/gi, (_, inner) => {
    if (inner.trim()) thoughts.push(inner.trim());
    return '';
  }).trim();
  return { text: stripped || raw.trim(), reasoning: thoughts.join('\n\n') || null };
}

export function extractJson(text) {
  const { text: clean } = extractReasoningAndText(text);
  const raw = String(clean || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(raw); } catch {}
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const candidate = raw.slice(start, end + 1);
    try { return JSON.parse(candidate); } catch {
      // Repair common trailing commas from smaller local models
      const repaired = candidate.replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(repaired);
    }
  }
  throw new Error('The model did not return a JSON plan');
}

export function validateAgentPlan(input) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.actions)) throw new Error('Agent plan must contain an actions array');
  if (input.actions.length > 64) throw new Error('Agent plan exceeds the 64 action safety limit');
  const actions = input.actions.map((item, index) => {
    if (!item || !SUPPORTED_AGENT_ACTIONS.has(item.type)) throw new Error(`Unsupported agent action at ${index}: ${item?.type || 'missing'}`);
    return {
      type: item.type,
      target: String(item.target || 'selection'),
      params: item.params && typeof item.params === 'object' ? item.params : {}
    };
  });
  return {
    protocol: AGENT_PROTOCOL_VERSION,
    summary: String(input.summary || 'CAD agent plan'),
    actions,
    notes: Array.isArray(input.notes) ? input.notes.map(String).slice(0, 12) : [],
    reasoning: input.reasoning ? String(input.reasoning) : null
  };
}

function imageParts(references) {
  return references
    .filter((item) => /^data:image\//.test(item.dataUrl || ''))
    .map((item) => ({ type: 'image_url', image_url: { url: item.dataUrl } }));
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
    if (settings.reasoning !== 'none' && settings.maxTokens >= 1152) {
      body.thinking = {
        type: 'enabled',
        budget_tokens: Math.min(settings.maxTokens - 128, { low: 1024, medium: 2048, high: 4096 }[settings.reasoning] || 2048)
      };
    } else {
      body.temperature = settings.temperature;
      body.top_p = settings.topP;
    }
    return {
      url: `${settings.baseUrl}/messages`,
      headers: {
        'content-type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body
    };
  }

  if (settings.provider === 'gemini' && !settings.baseUrl.includes('/openai')) {
    const parts = [{ text: prompt }];
    for (const reference of payload.references || []) {
      const match = String(reference.dataUrl || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }
    const url = `${settings.baseUrl}/models/${encodeURIComponent(settings.model)}:generateContent?key=${encodeURIComponent(settings.apiKey)}`;
    return {
      url,
      headers: { 'content-type': 'application/json' },
      body: {
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: settings.temperature,
          topP: settings.topP,
          maxOutputTokens: settings.maxTokens,
          responseMimeType: 'application/json'
        }
      }
    };
  }

  const imgs = imageParts(payload.references || []);
  const content = imgs.length ? [{ type: 'text', text: prompt }, ...imgs] : [{ type: 'text', text: prompt }, ...imgs];
  const body = {
    model: settings.model,
    messages: [{ role: 'user', content }],
    temperature: settings.temperature,
    top_p: settings.topP,
    max_tokens: settings.maxTokens,
    response_format: { type: 'json_object' }
  };
  if (settings.reasoning !== 'none' && !['local', 'ollama', 'lmstudio', 'mcp', 'builtin'].includes(settings.provider)) {
    body.reasoning_effort = settings.reasoning;
  }
  const headers = { 'content-type': 'application/json' };
  if (settings.apiKey) headers.authorization = `Bearer ${settings.apiKey}`;
  if (settings.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'http://127.0.0.1/cadJS';
    headers['X-Title'] = 'Michi-Neko cadJS';
  }
  return { url: `${settings.baseUrl}/chat/completions`, headers, body };
}

export function extractProviderText(provider, response) {
  if (provider === 'anthropic') {
    return (response.content || []).filter((item) => item.type === 'text').map((item) => item.text).join('\n');
  }
  if (provider === 'gemini' && response.candidates) {
    return (response.candidates?.[0]?.content?.parts || []).map((part) => part.text || '').join('\n');
  }
  return response.choices?.[0]?.message?.content || response.output_text || '';
}

export function extractProviderReasoning(provider, response, rawText = '') {
  if (provider === 'anthropic') {
    const thinking = (response.content || []).filter((item) => item.type === 'thinking').map((item) => item.thinking || item.text || '').join('\n');
    if (thinking) return thinking;
  }
  const msg = response?.choices?.[0]?.message;
  if (msg?.reasoning_content) return msg.reasoning_content;
  if (msg?.reasoning) return msg.reasoning;
  const { reasoning } = extractReasoningAndText(rawText);
  return reasoning;
}

/**
 * Built-in local procedural CAD planner — works offline and acts as an instant
 * smart fallback when local llama-server or remote APIs are unreachable.
 */
export function synthesizeBuiltinPlan({ instruction = '', context = {}, references = [] } = {}) {
  const text = String(instruction || '').toLowerCase();
  const actions = [];
  const notes = [];
  const hasSelection = Boolean(context?.selectionUuid);
  const target = hasSelection ? 'selection' : 'workspace';

  // 1. Check for Kyoto procedural prefab requests
  const prefabMatchers = [
    { rx: /\b(torii|shrine gate|vermilion gate)\b/, prefab: 'torii', label: 'Kyoto Torii Gate' },
    { rx: /\b(floating lantern|toro nagashi|river lantern|paper lantern)\b/, prefab: 'toro_floating', label: 'Floating River Lantern' },
    { rx: /\b(stone lantern|lantern|ishi-?doro|lamp)\b/, prefab: 'lantern', label: 'Stone Lantern (Ishi-Doro)' },
    { rx: /\b(pagoda|temple tower|tiered tower|five-story|three-tier)\b/, prefab: 'pagoda', label: 'Kyoto Wooden Pagoda' },
    { rx: /\b(bridge|footbridge|canal bridge)\b/, prefab: 'bridge', label: 'Canal Footbridge' },
    { rx: /\b(hokora|wayside shrine|small shrine|inari shrine)\b/, prefab: 'shrine', label: 'Wayside Hokora Shrine' },
    { rx: /\b(bamboo|bamboo grove|culm)\b/, prefab: 'bamboo', label: 'Bamboo Grove Cluster' },
    { rx: /\b(sakura|cherry blossom|cherry tree|blossom tree)\b/, prefab: 'sakura', label: 'Sakura Blossom Tree' },
    { rx: /\b(bonsai|potted pine|pine tray)\b/, prefab: 'bonsai', label: 'Sculpted Pine Bonsai' },
    { rx: /\b(water basin|tsukubai|wash basin|fountain)\b/, prefab: 'water_basin', label: 'Tsukubai Water Basin' },
    { rx: /\b(stepping stone|tobi-?ishi|garden path)\b/, prefab: 'stepping_stones', label: 'Tobi-Ishi Stepping Stones' },
    { rx: /\b(rock garden|zen rock|karesansui|gravel garden)\b/, prefab: 'rock_garden', label: 'Zen Rock Cluster' },
    { rx: /\b(teacup|matcha|tea bowl|chawan)\b/, prefab: 'teacup', label: 'Matcha Chawan Set' },
    { rx: /\b(maneki|cat statue|neko statue|beckoning cat|guardian cat)\b/, prefab: 'cat_statue', label: 'Guardian Neko Statue' },
    { rx: /\b(ema|wishing plaque|plaque board)\b/, prefab: 'ema_board', label: 'Ema Wishing Plaque Stand' }
  ];

  for (const item of prefabMatchers) {
    if (item.rx.test(text)) {
      const tiersMatch = text.match(/(\d+)\s*(?:tier|story|level)/);
      const params = { prefab: item.prefab, name: item.label };
      if (tiersMatch) params.tiers = Math.min(7, Math.max(2, Number(tiersMatch[1])));
      actions.push({ type: 'addProceduralAsset', target: 'workspace', params });
      break;
    }
  }

  // 2. Check for primitive creation if no prefab matched and user asks to add a primitive
  if (!actions.length && /\b(add|create|make|spawn|new)\b/.test(text)) {
    const prims = ['box', 'sphere', 'cylinder', 'cone', 'torus', 'capsule', 'icosahedron', 'plane'];
    for (const prim of prims) {
      if (new RegExp(`\\b${prim}\\b`).test(text)) {
        actions.push({ type: 'addPrimitive', target: 'workspace', params: { geometry: prim, name: `Styled ${prim[0].toUpperCase() + prim.slice(1)}` } });
        break;
      }
    }
  }

  // 3. Character / Cat redesign & poses
  if (/\b(sit|sitting)\b/.test(text)) actions.push({ type: 'poseCharacter', target, params: { pose: 'sit', intensity: 1 } });
  else if (/\b(stretch|stretching)\b/.test(text)) actions.push({ type: 'poseCharacter', target, params: { pose: 'stretch', intensity: 1 } });
  else if (/\b(loaf|cat loaf)\b/.test(text)) actions.push({ type: 'poseCharacter', target, params: { pose: 'loaf', intensity: 1 } });
  else if (/\b(walk|stride|stroll)\b/.test(text)) actions.push({ type: 'poseCharacter', target, params: { pose: 'walk', intensity: 1 } });
  else if (/\b(curious|tilt)\b/.test(text)) actions.push({ type: 'poseCharacter', target, params: { pose: 'curious_tilt', intensity: 1 } });
  else if (/\b(pounce|play bow|playful)\b/.test(text)) actions.push({ type: 'poseCharacter', target, params: { pose: 'play_bow', intensity: 1 } });
  else if (/\b(sleep|curl|nap)\b/.test(text)) actions.push({ type: 'poseCharacter', target, params: { pose: 'sleep_curl', intensity: 1 } });

  if (/\b(rounder head|bigger head|chibi|cute head)\b/.test(text)) {
    actions.push({ type: 'setTransform', target: 'Head', params: { scale: [1.18, 1.15, 1.16] } });
  }
  if (/\b(enlarge.*eyes|bigger eyes|large eyes|expressive eyes)\b/.test(text)) {
    actions.push({ type: 'setTransform', target: 'Eyes 1', params: { scale: [1.28, 1.28, 1.2] } });
    actions.push({ type: 'setTransform', target: 'Eyes 2', params: { scale: [1.28, 1.28, 1.2] } });
  }
  if (/\b(long(?:er)? ears|tall ears|perky ears)\b/.test(text)) {
    actions.push({ type: 'setTransform', target: 'Ears 1', params: { scale: [1.1, 1.35, 1.1] } });
    actions.push({ type: 'setTransform', target: 'Ears 2', params: { scale: [1.1, 1.35, 1.1] } });
  }
  if (/\b(fluffy tail|bigger tail|bushy tail)\b/.test(text)) {
    actions.push({ type: 'setTransform', target: 'Tail Root', params: { scale: [1.3, 1.25, 1.3] } });
  }

  // 4. Painterly 256px procedural textures
  const texMatchers = [
    { rx: /\b(tabby|striped|stripes|ginger stripe)\b/, pattern: 'tabby_stripes' },
    { rx: /\b(calico|spotted|patched)\b/, pattern: 'calico_patches' },
    { rx: /\b(tortoiseshell|mottled)\b/, pattern: 'tortoiseshell' },
    { rx: /\b(moss|mossy)\b/, pattern: 'mossy_stone' },
    { rx: /\b(granite|weathered stone|stone texture)\b/, pattern: 'weathered_stone' },
    { rx: /\b(raked sand|gravel)\b/, pattern: 'raked_sand' },
    { rx: /\b(cedar|hinoki|wood grain|wooden)\b/, pattern: 'cedar_wood' },
    { rx: /\b(vermilion|lacquer)\b/, pattern: 'lacquer_wood' },
    { rx: /\b(bamboo texture|bamboo grain)\b/, pattern: 'bamboo_grain' },
    { rx: /\b(shoji|paper screen)\b/, pattern: 'shoji_paper' },
    { rx: /\b(tatami|woven mat)\b/, pattern: 'tatami_weave' },
    { rx: /\b(wave|seigaiha|kimono)\b/, pattern: 'seigaiha_waves' },
    { rx: /\b(kintsugi|gold crack|ceramic glaze)\b/, pattern: 'gold_kintsugi' },
    { rx: /\b(sakura texture|blossom texture|petal)\b/, pattern: 'sakura_petals' },
    { rx: /\b(autumn|maple|momiji)\b/, pattern: 'autumn_momiji' }
  ];
  for (const item of texMatchers) {
    if (item.rx.test(text)) {
      actions.push({
        type: 'generateProceduralTexture',
        target: 'selection',
        params: { pattern: item.pattern, scope: 'descendants', repeat: [1, 1] }
      });
      break;
    }
  }

  // If user uploaded reference images and asked to apply texture
  if (references.length > 0 && /\b(reference|texture|apply image|wrap)\b/.test(text)) {
    actions.push({
      type: 'applyTexture',
      target: 'selection',
      params: { source: 'reference', referenceIndex: 0, scope: 'descendants', repeat: [1, 1], wrap: 'repeat' }
    });
  }

  // 5. Color palettes
  const paletteMatchers = [
    { rx: /\b(kyoto shrine|vermilion palette)\b/, palette: 'kyoto_shrine' },
    { rx: /\b(sakura palette|spring palette|pastel pink)\b/, palette: 'sakura_spring' },
    { rx: /\b(moss garden|forest palette)\b/, palette: 'moss_garden' },
    { rx: /\b(autumn temple|autumn palette|fall colors)\b/, palette: 'autumn_temple' },
    { rx: /\b(moonlit|night palette|silver blue)\b/, palette: 'moonlit_zen' },
    { rx: /\b(calico palette)\b/, palette: 'calico_cat' },
    { rx: /\b(golden tabby|ginger cat)\b/, palette: 'golden_tabby' },
    { rx: /\b(midnight|black cat|kuro)\b/, palette: 'midnight_kuro' },
    { rx: /\b(celadon|jade|tea glaze)\b/, palette: 'celadon_ceramic' }
  ];
  for (const item of paletteMatchers) {
    if (item.rx.test(text)) {
      actions.push({ type: 'applyPalette', target: 'selection', params: { palette: item.palette } });
      break;
    }
  }

  // 6. Array / Radial / Scatter / Mirror / Align / Distort
  if (/\b(radial|circle of|ring of)\b/.test(text)) {
    const countMatch = text.match(/(\d+)/);
    actions.push({
      type: 'arrayClone',
      target: 'selection',
      params: { mode: 'radial', count: countMatch ? Math.min(24, Math.max(3, Number(countMatch[1]))) : 6, radius: 2.4, rotateToCenter: true }
    });
  } else if (/\b(array|row of|line of|repeat)\b/.test(text)) {
    const countMatch = text.match(/(\d+)/);
    actions.push({
      type: 'arrayClone',
      target: 'selection',
      params: { mode: 'linear', count: countMatch ? Math.min(20, Math.max(2, Number(countMatch[1]))) : 4, offset: [1.4, 0, 0] }
    });
  } else if (/\b(scatter|cluster|field of)\b/.test(text)) {
    const countMatch = text.match(/(\d+)/);
    actions.push({
      type: 'scatterObjects',
      target: 'selection',
      params: { count: countMatch ? Math.min(24, Math.max(3, Number(countMatch[1]))) : 7, radius: 3.5, minScale: 0.75, maxScale: 1.3 }
    });
  }

  if (/\b(mirror|symmetry|flip)\b/.test(text)) {
    const axis = /\bz\b/.test(text) ? 'z' : /\by\b/.test(text) ? 'y' : 'x';
    actions.push({ type: 'mirrorObject', target: 'selection', params: { axis, keepOriginal: true } });
  }

  for (const mode of ['twist', 'bend', 'taper', 'noise', 'flatten', 'inflate', 'pinch', 'shear', 'spherize']) {
    if (new RegExp(`\\b${mode}\\b`).test(text)) {
      actions.push({ type: 'distort', target: 'selection', params: { mode, amount: 0.55, axis: 'y' } });
    }
  }

  if (/\b(ground|drop to floor|snap to ground|place on ground)\b/.test(text)) {
    actions.push({ type: 'alignObject', target: 'selection', params: { mode: 'ground' } });
  }
  if (/\b(center|origin)\b/.test(text)) {
    actions.push({ type: 'alignObject', target: 'selection', params: { mode: 'center' } });
  }

  // Fallback if prompt was generic
  if (!actions.length) {
    if (hasSelection) {
      actions.push({ type: 'generateProceduralTexture', target: 'selection', params: { pattern: 'mossy_stone', scope: 'descendants' } });
      actions.push({ type: 'alignObject', target: 'selection', params: { mode: 'ground' } });
      notes.push('Applied painterly Kyoto surface styling and grounded selection.');
    } else {
      actions.push({ type: 'addProceduralAsset', target: 'workspace', params: { prefab: 'lantern', name: 'Kyoto Stone Lantern' } });
      notes.push('Created a Kyoto Stone Lantern as a starting point.');
    }
  }

  actions.push({ type: 'focus', target: 'selection', params: {} });

  return validateAgentPlan({
    summary: `Synthesized ${actions.length} CAD action(s) for "${instruction.slice(0, 72)}"`,
    actions,
    notes: notes.length ? notes : ['Generated by Built-in Instant CAD Copilot (reversible with Undo).']
  });
}