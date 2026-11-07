// CPU helpers shared by every Ground Lab module: a PCG2D hash that matches the
// GLSL one bit for bit (so the CPU can find the stone the shader paints), value
// noise, fbm, a seeded PRNG and the stage's world <-> texel mapping.

export function pcg2d(x, y) {
  let vx = x >>> 0, vy = y >>> 0;
  vx = (Math.imul(vx, 1664525) + 1013904223) >>> 0;
  vy = (Math.imul(vy, 1664525) + 1013904223) >>> 0;
  vx = (vx + Math.imul(vy, 1664525)) >>> 0;
  vy = (vy + Math.imul(vx, 1664525)) >>> 0;
  vx = (vx ^ (vx >>> 16)) >>> 0;
  vy = (vy ^ (vy >>> 16)) >>> 0;
  vx = (vx + Math.imul(vy, 1664525)) >>> 0;
  vy = (vy + Math.imul(vx, 1664525)) >>> 0;
  vx = (vx ^ (vx >>> 16)) >>> 0;
  vy = (vy ^ (vy >>> 16)) >>> 0;
  return [vx, vy];
}
export const hash2i = (x, y) => { const [a, b] = pcg2d(x, y); return [a / 4294967296, b / 4294967296]; };
export const hash1 = (x, y) => pcg2d(x, y)[0] / 4294967296;

const q5 = (t) => t * t * t * (t * (t * 6 - 15) + 10);
export function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = q5(x - ix), fy = q5(y - iy);
  const a = hash1(ix, iy), b = hash1(ix + 1, iy), c = hash1(ix, iy + 1), d = hash1(ix + 1, iy + 1);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}
export function fbm(x, y, oct = 4) {
  let s = 0, a = 0.5;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 9.2; a *= 0.5; }
  return s;
}

export function mulberry32(a) {
  return () => {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const mix = (a, b, t) => a + (b - a) * t;
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const lerp3 = (a, b, t, o = [0, 0, 0]) => { o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; return o; };
export const hex3 = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];

/** Distance from p to segment ab (2D), plus t along it. */
export function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1);
  return [Math.hypot(px - ax - dx * t, pz - az - dz * t), t];
}
/** Distance from p to a polyline [[x, z], ...] and the arc-length position there. */
export function polyDist(px, pz, pts) {
  let best = 1e9, s = 0, at = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const [d, t] = segDist(px, pz, ax, az, bx, bz);
    const len = Math.hypot(bx - ax, bz - az);
    if (d < best) { best = d; at = s + t * len; }
    s += len;
  }
  return [best, at];
}
/** Catmull-Rom resample of a polyline (open), `n` points per segment. */
export function smoothLine(pts, n = 8) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export const GLSL_PCG = /* glsl */`
uvec2 pcg2d(uvec2 v){ v = v*1664525u + 1013904223u; v.x += v.y*1664525u; v.y += v.x*1664525u; v ^= v>>16u; v.x += v.y*1664525u; v.y += v.x*1664525u; v ^= v>>16u; return v; }
vec2 hash2i(ivec2 c){ return vec2(pcg2d(uvec2(c))) * (1.0/4294967296.0); }
`;
