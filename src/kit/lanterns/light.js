// Lantern light for the whole family: when it is night, how lit a flame is,
// the lit-washi material, the halo sprite and the textures they need.
//
// Ported from labs/shared/paperlantern.js (lanternMaterial, washiTexture) and
// Countryside.update() (the dusk curve and the per-lantern kindle onset).
// Nothing here reads Math.random or Date.now.
import * as THREE from 'three';
import { rng, canvas2d, canvasTexture } from '../craft.js?v=20261113a';

const clamp01 = (x) => Math.min(1, Math.max(0, x));

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

/** The classic per-lantern onset: lantern i kindles when night passes `onset` (Countryside.update). */
export const onsetFor = (index) => (((index || 0) * 0.618) % 1) * 0.4;

/** 0..1 smooth kindle of one lantern at a given nightness. */
export function kindle(night, onset) {
  const k = clamp01((night - onset) / 0.5);
  return k * k * (3 - 2 * k);
}

/** The candle-flame flicker of the classic halos: 0.7..1. */
export const flickerAt = (t, index, rate = 7.5) => 0.85 + Math.sin(t * rate + (index || 0) * 1.7) * 0.15;

/* -------------------------------------------------------------- textures --- */

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

/* ------------------------------------------------------------- materials --- */

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

/** A halo sprite at height y; additive, opacity 0 until update() (or the owner) lights it. */
export function haloSprite(km, { y = 0.95, scale = 1.4, color = 0xffc878 } = {}) {
  const mat = new THREE.SpriteMaterial({ map: haloTexture(km), color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const s = new THREE.Sprite(mat);
  s.position.y = y; s.scale.set(scale, scale, 1);
  s.userData.halo = true;
  return s;
}

/** The glow material the owner already animates (merged, shared), else a kit paper. */
export function ownerGlow(ctx, name = 'lanternGlow') {
  const M = ctx.MAT || {};
  return M[name] || M.lanternGlow || M.lanternPaper || ctx.kitMaterials.paper({ glow: 0.6 });
}

/** Free what a lantern made itself: private materials (never the shared kit ones), never textures. */
export function freePrivate(list) {
  for (const m of list) if (m && !m.userData.kit) m.dispose();
}

/**
 * The update() of a lantern: kindles its private lit material (hero) and,
 * unless the owner drives it, its halo.
 *   lit     private lit-washi material or null
 *   halo    sprite or null; `ownHalo` says this update writes its opacity
 *   gain    emissive dial at full night; base at noon
 */
export function lampUpdate({ lit = null, halo = null, ownHalo = false, index = 0, base = 0.12, gain = 1.7, always = 0 }) {
  const onset = onsetFor(index);
  return function update(dt, t, env) {
    const night = nightnessAt(env && typeof env.hour === 'number' ? env.hour : 12);
    let k = kindle(night, onset);
    if (env && env.lanternOn === false && night < 0.035) k = 0;   // the valley says the lanterns are still out
    const fl = flickerAt(t, index);
    if (lit) lit.userData.u.uGlow.value = always + base + k * gain * (0.94 + 0.06 * fl);
    if (halo && ownHalo) halo.material.opacity = k * 0.55 * fl;
  };
}
