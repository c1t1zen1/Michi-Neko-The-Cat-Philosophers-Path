# Handoff: r6-game-wiring

What the Integrator must know or do to merge lane `r6-game-wiring` (guide
section 12, R6.1 to R6.8; the spec's section 8.2 table; rulings D3, R57,
R69/R70; fix round 1: R80). The lane was granted `src/main.js`, `src/countryside.js`,
`index.html`, `src/rooftops/**` (new), `rooftops/js/runview.js` (new, R80),
`tools/verify.mjs`, `tools/rooftop_manager_test.mjs` (new), `AGENTS.md` (the
Roof Road row) and `labs/ASSET_COVERAGE.md` (regenerated). It did not touch
`src/vegetation.js`, `src/settings.js`, the save module (`src/save.js` needed
nothing: the new keys live in `worldFlags`, which it already passes through),
`src/ui.js`, `src/mountaintop.js`, `src/kit/**`, any existing `rooftops/` file
(level.js, the runner and companion modules, game.js, build.js:
`git diff origin/fable/integration -- rooftops` shows only the new
`rooftops/js/runview.js`; game.js's switch-over is the patch in section 4),
`dawCAT/`, `cadJS/` or `Shinkansen/`.

## 1. What changed

| Step | Where | What |
|---|---|---|
| R6.1 | `src/rooftops/valley.js` `buildSevenPosts`, called in `Countryside.buildRiverAndBridge()` | Bronze giboshi on all fourteen railing posts (the seven east caps one material each, `setSevenPostGlow(i, v)`; the west seven one mesh) and the Roof Road's clay Shōki (`makeShoki` from `rooftops/js/pieces/pickups.js`) on the east railing's south end, looking north along it. Own materials: `_mergeStatics` leaves them alone. On both asset sets (the kit bridge keeps the posts and rails). No collider, no rng draw. |
| R6.2 | `src/rooftops/valley.js` `buildOdoiThicket`, called at the end of the Countryside build (before `_mergeStatics`) | The Odoi bank south of the south ramp (x -11…9, z 37.5…39.9): earthwork, dressed stone faces at the gap, bamboo on the crest, the closed thicket in the gap (x -0.45…1.15, between two edge-forest trunks) and behind it a small gate with an indigo 洛 noren and two paper lanterns. `mulberry32(0x0D01)` of its own. Appends 3 colliders (the bank either side, the gap) and 1 vegetation exclusion. `Countryside.setOdoiThicketOpen(t)` parts it like `setShrineThicketOpen` (the gap collider dropped once it starts, one-way). |
| R6.3 | `src/rooftops/manager.js` (`RooftopManager`), `src/rooftops/pocket.js` (`RooftopPocket`), `src/rooftops/posts.js`, `rooftops/js/runview.js` (`RunView`, fix round 1) | The manager is shaped like `SummitManager` (`setUnlocked`, `enter`, `exit`, `exitImmediate`, `setActive`, `update`, `render`, `setQuality`), pure (no three.js), origin (0, -2400, 0). The run is a scene of its own built on enter (dynamic import; nothing of it loads in the valley), disposed on exit and rebuilt behind the veil (R88): the page's level, runner, world, sky, atmosphere and companion, and the run's view shared with the page (`rooftops/js/runview.js`: the cat's drawing, the camera, Chidori, pickups, mouths, the finale), on a local camera copied to the game camera; pocket.js keeps only the game's glue; Michi is the game's `player.mesh`, parented in while the run is up; input from the game's `Controls`. Its `AssetRuntime` (the game's set, `?assets=`, `?swap=`) is created and preloaded before the `Sky`, and passed to `Sky` and `RooftopAtmosphere` (r4b's order). |
| R6.4 | `src/rooftops/{rail,level,physics,reach,autopilot}.js` | Re-exports (`export * from '../../rooftops/js/<m>.js'`, untagged so the game holds one module instance shared with `build.js` and `companion.js`). Nothing moved (R57). |
| R6.5 | `src/main.js` `saveGame` / `loadGame` | `worldFlags.rooftopsUnlocked`, `rooftopShoki` (7-bit mask: the run has seven Shōki as built, ids 1…7 → bits 0…6, so no widening was needed), `rooftopFinished`. A save on the roofs (or behind the veil) writes the top of the bridge's south ramp (-1, 0.87, 35.2) facing north, never the pocket. A save without the keys (main 08bd3b5) loads unchanged. |
| R6.6 | manager / pocket | Unlock: toast "✦ The bamboo on the old earthen wall parts — lanterns beyond ✦", journal `places` `odoi-gate`, XP 60, `audio.playBell()`, a music swell. Each post plays the next note of a pentatonic scale (a pitched bell on the sfx bus: `playBell` has one fixed pitch). Each Shōki: a `keepsakes` entry `roof-shoki-<id>`, XP 10. The finale: a `quietMoments` entry `roof-road-okuribi`, XP 75 once, `rooftopFinished`. `music.setScene('Rooftops')` while on the roofs (see 2.1). |
| R6.7 | `index.html` | `#rooftop-transition`, a sibling after `#summit-transition` (untouched): two indigo panels drop (`.show`), a 洛 ring over the seam, part sideways (`.out`), `.hidden` at rest; reduced motion holds it still. `body.rooftop-mode` hides the valley's guidance and keeps the toasts. Line endings preserved (see 3). |
| R6.8 | `tools/rooftop_manager_test.mjs`, `tools/verify.mjs` | 59 checks against the real manager and posts; verify step 1 syntax-checks `src/rooftops/`, step 2 has 27 Roof Road wiring checks, step 3 runs the manager test, step 4 checks the veil. |

How it plays: walk the east railing north → south (stepping off cools the
caps, no penalty, no timer); the seventh note parts the Odoi over 3 s; walk
down the south ramp into the gap and the noren drops; the run starts on the
far bridge (mouth 1). Ways home: walk back off the start of the route (armed
once the cat has gone 6 m in), or, after the finale's five fires, a paper
lantern drifts past and any move follows it. Both land on the south ramp. Quit
to title leaves the roofs at once.

## 2. Integrator patches (files this lane does not own)

### 2.1 `src/music.js`: a mood for the Roof Road

`music.setScene('Rooftops')` falls back to `Overworld` today (no
`SCENE_MOODS` entry; `setScene` maps unknown names to Overworld, so nothing
breaks). Suggested entry, after `'Summit'`:

```js
  'Summit': { density: 0.16, cutoffMul: 0.62, gainMul: 0.58, bowls: true },
  'Rooftops': { density: 0.45, cutoffMul: 0.85, gainMul: 0.72 }
```

### 2.2 `labs/asset_inventory.json` + `tools/labs_coverage.mjs`: the valley props

The new valley props are not inventoried. `labs_check` passes because
`tools/labs_coverage.mjs` scans `src/*.js` and the Roof Road's `rooftops/js/`
only, not `src/rooftops/` (like `src/summit/` and `src/kit/`, whose builders
are reached through facades). The builders are `buildSevenPosts` and
`buildOdoiThicket` (plain functions in `src/rooftops/valley.js`, called from
`Countryside`; no `build*` method was added to `countryside.js`). To close the
gap: add `src/rooftops` to the scanned directories with a `sourceFiles` entry
for each of its modules (`valley.js` role `assets`; `manager.js`, `pocket.js`,
`posts.js` role `support`; the five re-exports `excluded`, they draw nothing),
and two rows, for example:

```json
{ "id": "valley-seven-posts", "label": "Seven Posts: bridge giboshi and Shōki", "group": "Kyoto village",
  "lifecycle": "active", "sources": [{ "file": "src/rooftops/valley.js", "anchor": "export function buildSevenPosts(scene, MAT = {}) {" }],
  "coverage": [], "note": "The Roof Road's unlock on the valley bridge (R6.1); no lab yet. Review: tools/game_shot.mjs on the bridge." },
{ "id": "valley-odoi", "label": "Odoi bank, bamboo thicket and noren gate", "group": "Kyoto village",
  "lifecycle": "active", "sources": [{ "file": "src/rooftops/valley.js", "anchor": "export function buildOdoiThicket(city, MAT = {}) {" }],
  "coverage": [], "note": "The Roof Road's gate south of the bridge (R6.2); its own mulberry32(0x0D01); no lab yet." }
```

Neither is routed through `placeAsset` (classic on both sets); a kit version
would need those ids first.

### 2.3 `catalog/js/links.mjs` (optional)

`originalContextLink()` still describes the Roof Road page as "not yet in the
game". It now is; the note could read "The Roof Road page (the run is also in
the game, through the Odoi gate south of the bridge)".

### 2.4 Board

Tick R6.1 to R6.8 in `BUILD_GUIDE_FABLE.md` section 12. Gate G-R (after fix
round 1, on integration with the R78 route fix): the manager tests pass
(81/81), `rooftop_test` 40/40 and the companion test pass, and saves from
before the Roof Road load (checked from 08bd3b5 on both sets). **G-R
precondition (ruling R80): the game.js switch-over to runview.js (section 4)
is applied by the operator's decision**; until then the sandbox page keeps its
own copy of the run's view.

## 3. Notes

- Cache tags: every new file imports game modules with `20261114a`; the five
  re-exports and the pocket's imports of `rooftops/js/` modules are untagged
  by design (one module instance with `build.js`/`companion.js`, as the Roof
  Road's own modules import each other). verify step 2 enforces both. The tag
  one-liner rewrites `src/**/*.js`, so `src/rooftops/` follows a bump.
- `git diff --check origin/fable/integration...` lists 55 "trailing
  whitespace" lines, all in `index.html`: they are its CRLF endings, preserved
  as the repo asks (the earlier tag bumps show the same).
  `git -c core.whitespace=cr-at-eol diff --check origin/fable/integration...` is clean.
- `AGENTS.md`'s cache-busting paragraph still names ruling R64's exception
  (the sandbox on `20261113a`); since R70 the sandbox imports `20261114a`.
  Left alone (outside the Roof Road row).
- The footprint and systems goldens were rewritten in 3ff1ee0 with the reason
  in the message (additions only; rng draws unchanged; the meadow mask differs
  only around the Odoi). Re-run both after merging any other valley change.

## 4. game.js → runview.js (ruling R80; an operator decision, a G-R precondition)

The run's view (where the cat is drawn, the camera search, Chidori following,
step-off, pickups, lanterns and mouths, the finale) lives in ONE module now,
`rooftops/js/runview.js` (class `RunView`, `finaleMouth(level)`, `STEP`),
beside the runner modules; `src/rooftops/runview.js` re-exports it and the
game's pocket uses it. **This lane does not edit `rooftops/js/game.js`.** The
page's switch-over is the exact patch
`docs/fable/handoff/r6-game-wiring.game-js.patch` (game.js 1193 → 777 lines):

```
git apply docs/fable/handoff/r6-game-wiring.game-js.patch
node tools/labs_coverage.mjs --write      # game.js anchors move
```

It applies cleanly to `rooftops/js/game.js` as of 44d1c7c (integration
4ed6943 merged; game.js unchanged since r4b's Sky ordering). What it does:
module state that moved (`time`, `acc`, `vis`, `cam`, `finale`,
`currentMouth`, `seenMouths`, `greeted`, `lastCheckpoint`) is read from
`view`; `startAt` / `jumpToMouth` / `respawn` / "Run it again" /
`skipFinale` call the view; `tick()` is `view.frame(dt, readInput(),
autopilot)` followed by the page's own sound, map, alley hint, HUD timers,
quality governor and draw; the page's voice (cards, toasts, chimes, drums,
the strip, the finale card with its buttons) is in the view's hooks; the
canvas resize is the `viewport` hook; `roofRoad.runView` exposes the view.
Edge presses are cleared only after a frame that ran a physics step (as the
original loop did).

**Proof (scratch, Metal):** the sandbox page booted from two trees, the
current one and one with the patch + runview.js, with `Math.random` seeded
and the clock stepped only by the review loop (the page otherwise ticks on
wall-clock time, and two unpatched boots then differ by themselves);
`roofRoad.at(1, 1.1); setAuto(true); advanceForReview(400)` twice, sampled
every 30 frames (s, y, camera position and focus, cat and Chidori positions,
mood, camera mode and clear) through the finale (s 1673.08, 5 fires, the card):
- unpatched vs unpatched: 1017 / 1017 samples identical (the harness is deterministic);
- unpatched vs patched with the view's finale mouth set to the old fixed one
  (`runView.finaleMouth = level.mouths[6]`): **1017 / 1017 identical**, same
  digest (302c3f06), same finale card, Shōki count, strip and fire panorama;
- unpatched vs patched as shipped: the run, the cat and Chidori identical in
  all 1017 samples; the camera differs from s ≈ 1023 on (below).

**The one behaviour change, deliberate:** the finale's mouth comes from the
level's data (its last mouth, 13 送り火 Okuribi, or `level.finaleMouth` if a
level names one), where game.js hard-coded `level.mouths[6]` (stage 1 had
seven mouths). On the page that changes (a) the finale card: "Okuribi — the
Sending Fires" instead of "Nijō-jō — Castle Gardens", and the strip marks
mouth 13 seen; (b) the camera's slight rise for the float climb starts at
Okuribi's s0 (1028) instead of Nijō-jō's (1079).

**The operator's open layout items** (the sandbox's `mouths[6]`; not this
lane's to settle): which mouth the finale belongs to on the 13-mouth route
(level.js's `mouthAt` treats the last mouth, the float roof at s 1028–1034,
as the finale's, while the perch is at s 1672.7 in mouth 11); `build.js`
still culls the float with `level.mouths[6].s0`; `game.js`'s `?finale=1`
start uses `level.checkpoints[6]`; the page's mouth chime reads
`PENTA[m.id - 1]`, which is undefined for mouths 8–13 (a NaN pitch; kept
as is in the patch); the page's strip, map and Shōki counter still say 7 in
places. `tools/rooftop_browser_test.mjs` is stale against stage 2 (it
expects 30 residents, 40 are built, and a finale within 400 s of autopilot,
which now takes ≈ 800 s): it stops at the same first assertion with or
without the patch.

## 5. Fix round 1 (review r1)

### 5.1 `labs/asset_inventory.json`: classify `rooftops/js/runview.js`

`node tools/labs_check.mjs` on this branch reports exactly one error,
"unclassified Roof Road module: rooftops/js/runview.js" (every Roof Road module
must be classified; the inventory is a hot file this lane does not own). The
entry, after `rooftops/js/companion.js`'s (checked in scratch: with it,
labs_coverage passes after `--write`):

```json
  {
   "file": "rooftops/js/runview.js",
   "role": "support",
   "reason": "The run's view, shared by the sandbox page and the game's pocket (ruling R80): where the cat is drawn, the camera, Chidori following, the Shōki and treats, mouths and lanterns, the finale. Builds nothing."
  },
```

then `node tools/labs_coverage.mjs --write` (the module count and the
main.js / countryside.js anchors).

### 5.2 What the fixes changed (for merging)

- **No soft-lock at the gate.** A failed build puts the cat back on the bridge
  with one line ("The lanes beyond the noren are not ready. You are back on
  the bridge."); the gate fires once per walk into it (armed after the cat is
  seen outside it); `RooftopManager.saveSpot(pos)` makes `saveGame()` write
  the return spot on the roofs, behind either veil, or in the gate.
- **The arrival hint**: one toast-style hint per arrival until the finale has
  been reached ("← → run · Space jump · ↓ drop · R last lantern · walk back
  over the bridge to go home"; a stick/button wording on touch), tap or click
  to dismiss; large text and high contrast apply.
- **Pause menu**: `#btn-leave-roofs` "Leave the Roof Road", shown only in
  `rooftop-mode`, runs the normal exit().
- The gate zone is the gap (x -0.75…1.0 at the ramp's foot), so walking down
  the ramp's axis does not pull the cat through; the bridge Shōki is a local
  copy of `makeShoki` (the valley imports no Roof Road module; the footprint
  golden is unchanged); `music.setScene('Rooftops')` is called once per
  visit; the Shōki mask never aliases (`setShokiMask`).

