# f2-countryside-split

- Worker / model:     Claude Opus 5.5 (claude-opus-5-5)
- Claimed:            2026-11-13 04:20 PST
- Branch:             fable/f2-countryside-split
- Base commit:        5dc924a (fable/integration: f1-golden merged); merged forward to 4bac869 (f1-runtime) and 619aab7 (Phase 0) — merged, not rebased, so the pushed branch was never rewritten
- State:              ready for review

Lane: guide §8 F2.1–F2.6. Every builder in `src/countryside.js` is split into
`layoutX()` (every seeded draw, in its original order, plus the R12/R18
footprint) and `meshXClassic(layout)` (the original meshes, no draws), joined by
`placeAsset(id, layout, classicFn)`. Nested builders and the sub-objects later
kit lanes depend on are components (F2.4), placed through `placeComponent()`.

## Assets
| Inventory id | Promoted from (lab/specimen) | Parts | Tiers | Footprint | State |
|---|---|---|---|---|---|
| (none: Phase 1 split lane; no kit asset is registered) | | | | | |

## Steps
- [x] F2.1 Builder → inventory id map (below; 68 ids, all in `labs/asset_inventory.json`, every countryside inventory id routed)
- [x] F2.2 Split + route: 43 builders split and routed, 4 helpers left as helpers (reasons below)
- [x] F2.3 Footprint golden EQUAL after every builder commit (one commit per builder; two pairs share a commit, named in the subject)
- [x] F2.4 Nested builders keyed by component ids (koushi, kawara-roof, engawa, chochin, crates, nest, shishi, bamboo-fence, toro, street-house, forests…), layouts computed in the parent's layout step at the original call point
- [x] F2.5 `_mergeStatics()`: classic unchanged; kit instances merge except `instance.live` (live roots excluded from both passes)
- [x] F2.6 Full-game headless boot (classic and `?assets=modular`): only the known optional `cad-overrides.json` 404

## Builder → id(s) → split
`+` marks components placed through `placeComponent` (attach: scene, parent or caller).

| # | Builder | Inventory id(s) | State |
|---|---|---|---|
| 1 | `buildGround` | `valley-ground` + `path-shoulders` | split |
| 2 | `buildPathShoulders` | `path-shoulders` | split |
| 3 | `buildRipplePool` | `water-ripples` (parts ring_1…24) | split |
| 4 | `buildRainRipplePool` | `rain-ripples` (parts ring_1…28) | split |
| 5 | `buildPaddies` | `paddies` (water sheets) + `paddy-bunds` ×4 + `rice` | split |
| 6 | `buildPath` | `path` + `path-boulders` | split |
| 7 | `buildWalkwaySlabs` | `path-slabs` | split (not called by the valley; old vs new output compared: identical) |
| 8 | `buildPathBoulders` | `path-boulders` | split |
| 9 | `buildRiverAndBridge` | `river` + `bridge` + `dango` | split |
| 10 | `createRiverUniforms` | (helper of `river` / `paddies`) | not routed: shared shader uniforms, no mesh, no draws |
| 11 | `createPaddyWaterMaterial` | (helper of `paddies`) | not routed: material factory, no mesh, no draws |
| 12 | `createRiverWaterMaterial` | (helper of `river`) | not routed: material factory, no mesh, no draws |
| 13 | `createKoushi` | `koushi` (`upper-windows` where it is the upper lattice) | split |
| 14 | `createCurvedSlope` | (helper of `kawara-roof`) | not routed: one slope geometry inside the roof, no draws |
| 15 | `createKawaraRoof` | `kawara-roof` | split |
| 16 | `createEngawa` | `engawa` | split |
| 17 | `createChochinLantern` | `chochin` | split (phase draw moved into the layout: same stream order) |
| 18 | `createClimbCrates` | `crates` + `sake-barrel` | split |
| 19 | `buildMachiyaTeaHouse` | `tea-house` + `timber-frame`, `koushi` ×2, `noren`, `tea-bench`, `upper-windows`, `kawara-roof`, `chochin` ×2, `nest`, `crates` | split |
| 20 | `buildMachiyaResidence` | `residence` + `timber-frame`, `koushi` ×2, `engawa`, `upper-windows`, `kawara-roof`, `chochin`, `shishi`, `crates` | split |
| 21 | `buildSecretMachiya` | `secret-house` + `secret-tatami`, `secret-table` (+ `secret-fish`), `secret-bed`, `secret-andon`, `secret-door` (+ `koushi`, `lock-plate`), `kawara-roof`, `chochin` ×2, `noren` | split |
| 22 | `buildBirdNest` | `nest` + `nest-eggs`, `guardian-feather` | split |
| 23 | `buildSecretKey` | `key` | split |
| 24 | `buildKeyHidingRock` | `key-rock` | split |
| 25 | `buildShishiOdoshi` | `shishi` | split |
| 26 | `buildVillageStreet` | `village-street` (container) + `street-house` ×8 | split |
| 27 | `buildVillageHouse` | `street-house` + `namako`, `koushi`, `noren`, `kawara-roof`, `chochin` (when drawn) | split |
| 28 | `buildStreetBushes` | `street-bushes` | split |
| 29 | `buildStreetGreenery` | `roadside-moss` + `street-bushes`, `bamboo-fence` (village gaps), `toro` ×6 | split |
| 30 | `buildBambooFence` | `bamboo-fence` | split |
| 31 | `buildBambooCorral` | `corral` + `bamboo-fence` ×4, `corral-sign`, `jade-paw`, `larry` (body only; patrol stays in `updateCorralGuardian`) | split |
| 32 | `buildToroLantern` | `toro` | split |
| 33 | `buildMistAltar` | `mist-altar` | split |
| 34 | `buildWindChime` | `wind-chime` | split |
| 35 | `buildOfferingBells` | `offering-bells` ×5 (one placement per bell) | split |
| 36 | `buildTorii` | `torii` | split |
| 37 | `buildShrine` | `shrine-hall` + `kawara-roof`, `shimenawa`, `shrine-bell`, `offering-box` | split |
| 38 | `buildLanterns` | `street-lamps` ×7 (one placement per lamp) | split |
| 39 | `buildMountains` | `mountains` + `edge-forest`, `distant-pagoda`, `distant-village`, `mist-ring`, `dawn-mist` | split |
| 40 | `buildDistantPagoda` | `distant-pagoda` | split |
| 41 | `buildEdgeForest` | `edge-forest` + `edge-undergrowth` | split (canopy geometry built in the layout: `buildCanopy` draws the valley stream) |
| 42 | `buildEdgeUndergrowth` | `edge-undergrowth` | split |
| 43 | `buildVillage` | `distant-village` + `foothill-forest` | split |
| 44 | `buildFoothillForest` | `foothill-forest` | split |
| 45 | `buildMistRing` | `mist-ring` | split |
| 46 | `buildDawnMist` | `dawn-mist` | split (its `Math.random` scatter moved into the layout, same order) |
| 47 | `buildYarn` | `yarn` ×10 (one placement per ball) | split |

No builder had to be routed whole. Seeded call sites: 82 `this.random()` before and after.

## Checks run (command → real result)
Every builder commit (scratch `check.sh`): `node tools/check_syntax.mjs` → `All 44 modules OK`;
`node tools/footprint_golden.mjs` → `EQUAL` (valley 49233 draws, probe ok, Math.random 92, 518
colliders, 65 platforms, 5 water rects, 4 exclusions, 25 anchors); `node tools/labs_coverage.mjs --write`
then `node tools/labs_coverage.mjs` → `OK 37 source modules, 112 construction methods, 190 inventory rows,
120 evidence targets`; `node --test tools/labs_coverage_test.mjs` → 11 pass, 0 fail; `git diff --check`
clean; `tools/place_asset_test.html` → PASS, with one correction: from `dbbcdb8` (createKoushi) the
classic secret door took its collider from a kit koushi's bounds. The all-ids-fake run showed it until
`5531db3` (buildSecretMachiya); the one-id-at-a-time run (`?per=1`, not part of the per-commit check)
failed for `koushi` from `dbbcdb8` through `e0063cd`, and `9c6bb56` fixed it (addComponentCollider now
checks the whole subtree). The footprint golden was EQUAL at every commit.

Final runs, HEAD of this branch, 2026-11-13:
- `node tools/footprint_golden.mjs` → `EQUAL` (advisory note only: builder attribution, see handoff)
- `node tools/footprint_golden.mjs --query "?assets=modular"` → `EQUAL`
- `tools/place_asset_test.html?per=1` → `PASS`: A 162 placements of 67 ids, 0 footprint problems, colliders 479/479 bit-exact; B all ids fake: 162 kit instances, registrations equal the classic valley; one id at a time 67/67 equal
- `node tools/verify.mjs` → `All checks passed`; `node tools/labs_check.mjs` → `All labs checks OK`
- `git diff --check origin/fable/integration...HEAD` → clean
- `node tools/rooftop_test.mjs` → 38 passed, 0 failed; `node tools/summit_test.mjs` → 70 passed, 0 failed
- `tools/labs_geometry_test.html` → 32/32
- `node tools/capture_baseline.mjs --previews none --no-repeat --compare …/_baseline --only town,hidden,tree,grass` → hidden 3/3 and tree 14/14 byte-identical (0 / 0 / 0); town within its render noise (two fresh captures differ from each other as much as from the masters, see report); grass within its non-repeatable floor except sheet-b maxΔ 215 (floor 207; meanΔ and px>8 inside) — Phase 0: rely on the golden for grass
- Full boot `/__boot.html` (Metal) → plays; console: only the known optional `cad-overrides.json` 404. `/index.html?assets=modular` → same; `assets.summary().problems` empty
- Catalog originals: all 59 countryside inventory ids build through `loadCatalogAsset(id, { variant: 'original' })` before (5dc924a) and after; identical mesh counts and bounds except `nest-eggs` and `offering-bells`, whose shape follows unseeded `Math.random` (it varies run to run on the base too)

Follow-up after review (`0c1d6c5`, on 6dc0ee5): unbound kit parts warn once per id and part; `caller`
components attach before their footprint registers; handoff gains origins, material expectations and the
"kit parents never build their components" rule. Re-run: `node tools/footprint_golden.mjs` → `EQUAL`;
`--query "?assets=modular"` → `EQUAL`; `tools/place_asset_test.html?per=1` → `PASS` (A 162 placements,
0 problems, 479/479 bit-exact; B equal; one id at a time 67/67; C part-less kit instances: 8 warnings, one
per id and part); `node tools/check_syntax.mjs` → `All 44 modules OK`; `node tools/verify.mjs` → `All checks
passed`; labs_coverage OK, its test 11/11.

## Deferred assets and why
None (no kit asset in this lane).

## Footprint waivers requested
None.

## Notes for the Integrator
See `docs/fable/handoff/f2-countryside-split.md`.
