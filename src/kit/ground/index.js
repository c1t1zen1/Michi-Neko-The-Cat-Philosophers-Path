// Ground family (Phase 2, wave 2.3, lane v-ground): lab 01 "Ground, path &
// shoulders" promoted into the valley.
//   valley-ground   the classic height field, vertex for vertex, on one
//                   GroundField + the one ground material (height blend,
//                   hex-tiling, pavings + POM, wetness, puddles, snow)
//   path            the road: Kyoto paving painted into the field
//   path-shoulders  the worn shoulders: standing wear in the field
//   path-slabs      tobi-ishi stepping stones (the catalog's walkway)
// Tiers: hero (quality high) has everything; mid (quality medium) drops POM,
// puddles and rain rings; far also drops to the 2-tap sampler. Quality low
// never reaches the kit (the classic ground stays).
import { defineAsset } from '../contract.js?v=20261113a';
import { buildValleyGround } from './valley.js?v=20261113a';
import { buildRoad, buildShoulders, ROAD_POINTS } from './road.js?v=20261113a';
import { buildSlabs, sampleSlabs } from './slabs.js?v=20261113a';
import * as THREE from 'three';

const emptyFootprint = () => ({ colliders: [], platforms: [], exclusions: [], waterRects: [], anchors: {}, lists: {} });

const GROUND_PARAMS = {
  hex_cell: { type: 'number', default: 1.25, min: 0.6, max: 2.5, step: 0.05, label: 'Hex-tile cell (m)' },
  blend: { type: 'number', default: 0.2, min: 0.05, max: 0.5, step: 0.01, label: 'Height-blend window' },
  macro: { type: 'number', default: 1, min: 0, max: 1.5, step: 0.05, label: 'Big shapes (macro washes)' },
  fringe: { type: 'number', default: 1, min: 0, max: 1.5, step: 0.05, label: 'Komorebi warm fringe' },
  regrow_minutes: { type: 'number', default: 30, min: 2, max: 240, step: 1, label: 'Trail regrowth (minutes)', visual: false }
};

const PATH_PARAMS = {
  paving: { type: 'enum', default: 'nobedan', options: ['setts', 'slabs', 'nobedan', 'arare', 'uroko', 'araidashi'], label: 'Paving' },
  width: { type: 'number', default: 3.8, min: 3, max: 4.6, step: 0.1, label: 'Width (m)' },
  moss: { type: 'number', default: 0.2, min: 0, max: 0.5, step: 0.01, label: 'Moss in the joints' }
};

const SHOULDER_PARAMS = {
  width: { type: 'number', default: 6.4, min: 5, max: 8, step: 0.1, label: 'Worn width (m)' },
  wear: { type: 'number', default: 0.75, min: 0.3, max: 1, step: 0.05, label: 'Standing wear' },
  gravel: { type: 'number', default: 0.35, min: 0, max: 0.8, step: 0.05, label: 'Kicked gravel' }
};

const SLAB_PARAMS = {
  proud: { type: 'number', default: 1, min: 0.6, max: 1.6, step: 0.05, label: 'Height proud' },
  round: { type: 'number', default: 0.5, min: 0, max: 1, step: 0.05, label: 'Worn arris' },
  irregular: { type: 'number', default: 0.5, min: 0, max: 1, step: 0.05, label: 'Irregular outline' }
};

/** The road layout the game builds (countryside.js layoutPath): its points and the path samples anchor. */
function samplePath() {
  const curve = new THREE.CatmullRomCurve3(ROAD_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  return { index: 0, name: 'Cobbled Path', points: ROAD_POINTS.map((p) => [...p]), footprint: { ...emptyFootprint(), anchors: { pathSamples: curve.getPoints(100) } } };
}

export const assets = [
  defineAsset({
    id: 'valley-ground', family: 'ground', lab: 'ground/height', label: 'Valley ground and terrain', legacyName: 'Village Ground',
    params: GROUND_PARAMS, tiers: ['hero', 'mid', 'far'],
    sample: () => ({ index: 0, name: 'Village Ground', band: 'near', footprint: emptyFootprint() }),
    build: buildValleyGround
  }),
  defineAsset({
    id: 'path', family: 'ground', lab: 'ground/setts', label: 'Cobbled valley path', legacyName: 'Cobbled Path',
    params: PATH_PARAMS, tiers: ['hero', 'mid', 'far'], sample: samplePath, build: buildRoad
  }),
  defineAsset({
    id: 'path-shoulders', family: 'ground', lab: 'ground/height', label: 'Earthen path shoulders', legacyName: 'Earthen Shoulders',
    params: SHOULDER_PARAMS, tiers: ['hero', 'mid', 'far'],
    sample: () => ({ index: 0, name: 'Earthen Shoulders', footprint: emptyFootprint() }),
    build: buildShoulders
  }),
  defineAsset({
    id: 'path-slabs', family: 'ground', lab: 'ground/slabs', label: 'Walkway stone slabs',
    params: SLAB_PARAMS, tiers: ['hero', 'mid', 'far'], sample: sampleSlabs, build: buildSlabs
  })
];
