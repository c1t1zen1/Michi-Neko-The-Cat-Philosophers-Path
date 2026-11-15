# r3-canal-market status
Model: Claude Sonnet 5.5. Base: fable/integration 80ddf98. Started 2026-11-15 13:10. State: DONE_WITH_CONCERNS (8 of 19 ids promoted, 11 deferred).

## Promoted (family `roofcanal`, src/kit/roofcanal/index.js; 8 assets, hero/mid/far)
roof-stepping-stones, roof-canal-landings, roof-footbridge, roof-toro (light socket `light_toro`), roof-cistern, roof-chimney, roof-futon-racks, roof-canopy-vents. All 42 level pieces of these types.
Each builds in the rail frame at the piece's middle from `layout.piece`, drawing the same boxes/heights as the classic builder (platforms are level.js; no collider or grab edge registered). Materials are the Roof Road's own `ctx.MAT` entries (0 new materials; a km.plain fallback exists only for the contract page). Hero adds plank seams, finial, bronze caps, futon stripes, down-pipe; `wear` leans/settles parts (geometry only, centimetres).

## Deferred, with reasons
- roof-canal, roof-canal-banks, roof-lines (ribbons along the rail across a corner: need rail points, which layout does not carry; a ribbon cannot be built from the straight-frame layout). Handoff 3.
- roof-cherry-boughs (frame is the bough's mid, not the piece's mid), roof-canopy, roof-skylight-bridge, roof-market-stalls (shopfronts): larger, same frame question; next PR.
- roof-takasebune (boat hull: r5 boatman/dynamic record coupling, wake and ring live meshes), roof-willows, roof-culvert-ledges, roof-tenmangu-gate: no PIECES entry on integration (not built by any piece type today).
Size rule: ~10 ids per PR, so the most-seen small pieces went first.

## Checks (uptime 1-min load 2.5 to 4.1 during runs)
- kit_check: All kit checks OK (451 passed)
- kit_contract_test --family roofcanal: 8 assets, 24 asset x tier builds, 560 checks, 0 failed; merge OK
- rooftop_golden classic: EQUAL
- rooftop_golden swap of all 8 ids: only the 42 piece entries change (+ 1 root group, batches, 5 update samples that hash batches); materials 0 added; light list unchanged (299). "routing FAILED" there is the self-test's own "every other piece identical" rule, which any real swap trips (named: canalLanding/steppingStone, i.e. mine)
- footprint_golden classic: EQUAL; check_syntax 172 modules OK; verify All checks passed; labs_check OK; git diff --check clean
- rooftop_test: 38 passed, 2 failed = the baseline pair (autopilot reaches the perch: stops after drama school ridge @1221.6, s=1232.17; every piece on one straight leg). Level is untouched by the kit; rooftop_companion_test crashes on its baseline assertion (finale), unchanged.
- ?auto=1 not run (physics/level independent of kit meshes; autopilot test above runs the real physics, same stop s=1232.17 on classic).

## L6 (docs/fable/status/r3-canal-market/*.jpg: canal s262, footbridge s273, toro s307, laundry s692, vent s486; classic vs swap, hour 0.2 only; 4 hours and cat height not done)
Captures are not pixel repeatable; judged by eye: modular reads as the classic one (same silhouettes, same materials) with small hero additions (bridge giboshi caps, plank seams, finial). AAA-1: parity, not an upgrade; AAA-5 ok at the rail camera. Cistern is not framed in a shot (s 671/707) and the nine other hours are not compared.

## Concerns
1. pieces/common.js mergeByMaterial drops the vertex-colour attribute, so any km.bag piece renders black on the Roof Road (found in a first capture). Worked around by using ctx.MAT. r2/r4/r5 must do the same or the Integrator fixes common.js (handoff 2).
2. Stepping-stone bounds differ ~0.1 m from classic (digest only); no collider.
