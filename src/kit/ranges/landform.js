// The valley's landform and the ranges ring (Phase 2 v-ranges, lab 03).
//
// `terrainHeight` is the game's height field (ported from Countryside, which
// is hot): the playable bowl is flat to r = 55, three ranges climb behind the
// shrine and the land opens away behind the pagoda. The ring mesh is a polar
// grid with a graded radius: fine where the near hills read (r 55-200), coarse
// on the far peaks. Colours are baked after the normals so slope (rock
// exposure) can paint the ridges.
//
// Reusable (s3-vista imports this for the summit horizon): `ridgeRingGeometry`
// takes any height function, ring radii, grid density and colour function.
import * as THREE from 'three';
import { worldNoise } from '../../textures.js?v=20261113a';

export const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Which way the backdrop faces: wall 1 behind the shrine (-z), opening 1 behind the pagoda (+z). */
export function terrainSector(x, z) {
  const d = Math.sqrt(x * x + z * z);
  const toward = d > 1 ? -z / d : 0;
  const wall = Math.pow(sstep(-0.98, 0.95, toward), 1.4);
  const opening = sstep(0.2, -0.75, toward);
  return { wall, opening, d };
}

/** The game's world height field (identical to Countryside.terrainHeight). */
export function terrainHeight(x, z) {
  const { wall, opening, d } = terrainSector(x, z);
  if (d < 55) return 0;
  const ux = x / d, uz = z / d;
  const wander = (seed) => worldNoise(ux * 90 + 500, uz * 90 + 500, 0.02, 2, seed) * 2 - 1;
  const ridge = (centre, width, height) => { const t = (d - centre) / width; return height * Math.exp(-t * t); };
  const w1 = wander(51), w2 = wander(52), w3 = wander(53);
  const nearH = 9 + worldNoise(x, z, 0.03, 3, 11) * 13;
  const midH = 28 + worldNoise(x, z, 0.012, 3, 23) * 30;
  const n2 = worldNoise(x, z, 0.0085, 4, 29);
  const ridged = 1 - Math.abs(n2 * 2 - 1);
  const farH = 80 + Math.pow(ridged, 1.6) * 62 + worldNoise(x, z, 0.03, 3, 31) * 12;
  const rim = sstep(55, 76, d);
  let hills = ridge(90 + w1 * 18, 21 + w2 * 5, nearH) * rim * (0.3 + 0.7 * wall)
    + ridge(172 + w2 * 34, 44, midH) * (0.14 + 0.86 * wall)
    + ridge(310 + w3 * 48, 100, farH) * wall;
  hills += sstep(55, 130, d) * 7 * (0.3 + 0.7 * wall);
  hills += (worldNoise(x, z, 0.06, 2, 7) - 0.5) * 3 * sstep(57, 80, d);
  if (opening <= 0.001) return hills;
  const roll = worldNoise(x, z, 0.018, 3, 41) - 0.5;
  const lowland = -sstep(58, 175, d) * 32 + roll * 7 * sstep(56, 84, d);
  return hills + (lowland - hills) * opening;
}

/* ------------------------------------------------------------ ring mesh --- */

const geoCache = new Map();

/**
 * A polar height-field ring.
 *   r0, r1        inner and outer radius (m)
 *   around, rings angular and radial cells
 *   grade         >1 packs rings toward r0 (r = r0 + (r1-r0) * u^grade)
 *   heightAt      (x, z) => y
 *   colorAt       (x, z, h, ny, d, out: THREE.Color) => void, called after the normals
 *   floorHalf     the square (|x|,|z| < floorHalf) under another ground mesh is
 *                 sunk by floorDrop, eased out over the last 10 m (classic had a 4 m cliff)
 *   cacheKey      when given the baked arrays are memoised (deterministic callers only)
 */
export function ridgeRingGeometry({
  r0 = 56, r1 = 600, around = 192, rings = 80, grade = 1.7, heightAt = terrainHeight,
  colorAt = null, floorHalf = 126, floorDrop = 4, cacheKey = null
} = {}) {
  const key = cacheKey && `${cacheKey}|${r0}|${r1}|${around}|${rings}|${grade}|${floorHalf}|${floorDrop}`;
  if (key && geoCache.has(key)) {
    const c = geoCache.get(key);
    const g = new THREE.BufferGeometry();
    g.setIndex(new THREE.BufferAttribute(c.index, 1));
    for (const k of ['position', 'normal', 'color']) if (c[k]) g.setAttribute(k, new THREE.BufferAttribute(c[k].slice(), 3));
    g.computeBoundingSphere();
    return g;
  }
  const A = around, R = rings, n = (R + 1) * A;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i <= R; i++) {
    const r = r0 + (r1 - r0) * Math.pow(i / R, grade);
    for (let a = 0; a < A; a++) {
      const th = (a / A) * Math.PI * 2;
      const x = Math.cos(th) * r, z = Math.sin(th) * r;
      const drop = floorDrop * (1 - sstep(floorHalf - 8, floorHalf + 2, Math.max(Math.abs(x), Math.abs(z))));
      const o = (i * A + a) * 3;
      pos[o] = x; pos[o + 1] = heightAt(x, z) - drop; pos[o + 2] = z;
    }
  }
  const index = new Uint32Array(R * A * 6);
  let q = 0;
  for (let i = 0; i < R; i++) {
    for (let a = 0; a < A; a++) {
      const a1 = (a + 1) % A;
      const p00 = i * A + a, p01 = i * A + a1, p10 = (i + 1) * A + a, p11 = (i + 1) * A + a1;
      index[q++] = p00; index[q++] = p01; index[q++] = p10;
      index[q++] = p01; index[q++] = p11; index[q++] = p10;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  geo.computeVertexNormals();
  let col = null;
  if (colorAt) {
    col = new Float32Array(n * 3);
    const nrm = geo.attributes.normal.array, c = new THREE.Color();
    for (let v = 0; v < n; v++) {
      const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
      colorAt(x, z, y, nrm[v * 3 + 1], Math.sqrt(x * x + z * z), c);
      col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  geo.computeBoundingSphere();
  if (key) geoCache.set(key, { index, position: pos.slice(), normal: geo.attributes.normal.array.slice(), color: col && col.slice() });
  return geo;
}

/**
 * The valley palette: forested green at the foot, broadleaf blotches low and
 * cedar-dark high, bare rock where it is steep or high (with faint strata),
 * sunlit lowland behind the pagoda, and the baked haze that pales the far
 * peaks. Knobs 0..1: forest (rock exposure falls), strata, haze (x the classic
 * strength).
 */
export function valleyRangeColors({ forest = 1, strata = 0.5, haze = 1 } = {}) {
  const T = THREE.Color;
  const forestC = new T(0x2c4a28), forestLight = new T(0x4a6e3a), broad = new T(0x4f7a38), cedar = new T(0x22402a);
  const rock = new T(0x6a6a70), rockWarm = new T(0x7a7266), hazeC = new T(0x8d90b4);
  const lowland = new T(0x8aa257), lowlandFar = new T(0xa9b7a4);
  return (x, z, h, ny, d, c) => {
    const n = worldNoise(x, z, 0.04, 3, 17);
    c.copy(forestC).lerp(forestLight, n * 0.8);
    // broadleaf low, cedar high: two overlapping stands, not one gradient
    const stand = worldNoise(x, z, 0.012, 2, 61);
    c.lerp(broad, (1 - sstep(20, 70, h)) * stand * 0.55);
    c.lerp(cedar, sstep(25, 90, h) * (1 - stand) * 0.5);
    // bare rock: steep or high, thinned where the forest knob is up
    const steep = sstep(0.32, 0.7, 1 - ny) * 0.75;
    const rocky = Math.max(sstep(70, 130, h) * 0.8, steep) * (0.4 + n * 0.6) * (1.25 - 0.55 * forest);
    const band = Math.sin(h * 0.42 + worldNoise(x, z, 0.02, 2, 5) * 9) * 0.5 + 0.5;
    c.lerp(rock, Math.min(1, rocky) * 0.7).lerp(rockWarm, strata * band * Math.min(1, rocky) * 0.35);
    const { opening } = terrainSector(x, z);
    if (opening > 0) {
      c.lerp(lowland, opening * 0.8);
      c.lerp(lowlandFar, opening * sstep(120, 320, d) * 0.7);
    }
    c.lerp(hazeC, Math.min(1, sstep(105, 380, d) * 0.88 * haze));
  };
}
