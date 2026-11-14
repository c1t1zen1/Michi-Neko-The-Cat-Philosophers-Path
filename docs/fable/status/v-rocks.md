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
AAA-1: modular key rock reads as chiselled, mossed granite vs the classic smooth dark blob; same volume and silhouette. AAA-5: legible at cat height (0.35 m) and 2-3 m at 6/12/18/22 h; the key and its hiding anchor are untouched (layout position and name unchanged, no collider changed).
Waivers: none (footprint is the layout's). Live meshes: 0. Merged materials: 0 new (km.rock variants only).
