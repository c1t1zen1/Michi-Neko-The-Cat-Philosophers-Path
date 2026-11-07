// GLSL shared by the river, the paddies and the cubes. Concatenate after the
// kit's HASH and NOISE chunks (labs/shared/glsl.js).

export const WATER_UNIFORMS = /* glsl */`
uniform sampler2D uField;
uniform vec4 uBox;
uniform float uLevel, uTime;
uniform sampler2D uNormal, uFoamTex;
uniform vec3 uSunDir, uSunCol, uMoonDir, uSkyTop, uSkyHor;
uniform float uSunI, uMoonI;
uniform vec3 uDeep, uShallow;
uniform float uClarity, uFlowRate, uRough;
uniform vec4 uRip[16];
uniform vec4 uRipV[16];
uniform vec4 uLights[8];
uniform vec3 uLightCol;
uniform float uRain, uPaint, uFlowOn, uPhaseNoise, uFoamOn, uDepthOn;
uniform int uDebug;
uniform sampler2D uMirror;
uniform mat4 uMirrorMat;
uniform float uMirrorOn;
uniform sampler2D uHeight;
uniform vec2 uHeightTexel;
uniform float uDay, uDusk, uGameEncode;
`;

export const WATER_FUNCS = /* glsl */`
vec4 field(vec2 p) { return texture2D(uField, (p - uBox.xy) * uBox.zw); }

vec3 skyColor(vec3 d) {
  float h = clamp(d.y, 0., 1.);
  vec3 c = mix(uSkyHor, uSkyTop, pow(h, 0.55));
  float s = max(dot(d, uSunDir), 0.);
  c += uSunCol * (pow(s, 16.) * 0.25 + pow(s, 700.) * 5.) * uSunI * 0.45;
  float m = max(dot(d, uMoonDir), 0.);
  c += vec3(0.86, 0.9, 1.) * (pow(m, 1400.) * 9. + pow(m, 40.) * 0.08) * uMoonI;
  return c;
}

// the normal map stores (x, z-slope, up); returns the two slopes
vec2 nslope(vec2 uv) { vec3 n = texture2D(uNormal, uv).xyz * 2. - 1.; return n.xy / max(n.z, 0.2); }

// Vlachos (Portal 2): two layers half a cycle apart, each distorted along the
// flow and cross-faded so neither restart shows. noiseOn offsets the phase per
// pixel, which kills the whole-river "pulse".
vec2 flowSlope(vec2 p, vec2 flow, float t, float noiseOn) {
  float off = noiseOn * texture2D(uFoamTex, p * 0.071).g * 1.9;
  float ph = t * uFlowRate + off;
  float p0 = fract(ph), p1 = fract(ph + 0.5);
  float w0 = 1. - abs(2. * p0 - 1.);
  float T = 1. / uFlowRate;
  vec2 d0 = flow * (p0 - 0.5) * T, d1 = flow * (p1 - 0.5) * T;
  vec2 a = nslope((p - d0) / 2.6) * w0 + nslope((p - d1) / 2.6 + 0.37) * (1. - w0);
  vec2 b = nslope((p - d0) / 0.85 + 0.61) * w0 + nslope((p - d1) / 0.85 + 0.13) * (1. - w0);
  return a + b * 0.55;
}

// one foam lookup advected the same way (r = bubbles, g = streaks)
vec4 flowFoam(vec2 p, vec2 flow, float t, float scale) {
  float ph = t * 0.31;
  float p0 = fract(ph), p1 = fract(ph + 0.5);
  float w0 = 1. - abs(2. * p0 - 1.);
  float T = 1. / 0.31;
  vec4 a = texture2D(uFoamTex, (p - flow * (p0 - 0.5) * T) * scale);
  vec4 b = texture2D(uFoamTex, (p - flow * (p1 - 0.5) * T) * scale + 0.5);
  return a * w0 + b * (1. - w0);
}

// rings from the pool in effects.js: centre drifts with the flow it was born in
vec2 ripples(vec2 p, float t, out float rf) {
  vec2 g = vec2(0.);
  rf = 0.;
  for (int i = 0; i < 16; i++) {
    vec4 r = uRip[i];
    vec4 v = uRipV[i];
    float age = t - r.z;
    if (r.w <= 0. || age < 0. || age > v.z) continue;
    vec2 d = p - (r.xy + v.xy * age);
    float dist = length(d) + 1e-4;
    float R = 0.04 + age * 0.6;
    float k = dist - R;
    float env = r.w * (1. - age / v.z);
    env *= env;
    g += d / dist * sin(k * 40.) * exp(-k * k * 55.) * env * 1.5 / (1. + R * 1.6);
    rf += exp(-k * k * 240.) * env * smoothstep(0.9, 1.7, r.w);
  }
  return g;
}

vec2 rainRings(vec2 p, float t) {
  vec2 g = vec2(0.);
  if (uRain < 0.01) return g;
  for (int l = 0; l < 2; l++) {
    vec2 q = p * (3.1 + float(l) * 1.9) + float(l) * 7.31;
    vec2 id = floor(q);
    float h = hash12(id + float(l) * 13.1);
    if (h > uRain) continue;
    vec2 d = fract(q) - 0.5 - (hash22(id) - 0.5) * 0.5;
    float ph = fract(t * (0.8 + h * 0.7) + h * 7.);
    float dist = length(d) + 1e-4;
    float k = dist - ph * 0.42;
    g += d / dist * sin(k * 62.) * exp(-k * k * 320.) * (1. - ph) * 0.8;
  }
  return g;
}

// lantern / tōrō glitter: a broken-up normal stretches each light into a streak
vec3 lightGlitter(vec3 P, vec3 N, vec3 V) {
  vec3 c = vec3(0.);
  for (int i = 0; i < 8; i++) {
    vec4 L = uLights[i];
    if (L.w <= 0.) continue;
    vec3 d = L.xyz - P;
    vec3 H = normalize(normalize(d) + V);
    float nh = max(dot(N, H), 0.);
    c += uLightCol * (pow(nh, 260.) * 4. + pow(nh, 28.) * 0.09) * L.w / (1. + dot(d, d) * 0.07);
  }
  return c;
}

vec3 mirrorColor(vec3 P, vec3 N, vec3 fallback, float amount) {
  if (uMirrorOn < 0.5) return fallback;
  vec4 q = uMirrorMat * vec4(P, 1.);
  vec2 uv = q.xy / q.w + N.xz * amount;
  vec3 m = texture2D(uMirror, clamp(uv, 0.001, 0.999)).rgb;
  return mix(fallback, m, step(0., q.w));
}

vec3 ambientWater() {
  return uSkyTop * 0.34 + uSkyHor * 0.22 + uSunCol * uSunI * 0.2 * max(uSunDir.y, 0.) + vec3(0.02, 0.025, 0.035) + uMoonI * vec3(0.03, 0.04, 0.06);
}

vec3 posterize(vec3 c, float steps, float amount) {
  float l = dot(c, vec3(0.3, 0.59, 0.11));
  float q = floor(l * steps + 0.5) / steps;
  return c * mix(1., q / max(l, 1e-3), amount);
}

vec3 debugView(vec2 p, vec3 N, float depth, float foam, inout float a) {
  if (uDebug == 2) { a = 1.; return mix(vec3(0.93, 0.95, 0.8), vec3(0.05, 0.12, 0.35), smoothstep(0., 1., depth)); }
  if (uDebug == 3) { a = 1.; return vec3(foam) * 0.9 + vec3(0.04, 0.06, 0.1); }
  if (uDebug == 4) { a = 1.; return N * 0.5 + 0.5; }
  // flow arrows on a 0.5 m grid, coloured by speed
  vec2 cellC = (floor(p * 2.) + 0.5) / 2.;
  vec4 Fc = field(cellC);
  vec2 fl = Fc.gb * smoothstep(0., 0.35, uLevel - Fc.r);
  vec4 F = field(p);
  float sp = length(F.gb * smoothstep(0., 0.35, uLevel - F.r));
  vec3 c = mix(vec3(0.12, 0.28, 0.55), vec3(0.98, 0.55, 0.3), smoothstep(0.05, 1.5, sp));
  float s = length(fl);
  vec2 dir = s > 1e-3 ? fl / s : vec2(1., 0.);
  vec2 q = p - cellC;
  float al = dot(q, dir), ac = dot(q, vec2(-dir.y, dir.x));
  float len = clamp(s * 0.4, 0.05, 0.42);
  float shaft = step(abs(ac), 0.014) * step(-len * 0.5, al) * step(al, len * 0.5 - 0.06);
  float head = step(abs(ac), (len * 0.5 - al) * 0.55) * step(len * 0.5 - 0.12, al) * step(al, len * 0.5);
  a = 1.;
  return mix(c, vec3(1.), clamp(shaft + head, 0., 1.) * step(0.02, s));
}
`;
