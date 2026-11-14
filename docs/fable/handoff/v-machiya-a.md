# v-machiya-a handoff

## Integrator
- `node tools/kit_index.mjs` (already regenerated and committed: 6 families).
- Components only. The buildings (part b) must NOT build these ids themselves: `tea-house`, `residence`, `secret-house`, `street-house` list them in `layout.components` (f2).

## Inventory (`labs/asset_inventory.json`)
Add `"production": "machiya"` adapters to: kawara-roof, koushi, upper-windows, noren, timber-frame, namako, engawa, tea-bench, secret-door, lock-plate.
Coverage rows to upgrade from `embedded` to `direct` (the lab now has focused baselines):
```json
{ "id": "namako",      "coverage": [{ "target": "machiya/namako-original", "level": "direct" }] }
{ "id": "tea-bench",   "coverage": [{ "target": "machiya/bench-original",  "level": "direct" }] }
{ "id": "secret-door", "coverage": [{ "target": "machiya/door-original",   "level": "direct" }] }
{ "id": "lock-plate",  "coverage": [{ "target": "machiya/lock-original",   "level": "direct" }] }
```
(Selectors are `<family>-original` from `baseline('<family>', ...)` in labs/machiya/js/variants.js.) Then `node tools/labs_coverage.mjs --write`.
Lab specimens added (no registry change): families namako, bench, door, lock; slugs `namako-original`, `namako-pillows`, `bench-original`, `bench-felt`, `door-original`, `door-shoji`, `lock-original`, `lock-bevel`. Lines of variants.js above row 76 were kept in place so the coverage report's line links stay valid.

## Part names
kawara-roof: tiles, ridge, trim (far: tiles, trim). koushi / upper-windows: lattice. noren: cloth (live at hero), trim. timber-frame: frame. namako: wall, trim. engawa: deck, base. tea-bench: bench. secret-door: panel, frame. lock-plate: plate, keyhole.
Gameplay binds (`layout.bind`): secret-door `.` -> secretDoorMesh, lock-plate `.` -> lockPlate (groups). No other binds.

## Footprint waivers
None. Footprints are the layouts' (empty for every component).

## Helpers
`tint`, `worldUV` (box-projected metre UVs for the game's textured MAT), `uvBox` live in src/kit/machiya/common.js. Candidates for src/kit/craft.js: `worldUV`/`uvBox` (any family that reuses game textured materials needs them).

## Notes for part b and the Roof Road
- Params are general: kawara-roof reads layout w, d, ridgeH, overhang (any size); params sori, ribs, onigawara, weather. koushi: slat, cutback, finish. noren: panels, crest, layout w/h/mat key.
- Roof tier cost: hero ~8.0k tris per roof, mid ~4.4k. Street houses are the many-instance case; if medium frame time matters, set `ribs` false at mid (about 600 tris) in roof.js.
- Hero noren is one live draw each (cloth). Budget `liveMeshes.hero = 2` is a whole-spot cap; a street with more than two hero houses exceeds it. Tell me if the Integrator prefers hero noren static (one-line change: drop `inst.live`/`inst.update`).
- namako `wall` uses MAT.namako, whose texture is one tile per metre; the kit sets box-projected metre UVs.
- No new merged materials; no BUDGET_EXCEPTIONS needed (largest: roof hero 7,960 of 25,000).

## Fix round 1 notes
- Noren is static: shared sway material, uniform driven by each instance's update(); nothing is live. Remove the earlier "hero noren is one live draw" note.
- Roof Road callers (and any layout without x/z) must pass `layout.band` ('near' | 'rim' | 'far'); otherwise the tier resolves to near (hero).
- Noren hemp is now a flat colour (no weave texture). Sway is not damped by reduce-motion (not in the kit env).
