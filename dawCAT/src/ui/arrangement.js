/* dawCAT — arrangement timeline: canvas lanes, clips, automation, drag & drop */
import { el, toast, ctxMenu, hideCtxMenu, showModal, closeModal } from './common.js';
import { SNAP_VALUES, TRACK_COLORS, uid } from '../state.js';
import { cueToClipSpec } from './browser.js';

const HEADER_W = 170;
const RULER_H = 28;
const LANE_H = 64;
const AUTO_LANE_H = 56;

export class Arrangement {
  constructor(app) {
    this.app = app;
    this.canvas = document.getElementById('arr-canvas');
    this.g = this.canvas.getContext('2d');
    this.pxPerBar = 48;
    this.scrollX = 0;
    this.scrollY = 0;
    this.drag = null;
    this._hits = [];
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
  get snapVal() { const v = SNAP_VALUES[this.app.snap]; return v == null ? 1 : v; }
  get isPlaying() { return this.app.transport.playing; }

  /* ---------- geometry ---------- */

  beatToX(beat) { return HEADER_W + (beat * this.pxPerBar) / 4 - this.scrollX; }
  xToBeat(x) { return ((x + this.scrollX - HEADER_W) * 4) / this.pxPerBar; }
  snapBeat(beat) {
    const s = this.snapVal;
    return s ? Math.max(0, Math.round(beat / s) * s) : Math.max(0, beat);
  }
  contentW() { return this.project.bars * this.pxPerBar; }
  contentH() { return RULER_H + this.project.tracks.length * LANE_H + 3 * AUTO_LANE_H; }

  autoLanes() {
    const sel = this.app.state.selectedTrack();
    const lanes = [];
    if (sel) {
      lanes.push({ owner: sel.id, param: 'volume', label: `${sel.name} · Volume` });
      lanes.push({ owner: sel.id, param: 'pan', label: `${sel.name} · Pan` });
    }
    lanes.push({ owner: 'master', param: 'volume', label: 'Master · Volume' });
    return lanes;
  }

  autoLaneIndex(lane) {
    const sel = this.app.state.selectedTrack();
    const keys = [];
    if (sel) { keys.push(sel.id + ':volume'); keys.push(sel.id + ':pan'); }
    keys.push('master:volume');
    return keys.indexOf(lane.owner + ':' + lane.param);
  }

  autoLaneTop(lane) {
    return RULER_H + this.project.tracks.length * LANE_H - this.scrollY + this.autoLaneIndex(lane) * AUTO_LANE_H;
  }

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
    const v = document.getElementById('view-arrangement');
    return !!v && v.classList.contains('active');
  }

  /* ---------- drawing ---------- */

  draw() {
    const g = this.g;
    const p = this.project;
    const W = this._w, H = this._h;
    g.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    g.fillStyle = '#0b0f19';
    g.fillRect(0, 0, W, H);
    this._hits = [];

    const soloed = p.tracks.some((t) => t.solo);
    for (let i = 0; i < p.tracks.length; i++) {
      const y = RULER_H + i * LANE_H - this.scrollY;
      if (y + LANE_H < 0 || y > H) continue;
      this.drawLane(g, p.tracks[i], i, y, soloed, W);
    }

    const lanes = this.autoLanes();
    const autoY = RULER_H + p.tracks.length * LANE_H - this.scrollY;
    lanes.forEach((lane, li) => this.drawAutoLane(g, lane, autoY + li * AUTO_LANE_H, W));

    this.drawRuler(g, W);

    const px = this.beatToX(this.app.transport.position);
    if (px >= HEADER_W - 1) {
      g.strokeStyle = '#ff5f7e';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(px, 0);
      g.lineTo(px, H);
      g.stroke();
      g.lineWidth = 1;
      g.fillStyle = '#ff5f7e';
      g.beginPath();
      g.moveTo(px - 5, 0);
      g.lineTo(px + 5, 0);
      g.lineTo(px, 8);
      g.fill();
    }

    if (!p.tracks.length) {
      g.fillStyle = 'rgba(154,178,215,.55)';
      g.font = '14px system-ui';
      g.textAlign = 'center';
      g.fillText('Drag an instrument from the browser here — or double-click an empty lane to add a clip', W / 2, H / 2);
      g.textAlign = 'left';
    }
  }

  drawRuler(g, W) {
    const p = this.project;
    g.fillStyle = '#101627';
    g.fillRect(0, 0, W, RULER_H);
    g.strokeStyle = '#232c44';
    g.beginPath();
    g.moveTo(0, RULER_H - 0.5);
    g.lineTo(W, RULER_H - 0.5);
    g.stroke();

    if (p.loop.on) {
      const x0 = this.beatToX(p.loop.start * 4);
      const x1 = this.beatToX(p.loop.end * 4);
      g.fillStyle = 'rgba(90,162,255,.22)';
      g.fillRect(x0, 0, Math.max(2, x1 - x0), RULER_H);
      g.fillStyle = '#5aa2ff';
      g.fillRect(x0, 0, 3, RULER_H);
      g.fillRect(x1 - 3, 0, 3, RULER_H);
    }

    const firstBar = Math.max(0, Math.floor(this.scrollX / this.pxPerBar));
    const lastBar = Math.min(p.bars, Math.ceil((this.scrollX + W) / this.pxPerBar) + 1);
    g.font = '10px ui-monospace, monospace';
    g.textAlign = 'left';
    for (let bar = firstBar; bar < lastBar; bar++) {
      const x = this.beatToX(bar * 4);
      g.strokeStyle = bar % 4 === 0 ? '#2c3654' : '#1c2337';
      g.beginPath();
      g.moveTo(x + 0.5, bar % 4 === 0 ? 0 : 14);
      g.lineTo(x + 0.5, RULER_H);
      g.stroke();
      if (bar % 4 === 0 || this.pxPerBar > 90) {
        g.fillStyle = '#7f93b8';
        g.fillText(String(bar + 1), x + 4, 12);
      }
    }
    g.fillStyle = '#0d1220';
    g.fillRect(0, 0, HEADER_W, RULER_H);
    g.strokeStyle = '#232c4a';
    g.strokeRect(0.5, 0.5, HEADER_W, RULER_H);
    g.fillStyle = '#5c6f8f';
    g.font = '10px system-ui';
    g.fillText('Tracks', 10, 18);
  }

  drawLane(g, t, i, y, soloed, W) {
    const selected = this.app.state.selection.trackId === t.id;
    g.fillStyle = i % 2 ? '#0d1220' : '#0b0f19';
    g.fillRect(HEADER_W, y, W - HEADER_W, LANE_H);
    g.strokeStyle = '#161d30';
    g.strokeRect(HEADER_W + 0.5, y + 0.5, W - HEADER_W - 1, LANE_H - 1);

    const firstBar = Math.max(0, Math.floor(this.scrollX / this.pxPerBar));
    const lastBar = Math.min(this.project.bars, Math.ceil((this.scrollX + W) / this.pxPerBar) + 1);
    for (let bar = firstBar; bar <= lastBar; bar++) {
      const x = this.beatToX(bar * 4);
      g.strokeStyle = bar % 4 === 0 ? '#1d2540' : '#141a2c';
      g.beginPath();
      g.moveTo(x + 0.5, y);
      g.lineTo(x + 0.5, y + LANE_H);
      g.stroke();
    }

    for (const c of t.clips) this.drawClip(g, t, c, y, soloed);

    g.fillStyle = selected ? '#141c30' : '#0f1524';
    g.fillRect(0, y, HEADER_W, LANE_H);
    g.strokeStyle = '#232c4a';
    g.strokeRect(0.5, y + 0.5, HEADER_W, LANE_H - 1);
    g.fillStyle = t.color;
    g.fillRect(0, y, 5, LANE_H);
    g.fillStyle = '#dbe6f8';
    g.font = 'bold 12px system-ui';
    g.fillText(t.name, 12, y + 20);
    g.fillStyle = '#5c6f8f';
    g.font = '10px system-ui';
    g.fillText(t.kind === 'drum' ? `drum · ${t.drumKit}` : (t.preset && t.preset.kind) || 'synth', 12, y + 36);

    const btn = (bx, label, on, color) => {
      g.fillStyle = on ? color : '#1a2236';
      g.fillRect(bx, y + LANE_H - 22, 20, 16);
      g.fillStyle = on ? '#fff' : '#7f93b8';
      g.font = 'bold 10px system-ui';
      g.textAlign = 'center';
      g.fillText(label, bx + 10, y + LANE_H - 11);
      g.textAlign = 'left';
      this._hits.push({ x: bx, y: y + LANE_H - 22, w: 20, h: 20, type: 'trackBtn', track: t, action: label });
    };
    btn(24, 'S', t.solo, '#e8a13c');
    btn(48, 'M', t.mute, '#e05c74');
    g.fillStyle = t.arm ? '#ff5f7e' : '#2a3350';
    g.beginPath();
    g.arc(HEADER_W - 16, y + LANE_H - 12, 5, 0, Math.PI * 2);
    g.fill();
    this._hits.push({ x: HEADER_W - 26, y: y + LANE_H - 24, w: 26, h: 24, type: 'trackBtn', track: t, action: 'arm' });

    if (soloed && !t.solo && !t.mute) {
      g.fillStyle = 'rgba(6,9,16,.45)';
      g.fillRect(HEADER_W, y, W - HEADER_W, LANE_H);
    }
  }

  drawClip(g, t, c, laneY, soloed) {
    const x0 = this.beatToX(c.start * 4);
    const x1 = this.beatToX((c.start + c.length) * 4);
    if (x1 < HEADER_W || x0 > this._w) return;
    const y = laneY + 6;
    const h = LANE_H - 18;
    const w = Math.max(6, x1 - x0);
    const muted = t.mute || (soloed && !t.solo);

    g.fillStyle = muted ? '#1a2133' : (c.color || t.color);
    roundRect(g, x0, y, w, h, 5);
    g.fill();
    g.fillStyle = 'rgba(0,0,0,.25)';
    g.fillRect(x0 + 1, y + h - 12, w - 2, 12);
    g.strokeStyle = this.app.state.selection.clipId === c.id ? '#ffffff' : 'rgba(0,0,0,.4)';
    roundRect(g, x0, y, w, h, 5);
    g.stroke();

    g.save();
    roundRect(g, x0, y, w, h, 5);
    g.clip();
    g.fillStyle = 'rgba(255,255,255,.92)';
    g.font = 'bold 10px system-ui';
    g.fillText(c.name || 'Clip', x0 + 6, y + 13);

    if (t.kind === 'drum' && c.steps) {
      g.fillStyle = 'rgba(255,255,255,.75)';
      const laneKeys = Object.keys(c.steps);
      laneKeys.forEach((lane, li) => {
        const arr = c.steps[lane];
        for (let bar = 0; bar < c.length; bar++) {
          for (let s = 0; s < 16; s++) {
            if (!arr[s]) continue;
            const px = this.beatToX(c.start * 4 + bar * 4 + s * 0.25);
            const py = y + 18 + (li * (h - 22)) / Math.max(1, laneKeys.length);
            g.fillRect(px, py, Math.max(2, (this.pxPerBar / 16) * 0.6), 3);
          }
        }
      });
    } else if (c.sample) {
      g.fillStyle = 'rgba(255,255,255,.6)';
      g.font = '9px system-ui';
      g.fillText('∿ ' + (c.sample.startsWith('sfx:') ? c.sample.slice(4) : c.sample), x0 + 6, y + 30);
      g.fillStyle = 'rgba(255,255,255,.4)';
      for (let i = 0; i < 24; i++) {
        const bx = x0 + 6 + i * ((w - 12) / 24);
        const bh = 4 + ((i * 7919) % 13);
        g.fillRect(bx, y + h - 16 - bh, 3, bh);
      }
    } else {
      g.fillStyle = 'rgba(255,255,255,.9)';
      const reps = c.loop ? Math.ceil((c.length * 4) / Math.max(0.25, c.loopLen)) : 1;
      for (const n of c.notes) {
        for (let r = 0; r < reps; r++) {
          const beat = r * (c.loop ? c.loopLen : 0) + n.start;
          if (beat >= c.length * 4) continue;
          const nx = this.beatToX(c.start * 4 + beat);
          const nw = Math.max(2, (n.len * this.pxPerBar) / 4);
          const ny = Math.max(y + 14, y + h - 14 - ((n.midi - 24) / 72) * (h - 22));
          g.globalAlpha = 0.35 + n.vel * 0.6;
          g.fillRect(nx, ny, nw, 2.5);
          g.globalAlpha = 1;
        }
      }
    }
    g.restore();

    this._hits.push({ x: x0 - 3, y, w: 7, h, type: 'clipEdge', clip: c, track: t, edge: 'l' });
    this._hits.push({ x: x1 - 3, y, w: 7, h, type: 'clipEdge', clip: c, track: t, edge: 'r' });
    this._hits.push({ x: x0, y, w: Math.max(2, x1 - x0), h, type: 'clip', clip: c, track: t });
  }

  drawAutoLane(g, lane, y, W) {
    const H = AUTO_LANE_H;
    g.fillStyle = '#0c111e';
    g.fillRect(HEADER_W, y, W - HEADER_W, H);
    g.strokeStyle = '#161d30';
    g.strokeRect(HEADER_W + 0.5, y + 0.5, W - HEADER_W - 1, H - 1);

    g.fillStyle = '#0f1524';
    g.fillRect(0, y, HEADER_W, H);
    g.strokeStyle = '#232c4a';
    g.strokeRect(0.5, y + 0.5, HEADER_W, H);
    g.fillStyle = '#8fa3c8';
    g.font = '11px system-ui';
    g.fillText(lane.label, 10, y + 18);
    g.fillStyle = '#44557a';
    g.font = '9px system-ui';
    g.fillText(lane.param === 'pan' ? '-1 … +1' : '0 … 1', 12, y + H - 8);
    this._hits.push({ x: 0, y, w: HEADER_W, h: H, type: 'autoHead', lane });

    g.strokeStyle = '#141a2c';
    for (let bar = 0; bar <= this.project.bars; bar++) {
      const x = this.beatToX(bar * 4);
      g.beginPath();
      g.moveTo(x + 0.5, y);
      g.lineTo(x + 0.5, y + H);
      g.stroke();
    }

    const list = autoList(this.project, lane);
    const toY = (v) => lane.param === 'pan'
      ? y + H / 2 - v * (H / 2 - 6)
      : y + H - 8 - v * (H - 16);
    if (list.length) {
      g.strokeStyle = '#5aa2ff';
      g.lineWidth = 1.5;
      g.beginPath();
      list.forEach((pt, i) => {
        const x = this.beatToX(pt.beat);
        const yy = toY(pt.value);
        if (i === 0) g.moveTo(x, yy);
        else g.lineTo(x, yy);
      });
      g.stroke();
      g.lineWidth = 1;
      for (const pt of list) {
        const x = this.beatToX(pt.beat);
        const yy = toY(pt.value);
        g.fillStyle = '#5aa2ff';
        g.beginPath();
        g.arc(x, yy, 4, 0, Math.PI * 2);
        g.fill();
        this._hits.push({ x: x - 6, y: yy - 6, w: 12, h: 12, type: 'autoPoint', lane, pt });
      }
    }
  }

  /* ---------- hit testing ---------- */

  hitTest(x, y) {
    if (y < RULER_H) return { type: 'ruler' };
    for (const h of this._hits) {
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h;
    }
    if (x > HEADER_W && y > RULER_H) {
      const laneIdx = Math.floor((y + this.scrollY - RULER_H) / LANE_H);
      if (laneIdx >= 0 && laneIdx < this.project.tracks.length) {
        return { type: 'lane', track: this.project.tracks[laneIdx], laneIdx };
      }
    }
    return { type: 'bg' };
  }

  /* ---------- events ---------- */

  setup() {
    const cv = this.canvas;
    new ResizeObserver(() => { this._needsDraw = true; }).observe(cv.parentElement);

    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.ctrlKey) {
        this.setZoom(this.pxPerBar * (e.deltaY < 0 ? 1.1 : 0.9));
        return;
      }
      if (e.shiftKey) this.scrollX += (e.deltaY || e.deltaX);
      else { this.scrollY += e.deltaY; this.scrollX += e.deltaX; }
      this.clampScroll();
      this._needsDraw = true;
    }, { passive: false });

    cv.addEventListener('pointerdown', (e) => this.onDown(e));
    cv.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    cv.addEventListener('dblclick', (e) => this.onDbl(e));
    cv.addEventListener('contextmenu', (e) => this.onCtx(e));
    cv.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    cv.addEventListener('drop', (e) => this.onDrop(e));
  }

  clampScroll() {
    const maxX = Math.max(0, this.contentW() - (this._w - HEADER_W));
    const maxY = Math.max(0, this.contentH() - this._h);
    this.scrollX = Math.min(Math.max(0, this.scrollX), maxX);
    this.scrollY = Math.min(Math.max(0, this.scrollY), maxY);
  }

  setZoom(pxPerBar) {
    this.pxPerBar = Math.min(200, Math.max(12, pxPerBar));
    const zr = document.getElementById('zoom-range');
    if (zr) zr.value = String(Math.round(this.pxPerBar));
    this.clampScroll();
    this._needsDraw = true;
  }

  zoomFit() {
    if (!this.project.bars) return;
    this.setZoom(Math.max(16, (this._w - HEADER_W - 20) / this.project.bars));
  }

  localXY(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  onDown(e) {
    if (e.button === 1) return;
    const { x, y } = this.localXY(e);
    const hit = this.hitTest(x, y);
    const st = this.app.state;

    if (hit.type === 'ruler') {
      const beat = Math.max(0, this.xToBeat(x));
      if (this.project.loop.on) {
        st.pushUndo();
        this.project.loop.start = Math.max(0, Math.floor(beat / 4));
        this.project.loop.end = this.project.loop.start + 1;
        this.drag = { mode: 'loop', startX: x, moved: false };
      } else {
        this.drag = { mode: 'scrub', startX: x, moved: false };
        this.app.transport.seek(beat);
      }
      this._needsDraw = true;
      return;
    }

    if (hit.type === 'trackBtn') {
      const t = hit.track;
      st.pushUndo();
      if (hit.action === 'S') st.updateTrack(t.id, { solo: !t.solo }, { undo: false });
      else if (hit.action === 'M') st.updateTrack(t.id, { mute: !t.mute }, { undo: false });
      else st.updateTrack(t.id, { arm: !t.arm }, { undo: false });
      return;
    }

    if (hit.type === 'autoHead') {
      this._needsDraw = true;
      return;
    }

    if (hit.type === 'autoPoint') {
      this.drag = { mode: 'autoPoint', lane: hit.lane };
      return;
    }

    if (hit.type === 'clipEdge') {
      st.select(hit.track.id, hit.clip.id);
      st.pushUndo();
      this.drag = { mode: 'resize', clip: hit.clip, track: hit.track, edge: hit.edge, startX: x, origStart: hit.clip.start, origLen: hit.clip.length };
      return;
    }

    if (hit.type === 'clip') {
      st.select(hit.track.id, hit.clip.id);
      st.pushUndo();
      this.drag = {
        mode: 'clipMove',
        clip: hit.clip,
        track: hit.track,
        startX: x,
        origStart: hit.clip.start,
        origTrackId: hit.track.id,
        moved: false,
        alt: e.altKey
      };
      return;
    }

    if (hit.type === 'lane') {
      st.select(hit.track.id);
      return;
    }

    this.drag = { mode: 'pan', startX: x, startY: y, scrollX: this.scrollX, scrollY: this.scrollY };
  }

  onMove(e) {
    const { x, y } = this.localXY(e);
    const d = this.drag;
    if (!d) {
      const hit = this.hitTest(x, y);
      this.canvas.style.cursor = hit.type === 'clipEdge' ? 'ew-resize' : hit.type === 'clip' ? 'grab' : 'default';
      return;
    }
    const st = this.app.state;
    if (d.mode === 'clipMove') {
      const dt = ((x - d.startX) * 4) / this.pxPerBar;
      let ns = this.snapBeat(d.origStart + dt);
      if (d.track.kind === 'drum') ns = Math.max(0, Math.round(ns / 4) * 4);
      if (ns !== d.clip.start) {
        d.moved = true;
        d.lastStart = ns;
        st.updateClip(d.track.id, d.clip.id, { start: ns }, { undo: false });
        this._needsDraw = true;
      }
    } else if (d.mode === 'resize') {
      const dt = ((x - d.startX) * 4) / this.pxPerBar;
      if (d.edge === 'r') {
        let nl = this.snapBeat(d.origLen + dt);
        if (d.track.kind === 'drum') nl = Math.max(1, Math.round(nl));
        nl = Math.max(0.25, nl);
        if (nl !== d.clip.length) {
          st.updateClip(d.track.id, d.clip.id, { length: nl }, { undo: false });
          this._needsDraw = true;
        }
      } else {
        const ns = this.snapBeat(d.origStart + dt);
        const nlen = d.origLen - (ns - d.origStart);
        if (ns >= 0 && nlen >= 0.25 && (ns !== d.clip.start || nlen !== d.clip.length)) {
          st.updateClip(d.track.id, d.clip.id, { start: ns, length: nlen }, { undo: false });
          this._needsDraw = true;
        }
      }
    } else if (d.mode === 'loop') {
      const bar = Math.max(0, Math.floor(this.xToBeat(x) / 4));
      if (bar + 1 > this.project.loop.start) {
        this.project.loop.end = bar + 1;
        d.moved = true;
        this._needsDraw = true;
      }
    } else if (d.mode === 'scrub') {
      this.app.transport.seek(Math.max(0, this.xToBeat(x)));
      this._needsDraw = true;
    } else if (d.mode === 'autoPoint') {
      const beat = Math.round(Math.max(0, this.xToBeat(x)) * 4) / 4;
      const value = this.autoValueAtY(d.lane, y);
      st.setAutoPoint(d.lane.owner, d.lane.param, Math.round(beat * 4) / 4, value);
      this._needsDraw = true;
    } else if (d.mode === 'pan') {
      this.scrollX = Math.max(0, d.scrollX - (x - d.startX));
      this.scrollY = Math.max(0, d.scrollY - (y - d.startY));
      this.clampScroll();
      this._needsDraw = true;
    }
  }

  onUp(e) {
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    if (d.mode === 'clipMove' && d.alt) {
      // keep a duplicate at the dragged position, restore the original
      const st = this.app.state;
      const copy = JSON.parse(JSON.stringify(d.clip));
      copy.id = uid('c');
      copy.name = (d.clip.name || 'Clip') + ' copy';
      copy.notes.forEach((n) => { n.id = uid('n'); });
      copy.start = d.clip.start;
      st.addClip(d.track.id, copy);
      st.updateClip(d.track.id, d.clip.id, { start: d.origStart }, { undo: false });
    }
    if (d.mode === 'loop' && !d.moved) {
      const { x } = this.localXY(e);
      this.app.transport.seek(Math.max(0, this.xToBeat(x)));
    }
    this._needsDraw = true;
  }

  onDbl(e) {
    const { x, y } = this.localXY(e);
    const hit = this.hitTest(x, y);
    if (hit.type === 'clip') {
      this.app.openClipEditor(hit.clip.id);
      return;
    }
    if (hit.type === 'lane') {
      const t = hit.track;
      const bar = Math.max(0, Math.floor(this.xToBeat(x) / 4));
      const clip = this.app.state.addClip(t.id, t.kind === 'drum'
        ? { start: bar, length: 1, name: 'Beat' }
        : { start: bar, length: 4 });
      this.app.state.select(t.id, clip.id);
      this.app.openClipEditor(clip.id);
    }
  }

  onCtx(e) {
    e.preventDefault();
    const { x, y } = this.localXY(e);
    const hit = this.hitTest(x, y);
    const st = this.app.state;
    if (hit.type === 'clip') {
      st.select(hit.track.id, hit.clip.id);
      const c = hit.clip;
      ctxMenu(e.clientX, e.clientY, [
        { label: '✎ Rename…', onClick: () => this.renameClip(c) },
        { label: '⧉ Duplicate', key: 'Ctrl+D', onClick: () => st.duplicateClip(hit.track.id, c.id) },
        { label: '✂ Split at Playhead', onClick: () => st.splitClip(hit.track.id, c.id, Math.round(this.app.transport.position / 4)) },
        { label: '💾 Save Clip to Library', onClick: () => this.app.browser.saveClipToLibrary(c, hit.track.kind) },
        'sep',
        { label: c.loop ? '⤓ Unloop clip' : '🔁 Loop clip', onClick: () => st.updateClip(hit.track.id, c.id, { loop: !c.loop }) },
        'sep',
        { label: '🗑 Delete', key: 'Del', onClick: () => st.removeClip(hit.track.id, c.id) }
      ]);
    } else if (hit.type === 'lane') {
      st.select(hit.track.id);
      ctxMenu(e.clientX, e.clientY, [
        { label: '＋ New clip here', onClick: () => this.createClipAt(hit.track, this.xToBeat(x)) },
        { label: '✎ Rename track…', onClick: () => this.renameTrack(hit.track) },
        { label: '🎨 Cycle color', onClick: () => this.cycleTrackColor(hit.track) },
        'sep',
        { label: '🗑 Delete track', onClick: () => { if (confirm(`Delete track "${hit.track.name}"?`)) st.removeTrack(hit.track.id); } }
      ]);
    }
  }

  onDrop(e) {
    e.preventDefault();
    let data = null;
    try { data = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (err) { return; }
    if (!data) return;
    const { x, y } = this.localXY(e);
    const bar = Math.max(0, Math.floor(this.xToBeat(x) / 4));
    const laneIdx = Math.floor((y + this.scrollY - RULER_H) / LANE_H);
    const st = this.app.state;
    const trackAt = (i) => (i >= 0 && i < st.project.tracks.length) ? st.project.tracks[i] : null;

    if (data.kind === 'preset') {
      const t = trackAt(laneIdx);
      if (t && t.kind === 'synth') {
        st.updateTrack(t.id, { preset: data.preset });
        st.select(t.id);
        toast(`${data.name} → ${t.name}`);
      } else {
        this.newTrackWithPreset(data.name, data.preset, bar);
      }
    } else if (data.kind === 'presetNewTrack') {
      this.newTrackWithPreset(data.name, data.preset, bar);
    } else if (data.kind === 'kit') {
      const t0 = trackAt(laneIdx);
      let t = t0 && t0.kind === 'drum' ? t0 : null;
      if (!t) t = st.addTrack({ name: data.name, kind: 'drum', drumKit: data.kit });
      else st.updateTrack(t.id, { drumKit: data.kit });
      st.select(t.id);
      toast(`${data.name} → ${t.name}`);
    } else if (data.kind === 'device') {
      const t = trackAt(laneIdx) || st.selectedTrack();
      if (!t) { toast('Drop onto a track', true); return; }
      st.addDevice(t.id, data.type);
      toast(`${data.name} → ${t.name}`);
    } else if (data.kind === 'sample') {
      const t = trackAt(laneIdx) || st.selectedTrack();
      if (!t) { toast('Drop onto a track', true); return; }
      const clip = st.addClip(t.id, { name: data.name, start: bar, length: 4, sample: data.sample });
      st.select(t.id, clip.id);
    } else if (data.kind === 'cue') {
      const cue = findCue(st.project, data.cueId);
      if (!cue) return;
      const spec = cueToClipSpec(cue);
      const t = trackAt(laneIdx) || st.selectedTrack();
      if (!t) { toast('Drop onto a track', true); return; }
      const clip = st.addClip(t.id, Object.assign({}, spec.patch, { start: bar }));
      if (spec.presetPatch && t.kind === 'synth') {
        st.updateTrack(t.id, { preset: Object.assign({}, t.preset, spec.presetPatch) });
      }
      st.select(t.id, clip.id);
      toast(`Imported "${cue.name}" at bar ${bar + 1}`);
    } else if (data.kind === 'clip') {
      const t = trackAt(laneIdx) || st.selectedTrack();
      if (!t) { toast('Drop onto a track', true); return; }
      this.app.browser.pasteClip(data.clip, t.id, bar);
    }
  }

  /* ---------- actions ---------- */

  createClipAt(track, bar) {
    const clip = this.app.state.addClip(track.id, track.kind === 'drum'
      ? { start: bar, length: 1, name: 'Beat' }
      : { start: bar, length: 4 });
    this.app.state.select(track.id, clip.id);
    this.app.openClipEditor(clip.id);
  }

  newTrackWithPreset(name, preset, bar) {
    const st = this.app.state;
    const t = st.addTrack({ name, preset: JSON.parse(JSON.stringify(preset)) });
    const clip = st.addClip(t.id, { name, start: bar, length: 4 });
    st.select(t.id, clip.id);
    toast(`${name} track added`);
  }

  renameTrack(t) {
    showModal({
      title: 'Rename Track',
      body: inputRow(t.name),
      buttons: [
        {
          label: 'Rename', primary: true,
          onClick: () => {
            const v = document.getElementById('rename-input').value.trim();
            if (v) this.app.state.updateTrack(t.id, { name: v });
          }
        },
        { label: 'Cancel' }
      ]
    });
  }

  renameClip(c) {
    showModal({
      title: 'Rename Clip',
      body: inputRow(c.name || 'Clip'),
      buttons: [
        {
          label: 'Rename', primary: true,
          onClick: () => {
            const v = document.getElementById('rename-input').value.trim();
            const t = this.app.state.trackOfClip(c.id);
            if (t && v) this.app.state.updateClip(t.id, c.id, { name: v });
          }
        },
        { label: 'Cancel' }
      ]
    });
  }

  cycleTrackColor(t) {
    const i = TRACK_COLORS.indexOf(t.color);
    this.app.state.updateTrack(t.id, { color: TRACK_COLORS[(i + 1) % TRACK_COLORS.length] });
  }

  autoValueAtY(lane, y) {
    const top = this.autoLaneTop(lane);
    const rel = 1 - (y - top) / AUTO_LANE_H;
    if (lane.param === 'pan') return Math.min(1, Math.max(-1, rel * 2 - 1));
    return Math.min(1, Math.max(0, rel));
  }
}

/* ---------------- module helpers ---------------- */

function autoList(project, lane) {
  if (lane.owner === 'master') return project.master.automation[lane.param] || [];
  const t = project.tracks.find((x) => x.id === lane.owner);
  return (t && t.automation && t.automation[lane.param]) || [];
}

function findCue(project, id) {
  return ((project.cueScan || {}).cues || []).find((c) => c.id === id) || null;
}

function inputRow(value) {
  const input = el('input', { id: 'rename-input', type: 'text', value: value || '' });
  setTimeout(() => { input.focus(); input.select(); }, 30);
  return el('div', { class: 'form-row' }, input);
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
