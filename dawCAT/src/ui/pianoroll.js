/* dawCAT — piano roll: note editing for the selected synth clip */
import { SCALES, SNAP_VALUES, midiToName } from '../state.js';
import { ctxMenu } from './common.js';

const KEYS_W = 64;
const VEL_H = 72;
const NOTE_H = 14;
const HI = 96;
const LO = 24;

export class PianoRoll {
  constructor(app) {
    this.app = app;
    this.canvas = document.getElementById('pr-canvas');
    this.g = this.canvas.getContext('2d');
    this.pxPerBeat = 28;
    this.scrollX = 0;
    this.scrollY = 0;
    this.drag = null;
    this.lastLen = 0.5;
    this._needsDraw = true;
    this._w = 800;
    this._h = 400;
    this._dpr = 1;

    this.setup();
    this.app.state.addEventListener('project', () => { this._needsDraw = true; });
    this.app.state.addEventListener('selection', () => { this._needsDraw = true; });
    this.raf();
  }

  get project() { return this.app.state.project; }
  get isPlaying() { return this.app.transport.playing; }

  clip() {
    const st = this.app.state;
    const t = st.selectedTrack();
    if (!t || t.kind !== 'synth') return null;
    return st.selectedClip();
  }

  contentH() { return (HI - LO + 1) * 14 + VEL_H; }
  contentW() { const c = this.clip(); return 64 + (c ? Math.max(16, c.length * 4 + 8) : 32) * this.pxPerBeat; }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    this._dpr = window.devicePixelRatio || 1;
    const w = parent.clientWidth, h = parent.clientHeight;
    if (this.canvas.width !== Math.max(1, w * this._dpr) || this.canvas.height !== Math.max(1, h * this._dpr)) {
      this.canvas.width = Math.max(1, w * this._dpr);
      this.canvas.height = Math.max(1, h * this._dpr);
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
    }
    this._w = w;
    this._h = h;
  }

  raf() {
    if (this.isPlaying) this._needsDraw = true;
    if (this._needsDraw && this.isVisible()) {
      this._needsDraw = false;
      this.resize();
      this.draw();
    }
    requestAnimationFrame(() => this.raf());
  }

  isVisible() {
    const v = document.getElementById('view-pianoroll');
    return !!v && v.classList.contains('active');
  }

  /* ---------- transforms ---------- */

  beatToX(beat) { return KEYS_W + beat * this.pxPerBeat - this.scrollX; }
  xToBeat(x) { return (x - KEYS_W + this.scrollX) / this.pxPerBeat; }
  midiToY(midi) { return (HI - midi) * 14 - this.scrollY; }
  yToMidi(y) { return HI - Math.floor((y + this.scrollY) / 14); }
  snapVal() { const v = SNAP_VALUES[this.app.snap]; return v == null ? 0.25 : v; }

  /* ---------- drawing ---------- */

  draw() {
    const g = this.g;
    const p = this.project;
    const W = this._w, H = this._h;
    g.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    g.fillStyle = '#0b0f19';
    g.fillRect(0, 0, W, H);
    this._hits = [];

    const clip = this.clip();
    const track = this.app.state.selectedTrack();
    if (!clip || !track) {
      g.fillStyle = 'rgba(154,178,215,.55)';
      g.font = '13px system-ui';
      g.textAlign = 'center';
      g.fillText('Select a synth clip in the Arrangement to edit its notes', W / 2, H / 2);
      g.textAlign = 'left';
      return;
    }

    const scaleSet = scaleSetOf(p);
    const gridEnd = Math.max(clip.length * 4, 16);

    // note rows
    for (let m = LO; m <= HI; m++) {
      const y = this.midiToY(m);
      if (y < -14 || y > H - VEL_H) continue;
      const black = [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);
      g.fillStyle = black ? '#0d1220' : '#111828';
      g.fillRect(KEYS_W, y, W - KEYS_W, 13);
      if (scaleSet.has(((m % 12) + 12) % 12)) {
        g.fillStyle = 'rgba(90,162,255,.07)';
        g.fillRect(KEYS_W, y, W - KEYS_W, 13);
      }
      g.strokeStyle = '#151c2e';
      g.beginPath();
      g.moveTo(KEYS_W, y + 13.5);
      g.lineTo(W, y + 13.5);
      g.stroke();
    }

    // beat grid
    for (let b = 0; b <= gridEnd; b++) {
      const x = this.beatToX(b);
      if (x < KEYS_W || x > W) continue;
      g.strokeStyle = b % 4 === 0 ? '#2a3554' : b % 1 === 0 ? '#1c2438' : '#141a2c';
      g.beginPath();
      g.moveTo(x + 0.5, 0);
      g.lineTo(x + 0.5, H - VEL_H);
      g.stroke();
      if (b % 4 === 0) {
        g.fillStyle = '#5c6f8f';
        g.font = '9px ui-monospace, monospace';
        g.fillText(String(Math.floor(b / 4) + 1), x + 3, 11);
      }
    }

    // notes
    for (const n of clip.notes) {
      const x = this.beatToX(n.start);
      const y = this.midiToY(n.midi);
      const w = Math.max(4, n.len * this.pxPerBeat);
      if (x + w < KEYS_W || x > W || y < -14 || y > H - VEL_H) continue;
      const sel = this.app.state.selection.noteId === n.id;
      g.fillStyle = sel ? '#ffffff' : track.color;
      g.globalAlpha = 0.45 + n.vel * 0.55;
      roundRect(g, x, y + 1.5, w, 11, 3);
      g.fill();
      g.globalAlpha = 1;
      if (n.vel > 0.9) {
        g.fillStyle = 'rgba(255,255,255,.7)';
        g.fillRect(x + 1, y + 3, 2, 7);
      }
      this._hits.push({ x, y: y, w: Math.max(8, w), h: 14, type: 'note', note: n });
    }

    // piano keys
    for (let m = LO; m <= HI; m++) {
      const y = this.midiToY(m);
      if (y < -14 || y > H - VEL_H) continue;
      const black = [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);
      g.fillStyle = black ? '#0a0e18' : '#e8edf7';
      g.fillRect(0, y, KEYS_W - 4, 13);
      g.strokeStyle = '#0a0e18';
      g.strokeRect(0.5, y + 0.5, KEYS_W - 4, 13);
      if (((m % 12) + 12) % 12 === 0) {
        g.fillStyle = '#5c6f8f';
        g.font = '9px system-ui';
        g.fillText(midiToName(m), KEYS_W - 22, y + 10);
      }
    }
    g.fillStyle = '#0d1220';
    g.fillRect(0, H - VEL_H, KEYS_W, VEL_H);

    // velocity lane
    g.fillStyle = '#0c111e';
    g.fillRect(KEYS_W, H - VEL_H, W - KEYS_W, VEL_H);
    g.strokeStyle = '#232c44';
    g.beginPath();
    g.moveTo(0, H - VEL_H + 0.5);
    g.lineTo(W, H - VEL_H + 0.5);
    g.stroke();
    for (const n of clip.notes) {
      const x = this.beatToX(n.start);
      const bh = (H - 10 - (H - VEL_H)) * n.vel;
      g.fillStyle = this.app.state.selection.noteId === n.id ? '#fff' : track.color;
      g.fillRect(x, H - 4 - bh, Math.max(3, Math.min(10, n.len * this.pxPerBeat)), bh);
      this._hits.push({ x: x - 2, y: H - VEL_H, w: Math.max(10, n.len * this.pxPerBeat), h: VEL_H, type: 'vel', note: n });
    }
    g.fillStyle = '#44557a';
    g.font = '9px system-ui';
    g.fillText('velocity', KEYS_W + 6, H - VEL_H + 12);

    // playhead (clip-relative)
    const pos = this.app.transport.position - clip.start * 4;
    if (pos >= 0 && this.isPlaying) {
      const x = this.beatToX(((this.app.transport.position - clip.start * 4) % Math.max(0.25, clip.loop ? clip.loopLen : clip.length * 4)));
      if (x >= KEYS_W) {
        g.strokeStyle = '#ff5f7e';
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, H - VEL_H);
        g.stroke();
      }
    }
  }

  /* ---------- events ---------- */

  setup() {
    const cv = this.canvas;
    new ResizeObserver(() => { this._needsDraw = true; }).observe(cv.parentElement);

    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.ctrlKey) {
        this.pxPerBeat = Math.min(80, Math.max(10, this.pxPerBeat * (e.deltaY < 0 ? 1.1 : 0.9)));
      } else if (e.shiftKey) {
        this.scrollX += e.deltaY;
      } else {
        this.scrollY += e.deltaY;
        this.scrollX += e.deltaX;
      }
      this.clampScroll();
      this._needsDraw = true;
    }, { passive: false });

    cv.addEventListener('pointerdown', (e) => this.onDown(e));
    cv.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', () => { this.drag = null; });
    cv.addEventListener('contextmenu', (e) => this.onCtx(e));
  }

  clampScroll() {
    this.scrollX = Math.max(0, Math.min(this.scrollX, Math.max(0, this.contentW() - this._w)));
    this.scrollY = Math.max(0, Math.min(this.scrollY, Math.max(0, this.contentH() - this._h)));
  }

  localXY(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  hitTest(x, y) {
    for (const h of this._hits) {
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h;
    }
    return { type: 'bg' };
  }

  onDown(e) {
    const clip = this.clip();
    if (!clip) return;
    const { x, y } = this.localXY(e);
    const hit = this.hitTest(x, y);
    const st = this.app.state;
    const track = st.selectedTrack();

    // velocity lane
    if (y > this._h - VEL_H && x > KEYS_W) {
      const beat = this.xToBeat(x);
      const note = nearestNote(clip, beat);
      if (note) {
        st.selection.noteId = note.id;
        const vel = Math.min(1, Math.max(0.05, (this._h - y - 4) / (VEL_H - 8)));
        st.updateNote(track.id, clip.id, note.id, { vel }, { undo: false });
        this.drag = { mode: 'vel', note };
        this._needsDraw = true;
      }
      return;
    }

    if (hit.type === 'note') {
      st.selection.noteId = hit.note.id;
      const edge = x > hit.x + hit.w - 6;
      if (edge) {
        st.pushUndo();
        this.drag = { mode: 'resize', note: hit.note, startX: x, origLen: hit.note.len };
      } else {
        st.pushUndo();
        this.drag = { mode: 'move', note: hit.note, startX: x, startY: y, origStart: hit.note.start, origMidi: hit.note.midi, moved: false };
        this.app.engine.preview(track.preset, hit.note.midi);
      }
      this._needsDraw = true;
      return;
    }

    if (x > KEYS_W && y < this._h - VEL_H) {
      const beat = Math.max(0, Math.round(this.xToBeat(x) / this.snapVal()) * this.snapVal());
      const midi = Math.min(HI, Math.max(LO, this.yToMidi(y)));
      this.app.state.pushUndo();
      const n = this.app.state.addNote(track.id, clip.id, { midi, start: beat, len: this.lastLen || 0.5, vel: 0.85 });
      this.app.state.selection.noteId = n.id;
      this.app.engine.preview(track.preset, midi);
      this.drag = { mode: 'resize', note: n, startX: x, origLen: n.len };
      this._needsDraw = true;
    }
  }

  onMove(e) {
    const { x, y } = this.localXY(e);
    const d = this.drag;
    if (!d) {
      const hit = this._hits.find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
      this.canvas.style.cursor = hit && hit.type === 'note' && x > hit.x + hit.w - 6 ? 'ew-resize' : 'default';
      return;
    }
    const st = this.app.state;
    const clip = this.clip();
    if (!clip) return;
    if (d.mode === 'move') {
      const dt = (x - d.startX) / this.pxPerBeat;
      const dm = -Math.round((y - d.startY) / 14);
      const midi = Math.min(HI, Math.max(LO, d.origMidi + dm));
      const ns = Math.max(0, Math.round((d.origStart + dt) / this.snapVal()) * this.snapVal());
      if (midi !== d.note.midi || ns !== d.note.start) {
        d.moved = true;
        st.updateNote(st.selection.trackId, clip.id, d.note.id, { midi, start: ns }, { undo: false });
        this._needsDraw = true;
      }
    } else if (d.mode === 'resize') {
      const nl = Math.max(0.25, Math.round((d.origLen + (x - d.startX) / this.pxPerBeat) / this.snapVal()) * this.snapVal());
      if (nl !== d.note.len) {
        st.updateNote(st.selection.trackId, clip.id, d.note.id, { len: nl }, { undo: false });
        this.lastLen = nl;
        this._needsDraw = true;
      }
    } else if (d.mode === 'vel') {
      const beat = Math.max(0, this.xToBeat(x));
      const n = nearestNote(clip, beat);
      if (n) {
        const vel = Math.min(1, Math.max(0.05, (this._h - y - 4) / (VEL_H - 8)));
        st.updateNote(st.selection.trackId, clip.id, n.id, { vel }, { undo: false });
        this._needsDraw = true;
      }
    }
  }

  onCtx(e) {
    e.preventDefault();
    const clip = this.clip();
    if (!clip) return;
    const { x, y } = this.localXY(e);
    const hit = this._hits.find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    const st = this.app.state;
    const trackId = st.selection.trackId;
    const gridBeats = this.snapVal();
    if (hit && hit.type === 'note') {
      ctxMenu(e.clientX, e.clientY, [
        { label: '▦ Quantize note to grid', onClick: () => st.quantizeNotes(trackId, clip.id, [hit.note.id], gridBeats) },
        { label: '▦ Quantize all notes to grid', onClick: () => st.quantizeNotes(trackId, clip.id, null, gridBeats) },
        'sep',
        { label: '🗑 Delete note', onClick: () => st.removeNote(trackId, clip.id, hit.note.id) }
      ]);
    } else {
      ctxMenu(e.clientX, e.clientY, [
        { label: '▦ Quantize all notes to grid', onClick: () => st.quantizeNotes(trackId, clip.id, null, gridBeats) }
      ]);
    }
  }
}

/* ---------------- helpers ---------------- */

function scaleSetOf(project) {
  const scale = SCALES[project.scale] || SCALES.minor;
  const rootPc = noteNameToPc(project.key);
  return new Set(scale.map((s) => (rootPc + s) % 12));
}

function noteNameToPc(name) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return Math.max(0, names.indexOf((name || 'C').trim()));
}

function nearestNote(clip, beat) {
  let best = null;
  let bestD = 0.4;
  for (const n of clip.notes) {
    const d = Math.abs(n.start - beat);
    if (d < bestD) { bestD = d; best = n; }
  }
  return best;
}

function roundRect(g, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}
