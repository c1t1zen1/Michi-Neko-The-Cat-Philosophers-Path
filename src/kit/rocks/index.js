// Rocks family (Phase 2, wave 2.1): lab 13 "chisel" rocks for the valley.
//   path-boulders  the boulders along both sides of the cobbled road
//   key-rock       the rock the antique key hides behind, with two companions
// Params are general (size, moss, weathering, facets) so the summit's brow
// stones (s2-clearing) can reuse the same builders.
import { defineAsset } from '../contract.js?v=20261113a';
import { DETAIL, KEY_DETAIL, weatherOpts, variantRock, fitRock, placed, bake, rockMaterials } from './stone.js?v=20261113a';
import { rockGeometry, withUv } from '../craft.js?v=20261113a';

const PARAMS = {
  size: { type: 'number', default: 1, min: 0.6, max: 1.5, step: 0.05, label: 'Size' },
  moss: { type: 'number', default: 0.4, min: 0, max: 1.5, step: 0.1, label: 'Moss' },
  weathering: { type: 'number', default: 0.5, min: 0, max: 1, step: 0.1, label: 'Weathering' },
  facets: { type: 'number', default: 8, min: 3, max: 12, step: 1, label: 'Chisel cuts' }
};

const seedOf = (r) => 1 + Math.floor(r() * 9000);

/* ---------------------------------------------------------- path-boulders --- */

// Classic stones sit in a tumbled dodecahedron; the chiselled ones keep a
// seated base, so only a small tilt is taken from the layout's tumble.
function buildPathBoulders(ctx, layout, p) {
  const { THREE: T, tier, rng, kitMaterials: km } = ctx;
  const det = DETAIL[tier] || DETAIL.mid;
  const opts = weatherOpts(p.weathering, p.facets);
  const bigV = [0, 1, 2].map(() => variantRock(seedOf(rng), det[0], opts));
  const smallV = [0, 1, 2].map(() => variantRock(seedOf(rng), det[1], opts));
  const mats = rockMaterials(km, p.moss);
  const buckets = { stone: [], stoneDark: [] };
  (layout.rocks || []).forEach(({ s, mat, position, scale, rotation }, i) => {
    const pool = s > 0.5 ? bigV : smallV;
    const geo = pool[i % pool.length];
    // rotation arrives as 0..PI Euler angles; fold to a +-0.16 rad lean so stones stay seated
    const tilt = [(rotation[0] % Math.PI - Math.PI / 2) * 0.1, rotation[1], (rotation[2] % Math.PI - Math.PI / 2) * 0.1];
    // half extents ~ the classic dodecahedron's, so the collider footprint fits
    const k = p.size, sc = [scale[0] * 0.95 * k, scale[1] * 1.0 * k, scale[2] * 0.95 * k];
    buckets[mat === 'stoneDark' ? 'stoneDark' : 'stone'].push(placed(geo, position, tilt, sc));
  });
  for (const g of [...bigV, ...smallV]) g.dispose();
  const group = new T.Group();
  const parts = {};
  for (const [key, name] of [['stone', 'boulders_light'], ['stoneDark', 'boulders_dark']]) {
    const geo = bake(buckets[key]);
    if (!geo) continue;
    const mesh = new T.Mesh(geo, mats[key]);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    parts[name] = mesh;
  }
  if (!Object.keys(parts).length) { const e = new T.Group(); group.add(e); parts.boulders_light = e; }
  return { group, parts, sockets: {}, live: [] };
}

/* --------------------------------------------------------------- key-rock --- */

// Classic: main dodecahedron r=0.78 (detail 1) scaled 1.35/1.0/0.9, centre y 0.58,
// yaw 0.38; two low companions. Half extents below match their bounds.
const MAIN = { half: [1.02, 0.78, 0.7], pos: [0, 0.58, 0], rot: [0.12, 0.38, -0.08] };
const COMPANIONS = [
  { half: [0.3, 0.22, 0.3], pos: [-0.68, 0.165, 0.28], key: 'stone_a', mat: 'stone' },
  { half: [0.24, 0.18, 0.24], pos: [0.55, 0.132, 0.35], key: 'stone_b', mat: 'stone' }
];

function buildKeyRock(ctx, layout, p) {
  const { THREE: T, tier, rng, kitMaterials: km } = ctx;
  const det = KEY_DETAIL[tier] || KEY_DETAIL.mid;
  const opts = weatherOpts(p.weathering, p.facets);
  const mats = rockMaterials(km, p.moss);
  const group = new T.Group();
  const parts = {};
  const add = (key, geo, mat, pos, rot) => {
    const mesh = new T.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    parts[key] = mesh;
  };
  const k = p.size;
  const main = withUv(fitRock(rockGeometry(seedOf(rng), { detail: det[0], ...opts, h: 0.9 }), MAIN.half[0] * k, MAIN.half[1] * k, MAIN.half[2] * k), 1);
  add('rock', main, mats.stoneDark, [MAIN.pos[0], MAIN.pos[1] * k, MAIN.pos[2]], MAIN.rot);
  COMPANIONS.forEach((c, i) => {
    const g = withUv(fitRock(rockGeometry(seedOf(rng), { detail: det[1], ...opts }), c.half[0] * k, c.half[1] * k, c.half[2] * k), 1);
    const yaw = (layout.stoneYaw && layout.stoneYaw[i]) || 0;
    add(c.key, g, mats[c.mat], [c.pos[0] * k, c.pos[1] * k, c.pos[2] * k], [0.05, yaw, 0.04]);
  });
  return { group, parts, sockets: {}, live: [] };
}

/* ------------------------------------------------------------------ sample --- */

function samplePathBoulders() {
  const r = (() => { let a = 7; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
  const rocks = [];
  for (let i = 0; i < 12; i++) {
    const big = i % 5 === 2;
    const s = big ? 0.6 + r() * 0.4 : 0.2 + r() * 0.3;
    rocks.push({
      s, mat: i % 2 ? 'stone' : 'stoneDark',
      position: [(i - 6) * 1.1, s * 0.45, (i % 2 ? 1 : -1) * (0.4 + r())],
      scale: [s * (0.8 + r() * 0.5), s * (0.6 + r() * 0.7), s * (0.8 + r() * 0.5)],
      rotation: [r() * Math.PI, r() * Math.PI, r() * Math.PI]
    });
  }
  return { index: 0, rocks };
}

export const assets = [
  defineAsset({
    id: 'path-boulders', family: 'rocks', lab: 'rocks/chisel', label: 'Path boulders',
    params: PARAMS, tiers: ['hero', 'mid', 'far'], sample: samplePathBoulders, build: buildPathBoulders
  }),
  defineAsset({
    id: 'key-rock', family: 'rocks', lab: 'rocks/chisel', label: 'Key-hiding rock', legacyName: 'Key Hiding Rock',
    params: PARAMS, tiers: ['hero', 'mid', 'far'], sample: { x: 0, z: 0, stoneYaw: [0.6, 2.2], index: 0, name: 'Key Hiding Rock' }, build: buildKeyRock
  })
];
