/* dawCAT — AI agent action schema. One declarative catalog drives three
   things so they can never drift apart: the action reference in the system
   prompt, the JSON Schema sent to providers that support structured output,
   and validation/coercion of whatever the model actually returns.

   Validation is deliberately forgiving about form (aliases, casing, flattened
   params, numeric strings, out-of-range numbers are clamped) and strict about
   meaning (unknown actions, missing required params, notes/chords/grids that
   don't parse). Every error names its exact path so the repair loop can hand
   it straight back to the model. Pure module: no DOM. */
import { parseNote, parseChordOrRoman, parsePhrase, parseStepGrid, degreesToMidi, keyIndex, GROOVES, ARP_STYLES, DRUM_LANE_IDS, NOTE_NAMES, SCALES } from './theory.js';

export const PLAN_PROTOCOL_VERSION = 2;
export const MAX_ACTIONS = 60;

export const SYNTH_PRESETS = ['pluck', 'pad', 'lead', 'bass', 'keys', 'chime', 'sampler'];
export const DRUM_KITS = ['soft', 'punch', 'lofi', 'taiko', '808', 'acoustic', 'crisp'];
export const DEVICE_TYPES = ['eq8', 'comp', 'delay', 'reverb', 'filter', 'chorus', 'utility'];
export const WAVES = ['sine', 'triangle', 'sawtooth', 'square'];
export const TIMES_OF_DAY = ['dawn', 'day', 'dusk', 'night', 'all'];

/* ---------------- param spec helpers ---------------- */

const num = (min, max, extra = {}) => ({ type: 'number', min, max, ...extra });
const int = (min, max, extra = {}) => ({ type: 'integer', min, max, ...extra });
const str = (extra = {}) => ({ type: 'string', ...extra });
const bool = (extra = {}) => ({ type: 'boolean', ...extra });
const oneOf = (values, extra = {}) => ({ type: 'enum', values, ...extra });
const obj = (fields, extra = {}) => ({ type: 'object', fields, ...extra });
const special = (type, extra = {}) => ({ type, ...extra });

const SCALE_ALIASES = {
  ionian: 'major', aeolian: 'minor', naturalminor: 'minor', majorpentatonic: 'pentatonic major',
  minorpentatonic: 'pentatonic minor', pentatonic: 'pentatonic major', insen: 'in sen', yo: 'pentatonic major'
};
const keyField = special('key', { desc: 'C C# D D# E F F# G G# A A# B (flats accepted)' });

const NOTES_DESC = '[{note:"C4"|midi:0-127, start:beats, len:beats, vel:0-1}]';
const CONTENT_FIELDS = {
  notes: special('notes', { desc: NOTES_DESC }),
  phrase: special('phrase', { desc: 'sequential "E5/1 G5/.5 r/.5 [C4 E4 G4]/2@0.6" (note/beats@vel, r = rest, w h q e s durations)' }),
  degrees: special('degrees', { desc: 'scale degrees in the project key, e.g. [1,3,5,"b7",8,-5] (r = rest)' }),
  degreeRate: num(0.0625, 16, { default: 1, desc: 'beats per degree' }),
  octave: int(0, 8, { desc: 'octave for degrees (default 4)' }),
  grid: special('grid', { desc: '{kick:"x...x...x...x...", snare:"....x.......x...", hatC:"x.x.x.x.x.x.x.x."} — 16 steps, x accent, o hit, g ghost, . rest' }),
  groove: special('groove', { desc: Object.keys(GROOVES).join('|') }),
  steps: special('steps', { desc: 'legacy {lane:[[step 0-15, vel 0-1], …]}' })
};

/* ---------------- the catalog ---------------- */

export const ACTIONS = [
  // project
  { type: 'setTempo', group: 'Project', target: 'none', summary: 'set project tempo', params: { bpm: num(40, 220, { required: true }) } },
  { type: 'setKeyScale', group: 'Project', target: 'none', summary: 'set project key and/or scale', params: { key: keyField, scale: oneOf(Object.keys(SCALES), { aliases: SCALE_ALIASES }) }, anyOf: ['key', 'scale'] },
  { type: 'setSwing', group: 'Project', target: 'none', summary: 'groove swing amount', params: { swing: num(0, 1, { required: true }) } },
  { type: 'setMaster', group: 'Project', target: 'none', summary: 'master fader', params: { volume: num(0, 1, { required: true }) } },
  { type: 'setLoop', group: 'Project', target: 'none', summary: 'loop region in bars', params: { on: bool(), start: num(0, 999), end: num(0.25, 999) } },
  { type: 'setProjectInfo', group: 'Project', target: 'none', summary: 'name, game scene, time of day, day-phase section bars', params: { name: str(), scene: str(), timeOfDay: oneOf(TIMES_OF_DAY), sections: obj({ dawn: int(-1, 999), day: int(-1, 999), dusk: int(-1, 999), night: int(-1, 999) }) } },

  // tracks
  { type: 'addTrack', group: 'Tracks', target: 'none', summary: 'new track; becomes "selection" for later actions', params: { name: str(), kind: oneOf(['synth', 'drum'], { default: 'synth' }), preset: oneOf(SYNTH_PRESETS, { desc: 'synth only' }), drumKit: oneOf(DRUM_KITS, { desc: 'drum only' }), color: special('color'), volume: num(0, 1), pan: num(-1, 1) } },
  { type: 'renameTrack', group: 'Tracks', target: 'track', summary: 'rename a track', params: { name: str({ required: true }) } },
  { type: 'deleteTrack', group: 'Tracks', target: 'track', summary: 'delete a track (only when asked)', params: {} },
  { type: 'setTrackMix', group: 'Tracks', target: 'track', summary: 'fader, pan, mute/solo, reverb (a) / delay (b) sends', params: { volume: num(0, 1), pan: num(-1, 1), mute: bool(), solo: bool(), sends: obj({ a: num(0, 1), b: num(0, 1) }) } },
  { type: 'setTrackPreset', group: 'Tracks', target: 'track', summary: 'synth sound: preset and/or patch tweaks', params: { preset: oneOf(SYNTH_PRESETS), patch: obj({ osc1: oneOf(WAVES), osc2: oneOf(WAVES), cutoff: num(20, 12000), res: num(0, 8), attack: num(0, 4), decay: num(0, 4), sustain: num(0, 1), release: num(0, 6), detune: num(0, 50), gain: num(0, 1) }) } },
  { type: 'addDevice', group: 'Tracks', target: 'track', summary: 'append an effect (stacks duplicates)', params: { type: oneOf(DEVICE_TYPES, { required: true }) } },
  { type: 'setDeviceParams', group: 'Tracks', target: 'track', summary: 'tweak the first device of a type, adding it if missing — eq8 {hpOn,hpFreq,bands[{type,freq,gain,q}]}, comp {threshold,ratio,attack,release,knee,makeup}, delay {sync:"1/16|1/8|1/8D|1/4|1/4D|1/2",feedback,wet}, reverb {size,decay,wet}, filter {type:"lowpass|highpass|bandpass",freq,q}, chorus {rate,depth,mix}, utility {gain}', params: { type: oneOf(DEVICE_TYPES, { required: true }), params: special('object', { required: true }) } },
  { type: 'removeDevice', group: 'Tracks', target: 'track', summary: 'remove the first device of a type', params: { type: oneOf(DEVICE_TYPES, { required: true }) } },

  // clips
  { type: 'addClip', group: 'Clips', target: 'track', summary: 'new clip. Synth content: notes | phrase | degrees. Drum content: grid | groove | steps', params: { name: str(), start: num(0, 999, { default: 0, desc: 'bars' }), length: num(0.25, 256, { default: 4, desc: 'bars' }), loop: bool(), loopLen: num(0.25, 1024, { desc: 'beats' }), ...CONTENT_FIELDS }, aliases: { bars: 'length', duration: 'length', startBar: 'start', pattern: 'grid' } },
  { type: 'setClipNotes', group: 'Clips', target: 'clip', summary: 'replace a clip\'s content in place (same fields as addClip content)', params: { ...CONTENT_FIELDS }, aliases: { pattern: 'grid' } },
  { type: 'deleteClip', group: 'Clips', target: 'clip', summary: 'delete a clip', params: {} },
  { type: 'transposeClip', group: 'Clips', target: 'clip', summary: 'shift every note; a track id target transposes all its clips', params: { semitones: int(-48, 48, { required: true }) } },
  { type: 'duplicateClip', group: 'Clips', target: 'clip', summary: 'copy a clip end-to-end after itself', params: { times: int(1, 16, { default: 1 }) } },
  { type: 'moveClip', group: 'Clips', target: 'clip', summary: 'change clip timing/looping', params: { start: num(0, 999), length: num(0.25, 256), loop: bool(), loopLen: num(0.25, 1024), name: str() } },

  // composition helpers
  { type: 'addChordProgression', group: 'Compose', target: 'track', summary: 'chords → notes with voice leading. style block|up|down|updown|broken|pulse|strum|random', params: { chords: special('chords', { required: true, desc: 'chord symbols "Cmaj7 Am7 Dm7 G7" or numerals "I vi ii V7"' }), beatsPerChord: num(0.25, 16, { default: 4 }), octave: int(1, 6, { default: 3 }), style: oneOf(ARP_STYLES, { default: 'block' }), rate: num(0.0625, 4, { default: 0.5, desc: 'beats per arp step' }), voiceLead: bool({ default: true }), bass: bool({ desc: 'add the root an octave below' }), repeat: int(1, 16, { default: 1 }), start: num(0, 999, { default: 0, desc: 'bars' }), vel: num(0, 1, { default: 0.7 }), name: str(), loop: bool() } },
  { type: 'addDrumPattern', group: 'Compose', target: 'track', summary: 'drum clip from a named groove or step grid (drum tracks)', params: { groove: CONTENT_FIELDS.groove, grid: CONTENT_FIELDS.grid, start: num(0, 999, { default: 0 }), bars: int(1, 256, { default: 4 }), name: str() }, anyOf: ['groove', 'grid'], aliases: { pattern: 'grid', length: 'bars', rhythm: 'groove' } },
  { type: 'setDrumRhythm', group: 'Compose', target: 'none', summary: 'switch the song\'s drum rhythm to any named groove (or grid), optionally setting drumKit and tempo', params: { groove: CONTENT_FIELDS.groove, grid: CONTENT_FIELDS.grid, drumKit: oneOf(DRUM_KITS), syncTempo: bool({ default: false }), bars: int(1, 256, { default: 8 }) }, anyOf: ['groove', 'grid'], aliases: { rhythm: 'groove', pattern: 'grid', kit: 'drumKit' } },
  { type: 'addAutomation', group: 'Compose', target: 'track', summary: 'automation lane: param volume|pan|master or "<device>.<param>" (e.g. filter.freq, reverb.wet). points [[beat,value]] or ramp {from,to,startBar,endBar}', params: { param: str({ required: true }), points: special('points'), ramp: obj({ from: num(-24000, 24000, { required: true }), to: num(-24000, 24000, { required: true }), startBar: num(0, 999, { default: 0 }), endBar: num(0, 999, { required: true }), steps: int(2, 64, { default: 8 }) }), clear: bool({ desc: 'remove existing points first' }) }, anyOf: ['points', 'ramp'] },

  // wave lab & sample manipulation
  { type: 'manipulateAudio', group: 'Wave Lab', target: 'clip', summary: 'manipulate an audio sample clip\'s sound physics (or place a starter/imported sample onto the timeline with stretch, speed, pitch, reverse, loop points, fades, bitcrush, filter, drive)', params: { sampleId: str({ desc: 'starter:koto-pluck|starter:shakuhachi|starter:temple-bell|starter:cat-meow|starter:taiko-hit|starter:chime-arp|starter:lofi-chord|starter:vinyl-rain or project asset id' }), name: str(), start: num(0, 999, { default: 0 }), length: num(0.25, 256), stretch: num(0.25, 4, { default: 1 }), speed: num(0.25, 4, { default: 1 }), pitchSemis: int(-24, 24, { default: 0 }), fineCents: int(-100, 100, { default: 0 }), reverse: bool(), loop: bool(), loopStart: num(0, 600), loopEnd: num(0, 600), pingPong: bool(), fadeIn: num(0, 15), fadeOut: num(0, 15), gain: num(0, 3), normalize: bool(), lowpass: num(60, 20000), highpass: num(20, 8000), drive: num(0, 1), bitcrush: int(4, 16), downsample: int(1, 32), ringModHz: num(0, 1200), tremoloRate: num(0, 24), echoDelay: num(0, 0.6) }, aliases: { pitch: 'pitchSemis', semitones: 'pitchSemis', assetId: 'sampleId' } },
  { type: 'createSamplerTrack', group: 'Wave Lab', target: 'none', summary: 'create a playable chromatic sampler instrument track from any sample (with optional physics & starter melody phrase)', params: { sampleId: str({ default: 'starter:koto-pluck', desc: 'starter:* or project asset id' }), name: str(), rootMidi: int(24, 96, { default: 60 }), stretch: num(0.25, 4), speed: num(0.25, 4), pitchSemis: int(-24, 24), reverse: bool(), loop: bool(), lowpass: num(60, 20000), drive: num(0, 1), bitcrush: int(4, 16), phrase: CONTENT_FIELDS.phrase }, aliases: { assetId: 'sampleId' } },

  // sound design
  { type: 'addSfx', group: 'Sound design', target: 'none', summary: 'new SFX patch (optionally from a template); becomes the sfx "selection"', params: { name: str(), template: str({ desc: 'starter template id, see SFX TEMPLATES' }), category: str(), tags: special('array'), gain: num(0, 2), gameHook: str({ desc: 'game AudioManager method it replaces, e.g. playMeow' }), variation: special('object'), fx: special('object'), layers: special('layers') } },
  { type: 'updateSfx', group: 'Sound design', target: 'sfx', summary: 'edit an SFX patch: layers replaces all layers; layerEdits [{index, ...fields}] merges; addLayers appends; removeLayers [index]', params: { name: str(), category: str(), tags: special('array'), gain: num(0, 2), gameHook: str(), variation: special('object'), fx: special('object'), layers: special('layers'), layerEdits: special('array'), addLayers: special('layers'), removeLayers: special('array') } },
  { type: 'deleteSfx', group: 'Sound design', target: 'sfx', summary: 'delete an SFX patch (only when asked)', params: {} },
  { type: 'placeSfx', group: 'Sound design', target: 'sfx', summary: 'put an SFX patch on the timeline (new "SFX" track unless trackId given)', params: { trackId: str(), start: num(0, 999, { default: 0, desc: 'bars' }), gain: num(0, 2) } }
];

const BY_TYPE = new Map(ACTIONS.map((a) => [a.type, a]));
export const SUPPORTED_AGENT_ACTIONS = new Set(BY_TYPE.keys());

const squash = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9#]/g, '');
const TYPE_LOOKUP = new Map(ACTIONS.map((a) => [squash(a.type), a.type]));

/* ---------------- docs + JSON schema ---------------- */

function describeField(name, spec) {
  let t;
  switch (spec.type) {
    case 'number': case 'integer': t = `${spec.min}..${spec.max}`; break;
    case 'enum': t = spec.values.join('|'); break;
    case 'object': t = spec.fields ? `{${Object.entries(spec.fields).map(([k, s]) => describeField(k, s)).join(', ')}}` : '{…}'; break;
    default: t = spec.desc ? '' : spec.type;
  }
  const bits = [t, spec.desc && spec.type !== 'enum' ? spec.desc : '', spec.default !== undefined ? `=${spec.default}` : ''].filter(Boolean).join(' ');
  return `${name}${spec.required ? '*' : ''}${bits ? ': ' + bits : ''}`;
}

export const ACTION_GROUPS = [...new Set(ACTIONS.map((a) => a.group))];

/* Human-readable action reference for the system prompt, grouped. `*` marks
   required params, `=x` defaults. `groups` limits it to some groups, which
   keeps the prompt small for local models with short context windows. */
export function actionReference({ groups: only } = {}) {
  const groups = new Map();
  for (const a of ACTIONS) {
    if (only && !only.includes(a.group)) continue;
    if (!groups.has(a.group)) groups.set(a.group, []);
    const params = Object.entries(a.params).map(([k, s]) => describeField(k, s)).join('; ');
    const target = { none: '', track: ' [target: track]', clip: ' [target: "trackId:clipId"]', sfx: ' [target: sfx id]' }[a.target];
    groups.get(a.group).push(`- ${a.type}${target} {${params}} — ${a.summary}${a.anyOf ? ` (needs ${a.anyOf.join(' or ')})` : ''}`);
  }
  return [...groups].map(([g, lines]) => `${g}:\n${lines.join('\n')}`).join('\n');
}

/* Kept intentionally loose (params is any object) — strict per-action schemas
   blow up llama.cpp's grammar conversion and OpenAI's strict mode alike, and
   validatePlan() checks params properly anyway. */
export function planJsonSchema() {
  return {
    type: 'object',
    properties: {
      reply: { type: 'string' },
      summary: { type: 'string' },
      actions: {
        type: 'array',
        maxItems: MAX_ACTIONS,
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ACTIONS.map((a) => a.type) },
            target: { type: 'string' },
            params: { type: 'object' }
          },
          required: ['type', 'params']
        }
      },
      caveats: { type: 'array', items: { type: 'string' } }
    },
    required: ['actions']
  };
}

/* ---------------- JSON extraction ---------------- */

function codedError(message, code, extra = {}) {
  const err = new Error(message);
  err.code = code;
  Object.assign(err, extra);
  return err;
}

/* Removes // and /* *\/ comments and trailing commas outside of string
   literals — the two most common ways local models break otherwise-valid JSON. */
function looseClean(text) {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
      out += text.slice(i, j + 1);
      i = j;
    } else if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
    } else if (c === '/' && text[i + 1] === '*') {
      i = text.indexOf('*/', i + 2);
      if (i < 0) break;
      i++;
    } else {
      out += c;
    }
  }
  return out.replace(/,(\s*[}\]])/g, '$1');
}

/* Every balanced top-level {...} span (string-aware). `open` is true when the
   text ends inside an object that never closed — i.e. it was truncated. */
function objectSpans(text) {
  const spans = [];
  let depth = 0, start = -1, inStr = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) { if (c === '\\') i++; else if (c === '"') inStr = false; continue; }
    if (c === '"') { if (depth > 0) inStr = true; continue; }
    if (c === '{') { if (depth === 0) start = i; depth++; }
    else if (c === '}' && depth > 0) { depth--; if (depth === 0) spans.push(text.slice(start, i + 1)); }
  }
  return { spans, open: depth > 0 };
}

function tryParse(text) {
  try { return { ok: true, value: JSON.parse(text) }; } catch { /* fall through */ }
  try { return { ok: true, value: JSON.parse(looseClean(text)) }; } catch { return { ok: false }; }
}

/* Pulls the plan object out of whatever the model wrote: strips <think>
   blocks and code fences, tolerates prose around the JSON, repairs comments
   and trailing commas. Throws err.code 'truncated' (JSON began but never
   closed) or 'no-json' (prose only, with err.prose holding the text). */
export function extractJson(text) {
  const withoutThinking = String(text ?? '')
    .replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '')
    .replace(/^\s*<think(?:ing)?>[\s\S]*$/i, '');
  const trimmed = withoutThinking.trim();
  const direct = tryParse(trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
  if (direct.ok && direct.value && typeof direct.value === 'object') return direct.value;

  const fenced = [...trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((m) => m[1]);
  for (const block of fenced) {
    const r = tryParse(block.trim());
    if (r.ok && r.value && typeof r.value === 'object') return r.value;
  }

  const { spans, open } = objectSpans(trimmed);
  const parsed = spans.map(tryParse).filter((r) => r.ok && r.value && typeof r.value === 'object').map((r) => r.value);
  const best = parsed.find((v) => Array.isArray(v.actions) || typeof v.reply === 'string') || parsed[0];
  if (best) return best;
  if (open) throw codedError('The model\'s JSON was cut off before it finished', 'truncated');
  if (!trimmed) throw codedError('The model returned an empty response', 'empty');
  throw codedError('The model answered in prose instead of a JSON plan', 'no-json', { prose: trimmed });
}

/* ---------------- validation ---------------- */

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

function suggestType(raw) {
  const s = squash(raw);
  let best = null, bestD = Infinity;
  for (const a of ACTIONS) {
    const d = levenshtein(s, squash(a.type));
    if (d < bestD) { bestD = d; best = a.type; }
  }
  return bestD <= Math.max(3, Math.floor(s.length / 3)) ? best : null;
}

function resolveType(raw) {
  const s = squash(raw);
  if (TYPE_LOOKUP.has(s)) return TYPE_LOOKUP.get(s);
  return null;
}

const NOTE_ALIASES = { pitch: 'note', name: 'note', time: 'start', beat: 'start', at: 'start', dur: 'len', duration: 'len', length: 'len', velocity: 'vel', v: 'vel' };

function checkNotes(value, path, errors) {
  if (!Array.isArray(value)) { errors.push(`${path}: expected an array of notes like ${NOTES_DESC}`); return undefined; }
  const out = [];
  value.forEach((raw, j) => {
    const p = `${path}[${j}]`;
    if (typeof raw === 'string' || typeof raw === 'number') raw = { note: raw };
    if (Array.isArray(raw)) raw = { note: raw[0], start: raw[1], len: raw[2], vel: raw[3] };
    if (!raw || typeof raw !== 'object') { errors.push(`${p}: expected a note object`); return; }
    const n = {};
    for (const [k, v] of Object.entries(raw)) n[NOTE_ALIASES[k] || k] = v;
    const pitch = n.note ?? n.midi;
    try {
      const midi = parseNote(pitch);
      const start = Number(n.start ?? 0), len = Number(n.len ?? 0.5), vel = Number(n.vel ?? 0.8);
      out.push({
        midi,
        start: Number.isFinite(start) ? Math.max(0, start) : 0,
        len: Number.isFinite(len) ? Math.min(64, Math.max(0.03, len)) : 0.5,
        vel: Number.isFinite(vel) ? Math.min(1, Math.max(0, vel > 1 ? vel / 127 : vel)) : 0.8
      });
    } catch (err) {
      errors.push(`${p}: ${err.message}`);
    }
  });
  return out;
}

function checkChords(value, path, errors) {
  const list = typeof value === 'string' ? value.split(/[\s,|]+/).filter(Boolean) : value;
  if (!Array.isArray(list) || !list.length) { errors.push(`${path}: expected chord symbols like ["Cmaj7","Am7"] or "I vi IV V"`); return undefined; }
  const out = [];
  list.forEach((c, j) => {
    try { parseChordOrRoman(String(c), 'C', 'major'); out.push(String(c)); }
    catch (err) { errors.push(`${path}[${j}]: ${err.message}`); }
  });
  return out;
}

function checkField(spec, value, path, errors) {
  switch (spec.type) {
    case 'number': case 'integer': {
      const n = typeof value === 'boolean' ? NaN : Number(value);
      if (!Number.isFinite(n)) { errors.push(`${path}: expected a number ${spec.min}..${spec.max}, got ${JSON.stringify(value)}`); return undefined; }
      const v = Math.min(spec.max, Math.max(spec.min, spec.type === 'integer' ? Math.round(n) : n));
      return v;
    }
    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (value === 'true' || value === 1) return true;
      if (value === 'false' || value === 0) return false;
      errors.push(`${path}: expected true or false`); return undefined;
    case 'string':
      if (value == null || typeof value === 'object') { errors.push(`${path}: expected text`); return undefined; }
      return String(value).slice(0, 200);
    case 'enum': {
      const s = squash(value);
      const hit = spec.values.find((v) => squash(v) === s) || (spec.aliases && spec.aliases[s]);
      if (!hit) { errors.push(`${path}: "${value}" is not one of ${spec.values.join(', ')}`); return undefined; }
      return hit;
    }
    case 'key':
      try { return NOTE_NAMES[keyIndex(value)]; }
      catch (err) { errors.push(`${path}: ${err.message}`); return undefined; }
    case 'color':
      if (/^#[0-9a-f]{6}$/i.test(String(value))) return String(value);
      errors.push(`${path}: expected a colour like "#7c5ce6"`); return undefined;
    case 'object':
      if (!value || typeof value !== 'object' || Array.isArray(value)) { errors.push(`${path}: expected an object`); return undefined; }
      if (!spec.fields) return value;
      return checkParams(spec.fields, value, path, errors, {});
    case 'array':
      if (!Array.isArray(value)) { errors.push(`${path}: expected an array`); return undefined; }
      return value;
    case 'layers':
      if (!Array.isArray(value) || value.some((l) => !l || typeof l !== 'object')) { errors.push(`${path}: expected an array of layer objects`); return undefined; }
      return value;
    case 'notes': return checkNotes(value, path, errors);
    case 'chords': return checkChords(value, path, errors);
    case 'phrase':
      try { parsePhrase(value); return String(value); }
      catch (err) { errors.push(`${path}: ${err.message}`); return undefined; }
    case 'degrees': {
      const list = typeof value === 'string' ? value.split(/[\s,]+/).filter(Boolean) : value;
      try { degreesToMidi(Array.isArray(list) ? list : [list], 'C', 'major', 4); return list; }
      catch (err) { errors.push(`${path}: ${err.message}`); return undefined; }
    }
    case 'grid':
      if (!value || typeof value !== 'object' || Array.isArray(value)) { errors.push(`${path}: expected {lane:"x...x..."} with lanes ${DRUM_LANE_IDS.join(', ')}`); return undefined; }
      try { parseStepGrid(value); return value; }
      catch (err) { errors.push(`${path}: ${err.message}`); return undefined; }
    case 'groove': {
      const hit = Object.keys(GROOVES).find((g) => squash(g) === squash(value));
      if (!hit) { errors.push(`${path}: "${value}" is not a groove — use ${Object.keys(GROOVES).join(', ')}`); return undefined; }
      return hit;
    }
    case 'steps':
      if (!value || typeof value !== 'object') { errors.push(`${path}: expected {lane:[[step,vel],…]}`); return undefined; }
      return value;
    case 'points': {
      if (!Array.isArray(value)) { errors.push(`${path}: expected [[beat, value], …]`); return undefined; }
      const out = [];
      value.forEach((pt, j) => {
        const beat = Number(Array.isArray(pt) ? pt[0] : pt && pt.beat);
        const v = Number(Array.isArray(pt) ? pt[1] : pt && pt.value);
        if (!Number.isFinite(beat) || !Number.isFinite(v)) errors.push(`${path}[${j}]: expected [beat, value]`);
        else out.push([Math.max(0, beat), v]);
      });
      return out;
    }
    default:
      return value;
  }
}

function checkParams(fields, raw, path, errors, aliases) {
  const src = {};
  for (const [k, v] of Object.entries(raw || {})) src[aliases[k] || k] = v;
  const out = {};
  for (const [name, spec] of Object.entries(fields)) {
    const value = src[name];
    if (value === undefined || value === null || value === '') {
      if (spec.required) errors.push(`${path}.${name}: required (${describeField(name, spec)})`);
      continue;
    }
    const v = checkField(spec, value, `${path}.${name}`, errors);
    if (v !== undefined) out[name] = v;
  }
  return out;
}

const ACTION_KEYS = new Set(['type', 'action', 'op', 'target', 'params', 'args', 'trackId', 'clipId', 'sfxId']);

function normalizeAction(raw, index, errors) {
  const path = `actions[${index}]`;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { errors.push(`${path}: expected {"type", "target", "params"}`); return null; }
  const rawType = raw.type ?? raw.action ?? raw.op;
  const type = resolveType(rawType);
  if (!type) {
    const hint = suggestType(rawType);
    errors.push(`${path}.type: "${rawType ?? ''}" is not a supported action${hint ? ` — did you mean "${hint}"?` : ''}`);
    return null;
  }
  const def = BY_TYPE.get(type);
  let params = raw.params ?? raw.args;
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    params = {};
    for (const [k, v] of Object.entries(raw)) if (!ACTION_KEYS.has(k)) params[k] = v;
  }
  let target = raw.target;
  if (target == null && raw.trackId) target = raw.clipId ? `${raw.trackId}:${raw.clipId}` : raw.trackId;
  if (target == null && raw.sfxId) target = raw.sfxId;
  const before = errors.length;
  const clean = checkParams(def.params, params, `${path}.params`, errors, def.aliases || {});
  if (def.anyOf && errors.length === before && !def.anyOf.some((k) => clean[k] !== undefined)) {
    errors.push(`${path}.params: needs ${def.anyOf.join(' or ')}`);
  }
  return { type, target: target == null || target === '' ? 'selection' : String(target), params: clean };
}

/* Validates and normalises a raw model response. Returns the cleaned plan
   plus a list of path-specific errors; callers must not apply a plan whose
   errors list is non-empty. */
export function validatePlan(raw) {
  const errors = [];
  let input = raw;
  if (Array.isArray(input)) input = { actions: input };
  if (!input || typeof input !== 'object') {
    return { plan: emptyPlan(), errors: ['Response must be a JSON object with an "actions" array'] };
  }
  if (!Array.isArray(input.actions) && input.plan && Array.isArray(input.plan.actions)) input = { ...input, ...input.plan };
  const reply = typeof input.reply === 'string' ? input.reply.trim() : (typeof input.message === 'string' ? input.message.trim() : '');
  let rawActions = input.actions;
  if (rawActions == null && reply) rawActions = [];
  if (!Array.isArray(rawActions)) {
    return { plan: emptyPlan(reply), errors: ['Response is missing the "actions" array (use [] with a "reply" to just answer)'] };
  }
  if (rawActions.length > MAX_ACTIONS) {
    return { plan: emptyPlan(reply), errors: [`Plan has ${rawActions.length} actions — the limit is ${MAX_ACTIONS}. Combine steps (e.g. addChordProgression instead of many notes) or split the request.`] };
  }
  const actions = rawActions.map((a, i) => normalizeAction(a, i, errors)).filter(Boolean);
  return {
    plan: {
      protocol: PLAN_PROTOCOL_VERSION,
      reply,
      summary: String(input.summary || (actions.length ? 'dawCAT agent plan' : '')).slice(0, 500),
      actions,
      caveats: Array.isArray(input.caveats) ? input.caveats.map(String).slice(0, 12) : []
    },
    errors
  };
}

function emptyPlan(reply = '') {
  return { protocol: PLAN_PROTOCOL_VERSION, reply, summary: '', actions: [], caveats: [] };
}
