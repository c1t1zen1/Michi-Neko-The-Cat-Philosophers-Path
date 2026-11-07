// The pure maths of the backdrop — no three.js in here so Node can test it
// (tools/ranges_test.mjs). Noise is a faithful port of src/textures.js
// valueNoise/worldNoise, and terrainSector/terrainHeight of
// src/countryside.js, so the bench shows the game's real landform.

export function hash2(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export const smooth = (t) => t * t * (3 - 2 * t);
export const smoothstep = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

export function mulberry32(a) {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tileable value noise on a `period` lattice (port of textures.js). */
export function valueNoise(x, y, period = 1 << 20, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const u = smooth(x - xi), v = smooth(y - yi);
  const p = period;
  const a = hash2(((xi % p) + p) % p, ((yi % p) + p) % p, seed);
  const b = hash2((((xi + 1) % p) + p) % p, ((yi % p) + p) % p, seed);
  const c = hash2(((xi % p) + p) % p, (((yi + 1) % p) + p) % p, seed);
  const d = hash2((((xi + 1) % p) + p) % p, (((yi + 1) % p) + p) % p, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Non-tiling 2D fractal noise, same recipe as the game's worldNoise. */
export function worldNoise(x, z, scale = 0.05, octaves = 4, seed = 0) {
  let amp = 1, sum = 0, norm = 0, f = scale;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(x * f + 1000, z * f + 1000, 1 << 20, seed + o * 31) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.1;
  }
  return sum / norm;
}

/** 1D value noise for ridge profiles (u is in lattice units). */
export function noise1(u, seed = 0) {
  const i = Math.floor(u), f = u - i, s = smooth(f);
  return lerp(hash2(i, seed * 7919, 13), hash2(i + 1, seed * 7919, 13), s);
}
export function fbm1(u, octaves = 4, seed = 0) {
  let amp = 1, sum = 0, norm = 0, f = 1;
  for (let o = 0; o < octaves; o++) { sum += noise1(u * f, seed + o * 31) * amp; norm += amp; amp *= 0.5; f *= 2.03; }
  return sum / norm;
}
/** Musgrave ridged multifractal: fold the basis (1 − |n|), sharpen. */
export function ridged1(u, octaves = 4, seed = 0, sharp = 1.6) {
  let amp = 0.55, sum = 0, norm = 0, f = 1;
  for (let o = 0; o < octaves; o++) {
    const n = 1 - Math.abs(noise1(u * f, seed + o * 37) * 2 - 1);
    sum += n * n * amp; norm += amp; amp *= 0.5; f *= 2.11;
  }
  return Math.pow(sum / norm, sharp);
}

/* ---------------- the game's landform, ported ---------------- */

export function terrainSector(x, z) {
  const d = Math.sqrt(x * x + z * z);
  const toward = d > 1 ? -z / d : 0;
  const wall = Math.pow(smoothstep(-0.98, 0.95, toward), 1.4);
  const opening = smoothstep(0.2, -0.75, toward);
  return { wall, opening, d };
}

export function terrainHeight(x, z) {
  const { wall, opening, d } = terrainSector(x, z);
  if (d < 55) return 0;
  const ux = x / d, uz = z / d;
  const wander = (seed) => worldNoise(ux * 90 + 500, uz * 90 + 500, 0.02, 2, seed) * 2 - 1;
  const ridge = (centre, width, height) => {
    const t = (d - centre) / width;
    return height * Math.exp(-t * t);
  };
  const w1 = wander(51), w2 = wander(52), w3 = wander(53);
  const nearH = 9 + worldNoise(x, z, 0.03, 3, 11) * 13;
  const midH = 28 + worldNoise(x, z, 0.012, 3, 23) * 30;
  const n2 = worldNoise(x, z, 0.0085, 4, 29);
  const ridged = 1 - Math.abs(n2 * 2 - 1);
  const farH = 80 + Math.pow(ridged, 1.6) * 62 + worldNoise(x, z, 0.03, 3, 31) * 12;
  const rim = smoothstep(55, 76, d);
  let hills = ridge(90 + w1 * 18, 21 + w2 * 5, nearH) * rim * (0.3 + 0.7 * wall)
    + ridge(172 + w2 * 34, 44, midH) * (0.14 + 0.86 * wall)
    + ridge(310 + w3 * 48, 100, farH) * wall;
  hills += smoothstep(55, 130, d) * 7 * (0.3 + 0.7 * wall);
  hills += (worldNoise(x, z, 0.06, 2, 7) - 0.5) * 3 * smoothstep(57, 80, d);
  if (opening <= 0.001) return hills;
  const roll = worldNoise(x, z, 0.018, 3, 41) - 0.5;
  const lowland = -smoothstep(58, 175, d) * 32 + roll * 7 * smoothstep(56, 84, d);
  return hills + (lowland - hills) * opening;
}

/* ---------------- ridge profiles: silhouette functions u∈[0,1]→[0,1] ---------------- */

const gauss = (u, c, w) => Math.exp(-(((u - c) / w) ** 2));

export const PROFILES = {
  // The valley's own three rings, normalised to silhouette height.
  'valley-near': { jp: '麓の丘', name: 'Valley foothills', h: (u) => clamp(0.34 + (fbm1(u * 5.3, 3, 11) - 0.5) * 0.9, 0, 1), trees: 'mixed' },
  'valley-mid': { jp: '尾根', name: 'Mid ridge', h: (u) => clamp(0.44 + (fbm1(u * 3.1, 3, 23) - 0.5) * 0.75 + ridged1(u * 2.2, 3, 29) * 0.28, 0, 1), trees: 'cedar' },
  'valley-far': { jp: '高峰', name: 'Far peaks', h: (u) => clamp(0.28 + ridged1(u * 2.05, 4, 29) * 0.8 + (fbm1(u * 8, 2, 31) - 0.5) * 0.22, 0, 1), trees: 'bare' },
  // Kyoto's borrowed scenery.
  'higashiyama': { jp: '東山三十六峰', name: 'Higashiyama 36 peaks', h: (u) => clamp(0.30 + (fbm1(u * 7.4, 3, 5) - 0.5) * 0.34 + gauss(u, 0.3, 0.12) * 0.22 + gauss(u, 0.62, 0.09) * 0.3 + gauss(u, 0.86, 0.14) * 0.2, 0, 1), trees: 'akamatsu' },
  'kitayama': { jp: '北山杉', name: 'Kitayama cedars', h: (u) => clamp(0.34 + Math.pow(Math.abs(noise1(u * 3.6, 17) * 2 - 1), 0.7) * 0.62 + (fbm1(u * 9, 2, 3) - 0.5) * 0.18, 0, 1), trees: 'sugi' },
  'atago': { jp: '愛宕山', name: 'Mt. Atago', h: (u) => clamp(0.16 + gauss(u, 0.46, 0.16) * 0.78 + gauss(u, 0.72, 0.1) * 0.34 + gauss(u, 0.2, 0.12) * 0.3 + (fbm1(u * 11, 2, 41) - 0.5) * 0.12, 0, 1), trees: 'cedar' },
  'arashiyama': { jp: '嵐山', name: 'Arashiyama', h: (u) => clamp(0.26 + gauss(u, 0.42, 0.14) * 0.42 + gauss(u, 0.66, 0.1) * 0.5 + (fbm1(u * 6.4, 3, 77) - 0.5) * 0.5, 0, 1), trees: 'momiji' },
  // Stylised extremes for the specimen shelf.
  'paper': { jp: '大和絵', name: 'Paper range', h: (u) => clamp(0.4 + (fbm1(u * 2.6, 2, 9) - 0.5) * 0.7 + gauss(u, 0.55, 0.08) * 0.3, 0, 1), trees: 'none' },
  'drawn': { jp: '描いた山', name: 'Drawn ridge', h: null, trees: 'cedar' }
};

export function profileHeight(kind, u) {
  const p = PROFILES[kind];
  if (!p || !p.h) return 0.4;
  return p.h(((u % 1) + 1) % 1);
}

/** Resample a user's freehand stroke into a smooth silhouette u∈[0,1]→[0,1]. */
export function strokeToProfile(points, samples = 96) {
  if (!points || points.length < 2) return () => 0.4;
  // points: [{u, h}] already normalised by the caller
  const pts = points.slice().sort((a, b) => a.u - b.u);
  const raw = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const u = i / (samples - 1);
    let j = 0;
    while (j < pts.length - 2 && pts[j + 1].u < u) j++;
    const a = pts[j], b = pts[Math.min(j + 1, pts.length - 1)];
    const t = b.u - a.u > 1e-6 ? (u - a.u) / (b.u - a.u) : 0;
    raw[i] = lerp(a.h, b.h, clamp(t, 0, 1));
  }
  // Two box-blur passes: the hand's jitter becomes a painted silhouette.
  const smoothArr = (src, r) => {
    const out = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      let s = 0, n = 0;
      for (let k = -r; k <= r; k++) { const j = i + k; if (j >= 0 && j < samples) { s += src[j]; n++; } }
      out[i] = s / n;
    }
    return out;
  };
  const s2 = smoothArr(smoothArr(raw, 4), 3);
  return (u) => {
    const x = clamp(u, 0, 1) * (samples - 1);
    const i = Math.floor(x), f = x - i;
    return lerp(s2[i], s2[Math.min(i + 1, samples - 1)], f);
  };
}

/* ---------------- impostor direction mapping (octahedral, hemisphere) ---------------- */

// A direction (unit-ish vector toward the camera) folds onto the octahedron's
// upper half: uv covers a diamond. Cells outside |u|+|v|>1 are unused for
// ground objects but still get baked (nearest edge) so bilinear samples are
// never black.
export function octUV(dir) {
  const d = [dir.x, dir.y, dir.z];
  const inv = 1 / (Math.abs(d[0]) + Math.abs(d[1]) + Math.abs(d[2]));
  return [d[0] * inv * 0.5 + 0.5, d[2] * inv * 0.5 + 0.5];
}
export function octDir(u, v) {
  // uv in [0,1]² back to a hemisphere direction (y ≥ 0)
  const x = u * 2 - 1, z = v * 2 - 1;
  const s = Math.abs(x) + Math.abs(z);
  let dir;
  if (s <= 1) dir = [x, 1 - s, z];
  else { // outside the diamond: fold onto the horizon ring
    const k = 1 / Math.max(1e-6, s);
    dir = [x * k, 0, z * k];
  }
  const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  return { x: dir[0] / l, y: dir[1] / l, z: dir[2] / l };
}
