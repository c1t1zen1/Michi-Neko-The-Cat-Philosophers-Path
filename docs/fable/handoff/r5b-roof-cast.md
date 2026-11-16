# Handoff: r5b-roof-cast

## 1. Ids (family roofcast, src/kit/roofcast/cast.js)
`roof-boatman` (parts `figure`, `pole`) and `roof-hayashi` (parts `musician_0..2`). `src/kit/index.js` is unchanged (roofcast already registered by r5); run `node tools/kit_index.mjs` as always. Production adapter row: add both ids to the r5 row in `_production_adapters.md` (`src/kit/roofcast/index.js` `assets`, which spreads `castAssets` from `cast.js`).

## 2. build.js: castPass (rooftops/js/build.js, r1's file; committed here, review it)
Neither figure is placed on its own: each rides on the host record. After each `boat` / `float` piece, `castPass(pc, layout, assets, dynamic)` runs `assets.build('roof-boatman'|'roof-hayashi', layout, () => null)`. Not swapped: it returns null and nothing changes (classic EQUAL proved). Swapped: the boat's `boatman` group loses its children except the pole pivot and gets `parts.figure`; the pole pivot gets `parts.pole`; the float's `musicians[i]` are replaced in place by `musician_i` (same seat, `userData.phase/baseY`). It works on a classic hull and a kit hull alike (the kit hull exposes the same record), and on classic or kit hoko. world.update is untouched; its boatman/pole/musician animation runs on the same record slots, so the golden's `boatmotion` rows are identical.
No other hot-file change. `tools/labs_coverage.mjs --write` was run (build.js anchors moved).

## 3. Budgets (src/kit/budgets.js)
`roof-hayashi` exception row with measured numbers: classic 44 meshes / 31,378 tris / 16 materials; modular hero 33 / 34,082 / 7. Boatman is inside every cap (classic 5 meshes / 236 tris / 5 materials; modular 2 meshes). Residents gained `seated` support in resident.js and a lazy sphere cache (R67: no THREE work at module load).
