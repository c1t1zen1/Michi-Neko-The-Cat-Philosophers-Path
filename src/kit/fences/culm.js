// The fences family's culm pieces. The unit culm and the cord lashing
// (`culmGeometry(THREE, tier)`, `knotGeometry(THREE, tier)`) were promoted to
// src/kit/craft.js at gate G-V1 (v-fences handoff) and are re-exported here
// unchanged, so `./culm.js` and `../fences/culm.js` imports keep working.
// The finishes and the baker below stay with the family.
import { culmGeometry, knotGeometry } from '../craft.js?v=20261113a';
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
