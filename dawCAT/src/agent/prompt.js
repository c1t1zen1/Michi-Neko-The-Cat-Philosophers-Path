/* dawCAT — system prompt, modes and context compaction for the AI agent.
   The prompt is assembled per mode so a small local model only reads the
   actions it can use, and the project context is compacted to fit the
   model's window (llama-server reports n_ctx; others use a per-provider
   default). Pure module: no DOM. */
import { actionReference, ACTION_GROUPS } from './schema.js';
import { GROOVES, noteName } from './theory.js';

export const MODES = {
  compose: {
    label: 'Compose',
    hint: 'Write new music — tracks, chords, melodies and grooves built from your prompt.',
    guidance: 'MODE: Compose — write NEW material for the request: add tracks and clips with addChordProgression, phrase melodies and addDrumPattern. Reuse the project key/tempo unless the request implies otherwise. Deliver a complete, loopable cue (usually 4–8 bars) with a sensible mix.',
    groups: ['Project', 'Tracks', 'Clips', 'Compose'],
    chips: [
      'Calm dawn theme: soft pad + koto melody in C pentatonic, 84 BPM, 8 bars',
      'Rainy night lo-fi loop: soft drums, mellow keys and a warm bass',
      'Festival day: taiko groove, bright plucks and a flute-like lead',
      'Tea-house interlude: sparse koto and chimes over a low drone'
    ]
  },
  remix: {
    label: 'Remix',
    hint: 'Rework what is already in the project — reharmonise, re-voice, re-groove, re-mix.',
    guidance: 'MODE: Remix — rework what is already in DAW CONTEXT: replace clip content with setClipNotes, re-voice chords, transposeClip, retune presets, adjust FX and mix. Keep the piece recognisable; avoid piling on unrelated new tracks unless asked.',
    groups: ['Project', 'Tracks', 'Clips', 'Compose'],
    chips: [
      'Make it feel like dusk: darker voicings, a little slower, more reverb',
      'Re-harmonise the chords with 7ths and smoother voice leading',
      'Give the melody more space and variation in the second half',
      'Turn this into a minimal night version'
    ]
  },
  sfx: {
    label: 'Sound Design',
    hint: 'Design procedural sound effects — footsteps, UI blips, cat sounds, magic, water.',
    guidance: 'MODE: Sound Design — create or edit SFX patches with addSfx / updateSfx (edit the selected SFX in CONTEXT when the request refers to "this sound"). Build each sound from layers: a transient (attack/click), a body (tone or filtered noise) and a tail. When a sound repeats in play (footsteps, UI, pickups) make 2–4 distinct variations as separate patches. Use placeSfx only when asked to put sounds on the timeline.',
    groups: ['Sound design'],
    chips: [
      'Soft paw steps on a wooden floor — 4 variations',
      'Magical sparkle for picking up a glowing leaf',
      'Happy little cat chirp greeting',
      'Gentle sliding shoji door',
      'UI confirm and back blips that match the game'
    ]
  },
  mix: {
    label: 'Mix',
    hint: 'Balance, EQ, compression, space and automation — notes stay untouched.',
    guidance: 'MODE: Mix — balance and polish without changing notes: setTrackMix, setDeviceParams (eq8 high-pass around 120–200 Hz on non-bass tracks, gentle comp, reverb/delay), sends, setMaster and addAutomation for fades and filter sweeps. Keep the overall level relaxed (master ≤ 0.9).',
    groups: ['Project', 'Tracks', 'Compose'],
    chips: [
      'Balance the levels and add gentle glue compression',
      'Clean up the low end and add space with reverb',
      'Add a slow filter-sweep intro over the first 4 bars',
      'Make the whole mix softer and more relaxed'
    ]
  },
  ask: {
    label: 'Ask',
    hint: 'Ask anything — music theory, the project, game audio, how dawCAT works. Nothing changes.',
    guidance: 'MODE: Ask — answer in "reply" (plain text, concise, specific to this project and game) and return "actions": [] unless the user explicitly asks you to change something.',
    groups: [],
    chips: [
      'What key and scale would suit the dusk theme?',
      'Describe what is in this project in musical terms',
      'How do I get this music and these sounds into the game?',
      'Give me three ideas for a shrine ambience'
    ]
  },
  free: {
    label: 'Free',
    hint: 'Anything goes — tweak, compose, remix or design sounds, exactly as asked.',
    guidance: 'MODE: Free — do exactly what the request asks, using any actions.',
    groups: ACTION_GROUPS,
    chips: [
      'Set tempo to 90 and add light swing',
      'Duplicate the drum clip to fill 8 bars',
      'Rename the tracks to describe their role'
    ]
  }
};

export const MODE_IDS = Object.keys(MODES);

const CONTRACT = `RESPONSE CONTRACT
Reply with ONE JSON object and nothing else — no markdown fences, no prose outside the JSON:
{"reply":"optional short message to the user","summary":"one line: what you changed","actions":[{"type":"…","target":"…","params":{…}}],"caveats":["optional"]}
- Actions apply automatically and atomically when you answer; the user can undo the whole plan in one step.
- To answer a question or ask for clarification, return "actions": [] with a "reply".
- Use only the actions listed. Never output JavaScript, audio data or shell commands.
- Targets: "selection" = the track (or SFX) created/targeted most recently in this plan, else the user's current selection. Otherwise use real ids from DAW CONTEXT: a track id, "trackId:clipId" for a clip, or an SFX id.
- Time: clip start/length are BARS (4/4). Note start/len are BEATS from the clip start.
- Prefer a few high-level actions: addChordProgression and phrase notation beat dozens of raw notes.
- Don't delete tracks, clips or SFX unless asked (replacing a clip's content in a remix is fine).`;

const NOTATION = `NOTATION
- Notes: "C4" is middle C (MIDI 60); sharps/flats like "F#3", "Bb4".
- phrase: notes in sequence as note/duration@velocity, e.g. "E5/1 G5/.5 r/.5 [C5 E5]/2@0.6". Durations in beats or w h q e s (q. = dotted); r = rest; an omitted duration repeats the previous one.
- Chords: symbols (C, Am7, Fmaj7, G7sus4, Bbadd9, D/F#) or roman numerals in the project key (I, vi7, ii7, V7, bVII).
- Drum grid: one 16-character string per lane per bar — x accent, o hit, g ghost, . rest. Lanes: kick snare clap hatC hatO tom rim perc.
- Grooves: ${Object.keys(GROOVES).join(', ')}.`;

const CRAFT = `CRAFT (Michi-Neko is a calm, painterly exploration game: a philosopher cat wandering Kyoto — no combat, no timers)
- Ranges: bass C1–E3, pad C3–E5, keys C3–C6, pluck G3–G6, lead C4–E6, chime C5–E7.
- Moods: dawn = sparse, bright, pentatonic major, slow attacks; day = gentle motion, light percussion; dusk = warmer, dorian/minor, longer reverb; night = minimal, low, hirajoshi or in sen, long releases. Shrines/tea house: koto-like plucks, chimes, soft pads, a drone. Calm cues sit around 60–100 BPM.
- Mix gently: track volume 0.5–0.8, master ≤ 0.9, reverb send a for space, delay send b sparingly.
- Loops must be seamless: content a whole number of bars, loop: true.`;

const SFX_GUIDE = `SOUND DESIGN — procedural SFX patches (no samples)
patch = {name, category, gain, gameHook?, variation:{pitch:cents, time:0-1, gain:0-1}, fx:{lowpass:Hz, highpass:Hz, reverb:0-1, reverbTime:s, drive:0-1}, layers:[layer…]}
layer = {kind:"tone"|"noise"|"fm"|"pluck", wave:"sine|triangle|sawtooth|square", freq:Hz, freqEnd:Hz (pitch sweep target), sweep:"exp"|"lin", sweepTime:s, fmRatio, fmDepth (fm), noiseColor:"white|pink|brown" (noise), filter:{type:"lowpass|highpass|bandpass|notch|off", freq, freqEnd, q}, env:{attack, hold, decay, sustain 0-1, release} in seconds, start:s, gain:0-1, pan:-1..1, repeat:{count, interval:s, pitchStep:semitones, gainStep:0-1}, vibrato:{rate:Hz, depth:cents}}
Recipes: footstep = lowpassed noise burst (400–900 Hz, 40–90 ms) + a soft low tone thump; sparkle/collect = bright sine arpeggio via repeat (pitchStep 3–5, interval 0.05–0.08 s); meow = triangle/saw 500→800→450 Hz with vibrato and a bandpass around 1.2 kHz; water drop = sine with a fast downward sweep; UI click = 2–6 ms noise or a 1–3 kHz sine tick; bell/gong = fm with a non-integer fmRatio (1.4–3.5) and a long decay; wind = brown/pink noise with a slow filter sweep.
Keep SFX short (UI 0.05–0.3 s, foley 0.1–0.8 s, stingers ≤ 3 s) and layer gains summing to ≤ 1.`;

const EXAMPLE = `EXAMPLE
User: "add a soft dawn pad and a koto melody in C pentatonic"
{"summary":"Dawn pad + koto melody in C major pentatonic","actions":[
{"type":"setKeyScale","params":{"key":"C","scale":"pentatonic major"}},
{"type":"addTrack","params":{"name":"Dawn Pad","kind":"synth","preset":"pad"}},
{"type":"addChordProgression","target":"selection","params":{"chords":"Cadd9 Am7 Fmaj7 G","beatsPerChord":4,"octave":3,"loop":true}},
{"type":"setTrackMix","target":"selection","params":{"volume":0.55,"sends":{"a":0.35}}},
{"type":"addTrack","params":{"name":"Koto","kind":"synth","preset":"pluck"}},
{"type":"addClip","target":"selection","params":{"start":0,"length":4,"loop":true,"phrase":"E5/1 G5/.5 A5/.5 C6/1 r/1 A5/.5 G5/.5 E5/1 D5/1 r/2 C5/1 D5/1 E5/2 r/3"}}]}`;

/* System prompt for a mode. `sfxTemplates` lists starter template ids for
   addSfx (injected so this module needn't import the SFX subsystem). */
export function buildSystemPrompt(mode, { sfxTemplates = [] } = {}) {
  const m = MODES[mode] || MODES.free;
  const parts = [
    'You are dawCAT\'s audio assistant for the game "Michi-Neko: The Cat Philosopher\'s Path". You design its game audio — music cues, sound effects and ambience — inside the dawCAT browser DAW, by returning a JSON plan of editor actions.',
    CONTRACT
  ];
  if (m.groups.length) parts.push(`ACTIONS (* = required, =x default)\n${actionReference({ groups: m.groups })}`);
  else parts.push('ACTIONS: none needed in this mode unless the user explicitly asks for a change — then any dawCAT action applies (tracks, clips, chords, drums, mix, SFX).');
  if (m.groups.some((g) => g !== 'Sound design')) parts.push(NOTATION, CRAFT);
  if (m.groups.includes('Sound design')) parts.push(SFX_GUIDE + (sfxTemplates.length ? `\nTemplates for addSfx.template: ${sfxTemplates.join(', ')}` : ''));
  if (m.groups.includes('Compose')) parts.push(EXAMPLE);
  parts.push(m.guidance);
  return parts.join('\n\n');
}

/* ---------------- context compaction ---------------- */

const stepChar = (v) => (v >= 0.85 ? 'x' : v >= 0.45 ? 'o' : v > 0 ? 'g' : '.');
const r3 = (v) => Math.round(Number(v) * 1000) / 1000;

function gridFromSteps(steps) {
  const grid = {};
  for (const [lane, hits] of Object.entries(steps || {})) {
    const cells = new Array(16).fill('.');
    if (Array.isArray(hits) && hits.length && Array.isArray(hits[0])) {
      for (const [i, v] of hits) if (i >= 0 && i < 16) cells[i] = stepChar(v);
    } else if (Array.isArray(hits)) {
      hits.forEach((v, i) => { if (i < 16) cells[i] = stepChar(v); });
    }
    if (cells.some((c) => c !== '.')) grid[lane] = cells.join('');
  }
  return grid;
}

function compactClip(clip, detail) {
  const base = { id: clip.id, name: clip.name, start: clip.start, length: clip.length };
  if (clip.loop) { base.loop = true; base.loopLen = clip.loopLen; }
  if (clip.sample) base.sample = clip.sample;
  const notes = clip.notes || [];
  if (detail === 'minimal') {
    if (notes.length) base.noteCount = notes.length;
    if (clip.steps) base.hits = Object.values(gridFromSteps(clip.steps)).join('').replace(/\./g, '').length;
    return base;
  }
  if (notes.length) {
    const cap = detail === 'full' ? 96 : 48;
    if (detail === 'full') base.notes = notes.slice(0, cap).map((n) => ({ note: noteName(n.midi), start: r3(n.start), len: r3(n.len), vel: r3(n.vel) }));
    else base.notes = notes.slice(0, cap).map((n) => `${noteName(n.midi)}@${r3(n.start)}:${r3(n.len)}`).join(' ');
    if (notes.length > cap) base.notesTruncated = notes.length - cap;
  }
  if (clip.steps) base.grid = gridFromSteps(clip.steps);
  return base;
}

function compactSfx(patch, full) {
  if (full) return patch;
  return { id: patch.id, name: patch.name, category: patch.category, layers: (patch.layers || []).length, gameHook: patch.gameHook || undefined };
}

/* Shrinks the editor context to a detail level: full (note objects), compact
   (note strings + drum grids), minimal (structure only). */
export function compactContext(context, detail = 'compact') {
  const out = { ...context };
  out.tracks = (context.tracks || []).map((t) => ({ ...t, clips: (t.clips || []).map((c) => compactClip(c, detail)) }));
  const selectedSfx = context.selection && context.selection.sfxId;
  out.sfx = (context.sfx || []).map((p) => compactSfx(p, detail === 'full' ? true : detail === 'compact' && p.id === selectedSfx));
  if (detail === 'minimal' && out.gameCues) out.gameCues = out.gameCues.slice(0, 4);
  return out;
}

export function estimateTokens(text) { return Math.ceil(String(text || '').length / 3.5); }

/* Picks the richest detail level that fits ~45% of the context window
   (the rest is system prompt, history and the reply). */
export function chooseDetail(fullChars, nCtx) {
  const budget = (nCtx || 8192) * 3.5 * 0.45;
  if (fullChars <= budget) return 'full';
  if (fullChars * 0.4 <= budget) return 'compact';
  return 'minimal';
}

export function buildUserMessage({ prompt, context, mode, detail }) {
  const label = (MODES[mode] || MODES.free).label;
  return `[${label} mode] USER REQUEST:\n${String(prompt || '').trim()}\n\nDAW CONTEXT (${detail || 'compact'} detail):\n${JSON.stringify(context)}`;
}
