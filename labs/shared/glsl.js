// Shared GLSL chunks (strings) for WebGL2 / GLSL ES 3.0 ShaderMaterial or
// onBeforeCompile. Concatenate in order: HASH, then NOISE (needs HASH), then
// WARP (needs HASH + NOISE).

// Dave Hoskins' sine-free hashes
export const HASH = /* glsl */`
float hash11(float p) { p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
vec3 hash33(vec3 p3) { p3 = fract(p3 * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }
`;

export const NOISE = /* glsl */`
float vnoise2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * f * (f * (f * 6. - 15.) + 10.);
  return mix(mix(hash12(i), hash12(i + vec2(1., 0.)), u.x), mix(hash12(i + vec2(0., 1.)), hash12(i + vec2(1., 1.)), u.x), u.y);
}
float gnoise2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * f * (f * (f * 6. - 15.) + 10.);
  float a = dot(hash22(i) * 2. - 1., f);
  float b = dot(hash22(i + vec2(1., 0.)) * 2. - 1., f - vec2(1., 0.));
  float c = dot(hash22(i + vec2(0., 1.)) * 2. - 1., f - vec2(0., 1.));
  float d = dot(hash22(i + vec2(1., 1.)) * 2. - 1., f - vec2(1., 1.));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * .5 + .5;
}
float fbm2(vec2 p, int oct) {
  float s = 0., a = .5;
  for (int i = 0; i < 8; i++) {
    if (i >= oct) break;
    s += a * vnoise2(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= .5;
  }
  return s;
}
// x: distance to the nearest feature point, y: to the second nearest, z: hash of the nearest cell
vec3 voronoi2(vec2 p) {
  vec2 n = floor(p), f = fract(p);
  float d1 = 8., d2 = 8., id = 0.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 o = hash22(n + g);
    float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; id = hash12(n + g + 31.7); }
    else if (d < d2) d2 = d;
  }
  return vec3(d1, d2, id);
}
`;

export const WARP = /* glsl */`
vec2 domainWarp2(vec2 p, float amount) {
  vec2 q = vec2(fbm2(p + vec2(0., 0.), 4), fbm2(p + vec2(5.2, 1.3), 4));
  return p + amount * (q * 2. - 1.);
}
`;
