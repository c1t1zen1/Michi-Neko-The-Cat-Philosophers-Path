// Roof Road festival family (Phase 5, lane r4-festival): the pieces of mouths 6-7
// and the skyline. Ids are the inventory ids (group Roof Road). See stalls.js,
// floats.js (part a), hills.js, sky.js, fires.js, city.js, atmosphere.js (part b: the sky, hills, the five
// Okuribi fires, the distant city and the ambient layers; sky/hills/fires/atmosphere are routed from Sky and
// RooftopAtmosphere, R76).
import { defineAsset } from '../contract.js?v=20261116a';
import { buildYatai, buildRack, buildTsuiji, buildGate } from './stalls.js?v=20261116a';
import { buildHoko, buildYama, buildSkylinePagoda } from './floats.js?v=20261116a';

import { hillsAsset } from './hills.js?v=20261116a';
import { skyAsset } from './sky.js?v=20261116a';
import { okuribiAsset } from './fires.js?v=20261116a';
import { cityAsset } from './city.js?v=20261116a';
import { atmosphereAsset } from './atmosphere.js?v=20261116a';

const TIERS = ['hero', 'mid', 'far'];
const base = { x: 0, y: 0, z: 0, ry: 0, index: 0, band: 'near' };
const sample = (type, s, piece) => ({ ...base, type, s, piece, rail: null });

export const assets = [
  defineAsset({
    id: 'roof-yatai', family: 'rooffestival', lab: 'roofroad/yatai', label: 'Yatai festival stall', tiers: TIERS,
    sample: sample('yatai', 0, { type: 'yatai', s0: -1.5, s1: 1.5, y: 1.9, d: 2.35, fare: 'festival masks', staffed: true, look: 0.7 }),
    build: buildYatai
  }),
  defineAsset({
    id: 'roof-lantern-racks', family: 'rooffestival', lab: 'roofroad/rack', label: 'Lantern rack', tiers: TIERS,
    sample: sample('rack', 0, { type: 'rack', s0: -1.9, s1: 1.9, d: 1.6, tiers: [{ s0: -1.9, s1: 1.9, y: 1.55 }, { s0: -1.3, s1: 1.3, y: 2.45 }, { s0: -0.6, s1: 0.6, y: 3.35 }] }),
    build: buildRack
  }),
  defineAsset({
    id: 'roof-hoko', family: 'rooffestival', lab: 'roofroad/float', label: 'Hoko float', tiers: TIERS,
    sample: sample('float', 0, { type: 'float', s0: -3.5, s1: 3.5, deckY: 3.6, eaveY: 5.8, ridgeY: 6.9, barY: 8.0, perchY: 9.1, d: 1.2 }),
    build: buildHoko
  }),
  defineAsset({
    id: 'roof-temple-gate', family: 'rooffestival', lab: 'roofroad/gate', label: 'Temple sanmon gate', tiers: TIERS,
    sample: sample('gate', 0, { type: 'gate', s0: -3.2, s1: 3.2, foot: 5.2, ridge: 6.6, dFront: -0.4, depth: 4 }),
    build: buildGate
  }),
  defineAsset({
    id: 'roof-tsuiji', family: 'rooffestival', lab: 'roofroad/tsuiji', label: 'Tsuiji temple wall', tiers: TIERS,
    sample: sample('tsuiji', 0, { type: 'tsuiji', s0: -4, s1: 4, d: 0 }),
    build: buildTsuiji
  }),
  defineAsset({
    id: 'roof-yama', family: 'rooffestival', lab: 'roofroad/yama', label: 'Kakiyama float', tiers: TIERS,
    sample: sample('yamaFloat', 0, { type: 'yamaFloat', s0: -2.6, s1: 2.6, deckY: 2.75, pineY: 4.65, d: 1.15 }),
    build: buildYama
  }),
  defineAsset({
    id: 'roof-skyline-pagodas', family: 'rooffestival', lab: 'roofroad/pagoda', label: 'Skyline pagoda', tiers: TIERS,
    params: { height: { type: 'number', default: 27, min: 12, max: 40, step: 1, label: 'Height (m per scale unit)' } },
    sample: { ...base, type: 'skyline-pagoda', band: 'far', scale: 1.35 },
    build: buildSkylinePagoda
  }),
  hillsAsset, skyAsset, okuribiAsset, cityAsset, atmosphereAsset
];
