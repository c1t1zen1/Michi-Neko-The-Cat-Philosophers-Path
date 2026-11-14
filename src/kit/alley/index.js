// Alley family (Phase 2, wave 2.1): lab 16 "alley" props the cat walks past.
//   crates       the four-step climb stack (slatted crates; tops = the classic platforms)
//   sake-barrel  the barrel beside the bottom crates (a component of crates)
// Static, plain merged geometry on ONE kit material (km.bag, vertex colour) so
// _mergeStatics folds every instance into a single draw call (ruling R36).
// Gameplay: the climb platforms come from layout.footprint, built in
// countryside.layoutClimbCrates, so crate sizes/positions here only have to
// match those boxes visually (outer sizes are identical to the classic boxes).
import * as THREE from 'three';
import { defineAsset } from '../contract.js?v=20261113a';
import { Bag } from '../craft.js?v=20261113a';

const COURSES = { hero: 4, mid: 3, far: 1 };

// The classic stack: [name, w, h, d, x, y(centre), z, wood colours]
const STACK = [
  ['crate_a', 0.9, 0.65, 0.9, -0.5, 0.325, 0, [0x8f6c42, 0x7e5e38, 0x9a7a4e]],
  ['crate_b', 0.9, 0.65, 0.9, 0.5, 0.325, 0, [0x6e5236, 0x5f452d, 0x7a5c3e]],
  ['crate_c', 0.85, 0.65, 0.85, -0.45, 0.975, 0, [0xa58660, 0x96794f, 0xb3946a]],
  ['crate_d', 0.75, 0.65, 0.75, -0.4, 1.625, -0.3, [0x8f6c42, 0x7e5e38, 0x9a7a4e]]
];

const PARAMS = {
  wear: { type: 'number', default: 0.5, min: 0, max: 1, step: 0.1, label: 'Wear' }
};

const tint = (hex, k) => {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, k);
  return c.getHex();
};

/** One slatted crate of outer size w x h x d centred on (ox, oy, oz). */
function addCrate(bag, w, h, d, ox, oy, oz, cols, tier, r, wear) {
  const n = COURSES[tier] || 3, t = 0.035, y0 = oy - h / 2;
  bag.box(w - 0.02, h - 0.02, d - 0.02, { x: ox, y: oy, z: oz, color: 0x2a1d12 });   // dark core: light between slats
  if (n === 1) { bag.box(w, h, d, { x: ox, y: oy, z: oz, color: cols[0] }); return; }
  const sh = h / n;
  for (let i = 0; i < n; i++) {
    const cy = y0 + sh * (i + 0.5), sz = sh * (0.9 - 0.04 * wear * r());
    for (const s of [-1, 1]) {
      bag.box(w, sz, t, { x: ox, y: cy, z: oz + s * (d / 2 - t / 2), color: tint(cols[(i + (s > 0 ? 1 : 0)) % 3], (r() - 0.5) * 0.05 * (1 + wear)) });
      bag.box(t, sz, d - 2 * t, { x: ox + s * (w / 2 - t / 2), y: cy, z: oz, color: tint(cols[(i + 2) % 3], (r() - 0.5) * 0.05 * (1 + wear)) });
    }
  }
  const m = tier === 'hero' ? 4 : 3;               // lid and floor boards
  for (let i = 0; i < m; i++) {
    const bx = ox - w / 2 + (i + 0.5) * (w / m);
    bag.box(w / m - 0.012, 0.03, d - 0.01, { x: bx, y: oy + h / 2 - 0.015, z: oz, color: tint(cols[i % 3], (r() - 0.5) * 0.06) });
  }
  bag.box(w - 0.04, 0.03, d - 0.04, { x: ox, y: y0 + 0.015, z: oz, color: cols[0] });
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    bag.box(0.045, h, 0.045, { x: ox + sx * (w / 2 - 0.0225), y: oy, z: oz + sz * (d / 2 - 0.0225), color: tint(cols[0], -0.08) });
  if (tier === 'hero') for (const s of [-1, 1])    // a couple of rope-bound battens
    bag.box(w + 0.01, 0.03, 0.012, { x: ox, y: oy + h * 0.1, z: oz + s * (d / 2 + 0.002), color: 0x8a7248 });
}

function buildCrates(ctx, layout, p) {
  const { THREE: T, tier, rng, kitMaterials: km } = ctx;
  const mat = km.bag({ rough: 0.85, grime: 0.4, grimeH: 0.3 });
  const group = new T.Group();
  const bag = new Bag();
  for (const [, w, h, d, x, y, z, cols] of STACK) addCrate(bag, w, h, d, x, y, z, cols, tier, rng, p.wear);
  const mesh = bag.mesh(mat);
  mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);
  const parts = { stack: mesh };
  return { group, parts, sockets: {}, live: [] };
}

/* ------------------------------------------------------------- sake barrel --- */

const SEG = { hero: 24, mid: 14, far: 8 };
// classic: CylinderGeometry(0.38, 0.34, 0.75) on the ground; the belly stays inside r 0.38
const PROFILE = [[0.001, 0], [0.3, 0], [0.335, 0.03], [0.365, 0.2], [0.38, 0.375], [0.365, 0.55], [0.345, 0.72], [0.325, 0.75], [0.001, 0.75]];

function buildSakeBarrel(ctx, layout, p) {
  const { THREE: T, tier, rng, kitMaterials: km } = ctx;
  const seg = SEG[tier] || SEG.mid;
  const bag = new Bag();
  const body = new T.LatheGeometry(PROFILE.map(([x, y]) => new T.Vector2(x, y)), seg);
  bag.add(body, { color: tint(0x8a6a44, (rng() - 0.5) * 0.04 + 0.03 * (1 - p.wear)) });
  if (tier !== 'far') {
    const hoop = tier === 'hero' ? 6 : 5;
    for (const [y, rad] of [[0.07, 0.34], [0.22, 0.373], [0.52, 0.373], [0.68, 0.342]])
      bag.add(new T.TorusGeometry(rad + 0.004, 0.014, 5, seg * 2).rotateX(Math.PI / 2), { y, color: 0x3e3226 });
    if (tier === 'hero') bag.add(new T.TorusGeometry(0.3, 0.012, 5, 20).rotateX(Math.PI / 2), { y: 0.752, color: 0x3a2c1d });
    if (p.crest) bag.add(new T.CylinderGeometry(0.1, 0.1, 0.02, hoop * 3).rotateX(Math.PI / 2), { y: 0.375, z: 0.372, color: 0xa02e22 });
  }
  const mesh = bag.mesh(km.bag({ rough: 0.85, grime: 0.4, grimeH: 0.3 }));
  mesh.castShadow = mesh.receiveShadow = true;
  const group = new T.Group();
  group.add(mesh);
  return { group, parts: { barrel: mesh }, sockets: {}, live: [] };
}

export const assets = [
  defineAsset({
    id: 'crates', family: 'alley', lab: 'alley/crate', label: 'Climb crates', legacyName: 'Climb Crates',
    params: PARAMS, tiers: ['hero', 'mid', 'far'], sample: { x: 0, y: 0, z: 0, ry: 0, index: 0, name: 'Climb Crates' }, build: buildCrates
  }),
  defineAsset({
    id: 'sake-barrel', family: 'alley', lab: 'alley/komodaru', label: 'Sake barrel',
    params: { ...PARAMS, crest: { type: 'boolean', default: true, label: 'Crest' } },
    tiers: ['hero', 'mid', 'far'], sample: { x: 0.5, y: 0, z: 0.9, index: 0 }, build: buildSakeBarrel
  })
];
