// Lantern light for the whole family: when it is night, how lit a flame is,
// the lit-washi material, the halo sprite and the textures they need.
//
// Ported from labs/shared/paperlantern.js (lanternMaterial, washiTexture) and
// Countryside.update() (the dusk curve and the per-lantern kindle onset).
// Nothing here reads Math.random or Date.now.
import * as THREE from 'three';
// nightnessAt, washiTexture, haloTexture and litWashi were promoted to
// src/kit/materials.js at gate G-V1 (v-lanterns handoff); re-exported here
// unchanged, so `../lanterns/light.js` imports keep working.
import { nightnessAt, washiTexture, haloTexture, litWashi } from '../materials.js?v=20261113a';

export { nightnessAt, washiTexture, haloTexture, litWashi };

const clamp01 = (x) => Math.min(1, Math.max(0, x));

/** The classic per-lantern onset: lantern i kindles when night passes `onset` (Countryside.update). */
export const onsetFor = (index) => (((index || 0) * 0.618) % 1) * 0.4;

/** 0..1 smooth kindle of one lantern at a given nightness. */
export function kindle(night, onset) {
  const k = clamp01((night - onset) / 0.5);
  return k * k * (3 - 2 * k);
}

/** The candle-flame flicker of the classic halos: 0.7..1. */
export const flickerAt = (t, index, rate = 7.5) => 0.85 + Math.sin(t * rate + (index || 0) * 1.7) * 0.15;

/* ------------------------------------------------------------- materials --- */

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
