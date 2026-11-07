// GLSL for the ground (GLSL ES 3.0 / three r160). Concatenate COMMON first.
import { GLSL_PCG } from './util.js';

// Kyoto paving sizes (metres). Setts after Ishibe-kōji's reused tram stones,
// slabs after the Kawabata-dōri spec (600 × 300 × 80 mm), arare-koboshi at
// hail size, irokojiki (fish-scale) after Konchi-in.
export const PAVING = {
  setts: { w: 0.34, h: 0.17, joint: 0.014, r: 0.022 },
  slabs: { w: 0.6, h: 0.3, joint: 0.01, r: 0.012 },
  nobedan: { cell: 0.21, jitter: 0.85, joint: 0.1 },
  arare: { cell: 0.07, jitter: 0.7 },
  uroko: { cell: 0.32 },
  araidashi: { cell: 0.016 }
};

export const COMMON = /* glsl */`
${GLSL_PCG}
float h12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 h22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(h12(i), h12(i + vec2(1, 0)), u.x), mix(h12(i + vec2(0, 1)), h12(i + vec2(1, 1)), u.x), u.y);
}
float fbm3(vec2 p) { return vn(p) * .5 + vn(p * 2.03 + 17.1) * .25 + vn(p * 4.07 + 9.2) * .125 + .0625; }
float sat(float x) { return clamp(x, 0., 1.); }
float lum(vec3 c) { return dot(c, vec3(.299, .587, .114)); }
`;

/* ---------------- anti-tiling samplers for the layer arrays ---------------- */

// Hex-tiling (Mikkelsen 2022, JCGT 11(3)), the triangle grid computed once per
// pixel in world space so every layer shares it.
export const HEX = /* glsl */`
struct HexG { vec3 w; vec2 c1, c2, c3; mat2 r1, r2, r3; vec2 o1, o2, o3; };
mat2 hexRot(ivec2 v, float s) {
  float a = abs(float(v.x * v.y)) + abs(float(v.x + v.y)) + 3.14159265;
  a = mod(a, PI2); if (a > 3.14159265) a -= PI2;
  a *= s; float c = cos(a), si = sin(a);
  return mat2(c, si, -si, c);
}
vec2 hexCen(ivec2 v) { vec2 f = vec2(v); return vec2(f.x + .5 * f.y, f.y * .8660254) / 3.4641016; }
HexG hexGrid(vec2 st, float rotS) {
  HexG g;
  vec2 p = st * 3.4641016;
  vec2 sk = vec2(p.x - .57735027 * p.y, 1.15470054 * p.y);
  ivec2 b = ivec2(floor(sk));
  vec3 t = vec3(fract(sk), 0.); t.z = 1. - t.x - t.y;
  float s = step(0., -t.z), s2 = 2. * s - 1.;
  g.w = vec3(-t.z * s2, s - t.y * s2, s - t.x * s2);
  int si = int(s);
  ivec2 v1 = b + ivec2(si, si), v2 = b + ivec2(si, 1 - si), v3 = b + ivec2(1 - si, si);
  g.c1 = hexCen(v1); g.c2 = hexCen(v2); g.c3 = hexCen(v3);
  g.r1 = hexRot(v1, rotS); g.r2 = hexRot(v2, rotS); g.r3 = hexRot(v3, rotS);
  g.o1 = hash2i(v1 + ivec2(311, 17)); g.o2 = hash2i(v2 + ivec2(311, 17)); g.o3 = hash2i(v3 + ivec2(311, 17));
  return g;
}
`;

// sampleLayerD(L, worldXZ, tile, dUVdx, dUVdy, ...) -> albedo+height and slope+cavity, with
// the define ANTI picking the method: 0 plain, 1 Quilez per-tile offsets
// (4 taps), 2 Quilez noise index (2 taps), 3 hex-tiling (3 taps).
export const SAMPLER = /* glsl */`
uniform sampler2DArray uAlb, uNor;
uniform float uHexCell, uHexRot;
HexG gHex; vec2 gHexP;
// dx, dy: the UV derivatives, taken by the caller outside any branch
void sampleLayerD(float L, vec2 p, float tile, vec2 dx, vec2 dy, out vec4 a, out vec4 n) {
  vec2 uv = p / tile;
#if ANTI == 0
  a = textureGrad(uAlb, vec3(uv, L), dx, dy);
  n = textureGrad(uNor, vec3(uv, L), dx, dy);
#elif ANTI == 1
  ivec2 iu = ivec2(floor(uv)); vec2 fu = fract(uv);
  vec2 b = smoothstep(.25, .75, fu);
  vec4 A[4]; vec4 Nn[4];
  for (int k = 0; k < 4; k++) {
    ivec2 c = iu + ivec2(k & 1, k >> 1);
    vec2 o = hash2i(c + ivec2(57, 91)), m = sign(hash2i(c + ivec2(5, 3)) - .5);
    vec2 u2 = uv * m + o;
    A[k] = textureGrad(uAlb, vec3(u2, L), dx * m, dy * m);
    Nn[k] = textureGrad(uNor, vec3(u2, L), dx * m, dy * m);
    Nn[k].xy = (Nn[k].xy - .5) * m + .5;
  }
  a = mix(mix(A[0], A[1], b.x), mix(A[2], A[3], b.x), b.y);
  n = mix(mix(Nn[0], Nn[1], b.x), mix(Nn[2], Nn[3], b.x), b.y);
#elif ANTI == 2
  float k = fbm3(p * .35) * 8.;
  float ia = floor(k), f = fract(k);
  vec2 oa = sin(vec2(3., 7.) * ia), ob = sin(vec2(3., 7.) * (ia + 1.));
  vec4 a0 = textureGrad(uAlb, vec3(uv + oa, L), dx, dy), a1 = textureGrad(uAlb, vec3(uv + ob, L), dx, dy);
  vec4 n0 = textureGrad(uNor, vec3(uv + oa, L), dx, dy), n1 = textureGrad(uNor, vec3(uv + ob, L), dx, dy);
  float t = smoothstep(.2, .8, f - .1 * dot(a0.rgb - a1.rgb, vec3(1.)));
  a = mix(a0, a1, t); n = mix(n0, n1, t);
#else
  // hex: rotate each tile about its centre in world space, then scale to UV
  vec2 q1 = (gHex.r1 * (gHexP - gHex.c1) + gHex.c1) * uHexCell / tile + gHex.o1;
  vec2 q2 = (gHex.r2 * (gHexP - gHex.c2) + gHex.c2) * uHexCell / tile + gHex.o2;
  vec2 q3 = (gHex.r3 * (gHexP - gHex.c3) + gHex.c3) * uHexCell / tile + gHex.o3;
  vec4 a1 = textureGrad(uAlb, vec3(q1, L), gHex.r1 * dx, gHex.r1 * dy);
  vec4 a2 = textureGrad(uAlb, vec3(q2, L), gHex.r2 * dx, gHex.r2 * dy);
  vec4 a3 = textureGrad(uAlb, vec3(q3, L), gHex.r3 * dx, gHex.r3 * dy);
  vec3 Dw = mix(vec3(1.), vec3(lum(a1.rgb), lum(a2.rgb), lum(a3.rgb)), .6);
  vec3 W = Dw * pow(gHex.w, vec3(7.));
  W /= W.x + W.y + W.z;
  a = W.x * a1 + W.y * a2 + W.z * a3;
  vec4 n1 = textureGrad(uNor, vec3(q1, L), gHex.r1 * dx, gHex.r1 * dy);
  vec4 n2 = textureGrad(uNor, vec3(q2, L), gHex.r2 * dx, gHex.r2 * dy);
  vec4 n3 = textureGrad(uNor, vec3(q3, L), gHex.r3 * dx, gHex.r3 * dy);
  // slopes live in each tile's rotated frame: turn them back (v * R = Rᵀ v)
  vec2 d1 = (n1.xy - .5) * gHex.r1, d2 = (n2.xy - .5) * gHex.r2, d3 = (n3.xy - .5) * gHex.r3;
  n = vec4(W.x * d1 + W.y * d2 + W.z * d3 + .5, W.x * n1.z + W.y * n2.z + W.z * n3.z, 1.);
#endif
}
`;

/* ---------------- the procedural stone layer ---------------- */

const f = (x) => x.toFixed(4);
const P = PAVING;
export const PAVE = /* glsl */`
const vec3 MORTAR = vec3(.42, .40, .37);
vec3 graniteCol(ivec2 id, float spot) {
  vec2 h = hash2i(id + ivec2(31, 17));
  vec3 c = mix(vec3(.36, .355, .34), vec3(.5, .485, .45), h.x);
  if (h.y < .2) c = mix(c, vec3(.56, .48, .40), .7);        // warm granite
  else if (h.y > .82) c = mix(c, vec3(.40, .44, .47), .7);  // a cool one
  return c * (.86 + spot * .26);
}
// rounded-rect stone in a running bond. returns height 0..1; id, local q
float bondStone(vec2 p, vec2 size, float joint, float r, float bond, out ivec2 id, out vec2 q, out float d) {
  float row = floor(p.y / size.y), off = mod(row, 2.) * size.x * bond;
  float xs = p.x + off, ci = floor(xs / size.x);
  q = vec2(xs - (ci + .5) * size.x, p.y - (row + .5) * size.y);
  id = ivec2(int(ci), int(row));
  vec2 jit = (hash2i(id) - .5) * vec2(.008, .006);
  vec2 bb = size * .5 - joint * .5 - r - abs(jit);
  vec2 dq = abs(q + jit) - bb;
  d = length(max(dq, 0.)) + min(max(dq.x, dq.y), 0.) - r;
  // worn domed tops: feet round the arrises off over a century
  float dome = 1. - .45 * sat(1. + d / .06);
  return sat(-d / .006) * (.7 + .22 * hash2i(id + ivec2(7, 3)).x) * dome;
}
// Voronoi stones: f1, f2, id
vec3 vor(vec2 p, float cell, float jit, out ivec2 idn) {
  vec2 q = p / cell, fq = fract(q); ivec2 n = ivec2(floor(q));
  float f1 = 8., f2 = 8.; idn = n;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    ivec2 g = ivec2(i, j);
    vec2 o = vec2(g) + .5 + (hash2i(n + g) - .5) * jit - fq;
    float d = dot(o, o);
    if (d < f1) { f2 = f1; f1 = d; idn = n + g; } else if (d < f2) f2 = d;
  }
  return vec3(sqrt(f1), sqrt(f2), 0.);
}
// returns height; col = stone colour (alpha 0 in the joint = show the layer beneath)
float paving(vec2 p, int style, float pix, out vec4 col) {
  ivec2 id; vec2 q; float d, h = 0.;
  float grain = vn(p * 90.) * .5 + vn(p * 230.) * .5;
  if (style == 0 || style == 1) {
    vec2 sz = style == 0 ? vec2(${f(P.setts.w)}, ${f(P.setts.h)}) : vec2(${f(P.slabs.w)}, ${f(P.slabs.h)});
    float jt = style == 0 ? ${f(P.setts.joint)} : ${f(P.slabs.joint)}, rr = style == 0 ? ${f(P.setts.r)} : ${f(P.slabs.r)};
    h = bondStone(p, sz, jt, rr, .5, id, q, d);
    float m = sat(-d / max(.003, pix));
    col = vec4(graniteCol(id, grain), m);
    // tooling marks on the cut face, chipped arrises
    col.rgb *= .94 + .1 * vn(vec2(q.x * 60., float(id.y) * 3.1 + q.y * 9.));
  } else if (style == 2) {
    // nobedan: cut stones among natural ones, a mortar line between
    vec3 v = vor(p, ${f(P.nobedan.cell)}, ${f(P.nobedan.jitter)}, id);
    float e = v.y - v.x;
    float m = smoothstep(${f(P.nobedan.joint)} * .6, ${f(P.nobedan.joint)} + pix / ${f(P.nobedan.cell)}, e);
    h = m * (.65 + .3 * hash2i(id + ivec2(5, 11)).x) * (1. - .3 * v.x * v.x);
    vec2 hh = hash2i(id + ivec2(13, 7));
    vec3 c = hh.x < .3 ? vec3(.47, .43, .38) : hh.x < .6 ? graniteCol(id, grain) : vec3(.60, .55, .47);
    col = vec4(c * (.82 + .3 * hh.y) * (.92 + grain * .16), m);
  } else if (style == 3) {
    // arare-koboshi: hailstone pebbles set close in mortar
    vec3 v = vor(p, ${f(P.arare.cell)}, ${f(P.arare.jitter)}, id);
    float r = .38 + .1 * hash2i(id).x;
    float m = 1. - smoothstep(r - .06 - pix / ${f(P.arare.cell)}, r, v.x);
    h = m * sqrt(sat(1. - (v.x / r) * (v.x / r)));
    vec2 hh = hash2i(id + ivec2(3, 9));
    vec3 c = mix(vec3(.38, .37, .36), vec3(.66, .63, .58), hh.x);
    if (hh.y > .8) c = vec3(.18, .18, .19);
    col = vec4(mix(MORTAR, c * (.8 + .4 * h), m), 1.);
  } else if (style == 4) {
    // irokojiki: square stones, every other one turned 45 degrees
    float C = ${f(P.uroko.cell)};
    vec2 g = floor(p / C); vec2 l = (fract(p / C) - .5) * C;
    float diamond = mod(g.x + g.y, 2.);
    vec2 r = diamond > .5 ? vec2(l.x + l.y, l.y - l.x) * .7071 : l;
    vec2 dq = abs(r) - vec2(C * (diamond > .5 ? .34 : .43));
    d = length(max(dq, 0.)) + min(max(dq.x, dq.y), 0.);
    id = ivec2(g);
    float m = sat(-d / max(.003, pix));
    h = m * (.8 + .15 * hash2i(id).x);
    col = vec4(graniteCol(id, grain) * .95, m);
  } else {
    // araidashi: black nachiguro pebbles washed out of the cement
    vec3 v = vor(p, ${f(P.araidashi.cell)}, .9, id);
    float m = 1. - smoothstep(.3, .46, v.x);
    float far = smoothstep(.002, .006, pix);
    h = mix(m * (.5 + .4 * hash2i(id).x), .45, far);
    vec3 c = mix(vec3(.08, .08, .09), vec3(.32, .31, .3), hash2i(id + ivec2(1, 2)).x * .6);
    col = vec4(mix(mix(vec3(.62, .6, .56), c, m), vec3(.32, .31, .3), far), 1.);
  }
  return h;
}
float pavingH(vec2 p, int style) {
  ivec2 id; vec2 q; float d;
  if (style == 0) return bondStone(p, vec2(${f(P.setts.w)}, ${f(P.setts.h)}), ${f(P.setts.joint)}, ${f(P.setts.r)}, .5, id, q, d);
  if (style == 1) return bondStone(p, vec2(${f(P.slabs.w)}, ${f(P.slabs.h)}), ${f(P.slabs.joint)}, ${f(P.slabs.r)}, .5, id, q, d);
  vec4 c; return paving(p, style, .001, c);
}
`;

/* ---------------- rain rings, grooves, komorebi ---------------- */

// expanding rings in a 3 × 3 neighbourhood of hashed cells, each on its own
// clock; the radial derivative of sin(31 d) gives the normal tilt
export const RIPPLES = /* glsl */`
vec2 rainRings(vec2 p, float t) {
  vec2 p0 = floor(p), acc = vec2(0.);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 pi = p0 + vec2(i, j);
    vec2 c = pi + h22(pi);
    float ph = fract(t * .9 + h12(pi + 7.3));
    vec2 v = c - p;
    float d = length(v) - 2. * ph;
    float e = 1e-3;
    float a = sin(31. * (d - e)) * smoothstep(-.6, -.3, d - e) * smoothstep(0., -.3, d - e);
    float b = sin(31. * (d + e)) * smoothstep(-.6, -.3, d + e) * smoothstep(0., -.3, d + e);
    acc += .5 * normalize(v + 1e-4) * ((b - a) / (2. * e)) * (1. - ph) * (1. - ph);
  }
  return acc / 9.;
}
`;

// the groove buffer: R = across the stroke (0..1 = −half..+half), G = coverage,
// B = stroke direction angle (0..1 = 0..π), A = tool (0 rake, 1 broom)
export const GROOVE = /* glsl */`
uniform sampler2D uGroove;
float grooveAt(vec2 uv, vec2 p, out vec2 slope) {
  vec4 g = texture(uGroove, uv);
  slope = vec2(0.);
  if (g.g < .02) return 0.;
  float broom = step(.5, g.a);
  float half_ = broom > .5 ? .24 : .38;
  float ac = (g.r * 2. - 1.) * half_;
  float ang = g.b * 3.14159265;
  vec2 across = vec2(-sin(ang), cos(ang)), along = vec2(cos(ang), sin(ang));
  float h, dh;
  if (broom < .5) {
    // a 76 cm rake with twelve teeth: ridges every 6.3 cm
    float ph = ac / .063 * PI2;
    h = .5 + .5 * cos(ph); dh = -.5 * sin(ph) * PI2 / .063;
  } else {
    // a bamboo broom: fine irregular streaks along the stroke
    float k = ac / .0065, i0 = floor(k), fk = fract(k);
    float s0 = h12(vec2(i0, 3.1)), s1 = h12(vec2(i0 + 1., 3.1));
    float s = mix(s0, s1, smoothstep(.2, .8, fk));
    float wav = vn(vec2(dot(p, along) * 3., i0 * .37));
    h = s * (.6 + .4 * wav); dh = (s1 - s0) * 4. / .0065 * fk * (1. - fk) * .6;
  }
  float edge = smoothstep(1., .82, abs(g.r * 2. - 1.));
  float amp = g.g * edge;
  slope = across * dh * amp;
  return (h - .5) * amp;
}
`;
