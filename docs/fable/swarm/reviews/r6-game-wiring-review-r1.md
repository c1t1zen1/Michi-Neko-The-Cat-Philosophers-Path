# Review r1: r6-game-wiring (lane commits a63ff9e..08c9d6e, first-parent)

Reviewer: Claude Opus 5.5 (task reviewer). Read-only on the worktree. I read the 187 KB diff in four passes: status and R6.4 re-exports; R6.1/R6.2 with countryside.js, posts.js and valley.js; index.html, main.js and manager.js; pocket.js, the tests, verify.mjs, AGENTS.md and the handoff. Scratch work is in `/Users/c1t1zen/Documents/GitHub/michi-wt/_scratch/r6-review/`.

### Spec Compliance

- ❌ Issues found. R6.1–R6.8 are all present and match the brief, D3 and spec §4/§8.2. Two problems:
  - The failed-build path breaks "a player can never be stranded". See Important 1.
  - The pocket copies roughly 300 lines of `rooftops/js/game.js` logic, and the copy has already drifted from the original. See Important 2.
- ⚠️ Cannot verify from the diff:
  - **BiomeMask locality.** The systems golden changes only `vegetation.mask.texture` and the exclusion list (checked below), and the mechanism is local: one exclusion plus three colliders. I did not recompute the 167-texel count myself. The lane's proof is `_scratch/r6-game-wiring/mask.html`.
  - **The 08bd3b5 save.** By code, all three keys are optional (`main.js:1334-1336`: truthy / `Number.isFinite`), and `save.js:48` passes `worldFlags` through. I did not repeat the lane's headless load of the 08bd3b5 save.
  - **G-R play-through to the finale.** Blocked on the operator's route fix (rooftop_test 38/2 baseline). As briefed, this is not the lane's gate.

**Checks I ran**
- `node tools/rooftop_manager_test.mjs`: 59 passed, 0 failed. The failed-build case prints a stack trace (see Minor 7).
- `node tools/verify.mjs`: All checks passed (189 modules, 8 summit, 9 src/rooftops; summit_test 83/0; rooftop_manager_test 59/0; kit 517; kit_test 36/36; a1_village 6/6).
- `node tools/footprint_golden.mjs`: EQUAL. Counts: 332 objects, 521 colliders, 65 platforms, 5 exclusions. rng valley 49233 draws (probe ok), hidden 7810, Math.random 92.
- `node tools/footprint_golden.mjs --systems`: EQUAL. vegetation 249867 draws (probe ok).
- **Old vs new golden**, a structural JSON diff of `git show a63ff9e:tools/golden/{valley,systems}_classic.json` against 08c9d6e (`_scratch/r6-review/gdiff.mjs`). Nothing was removed. No pre-existing object, aggregate, baked batch, platform, anchor or per-builder `draws`/`random` changed. The old colliders and exclusions are an ordered subsequence of the new lists. The only additions:
  - valley: 20 objects (`Seven Posts/*`, `Odoi Bank/*`), 2 aggregates, 3 colliders (`[-11..-0.45]`, `[1.15..9]`, gap `[-0.45..1.15]`, all at z 37.5–39.9) and 1 exclusion `[-1,38.7,21,3.4]`.
  - The 8 changed values are counts, plus `buildRiverAndBridge.objects` 32 → 44.
  - systems: only `exclusions` (+1, same rect) and the mask texture hash. `collidersExact` is unchanged.
- **`this.random()` in countryside.js:** `git diff 6016e11 08c9d6e -- src/countryside.js` has no `this.random()` or `.rng()` call added, removed or moved. The only hits are in comments (`countryside.js` +19, +34). valley.js uses its own `mulberry32(0x0D01)`, and its noren texture uses `0x0D02`.
- **R57:** `git diff 6016e11 08c9d6e -- rooftops/ src/mountaintop.js src/summit` is empty. The five `src/rooftops/{rail,level,physics,reach,autopilot}.js` files are pure `export *` re-exports.
- **Merge 9b6d648:** clean. `git show --cc` shows no conflict hunks.
- **index.html:** additions only (0 removed lines). `#rooftop-transition` is a sibling placed after the closing `</div>` of `#summit-transition` (verify step 4 checks the depth). No `#summit-transition` rule was touched. CRLF/LF regions are preserved: the summit-mode block stays LF, and the veil CSS and markup are CRLF like their neighbours.
- **Shōki count:** `rooftops/js/level.js:447-1078` has seven `shoki(1…7)` across the 13 mouths. The 7-bit mask is the right width for the built count, so no widening is needed.
- **Classic game_shot pair, my own.** Query `hour=15&cam=-9,5.5,20,0,0.8,34&nohud=1&shot=1&assets=classic`, base 6016e11 against lane 08c9d6e, both exported with `git archive` to scratch. Result: maxDelta 203, mean 0.749, 13,435 px over 8 (`_scratch/r6-review/bridge-diff.png`). Every changed pixel is a new object or its shadow:
  - the Odoi bamboo crest showing above the edge-forest canopy
  - the west giboshi along the railing
  - the bank and stone faces through the forest trunks at the ramp foot
  - two cap shadows: a lengthened post shadow on the grass at about (275, 510), confirmed by a zoomed base/lane crop, and one on the deck
- **Stranding probe** (`_scratch/r6-review/loop_probe.mjs`, the real manager, a loader that keeps failing, the cat left standing in the gap). Over 20 s at 60 fps: 11 enter attempts, 11 frames with input in total (one frame per cycle) and 10 saves of the gate position.

### Strengths

- **The manager is pure and testable.** `RooftopManager` imports no three.js and takes an injectable `loadPocket` and `timers` (`manager.js:1-60`). The test drives the real `manager.js` and `posts.js` rather than mocks, covering 59 behaviours: the order of the posts, starting at the north end, a quiet reset, hops, the west rail, the silent restore, enter/exit, and the input mapping.
- **Valley safety is genuinely additive.** The Odoi has its own stream, colliders and the exclusion are appended after every pre-existing builder, the materials are its own clones, and the thicket and crest instanced meshes are too small to chunk. The goldens prove it, as listed above.
- **Saves are handled correctly.**
  - All three new keys are optional on load.
  - A save made on the roofs, or behind either veil (`active || transitioning`), writes the return spot. The pocket position is never written (`main.js:1054-1069`).
  - Restore is silent: the thicket opens at once, the caps go warm, and there is no toast, XP or save.
- **Valley state is restored.**
  - While the run is up, the valley freezes: its sky, time and weather are not ticked, because `update()` returns early.
  - Afterwards, music returns to its mood through the valley's per-frame `setScene`.
  - On exit, `detach()` restores the camera's fov/near/far, the rim strength and the cat's parent and pose. The valley re-sets `uRimDir` each frame.
  - `E` on the roofs is inert because `hideAllPrompts()` clears `activeAction`.
  - The lane checked the `ColliderGrid.sync` identity, so the gap collider really drops.
- **Unlock matches D3 and spec §4 word for word.** North → south on the east rail, glows cool when the cat steps off, no timer, the exact toast, a 3 s smoothstep part, `places/odoi-gate`.
- **The pocket loads lazily.** The run is only dynamically imported on the first enter. Only `rooftops/js/pieces/pickups.js` (three-only) loads with the valley.
- **The pocket fixes a sandbox bug.** It uses the *last* mouth for the finale and the camera's vertical term, where `game.js:651` and `game.js:951` still hard-code `level.mouths[6]` (stage-1 era).

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

1. **`src/rooftops/manager.js:180-199` together with `:388` — a failed pocket build soft-locks the cat in the Odoi gap, across reloads.**
   - **What happens.** When `ensurePocket()` rejects, `enter()` leaves the cat where it stood, which is inside `inOdoiGate`. It releases input for one frame and saves. The next `update()` (`:388`) calls `enter()` again. Measured with the real manager: 11 veil cycles in 20 s, one frame of control per cycle, and 10 saves at the gate position.
   - **Why it persists.** `Controls` ignores keydown while disabled, so held keys never register. The save puts the cat back in the gate, so reloading repeats the loop.
   - **Plausible triggers:**
     - `pocket.js` fetches `three/addons/environments/RoomEnvironment.js` from unpkg only on the first enter, so a connection dropped mid-session is enough.
     - A stopped local server.
     - Any exception in `buildWorld` / `compileAsync` on a given device.
   - **Why the test misses it.** `tools/rooftop_manager_test.mjs:332` moves the cat out of the gap before retrying.
   - **Fix.** On failure, `placeOnBridge()`. Or arm the gate only after the cat has left `ODOI_GATE` (a `_needLeave` flag), and keep the cat in the gap in the test.

2. **`src/rooftops/pocket.js:293-520, 649-799` against `rooftops/js/game.js:526-735, 914-1085` — the run's logic is duplicated.**
   - **How much.** About 270 of pocket.js's 640 non-trivial lines are identical to a game.js line once whitespace and `this.` are ignored, and many more are renamings. This covers `updateCamera` (151 lines against 173), `updateChidori`, `stepOffHeight`, `beginStepOff`, `lowHeadroom`, `pathTangent`, `checkPickups`, `checkProgress`, `startFinale`, `updateFinale` and `stepPhysics`.
   - **The header is wrong.** `pocket.js:7` says "nothing is copied but the frame loop".
   - **Drift has already happened.** The two copies disagree on the finale card and camera mouth index (above). The operator is actively editing game.js's camera: stage 2 added alleys, crowds and camera obstacles. Nothing tests parity, and `rooftop_golden` covers the build, not the camera. So the game's run will silently keep stale camera and finale behaviour.
   - **Size against risk.** The extraction is mechanical, because pocket.js already holds this logic as methods on one object with the same field names. The drift risk is high and invisible.
   - **Minimal shape** (one module, no behaviour change):
     - **The module.** Move the shared methods into a `RunView` class: `updateCamera`, `updateChidori`, `stepOffHeight`, `beginStepOff`, `lowHeadroom`, `pathTangent`, `placeCat`, plus finale stepping with callback hooks `onToast`, `onShoki`, `onFinale`, `chime`.
       - Put it in `src/rooftops/runview.js` (granted to this lane), or in `rooftops/js/runview.js` if the Integrator grants it.
       - Its fields: `level`, `rail`, `runner`, `companion`, `world`, `sky`, `cam`, `camState`, `catRoot`, `guideRoot`, `guide`, `cat`, `origin` (default zero), `reduceMotion`.
     - **pocket.js** extends or composes `RunView` and keeps only the game glue: attach/detach, readInput, syncCamera, render, the sfx-bus sounds, manager calls.
     - **game.js** switches over in a handoff patch, because it is the operator's file and not granted. It builds one `RunView` from its module-level variables and deletes about 300 lines. That lands with G-R, which already waits on the operator's route fix.
     - **Record it.** Put the switch-over in decisions or the handoff as a G-R precondition, so the duplication cannot reach main unowned.
     - If the Integrator would rather accept the copy for now, this must at least be a named G-R item, with the two known divergences listed.

3. **`src/rooftops/manager.js:197` and `src/rooftops/pocket.js:198-223` — nothing in the game tells the player that the controls change, or how to get home.**
   - **The control change.** On the roofs, `W`/`↑` jumps and `S`/`↓` drops off a roof (`manager.js:324-325`, `readInput`). In the valley, `W`/`S` walk.
   - **The ways out.** The only way home before the finale is walking back to route s ≤ 0.6, or quitting to the title. Neither is said anywhere.
   - **What the sandbox has.** The page shows exactly this line (`kyoto-rooftops.html:47`: "← → run · Space jump, hold to go higher · Shift sprint · ↓ drop · R lantern").
   - **What still works.** Direction reads fine: the side-on camera, Chidori leading, and a toast per mouth. The run otherwise feels complete without the strip, map and soundscape (Minor 8).
   - **Fix.** One soft toast on the first arrival, and on every arrival while `!finished` if you like. For example: "← → run · Space jump · ↓ drop · R last lantern · walk back over the bridge to go home". This stays within "guidance soft/optional".

#### Minor (Nice to Have)

1. **Quit to title races the veil.** `src/rooftops/manager.js:231` together with `main.js:1164`: `exitImmediate()` does nothing while `transitioning`.
   - The first build takes seconds behind the veil, and Esc → Quit to title is reachable during it. A pending enter then fires on the title screen: `setActive(true)`, pocket rendering, `_lock(false)` re-enabling controls, toast and save.
   - A pending exit similarly re-enables controls on the title screen.
   - Fix: add a generation token checked in the timer callbacks, and have `exitImmediate` cancel pending transitions.
2. **Per-frame music churn.** `src/main.js:1750` calls `setScene('Rooftops')` every frame. Without handoff 2.1, `music.js:51-55` maps it to 'Overworld', `this.scene !== name` stays true, and `applyPhase()` re-schedules five AudioParam automations every frame. Fix: apply handoff 2.1 in the G-R merge, or call `setScene` once on enter.
3. **The Shōki count is hard-coded in five places, with aliasing.**
   - The places: `SHOKI_COUNT = 7` (`manager.js:36`), `% SHOKI_COUNT` (`:279`), `% 7`, "/7" and "of 7" (`pocket.js:205, 352, 417`), and `& 0x7f` (`main.js:1335`).
   - A Shōki 8 added by the operator would silently alias to bit 0.
   - The test check `SHOKI_COUNT === 7` (`rooftop_manager_test.mjs:179`) only compares the constant to itself; it never looks at the level.
   - Fix: assert `buildLevel().pickups.filter(k => k.kind === 'shoki').length === SHOKI_COUNT` in the test, and derive the "/N" text from it.
4. **The gate zone covers the whole ramp foot, not the gap.** `src/rooftops/posts.js:44`: `ODOI_GATE` x −2.0…1.0, from z 36.45, so any walk down the south ramp after the unlock pulls the cat through the noren. The spec says "walking into the gap". The return spot faces away (z 35.2), which helps. Consider narrowing the zone toward x −0.45…1.15, or showing a soft prompt.
5. **The valley build now depends on an operator-owned file.** `src/rooftops/valley.js:27` imports `makeShoki` from `rooftops/js/pieces/pickups.js`, so any operator tweak to the Shōki changes the valley footprint golden (`Seven Posts/Bridge Shoki`). Name this in the handoff, or snapshot the figure into valley.js.
6. **A doc comment overstates its material rule.** `src/rooftops/valley.js:17` says every material is "never one of Countryside's MAT entries", but `:354` uses `MAT.bambooGreen` directly for the instanced culms. The golden shows it is not merged, so this is harmless today. Clone it, or reword the comment.
7. **The manager test output is noisy.** The failed-build case prints a full `console.error` stack into the test output, which should be pristine. Stub `console.error` around that case and assert it was called.
8. **Not ported from the sandbox.** The page's mouth strip and map, its alley-hint element (alley entrances now become 2.2 s toasts, `pocket.js` `↓ name`) and its procedural ambience. Record these as a follow-up. The seventh cap only ramps toward 0.5, because `setUnlocked` overrides `glowTarget[6] = 1` in the same frame (cosmetic).
9. **The 6 m crest bamboo shows above the edge-forest canopy.** Visible from the bridge and village before any unlock (my pair, and the lane's village pair). It is a legal addition, but it reads as stray poles. Consider shorter culms on the crest.
10. **The pocket stays in memory once built.** It is kept for the session (scene, PMREM, world) with no dispose path, which matters on low-tier devices. The FOV saved in `attach()` and restored in `detach()` also discards a comfort-FOV change made while on the roofs.

### Assessment

**Task quality:** Needs fixes

**Reasoning:** The valley classic safety, saves, unlock, veil and R57 hold up. I confirmed them against the old goldens, the tools, a pair of my own and both test runs. Three things should be fixed before G-R puts this in front of every player on main:
- the failed-build soft-lock at the gate
- the unshared copy of game.js's run logic, which is already drifting while the operator edits it
- the missing controls and way-home hint
