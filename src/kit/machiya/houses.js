// The machiya buildings (part b): tea-house (Chaya), residence, secret-house
// (Hisomu-an) and street-house. Each draws ONLY the building's own body. The
// koushi, roofs, noren, lanterns, benches, engawa, frame, namako, doors, nest and
// crates are listed in `layout.components` and placed by the Countryside as their
// own assets (f2 handoff), so nothing here builds them twice.
//
// Frame = the classic house group: origin on the ground at the house centre, +z the
// front. Every dimension below is the classic one (colliders, platforms and anchors
// come from the layout untouched; this file only draws). New in the kit: lower-eave
// fascia and rafter tails, upper hashira and top plate, a namako skirt up the
// outer walls of the tea house and residence (closes the AGENTS.md open item), a
// bamboo inuyarai on a side wall (the merged `bamboo-fence` kit asset, reused), chochin
// brackets, tansu drawers, a lintel and sill on the secret door.
//
// Materials: the game's MAT entries (plaster, roof tile, shoji, namako) and the
// shared vertex-coloured kit bag; far folds everything into the bag.
import * as THREE from 'three';
import { defaultParams } from '../contract.js?v=20261113a';
import { bambooFence } from '../fences/fence.js?v=20261113a';
import { Bag, merge, bagMat, matOr, meshOf, assemble, seg, tint, uvBox, worldUV } from './common.js?v=20261113a';

const DARK = 0x41302a, RIDGE = 0x3a4149, TILE = 0x4a5058, WARM = 0xe0cfa8, PLASTER = 0xeadfc8, SHOJI = 0xf0d9a8, ENGAWA = 0x7a5a3c;

const wall = (ctx, name) => matOr(ctx, name, () => ctx.kitMaterials.plain(name === 'plaster' ? PLASTER : WARM));
const group = (geos, mat) => (geos.length ? meshOf(merge(geos), mat) : null);

/** The perimeter of a lower eave slab: fascia boards, and rafter tails on the long sides (hero / mid). */
function eaveTrim(bag, ctx, cx, cz, w, d, y, tier) {
  const rng = ctx.rng;
  for (const sz of [-1, 1]) bag.box(w + 0.06, 0.14, 0.05, { x: cx, y, z: cz + sz * d / 2, color: DARK });
  for (const sx of [-1, 1]) bag.box(0.05, 0.14, d + 0.06, { x: cx + sx * w / 2, y, z: cz, color: DARK });
  if (tier === 'far') return;
  const n = Math.max(3, Math.floor(w / (tier === 'hero' ? 0.55 : 0.9)));
  for (const sz of [-1, 1]) for (let i = 0; i < n; i++) {
    const x = cx - w / 2 + 0.3 + (i / (n - 1)) * (w - 0.6);
    bag.box(0.07, 0.09, 0.34, { x, y: y - 0.1, z: cz + sz * (d / 2 - 0.12), color: tint(DARK, (rng() - 0.5) * 0.05) });
  }
}

/** The reused kit bamboo fence as a low inuyarai hugging a wall. `ry` turns it onto a side wall. */
function inuyarai(ctx, x, z, ry, len) {
  const inst = bambooFence.build(ctx, { len, fenceHeight: 0.8 }, defaultParams(bambooFence.params));
  const g = inst.group;
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  return g;
}

/** Outer-wall namako skirt (side and back runs; the facade stays free for the door, lattices and engawa). */
function skirt(geos, w, d, y0 = 0.3, h = 0.9, out = 0.022) {
  const y = y0 + h / 2;
  geos.push(uvBox(w - 0.5, h, 0.04, 0, y, -(d / 2 + out)));
  for (const sx of [-1, 1]) geos.push(uvBox(0.04, h, d - 0.5, sx * (w / 2 + out), y, 0));
}

function bracket(bag, x, y, z0, z1) {
  bag.box(0.07, 0.06, Math.abs(z1 - z0), { x, y, z: (z0 + z1) / 2, color: DARK });
  bag.box(0.05, 0.05, 0.05, { x, y: y - 0.05, z: z1 - 0.03, color: 0x1f1610 });   // the hook
}

/* ------------------------------------------------------------------ tea house --- */

function buildTeaHouse(ctx, layout, p) {
  const { tier, kitMaterials: km } = ctx;
  const bag = new Bag();
  if (tier === 'far') {
    bag.box(7.6, 2.4, 5.4, { y: 1.2, color: WARM });
    bag.box(1.8, 2.1, 0.08, { y: 1.15, z: 2.71, color: SHOJI });
    bag.box(8.6, 0.16, 6.6, { y: 2.55, z: 0.2, color: TILE });
    bag.box(6.8, 1.9, 4.6, { y: 3.5, color: PLASTER });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) bag.box(0.28, 2.0, 0.28, { x: sx * 3.3, y: 3.5, z: sz * 2.2, color: DARK });
    eaveTrim(bag, ctx, 0, 0, 8.7, 7.1, 2.47, 'far');
    return assemble({ timber: meshOf(bag.geometry(), bagMat(km)) });
  }
  const hero = tier === 'hero';
  const warm = [uvBox(7.6, 2.4, 5.4, 0, 1.2, 0)];
  const plaster = [uvBox(6.8, 1.9, 4.6, 0, 3.5, 0)];
  const tile = [uvBox(8.6, 0.16, 6.6, 0, 2.55, 0.2),
    uvBox(8.7, 0.18, 1.0, 0, 2.56, 3.05), uvBox(8.7, 0.18, 1.0, 0, 2.56, -3.05),   // the wraparound ledge the cat walks
    uvBox(1.0, 0.18, 5.2, -3.85, 2.56, 0), uvBox(1.0, 0.18, 5.2, 3.85, 2.56, 0),
    worldUV(new THREE.BoxGeometry(3.1, 0.18, 1.0).rotateZ(-0.08).translate(1.9, 3.48, 2.72))];   // tutorial roof lip
  const door = [uvBox(1.8, 2.1, 0.08, 0, 1.15, 2.71)];
  const skirtGeos = []; skirt(skirtGeos, 7.6, 5.4);
  bag.box(8.0, 0.16, 0.12, { y: 2.72, z: 2.62, color: RIDGE });
  bag.box(8.0, 0.16, 0.12, { y: 2.72, z: -2.62, color: RIDGE });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bag.box(0.28, 2.0, 0.28, { x: sx * 3.3, y: 3.5, z: sz * 2.2, color: DARK });   // upper hashira
  eaveTrim(bag, ctx, 0, 0, 8.7, 7.1, 2.47, tier);
  if (hero) {
    bag.box(6.9, 0.1, 4.7, { y: 4.4, color: DARK });                                  // top plate under the roof
    bag.box(6.9, 0.08, 4.7, { y: 2.66, color: tint(DARK, 0.03) });                    // sill of the upper wall
    bracket(bag, -2.5, 2.44, 2.72, 3.1); bracket(bag, 2.5, 2.44, 2.72, 3.1);          // chochin hooks
  }
  const parts = { walls_warm: group(warm, wall(ctx, 'plasterWarm')), walls: group(plaster, wall(ctx, 'plaster')),
    roof: group(tile, matOr(ctx, 'roofTile', () => km.tile())), door: group(door, matOr(ctx, 'shoji', () => km.paper({ glow: 0.12 }))),
    timber: meshOf(bag.geometry(), bagMat(km)) };
  if (hero) {
    parts.skirt = group(skirtGeos, matOr(ctx, 'namako', () => km.plain(0x2b3036)));
    parts.inuyarai = inuyarai(ctx, -3.95, 0, Math.PI / 2, 4.2);
  }
  return assemble(parts);
}

/* ------------------------------------------------------------------ residence --- */

function buildResidence(ctx, layout, p) {
  const { tier, kitMaterials: km } = ctx;
  const bag = new Bag();
  if (tier === 'far') {
    bag.box(8.0, 2.4, 5.0, { y: 1.2, color: WARM });
    bag.box(7.0, 1.8, 4.2, { y: 3.3, color: PLASTER });
    bag.box(9.0, 0.16, 6.2, { y: 2.45, z: 0.2, color: TILE });
    for (const sx of [-1, 1]) bag.box(2.4, 1.8, 0.08, { x: sx * 1.8, y: 1.2, z: 2.52, color: SHOJI });
    eaveTrim(bag, ctx, 0, 0.1, 9.1, 6.4, 2.37, 'far');
    return assemble({ timber: meshOf(bag.geometry(), bagMat(km)) });
  }
  const hero = tier === 'hero';
  const warm = [uvBox(8.0, 2.4, 5.0, 0, 1.2, 0)];
  const plaster = [uvBox(7.0, 1.8, 4.2, 0, 3.3, 0)];
  const tile = [uvBox(9.0, 0.16, 6.2, 0, 2.45, 0.2)];
  const shoji = [uvBox(2.4, 1.8, 0.08, -1.8, 1.2, 2.52), uvBox(2.4, 1.8, 0.08, 1.8, 1.2, 2.52)];
  const skirtGeos = []; skirt(skirtGeos, 8.0, 5.0);
  eaveTrim(bag, ctx, 0, 0.1, 9.1, 6.4, 2.37, tier);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bag.box(0.26, 1.85, 0.26, { x: sx * 3.4, y: 3.3, z: sz * 2.0, color: DARK });   // upper hashira
  if (hero) {
    bag.box(7.1, 0.1, 4.3, { y: 4.2, color: DARK });                                  // top plate
    bag.box(7.1, 0.08, 4.3, { y: 2.46, color: tint(DARK, 0.03) });                    // sill of the upper wall
    bracket(bag, 0, 2.34, 2.5, 2.9);                                                  // chochin hook
  }
  const parts = { walls_warm: group(warm, wall(ctx, 'plasterWarm')), walls: group(plaster, wall(ctx, 'plaster')),
    roof: group(tile, matOr(ctx, 'roofTile', () => km.tile())), door: group(shoji, matOr(ctx, 'shoji', () => km.paper({ glow: 0.12 }))),
    timber: meshOf(bag.geometry(), bagMat(km)) };
  if (hero) {
    parts.skirt = group(skirtGeos, matOr(ctx, 'namako', () => km.plain(0x2b3036)));
    parts.inuyarai = inuyarai(ctx, 4.12, 0, Math.PI / 2, 3.6);
  }
  return assemble(parts);
}

/* ---------------------------------------------------------------- secret house --- */

function buildSecretHouse(ctx, layout, p) {
  const { tier, kitMaterials: km } = ctx;
  const bag = new Bag();
  const tansu = (x, y, z) => {
    bag.box(1.3, 1.1, 0.65, { x, y, z, color: DARK });
    if (tier === 'far') return;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {        // drawer fronts and brass pulls on the +z face
      const dx = x - 0.32 + c * 0.64, dy = y - 0.33 + r * 0.33;
      bag.box(0.56, 0.27, 0.02, { x: dx, y: dy, z: z + 0.335, color: tint(DARK, 0.05) });
      if (tier === 'hero') bag.box(0.12, 0.03, 0.02, { x: dx, y: dy, z: z + 0.355, color: 0xb08a3a });
    }
  };
  // the two timber side walls, the door-frame backing, the roof-height lintel, the tansu
  bag.box(0.3, 2.6, 5.2, { x: -3.8, y: 1.3, color: DARK });
  bag.box(0.3, 2.6, 5.2, { x: 3.8, y: 1.3, color: DARK });
  bag.box(2.6, 2.2, 0.15, { y: 1.1, z: 2.5, color: DARK });
  tansu(2.6, 0.55, 0.6);
  if (tier === 'far') {
    bag.box(7.8, 2.6, 0.3, { y: 1.3, z: -2.5, color: WARM });
    for (const sx of [-1, 1]) bag.box(2.7, 2.6, 0.3, { x: sx * 2.55, y: 1.3, z: 2.5, color: WARM });
    return assemble({ timber: meshOf(bag.geometry(), bagMat(km)) });
  }
  const hero = tier === 'hero';
  const warm = [uvBox(7.8, 2.6, 0.3, 0, 1.3, -2.5), uvBox(2.7, 2.6, 0.3, -2.55, 1.3, 2.5), uvBox(2.7, 2.6, 0.3, 2.55, 1.3, 2.5)];
  // the kakejiku hanging scroll with its roller (inside the back wall)
  bag.box(1.0, 1.8, 0.04, { y: 1.5, z: -2.32, color: tint(0xb8a47c, -0.02) });
  bag.box(0.65, 1.1, 0.05, { y: 1.5, z: -2.31, color: DARK });
  bag.box(1.15, 0.06, 0.06, { y: 0.58, z: -2.3, color: DARK });
  if (hero) {
    bag.box(2.7, 0.14, 0.2, { y: 2.27, z: 2.5, color: DARK });                        // lintel over the doorway
    bag.box(2.6, 0.06, 0.3, { y: 0.03, z: 2.5, color: tint(DARK, -0.03) });           // threshold with the door's track
    bag.box(0.4, 0.4, 0.04, { x: 0.42, y: 1.65, z: -2.29, color: 0x2a2018 });         // ink stamp of the scroll
    for (const sx of [-1, 1]) bag.box(0.34, 0.3, 5.3, { x: sx * 3.8, y: 0.15, color: 0x2f2119 });  // timber plinth
  }
  return assemble({ walls: group(warm, wall(ctx, 'plasterWarm')), timber: meshOf(bag.geometry(), bagMat(km)) });
}

/* ---------------------------------------------------------------- street house --- */

function buildStreetHouse(ctx, layout, p) {
  const { tier, rng, kitMaterials: km } = ctx;
  const w = layout.w ?? 5, d = layout.d ?? 3.5;
  const key = layout.wallMat === 'plaster' ? 'plaster' : 'plasterWarm';
  const bag = new Bag();
  const post = (sx, sz) => bag.box(0.24, 2.15, 0.24, { x: sx * (w / 2 - 0.1), y: 1.1, z: sz * (d / 2 - 0.1), color: tint(DARK, (rng() - 0.5) * 0.04) });
  bag.box(w + 0.2, 0.26, d + 0.2, { y: 0.13, color: DARK });                          // sill
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) post(sx, sz);
  bag.box(w + 0.12, 0.1, d + 0.12, { y: 2.03, color: DARK });                         // eave beam
  bag.box(w + 0.1, 0.07, 0.06, { y: 1.2, z: d / 2 + 0.025, color: DARK });            // mid rail
  for (const sx of [-1, 1]) bag.box(0.1, 0.95, 0.05, { x: sx * w * 0.3, y: 1.62, z: d / 2 + 0.02, color: DARK });   // wall studs
  bag.box(w * 0.8, 0.16, 0.7, { y: 0.08, z: d / 2 + 0.35, color: ENGAWA });            // front step
  const hero = tier === 'hero';
  if (tier !== 'far') {
    if (hero) {
      bag.box(w * 0.8, 0.05, 0.1, { y: 0.185, z: d / 2 + 0.66, color: tint(ENGAWA, 0.06) });   // step nosing
      for (const sx of [-1, 1]) bag.box(0.12, 0.1, 0.12, { x: sx * (w * 0.4 - 0.15), y: 0.05, z: d / 2 + 0.78, color: 0x8d8a80 });  // stone shoes
    }
    const base = uvBox(w, 2.1, d, 0, 1.05, 0);
    const door = uvBox(1.5, 1.6, 0.07, 0, 1.05, d / 2 + 0.03);
    return assemble({ walls: meshOf(base, wall(ctx, key)), door: meshOf(door, matOr(ctx, 'shojiOff', () => km.paper({}))), timber: meshOf(bag.geometry(), bagMat(km)) });
  }
  bag.box(w, 2.1, d, { y: 1.05, color: key === 'plaster' ? PLASTER : WARM });
  bag.box(1.5, 1.6, 0.07, { y: 1.05, z: d / 2 + 0.03, color: 0xc9b98f });
  return assemble({ timber: meshOf(bag.geometry(), bagMat(km)) });
}

const emptyFootprint = { colliders: [], platforms: [], exclusions: [], waterRects: [], anchors: {}, lists: {} };

export const houseAssets = [
  {
    id: 'tea-house', family: 'machiya', lab: 'machiya/tea-house', label: 'Merchant tea house (Chaya)', legacyName: 'Machiya Tea House (Chaya)',
    params: {}, sample: { index: 0, name: 'Machiya Tea House (Chaya)', x: 0, z: 0, ry: 0, footprint: emptyFootprint },
    floating: ['inuyarai'], build: buildTeaHouse
  },
  {
    id: 'residence', family: 'machiya', lab: 'machiya/residence', label: 'Craftsman machiya residence', legacyName: 'Machiya Residence',
    params: {}, sample: { index: 0, name: 'Machiya Residence', x: 0, z: 0, ry: 0, footprint: emptyFootprint },
    floating: ['inuyarai'], build: buildResidence
  },
  {
    id: 'secret-house', family: 'machiya', lab: 'machiya/secret-house', label: 'Secret machiya (Hisomu-an)', legacyName: 'Secret Machiya (Hisomu-an)',
    params: {}, sample: { index: 0, name: 'Secret Machiya (Hisomu-an)', x: 0, z: 0, ry: 0, footprint: emptyFootprint },
    build: buildSecretHouse
  },
  {
    id: 'street-house', family: 'machiya', lab: 'machiya/street-house', label: 'Street townhouse', legacyName: 'Machiya House',
    params: {}, sample: { index: 0, name: 'Machiya House W1', x: 0, z: 0, ry: 0, side: 'left', wallMat: 'plasterWarm', w: 5.6, d: 3.8, footprint: emptyFootprint },
    build: buildStreetHouse
  }
];
