# Report: r1-roof-split

- Lane: `r1-roof-split` (BUILD_GUIDE_FABLE.md §12, Phase 5, R1.1–R1.5) under Integrator ruling R57
- Worker: Claude Opus 5.5. This session resumed the lane after the first session ended at 79fb75d.
- Worktree / branch: `/Users/c1t1zen/Documents/GitHub/michi-wt/r1-roof-split`, `fable/r1-roof-split`
- Base: 8702cc7 (fable/integration). `origin/fable/integration` 2f78865 was merged in at a0b5d43 with no conflict.
- PR: https://github.com/c1t1zen1/Michi-Neko-The-Cat-Philosophers-Path/pull/44 (into `fable/integration`)
- Status: **DONE_WITH_CONCERNS**. The concerns are small and listed at the end.

## Commits (origin/fable/integration..HEAD)

| SHA | Subject |
|---|---|
| f6ab225 | claim the lane (status file, R57 pre-check) (session 1) |
| 772433e | rooftop numeric golden from the unchanged build.js (session 1) |
| 2cda1e5 | move the Roof Road's materials and geometry helpers into rooftops/js/pieces/ (session 1) |
| 5dd53a9 | move the mouth 1-2 pieces (lane r2) into rooftops/js/pieces/ (session 1) |
| f32fb47 | move the mouth 3-5 pieces (lane r3) into rooftops/js/pieces/ (session 1) |
| 92efc80 | move the mouth 6-7 pieces (lane r4), the skyline and the pickups into rooftops/js/pieces/ (session 1) |
| f4f9725 | build.js walks a PIECES table (pieces/index.js) (session 1) |
| 79fb75d | route every Roof Road piece through its own AssetRuntime (R1.3) (session 1) |
| 5c2061a | resume; verify and tick R1.0, R1.4a, R1.2, R1.3 |
| a0b5d43 | Merge origin/fable/integration (2f78865: v-water, s3-vista, G-V2 chores) |
| 0e4b43f | Roof Road lab, a shelf of every piece type (R1.5) |
| 3baa445 | Roof Road inventory group, coverage accounting, swap matrix lanes (R1.1) |
| 7cce6c0 | handoff, proof (R1.4) and status |
| 28c4709 | status, PR #44 |

## What was built

### Verification of session 1's work (R1.0, R1.4a, R1.2, R1.3)

Before ticking these steps, I checked each of session 1's claims myself:
- **Golden written from the unchanged code.** I exported 772433e (build.js as it was at 8702cc7) with `git archive` and ran `node tools/rooftop_golden.mjs` on it: `EQUAL … byte-identical`. Running HEAD's tool on the unchanged 8702cc7 tree gives `EQUAL, ROUTING FAILED` (exit 1): the routing self-test correctly catches the build.js from before routing. `git diff --stat 772433e HEAD -- tools/golden/` is empty, so the golden was never rewritten.
- **The split moved code; it did not rewrite it.** My own check counts every line of the 8702cc7 build.js and compares it with build.js + pieces/*.js at 92efc80, the last commit that only moves code. It finds 40 lost lines: the 35 `B.x = (pc, ctx) => {` heads (now `export const x = (pc, ctx) => {`), 4 import lines and 1 section banner. Every body line is still there, and no piece module refers to `B`. PIECES has 48 types: the 35 original `B` builders plus the 13 `installDowntown` builders. The house and yatai pieces keep their downtown dressing pass (`decorate`), in the same order as before.
- **Routing.** `game.js` constructs the AssetRuntime the way `main.js` does. `build.js` scopes it to the world's `M` and calls `assets.build(PIECES[type].id, pieceLayout(pc, i, rail), classic)`. The golden is EQUAL on classic, on `?assets=modular` and on `?swap=`.

### R1.5: the Roof Road lab (`labs/roofroad/`)
- The lab runs on the shared workshop (`runLab`, with no stage). It has 52 tiles: one per PIECES type, plus the distant city, a skyline pagoda, the Shōki and a treat. Each tile is the classic builder run read-only on the real `buildLevel()`. It builds the first piece of its type, with the same ctx shape `buildWorld()` hands it, and turns the piece into its `pieceLayout` rail frame.
- The shelves follow the lanes (r2, r3, r4, r5). `?specimen=<type>` reveals one tile, which is how the Asset Library links them. Picking a tile shows the piece's mouth and arc length and links to `kyoto-rooftops.html?at=<s>`. Mouth links are generated from `level.mouths`, so no mouth count is hard-coded.
- The `roofroad` extra in `labs/registry.js` now opens the lab. It stays an extra, as `trees` does, so `labs_check`'s "22 labs" check is unchanged. Files: `index.html`, `style.css`, `research.md`, `js/main.js`, `js/shelf.js`.

### R1.1: inventory, coverage accounting, swap matrix
- **`labs/asset_inventory.json`**: a new `Roof Road` group of 62 active rows, and the Roof Road is no longer an exclusion.
  - 48 rows are piece types, with the exact ids `buildWorld` routes.
  - 14 rows are other things: `roof-kawara-roofs`, `roof-facades`, `roof-ground`, `roof-distant-city`, `roof-skyline-pagodas`, `roof-sky`, `roof-hills`, `roof-okuribi`, `roof-atmosphere`, `roof-shoki`, `roof-treats`, `roof-chidori`, `roof-boatman`, `roof-hayashi`.
  - All 56 `rooftops/js` modules are classified. The runner modules are `excluded`; helpers are `support`.
  - 3 new ignored builders: `buildWorld`, `makeMaterials`, `makeCutaway`.
  - 54 new targets: one per shelf tile, plus `roofroad/run` and `roofroad/finale`.
  - Coverage is honest: **58 review, 4 embedded, 0 direct**.
  - Existing data is unchanged; an equality check on the old prefix holds.
- **`tools/labs_coverage.mjs`** now also accounts for the Roof Road. Each of these fails the check:
  - an unclassified Roof Road module;
  - an unowned `build/create/make` method or function in a Roof Road module that draws (role `assets` or `support`);
  - a PIECES type without an inventory row in the Roof Road group;
  - a piece row whose sources do not name the piece's module;
  - two piece types sharing one id.

  The report prints the new totals. No existing check was loosened.
- **`tools/labs_coverage_test.mjs`** has 5 new tests (16 in total), and each one proves a rule fails.
- **`tools/fable_swap_matrix.mjs`**:
  - lanes `r2-roofs-streets` (25 rows), `r3-canal-market` (19), `r4-festival` (12) and `r5-roof-cast` (6);
  - a new basis `pieces`, for piece types the §12 card does not name;
  - a check that every piece row's lane matches PIECES. I tried two faults in a scratch copy, and both were caught.

  The generator writes the regenerated `docs/fable/baseline/swap_matrix.md`.
- **`labs/ASSET_COVERAGE.md`** is regenerated.

### R1.4: proof (on the final tree)
Every result is listed in the next section.

## Checks run (command → real output)

| Command | Result |
|---|---|
| `node tools/rooftop_golden.mjs` | `rooftop golden: EQUAL`, byte-identical; 441 pieces (573 adds, 0 empty) · 670 platforms · 172 walls · 20 ceilings · 156 lights · 61 root children · 1715 batches (1880448 vertices) · 107 materials; `routing ok … 7 pieces (legs +x -z -x +z); 27/27 checks` |
| `… --query "assets=modular"` | `rooftop golden: EQUAL` |
| `… --query "swap=roof-machiya:modular,roof-bridge:modular,roof-kido:classic"` | `rooftop golden: EQUAL` |
| golden on the unchanged tree (772433e / 8702cc7) | `EQUAL` (session 1's tool); `EQUAL, ROUTING FAILED` (HEAD's tool, as intended) |
| `node tools/rooftop_test.mjs` | `40 passed, 0 failed` |
| `node tools/rooftop_companion_test.mjs` | `7 companion/ceiling checks passed` |
| `node tools/rooftop_alley_test.mjs` | `PASS six alleys: both entrances, jumps, exits, guide following, reversal and lane isolation` |
| `?auto=1` on the real page: `headless.mjs "/kyoto-rooftops.html?qa=1&auto=1&shadows=0"` + `roofRoad.advanceForReview(450)`, run with no flag, with `&assets=modular` and with `&swap=roof-machiya:modular,roof-bridge:modular` | `finale: true`, s = 1031.6 of 1082.1 m, page errors `[]`, on all three |
| `node tools/footprint_golden.mjs` | `footprint golden: EQUAL` (valley_classic.json byte-identical) |
| `node tools/check_syntax.mjs` | `All 162 modules OK` |
| `node tools/verify.mjs` | `All checks passed` (kit_test 36/36) |
| `node tools/kit_check.mjs` | `All kit checks OK (422 passed)` |
| `node tools/labs_check.mjs` | `All labs checks OK` |
| `node tools/labs_coverage.mjs` | `OK 37 source modules, 112 construction methods, 56 Roof Road modules, 10 Roof Road construction functions, 48 Roof Road piece types, 252 inventory rows, 243 evidence targets`; `Active coverage: direct=152, review=77, embedded=6, related=10, missing=3` |
| `node --test tools/labs_coverage_test.mjs` | `tests 16, pass 16, fail 0` |
| `node tools/fable_swap_matrix.mjs` | `OK swap matrix: 248 rows = 248 active inventory rows, 30 lanes plus at-standard and media, 18 judgement calls` |
| `node tools/catalog_check.mjs` | `OK Asset Library: 21 modules, 252 records, 243 evidence targets, 134 pictured assets, 414 WebP files (2.65 MB), 126 active editable entries` |
| `cd catalog && npm test` | `tests 50, pass 50, fail 0` |
| lab: `headless.mjs "/labs/roofroad/"`, scrolling to every tile | 52 tiles built, errors `[]` (e.g. bridge 5.3k tris/148 draws, float 7.7k/170, distant city 83k/2); `?specimen=bridge` focuses the bridge tile |
| `git diff --check origin/fable/integration...HEAD` | clean |

## R57 compliance and the stage-2 probe
- **Untouched files.** `git diff origin/fable/integration...HEAD -- rooftops/js/{level,rail,physics,reach,autopilot,companion}.js` is empty.
- **origin/main.** It moved to a3221d4, which only adds `Shinkansen/`: `git diff --stat 414225f a3221d4 -- rooftops src tools` is empty. As the Integrator ruled, this is not a stop condition.
- **Merge with stage 2.** `git merge-tree --write-tree fable/r1-roof-split 17c9cae` exits 0 with no conflict (tree 4c82f6c). In a scratch export of that tree:
  - the facade builds all 829 pieces (0 empty), and the routing self-test passes 27/27;
  - the golden is `DIFFERENT`, which is expected because the level changed;
  - `rooftop_test` gives 38 passed, 2 failed. 17c9cae on its own fails the same two checks ("every piece sits on one straight leg", "autopilot reaches the perch"), so they belong to that branch, not this lane.

  I never committed 17c9cae anywhere and did not touch that branch or its worktree.

## Files changed (vs fable/integration)
- `rooftops/js/build.js` (facade) and `rooftops/js/game.js` (+AssetRuntime)
- `rooftops/js/pieces/*.js`: 41 new files
- `tools/rooftop_golden.{html,js,mjs}` and `tools/golden/rooftop_classic.json`
- `labs/roofroad/{index.html,style.css,research.md,js/main.js,js/shelf.js}` and `labs/registry.js`
- `labs/asset_inventory.json`, `labs/ASSET_COVERAGE.md`, `tools/labs_coverage.mjs`, `tools/labs_coverage_test.mjs`
- `tools/fable_swap_matrix.mjs`, `docs/fable/baseline/swap_matrix.md`
- `docs/fable/status/r1-roof-split.md`, `docs/fable/handoff/r1-roof-split.md`

## Assets promoted / deferred
No assets were promoted. This is the serial split lane. All 62 Roof Road rows stay classic and are routed through `assets.build`, waiting for lanes r2–r5. The handoff maps every id to its lane and explains how a kit piece registers.

## Footprint waivers
None.

## Self-review against the brief
- [x] R57: only build.js was split, plus the minimal game.js edit. The runner and companion modules are untouched. The split stays generic by piece type, and the merge-tree probe against 17c9cae is clean.
- [x] R1.1: Roof Road group (62 rows, including the downtown and agility builders that are on main); exclusion removed; coverage honest; labs_coverage totals and its test updated with nothing loosened; swap matrix lanes r2–r5 added.
- [x] R1.2: PIECES table with one module per piece type. The code was moved; `buildWorld` keeps its API.
- [x] R1.3: the Roof Road has its own AssetRuntime: classic by default, `?assets=` and `?swap=` honoured, and the tagged `src/kit/runtime.js` import. Modular is identical to classic, confirmed by the golden.
- [x] R1.4: rooftop_test 40/40, the companion test, `?auto=1` completing, and a numeric golden written before the split that is EQUAL after it.
- [x] R1.5: the `roofroad` extra is promoted to a lab with a 52-tile piece shelf, and every row has a specimen page the catalog can link.
- [x] Status file, handoff, report and PR are done.

## Open concerns
1. **Catalog context link.** For Roof Road rows, `catalog/js/links.mjs` `originalContextLink()` falls back to "Open the game" (`index.html`), which does not contain the Roof Road. This is t1's file. The handoff §4.2 has the exact patch. The evidence links themselves already open the lab and the run.
2. **AGENTS.md needs updating.** The cache-tag hand-bump list should add `rooftops/js/pieces/paint.js`, `rooftops/js/pieces/common.js` and `tools/rooftop_golden.js`. The Roof Road check count should read 40, the golden tool should be mentioned, and the coverage regeneration note should cover anchored `rooftops/js` files. These patches are in handoff §4.1, because AGENTS.md is a hot file.
3. **No automated cache-tag check for `rooftops/js/**`.** The handoff §4.3 suggests one for verify.
4. **The coverage report is now sensitive to `rooftops/js` edits.** `ASSET_COVERAGE.md` embeds line anchors from build.js, game.js, downtown.js, sky.js, atmosphere.js and pieces/*.js, so editing any of them makes the report stale until `node tools/labs_coverage.mjs --write` is run. `level.js` and the runner modules carry no anchors, so the operator's stage-2 commit does not stale the report.
5. **The golden must be rewritten after stage 2 merges.** After the operator's stage-2 route is merged, run `node tools/rooftop_golden.mjs --write` once its two failing rooftop tests pass (handoff §5).
6. **Lab tiles show one representative piece.** Each tile is the first piece of its type, so for example `street` shows the Kamo gravel ribbon. Other variants of a type, such as other street surfaces or other machiya, appear only on the run.

## Fix round 1 (review r1)

Commits:
- 8218ec0 route the ground, city, pagodas and pickups through assets.build
- c62e49e one PIECES reader that cannot drop an entry
- ef1c04f handoff (routed extras, porting outside build.js edits), status, hub blurb

All three are pushed and on PR #44.

### Important 1: fixed
`rooftops/js/build.js` now builds every thing `buildWorld()` adds around the run with `assets.build(id, extraLayout(…), classic)`:
- **Ids routed:**
  - `roof-ground`;
  - `roof-distant-city`;
  - `roof-skyline-pagodas` (three instances, index 0–2, with `scale` from the classic call);
  - `roof-shoki` and `roof-treats` (one per level pickup, with `s`, `scale` and the `pickup` record).
- **Classic behaviour:** each classic callback holds the original lines unchanged, so the call order is preserved.
- **Kit placement:** a kit instance goes on the root, unmerged (`placePiece(…, { merge: false })`), where the classic one stands. A kit pickup's group is registered as the pickup itself (`userData.pickup`, `dynamic.shoki`/`treats`).
- **Shōki wobble:** `update()` gains a `children[0]` guard on the wobble; classic output is unchanged.
- **Error message:** the missing-type error now names the PIECES table (minor 2).

### Checks (real output)

**Rooftop golden**

| Command | Result |
|---|---|
| `node tools/rooftop_golden.mjs` | `rooftop golden: EQUAL`, byte-identical. 441 pieces (573 adds, 0 empty), 156 lights, 61 root children, 1715 batches. `routing ok: stand-ins on 9 pieces (kido, rack, boat; legs +x -z -x +z) and 10 extras (pagodas, Shōki); 35/35 checks` |
| `--query "assets=modular"` | `EQUAL` |
| `--query "swap=roof-machiya:modular,roof-bridge:modular,roof-skyline-pagodas:modular,roof-shoki:modular,roof-ground:modular"` | `EQUAL` |

**Routing self-test faults (scratch copies)**

| Fault | Result |
|---|---|
| Pre-fix `build.js` | `ROUTING FAILED` (`9 instances; 0 extras`, pagodas, Shōki) |
| `placePiece` ignoring `dynamic` | `ROUTING FAILED` (`2 kit boats, 0 world boats`, boat motion) |
| Extras merged instead of rooted | `ROUTING FAILED` (5 checks) |

**Run and repo checks**

| Command | Result |
|---|---|
| `node tools/rooftop_test.mjs` | `40 passed, 0 failed` |
| `node tools/rooftop_companion_test.mjs` | `7 companion/ceiling checks passed` |
| `node tools/rooftop_alley_test.mjs` | `PASS six alleys …` |
| `?auto=1` on the real page (`?qa=1&auto=1&shadows=0`, then `advanceForReview(450)`) | `finale: true`, s = 1031.6, on classic, `&assets=modular` and `&swap=roof-skyline-pagodas:modular,roof-shoki:modular,roof-ground:modular,roof-bridge:modular`. 7 Shōki and 14 treats registered, errors `[]` |
| `check_syntax` | `All 162 modules OK` |
| `verify` | `All checks passed` |
| `kit_check` | `All kit checks OK (422 passed)` |
| `labs_check` | `All labs checks OK` |
| `labs_coverage` | `OK … 56 Roof Road modules, 10 Roof Road construction functions, 48 Roof Road piece types, 252 inventory rows, 243 evidence targets` |
| `labs_coverage_test` | 17/17 |
| `fable_swap_matrix` | `OK … 248 rows` (output unchanged) |
| `catalog_check` / catalog tests | OK / 50 pass |
| `footprint_golden` | `EQUAL` |
| Lab, every tile | 52/52 tiles built, errors `[]` |
| `git diff --check` | clean |

### Minors
- **1. Fixed.** `readPieces()` in `tools/labs_coverage.mjs` counts every `piece(` call and fails when an entry cannot be read. `tools/fable_swap_matrix.mjs` imports the same reader, and there is a new test for it.
- **2. Fixed.** The missing-type error names the PIECES table (see above).
- **3. Fixed.** The `dynamic` branch is now in the routing self-test: a stand-in boat must join the world's boats and move exactly like the classic ones.
- **4. Not fixed; recorded in the Integrator notes.** `?assets=modular` loads the whole valley kit on the Roof Road page. r2–r5 reuse valley families, so the page needs the kit index anyway. A family filter (`loadFamilies`) belongs with the first Roof Road family.
- **5. Fixed.** The hub blurb now says the card opens the shelf and the run is one more click.

### Handoff (R65)
§2 and §3 now document the routed extras: their layouts, how they are placed, and the pickup registration. The new **§5 "Porting outside `build.js` edits"** gives the procedure:
1. Diff the old `build.js` from its base.
2. Keep the facade.
3. Map each hunk by its old function to the module that now holds it, using the table (`B.<type>` → `pieces/<type>.js`, helpers → `paint`/`common`/`machiya`/`pickups`/`skyline`, `buildWorld` → the facade).
4. Apply the hunk with rewritten paths.
5. Handle new types, new modules and deleted modules: PIECES entry, inventory row, shelf line, matrix row and `sourceFiles`.
6. Re-run `rooftop_test`, then `--write` the golden after confirming that only the ported pieces changed.
7. Regenerate the coverage and matrix files.

The stage-2 notes are now §6. AGENTS.md and `catalog/js/links.mjs` are untouched; they remain exact patches in §4.1 and §4.2. I did not read or touch the main checkout or the operator's branches.

### Status
DONE. The lane's merge into `fable/integration` stays held under R65 until the operator's work lands on main. It will then be merged and ported by §5.
