// The ground field (promoted from labs/ground/js/field.js, lab 01): everything
// the ground knows, on a CPU grid, so the shader, the grass and later the
// sounds can ask what is underfoot.
//
//   splatA  grass, moss, gravel, sand      (earth is whatever is left over)
//   splatB  paving, tataki, needles, wild
//   wear    the trail field G of Helbing et al. (1997): paws raise it, the
//           ground grows it back toward G0,
//             dG/dt = (G0 - G)/T + I (1 - G/Gmax) Σ steps
//   G0      the wear a place relaxes to (the worn road shoulders keep theirs)
//   wet     standing dampness (the river bank), 0..1
//   snow    how much of a snowfall may lie here (trodden = less)
//   style   which stone pattern a paved texel uses (PAVE)
//   base    relief in metres. In the game it never moves a vertex (walk
//           heights are the valley's own): it only sets where puddles stand.
//
// Uploaded as three RGBA8 textures and one half-float height texture. The
// game's additions to the lab field: the standing wear G0 is authored (the
// shoulders are "wherever G is in between"), a dynamic-wear box so regrowth
// only touches what paws changed, and wearGrassMask(), which thins the grass
// BiomeMask's meadow where paws wore it and never touches a lawn texel.
import * as THREE from 'three';

export const CH = { grass: 0, moss: 1, gravel: 2, sand: 3, paving: 4, tataki: 5, needles: 6, wild: 7 };
export const MATERIALS = ['earth', 'grass', 'moss', 'gravel', 'sand', 'paving', 'tataki', 'needles', 'wild'];
/** Paving styles (the shader's procedural stone layer). */
export const PAVE = { setts: 0, slabs: 1, nobedan: 2, arare: 3, uroko: 4, araidashi: 5 };
export const PAVE_NAMES = Object.keys(PAVE);
// how far a material lets feet wear it to earth (1 = fully)
const SOFT = { earth: 1, grass: 1, moss: 1, gravel: 0.8, sand: 0.9, paving: 0.12, tataki: 0.2, needles: 1, wild: 1 };

export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export class GroundField {
  /** A w × d metre field at k texels per metre whose low corner is (x0, z0). */
  constructor({ w = 16, d = 12, k = 16, x0 = -w / 2, z0 = -d / 2 } = {}) {
    Object.assign(this, { w, d, k, x0, z0 });
    this.nx = Math.round(w * k); this.nz = Math.round(d * k);
    const n = this.n = this.nx * this.nz;
    this.S = new Float32Array(n * 8);
    this.wear = new Float32Array(n);
    this.G0 = new Float32Array(n);
    this.wet = new Float32Array(n);
    this.snow = new Float32Array(n).fill(1);
    this.style = new Uint8Array(n);
    this.base = new Float32Array(n);
    this.T = 1800;          // regrowth time constant, seconds (a trail lasts a long visit)
    this.deposit = 0.02;    // I: wear per paw-down
    this.dirty = { s: true, f: true, h: true };
    this.version = 0;
    this.live = null;       // texel box with dynamic wear: [i0, j0, i1, j1] or null
    this.partial = null;    // texel box the next upload may limit itself to (paws only), or null
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
  /** Bilinear read of a one-channel array. */
  sample(arr, x, z) {
    const fx = clamp((x - this.x0) * this.k - 0.5, 0, this.nx - 1.001), fz = clamp((z - this.z0) * this.k - 0.5, 0, this.nz - 1.001);
    const ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz, n = this.nx;
    const a = arr[iz * n + ix], b = arr[iz * n + ix + 1], c = arr[(iz + 1) * n + ix], d = arr[(iz + 1) * n + ix + 1];
    return (a + (b - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz;
  }
  /** Visit texels within r (+ soft) of (cx, cz): fn(index, falloff 0..1, x, z). */
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

  touch() { this.dirty.s = this.dirty.f = this.dirty.h = true; this.partial = null; this.version++; }
  /** Set material weights at a texel: m = { grass: .., moss: .. } (missing = 0), blended in by a. */
  setAt(idx, m, a = 1) {
    const o = idx * 8;
    for (let c = 0; c < 8; c++) this.S[o + c] *= 1 - a;
    for (const key in m) if (key in CH) this.S[o + CH[key]] += m[key] * a;
  }
  /** Paint fn(x, z, idx) -> { m: weights, a } | null over the whole field. */
  fill(fn) {
    for (let j = 0; j < this.nz; j++) for (let i = 0; i < this.nx; i++) {
      const idx = j * this.nx + i, r = fn(this.xOf(i), this.zOf(j), idx);
      if (r) this.setAt(idx, r.m || {}, r.a ?? 1);
    }
    this.touch();
  }
  /** A brush: push material `mat` in (earth pulls every channel out). */
  paint(mat, cx, cz, r, s = 0.35, soft = 0.5) {
    const c = CH[mat];
    this.each(cx, cz, r, (idx, f) => {
      const a = s * f, o = idx * 8;
      for (let q = 0; q < 8; q++) if (q !== c) this.S[o + q] *= 1 - a;
      if (c !== undefined) this.S[o + c] += (1 - this.S[o + c]) * a;
    }, r * soft);
    this.dirty.s = true; this.version++;
  }
  /** Standing wear: G0 (and G with it) is raised to at least `g` at a texel. */
  standAt(idx, g) {
    if (g > this.G0[idx]) this.G0[idx] = g;
    if (this.G0[idx] > this.wear[idx]) this.wear[idx] = this.G0[idx];
  }

  /* ---------------- wear (Helbing) ---------------- */

  softAt(idx) {
    const o = idx * 8, S = this.S;
    let sum = 0, s = 0;
    for (let c = 0; c < 8; c++) { sum += S[o + c]; s += S[o + c] * SOFT[MATERIALS[c + 1]]; }
    return s + Math.max(0, 1 - sum) * SOFT.earth;
  }
  /** A paw comes down: Q = I (1 - G / Gmax), spread over r. Returns false off the field. */
  step(x, z, r = 0.1, scale = 1) {
    if (!this.inside(x, z, r)) return false;
    const I = this.deposit * scale;
    this.each(x, z, r, (idx, f) => {
      const g = this.wear[idx];
      this.wear[idx] = Math.min(1, g + I * f * (1 - g));
    }, r);
    const k = this.k, R = 2 * r;
    const box = [Math.max(0, Math.floor((x - R - this.x0) * k)), Math.max(0, Math.floor((z - R - this.z0) * k)),
      Math.min(this.nx - 1, Math.ceil((x + R - this.x0) * k)), Math.min(this.nz - 1, Math.ceil((z + R - this.z0) * k))];
    const L = this.live;
    this.live = L ? [Math.min(L[0], box[0]), Math.min(L[1], box[1]), Math.max(L[2], box[2]), Math.max(L[3], box[3])] : box;
    this._wearDirty(box);
    return true;
  }
  /** Wear changed only inside `box`: the next upload refills only those texels (unless something else is dirty). */
  _wearDirty(box) {
    if (!this.dirty.f && !this.dirty.h) this.partial = box.slice();
    else if (this.partial) { const P = this.partial; this.partial = [Math.min(P[0], box[0]), Math.min(P[1], box[1]), Math.max(P[2], box[2]), Math.max(P[3], box[3])]; }
    this.dirty.f = true; this.dirty.h = true;
  }
  /** Relax toward G0 with time constant T, only inside the dynamic-wear box; drops the box once healed. */
  regrow(dt) {
    const L = this.live;
    if (!L) return false;
    const k = Math.min(1, dt / this.T), W = this.wear, G0 = this.G0, nx = this.nx;
    let left = 0;
    for (let j = L[1]; j <= L[3]; j++) for (let i = L[0]; i <= L[2]; i++) {
      const idx = j * nx + i, g = W[idx];
      if (g === G0[idx]) continue;
      const v = g + (G0[idx] - g) * k;
      W[idx] = Math.abs(v - G0[idx]) < 0.002 ? G0[idx] : v;
      if (W[idx] !== G0[idx]) left++;
    }
    this._wearDirty(L);
    if (!left) this.live = null;
    return true;
  }

  /* ---------------- queries ---------------- */

  weights(x, z, out = new Float32Array(9)) {
    const o = this.i(x, z) * 8;
    let sum = 0;
    for (let c = 0; c < 8; c++) { out[c + 1] = this.S[o + c]; sum += out[c + 1]; }
    out[0] = Math.max(0, 1 - sum);
    return out;
  }
  /** What the shader's compaction does to the puddle level (metres). */
  compaction(idx) { return -0.045 * sstep(0.45, 1, this.wear[idx]) * Math.min(1, this.softAt(idx) * 1.2); }
  /** The puddle-level relief at (x, z): authored base plus compaction (never a walk height). */
  reliefAt(x, z) { return this.sample(this.base, x, z) + this.compaction(this.i(x, z)); }
  /** The dominant material under (x, z), worn grass and moss reading as earth (for footsteps). */
  surfaceAt(x, z) {
    const w = this.weights(x, z), g = this.sample(this.wear, x, z);
    const worn = sstep(0.3, 0.6, g);
    w[0] += (w[1] + w[2] + w[8]) * worn; w[1] *= 1 - worn; w[2] *= 1 - worn; w[8] *= 1 - worn;
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
    // after paws only, refill just the texels they changed (the GPU upload is still whole)
    const P = this.partial, nx = this.nx;
    const rows = P ? [P[1], P[3], P[0], P[2]] : [0, this.nz - 1, 0, nx - 1];
    if (this.dirty.f) {
      const F = this.bufF;
      for (let j = rows[0]; j <= rows[1]; j++) for (let i = j * nx + rows[2], e = j * nx + rows[3]; i <= e; i++) {
        const p = i * 4;
        F[p] = this.wear[i] * 255; F[p + 1] = this.wet[i] * 255; F[p + 2] = this.snow[i] * 255; F[p + 3] = this.style[i] * 32 + 16;
      }
      this.texF.needsUpdate = true;
      this.dirty.f = false;
    }
    if (this.dirty.h) {
      const H = this.bufH, toHalf = THREE.DataUtils.toHalfFloat, W = this.wear, base = this.base;
      for (let j = rows[0]; j <= rows[1]; j++) for (let i = j * nx + rows[2], e = j * nx + rows[3]; i <= e; i++) {
        H[i] = (base[i] === 0 && W[i] <= 0.45) ? 0 : toHalf(base[i] + this.compaction(i));   // flat, untrodden: 0
      }
      this.texH.needsUpdate = true;
      this.dirty.h = false;
    }
    this.partial = null;
  }

  /**
   * Thin the game grass where paws wore the ground (lab: writeGrassMask). The
   * baked mask (`baked`, a copy of the BiomeMask texture data at bind time) is
   * the rest state: only DYNAMIC wear (G above its standing G0) thins it, so
   * the mask equals the baked one until a paw lands, and lawn texels (r 0,
   * g > 0: tended lawns) are never touched. Writes only the box `rect`
   * (mask texels) and returns whether anything changed.
   */
  wearGrassMask(mask, baked, rect = null) {
    const tex = mask.texture, res = mask.res, data = tex.image.data;
    const i0 = rect ? rect[0] : 0, j0 = rect ? rect[1] : 0, i1 = rect ? rect[2] : res - 1, j1 = rect ? rect[3] : res - 1;
    let changed = false;
    for (let j = j0; j <= j1; j++) {
      const z = mask.z0 + (j + 0.5) / mask.k;
      for (let i = i0; i <= i1; i++) {
        const p = (j * res + i) * 4;
        const r0 = baked[p];
        if (r0 === 0) continue;                       // no meadow here (lawn, wall, water): never ours
        const x = mask.x0 + (i + 0.5) / mask.k;
        let keep = 1;
        if (this.inside(x, z)) {
          const idx = this.i(x, z), dyn = Math.max(0, this.sample(this.wear, x, z) - this.G0[idx]);
          keep = 1 - sstep(0.18, 0.5, dyn);
        }
        const r = Math.round(r0 * keep), g = Math.round(baked[p + 1] * keep), b = Math.round(baked[p + 2] * keep);
        if (r !== data[p] || g !== data[p + 1] || b !== data[p + 2]) { data[p] = r; data[p + 1] = g; data[p + 2] = b; changed = true; }
      }
    }
    if (changed) tex.needsUpdate = true;
    return changed;
  }

  /** The mask texel box covering the dynamic-wear box (plus a margin), or null. */
  maskRect(mask, margin = 1) {
    const L = this.live;
    if (!L) return null;
    const k = mask.k, res = mask.res;
    const x0 = this.x0 + L[0] / this.k - margin, x1 = this.x0 + (L[2] + 1) / this.k + margin;
    const z0 = this.z0 + L[1] / this.k - margin, z1 = this.z0 + (L[3] + 1) / this.k + margin;
    return [clamp(Math.floor((x0 - mask.x0) * k), 0, res - 1), clamp(Math.floor((z0 - mask.z0) * k), 0, res - 1),
      clamp(Math.ceil((x1 - mask.x0) * k), 0, res - 1), clamp(Math.ceil((z1 - mask.z0) * k), 0, res - 1)];
  }

  /** Every array and upload buffer, copied (after upload(): the snapshot is clean). */
  snapshot() {
    const keys = ['S', 'wear', 'G0', 'wet', 'snow', 'style', 'base', 'bufA', 'bufB', 'bufF', 'bufH'];
    return { opts: { w: this.w, d: this.d, k: this.k, x0: this.x0, z0: this.z0 }, ...Object.fromEntries(keys.map((key) => [key, this[key].slice()])) };
  }

  /** A fresh field from a snapshot: arrays and upload buffers copied, textures marked for upload. */
  static fromSnapshot(snap) {
    const f = new GroundField(snap.opts);
    for (const key of ['S', 'wear', 'G0', 'wet', 'snow', 'style', 'base', 'bufA', 'bufB', 'bufF', 'bufH']) f[key].set(snap[key]);
    f.dirty.s = f.dirty.f = f.dirty.h = false;   // the constructor's textures upload these buffers on first use
    return f;
  }

  dispose() {
    for (const t of [this.texA, this.texB, this.texF, this.texH]) t.dispose();
  }
}

// Painted fields keyed by what they were painted from (pure functions of
// their inputs): computed once, copied for every build after.
const _snapshots = new Map();
export function cachedField(key, paint) {
  if (!_snapshots.has(key)) {
    const f = paint();            // the first build gets the painted field itself
    f.upload();
    _snapshots.set(key, f.snapshot());
    return f;
  }
  return GroundField.fromSnapshot(_snapshots.get(key));
}
