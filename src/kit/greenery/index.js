// Greenery family (Phase 2, wave 2.1): lab 15 for the plants the cat walks past.
//   street-bushes   shrubs along both kerbs: free lumpy bushes + clipped karikomi cushions
//   roadside-moss   the moss pillows hugging the road edge (its components, the
//                   bushes / fences / toro, are placed by the runtime)
//   bamboo-groves   the valley's bamboo groves with noded culms
import { defineAsset } from '../contract.js?v=20261113a';
import { buildStreetBushes, buildRoadsideMoss } from './bushes.js?v=20261113a';
import { bambooGrove, sampleGrove } from './bamboo.js?v=20261113a';

const rngOf = (seed) => { let a = seed; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

function sampleBushes() {
  const r = rngOf(5), bushes = [];
  for (let i = 0; i < 4; i++) {
    const s = 0.35 + r() * 0.55, x = (i % 2 ? 1 : -1) * 1.4, z = (i - 2) * 1.5;
    bushes.push({ position: [x, s * 0.5, z], scale: [s * (1 + r() * 0.5), s * 0.75, s * (1 + r() * 0.5)], ry: r() * Math.PI, tint: [0x5c9040, 0x6c9e4a, 0x7cac56, 0x52833a][i % 4], light: (r() - 0.5) * 0.06, spot: [x, z, s] });
  }
  return { index: 0, name: 'Street Bushes', count: 4, bushes };
}

function sampleMoss() {
  const r = rngOf(9), patches = [];
  for (let i = 0; i < 14; i++) patches.push({ position: [(i % 2 ? 1 : -1) * 1.4, 0.045, (i - 7) * 1.1], scale: [0.4 + r() * 0.7, 1, 0.3 + r() * 0.6], rz: r() * Math.PI });
  return { index: 0, name: 'Roadside Moss', patches };
}

export const assets = [
  defineAsset({
    id: 'street-bushes', family: 'greenery', lab: 'greenery/karikomi', label: 'Street bushes', legacyName: 'Street Bushes',
    params: {
      clipped: { type: 'number', default: 0.35, min: 0, max: 1, step: 0.05, label: 'Clipped share' },
      lump: { type: 'number', default: 0.34, min: 0.1, max: 0.6, step: 0.02, label: 'Lumpiness' }
    },
    tiers: ['hero', 'mid', 'far'], sample: sampleBushes, build: buildStreetBushes
  }),
  defineAsset({
    id: 'roadside-moss', family: 'greenery', lab: 'greenery/karikomi', label: 'Roadside moss', legacyName: 'Roadside Moss',
    params: {
      size: { type: 'number', default: 1, min: 0.6, max: 1.6, step: 0.05, label: 'Patch size' },
      dark: { type: 'color', default: 0x37561f, label: 'Shade' },
      light: { type: 'color', default: 0x71963a, label: 'Lit moss' }
    },
    tiers: ['hero', 'mid', 'far'], sample: sampleMoss, build: buildRoadsideMoss
  }),
  defineAsset({
    id: 'bamboo-groves', family: 'greenery', lab: 'greenery/nodes', label: 'Bamboo grove',
    params: {
      girth: { type: 'number', default: 1, min: 0.7, max: 1.5, step: 0.05, label: 'Culm girth' },
      height: { type: 'number', default: 1, min: 0.7, max: 1.3, step: 0.05, label: 'Height' },
      leaf_width: { type: 'number', default: 1, min: 0.6, max: 1.5, step: 0.05, label: 'Leaf width' }
    },
    tiers: ['hero', 'mid', 'far'], sample: () => sampleGrove(2), build: bambooGrove
  })
];
