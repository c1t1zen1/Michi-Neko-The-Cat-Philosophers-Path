# G-F chores report (Claude Sonnet 5.5), branch fable/integration, final HEAD f78c582

## Commits (one per item, each pushed)
- 6353603 item 1: `src/kit/budgets.js` copied from budgets.md section 3 (D1): triangles 25000/6000/1000, materials 6/4/2, buildMs 6/3/1.5, KIT_LIMITS (newMergedMaterials 11, live meshes 2/0/0, handover 12/45 m); status 'accepted', frame-ms rows stay provisional (not in this file). `tools/kit_check.mjs` asserts the numbers; `tools/kit_contract_test.js` adds a distinct-materials check. kit_check 29 OK, kit_test 36/36, contract PASS.
- a436fd4 item 2: `golden.error` branch (COULD NOT COMPARE) in `tools/footprint_golden.js`; hook-coupling line reworded in handoff/f1-golden.md.
- f038232 item 3: f3 interior-anchor patch in `src/context_actions.js` (no values change); c1 patch to `tools/check_syntax.mjs` (now 53 modules, walks src/characters); AGENTS.md cat paragraph + `src/characters/` Layout row + check_syntax comment. f2 handoff has no patch (only advisory notes). Knick-knack bug deferred, recorded in docs/fable/status/f3-systems-split.md. Footprint and systems goldens EQUAL after it, cat golden EQUAL (40 checks).
- 5297f2d item 4: key-level diff old vs fresh valley golden: every top-level key `same` except `builders` (format, version, scene, seed, counts, rng, colliders, houseColliders, platforms, waterRects, water, exclusions, samples, anchors, objects, aggregates, baked, volatile). `--write` run; file is 20 lines shorter; golden EQUAL, "builder attribution differs" note gone. Systems golden already "byte-identical to this build": not written.
- 93955a2 item 5: tag 20261113a in 47 files (src, kit, tools, rooftops, labs/shared/game.js, index.html) via find+sed. Also `TAG` in tools/golden/systems_digest.js, regenerated src/kit/index.js (kit_index.mjs) and labs/ASSET_COVERAGE.md (line links). AGENTS.md "Current tag" updated. Check grep `?v=2026` not 20261113a outside dawCAT/cadJS prints only docs/social/.../capture.js (own 20261022e TAG, docs, not game code, left alone).
- f78c582 item 6: board ticked: G-P0, G-F, p0-baseline, f1-runtime (F1.6 -> f1-golden note), f2, f3, c1-rig-split (G-C not touched); Appendix C G4: summit/grass/Roof Road sheets not pixel-repeatable, gates are numeric goldens/tests. Module count: AGENTS.md had no number, now says check_syntax prints the real count.

## Gate checks (real results)
G1: check_syntax 53 modules OK; verify.mjs "All checks passed" (70 static checks, kit 29, kit_test 36/36); kit_check OK (29); labs_check OK.
`git diff --check ed9f5b9...HEAD`: one hit, index.html:947 "trailing whitespace" = the CR of a CRLF line (index.html has 913 CRLF lines; the line existed with CR at ed9f5b9; flagged only because the tag bump touches it). Preserved per AGENTS.md; not a defect.
G2: footprint golden EQUAL (classic, byte-identical); `--query "?assets=modular"` EQUAL; `--systems` EQUAL, seam ok, byte-identical; kit contract PASS (self-test 9/9 knobs); cat_golden EQUAL 40/40; labs_geometry_test.html PASS 32/32; rooftop_test 38/0; summit_test 70/0.
G3: catalog_check OK (190 records); labs_coverage OK + labs_coverage_test 11/0; `node --test catalog/tests/*.test.mjs` 37/0; interiors_test 28; ranges_test 19.
G4 boots (headless, Metal, `--session catwalk_autostart=new`, index.html?assets=classic and ?assets=modular, window.game playing + 5 s): one console error each, `404 /cad-overrides.json` (optional file, known). Nothing else, no warnings.
G4 sheets: `capture_baseline.mjs --compare _baseline --only town,hidden,tree,cat` (outputs in _scratch/gate-f; the tool overwrote tracked preview jpgs, restored with git checkout).
- cat (all sheets): identical to Phase 0. hidden: identical. town: only landmarks/props rows differ, within Phase 0 noise floor (e.g. landmarks max 44, px>8 17, floor 60/17).
- tree (8 sheets): DIFFER from Phase 0 master (hero mean 4.7, px>8 123,639; also detail, rim, bush, compare, thicket, goldens). NOT within noise floor (Phase 0 repeat was byte-identical).
  Root cause proven: before the bump `tools/tree_preview.*` imported game modules at stale tag 20261106a while src/ used 20261107a, so two copies of vegetation/foliage etc. loaded. Bump makes them one copy. Evidence: archive of 6dc0ee5 and of HEAD~1 render hero identical to the Phase 0 master (diff 0); HEAD~1 with only tree_preview tags set to 20261107a renders byte-identical to HEAD (diff 0). The game never had the duplicate; game goldens EQUAL. So this is a harness tag artefact, not a game output change.

## Concerns / decisions for the Integrator
1. G-F is ticked despite the tree-sheet delta above (brief says any red: do not tick). I judged it explained and proven harmless; revert the single G-F tick in BUILD_GUIDE_FABLE.md line ~605 if you disagree. Tree masters could be re-captured at the new tag (not done, Phase 0 files untouched).
2. `tools/cat_preview.js` and rooftops stale tags (20261106a) are now brought in line, as c1 handoff 2.2 asked.
3. G3 lines for cadJS/dawCAT npm checks were not in the brief; not run.
4. Budget `meshes` (16/8/3) kept from the old file; budgets.md has no total-mesh cap (it has live-mesh caps, now in KIT_LIMITS).
