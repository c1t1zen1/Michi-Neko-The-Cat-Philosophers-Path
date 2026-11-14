// Shared helpers of the interiors family (tea-house room, lab 21).
// Everything is plain merged geometry on a handful of materials so the
// interior's _mergeStatics() folds each part into one draw call per material:
//   - the interior's own textured MAT entries (plaster, timber, tatami) when
//     the owner passes them, kit materials of the same look otherwise;
//   - km.bag (vertex colour) for everything painted;
//   - one lit-paper material for the shoji (driven by the hour).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Bag, canvas2d, canvasTexture, rng } from '../craft.js?v=20261113a';
import { worldScaleBoxUVs } from '../../textures.js?v=20261113a';
import { nightnessAt, washiTexture } from '../lanterns/light.js?v=20261113a';

export const tierFlags = (tier) => ({ hi: tier === 'hero', far: tier === 'far' });

/** The room's surfaces: the owner's textured MAT when present, else the kit's own. */
export function roomMats(ctx) {
  const km = ctx.kitMaterials, M = ctx.MAT || {};
  return {
    plaster: M.plasterWarm || km.plaster({ tint: 0xf3e8d4, seed: 4 }),
    timber: M.timberDark || km.wood({ base: 0x3f2818, dark: 0x1c110a, seed: 6 }),
    engawa: M.timberEngawa || km.wood({ base: 0x8a5f3a, dark: 0x4a2f1a, seed: 7 }),
    tatami: M.tatami || km.straw({ color: 0xb9c98e }),
    bag: km.bag({ rough: 0.82 })
  };
}

/** Boxes on a textured material, UVs at world scale (as the classic room's `box()`), baked into one mesh. */
export class TexBag {
  constructor(mat) { this.mat = mat; this.geos = []; this.panel = !!(mat.userData && mat.userData.uvPanel); }
  box(w, h, d, x = 0, y = 0, z = 0) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (!this.panel) worldScaleBoxUVs(g, 1);
    g.translate(x, y, z);
    this.geos.push(g);
    return this;
  }
  mesh(name) {
    if (!this.geos.length) return null;
    const g = mergeGeometries(this.geos);
    for (const x of this.geos) x.dispose();
    this.geos = [];
    const m = new THREE.Mesh(g, this.mat);
    m.name = name; m.castShadow = m.receiveShadow = true;
    return m;
  }
}

/** A Bag baked into a named, shadowed mesh (null when empty). */
export function bagMesh(bag, mat, name, cast = true) {
  const m = bag.mesh(mat, name);
  if (m) { m.name = name; m.castShadow = cast; m.receiveShadow = true; }
  return m;
}

/** A group holding the non-null meshes, each addressable by its name. */
export function groupOf(name, ...meshes) {
  const g = new THREE.Group();
  g.name = name;
  for (const m of meshes) if (m) g.add(m);
  return g;
}

/** The named children of a group as a `parts` map. */
export function partsOf(group) {
  const parts = {};
  for (const c of group.children) if (c.isMesh && c.name) parts[c.name] = c;
  return parts;
}

export const solo = (group, extra = {}) => ({ group, parts: partsOf(group), sockets: {}, live: [], ...extra });

/* ----------------------------------------------------------- shoji paper --- */

export function paperMat(ctx) {
  const km = ctx.kitMaterials;
  return km.paper({ color: 0xfff1d6, glow: 0.4, glowColor: 0xffe2b0, rough: 0.92, map: washiTexture(km, { ribs: 0 }), side: THREE.DoubleSide });
}

const _c = new THREE.Color(), DAY = new THREE.Color(0xffeccc), DUSK = new THREE.Color(0xff9a52), NIGHT = new THREE.Color(0x4a5f8c);

/**
 * Light through the paper: the sky's colour on the outside of the shoji.
 * Warm white by day (paper halves the sun, so a calm 0.5), amber at dusk, a
 * dim moon blue at night when only the room's own lamps are lit.
 */
export function shojiLight(mat, hour) {
  const night = nightnessAt(typeof hour === 'number' ? hour : 12);
  const dusk = Math.min(1, night * (1 - night) * 4.2);
  _c.copy(DAY).lerp(DUSK, dusk).lerp(NIGHT, Math.max(0, night * 1.2 - 0.2));
  mat.emissive.copy(_c);
  mat.emissiveIntensity = 0.52 * (1 - night) + 0.12 * night + 0.1 * dusk;
}

/* --------------------------------------------------------------- painting --- */

const cache = new WeakMap();
/** The hanging scroll's ink painting: mist, ridges, a moon, one pine, a column of brush strokes and a seal. */
export function paintingTexture(km) {
  const key = km && typeof km === 'object' ? km : cache;
  if (!cache.has(key)) cache.set(key, new Map());
  const bag = cache.get(key);
  if (!bag.has('ink')) {
    const [c, x] = canvas2d(160, 260);
    const r = rng(52);
    x.fillStyle = '#e7dcbf'; x.fillRect(0, 0, 160, 260);
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(110,92,58,${r() * 0.05})`; x.fillRect(r() * 160, r() * 260, 1 + r() * 3, 1); }
    x.fillStyle = 'rgba(247,240,222,0.9)'; x.beginPath(); x.arc(104, 62, 17, 0, 6.3); x.fill();
    for (let layer = 0; layer < 4; layer++) {
      x.fillStyle = `rgba(52,62,58,${0.12 + layer * 0.14})`;
      x.beginPath(); x.moveTo(0, 260);
      for (let px = 0; px <= 160; px += 4) x.lineTo(px, 150 + layer * 26 - Math.sin(px * 0.05 + layer * 1.7) * 20 - Math.sin(px * 0.13 + layer) * 6);
      x.lineTo(160, 260); x.closePath(); x.fill();
    }
    x.strokeStyle = '#26302b'; x.lineWidth = 2.4;
    x.beginPath(); x.moveTo(40, 232); x.bezierCurveTo(34, 200, 50, 180, 42, 150); x.stroke();
    for (let j = 0; j < 5; j++) { x.lineWidth = 1.6; x.beginPath(); x.moveTo(42, 158 + j * 12); x.quadraticCurveTo(24 - j * 2, 160 + j * 12, 18 - j * 3, 170 + j * 12); x.moveTo(42, 158 + j * 12); x.quadraticCurveTo(58 + j * 2, 160 + j * 12, 66 + j * 3, 170 + j * 12); x.stroke(); }
    x.fillStyle = '#2a2c27';
    for (let i = 0; i < 6; i++) x.fillRect(128 + (i % 2) * 3, 94 + i * 17, 5 + r() * 7, 10 + r() * 6);
    x.fillStyle = '#a3402f'; x.fillRect(132, 222, 15, 17); x.fillStyle = '#e7dcbf'; x.fillRect(136, 226, 3, 8); x.fillRect(141, 225, 3, 11);
    bag.set('ink', canvasTexture(c));
    bag.get('ink').userData.kit = true;
  }
  return bag.get('ink');
}

export { Bag, rng };
