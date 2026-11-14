# v-weather

- Worker / model:     Claude Sonnet 5.5 (claude-sonnet-5-5)
- Claimed:            2026-11-13
- Branch:             fable/v-weather
- Base commit:        489b923 (fable/integration)
- State:              done (PR open)

## Assets
| Inventory id | Promoted from (lab/specimen) | Parts | Tiers | Footprint | State |
|---|---|---|---|---|---|
| falling-petals | weather / game-petal (notched petals that tumble) | points | hero/mid/far | layout | promoted |
| river-petals | water / hanaikada | points | hero/mid/far | layout | promoted |
| snow | weather / game-snow (flakes of varied size, six-arm crystal) | points | hero/mid/far | layout | promoted |
| fireflies | weather / fireflies (new L4 specimen) | points | hero/mid/far | layout | promoted |
| dust-motes | weather / dust-motes (new L4 specimen) | points | hero/mid/far | layout | promoted |
| rain | weather / game-rain, streak (head bright, tail fading) | lines | hero/mid/far | layout | promoted |
| rain-ripples | weather / splash (soft double rings) | ring_1 ... ring_28 | hero/mid/far | layout | promoted |
| dappled-light | komorebi / game-dapple (one InstancedMesh, leaf-gap texture) | pools | hero/mid/far | layout | promoted |
| scent | weather / scent (new L4 specimen) | - | - | - | deferred: no placeAsset seam in src/scent.js |
| splash | weather / entry-splash (new L4 specimen) | - | - | - | deferred: no seam in src/player.js |
| landing-dust | weather / landing-dust (new L4 specimen) | - | - | - | deferred: no seam in src/context_actions.js |

## Steps
- [x] L1 Claim
- [x] L2 Read
- [x] L3 Choose
- [x] L4 Close gaps (five life specimens in labs/weather)
- [x] L5 Promote
- [x] L6 Compare
- [x] L7 Check
- [x] L8 Self-review
- [x] L9 Handoff
- [x] L10 PR

## Checks run (command -> real result)
- kit_check: All kit checks OK (138 passed)
- kit_contract_test --family weather: 8 assets, 24 asset x tier builds, 623 checks, 0 failed (gpu: ANGLE Apple M5 Max)
- footprint_golden (classic): EQUAL; `--systems` classic: EQUAL (parts/wholes/bare seams ok)
- modular (all 8 ids swapped): colliders 518, platforms 65, water rects 5, exclusions 4, anchors 25 as classic; only object-level diffs; `--systems` seam ok, 50 ids routed
- check_syntax: All 90 modules OK; verify: All checks passed; kit_test: 36 pass; labs_check: All labs checks OK; git diff --check clean
- boots (headless, no page errors beyond the pre-existing /cad-overrides.json 404): classic rain; modular x8 in snow at 22 h and rain at 17 h; 8 kit instances, no problems
- rain-ripples live check: `weather=rain&swap=rain-ripples:modular`, 6 s: 28 rings `asset:rain-ripples/ring_N`, textured, one visible (the cat spawns 20+ m from water, so few rings)

## Perf (tools/perf_spots.mjs logic with weather pinned; hour 14, 120 frames x 3 rounds, 1 boot, M5 Max Metal)
Frame ms (amortised) | calls | scene tris. classic / modular (all 8 ids).
| weather | tier | spot | classic | modular |
|---|---|---|---|---|
| rain | medium | street | 9.45 ms, 768 calls | 10.3 ms, 781 calls |
| rain | medium | meadow | 9.45 ms, 683 | 9.95 ms, 679 |
| rain | high | street | 14.1 ms, 784 | 11.75 ms, 780 |
| rain | high | meadow | 10.5 ms, 684 | 8.3 ms, 676 |
| snow | medium | street | 8.1 ms, 767 | 8.23 ms, 761 |
| snow | medium | meadow | 7.12 ms, 684 | 7.6 ms, 672 |
| snow | high | street | 10.3 ms, 770 | 7.9 ms, 758 |
| snow | high | meadow | 8.3 ms, 682 | 8.25 ms, 677 |
Modular medium is at or below classic high in every row (budget rule met). Differences between classic and modular are inside the run-to-run noise of one boot (headless frames are rAF-paced; two high rows swing 2 to 4 ms either way); no row shows a regression beyond that. Draw calls: dappled light is one instanced draw for 14 (medium shows 11) pools; every other system is one draw as classic. The few extra calls on medium rain street are the kit rain/ripples differing in visible-ring count between runs. Triangles within 1% (street high rain +53k from the kit's tier meshes being rebuilt vs. merged differences elsewhere in the scene, not weather).

## Compare (L6)
`docs/fable/status/v-weather/<id>-<hour>-classic|modular.jpg` for all 8 ids at two hours (16 pairs; 960x600 JPG, all < 150 KB). All pairs differ (`cmp`) except `rain-ripples` (both hours): in those frames no raindrop ring happens to be in view (the cat spawns more than 20 m from water; rings spawn only within 24 m), so the pair is identical; the swap is proved by the live check above. I read petals-17, dappled-light-17, river-petals-14, rain-18 (classic + modular), fireflies-22, snow2.
- AAA-1: rain streaks fade head-to-tail and differ in strength instead of equal hairs; fireflies are warm sprites of varied size with their own blink; dappled pools read as a soft wash with bright gaps (visible under the tree and on the paddy). Petals and snow are sparse at these distances, so the gain (notched, tumbling, tinted petals; varied six-arm flakes) shows only close up. Honest: the daylight rain is a little lighter than classic (strength default 1.35; adjustable).
- AAA-5: opacity ramps (rain, snow, fireflies) are still the game's own, so weather and dusk timing match classic.

## Deferred assets and why
`scent`, `splash`, `landing-dust`: specimens added (L4), no kit builder: `scent.js`, `player.js` and `context_actions.js` have no `placeAsset` seam (see handoff).

## Footprint waivers requested
None.

## Notes for the Integrator
- Single-writer grant used on `src/particles.js`: `kitHandles` + `motionScale()` (reduce-motion damping of kit systems only; classic dt untouched) and nothing else. Byte-for-byte classic goldens EQUAL.
- `src/kit/budgets.js`: `BUDGET_EXCEPTIONS['rain-ripples']` (28 materials, as classic).
- `labs/ASSET_COVERAGE.md` regenerated (labs_check requires it); inventory JSON rows in the handoff.
- PR is about 1.2k changed lines (kit ~560, lab specimens ~40 dense lines, docs).

