# Handoff: r2-roofs-streets

## 1. Integrator actions (hot files)
- Run `node tools/kit_index.mjs` (the PR does not commit `src/kit/index.js`; `kit_check` needs it in sync).
- Inventory: set `production` adapter for ids roof-crates, roof-barrels, roof-komodaru, roof-lantern-post, roof-yuka,
  roof-utility-poles, roof-trellises to family `roofstreets` (no row JSON changes needed beyond the lifecycle you use).
- Family filter (r1 minor 4): `?assets=modular` still loads every family; a Roof Road family filter is a runtime patch.

## 2. Important finding: vertex colours are dropped on the Roof Road
`rooftops/js/pieces/common.js` `mergeByMaterial` keeps position/normal/uv only. Any kit material with
`vertexColors: true` (`km.bag`, `KIT_SHARED.crate`/`bamboo`) renders BLACK on the Roof Road. This family therefore
uses plain materials, resolved from `ctx.MAT` (the page's `M`) with kit fallbacks. Optional patch for later lanes
(r1 file, Integrator): in `mergeByMaterial`, when the source geometries carry a `color` attribute keep it
(`mergeGeometries` over geometries that all have `color`, add the attribute with `1,1,1` for those without).

## 3. Part names / footprint
Parts: `crate_wood|timber`, `barrel_wood`, `cask_straw|timber`, `post_timber|steel|red` (floating waiver, bracketed to a wall
at y 1.4, as classic), `deck_*`/`plank_*`, `pole_*`, `trellis_*`. Footprint: none (as classic). Socket `light` on the lantern post.
Waiver: trellis bounds differ from classic (no hanging foliage past the lattice); the lattice top stays at `piece.y`.

## 4. Gameplay check
Platform tops, widths, positions unchanged (golden: levels/lights identical with swaps). `?auto=1&swap=...` result: see status.
Deferred ids: status file.

## 5. Tool note
`rooftop_golden --query "swap=<real ids>"` reports "routing failed: every other piece identical" because its routing
self-test also runs with the page query; expected when real ids are swapped (only the swapped types differ).
