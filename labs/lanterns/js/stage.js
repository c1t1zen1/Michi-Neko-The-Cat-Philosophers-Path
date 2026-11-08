// A street at dusk. Click a lantern to kindle it, or light the whole row in a
// wave and watch it travel. The kind of lantern is yours to change.
import * as THREE from 'three';
import { loadSkyModule, loadFoliageModule, loadGrassModule } from '../../shared/game.js';
import { LabWorld } from '../../shared/world.js';
import { standardBar } from '../../shared/workshop.js';
import { Dropdown, slider, seg } from '../../shared/ui.js';
import { V3, TAU, rng, instances } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { bell, thump } from '../../shared/sound.js';
import { flag } from '../../shared/stage.js';
import { chochin } from '../../shared/paperlantern.js';
import { toro, TORO_KINDS } from './kit.js';

const $ = (s) => document.querySelector(s);
const SPOTS = [[-2.5, -9.5], [2.5, -7], [-2.5, -4.5], [2.5, -2], [-2.5, 0.5], [2.5, 3], [-2.5, 5.5], [2.5, 8]];

function paintGround(x, res, toPx, r) {
  x.fillStyle = '#6a7a50'; x.fillRect(0, 0, res, res);
  for (let i = 0; i < 2200; i++) { x.fillStyle = `rgba(${70 + r() * 40},${90 + r() * 40},${50 + r() * 25},${0.06 + r() * 0.12})`; x.beginPath(); x.ellipse(r() * res, r() * res, 5 + r() * 22, 3 + r() * 12, r() * 3, 0, TAU); x.fill(); }
  const [ax, ay] = toPx(-1.9, -14), [bx, by] = toPx(1.9, 14);
  x.fillStyle = '#c1b8a2'; x.fillRect(ax, ay, bx - ax, by - ay);
  for (let i = 0; i < 9000; i++) { const [px, py] = toPx(-1.9 + r() * 3.8, -14 + r() * 28); x.fillStyle = `rgba(${150 + r() * 80},${140 + r() * 80},${115 + r() * 80},${0.12 + r() * 0.3})`; x.beginPath(); x.arc(px, py, 0.6 + r() * 1.3, 0, TAU); x.fill(); }
}

export async function makeLanternStage(lab) {
  const [{ Sky }, F, GM] = await Promise.all([loadSkyModule(), loadFoliageModule(), loadGrassModule()]);
  const P = 15;
  const blockers = [];
  const world = new LabWorld(lab, $('#stage'), {
    SkyClass: Sky, hour: +flag('hour', 19.3), plot: P, res: 1536, paint: paintGround, outer: 0x4e6a3c, shadowExtent: 18,
    camera: { az: 0.1, el: 0.075, dist: 12.5, focus: [0, 1.5, -3.5] }, bounds: { x0: -3, x1: 3, z0: -12, z1: 13 }, catStart: { x: 0, z: 11, heading: Math.PI },
    blocked: (x, z) => blockers.some((b) => Math.hypot(x - b[0], z - b[1]) < 0.42),
    views: { stage: { label: 'The street', az: 0.1, el: 0.075, dist: 12.5, focus: [0, 1.5, -3.5] }, near: { label: 'A lantern', az: 0.55, el: 0.1, dist: 3.6, focus: [-2.5, 1.2, 0.5] }, eye: { label: 'Cat-eye', eye: true } }
  });
  const scene = world.scene;
  const st = { kind: flag('kind', 'kasuga'), moss: 0.4, age: 0.4 };

  // paving and low walls either side, with kawara caps and hanging lanterns
  {
    const r = rng(9), list = [];
    for (let z = -13.5; z < 13.5; z += 0.6) for (let c = 0; c < 6; c++) list.push({ x: (c - 2.5) * 0.62 + (Math.floor(z * 2) % 2 ? 0.16 : 0), y: 0.025, z: z + (r() - 0.5) * 0.04, sx: 0.58, sy: 0.05, sz: 0.56, ry: (r() - 0.5) * 0.05 });
    const m = instances(new THREE.BoxGeometry(1, 1, 1), M.stone({ tint: 0x9e998c, moss: 0.1, lichen: 0.2, grime: 0.2 }), list, 'Paving'); m.castShadow = m.receiveShadow = true; scene.add(m);
    const plaster = M.plaster({ tint: 0xe6d9bf, grime: 0.55, grimeH: 0.9 }), tile = M.tile({});
    for (const s of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.15, 27), plaster); wall.position.set(s * 3.5, 1.075, 0); wall.castShadow = wall.receiveShadow = true; scene.add(wall);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 27.2), tile); cap.position.set(s * 3.5, 2.28, 0); cap.rotation.z = s * 0.06; cap.castShadow = true; scene.add(cap);
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 27.3), M.plain(0x2c3136, { rough: 0.6 })); ridge.position.set(s * 3.5, 2.36, 0); scene.add(ridge);
    }
  }

  const row = [];
  const buildRow = () => {
    for (const o of row) { scene.remove(o.g); }
    blockers.length = 0;
    const was = row.map((o) => o.on);
    row.length = 0;
    SPOTS.forEach(([x, z], i) => {
      const g = toro(st.kind, { moss: st.moss, lichen: st.age });
      g.position.set(x, 0, z); g.rotation.y = i * 0.37;
      g.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
      scene.add(g);
      blockers.push([x, z]);
      const y = g.userData.lampY;
      let glow = glows[i];
      if (!glow) { glow = glows[i] = world.addGlow(V3(x, y, z), { size: 2.2, intensity: 4, distance: 6 }); world.addPick(pickProxy(x, z, i), () => toggleOne(i), 'Kindle this lantern'); }
      else glow.g.spr.position.set(x, y, z), glow.g.light?.position.set(x, y, z);
      row.push({ g, paper: g.userData.paper, on: was[i] ?? 0, target: was[i] ?? 0, glow, x, z });
    });
  };
  const glows = [];
  const pickProxy = (x, z, i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.2, 8), new THREE.MeshBasicMaterial({ visible: false })); m.position.set(x, 1.1, z); scene.add(m); return m; };
  const toggleOne = (i) => { const o = row[i]; o.target = o.target ? 0 : 1; o.glow.set(o.target); thump({ vol: 0.12, freq: 240 }); if (o.target) bell(1700 + i * 60, { vol: 0.06, dur: 0.5, partials: [1, 2.6] }); };

  // hanging paper down the street
  const hanging = [];
  {
    const tex = (await import('../../shared/paperlantern.js')).washiTexture({ ribs: 15, seed: 8 });
    for (let i = 0; i < 12; i++) {
      const s = i % 2 ? 1 : -1, z = -11.5 + i * 2.1;
      const l = chochin({ h: 0.5, belly: 0.17, tex, cord: 0.2 }); l.position.set(s * 3.1, 1.96, z); scene.add(l);
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.05), M.wood()); beam.position.set(s * 3.27, 2.21, z); scene.add(beam);
      const glow = world.addGlow(V3(s * 3.1, 1.94, z), { size: 1.7, light: false, on: false });
      hanging.push({ l, mat: l.userData.mat, on: 0, target: 0, glow, ph: i });
    }
  }

  const wave = (on = 1) => {
    const list = [...row.map((o) => ({ ...o, kind: 'row', o })), ...hanging.map((o) => ({ o, z: o.l.position.z, kind: 'hang' }))].sort((a, b) => (b.z ?? b.o.z) - (a.z ?? a.o.z));
    list.forEach((item, i) => setTimeout(() => { const t = item.o; t.target = on; t.glow.set(on); if (on && i % 3 === 0) bell(1500 + i * 30, { vol: 0.05, dur: 0.5, partials: [1, 2.6] }); }, i * 170));
    world.say(on ? 'Lit from the top of the street down.' : 'Out, one by one.');
  };

  world.onUpdate = (dt, t) => {
    for (const o of row) { o.on += (o.target - o.on) * Math.min(1, dt * 2.8); o.paper.userData.u.uGlow.value = o.on * (1.55 + Math.sin(t * 8 + o.x * 3) * 0.05); }
    for (const o of hanging) { o.on += (o.target - o.on) * Math.min(1, dt * 2.8); o.mat.userData.u.uGlow.value = o.on * (1.5 + Math.sin(t * 7 + o.ph) * 0.08); o.l.rotation.z = Math.sin(t * 1.1 + o.ph) * 0.03; }
  };

  buildRow();
  standardBar(world, $('#bar'), { presets: [[17.5, 'Golden'], [19.3, 'Kindling'], [20.8, 'Night']] });
  new Dropdown($('#slot-kind'), { label: 'Kind of lantern', value: st.kind, items: Object.entries(TORO_KINDS).map(([value, v]) => ({ value, label: v.label, hint: v.hint })), onChange: (v) => { st.kind = v; buildRow(); world.say(TORO_KINDS[v].label + ' lanterns all down the street.'); } });
  slider($('#ctl'), { label: 'Age', min: 0, max: 1, step: 0.02, value: 0.4, fmt: (v) => `${Math.round(v * 200)} years`, onInput: (v) => { st.age = v; st.moss = v * 1.1; buildRow(); } });
  $('#btn-kindle').addEventListener('click', () => wave(1));
  $('#btn-out').addEventListener('click', () => wave(0));

  await world.loadForest(F, { near: 30, nearInner: 14, nearCount: 32, keepOut: (x, z) => Math.abs(x) < 7 });
  world.loadGrass(GM, { paint: (m) => m.paint('excl', (x, z) => (Math.abs(x) < 3.9 ? 1 : 0)), zones: [['near', 0.14]] });
  await world.loadCat();
  world.chooseSpec = (spec) => { if (TORO_KINDS[spec.id]) { st.kind = spec.id; buildRow(); world.view('near'); } world.say(spec.name); };
  setTimeout(() => { if (flag('lit') || flag('shot')) wave(1); }, 300);
  window.__lanterns = { world, st, row };
  return world;
}
