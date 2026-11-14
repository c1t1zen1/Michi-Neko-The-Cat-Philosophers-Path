# s3-vista

- Worker / model:     Claude Sonnet 5.5 (claude-sonnet-5-5)
- Claimed:            2026-11-14
- Branch:             fable/s3-vista
- Base commit:        d7d3137 (fable/integration)
- State:              ready for review

Lane: Phase 4, the summit vista. Family `src/kit/vista/`, lab 09 (Summit Lab) specimens `v-*`.

## Assets
| Inventory id | Specimen | Parts | Tiers | Footprint | State |
|---|---|---|---|---|---|
| summit-vista | v-city (related) | layers | h/m/f | layout.footprint | promoted |
| vista-terrain | v-ribbons | river, roads | h/m/f | layout + anchors (waiver) | promoted |
| kyoto-city | v-city, v-city-lit | walls, roofs, eaves, lights, gardens | h/m/f | anchors (waiver) | promoted |
| summit-pagoda | v-pagoda | pagoda, lanterns | h/m/f | anchors (waiver: recolour proxies) | promoted (pagoda kit `buildPagoda`, preset yasaka) |
| summit-bay | v-bay | water, glints, boats | h/m/f | anchors (waiver) | promoted |
| harbour | v-harbour | skyline, fittings, lights / islands | h/m/f | anchors (waiver) | promoted (index 0 and 1) |
| bay-bridge | v-bridge | bridge | h/m/f | anchors (waiver) | promoted |
| ferris-wheel | v-wheel | wheel, frame, gondolas | h/m/f | anchors (waiver) | promoted (turns) |
| horizon | v-horizon | range_1..3 | h/m/f | anchors (waiver) | promoted (ranges kit `ridgeRingGeometry`) |
| summit-clouds | - | - | - | - | DEFERRED: sky kit (v-sky) not merged |
| blender-roofscape | - | - | - | - | out of scope: media GLB with fallback |

## Steps
- [x] L1-L3 kit family `src/kit/vista/`
- [x] L4 Summit Lab specimens (`labs/summit/js/vista.js`, nine tiles; the lab boots with no errors and builds 27 tiles)
- [x] L5-L7 checks (below)
- [x] L6 compare pairs, four times, all nine ids: `docs/fable/status/s3-vista/<id>-{6,12,18,22}-{classic,modular}.jpg`, plus `meditation-*` from the seat
- [x] L8-L10 handoff `docs/fable/handoff/s3-vista.md`, report, PR

## Checks run
- `node tools/kit_contract_test.mjs --family vista` -> 9 assets, 27 asset x tier builds, 778 checks, 0 failed; merge OK; self-test OK (three consecutive passes after the buildMs headroom)
- `node tools/summit_kit_parity.mjs` -> `summit kit parity: EQUAL` (24 colliders, 8 platforms, same next rng; all nine vista ids present as kit instances)
- `node tools/summit_golden.mjs` -> `summit golden: EQUAL`, routing ok 32 ids
- `node tools/summit_test.mjs` -> `83 passed, 0 failed`
- `node tools/footprint_golden.mjs` -> EQUAL; with `--query "?swap=<nine ids>:modular"` -> EQUAL
- `node tools/kit_check.mjs` -> 365 passed; `node tools/check_syntax.mjs` -> All 146 modules OK; `node tools/verify.mjs` -> All checks passed; `node tools/labs_check.mjs` -> All labs checks OK; `git diff --check fable/integration...HEAD` -> clean

## Perf (summit preview, hour 12, 960x600, scratch page with game.assets)
classic 233 calls / 1.55M tris; modular high 141 calls / 1.58M tris; modular medium 139 calls / 1.36M tris (<= classic high). Modular draws game-density 920 houses (classic preview draws 430).

## AAA self-review (from the meditation seat, noon, dusk, dawn and night)
- AAA-1 (reads better than classic): yes for the pagoda (measured proportions and swept roofs), the bridge (suspension cables instead of a bar), the harbour (wharf, cranes, containers), the wheel (turns, gondolas), the ranges (lit crest). The city reads the same at 4 px; roofs have ridges. Weakest: the garden blobs are dark at night (the summit's own palette, as classic).
- AAA-5 (light): all lighting is the summit's own per-frame palette through the classic anchors; the pagoda follows it through proxies.
- Landform: the kit only reads `terrainHeightAt`; no height changed (parity EQUAL, summit_test 83).
- Protected view: nothing planted or placed covers the city or sea from the seat; compare captures `meditation-*`.

## Footprint waivers
Every promoted asset except summit-vista carries a `footprintWaiver` for its anchors (colliders and platforms are the classic empty ones); see the handoff.

## Notes
See `docs/fable/handoff/s3-vista.md`.
