// The water field: one CPU grid that says, for every few centimetres of the
// river, how deep the bed is, which way the water goes and where foam
// gathers. The shaders read it as an RGBA half-float texture (R bed height,
// GB flow in m/s, A foam); the cat, the petals and the lanterns read the
// same numbers on the CPU, so what you see is what pushes them.
import * as THREE from 'three';

export const smooth = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** A dense river centreline with tangents and signed curvature. */
export class Centreline {
  constructor(points, samples = 220) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
    this.pts = curve.getSpacedPoints(samples).map((p) => ({ x: p.x, z: p.z }));
    const n = this.pts.length;
    for (let i = 0; i < n; i++) {
      const a = this.pts[Math.max(0, i - 1)], b = this.pts[Math.min(n - 1, i + 1)];
      const tx = b.x - a.x, tz = b.z - a.z, l = Math.hypot(tx, tz) || 1;
      this.pts[i].tx = tx / l; this.pts[i].tz = tz / l;
    }
    for (let i = 0; i < n; i++) {
      const a = this.pts[Math.max(0, i - 2)], b = this.pts[Math.min(n - 1, i + 2)];
      const cross = a.tx * b.tz - a.tz * b.tx;
      const ds = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      this.pts[i].k = cross / ds;          // + turns left (toward +normal)
    }
  }
  /** Nearest point: signed lateral offset s (+ to the left of the flow), tangent, curvature, along. */
  nearest(x, z, out = {}) {
    const P = this.pts;
    let best = Infinity, bi = 0, bt = 0;
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1];
      if (Math.abs((a.x + b.x) * 0.5 - x) > 9 && Math.abs((a.z + b.z) * 0.5 - z) > 9) continue;
      const ex = b.x - a.x, ez = b.z - a.z, l2 = ex * ex + ez * ez || 1;
      const t = Math.min(1, Math.max(0, ((x - a.x) * ex + (z - a.z) * ez) / l2));
      const dx = x - (a.x + ex * t), dz = z - (a.z + ez * t), d2 = dx * dx + dz * dz;
      if (d2 < best) { best = d2; bi = i; bt = t; }
    }
    const a = P[bi], b = P[bi + 1] || a;
    const tx = a.tx + (b.tx - a.tx) * bt, tz = a.tz + (b.tz - a.tz) * bt, tl = Math.hypot(tx, tz) || 1;
    const qx = a.x + (b.x - a.x) * bt, qz = a.z + (b.z - a.z) * bt;
    out.tx = tx / tl; out.tz = tz / tl;
    out.s = (x - qx) * -out.tz + (z - qz) * out.tx;   // left normal = (-tz, tx)
    out.k = a.k + (b.k - a.k) * bt;
    out.qx = qx; out.qz = qz;
    out.along = bi + bt;
    return out;
  }
  /** z of the centreline at x (the stage river runs along +x). */
  zAt(x) {
    const P = this.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1];
      if ((x - a.x) * (x - b.x) <= 0) return a.z + (b.z - a.z) * ((x - a.x) / ((b.x - a.x) || 1));
    }
    return x < P[0].x ? P[0].z : P[P.length - 1].z;
  }
}

const _n = {};

export class WaterField {
  /**
   * box: { x0, z0, w, d } in metres, res texels per metre.
   * groundAt(x, z): the bed (terrain) height.
   * centre: a Centreline; halfW: half the channel width; speed: peak m/s.
   */
  constructor({ x0, z0, w, d, res = 8, groundAt, centre, halfW = 3.4, speed = 0.9, weir = null }) {
    Object.assign(this, { x0, z0, w, d, res, groundAt, centre, halfW, speed, weir });
    this.nx = Math.max(2, Math.round(w * res));
    this.nz = Math.max(2, Math.round(d * res));
    const n = this.nx * this.nz;
    this.bed = new Float32Array(n);
    this.bx = new Float32Array(n); this.bz = new Float32Array(n); this.bfoam = new Float32Array(n);
    this.fx = new Float32Array(n); this.fz = new Float32Array(n); this.foam = new Float32Array(n);
    this.px = new Float32Array(n); this.pz = new Float32Array(n); this.pw = new Float32Array(n);
    this.obstacles = [];
    this.data = new Uint16Array(n * 4);
    this.texture = new THREE.DataTexture(this.data, this.nx, this.nz, THREE.RGBAFormat, THREE.HalfFloatType);
    this.texture.magFilter = this.texture.minFilter = THREE.LinearFilter;
    this.texture.wrapS = this.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.box = new THREE.Vector4(x0, z0, 1 / w, 1 / d);
    this.version = 0;
    this.base();
    this.compose();
  }

  cx(i) { return this.x0 + (i + 0.5) / this.res; }
  cz(j) { return this.z0 + (j + 0.5) / this.res; }

  /** Channel flow from the centreline: parabolic across, fastest on the thalweg. */
  base() {
    const { nx, nz, halfW, speed, centre, weir } = this;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i, x = this.cx(i), z = this.cz(j);
      this.bed[k] = this.groundAt(x, z);
      const c = centre.nearest(x, z, _n);
      // the thalweg leans toward the outside of the bend, where the cut bank is
      const o = THREE.MathUtils.clamp(-c.k * 9, -1, 1) * halfW * 0.32;
      const u = (c.s - o) / (halfW * (1 + Math.abs(o) / halfW * 0.5));
      let v = speed * Math.max(0, 1 - u * u);
      let foam = 0;
      if (weir) {
        const dw = x - weir.x;
        if (Math.abs(c.s) < halfW + 0.2) {
          v *= 1 + 0.9 * Math.exp(-((dw - 0.6) ** 2) / 1.4) * (dw > -0.2 ? 1 : 0.3);
          foam += 0.95 * Math.exp(-((dw - 0.32) ** 2) / 0.05);
          // standing waves downstream: v = 1.25 sqrt(lambda), so lambda = (v / 1.25)^2
          if (dw > 0.5) {
            const lambda = Math.max(0.6, (speed * 1.6 / 1.25) ** 2);
            foam += 0.5 * Math.max(0, Math.sin((dw - 0.5) / lambda * Math.PI * 2)) ** 3 * Math.exp(-(dw - 0.5) / 2.6);
          }
        }
      }
      this.bx[k] = c.tx * v;
      this.bz[k] = c.tz * v;
      this.bfoam[k] = foam;
    }
  }

  setObstacles(list) { this.obstacles = list.slice(); this.compose(); }
  addObstacle(o) { this.obstacles.push(o); this.compose(); }

  /** base + obstacles + painted flow, then upload. */
  compose() {
    const { nx, nz } = this;
    this.fx.set(this.bx); this.fz.set(this.bz); this.foam.set(this.bfoam);
    for (const o of this.obstacles) this._obstacle(o);
    for (let k = 0; k < nx * nz; k++) {
      const w = this.pw[k];
      if (w > 0) { this.fx[k] += (this.px[k] - this.fx[k]) * w; this.fz[k] += (this.pz[k] - this.fz[k]) * w; }
    }
    this.upload();
  }

  /** Potential flow round a cylinder, an eddy behind it, foam on the pillow and the eddy line. */
  _obstacle(o) {
    const a = o.r;
    const U = this.sampleBase(o.x, o.z);
    const sp = Math.hypot(U.vx, U.vz);
    const e1x = sp > 1e-3 ? U.vx / sp : 1, e1z = sp > 1e-3 ? U.vz / sp : 0;
    const e2x = -e1z, e2z = e1x;
    const R = a * 9;
    const i0 = Math.max(0, Math.floor((o.x - R - this.x0) * this.res)), i1 = Math.min(this.nx - 1, Math.ceil((o.x + R - this.x0) * this.res));
    const j0 = Math.max(0, Math.floor((o.z - R - this.z0) * this.res)), j1 = Math.min(this.nz - 1, Math.ceil((o.z + R - this.z0) * this.res));
    const a2 = a * a, kick = Math.min(1, sp / 0.35);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = j * this.nx + i;
      const dx = this.cx(i) - o.x, dz = this.cz(j) - o.z;
      const xi = dx * e1x + dz * e1z, eta = dx * e2x + dz * e2z;
      const r2 = xi * xi + eta * eta, r = Math.sqrt(r2);
      if (r > R) continue;
      if (r < a) { this.fx[k] = 0; this.fz[k] = 0; continue; }
      const r4 = r2 * r2;
      const du = -sp * a2 * (xi * xi - eta * eta) / r4;
      const dv = -2 * sp * a2 * xi * eta / r4;
      let along = sp + du;
      let foam = 0;
      if (xi > 0) {
        const wl = a * 1.0 + 0.14 * xi;
        const w = Math.exp(-((eta / wl) ** 2)) * Math.exp(-xi / (5 * a));
        along *= 1 - 1.7 * w;                          // < 0 right behind: the eddy runs upstream
        foam += 0.6 * Math.exp(-(((Math.abs(eta) - wl) / (0.22 * a + 0.03)) ** 2)) * Math.exp(-xi / (7 * a)) * kick;
      } else {
        foam += 0.85 * Math.exp(-(((r - a) / (0.2 * a + 0.025)) ** 2)) * smooth(0, -a, xi) * kick;   // the pillow
      }
      foam += 0.35 * Math.exp(-(((r - a) / 0.04) ** 2)) * kick;
      const fall = smooth(R, R * 0.45, r);
      this.fx[k] += (e1x * (along - sp) + e2x * dv) * fall;
      this.fz[k] += (e1z * (along - sp) + e2z * dv) * fall;
      this.foam[k] = Math.min(1, this.foam[k] + foam * (o.foam ?? 1));
    }
  }

  /** Paint flow along a stroke: the brush pulls nearby texels toward its direction. */
  paint(xa, za, xb, zb, radius = 1, strength = 0.6, speed = 1.1) {
    const ex = xb - xa, ez = zb - za, l = Math.hypot(ex, ez);
    if (l < 1e-4) return;
    const ux = ex / l, uz = ez / l;
    const i0 = Math.max(0, Math.floor((Math.min(xa, xb) - radius - this.x0) * this.res)), i1 = Math.min(this.nx - 1, Math.ceil((Math.max(xa, xb) + radius - this.x0) * this.res));
    const j0 = Math.max(0, Math.floor((Math.min(za, zb) - radius - this.z0) * this.res)), j1 = Math.min(this.nz - 1, Math.ceil((Math.max(za, zb) + radius - this.z0) * this.res));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = j * this.nx + i, x = this.cx(i), z = this.cz(j);
      const t = Math.min(1, Math.max(0, ((x - xa) * ex + (z - za) * ez) / (l * l)));
      const d = Math.hypot(x - (xa + ex * t), z - (za + ez * t));
      const w = smooth(radius, radius * 0.3, d) * strength;
      if (w <= 0) continue;
      this.px[k] += (ux * speed - this.px[k]) * w;
      this.pz[k] += (uz * speed - this.pz[k]) * w;
      this.pw[k] = Math.min(1, this.pw[k] + w * 0.6);
    }
  }
  clearPaint() { this.px.fill(0); this.pz.fill(0); this.pw.fill(0); }

  upload() {
    const H = THREE.DataUtils.toHalfFloat, D = this.data;
    for (let k = 0; k < this.nx * this.nz; k++) {
      D[k * 4] = H(this.bed[k]);
      D[k * 4 + 1] = H(this.fx[k]);
      D[k * 4 + 2] = H(this.fz[k]);
      D[k * 4 + 3] = H(Math.min(1, this.foam[k]));
    }
    this.texture.needsUpdate = true;
    this.version++;
  }

  _bilerp(A, x, z) {
    const fx = (x - this.x0) * this.res - 0.5, fz = (z - this.z0) * this.res - 0.5;
    const i = Math.max(0, Math.min(this.nx - 2, Math.floor(fx))), j = Math.max(0, Math.min(this.nz - 2, Math.floor(fz)));
    const u = Math.min(1, Math.max(0, fx - i)), v = Math.min(1, Math.max(0, fz - j));
    const k = j * this.nx + i;
    return (A[k] * (1 - u) + A[k + 1] * u) * (1 - v) + (A[k + this.nx] * (1 - u) + A[k + this.nx + 1] * u) * v;
  }
  inside(x, z) { return x >= this.x0 && x <= this.x0 + this.w && z >= this.z0 && z <= this.z0 + this.d; }
  sampleBase(x, z) { return { vx: this._bilerp(this.bx, x, z), vz: this._bilerp(this.bz, x, z) }; }
  /** Flow at (x, z) faded in the shallows the same way the shader fades it. */
  flowAt(x, z, level, out = { x: 0, z: 0 }) {
    if (!this.inside(x, z)) { out.x = out.z = 0; return out; }
    const f = smooth(0, 0.35, level - this._bilerp(this.bed, x, z));
    out.x = this._bilerp(this.fx, x, z) * f;
    out.z = this._bilerp(this.fz, x, z) * f;
    return out;
  }
  bedAt(x, z) { return this.inside(x, z) ? this._bilerp(this.bed, x, z) : this.groundAt(x, z); }
  foamAt(x, z) { return this.inside(x, z) ? this._bilerp(this.foam, x, z) : 0; }
}
