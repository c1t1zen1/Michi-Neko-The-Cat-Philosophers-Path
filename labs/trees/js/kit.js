// Trees study: the trunk, the three species and the three canopy styles, built
// from foliage.js's own buildCanopy. src/kit/trees/build.js is the production
// port of this file (labs may not be imported by the game, so the study and the
// kit each carry their copy; keep them in step).
import * as THREE from 'three';
import { M } from '../../shared/painted.js';

export const TREE_WIND = 1.1;

export const SPECIES = {
  sakura: { label: 'Sakura', jp: '桜', massKey: 'blossom', colors: [0xd27a94, 0xeaa2b6, 0xf6c6d2, 0xfbdde6], bark: 0, buttress: 0.5,
    trunk: { rTop: 0.13, rBot: 0.22, h: 2.3, lean: 0.14 }, canopy: { primaries: 6, tilt: 0.9, tiltVar: 0.2, droop: -0.08, bend: 0.14, branchLen: 1.5, secondaries: 2 },
    leaves: { habit: 'cloud', twigsPerLimb: 3, sprigs: 2, sprayLen: 0.46, sprayAspect: 1, density: 13, tipSprays: 3, colors: [0xe4a2b6, 0xf0bccb, 0xf8d4de, 0xfde8ee] },
    masses: { twigs: false, crownFill: 3, clumpR: 0.5, tuftsPerClump: [3, 3, 2], tuftFlat: 0.74, lump: 0.4, seed: 11 } },
  maple: { label: 'Maple', jp: '紅葉', massKey: 'leaf', colors: [0x8e2d20, 0xc24a34, 0xe0704a, 0xf09060], bark: 1, buttress: 0.35,
    trunk: { rTop: 0.11, rBot: 0.2, h: 2.0, lean: 0.1 }, canopy: { primaries: 5, tilt: 1.02, tiltVar: 0.18, droop: 0.05, bend: 0.1, branchLen: 1.3, secondaries: 2 },
    leaves: { habit: 'tier', twigsPerLimb: 3, sprigs: 2, sprayLen: 0.42, density: 14, tipSprays: 3 },
    masses: { twigs: false, crownFill: 2, clumpR: 0.44, tuftsPerClump: [3, 2, 2], tuftFlat: 0.55, lump: 0.36, seed: 23 } },
  needle: { label: 'Pine', jp: '松', massKey: 'needle', colors: [0x24401f, 0x33582f, 0x4a7040, 0x5f8850], bark: 2, buttress: 0.2,
    trunk: { rTop: 0.09, rBot: 0.17, h: 1.9, lean: 0.2 }, canopy: { primaries: 4, tilt: 1.05, tiltVar: 0.28, droop: 0.12, bend: 0.06, branchLen: 1.45, secondaries: 2 },
    leaves: { habit: 'pad', sprayLen: 0.36, sprayAspect: 1, padSprays: 30, padR: 0.45 },
    masses: { twigs: false, crownFill: 2, clumpR: 0.6, tuftsPerClump: [4, 3, 2], tuftFlat: 0.42, pad: true, lump: 0.34, seed: 37 } }
};

export const spineX = (lean, h, t) => -Math.sin(lean) * h * 0.55 * t * t;

/** A trunk on a curved spine: root collar, buttress lobes, optional surface roots. */
export function trunkGeometry({ rTop, rBot, h, lean = 0, radial = 14, rings = 12, roots = 4, buttress = 0.4, girth = 1, rand }) {
  const pos = [], uv = [], idx = [], phase = rand() * Math.PI * 2, ring = radial + 1;
  for (let j = 0; j <= rings; j++) {
    const t = j / rings, flare = 1 + Math.pow(Math.max(0, 1 - t * 4), 2) * 0.55, r0 = (rBot + (rTop - rBot) * t) * girth * flare;
    const root = Math.pow(Math.max(0, 1 - t * 5), 2) * buttress;
    for (let i = 0; i <= radial; i++) {
      const a = (i / radial) * Math.PI * 2, r = (j === rings ? 0.7 : 1) * r0 * (1 + root * (0.5 + 0.5 * Math.cos(5 * a + phase)) * 0.9) * (1 + Math.sin(a * 3 + t * 9 + phase) * 0.035);
      pos.push(spineX(lean, h, t) + Math.cos(a) * r, t * h, Math.sin(a) * r); uv.push((i / radial) * 2, t * h / 1.1);
    }
  }
  for (let j = 0; j < rings; j++) for (let i = 0; i < radial; i++) { const a = j * ring + i, b = a + ring; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const cap = pos.length / 3; pos.push(spineX(lean, h, 1), h + rTop * 0.5, 0); uv.push(0.5, h);
  for (let i = 0; i < radial; i++) idx.push(rings * ring + i, rings * ring + i + 1, cap);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const list = [geo];
  for (let k = 0; k < roots; k++) {
    const a = (k / roots) * Math.PI * 2 + phase + (rand() - 0.5) * 0.7, len = rBot * girth * (2.2 + rand() * 1.2), r = rBot * girth * (0.3 + rand() * 0.1);
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(Math.cos(a) * rBot * 0.5 * girth, h * 0.06, Math.sin(a) * rBot * 0.5 * girth), new THREE.Vector3(Math.cos(a) * rBot * 1.3 * girth, h * 0.015, Math.sin(a) * rBot * 1.3 * girth), new THREE.Vector3(Math.cos(a) * (rBot * girth + len), -r * 0.4, Math.sin(a) * (rBot * girth + len))]);
    const tg = new THREE.TubeGeometry(c, 5, 1, 5, false), p = tg.attributes.position, cc = new THREE.Vector3(), v = new THREE.Vector3();
    for (let j = 0; j <= 5; j++) { c.getPointAt(j / 5, cc); const rr = r + (r * 0.25 - r) * (j / 5); for (let i = 0; i < 6; i++) { const n = j * 6 + i; v.fromBufferAttribute(p, n).sub(cc).multiplyScalar(rr).add(cc); p.setXYZ(n, v.x, v.y, v.z); } }
    tg.computeVertexNormals(); list.push(tg);
  }
  if (list.length === 1) return geo;
  const P = [], N = [], U = [], I = []; let base = 0;
  for (const g of list) { const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv; for (let i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(n.getX(i), n.getY(i), n.getZ(i)); U.push(u.getX(i), u.getY(i)); } for (const i of g.index.array) I.push(i + base); base += p.count; }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); out.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); out.setIndex(I);
  return out;
}

const TIER_TRUNK = { hero: { radial: 14, rings: 12, roots: 4 }, mid: { radial: 10, rings: 6, roots: 3 }, far: { radial: 6, rings: 3, roots: 0 } };

export function canopyOptions(sp, style, tier, S = 1) {
  const base = { scale: 1, colors: sp.colors, trunkH: sp.trunk.h, trunkR: sp.trunk.rTop * 1.15, ...sp.canopy };
  if (style === 'leaves') {
    const l = { ...sp.leaves };
    if (l.habit === 'pad') l.padSprays = Math.round(l.padSprays * (tier === 'hero' ? 1 : 0.55));
    else { l.density = l.density * S * (tier === 'hero' ? 1 : 0.5); if (tier !== 'hero') { l.twigsPerLimb = Math.max(1, l.twigsPerLimb - 1); l.sprigs = 1; l.tipSprays = 2; } }
    l.sprayLen /= S;
    return Object.assign(base, l, { style: 'leaves' });
  }
  const m = { ...sp.masses };
  if (tier === 'mid') m.tuftsPerClump = m.tuftsPerClump.map((n) => Math.max(1, n - 1));
  if (tier === 'far') Object.assign(m, { tuftsPerClump: [1, 1, 1], tuftDetail: 0, secondaries: 1, primaries: Math.min(sp.canopy.primaries, 4), crownFill: 2, clumpR: m.clumpR * 1.25 });
  return Object.assign(base, m, { style: 'masses' });
}

const cache = new WeakMap();
function mats(F) {
  if (cache.has(F)) return cache.get(F);
  const sprays = {}, masses = {};
  for (const [kind, o] of Object.entries({ maple: { sss: 0.46, mottle: 0.16, bump: 0.32 }, sakura: { sss: 0.5, mottle: 0.1, bump: 0.22, roughness: 0.85 }, needle: { sss: 0.22, mottle: 0.2, bump: 0.36 } })) {
    const map = F.leafSprayTexture(kind);
    sprays[kind] = { material: F.createFoliageMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, flex: true, twoSided: true, wind: TREE_WIND, ...o }), depth: F.createFoliageDepthMaterial(map, 0.5, { flex: true, wind: TREE_WIND }) };
  }
  masses.sakura = F.createFoliageMaterial({ sss: 0.42, wind: 1.0, mottle: 0.16, bump: 0.35, roughness: 0.85, massMap: F.leafMassTexture('blossom'), massScale: 1 / 0.9, ragged: 1 });
  masses.maple = F.createFoliageMaterial({ sss: 0.4, wind: 1.0, mottle: 0.22, bump: 0.4, massMap: F.leafMassTexture('leaf'), massScale: 1 / 1.1, ragged: 1 });
  masses.needle = F.createFoliageMaterial({ sss: 0.18, wind: 0.6, mottle: 0.24, bump: 0.4, massMap: F.leafMassTexture('needle'), massScale: 1 / 1.2, ragged: 1 });
  const m = { sprays, masses, bark: [0, 1, 2].map((i) => M.bark({ base: [0x6d4d36, 0x7c6650, 0x574539][i], dark: [0x2a1a11, 0x352518, 0x1f1712][i], seed: i + 1, rough: 0.95 })), branchDepth: F.createFoliageDepthMaterial(null, 0, { flex: true, wind: TREE_WIND }), branch: [] };
  m.branch = m.bark.map((b) => F.createBranchMaterial(b, { wind: TREE_WIND }));
  cache.set(F, m);
  return m;
}

export const trisOf = (g) => g.traverse && (() => { let n = 0; g.traverse((o) => { if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); return Math.round(n); })();

/**
 * One tree. style: 'leaves' | 'masses'; tier: hero | mid | far; `trunk:false`
 * leaves the trunk out, `canopy:false` draws the bare skeleton.
 */
export function makeTree(F, { kind = 'sakura', style = 'leaves', tier = 'hero', seed = 1, S = 1, lean = null, girth = 1, bark = null, trunk = true, canopy = true, flat = false } = {}) {
  const sp = SPECIES[kind], rand = F.__rand || mulberry(seed), g = new THREE.Group(), K = mats(F), bi = bark ?? sp.bark;
  const L = lean ?? sp.trunk.lean * 0.5, tt = TIER_TRUNK[tier];
  const geoms = [];
  if (trunk) {
    const geo = trunkGeometry({ ...sp.trunk, lean: flat ? 0 : L, ...tt, buttress: sp.buttress, girth, rand: mulberry(seed * 3 + 1) });
    const m = new THREE.Mesh(geo, K.bark[bi]); m.castShadow = m.receiveShadow = true; m.name = 'trunk'; g.add(m); geoms.push(geo);
  }
  const r = mulberry(seed);
  const built = F.buildCanopy(r, canopyOptions(sp, style, tier, S));
  const dx = flat ? 0 : spineX(L, sp.trunk.h, 0.85);
  const add = (geo, mat, depth, name) => { if (!geo || !geo.attributes.position || !geo.attributes.position.count) return; geo.translate(dx, 0, 0); const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = m.receiveShadow = true; if (depth) m.customDepthMaterial = depth; g.add(m); geoms.push(geo); };
  if (canopy || style === 'leaves') add(built.branches, style === 'leaves' ? K.branch[bi] : K.bark[bi], style === 'leaves' ? K.branchDepth : null, 'limbs');
  if (canopy) { if (style === 'leaves') add(built.cards, K.sprays[kind].material, K.sprays[kind].depth, 'leaves'); else add(built.tufts, K.masses[kind], null, 'tufts'); }
  g.scale.setScalar(S);
  return { group: g, tris: trisOf(g), built, dispose() { for (const geo of geoms) geo.dispose(); } };
}

export function mulberry(a) { return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
