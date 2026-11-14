// One culm geometry per tier, shared by every fence, corral post and sign in
// the valley (marked `userData.sharedGeometry` on the meshes that use it, so
// an instance's dispose() never frees it). Unit height, unit radius: an
// instance matrix scales it to length and thickness. Nodes swell and darken
// (vertex colour), the same profile as labs/shared/bamboo.js `culmGeometry`
// with the ring count cut by tier.
import { lerp } from '../craft.js?v=20261113a';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TIER_CULM = {
  hero: { nodes: 5, radial: 7, rows: 3 },
  mid: { nodes: 4, radial: 5, rows: 3 },
  far: { nodes: 0, radial: 4, rows: 1 }
};

const cache = new Map();   // `${THREE.REVISION}:${tier}` → BufferGeometry
const knots = new Map();

/** The unit culm of a tier (cached for the life of the page). */
export function culmGeometry(THREE, tier) {
  const key = THREE.REVISION + ':' + tier;
  if (cache.has(key)) return cache.get(key);
  const spec = TIER_CULM[tier] || TIER_CULM.mid;
  const taper = 0.72;
  const prof = [], dark = [];
  if (!spec.nodes) {
    prof.push(new THREE.Vector2(1, 0), new THREE.Vector2(taper, 1)); dark.push(1, 1);
  } else {
    const per = spec.rows;
    for (let k = 0; k < spec.nodes; k++) {
      for (let r = 0; r < per; r++) {
        // rows crowd toward the node at the end of each internode
        const f = r / per, t = (k + f) / spec.nodes;
        const d = 1 - f;                                  // distance to the next node, 0..1
        const bulge = Math.exp(-Math.pow(Math.min(f, d) / 0.12, 2)) * 0.075;
        prof.push(new THREE.Vector2(lerp(1, taper, t) * (1 + bulge), t));
        dark.push(1 - Math.exp(-Math.pow(Math.min(f, d) / 0.04, 2)) * 0.32);
      }
    }
    prof.push(new THREE.Vector2(taper, 1)); dark.push(1);
  }
  const g = new THREE.LatheGeometry(prof, spec.radial);
  const per = g.attributes.position.count / prof.length;
  const cols = new Float32Array(g.attributes.position.count * 3);
  for (let r = 0; r < prof.length; r++) for (let c = 0; c < per; c++) {
    const i = (r * per + c) * 3; cols[i] = cols[i + 1] = cols[i + 2] = dark[r];
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  g.userData.shared = true;
  cache.set(key, g);
  return g;
}

/** The cord lashing: a small torus of unit radius, lying with its hole along +y after rotation by the caller. */
export function knotGeometry(THREE, tier) {
  const key = THREE.REVISION + ':' + tier;
  if (knots.has(key)) return knots.get(key);
  const g = tier === 'hero' ? new THREE.TorusGeometry(1, 0.32, 4, 7) : new THREE.TorusGeometry(1, 0.34, 3, 5);
  g.userData.shared = true;
  knots.set(key, g);
  return g;
}

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
