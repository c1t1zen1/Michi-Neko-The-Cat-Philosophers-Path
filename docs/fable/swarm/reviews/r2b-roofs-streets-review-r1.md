# r2b-roofs-streets review r1
Verdict: NEEDS FIXES (0 Critical, 2 Important, 2 Minor)
Verified: rooftop_golden assets=modular shows only pieces entries (no platform/wall/ceiling/light diffs in the visible listing); rooftop_test 40/40; no Math.random/Date.now/labs imports in src/kit/roofstreets; contract fails only for budgets without the handoff exceptions (not applied in branch, expected, load 1.7-2.1 at my run).
Important
1. handoff: BUDGET_EXCEPTIONS roof-machiya hero buildMs:12 was measured at load 3-5 (R54 requires load <3); `why` strings (machiya/kura/kido) give no classic vs modular numbers, only "same materials". Re-measure at load<3 and cite classic/modular counts.
2. Handoff draw calls s=700 133 vs 136 (+3 modular): explanation (one mesh per material for a wide machiya falls in one 32 m cell instead of split) is plausible but violates R52 (modular <= classic) at that spot; fix by splitting wide machiya by cell or get a ruling.
Minor
- decorateHouse bicycle not ported (0.28 m bounds delta): AAA-1 gap; faithful port adds no new detail (acceptable for purpose, noted).
- kura-near-dusk JPG byte-identical to classic.
