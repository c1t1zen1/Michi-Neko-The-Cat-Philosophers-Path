# v-greenery status
Model: Claude Sonnet 5.5. Base: fable/integration a2efa7a. Family: src/kit/greenery, lab 15.

- [x] L1 status file
- [x] L2-L3 family `greenery`: `street-bushes`, `roadside-moss`, `bamboo-groves` (hero/mid/far, params)
- [x] L4 gap specimens: none required (labs/greenery already has game-bush, karikomi, nodes, leaves)
- [x] L5 `node tools/kit_index.mjs` regenerated src/kit/index.js (not hand-edited)
- [x] L6 compare JPGs, 8 per id (low = cat height 0.35 m, mid = 2-3 m; hours 6/12/18/22), all classic/modular pairs differ under cmp
- [x] L7 checks (below)
- [x] L9 handoff docs/fable/handoff/v-greenery.md
- [x] L10 push + PR

## What was built
- street-bushes: free lumpy shrubs plus clipped karikomi cushions (param `clipped`, `lump`), one shared foliage material so `bushMat` rustle still works (bind `bushes.material`). Two instanced draws (classic one). Seated 0.3 x scale-y lower than classic so the lowest lobe grounds.
- roadside-moss: merged domed moss pillows on `km.moss` (merge-able; classic was one unmerged InstancedMesh with a flat circle). Components (bushes, fences, toro) stay with the runtime.
- bamboo-groves: noded culms (swollen node, dark ridge, pale waxy band, per-culm tint) in place of plain cylinders; classic bend/flutter shader ported (own time uniform driven by `update()`), layout in the group's local frame. Far tier: whole culm static, one sway material.
- Grass exclusions/colliders: footprint is layout.footprint untouched (no waiver).

## Checks (real output)
- kit_check: All kit checks OK (46 passed)
- kit_contract_test --family greenery: 3 assets, 9 asset x tier builds, 264 checks, 0 failed; merge OK
- footprint_golden classic: EQUAL; --systems classic: EQUAL
- footprint_golden `?swap=street-bushes:modular,roadside-moss:modular`: DIFFERENT only by replaced objects (3 added, 2 changed); 518 colliders, 25 anchors, rng valley 49233 unchanged. `--systems ?swap=bamboo-groves:modular`: only the grove meshes replaced (8 added); rng unchanged
- check_syntax: All 67 modules OK; labs_check: All OK; verify.mjs: All checks passed (kit_test 36/36); git diff --check fable/integration...HEAD clean

## Perf (tools/perf_spots.mjs, high, Metal, 1 boot; street spot)
Classic 760 calls / 8.05M tris / 11.5 ms. All three swapped: 769 calls (+9) / 8.38M tris (+4.1%) / 12.5 ms (round 11.5-14.3, noise). bamboo-groves alone: street 782 calls (+22) / 8.44M (+4.8%) / 11.3 ms; meadow 732 (-3) / 7.67M (+1.7%) / 10.6 ms vs 10.8. Hero culms cost the triangles (12 nodes x 4 rings x 7 sides); mid/far much lighter. Live meshes: bush foliage 2 (shared material), bamboo 2 per grove (far 1). New kit materials: `km.bamboo` (lower culms, instanced) and `km.moss` (merged): 2, see handoff.

## Judgement
- street-bushes AAA-1: lumpier, more varied silhouettes with flatter clipped cushions beside the free shrubs; AAA-5 legible at 0.35 m and 2-3 m all four hours (22 h dark in both).
- bamboo-groves AAA-1: culms show nodes and bands up close, subtle at distance; leaf cards match classic. AAA-5 fine, grove still readable at cat height.
- roadside-moss AAA-1 is weak: the meadow grass hides almost all of the patches, so the pair differ only as a darker lumpy pillow under grass. Honest: low visibility asset, difference small. AAA-5 n/a.
Waivers: none. Compare framing for moss shows mostly grass for that reason.
