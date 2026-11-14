// Stepping slabs (inventory `path-slabs`): the classic walkway's layout (two
// or one stones a row along a curve) built as real tobi-ishi instead of boxes:
// each stone a softly irregular, flat-topped slab with a worn, rounded arris,
// set into the ground (its foot 4 cm down) and standing proud by the classic
// height (Rikyū's 6 cm sits in the classic 6-11 cm range). The lab's
// `ground/slabs` and tobi-ishi stones (labs/ground/js/stones.js) are the study.
//
// The game does not build the walkway today (the catalog shows it on the road
// curve); the contract sample is that same layout. Stones merge per shared kit
// stone material (KIT_SHARED stone / basinStone / rock: no new material).
import * as THREE from 'three';

const FOOT = -0.04;                    // how deep the stone is bedded
// per tier: outline segments, rounded rings on the top, and whether the second column is kept
export const SLAB_DETAIL = { hero: { seg: 12, rings: 2, cols: 2, skirt: false }, mid: { seg: 6, rings: 1, cols: 2, skirt: false }, far: { seg: 4, rings: 0, cols: 1, skirt: true } };
// classic MAT index (layoutWalkwaySlabs: stone, stoneDark, slabWarm) -> shared kit material and part
export const SLAB_MATS = [['stone', 'stones_light'], ['basinStone', 'stones_dark'], ['rock', 'stones_warm']];

/** Flat arrays for one material's stones (position, uv, index), turned into one indexed geometry. */
class StoneBag {
  constructor() { this.P = []; this.UV = []; this.I = []; }
  geometry() {
    if (!this.I.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.UV, 2));
    g.setIndex(this.I);
    g.computeVertexNormals();                 // stones share no vertices, so this is per stone
    return g;
  }
}

/**
 * One stone into `bag`: an irregular superellipse outline (half sizes hw, hd),
 * a flat top at `top` softly domed, a rounded arris of `bevel`, sides down to
 * FOOT; placed at (px, pz) turned by ry. `wob` are per-vertex outline jitters
 * (from ctx.rng). UVs are world-scaled so the merged stone texture reads at
 * one scale.
 */
function addStone(bag, px, pz, ry, hw, hd, top, { seg, rings, skirt }, bevel, wob, dome) {
  const { P, UV, I } = bag;
  const cr = Math.cos(ry), sr = Math.sin(ry);
  const outline = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2 + Math.PI / seg;
    const c = Math.cos(a), s = Math.sin(a);
    // superellipse (n 3.2): squarish with rounded corners, like a dressed stone worn soft
    const k = Math.pow(Math.pow(Math.abs(c), 3.2) + Math.pow(Math.abs(s), 3.2), -1 / 3.2) * (1 + wob[i]);
    outline.push([c * hw * k, s * hd * k]);
  }
  const vert = (x, y, z) => {
    const wx = px + x * cr + z * sr, wz = pz - x * sr + z * cr;
    P.push(wx, y, wz); UV.push(wx * 0.9, wz * 0.9 + y * 0.9);
    return P.length / 3 - 1;
  };
  if (skirt) {
    // far: the flat top and one bedded point under it (a pyramid skirt reaches the ground)
    const ring = outline.map(([x, z]) => vert(x, top, z));
    const foot = vert(0, FOOT, 0);
    for (let i = 1; i < seg - 1; i++) I.push(ring[0], ring[i + 1], ring[i]);
    for (let i = 0; i < seg; i++) I.push(ring[i], ring[(i + 1) % seg], foot);
    return;
  }
  const centre = vert(0, top + dome, 0);
  const levels = [];
  // top rings (inside the arris), then the arris, then the foot
  const edgeF = 1 - Math.min(0.4, 1.2 * bevel / Math.min(hw, hd));
  const fs = rings >= 2 ? [0.55, edgeF] : [edgeF];
  for (const f of fs) levels.push(outline.map(([x, z]) => vert(x * f, top + dome * (1 - f * f), z * f)));
  levels.push(outline.map(([x, z]) => vert(x, top - bevel, z)));
  levels.push(outline.map(([x, z]) => vert(x * 1.02, FOOT, z * 1.02)));
  for (let i = 0; i < seg; i++) I.push(centre, levels[0][(i + 1) % seg], levels[0][i]);
  for (let l = 0; l < levels.length - 1; l++) {
    const A = levels[l], B = levels[l + 1];
    for (let i = 0; i < seg; i++) { const j = (i + 1) % seg; I.push(A[i], A[j], B[i], A[j], B[j], B[i]); }
  }
}

export function buildSlabs(ctx, layout, p) {
  const { THREE: T3, tier, rng, kitMaterials: km } = ctx;
  const det = SLAB_DETAIL[tier] || SLAB_DETAIL.mid;
  const bags = SLAB_MATS.map(() => new StoneBag());
  for (const { c, w, d, h, mat, position, ry } of layout.slabs || []) {
    // the stream advances the same for every stone at every tier (8 outline jitters + dome)
    const wob = Array.from({ length: 8 }, () => (rng() - 0.5) * 0.16 * p.irregular);
    const dome = 0.004 + rng() * 0.008;
    if (det.cols < 2 && c > 0) continue;
    const top = h * p.proud + 0.03;                 // the classic top: box centre h/2 + 0.03, plus h/2
    const bevel = Math.min(0.03, h * 0.35) * p.round + 0.004;
    const jit = Array.from({ length: det.seg }, (_, i) => wob[Math.floor(i * 8 / det.seg)]);
    addStone(bags[det.skirt ? 0 : (mat | 0) % 3], position[0], position[2], ry, w / 2, d / 2, top, det, bevel, jit, dome);
  }
  const group = new T3.Group();
  const parts = {};
  bags.forEach((bag, i) => {
    const geo = bag.geometry();
    if (!geo) return;
    const mesh = new T3.Mesh(geo, km.shared(SLAB_MATS[i][0]));
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    parts[SLAB_MATS[i][1]] = mesh;
  });
  if (!Object.keys(parts).length) { const e = new T3.Object3D(); group.add(e); parts.stones_light = e; }
  return { group, parts, sockets: {}, live: [] };
}

/**
 * The walkway the catalog shows: countryside.js layoutWalkwaySlabs() on the
 * road curve, with its own seeded stream standing in for the valley's (the
 * game never builds this layout, so no valley draw is involved).
 */
export function sampleSlabs() {
  let a = 20260729;
  const random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const curve = new THREE.CatmullRomCurve3([[0, 0, 34], [-2, 0, 20], [1.5, 0, 6], [0, 0, -8], [-1, 0, -16], [0, 0, -30]].map((v) => new THREE.Vector3(...v)));
  const len = curve.getLength();
  const rows = Math.floor(len / 0.62);
  const slabs = [];
  for (let i = 0; i < rows; i++) {
    const t = i / rows;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    const cols = random() > 0.4 ? 2 : 1;
    for (let c = 0; c < cols; c++) {
      const w = 0.55 + random() * 0.45;
      const d = 0.45 + random() * 0.3;
      const h = 0.06 + random() * 0.05;
      const off = cols === 1 ? (random() - 0.5) * 0.3 : (c === 0 ? -0.55 - random() * 0.15 : 0.55 + random() * 0.15);
      const mat = Math.floor(random() * 3);
      const position = [p.x + side.x * off, h / 2 + 0.03, p.z + side.z * off];
      const ry = Math.atan2(tan.x, tan.z) + (random() - 0.5) * 0.35;
      slabs.push({ i, c, w, d, h, mat, position, ry });
    }
  }
  return { index: 0, slabs, footprint: { colliders: [], platforms: [], exclusions: [], waterRects: [], anchors: {}, lists: {} } };
}
