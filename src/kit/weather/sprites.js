// Point sprites for the weather family: one THREE.Points per effect (one draw),
// moved by the game's own update (Particles.update writes `position`), dressed
// here. The kit adds what a square GL point cannot do alone: a per-sprite size,
// a tumble (spin + flip) and a blink, all in the shader, driven by one clock.
//
// Ruling R9 / spawn volumes: a layout hands `positions` (xyz per sprite) and
// `seeds`; these builders never decide where a sprite lives, so s4-summit-life
// can hand the same builders a different volume (see weatherCloud()).
// Nothing here reads Math.random or Date.now.
import * as THREE from 'three';
import { canvas2d, canvasTexture, rng as seeded } from '../craft.js?v=20261113a';

/* ------------------------------------------------------------------ calm --- */

/** True when the comfort setting asks for less motion (Game.applyComfort toggles body.reduce-motion). */
export function reducedMotion() {
  try { return typeof document !== 'undefined' && !!document.body && document.body.classList.contains('reduce-motion'); } catch (e) { return false; }
}

/** How much of its motion a weather system keeps when the comfort setting is on. */
export const CALM = 0.3;

/* -------------------------------------------------------------- textures --- */

const cache = new WeakMap();
/** One texture per KitMaterials set, shared by every instance, never disposed by one. */
export function sharedTexture(km, key, make) {
  const owner = km && typeof km === 'object' ? km : cache;
  let bag = cache.get(owner);
  if (!bag) { bag = new Map(); cache.set(owner, bag); }
  if (!bag.has(key)) { const t = make(); t.userData.kit = true; bag.set(key, t); }
  return bag.get(key);
}

/** A sakura petal with the notch at its tip: blush at the rim, near white at the base, a faint vein. */
export function petalTexture(km) {
  return sharedTexture(km, 'petal', () => {
    const [c, x] = canvas2d(64, 64);
    x.translate(32, 32);
    const body = () => {
      x.beginPath();
      x.moveTo(-18, 0);
      x.bezierCurveTo(-14, -15, 6, -17, 17, -5);
      x.lineTo(20, -1);             // the notch
      x.lineTo(17, 3);
      x.bezierCurveTo(8, 16, -14, 14, -18, 0);
      x.closePath();
    };
    const g = x.createLinearGradient(-18, 0, 20, 0);
    g.addColorStop(0, 'rgba(255,240,244,1)'); g.addColorStop(0.55, 'rgba(250,206,219,1)'); g.addColorStop(1, 'rgba(240,160,184,1)');
    x.fillStyle = g; body(); x.fill();
    x.strokeStyle = 'rgba(214,120,150,0.38)'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(-14, 0); x.quadraticCurveTo(2, -1, 15, 0); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(-12, -6); x.quadraticCurveTo(0, -11, 10, -6); x.stroke();
    return canvasTexture(c);
  });
}

/** A soft flake: a bright core, a faint six-armed crystal behind it. */
export function flakeTexture(km) {
  return sharedTexture(km, 'flake', () => {
    const [c, x] = canvas2d(64, 64);
    x.translate(32, 32);
    x.strokeStyle = 'rgba(232,244,255,0.5)'; x.lineWidth = 1.6; x.lineCap = 'round';
    for (let i = 0; i < 3; i++) { x.rotate(Math.PI / 3); x.beginPath(); x.moveTo(-17, 0); x.lineTo(17, 0); x.stroke(); }
    x.setTransform(1, 0, 0, 1, 0, 0);
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 22);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(240,248,255,0.8)');
    g.addColorStop(0.7, 'rgba(215,235,255,0.22)'); g.addColorStop(1, 'rgba(200,225,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return canvasTexture(c);
  });
}

/** A glow: a hot core and a wide halo in `rgb` ("255, 230, 140"). `core` is the white-hot centre. */
export function glowTexture(km, key, rgb, core = 0.18) {
  return sharedTexture(km, `glow:${key}`, () => {
    const [c, x] = canvas2d(64, 64);
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 31);
    g.addColorStop(0, 'rgba(255,255,248,1)'); g.addColorStop(core, `rgba(${rgb},0.95)`);
    g.addColorStop(0.42, `rgba(${rgb},0.34)`); g.addColorStop(0.75, `rgba(${rgb},0.07)`); g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return canvasTexture(c);
  });
}

/* ------------------------------------------------------------ the shader --- */

// Per-sprite data rides on attributes a Points object never uses for lighting,
// so each sprite carries its own look and the contract test can see it:
//   uv      = (seed, size in metres)        normal = (spin, flip, blink)
const VERT_DECL = `#include <common>
varying float vSeed;
varying vec3 vFx;`;
const FRAG_DECL = `#include <common>
varying float vSeed;
varying vec3 vFx;
uniform float uTime;
uniform float uCalm;
uniform float uRate;`;
const FRAG_MAP = `
#ifdef USE_MAP
  vec2 pc = gl_PointCoord - 0.5;
  float ang = vSeed * 6.2831853 + uTime * vFx.x * (0.55 + vSeed);
  float cs = cos(ang), sn = sin(ang);
  pc = vec2(cs * pc.x - sn * pc.y, sn * pc.x + cs * pc.y);
  pc.x /= mix(1.0, 0.3 + 0.7 * abs(sin(uTime * (0.7 + vSeed) + vSeed * 17.0)), vFx.y);
  pc += 0.5;
  vec4 sprite = texture2D( map, vec2( pc.x, 1.0 - pc.y ) );
  float blink = 0.5 + 0.5 * sin(uTime * uRate * (0.7 + vSeed) + vSeed * 40.0);
  float bk = vFx.z * uCalm;
  sprite.a *= mix(1.0, blink * blink, bk);
  sprite.rgb *= mix(1.0, 0.55 + 0.9 * blink, bk);
  diffuseColor *= sprite;
#endif`;

/**
 * Dress a PointsMaterial: the per-sprite size, tumble (spin + flip) and blink
 * come from the geometry (above); the shader clock is one uniform. Opacity,
 * colour and fog stay PointsMaterial's, so the game's `material.opacity` ramps
 * keep working. Returns the uniforms.
 */
function dress(mat, rate) {
  const u = { uTime: { value: 0 }, uCalm: { value: 1 }, uRate: { value: rate } };
  mat.userData.u = u;
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, u);
    s.vertexShader = s.vertexShader
      .replace('#include <common>', VERT_DECL)
      .replace('gl_PointSize = size;', 'vSeed = uv.x; vFx = normal; gl_PointSize = size * uv.y;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', FRAG_DECL)
      .replace('#include <map_particle_fragment>', FRAG_MAP);
  };
  mat.customProgramCacheKey = () => 'kit-weather-sprite';
  return u;
}

const TIER_FX = {
  hero: { spin: 1, flip: 1, blink: 1 },
  mid: { spin: 1, flip: 0, blink: 1 },
  far: { spin: 0, flip: 0, blink: 0 }
};

/**
 * A cloud of sprites as one Points object.
 *   layout.positions   Float32Array xyz (the game's update moves it)
 *   o.size             base size in metres at 1 m
 *   o.sizeVar          0..1: each sprite is size x (1 +/- sizeVar)
 *   o.spin, o.flip, o.blink   fx strengths (scaled by the tier); o.rate blink rate in rad/s
 *   o.tints            optional hex list: a vertex colour per sprite, drawn from ctx.rng
 *   o.additive         additive blending (glows) vs normal (petals, flakes)
 * Returns { points, material, uniforms, step(t, calm), dispose }.
 */
export function weatherCloud(ctx, layout, o) {
  const { tier, kitMaterials: km } = ctx;
  const r = ctx.rng;
  const pos = layout.positions;
  const n = pos.length / 3;
  const fx = TIER_FX[tier] || TIER_FX.mid;
  const geo = new THREE.BufferGeometry();
  const attr = new THREE.BufferAttribute(pos, 3);
  attr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', attr);
  const uv = new Float32Array(n * 2), fxa = new Float32Array(n * 3);
  const sv = o.sizeVar ?? 0.4;
  for (let i = 0; i < n; i++) {
    const seed = r();
    uv[i * 2] = seed; uv[i * 2 + 1] = o.size * (1 - sv + 2 * sv * seed);
    fxa[i * 3] = (o.spin || 0) * fx.spin; fxa[i * 3 + 1] = (o.flip || 0) * fx.flip; fxa[i * 3 + 2] = (o.blink || 0) * fx.blink;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('normal', new THREE.BufferAttribute(fxa, 3));
  if (o.tints) {
    const col = new Float32Array(n * 3), c = new THREE.Color();
    for (let i = 0; i < n; i++) { c.set(o.tints[Math.floor(r() * o.tints.length)]); col.set([c.r, c.g, c.b], i * 3); }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const mat = new THREE.PointsMaterial({
    map: o.map, size: 1, transparent: true, opacity: o.opacity ?? 1, depthWrite: false, sizeAttenuation: true,
    vertexColors: !!o.tints, blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending
  });
  const u = dress(mat, o.rate || 2);
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  let clock = 0, last = null;
  return {
    points, material: mat, uniforms: u, count: layout.count || n,
    /** Advance the shader clock; `calm` (0..1) slows the tumble and the blink with the comfort setting. */
    step(t, calm = 1) {
      if (last === null) last = t;
      clock += Math.max(0, t - last) * calm; last = t;
      u.uTime.value = clock;
      u.uCalm.value = calm < 1 ? 0.35 : 1;
    },
    dispose() { geo.dispose(); mat.dispose(); }
  };
}

/** The usual instance wrapper for one cloud: part `points`, free (not on the ground), calm-aware update. */
export function cloudInstance(cloud, extra = {}) {
  const group = new THREE.Group();
  group.add(cloud.points);
  return {
    group, parts: { points: cloud.points }, live: [cloud.points],
    update(dt, t, env) { cloud.step(t, reducedMotion() ? CALM : 1); if (extra.update) extra.update(dt, t, env, cloud); },
    dispose() { cloud.dispose(); }
  };
}

/** Deterministic spawn volume for samples and for lanes that want their own weather: a box of `count` sprites. */
export function boxVolume(count, { w = 40, h = 12, d = 40, y0 = 0, cx = 0, cz = 0, seed = 1, verts = 1 } = {}) {
  const r = seeded(seed), positions = new Float32Array(count * verts * 3), seeds = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const x = cx + (r() - 0.5) * w, y = y0 + r() * h, z = cz + (r() - 0.5) * d;
    for (let v = 0; v < verts; v++) positions.set([x, y + v * 0.4, z], (i * verts + v) * 3);
    seeds.set([r() * 100, 0.5 + r(), r() * 6.28], i * 3);
  }
  return { index: 0, x: 0, y: 0, z: 0, count, positions, seeds, footprint: {} };
}
