// The lanterns family: stone toro, street lamps, courtyard and pool toro, the
// hanging chochin and the andon. Lab: labs/lanterns (lab 11).
import { defineAsset } from '../contract.js?v=20261113a';
import { buildStoneLantern, buildChochin, buildAndon } from './build.js?v=20261113a';

const flame = { type: 'number', default: 0.5, min: 0, max: 1, step: 0.05, label: 'Flame warmth' };
const girth = { type: 'number', default: 1, min: 0.85, max: 1.1, step: 0.01, label: 'Girth' };

export const assets = [
  defineAsset({
    id: 'toro', family: 'lanterns', lab: 'lanterns/kasuga', label: 'Stone toro',
    params: { kind: { type: 'enum', default: 'kasuga', options: ['kasuga', 'yukimi', 'oribe'], label: 'Pattern' }, girth, flame },
    sample: { index: 0, x: 0, z: 0 },
    // the game owns this halo (it joins lanternHalos and follows dusk)
    build: (ctx, layout, p) => buildStoneLantern(ctx, layout, p, { kind: p.kind, height: 1.31, kasaR: 0.38, ownHalo: false })
  }),
  defineAsset({
    id: 'street-lamps', family: 'lanterns', lab: 'lanterns/kasuga', label: 'Street lamp',
    params: { girth, flame },
    sample: { index: 0, x: 0, z: 0 },
    build: (ctx, layout, p) => buildStoneLantern(ctx, layout, p, { kind: 'street', height: 1.9, kasaR: 0.4, halo: ctx.tier === 'far' ? null : { scale: 1.2 } })
  }),
  defineAsset({
    id: 'courtyard-toro', family: 'lanterns', lab: 'lanterns/courtyard-toro', label: 'Courtyard toro',
    params: { girth, flame },
    sample: { index: 0, x: 0, z: 0 },
    build: (ctx, layout, p) => buildStoneLantern(ctx, layout, p, { kind: 'kasuga', height: 1.04, kasaR: 0.275, halo: null, always: 0.9 })
  }),
  defineAsset({
    id: 'pool-toro', family: 'lanterns', lab: 'lanterns/pool-toro', label: 'Moon Pool toro',
    params: { girth, flame },
    sample: { index: 0, x: 0, z: 0 },
    build: (ctx, layout, p) => buildStoneLantern(ctx, layout, p, { kind: 'kasuga', height: 1.14, kasaR: 0.3, halo: { scale: 1.5, fog: false }, base: 0.2, gain: 2.0 })
  }),
  defineAsset({
    id: 'chochin', family: 'lanterns', lab: 'lanterns/gifu', label: 'Chochin',
    params: { flame },
    sample: { index: 0, x: 0, y: 2.4, z: 0, phase: 0 },
    build: (ctx, layout, p) => buildChochin(ctx, layout, p)
  }),
  defineAsset({
    id: 'andon', family: 'lanterns', lab: 'lanterns/andon', label: 'Andon',
    params: { flame },
    sample: { index: 0, x: 0, z: 0 },
    build: (ctx, layout, p) => buildAndon(ctx, layout, p)
  })
];
