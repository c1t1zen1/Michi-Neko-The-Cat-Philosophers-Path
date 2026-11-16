# a1-village re-review r1 (fix round 1: 09166b9..75cdaa6, lane commits only; reviewer: Claude Opus 5.5)

**Verdict: NEEDS FIXES.** There is one new Important issue: the shishi "fix" works on a model of the game that is wrong, and the test that backs it passes only because it uses that same wrong model. Everything else is fixed or honestly recorded.

## Findings from r1

- **I1 (tests): fixed.**
  - `node --test tools/a1_village_test.mjs` gives `pass 6, fail 0`, and verify step 5 runs it.
  - I broke each behaviour myself in a scratch copy (`michi-wt/_scratch/a1-review/mut`), then restored it. All four mutations made the tests fail:

    | Mutation | Result |
    |---|---|
    | lampUpdate without its first-update guard | `fail 1` |
    | caustic bound set to f1² | `fail 1` |
    | runtime back to sequential imports | `fail 1` |
    | cloud jitter 0.7 → 0.7000001 | `fail 2` (oracle and frozen hash) |

  - After restoring, the suite passes 6/6.
  - `bakeReference` and its `mergeGeometries` import are out of src. The oracle lives in `tools/a1_village_browser_test.mjs`.
  - I did not run the browser test. It needs Playwright and five boots.
- **I2 (A.1 honesty): the frame list is fixed; the ranking is only partly fixed.**
  - The four missed rows are added at docs/fable/status/a1-village.md:96–99, each with "both" checked against a classic frame. The overclaim is gone, and the river attempt and its revert are recorded.
  - The ranked list is not re-ranked. The new visible breakers (18 bund, 19 river, 20 night range, 21 dusk joints) sit after "15. … no visible effect" and the 16–17 bookkeeping items (status :496–533). Move 18–21 up to around 2–4. This is minor.
- **Minors 1, 3, 4, 6, 10, 11: recorded honestly.**
  - Handoff §3.1 (egg material in `KIT_SHARED`), §3.2 (the R50 ruling on burble pacing), §3.3 (budgets.md §5), §3.4 (Appendix C).
  - Status issues 22–26.
- **Minor 5 (patches not proven unchanged on modular): fixed.**
  - The modular footprint digest at the head equals 80ddf98 except for the noren, which is intended.
  - The modular game_shot pairs give `maxDelta 0` (reported).
- **Minor 7 (crate posts): fixed** (src/kit/alley/index.js:55).
  - Posts are 0.047 wide, centred 0.0225 in, so they stand 1 mm proud of the slat faces and ends.
  - The tops stay 4 mm under the lid.
  - The hero battens enclose the post face, so no face is coplanar.
- **Minor 8 (noren hem): fixed** (src/kit/machiya/screens.js:131–137).
  - The back strip sits at z −0.004 with the same +z winding.
  - `km.cloth` defaults to DoubleSide (materials.js:320), the strip shares aSway with the cloth, and it uses the hem colour.
  - It shows from behind and stays hidden from the front.
- **Minor 9 (cells tie-break): covered** by the oracle test and the frozen hash on the game seeds.
- **Minor 2 (shishi double voice): not fixed, and the fix adds a regression.** See the Important finding below.

## R71: the in-lane patches §2a and §2b
- **They are applied verbatim from the handoff I cleared:**
  - src/kit/runtime.js:263–282 against handoff §2a;
  - src/bootstrap.js:44–72 against handoff §2b.
- **Still classic-neutral:**
  - §2a runs only after the `needsKit()` gate.
  - §2b fetches only when the set is `'modular'`: from the URL, or from saved settings with a saved quality of medium or high (key `catwalk_settings_v1` = settings.js:1).
  - The browser test reports that a classic default boot and a saved-low boot fetch nothing.
- **Still safe for the boot order:**
  - preload is still awaited before the world builds, and nothing is deferred.
  - A family that throws synchronously is caught by `Promise.resolve().then(load)`.
  - A materials rejection is held back (`.catch`) and rethrown at the `await`, so preload fails as before. The Node test covers this.

## R66 (open; does not block this merge)
- **The numbers are right.** In the status table (:1037–1042) the ratios recompute to 1.257/1.284 on medium and 1.417/1.397 on high, and the boot deltas to +327/+298/+461/+445 ms. "~30 ms more off medium, ~140 ms off high" is also correct.
- **Recorded honestly, but in the wrong place.** The numbers and the next levers are in the status file and the report.
- **budgets.md §2 was not updated.** It still shows only the G-V3 figures (1.72× / 1.74×) under its open item.
- **Handoff §2c was not updated either.** It still lists only KitMaterials, the summit after the first frame, and the first frame. Two of the new levers named in the status file are missing:
  - the ground's layer tiles and pack loop (~55 ms);
  - the hero leaf sprays (~50 ms on high).
- **Severity: minor.** The fix is to add the re-measure line to budgets.md §2 (or ask the Integrator to, if baseline/ is theirs) and the two levers to §2c.

## New issues
- **Important: the shishi clack rule fixes the wrong case and breaks the right one.**
  - **Where:** src/kit/garden/build.js:134/142, tested by tools/a1_village_browser_test.mjs:141.
  - **What I checked:** countryside.js:5068–5086 shows a cat bat adds `0.7 × clackerBoost` (decaying at 0.9/s) on top of the natural cycle (peak 0.83). I simulated that drive into the new edge logic (`_scratch/a1-review/shishi_sim.mjs`).

    | Bat at cycle | What happens | Result |
    |---|---|---|
    | 0.3 | The bat's own clack comes 1.07 s later with a peak ≤ 0.78 | Still voiced on top of the game's splash and bell: the double voice remains |
    | 3, 4, 5 | Peak > 0.9, so the next natural clack, 8.0 / 5.5 / 3.0 s later, is silenced | A natural clack is lost: a regression |

  - **Why the test passes:** it drives a synthetic sine swing to 1.4 rad that the game never makes.
  - **Fix:**
    - Treat a one-frame tilt jump as the bat. The bat adds about +0.7 in a single frame; the natural rise is at most about 0.006 per frame.
    - Suppress only a clack within about 1.5 s of that jump.
    - Drive the test with the game's actual cycle plus boost.
    - Or revert this hunk and keep the minor recorded.
- **Minor: verify.mjs scope.**
  - **Where:** tools/verify.mjs:184–190.
  - **What:** this is a shared tool, not a lane test, and R71 granted only runtime.js and bootstrap.js. The change is additive (tightening). The Integrator should acknowledge it. A failing run is also counted twice (the catch and the `fail 0` regex), which is cosmetic.
- **Nothing else broken.**
  - `causticPixels` and `causticSites` are pure and load in Node.
  - culm.js no longer imports three/addons.
  - The reported checks are green: goldens EQUAL; classic and modular `maxDelta 0` against 80ddf98; boots error-free.
