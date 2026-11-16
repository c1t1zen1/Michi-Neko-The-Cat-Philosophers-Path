# Re-review r1: r6-game-wiring fix round 1 (lane commits after 08c9d6e)

Reviewer: Claude Opus 5.5. Read-only. Scope: the fix diff (`r6-game-wiring-r2.diff`) and the report's "Fix round 1" section. Scratch work is in `/Users/c1t1zen/Documents/GitHub/michi-wt/_scratch/r6-review/r2/` and `../loop_probe2.mjs`.

**Verdict: APPROVED.** All three Important findings are fixed. No new Critical or Important issue.

## Important findings from r1

### I1 soft-lock at the gate — FIXED

The fix is in `src/rooftops/manager.js`:
- A failed build calls `placeOnBridge()` while the veil is still down (`enter()`, the `else` branch).
- The gate only arms once the cat has been seen outside it (`_gateArmed`, set in `update()`). `saveSpot()` returns the return spot whenever the cat is on the roofs, behind either veil, or standing in the gate.
- `main.js` saves through `saveSpot()`.

What I ran:
- `node tools/rooftop_manager_test.mjs`: 81 passed, 0 failed. The output is clean apart from section headers; the failed-build stack is now captured and asserted.
- My r1 harness, re-run against the fixed manager (`loop_probe2.mjs`): an always-failing loader, the cat walks into the gap once, then never moves for 20 s.

| What it measured | Result |
|---|---|
| Enter attempts | 1 (logged error: 1) |
| Frames with control | 1089 of 1200 (only the single veil is locked) |
| Where the cat ends | the return spot (−1, 0.87, 35.2), outside the gate |
| Saves inside the gate | 0 |
| After walking out and back in | exactly one more attempt (total 2); cat back on the bridge, controls on, still 0 saves in the gate |

### I2 duplicated run logic — FIXED (per ruling R80)

**The duplication is gone from the pocket.**
- `src/rooftops/pocket.js` is now 399 lines of game glue: scene, attach/detach, hooks, sfx, the way home, lantern, camera copy, render.
- It has no camera, Chidori, step-off, pickup, progress, finale or physics-step code. It imports `RunView` through `src/rooftops/runview.js`, a pure re-export.
- verify checks that none of those methods come back.
- The tiny `makeShoki` copy in valley.js is the snapshot I suggested in r1 Minor 5. I accept it.

**The game.js patch applies cleanly.** I exported `origin/fable/integration` (4ed6943) `rooftops/` into scratch:
- `git apply --check -v docs/fable/handoff/r6-game-wiring.game-js.patch`: "Checking patch rooftops/js/game.js..." with exit 0.
- After applying, game.js has 777 lines, passes `node --check`, imports `RunView`, and delegates `startAt`, `jumpToMouth`, `respawn`, `updateCamera`, `frame`, `restart` and `skipFinale`.
- No `mouths[6]` remains in the patched game.js. The view itself still reads `level.mouths[6]` (build.js float cull, `checkpoints[6]`), which the lane lists in handoff §4.

**The parity claim is credible.** I compared the lane's own `parity-*.json` (1017 samples each) myself:

| Comparison | Result |
|---|---|
| base vs patched with `finaleMouth = mouths[6]` | 1017/1017 rows identical; same digest 302c3f06, card, count, strip and fires |
| base vs patched as shipped | 977/1017 identical. The first difference is at sample 614 (s = 1023.94), and only in columns 2–7 (camera position and focus); cat and Chidori columns are identical throughout. Card: "Okuribi" vs "Nijō-jō". |

- `buildLevel()` puts mouth 13's s0 at 1029 and mouth 7's at 1080, which matches the claimed rise from s ≈ 1023.
- One wording nit: the on-disk determinism baseline (`parity-base2.json`) is a shorter 800-sample run, all 800 identical to `parity-base.json`. The report's "1017/1017 unpatched vs unpatched" overstates what is on disk; the m6 match is the stronger evidence anyway.

**The finale mouth comes from data.** `finaleMouth(level)` returns `level.finaleMouth`, or else the level's last mouth (`rooftops/js/runview.js:65-67`). It feeds both `startFinale` and the camera's `vertical` term (`:518`). verify forbids any `mouths[N]` index in runview.js.

### I3 controls and way-home hint — FIXED

**The hint is soft and dismissable.** `manager.js` `showControlsHint()` runs on each successful arrival until the run is finished.
- It is a `toast-item roof-hint` in `#toast-stack`: pointerdown dismisses it, and it auto-dismisses after 9 s.
- It uses the touch wording when `controls.isMobile` (which exists in `controls.js:22`).

**It respects large text and contrast.**
- High contrast: the existing `body.high-contrast #toast-stack > *` rule applies to it.
- Large text: `body.large-text #toast-stack .roof-hint { font-size: 16px; }` is added in `index.html:507`.
- My drill capture shows it under the mouth toast as one quiet line.

**"Leave the Roof Road" runs the normal exit.** `#btn-leave-roofs` is shown only in `rooftop-mode`. Its handler in `main.js` checks `active && !transitioning`, then calls `menu.resume()` and `rooftops.exit()`, the normal veil exit. The drill covers it: hidden in the valley, present on the roofs, takes the cat home. My pause capture shows it.

## Minors from r1

| # | Issue | Status |
|---|---|---|
| 1 | quit-to-title race | Fixed: generation token in enter, exit and `exitImmediate`; 2 tests |
| 2 | per-frame music `setScene` | Fixed: once, in `setActive(true)`; verify asserts `updateRooftops` has none |
| 3 | Shōki count | Fixed: test against `buildLevel()` pickups; `setShokiMask`; ids past the mask are journaled without a bit |
| 4 | gate zone | Fixed: x −0.75…1.0, with test points on the ramp axis |
| 5 | operator dependency | Fixed: local `makeShoki`; footprint still EQUAL |
| 6 | comment | Fixed. Cosmetic: one comment line in `valley.js` buildSevenPosts is now an overlong merged line |
| 7 | test noise | Fixed |
| 8 | strip, map, ambience | Not fixed: recorded follow-up. The seventh cap is fixed (all ring warm, then settle) |
| 9 | crest bamboo height | Not fixed: deferred so the golden stays EQUAL. Accepted as a visual follow-up |
| 10 | memory, FOV | FOV fixed (returns the player's current FOV). The pocket is still never disposed: follow-up |

## Nothing new broken

- **Goldens.** `tools/golden/valley_classic.json` and `systems_classic.json` are byte-unchanged since 08c9d6e. Only `rooftop_classic.json` changed, from the R78 merge.
  - `node tools/footprint_golden.mjs`: EQUAL (332 objects, 521 colliders, valley 49233 draws, probe ok).
  - `--systems`: EQUAL (vegetation 249867).
- **Tests.**
  - `node tools/verify.mjs`: All checks passed (190 modules, 10 src/rooftops, summit_test 83/0, rooftop_manager_test 81/0, kit 523).
  - `node tools/rooftop_test.mjs`: 40 passed, 0 failed (on the R78 route).
- **labs_check.** `node tools/labs_check.mjs` fails on exactly one check, "FAIL unclassified Roof Road module: rooftops/js/runview.js"; there are no other FAIL, WARN or ERROR lines. In a scratch export with the handoff §5.1 `sourceFiles` entry inserted after companion.js, plus `labs_coverage --write`, it reports "All labs checks OK".
- **Drill.** I re-ran the lane's `drill.mjs` against the worktree into my scratch, classic set: 24/24 PASS in 87 s. Warnings: none. The only error is the drill's own simulated "no network" build failure. Covered:
  - failed build back on the bridge, save at z 35.2
  - hint on arrival
  - save on the roofs writes the ramp
  - Shōki mask bit
  - finale, lantern home, re-entry
  - walk home, with the gate not re-firing
  - pause-menu leave
  - flags restored after reload
- **Old save.** Not re-run headless. By code, `loadGame` still guards every new key: truthy checks, plus `Number.isFinite` before `setShokiMask`. Old saves have no required key.
