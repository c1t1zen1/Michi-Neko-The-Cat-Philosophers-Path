// Per-tier budgets the contract test (tools/kit_contract_test.html, AAA-7)
// holds every kit asset to. Machine-readable twin of
// docs/fable/baseline/budgets.md (Phase 0, step P0.5; operator decision D1).
//
// STATUS: ACCEPTED provisionally under operator decision D1 (docs/fable/decisions.md,
// D1; the operator may overturn). Numbers are copied from
// docs/fable/baseline/budgets.md section 3 ("Triangles, draw calls and build time
// per asset") and section 1. Frame-ms rows of budgets.md stay provisional (they
// are judged by tools/perf_spots.mjs in the same session, not by this file).
// tools/kit_check.mjs reports the status.
//
// Pure data: no imports, loads under Node.

export const BUDGET_SOURCE = Object.freeze({
  file: 'docs/fable/baseline/budgets.md',
  status: 'accepted',
  decision: 'D1',
  note: 'budgets.md section 3 (per-asset caps, Building/Tree class), accepted provisionally under D1; frame-ms rows stay provisional'
});

/**
 * One row per tier, the largest class of budgets.md section 3 (Building /
 * Tree: 25,000 / 6,000 / 1,000 triangles; first-build 6 / 3 / 1.5 ms).
 * Smaller classes (prop, structure, character) may be held tighter through
 * BUDGET_EXCEPTIONS. `triangles` and `meshes` are per instance (an
 * instanced draw, InstancedMesh or InstancedBufferGeometry, counts every
 * instance in triangles and once in meshes: craft.js countScene);
 * `buildMs` is the warm-build allowance; `materials` is the per-asset
 * distinct-material cap (6 / 4 / 2, all from MAT / KitMaterials).
 * Handover distances: hero < 12 m, mid 12-45 m, far >= 45 m.
 */
export const BUDGETS = Object.freeze({
  hero: Object.freeze({ triangles: 25000, meshes: 16, buildMs: 6, materials: 6 }),
  mid: Object.freeze({ triangles: 6000, meshes: 8, buildMs: 3, materials: 4 }),
  far: Object.freeze({ triangles: 1000, meshes: 3, buildMs: 1.5, materials: 2 })
});

/** Kit-wide limits from budgets.md section 3 (binding: high tier, shrine spot). */
export const KIT_LIMITS = Object.freeze({
  newMergedMaterials: 11,
  repeatBuildMs: 0.1,
  liveMeshes: Object.freeze({ hero: 2, mid: 0, far: 0 }),
  handover: Object.freeze({ heroBelow: 12, farFrom: 45 })
});

/**
 * Per-asset exceptions, keyed by inventory id, for assets that are honestly
 * bigger than a prop (a whole machiya, the pagoda). Each entry overrides the
 * fields it names and must cite why. Added by the owning lane in its PR.
 */
export const BUDGET_EXCEPTIONS = Object.freeze({
  // 11 m valley runs build 12,660 mid tris (contract sample 3.4 m); ruling R51
  'bamboo-fence': {
    mid: { triangles: 13000 },
    why: '11 m valley runs build 12,660 mid tris (contract sample 3.4 m); ruling R51; a1-village lightens the mid tier and removes this'
  },
  'tea-interior': { hero: { meshes: 34, materials: 12, buildMs: 9 }, mid: { triangles: 9500, meshes: 34, materials: 12, buildMs: 6 }, far: { triangles: 3000, meshes: 24, materials: 11, buildMs: 5 }, why: 'the whole room as one asset (every classic sub-part plus courtyard, andon and toro); far is not a real LOD, the room is only seen from inside' },
  // whole buildings (ruling R52); measured with kit_contract_test --family machiya
  'tea-house': {
    hero: { materials: 8, buildMs: 12 }, mid: { materials: 5 },
    why: 'a whole building: plaster x2, roof tile, shoji, namako skirt, kit bag, reused bamboo-fence (8 hero / 5 mid); classic is 5 box materials in ~40 meshes'
  },
  'residence': {
    hero: { materials: 8, buildMs: 12 }, mid: { materials: 5 },
    why: 'a whole building: plaster x2, roof tile, shoji, namako skirt, kit bag, reused bamboo-fence (8 hero / 5 mid); classic is 5 box materials'
  },
  // 'tea-house': { hero: { triangles: 40000, meshes: 40 }, why: 'a whole building with interior-facing walls' }
  // v-hidden: the two wholes are whole clearings (see docs/fable/handoff/v-hidden.md for measured numbers)
  'moon-pool': {
    hero: { meshes: 20, materials: 11 }, mid: { meshes: 18, materials: 10 }, far: { triangles: 1500, meshes: 12, materials: 9 },
    why: 'a whole pool: apron, water + caustic, moon, glints, 34 rim stones, seat, pads, lotus, motes and the lanterns-family toro, each its own material (all private ones are live light)'
  },
  'lantern-glade': {
    hero: { materials: 10 }, mid: { meshes: 10, materials: 10 }, far: { triangles: 1900, meshes: 10, materials: 10 },
    why: 'a whole clearing: floor, noded culms + blades, one lantern set (3 draws for 11 lanterns), seat, boulder, fireflies'
  },
  'glade-lanterns': { far: { materials: 3 }, why: 'frame, lit paper and halo are three materials even at far (the halo is the night read)' },
  // s2-clearing: the summit's two stairways are whole places (steps, rails, a torii or toro pairs); measured with
  // kit_contract_test --family clearing (hero/mid/far): entry 20/20/8 meshes, 7/7/6 materials, far 1,380 tris;
  // path 20/19/9 meshes, 5 mid / 5 far materials, far 1,540 tris. Classic entry is ~45 box meshes, path ~50.
  'summit-entry': {
    hero: { meshes: 22, materials: 8, buildMs: 10 }, mid: { meshes: 22, materials: 8, buildMs: 5 }, far: { triangles: 1700, meshes: 10, materials: 7, buildMs: 3 },
    why: 'a whole approach: warm treads, dark posts, rope, the shrine torii (lacquer, black, stone footing) and a toro pair (stone, dark, glow); modular 20/20/8 meshes, 1,380 far tris'
  },
  'summit-path': {
    hero: { meshes: 22, buildMs: 8 }, mid: { meshes: 22, materials: 6, buildMs: 4 }, far: { triangles: 1800, meshes: 10, materials: 6, buildMs: 3 },
    why: 'a whole stair: two stone batches, moss joints, posts, rope, footings and a toro pair; modular 20/19/9 meshes, 1,540 far tris'
  },
  // classic grove 82.3k hero tris; modular 89.9k/12.5k/4.7k; ruling R40, v-greenery handoff
  // v-ranges (see docs/fable/handoff/v-ranges.md): landscape rings are instanced by the hundred; classic counts are
  // mountains 57.8k, edge-forest 1.70M, edge-undergrowth 89.6k, foothill-forest 189k, distant-village 1.1k
  'mountains': { hero: { triangles: 70000, buildMs: 30 }, mid: { triangles: 44000, buildMs: 30 }, far: { triangles: 31000, buildMs: 30 }, why: 'one polar height-field ring to r = 600 m; classic 170x170 square 57,800 tris, modular 69,120 / 43,008 / 30,720 (hero/mid/far); build is the cold height-field bake' },
  'edge-forest': { hero: { triangles: 1720000, meshes: 17 }, mid: { triangles: 1720000, meshes: 17 }, far: { triangles: 950000, meshes: 17 }, why: '260 instanced trees; classic 1,696,240 tris, modular 1,713,400 hero/mid 1,705,080 / far 946,400' },
  'edge-undergrowth': { hero: { triangles: 90000, meshes: 4 }, mid: { triangles: 70000, meshes: 4 }, far: { triangles: 17000, meshes: 4 }, why: '160 instanced shrubs; classic 89,600 tris, modular 89,600 hero / mid lobes-2 / 16,000 far' },
  'foothill-forest': { hero: { triangles: 430000 }, mid: { triangles: 206000 }, far: { triangles: 168000 }, why: 'up to 3800 instanced cedars and crowns; classic 189,120 tris, modular 428,940 hero / 205,800 mid / 167,820 far' },
  'distant-village': { far: { triangles: 1700 }, why: '48 houses; classic 1,140 tris as boxes and pyramids, modular 1,620 far (gabled roofs, plinths)' },
  'mist-ring': { hero: { meshes: 14 }, mid: { meshes: 14 }, far: { meshes: 14 }, why: '14 sprites, each with its own material: Countryside.update() fades them one by one' },
  'dawn-mist': { hero: { meshes: 12 }, mid: { meshes: 12 }, far: { meshes: 12 }, why: '12 sprites with their own materials (per-time-of-day fade)' },
  'bamboo-groves': {
    hero: { triangles: 92000 }, mid: { triangles: 13000 }, far: { triangles: 5000 },
    why: 'a grove is 40-78 culms with 72 leaf cards each; classic is 82k (r=7); modular hero ~90k, mid/far far below classic'
  },
  // v-water: whole-system water assets whose mesh/material count is bound by gameplay (layout.bind / footprint lists), not by detail
  'paddies': {
    far: { meshes: 4, materials: 4 },
    why: 'four plot sheets bound one-to-one to paddyWaterMaterials (parts water_1..4, a material each); classic 4 meshes / 4 materials / 8 tris; modular 4 / 4 / 8 at every tier'
  },
  'water-ripples': {
    hero: { materials: 24 }, mid: { materials: 24 }, far: { materials: 24 },
    why: 'the 24-ring pool: Countryside.update() writes each ring\'s own material opacity (parts ring_1..24); classic 24 meshes / 24 materials, hidden until spawned; modular the same (0 visible meshes, 0 tris at build)'
  },
  // Countryside.updateRainRipples() sets opacity per ring, so each of the 28 rings owns a material (as classic does); the texture is shared
  'rain-ripples': {
    hero: { materials: 28 }, mid: { materials: 28 }, far: { materials: 28 },
    why: 'the game animates each ring through its own material (f2 handoff): 28 rings, 28 materials, as classic'
  },
  // s4-summit-life: the summit facade drives four bird records (mesh + two wings each) and pulses every beacon ray's own opacity
  'summit-birds': { mid: { meshes: 12 }, far: { meshes: 12 }, why: 'the facade pool is four birds (body + two hinged wings each = 12 live meshes); the summit builds near-band layouts only, so mid/far are not real LODs' },
  'shrine-rays': {
    hero: { meshes: 11, materials: 11 }, mid: { meshes: 11, materials: 11 }, far: { meshes: 11, materials: 11 },
    why: 'nine shafts, a bloom and a ground pool: the facade pulses each one through its own material.opacity (as classic), so 11 materials, each a single additive draw'
  },
});

/** The budget row for one asset and tier, with exceptions applied. */
export function budgetFor(id, tier) {
  const base = BUDGETS[tier] || BUDGETS.mid;
  const exception = BUDGET_EXCEPTIONS[id] && BUDGET_EXCEPTIONS[id][tier];
  return exception ? { ...base, ...exception } : { ...base };
}
