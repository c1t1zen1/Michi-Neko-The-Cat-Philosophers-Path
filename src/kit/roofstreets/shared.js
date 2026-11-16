// Shared builder kit for the roofstreets buildings (part b): a per-material
// mesh collector (Multi) whose primitives mirror rooftops/js/pieces/common.js
// (box with world-scale UVs, cyl, slope, triangle) so a kit building lands on
// exactly the classic geometry, plus material lookup from the Roof Road's own
// ctx.MAT (so the kit merges into the classic batches) with kit fallbacks.
import * as THREE from 'three';
import { Bag } from '../craft.js?v=20261116a';
import { worldScaleBoxUVs } from '../../textures.js?v=20261116a';

/** hash1 of rooftops/js/level.js, ported (kit code may not import rooftops/). */
export function hash1(x) {
  const s = Math.sin(x * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

const FALLBACK = {
  roof: 0x5e6872, ridge: 0x3a4149, plaster: 0xe9e1cf, plasterWarm: 0xe0cfae, bengara: 0xa4503a, timber: 0x5a3e26,
  timberMed: 0x6e4c30, agedWood: 0x8f6c42, stone: 0x8d8d86, namako: 0x2f3338, koshi: 0x6b4a2e, mushiko: 0xcdbf9c,
  bronze: 0xb28538, gold: 0xd9ad4c, lacquer: 0xc8402a, tapestry: 0xa23a2c, dark: 0x2a1d14, steel: 0x5d6168,
  shoji: 0xf2e6c8, futon: 0xe8e2d2, bamboo: 0xa8a45a, lanternRed: 0xc8402a, lanternWhite: 0xf2ead2, terracotta: 0xa4673f,
  bark: 0x5a4632, foliage: 0x55803e, pine: 0x2f5a3a, wisteria: 0xbda0c6, straw: 0xb59a62, twine: 0xb59a62, wetStone: 0x6f726f, inuyarai: 0x8a7a52
};
const ARR = { cloth: [0xf2efe6, 0x2f4c78, 0xe6d6a8, 0xd9e2ea, 0xb8584a], leaves: [0x63884d, 0xa1a660, 0x406950], goods: [0xb84a52, 0x4f7a8c, 0xd9b45a, 0xb84a52, 0x6a8a4a, 0x8a5a9a] };

/** `name` is an M key, `arr.i` for an array entry (cloth.2) or `dict.key` (noren.indigo). */
export function material(ctx, name) {
  const [head, sub] = name.split('.');
  const M = ctx.MAT;
  if (sub !== undefined) {
    const v = M && M[head] && M[head][sub];
    if (v) return v;
    const col = ARR[head] ? ARR[head][+sub] : 0x2f4c78;
    return ctx.kitMaterials.plain(col ?? 0x808080, { rough: 0.9, side: THREE.DoubleSide });
  }
  return (M && M[head]) || ctx.kitMaterials.plain(FALLBACK[head] ?? 0x808080, { rough: 0.85 });
}

const partKey = (k) => k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase()).replace(/\./g, '_');
const TAU = Math.PI * 2;

export class Multi {
  constructor(ctx, layout = null) { this.ctx = ctx; this.layout = layout; const pc = layout && layout.piece; this.split = !!pc && pc.s1 - pc.s0 > 12; this.bags = new Map(); this.mats = new Map(); }
  /**
   * The bag for material `m` in the 32 m world cell of local point (x, z): the Roof Road's own
   * mergeByMaterial buckets a mesh by its centre's cell, so a wide building must hand it one
   * mesh per cell (as classic's many boxes do) to merge into the same number of batches.
   */
  _bag(m, x = 0, z = 0) {
    if (!this.mats.has(m)) this.mats.set(m, material(this.ctx, m));
    const L = this.layout || { x: 0, z: 0, ry: 0 };
    if (!this.split) x = z = 0;   // a short piece keeps one cell (its origin), so its parts stay one connected mesh set
    const c = Math.cos(L.ry || 0), sn = Math.sin(L.ry || 0);
    const wx = (L.x || 0) + x * c + z * sn, wz = (L.z || 0) - x * sn + z * c;
    const key = `${m}@${Math.floor(wx / 32)}@${Math.floor(wz / 32)}`;
    if (!this.bags.has(key)) this.bags.set(key, new Bag());
    return this.bags.get(key);
  }
  add(geo, o) {
    const { m, x = 0, y = 0, z = 0, ...rest } = o;
    if (!geo.boundingBox) geo.computeBoundingBox();
    const bc = geo.boundingBox.getCenter(new THREE.Vector3());
    this._bag(m, x + bc.x * (rest.sx ?? 1), z + bc.z * (rest.sz ?? 1)).add(geo, { x, y, z, ...rest });
    return this;
  }
  /** Box as the classic box(): world-scale UVs unless the material is a `panel`. */
  box(w, h, d, o) {
    const { m, x = 0, y = 0, z = 0, ...rest } = o;
    const g = new THREE.BoxGeometry(w, h, d);
    this._bag(m);
    if (!(this.mats.get(m).userData && this.mats.get(m).userData.panel)) worldScaleBoxUVs(g, 1);
    this._bag(m, x, z).add(g, { x, y, z, ...rest });
    return this;
  }
  /** Cylinder as the classic cyl(): paper lanterns are the lathe barrel with dark caps. */
  cyl(r, len, o) {
    const { m, axis = 'y', seg = 10, x = 0, y = 0, z = 0, ...rest } = o;
    this._bag(m);
    const paper = this.mats.get(m).userData && this.mats.get(m).userData.paper;
    const place = (g, dx = 0, dy = 0, dz = 0) => {
      if (axis === 'x') g.rotateZ(Math.PI / 2); else if (axis === 'z') g.rotateX(Math.PI / 2);
      g.translate(0, 0, 0);
      return g;
    };
    const rot = (v) => (axis === 'x' ? new THREE.Vector3(1, 0, 0) : axis === 'z' ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0)).multiplyScalar(v);
    const pos = { x, y, z };
    if (paper) {
      const prof = [[-0.5, 0.7], [-0.42, 0.94], [-0.25, 1], [0.25, 1], [0.42, 0.94], [0.5, 0.7]].map(([yy, w]) => new THREE.Vector2(r * w, len * yy));
      this._bag(m, x, z).add(place(new THREE.LatheGeometry(prof, seg)), { ...pos, ...rest });
      for (const sgn of [-1, 1]) {
        const c = rot(sgn * len * 0.5);
        this.add(place(new THREE.CylinderGeometry(r * 0.74, r * 0.74, len * 0.065, seg)), { m: 'dark', x: x + c.x, y: y + c.y, z: z + c.z, ...rest });
      }
    } else this._bag(m, x, z).add(place(new THREE.CylinderGeometry(r, r, len, seg)), { ...pos, ...rest });
    return this;
  }
  /** Tiled slope: `eave` is the low edge's midpoint; see common.js slope(). */
  slope(m, eave, rise, run, width, yaw, thick = 0.12) {
    const dx = Math.sin(yaw), dz = Math.cos(yaw), len = Math.hypot(run, rise);
    return this.box(width, thick, len + 0.04, { m, x: eave.x - dx * run / 2, y: eave.y + rise / 2, z: eave.z - dz * run / 2,
      rx: Math.atan2(rise, run), ry: yaw, rz: 0, order: 'YXZ' });
  }
  triangle(m, ax, ay, az, bx, by, bz, cx, cy, cz) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([ax, ay, az, bx, by, bz, cx, cy, cz], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([az, ay, bz, by, cz, cy].map((v) => v * 0.45), 2));
    geo.computeVertexNormals();
    return this.add(geo, { m });
  }
  /** One thin box along a-b (classic beam() uses a 7-sided cylinder; the box is the cheap equivalent). */
  beam(a, b, r, m) {
    const v = new THREE.Vector3(...b).sub(new THREE.Vector3(...a)), mid = new THREE.Vector3(...a).addScaledVector(v, 0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize());
    const e = new THREE.Euler().setFromQuaternion(q);
    return this.add(new THREE.CylinderGeometry(r, r, v.length(), 5), { m, x: mid.x, y: mid.y, z: mid.z, rx: e.x, ry: e.y, rz: e.z });
  }
}

/** A building's meshes, one per material, as named parts `<name>_<material>`. */
export function finish(multi, name, extra = {}) {
  const group = new THREE.Group(), parts = {};
  for (const [key, bag] of multi.bags) {
    const [m, cx, cz] = key.split('@');
    const cell = (v) => (+v < 0 ? 'n' : 'p') + Math.abs(+v);
    const part = `${name}_${partKey(m)}_${cell(cx)}_${cell(cz)}`;
    const mesh = bag.mesh(multi.mats.get(m), part);
    if (!mesh) continue;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    parts[part] = mesh;
  }
  return { group, parts, sockets: {}, live: [], ...extra };
}

export { TAU };
