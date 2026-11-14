# v-nest status
Model: Claude Sonnet 5.5. Base: fable/integration (merged after gate-F). Family: src/kit/nest, lab 10.

- [x] L1 status  - [x] L2-L3 assets `nest`, `nest-eggs`, `guardian-feather` (hero/mid/far)
- [x] L4 none needed  - [x] L5 `node tools/kit_index.mjs` (generated)  - [x] L6 compare JPGs (12 pairs)
- [x] L7 checks  - [x] L9 handoff  - [x] L10 PR

## What
- nest: ~280 (hero) / 110 (mid) twigs laid base / tangent walls / fine rim, moss lining, one lathe cup at far. One vertex-coloured `km.bag` material (the family's single new merged material), so every instance merges.
- nest-eggs: 3 speckled eggs (vertex-colour flecks, same bag material), classic positions and tilts.
- guardian-feather: curved quill + two-sided cambered vane, on the game's shared `MAT.featherGold`, so the game's emissive pulse still drives it. Group origin/orientation as classic (placed at 0,0.12,0 with rx 0.3 rz 0.4).
- Parent does not build components. Live meshes: 0. New merged materials: 1.

## Checks
- kit_check: All kit checks OK (76 passed)
- kit_contract_test --family nest: 3 assets, 9 builds, 223 checks, 0 failed; merge OK (valley 237 calls; +48 kit meshes -> 285; after _mergeInto 240)
- footprint_golden classic: EQUAL
- modular swap of all three ids: colliders, platforms, anchors (nestPos, napSpotPos...), exclusions, water rects, rng (valley 49233) all equal to classic; only the nest meshes differ. Group names "Rooftop Bird's Nest" and "Guardian's Feather" identical to classic.
- check_syntax 75 OK; verify.mjs All checks passed; labs_check OK; git diff --check clean.

## Judgement
AAA-1: classic is a smooth brown donut; modular is a twig cup with a mossy lining, speckled eggs and a leaf-shaped feather. Clear step up. AAA-5: legible at 0.35 m and 2-3 m for all four hours; at 22 h both are dark, silhouette still reads, feather glow (shared material) still stands out.
Concerns: the lining reads a bit saturated green at noon; eggs lost their classic gloss (matte shared bag). Waivers: none.
