/* dawCAT — app bootstrap */
import { AppState, defaultProject } from './state.js';
import { AudioEngine } from './engine/core.js';
import { Transport } from './engine/transport.js';
import { renderProject } from './engine/render.js';
import { exportToGame } from './bridge.js';
import { scanGameCues } from './scanner.js';
import { buildTopbar } from './ui/transport-ui.js';
import { Browser } from './ui/browser.js';
import { Arrangement } from './ui/arrangement.js';
import { PianoRoll } from './ui/pianoroll.js';
import { DrumGrid } from './ui/drumgrid.js';
import { Mixer } from './ui/mixer.js';
import { Inspector } from './ui/inspector.js';
import { Devices } from './ui/devices.js';
import { el, toast, showModal, download } from './ui/common.js';

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
      if (this.state.loadJSON(text)) toast('Project loaded');
      else toast('Invalid project file', true);
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
    }, 60);
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this.state.persist(), 1500);
  }

  /* ---------- selection-aware actions ---------- */

  duplicateSelection() {
    const st = this.state;
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
    const secInputs = {};
    const secRow = el('div', { class: 'form-row' });
    for (const ph of ['dawn', 'day', 'dusk', 'night']) {
      const inp = el('input', { type: 'number', min: '-1', max: '999', value: String(p.sections[ph] == null ? -1 : p.sections[ph]), title: 'Bar where this phase starts (-1 = ignore)' });
      secInputs[ph] = inp;
      secRow.append(el('label', { class: 'dim' }, `${ph} `, inp));
    }

    const note = el('div', { class: 'hintbox' });
    note.innerHTML = [
      '<b>1 · Instant preview (no file changes):</b> click the game tab once to unlock audio, open its DevTools console, paste the hot-swap snippet, press Enter.',
      '<b>2 · Permanent:</b> download <code>music.js</code>, replace the game\'s <code>src/music.js</code> with it, hard-refresh the game (Ctrl+Shift+R). Same MusicDirector API — no other game code changes.',
      '<b>3 · Backup:</b> download the track JSON (re-importable via File ▸ Open Project).',
      'Day-phase seeking: set the bar where each phase starts (−1 = ignore that phase).'
    ].map((s) => `<div>${s}</div>`).join('');

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
      download('music.js', musicJS, 'text/javascript');
      toast('music.js downloaded — replace the game\'s src/music.js, then hard-refresh');
    });
    const jsonBtn = el('button', { class: 'btn', text: '⬇ Download Track JSON' });
    jsonBtn.addEventListener('click', () => {
      applyMapping();
      const { payload } = exportToGame(st.project);
      download((st.project.name || 'track') + '.dawcat.json', JSON.stringify(payload, null, 2), 'application/json');
    });

    function applyMapping() {
      for (const ph of ['dawn', 'day', 'dusk', 'night']) {
        const v = parseInt(secInputs[ph].value, 10);
        st.project.sections[ph] = isNaN(v) ? -1 : v;
      }
    }

    showModal({
      title: 'Export to Game',
      wide: true,
      body: el('div', {}, secRow, note, el('div', { class: 'form-row' }, copyBtn, musicBtn, jsonBtn)),
      buttons: [{ label: 'Close' }]
    });
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
