# v-alley status
Model: Claude Sonnet 5.5. Base: fable/integration (merged, a2efa7a+). Family: src/kit/alley, lab 16.

- [x] L1 status  - [x] L2-L3 family `alley`: `crates`, `sake-barrel`  - [x] L4 none required
- [x] L5 `node tools/kit_index.mjs` (src/kit/index.js regenerated: alley, rocks)  - [x] L6 compare JPGs  - [x] L7 checks  - [x] L9 handoff  - [x] L10 push + PR

Deferred: pots/signs/other lab props have no inventory rows (lab-only; period-only rule D4 keeps bicycle/tanuki out).

## Design
- crates: four slatted crates (dark core, 4/3/1 courses by tier, lid boards, corner posts, rope battens at hero), outer sizes and positions identical to the classic boxes. All four baked into ONE mesh (part `stack`, far tier needs <=3 meshes) on one km.bag material (vertex colour) so _mergeStatics merges every instance. Platforms come from layout.footprint (unchanged countryside code).
- sake-barrel: lathe belly (max r 0.38, h 0.75 like classic), hoops, optional crest, one mesh (part `barrel`), same km.bag material. It is a component of crates (the crates kit does not build it).
- New merged materials: 0 (km.bag is shared). Live meshes: 0. Draws: 2 meshes per instance pair merge into the existing km.bag draw.

## Checks
- kit_check: All kit checks OK (43 passed)
- kit_contract_test --family alley: 2 assets, 6 builds, 153 checks, 0 failed; merge OK
- footprint_golden classic: EQUAL
- footprint_golden `?swap=crates:modular,sake-barrel:modular`: DIFFERENT only by replaced meshes; colliders, platforms (65), anchors, rng, waterRects, exclusions JSON-equal to the classic golden.
- check_syntax 65 OK; verify.mjs All checks passed; labs_check OK; git diff --check OK

## Judgement
crates AAA-1: slats, battens and lids read as real boxes against the plain grained blocks; tone similar. AAA-5: legible at 0.35 m and ~1 m, 6/12/18/22 h (22 h dark in both). sake-barrel AAA-1: bulged staves, hoops, red crest vs a plain cylinder; AAA-5 ok. Waivers: none. Compare shots only show the tea-house stack (cameras beside the house); the residence stack uses the same build.
