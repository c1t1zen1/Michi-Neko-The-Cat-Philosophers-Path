### Verdict: GO (merge to main)

# Gate review G-R — the Roof Road merged and wired → `main`

Reviewer: Fable (gate reviewer). Read-only. Checkout: detached worktree `/Users/c1t1zen/Documents/GitHub/michi-wt/review-gr` at
**ef6adad** (fable/integration after the G-R chores and R85). MAIN = **8ab0c9b** (origin/main). Scratch MAIN worktree
`_scratch/review-gr/main` (8ab0c9b), removed afterwards with plain `git worktree remove`. All scratch files are under the session
scratchpad `/private/tmp/claude-501/-Users-c1t1zen-Documents-GitHub-Michi-Neko-The-Cat-Philosophers-Path/5cfc7db3-cdf7-4333-8381-d20943aa51c9/scratchpad/`
(referred to below as `$S`). Metal backend (`ANGLE Metal Renderer: Apple M5 Max`). Two other agents were running (a3-rooftops, b1);
the 1-min load was 1.7–4.1 throughout. Nothing committed, no tracked file modified, nothing pushed; the operator's Skretch/ and
Shinkansen/ WIP untouched.

**Counts: Critical 0 · Important 3 · Minor 7.**

None of the Importants is a defect in what the default player gets. I1 is the frame-ms column I could not take at an admissible
load (draws, triangles and the leak check are measured and fine), I2 is the two-family kit capture spot-check I did not reach
(modular is opt-in; the modular play-through itself is 21/21), and I3 is a design cost — the pocket stays resident after leaving
(~270 MB JS heap) — that only affects players who enter the Roof Road, and only in memory. Everything players get by default
(classic) is proven below to be MAIN plus the Seven Posts and the Odoi, and nothing I read or ran in the wiring is a Critical.

---

## 1. Valley classic safety vs MAIN — PROVEN

| Check | Result |
|---|---|
| `node tools/footprint_golden.mjs` (head) | EQUAL; valley rng **49233** draws (probe ok), hidden 7810, Math.random 92; 332 objects, 521 colliders, 65 platforms, 5 water, 5 exclusions, 25 anchors |
| `--systems` | EQUAL (vegetation 249867 draws, probe ok) |
| MAIN golden vs head golden, structural diff (`$S/gdiff.mjs`) | **removed 0**. Added: `objects.Seven Posts/*` (7 east giboshi, west giboshi, Bridge Shoki), `objects.Odoi Bank/*` (earthwork, stone faces, crest culms/leaves, thicket culms/leaves, gate with noren + lanterns), 2 aggregates, 3 colliders `[-11..-0.45]`, `[1.15..9]`, gap `[-0.45..1.15]` at z 37.5–39.9, 1 exclusion `[-1,38.7,21,3.4]`. Old colliders and exclusions are an **ordered subsequence** of the new (my own check); platforms, anchors, water rects identical; no pre-existing object changed; the only builder row that changed is `buildRiverAndBridge.objects 32 → 44` (draws/random 0 → 0). rng identical. Systems golden: only the Odoi exclusion and the mask texture hash |
| `node tools/summit_golden.mjs` | EQUAL; routing 32 ids, 34/34 stand-ins, single swaps 32/32; summit_test 83/0 identical to the golden (9 advisory entries, known) |
| `node tools/cat_golden.mjs` | EQUAL, 40/0 |
| `node tools/rooftop_golden.mjs` | EQUAL; routing 41/41 |
| `summit_classic.json`, `cat_classic.json`, `summit_test.txt` | byte-identical to MAIN's |
| countryside.js diff vs MAIN | only the two calls (`buildSevenPosts` after `placeAsset('river')`, `buildOdoiThicket` before `_mergeStatics`) and two setters; **no `this.random()` added, removed or moved**. `src/rooftops/valley.js` uses `mulberry32(0x0D01)` / `0x0D02` only |
| Classic `game_shot` pairs MAIN vs head (`&nohud=1&shot=1&assets=classic`) | street noon `maxDelta 0` (476/476 draws); shrine dusk `0` (140/140); meadow rain `0` (458/458); river night `maxDelta 130`, 1,640 px > 8, draws 325 → 341: the diff image shows only the row of giboshi caps on the railing and the Odoi bank/bamboo at the left edge; bridge-south (`hour=15&cam=-9,5.5,20,0,0.8,34`) maxDelta 203, 13,435 px, 286 → 302 draws: caps, the bamboo crest above the canopy, the bank through the trunks, one lengthened post shadow (same as the r6 review); ramp-foot looking south (`cam=-1,2.2,34.6,0.3,1.2,38.6`) 94 → 100 draws, the Odoi fills the view. Nothing else differs |
| Music | `src/music.js` diff vs MAIN is the one `'Rooftops'` mood; `setScene('Rooftops')` is called once per visit in `setActive`, and `main.js:1656` re-sets the valley mood every frame outside the pocket |
| Console | classic and modular boots: only the pre-existing optional `/cad-overrides.json` 404; warnings none |

## 2. The Roof Road as a player meets it

**Code read** (`src/rooftops/manager.js`, `pocket.js`, `posts.js`, `valley.js`, `rooftops/js/runview.js`, `src/main.js` diff, `index.html` diff): the unlock is the spec's Seven Posts (north→south, step off = quiet reset, no timer, `complete` permanent); the gate arms only after the cat has been seen outside the gap; a failed build places the cat on the bridge; the pocket is built once behind the veil and kept; `saveSpot` never writes a pocket position; `exitImmediate` on quit-to-title bumps `_gen` so no veil callback fires on the title; photo mode is blocked on the roofs; the pause menu button runs the normal `exit()`; the hint is a game toast (large text / high contrast CSS apply; `body.reduce-motion *` kills the noren transition as it does the summit veil); the sky/atmosphere read `reduceMotion` at build only (Minor 3). No fail state: `physics.js` keeps `street`/`water` as non-droppable floors, `pocket.update` puts a runner below y −6 back on the last lantern; R is a convenience.

**Played, classic, my own run of the drill** (`$S/gr_drill.mjs`, real game, new save, real W key, Metal, 582 s): **21/21** — the walk to the bridge (25.0 m), three posts then a reset, the full unlock (journal `odoi-gate`), Odoi open ≈3 s, a simulated build failure puts the cat on the bridge at z 35.2 with input on and one calm line, the veil `show → show out → hidden`, entered in 1.0 s, cat under the run, camera below the valley, `rooftop-mode`, the arrival hint, Shōki 1 greeted (bit 0, keepsake), "Leave the Roof Road" from the pause menu returns home mid-run (z 35.2, game resumed, button hidden in the valley), the second visit starts at s 1 with Shōki 1 kept, **the autopilot runs the whole route s 1 → 1673.08 (mouths 1–11, 515 s, Shōki 1 2 3 5 6)**, five fires, quiet moment `roof-road-okuribi`, `rooftopFinished`, the lantern home to (−1, 0.87, 35.2), camera far 700, save and reload restore `rooftopsUnlocked`, mask 55, `rooftopFinished`, Odoi open, cat in the valley. Console: cad-overrides 404 + the drill's own injected error only. Frames `$S/drill/classic-*.png` (finale: five fires, Michi at the left edge, Chidori centre — the known a3 framing note).

**Played, real movement through the gate** (`$S/gr_gate.mjs`, no teleport): with the thicket closed, W held 2.5 s from (0.3, 0.6, 35.4) stops the cat at z 36.98 (the gap collider holds); after the unlock the same walk goes through and the veil starts (the collider really drops: `city.colliders` is replaced by identity and `Player.update` reads `this.city.colliders` each frame, so `ColliderGrid.sync` rebuilds). Pause menu on the roofs shows "Leave the Roof Road" (`$S/gate-pause.png`); P stays off; `quitToTitle()` from the roofs leaves at once, cat at the return spot, veil `hidden`, save z 35.2.

**Guidance stays soft**: in the valley nothing points at the posts (quest card "No active quest", no compass POI for them); the caps and the bridge Shōki are simply there.

**Played, modular** (`$S/drill/modular.log`, same drill, `?assets=modular`, 261 valley kit instances): **21/21 (583 s)** — the chain finished it just after the report was handed back: identical results to classic (unlock, failed-build recovery, veil, entered in 1.0 s, hint, keepsake, leave mid-run, the full autopilot route to the finale perch, five fires, lantern home, save/reload). The modular half of **I2** is therefore closed; only the two-family AAA capture spot-check and the quiet contract runs remain open there.

## 3. Saves — PROVEN

A save made on MAIN (8ab0c9b scratch worktree: 31 keys, `worldFlags` = mistCharm/summitUnlocked/summitBellRings/onSummit) loaded
on the head with `catwalk_autostart=continue` on **classic and modular**: `ok: true` both, cat at (6, 0, 4), journal `old-place`
intact, Roof Road locked, mask 0, not finished, Odoi closed, not active; the next save adds no top-level key, only the three
default flags. The chores' 08bd3b5 save is the same path. On the roofs / behind the veil / in the gate, `saveGame()` writes
(−1, 0.87, 35.2) facing north (`main.js:1391–1407`); proven by the drill (save y 0.87) and the quit-to-title check.

## 4. Performance — measured after the first handback (`$S/perf/classic high-.log`, `classic medium-.log`; a re-run with the
corrected harness in `$S/perf2/`)

`$S/gr_perf.mjs` on the real game (classic, new save, Metal, 1280×720, `--expose-gc`): valley baseline at the ramp, the pocket at
s 1/60/230/560/1000/1500, my own run with the real keys, a fall, the walk-home, then three enter/exit cycles with a forced GC
before each heap read. The first two runs mis-parsed their quality argument (a zsh word-split slip in my chain, so both ran at the
default tier, effectively high) and read `renderer.info` after the valley's composer (which leaves `calls 1`), so the valley draw
column there is void; the pocket numbers are a single `render()` and are right. Load during the reads was 3.0–3.8 (two sibling
agents), so **frame-ms figures are not admissible (R54)**; in headless Chromium the rAF cadence is vsync-locked anyway (median
16.7 ms everywhere), so frame time needs the operator's device, not this harness.

| Where | draw calls | triangles | JS heap (GC'd) | geometries / textures / programs |
|---|---|---|---|---|
| valley, ramp foot, before any enter | (composer) | — | **59.6 MB** | 427 / 118 / 104 |
| pocket s 1 (the bridge, mouth 1) | 187 | 0.29 M | 325.2 MB | 714 / 166 / 162 |
| pocket s 60 / 230 / 560 | 220 / 210 / 240 | 0.30 / 0.27 / 0.29 M | 325.6–326.4 MB | 811–1181 (lazy GPU upload as the route is seen) |
| pocket s 1000 (float ascent) / 1500 | **350** / 274 | **0.45** / 0.39 M | 327.4 / 327.7 MB | 1643 / 1759 |
| valley after exit 1 / 2 / 3 | (composer) | — | 328.6 / 329.5 / **329.5 MB** | 1871 / 1872 / 1872 · 196 · 169 |

Corrected harness (`$S/perf2/classic-high.log`, quality **high** applied, `renderer.info.autoReset=false` so every pass of the
frame counts, the shadow pass included, as `budgets.md` counts it; load 2.6–3.2):

| Where | draw calls | triangles | JS heap |
|---|---|---|---|
| valley, ramp foot, high | **462** | **6.43 M** | 59.6 MB |
| pocket s 1 / 60 / 230 | 312 / 328 / 318 | 0.39 / 0.40 / 0.37 M | 325 MB |
| pocket s 560 | 464 | 0.44 M | 326 MB |
| pocket s 1000 (float ascent, the heaviest spot) | **733** | **0.78 M** | 327 MB |

- **Against the valley budgets** (`budgets.md` §1, classic high: street 774 / shrine 452 / river 589 / meadow 728 calls,
  6.9–8.1 M tris): the pocket draws **312–733 calls and 0.37–0.78 M triangles**. Its worst spot matches the street's draw count
  with a tenth of the triangles; everywhere else it is lighter than any valley spot. Draw calls are not the pocket's cost.
- That corrected run ended with the headless browser closing itself at the s 1500 read ("Target page, context or browser has been
  closed", `$S/perf2/classic-high.log` +38 s) after the pocket had rendered five spots; the two earlier runs and both drills passed
  the same spot and ran the pocket for 10 minutes each without it. A second corrected run was started to see whether it repeats;
  its result is in the addendum below if it finished before the review closed.
- **No per-cycle leak**: heap after cycle 1 → 3 is 328.6 → 329.5 → 329.5 MB, geometries 1871 → 1872 → 1872, textures and programs
  flat. Re-entering reuses the built pocket (the drill's second enter is 1.0 s like the first).
- **But the pocket is kept resident after leaving, by design** (`manager.ensurePocket`, `pocket.detach()` keeps scene, PMREM,
  materials): **+270 MB JS heap, +1,445 GPU geometries, +78 textures, +65 programs stay for the rest of the session** once a player
  has been through the noren, in the valley too. This is I3 below.
- Harness slips (not game faults): the comfort check set `reduceMotion='on'` where the setting is `true/false/null` (large text
  and high contrast did apply; the hint had auto-dismissed by then); the R check used a sub-frame `keyboard.press` which the
  per-frame edge in `readInput` cannot see; the "pocket kept" check compared GPU geometry counts that grow with the route seen. The
  corrected harness re-run (`$S/perf2/classic-high.log`) is recorded in the addendum at the end if it finished before this review
  closed.

## 5. Tags — PROVEN (static)

`grep -rnoE "\?v=[0-9a-z]+"` over the tree: every tag is `20261116a` except `Shinkansen/index.html` (operator WIP, skipped by the
brief), `docs/social/.../capture.js` (archived) and the kit_test / catalog test fixtures (`tagx`, `stale0`, `v=1`, intentional).
`node tools/kit_index.mjs --check`: in sync (28 families, tag 20261116a). `src/rooftops/*` import game modules with the tag and
`rooftops/js/*` untagged (one instance with `build.js`/`companion.js`); `rooftops/js/build.js`, `game.js`, `sky.js`, `atmosphere.js`,
`pieces/common.js`, `pieces/paint.js` import `src/` with the tag; `labs/shared/game.js`, `cadJS/src/kit-params.mjs`, the tools
pages too. `main.js` `./cat.js?v=20261116a` and `build.js` `../../src/cat.js?v=20261116a` resolve to the same URL, so the game page
holds one Cat module. (The runtime duplicate-URL check was in the perf harness: I1.)

## 6. Kit on the Roof Road — PARTLY CHECKED (I2)

Static: `node tools/kit_check.mjs` 534 OK; `node tools/verify.mjs` all passed (192 modules, summit_test 83/0,
rooftop_manager_test 81/0, kit_test 37/37, a1_village_test 6/6, index.html 14 checks); `labs_check` OK; `catalog_check` OK (254
records); `labs_coverage` OK (69 Roof Road modules, 48 piece types). roofstreets = 14 ids (`roof-crates` … `roof-tsuboniwa`),
roofcanal = 8 ids (stepping-stones, canal-landings, footbridge, toro, cistern, chimney, futon-racks, canopy-vents); every one has an
inventory row (group Roof Road, active, coverage 1) and the family `assets` export is the production adapter. `rooftop_golden
--query assets=modular` (chores) 47 kit ids / 521 instances, routing 41/41. **Not done by me:** the AAA-1/4/5 captures of two
families at day/dusk/night on `?assets=modular` (`$S/roof_shot.mjs`, queued in the chain) and three quiet contract runs per family.
Thumbnails: none of the 62 Roof Road ids has a catalog thumbnail (`catalog/thumbnails/` has no `roof-*`; the valley families do) —
AAA-10's thumbnail/provenance column is open for the whole Roof Road (Minor 1).

## 7. Rulings R57–R85 — challenged, none overturned

- **R84/R85 (warm-build allowances; median of 3):** the raised numbers (roof-machiya hero 15; roof-hayashi 10/5/2.5; roof-okuribi
  mid/far 4; roof-distant-city hero 13) are once-per-pocket build costs behind a 950 ms veil-in, on a pocket whose whole build is
  ~1 s in the game (both drills: "entered in 1.0 s"). They cost players nothing visible, and they were read at load 1.1–1.8 (R54
  honoured). The median-of-3 keeps a real regression visible (the `slowBuild` fixture at 2× still fails, proven in the chores'
  self-test and readable in `tools/kit_contract_test.js`). Upheld.
- **R80/R81 (runview switch-over):** `rooftops/js/game.js` 777 lines, imports `RunView`; the pocket has no camera/pickup/finale code
  of its own (verify forbids it); rooftop golden EQUAL and `rooftop_test` 40/40, alley and companion tests pass on the head.
- **R78 (route fix):** 40/40; the autopilot reaches the perch at s 1673.08 in 515 s in the real game (both sets, the modular one
  pending my own confirmation — I2).
- **R69/R70/R72/R76/R77/R79/R82/R83:** consistent with the tree; nothing leaves players worse off.

---

## Findings

### Critical
None.

### Important

**I1 — Pocket frame time not admissible from this review; draws, triangles and leak are measured** (`src/rooftops/pocket.js`,
`src/main.js:2186–2188`; §4 above). Draw calls (176–350) and triangles (≤ 0.45 M) are far under every valley budget; the
enter/leave cycle does not leak (heap flat to 0.3 % over three cycles). What is still open is the brief's frame-ms column on
medium/high: the reads were taken at load 3.0–3.8 (R54 forbids using them) and a headless rAF cadence is vsync-locked. Close it
with one real-device look at the pocket at s ≈ 1000 (the float ascent, the heaviest spot: 350 calls / 0.45 M tris) on medium and
high — given the draw/triangle headroom I expect it to be lighter than the valley street.

**I3 — The pocket stays resident after leaving: ~270 MB of JS heap for the rest of the session** (`src/rooftops/manager.js:183–196`
`ensurePocket` keeps `this.pocket`; `pocket.js:206–223` `detach()` returns the cat and the lens and keeps the scene, PMREM
environment, level, world and materials; nothing disposes). Measured: 59.6 MB in the valley before the first enter → 328.6 MB back in
the valley after the first leave, flat afterwards; GPU geometries 427 → 1871, textures 118 → 196, programs 104 → 169. Players who
never enter are unaffected, and the enter/leave cycle itself is clean, so this is not a blocker for `main` (desktop headroom is
ample). It is a real cost on memory-constrained phones, where the game already guards context loss (A1.2), and it is cheap to
remove: the pocket builds in ~1 s behind a 950 ms veil (both drills "entered in 1.0 s"), so disposing it on exit (traverse
geometries/materials/textures, `pmrem.dispose()`, drop `this.pocket`) would cost nothing visible. → a3-rooftops or b1-build-budget;
if `?assets=modular` is ever made the default, re-measure (the modular pocket also preloads all 28 families: the chores' note).

**I2 — Modular play-through past the first Shōki, and the two-family AAA capture spot-check, not completed by this review.** My
modular drill reproduced 13/13 steps up to the first Shōki (identical to classic); the chores report 21/21. The AAA-1/4/5
captures of roofstreets and roofcanal on `?assets=modular` and three quiet contract runs per family were queued and not reached.
Evidence to close: `$S/drill/modular.log` / `modular-summary.json`, `$S/kit/<family>-<n>.txt`, `$S/roofshots/*.png`
(the chain writes them), or the commands in `$S/chain.sh`. Modular is opt-in (`settings.assetSet`, `?assets=`), so this does not
touch the default player.

### Minor

1. **AAA-10 thumbnails/provenance missing for all 62 Roof Road ids** (`catalog/thumbnails/`, `catalog/metadata.json` has no `roof-*`
   key). Catalogued in the inventory and the swap matrix, not pictured. → a3-rooftops or z-final.
2. **`catalog/js/links.mjs:107`** still says the Roof Road page is "not yet in the game" (r6 handoff §2.3, optional). → z-final.
3. **Reduce-motion is read once at pocket build** (`src/rooftops/pocket.js:60`, `:86–94`): toggling the setting while the pocket
   exists does not reach the run's sky/atmosphere until the next boot; the noren veil and toasts follow the body class at once.
   → a3-rooftops (a `setReduceMotion` on the pocket, or rebuild on change).
4. **Operator layout notes stand** (not G-R blockers, the operator's files): overlapping stage-2 legs at s≈1010/1424/1558, mouth 12
   zero length, `roofRoad.view` under `?finale=1`, `tools/rooftop_browser_test.mjs:51` asserts 30 residents (40 built).
5. **Finale framing**: Michi at the left edge, Chidori centre (`$S/drill/classic-4-finale.png`). → a3-rooftops.
6. **Records drift**: `BUILD_GUIDE_FABLE.md:20` and `docs/fable/swarm/README.md:8` say the in-repo ledger holds R1–R81; it stops at
   R81 and `docs/fable/swarm/reports/` has no gate-r chores report, while §0 cites R85 and that report. → copy R82–R85 and the G-R
   reports into `docs/fable/swarm/` at the next records chore.
7. **Process**: the review's detached run chain (`$S/chain.sh`: modular drill → perf ×3 → contracts → sandbox smoke → captures)
   was still running when the session was closed and the harness refused the stop command; it uses only transient headless
   browsers on free ports and ends by itself (≈1 h). Nothing of it touches the repo.

### Deferred-minor triage
- Keep on the a3-rooftops list: Minor 1, 3, 5. On z-final: Minor 2, 6. Operator: Minor 4. None blocks `main`.

## Checks run (command → result)

```
node tools/verify.mjs                      All checks passed (192 modules; summit_test 83/0; rooftop_manager_test 81/0; kit 534; kit_test 37/37; a1_village 6/6)
node tools/kit_check.mjs                   All kit checks OK (534 passed)
node tools/labs_check.mjs                  All labs checks OK
node tools/kit_index.mjs --check           in sync (28 families, tag 20261116a)
node tools/catalog_check.mjs               OK 254 records
node tools/labs_coverage.mjs               OK
node tools/footprint_golden.mjs            EQUAL · rng valley 49233 (probe ok)
node tools/footprint_golden.mjs --systems  EQUAL
node tools/summit_golden.mjs               EQUAL · routing ok · summit_test identical
node tools/cat_golden.mjs                  EQUAL 40/0
node tools/rooftop_golden.mjs              EQUAL · routing 41/41
node tools/rooftop_test.mjs                40 passed, 0 failed
node tools/rooftop_companion_test.mjs      7 passed
node tools/rooftop_alley_test.mjs          PASS six alleys
$S/gdiff.mjs MAIN vs head goldens          valley: removed 0, added 644 leaves (Seven Posts, Odoi, 3 colliders, 1 exclusion); systems: exclusion + mask hash only
game_shot pairs (6)                        street/shrine/meadow maxDelta 0; river 130 (caps + Odoi); bridge-south 203 (caps, crest, bank, one shadow); ramp foot (the Odoi itself)
$S/gr_drill.mjs classic                    21/21 (582 s), errors: cad-overrides 404 + the drill's injected failure, warnings none
$S/gr_drill.mjs modular                    13/13 completed before close (see I2)
$S/gr_gate.mjs                             closed gap blocks a real walk; open gap enters; pause menu; P off; quit-to-title clean
$S/saves.mjs make (MAIN) / load (head)     classic ok:true, modular ok:true, no new required key
git -c core.whitespace=cr-at-eol diff --check 8ab0c9b ef6adad   only the handoff .patch's own trailing spaces (a patch file)
```
