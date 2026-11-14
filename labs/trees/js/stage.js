// The orchard: click to plant a sakura, maple or pine at a chosen tier and watch
// the triangle count; Michi walks between them and the wind moves the crowns.
import * as THREE from 'three';
import { loadSkyModule, loadFoliageModule, loadGrassModule } from '../../shared/game.js';
import { LabWorld } from '../../shared/world.js';
import { standardBar } from '../../shared/workshop.js';
import { slider, seg } from '../../shared/ui.js';
import { TAU } from '../../shared/craft.js';
import { thump } from '../../shared/sound.js';
import { flag } from '../../shared/stage.js';
import { SPECIES, makeTree } from './kit.js';

const $ = (s) => document.querySelector(s);

function paintGround(x, res, toPx, r) {
  x.fillStyle = '#6a7a42'; x.fillRect(0, 0, res, res);
  for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${80 + r() * 50},${100 + r() * 40},${50 + r() * 25},${0.07 + r() * 0.14})`; x.beginPath(); x.ellipse(r() * res, r() * res, 2 + r() * 10, 1 + r() * 5, r() * 3, 0, TAU); x.fill(); }
}

export async function makeOrchardStage(lab) {
  const [{ Sky }, F, GM] = await Promise.all([loadSkyModule(), loadFoliageModule(), loadGrassModule()]);
  const P = 14, trees = [];
  const world = new LabWorld(lab, $('#stage'), {
    SkyClass: Sky, hour: +flag('hour', 15), plot: P, res: 1536, paint: paintGround, outer: 0x4e6a36, shadowExtent: 14,
    camera: { az: 0.5, el: 0.2, dist: 13, focus: [0, 2.2, 0] }, bounds: { x0: -11, x1: 11, z0: -11, z1: 11 }, catStart: { x: -6, z: 5, heading: 2.4 },
    blocked: (x, z) => trees.some((t) => Math.hypot(t.x - x, t.z - z) < 0.4 * t.S),
    views: { stage: { label: 'The orchard', az: 0.5, el: 0.2, dist: 13, focus: [0, 2.2, 0] }, up: { label: 'Look up', az: 0.5, el: -0.1, dist: 4, focus: [0, 3, 0] }, eye: { label: 'Cat-eye', eye: true }, high: { label: 'Plan', az: 0.6, el: 1.25, dist: 22, focus: [0, 0, 0] } }
  });
  const st = { kind: 'sakura', tier: 'hero', n: 0 };
  const stats = $('#heroStats');
  const report = () => { const t = trees.reduce((a, b) => a + b.tris, 0); if (stats) stats.textContent = `${trees.length} trees · ${t.toLocaleString()} triangles`; };
  const plant = (kind, tier, x, z, S = 1) => {
    const style = tier === 'far' ? 'masses' : 'leaves';
    const t = makeTree(F, { kind, tier, style, seed: ++st.n * 7 + 1, S });
    t.group.position.set(x, 0, z); t.group.rotation.y = st.n * 2.1;
    world.scene.add(t.group);
    trees.push({ ...t, x, z, S }); report();
  };
  const clear = () => { for (const t of trees) { world.scene.remove(t.group); t.dispose(); } trees.length = 0; report(); };
  world.onGround = (p) => { if (Math.hypot(p.x, p.z) > P - 1) return false; plant(st.kind, st.tier, p.x, p.z, 0.9 + (st.n % 4) * 0.1); thump({ freq: 120, vol: 0.25 }); return true; };

  standardBar(world, $('#bar'), { presets: [[7, 'Dawn'], [12.5, 'Noon'], [17.3, 'Golden']] });
  const mount = (id) => { const d = document.createElement('div'); d.id = id; d.style.cssText = 'display:flex;justify-content:center'; $('#ctl').append(d); return d; };
  seg(mount('seg-kind'), Object.entries(SPECIES).map(([v, s]) => ({ v, label: `${s.label} ${s.jp}` })), st.kind, (v) => { st.kind = v; });
  seg(mount('seg-tier'), [{ v: 'hero', label: 'Hero' }, { v: 'mid', label: 'Mid' }, { v: 'far', label: 'Far' }], st.tier, (v) => { st.tier = v; });
  slider($('#ctl'), { label: 'Wind', min: 0, max: 4, step: 0.05, value: 1, onInput: (v) => { F.foliageUniforms.uWindGlobal.value = v; } });
  $('#btn-play').addEventListener('click', clear);

  await world.loadForest(F, { near: 26, nearInner: 12.5, nearCount: 30, keepOut: (x, z) => Math.hypot(x, z) < 12 });
  world.loadGrass(GM, { paint: (m) => { m.paint('excl', () => 0.3); }, zones: [['near', 0.18], ['thicket', 0.7]], palette: { root: 0x3a5a28, mid: 0x6c8c3e, tip: 0xa8b860 } });
  await world.loadCat();
  plant('sakura', 'hero', -3.5, -1.5, 1.2); plant('maple', 'hero', 3, -3, 1.1); plant('needle', 'hero', 4.2, 3, 1.3);
  plant('sakura', 'mid', -2, -6.5, 1); plant('maple', 'far', 6.5, -7, 1.1);
  world.chooseSpec = (spec) => { world.say(spec.name); };
  window.__trees = { world, st, trees, plant, clear };
  return world;
}
