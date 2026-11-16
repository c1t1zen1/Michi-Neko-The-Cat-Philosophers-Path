# v-fences report
Status: DONE_WITH_CONCERNS. Commit 4d34a74 on fable/v-fences. Full detail, check outputs and AAA review: docs/fable/status/v-fences.md; handoff: docs/fable/handoff/v-fences.md (in the worktree/PR).

Built: src/kit/fences/{culm,fence,corral,sign,index}.js; labs/fences/js/sign.js + specimen `corral-sign` (L4). Assets: bamboo-fence (parts culms, knots), corral (corner_posts, lashings; builds only its own body), corral-sign (post, board, face, cap, lashing). Three tiers each, params with ranges, footprint = layout.footprint (no waivers).

Checks: kit_check OK (45); kit_contract_test --family fences 300 checks 0 failed; footprint_golden classic EQUAL, modular swap differs only in mesh composition (colliders/platforms/exclusions/anchors unchanged); check_syntax 67 OK; labs_check OK after regenerating ASSET_COVERAGE.md; verify 70 passed, kit_test 35/36; diff --check clean.

Concerns: (1) tools/kit_test.mjs fixtureRoot() copies real src/kit so any lane adding a family fails "clean fixture family" test; Integrator should filter family folders in the fixture (not edited by me). (2) Card says "one instanced culm geometry": done (shared per tier), but InstancedMesh is not merged by _mergeStatics, so each fence is 2 draws (culms + knots); ~14 fences. (3) corral-sign inventory coverage row needs updating (hot file; JSON in handoff). L6 shots in docs/fable/status/v-fences/.

## Fix round 1
- Merged origin/fable/integration (conflict only in generated src/kit/index.js: regenerated, fences + rocks).
- Important: fence culms/knots, corral posts/lashings and sign lashings are now baked into plain indexed merged BufferGeometry (culm.js `bake`) on merge-able kitMaterials, no InstancedMesh; `_mergeStatics` folds them. Measured with perf_spots (high, 1 boot, classic vs swap all three ids): draw calls street 763 -> 751 (-12), meadow 735 -> 706 (-29); triangles street 8,116,087 -> 8,503,793 (+4.8%), meadow 7,535,912 -> 7,867,954 (+4.4%). Triangle cost is real (merged statics aren't culled); hero culm trimmed to 7 radial x 3 rows/node to hold it.
- Minors: corral-sign JPGs re-shot from a sign-framed camera (hours 6/12/18/22); handoff Materials rewritten against R26; hero end post +4 cm fixed; far sign dark wood noted as cosmetic deviation.
- Checks: kit_check 53 OK; contract --family fences 300 checks 0 failed (merge OK); footprint_golden classic EQUAL; modular swap only objects/aggregates/baked/counts differ; verify: all checks passed; labs_check OK; diff --check clean.
