// The sky family (lab 05, labs/sky): the cloud deck with its projected
// shade, the night's stars and Amanogawa, and the painted moon. These are
// system assets: the Sky (src/sky.js) builds them through the runtime in
// place of its classic sprites and points, drives them every frame through
// update(dt, t, env) with `env.sky`, and hands the deck's `post` hook to the
// atmosphere pass (src/postfx.js). None of them registers a footprint (the
// classic sky has none), none merges (every mesh is live: they follow the
// cat and animate), and quality low never builds them.
//
// Params read only by update() (coverage, altitude, drift, shade) declare
// `visual: false`: they drive per-frame uniforms, not the built geometry.
import { defineAsset } from '../contract.js?v=20261113a';
import { buildClouds } from './clouds.js?v=20261113a';
import { buildStars, buildMoon } from './night.js?v=20261113a';

const SKY_FOOTPRINT = { colliders: [], exclusions: [], anchors: {} };
const sample = (name) => ({ index: 0, name, band: 'near', x: 0, y: 0, z: 0, footprint: SKY_FOOTPRINT });

export const assets = [
  defineAsset({
    id: 'clouds', family: 'sky', lab: 'sky/cloud-field', label: 'Cloud deck and cloud shade',
    params: {
      shape: { type: 'enum', default: 'wata', options: ['wata', 'hitsuji', 'suji'], label: 'Fair-weather clouds (cumulus, altocumulus, cirrus)' },
      coverage: { type: 'number', default: 0.46, min: 0.2, max: 0.85, step: 0.01, visual: false, label: 'Fair-weather cover' },
      altitude: { type: 'number', default: 170, min: 90, max: 320, step: 5, visual: false, label: 'Deck height above the cat (m)' },
      drift: { type: 'number', default: 1, min: 0, max: 2.5, step: 0.05, visual: false, label: 'Wind drift' },
      shade: { type: 'number', default: 0.45, min: 0, max: 0.8, step: 0.01, visual: false, label: 'Cloud shade on the valley' }
    },
    floating: ['deck'],
    sample: sample('asset:clouds'),
    build: (ctx, layout, p) => buildClouds(ctx, layout, p)
  }),
  defineAsset({
    id: 'stars', family: 'sky', lab: 'sky/night-stars', label: 'Stars and the Amanogawa',
    legacyName: 'Stars',
    params: {
      count: { type: 'number', default: 1600, min: 600, max: 3000, step: 50, label: 'Stars (hero tier)' },
      milky_way: { type: 'number', default: 0.6, min: 0, max: 1, step: 0.05, label: 'Amanogawa strength' },
      warmth: { type: 'number', default: 0, min: -1, max: 1, step: 0.05, label: 'Star colour (blue … orange)' }
    },
    floating: ['points', 'band'],
    sample: sample('Stars'),
    build: (ctx, layout, p) => buildStars(ctx, layout, p)
  }),
  defineAsset({
    id: 'moon', family: 'sky', lab: 'sky/night-moon', label: 'Painted moon',
    legacyName: 'Moon',
    params: {
      phase: { type: 'number', default: 0.2, min: 0.05, max: 0.95, step: 0.01, label: 'Phase (0.5 = full)' },
      size: { type: 'number', default: 1, min: 0.7, max: 1.4, step: 0.05, label: 'Apparent size' },
      halo: { type: 'number', default: 1, min: 0, max: 1.5, step: 0.05, label: 'Halo strength' }
    },
    floating: ['disc', 'halo', 'ring'],
    sample: sample('Moon'),
    build: (ctx, layout, p) => buildMoon(ctx, layout, p)
  })
];
