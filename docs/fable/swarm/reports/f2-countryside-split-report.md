# Report: f2-countryside-split

- Worker: Claude Opus 5.5 · branch `fable/f2-countryside-split` · worktree `/Users/c1t1zen/Documents/GitHub/michi-wt/f2-countryside-split`
- Base 5dc924a; `fable/integration` merged forward at 4bac869 (f1-runtime) and 619aab7 (Phase 0). Merged, not rebased: the brief forbids force-pushes and the branch was already pushed.
- Status: DONE. Status file `docs/fable/status/f2-countryside-split.md` (F2.1 map, checks); handoff `docs/fable/handoff/f2-countryside-split.md`.

## What was built

`src/countryside.js` (the only game file touched):

- **Routing.** Every builder is `buildX(args) { const layout = this.layoutX(args); return this.placeAsset(id, layout, () => this.meshXClassic(layout)); }`
  (per-instance loops for yarn, offering bells and street lamps). 43 of the 47 `build*/create*` methods are split
  and routed; the 4 left are helpers with no mesh of their own and no draws (`createRiverUniforms`,
  `createPaddyWaterMaterial`, `createRiverWaterMaterial`, `createCurvedSlope`). None had to be routed whole.
  Every `this.random()` draw sits in a layout step in its original order (82 call sites before and after); the
  three `Math.random()` uses (egg tilt, bell yaw, dawn mist) moved into layouts too, in order; `buildCanopy(this.rng)`
  runs in the edge-forest layout. `meshXClassic` methods draw nothing.
- **F2.4 components.** Nested builders and the sub-objects later lanes depend on are components: the parent's
  layout computes their layouts at the original call point; the classic mesh step places them at the same point
  with `placeComponent()`, and a kit parent gets them placed into its group after its own footprint. 68 inventory
  ids are routed (every countryside id in the inventory); the full map is in the status file.
- **R12/R18 footprints.** Every layout carries `footprint = { colliders, platforms, exclusions, waterRects, anchors, lists }`
  in the classic formats, computed in the layout step. Mesh-derived colliders (boulders, key rock, lamp posts,
  shrine hall, secret-house walls, the table and door unions, fence runs, crate platforms) use `frameOf()` +
  `shapeBox()` — Object3D's compose/multiply and each geometry's own bounding box — and are **bit-exact** with the
  classic `setFromObject` boxes (479/479). `addBuildingWallColliders` now shares its arithmetic with the layouts
  (`buildingWallBoxes`, identical math).
- **placeAsset modular path.** Places the group from the layout transform; parent via a non-enumerable
  `layout.parent`; registers the footprint through `this.colliders.push`, `addPlatform`, `addOrientedPlatform`,
  `addSlopedRoofPlatforms` (golden hooks untouched), exclusions, water rects, anchors, lists; binds
  `layout.bind` handles; `{ $part }` placeholders resolve parts / sockets / the group. `addComponentCollider`
  keeps the secret house's table and door colliders classic when a kit mesh sits in their subtree.
- **Runtime.** Imports `CLASSIC_ASSETS, isAssetInstance, scopeAssets` from `./kit/runtime.js?v=20261107a` (local
  stand-ins first, swapped once f1-runtime merged); constructor line `this.assets = scopeAssets(options.assets, { MAT, textures: TEX })`.
- **F2.5.** `_mergeStatics()` unchanged for classic; kit instances (`this.assetInstances`) merge except `instance.live`.

New test page `tools/place_asset_test.html` + `.js` (fake instances only, no kit asset registered).
`labs/ASSET_COVERAGE.md` regenerated (line links). No inventory anchor changed.

## Checks (commands and real output)

Per builder commit (`_scratch/f2-countryside-split/check.sh`): check_syntax, footprint golden, labs_coverage
`--write` + check + test, `git diff --check`, placeAsset test — all green at every commit except the noted interim
(below). Final runs at the head of the branch:

```
node tools/footprint_golden.mjs
  footprint golden: EQUAL
  counts   312 objects · 185 aggregates (1840 members) · 62 baked · 518 colliders · 65 platforms · 5 water rects · 4 exclusions · 25 anchors
  rng      valley 49233 draws (probe ok) · hidden 7810 · Math.random 92 · volatile 13 leaves, 15 members
  note     builder attribution differs in N entries; not part of the verdict (--write refreshes it)
node tools/footprint_golden.mjs --query "?assets=modular"      → footprint golden: EQUAL
tools/place_asset_test.html?per=1                              → placeAsset test: PASS
  A  162 placements of 67 ids; 0 footprint problems; colliders 479/479 bit-exact
  B  all ids fake: 162 kit instances; registrations equal the classic valley
  B  one id at a time: 67/67 equal
node tools/check_syntax.mjs                                    → All 44 modules OK
node tools/verify.mjs                                          → All checks passed (kit checks 27, kit_test 36/36)
node tools/labs_check.mjs                                      → All labs checks OK
node tools/labs_coverage.mjs                                   → OK 37 source modules, 112 construction methods, 190 inventory rows, 120 evidence targets
node --test tools/labs_coverage_test.mjs                       → pass 11, fail 0
git diff --check origin/fable/integration...HEAD               → clean
node tools/rooftop_test.mjs                                    → 38 passed, 0 failed
node tools/summit_test.mjs                                     → 70 passed, 0 failed
tools/labs_geometry_test.html                                  → 32/32
```

Review sheets (`node tools/capture_baseline.mjs --previews none --no-repeat --compare …/_baseline --only town,hidden,tree,grass`,
maxΔ / meanΔ / px>8 against the Phase 0 masters):
- hidden 3/3 and tree 14/14: **0 / 0 / 0** (byte-identical).
- town 9 sheets: street 11/0/1, street-golden 19/0/1, street-night 1/0/0, landmarks 71/0.0008/18, landmarks-golden
  82/0.0007/17, landmarks-night 32/0.0002/6, props 35/0.0001/5, props-golden 37/0.0001/5, props-night 1/0/0.
  Page floor 74 / 0.0008 / 17: two values are just above it (landmarks-golden maxΔ 82, landmarks px>8 18). A second
  fresh capture differs from my first by the same amount (landmarks-golden 81/0.0005/11, landmarks 43/0.0004/10)
  and from the masters by 82/0.0008/16 and 73/0.0007/20, i.e. this is the town page's isolated-pixel render noise,
  not a change; the golden (every named object's transform, geometry stats and material, every aggregate and baked
  mesh) is equal.
- grass: sheet-a 189/0.1216/2169, sheet-b 215/0.0808/1803 vs floor 207/0.1496/2662 (non-repeatable page; Phase 0
  says rely on the golden).

F2.6 full boot (Metal): `/__boot.html` → plays (colliders 645, platforms 65, lanterns 10, collectibles 17, set classic);
`/index.html?assets=modular` → plays, `assets.summary().problems` empty. Console in both: only the known optional
`cad-overrides.json` 404 (as in Phase 0 `checks-browser.md`).

Catalog: all 59 countryside inventory ids built through `loadCatalogAsset(id, { variant: 'original' })` on 5dc924a and
on this branch: identical mesh counts and world bounds except `nest-eggs` and `offering-bells`, whose shapes follow
unseeded `Math.random` (they vary run to run on the base as well). `buildWalkwaySlabs` (not in the valley) was compared
old vs new with a seeded kit: 165 slabs, identical.

## Files changed
`src/countryside.js`, `tools/place_asset_test.html`, `tools/place_asset_test.js`, `labs/ASSET_COVERAGE.md` (generated),
`docs/fable/status/f2-countryside-split.md`, `docs/fable/handoff/f2-countryside-split.md`.

## Assets promoted / deferred, waivers
None promoted (Phase 1). No waivers.

## Self-review against the lane card
- F2.1 map in the status file (47 builders → 68 ids). ✔
- F2.2 split by moving code: meshes, comments and registration code are the originals; the rewrites are the
  draw hoists (values now come from the layout), nested placement through `placeComponent`, and names from layout
  counters (toro, village houses, fences — same names, golden-verified). ✔
- F2.3 golden EQUAL at every builder commit. ✔ (Two commits pair builders: village house + street; mist ring + dawn mist.)
- F2.4 ✔ · F2.5 ✔ · F2.6 ✔.
- Interim: the commits for koushi, engawa, kawara roof, chochin, crates and nest were made while placeAsset test part B
  showed one known difference (the classic secret door collider took a fake koushi's bounds); the golden was EQUAL
  throughout. Resolved by the `buildSecretMachiya` commit, and a second case (a kit koushi alone) found by `?per=1`
  fixed in `9c6bb56`.

## Open concerns
- The golden's advisory `builders` section now differs from the stored golden (nested builders are "gone" from
  `calls`); the verdict is EQUAL. Refreshing it needs `--write` (Integrator's call).
- `edge-forest` layouts hold the canopy geometry (non-enumerable) because `buildCanopy` draws the valley stream; a kit
  forest that ignores it leaves four small geometries undisposed.
- Material handles used by `update()` (`_altarFadeMats`, `chimeClapperMat`, `bushMat`, haze, windows, paddy water)
  bind to `<part>.material`; a kit asset must name those parts (handoff table).

## Commits
- 8f4a591 f2-countryside-split: claim lane (status file)
- 1d9b6b5 f2: placeAsset routing infrastructure, footprint helpers, F2.5 live protection, placeAsset test page
- 97c26bd f2: buildSecretKey -> layoutSecretKey + meshSecretKeyClassic ('key')
- 9cf1a40 f2: buildWindChime -> layoutWindChime + meshWindChimeClassic ('wind-chime')
- c02a4a5 f2: buildMistAltar -> layoutMistAltar + meshMistAltarClassic ('mist-altar')
- 66de57e f2: buildToroLantern -> layoutToroLantern + meshToroLanternClassic ('toro')
- f757bf6 f2: buildTorii -> layoutTorii + meshToriiClassic ('torii')
- 57b945e f2: buildLanterns -> layoutLanterns + meshStreetLampClassic ('street-lamps', one placement per lamp)
- 7e8cf8a f2: buildYarn -> layoutYarn + meshYarnBallClassic ('yarn', one placement per ball)
- 9cfa443 f2: buildOfferingBells -> layoutOfferingBells + meshOfferingBellClassic ('offering-bells', one placement per bell)
- 18d59b8 f2: buildKeyHidingRock -> layoutKeyHidingRock + meshKeyHidingRockClassic ('key-rock')
- f8b7348 f2: buildDistantPagoda -> layoutDistantPagoda + meshDistantPagodaClassic ('distant-pagoda')
- dbbcdb8 f2: createKoushi -> layoutKoushi + meshKoushiClassic ('koushi')
- 576d335 f2: createEngawa -> layoutEngawa + meshEngawaClassic ('engawa')
- 53ff013 f2: createKawaraRoof -> layoutKawaraRoof + meshKawaraRoofClassic ('kawara-roof')
- a5e04b3 f2: createChochinLantern -> layoutChochinLantern + meshChochinLanternClassic ('chochin')
- 3dc9e99 f2: createClimbCrates -> layoutClimbCrates + meshClimbCratesClassic ('crates'; 'sake-barrel' component)
- a4892c2 f2: buildBirdNest -> layoutBirdNest + meshBirdNestClassic ('nest'; 'nest-eggs', 'guardian-feather' components)
- fac915a f2: use src/kit/runtime.js (CLASSIC_ASSETS, isAssetInstance, scopeAssets) instead of the local stand-ins
- 5531db3 f2: buildSecretMachiya -> layoutSecretMachiya + meshSecretMachiyaClassic ('secret-house'; components secret-tatami, secret-table > secret-fish, secret-bed, secret-andon, secret-door > koushi + lock-plate, kawara-roof, chochin x2, noren)
- d508a5e f2: buildShishiOdoshi -> layoutShishiOdoshi + meshShishiOdoshiClassic ('shishi')
- 86e1298 f2: buildMachiyaTeaHouse -> layoutMachiyaTeaHouse + meshMachiyaTeaHouseClassic ('tea-house'; components timber-frame, koushi x2, noren, tea-bench, upper-windows, kawara-roof, chochin x2, nest, crates)
- 06abc1b f2: buildMachiyaResidence -> layoutMachiyaResidence + meshMachiyaResidenceClassic ('residence'; components timber-frame, koushi x2, engawa, upper-windows, kawara-roof, chochin, shishi, crates)
- adf979d f2: buildVillageHouse + buildVillageStreet -> layout/mesh ('street-house' with namako, koushi, noren, kawara-roof, chochin components; 'village-street' container)
- f4e4da3 f2: buildShrine -> layoutShrine + meshShrineClassic ('shrine-hall'; components kawara-roof, shimenawa, shrine-bell, offering-box)
- ba2d958 f2: buildBambooFence -> layoutBambooFence + meshBambooFenceClassic ('bamboo-fence')
- 77e9971 f2: buildBambooCorral -> layoutBambooCorral + meshBambooCorralClassic ('corral'; components bamboo-fence x4, corral-sign, jade-paw, larry)
- 817240a f2: buildStreetBushes -> layoutStreetBushes + meshStreetBushesClassic ('street-bushes')
- e21a943 f2: buildStreetGreenery -> layoutStreetGreenery + meshStreetGreeneryClassic ('roadside-moss'; components street-bushes, bamboo-fence (village gaps), toro x6)
- 36e9911 f2: buildRipplePool -> layoutRipplePool + meshRipplePoolClassic ('water-ripples')
- 4516ca2 f2: buildRainRipplePool -> layoutRainRipplePool + meshRainRipplePoolClassic ('rain-ripples')
- adf935a f2: buildPaddies -> layoutPaddies + meshPaddiesClassic ('paddies' water; components paddy-bunds x4, rice)
- 3ff7890 f2: buildPathBoulders -> layoutPathBoulders + meshPathBouldersClassic ('path-boulders')
- f115f06 f2: buildPath -> layoutPath + meshPathClassic ('path'; component path-boulders)
- dd6a0b8 f2: buildPathShoulders -> layoutPathShoulders + meshPathShouldersClassic ('path-shoulders')
- ef752a4 f2: buildGround -> layoutGround + meshGroundClassic ('valley-ground'; component path-shoulders)
- 056391f f2: buildWalkwaySlabs -> layoutWalkwaySlabs + meshWalkwaySlabsClassic ('path-slabs')
- 189c12d f2: buildRiverAndBridge -> layoutRiverAndBridge + meshRiverClassic ('river'; components bridge, dango)
- b5a2faa f2: buildEdgeUndergrowth -> layoutEdgeUndergrowth + meshEdgeUndergrowthClassic ('edge-undergrowth')
- 702f364 f2: buildEdgeForest -> layoutEdgeForest + meshEdgeForestClassic ('edge-forest'; component edge-undergrowth)
- 9f272e3 f2: buildFoothillForest -> layoutFoothillForest + meshFoothillForestClassic ('foothill-forest')
- 5bb33c0 f2: buildVillage -> layoutVillage + meshVillageClassic ('distant-village'; component foothill-forest)
- 487cd70 f2: buildMistRing + buildDawnMist -> layout/mesh ('mist-ring', 'dawn-mist')
- e0063cd f2: buildMountains -> layoutMountains + meshMountainsClassic ('mountains'; components edge-forest, distant-pagoda, distant-village, mist-ring, dawn-mist)
- 9c6bb56 f2: addComponentCollider: use the layout box when kit meshes sit anywhere in the subtree
- 38809b5 f2-countryside-split: status file (builder map, checks with real output) and Integrator/kit-lane handoff

PR: https://github.com/c1t1zen1/Michi-Neko-The-Cat-Philosophers-Path/pull/8

## Follow-up (review of PR #8, merged as 6dc0ee5)

Branch fast-forwarded to `fable/integration` 6dc0ee5, then:

1. **Unbound parts warn.** `resolvePart` (and so `bind`, anchors, lists) logs one
   `console.warn('[kit] <id>: the instance has no part '<name>' that its layout binds; that handle stays null')`
   per asset id and part when a kit instance lacks a `$part` (or the part lacks the property, e.g. `.material`).
   The classic path never resolves placeholders, so it is unaffected. New part C of `tools/place_asset_test.html`
   builds part-less `shishi` and `edge-forest` instances twice: 8 warnings, one per id and part.
2. **`caller` components** (koushi, kawara-roof, engawa, upper-windows): `placeComponent` now passes the
   parent group, so `placeInstance` attaches and positions a kit group before `registerFootprint`; the classic
   path is unchanged (golden EQUAL). The remaining restriction is documented in the handoff: a classic house
   places most components before it positions itself, and standalone `create*` calls return detached groups,
   so component footprints must be world data from the layout (as `crates`) or empty; `{oriented}` / `{sloped}`
   descriptors only on top-level assets.
3. **Handoff** now has: tea-bench at (-2.2, 0, 3.6); an origin table per component (parent origin / base /
   mesh centre / hanging point / eave plane); per-ring and per-sprite materials for `ring_N` / `mist_N`; the
   rule that a kit parent must not build its listed components; and what `update()` drives on each bound
   material (window emissive, altar fade opacity, bush sway uniforms, haze colour, halo opacity).
4. **Status** corrected: the koushi problem in a classic secret door showed in the all-fake run from `dbbcdb8`
   to `5531db3`, and in the `?per=1` run from `dbbcdb8` through `e0063cd`; `9c6bb56` fixed it.

Checks (real output):
```
node tools/footprint_golden.mjs                         → footprint golden: EQUAL
node tools/footprint_golden.mjs --query "?assets=modular" → footprint golden: EQUAL
tools/place_asset_test.html?per=1                       → placeAsset test: PASS
  A  162 placements of 67 ids; 0 footprint problems; colliders 479/479 bit-exact
  B  all ids fake: 162 kit instances; registrations equal the classic valley
  B  one id at a time: 67/67 equal
  C  part-less kit instances (shishi, edge-forest), built twice: 8 warnings, one per id and part
node tools/check_syntax.mjs                             → All 44 modules OK
node tools/verify.mjs                                   → All checks passed (exit 0)
node tools/labs_coverage.mjs                            → OK 37 source modules, 112 construction methods, 190 inventory rows, 120 evidence targets
node --test tools/labs_coverage_test.mjs                → pass 11, fail 0
git diff --check origin/fable/integration...HEAD        → clean
```
Commits: `0c1d6c5` (code + test + ASSET_COVERAGE.md regenerated), `af64b48` (handoff and status). Pushed to
`fable/f2-countryside-split` (plain push).
