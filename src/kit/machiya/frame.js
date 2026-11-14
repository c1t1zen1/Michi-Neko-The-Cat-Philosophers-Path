// The machiya's body components: timber-frame (sill, hashira, eave beam),
// namako (the slate-and-lime skirt wall), engawa (the raised veranda) and
// tea-bench (the red-felt mosen bench). Every static piece is plain geometry on
// the game's own MAT entries or the shared vertex-coloured kit bag, so the
// valley's _mergeStatics folds them per material (ruling R36).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Bag, merge, bagMat, matOr, meshOf, assemble, seg, tint, uvBox } from './common.js?v=20261113a';

/* ------------------------------------------------------------ timber-frame --- */

function buildTimberFrame(ctx, layout, p) {
  const { tier, rng, kitMaterials: km } = ctx;
  const { w, d } = layout, post = layout.post ?? 0.3;
  const postX = layout.postX ?? [-w / 2 + 0.4, w / 2 - 0.4], postZ = layout.postZ ?? [-d / 2 + 0.4, d / 2 - 0.4];
  const bag = new Bag(), dark = 0x41302a;
  const bev = tier === 'far' ? 0 : p.bevel;
  const slab = (sw, sh, sd, x, y, z, color) => (bev > 0.002
    ? bag.add(new RoundedBoxGeometry(sw, sh, sd, 1, Math.min(bev, sw / 3, sh / 3, sd / 3)), { x, y, z, color })
    : bag.box(sw, sh, sd, { x, y, z, color }));
  if (p.shoes && tier !== 'far') {
    // the sill rides on stone shoes (ishizue); a dark skirt behind them is the shadow gap
    bag.box(w - 0.16, 0.12, d - 0.16, { y: 0.06, color: 0x241a13 });
    slab(w, 0.18, d, 0, 0.21, 0, dark);
    const cols = Math.max(2, Math.round(w / 1.4)), rows = Math.max(2, Math.round(d / 1.4));
    const shoe = (x, z) => bag.add(new THREE.CylinderGeometry(0.17, 0.2, 0.13, seg(tier, 9, 6, 5)), { x, y: 0.065, z, color: tint(0x8d8a80, (rng() - 0.5) * 0.08) });
    for (let i = 0; i < cols; i++) { const x = -w / 2 + 0.25 + (i / (cols - 1)) * (w - 0.5); shoe(x, d / 2 - 0.12); shoe(x, -d / 2 + 0.12); }
    for (let j = 1; j < rows - 1; j++) { const z = -d / 2 + 0.12 + (j / (rows - 1)) * (d - 0.24); shoe(w / 2 - 0.12, z); shoe(-w / 2 + 0.12, z); }
  } else slab(w, 0.3, d, 0, 0.15, 0, dark);
  slab(w, 0.2, d, 0, 2.4, 0, dark);                                      // eave beam (kept exact: the lower roof ring rests on it)
  for (const px of postX) for (const pz of postZ) {
    slab(post, 2.5, post, px, 1.25, pz, tint(dark, (rng() - 0.5) * 0.04));
    if (tier === 'hero') bag.box(post + 0.06, 0.05, post + 0.06, { x: px, y: 0.33, z: pz, color: 0x2f2119 });   // foot collar
  }
  const mesh = meshOf(bag.geometry(), bagMat(km));
  return assemble({ frame: mesh });
}

/* ------------------------------------------------------------------ namako --- */

function buildNamako(ctx, layout, p) {
  const { tier, kitMaterials: km } = ctx;
  const { w, d } = layout;
  const skirtH = 0.92, skirtY = 0.26 + skirtH / 2, out = 0.022;
  const geos = [], bag = new Bag();
  const fw = (w - 0.5) / 2 - 0.85;
  const add = (sw, sd, x, z) => {
    geos.push(uvBox(sw, skirtH, sd, x, skirtY, z));
    // a dark kick board along the foot and a lime capping rail along the top
    bag.box(sw + (sd > sw ? 0.03 : 0), 0.06, sd + (sd > sw ? 0 : 0.03), { x, y: 0.28, z, color: 0x2e241c });
    if (p.cap && tier !== 'far') bag.box(sw + (sd > sw ? 0.05 : 0), 0.05, sd + (sd > sw ? 0 : 0.05), { x, y: 0.26 + skirtH + 0.02, z, color: 0xe9dfc8 });
  };
  add(w - 0.5, 0.04, 0, -(d / 2 + out));
  for (const sx of [-1, 1]) {
    add(0.04, d - 0.5, sx * (w / 2 + out), 0);
    if (fw > 0.2) add(fw, 0.04, sx * (0.85 + fw / 2), d / 2 + out);
  }
  const wall = meshOf(merge(geos), matOr(ctx, 'namako', () => km.plain(0x2b3036)));
  const trim = bag.empty ? null : meshOf(bag.geometry(), bagMat(km));
  // the skirt starts at y 0.26: the kick board reaches the ground through the sill, so no part floats
  return assemble({ wall, trim });
}

/* ------------------------------------------------------------------ engawa --- */

function buildEngawa(ctx, layout, p) {
  const { tier, rng, kitMaterials: km } = ctx;
  const { w, d } = layout, h = layout.h ?? 0.38;
  const bag = new Bag(), boards = [];
  const n = tier === 'far' ? 1 : Math.max(2, Math.round(d / p.board));
  const bw = d / n, gap = tier === 'hero' ? 0.006 : 0;
  const run = tier === 'hero' ? 2.7 : tier === 'mid' ? 4.2 : w;         // boards butt on a joist every `run`
  const pieces = Math.max(1, Math.round(w / run)), pl = w / pieces;
  for (let i = 0; i < n; i++) for (let k = 0; k < pieces; k++) {
    const off = (k % 2 ? 0.35 : 0) * pl * (i % 2 ? 1 : 0);                // staggered butt joints
    const x0 = -w / 2 + k * pl;
    const a = Math.max(x0, -w / 2 + (k > 0 ? off : 0)), b = Math.min(x0 + pl, w / 2);
    if (b - a > 0.05) boards.push(uvBox(b - a - (pieces > 1 ? gap : 0), 0.1, bw - gap, (a + b) / 2, h - 0.05, -d / 2 + bw * (i + 0.5)));
  }
  const cols = Math.max(2, Math.floor(w / 1.6));
  const rock = (x, z) => { const o = { x, y: (h - 0.1) / 2, z, color: tint(0xa9a69b, (rng() - 0.5) * 0.1) }; return tier === 'far' ? bag.box(0.24, h - 0.1, 0.24, o) : bag.add(new RoundedBoxGeometry(0.24, h - 0.1, 0.24, 1, 0.04), o); };
  for (let i = 0; i < cols; i++) {
    const px = -w / 2 + 0.3 + (i / (cols - 1)) * (w - 0.6);
    rock(px, d / 2 - 0.2); rock(px, -d / 2 + 0.2);
  }
  if (p.joists && tier !== 'far') {                                      // dark beams the boards sit on
    bag.box(w - 0.1, 0.07, 0.1, { y: h - 0.135, z: d / 2 - 0.2, color: 0x35261c });
    bag.box(w - 0.1, 0.07, 0.1, { y: h - 0.135, z: -d / 2 + 0.2, color: 0x35261c });
    if (tier === 'hero') bag.box(w, 0.06, 0.08, { y: h - 0.07, z: d / 2 + 0.005, color: 0x41302a });   // front edge beam
  }
  if (p.step) {                                                          // kutsunugi-ishi, a boot-removing stone
    if (tier === 'far') bag.box(0.9, 0.18, 0.5, { y: 0.09, z: d / 2 + 0.3, color: 0x8f8c82 });
    else bag.add(new RoundedBoxGeometry(0.9, 0.18, 0.5, 2, 0.05), { y: 0.09, z: d / 2 + 0.3, color: 0x8f8c82 });
  }
  const board = meshOf(merge(boards), matOr(ctx, 'timberEngawa', () => km.wood({ base: 0x98704f, dark: 0x58402e })));
  return assemble({ deck: board, base: meshOf(bag.geometry(), bagMat(km)) });
}

/* ---------------------------------------------------------------- tea-bench --- */

const FELT = { scarlet: 0xb52b22, indigo: 0x28405e, moss: 0x5b6b3a };

function buildTeaBench(ctx, layout, p) {
  const { tier, rng, kitMaterials: km } = ctx;
  const bag = new Bag();
  const wood = 0x41302a;
  // classic: a 2.2 x 0.42 x 0.9 cushion on a 2.25 x 0.06 x 0.95 plinth
  bag.box(2.25, 0.06, 0.95, { y: 0.03, color: 0x35261c });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bag.box(0.08, 0.12, 0.08, { x: sx * 1.05, y: 0.09, z: sz * 0.4, color: wood });
  bag.box(2.2, 0.05, 0.9, { y: 0.145, color: tint(wood, 0.04) });
  const ci = tier === 'far' ? null : 1;
  if (!ci) bag.box(2.2, 0.22, 0.9, { y: 0.31, color: FELT[p.felt] });
  else {
    const felt = FELT[p.felt];
    bag.add(new RoundedBoxGeometry(2.2, 0.27, 0.9, 2, 0.07), { y: 0.285, color: felt });
    if (tier === 'hero') {
      bag.box(2.04, 0.012, 0.012, { y: 0.419, z: 0.3, color: tint(felt, 0.07) });          // piping seams
      bag.box(2.04, 0.012, 0.012, { y: 0.419, z: -0.3, color: tint(felt, 0.07) });
      bag.box(0.012, 0.012, 0.76, { y: 0.419, x: 0, color: tint(felt, 0.07) });
    }
  }
  if (p.tray && tier !== 'far') {                                         // a tea tray, two bowls and a pot
    bag.box(0.5, 0.025, 0.3, { x: 0.45, y: 0.435, z: 0.05, color: 0x2a1d14 });
    for (const [x, z] of [[0.3, 0.05], [0.62, 0.1]]) bag.add(new THREE.CylinderGeometry(0.05, 0.035, 0.05, seg(tier, 12, 7, 5)), { x, y: 0.475, z, color: 0xe6dcc6 });
    bag.add(new THREE.SphereGeometry(0.065, seg(tier, 10, 7, 5), 6).scale(1, 0.8, 1), { x: 0.45, y: 0.492, z: -0.02, color: 0x32302d });
  }
  return assemble({ bench: meshOf(bag.geometry(), bagMat(km)) });
}

export const frameAssets = [
  {
    id: 'timber-frame', family: 'machiya', lab: 'machiya/frame', label: 'Timber frame', legacyName: 'Timber Frame',
    params: {
      bevel: { type: 'number', default: 0.012, min: 0, max: 0.03, step: 0.004, label: 'Edge bevel' },
      shoes: { type: 'boolean', default: true, label: 'Stone shoes under the sill' }
    },
    sample: { index: 0, w: 8.2, d: 5.6, post: 0.32, postX: [-3.8, 0, 3.8], postZ: [-2.6, 2.6] },
    build: buildTimberFrame
  },
  {
    id: 'namako', family: 'machiya', lab: 'machiya/namako', label: 'Namako skirt wall',
    params: { cap: { type: 'boolean', default: true, label: 'Lime capping rail' } },
    floating: ['wall', 'trim'],   // the skirt stands on the timber-frame sill (a sibling component)
    sample: { index: 0, w: 5.6, d: 3.8 },
    build: buildNamako
  },
  {
    id: 'engawa', family: 'machiya', lab: 'machiya/engawa', label: 'Engawa veranda', legacyName: 'Engawa Veranda',
    params: {
      board: { type: 'number', default: 0.14, min: 0.08, max: 0.22, step: 0.02, label: 'Board width' },
      joists: { type: 'boolean', default: true, label: 'Beams under the deck' },
      step: { type: 'boolean', default: true, label: 'Boot stone' }
    },
    sample: { index: 0, w: 8.2, d: 1.4, h: 0.42 },
    build: buildEngawa
  },
  {
    id: 'tea-bench', family: 'machiya', lab: 'machiya/bench', label: 'Tea bench (mosen)',
    params: {
      felt: { type: 'enum', default: 'scarlet', options: ['scarlet', 'indigo', 'moss'], label: 'Felt' },
      tray: { type: 'boolean', default: false, label: 'Tea tray' }
    },
    sample: { index: 0, x: -2.2, z: 3.6 },
    build: buildTeaBench
  }
];
