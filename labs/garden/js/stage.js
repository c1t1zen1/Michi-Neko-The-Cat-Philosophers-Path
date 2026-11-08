// A small courtyard you listen to: a deer-scarer keeps time, drops ring in a
// buried jar, and a glass chime answers the wind. Turn the water up or down.
import * as THREE from 'three';
import { loadSkyModule, loadFoliageModule, loadGrassModule } from '../../shared/game.js';
import { LabWorld } from '../../shared/world.js';
import { standardBar } from '../../shared/workshop.js';
import { slider, toggle, seg } from '../../shared/ui.js';
import { V3, TAU, rng, rockGeometry, instances } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { clack, drip, bell, Bed } from '../../shared/sound.js';
import { flag, reduceMotion } from '../../shared/stage.js';
import { shishiOdoshi, waterHarp, furin } from './kit.js';

const $ = (s) => document.querySelector(s);
const SCALE = [392, 440, 523.25, 587.33, 659.25, 783.99];   // a pentatonic the jar seems to know

function paintGround(x, res, toPx, r) {
  x.fillStyle = '#4f6b3a'; x.fillRect(0, 0, res, res);
  for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${55 + r() * 40},${85 + r() * 50},${38 + r() * 25},${0.08 + r() * 0.16})`; x.beginPath(); x.ellipse(r() * res, r() * res, 4 + r() * 16, 3 + r() * 10, r() * 3, 0, TAU); x.fill(); }
  const [cx, cy] = toPx(0.5, 0.5);
  const g = x.createRadialGradient(cx, cy, 10, cx, cy, res * 0.34); g.addColorStop(0, 'rgba(190,180,160,.0)'); g.addColorStop(1, 'rgba(70,92,50,0)');
  x.fillStyle = g; x.fillRect(0, 0, res, res);
}

export async function makeGardenStage(lab) {
  const [{ Sky }, F, GM] = await Promise.all([loadSkyModule(), loadFoliageModule(), loadGrassModule()]);
  const P = 11;
  const world = new LabWorld(lab, $('#stage'), {
    SkyClass: Sky, hour: +flag('hour', 16.3), plot: P, res: 1536, paint: paintGround, outer: 0x4a6838, shadowExtent: 12,
    camera: { az: 0.5, el: 0.14, dist: 6.6, focus: [0.3, 0.9, -0.2] }, bounds: { x0: -7.5, x1: 7.5, z0: -7.5, z1: 7.5 }, catStart: { x: -2.6, z: 2.2, heading: 1.6 },
    blocked: (x, z) => Math.hypot(x - 0.6, z - 0.1) < 1.1 || (x > -2.7 && x < 3.2 && z > -3.5 && z < -2.7),
    views: { stage: { label: 'The courtyard', az: 0.5, el: 0.14, dist: 6.6, focus: [0.3, 0.9, -0.2] }, close: { label: 'The tube', az: 0.2, el: 0.08, dist: 3.4, focus: [0.8, 0.6, 0] }, eye: { label: 'Cat-eye', eye: true } }
  });
  const scene = world.scene;

  /* the wall and eave behind */
  {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(11, 2.4, 0.3), M.plaster({ tint: 0xe2d6bd, grime: 0.5, grimeH: 0.9 })); wall.position.set(0, 1.2, -3.2); wall.castShadow = wall.receiveShadow = true; scene.add(wall);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.16, 1.2), M.tile({})); roof.position.set(0, 2.5, -2.72); roof.rotation.x = 0.28; roof.castShadow = true; scene.add(roof);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(11, 0.1, 0.14), M.wood()); beam.position.set(0, 2.32, -2.25); scene.add(beam);
  }

  /* stones and moss */
  {
    const list = [], r = rng(8);
    for (let i = 0; i < 26; i++) { const a = r() * TAU, d = 2.2 + r() * 2.6, s = 0.18 + r() * 0.5; list.push({ x: Math.cos(a) * d, y: s * 0.15, z: Math.sin(a) * d - 0.6, sx: s * 1.1, sy: s * 0.55, sz: s, ry: r() * 6 }); }
    const m = instances(rockGeometry(11, { detail: 4, rough: 0.16 }), M.rock({ moss: 0.85, lichen: 0.4, a: 0x4f4c45, b: 0x8b8578, bump: 0.018 }), list, 'Stones'); m.castShadow = m.receiveShadow = true; scene.add(m);
  }

  /* the instruments */
  const st = { flow: 1, drip: 1, wind: 0.5 };
  const beatEl = $('#beat');
  let lastBeat = 0;
  const shishi = shishiOdoshi({ flow: st.flow, onClack: () => { clack({ vol: 0.62 }); lastBeat = world.t; flash(); } });
  shishi.group.position.set(0.8, 0.02, 0.1); shishi.group.scale.setScalar(1.8);
  shishi.group.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
  scene.add(shishi.group);
  const flash = () => { if (!beatEl) return; beatEl.classList.add('on'); setTimeout(() => beatEl.classList.remove('on'), 180); };

  const harp = waterHarp();
  harp.group.position.set(-3, -0.6, 2.4); harp.group.visible = false; scene.add(harp.group);
  // the surface of the harp: a low stone basin with a slit of gravel beneath
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.14, 24), M.stone({ tint: 0x77726a, moss: 0.5 })); lip.position.set(-3, 0.07, 2.4); lip.castShadow = lip.receiveShadow = true; scene.add(lip);
  const dripDrop = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshStandardMaterial({ color: 0xcfe7ee, roughness: 0.05 })); scene.add(dripDrop);
  const ringR = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.03, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xd8eef2, transparent: true, opacity: 0, side: THREE.DoubleSide })); ringR.position.set(-3, 0.15, 2.4); scene.add(ringR);
  let dropT = 0.2, dropping = false, ringA = 0, noteI = 0;
  const playDrop = () => {
    const n = SCALE[noteI = (noteI + 1 + Math.floor(Math.random() * 2)) % SCALE.length];
    bell(n, { vol: 0.09, dur: 1.8, partials: [1, 2.02, 3.1] }); drip({ vol: 0.1, freq: n * 1.2, jitter: 0.1 });
    ringA = 1;
    flash2();
  };
  const flash2 = () => { const e = $('#harpNote'); if (e) { e.classList.add('on'); setTimeout(() => e.classList.remove('on'), 140); } };

  const chime = furin({ onRing: () => bell(1320 + Math.random() * 60, { vol: 0.12, dur: 1.4, partials: [1, 2.76, 5.4] }) });
  chime.group.position.set(-1.2, 2.2, -2.05); scene.add(chime.group);
  world.addPick(chime.group, () => { chime.strike(); world.say('A small push of air.'); }, 'The furin');
  world.addPick(lip, playDrop, 'A drop in the jar');
  world.addPick(shishi.group, () => { shishi.S.fill = 1; world.say('Tipped by hand. Rude.'); }, 'The deer-scarer');

  const stream = new Bed({ type: 'bandpass', freq: 2400, q: 0.7, max: 0.05 });

  world.onUpdate = (dt, t) => {
    shishi.S.flow = st.flow;
    shishi.update(dt);
    chime.update(dt, st.wind, t);
    world.wind = st.wind * 0.9;
    // a drop every few seconds: it shows, then lands, then rings
    dropT -= dt * st.drip;
    if (dropT < 0 && !dropping) { dropping = true; dripDrop.position.set(-3, 0.75, 2.4); dripDrop.visible = true; }
    if (dropping) { dripDrop.position.y -= dt * 2.4; if (dripDrop.position.y <= 0.15) { dropping = false; dripDrop.visible = false; dropT = 1.8 + Math.random() * 2.4; playDrop(); } }
    if (ringA > 0) { ringA -= dt * 1.4; ringR.material.opacity = Math.max(0, ringA) * 0.8; ringR.scale.setScalar(1 + (1 - ringA) * 18); }
  };

  standardBar(world, $('#bar'), { presets: [[9, 'Morning'], [16.3, 'Afternoon'], [20, 'Evening']] });
  const c = $('#ctl');
  slider(c, { label: 'Water', min: 0.2, max: 2.2, step: 0.02, value: st.flow, fmt: (v) => `${(6.2 / v).toFixed(1)} s a clack`, onInput: (v) => { st.flow = v; stream.set(v * 0.5); } });
  slider(c, { label: 'Drips', min: 0, max: 2.5, step: 0.05, value: st.drip, fmt: (v) => (v < 0.05 ? 'none' : `×${v.toFixed(1)}`), onInput: (v) => { st.drip = v; } });
  slider(c, { label: 'Wind', min: 0, max: 1.4, step: 0.02, value: st.wind, fmt: (v) => (v < 0.05 ? 'still' : v < 0.6 ? 'a breath' : v < 1 ? 'breezy' : 'windy'), onInput: (v) => { st.wind = v; } });
  toggle(c, { label: 'Show the buried jar', value: false, onChange: (b) => { harp.group.visible = b; world.ground.material.transparent = b; world.ground.material.opacity = b ? 0.55 : 1; world.ground.material.needsUpdate = true; world.say(b ? 'A buried jar, upside-down, with a hole at the top.' : ''); } });

  await world.loadForest(F, { near: 20, nearInner: 10.5, nearCount: 20, keepOut: (x, z) => Math.abs(x) < 4 && z > 0 });
  world.loadGrass(GM, { paint: (m) => m.paint('excl', (x, z) => (z < -2.2 ? 1 : 1 - Math.min(1, Math.hypot(x - 0.6, z) / 1.9) * Math.min(1, Math.hypot(x + 3, z - 2.4) / 0.9))), zones: [['mown', 0.05], ['thicket', 0.8]], palette: { root: 0x2f5a26, mid: 0x4f8a3a, tip: 0x88b858 } });
  await world.loadCat();
  world.chooseSpec = (spec) => { if (spec.family === 'shishi') world.view('close'); else if (spec.id === 'harp') { c.querySelector('.tog').click(); world.view('stage'); } world.say(spec.name); };
  window.__garden = { world, st, shishi };
  return world;
}
