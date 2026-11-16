// Shared helpers of the roofcanal family: per-material buckets over the Roof
// Road's own ctx.MAT entries, tier segment counts, frame helpers over layout.rail.
import * as THREE from 'three';
import { Bag } from '../craft.js?v=20261116a';
import { worldScaleBoxUVs } from '../../textures.js?v=20261116a';

export { THREE };
const SEG = { hero: 1, mid: 0.7, far: 0.5 };
export const seg = (tier, n) => Math.max(4, Math.round(n * (SEG[tier] || 0.7)));

// Materials: the Roof Road passes its own painterly set as ctx.MAT (scopeAssets),
// so every static mesh here is on a MAT entry the facade already merges: no new
// material. (Vertex colour is NOT usable: pieces/common.js mergeByMaterial drops
// the colour attribute, see the handoff.) A plain km material stands in where a
// MAT entry is missing (the contract page's MAT is the valley's).
const FALLBACK = {
  timber: 0x3b2819, timberMed: 0x6e4c30, wetStone: 0x7d8480, stone: 0x8f8d85, pine: 0x3b5e34,
  lacquer: 0xa8341f, steel: 0x5d6168, dark: 0x1e1915, bamboo: 0x8f9a52, bronze: 0xb28538,
  bengara: 0xa4503a, plasterWarm: 0xe0cfae, ridge: 0x3a4149, futon: 0xe8e2d2, lanternWhite: 0xf3e6c0,
  indigo: 0x223652, crimson: 0x8a2a2a, hemp: 0xb59b6a, slab: 0x8a8a80, twine: 0xa88f5c, agedWood: 0x7a6445,
  foliage: 0x4f7a3a, clay: 0xa5573a, water: 0x6fb2c4, foam: 0xe8f2f0, sand: 0xb8a77f, cobble: 0x8a8578,
  glass: 0xe9f0e6, hull: 0x2b2118, hullBand: 0x3a3530, wake: 0xe8f2f0, straw: 0xc8a96a, bark: 0x5a4130,
  blossomPale: 0xf5dbe1, blossom: 0xeab3c4, blossomRose: 0xd98aa5, lanternRed: 0xb02a22, goods: 0xc86a3a, cloth: 0xd8c9a8
};
export const matFor = (ctx, name) => {
  const M = ctx.MAT || {};
  // 'goods#3' / 'cloth#2' pick an entry of a MAT array; 'hemp' is also M.noren.hemp for hangings
  const [base, k] = name.split('#');
  let hit;
  if (k !== undefined) { const arr = M[base]; hit = Array.isArray(arr) && arr.length ? arr[Number(k) % arr.length] : null; }
  else hit = base === 'indigo' || base === 'crimson' ? M.noren && M.noren[base] : base === 'norenhemp' ? M.noren && M.noren.hemp : M[base];
  return hit || ctx.kitMaterials.plain(FALLBACK[base] ?? FALLBACK.hemp, { rough: 0.85 });
};

/** A Bag per material: `m: 'timber'` picks the bucket; boxes get world-scale UVs like the classic ones. */
const PANEL = new Set(['futon', 'indigo', 'crimson', 'lanternWhite', 'norenhemp', 'goods', 'cloth', 'glass']);

export class PBag {
  constructor(remap = null) { this.bags = new Map(); this.remap = remap; }
  _bag(m) { m = typeof this.remap === 'function' ? this.remap(m) : ((this.remap && this.remap[m]) || m); if (!this.bags.has(m)) this.bags.set(m, new Bag()); return this.bags.get(m); }
  add(geo, { m = 'stone', ...o } = {}) { this._bag(m).add(geo, o); return this; }
  box(w, h, d, { m = 'stone', ...o } = {}) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (!PANEL.has(m.split('#')[0])) worldScaleBoxUVs(g, 1);
    this._bag(m).add(g, o);
    g.dispose();
    return this;
  }
  /** Cylinder along axis 'x' | 'y' | 'z' (the classic cyl()). */
  cyl(r, len, seg, { m = 'stone', axis = 'y', ...o } = {}) {
    const g = new THREE.CylinderGeometry(r, r, len, seg);
    if (axis === 'x') g.rotateZ(Math.PI / 2); else if (axis === 'z') g.rotateX(Math.PI / 2);
    this._bag(m).add(g, o); g.dispose(); return this;
  }
  /** The classic paper lantern (cyl() on a paper material): a lathe belly with two dark caps. */
  lantern(r, len, seg, { m = 'lanternWhite', y = 0, caps = true, ...o } = {}) {
    const g = new THREE.LatheGeometry([[-0.5, 0.7], [-0.42, 0.94], [-0.25, 1], [0.25, 1], [0.42, 0.94], [0.5, 0.7]].map(([yy, w]) => new THREE.Vector2(r * w, len * yy)), seg);
    this._bag(m).add(g, { y, ...o }); g.dispose();
    if (caps) for (const sign of [-1, 1]) this.cyl(r * 0.74, len * 0.065, seg, { m: 'dark', ...o, y: y + sign * len * 0.5 });
    return this;
  }
  torus(r, t, rs, ts, { m = 'stone', ...o } = {}) { const g = new THREE.TorusGeometry(r, t, rs, ts); this._bag(m).add(g, o); g.dispose(); return this; }
  sphere(r, { m = 'stone', ...o } = {}) { this._bag(m).sphere(r, o); return this; }
}

export const PARAMS = { wear: { type: 'number', default: 0.5, min: 0, max: 1, step: 0.1, label: 'Wear (settling and lean)' } };
export const SAMPLE = { s: 0, x: 0, y: 0, z: 0, ry: 0, index: 0, band: 'near', piece: { s0: -0.5, s1: 0.5, y: 1.2, d: 0, look: 0.6, side: 'near', shape: 'stone' } };
export const sample = (piece) => ({ ...SAMPLE, piece: { ...SAMPLE.piece, ...piece } });

/** One mesh per material bucket, each its own part (`body_<material>`). */
export function finish(ctx, pbag, extra = {}) {
  const group = new ctx.THREE.Group();
  const parts = {};
  for (const [name, bag] of pbag.bags) {
    const mesh = bag.mesh(matFor(ctx, name));
    const mat = mesh.material;
    mesh.castShadow = !mat.transparent; mesh.receiveShadow = true;
    group.add(mesh);
    parts[`body_${name.toLowerCase().replace('#', '_')}`] = mesh;
  }
  return { group, parts, sockets: {}, live: [], ...extra };
}


/* ------------------------------------------------------- the rail frame --- */

/** The layout frame (rail point at layout.s, heading layout.ry) and rail samples. Without layout.rail (contract samples) the route is a straight line along local x. */
const lerp = (a, b, t) => a + (b - a) * t;
function railAt(layout, s) {
  const r = layout.rail;
  if (!r || !r.points || r.points.length < 2) return { x: layout.x + (s - layout.s) * Math.cos(layout.ry), z: layout.z - (s - layout.s) * Math.sin(layout.ry), tx: Math.cos(layout.ry), tz: -Math.sin(layout.ry) };
  const P = r.points, f = Math.min(Math.max((s - P[0].s) / ((P[P.length - 1].s - P[0].s) || 1), 0), 1) * (P.length - 1);
  const i = Math.min(Math.floor(f), P.length - 2), t = f - i, a = P[i], b = P[i + 1];
  const tx = lerp(a.tx, b.tx, t), tz = lerp(a.tz, b.tz, t), n = Math.hypot(tx, tz) || 1;
  return { x: lerp(a.x, b.x, t), z: lerp(a.z, b.z, t), tx: tx / n, tz: tz / n };
}
/** World (x, z) to layout-local (x, z). */
export function toLocal(layout, x, z) {
  const c = Math.cos(layout.ry), sn = Math.sin(layout.ry), dx = x - layout.x, dz = z - layout.z;
  return [dx * c - dz * sn, dx * sn + dz * c];
}
/** The layout-local point at route position s and depth d (rail.place). */
export function placeLocal(layout, s, d) {
  const p = railAt(layout, s);
  return toLocal(layout, p.x - p.tz * d, p.z + p.tx * d);
}
/** A group in the rail frame at route position s (the classic frameGroup(rail, s)), expressed in the layout frame. */
export function frameGroupAt(layout, s) {
  const p = railAt(layout, s), g = new THREE.Group();
  const [x, z] = toLocal(layout, p.x, p.z);
  g.position.set(x, 0, z);
  g.rotation.y = Math.atan2(-p.tz, p.tx) - layout.ry;
  return g;
}
/**
 * The classic ribbon() over [s0, s1] between depths dA and dB at height y, from layout.rail:
 * n = max(1, ceil(len / 0.5)) steps, two vertices per sample, uv = (s * uv, d * uv), face up.
 */
export function ribbonGeo(layout, s0, s1, dA, dB, y, uv = 1) {
  const pos = [], uvs = [], idx = [], n = Math.max(1, Math.ceil((s1 - s0) / 0.5));
  for (let i = 0; i <= n; i++) {
    const s = s0 + ((s1 - s0) * i) / n;
    for (const d of [dA, dB]) { const [x, z] = placeLocal(layout, s, d); pos.push(x, y, z); uvs.push(s * uv, d * uv); }
    if (i < n) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  if (geo.attributes.normal.getY(0) < 0) {
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    geo.setIndex(idx); geo.computeVertexNormals();
  }
  return geo;
}
/** A lantern-light socket (named light_*) at layout-local position. */
export function lightSocket(ctx, layout, group, name, s, y, d) {
  const o = new ctx.THREE.Object3D(), [x, z] = placeLocal(layout, s, d);
  o.position.set(x, y, z); group.add(o);
  return [name, o];
}
