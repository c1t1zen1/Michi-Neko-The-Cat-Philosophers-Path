# Handoff: r6-game-wiring

What the Integrator must know or do to merge lane `r6-game-wiring` (guide
section 12, R6.1 to R6.8; the spec's section 8.2 table; rulings D3, R57,
R69/R70). The lane was granted `src/main.js`, `src/countryside.js`,
`index.html`, `src/rooftops/**` (new), `tools/verify.mjs`,
`tools/rooftop_manager_test.mjs` (new), `AGENTS.md` (the Roof Road row) and
`labs/ASSET_COVERAGE.md` (regenerated). It did not touch `src/vegetation.js`,
`src/settings.js`, the save module (`src/save.js` needed nothing: the new keys
live in `worldFlags`, which it already passes through), `src/ui.js`,
`src/mountaintop.js`, `src/kit/**`, `rooftops/**` (level.js, the runner and
companion modules, game.js, build.js: `git diff origin/fable/integration -- rooftops`
is empty), `dawCAT/`, `cadJS/` or `Shinkansen/`.

## 1. What changed

| Step | Where | What |
|---|---|---|
| R6.1 | `src/rooftops/valley.js` `buildSevenPosts`, called in `Countryside.buildRiverAndBridge()` | Bronze giboshi on all fourteen railing posts (the seven east caps one material each, `setSevenPostGlow(i, v)`; the west seven one mesh) and the Roof Road's clay Shōki (`makeShoki` from `rooftops/js/pieces/pickups.js`) on the east railing's south end, looking north along it. Own materials: `_mergeStatics` leaves them alone. On both asset sets (the kit bridge keeps the posts and rails). No collider, no rng draw. |
| R6.2 | `src/rooftops/valley.js` `buildOdoiThicket`, called at the end of the Countryside build (before `_mergeStatics`) | The Odoi bank south of the south ramp (x -11…9, z 37.5…39.9): earthwork, dressed stone faces at the gap, bamboo on the crest, the closed thicket in the gap (x -0.45…1.15, between two edge-forest trunks) and behind it a small gate with an indigo 洛 noren and two paper lanterns. `mulberry32(0x0D01)` of its own. Appends 3 colliders (the bank either side, the gap) and 1 vegetation exclusion. `Countryside.setOdoiThicketOpen(t)` parts it like `setShrineThicketOpen` (the gap collider dropped once it starts, one-way). |
| R6.3 | `src/rooftops/manager.js` (`RooftopManager`), `src/rooftops/pocket.js` (`RooftopPocket`), `src/rooftops/posts.js` | The manager is shaped like `SummitManager` (`setUnlocked`, `enter`, `exit`, `exitImmediate`, `setActive`, `update`, `render`, `setQuality`), pure (no three.js), origin (0, -2400, 0). The run is a scene of its own built on the first enter (dynamic import; nothing of it loads in the valley) and kept: the page's level, runner, world, sky, atmosphere, companion and camera code (ported from `rooftops/js/game.js` step by step, on a local camera copied to the game camera); Michi is the game's `player.mesh`, parented in while the run is up; input from the game's `Controls`. Its `AssetRuntime` (the game's set, `?assets=`, `?swap=`) is created and preloaded before the `Sky`, and passed to `Sky` and `RooftopAtmosphere` (r4b's order). |
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

Tick R6.1 to R6.8 in `BUILD_GUIDE_FABLE.md` section 12. Gate G-R: the manager
tests pass (59/59); `rooftop_test` stays at the known baseline 38/2 and the
companion test's "player reaches finale" stays failing (operator's stage-2
route, 17c9cae; not this lane), so **G-R's play-through to the finale stays
open** until the operator's route fix lands; saves from before the Roof Road
load (checked from 08bd3b5 on both sets).

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
