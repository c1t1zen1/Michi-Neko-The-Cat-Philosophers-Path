# s2-clearing report (Claude Sonnet 5.5)

Built `src/kit/clearing/` (stones.js, furin.js, approach.js, index.js): five promoted ids (`meditation-stone`, `summit-enso`, `summit-furin`, `summit-entry`, `summit-path`) reusing the rocks chisel, the garden chime, the shrine torii (pegs off, 0.56 scale) and the lanterns toro. Seven ids deferred with reasons (handoff): `summit-meadow`, `meditation-atmosphere`, `summit-trees`, `slope-forest`, `summit-terrain`, `summit-shoulder`, `summit-grass`.
Summit Lab: family `clearing`, five specimens `c-stone`, `c-enso`, `c-furin`, `c-entry`, `c-path` (real kit assets through AssetRuntime); research.md and the lab copy updated.
Hot files in-lane: `src/kit/budgets.js` (exceptions for `summit-entry`, `summit-path`), `src/kit/index.js` (regenerated). `labs/ASSET_COVERAGE.md` regenerated (line numbers only; needed for labs_check).

## Checks run (real output)
- kit_contract_test --family clearing: 5 assets, 15 asset×tier builds, 394 checks, 0 failed
- kit_check: All kit checks OK (309 passed); kit_index --check in sync (18 families)
- summit_test: 83 passed, 0 failed; summit_golden: EQUAL, routing ok (all modular 34/34, single swaps 32/32), test identical
- footprint_golden classic: EQUAL (valley only; does not see the summit)
- Summit parity with the real kit vs classic (scratch page): colliders 24/24, platforms 8/8, next summit rng draw identical, 7 binds resolve, no runtime problems
- check_syntax 130 modules OK; verify All checks passed; labs_check All labs checks OK; git diff --check clean
- Lab page `/labs/summit/` loads 10 specimens with no console errors

## Budgets / materials
Exceptions: `summit-entry` (20/20/8 meshes, 7/7/6 materials, far 1,380 tris), `summit-path` (20/19/9 meshes, far 1,540 tris). 2 new summit-only merged materials (warm stone, warm rock). No footprint waivers.

## Self-review vs acceptance
- L6: 40 compare JPGs (5 ids x 6/12/18/22 x classic|modular) in docs/fable/status/s2-clearing/, none identical, all <= 150 KB, several read. Entry/path clearly better; stone fine; ensō now visible (classic hides it inside the stone) but faint; fūrin glass paler than classic at dusk/night.
- Seat view (meditation, 10:35) classic vs modular checked; nothing added above the grass line, furin at the classic spot.
- Not measured: perf_spots (it does not frame the summit); no draw-call delta for the summit. The contract sample for `meditation-stone` is the path layout, so the single seat-stone branch is covered by the in-game captures and parity, not the contract test.

## Open concerns
- Lower-path toro height uses `lowerStepTopAt(z) - 0.12` on a buried footing (the layout carries no terrain); see handoff for a `lanternY` patch if the landform changes.
- tools/summit_preview.html has no kit runtime (modular captures used an uncommitted scratch copy).
- Coverage evidence mapping for the five ids and inventory `production` fields are Integrator steps (handoff).

## Fix round 1
- Merged origin/fable/integration (only conflict: generated src/kit/index.js, regenerated with kit_index.mjs, 19 families).
- Important 1: the ensō is now a lit matte MeshStandardMaterial, near-black ink vertex colour, opacity 0.7, polygon offset; no self-glow. Re-captured (meditation-stone/summit-enso/summit-path x 6/12/18/22 plus four new `seat-<h>` pairs from the meditation view), Read stone 12 classic and modular, stone 22 and seat 18: the ink reads dark on the stone and nothing glows at night.
- Important 2: `src/summit/clearing.js` `buildLowerPath` (layout step only) now carries `lanternY: [yL, yR]` = `terrainHeightAt(side*3.15, z) - 0.05`, the classic arithmetic, no rng draw; the kit reads it (step-top fallback kept), footing shortened to 0.3 m.
- Important 3: `warmRock` darkened (0x4f4636 / 0x8a7d63) and the seat stone default size 0.85 (range 0.7 to 1.3); the modular stone is now a dark earthy mass like classic.
- Parity is reproducible: `node tools/summit_kit_parity.mjs` (new; classic vs real modular kit): "summit kit parity: EQUAL" (24 colliders, 8 platforms, same next rng draw 0.8436442203819752, binds, torii/fūrin positions, lanternY, no runtime problems).
- Minors: summit-trees and slope-forest recorded as "no study, no swap" with what a study needs (handoff). Not changed: the furin thread length (0.36 m x 2.4 scale is intended: it hangs from the branch and swings with the bell); the part alias `cord` stays. The single seat-stone contract sample remains uncovered by the contract test (parity and captures cover it).
- Real output: kit_contract_test 5 assets, 394 checks, 0 failed; summit_test 83 passed, 0 failed; summit_golden EQUAL, routing ok, test identical; verify All checks passed; labs_check OK; check_syntax All 136 modules OK; kit_index in sync; git diff --check clean.
