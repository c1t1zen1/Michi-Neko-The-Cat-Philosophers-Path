// Tree builders for the trees family (Phase 2, wave 2.3, lab 'trees').
//
// A tree is a trunk (a curved spine with a root collar, buttress flares and
// surface roots), its limbs and a canopy. The canopy is foliage.js's own
// buildCanopy in three styles, chosen by tier and by hero / rim:
//   'leaves'  hero trees in the play field: leaf sprays on twigs (flex wind)
//   'masses'  rim trees: painted leaf masses (tuft cores, no cards)
//   'clumps'  the summit's habit: tuft cores fringed with leaf cards
// Everything is drawn from `ctx.rng`; materials are shared module-wide (one
// foliage material per kind, like the classic vegetation), the bark comes
// from ctx.kitMaterials so trunks and rim limbs merge with the valley.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  buildCanopy, createFoliageMaterial, createFoliageDepthMaterial, createBranchMaterial,
  leafSprayTexture, leafMassTexture, leafCardTexture
} from '../../foliage.js?v=20261113a';

// One wind strength for every hero canopy: twig and leaf materials must share it.
export const TREE_WIND = 1.1;

/** The three species the valley plants, ported from Vegetation.sakuraTree / mapleTree / pineTree. */
export const SPECIES = {
  sakura: {
    id: 'sakura', label: 'Sakura', massKey: 'blossom', sprayKey: 'sakura', cardKey: 'sakura',
    colors: [0xd27a94, 0xeaa2b6, 0xf6c6d2, 0xfbdde6],
    trunk: { rTop: 0.13, rBot: 0.22, h: 2.3, lean: 0.14 },
    canopy: { primaries: 6, tilt: 0.9, tiltVar: 0.2, droop: -0.08, bend: 0.14, branchLen: 1.5, secondaries: 2 },
    leaves: { habit: 'cloud', twigsPerLimb: 3, sprigs: 2, sprayLen: 0.46, sprayAspect: 1, density: 17, tipSprays: 3, colors: [0xe4a2b6, 0xf0bccb, 0xf8d4de, 0xfde8ee] },
    masses: { twigs: false, crownFill: 3, clumpR: 0.5, tuftsPerClump: [3, 3, 2], tuftFlat: 0.74, lump: 0.4, seed: 11 },
    clumps: { crownFill: 3, clumpR: 0.5, tuftsPerClump: [3, 3, 2], cardsPerClump: [10, 9, 6], cardSize: 0.68, tuftFlat: 0.74, lump: 0.4, seed: 11 },
    collider: 0.35, bark: 'warm', buttress: 0.5
  },
  maple: {
    id: 'maple', label: 'Maple', massKey: 'leaf', sprayKey: 'maple', cardKey: 'broadleaf',
    colors: [0x8e2d20, 0xc24a34, 0xe0704a, 0xf09060],
    trunk: { rTop: 0.11, rBot: 0.2, h: 2.0, lean: 0.1 },
    canopy: { primaries: 5, tilt: 1.02, tiltVar: 0.18, droop: 0.05, bend: 0.1, branchLen: 1.3, secondaries: 2 },
    leaves: { habit: 'tier', twigsPerLimb: 3, sprigs: 2, sprayLen: 0.42, density: 19, tipSprays: 3 },
    masses: { twigs: false, crownFill: 2, clumpR: 0.44, tuftsPerClump: [3, 2, 2], tuftFlat: 0.55, lump: 0.36, seed: 23 },
    clumps: { crownFill: 2, clumpR: 0.44, tuftsPerClump: [3, 2, 2], cardsPerClump: [10, 9, 6], cardSize: 0.66, tuftFlat: 0.55, lump: 0.36, seed: 23 },
    collider: 0.3, bark: 'grey', buttress: 0.35
  },
  needle: {
    id: 'needle', label: 'Garden pine', massKey: 'needle', sprayKey: 'needle', cardKey: 'needle',
    colors: [0x24401f, 0x33582f, 0x4a7040, 0x5f8850],
    trunk: { rTop: 0.09, rBot: 0.17, h: 1.9, lean: 0.2 },
    canopy: { primaries: 4, tilt: 1.05, tiltVar: 0.28, droop: 0.12, bend: 0.06, branchLen: 1.45, secondaries: 2 },
    leaves: { habit: 'pad', sprayLen: 0.36, sprayAspect: 1, padSprays: 30, padR: 0.45 },
    masses: { twigs: false, crownFill: 2, clumpR: 0.6, tuftsPerClump: [4, 3, 2], tuftFlat: 0.42, pad: true, lump: 0.34, seed: 37 },
    clumps: { crownFill: 2, clumpR: 0.6, tuftsPerClump: [4, 3, 2], cardsPerClump: [8, 6, 4], cardSize: 0.5, tuftFlat: 0.42, pad: true, lump: 0.34, seed: 37 },
    collider: 0.3, bark: 'dark', buttress: 0.2
  }
};
export const KIND_OF_ID = { sakura: 'sakura', maples: 'maple', pines: 'needle' };

// The classic three bark variants (Vegetation.matTrunks), picked by layout.barkIdx.
const BARKS = [
  { base: 0x6d4d36, dark: 0x2a1a11, seed: 1, normalScale: 1.3 },
  { base: 0x7c6650, dark: 0x352518, seed: 2, normalScale: 1.1 },
  { base: 0x574539, dark: 0x1f1712, seed: 3, normalScale: 1.4 }
];
const BARK_NAMES = ['auto', 'warm', 'grey', 'dark'];
const barkIndex = (bark, layoutIdx) => {
  const i = BARK_NAMES.indexOf(bark);
  return i > 0 ? i - 1 : ((layoutIdx || 0) % BARKS.length + BARKS.length) % BARKS.length;
};

/* ------------------------------------------------------------ materials --- */

let shared = null, refs = 0;
/** Take a reference on the shared foliage materials (released by the instance's dispose). */
function retain() { refs++; return foliage(); }
function release() {
  if (--refs > 0 || !shared) return;
  const f = shared;
  shared = null; refs = 0;
  const all = new Set([f.branchDepth]);
  for (const g of [f.sprays, f.cards]) for (const e of Object.values(g)) { all.add(e.material); all.add(e.depth); }
  for (const g of [f.masses, f.tufts]) for (const m of Object.values(g)) all.add(m);
  for (const b of f.branchList) all.add(b);
  for (const m of all) m.dispose();
}
/** Foliage materials, one per kind, shared by every tree (the draws of a kind batch). */
function foliage() {
  if (shared) return shared;
  const sprays = {}, masses = {}, cards = {};
  for (const [kind, o] of Object.entries({
    maple: { sss: 0.46, mottle: 0.16, bump: 0.32 },
    sakura: { sss: 0.5, mottle: 0.1, bump: 0.22, roughness: 0.85 },
    needle: { sss: 0.22, mottle: 0.2, bump: 0.36 }
  })) {
    const map = leafSprayTexture(kind);
    sprays[kind] = {
      material: createFoliageMaterial({ map, alphaTest: 0.5, side: 2, flex: true, twoSided: true, wind: TREE_WIND, ...o }),
      depth: createFoliageDepthMaterial(map, 0.5, { flex: true, wind: TREE_WIND })
    };
  }
  masses.sakura = createFoliageMaterial({ sss: 0.42, wind: 1.0, mottle: 0.16, bump: 0.35, roughness: 0.85, massMap: leafMassTexture('blossom'), massScale: 1 / 0.9, ragged: 1 });
  masses.maple = createFoliageMaterial({ sss: 0.4, wind: 1.0, mottle: 0.22, bump: 0.4, massMap: leafMassTexture('leaf'), massScale: 1 / 1.1, ragged: 1 });
  masses.needle = createFoliageMaterial({ sss: 0.18, wind: 0.6, mottle: 0.24, bump: 0.4, massMap: leafMassTexture('needle'), massScale: 1 / 1.2, ragged: 1 });
  // the summit habit: plain tuft cores + alpha-cut leaf cards
  const tufts = { sakura: createFoliageMaterial({ sss: 0.42, wind: 1.5, mottle: 0.24, bump: 0.44, roughness: 0.85 }), maple: createFoliageMaterial({ sss: 0.34, wind: 1.35, mottle: 0.4 }), needle: createFoliageMaterial({ sss: 0.18, wind: 0.9, mottle: 0.42 }) };
  for (const kind of ['sakura', 'maple', 'needle']) {
    const key = SPECIES[kind].cardKey;
    cards[kind] = {
      material: createFoliageMaterial({ map: leafCardTexture(key), alphaTest: 0.5, side: 2, sss: kind === 'needle' ? 0.18 : 0.4, wind: 1.35 }),
      depth: createFoliageDepthMaterial(leafCardTexture(key), 0.5, { wind: 1.35 })
    };
  }
  shared = { sprays, masses, tufts, cards, branch: new WeakMap(), branchList: [], branchDepth: createFoliageDepthMaterial(null, 0, { flex: true, wind: TREE_WIND }) };
  return shared;
}

/** Bark of variant `i` from the kit table (merge-able), and its wind-bending clone for hero limbs. */
function barkOf(ctx, i) {
  const b = BARKS[i];
  return ctx.kitMaterials.bark({ base: b.base, dark: b.dark, seed: b.seed, rough: 0.95 });
}
function limbBark(base) {
  const f = foliage();
  if (!f.branch.has(base)) { const m = createBranchMaterial(base, { wind: TREE_WIND }); f.branch.set(base, m); f.branchList.push(m); }
  return f.branch.get(base);
}

/* ---------------------------------------------------------------- trunk --- */

const TRUNK = {
  hero: { radial: 14, rings: 12, roots: 4 },
  mid: { radial: 10, rings: 6, roots: 3 },
  far: { radial: 6, rings: 3, roots: 0 }
};

/**
 * Trunk spine x-offset at height fraction t: the trunk leans as a curve that
 * keeps its foot planted (the classic rotated the whole cylinder about its
 * middle, lifting one side of the foot off the ground).
 */
export const spineX = (lean, h, t) => -Math.sin(lean) * h * 0.55 * t * t;

/**
 * A tapered trunk on a curved spine with a flared collar, buttress lobes and
 * (hero, mid) surface roots. One indexed geometry with position / normal / uv.
 */
export function buildTrunkGeometry(T, { rTop, rBot, h, lean = 0, tier = 'hero', girth = 1, buttress = 0.4, rng }) {
  const { radial, rings, roots } = TRUNK[tier] || TRUNK.mid;
  const pos = [], uv = [], idx = [];
  const lobes = 5, phase = rng() * Math.PI * 2;
  const ring = radial + 1;
  for (let j = 0; j <= rings; j++) {
    const t = j / rings;
    const cx = spineX(lean, h, t), cy = t * h * 0.96;
    const flare = 1 + Math.pow(Math.max(0, 1 - t * 4), 2) * 0.55;
    const r0 = (rBot + (rTop - rBot) * t) * girth * flare;
    const root = Math.pow(Math.max(0, 1 - t * 5), 2) * buttress;
    for (let i = 0; i <= radial; i++) {
      const a = (i / radial) * Math.PI * 2;
      const lobe = 1 + root * (0.5 + 0.5 * Math.cos(lobes * a + phase)) * 0.9;
      const wob = 1 + Math.sin(a * 3 + t * 9 + phase) * 0.035;
      const r = r0 * lobe * wob * (j === rings ? 0.45 : 1);
      pos.push(cx + Math.cos(a) * r, cy, Math.sin(a) * r);
      uv.push((i / radial) * 2, t * h / 1.1);
    }
  }
  for (let j = 0; j < rings; j++) {
    for (let i = 0; i < radial; i++) {
      const a = j * ring + i, b = a + ring;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  // flat cap at the fork (the limbs start inside it)
  const cap = pos.length / 3;
  pos.push(spineX(lean, h, 1), h * 0.96 + rTop * 0.25, 0); uv.push(0.5, h);
  for (let i = 0; i < radial; i++) idx.push(rings * ring + i, rings * ring + i + 1, cap);
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const parts = [geo];
  for (let k = 0; k < roots; k++) {
    const a = (k / roots) * Math.PI * 2 + phase + (rng() - 0.5) * 0.7;
    const len = rBot * girth * (2.2 + rng() * 1.2);
    const r = rBot * girth * (0.3 + rng() * 0.1);
    const c = new T.CatmullRomCurve3([
      new T.Vector3(Math.cos(a) * rBot * 0.5 * girth, h * 0.06, Math.sin(a) * rBot * 0.5 * girth),
      new T.Vector3(Math.cos(a) * rBot * 1.3 * girth, h * 0.015, Math.sin(a) * rBot * 1.3 * girth),
      new T.Vector3(Math.cos(a) * (rBot * girth + len), -r * 0.4, Math.sin(a) * (rBot * girth + len))
    ]);
    parts.push(taper(T, c, r, r * 0.25, tier === 'hero' ? 5 : 3, tier === 'hero' ? 5 : 4));
  }
  return parts.length === 1 ? geo : merge(T, parts);
}

function taper(T, curve, r0, r1, segs, radial) {
  const geo = new T.TubeGeometry(curve, segs, 1, radial, false);
  const pos = geo.attributes.position, c = new T.Vector3(), v = new T.Vector3(), n = radial + 1;
  for (let j = 0; j <= segs; j++) {
    curve.getPointAt(j / segs, c);
    const r = r0 + (r1 - r0) * (j / segs);
    for (let i = 0; i < n; i++) { const k = j * n + i; v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c); pos.setXYZ(k, v.x, v.y, v.z); }
  }
  geo.computeVertexNormals();
  return geo;
}

/** Merge indexed position / normal / uv geometries by hand (no addons import needed). */
function merge(T, geos) {
  const pos = [], nor = [], uv = [], idx = [];
  let base = 0;
  for (const g of geos) {
    const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); uv.push(u.getX(i), u.getY(i)); }
    for (const i of g.index.array) idx.push(i + base);
    base += p.count;
    g.dispose();
  }
  const out = new T.BufferGeometry();
  out.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  out.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  out.setIndex(idx);
  return out;
}

/* --------------------------------------------------------------- canopy --- */

/**
 * The buildCanopy options for one species, style and tier. `size` stretches
 * the limbs, `density` scales leaf counts. `S` is the layout scale: the group
 * is scaled by Vegetation.placeAsset, so leaf sizes (metres in the world) are
 * divided by it and leaf counts per metre multiplied (as buildCanopy's own
 * `scale` does for the classic trees).
 */
export function canopyOptions(sp, style, tier, { S = 1, size = 1, density = 1 } = {}) {
  const base = { scale: 1, colors: sp.colors, trunkH: sp.trunk.h, trunkR: sp.trunk.rTop * 1.15, ...sp.canopy };
  base.branchLen = sp.canopy.branchLen * size;
  if (style === 'leaves') {
    const l = { ...sp.leaves };
    const k = tier === 'hero' ? 1 : 0.4;
    if (l.habit === 'pad') l.padSprays = Math.max(8, Math.round(l.padSprays * (tier === 'hero' ? 1 : 0.55) * density));
    else {
      l.density = l.density * S * k * density;
      if (tier !== 'hero') { l.twigsPerLimb = Math.max(1, l.twigsPerLimb - 1); l.sprigs = 1; l.tipSprays = 2; }
    }
    l.sprayLen = l.sprayLen / S;
    return Object.assign(base, l, { style: 'leaves', ...(l.habit === 'pad' ? { density: undefined } : {}) });
  }
  if (style === 'clumps') return Object.assign(base, sp.clumps, { style: 'clumps' });
  // masses
  const m = { ...sp.masses };
  if (tier !== 'far' && density !== 1) m.tuftsPerClump = m.tuftsPerClump.map((n) => Math.max(1, Math.round(n * density)));
  if (tier === 'mid') Object.assign(m, { tuftsPerClump: m.tuftsPerClump.map((n) => Math.max(1, n - 1)), secondaries: 2 });
  if (tier === 'far') Object.assign(m, { tuftsPerClump: [1, 1, 1], tuftDetail: 0, secondaries: 1, primaries: Math.min(sp.canopy.primaries, 4), crownFill: 2, clumpR: m.clumpR * 1.25 });
  return Object.assign(base, m, { style: 'masses' });
}

/** The wide-stance material and geometry set a canopy style draws with. */
export function canopyMaterials(ctx, sp, style, barkI) {
  const f = foliage();
  const bark = barkOf(ctx, barkI);
  if (style === 'leaves') return { limbs: limbBark(bark), limbDepth: f.branchDepth, leaf: f.sprays[sp.id].material, leafDepth: f.sprays[sp.id].depth };
  if (style === 'clumps') return { limbs: bark, leaf: f.tufts[sp.id], cards: f.cards[sp.id].material, cardsDepth: f.cards[sp.id].depth };
  return { limbs: bark, leaf: f.masses[sp.id] };
}

function mesh(T, geo, mat, name, depth = null) {
  const m = new T.Mesh(geo, mat);
  m.name = name;
  m.castShadow = m.receiveShadow = true;
  if (depth) m.customDepthMaterial = depth;
  return m;
}

/**
 * Join a trunk to its limbs in one geometry (one draw, one bark material).
 * Hero limbs carry `aWind`; the trunk gets zeros so it stays still.
 */
function joinWood(T, trunk, limbs) {
  if (!trunk) return limbs;
  if (!limbs) return trunk;
  const n = trunk.attributes.position.count;
  if (limbs.attributes.aWind && !trunk.attributes.aWind) trunk.setAttribute('aWind', new T.BufferAttribute(new Float32Array(n * 2), 2));
  for (const g of [trunk, limbs]) {
    for (const k of Object.keys(g.attributes)) {
      if (trunk.attributes[k] && limbs.attributes[k]) continue;
      console.warn(`[kit trees] joinWood: attribute '${k}' is on only one of trunk / limbs and is dropped`);
      g.deleteAttribute(k);
    }
  }
  if (!limbs.index) limbs.setIndex([...Array(limbs.attributes.position.count).keys()]);
  const out = mergeGeometries([trunk, limbs], false);
  trunk.dispose(); limbs.dispose();
  return out;
}

/**
 * The wood (trunk joined to limbs) and canopy meshes for one species into
 * `group`; the canopy is shifted by `dx`, the spine's lean at the fork.
 * `trunkGeo` may be null (a canopy on its own).
 */
export function addCanopy(ctx, group, sp, style, tier, o, barkI, dx = 0, trunkGeo = null) {
  const T = ctx.THREE;
  retain();
  const built = buildCanopy(ctx.rng, canopyOptions(sp, style, tier, o));
  const mats = canopyMaterials(ctx, sp, style, barkI);
  const parts = {}, geos = [];
  const add = (key, geo, mat, depth) => {
    if (!geo || !geo.attributes.position || !geo.attributes.position.count) return;
    const m = mesh(T, geo, mat, key, depth);
    group.add(m); parts[key] = m; geos.push(geo);
  };
  if (dx) { built.branches.translate(dx, 0, 0); built.cards.translate && built.cards.attributes.position && built.cards.translate(dx, 0, 0); built.tufts.attributes.position && built.tufts.translate(dx, 0, 0); }
  add(trunkGeo ? 'trunk' : 'limbs', joinWood(T, trunkGeo, built.branches), mats.limbs, style === 'leaves' ? mats.limbDepth : null);
  if (style === 'leaves') add('leaves', built.cards, mats.leaf, mats.leafDepth);
  else {
    add('tufts', built.tufts, mats.leaf);
    if (style === 'clumps') add('leaf_cards', built.cards, mats.cards, mats.cardsDepth);
  }
  return { parts, geos, built, release() { for (const g of geos) g.dispose(); release(); } };
}

/* ----------------------------------------------------------- whole tree --- */

/** Which canopy style a tree of this tier and band wears. */
export function styleFor(rim, tier) {
  if (rim) return 'masses';
  return tier === 'far' ? 'masses' : 'leaves';
}

/**
 * One whole tree: trunk + limbs + canopy. `layout` is the Vegetation layout
 * (x, z, ry, scale, lean, barkIdx, rim, trunk).
 */
export function buildTree(ctx, layout, p, kind) {
  const T = ctx.THREE;
  const sp = SPECIES[kind] || SPECIES[layout.kind] || SPECIES.sakura;
  const tier = ctx.tier, rim = !!layout.rim;
  const style = styleFor(rim, tier);
  const trunk = layout.trunk || sp.trunk;
  const barkI = barkIndex(p.bark, layout.barkIdx);
  const lean = (layout.lean !== undefined ? layout.lean : 0) * p.lean;
  const group = new T.Group();
  const geo = buildTrunkGeometry(T, { rTop: trunk.rTop, rBot: trunk.rBot, h: trunk.h, lean, tier, girth: p.trunk_girth, buttress: sp.buttress, rng: ctx.rng });
  const dx = spineX(lean, trunk.h, 0.85);
  const S = layout.scale || 1;
  const canopy = addCanopy(ctx, group, sp, style, tier, { S, size: p.crown_spread, density: p.leaf_density }, barkI, dx, geo);
  return {
    group, parts: canopy.parts, sockets: {}, live: [],
    // part keys Vegetation may fold into its static merges when layout.bake is set (see the v-trees handoff)
    bake: layout.bake ? Object.keys(canopy.parts) : [],
    stats: { style, sprays: canopy.built.sprays || 0, top: canopy.built.top, radius: canopy.built.radius },
    dispose() { canopy.release(); }
  };
}

/** Params common to the three species and the rim trees. */
export const TREE_PARAMS = {
  crown_spread: { type: 'number', default: 1, min: 0.8, max: 1.3, step: 0.05, label: 'Crown spread' },
  leaf_density: { type: 'number', default: 1, min: 0.5, max: 1.5, step: 0.05, label: 'Leaf density' },
  trunk_girth: { type: 'number', default: 1, min: 0.8, max: 1.5, step: 0.05, label: 'Trunk girth' },
  lean: { type: 'number', default: 1, min: 0, max: 2, step: 0.1, label: 'Lean' },
  bark: { type: 'enum', default: 'auto', options: ['auto', 'warm', 'grey', 'dark'], label: 'Bark' }
};

/** Real layouts for the contract sample: the biggest the valley builds of each (Vegetation spots). */
export function sampleLayout(kind, { scale, rim = false }) {
  const sp = SPECIES[kind];
  return { index: 0, name: `${sp.label} Tree 1`, kind, x: 0, y: 0, z: 0, ry: 0, scale, lean: sp.trunk.lean * 0.5, barkIdx: 2, rim, bake: rim, trunk: sp.trunk, band: rim ? 'rim' : 'near', footprint: { colliders: [{ x: 0, z: 0, r: sp.collider * scale }] } };
}
