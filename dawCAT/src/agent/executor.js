/* dawCAT — applies validated agent plans to the project (AppState), and builds
   the project context the model sees. A whole plan runs inside
   AppState.applyBatch(): one undo step, and a full rollback if any action
   throws, so a bad plan can never leave the project half-edited. Errors name
   the failing action ("Action 3 (addClip): …") so the session's repair loop
   can hand them straight back to the model. DOM-free. */
import { defaultSynthPreset, uid, DRUM_LANES } from '../state.js';
import { parseChordOrRoman, parsePhrase, degreesToMidi, arpeggiate, voiceLead, parseStepGrid, GROOVES } from './theory.js';
import { validatePlan, SYNTH_PRESETS, DRUM_KITS } from './schema.js';
import { AUTOMATABLE_PARAMS } from '../engine/automatable.js';
import { createPatch, normalizePatch, GAME_HOOKS, SFX_TEMPLATE_IDS, sfxDuration } from '../sfx/patches.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const r4 = (v) => Math.round(v * 10000) / 10000;

/* Full 8-lane × 16-step grid from any partial lane map (lane → 16 values). */
function fullSteps(partial) {
  const steps = {};
  for (const lane of DRUM_LANES) steps[lane.id] = partial && Array.isArray(partial[lane.id]) ? partial[lane.id].slice(0, 16).concat(new Array(16).fill(0)).slice(0, 16) : new Array(16).fill(0);
  return steps;
}

/* Legacy sparse {lane: [[stepIndex, velocity], …]} shorthand → lane arrays. */
function stepsFromPattern(pattern) {
  const out = {};
  for (const [laneId, hits] of Object.entries(pattern || {})) {
    if (!Array.isArray(hits)) continue;
    const lane = new Array(16).fill(0);
    for (const hit of hits) {
      const [i, v] = Array.isArray(hit) ? hit : [hit, 1];
      const idx = clamp(Math.round(Number(i)) || 0, 0, 15);
      lane[idx] = clamp(Number(v ?? 1) || 0, 0, 1);
    }
    out[laneId] = lane;
  }
  return out;
}

/* Inverse: only the non-zero hits, the same shorthand addClip accepts. */
export function compactSteps(steps) {
  const out = {};
  for (const [lane, arr] of Object.entries(steps || {})) {
    const hits = arr.map((v, i) => (v ? [i, v] : null)).filter(Boolean);
    if (hits.length) out[lane] = hits;
  }
  return out;
}

const contentBeats = (notes) => notes.reduce((m, n) => Math.max(m, n.start + n.len), 0);
const barsFor = (beats) => Math.max(1, Math.ceil(beats / 4 - 1e-9));

export class PlanExecutor {
  constructor(state) {
    this.state = state;
    this.cursor = { trackId: null, clipId: null, sfxId: null };
  }

  get project() { return this.state.project; }

  /* ---------------- context for the model ---------------- */

  buildContext({ mode = 'free' } = {}) {
    const st = this.state;
    const p = st.project;
    const tracks = p.tracks.slice(0, 32).map((t) => ({
      id: t.id, name: t.name, kind: t.kind,
      preset: t.kind === 'synth' && t.preset ? t.preset.kind : undefined,
      drumKit: t.kind === 'drum' ? t.drumKit : undefined,
      volume: t.volume, pan: t.pan, mute: t.mute || undefined, solo: t.solo || undefined, sends: t.sends,
      devices: t.devices.map((d) => (mode === 'mix' ? { type: d.type, on: d.on, params: d.params } : d.type)),
      clips: t.clips.slice(0, 24).map((c) => ({
        id: c.id, name: c.name, start: c.start, length: c.length, loop: c.loop || undefined, loopLen: c.loop ? c.loopLen : undefined,
        notes: c.notes && c.notes.length ? c.notes.map((n) => ({ midi: n.midi, start: r4(n.start), len: r4(n.len), vel: r4(n.vel) })) : undefined,
        steps: c.steps ? compactSteps(c.steps) : undefined,
        sample: c.sample || undefined
      }))
    }));
    const cues = ((p.cueScan && p.cueScan.cues) || []).filter((c) => c.kind === 'phase')
      .map((c) => ({ scene: c.scene, timeOfDay: c.timeOfDay, name: c.name, rootHz: c.rootHz, chord: c.chord, scale: c.scale }));
    return {
      editor: 'dawCAT', name: p.name, tempo: p.tempo, key: p.key, scale: p.scale, swing: p.swing,
      timeSig: `${p.timeSigNum}/${p.timeSigDen}`, scene: p.scene, timeOfDay: p.timeOfDay,
      loop: p.loop, sections: p.sections,
      selection: { trackId: st.selection.trackId, clipId: st.selection.clipId, sfxId: st.selection.sfxId },
      master: { volume: p.master.volume },
      tracks,
      // Full patches only where sounds are the subject; music modes get a
      // one-line summary so many SFX can't crowd a small model's context.
      sfx: (p.sfx || []).slice(0, 40).map((s) => (['sfx', 'free'].includes(mode) ? s
        : { id: s.id, name: s.name, category: s.category, layers: s.layers.length, gameHook: s.gameHook || undefined })),
      gameCues: cues.slice(0, 12),
      gameHooks: mode === 'sfx' ? GAME_HOOKS : undefined,
      constraints: { maxActions: 60, undoable: true }
    };
  }

  /* ---------------- execution ---------------- */

  /* Validates (idempotent for already-clean plans) and applies `plan`.
     Returns { count, created: { tracks, clips, sfx } }. */
  execute(rawPlan) {
    const { plan, errors } = validatePlan(rawPlan);
    if (errors.length) throw new Error(errors.slice(0, 6).join('; '));
    const st = this.state;
    this.cursor = { trackId: null, clipId: null, sfxId: null };
    this.created = { tracks: [], clips: [], sfx: [] };
    let count = 0;
    st.applyBatch(() => {
      plan.actions.forEach((action, i) => {
        try { this.apply(action); }
        catch (err) { throw new Error(`Action ${i + 1} (${action.type}): ${err.message}`); }
        count++;
      });
    });
    if (this.cursor.sfxId) st.selectSfx(this.cursor.sfxId);
    return { count, created: this.created };
  }

  apply(action) {
    const fn = this[`do_${action.type}`];
    if (!fn) throw new Error('is not implemented');
    fn.call(this, action.params || {}, action.target || 'selection');
  }

  /* ---------------- target resolution ---------------- */

  findTrack(ref) {
    const tracks = this.project.tracks;
    if (!ref || ref === 'selection') {
      const id = this.cursor.trackId || this.state.selection.trackId;
      return tracks.find((t) => t.id === id) || null;
    }
    const s = String(ref);
    return tracks.find((t) => t.id === s) || tracks.find((t) => t.name.toLowerCase() === s.toLowerCase()) || null;
  }

  track(ref, { kind } = {}) {
    const t = this.findTrack(String(ref || '').split(':')[0] || 'selection');
    if (!t) throw new Error(ref && ref !== 'selection' ? `track "${ref}" not found — use a track id from DAW CONTEXT` : 'no track selected — add one with addTrack first or target a track id');
    if (kind && t.kind !== kind) throw new Error(`needs a ${kind} track, but "${t.name}" is a ${t.kind} track`);
    return t;
  }

  /* "trackId:clipId", a bare clip id, or "selection". */
  clip(ref) {
    const s = String(ref || 'selection');
    if (s === 'selection') {
      const clipId = this.cursor.clipId || this.state.selection.clipId;
      const t = clipId && this.state.trackOfClip(clipId);
      if (!t) throw new Error('no clip selected — target "trackId:clipId" from DAW CONTEXT');
      return { track: t, clip: t.clips.find((c) => c.id === clipId) };
    }
    if (s.includes(':')) {
      const [tRef, cId] = s.split(':');
      const t = this.findTrack(tRef);
      const c = t && t.clips.find((x) => x.id === cId || (x.name && x.name.toLowerCase() === cId.toLowerCase()));
      if (!c) throw new Error(`clip "${s}" not found — use "trackId:clipId" from DAW CONTEXT`);
      return { track: t, clip: c };
    }
    const t = this.state.trackOfClip(s);
    if (!t) throw new Error(`clip "${s}" not found — use "trackId:clipId" from DAW CONTEXT`);
    return { track: t, clip: t.clips.find((c) => c.id === s) };
  }

  sfx(ref) {
    const list = this.project.sfx || [];
    let s;
    if (!ref || ref === 'selection') s = list.find((x) => x.id === (this.cursor.sfxId || this.state.selection.sfxId));
    else s = list.find((x) => x.id === ref) || list.find((x) => x.name.toLowerCase() === String(ref).toLowerCase());
    if (!s) throw new Error(ref && ref !== 'selection' ? `SFX "${ref}" not found — use an sfx id from DAW CONTEXT` : 'no SFX selected — create one with addSfx or target an sfx id');
    return s;
  }

  /* ---------------- content builders ---------------- */

  synthNotes(params, { required = true } = {}) {
    const p = this.project;
    let notes = null;
    if (Array.isArray(params.notes) && params.notes.length) notes = params.notes.map((n) => ({ ...n }));
    else if (params.phrase) notes = parsePhrase(params.phrase);
    else if (params.degrees) {
      const list = Array.isArray(params.degrees) ? params.degrees : [params.degrees];
      const rate = params.degreeRate || 1;
      const midis = degreesToMidi(list, p.key, p.scale, params.octave ?? 4);
      notes = [];
      midis.forEach((m, i) => { if (m != null) notes.push({ midi: m, start: r4(i * rate), len: r4(rate * 0.95), vel: 0.8 }); });
    }
    if (!notes || !notes.length) {
      if (required) throw new Error('a synth clip needs notes, a phrase or degrees');
      return null;
    }
    return notes.map((n) => ({ id: uid('n'), midi: clamp(Math.round(n.midi), 0, 127), start: Math.max(0, r4(n.start)), len: Math.max(0.03, r4(n.len)), vel: clamp(n.vel ?? 0.8, 0, 1) }));
  }

  drumSteps(params, { required = true } = {}) {
    let partial = null;
    if (params.grid) partial = parseStepGrid(params.grid);
    else if (params.groove) partial = parseStepGrid(GROOVES[params.groove]);
    else if (params.steps) partial = stepsFromPattern(params.steps);
    if (!partial) {
      if (required) throw new Error('a drum clip needs a grid, a groove or steps');
      return null;
    }
    return fullSteps(partial);
  }

  addClipTo(track, patch) {
    const clip = this.state.addClip(track.id, patch);
    this.cursor.trackId = track.id;
    this.cursor.clipId = clip.id;
    this.created.clips.push(clip.id);
    this.state.select(track.id, clip.id);
    return clip;
  }

  /* ---------------- project ---------------- */

  do_setTempo(p) { this.project.tempo = p.bpm; this.state.emit('project'); }
  do_setKeyScale(p) { if (p.key) this.project.key = p.key; if (p.scale) this.project.scale = p.scale; this.state.emit('project'); }
  do_setSwing(p) { this.project.swing = p.swing; this.state.emit('project'); }
  do_setMaster(p) { this.project.master.volume = p.volume; this.state.emit('project'); }

  do_setLoop(p) {
    const loop = this.project.loop;
    if (p.start != null) loop.start = p.start;
    if (p.end != null) loop.end = p.end;
    if (loop.end <= loop.start) loop.end = loop.start + 1;
    loop.on = p.on != null ? p.on : (p.start != null || p.end != null ? true : loop.on);
    this.state.emit('project');
  }

  do_setProjectInfo(p) {
    const proj = this.project;
    if (p.name) proj.name = p.name;
    if (p.scene) proj.scene = p.scene;
    if (p.timeOfDay) proj.timeOfDay = p.timeOfDay === 'all' ? null : p.timeOfDay;
    if (p.sections) proj.sections = Object.assign({}, proj.sections, p.sections);
    this.state.emit('project');
  }

  /* ---------------- tracks ---------------- */

  do_addTrack(p) {
    const kind = p.kind === 'drum' ? 'drum' : 'synth';
    const patch = {
      name: p.name || (kind === 'drum' ? 'Drums' : 'Synth'),
      kind,
      preset: kind === 'synth' ? defaultSynthPreset(SYNTH_PRESETS.includes(p.preset) ? p.preset : 'pluck') : null,
      drumKit: DRUM_KITS.includes(p.drumKit) ? p.drumKit : 'soft'
    };
    if (p.color) patch.color = p.color;
    if (p.volume != null) patch.volume = p.volume;
    if (p.pan != null) patch.pan = p.pan;
    const t = this.state.addTrack(patch);
    this.cursor.trackId = t.id;
    this.cursor.clipId = null;
    this.created.tracks.push(t.id);
    this.state.select(t.id);
  }

  do_renameTrack(p, target) { const t = this.track(target); this.state.updateTrack(t.id, { name: p.name }); this.cursor.trackId = t.id; }

  do_deleteTrack(p, target) {
    const t = this.track(target);
    this.state.removeTrack(t.id);
    if (this.cursor.trackId === t.id) this.cursor = { ...this.cursor, trackId: null, clipId: null };
  }

  do_setTrackMix(p, target) {
    const t = this.track(target);
    const patch = {};
    for (const k of ['volume', 'pan', 'mute', 'solo']) if (p[k] != null) patch[k] = p[k];
    if (p.sends) patch.sends = { a: p.sends.a ?? t.sends.a, b: p.sends.b ?? t.sends.b };
    this.state.updateTrack(t.id, patch);
    this.cursor.trackId = t.id;
  }

  do_setTrackPreset(p, target) {
    const t = this.track(target, { kind: 'synth' });
    const base = p.preset ? defaultSynthPreset(p.preset) : Object.assign({}, t.preset);
    this.state.updateTrack(t.id, { preset: Object.assign(base, p.patch || {}) });
    this.cursor.trackId = t.id;
  }

  device(t, type) { return t.devices.find((d) => d.type === type) || this.state.addDevice(t.id, type); }

  do_addDevice(p, target) { const t = this.track(target); this.state.addDevice(t.id, p.type); this.cursor.trackId = t.id; }

  do_setDeviceParams(p, target) {
    const t = this.track(target);
    const dev = this.device(t, p.type);
    const params = Object.assign({}, dev.params);
    for (const [k, v] of Object.entries(p.params || {})) {
      if (k === 'bands' && Array.isArray(v) && Array.isArray(params.bands)) {
        params.bands = params.bands.map((b, i) => (v[i] && typeof v[i] === 'object' ? Object.assign({}, b, v[i]) : b));
      } else params[k] = v;
    }
    this.state.updateDevice(t.id, dev.id, { params });
    this.cursor.trackId = t.id;
  }

  do_removeDevice(p, target) {
    const t = this.track(target);
    const dev = t.devices.find((d) => d.type === p.type);
    if (!dev) throw new Error(`"${t.name}" has no ${p.type} device`);
    this.state.removeDevice(t.id, dev.id);
  }

  /* ---------------- clips ---------------- */

  do_addClip(p, target) {
    const t = this.track(target);
    const patch = { name: p.name, start: p.start ?? 0 };
    let beats;
    if (t.kind === 'drum') {
      patch.steps = this.drumSteps(p);
      beats = 4;
    } else {
      patch.notes = this.synthNotes(p);
      beats = contentBeats(patch.notes);
    }
    const bars = t.kind === 'drum' ? Math.round(p.length ?? 4) : (p.length ?? barsFor(beats));
    patch.length = Math.max(t.kind === 'drum' ? 1 : 0.25, bars);
    patch.loop = !!p.loop;
    patch.loopLen = p.loopLen ?? Math.max(1, barsFor(beats) * 4);
    this.addClipTo(t, patch);
  }

  do_setClipNotes(p, target) {
    const { track, clip } = this.clip(target);
    if (track.kind === 'drum') this.state.updateClip(track.id, clip.id, { steps: this.drumSteps(p) });
    else {
      const notes = this.synthNotes(p);
      const patch = { notes };
      const need = barsFor(contentBeats(notes));
      if (!clip.loop && need > clip.length) patch.length = need;
      this.state.updateClip(track.id, clip.id, patch);
    }
    this.cursor.trackId = track.id;
    this.cursor.clipId = clip.id;
  }

  do_deleteClip(p, target) { const { track, clip } = this.clip(target); this.state.removeClip(track.id, clip.id); }

  do_transposeClip(p, target) {
    let targets;
    try { targets = [this.clip(target)]; }
    catch (err) {
      const t = this.findTrack(String(target).split(':')[0]);
      if (!t || String(target).includes(':')) throw err;
      targets = t.clips.map((clip) => ({ track: t, clip }));
    }
    for (const { track, clip } of targets) {
      if (track.kind === 'drum') continue;
      const notes = clip.notes.map((n) => ({ ...n, midi: clamp(n.midi + p.semitones, 0, 127) }));
      this.state.updateClip(track.id, clip.id, { notes });
    }
  }

  do_duplicateClip(p, target) {
    const { track, clip } = this.clip(target);
    let last = clip;
    for (let i = 0; i < (p.times || 1); i++) {
      const copy = this.state.duplicateClip(track.id, last.id);
      copy.start = last.start + last.length;
      last = copy;
      this.created.clips.push(copy.id);
    }
    this.cursor.trackId = track.id;
    this.cursor.clipId = last.id;
  }

  do_moveClip(p, target) {
    const { track, clip } = this.clip(target);
    const patch = {};
    for (const k of ['start', 'length', 'loop', 'loopLen', 'name']) if (p[k] != null) patch[k] = p[k];
    if (track.kind === 'drum' && patch.length != null) patch.length = Math.max(1, Math.round(patch.length));
    this.state.updateClip(track.id, clip.id, patch);
  }

  /* ---------------- composition helpers ---------------- */

  do_addChordProgression(p, target) {
    const t = this.track(target, { kind: 'synth' });
    const proj = this.project;
    const symbols = Array.isArray(p.chords) ? p.chords : String(p.chords).split(/[\s,|]+/).filter(Boolean);
    const octave = p.octave ?? 3;
    const raw = symbols.map((s) => parseChordOrRoman(s, proj.key, proj.scale, octave));
    const voiced = p.voiceLead === false ? raw : voiceLead(raw);
    const bpc = p.beatsPerChord ?? 4;
    const vel = p.vel ?? 0.7;
    const notes = [];
    const repeat = p.repeat || 1;
    for (let r = 0; r < repeat; r++) {
      voiced.forEach((chord, i) => {
        const start = (r * voiced.length + i) * bpc;
        for (const n of arpeggiate(chord, { style: p.style || 'block', rate: p.rate ?? 0.5, beats: bpc, start, vel })) notes.push(n);
        if (p.bass) notes.push({ midi: clamp(Math.min(...raw[i]) - 12, 0, 127), start, len: r4(bpc * 0.95), vel: Math.min(1, vel + 0.1) });
      });
    }
    const beats = voiced.length * bpc * repeat;
    this.addClipTo(t, {
      name: p.name || symbols.join(' ').slice(0, 40),
      start: p.start ?? 0,
      length: barsFor(beats),
      loop: !!p.loop,
      loopLen: beats,
      notes: notes.map((n) => ({ id: uid('n'), midi: n.midi, start: n.start, len: n.len, vel: n.vel }))
    });
  }

  do_addDrumPattern(p, target) {
    const t = this.track(target, { kind: 'drum' });
    this.addClipTo(t, { name: p.name || (p.groove ? p.groove : 'Pattern'), start: p.start ?? 0, length: p.bars ?? 4, steps: this.drumSteps(p), loop: false, loopLen: 4 });
  }

  do_addAutomation(p, target) {
    const name = String(p.param).trim();
    const lower = name.toLowerCase();
    let list, range;
    if (lower === 'master' || lower === 'master.volume') {
      list = this.project.master.automation.volume;
      range = { min: 0, max: 1 };
    } else {
      const t = this.track(target);
      if (lower === 'volume' || lower === 'pan') {
        list = t.automation[lower];
        range = lower === 'pan' ? { min: -1, max: 1 } : { min: 0, max: 1 };
      } else {
        const [type, key] = name.split('.');
        const table = AUTOMATABLE_PARAMS[type];
        if (!table || !table[key]) {
          const all = Object.entries(AUTOMATABLE_PARAMS).flatMap(([d, ps]) => Object.keys(ps).map((k) => `${d}.${k}`));
          throw new Error(`"${name}" is not automatable — use volume, pan, master or one of ${all.join(', ')}`);
        }
        const dev = this.device(t, type);
        list = this.state.autoList(t.id, key, dev.id, true);
        range = table[key];
      }
      this.cursor.trackId = t.id;
    }
    let points;
    if (p.ramp) {
      const { from, to, startBar = 0, endBar, steps = 8 } = p.ramp;
      const a = startBar * 4, b = Math.max(a + 0.25, endBar * 4);
      const geometric = from > 0 && to > 0 && range.max > 100;
      points = Array.from({ length: steps }, (_, i) => {
        const f = steps === 1 ? 1 : i / (steps - 1);
        const value = geometric ? from * Math.pow(to / from, f) : from + (to - from) * f;
        return [a + (b - a) * f, value];
      });
    } else points = p.points;
    const lo = Math.min(...points.map((pt) => pt[0])), hi = Math.max(...points.map((pt) => pt[0]));
    const keep = p.clear ? [] : list.filter((pt) => pt.beat < lo - 0.01 || pt.beat > hi + 0.01);
    const next = keep.concat(points.map(([beat, value]) => ({ beat: r4(beat), value: r4(clamp(value, range.min, range.max)) }))).sort((x, y) => x.beat - y.beat);
    list.splice(0, list.length, ...next);
    this.state.emit('project');
  }

  /* ---------------- sound design ---------------- */

  do_addSfx(p) {
    if (p.template && !SFX_TEMPLATE_IDS.includes(p.template)) throw new Error(`unknown template "${p.template}" — use one of ${SFX_TEMPLATE_IDS.join(', ')}`);
    const overrides = {};
    for (const k of ['name', 'category', 'tags', 'gain', 'gameHook', 'variation', 'fx', 'layers']) if (p[k] !== undefined) overrides[k] = p[k];
    const patch = createPatch(p.template || 'blank', overrides);
    const s = this.state.addSfx(patch);
    this.cursor.sfxId = s.id;
    this.created.sfx.push(s.id);
  }

  do_updateSfx(p, target) {
    const s = this.sfx(target);
    const next = JSON.parse(JSON.stringify(s));
    for (const k of ['name', 'category', 'tags', 'gain', 'gameHook']) if (p[k] !== undefined) next[k] = p[k];
    if (p.variation) next.variation = Object.assign(next.variation, p.variation);
    if (p.fx) next.fx = Object.assign(next.fx, p.fx);
    if (p.layers) next.layers = p.layers.map((l) => ({ ...l, id: l.id || uid('L') }));
    for (const edit of p.layerEdits || []) {
      const i = Number(edit && edit.index);
      if (!Number.isInteger(i) || !next.layers[i]) throw new Error(`layerEdits index ${edit && edit.index} does not exist (patch has ${next.layers.length} layers, 0-based)`);
      const layer = next.layers[i];
      for (const [k, v] of Object.entries(edit)) {
        if (k === 'index') continue;
        layer[k] = v && typeof v === 'object' && !Array.isArray(v) && layer[k] && typeof layer[k] === 'object' ? Object.assign({}, layer[k], v) : v;
      }
    }
    if (Array.isArray(p.removeLayers)) {
      const drop = new Set(p.removeLayers.map(Number));
      next.layers = next.layers.filter((_, i) => !drop.has(i));
    }
    if (p.addLayers) next.layers.push(...p.addLayers.map((l) => ({ ...l, id: uid('L') })));
    this.state.updateSfx(s.id, normalizePatch(next));
    this.cursor.sfxId = s.id;
  }

  do_deleteSfx(p, target) {
    const s = this.sfx(target);
    this.state.removeSfx(s.id);
    if (this.cursor.sfxId === s.id) this.cursor.sfxId = null;
  }

  do_placeSfx(p, target) {
    const s = this.sfx(target);
    let t;
    if (p.trackId) t = this.track(p.trackId);
    else {
      t = this.project.tracks.find((x) => x.name === 'SFX');
      if (!t) {
        t = this.state.addTrack({ name: 'SFX', kind: 'synth', preset: defaultSynthPreset('chime'), sends: { a: 0.15, b: 0 } });
        this.created.tracks.push(t.id);
      }
    }
    const beats = sfxDuration(s) / (60 / (this.project.tempo || 110));
    this.addClipTo(t, { name: s.name, start: p.start ?? 0, length: barsFor(beats), sample: `sfxp:${s.id}`, gain: p.gain ?? 1, notes: [] });
    this.cursor.sfxId = s.id;
  }
}
