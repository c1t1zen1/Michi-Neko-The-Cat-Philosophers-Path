// The nest family (lab 10): the rooftop bird's nest, its three eggs and the
// Guardian's Feather. The nest's bound part is the instance group itself
// (nestMesh '.'), so the climb-in anchor (Countryside.nestPos) is the group's
// world position; the feather's group is nestFeatherMesh ('.') and the quest
// hides it on pickup. Eggs and feather are components of the nest: the
// Countryside places them, the nest builder never builds them.
import { defineAsset } from '../contract.js?v=20261113a';
import { buildNestBowl, buildEggs, buildFeather } from './build.js?v=20261113a';

const EMPTY_FP = { colliders: [], platforms: [], exclusions: [], waterRects: [], anchors: {}, lists: {} };

export const assets = [
  defineAsset({
    id: 'nest', family: 'nest', lab: 'nest/lined', label: 'Rooftop bird nest',
    legacyName: "Rooftop Bird's Nest",
    params: {
      density: { type: 'number', default: 1, min: 0.6, max: 1.4, step: 0.05, label: 'Twig density' },
      thickness: { type: 'number', default: 1, min: 0.7, max: 1.4, step: 0.05, label: 'Twig thickness' }
    },
    sample: { index: 0, name: "Rooftop Bird's Nest", x: 0, y: 0, z: 0, footprint: EMPTY_FP },
    build: (ctx, layout, p) => buildNestBowl(ctx, layout, p)
  }),
  defineAsset({
    id: 'nest-eggs', family: 'nest', lab: 'nest/eggs', label: 'Three speckled eggs',
    params: { speckle: { type: 'number', default: 1, min: 0, max: 1.5, step: 0.1, label: 'Speckle' } },
    sample: { index: 0, tilts: [0.1, -0.15, 0.05], footprint: EMPTY_FP },
    build: (ctx, layout, p) => buildEggs(ctx, layout, p)
  }),
  defineAsset({
    id: 'guardian-feather', family: 'nest', lab: 'nest/feather', label: "Guardian's Feather",
    legacyName: "Guardian's Feather",
    params: { length: { type: 'number', default: 1, min: 0.8, max: 1.2, step: 0.05, label: 'Length' } },
    sample: { index: 0, name: "Guardian's Feather", x: 0, y: 0.12, z: 0, rx: 0.3, rz: 0.4, footprint: EMPTY_FP },
    build: (ctx, layout, p) => buildFeather(ctx, layout, p)
  })
];
