// Roof Road canal and market family (Phase 5, lane r3-canal-market): the small
// pieces of mouths 3-5 (Takase canal, Nishiki, the laundry sky). Each asset is
// built in the rail frame at the piece's middle (local x along the rail, y up,
// z toward the camera at depth d), exactly where the classic builder in
// rooftops/js/pieces/<type>.js draws it, from `layout.piece` (the level record,
// read-only: heights and depths are gameplay). No collision is registered here:
// platforms belong to level.js. Static, plain merged geometry on the Roof Road's own
// ctx.MAT entries (no new material), so the facade merges every instance.
import * as THREE from 'three';
import { defineAsset } from '../contract.js?v=20261114a';
import { seg, PBag, PARAMS, sample, finish } from './common.js?v=20261114a';
import { assetsB } from './market.js?v=20261114a';

/* ------------------------------------------------------ stepping stones --- */
function buildSteppingStone(ctx, layout, p) {
  const pc = layout.piece, w = pc.s1 - pc.s0, look = pc.look ?? 0.5;
  const bag = new PBag();
  bag.add(new THREE.DodecahedronGeometry(0.55, 0), {
    sx: w, sy: 0.24 + look * 0.08, sz: 0.78 + look * 0.28,
    rx: 0.04 * (look - 0.5) + 0.03 * p.wear, ry: look * 0.7, rz: 0.035 * (look - 0.5),
    y: pc.y - 0.17, z: pc.d, m: 'wetStone'
  });
  if (ctx.tier !== 'far') bag.add(new THREE.CircleGeometry(0.34 + look * 0.12, seg(ctx.tier, 9)).rotateX(-Math.PI / 2), {
    sx: 1.25, x: 0.08, y: pc.y + 0.015, z: pc.d - 0.04, m: 'pine'
  });
  return finish(ctx, bag);
}

/* -------------------------------------------------------- canal landing --- */
function buildCanalLanding(ctx, layout, p) {
  const pc = layout.piece, w = pc.s1 - pc.s0, bag = new PBag(ctx.tier === 'far' ? { timber: 'timberMed', wetStone: 'timberMed' } : null), near = pc.side === 'near';
  bag.box(w, 0.14, 1.25, { y: pc.y - 0.07, z: pc.d, m: 'timberMed' });
  if (ctx.tier === 'hero') for (let i = -2; i <= 2; i++)   // plank seams
    bag.box(0.02, 0.005, 1.25, { x: i * w / 5 + 0.02 * p.wear, y: pc.y + 0.0, z: pc.d, m: 'timberMed' });
  for (let i = 0; i < 3; i++) {
    const h = pc.y * (i + 1) / 3;
    bag.box(w * 0.62, 0.12, 0.36, { x: (i - 1) * w * 0.14, y: h - 0.06, z: pc.d + (near ? 0.75 + i * 0.28 : -0.75 - i * 0.28), m: 'wetStone' });
  }
  for (const x of [-w / 2 + 0.12, w / 2 - 0.12]) {
    bag.box(0.08, pc.y + 0.48, 0.08, { x, y: (pc.y + 0.48) / 2, z: pc.d + 0.52, m: 'timber' });
  }
  return finish(ctx, bag);
}

/* ------------------------------------------------------------ footbridge --- */
function buildFootbridge(ctx, layout, p) {
  const pc = layout.piece, w = pc.s1 - pc.s0, bag = new PBag(ctx.tier === 'far' ? { indigo: 'lacquer' } : null);
  for (let i = -3; i <= 3; i++) {
    bag.box(w, 0.15, 0.66, { y: pc.y - 0.12 + 0.18 * (1 - Math.abs(i) / 3), z: pc.d + i * 0.62 + 0.012 * p.wear * (i % 2 ? 1 : -1), m: 'timberMed' });
  }
  const step = ctx.tier === 'far' ? 0.96 : 0.48;
  for (const side of [-1, 1]) {
    const z = pc.d + side * 2.0;
    bag.box(w, 0.08, 0.08, { y: pc.y + 0.65, z, m: 'lacquer' });
    for (let x = -w / 2 + 0.12; x <= w / 2 - 0.08; x += step) bag.box(0.06, 0.7, 0.06, { x, y: pc.y + 0.3, z, m: 'lacquer' });
    if (ctx.tier === 'hero') bag.sphere(0.055, { x: -w / 2 + 0.06, y: pc.y + 0.72, z, m: 'bronze' }).sphere(0.055, { x: w / 2 - 0.06, y: pc.y + 0.72, z, m: 'bronze' });
  }
  bag.box(0.9, 0.35, 0.05, { y: pc.y + 0.9, z: pc.d + 2.04, m: 'indigo' });
  return finish(ctx, bag);
}

/* ------------------------------------------------------------------ toro --- */
function buildToro(ctx, layout, p) {
  const pc = layout.piece, bag = new PBag(), t = ctx.tier;
  bag.box(0.5, 0.15, 0.5, { y: 0.08, z: pc.d, m: 'stone' });
  bag.add(new THREE.CylinderGeometry(0.11, 0.11, 0.7, seg(t, 8)), { y: 0.5, z: pc.d, m: 'stone' });
  bag.box(0.42, 0.12, 0.42, { y: 0.9, z: pc.d, m: 'stone' });
  bag.box(0.3, 0.25, 0.3, { y: 1.08, z: pc.d, m: 'lanternWhite' });
  bag.add(new THREE.ConeGeometry(0.4, 0.25, 4), { ry: Math.PI / 4 + 0.05 * p.wear, y: 1.33, z: pc.d, m: 'stone' });
  if (t === 'hero') bag.sphere(0.06, { y: 1.5, z: pc.d, m: 'stone' });   // hoju finial
  const out = finish(ctx, bag);
  const light = new ctx.THREE.Object3D();
  light.position.set(0, 1.1, pc.d);
  out.group.add(light);
  out.sockets.light_toro = light;
  return out;
}

/* ---------------------------------------------------------------- cistern --- */
function buildCistern(ctx, layout, p) {
  const pc = layout.piece, w = pc.s1 - pc.s0, bag = new PBag(ctx.tier === 'far' ? { steel: 'timber', bronze: 'timber', bamboo: 'timber' } : ctx.tier === 'mid' ? { bronze: 'steel' } : null), t = ctx.tier;
  const tankH = 1.28, radius = Math.min(0.96, w * 0.43);
  bag.add(new THREE.CylinderGeometry(radius * 0.94, radius, tankH, seg(t, 16)), { y: pc.y - tankH / 2 - 0.06, z: pc.d, m: 'timberMed' });
  if (t !== 'far') for (const y of [pc.y - 0.25, pc.y - 0.66, pc.y - 1.06])
    bag.add(new THREE.TorusGeometry(radius + 0.015, 0.025, 5, seg(t, 18)).rotateX(Math.PI / 2), { y, z: pc.d, m: 'steel' });
  bag.add(new THREE.CylinderGeometry(radius * 0.96, radius * 0.96, 0.1, seg(t, 16)), { rz: 0.02 * p.wear, y: pc.y - 0.05, z: pc.d, m: 'timber' });
  bag.add(new THREE.CylinderGeometry(0.16, 0.16, 0.09, seg(t, 10)), { y: pc.y + 0.045, z: pc.d, m: 'bronze' });
  for (const x of [-radius * 0.62, radius * 0.62]) bag.box(0.11, 1.0, 0.11, { x, y: pc.y - 1.78, z: pc.d, m: 'timber' });
  const rung = t === 'far' ? 0.48 : 0.24;
  for (let y = pc.y - 1.95; y < pc.y - 0.78; y += rung) bag.box(0.62, 0.04, 0.05, { x: radius + 0.16, y, z: pc.d + 0.74, m: 'bamboo' });
  for (const x of [radius - 0.13, radius + 0.45]) bag.box(0.045, 1.35, 0.045, { x, y: pc.y - 1.36, z: pc.d + 0.74, m: 'bamboo' });
  if (t === 'hero') bag.box(0.05, 0.9, 0.05, { x: -radius * 0.5, y: pc.y - 0.6, z: pc.d + radius * 0.8, m: 'timber' });   // down-pipe
  return finish(ctx, bag);
}

/* ---------------------------------------------------------------- chimney --- */
function buildChimney(ctx, layout, p) {
  const pc = layout.piece, w = pc.s1 - pc.s0, bag = new PBag(ctx.tier === 'far' ? { stone: 'ridge', steel: 'ridge' } : null), h = 1.55, t = ctx.tier;
  bag.add(new THREE.CylinderGeometry(w * 0.32, w * 0.42, h, seg(t, 8)), { y: pc.y - h / 2 - 0.08, z: pc.d, m: pc.look > 0.5 ? 'bengara' : 'plaster' });
  bag.box(w * 0.86, 0.13, w * 0.82, { y: pc.y - 0.1, z: pc.d, m: 'stone' });
  bag.add(new THREE.ConeGeometry(w * 0.48, 0.22, 4), { ry: Math.PI / 4 + 0.05 * p.wear, y: pc.y + 0.07, z: pc.d, m: 'ridge' });
  if (t !== 'far') for (const x of [-w * 0.29, w * 0.29]) bag.box(0.05, 0.25, 0.05, { x, y: pc.y - 0.02, z: pc.d, m: 'steel' });
  return finish(ctx, bag);
}

/* -------------------------------------------------------------- futon rack --- */
function buildFutonRack(ctx, layout, p) {
  const pc = layout.piece, w = pc.s1 - pc.s0, bag = new PBag(ctx.tier === 'far' ? { indigo: 'timber', crimson: 'timber' } : null);
  bag.box(w + 0.18, 0.12, 1.18, { y: pc.y - 0.06, z: pc.d, m: 'futon' });
  bag.box(w + 0.12, 0.56, 0.1, { y: pc.y - 0.34, z: pc.d + 0.54, m: 'futon' });
  if (ctx.tier === 'hero') for (let i = 0; i < 4; i++)   // futon stripes
    bag.box(w + 0.19, 0.121, 0.05, { y: pc.y - 0.06, z: pc.d - 0.45 + i * 0.3, m: 'futon' });
  for (const x of [-w / 2 + 0.08, w / 2 - 0.08]) bag.box(0.08, pc.y, 0.08, { x, y: pc.y / 2, z: pc.d - 0.45, m: 'timber' });
  for (const x of [-w * 0.28, w * 0.28]) bag.box(0.055, 0.15, 1.24, { x: x + 0.02 * p.wear, y: pc.y - 0.03, z: pc.d, m: pc.look > 0.5 ? 'crimson' : 'indigo' });
  return finish(ctx, bag);
}

/* ------------------------------------------------------------ canopy vent --- */
function buildVent(ctx, layout, p) {
  const pc = layout.piece, w = pc.s1 - pc.s0, bag = new PBag();
  bag.box(w, pc.y - 4.95, 1.0, { y: (pc.y + 4.95) / 2, z: pc.d, m: 'steel' });
  for (let i = 0; i < 3; i++) bag.box(w + 0.02, 0.03, 1.02, { y: 5.05 + i * (0.12 + 0.01 * p.wear), z: pc.d, m: 'dark' });
  return finish(ctx, bag);
}

const def = (id, label, build, piece, extra = {}) => defineAsset({
  id, family: 'roofcanal', label, params: PARAMS, tiers: ['hero', 'mid', 'far'], sample: sample(piece), build, ...extra
});

const assetsA = [
  def('roof-stepping-stones', 'Stepping stone', buildSteppingStone, { s0: -0.6, s1: 0.65, y: 0.2, d: 3, shape: 'turtle' }, { floating: ['body_pine'] }),
  def('roof-canal-landings', 'Canal landing', buildCanalLanding, { s0: -1.4, s1: 1.4, y: 0.7, d: 1.5 }),
  def('roof-footbridge', 'Canal footbridge', buildFootbridge, { s0: -1.6, s1: 1.6, y: 0.2, d: 3 }, { floating: ['body_indigo'] }),
  def('roof-toro', 'Stone lantern', buildToro, { s0: -0.22, s1: 0.22, y: 1.45, d: 2.35 }),
  def('roof-cistern', 'Rooftop cistern', buildCistern, { s0: -1.1, s1: 1.1, y: 2.3, d: 0 }),
  def('roof-chimney', 'Chimney cap', buildChimney, { s0: -0.45, s1: 0.45, y: 1.63, d: 0 }),
  def('roof-futon-racks', 'Futon rack', buildFutonRack, { s0: -1.2, s1: 1.2, y: 2.2, d: 0 }),
  def('roof-canopy-vents', 'Canopy vent', buildVent, { s0: -0.35, s1: 0.35, y: 5.42, d: 1.2 }, { floating: ['body_steel', 'body_dark'] })
];

export const assets = [...assetsA, ...assetsB];
