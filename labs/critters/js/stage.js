// Feed the koi and they come; run at the sparrows and they scatter; plant a
// flower and a butterfly finds it.
import * as THREE from 'three';
import { loadSkyModule, loadFoliageModule, loadGrassModule } from '../../shared/game.js';
import { LabWorld } from '../../shared/world.js';
import { standardBar } from '../../shared/workshop.js';
import { slider, seg } from '../../shared/ui.js';
import { V3, TAU, rng, sstep, clamp, instances, rockGeometry } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { drip, bell, thump } from '../../shared/sound.js';
import { flag } from '../../shared/stage.js';
import { PondWater } from '../../shared/water.js';
import { KOI_KINDS, koiTexture, koiGeometry, koiMaterial, sparrowGeo, wingGeo, butterfly } from './kit.js';

const $ = (s) => document.querySelector(s);
const R = 6.2;

export async function makeCritterStage(lab) {
  const [{ Sky }, F, GM] = await Promise.all([loadSkyModule(), loadFoliageModule(), loadGrassModule()]);
  const P = 16, waterY = -0.2, r0 = rng(31);
  const hAt = (x, z) => { const d = Math.hypot(x, z); return -0.34 * (1 - sstep(R - 0.2, R + 2, d)) - 0.7 * (1 - sstep(R - 0.8, R - 0.1, d)); };
  const world = new LabWorld(lab, $('#stage'), {
    SkyClass: Sky, hour: +flag('hour', 11.5), plot: P, res: 1536, outer: 0x5a7a44, heightAt: hAt, shadowExtent: 17,
    paint: (x, res, toPx, r) => { x.fillStyle = '#5e7a44'; x.fillRect(0, 0, res, res); const c = res / 2, px = res / 32; const g = x.createRadialGradient(c, c, R * px, c, c, (R + 2.5) * px); g.addColorStop(0, 'rgba(46,60,32,.9)'); g.addColorStop(1, 'rgba(46,60,32,0)'); x.fillStyle = g; x.fillRect(0, 0, res, res); },
    camera: { az: 0.42, el: 0.46, dist: 11.5, focus: [0, -0.1, 0.4] }, bounds: { x0: -12, x1: 12, z0: -12, z1: 13 }, catStart: { x: 1.2, z: R + 1.6, heading: Math.PI },
    blocked: (x, z) => Math.hypot(x, z) < R + 0.05,
    views: { stage: { label: 'The pond', az: 0.42, el: 0.46, dist: 11.5, focus: [0, -0.1, 0.4] }, water: { label: 'At the water', az: 0.3, el: 0.6, dist: 5, focus: [0.5, -0.1, 1.5] }, eye: { label: 'Cat-eye', eye: true }, high: { label: 'From above', az: 0.6, el: 1.25, dist: 19, focus: [0, 0, 0] } }
  });
  const scene = world.scene, sky = world.sky;
  const water = new PondWater({ renderer: lab.renderer, radius: R, res: 256, y: waterY, breeze: 0.14, opacity: 0.3, shallow: 0x2f5560, deep: 0x123038 }); scene.add(water.mesh);
  const bed = new THREE.Mesh(new THREE.CircleGeometry(R + 0.2, 64).rotateX(-Math.PI / 2), M.plain(0x2a3a30, { rough: 1, brush: 0.2, dab: 3 })); bed.position.y = waterY - 0.46; scene.add(bed);
  {
    const list = [], geo = rockGeometry(9, { detail: 4, rough: 0.16 });
    for (let i = 0; i < 70; i++) { const a = i / 70 * TAU + r0() * 0.06, d = R + (r0() - 0.3) * 0.5, s = 0.28 + r0() * 0.5, x = Math.cos(a) * d, z = Math.sin(a) * d; list.push({ x, y: hAt(x, z) + s * 0.12, z, sx: s * 1.15, sy: s * 0.55, sz: s, ry: r0() * 6 }); }
    const m = instances(geo, M.rock({ moss: 0.6, a: 0x54504a, b: 0x8e887c, lichen: 0.3, bump: 0.02 }), list, 'Rocks'); m.castShadow = m.receiveShadow = true; scene.add(m);
  }
  /* koi */
  const uT = { value: 0 }, kinds = Object.keys(KOI_KINDS), N = 34;
  const koi = [];
  const meshes = kinds.map((k) => { const g = koiGeometry(); const n = Math.ceil(N / kinds.length); const a = new THREE.InstancedBufferAttribute(new Float32Array(n * 2), 2); g.setAttribute('aKoi', a); const m = new THREE.InstancedMesh(g, koiMaterial(koiTexture(k, kinds.indexOf(k) + 2), uT), n); m.count = 0; m.frustumCulled = false; m.castShadow = false; scene.add(m); return { m, a, count: 0, n }; });
  for (let i = 0; i < N; i++) { const mk = meshes[i % kinds.length], id = mk.count++; const a = r0() * TAU, d = Math.sqrt(r0()) * (R - 0.8); koi.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, vx: Math.cos(a) * 0.3, vz: Math.sin(a) * 0.3, y: -0.4 - r0() * 0.15, kind: i % kinds.length, s: 0.75 + r0() * 0.5, ph: r0() * 6, id, mk }); }
  meshes.forEach((m) => { m.m.count = m.count; });

  let food = null, foodT = 0, pellets = [];
  const pelletM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 6, 5), M.plain(0xc8a35c, { rough: 0.9 }), 30); pelletM.count = 0; pelletM.frustumCulled = false; scene.add(pelletM);
  const feed = (x, z) => { food = { x, z }; foodT = 10; for (let i = 0; i < 9; i++) { pellets.push({ x: x + (r0() - 0.5) * 0.9, z: z + (r0() - 0.5) * 0.9, a: r0() * 6, t: 8 + r0() * 3 }); } drip({ vol: 0.14 }); water.drop(x, z, 0.08, 3); world.say('Here they come.'); };
  const onWater = (p) => p && Math.hypot(p.x, p.z) < R - 0.1;
  const wp = (e) => world._ray(e).ray.intersectPlane(new THREE.Plane(V3(0, 1, 0), -waterY), V3());
  world.onGround = (p, e) => {
    const w = wp(e); if (onWater(w)) { feed(w.x, w.z); return true; }
    if (Math.hypot(p.x, p.z) > R + 0.6) { planted.push({ x: p.x, z: p.z, t: 1 }); flowerAdd(p.x, p.z); world.say('A flower. Somebody will come.'); thump({ vol: 0.14 }); return true; }
    return false;
  };

  /* sparrows */
  const birdN = 18;
  const bodyM = M.plain(0x6a5444, { rough: 0.8 }), wingM = M.plain(0x54402f, { side: THREE.DoubleSide, rough: 0.8 });
  const bBody = new THREE.InstancedMesh(sparrowGeo(), bodyM, birdN), bL = new THREE.InstancedMesh(wingGeo(), wingM, birdN), bR = new THREE.InstancedMesh(wingGeo(), wingM, birdN);
  for (const m of [bBody, bL, bR]) { m.frustumCulled = false; m.castShadow = true; scene.add(m); }
  const birds = []; const perches = []; for (let i = 0; i < birdN; i++) { const a = -0.8 + i * 0.1, d = 12; perches.push(V3(Math.cos(a) * d, 2 + Math.sin(i * 1.3) * 0.15, Math.sin(a) * d)); birds.push({ p: perches[i].clone(), v: V3(), state: 'perch', t: 2 + r0() * 3, ph: r0() * 6 }); }
  // a low wall for them to sit on, along an arc of the far side
  { const wall = M.plaster({ tint: 0xe2d6bd, grime: 0.5, grimeH: 1 }); for (let i = 0; i < 10; i++) { const a = -0.9 + i * 0.2, x = Math.cos(a) * 12.2, z = Math.sin(a) * 12.2; const m = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.95, 0.3), wall); m.position.set(x, 0.98, z); m.rotation.y = -a + Math.PI / 2; m.castShadow = m.receiveShadow = true; scene.add(m); } }
  /* butterflies */
  const flutters = [], planted = [], flowerPts = [];
  for (let i = 0; i < 40; i++) { const a = r0() * TAU, d = R + 2 + r0() * 6; flowerPts.push({ x: Math.cos(a) * d, z: Math.sin(a) * d }); }
  const flowerGeo = new THREE.SphereGeometry(0.06, 8, 6).scale(1, 0.4, 1);
  const flowers = new THREE.InstancedMesh(flowerGeo, M.plain(0xf0cfe0, { rough: 0.5 }), 60); flowers.frustumCulled = false; scene.add(flowers);
  const fo = new THREE.Object3D();
  const flowerAdd = (x, z) => { flowerPts.push({ x, z }); const i = flowers.count++ ; flowers.count = Math.min(flowers.count, 60); fo.position.set(x, 0.3 + r0() * 0.1, z); fo.rotation.set(0, r0() * 6, 0); fo.scale.setScalar(1); fo.updateMatrix(); flowers.setMatrixAt(flowers.count - 1, fo.matrix); flowers.instanceMatrix.needsUpdate = true; };
  flowers.count = 0; for (let i = 0; i < 40; i++) { const f = flowerPts[i]; flowers.count++; fo.position.set(f.x, 0.3 + r0() * 0.2, f.z); fo.rotation.set(0, r0() * 6, 0); fo.updateMatrix(); flowers.setMatrixAt(i, fo.matrix); } flowers.instanceMatrix.needsUpdate = true;
  const hues = ['#f0b42a', '#e7734a', '#6aa8df', '#f4e7a0'];
  for (let i = 0; i < 14; i++) { const b = butterfly(hues[i % 4], i + 2); b.scale.setScalar(1.15); const f = flowerPts[Math.floor(r0() * flowerPts.length)]; b.position.set(f.x, 0.9 + r0() * 1.4, f.z); scene.add(b); flutters.push({ b, t: V3(f.x, 0.8, f.z), rest: 0, ph: r0() * 6, sp: 0.9 + r0() * 0.7, h: f }); }

  const O = new THREE.Object3D();
  world.onUpdate = (dt, t) => {
    uT.value = t;
    water.update(dt, t); water.feed(sky, new THREE.Vector3(0.5, 0.7, -0.5).normalize()); if (world.active) water.reflect(lab.renderer, scene, world.camera);
    // koi: separation, alignment, cohesion and a wall; food when there is some
    foodT -= dt; if (foodT <= 0) food = null;
    for (const a of koi) {
      let sx = 0, sz = 0, ax = 0, az = 0, cx = 0, cz = 0, n = 0;
      for (const b of koi) { if (a === b) continue; const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz); if (d < 1.1) { n++; ax += b.vx; az += b.vz; cx += b.x; cz += b.z; if (d < 0.8) { sx -= dx / (d || 0.1) * (0.8 - d); sz -= dz / (d || 0.1) * (0.8 - d); } } }
      let fx = sx * 3.2, fz = sz * 3.2;
      if (n) { fx += (ax / n - a.vx) * 0.5 + (cx / n - a.x) * 0.2; fz += (az / n - a.vz) * 0.5 + (cz / n - a.z) * 0.2; }
      const dr = Math.hypot(a.x, a.z); if (dr > R - 1.6) { fx -= a.x / dr * (dr - (R - 1.6)) * 3; fz -= a.z / dr * (dr - (R - 1.6)) * 3; }
      if (food) { const dx = food.x - a.x, dz = food.z - a.z, d = Math.hypot(dx, dz), pull = d > 0.9 ? 1.5 : d * 0.4; fx += dx / (d || 1) * pull; fz += dz / (d || 1) * pull; }
      const wander = Math.sin(t * 0.3 + a.ph) * 0.4; fx += Math.cos(a.ph + t * 0.12) * wander; fz += Math.sin(a.ph + t * 0.12) * wander;
      a.vx += fx * dt; a.vz += fz * dt;
      const sp = Math.hypot(a.vx, a.vz), max = food ? 1.3 : 0.55; if (sp > max) { a.vx *= max / sp; a.vz *= max / sp; }
      a.x += a.vx * dt; a.z += a.vz * dt;
      const speed = Math.hypot(a.vx, a.vz);
      a.y += ((food && Math.hypot(a.x - food.x, a.z - food.z) < 1.1 ? -0.22 : -0.42 + Math.sin(t * 0.4 + a.ph) * 0.05) - a.y) * Math.min(1, dt * 1.5);
      O.position.set(a.x, a.y + waterY, a.z); O.rotation.set(0, Math.atan2(a.vx, a.vz), 0); O.scale.setScalar(a.s); O.updateMatrix(); a.mk.m.setMatrixAt(a.id, O.matrix); a.mk.a.setXY(a.id, 4 + speed * 8, a.ph);
    }
    for (const mk of meshes) { mk.m.instanceMatrix.needsUpdate = true; mk.a.needsUpdate = true; }
    // food on the surface, slowly eaten
    pelletM.count = Math.min(30, pellets.length);
    pellets = pellets.filter((p) => (p.t -= dt) > 0);
    pellets.slice(0, 30).forEach((p, i) => { p.x += Math.sin(t + p.a) * 0.002; O.position.set(p.x, waterY + 0.01 + water.sample(p.x, p.z) * 0.8, p.z); O.rotation.set(0, 0, 0); O.scale.setScalar(1); O.updateMatrix(); pelletM.setMatrixAt(i, O.matrix); });
    pelletM.instanceMatrix.needsUpdate = true;
    // sparrows
    const catP = world.cat?.pos, sprint = world.cat?.sprintNow;
    birds.forEach((b, i) => {
      if (b.state === 'perch') { b.p.lerp(perches[i], 1 - Math.exp(-dt * 6)); b.t -= dt; if (catP && sprint && Math.hypot(catP.x - b.p.x, catP.y - b.p.z) < 5.5) { b.state = 'fly'; b.t = 6 + Math.random() * 4; b.v.set((Math.random() - 0.5) * 2, 2.6 + Math.random(), (Math.random() - 0.5) * 2); bell(3000 + i * 40, { vol: 0.02, dur: 0.1, partials: [1] }); } if (b.t < 0 && Math.random() < dt * 0.25) { b.state = 'fly'; b.t = 3 + Math.random() * 3; b.v.set((Math.random() - 0.5) * 2, 1.8, (Math.random() - 0.5) * 2); } }
      else { b.t -= dt; b.v.x += Math.sin(t * 1.3 + b.ph) * dt * 2; b.v.z += Math.cos(t * 1.1 + b.ph) * dt * 2; b.v.y += (5 - b.p.y) * dt * 0.8; b.v.multiplyScalar(1 - dt * 0.4); if (b.t < 0) { const dx = perches[i].x - b.p.x, dz = perches[i].z - b.p.z, dy = perches[i].y - b.p.y, d = Math.hypot(dx, dy, dz); b.v.addScaledVector(V3(dx, dy, dz), dt * 3 / (d || 1)); if (d < 0.2) b.state = 'perch'; b.t = 1 + Math.random() * 3; } b.p.addScaledVector(b.v, dt); }
      const fly = b.state === 'fly', flap = fly ? Math.sin(t * 22 + b.ph) * 0.9 : Math.sin(t * 2.2 + b.ph) * 0.05;
      O.position.copy(b.p); O.rotation.set(0, b.state === 'fly' ? Math.atan2(b.v.x, b.v.z) : 1.2, 0); O.scale.setScalar(1.3); O.updateMatrix(); bBody.setMatrixAt(i, O.matrix);
      O.rotation.z = flap; O.updateMatrix(); bL.setMatrixAt(i, O.matrix);
      O.rotation.z = -flap; O.scale.x = -1.3; O.updateMatrix(); bR.setMatrixAt(i, O.matrix); O.scale.x = 1.3;
    });
    bBody.instanceMatrix.needsUpdate = true; bL.instanceMatrix.needsUpdate = true; bR.instanceMatrix.needsUpdate = true;
    // butterflies
    for (const f of flutters) {
      f.rest -= dt;
      const b = f.b, dir = f.t.clone().sub(b.position), d = dir.length();
      if (d > 0.15 && f.rest <= 0) { dir.normalize(); b.position.addScaledVector(dir, dt * f.sp); b.position.y += Math.sin(t * 8 + f.ph) * dt * 0.8; b.rotation.y = Math.atan2(dir.x, dir.z); }
      else if (f.rest <= 0) { f.rest = 2 + Math.random() * 4; }
      if (f.rest > -1 && f.rest <= 0 && d <= 0.15) { const nf = flowerPts[Math.floor(Math.random() * flowerPts.length)]; f.h = nf; f.t.set(nf.x, 0.45 + Math.random() * 0.5, nf.z); }
      const flap = f.rest > 0 ? 0.7 + Math.sin(t * 1.8 + f.ph) * 0.15 : Math.pow(Math.abs(Math.sin(t * 13 + f.ph)), 0.7) * 1.2;
      b.userData.wings[0].rotation.z = flap; b.userData.wings[1].rotation.z = -flap;
    }
  };

  standardBar(world, $('#bar'), { presets: [[8, 'Morning'], [11.5, 'Noon'], [17.5, 'Golden']] });
  $('#btn-feed').addEventListener('click', () => { const a = r0() * TAU, d = r0() * (R - 1.4); feed(Math.cos(a) * d, Math.sin(a) * d); });
  $('#btn-scare').addEventListener('click', () => { for (const b of birds) { b.state = 'fly'; b.t = 6 + Math.random() * 4; b.v.set((Math.random() - 0.5) * 3, 3 + Math.random(), (Math.random() - 0.5) * 3); } world.say('Off they go.'); });

  await world.loadForest(F, { near: 26, nearInner: 13.5, nearCount: 26, keepOut: (x, z) => z > 7 && Math.abs(x) < 8 });
  world.loadGrass(GM, { paint: (m) => { m.paint('excl', (x, z) => 1 - sstep(R + 0.1, R + 1.3, Math.hypot(x, z))); m.paint('flower', (x, z) => (Math.sin(x * 0.5) * Math.cos(z * 0.6) > 0.1 ? 0.6 : 0.25)); }, zones: [['near', 0.14], ['flowers', 0.3], ['thicket', 0.6]], palette: { root: 0x3f6a2e, mid: 0x78a84a, tip: 0xc0d86a } });
  water.hide = [...(world.grass?.meshes || []), bed];
  await world.loadCat();
  world.chooseSpec = (spec) => { if (KOI_KINDS[spec.id]) world.view('water'); world.say(spec.name); };
  window.__crit = { world, water };
  return world;
}
