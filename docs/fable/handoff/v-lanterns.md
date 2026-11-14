# v-lanterns handoff

Family `src/kit/lanterns/` (index.js, build.js, stone.js, light.js). Ids: toro, chochin, street-lamps, andon, courtyard-toro, pool-toro.

## Inventory / catalog
- `labs/asset_inventory.json` rows already exist for all six ids; set `production` to the kit adapter `lanterns/<id>` for each (modular variant) and mark `courtyard-toro` / `pool-toro` lab specimens `lanterns / courtyard-toro` and `lanterns / pool-toro` (added in L4, `labs/lanterns/js/recipes.js`).
- `src/kit/index.js` is generated: run `node tools/kit_index.mjs` at merge (committed here for the family).

## Part names
- stone lanterns hero/mid: `kiso, sao, chudai, hibukuro, kasa, hoju, lamp, halo`. far: `kiso` (all stone merged), `lamp`, `halo`.
- chochin hero/mid: `cord, cap, foot, paper, band, tassel`. far: `cap` (timber + tassel), `paper`.
- andon: `frame, paper`.
- `toro` always has `halo` (the game binds `halo.material` into `lanternHalos`; the kit does not write its opacity). `street-lamps` far has no halo. `courtyard-toro` has none.

## Footprint
No waivers. toro keeps the 1.31 m height and 0.38 m kasa the cap platform assumes; modular footprint golden shows the same colliders, platforms, exclusions and anchors counts as classic (object-level diffs only).

## Hot-file asks
- Nothing to patch in countryside.js / interior.js / hidden_places.js. Note: `hidden_places.js` update() writes `poolToroMat` / `poolToroHaloMat` only when classic built them; the kit pool toro animates itself from `update(dt, t, env)` (env.hour).
- `tools/kit_test.mjs` test "kit_check passes on a clean fixture family" copies the real src/kit, so it fails once any real family (with ids missing from its fixture inventory) is in the tree. Not a lane file; the Integrator should make the fixture ignore real families.
- Materials: one new merged material (`kitMaterials.stone()`); everything else is `ctx.MAT` (`stoneDark`, `timberDark`, `vermilion`, `lanternGlow`, `lanternPaper`). Private lit-washi materials are per lantern and live (hero/mid), shared owner glow on far.
- Helpers to consider moving to `src/kit/materials.js`: `litWashi`, `washiTexture`, `haloTexture`, `nightnessAt` (all in `lanterns/light.js`).
