// The precinct: a winding sandō through raked gravel, a gate you can redraw,
// guardians, a washing basin and a hall with a bell to ring. Grow the gate
// into a tunnel and walk it at cat height.
import * as THREE from 'three';
import { loadSkyModule, loadFoliageModule, loadGrassModule } from '../../shared/game.js';
import { LabWorld } from '../../shared/world.js';
import { standardBar } from '../../shared/workshop.js';
import { originalOf } from '../../shared/original.js';
import { Dropdown, slider, seg } from '../../shared/ui.js';
import { V3, TAU, clamp, lerp, rng, instances, canvas2d, shadows, merge, tube, rockGeometry } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { bell, clack, drip, thump } from '../../shared/sound.js';
import { flag, reduceMotion } from '../../shared/stage.js';
import { gateGeos, gateMats, SORI, curveOf, shimenawa, hangShide, buildSuzu, komainuPrims } from './gate.js';
import { hallOf, chozuya } from './recipes.js';

const $ = (s) => document.querySelector(s);
const sx = (z) => Math.sin(z * 0.17 + 0.6) * 1.15;      // the sandō's gentle S

/* ---------------- the kasagi editor ---------------- */

class CurvePad {
  constructor(mount, vals, onChange) {
    this.vals = vals.slice(); this.onChange = onChange;
    const c = this.c = document.createElement('canvas');
    c.width = 680; c.height = 240; c.className = 'pad'; c.setAttribute('aria-label', 'Draw the curve of the kasagi: drag the points');
    mount.append(c);
    this.x = c.getContext('2d');
    this.max = 0.6;
    const pos = (e) => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * c.width, (e.clientY - r.top) / r.height * c.height]; };
    const pick = ([mx, my]) => { let b = -1, bd = 30; this.vals.forEach((v, i) => { if (!i) return; const [x, y] = this.P(i); const d = Math.hypot(x - mx, y - my); if (d < bd) { bd = d; b = i; } }); return b; };
    let drag = -1;
    c.addEventListener('pointerdown', (e) => { drag = pick(pos(e)); if (drag > 0) c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', (e) => { if (drag > 0) { const [, my] = pos(e); this.vals[drag] = clamp((this.base - my) / this.h * this.max, 0, this.max); this.draw(); this.onChange(this.vals); } });
    c.addEventListener('pointerup', () => { drag = -1; });
    this.draw();
  }
  get base() { return this.c.height - 34; }
  get h() { return this.c.height - 70; }
  P(i) { return [this.c.width / 2 + (i / (this.vals.length - 1)) * (this.c.width / 2 - 34), this.base - this.vals[i] / this.max * this.h]; }
  set(v) { this.vals = v.slice(); this.draw(); }
  draw() {
    const { x, c } = this, W = c.width, base = this.base, f = curveOf(this.vals), acc = '#b5533a';
    x.clearRect(0, 0, W, c.height);
    x.strokeStyle = 'rgba(80,70,50,.18)'; x.lineWidth = 2; x.beginPath(); x.moveTo(14, base); x.lineTo(W - 14, base); x.stroke();
    // the whole lintel, mirrored from the half you edit
    x.lineCap = 'round'; x.strokeStyle = '#1c1816'; x.lineWidth = 16; x.beginPath();
    for (let i = 0; i <= 120; i++) { const t = i / 120, u = Math.abs(2 * t - 1), px = 34 + t * (W - 68), py = base - f(u) / this.max * this.h - 2; i ? x.lineTo(px, py) : x.moveTo(px, py); }
    x.stroke();
    x.strokeStyle = acc; x.lineWidth = 4; x.beginPath();
    for (let i = 0; i <= 60; i++) { const t = i / 60, px = W / 2 + t * (W / 2 - 34), py = base - f(t) / this.max * this.h - 2; i ? x.lineTo(px, py) : x.moveTo(px, py); }
    x.stroke();
    this.vals.forEach((_, i) => { if (!i) return; const [px, py] = this.P(i); x.fillStyle = '#fff'; x.strokeStyle = acc; x.lineWidth = 4; x.beginPath(); x.arc(px, py - 2, 11, 0, TAU); x.fill(); x.stroke(); });
    x.fillStyle = 'rgba(80,70,50,.6)'; x.font = '20px Inter, sans-serif'; x.fillText('the sweep of the lintel, edge to centre · drag the points', 22, 28);
  }
}

/* ---------------- ground ---------------- */

function paintGround(x, res, toPx, r) {
  // the shade of the grove
  const base = x.createLinearGradient(0, 0, 0, res);
  base.addColorStop(0, '#5c6f42'); base.addColorStop(1, '#6f8348');
  x.fillStyle = base; x.fillRect(0, 0, res, res);
  for (let i = 0; i < 2600; i++) {
    x.fillStyle = `rgba(${60 + r() * 40},${84 + r() * 44},${40 + r() * 26},${0.05 + r() * 0.1})`;
    x.beginPath(); x.ellipse(r() * res, r() * res, 6 + r() * 26, 4 + r() * 16, r() * 3, 0, TAU); x.fill();
  }
  // the gravel strip: pale, wide, and following the S
  const strip = (w, col) => {
    x.strokeStyle = col; x.lineWidth = w * (res / 30); x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath();
    for (let z = -15; z <= 15; z += 0.3) { const [px, py] = toPx(sx(z), z); z === -15 ? x.moveTo(px, py) : x.lineTo(px, py); }
    x.stroke();
  };
  strip(4.1, '#b3a78d'); strip(3.75, '#d5cdb7');
  // grain of the gravel
  for (let i = 0; i < 16000; i++) {
    const z = -15 + r() * 30, off = (r() - 0.5) * 3.6, [px, py] = toPx(sx(z) + off, z);
    x.fillStyle = `rgba(${130 + r() * 110},${120 + r() * 110},${100 + r() * 100},${0.1 + r() * 0.3})`;
    x.beginPath(); x.arc(px, py, 0.5 + r() * 1.4, 0, TAU); x.fill();
  }
  // rake lines: long strokes following the path on either side of the paving
  x.strokeStyle = 'rgba(120,108,88,.35)'; x.lineWidth = 1.2;
  for (const o of [-1.6, -1.42, -1.24, -1.06, 1.06, 1.24, 1.42, 1.6]) {
    x.beginPath();
    for (let z = -15; z <= 15; z += 0.3) { const [px, py] = toPx(sx(z) + o, z); z === -15 ? x.moveTo(px, py) : x.lineTo(px, py); }
    x.stroke();
  }
  // leaf litter and shade pooling near the trees
  for (let i = 0; i < 700; i++) {
    const a = r() * TAU, d = 7 + r() * 8, [px, py] = toPx(Math.cos(a) * d, Math.sin(a) * d);
    x.fillStyle = `rgba(${90 + r() * 60},${70 + r() * 40},${30 + r() * 20},${0.06 + r() * 0.1})`;
    x.beginPath(); x.ellipse(px, py, 3 + r() * 9, 2 + r() * 5, r() * 3, 0, TAU); x.fill();
  }
}

/* ---------------- the stage ---------------- */

export async function makeShrineStage(lab) {
  const [{ Sky }, F, GM] = await Promise.all([loadSkyModule(), loadFoliageModule(), loadGrassModule()]);
  const P = 15, hallZ = -8.5, gateZ = 5.2;
  const world = new LabWorld(lab, $('#stage'), {
    SkyClass: Sky, hour: +flag('hour', lab.hour), plot: P, res: 2048, paint: paintGround, outer: 0x5f7d42, shadowExtent: 18,
    camera: { az: 0.42, el: 0.075, dist: 13.5, focus: [-0.5, 3.4, 3] }, bounds: { x0: -10.5, x1: 10.5, z0: -12, z1: 13.5 },
    catStart: { x: sx(12.5), z: 12.5, heading: Math.PI },
    views: {
      stage: { label: 'Precinct', az: 0.42, el: 0.075, dist: 13.5, focus: [-0.5, 3.4, 3] },
      gate: { label: 'The gate', az: 0.34, el: 0.1, dist: 8, focus: [sx(gateZ), 3, gateZ] },
      hall: { label: 'The hall', az: -0.2, el: 0.12, dist: 8.5, focus: [sx(hallZ), 2, hallZ + 2] },
      eye: { label: 'Cat-eye', eye: true },
      high: { label: 'From above', az: 0.6, el: 1.1, dist: 24, focus: [0, 0, 0] }
    }
  });
  const scene = world.scene, k = { THREE };

  const state = {
    kind: flag('kind', 'myojin'), sori: SORI.myojin.slice(), span: 3.6, height: 4.6, lean: 0.03, paint: 0xc9412a, school: 'yoshida', profile: 'gobo', count: +flag('senbon', 1)
  };
  const blockers = [];
  world.blocked = (x, z) => {
    for (const b of blockers) if (b.r ? Math.hypot(x - b.x, z - b.z) < b.r : (Math.abs(x - b.x) < b.w && Math.abs(z - b.z) < b.d)) return true;
    if (state.count > 1 && z > -5.6 && z < 10.8) { const dx = Math.abs(x - sx(z)); if (dx > 0.8 && dx < 1.16) return true; }
    return false;
  };

  /* paving */
  {
    const r = rng(5), list = [];
    for (let z = -14; z < 14; z += 0.5) for (let c = 0; c < 3; c++) {
      if (z > hallZ + 3 && z < hallZ + 5 && false) continue;
      const stagger = Math.floor((z + 14) * 2) % 2 ? 0.2 : 0;
      list.push({ x: sx(z) + (c - 1) * 0.48 + stagger, y: 0.03, z: z + (r() - 0.5) * 0.03, sx: 0.42 + r() * 0.05, sy: 0.07, sz: 0.44 + r() * 0.04, ry: (r() - 0.5) * 0.06, rz: (r() - 0.5) * 0.02 });
    }
    const m = instances(new THREE.BoxGeometry(1, 1, 1), M.stone({ tint: 0x9d9789, moss: 0.08, lichen: 0.2, grime: 0.3 }), list, 'Paving');
    m.receiveShadow = true; m.castShadow = true;
    scene.add(m);
  }

  /* the gate: rebuilt whenever the kasagi or a slider changes */
  const gate = new THREE.Group(); gate.name = 'Gate'; gate.position.set(sx(gateZ), 0, gateZ); gate.rotation.y = Math.atan2(sx(gateZ + 0.3) - sx(gateZ - 0.3), 0.6);
  scene.add(gate);
  const gateMeshes = {};
  const rope = new THREE.Group(); gate.add(rope);
  let sway = null;
  const rebuildGate = () => {
    const G = gateGeos({ kind: state.kind, sori: state.sori, span: state.span, height: state.height, lean: state.lean, postR: state.kind === 'ishi' ? 0.27 : 0.21 });
    const mats = gateMats({ paint: state.paint, moss: 0.8 });
    for (const [n, m] of Object.entries(gateMeshes)) { if (!G[n]) { gate.remove(m); m.geometry.dispose(); delete gateMeshes[n]; } }
    for (const [n, geo] of Object.entries(G)) {
      if (gateMeshes[n]) { gateMeshes[n].geometry.dispose(); gateMeshes[n].geometry = geo; gateMeshes[n].material = mats[n]; }
      else { const m = new THREE.Mesh(geo, mats[n]); m.castShadow = m.receiveShadow = true; gate.add(m); gateMeshes[n] = m; }
    }
    // blockers for the posts move with the span
    blockers.length = 0;
    const px = (s) => gate.position.x + s * state.span / 2 * Math.cos(gate.rotation.y), pz = (s) => gate.position.z - s * state.span / 2 * Math.sin(gate.rotation.y);
    blockers.push({ x: px(-1), z: pz(-1), r: 0.42 }, { x: px(1), z: pz(1), r: 0.42 }, ...fixedBlockers);
  };
  const rebuildRope = () => {
    rope.clear();
    const y = state.height - 0.74 - 0.12, R = shimenawa(state.span - 0.42, y, { profile: state.profile, sag: 0.12 });
    const m = new THREE.Mesh(R.geo, M.straw({ color: 0xcdb077 })); m.castShadow = true; rope.add(m);
    const h = hangShide(R.pts, state.school, 5); h.group.traverse((o) => { if (o.isMesh) o.castShadow = true; }); rope.add(h.group); sway = h.sway;
  };

  /* senbon: a tunnel of slim gates along the path */
  const slim = gateGeos({ kind: 'slim', span: 1.92, height: 2.85, postR: 0.075, lintelH: 0.13, lintelD: 0.17, ext: 0.27, nukiDrop: 0.42, sori: SORI.gentle, lean: 0.012 });
  const slimMats = gateMats({ paint: 0xdc4a2c });
  const MAXG = 60;
  const senbon = Object.entries(slim).map(([n, g]) => { const m = new THREE.InstancedMesh(g, slimMats[n], MAXG); m.count = 0; m.castShadow = m.receiveShadow = true; m.frustumCulled = false; m.name = 'Senbon ' + n; scene.add(m); return m; });
  const setCount = (n) => {
    state.count = n;
    const live = Math.max(0, n - 1), o = new THREE.Object3D();
    let i = 0;
    for (let j = 0; j < live; j++) {
      const z = lerp(10.6, -5.4, (j + 0.5) / live);
      o.position.set(sx(z), 0, z); o.rotation.y = Math.atan2(sx(z + 0.3) - sx(z - 0.3), 0.6); o.scale.setScalar(1); o.updateMatrix();
      for (const m of senbon) m.setMatrixAt(i, o.matrix);
      i++;
    }
    for (const m of senbon) { m.count = i; m.instanceMatrix.needsUpdate = true; }
  };

  /* guardians, basin, hall */
  const fixedBlockers = [];
  const komaGeo = (open) => {
    const prims = komainuPrims(open);
    return lab.sculpt(prims, 0.02, { relax: 3 });
  };
  const komaM = M.rock({ a: 0x77736a, b: 0xb3ad9f, moss: 0.6, lichen: 0.7, bump: 0.016 }), baseM = M.stone({ tint: 0x9a958a, moss: 0.3, lichen: 0.5 });
  const koma = [];
  for (const [side, open, label] of [[-1, true, 'A-gyō, mouth open: the first sound'], [1, false, 'Un-gyō, mouth shut: the last sound']]) {
    const z = 1.2, x = sx(z) + side * 2.5, g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = -side * 0.5 + Math.PI * 0;
    const m = new THREE.Mesh(komaGeo(open), komaM); m.position.y = 0.42; m.scale.setScalar(1.12); m.castShadow = m.receiveShadow = true; g.add(m);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.42, 0.98), baseM); b.position.y = 0.21; b.castShadow = b.receiveShadow = true; g.add(b);
    scene.add(g);
    koma.push(g);
    world.addPick(g, () => { world.say(label); thump({ freq: 100, vol: 0.18 }); }, label);
    fixedBlockers.push({ x, z, r: 0.75 });
  }
  const basin = chozuya({ ...k, THREE, M, V3, tube, Bag: (await import('../../shared/craft.js')).Bag, catmull: (await import('../../shared/craft.js')).catmull });
  basin.position.set(sx(2.2) + 4.3, 0, 2.2); basin.rotation.y = -Math.PI / 2;
  shadows(basin); scene.add(basin);
  fixedBlockers.push({ x: basin.position.x, z: basin.position.z, w: 1.25, d: 1.5 });
  const hall = hallOf({ ...k, THREE, M, V3, Bag: (await import('../../shared/craft.js')).Bag }, 'nagare');
  hall.position.set(sx(hallZ), 0, hallZ);
  shadows(hall); scene.add(hall);
  fixedBlockers.push({ x: hall.position.x, z: hallZ, w: 2.9, d: 2.2 }, { x: hall.position.x, z: hallZ + 2.5, w: 0.95, d: 0.9 });
  // the bell and the offering box in front of it
  const bellG = new THREE.Group();
  const bx = hall.position.x, bz = hallZ + 3.08;
  const beam = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.1), M.wood({ base: 0x7a5c3a, dark: 0x4a3322 })); beam.position.set(bx, 3.42, bz); beam.castShadow = true; scene.add(beam);
  const suzu = buildSuzu({ cord: 1.5 }); suzu.position.set(0, -0.28, 0); bellG.add(suzu); bellG.position.set(bx, 3.4, bz); scene.add(bellG); shadows(bellG);
  const box = (() => { const b = new (lab.Bag)(), c = 0x5a3a24; b.box(0.9, 0.5, 0.58, { y: 0.25, color: 0x4a2f1c }); for (let i = 0; i < 9; i++) b.box(0.84, 0.03, 0.055, { y: 0.5, z: (i - 4) * 0.06, rx: 0.5, color: c }); return b.mesh(M.bag({ rough: 0.65 }), 'Saisen box'); })();
  box.position.set(bx, 0.07, bz + 0.5); box.castShadow = box.receiveShadow = true; scene.add(box);
  fixedBlockers.push({ x: bx, z: bz + 0.5, w: 0.62, d: 0.5 });
  world.addGlow(V3(bx, 2.1, hallZ + 1.1), { size: 3, intensity: 7, distance: 9, color: 0xffb060 });

  /* a stone lantern every few metres */
  {
    const list = { base: [], post: [], box: [], cap: [] };
    const pts = [[-2.6, -4.5], [2.6, -4.5], [-2.6, -0.2], [2.6, -0.2], [-2.6, 8.8], [2.6, 8.8]];
    for (const [ox, z] of pts) {
      const x = sx(z) + ox; fixedBlockers.push({ x, z, r: 0.42 });
      list.base.push({ x, y: 0.1, z, sx: 0.4, sy: 0.2, sz: 0.4 });
      list.post.push({ x, y: 0.7, z, sx: 0.14, sy: 1, sz: 0.14 });
      list.box.push({ x, y: 1.36, z, sx: 0.5, sy: 0.42, sz: 0.5 });
      list.cap.push({ x, y: 1.72, z, sx: 0.46, sy: 0.3, sz: 0.46 });
    }
    const S = M.stone({ tint: 0x8f8a7e, moss: 0.3, lichen: 0.3 });
    const geos = { base: new THREE.CylinderGeometry(1, 1.14, 1, 8), post: new THREE.CylinderGeometry(1, 1.15, 1, 10), box: new THREE.BoxGeometry(1, 1, 1), cap: new THREE.ConeGeometry(1.4, 1, 8) };
    for (const n of Object.keys(list)) { const m = instances(geos[n], S, list[n]); m.castShadow = m.receiveShadow = true; scene.add(m); }
    for (const [ox, z] of pts) world.addGlow(V3(sx(z) + ox, 1.36, z), { size: 2.4, intensity: 4.5, distance: 7 });
  }

  /* interactions */
  const ring = () => { swing = 1; bell(640, { vol: 0.34, dur: 3.2 }); world.say('Rung gently, once. Hello.'); };
  let swing = 0, swingT = 0;
  world.addPick(bellG, ring, 'Ring the suzu');
  const clink = () => { bell(2100, { vol: 0.16, dur: 0.5, partials: [1, 2.4, 3.9] }); setTimeout(() => thump({ vol: 0.12, freq: 200 }), 90); world.say('Five yen, for good connection: go-en.'); };
  world.addPick(box, clink, 'Offer a coin');
  // the basin: a little water poured from the dipper
  const drops = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(90), 3)), new THREE.PointsMaterial({ color: 0xcfe9ee, size: 0.05, transparent: true, opacity: 0.85, depthWrite: false }));
  drops.frustumCulled = false; scene.add(drops);
  let poured = 0;
  world.addPick(basin, () => { poured = 1.6; world.say('Left hand, right hand, mouth, then let it run down the handle.'); for (let i = 0; i < 5; i++) setTimeout(() => drip({ vol: 0.2 }), i * 180 + 30); }, 'Wash your hands');

  /* the ritual */
  let busy = false;
  const walkTo = (x, z) => new Promise((res) => { const c = world.cat; c.goTo(x, z); const id = setInterval(() => { if (Math.hypot(c.pos.x - x, c.pos.y - z) < 0.32 || !c.target) { clearInterval(id); res(); } }, 60); });
  const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion ? ms * 0.25 : ms));
  async function ritual() {
    if (busy || !world.cat) return; busy = true;
    world.view('hall');
    world.say('Michi walks to the side of the path: the middle is the god’s.');
    await walkTo(bx - 0.9, bz + 3);
    await walkTo(bx, bz + 1.5);
    world.cat.heading = Math.PI;
    world.cat.cat?.setLookTarget(V3(bx, 1.6, bz));
    await wait(500); clink(); await wait(900);
    ring(); await wait(1500);
    world.say('Two bows.'); world.cat.cat?.startIdleAction('stretch', 2.2); await wait(2200);
    world.say('Two claps.'); thump({ vol: 0.28, freq: 280 }); await wait(420); thump({ vol: 0.28, freq: 280 }); await wait(1100);
    world.say('One more bow, and Michi sits a while.'); world.cat.cat?.startIdleAction('sit', 8); await wait(2000);
    world.cat.cat?.setLookTarget(null);
    busy = false;
  }

  world.onUpdate = (dt, t) => {
    sway?.(t, 1 + (world.gust || 0) * 2);
    swingT += dt;
    if (swing > 0.002) { swing *= Math.exp(-dt * 0.9); bellG.rotation.x = Math.sin(swingT * 7.5) * 0.4 * swing; bellG.rotation.z = Math.sin(swingT * 5.3) * 0.12 * swing; } else { bellG.rotation.x *= Math.max(0, 1 - dt * 3); bellG.rotation.z *= Math.max(0, 1 - dt * 3); }
    // the dipper's water, while it pours
    const p = drops.geometry.attributes.position;
    if (poured > 0) {
      poured -= dt;
      for (let i = 0; i < p.count; i++) { const f = (t * 1.7 + i * 0.37) % 1, y = lerp(1.05, 0.58, f * f); p.setXYZ(i, basin.position.x - 0.15 + Math.sin(i * 7.3) * 0.05 * f, y, basin.position.z - 0.25 + Math.cos(i * 3.1) * 0.05 * f); }
      p.needsUpdate = true; drops.visible = true;
    } else drops.visible = false;
  };

  /* compare with the game's own gate */
  const orig = originalOf('buildTorii', 0, 0).group;
  orig.position.copy(gate.position); orig.rotation.y = gate.rotation.y; orig.visible = false; shadows(orig); scene.add(orig);
  const compare = (on) => world.setCompare(on, (side) => { orig.visible = side === 0; gate.visible = side === 1; for (const m of senbon) m.visible = side === 1 && m.count > 0; }, ['Our torii, today', 'Your gate']);

  /* ---------------- controls ---------------- */

  standardBar(world, $('#bar'));
  const kindDD = new Dropdown($('#slot-kind'), { label: 'Kind of gate', items: [
    { value: 'myojin', label: 'myōjin', hint: 'swept, leaning, the common form' }, { value: 'shinmei', label: 'shinmei', hint: 'straight, round, unpainted' },
    { value: 'kasuga', label: 'kasuga', hint: 'no second lintel' }, { value: 'ishi', label: 'stone', hint: 'cut from granite' } ], value: state.kind, onChange: (v) => { state.kind = v; if (v === 'shinmei') pad.set(SORI.straight), state.sori = SORI.straight.slice(); rebuildGate(); } });
  const paintDD = new Dropdown($('#slot-paint'), { label: 'Lacquer colour', items: [
    { value: 0xc9412a, label: 'vermilion', swatch: '#d8482c' }, { value: 0xb23a2c, label: 'old cinnabar', swatch: '#b23a2c' }, { value: 0x2a2622, label: 'black lacquer', swatch: '#2a2622' }, { value: 0xc9a06a, label: 'bare cedar', swatch: '#c9a06a' } ], value: state.paint, onChange: (v) => { state.paint = v; rebuildGate(); } });
  const schoolDD = new Dropdown($('#slot-school'), { label: 'School of shide', items: [
    { value: 'yoshida', label: 'Yoshida', hint: 'all folds one way' }, { value: 'shirakawa', label: 'Shirakawa', hint: 'folds alternate' }, { value: 'ise', label: 'Ise', hint: 'long, narrow tongues' } ], value: state.school, onChange: (v) => { state.school = v; rebuildRope(); } });

  const pad = new CurvePad($('#pad-mount'), state.sori, (v) => { state.sori = v.slice(); queued = true; });
  let queued = false;
  const schedule = () => { if (queued) { queued = false; rebuildGate(); } requestAnimationFrame(schedule); };
  requestAnimationFrame(schedule);

  const sliders = $('#gate-sliders');
  slider(sliders, { label: 'Span', min: 2.6, max: 4.6, step: 0.05, value: state.span, fmt: (v) => v.toFixed(2) + ' m', onInput: (v) => { state.span = v; queued = true; rebuildRope(); } });
  slider(sliders, { label: 'Height', min: 3.2, max: 6, step: 0.05, value: state.height, fmt: (v) => v.toFixed(2) + ' m', onInput: (v) => { state.height = v; queued = true; rebuildRope(); } });
  slider(sliders, { label: 'Lean', min: 0, max: 0.08, step: 0.002, value: state.lean, fmt: (v) => Math.round(v * 1000) / 10 + '%', onInput: (v) => { state.lean = v; queued = true; } });
  seg($('#preset-mount'), [{ v: 'gentle', label: 'Gentle' }, { v: 'myojin', label: 'Myōjin' }, { v: 'deep', label: 'Deep' }, { v: 'straight', label: 'Straight' }], 'myojin', (v) => { state.sori = SORI[v].slice(); pad.set(state.sori); rebuildGate(); });

  const countCtl = slider($('#senbon-mount'), { label: 'How many gates?', min: 1, max: MAXG, step: 1, value: state.count, fmt: (v) => (v === 1 ? 'one' : v + ' gates'), onInput: (v) => setCount(v) });
  $('#btn-tunnel').addEventListener('click', () => { const n = state.count > 1 ? 1 : 40; countCtl.set(n); setCount(n); if (n > 1) { world.view('eye'); if (world.cat) { world.cat.pos.set(sx(11.5), 11.5); world.cat.heading = Math.PI; world.cat.setPath(tunnelPath(), false); world.cat.setMode('path'); } world.say('Walk it. Press V to step back out.'); } else { world.view('stage'); world.cat?.stop(); } });
  const tunnelPath = () => { const list = []; for (let z = 11; z >= -6; z -= 0.8) list.push(new THREE.Vector2(sx(z), z)); return list; };
  $('#btn-ritual').addEventListener('click', ritual);
  const cmpBtn = $('#btn-compare'); let cmp = false;
  cmpBtn.addEventListener('click', () => { cmp = !cmp; compare(cmp); cmpBtn.textContent = cmp ? 'Stop comparing' : 'Compare with the game'; cmpBtn.setAttribute('aria-pressed', cmp); if (cmp) world.view('gate'); });

  const FOCUS = { 'myojin': 0, 'shinmei': 1, 'ishi': 2 };
  world.chooseSpec = (spec) => {
    if (FOCUS[spec.id] !== undefined || spec.id === 'deep') { kindDD.set(spec.id === 'deep' ? 'myojin' : spec.id); if (spec.id === 'deep') { state.sori = SORI.deep.slice(); pad.set(state.sori); rebuildGate(); } world.view('gate'); }
    else if (spec.id === 'game-torii') { if (!cmp) cmpBtn.click(); }
    else if (['yoshida', 'shirakawa', 'ise'].includes(spec.id)) { schoolDD.set(spec.id); world.view('gate'); }
    else if (['agyo', 'ungyo'].includes(spec.id)) world.view('stage');
    else if (['nagare', 'suzu', 'game-hall'].includes(spec.id)) world.view('hall');
    world.say(spec.name);
  };

  rebuildGate(); rebuildRope(); setCount(state.count);
  // grow the grass round everything that has claimed the ground
  // the grove: a clear sightline from the camera, and room along the sandō
  const camAz = 0.42;
  world.loadForest(F, {
    near: 34, nearInner: 12, nearCount: 40,
    keepOut: (x, z) => {
      const dz = z - 3, dx = x + 0.5, d = Math.hypot(dx, dz), ang = Math.abs(((Math.atan2(dx, dz) - camAz + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      return (d < 26 && ang < 0.55) || Math.abs(x - sx(z)) < 4.2 || (z < -3 && z > -14 && Math.abs(x) < 6);
    }
  });
  world.loadGrass(GM, {
    paint: (m) => {
      m.paint('excl', (x, z) => { const d = Math.abs(x - sx(z)); return d < 2.2 ? 1 : d < 2.7 ? (2.7 - d) / 0.5 : 0; });
      m.disc('excl', sx(hallZ), hallZ, 4.8, 1, 1);
      m.rect('excl', basin.position.x, basin.position.z, 3.2, 3.2);
      for (const g of koma) m.disc('excl', g.position.x, g.position.z, 0.9, 1, 0.4);
    },
    zones: [['near', 0.12], ['thicket', 0.5]],
    palette: { root: 0x3f6a2e, mid: 0x74a648, tip: 0xbcd86a }
  });
  await world.loadCat();
  if (flag('walk')) { world.view('eye'); }
  window.__shrine = { world, state, setCount, rebuildGate };
  return world;
}
