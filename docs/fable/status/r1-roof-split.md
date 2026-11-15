# r1-roof-split

- Worker / model:     Claude Opus 5.5 (claude-opus-5-5)
- Claimed:            2026-11-14 03:16 PST
- Branch:             fable/r1-roof-split
- Base commit:        8702cc7 (fable/integration; contains main 676506f, Roof Road stage 2)
- State:              done, awaiting review (resumed 2026-11-14 by a second Claude Opus 5.5 session after 79fb75d)

Lane: guide section 12, Phase 5, steps R1.1 to R1.5 under Integrator ruling
R57 (brief `r1-roof-split.md`). Splits `rooftops/js/build.js` into
`rooftops/js/pieces/<type>.js` behind the `buildWorld` facade, routes every
piece through its own `AssetRuntime`, inventories the Roof Road and registers
its lab. No change to `level.js`, `rail.js`, `physics.js`, `reach.js`,
`autopilot.js` or the companion code.

## R57 pre-check (2026-11-14, after `git fetch origin`)

`origin/main` is `414225f`, an ancestor of this branch's base `8702cc7`
(`git merge-base --is-ancestor origin/main HEAD` holds).
`git diff --stat 676506f origin/main -- rooftops` shows only the two cache-tag
lines (`build.js`, `game.js`) already on `fable/integration`. No Roof Road
change on `origin/main` past 676506f: proceed.

Update (Integrator, 22:25): `origin/main` moved 414225f → a3221d4, which only
adds a separate project under `Shinkansen/` (no `rooftops/`, `src/` or
`tools/` change): not a stop condition; the Integrator merges main into
integration at G-V3. Re-checked on resume: `git diff --stat 414225f a3221d4 --
rooftops src tools` is empty.

## Assets
| Inventory id | Promoted from (lab/specimen) | Parts | Tiers | Footprint | State |
|---|---|---|---|---|---|
| (none promoted: serial split lane; every Roof Road piece type is routed through `assets.build`, see the handoff) | | | | | |

## Steps
- [x] R1.0 Claim: R57 pre-check, this file (f6ab225)
- [x] R1.4a Rooftop numeric golden written from the unchanged code (772433e)
- [x] R1.2 Split `build.js` into `rooftops/js/pieces/` behind a `PIECES` table (golden EQUAL after each commit) (2cda1e5, 5dd53a9, f32fb47, 92efc80, f4f9725)
- [x] R1.3 Roof Road `AssetRuntime`, every piece through `assets.build` (79fb75d)
- [x] R1.1 Inventory group "Roof Road", coverage tool and test, swap matrix lanes (3baa445; after R1.5, whose shelf it maps)
- [x] R1.5 Roof Road lab registered with a shelf of the piece types (0e4b43f)
- [x] R1.4 Proof: rooftop tests, companion test, golden, checks (results below, on the tree after a0b5d43's merge of integration 2f78865)
- [x] Handoff (`docs/fable/handoff/r1-roof-split.md`), report, PR #44 (https://github.com/c1t1zen1/Michi-Neko-The-Cat-Philosophers-Path/pull/44)

## Checks run (command → real result)

Resumed 2026-11-14 by a second Claude Opus 5.5 session (the first ended
after 79fb75d). Everything below was re-run by the resuming worker before
ticking R1.0 to R1.3.

- Golden written from the unchanged code: `git archive 772433e` (build.js as
  at 8702cc7) into a scratch dir, `node tools/rooftop_golden.mjs` there →
  `rooftop golden: EQUAL … byte-identical to this build`, 441 pieces (573
  adds, 0 empty) · 670 platforms · 172 walls · 20 ceilings · 156 lights ·
  61 root children · 1715 batches (1880448 vertices) · 107 materials. The
  same unchanged tree with HEAD's golden tool → `EQUAL, ROUTING FAILED`
  (exit 1: the routing self-test catches the pre-routing build.js, as it
  should). `git diff --stat 772433e HEAD -- tools/golden/` is empty.
- HEAD 79fb75d: `node tools/rooftop_golden.mjs` → `EQUAL`, byte-identical,
  routing `ok … 7 pieces (legs +x -z -x +z); 27/27 checks`, exit 0.
  `--query "assets=modular"` → EQUAL; `--query
  "swap=roof-machiya:modular,roof-bridge:modular"` → EQUAL.
- Moves, not rewrites: an independent line-multiset check of the 8702cc7
  build.js against build.js + pieces/*.js at 92efc80 (the last pure-move
  commit) loses only 40 lines: the 35 `B.x = (pc, ctx) => {` heads (now
  `export const x = (pc, ctx) => {`), four import lines and one section
  banner. Every body line is present. No piece module refers to `B`.
  PIECES holds 48 types = the 35 original `B.x` builders + the 13
  `installDowntown` builders; house/yatai keep their downtown dressing pass.
- `node tools/rooftop_test.mjs` → `40 passed, 0 failed`.
- `node tools/rooftop_companion_test.mjs` → `7 companion/ceiling checks passed`;
  `node tools/rooftop_alley_test.mjs` → `PASS six alleys …`.
- `git diff --check 8702cc7 HEAD` → clean; every rooftops/js/*.js and
  pieces/*.js passes `node --input-type=module --check`.

Merged `origin/fable/integration` 2f78865 (v-water, s3-vista, G-V2 chores)
into the branch (a0b5d43, no conflict); golden still EQUAL, rooftop_test
40/40, check_syntax `All 162 modules OK`.

R1.4, final tree (after R1.5 and R1.1):

- `node tools/rooftop_golden.mjs` → `rooftop golden: EQUAL`, byte-identical,
  441 pieces (573 adds, 0 empty) · 670 platforms · 172 walls · 20 ceilings ·
  156 lights · 61 root children · 1715 batches (1880448 vertices) · 107
  materials; routing `ok … 27/27 checks`. `--query "assets=modular"` → EQUAL;
  `--query "swap=roof-machiya:modular,roof-bridge:modular,roof-kido:classic"`
  → EQUAL.
- `node tools/rooftop_test.mjs` → `40 passed, 0 failed`;
  `node tools/rooftop_companion_test.mjs` → `7 companion/ceiling checks passed`;
  `node tools/rooftop_alley_test.mjs` → `PASS six alleys …`.
- `?auto=1` on the real page: `node tools/headless.mjs
  "/kyoto-rooftops.html?qa=1&auto=1&shadows=0[&assets=modular | &swap=roof-machiya:modular,roof-bridge:modular]"`,
  `roofRoad.advanceForReview(450)` → `finale: true` at s = 1031.6 m on all
  three, moods saunter/dash/wait/detour/feint/prowl, page errors `[]`.
- `node tools/footprint_golden.mjs` → `footprint golden: EQUAL`
  (valley_classic.json byte-identical; the valley is unchanged).
- `node tools/check_syntax.mjs` → `All 162 modules OK`;
  `node tools/verify.mjs` → `All checks passed` (kit_test 36/36, kit checks
  422 passed); `node tools/kit_check.mjs` → `All kit checks OK (422 passed)`.
- `node tools/labs_check.mjs` → `All labs checks OK` (labs/roofroad syntax,
  extra roofroad → roofroad/); `node tools/labs_coverage.mjs` → `OK 37 source
  modules, 112 construction methods, 56 Roof Road modules, 10 Roof Road
  construction functions, 48 Roof Road piece types, 252 inventory rows, 243
  evidence targets`, `Active coverage: direct=152, review=77, embedded=6,
  related=10, missing=3`; `node --test tools/labs_coverage_test.mjs` →
  16 pass, 0 fail (5 new).
- `node tools/fable_swap_matrix.mjs` → `OK swap matrix: 248 rows = 248 active
  inventory rows, 30 lanes plus at-standard and media, 18 judgement calls`.
  Fault injection in a scratch copy: a PIECES lane changed to r3 →
  `FAIL Roof Road piece kido (roof-kido): PIECES says lane r3, this matrix
  says r2-roofs-streets`; basis `pieces` on roof-ground → `FAIL basis pieces
  on a row that is not a PIECES type`.
- `node tools/catalog_check.mjs` → `OK Asset Library: 21 modules, 252 records,
  243 evidence targets …`; `cd catalog && npm test` → 50 pass, 0 fail.
- The lab: `node tools/headless.mjs "/labs/roofroad/"` scrolling every tile
  → 52 tiles built, page errors `[]` (e.g. bridge 5.3k tris / 148 draws,
  float 7.7k / 170, distant-city 83k / 2); `?specimen=bridge` focuses the
  bridge tile.
- `git diff --check origin/fable/integration...HEAD` → clean.

### Fix round 1 (review r1)

- Important 1 fixed: the ground, distant city, three skyline pagodas, Shōki
  and treats now go through `assets.build(id, extraLayout(…), classic)` in
  `build.js`; a kit one is placed unmerged on the root where the classic one
  stands, a kit pickup registered as the pickup. `node
  tools/rooftop_golden.mjs` → `EQUAL`, byte-identical; `--query
  "assets=modular"` → EQUAL; `--query "swap=roof-machiya:modular,
  roof-bridge:modular,roof-skyline-pagodas:modular,roof-shoki:modular,
  roof-ground:modular"` → EQUAL. Routing self-test extended (stand-in boat
  with a `dynamic` record, 3 pagodas, 7 Shōki): `routing ok: stand-ins on 9
  pieces (kido, rack, boat; legs +x -z -x +z) and 10 extras (pagodas, Shōki);
  35/35 checks`. Fault injection in scratch copies: the pre-fix build.js →
  `ROUTING FAILED` (3 checks: 0 extras); `placePiece` ignoring `dynamic` →
  `ROUTING FAILED` (2 boat checks); extras merged instead of rooted →
  `ROUTING FAILED` (5 checks).
- `node tools/rooftop_test.mjs` → `40 passed, 0 failed`; companion 7/7; alley
  PASS; `?auto=1` (`?qa=1`, `advanceForReview`) → `finale: true` at s =
  1031.6 on classic, `&assets=modular` and
  `&swap=roof-skyline-pagodas:modular,roof-shoki:modular,roof-ground:modular,roof-bridge:modular`
  (7 Shōki, 14 treats registered; errors `[]`).
- Minors: 1 fixed (one PIECES reader, `readPieces` in labs_coverage, used by
  the swap matrix; it counts `piece(` calls and fails on any entry it cannot
  read; new test, 17/17); 2 fixed (the facade's error names the PIECES
  table); 3 fixed (the `dynamic` branch is now in the routing self-test); 5
  fixed (the hub blurb says the card opens the shelf and the run is one click
  on). 4 left (see notes).
- Re-run on the fixed tree: check_syntax 162 OK; verify `All checks passed`;
  kit_check 422 OK; labs_check OK; labs_coverage OK (anchors of the five
  extras moved to their `extra(...)` calls; ASSET_COVERAGE.md regenerated);
  swap matrix OK (unchanged); catalog_check OK, catalog tests 50/50;
  footprint golden EQUAL; lab 52/52 tiles, errors `[]`; `git diff --check`
  clean.

## Deferred assets and why

All 62 Roof Road rows stay classic: this serial lane splits and routes, it
promotes nothing. Each piece type is built through `assets.build(id, …)` and
waits for lanes r2 to r5 (handoff section 2).

## Footprint waivers requested

None (no kit asset; the footprint golden is EQUAL).

## Notes for the Integrator

- R57: `rooftops/js/level.js`, `rail.js`, `physics.js`, `reach.js`,
  `autopilot.js` and `companion.js` are untouched
  (`git diff origin/fable/integration...HEAD` on them is empty).
- Stage-2 probe (17c9cae, never committed here): `git merge-tree
  --write-tree fable/r1-roof-split 17c9cae` → exit 0, no conflict (tree
  4c82f6c). In a scratch export of that tree the facade builds all 829
  pieces (0 empty, routing self-test 27/27); the golden reads DIFFERENT as it
  must (the level changed) and `rooftop_test` is 38/2, the same two failures
  17c9cae has on its own. Rewrite the golden after that merge (handoff 6).
- R1.5 was committed before R1.1 because the inventory's Roof Road evidence
  targets anchor into the lab's shelf (`labs/roofroad/js/shelf.js`).
- The lab is a registry extra (as `trees` is), so `labs_check`'s "22 labs"
  stands; `tools/labs_coverage.mjs` accepts `roofroad` as a lab slug.
- Integrator patches in the handoff: AGENTS.md (rooftops row, cache-tag
  files, rooftop golden, coverage regeneration), `catalog/js/links.mjs`
  (Roof Road context link, t1's file), an optional verify cache-tag check.
- Review minor 4 (not fixed): `?assets=modular` on the Roof Road page
  preloads every valley kit family. Kept on purpose: the r2-r5 cards reuse
  valley families (machiya, lanterns, alley, water, trees, pagoda, ranges),
  so the page needs the kit index. A family filter (AssetRuntime already
  takes `loadFamilies`) belongs to the first lane that adds a Roof Road
  family; the cost is load time under the explicit flag only.
- Ruling R65: the operator's live Roof Road edits (old single-file
  `build.js`, `game.js`, `level.js`, `physics.js`, `downtown.js`,
  `alleys.js`, deleted `cutaway.js`, new modules) must be ported into
  `pieces/` after they land on main: handoff section 5 is the procedure. Not
  read or touched by this lane.
