/* dawCAT — music-theory helpers for the AI agent. Language models are poor at
   MIDI arithmetic but fluent in musical notation, so the agent is allowed to
   write "Cmaj7", "ii7", "E5/1 G5/.5" or "x...x..." and these functions do the
   arithmetic. Pure functions, no DOM — runs in the browser and under Node. */
import { SCALES, NOTE_NAMES } from '../state.js';

export { SCALES, NOTE_NAMES };

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/* Pitch class of a key name like "C", "F#", "Bb" (case-insensitive). */
export function keyIndex(key) {
  const m = /^\s*([A-Ga-g])([#b♯♭]?)\s*$/.exec(String(key ?? ''));
  if (!m) throw new Error(`"${key}" is not a key — use C, C#, Db, D … B`);
  let pc = PC[m[1].toUpperCase()];
  if (m[2] === '#' || m[2] === '♯') pc += 1;
  if (m[2] === 'b' || m[2] === '♭') pc -= 1;
  return ((pc % 12) + 12) % 12;
}

export function noteName(midi) {
  return NOTE_NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
}

/* "C4" → 60 (C4 is middle C), "eb3" → 51, "Bb-1" → 10, 61 → 61, "64" → 64. */
export function parseNote(value) {
  if (typeof value === 'number' || (typeof value === 'string' && /^\s*\d+(\.\d+)?\s*$/.test(value))) {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n) || n < 0 || n > 127) throw new Error(`MIDI note ${value} is out of range (0–127)`);
    return n;
  }
  const m = /^\s*([A-Ga-g])([#b♯♭]{0,2})(-?\d{1,2})\s*$/.exec(String(value ?? ''));
  if (!m) throw new Error(`"${value}" is not a note — use a name like C4, F#3 or Bb5, or a MIDI number 0–127`);
  let pc = PC[m[1].toUpperCase()];
  for (const acc of m[2]) pc += acc === '#' || acc === '♯' ? 1 : -1;
  const midi = pc + (parseInt(m[3], 10) + 1) * 12;
  if (midi < 0 || midi > 127) throw new Error(`Note ${value} is out of range (C-1 to G9)`);
  return midi;
}

/* ---------------- chords ---------------- */

// Longest tokens first so "maj7" wins over "m", "m7b5" over "m7", etc.
const CHORD_QUALITIES = [
  ['maj13', [0, 4, 7, 11, 14, 21]], ['maj9', [0, 4, 7, 11, 14]], ['maj7', [0, 4, 7, 11]], ['M7', [0, 4, 7, 11]], ['Δ7', [0, 4, 7, 11]], ['Δ', [0, 4, 7, 11]],
  ['m7b5', [0, 3, 6, 10]], ['ø7', [0, 3, 6, 10]], ['ø', [0, 3, 6, 10]],
  ['dim7', [0, 3, 6, 9]], ['°7', [0, 3, 6, 9]], ['dim', [0, 3, 6]], ['°', [0, 3, 6]],
  ['mmaj7', [0, 3, 7, 11]], ['m13', [0, 3, 7, 10, 14, 21]], ['m11', [0, 3, 7, 10, 14, 17]], ['m9', [0, 3, 7, 10, 14]], ['m7', [0, 3, 7, 10]], ['m6', [0, 3, 7, 9]],
  ['madd9', [0, 3, 7, 14]], ['min7', [0, 3, 7, 10]], ['min', [0, 3, 7]], ['m', [0, 3, 7]], ['-7', [0, 3, 7, 10]], ['-', [0, 3, 7]],
  ['aug7', [0, 4, 8, 10]], ['aug', [0, 4, 8]], ['+', [0, 4, 8]],
  ['7sus4', [0, 5, 7, 10]], ['sus2', [0, 2, 7]], ['sus4', [0, 5, 7]], ['sus', [0, 5, 7]],
  ['add9', [0, 4, 7, 14]], ['add11', [0, 4, 7, 17]], ['add2', [0, 2, 4, 7]],
  ['13', [0, 4, 7, 10, 14, 21]], ['11', [0, 4, 7, 10, 14, 17]], ['9', [0, 4, 7, 10, 14]], ['7', [0, 4, 7, 10]], ['69', [0, 4, 7, 9, 14]], ['6', [0, 4, 7, 9]],
  ['5', [0, 7]], ['maj', [0, 4, 7]], ['M', [0, 4, 7]], ['', [0, 4, 7]]
];

function qualityIntervals(quality, symbol) {
  for (const [token, intervals] of CHORD_QUALITIES) if (quality === token) return intervals;
  throw new Error(`"${symbol}" is not a chord symbol — try forms like C, Am, F#m7b5, Gsus4, Bbmaj7, C/E`);
}

/* "Cmaj7" at octave 3 → [48, 52, 55, 59]. Slash chords put the named bass
   lowest: chord tones that are the bass move it to the bottom (an inversion);
   a non-chord bass is added below the chord. */
export function parseChord(symbol, octave = 3) {
  const text = String(symbol ?? '').trim();
  const m = /^([A-Ga-g])([#b♯♭]?)([^/]*)(?:\/([A-Ga-g][#b♯♭]?))?$/.exec(text);
  if (!m) throw new Error(`"${symbol}" is not a chord symbol — try forms like C, Am, F#m7b5, Gsus4, Bbmaj7, C/E`);
  const rootPc = keyIndex(m[1] + m[2]);
  const intervals = qualityIntervals(m[3].trim(), symbol);
  const base = (octave + 1) * 12 + rootPc;
  let notes = intervals.map((i) => base + i);
  if (m[4]) {
    const bassPc = keyIndex(m[4]);
    const idx = notes.findIndex((n) => n % 12 === bassPc);
    if (idx >= 0) {
      const bass = notes[idx];
      notes = notes.map((n) => (n < bass ? n + 12 : n)).sort((a, b) => a - b);
    } else {
      let bass = (octave + 1) * 12 + bassPc;
      while (bass >= notes[0]) bass -= 12;
      notes = [bass, ...notes];
    }
  }
  return notes.filter((n) => n >= 0 && n <= 127);
}

/* ---------------- roman numerals ---------------- */

const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7 };
const MINORISH = new Set(['minor', 'dorian', 'pentatonic minor', 'hirajoshi', 'in sen']);

/* Seven-note scale to resolve numerals against: the project scale if it has
   seven notes, else major or natural minor depending on its colour. */
function heptatonic(scale) {
  const s = SCALES[scale];
  if (s && s.length === 7) return s;
  return MINORISH.has(scale) ? SCALES.minor : SCALES.major;
}

/* "ii7" in C major → Dm7 [50, 53, 57, 60]. Upper case = major, lower = minor,
   °/o/dim = diminished, ø = half-diminished, + = augmented; 7 on an upper-case
   numeral is dominant, "maj7" is major seventh. */
export function parseRoman(numeral, key = 'C', scale = 'major', octave = 3) {
  const text = String(numeral ?? '').trim();
  const m = /^([b#♭♯]?)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(.*)$/.exec(text);
  if (!m || /^[IVXivx]/.test(m[3])) throw new Error(`"${numeral}" is not a roman numeral — use I–VII (major) or i–vii (minor), e.g. ii7, V7, bVII`);
  const degree = ROMAN[m[2].toLowerCase()];
  const upper = m[2] === m[2].toUpperCase();
  let suffix = m[3].trim();
  const steps = heptatonic(scale);
  let pc = keyIndex(key) + steps[degree - 1];
  if (m[1] === 'b' || m[1] === '♭') pc -= 1;
  if (m[1] === '#' || m[1] === '♯') pc += 1;
  pc = ((pc % 12) + 12) % 12;
  let quality;
  if (/^(°|o|dim)/.test(suffix)) { quality = /7/.test(suffix) ? 'dim7' : 'dim'; suffix = ''; }
  else if (/^ø/.test(suffix)) { quality = 'm7b5'; suffix = ''; }
  else if (/^\+/.test(suffix)) { quality = 'aug'; suffix = suffix.slice(1); }
  else if (/^maj7/.test(suffix)) { quality = upper ? 'maj7' : 'mmaj7'; suffix = suffix.slice(4); }
  else quality = upper ? '' : 'm';
  if (suffix) {
    // Remaining extension (7, 9, sus4, add9 …) layered on the base quality.
    const combined = quality === 'm' ? `m${suffix}` : suffix;
    quality = CHORD_QUALITIES.some(([t]) => t === combined) ? combined : null;
    if (quality == null) throw new Error(`"${numeral}" has an unknown chord suffix "${m[3]}"`);
  }
  const base = (octave + 1) * 12 + pc;
  return qualityIntervals(quality, numeral).map((i) => base + i);
}

/* Chord symbol ("Am7") or roman numeral ("vi7", "bVII"). A token is a numeral
   when, after an optional accidental, it starts with I/V — no chord root does. */
export function isRomanNumeral(token) {
  return /^[b#♭♯]?[IViv]/.test(String(token ?? '').trim());
}

export function parseChordOrRoman(token, key = 'C', scale = 'major', octave = 3) {
  return isRomanNumeral(token) ? parseRoman(token, key, scale, octave) : parseChord(token, octave);
}

/* ---------------- voice leading ---------------- */

function movement(prev, next) {
  const a = [...prev].sort((x, y) => x - y);
  const b = [...next].sort((x, y) => x - y);
  return b.reduce((s, m, j) => s + Math.abs(m - a[Math.min(j, a.length - 1)]), 0);
}

function inversions(chord) {
  const sorted = [...chord].sort((a, b) => a - b);
  const out = [];
  let cur = sorted;
  for (let i = 0; i < sorted.length; i++) {
    for (const shift of [-12, 0, 12]) out.push(cur.map((n) => n + shift));
    cur = [...cur.slice(1), cur[0] + 12];
  }
  return out;
}

/* Re-voices each chord (inversions / octave shifts) to minimise how far the
   voices move from the previous chord, with a gentle pull back toward the
   first chord's register so a long progression does not drift away. */
export function voiceLead(chords) {
  if (!chords.length) return [];
  const out = [[...chords[0]].sort((a, b) => a - b)];
  const centre = out[0].reduce((s, n) => s + n, 0) / out[0].length;
  for (let i = 1; i < chords.length; i++) {
    let best = null, bestCost = Infinity;
    for (const cand of inversions(chords[i])) {
      if (cand[0] < 24 || cand[cand.length - 1] > 108) continue;
      const mean = cand.reduce((s, n) => s + n, 0) / cand.length;
      const cost = movement(out[i - 1], cand) + Math.abs(mean - centre) * 0.5;
      if (cost < bestCost) { bestCost = cost; best = cand; }
    }
    out.push(best || [...chords[i]]);
  }
  return out;
}

/* ---------------- phrases ---------------- */

const LETTER_DUR = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25, t: 0.125 };

function parseDur(text, token) {
  const m = /^([whqest])(\.?)$/.exec(text);
  if (m) return LETTER_DUR[m[1]] * (m[2] ? 1.5 : 1);
  const n = Number(text);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`"${token}" has a bad duration "${text}" — use beats (1, .5, 2) or w/h/q/e/s (q. = dotted)`);
  return n;
}

function parseVel(text, token) {
  const n = Number(text);
  if (!Number.isFinite(n) || n < 0) throw new Error(`"${token}" has a bad velocity "${text}" — use 0–1`);
  return Math.min(1, n > 1 ? n / 127 : n);
}

/* "E5/1 G5/.5 r/.5 A5/2@0.6 [C4 E4 G4]/h" → sequential notes. Duration in
   beats (or w h q e s, dotted with "."), carried over when omitted; "r" is a
   rest; "@v" sets velocity; [..] stacks a chord; "|" and "," are ignored. */
export function parsePhrase(phrase, { start = 0, vel = 0.8 } = {}) {
  const tokens = String(phrase ?? '').match(/\[[^\]]*\](?:\/[^\s,|@]+)?(?:@[\d.]+)?|[^\s,|]+/g) || [];
  const notes = [];
  let t = start;
  let dur = 1;
  for (const token of tokens) {
    const m = /^(\[[^\]]*\]|[^/@]+)(?:\/([^@]+))?(?:@([\d.]+))?$/.exec(token);
    if (!m) throw new Error(`Phrase token "${token}" is not note/duration@velocity`);
    if (m[2] != null) dur = parseDur(m[2], token);
    const v = m[3] != null ? parseVel(m[3], token) : vel;
    const head = m[1];
    if (/^(r|rest|-|_)$/i.test(head)) { t += dur; continue; }
    const pitches = head.startsWith('[') ? head.slice(1, -1).split(/[\s,]+/).filter(Boolean) : [head];
    for (const p of pitches) {
      let midi;
      try { midi = parseNote(p); } catch (err) { throw new Error(`Phrase token "${token}": ${err.message}`); }
      notes.push({ midi, start: round(t), len: dur, vel: v });
    }
    t += dur;
  }
  return notes;
}

function round(v) { return Math.round(v * 10000) / 10000; }

/* ---------------- scale degrees ---------------- */

/* [1, 3, 5, 8] in C major from octave 4 → [60, 64, 67, 72]. Degrees are
   1-based; "b3"/"#4" alter chromatically; -5 is the 5th an octave down;
   "r" / null stay null (a rest). */
export function degreesToMidi(degrees, key = 'C', scale = 'major', octave = 4) {
  const steps = SCALES[scale] || SCALES.major;
  const root = (octave + 1) * 12 + keyIndex(key);
  return degrees.map((d) => {
    if (d == null || /^r(est)?$/i.test(String(d))) return null;
    const m = /^([b#♭♯]*)(-?\d+)$/.exec(String(d).trim());
    if (!m) throw new Error(`"${d}" is not a scale degree — use 1, 3, b7, #4, -5 …`);
    let n = parseInt(m[2], 10);
    if (n === 0) throw new Error('Scale degree 0 does not exist — degrees start at 1');
    let oct = 0;
    if (n < 0) { n = -n; oct = -1; }
    const idx = n - 1;
    oct += Math.floor(idx / steps.length);
    let midi = root + oct * 12 + steps[idx % steps.length];
    for (const acc of m[1]) midi += acc === '#' || acc === '♯' ? 1 : -1;
    if (midi < 0 || midi > 127) throw new Error(`Scale degree ${d} lands outside the MIDI range`);
    return midi;
  });
}

/* ---------------- arpeggios ---------------- */

const ARP_ORDERS = {
  up: (n) => [...Array(n).keys()],
  down: (n) => [...Array(n).keys()].reverse(),
  updown: (n) => (n < 3 ? [...Array(n).keys()] : [...Array(n).keys(), ...[...Array(n - 2).keys()].map((i) => n - 2 - i)]),
  broken: (n) => (n < 3 ? [0, n - 1] : [0, 2, 1, Math.min(3, n - 1) === 3 ? 3 : 2])
};

export const ARP_STYLES = ['block', 'up', 'down', 'updown', 'broken', 'pulse', 'strum', 'random'];

/* Spreads chord tones over `beats`: block (held chord), up/down/updown/broken
   (one tone per `rate` beats), pulse (repeated chord every `rate`), strum
   (held chord, staggered onsets), random (seeded, deterministic). */
export function arpeggiate(chord, { style = 'up', rate = 0.5, beats = 4, start = 0, vel = 0.75, gate = 0.9, seed = 1 } = {}) {
  const notes = [...chord].sort((a, b) => a - b);
  const out = [];
  if (!notes.length) return out;
  if (style === 'block' || !ARP_STYLES.includes(style)) {
    for (const midi of notes) out.push({ midi, start, len: round(beats * 0.95), vel });
    return out;
  }
  if (style === 'strum') {
    notes.forEach((midi, i) => out.push({ midi, start: round(start + i * 0.04), len: round(Math.max(0.1, beats * 0.95 - i * 0.04)), vel }));
    return out;
  }
  const step = Math.max(0.0625, rate);
  const count = Math.max(1, Math.round(beats / step));
  if (style === 'pulse') {
    for (let k = 0; k < count; k++) for (const midi of notes) out.push({ midi, start: round(start + k * step), len: round(step * gate), vel });
    return out;
  }
  let s = seed >>> 0 || 1;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const order = style === 'random' ? null : ARP_ORDERS[style](notes.length);
  for (let k = 0; k < count; k++) {
    const idx = order ? order[k % order.length] : Math.floor(rnd() * notes.length);
    out.push({ midi: notes[idx], start: round(start + k * step), len: round(step * gate), vel });
  }
  return out;
}

/* ---------------- drum grids ---------------- */

export const DRUM_LANE_IDS = ['kick', 'snare', 'clap', 'hatC', 'hatO', 'tom', 'rim', 'perc'];

const LANE_ALIASES = {
  kick: 'kick', bd: 'kick', bass: 'kick', bassdrum: 'kick',
  snare: 'snare', sd: 'snare', sn: 'snare',
  clap: 'clap', cp: 'clap', handclap: 'clap',
  hatc: 'hatC', hat: 'hatC', hh: 'hatC', hihat: 'hatC', closedhat: 'hatC', ch: 'hatC', hats: 'hatC',
  hato: 'hatO', openhat: 'hatO', oh: 'hatO', openhihat: 'hatO',
  tom: 'tom', toms: 'tom', lowtom: 'tom', hitom: 'tom', taiko: 'tom',
  rim: 'rim', rimshot: 'rim', rs: 'rim', sidestick: 'rim', ka: 'rim',
  perc: 'perc', shaker: 'perc', cowbell: 'perc', woodblock: 'perc', bell: 'perc', conga: 'perc'
};

export function laneId(name) {
  const id = LANE_ALIASES[String(name ?? '').toLowerCase().replace(/[^a-z]/g, '')];
  if (!id) throw new Error(`"${name}" is an unknown drum lane — use ${DRUM_LANE_IDS.join(', ')}`);
  return id;
}

const STEP_CHARS = { x: 1, X: 1, o: 0.6, O: 0.6, g: 0.3, '.': 0, '-': 0, _: 0, '0': 0 };

/* { kick: "x...o..." } → { kick: [1,0,0,0,0.6,0,…] } (16 steps, padded).
   x = accent, o = normal, g = ghost, 1–9 = n/9, . - _ 0 = rest; spaces and |
   are ignored. Unknown lanes and characters throw with the lane named. */
export function parseStepGrid(grid) {
  const out = {};
  for (const [name, pattern] of Object.entries(grid || {})) {
    const id = laneId(name);
    const chars = String(pattern ?? '').replace(/[\s|]/g, '');
    const lane = new Array(16).fill(0);
    for (let i = 0; i < Math.min(16, chars.length); i++) {
      const c = chars[i];
      let v = STEP_CHARS[c];
      if (v === undefined && /[1-9]/.test(c)) v = Number(c) / 9;
      if (v === undefined) throw new Error(`Drum lane "${name}" has an unknown step "${c}" — use x (accent), o (hit), g (ghost), . (rest)`);
      lane[i] = round(v);
    }
    out[id] = out[id] ? out[id].map((v, i) => Math.max(v, lane[i])) : lane;
  }
  return out;
}

/* Named one-bar grooves (16 sixteenth steps). Swing is applied separately by
   the project's groove setting, so these are written straight. */
export const GROOVES = {
  'four-on-floor': { kick: 'x...x...x...x...', clap: '....x.......x...', hatC: '..x...x...x...x.' },
  backbeat: { kick: 'x.......x.x.....', snare: '....x.......x...', hatC: 'x.o.x.o.x.o.x.o.' },
  'boom-bap': { kick: 'x......x..x.....', snare: '....x.......x...', hatC: 'x.o.x.o.x.o.x.oo' },
  'half-time': { kick: 'x.........x.....', snare: '........x.......', hatC: 'x.o.x.o.x.o.x.o.' },
  lofi: { kick: 'x......x.x......', snare: '....x.......x..g', hatC: 'o.g.o.g.o.g.o.g.', rim: '..........g.....' },
  shuffle: { kick: 'x.....x.x.......', snare: '....x.......x...', hatC: 'x..ox..ox..ox..o' },
  bossa: { kick: 'x..xx..xx..xx..x', rim: 'x..x..x...x..x..', hatC: 'xoxoxoxoxoxoxoxo' },
  taiko: { kick: 'x.....x.x...x...', tom: '....x.......x.x.', rim: 'g.g.g.g.g.g.g.g.' },
  'ambient-pulse': { kick: 'o...............', perc: '........g.......', hatC: '....g.......g...' },
  festival: { kick: 'x...x...x...x...', tom: '..o...o...o.o.o.', clap: '....x.......x...', perc: 'x.g.x.g.x.g.x.g.' },
  march: { kick: 'x.......x.......', snare: 'x.gxx.g.x.gxx.xx' },
  heartbeat: { kick: 'x.o.............', perc: '........g.......' },
  breakbeat: { kick: 'x.x.......x.....', snare: '....x..g.x..x...', hatC: 'x.x.x.x.x.x.x.x.', hatO: '..............x.' }
};

/* Comfortable MIDI ranges per synth preset — stated in the prompt so models
   write bass lines low and chimes high instead of everything around C4. */
export const PRESET_RANGES = {
  bass: [28, 52], pad: [48, 76], lead: [60, 88], pluck: [55, 91], keys: [48, 84], chime: [72, 100]
};
