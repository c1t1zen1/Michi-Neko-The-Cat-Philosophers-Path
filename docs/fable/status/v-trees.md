# v-trees status
Model: Claude Sonnet 5.5. Started 2026-11-13. Base: fable/integration 489b923. Family: src/kit/trees, lab labs/trees (new, decision D5).
Integrator grant: single writer of src/foliage.js (ADDITIVE only). Not needed: foliage.js is unchanged (buildCanopy already exposes the tier knobs).

- [x] L1 status file
- [x] L4 new lab labs/trees: orchard stage (plant sakura / maple / pine at hero / mid / far, wind slider, Michi), 15 specimens in three shelves (trunk, crown, tiers), 5-step assembly, research.md (sources marked "from memory", no web search), poster.png
- [x] L2-L3 family `trees`: `sakura`, `maples`, `pines`, `rim-trees`, `tree-trunks`, `tree-canopies` (hero/mid/far, params crown_spread, leaf_density, trunk_girth, lean, bark)
- [x] L5 `node tools/kit_index.mjs` regenerated src/kit/index.js
- [x] L6 compare JPGs (sakura, maples, pines, rim-trees x hours 6/12/18/22, classic vs modular; all pairs differ under cmp). tree-trunks and tree-canopies are not routed by Vegetation: no pair (lab shots instead)
- [x] L7 checks (below)
- [x] L9 handoff docs/fable/handoff/v-trees.md
- [x] L10 push + PR

## What was built
- Trunk: a curved spine from a planted foot (the classic rotated the cylinder about its middle and lifted the foot), root collar, five buttress lobes, 0-4 surface roots by tier, a rounded top; the canopy origin follows the spine at 85 % of the trunk. Trunk and limbs are ONE geometry and one draw per tree (the trunk carries zero `aWind`).
- Hero tier (play field): leaf sprays on twigs, classic parameters, flex wind kept. Mid: half the sprays, two twigs a limb, one sprig. Far: painted masses. Rim trees: masses at hero (classic numbers), mid (one fewer tuft a clump), far (20-triangle tufts, 4 limbs).
- Materials: bark from `ctx.kitMaterials.bark` (classic's three bark args, 0 new); foliage materials shared per species and ref-counted (released when the last tree is disposed). No `this.rng` use; everything from `ctx.rng`.
- tree-trunks / tree-canopies: promoted and contract-tested, not routed in the valley. `tree-canopies` supports `style: clumps` for the summit (s2-clearing).

## Triangles (contract samples: sakura 1.3, maple 1.2, pine 1.5, rim sakura 1.15)
hero / mid / far: sakura 14026 / 5590 / 914; maples 11132 / 4520 / 914; pines 4606 / 3010 / 914; rim-trees 8218 / 5710 / 914; tree-trunks 1738 / 1390 / 634; tree-canopies 11276 / 5196 / 872. All within 25k / 6k / 1k, no exception requested. Classic (scale 1, lab measure): sakura 10958, maple 9424, pine 4146.

## Checks (real output)
- kit_check: All kit checks OK (127 passed)
- kit_contract_test --family trees: 6 assets, 18 asset x tier builds, 746 checks, 0 failed; merge OK; self-test OK
- footprint_golden classic: EQUAL; --systems classic: EQUAL
- footprint_golden `?swap=sakura,maples,pines,rim-trees:modular` valley: EQUAL; `--systems`: DIFFERENT only by the tree objects; 135 colliders, 5 anchors, vegetation 249867 draws, `canopies freed 25/25`, seam ok
- check_syntax: All 88 modules OK; verify.mjs: All checks passed; labs_check: All labs checks OK; `git diff --check fable/integration...HEAD`: clean
- boot (tools/game_shot.mjs, Metal): classic and with all six ids swapped, mode playing, 25 kit instances, only the pre-existing /cad-overrides.json 404; tools/tree_preview.html?sheet=hero&wind=4 clean (classic builders). Kit hero leaves carry `aWind` and the same flex wind as the classic sprays.

## Perf (perf_spots, Metal, 2 boots, round 2)
See the table in the handoff. Street: classic high 771 calls / 8.11M tris; modular high 817 / 8.15M; modular medium 817 shadow-refresh (mean 621) / 7.03M. With the optional Vegetation bake hook (handoff patch, tested locally, NOT committed): high 778 / 8.18M; medium 767 (589) / 6.96M. Meadow without hook: modular high 771 / 7.49M vs classic 732 / 7.53M. Frame ms were noise-level (street high 8.65 vs 11.82 ms, medium 8.52 vs 9.36 ms).

## Judgement
- AAA-1: the trunk is better (planted foot, root collar and roots visible at 35 cm, bark per tree); crowns are the same leaf-spray look but a different random shape, a touch sparser at the same triangle count (sakura leaf density raised from 11 to 13 per metre to compensate). Not a dramatic upgrade: the win is the trunk and the tiers.
- AAA-5: legible at cat height and 2-3 m at all four hours. The pine and rim shots sit inside the edge forest, so those pairs are nearly identical at a glance (they differ under cmp); the sakura and maple pairs show the change.
## Open concerns
- Draw calls +46 (shadow-refresh) without the bake hook; recommend the handoff patch.
- Lab study (labs/trees/js/kit.js) and kit (src/kit/trees/build.js) are copies; keep them in step.
- Wind not given a lab specimen of its own (orchard wind slider only).
