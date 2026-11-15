// The shared cloud weather field (promoted from labs/sky/js/field.js, the
// "one cloud field, three renderers" decision of the Sky Lab): a periodic
// 256² tile that the cloud deck draws, the post chain projects as cloud
// shadow, and the light shafts read for gaps. One map, so a hole in the
// sky arrives on the ground at the same moment it opens overhead.
//
// Four channels, one cloud family each (JMA genera, labs/sky/research.md):
//   R  wata-gumo   cumulus: remapped fbm, broad sunny-day puffs
//   G  suji-gumo   cirrus: noise stretched along the wind, brushed fibres
//   B  hitsuji-gumo altocumulus: jittered cells, a flock of rounded puffs
//   A  stratus     two low octaves: the soft sheet of rain, snow and mist
// The deck mixes them per weather (`uCloudMix`), so a change of weather is
// a crossfade of genera, not a swap of textures.
//
// Deterministic: integer lattice hashes seeded from ctx.rng (no Math.random,
// no sin hash), cached per seed so a warm build reuses the tile.
import * as THREE from 'three';

export const FIELD_SIZE = 256;

const smooth = (x) => x * x * (3 - 2 * x);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Integer lattice hash → [0, 1). */
function hash3(x, y, z, seed) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(z | 0, 0x1b873593) ^ seed;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Periodic value noise on a cells × cellsY lattice (the tile meets itself at its edges). */
function noise(x, y, cells, cellsY, seed, z = 0) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = smooth(x - ix), fy = smooth(y - iy);
  const x0 = ((ix % cells) + cells) % cells, x1 = (x0 + 1) % cells;
  const y0 = ((iy % cellsY) + cellsY) % cellsY, y1 = (y0 + 1) % cellsY;
  const a = hash3(x0, y0, z, seed), b = hash3(x1, y0, z, seed);
  const c = hash3(x0, y1, z, seed), d = hash3(x1, y1, z, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

function fbm(u, v, seed, octaves, base = 4) {
  let s = 0, amp = 0.55, total = 0, cells = base;
  for (let o = 0; o < octaves; o++) {
    s += amp * noise(u * cells, v * cells, cells, cells, seed, o + 1);
    total += amp;
    amp *= 0.52;
    cells *= 2;
  }
  return s / total;
}

/** Nearest jittered cell centre (periodic, n cells per side): [distance, that cell's hash]. */
function cells(u, v, n, seed) {
  const x = u * n, y = v * n, ix = Math.floor(x), iy = Math.floor(y);
  let d = 4, id = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const a = ix + i, b = iy + j;
      const wa = ((a % n) + n) % n, wb = ((b % n) + n) % n;
      const px = a + 0.5 + (hash3(wa, wb, 7, seed) - 0.5) * 0.7;
      const py = b + 0.5 + (hash3(wa, wb, 11, seed) - 0.5) * 0.7;
      const dd = Math.hypot(px - x, py - y);
      if (dd < d) { d = dd; id = hash3(wa, wb, 13, seed); }
    }
  }
  return [d, id];
}

/**
 * Histogram-equalise each channel (a monotonic remap, so every contour keeps
 * its shape) into bytes: a threshold of 1 − cover then covers that share of
 * the sky whichever genus is showing.
 */
function equalize(raw) {
  const n = raw.length / 4, BINS = 4096, data = new Uint8Array(raw.length);
  for (let c = 0; c < 4; c++) {
    let lo = Infinity, hi = -Infinity;
    for (let i = c; i < raw.length; i += 4) { lo = Math.min(lo, raw[i]); hi = Math.max(hi, raw[i]); }
    const scale = (BINS - 1) / Math.max(hi - lo, 1e-9), hist = new Uint32Array(BINS);
    for (let i = c; i < raw.length; i += 4) hist[Math.round((raw[i] - lo) * scale)]++;
    const map = new Float32Array(BINS);
    let below = 0;
    for (let b = 0; b < BINS; b++) { map[b] = (below + hist[b] * 0.5) / n; below += hist[b]; }
    for (let i = c; i < raw.length; i += 4) data[i] = Math.round(map[Math.round((raw[i] - lo) * scale)] * 255);
  }
  return data;
}

const cache = new Map();

/**
 * The field for one seed: `{ size, data (Uint8Array RGBA), texture, sample(u, v, mix) }`.
 * Cached: the texture is shared by every instance built from the same seed
 * (marked so dispose() never frees it).
 */
export function cloudField(seed) {
  const key = seed >>> 0;
  if (cache.has(key)) return cache.get(key);
  const N = FIELD_SIZE, raw = new Float32Array(N * N * 4);
  const s1 = key ^ 0x51ed27, s2 = key ^ 0x2c1b3c6d, s3 = key ^ 0x297a2d39, s4 = key ^ 0x6b43a9b5;
  for (let y = 0; y < N; y++) {
    const v = y / N;
    for (let x = 0; x < N; x++) {
      const u = x / N, k = (y * N + x) * 4;
      // R: cumulus — separate puffs of different sizes (one per jittered cell), lobed by
      // finer fbm, in cloudier and clearer regions: wata-gumo, not one smoke sheet
      const wu = u + (noise(u * 4, v * 4, 4, 4, s1, 9) - 0.5) * 0.07;
      const wv = v + (noise(u * 4, v * 4, 4, 4, s1, 10) - 0.5) * 0.07;
      const [cd, cid] = cells(wu, wv, 6, s1);
      const [sd, sid] = cells(wu, wv, 14, s1 ^ 0x3a);
      const big = Math.sqrt(Math.max(0, 1 - cd / (0.2 + 0.42 * cid)));
      // satellite puffs crowd the big ones (cauliflower clusters), a few drift alone
      const small = Math.sqrt(Math.max(0, 1 - sd / (0.18 + 0.3 * sid))) * (0.45 + 0.55 * Math.min(1, big * 2.2));
      const body = Math.max(big, small * 0.82);
      const lobes = fbm(wu, wv, s1, 4, 8) - 0.5;
      const region = fbm(u, v, s1 ^ 0x77, 2, 2);
      raw[k] = body * (0.7 + 0.4 * region) + lobes * 0.75 * (0.35 + body) + region * 0.18;
      // G: cirrus — long fibres along u (the wind), bent by a slow wave
      const bend = Math.sin(u * Math.PI * 4 + noise(u * 2, v * 2, 2, 2, s2, 3) * 3) * 1.2;
      raw[k + 1] = noise(u * 2, v * 32 + bend, 2, 32, s2, 1) * 0.68 + noise(u * 4, v * 64 + bend * 2, 4, 64, s2, 2) * 0.32;
      // B: altocumulus — rounded cells in loose rows, a little irregularity in every one
      const [ad] = cells(u, v, 10, s3);
      raw[k + 2] = Math.sqrt(Math.max(0, 1 - ad * 1.85)) * (0.62 + 0.38 * fbm(u, v, s3, 3, 8)) + fbm(u, v, s3 ^ 0x5, 2, 4) * 0.12;
      // A: stratus — three low octaves, soft and broad
      raw[k + 3] = fbm(u, v, s4, 3, 2);
    }
  }
  const data = equalize(raw);
  const texture = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  texture.name = 'kit-sky:cloud-field';
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.NoColorSpace;
  texture.userData.shared = true;
  texture.needsUpdate = true;
  const field = {
    size: N, data, texture, seed: key,
    /** Bilinear CPU read of the mixed field at tile coordinates (u, v) — the same arithmetic as kitCloudRaw(). */
    raw(u, v, mix) {
      const fx = (u - Math.floor(u)) * N - 0.5, fy = (v - Math.floor(v)) * N - 0.5;
      const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const x0 = ((ix % N) + N) % N, x1 = (x0 + 1) % N, y0 = ((iy % N) + N) % N, y1 = (y0 + 1) % N;
      const k00 = (y0 * N + x0) * 4, k10 = (y0 * N + x1) * 4, k01 = (y1 * N + x0) * 4, k11 = (y1 * N + x1) * 4;
      let out = 0;
      for (let c = 0; c < 4; c++) {
        if (!mix[c]) continue;
        const a = data[k00 + c], b = data[k10 + c], d = data[k01 + c], e = data[k11 + c];
        out += mix[c] * (a + (b - a) * tx + (d - a) * ty + (a - b - d + e) * tx * ty) / 255;
      }
      return out;
    }
  };
  cache.set(key, field);
  return field;
}

/** The coverage threshold of kitCloudAt(), on the CPU (sun occlusion for the post chain). */
export function densityFromRaw(raw, cover, soft) {
  const t = 1 - cover;
  const lo = t - soft, hi = t + soft * 2.2;
  const x = clamp01((raw - lo) / (hi - lo));
  return x * x * (3 - 2 * x);
}

/** Deck radius of curvature: the layer bends down to meet the horizon ~1.2 km out. */
export const DECK_CURVE = 4000;

/** Distance along unit `dir` from a point `rel` (relative to the dome centre) to the curved deck at `height`. */
export function deckDistance(rel, dir, height) {
  const R = DECK_CURVE;
  const px = rel.x, py = rel.y + R, pz = rel.z;
  const b = px * dir.x + py * dir.y + pz * dir.z;
  const c = px * px + py * py + pz * pz - (R + height) * (R + height);
  return -b + Math.sqrt(Math.max(b * b - c, 0));
}

/**
 * GLSL shared by the deck, the projected shade and the shaft march. Every
 * name carries a `kit` prefix: it is inserted into the classic atmosphere
 * shader on the modular set, next to that shader's own helpers.
 */
export const CLOUD_GLSL = /* glsl */`
uniform sampler2D uCloudField;
uniform vec4 uCloudMix;
uniform vec2 uCloudOffset;
uniform vec3 uCloudCenter;
uniform float uCloudCover;
uniform float uCloudSoft;
uniform float uCloudSpan;
uniform float uCloudBase;
float kitCloudRaw(vec2 uv) { return dot(texture2D(uCloudField, uv), uCloudMix); }
float kitCloudAt(vec2 uv) {
  float t = 1.0 - uCloudCover;
  return smoothstep(t - uCloudSoft, t + uCloudSoft * 2.2, kitCloudRaw(uv));
}
vec2 kitCloudUV(vec2 xz) { return xz / uCloudSpan + uCloudOffset; }
float kitDeckDistance(vec3 rel, vec3 dir, float height) {
  const float R = ${DECK_CURVE.toFixed(1)};
  vec3 p = rel + vec3(0.0, R, 0.0);
  float b = dot(p, dir);
  float c = dot(p, p) - (R + height) * (R + height);
  return -b + sqrt(max(b * b - c, 0.0));
}
`;
