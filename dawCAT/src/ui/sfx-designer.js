/* dawCAT — Sound Design view: design procedural game SFX.

   Left: the project's sounds (new from template, duplicate, rename, delete).
   Right: the selected patch — header (name, category, game hook), a rendered
   waveform with one lane per layer, master FX + variation knobs, and a card
   per layer. Every edit goes through AppState.updateSfx (normalized, one undo
   step per knob gesture) and re-renders the waveform offline with exactly the
   runtime the game export embeds. */
import { el, toast, showModal, closeModal, ctxMenu, makeKnob, download } from './common.js';
import { SFX_TEMPLATES, SFX_CATEGORIES, GAME_HOOKS, LAYER_KINDS, createPatch, newLayer, sfxDuration } from '../sfx/patches.js';
import { sfxRuntime } from '../sfx/runtime.js';
import { packEntries, generateSfxModule, sfxHotSwapSnippet, sfxSlug, DEFAULT_PACK_LEVEL } from '../sfx/export.js';
import { renderSfxToBuffer, wavBlob } from '../engine/render.js';
import { createZip } from '../zip.js';
import { uid } from '../state.js';

const RT = sfxRuntime();
const WAVES = ['sine', 'triangle', 'sawtooth', 'square'];
const FILTERS = ['off', 'lowpass', 'highpass', 'bandpass', 'notch'];
const NOISE_COLORS = ['white', 'pink', 'brown'];
const LAYER_COLORS = ['#5aa2ff', '#a78bfa', '#34d399', '#f59e0b', '#ec4899', '#38bdf8', '#f87171', '#fbbf24', '#10b981', '#7c5ce6', '#60a5fa', '#f472b6'];
const KIND_HELP = {
  tone: 'Tone — an oscillator. Sweeps, vibrato, repeats: chirps, blips, chimes, meows.',
  noise: 'Noise — filtered noise. Footsteps, whooshes, splashes, wind, clicks.',
  fm: 'FM — a modulated oscillator. Bells, gongs, metallic and glassy hits.',
  pluck: 'Pluck — a plucked string (Karplus–Strong). Koto, harp and pizzicato stings.'
};
const PREF_KEY = 'dawcat-sfx-designer-v1';

const fmtHz = (v) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 1 : 2)}k` : `${Math.round(v)}`);
const fmtS = (v) => (v < 0.1 ? `${Math.round(v * 1000)}ms` : `${v.toFixed(2)}s`);
const fmtPct = (v) => `${Math.round(v * 100)}%`;
const fmtSemi = (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}st`;
const fmtCents = (v) => `±${Math.round(v)}c`;

function loadPrefs() { try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); } catch { return {}; } }
function savePrefs(p) { try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch { /* private mode */ } }

export class SfxDesigner {
  constructor(app) {
    this.app = app;
    this.state = app.state;
    this.root = document.getElementById('sfx-designer');
    this.filter = '';
    this.variation = 0;
    this.prefs = Object.assign({ autoPreview: true, packLevel: DEFAULT_PACK_LEVEL, packVariations: 2, packWavs: true }, loadPrefs());
    this.buffer = null;
    this.renderToken = 0;
    this.sig = '';
    this._self = false;
    this.playhead = null;

    const onChange = () => { if (!this._self) this.refresh(); };
    this.state.addEventListener('sfx', onChange);
    this.state.addEventListener('project', onChange);
    this.state.addEventListener('selection', onChange);
    this.render();
  }

  get active() { return this.app.activeTab === 'sfx'; }
  current() { return this.state.selectedSfx(); }

  /* Re-renders only when visible and something it shows actually changed. */
  refresh(force = false) {
    if (!this.active && !force) { this.sig = ''; return; }
    const s = JSON.stringify([this.state.project.sfx, this.state.selection.sfxId]);
    if (!force && s === this.sig) return;
    this.render();
  }

  onShow() { this.refresh(true); }

  /* ---------------- editing ---------------- */

  edit(mutate, { structural = false } = {}) {
    const s = this.current();
    if (!s) return;
    const next = JSON.parse(JSON.stringify(s));
    mutate(next);
    this._self = true;
    try { this.state.updateSfx(s.id, next); } finally { this._self = false; }
    this.sig = JSON.stringify([this.state.project.sfx, this.state.selection.sfxId]);
    if (structural) this.render();
    else { this.updateStats(); this.scheduleWave(); this.updateListRow(); }
    if (this.prefs.autoPreview) this.schedulePreview();
  }

  knob(label, value, opts, apply) {
    return makeKnob({
      label, value, min: opts.min, max: opts.max, step: opts.step || 0.001, log: !!opts.log, def: opts.def, title: opts.title,
      fmt: opts.fmt || ((v) => v.toFixed(2)),
      onChange: (v) => this.edit((p) => apply(p, v))
    }).el;
  }

  /* ---------------- preview ---------------- */

  preview(variation = this.variation) {
    const s = this.current();
    if (!s) return;
    const e = this.app.engine;
    e.resume().then(() => {
      if (!e.ctx) return;
      const out = e.previewSfx(s, { variation });
      this.animatePlayhead(out.start, out.end);
    });
  }

  previewRandom() {
    this.variation = 1 + Math.floor(Math.random() * 8);
    this.preview(this.variation);
    this.scheduleWave();
    this.updateStats();
  }

  schedulePreview() {
    clearTimeout(this._previewTimer);
    this._previewTimer = setTimeout(() => this.preview(), 380);
  }

  animatePlayhead(start, end) {
    const ctx = this.app.engine.ctx;
    const cv = this.root.querySelector('.sfx-wave');
    if (!ctx || !cv) return;
    cancelAnimationFrame(this._raf);
    const step = () => {
      const t = ctx.currentTime;
      this.playhead = t >= start && t <= end ? t - start : null;
      this.drawWave();
      if (t <= end) this._raf = requestAnimationFrame(step);
    };
    step();
  }

  /* ---------------- waveform ---------------- */

  scheduleWave() {
    clearTimeout(this._waveTimer);
    this._waveTimer = setTimeout(() => this.renderWave(), 90);
  }

  async renderWave() {
    const s = this.current();
    if (!s) return;
    const token = ++this.renderToken;
    try {
      const buffer = await renderSfxToBuffer(s, { variation: this.variation, sampleRate: 22050 });
      if (token !== this.renderToken) return;
      this.buffer = buffer;
      this.drawWave();
      this.updateStats();
    } catch (err) {
      console.warn('[dawCAT] SFX render failed', err);
    }
  }

  drawWave() {
    const cv = this.root.querySelector('.sfx-wave');
    const s = this.current();
    if (!cv || !s) return;
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const lanes = RT.timeline(s);
    const laneH = Math.min(12, Math.max(6, 60 / Math.max(1, lanes.length)));
    const waveH = h - lanes.length * (laneH + 2) - 18;
    const total = Math.max(0.05, this.buffer ? this.buffer.duration : sfxDuration(s));
    const x = (t) => 8 + (t / total) * (w - 16);

    // time grid
    g.fillStyle = '#0a1120';
    g.fillRect(0, 0, w, waveH);
    g.strokeStyle = '#18233a'; g.fillStyle = '#4b5a78'; g.font = '9px system-ui'; g.lineWidth = 1;
    const tick = total > 3 ? 0.5 : total > 1 ? 0.25 : total > 0.4 ? 0.1 : 0.05;
    for (let t = 0; t <= total + 1e-9; t += tick) {
      const xx = Math.round(x(t)) + 0.5;
      g.beginPath(); g.moveTo(xx, 0); g.lineTo(xx, waveH); g.stroke();
      g.fillText(fmtS(t), xx + 2, waveH + 11);
    }
    const mid = waveH / 2;
    g.strokeStyle = '#22304d'; g.beginPath(); g.moveTo(0, mid + 0.5); g.lineTo(w, mid + 0.5); g.stroke();

    // waveform (min/max per column)
    if (this.buffer) {
      const data = this.buffer.getChannelData(0);
      const cols = Math.max(1, Math.floor(w - 16));
      const per = data.length / cols;
      const grad = g.createLinearGradient(0, 0, 0, waveH);
      grad.addColorStop(0, '#7cb8ff'); grad.addColorStop(0.5, '#3f7fff'); grad.addColorStop(1, '#7cb8ff');
      g.fillStyle = grad;
      for (let c = 0; c < cols; c++) {
        let lo = 1, hi = -1;
        const a = Math.floor(c * per), b = Math.min(data.length, Math.floor((c + 1) * per) + 1);
        for (let i = a; i < b; i++) { const v = data[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
        if (hi < lo) continue;
        const y0 = mid - Math.min(1, hi) * (mid - 2), y1 = mid - Math.max(-1, lo) * (mid - 2);
        g.fillRect(8 + c, y0, 1, Math.max(1, y1 - y0));
      }
    }

    // layer lanes
    lanes.forEach((lane, i) => {
      const y = waveH + 16 + i * (laneH + 2);
      g.fillStyle = '#0e1626';
      g.fillRect(8, y, w - 16, laneH);
      g.fillStyle = lane.on ? LAYER_COLORS[i % LAYER_COLORS.length] : '#2a3550';
      for (const hit of lane.hits) g.fillRect(x(hit.start), y + 1, Math.max(2, x(hit.end) - x(hit.start)), laneH - 2);
    });

    if (this.playhead != null) {
      const xx = x(this.playhead);
      g.fillStyle = '#fff'; g.fillRect(xx, 0, 1.5, h);
    }
  }

  updateStats() {
    const s = this.current();
    const node = this.root.querySelector('.sfx-stats');
    if (!s || !node) return;
    let peak = 0;
    if (this.buffer) for (let ch = 0; ch < this.buffer.numberOfChannels; ch++) { const d = this.buffer.getChannelData(ch); for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; } }
    const db = peak > 0 ? (20 * Math.log10(peak)).toFixed(1) : '-∞';
    const varies = s.variation.pitch || s.variation.time || s.variation.gain;
    node.innerHTML = '';
    node.append(
      el('span', { text: `⏱ ${fmtS(sfxDuration(s))}` }),
      el('span', { class: peak > 0.99 ? 'warn' : '', text: `peak ${db} dB${peak > 0.99 ? ' — clipping, lower gain' : ''}`, title: 'Peak level of the rendered sound. Keep it below 0 dB.' }),
      el('span', { text: `${s.layers.length} layer${s.layers.length === 1 ? '' : 's'}` }),
      el('span', { text: this.variation ? `variation ${this.variation}` : (varies ? 'canonical (variation 0)' : 'no variation'), title: 'The game cycles 4 round-robin variations of sounds that have Variation amounts.' })
    );
  }

  updateListRow() {
    const s = this.current();
    const row = s && this.root.querySelector(`.sfx-item[data-id="${s.id}"]`);
    if (!row) return;
    row.querySelector('.sfx-item-name').textContent = s.name;
    row.querySelector('.sfx-item-sub').textContent = `${s.category} · ${fmtS(sfxDuration(s))}`;
  }

  /* ---------------- layout ---------------- */

  render() {
    this.sig = JSON.stringify([this.state.project.sfx, this.state.selection.sfxId]);
    this.root.innerHTML = '';
    this.root.append(this.renderList(), this.renderMain());
    if (this.current()) { this.drawWave(); this.renderWave(); this.updateStats(); }
  }

  templateSelect(label = '＋ New sound…') {
    const sel = el('select', { class: 'sfx-new', title: 'Start a new sound from a template' }, el('option', { value: '', text: label }));
    for (const cat of SFX_CATEGORIES) {
      const ids = Object.keys(SFX_TEMPLATES).filter((id) => SFX_TEMPLATES[id].category === cat);
      if (!ids.length) continue;
      const group = el('optgroup', { label: cat });
      for (const id of ids) group.append(el('option', { value: id, text: SFX_TEMPLATES[id].label }));
      sel.append(group);
    }
    sel.addEventListener('change', () => { if (sel.value) this.create(sel.value); sel.value = ''; });
    return sel;
  }

  renderList() {
    const st = this.state;
    const list = st.project.sfx || [];
    const search = el('input', { type: 'text', class: 'sfx-search', placeholder: 'Filter sounds…', value: this.filter });
    search.addEventListener('input', () => { this.filter = search.value.trim().toLowerCase(); this.renderListItems(items); });
    const items = el('div', { class: 'sfx-items' });
    const pane = el('aside', { class: 'sfx-list' },
      el('div', { class: 'sfx-list-head' }, el('b', { text: 'SOUNDS' }), el('span', { class: 'count', text: String(list.length) })),
      this.templateSelect(),
      search,
      items,
      el('div', { class: 'sfx-list-foot' },
        el('button', { class: 'btn primary', text: '⬇ Export SFX pack…', title: 'Zip every sound as WAVs + a game-ready sfx-pack.js', onclick: () => this.exportPackDialog() }),
        el('button', { class: 'btn', text: '🎮 Hot-swap into game', title: 'Copy a console snippet that installs these sounds into the running game', onclick: () => this.copyHotSwap() })
      )
    );
    this.renderListItems(items);
    return pane;
  }

  renderListItems(host) {
    const st = this.state;
    host.innerHTML = '';
    const list = (st.project.sfx || []).filter((s) => !this.filter || s.name.toLowerCase().includes(this.filter) || s.category.toLowerCase().includes(this.filter));
    if (!list.length) {
      host.append(el('div', { class: 'bscan-note', text: this.filter ? 'No sounds match.' : 'No sounds yet — pick a template above, or ask the ✦ AI Agent in Sound Design mode.' }));
      return;
    }
    for (const s of list) {
      const row = el('div', { class: 'sfx-item' + (s.id === st.selection.sfxId ? ' sel' : ''), 'data-id': s.id, draggable: 'true', title: 'Click to select · drag onto the arrangement to place it · right-click for more' },
        el('span', { class: 'sfx-item-play', text: '▶', title: 'Preview' }),
        el('div', { class: 'sfx-item-text' },
          el('div', { class: 'sfx-item-name', text: s.name }),
          el('div', { class: 'sfx-item-sub', text: `${s.category} · ${fmtS(sfxDuration(s))}` })
        ),
        s.gameHook ? el('span', { class: 'sfx-hook', text: '🎮', title: `Replaces the game's ${s.gameHook}()` }) : null
      );
      row.addEventListener('click', (e) => {
        if (e.target.classList.contains('sfx-item-play')) { st.selectSfx(s.id); this.preview(0); return; }
        if (s.id !== st.selection.sfxId) { this.variation = 0; st.selectSfx(s.id); }
      });
      row.addEventListener('dblclick', () => this.preview(0));
      row.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'sfxPatch', sfxId: s.id })); e.dataTransfer.effectAllowed = 'copy'; });
      row.addEventListener('contextmenu', (e) => { e.preventDefault(); ctxMenu(e.clientX, e.clientY, this.itemMenu(s)); });
      host.append(row);
    }
  }

  itemMenu(s) {
    const st = this.state;
    return [
      { label: '▶ Preview', onClick: () => { st.selectSfx(s.id); this.preview(0); } },
      { label: '→ Place at playhead', onClick: () => this.app.placeSfx(s.id) },
      { label: '⬇ Export WAV', onClick: () => this.exportWav(s) },
      'sep',
      { label: 'Duplicate', onClick: () => this.duplicate(s) },
      { label: 'Make 3 variations', onClick: () => this.makeVariations(s) },
      { label: 'Rename…', onClick: () => { const n = prompt('Sound name', s.name); if (n && n.trim()) st.updateSfx(s.id, { name: n.trim() }); } },
      'sep',
      { label: 'Delete', onClick: () => { if (confirm(`Delete "${s.name}"? Its timeline clips go too (Ctrl+Z undoes).`)) st.removeSfx(s.id); } }
    ];
  }

  renderMain() {
    const s = this.current();
    if (!s) return this.renderEmpty();

    const name = el('input', { type: 'text', class: 'sfx-name', value: s.name, title: 'Sound name — also its id in the exported pack' });
    name.addEventListener('change', () => this.edit((p) => { p.name = name.value.trim() || 'Untitled SFX'; }));
    const cat = el('select', { title: 'Category' }, ...SFX_CATEGORIES.map((c) => el('option', { value: c, text: c })));
    cat.value = s.category;
    cat.addEventListener('change', () => this.edit((p) => { p.category = cat.value; }));
    const hook = el('select', { title: 'Game sound this replaces when the pack is installed (installSfxOverrides / hot-swap)' },
      el('option', { value: '', text: '🎮 Game hook: none' }), ...GAME_HOOKS.map((h) => el('option', { value: h, text: `🎮 replaces ${h}()` })));
    hook.value = s.gameHook || '';
    hook.addEventListener('change', () => this.edit((p) => { p.gameHook = hook.value; }, { structural: true }));

    const auto = el('label', { class: 'sfx-toggle', title: 'Play the sound after every change' }, el('input', { type: 'checkbox' }), ' Auto-preview');
    auto.firstChild.checked = !!this.prefs.autoPreview;
    auto.firstChild.addEventListener('change', () => { this.prefs.autoPreview = auto.firstChild.checked; savePrefs(this.prefs); });

    const bar = el('div', { class: 'sfx-actions' },
      el('button', { class: 'btn primary', text: '▶ Preview', title: 'Play the canonical sound (Enter)', onclick: () => { this.variation = 0; this.preview(0); this.scheduleWave(); this.updateStats(); } }),
      el('button', { class: 'btn', text: '🎲 Variation', title: 'Play a random round-robin variation (uses the Variation knobs)', onclick: () => this.previewRandom() }),
      auto,
      el('span', { class: 'sfx-spacer' }),
      el('button', { class: 'btn', text: '→ Timeline', title: 'Place this sound on the arrangement at the playhead', onclick: () => this.app.placeSfx(s.id) }),
      el('button', { class: 'btn', text: '⬇ WAV', title: 'Render and download this sound as a WAV file', onclick: () => this.exportWav(s) }),
      el('button', { class: 'btn', text: '{ } JSON', title: 'View or paste the patch as JSON', onclick: () => this.jsonDialog(s) }),
      el('button', { class: 'btn ai', text: '✦ Ask AI', title: 'Open the AI agent in Sound Design mode for this sound', onclick: () => this.app.openAgent({ mode: 'sfx', prompt: `Improve "${s.name}": ` }) })
    );

    const wave = el('canvas', { class: 'sfx-wave', title: 'Rendered waveform; coloured lanes show when each layer sounds' });
    wave.addEventListener('click', () => this.preview());
    const main = el('section', { class: 'sfx-main' },
      el('div', { class: 'sfx-head' }, name, cat, hook),
      bar,
      el('div', { class: 'sfx-wave-wrap' }, wave),
      el('div', { class: 'sfx-stats' }),
      this.renderMaster(s),
      el('div', { class: 'sfx-layers-head' },
        el('b', { text: 'LAYERS' }),
        el('span', { class: 'dim', text: 'Each layer is one ingredient — a transient, a body, a tail. Mix a few for character.' }),
        el('span', { class: 'sfx-spacer' }),
        ...LAYER_KINDS.map((k) => el('button', { class: 'mini-btn', text: `＋ ${k}`, title: KIND_HELP[k], onclick: () => this.edit((p) => { p.layers.push(newLayer(k)); }, { structural: true }) }))
      ),
      el('div', { class: 'sfx-layers' }, ...s.layers.map((l, i) => this.renderLayer(s, l, i)))
    );
    requestAnimationFrame(() => this.drawWave());
    return main;
  }

  renderEmpty() {
    const grid = el('div', { class: 'sfx-template-grid' });
    for (const [id, tpl] of Object.entries(SFX_TEMPLATES)) {
      if (id === 'blank') continue;
      grid.append(el('button', { class: 'sfx-template', title: `New "${tpl.label}" sound`, onclick: () => this.create(id) }, el('b', { text: tpl.label }), el('small', { text: tpl.category })));
    }
    return el('section', { class: 'sfx-main sfx-empty' },
      el('h2', { text: 'Sound Design' }),
      el('p', { class: 'dim', text: 'Design the game\'s sound effects procedurally — no sample files, so they cost nothing to ship. Start from a template modelled on Michi-Neko\'s own sounds, build from scratch, or describe a sound to the AI.' }),
      el('div', { class: 'sfx-empty-actions' },
        el('button', { class: 'btn primary', text: '✦ Design a sound with AI', onclick: () => this.app.openAgent({ mode: 'sfx' }) }),
        el('button', { class: 'btn', text: '＋ Blank sound', onclick: () => this.create('blank') })
      ),
      grid
    );
  }

  renderMaster(s) {
    const row = el('div', { class: 'knob-row' },
      this.knob('Gain', s.gain, { min: 0, max: 2, def: 0.8, fmt: fmtPct, title: 'Overall level of the sound' }, (p, v) => { p.gain = v; }),
      this.knob('Low-pass', s.fx.lowpass, { min: 200, max: 20000, log: true, def: 20000, fmt: fmtHz, title: 'Darken the whole sound (20k = off)' }, (p, v) => { p.fx.lowpass = v; }),
      this.knob('High-pass', s.fx.highpass, { min: 20, max: 8000, log: true, def: 20, fmt: fmtHz, title: 'Thin out the low end (20 = off)' }, (p, v) => { p.fx.highpass = v; }),
      this.knob('Reverb', s.fx.reverb, { min: 0, max: 1, def: 0, fmt: fmtPct, title: 'Room/space amount' }, (p, v) => { p.fx.reverb = v; }),
      this.knob('Rev time', s.fx.reverbTime, { min: 0.1, max: 8, def: 1.5, fmt: fmtS, title: 'Reverb tail length' }, (p, v) => { p.fx.reverbTime = v; }),
      this.knob('Drive', s.fx.drive, { min: 0, max: 1, def: 0, fmt: fmtPct, title: 'Soft saturation — grit and loudness' }, (p, v) => { p.fx.drive = v; }),
      el('div', { class: 'knob-sep' }),
      this.knob('Var pitch', s.variation.pitch, { min: 0, max: 600, step: 1, def: 0, fmt: fmtCents, title: 'Random pitch spread between variations, in cents' }, (p, v) => { p.variation.pitch = v; }),
      this.knob('Var time', s.variation.time, { min: 0, max: 1, def: 0, fmt: fmtPct, title: 'Random timing stretch between variations' }, (p, v) => { p.variation.time = v; }),
      this.knob('Var level', s.variation.gain, { min: 0, max: 1, def: 0, fmt: fmtPct, title: 'Random level spread between variations' }, (p, v) => { p.variation.gain = v; })
    );
    return el('div', { class: 'sfx-master' }, el('div', { class: 'sfx-section-title', text: 'MASTER · VARIATION' }), row);
  }

  renderLayer(s, l, i) {
    const color = LAYER_COLORS[i % LAYER_COLORS.length];
    const L = (p) => p.layers[i];
    const on = el('button', { class: 'mini-btn' + (l.on ? ' active' : ''), text: l.on ? '⏻' : '○', title: l.on ? 'Mute layer' : 'Unmute layer', onclick: () => this.edit((p) => { L(p).on = !L(p).on; }, { structural: true }) });
    const kind = el('select', { title: 'Layer type' }, ...LAYER_KINDS.map((k) => el('option', { value: k, text: k })));
    kind.value = l.kind;
    kind.addEventListener('change', () => this.edit((p) => { L(p).kind = kind.value; }, { structural: true }));
    const head = el('div', { class: 'sfx-layer-head' },
      el('span', { class: 'sfx-swatch', style: `background:${color}` }), on, el('b', { text: `Layer ${i + 1}` }), kind);
    if (l.kind === 'tone' || l.kind === 'fm') {
      const wave = el('select', { title: 'Waveform' }, ...WAVES.map((w) => el('option', { value: w, text: w })));
      wave.value = l.wave;
      wave.addEventListener('change', () => this.edit((p) => { L(p).wave = wave.value; }));
      head.append(wave);
    }
    if (l.kind === 'noise') {
      const col = el('select', { title: 'Noise colour: white = hiss, pink = natural, brown = rumble' }, ...NOISE_COLORS.map((c) => el('option', { value: c, text: `${c} noise` })));
      col.value = l.noiseColor;
      col.addEventListener('change', () => this.edit((p) => { L(p).noiseColor = col.value; }));
      head.append(col);
    }
    head.append(
      el('span', { class: 'sfx-spacer' }),
      el('button', { class: 'mini-btn', text: '▶', title: 'Preview this layer alone', onclick: () => this.previewLayer(s, i) }),
      el('button', { class: 'mini-btn', text: '↑', title: 'Move up', disabled: i === 0 ? '' : null, onclick: () => this.edit((p) => { const [x] = p.layers.splice(i, 1); p.layers.splice(i - 1, 0, x); }, { structural: true }) }),
      el('button', { class: 'mini-btn', text: '⧉', title: 'Duplicate layer', onclick: () => this.edit((p) => { p.layers.splice(i + 1, 0, { ...JSON.parse(JSON.stringify(L(p))), id: uid('L') }); }, { structural: true }) }),
      el('button', { class: 'mini-btn x', text: '×', title: 'Delete layer', onclick: () => this.edit((p) => { p.layers.splice(i, 1); }, { structural: true }) })
    );

    const groups = [];
    if (l.kind !== 'noise') {
      const sweep = el('label', { class: 'sfx-toggle', title: 'Glide the pitch from Freq to End' }, el('input', { type: 'checkbox' }), ' sweep');
      sweep.firstChild.checked = l.freqEnd != null;
      sweep.firstChild.addEventListener('change', () => this.edit((p) => { L(p).freqEnd = sweep.firstChild.checked ? Math.max(20, Math.round(L(p).freq / 2)) : null; }, { structural: true }));
      const pitch = [this.knob('Freq', l.freq, { min: 20, max: 16000, log: true, def: 440, fmt: fmtHz, title: 'Starting pitch (Hz)' }, (p, v) => { L(p).freq = v; })];
      if (l.freqEnd != null) {
        pitch.push(this.knob('End', l.freqEnd, { min: 20, max: 16000, log: true, fmt: fmtHz, title: 'Pitch the sweep ends on' }, (p, v) => { L(p).freqEnd = v; }));
        pitch.push(this.knob('Sweep t', l.sweepTime ?? (l.env.attack + l.env.hold + l.env.decay), { min: 0.001, max: 4, log: true, fmt: fmtS, title: 'How long the sweep takes' }, (p, v) => { L(p).sweepTime = v; }));
      }
      groups.push(this.group('Pitch', pitch, sweep));
    }
    if (l.kind === 'fm') {
      groups.push(this.group('FM', [
        this.knob('Ratio', l.fmRatio, { min: 0.01, max: 16, log: true, def: 2, fmt: (v) => v.toFixed(2), title: 'Modulator/carrier frequency ratio — non-integers sound bell-like' }, (p, v) => { L(p).fmRatio = v; }),
        this.knob('Depth', l.fmDepth, { min: 0, max: 4000, step: 1, def: 200, fmt: fmtHz, title: 'Modulation amount (Hz) — brightness, decays with the note' }, (p, v) => { L(p).fmDepth = v; })
      ]));
    }
    groups.push(this.group('Envelope', [
      this.knob('Attack', l.env.attack, { min: 0, max: 2, def: 0.005, fmt: fmtS, title: 'Fade-in time' }, (p, v) => { L(p).env.attack = v; }),
      this.knob('Hold', l.env.hold, { min: 0, max: 2, def: 0, fmt: fmtS, title: 'Time held at full level' }, (p, v) => { L(p).env.hold = v; }),
      this.knob('Decay', l.env.decay, { min: 0.001, max: 6, log: true, def: 0.2, fmt: fmtS, title: 'Time to fall to the sustain level' }, (p, v) => { L(p).env.decay = v; }),
      this.knob('Sustain', l.env.sustain, { min: 0, max: 1, def: 0, fmt: fmtPct, title: 'Level after the decay (0 = one-shot)' }, (p, v) => { L(p).env.sustain = v; }),
      this.knob('Release', l.env.release, { min: 0.001, max: 6, log: true, def: 0.1, fmt: fmtS, title: 'Fade-out after the sustain' }, (p, v) => { L(p).env.release = v; })
    ]));
    const ftype = el('select', { title: 'Filter type' }, ...FILTERS.map((f) => el('option', { value: f, text: f === 'off' ? 'filter off' : f })));
    ftype.value = l.filter.type;
    ftype.addEventListener('change', () => this.edit((p) => { L(p).filter.type = ftype.value; }, { structural: true }));
    const filterKnobs = l.filter.type === 'off' ? [] : [
      this.knob('Cutoff', l.filter.freq, { min: 20, max: 20000, log: true, def: 2000, fmt: fmtHz, title: 'Filter frequency' }, (p, v) => { L(p).filter.freq = v; }),
      this.knob('Cut end', l.filter.freqEnd ?? l.filter.freq, { min: 20, max: 20000, log: true, fmt: fmtHz, title: 'Filter frequency it sweeps to' }, (p, v) => { L(p).filter.freqEnd = v; }),
      this.knob('Q', l.filter.q, { min: 0.1, max: 20, log: true, def: 0.8, fmt: (v) => v.toFixed(1), title: 'Resonance / bandwidth' }, (p, v) => { L(p).filter.q = v; })
    ];
    groups.push(this.group('Filter', filterKnobs, ftype));
    groups.push(this.group('Motion', [
      this.knob('Vib rate', l.vibrato.rate, { min: 0, max: 30, def: 0, fmt: (v) => `${v.toFixed(1)}Hz`, title: 'Vibrato speed (pitch wobble)' }, (p, v) => { L(p).vibrato.rate = v; }),
      this.knob('Vib depth', l.vibrato.depth, { min: 0, max: 400, step: 1, def: 0, fmt: (v) => `${Math.round(v)}c`, title: 'Vibrato amount in cents' }, (p, v) => { L(p).vibrato.depth = v; }),
      this.knob('Trem rate', l.tremolo.rate, { min: 0, max: 40, def: 0, fmt: (v) => `${v.toFixed(1)}Hz`, title: 'Tremolo speed (volume flutter) — ~26 Hz makes a purr' }, (p, v) => { L(p).tremolo.rate = v; }),
      this.knob('Trem depth', l.tremolo.depth, { min: 0, max: 1, def: 0, fmt: fmtPct, title: 'Tremolo amount' }, (p, v) => { L(p).tremolo.depth = v; })
    ]));
    groups.push(this.group('Mix · Repeat', [
      this.knob('Level', l.gain, { min: 0, max: 1.5, def: 0.5, fmt: fmtPct, title: 'Layer level' }, (p, v) => { L(p).gain = v; }),
      this.knob('Pan', l.pan, { min: -1, max: 1, def: 0, fmt: (v) => (Math.abs(v) < 0.01 ? 'C' : v < 0 ? `L${Math.round(-v * 100)}` : `R${Math.round(v * 100)}`), title: 'Stereo position' }, (p, v) => { L(p).pan = v; }),
      this.knob('Start', l.start, { min: 0, max: 3, def: 0, fmt: fmtS, title: 'Delay before this layer starts' }, (p, v) => { L(p).start = v; }),
      this.knob('Repeats', l.repeat.count, { min: 1, max: 16, step: 1, def: 1, fmt: (v) => `×${Math.round(v)}`, title: 'Number of hits — arpeggios, trills, rattles' }, (p, v) => { L(p).repeat.count = Math.round(v); }),
      ...(l.repeat.count > 1 ? [
        this.knob('Every', l.repeat.interval, { min: 0.005, max: 1, log: true, def: 0.1, fmt: fmtS, title: 'Time between hits' }, (p, v) => { L(p).repeat.interval = v; }),
        this.knob('Step', l.repeat.pitchStep, { min: -12, max: 12, step: 0.5, def: 0, fmt: fmtSemi, title: 'Pitch change per hit (semitones)' }, (p, v) => { L(p).repeat.pitchStep = v; }),
        this.knob('Fade', l.repeat.gainStep, { min: 0, max: 1.5, def: 1, fmt: fmtPct, title: 'Level multiplier per hit' }, (p, v) => { L(p).repeat.gainStep = v; })
      ] : [])
    ]));
    return el('div', { class: 'sfx-layer' + (l.on ? '' : ' off'), style: `border-left-color:${color}` }, head, el('div', { class: 'sfx-layer-body' }, ...groups));
  }

  group(title, knobs, extra) {
    return el('div', { class: 'sfx-group' }, el('div', { class: 'sfx-group-title' }, title, extra || null), el('div', { class: 'knob-row' }, ...knobs));
  }

  previewLayer(s, i) {
    const solo = JSON.parse(JSON.stringify(s));
    solo.layers = solo.layers.map((l, j) => ({ ...l, on: j === i }));
    const e = this.app.engine;
    e.resume().then(() => { if (e.ctx) e.previewSfx(solo, { variation: this.variation }); });
  }

  /* ---------------- commands ---------------- */

  create(templateId) {
    const patch = createPatch(templateId);
    const used = new Set((this.state.project.sfx || []).map((s) => s.name));
    if (used.has(patch.name)) { let n = 2; while (used.has(`${patch.name} ${n}`)) n++; patch.name = `${patch.name} ${n}`; }
    this.variation = 0;
    this.state.addSfx(patch);
    if (!this.active) this.app.switchTab('sfx');
    this.refresh(true);
    this.preview(0);
  }

  duplicate(s) {
    const copy = JSON.parse(JSON.stringify(s));
    copy.id = uid('sfx');
    copy.name = `${s.name} copy`;
    copy.seed = 1 + Math.floor(Math.random() * 2147483000);
    copy.layers.forEach((l) => { l.id = uid('L'); });
    this.state.addSfx(copy);
  }

  /* Bakes three distinct takes — handy when a game event should alternate
     sounds explicitly instead of relying on round-robin. */
  makeVariations(s) {
    for (let k = 1; k <= 3; k++) {
      const copy = JSON.parse(JSON.stringify(s));
      copy.id = uid('sfx');
      copy.name = `${s.name} ${k + 1}`;
      copy.seed = 1 + Math.floor(Math.random() * 2147483000);
      const spread = Math.max(60, s.variation.pitch || 80);
      copy.layers.forEach((l) => {
        l.id = uid('L');
        const m = Math.pow(2, ((Math.random() * 2 - 1) * spread) / 1200);
        l.freq *= m;
        if (l.freqEnd != null) l.freqEnd *= m;
        l.env.decay *= 0.85 + Math.random() * 0.3;
      });
      this.state.addSfx(copy);
    }
    toast(`Made 3 variations of "${s.name}"`);
  }

  async exportWav(s) {
    try {
      const buffer = await renderSfxToBuffer(s, { variation: 0 });
      download(`${sfxSlug(s.name)}.wav`, wavBlob(buffer));
      toast(`Rendered ${s.name}.wav`);
    } catch (err) { toast(`Render failed: ${err.message}`, true); }
  }

  jsonDialog(s) {
    const ta = el('textarea', { spellcheck: 'false' });
    ta.value = JSON.stringify(s, null, 2);
    showModal({
      title: `Patch JSON — ${s.name}`, wide: true,
      body: el('div', {}, el('div', { class: 'hintbox', text: 'Edit or paste a patch. It is validated and clamped on apply, so out-of-range values are safe. Ctrl+Z undoes.' }), ta),
      buttons: [
        { label: 'Copy', onClick: () => navigator.clipboard && navigator.clipboard.writeText(ta.value), close: false },
        { label: 'Apply', primary: true, onClick: () => {
          try { const p = JSON.parse(ta.value); delete p.id; this.state.updateSfx(s.id, p); toast('Patch applied'); }
          catch (err) { toast(`Invalid JSON: ${err.message}`, true); }
        } },
        { label: 'Close' }
      ]
    });
  }

  copyHotSwap() {
    const list = this.state.project.sfx || [];
    if (!list.length) { toast('Design a sound first', true); return; }
    const snippet = sfxHotSwapSnippet(list, { level: this.prefs.packLevel });
    const done = () => toast('Snippet copied — paste it into the game tab\'s DevTools console (F12)');
    if (navigator.clipboard) navigator.clipboard.writeText(snippet).then(done, () => this.showSnippet(snippet));
    else this.showSnippet(snippet);
  }

  showSnippet(snippet) {
    const ta = el('textarea', { spellcheck: 'false' });
    ta.value = snippet;
    showModal({ title: 'Hot-swap snippet', wide: true, body: ta, buttons: [{ label: 'Close' }] });
    ta.select();
  }

  exportPackDialog() {
    const list = this.state.project.sfx || [];
    if (!list.length) { toast('Design a sound first', true); return; }
    const prefs = this.prefs;
    const checks = list.map((s) => {
      const box = el('input', { type: 'checkbox' });
      box.checked = true;
      return { s, box, row: el('label', { class: 'sfx-pack-row' }, box, ` ${s.name} `, el('small', { class: 'dim', text: `${s.category}${s.gameHook ? ' · 🎮 ' + s.gameHook : ''}` })) };
    });
    const wavs = el('input', { type: 'checkbox' }); wavs.checked = !!prefs.packWavs;
    const vars = el('input', { type: 'number', min: '0', max: '6', value: String(prefs.packVariations) });
    const level = el('input', { type: 'range', min: '0.05', max: '1', step: '0.05', value: String(prefs.packLevel) });
    const levelVal = el('span', { text: fmtPct(prefs.packLevel) });
    level.addEventListener('input', () => { levelVal.textContent = fmtPct(Number(level.value)); });
    const selected = () => checks.filter((c) => c.box.checked).map((c) => c.s);
    const remember = () => { prefs.packWavs = wavs.checked; prefs.packVariations = Math.max(0, Math.min(6, Number(vars.value) || 0)); prefs.packLevel = Number(level.value); savePrefs(prefs); };

    const zipBtn = el('button', { class: 'btn primary', text: '⬇ Download pack (.zip)' });
    zipBtn.addEventListener('click', async () => {
      remember();
      const patches = selected();
      if (!patches.length) { toast('Pick at least one sound', true); return; }
      zipBtn.disabled = true; zipBtn.textContent = 'Rendering…';
      try {
        const wavsById = {};
        if (prefs.packWavs) {
          for (const p of patches) {
            const takes = [0];
            const varies = p.variation.pitch || p.variation.time || p.variation.gain;
            if (varies) for (let v = 1; v <= prefs.packVariations; v++) takes.push(v);
            wavsById[p.id] = [];
            for (const v of takes) wavsById[p.id].push(new Uint8Array(await wavBlob(await renderSfxToBuffer(p, { variation: v })).arrayBuffer()));
          }
        }
        const zip = createZip(packEntries(patches, wavsById, { level: prefs.packLevel }));
        download(`${sfxSlug(this.state.project.name || 'michi-neko')}-sfx-pack.zip`, new Blob([zip], { type: 'application/zip' }));
        toast(`SFX pack exported (${patches.length} sound${patches.length === 1 ? '' : 's'})`);
        closeModal();
      } catch (err) {
        toast(`Export failed: ${err.message}`, true);
      } finally { zipBtn.disabled = false; zipBtn.textContent = '⬇ Download pack (.zip)'; }
    });
    const jsBtn = el('button', { class: 'btn', text: '⬇ sfx-pack.js only', onclick: () => { remember(); download('sfx-pack.js', generateSfxModule(selected(), { level: prefs.packLevel }), 'text/javascript'); } });
    const snipBtn = el('button', { class: 'btn', text: '📋 Copy hot-swap snippet', onclick: () => { remember(); const s = sfxHotSwapSnippet(selected(), { level: prefs.packLevel }); if (navigator.clipboard) navigator.clipboard.writeText(s).then(() => toast('Snippet copied'), () => this.showSnippet(s)); else this.showSnippet(s); } });

    const help = el('div', { class: 'hintbox' });
    help.innerHTML = [
      '<b>sfx-pack.js</b> synthesizes every sound live in the game — no audio files to ship. Save it as <code>src/sfx-pack.js</code>, then <code>import { playSfx, installSfxOverrides } from \'./sfx-pack.js\'</code>.',
      '<b>Game hooks:</b> <code>installSfxOverrides(this.audio)</code> swaps the game\'s own sounds (e.g. <code>playMeow()</code>) for the sounds you hooked — no other game code changes.',
      '<b>Try it first:</b> the hot-swap snippet installs the pack into a running game from its DevTools console; reload the game to undo.',
      '<b>WAVs</b> are rendered previews for trailers, other tools or audio middleware.'
    ].map((s) => `<div>${s}</div>`).join('');
    showModal({
      title: 'Export SFX pack', wide: true,
      body: el('div', {},
        help,
        el('div', { class: 'sfx-pack-list' }, ...checks.map((c) => c.row)),
        el('div', { class: 'form-row' },
          el('label', { class: 'dim', title: 'Include rendered WAV files in the zip' }, wavs, ' WAV renders'),
          el('label', { class: 'dim', title: 'Extra round-robin WAVs for sounds that have Variation amounts' }, 'Variations ', vars),
          el('label', { class: 'dim', title: 'Game SFX are quiet under the music; this scales the pack to match (35% ≈ the game\'s own sounds)' }, 'Pack level ', level, ' ', levelVal)
        ),
        el('div', { class: 'form-row' }, zipBtn, jsBtn, snipBtn)
      ),
      buttons: [{ label: 'Close' }]
    });
  }
}
