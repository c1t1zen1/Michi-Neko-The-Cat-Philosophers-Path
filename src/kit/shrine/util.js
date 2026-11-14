// Shared helpers for the shrine family: translated boxes, baking, the game's
// own materials with kit fallbacks, and per-KitMaterials private materials.
import * as THREE from 'three';
import { merge, indexed } from '../craft.js?v=20261113a';

export const TIER_N = { hero: 0, mid: 1, far: 2 };
export const byTier = (tier, hero, mid, far) => (tier === 'hero' ? hero : tier === 'mid' ? mid : far);

/** A box of size w x h x d centred on (x, y, z). */
export const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

/** Merge a list of geometries into one indexed geometry (position/normal/uv), so _mergeStatics can take it. */
export const bake = (list) => indexed(merge(list));

/** The game's own material (ctx.MAT) when the owner provides it, else the kit's. */
export const gameMat = (ctx, name, fallback) => (ctx.MAT && ctx.MAT[name]) || fallback();

/** The shared vertex-colour material every family prop uses (one merged draw across the valley). */
export const bagMat = (ctx) => ctx.kitMaterials.bag({ rough: 0.85, grime: 0.4, grimeH: 0.3 });

export function castMesh(geo, mat, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}

const privateCache = new WeakMap();
/** A material private to the family but shared by its instances (never merged, never disposed per instance). */
export function sharedPrivate(km, key, make) {
  let bag = privateCache.get(km);
  if (!bag) { bag = new Map(); privateCache.set(km, bag); }
  if (!bag.has(key)) { const m = make(); m.userData.kit = true; bag.set(key, m); }
  return bag.get(key);
}

export const tint = (hex, k) => { const c = new THREE.Color(hex); c.offsetHSL(0, 0, k); return c.getHex(); };
