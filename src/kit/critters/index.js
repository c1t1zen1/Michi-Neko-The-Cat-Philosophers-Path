// The critters family (lab 18): the valley sparrows, the river koi and the
// meadow butterflies. All three are live (animated) and not merged. The ambient
// life module drives them: sparrow wings (wing_l / wing_r), koi tail and
// pectoral pivots (tail, pectoral_l, pectoral_r) through the classic records,
// the butterfly swarm through its own update(). The guardian crows are NOT here
// (lab study only; lane c4-creatures promotes them).
import { defineAsset } from '../contract.js?v=20261113a';
import { buildSparrow } from './birds.js?v=20261113a';
import { buildKoi } from './koi.js?v=20261113a';
import { buildButterflies } from './butterflies.js?v=20261113a';

const sparrowSample = () => ({
  index: 0, name: 'Sparrow 1', x: 3, y: 12, z: -4, floating: true,
  footprint: { birds: [{ wings: ['wing_l', 'wing_r'], center: [0, 12, 0], radius: 10, speed: 0.4, yAmp: 1.2, yFreq: 0.4, seed: 12, wingSpeed: 14 }] }
});
const koiSample = () => ({
  index: 0, name: 'Koi 01', variant: 'sanke', patternSeed: 3, x: 0, y: -0.3, z: 29.5, scale: 0.7, floating: true,
  footprint: { koi: [{ x: 0, z: 29.5, cruiseSpeed: 0.6, speed: 0.6, direction: 1, lane: 0, wobble: 3, tail: 'tail', pectorals: ['pectoral_l', 'pectoral_r'], surfaceTimer: 8, len: 0.7 }] }
});
const butterflySample = () => {
  // the real layout: fifty butterflies over seven zones (deterministic stand-in for the classic Math.random draws)
  const count = 50, zones = [[-20, 14], [12, 24], [0, 31], [26, 4], [0, -26], [-15, -10], [18, -5]];
  const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3), seeds = new Float32Array(count * 3);
  const pal = [[1, 0.8, 0.27], [0.4, 0.8, 1], [1, 0.53, 0.67], [0.67, 1, 0.4]];
  for (let i = 0; i < count; i++) {
    const [zx, zz] = zones[i % 7], f = (k) => (((i * 7919 + k * 104729) % 1000) / 1000);
    positions.set([zx + (f(1) - 0.5) * 10, 0.8 + f(2) * 1.6, zz + (f(3) - 0.5) * 10], i * 3);
    seeds.set([f(4) * 100, 0.4 + f(5) * 0.6, 0.6 + f(6) * 1.2], i * 3);
    colors.set(pal[Math.floor(f(7) * 4)], i * 3);
  }
  return { index: 0, x: 0, y: 0, z: 0, count, zones, positions, colors, seeds, footprint: {} };
};

export const assets = [
  defineAsset({
    id: 'sparrows', family: 'critters', lab: 'critters/flock', label: 'Valley sparrow',
    params: { size: { type: 'number', default: 1, min: 0.7, max: 1.5, step: 0.05, label: 'Size' } },
    sample: sparrowSample,
    build: (ctx, layout, p) => buildSparrow(ctx, layout, p)
  }),
  defineAsset({
    id: 'koi', family: 'critters', lab: 'critters/sanke', label: 'River koi',
    params: { tail: { type: 'number', default: 1, min: 0.7, max: 1.6, step: 0.05, label: 'Tail length' } },
    sample: koiSample,
    build: (ctx, layout, p) => buildKoi(ctx, layout, p)
  }),
  defineAsset({
    id: 'butterflies', family: 'critters', lab: 'critters/hinge', label: 'Meadow butterflies',
    params: {
      size: { type: 'number', default: 1, min: 0.6, max: 1.8, step: 0.05, label: 'Wing size' },
      flutter: { type: 'number', default: 10, min: 5, max: 16, step: 0.5, label: 'Flutter rate' }
    },
    floating: ['swarm'], // the swarm flies; its instances are placed over the meadow
    sample: butterflySample,
    build: (ctx, layout, p) => buildButterflies(ctx, layout, p)
  })
];
