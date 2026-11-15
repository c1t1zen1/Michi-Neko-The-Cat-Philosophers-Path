// rooffestival helpers: a material-bucketed Bag and the Roof Road material resolver.
// The Roof Road passes its painterly set as ctx.MAT (scopeAssets), so every static
// mesh is on an entry the facade's mergeByMaterial already merges (R52: no new
// material). Vertex colour is not used (mergeByMaterial keeps `color` only on
// vertexColors materials). The contract page's MAT is the valley's: a plain km
// material stands in for any missing entry.
import * as THREE from 'three';
import { Bag } from '../craft.js?v=20261114a';
import { worldScaleBoxUVs } from '../../textures.js?v=20261114a';

const FALLBACK = {
  timber: 0x3b2819, timberMed: 0x6e4c30, lacquer: 0xa8341f, gold: 0xd9ad4c, hemp: 0x9c8256, bark: 0x4a3426,
  roof: 0x5e6872, ridge: 0x3a4149, plaster: 0xf1e8d6, sujibei: 0xe4d8bc, tapestry: 0x7a3a2e, steel: 0x5d6168,
  dark: 0x1e1915, bamboo: 0x8f9a52, pine: 0x3b5e34, bronze: 0xb28538, terracotta: 0xb4643c, enamel: 0xe8e2d2,
  twine: 0x9c8256, glass: 0xe9f0e6, lanternRed: 0xc8402a, lanternWhite: 0xf4e6c8, straw: 0xc8a96a,
  goods: [0xc9643a, 0xe0b04a, 0x7a9a4a, 0xb8384a, 0xe8dcc2, 0x5a7aa0],
  cloth: [0xf2efe6, 0x2f4c78, 0xe6d6a8, 0xd9e2ea, 0xb8584a],
  brocade: [0x7a2a24, 0x2a3f66], leaves: [0x63884d, 0xa1a660, 0x406950], signs: [0x8f2820, 0x2f4c78, 0xc9b48c, 0x3b5e34, 0x5a3a28, 0xd9c8a0],
  noren: { indigo: 0x223652, crimson: 0x8f2820, hemp: 0xc9b48c }
};

/** ctx → name → Material. Names: `timber`, `goods3`, `cloth1`, `brocade0`, `noren_crimson`, `leaves2`, `signs4`. */
export function resolver(ctx) {
  const M = ctx.MAT || {}, km = ctx.kitMaterials, memo = new Map();
  const fb = (c, opts = {}) => km.plain(c, { rough: 0.85, ...opts });
  return (name) => {
    if (typeof name !== 'string') return name;
    if (memo.has(name)) return memo.get(name);
    let hit = null;
    const arr = /^([a-z]+)(\d+)$/.exec(name);
    if (arr && Array.isArray(FALLBACK[arr[1]])) {
      const i = Number(arr[2]), real = Array.isArray(M[arr[1]]) ? M[arr[1]] : null;
      hit = (real && real[i % real.length]) || fb(FALLBACK[arr[1]][i % FALLBACK[arr[1]].length], arr[1] === 'leaves' ? { side: THREE.DoubleSide } : {});
    } else if (name.startsWith('noren_')) {
      const k = name.slice(6);
      hit = (M.noren && M.noren[k]) || fb(FALLBACK.noren[k] ?? FALLBACK.noren.indigo, { side: THREE.DoubleSide });
    } else if (name === 'glass') {
      hit = M.glass || km.plain(FALLBACK.glass, { rough: 0.25, side: THREE.DoubleSide, transparent: true, opacity: 0.38, depthWrite: false });
    } else {
      hit = M[name] || (name === 'lanternRed' || name === 'lanternWhite' ? km.paper({ color: FALLBACK[name], glow: 0.35 })
        : fb(FALLBACK[name] ?? 0x888888, name === 'steel' ? { metal: 0.6, rough: 0.5 } : name === 'gold' || name === 'bronze' ? { metal: 0.8, rough: 0.35 } : {}));
    }
    memo.set(name, hit);
    return hit;
  };
}

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'x';

/** One Bag per (part, material); `finish()` makes one mesh per bucket, parts named `<part>` then `<part>_2` … */
export class PBag {
  constructor(ctx, { fold = null, onePart = false } = {}) { this.ctx = ctx; this.mat = resolver(ctx); this.buckets = new Map(); this.fold = fold; this.onePart = onePart; }
  _bucket(part, m) {
    if (this.fold && typeof m === 'string') m = this.fold(m);
    if (this.onePart) part = 'body';
    const mat = this.mat(m), key = part + '|' + mat.uuid;
    if (!this.buckets.has(key)) this.buckets.set(key, { part, mat, bag: new Bag() });
    return this.buckets.get(key);
  }
  add(geo, { m = 'timber', part = 'body', ...o } = {}) { this._bucket(part, m).bag.add(geo, o); return this; }
  box(w, h, d, { m = 'timber', part = 'body', ...o } = {}) {
    const b = this._bucket(part, m);
    const g = new THREE.BoxGeometry(w, h, d);
    if (!(b.mat.userData && b.mat.userData.panel)) worldScaleBoxUVs(g, 1);
    b.bag.add(g, o); g.dispose();
    return this;
  }
  /** Cylinder along `axis` (y default); extra rotation in rx/ry/rz applies after the axis turn is baked. */
  cyl(r, len, { m = 'timber', part = 'body', axis = 'y', seg = 8, r2 = r, ...o } = {}) {
    const g = new THREE.CylinderGeometry(r2, r, len, seg);
    if (axis === 'x') g.rotateZ(Math.PI / 2); else if (axis === 'z') g.rotateX(Math.PI / 2);
    this._bucket(part, m).bag.add(g, o); g.dispose();
    return this;
  }
  sphere(r, { m = 'timber', part = 'body', seg = 7, ...o } = {}) {
    const g = new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2));
    this._bucket(part, m).bag.add(g, o); g.dispose();
    return this;
  }
  /** A round paper chōchin: the classic's lathe (bulged, flat ends) plus dark rims. */
  lantern(r, len, { m = 'lanternWhite', part = 'lamps', seg = 10, rims = true, ...o } = {}) {
    const prof = [[-.5, .7], [-.42, .94], [-.25, 1], [.25, 1], [.42, .94], [.5, .7]].map(([y, w]) => new THREE.Vector2(r * w, len * y));
    const g = new THREE.LatheGeometry(prof, seg);
    this._bucket(part, m).bag.add(g, o); g.dispose();
    if (rims) for (const s of [-1, 1]) this.cyl(r * 0.74, len * 0.065, { m: 'dark', part, seg, ...o, y: (o.y || 0) + s * len * 0.5 });
    return this;
  }
  /** Rod between two points (local frame). */
  beam(a, b, r, { m = 'timber', part = 'body', seg = 6, ...o } = {}) {
    const v = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = v.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
    const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
    return this.cyl(r, len, { m, part, seg, x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, z: (a[2] + b[2]) / 2, rx: e.x, ry: e.y, rz: e.z, ...o });
  }
  /** Tiled slope, ported from pieces/common.js slope(): `eave` = low edge midpoint. */
  slope(m, eave, rise, run, width, yaw, thick = 0.12, part = 'roof') {
    const dx = Math.sin(yaw), dz = Math.cos(yaw), len = Math.hypot(run, rise);
    const b = this._bucket(part, m), g = new THREE.BoxGeometry(width, thick, len + 0.04);
    if (!(b.mat.userData && b.mat.userData.panel)) worldScaleBoxUVs(g, 1);
    const q = new THREE.Euler(Math.atan2(rise, run), yaw, 0, 'YXZ');
    b.bag.add(g, { x: eave.x - dx * run / 2, y: eave.y + rise / 2, z: eave.z - dz * run / 2, rx: q.x, ry: q.y, rz: q.z, order: 'YXZ' });
    g.dispose();
    return this;
  }
  /** A flat triangle (gable face), uv as the classic triangle(). */
  tri(m, [ax, ay, az], [bx, by, bz], [cx, cy, cz], part = 'gable') {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([ax, ay, az, bx, by, bz, cx, cy, cz], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([az, ay, bz, by, cz, cy].map((v) => v * 0.45), 2));
    geo.computeVertexNormals();
    this._bucket(part, m).bag.add(geo, {}); geo.dispose();
    return this;
  }
  /** One mesh per bucket; `remap` folds materials (far tier) before meshes are made. */
  finish(extra = {}) {
    const group = new this.ctx.THREE.Group(), parts = {}, seen = new Map();
    for (const { part, mat, bag } of this.buckets.values()) {
      const mesh = bag.mesh(mat);
      if (!mesh) continue;
      mesh.castShadow = !mat.transparent; mesh.receiveShadow = true;
      const n = (seen.get(part) || 0) + 1; seen.set(part, n);
      const key = n === 1 ? slug(part) : `${slug(part)}_${n}`;
      group.add(mesh);
      parts[key] = mesh;
    }
    return { group, parts, sockets: {}, live: [], ...extra };
  }
}

export const seg = (tier, n) => Math.max(4, Math.round(n * ({ hero: 1, mid: 0.7, far: 0.5 }[tier] || 0.7)));
