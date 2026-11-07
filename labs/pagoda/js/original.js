// Read-only adapter: the game's own buildDistantPagoda (src/countryside.js),
// run on a bare kit so no valley is built. Materials are cloned so the lab's
// light and air never touch the game's shared MAT. Every mesh is sorted into
// a part (roof, eave, corner, body, post, band, dais, sorin) by its geometry,
// so each specimen shelf can open with the game's own version of that part.
import * as THREE from 'three';
import { loadCountrysideModule } from '../../shared/game.js';
import { countMesh } from './util.js';

const { Countryside } = await loadCountrysideModule();

export const ORIGINAL_SCALE = 1.12 * 1.1;
const TIER_W = [4.55, 4.05, 3.58, 3.12, 2.68], TIER_H = [2.2, 2.05, 1.9, 1.78, 1.64];
const near = (a, b, tol = 6) => {
  const ca = new THREE.Color(a), cb = new THREE.Color(b);
  return Math.abs(ca.r - cb.r) * 255 < tol && Math.abs(ca.g - cb.g) * 255 < tol && Math.abs(ca.b - cb.b) * 255 < tol;
};

function classify(m) {
  const g = m.geometry, p = g.parameters || {}, hex = m.material.color?.getHex() ?? 0;
  if (g.type === 'ConeGeometry' && p.radialSegments === 4) return 'roof';
  if (g.type !== 'BoxGeometry') return 'sorin';
  if (near(hex, 0x5a2e22)) return 'body';
  if (near(hex, 0x151b1c)) return Math.abs(m.rotation.z) > 0.01 ? 'corner' : 'eave';
  if (p.width >= 4.8) return 'dais';
  if (p.width < 0.25 && p.height > 1) return 'post';
  return 'band';
}

/** The shipped pagoda, at its shipped scale (≈ 19.4 m to the tip). */
export function originalPagoda() {
  const t0 = performance.now();
  const kit = Object.create(Countryside.prototype);
  Object.assign(kit, { scene: new THREE.Group(), terrainHeight: () => 0, random: () => 0.57 });
  kit.buildDistantPagoda(0, 0);
  const group = kit.scene.children[0];
  kit.scene.remove(group);
  group.position.set(0, 0, 0);
  const clones = new Map(), parts = {};
  group.traverse((o) => {
    if (!o.isMesh) return;
    if (!clones.has(o.material)) clones.set(o.material, o.material.clone());
    o.material = clones.get(o.material);
    const part = classify(o);
    o.userData.part = part;
    (parts[part] ??= []).push(o);
  });
  return { group, parts, dims: originalDims(), built: performance.now() - t0, counts: () => countMesh(group), materials: [...clones.values()] };
}

/** The same storey layout the builder walks, in metres after its scale. */
export function originalDims() {
  const s = ORIGINAL_SCALE, S = [];
  let y = 0.92;
  for (let i = 0; i < 5; i++) {
    const w = TIER_W[i] * (i === 0 ? 0.68 : 0.62), h = TIER_H[i], span = TIER_W[i] + 0.72, roofH = 0.72 - i * 0.045;
    S.push({ w: w * s, y0: y * s, h: h * s, yTop: (y + h) * s, yE: (y + h + 0.04) * s, R: (span / 2) * s, yR: (y + h + roofH) * s, edgeH: 0.1 * s, bs: 0.16 * s, bellH: 0.2 * s, proj: 0.17 * s, b: 0.2 * s, rise: 0.25 * s });
    y += h + roofH * 0.62;
  }
  const sorinY = (y - 0.1) * s, H = (y - 0.1 + 3.37) * s;
  return { S, n: 5, W1: S[0].w, H, sorinY, sorinH: H - sorinY, podiumH: 0.92 * s, podiumHalf: 2.8 * s, robanHalf: 0.28 * s, kd: 0 };
}

/** Isolate one part family of the original: everything else is ghosted. */
export function ghostOthers(orig, keep) {
  const ghost = new THREE.MeshStandardMaterial({ color: 0xd8d2c6, transparent: true, opacity: 0.18, depthWrite: false, roughness: 1 });
  orig.group.traverse((o) => {
    if (o.isMesh && !keep.includes(o.userData.part)) o.material = ghost;
  });
  return orig;
}
