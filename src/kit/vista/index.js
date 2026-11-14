// The vista family (Phase 4, lane s3-vista): the summit's view of Kyoto, the
// Higashiyama pagoda, the bay, the harbour, the bay bridge, the Ferris wheel and
// the ranges that close the horizon, seen from 0.5 to 5 km from the meditation
// seat. Lab: labs/summit (lab 09, specimens v-*). Every layout comes from
// src/summit/vista.js; the summit recolours these meshes from the sky palette
// by manager field, which each asset carries as a footprint anchor in the
// classic shape (see the handoff).
//   promoted: summit-vista, vista-terrain, kyoto-city, summit-pagoda,
//             summit-bay, harbour, bay-bridge, ferris-wheel, horizon
//   deferred (classic): summit-clouds (the sky kit is not merged),
//             (blender-roofscape is a media GLB with a fallback, not a kit asset)
//   reuse: pagoda (measured Yasaka-no-to builder), ranges (ridgeRingGeometry)
import { defineAsset } from '../contract.js?v=20261113a';
import { mulberry32 } from '../../summit/common.js?v=20261113a';
import { buildVistaAssembly, buildVistaTerrain, buildKyotoCity } from './city.js?v=20261113a';
import { buildSummitPagoda } from './landmark.js?v=20261113a';
import { buildSummitBay, buildHarbour, buildBayBridge, buildFerrisWheel } from './sea.js?v=20261113a';
import { buildHorizon } from './horizon.js?v=20261113a';

const num = (def, min, max, step, label) => ({ type: 'number', default: def, min, max, step, label });
const FP = { colliders: [], platforms: [], exclusions: [], anchors: {} };

/** The classic harbour layout, from the harbour's own stream (mulberry32(19271)): 138 towers and four islands. */
function harbourLayout(index) {
  const rnd = mulberry32(19271), towers = [];
  for (let i = 0; i < 138; i++) {
    const z = 178 + rnd() * 48, x = (rnd() - 0.5) * 245, landmark = rnd() < 0.12;
    const w = 0.9 + rnd() * (landmark ? 3.4 : 2.2), d = 0.8 + rnd() * 2.4, h = 1.3 + rnd() * rnd() * (landmark ? 15 : 7.5), ry = (rnd() - 0.5) * 0.08;
    const color = [0x74878f, 0x91a0a1, 0xa2aaa6, 0x6d808b][Math.floor(rnd() * 4)];
    const lit = landmark || rnd() < 0.42;
    towers.push({ x, z, w, d, h, ry, color, lit });
  }
  const islands = [[-128, -13.05, 279, 31, 3.8, 18], [119, -13.25, 305, 43, 4.8, 21], [-38, -13.35, 356, 24, 3.1, 14], [187, -13.45, 382, 56, 5.2, 26]]
    .map(([x, y, z, sx, sy, sz]) => ({ x, y, z, sx, sy, sz, ry: rnd() * Math.PI }));
  return { index, x: 0, y: 0, z: 0, towers, islands, footprint: FP };
}

export const assets = [
  defineAsset({
    id: 'summit-vista', family: 'vista', lab: 'summit/v-assembly', label: 'Layered Kyoto Bay Vista (the assembly)',
    params: {},
    sample: { index: 0, name: 'Layered Kyoto Bay Vista', x: 0, y: 0, z: 0, footprint: FP },
    build: buildVistaAssembly
  }),
  defineAsset({
    id: 'vista-terrain', family: 'vista', lab: 'summit/v-ribbons', label: 'River and street ribbons',
    params: { river_width: num(1, 0.6, 1.6, 0.05, 'River width'), road_width: num(1, 0.6, 1.8, 0.05, 'Street width') },
    footprintWaiver: 'footprint.anchors.vistaRiverMat / vistaRoadMat: the two materials the summit recolours (classic sets the same fields)',
    sample: { index: 0, parent: 'Layered Kyoto Bay Vista', x: 0, y: 0, z: 0, footprint: FP },
    build: buildVistaTerrain
  }),
  defineAsset({
    id: 'kyoto-city', family: 'vista', lab: 'summit/v-city', label: 'Kyoto from the summit',
    params: {
      density: num(1, 0.5, 1.25, 0.05, 'House density'),
      gardens: num(1, 0.3, 1.5, 0.05, 'Garden trees'),
      lamp: num(0.3, 0, 1, 0.05, 'Window light warmth')
    },
    footprintWaiver: 'footprint.anchors.city*: the instanced walls, roofs, eaves, gardens, their materials and counts, and the window lights the summit recolours and thins by quality (classic sets the same fields)',
    sample: { index: 0, parent: 'Layered Kyoto Bay Vista', x: 0, y: 0, z: 0, footprint: FP },
    build: buildKyotoCity
  }),
  defineAsset({
    id: 'summit-pagoda', family: 'vista', lab: 'summit/v-pagoda', label: 'Higashiyama five-storey pagoda',
    params: {
      height: num(13.5, 9, 24, 0.5, 'Height (m)'),
      paint: { type: 'enum', default: 'natural', options: ['natural', 'game', 'vermilion', 'faded'], label: 'Paint' },
      age: num(0.35, 0, 1, 0.05, 'Weathering'),
      lanterns: { type: 'boolean', default: true, label: 'Evening lanterns' }
    },
    footprintWaiver: 'footprint.anchors.pagodaWallMat / pagodaTimberMat / pagodaRoofMat: small proxies the summit recolours; update() applies them to the one vertex-coloured material',
    sample: { index: 0, name: 'Higashiyama Five Storey Pagoda', parent: 'Layered Kyoto Bay Vista', x: -27, y: -6.5, z: 86, ry: -0.08, footprint: FP },
    build: buildSummitPagoda
  }),
  defineAsset({
    id: 'summit-bay', family: 'vista', lab: 'summit/v-bay', label: 'Kyoto Bay water, sun path and boats',
    floating: ['glints'],
    params: {
      swell: num(1, 0, 2, 0.1, 'Swell'),
      glints: num(1, 0.3, 1.6, 0.1, 'Sun glints'),
      boats: num(7, 3, 11, 1, 'Boats')
    },
    footprintWaiver: 'footprint.anchors bayMat / bayTexture / bayGlints / bayGlintMat / vistaBoats: what the summit tints, scrolls, aims and sails (classic sets the same fields)',
    sample: { index: 0, name: 'Kyoto Bay Water', parent: 'Layered Kyoto Bay Vista', x: 0, y: 0, z: 0, footprint: FP },
    build: buildSummitBay
  }),
  defineAsset({
    id: 'harbour', family: 'vista', lab: 'summit/v-harbour', label: 'Harbour skyline, quay cranes and islands',
    params: { cranes: num(5, 0, 9, 1, 'Quay cranes') },
    footprintWaiver: 'footprint.anchors harbourSkyline(+Max) / skylineMat / harbourLights(+Mat) / vistaIslands / islandMat: what the summit tints and thins by quality (classic sets the same fields)',
    // index 0 is the largest real layout (138 towers, lights, quay fittings); index 1 (islands) is a quarter of it
    sample: () => ({ ...harbourLayout(0), parent: 'Layered Kyoto Bay Vista' }),
    build: buildHarbour
  }),
  defineAsset({
    id: 'bay-bridge', family: 'vista', lab: 'summit/v-bridge', label: 'Bay bridge',
    params: { tower_height: num(1, 0.8, 1.3, 0.05, 'Tower height'), sag: num(0.3, 0.1, 0.5, 0.05, 'Cable sag') },
    footprintWaiver: 'footprint.anchors.bridgeMat: the material the summit recolours (classic sets the same field)',
    sample: { index: 0, name: 'Bay Bridge', parent: 'Layered Kyoto Bay Vista', x: 8, y: 0, z: 238, footprint: FP },
    build: buildBayBridge
  }),
  defineAsset({
    id: 'ferris-wheel', family: 'vista', lab: 'summit/v-wheel', label: 'Harbour Ferris wheel',
    params: { spokes: num(8, 6, 16, 2, 'Spokes'), gondolas: num(12, 6, 20, 2, 'Gondolas') },
    footprintWaiver: 'footprint.anchors.ferrisWheelMat: the material the summit recolours and kindles at night (classic sets the same field)',
    sample: { index: 0, name: 'Harbour Ferris Wheel', parent: 'Layered Kyoto Bay Vista', x: 91, y: -4.15, z: 205, footprint: FP },
    build: buildFerrisWheel
  }),
  defineAsset({
    id: 'horizon', family: 'vista', lab: 'summit/v-horizon', label: 'Three ranges that close the bay',
    params: { relief: num(1, 0.6, 1.4, 0.05, 'Relief'), crest: num(1, 0, 2, 0.1, 'Lit crest') },
    footprintWaiver: 'footprint.anchors.horizonRangeMats: the three layer materials whose haze the summit drives (classic sets the same field)',
    sample: { index: 0, parent: 'Layered Kyoto Bay Vista', x: 0, y: 0, z: 0, footprint: FP },
    build: buildHorizon
  })
];
