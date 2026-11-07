// The bridge kit. Every bridge spans a river running along x, its own axis
// along z, centred on (x, zc): deck length L, width W, deck top H, ramps of
// length `ramp` down to the banks. Parts are merged per material, so a whole
// bridge is a handful of draw calls. Each builder also returns what the cat
// needs (walkable and blocking solids), what the water needs (piers as flow
// obstacles), labels for the parts, lantern lights, and a spot to leap from.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { woodTextures, stoneTextures, lacquerTextures, metalTextures } from '../../shared/game.js';
import { rectSolid, obbSolid } from './physics.js';

export const BRIDGE_TYPES = ['sanjo', 'taiko', 'yatsuhashi', 'ippon', 'nagare', 'uji', 'stones', 'game'];

function mulberry(a) {
  return () => {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- materials: wood that weathers by which way it faces ---------------- */

const WEATHER_VS = 'varying vec3 vWP2;\nvarying vec3 vWN2;';
const WEATHER_FS = /* glsl */`
varying vec3 vWP2;
varying vec3 vWN2;
uniform float uLevel, uAge, uRain;`;
const WEATHER_COLOR = /* glsl */`
#include <map_fragment>
{
  vec3 n = normalize(vWN2);
  float h = fract(sin(dot(floor(vWP2.xz * 6.) + floor(vWP2.y * 3.), vec2(12.9898, 78.233))) * 43758.5453);
  // algae on north faces (+z here: the noon sun sits at -z), hardly any facing the sun
  float algae = smoothstep(0.25, 0.9, n.z) * (0.5 + 0.5 * h) * uAge;
  // splash zone: damp and green near the water
  float damp = 1. - smoothstep(uLevel + 0.05, uLevel + 0.75, vWP2.y);
  // tops bleach grey in the sun and rain (the top rail goes first)
  float top = smoothstep(0.55, 0.95, n.y) * uAge;
  vec3 g = vec3(0.23, 0.31, 0.16) * (0.7 + 0.6 * dot(diffuseColor.rgb, vec3(0.33)));
  diffuseColor.rgb = mix(diffuseColor.rgb, g, clamp(algae * 0.38 + damp * 0.42 * WEATHER_GREEN, 0., 0.8));
  float l = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(l) * vec3(1.06, 1.04, 1.0) * 1.08, top * 0.42 * WEATHER_GREY);
  diffuseColor.rgb *= 1. - damp * 0.28 - uRain * 0.3;
}`;
const PATINA_COLOR = /* glsl */`
#include <map_fragment>
float patina;
{
  vec3 n = normalize(vWN2);
  float h = fract(sin(dot(floor(vWP2.xz * 40.) + floor(vWP2.y * 40.), vec2(12.9898, 78.233))) * 43758.5453);
  patina = clamp(smoothstep(0.1, 0.9, n.y) * 0.7 + h * 0.35 - 0.1, 0., 1.) * uAge;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.27, 0.5, 0.42), patina);
}`;

function weather(mat, U, age, { green = 1, grey = 1, patina = false } = {}) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uLevel = U.uLevel; sh.uniforms.uAge = age; sh.uniforms.uRain = U.uRain;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + WEATHER_VS)
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vWP2 = (modelMatrix * vec4(transformed, 1.)).xyz;\n  vWN2 = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${WEATHER_FS}\n#define WEATHER_GREEN ${green.toFixed(2)}\n#define WEATHER_GREY ${grey.toFixed(2)}`)
      .replace('#include <map_fragment>', patina ? PATINA_COLOR : WEATHER_COLOR);
    if (patina) sh.fragmentShader = sh.fragmentShader.replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n  metalnessFactor *= 1. - patina * 0.85;\n  roughnessFactor = mix(roughnessFactor, 0.8, patina);');
  };
  mat.customProgramCacheKey = () => `lab02-weather-${green}-${grey}-${patina}`;
  return mat;
}

export function bridgeMaterials(U) {
  const age = { value: 0.7 };
  const hinoki = woodTextures(0x9a8468, 0x5a4634, 21), dark = woodTextures(0x5c4632, 0x2a1d14, 22);
  const lac = lacquerTextures(0xc8432a, 13), stone = stoneTextures(0x9c978b, 31), metal = metalTextures(0x8a6a3a);
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const M = {
    wood: weather(std({ map: hinoki.map, normalMap: hinoki.normalMap, roughness: 0.84 }), U, age),
    koran: weather(std({ map: hinoki.map, normalMap: hinoki.normalMap, color: 0xf4ece0, roughness: 0.8 }), U, age, { grey: 1.3 }),
    dark: weather(std({ map: dark.map, normalMap: dark.normalMap, roughness: 0.86 }), U, age, { green: 1.3 }),
    lacquer: weather(std({ map: lac.map, normalMap: lac.normalMap, roughness: 0.42 }), U, age, { green: 0.5, grey: 0.4 }),
    stone: weather(std({ map: stone.map, normalMap: stone.normalMap, roughness: 0.92 }), U, age, { grey: 0.3 }),
    bronze: weather(std({ map: metal.map, color: 0xb08a52, metalness: 0.7, roughness: 0.38 }), U, age, { patina: true }),
    wire: std({ color: 0x2c2c2a, metalness: 0.6, roughness: 0.45 }),
    paper: std({ color: 0xfff0d2, emissive: 0xffa04a, emissiveIntensity: 0, roughness: 0.8 }),
    iris: std({ color: 0x5d7f3a, roughness: 0.75, side: THREE.DoubleSide }),
    irisFlower: std({ color: 0x5b3f9e, roughness: 0.55, side: THREE.DoubleSide })
  };
  M.age = age;
  return M;
}

/* ---------------- parts: boxes, posts and rails, merged per material ---------------- */

const _up = new THREE.Vector3(0, 1, 0), _dir = new THREE.Vector3(), _mid = new THREE.Vector3();
const _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _one = new THREE.Vector3(1, 1, 1), _e = new THREE.Euler(), _p = new THREE.Vector3();
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function boxUV(g, w, h, d, tex, rnd) {
  const uv = g.attributes.uv;
  const faces = [[d, h, 'z'], [d, h, 'z'], [w, d, 'x'], [w, d, 'x'], [w, h, 'x'], [w, h, 'x']];
  const long = w >= h && w >= d ? 'x' : h >= d ? 'y' : 'z';
  const ou = rnd() * 4, ov = rnd() * 4;
  for (let f = 0; f < 6; f++) {
    const [lu, lv, au] = faces[f];
    const swap = au === long;
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      let u = uv.getX(i) * lu, v = uv.getY(i) * lv;
      if (swap) [u, v] = [v, u];
      uv.setXY(i, u * tex + ou, v * tex * 0.35 + ov);
    }
  }
}
function cylUV(g, r, len, tex, rnd) {
  const uv = g.attributes.uv, o = rnd() * 4;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * 2 * r * tex + o, uv.getY(i) * len * tex * 0.35);
}

export class Parts {
  constructor(seed = 1) { this.m = new Map(); this.rnd = mulberry(seed); }
  put(key, g, matrix) {
    g.applyMatrix4(matrix);
    if (g.index) g = g.toNonIndexed();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!this.m.has(key)) this.m.set(key, []);
    this.m.get(key).push(g);
    return g;
  }
  at(x, y, z, rx = 0, ry = 0, rz = 0) { _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); return _m.compose(_p.set(x, y, z), _q, _one); }
  box(key, w, h, d, x, y, z, { rx = 0, ry = 0, rz = 0, tex = 1.6 } = {}) {
    const g = new THREE.BoxGeometry(w, h, d);
    boxUV(g, w, h, d, tex, this.rnd);
    return this.put(key, g, this.at(x, y, z, rx, ry, rz));
  }
  cyl(key, r, h, x, y, z, { r1 = r, seg = 10, rx = 0, rz = 0, tex = 1.6 } = {}) {
    const g = new THREE.CylinderGeometry(r1, r, h, seg, 1);
    cylUV(g, r, h, tex, this.rnd);
    return this.put(key, g, this.at(x, y, z, rx, 0, rz));
  }
  /** A post or a beam from a to b; w given = square section w x h. */
  between(key, a, b, { r = 0.04, w = 0, h = 0, seg = 8, tex = 1.6 } = {}) {
    _dir.subVectors(b, a);
    const len = _dir.length();
    if (len < 1e-4) return null;
    _dir.multiplyScalar(1 / len);
    let g;
    if (w) { g = new THREE.BoxGeometry(w, len, h || w); boxUV(g, w, len, h || w, tex, this.rnd); }
    else { g = new THREE.CylinderGeometry(r, r, len, seg, 1); cylUV(g, r, len, tex, this.rnd); }
    _q.setFromUnitVectors(_up, _dir);
    _mid.addVectors(a, b).multiplyScalar(0.5);
    return this.put(key, g, _m.compose(_mid, _q, _one));
  }
  lathe(key, pts, x, y, z, seg = 16) {
    const g = new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg);
    return this.put(key, g, this.at(x, y, z));
  }
  build(mats, { shadows = true } = {}) {
    const group = new THREE.Group();
    for (const [key, list] of this.m) {
      const geo = mergeGeometries(list);
      if (!geo) continue;
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, mats[key]);
      mesh.castShadow = shadows; mesh.receiveShadow = true;
      mesh.name = key;
      group.add(mesh);
    }
    return group;
  }
}

/** Bronze giboshi: collar over the post top, a ring, the onion and its point. */
export function giboshi(P, x, y, z, s = 1) {
  const pts = [[0.088, 0], [0.088, 0.13], [0.104, 0.14], [0.104, 0.165], [0.07, 0.185], [0.098, 0.235], [0.118, 0.29], [0.104, 0.345], [0.07, 0.392], [0.03, 0.43], [0.008, 0.47], [0, 0.48]];
  P.lathe('bronze', pts.map(([r, h]) => [r * s, h * s]), x, y, z, 18);
}

/* ---------------- the railing (kōran) ---------------- */

/**
 * A wayō kōran along z at x: jifuku (curb rail), tozuka (struts) topped by masu
 * (bearing blocks), hirageta (middle rail), hokogi (top rail) and oyabashira
 * (main posts) capped with giboshi. yAt(z) is the deck under it.
 */
function koran(P, { x, z0, z1, yAt, oya = [], s = 1, key = 'koran', bronze = true, step = 0.95, skip = null }) {
  const H1 = 0.95 * s, Hm = 0.5 * s, seg = 0.42;
  const zs = [];
  for (let z = z0; z < z1 - 1e-3; z += seg) zs.push(z);
  zs.push(z1);
  const open = (z) => skip && z > skip[0] && z < skip[1];
  for (let i = 0; i < zs.length - 1; i++) {
    const za = zs[i], zb = zs[i + 1];
    if (open((za + zb) / 2)) continue;
    P.between(key, V(x, yAt(za) + 0.06 * s, za - 0.01), V(x, yAt(zb) + 0.06 * s, zb + 0.01), { w: 0.1 * s, h: 0.11 * s });
    P.between(key, V(x, yAt(za) + Hm, za - 0.01), V(x, yAt(zb) + Hm, zb + 0.01), { w: 0.05 * s, h: 0.08 * s });
    P.between(key, V(x, yAt(za) + H1, za - 0.01), V(x, yAt(zb) + H1, zb + 0.01), { r: 0.048 * s, seg: 8 });
  }
  // tozuka between the main posts
  const all = [...new Set([z0, z1, ...oya])].sort((a, b) => a - b);
  for (let i = 0; i < all.length - 1; i++) {
    const n = Math.max(1, Math.round((all[i + 1] - all[i]) / step));
    for (let k = 1; k < n; k++) {
      const z = all[i] + (all[i + 1] - all[i]) * (k / n);
      if (open(z)) continue;
      const y = yAt(z);
      P.box(key, 0.065 * s, H1 - 0.16 * s, 0.065 * s, x, y + 0.12 * s + (H1 - 0.16 * s) / 2, z);
      P.box(key, 0.11 * s, 0.055 * s, 0.11 * s, x, y + H1 - 0.075 * s, z);
    }
  }
  for (const z of all) {
    if (open(z)) continue;
    const y = yAt(z);
    P.box(key, 0.15 * s, H1 + 0.12 * s, 0.15 * s, x, y + (H1 + 0.12 * s) / 2, z);
    if (bronze) giboshi(P, x, y + H1 + 0.12 * s, z, s); else P.box(key, 0.19 * s, 0.05 * s, 0.19 * s, x, y + H1 + 0.145 * s, z);
  }
}

function railSolids(solids, { x, z0, z1, yAt, s = 1, skip = null }) {
  const H1 = 0.95 * s;
  const spans = skip ? [[z0, skip[0]], [skip[1], z1]] : [[z0, z1]];
  for (const [a, b] of spans) {
    if (b - a < 0.05) continue;
    solids.push(rectSolid({ x0: x - 0.07 * s, x1: x + 0.07 * s, z0: a, z1: b, top: (px, pz) => yAt(pz) + H1 + 0.05 * s, bottom: (px, pz) => yAt(pz), walk: false, kind: 'rail' }));
    solids.push(rectSolid({ x0: x - 0.09 * s, x1: x + 0.09 * s, z0: a, z1: b, top: (px, pz) => yAt(pz) + H1 + 0.05 * s, bottom: (px, pz) => yAt(pz) + H1 - 0.1, walk: true, kind: 'railtop', name: 'the top rail' }));
  }
}

/* ---------------- shared bits ---------------- */

function ctx(o) {
  const s = o.s ?? 1;
  const P = new Parts(o.seed ?? 3);
  return { ...o, s, P, solids: [], obstacles: [], callouts: [], lights: [], extra: [], movers: [] };
}

/** Deck height along z: flat or bowed over the deck, straight ramps to the banks. */
function profile(c, deck = () => c.H) {
  const { zc, L, ramp, groundAt, x } = c;
  return (z) => {
    const dz = z - zc;
    if (Math.abs(dz) <= L / 2) return deck(dz);
    if (!ramp) return deck(Math.sign(dz) * L / 2);
    const sz = Math.sign(dz), t = Math.min(1, (Math.abs(dz) - L / 2) / ramp);
    const g = groundAt(x, zc + sz * (L / 2 + ramp));
    return deck(sz * L / 2) + (g + 0.02 - deck(sz * L / 2)) * t;
  };
}

function deckSolids(c, yAt, halfW, under = 0.45) {
  const { x, zc, L, ramp } = c;
  c.solids.push(rectSolid({ x0: x - halfW, x1: x + halfW, z0: zc - L / 2 - ramp, z1: zc + L / 2 + ramp, top: (px, pz) => yAt(pz), bottom: (px, pz) => (Math.abs(pz - zc) <= L / 2 ? yAt(pz) - under : -20), kind: 'deck', name: 'the deck' }));
}

function ends(c) {
  const { x, zc, L, ramp } = c;
  return [1, -1].map((sz) => ({ foot: { x, z: zc + sz * (L / 2 + ramp + 0.7) }, top: { x, z: zc + sz * (L / 2 - 0.4) } }));
}

/** Planks across the deck, following yAt (tilted on slopes and arcs). */
function planks(c, yAt, z0, z1, { key = 'wood', w = c.W, t = 0.065, pitch = 0.27 } = {}) {
  const { P, x, s } = c;
  const n = Math.max(1, Math.round((z1 - z0) / (pitch * s)));
  for (let i = 0; i < n; i++) {
    const za = z0 + (z1 - z0) * (i / n), zb = z0 + (z1 - z0) * ((i + 1) / n), zm = (za + zb) / 2;
    const ya = yAt(za), yb = yAt(zb);
    const ang = Math.atan2(yb - ya, zb - za);
    const len = Math.hypot(zb - za, yb - ya) - 0.012 * s;
    const jitter = (P.rnd() - 0.5) * 0.006 * s;
    P.box(key, w + (P.rnd() - 0.5) * 0.05 * s, t * s, len, x, (ya + yb) / 2 - t * s / 2 + jitter, zm, { rx: -ang + (P.rnd() - 0.5) * 0.01 });
  }
}

/** Pier bents: posts from the bed to a cap beam, a through-tie and crossed braces. */
function bent(c, z, top, { xs, r = 0.12, key = 'dark', braces = true, cap = true } = {}) {
  const { P, x, s, bedAt, level } = c;
  const capH = 0.22 * s;
  for (const dx of xs) {
    const b = bedAt(x + dx, z) - 0.2;
    P.between(key, V(x + dx, b, z), V(x + dx, top - (cap ? capH : 0), z), { r: r * s, seg: 10 });
    c.obstacles.push({ x: x + dx, z, r: r * s * 1.1 });
    c.solids.push({ ...rectSolid({ x0: x + dx - r * s, x1: x + dx + r * s, z0: z - r * s, z1: z + r * s, top: top - capH, bottom: -20, walk: false, kind: 'post' }) });
  }
  const span = xs[xs.length - 1] - xs[0];
  if (cap) P.box(key, span + 0.5 * s, capH, 0.28 * s, x + (xs[0] + xs[xs.length - 1]) / 2, top - capH / 2, z);
  const tie = Math.max(level + 0.45, bedAt(x, z) + 0.3);
  if (tie < top - capH - 0.15) {
    P.box(key, span + 0.3 * s, 0.11 * s, 0.08 * s, x + (xs[0] + xs[xs.length - 1]) / 2, tie, z + r * s + 0.04 * s);
    if (braces) {
      const lo = Math.max(level + 0.15, tie - 0.05), hi = top - capH - 0.06;
      P.between(key, V(x + xs[0], lo, z - r * s - 0.03), V(x + xs[xs.length - 1], hi, z - r * s - 0.03), { r: 0.042 * s, seg: 6 });
      P.between(key, V(x + xs[xs.length - 1], lo, z - r * s - 0.03), V(x + xs[0], hi, z - r * s - 0.03), { r: 0.042 * s, seg: 6 });
    }
  }
}

function abutment(c, z, top, sz, w = c.W + 0.5) {
  const { P, x, s, groundAt } = c;
  const g = groundAt(x, z) - 0.25;
  const h = top - g;
  if (h < 0.1) return;
  const courses = Math.max(1, Math.round(h / 0.3));
  for (let i = 0; i < courses; i++) {
    const y0 = g + (h / courses) * i, ch = h / courses;
    const off = i % 2 ? 0.18 : 0;
    for (let k = -2; k <= 2; k++) P.box('stone', w / 5 - 0.02, ch - 0.015, 0.9 * s, x + (k * w) / 5 + off * s * (k === 2 ? -1 : 1) * 0.3, y0 + ch / 2, z + sz * 0.1 * s);
  }
}

function lanterns(c, zs, y, side = 1) {
  const { P, x, s, W } = c;
  for (const z of zs) {
    const lx = x + side * (W / 2 + 0.12 * s);
    P.cyl('paper', 0.075 * s, 0.2 * s, lx, y, z, { r1: 0.06 * s, seg: 12 });
    P.cyl('dark', 0.05 * s, 0.03 * s, lx, y + 0.115 * s, z, { seg: 8 });
    c.lights.push({ x: lx, y, z, i: 0.9 });
  }
}

/* ---------------- the bridges ---------------- */

const BUILDERS = {
  // countryside.js buildRiverAndBridge(), as the game builds it: boxes on air
  game(c) {
    const { P, x, zc, L, W, s } = c;
    const H = c.H - 0.08 * s;
    const yAt = profile(c, () => H + 0.08 * s);
    P.box('dark', W + 0.1 * s, 0.16 * s, L, x, H, zc);
    P.box('stone', W - 0.12 * s, 0.025 * s, L - 0.28 * s, x, H + 0.093 * s, zc);
    P.box('dark', W - 0.1 * s, 0.12 * s, L - 0.2 * s, x, H - 0.14 * s, zc);
    for (let i = 0; i <= 6; i++) {
      const z = zc - L / 2 + 0.2 * s + (i / 6) * (L - 0.4 * s);
      for (const sd of [-1, 1]) P.box('dark', 0.1 * s, 0.6 * s, 0.1 * s, x + sd * W * 0.469, H + 0.35 * s, z);
    }
    for (const sd of [-1, 1]) {
      P.box('dark', 0.42 * s, 0.08 * s, L, x + sd * W * 0.477, H + 0.62 * s, zc);
      P.box('dark', 0.12 * s, 0.5 * s, L - 0.2 * s, x + sd * W * 0.477, H + 0.36 * s, zc);
      c.solids.push(rectSolid({ x0: x + sd * W * 0.477 - 0.21 * s, x1: x + sd * W * 0.477 + 0.21 * s, z0: zc - L / 2, z1: zc + L / 2, top: H + 0.66 * s, bottom: H + 0.08 * s, kind: 'railtop', name: 'the flat rail' }));
    }
    for (const sz of [-1, 1]) {
      const zEnd = zc + sz * L / 2, g = c.groundAt(x, zEnd + sz * c.ramp);
      const rise = H + 0.08 * s - g, len = Math.hypot(c.ramp, rise) + 0.2 * s, ang = Math.atan2(rise, c.ramp);
      P.box('dark', W + 0.1 * s, 0.12 * s, len, x, (H + g) / 2, zEnd + sz * c.ramp / 2, { rx: sz * ang });
      P.box('stone', W - 0.12 * s, 0.03 * s, len - 0.12 * s, x, (H + g) / 2 + 0.07 * s, zEnd + sz * c.ramp / 2, { rx: sz * ang });
    }
    deckSolids(c, yAt, W / 2, 0.35);
    c.leap = { stand: { x: x + W / 2 - 0.5 * s, z: zc }, rail: { x: x + W * 0.477, y: H + 0.66 * s }, dir: 1 };
    c.callouts.push({ id: 'deck', title: 'One box deck', sub: 'no piers, no planks', pos: V(x, H + 0.2, zc) });
  },

  // Sanjō Ōhashi: a wooden beam bridge (mokugeta-bashi) with a giboshi kōran
  sanjo(c) {
    const { P, x, zc, L, W, H, s, ramp } = c;
    const yAt = profile(c);
    const ketaH = 0.26 * s, deckT = 0.065;
    const nb = Math.max(2, Math.round(L / (3.4 * s)));
    const bents = [];
    for (let i = 1; i <= nb; i++) bents.push(zc - L / 2 + (i * L) / (nb + 1));
    for (const z of bents) bent(c, z, H - deckT * s - ketaH, { xs: [-W * 0.36, 0, W * 0.36] });
    for (const sz of [-1, 1]) abutment(c, zc + sz * L / 2, H - deckT * s - ketaH, sz);
    for (const dx of [-W * 0.38, -W * 0.13, W * 0.13, W * 0.38]) P.box('dark', 0.16 * s, ketaH, L + 0.3 * s, x + dx, H - deckT * s - ketaH / 2, zc);
    planks(c, yAt, zc - L / 2, zc + L / 2);
    for (const sz of [-1, 1]) {
      const z0 = zc + sz * L / 2, z1 = zc + sz * (L / 2 + ramp);
      planks(c, yAt, Math.min(z0, z1), Math.max(z0, z1));
      for (const dx of [-W * 0.38, W * 0.38]) P.between('dark', V(x + dx, yAt(z0) - deckT * s - 0.08, z0), V(x + dx, yAt(z1) - deckT * s - 0.08, z1), { w: 0.14 * s, h: 0.16 * s });
    }
    const oya = [zc - L / 2 - ramp, zc - L / 2, ...bents, zc + L / 2, zc + L / 2 + ramp];
    for (const sd of [-1, 1]) {
      const rx = x + sd * (W / 2 - 0.07 * s);
      koran(P, { x: rx, z0: zc - L / 2 - ramp, z1: zc + L / 2 + ramp, yAt, oya, s });
      railSolids(c.solids, { x: rx, z0: zc - L / 2 - ramp, z1: zc + L / 2 + ramp, yAt, s });
    }
    lanterns(c, [zc - L / 2, zc + L / 2], H + 0.78 * s, 1);
    lanterns(c, [zc - L / 2, zc + L / 2], H + 0.78 * s, -1);
    deckSolids(c, yAt, W / 2 - 0.12 * s);
    const rx = x + (W / 2 - 0.07 * s);
    c.leap = { stand: { x: rx - 0.4 * s, z: zc + 0.2 }, rail: { x: rx, y: H + 1.0 * s }, dir: 1 };
    const b0 = bents[0];
    c.callouts.push(
      { id: 'giboshi', title: 'Giboshi', sub: '擬宝珠 · bronze cap, sacred jewel', pos: V(rx, yAt(b0) + 1.42 * s, b0) },
      { id: 'hokogi', title: 'Hokogi', sub: '架木 · top rail', pos: V(rx, H + 0.95 * s, zc + L * 0.36) },
      { id: 'hirageta', title: 'Hirageta', sub: '平桁 · middle rail', pos: V(rx, H + 0.5 * s, zc - L * 0.06) },
      { id: 'jifuku', title: 'Jifuku', sub: '地覆 · curb rail', pos: V(rx, H + 0.06 * s, zc + L * 0.14) },
      { id: 'tozuka', title: 'Tozuka & masu', sub: '斗束 · strut and bearing block', pos: V(rx, H + 0.82 * s, zc - L * 0.3) },
      { id: 'keta', title: 'Keta', sub: '桁 · the beams under the deck', pos: V(x + W * 0.38, H - 0.22 * s, zc + L * 0.05) },
      { id: 'hashigui', title: 'Hashigui', sub: '橋杭 · pier posts, wakes behind', pos: V(x + W * 0.36, c.level + 0.3, b0) },
      { id: 'shikiita', title: 'Shiki-ita', sub: '敷板 · deck planks, gaps between', pos: V(x - W * 0.2, H + 0.02, zc + 0.6) },
      { id: 'ishigaki', title: 'Ishigaki abutment', sub: '石垣 · dry-laid stone', pos: V(x - W * 0.2, H - 0.7 * s, zc + L / 2 + 0.1) }
    );
  },

  // Taikobashi / sorihashi: the drum bridge, whose reflection closes the circle
  taiko(c) {
    const { P, x, zc, L, W, s } = c;
    const g0 = Math.max(c.groundAt(x, zc - L / 2), c.groundAt(x, zc + L / 2)) + 0.08;
    const f = 1.95 * s, Rc = (L * L / 4 + f * f) / (2 * f);
    const arc = (dz) => g0 + Math.sqrt(Math.max(0, Rc * Rc - dz * dz)) - (Rc - f);
    const yAt = (z) => arc(Math.max(-L / 2, Math.min(L / 2, z - zc)));
    c.ramp = 0;
    planks(c, yAt, zc - L / 2, zc + L / 2, { pitch: 0.24 });
    // cleats where it gets steep
    for (let z = zc - L / 2 + 0.12; z < zc + L / 2; z += 0.24 * s * 2) {
      const sl = Math.abs(yAt(z + 0.05) - yAt(z - 0.05)) / 0.1;
      if (sl > 0.35) P.box('dark', W * 0.8, 0.035 * s, 0.045 * s, x, yAt(z) + 0.015 * s, z, { rx: -Math.atan((yAt(z + 0.05) - yAt(z - 0.05)) / 0.1) });
    }
    // laminated arch ribs under the deck
    const n = 22;
    for (const dx of [-W * 0.36, W * 0.36]) for (let i = 0; i < n; i++) {
      const za = zc - L / 2 + (L * i) / n, zb = zc - L / 2 + (L * (i + 1)) / n;
      P.between('lacquer', V(x + dx, yAt(za) - 0.17 * s, za), V(x + dx, yAt(zb) - 0.17 * s, zb), { w: 0.16 * s, h: 0.22 * s });
    }
    for (const dz of [-L * 0.27, L * 0.27]) bent(c, zc + dz, yAt(zc + dz) - 0.28 * s, { xs: [-W * 0.36, W * 0.36], key: 'lacquer', braces: false });
    for (const sz of [-1, 1]) abutment(c, zc + sz * L / 2, g0 - 0.04, sz);
    const oya = [zc - L / 2, zc - L * 0.27, zc, zc + L * 0.27, zc + L / 2];
    for (const sd of [-1, 1]) {
      const rx = x + sd * (W / 2 - 0.07 * s);
      koran(P, { x: rx, z0: zc - L / 2, z1: zc + L / 2, yAt, oya, s, key: 'lacquer', step: 0.7 });
      railSolids(c.solids, { x: rx, z0: zc - L / 2, z1: zc + L / 2, yAt, s });
    }
    c.solids.push(rectSolid({ x0: x - W / 2 + 0.12 * s, x1: x + W / 2 - 0.12 * s, z0: zc - L / 2, z1: zc + L / 2, top: (px, pz) => yAt(pz), bottom: (px, pz) => yAt(pz) - 0.4, kind: 'deck', name: 'the arch' }));
    const rx = x + (W / 2 - 0.07 * s);
    c.leap = { stand: { x: rx - 0.4 * s, z: zc + 0.15 }, rail: { x: rx, y: yAt(zc) + 1.0 * s }, dir: 1 };
    c.ends = [1, -1].map((sz) => ({ foot: { x, z: zc + sz * (L / 2 + 0.7) }, top: { x, z: zc + sz * (L / 2 - 0.3) } }));
    c.callouts.push(
      { id: 'arc', title: 'Sorihashi', sub: '反橋 · steep enough to need cleats', pos: V(x, yAt(zc) + 0.15, zc) },
      { id: 'drum', title: 'Taikobashi', sub: '太鼓橋 · arc + reflection = a drum', pos: V(x + W * 0.6, c.level + 0.05, zc + L * 0.18) },
      { id: 'giboshi', title: 'Giboshi', sub: '擬宝珠', pos: V(rx, yAt(zc - L / 2) + 1.4 * s, zc - L / 2) },
      { id: 'shu', title: 'Shu-nuri lacquer', sub: '朱塗 · vermilion', pos: V(x - W * 0.36, yAt(zc + L * 0.36) - 0.25, zc + L * 0.36) }
    );
  },

  // Yatsuhashi: eight planks in a zigzag, low over the irises
  yatsuhashi(c) {
    const { P, x, zc, L, s, level } = c;
    const top = level + 0.27 * s, n = 8, span = L + 0.8 * s, a = 0.42;
    const dz = span / n, off = dz * Math.tan(a);
    let px = x - off / 2, pz = zc - span / 2;
    for (let i = 0; i < n; i++) {
      const nx = i % 2 ? x - off / 2 : x + off / 2, nz = pz + dz;
      const cx = (px + nx) / 2, cz = (pz + nz) / 2, len = Math.hypot(nx - px, nz - pz) + 0.12 * s, ang = Math.atan2(nx - px, nz - pz);
      P.box('wood', 0.36 * s, 0.07 * s, len, cx, top - 0.035 * s, cz, { ry: ang });
      for (const sd of [-1, 1]) {
        const qx = nx + Math.cos(ang) * sd * 0.2 * s, qz = nz - Math.sin(ang) * sd * 0.2 * s;
        if (i < n - 1) {
          P.cyl('dark', 0.05 * s, top - c.bedAt(qx, qz) + 0.1, qx, (top + c.bedAt(qx, qz) - 0.1) / 2 - 0.05, qz, { seg: 8 });
          c.obstacles.push({ x: qx, z: qz, r: 0.05 * s });
        }
      }
      c.solids.push(obbSolid({ cx, cz, ang, hl: len / 2 + 0.05, hw: 0.2 * s, top, bottom: top - 0.12, kind: 'plank', name: 'a zigzag plank' }));
      if (i === 3) c.leap = { stand: { x: cx, z: cz }, rail: null, dir: 1 };
      px = nx; pz = nz;
    }
    // kakitsubata in the shallows along both banks
    for (let k = 0; k < 26; k++) {
      const side = k % 2 ? 1 : -1, t = P.rnd();
      const ix = x + (P.rnd() - 0.5) * 3.2 * s, iz = zc + side * (span / 2 - 0.3 - t * 1.6 * s);
      const d = level - c.bedAt(ix, iz);
      if (d < 0.02 || d > 0.4) continue;
      iris(P, ix, c.bedAt(ix, iz), iz, s * (0.8 + P.rnd() * 0.4));
    }
    c.ramp = 0;
    c.ends = [1, -1].map((sz) => ({ foot: { x: x + (sz > 0 ? off / 2 : -off / 2), z: zc + sz * (span / 2 + 0.6) }, top: { x: x + (sz > 0 ? off / 2 : -off / 2), z: zc + sz * (span / 2 - 0.3) } }));
    c.callouts.push(
      { id: 'zig', title: 'Yatsuhashi', sub: '八橋 · eight planks, The Tales of Ise', pos: V(x, top + 0.2, zc) },
      { id: 'iris', title: 'Kakitsubata', sub: '杜若 · irises in early May', pos: V(x + 1.2 * s, level + 0.6, zc - span / 2 + 0.8) }
    );
  },

  // Ippon-bashi: one granite slab per span, no railing (Shirakawa's Gyōja-bashi)
  ippon(c) {
    const { P, x, zc, L, s, level } = c;
    const top = level + 0.6 * s, w = 0.56 * s, t = 0.2 * s;
    for (const sz of [-1, 1]) P.box('stone', w, t, L / 2 + 0.2 * s, x, top - t / 2, zc + sz * (L / 4), { tex: 0.8 });
    // the pier: three courses of dressed blocks
    const pb = c.bedAt(x, zc) - 0.2;
    const ch = (top - t - pb) / 3;
    for (let k = 0; k < 3; k++) P.box('stone', 0.86 * s - k * 0.06, ch - 0.02, 0.7 * s - k * 0.05, x, pb + ch * (k + 0.5), zc, { tex: 0.8 });
    c.obstacles.push({ x, z: zc, r: 0.45 * s });
    c.solids.push(rectSolid({ x0: x - 0.43 * s, x1: x + 0.43 * s, z0: zc - 0.35 * s, z1: zc + 0.35 * s, top: top - t, bottom: -20, walk: false, kind: 'pier' }));
    for (const sz of [-1, 1]) {
      const ze = zc + sz * (L / 2 + 0.05), g = c.groundAt(x, ze);
      P.box('stone', 1.1 * s, top - t - g + 0.25, 0.7 * s, x, (top - t + g - 0.25) / 2, ze, { tex: 0.8 });
      // hashibasami-ishi: the four corner stones that pin a stone bridge
      for (const sd of [-1, 1]) P.box('stone', 0.22 * s, 0.62 * s, 0.22 * s, x + sd * 0.45 * s, top + 0.12 * s, ze + sz * 0.12 * s, { tex: 0.8 });
      const stepZ = ze + sz * 0.6 * s, gs = c.groundAt(x, stepZ);
      P.box('stone', 0.7 * s, (top - gs) / 2 + 0.2, 0.5 * s, x, gs + (top - gs) / 4 - 0.1, stepZ, { tex: 0.8 });
      c.solids.push(rectSolid({ x0: x - 0.35 * s, x1: x + 0.35 * s, z0: stepZ - 0.25 * s, z1: stepZ + 0.25 * s, top: gs + (top - gs) / 2, kind: 'step', name: 'a stone step' }));
      for (const sd of [-1, 1]) c.solids.push(rectSolid({ x0: x + sd * 0.45 * s - 0.11 * s, x1: x + sd * 0.45 * s + 0.11 * s, z0: ze + sz * 0.12 * s - 0.11 * s, z1: ze + sz * 0.12 * s + 0.11 * s, top: top + 0.43 * s, kind: 'post', name: 'a hashibasami-ishi' }));
    }
    c.solids.push(rectSolid({ x0: x - w / 2, x1: x + w / 2, z0: zc - L / 2 - 0.25, z1: zc + L / 2 + 0.25, top, bottom: top - t, kind: 'slab', name: 'the slab' }));
    c.ramp = 0;
    c.ends = [1, -1].map((sz) => ({ foot: { x, z: zc + sz * (L / 2 + 1.2 * s) }, top: { x, z: zc + sz * (L / 2 - 0.3) } }));
    c.leap = { stand: { x, z: zc + L * 0.22 }, rail: null, dir: 1 };
    c.callouts.push(
      { id: 'slab', title: 'Ippon-bashi', sub: '一本橋 · one slab, no railing', pos: V(x, top + 0.1, zc + L * 0.3) },
      { id: 'hasami', title: 'Hashibasami-ishi', sub: '橋挟石 · corner stones', pos: V(x + 0.45 * s, top + 0.5 * s, zc - L / 2) }
    );
  },

  // Nagare-bashi (Kōzuya-bashi, Yawata): the deck floats off in a flood and swings on its tethers
  nagare(c) {
    const { x, zc, L, s } = c;
    const Hn = c.level + 0.74 * s, n = 4, ls = L / n, w = 1.5 * s;
    c.ramp = 0;
    const piers = [];
    for (let j = 0; j <= n; j++) piers.push(zc - L / 2 + j * ls);
    for (const z of piers) bent(c, z, Hn - 0.1 * s, { xs: [-0.55 * s, 0.55 * s], r: 0.09, braces: false });
    const sections = [];
    for (let j = 0; j < n; j++) {
      const P = new Parts(40 + j);
      const pivot = { x: x - 0.55 * s, z: piers[j] };
      // local frame: origin at the tether post, the section runs along +z
      const lp = (lx, ly, lz) => [lx, ly, lz];
      for (let k = 0; k < Math.round(ls / (0.27 * s)); k++) {
        const lz = (k + 0.5) * (ls / Math.round(ls / (0.27 * s)));
        P.box('wood', w, 0.06 * s, ls / Math.round(ls / (0.27 * s)) - 0.012 * s, ...lp(0.55 * s, 0.03 * s, lz), { rx: (P.rnd() - 0.5) * 0.01 });
      }
      for (const dx of [0.15 * s, 0.95 * s]) P.box('dark', 0.13 * s, 0.14 * s, ls - 0.04 * s, dx, -0.07 * s, ls / 2);
      const grp = new THREE.Group();
      grp.add(P.build(c.mats));
      grp.position.set(pivot.x, Hn, pivot.z);
      c.extra.push(grp);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(0, 0, 0)]), new THREE.LineBasicMaterial({ color: 0x1c1c1c }));
      line.frustumCulled = false;
      c.extra.push(line);
      const sec = { grp, pivot, y: Hn, vy: 0, th: 0, vth: 0, line, ls, w };
      const solid = obbSolid({ cx: 0, cz: 0, ang: 0, hl: ls / 2, hw: w / 2, top: () => sec.y + 0.065 * s, bottom: () => sec.y - 0.14 * s, kind: 'deck', name: 'a floating section' });
      solid.moving = true;
      sec.solid = solid;
      c.solids.push(solid);
      sections.push(sec);
    }
    const place = (sec) => {
      const cth = Math.cos(sec.th), sth = Math.sin(sec.th);
      // centre of the section in world: pivot + R(th) * (0.55 w-offset, ls / 2)
      sec.solid.cx = sec.pivot.x + 0.55 * s * cth + (sec.ls / 2) * sth;
      sec.solid.cz = sec.pivot.z - 0.55 * s * sth + (sec.ls / 2) * cth;
      sec.solid.ang = sec.th;
      sec.grp.position.y = sec.y;
      sec.grp.rotation.y = sec.th;
      const pos = sec.line.geometry.attributes.position;
      pos.setXYZ(0, sec.pivot.x, Hn + 0.1 * s, sec.pivot.z);
      pos.setXYZ(1, sec.pivot.x + 0.1 * cth, sec.y + 0.04, sec.pivot.z - 0.1 * sth);
      pos.needsUpdate = true;
    };
    sections.forEach(place);
    c.movers.push((dt, t, level) => {
      const lift = level - (Hn - 0.16 * s);
      for (const [i, sec] of sections.entries()) {
        const floating = lift > 0;
        const ty = floating ? level + 0.05 * s + Math.sin(t * 1.3 + i) * 0.01 : Hn;
        const tth = floating ? Math.min(1.25, lift * 3.2) * (1 - i * 0.06) : 0;
        sec.vy += ((ty - sec.y) * 18 - sec.vy * 6) * dt;
        sec.y += sec.vy * dt;
        sec.vth += ((tth - sec.th) * 3.2 - sec.vth * 2.2) * dt;
        sec.th += sec.vth * dt;
        place(sec);
      }
    });
    c.leap = { stand: { x: x + 0.45 * s, z: zc + ls * 0.5 }, rail: null, dir: 1 };
    c.ends = [1, -1].map((sz) => ({ foot: { x, z: zc + sz * (L / 2 + 0.7) }, top: { x, z: zc + sz * (L / 2 - 0.4) } }));
    for (const sz of [-1, 1]) {
      const ze = zc + sz * (L / 2 + 0.25), g = c.groundAt(x, ze);
      c.P.box('stone', 1.8 * s, Hn - g + 0.2, 0.5 * s, x, (Hn + g - 0.2) / 2 - 0.02, ze, { tex: 0.8 });
      c.solids.push(rectSolid({ x0: x - 0.9 * s, x1: x + 0.9 * s, z0: ze - 0.25 * s, z1: ze + 0.25 * s, top: Hn, kind: 'step', name: 'the landing' }));
    }
    c.callouts.push(
      { id: 'float', title: 'Nagare-bashi', sub: '流れ橋 · raise the water', pos: V(x + 0.5, Hn + 0.3, zc - ls) },
      { id: 'wire', title: 'Tethered sections', sub: 'wired to the piers, not fixed', pos: V(x - 0.55 * s, Hn + 0.15, zc + ls) }
    );
  },

  // Uji-bashi: a long gentle bow and the san-no-ma platform jutting upstream
  uji(c) {
    const { P, x, zc, L, W, H, s, ramp } = c;
    const bow = 0.32 * s;
    const yAt = profile(c, (dz) => H + bow * (1 - (dz / (L / 2)) ** 2));
    const ketaH = 0.24 * s, deckT = 0.065;
    const bents = [-0.3, 0, 0.3].map((k) => zc + k * L);
    for (const z of bents) bent(c, z, yAt(z) - deckT * s - ketaH, { xs: [-W * 0.36, 0, W * 0.36] });
    for (const sz of [-1, 1]) abutment(c, zc + sz * L / 2, H - deckT * s - ketaH, sz);
    const nseg = 16;
    for (const dx of [-W * 0.38, -W * 0.13, W * 0.13, W * 0.38]) for (let i = 0; i < nseg; i++) {
      const za = zc - L / 2 + (L * i) / nseg, zb = zc - L / 2 + (L * (i + 1)) / nseg;
      P.between('dark', V(x + dx, yAt(za) - deckT * s - ketaH / 2, za), V(x + dx, yAt(zb) - deckT * s - ketaH / 2, zb), { w: 0.15 * s, h: ketaH });
    }
    planks(c, yAt, zc - L / 2 - ramp, zc + L / 2 + ramp);
    // san-no-ma: 1.4 m out on the upstream (-x) side at mid-span
    const sy = yAt(zc), sx0 = x - W / 2 - 1.35 * s, sx1 = x - W / 2 + 0.05;
    const sz0 = zc - 0.8 * s, sz1 = zc + 0.8 * s;
    for (let k = 0; k < 6; k++) P.box('wood', (sx1 - sx0) / 6 - 0.012, 0.065 * s, sz1 - sz0, sx0 + (sx1 - sx0) * ((k + 0.5) / 6), sy - 0.033 * s, zc);
    for (const z of [sz0 + 0.1, sz1 - 0.1]) {
      P.between('dark', V(sx0 + 0.15, c.bedAt(sx0 + 0.15, z) - 0.2, z), V(sx0 + 0.15, sy - 0.08, z), { r: 0.1 * s });
      c.obstacles.push({ x: sx0 + 0.15, z, r: 0.11 * s });
      P.box('dark', sx1 - sx0, 0.16 * s, 0.14 * s, (sx0 + sx1) / 2, sy - 0.15 * s, z);
    }
    const flat = () => sy;
    const oya = [zc - L / 2 - ramp, zc - L / 2, ...bents, zc + L / 2, zc + L / 2 + ramp];
    koran(P, { x: x + (W / 2 - 0.07 * s), z0: zc - L / 2 - ramp, z1: zc + L / 2 + ramp, yAt, oya, s });
    railSolids(c.solids, { x: x + (W / 2 - 0.07 * s), z0: zc - L / 2 - ramp, z1: zc + L / 2 + ramp, yAt, s });
    koran(P, { x: x - (W / 2 - 0.07 * s), z0: zc - L / 2 - ramp, z1: zc + L / 2 + ramp, yAt, oya: [...oya, sz0, sz1], s, skip: [sz0 + 0.01, sz1 - 0.01] });
    railSolids(c.solids, { x: x - (W / 2 - 0.07 * s), z0: zc - L / 2 - ramp, z1: zc + L / 2 + ramp, yAt, s, skip: [sz0, sz1] });
    koran(P, { x: sx0 + 0.07 * s, z0: sz0, z1: sz1, yAt: flat, oya: [sz0, sz1], s });
    railSolids(c.solids, { x: sx0 + 0.07 * s, z0: sz0, z1: sz1, yAt: flat, s });
    // the short sides of the platform run across x: draw them as rails along x
    for (const z of [sz0, sz1]) {
      P.between('koran', V(sx0 + 0.07, sy + 0.95 * s, z), V(sx1, sy + 0.95 * s, z), { r: 0.048 * s });
      P.between('koran', V(sx0 + 0.07, sy + 0.5 * s, z), V(sx1, sy + 0.5 * s, z), { w: 0.05 * s, h: 0.08 * s });
      P.between('koran', V(sx0 + 0.07, sy + 0.06 * s, z), V(sx1, sy + 0.06 * s, z), { w: 0.1 * s, h: 0.11 * s });
      c.solids.push(rectSolid({ x0: sx0, x1: sx1 - 0.15, z0: z - 0.07, z1: z + 0.07, top: sy + 1.0 * s, bottom: sy, walk: false, kind: 'rail' }));
    }
    c.solids.push(rectSolid({ x0: sx0, x1: sx1, z0: sz0, z1: sz1, top: sy, bottom: sy - 0.3, kind: 'deck', name: 'the san-no-ma' }));
    lanterns(c, [zc - L / 2, zc + L / 2], H + 0.78 * s, 1);
    deckSolids(c, yAt, W / 2 - 0.12 * s);
    c.leap = { stand: { x: sx0 + 0.5 * s, z: zc }, rail: { x: sx0 + 0.07 * s, y: sy + 1.0 * s }, dir: -1 };
    c.callouts.push(
      { id: 'sannoma', title: 'San-no-ma', sub: '三の間 · tea water was drawn here', pos: V(sx0 + 0.3, sy + 1.2 * s, zc) },
      { id: 'bow', title: 'A gentle bow', sub: `rises ${Math.round(bow * 100)} cm over the span`, pos: V(x + W / 2, yAt(zc) + 1.15 * s, zc + L * 0.3) },
      { id: 'giboshi', title: 'Giboshi', sub: '擬宝珠', pos: V(x + W / 2 - 0.07, yAt(zc + L / 2) + 1.45 * s, zc + L / 2) }
    );
  },

  // no bridge: Michi crosses on the kame-ishi instead
  stones(c) {
    c.ramp = 0;
    c.leap = null;
    c.ends = [];
  }
};

/** Kakitsubata: a fan of sword leaves and one or two flowers with three falls. */
export function iris(P, x, y, z, s = 1) {
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / (n - 1) - 0.5) * 0.9, h = (0.55 + P.rnd() * 0.25) * s;
    P.box('iris', 0.035 * s, h, 0.006, x + Math.sin(a) * 0.05, y + h / 2, z, { rz: a * 0.5, ry: 0.3 + P.rnd() * 0.2 });
  }
  const fy = y + 0.62 * s;
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    P.box('irisFlower', 0.05 * s, 0.006, 0.09 * s, x + Math.cos(a) * 0.045 * s, fy - 0.02 * s, z + Math.sin(a) * 0.045 * s, { ry: -a + Math.PI / 2, rx: 0.5 });
    P.box('irisFlower', 0.025 * s, 0.07 * s, 0.006, x + Math.cos(a + 1) * 0.02 * s, fy + 0.03 * s, z + Math.sin(a + 1) * 0.02 * s, { ry: -a });
  }
}

/**
 * Build a bridge. o: { type, x, zc, L, W, H, ramp, level, s, bedAt, groundAt, mats, seed }.
 * Returns { group, solids, obstacles, callouts, lights, leap, ends, update(dt, t, level) }.
 */
export function buildBridge(type, o) {
  const c = ctx(o);
  (BUILDERS[type] || BUILDERS.sanjo)(c);
  const group = c.P.build(o.mats);
  for (const e of c.extra) group.add(e);
  group.name = 'bridge-' + type;
  return {
    type, group, solids: c.solids, obstacles: c.obstacles, callouts: c.callouts, lights: c.lights,
    leap: c.leap ?? null, ends: c.ends ?? ends(c),
    update: (dt, t, level) => { for (const m of c.movers) m(dt, t, level); },
    dispose() { group.traverse((m) => { if (m.isMesh || m.isLine) m.geometry.dispose(); }); }
  };
}
