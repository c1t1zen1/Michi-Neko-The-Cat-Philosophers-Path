# r3b-canal-market status
Model: Claude Sonnet 5.5. Base: fable/integration 26f89c6. Started 2026-11-15 14:00. State: DONE_WITH_CONCERNS (8 of 11 promoted; 3 deferred).

## Promoted (src/kit/roofcanal/market.js + common.js): roof-canal, roof-canal-banks, roof-lines, roof-skylight-bridge, roof-market-stalls, roof-cherry-boughs, roof-canopy, roof-takasebune (hull only)
Ribbons (canal) are built from layout.rail; stalls and the cherry bough use one rail frame each (frameGroupAt), exactly the classic frames. Heights/depths identical to the classic builders; no collider registered; canopy glass is ctx.MAT.glass so the facade still moves it to the transparent batch. The boat returns the classic record and `live: [group]`; attach nodes for r5 are `sockets.attach_boatman` / `attach_pole` (empty, handoff §2).
Deferred: roof-willows, roof-culvert-ledges, roof-tenmangu-gate (builders live in downtown.js, read-only; they already have PIECES entries, no patch needed; a later pass).

## Checks (uptime 1-min load 2.4 to 3.4)
- kit_check: All kit checks OK (456 passed)
- kit_contract_test --family roofcanal: 16 assets, 48 builds, 1133 checks, 0 failed (samples are the real runs: canal 70 m, banks 74 m, canopy/stalls 103 m with 3 gaps). BUDGET_EXCEPTIONS added in src/kit/budgets.js for 4 ids at hero (materials 14/12/8/10), mid/far remapped to caps.
- rooftop_golden classic: EQUAL. Swap of the 8 part-b ids: only the 32 piece entries change (13 rope, 8 cherry, 3 marketCrossing, 2 each water/canalQuarter/boat, 1 canopy, 1 shopfronts) plus root groups (the 2 boat groups sit at the layout spot instead of the origin until the first update moves them; the 2 batch roots), batches, 5 update samples that hash batches; 0 materials added; lights unchanged.
- rooftop_test: 38 passed, 2 failed (baseline pair). footprint_golden EQUAL. check_syntax 174 OK, verify OK, labs_check OK, diff --check clean. cadJS `npm run check`: 16/16 passed (R67).
- `?qa=1&auto=1` advanceForReview(450) x2 with all 16 roofcanal ids swapped: stalls at s=1232.2124, same as classic and part a.

## L6 (docs/fable/status/r3b-canal-market/<frame>-<d|k|c>-<classic|modular>.jpg, 48 JPGs <= 74 KB, no pair byte-identical)
Frames: canal s280, banks s300, lines s672, bridge s499, cherry s352, canopy s520, stalls s530, boat s266. d = hour 0.5, k = hour 0.2, c = hour 0.8 with the cat in frame (the page's camera follows the cat; no free camera). Captures are not pixel repeatable; judged by eye. Opened: canal-d, boat-d, stalls-c, cherry-k (modular). AAA-1: parity with the classic pieces (same shapes and MAT), small hero extras (bank caps, wrap rings); not an upgrade. AAA-5: the canopy, stalls and cherry blossom read at cat view and in the dark. The water reads as classic. Boat: no boatman until r5 (expected, by brief).

## Concerns
1. Boat on swap has no boatman until r5 fills the attach nodes.
2. Water/foam ribbons sit in the kit group's static batch instead of the classic transparent group; looked the same in the pairs, flagged in handoff §4.
3. The 3 downtown ids are still classic.
