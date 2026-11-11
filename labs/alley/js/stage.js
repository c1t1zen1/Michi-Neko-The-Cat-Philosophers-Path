// A back lane to dress. Pick something from the palette and click it into
// place, or let the lane fill itself, then get down to cat height.
import * as THREE from 'three';
import { loadSkyModule, loadFoliageModule, loadGrassModule } from '../../shared/game.js';
import { LabWorld } from '../../shared/world.js';
import { standardBar } from '../../shared/workshop.js';
import { seg } from '../../shared/ui.js';
import { V3, TAU, rng, instances, tube } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { thump } from '../../shared/sound.js';
import { flag } from '../../shared/stage.js';
import { PROPS } from './props.js';

const $ = (s) => document.querySelector(s);
const HALF = 1.4, LEN = 12;

function paintGround(x, res, toPx, r) {
  x.fillStyle = '#6b6a58'; x.fillRect(0, 0, res, res);
  for (let i = 0; i < 2400; i++) { const c = r(); x.fillStyle = `rgba(${90 + r() * 50},${86 + r() * 40},${70 + r() * 30},${0.05 + r() * 0.12})`; x.beginPath(); x.ellipse(r() * res, r() * res, 4 + r() * 18, 3 + r() * 10, r() * 3, 0, TAU); x.fill(); }
}

export async function makeAlleyStage(lab) {
  const [{ Sky }, F] = await Promise.all([loadSkyModule(), loadFoliageModule()]);
  const P = 16;
  const placed = [];
  const world = new LabWorld(lab, $('#stage'), {
    SkyClass: Sky, hour: +flag('hour', 16.2), plot: P, res: 1536, paint: paintGround, outer: 0x4e5a3c, shadowExtent: 15,
    camera: { az: 0.03, el: 0.05, dist: 9, focus: [0, 1.2, 4.5] }, bounds: { x0: -1.3, x1: 1.3, z0: -LEN, z1: 14 }, catStart: { x: 0, z: 12, heading: Math.PI },
    blocked: (x, z) => placed.some((p) => Math.hypot(p.x - x, p.z - z) < p.r),
    views: { stage: { label: 'The lane', az: 0.03, el: 0.05, dist: 9, focus: [0, 1.2, 4.5] }, eye: { label: 'Cat-eye', eye: true }, high: { label: 'From above', az: 0.08, el: 0.95, dist: 14, focus: [0, 0, 2] } }
  });
  const scene = world.scene, r = rng(5);

  // paving stones, the two walls, overhanging eaves and a few wires
  {
    const list = []; for (let z = -LEN + 0.3; z < LEN + 3; z += 0.62) for (let c = 0; c < 4; c++) list.push({ x: (c - 1.5) * 0.7 + (Math.floor(z * 2) % 2 ? 0.2 : 0), y: 0.03, z: z + (r() - 0.5) * 0.03, sx: 0.66, sy: 0.06, sz: 0.6, ry: (r() - 0.5) * 0.04 });
    const p = instances(new THREE.BoxGeometry(1, 1, 1), M.stone({ tint: 0x8f8a7e, moss: 0.3, lichen: 0.2, grime: 0.4 }), list, 'Paving'); p.castShadow = p.receiveShadow = true; scene.add(p);
    for (const s of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.4, LEN * 2 + 3), M.plaster({ tint: 0xdccdb0, grime: 0.5, grimeH: 1.0 })); wall.position.set(s * (HALF + 0.15), 2.2, 1.5); wall.castShadow = wall.receiveShadow = true; scene.add(wall);
      // wooden lower wall
      const boards = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.9, LEN * 2 + 3), M.wood({ base: 0x6a4e34, dark: 0x4a3322 })); boards.position.set(s * (HALF + 0.14), 0.45, 1.5); scene.add(boards);
      const eave = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, LEN * 2 + 3), M.tile({})); eave.position.set(s * (HALF + 0.28), 4.42, 1.5); eave.rotation.z = -s * 0.1; eave.castShadow = true; scene.add(eave);
    }
    // doors and little windows, and a run of wires
    for (let i = 0; i < 6; i++) { const s = i % 2 ? 1 : -1, z = -9 + i * 3.4; const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.7, 0.9), M.wood({ base: 0x4a3322, dark: 0x2c1e14 })); door.position.set(s * (HALF - 0.02), 0.85, z); scene.add(door); }
    // Hemp drying lines anchored into both walls; no modern overhead utility wires.
    const lineMat = M.straw({ color: 0x827251 });
    for (const z of [-8, -2, 4]) {
      const pts = [];
      for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(V3(-HALF + t * HALF * 2, 3.1 - 0.22 * 4 * t * (1 - t), z)); }
      scene.add(new THREE.Mesh(tube(pts, 0.006, { radial: 6 }), lineMat));
    }
  }

  const st = { kind: 'pot', tool: 'place' };
  const place = (kind, x, z, ry = r() * TAU) => {
    const g = PROPS[kind].build(); g.position.set(x, 0.06, z); g.rotation.y = ry;
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(g);
    const rec = { g, x, z, r: PROPS[kind].r, kind };
    placed.push(rec);
    world.addPick(g, () => { if (st.tool === 'remove') { scene.remove(g); placed.splice(placed.indexOf(rec), 1); thump({ freq: 180 }); } else world.say(PROPS[kind].label); }, PROPS[kind].label);
    return rec;
  };
  const clearAll = () => { for (const p of placed) scene.remove(p.g); placed.length = 0; };
  const dress = () => {
    clearAll();
    const kinds = ['pot', 'pot', 'pot', 'broom', 'barrel', 'crate', 'sign', 'komodaru', 'tiles', 'pot'];
    let z = 10, s = -1;
    while (z > -LEN + 1) {
      const kind = kinds[Math.floor(r() * kinds.length)], x = s * (HALF - 0.42 - PROPS[kind].r * 0.3);
      place(kind, x, z, kind === 'bicycle' ? (s > 0 ? Math.PI : 0) + (r() - 0.5) * 0.4 : undefined);
      z -= 0.9 + r() * 1.4; if (r() < 0.75) s = -s;
    }
  };
  world.onGround = (p) => {
    if (st.tool !== 'place' || Math.abs(p.x) > HALF - 0.1) return false;
    place(st.kind, p.x, p.z); thump({ freq: 200, vol: 0.2 }); return true;
  };

  standardBar(world, $('#bar'), { presets: [[9, 'Morning'], [16.2, 'Late sun'], [19.5, 'Lamplight']] });
  seg($('#seg-kind'), Object.entries(PROPS).map(([v, P]) => ({ v, label: P.label })), 'pot', (v) => { st.kind = v; st.tool = 'place'; toolSeg.set('place'); });
  const toolSeg = seg($('#seg-tool'), [{ v: 'place', label: 'Place' }, { v: 'remove', label: 'Remove' }, { v: 'walk', label: 'Walk' }], 'place', (v) => { st.tool = v; });
  $('#btn-dress').addEventListener('click', dress);
  $('#btn-clear').addEventListener('click', clearAll);

  world.loadForest(F, { near: 30, nearInner: 18, nearCount: 16, keepOut: (x, z) => Math.abs(x) < 8 });
  await world.loadCat();
  dress();
  world.chooseSpec = (spec) => { if (PROPS[spec.id]) { st.kind = spec.id; world.say('Click the lane to place it.'); } };
  window.__alley = { world, st, place };
  return world;
}
