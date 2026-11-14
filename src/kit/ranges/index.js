// Ranges family (Phase 2, wave 2.3): lab 03 for everything that holds the valley in.
//   mountains         the far ranges ring (its components are placed by the runtime)
//   edge-forest       the 260-tree wall of painted leaf masses (the shrine thicket parts bind here)
//   edge-undergrowth  the shrub belt in front of the wall
//   foothill-forest   cedars and broadleaf crowns on the slopes
//   distant-village   the hillside houses (one baked mesh) and their hearth windows
//   mist-ring         haze sprites round the rim
//   dawn-mist         low river mist for first light
// General builders for the summit horizon (s3-vista): landform.js
// (`ridgeRingGeometry`, `valleyRangeColors`, `terrainHeight`) and forest.js
// (`canopySet`, `flaredTrunk`).
import { defineAsset } from '../contract.js?v=20261113a';
import { terrainHeight, terrainSector } from './landform.js?v=20261113a';
import { buildMountains } from './mountains.js?v=20261113a';
import { buildEdgeForest, buildEdgeUndergrowth, buildFoothillForest } from './forest.js?v=20261113a';
import { buildDistantVillage } from './village.js?v=20261113a';
import { buildMistRing, buildDawnMist } from './mist.js?v=20261113a';

const rngOf = (seed) => { let a = seed; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

/* Samples: the REAL layouts the game builds (same draws, seeded locally) so the contract test sees the largest case. */

function sampleMountains() { return { index: 0, band: 'far', components: [] }; }

function sampleEdgeForest() {
  const r = rngOf(41), count = 260, assign = [], trees = [];
  for (let i = 0; i < count; i++) assign.push(Math.floor(r() * 4));
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + r() * 0.09, rad = 37 + r() * 7, s = 1.8 + r() * 2.4;
    const rotCrown = r() * Math.PI * 2, sx = s * (0.9 + r() * 0.2), sz = s * (0.9 + r() * 0.2), rotTrunk = r() * Math.PI;
    trees.push({ a, x: Math.cos(a) * rad, z: Math.sin(a) * rad, s, rotCrown, sx, sz, rotTrunk, tint: [0.88 + r() * 0.24, 0.9 + r() * 0.2, 0.84 + r() * 0.22] });
  }
  return { index: 0, name: 'Edge Forest Trunks', band: 'rim', assign, trees };
}

function sampleUndergrowth() {
  const r = rngOf(43), bushes = [];
  for (let n = 0; n < 160; n++) {
    const a = r() * Math.PI * 2, rad = 35.5 + r() * 8, s = 0.9 + r() * 1.6;
    bushes.push({ r: rad, s, x: Math.cos(a) * rad, z: Math.sin(a) * rad, rotY: r() * Math.PI, hue: (r() - 0.5) * 0.03, light: (r() - 0.5) * 0.08 });
  }
  return { index: 0, name: 'Wall Undergrowth', band: 'rim', bushes };
}

function sampleFoothills() {
  const r = rngOf(47), trees = [];
  for (let i = 0; i < 3800; i++) {
    const a = r() * Math.PI * 2, rad = 60 + Math.pow(r(), 0.75) * 130, x = Math.cos(a) * rad, z = Math.sin(a) * rad;
    const { opening } = terrainSector(x, z);
    if (r() < opening * 0.93) continue;
    const kind = r() < (rad < 95 ? 0.5 : 0.78) ? (r() < 0.5 ? 0 : 1) : 2, y = terrainHeight(x, z);
    if (kind === 2) {
      const s = 1.1 + r() * 1.7;
      trees.push({ kind, position: [x, y + s * 0.45, z], scale: [s * (0.8 + r() * 0.5), s * 1.1, s * (0.8 + r() * 0.5)], rotation: [r() * 0.3, r() * Math.PI, r() * 0.3], hsl: [0.24 + r() * 0.08, 0.32 + r() * 0.14, 0.17 + r() * 0.1] });
    } else {
      const s = 0.9 + r() * 1.4;
      trees.push({ kind, position: [x, y - 0.2, z], scale: [s * (0.85 + r() * 0.3), s * (1 + r() * 0.5), s * (0.85 + r() * 0.3)], rotation: [(r() - 0.5) * 0.12, r() * Math.PI, (r() - 0.5) * 0.12], hsl: [0.33 + r() * 0.07, 0.26 + r() * 0.14, 0.13 + r() * 0.09] });
    }
  }
  return { index: 0, band: 'far', count: 3800, trees };
}

function sampleVillage() {
  const r = rngOf(53), houses = [];
  for (const [cx, cz, n] of [[-62, -78, 9], [18, -88, 12], [78, -70, 8], [-95, -35, 6], [95, -20, 7], [40, -96, 6]]) {
    for (let i = 0; i < n; i++) {
      const s = 1.4 + r() * 1.6, windows = [];
      const wall = Math.floor(r() * 4), roof = Math.floor(r() * 5), wn = 1 + Math.floor(r() * 3);
      for (let w = 0; w < wn; w++) windows.push([r() < 0.5 ? 1 : -1, (r() - 0.5) * 1.8 * s, (0.6 + r() * 0.7) * s]);
      houses.push({ name: `Distant House ${cx > 0 ? 'E' : 'W'}${i + 1}`, x: cx + (r() - 0.5) * 26, y: 0, z: cz + (r() - 0.5) * 18, s, wall, roof, windows, ry: r() * Math.PI });
    }
  }
  return { index: 0, band: 'far', houses };
}

function sampleMistRing() {
  const r = rngOf(59), sprites = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + r() * 0.3, rad = 58 + r() * 14, x = Math.cos(a) * rad, z = Math.sin(a) * rad;
    sprites.push({ x, y: terrainHeight(x, z) + 2 + r() * 4, z, scale: [28 + r() * 22, 10 + r() * 8], phase: r() * 6, speed: 0.03 + r() * 0.04 });
  }
  return { index: 0, band: 'rim', sprites };
}

function sampleDawnMist() {
  const r = rngOf(61), sprites = [];
  for (let i = 0; i < 12; i++) sprites.push({ x: -60 + i * 10 + (r() - 0.5) * 3, y: 0.75 + r() * 0.5, z: 29 + (r() - 0.5) * 3, scale: [15 + r() * 9, 3.2 + r() * 1.6], phase: r() * 6, speed: 0.04 + r() * 0.05 });
  return { index: 0, band: 'near', sprites };
}

const FLOATING_MIST = (n) => Array.from({ length: n }, (_, i) => `mist_${i + 1}`);

export const assets = [
  defineAsset({
    id: 'mountains', family: 'ranges', lab: 'ranges/stack', label: 'Mountain ranges', legacyName: 'Mountains',
    params: {
      forest: { type: 'number', default: 1, min: 0, max: 1, step: 0.1, label: 'Forest cover' },
      strata: { type: 'number', default: 0.5, min: 0, max: 1, step: 0.1, label: 'Rock strata' },
      haze: { type: 'number', default: 1, min: 0.5, max: 1.3, step: 0.05, label: 'Baked haze' }
    },
    tiers: ['hero', 'mid', 'far'], sample: sampleMountains, build: buildMountains
  }),
  defineAsset({
    id: 'edge-forest', family: 'ranges', lab: 'ranges/wall-mass', label: 'Edge forest', legacyName: 'Edge Forest Trunks',
    params: {
      crown_fill: { type: 'number', default: 1, min: 0.7, max: 1.3, step: 0.05, label: 'Crown fullness' },
      trunk_flare: { type: 'number', default: 0.6, min: 0, max: 1, step: 0.1, label: 'Root flare' },
      warmth: { type: 'number', default: 0, min: -1, max: 1, step: 0.25, label: 'Leaf warmth' }
    },
    tiers: ['hero', 'mid', 'far'], sample: sampleEdgeForest, build: buildEdgeForest
  }),
  defineAsset({
    id: 'edge-undergrowth', family: 'ranges', lab: 'ranges/edge', label: 'Edge undergrowth', legacyName: 'Wall Undergrowth',
    params: {
      lump: { type: 'number', default: 0.36, min: 0.2, max: 0.55, step: 0.02, label: 'Lumpiness' },
      lobes: { type: 'number', default: 7, min: 5, max: 9, step: 1, label: 'Lobes' }
    },
    floating: ['wall_a', 'wall_b', 'thicket'], // classic seats the shrubs at y = s/2 too; the lobes hang a little above the ground
    tiers: ['hero', 'mid', 'far'], sample: sampleUndergrowth, build: buildEdgeUndergrowth
  }),
  defineAsset({
    id: 'foothill-forest', family: 'ranges', lab: 'ranges/foothills', label: 'Foothill forest', legacyName: 'Foothill Forest',
    params: {
      lump: { type: 'number', default: 0.3, min: 0.15, max: 0.5, step: 0.05, label: 'Cedar roughness' },
      crown_lump: { type: 'number', default: 0.36, min: 0.2, max: 0.5, step: 0.02, label: 'Crown roughness' }
    },
    tiers: ['hero', 'mid', 'far'], sample: sampleFoothills, build: buildFoothillForest
  }),
  defineAsset({
    id: 'distant-village', family: 'ranges', lab: 'ranges/village', label: 'Distant village', legacyName: 'Distant Village',
    params: {
      pitch: { type: 'number', default: 1, min: 0.7, max: 1.4, step: 0.05, label: 'Roof pitch' },
      eave: { type: 'number', default: 1, min: 0.4, max: 1.6, step: 0.1, label: 'Eave overhang' },
      warmth: { type: 'number', default: 0, min: -1, max: 1, step: 0.25, label: 'Wall warmth' }
    },
    tiers: ['hero', 'mid', 'far'], sample: sampleVillage, build: buildDistantVillage
  }),
  defineAsset({
    id: 'mist-ring', family: 'ranges', lab: 'ranges/air', label: 'Valley mist ring', legacyName: 'Mist Ring',
    params: {
      size: { type: 'number', default: 1, min: 0.6, max: 1.5, step: 0.05, label: 'Haze size' },
      tint: { type: 'color', default: 0xffffff, label: 'Haze tint' }
    },
    floating: FLOATING_MIST(14), tiers: ['hero', 'mid', 'far'], sample: sampleMistRing, build: buildMistRing
  }),
  defineAsset({
    id: 'dawn-mist', family: 'ranges', lab: 'ranges/air', label: 'River dawn mist', legacyName: 'Dawn Mist',
    params: { size: { type: 'number', default: 1, min: 0.6, max: 1.5, step: 0.05, label: 'Ribbon size' } },
    floating: FLOATING_MIST(12), tiers: ['hero', 'mid', 'far'], sample: sampleDawnMist, build: buildDawnMist
  })
];
