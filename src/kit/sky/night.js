// The night sky: stars with magnitudes and colour, the Amanogawa (天の川) and
// a painted moon with its phase, its seas (the rabbit pounding mochi, 月の兎)
// and a soft halo. Promoted from the Sky Lab's `night-stars` and `night-moon`
// studies (labs/sky/js/night.js).
//
// Both keep the classic handles the Sky's own update drives every frame:
// the star material carries `uniforms.uOpacity` / `uniforms.uTime` (the
// classic nightness × weather-cover fade and twinkle clock), the moon disc
// is a SpriteMaterial whose `opacity` the classic code sets, and both groups
// are positioned by the classic code (stars at the cat, the moon 205 m along
// the moon direction). They draw in the background band between the dome
// (renderOrder -1000) and the kit cloud deck (-999), with depth test off,
// so the deck covers them where it is thick and the valley covers them
// everywhere — no per-star cloud test is needed.
import * as THREE from 'three';
import { makeSkyState, readSky } from './state.js?v=20261113a';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// --- stars ---------------------------------------------------------------

/** B−V colour index → linear RGB, blue-white (−0.3) through white (0.3) to orange (1.6). */
export function starColor(bv, out = new THREE.Color()) {
  const stops = [[-0.3, 0.68, 0.78, 1.0], [0.0, 0.84, 0.89, 1.0], [0.3, 1.0, 0.98, 0.96], [0.65, 1.0, 0.92, 0.8], [1.0, 1.0, 0.84, 0.66], [1.6, 1.0, 0.72, 0.5]];
  const x = clamp(bv, -0.3, 1.6);
  let i = 0;
  while (i < stops.length - 2 && x > stops[i + 1][0]) i++;
  const a = stops[i], b = stops[i + 1], t = (x - a[0]) / (b[0] - a[0]);
  return out.setRGB(a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t);
}

/** The Amanogawa's plane: arcs high across the sky from the shrine canyon toward the open south. */
export const BAND_NORMAL = new THREE.Vector3(0.62, 0.42, -0.66).normalize();
const BAND_A = new THREE.Vector3().crossVectors(BAND_NORMAL, new THREE.Vector3(0, 1, 0)).normalize();
const BAND_B = new THREE.Vector3().crossVectors(BAND_NORMAL, BAND_A).normalize();
const STAR_R = 225;

/** Star directions, brightness (10^(−0.4 m)), colour and twinkle phase from `rng`. */
export function starField(rng, count, { warmth = 0, bandShare = 0.32 } = {}) {
  const pos = new Float32Array(count * 3), bright = new Float32Array(count), phase = new Float32Array(count), color = new Float32Array(count * 3);
  const c = new THREE.Color(), dir = new THREE.Vector3();
  const minY = Math.sin(THREE.MathUtils.degToRad(3));
  const span = Math.pow(10, 0.45 * 6.2) - 1;
  let n = 0;
  while (n < count) {
    if (rng() < bandShare) {
      // crowd toward the band: a point on its great circle, scattered across it
      const th = rng() * Math.PI * 2, off = (rng() + rng() + rng() - 1.5) * 0.22;
      dir.copy(BAND_A).multiplyScalar(Math.cos(th)).addScaledVector(BAND_B, Math.sin(th)).addScaledVector(BAND_NORMAL, off).normalize();
    } else {
      const y = minY + rng() * (1 - minY), az = rng() * Math.PI * 2, r = Math.sqrt(1 - y * y);
      dir.set(Math.cos(az) * r, y, Math.sin(az) * r);
    }
    if (dir.y < minY) continue;
    // more faint stars than bright ones: N(<m) ∝ 10^(0.45 m) on 0…6.2
    const m = Math.log10(1 + rng() * span) / 0.45;
    const bv = (rng() + rng() + rng()) / 3 * 1.7 - 0.25 + warmth * 0.35;
    pos[n * 3] = dir.x * STAR_R; pos[n * 3 + 1] = dir.y * STAR_R; pos[n * 3 + 2] = dir.z * STAR_R;
    bright[n] = Math.pow(10, -0.4 * m);
    phase[n] = rng() * Math.PI * 2;
    starColor(bv, c);
    color[n * 3] = c.r; color[n * 3 + 1] = c.g; color[n * 3 + 2] = c.b;
    n++;
  }
  return { pos, bright, phase, color };
}

export const STAR_VERT = /* glsl */`
uniform float uOpacity;
uniform float uTime;
attribute float aBright;
attribute float aPhase;
attribute vec3 color;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec3 dir = normalize(position);
  float ext = smoothstep(0.02, 0.4, max(dir.y, 0.0));
  // scintillation: low stars twinkle harder and redden in the thicker air
  float rate = 1.1 + fract(aPhase * 3.7) * 2.3;
  float tw = 1.0 + (0.16 + 0.42 * (1.0 - ext)) * sin(uTime * rate + aPhase);
  vAlpha = uOpacity * mix(0.22, 1.0, ext) * clamp(tw, 0.0, 1.6) * (0.42 + 0.9 * sqrt(aBright));
  vColor = mix(color * vec3(1.0, 0.8, 0.6), color, ext);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = 2.0 + 6.5 * sqrt(aBright);
  gl_Position = projectionMatrix * mv;
}
`;

export const STAR_FRAG = /* glsl */`
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r2 = dot(c, c) * 4.0;
  float a = (exp(-r2 * 9.0) + exp(-r2 * 2.6) * 0.35) * vAlpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vColor * a, a);
}
`;

/** A strip around the band's great circle: uv.x runs along it, uv.y across (−1…1); colour holds the tint × strength. */
export function bandGeometry(strength, { segments = 96, rows = 6, halfWidth = 0.42 } = {}) {
  const verts = [], uvs = [], cols = [], index = [];
  const dir = new THREE.Vector3(), core = new THREE.Color(1.0, 0.93, 0.84), arm = new THREE.Color(0.78, 0.84, 1.0), c = new THREE.Color();
  for (let i = 0; i <= segments; i++) {
    const u = i / segments, th = u * Math.PI * 2;
    // the bright bulge (Sagittarius) sits on one side of the circle
    const bulge = Math.pow(Math.max(0, Math.cos(th - 0.9)), 3);
    c.copy(arm).lerp(core, bulge).multiplyScalar(strength * (0.55 + 0.45 * bulge));
    for (let j = 0; j <= rows; j++) {
      const v = j / rows * 2 - 1, off = v * halfWidth * (0.8 + 0.4 * bulge);
      dir.copy(BAND_A).multiplyScalar(Math.cos(th)).addScaledVector(BAND_B, Math.sin(th)).addScaledVector(BAND_NORMAL, off).normalize();
      verts.push(dir.x * (STAR_R + 3), dir.y * (STAR_R + 3), dir.z * (STAR_R + 3));
      uvs.push(u, v);
      cols.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < rows; j++) {
      const a = i * (rows + 1) + j, b = a + rows + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(verts.map((x) => x / (STAR_R + 3)), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  g.setIndex(index);
  return g;
}

export const BAND_VERT = /* glsl */`
attribute vec3 color;
varying vec2 vUv;
varying vec3 vTint;
varying float vAlt;
void main() {
  vUv = uv;
  vTint = color;
  vAlt = normalize(position).y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const BAND_FRAG = /* glsl */`
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vTint;
varying float vAlt;
float bandHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float bandNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(bandHash(i), bandHash(i + vec2(1.0, 0.0)), f.x), mix(bandHash(i + vec2(0.0, 1.0)), bandHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  // cells about as long as they are wide (64 round the circle, 9 across), so the band is a glow of
  // star clouds, never a comb of streaks
  vec2 p = vec2(vUv.x * 64.0, vUv.y * 9.0);
  float cloud = bandNoise(p) * 0.45 + bandNoise(p * 2.1 + vec2(3.7, 1.3)) * 0.3 + bandNoise(p * 4.3 + vec2(9.1, 5.2)) * 0.25;
  float across = exp(-vUv.y * vUv.y * 3.2);
  // the Great Rift: a dark dust lane just off the centre line
  float rift = 1.0 - 0.6 * exp(-pow((vUv.y - 0.12) / 0.16, 2.0)) * smoothstep(0.35, 0.75, bandNoise(p * 1.3 + 1.9));
  float a = across * (0.45 + 0.75 * cloud) * rift * smoothstep(0.0, 0.25, vAlt) * uOpacity * 0.075;
  gl_FragColor = vec4(vTint * a, a);
}
`;

// --- the moon --------------------------------------------------------------

const MARIA = [
  // [x, y, r] on the unit disc: the rabbit's ears (Fecunditatis, Nectaris), body (Tranquillitatis,
  // Serenitatis), the mortar (Nubium, Humorum) and the long Oceanus Procellarum
  [-0.38, 0.34, 0.26], [-0.12, 0.44, 0.17], [0.18, 0.3, 0.2], [0.34, 0.08, 0.2], [0.5, -0.12, 0.13],
  [0.36, -0.36, 0.12], [-0.5, 0.02, 0.3], [-0.24, -0.34, 0.17], [-0.48, -0.42, 0.1], [0.02, 0.06, 0.12]
];

const textureCache = new Map();

/**
 * The painted moon disc for one phase (0 new, 0.5 full, 1 new again): limb
 * darkening, soft seas, a bright rayed crater, earthshine on the dark side.
 * Cached by phase + seed (shared: never disposed by an instance).
 */
export function moonTexture(phase, seed, size = 256) {
  const key = `${phase.toFixed(3)}|${seed >>> 0}|${size}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size), px = img.data;
  const R = size * 0.4375, cx = size / 2, cy = size / 2;
  let s = seed >>> 0 || 1;
  const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const maria = MARIA.map(([x, y, r]) => [x + (rnd() - 0.5) * 0.06, y + (rnd() - 0.5) * 0.06, r * (0.9 + rnd() * 0.2)]);
  const crater = [0.08 + (rnd() - 0.5) * 0.05, -0.62 + (rnd() - 0.5) * 0.05];
  // light from the sun: phase 0.5 lights the whole face, 0.25 the right half (waxing)
  const a = (phase - 0.5) * Math.PI * 2;
  const L = [Math.sin(-a), 0, Math.cos(a)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const k = (y * size + x) * 4;
      const dx = (x + 0.5 - cx) / R, dy = (cy - y - 0.5) / R, r2 = dx * dx + dy * dy;
      const edge = clamp((1 - Math.sqrt(r2)) * R / 1.4 + 0.5);
      if (edge <= 0) { px[k + 3] = 0; continue; }
      const nz = Math.sqrt(Math.max(0, 1 - r2));
      let albedo = 0.86 + 0.14 * nz;                         // limb darkening
      for (const [mx, my, mr] of maria) {
        const d = Math.hypot(dx - mx, dy - my) / mr;
        if (d < 1.4) albedo -= 0.2 * Math.exp(-d * d * 1.8);
      }
      const cd = Math.hypot(dx - crater[0], dy - crater[1]);
      albedo += 0.16 * Math.exp(-cd * cd * 900) + 0.035 * Math.exp(-cd * 7) * (0.5 + 0.5 * Math.cos(Math.atan2(dy - crater[1], dx - crater[0]) * 9));
      albedo *= 0.96 + 0.08 * rnd();                          // a little grain
      const lit = clamp((dx * L[0] + dy * L[1] + nz * L[2] + 0.04) / 0.12);
      const earth = 0.16;                                     // earthshine: a ghost of the dark limb
      const v = albedo * (lit + earth * (1 - lit));
      px[k] = Math.round(clamp(v * (0.97 - 0.04 * (1 - lit))) * 255);
      px[k + 1] = Math.round(clamp(v * (0.95 - 0.02 * (1 - lit))) * 255);
      px[k + 2] = Math.round(clamp(v * (0.88 + 0.12 * (1 - lit))) * 255);
      px[k + 3] = Math.round(edge * clamp(0.05 + lit * 0.95 + (1 - lit) * 0.07) * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.name = 'kit-sky:moon-' + phase.toFixed(2);
  tex.userData.shared = true;
  textureCache.set(key, tex);
  return tex;
}

/** Soft radial glow (`ring` = a thin 22° halo instead). Cached, shared. */
export function glowTexture(ring = false) {
  const key = ring ? 'ring' : 'glow';
  if (textureCache.has(key)) return textureCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  if (ring) {
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.8, 'rgba(255,255,255,0)');
    g.addColorStop(0.9, 'rgba(255,246,236,0.75)');
    g.addColorStop(0.94, 'rgba(236,242,255,0.4)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
  } else {
    g.addColorStop(0, 'rgba(240,244,255,0.62)');
    g.addColorStop(0.25, 'rgba(214,224,250,0.24)');
    g.addColorStop(0.6, 'rgba(196,210,244,0.06)');
    g.addColorStop(1, 'rgba(190,205,240,0)');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.name = 'kit-sky:moon-' + key;
  tex.userData.shared = true;
  textureCache.set(key, tex);
  return tex;
}

/** The background-band sprite material (opaque list, so it draws before the deck and the valley). */
export function backgroundSprite(T, map, { color = 0xffffff, opacity = 0, additive = false } = {}) {
  const m = new T.SpriteMaterial({
    map, color, opacity, fog: false, depthTest: false, depthWrite: false, transparent: false,
    blending: T.CustomBlending,
    blendSrc: T.SrcAlphaFactor,
    blendDst: additive ? T.OneFactor : T.OneMinusSrcAlphaFactor,
    blendSrcAlpha: T.ZeroFactor,
    blendDstAlpha: T.OneFactor
  });
  return m;
}

// --- builders ----------------------------------------------------------------

const TIER_STARS = { hero: 1, mid: 0.6, far: 0.26 };

/**
 * Stars: `points` (the field) and, on hero and mid, `band` (the Amanogawa).
 * `material` is the points' material: the Sky assigns it to `sky.starMat`,
 * so the classic update keeps driving its uOpacity and uTime.
 */
export function buildStars(ctx, layout, p) {
  const T = ctx.THREE, tier = ctx.tier;
  const count = Math.max(120, Math.round(p.count * (TIER_STARS[tier] || 0.6)));
  const f = starField(ctx.rng, count, { warmth: p.warmth });
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(f.pos, 3));
  geo.setAttribute('color', new T.BufferAttribute(f.color, 3));
  geo.setAttribute('aBright', new T.BufferAttribute(f.bright, 1));
  geo.setAttribute('aPhase', new T.BufferAttribute(f.phase, 1));
  const uniforms = { uOpacity: { value: 0 }, uTime: { value: 0 } };
  const material = new T.ShaderMaterial({
    name: `kit-sky:stars-${tier}`, uniforms, vertexShader: STAR_VERT, fragmentShader: STAR_FRAG,
    depthTest: false, depthWrite: false, fog: false, transparent: false,
    blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneFactor, blendSrcAlpha: T.ZeroFactor, blendDstAlpha: T.OneFactor
  });
  const points = new T.Points(geo, material);
  points.renderOrder = -999.6;
  points.frustumCulled = false;
  const group = new T.Group();
  group.add(points);
  const parts = { points };
  const live = [points];
  let bandMat = null;
  if (tier !== 'far' && p.milky_way > 0) {
    bandMat = new T.ShaderMaterial({
      name: `kit-sky:amanogawa-${tier}`, uniforms: { uOpacity: uniforms.uOpacity }, vertexShader: BAND_VERT, fragmentShader: BAND_FRAG,
      side: T.DoubleSide, depthTest: false, depthWrite: false, fog: false, transparent: false,
      blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneFactor, blendSrcAlpha: T.ZeroFactor, blendDstAlpha: T.OneFactor
    });
    const band = new T.Mesh(bandGeometry(p.milky_way, tier === 'hero' ? {} : { segments: 64, rows: 4 }), bandMat);
    band.renderOrder = -999.7;
    band.frustumCulled = false;
    band.userData.noShadow = true;
    group.add(band);
    parts.band = band;
    live.push(band);
  }
  let owner = null;
  const state = makeSkyState();
  return {
    group, parts, live, material, footprint: layout.footprint,
    attach(sky) { owner = sky || null; },
    /** Day costs nothing: below a whisper of opacity the stars and band stop drawing. */
    update(dt, t, env) {
      if (!env || (owner && !env.sky)) return;
      if (!owner) { const s = readSky(env, state); uniforms.uTime.value = t; uniforms.uOpacity.value = s.night * (1 - s.rain * 0.9 - s.snow * 0.8); }
      const on = uniforms.uOpacity.value > 0.002;
      points.visible = on;
      if (parts.band) parts.band.visible = on;
    },
    dispose() { material.dispose(); if (bandMat) bandMat.dispose(); }
  };
}

const TIER_MOON = { hero: 3, mid: 2, far: 1 };

/**
 * Moon: `disc` (the painted phase), `halo` (mid, hero) and `ring` (hero: the
 * 22° tsukigasa that shows in thin high cloud). `material` is the disc's
 * SpriteMaterial: the Sky assigns it to `sky.moonMat`, so the classic
 * update keeps setting its opacity; the halo and ring follow it.
 */
export function buildMoon(ctx, layout, p) {
  const T = ctx.THREE, tier = ctx.tier, n = TIER_MOON[tier] || 2;
  const seed = Math.floor(ctx.rng() * 0x7fffffff);
  // a fuller moon is a brighter moon (illuminated fraction ≈ (1 − cos 2πφ) / 2)
  const lit = (1 - Math.cos(p.phase * Math.PI * 2)) / 2;
  const bright = 0.8 + 0.2 * lit;
  const material = backgroundSprite(T, moonTexture(p.phase, seed, tier === 'far' ? 128 : 256), { color: new T.Color(bright, bright, bright * 0.98) });
  material.name = `kit-sky:moon-${tier}-${p.phase.toFixed(2)}`;   // one painted map per phase
  const disc = new T.Sprite(material);
  disc.scale.setScalar(16 * p.size);
  disc.renderOrder = -999.5;
  disc.frustumCulled = false;
  const group = new T.Group();
  group.add(disc);
  const parts = { disc };
  const mats = [material];
  let haloMat = null, ringMat = null;
  if (n >= 2) {
    haloMat = backgroundSprite(T, glowTexture(false), { color: new T.Color(0.85, 0.9, 1).multiplyScalar(p.halo), additive: true });
    haloMat.name = `kit-sky:moon-halo-${tier}`;
    const halo = new T.Sprite(haloMat);
    halo.scale.setScalar(58 * p.size);
    halo.renderOrder = -999.55;
    halo.frustumCulled = false;
    group.add(halo);
    parts.halo = halo;
    mats.push(haloMat);
  }
  if (n >= 3) {
    ringMat = backgroundSprite(T, glowTexture(true), { color: new T.Color(1, 0.97, 0.94).multiplyScalar(p.halo), additive: true });
    ringMat.name = `kit-sky:tsukigasa-${tier}`;
    const ring = new T.Sprite(ringMat);
    ring.scale.setScalar(184);            // a 22° radius at the moon's 205 m
    ring.renderOrder = -999.55;
    ring.frustumCulled = false;
    group.add(ring);
    parts.ring = ring;
    mats.push(ringMat);
  }
  let owner = null;
  const state = makeSkyState();
  return {
    group, parts, live: Object.values(parts), material, footprint: layout.footprint,
    attach(sky) { owner = sky || null; },
    /** env.cloudCover / env.cloudVeil (from a kit cloud deck, when there is one) wake the halo ring. */
    update(dt, t, env) {
      if (!env || (owner && !env.sky)) return;
      if (!owner) { const s = readSky(env, state); material.opacity = s.night * 0.95 * (1 - s.rain * 0.6); }
      const o = material.opacity;
      disc.visible = o > 0.002;
      if (parts.halo) { parts.halo.visible = o > 0.002; haloMat.opacity = o * 0.55; }
      if (parts.ring) {
        const cover = Number.isFinite(env.cloudCover) ? env.cloudCover : 0;
        const veil = Number.isFinite(env.cloudVeil) ? env.cloudVeil : 0;
        // only a thin veil (cloudy or misty weather over a half-covered sky) makes the ring; clear or overcast skies do not
        const thin = clamp((cover - 0.32) / 0.12) * (1 - clamp((cover - 0.82) / 0.1)) * veil;
        ringMat.opacity = o * thin * 0.12;
        parts.ring.visible = ringMat.opacity > 0.002;
      }
    },
    dispose() { for (const m of mats) m.dispose(); }
  };
}
