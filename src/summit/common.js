// Shared summit constants and helpers (天上), split out of
// src/mountaintop.js: the clearing's dimensions in summit-local metres, the
// stepped approach profile, the scenic perch camera offset, the seeded
// mulberry32 generator, small geometry and easing helpers, and the weather
// cross-fade amount. Imported by the SummitManager facade and every
// src/summit/ module.

import * as THREE from 'three';

export function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// The summit lives in its own coordinate pocket, like the Tea House
// interior — far enough that the valley's mountain ring and fog swallow it
// completely. Everything under this.group is local to the clearing.
export const ORIGIN = new THREE.Vector3(0, -1200, 0);
export const MEADOW_R = 10.75;         // intimate playable clearing radius
export const MEADOW_Y = 0.08;          // shared render + physics surface
export const CORRIDOR_W = 2.9;         // ocean-side stair half-width
export const CORRIDOR_Z0 = 8.25;       // top tread where the stair meets the grass
export const CORRIDOR_Z1 = 20.25;      // lower arrival landing
export const GATE_Z = 16.2;            // overlook torii line in local space
export const ENTRY_Y = -1.6;
export const STEP_COUNT = 7;
export const STEP_RUN = 1.05;
export const STEP_RISE = 0.28;
export const LANDING_Z0 = CORRIDOR_Z0 + STEP_COUNT * STEP_RUN;
export const LANDING_Z1 = CORRIDOR_Z1 + 0.35;
// Past the landing the stone path keeps descending through the trees toward
// the city. It is scenery only: constrain() stops the cat at the landing.
export const LOWER_STEP_COUNT = 15;
export const LOWER_STEP_RUN = 1.7;
export const LOWER_STEP_RISE = 0.26;
export const LOWER_PATH_Z1 = LANDING_Z1 + LOWER_STEP_COUNT * LOWER_STEP_RUN;
// One continuous landform reaches the horizon in every direction.
export const LAND_OUTER_R = 440;
// Scenic camera offset from the seated cat. Planting on the bay-facing
// slopes is capped to stay under this eye's line over the meadow rim.
export const PERCH_CAM = { x: -1.9, y: 2.15, z: -5.2 };

/** Render and physics share the same stepped profile down to the torii. */
export function approachTopAt(z) {
  if (z >= LANDING_Z0) return ENTRY_Y;
  const step = Math.min(STEP_COUNT - 1,
    Math.max(0, Math.floor((z - CORRIDOR_Z0) / STEP_RUN)));
  return Math.max(ENTRY_Y, MEADOW_Y - step * STEP_RISE);
}

/** Tread tops of the scenic lower path, which starts where the landing ends. */
export function lowerStepTopAt(z) {
  if (z <= LANDING_Z1) return ENTRY_Y;
  const step = Math.min(LOWER_STEP_COUNT - 1, Math.floor((z - LANDING_Z1) / LOWER_STEP_RUN));
  return ENTRY_Y - (step + 1) * LOWER_STEP_RISE;
}

// Seconds of stillness in the meadow heart before the cat curls up to sleep.
export const MEDITATE_SECONDS = 165;

/** Smooth amount for a weather type while Sky cross-fades between states. */
export function summitWeatherAmount(sky, type) {
  if (!sky) return 0;
  if (typeof sky.weatherAmount === 'function') return sky.weatherAmount(type);
  const blend = Number.isFinite(sky.weatherBlend) ? sky.weatherBlend : 1;
  const from = sky.weather === type ? 1 : 0;
  const to = (sky.targetWeather == null ? sky.weather : sky.targetWeather) === type ? 1 : 0;
  return from * (1 - blend) + to * blend;
}

/**
 * A layout footprint in the summit's classic registration format (Integrator
 * rulings R12, R18): `colliders` are addColliderBox(minX, minY, minZ, maxX,
 * maxY, maxZ) argument lists and `platforms` addPlatformBox(minX, topY, minZ,
 * maxX, bottomY, maxZ) argument lists, summit-local, in registration order.
 * The summit has no vegetation exclusions (its grass mask is painted from the
 * colliders) and no water rects.
 */
export function summitFootprint(colliders = [], platforms = []) {
  return { colliders, platforms, exclusions: [], anchors: {} };
}

/** Register a footprint through the classic helpers, in order. `this` = the manager. */
export function registerFootprint(footprint) {
  for (const box of footprint.colliders) this.addColliderBox(...box);
  for (const box of footprint.platforms) this.addPlatformBox(...box);
}
