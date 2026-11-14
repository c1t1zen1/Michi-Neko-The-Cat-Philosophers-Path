// The cloud deck and its projected shade (promoted from the Sky Lab's
// `cloud-field` "thickness painting" and `shade-soft` "wandering patch"
// studies, labs/sky/js/sky.js flatCloud() and labs/sky/js/shadows.js).
//
// The deck is one hemisphere drawn right after the classic dome (renderOrder
// -999, a child of the dome so it follows the cat and stays among the
// summit's sky keepers). Each pixel intersects its view ray with a gently
// curved layer `altitude` metres above the cat and reads the shared weather
// field there: a silhouette, a cool underside and a finite-difference light
// edge, coloured from the Sky's own palette (cloud, warm, sun) so dawn, noon,
// dusk, night and every weather keep the classic colour story.
//
// The same field, projected along the sun from every lit pixel, is the cloud
// shade. It is composited inside the classic atmosphere pass on the modular
// set (src/postfx.js, AtmospherePass.syncKit), never on quality low, never
// on the summit or indoors. Hero tier also lets the light shafts pass only
// through the gaps of the deck.
//
// Tiers: hero = lit deck + high cirrus veil + pigment grain, 5-tap shade,
// shafts through gaps; mid = lit deck, 1-tap shade; far = flat deck, no
// shade (quality low never reaches the kit).
import * as THREE from 'three';
import { cloudField, CLOUD_GLSL, densityFromRaw, deckDistance } from './field.js?v=20261113a';
import { makeSkyState, readSky } from './state.js?v=20261113a';

/** Metres of valley per field tile: a 256² tile spans ~720 m, so a wata-gumo is 60–150 m across. */
export const CLOUD_SPAN = 720;

/** Base genus weights per `shape` (R cumulus, G cirrus, B altocumulus, A stratus). */
export const SHAPES = Object.freeze({
  wata: [1, 0, 0, 0],
  hitsuji: [0.15, 0, 0.85, 0],
  suji: [0.1, 0.9, 0, 0]
});
const STORM = [0.5, 0, 0, 0.5];
const OVERCAST = [0.25, 0, 0, 0.75];
const VEIL = [0.05, 0.1, 0, 0.85];
const TIER_CODE = { hero: 2, mid: 1, far: 0 };

const DECK_VERT = /* glsl */`
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const DECK_FRAG = /* glsl */`
${CLOUD_GLSL}
uniform vec3 uSun;
uniform vec3 uMoon;
uniform vec3 uCrown;
uniform vec3 uBelly;
uniform vec3 uWarm;
uniform vec3 uSunCol;
uniform vec3 uMoonCol;
uniform vec3 uHaze;
uniform float uOpacity;
uniform float uDay;
uniform float uGolden;
uniform float uHigh;
uniform float uMoonLight;
uniform float uThick;
varying vec3 vWorld;

float kitPigment(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
// One slice of the slab: the threshold climbs with height, so tops are smaller than bases.
float kitSlice(vec2 uv, float h, float detail) {
  float t = 1.0 - uCloudCover + h * h * 0.16;
  return smoothstep(t - uCloudSoft, t + uCloudSoft * 2.2, kitCloudRaw(uv) + detail);
}

void main() {
  vec3 d = normalize(vWorld - cameraPosition);
  if (d.y < 0.004) discard;
  vec3 rel = cameraPosition - uCloudCenter;
  vec2 dxz = normalize(d.xz + vec2(1e-5));
  vec2 sxz = normalize(uSun.xz + vec2(1e-5));
  float sunSide = dot(dxz, sxz) * 0.5 + 0.5;
  // the classic sprites' golden-hour fire, per pixel instead of per sprite
  vec3 crown = mix(uCrown, uWarm, clamp(sunSide * uGolden * 1.1, 0.0, 1.0));
  float toSun = max(dot(d, normalize(uSun)), 0.0);
  vec3 light = normalize(mix(uMoon, vec3(uSun.x, max(0.3, uSun.y), uSun.z), uDay));

  // The lab's painted slab: KIT_SLICES height slices composited front to back
  // (the cat is below the deck, so the base is nearest). Bellies are cool,
  // crowns catch the light; the top slice is lit from its own slope.
  vec3 acc = vec3(0.0);
  float trans = 1.0, tNear = 0.0;
  // Parallax between slices stays a fraction of a cloud (≤ 25 m sideways), so a
  // low view sees one cloud with a lit top, never three unrelated sheets.
  float thick = min(uThick, 25.0 * d.y / max(length(d.xz), 1e-3));
  for (int i = 0; i < KIT_SLICES; i++) {
    float h = float(i) / max(float(KIT_SLICES - 1), 1.0);
    float t = kitDeckDistance(rel, d, uCloudBase + h * thick);
    if (i == 0) tNear = t;
    vec2 uv = kitCloudUV(cameraPosition.xz + d.xz * t);
#if KIT_TIER > 1
    float detail = (texture2D(uCloudField, uv * 3.7 + vec2(0.31, 0.17)).r - 0.5) * 0.16;
#else
    float detail = 0.0;
#endif
    float dens = kitSlice(uv, h, detail);
    float a = smoothstep(0.02, 0.62, dens) * (KIT_SLICES > 1 ? 0.72 : 0.92);
    if (a < 0.002) continue;
    float lit = 0.38 + 0.62 * h;
#if KIT_TIER > 0
    if (i == KIT_SLICES - 1) {
      vec2 e = vec2(1.6 / 256.0, 0.0);
      float gx = kitSlice(uv + e, h, detail) - dens;
      float gz = kitSlice(uv + e.yx, h, detail) - dens;
      vec3 n = normalize(vec3(-gx * 10.0, 0.7, -gz * 10.0));
      lit = mix(lit, dot(n, light) * 0.5 + 0.5, 0.55);
    }
#endif
    vec3 c = mix(uBelly, crown, clamp(lit, 0.0, 1.0));
    c += uSunCol * pow(toSun, 14.0) * (1.0 - dens) * 0.9 * uDay;   // silver lining on thin edges
    acc += trans * a * c;
    trans *= 1.0 - a;
  }
  float alpha = 1.0 - trans;
  vec3 col = alpha > 1e-4 ? acc / alpha : crown;
  col += uSunCol * pow(toSun, 5.0) * 0.16 * uDay;
  float toMoon = max(dot(d, uMoon), 0.0);
  // moonlight: a silver edge where the deck is thin near the moon, a faint sheen around it
  col += uMoonCol * (pow(toMoon, 22.0) * 0.7 * (1.0 - smoothstep(0.4, 1.0, alpha)) + pow(toMoon, 6.0) * 0.08) * uMoonLight;

  float far = smoothstep(420.0, 1350.0, tNear);
  col = mix(col, uHaze, far * 0.6);
  alpha *= uOpacity * smoothstep(0.004, 0.07, d.y) * (1.0 - far * 0.35);

#if KIT_TIER > 1
  col *= 1.0 + (kitPigment(floor((cameraPosition.xz + d.xz * tNear) * 0.9)) - 0.5) * 0.05;
  // a high suji-gumo veil above the deck, drifting faster: two depths of sky
  float th = kitDeckDistance(rel, d, uCloudBase * 2.6);
  vec2 uvh = (cameraPosition.xz + d.xz * th) / (uCloudSpan * 1.7) + uCloudOffset * 1.8 + vec2(0.37, 0.11);
  // fibres only where a broad patch of veil drifts (the stratus channel, much larger), never a ruled sheet
  float patchH = smoothstep(0.45, 0.8, texture2D(uCloudField, uvh * 0.31 + vec2(0.53, 0.29)).a);
  float aH = smoothstep(0.6, 0.95, texture2D(uCloudField, uvh).g) * patchH * uHigh * smoothstep(0.02, 0.22, d.y) * uOpacity;
  vec3 colH = mix(crown * 1.03, uHaze, 0.3) + uSunCol * pow(toSun, 10.0) * 0.35 * uDay;
  float outA = alpha + aH * (1.0 - alpha);
  col = (col * alpha + colH * aH * (1.0 - alpha)) / max(outA, 1e-4);
  alpha = outA;
#endif
  gl_FragColor = vec4(col, alpha);
}
`;

// --- the projected shade, inserted into the classic atmosphere pass -----------

const SHADE_DECL = /* glsl */`
${CLOUD_GLSL}
uniform float uCloudShade;
uniform vec3 uCloudShadeTint;
uniform float uCloudSkyAlpha;
#if KIT_CLOUD_RAYS
// Sky visibility through the deck along one screen ray (shafts through gaps).
float kitSkyClear(vec2 suv) {
  vec4 v = uInvProj * vec4(suv * 2.0 - 1.0, 1.0, 1.0);
  vec3 wd = normalize((uInvView * vec4(normalize(v.xyz / v.w), 0.0)).xyz);
  if (wd.y < 0.01) return 1.0;
  float t = kitDeckDistance(uCamPos - uCloudCenter, wd, uCloudBase);
  return 1.0 - kitCloudAt(kitCloudUV(uCamPos.xz + wd.xz * t)) * uCloudSkyAlpha;
}
#endif
`;

const SHADE_BEFORE_FOG = /* glsl */`
      // Cloud shade (modular set): the deck's field, projected along the sun.
      if (!sky && uCloudShade > 0.0) {
        float kitLift = (uCloudCenter.y + uCloudBase) - W.y;
        vec2 kitUv = kitCloudUV(W.xz + uSunDir.xz * (kitLift / max(uSunDir.y, 0.12)));
        float kitShade = kitCloudAt(kitUv);
#if KIT_SHADE_TAPS > 1
        vec2 kitE = vec2(0.012, 0.0);
        kitShade = (kitShade * 2.0 + kitCloudAt(kitUv + kitE) + kitCloudAt(kitUv - kitE)
          + kitCloudAt(kitUv + kitE.yx) + kitCloudAt(kitUv - kitE.yx)) / 6.0;
#endif
        // mostly the sunlit surfaces lose light; what already sits in shade keeps its colour
        float kitLum = dot(col.rgb, vec3(0.2126, 0.7152, 0.0722));
        float kitK = uCloudShade * kitShade * mix(0.4, 1.0, smoothstep(0.02, 0.3, kitLum));
        col.rgb *= mix(vec3(1.0), uCloudShadeTint, kitK);
      }
`;

const mixInto = (out, list) => {
  for (let i = 0; i < 4; i++) out[i] = list.reduce((s, [w, v]) => s + w * v[i], 0);
  const sum = out[0] + out[1] + out[2] + out[3] || 1;
  for (let i = 0; i < 4; i++) out[i] /= sum;
  return out;
};

/**
 * Build the deck. `layout`: { index, band } (the Sky's layout; no footprint
 * — the classic sky registers nothing). Returns an AssetInstance with
 * `post` (the atmosphere-pass hook, null on far), `attach(sky)` and
 * `shared` (the field and its uniforms, for the stars and the moon).
 */
export function buildClouds(ctx, layout, p) {
  const T = ctx.THREE, tier = ctx.tier, code = TIER_CODE[tier] ?? 1;
  const seed = Math.floor(ctx.rng() * 0x7fffffff);
  const field = cloudField(seed);
  const mixVec = new T.Vector4();
  const base = SHAPES[p.shape] || SHAPES.wata;
  const shared = {
    uCloudField: { value: field.texture },
    uCloudMix: { value: mixVec.fromArray(base) },
    uCloudOffset: { value: new T.Vector2(ctx.rng(), ctx.rng()) },
    uCloudCenter: { value: new T.Vector3() },
    uCloudCover: { value: p.coverage },
    uCloudSoft: { value: 0.045 },
    uCloudSpan: { value: CLOUD_SPAN },
    uCloudBase: { value: p.altitude }
  };
  const uniforms = {
    ...shared,
    uSun: { value: new T.Vector3(0, 1, 0) },
    uMoon: { value: new T.Vector3(0, 1, 0) },
    uCrown: { value: new T.Color(0xfff0e0) },
    uBelly: { value: new T.Color(0x9c95aa) },
    uWarm: { value: new T.Color(0xffb264) },
    uSunCol: { value: new T.Color(0xffe6b8) },
    uMoonCol: { value: new T.Color(0x8ea4cc) },
    uHaze: { value: new T.Color(0xf2d2b0) },
    uOpacity: { value: 0.85 },
    uDay: { value: 1 },
    uGolden: { value: 0 },
    uHigh: { value: tier === 'hero' ? 0.4 : 0 },
    uMoonLight: { value: 0 },
    uThick: { value: tier === 'far' ? 0 : 60 }
  };
  const material = new T.ShaderMaterial({
    name: `kit-sky:clouds-${tier}-${p.shape}`,
    uniforms,
    defines: { KIT_TIER: code, KIT_SLICES: code === 2 ? 3 : code === 1 ? 2 : 1 },
    vertexShader: DECK_VERT,
    fragmentShader: DECK_FRAG,
    side: T.BackSide,
    depthTest: false,
    depthWrite: false,
    fog: false,
    transparent: false,
    blending: T.CustomBlending,
    blendSrc: T.SrcAlphaFactor,
    blendDst: T.OneMinusSrcAlphaFactor,
    blendSrcAlpha: T.ZeroFactor,
    blendDstAlpha: T.OneFactor
  });
  // An upper hemisphere just inside the classic dome (650 m), down to the horizon.
  const segs = tier === 'far' ? [24, 6] : tier === 'mid' ? [32, 8] : [40, 10];
  const deck = new T.Mesh(new T.SphereGeometry(600, segs[0], segs[1], 0, Math.PI * 2, 0, Math.PI * 0.5 + 0.02), material);
  deck.renderOrder = -999;
  deck.frustumCulled = false;
  deck.userData.noShadow = true;
  const group = new T.Group();
  group.add(deck);

  const shadeTint = new T.Color(0.5, 0.55, 0.72);   // cool: the sky still lights what the sun no longer does
  const post = code === 0 ? null : {
    key: `clouds-${tier}`,
    uniforms: { ...shared, uCloudShade: { value: 0 }, uCloudShadeTint: { value: shadeTint }, uCloudSkyAlpha: { value: 0 } },
    defines: { KIT_SHADE_TAPS: code > 1 ? 5 : 1, KIT_CLOUD_RAYS: code > 1 ? 1 : 0 },
    declarations: SHADE_DECL,
    beforeFog: SHADE_BEFORE_FOG,
    shaftSky: code > 1 ? 'kitSkyClear(uv)' : null,
    active: false,          // true while the shade has anything to draw
    sunOcclusion: 0         // 0..1: how much of the sun the deck hides from the cat
  };

  const state = makeSkyState();
  const work = [0, 0, 0, 0];
  const rel = new T.Vector3(0, 2, 0);
  let owner = null;
  const instance = {
    group,
    parts: { deck },
    live: [deck],
    footprint: layout.footprint,
    material,
    post,
    shared,
    field,
    cover: p.coverage,
    high: uniforms.uHigh.value,
    veil: 0,
    /** The Sky that drives this instance: once attached, the runtime's generic tick (no env.sky) is ignored. */
    attach(sky) { owner = sky || null; },
    update(dt, t, env) {
      if (!env || (owner && !env.sky)) return;
      const s = readSky(env, state);
      const q = instance.params || p;
      const step = Math.min(Math.max(Number(dt) || 0, 0), 0.25);
      // coverage and genus follow the weather; a mist veils, rain closes the sky
      const cover = Math.min(0.97, q.coverage + s.cloudy * 0.3 + s.rain * 0.52 + s.snow * 0.4 + s.mist * 0.16);
      const fair = Math.max(0, 1 - s.cloudy - s.rain - s.snow - s.mist);
      mixInto(work, [[fair, SHAPES[q.shape] || SHAPES.wata], [s.cloudy, STORM], [s.rain + s.snow, OVERCAST], [s.mist, VEIL]]);
      mixVec.fromArray(work);
      shared.uCloudCover.value = cover;
      shared.uCloudSoft.value = 0.045 + s.mist * 0.14 + s.snow * 0.07 + s.rain * 0.05;
      shared.uCloudBase.value = q.altitude * (1 - s.mist * 0.35 - s.rain * 0.2);
      shared.uCloudCenter.value.copy(s.center);
      // drift with the wind: ~3 m/s on a fair day, faster in weather (classic sprites: 0.6–4 m/s)
      const wind = (2.6 + s.storm * 4.5) * q.drift;
      shared.uCloudOffset.value.x = (shared.uCloudOffset.value.x + step * wind / CLOUD_SPAN) % 1;
      shared.uCloudOffset.value.y = (shared.uCloudOffset.value.y + step * wind * 0.28 / CLOUD_SPAN) % 1;

      const pal = s.pal;
      uniforms.uSun.value.copy(s.sun);
      uniforms.uMoon.value.copy(s.moon);
      // at night the deck is a dim silhouette, lit only where it passes the moon
      uniforms.uCrown.value.copy(pal.cloud).multiplyScalar(1 - 0.62 * s.night);
      uniforms.uBelly.value.copy(pal.cloud).multiplyScalar(0.72).lerp(pal.hemiSky, 0.3).lerp(pal.mid, 0.12).multiplyScalar(1 - 0.72 * s.night);
      uniforms.uWarm.value.copy(pal.warm);
      uniforms.uSunCol.value.copy(pal.sun);
      uniforms.uHaze.value.copy(pal.horizon).lerp(pal.fog, 0.4);
      // day 0.89, rain 1, night 0.8
      const op = Math.min(1, 0.05 + s.cloudOpacity * 1.35);
      uniforms.uOpacity.value = op + (Math.max(op, 0.8) - op) * s.night;   // dim at night, but dense enough to hide the stars it covers
      uniforms.uDay.value = s.day;
      uniforms.uGolden.value = s.golden;
      uniforms.uMoonLight.value = s.night * 0.55 * (1 - s.storm * 0.6);
      uniforms.uHigh.value = tier === 'hero' ? 0.4 * (1 - s.storm * 0.7) : 0;
      instance.cover = cover;
      instance.high = uniforms.uHigh.value;
      instance.veil = Math.min(1, s.cloudy * 0.6 + s.mist) * (1 - s.rain);   // a thin veil: the moon's 22° halo weather

      if (post) {
        const sunUp = s.sun.y;
        const shade = q.shade * smoothstep(0.02, 0.2, sunUp) * (1 - smoothstep(0.72, 0.95, cover)) * (1 - s.mist * 0.8);
        post.uniforms.uCloudShade.value = shade;
        post.uniforms.uCloudSkyAlpha.value = uniforms.uOpacity.value;
        post.active = shade > 0.001 || (post.shaftSky !== null && sunUp > 0.01);
        // How much of the sun the deck hides from the cat (dims the shafts and the sun's haze glow).
        let occ = 0;
        if (sunUp > 0.02) {
          const td = deckDistance(rel, s.sun, shared.uCloudBase.value);
          const u = (s.center.x + s.sun.x * td) / CLOUD_SPAN + shared.uCloudOffset.value.x;
          const v = (s.center.z + s.sun.z * td) / CLOUD_SPAN + shared.uCloudOffset.value.y;
          occ = densityFromRaw(field.raw(u, v, work), cover, shared.uCloudSoft.value) * uniforms.uOpacity.value;
        }
        post.sunOcclusion = occ;
      }
    },
    dispose() { material.dispose(); }
  };
  return instance;
}

function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
