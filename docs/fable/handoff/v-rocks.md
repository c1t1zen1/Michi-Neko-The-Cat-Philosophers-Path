# v-rocks handoff
- Inventory: `path-boulders` and `key-rock` exist; add `"production": "rocks"` adapters if the catalog uses them. No new rows.
- Part names: `boulders_light`, `boulders_dark` (path-boulders); `rock`, `stone_a`, `stone_b` (key-rock).
- Footprint waivers: none. No helpers to move; stone.js (fitRock, variantRock, placed, bake, rockMaterials) is local to the family.
- Reuse by s2-clearing: import `assets` params (size, moss, weathering, facets) via the kit; no hot-file wiring needed.
- Integrator: regenerate src/kit/index.js with `node tools/kit_index.mjs`. tools/kit_test.mjs fixture test needs a fixture inventory that tolerates more than one real family.
