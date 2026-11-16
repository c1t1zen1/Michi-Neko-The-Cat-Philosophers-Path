# v-rocks status
Model: Claude Sonnet 5.5 (resumed after a dead session). Base: fable/integration 4273c90 (merged). Family: src/kit/rocks, lab 13.

- [x] L1 status file
- [x] L2-L3 family `rocks`: assets `path-boulders`, `key-rock` (hero/mid/far, params size/moss/weathering/facets), ported chisel rockGeometry via src/kit/craft.js
- [x] L4 gap specimens: none required
- [x] L5 merge integration, `node tools/kit_index.mjs` (src/kit/index.js regenerated, not hand-edited)
- [x] L6 compare JPGs (key-rock re-shot after companion-stone placement fix; path-boulders code unchanged since its shots)
- [x] L7 checks (below)
- [x] L9 handoff `docs/fable/handoff/v-rocks.md`
- [x] L10 push + PR

## Checks
- kit_check: All kit checks OK (37 passed)
- kit_contract_test --family rocks: 2 assets, 6 asset x tier builds, 218 checks, 0 failed; merge OK
- footprint_golden (classic): EQUAL (byte-identical)
- footprint_golden modular swap of both ids: DIFFERENT only by the intended replacement (path-boulders classic meshes -> asset nodes, key rock meshes -> kit parts); 518 colliders unchanged, 25 anchors unchanged, rng draws unchanged (valley 49233)
- check_syntax: All 64 modules OK; labs_check: All OK; verify.mjs: 70 passed, 0 failed in static section, but 1 test fails (see concerns)
- Note: kit_test "kit_check passes on a clean fixture family" fails: its fixture inventory only lists torii/old-gate, so any real family besides shrine trips it. Not a rocks defect; test is outside my files.

## Judgement
Both assets now have valid L6 pairs (8 per asset, all differ, swap confirmed by the shot log `swaps={"path-boulders":"modular"}`).
- key-rock AAA-1: chiselled, mossed granite vs the classic smooth blob; same volume. AAA-5: legible at 0.35 m and 2-3 m, 6/12/18/22 h; the key stays visible.
- path-boulders (big stone s>0.5 at -4.8,17.7, beside the machiya fence) AAA-1: facets, moss and weathering read well at dawn/noon/dusk; at 22 h both are dark but the modular silhouette is still legible. Silhouette is slightly narrower and more peaked than the classic dodecahedron (fitted to the same half extents). AAA-5: legible at cat height.
Key rock main now sits at y 0.58 like classic (was 0.64). Anchor proof: secretKeyPos (-23.5,0.55,-21.5) and all 25 anchors, all 518 colliders and rng (valley 49233) are byte-equal between the classic digest and the modular-swap digest (compared with `JSON.stringify` of the two `--out` digests).
Waivers: none. Live meshes: 0. New merged materials: 0.

## Fix round 1
- kit_check: All kit checks OK (37 passed). kit_contract_test --family rocks: 2 assets, 6 builds, 218 checks, 0 failed. footprint_golden classic: EQUAL. Modular swap: DIFFERENT only by replaced objects (21 removed, 8 added); colliders, anchors, rng equal. verify: All checks passed (kit_test 36/36 after merging 4de4ae0).
