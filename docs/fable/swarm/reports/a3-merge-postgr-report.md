# a3 merge + post-G-R batch — report (2026-11-16)

Worktree /Users/c1t1zen/Documents/GitHub/michi-wt/integration, branch fable/integration, base ef6adad (= origin/main, untouched).
Final head 9c7f490, pushed (never forced). Scratch: /Users/c1t1zen/Documents/GitHub/michi-wt/_scratch/a3-merge/ (capture scripts, PNGs, JSON).
No timing verdicts taken (b1-build-budget measuring; R86/R87). Nothing staged under dawCAT/ or cadJS/. The main checkout was not touched.

## Job A — merge a3-rooftops (PR #55)

Commits
- 6f396e4 `Merge a3-rooftops: Roof Road area pass, far-tier distant city, bicycle, crate slats (PR #55)`: `--no-ff`, clean, no conflicts
  (the lane was based on ef6adad).
- 86c721b `a3-rooftops handoff: board row ticked, timing rows to the solo window`: §6 Phase 7 row `a3-rooftops` [x]. New §6 block
  "Board notes (a3-rooftops merge)": the timing rows wait for the solo window (distant-city far buildMs 6 PROVISIONAL; machiya hero 15
  re-read with the bicycle; hayashi 10/5/2.5 re-read); G-A NOT ticked (R86); reviewer minors carried (city part name and far instance count
  unasserted; R52 s=350 noise, re-measure solo).

Handoff: the only patch was runview.js (taken up in job C). There are no inventory rows, registry entries or adapter ids; build.js band
stays 'far' (no patch). `node tools/kit_index.mjs` reported unchanged (28 families).

Checks (after the merge)
- check_syntax 192 OK · verify "All checks passed" · kit_check 534 · labs_check OK · `git diff --check ef6adad..HEAD` clean
- labs_coverage_test 18/0 · kit_test 37/0 · fable_swap_matrix OK (250 rows)
- rooftop golden classic EQUAL (byte-identical) · `--query assets=modular` routing ok 41/41 (DIFFERENT as expected: 47 kit ids)
- rooftop_test 40 passed 0 failed · companion 7 · alley PASS · rooftop_manager_test 81/0 · footprint golden EQUAL
- contract rooffestival 697 checks 0 failed, roofstreets 837 checks 0 failed (one run each; not a timing verdict)
- `cd cadJS && npm run check` 15/15 + 16/16 · `cd catalog && npm test` 50/50
PR #55: GitHub marked it MERGED automatically after the push (merge commit 6f396e4); no close needed.

## Job B — pocket reduce-motion, live

Commit 45c0b54 `Roof Road pocket: reduce motion reaches the kept pocket live`
- src/rooftops/pocket.js: `setReduceMotion(on)` updates everything the run reads per frame. That covers the RunView `reduceMotion`
  (camera easing), `Sky.reduceMotion` (cloud drift and sun flicker), `RooftopAtmosphere.reduceMotion` and its `impacts` (clock, bursts),
  and the petals' visibility (re-derived through `setLowPower(lowPower)`). It also covers buildWorld's opts, now kept as
  `this._worldOpts`, because build.js reads `opts.reduceMotion` every frame for the street people. `attach()` resyncs from
  `g.reducedMotion` on every entry (this covers a change made while the pocket was building). Build-time only, kept as built and said so
  in the comment: build.js `motionScale` (the float's tassel and musician sway).
- src/main.js `applyComfort()`: one guarded line,
  `if (this.rooftops && this.rooftops.pocket && this.rooftops.pocket.setReduceMotion) this.rooftops.pocket.setReduceMotion(reduced);`
  (main.js uses no optional chaining).
- New tools/rooftop_pocket_test.mjs. It boots the real game headlessly (autostart new), runs `setUnlocked` + `enter()`, and drives the real
  pocket. Covered: built with reduce motion off; turned on in the pocket; turned off while away; back in (same kept pocket); a value set
  without applyComfort taken on entry; applyComfort turns it off again. Every flag is checked, plus the atmosphere clock ratio
  (0.22 × / 1 ×). A Node test was not possible: pocket.js imports three addons and cat.js, which the repo's three stub cannot load.
- labs/ASSET_COVERAGE.md regenerated (main.js line anchors moved by 2).
Checks: the pocket test FAILED 7/12 on the old code, then passed 12/0 on classic and modular. footprint golden EQUAL, `--systems` EQUAL,
rooftop golden classic EQUAL (routing 41/41), manager 81/0, rooftop_test 40/0, companion 7. Classic `game_shot` boot clean (errors only
the optional /cad-overrides.json 404, as at G-R). check_syntax 192, verify, labs_check, kit_check 534.

## Job C — finale framing

Commit 9c7f490 `Roof Road finale: frame Michi and Chidori both (a3 handoff, adjusted)`. Applied as an ADJUSTED patch.
- **The a3 patch as proposed is wrong (measured).** Chidori always ends 1.3–3.6 m ahead of Michi (+z) on the ridge below the perch.
  Taking the same world offset from the pair's midpoint pushed Michi to NDC −0.85 (`?finale=1`) and −0.96 (autopilot), its box past the
  left edge. The 0.4 m lower camera also skimmed the float's deck, which hid Chidori, and a roof covered the fifth fire
  (finale-patch-as-proposed.jpg). Moving the camera sideways (bearing-frame offsets) walks it into the shingi pole and deck.
- Applied in RunView.updateCamera (finale branch), keeping the camera slot:
  - camera +1.1 m instead of +0.7 (Michi whole over the near ridge);
  - look point 25 m lower (fires' centroid −45);
  - a turn half-way toward the pair's midpoint as the finale settles (`k`). The turn uses Michi alone past about 6 m, is capped at 13°,
    and is clamped so every fire centre stays within 0.85 of the half-width; a narrow portrait screen turns less.
  - `this.tmpP` added in the constructor.
- Measured at t = 12 s, NDC, 1280×720: Michi −0.64 (box left −0.79, half-hidden) → −0.40 (−0.53, whole); Chidori −0.17 → 0.03; fires
  −0.47…0.50 → −0.26…0.75. The numbers are identical for the sandbox `?finale=1` (classic and modular) and the game pocket (classic and
  modular). Autopilot arrival: Michi → −0.47, Chidori → 0.24. Portrait 600×900: Michi −0.71 → −0.45. 1440×900 / 844×390 improved;
  fires max 0.84.
- Not fixed, recorded: on 360/390-wide phones Michi was already outside the frame before (−1.03) and still is (−0.99), because the clamp
  keeps the fires. This is a layout question for the operator.
- By eye: clearly better on both pages. Michi sits whole on the left third (was half-hidden at the left edge), Chidori lower centre;
  all five fires and the moon in view; no pole. Reduce motion on/off settles to the same frame; the transition at t 2–6 s is smooth.
- Console: errors [] warnings [] on every capture (sandbox and game, classic and modular, reduce motion on and off).
- Guard: tools/rooftop_pocket_test.mjs gains a "Finale framing" section. At 1280×720 both cat boxes must sit within |x| ≤ 0.75 and
  the fires within 0.9; at 360×780 the fires must fit within 0.95. It FAILS on the shipped camera (Michi box −0.791) and FAILS without the
  fire clamp (a fire at x 1.21). Result: 17/0 on classic and modular.
- Checks: rooftop_test 40/0 · companion 7 (the autopilot reaches the finale) · alley PASS · manager 81/0 · rooftop golden classic EQUAL +
  modular routing 41/41 · footprint EQUAL · check_syntax 192 · verify · labs_check · labs_coverage OK · kit_check 534.
- Evidence: 15 JPGs (43–75 KB) in docs/fable/status/a3-rooftops/finale-*.jpg. Before/after pairs for sandbox classic and modular,
  sandbox autopilot, sandbox portrait, and pocket classic and modular; after-only for sandbox and pocket reduce motion; plus
  patch-as-proposed. Full write-up in docs/fable/handoff/a3-rooftops.md ("Integrator: tested, adjusted, applied").
- §6 note: this is an Integrator change to the operator's camera that the operator may overturn (one revert); it affects the sandbox and
  the game pocket alike.

## Open for the Integrator
- G-A still open: the solo timing window (R86/R87) for distant-city far buildMs 6, machiya hero 15 (+ the bicycle), hayashi, and
  R52 at s=350.
- The operator's tools/rooftop_browser_test.mjs still stops at its residents assert (30 vs 40), before its finale checks, so its
  fires-fit assertion was reproduced in the pocket test instead.
- Narrow-portrait finale (Michi outside the frame since before this change): an operator decision.

PR #55: MERGED (6f396e4). Final `git rev-parse --short HEAD`: 9c7f490.
