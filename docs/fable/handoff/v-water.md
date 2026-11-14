# Handoff: v-water (wave 2.3, family `water`, Lab 02)

Nothing in a hot file is required for the classic set or for the swap to work:
every asset routes through `Countryside.placeAsset` with the layouts f2 split
(`layoutRiverAndBridge`, `layoutPaddies`, `layoutRipplePool`), and every
footprint is the layout's own. `src/kit/index.js` was regenerated with
`node tools/kit_index.mjs` (21 families after the fix-round-1 merge). `src/kit/budgets.js` was edited
in-lane (granted): two BUDGET_EXCEPTIONS rows, below.

## 1. Inventory rows (`labs/asset_inventory.json`)

No new ids. Add these coverage entries (the existing ones stay):

```json
{ "id": "river",         "coverage+": [{ "target": "water/kyoto", "level": "direct", "note": "Promoted as the kit river (src/kit/water/river.js): the CPU water field + the kyoto shader, analytic sky instead of the planar mirror." }] }
{ "id": "bridge",        "coverage+": [{ "target": "water/b-sanjo", "level": "direct", "note": "Promoted as the kit bridge on the classic platforms (src/kit/water/bridge.js)." }] }
{ "id": "paddies",       "coverage+": [{ "target": "water/p-taue", "level": "direct" }, { "target": "water/p-summer", "level": "direct" }, { "target": "water/p-autumn", "level": "direct" }, { "target": "water/p-winter", "level": "direct" }] }
{ "id": "paddy-bunds",   "coverage": [{ "target": "water/p-aze", "level": "direct" }, { "target": "water/p-game", "level": "embedded" }] }
{ "id": "rice",          "coverage+": [{ "target": "water/p-taue", "level": "direct" }] }
```

`paddy-bunds` moves from *embedded* to *direct* through the new specimen
`water/p-aze` (Lab 02, `labs/water/js/bunds.js`, variant index 27, card
"Aze banks 畦"). Then regenerate: `node tools/labs_coverage.mjs --write`
(ASSET_COVERAGE.md) and `node tools/fable_swap_matrix.mjs --write`.

## 2. Catalog `production` adapter

| lane | id | kit export |
|------|----|------------|
| v-water | water (river, bridge, paddies, paddy-bunds, rice, water-ripples) | `src/kit/water/index.js` `assets` |

Append the row to `docs/fable/handoff/_production_adapters.md`.

## 3. Part names (public interface)

| Asset | Parts | Sockets / extras |
|---|---|---|
| `river` | `water` (bound: `riverMat` ← `water.material`) | `group.userData.riverField` (RiverField: `flowAt(x, z)`, `locate(x, z)`) |
| `bridge` | `deck`, `frame`, `koran_e`, `koran_w`, `giboshi`, `abutment_n`, `abutment_s` (a part with one mesh is that mesh; at `far` the timber/bronze parts are empty groups) | `post_e_1…7`, `post_w_1…7` (top of the walkable rail, y 1.66, over each of the seven posts at z = −4 + i·8/6; east = +x), `shoki` (south end of the east rail, its +z looking north along the rail); the pier posts (x ±1.2, under the deck edges) are published to the family's shared state (`sky.js` `registerObstacles`) for the river field |
| `paddies` | `water_1…water_4` (bound: `paddyWaterMaterials[k].material`) | — |
| `paddy-bunds` | `bed`, `ridges`, `weir` (the seki-ita board, or an empty marker) | — |
| `rice` | `stalks` (one InstancedMesh) | — |
| `water-ripples` | `ring_1…ring_24` (bound through the `ripples` list) | — |

## 4. Budget exceptions (in `src/kit/budgets.js`, granted in-lane)

| id | rows | why (measured) |
|---|---|---|
| `paddies` | far: meshes 4, materials 4 | the four plot sheets are bound one-to-one to `paddyWaterMaterials` (a material each). Classic 4 meshes / 4 materials / 8 tris; modular 4 / 4 / 8 at every tier |
| `water-ripples` | hero, mid, far: materials 24 | `Countryside.update()` writes each ring's own material opacity. Classic 24 meshes / 24 materials; modular the same (hidden until spawned: 0 visible meshes, 0 tris at build) |

The river did not need one: hero 1,920 / mid 480 / far 120 triangles, one mesh, one material.

## 5. Hot-file patches

None outstanding. Pre-review (Integrator ruling, R47 pattern) granted `src/main.js` in-lane and the
change is applied on this branch: `Game.assetEnv()` now carries the sun and the sky colours, read
through the Sky's public API (`sky.sunDir`, `sky.resolvePalette()`, the values Countryside.update()
gives the classic river) and copied into env-owned objects:

```js
env.sunDir   // THREE.Vector3, a copy of sky.sunDir
env.palette  // { sun, horizon, top, warm }: THREE.Color copies of resolvePalette()
```

The water reads only these (`src/kit/water/sky.js`); the lookup of the Sky dome's uniforms is gone,
and the hour-based palette is the fallback when env lacks them (contract test, labs). `contract.js`
`ENV_KEYS` (not this lane's file) could list `sunDir` and `palette`; kit code must treat both as
read-only. `labs/ASSET_COVERAGE.md` was regenerated for the shifted `src/main.js` line links.

## 6. Helpers that could move to shared kit code (optional)

- `src/kit/water/parts.js` `Parts`: a per-material accumulator for MAT-merged
  timber and stone (boxes, posts, beams between points, lathes, extruded
  sections, outward-oriented convex solids, world-metre UVs, no colour
  attribute). Useful to v-machiya / r2 (Sanjō bridge in the Roof Road). Not
  moved; import it from the family or ask for the move.
- `src/kit/water/bridge.js` exports `BRIDGE` (the gameplay dimensions) and
  `rampHeight(o)`; r2-roofs-streets may reuse `buildBridge` for the Roof Road's
  Sanjō bridge (its parts are in the bridge's local frame, deck at 1.08).

### Requests from review r1 (optional, for the Integrator)

- **One sun path.** `src/kit/water/sky.js` `sunDirAt()` / `palAt()` (the env
  fallback only) re-derive `Sky.updateDayNight()` / `getDayPhase()`, a third
  copy after `src/kit/materials.js` `nightnessAt()`. Suggest moving a shared
  `sunDirAt(hour, out)` into `materials.js` (next to `nightnessAt`, which can
  then use it) and importing it in the water family.
- **Rice plots in the layout.** The rice layout carries stalks, not plots;
  `paddies.js` `plotsFromStalks()` recovers the four plots by clustering stalks
  on a 1 m grid (±2 cells). The real layout's nearest plots are 3.2 m apart in
  stalks, so they stay separate (4 rects), but plots closer than ~2 m would
  merge. Optional patch to `countryside.js` `layoutPaddies()` (adds one field
  to the `rice` component layout; the kit uses `layout.plots` when present —
  not wired yet, so this needs a one-line follow-up in `buildRice` too):
  ```diff
  -    components.push(component('rice', { index: this.nextIndex('rice'), name: 'Rice Stalks', capacity: riceCount, stalks, footprint: footprint() }, 'meshRiceClassic'));
  +    components.push(component('rice', { index: this.nextIndex('rice'), name: 'Rice Stalks', capacity: riceCount, stalks, plots: plots.map((p) => p.slice()), footprint: footprint() }, 'meshRiceClassic'));
  ```
  (Run the footprint golden after it; the golden may digest layout fields.)

## 7. Notes for other lanes

- **r6-game-wiring (Seven Posts):** caps go on the `post_e_*` / `post_w_*`
  sockets (rail top, y 1.66), the Shōki on `shoki`. On the kit bridge the
  seven posts are real kōran posts under the top rail; the rails end at
  z ±4.2 and the four corner posts (oyabashira, bronze giboshi, merged
  statics) stand outboard of the rail band (centre |x| 1.66, z ±4.2), so the
  rail walk, its ends and the ramps are clear (fix round 1 probe). The east railing platform is
  unchanged (x = −1 + 1.24 ± 0.21, top 1.66).
- **v-ground:** the river's depth model is the classic carve
  (`riverBedDepth()`: 0.85 m mid-stream, out to 3.8 m; `src/kit/water/field.js`
  `BED_DEEP`, `BED_OUT`, `BED_IN`). If the ground lane changes the carve, keep
  these in step.
- **v-weather:** `rain-ripples` stays yours (not swapped here) and owns the
  visible rain-ring events. Decision (review r1, no doubling): the kit river
  and paddies add only a fine, faint rain *pocking* from `env.wet` (small,
  short-lived normal dimples, no bright crest), not a second ring system. If
  you want the water to bend under your rain rings too, register them on the
  family's shared state (`waterShared(km).registerRings(meshes)`). River petals
  can ride the same current:
  `scene.getObjectByName('River').userData.riverField.flowAt(x, z)`.
- **v-critters:** koi ripples still go through `Countryside.spawnRipple()`; the
  kit ripple pool registers its rings with the family (`sky.js` `registerRings`)
  and the kit river and paddies bend their surface under every visible ring.
  The bending needs BOTH `river` (or `paddies`) and `water-ripples` modular;
  on the classic ripple set the rings draw as before and the water does not
  bend (the classic pool's meshes are not looked up by name). Note it in the
  swap matrix as a coupled pair.
- **Draw calls:** the kit adds no merged material. Static meshes use MAT
  (`timberEngawa`, `timberDark`, `timberMedium`, `stoneDark`,
  `spiritualBellBronze`, `paddyMud`) and `KIT_SHARED.matte` (aze banks); the
  classic `MAT.ridge` bake disappears when `paddy-bunds` is modular. The water
  surfaces stay separate draws one-for-one with the classic (river 1, paddy
  sheets 4, rice 1, ripple rings only while visible).
