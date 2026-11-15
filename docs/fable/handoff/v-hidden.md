# v-hidden handoff

Family `hidden` (`src/kit/hidden/`, 15 ids, lab `labs/moonpool`). `src/kit/index.js` was regenerated with `node tools/kit_index.mjs` (family `hidden` added; not hand-edited).

## 1. Budget exceptions (src/kit/budgets.js, Integrator)
The two wholes are whole clearings. Add to `BUDGET_EXCEPTIONS` (measured by the contract test; this branch does NOT commit the edit, the working tree that produced the PASS output carried it):
```js
  'moon-pool': {
    hero: { meshes: 20, materials: 11 }, mid: { meshes: 18, materials: 10 }, far: { triangles: 1500, meshes: 12, materials: 9 },
    why: 'a whole pool: apron, water + caustic, moon, glints, 34 rim stones, seat, pads, lotus, motes and the lanterns-family toro, each its own material (all private ones are live light)'
  },
  'lantern-glade': {
    hero: { materials: 10 }, mid: { meshes: 10, materials: 10 }, far: { triangles: 1900, meshes: 10, materials: 10 },
    why: 'a whole clearing: floor, noded culms + blades, one lantern set (3 draws for 11 lanterns), seat, boulder, fireflies'
  },
  'glade-lanterns': { far: { materials: 3 }, why: 'frame, lit paper and halo are three materials even at far (the halo is the night read)' },
```
Measured (real layouts): moon-pool 11.1k / 5.0k / 1.37k tris (hero/mid/far); lantern-glade 19.0k / 5.1k / 1.78k. Without the exception the contract test fails exactly the meshes/materials/far-triangle rows of those two ids and nothing else.

## 2. New merged materials (R26)
One: `leafMaterial` = `km.bamboo({ color: 0xffffff, vcol: true, side: DoubleSide, rough: 0.8 })` (pads, lotus, bamboo blades, lantern frames). Everything else reuses: culms use the fences' exact `km.bamboo` args (zero new), stones use the rocks family's `rockMaterials(km, moss)` (zero new at the default moss 0.4). Private (unmerged) materials: apron and floor (canvas map, transparent), water, caustic, moon sprite, glints, motes, fireflies, lit paper set and halo set.

## 3. Part names
- moon-pool: `apron_disc`, `water_surface`, `water_caustic`, `moon_sprite`, `moon_glints` (hero), `rim_stones`, `seat_slab`, `pads_leaf` (all nine pads, one mesh), `lotus_bloom` (all three), `motes_points`, and the lanterns-family toro parts under `toro_*` (`toro_lamp`, `toro_halo`, ...).
- lantern-glade: `floor_disc`, `bamboo_culms`, `bamboo_leaves`, `lanterns_frame`, `lanterns_paper`, `lanterns_halos`, `seat_slab`, `seat_boulder`, `flies_points`.
- children: pool-apron `disc`; pool-water `surface`, `caustic`; pool-moon `sprite`, `glints`; pool-rim `stones`; pool-seat `slab`; lily-pads `pad`; lotus `bloom`; pool-motes `points`; glade-floor `disc`; glade-bamboo `culms`, `leaves`; glade-lanterns `frame`, `paper`, `halos`; glade-seat `slab`, `boulder`; glade-fireflies `points`.
- No `layout.bind` exists for hidden places; nothing binds a part.

## 4. Behaviour the kit owns (classic handles stay null)
Water emissive, caustic opacity and drift, the moon sprite and its glints, the motes, the fireflies, every glade lantern's kindle and halo run in the kit's own `update(dt, t, env)` from `env.hour` (nightness and daylight are the Sky's sun path, `common.js` `sunUpAt`) and `env.wet` (rain halves the calm things, as classic weather rain/mist did; `env.mist` now exists (main.js assetEnv, runtime.js initial env), so rain and mist both halve them as classic did). The classic update() guards (`if (this.causticMat)`, `this.lanterns.length`, `poolMotePoints`) skip a kit part, as f3 intended. `this.stalkTops` is layout data and stays.

## 5. Footprint
No waiver. Every id's footprint is `layout.footprint` (colliders, exclusions, water rects, the two rest anchors are untouched: `--systems` modular still lists 135 colliders / 5 water rects / 4 exclusions / 5 anchors). The kit pool sits on the same registry order because the parent registers the whole footprint once.

## 6. Inventory rows (`labs/asset_inventory.json`, hot file)
Coverage targets for the seven gap ids (new lab specimens in `labs/moonpool/js/ground.js`):
```json
{"id":"pool-apron","coverage":[{"target":"moonpool/apron-moss","level":"direct"}]}
{"id":"pool-rim","coverage":[{"target":"moonpool/rim-chisel","level":"direct"}]}
{"id":"pool-seat","coverage":[{"target":"moonpool/seat-slab","level":"direct"}]}
{"id":"lantern-glade","coverage":[{"target":"moonpool/glade-whole","level":"direct"},{"target":"moonpool/game-lamp","level":"related"}]}
{"id":"glade-floor","coverage":[{"target":"moonpool/glade-litter","level":"direct"}]}
{"id":"glade-bamboo","coverage":[{"target":"moonpool/bamboo-nodes","level":"direct"},{"target":"greenery/game-grove","level":"related","note":"Vegetation.buildBambooGrove differs from the hidden-place bamboo."}]}
{"id":"glade-seat","coverage":[{"target":"moonpool/boulder-moss","level":"direct"}]}
```
(remove the old `"note"` on `glade-floor`). `moonpool/game-ground` is an `original` tile of the real apron, rim and seat, usable as the original side of the first three.
Catalog `production` adapter: `hidden` for all 15 ids (`src/kit/hidden/index.js` `assets`). Add to `labs/registry.js` nothing: the lab's slug is unchanged.

## 7. Helpers to move / reuse
Imported read-only: lanterns `buildStoneLantern`, `washiTexture`, `haloTexture`, `nightnessAt`, `kindle`; greenery `culmGeometry`, `bladeGeometry`; rocks `rockMaterials`, `fitRock`, `variantRock`, `placed`, `bake`, `DETAIL`. Local copies in `src/kit/hidden/common.js` (nothing requested to move): `sunUpAt`, `polarDisc`, `billboardSet` (N lantern halos in one draw, immune to the GPU point-size clamp), `glowPoints` (per-point intensity in vertex colour), `compose`.

## 8. Hot-file wiring
None needed. `hidden_places.js` already routes all 15 ids.

## Fix round 1 notes
- Lantern sway (3 cm bob) is dropped in the kit set; swap `glade-lanterns` as a whole with the glade (per-part children cost 3 draws each).
- `rimVariants` is a module cache of chiselled geometry (placed() clones), never freed.
