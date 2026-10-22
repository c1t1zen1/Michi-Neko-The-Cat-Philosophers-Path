import * as THREE from 'three';

/**
 * Signed-distance sculpting for the procedural cats.
 *
 * Anatomy is described as an ordered list of soft primitives — ellipsoids
 * and tapered capsules — smoothly unioned (or carved) into one field, sampled
 * on a voxel grid and meshed with surface nets. Every vertex then asks the
 * same primitives which body region it belongs to, so the pass also bakes
 * skin weights (one seamless coat that bends at the shoulders, hips, spine
 * and every leg joint) and the attributes the fur shader paints from.
 *
 * Primitive descriptions (all lengths in metres):
 *   { type: 'ellipsoid', c: [x,y,z], r: [rx,ry,rz], rot?: [ex,ey,ez], blend?, sub?, region? }
 *   { type: 'cone', a: [x,y,z], b: [x,y,z], ra, rb, blend?, sub?, region? }
 * `blend` is the smooth-union radius, `sub` carves instead of adding, and
 * `region` names the bone chain that owns the surface it produces. Carves
 * are applied after every union, so list order only matters among unions.
 */

// Compiled primitives are flat Float64Arrays (one per primitive) so the
// distance queries — millions of them at load time — stay monomorphic.
const TYPE = 0, SUB = 1, K = 2;
const MINX = 3, MINY = 4, MINZ = 5, MAXX = 6, MAXY = 7, MAXZ = 8;
const CX = 9, CY = 10, CZ = 11, IRX = 12, IRY = 13, IRZ = 14, ROT = 15;
const M00 = 16, M01 = 17, M02 = 18, M10 = 19, M11 = 20, M12 = 21, M20 = 22, M21 = 23, M22 = 24;
const AX = 25, AY = 26, AZ = 27, BAX = 28, BAY = 29, BAZ = 30;
const L2 = 31, IL2 = 32, A2 = 33, RA = 34, RB = 35, RR = 36, RMIN = 37;
const STRIDE = 38;
const ELLIPSOID = 0;
const CONE = 1;

/** Polynomial smooth minimum; `k` is the width of the blend fillet. */
export function smin(a, b, k) {
  if (k <= 0) return a < b ? a : b;
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return (a < b ? a : b) - h * h * k * 0.25;
}

/** Smooth maximum, used for carving. */
export function smax(a, b, k) {
  return -smin(-a, -b, k);
}

const _euler = new THREE.Euler();
const _mat = new THREE.Matrix4();

/**
 * Precompute everything a primitive needs for fast repeated evaluation.
 * Returns an array of Float64Arrays with `.regions` (names) alongside.
 */
export function compilePrims(list) {
  const unions = [];
  const carves = [];
  for (const p of list) {
    const P = new Float64Array(STRIDE);
    P[TYPE] = p.type === 'cone' ? CONE : ELLIPSOID;
    P[SUB] = p.sub ? 1 : 0;
    P[K] = p.blend ?? 0;
    P[M00] = 1; P[M11] = 1; P[M22] = 1;
    if (P[TYPE] === ELLIPSOID) {
      const [cx, cy, cz] = p.c;
      const [rx, ry, rz] = p.r;
      P[CX] = cx; P[CY] = cy; P[CZ] = cz;
      P[IRX] = 1 / rx; P[IRY] = 1 / ry; P[IRZ] = 1 / rz;
      P[RMIN] = Math.min(rx, ry, rz);
      let ex = rx, ey = ry, ez = rz;
      if (p.rot) {
        _euler.set(p.rot[0], p.rot[1], p.rot[2]);
        _mat.makeRotationFromEuler(_euler);
        const e = _mat.elements; // column-major
        // Local coordinates are R^T (p - c): row i of R^T is column i of R.
        P[ROT] = 1;
        P[M00] = e[0]; P[M01] = e[1]; P[M02] = e[2];
        P[M10] = e[4]; P[M11] = e[5]; P[M12] = e[6];
        P[M20] = e[8]; P[M21] = e[9]; P[M22] = e[10];
        ex = Math.hypot(e[0] * rx, e[4] * ry, e[8] * rz);
        ey = Math.hypot(e[1] * rx, e[5] * ry, e[9] * rz);
        ez = Math.hypot(e[2] * rx, e[6] * ry, e[10] * rz);
      }
      P[MINX] = cx - ex; P[MAXX] = cx + ex;
      P[MINY] = cy - ey; P[MAXY] = cy + ey;
      P[MINZ] = cz - ez; P[MAXZ] = cz + ez;
    } else {
      const [ax, ay, az] = p.a;
      const [bx, by, bz] = p.b;
      P[AX] = ax; P[AY] = ay; P[AZ] = az;
      P[BAX] = bx - ax; P[BAY] = by - ay; P[BAZ] = bz - az;
      P[L2] = P[BAX] * P[BAX] + P[BAY] * P[BAY] + P[BAZ] * P[BAZ];
      P[IL2] = 1 / P[L2];
      P[RA] = p.ra; P[RB] = p.rb; P[RR] = p.ra - p.rb;
      P[A2] = P[L2] - P[RR] * P[RR];
      P[RMIN] = Math.min(p.ra, p.rb);
      P[MINX] = Math.min(ax - p.ra, bx - p.rb); P[MAXX] = Math.max(ax + p.ra, bx + p.rb);
      P[MINY] = Math.min(ay - p.ra, by - p.rb); P[MAXY] = Math.max(ay + p.ra, by + p.rb);
      P[MINZ] = Math.min(az - p.ra, bz - p.rb); P[MAXZ] = Math.max(az + p.ra, bz + p.rb);
    }
    // A union only reshapes the field within its blend radius of itself; a
    // carve only within its own volume plus the blend.
    const pad = P[K] + 0.004;
    P[MINX] -= pad; P[MINY] -= pad; P[MINZ] -= pad;
    P[MAXX] += pad; P[MAXY] += pad; P[MAXZ] += pad;
    (p.sub ? carves : unions).push({ P, region: p.region || '' });
  }
  const all = unions.concat(carves);
  const prims = all.map((e) => e.P);
  prims.regions = all.map((e) => e.region);
  return prims;
}

/** Axis-aligned influence bounds of a compiled primitive. */
export function primBounds(P) {
  return [P[MINX], P[MINY], P[MINZ], P[MAXX], P[MAXY], P[MAXZ]];
}

/** Distance from (x,y,z) to a single compiled primitive. */
export function primDistance(P, x, y, z) {
  if (P[TYPE] === ELLIPSOID) {
    let dx = x - P[CX], dy = y - P[CY], dz = z - P[CZ];
    if (P[ROT] !== 0) {
      const lx = P[M00] * dx + P[M01] * dy + P[M02] * dz;
      const ly = P[M10] * dx + P[M11] * dy + P[M12] * dz;
      const lz = P[M20] * dx + P[M21] * dy + P[M22] * dz;
      dx = lx; dy = ly; dz = lz;
    }
    const irx = P[IRX], iry = P[IRY], irz = P[IRZ];
    const ax = dx * irx, ay = dy * iry, az = dz * irz;
    const k0 = Math.sqrt(ax * ax + ay * ay + az * az);
    const bx = ax * irx, by = ay * iry, bz = az * irz;
    const k1 = Math.sqrt(bx * bx + by * by + bz * bz);
    if (k1 < 1e-12) return -P[RMIN];
    return k0 * (k0 - 1) / k1;
  }
  // Round cone (two spheres joined by their common tangent cone), exact.
  const pax = x - P[AX], pay = y - P[AY], paz = z - P[AZ];
  const l2 = P[L2], bax = P[BAX], bay = P[BAY], baz = P[BAZ];
  const yy = pax * bax + pay * bay + paz * baz;
  const zz = yy - l2;
  const qx = pax * l2 - bax * yy;
  const qy = pay * l2 - bay * yy;
  const qz = paz * l2 - baz * yy;
  const x2 = qx * qx + qy * qy + qz * qz;
  const y2 = yy * yy * l2;
  const z2 = zz * zz * l2;
  const rr = P[RR], a2 = P[A2], il2 = P[IL2];
  const k = (rr < 0 ? -1 : 1) * rr * rr * x2;
  if ((zz < 0 ? -1 : 1) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - P[RB];
  if ((yy < 0 ? -1 : 1) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - P[RA];
  return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - P[RA];
}

// Field values are clamped to ±BAND: only the sign matters further away.
const BAND = 0.05;

function inBounds(P, x, y, z) {
  return x >= P[MINX] && x <= P[MAXX] && y >= P[MINY] && y <= P[MAXY] && z >= P[MINZ] && z <= P[MAXZ];
}

/** Exact field value at a point, applying primitives in order. */
export function evalField(prims, x, y, z) {
  let f = BAND;
  for (let i = 0; i < prims.length; i++) {
    const P = prims[i];
    if (!inBounds(P, x, y, z)) continue;
    const d = primDistance(P, x, y, z);
    f = P[SUB] !== 0 ? smax(f, -d, P[K]) : smin(f, d, P[K]);
  }
  return f;
}

/** Central-difference gradient of the exact field (unnormalised). */
export function evalGradient(prims, x, y, z, out, e = 0.0008) {
  out[0] = evalField(prims, x + e, y, z) - evalField(prims, x - e, y, z);
  out[1] = evalField(prims, x, y + e, z) - evalField(prims, x, y - e, z);
  out[2] = evalField(prims, x, y, z + e) - evalField(prims, x, y, z - e);
  return out;
}

/**
 * X-interval of the grid row (y, z) that lies within `delta` of a
 * primitive (its influence zone), written to out[0..1]. Returns false when
 * the row misses it. Ellipsoids use the ellipsoid inflated by `delta` (which
 * contains every point within `delta` of the surface); cones use the
 * capsule of their larger radius.
 */
function rowInterval(P, y, z, delta, out) {
  if (P[TYPE] === ELLIPSOID) {
    const Rx = 1 / P[IRX] + delta, Ry = 1 / P[IRY] + delta, Rz = 1 / P[IRZ] + delta;
    const wy = y - P[CY], wz = z - P[CZ];
    // Local coords along the row: q(t) = t·u + q0, t = x − cx
    const ux = P[M00], uy = P[M10], uz = P[M20];
    const qx = P[M01] * wy + P[M02] * wz, qy = P[M11] * wy + P[M12] * wz, qz = P[M21] * wy + P[M22] * wz;
    const ix = 1 / (Rx * Rx), iy = 1 / (Ry * Ry), iz = 1 / (Rz * Rz);
    const A = ux * ux * ix + uy * uy * iy + uz * uz * iz;
    const B = ux * qx * ix + uy * qy * iy + uz * qz * iz;
    const C = qx * qx * ix + qy * qy * iy + qz * qz * iz - 1;
    const disc = B * B - A * C;
    if (disc < 0) return false;
    const s = Math.sqrt(disc);
    out[0] = P[CX] + (-B - s) / A;
    out[1] = P[CX] + (-B + s) / A;
    return true;
  }
  const R = Math.max(P[RA], P[RB]) + delta;
  const R2 = R * R;
  let lo = Infinity, hi = -Infinity;
  // End spheres
  for (let e = 0; e < 2; e++) {
    const sx = P[AX] + P[BAX] * e, sy = P[AY] + P[BAY] * e, sz = P[AZ] + P[BAZ] * e;
    const r2 = R2 - (y - sy) * (y - sy) - (z - sz) * (z - sz);
    if (r2 >= 0) { const r = Math.sqrt(r2); lo = Math.min(lo, sx - r); hi = Math.max(hi, sx + r); }
  }
  // Cylinder between them, clipped to the segment's slab
  const L = Math.sqrt(P[L2]);
  const dx = P[BAX] / L, dy = P[BAY] / L, dz = P[BAZ] / L;
  const wy = y - P[AY], wz = z - P[AZ];
  const wd = wy * dy + wz * dz;
  const A = 1 - dx * dx;
  const B = -dx * wd;
  const C = wy * wy + wz * wz - wd * wd - R2;
  let c0 = -Infinity, c1 = Infinity;
  if (A > 1e-9) {
    const disc = B * B - A * C;
    if (disc >= 0) { const s = Math.sqrt(disc); c0 = (-B - s) / A; c1 = (-B + s) / A; } else { c0 = 1; c1 = 0; }
  } else if (C > 0) { c0 = 1; c1 = 0; }
  if (c0 <= c1) {
    // slab: 0 ≤ t·dx + wd ≤ L
    if (Math.abs(dx) > 1e-9) {
      let s0 = (0 - wd) / dx, s1 = (L - wd) / dx;
      if (s0 > s1) { const t = s0; s0 = s1; s1 = t; }
      c0 = Math.max(c0, s0); c1 = Math.min(c1, s1);
    } else if (wd < 0 || wd > L) { c1 = c0 - 1; }
    if (c0 <= c1) { lo = Math.min(lo, P[AX] + c0); hi = Math.max(hi, P[AX] + c1); }
  }
  if (lo > hi) return false;
  out[0] = lo; out[1] = hi;
  return true;
}

const _iv = [0, 0];

/**
 * Sample the field onto a regular grid. Each primitive only visits the
 * part of each voxel row inside its influence zone (its own shape inflated
 * by the blend radius plus a few voxels), and skips voxels already deep
 * inside the coat (a union can only push them deeper).
 */
export function sampleField(prims, h, margin = 0.02) {
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const P of prims) {
    if (P[SUB] !== 0) continue;
    minX = Math.min(minX, P[MINX]); minY = Math.min(minY, P[MINY]); minZ = Math.min(minZ, P[MINZ]);
    maxX = Math.max(maxX, P[MAXX]); maxY = Math.max(maxY, P[MAXY]); maxZ = Math.max(maxZ, P[MAXZ]);
  }
  const ox = minX - margin, oy = minY - margin, oz = minZ - margin;
  const nx = Math.ceil((maxX - minX + margin * 2) / h) + 1;
  const ny = Math.ceil((maxY - minY + margin * 2) / h) + 1;
  const nz = Math.ceil((maxZ - minZ + margin * 2) / h) + 1;
  const data = new Float32Array(nx * ny * nz).fill(BAND);
  const sxy = nx * ny;
  for (const P of prims) {
    const i0 = Math.max(0, Math.floor((P[MINX] - ox) / h)), i1 = Math.min(nx - 1, Math.ceil((P[MAXX] - ox) / h));
    const j0 = Math.max(0, Math.floor((P[MINY] - oy) / h)), j1 = Math.min(ny - 1, Math.ceil((P[MAXY] - oy) / h));
    const k0 = Math.max(0, Math.floor((P[MINZ] - oz) / h)), k1 = Math.min(nz - 1, Math.ceil((P[MAXZ] - oz) / h));
    const k = P[K];
    const deep = -(k + 3 * h);
    const sub = P[SUB] !== 0;
    const delta = k + 3 * h + 0.002;
    for (let kk = k0; kk <= k1; kk++) {
      const z = oz + kk * h;
      for (let jj = j0; jj <= j1; jj++) {
        const y = oy + jj * h;
        if (!rowInterval(P, y, z, delta, _iv)) continue;
        const ia = Math.max(i0, Math.floor((_iv[0] - ox) / h));
        const ib = Math.min(i1, Math.ceil((_iv[1] - ox) / h));
        let idx = ia + nx * jj + sxy * kk;
        for (let ii = ia; ii <= ib; ii++, idx++) {
          const f = data[idx];
          if (!sub && f < deep) continue;
          const d = primDistance(P, ox + ii * h, y, z);
          let v;
          if (sub) {
            const a = -f, b = d;
            const hh = Math.max(k - Math.abs(a - b), 0) / k;
            v = -((a < b ? a : b) - hh * hh * k * 0.25);
          } else if (k > 0) {
            const hh = Math.max(k - Math.abs(f - d), 0) / k;
            v = (f < d ? f : d) - hh * hh * k * 0.25;
          } else {
            v = f < d ? f : d;
          }
          if (v > BAND) v = BAND; else if (v < -BAND) v = -BAND;
          data[idx] = v;
        }
      }
    }
  }
  return { data, nx, ny, nz, ox, oy, oz, h };
}

/** Trilinear field value + gradient at an arbitrary point (writes g). */
function gridSample(field, x, y, z, g) {
  const { data, nx, ny, nz, ox, oy, oz, h } = field;
  const fx = (x - ox) / h, fy = (y - oy) / h, fz = (z - oz) / h;
  let i = Math.floor(fx), j = Math.floor(fy), k = Math.floor(fz);
  if (i < 0) i = 0; else if (i > nx - 2) i = nx - 2;
  if (j < 0) j = 0; else if (j > ny - 2) j = ny - 2;
  if (k < 0) k = 0; else if (k > nz - 2) k = nz - 2;
  const tx = fx - i, ty = fy - j, tz = fz - k;
  const sxy = nx * ny;
  const b = i + nx * j + sxy * k;
  const c000 = data[b], c100 = data[b + 1], c010 = data[b + nx], c110 = data[b + nx + 1];
  const c001 = data[b + sxy], c101 = data[b + sxy + 1], c011 = data[b + sxy + nx], c111 = data[b + sxy + nx + 1];
  const x00 = c000 + (c100 - c000) * tx, x10 = c010 + (c110 - c010) * tx;
  const x01 = c001 + (c101 - c001) * tx, x11 = c011 + (c111 - c011) * tx;
  const y0 = x00 + (x10 - x00) * ty, y1 = x01 + (x11 - x01) * ty;
  if (g) {
    const dx00 = c100 - c000, dx10 = c110 - c010, dx01 = c101 - c001, dx11 = c111 - c011;
    const dx0 = dx00 + (dx10 - dx00) * ty, dx1 = dx01 + (dx11 - dx01) * ty;
    g[0] = (dx0 + (dx1 - dx0) * tz) / h;
    g[1] = ((x10 - x00) + ((x11 - x01) - (x10 - x00)) * tz) / h;
    g[2] = (y1 - y0) / h;
  }
  return y0 + (y1 - y0) * tz;
}

/**
 * Surface nets: one vertex per voxel cell that straddles the surface (at the
 * mean of its edge crossings), one quad per crossing grid edge. Returns
 * positions and quads; winding is fixed up later against the field gradient.
 */
export function surfaceNets(field) {
  const { data, nx, ny, nz, ox, oy, oz, h } = field;
  const sxy = nx * ny;
  const total = nx * ny * nz;
  const inside = new Uint8Array(total);
  for (let i = 0; i < total; i++) inside[i] = data[i] < 0 ? 1 : 0;
  // Vertex index per cell, addressed by the cell's min-corner grid index
  const cellVert = new Int32Array(total).fill(-1);
  let pos = new Float32Array(65536 * 3);
  let count = 0;
  const OFF = [0, 1, nx, nx + 1, sxy, sxy + 1, sxy + nx, sxy + nx + 1];
  const EA = [0, 2, 4, 6, 0, 1, 4, 5, 0, 1, 2, 3];
  const EB = [1, 3, 5, 7, 2, 3, 6, 7, 4, 5, 6, 7];
  for (let k = 0; k < nz - 1; k++) {
    for (let j = 0; j < ny - 1; j++) {
      let base = nx * j + sxy * k;
      for (let i = 0; i < nx - 1; i++, base++) {
        let mask = 0;
        for (let c = 0; c < 8; c++) mask |= inside[base + OFF[c]] << c;
        if (mask === 0 || mask === 255) continue;
        let sx = 0, sy = 0, sz = 0, n = 0;
        for (let e = 0; e < 12; e++) {
          const a = EA[e], b = EB[e];
          if (((mask >> a) & 1) === ((mask >> b) & 1)) continue;
          const va = data[base + OFF[a]], vb = data[base + OFF[b]];
          const t = va / (va - vb);
          const ax = a & 1, ay = (a >> 1) & 1, az = a >> 2;
          sx += ax + ((b & 1) - ax) * t;
          sy += ay + (((b >> 1) & 1) - ay) * t;
          sz += az + ((b >> 2) - az) * t;
          n++;
        }
        if (count * 3 + 3 > pos.length) {
          const grown = new Float32Array(pos.length * 2);
          grown.set(pos);
          pos = grown;
        }
        cellVert[base] = count;
        pos[count * 3] = ox + (i + sx / n) * h;
        pos[count * 3 + 1] = oy + (j + sy / n) * h;
        pos[count * 3 + 2] = oz + (k + sz / n) * h;
        count++;
      }
    }
  }
  // Every surface vertex has at most three crossing edges at its min
  // corner, so 3 quads per vertex bounds the face count.
  const quads = new Int32Array(count * 12);
  let q = 0;
  for (let k = 1; k < nz - 1; k++) {
    for (let j = 1; j < ny - 1; j++) {
      let base = 1 + nx * j + sxy * k;
      for (let i = 1; i < nx - 1; i++, base++) {
        const s = inside[base];
        // Edge +x from this grid point is shared by the cells at (j-1|j, k-1|k)
        if (inside[base + 1] !== s) {
          quads[q++] = cellVert[base - nx - sxy]; quads[q++] = cellVert[base - sxy];
          quads[q++] = cellVert[base]; quads[q++] = cellVert[base - nx];
        }
        if (inside[base + nx] !== s) {
          quads[q++] = cellVert[base - 1 - sxy]; quads[q++] = cellVert[base - sxy];
          quads[q++] = cellVert[base]; quads[q++] = cellVert[base - 1];
        }
        if (inside[base + sxy] !== s) {
          quads[q++] = cellVert[base - 1 - nx]; quads[q++] = cellVert[base - nx];
          quads[q++] = cellVert[base]; quads[q++] = cellVert[base - 1];
        }
      }
    }
  }
  return { positions: pos.slice(0, count * 3), quads: quads.slice(0, q) };
}

/** Vertex adjacency from quads (CSR). */
function buildAdjacency(count, quads) {
  const start = new Uint32Array(count + 1);
  for (let q = 0; q < quads.length; q++) start[quads[q] + 1] += 2;
  for (let i = 0; i < count; i++) start[i + 1] += start[i];
  const fill = start.slice(0, count);
  const nbr = new Uint32Array(start[count]);
  for (let q = 0; q < quads.length; q += 4) {
    for (let e = 0; e < 4; e++) {
      const a = quads[q + e], b = quads[q + ((e + 1) & 3)];
      nbr[fill[a]++] = b;
      nbr[fill[b]++] = a;
    }
  }
  return { start, nbr };
}

const _g = [0, 0, 0];

/** Newton steps onto the zero set of the trilinear field. */
function projectToGrid(positions, field, steps) {
  const h = field.h;
  for (let v = 0; v < positions.length; v += 3) {
    for (let s = 0; s < steps; s++) {
      const x = positions[v], y = positions[v + 1], z = positions[v + 2];
      const f = gridSample(field, x, y, z, _g);
      const gl = Math.sqrt(_g[0] * _g[0] + _g[1] * _g[1] + _g[2] * _g[2]);
      if (gl < 1e-3) break;
      let dist = f / gl;
      if (dist > h) dist = h; else if (dist < -h) dist = -h;
      const step = dist / gl;
      positions[v] = x - _g[0] * step;
      positions[v + 1] = y - _g[1] * step;
      positions[v + 2] = z - _g[2] * step;
    }
  }
}

/**
 * Laplacian relaxation, each pass pulled back onto the surface. Surface
 * nets vertices sit on a voxel lattice; this irons out the stair-stepping
 * that toon shading would otherwise band into stripes.
 */
function relaxOntoSurface(positions, adjacency, field, iterations = 3, lambda = 0.55) {
  const count = positions.length / 3;
  const { start, nbr } = adjacency;
  const tmp = new Float32Array(positions.length);
  for (let it = 0; it < iterations; it++) {
    for (let v = 0; v < count; v++) {
      const s = start[v], e = start[v + 1];
      const px = positions[v * 3], py = positions[v * 3 + 1], pz = positions[v * 3 + 2];
      if (e === s) { tmp[v * 3] = px; tmp[v * 3 + 1] = py; tmp[v * 3 + 2] = pz; continue; }
      let ax = 0, ay = 0, az = 0;
      for (let n = s; n < e; n++) {
        const u = nbr[n] * 3;
        ax += positions[u]; ay += positions[u + 1]; az += positions[u + 2];
      }
      const inv = 1 / (e - s);
      tmp[v * 3] = px + (ax * inv - px) * lambda;
      tmp[v * 3 + 1] = py + (ay * inv - py) * lambda;
      tmp[v * 3 + 2] = pz + (az * inv - pz) * lambda;
    }
    positions.set(tmp);
    projectToGrid(positions, field, 2);
  }
  projectToGrid(positions, field, 2);
}

/** Split quads into triangles along the shorter diagonal, facing outward. */
function triangulate(positions, field, quads) {
  const index = new Uint32Array((quads.length / 4) * 6);
  let w = 0;
  const P = positions;
  for (let q = 0; q < quads.length; q += 4) {
    const a = quads[q], c = quads[q + 2];
    let b = quads[q + 1], d = quads[q + 3];
    const a3 = a * 3, b3 = b * 3, c3 = c * 3, d3 = d * 3;
    // Orient the quad so its geometric normal agrees with the field gradient
    const ux = P[c3] - P[a3], uy = P[c3 + 1] - P[a3 + 1], uz = P[c3 + 2] - P[a3 + 2];
    const vx = P[d3] - P[b3], vy = P[d3 + 1] - P[b3 + 1], vz = P[d3 + 2] - P[b3 + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    gridSample(field, (P[a3] + P[c3]) * 0.5, (P[a3 + 1] + P[c3 + 1]) * 0.5, (P[a3 + 2] + P[c3 + 2]) * 0.5, _g);
    if (nx * _g[0] + ny * _g[1] + nz * _g[2] < 0) { const t = b; b = d; d = t; }
    const dac = ux * ux + uy * uy + uz * uz;
    const dbd = vx * vx + vy * vy + vz * vz;
    if (dac <= dbd) {
      index[w++] = a; index[w++] = b; index[w++] = c;
      index[w++] = a; index[w++] = c; index[w++] = d;
    } else {
      index[w++] = a; index[w++] = b; index[w++] = d;
      index[w++] = b; index[w++] = c; index[w++] = d;
    }
  }
  return index;
}

/** Average each vertex normal with its neighbours (soft toon terminator). */
function smoothNormals(normals, adjacency, passes = 1) {
  const count = normals.length / 3;
  const { start, nbr } = adjacency;
  const tmp = new Float32Array(normals.length);
  for (let p = 0; p < passes; p++) {
    for (let v = 0; v < count; v++) {
      let x = normals[v * 3] * 2, y = normals[v * 3 + 1] * 2, z = normals[v * 3 + 2] * 2;
      for (let n = start[v]; n < start[v + 1]; n++) {
        const u = nbr[n] * 3;
        x += normals[u]; y += normals[u + 1]; z += normals[u + 2];
      }
      const l = Math.hypot(x, y, z) || 1;
      tmp[v * 3] = x / l; tmp[v * 3 + 1] = y / l; tmp[v * 3 + 2] = z / l;
    }
    normals.set(tmp);
  }
}

/**
 * Mesh a compiled primitive list into an indexed BufferGeometry with
 * smooth normals. `h` is the voxel size.
 */
export function sculptGeometry(prims, h, { relax = 3, timings = null } = {}) {
  let t = performance.now();
  const lap = (name) => { if (timings) { const n = performance.now(); timings[name] = (timings[name] || 0) + n - t; t = n; } };
  const field = sampleField(prims, h);
  lap('sample');
  const { positions, quads } = surfaceNets(field);
  lap('nets');
  const adjacency = buildAdjacency(positions.length / 3, quads);
  relaxOntoSurface(positions, adjacency, field, relax);
  lap('relax');
  const index = triangulate(positions, field, quads);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  geo.computeVertexNormals();
  smoothNormals(geo.attributes.normal.array, adjacency, 1);
  lap('normals');
  return geo;
}

/**
 * Compile a bone chain for fast weighting: joints J0..Jn with bone k
 * spanning Jk→Jk+1, soft hand-offs of half-width `soft` at each joint, and
 * an optional `root` bone owning everything before J0.
 *   { joints: [[x,y,z],...], bones: [name,...], root?: name, soft }
 */
export function compileChain(chain, boneIndex) {
  const J = chain.joints;
  const cum = [0];
  for (let k = 0; k < J.length - 1; k++) {
    cum.push(cum[k] + Math.hypot(J[k + 1][0] - J[k][0], J[k + 1][1] - J[k][1], J[k + 1][2] - J[k][2]));
  }
  return {
    joints: J.map((p) => p.slice()),
    cum,
    total: cum[cum.length - 1],
    bones: chain.bones.map((b) => boneIndex.get(b)),
    root: chain.root ? boneIndex.get(chain.root) : -1,
    soft: chain.soft
  };
}

function softStep(u) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  return u * u * (3 - 2 * u);
}

/**
 * Add a point's chain weights (scaled by `scaleW`) into `acc` (indexed by
 * bone). Returns the normalised arc-length coordinate along the chain.
 */
export function accumulateChain(c, x, y, z, scaleW, acc) {
  const J = c.joints;
  let best = Infinity, bestS = 0;
  const last = J.length - 2;
  for (let k = 0; k <= last; k++) {
    const a = J[k], b = J[k + 1];
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const seg = c.cum[k + 1] - c.cum[k];
    let t = ((x - a[0]) * dx + (y - a[1]) * dy + (z - a[2]) * dz) / (seg * seg);
    if (k > 0 && t < 0) t = 0;
    if (k < last && t > 1) t = 1;
    const px = a[0] + dx * t - x, py = a[1] + dy * t - y, pz = a[2] + dz * t - z;
    const d = px * px + py * py + pz * pz;
    if (d < best) { best = d; bestS = c.cum[k] + t * seg; }
  }
  const inv = 1 / (2 * c.soft);
  const nb = c.bones.length;
  let lo = 1;
  if (c.root >= 0) {
    lo = softStep((bestS - c.cum[0]) * inv + 0.5);
    acc[c.root] += (1 - lo) * scaleW;
  }
  for (let k = 0; k < nb; k++) {
    const hi = k === nb - 1 ? 0 : softStep((bestS - c.cum[k + 1]) * inv + 0.5);
    acc[c.bones[k]] += (lo - hi) * scaleW;
    lo = hi;
  }
  return bestS / c.total;
}

/** Write the four strongest bones of `acc` into skinIndex/skinWeight at v. */
export function writeTopBones(acc, v, skinIndex, skinWeight, fallback = 0) {
  let sum = 0;
  for (let s = 0; s < 4; s++) {
    let bi = -1, bw = 0;
    for (let b = 0; b < acc.length; b++) {
      if (acc[b] > bw) { bw = acc[b]; bi = b; }
    }
    if (bi < 0) { skinIndex[v * 4 + s] = 0; skinWeight[v * 4 + s] = 0; continue; }
    skinIndex[v * 4 + s] = bi;
    skinWeight[v * 4 + s] = bw;
    sum += bw;
    acc[bi] = 0;
  }
  if (sum <= 0) { skinIndex[v * 4] = fallback; skinWeight[v * 4] = 1; return; }
  for (let s = 0; s < 4; s++) skinWeight[v * 4 + s] /= sum;
}

/**
 * Bake skinning + fur attributes onto a sculpted geometry.
 *   regions: { name: { chain, leg?: bool } }
 *   boneIndex: Map(name → skeleton index)
 * Each vertex blends the regions of the primitives it lies on (softmax over
 * distance, width `tau`), the region weights are smoothed across the mesh,
 * and each region then contributes its chain weights. Writes skinIndex /
 * skinWeight, plus aFur = (legMask, legCoord) where legCoord runs 0 at the
 * toes to 1 at the top of the leg chain.
 */
export function bakeSkin(geo, prims, regions, boneIndex, tau = 0.011, smoothPasses = 3) {
  const pos = geo.attributes.position.array;
  const n = pos.length / 3;
  const skinIndex = new Uint16Array(n * 4);
  const skinWeight = new Float32Array(n * 4);
  const fur = new Float32Array(n * 2);
  const names = Object.keys(regions);
  const nr = names.length;
  const chains = names.map((name) => compileChain(regions[name].chain, boneIndex));
  const isLeg = names.map((name) => !!regions[name].leg);
  const regionOf = Int32Array.from(prims.regions, (r) => (r ? names.indexOf(r) : -1));
  const R = new Float32Array(n * nr);
  // Bucket the region primitives on a coarse grid so each vertex only
  // tests the few whose bounds can contain it
  let bx0 = Infinity, by0 = Infinity, bz0 = Infinity, bx1 = -Infinity, by1 = -Infinity, bz1 = -Infinity;
  for (let v = 0; v < n; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    if (x < bx0) bx0 = x; if (x > bx1) bx1 = x;
    if (y < by0) by0 = y; if (y > by1) by1 = y;
    if (z < bz0) bz0 = z; if (z > bz1) bz1 = z;
  }
  const cs = 0.04;
  const gx = Math.max(1, Math.ceil((bx1 - bx0) / cs) + 1);
  const gy = Math.max(1, Math.ceil((by1 - by0) / cs) + 1);
  const gz = Math.max(1, Math.ceil((bz1 - bz0) / cs) + 1);
  const buckets = Array.from({ length: gx * gy * gz }, () => []);
  const cl = (val, lo, g) => Math.min(g - 1, Math.max(0, Math.floor((val - lo) / cs)));
  for (let i = 0; i < prims.length; i++) {
    const P = prims[i];
    if (P[SUB] !== 0 || regionOf[i] < 0) continue;
    for (let k = cl(P[MINZ], bz0, gz); k <= cl(P[MAXZ], bz0, gz); k++) {
      for (let j = cl(P[MINY], by0, gy); j <= cl(P[MAXY], by0, gy); j++) {
        for (let ii = cl(P[MINX], bx0, gx); ii <= cl(P[MAXX], bx0, gx); ii++) buckets[ii + gx * (j + gy * k)].push(i);
      }
    }
  }
  const dc = new Float64Array(prims.length);
  const ic = new Int32Array(prims.length);
  for (let v = 0; v < n; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    const list = buckets[cl(x, bx0, gx) + gx * (cl(y, by0, gy) + gy * cl(z, bz0, gz))];
    let dmin = Infinity, m = 0;
    for (let q = 0; q < list.length; q++) {
      const i = list[q];
      const P = prims[i];
      if (!inBounds(P, x, y, z)) continue;
      const di = primDistance(P, x, y, z);
      dc[m] = di; ic[m] = i; m++;
      if (di < dmin) dmin = di;
    }
    let total = 0;
    for (let q = 0; q < m; q++) {
      const w = Math.exp(-(dc[q] - dmin) / tau);
      R[v * nr + regionOf[ic[q]]] += w;
      total += w;
    }
    if (total > 0) for (let r = 0; r < nr; r++) R[v * nr + r] /= total;
  }
  // Smooth the region hand-offs over the mesh (a rigger's "smooth weights"):
  // an abrupt change from girdle to limb folds the coat when the shoulder
  // blade or thigh swings.
  if (smoothPasses > 0 && geo.index) {
    const idx = geo.index.array;
    const start = new Uint32Array(n + 1);
    for (let t = 0; t < idx.length; t++) start[idx[t] + 1] += 2;
    for (let i = 0; i < n; i++) start[i + 1] += start[i];
    const fill = start.slice(0, n);
    const nbr = new Uint32Array(start[n]);
    for (let t = 0; t < idx.length; t += 3) {
      for (let e = 0; e < 3; e++) {
        const a = idx[t + e], b = idx[t + (e + 1) % 3];
        nbr[fill[a]++] = b;
        nbr[fill[b]++] = a;
      }
    }
    const tmp = new Float32Array(R.length);
    for (let pass = 0; pass < smoothPasses; pass++) {
      for (let v = 0; v < n; v++) {
        const s = start[v], e = start[v + 1];
        const o = v * nr;
        if (e === s) { for (let r = 0; r < nr; r++) tmp[o + r] = R[o + r]; continue; }
        const inv = 0.5 / (e - s);
        for (let r = 0; r < nr; r++) tmp[o + r] = R[o + r] * 0.5;
        for (let k = s; k < e; k++) {
          const u = nbr[k] * nr;
          for (let r = 0; r < nr; r++) tmp[o + r] += R[u + r] * inv;
        }
      }
      R.set(tmp);
    }
  }
  const acc = new Float32Array(boneIndex.size);
  const fallback = boneIndex.get('body') ?? 0;
  for (let v = 0; v < n; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    acc.fill(0);
    let legMask = 0, legCoord = 0;
    for (let r = 0; r < nr; r++) {
      const wr = R[v * nr + r];
      if (wr < 0.004) continue;
      const s = accumulateChain(chains[r], x, y, z, wr, acc);
      if (isLeg[r]) { legMask += wr; legCoord += wr * (1 - s); }
    }
    writeTopBones(acc, v, skinIndex, skinWeight, fallback);
    fur[v * 2] = legMask;
    fur[v * 2 + 1] = legMask > 0.001 ? legCoord / legMask : 1;
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
  geo.setAttribute('aFur', new THREE.Float32BufferAttribute(fur, 2));
  return geo;
}
