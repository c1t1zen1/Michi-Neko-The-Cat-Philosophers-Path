// Sixty days in a minute: click to set a rhizome and watch shoots rise, shed
// their sheaths and open into a grove that Michi can walk through.
import * as THREE from 'three';
import { loadSkyModule, loadFoliageModule, loadGrassModule } from '../../shared/game.js';
import { LabWorld } from '../../shared/world.js';
import { standardBar } from '../../shared/workshop.js';
import { slider, seg } from '../../shared/ui.js';
import { V3, TAU, rng, sstep, lerp, instances } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { thump } from '../../shared/sound.js';
import { flag, reduceMotion } from '../../shared/stage.js';
import { culmMatrix, bambooColor } from '../../shared/bamboo.js';
import { CULM, leafTexture, swayMat, growthCurve } from './kit.js';

const $ = (s) => document.querySelector(s);
const MAX = 90, LEAVES_PER = 44;

function paintGround(x, res, toPx, r) {
  x.fillStyle = '#6a6a40'; x.fillRect(0, 0, res, res);
  for (let i = 0; i < 3000; i++) { const t = r(); x.fillStyle = t < 0.6 ? `rgba(${120 + r() * 50},${106 + r() * 34},${50 + r() * 26},${0.08 + r() * 0.2})` : `rgba(${70 + r() * 30},${90 + r() * 30},${42 + r() * 20},${0.08 + r() * 0.16})`; x.beginPath(); x.ellipse(r() * res, r() * res, 2 + r() * 9, 1 + r() * 4, r() * 3, 0, TAU); x.fill(); }
}

export async function makeGroveStage(lab) {
  const [{ Sky }, F, GM] = await Promise.all([loadSkyModule(), loadFoliageModule(), loadGrassModule()]);
  const P = 14;
  const culms = [];
  const world = new LabWorld(lab, $('#stage'), {
    SkyClass: Sky, hour: +flag('hour', 15), plot: P, res: 1536, paint: paintGround, outer: 0x4e6a36, shadowExtent: 14,
    camera: { az: 0.5, el: 0.1, dist: 11, focus: [0, 2.8, 0] }, bounds: { x0: -11, x1: 11, z0: -11, z1: 11 }, catStart: { x: -5, z: 5, heading: 2.4 },
    blocked: (x, z) => culms.some((c) => c.days > c.born + 10 && Math.hypot(c.x - x, c.z - z) < 0.16),
    views: { stage: { label: 'The grove', az: 0.5, el: 0.1, dist: 11, focus: [0, 2.8, 0] }, up: { label: 'Look up', az: 0.5, el: -0.05, dist: 3.4, focus: [0, 3, 0] }, eye: { label: 'Cat-eye', eye: true }, high: { label: 'Plan', az: 0.6, el: 1.25, dist: 22, focus: [0, 0, 0] } }
  });
  const scene = world.scene, u = { uT: { value: 0 }, uW: { value: 0.8 } }, st = { days: +flag('days', 56), auto: false };
  const stalkMat = swayMat(M.bamboo({ color: 0xffffff, rough: 0.5, vcol: true }), u);
  const stalks = new THREE.InstancedMesh(CULM, stalkMat, MAX);
  const branches = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.6, 1, 1, 6).translate(0, 0.5, 0), swayMat(M.bamboo({ color: 0x819951 }), u), MAX * 11);
  const shootMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 12), M.plain(0x7a5a36, { rough: 0.9 }), MAX);
  const leafMat = swayMat(new THREE.MeshStandardMaterial({ map: leafTexture(), alphaTest: 0.4, roughness: 0.65, side: THREE.DoubleSide }), u);
  const leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.1, 0.34, 1, 3).translate(0, -0.17, 0), leafMat, MAX * LEAVES_PER);
  for (const m of [stalks, branches, shootMesh, leaves]) { m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; m.count = 0; scene.add(m); }
  const R = rng(13), col = new THREE.Color();
  const addCulm = (x, z, born) => { if (culms.length >= MAX) return; culms.push({ x, z, born, H: 7 + R() * 4.5, r: 0.05 + R() * 0.05, tilt: (R() - 0.5) * 0.08, ry: R() * TAU, age: R() * 0.13, days: st.days, ph: R() * 6, leafA: Array.from({ length: LEAVES_PER }, () => ({ a: R() * TAU, h: 0.55 + R() * 0.45, d: 0.25 + R() * 0.7, rot: 0.3 + R() * 0.9, s: 0.7 + R() * 0.6 })) }); };
  const o = new THREE.Object3D(), m = new THREE.Matrix4(), a = V3(), b = V3();
  let lastBuilt = -1;
  const rebuild = () => {
    let n = 0, shoots = 0, lv = 0, bv = 0;
    for (const c of culms) {
      c.days = st.days;
      const g = growthCurve(st.days, c.born);
      if (g <= 0.02) continue;
      if (g < 0.55) { o.position.set(c.x, 0, c.z); o.rotation.set(0, c.ry, 0); const s = 0.1 + g * 0.5, h = 0.3 + g * 2.8; o.scale.set(s, h, s); o.position.y = h / 2; o.updateMatrix(); shootMesh.setMatrixAt(shoots++, o.matrix); }
      if (g >= 0.08) {
        const h = c.H * g;
        a.set(c.x, 0, c.z); b.set(c.x + c.tilt * h, h, c.z + c.tilt * h * 0.5);
        culmMatrix(a, b, c.r * sstep(0, 0.5, g) * 1.1 + 0.02, m); stalks.setMatrixAt(n, m); bambooColor(c.age, col); stalks.setColorAt(n, col); n++;
        if (g > 0.72) {
          const k = sstep(0.72, 1, g);
          for (let branch = 0; branch < 11; branch++) {
            const L = c.leafA[branch * 4], node = Math.min(10, Math.max(6, Math.round(L.h * 11))), y = h * node / 11;
            const start = V3(c.x + c.tilt * y, y, c.z + c.tilt * y * 0.5);
            const end = start.clone().add(V3(Math.cos(L.a) * L.d * k, 0.12 * k, Math.sin(L.a) * L.d * k));
            branches.setMatrixAt(bv++, culmMatrix(start, end, 0.008 * k));
            for (let j = 0; j < 4; j++) {
              const leaf = c.leafA[branch * 4 + j];
              o.position.copy(start).lerp(end, 0.4 + j * 0.2);
              o.rotation.set(leaf.rot, L.a + (j % 2 ? 0.65 : -0.65), j % 2 ? 0.35 : -0.35, 'YXZ');
              o.scale.setScalar(leaf.s * k); o.updateMatrix(); leaves.setMatrixAt(lv++, o.matrix);
            }
          }
        }
      }
    }
    stalks.count = n; branches.count = bv; shootMesh.count = shoots; leaves.count = lv;
    stalks.instanceMatrix.needsUpdate = true; branches.instanceMatrix.needsUpdate = true; if (stalks.instanceColor) stalks.instanceColor.needsUpdate = true; shootMesh.instanceMatrix.needsUpdate = true; leaves.instanceMatrix.needsUpdate = true;
  };
  // a starter grove: a few clumps of different ages
  for (const [cx, cz, count, born] of [[-1.5, -2, 16, 0], [3.2, 1.5, 12, 6], [-4.5, 2, 12, 12], [1.2, 4.4, 10, 20], [4.8, -3.6, 10, 28]]) for (let i = 0; i < count; i++) { const an = R() * TAU, d = Math.sqrt(R()) * 2.1; addCulm(cx + Math.cos(an) * d, cz + Math.sin(an) * d, born + R() * 6); }

  let lastPlant = 0;
  world.onGround = (p) => { if (world.t - lastPlant < 0.2) return true; lastPlant = world.t; for (let i = 0; i < 6; i++) { const an = R() * TAU, d = Math.sqrt(R()) * 0.9; addCulm(p.x + Math.cos(an) * d, p.z + Math.sin(an) * d, st.days + R() * 2); } thump({ freq: 150 }); world.say('A rhizome set. Sixty days, if you can wait.'); rebuild(); return true; };

  world.onUpdate = (dt, t) => {
    u.uT.value = t; u.uW.value = world.wind * 1.2 + 0.2;
    if (st.auto) { st.days = Math.min(60, st.days + dt * 5); dayCtl.set(st.days); if (st.days >= 60) { st.auto = false; playBtn.textContent = 'Play the season →'; } }
    if (Math.floor(st.days * 4) !== lastBuilt) { lastBuilt = Math.floor(st.days * 4); rebuild(); }
  };

  standardBar(world, $('#bar'), { presets: [[7, 'Dawn'], [12.5, 'Noon'], [17.3, 'Golden']] });
  const dayCtl = slider($('#ctl'), { label: 'Day', min: 0, max: 60, step: 0.1, value: st.days, fmt: (v) => `${Math.floor(v)} of 60`, onInput: (v) => { st.days = v; st.auto = false; } });
  slider($('#ctl'), { label: 'Wind', min: 0, max: 1.6, step: 0.02, value: 0.8, onInput: (v) => { world.wind = v; } });
  const playBtn = $('#btn-play');
  playBtn.addEventListener('click', () => { if (st.days >= 59.5) { st.days = 0; dayCtl.set(0); } st.auto = !st.auto; playBtn.textContent = st.auto ? 'Pause' : 'Play the season →'; });
  $('#btn-gust').addEventListener('click', () => { world.gust = 2; world.say('A gust through the tops.'); setTimeout(() => { world.gust = 0; }, 2400); });

  world.gust = 0;
  await world.loadForest(F, { near: 26, nearInner: 12.5, nearCount: 30, keepOut: (x, z) => Math.hypot(x, z) < 12 });
  world.loadGrass(GM, { paint: (m) => { m.paint('excl', (x, z) => 0.3); for (const c of culms) m.disc('excl', c.x, c.z, 0.5, 1, 0.3); }, zones: [['near', 0.18], ['thicket', 0.7]], palette: { root: 0x3a5a28, mid: 0x6c8c3e, tip: 0xa8b860 } });
  await world.loadCat();
  world.chooseSpec = (spec) => { if (['nodes', 'colors'].includes(spec.id)) world.view('eye'); if (spec.id === 'sheath') { st.days = 12; dayCtl.set(12); } if (spec.id === 'leaves') { st.days = 60; dayCtl.set(60); world.view('up'); } world.say(spec.name); };
  rebuild();
  window.__grove = { world, st, rebuild, culms };
  return world;
}
