# p0-checks report (Phase 0, part 1 of 2 of lane `p0-baseline`)

- Worker / model: Claude Sonnet 5.5
- Worktree / branch: `/Users/c1t1zen/Documents/GitHub/michi-wt/p0-checks`, `fable/p0-checks` (from `fable/integration` = `main` @ `ed9f5b9`)
- Claimed 2026-11-13 03:05 PST; finished the same morning.
- State: **DONE_WITH_CONCERNS** (no failure anywhere; the concerns are two corrections/inferences in `decisions.md` and the judgement calls in the swap matrix, listed in "Open concerns")
- PR: https://github.com/c1t1zen1/Michi-Neko-The-Cat-Philosophers-Path/pull/3 (base `fable/integration`, head `fable/p0-checks`)

## What was built

Six files, all new, nothing else touched (`git diff --stat origin/fable/integration` lists exactly these):

| File | What |
|---|---|
| `docs/fable/baseline/checks.md` | P0.2 Node half: every Appendix C Node/CLI command with exact text, exit code, wall time (two passes) and real output, plus the "not yet built (Phase 1)" list, the `/tmp/michi-test/` finding and observations |
| `docs/fable/baseline/swap_matrix.md` | P0.6: 186 rows, one per active inventory asset, generated |
| `tools/fable_swap_matrix.mjs` | the generator (pure Node, no dependencies) |
| `docs/fable/decisions.md` | P0.7: D1 to D8 with question, guide default, Integrator ruling (labelled as the brief required) and evidence |
| `docs/fable/status/p0-baseline.md` | Appendix B status file adapted to P0.1 to P0.7; P0.1, P0.2 (Node half), P0.6, P0.7 ticked; P0.3 to P0.5 left for `p0-browser` |
| `docs/fable/README.md` | one short page: what `docs/fable/` holds |

Commits on `fable/p0-checks` (each ends with the `Co-Authored-By: Claude Sonnet 5.5` line):

```
ff5cf77 p0.7: record decisions D1-D8 and add docs/fable/README.md
edcce80 p0.6: swap matrix and its generator
4128644 p0.2 (Node half): record the Appendix C Node/CLI matrix on main
50bca49 p0-baseline: claim lane, add status file (part 1, p0-checks)
```

Mid-task course correction applied: the coordinator corrected the ownership rulings after the brief was written
(`offering-bells` to v-shrine instead of v-garden; v-garden owns `shishi` and `wind-chime`; v-lanterns owns `toro`, `chochin`,
`street-lamps`, `andon`, `courtyard-toro`, `pool-toro`; `secret-andon` to v-interiors; `guardian-feather` to v-nest; `larry` and
`guardian-crows` to c4-creatures; `sparrows`, `koi`, `butterflies` to v-critters; the grass rows `meadow-system`, `grass-*`,
`grass-fireflies` are "already at standard (`src/grass.js`, not rebuilt; guide section 9 wave 2.3)"). `swap_matrix.md` uses the
corrected rulings throughout; the first version of the brief is not reflected anywhere in the committed files.

## P0.1

`fable/integration` exists on `origin` at `ed9f5b943297caf357ac33dcec1cab2be2de84f0` (`git ls-remote --heads origin fable/integration`),
equal to `main` @ `ed9f5b9`. Recorded in the status file.

## P0.2, Node half: checks run (command, exit code, wall time, real result)

Run on `50bca49` (= `main` @ `ed9f5b9` plus the docs-only status commit), Node v26.7.0, npm 11.19.0, macOS 26.6.2, Apple M5 Max.
Full output, trimmed with explicit omission markers, is in `docs/fable/baseline/checks.md`. `git status --porcelain` was empty
before and after every command. Two passes; pass 2 output is byte-identical (test-runner millisecond timings aside).

| # | Gate | Command (run from the repo root) | Exit | Wall, pass 1 / pass 2 | Result line(s), verbatim |
|--:|---|---|:--:|---|---|
| 1 | G1 | `node tools/check_syntax.mjs` | 0 | 0.85 s / 0.83 s | All 37 modules OK |
| 2 | G1 | `node tools/verify.mjs` | 0 | 3.67 s / 3.64 s | All checks passed (summit state machine: 70 passed, 0 failed) |
| 3 | G1 | `node tools/labs_check.mjs` | 0 | 4.02 s / 3.94 s | All labs checks OK |
| 4 | G1 | `git diff --check` | 0 | 0.01 s / 0.01 s | (no output) |
| 5 | G2 | `node tools/rooftop_test.mjs` | 0 | 0.08 s / 0.08 s | 38 passed, 0 failed |
| 6 | G2 | `node tools/summit_test.mjs` | 0 | 2.76 s / 2.79 s | 70 passed, 0 failed |
| 7 | G3 | `node tools/catalog_check.mjs` | 0 | 0.40 s / 0.39 s | OK Asset Library: 17 modules, 190 records, 120 evidence targets, 134 pictured assets, 386 WebP files (2.45 MB), 126 active editable entries |
| 8 | G3 | `node tools/labs_coverage.mjs` | 0 | 0.05 s / 0.05 s | OK 37 source modules, 112 construction methods, 190 inventory rows, 120 evidence targets / Active coverage: direct=89, review=41, embedded=27, related=19, missing=10 |
| 9 | G3 | `node --test tools/labs_coverage_test.mjs` | 0 | 0.17 s / 0.17 s | ℹ tests 11 / ℹ pass 11 / ℹ fail 0 |
| 10 | G3 | `node --test catalog/tests/*.test.mjs` | 0 | 0.13 s / 0.12 s | ℹ tests 37 / ℹ pass 37 / ℹ fail 0 |
| 11 | G3 | `cd cadJS && npm run check` | 0 | 0.15 s / 0.14 s | server/catalog/agent/asset modules: ok / 15/15 tests passed |
| 12 | G3 | `cd dawCAT && npm test` | 0 | 1.57 s / 1.57 s | 246 passed, 0 failed |
| 13 | G3 | `node tools/interiors_test.mjs` | 0 | 0.03 s / 0.04 s | 28 interiors checks passed. |
| 14 | G3 | `node tools/ranges_test.mjs` | 0 | 0.03 s / 0.03 s | 19 ranges checks passed. |

Supplementary runs (not required by the brief, cheap, same checkout):

| # | Command | Exit | Wall | Result line(s), verbatim |
|--:|---|:--:|---|---|
| S1 | `for f in src/*.js; do node --input-type=module --check < "$f" >/dev/null \|\| echo "FAIL $f"; done; echo "loop finished"` | 0 | 0.84 s | no FAIL line; "loop finished" |
| S2 | `cd catalog && npm run check` | 0 | 0.58 s | OK Asset Library: 17 modules, 190 records, 120 evidence targets, 134 pictured assets, 386 WebP files (2.45 MB), 126 active editable entries / ℹ tests 37 / ℹ pass 37 / ℹ fail 0 |

Not yet built (Phase 1), real outputs recorded in `checks.md`: `node tools/kit_check.mjs` and `node tools/kit_index.mjs` both print
`Error: Cannot find module '.../tools/kit_check.mjs'` (`code: 'MODULE_NOT_FOUND'`, exit 1); `ls` of `tools/kit_contract_test.html`,
`tools/footprint_golden.html`, `tools/golden` and `src/kit` prints `No such file or directory` for each.

`/tmp/michi-test/` does not exist (`ls -la /tmp/michi-test/` prints `No such file or directory`, exit 1); a `find` for `michi-test`,
`smoke.js` or `smoke2.js` under `/tmp`, `/private/tmp` and the GitHub folder found nothing. It was not run and is not reported as run.

cadJS and dawCAT: `package.json` declares no dependencies in either, there is no lockfile, `node_modules/` is git-ignored and
absent, so nothing needed installing and nothing was installed (no `npm ci` / `npm install` was run).

Browser rows (labs geometry suite, `/__boot.html`, review sheets, optional Playwright suites) are `p0-browser`'s:
`docs/fable/baseline/checks-browser.md`; `checks.md` links to it.

### Final re-run on the finished branch (`ff5cf77`), after all my files were in

| Command | Exit | Wall | Result line(s) |
|---|:--:|---|---|
| `node tools/check_syntax.mjs` | 0 | 2.22 s | All 37 modules OK |
| `node tools/verify.mjs` | 0 | 5.33 s | All checks passed |
| `node tools/labs_check.mjs` | 0 | 11.45 s | All labs checks OK |
| `git diff --check` | 0 | 0.04 s | (no output) |
| `git diff --check origin/fable/integration...HEAD` | 0 | 0.05 s | (no output) |
| `node tools/labs_coverage.mjs` | 0 | 0.21 s | OK 37 source modules, 112 construction methods, 190 inventory rows, 120 evidence targets / Active coverage: direct=89, review=41, embedded=27, related=19, missing=10 |
| `node tools/catalog_check.mjs` | 0 | 1.96 s | OK Asset Library: 17 modules, 190 records, 120 evidence targets, 134 pictured assets, 386 WebP files (2.45 MB), 126 active editable entries |
| `node tools/fable_swap_matrix.mjs` | 0 | 0.10 s | OK swap matrix: 186 rows = 186 active inventory rows, 26 lanes plus at-standard and media, 14 judgement calls |
| `node --check tools/fable_swap_matrix.mjs` | 0 | 0.08 s | (no output) |

`git diff --stat origin/fable/integration` after the last commit:

```
 docs/fable/README.md               |  20 ++
 docs/fable/baseline/checks.md      | 600 +++++++++++++++++++++++++++++++++++++
 docs/fable/baseline/swap_matrix.md | 547 +++++++++++++++++++++++++++++++++
 docs/fable/decisions.md            | 269 +++++++++++++++++
 docs/fable/status/p0-baseline.md   |  67 +++++
 tools/fable_swap_matrix.mjs        | 449 +++++++++++++++++++++++++++
 6 files changed, 1952 insertions(+)
```

No game file, no hot file, no `dawCAT/` or `cadJS/` file, no cache tag was touched.

## P0.6, the swap matrix

- Command: `node tools/fable_swap_matrix.mjs --write` regenerates `docs/fable/baseline/swap_matrix.md`; `node tools/fable_swap_matrix.mjs` (no argument) checks it is current and exits 1 if stale. Output has no timestamps, so regeneration is byte-for-byte repeatable.
- Result: `OK swap matrix: 186 rows = 186 active inventory rows, 26 lanes plus at-standard and media, 14 judgement calls`. `grep -c '^| \`' swap_matrix.md` counts 186 matrix rows (nothing else in the file starts that way).
- Columns, as the brief asked: inventory id, area (the inventory group), owning lane, **basis** (how the lane was decided: `ruling`, `card`, `appendix-d`, `judgement`), best lab target (first evidence target at the strongest level, `(+n)` for more at that level), coverage level, lab adapter yes/no, original adapter yes/no. Per-lane summaries sit at the top, then a per-lane table.
- Totals reproduce the repo's own numbers: coverage `direct 89, review 41, embedded 27, related 19, missing 10` (identical to `node tools/labs_coverage.mjs`), 190 inventory rows = 186 active + 4 inactive (listed separately, no lane). The generator cross-checks the five totals and every area row against `labs/ASSET_COVERAGE.md` and fails on a mismatch.
- Adapters: 124 original adapters; 61 rows have a lab adapter, backed by 71 unique lab specimens (85 links). The guide's "71 lab recipes" is the 71 specimens, not 61 rows.
- Validation built into the generator (all exercised on a scratch copy, exit 1 each): an active row with no lane, an id in two lanes, an unknown id, an inactive id, a `judgement` row without a reason, a bad basis value, a stale output file; an unknown flag exits 2; a drifted `ASSET_COVERAGE.md` count fails, a missing table only warns.
- Media rows `summit-transition`, `blender-roofscape`: lane `media` ("media, not a kit asset"). The four inactive rows are bullets at the end.
- Appendix D regenerated per lane (rows whose strongest evidence is not `direct`), with a computed diff against the guide's Appendix D. Differences found:
  - moved by the rulings: `pool-toro`, `courtyard-toro` (to v-lanterns), `grass-fireflies` (at standard), `roadside-moss` (to v-greenery), `guardian-crows` (to c4-creatures);
  - Appendix D lists `mist-altar` as needing a study, but the inventory has `direct` coverage (`shrine/game-altar`);
  - no inventory gap is missing from Appendix D; "31 summit rows" = 30 kit rows (s2 12, s3 9, s4 9) + the media row `blender-roofscape`, which matches.
- 14 rows are `judgement` calls (not named by a ruling, a lane card or Appendix D), each with its reason in the file: `shimenawa`, `shrine-bell`, `timber-frame`, `upper-windows`, `noren`, `path-slabs`, `rice`, `water-ripples`, `rain-ripples`, `summit-shoulder`, `summit-terrain`, `slope-forest`, `summit-grass`, `vista-terrain`.
- 9 overlaps listed for the Integrator, notably: `god-rays` is v-sky's by Appendix D but is built in `src/particles.js`, which v-weather owns as single writer; `interior-fish` is on both the v-keepsakes and the v-interiors card (matrix follows Appendix D: v-keepsakes); `splash`, `landing-dust`, `scent` live in modules outside the v-weather card; `summit-grass` may end as a no-op because the GrassSystem is not rebuilt.
- A lab adapter is not a focused study: 7 rows have a lab adapter without a `direct` study (`namako`, `tokonoma`, `chabudai`, `zabuton`, `knockables`, `michi`, `summit-pagoda`) and 35 rows have a `direct` study but no lab adapter (the ground, water, ranges, sky, weather, grass and summit labs are not wired into the catalog).

## P0.7, decisions

`docs/fable/decisions.md`: D1 to D8, each with the question (guide section 7), the guide default and the ruling labelled exactly
"Integrator ruling (operator asleep; standing instruction: complete all phases) — operator may overturn". D1 accept provisionally;
D2 Phase 4 OPEN; D3 `r6-game-wiring` OPEN with the spec's own answers; D4 period only; D5 new tree lab; D6 ignored, not deleted;
D7 the model allocation as given; D8 default. The default flip (guide section 16, X.1 to X.4) is stated as decided only after
the Phase 9 go/no-go. A summary table opens the file.

Two things the brief's wording did not match, recorded in the file and flagged in "Open concerns":

1. **D2 evidence.** The brief says the last substantive edit to `src/mountaintop.js` was 2026-10-28 (`2243d67`), only cache-tag bumps since. Git shows `c16aeb0` (2026-11-06 22:41, "Add interiors and machiya labs; cache tag bump to 20261106a", a labs commit) changed it by 558 insertions and 168 deletions (726 changed lines in 45 hunks, 8 of them `?v=` tags, 40 hunks inside `SummitManager`). The only later commit is `efbfd8c` (2026-11-07), four `?v=` strings. Nothing has touched the file for six days; `origin/fix/hilltop-ground-transitions` (`22 0`) and `origin/roof-road` (`38 0`) have nothing unmerged; `origin/graphics-overhaul`'s one commit does not touch the file. The ruling is recorded unchanged; the corrected evidence is written next to it.
2. **D3 quotes.** Spec section 11 poses four questions and prints no recommendation under any of them. For each question I quoted the question verbatim and the sentence(s) of the spec that specify the answer: Q1 Seven Posts walk (section 4), Q2 one continuous run (sections 5 and 7.3), Q4 the sky follows route progress so the finale is night (section 3 and section 6 item 9). **Q3 (Chidori as a valley villager) is inferred from the spec's silence: recorded as "no, not now".** All 13 quoted blocks in the file were checked programmatically word for word against their sources (whitespace joined): `13 quotes, 0 not found`.

## Self-review against the acceptance list

| Acceptance item | Result |
|---|---|
| Every listed command recorded with real output | Yes: all 14 required commands plus two supplementary runs, exact text, exit code, wall time (two passes), real output trimmed with explicit markers; `kit_check`, `kit_index`, contract test, footprint golden listed as not yet built (Phase 1) with the real errors; `/tmp/michi-test/` recorded as absent; browser rows linked |
| Swap matrix regenerable by one command and consistent with the inventory (row count = active rows) | Yes: `node tools/fable_swap_matrix.mjs --write`; 186 rows = 186 active rows, enforced by the generator, coverage totals cross-checked against `labs/ASSET_COVERAGE.md` |
| Decisions file complete | Yes: D1 to D8, labelled rulings, D3's four questions quoted, D2 evidence |
| No game file touched; `git diff --stat fable/integration` only my files | Yes: six files, all under `docs/fable/` plus `tools/fable_swap_matrix.mjs` |
| Rules: no new dependency, no `Math.random`/`Date.now` in geometry (n/a), no cache-tag bump, no `git add -A`, no destructive git, LF/UTF-8 | Yes; only explicit paths were staged; `git diff --check` and `git diff --check origin/fable/integration...HEAD` are clean |

Assets promoted: none (Phase 0). Deferred assets: none. Footprint waivers: none.

## Open concerns

1. **D2 evidence correction** (above). The ruling stands as given; the Integrator may want to confirm no summit work is still uncommitted elsewhere, since git cannot show that.
2. **D3 question 3** is an inference, not a quotation; please confirm "no, not now".
3. **Swap matrix judgement calls and overlaps** (14 and 9, listed in the file) are placements the guide and rulings do not settle. Cheapest to confirm: `god-rays` (the v-sky / v-weather file conflict in `src/particles.js`) and `interior-fish`.
4. **Doc drift, not fixed:** `AGENTS.md` says `check_syntax.mjs` covers "all 36 modules"; the tool and `verify.mjs` report 37. Plain `git diff --check` only inspects uncommitted work, so on a committed lane branch it proves nothing; use `git diff --check origin/fable/integration...HEAD` at merge time too.
5. Wall times in `checks.md` were taken while sibling lanes used the machine (a later re-run was slower, e.g. `verify.mjs` 5.3 s against 3.7 s); they are an order of magnitude, not a benchmark.
6. `docs/fable/baseline/checks.md` links to `checks-browser.md`, `captures.md` and `budgets.md`, which `p0-browser` writes; those links resolve once both PRs are merged. `decisions.md` D1 names `budgets.md` and its "accepted provisionally under ruling D1" label, as the `p0-browser` brief instructs; if that file labels it differently, D1 still holds.

## PR

https://github.com/c1t1zen1/Michi-Neko-The-Cat-Philosophers-Path/pull/3, opened into `fable/integration` from `fable/p0-checks` at `ff5cf77`. Not merged (the Integrator merges).
