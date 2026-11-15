// Shared ground for the summit vista kit (family `vista`, lane s3-vista).
// The vista sits on the summit's one rendered landform. A kit builder gets no
// terrain from its layout, so it samples the summit's own height function:
// `terrainHeightAt` reads only pure helpers (landHeightAt, vistaGroundHeight,
// approachSupportAt), so it runs on a plain object carrying those methods.
// Reading it changes no landform height (the kit never writes terrain).
import * as THREE from 'three';
import { terrainMethods } from '../../summit/terrain.js?v=20261113a';
import { canvas2d, canvasTexture, rng as seeded } from '../craft.js?v=20261113a';

const field = Object.assign({}, terrainMethods);
/** The summit's rendered ground height at summit-local (x, z). */
export const terrainY = (x, z) => terrainMethods.terrainHeightAt.call(field, x, z);
/** The Yodo river's x at depth z (the classic centreline). */
export const riverX = (z) => -20 + Math.sin(z * 0.041) * 13 + Math.sin(z * 0.017 + 1.3) * 8;

export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
/** Pick by tier: pick(tier, hero, mid, far). */
export const pick = (tier, hero, mid, far) => (tier === 'hero' ? hero : tier === 'mid' ? mid : far);
export const seedOf = (r) => 1 + Math.floor(r() * 0x7fffffff);

/** A soft round glow sprite (a window, a glint). One private texture per call; the instance disposes it. */
export function glowSprite(rgb, size = 64) {
  const [c, x] = canvas2d(size, size);
  const h = size / 2, g = x.createRadialGradient(h, h, 1, h, h, h);
  g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(0.3, `rgba(${rgb},0.55)`);
  g.addColorStop(0.7, `rgba(${rgb},0.12)`); g.addColorStop(1, `rgba(${rgb},0)`);
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  return canvasTexture(c);
}

/** Lumpy rounded blob (a garden tree, an island): an icosphere pushed in and out by a seeded hash. */
export function lumpGeometry(detail, seed, amount = 0.22) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const r = seeded(seed), p = g.attributes.position, cache = new Map();
  for (let i = 0; i < p.count; i++) {
    const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!cache.has(k)) cache.set(k, 1 + (r() - 0.5) * 2 * amount);
    const s = cache.get(k);
    p.setXYZ(i, p.getX(i) * s, p.getY(i) * s * 0.92, p.getZ(i) * s);
  }
  // a round blob shades smoothly: the normal is the direction from the centre, not the facet's
  const n = g.attributes.normal, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.set(p.getX(i), p.getY(i), p.getZ(i)).normalize(); n.setXYZ(i, v.x, v.y, v.z); }
  return g;
}

/** Free a list of disposables that may contain nulls. */
export function disposeAll(list) { for (const o of list) if (o && o.dispose) o.dispose(); }
