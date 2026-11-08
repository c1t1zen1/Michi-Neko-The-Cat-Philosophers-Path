// A forest floor in shade, lit only by coins. Each is a picture of the sun, so
// when the moon crosses, every one of them turns into a crescent at once.
import * as THREE from 'three';
import { loadSkyModule, loadFoliageModule, loadGrassModule } from '../../shared/game.js';
import { LabWorld } from '../../shared/world.js';
import { standardBar } from '../../shared/workshop.js';
import { slider } from '../../shared/ui.js';
import { V3, TAU, rng, sstep, instances, merge } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { flag } from '../../shared/stage.js';
import { makeCoins } from './kit.js';

const $ = (s) => document.querySelector(s);

export async function makeKomorebiStage(lab) {
  const [{ Sky }, F, GM] = await Promise.all([loadSkyModule(), loadFoliageModule(), loadGrassModule()]);
  const P = 13;
  const world = new LabWorld(lab, $('#stage'), {
    SkyClass: Sky, hour: +flag('hour', 13.2), plot: P, res: 1024, outer: 0x3a4e2e, shadowExtent: 15, sunGain: 0.28, ambient: 0.9, paintMix: 0.5,
    paint: (x, res) => { x.fillStyle = '#39452a'; x.fillRect(0, 0, res, res); const r = rng(6); for (let i = 0; i < 5000; i++) { const t = r(); x.fillStyle = t < 0.55 ? `rgba(${58 + r() * 30},${74 + r() * 34},${36 + r() * 20},${0.1 + r() * 0.18})` : `rgba(${84 + r() * 40},${66 + r() * 30},${40 + r() * 18},${0.1 + r() * 0.14})`; x.beginPath(); x.ellipse(r() * res, r() * res, 2 + r() * 9, 1 + r() * 4, r() * 3, 0, TAU); x.fill(); } },
    camera: { az: 0.5, el: 0.34, dist: 9, focus: [0, 0.3, 0] }, bounds: { x0: -10, x1: 10, z0: -10, z1: 10 }, catStart: { x: 2, z: 3, heading: -2.5 },
    views: { stage: { label: 'The floor', az: 0.5, el: 0.34, dist: 9, focus: [0, 0.3, 0] }, low: { label: 'Low', az: 0.35, el: 0.08, dist: 5, focus: [1, 0.4, 1] }, eye: { label: 'Cat-eye', eye: true }, up: { label: 'Look up', az: 0.5, el: -0.45, dist: 3, focus: [0, 2.5, 0] } }
  });
  const scene = world.scene, st = { open: 0.75, eclipse: 0, moonAng: 2.4, sharp: 0.12, wind: 0.6 };
  const coins = makeCoins({ count: 2600, spread: 10.5, heightMin: 3, heightMax: 11 });
  scene.add(coins.mesh);
  world.onUpdate = (dt, t) => { coins.feed(world.sky, t, st.wind); coins.U.uOpen.value = st.open; coins.U.uEclipse.value = st.eclipse; coins.U.uMoonAng.value = st.moonAng; coins.U.uSharp.value = st.sharp; world.wind = st.wind; };

  // a few tall trunks overhead, for something to be under
  {
    const bark = M.bark({ base: 0x4a3a2c, dark: 0x241a12 });
    const list = [], r = rng(3);
    for (let i = 0; i < 16; i++) { const a = r() * TAU, d = 4 + r() * 8.5, x = Math.cos(a) * d, z = Math.sin(a) * d; if (Math.abs(((Math.atan2(x, z) - 0.5 + Math.PI * 3) % TAU) - Math.PI) < 0.6) continue; list.push({ x, z, h: 11 + r() * 5 }); }
    const g = merge(list.map((t) => new THREE.CylinderGeometry(0.15, 0.3, t.h, 8).translate(t.x, t.h / 2, t.z)));
    const trunks = new THREE.Mesh(g, bark); trunks.castShadow = true; trunks.receiveShadow = true; scene.add(trunks);
  }

  standardBar(world, $('#bar'), { finish: true, presets: [[9, 'Morning'], [13.2, 'Noon'], [16.5, 'Low sun']] });
  const c = $('#ctl');
  slider(c, { label: 'Eclipse', min: 0, max: 0.97, step: 0.005, value: 0, fmt: (v) => (v < 0.02 ? 'none' : `${Math.round(v * 100)}%`), onInput: (v) => { st.eclipse = v; } });
  slider(c, { label: 'Moon from', min: 0, max: TAU, step: 0.05, value: st.moonAng, fmt: (v) => `${Math.round(v * 57.3)}°`, onInput: (v) => { st.moonAng = v; } });
  slider(c, { label: 'Open canopy', min: 0.1, max: 1, step: 0.01, value: st.open, fmt: (v) => `${Math.round(v * 100)}%`, onInput: (v) => { st.open = v; } });
  slider(c, { label: 'Breeze', min: 0, max: 2, step: 0.02, value: st.wind, onInput: (v) => { st.wind = v; } });
  slider(c, { label: 'Sharpness', min: 0, max: 1, step: 0.02, value: st.sharp, onInput: (v) => { st.sharp = v; } });
  $('#btn-eclipse').addEventListener('click', () => { const start = performance.now(), go = () => { const e = (performance.now() - start) / 9000; if (e < 1) { st.eclipse = Math.sin(Math.min(1, e) * Math.PI) * 0.9; c.querySelector('input').value = st.eclipse; requestAnimationFrame(go); } else st.eclipse = 0; }; go(); world.say('The moon is crossing the sun. Look at the ground.'); });

  await world.loadForest(F, { near: 18, nearInner: 12, nearCount: 40 });
  world.loadGrass(GM, { paint: (m) => m.paint('excl', () => 0.6), zones: [['near', 0.17]], palette: { root: 0x294220, mid: 0x486e2e, tip: 0x789a44 } });
  await world.loadCat();
  world.chooseSpec = (spec) => { if (spec.id === 'eclipse') $('#btn-eclipse').click(); world.say(spec.name); };
  window.__komo = { world, st, coins };
  return world;
}
