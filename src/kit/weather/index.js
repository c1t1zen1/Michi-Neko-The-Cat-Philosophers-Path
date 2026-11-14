// The weather family: falling and drifting particles, raindrop rings and
// dappled light. Labs: labs/weather (lab 20), labs/komorebi (lab 22).
//
// Particle systems keep the game's simulation: Particles.update() moves the
// `points` / `lines` part's position buffer (same arrays as the classic code),
// so the layout's random draws and the motion are unchanged. The kit dresses
// the sprites and animates its own clock through update(dt, t, env).
//
// Reusable (s4-summit-life): every cloud builder reads only `layout.positions`
// (+ `count`) and sizes by `params`, so a lane can hand it any spawn volume
// (see boxVolume() in sprites.js) and drive the position buffer itself.
import { defineAsset } from '../contract.js?v=20261113a';
import { weatherCloud, cloudInstance, petalTexture, flakeTexture, glowTexture, boxVolume } from './sprites.js?v=20261113a';
import { buildRain, buildRainRipples } from './rain.js?v=20261113a';
import { buildDappledLight } from './light.js?v=20261113a';

const PETAL_TINTS = [0xfff2f5, 0xffe3ea, 0xffd2de, 0xf8c2d2, 0xffeaf0];
const num = (def, min, max, step, label) => ({ type: 'number', default: def, min, max, step, label });
const SAMPLE = {
  petals: () => boxVolume(350, { w: 70, h: 12, d: 70, seed: 3 }),
  rain: () => boxVolume(1100, { w: 44, h: 16, d: 44, seed: 5, verts: 2 }),
  river: () => ({ ...boxVolume(90, { w: 120, h: 0, d: 5.5, y0: 0.05, cx: 5, cz: 29.5, seed: 7 }) }),
  fireflies: () => boxVolume(70, { w: 40, h: 1.6, d: 40, y0: 0.4, seed: 11 }),
  motes: () => boxVolume(140, { w: 50, h: 5, d: 50, y0: 0.3, seed: 13 }),
  snow: () => boxVolume(900, { w: 80, h: 22, d: 80, seed: 17 })
};
// a sprite cloud floats in the air: not "on the ground" for the bearing check
const AIR = ['points'];

export const assets = [
  defineAsset({
    id: 'falling-petals', family: 'weather', lab: 'weather/game-petal', label: 'Falling petals', floating: AIR,
    params: { size: num(0.19, 0.1, 0.4, 0.01, 'Petal size'), tumble: num(1, 0, 1.5, 0.05, 'Tumble') },
    sample: SAMPLE.petals,
    build: (ctx, layout, p) => cloudInstance(weatherCloud(ctx, layout, {
      map: petalTexture(ctx.kitMaterials), size: p.size, sizeVar: 0.35, opacity: 0.95,
      spin: 1.8 * p.tumble, flip: p.tumble > 0 ? 1 : 0, tints: PETAL_TINTS
    }))
  }),
  defineAsset({
    id: 'river-petals', family: 'weather', lab: 'water/hanaikada', label: 'River petals', floating: AIR,
    params: { size: num(0.17, 0.08, 0.4, 0.01, 'Petal size') },
    sample: SAMPLE.river,
    build: (ctx, layout, p) => cloudInstance(weatherCloud(ctx, layout, {
      map: petalTexture(ctx.kitMaterials), size: p.size, sizeVar: 0.4, opacity: 0.92,
      spin: 0.35, tints: [0xf8c2d2, 0xe9aebf, 0xf2b8c8, 0xdca0b4]
    }))
  }),
  defineAsset({
    id: 'snow', family: 'weather', lab: 'weather/game-snow', label: 'Snowfall', floating: AIR,
    params: { size: num(0.34, 0.15, 0.7, 0.01, 'Flake size'), size_var: num(0.6, 0, 0.9, 0.05, 'Size variety') },
    sample: SAMPLE.snow,
    build: (ctx, layout, p) => cloudInstance(weatherCloud(ctx, layout, {
      map: flakeTexture(ctx.kitMaterials), size: p.size, sizeVar: p.size_var, opacity: 0, additive: true,
      spin: 0.45, blink: 0.3, rate: 3
    }))
  }),
  defineAsset({
    id: 'fireflies', family: 'weather', lab: 'weather/fireflies', label: 'Fireflies', floating: AIR,
    params: { size: num(0.3, 0.12, 0.6, 0.01, 'Glow size'), blink: num(0.8, 0, 1, 0.05, 'Blink') },
    sample: SAMPLE.fireflies,
    build: (ctx, layout, p) => cloudInstance(weatherCloud(ctx, layout, {
      map: glowTexture(ctx.kitMaterials, 'firefly', '236, 236, 120', 0.12), size: p.size, sizeVar: 0.4, opacity: 1,
      additive: true, blink: p.blink, rate: 2.4
    }))
  }),
  defineAsset({
    id: 'dust-motes', family: 'weather', lab: 'weather/dust-motes', label: 'Dust motes', floating: AIR,
    params: { size: num(0.1, 0.04, 0.25, 0.01, 'Mote size') },
    sample: SAMPLE.motes,
    build: (ctx, layout, p) => cloudInstance(weatherCloud(ctx, layout, {
      map: glowTexture(ctx.kitMaterials, 'mote', '255, 238, 205', 0.3), size: p.size, sizeVar: 0.7, opacity: 0.55,
      additive: true, blink: 0.6, rate: 0.9
    }))
  }),
  defineAsset({
    id: 'rain', family: 'weather', lab: 'weather/game-rain', label: 'Rain streaks', floating: ['lines'],
    params: { strength: num(1, 0.4, 1.4, 0.05, 'Streak strength') },
    sample: SAMPLE.rain,
    build: (ctx, layout, p) => buildRain(ctx, layout, p)
  }),
  defineAsset({
    id: 'rain-ripples', family: 'weather', lab: 'weather/splash', label: 'Raindrop rings',
    params: { tint: { type: 'color', default: 0xeef7f8, label: 'Ring colour' } },
    sample: { index: 0, count: 28, footprint: {} },
    build: (ctx, layout, p) => buildRainRipples(ctx, layout, p)
  }),
  defineAsset({
    id: 'dappled-light', family: 'weather', lab: 'komorebi/game-dapple', label: 'Dappled light', floating: ['pools'],
    params: { strength: num(1, 0.4, 1.5, 0.05, 'Brightness'), spread: num(1, 0.7, 1.4, 0.05, 'Pool size') },
    sample: () => ({
      index: 0, size: 2.6, footprint: {},
      pools: Array.from({ length: 18 }, (_, i) => ({ x: Math.cos(i * 2.4) * (6 + i), y: 0.055, z: Math.sin(i * 2.4) * (6 + i), scale: 1.4 + (i % 3) * 0.4 }))
    }),
    build: (ctx, layout, p) => buildDappledLight(ctx, layout, p)
  })
];
