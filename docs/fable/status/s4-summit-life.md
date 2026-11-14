# s4-summit-life

- Worker / model: Worker B, Claude Sonnet 5.5
- Claimed:            2026-11-14
- Branch:             fable/s4-summit-life
- Base commit:        49c09bc
- State:              ready for review

## Assets
| Inventory id | Promoted from (lab/specimen) | Parts | Tiers | Footprint | State |
|---|---|---|---|---|---|
| summit-snow | summit/life-snow (weather kit sprite cloud) | flakes | h/m/f | as classic | built |
| summit-rain | summit/life-rain (weather kit rain streaks) | drops | h/m/f | as classic | built |
| summit-pollen | summit/life-pollen | pollen | h/m/f | as classic | built |
| summit-petals | summit/life-petals | petals | h/m/f | as classic | built |
| summit-butterflies | summit/life-butterflies (critters kit butterflies) | swarm (visit flag), flock | h/m/f | as classic | built |
| summit-birds | summit/life-birds | bird_1..4, bird_N_wing_l/r | h/m/f | waiver: anchors.summitBirds | built |
| shrine-rays | summit/life-rays | beacon | h/m/f | waiver: anchors._rays | built |
| summit-light | summit/life-light | sky_fill, warm_fill | h/m/f | as classic | built |
| summit-wildlife | umbrella row | - | - | - | deferred (classic builds nothing of its own) |

## Steps
- [x] L1 Claim
- [x] L2 Read
- [x] L3 Choose
- [x] L4 Close gaps
- [x] L5 Promote
- [x] L6 Compare
- [x] L7 Check
- [x] L8 Self-review (AAA-1 … AAA-10 per asset)
- [x] L9 Handoff
- [x] L10 PR

## Checks run (command → real result)
- `node tools/kit_check.mjs` -> All kit checks OK (306 passed)
- `node tools/kit_contract_test.mjs --family summitlife` -> 8 assets, 24 asset×tier builds, 656 checks, 0 failed; merge OK; self-test OK
- `node tools/footprint_golden.mjs` -> EQUAL; with `--query "?swap=<my 8 ids>:modular"` -> EQUAL. (`?assets=modular&swap=...` is DIFFERENT 54/559/346 on this branch and identically on the base, from other families, not these ids.)
- `node tools/summit_test.mjs` -> 83 passed, 0 failed
- `node tools/summit_golden.mjs` -> EQUAL; routing ok: 32 summit ids, all modular 34/34, single swaps 32/32; drive: 0 throws
- `node tools/check_syntax.mjs` -> All 130 modules OK; `node tools/verify.mjs` -> All checks passed; `node tools/labs_check.mjs` -> All labs checks OK; `git diff --check fable/integration...HEAD` -> clean
- Full game `index.html?assets=modular` (autostart new): boots, summit scoped view `set modular`, 8 summit-life instances, `summary().problems` empty, no console errors.
- Summit preview with a patched `game.assets` (scratch script outside the repo): classic vs modular, no console errors; draw calls equal (233 clear / 235 rain / 234 snow, high and medium).
- Reduce motion (body.reduce-motion) 60 steps: petals drift 0.045 vs 0.227 (0.2x), snow fall damped to 0.3x.
- Weather on entry: rain opacity at 300 ms: kit 0.62 (the target), classic 0.32 (still ramping).

## L6 compare (docs/fable/status/s4-summit-life/*.jpg, 960x600, classic vs modular, summit preview)
- meditation-{6,12,18,22}-{classic,modular}: the four-time meditation-seat pairs for summit-light and everything else. Sky, exposure, grass and city read identical; the 6/12/18/22 mean pixel delta (1.6 / 13.6 / 11.9 / 3.9) is wind in the grass and clouds between two real-time frames, not light. Modular adds visible butterflies in the pair frames.
- birds-12, birds-close, butterflies-12, petals-pollen-15, rays-18 (rays framed from valley coordinates; the preview has no valley).
- rain-12 and snow-12 pairs (meditation framing; the preview's snow reads as a sparse fall in both sets).

## AAA self-review (honest)
- AAA-1 (not worse than classic): rain better (streaks with depth vs faint points), butterflies better (real wings), birds equal-to-better (palette-painted, faceted classic gone), rays softer and streaked; snow, pollen, petals and light equal. Butterflies read a little bright at night (thin-wing emissive, as in the valley critters); not changed.
- AAA-2/3/7/8/9: contract test, 0 failed. AAA-5 (no popping): butterfly visits fade by scale, first-frame snap on weather. AAA-4 tiers: all three resolve; the summit builds near-band layouts only.
- Not done: the Summit Lab tiles are self-contained studies (not byte-for-byte the kit builders); no fly-by bird motion change (the facade owns it).

## Deferred assets and why
- `summit-wildlife`: umbrella row; the classic step is `() => null`. Its butterflies and birds are promoted as their own ids.

## Footprint waivers requested
- `summit-birds`: `anchors.summitBirds` (the four bird records the facade flies).
- `shrine-rays`: `anchors._rays` (the pulse list).

## Notes for the Integrator
See `docs/fable/handoff/s4-summit-life.md`. This PR also carries two `BUDGET_EXCEPTIONS` entries in `src/kit/budgets.js` (precedent: v-weather) and the regenerated `src/kit/index.js`. About 1,100 changed lines plus 8 compare JPGs; under the ten-asset sizing.
