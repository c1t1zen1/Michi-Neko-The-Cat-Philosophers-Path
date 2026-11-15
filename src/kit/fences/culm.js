// The fences family's culm pieces. The unit culm and the cord lashing
// (`culmGeometry(THREE, tier)`, `knotGeometry(THREE, tier)`) were promoted to
// src/kit/craft.js at gate G-V1 (v-fences handoff) and are re-exported here
// unchanged, so `./culm.js` and `../fences/culm.js` imports keep working.
// The finishes and the baker below stay with the family.
import { culmGeometry, knotGeometry } from '../craft.js?v=20261114a';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export { culmGeometry, knotGeometry };

/** Age ramp for the three finishes: fresh green, dry straw, weathered brown. */
export const FINISHES = Object.freeze({ fresh: 0xa9c06a, straw: 0xd2b87c, weathered: 0x9c8056 });

/**
 * Bake copies of a shared unit geometry into ONE indexed BufferGeometry
 * (position, normal, uv, and colour when `tints` is given), so the mesh is a
 * plain Mesh on a merge-able material and Countryside._mergeStatics() folds
 * every fence in the valley into one draw per material. `objs` are
 * Object3Ds with `updateMatrix()` already called; `tints[i]` is [r, g, b].
 */
export function bake(THREE, geo, objs, tints = null) {
  // Written straight into the merged arrays (a1-village, ruling R66: the fences
  // were ~65 ms of the modular world build in clones and mergeGeometries). The
  // arithmetic is three's own, call for call: Vector3.applyMatrix4 for
  // positions, applyNormalMatrix with Matrix3.getNormalMatrix for normals, the
  // tint product for colours, the index offset per copy and setIndex()'s
  // Uint16/Uint32 choice, so the result is the same geometry, byte for byte,
  // as geo.clone().applyMatrix4() per copy merged by mergeGeometries()
  // (bakeReference below; a1-village checked the two equal on 36 culm/knot cases).
  const names = Object.keys(geo.attributes).filter((n) => n !== 'color' || tints);
  const n = geo.attributes.position.count, copies = objs.length;
  const out = new THREE.BufferGeometry();
  if (geo.index) {
    const src = geo.index, m = src.count, idx = new Array(m * copies);
    for (let c = 0, w = 0; c < copies; c++) {
      const off = c * n;
      for (let j = 0; j < m; j++) idx[w++] = src.getX(j) + off;
    }
    out.setIndex(idx);
  }
  const v = new THREE.Vector3(), nm = new THREE.Matrix3();
  for (const name of names) {
    const a = geo.attributes[name], size = a.itemSize, arr = new a.array.constructor(n * size * copies);
    for (let c = 0; c < copies; c++) {
      const base = c * n * size;
      if (name === 'position' || name === 'normal') {
        const mat = objs[c].matrix;
        if (name === 'normal') nm.getNormalMatrix(mat);
        for (let i = 0; i < n; i++) {
          v.fromBufferAttribute(a, i);
          if (name === 'position') v.applyMatrix4(mat); else v.applyNormalMatrix(nm);
          arr[base + i * 3] = v.x; arr[base + i * 3 + 1] = v.y; arr[base + i * 3 + 2] = v.z;
        }
      } else if (name === 'color') {
        const t = tints[c];
        for (let k = 0; k < n; k++) { arr[base + k * 3] = a.getX(k) * t[0]; arr[base + k * 3 + 1] = a.getY(k) * t[1]; arr[base + k * 3 + 2] = a.getZ(k) * t[2]; }
      } else arr.set(a.array.subarray(0, n * size), base);
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size, a.normalized));
  }
  return out;
}

/** The original baker (clone, applyMatrix4, mergeGeometries): the reference bake() must equal. */
export function bakeReference(THREE, geo, objs, tints = null) {
  const parts = objs.map((o, i) => {
    const g = geo.clone();
    g.applyMatrix4(o.matrix);
    if (tints) {
      const c = g.attributes.color, t = tints[i];
      for (let k = 0; k < c.count; k++) c.setXYZ(k, c.getX(k) * t[0], c.getY(k) * t[1], c.getZ(k) * t[2]);
    } else g.deleteAttribute('color');
    return g;
  });
  const out = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return out;
}
