// The light every water surface of the family shares: one uniform set per
// KitMaterials (river, paddies and rice read the same objects, as the classic
// paddies share the river's `riverUniforms`), synced once per frame by
// whichever instance updates first.
//
// Where the light comes from. The classic river is driven by
// Countryside.update() from the Sky (`sunDir`, `resolvePalette()`); a kit
// instance only receives env = { hour, wind, wet, snow, lanternOn }. So sync()
// reads the Sky's own dome uniforms (the mesh named 'Sky Dome': sunDir,
// sunColor, horizonColor, topColor, warmColor; the values the classic river
// copies from the same palette every frame), found once by walking up from the
// instance to the scene. Without a dome (the contract test, a lab page) it
// falls back to the Sky's sun path and base palettes from `env.hour`.
// Integrator option (handoff): pass the Sky's sunDir and palette in env and
// sync() prefers them.
//
// Ripple rings: the cat's and the koi's rings are meshes of the
// `water-ripples` pool (kit parts `asset:water-ripples/ring_N`, or the
// classic 'Ripple Ring N'), found in the same walk. Each frame the visible
// ones are copied into `uRip`, so the water itself carries the wave train
// under each ring (normals, a crest highlight), on either ripple set.
import * as THREE from 'three';

export const MAX_RINGS = 16;
const RING_NAME = /^(?:Ripple Ring \d+|asset:water-ripples\/ring_\d+)$/;

// Sky.buildPalettes() base colours (day / sunset / night), for the fallback only.
const PAL = {
  day: { top: 0x5b86c6, horizon: 0xffd6a0, warm: 0xffb264, sun: 0xffe6b8 },
  sunset: { top: 0x4a5aa6, horizon: 0xff9a4c, warm: 0xff8838, sun: 0xffc27a },
  night: { top: 0x0c1630, horizon: 0x384c72, warm: 0x24355c, sun: 0x7a90be }
};
const _a = new THREE.Color(), _b = new THREE.Color();
function lerpPal(out, key, A, B, t) { out.copy(_a.set(A[key])).lerp(_b.set(B[key]), t); }

/** Sky.updateDayNight()'s sun path (daylight 6:00–19:12), the same as materials.js nightnessAt(). */
export function sunDirAt(hour, out = new THREE.Vector3()) {
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

/** Sky.getDayPhase() blended into top / horizon / warm / sun (no weather). */
function palAt(hour, u) {
  const t = (((hour % 24) + 24) % 24) / 24;
  let A = PAL.night, B = PAL.night, k = 0;
  if (t < 0.2) { A = B = PAL.night; }
  else if (t < 0.3) { A = PAL.night; B = PAL.day; k = (t - 0.2) / 0.1; }
  else if (t < 0.72) { A = B = PAL.day; }
  else if (t < 0.775) { A = PAL.day; B = PAL.sunset; k = (t - 0.72) / 0.055; }
  else if (t < 0.83) { A = PAL.sunset; B = PAL.night; k = (t - 0.775) / 0.055; }
  lerpPal(u.uTop.value, 'top', A, B, k);
  lerpPal(u.uSky.value, 'horizon', A, B, k);
  lerpPal(u.uWarm.value, 'warm', A, B, k);
  lerpPal(u.uSunColor.value, 'sun', A, B, k);
}

export class WaterSky {
  constructor() {
    this.u = {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(-0.55, 0.28, -0.79) },
      uSunColor: { value: new THREE.Color(0xffe6b8) },
      uSky: { value: new THREE.Color(0xffc98a) },
      uTop: { value: new THREE.Color(0x4a6a9e) },
      uWarm: { value: new THREE.Color(0xffb264) },
      uDusk: { value: 0 },
      uDay: { value: 1 },
      uMoonDir: { value: new THREE.Vector3(0.3, 0.8, -0.3) },
      uMoonI: { value: 0 },
      uRain: { value: 0 },
      uSnow: { value: 0 },
      uWind: { value: 1 },
      uRip: { value: Array.from({ length: MAX_RINGS }, () => new THREE.Vector4()) }
    };
    this.stamp = NaN;
    this.root = null;
    this.dome = null;
    this.rings = [];
    this.searchedAt = -Infinity;
  }

  /** Find the Sky's dome uniforms and the ripple rings under `root` (one walk, repeated only while the dome is missing). */
  discover(root, t) {
    if (root !== this.root) { this.root = root; this.dome = null; this.rings = []; this.searchedAt = -Infinity; }
    if (!root || this.dome || t - this.searchedAt < 2) return;
    this.searchedAt = t;
    const rings = [];
    root.traverse((o) => {
      if (!this.dome && o.isMesh && o.material && o.material.uniforms) {
        const u = o.material.uniforms;
        if (u.horizonColor && u.topColor && u.sunDir && u.sunColor && (o.name === 'Sky Dome' || u.warmColor)) this.dome = u;
      }
      if (o.isMesh && RING_NAME.test(o.name)) rings.push(o);
    });
    this.rings = rings;
  }

  /** Once per frame (t is the game clock): light, weather and rings for every water surface. */
  sync(t, env = {}, root = null) {
    if (t === this.stamp && root === this.root) return;
    this.stamp = t;
    const u = this.u;
    u.uTime.value = t;
    this.discover(root, t);
    const sun = u.uSunDir.value;
    if (env.sunDir && env.palette) {
      sun.copy(env.sunDir);
      u.uSunColor.value.copy(env.palette.sun); u.uSky.value.copy(env.palette.horizon);
      u.uTop.value.copy(env.palette.top); u.uWarm.value.copy(env.palette.warm);
    } else if (this.dome) {
      const d = this.dome;
      sun.copy(d.sunDir.value);
      u.uSunColor.value.copy(d.sunColor.value); u.uSky.value.copy(d.horizonColor.value);
      u.uTop.value.copy(d.topColor.value); if (d.warmColor) u.uWarm.value.copy(d.warmColor.value);
    } else {
      const hour = typeof env.hour === 'number' ? env.hour : 12;
      sunDirAt(hour, sun);
      palAt(hour, u);
    }
    // Countryside.update()'s river constants, from the same sun
    const sunY = Math.max(0, sun.y);
    u.uDusk.value = Math.min(1, Math.max(0, (0.42 - sunY) / 0.42)) * Math.min(1, sunY / 0.06);
    u.uDay.value = Math.min(1, Math.max(0, sun.y + 0.18) * 2.2);
    // Sky's moon: opposite the sun, never below 0.18 elevation
    const wet = Math.min(1, Math.max(0, env.wet || 0)), snow = Math.min(1, Math.max(0, env.snow || 0));
    u.uMoonDir.value.set(-sun.x, Math.max(0.18, -sun.y + 0.3), -sun.z).normalize();
    u.uMoonI.value = Math.min(1, Math.max(0, (-sun.y + 0.02) * 5)) * (1 - Math.max(wet, snow) * 0.8);
    u.uRain.value = wet;
    u.uSnow.value = snow;
    u.uWind.value = typeof env.wind === 'number' ? env.wind : 1;
    // the pool's visible rings → (x, z, mid-band radius, strength)
    let k = 0;
    const rip = u.uRip.value;
    for (const m of this.rings) {
      if (k >= MAX_RINGS) break;
      if (!m.visible || !m.material || m.material.opacity <= 0.01) continue;
      const px = m.parent ? m.parent.position.x : 0, pz = m.parent ? m.parent.position.z : 0;
      rip[k++].set(m.position.x + px, m.position.z + pz, m.scale.x * 0.84, Math.min(1, m.material.opacity * 2));
    }
    for (; k < MAX_RINGS; k++) rip[k].w = 0;
  }
}

const skies = new WeakMap();
/** The family's shared WaterSky for one KitMaterials set. */
export function waterSky(km) {
  if (!km || typeof km !== 'object') return new WaterSky();
  if (!skies.has(km)) skies.set(km, new WaterSky());
  return skies.get(km);
}

/** The scene an instance's group sits in (its top-most ancestor), or null before it is placed. */
export function rootOf(group) {
  let o = group && group.parent;
  if (!o) return null;
  while (o.parent) o = o.parent;
  return o;
}

/** Uniform and helper GLSL every water shader of the family shares (after the kit's HASH and NOISE). */
export const WATER_GLSL = /* glsl */`
uniform float uTime, uDusk, uDay, uMoonI, uRain, uSnow, uWind;
uniform vec3 uSunDir, uSunColor, uSky, uTop, uWarm, uMoonDir;
uniform vec4 uRip[${MAX_RINGS}];

vec3 skyColor(vec3 d) {
  float h = clamp(d.y, 0., 1.);
  vec3 c = mix(uSky, uTop, pow(h, 0.55));
  vec3 L = normalize(uSunDir);
  float s = max(dot(d, L), 0.);
  c += uSunColor * (pow(s, 16.) * 0.25 + pow(s, 700.) * 5.) * 0.45 * smoothstep(-0.05, 0.08, L.y);
  float m = max(dot(d, uMoonDir), 0.);
  c += vec3(0.86, 0.9, 1.) * (pow(m, 1400.) * 9. + pow(m, 40.) * 0.08) * uMoonI;
  return c;
}

vec3 ambientWater() {
  return uTop * 0.34 + uSky * 0.22 + uSunColor * 0.2 * max(uSunDir.y, 0.) + vec3(0.02, 0.025, 0.035) + uMoonI * vec3(0.03, 0.04, 0.06);
}

// What a low reflected ray meets in the valley: the forest wall and the
// banks all round, not open sky (there is no mirror pass; this is its cheap
// stand-in), so grazing views darken toward the treeline as real water does.
vec3 reflColor(vec3 R) {
  vec3 forest = vec3(0.045, 0.085, 0.04) * (ambientWater() * 2.2 + 0.04) + uWarm * uDusk * 0.04;
  return mix(forest, skyColor(R) * 0.78, smoothstep(0.08, 0.45, R.y));
}

// the wave train under each ripple ring of the pool (lab: effects.js rings)
vec2 ringWaves(vec2 p, out float crest) {
  vec2 g = vec2(0.);
  crest = 0.;
  for (int i = 0; i < ${MAX_RINGS}; i++) {
    vec4 r = uRip[i];
    if (r.w <= 0.) continue;
    vec2 d = p - r.xy;
    float dist = length(d) + 1e-4;
    float k = dist - r.z;
    float env = r.w;
    g += d / dist * sin(k * 34.) * exp(-k * k * 30.) * env * 1.2 / (1. + r.z * 1.4);
    crest += exp(-k * k * 260.) * env;
  }
  return g;
}

// raindrop rings: two hashed cell layers, density follows the downpour
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
`;

/** Fog for premultiplied colour (three's fog_fragment mixes straight colour). */
export const FOG_PREMULT = /* glsl */`
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogF = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
  #else
    float fogF = smoothstep(fogNear, fogFar, vFogDepth);
  #endif
  col = mix(col, fogColor * a, fogF);
#endif
`;
