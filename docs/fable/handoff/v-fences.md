# Handoff: v-fences (family `fences`)

## Generated / hot files
- `src/kit/index.js`: regenerated locally with `node tools/kit_index.mjs` (1 family: fences). The Integrator regenerates at merge.
- `labs/ASSET_COVERAGE.md`: regenerated with `node tools/labs_coverage.mjs --write` (line anchors moved because `labs/fences/js/recipes.js` gained a specimen). Regenerate again at merge.

## Inventory (`labs/asset_inventory.json`) rows to update
`corral-sign` now has its own lab specimen. Replace its `coverage` with:
```json
"coverage": [{ "target": "fences/corral-sign", "level": "direct" }]
```
(`bamboo-fence` and `corral` coverage unchanged.) Then run `node tools/labs_coverage.mjs --write`.

## Catalog `production` adapter ids
`bamboo-fence`, `corral`, `corral-sign` (kit ids equal inventory ids). Lab specimen ids: `fences/game-fence`, `fences/corral`, `fences/corral-sign`.

## Parts (public interface)
| Asset | Parts |
|---|---|
| `bamboo-fence` | `culms` (InstancedMesh: 2 rails + n+1 verticals, end verticals are posts), `knots` (InstancedMesh of cord lashings; hero and mid, param `lashing`). `.` is bound to `bambooFences` through the layout footprint (unchanged) |
| `corral` | `corner_posts` (InstancedMesh x4), `lashings` (hero and mid) |
| `corral-sign` | `post`, `board`, `face`, `cap` (hero, mid), `lashing` (hero) |

## Footprint
No waivers. Every instance's footprint is `layout.footprint` (runtime default, R12): colliders, platform, `bambooFences` list entry, the corral exclusion, and Larry's patrol bounds (in the `larry` component layout) are untouched. Footprint golden: classic EQUAL; modular swap of all three ids: only `objects`/`aggregates`/`baked`/`counts` sections differ (mesh composition), no colliders/platforms/exclusions/anchors/waterRects changes.

## Materials
Reuses `kitMaterials.bamboo` (vertex-coloured, finish tints fresh/straw/weathered; only the chosen finish is created), `plain` (cord), `wood` (sign), `paper` (sign face, lit, with the shared canvas texture). Default build creates 4 kit materials (bamboo straw, plain cord, wood x2 for the sign boards; paper counts as the 5th): `kit:` family total within R26? Bamboo finish + cord + 2 woods + paper; the three finishes are alternatives, not simultaneous. If the Integrator counts strictly against R26 "one new merged material", these are all existing `KitMaterials` factories and other lanes (garden, greenery) will memoise the same entries only when args match.

## Helpers to move into shared kit code
- `src/kit/fences/culm.js` `culmGeometry(THREE, tier)` (per-tier unit culm with swollen nodes, cached) and `knotGeometry`: reusable by bamboo grove, garden and tea-garden lanes (promote to `src/kit/craft.js` if wanted).

## Tool problem found (not edited, not my file)
`tools/kit_test.mjs` test "kit_check passes on a clean fixture family" copies the REAL `src/kit` into its fixture, so every lane that adds a family folder makes it fail ("defineAsset id ... is not in labs/asset_inventory.json"). Fix: copy only the core files (filter out family folders) in `fixtureRoot()`. `node tools/verify.mjs` reports `kit_test: 35/36` on this branch for that reason only (70 passed otherwise).

## Wiring in hot files
None needed. The three ids route through existing `placeAsset(...)` calls in countryside.js.

## Notes for the next owner
- The classic `corral` parent has no body, so the kit `corral` adds four heavy corner posts over the fence ends; it deliberately does not build the fences, sign, Jade Paw or Larry (components).
- `bamboo-fence` has no collider-affecting params: verticals, tilts, spacing, length and height come from the layout (so colliders match). Params only change look: `finish`, `thickness`, `lean`, `lashing`.
