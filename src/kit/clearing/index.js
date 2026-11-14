// The clearing family (Phase 4, lane s2-clearing): the summit's meditation
// hilltop. Lab: labs/summit (lab 09). Builders receive the summit's own MAT
// (ctx.MAT); every layout comes from src/summit/clearing.js.
//   promoted: meditation-stone (seat stone + path stones), summit-enso,
//             summit-furin, summit-entry (steps, rails, torii, toro),
//             summit-path (lower stair, rails, toro)
//   deferred (classic): summit-meadow, meditation-atmosphere, summit-trees,
//             summit-terrain, summit-shoulder, slope-forest, summit-grass
//             (see docs/fable/handoff/s2-clearing.md for the reasons)
import { defineAsset } from '../contract.js?v=20261113a';
import { buildMeditationStone, buildEnso } from './stones.js?v=20261113a';
import { buildSummitFurin } from './furin.js?v=20261113a';
import { buildEntry, buildLowerPath } from './approach.js?v=20261113a';
import { summitFootprint, STEP_COUNT, STEP_RUN, CORRIDOR_Z0, ENTRY_Y, LANDING_Z0, CORRIDOR_Z1, GATE_Z, approachTopAt } from '../../summit/common.js?v=20261113a';

const num = (def, min, max, step, label) => ({ type: 'number', default: def, min, max, step, label });

/** The classic entry footprint (seven treads, the landing, two torii pillars), for the contract sample. */
function entryFootprint() {
  const platforms = [];
  for (let i = 0; i < STEP_COUNT; i++) {
    const z0 = CORRIDOR_Z0 + i * STEP_RUN, top = approachTopAt(z0), w = 5.7 - i * 0.09;
    platforms.push([-w * 0.5, top, z0, w * 0.5, top - 0.5, z0 + STEP_RUN]);
  }
  platforms.push([-2.62, ENTRY_Y, LANDING_Z0, 2.62, ENTRY_Y - 0.65, CORRIDOR_Z1 + 0.35]);
  const colliders = [-1, 1].map((s) => { const x = s * 1.8 * 0.56; return [x - 0.27, ENTRY_Y, GATE_Z - 0.27, x + 0.27, ENTRY_Y + 3.86, GATE_Z + 0.27]; });
  return summitFootprint(colliders, platforms);
}

const PATH_STONES = [[0.15, 7.72, 0.48, 0.36, -0.15], [0.62, 6.78, 0.43, 0.33, 0.22], [1.22, 5.88, 0.46, 0.34, -0.28], [1.94, 5.02, 0.42, 0.32, 0.34], [2.64, 4.2, 0.4, 0.3, -0.08]];

export const assets = [
  defineAsset({
    id: 'meditation-stone', family: 'clearing', lab: 'summit/stone', label: 'Meditation stone and path stones',
    params: { size: num(0.85, 0.7, 1.3, 0.05, 'Size'), moss: num(0.3, 0, 1, 0.1, 'Moss'), weathering: num(0.6, 0, 1, 0.1, 'Weathering') },
    // the largest real layout: the five path stones (the single seat stone has no `stones`)
    sample: { index: 1, x: 0, y: 0, z: 0, stones: PATH_STONES },
    build: buildMeditationStone
  }),
  defineAsset({
    id: 'summit-enso', family: 'clearing', lab: 'summit/enso', label: 'Weathered ensō',
    params: { radius: num(0.24, 0.15, 0.4, 0.01, 'Radius (m)'), arc: num(0.89, 0.7, 0.97, 0.01, 'Brush arc (turns)') },
    floating: ['ring'],
    sample: { index: 0, x: 5.25, y: 0.23, z: 3.95 },
    build: buildEnso
  }),
  defineAsset({
    id: 'summit-furin', family: 'clearing', lab: 'summit/furin', label: 'Summit fūrin',
    params: {
      glass: { type: 'enum', default: 'sky', options: ['sky', 'amber', 'smoke'], label: 'Glass' },
      tanzaku: num(0.22, 0.12, 0.3, 0.01, 'Paper strip length (m)')
    },
    sample: { index: 0, x: 4.55, y: 3.75, z: 5.1 },
    build: buildSummitFurin
  }),
  defineAsset({
    id: 'summit-entry', family: 'clearing', lab: 'summit/entry', label: 'Torii approach',
    params: {},
    sample: () => ({ index: 0, x: 0, y: 0, z: 0, footprint: entryFootprint() }),
    build: buildEntry
  }),
  defineAsset({
    id: 'summit-path', family: 'clearing', lab: 'summit/path', label: 'Lower stone path',
    params: {},
    sample: { index: 0, x: 0, y: 0, z: 0 },
    build: buildLowerPath
  })
];
