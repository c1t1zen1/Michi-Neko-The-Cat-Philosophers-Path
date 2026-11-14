// Shared helpers of the machiya family: box-projected metre UVs (the game's
// textured materials expect one texture tile per metre), reuse of the game's
// own MAT entries, and the one vertex-coloured kit material every static
// timber / plaster / stone detail shares (km.bag with the alley's args, so the
// kit holds a single material for it and _mergeStatics folds every instance).
import * as THREE from 'three';
import { Bag, merge, indexed } from '../craft.js?v=20261113a';

export { Bag, merge, indexed };

export const tint = (hex, k) => { const c = new THREE.Color(hex); c.offsetHSL(0, 0, k); return c.getHex(); };
export const seg = (tier, hero, mid, far) => (tier === 'hero' ? hero : tier === 'mid' ? mid : far);

/** The shared vertex-coloured material (same args as the alley kit, so it is the same object). */
export const bagMat = (km) => km.bag({ rough: 0.85, grime: 0.4, grimeH: 0.3 });

/** The game's MAT entry, else a kit fallback (kit contract test supplies the real table). */
export const matOr = (ctx, name, make) => (ctx.MAT && ctx.MAT[name]) || make();

/** The classic dark timber colour family for a `layout.mat` key. */
export function timberColour(key, finish = 'dark') {
  if (finish === 'bengara') return 0x7a2f22;
  if (finish === 'natural') return 0x9a7650;
  return key === 'timberEngawa' ? 0x7a5a3c : 0x41302a;
}

/** Overwrite uv with box-projected world metres (dominant normal axis), one tile per metre. */
export function worldUV(geo, scale = 1, ox = 0, oy = 0) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); }
    else if (ax >= az) { u = p.getZ(i); v = p.getY(i); }
    else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u * scale + ox; uv[i * 2 + 1] = v * scale + oy;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

/** A box of w x h x d centred at (x, y, z) with metre UVs, ready for merge(). */
export function uvBox(w, h, d, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  return worldUV(g);
}

/** Static mesh with the shadow flags every kit prop uses. */
export function meshOf(geo, mat, cast = true) {
  const m = new THREE.Mesh(indexed(geo), mat);
  m.castShadow = cast; m.receiveShadow = true;
  return m;
}

/** A group of named parts: { group, parts, sockets, live }. */
export function assemble(parts, live = []) {
  const group = new THREE.Group();
  const kept = {};
  for (const [k, m] of Object.entries(parts)) if (m) { group.add(m); kept[k] = m; }
  return { group, parts: kept, sockets: {}, live };
}
