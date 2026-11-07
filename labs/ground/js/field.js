// The ground field: everything the ground knows, on a CPU grid so the cat,
// the sounds, the walkers and the grass can ask what is underfoot.
//
//   splatA  grass, moss, gravel, sand      (earth is whatever is left over)
//   splatB  paving, tataki, needles, wild
//   wear    the trail field G of Helbing et al. (1997): feet raise it, the
//           ground grows it back,  dG/dt = (G0 - G)/T + I (1 - G/Gmax) Σ steps
//   wet     local wetness (uchimizu, the gutter), drying over time
//   snow    how much of the snowfall may lie here (swept or trodden = less)
//   style   which stone pattern a paved texel uses
//   base    authored relief (ditch, ruts, mounds), metres
//
// Uploaded as three RGBA8 textures and one half-float height texture.
import * as THREE from 'three';
import { clamp, sstep } from './util.js';

export const CH = { grass: 0, moss: 1, gravel: 2, sand: 3, paving: 4, tataki: 5, needles: 6, wild: 7 };
export const MATERIALS = ['earth', 'grass', 'moss', 'gravel', 'sand', 'paving', 'tataki', 'needles', 'wild'];
// paving styles (the shader's procedural stone layer)
export const PAVE = { setts: 0, slabs: 1, nobedan: 2, arare: 3, uroko: 4, araidashi: 5 };
// how far a material lets feet wear it to earth (1 = fully), and how fast it heals (s)
const SOFT = { earth: 1, grass: 1, moss: 1, gravel: 0.8, sand: 0.9, paving: 0.12, tataki: 0.2, needles: 1, wild: 1 };

export class GroundField {
  constructor({ w = 16, d = 12, k = 16, x0 = -w / 2, z0 = -d / 2 } = {}) {
    Object.assign(this, { w, d, k, x0, z0 });
    this.nx = Math.round(w * k); this.nz = Math.round(d * k);
    const n = this.n = this.nx * this.nz;
    this.S = new Float32Array(n * 8);
    this.wear = new Float32Array(n);
    this.wet = new Float32Array(n);
    this.snow = new Float32Array(n).fill(1);
    this.style = new Uint8Array(n);
    this.base = new Float32Array(n);
    this.G0 = new Float32Array(n);       // the "natural" wear a place relaxes to (the lane keeps its ruts)
    this.T = 180;                         // regrowth time constant, seconds
    this.deposit = 0.035;                 // I: wear per paw-down
    this.dirty = { s: true, f: true, h: true };
    this.version = 0;
    const tex = (data, type = THREE.UnsignedByteType, format = THREE.RGBAFormat) => {
      const t = new THREE.DataTexture(data, this.nx, this.nz, format, type);
      t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      t.needsUpdate = true;
      return t;
    };
    this.bufA = new Uint8Array(n * 4); this.bufB = new Uint8Array(n * 4); this.bufF = new Uint8Array(n * 4);
    this.bufH = new Uint16Array(n);
    this.texA = tex(this.bufA); this.texB = tex(this.bufB); this.texF = tex(this.bufF);
    this.texH = tex(this.bufH, THREE.HalfFloatType, THREE.RedFormat);
    this.rect = new THREE.Vector4(x0, z0, 1 / w, 1 / d);
  }

  /* ---------------- addressing ---------------- */

  i(x, z) {
    const ix = clamp(Math.floor((x - this.x0) * this.k), 0, this.nx - 1), iz = clamp(Math.floor((z - this.z0) * this.k), 0, this.nz - 1);
    return iz * this.nx + ix;
  }
  xOf(ix) { return this.x0 + (ix + 0.5) / this.k; }
  zOf(iz) { return this.z0 + (iz + 0.5) / this.k; }
  inside(x, z, m = 0) { return x > this.x0 + m && x < this.x0 + this.w - m && z > this.z0 + m && z < this.z0 + this.d - m; }
  /** bilinear read of a 1-channel array */
  sample(arr, x, z) {
    const fx = clamp((x - this.x0) * this.k - 0.5, 0, this.nx - 1.001), fz = clamp((z - this.z0) * this.k - 0.5, 0, this.nz - 1.001);
    const ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz, n = this.nx;
    const a = arr[iz * n + ix], b = arr[iz * n + ix + 1], c = arr[(iz + 1) * n + ix], d = arr[(iz + 1) * n + ix + 1];
    return (a + (b - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz;
  }
  /** visit texels within r (+ soft) of (cx, cz): fn(index, falloff 0..1, x, z) */
  each(cx, cz, r, fn, soft = 0) {
    const R = r + soft, k = this.k;
    const i0 = Math.max(0, Math.floor((cx - R - this.x0) * k)), i1 = Math.min(this.nx - 1, Math.ceil((cx + R - this.x0) * k));
    const j0 = Math.max(0, Math.floor((cz - R - this.z0) * k)), j1 = Math.min(this.nz - 1, Math.ceil((cz + R - this.z0) * k));
    for (let j = j0; j <= j1; j++) {
      const z = this.zOf(j);
      for (let i = i0; i <= i1; i++) {
        const x = this.xOf(i), d = Math.hypot(x - cx, z - cz);
        const f = soft > 0 ? 1 - sstep(r, R, d) : (d <= r ? 1 : 0);
        if (f > 0) fn(j * this.nx + i, f, x, z);
      }
    }
  }

  /* ---------------- authoring ---------------- */

  clear() {
    this.S.fill(0); this.wear.fill(0); this.G0.fill(0); this.wet.fill(0); this.snow.fill(1); this.style.fill(0); this.base.fill(0);
    this.touch();
  }
  touch() { this.dirty.s = this.dirty.f = this.dirty.h = true; this.version++; }
  /** set material weights at a texel: m = { grass: .., moss: .. } (missing = 0) */
  setAt(idx, m, a = 1) {
    const o = idx * 8;
    for (let c = 0; c < 8; c++) this.S[o + c] *= 1 - a;
    for (const k in m) if (k in CH) this.S[o + CH[k]] += m[k] * a;
  }
  /** paint fn(x, z) -> { weights } | null over the whole field */
  fill(fn) {
    for (let j = 0; j < this.nz; j++) for (let i = 0; i < this.nx; i++) {
      const idx = j * this.nx + i, r = fn(this.xOf(i), this.zOf(j), idx);
      if (r) this.setAt(idx, r.m || {}, r.a ?? 1);
    }
    this.touch();
  }
  /** a brush: push material `mat` in (earth pulls every channel out) */
  paint(mat, cx, cz, r, s = 0.35, soft = 0.5) {
    const c = CH[mat];
    this.each(cx, cz, r, (idx, f) => {
      const a = s * f, o = idx * 8;
      for (let k = 0; k < 8; k++) if (k !== c) this.S[o + k] *= 1 - a;
      if (c !== undefined) this.S[o + c] += (1 - this.S[o + c]) * a;
      if (mat === 'paving' && this.paveStyle !== undefined) this.style[idx] = this.paveStyle;
    }, r * soft);
    this.dirty.s = this.dirty.f = true; this.version++;
  }
  /** raise (+) or dig (−) the authored relief */
  sculpt(cx, cz, r, amt) {
    this.each(cx, cz, r, (idx, f) => { this.base[idx] = clamp(this.base[idx] + amt * f, -0.35, 0.35); }, r);
    this.dirty.h = true; this.version++;
  }
  /** the gardener's ladle: a splash of water */
  wetAt(cx, cz, r, amt = 0.9) {
    this.each(cx, cz, r, (idx, f) => { this.wet[idx] = Math.min(1, this.wet[idx] + amt * f); }, r * 0.6);
    this.dirty.f = true;
  }
  sweepSnow(cx, cz, r, amt = 0.6) {
    this.each(cx, cz, r, (idx, f) => { this.snow[idx] = Math.max(0, this.snow[idx] - amt * f); }, r * 0.4);
    this.dirty.f = true;
  }

  /* ---------------- wear (Helbing) ---------------- */

  softAt(idx) {
    const o = idx * 8, S = this.S;
    let sum = 0, s = 0;
    for (let c = 0; c < 8; c++) { sum += S[o + c]; s += S[o + c] * SOFT[MATERIALS[c + 1]]; }
    return s + Math.max(0, 1 - sum) * SOFT.earth;
  }
  /** a paw (or a foot) comes down: Q = I (1 − G / Gmax), spread over r */
  step(x, z, r = 0.1, scale = 1) {
    const I = this.deposit * scale;
    this.each(x, z, r, (idx, f) => {
      const g = this.wear[idx];
      this.wear[idx] = Math.min(1, g + I * f * (1 - g));
    }, r);
    this.dirty.f = true; this.dirty.h = true;
  }
  /** relax toward G0 with time constant T (paving keeps its polish longer) */
  regrow(dt) {
    const k = Math.min(1, dt / this.T);
    const W = this.wear, G0 = this.G0;
    for (let i = 0; i < this.n; i++) {
      const g = W[i];
      if (g === G0[i]) continue;
      W[i] = g + (G0[i] - g) * k;
    }
    this.dirty.f = true; this.dirty.h = true;
  }
  dry(dt, rate = 1 / 70) {
    const k = dt * rate, W = this.wet;
    let any = false;
    for (let i = 0; i < this.n; i++) if (W[i] > 0) { W[i] = Math.max(0, W[i] - k * (0.6 + W[i] * 0.8)); any = true; }
    if (any) this.dirty.f = true;
  }
  snowRecover(dt, rate) {
    const S = this.snow;
    for (let i = 0; i < this.n; i++) if (S[i] < 1) S[i] = Math.min(1, S[i] + dt * rate);
    this.dirty.f = true;
  }

  /* ---------------- queries ---------------- */

  weights(x, z, out = new Float32Array(9)) {
    const o = this.i(x, z) * 8;
    let sum = 0;
    for (let c = 0; c < 8; c++) { out[c + 1] = this.S[o + c]; sum += out[c + 1]; }
    out[0] = Math.max(0, 1 - sum);
    return out;
  }
  /** what the shader's compaction does to the height, so paws land on the rut floor */
  compaction(idx) { return -0.045 * sstep(0.45, 1, this.wear[idx]) * Math.min(1, this.softAt(idx) * 1.2); }
  heightAt(x, z) {
    const idx = this.i(x, z);
    return this.sample(this.base, x, z) + this.compaction(idx);
  }
  /** the dominant material under (x, z), with worn grass/moss reading as earth */
  surfaceAt(x, z) {
    const w = this.weights(x, z), g = this.sample(this.wear, x, z);
    const worn = sstep(0.3, 0.6, g);
    w[0] += (w[1] + w[2] + w[7]) * worn; w[1] *= 1 - worn; w[2] *= 1 - worn; w[7] *= 1 - worn;
    let best = 0;
    for (let c = 1; c < 9; c++) if (w[c] > w[best]) best = c;
    return { mat: MATERIALS[best], wear: g, wet: this.sample(this.wet, x, z), snow: this.sample(this.snow, x, z) };
  }

  /* ---------------- upload ---------------- */

  upload() {
    const n = this.n;
    if (this.dirty.s) {
      const S = this.S, A = this.bufA, B = this.bufB;
      for (let i = 0; i < n; i++) {
        const o = i * 8, p = i * 4;
        A[p] = S[o] * 255; A[p + 1] = S[o + 1] * 255; A[p + 2] = S[o + 2] * 255; A[p + 3] = S[o + 3] * 255;
        B[p] = S[o + 4] * 255; B[p + 1] = S[o + 5] * 255; B[p + 2] = S[o + 6] * 255; B[p + 3] = S[o + 7] * 255;
      }
      this.texA.needsUpdate = this.texB.needsUpdate = true;
      this.dirty.s = false;
    }
    if (this.dirty.f) {
      const F = this.bufF;
      for (let i = 0; i < n; i++) {
        const p = i * 4;
        F[p] = this.wear[i] * 255; F[p + 1] = this.wet[i] * 255; F[p + 2] = this.snow[i] * 255; F[p + 3] = this.style[i] * 32 + 16;
      }
      this.texF.needsUpdate = true;
      this.dirty.f = false;
    }
    if (this.dirty.h) {
      const H = this.bufH, toHalf = THREE.DataUtils.toHalfFloat;
      for (let i = 0; i < n; i++) H[i] = toHalf(this.base[i]);
      this.texH.needsUpdate = true;
      this.dirty.h = false;
    }
  }

  /**
   * Write the game grass's BiomeMask (r meadow, g edge thicket, b flowers,
   * a wild) from this field, so the grass grows exactly where the ground
   * says grass and thins where feet have worn it.
   */
  writeGrassMask(mask, { flowers = 0.5 } = {}) {
    const tex = mask.texture, res = mask.res, data = tex.image.data;
    const nx = this.nx, nz = this.nz, S = this.S;
    if (!this._meadow) { this._meadow = new Float32Array(this.n); this._bare = new Float32Array(this.n); }
    const meadow = this._meadow, bare = this._bare;
    for (let i = 0; i < this.n; i++) {
      const o = i * 8, g = this.wear[i];
      const grass = S[o] + S[o + 7];
      const m = grass * (1 - sstep(0.26, 0.58, g));
      meadow[i] = m;
      bare[i] = 1 - Math.max(grass, S[o + 1]);
    }
    // a soft "nearby bare ground" for the edge thicket (taller, untrodden verge)
    const near = boxBlur(bare, nx, nz, 7);
    for (let j = 0; j < res; j++) {
      const z = mask.z0 + (j + 0.5) / mask.k;
      for (let i = 0; i < res; i++) {
        const x = mask.x0 + (i + 0.5) / mask.k, p = (j * res + i) * 4;
        if (!this.inside(x, z)) { data[p] = data[p + 1] = data[p + 2] = data[p + 3] = 0; continue; }
        const idx = this.i(x, z), m = meadow[idx], wild = S[idx * 8 + 7];
        const edge = m > 0.2 ? clamp((near[idx] - 0.2) * 1.4, 0, 0.6) * Math.max(0, 1 - this.wear[idx] * 3) : 0;
        const fl = flowers * m * clamp(edge * 1.4 + 0.15, 0, 1) * (0.5 + 0.5 * Math.sin(x * 2.1 + z * 1.3) * Math.sin(x * 0.7 - z * 1.9));
        data[p] = m * 255;
        data[p + 1] = clamp(edge, 0, 1) * 255;
        data[p + 2] = clamp(fl, 0, 1) * 255;
        data[p + 3] = clamp(wild * m, 0, 1) * 255;
      }
    }
    tex.needsUpdate = true;
  }
}

/** separable box blur of a nx × nz field (radius in texels) */
export function boxBlur(src, nx, nz, rad) {
  const tmp = new Float32Array(nx * nz), out = new Float32Array(nx * nz), w = 1 / (rad * 2 + 1);
  for (let j = 0; j < nz; j++) {
    let s = 0;
    for (let k = -rad; k <= rad; k++) s += src[j * nx + clamp(k, 0, nx - 1)];
    for (let i = 0; i < nx; i++) {
      tmp[j * nx + i] = s * w;
      s += src[j * nx + Math.min(nx - 1, i + rad + 1)] - src[j * nx + Math.max(0, i - rad)];
    }
  }
  for (let i = 0; i < nx; i++) {
    let s = 0;
    for (let k = -rad; k <= rad; k++) s += tmp[clamp(k, 0, nz - 1) * nx + i];
    for (let j = 0; j < nz; j++) {
      out[j * nx + i] = s * w;
      s += tmp[Math.min(nz - 1, j + rad + 1) * nx + i] - tmp[Math.max(0, j - rad) * nx + i];
    }
  }
  return out;
}
