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
  mergedMaterialsBaseline: 11, // informational: merged materials after wave 2.1 + pagoda; the cap was replaced by ruling R52
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
  // Phase 5 r3b (roofcanal part b), R52. Hero tier = the classic piece's own MAT materials (ctx.MAT, so 0 new merged materials,
  // 0 added merged draws); mid and far are remapped to the standard caps. Measured on the real runs, rooftop_golden digests of the
  // largest piece of each type, classic vs `?swap=<id>:modular` (hero tier), uptime load 2.4-4.3, 2026-11-15:
  //   roof-canal-banks     classic 182 meshes / 4480 tris / 14 materials -> modular 14 meshes / 4480 tris / 14 materials
  //   roof-market-stalls   classic 234 meshes / 2808 tris / 12 materials -> modular 12 meshes / 2808 tris / 12 materials
  //   roof-canopy          classic 289 meshes / 3468 tris /  8 materials -> modular  7 meshes / 3468 tris /  8 materials
  //   roof-takasebune      classic  33 meshes / 4480 tris / 14 materials -> modular 15 meshes / 4480 tris / 14 materials (classic boatman kept, R75)
  //   roof-skylight-bridge classic  18 meshes /  392 tris /  8 materials -> modular  9 meshes /  392 tris /  7 materials (the lantern's paper caps use M.dark, not the lone paperCapMaterial)
  // Visible world meshes at the canal mouths 3-5 (s 280/300/352/499/520/672), classic -> all 8 part-b ids swapped, same frame:
  //   437->384, 508->441, 565->516, 597->568, 747->721, 762->753 (fewer draws everywhere; renderer calls are not comparable: the
  //   seeded Math.random draws shift with the build and move the atmosphere, +-25 calls between identical runs of different builds).
  'roof-canal-banks': { hero: { materials: 14 }, why: 'classic canalQuarter uses the same 14 MAT materials (wet stone, slab, stone, timber, timberMed, twine, agedWood, steel, bronze, dark, water, pine, foliage, clay); 182 -> 14 meshes; mid/far remap to 4/2' },
  'roof-market-stalls': { hero: { materials: 12 }, why: 'classic shopfronts uses the same 12 (plaster x2, timberMed, six goods colours, three noren); 234 -> 12 meshes; mid 4 / far 1 by remap' },
  'roof-canopy': { hero: { materials: 8 }, why: 'classic canopy uses the same 8 (glass, steel, six banner colours) on the 103 m run; 289 -> 7 meshes; mid 3 / far 2' },
  'roof-takasebune': { hero: { materials: 14 }, mid: { meshes: 9, materials: 8 }, why: 'classic boat uses the same 14 MAT materials incl. the classic boatman (R75) and wake; 33 -> 15 meshes; mid keeps the boatman (9 meshes, 8 materials); far remaps to 2' },
  'roof-skylight-bridge': { hero: { materials: 7 }, why: 'classic marketCrossing uses 8 (timberMed, timber, hemp, steel, three goods, lanternWhite, paperCapMaterial); modular 7; 18 -> 9 meshes; mid 4 / far 1 by remap' },
  // the contract samples the real 11 m run (G-V1 I1); ruling R51
  'bamboo-fence': {
    mid: { triangles: 13000 },
    why: 'the contract samples the real 11 m valley run: 22,638 / 12,660 / 568 tris (hero/mid/far); ruling R51. a1-village kept the mid triangles: on medium every near-band instance (the whole village) is built at mid and seen at cat height, so the mid fence keeps its knots and nodes. The buildMs part is gone: the bake writes merged arrays now, warm 0.9-1.0 / 0.4-0.5 ms (3 full contract runs, load 1.9-4.7, 2026-11-15)'
  },
  'tea-interior': { hero: { meshes: 34, materials: 12, buildMs: 9 }, mid: { triangles: 9500, meshes: 34, materials: 12, buildMs: 6 }, far: { triangles: 3000, meshes: 24, materials: 11, buildMs: 5 }, why: 'the whole room as one asset (every classic sub-part plus courtyard, andon and toro); far is not a real LOD, the room is only seen from inside' },
  // whole buildings (ruling R52); measured with kit_contract_test --family machiya
  'tea-house': {
    hero: { materials: 8 }, mid: { materials: 5 },   // buildMs 12 dropped (a1-village): warm hero 0.5-0.9 ms once the fence bake got faster
    why: 'a whole building: plaster x2, roof tile, shoji, namako skirt, kit bag, reused bamboo-fence (8 hero / 5 mid); classic is 5 box materials in ~40 meshes'
  },
  'residence': {
    hero: { materials: 8 }, mid: { materials: 5 },   // buildMs 12 dropped (a1-village): warm hero 0.5-0.9 ms once the fence bake got faster
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
  // lane v-ground (in-lane grant): the whole 260 m valley height field, one mesh
  'valley-ground': {
    hero: { triangles: 45000 }, mid: { triangles: 45000 }, far: { triangles: 5000, buildMs: 2 },
    why: 'the whole valley height field, not a prop: classic is 45,000 tris (150 x 150 plane, one mesh); modular keeps every classic vertex at hero/mid (45,000) and every third at far (5,000). Warm builds copy the cached heights and a 262k-texel field. Contract page warm builds, 2026-11-14: at 1-min load 1.5-1.6, hero 3.2-3.5 ms, mid 1.6-1.8 ms (inside the default 6 / 3 ms), far 1.4 / 1.7 / 1.6 ms; at load 2.7-3.0, far 1.5 / 1.5 / 1.6 ms. Far exceeds the default 1.5 ms below load 3, hence far 2 ms. Warm-build timing is re-measured on a quiet machine at gate G-V3 (ruling R54). First build in the game: 197 ms (?assets=modular, load 2.7) and 165 ms (swap of the four ground ids, load 2.6), paid once at load; it replaces the classic ground, road and shoulders (3 draws -> 1)'
  },
  // s3-vista: the summit vista is whole districts seen from 0.5-5 km. Classic (game quality): city 920 houses
  // (walls 12 + roof 8 + eave 12 tris) + 360 garden blobs = ~58k tris, pagoda 992, bay 5.4k + 7 boats (2 meshes each),
  // harbour 864 + islands 4 x 320, horizon 3 x 1,760. Modular numbers are in each `why` (kit_contract_test --family vista).
  'kyoto-city': {
    hero: { triangles: 58000 }, mid: { triangles: 18500 }, far: { triangles: 12000, materials: 4 },
    why: '920 instanced houses with eaves and 360 garden blobs (classic ~58k hero tris, modular 56,400); mid 700 houses (17,800), far 460 houses (11,480); far keeps walls, roofs, gardens and the lights as four materials'
  },
  'summit-pagoda': {
    far: { meshes: 4 },
    why: 'the pagoda family measured Yasaka tower (hero build 9 ms warm; far 4 meshes: tower, sorin, podium and the lanterns)'
  },
  'summit-bay': {
    mid: { meshes: 9 }, far: { triangles: 1400, meshes: 9, materials: 3 },
    why: 'water, glints and seven boats the summit sails by group (one mesh each; classic is 2 meshes a boat); classic water 5.4k tris, modular 5.8k / 3.1k / 1,276'
  },
  'horizon': {
    hero: { triangles: 7000 }, mid: { triangles: 3800 }, far: { triangles: 1800, materials: 3 },
    why: 'three range rings (one material each, the summit hazes them by layer), each only the arc the seat looks over; classic 3 x 1,760 = 5.3k tris, modular 6,600 / 3,504 / ~1.6k (hero/mid/far)'
  },
  // r4-festival (Roof Road mouths 6-7): whole festival pieces built in the Roof Road's own painterly set (ctx.MAT; R52). Each bucket
  // is a PART; the facade's mergeByMaterial folds every instance into one draw per material and 32 m cell. Measured on the Roof Road
  // page (build of the real level pieces, classic builder vs kit builder; tools: headless eval, 2026-11-15, uptime load 2.8-3.0).
  // Page draw calls (one render, shadows included), classic vs all 7 ids swapped: mouth 6 yama 789 / 787, yatai 783 / 781; mouth 7
  // hoko 617 / 610, gate 492 / 491; finale 454 / 448: modular is at or under classic everywhere.
  'roof-yatai': {
    hero: { meshes: 24, materials: 16 }, mid: { meshes: 22, materials: 14 },
    why: 'largest of 19 stalls incl. decorateStall dressing. Classic 62 meshes / 2,450 tris / 17 materials; modular hero 24 / 1,680 / 16, mid 21 (22 on the contract sample, a masks stall) / 1,222 / 14, far 2 / 278 / 2. Materials are the stall\'s own (awning cloth, timbers, noren, fare goods, lantern paper, sign, twine, enamel, glass): none new, 1 fewer than classic, so merged draws are not above classic'
  },
  'roof-hoko': {
    hero: { triangles: 41000, meshes: 90, materials: 30 }, mid: { triangles: 37500, meshes: 90, materials: 30 },
    why: 'the one great float, with the CLASSIC hayashi kept (ruling R75: 3 makeResident musicians, ~30k tris). Classic 204 meshes / 38,558 tris / 31 materials; modular hero 89 / 40,670 / 29, mid 86 / 37,158 / 29, far 2 / 908 / 2. Mid is under classic high (budget rule). Materials 2 fewer than classic, no new merged material; draws 617 -> 610 at the hoko, 454 -> 448 at the finale. The contract page has no resident materials, so it builds the float without the musicians'
  },
  'roof-temple-gate': { mid: { meshes: 10, materials: 5 }, why: 'one gate. Classic 21 meshes / 250 tris / 5 materials; modular hero 10 / 610 / 5, mid 10 / 514 / 5, far 2 / 250 / 2. Same five materials as classic: 0 added' },
  'roof-yama': {
    hero: { materials: 7 }, mid: { meshes: 11, materials: 7 },
    why: 'one kakiyama float. Classic 58 meshes / 488 tris / 7 materials; modular hero 11 / 1,504 / 7, mid 11 / 672 / 7, far 2 / 352 / 2. Same seven materials as classic (timber, timberMed, tapestry, bark, three leaves): 0 added'
  },
  // r4b-festival (Roof Road sky, fires, city, atmosphere). Measured on the Roof Road page, classic scene vs kit builders (uptime load 1.5-1.7,
  // 2026-11-15); classic counts are the Sky / RooftopAtmosphere / buildWorld scene objects.
  'roof-okuribi': {
    mid: { meshes: 10, materials: 5 }, far: { meshes: 10, materials: 5, buildMs: 3 },
    why: 'the five fires: each is one Points (own shader material, Sky.update drives its uKindle/uTime) plus one glow Sprite (own opacity). Classic 10 meshes / 10 materials / 0 tris; modular 10 / 10 / 0 at every tier (the contract counts 5 materials: Points only). Hero adds embers inside the same Points (no extra draw). Warm build 5.3 / 2.8 / 2.5 ms: the glyph canvas sampling (classic runs it too)'
  },
  'roof-atmosphere': {
    mid: { materials: 5 }, far: { meshes: 6, materials: 5 },
    why: 'petals, smoke, fireflies (own ShaderMaterials: the class drives their uniforms), the birds (one shared material) and the motes. Classic ambient part 12 meshes / 5 materials (13 / 6 with the landing-burst points, which stay classic); modular hero 12 / 5, mid 8 / 5, far 6 / 5'
  },
  'roof-distant-city': {
    hero: { buildMs: 8 },
    why: 'the city is one merged mesh on the pagoda family matte material: classic 7,956 instanced houses = 79,560 tris / 2 meshes / 2 materials (two draws); modular hero 10,276 tris / 1 / 1, mid 2,240, far 228 (one draw). Hero warm build 3.5-6.1 ms at load 1.5 (classic buildDistantCity, same page: 16 ms cold, 3.6-4.1 ms warm)'
  }
});

/** The budget row for one asset and tier, with exceptions applied. */
export function budgetFor(id, tier) {
  const base = BUDGETS[tier] || BUDGETS.mid;
  const exception = BUDGET_EXCEPTIONS[id] && BUDGET_EXCEPTIONS[id][tier];
  return exception ? { ...base, ...exception } : { ...base };
}
