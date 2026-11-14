// The river's CPU water field, promoted from labs/water/js/field.js and laid
// out in the river's own coordinates: `s` metres downstream along the
// centreline, `u` metres across it (+u to the left of the current). One RGBA
// half-float texture, R = water depth (m), G/B = the current along / across
// (m/s), A = foam, which the river shader reads as its flow map. Working in
// ribbon space makes the ripples follow every bend (the classic sine ripples
// run in world X/Z whatever the river does) and keeps the field small.
//
// Depth is the game's own carved bed (Countryside.riverBedDepth(): a smooth
// channel 0.85 m deep mid-stream, feathering out 3.8 m from the centreline)
// under the water sheet at y = 0.02, so the colour follows the real bed the
// koi swim over. The current is parabolic across the channel with the
// thalweg leaning to the outside of each bend; posts standing in the water
// (the bridge's piers) add potential flow round a cylinder, an eddy behind
// and foam on the pillow and the eddy lines.
import * as THREE from 'three';

export const WATER_Y = 0.02;          // the classic river sheet (and paddies) sit here
export const BED_DEEP = 0.85;          // riverBedDepth(): mid-stream depth below the valley floor
export const BED_OUT = 3.8, BED_IN = 1.2;

const sstep = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

/** The classic bed profile at distance `dist` from the centreline (riverBedDepth). */
export function bedDepth(dist) {
  const p = sstep(BED_OUT, BED_IN, dist);
  return p * p * BED_DEEP;
}

/**
 * Arc-length frames of a centreline: positions, unit tangents, signed
 * curvature (+ turns left) and the distance `s` of each sample.
 */
export function riverFrames(curve, sections) {
  const n = sections + 1;
  const px = new Float32Array(n), pz = new Float32Array(n), tx = new Float32Array(n), tz = new Float32Array(n), k = new Float32Array(n), s = new Float32Array(n);
  const p = new THREE.Vector3(), t = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const a = i / sections;
    curve.getPointAt(a, p); curve.getTangentAt(a, t);
    const l = Math.hypot(t.x, t.z) || 1;
    px[i] = p.x; pz[i] = p.z; tx[i] = t.x / l; tz[i] = t.z / l;
    s[i] = i ? s[i - 1] + Math.hypot(p.x - px[i - 1], p.z - pz[i - 1]) : 0;
  }
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 2), b = Math.min(n - 1, i + 2);
    const ds = s[b] - s[a] || 1;
    k[i] = (tx[a] * tz[b] - tz[a] * tx[b]) / ds;
  }
  return { n, px, pz, tx, tz, k, s, length: s[n - 1] };
}

export class RiverField {
  /**
   * frames: riverFrames(); halfW: half the ribbon width (m); resS / nu: texels
   * per metre downstream and texels across; speed: peak current (m/s).
   */
  constructor(frames, { halfW = 3.4, resS = 4, nu = 24, speed = 0.9 } = {}) {
    this.f = frames;
    this.halfW = halfW;
    this.speed = speed;
    this.ns = Math.max(2, Math.round(frames.length * resS));
    this.nu = Math.max(2, nu);
    const n = this.ns * this.nu;
    this.depth = new Float32Array(n);
    this.bs = new Float32Array(n); this.fs = new Float32Array(n); this.fu = new Float32Array(n); this.foam = new Float32Array(n);
    this.obstacles = [];
    this.data = new Uint16Array(n * 4);
    this.texture = new THREE.DataTexture(this.data, this.ns, this.nu, THREE.RGBAFormat, THREE.HalfFloatType);
    this.texture.magFilter = this.texture.minFilter = THREE.LinearFilter;
    this.texture.wrapS = this.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.texture.generateMipmaps = false;
    this.base();
    this.compose();
  }

  /** Texel centre in ribbon space. */
  sAt(i) { return (i + 0.5) / this.ns * this.f.length; }
  uAt(j) { return ((j + 0.5) / this.nu * 2 - 1) * this.halfW; }

  /** Curvature at distance s (linear between frames). */
  curvatureAt(s) {
    const f = this.f, x = Math.min(f.n - 1.001, Math.max(0, s / f.length * (f.n - 1)));
    const i = Math.floor(x), t = x - i;
    return f.k[i] * (1 - t) + f.k[i + 1] * t;
  }

  /** Depth from the carved bed; the current from the centreline, thalweg to the outside of the bend. */
  base() {
    const { ns, nu, halfW, speed } = this;
    for (let i = 0; i < ns; i++) {
      const s = this.sAt(i), kk = this.curvatureAt(s);
      const o = Math.min(1, Math.max(-1, -kk * 9)) * halfW * 0.32;
      for (let j = 0; j < nu; j++) {
        const u = this.uAt(j), k = j * ns + i;
        this.depth[k] = WATER_Y + bedDepth(Math.abs(u));
        const q = (u - o) / (halfW * (1 + Math.abs(o) / halfW * 0.5));
        // the current fades in the shallows the way the lab's shader fades it
        this.bs[k] = speed * Math.max(0, 1 - q * q) * sstep(0, 0.35, this.depth[k]);
      }
    }
  }

  /** Add posts standing in the water: [{ s, u, r }] in ribbon space. */
  setObstacles(list) { this.obstacles = list.slice(); this.compose(); }

  compose() {
    this.fs.set(this.bs); this.fu.fill(0); this.foam.fill(0);
    for (const o of this.obstacles) this._obstacle(o);
    this.upload();
  }

  /** Potential flow round a cylinder, an eddy behind it, foam on the pillow and along the eddy lines. */
  _obstacle(o) {
    const { ns, nu } = this;
    const a = o.r;
    const sp = this.sample(this.bs, o.s, o.u);
    const R = a * 9;
    const dsT = this.f.length / ns, duT = 2 * this.halfW / nu;
    const i0 = Math.max(0, Math.floor((o.s - R) / dsT)), i1 = Math.min(ns - 1, Math.ceil((o.s + R) / dsT));
    const j0 = Math.max(0, Math.floor((o.u - R + this.halfW) / duT)), j1 = Math.min(nu - 1, Math.ceil((o.u + R + this.halfW) / duT));
    const a2 = a * a, kick = Math.min(1, sp / 0.35);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = j * ns + i;
      const xi = this.sAt(i) - o.s, eta = this.uAt(j) - o.u;
      const r2 = xi * xi + eta * eta, r = Math.sqrt(r2);
      if (r > R) continue;
      if (r < a) { this.fs[k] = 0; this.fu[k] = 0; continue; }
      const r4 = r2 * r2;
      const du = -sp * a2 * (xi * xi - eta * eta) / r4;
      const dv = -2 * sp * a2 * xi * eta / r4;
      let along = sp + du, foam = 0;
      if (xi > 0) {
        const wl = a * 1.0 + 0.14 * xi;
        const w = Math.exp(-((eta / wl) ** 2)) * Math.exp(-xi / (5 * a));
        along *= 1 - 1.7 * w;                               // < 0 right behind: the eddy runs upstream
        foam += 0.6 * Math.exp(-(((Math.abs(eta) - wl) / (0.22 * a + 0.03)) ** 2)) * Math.exp(-xi / (7 * a)) * kick;
      } else {
        foam += 0.85 * Math.exp(-(((r - a) / (0.2 * a + 0.025)) ** 2)) * sstep(0, -a, xi) * kick;   // the pillow
      }
      foam += 0.35 * Math.exp(-(((r - a) / 0.04) ** 2)) * kick;
      const fall = sstep(R, R * 0.45, r);
      this.fs[k] += (along - sp) * fall;
      this.fu[k] += dv * fall;
      this.foam[k] = Math.min(1, this.foam[k] + foam);
    }
  }

  upload() {
    const H = THREE.DataUtils.toHalfFloat, D = this.data, n = this.ns * this.nu;
    for (let k = 0; k < n; k++) {
      D[k * 4] = H(this.depth[k]);
      D[k * 4 + 1] = H(this.fs[k]);
      D[k * 4 + 2] = H(this.fu[k]);
      D[k * 4 + 3] = H(this.foam[k]);
    }
    this.texture.needsUpdate = true;
  }

  /** Bilinear sample of one channel array at (s, u). */
  sample(A, s, u) {
    const { ns, nu } = this;
    const fx = s / this.f.length * ns - 0.5, fy = (u / this.halfW * 0.5 + 0.5) * nu - 0.5;
    const i = Math.max(0, Math.min(ns - 2, Math.floor(fx))), j = Math.max(0, Math.min(nu - 2, Math.floor(fy)));
    const tx = Math.min(1, Math.max(0, fx - i)), ty = Math.min(1, Math.max(0, fy - j));
    const k = j * ns + i;
    return (A[k] * (1 - tx) + A[k + 1] * tx) * (1 - ty) + (A[k + ns] * (1 - tx) + A[k + ns + 1] * tx) * ty;
  }

  /** World (x, z) → ribbon (s, u), or null when it is not over the ribbon. */
  locate(x, z) {
    const f = this.f;
    let best = Infinity, bi = 0, bt = 0;
    for (let i = 0; i < f.n - 1; i++) {
      const ex = f.px[i + 1] - f.px[i], ez = f.pz[i + 1] - f.pz[i], l2 = ex * ex + ez * ez || 1;
      const t = Math.min(1, Math.max(0, ((x - f.px[i]) * ex + (z - f.pz[i]) * ez) / l2));
      const dx = x - (f.px[i] + ex * t), dz = z - (f.pz[i] + ez * t), d2 = dx * dx + dz * dz;
      if (d2 < best) { best = d2; bi = i; bt = t; }
    }
    const qx = f.px[bi] + (f.px[bi + 1] - f.px[bi]) * bt, qz = f.pz[bi] + (f.pz[bi + 1] - f.pz[bi]) * bt;
    const tx = f.tx[bi] + (f.tx[bi + 1] - f.tx[bi]) * bt, tz = f.tz[bi] + (f.tz[bi + 1] - f.tz[bi]) * bt, tl = Math.hypot(tx, tz) || 1;
    const u = (x - qx) * (-tz / tl) + (z - qz) * (tx / tl);
    if (Math.abs(u) > this.halfW) return null;
    return { s: f.s[bi] + (f.s[bi + 1] - f.s[bi]) * bt, u };
  }

  /** The current at world (x, z) in world m/s (for anything that floats), or zero off the river. */
  flowAt(x, z, out = { x: 0, z: 0 }) {
    const p = this.locate(x, z);
    out.x = out.z = 0;
    if (!p) return out;
    const f = this.f, i = Math.min(f.n - 2, Math.max(0, Math.floor(p.s / f.length * (f.n - 1))));
    const tx = f.tx[i], tz = f.tz[i];
    const a = this.sample(this.fs, p.s, p.u), c = this.sample(this.fu, p.s, p.u);
    out.x = tx * a - tz * c;
    out.z = tz * a + tx * c;
    return out;
  }

  dispose() { this.texture.dispose(); }
}
