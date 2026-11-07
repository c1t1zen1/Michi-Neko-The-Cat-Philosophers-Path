// One water shader, eleven ways to draw it. STYLE picks the branch; every
// style reads the same field texture (bed, flow, foam), so the cubes and the
// stage compare like with like. Output is premultiplied alpha: the water body
// covers the bed by Beer-Lambert opacity, reflections and foam sit on top.
import * as THREE from 'three';
import { HASH, NOISE } from '../../shared/glsl.js';
import { WATER_UNIFORMS, WATER_FUNCS } from './glsl.js';
import { rippleNormals, foamTexture } from './textures.js';

export const STYLES = { kyoto: 0, game: 1, scroll: 2, flowmap: 3, gerstner: 4, toon: 5, ripple: 6, mirror: 7, caustic: 8, painted: 9, sumi: 10 };

// How each style wants the rest of the scene set: caustic strength on the bed,
// clarity (absorption per metre) and whether it uses the planar mirror.
export const STYLE_ENV = {
  kyoto: { caustic: 1, chroma: 0, clarity: 2.1, mirror: true },
  game: { caustic: 0, chroma: 0, clarity: 2.4, mirror: false },
  scroll: { caustic: 0.35, chroma: 0, clarity: 2.2, mirror: false },
  flowmap: { caustic: 0.5, chroma: 0, clarity: 1.5, mirror: true },
  gerstner: { caustic: 0.3, chroma: 0, clarity: 2.4, mirror: false },
  toon: { caustic: 0, chroma: 0, clarity: 3, mirror: false },
  ripple: { caustic: 0.9, chroma: 0, clarity: 1.4, mirror: false },
  mirror: { caustic: 0.4, chroma: 0, clarity: 2.4, mirror: true },
  caustic: { caustic: 2.1, chroma: 1, clarity: 0.75, mirror: false },
  painted: { caustic: 0.25, chroma: 0, clarity: 2.6, mirror: false },
  sumi: { caustic: 0, chroma: 0, clarity: 3, mirror: false }
};

const VERT = /* glsl */`
#include <common>
#include <fog_pars_vertex>
uniform sampler2D uField;
uniform vec4 uBox;
uniform float uLevel, uTime;
varying vec3 vWorld;
varying vec3 vGN;
varying float vGH;

// GPU Gems ch. 1: four Gerstner waves, steepness Q, wavelength L, amplitude A
void gerstner(vec2 p, float t, out vec3 disp, out vec3 nrm) {
  disp = vec3(0.); vec3 n = vec3(0., 1., 0.);
  vec4 W[4];
  W[0] = vec4(1., 0.12, 2.4, 0.045); W[1] = vec4(0.82, 0.57, 1.4, 0.03);
  W[2] = vec4(0.93, -0.36, 0.9, 0.018); W[3] = vec4(0.4, 0.92, 0.55, 0.01);
  for (int i = 0; i < 4; i++) {
    vec2 D = normalize(W[i].xy); float L = W[i].z, A = W[i].w;
    float k = 6.2831853 / L, c = sqrt(9.8 / k), f = k * (dot(D, p) - c * t), Q = 0.7 / (k * A * 4.);
    disp.x += Q * A * D.x * cos(f); disp.z += Q * A * D.y * cos(f); disp.y += A * sin(f);
    n.x -= D.x * k * A * cos(f); n.z -= D.y * k * A * cos(f); n.y -= Q * k * A * sin(f);
  }
  nrm = normalize(n);
}

void main() {
  vec4 wp = modelMatrix * vec4(position, 1.);
  vGN = vec3(0., 1., 0.); vGH = 0.;
#if STYLE == 4
  vec4 F = texture2D(uField, (wp.xz - uBox.xy) * uBox.zw);
  float fade = smoothstep(0.02, 0.5, uLevel - F.r);
  vec3 d; vec3 n;
  gerstner(wp.xz, uTime, d, n);
  wp.xyz += d * fade;
  vGN = normalize(mix(vec3(0., 1., 0.), n, fade));
  vGH = d.y * fade;
#endif
  vWorld = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */`
#include <common>
#include <fog_pars_fragment>
${HASH}
${NOISE}
${WATER_UNIFORMS}
varying vec3 vWorld;
varying vec3 vGN;
varying float vGH;
${WATER_FUNCS}

void finish(vec3 col, float a) {
  #ifdef USE_FOG
    float fogF = 1. - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
    col = mix(col, fogColor * a, fogF);
  #endif
  gl_FragColor = vec4(col, clamp(a, 0., 1.));
}

void main() {
  vec3 P = vWorld;
  vec2 p = P.xz;
  float t = uTime;
  vec4 F = field(p);
  float depth = uLevel - F.r;
  if (depth < -0.004) discard;
  float edge = smoothstep(-0.004, 0.03, depth);
  float df = smoothstep(0., 0.35, depth);
  vec2 flow0 = F.gb * df;
  float speed = length(flow0);
  vec3 V = normalize(cameraPosition - P);
  vec3 amb = ambientWater();
  float sunUp = smoothstep(-0.05, 0.08, uSunDir.y);
  vec3 col; float a;

#if STYLE == 1
  // ---- the game today (countryside.js createRiverWaterMaterial), bank from depth
  float bank = clamp(depth / 1.7, 0., 0.5);
  vec2 q = p;
  float h0 = sin(q.x * 2.1 - t * 1.4 + sin(q.y * 3. + t * 0.7) * 0.8) * 0.5 + sin(q.y * 3.4 + q.x * 0.6 - t * 2.1) * 0.35
    + (sin((q.x + q.y) * 6.5 - t * 3.1) * 0.35 + (vnoise2(q * 3. + vec2(t * 0.8, 0.)) - 0.5) * 0.8) * 0.25;
  float e = 0.06;
  #define WH(Q) (sin((Q).x * 2.1 - t * 1.4 + sin((Q).y * 3. + t * 0.7) * 0.8) * 0.5 + sin((Q).y * 3.4 + (Q).x * 0.6 - t * 2.1) * 0.35 + (sin(((Q).x + (Q).y) * 6.5 - t * 3.1) * 0.35 + (vnoise2((Q) * 3. + vec2(t * 0.8, 0.)) - 0.5) * 0.8) * 0.25)
  float hx = WH(q + vec2(e, 0.)) - WH(q - vec2(e, 0.));
  float hz = WH(q + vec2(0., e)) - WH(q - vec2(0., e));
  vec3 n = normalize(vec3(-hx * 0.9, 1., -hz * 0.9));
  vec3 H = normalize(uSunDir + V);
  vec3 gDeep = vec3(0.0168, 0.0723, 0.1022), gShallow = vec3(0.0782, 0.2705, 0.2623);
  float shallowness = 0.3 + h0 * 0.15 + smoothstep(0.35, 0., bank) * 0.35;
  float silt = vnoise2(q * 0.8 + 4.) * 0.6 + vnoise2(q * 3.1 + 9.) * 0.4;
  float pebble = smoothstep(0.6, 0.92, vnoise2(q * 6.5 + 15.));
  vec3 bedCol = mix(gDeep * 0.82, gShallow * 1.08, silt) * (1. - pebble * 0.16);
  col = mix(gDeep, mix(gShallow, bedCol, 0.6), shallowness);
  float fres = 0.04 + 0.5 * pow(1. - max(dot(n, V), 0.), 4.5);
  col = mix(col, mix(uSkyHor, uSkyTop, clamp(n.y * V.y * 1.4, 0., 1.)) * 0.55, clamp(fres, 0., 0.5));
  col += uSunCol * (pow(max(dot(n, H), 0.), 260.) * 1.1 + pow(max(dot(n, H), 0.), 18.) * 0.05) * sunUp * (0.5 + uDusk * 0.8);
  vec2 cell = floor(vec2(q.x * 10. - t * 3.2, q.y * 10.));
  col += uSunCol * step(0.992, hash12(cell + floor(t * 9.) * 0.17)) * smoothstep(0.35, 0.9, h0 * 0.5 + 0.5) * 0.6 * sunUp;
  col += uSunCol * pow(vnoise2(q * 4.5 - vec2(t * 0.35, t * 0.22)), 3.) * pow(vnoise2(q * 2.1 + vec2(t * 0.15, -t * 0.1) + 7.), 2.) * 0.2 * sunUp * smoothstep(0.42, 0., bank);
  float foamN = vnoise2(vec2(q.x * 1.5 - t * 0.6, q.y * 6.)), foamN2 = vnoise2(vec2(q.x * 3.8 - t * 0.95, q.y * 11. + 3.));
  float gfoam = smoothstep(0.14, 0., bank) * smoothstep(0.5, 0.85, foamN * 0.7 + foamN2 * 0.3 + h0 * 0.15);
  col = mix(col, vec3(0.85, 0.9, 0.9), gfoam * 0.45 * (0.4 + 0.6 * uDay));
  col *= 0.22 + 0.78 * uDay;
  col = min(col, vec3(1.3));
  a = (0.6 + 0.36 * clamp(fres * 2., 0., 1.)) * smoothstep(0., 0.08, bank) + 0.05;
  a *= edge;
  if (uDebug > 0) col = debugView(p, n, depth, gfoam, a);
  // the game writes these linear values straight to an sRGB canvas (no tone
  // mapping, no colour space); the lab renders through a linear target, so
  // undo the encode it will apply to show the same pixels the game does
  if (uGameEncode > 0.5) col = pow(max(col, 0.), vec3(2.2));
  gl_FragColor = vec4(col * a, a);
  return;

#elif STYLE == 10
  // ---- sumi-e: ink lines along the current on paper
  vec4 fm = flowFoam(p, flow0, t, 0.55);
  float lines = 1. - smoothstep(0.03, 0.08, abs(fract(fm.g * 5.5) - 0.5) - 0.38);
  float wash = smoothstep(0., 1.1, depth) * 0.32;
  float shore = 1. - smoothstep(0., 0.05, depth);
  float rf; vec2 rs = ripples(p, t, rf);
  float ink = clamp(wash + lines * 0.55 * smoothstep(0.05, 0.9, speed) + shore * 0.8 + smoothstep(0.3, 0.8, F.a) * 0.5 + length(rs) * 0.6, 0., 1.);
  col = mix(vec3(0.93, 0.91, 0.86), vec3(0.07, 0.08, 0.1), ink) * mix(1., 0.94, texture2D(uFoamTex, p * 0.9).r);
  a = 0.97 * edge;
  if (uDebug > 0) col = debugView(p, vec3(0., 1., 0.), depth, F.a, a);
  col *= a;

#elif STYLE == 5
  // ---- toon: hard depth bands, streaks along the flow, a wobbly foam line
  float wob = texture2D(uFoamTex, p * 0.4 + t * 0.02).g;
  vec3 c0 = vec3(0.42, 0.8, 0.78), c1 = vec3(0.12, 0.5, 0.62), c2 = vec3(0.04, 0.22, 0.4);
  float dd = depth + (wob - 0.5) * 0.08;
  col = dd < 0.16 ? c0 : dd < 0.5 ? c1 : c2;
  col *= amb * 2.2;
  vec4 fm = flowFoam(p, flow0, t, 0.42);
  float streak = step(0.8, fm.g) * smoothstep(0.1, 0.8, speed);
  float line = step(depth, 0.05 + wob * 0.05);
  float rf; ripples(p, t, rf);
  float f = max(max(streak * 0.7, line), max(step(0.45, F.a * (0.5 + fm.r)), step(0.3, rf)));
  col = mix(col, amb * 2.6 + 0.05, f);
  vec3 H = normalize(uSunDir + V);
  col += uSunCol * step(0.985, max(dot(vec3(0., 1., 0.), H), 0.)) * sunUp;
  a = 0.88 * edge;
  if (uDebug > 0) col = debugView(p, vec3(0., 1., 0.), depth, f, a);
  col *= a;

#else
  // ---- the lit styles: slopes, then one shared shading model
  vec2 slope = vec2(0.);
  float rf = 0.;
  float rough = uRough;
  vec2 flow = flow0 * uFlowOn;
  #if STYLE == 2
    // Water.js style: four normal samples scrolled in fixed directions
    slope = nslope(p / 2.1 + vec2(t * 0.032, t * 0.011)) + nslope(p / 1.3 - vec2(t * 0.021, -t * 0.017))
          + nslope(p / 3.7 + vec2(-t * 0.013, t * 0.025)) + nslope(p / 0.83 + vec2(t * 0.04, -t * 0.03)) * 0.6;
    slope *= 0.16;
  #elif STYLE == 4
    slope = -vGN.xz / max(vGN.y, 0.2) + nslope(p / 0.9 + vec2(t * 0.03, 0.)) * 0.08;
  #elif STYLE == 6
    float h = texture2D(uHeight, (p - uBox.xy) * uBox.zw).r;
    float hl = texture2D(uHeight, (p - uBox.xy) * uBox.zw - vec2(uHeightTexel.x, 0.)).r;
    float hr = texture2D(uHeight, (p - uBox.xy) * uBox.zw + vec2(uHeightTexel.x, 0.)).r;
    float hd = texture2D(uHeight, (p - uBox.xy) * uBox.zw - vec2(0., uHeightTexel.y)).r;
    float hu = texture2D(uHeight, (p - uBox.xy) * uBox.zw + vec2(0., uHeightTexel.y)).r;
    slope = -vec2(hr - hl, hu - hd) * 9.;
    rf = clamp(-(hl + hr + hd + hu - 4. * h) * 30., 0., 1.);    // focusing crests (Wallace's caustic cue)
    slope += nslope(p / 2.2 + vec2(t * 0.01, 0.)) * 0.04;
  #elif STYLE == 3
    slope = flowSlope(p, flow, t, 0.) * (0.12 + 0.4 * smoothstep(0.05, 1.3, speed));
  #else
    slope = flowSlope(p, flow, t, uPhaseNoise) * (0.16 + 0.75 * smoothstep(0.05, 1.3, speed * uFlowOn)) * rough;
  #endif
  float rfr;
  slope += ripples(p, t, rfr) * 0.9;
  slope += rainRings(p, t) * uRain;
  rf = max(rf, rfr);
  vec3 N = normalize(vec3(slope.x, 1., slope.y));
  float NdV = max(dot(N, V), 0.);
  float fres = 0.02 + 0.98 * pow(1. - NdV, 5.);
  vec3 R = reflect(-V, N); R.y = abs(R.y);
  vec3 refl = skyColor(R);
  #if STYLE == 0 || STYLE == 3 || STYLE == 7
    refl = mirrorColor(P, N, refl, STYLE == 7 ? 0.05 : 0.03);
  #endif
  #if STYLE == 3
    fres = 0.02 + 0.98 * pow(1. - NdV, 5.);
  #endif
  // a painter's water is lighter where the view grazes it and darker underfoot
  float far = 1. - smoothstep(0.12, 0.85, V.y);
  refl = mix(refl, mix(uSkyTop * 0.5, uSkyHor * 1.05, far), uPaint * 0.45);

  float absorb = 1. - exp(-depth * uClarity * mix(1., 0.45, 1. - uDepthOn) - (1. - uDepthOn) * 0.9);
  vec3 body = mix(uShallow, uDeep, smoothstep(0.05, 0.95, depth * uDepthOn + (1. - uDepthOn) * 0.6)) * amb * 1.7;
  body = posterize(body, 5., uPaint * 0.55);

  // foam: the shore, the field (pillows, eddy lines, the weir), splash rings
  vec4 fm = flowFoam(p, flow0, t, 0.6);
  float shore = (1. - smoothstep(0., 0.075, depth)) * smoothstep(0.25, 0.7, fm.r + 0.3);
  float fieldFoam = smoothstep(0.2, 0.7, F.a * (0.5 + fm.r * 0.65 + fm.g * 0.45));
  float foam = max(shore, fieldFoam) * uFoamOn;
  #if STYLE == 2 || STYLE == 3 || STYLE == 8
    foam = 0.;
  #elif STYLE == 4
    foam = max(foam, smoothstep(0.055, 0.085, vGH) * fm.r * 0.8);
  #elif STYLE == 6
    foam = max(foam * 0.5, rf * 0.25);
  #endif
  foam = max(foam, rf * step(0.5, uFoamOn));
  foam *= edge;

  vec3 H = normalize(uSunDir + V);
  float nh = max(dot(N, H), 0.);
  float spec = pow(nh, 600.) * 5. + pow(nh, 60.) * 0.08;
  spec = mix(spec, smoothstep(0.9, 1.1, spec) * 2.2, smoothstep(0.35, 0.95, uPaint));
  vec3 specCol = uSunCol * spec * uSunI * sunUp;
  vec3 Hm = normalize(uMoonDir + V);
  specCol += vec3(0.8, 0.86, 1.) * pow(max(dot(N, Hm), 0.), 320.) * 7. * uMoonI;
  specCol += lightGlitter(P, N, V);

  #if STYLE == 9
    // ---- painted: three flat tones, the sky gradient turned upside down,
    // white strokes along the current and a dark line where water meets land
    vec3 deepP = uDeep * amb * 1.5, midP = mix(uShallow, uDeep, 0.45) * amb * 1.9, skyP = mix(uSkyHor, uSkyTop, 0.35);
    body = mix(deepP, skyP * 0.85, far * 0.75);
    body = mix(body, midP, 1. - smoothstep(0.08, 0.55, depth));
    body = posterize(body, 4., 0.8);
    absorb = smoothstep(0., 0.05, depth) * 0.93;
    fres *= 0.4;
    vec4 st = flowFoam(p * vec2(0.6, 2.2), flow0 * vec2(0.6, 2.2), t, 0.5);
    float stroke = smoothstep(0.78, 0.82, st.g) * (0.35 + 0.65 * smoothstep(0.1, 1., speed));
    foam = max(foam, stroke * 0.85);
    specCol = uSunCol * smoothstep(0.55, 0.6, spec) * 1.8 * uSunI * sunUp + specCol * 0.3;
  #elif STYLE == 8
    specCol *= 0.6;
  #endif

  float aBody = absorb * edge;
  col = body * aBody * (1. - fres) + refl * fres * edge + specCol * edge;
  a = aBody * (1. - fres) + fres * edge;
  vec3 foamCol = (uSkyHor * 0.45 + uSkyTop * 0.3 + uSunCol * uSunI * 0.38 * max(uSunDir.y, 0.)) * 1.2 + 0.05 + uMoonI * 0.08;
  col = col * (1. - foam) + foamCol * foam;
  a = a * (1. - foam) + foam;
  float inkLine = (1. - smoothstep(0., 0.022, depth)) * edge * uPaint;
  #if STYLE == 9
    inkLine = (1. - smoothstep(0., 0.03, depth)) * edge;
  #endif
  col *= 1. - inkLine * 0.55;
  if (uDebug > 0) { col = debugView(p, N, depth, foam, a); col *= a; }
#endif

  finish(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** The uniforms every water material shares by reference on one stage or cube. */
export function waterUniforms(field) {
  const vec4s = (n) => Array.from({ length: n }, () => new THREE.Vector4());
  return {
    uField: { value: field.texture }, uBox: { value: field.box }, uLevel: { value: 0.02 }, uTime: { value: 0 },
    uNormal: { value: rippleNormals() }, uFoamTex: { value: foamTexture() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color(1, 1, 1) }, uSunI: { value: 1 },
    uMoonDir: { value: new THREE.Vector3(0, 1, 0) }, uMoonI: { value: 0 },
    uSkyTop: { value: new THREE.Color(0x5d9ad8) }, uSkyHor: { value: new THREE.Color(0xd9e9f5) },
    uDeep: { value: new THREE.Color(0x1d4a5a) }, uShallow: { value: new THREE.Color(0x5c9a8e) },
    uClarity: { value: 2.1 }, uFlowRate: { value: 0.62 }, uRough: { value: 0.6 },
    uRip: { value: vec4s(16) }, uRipV: { value: vec4s(16) },
    uLights: { value: vec4s(8) }, uLightCol: { value: new THREE.Color(1, 0.62, 0.3) },
    uRain: { value: 0 }, uPaint: { value: 0 }, uFlowOn: { value: 1 }, uPhaseNoise: { value: 1 }, uFoamOn: { value: 1 }, uDepthOn: { value: 1 },
    uDebug: { value: 0 },
    uMirror: { value: null }, uMirrorMat: { value: new THREE.Matrix4() }, uMirrorOn: { value: 0 },
    uHeight: { value: null }, uHeightTexel: { value: new THREE.Vector2(1 / 256, 1 / 256) },
    uDay: { value: 1 }, uDusk: { value: 0 }, uGameEncode: { value: 0 }
  };
}

export function createWaterMaterial(style, U) {
  const uniforms = Object.assign(THREE.UniformsUtils.clone(THREE.UniformsLib.fog), U);
  const m = new THREE.ShaderMaterial({
    name: 'water-' + style,
    defines: { STYLE: STYLES[style] },
    uniforms, vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, premultipliedAlpha: true, depthWrite: false,
    fog: style !== 'game'
  });
  m.toneMapped = style !== 'game';
  return m;
}

/** Copy the light rig's palette into the water uniforms (call when the hour changes). */
export function syncSky(U, rig, hour) {
  U.uSunDir.value.copy(rig.sunDir);
  U.uSunCol.value.copy(rig.sun.color);
  U.uSunI.value = rig.sun.intensity;
  U.uSkyTop.value.copy(rig.palette.skyTop);
  U.uSkyHor.value.copy(rig.palette.horizon);
  U.uMoonDir.value.copy(rig.moon.position).normalize();
  U.uMoonI.value = rig.moon.intensity / 0.35;
  const night = THREE.MathUtils.clamp((-rig.sunDir.y + 0.02) * 6, 0, 1);
  U.uDay.value = 1 - night * 0.75;
  U.uDusk.value = THREE.MathUtils.clamp(1 - Math.abs(hour - 18) / 1.6, 0, 1) + THREE.MathUtils.clamp(1 - Math.abs(hour - 6.3) / 1.2, 0, 1) * 0.6;
}
