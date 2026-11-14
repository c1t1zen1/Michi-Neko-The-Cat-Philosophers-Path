// The creatures family (lane c4-creatures): Larry the turtle and the guardian
// crows as non-cat CharacterDefs (src/characters/defs/{larry,crows}.js) with
// their own simple rigs (src/characters/creatures/). Only the bodies are
// swapped: Larry's patrol and the Jade Paw challenge stay in countryside.js
// (updateCorralGuardian), the crows' circling and swoops in ambient_life.js.
import { defineAsset } from '../contract.js?v=20261113a';
import { LARRY } from '../../characters/defs/larry.js?v=20261113a';
import { GUARDIAN_CROW } from '../../characters/defs/crows.js?v=20261113a';
import { buildTurtle } from '../../characters/creatures/turtle.js?v=20261113a';
import { buildCrow } from '../../characters/creatures/crow.js?v=20261113a';

const larrySample = () => {
  const x = 0, z = 0, width = 7.2, depth = 6.2;
  return {
    index: 0, name: 'Turtle Guardian (Larry)', x, z,
    footprint: { anchors: { corralGuardian: {
      name: 'Larry', mesh: { $part: '.' }, home: [x, 0, z],
      bounds: { minX: x - width / 2 + 1.35, maxX: x + width / 2 - 1.35, minZ: z - depth / 2 + 1.35, maxZ: z + depth / 2 - 1.35 },
      alerted: false, hasBeenAlerted: false, alertTimer: 0, speed: 1.05, radius: 0.72 } } }
  };
};
const crowSample = () => ({
  index: 0, name: 'Crow 1', x: 1.5, y: 7.5, z: 0, size: 1.4, floating: true,
  footprint: { guardianBirds: [{ wings: ['wing_l', 'wing_r'], circleAngle: 0, swoopTimer: 2.5 }] }
});

export const assets = [
  defineAsset({
    id: 'larry', family: 'creatures', lab: 'critters/larry', label: LARRY.label, legacyName: 'Turtle Guardian (Larry)',
    params: { size: { type: 'number', default: 1, min: 0.8, max: 1.3, step: 0.05, label: 'Size' } },
    sample: larrySample,
    build: (ctx, layout, p) => buildTurtle(LARRY, ctx, layout, p)
  }),
  defineAsset({
    id: 'guardian-crows', family: 'creatures', lab: 'critters/guardian-crow', label: GUARDIAN_CROW.label,
    params: { size: { type: 'number', default: 1, min: 0.8, max: 1.3, step: 0.05, label: 'Size' } },
    floating: ['body', 'head', 'beak', 'tail', 'leg_l', 'leg_r', 'wing_l', 'wing_r'],
    sample: crowSample,
    build: (ctx, layout, p) => buildCrow(GUARDIAN_CROW, ctx, layout, p)
  })
];
