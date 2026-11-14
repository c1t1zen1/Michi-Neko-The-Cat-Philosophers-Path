// Shared stone helpers for the rocks family (Lab 13 "chisel" specimen, ported).
// A boulder is an icosphere cut by random planes and displaced by warped fbm
// (craft.rockGeometry); it is then fitted to an exact box so a kit rock
// occupies the same volume as the classic dodecahedron it replaces (the
// colliders in the layout footprint stay honest).
//
// Everything is seeded: callers pass integer seeds drawn from ctx.rng.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rockGeometry, withUv } from '../craft.js?v=20261113a';

/** Icosphere subdivision per tier: [big/hero rock, small rock]. */
export const DETAIL = Object.freeze({ hero: [3, 2], mid: [2, 1], far: [1, 0] });
export const KEY_DETAIL = Object.freeze({ hero: [4, 3], mid: [3, 2], far: [2, 1] });

/** Weathering 0..1 → noise strength of the chisel (soft and rounded when high). */
export function weatherOpts(weathering, facets) {
  return {
    cuts: facets,
    cutDepth: 0.66,
    rough: 0.09 + 0.2 * weathering,
    ridge: 0.09 - 0.06 * weathering
  };
}

const _box = new THREE.Box3();
/** Centre `geo` on its bounding box and scale it to half extents (hx, hy, hz). */
export function fitRock(geo, hx, hy, hz) {
  geo.computeBoundingBox();
  _box.copy(geo.boundingBox);
  const c = _box.getCenter(new THREE.Vector3()), s = _box.getSize(new THREE.Vector3());
  geo.translate(-c.x, -c.y, -c.z);
  geo.scale((2 * hx) / (s.x || 1), (2 * hy) / (s.y || 1), (2 * hz) / (s.z || 1));
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/** One chiselled variant, unit-fitted (half extents 1 x 0.85 x 1), with uv so it can merge. */
export function variantRock(seed, detail, opts) {
  const g = rockGeometry(seed, { detail, ...opts });
  return withUv(fitRock(g, 1, 0.85, 1), 1);
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
/** Bake `geo` under a transform into a copy (position, Euler XYZ rotation, scale). */
export function placed(geo, [x, y, z], [rx, ry, rz], [sx, sy, sz]) {
  const g = geo.clone();
  g.applyMatrix4(_m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz)));
  return g;
}

/** Merge indexed copies into one geometry (null when empty) and free the copies. */
export function bake(list) {
  if (!list.length) return null;
  const g = mergeGeometries(list);
  for (const x of list) x.dispose();
  return g;
}

/** The two rock finishes the family shares (light and dark stone), from the kit's painted rock material. */
export function rockMaterials(km, moss) {
  return {
    stone: km.rock({ moss, lichen: 0.22 }),
    stoneDark: km.rock({ a: 0x45433e, b: 0x7d786d, moss, lichen: 0.15 })
  };
}
