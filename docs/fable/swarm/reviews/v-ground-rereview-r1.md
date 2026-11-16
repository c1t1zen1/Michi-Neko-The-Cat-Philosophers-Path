# v-ground re-review r1 (fix round 1: 0264040..a03d256)

**Verdict: APPROVED.** No new Critical or Important issues.

**Scope:**
- `reviews/v-ground-r2.diff`: budgets.js, road.js, the new `tools/ground_wear_test.mjs`, handoff and status.
- The report's "Fix round 1" section.

## Findings from r1

### I1 (R54 evidence) — FIXED
- **Where:** `src/kit/budgets.js:125-126`.
- **Caps:**
  - mid `buildMs` is gone, so the default 3 ms applies. Every mid reading was 1.5-1.9 ms.
  - far is now 2 ms (it was 4).
- **Is the evidence enough under R54?** Yes, it meets the rule as written.
  - Far exceeded the 1.5 ms default twice at 1-min load 1.55 → 1.51: 1.7 and 1.6 ms. Both are below load 3, and the loads are recorded.
  - It exceeded the default once more at load ~2.9 (1.6 ms).
  - 2 ms is the smallest allowance that covers those readings, about 18% headroom over 1.7 ms. That is a measured need, not a loosening driven by machine load.
  - Keeping it until G-V3 is reasonable. Going back to the default would just reproduce the 1.6-1.7 ms failure.
- **Is the `why` honest?** Yes.
  - Every number now carries its load: 1.5-1.6 and 2.7-3.0 for the warm builds; 2.7 and 2.6 for the 197 ms and 165 ms first builds.
  - The unsupported "quiet machine" claims are gone.
  - It names the G-V3 re-measure.
  - No other cap changed: the hunk touches only the `valley-ground` entry.

### Minor 1 (road-edge style flips) — FIXED
- **Where:** `src/kit/ground/road.js` `paintRoad`.
- **Change:** `style` is now written for every texel of the road frame (4.8 m reach, gap texels included) before the weight test. The bilinear `int(F.a*8.)` lookup can no longer step 2 → 1 → 0 where paving weight is non-zero.
- **What it can affect:** style is read only where `w[7] > .004`, and POM only where `w[7] > .25`, so the change is confined to the fringe.
- **Classic is untouched.** `road.js` is reachable only from kit builds, and I re-ran the goldens in the worktree:
  - `node tools/footprint_golden.mjs` → `footprint golden: EQUAL` (byte-identical to `tools/golden/valley_classic.json`; 518 colliders; rng valley 49233)
  - `node tools/footprint_golden.mjs --systems` → `footprint golden: EQUAL`
- So the maxDelta 132 is modular-only, as the report says.

### Minor 7 (stale docs) — FIXED
- Handoff §2 now has the final entry and load-recorded numbers.
- Handoff §9 now says `labs_coverage --write` is needed at merge.
- The status no longer asks the Integrator to apply §1.
- The `road.js` header and the status now give the true ribbon heights: 0.02 / 0.012 against classic 0.03 / 0.018. I verified classic 0.018 in `countryside.js` `meshPathShouldersClassic`. The reason the lower heights stay (AAA-2's 2 cm bearing epsilon) is recorded.
- Nit: the test header says "About 20 s on Metal"; it measured 12.6 s. Not worth a round.

### Minor 8 (in-repo wear regression test) — FIXED
- **I ran it:** `node tools/ground_wear_test.mjs` at load 1.75 → `ground wear: 14 passed, 0 failed` in 12.6 s.
- **It is deterministic.** My numbers are identical to the report's:
  - wear 0.694
  - meadow r 255 → 0
  - 18 texels changed, 0 away from the lines
  - lawn wear 0.737, g 255 → 255
  - heals with 0 bytes different; mask hash `785d5d95:262144` on both boots
- **Why the result repeats:**
  - Both boots use `?shot=1` (seeded), so they bake the same mask.
  - The modular phase runs in one synchronous `page.evaluate`, so the game loop cannot interleave.
  - `heal()` (T = 60 s × 400 s, which falls below the 0.002 snap) clears any wear the villagers left before measuring.
  - Stray villager steps inside the evaluate add at most ~0.03 wear, well under the 0.18 thinning threshold.
- **It can fail; every check is a real assertion and the script exits 1:**
  - If main.js stops binding, "paws wear the meadow" fails, because `wearUpdate` only runs when `state.world` is set and the test never calls `bindWorld`.
  - If the lawn skip (`r0 === 0`) breaks, "lawn stays" fails, and so does the 0-lawn-texels count.
  - If the heal pass stops restoring the baked mask, the 0-bytes-differ check fails.
  - If a classic code path starts writing the mask, the classic hash check fails.
- **Limit:** the test drives `inst.update()` directly rather than the runtime's per-frame `assets.update`. That is acceptable; the boot checks cover the runtime path.

### Minors 2-6 and 9 — NOT FIXED (deferred, by agreement)
- These go to a1-village as the r1 review directed. None blocks the lane.

## New issues introduced by the fix
- None. The fix diff has no hot-file change beyond the granted `budgets.js` entry, and the new tool file was granted.
