// Water family (Phase 2, wave 2.3 — systems): Lab 02 "River, bridge &
// paddies" promoted for the valley.
//   river          the river surface: CPU water field + the lab's `kyoto` shader
//   bridge         the Kiyomizu bridge as a Sanjō-style giboshi-kōran beam bridge
//   paddies        the paddy water sheets through the seasons
//   paddy-bunds    one plot's bed and aze banks (new focused study: water/p-aze)
//   rice           the rice hills on the transplanting grid
//   water-ripples  the cat's and the koi's ripple-ring pool
// Gameplay is untouched: every footprint is the classic layout's (water rects,
// river samples and curve, the bridge's deck / rail / ramp platforms and water
// clearances), the water sits at y = 0.02, and the bound parts are kept
// (`water` → riverMat, `water_1…4` → paddyWaterMaterials, `ring_1…24` →
// ripples). See docs/fable/status/v-water.md.
import { defineAsset } from '../contract.js?v=20261113a';
import { buildRiver, RIVER_POINTS } from './river.js?v=20261113a';
import { buildBridge, BRIDGE, rampHeight } from './bridge.js?v=20261113a';
import { buildPaddies, buildBunds, buildRice, SEASONS } from './paddies.js?v=20261113a';
import { buildRipples } from './ripples.js?v=20261113a';
import { mulberry32 } from '../rng.js?v=20261113a';
import * as THREE from 'three';

export { RiverField, riverFrames, bedDepth } from './field.js?v=20261113a';
export { BRIDGE, rampHeight, SEASONS };

/* --------------------------------------------------------------- samples --- */

// The real layouts the valley builds (countryside.js layoutRiverAndBridge /
// layoutPaddies / layoutRipplePool), so the contract test measures what
// players see. Functions, so the curve and Box3s stay live objects.
const PLOTS = [[-26, 22, 14, 10], [14, 22, 12, 10], [28, 22, 12, 10], [26, -2, 12, 12]];

function sampleRiver() {
  const curve = new THREE.CatmullRomCurve3(RIVER_POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  return {
    index: 0, name: 'River', band: 'near',
    footprint: { colliders: [], platforms: [], exclusions: [], waterRects: [], anchors: { riverCurve: curve, riverSamples: curve.getPoints(60) }, lists: {} }
  };
}

function sampleBridge() {
  const B = BRIDGE, top = B.top;
  const ramp = (sz) => ({
    getHeightAt: (x, z, margin = 0) => {
      if (x < -B.halfW - margin || x > B.halfW + margin) return null;
      const outward = sz * z - B.halfL;
      if (outward < -margin || outward > B.ramp + margin) return null;
      return rampHeight(outward);
    },
    getNormalAt: () => new THREE.Vector3(0, 1, sz * top / B.ramp).normalize()
  });
  return {
    index: 0, name: 'Kiyomizu Bridge', x: 0, z: 0,
    footprint: {
      colliders: [], exclusions: [{ x: 0, z: 0, width: 4.2, depth: 15.2 }], waterRects: [], lists: {},
      anchors: {
        bridgeDeckWaterClearance: { x: 0, z: 0, width: 2.7, depth: 8.5, underpassY: 0.42 },
        bridgeRampWaterExclusions: [{ x: 0, z: -5.5, width: 3.0, depth: 2.95 }, { x: 0, z: 5.5, width: 3.0, depth: 2.95 }]
      },
      platforms: [
        new THREE.Box3(new THREE.Vector3(-B.halfW, 0, -B.halfL), new THREE.Vector3(B.halfW, top, B.halfL)),
        ...[-1, 1].map((s) => new THREE.Box3(new THREE.Vector3(s * B.railX - B.railHalf, 0, -B.halfL), new THREE.Vector3(s * B.railX + B.railHalf, B.railTop, B.halfL))),
        ramp(-1), ramp(1)
      ]
    }
  };
}

const samplePaddies = () => ({
  index: 0, plots: PLOTS.map((p) => p.slice()),
  footprint: { colliders: [], platforms: [], exclusions: [], waterRects: PLOTS.map((p) => p.slice()), anchors: {}, lists: {} }
});

// the largest plot (12 × 12 m, the longest bund run)
const sampleBunds = () => ({ index: 3, plot: 4, x: 0, z: 0, w: 12, d: 12, footprint: { colliders: [], platforms: [], exclusions: [], waterRects: [], anchors: {}, lists: {} } });

// every plot's stalks, drawn the way layoutPaddies() draws them
function sampleRice() {
  const r = mulberry32(20260729);
  const stalks = [];
  let capacity = 0;
  for (const [px, pz, w, d] of PLOTS) {
    const n = Math.floor(w * d / 1.6);
    capacity += n;
    for (let i = 0; i < n; i++) stalks.push([px + (r() - 0.5) * (w - 1.2), pz + (r() - 0.5) * (d - 1.2), r() * Math.PI, 0.7 + r() * 0.6]);
  }
  return { index: 0, name: 'Rice Stalks', capacity, stalks, footprint: { colliders: [], platforms: [], exclusions: [], waterRects: [], anchors: {}, lists: {} } };
}

const sampleRipples = () => ({ index: 0, count: 24, footprint: { colliders: [], platforms: [], exclusions: [], waterRects: [], anchors: {}, lists: {} } });

/* ---------------------------------------------------------------- params --- */

const SEASON = { type: 'enum', default: 'early', options: SEASONS, label: 'Season' };

export const assets = [
  defineAsset({
    id: 'river', family: 'water', lab: 'water/kyoto', label: 'River', legacyName: 'River',
    params: {
      clarity: { type: 'number', default: 2.1, min: 0.8, max: 3.6, step: 0.1, label: 'Clarity (absorption per metre)' },
      flow: { type: 'number', default: 0.9, min: 0.3, max: 1.6, step: 0.05, label: 'Current (m/s, thalweg)' },
      foam: { type: 'number', default: 1, min: 0, max: 1.5, step: 0.05, label: 'Foam' },
      rough: { type: 'number', default: 0.6, min: 0.2, max: 1.2, step: 0.05, label: 'Ripple strength' },
      paint: { type: 'number', default: 0.25, min: 0, max: 1, step: 0.05, label: 'Painter’s sky gradient' },
      deep: { type: 'color', default: 0x1d4a5a, label: 'Deep water' },
      shallow: { type: 'color', default: 0x5c9a8e, label: 'Shallow water' }
    },
    tiers: ['hero', 'mid', 'far'], sample: sampleRiver, build: buildRiver
  }),
  defineAsset({
    id: 'bridge', family: 'water', lab: 'water/b-sanjo', label: 'Kiyomizu bridge (Sanjō kōran)', legacyName: 'Kiyomizu Bridge',
    params: {
      giboshi: { type: 'boolean', default: true, label: 'Bronze giboshi on the end posts' },
      plank_gap: { type: 'number', default: 0.014, min: 0.004, max: 0.03, step: 0.002, label: 'Gap between deck planks (m)' }
    },
    tiers: ['hero', 'mid', 'far'], sample: sampleBridge, build: buildBridge
  }),
  defineAsset({
    id: 'paddies', family: 'water', lab: 'water/p-taue', label: 'Paddy water',
    params: {
      season: SEASON,
      still: { type: 'number', default: 0.25, min: 0, max: 0.6, step: 0.05, label: 'Mirror (windless sheet)' },
      film: { type: 'number', default: 1, min: 0, max: 1.5, step: 0.05, label: 'Duckweed by the bunds' }
    },
    tiers: ['hero', 'mid', 'far'], sample: samplePaddies, build: buildPaddies
  }),
  defineAsset({
    id: 'paddy-bunds', family: 'water', lab: 'water/p-aze', label: 'Paddy bed and aze banks',
    params: {
      mizuguchi: { type: 'boolean', default: true, label: 'Water inlet notch and board' }
    },
    tiers: ['hero', 'mid', 'far'], sample: sampleBunds, build: buildBunds
  }),
  defineAsset({
    id: 'rice', family: 'water', lab: 'water/p-taue', label: 'Rice hills', legacyName: 'Rice Stalks',
    params: {
      season: SEASON,
      height: { type: 'number', default: 1, min: 0.6, max: 1.4, step: 0.05, label: 'Height' }
    },
    tiers: ['hero', 'mid', 'far'], sample: sampleRice, build: buildRice
  }),
  defineAsset({
    id: 'water-ripples', family: 'water', lab: 'water/ripple', label: 'Ripple rings',
    params: {
      color: { type: 'color', default: 0xf2fbf7, label: 'Ring colour' }
    },
    // the rings lie on the water (y = 0.045), not on the ground
    floating: Array.from({ length: 64 }, (_, i) => `ring_${i + 1}`),
    tiers: ['hero', 'mid', 'far'], sample: sampleRipples, build: buildRipples
  })
];
