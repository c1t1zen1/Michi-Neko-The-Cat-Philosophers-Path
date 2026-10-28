// The rail: the Roof Road's route as a polyline in XZ with a circular fillet
// at every interior corner. Everything in the run is placed by arc length
// `s` along it, plus a height `y` and a depth `d` along the rail normal.
//
// Pure maths, no three.js, so the page and `tools/rooftop_test.mjs` share it.
//
// Frame at s: tangent t (direction of travel), up (0,1,0), normal n = t × up
// = (-t.z, t.x). n points at the camera, so +s is screen-right and +d is
// toward the viewer. All turns in the level bend away from n (toward -n),
// so the camera always rides the outside of a corner.

export class Rail {
  /**
   * @param {{x:number,z:number}[]} points polyline vertices
   * @param {number} radius fillet radius at each interior vertex
   */
  constructor(points, radius = 2.5) {
    if (points.length < 2) throw new Error('rail needs two points');
    this.points = points.map((p) => ({ x: p.x, z: p.z }));
    this.radius = radius;
    this.segs = [];
    this.corners = [];
    this._build();
  }

  _build() {
    const P = this.points;
    const r = this.radius;
    const dirs = [];
    const lens = [];
    for (let i = 0; i < P.length - 1; i++) {
      const dx = P[i + 1].x - P[i].x, dz = P[i + 1].z - P[i].z;
      const l = Math.hypot(dx, dz);
      dirs.push({ x: dx / l, z: dz / l });
      lens.push(l);
    }
    // Tangent distance trimmed from each leg end by the fillets.
    const trim = new Array(P.length).fill(0);
    const turn = new Array(P.length).fill(0);
    for (let i = 1; i < P.length - 1; i++) {
      const a = dirs[i - 1], b = dirs[i];
      const cross = a.x * b.z - a.z * b.x;
      const dot = a.x * b.x + a.z * b.z;
      const ang = Math.atan2(cross, dot);            // signed turn angle
      turn[i] = ang;
      trim[i] = r * Math.tan(Math.abs(ang) / 2);
    }
    let s = 0;
    for (let i = 0; i < P.length - 1; i++) {
      const d = dirs[i];
      const t0 = trim[i], t1 = trim[i + 1];
      const a = { x: P[i].x + d.x * t0, z: P[i].z + d.z * t0 };
      const len = lens[i] - t0 - t1;
      if (len < -1e-6) throw new Error('rail leg ' + i + ' too short for its fillets');
      this.segs.push({ type: 'line', s0: s, s1: s + len, a, dir: d, leg: i });
      s += len;
      if (i < P.length - 2 && Math.abs(turn[i + 1]) > 1e-6) {
        const ang = turn[i + 1];
        const sign = Math.sign(ang);
        // Fillet centre: from the trimmed leg end, step r toward the inside of
        // the turn, which is d rotated a quarter turn the way the rail bends.
        const end = { x: P[i + 1].x - d.x * t1, z: P[i + 1].z - d.z * t1 };
        const ix = -d.z * sign, iz = d.x * sign;
        const c = { x: end.x + ix * r, z: end.z + iz * r };
        const a0 = Math.atan2(end.z - c.z, end.x - c.x);
        const arcLen = r * Math.abs(ang);
        const seg = { type: 'arc', s0: s, s1: s + arcLen, c, r, a0, sweep: ang, vertex: { x: P[i + 1].x, z: P[i + 1].z } };
        this.segs.push(seg);
        this.corners.push(seg);
        s += arcLen;
      }
    }
    this.length = s;
  }

  /** Segment containing s (clamped to the rail). */
  segAt(s) {
    const segs = this.segs;
    if (s <= segs[0].s0) return segs[0];
    if (s >= this.length) return segs[segs.length - 1];
    let lo = 0, hi = segs.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (segs[mid].s1 < s) lo = mid + 1; else hi = mid;
    }
    return segs[lo];
  }

  pointAt(s, out = { x: 0, z: 0 }) {
    const g = this.segAt(s);
    if (g.type === 'line') {
      const u = s - g.s0;                     // extrapolates past either end
      out.x = g.a.x + g.dir.x * u;
      out.z = g.a.z + g.dir.z * u;
    } else {
      const k = Math.min(1, Math.max(0, (s - g.s0) / (g.s1 - g.s0)));
      const a = g.a0 + g.sweep * k;
      out.x = g.c.x + Math.cos(a) * g.r;
      out.z = g.c.z + Math.sin(a) * g.r;
    }
    return out;
  }

  tangentAt(s, out = { x: 0, z: 0 }) {
    const g = this.segAt(s);
    if (g.type === 'line') {
      out.x = g.dir.x; out.z = g.dir.z;
    } else {
      const k = Math.min(1, Math.max(0, (s - g.s0) / (g.s1 - g.s0)));
      const a = g.a0 + g.sweep * k;
      const sg = Math.sign(g.sweep);
      // Derivative of (cos a, sin a) along increasing a, flipped for clockwise sweeps.
      out.x = -Math.sin(a) * sg;
      out.z = Math.cos(a) * sg;
    }
    return out;
  }

  /** Camera-side normal n = (-t.z, t.x). */
  normalAt(s, out = { x: 0, z: 0 }) {
    this.tangentAt(s, out);
    const tx = out.x;
    out.x = -out.z;
    out.z = tx;
    return out;
  }

  /** World XZ of a point at (s, d). */
  place(s, d, out = { x: 0, z: 0 }) {
    const p = this.pointAt(s, out);
    const g = this.segAt(s);
    let nx, nz;
    if (g.type === 'line') { nx = -g.dir.z; nz = g.dir.x; }
    else { const t = this.tangentAt(s); nx = -t.z; nz = t.x; }
    p.x += nx * d;
    p.z += nz * d;
    return p;
  }

  /** True when [s0, s1] lies on one straight leg (no fillet inside it). */
  isStraight(s0, s1) {
    for (const c of this.corners) if (s1 > c.s0 && s0 < c.s1) return false;
    return true;
  }

  /** The fillet whose range (grown by `margin`) contains s, or null. */
  cornerNear(s, margin = 0) {
    for (const c of this.corners) if (s >= c.s0 - margin && s <= c.s1 + margin) return c;
    return null;
  }

  /**
   * A softened normal for the camera: the mean tangent over ±halfWin metres,
   * so the view swings round a corner over several metres, not one fillet.
   */
  smoothNormalAt(s, halfWin = 4, out = { x: 0, z: 0 }) {
    let sx = 0, sz = 0;
    const t = { x: 0, z: 0 };
    const n = 9;
    for (let i = 0; i < n; i++) {
      const u = s - halfWin + (2 * halfWin * i) / (n - 1);
      this.tangentAt(Math.min(this.length, Math.max(0, u)), t);
      // Triangle weights favour the centre.
      const w = 1 - Math.abs(i - (n - 1) / 2) / ((n - 1) / 2 + 1);
      sx += t.x * w; sz += t.z * w;
    }
    const l = Math.hypot(sx, sz) || 1;
    out.x = -sz / l;
    out.z = sx / l;
    return out;
  }
}
