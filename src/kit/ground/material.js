// The one ground material (promoted from labs/ground/js/ground.js, lab 01): a
// MeshStandardMaterial patched with onBeforeCompile, so shadows, fog and every
// light stay three's own. Per pixel it blends eight layers by height (seven
// painted, one procedural stone layer), hex-tiles them, lets wear eat grass
// and moss down to compacted earth, wets it after Lagarde, fills puddles
// low-first with rain rings, lays snow, and keeps the sun's shadow term so the
// edge of the leaf shade glows warm (komorebi) and the shade goes cool.
//
// What changed for the game:
//   - no vertex displacement: the valley's heights are its walk heights, so
//     the field's relief only sets where puddles stand;
//   - the normal is perturbed around the mesh's own normal (the valley has
//     slopes; the lab's corner was flat);
//   - the meadow layer takes the classic ground's vertex tint (`tint`
//     attribute, luminance 0.5, as the classic map x vertex colour), so open
//     meadow reads as it always did;
//   - outside the field rectangle the weights fade to plain meadow;
//   - POM marches the nobedan too (a cheap height-only pavingH), and moss
//     under the paving fills the joints;
//   - cost: edge noise only where weights are in between, wet / puddles /
//     snow only when the weather asks (uniform branches), 3 macro noises;
//   - tiers: hero = everything; mid (quality medium) drops POM, puddles and
//     rain rings; far also drops to the 2-tap Quilez sampler;
//   - EDGE_ALPHA (standalone shoulder strip only) fades the strip's edges by
//     its `edge` attribute, the classic shoulder's alpha curve.
// Prints and rake grooves are not promoted (no mark buffers in the game).
import * as THREE from 'three';
import { COMMON, HEX, SAMPLER, PAVE, RIPPLES } from './glsl.js?v=20261113a';
import { LAYERS } from './layers.js?v=20261113a';

/** Shader switches per tier (guide §3.3; the card: far / quality medium drop POM and puddles). */
export const TIER_DEFINES = Object.freeze({
  hero: Object.freeze({ ANTI: 3, HBLEND: 1, POM: 1, WEAR: 1, WET: 1, PUDDLES: 1, SNOW: 1, MACRO: 1, FRINGE: 1 }),
  mid: Object.freeze({ ANTI: 3, HBLEND: 1, POM: 0, WEAR: 1, WET: 1, PUDDLES: 0, SNOW: 1, MACRO: 1, FRINGE: 1 }),
  far: Object.freeze({ ANTI: 2, HBLEND: 1, POM: 0, WEAR: 1, WET: 1, PUDDLES: 0, SNOW: 1, MACRO: 1, FRINGE: 0 })
});

const VERT_HEAD = /* glsl */`
#include <common>
attribute vec3 tint;
varying vec3 vW;
varying vec3 vWN;
varying vec3 vTint;
#if EDGE_ALPHA
attribute float edge;
varying float vEdge;
#endif`;
const VERT_WORLD = /* glsl */`
#include <worldpos_vertex>
vW = (modelMatrix * vec4(transformed, 1.)).xyz;
vWN = normalize(mat3(modelMatrix) * objectNormal);
vTint = tint;
#if EDGE_ALPHA
vEdge = edge;
#endif`;

const FRAG_HEAD = /* glsl */`
#include <common>
${COMMON}${HEX}${SAMPLER}${PAVE}${RIPPLES}
uniform sampler2D uA, uB, uF, uH;
uniform vec4 uRect;
uniform float uTile[7], uRoughL[7], uPorL[7], uRelief[7];
uniform float uBlend, uTime, uWet, uWetSpec, uWater, uRain, uSnow, uFringe, uCool, uPomH, uMacro;
uniform vec3 uSunDir, uSunCol, uShadowTint, uTint, uGrassTint, uMossTint;
varying vec3 vW;
varying vec3 vWN;
varying vec3 vTint;
#if EDGE_ALPHA
varying float vEdge;
#endif
vec3 gN = vec3(0., 1., 0.);
float gRough = 1., gAO = 1., gSun = 1., gSpark = 0.;
`;

const FRAG_SURFACE = /* glsl */`
{
  vec2 p = vW.xz;
  vec2 dpx = dFdx(p), dpy = dFdy(p);
  float pix = max(length(dpx), length(dpy));
  vec2 uv = (p - uRect.xy) * uRect.zw;
  vec4 A = texture(uA, uv), B = texture(uB, uv), F = texture(uF, uv);
  float rel = texture(uH, uv).r;
  // outside the field: plain meadow, untrodden, snow may lie
  vec2 ed = min(uv, 1. - uv) / uRect.zw;
  float inF = smoothstep(0., 2., min(ed.x, ed.y));
  A = mix(vec4(1., 0., 0., 0.), A, inF); B = mix(vec4(0.), B, inF);
  F = vec4(mix(vec3(0., 0., 1.), F.rgb, inF), F.a); rel *= inF;
  float G = F.r;
  int style = int(F.a * 8.);
#if ANTI == 3
  gHexP = p / uHexCell;
  gHex = hexGrid(gHexP, uHexRot);
#endif

  // weights: 0 earth, 1 meadow floor, 2 moss, 3 gravel, 4 sand, 5 tataki, 6 needles, 7 stone paving
  float w[8];
  w[1] = A.r + B.a; w[2] = A.g; w[3] = A.b; w[4] = A.a; w[5] = B.g; w[6] = B.b; w[7] = B.r;
  // the field is a coarse grid: break its bilinear edges with a little noise
  // (game: only where a weight or the wear is in between, so open meadow skips it)
  float frac = G * (1. - G);
  for (int i = 1; i < 8; i++) frac = max(frac, w[i] * (1. - w[i]));
  float en = .5;
  if (frac > .001) en = vn(p * 7.3) * .6 + vn(p * 21.) * .4;
  for (int i = 1; i < 8; i++) w[i] = sat(w[i] + (en - .5) * .5 * w[i] * (1. - w[i]) * 4.);
  float worn = 0.;
#if WEAR
  worn = sat(smoothstep(.28, .6, G) + (en - .5) * .3 * G * (1. - G) * 4.);
  w[1] *= 1. - worn; w[2] *= 1. - worn; w[6] *= 1. - worn * .85;
  w[3] *= 1. - smoothstep(.55, .98, G) * .6;   // gravel is kicked aside down the middle
#endif
  float sum = 0.;
  for (int i = 1; i < 8; i++) sum += w[i];
  w[0] = max(0., 1. - sum);

  // POM for the cut-stone pavings: march the view ray into the stone height
  vec2 pp = p;
#if POM
  if (w[7] > .25 && style <= 2 && uPomH > 0.) {        // game: nobedan marches too
    vec3 V = normalize(cameraPosition - vW);
    float fade = 1. - smoothstep(4., 9., length(cameraPosition - vW));
    if (fade > 0.) {
      vec2 dir = -V.xz / max(V.y, .25) * uPomH * fade;
      const int STEPS = 10;
      float layer = 1. / float(STEPS), cur = 0.;
      vec2 o = vec2(0.);
      float hh = 1. - pavingH(p, style), prev = hh, prevCur = 0.;
      for (int s = 0; s < STEPS; s++) {
        if (cur >= hh) break;
        prev = hh; prevCur = cur;
        cur += layer; o += dir * layer;
        hh = 1. - pavingH(p + o, style);
      }
      float a = hh - cur, b = prev - prevCur;
      float t = sat(a / (a - b + 1e-5));
      pp = p + o - dir * layer * t;
    }
  }
#endif

  vec3 lc[8]; vec2 ls[8]; float lh[8], lcav[8];
  for (int i = 0; i < 8; i++) { lc[i] = vec3(0.); ls[i] = vec2(0.); lh[i] = 0.; lcav[i] = .5; }
  for (int i = 0; i < 7; i++) {
    if (w[i] < .004) continue;
    vec4 a, n;
    float t = uTile[i];
    sampleLayerD(float(i), pp, t, dpx / t, dpy / t, a, n);
    lc[i] = a.rgb; lh[i] = a.a; lcav[i] = n.z;
    ls[i] = (n.xy - .5) * 2. * uRelief[i];
  }
  vec4 pc = vec4(0.);
  if (w[7] > .004) {
    float ph = paving(pp, style, pix, pc);
    vec3 jointC = mix(vec3(.30, .27, .22), lc[2] * .8, sat(w[2] * 2.5));   // game: moss grows in the joints
    lc[7] = mix(jointC, pc.rgb, pc.a);
    lh[7] = .08 + ph * .85;
    float e = .006, h0 = pavingH(pp, style);                    // game: forward differences, 3 taps not 4
    ls[7] = vec2(h0 - pavingH(pp + vec2(e, 0.), style), h0 - pavingH(pp + vec2(0., e), style)) * 2.8;
    lcav[7] = .35 + .3 * ph;
  }

  // the valley's own tint on the meadow floor: the classic ground's vertex
  // colour (luminance 0.5) times its map, exactly as the classic ground drew it
  lc[1] *= vTint * uGrassTint;
  lc[2] *= mix(vec3(1.), vTint * 2., .35) * uMossTint;
  // the season and the feet, layer by layer
  float trod = smoothstep(.1, .34, G) * (1. - worn);
  lc[1] = mix(lc[1], vec3(.62, .55, .34) * (.7 + .5 * lum(lc[1])), trod * .55);   // flattened, straw-pale stems
  lc[0] *= mix(1., .82, worn);                                                       // compacted earth darkens
  ls[0] *= mix(1., .45, worn);

  // height blend (Mishkinis): add each weight to its layer height, keep what
  // lies within uBlend of the top
  float b[8], bs = 0.;
#if HBLEND
  float ma = -9.;
  for (int i = 0; i < 8; i++) if (w[i] > .004) ma = max(ma, lh[i] * .55 + w[i]);
  ma -= uBlend;
  for (int i = 0; i < 8; i++) { b[i] = w[i] > .004 ? max(lh[i] * .55 + w[i] - ma, 0.) : 0.; bs += b[i]; }
#else
  for (int i = 0; i < 8; i++) { b[i] = w[i]; bs += b[i]; }
#endif
  bs = max(bs, 1e-4);
  vec3 col = vec3(0.); vec2 sl = vec2(0.); float hgt = 0., cav = 0., rough = 0., por = 0.;
  for (int i = 0; i < 8; i++) {
    float k = b[i] / bs;
    col += lc[i] * k; sl += ls[i] * k; hgt += lh[i] * k; cav += lcav[i] * k;
    rough += (i < 7 ? uRoughL[i] : .62) * k; por += (i < 7 ? uPorL[i] : .12) * k;
  }
  float bSand = b[4] / bs, bEarth = b[0] / bs, bStone = (b[7] + b[5] * .7) / bs, bMeadow = b[1] / bs;
  rough -= (bEarth * .18 + bStone * .25) * G;                                         // feet polish what they cross
  col *= 1. + bStone * G * .06;

#if MACRO
  float m1 = vn(p * .11) * .62 + vn(p * .23 + 7.) * .38, m2 = vn(p * .37 + 3.1);   // game: 3 noises, not 6
  col *= mix(1., mix(.86, 1.1, m1), uMacro);
  col = mix(col, col * vec3(1.07, .98, .88), (m2 - .5) * .7 * uMacro);              // warm-cool drift, big shapes first
#endif

  vec3 N = normalize(vWN + vec3(sl.x, 0., sl.y));

#if WET
  if (uWet > .001 || uWetSpec > .001 || F.g > .001) {        // game: dry ground skips the weather
  // first drops speckle dry ground before it darkens all over
  vec2 dc = floor(p * 38.);
  float drop = step(h12(dc), uWet * 1.8) * step(length(fract(p * 38.) - .5 - (h22(dc + 3.) - .5) * .4), .32 + .18 * h12(dc + 9.));
  float wet = max(uWet, F.g);
  wet = max(wet, drop * .85);
  float wetS = max(uWetSpec, F.g * .9);
  float dark = mix(1., mix(1., .22, por), wet);
  dark *= mix(1., .62, wet * bSand);                                                   // Shirakawa sand: the mica goes black when soaked
  col *= dark;
  rough *= mix(1., mix(.32, .66, por), wetS);
#if PUDDLES
  if (uWater > -.059) {
  // puddles: water stands on compacted, sealed ground, lowest first (never in the river channel)
  float imperm = sat(G * 1.1 * (bEarth + bMeadow) + bStone + b[5] / bs * .4 + (1. - por) * .25);
  float ground = vW.y + rel + (hgt - .5) * .018;
  float depth = (uWater - ground) * imperm * step(-.05, vW.y);
  float pud = smoothstep(0., .005, depth);
  col *= mix(1., .58, pud);
  col = mix(col, col * vec3(.92, .86, .74), pud * bEarth);                             // a little silt in the water
  rough = mix(rough, .035, pud);
  N = normalize(mix(N, vWN, smoothstep(0., .01, depth)));
  if (uRain > .01) {
    vec2 rr = rainRings(p * 6., uTime) * uRain * pud;
    N = normalize(N + vec3(rr.x, 0., rr.y) * .9);
  }
  cav = mix(cav, .5, pud);
  }
#endif
  }
#endif

#if SNOW
  if (uSnow > .001) {
  float sn = uSnow * F.b;
  float sc = smoothstep(.32, .62, sn * 1.25 + (hgt - .5) * .55 + (vn(p * 6.7) - .5) * .32 - bEarth * .1 * (1. - sn));
  col = mix(col, vec3(.92, .94, .97), sc);
  rough = mix(rough, .7, sc);
  N = normalize(mix(N, normalize(vWN + vec3((vn(p * 3.1) - .5) * .12, 0., (vn(p * 3.1 + 7.) - .5) * .12)), sc * .85));
  vec2 sk = floor(p * 520.);
  gSpark = sc * step(.9965, h12(sk + floor(uTime * .5))) * 3.;
  }
#endif

  col *= uTint;
  gAO = mix(1., sat(.42 + cav * 1.15), .85);
  gRough = clamp(rough, .03, 1.);
  gN = N;
  diffuseColor.rgb = col;
#if EDGE_ALPHA
  diffuseColor.a *= smoothstep(0., .42, vEdge) * smoothstep(1., .58, vEdge) * .9;
#endif
}`;

// the sun's shadow term, captured for the fringe and the cool shade
const SHADOW_SRC = 'directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;';
const SHADOW_DST = 'float gShI = ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;\n\t\tif ( UNROLLED_LOOP_INDEX == 0 ) gSun = gShI;\n\t\tdirectLight.color *= gShI;';
const LIGHTS_BEGIN = THREE.ShaderChunk.lights_fragment_begin.replace(SHADOW_SRC, SHADOW_DST);

const FRAG_FINISH = /* glsl */`
#if FRINGE
{
  float sunUp = sat(uSunDir.y * 3.);
  float fr = gSun * (1. - gSun) * 4.;
  outgoingLight += diffuseColor.rgb * uSunCol * fr * uFringe * sunUp * vec3(1., .58, .22) * .55;
  outgoingLight *= mix(vec3(1.), uShadowTint, (1. - gSun) * sunUp * uCool);
}
#endif
outgoingLight += gSpark * uSunCol * gSun;
#include <opaque_fragment>`;

const key = (D) => 'kit-ground-' + Object.keys(D).sort().map((k) => k + D[k]).join('');

/**
 * The ground material over one GroundField. `tier` picks the switches;
 * `opts`: hexCell, blend, macro, fringe (uniforms), edgeAlpha (the strip
 * fade), name (the material's name: the contract test hashes materials by
 * name, so callers put their visual params in it).
 */
export function createGroundMaterial(field, layers, { tier = 'hero', hexCell = 1.25, blend = 0.2, macro = 1, fringe = 1, edgeAlpha = false, name = 'kit-ground' } = {}) {
  const D = { ...(TIER_DEFINES[tier] || TIER_DEFINES.mid), EDGE_ALPHA: edgeAlpha ? 1 : 0 };
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, transparent: !!edgeAlpha, depthWrite: !edgeAlpha });
  mat.name = name;
  const U = {
    uA: { value: field.texA }, uB: { value: field.texB }, uF: { value: field.texF }, uH: { value: field.texH },
    uRect: { value: field.rect },
    uAlb: { value: layers.alb }, uNor: { value: layers.nor },
    uHexCell: { value: hexCell }, uHexRot: { value: 0.75 },
    uTile: { value: LAYERS.map((l) => l.tile) }, uRoughL: { value: LAYERS.map((l) => l.rough) },
    uPorL: { value: LAYERS.map((l) => l.porosity) }, uRelief: { value: LAYERS.map((l) => l.relief * 0.55) },
    uBlend: { value: blend }, uMacro: { value: macro }, uTime: { value: 0 }, uWet: { value: 0 }, uWetSpec: { value: 0 }, uWater: { value: -0.3 },
    uRain: { value: 0 }, uSnow: { value: 0 }, uFringe: { value: fringe }, uCool: { value: 0.55 }, uPomH: { value: 0.016 },
    uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3) }, uSunCol: { value: new THREE.Color(0xfff0d6) },
    uShadowTint: { value: new THREE.Color(0.8, 0.88, 1.16) }, uTint: { value: new THREE.Color(1, 1, 1) },
    uGrassTint: { value: new THREE.Color(1, 1, 1) }, uMossTint: { value: new THREE.Color(1, 1, 1) }
  };
  mat.userData.u = U;
  mat.userData.defines = D;
  mat.defines = Object.fromEntries(Object.entries(D).map(([k, v]) => [k, String(v)]));
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', VERT_HEAD)
      .replace('#include <worldpos_vertex>', VERT_WORLD);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', FRAG_HEAD)
      .replace('#include <map_fragment>', FRAG_SURFACE)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = gRough;')
      .replace('#include <normal_fragment_maps>', 'normal = normalize((viewMatrix * vec4(gN, 0.)).xyz);')
      .replace('#include <lights_fragment_begin>', LIGHTS_BEGIN)
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= gAO;\nreflectedLight.indirectSpecular *= mix(1., gAO, .7);\nreflectedLight.directDiffuse *= mix(1., gAO, .35);')
      .replace('#include <opaque_fragment>', FRAG_FINISH);
  };
  mat.customProgramCacheKey = () => key(D);
  return mat;
}

/** Re-tier a live ground material (three recompiles once per new set, then caches it). */
export function setGroundTier(mat, tier) {
  const D = { ...(TIER_DEFINES[tier] || TIER_DEFINES.mid), EDGE_ALPHA: mat.userData.defines.EDGE_ALPHA };
  mat.userData.defines = D;
  mat.defines = Object.fromEntries(Object.entries(D).map(([k, v]) => [k, String(v)]));
  mat.customProgramCacheKey = () => key(D);
  mat.needsUpdate = true;
}

// The sun path of Sky.updateDayNight() (daylight 6:00-19:12), as in
// materials.js nightnessAt(): sunDir = normalize(cos a, sin a, 0.5).
const _sun = new THREE.Vector3();
export function sunDirAt(hour, out = _sun) {
  const h = ((hour % 24) + 24) % 24;
  const dayStart = 6.0, dayEnd = 19.2;
  let angle;
  if (h >= dayStart && h <= dayEnd) angle = ((h - dayStart) / (dayEnd - dayStart)) * Math.PI;
  else {
    const nightT = h < dayStart ? h + 24 - dayEnd : h - dayEnd;
    angle = Math.PI + (nightT / (24 - (dayEnd - dayStart))) * Math.PI;
  }
  return out.set(Math.cos(angle), Math.sin(angle), 0.5).normalize();
}

/**
 * The lab's weather schedule (labs/ground/js/weather.js) driven by the
 * game's env: wet (diffuse darkening) and wetSpec (the film, dries ~2x
 * faster), a water level that rises in rain and drains in sun, snow cover.
 * `rain` and `snowFall` are the sky's weather amounts (env.wet, env.snow);
 * `mist` (env.mist, when the weather lane sends it) leaves a dew film.
 */
export class GroundWeather {
  // the puddle level (metres, the valley floor at 0): the paving joints fill
  // near the top, the shoulder ruts well before it; stone tops stay dry
  static LOW = -0.06;
  static HIGH = -0.014;
  constructor() { this.rain = 0; this.wet = 0; this.wetSpec = 0; this.water = -0.3; this.snow = 0; this.started = false; }
  update(dt, { rain = 0, snowFall = 0, mist = 0, sun = 1 } = {}) {
    const d = Math.min(dt, 0.25);
    if (!this.started) {
      // game: a valley entered in the rain (or the snow) is already wet (or white)
      this.started = true;
      this.rain = rain;
      if (rain > 0.02) { this.wet = this.wetSpec = Math.min(1, rain * 1.2); this.water = GroundWeather.LOW + (GroundWeather.HIGH - GroundWeather.LOW) * rain; }
      this.snow = snowFall > 0.05 ? snowFall : 0;
    }
    this.rain += (rain - this.rain) * Math.min(1, d * 0.6);
    if (this.rain > 0.02) {
      this.wet = Math.min(1, this.wet + d * this.rain / 9);
      this.wetSpec = Math.min(1, this.wetSpec + d * this.rain / 5);
      this.water = Math.min(GroundWeather.HIGH, this.water + d * this.rain * 0.0045);
    } else {
      const k = (0.55 + sun * 0.9) / 90;
      this.wetSpec = Math.max(0, this.wetSpec - d * k * 1.9);
      this.wet = Math.max(0, this.wet - d * k * (0.4 + this.wet * 0.8));
      this.water = Math.max(-0.3, this.water - d * (0.0004 + 0.0011 * sun));
    }
    if (mist > 0) { this.wetSpec = Math.max(this.wetSpec, mist * 0.35); this.wet = Math.max(this.wet, mist * 0.18); }
    if (snowFall > 0.05) this.snow = Math.min(1, this.snow + d * snowFall / 35);
    else this.snow = Math.max(0, this.snow - d * (0.004 + 0.02 * sun) * (this.rain > 0.1 ? 4 : 1));
  }
  apply(U) {
    U.uWet.value = this.wet; U.uWetSpec.value = this.wetSpec; U.uWater.value = Math.max(this.water, -0.3);
    U.uRain.value = this.rain; U.uSnow.value = this.snow;
  }
}
