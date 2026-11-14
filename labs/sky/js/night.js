// Night studies (2026-11-13, lane v-sky): stars with magnitudes and colour,
// the Amanogawa (天の川) and a painted moon with its phase, its seas (the
// rabbit pounding mochi, 月の兎), earthshine, a glow and, under a thin veil,
// the 22° tsukigasa. The game's stars are 420 equal soft discs and its moon
// one crescent painting; these studies ask what a night sky needs to read as
// a real one at cat-eye height.
//
// Recipes `night-stars` and `night-moon` (js/data.js). The drawing code is
// the game kit's own (src/kit/sky/night.js, read through labs/shared/game.js):
// the lab builds the same stars and moon the modular game draws. Only the
// draw order differs: the lab's dome is a transparent pass, so here the night
// objects join the transparent pass too, while the game draws them in the
// background band before its cloud deck.
import * as THREE from 'three';
import { loadKitSkyNightModule } from '../../shared/game.js';

const { buildStars, buildMoon } = await loadKitSkyNightModule();

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** The lab's sky dome is transparent and depth-tested: the night joins that pass. */
const intoLabPass = (inst) => inst.group.traverse((o) => {
  if (!o.material) return;
  o.material.transparent = true;
  o.material.depthTest = true;
  o.renderOrder = 0;
});

export const NIGHT_MODES = { game: 0, stars: 1, moon: 2, both: 3 };
/** The lab drives the instances itself (the original Sky supplies fade and placement). */
const OWNER = { lab: true };

/** Studies `night-stars` / `night-moon`: built once per scene, shown by `state.night`. */
export class NightSky {
  constructor(scene, { thumbnail = false, phase = 0.2 } = {}) {
    const ctx = (tier, seed) => ({ THREE, tier, rng: mulberry(seed) });
    this.starsKit = buildStars(ctx(thumbnail ? 'mid' : 'hero', 0x5eed51), {}, { count: 1600, milky_way: 0.6, warmth: 0 });
    this.moonKit = buildMoon(ctx('hero', 0x5eed52), {}, { phase, size: 1, halo: 1 });
    for (const inst of [this.starsKit, this.moonKit]) { intoLabPass(inst); inst.attach(OWNER); scene.add(inst.group); }
    this.env = { sky: OWNER, hour: 22, cloudCover: 0, cloudVeil: 0, moonCover: 0 };
  }
  /** `game` is the original Sky (its night fade and moon placement are reused). */
  update(state, time, game) {
    const mode = NIGHT_MODES[state.night] || 0;
    const showStars = mode === 1 || mode === 3, showMoon = mode === 2 || mode === 3;
    game.stars.visible = !showStars;
    game.moon.visible = !showMoon;
    this.starsKit.group.visible = showStars;
    this.moonKit.group.visible = showMoon;
    this.starsKit.material.uniforms.uOpacity.value = game.starMat.uniforms.uOpacity.value;
    this.starsKit.material.uniforms.uTime.value = time;
    this.moonKit.group.position.copy(game.moon.position);
    this.moonKit.material.opacity = game.moonMat.opacity;
    // the 22° ring only in a thin high veil
    const veil = state.cloud === 'cirrus' || state.shape === 'veil' ? 1 : 0;
    this.env.hour = state.hour;
    this.env.cloudCover = 0.32 + 0.12 + clamp((state.coverage - 0.2) / 0.55) * 0.38;
    this.env.cloudVeil = veil * clamp((state.coverage - 0.2) / 0.2) * (1 - clamp((state.coverage - 0.75) / 0.15));
    this.starsKit.update(0, time, this.env);
    this.moonKit.update(0, time, this.env);
  }
}
