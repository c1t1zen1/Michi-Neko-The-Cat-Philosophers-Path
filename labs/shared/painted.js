// Painted surfaces: real light from three's PBR, a painter's hand on top.
// paintify() patches a material with world-space brush dabs, moss on what faces
// up, lichen, grime near the ground, wetness and procedural bump. The M set
// builds on the game's own 256 px canvas textures, so a recipe can move into
// src/ without a new asset.
import * as THREE from 'three';
import { HASH, NOISE } from './glsl.js';
import { stoneTextures, woodTextures, lacquerTextures, strawTextures, metalTextures, plasterTextures, kawaraTextures, barkTextures, texturedMaterial } from './game.js';

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

const memo = new Map();
const once = (name, args, make) => {
  const k = name + JSON.stringify(args);
  if (!memo.has(k)) memo.set(k, make());
  return memo.get(k);
};

export const M = {
  /** Plain painted PBR. */
  plain: (color, { rough = 0.85, metal = 0, side = THREE.FrontSide, brush = 0.08, ...p } = {}) => once('plain', [color, rough, metal, side, brush, p], () =>
    paintify(new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, side, vertexColors: false }), { brush, ...p })),
  /** Vertex-coloured: use with Bag. */
  bag: ({ rough = 0.85, metal = 0, brush = 0.08, ...p } = {}) => once('bag', [rough, metal, brush, p], () =>
    paintify(new THREE.MeshStandardMaterial({ roughness: rough, metalness: metal, vertexColors: true }), { brush, ...p })),
  /** Dressed stone from the game's stone texture. */
  stone: ({ tint = 0x8d8d86, seed = 5, rough = 0.92, ...p } = {}) => once('stone', [tint, seed, rough, p], () =>
    paintify(texturedMaterial(stoneTextures(tint, seed), { roughness: rough, normalScale: 0.9 }), { brush: 0.09, ...p })),
  /** Fully procedural rock for unmapped meshes (world-space colour and bump). */
  rock: ({ a = 0x6a665e, b = 0xa8a294, moss = 0, lichen = 0.55, bump = 0.02, rough = 0.95, ...p } = {}) => once('rock', [a, b, moss, lichen, bump, rough, p], () =>
    paintify(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: rough }), { rock: true, rockA: a, rockB: b, moss, lichen, bump, bumpK: 7, brush: 0.08, ...p })),
  wood: ({ base = 0x6b4a2e, dark = 0x3a2416, seed = 2, rough = 0.8, ...p } = {}) => once('wood', [base, dark, seed, rough, p], () =>
    paintify(texturedMaterial(woodTextures(base, dark, seed), { roughness: rough, normalScale: 0.8 }), { brush: 0.06, ...p })),
  bark: ({ base = 0x6a4b35, dark = 0x2c1b12, seed = 8, rough = 0.95, ...p } = {}) => once('bark', [base, dark, seed, rough, p], () =>
    paintify(texturedMaterial(barkTextures(base, dark, seed), { roughness: rough }), { brush: 0.06, ...p })),
  lacquer: ({ color = 0xd8482c, seed = 13, rough = 0.34, grime = 0.3, ...p } = {}) => once('lacquer', [color, seed, rough, grime, p], () =>
    paintify(texturedMaterial(lacquerTextures(color, seed), { roughness: rough, normalScale: 0.4, envMapIntensity: 0.8 }), { brush: 0.07, grime, grimeH: 0.8, ...p })),
  bronze: ({ color = 0x9a7a44, rough = 0.42, metal = 0.85, ...p } = {}) => once('bronze', [color, rough, metal, p], () =>
    paintify(texturedMaterial(metalTextures(color), { metalness: metal, roughness: rough }), { brush: 0.05, ...p })),
  bamboo: ({ color = 0x7fa84f, rough = 0.48, vcol = false, side = THREE.FrontSide, ...p } = {}) => once('bamboo', [color, rough, vcol, side, p], () =>
    paintify(new THREE.MeshStandardMaterial({ color, roughness: rough, vertexColors: vcol, side }), { brush: 0.08, ...p })),
  straw: ({ color = 0xc8a96a, rough = 1, side = THREE.FrontSide, ...p } = {}) => once('straw', [color, rough, side, p], () =>
    paintify(texturedMaterial(strawTextures(color), { roughness: rough, side }), { brush: 0.08, ...p })),
  plaster: ({ tint = 0xefe6d2, seed = 1, rough = 0.96, ...p } = {}) => once('plaster', [tint, seed, rough, p], () =>
    paintify(texturedMaterial(plasterTextures(tint, seed), { roughness: rough }), { brush: 0.06, ...p })),
  tile: ({ color = 0x5e6872, seed = 3, rough = 0.5, side = THREE.FrontSide, ...p } = {}) => once('tile', [color, seed, rough, side, p], () =>
    paintify(texturedMaterial(kawaraTextures(color, seed), { roughness: rough, normalScale: 0.5, envMapIntensity: 0.85, side }), { brush: 0.05, ...p })),
  /** Washi lit from inside: lit look is emissive, multiplied by a rib/fibre map when given. */
  paper: ({ color = 0xfff0d8, glow = 0, glowColor = 0xffa14a, rough = 0.9, map = null, side = THREE.DoubleSide, ...p } = {}) => once('paper', [color, glow, glowColor, rough, side, map ? map.uuid : 0, p], () => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: rough, emissive: glowColor, emissiveIntensity: glow, side, map, emissiveMap: map });
    return paintify(m, { brush: 0.04, ...p });
  }),
  cloth: ({ color = 0x223652, rough = 0.9, side = THREE.DoubleSide, ...p } = {}) => once('cloth', [color, rough, side, p], () =>
    paintify(new THREE.MeshStandardMaterial({ color, roughness: rough, side }), { brush: 0.09, ...p })),
  moss: ({ a = 0x37561f, b = 0x71963a, ...p } = {}) => once('mossy', [a, b, p], () =>
    paintify(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), { moss: 1.2, mossA: a, mossB: b, brush: 0.1, ...p }))
};
