// Skretch — the Roof Road stage 2 review board.
// One long strip of the captured level. Browse it, zoom into any frame,
// sketch fixes with pen/pencil/marker, pin notes, and save the review back
// to Skretch/data/review.json (+ a review.md report) through server.mjs.
import {
  COLORS, emptyReview, routeGeometry, routeReview, locatePoint,
  strokePath, distanceToStroke, mergeReviews, validateReview, reviewMarkdown, uid, clone
} from './js/model.js';

const API = './api/';
const LS_REVIEW = 'skretch:v2:review';
const LS_PREFS = 'skretch:v1:prefs';
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const now = () => new Date().toISOString();

const els = {
  top: $('top'), stripBtn: $('btn-strip'), picker: $('route-picker'), pos: $('pos'),
  saveState: $('save-state'), saveLabel: $('save-label'), saveBtn: $('btn-save'),
  notesBtn: $('btn-notes'), notesCount: $('notes-count'), menuBtn: $('btn-menu'),
  ruler: $('ruler'), rulerTrack: $('ruler-track'), rulerView: $('ruler-view'),
  board: $('board'), scroller: $('scroller'), strip: $('strip'), boot: $('boot'),
  toolbar: $('toolbar'), colors: $('colors'), sizes: $('sizes'),
  undoBtn: $('btn-undo'), redoBtn: $('btn-redo'), zin: $('btn-zin'), zout: $('btn-zout'),
  popup: $('popup'), popTitle: $('pop-title'), noteTitle: $('note-title'), noteBody: $('note-body'),
  noteCats: $('note-cats'), noteColors: $('note-colors'), noteDone: $('note-done'),
  noteAnchor: $('note-anchor'), noteDelete: $('note-delete'), popClose: $('pop-close'),
  drawer: $('drawer'), notesList: $('notes-list'), drawerClose: $('drawer-close'),
  menu: $('menu'), about: $('about'), conflict: $('conflict'),
  report: $('report'), reportBody: $('report-body'), reportClose: $('report-close'),
  toast: $('toast')
};

const state = {
  manifest: null, route: null, geo: null,     // current route + geometry
  review: null, baseRevision: 0,
  online: null,                                // null=unknown, true, false
  dirty: false, saving: false, saveTimer: 0,
  tool: 'hand', color: COLORS[0],
  sizes: { pen: 4, pencil: 2.5, marker: 16 },
  zoom: 1,                                     // strip height / viewport height
  view: { x: 0, y: 0 },                        // scroll offsets (px)
  undoStack: [], redoStack: [],
  editingNote: null,                           // note object being edited
  filter: 'all',                               // notes drawer filter
  strokesDirty: true
};

const TOOL_SIZES = { pen: [2.5, 4, 6.5], pencil: [1.4, 2.5, 4], marker: [9, 16, 26], eraser: [14, 26, 48] };
const TOOL_OPACITY = { pen: 1, pencil: .82, marker: .42 };
const ZMIN = 1, ZMAX = 4;

/* ------------------------------------------------------------ helpers --- */

function toast(msg, ms = 2400) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => els.toast.classList.remove('show'), ms);
}

function scale() { return Math.min(els.board.clientHeight / 750, els.board.clientWidth / 1200) * state.zoom; }
function dispW() { return state.geo.width * scale(); }
function dispH() { return 750 * scale(); }
function topOffset() { return Math.max(0, (els.scroller.clientHeight - dispH()) / 2); }

function frameAtS(route, s) {
  return route.frames.find(f => s >= f.s0 && s < f.s1) || route.frames.at(-1);
}
function sAtX(x) {
  const f = state.geo.frames[clamp(Math.floor(x / 1200), 0, state.geo.frames.length - 1)];
  const u = clamp((x - f.x) / f.width, 0, 1);
  return f.s0 + (f.s1 - f.s0) * u;
}
function xAtS(s) {
  const f = frameAtS(state.route, s);
  const g = state.geo.frames[f.index];
  return g.x + clamp((s - f.s0) / (f.s1 - f.s0 || 1), 0, 1) * g.width;
}
function routePoint(clientX, clientY) {
  const r = els.strip.getBoundingClientRect();
  return { x: (clientX - r.left) / scale(), y: (clientY - r.top) / scale() };
}
const data = () => routeReview(state.review, state.route.id);
const liveStrokes = () => data().strokes.filter(s => !s.deleted);
const liveNotes = () => data().notes.filter(n => !n.deleted)
  .sort((a, b) => a.x - b.x);

/* RDP simplify — keeps files small without losing the hand shape. */
function simplify(points, tol = 1.1) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let max = 0, mi = -1;
    const [ax, ay] = points[a], [bx, by] = points[b];
    const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy || 1;
    for (let i = a + 1; i < b; i++) {
      const t = clamp(((points[i][0] - ax) * dx + (points[i][1] - ay) * dy) / len, 0, 1);
      const d = Math.hypot(points[i][0] - ax - t * dx, points[i][1] - ay - t * dy);
      if (d > max) { max = d; mi = i; }
    }
    if (max > tol && mi > 0) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
  }
  return points.filter((_, i) => keep[i]);
}

/* ------------------------------------------------------------- render --- */

function buildRoute() {
  const route = state.route;
  state.geo = routeGeometry(route);
  els.strip.innerHTML = '';
  const sc = scale(), W = state.geo.width, H = 750;

  const frag = document.createDocumentFragment();
  for (const f of state.geo.frames) {
    const fig = document.createElement('div');
    fig.className = 'frame' + (f.kind === 'turn' ? ' turn' : '');
    fig.style.cssText = `left:${f.x * sc}px;width:${f.width * sc}px;height:${H * sc}px`;
    fig.dataset.frame = f.id;
    const img = document.createElement('img');
    img.src = f.image; img.alt = `${f.title} · ${Math.round(f.s0)}–${Math.round(f.s1)} m`;
    img.draggable = false; img.decoding = 'async';
    if (f.index > 5) img.loading = 'lazy';
    fig.append(img);
    const cap = document.createElement('span');
    cap.className = 'fcap';
    cap.innerHTML = `${f.id.replace('main-', '')} · ${Math.round(f.s0)}–${Math.round(f.s1)} m `;
    const play = document.createElement('a');
    play.href = `../kyoto-rooftops.html?at=${Math.round((f.s0 + f.s1) / 2)}`;
    play.target = '_blank'; play.rel = 'noopener'; play.textContent = '▸ play';
    play.title = 'Open the Roof Road at this spot';
    cap.append(play);
    fig.append(cap);
    frag.append(fig);
  }
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'ink');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  frag.append(svg);
  const pins = document.createElement('div');
  pins.className = 'pins';
  frag.append(pins);
  els.strip.append(frag);
  els.strip.style.width = dispW() + 'px';
  els.strip.style.height = dispH() + 'px';
  els.strip.style.marginTop = topOffset() + 'px';
  state.inkSvg = svg; state.pinsEl = pins;
  renderInk(); renderPins(); buildRuler();
}

function pathFor(stroke) {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', strokePath(stroke.points));
  p.setAttribute('fill', 'none');
  p.setAttribute('stroke', stroke.color);
  p.setAttribute('stroke-width', stroke.size);
  p.setAttribute('stroke-linecap', 'round');
  p.setAttribute('stroke-linejoin', 'round');
  p.setAttribute('opacity', TOOL_OPACITY[stroke.tool] ?? 1);
  p.dataset.id = stroke.id;
  return p;
}

function renderInk() {
  const svg = state.inkSvg;
  svg.querySelectorAll('path').forEach(p => p.remove());
  const frag = document.createDocumentFragment();
  for (const s of liveStrokes()) frag.append(pathFor(s));
  svg.append(frag);
}

function renderPins() {
  const sc = scale();
  const pins = state.pinsEl;
  pins.innerHTML = '';
  liveNotes().forEach((n, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pin' + (n.status === 'done' ? ' done' : '');
    b.style.left = n.x * sc + 'px'; b.style.top = n.y * sc + 'px';
    b.style.background = n.color;
    b.textContent = i + 1;
    b.title = `${n.title} — ${n.category}`;
    b.dataset.id = n.id;
    b.addEventListener('pointerdown', e => e.stopPropagation());
    b.addEventListener('click', e => { e.stopPropagation(); openNote(n); });
    pins.append(b);
  });
  els.notesCount.textContent = Object.values(state.review.routes)
    .reduce((n, r) => n + r.notes.filter(x => !x.deleted).length, 0);
}

function layout() {
  const sc = scale();
  els.strip.style.width = dispW() + 'px';
  els.strip.style.height = dispH() + 'px';
  els.strip.style.marginTop = topOffset() + 'px';
  state.inkSvg.setAttribute('width', dispW());
  state.inkSvg.setAttribute('height', dispH());
  for (const f of els.strip.querySelectorAll('.frame')) {
    const fr = state.geo.frames.find(g => g.id === f.dataset.frame);
    f.style.left = fr.x * sc + 'px'; f.style.width = fr.width * sc + 'px'; f.style.height = 750 * sc + 'px';
  }
  for (const p of state.pinsEl.querySelectorAll('.pin')) {
    const n = liveNotes().find(m => m.id === p.dataset.id);
    if (n) { p.style.left = n.x * sc + 'px'; p.style.top = n.y * sc + 'px'; }
  }
  applyView(); updateRulerView(); updatePos();
}

function applyView() {
  const maxX = Math.max(0, dispW() - els.scroller.clientWidth);
  const maxY = Math.max(0, dispH() - els.scroller.clientHeight);
  state.view.x = clamp(state.view.x, 0, maxX);
  state.view.y = clamp(state.view.y, 0, maxY);
  els.scroller.scrollLeft = state.view.x;
  els.scroller.scrollTop = state.view.y;
}

/* Center helpers in route px. */
function centerX() { return state.view.x / scale() + els.scroller.clientWidth / scale() / 2; }
function zoomTo(z, anchorClient) {
  z = clamp(z, ZMIN, ZMAX);
  const rect = els.scroller.getBoundingClientRect();
  const ax = (anchorClient ? anchorClient.x : rect.left + rect.width / 2) - rect.left;
  const ay = (anchorClient ? anchorClient.y : rect.top + rect.height / 2) - rect.top;
  const sc0 = scale(), rx = (state.view.x + ax) / sc0, ry = (state.view.y + ay - topOffset()) / sc0;
  state.zoom = z;
  const sc1 = scale();
  layout();
  state.view.x = rx * sc1 - ax; state.view.y = ry * sc1 + topOffset() - ay;
  applyView(); updateRulerView(); updatePos();
  els.stripBtn.hidden = state.zoom <= 1.02;
}
function zoomRoute(z, rx, ry) { // route-px anchored
  const sc = scale();
  zoomTo(z, { x: els.scroller.getBoundingClientRect().left + rx * sc - state.view.x,
              y: els.scroller.getBoundingClientRect().top + topOffset() + ry * sc - state.view.y });
}
function jumpTo(rx, ry, z = 2.2) {
  if (z) zoomRoute(z, rx, ry);
  state.view.x = rx * scale() - els.scroller.clientWidth / 2;
  state.view.y = ry * scale() + topOffset() - els.scroller.clientHeight / 2;
  applyView(); updateRulerView(); updatePos();
}

/* -------------------------------------------------------------- ruler --- */

function buildRuler() {
  els.rulerTrack.innerHTML = '';
  const W = state.geo.width, cssW = els.ruler.clientWidth, k = cssW / W;
  const frag = document.createDocumentFragment();
  if (state.route.id === 'main') {
    for (const m of state.manifest.districts) {
      const x0 = xAtS(m.s0), x1 = xAtS(Math.min(m.s1, state.route.length));
      const seg = document.createElement('div');
      seg.className = 'seg';
      seg.style.cssText = `left:${x0 * k}px;width:${Math.max(3, (x1 - x0) * k)}px;position:absolute`;
      seg.style.background = `hsl(${(m.id * 47) % 360} 32% 30%)`;
      seg.textContent = (x1 - x0) * k > 34 ? `${m.kanji} ${m.romaji}` : '';
      seg.title = `${m.kanji} ${m.romaji} — ${m.title} (${Math.round(m.s0)}–${Math.round(m.s1)} m)`;
      frag.append(seg);
    }
    for (const f of state.route.frames.filter(f => f.kind === 'turn')) {
      const g = state.geo.frames[f.index];
      const seg = document.createElement('div');
      seg.className = 'seg turn';
      seg.style.cssText = `left:${g.x * k}px;width:${g.width * k}px;position:absolute`;
      frag.append(seg);
    }
    for (let s = 50; s < state.route.length; s += 50) {
      const tick = document.createElement('i');
      tick.className = 'tick'; tick.style.left = xAtS(s) * k + 'px';
      frag.append(tick);
      if (s % 100 === 0) {
        const lab = document.createElement('i');
        lab.className = 'ticklab'; lab.style.left = xAtS(s) * k + 'px';
        lab.textContent = s;
        frag.append(lab);
      }
    }
  } else {
    const seg = document.createElement('div');
    seg.className = 'seg';
    seg.style.cssText = 'left:0;width:100%;position:absolute;background:#3d3350';
    seg.textContent = `${state.route.name} — alley supplement`;
    frag.append(seg);
  }
  els.rulerTrack.append(frag);
  updateRulerView();
}

function updateRulerView() {
  if (!state.geo) return;
  const k = els.ruler.clientWidth / state.geo.width;
  els.rulerView.style.left = state.view.x / scale() * k + 'px';
  els.rulerView.style.width = Math.max(10, els.scroller.clientWidth / scale() * k) + 'px';
}

function updatePos() {
  const s = sAtX(centerX());
  const m = state.route.id === 'main'
    ? [...state.manifest.districts].reverse().find(m => s >= m.s0)?.romaji
    : state.route.name;
  els.pos.textContent = `${m || ''} · ${Math.round(s)} m · ×${state.zoom.toFixed(1)}`;
}

/* ----------------------------------------------- pan & zoom controller --- */

const pointers = new Map();
let gesture = null;          // {kind:'pan'|'pinch'|'stroke'|'erase'|'note', ...}
let fling = null;

function killFling() { if (fling) { cancelAnimationFrame(fling); fling = null; } }

els.scroller.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.pin') || e.button === 2) return;
  els.scroller.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  killFling();
  if (pointers.size === 2) {
    cancelGesture();
    const [a, b] = [...pointers.values()];
    gesture = {
      kind: 'pinch', d0: Math.hypot(b.x - a.x, b.y - a.y),
      z0: state.zoom, v0: { ...state.view }, offset0: topOffset(),
      mid0: mid(a, b), sc0: scale()
    };
    els.scroller.classList.add('dragging');
    return;
  }
  if (pointers.size > 2) return;
  const pt = routePoint(e.clientX, e.clientY);
  if (state.tool === 'hand') {
    gesture = { kind: 'pan', sx: e.clientX, sy: e.clientY, v0: { ...state.view }, moved: 0, t0: performance.now(), vx: 0, vy: 0, lx: e.clientX, ly: e.clientY, lt: performance.now() };
  } else if (state.tool === 'note') {
    gesture = { kind: 'note', sx: e.clientX, sy: e.clientY, moved: 0, pt };
  } else if (state.tool === 'eraser') {
    gesture = { kind: 'erase', hit: new Set() };
    eraseAt(pt);
  } else {
    if (pt.x < 0 || pt.y < 0 || pt.x > state.geo.width || pt.y > 750) { gesture = { kind: 'pan', sx: e.clientX, sy: e.clientY, v0: { ...state.view }, moved: 0, t0: performance.now(), vx: 0, vy: 0, lx: e.clientX, ly: e.clientY, lt: performance.now() }; return; }
    const stroke = {
      id: uid(), updatedAt: now(), tool: state.tool, color: state.color,
      size: state.sizes[state.tool], points: [[pt.x, pt.y, e.pressure || .5]]
    };
    gesture = { kind: 'stroke', stroke, el: pathFor(stroke), last: pt };
    state.inkSvg.append(gesture.el);
  }
  els.scroller.classList.add('dragging');
});

els.scroller.addEventListener('pointermove', (e) => {
  const rec = pointers.get(e.pointerId);
  if (rec) { rec.x = e.clientX; rec.y = e.clientY; }
  if (!gesture) return;
  if (gesture.kind === 'pinch' && pointers.size >= 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const m = mid(a, b), rect = els.scroller.getBoundingClientRect();
    const rx = (gesture.v0.x + gesture.mid0.x - rect.left) / gesture.sc0;
    const ry = (gesture.v0.y + gesture.mid0.y - rect.top - gesture.offset0) / gesture.sc0;
    state.zoom = clamp(gesture.z0 * d / gesture.d0, ZMIN, ZMAX);
    layout();
    const sc1 = scale();
    state.view.x = rx * sc1 - (m.x - rect.left);
    state.view.y = ry * sc1 + topOffset() - (m.y - rect.top);
    applyView(); updateRulerView(); updatePos();
    els.stripBtn.hidden = state.zoom <= 1.02;
    return;
  }
  if (gesture.kind === 'pan') {
    const dx = e.clientX - gesture.sx, dy = e.clientY - gesture.sy;
    gesture.moved = Math.max(gesture.moved, Math.hypot(dx, dy));
    state.view.x = gesture.v0.x - dx; state.view.y = gesture.v0.y - dy;
    applyView(); updateRulerView(); updatePos();
    const t = performance.now(), dt = Math.max(1, t - gesture.lt);
    gesture.vx = (e.clientX - gesture.lx) / dt * 16; gesture.vy = (e.clientY - gesture.ly) / dt * 16;
    gesture.lx = e.clientX; gesture.ly = e.clientY; gesture.lt = t;
    return;
  }
  const raw = routePoint(e.clientX, e.clientY);
  const pt = { x: clamp(raw.x, 0, state.geo.width), y: clamp(raw.y, 0, 750) };
  if (gesture.kind === 'note') {
    gesture.moved = Math.max(gesture.moved, Math.hypot(e.clientX - gesture.sx, e.clientY - gesture.sy));
    return;
  }
  if (gesture.kind === 'erase') { eraseAt(pt); return; }
  if (gesture.kind === 'stroke') {
    const p = gesture.last;
    if (Math.hypot(pt.x - p.x, pt.y - p.y) < 1.2) return;
    gesture.stroke.points.push([pt.x, pt.y, e.pressure || .5]);
    gesture.last = pt;
    gesture.el.setAttribute('d', strokePath(gesture.stroke.points));
  }
});

function endPointer(e) {
  pointers.delete(e.pointerId);
  if (!gesture) return;
  if (gesture.kind === 'pinch' && pointers.size < 2) { gesture = null; els.scroller.classList.remove('dragging'); }
  if (pointers.size) return;
  els.scroller.classList.remove('dragging');
  if (gesture.kind === 'pan') {
    if (gesture.moved < 8 && performance.now() - gesture.t0 < 400) tapAt(e.clientX, e.clientY);
    else flingTo(gesture.vx, gesture.vy);
  } else if (gesture.kind === 'stroke') {
    const s = gesture.stroke;
    s.points = simplify(s.points);
    gesture.el.setAttribute('d', strokePath(s.points));
    if (s.points.length > 1) {
      data().strokes.push(s);
      pushUndo({ kind: 'stroke-add', routeId: state.route.id, stroke: s });
      markDirty();
    } else gesture.el.remove();
  } else if (gesture.kind === 'erase') {
    if (gesture.hit.size) {
      const strokes = [...gesture.hit].map(id => data().strokes.find(s => s.id === id)).filter(Boolean);
      pushUndo({ kind: 'stroke-del', routeId: state.route.id, strokes });
      markDirty();
    }
  } else if (gesture.kind === 'note' && gesture.moved < 10) {
    const pt = routePoint(e.clientX, e.clientY);
    if (pt.x >= 0 && pt.y >= 0 && pt.x <= state.geo.width && pt.y <= 750) placeNote(pt);
  }
  gesture = null;
}
els.scroller.addEventListener('pointerup', endPointer);
els.scroller.addEventListener('pointercancel', endPointer);

function cancelGesture() {
  if (gesture?.kind === 'stroke') gesture.el.remove();
  gesture = null;
}
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

function flingTo(vx, vy) {
  if (Math.hypot(vx, vy) < 4) return;
  let x = -vx, y = -vy;
  const step = () => {
    if (Math.hypot(x, y) < .4) return;
    state.view.x += x; state.view.y += y;
    applyView(); updateRulerView(); updatePos();
    x *= .93; y *= .93;
    fling = requestAnimationFrame(step);
  };
  fling = requestAnimationFrame(step);
}

/* Tap with the hand tool = open the frame for sketching (the user's click). */
let lastTap = { t: 0, x: 0, y: 0 };
function tapAt(cx, cy) {
  const t = performance.now();
  const dt = t - lastTap.t, dd = Math.hypot(cx - lastTap.x, cy - lastTap.y);
  lastTap = { t, x: cx, y: cy };
  if (dt < 350 && dd < 40) { zoomTo(1, { x: cx, y: cy }); return; }  // double-tap → strip
  if (state.zoom < 1.5) {
    zoomTo(2.2, { x: cx, y: cy });
    if (state.tool === 'hand') toast('Sketch away — pick a pen below, or tap a 📌 to note.');
  }
}

function eraseAt(pt) {
  const r = TOOL_SIZES.eraser[state.sizes.eraserIdx || 1] ?? 26;
  for (const s of liveStrokes()) {
    if (gesture.hit.has(s.id)) continue;
    if (distanceToStroke(pt.x, pt.y, s.points) < r + s.size / 2) {
      s.deleted = true; s.updatedAt = now();
      gesture.hit.add(s.id);
      state.inkSvg.querySelector(`path[data-id="${s.id}"]`)?.remove();
    }
  }
}

els.scroller.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) zoomTo(state.zoom * (e.deltaY < 0 ? 1.12 : .89), { x: e.clientX, y: e.clientY });
  else {
    state.view.x += (e.deltaX || e.deltaY);
    state.view.y += e.shiftKey ? 0 : (e.deltaX ? e.deltaY : 0);
    applyView(); updateRulerView(); updatePos();
  }
}, { passive: false });

/* --------------------------------------------------------------- notes --- */

function placeNote(pt) {
  const note = {
    id: uid(), updatedAt: now(), x: pt.x, y: clamp(pt.y, 0, 750),
    color: state.color, title: '', body: '', category: 'layout', status: 'open'
  };
  openNote(note, true);
}

function openNote(note, isNew = false) {
  state.editingNote = { note, isNew };
  els.popTitle.textContent = isNew ? 'New note' : 'Edit note';
  els.noteTitle.value = note.title;
  els.noteBody.value = note.body;
  els.noteDone.checked = note.status === 'done';
  els.noteDelete.hidden = isNew;
  els.noteCats.querySelectorAll('input').forEach(i => { i.checked = i.value === note.category; });
  els.noteColors.querySelectorAll('.swatch').forEach(s => s.classList.toggle('on', s.dataset.color === note.color));
  const loc = locatePoint(state.route, note.x, note.y);
  els.noteAnchor.textContent = loc ? `${loc.frameId} · ≈ ${loc.s.toFixed(0)} m · ${state.route.name}` : '';
  els.popup.hidden = false;
  if (isNew) els.noteTitle.focus();
}

function closePopup() { els.popup.hidden = true; state.editingNote = null; }

els.popup.addEventListener('submit', (e) => {
  e.preventDefault();
  const ctx = state.editingNote;
  if (!ctx) return;
  const title = els.noteTitle.value.trim();
  if (!title) { els.noteTitle.focus(); return; }
  const n = ctx.note;
  const prev = ctx.isNew ? null : clone(n);
  Object.assign(n, {
    title, body: els.noteBody.value,
    category: els.noteCats.querySelector('input:checked')?.value || 'other',
    status: els.noteDone.checked ? 'done' : 'open',
    color: els.noteColors.querySelector('.swatch.on')?.dataset.color || n.color,
    updatedAt: now()
  });
  if (ctx.isNew) {
    data().notes.push(n);
    pushUndo({ kind: 'note-add', routeId: state.route.id, note: n });
  } else pushUndo({ kind: 'note-edit', routeId: state.route.id, note: n, prev, next: clone(n) });
  renderPins(); markDirty(); closePopup(); renderDrawer();
});

els.noteDelete.addEventListener('click', () => {
  const ctx = state.editingNote;
  if (!ctx || ctx.isNew) return closePopup();
  ctx.note.deleted = true; ctx.note.updatedAt = now();
  pushUndo({ kind: 'note-del', routeId: state.route.id, note: ctx.note });
  renderPins(); markDirty(); closePopup(); renderDrawer();
});
els.popClose.addEventListener('click', closePopup);

function renderDrawer() {
  const f = state.filter;
  const items = [];
  for (const route of state.manifest.routes) {
    for (const n of (state.review.routes[route.id]?.notes || [])) {
      if (n.deleted || (f !== 'all' && n.status !== f)) continue;
      items.push({ route, n, loc: locatePoint(route, n.x, n.y) });
    }
  }
  items.sort((a, b) => (a.route.id === b.route.id ? a.n.x - b.n.x : a.route.id.localeCompare(b.route.id)));
  els.notesList.innerHTML = '';
  if (!items.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'No notes yet — tap 📌 then tap the board.';
    els.notesList.append(li);
    return;
  }
  for (const { route, n, loc } of items) {
    const li = document.createElement('li');
    li.innerHTML = `<i class="nc" style="background:${n.color}"></i>
      <span class="nt"><b></b><i>${route.name} · ${loc?.frameId || ''} · ≈ ${loc ? loc.s.toFixed(0) : '?'} m</i></span>
      <span class="ns ${n.status}">${n.status}</span>`;
    li.querySelector('b').textContent = n.title;
    li.title = n.body;
    li.addEventListener('click', () => {
      els.drawer.hidden = true;
      if (route.id !== state.route.id) switchRoute(route.id);
      jumpTo(n.x, n.y, Math.max(state.zoom, 2.2));
      const pin = state.pinsEl.querySelector(`[data-id="${n.id}"]`);
      pin?.classList.add('pulse');
      setTimeout(() => pin?.classList.remove('pulse'), 2200);
      openNote(n);
    });
    els.notesList.append(li);
  }
}

els.notesBtn.addEventListener('click', () => { renderDrawer(); els.drawer.hidden = !els.drawer.hidden; });
els.drawerClose.addEventListener('click', () => { els.drawer.hidden = true; });
els.drawer.querySelectorAll('.filters .chip').forEach(b => b.addEventListener('click', () => {
  state.filter = b.dataset.f;
  els.drawer.querySelectorAll('.filters .chip').forEach(c => c.classList.toggle('on', c === b));
  renderDrawer();
}));

/* ------------------------------------------------------------ undo/redo --- */

function pushUndo(op) {
  state.undoStack.push(op);
  if (state.undoStack.length > 120) state.undoStack.shift();
  state.redoStack.length = 0;
  syncUndoButtons();
}
function syncUndoButtons() {
  els.undoBtn.disabled = !state.undoStack.length;
  els.redoBtn.disabled = !state.redoStack.length;
}
function applyOp(op, undo) {
  const r = routeReview(state.review, op.routeId);
  if (op.kind === 'stroke-add') {
    op.stroke.deleted = undo; op.stroke.updatedAt = now();
  } else if (op.kind === 'stroke-del') {
    for (const s of op.strokes) { s.deleted = !undo; s.updatedAt = now(); }
  } else if (op.kind === 'note-add') {
    op.note.deleted = undo; op.note.updatedAt = now();
  } else if (op.kind === 'note-del') {
    op.note.deleted = !undo; op.note.updatedAt = now();
  } else if (op.kind === 'note-edit') {
    const idx = r.notes.findIndex(n => n.id === op.note.id);
    if (idx >= 0) r.notes[idx] = clone(undo ? op.prev : op.next);
    op.note = r.notes[idx];
  }
  if (op.routeId === state.route.id) { renderInk(); renderPins(); }
  renderDrawer();
  markDirty();
}
els.undoBtn.addEventListener('click', () => {
  const op = state.undoStack.pop();
  if (op) { applyOp(op, true); state.redoStack.push(op); }
  syncUndoButtons();
});
els.redoBtn.addEventListener('click', () => {
  const op = state.redoStack.pop();
  if (op) { applyOp(op, false); state.undoStack.push(op); }
  syncUndoButtons();
});

/* ---------------------------------------------------------------- tools --- */

function selectTool(t) {
  state.tool = t;
  els.toolbar.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  els.scroller.classList.toggle('drawing', t !== 'hand');
  els.sizes.style.display = TOOL_SIZES[t] ? 'flex' : 'none';
  buildSizes();
  savePrefs();
}
els.toolbar.querySelectorAll('[data-tool]').forEach(b =>
  b.addEventListener('click', () => selectTool(b.dataset.tool)));

function buildColors() {
  const mk = (host, small) => {
    host.innerHTML = '';
    for (const c of COLORS) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'swatch' + (small ? ' small' : '');
      b.style.background = c; b.dataset.color = c;
      b.setAttribute('aria-label', 'ink ' + c);
      b.addEventListener('click', () => {
        if (host === els.noteColors) {
          host.querySelectorAll('.swatch').forEach(x => x.classList.toggle('on', x === b));
        } else {
          state.color = c;
          host.querySelectorAll('.swatch').forEach(x => x.classList.toggle('on', x === b));
          savePrefs();
        }
      });
      host.append(b);
    }
  };
  mk(els.colors); mk(els.noteColors, true);
}

function buildSizes() {
  const t = state.tool;
  els.sizes.innerHTML = '';
  const list = TOOL_SIZES[t];
  if (!list) return;
  list.forEach((v, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = ['S', 'M', 'L'][i];
    const cur = t === 'eraser' ? (state.sizes.eraserIdx ?? 1) : list.indexOf(state.sizes[t]);
    b.classList.toggle('on', i === (cur < 0 ? 1 : cur));
    b.addEventListener('click', () => {
      if (t === 'eraser') state.sizes.eraserIdx = i; else state.sizes[t] = v;
      buildSizes(); savePrefs();
    });
    els.sizes.append(b);
  });
}

els.zin.addEventListener('click', () => zoomTo(state.zoom * 1.35));
els.zout.addEventListener('click', () => zoomTo(state.zoom / 1.35));
els.stripBtn.addEventListener('click', () => zoomTo(1));

/* ------------------------------------------------------------- saving --- */

function markDirty() {
  state.dirty = true;
  setSaveState('dirty', 'unsaved');
  els.saveBtn.disabled = false;
  localStorage.setItem(LS_REVIEW, JSON.stringify(state.review));
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(save, 2600);
}
function setSaveState(cls, label) {
  els.saveState.className = 'save-state ' + cls;
  els.saveLabel.textContent = label;
}

async function save() {
  if (!state.dirty || state.saving) return;
  if (state.online === false) { setSaveState('saved', 'saved in this browser'); return; }
  state.saving = true;
  const snapshot = JSON.stringify(state.review);
  setSaveState('dirty', 'saving…');
  try {
    const res = await fetch(API + 'review', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseRevision: state.baseRevision, review: JSON.parse(snapshot) })
    });
    if (res.status === 409) { els.conflict.hidden = false; setSaveState('error', 'conflict'); return; }
    if (!res.ok) throw new Error((await res.json()).error || res.statusText);
    const body = await res.json();
    const changedWhileSaving = JSON.stringify(state.review) !== snapshot;
    state.review = changedWhileSaving ? mergeReviews(body.review, state.review) : body.review;
    state.baseRevision = body.review.revision;
    state.dirty = changedWhileSaving;
    localStorage.setItem(LS_REVIEW, JSON.stringify(state.review));
    setSaveState(state.dirty ? 'dirty' : 'saved', state.dirty ? 'new changes pending' : `saved · rev ${body.review.revision}`);
    state.online = true;
  } catch (e) {
    if (state.online === null || state.online) toast('Save failed — kept in this browser. ' + e.message);
    state.online = false;
    setSaveState('offline', 'offline — browser only');
  } finally { state.saving = false; }
}
els.saveBtn.addEventListener('click', () => { if (state.online === false) { download('skretch-review.json', JSON.stringify(state.review, null, 2)); toast('Review downloaded — keep this file as a backup.'); } else save(); });

$('cf-merge').addEventListener('click', async () => {
  els.conflict.hidden = true;
  try {
    const remote = (await (await fetch(API + 'review')).json()).review;
    state.review = mergeReviews(remote, state.review);
    state.baseRevision = remote.revision;
    renderInk(); renderPins(); renderDrawer();
    state.dirty = true;
    await save();
    toast('Merged and saved.');
  } catch (e) { toast('Merge failed: ' + e.message); }
});
$('cf-reload').addEventListener('click', async () => {
  els.conflict.hidden = true;
  try {
    const remote = (await (await fetch(API + 'review')).json()).review;
    state.review = remote; state.baseRevision = remote.revision;
    state.dirty = false;
    renderInk(); renderPins(); renderDrawer();
    setSaveState('saved', `loaded rev ${remote.revision}`);
    localStorage.setItem(LS_REVIEW, JSON.stringify(state.review));
  } catch (e) { toast('Reload failed: ' + e.message); }
});

/* --------------------------------------------------------------- menu --- */

els.menuBtn.addEventListener('click', () => {
  els.menu.hidden = !els.menu.hidden;
  els.menuBtn.setAttribute('aria-expanded', String(!els.menu.hidden));
});
document.addEventListener('click', (e) => {
  if (!els.menu.hidden && !e.target.closest('#menu,#btn-menu')) els.menu.hidden = true;
  if (!els.popup.hidden && !e.target.closest('#popup') && !e.target.closest('.pin')) { /* keep open while editing */ }
});
function download(name, text, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
$('m-export-image').addEventListener('click', async () => {
  els.menu.hidden = true;
  const f = state.geo.frames[clamp(Math.floor(centerX() / 1200), 0, state.geo.frames.length - 1)];
  try {
    const img = new Image(); img.src = f.image; await img.decode();
    const canvas = document.createElement('canvas'); canvas.width = f.width; canvas.height = f.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, f.width, f.height);
    ctx.save(); ctx.translate(-f.x, 0); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const stroke of liveStrokes()) {
      ctx.strokeStyle = stroke.color; ctx.lineWidth = stroke.size; ctx.globalAlpha = TOOL_OPACITY[stroke.tool] ?? 1;
      ctx.beginPath(); stroke.points.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    liveNotes().forEach((note, i) => {
      if (note.x < f.x || note.x >= f.x + f.width) return;
      ctx.fillStyle = note.color; ctx.beginPath(); ctx.arc(note.x, note.y, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), note.x, note.y);
    });
    ctx.restore();
    canvas.toBlob(blob => {
      if (!blob) { toast('Could not create image.'); return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `skretch-${f.id}-annotated.jpg`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, 'image/jpeg', .93);
  } catch (error) { toast('Could not export this scene: ' + error.message); }
});
$('m-export-json').addEventListener('click', () => {
  download('skretch-review.json', JSON.stringify(state.review, null, 2));
  els.menu.hidden = true;
});
$('m-import').addEventListener('click', () => { els.menu.hidden = true; $('import-file').click(); });
$('import-file').addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  try {
    if (file.size > 20 * 1024 * 1024) throw new Error('File is too large (20 MB maximum).');
    const incoming = validateReview(JSON.parse(await file.text()), state.manifest);
    state.review = mergeReviews(state.review, incoming);
    state.undoStack = []; state.redoStack = [];
    renderInk(); renderPins(); renderDrawer(); markDirty();
    toast('Review merged into this board.');
  } catch (error) { toast('Could not open review: ' + error.message, 6000); }
  e.target.value = '';
});
$('m-export-md').addEventListener('click', () => {
  download('skretch-review.md', reviewMarkdown(state.review, state.manifest), 'text/markdown');
  els.menu.hidden = true;
});
$('m-report').addEventListener('click', () => {
  els.menu.hidden = true;
  els.reportBody.textContent = reviewMarkdown(state.review, state.manifest);
  els.report.hidden = false;
});
els.reportClose.addEventListener('click', () => { els.report.hidden = true; });

/* -------------------------------------------------------- ruler input --- */

let rulerDrag = null;
els.ruler.addEventListener('pointerdown', (e) => {
  els.ruler.setPointerCapture(e.pointerId);
  const k = state.geo.width / els.ruler.clientWidth;
  const x = e.clientX - els.ruler.getBoundingClientRect().left;
  const half = els.scroller.clientWidth / scale() / 2;
  state.view.x = (x * k - half) * scale();
  applyView(); updateRulerView(); updatePos();
  rulerDrag = true;
});
els.ruler.addEventListener('pointermove', (e) => {
  if (!rulerDrag) return;
  const k = state.geo.width / els.ruler.clientWidth;
  const x = e.clientX - els.ruler.getBoundingClientRect().left;
  const half = els.scroller.clientWidth / scale() / 2;
  state.view.x = (x * k - half) * scale();
  applyView(); updateRulerView(); updatePos();
});
els.ruler.addEventListener('pointerup', () => { rulerDrag = false; });

/* --------------------------------------------------------- routes/boot --- */

function switchRoute(id) {
  state.route = state.manifest.routes.find(r => r.id === id) || state.manifest.routes[0];
  els.picker.value = state.route.id;
  state.view = { x: 0, y: 0 };
  buildRoute(); layout();
  els.stripBtn.hidden = state.zoom <= 1.02;
  savePrefs();
}
els.picker.addEventListener('change', () => switchRoute(els.picker.value));

function savePrefs() {
  localStorage.setItem(LS_PREFS, JSON.stringify({
    tool: state.tool, color: state.color, sizes: state.sizes,
    route: state.route?.id, s: state.geo ? sAtX(centerX()) : 0, zoom: state.zoom
  }));
}
addEventListener('beforeunload', savePrefs);

addEventListener('keydown', (e) => {
  if (e.target.matches('input,textarea,select')) return;
  const k = e.key.toLowerCase();
  if ((e.metaKey || e.ctrlKey) && k === 'z') { e.preventDefault(); (e.shiftKey ? els.redoBtn : els.undoBtn).click(); }
  else if ((e.metaKey || e.ctrlKey) && k === 's') { e.preventDefault(); save(); }
  else if (k === 'h') selectTool('hand');
  else if (k === 'p') selectTool('pen');
  else if (k === 'b') selectTool('pencil');
  else if (k === 'm') selectTool('marker');
  else if (k === 'e') selectTool('eraser');
  else if (k === 'n') selectTool('note');
  else if (k === '+' || k === '=') zoomTo(state.zoom * 1.35);
  else if (k === '-') zoomTo(state.zoom / 1.35);
  else if (k === '0' || k === 'escape') {
    if (!els.popup.hidden) closePopup();
    else if (!els.drawer.hidden) els.drawer.hidden = true;
    else if (!els.menu.hidden) els.menu.hidden = true;
    else if (!els.report.hidden) els.report.hidden = true;
    else zoomTo(1);
  }
});

addEventListener('resize', () => { if (state.geo) { layout(); buildRuler(); } });

async function boot() {
  let prefs = {};
  try { prefs = JSON.parse(localStorage.getItem(LS_PREFS)) || {}; } catch {}
  Object.assign(state, {
    tool: prefs.tool || 'hand', color: prefs.color || COLORS[0],
    sizes: { pen: 4, pencil: 2.5, marker: 16, ...(prefs.sizes || {}) },
    zoom: clamp(prefs.zoom || 1, ZMIN, ZMAX)
  });
  try {
    state.manifest = await (await fetch('./assets/manifest.json')).json();
  } catch (e) {
    els.boot.textContent = 'manifest.json missing — run node Skretch/tools/capture.mjs first.';
    return;
  }
  for (const r of state.manifest.routes) {
    const o = document.createElement('option');
    o.value = r.id;
    o.textContent = r.id === 'main' ? `Main run — ${Math.round(r.length)} m` : `Alley · ${r.name}`;
    els.picker.append(o);
  }
  // Review: server wins; the localStorage mirror is the offline fallback.
  let review = null;
  try {
    const res = await fetch(API + 'review');
    if (!res.ok) {
      if (res.status !== 404) { const problem = await res.json().catch(() => ({})); toast(problem.error || 'Server review unavailable; this browser will keep a separate draft.', 8000); }
      throw new Error('api ' + res.status);
    }
    review = validateReview((await res.json()).review, state.manifest);
    state.online = true;
    setSaveState('saved', `rev ${review.revision}`);
  } catch {
    state.online = false;
    try { review = JSON.parse(localStorage.getItem(LS_REVIEW)); } catch {}
    setSaveState('saved', 'saved in this browser');
  }
  // Reconcile a browser draft before accepting the server copy, including
  // offline edits made since this device last connected.
  let local = null;
  try { const draft = JSON.parse(localStorage.getItem(LS_REVIEW)); if (draft) local = validateReview(draft, state.manifest); } catch {}
  state.review = review || emptyReview();
  state.baseRevision = state.review.revision || 0;
  if (state.online && local) {
    const combined = mergeReviews(state.review, local);
    if (JSON.stringify(combined.routes) !== JSON.stringify(state.review.routes)) {
      state.review = combined; state.dirty = true;
    }
  }
  const panoramas = $('panorama-links');
  for (const [i, image] of (state.manifest.panoramas || []).entries()) {
    const link = document.createElement('a'); link.href = image.path; link.download = '';
    link.textContent = `Download stage JPEG · part ${i + 1}`; panoramas.append(link);
  }
  buildColors(); selectTool(state.tool);
  els.colors.querySelectorAll('.swatch').forEach(x => x.classList.toggle('on', x.dataset.color === state.color));
  switchRoute(prefs.route || 'main');
  if (prefs.s) jumpTo(xAtS(prefs.s), 300, state.zoom);
  els.boot.remove();
  els.about.textContent = `Captured ${new Date(state.manifest.capturedAt).toLocaleString()} · ${state.manifest.source.frameCount} frames · orthographic elevations at warm daytime.`;
  els.saveBtn.disabled = false;
  els.saveBtn.textContent = state.online ? 'Save' : 'Download';
  if (state.dirty && state.online) markDirty();
  setInterval(() => { if (state.dirty && state.online) save(); }, 30000);
}

/* Console + test handle. */
window.skretch = {
  get state() { return state; },
  get manifest() { return state.manifest; },
  save, selectTool, zoomTo, jumpTo, openNote, switchRoute,
  sAtX, xAtS, route: () => state.route, data
};

boot();
