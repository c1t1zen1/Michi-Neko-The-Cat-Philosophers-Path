# r2b-roofs-streets report

Branch fable/r2b-roofs-streets. Family src/kit/roofstreets (roofs.js, shared.js). Promoted: roof-machiya, roof-kura, roof-kido, roof-river-steps, roof-komayose, roof-inuyarai, roof-tsuboniwa. Deferred to part c: bridge, corner-house, roji, balconies, zushi, alley pockets/routes, street, ground.

## Checks (uptime load 2.6-4.3 while measured)
- kit_check All kit checks OK (475, after kit_index); contract --family roofstreets: 14 assets, 42 builds, 837 checks, 0 failed WITH the budgets.js exceptions of the handoff; without them 13 budget failures (meshes/materials/buildMs of machiya, kura, kido at mid/far)
- rooftop_golden classic EQUAL; swap of the 7 ids: pieces changed 201 (= 122+5+1+1+2+63+7), root 1, batches/update only; no platforms/walls/ceilings/lights entries
- rooftop_test 38 passed / 2 failed (baseline names); verify 83 passed; labs_check OK; check_syntax 176 OK; cadJS npm test 16/16
- ?qa=1&auto=1 advanceForReview(450): classic s=1232.1749, 7 ids swapped s=1232.2124 (same stall, baseline 1232.17)
- draw calls classic/modular s=14: 161/155, s=125: 167/165, s=233: 194/192, s=700: 133/136; triangles 153725/150445, 162347/157822, 159593/155110, 124561/124376
- L6: 42 pairs `<type>-<near|mid>-<day|dusk|night>-<classic|modular>.jpg` (hours 0.5, 0.75, 0.98), <= 90 KB. 41 differ; kura-near-dusk is byte-identical (the hero kura is the classic geometry on the same materials, so the pixels match). Viewed machiya near/mid, kura near/mid: indistinguishable from classic at these angles, AAA-1 met by faithful port; the one visible gap is the decorateHouse bicycle not being ported. These are a faithful port, so the kit adds tiers (mid/far drop eave caps, façade, dressing) rather than new detail. Camera is overridden to frame each piece; captures not pixel-repeatable across runs. AAA-5 at night: same materials as classic, so identical lighting response.

Handoff: docs/fable/handoff/r2b-roofs-streets.md (budget exceptions patch, kit_index).

## Fix round 1
- Budgets: BUDGET_EXCEPTIONS now live in src/kit/budgets.js on this branch (roof-machiya, roof-kura, roof-kido) with measured classic vs modular numbers in each `why`. Re-measured at uptime 1-min load 1.5: machiya warm hero build 11.0 ms (allowance 12 kept, load recorded); contract 14 assets / 837 checks / 0 failed. Classic (golden, largest real records): house 413 meshes / 8892 tris vs modular 26 / 8021; kura 17 / 520 vs 6 / 374; kido 11 / 152 vs 4 / 152. Materials are the page ctx.MAT set (same as classic).
- R52 draw calls: wide pieces (> 12 m) are now emitted one mesh per material per 32 m world cell (computed from layout x, z, ry), so the Roof Road merge buckets them like classic. uptime load 1.5. classic/modular: s=14 159/151, s=125 165/163, s=233 192/190, s=700 137/134. Modular <= classic at all four. Triangles 153653/149669, 162275/157750, 158309/155038, 127641/124304.
- Roof clip check: for all 185 swapped pieces the golden bounds top and bottom (y) equal classic exactly (max |dy| 0.000); the largest horizontal delta is 0.059 m (house dressing). The roof geometry is the classic code, so eaves, ridge caps and pitch sit exactly where classic sits relative to the level platforms; no clip introduced.
- Known gap: the decorateHouse bicycle (two wheels and a frame beside some shop fronts) is not ported; AAA-1 gap, no gameplay effect.
- kura-near-dusk re-framed (camera further back and higher): classic and modular now differ.
- Re-run: rooftop_golden classic EQUAL; swap 185 piece entries only; rooftop_test 40/40; qa auto twice 450 s: both reach the finale at s=1673.0817; cadJS npm test 16/16 (+ one 15/15 suite); kit_check 528 OK; verify 83/0; labs_check OK.

## Fix round 1 (paused)
Paused by the operator after ee1005b; nothing uncommitted. See the status file "Paused mid fix round 1": R54 buildMs evidence and R52 draws at s=700 are done (11.0 ms at load 1.5; modular 134 vs classic 137); remaining is only reviewer confirmation and an optional second quiet-load re-read.
