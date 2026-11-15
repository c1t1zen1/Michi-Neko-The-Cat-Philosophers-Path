// Roof Road street props (lane r2-roofs-streets): crates, barrels, komodaru,
// lantern posts, yuka decks, utility poles, trellises. Each builds in the
// piece's rail frame (local x along the rail at layout.s, y up, z toward the
// camera at depth piece.d) from the level record `layout.piece`, with the
// classic piece's exact outer sizes so the platform tops stay where level.js
// put them (gameplay is geometry). Static plain merged geometry, one mesh per
// material. The Roof Road's own merge (pieces/common.js mergeByMaterial) keeps
// position/normal/uv only and drops vertex colours, so the shared vertex-coloured
// kit materials render black here: every colour is a real material instead
// (km.wood/plain/straw/bamboo, memoised, so every prop shares them; each is
// merged once across the run). See the handoff for the colour-attribute patch.
import * as THREE from 'three';
import { Bag } from '../craft.js?v=20261114a';
import { worldScaleBoxUVs } from '../../textures.js?v=20261114a';

/**
 * Material key -> [the Roof Road's own material name in ctx.MAT, kit fallback].
 * On the Roof Road ctx.MAT is the page's material set M, so a kit prop lands in
 * the SAME merge bucket as the classic one (no added draw calls, ruling R52).
 * Anywhere else (the contract test, the valley) the kit fallback is used.
 */
const MATS = {
  wood: ['agedWood', (km) => km.wood({ base: 0x8f6c42, dark: 0x5a3e26 })],
  timber: ['timber', (km) => km.wood({ base: 0x5a3e26, dark: 0x2c1b12 })],
  dark: ['dark', (km) => km.plain(0x2a1d14, { rough: 0.9 })],
  steel: ['steel', (km) => km.plain(0x5d6168, { rough: 0.5, metal: 0.6 })],
  red: ['lacquer', (km) => km.plain(0xc8402a, { rough: 0.7 })],
  leaf: ['foliage', (km) => km.plain(0x4f7a32, { rough: 0.85 })],
  wist: ['wisteria', (km) => km.plain(0xbda0c6, { rough: 1 })],
  bamboo: ['bamboo', (km) => km.bamboo({ color: 0xa8a45a })],
  straw: ['twine', (km) => km.straw({ color: 0xb59a62 })],
  cream: ['enamel', (km) => km.plain(0xe8e0cc, { rough: 0.6 })]
};
const material = (ctx, key) => (ctx.MAT && ctx.MAT[MATS[key][0]]) || MATS[key][1](ctx.kitMaterials);

/** Per-material Bags; add(geo, { …, m: 'wood' }) routes into the right one. */
class Multi {
  constructor() { this.bags = new Map(); }
  bag(m) { if (!this.bags.has(m)) this.bags.set(m, new Bag()); return this.bags.get(m); }
  add(geo, o) { const { m, ...rest } = o; this.bag(m).add(geo, rest); return this; }
  box(w, h, d, o) {   // own geometry so the texture scale matches the classic box (worldScaleBoxUVs)
    const { m, x = 0, y = 0, z = 0, ...rest } = o;
    const g = worldScaleBoxUVs(new THREE.BoxGeometry(w, h, d), 1);
    this.bag(m).add(g, { x, y, z, ...rest });
    return this;
  }
  cyl(r, h, o) { const { m, ...rest } = o; this.bag(m).cyl(r, h, rest); return this; }
}

const SEG = { hero: 20, mid: 12, far: 7 };
const LEAF = new THREE.IcosahedronGeometry(1, 0);   // 20 triangles: a leaf clump
const blob = (bag, r, o) => bag.add(LEAF, { ...o, sx: r, sy: r * (o.sy || 1), sz: r });

function finish(ctx, multi, name, extra = {}) {
  const group = new THREE.Group(), parts = {};
  for (const [key, bag] of multi.bags) {
    const mesh = bag.mesh(material(ctx, key), `${name}_${key}`);
    if (!mesh) continue;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    parts[`${name}_${key}`] = mesh;
  }
  return { group, parts, sockets: {}, live: [], ...extra };
}

/* ---------------------------------------------------------------- crate --- */

/** A slatted crate w x h x d standing on y = 0, centred on (x, z). */
function addCrate(bag, w, h, d, x, z, tier, r, wear) {
  const n = tier === 'hero' ? 4 : tier === 'mid' ? 3 : 1;
  if (n === 1) { bag.box(w, h, d, { x, y: h / 2, z, m: 'wood' }); return; }
  const t = 0.045;
  bag.box(w - 0.02, h - 0.02, d - 0.02, { x, y: h / 2, z, m: 'dark' });
  const sh = h / n;
  for (let i = 0; i < n; i++) {
    const cy = sh * (i + 0.5), sz = sh * (0.92 - 0.04 * wear * r());
    for (const a of [-1, 1]) {
      bag.box(w, sz, t, { x, y: cy, z: z + a * d / 2, m: 'wood' });
      bag.box(t, sz, d, { x: x + a * w / 2, y: cy, z, m: 'wood' });
    }
  }
  bag.box(w, 0.06, d, { x, y: 0.03, z, m: 'wood' });
  for (const a of [-1, 1]) for (const b of [-1, 1]) bag.box(0.06, h, 0.06, { x: x + a * w * 0.43, y: h / 2, z: z + b * d * 0.43, m: 'timber' });
  // top slats: the landing surface, flush at exactly h
  const m = tier === 'hero' ? 4 : 3;
  for (let k = 0; k < m; k++) bag.box(w / m - 0.01, 0.045, d, { x: x - w / 2 + (k + 0.5) * (w / m), y: h - 0.0225, z, m: 'wood' });
}

export function buildCrate(ctx, layout, p) {
  const pc = layout.piece;
  const bag = new Multi();
  addCrate(bag, pc.s1 - pc.s0, pc.y, 0.65, 0, pc.d, ctx.tier, ctx.rng, p.wear);
  return finish(ctx, bag, 'crate');
}

/* ----------------------------------------------------------- barrels --- */

function cask(bag, tier, x, z, h, rad, mats, strawBound, wear) {
  const seg = SEG[tier];
  const prof = [[0.78 * rad, 0], [rad, h * 0.16], [rad * 1.05, h * 0.5], [rad, h * 0.84], [rad * 0.78, h]];
  bag.add(new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), seg), { x, z, m: mats[0] });
  bag.add(new THREE.CylinderGeometry(rad * 0.8, rad * 0.8, 0.04, seg), { x, y: h - 0.02, z, m: mats[1] });   // lid
  if (tier === 'far') return;
  for (const f of [0.1, 0.44, 0.75]) {
    const rr = rad * (f === 0.44 ? 1.06 : 0.98);
    bag.add(new THREE.TorusGeometry(rr, 0.018 * (1 + 0.4 * wear), 5, seg * 2).rotateX(Math.PI / 2), { x, y: h * f / 0.82, z, m: strawBound ? 'timber' : 'steel' });
  }
  if (tier === 'hero' && strawBound)    // straw rope bands plus a red crest, as a komodaru wears
    bag.add(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 14).rotateX(Math.PI / 2), { x, y: h * 0.5, z: z + rad * 1.05, m: 'red' });
}

export function buildBarrel(ctx, layout, p) {
  const pc = layout.piece, bag = new Multi();
  cask(bag, ctx.tier, 0, pc.d, pc.y, (pc.s1 - pc.s0) / 2, ['wood', 'wood'], false, p.wear);
  return finish(ctx, bag, 'barrel');
}
export function buildKomodaru(ctx, layout, p) {
  const pc = layout.piece, bag = new Multi();
  cask(bag, ctx.tier, 0, pc.d, pc.y, (pc.s1 - pc.s0) / 2, ['straw', 'straw'], true, p.wear);
  return finish(ctx, bag, 'cask');
}

/* ----------------------------------------------------------- lantern post --- */

export function buildLanternPost(ctx, layout) {
  const pc = layout.piece, { y, d } = pc, bag = new Multi(), tier = ctx.tier;
  bag.box(0.1, y - 1.4, 0.1, { y: 1.4 + (y - 1.4) / 2, z: d, m: 'timber' });
  if (tier !== 'far') {
    bag.box(0.3, 0.05, 0.3, { y: y - 0.02, z: d, m: 'timber' });
    for (const yy of [y - 0.12, 1.5]) bag.box(0.13, 0.055, 0.13, { y: yy, z: d, m: 'steel' });
    for (const s of [-1, 1]) bag.box(0.035, 0.38, 0.04, { x: s * 0.1, y: y - 0.18, z: d, rz: s * -0.48, m: 'timber' });
  }
  bag.cyl(0.16, 0.4, { y: y - 0.35, z: d + 0.25, m: 'red' });
  const out = finish(ctx, bag, 'post');
  const lamp = new THREE.Object3D();
  lamp.position.set(0, y - 0.35, d + 0.3);
  out.group.add(lamp);
  out.sockets.light = lamp;
  return out;
}

/* ------------------------------------------------------------ yuka deck --- */

export function buildYuka(ctx, layout) {
  const pc = layout.piece, w = pc.s1 - pc.s0, { y, d } = pc, bag = new Multi(), tier = ctx.tier;
  if (pc.style === 'plank') {
    bag.box(w, 0.08, 0.5, { y: y - 0.04, z: d, m: 'timber' });
    if (tier !== 'far') for (const z of [-0.26, 0.26]) bag.box(w, 0.05, 0.05, { y: y + 0.55, z: d + z, m: 'red' });
    return finish(ctx, bag, 'plank');
  }
  bag.box(w, 0.12, 2.6, { y: y - 0.06, z: d, m: 'timber' });
  for (let x = -w / 2 + 0.2; x <= w / 2 - 0.15; x += 1.6) for (const z of [d - 1.2, d + 1.2]) bag.box(0.12, y, 0.12, { x, y: y / 2, z, m: 'timber' });
  bag.box(w, 0.06, 0.06, { y: y + 0.55, z: d + 1.28, m: 'timber' });
  if (tier !== 'far') for (let x = -w / 2 + 1.2; x < w / 2 - 0.8; x += 2.4) {
    bag.box(0.9, 0.3, 0.55, { x, y: y + 0.15, z: d - 0.2, m: 'dark' });
    for (const dx of [-0.6, 0.6]) bag.box(0.4, 0.06, 0.4, { x: x + dx, y: y + 0.03, z: d - 0.2, m: 'red' });
  }
  return finish(ctx, bag, 'deck');
}

/* --------------------------------------------------------- utility pole --- */

export function buildUtilityPole(ctx, layout) {
  const pc = layout.piece, { d, lowY, highY } = pc, h = highY + 0.7, tier = ctx.tier, bag = new Multi();
  const wood = 0x5a3e26;
  bag.add(new THREE.CylinderGeometry(0.075, 0.115, h, tier === 'far' ? 5 : 9), { y: h / 2, z: d, m: 'timber' });
  for (const [y, w] of [[lowY, 0.9], [highY, 1.04]]) {
    bag.box(w, 0.09, 0.11, { y: y - 0.045, z: d, m: 'timber' });
    if (tier !== 'far') for (const s of [-1, 1]) bag.cyl(0.07, 0.18, { x: s * w * 0.4, y: y + 0.1, z: d, m: 'cream' });
  }
  if (tier !== 'far') {
    bag.box(0.3, 0.18, 0.3, { y: 0.09, z: d, m: 'steel' });
    for (const y of [0.45, lowY - 0.18, highY - 0.18]) bag.cyl(0.12, 0.05, { y, z: d, m: 'steel' });
    for (const y of [lowY, highY]) for (const s of [-1, 1]) bag.box(0.025, 0.5, 0.025, { x: s * 0.185, y: y - 0.27, z: d, rz: s * -0.7, m: 'timber' });
    if (tier === 'hero') {
      bag.box(0.16, 0.28, 0.018, { x: 0.02, y: 1.45, z: d + 0.116, rz: 0.04, m: 'straw' });
      for (let y = 0.7; y < lowY; y += 0.6) bag.box(0.3, 0.025, 0.045, { x: 0.12, y, z: d, m: 'steel' });
    }
    if (pc.wireSpan) for (const z of [-0.17, 0.17]) {
      const pts = [];
      for (let j = 0; j <= 8; j++) { const u = j / 8; pts.push(new THREE.Vector3(u * pc.wireSpan, highY + 0.16 - Math.sin(Math.PI * u) * 0.36, d + z)); }
      bag.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.012, 4, false), { m: 'dark' });
    }
  }
  return finish(ctx, bag, 'pole');
}

/* ------------------------------------------------------------- trellis --- */

export function buildTrellis(ctx, layout) {
  const pc = layout.piece, w = pc.s1 - pc.s0, { y, d } = pc, tier = ctx.tier, r = ctx.rng, bag = new Multi();
  for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) for (const z of [-0.65, 0.65]) bag.add(new THREE.CylinderGeometry(0.025, 0.025, y, tier === 'far' ? 4 : 7), { x, y: y / 2, z: d + z, m: 'bamboo' });
  for (const z of [-0.65, 0, 0.65]) bag.box(w, 0.07, 0.07, { y: y - 0.035, z: d + z, m: 'bamboo' });
  const step = tier === 'far' ? 0.7 : 0.35;
  for (let x = -w / 2; x <= w / 2; x += step) bag.box(0.045, 0.05, 1.5, { x, y: y - 0.025, z: d, m: 'bamboo' });
  if (tier !== 'far') {
    const wist = pc.flower === 'wisteria';
    for (const [z, off] of [[d - 0.4, 0], [d + 0.6, 3]]) for (let x = -w / 2; x < w / 2; x += tier === 'hero' ? 0.43 : 0.7) {
      const yy = y + 0.1 + Math.sin(x * 1.7 + off) * 0.12, drop = 0.2 + r() * 0.42;
      bag.box(0.03, drop, 0.03, { x: x + 0.1, y: yy - drop / 2, z: z + 0.1, m: 'timber' });
      blob(bag, 0.085, { x: x + 0.1, y: yy - drop, z: z + 0.1, sy: 0.7, m: 'leaf' });
      blob(bag, 0.1, { x, y: yy, z, sy: 0.6, m: 'leaf' });
      if (wist && r() > 0.6) for (let j = 0; j < 4; j++) blob(bag, 0.06 - j * 0.008, { x, y: yy - 0.16 - j * 0.1, z, sy: 1.2, m: 'wist' });
    }
  }
  return finish(ctx, bag, 'trellis');
}
