# s2-clearing status
Model: Claude Sonnet 5.5. Base: fable/integration 49c09bc. Lane: s2-clearing (Phase 4, the meditation hilltop). Family `src/kit/clearing/`, lab 09 (Summit).
- [x] L1-L10 done. Promoted 5 of 12: `meditation-stone`, `summit-enso`, `summit-furin`, `summit-entry`, `summit-path`. Deferred 7 with reasons in `docs/fable/handoff/s2-clearing.md`: `summit-meadow`, `meditation-atmosphere`, `summit-trees`, `slope-forest`, `summit-terrain`, `summit-shoulder`, `summit-grass`.

## Checks (real output)
- kit_contract_test --family clearing: `5 assets, 15 asset×tier builds, 394 checks, 0 failed`
- kit_check: All kit checks OK (309 passed); kit_index --check: in sync (18 families)
- summit_test: 83 passed, 0 failed. summit_golden: EQUAL; routing ok (32 summit ids, all modular 34/34, single swaps 32/32); test output identical to the golden.
- footprint_golden (valley, classic): EQUAL (the valley golden does not see the summit; summit parity below).
- Summit parity, real kit vs classic, measured in a page with a modular runtime (scratch): colliders 24 = 24, platforms 8 = 8, next summit rng draw 0.5037257170770317 on both, all seven binds resolve, `assets.problems` empty, torii world position identical (0, -1201.6, 16.2), 6 kit instances.
- check_syntax: All 130 modules OK; verify: All checks passed; labs_check: All labs checks OK; `git diff --check fable/integration...HEAD` clean.

## Footprint and budgets
No footprint waivers (entry keeps the 8 platforms and 2 colliders from the layout). BUDGET_EXCEPTIONS added in `src/kit/budgets.js` for `summit-entry` and `summit-path`: measured entry 20/20/8 meshes (hero/mid/far), 7/7/6 materials, far 1,380 tris, warm build 7.4 ms hero; path 20/19/9 meshes, 5 mid / 5 far materials, far 1,540 tris. Other three assets are within the default budget (far fūrin drops the thread to stay at 2 materials).
New merged materials: 2 (warm dressed stone for the stairs, warm rock for the stones; summit only). Live meshes: furin 2 (bell, cord/clapper/strip), ensō 0; toro lamps use the summit's glow material (no halo, no live).

## L6 compare
40 JPGs in `docs/fable/status/s2-clearing/` (5 ids x hours 6, 12, 18, 22 x classic|modular), 960x600, all <= 150 KB, none byte-identical (cmp). Read several. Meditation seat (`view=meditation`, 10:35) checked classic vs modular.
- AAA-1: `summit-entry` clearly better (kit torii with kasagi, nuki, black sleeves and kamebara feet; faceted toro with painted stone and hoju) and the lower stair reads as fitted stone with moss joints. `meditation-stone` reads as a chiselled warm rock with a mossy collar; the ensō is now visible on its face (classic hides it inside the stone) but faint under grass. `summit-furin` is the garden chime (glass bowl + washi strip): the glass is paler than the classic aqua bell, so at dusk and night it is low contrast.
- AAA-5: furin animates from the summit's per-frame swing plus the chime's own wind spring; toro lamps follow the summit's glow material (lit at night in the hour-22 entry shot).
- Sightline: nothing was added or raised; the furin hangs at the classic spot, the stone and path stay under the grass line. The seat view at 10:35 shows no added silhouette against the city or sea.

## Notes
- The tools/summit_preview.html page has no kit runtime, so the modular captures used a scratch copy of it with `game.assets` set (not committed).
- perf_spots does not frame the summit; no draw-call delta was measured for the summit. Kit meshes per instance at hero: entry 20, path 20 (the rest a handful); the classic mesh counts for the same ids were not measured. The summit is not merged by `_mergeStatics`.
