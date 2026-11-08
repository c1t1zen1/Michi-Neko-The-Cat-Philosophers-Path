// Draw a fence on the ground and it grows along your line. Pick a style, age it
// a few decades, then let Michi walk the path you have fenced.
import * as THREE from 'three';
import { loadSkyModule, loadFoliageModule, loadGrassModule } from '../../shared/game.js';
import { LabWorld } from '../../shared/world.js';
import { standardBar } from '../../shared/workshop.js';
import { Dropdown, slider, seg } from '../../shared/ui.js';
import { V3, TAU, rng, instances, sstep } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { thump } from '../../shared/sound.js';
import { flag } from '../../shared/stage.js';
import { originalOf } from '../../shared/original.js';
import { fence, STYLES } from './kit.js';

const $ = (s) => document.querySelector(s);

function paintGround(x, res, toPx, r) {
  x.fillStyle = '#7b8a56'; x.fillRect(0, 0, res, res);
  for (let i = 0; i < 2200; i++) { x.fillStyle = `rgba(${80 + r() * 50},${100 + r() * 40},${60 + r() * 25},${0.06 + r() * 0.12})`; x.beginPath(); x.ellipse(r() * res, r() * res, 5 + r() * 22, 3 + r() * 12, r() * 3, 0, TAU); x.fill(); }
  // a stone-and-gravel path round the middle
  x.strokeStyle = '#c5bda6'; x.lineWidth = 2.6 * (res / 28); x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath();
  for (let a = 0; a <= TAU + 0.02; a += 0.06) { const R = 7.2 + Math.sin(a * 3) * 0.8, [px, py] = toPx(Math.cos(a) * R, Math.sin(a) * R); a ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
  for (let i = 0; i < 9000; i++) { const a = r() * TAU, R = 7.2 + Math.sin(a * 3) * 0.8 + (r() - 0.5) * 2.2, [px, py] = toPx(Math.cos(a) * R, Math.sin(a) * R); x.fillStyle = `rgba(${150 + r() * 80},${140 + r() * 80},${115 + r() * 80},${0.1 + r() * 0.3})`; x.beginPath(); x.arc(px, py, 0.5 + r(), 0, TAU); x.fill(); }
}

export async function makeFenceStage(lab) {
  const [{ Sky }, F, GM] = await Promise.all([loadSkyModule(), loadFoliageModule(), loadGrassModule()]);
  const P = 14;
  const segs = [];       // blockers: fence segments
  const world = new LabWorld(lab, $('#stage'), {
    SkyClass: Sky, hour: +flag('hour', 15.5), plot: P, res: 1536, paint: paintGround, outer: 0x5a7a44, shadowExtent: 16,
    camera: { az: 0.7, el: 0.34, dist: 15, focus: [0, 0.8, 0] }, bounds: { x0: -12, x1: 12, z0: -12, z1: 12 }, catStart: { x: 7.8, z: 1, heading: -1.4 },
    blocked: (x, z) => segs.some(([a, b]) => distSeg(x, z, a, b) < 0.24),
    views: { stage: { label: 'The garden', az: 0.7, el: 0.34, dist: 15, focus: [0, 0.8, 0] }, low: { label: 'Fence height', az: 0.35, el: 0.07, dist: 6, focus: [-2, 1, 3.5] }, eye: { label: 'Cat-eye', eye: true }, high: { label: 'Plan', az: 0.6, el: 1.2, dist: 20, focus: [0, 0, 0] } }
  });
  const distSeg = (x, z, a, b) => { const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - (a.x + t * dx), z - (a.z + t * dz)); };
  const scene = world.scene;
  const st = { style: 'yotsume', age: 0.25, mode: 'draw' };
  const fences = [];
  const addFence = (pts, style = st.style, age = st.age) => {
    const f = fence(pts, style, { age, seed: fences.length + 3 });
    scene.add(f);
    fences.push({ f, pts, style, age });
    for (let i = 0; i < pts.length - 1; i++) segs.push([pts[i], pts[i + 1]]);
    return f;
  };
  const rebuild = () => {
    segs.length = 0;
    const was = fences.slice(); fences.length = 0;
    for (const o of was) { scene.remove(o.f); o.f.traverse((c) => { if (c.isInstancedMesh) c.dispose?.(); }); addFence(o.pts, st.style === o.style ? st.style : o.style, st.age); }
  };

  const preview = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(), V3()]), new THREE.LineBasicMaterial({ color: 0xffe2a8 }));
  preview.visible = false; preview.frustumCulled = false; scene.add(preview);
  let drawing = null;
  world.onDragStart = (e) => {
    if (st.mode !== 'draw') return false;
    const p = world.groundAt(e);
    if (!p) return false;
    drawing = [p.clone().setY(0)];
    return true;
  };
  world.onDrag = (e) => {
    if (!drawing) return;
    const p = world.groundAt(e);
    if (p && p.setY(0).distanceTo(drawing[drawing.length - 1]) > 0.5) { drawing.push(p.clone()); preview.geometry.setFromPoints(drawing.map((v) => v.clone().setY(0.1))); preview.visible = true; }
  };
  world.onDragEnd = () => {
    preview.visible = false;
    if (drawing && drawing.length >= 2) { addFence(drawing); thump({ freq: 180, vol: 0.2 }); world.say(`${STYLES[st.style].label}: ${fences[fences.length - 1].f.userData.total.toFixed(1)} m.`); }
    drawing = null;
  };
  const clear = () => { for (const o of fences) scene.remove(o.f); fences.length = 0; segs.length = 0; };

  const arc = (a0, a1, r, n = 18) => { const pts = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, R = r + Math.sin(a * 3) * 0.8; pts.push(V3(Math.cos(a) * R, 0, Math.sin(a) * R)); } return pts; };
  // start with a fence already in place, in two styles, so there is something to walk along
  addFence(arc(-1.0, 0.9, 5.4), 'yotsume', 0.25);
  addFence(arc(1.5, 3.3, 9.1), 'kenninji', 0.4);

  // compare: the game's fence against a new one
  const orig = originalOf('buildBambooFence', -3.2, 3.2, 0, { length: 4, rotationJitter: false }).group; orig.visible = false; scene.add(orig);
  const mine = fence([V3(-5.2, 0, 3.2), V3(-1.2, 0, 3.2)], 'yotsume', { age: 0.25, seed: 9 }); mine.visible = false; scene.add(mine);
  let cmp = false;
  $('#btn-compare').addEventListener('click', (e) => { cmp = !cmp; e.currentTarget.textContent = cmp ? 'Stop comparing' : 'Compare with the game'; e.currentTarget.setAttribute('aria-pressed', cmp); if (cmp) world.view('low'); world.setCompare(cmp, (side) => { orig.visible = side === 0; mine.visible = side === 1; }, ['The game’s fence', 'Yotsume-gaki']); });

  standardBar(world, $('#bar'));
  new Dropdown($('#slot-style'), { label: 'Fence style', value: st.style, items: Object.entries(STYLES).map(([value, v]) => ({ value, label: v.label, hint: v.hint })), onChange: (v) => { st.style = v; world.say(STYLES[v].label); } });
  seg($('#seg-mode'), [{ v: 'draw', label: 'Draw a fence' }, { v: 'walk', label: 'Walk' }], 'draw', (v) => { st.mode = v; });
  slider($('#ctl'), { label: 'Age', min: 0, max: 1, step: 0.01, value: st.age, fmt: (v) => (v < 0.15 ? 'cut this year' : v < 0.45 ? 'straw' : v < 0.8 ? 'weathered' : 'almost black'), onInput: (v) => { st.age = v; rebuild(); } });
  $('#btn-clear').addEventListener('click', clear);

  await world.loadForest(F, { near: 28, nearInner: 13, nearCount: 30, keepOut: (x, z) => { const a = Math.abs(((Math.atan2(x, z) - 0.7 + Math.PI * 3) % TAU) - Math.PI); return Math.hypot(x, z) < 24 && a < 0.6; } });
  world.loadGrass(GM, { paint: (m) => { m.paint('excl', (x, z) => { const a = Math.atan2(z, x), R = 7.2 + Math.sin(a * 3) * 0.8; return Math.abs(Math.hypot(x, z) - R) < 1.4 ? 1 : 0; }); }, zones: [['near', 0.14], ['thicket', 0.6]] });
  await world.loadCat();
  world.chooseSpec = (spec) => { if (STYLES[spec.id]) { st.style = spec.id; world.view('low'); } world.say(spec.name); };
  window.__fences = { world, st, addFence };
  return world;
}
