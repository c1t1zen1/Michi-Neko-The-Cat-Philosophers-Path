// KitMaterials — the painterly material set for kit assets, promoted from
// labs/shared/painted.js (paintify + the M factories) and the GLSL noise
// chunks of labs/shared/glsl.js. Real light from three's PBR, a painter's
// hand on top: world-space brush dabs, moss on what faces up, lichen, grime
// near the ground, wetness and snow (shared uniforms driven by
// AssetRuntime.update(env)) and procedural bump.
//
// Why a class and not a module-level set: every material is memoised per
// argument set, so two builders asking for the same wood get the SAME
// MeshStandardMaterial. Countryside._mergeStatics() groups static meshes by
// material.uuid and only merges materials listed in its MAT table, so the
// runtime binds this set into that table (`bind(MAT)`, called by
// AssetRuntime.setContext({ MAT })): every kit material lands in MAT under a
// `kit:` key and the valley merges kit meshes into its one-draw-call-per-
// material statics with no change to the merge code. Verified in
// tools/kit_contract_test.html ("materials" section) with a real before/after
// draw-call count through Countryside._mergeInto.
//
// The eight screen-space finishes of labs/shared/finish.js (gouache, ink,
// cel …) are a post-processing pass, not a material; they belong to the
// `v-sky` lane's postfx work and are deliberately not promoted here.
import * as THREE from 'three';
import {
  stoneTextures, woodTextures, lacquerTextures, strawTextures, metalTextures, plasterTextures,
  kawaraTextures, barkTextures, texturedMaterial
} from '../textures.js?v=20261113a';
import { rng, canvas2d, canvasTexture } from './craft.js?v=20261113a';

/* ---------------------------------------------------------- GLSL chunks --- */

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

/* -------------------------------------------------------------- paintify --- */

const PARS = /* glsl */`
varying vec3 vPW; varying vec3 vPN;
uniform float uBrush, uDab, uMoss, uLichen, uGrime, uGrimeH, uBump, uBumpK, uWet, uSnow;
uniform vec3 uMossA, uMossB, uRockA, uRockB;
float pMoss = 0.;
${HASH}
${NOISE}
vec2 pProj(vec3 p, vec3 n) { vec3 a = abs(n); return a.y > .6 ? p.xz : (a.x > a.z ? p.zy : p.xy); }
`;

const COLOR = /* glsl */`
{
  vec3 pw = vPW, pn = normalize(vPN);
  vec2 q = pProj(pw, pn);
  #ifdef P_ROCK
    float broad = fbm2(q * 1.3 + pw.y * .4, 4), fine = fbm2(q * 9., 3);
    float crack = 1. - smoothstep(.015, .07, abs(gnoise2(q * 2.7 + 5.) - .5));
    vec3 r = mix(uRockA, uRockB, smoothstep(.2, .8, broad));
    r *= .8 + fine * .4;
    r = mix(r, r * vec3(.5, .48, .44), crack * .7);
    r += vec3(.05, .03, .0) * vnoise2(q * 2.1 + 9.) * .6;
    diffuseColor.rgb *= r;
  #endif
  #ifdef P_BRUSH
    vec3 cell = voronoi2(q * uDab + pw.y * uDab * .27);
    float dab = cell.z - .5;
    float edge = smoothstep(.0, .22, cell.y - cell.x);
    diffuseColor.rgb *= 1. + dab * uBrush;
    diffuseColor.rgb += vec3(.03, .012, -.022) * dab * uBrush * 2.;
    diffuseColor.rgb *= mix(1. - uBrush * .22, 1., edge);
  #endif
  #ifdef P_GRIME
    float g = 1. - smoothstep(0., uGrimeH, pw.y);
    g *= .55 + .45 * fbm2(q * 5., 3);
    float drip = smoothstep(.55, .85, vnoise2(vec2(q.x * 26., pw.y * 1.6)));
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(.52, .49, .43), clamp(g + drip * .28 * abs(pn.y < .5 ? 1. : 0.), 0., 1.) * uGrime);
  #endif
  #ifdef P_LICHEN
    vec3 lc = voronoi2(q * 24.);
    float sp = smoothstep(.58, .36, lc.x) * step(.55, lc.z) * smoothstep(.42, .66, fbm2(q * 1.6 + 3., 3)) * .75;
    diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(.74, .75, .6), vec3(.63, .66, .42), lc.z), sp * uLichen);
  #endif
  #ifdef P_MOSS
    float up = smoothstep(.1, .72, pn.y + (fbm2(q * 2.2, 4) - .5) * 1.4);
    pMoss = clamp(up * uMoss * (.75 + .3 * fbm2(q * 14., 3)) * 1.4 - .1, 0., 1.);
    vec3 moss = mix(uMossA, uMossB, fbm2(q * 6., 3));
    moss *= .8 + vnoise2(q * 36.) * .36;
    diffuseColor.rgb = mix(diffuseColor.rgb, moss, pMoss);
  #endif
  #ifdef P_SNOW
    float sn = smoothstep(.25, .75, pn.y + (fbm2(q * 3., 3) - .5) * .5) * uSnow;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.93, .95, 1.), clamp(sn * 1.3, 0., 1.));
  #endif
  #ifdef P_WET
    diffuseColor.rgb *= mix(1., .62, uWet);
  #endif
}
`;

const ROUGH = /* glsl */`
#ifdef P_MOSS
  roughnessFactor = mix(roughnessFactor, 1., pMoss);
#endif
#ifdef P_WET
  roughnessFactor = mix(roughnessFactor, max(.06, roughnessFactor * .3), uWet);
#endif
`;

const BUMP = /* glsl */`
#ifdef P_BUMP
{
  vec3 pw = vPW, pn = normalize(vPN);
  vec2 q = pProj(pw, pn) * uBumpK;
  float h = fbm2(q, 4) + .45 * fbm2(q * 4.3, 3);
  vec3 sp = -vViewPosition;
  vec3 dx = dFdx(sp), dy = dFdy(sp);
  float hx = dFdx(h), hy = dFdy(h);
  vec3 r1 = cross(dy, normal), r2 = cross(normal, dx);
  float det = dot(dx, r1) * (float(gl_FrontFacing) * 2. - 1.);
  vec3 grad = sign(det) * (hx * r1 + hy * r2);
  normal = normalize(abs(det) * normal - uBump * grad);
}
#endif
`;

/**
 * Patch a MeshStandardMaterial with the painter's pass. `wet` and `snow`
 * are shared uniform objects ({ value }) so one setEnv() drives every
 * surface. World position is taken from the vertex after the model (and
 * instance) matrix, so merged statics (baked to world space, identity
 * modelMatrix) paint exactly as they did unmerged.
 */
export function paintify(mat, { brush = 0.1, dab = 16, moss = 0, lichen = 0, grime = 0, grimeH = 0.5, bump = 0, bumpK = 6, rock = false, wet = null, snow = null,
  mossA = 0x37561f, mossB = 0x71963a, rockA = 0x6a665e, rockB = 0xa8a294 } = {}) {
  const u = {
    uBrush: { value: brush }, uDab: { value: dab }, uMoss: { value: moss }, uLichen: { value: lichen }, uGrime: { value: grime }, uGrimeH: { value: grimeH },
    uBump: { value: bump }, uBumpK: { value: bumpK }, uWet: wet || { value: 0 }, uSnow: snow || { value: 0 },
    uMossA: { value: new THREE.Color(mossA) }, uMossB: { value: new THREE.Color(mossB) }, uRockA: { value: new THREE.Color(rockA) }, uRockB: { value: new THREE.Color(rockB) }
  };
  const d = mat.defines = mat.defines || {};
  if (brush) d.P_BRUSH = 1; if (moss) d.P_MOSS = 1; if (lichen) d.P_LICHEN = 1; if (grime) d.P_GRIME = 1;
  if (bump) d.P_BUMP = 1; if (rock) d.P_ROCK = 1; if (wet) d.P_WET = 1; if (snow) d.P_SNOW = 1;
  mat.userData.u = u;
  if (mat.envMapIntensity !== undefined) mat.envMapIntensity *= 0.9;
  const key = Object.keys(d).filter((k) => k.startsWith('P_')).sort().join('');
  mat.customProgramCacheKey = () => 'paint' + key;
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, u);
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPW; varying vec3 vPN;')
      .replace('#include <project_vertex>', `#include <project_vertex>
      { vec4 pW = vec4(transformed, 1.); vec3 pN = objectNormal;
        #ifdef USE_INSTANCING
          pW = instanceMatrix * pW; pN = mat3(instanceMatrix) * pN;
        #endif
        vPW = (modelMatrix * pW).xyz; vPN = normalize(mat3(modelMatrix) * pN);
      }`);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\n${PARS}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${COLOR}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${ROUGH}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${BUMP}`);
  };
  return mat;
}

/* ---------------------------------------------------------- KitMaterials --- */

const MAT_KEY_PREFIX = 'kit:';

export class KitMaterials {
  constructor({ MAT = null } = {}) {
    this.memo = new Map();
    this.created = [];
    // Every owner MAT table bound so far (Countryside's, InteriorManager's …):
    // each kit material is registered into ALL of them, so every owner's own
    // _mergeStatics() pass merges kit meshes.
    this.tables = new Set();
    // Shared weather uniforms: AssetRuntime.update(env) → setEnv(env).
    this.env = { wet: { value: 0 }, snow: { value: 0 } };
    if (MAT) this.bind(MAT);
  }

  /** The first bound table (kept for callers that read `.MAT`). */
  get MAT() { return this.tables.values().next().value || null; }

  /** Register every kit material (made so far and later) into a MAT table so that owner's _mergeStatics() merges them. */
  bind(MAT) {
    if (!MAT || typeof MAT !== 'object' || this.tables.has(MAT)) return this;
    this.tables.add(MAT);
    for (const m of this.created) MAT[MAT_KEY_PREFIX + m.name] = m;
    return this;
  }

  /** Every material created so far (for a merge set or a leak count). */
  list() { return [...this.created]; }

  /** Drive wetness and snow on every kit surface. env = { wet, snow, … } in 0..1. */
  setEnv(env) {
    if (!env) return;
    if (typeof env.wet === 'number') this.env.wet.value = Math.min(1, Math.max(0, env.wet));
    if (typeof env.snow === 'number') this.env.snow.value = Math.min(1, Math.max(0, env.snow));
  }

  _once(name, args, make) {
    const key = name + JSON.stringify(args);
    if (!this.memo.has(key)) {
      const mat = make();
      mat.name = `${name}#${this.created.length + 1}`;
      mat.userData.kit = true;
      this.created.push(mat);
      for (const table of this.tables) table[MAT_KEY_PREFIX + mat.name] = mat;
      this.memo.set(key, mat);
    }
    return this.memo.get(key);
  }

  /** The painter's options every kit material gets unless overridden: shared wet/snow uniforms. */
  _paint(opts) { return { wet: this.env.wet, snow: this.env.snow, ...opts }; }

  /** Plain painted PBR. */
  plain(color, { rough = 0.85, metal = 0, side = THREE.FrontSide, brush = 0.08, ...p } = {}) {
    return this._once('plain', [color, rough, metal, side, brush, p], () =>
      paintify(new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, side, vertexColors: false }), this._paint({ brush, ...p })));
  }
  /** Vertex-coloured: use with craft.Bag. */
  bag({ rough = 0.85, metal = 0, brush = 0.08, ...p } = {}) {
    return this._once('bag', [rough, metal, brush, p], () =>
      paintify(new THREE.MeshStandardMaterial({ roughness: rough, metalness: metal, vertexColors: true }), this._paint({ brush, ...p })));
  }
  /** Dressed stone from the game's stone texture. */
  stone({ tint = 0x8d8d86, seed = 5, rough = 0.92, ...p } = {}) {
    return this._once('stone', [tint, seed, rough, p], () =>
      paintify(texturedMaterial(stoneTextures(tint, seed), { roughness: rough, normalScale: 0.9 }), this._paint({ brush: 0.09, ...p })));
  }
  /** Fully procedural rock for unmapped meshes (world-space colour and bump). */
  rock({ a = 0x6a665e, b = 0xa8a294, moss = 0, lichen = 0.55, bump = 0.02, rough = 0.95, ...p } = {}) {
    return this._once('rock', [a, b, moss, lichen, bump, rough, p], () =>
      paintify(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: rough }), this._paint({ rock: true, rockA: a, rockB: b, moss, lichen, bump, bumpK: 7, brush: 0.08, ...p })));
  }
  wood({ base = 0x6b4a2e, dark = 0x3a2416, seed = 2, rough = 0.8, ...p } = {}) {
    return this._once('wood', [base, dark, seed, rough, p], () =>
      paintify(texturedMaterial(woodTextures(base, dark, seed), { roughness: rough, normalScale: 0.8 }), this._paint({ brush: 0.06, ...p })));
  }
  bark({ base = 0x6a4b35, dark = 0x2c1b12, seed = 8, rough = 0.95, ...p } = {}) {
    return this._once('bark', [base, dark, seed, rough, p], () =>
      paintify(texturedMaterial(barkTextures(base, dark, seed), { roughness: rough }), this._paint({ brush: 0.06, ...p })));
  }
  lacquer({ color = 0xd8482c, seed = 13, rough = 0.34, grime = 0.3, ...p } = {}) {
    return this._once('lacquer', [color, seed, rough, grime, p], () =>
      paintify(texturedMaterial(lacquerTextures(color, seed), { roughness: rough, normalScale: 0.4, envMapIntensity: 0.8 }), this._paint({ brush: 0.07, grime, grimeH: 0.8, ...p })));
  }
  bronze({ color = 0x9a7a44, rough = 0.42, metal = 0.85, ...p } = {}) {
    return this._once('bronze', [color, rough, metal, p], () =>
      paintify(texturedMaterial(metalTextures(color), { metalness: metal, roughness: rough }), this._paint({ brush: 0.05, ...p })));
  }
  bamboo({ color = 0x7fa84f, rough = 0.48, vcol = false, side = THREE.FrontSide, ...p } = {}) {
    return this._once('bamboo', [color, rough, vcol, side, p], () =>
      paintify(new THREE.MeshStandardMaterial({ color, roughness: rough, vertexColors: vcol, side }), this._paint({ brush: 0.08, ...p })));
  }
  straw({ color = 0xc8a96a, rough = 1, side = THREE.FrontSide, ...p } = {}) {
    return this._once('straw', [color, rough, side, p], () =>
      paintify(texturedMaterial(strawTextures(color), { roughness: rough, side }), this._paint({ brush: 0.08, ...p })));
  }
  plaster({ tint = 0xefe6d2, seed = 1, rough = 0.96, ...p } = {}) {
    return this._once('plaster', [tint, seed, rough, p], () =>
      paintify(texturedMaterial(plasterTextures(tint, seed), { roughness: rough }), this._paint({ brush: 0.06, ...p })));
  }
  tile({ color = 0x5e6872, seed = 3, rough = 0.5, side = THREE.FrontSide, ...p } = {}) {
    return this._once('tile', [color, seed, rough, side, p], () =>
      paintify(texturedMaterial(kawaraTextures(color, seed), { roughness: rough, normalScale: 0.5, envMapIntensity: 0.85, side }), this._paint({ brush: 0.05, ...p })));
  }
  /** Washi lit from inside: the lit look is emissive, multiplied by a rib/fibre map when given. */
  paper({ color = 0xfff0d8, glow = 0, glowColor = 0xffa14a, rough = 0.9, map = null, side = THREE.DoubleSide, ...p } = {}) {
    return this._once('paper', [color, glow, glowColor, rough, side, map ? map.uuid : 0, p], () => {
      const m = new THREE.MeshStandardMaterial({ color, roughness: rough, emissive: glowColor, emissiveIntensity: glow, side, map, emissiveMap: map });
      return paintify(m, this._paint({ brush: 0.04, ...p }));
    });
  }
  cloth({ color = 0x223652, rough = 0.9, side = THREE.DoubleSide, ...p } = {}) {
    return this._once('cloth', [color, rough, side, p], () =>
      paintify(new THREE.MeshStandardMaterial({ color, roughness: rough, side }), this._paint({ brush: 0.09, ...p })));
  }
  moss({ a = 0x37561f, b = 0x71963a, ...p } = {}) {
    return this._once('mossy', [a, b, p], () =>
      paintify(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), this._paint({ moss: 1.2, mossA: a, mossB: b, brush: 0.1, ...p })));
  }

  /** Dispose every created material (tests and teardown; the game never calls this). */
  dispose() {
    for (const m of this.created) m.dispose();
    for (const table of this.tables) for (const m of this.created) delete table[MAT_KEY_PREFIX + m.name];
    this.created = [];
    this.memo.clear();
  }
}

/* ------------------------------------------------- lantern light helpers --- */

// Promoted from src/kit/lanterns/light.js at gate G-V1 (v-lanterns handoff):
// the dusk curve, the washi and halo textures and the lit-washi material are
// shared by every family that lights paper (lanterns, shrine, hidden places,
// interiors). lanterns/light.js re-exports them unchanged. Nothing here reads
// Math.random or Date.now.

/**
 * How dark it is, 0 (sun well up) .. 1, from the hour of the day: the same
 * asymmetric sun path as Sky.updateDayNight() (the source of truth is `sky.sunDir`; keep this in step, it ignores weather) (daylight 6:00-19:12) pushed
 * through Countryside.update()'s `1 - sunUp * 5`.
 */
export function nightnessAt(hour) {
  const h = ((hour % 24) + 24) % 24;
  const dayStart = 6.0, dayEnd = 19.2;
  let angle;
  if (h >= dayStart && h <= dayEnd) angle = ((h - dayStart) / (dayEnd - dayStart)) * Math.PI;
  else {
    const nightT = h < dayStart ? h + 24 - dayEnd : h - dayEnd;
    angle = Math.PI + (nightT / (24 - (dayEnd - dayStart))) * Math.PI;
  }
  const sunY = Math.sin(angle) / Math.sqrt(1.25); // sunDir = (cos, sin, 0.5) normalised
  return Math.max(0, 1 - Math.max(0, sunY) * 5);
}

// One texture per KitMaterials set (the set is the kit's shared state): built
// lazily, shared by every lantern, never disposed by an instance.
const cache = new WeakMap();
function shared(km, key, make) {
  const owner = km && typeof km === 'object' ? km : cache;
  let bag = cache.get(owner);
  if (!bag) { bag = new Map(); cache.set(owner, bag); }
  if (!bag.has(key)) { const t = make(); t.userData.kit = true; bag.set(key, t); }
  return bag.get(key);
}

/** A washi sheet: long fibres and the shadow of the bamboo ribs (labs/shared/paperlantern.js). */
export function washiTexture(km, { ribs = 0, seed = 7 } = {}) {
  return shared(km, `washi:${ribs}:${seed}`, () => {
    const [c, x] = canvas2d(128, 128);
    const r = rng(seed);
    x.fillStyle = '#fff4e2'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 220; i++) {
      x.strokeStyle = `rgba(150,110,70,${0.04 + r() * 0.08})`; x.lineWidth = 0.4 + r() * 0.6;
      x.beginPath(); const px = r() * 128, py = r() * 128; x.moveTo(px, py);
      x.quadraticCurveTo(px + (r() - 0.5) * 25, py + (r() - 0.5) * 15, px + (r() - 0.5) * 35, py + (r() - 0.5) * 15); x.stroke();
    }
    for (let i = 0; i < ribs; i++) {
      const y = (i + 0.5) / ribs * 128;
      x.fillStyle = 'rgba(120,80,40,.34)'; x.fillRect(0, y - 0.6, 128, 1.2);
      x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(0, y + 0.6, 128, 0.5);
    }
    return canvasTexture(c, { repeat: true });
  });
}

/** The soft warm bloom behind a flame (the game's makeGlowBallTexture, redrawn). */
export function haloTexture(km) {
  return shared(km, 'halo', () => {
    const [c, x] = canvas2d(64, 64);
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(0.25, 'rgba(255,200,120,0.55)');
    g.addColorStop(0.6, 'rgba(255,160,70,0.14)'); g.addColorStop(1, 'rgba(255,140,50,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return canvasTexture(c);
  });
}

/**
 * Lit washi: a warm emissive with a fibre map, hottest where the flame is
 * (the object-space height of the mesh, so build the mesh centred on its
 * flame and place it with `mesh.position`). `uGlow` is the dial update() turns.
 * One private material per lantern (each kindles on its own); the compiled
 * program is shared.
 */
export function litWashi(tex, { color = 0xfff0dc, glowColor = 0xff9a3e, fall = 0.2, glow = 0.15, side = THREE.DoubleSide } = {}) {
  const u = { uGlow: { value: glow }, uFall: { value: fall }, uGlowCol: { value: new THREE.Color(glowColor) } };
  const m = new THREE.MeshStandardMaterial({ color, map: tex, roughness: 0.9, side });
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, u);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying float vH;').replace('#include <project_vertex>', '#include <project_vertex>\nvH = position.y;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vH; uniform float uGlow, uFall; uniform vec3 uGlowCol;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float bl = exp(-pow(abs(vH) * uFall / 0.28, 2.0));
        vec3 glowC = uGlowCol * (0.5 + 1.6 * bl) * texture2D(map, vMapUv).rgb;
        totalEmissiveRadiance += glowC * uGlow;`);
  };
  m.userData.u = u;
  m.customProgramCacheKey = () => 'kit-washi';
  return m;
}
