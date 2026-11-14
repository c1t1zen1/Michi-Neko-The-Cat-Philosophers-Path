# v-shrine handoff
- Inventory: all seven ids exist. Update the `offering-box` coverage row (labs/asset_inventory.json) from embedded to direct, and mind that tools/labs_coverage.mjs --write must be rerun afterwards:
  `{ "target": "shrine/saisen-bako", "level": "direct" }`  (new specimen appended to SPECIMENS in labs/shrine/js/recipes.js; no registry change needed).
- Production adapters (catalog): add the row `| v-shrine | torii, shrine-hall, shimenawa, shrine-bell, offering-box, mist-altar, offering-bells | src/kit/shrine/index.js assets |` to _production_adapters.md.
- Part names: torii `frame`, `kasagi`, `footing`; shrine-hall `dan_low`, `dan_up`, `hall`, `shoji`, `trim`, `crest`; shimenawa `rope`, `shide`; shrine-bell `body`, `cord`; offering-box `box`; mist-altar `plinth`, `bell`, `flame`, `ring` (far: no ring); offering-bells `bell`. Binds the game reads: mist-altar `.` -> mistAltar and plinth/bell/flame `.material` -> `_altarFadeMats`; offering-bells `.` collectible userData. All present.
- Footprint waivers: none (golden: colliders, platforms, anchors, exclusions, rng JSON-equal).
- Helpers: none to move into src/kit/craft.js or materials.js. Local: `src/kit/shrine/util.js`. The altar imports `haloTexture` from `src/kit/lanterns/light.js` (read-only reuse); the pending move of that helper into materials.js should keep a re-export or update this import.
- s2-clearing torii reuse: `torii` params `span`, `height` (kasagi top), `post_r`, `taper`, `lean`, `ext`, `sori`, `finish` (lacquer|stone), `paint`, `pegs` (set false: the three climbing pegs are only for the valley gate); `solveGate(params)` is exported from src/kit/shrine/gate.js.
- Integrator: regenerate src/kit/index.js with `node tools/kit_index.mjs` (done in this PR; shrine added).
- New merged materials: 1 (black lacquer in torii).
