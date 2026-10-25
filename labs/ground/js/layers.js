// Painterly 256 px layer bakes (earth, gravel, moss): albedo + height in alpha,
// packed into DataArrayTextures with normals derived from the heights.
import * as THREE from 'three';
import { pcg2d } from './hash.js';

const N = 256;
const hv = (x, y, p, s) => pcg2d(((x % p) + p) % p + s * 977, ((y % p) + p) % p)[0] / 4294967296;
const sm5 = (t) => t * t * t * (t * (t * 6 - 15) + 10);
// periodic value noise: u, v in 0..1, `per` cells across
function pn(u, v, per, s) {
  const x = u * per, y = v * per, ix = Math.floor(x), iy = Math.floor(y), fx = sm5(x - ix), fy = sm5(y - iy);
  const a = hv(ix, iy, per, s), b = hv(ix + 1, iy, per, s), c = hv(ix, iy + 1, per, s), d = hv(ix + 1, iy + 1, per, s);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}
const pfbm = (u, v, per, s, oct = 4) => { let t = 0, a = 0.5; for (let i = 0; i < oct; i++) { t += a * pn(u, v, per << i, s + i); a *= 0.5; } return t; };
// periodic voronoi: [F1, F2, hash of the nearest cell, hash2]
function vor(u, v, per, s, jit = 1) {
  const x = u * per, y = v * per, ix = Math.floor(x), iy = Math.floor(y);
  let f1 = 9, f2 = 9, id = 0, id2 = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = ix + i, cy = iy + j, mx = ((cx % per) + per) % per, my = ((cy % per) + per) % per;
    const [a, b] = pcg2d(mx + s * 977, my);
    const px = cx + 0.5 + (a / 4294967296 - 0.5) * jit, py = cy + 0.5 + (b / 4294967296 - 0.5) * jit;
    const d = Math.hypot(px - x, py - y);
    if (d < f1) { f2 = f1; f1 = d; id = a / 4294967296; id2 = b / 4294967296; } else if (d < f2) f2 = d;
  }
  return [f1, f2, id, id2];
}
const mix = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const earth = (u, v) => {
  const macro = pfbm(u, v, 3, 1), patch = pfbm(u, v, 5, 7, 3), grain = pn(u, v, 96, 3), fine = pn(u, v, 200, 4);
  let c = mix3([0.40, 0.31, 0.22], [0.54, 0.43, 0.30], macro);
  c = mix3(c, [0.58, 0.45, 0.26], smooth(0.55, 0.8, patch) * 0.6);
  const [f1, , id, id2] = vor(u, v, 22, 2);
  const r = 0.2 + id * 0.18, peb = id2 < 0.5 ? Math.max(0, 1 - (f1 / r) ** 2) : 0;
  const g = 0.36 + id * 0.16;
  c = mix3(c, mix3([g, g * 0.97, g * 0.94], [0.34, 0.32, 0.4], smooth(0.5, 0, peb) * 0.5), Math.min(1, peb * 4));
  const h = 0.32 + macro * 0.22 + grain * 0.1 + fine * 0.05 + peb * 0.4;
  c = mix3(c, [0.27, 0.24, 0.33], (1 - h) * 0.28);
  const sh = 0.9 + (grain - 0.5) * 0.25 + (fine - 0.5) * 0.15;
  return [c[0] * sh, c[1] * sh, c[2] * sh, h];
};
const gravel = (u, v) => {
  const [f1, f2, id, id2] = vor(u, v, 40, 5, 0.9), macro = pfbm(u, v, 4, 9, 3);
  const dome = Math.max(0, 1 - (f1 / 0.62) ** 1.8), edge = smooth(0.0, 0.14, f2 - f1);
  let c = mix3([0.62, 0.59, 0.55], [0.74, 0.71, 0.66], id);
  if (id2 < 0.22) c = mix3(c, [0.82, 0.70, 0.62], 0.7); else if (id2 > 0.82) c = mix3(c, [0.66, 0.70, 0.74], 0.7);
  const lit = 0.88 + dome * 0.18 + (macro - 0.5) * 0.12;
  c = mix3([0.30, 0.28, 0.30], [c[0] * lit, c[1] * lit, c[2] * lit], edge);
  return [c[0], c[1], c[2], 0.12 + dome * edge * 0.55 + macro * 0.12];
};
const moss = (u, v) => {
  const [f1, , id] = vor(u, v, 7, 11, 0.9), macro = pfbm(u, v, 4, 13, 3), fr = pn(u + pn(u, v, 6, 17) * 0.02, v, 150, 18), fr2 = pn(u, v + 0.01 * pn(u, v, 9, 19), 110, 20);
  const cush = Math.max(0, 1 - (f1 / 0.85) ** 1.5) * (0.7 + id * 0.3);
  const h = 0.3 + cush * 0.4 + fr * 0.14 + fr2 * 0.1 + macro * 0.1;
  const t = Math.min(1, Math.max(0, (h - 0.35) * 1.7));
  let c = t < 0.55 ? mix3([0.13, 0.23, 0.2], [0.27, 0.43, 0.18], t / 0.55) : mix3([0.27, 0.43, 0.18], [0.66, 0.72, 0.27], (t - 0.55) / 0.45);
  c = mix3(c, [0.4, 0.5, 0.2], (macro - 0.5) * 0.4 + 0.1);
  return [c[0], c[1], c[2], h];
};

function bake(fn, strength) {
  const alb = new Uint8Array(N * N * 4), nor = new Uint8Array(N * N * 4), hh = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const o = fn((x + 0.5) / N, (y + 0.5) / N), i = (y * N + x) * 4;
    hh[y * N + x] = o[3];
    for (let k = 0; k < 3; k++) alb[i + k] = Math.min(255, Math.max(0, Math.round(Math.min(1, Math.max(0, o[k])) * 255)));
    alb[i + 3] = Math.round(Math.min(1, Math.max(0, o[3])) * 255);
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const xp = (x + 1) % N, xm = (x + N - 1) % N, yp = (y + 1) % N, ym = (y + N - 1) % N;
    const dx = (hh[y * N + xp] - hh[y * N + xm]) * strength, dy = (hh[yp * N + x] - hh[ym * N + x]) * strength, l = Math.hypot(dx, dy, 1), i = (y * N + x) * 4;
    nor[i] = (-dx / l * 0.5 + 0.5) * 255; nor[i + 1] = (-dy / l * 0.5 + 0.5) * 255; nor[i + 2] = (1 / l * 0.5 + 0.5) * 255; nor[i + 3] = 255;
  }
  return [alb, nor];
}

let cache = null;
export function layerTextures(renderer) {
  if (cache) return cache;
  const t0 = performance.now();
  const parts = [bake(earth, 1.6), bake(gravel, 2.4), bake(moss, 1.4)];
  const pack = (k, srgb) => {
    const data = new Uint8Array(N * N * 4 * 3);
    parts.forEach((p, i) => data.set(p[k], i * N * N * 4));
    const t = new THREE.DataArrayTexture(data, N, N, 3);
    t.format = THREE.RGBAFormat; t.type = THREE.UnsignedByteType;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
    t.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  };
  cache = { alb: pack(0, true), nor: pack(1, false), ms: performance.now() - t0 };
  return cache;
}
