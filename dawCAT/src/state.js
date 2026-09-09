/* dawCAT — project state, persistence, undo/redo */
import { deleteAsset } from './engine/assets.js';

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  'pentatonic minor': [0, 3, 5, 7, 10],
  'pentatonic major': [0, 2, 4, 7, 9],
  hirajoshi: [0, 2, 3, 7, 8],
  'in sen': [0, 1, 5, 7, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
};

export const DRUM_LANES = [
  { id: 'kick', name: 'Kick' }, { id: 'snare', name: 'Snare' },
  { id: 'clap', name: 'Clap' }, { id: 'hatC', name: 'Hat Closed' },
  { id: 'hatO', name: 'Hat Open' }, { id: 'tom', name: 'Tom' },
  { id: 'rim', name: 'Rim' }, { id: 'perc', name: 'Perc' }
];

export const TRACK_COLORS = ['#3b82f6', '#7c5ce6', '#10b981', '#f59e0b', '#ec4899', '#38bdf8', '#a78bfa', '#f87171', '#34d399', '#fbbf24'];

let uidCounter = 0;
export function uid(prefix = 'id') {
  uidCounter += 1;
  return `${prefix}${Date.now().toString(36)}${uidCounter.toString(36)}`;
}

export function hzToMidi(hz) { return Math.round(69 + 12 * Math.log2(hz / 440)); }
export function midiToHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
export function midiToName(m) { return NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); }
export function noteNameToMidi(n) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(n);
  if (!m) return 60;
  let v = NOTE_NAMES.indexOf(m[1]);
  if (m[2] === '#') v += 1; if (m[2] === 'b') v -= 1;
  return v + (parseInt(m[3], 10) + 1) * 12;
}

/* ---------------- default project ---------------- */

export function defaultSynthPreset(kind = 'pluck') {
  const presets = {
    pad: { kind: 'pad', osc1: 'sine', osc2: 'triangle', detune: 5, attack: 1.2, decay: 2, sustain: 0.7, release: 2.4, cutoff: 900, res: 0.6, gain: 0.5 },
    pluck: { kind: 'pluck', osc1: 'triangle', osc2: 'sine', detune: 3, attack: 0.005, decay: 1.2, sustain: 0, release: 0.4, cutoff: 2400, res: 0.4, pitchDrop: true, gain: 0.6 },
    lead: { kind: 'lead', osc1: 'sawtooth', osc2: 'square', detune: 8, attack: 0.01, decay: 0.5, sustain: 0.5, release: 0.25, cutoff: 2400, res: 2, gain: 0.4 },
    bass: { kind: 'bass', osc1: 'sine', osc2: 'square', detune: 0, attack: 0.01, decay: 0.4, sustain: 0.6, release: 0.15, cutoff: 500, res: 1, gain: 0.7 },
    keys: { kind: 'keys', osc1: 'sine', osc2: 'sine', detune: 0, attack: 0.01, decay: 1.4, sustain: 0.25, release: 0.6, cutoff: 3200, res: 0.5, gain: 0.5 },
    chime: { kind: 'chime', osc1: 'sine', osc2: 'sine', detune: 0, attack: 0.005, decay: 2.2, sustain: 0.0, release: 0.5, cutoff: 6000, res: 0.4, gain: 0.4 }
  };
  return JSON.parse(JSON.stringify(presets[kind] || presets.pluck));
}

function mkClip(track, patch) {
  return Object.assign({
    id: uid('c'), name: '', start: 0, length: 4, gain: 1, loop: false, loopLen: 4,
    notes: [], steps: null, sample: null, audio: null
  }, patch);
}

const KIT_DEFAULT = { kick: 0, snare: 0, clap: 0, hatC: 0, hatO: 0, tom: 0, rim: 0, perc: 0 };
function mkSteps(pattern) {
  const s = JSON.parse(JSON.stringify(KIT_DEFAULT));
  for (const lane of Object.keys(s)) s[lane] = new Array(16).fill(0);
  if (pattern) for (const [lane, hits] of Object.entries(pattern)) {
    for (const [i, v] of hits) if (s[lane]) s[lane][i] = v;
  }
  return s;
}

export function defaultProject() {
  const tracks = [];
  const mkTrack = (name, color, kind, extra) => Object.assign({
    id: uid('t'), name, color, kind,
    preset: kind === 'synth' ? defaultSynthPreset('pluck') : null,
    drumKit: 'soft', volume: 0.8, pan: 0, mute: false, solo: false, arm: false,
    sends: { a: 0.12, b: 0.1 }, devices: [], clips: [],
    automation: { volume: [], pan: [], devices: {} },
    frozenActive: false, frozenAssetId: null
  }, extra);

  const drums = mkTrack('Drums', '#3b82f6', 'drum', {});
  const bass = mkTrack('Bass', '#7c5ce6', 'synth', { preset: defaultSynthPreset('bass') });
  const lead = mkTrack('Synth Lead', '#10b981', 'synth', { preset: defaultSynthPreset('lead') });
  const chords = mkTrack('Chords', '#f59e0b', 'synth', { preset: defaultSynthPreset('pad') });
  const pluck = mkTrack('Koto Pluck', '#ec4899', 'synth', { preset: defaultSynthPreset('pluck') });
  const fx = mkTrack('FX / Ambient', '#38bdf8', 'synth', { preset: defaultSynthPreset('chime'), sends: { a: 0.3, b: 0.35 } });
  tracks.push(drums, bass, lead, chords, pluck, fx);

  // Starter 8-bar sketch (C minor, 100 BPM) so Play makes music immediately
  const d1 = mkSteps({ kick: [[0, 1], [7, .8], [10, .7]], snare: [[4, .9], [12, .9]], hatC: [[2, .5], [6, .5], [10, .5], [14, .5]] });
  drums.clips.push(mkClip(drums, { name: 'Beat A', start: 0, length: 8, steps: d1, loop: true, loopLen: 4 }));

  const bassNotes = [[0, 36, 1.5, .9], [1.5, 36, .5, .6], [2, 43, 1, .8], [3, 41, 1, .8],
    [4, 36, 1.5, .9], [5.5, 36, .5, .7], [6, 46, 1, .8], [7, 43, 1, .8]];
  bass.clips.push(mkClip(bass, {
    name: 'Bassline_01', start: 0, length: 8, loop: true, loopLen: 4,
    notes: bassNotes.map(([s, m, l, v]) => ({ id: uid('n'), midi: m, start: s, len: l, vel: v }))
  }));

  const leadNotes = [[0, 72, .5, .8], [0.5, 75, .5, .7], [1, 75, 1, .8], [2.5, 70, .5, .6], [3, 67, 1, .8],
    [4, 72, .5, .8], [4.5, 74, .5, .7], [5, 75, 1.5, .9], [7, 74, 1, .7]];
  lead.clips.push(mkClip(lead, {
    name: 'Lead_Main', start: 0, length: 8, loop: true, loopLen: 4,
    notes: leadNotes.map(([s, m, l, v]) => ({ id: uid('n'), midi: m, start: s, len: l, vel: v }))
  }));

  const chordClip = mkClip(chords, { name: 'Chords_A', start: 0, length: 16, loop: true, loopLen: 16, notes: [] });
  [[0, [48, 55, 60, 64]], [4, [41, 48, 53, 57]], [8, [43, 50, 55, 59]], [12, [46, 53, 58, 62]]].forEach(([bar, ch]) => {
    ch.forEach((m, i) => chordClip.notes.push({ id: uid('n'), midi: m, start: bar, len: 3.6, vel: 0.55 + i * 0.03 }));
  });
  chords.clips.push(chordClip);

  const pluckNotes = [[0.5, 79, .25, .7], [1.25, 76, .25, .6], [2, 84, .5, .7], [3, 76, .5, .6],
    [4.5, 84, .25, .7], [5, 79, .5, .6], [6, 76, .5, .65], [6.75, 74, .25, .5]];
  pluck.clips.push(mkClip(pluck, {
    name: 'Pluck_Main', start: 0, length: 8, loop: true, loopLen: 4,
    notes: pluckNotes.map(([s, m, l, v]) => ({ id: uid('n'), midi: m, start: s, len: l, vel: v }))
  }));

  fx.clips.push(mkClip(fx, { name: 'Dream Chime', start: 0, length: 8, sample: 'chimes' }));

  return {
    version: 1, name: 'Untitled Score', tempo: 110, timeSigNum: 4, timeSigDen: 4,
    key: 'C', scale: 'minor', bars: 64,
    loop: { on: false, start: 0, end: 8 },
    metronome: false, swing: 0,
    sections: { dawn: 0, day: 16, dusk: 32, night: 48 },
    tracks,
    master: { volume: 0.85, automation: { volume: [] } },
    cueScan: { at: null, files: [], cues: [] },
    // Metadata only — { [id]: {name, mime, durationSec, sampleRate, channels} }.
    // The actual audio bytes live in IndexedDB (src/engine/assets.js) and are
    // only ever inlined as base64 when explicitly downloading a project file.
    assets: {}
  };
}

/* ---------------- project shape validation / migration ----------------
   There are two structurally different JSON shapes that float around this app:
   - a real *project* (this file's shape: tracks[].clips[], full editable state)
   - a flattened *export payload* (bridge.js buildExportPayload(): tracks[] with
     no clips, a top-level events[] instead, marked with kind: 'dawcat-export')
   Both used to pass the old `Array.isArray(p.tracks)` check, so importing an
   exported Track JSON as a project silently corrupted state and crashed on the
   next render. This validates the real shape and gives a specific reason when
   it's actually the other shape, so callers can show a clear toast instead. */

function validateProjectShape(p) {
  if (!p || typeof p !== 'object') return { ok: false, reason: 'not a project file' };
  if (p.kind === 'dawcat-export') return { ok: false, reason: 'export-payload' };
  if (!Array.isArray(p.tracks)) return { ok: false, reason: 'not a project file' };
  if (!p.tracks.every((t) => t && Array.isArray(t.clips))) {
    // Real projects always give every track a clips[] array; the flattened
    // export payload (bridge.js buildExportPayload) never does, even for
    // older exports made before the `kind` marker existed.
    const reason = Array.isArray(p.events) ? 'export-payload' : 'not a project file';
    return { ok: false, reason };
  }
  return { ok: true };
}

function migrateProject(p) {
  for (const t of p.tracks) {
    if (!Array.isArray(t.devices)) t.devices = [];
    if (!t.automation || typeof t.automation !== 'object') t.automation = { volume: [], pan: [], devices: {} };
    if (!Array.isArray(t.automation.volume)) t.automation.volume = [];
    if (!Array.isArray(t.automation.pan)) t.automation.pan = [];
    if (!t.automation.devices || typeof t.automation.devices !== 'object') t.automation.devices = {};
    if (typeof t.frozenActive !== 'boolean') t.frozenActive = false;
    if (t.frozenAssetId === undefined) t.frozenAssetId = null;
  }
  if (!p.master) p.master = { volume: 0.85, automation: { volume: [] } };
  if (!p.master.automation) p.master.automation = { volume: [] };
  if (!Array.isArray(p.master.automation.volume)) p.master.automation.volume = [];
  if (!p.assets || typeof p.assets !== 'object') p.assets = {};
}

/* ---------------- app state ---------------- */

export class AppState extends EventTarget {
  constructor() {
    super();
    this.project = null;
    this.selection = { trackId: null, clipId: null, selectedClipIds: [], noteId: null, deviceId: null, eqBand: 1 };
    this.undoStack = [];
    this.redoStack = [];
    this._undoTimer = null;
  }

  emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }

  /* ---------- project lifecycle ---------- */

  setProject(p, { resetUndo = true } = {}) {
    this.project = p;
    this.selection = { trackId: p.tracks[0] ? p.tracks[0].id : null, clipId: null, selectedClipIds: [], noteId: null, deviceId: null, eqBand: 1 };
    if (resetUndo) { this.undoStack = []; this.redoStack = []; }
    this.emit('project');
    this.emit('selection');
  }

  newProject(template = 'empty') {
    const p = defaultProject();
    if (template === 'empty') {
      p.tracks = [];
    }
    p.name = template === 'empty' ? 'Empty Project' : 'New Score';
    this.setProject(p);
  }

  serialize() { return JSON.parse(JSON.stringify(this.project)); }

  loadJSON(json) {
    try {
      const p = typeof json === 'string' ? JSON.parse(json) : json;
      const check = validateProjectShape(p);
      if (!check.ok) { this.lastLoadError = check.reason; throw new Error(check.reason); }
      migrateProject(p);
      this.setProject(p);
      return true;
    } catch (e) { return false; }
  }

  persist() {
    try { localStorage.setItem('dawcat_project_v1', JSON.stringify(this.project)); } catch (e) { /* quota */ }
  }

  restore() {
    try {
      const raw = localStorage.getItem('dawcat_project_v1');
      if (raw) {
        const p = JSON.parse(raw);
        if (validateProjectShape(p).ok) { migrateProject(p); this.project = p; return true; }
      }
    } catch (e) { /* corrupted */ }
    return false;
  }

  /* ---------- undo/redo ---------- */

  pushUndo() {
    clearTimeout(this._undoTimer);
    this._undoTimer = setTimeout(() => {
      this.undoStack.push(JSON.stringify(this.project));
      if (this.undoStack.length > 80) this.undoStack.shift();
      this.redoStack = [];
    }, 250);
  }

  undo() {
    if (!this.undoStack.length) return false;
    this.redoStack.push(JSON.stringify(this.project));
    this.setProject(JSON.parse(this.undoStack.pop()), { resetUndo: false });
    this.emit('project');
    return true;
  }

  redo() {
    if (!this.redoStack.length) return false;
    this.undoStack.push(JSON.stringify(this.project));
    this.setProject(JSON.parse(this.redoStack.pop()), { resetUndo: false });
    this.emit('project');
    return true;
  }

  /* ---------- lookups ---------- */

  track(id) { return this.project.tracks.find((t) => t.id === id) || null; }
  selectedTrack() { return this.track(this.selection.trackId); }
  selectedClip() {
    const t = this.selectedTrack();
    if (!t || !this.selection.clipId) return null;
    return t.clips.find((c) => c.id === this.selection.clipId) || null;
  }
  trackOfClip(clipId) { return this.project.tracks.find((t) => t.clips.some((c) => c.id === clipId)) || null; }

  /* ---------- tracks ---------- */

  addTrack(patch = {}) {
    this.pushUndo();
    const t = Object.assign({
      id: uid('t'), name: 'Track', color: TRACK_COLORS[this.project.tracks.length % TRACK_COLORS.length],
      kind: 'synth', preset: defaultSynthPreset('pluck'), drumKit: 'soft',
      volume: 0.8, pan: 0, mute: false, solo: false, arm: false,
      sends: { a: 0.1, b: 0.1 }, devices: [], clips: [], automation: { volume: [], pan: [], devices: {} },
      frozenActive: false, frozenAssetId: null
    }, patch);
    this.project.tracks.push(t);
    this.emit('project'); this.emit('chain', t.id);
    return t;
  }

  removeTrack(id) {
    this.pushUndo();
    const i = this.project.tracks.findIndex((t) => t.id === id);
    if (i >= 0) this.project.tracks.splice(i, 1);
    if (this.selection.trackId === id) this.selection.trackId = this.project.tracks[0]?.id || null;
    this.emit('project'); this.emit('selection');
  }

  updateTrack(id, patch, { undo = true } = {}) {
    const t = this.track(id);
    if (!t) return;
    if (undo) this.pushUndo();
    Object.assign(t, patch);
    this.emit('project');
    if (patch.preset || patch.volume !== undefined || patch.pan !== undefined || patch.mute !== undefined || patch.sends || patch.frozenActive !== undefined) {
      this.emit('chain', id);
    }
  }

  /* ---------- clips ---------- */

  addClip(trackId, patch = {}) {
    this.pushUndo();
    const t = this.track(trackId);
    if (!t) return null;
    const clip = Object.assign({
      id: uid('c'), name: '', start: 0, length: 4, gain: 1, loop: false, loopLen: 4,
      notes: [], steps: null, sample: null, audio: null
    }, patch);
    if (t.kind === 'drum' && !clip.steps) clip.steps = mkSteps(null);
    if (t.kind === 'drum') clip.length = Math.max(1, Math.round(clip.length));
    clip.name = clip.name || `${t.name} ${t.clips.length + 1}`;
    t.clips.push(clip);
    this.emit('project');
    return clip;
  }

  updateClip(trackId, clipId, patch, { undo = true } = {}) {
    const t = this.track(trackId);
    const c = t && t.clips.find((c) => c.id === clipId);
    if (!c) return;
    if (undo) this.pushUndo();
    Object.assign(c, patch);
    this.emit('project');
  }

  removeClip(trackId, clipId, { undo = true } = {}) {
    if (undo) this.pushUndo();
    const t = this.track(trackId);
    if (!t) return;
    const removed = t.clips.find((c) => c.id === clipId);
    t.clips = t.clips.filter((c) => c.id !== clipId);
    if (this.selection.clipId === clipId) { this.selection.clipId = null; this.emit('selection'); }
    if (this.selection.selectedClipIds && this.selection.selectedClipIds.includes(clipId)) {
      this.selection.selectedClipIds = this.selection.selectedClipIds.filter((id) => id !== clipId);
      this.emit('selection');
    }
    this.emit('project');
    // Each drag-and-dropped file gets its own fresh assetId (never shared),
    // so once its one clip is gone the asset is orphaned — clean it up so
    // IndexedDB doesn't accumulate audio no project reference points to.
    if (removed && removed.audio && removed.audio.assetId) this.cleanupOrphanAsset(removed.audio.assetId);
  }

  cleanupOrphanAsset(assetId) {
    const stillUsed = this.project.tracks.some((t) =>
      t.frozenAssetId === assetId || t.clips.some((c) => c.audio && c.audio.assetId === assetId));
    if (!stillUsed) this.removeAsset(assetId);
  }

  duplicateClip(trackId, clipId, { undo = true } = {}) {
    const t = this.track(trackId);
    const c = t && t.clips.find((x) => x.id === clipId);
    if (!c) return null;
    const copy = JSON.parse(JSON.stringify(c));
    copy.id = uid('c');
    copy.name = c.name + ' copy';
    copy.notes.forEach((n) => { n.id = uid('n'); });
    copy.start = c.start + c.length;
    if (undo) this.pushUndo();
    t.clips.push(copy);
    this.emit('project');
    return copy;
  }

  splitClip(trackId, clipId, atBar) {
    const t = this.track(trackId);
    const c = t && t.clips.find((x) => x.id === clipId);
    if (!c || atBar <= c.start || atBar >= c.start + c.length) return;
    this.pushUndo();
    const cutBeats = (atBar - c.start) * 4;
    const right = JSON.parse(JSON.stringify(c));
    right.id = uid('c');
    right.name = c.name + ' B';
    right.start = atBar;
    right.length = c.start + c.length - atBar;
    right.notes = c.notes
      .filter((n) => n.start >= cutBeats)
      .map((n) => ({ id: uid('n'), midi: n.midi, start: n.start - cutBeats, len: n.len, vel: n.vel }));
    c.length = atBar - c.start;
    c.notes = c.notes.filter((n) => n.start < cutBeats);
    if (right.loop && right.loopLen > right.length * 4) { right.loopLen = right.length * 4; }
    t.clips.push(right);
    this.emit('project');
  }

  /* ---------- notes ---------- */

  addNote(trackId, clipId, note) {
    const t = this.track(trackId);
    const c = t && t.clips.find((x) => x.id === clipId);
    if (!c) return null;
    this.pushUndo();
    const n = Object.assign({ id: uid('n'), midi: 60, start: 0, len: 0.5, vel: 0.85 }, note, { id: uid('n') });
    c.notes.push(n);
    this.emit('project');
    return n;
  }

  updateNote(trackId, clipId, noteId, patch, { undo = true } = {}) {
    const t = this.track(trackId);
    const c = t && t.clips.find((x) => x.id === clipId);
    const n = c && c.notes.find((x) => x.id === noteId);
    if (!n) return;
    if (undo) this.pushUndo();
    Object.assign(n, patch);
    this.emit('project');
  }

  removeNote(trackId, clipId, noteId) {
    const t = this.track(trackId);
    const c = t && t.clips.find((x) => x.id === clipId);
    if (!c) return;
    this.pushUndo();
    c.notes = c.notes.filter((n) => n.id !== noteId);
    this.emit('project');
  }

  /* ---------- drum steps ---------- */

  setStep(trackId, clipId, lane, step, vel, { undo = true } = {}) {
    const t = this.track(trackId);
    const c = t && t.clips.find((x) => x.id === clipId);
    if (!c || !c.steps || !c.steps[lane]) return;
    if (undo) this.pushUndo();
    c.steps[lane][step] = vel;
    this.emit('project');
  }

  clearLane(trackId, clipId, lane) {
    const t = this.track(trackId);
    const c = t && t.clips.find((x) => x.id === clipId);
    if (!c || !c.steps) return;
    this.pushUndo();
    c.steps[lane] = c.steps[lane].map(() => 0);
    this.emit('project');
  }

  /* ---------- devices ---------- */

  addDevice(trackId, type) {
    const t = this.track(trackId);
    if (!t) return;
    this.pushUndo();
    const params = defaultDeviceParams(type);
    const dev = { id: uid('d'), type, on: true, params };
    t.devices.push(dev);
    this.selection.deviceId = dev.id;
    this.emit('project'); this.emit('chain', trackId); this.emit('selection');
    return dev;
  }

  removeDevice(trackId, deviceId) {
    const t = this.track(trackId);
    if (!t) return;
    this.pushUndo();
    t.devices = t.devices.filter((d) => d.id !== deviceId);
    if (this.selection.deviceId === deviceId) this.selection.deviceId = null;
    this.emit('project'); this.emit('chain', trackId); this.emit('selection');
  }

  updateDevice(trackId, deviceId, patch, { undo = false } = {}) {
    const t = this.track(trackId);
    const d = t && t.devices.find((x) => x.id === deviceId);
    if (!d) return;
    if (undo) this.pushUndo();
    Object.assign(d, patch);
    this.emit('chain', trackId);
  }

  setDeviceParam(trackId, deviceId, key, value) {
    const t = this.track(trackId);
    const d = t && t.devices.find((x) => x.id === deviceId);
    if (!d) return;
    d.params[key] = value;
    this.emit('chain', trackId);
  }

  /* ---------- assets (imported audio files) ---------- */

  registerAsset(meta) {
    // meta: {id, name, mime, durationSec, sampleRate, channels} — no undo entry;
    // this only affects a metadata table, not the editable clip/note content,
    // and the matching IndexedDB row (src/engine/assets.js) isn't undo-tracked either.
    this.project.assets[meta.id] = meta;
    this.emit('project');
  }

  removeAsset(id) {
    if (!this.project.assets[id]) return;
    this.pushUndo();
    delete this.project.assets[id];
    for (const t of this.project.tracks) {
      for (const c of t.clips) if (c.audio && c.audio.assetId === id) c.audio = null;
      if (t.frozenAssetId === id) { t.frozenAssetId = null; t.frozenActive = false; }
    }
    this.emit('project');
    deleteAsset(id).catch(() => { /* best-effort IndexedDB cleanup */ });
  }

  /* ---------- automation ---------- */

  /* Resolves the point-array for a track/master or device-param automation lane.
     When `create` is true and `deviceId` is set, lazily creates automation.devices[deviceId][param]. */
  autoList(trackId, param, deviceId, create) {
    if (deviceId) {
      const t = this.track(trackId);
      if (!t) return null;
      if (!t.automation.devices) t.automation.devices = {};
      if (!t.automation.devices[deviceId]) {
        if (!create) return null;
        t.automation.devices[deviceId] = {};
      }
      const dev = t.automation.devices[deviceId];
      if (!dev[param]) {
        if (!create) return null;
        dev[param] = [];
      }
      return dev[param];
    }
    if (trackId === 'master') return this.project.master.automation[param];
    return (this.track(trackId) || {}).automation?.[param];
  }

  setAutoPoint(trackId, param, beat, value, deviceId = null) {
    const list = this.autoList(trackId, param, deviceId, true);
    if (!list) return;
    this.pushUndo();
    const existing = list.find((p) => Math.abs(p.beat - beat) < 0.05);
    if (existing) existing.value = value;
    else { list.push({ beat, value }); list.sort((a, b) => a.beat - b.beat); }
    this.emit('project');
  }

  removeAutoPoint(trackId, param, beat, deviceId = null) {
    const list = this.autoList(trackId, param, deviceId, false);
    if (!list) return;
    this.pushUndo();
    const i = list.findIndex((p) => Math.abs(p.beat - beat) < 0.12);
    if (i >= 0) list.splice(i, 1);
    this.emit('project');
  }

  /* ---------- selection ---------- */

  select(trackId, clipId = null) {
    this.selection.trackId = trackId;
    this.selection.clipId = clipId;
    this.selection.selectedClipIds = clipId ? [clipId] : [];
    this.selection.deviceId = null;
    this.emit('selection');
  }

  toggleClipSelection(trackId, clipId) {
    const ids = this.selection.selectedClipIds || (this.selection.selectedClipIds = []);
    const i = ids.indexOf(clipId);
    if (i >= 0) ids.splice(i, 1);
    else ids.push(clipId);
    this.selection.trackId = trackId;
    this.selection.clipId = ids.length ? ids[ids.length - 1] : null;
    this.emit('selection');
  }

  setClipSelection(ids) {
    this.selection.selectedClipIds = ids.slice();
    this.selection.clipId = ids.length ? ids[ids.length - 1] : null;
    this.emit('selection');
  }

  /* ---------- quantize ---------- */

  quantizeNotes(trackId, clipId, noteIds, gridBeats, strength = 1) {
    const t = this.track(trackId);
    const c = t && t.clips.find((x) => x.id === clipId);
    if (!c || !gridBeats) return;
    const ids = new Set(noteIds && noteIds.length ? noteIds : c.notes.map((n) => n.id));
    this.pushUndo();
    for (const n of c.notes) {
      if (!ids.has(n.id)) continue;
      const snapped = Math.max(0, Math.round(n.start / gridBeats) * gridBeats);
      n.start = n.start + (snapped - n.start) * strength;
    }
    this.emit('project');
  }

  quantizeClipStarts(trackId, clipIds, gridBars, strength = 1) {
    const t = this.track(trackId);
    if (!t || !gridBars) return;
    const ids = new Set(clipIds && clipIds.length ? clipIds : t.clips.map((c) => c.id));
    this.pushUndo();
    for (const c of t.clips) {
      if (!ids.has(c.id)) continue;
      const snapped = Math.max(0, Math.round(c.start / gridBars) * gridBars);
      c.start = c.start + (snapped - c.start) * strength;
    }
    this.emit('project');
  }
}

export function defaultDeviceParams(type) {
  switch (type) {
    case 'eq8': return {
      hpOn: false, hpFreq: 30,
      bands: [
        { type: 'lowshelf', freq: 80, gain: 0, q: 0.7 },
        { type: 'peaking', freq: 120, gain: 0, q: 1.0 },
        { type: 'peaking', freq: 400, gain: 0, q: 1.0 },
        { type: 'peaking', freq: 350, gain: 0, q: 1.0 },
        { type: 'peaking', freq: 1000, gain: 0, q: 1.0 },
        { type: 'peaking', freq: 2800, gain: 0, q: 1.0 },
        { type: 'peaking', freq: 5500, gain: 0, q: 1.0 },
        { type: 'highshelf', freq: 9000, gain: 0, q: 0.7 }
      ]
    };
    case 'comp': return { threshold: -20, ratio: 3, attack: 0.01, release: 0.25, knee: 12, makeup: 1.2 };
    case 'delay': return { sync: '1/8', timeMs: 375, feedback: 0.34, wet: 0.3 };
    case 'reverb': return { size: 2.2, decay: 2.4, wet: 0.28 };
    case 'filter': return { type: 'lowpass', freq: 1200, q: 0.8 };
    case 'chorus': return { rate: 0.6, depth: 0.4, mix: 0.35 };
    case 'utility': return { gain: 1.0 };
    default: return {};
  }
}

export const SNAP_VALUES = { bar: 4, beat: 1, '1/8': 0.5, '1/16': 0.25, off: 0 };
