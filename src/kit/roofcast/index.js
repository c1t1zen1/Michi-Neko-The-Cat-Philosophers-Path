// Roof Road cast family (Phase 5, lane r5-roof-cast): the people and spirits
// along the run: the seven clay Shoki (statues that light when greeted), the treats, and the
// downtown residents (sweeper, laundry woman, stallkeepers, festival-goers).
// Chidori (roof-chidori) is a CharacterDef, not a kit asset, like the villager
// cats: src/characters/defs/chidori.js, built by `new Cat({ def })`.
// The boatman (roof-boatman) and the hayashi (roof-hayashi) are deferred:
// they live inside the takasebune and the hoko, which no kit piece builds yet
// (see docs/fable/handoff/r5-roof-cast.md).
//
// Shoki and treats are built on the pickup's own origin (the layout's world
// point), `layout.scale` large, as plain unmerged direct-child meshes: the
// game greets a Shoki by swapping the material of every direct child, and
// world.update() turns the first child a little. A villager is built in the
// rail frame at the piece's middle and registers its `people` record, as
// downtown.js does.
import * as THREE from 'three';
import { defineAsset } from '../contract.js?v=20261114a';
import { Bag, UNIT } from '../craft.js?v=20261114a';
import { buildResident } from './resident.js?v=20261114a';
import { castAssets } from './cast.js?v=20261114a';

const TAU = Math.PI * 2;
const SEG = { hero: 1, mid: 0.65, far: 0.4 };
const seg = (tier, n) => Math.max(4, Math.round(n * (SEG[tier] || 0.65)));
const FALLBACK = { clay: 0x6b6863, steel: 0x8d9298, plaster: 0xe0cfae };
const mat = (ctx, name) => (ctx.MAT && ctx.MAT[name]) || ctx.kitMaterials.plain(FALLBACK[name], { rough: 0.8 });
// Bag.sphere() overrides sx/sy/sz with r: an ellipsoid goes through UNIT.sphere
const ell = (bag, rx, ry, rz, o) => bag.add(UNIT.sphere, { ...o, sx: rx, sy: ry, sz: rz });
const solid = (geo, m, name) => { const mesh = new THREE.Mesh(geo, m); mesh.name = name; mesh.castShadow = mesh.receiveShadow = true; return mesh; };

/* ------------------------------------------------------------------ shoki --- */
// Shoki the demon-queller, in clay: a flared robe with a sash and sleeves, a
// scowling head (brows, nose, moustache, beard), a tall eboshi hat with its
// brim and tail, and a sword held up in the raised hand. Classic: a cone, a
// ball, a hat and a bar (0.36 m, drawn 1.6 times larger).
function shokiGeometries(tier) {
  const hero = tier === 'hero', far = tier === 'far';
  const body = new Bag(), blade = new Bag();
  const lathe = (pts, n) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n);
  const n = seg(tier, 14);
  body.add(new THREE.CylinderGeometry(0.115, 0.125, 0.03, n), { y: 0.015 });                       // plinth
  body.add(lathe([[0.062, 0.03], [0.118, 0.032], [0.12, 0.08], [0.1, 0.15], [0.075, 0.2], [0.05, 0.235], [0.036, 0.25]], n));   // robe
  ell(body, 0.067, 0.067, 0.064, { y: 0.31 });                                                          // head
  body.add(new THREE.CylinderGeometry(0.038, 0.052, 0.085, seg(tier, 10)), { y: 0.39 });               // hat crown
  body.box(0.17, 0.012, 0.034, { y: 0.352 });                                                          // brim
  if (!far) {
    body.add(new THREE.TorusGeometry(0.087, 0.012, 5, n).rotateX(Math.PI / 2), { y: 0.135 });          // sash
    body.add(new THREE.ConeGeometry(0.03, 0.075, 6), { y: 0.242, z: 0.03, rx: Math.PI, sz: 0.7 });          // the beard, under the chin
    for (const s of [-1, 1]) {
      ell(body, 0.036, 0.05, 0.045, { x: s * 0.085, y: 0.2, z: 0.012 });                        // sleeves
      body.box(0.034, 0.012, 0.012, { x: s * 0.025, y: 0.339, z: 0.058, rz: s * -0.35 });              // scowling brows
      body.add(new THREE.ConeGeometry(0.012, 0.045, 5), { x: s * 0.034, y: 0.281, z: 0.062, rz: s * -Math.PI / 2, sz: 0.7 });   // moustache
    }
    body.add(new THREE.ConeGeometry(0.011, 0.022, 5), { y: 0.302, z: 0.068, rx: Math.PI / 2 });         // nose
    body.box(0.03, 0.15, 0.012, { y: 0.4, z: -0.052, rx: 0.4 });                                       // hat tail
  }
  if (hero) {
    body.sphere(0.02, { x: 0.092, y: 0.255, z: 0.02 });                                                // fist
    for (const s of [-1, 1]) ell(body, 0.012, 0.007, 0.01, { x: s * 0.028, y: 0.318, z: 0.058 });        // glare of the eyes
  }
  // the sword, point up, in the raised right hand (classic: 0.012 x 0.22 box, tilted -0.4)
  const tip = new THREE.ConeGeometry(0.0085, 0.03, 4);
  blade.box(0.011, 0.2, 0.011, { y: 0.0 });
  blade.add(tip, { y: 0.115 });
  blade.box(0.05, 0.01, 0.016, { y: -0.092 });                                                         // guard
  blade.box(0.014, 0.05, 0.014, { y: -0.12 });                                                         // hilt
  return { body, blade };
}

function buildShoki(ctx, layout, p) {
  const k = (layout.scale ?? 1.6) * p.size, { body, blade } = shokiGeometries(ctx.tier);
  const group = new THREE.Group();
  const bg = body.geometry(); bg.scale(k, k, k);
  const sg = blade.geometry(); sg.rotateZ(-0.4); sg.translate(0.09, 0.26, 0.02); sg.scale(k, k, k);
  const bodyMesh = solid(bg, mat(ctx, 'clay'), 'body'), sword = solid(sg, mat(ctx, 'steel'), 'sword');
  group.add(bodyMesh, sword);     // direct children, body first: the facade turns child 0, the game lights both
  return { group, parts: { body: bodyMesh, sword }, sockets: {}, live: [group], dispose() { bg.dispose(); sg.dispose(); } };
}

/* ------------------------------------------------------------------ treats --- */
function buildTreat(ctx, layout, p) {
  const k = (layout.scale ?? 1.4) * p.size, t = ctx.tier, n = seg(t, 16);
  const dishBag = new Bag(), fishBag = new Bag();
  dishBag.add(new THREE.CylinderGeometry(0.11, 0.08, 0.03, n), { y: 0.015 });
  if (t !== 'far') dishBag.add(new THREE.TorusGeometry(0.105, 0.007, 4, n).rotateX(Math.PI / 2), { y: 0.031 });   // a lip
  ell(fishBag, 0.07, 0.024, 0.03, { x: 0.015, y: 0.054 });
  if (t !== 'far') {
    fishBag.add(new THREE.ConeGeometry(0.03, 0.045, 4), { x: -0.085, y: 0.054, rz: -Math.PI / 2, sz: 0.4 });  // tail fan (apex at the body)
    fishBag.sphere(0.008, { x: 0.052, y: 0.063, z: 0.02 });                                                // eye
  }
  const dg = dishBag.geometry(), fg = fishBag.geometry();
  dg.scale(k, k, k); fg.scale(k, k, k);
  const group = new THREE.Group();
  const dish = solid(dg, mat(ctx, 'plaster'), 'dish');
  const fish = solid(fg, (ctx.MAT && ctx.MAT.goods && ctx.MAT.goods[1]) || ctx.kitMaterials.plain(0xd9a441), 'fish');
  group.add(dish, fish);
  return { group, parts: { dish, fish }, sockets: {}, live: [group], dispose() { dg.dispose(); fg.dispose(); } };
}

/* --------------------------------------------------------------- villager --- */
function buildVillager(ctx, layout, p) {
  const pc = layout.piece;
  const r = buildResident(ctx, pc);
  const group = r.group;
  const rec = { group, body: r.body, arms: r.arms, head: r.head, s: pc.s, phase: (pc.look ?? 0.5) * TAU, role: pc.role, y: pc.y, towel: r.towel, fare: pc.fare };
  return { group, parts: { body: r.body, head: r.head, arm_l: r.arms[0], arm_r: r.arms[1], ...(r.rack ? { rack: r.rack } : {}) }, sockets: {}, live: [group], dynamic: { people: rec }, dispose() {} };
}

const SIZE = { size: { type: 'number', default: 1, min: 0.9, max: 1.15, step: 0.05, label: 'Size' } };
const pickupSample = (type, scale) => () => ({ index: 0, type, x: 0, y: 0, z: 0, ry: 0, band: 'near', s: 0, scale, pickup: { kind: type === 'treat' ? 'treat' : 'shoki', id: 1, s: 0, y: 0, label: 'a Shoki' } });
const villagerSample = () => ({
  index: 0, type: 'villager', x: 0, y: 0, z: 0, ry: 0, band: 'near', s: 0,
  piece: { type: 'villager', s: 0, s0: -0.35, s1: 0.35, y: 0, d: 1.5, role: 'laundry', look: 0.62 }
});

export const assets = [
  defineAsset({ id: 'roof-shoki', family: 'roofcast', label: 'Shoki, the clay guardian', params: SIZE, tiers: ['hero', 'mid', 'far'], sample: pickupSample('shoki', 1.6), build: buildShoki }),
  defineAsset({ id: 'roof-treats', family: 'roofcast', label: 'Treat dish', params: SIZE, tiers: ['hero', 'mid', 'far'], sample: pickupSample('treat', 1.4), build: buildTreat }),
  defineAsset({ id: 'roof-villagers', family: 'roofcast', label: 'Kyoto resident', params: {}, tiers: ['hero', 'mid', 'far'], sample: villagerSample, build: buildVillager }),
  ...castAssets
];
