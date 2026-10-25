// PCG2D in JS and the identical GLSL, plus the stone layout and palettes both
// sides share, so the page can place real stones exactly where the shader
// paints them.
import * as THREE from 'three';

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
const hx = (x, y) => pcg2d(x, y)[0] / 4294967296;
const sm = (t) => t * t * t * (t * (t * 6 - 15) + 10);

export function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = sm(x - ix), fy = sm(y - iy);
  const a = hx(ix, iy), b = hx(ix + 1, iy), c = hx(ix, iy + 1), d = hx(ix + 1, iy + 1);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}
export const fbm = (x, y, oct = 4) => {
  let s = 0, a = 0.5;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 9.2; a *= 0.5; }
  return s;
};

export const SETT = { w: 0.30, h: 0.15, joint: 0.012, r: 0.02 };
export const COB = { jitter: 0.55, joint: 0.12, round: 1.4 };
const lin = (hex) => new THREE.Color(hex);
export const SETT_PAL = { a: lin(0x8f8b84), b: lin(0xa8a39a), warm: lin(0xa89a86), cool: lin(0x878d92) };
export const COB_PAL = [0x7f8a90, 0x5f6468, 0x9a8466, 0xb3aea4, 0x8a6a52].map(lin);

// the stone containing (x, z): ids, centre, size and colour, same as the shader
export function settAt(x, z) {
  const row = Math.floor(z / SETT.h), off = (row & 1) * SETT.w * 0.5, col = Math.floor((x + off) / SETT.w);
  return { col, row, cx: (col + 0.5) * SETT.w - off, cz: (row + 0.5) * SETT.h };
}
export function settColor(col, row, out = new THREE.Color()) {
  const h = hash2i(col, row), w = hash2i(col + 31, row + 17)[0];
  out.copy(SETT_PAL.a).lerp(SETT_PAL.b, h[1]);
  if (w < 0.2) out.lerp(SETT_PAL.warm, 0.75); else if (w > 0.82) out.lerp(SETT_PAL.cool, 0.75);
  return out;
}
export const settHeight = (col, row) => 0.55 + 0.4 * hash2i(col, row)[0];
export function cobPoint(nx, nz, C) {
  const h = hash2i(nx, nz);
  return { x: (nx + 0.5 + (h[0] - 0.5) * COB.jitter) * C, z: (nz + 0.5 + (h[1] - 0.5) * COB.jitter) * C };
}
export function cobColor(nx, nz, out = new THREE.Color()) {
  const h = hash2i(nx + 13, nz + 7);
  return out.copy(COB_PAL[Math.min(4, Math.floor(h[0] * 5))]).multiplyScalar(0.85 + 0.3 * h[1]);
}
export const cobHeight = (nx, nz) => 0.7 + 0.3 * hash2i(nx + 5, nz + 11)[0];

const v3 = (c) => `vec3(${c.r.toFixed(4)},${c.g.toFixed(4)},${c.b.toFixed(4)})`;
export const GLSL_HASH = /* glsl */`
uvec2 pcg2d(uvec2 v){ v = v*1664525u + 1013904223u; v.x += v.y*1664525u; v.y += v.x*1664525u; v ^= v>>16u; v.x += v.y*1664525u; v.y += v.x*1664525u; v ^= v>>16u; return v; }
vec2 hash2i(ivec2 c){ return vec2(pcg2d(uvec2(c))) * (1.0/4294967296.0); }
const float S_W = ${SETT.w}, S_H = ${SETT.h}, S_J = ${SETT.joint}, S_R = ${SETT.r};
vec3 settCol(ivec2 c){
  vec2 h = hash2i(c); float w = hash2i(c + ivec2(31, 17)).x;
  vec3 col = mix(${v3(SETT_PAL.a)}, ${v3(SETT_PAL.b)}, h.y);
  if (w < 0.2) col = mix(col, ${v3(SETT_PAL.warm)}, 0.75); else if (w > 0.82) col = mix(col, ${v3(SETT_PAL.cool)}, 0.75);
  return col;
}
vec3 cobCol(ivec2 c){
  vec2 h = hash2i(c + ivec2(13, 7)); int k = int(min(4.0, floor(h.x * 5.0)));
  vec3 p[5] = vec3[5](${COB_PAL.map(v3).join(',')});
  return p[k] * (0.85 + 0.3 * h.y);
}
`;
