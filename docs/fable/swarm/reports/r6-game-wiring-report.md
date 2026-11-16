# Report: r6-game-wiring (Phase 5, the Roof Road in the game)

Worker: Claude Opus 5.5. Worktree `/Users/c1t1zen/Documents/GitHub/michi-wt/r6-game-wiring`,
branch `fable/r6-game-wiring`, base a63ff9e, `origin/fable/integration` 6016e11 (r3b, r4b-festival)
merged in at 9b6d648 as asked. Status: DONE_WITH_CONCERNS (the concerns are listed at the end; none
blocks the lane's own gate).

## What was built (R6.1–R6.8)

- **R6.1 Seven Posts** (`src/rooftops/valley.js` `buildSevenPosts`, called in
  `Countryside.buildRiverAndBridge()` after the river/bridge asset): fourteen bronze giboshi (the
  seven east ones a material each, glowable through `Countryside.setSevenPostGlow(i, v)`), the Roof
  Road's clay Shōki on the east railing's south end looking north along it. Own materials (never
  merged), no collider, no rng; on both asset sets.
- **R6.2 Odoi** (`buildOdoiThicket`, at the end of the Countryside build): bank x -11…9 z 37.5…39.9,
  stone faces, bamboo crest, the closed thicket in the gap, behind it a gate with an indigo 洛 noren
  and two lanterns. `mulberry32(0x0D01)`. +3 colliders, +1 exclusion (appended).
  `Countryside.setOdoiThicketOpen(t)` parts it like the shrine thicket (gap collider dropped once).
  The gap sits at x -0.45…1.15, between two edge-forest trunks (the ramp's axis x = -1 had a trunk
  right behind it).
- **R6.3** `src/rooftops/manager.js` `RooftopManager` (pure; `setUnlocked`, `enter`, `exit`,
  `exitImmediate`, `setActive`, `update`, `render`, `setQuality`; origin (0, -2400, 0)) and
  `src/rooftops/pocket.js` `RooftopPocket`: the run as its own scene, built on the first enter via a
  dynamic import (nothing of the run loads in the valley; checked in the drill), kept afterwards.
  Ported from `rooftops/js/game.js` (tick, camera search, Chidori, pickups, checkpoints, finale)
  onto a local camera copied to the game camera; Michi is the game's `player.mesh`; input from the
  game's `Controls`; renders with the game renderer, no valley post chain, its own exposure.
  The runtime is created/preloaded before `Sky`, and passed to `Sky` and `RooftopAtmosphere`
  (Integrator note on r4b). Ways home: walk back off the route's start (armed after 6 m), or follow
  the paper lantern after the finale. No fail states: falls land in the street; R returns to the last
  lantern; a runner below -6 m is put back.
- **R6.4** five re-exports `src/rooftops/{rail,level,physics,reach,autopilot}.js` →
  `rooftops/js/` (R57; untagged: one module instance).
- **R6.5** `worldFlags.rooftopsUnlocked`, `rooftopShoki` (7-bit: seven Shōki as built, so no
  widening), `rooftopFinished`; a save on the roofs writes the top of the south ramp
  (-1, 0.87, 35.2) facing north; old saves load unchanged.
- **R6.6** unlock: toast, journal `places/odoi-gate`, XP 60, `playBell`, swell; each post a
  pentatonic bell note; Shōki: `keepsakes/roof-shoki-<id>`, XP 10; finale: `quietMoments/
  roof-road-okuribi`, XP 75 once; `music.setScene('Rooftops')`.
- **R6.7** `#rooftop-transition` noren veil (sibling of `#summit-transition`, untouched) and
  `body.rooftop-mode`; CRLF regions kept CRLF.
- **R6.8** `tools/rooftop_manager_test.mjs` (59 checks against the real manager/posts) and verify.mjs:
  src/rooftops syntax, 27 Roof Road wiring checks, the manager test, veil markup checks.
- AGENTS.md Roof Road row; `labs/ASSET_COVERAGE.md` regenerated.

## Checks (real output, final pass 17:45–17:52 PST, load ≈ 2.4–3.4, Metal)

```
node tools/check_syntax.mjs            All 189 modules OK
node tools/verify.mjs                  All checks passed (summit_test 83 passed, 0 failed; rooftop_manager_test 59 passed, 0 failed;
                                       All 9 Roof Road game modules OK (src/rooftops/); kit 517; kit_test 36/36; a1_village_test 6/6)
node tools/kit_check.mjs               All kit checks OK (517 passed)
node --test tools/kit_test.mjs         tests 36, pass 36, fail 0
node tools/cad_overrides_test.mjs      27 passed, 0 failed
node tools/labs_check.mjs              All labs checks OK   (labs_coverage_test: pass 17, fail 0)
git -c core.whitespace=cr-at-eol diff --check origin/fable/integration...HEAD   clean
   (plain --check: 55 "trailing whitespace" hits, all index.html CRLF endings, as earlier tag bumps show)
node tools/rooftop_test.mjs            38 passed, 2 failed — the baseline: "every piece sits on one straight leg"
                                       (tsuiji@1044.2, crate@1164.4 …), "autopilot reaches the perch" (stopped after drama
                                       school ridge@1221.6 (route 226/342), s=1232.17 y=4.50)
node tools/rooftop_companion_test.mjs  AssertionError: player reaches finale (baseline)
node tools/rooftop_golden.mjs          rooftop golden: EQUAL (rooftops/ untouched: git diff origin/fable/integration -- rooftops is empty)
node tools/footprint_golden.mjs        before --write: DIFFERENT (5 changed, 26 added, 0 removed); rng valley 49233 draws (probe ok),
                                       hidden 7810, Math.random 92; +colliders[479..481], +exclusions[2], +20 objects (Seven Posts/*,
                                       Odoi Bank/*), +2 aggregates; changed = 5 counts. After --write (3ff1ee0): EQUAL
node tools/footprint_golden.mjs --systems   before: only vegetation.mask.texture + the exclusion; vegetation 249867 draws (probe ok).
                                       Scratch proof: 167 of 65536 mask texels differ, all in x -11.78…10.97, z 35.34…41.84. After: EQUAL
node tools/summit_golden.mjs           summit golden: EQUAL (summit 51267 draws, probe ok)
node tools/summit_kit_parity.mjs       summit kit parity: EQUAL
node tools/cat_golden.mjs              cat golden: EQUAL
headless boot /index.html?assets=classic | modular (autostart, frame 244)
                                       errors: only "/cad-overrides.json 404" (pre-existing, also on the base); warnings: none
scratch drill.mjs (unlock → enter → run → Shōki → finale → home → re-enter → walk home → save → reload), per set:
                                       [classic] summary {"pass":20,"fail":[]}  errors [] warnings []
                                       [modular] summary {"pass":20,"fail":[]}  errors [] warnings []
save from main 08bd3b5 (exported tree, saved headlessly) loaded in the lane, both sets:
                                       {"pos":[6,0,4],"score":3,"place":["old-place"],"unlocked":false,"shoki":0,"finished":false,"odoi":0}
classic game_shot pairs, lane vs 6016e11: shrine maxDelta 0 · village 132 (4119 px > 8: the Odoi's bamboo tops above the forest)
                                       · bridge 210 (giboshi, Shōki, Odoi bank/bamboo, east caps' shadows) · wide 66 (94 px: the bank's east end)
```

Scratch (outside the repo): `/Users/c1t1zen/Documents/GitHub/michi-wt/_scratch/r6-game-wiring/`
(drill.mjs + logs, mask.html, the pairs and diffs). Captures in the branch:
`docs/fable/status/r6-game-wiring/*.jpg` (posts glowing, Odoi closed/open, arrival classic/modular,
mouth 2, finale, back on the bridge).

## Files changed (28; +2671 −99 vs integration)
src/main.js, src/countryside.js, index.html, src/rooftops/{manager,pocket,posts,valley,rail,level,
physics,reach,autopilot}.js (new), tools/rooftop_manager_test.mjs (new), tools/verify.mjs,
tools/golden/{valley,systems}_classic.json, AGENTS.md, labs/ASSET_COVERAGE.md,
docs/fable/status/r6-game-wiring.md (+ jpgs), docs/fable/handoff/r6-game-wiring.md.

## Assets promoted/deferred
No kit family (wiring lane). New classic-only valley props (Seven Posts, Odoi) are not inventoried:
handoff 2.2 gives two rows and the labs_coverage scan for src/rooftops/ (labs_check passes today only
because src/rooftops/ is not scanned — said plainly so it is not mistaken for coverage).

## Footprint waivers
None requested; goldens rewritten for additions only, proof above.

## Self-review against the lane's acceptance list
- Classic valley safety: no `this.random()` added/removed/reordered (rng 49233 probe ok); new
  colliders appended; mask change confined to the Odoi; pairs differ only by new objects. ✔
- Summit doesn't notice: summit golden + parity EQUAL, summit_test 83/0, `#summit-transition` untouched. ✔
- Cat golden EQUAL. ✔  Rooftop: no new failure (38/2, same names/details; companion same); golden EQUAL. ✔
- Saves: three flags; never a pocket position; 08bd3b5 save loads. ✔
- No fail states, no timers: walk resets quietly; sky by progress; falls land on the street. ✔
- R57: nothing moved; re-exports only. ✔  Hot files limited to the granted list. ✔

## Open concerns
1. G-R's play-through to the finale is open: the autopilot stalls at s≈1232 on the stage-2 route (operator).
   The drill reaches the finale by placing the cat on the perch.
2. Ported from the page, not shared: the pocket repeats game.js's frame loop/camera (game.js has
   top-level side effects and cannot be imported). A later change to game.js's camera or finale needs
   the same change in pocket.js (or a refactor of game.js into importable parts — operator's file).
3. Not ported: the page HUD (strip, map, title card), its procedural ambience. `music.setScene('Rooftops')`
   falls back to Overworld until music.js gets the mood (handoff 2.1).
4. The Odoi bank sits under the edge forest and reads dark; the bamboo tops show above the forest
   from the village (visible in the village pair).
5. Touch: drop is the stick pulled down (no drop button); the jump button holds a full jump for 0.34 s.
6. Not run: SwiftShader boots (Metal only), real devices.

## Fix round 1 (review r1)

Merged `origin/fable/integration` twice with no conflicts: a549e78 (the R78 route fix; the rooftop golden was re-baselined there) at cbed473, then 4ed6943 (r5-b) at 44d1c7c.

Commits:

| Commit | Change |
|---|---|
| b1ef52e | RunView |
| 1bb6bc4 | soft-lock, hint, Leave the Roof Road, minors |
| cbeee34 | handoff §4, the game.js patch, the inventory entry, large text on the hint, captures |
| 9733a2e, 4c4282a | handoff and AGENTS wording |
| fbc39c3 | status |

### Important 1 — no soft-lock at the gate (manager.js, posts.js, main.js)

- **A failed build** now puts the cat back on the bridge (`placeOnBridge`, behind the veil) and shows one line: "The lanes beyond the noren are not ready. You are back on the bridge."
- **The gate** fires once per walk into it. It arms only after the cat has been seen outside it.
- **Saves:** `RooftopManager.saveSpot(pos)` writes the return spot on the roofs, behind either veil, and in the gate. `saveGame()` uses it.
- **The test** (`tools/rooftop_manager_test.mjs`) uses a loader that keeps failing, a stepped clock, and a cat that never moves.
  - On the previous code: 61 passed, 7 failed (`_scratch/r6-game-wiring/fix1-test-before.txt`). It saw 11 enter attempts in 20 s, input locked for 1190 of 1200 frames, the cat left in the gate, and every save written in the gate.
  - Now: 81 passed, 0 failed. Failed-build stacks are captured and asserted, so the output is quiet.
- **Browser drill, both sets, with a failing loader:** the cat ends back at z 35.2, input is on, there is one "not ready" toast, and the save is at z 35.2.

### Important 2 — R80: one run view, `rooftops/js/runview.js` (new)

- **What `RunView` holds.** Everything game.js and pocket.js both did:
  - physics steps and the autopilot;
  - the sky by progress (`fixedPhase` for `?hour`);
  - where the cat is drawn;
  - Chidori and the camera search;
  - pickups, lanterns and mouths;
  - the finale, `skipFinale` and `restart`;
  - the light pool.
- **Hooks:** viewport, sound, mouth, shoki, treat, finale, fire, finaleCard.
- **The finale mouth** comes from `finaleMouth(level)`: `level.finaleMouth`, or else the level's last mouth. It is never a fixed index; verify checks this.
- **The game side:** `src/rooftops/runview.js` re-exports it. pocket.js keeps only the game glue (640 → 390 lines).
- **game.js is not edited.** The switch-over is `docs/fable/handoff/r6-game-wiring.game-js.patch` (handoff §4).
  - It takes game.js from 1193 to 777 lines.
  - `git apply --check` is clean at 44d1c7c.
  - Applying it is an operator decision and a G-R precondition.

**Sandbox parity** (scratch, `parity.mjs`):
- Setup: `Math.random` seeded, and the clock stepped only by the review loop.
- Run: `at(1, 1.1)`, `setAuto(true)`, `advanceForReview(400)` twice. Sampled every 30 frames through the finale (s 1673.08).

| Comparison | Result |
|---|---|
| unpatched vs unpatched | 1017 / 1017 samples identical |
| unpatched vs patched, with the view's finale mouth set to `mouths[6]` | 1017 / 1017 identical; digest 302c3f06 both; same card, count, strip and fires |
| unpatched vs patched as shipped | the run, the cat and Chidori identical in all 1017 samples. The camera differs from s ≈ 1023, because its rise now keys to Okuribi's s0 (1028) rather than Nijō-jō's (1079). The finale card reads "Okuribi". |

`tools/rooftop_browser_test.mjs` is stale for stage 2: it expects 30 residents (40 are built) and a finale within 400 s of autopilot (it now takes ≈ 800 s). It stops at the same first assertion with or without the patch.

**The game pocket behaves as before.** Drill, both sets: enter, autopilot to mouth 2 (s ≈ 108, the same samples as round 0), Shōki 1, the finale by the pocket's own path (perch → fires → lantern → D key → home), re-entry, walk home.

### Important 3 — controls and the way home

- **The arrival hint** shows in `#toast-stack` on each arrival until the finale has been reached. It reads "← → run · Space jump · ↓ drop · R last lantern · walk back over the bridge to go home", with a separate wording for touch.
  - Tap or click dismisses it.
  - Checked in the browser: 13.5 px plain; with large-text and high-contrast, 16 px, black background, white text and border.
- **"Leave the Roof Road"** (`#btn-leave-roofs`) sits in the pause menu, shown only in rooftop-mode. It resumes the game and runs the normal `exit()`.
  - The drill checks that it is hidden in the valley, shown on the roofs, and takes the cat home.
  - Capture: `docs/fable/status/r6-game-wiring/pause-leave.jpg`.

### Minors

| # | Issue | Resolution |
|---|---|---|
| 1 | quit-to-title race | Fixed: a generation token. `exitImmediate` cancels a pending enter or exit; 2 new tests. |
| 2 | per-frame music | Fixed: `setScene('Rooftops')` runs once, in `setActive(true)`. verify checks that `updateRooftops` has no `setScene`. |
| 3 | Shōki count | Fixed. The test asserts `SHOKI_COUNT` equals the level's Shōki count. `setShokiMask()` added. Ids past the mask are journaled without a bit and never aliased. Pocket toasts use the level's total. The page's own "7" strings are the operator's. |
| 4 | gate zone | Fixed: x −0.75…1.0, the gap's mouth, not the ramp's axis. |
| 5 | operator dependency | Fixed: `makeShoki` is copied into valley.js. The footprint golden is still EQUAL. |
| 6 | comment | Reworded. |
| 7 | test noise | Fixed: `console.error` is captured and asserted. |
| 8 | not ported; seventh cap | The strip, map and ambience are left as a follow-up. The seventh cap now rings warm with the rest, then all settle to 0.5. |
| 9 | crest bamboo height | Not changed: it would change the footprint golden, which this round keeps EQUAL. Visual follow-up. |
| 10 | memory, FOV | FOV fixed: the player's current comfort FOV on return. The pocket is still kept for the session; a low-tier dispose is a follow-up (a rebuild costs ≈ 1 s behind the veil). |

### Checks after the fixes

2026-11-15 20:19–20:31 PST, uptime load ≈ 1.4–2.5, Metal.

```
verify.mjs                 All checks passed (190 modules; 10 src/rooftops; summit_test 83/0; rooftop_manager_test 81/0; kit 523; kit_test 36/36; a1 6/6)
rooftop_test.mjs           40 passed, 0 failed
rooftop_companion_test     7 companion/ceiling checks passed
rooftop_manager_test.mjs   81 passed, 0 failed
goldens                    footprint EQUAL (valley 49233, probe ok) · systems EQUAL (249867) · rooftop EQUAL · cat EQUAL · summit EQUAL · summit parity EQUAL
cad_overrides_test         27/0 · check_syntax 190 OK · kit_check 523 OK
labs_check.mjs             FAIL unclassified Roof Road module: rooftops/js/runview.js (the only error; the inventory entry is in handoff §5.1, checked in scratch)
drill                      classic 24/24, modular 24/24; the only error is the drill's own simulated "no network" build failure
08bd3b5 save               loads on both sets
headless boots             only the pre-existing /cad-overrides.json 404
game_shot pairs vs 4ed6943 shrine 0 · village 132 · bridge 210 · wide 66 (the new objects, as in round 0)
```

### Open after round 1

- **labs_check:** needs the inventory entry (handoff §5.1), then `labs_coverage --write`.
- **G-R precondition:** the operator applies or declines the game.js → runview.js patch.
- **The operator's sandbox items:**
  - places still keyed to the old seven-mouth route: the finale card, the camera rise, the float culling in build.js, the `?finale=1` checkpoint, and the chime for mouths 8–13;
  - the stale `rooftop_browser_test.mjs`.
