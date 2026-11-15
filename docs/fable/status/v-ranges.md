# v-ranges status
Model: Claude Sonnet 5.5. Started 2026-11-13. Base: fable/integration 15a5271. Family: src/kit/ranges, lab 03 (labs/ranges).

- [x] L1 status file
- [x] L2-L3 family `ranges`: mountains, edge-forest, edge-undergrowth, foothill-forest, distant-village, mist-ring, dawn-mist (hero/mid/far, params)
- [x] L4 gap specimens: labs/ranges section 08 (foothill-stands, village, mists), labs/ranges/js/life.js + life_data.js, test labs/ranges/test_life.mjs
- [x] L5 `node tools/kit_index.mjs` (ranges added; index.js generated, not hand-edited)
- [x] L6 compare JPGs, 8 per id (low = cat height 0.35-0.5 m, mid = 2.5-9 m; hours 6/12/18/22; dawn-mist 5.5/6.25/7.5/12 mist), 56 pairs, none byte-identical (cmp)
- [x] L7 checks (below)
- [x] L9 handoff docs/fable/handoff/v-ranges.md
- [x] L10 push + PR

## What was built
- mountains: polar height-field ring (graded radius, wrapped seam, 192 x 80 at far = 30.7k tris vs classic 57.8k), slope-aware colours (rock on steep faces, broadleaf low / cedar high, strata, haze). The 4 m cliff at the floor edge is eased out. Its listed components (edge-forest, pagoda, village, mist ring, dawn mist) are NOT built: the runtime places them.
- edge-forest: classic painted-mass crowns ('masses', leaf-mass material), root-flared trunks, all thicket parts bound (thicket re-pose verified at runtime). Crowns are built once per tier and cached.
- edge-undergrowth: two shrub shapes on the wall, the thicket set bound.
- foothill-forest: baked tone gradient (dark skirt, sunlit tip), tiered sugi variant, tier detail.
- distant-village: one baked mesh (plinth, walls, gabled roofs with eaves) + one window mesh; classic was about 4 meshes a house.
- mist-ring / dawn-mist: painted wisp textures per tier, per-sprite materials kept, ring tinted by hour; dawn mist keeps opacity 0 / hidden until updateDawnMist wakes it.

## Checks (real output)
- kit_check: All kit checks OK (140 passed)
- kit_contract_test --family ranges (with the BUDGET_EXCEPTIONS patch of the handoff applied locally, not committed): 7 assets, 21 asset x tier builds, 603 checks, 0 failed; merge OK. WITHOUT the exceptions the triangle / mesh / buildMs budget rows fail for the landscape ids (classic itself is far over: edge forest 1.70M).
- footprint_golden classic: EQUAL; --systems: EQUAL
- footprint_golden `?swap=<all seven>:modular`: DIFFERENT only by replaced objects (9 changed, 57 added, 115 removed): colliders 518, platforms 65, anchors 25, rng valley 49233 draws unchanged; one anchor handle (edgeForestTrunks) now points at the kit part. `--systems ?swap=...`: EQUAL
- check_syntax: All 92 modules OK; verify.mjs: All checks passed; labs_check: All labs checks OK; ranges_test: 19 ranges checks passed; test_life.mjs: 5 checks passed; git diff --check fable/integration...HEAD clean
- Boot (index.html, all seven swapped, hour 6.3, weather mist, 60 frames): only the pre-existing `/cad-overrides.json` 404; no [kit] warning. Full 15-20 min SwiftShader boot not run (Metal boots, perf_spots boots x4 and 112 shots all clean).

## Perf (perf_spots, Metal, 1 boot each, hour 10.5; calls / triangles per frame, mean)
street 779 / 8.16M classic high, 798 / 8.01M modular high, 594 / 4.97M modular medium; shrine 457 / 7.09M, 461 / 6.88M, 325 / 4.24M; meadow 734 / 7.54M, 752 / 7.38M, 580 / 4.77M. Medium <= classic high holds. +4..+19 high calls: undergrowth split in two wall sets and chunked; village 2 draws vs about 190. Frame ms not comparable (load average 6.7 vs 11).

## Judgement (honest)
- distant-village AAA-1: clear gain (gabled roofs, eaves, plinths, one draw); AAA-5 fine.
- mountains AAA-1: slope-painted rock and graded mesh; subtle at a distance (pairs differ, but you have to look). AAA-5 fine; the far ring is cheaper than classic.
- edge-forest AAA-1: weak. Same crown recipe by design (a thinner first try left gaps and was rejected), differences are the trunk flare and seeds. AAA-5 fine at 0.35 m and 2.5 m, all four hours.
- edge-undergrowth, foothill-forest: small visible change (shape variety, tone gradient). mist-ring / dawn-mist: wispier, hour-tinted; subtle. All legible at all hours.
- Foothill compare at distance shows the cedars/crowns nearly alike: the gain is mostly the shading gradient.
Waivers: none in footprints. Budget exceptions requested (handoff). Mid-tier modular medium quality builds mist/forest at far.

## Open concerns
- tools/ranges_test.mjs is not edited (not in my files): test_life.mjs is separate.
- Summit horizon reuse: ridgeRingGeometry / valleyRangeColors / canopySet (handoff "Reusable kit builders").

## Pre-review: budgets
Integrator grant: src/kit/budgets.js BUDGET_EXCEPTIONS for the seven ranges ids committed, with measured classic and modular counts in each why. Merged origin/fable/integration (no conflicts; kit_index --check: in sync, 10 families).
- kit_contract_test --family ranges: 7 assets, 21 asset x tier builds, 603 checks, 0 failed; PASS: kit contract (on the committed tree)
- kit_check: All kit checks OK (144 passed); verify.mjs: All checks passed
