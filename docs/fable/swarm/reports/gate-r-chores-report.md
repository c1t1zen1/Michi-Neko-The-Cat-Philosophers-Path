# Report: G-R gate chores (end of Phase 5, the Roof Road)

Delegate: Claude Opus 5.5, acting for the Integrator. Worktree `/Users/c1t1zen/Documents/GitHub/michi-wt/integration`,
branch `fable/integration`, base 9f7c0ed, final head **078faf3** (pushed; `origin/fable/integration` = 078faf3).
Run 2026-11-16 02:20–02:50 PST. Metal backend (`ANGLE Metal Renderer: Apple M5 Max`). No other agent was running.

**Status: DONE_WITH_CONCERNS (one item BLOCKED).** Items 0, 1a, 1b, 1, 2, 3, 4, 5b are done and green. In item 5, every
check passes except `kit_contract_test` (all families). It has reproducible warm-build failures on a quiet machine. They
are pre-existing on 9f7c0ed and are not integration glue, so G-R is **not ticked**. They need an Integrator ruling (see
"BLOCKED" below).

## Commits

| Commit | Item |
|---|---|
| e814191 | 1a: Roof Road family filter (`AssetRuntime` `families` option, sandbox option line, kit_test, golden page mirror) |
| 4bcc0ad | 1b: roof-machiya hero `buildMs` 12 → 15 (ruling R84) |
| a33dc55 | 1: board note, Phase 5 rows merged; Roof Road ids still classic listed as deferred |
| 0623272 | 2: cache tag `20261116a` (191 files) + AGENTS.md |
| 078faf3 | 3–6: results in the §6 G-R note, the operator layout notes (5b), §0 updated; G-R not ticked |

Items 0, 3, 4 and 5 changed no repo file; their evidence is below and in the scratch folder
`/Users/c1t1zen/Documents/GitHub/michi-wt/_scratch/gate-r/`. The three scratch worktrees (9f7c0ed, 8ab0c9b, 08bd3b5) were
removed with plain `git worktree remove`.

## Item 0: origin/main

```
$ git fetch origin; git log --oneline -1 origin/main
8ab0c9b Merge fable/r1-roof-split: Roof Road pieces split over the downtown alleys
$ git merge-base --is-ancestor origin/main HEAD && echo "origin/main IS ancestor"
origin/main IS ancestor
```
Nothing to merge, so there is no commit.

## Item 1a: Roof Road family filter (r3 handoff §4)

- `src/kit/runtime.js`: a new constructor option, `families`. It is an array of family names or a `(name) => boolean`
  test. `preload()` imports only those entries of the family map, and ids of the families left out stay classic. The
  default (no filter) is unchanged: the game's runtime (`src/main.js`) and the pocket's runtime still load everything.
- `rooftops/js/game.js`: the option line only (R81 precedent):
  `new AssetRuntime({ …, quality: lowPower ? 'low' : 'high', families: (f) => f.startsWith('roof') })`.
- `tools/rooftop_golden.js`: the same option on its "exactly as game.js" runtime, so the golden page keeps mirroring the
  page.
- `tools/kit_test.mjs`: a new test. It runs the array and predicate forms, checks a left-out family's id builds classic,
  and checks that no filter still loads every family.

Proof:
```
node --test tools/kit_test.mjs                 tests 37, pass 37, fail 0
  (filter line removed from runtime.js)        pass 36, fail 1: "✖ preload: a families filter …" (the test can fail)
node tools/rooftop_golden.mjs                  rooftop golden: EQUAL; routing ok 41/41
node tools/rooftop_golden.mjs --query "assets=modular" --out …   (9f7c0ed and the change)
   9f7c0ed: kit loaded, 187 kit ids, 521 instances · change: kit loaded, 47 kit ids, 521 instances
   cmp roof-mod-before.json roof-mod-after.json → BYTE-IDENTICAL; routing 41/41 both
sandbox /kyoto-rooftops.html?assets=modular (performance resource entries):
   before: 28 families, 129 src/kit requests · after: roofcanal, roofcast, rooffestival, roofstreets, 29 requests
   ?assets=classic: 0 families, errors [] warnings []
```

## Item 1b: ruling R84

`src/kit/budgets.js` roof-machiya hero `buildMs: 12` → `15`. The `why` now cites the post-merge quiet re-read
(`reports/r2b-roofs-streets-merge-report.md`, `docs/fable/status/r2b-roofs-streets.md`: 9 runs at load 1.3–1.5, 6 pass
at 12, max 13.7 ms, cold 64–77 ms), R84 and R54.

```
run 1 load 1.73 1.61 1.49 → 14 assets, 42 asset×tier builds, 837 checks, 0 failed — PASS: kit contract
run 2 load 1.73 1.61 1.49 → 837 checks, 0 failed — PASS
run 3 load 1.73 1.61 1.49 → 837 checks, 0 failed — PASS
(the runs take about 2 s each, so uptime did not tick between them)
three further reads at load 1.98: roof-machiya hero warm 12.1 / 11.8 / 12.2 ms (cold 69.6–70.0) ≤ 15
```

## Item 1: board

All §6 Phase 5 rows were already `[x]` (r1 operator-merged under R69; r2 parts a and b; r3 a and b; r4 a and b; r5 a and b;
r6). I added a "Board notes (G-R chores, 2026-11-16)" section.
- **Roof Road kit coverage:** 47 of the 62 Roof Road inventory ids are in the four roof families (roofcanal 16,
  roofcast 5, rooffestival 12, roofstreets 14). `roof-chidori` is a CharacterDef.
- **Deferred, classic (not blockers):**
  - r2 part c: `roof-bridge`, `roof-corner-house`, `roof-roji`, `roof-balconies`, `roof-zushi`, `roof-alley-pockets`,
    `roof-alley-routes`, `roof-street`, `roof-ground`, `roof-kawara-roofs`, `roof-facades`.
  - r3: `roof-willows`, `roof-culvert-ledges`, `roof-tenmangu-gate`.
- **Valley rows:** `valley-seven-posts` and `valley-odoi` are classic on both sets.
- **Still pending (optional):** the r6 §2.3 `catalog/js/links.mjs` wording.

## Item 2: cache tag `20261116a`

- **Rewrite:** a byte-safe Node rewrite of the literal `?v=20261114a` → `?v=20261116a`, with a UTF-8 round-trip check and
  a CRLF-count check.
  - 191 files, 575 tags.
  - index.html keeps its CRLF: 969 CR before and after.
- **Files:**
  - `src/**`, `index.html` and `labs/shared/game.js`;
  - the tools pages and scripts that import game modules (the cat, footprint, grass, hidden, summit, town, tree and kit
    contract pages, `place_asset_test.js`, `villagers_check.js`, `rooftop_golden.js`);
  - `rooftops/js/{game,build,sky,atmosphere}.js` and `rooftops/js/pieces/{common,paint}.js`;
  - `cadJS/src/kit-params.mjs`. It imports `src/kit/contract.js` with the tag, and it is the only cadJS file staged.
- **Kit index:** `node tools/kit_index.mjs` → "wrote src/kit/index.js (28 families …, tag 20261116a)".
- **AGENTS.md:**
  - "Current tag" is now `20261116a`;
  - the R64 exception text is dropped (R70 ended it);
  - the hand-bump list is completed (sky.js, atmosphere.js, tools pages, kit-params.mjs, with a `git grep` recipe).
- **Skipped:** `Shinkansen/**` and `Skretch/**` (operator WIP), and `docs/**` (records).

Proof (gate-v3 item 4 grep):
```
$ grep -rn "?v=2026" --include='*.js' --include='*.html' --include='*.mjs' . | grep -v 20261116a | grep -v node_modules
Shinkansen/index.html:10:  <link rel="stylesheet" href="style.css?v=20261114a">          (skipped by the brief)
Shinkansen/index.html:72:  <script type="module" src="js/game.js?v=20261115a"></script>   (skipped by the brief)
docs/social/cat-anatomy-glow-up/source/capture/harness/capture.js:16:const TAG = '?v=20261022e';   (archived, as at G-V3)
```
check_syntax 192 OK · kit_check 534 OK · `kit_index --check` "in sync (28 families, tag 20261116a)" · kit_test 37/37 ·
labs_check OK · verify "All checks passed".

`git -c core.whitespace=cr-at-eol diff --check` is clean. Plain `--check` reports one line, `index.html:1018`, which is its
CRLF ending.

## Item 3: play-through (G-R's core)

Script: `_scratch/gate-r/gr_drill.mjs` (adapted from r6's drill). Real game, `/index.html?assets=<set>`, new save, Metal,
real-time game loop (60 fps). Logs: `_scratch/gate-r/drill/{classic,modular}.log`, screenshots
`drill/<set>-{0-walk,1-posts,2-arrival,3-pause,4-finale,5-lantern,6-home,7-reload}.png`.

| Step | classic | modular |
|---|---|---|
| Asset set (runtime summary) | classic, kit not loaded | modular, 261 valley kit instances |
| New save: manager locked, nothing of the run downloaded | PASS | PASS |
| Walk from the spawn to the bridge with the real W key | PASS (0,0,0) → (0, 0.47, 24.9), 24.9 m | PASS 25.0 m |
| Seven Posts: 3 lit on a partial walk, stepping off resets; full north→south walk unlocks (journal `odoi-gate`) | PASS | PASS |
| Odoi thicket open after ≈ 3 s | PASS | PASS |
| Failed pocket load (r6 I1): back on the bridge z 35.2, input on, one "not ready" line, save at z 35.2 | PASS | PASS |
| Into the gap: noren veil `show` → `show out` → `hidden`; in 1.0 / 1.1 s; cat under the run, camera below the valley, `rooftop-mode`, arrival hint | PASS | PASS |
| Shōki 1 greeted (bit 0, keepsake `roof-shoki-1`) | PASS | PASS |
| Autopilot 8 s (s ≈ 41), Esc → "Leave the Roof Road" → home at z 35.2, game resumed; button hidden in the valley | PASS | PASS |
| Second visit starts at s 1, mouth 1, fires out, Shōki 1 kept | PASS | PASS |
| **The autopilot runs the whole route** from s 1 to the finale perch s 1673.08 (mouths 1–11, 515 / 516 s, Shōki 1 2 3 5 6 greeted on the way) | PASS | PASS |
| Finale: five fires lit, quiet moment `roof-road-okuribi`, `rooftopFinished` | PASS | PASS |
| Follow the lantern (D) → valley at (-1, 0.87, 35.2), camera far 700 | PASS | PASS |
| Save: `rooftopsUnlocked` true, `rooftopShoki` 55, `rooftopFinished` true, y 0.87 (never the pocket) | PASS | PASS |
| Reload (continue): unlocked, mask 55, finished, Odoi open, not active, cat at (-1, 0.87, 35.2) | PASS | PASS |
| **Total** | **21 / 21** (581 s) | **21 / 21** (582 s) |

Console, both sets (no ignore filter):
- errors: `Failed to load resource … 404 (/cad-overrides.json)` (×2: boot and reload; pre-existing optional file), and
  `[rooftops] the Roof Road could not be built: gate-r drill: simulated no network (/src/rooftops/manager.js?v=20261116a:222)`
  (the drill's own injected failure);
- warnings: none.

A separate check on the modular pocket (`game.rooftops.pocket.assets.summary()` after entering): set modular, 47 roof
ids, 525 instances. The pocket's runtime still loads all 28 families; lane b1-build-budget handles that.

## Item 4: saves from before the Roof Road

The saves were made headlessly on scratch worktrees of 08bd3b5 and 8ab0c9b: a new game, the cat at (6, 0, 4), a journal
place `old-place`, then `saveGame()`. They are 31 keys, and `worldFlags` holds only `mistCharm`, `summitUnlocked`,
`summitBellRings` and `onSummit`. Each save was loaded on the head with `catwalk_autostart=continue`:

| Save | set | pos | old-place | Roof Road state | keys added by the next save |
|---|---|---|---|---|---|
| 08bd3b5 | classic | [6,0,4] | 1 | locked, mask 0, not finished, Odoi closed | none at top level; flags `rooftopFinished`, `rooftopShoki`, `rooftopsUnlocked` (defaults) |
| 08bd3b5 | modular | [6,0,4] | 1 | same | same |
| 8ab0c9b | classic | [6,0,4] | 1 | same | same |
| 8ab0c9b | modular | [6,0,4] | 1 | same | same |

All four are `ok: true`. The console showed only the cad-overrides 404. No new required key. Files:
`_scratch/gate-r/saves/`.

## Item 5: gate checks (head 0623272 unless noted; the 078faf3 commit is guide text only)

**G1:**
```
node tools/check_syntax.mjs     All 192 modules OK
node tools/verify.mjs           All checks passed (10 Roof Road game modules; summit_test 83/0; rooftop_manager_test 81/0;
                                kit_test 37/37; a1_village_test 6/6)
node tools/kit_check.mjs        All kit checks OK (534 passed)
node --test tools/kit_test.mjs  tests 37, pass 37, fail 0
node tools/cad_overrides_test.mjs   27 passed, 0 failed
node tools/labs_check.mjs       All labs checks OK
git -c core.whitespace=cr-at-eol diff --check 9f7c0ed..HEAD   clean (plain: 1 line, index.html CRLF)
```

**G2:**
```
uptime (before the contract runs)  load averages: 1.10 1.44 1.44
footprint_golden                   EQUAL (valley 49233 draws, probe ok)
footprint_golden --systems         EQUAL (vegetation 249867 draws, probe ok)
footprint_golden --query "?assets=modular"   DIFFERENT (60 changed, 657 added, 403 removed) = the known G-V3 modular diff
                                   (shishi rocker 0.18 m, hidden.lanterns → kit); counts 521 colliders, 65 platforms, 5 water
                                   rects, 5 exclusions, 25 anchors (G-V3 + the Odoi's 3 colliders and 1 exclusion); rng 49233
summit_golden                      EQUAL; routing 32 ids, 34/34 stand-ins, single swaps 32/32; summit_test 83/0 identical to
                                   golden; 9 advisory entries (known, G-V3 review M6)
summit_kit_parity                  EQUAL
cat_golden                         EQUAL (40 passed, 0 failed)
rooftop_golden                     EQUAL; routing 41/41
rooftop_golden --query assets=modular   DIFFERENT as expected (2030 changed, 2 added, 1477 removed); 47 kit ids, 521
                                   instances; routing 41/41; digest byte-identical to 9f7c0ed's
rooftop_test                       40 passed, 0 failed
rooftop_companion_test             7 companion/ceiling checks passed
rooftop_alley_test                 PASS six alleys …
rooftop_manager_test               81 passed, 0 failed
ground_wear_test                   14 passed, 0 failed
a1_village_test                    tests 6, pass 6, fail 0
kit_contract_test (all families)   RED — see BLOCKED
```

**G3:**
```
catalog_check            OK Asset Library: 21 modules, 254 records, 243 evidence targets, 134 pictured assets, 414 WebP files
labs_coverage            OK 37 source modules, …, 69 Roof Road modules, 48 Roof Road piece types, 254 inventory rows
labs_coverage_test       tests 18, pass 18, fail 0
catalog tests            tests 50, pass 50, fail 0
cd cadJS && npm run check    15/15 + 16/16 tests passed; kit assets read: 187 from 28 families
cd dawCAT && npm test        251 passed, 0 failed
fable_swap_matrix        OK swap matrix: 250 rows = 250 active inventory rows
```

**G4:**
- **Boots:** `/index.html?assets=classic` and `?assets=modular` (autostart new), plus `/__boot.html` (default, classic).
  - Classic: frame 304, quality high, 60 fps.
  - Modular: frame 305, 261 kit instances.
  - `/__boot.html`: frame 155.
  - errors: only `/cad-overrides.json` 404; warnings: none.
- **Classic `game_shot` pairs**, main 8ab0c9b (scratch worktree) vs the head, `…&nohud=1&shot=1&assets=classic`:

| Spot | query | draws main / head | diff |
|---|---|---|---|
| street noon | `hour=12&cam=0,2.4,18.2,0,1,14` | 476 / 476 | maxDelta 0, mean 0, px>8 0 |
| shrine dusk | `hour=18&cam=0,2.4,-14.8,0,1,-19` | 140 / 140 | maxDelta 0, mean 0, px>8 0 |
| river night | `hour=22&cam=13.05,2.4,27.08,9,1,28.2` | 325 / 341 (+52,044 tris) | maxDelta 130, mean 0.067, px>8 1,640 |
| meadow rain | `hour=10.5&weather=rain&cam=-14.65,2.4,15.26,-12,1,12` | 458 / 458 | maxDelta 0, mean 0, px>8 0 |

River night is the only frame that shows the new objects. The camera at x 13 looks west along the bridge. The diff
(`shots/river-diff.png`) is confined to:
- the row of giboshi caps on the bridge railing posts (Seven Posts, R6.1);
- the Odoi bank, its crest bamboo and the ground in front of it, at the left edge (R6.2; the meadow mask change r6
  recorded around the Odoi).

The +16 draws are those objects. Nothing else differs.

## BLOCKED: `kit_contract_test` warm builds on a quiet machine

This is not integration glue, and the chores do not loosen budgets (R54), so I left it for a ruling.

All families (head, after the tag bump):
```
run 1 (load 1.10 → 1.82): 187 assets, 561 asset×tier builds, 14875 checks, 4 failed
  FAIL roof-hayashi [hero] warm build ≤ 8 ms (AAA-7) — 8.1 ms (cold 27.0 ms)
  FAIL roof-hayashi [far] warm build ≤ 1.5 ms (AAA-7) — 1.6 ms (cold 8.8 ms)
  FAIL roof-okuribi [mid] warm build ≤ 3 ms (AAA-7) — 4.6 ms (cold 4.3 ms)
  FAIL roof-okuribi [far] warm build ≤ 3 ms (AAA-7) — 4.6 ms (cold 5.0 ms)
run 2 (load 1.69): 4 failed
  FAIL roof-hayashi [far] 1.7 / 1.5 · FAIL roof-hayashi [mid] 4.2 / 4 · FAIL roof-okuribi [mid] 3.1 / 3 · FAIL valley-ground [far] 2.2 / 2
run 3 (load 1.51): 4 failed
  FAIL roof-hayashi [far] 1.7 / 1.5 · FAIL roof-okuribi [far] 3.4 / 3 · FAIL roof-okuribi [mid] 3.5 / 3 · FAIL summit-bay [mid] 3.4 / 3
merge OK, self-test OK each time
```

Per family (head, load 1.27–2.05). roofcanal: 0 failed ×3. roofstreets: 0 failed ×3 (item 1b).

| Family | run 1 | run 2 | run 3 |
|---|---|---|---|
| roofcast | 2 failed: hayashi far 1.6, hero 8.5 | 0 failed | 1 failed: hayashi mid 4.2 |
| rooffestival | 1 failed: okuribi far 3.7 | 1 failed: distant-city hero 8.1 | 2 failed: okuribi far 3.4, mid 3.3 |

The same on the pre-chores tree 9f7c0ed (scratch worktree, load 2.5–2.6), so this is pre-existing:

| Family | run 1 | run 2 | run 3 |
|---|---|---|---|
| roofcast | hayashi far 1.7, mid 4.1 | hayashi far 1.6, mid 4.1 | hayashi hero 8.5 |
| rooffestival | okuribi far 3.3, mid 3.3 | okuribi mid 3.5 | okuribi mid 3.4 |

Single-asset reads (`?asset=<id>`, 6 runs each, load 1.55–2.81). These are colder than the gate's family and all-family
runs, so they are pessimistic:
- roof-hayashi: hero 8.3–8.9 / 8 (6 of 6 over), mid 3.8–4.2 / 4 (1 of 6), far 1.6–2.0 / 1.5 (6 of 6);
- roof-okuribi: mid 3.2–3.5 / 3 (6 of 6), far 2.8–3.5 / 3 (3 of 6), hero 3.6–4.3 / 6;
- roof-distant-city: hero 9.8–11.6 / 8 (6 of 6; 8.1 once in a family run), mid 1.8–2.2, far 0.5–0.7;
- valley-ground: far 1.4–1.6 / 2 (pass), hero 2.5–6.7 / 6 (1 of 6);
- summit-bay: everything passes (mid 0.5–0.7).

The raw numbers are in `_scratch/gate-r/quiet-reads.txt`.

Options for the Integrator (my view, not applied):
- (a) An R84-style ruling from these quiet numbers: roof-hayashi hero 10, mid 5, far 2.5; roof-okuribi mid 4, far 4; and
  possibly roof-distant-city hero 12. Then valley-ground far and summit-bay mid stay on the watch list as one-offs.
- (b) Send the warm-build cost back to r4/r5 or a3-rooftops.

  Okuribi's own `why` says its warm build is "the glyph canvas sampling". Hayashi builds three seated musicians at 34k
  tris.

G-R can be ticked once a ruling makes the all-families contract pass on a quiet machine. Everything else in items 1–5 is
green.

## Item 5b: operator layout notes (recorded in the §6 G-R note, not fixed)

I re-checked each note on this head:
- **Overlapping stage-2 legs** block the camera near s ≈ 1010 and s ≈ 1558 (and s ≈ 1424), per the route-fix report.
- **Mouth 12 (Yasaka)** has zero length: `buildLevel()` gives s0 = s1 = 1709.47 on a 1709.5 m rail with 13 mouths.
- **`roofRoad.view`** reads `view.cam.center` (`rooftops/js/game.js:730`), which is undefined under `?finale=1` before
  the camera is placed.
- **`tools/rooftop_browser_test.mjs:51`** asserts `residents === 30`; the route builds 40.

## Item 6

G-R is **not ticked**: item 5's contract is red. §0 now says the chores are done, names the ruling as the first step,
and then the G-R review. Its watch list is updated (machiya 15 ms since R84, plus the new flakes). Nothing was merged to
main.

## Files changed (9f7c0ed..078faf3)

- `src/kit/runtime.js`, `tools/kit_test.mjs`, `rooftops/js/game.js` (the option line, then the tag), `tools/rooftop_golden.js`;
- `src/kit/budgets.js`;
- `BUILD_GUIDE_FABLE.md` (§6 notes, the G-R note, §0);
- `AGENTS.md`;
- 191 tag-bumped files (src/**, index.html, labs/shared/game.js, tools pages, rooftops/js/**, cadJS/src/kit-params.mjs),
  including `src/kit/index.js` (regenerated).

Nothing under dawCAT/, Shinkansen/ or Skretch/. The main checkout's working tree was not touched; the only file written
there is this report under `.superpowers/`.

## Other observations (not blockers)

- `cad-overrides.json` 404 on every boot. It is pre-existing and optional.
- The finale frame (`drill/classic-4-finale.png`) shows Michi at the left edge with Chidori centre. This is a framing
  matter for a3-rooftops.
- The game's pocket runtime still imports all 28 families on modular. Lane b1-build-budget plans the lazy roof-family
  import.

## R85 apply

Commits: 70ba95e (R85a budgets: roof-hayashi hero 10 / mid 5 / far 2.5, roof-okuribi mid 4 / far 4, roof-distant-city hero 13), 1402ec0 (R85b: AAA-7 warm build = median of 3, text "warm build (median of 3) ≤ N ms"; new `slowBuild` fixture burns 12 ms vs the 6 ms hero budget).

Self-test proof: `PASS slowBuild → warm build (median of 3) ≤ 6 ms (AAA-7)`; self-test OK.

All-families `node tools/kit_contract_test.mjs`, each 187 assets / 561 builds / 14875 checks:
- run 1, load 1.12: 0 failed
- run 2, load 1.26: 1 failed, `summit-pagoda [mid] warm build (median of 3) ≤ 3 ms`, 3.9 (reads 3.9 / 5.0 / 1.5; cold 9.0); a one-off (watch-list asset), not repeated
- run 3, load 1.54: 0 failed
- extra run 4, load 2.27: 0 failed; extra run 5, load 2.32: 0 failed
Runs 3-5 are three consecutive clean runs at load < 3; the one failure in run 2 is recorded above. G-R was ticked on that basis.

Other: kit_test 37/37, kit_check OK (534), check_syntax 192 modules OK, verify all passed, cadJS check 15/15 + 16/16 (187 kit assets), catalog 50/50.
