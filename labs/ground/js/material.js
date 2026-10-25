// The ground material: a MeshStandardMaterial patched with onBeforeCompile, so
// shadows, fog and lights come for free. Five layers (three painted, two
// evaluated in world space), anti-tiling, height blend, wetness, puddles with
// rain rings, paw prints, rake ridges and the real-stone dither.
import * as THREE from 'three';
import { HASH, NOISE } from '../../shared/glsl.js';
import { GLSL_HASH, COB } from './hash.js';

export const BAYER = /* glsl */`
float bayer4(vec2 p) {
  int x = int(mod(p.x, 4.)), y = int(mod(p.y, 4.));
  float b[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
  return (b[y * 4 + x] + .5) / 16.;
}`;

const VERT_COMMON = /* glsl */`
#include <common>
uniform sampler2D uHeight; uniform float uSize, uHres;
varying vec3 vGW; varying vec3 vGN;`;
const VERT_NORMAL = /* glsl */`
vec2 gUv = position.xz / uSize + 0.5;
float gE = 1.0 / uHres;
float hxp = texture2D(uHeight, gUv + vec2(gE, 0.)).r, hxm = texture2D(uHeight, gUv - vec2(gE, 0.)).r;
float hzp = texture2D(uHeight, gUv + vec2(0., gE)).r, hzm = texture2D(uHeight, gUv - vec2(0., gE)).r;
vec3 objectNormal = normalize(vec3(-(hxp - hxm) / (2. * gE * uSize), 1., -(hzp - hzm) / (2. * gE * uSize)));`;
const VERT_BEGIN = /* glsl */`
vec3 transformed = vec3(position);
transformed.y += texture2D(uHeight, gUv).r;
vGW = transformed; vGN = objectNormal;`;

const FRAG_COMMON = /* glsl */`
#include <common>
${HASH}${NOISE}${GLSL_HASH}${BAYER}
uniform sampler2D uSplat, uRake, uPrints, uGameTex;
uniform sampler2DArray uAlb, uNor;
uniform float uSize, uPrintRes, uPrintsOn, uBlendDepth, uAntiTile, uGrid, uMode, uWet, uWater, uRain, uTime, uCobble;
uniform vec3 uTile, uTint, uSkyTop, uHorizon, uSunDir, uSunCol;
uniform vec4 uRipples[16], uStone;
varying vec3 vGW; varying vec3 vGN;
const vec3 JOINT = vec3(.17, .145, .115);
const float REL = .012;
const float COBJ = ${COB.jitter.toFixed(3)}, COBJOINT = ${COB.joint.toFixed(3)}, COBROUND = ${COB.round.toFixed(3)};

float settH(vec2 p, bool fill, float pix, out vec3 col) {
  float row = floor(p.y / S_H), off = mod(row, 2.) * S_W * .5;
  float xs = p.x + off, ci = floor(xs / S_W);
  vec2 q = vec2(xs - (ci + .5) * S_W, p.y - (row + .5) * S_H);
  ivec2 id = ivec2(int(ci), int(row));
  vec2 b = vec2(S_W * .5 - S_J * .5, S_H * .5 - S_J * .5) - S_R, dq = abs(q) - b;
  float d = length(max(dq, 0.)) + min(max(dq.x, dq.y), 0.) - S_R, aa = .0015 + pix * .5;
  float mask = fill ? 0. : 1. - smoothstep(-aa, aa, d);
  float dome = .8 + .2 * clamp(-d / .05, 0., 1.), hs = .55 + .4 * hash2i(id).x;
  vec3 sc = settCol(id) * mix(.8, 1.06, smoothstep(0., .03, -d));
  col = mix(JOINT, sc, mask);
  float far = smoothstep(.02, .07, pix);
  col = mix(col, vec3(.22, .21, .19), far);
  return mix(mask * hs * dome, .5, far);
}
float cobH(vec2 p, bool fill, float pix, out vec3 col) {
  vec2 q = p / uCobble, f = fract(q); ivec2 n = ivec2(floor(q)), idn = n;
  float f1 = 8., f2 = 8.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    ivec2 g = ivec2(i, j); vec2 h = hash2i(n + g);
    float d = length(vec2(g) + .5 + (h - .5) * COBJ - f);
    if (d < f1) { f2 = f1; f1 = d; idn = n + g; } else if (d < f2) f2 = d;
  }
  float aa = .02 + pix / uCobble;
  float mask = fill ? 0. : smoothstep(COBJOINT * .8, COBJOINT * 1.2 + aa, f2 - f1);
  float dome = max(1. - pow(max(f1 / .55, 0.), COBROUND), 0.) * (.7 + .3 * hash2i(idn + ivec2(5, 11)).x);
  col = mix(JOINT, cobCol(idn) * (.75 + .35 * dome), mask);
  float far = smoothstep(.015, .06, pix / uCobble * .1 + pix);
  col = mix(col, vec3(.2, .19, .18), far);
  return mix(mask * dome, .45, far);
}
void texLayer(float layer, vec2 uv, vec2 dx, vec2 dy, out vec4 alb, out vec2 sl) {
  if (uAntiTile < .5) {
    alb = textureGrad(uAlb, vec3(uv, layer), dx, dy);
    vec3 n = textureGrad(uNor, vec3(uv, layer), dx, dy).xyz * 2. - 1.;
    sl = n.xy / max(n.z, .3);
    return;
  }
  // Quilez, texture repetition, technique 3 (k: slow noise index, 2 taps)
  float k = vnoise2(0.37 * uv); float l = k * 8.0; float f = fract(l);
  vec2 offa = sin(vec2(3.0, 7.0) * floor(l)), offb = sin(vec2(3.0, 7.0) * (floor(l) + 1.0));
  vec4 a = textureGrad(uAlb, vec3(uv + offa, layer), dx, dy), b = textureGrad(uAlb, vec3(uv + offb, layer), dx, dy);
  float t = smoothstep(0.2, 0.8, f - 0.1 * dot(a.rgb - b.rgb, vec3(1.0)));
  alb = mix(a, b, t);
  vec3 na = textureGrad(uNor, vec3(uv + offa, layer), dx, dy).xyz * 2. - 1., nb = textureGrad(uNor, vec3(uv + offb, layer), dx, dy).xyz * 2. - 1.;
  sl = mix(na.xy / max(na.z, .3), nb.xy / max(nb.z, .3), t);
}
vec2 ringSlope(vec2 dv, float age, float amp) {
  float d = length(dv), rad = .35 * age;
  float env = exp(-pow((d - rad) / .05, 2.)) * exp(-age * 2.2) * amp;
  return dv / max(d, 1e-3) * cos(40. * (d - rad)) * env * .5;
}
vec2 ripples(vec2 P) {
  vec2 s = vec2(0.);
  for (int i = 0; i < 16; i++) {
    vec4 r = uRipples[i]; float age = uTime - r.z;
    if (r.w > 0. && age > 0. && age < 2.5) s += ringSlope(P - r.xy, age, r.w);
  }
  if (uRain > .01) {
    ivec2 n = ivec2(floor(P / .25));
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      ivec2 id = n + ivec2(i, j); vec2 h = hash2i(id);
      float period = 1.1 + h.x, tt = uTime / period + h.y, cyc = floor(tt), age = fract(tt) * period;
      if (age > .9) continue;
      vec2 h2 = hash2i(id + ivec2(int(cyc) * 31 + 7, int(cyc) * 17 + 3));
      if (h2.x > uRain) continue;
      s += ringSlope(P - (vec2(id) + .2 + .6 * h2.yx) * .25, age, 1.);
    }
  }
  return s;
}`;

const FRAG_MAP = /* glsl */`
vec3 gEmis = vec3(0.); vec3 gN = normalize(vGN); float gRough = .95;
{
  vec2 P = vGW.xz, dPx = dFdx(P), dPy = dFdy(P);
  float pix = .5 * (length(dPx) + length(dPy));
  vec2 suv = P / uSize + .5;
  vec4 sp = texture2D(uSplat, suv), rk = texture2D(uRake, suv);
  if (uMode > .5 && uMode < 1.5) {
    float n1 = vnoise2(P * .09), n2 = vnoise2(P * .17 + 7.), n3 = vnoise2(P * .05 + 3.);
    vec3 c = mix(mix(vec3(.2, .33, .07), vec3(.46, .42, .13), n1 * .7), vec3(.09, .2, .05), n2 * .45);
    if (n3 > .58) c = mix(c, vec3(.05, .09, .03), (n3 - .58) / .42 * .7);
    diffuseColor.rgb = c * texture2D(uGameTex, P / 3.2).rgb * 2.6;
    gRough = .96;
  } else {
    float sum = sp.x + sp.y + sp.z + sp.w;
    float wt[5] = float[5](max(1. - sum, 0.), sp.x, sp.y, sp.z, sp.w);
    if (uMode > 1.5) wt = float[5](1., 0., 0., 0., 0.);
    bool fill = bayer4(gl_FragCoord.xy) < 1. - smoothstep(uStone.z - uStone.w, uStone.z, length(P - uStone.xy));
    const float RB[5] = float[5](.95, .85, .97, .8, .75);
    const float PO[5] = float[5](.85, .55, .95, .3, .35);
    float vh[5], hh[5]; vec3 cc[5]; vec2 ss[5]; float ma = -1e3;
    for (int i = 0; i < 5; i++) {
      vh[i] = -1e3; hh[i] = 0.; cc[i] = vec3(0.); ss[i] = vec2(0.);
      if (wt[i] > .002) {
        float h = 0.; vec3 col = vec3(0.); vec2 sl = vec2(0.);
        if (i < 3) {
          float tl = uTile[i]; vec4 a;
          texLayer(float(i), P / tl, dPx / tl, dPy / tl, a, sl);
          col = a.rgb * (i == 0 ? uTint : vec3(1.)); h = a.a; sl *= .6;
          if (i == 1 && rk.g > .004 && uMode < 1.5) {
            float th = rk.a * 3.14159265; vec2 nn = vec2(cos(th), sin(th));
            float ph = dot(P, nn) / .063 + rk.r, str = rk.g * (1. - smoothstep(.02, .06, pix) * .8);
            h += str * (.5 + .5 * cos(6.2831853 * ph)) * .6;
            sl -= nn * (str * .6 * -.5 * sin(6.2831853 * ph) * 6.2831853 / .063) * REL;
          }
        } else {
          float e = .004; vec3 c1, c2;
          if (i == 3) { h = settH(P, fill, pix, col); float hx = settH(P + vec2(e, 0.), fill, pix, c1), hz = settH(P + vec2(0., e), fill, pix, c2); sl = -vec2(hx - h, hz - h) / e * REL; }
          else { h = cobH(P, fill, pix, col); float hx = cobH(P + vec2(e, 0.), fill, pix, c1), hz = cobH(P + vec2(0., e), fill, pix, c2); sl = -vec2(hx - h, hz - h) / e * REL; }
        }
        hh[i] = h; cc[i] = col; ss[i] = sl; vh[i] = h + wt[i]; ma = max(ma, vh[i]);
      }
    }
    float lin = step(uBlendDepth, .001); ma -= uBlendDepth;
    float bs[5], bsum = 0.;
    for (int i = 0; i < 5; i++) { bs[i] = mix(max(vh[i] - ma, 0.) * step(.002, wt[i]), wt[i], lin); bsum += bs[i]; }
    vec3 albedo = vec3(0.); vec2 slope = vec2(0.); float H = 0., rough = 0., poro = 0., bm = 0.;
    for (int i = 0; i < 5; i++) {
      float b = bs[i] / max(bsum, 1e-4);
      albedo += cc[i] * b; slope += ss[i] * b; H += hh[i] * b; rough += RB[i] * b; poro += PO[i] * b;
      if (i == 2) bm = b;
    }
    float wetL = uWet * (1. - rk.b);
    float pdep = 0., wetPrint = 0.; vec2 rim = vec2(0.);
    if (uPrintsOn > .5) {
      vec2 pu = vec2(suv.x, 1. - suv.y); float e = 1. / uPrintRes;
      vec2 pr = texture2D(uPrints, pu).rg;
      float pd = wt[0] * (.008 + .007 * wetL) + wt[1] * .006 + wt[2] * .004;
      pdep = (1. - pr.r) * pd; wetPrint = 1. - pr.g;
      albedo *= 1. - .5 * smoothstep(0., .5, 1. - pr.r) * step(.001, pd);
      float rx = texture2D(uPrints, pu + vec2(e, 0.)).r - texture2D(uPrints, pu - vec2(e, 0.)).r;
      float rz = texture2D(uPrints, pu + vec2(0., e)).r - texture2D(uPrints, pu - vec2(0., e)).r;
      rim = clamp(vec2(-rx, rz) * pd / (2. * uSize * e) * 1.6, -1., 1.);
    }
    float depth = uWater - (vGW.y + H * .015 - pdep);
    float pud = smoothstep(0., .004, depth) * (1. - rk.b);
    vec3 Ng = normalize(vGN); vec2 sl2 = slope + rim;
    vec3 Np = normalize(vec3(Ng.x + sl2.x, Ng.y, Ng.z + sl2.y));
    vec2 rip = pud > .001 ? ripples(P) : vec2(0.);
    vec3 Nf = normalize(vec3(Ng.x + rip.x, Ng.y, Ng.z + rip.y));
    gN = normalize(mix(Np, Nf, pud));
    float wetT = clamp(wetL + wetPrint * .7, 0., 1.);
    albedo *= mix(1., .42, wetT * poro);
    float lum = dot(albedo, vec3(.3333));
    albedo = mix(vec3(lum), albedo, 1. + .2 * wetT * bm);
    rough = mix(rough, mix(.35, .1, 1. - poro), wetT);
    albedo = mix(albedo, albedo * vec3(.45, .5, .48), pud);
    gRough = mix(rough, .03, pud);
    vec3 V = normalize(cameraPosition - vGW);
    float F = .02 + .98 * pow(1. - max(dot(gN, V), 0.), 5.);
    vec3 Rv = reflect(-V, gN);
    vec3 sky = mix(uHorizon, uSkyTop, pow(clamp(Rv.y, 0., 1.), .55));
    float sd = max(dot(Rv, uSunDir), 0.);
    sky += uSunCol * (pow(sd, 600.) * 4. + pow(sd, 24.) * .12);
    albedo *= 1. - pud * F;
    gEmis = pud * F * sky;
    if (uGrid > .5) {
      vec2 g = abs(fract(P / uTile.x + .5) - .5) * uTile.x; float th = max(.006, pix * 1.2);
      albedo = mix(albedo, vec3(.8, .12, .05), (1. - smoothstep(th * .5, th, min(g.x, g.y))) * .85);
    }
    diffuseColor.rgb = albedo;
  }
}`;

const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
white.needsUpdate = true;

export function createGroundMaterial(t, { layers, rig, gameTex, prints = null, printRes = 1024, cobble = 0.12 }) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  const ripples = Array.from({ length: 16 }, () => new THREE.Vector4(0, 0, -99, 0));
  const u = {
    uHeight: { value: t.heightTex }, uSplat: { value: t.splatTex }, uRake: { value: t.rakeTex }, uPrints: { value: prints || white },
    uAlb: { value: layers.alb }, uNor: { value: layers.nor }, uGameTex: { value: gameTex },
    uSize: { value: t.size }, uHres: { value: t.hres }, uPrintRes: { value: printRes }, uPrintsOn: { value: prints ? 1 : 0 },
    uTile: { value: new THREE.Vector3(1.6, 0.6, 1.2) }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uCobble: { value: cobble },
    uBlendDepth: { value: 0.18 }, uAntiTile: { value: 1 }, uGrid: { value: 0 }, uMode: { value: 0 },
    uWet: { value: 0 }, uWater: { value: -1 }, uRain: { value: 0 }, uTime: { value: 0 }, uRipples: { value: ripples },
    uSkyTop: { value: rig.palette.skyTop }, uHorizon: { value: rig.palette.horizon }, uSunDir: { value: rig.sunDir },
    uSunCol: { value: new THREE.Color() }, uStone: { value: new THREE.Vector4(0, 0, 0, 1) }
  };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', VERT_COMMON).replace('#include <beginnormal_vertex>', VERT_NORMAL).replace('#include <begin_vertex>', VERT_BEGIN);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', FRAG_COMMON).replace('#include <map_fragment>', FRAG_MAP)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = gRough;')
      .replace('#include <normal_fragment_maps>', 'normal = normalize((viewMatrix * vec4(gN, 0.)).xyz);')
      .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance += gEmis;');
  };
  mat.customProgramCacheKey = () => 'michi-ground-1';
  mat.userData.u = u;
  mat.userData.ripples = ripples;
  mat.userData.ripI = 0;
  return mat;
}

export function addRipple(mat, x, z, amp = 1) {
  const d = mat.userData;
  d.ripples[d.ripI++ % 16].set(x, z, d.u.uTime.value, amp);
}
