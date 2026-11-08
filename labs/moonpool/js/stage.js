// The Moon Pool at night: drop pebbles and the moon breaks up. Float paper
// lanterns from the shore, kindle the bamboo glade, change the moon's phase.
import * as THREE from 'three';
import { loadSkyModule, loadFoliageModule, loadGrassModule } from '../../shared/game.js';
import { LabWorld, blotch } from '../../shared/world.js';
import { standardBar } from '../../shared/workshop.js';
import { slider, toggle, seg } from '../../shared/ui.js';
import { V3, TAU, clamp, sstep, rng, rockGeometry, instances, tube, canvas2d, Bag } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { drip, Bed, bell } from '../../shared/sound.js';
import { flag, reduceMotion } from '../../shared/stage.js';
import { PondWater, moonTexture } from '../../shared/water.js';
import { chochin, floatLantern, washiTexture } from '../../shared/paperlantern.js';
import { gameHidden, padGeometry, padMaterial, lotus, fireflyPoints } from './recipes.js';

const $ = (s) => document.querySelector(s);
const R = 6.4;      // pond radius

function paintGround(x, res, toPx, r) {
  x.fillStyle = '#3e5233'; x.fillRect(0, 0, res, res);
  for (let i = 0; i < 2600; i++) {
    const t = r();
    x.fillStyle = t < 0.5 ? `rgba(${50 + r() * 30},${78 + r() * 34},${38 + r() * 20},${0.08 + r() * 0.14})` : `rgba(${74 + r() * 24},${62 + r() * 18},${40 + r() * 16},${0.06 + r() * 0.1})`;
    x.beginPath(); x.ellipse(r() * res, r() * res, 5 + r() * 24, 3 + r() * 12, r() * 3, 0, TAU); x.fill();
  }
  // the bank: moss darkens toward the waterline
  const c = res / 2, px = res / 30;
  const g = x.createRadialGradient(c, c, (R - 0.3) * px, c, c, (R + 3.2) * px);
  g.addColorStop(0, 'rgba(26,36,20,.95)'); g.addColorStop(0.35, 'rgba(38,58,28,.7)'); g.addColorStop(1, 'rgba(46,70,32,0)');
  x.fillStyle = g; x.beginPath(); x.arc(c, c, (R + 3.2) * px, 0, TAU); x.fill();
}

export async function makeMoonStage(lab) {
  const [{ Sky }, F, GM] = await Promise.all([loadSkyModule(), loadFoliageModule(), loadGrassModule()]);
  const P = 15, waterY = -0.22;
  const hAt = (x, z) => { const d = Math.hypot(x, z); return -0.32 * (1 - sstep(R - 0.2, R + 2.2, d)); };
  const world = new LabWorld(lab, $('#stage'), {
    SkyClass: Sky, hour: +flag('hour', 21.2), plot: P, res: 1536, paint: paintGround, heightAt: hAt, outer: 0x3f5a31, shadowExtent: 18,
    camera: { az: 0.5, el: 0.13, dist: 15, focus: [0, 1.4, 0] }, bounds: { x0: -10.5, x1: 10.5, z0: -10.5, z1: 12 },
    catStart: { x: 1.6, z: R + 1.5, heading: Math.PI },
    blocked: (x, z) => Math.hypot(x, z) < R + 0.15 || lanternPosts.some(([px, pz]) => Math.hypot(px - x, pz - z) < 0.25),
    views: { stage: { label: 'The pool', az: 0.5, el: 0.13, dist: 15, focus: [0, 1.4, 0] }, water: { label: 'At the water', az: 0.3, el: 0.07, dist: 6.4, focus: [0.5, 0.9, 2.2] }, eye: { label: 'Cat-eye', eye: true }, high: { label: 'From above', az: 0.6, el: 1.05, dist: 22, focus: [0, 0, 0] } }
  });
  const scene = world.scene, sky = world.sky, renderer = lab.renderer;
  const water = new PondWater({ renderer, radius: R, res: 256, center: [0, 0], y: waterY, breeze: 0.3 });
  scene.add(water.mesh);
  world.heightAt = hAt;

  /* the moon: drawn here so the phase can change; the sky's own sprite hides */
  sky.moon.visible = false;
  let phase = 0.5;
  const moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTexture(phase), transparent: true, opacity: 0, fog: false, depthWrite: false }));
  moonSprite.scale.setScalar(46); moonSprite.renderOrder = -500; scene.add(moonSprite);
  // low, behind the pool from the main view: water only mirrors the low sky
  const moonDir = new THREE.Vector3(-Math.sin(0.5), 0.2, -Math.cos(0.5)).normalize();
  const haloS = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonSprite.material.map.clone(), color: 0x9fb7e8, transparent: true, opacity: 0, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  haloS.scale.setScalar(140); haloS.renderOrder = -501; scene.add(haloS);

  /* rocks round the shore, in a few shapes */
  {
    const shapes = [1, 2, 3].map((s) => rockGeometry(s + 40, { detail: 4, rough: 0.18, ridge: 0.06 }));
    const r = rng(23), lists = [[], [], []];
    for (let i = 0; i < 66; i++) {
      const a = i / 66 * TAU + (r() - 0.5) * 0.05, gap = Math.abs(((a - 1.3 + Math.PI * 3) % TAU) - Math.PI) < 0.3;   // a little beach for the dock
      if (gap) continue;
      const d = R + (r() - 0.35) * 0.45, s = 0.28 + r() * 0.62, x = Math.cos(a) * d, z = Math.sin(a) * d;
      lists[i % 3].push({ x, y: hAt(x, z) + s * 0.15, z, sx: s * 1.15, sy: s * (0.55 + r() * 0.3), sz: s, ry: r() * 6 });
    }
    lists.forEach((list, i) => { const m = instances(shapes[i], M.rock({ a: 0x4f4c45, b: 0x8b8578, moss: 0.65, lichen: 0.3, bump: 0.018 }), list, 'Shore rocks'); m.castShadow = m.receiveShadow = true; scene.add(m); });
  }

  /* pads and lotus */
  const padM = padMaterial(), padG = padGeometry(0.32, 40, 0.05);
  const pads = [], r0 = rng(77);
  const clusters = [[2.8, -2.2, 7], [-3.0, 2.6, 8], [-1.0, -3.8, 5], [3.3, 2.2, 4]];
  for (const [cx, cz, n] of clusters) for (let i = 0; i < n; i++) {
    const a = r0() * TAU, d = r0() * 1.1, s = 0.8 + r0() * 1.1;
    pads.push({ x: cx + Math.cos(a) * d, z: cz + Math.sin(a) * d, s, ry: r0() * TAU, ph: r0() * 6 });
  }
  const padMesh = new THREE.InstancedMesh(padG, padM, pads.length);
  padMesh.castShadow = false; padMesh.receiveShadow = true; padMesh.frustumCulled = false; scene.add(padMesh);
  const blooms = [];
  for (const [cx, cz] of [[2.5, -2.5], [-3.3, 2.4], [-0.8, -3.5]]) { const b = lotus({ THREE, M, TAU }); b.position.set(cx, waterY + 0.1, cz); b.scale.setScalar(1.3); scene.add(b); blooms.push(b); }

  /* the paper lanterns of the glade, strung between bamboo poles */
  const lanternPosts = [];
  const lamps = [];
  const bamboo = M.bamboo({ color: 0x6f9a4a });
  {
    const arc = [-2.5, -1.9, -1.3, -0.7];
    const tex = washiTexture({ ribs: 15 });
    arc.forEach((a0, i) => {
      if (i === arc.length - 1) return;
      const a1 = arc[i + 1];
      for (const a of [a0, a1]) {
        const x = Math.cos(a) * (R + 3.0), z = Math.sin(a) * (R + 3.0);
        if (!lanternPosts.some(([px, pz]) => Math.hypot(px - x, pz - z) < 0.1)) { lanternPosts.push([x, z]); const p = new THREE.Mesh(tube([V3(x, 0, z), V3(x + 0.02, 3.4, z - 0.02)], (t) => 0.06 * (1 - t * 0.3), { radial: 9 }), bamboo); p.castShadow = true; scene.add(p); }
      }
      const ax = Math.cos(a0) * (R + 3), az = Math.sin(a0) * (R + 3), bx = Math.cos(a1) * (R + 3), bz = Math.sin(a1) * (R + 3);
      const n = 5;
      for (let j = 0; j < n; j++) {
        const t = (j + 0.5) / n, y = 3.25 - 0.55 * (1 - Math.pow(2 * t - 1, 2)), lx = ax + (bx - ax) * t, lz = az + (bz - az) * t;
        const l = chochin({ h: 0.5, belly: 0.18, glow: 0, tex, cord: 0.32 });
        l.position.set(lx, y - 0.32, lz); scene.add(l);
        const glow = world.addGlow(V3(lx, y - 0.32, lz), { size: 1.7, intensity: 3, distance: 6, on: false });
        lamps.push({ g: l, mat: l.userData.mat, onset: ((lamps.length * 0.618) % 1) * 0.7, glow, ph: lamps.length, base: y - 0.32, on: 0 });
      }
    });
  }

  /* floating lanterns from the little beach */
  const floats = [];
  const dock = V3(Math.cos(1.3) * (R - 0.5), waterY, Math.sin(1.3) * (R - 0.5));
  function launch(x, z) {
    if (floats.length >= 16) { const old = floats.shift(); scene.remove(old.g); old.glow.g.spr.visible = false; }
    const g = floatLantern({ glow: 1.5, tint: [0xfff0dc, 0xffe6d0, 0xf6e7ff][floats.length % 3] });
    g.position.set(x, waterY + 0.02, z); g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
    scene.add(g);
    const glow = world.addGlow(V3(x, waterY + 0.28, z), { size: 1.4, light: false });
    glow.g.spr.material.depthTest = true;
    floats.push({ g, glow, vx: (r0() - 0.5) * 0.4, vz: -0.25 - r0() * 0.2, spin: (r0() - 0.5) * 0.5, ph: r0() * 6 });
    water.drop(x, z, 0.06, 3);
    world.say('Off it goes.');
    drip({ vol: 0.12, freq: 700, jitter: 0.1 });
  }

  /* interaction: throw a pebble, or draw a finger through the water */
  const onWater = (p) => p && Math.hypot(p.x, p.z) < R - 0.05;
  const waterPoint = (e) => world._ray(e).ray.intersectPlane(new THREE.Plane(V3(0, 1, 0), -waterY), V3());
  let lastDrag = 0;
  world.onGround = (p, e) => { const w = waterPoint(e); if (onWater(w)) { pebble(w.x, w.z); return true; } return false; };
  world.onDragStart = (e) => onWater(waterPoint(e));
  world.onDrag = (e) => { const w = waterPoint(e); if (onWater(w) && world.t - lastDrag > 0.03) { lastDrag = world.t; water.drop(w.x, w.z, 0.03, 2); } };
  world.addPick(padMesh, (h, e) => { const w = waterPoint(e); if (w) water.drop(w.x, w.z, 0.05, 3); world.say('Water lily: leaves flat, and a notch.'); }, 'A lily pad');
  const pebbleM = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), M.plain(0x6a6660, { rough: 0.9 }));
  pebbleM.visible = false; scene.add(pebbleM);
  let flying = null;
  function pebble(x, z) {
    flying = { x0: world.camera.position.x * 0.5, y0: 2.4, z0: world.camera.position.z * 0.5, x, z, t: 0 };
    pebbleM.visible = true;
  }
  let rain = 0, rainClock = 0;
  const bed = new Bed({ type: 'bandpass', freq: 1400, q: 0.5, brown: false, max: 0.14 });

  world.onUpdate = (dt, t) => {
    if (flying) {
      flying.t += dt * 2.2;
      const f = Math.min(1, flying.t), y = flying.y0 + (waterY - flying.y0) * f + Math.sin(f * Math.PI) * 1.6;
      pebbleM.position.set(flying.x0 + (flying.x - flying.x0) * f, y, flying.z0 + (flying.z - flying.z0) * f);
      if (f >= 1) { water.drop(flying.x, flying.z, 0.18, 4); drip({ vol: 0.22 }); pebbleM.visible = false; flying = null; }
    }
    if (rain > 0 && (rainClock -= dt) < 0) { rainClock = 0.04 / Math.max(0.1, rain); const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * R; water.drop(Math.cos(a) * d, Math.sin(a) * d, 0.05 * Math.max(0.5, rain), 2); if (Math.random() < 0.1) drip({ vol: 0.05 }); }
    water.update(dt, t);
    water.feed(sky, moonDir);
    // moon rises opposite the sun; the sky's own motion gives it its arc
    // the moon climbs as the night goes on
    const nh = clamp((world.hour - 20) / 3.5, 0, 1); moonDir.set(-Math.sin(0.5), 0.14 + nh * 0.34, -Math.cos(0.5)).normalize();
    moonSprite.position.copy(moonDir).multiplyScalar(620);
    haloS.position.copy(moonDir).multiplyScalar(630);
    moonSprite.material.opacity = clamp(-sky.sunDir.y * 8, 0, 1);
    haloS.material.opacity = moonSprite.material.opacity * 0.3;
    // pads bob and turn on the surface
    const o = new THREE.Object3D();
    pads.forEach((p, i) => {
      const h = water.sample(p.x, p.z), s = water.slope(p.x, p.z);
      o.position.set(p.x, waterY + 0.015 + h * 0.5 + Math.sin(t * 0.8 + p.ph) * 0.004, p.z);
      o.rotation.set(s[1] * 0.5, p.ry + Math.sin(t * 0.2 + p.ph) * 0.05, -s[0] * 0.5);
      o.scale.setScalar(p.s); o.updateMatrix(); padMesh.setMatrixAt(i, o.matrix);
    });
    padMesh.instanceMatrix.needsUpdate = true;
    for (const f of floats) {
      f.g.position.x += f.vx * dt; f.g.position.z += f.vz * dt;
      f.vx *= 1 - dt * 0.05; f.vz *= 1 - dt * 0.05;
      const dd = Math.hypot(f.g.position.x, f.g.position.z);
      if (dd > R - 0.6) { const nx = f.g.position.x / dd, nz = f.g.position.z / dd; f.vx -= nx * 0.4 * dt; f.vz -= nz * 0.4 * dt; }
      f.g.position.y = waterY + 0.02 + water.sample(f.g.position.x, f.g.position.z) * 0.9 + Math.sin(t * 1.3 + f.ph) * 0.008;
      f.g.rotation.y += f.spin * dt;
      f.g.rotation.x = Math.sin(t + f.ph) * 0.02;
      f.glow.g.spr.position.set(f.g.position.x, f.g.position.y + 0.26, f.g.position.z);
    }
    // kindle: lanterns take turns as the light goes
    const dark = clamp((-sky.sunDir.y + 0.03) * 7, 0, 1);
    for (const l of lamps) {
      const want = kindled && dark > l.onset ? 1 : 0;
      l.on += (want - l.on) * Math.min(1, dt * 1.4);
      l.mat.userData.u.uGlow.value = l.on * (1.5 + (reduceMotion ? 0 : Math.sin(t * 7 + l.ph) * 0.1));
      l.glow.set(want);
      l.g.rotation.z = Math.sin(t * 0.9 + l.ph) * 0.02;
    }
    // fireflies drift about after dark
    {
      const a = flies.geometry.attributes.position, base = flies.userData.base, ph = flies.userData.phase;
      for (let i = 0; i < a.count; i++) { const f = ph[i]; a.setXYZ(i, base[i * 3] + Math.sin(t * 0.4 + f) * 0.7, base[i * 3 + 1] + Math.sin(t * 0.7 + f * 2) * 0.3, base[i * 3 + 2] + Math.cos(t * 0.35 + f) * 0.7); }
      a.needsUpdate = true;
      flies.material.opacity = dark * (0.65 + Math.sin(t * 2.2) * 0.25);
    }
    if (world.active) water.reflect(renderer, scene, world.camera);
  };
  let kindled = true;

  const flies = fireflyPoints(60, 26);
  flies.position.y = 0.3; scene.add(flies);
  flies.material.size = 0.16;
  flies.userData.base = flies.geometry.attributes.position.array.slice();

  /* the game's pool for comparison, scaled up to this one */
  const hidden = gameHidden();
  const orig = hidden.poolGroup;
  hidden.poolWaterMat.opacity = 1; orig.position.set(0, waterY - 0.05, 0); orig.scale.setScalar(R / 3); orig.visible = false; scene.add(orig);
  const compare = (on) => world.setCompare(on, (side) => { orig.visible = side === 0; water.mesh.visible = side === 1; padMesh.visible = side === 1; blooms.forEach((b) => { b.visible = side === 1; }); }, ['The game’s pool', 'The new pool']);

  /* controls */
  standardBar(world, $('#bar'), { presets: [[17, 'Late sun'], [19.3, 'Dusk'], [21.2, 'Moonrise'], [23.5, 'Deep night']] });
  const c = $('#ctl');
  slider(c, { label: 'Moon', min: 0.02, max: 0.98, step: 0.01, value: phase, fmt: (v) => ['new', 'crescent', 'first quarter', 'gibbous', 'full', 'gibbous', 'last quarter', 'crescent', 'new'][Math.round(v * 8)], onInput: (v) => { phase = v; moonSprite.material.map.dispose(); moonSprite.material.map = moonTexture(v); moonSprite.material.needsUpdate = true; haloS.material.opacity = 0.3; } });
  slider(c, { label: 'Breeze', min: 0, max: 1.2, step: 0.02, value: 0.3, onInput: (v) => { water.U.uBreeze.value = v; world.wind = v * 0.9; } });
  slider(c, { label: 'Rain', min: 0, max: 1, step: 0.01, value: 0, fmt: (v) => (v < 0.02 ? 'none' : Math.round(v * 100) + '%'), onInput: (v) => { rain = v; bed.set(v); } });
  $('#btn-float').addEventListener('click', () => { for (let i = 0; i < 3; i++) setTimeout(() => launch(dock.x + (r0() - 0.5) * 0.8, dock.z + (r0() - 0.5) * 0.4), i * 160); });
  $('#btn-kindle').addEventListener('click', () => { kindled = !kindled; $('#btn-kindle').textContent = kindled ? 'Put out the glade' : 'Light the glade'; bell(1500, { vol: 0.08, dur: 0.4, partials: [1, 2.6] }); });
  $('#btn-pebbles').addEventListener('click', () => { for (let i = 0; i < 10; i++) setTimeout(() => { const a = r0() * TAU, d = Math.sqrt(r0()) * (R - 0.4); pebble(Math.cos(a) * d, Math.sin(a) * d); }, i * 240); });
  let cmp = false; const cb = $('#btn-compare');
  cb.addEventListener('click', () => { cmp = !cmp; compare(cmp); cb.textContent = cmp ? 'Stop comparing' : 'Compare with the game'; cb.setAttribute('aria-pressed', cmp); });

  world.chooseSpec = (spec) => {
    const map = { 'game-water': () => { if (!cmp) cb.click(); }, sim: () => world.view('water'), 'moon-disc': () => world.view('water'), glitter: () => { c.querySelector('input')?.focus(); world.view('water'); }, chochin: () => world.view('stage'), float: () => $('#btn-float').click() };
    map[spec.id]?.();
    world.say(spec.name);
  };

  await world.loadForest(F, { near: 30, nearInner: 13, nearCount: 30, keepOut: (x, z) => { const a = Math.abs(((Math.atan2(x, z) - 0.5 + Math.PI * 3) % TAU) - Math.PI); const d = Math.hypot(x, z), facing = Math.abs(((Math.atan2(-x, -z) - 0.5 + Math.PI * 3) % TAU) - Math.PI); return (d < 26 && a < 0.6) || (d > 16 && facing < 0.38); } });
  world.loadGrass(GM, { paint: (m) => { m.paint('excl', (x, z) => 1 - sstep(R + 0.1, R + 1.5, Math.hypot(x, z))); }, zones: [['near', 0.14], ['thicket', 0.6]], palette: { root: 0x274a26, mid: 0x4a7a38, tip: 0x8cb65a } });
  water.hide = [...(world.grass?.meshes || [])];
  await world.loadCat();
  world.cat.heading = Math.PI;
  window.__moon = { world, water };
  return world;
}
