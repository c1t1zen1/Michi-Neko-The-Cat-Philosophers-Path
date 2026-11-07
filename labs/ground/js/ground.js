// The ground material: a MeshStandardMaterial patched with onBeforeCompile, so
// shadows, fog and every light stay three's own. Per pixel it blends eight
// layers by height (seven painted, one procedural stone layer), lets wear eat
// grass and moss down to compacted earth, presses paw prints and rake or
// broom grooves into it, wets it after Lagarde, fills puddles low-first, lays
// snow, and keeps the sun's shadow term so the edge of the leaf shade can glow
// warm (komorebi) and the shade itself can go cool, the way a background
// painter would.
import * as THREE from 'three';
import { COMMON, HEX, SAMPLER, PAVE, RIPPLES, GROOVE } from './glsl.js';
import { LAYERS } from './paint.js';

// every switch the Lab can flip, and what the stage uses
export const FULL = { ANTI: 3, HBLEND: 1, POM: 1, WEAR: 1, WET: 1, SNOW: 1, PRINTS: 1, GROOVES: 1, MACRO: 1, FRINGE: 1, TOON: 0, EDGEINK: 0, DITHER: 0, DEBUG: 0 };

let blankTex = null;
export function blank() {
  if (!blankTex) {
    blankTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
    blankTex.needsUpdate = true;
  }
  return blankTex;
}

const VERT_HEAD = /* glsl */`
#include <common>
uniform sampler2D uH, uF, uA, uB;
uniform vec4 uRect;
uniform float uTexel;
varying vec3 vW;
float groundH(vec2 xz) {
  vec2 uv = (xz - uRect.xy) * uRect.zw;
  vec4 A = texture(uA, uv), B = texture(uB, uv), F = texture(uF, uv);
  float sum = A.r + A.g + A.b + A.a + B.r + B.g + B.b + B.a;
  float soft = max(0., 1. - sum) + A.r + A.g + A.b * .8 + A.a * .9 + B.r * .12 + B.g * .2 + B.b + B.a;
  return texture(uH, uv).r - .045 * smoothstep(.45, 1., F.r) * min(1., soft * 1.2);
}`;
const VERT_NORMAL = /* glsl */`
float gE = uTexel;
float gL = groundH(position.xz - vec2(gE, 0.)), gR = groundH(position.xz + vec2(gE, 0.));
float gD = groundH(position.xz - vec2(0., gE)), gU = groundH(position.xz + vec2(0., gE));
vec3 objectNormal = normalize(vec3(gL - gR, 2. * gE, gD - gU));
#ifdef USE_TANGENT
vec3 objectTangent = vec3(1., 0., 0.);
#endif`;
const VERT_BEGIN = /* glsl */`
vec3 transformed = vec3(position);
transformed.y += groundH(position.xz);
vW = (modelMatrix * vec4(transformed, 1.)).xyz;`;

const FRAG_HEAD = /* glsl */`
#include <common>
${COMMON}${HEX}${SAMPLER}${PAVE}${RIPPLES}${GROOVE}
uniform sampler2D uA, uB, uF, uPrint;
uniform vec4 uRect, uPrintRect, uGrooveRect, uEave;
uniform float uTile[7], uRoughL[7], uPorL[7], uRelief[7];
uniform float uBlend, uTime, uWet, uWetSpec, uWater, uRain, uSnow, uFringe, uCool, uPomH, uDebug;
uniform vec3 uSunDir, uSunCol, uShadowTint, uTint, uGrassTint, uMossTint;
varying vec3 vW;
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
  float G = F.r;
  int style = int(F.a * 8.);
#if ANTI == 3
  gHexP = p / uHexCell;
  gHex = hexGrid(gHexP, uHexRot);
#endif

  // weights: 0 earth, 1 meadow floor, 2 moss, 3 gravel, 4 sand, 5 tataki, 6 needles, 7 stone paving
  float w[8];
  w[1] = A.r + B.a; w[2] = A.g; w[3] = A.b; w[4] = A.a; w[5] = B.g; w[6] = B.b; w[7] = B.r;
  // the field is a 6 cm grid: break its bilinear edges with a little noise
  float en = vn(p * 7.3) * .6 + vn(p * 21.) * .4;
  for (int i = 1; i < 8; i++) w[i] = sat(w[i] + (en - .5) * .5 * w[i] * (1. - w[i]) * 4.);
#if DITHER
  // a stylised threshold: each layer is in or out against its own noise (no blend at all)
  for (int i = 1; i < 8; i++) { float th = vn(p * 11. + float(i) * 7.1) * .7 + .15; w[i] = smoothstep(th - .015, th + .015, w[i]); }
#endif
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
  if (w[7] > .25 && style <= 1 && uPomH > 0.) {
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
    vec3 jointC = vec3(.30, .27, .22);
    lc[7] = mix(jointC, pc.rgb, pc.a);
    lh[7] = .08 + ph * .85;
    float e = .006;
    ls[7] = vec2(pavingH(pp - vec2(e, 0.), style) - pavingH(pp + vec2(e, 0.), style), pavingH(pp - vec2(0., e), style) - pavingH(pp + vec2(0., e), style)) * 1.4;
    lcav[7] = .35 + .3 * ph;
  }

  // the season and the feet, layer by layer
  float trod = smoothstep(.1, .34, G) * (1. - worn);
  lc[1] *= uGrassTint;
  lc[1] = mix(lc[1], vec3(.62, .55, .34) * (.7 + .5 * lum(lc[1])), trod * .55);   // flattened, straw-pale stems
  lc[2] *= uMossTint;
  lc[0] *= mix(1., .82, worn);                                                       // compacted earth darkens
  ls[0] *= mix(1., .45, worn);

  // height blend (Mishkinis): add each weight to its layer height, keep what
  // lies within uBlend of the top; uBlend 0 = linear (the classic splat)
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
#if EDGEINK
  float mx = 0.; for (int i = 0; i < 8; i++) mx = max(mx, b[i] / bs);
  col *= 1. - .35 * smoothstep(.3, .62, 1. - mx);                                     // pigment pools where layers meet
#endif

  // the soft materials: how much grooves and prints show
  float soft = sat(bEarth + bSand + b[3] / bs * .7 + bMeadow * .5 + b[2] / bs * .6 + b[6] / bs * .5);
  vec4 P = vec4(0.);
#if PRINTS
  vec2 puv = (p - uPrintRect.xy) * uPrintRect.zw;
  P = texture(uPrint, puv);
  {
    float e = 1. / 96.;
    float pl = texture(uPrint, puv - vec2(e * uPrintRect.z, 0.)).r, pr = texture(uPrint, puv + vec2(e * uPrintRect.z, 0.)).r;
    float pd = texture(uPrint, puv - vec2(0., e * uPrintRect.w)).r, pu = texture(uPrint, puv + vec2(0., e * uPrintRect.w)).r;
    sl += vec2(pr - pl, pu - pd) * 1.6 * soft;
    hgt -= P.r * .5 * soft;
    col *= 1. - P.r * soft * .14;
  }
#endif
#if GROOVES
  {
    vec2 gs;
    float gh = grooveAt((p - uGrooveRect.xy) * uGrooveRect.zw, p, gs);
    float amt = (bSand + b[3] / bs * .5 + bEarth * .45 + bMeadow * .1) * (1. - sat(P.r * 4.));
    hgt += gh * amt * .6;
    sl -= gs * amt * .012;
    col *= 1. + gh * amt * .16;
  }
#endif

#if MACRO
  float m1 = fbm3(p * .11), m2 = fbm3(p * .37 + 3.1);
  col *= mix(.86, 1.1, m1);
  col = mix(col, col * vec3(1.07, .98, .88), (m2 - .5) * .7);                        // warm–cool drift, big shapes first
#endif

  vec3 N = normalize(vec3(sl.x, 1., sl.y));
  float exposed = 1., drip = 0.;
  if (uEave.w > .5 && p.x > uEave.x && p.x < uEave.y) {
    exposed = smoothstep(uEave.z - .05, uEave.z + .06, p.y);
    drip = exp(-pow((p.y - uEave.z - .03) / .09, 2.));
  }

#if WET
  // first drops speckle dry ground before it darkens all over
  vec2 dc = floor(p * 38.);
  float drop = step(h12(dc), uWet * 1.8) * step(length(fract(p * 38.) - .5 - (h22(dc + 3.) - .5) * .4), .32 + .18 * h12(dc + 9.));
  float wet = max(max(uWet * exposed, F.g), max(P.g, drip * uRain * 1.5));
  wet = max(wet, drop * exposed * .85);
  float wetS = max(max(uWetSpec * exposed, F.g * .9), max(P.g * .8, drip * uRain));
  float dark = mix(1., mix(1., .22, por), wet);
  dark *= mix(1., .62, wet * bSand);                                                   // Shirakawa sand: the mica goes black when soaked
  col *= dark;
  rough *= mix(1., mix(.32, .66, por), wetS);
  // puddles: water stands on compacted, sealed ground, lowest first
  float imperm = sat(G * 1.1 * (bEarth + bMeadow) + bStone + b[5] / bs * .4 + (1. - por) * .25);
  float ground = vW.y + (hgt - .5) * .018;
  float depth = (uWater - ground) * imperm * exposed;
  float pud = smoothstep(0., .005, depth);
  col *= mix(1., .58, pud);
  col = mix(col, col * vec3(.92, .86, .74), pud * bEarth);                             // a little silt in the water
  rough = mix(rough, .035, pud);
  N = normalize(mix(N, vec3(0., 1., 0.), smoothstep(0., .01, depth)));
  if (uRain > .01) {
    vec2 rr = rainRings(p * 6., uTime) * uRain * (pud + drip * .6);
    N = normalize(N + vec3(rr.x, 0., rr.y) * .9);
  }
  cav = mix(cav, .5, pud);
#endif

#if SNOW
  float sn = uSnow * F.b * (1. - sat(P.r * 3.)) * exposed;
  float sc = smoothstep(.32, .62, sn * 1.25 + (hgt - .5) * .55 + (vn(p * 6.7) - .5) * .32 - bEarth * .1 * (1. - sn));
  col = mix(col, vec3(.92, .94, .97), sc);
  rough = mix(rough, .7, sc);
  N = normalize(mix(N, normalize(vec3((vn(p * 3.1) - .5) * .12, 1., (vn(p * 3.1 + 7.) - .5) * .12)), sc * .85));
  vec2 sk = floor(p * 520.);
  gSpark = sc * step(.9965, h12(sk + floor(uTime * .5))) * 3.;
#endif

  col *= uTint;
  gAO = mix(1., sat(.42 + cav * 1.15), .85);
  gRough = clamp(rough, .03, 1.);
  gN = N;
#if DEBUG == 1
  col = mix(vec3(.12, .2, .1), vec3(1., .55, .12), G) + vec3(F.g * .3, F.g * .4, F.g);
#elif DEBUG == 2
  vec3 pal[8] = vec3[8](vec3(.7,.5,.3), vec3(.3,.7,.2), vec3(.1,.4,.1), vec3(.6,.6,.6), vec3(.95,.95,.9), vec3(.7,.3,.2), vec3(.5,.35,.15), vec3(.3,.35,.5));
  col = vec3(0.); for (int i = 0; i < 8; i++) col += pal[i] * b[i] / bs;
#elif DEBUG == 3
  vec2 tg = abs(fract(p / uTile[0]) - .5);
  col = mix(col, vec3(1., .2, .1), step(.49, max(tg.x, tg.y)));
#endif
  diffuseColor.rgb = col;
}`;

// the sun's shadow term, captured for the fringe and the cool shade
const SHADOW_SRC = 'directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;';
const SHADOW_DST = 'float gShI = ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;\n\t\tif ( UNROLLED_LOOP_INDEX == 0 ) gSun = gShI;\n\t\tdirectLight.color *= gShI;';
export const LIGHTS_BEGIN = THREE.ShaderChunk.lights_fragment_begin.replace(SHADOW_SRC, SHADOW_DST);
export const LIGHTS_OK = LIGHTS_BEGIN !== THREE.ShaderChunk.lights_fragment_begin;

const FRAG_FINISH = /* glsl */`
#if FRINGE
{
  float sunUp = sat(uSunDir.y * 3.);
  float fr = gSun * (1. - gSun) * 4.;
  outgoingLight += diffuseColor.rgb * uSunCol * fr * uFringe * sunUp * vec3(1., .58, .22) * .55;
  outgoingLight *= mix(vec3(1.), uShadowTint, (1. - gSun) * sunUp * uCool);
}
#endif
#if TOON
{
  float L0 = lum(outgoingLight) / max(lum(diffuseColor.rgb), .03);
  float q = floor(L0 * 3.2 + .5) / 3.2;
  outgoingLight *= mix(1., q / max(L0, .03), .85);
}
#endif
outgoingLight += gSpark * uSunCol * gSun;
#include <opaque_fragment>`;

/**
 * field: GroundField; layers: { alb, nor } from paintLayers(); marks: { print, groove } buffers (optional)
 */
export function createGroundMaterial(field, layers, { defines = {}, marks = null, eave = null } = {}) {
  const D = Object.assign({}, FULL, defines);
  // half the sky's light as IBL: the hemisphere light already carries the rest
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, envMapIntensity: 0.5 });
  const U = {
    uA: { value: field.texA }, uB: { value: field.texB }, uF: { value: field.texF }, uH: { value: field.texH },
    uRect: { value: field.rect }, uTexel: { value: 1 / field.k },
    uAlb: { value: layers.alb }, uNor: { value: layers.nor },
    uHexCell: { value: 1.25 }, uHexRot: { value: 0.75 },
    uTile: { value: LAYERS.map((l) => l.tile) }, uRoughL: { value: LAYERS.map((l) => l.rough) },
    uPorL: { value: LAYERS.map((l) => l.porosity) }, uRelief: { value: LAYERS.map((l) => l.relief * 0.55) },
    uBlend: { value: 0.2 }, uTime: { value: 0 }, uWet: { value: 0 }, uWetSpec: { value: 0 }, uWater: { value: -1 },
    uRain: { value: 0 }, uSnow: { value: 0 }, uFringe: { value: 1 }, uCool: { value: 0.55 }, uPomH: { value: 0.016 }, uDebug: { value: 0 },
    uPrint: { value: marks?.print?.texture || blank() }, uPrintRect: { value: marks?.print?.rect || field.rect },
    uGroove: { value: marks?.groove?.texture || blank() }, uGrooveRect: { value: marks?.groove?.rect || field.rect },
    uEave: { value: eave || new THREE.Vector4(0, 0, 0, 0) },
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
      .replace('#include <beginnormal_vertex>', VERT_NORMAL)
      .replace('#include <begin_vertex>', VERT_BEGIN);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', FRAG_HEAD)
      .replace('#include <map_fragment>', FRAG_SURFACE)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = gRough;')
      .replace('#include <normal_fragment_maps>', 'normal = normalize((viewMatrix * vec4(gN, 0.)).xyz);')
      .replace('#include <lights_fragment_begin>', LIGHTS_BEGIN)
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= gAO;\nreflectedLight.indirectSpecular *= mix(1., gAO, .7);\nreflectedLight.directDiffuse *= mix(1., gAO, .35);')
      .replace('#include <opaque_fragment>', FRAG_FINISH);
  };
  mat.customProgramCacheKey = () => 'ground-' + JSON.stringify(D);
  return mat;
}

/** Change the compiled feature set (three recompiles once per new set, then caches it). */
export function setDefines(mat, defines) {
  const D = Object.assign({}, mat.userData.defines, defines);
  mat.userData.defines = D;
  mat.defines = Object.fromEntries(Object.entries(D).map(([k, v]) => [k, String(v)]));
  mat.customProgramCacheKey = () => 'ground-' + JSON.stringify(D);
  mat.needsUpdate = true;
}

/** A plane over the field rect, one segment per texel (capped). */
export function groundMesh(field, mat, maxSeg = 256) {
  const sx = Math.min(maxSeg, field.nx), sz = Math.min(Math.round(maxSeg * field.d / field.w), field.nz);
  const g = new THREE.PlaneGeometry(field.w, field.d, sx, sz);
  g.rotateX(-Math.PI / 2);
  g.translate(field.x0 + field.w / 2, 0, field.z0 + field.d / 2);
  const m = new THREE.Mesh(g, mat);
  m.receiveShadow = true;
  m.frustumCulled = false;
  m.name = 'Ground';
  return m;
}
