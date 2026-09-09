/* dawCAT — app bootstrap */
import { AppState, defaultProject, defaultSynthPreset, uid, SCALES, DRUM_LANES } from './state.js';
import { AudioEngine } from './engine/core.js';
import { Transport } from './engine/transport.js';
import { preloadProjectAssets, putAsset, cacheBuffer } from './engine/assets.js';
import { renderProject, renderTrackToBuffer, wavBlob } from './engine/render.js';
import { exportToGame } from './bridge.js';
import { writeMidiFile, parseMidiFile } from './midi.js';
import { scanGameCues } from './scanner.js';
import { buildTopbar } from './ui/transport-ui.js';
import { Browser } from './ui/browser.js';
import { Arrangement } from './ui/arrangement.js';
import { PianoRoll } from './ui/pianoroll.js';
import { DrumGrid } from './ui/drumgrid.js';
import { Mixer } from './ui/mixer.js';
import { Inspector } from './ui/inspector.js';
import { Devices } from './ui/devices.js';
import { AgentPanel } from './ui/agent-panel.js';
import { el, toast, showModal, download } from './ui/common.js';

function slug(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'untitled'; }

// The full-day-cycle case (timeOfDay unset) keeps the plain `music.js` name so
// it drops straight into the game's existing src/music.js path unchanged.
// A single-time-of-day export gets a distinct name so multiple scene/time
// variants can sit side by side without overwriting each other.
function musicFileName(project) {
  return project.timeOfDay ? `music.${slug(project.scene)}.${project.timeOfDay}.js` : 'music.js';
}

function jsonFileName(project) {
  const tag = project.timeOfDay ? `${slug(project.scene)}.${project.timeOfDay}` : slug(project.scene);
  return `${project.name || 'track'}.${tag}.dawcat-export.json`;
}

function clampRange(v, min, max) { return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min; }

// Builds a full 8-lane, 16-step drum pattern from the AI's sparse
// {lane: [[stepIndex, velocity], ...]} shorthand — mirrors state.js's private
// mkSteps() so an agent-authored clip has the exact shape AppState.addClip()
// expects (it doesn't normalize a caller-supplied `steps` object itself).
function buildStepsFromPattern(pattern) {
  const steps = {};
  for (const lane of DRUM_LANES) steps[lane.id] = new Array(16).fill(0);
  if (pattern && typeof pattern === 'object') {
    for (const [laneId, hits] of Object.entries(pattern)) {
      if (!steps[laneId] || !Array.isArray(hits)) continue;
      for (const hit of hits) {
        const [i, v] = Array.isArray(hit) ? hit : [hit, 1];
        const idx = clampRange(Math.round(Number(i)), 0, 15);
        steps[laneId][idx] = clampRange(Number(v ?? 1), 0, 1);
      }
    }
  }
  return steps;
}

// Inverse of buildStepsFromPattern — reduces a full 8-lane, 16-step drum grid
// down to only its non-zero hits, in the same shorthand the addClip action
// schema expects, so it can be sent as context and handed straight back in a
// remix plan without the model having to reconstruct 128 mostly-zero values.
function compactSteps(steps) {
  const out = {};
  for (const [lane, arr] of Object.entries(steps)) {
    const hits = arr.map((v, i) => (v ? [i, v] : null)).filter(Boolean);
    if (hits.length) out[lane] = hits;
  }
  return out;
}

class App {
  constructor() {
    this.state = new AppState();
    this.engine = new AudioEngine();
    this.transport = new Transport(this.engine, this.state);
    this.snap = 'beat';
    this.activeTab = 'arrangement';
    this._rebuildTimer = null;
    this._saveTimer = null;
  }

  init() {
    if (!this.state.restore()) {
      this.state.setProject(defaultProject());
    } else {
      this.state.emit('project');
      this.state.emit('selection');
    }

    buildTopbar(this);
    this.browser = new Browser(this);
    this.arrangement = new Arrangement(this);
    this.pianoroll = new PianoRoll(this);
    this.drumgrid = new DrumGrid(this);
    this.mixer = new Mixer(this);
    this.inspector = new Inspector(this);
    this.devices = new Devices(this);
    this.agentPanel = new AgentPanel({
      getContext: () => this.getAgentContext(),
      executePlan: (plan) => this.executeAgentPlan(plan),
      undo: () => this.state.undo()
    });

    this.wireTabs();
    this.wireSnapZoom();
    this.wireShortcuts();
    this.wireAudioButton();

    this.state.addEventListener('project', () => this.onProjectChanged());
    this.state.addEventListener('chain', () => {
      if (this.engine.ctx) this.engine.rebuildAll(this.state.project);
      this.transport.markDirty();
    });

    document.getElementById('file-input').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const text = await f.text();
      if (this.state.loadJSON(text)) {
        toast('Project loaded');
      } else if (this.state.lastLoadError === 'export-payload') {
        toast('That looks like a Track JSON export, not a project — use Export ▸ Download Track JSON files only for archival, and open real .dawcat.json project saves here instead', true);
      } else {
        toast('Invalid project file', true);
      }
      e.target.value = '';
    });

    document.getElementById('midi-input').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      await this.importMidiFile(f);
      e.target.value = '';
    });
  }

  /* ---------- tabs / snap / zoom ---------- */

  wireTabs() {
    document.querySelectorAll('.tab[data-tab]').forEach((tab) => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });
  }

  switchTab(name) {
    this.activeTab = name;
    document.querySelectorAll('.tab[data-tab]').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + name));
  }

  openClipEditor(clipId) {
    const st = this.state;
    const track = st.trackOfClip(clipId);
    if (!track) return;
    st.select(track.id, clipId);
    const clip = st.selectedClip();
    if (track.kind === 'drum' || (clip && clip.sample)) this.switchTab('clip');
    else this.switchTab('pianoroll');
  }

  wireSnapZoom() {
    const snapSel = document.getElementById('snap-select');
    snapSel.addEventListener('change', () => { this.snap = snapSel.value; });
    const zoomRange = document.getElementById('zoom-range');
    zoomRange.addEventListener('input', () => this.arrangement.setZoom(parseInt(zoomRange.value, 10)));
    document.getElementById('zoom-in').addEventListener('click', () => this.zoomBy(1.25));
    document.getElementById('zoom-out').addEventListener('click', () => this.zoomBy(0.8));
  }

  zoomBy(f) { this.arrangement.setZoom(this.arrangement.pxPerBar * f); }
  zoomFit() { this.arrangement.zoomFit(); }

  /* ---------- audio ---------- */

  enableAudio() {
    this.engine.resume().then(() => {
      const btn = document.getElementById('btn-enable-audio');
      if (this.engine.isRunning) {
        btn.classList.add('hidden');
        this.engine.rebuildAll(this.state.project);
      }
    });
  }

  wireAudioButton() {
    const btn = document.getElementById('btn-enable-audio');
    btn.addEventListener('click', () => this.enableAudio());
    const check = () => {
      if (this.engine.ctx && this.engine.ctx.state === 'running') btn.classList.add('hidden');
      else btn.classList.remove('hidden');
      setTimeout(check, 800);
    };
    check();
  }

  toggleMetronome() {
    this.state.project.metronome = !this.state.project.metronome;
    this.state.emit('project');
  }

  /* ---------- project events ---------- */

  onProjectChanged() {
    clearTimeout(this._rebuildTimer);
    this._rebuildTimer = setTimeout(() => {
      if (this.engine.ctx) this.engine.rebuildAll(this.state.project);
      this.transport.markDirty();
      // Decoding doesn't need a running/resumed context (just an instance),
      // so this can warm the cache before the user hits "Enable Audio".
      preloadProjectAssets(this.engine.ensure().ctx, this.state.project);
    }, 60);
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this.state.persist(), 1500);
  }

  /* ---------- track freeze / bounce-to-audio ---------- */

  async freezeTrack(trackId) {
    const st = this.state;
    const t = st.track(trackId);
    if (!t) return;
    if (t.frozenActive) { toast(`${t.name} is already frozen — unfreeze first to re-render`, true); return; }
    toast(`Freezing ${t.name}…`);
    let buffer;
    try {
      buffer = await renderTrackToBuffer(st.project, t);
    } catch (err) {
      toast('Freeze failed: ' + err.message, true);
      return;
    }
    const assetId = uid('a');
    const bytes = await wavBlob(buffer).arrayBuffer();
    cacheBuffer(assetId, buffer);
    const meta = {
      id: assetId, name: `${t.name} (frozen)`, mime: 'audio/wav',
      durationSec: buffer.duration, sampleRate: buffer.sampleRate, channels: buffer.numberOfChannels
    };
    await putAsset(Object.assign({ bytes }, meta));
    st.registerAsset(meta);
    st.updateTrack(trackId, { frozenActive: true, frozenAssetId: assetId }, { undo: true });
    toast(`${t.name} frozen`);
  }

  unfreezeTrack(trackId) {
    const st = this.state;
    const t = st.track(trackId);
    if (!t || !t.frozenActive) return;
    const oldAssetId = t.frozenAssetId;
    st.updateTrack(trackId, { frozenActive: false, frozenAssetId: null }, { undo: true });
    if (oldAssetId) st.cleanupOrphanAsset(oldAssetId);
    toast(`${t.name} unfrozen`);
  }

  /* ---------- selection-aware actions ---------- */

  duplicateSelection() {
    const st = this.state;
    const ids = st.selection.selectedClipIds || [];
    if (ids.length > 1) {
      st.pushUndo();
      const newIds = [];
      for (const id of ids) {
        const t = st.trackOfClip(id);
        if (!t) continue;
        const copy = st.duplicateClip(t.id, id, { undo: false });
        if (copy) newIds.push(copy.id);
      }
      st.setClipSelection(newIds);
      toast(`${newIds.length} clips duplicated`);
      return;
    }
    const c = st.selectedClip();
    const t = st.selectedTrack();
    if (c && t) { st.duplicateClip(t.id, c.id); toast('Clip duplicated'); }
  }

  deleteSelection() {
    const st = this.state;
    if (st.selection.noteId) {
      const t = st.selectedTrack();
      const c = st.selectedClip();
      if (t && c) st.removeNote(t.id, c.id, st.selection.noteId);
      return;
    }
    const ids = st.selection.selectedClipIds || [];
    if (ids.length > 1) {
      st.pushUndo();
      for (const id of ids) {
        const t = st.trackOfClip(id);
        if (t) st.removeClip(t.id, id, { undo: false });
      }
      st.selection.selectedClipIds = [];
      st.selection.clipId = null;
      st.emit('selection');
      toast(`${ids.length} clips deleted`);
      return;
    }
    const c = st.selectedClip();
    const t = st.selectedTrack();
    if (c && t) st.removeClip(t.id, c.id);
  }

  /* ---------- file ops ---------- */

  newProject(template) {
    if (!confirm('Start a new project? The current one stays in browser storage until overwritten.')) return;
    this.state.newProject(template);
    this.state.persist();
    toast(template === 'empty' ? 'New empty project' : 'Starter sketch loaded');
  }

  openProjectDialog() {
    document.getElementById('file-input').click();
  }

  saveProjectFile() {
    download((this.state.project.name || 'project') + '.dawcat.json', JSON.stringify(this.state.project, null, 2), 'application/json');
    toast('Project JSON downloaded');
  }

  exportProjectJSON() { this.saveProjectFile(); }

  persistProject() {
    this.state.persist();
    toast('Saved to browser storage');
  }

  async exportWav() {
    toast('Rendering WAV…');
    try {
      const blob = await renderProject(this.state.project, (msg) => toast(msg));
      download((this.state.project.name || 'dawcat') + '.wav', blob);
      toast('WAV exported');
    } catch (e) {
      toast('Render failed: ' + e.message, true);
    }
  }

  /* ---------- MIDI import/export ---------- */

  exportMidi() {
    try {
      const bytes = writeMidiFile(this.state.project);
      download((this.state.project.name || 'dawcat') + '.mid', bytes, 'audio/midi');
      toast('MIDI exported (notes only — drum lanes, FX and automation don\'t survive .mid)');
    } catch (e) {
      toast('MIDI export failed: ' + e.message, true);
    }
  }

  importMidiDialog() {
    document.getElementById('midi-input').click();
  }

  async importMidiFile(file) {
    let result;
    try {
      result = parseMidiFile(await file.arrayBuffer());
    } catch (e) {
      toast('Could not parse MIDI file: ' + e.message, true);
      return;
    }
    if (!result.tracks.length) { toast('No note events found in that MIDI file', true); return; }
    const st = this.state;
    let lastTrack = null;
    for (const mt of result.tracks) {
      const t = st.addTrack({ name: mt.name });
      const endBeat = mt.notes.reduce((m, n) => Math.max(m, n.start + n.len), 0.25);
      const lengthBars = Math.max(1, Math.ceil(endBeat / 4));
      const notes = mt.notes.map((n) => ({ id: uid('n'), midi: n.midi, start: n.start, len: n.len, vel: n.vel }));
      st.addClip(t.id, { name: mt.name, start: 0, length: lengthBars, notes });
      lastTrack = t;
    }
    if (lastTrack) st.select(lastTrack.id);
    toast(`Imported ${result.tracks.length} track(s) from MIDI (${result.bpm} BPM in file — project tempo unchanged)`);
  }

  /* ---------- game bridge ---------- */

  async rescanCues() {
    toast('Scanning game source for music cues…');
    try {
      const scan = await scanGameCues();
      this.state.project.cueScan = scan;
      this.state.emit('project');
      if (scan.cues.length) toast(`Found ${scan.cues.length} cues across ${scan.files.length} files`);
      else toast('No cues found — serve dawCAT over HTTP next to the game', true);
    } catch (e) {
      toast('Scan failed: ' + e.message, true);
    }
  }

  exportToGameDialog() {
    const st = this.state;
    const p = st.project;

    const sceneInput = el('input', {
      type: 'text', value: p.scene || 'Overworld', placeholder: 'Overworld',
      title: 'Which game scene this arrangement is for. Type a new name to prep a variation for a scene the game doesn\'t have yet.'
    });
    const todSelect = el('select', { title: 'Which time of day this export targets' },
      el('option', { value: '', text: 'All (full day cycle)' }),
      el('option', { value: 'dawn', text: 'Dawn' }),
      el('option', { value: 'day', text: 'Day' }),
      el('option', { value: 'dusk', text: 'Dusk' }),
      el('option', { value: 'night', text: 'Night' })
    );
    todSelect.value = p.timeOfDay || '';
    const targetRow = el('div', { class: 'form-row' },
      el('label', { class: 'dim' }, 'Scene ', sceneInput),
      el('label', { class: 'dim' }, 'Time of Day ', todSelect)
    );

    const secInputs = {};
    const secRow = el('div', { class: 'form-row' });
    for (const ph of ['dawn', 'day', 'dusk', 'night']) {
      const inp = el('input', { type: 'number', min: '-1', max: '999', value: String(p.sections[ph] == null ? -1 : p.sections[ph]), title: 'Bar where this phase starts (-1 = ignore)' });
      secInputs[ph] = inp;
      secRow.append(el('label', { class: 'dim' }, `${ph} `, inp));
    }
    const syncSecRowVisibility = () => secRow.classList.toggle('hidden', !!todSelect.value);
    todSelect.addEventListener('change', syncSecRowVisibility);
    syncSecRowVisibility();

    const hasImportedAudio = p.tracks.some((t) => t.clips.some((c) => c.audio && c.audio.assetId));
    const note = el('div', { class: 'hintbox' });
    note.innerHTML = [
      '<b>1 · Instant preview (no file changes):</b> click the game tab once to unlock audio, open its DevTools console, paste the hot-swap snippet, press Enter.',
      '<b>2 · Permanent:</b> download <code>music.js</code>, replace the game\'s <code>src/music.js</code> with it, hard-refresh the game (Ctrl+Shift+R). Same MusicDirector API — no other game code changes.',
      '<b>3 · Archive:</b> download the flattened track JSON for reference/tooling — it is <b>not</b> a project file and can\'t be re-opened as an editable project; use File ▸ Save Project for that.',
      '<b>Scene / Time of Day:</b> tags this export so you can tell variations apart. Picking a specific Time of Day ignores the day-phase seeking below and just loops that one variant — the game only has one scene/cycle today, so other variants are for scenes it grows into later.',
      'Day-phase seeking (full-cycle exports only): set the bar where each phase starts (−1 = ignore that phase).',
      hasImportedAudio ? '⚠ This project has drag-and-dropped audio clips — those play back in the editor but are <b>not</b> included in any game export (synth notes, drum steps and built-in samples only).' : ''
    ].filter(Boolean).map((s) => `<div>${s}</div>`).join('');

    const copyBtn = el('button', { class: 'btn primary', text: '📋 Copy Hot-Swap Snippet' });
    copyBtn.addEventListener('click', async () => {
      applyMapping();
      const { snippet } = exportToGame(st.project);
      await copyText(snippet);
      toast('Snippet copied — paste it in the game tab console');
    });
    const musicBtn = el('button', { class: 'btn', text: '⬇ Download music.js' });
    musicBtn.addEventListener('click', () => {
      applyMapping();
      const { musicJS } = exportToGame(st.project);
      download(musicFileName(st.project), musicJS, 'text/javascript');
      toast('music.js downloaded — replace the game\'s src/music.js, then hard-refresh');
    });
    const jsonBtn = el('button', { class: 'btn', text: '⬇ Download Track JSON' });
    jsonBtn.addEventListener('click', () => {
      applyMapping();
      const { payload } = exportToGame(st.project);
      download(jsonFileName(st.project), JSON.stringify(payload, null, 2), 'application/json');
    });

    function applyMapping() {
      st.project.scene = sceneInput.value.trim() || 'Overworld';
      st.project.timeOfDay = todSelect.value || null;
      for (const ph of ['dawn', 'day', 'dusk', 'night']) {
        const v = parseInt(secInputs[ph].value, 10);
        st.project.sections[ph] = isNaN(v) ? -1 : v;
      }
    }

    showModal({
      title: 'Export to Game',
      wide: true,
      body: el('div', {}, targetRow, secRow, note, el('div', { class: 'form-row' }, copyBtn, musicBtn, jsonBtn)),
      buttons: [{ label: 'Close' }]
    });
  }

  /* ---------- AI composition agent ---------- */

  getAgentContext() {
    const p = this.state.project;
    const gameCues = ((p.cueScan && p.cueScan.cues) || [])
      .filter((c) => c.kind === 'phase')
      .map((c) => ({ scene: c.scene, timeOfDay: c.timeOfDay, name: c.name, rootHz: c.rootHz, chord: c.chord, scale: c.scale }));
    // Full clip content (not just a count) so Remix mode has real material to
    // rework — actual note/step data, capped generously so a normal project
    // never truncates but a pathological one can't blow up the request.
    const tracksTruncated = p.tracks.length > 24;
    const tracks = p.tracks.slice(0, 24).map((t) => {
      const clipsTruncated = t.clips.length > 16;
      return {
        id: t.id, name: t.name, kind: t.kind,
        preset: t.kind === 'synth' ? t.preset.kind : null,
        drumKit: t.kind === 'drum' ? t.drumKit : null,
        volume: t.volume, pan: t.pan, mute: t.mute, solo: t.solo,
        devices: t.devices.map((d) => d.type),
        clips: t.clips.slice(0, 16).map((c) => {
          const notesTruncated = !!(c.notes && c.notes.length > 64);
          return {
            id: c.id, name: c.name, start: c.start, length: c.length, loop: c.loop, loopLen: c.loopLen,
            notes: c.notes && c.notes.length ? c.notes.slice(0, 64).map((n) => ({ midi: n.midi, start: n.start, len: n.len, vel: n.vel })) : undefined,
            notesTruncated: notesTruncated || undefined,
            steps: c.steps ? compactSteps(c.steps) : undefined,
            sample: c.sample || undefined
          };
        }),
        clipsTruncated: clipsTruncated || undefined
      };
    });
    return {
      editor: 'dawCAT',
      tempo: p.tempo, key: p.key, scale: p.scale, swing: p.swing, timeSig: `${p.timeSigNum}/${p.timeSigDen}`,
      selection: this.state.selection.trackId,
      master: { volume: p.master.volume },
      tracks, tracksTruncated: tracksTruncated || undefined,
      gameCues: gameCues.slice(0, 12),
      constraints: { maxActions: 40, reversible: true }
    };
  }

  findAgentTrack(target) {
    const st = this.state;
    if (!target || target === 'selection') return st.selectedTrack();
    return st.track(target);
  }

  executeAgentAction(action) {
    const st = this.state;
    const p = action.params || {};
    if (action.type === 'addTrack') {
      const kind = p.kind === 'drum' ? 'drum' : 'synth';
      const presetKind = ['pluck', 'pad', 'lead', 'bass', 'keys', 'chime'].includes(p.preset) ? p.preset : 'pluck';
      const t = st.addTrack({
        name: String(p.name || (kind === 'drum' ? 'Drums' : 'Synth')),
        kind,
        preset: kind === 'synth' ? defaultSynthPreset(presetKind) : null,
        drumKit: ['soft', 'punch', 'lofi'].includes(p.drumKit) ? p.drumKit : 'soft'
      });
      st.select(t.id);
      return;
    }
    if (action.type === 'deleteClip') {
      const [trackId, clipId] = String(action.target || '').split(':');
      if (!trackId || !clipId) throw new Error('deleteClip target must be "trackId:clipId"');
      st.removeClip(trackId, clipId);
      return;
    }
    // Project-level actions need no track at all — must run before the
    // findAgentTrack requirement below, or a plan containing only one of
    // these (nothing selected yet) would wrongly fail to resolve "selection".
    if (action.type === 'setTempo') { st.project.tempo = clampRange(Number(p.bpm), 40, 220); st.emit('project'); return; }
    if (action.type === 'setKeyScale') {
      if (p.key) st.project.key = String(p.key);
      if (p.scale && SCALES[p.scale]) st.project.scale = p.scale;
      st.emit('project');
      return;
    }
    if (action.type === 'setSwing') { st.project.swing = clampRange(Number(p.swing), 0, 1); st.emit('project'); return; }
    if (action.type === 'setMaster') { st.project.master.volume = clampRange(Number(p.volume), 0, 1); st.emit('project'); return; }
    const t = this.findAgentTrack(action.target);
    if (!t) throw new Error(`Agent target track not found: ${action.target}`);
    if (action.type === 'renameTrack') { st.updateTrack(t.id, { name: String(p.name || t.name) }); return; }
    if (action.type === 'deleteTrack') { st.removeTrack(t.id); return; }
    if (action.type === 'setTrackMix') {
      const patch = {};
      if (p.volume != null) patch.volume = clampRange(Number(p.volume), 0, 1);
      if (p.pan != null) patch.pan = clampRange(Number(p.pan), -1, 1);
      if (p.mute != null) patch.mute = Boolean(p.mute);
      if (p.solo != null) patch.solo = Boolean(p.solo);
      if (p.sends) patch.sends = { a: clampRange(Number(p.sends.a ?? t.sends.a), 0, 1), b: clampRange(Number(p.sends.b ?? t.sends.b), 0, 1) };
      st.updateTrack(t.id, patch);
      return;
    }
    if (action.type === 'setTrackPreset') {
      if (t.kind !== 'synth') throw new Error(`setTrackPreset needs a synth track, "${t.name}" is a drum track`);
      const kind = ['pluck', 'pad', 'lead', 'bass', 'keys', 'chime'].includes(p.preset) ? p.preset : t.preset.kind;
      const preset = Object.assign(defaultSynthPreset(kind), p.patch && typeof p.patch === 'object' ? p.patch : {});
      st.updateTrack(t.id, { preset });
      return;
    }
    if (action.type === 'addDevice') {
      const type = ['eq8', 'comp', 'delay', 'reverb', 'filter', 'chorus', 'utility'].includes(p.type) ? p.type : null;
      if (!type) throw new Error(`Unknown device type: ${p.type}`);
      st.addDevice(t.id, type);
      return;
    }
    if (action.type === 'setDeviceParams') {
      const type = ['eq8', 'comp', 'delay', 'reverb', 'filter', 'chorus', 'utility'].includes(p.type) ? p.type : null;
      if (!type) throw new Error(`Unknown device type: ${p.type}`);
      let dev = t.devices.find((d) => d.type === type);
      if (!dev) dev = st.addDevice(t.id, type);
      const params = Object.assign({}, dev.params, p.params && typeof p.params === 'object' ? p.params : {});
      st.updateDevice(t.id, dev.id, { params });
      return;
    }
    if (action.type === 'addClip') {
      const length = Math.max(0.25, Number(p.length ?? 4));
      const patch = {
        name: p.name ? String(p.name) : undefined,
        start: Math.max(0, Number(p.start ?? 0)),
        length,
        loop: !!p.loop,
        loopLen: Math.max(1, Number(p.loopLen ?? length * 4))
      };
      if (t.kind === 'drum') {
        patch.steps = buildStepsFromPattern(p.steps);
      } else {
        if (!Array.isArray(p.notes) || !p.notes.length) throw new Error(`addClip on synth track "${t.name}" needs a notes array`);
        patch.notes = p.notes.map((n) => ({
          id: uid('n'),
          midi: clampRange(Math.round(Number(n.midi)), 0, 127),
          start: Math.max(0, Number(n.start ?? 0)),
          len: Math.max(0.05, Number(n.len ?? 0.5)),
          vel: clampRange(Number(n.vel ?? 0.8), 0, 1)
        }));
      }
      const clip = st.addClip(t.id, patch);
      st.select(t.id, clip.id);
      return;
    }
  }

  async executeAgentPlan(plan) {
    const st = this.state;
    let count = 0;
    st.applyBatch(() => {
      for (const action of plan.actions) { this.executeAgentAction(action); count++; }
    });
    return count;
  }

  previewSfxDialog() {
    const names = ['meow', 'purr', 'trill', 'hiss', 'chirp', 'lap', 'bell', 'keychime', 'collect', 'dream', 'splash', 'door', 'eat', 'squawk', 'unlock', 'footstep'];
    const grid = el('div', { class: 'sfx-grid' });
    for (const n of names) {
      const b = el('button', { class: 'btn', text: '▶ ' + n });
      b.addEventListener('click', () => {
        this.engine.resume();
        if (this.engine.ctx) this.engine.sfx(n, this.engine.ctx.currentTime + 0.05, 1);
      });
      grid.append(b);
    }
    showModal({ title: 'Preview Game SFX', body: grid, buttons: [{ label: 'Close' }] });
  }

  showShortcuts() {
    const rows = [
      ['Space', 'Play / Stop'],
      ['Home', 'Return to start'],
      ['Ctrl+Z', 'Undo'],
      ['Ctrl+Shift+Z / Ctrl+Y', 'Redo'],
      ['Ctrl+D', 'Duplicate selected clip'],
      ['Delete', 'Delete selected clip / note'],
      ['Ctrl+S', 'Save to browser'],
      ['A W S E D F T G Y H U J K', 'Musical typing (records when armed)'],
      ['Ctrl+Wheel', 'Zoom timeline'],
      ['Alt+drag clip', 'Duplicate on drop']
    ];
    const body = el('div', { class: 'kbd-list' });
    for (const [k, d] of rows) {
      body.append(el('div', { class: 'kbd-row' }, el('span', { class: 'key', text: k }), el('span', { text: d })));
    }
    showModal({ title: 'Keyboard Shortcuts', body, buttons: [{ label: 'Close' }] });
  }

  showImportHelp() {
    const body = el('div', {});
    const items = [
      '<b>Quick preview:</b> File ▸ Export to Game… ▸ “Copy Hot-Swap Snippet” ▸ open the game tab ▸ F12 console ▸ paste ▸ Enter. Your arrangement replaces the generative music immediately — nothing is written to disk.',
      '<b>Permanent:</b> in the same dialog, “Download music.js”, replace the game\'s <code>src/music.js</code> with it, hard-refresh (Ctrl+Shift+R). It implements the exact MusicDirector API the game already calls.',
      '<b>Day phases:</b> map dawn/day/dusk/night to arrangement bars in the export dialog — the in-game clock seeks the player to each section.',
      '<b>Rescan:</b> Browser ▸ Game Cues reads the game\'s actual scales/chords/SFX from ../src/*.js — press ⟳ Rescan after changing game code.'
    ];
    for (const s of items) {
      const box = el('div', { class: 'hintbox' });
      box.innerHTML = s;
      body.append(box);
    }
    showModal({ title: 'Import Your Track into the Game', body, wide: true, buttons: [{ label: 'Got it' }] });
  }

  showAbout() {
    const box = el('div', { class: 'hintbox' });
    box.innerHTML = 'A tiny Ableton-style DAW built for <i>Michi-Neko: The Cat Philosopher\'s Path</i>. Compose with the game\'s own musical DNA, then export straight back into it. Pure Web Audio — no dependencies, no build step.';
    showModal({ title: 'dawCAT · Web Audio Studio', body: box, buttons: [{ label: 'Close' }] });
  }

  /* ---------- shortcuts ---------- */

  wireShortcuts() {
    const TYPE_KEYS = { a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66, g: 67, y: 68, h: 69, u: 70, j: 71, k: 72, o: 72, l: 74, p: 76 };
    window.addEventListener('keydown', (e) => {
      const tag = document.activeElement ? document.activeElement.tagName : '';
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(tag)) return;
      const st = this.state;
      if (e.code === 'Space') {
        e.preventDefault();
        this.transport.toggle();
      } else if (e.key === 'Home') {
        this.transport.rewind();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        st.redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        this.duplicateSelection();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        st.persist();
        toast('Saved to browser');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        this.deleteSelection();
      } else if (TYPE_KEYS[e.key.toLowerCase()] != null && !e.ctrlKey && !e.metaKey) {
        const midi = TYPE_KEYS[e.key.toLowerCase()];
        const t = st.selectedTrack();
        if (t && t.kind === 'synth') {
          this.engine.resume();
          this.engine.preview(t.preset, midi);
          if (this.transport.recording) this.transport.recordNote(midi);
        }
      }
    });
  }
}

/* ---------------- helpers ---------------- */

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    return true;
  }
}

/* ---------------- boot ---------------- */

const app = new App();
window.dawcat = app;
app.init();
