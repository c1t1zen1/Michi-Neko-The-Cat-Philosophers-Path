/* dawCAT — browser sidebar: sounds, drums, effects, samples, game cues, library */
import { el, toast, ctxMenu } from './common.js';
import { SCALES, hzToMidi, midiToName, defaultSynthPreset, uid } from '../state.js';

const PRESETS = [
  { name: 'Koto Pluck', preset: defaultSynthPreset('pluck') },
  { name: 'Warm Pad', preset: defaultSynthPreset('pad') },
  { name: 'Saw Lead', preset: defaultSynthPreset('lead') },
  { name: 'Sub Bass', preset: defaultSynthPreset('bass') },
  { name: 'Soft Keys', preset: defaultSynthPreset('keys') },
  { name: 'Dream Chime', preset: defaultSynthPreset('chime') }
];
const KITS = [
  { name: 'Soft Kit', kit: 'soft' },
  { name: 'Punch Kit', kit: 'punch' },
  { name: 'Lo-fi Kit', kit: 'lofi' }
];
const DEVICES = [
  { type: 'eq8', name: 'EQ Eight', icon: '🎚' },
  { type: 'comp', name: 'Compressor', icon: '📉' },
  { type: 'delay', name: 'Delay', icon: '🔁' },
  { type: 'reverb', name: 'Reverb', icon: '🏛' },
  { type: 'filter', name: 'Auto Filter', icon: '🎚' },
  { type: 'chorus', name: 'Chorus-Ensemble', icon: '🌊' },
  { type: 'utility', name: 'Utility', icon: '🎚' }
];
const SAMPLES = [
  { name: 'Rain', sample: 'rain', icon: '🌧' },
  { name: 'Wind', sample: 'wind', icon: '🍃' },
  { name: 'Birds', sample: 'birds', icon: '🐦' },
  { name: 'Wind Chimes', sample: 'chimes', icon: '🎐' },
  { name: 'Purr', sample: 'purr', icon: '🐱' }
];
const GROOVES = [
  { name: 'Straight', swing: 0 },
  { name: 'Light 58%', swing: 0.1 },
  { name: 'Medium 62%', swing: 0.2 },
  { name: 'Heavy 66%', swing: 0.32 }
];
const TEMPLATES = [
  { name: 'Empty Project', template: 'empty' },
  { name: 'Starter Sketch', template: 'starter' }
];

export class Browser {
  constructor(app) {
    this.app = app;
    this.tree = document.getElementById('browser-tree');
    this.searchInput = document.getElementById('browser-search');
    this.openCats = new Set(['Sounds', 'Game Cues', 'Game Cues:Overworld', 'Game Cues:Overworld:tod', 'Current Project']);
    this.filter = '';

    document.getElementById('btn-rescan').addEventListener('click', () => this.app.rescanCues());
    this.searchInput.addEventListener('input', () => {
      this.filter = this.searchInput.value.trim().toLowerCase();
      this.render();
    });
    document.querySelectorAll('[data-bt]').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('[data-bt]').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const isSearch = tab.dataset.bt === 'search';
        document.getElementById('browser-search-row').classList.toggle('hidden', !isSearch);
        if (isSearch) {
          this.searchInput.focus();
        } else if (this.filter) {
          this.searchInput.value = '';
          this.filter = '';
          this.render();
        }
      });
    });

    this.app.state.addEventListener('project', () => this.render());
    this.render();
  }

  render() {
    this.tree.innerHTML = '';
    this._filterMatchCount = 0;
    const p = this.app.state.project;
    const cues = (p.cueScan && p.cueScan.cues) || [];

    this.category('Sounds', '🎹', PRESETS.map((pr) => ({
      label: pr.name, icon: '♪', sub: 'preset',
      onClick: () => this.app.engine.preview(pr.preset, 64),
      drag: { kind: 'preset', preset: pr.preset, name: pr.name }
    })));

    this.category('Drums', '🥁', KITS.map((k) => ({
      label: k.name, icon: '🥁', sub: 'kit',
      onClick: () => this.app.engine.previewDrum('kick', k.kit),
      drag: { kind: 'kit', kit: k.kit, name: k.name }
    })));

    this.category('Instruments', '🎛', PRESETS.map((pr) => ({
      label: pr.name, icon: '🎹', sub: 'track',
      onClick: () => this.applyPreset(pr.preset, pr.name),
      drag: { kind: 'presetNewTrack', preset: pr.preset, name: pr.name }
    })));

    this.category('Audio Effects', 'FX', DEVICES.map((d) => ({
      label: d.name, icon: d.icon, sub: 'device',
      onClick: () => this.addDeviceToSelected(d.type),
      drag: { kind: 'device', type: d.type, name: d.name }
    })));

    const scaleItems = Object.keys(SCALES).map((s) => ({
      label: `${p.key} ${s}`, icon: '🎼', sub: 'scale',
      onClick: () => { p.scale = s; this.app.state.emit('project'); toast(`Scale: ${p.key} ${s}`); }
    }));
    for (const cue of cues.filter((c) => c.kind === 'phase' || c.kind === 'scale')) {
      scaleItems.push({
        label: `${cue.name} (game)`, icon: '🈁', sub: 'scale',
        onClick: () => this.previewCue(cue),
        drag: { kind: 'cue', cueId: cue.id },
        cue
      });
    }
    this.category('MIDI Effects', '🎼', scaleItems);

    this.category('Samples', '📦', SAMPLES.map((s) => ({
      label: s.name, icon: s.icon, sub: 'loop',
      onClick: () => this.previewSample(s.sample),
      drag: { kind: 'sample', sample: s.sample, name: s.name }
    })));

    this.renderGameCuesTree(cues);

    this.category('Clips', '📋', this.savedClips().map((sc) => ({
      label: sc.name, icon: '📎', sub: sc.kind,
      onClick: () => this.pasteClip(sc.clip),
      drag: { kind: 'clip', clip: sc.clip }
    })));

    this.category('Grooves', '🌀', GROOVES.map((g) => ({
      label: g.name, icon: '🌀', sub: `${Math.round(g.swing * 100)}%`,
      onClick: () => { p.swing = g.swing; this.app.state.emit('project'); toast(`Groove: ${g.name}`); }
    })));

    this.category('Templates', '📄', TEMPLATES.map((t) => ({
      label: t.name, icon: '📄', sub: 'new',
      onClick: () => this.app.newProject(t.template)
    })));

    const lib = this.savedProjects();
    this.category('User Library', '💾', [
      { label: '＋ Save current project', icon: '💾', onClick: () => this.saveProjectToLibrary() },
      ...lib.map((entry) => ({
        label: entry.name, icon: '💾', sub: new Date(entry.at).toLocaleDateString(),
        onClick: () => {
          if (this.app.state.loadJSON(entry.data)) toast(`Loaded "${entry.name}"`);
          else toast(`Could not load "${entry.name}" — saved data looks corrupted`, true);
        },
        ctx: () => [{ label: 'Delete', onClick: () => this.deleteSavedProject(entry) }]
      }))
    ]);

    const projItems = [];
    for (const t of p.tracks) {
      projItems.push({
        label: t.name, icon: t.kind === 'drum' ? '🥁' : '🎹', sub: `${t.clips.length}`,
        onClick: () => this.app.state.select(t.id)
      });
      for (const c of t.clips) {
        projItems.push({
          label: c.name || 'Clip', icon: '▭', sub: `${c.length}b`, indent: true,
          onClick: () => { this.app.state.select(t.id, c.id); this.app.openClipEditor(c.id); },
          drag: { kind: 'clip', clip: JSON.parse(JSON.stringify(c)) }
        });
      }
    }
    this.category('Current Project', '🐈', projItems);

    if (this.filter && this._filterMatchCount === 0) {
      this.tree.append(el('div', { class: 'bscan-note', text: `No results for "${this.filter}".` }));
    }
  }

  category(name, icon, items, emptyNote = null) {
    const matches = this.filter
      ? items.filter((it) => it.label.toLowerCase().includes(this.filter))
      : items;
    if (this.filter) this._filterMatchCount += matches.length;
    if (this.filter && !matches.length) return;
    const itemsEl = this.categoryShell(this.tree, name, icon, items.length, name, 0);
    if (emptyNote) itemsEl.append(el('div', { class: 'bscan-note', text: emptyNote }));
    for (const item of matches) itemsEl.append(this.row(item));
  }

  /* Builds one collapsible category head + its (empty) item container, appended
     into `container`. Returns the item container so callers can either drop leaf
     rows into it (see category()) or nest further categoryShell()s for a
     sub-grouped tree (see renderGameCuesTree()). `indent` shifts the header left
     padding one notch per nesting level. */
  categoryShell(container, name, icon, count, key, indent = 0) {
    const open = this.openCats.has(key) || !!this.filter;
    const head = el('div', {
      class: 'bcat-head',
      style: indent ? `padding-left:${8 + indent * 14}px` : null
    },
      el('span', { class: 'caret', text: open ? '▾' : '▸' }),
      el('span', { class: 'bicon', text: icon }),
      el('span', { text: name }),
      this.filter ? null : el('span', { class: 'count', text: String(count) })
    );
    const cat = el('div', { class: 'bcat' + (open ? ' open' : '') }, head);
    head.addEventListener('click', () => {
      if (this.openCats.has(key)) this.openCats.delete(key);
      else this.openCats.add(key);
      this.render();
    });
    const itemsEl = el('div', { class: 'bcat-items' });
    cat.append(itemsEl);
    container.append(cat);
    return itemsEl;
  }

  /* Game Cues, grouped Scene > (Time of Day | Sounds) > cue, so a future scene
     scanned into a new `cue.scene` gets its own group automatically. */
  renderGameCuesTree(cues) {
    const matches = this.filter ? cues.filter((c) => c.name.toLowerCase().includes(this.filter)) : cues;
    if (this.filter) this._filterMatchCount += matches.length;
    if (this.filter && !matches.length) return;

    const itemsEl = this.categoryShell(this.tree, 'Game Cues', '🐾', cues.length, 'Game Cues', 0);

    if (!matches.length) {
      itemsEl.append(el('div', { class: 'bscan-note', text: 'Rescan to read music cues from ../src/*.js — serve dawCAT over HTTP next to the game.' }));
      return;
    }

    const byScene = new Map();
    for (const cue of matches) {
      const scene = cue.scene || 'Overworld';
      if (!byScene.has(scene)) byScene.set(scene, []);
      byScene.get(scene).push(cue);
    }

    const TOD_ORDER = ['dawn', 'day', 'dusk', 'night'];
    for (const [scene, sceneCues] of byScene) {
      const sceneItemsEl = this.categoryShell(itemsEl, scene, '🗺', sceneCues.length, `Game Cues:${scene}`, 1);

      const todCues = sceneCues.filter((c) => c.timeOfDay)
        .sort((a, b) => TOD_ORDER.indexOf(a.timeOfDay) - TOD_ORDER.indexOf(b.timeOfDay));
      const soundCues = sceneCues.filter((c) => !c.timeOfDay);

      if (todCues.length) {
        const todItemsEl = this.categoryShell(sceneItemsEl, 'Time of Day', '🕐', todCues.length, `Game Cues:${scene}:tod`, 2);
        for (const cue of todCues) todItemsEl.append(this.row(this.cueRow(cue)));
      }
      if (soundCues.length) {
        const soundItemsEl = this.categoryShell(sceneItemsEl, 'Sounds', '🔊', soundCues.length, `Game Cues:${scene}:sfx`, 2);
        for (const cue of soundCues) soundItemsEl.append(this.row(this.cueRow(cue)));
      }
    }
  }

  cueRow(cue) {
    return {
      label: cue.name, icon: cueIcon(cue), sub: cue.kind,
      onClick: () => this.previewCue(cue),
      drag: { kind: 'cue', cueId: cue.id },
      cue
    };
  }

  row(item) {
    const row = el('div', {
      class: 'bitem' + (item.indent ? ' indent' : ''),
      draggable: item.drag ? 'true' : null
    },
      el('span', { class: 'bicon', text: item.icon }),
      el('span', { class: 'blabel', text: item.label }),
      item.sub ? el('span', { class: 'bsub', text: item.sub }) : null
    );
    if (item.onClick) row.addEventListener('click', () => item.onClick());
    if (item.ctx) {
      row.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        ctxMenu(e.clientX, e.clientY, item.ctx());
      });
    }
    if (item.cue) {
      row.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const opts = [
          { label: '▶ Preview', onClick: () => this.previewCue(item.cue) },
          { label: '→ Clip on selected track', onClick: () => this.cueToClip(item.cue) },
          { label: '→ Instrument preset', onClick: () => this.cueToPreset(item.cue) }
        ];
        if (item.cue.kind === 'phase') {
          opts.push({ label: '🆕 Load as new project', onClick: () => this.loadCueAsProject(item.cue) });
        }
        ctxMenu(e.clientX, e.clientY, opts);
      });
    }
    if (item.drag) {
      row.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify(item.drag));
        e.dataTransfer.effectAllowed = 'copy';
      });
    }
    return row;
  }

  /* ---------- actions ---------- */

  applyPreset(preset, name) {
    const t = this.app.state.selectedTrack();
    if (!t || t.kind !== 'synth') { toast('Select a synth track first', true); return; }
    this.app.state.updateTrack(t.id, { preset: JSON.parse(JSON.stringify(preset)) });
    toast(`${name} loaded into ${t.name}`);
  }

  addDeviceToSelected(type) {
    const t = this.app.state.selectedTrack();
    if (!t) { toast('Select a track first', true); return; }
    this.app.state.addDevice(t.id, type);
  }

  previewSample(name) {
    const e = this.app.engine;
    e.resume();
    if (!e.ctx) { toast('Enable audio first', true); return; }
    e.ambient(name, e.ctx.currentTime + 0.05, 5, 1);
  }

  previewCue(cue) {
    const e = this.app.engine;
    e.resume();
    if (!e.ctx) { toast('Enable audio first', true); return; }
    const t = e.ctx.currentTime + 0.05;
    if (cue.kind === 'sfx') {
      e.sfx(sfxNameFor(cue), t, 1);
    } else if (cue.kind === 'ambient') {
      e.ambient(ambientNameFor(cue), t, 6, 1);
    } else if (cue.kind === 'phase' || cue.kind === 'scale') {
      const rootMidi = cue.rootHz ? hzToMidi(cue.rootHz) : 48;
      const scale = cue.scale && cue.scale.length ? cue.scale : [0, 3, 5, 7, 10];
      scale.forEach((semi, i) => {
        setTimeout(() => e.preview(defaultSynthPreset('pluck'), rootMidi + 24 + semi + (i > 4 ? 12 : 0)), i * 140);
      });
    } else if (cue.midi && cue.midi.length) {
      cue.midi.forEach((m, i) => {
        setTimeout(() => e.preview(defaultSynthPreset('keys'), m), i * 160);
      });
    } else if (cue.hz && cue.hz.length) {
      toast(`${cue.name}: ${cue.hz.map((h) => h.toFixed(0) + 'Hz').join(', ')}`);
    }
  }

  cueToClip(cue) {
    const st = this.app.state;
    const t = st.selectedTrack();
    if (!t) { toast('Select a track first', true); return; }
    const spec = cueToClipSpec(cue);
    if (t.kind === 'drum' && !spec.patch.steps && !spec.patch.sample) {
      toast('This cue needs a synth track', true);
      return;
    }
    const clip = st.addClip(t.id, spec.patch);
    if (spec.presetPatch && t.kind === 'synth') {
      st.updateTrack(t.id, { preset: Object.assign({}, t.preset, spec.presetPatch) });
    }
    st.select(t.id, clip.id);
    toast(`Imported "${cue.name}" → ${t.name}`);
  }

  cueToPreset(cue) {
    const st = this.app.state;
    const t = st.selectedTrack();
    if (!t || t.kind !== 'synth') { toast('Select a synth track first', true); return; }
    const preset = Object.assign({}, t.preset);
    if (cue.kind === 'phase') {
      if (cue.rootHz) preset.rootMidi = hzToMidi(cue.rootHz);
      if (cue.cutoff) preset.cutoff = cue.cutoff;
    }
    st.updateTrack(t.id, { preset });
    toast(`${cue.name} → preset on ${t.name}`);
  }

  loadCueAsProject(cue) {
    if (!confirm(`Load "${cue.name}" as a new project? The current project stays in browser storage until overwritten.`)) return;
    const st = this.app.state;
    const proj = buildProjectFromPhaseCue(cue, st.project);
    st.setProject(proj);
    toast(`Loaded "${cue.name}" → new project (Pad + Pluck tracks, ${proj.scene}/${proj.timeOfDay})`);
  }

  pasteClip(clipData, trackId = null, startBar = null) {
    const st = this.app.state;
    const t = trackId ? st.track(trackId) : st.selectedTrack();
    if (!t) { toast('Select a track first', true); return; }
    const copy = JSON.parse(JSON.stringify(clipData));
    copy.id = uid('c');
    if (startBar != null) copy.start = startBar;
    copy.notes.forEach((n) => { n.id = uid('n'); });
    const clip = st.addClip(t.id, copy);
    if (clip) st.select(t.id, clip.id);
    toast(`Pasted "${clipData.name || 'clip'}" → ${t.name}`);
  }

  saveClipToLibrary(clip, trackKind) {
    const lib = this.savedClips();
    lib.unshift({ name: clip.name || 'Clip', at: Date.now(), trackKind, clip: JSON.parse(JSON.stringify(clip)) });
    try { localStorage.setItem('dawcat_clips_v1', JSON.stringify(lib.slice(0, 40))); } catch (e) { toast('Storage full', true); }
    toast('Clip saved to library');
    this.render();
  }

  savedClips() {
    try { return JSON.parse(localStorage.getItem('dawcat_clips_v1') || '[]'); } catch (e) { return []; }
  }

  savedProjects() {
    try { return JSON.parse(localStorage.getItem('dawcat_projects_v1') || '[]'); } catch (e) { return []; }
  }

  saveProjectToLibrary() {
    const p = this.app.state.project;
    const lib = this.savedProjects();
    lib.unshift({ name: p.name || 'Untitled', at: Date.now(), data: this.app.state.serialize() });
    try { localStorage.setItem('dawcat_projects_v1', JSON.stringify(lib.slice(0, 20))); } catch (e) { toast('Storage full', true); }
    toast('Project saved to User Library');
    this.render();
  }

  deleteSavedProject(entry) {
    const lib = this.savedProjects().filter((x) => x !== entry);
    localStorage.setItem('dawcat_projects_v1', JSON.stringify(lib));
    this.render();
  }
}

/* ---------------- cue helpers ---------------- */

/* Deterministic (seeded) pluck-melody generator shared by cueToClipSpec()'s
   single-clip import and buildProjectFromPhaseCue()'s full-project import, so
   both produce the same phrase for a given phase cue. */
function generatePluckPattern(rootMidi, scale, spanBeats = 16) {
  const notes = [];
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  let t = 0;
  while (t < spanBeats) {
    const deg = scale[Math.floor(rnd() * scale.length)];
    const oct = rnd() < 0.3 ? 12 : 0;
    notes.push({ id: uid('n'), midi: rootMidi + 24 + deg + oct, start: t, len: 0.5 + rnd() * 0.5, vel: 0.55 + rnd() * 0.3 });
    t += 0.5 + rnd() * 0.75;
  }
  return notes;
}

export function cueToClipSpec(cue) {
  if (cue.kind === 'phase' || cue.kind === 'scale') {
    const rootMidi = cue.rootHz ? hzToMidi(cue.rootHz) : 48;
    const scale = cue.scale && cue.scale.length ? cue.scale : [0, 3, 5, 7, 10];
    const notes = generatePluckPattern(rootMidi, scale);
    return {
      patch: { name: `${cue.name} Pluck`, start: 0, length: 4, loop: true, loopLen: 16, notes },
      presetPatch: cue.cutoff ? { cutoff: cue.cutoff } : null
    };
  }
  if (cue.kind === 'chord') {
    const root = cue.rootHz || (cue.hz && cue.hz[0]) || 130.81;
    const rootMidi = hzToMidi(root);
    const chord = cue.chord && cue.chord.length ? cue.chord : [0, 7, 12, 16];
    const notes = chord.map((semi, i) => ({ id: uid('n'), midi: rootMidi + semi, start: 0, len: 3.8, vel: 0.5 + i * 0.04 }));
    return { patch: { name: `${cue.name} Pad`, start: 0, length: 4, notes }, presetPatch: null };
  }
  if (cue.kind === 'notes' && cue.midi && cue.midi.length) {
    const notes = cue.midi.map((m, i) => ({ id: uid('n'), midi: m, start: i * 0.5, len: 0.45, vel: 0.75 }));
    return {
      patch: { name: cue.name, start: 0, length: Math.max(1, Math.ceil((cue.midi.length * 0.5) / 4)), notes },
      presetPatch: null
    };
  }
  if (cue.kind === 'sfx') {
    return { patch: { name: cue.name, start: 0, length: 1, sample: 'sfx:' + sfxNameFor(cue) }, presetPatch: null };
  }
  if (cue.kind === 'ambient') {
    return { patch: { name: cue.name, start: 0, length: 4, sample: ambientNameFor(cue) }, presetPatch: null };
  }
  return { patch: { name: cue.name, start: 0, length: 2 }, presetPatch: null };
}

function cueIcon(cue) {
  const icons = { phase: '🈁', scale: '🈁', chord: '🎹', notes: '🎵', sfx: '🔊', ambient: '🍃' };
  return icons[cue.kind] || '🐾';
}

function sfxNameFor(cue) {
  const key = cue.name.toLowerCase().replace(/[^a-z]/g, '');
  const map = { dreamchime: 'dream', doorslide: 'door', unlockchime: 'unlock', keychime: 'keychime' };
  return map[key] || key;
}

export function ambientNameFor(cue) {
  const key = cue.name.toLowerCase().replace(/[^a-z]/g, '');
  const map = { windchimes: 'chimes', birds: 'birds', birdsong: 'birds', rain: 'rain', ambient: 'wind', lapping: 'lap', purr: 'purr' };
  return map[key] || 'chimes';
}

/* ---------------- load-a-song-cue-as-new-project ---------------- */

function mkFullTrack(name, color, preset) {
  return {
    id: uid('t'), name, color, kind: 'synth', preset,
    drumKit: 'soft', volume: 0.8, pan: 0, mute: false, solo: false, arm: false,
    sends: { a: 0.12, b: 0.1 }, devices: [], clips: [],
    automation: { volume: [], pan: [], devices: {} },
    frozenActive: false, frozenAssetId: null
  };
}

function mkFullClip(patch) {
  return Object.assign({
    id: uid('c'), name: '', start: 0, length: 4, gain: 1, loop: false, loopLen: 4,
    notes: [], steps: null, sample: null, audio: null
  }, patch);
}

function matchScaleName(semis) {
  const norm = (arr) => [...new Set(arr.map((s) => ((s % 12) + 12) % 12))].sort((a, b) => a - b).join(',');
  const target = norm(semis);
  for (const [name, arr] of Object.entries(SCALES)) if (norm(arr) === target) return name;
  return 'minor';
}

/* Rebuilds a phase cue (Dawn/Day/Dusk/Night — root/chord/scale/cutoff) as a
   fresh, fully editable project: a Pad track voicing the phase's chord and a
   Pluck track playing its generative scale pattern, mirroring the two voices
   MusicDirector itself layers for that phase (src/music.js). Carries the
   scene/timeOfDay tags forward so the Export to Game dialog defaults to the
   same variant this project was loaded from. */
export function buildProjectFromPhaseCue(cue, existingProject) {
  const rootMidi = cue.rootHz ? hzToMidi(cue.rootHz) : 48;
  const chord = cue.chord && cue.chord.length ? cue.chord : [0, 7, 12, 16];
  const scale = cue.scale && cue.scale.length ? cue.scale : [0, 3, 5, 7, 10];

  const padPreset = defaultSynthPreset('pad');
  if (cue.cutoff) padPreset.cutoff = cue.cutoff;
  const padTrack = mkFullTrack('Pad', '#f59e0b', padPreset);
  padTrack.clips.push(mkFullClip({
    name: `${cue.name} Pad`, start: 0, length: 8, loop: true, loopLen: 4,
    notes: chord.map((semi, i) => ({ id: uid('n'), midi: rootMidi + semi, start: 0, len: 3.6, vel: 0.5 + i * 0.03 }))
  }));

  const pluckTrack = mkFullTrack('Pluck', '#ec4899', defaultSynthPreset('pluck'));
  pluckTrack.clips.push(mkFullClip({
    name: `${cue.name} Pluck`, start: 0, length: 4, loop: true, loopLen: 16,
    notes: generatePluckPattern(rootMidi, scale)
  }));

  return {
    version: 1,
    name: `${cue.scene || 'Overworld'} — ${cue.name}`,
    tempo: 110, timeSigNum: 4, timeSigDen: 4,
    key: midiToName(rootMidi + 24).replace(/-?\d+$/, ''), scale: matchScaleName(scale), bars: 16,
    loop: { on: false, start: 0, end: 8 },
    metronome: false, swing: 0,
    scene: cue.scene || 'Overworld', timeOfDay: cue.timeOfDay || null,
    sections: { dawn: -1, day: -1, dusk: -1, night: -1 },
    tracks: [padTrack, pluckTrack],
    master: { volume: 0.85, automation: { volume: [] } },
    cueScan: existingProject && existingProject.cueScan
      ? JSON.parse(JSON.stringify(existingProject.cueScan))
      : { at: null, files: [], cues: [] },
    assets: {}
  };
}
