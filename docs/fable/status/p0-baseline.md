# p0-baseline

Lane `p0-baseline` (guide §7) is run as two workers in two worktrees. This file is
the status record for **part 1, `p0-checks`** (the Node half: P0.1, P0.2 Node
half, P0.6, P0.7). Part 2, `p0-browser`, owns the browser half (P0.2 browser
rows, P0.3, P0.4, P0.5) and records it in `docs/fable/baseline/checks-browser.md`,
`perf.md`, `captures.md` and `budgets.md`.

- Worker / model:     Claude Sonnet 5.5 (`p0-checks`)
- Claimed:            2026-11-13 03:05 PST
- Branch:             fable/p0-checks
- Base commit:        ed9f5b9 (`fable/integration` = `main` @ ed9f5b9, "Add BUILD_GUIDE_FABLE: the modular asset swap master plan")
- State:              ready for review (part 1, `p0-checks`; P0.3 to P0.5 are `p0-browser`'s)

## Assets
Phase 0 changes nothing in the game and promotes no asset. Not applicable.

| Inventory id | Promoted from (lab/specimen) | Parts | Tiers | Footprint | State |
|---|---|---|---|---|---|
| (none) | | | | | n/a |

## Steps (guide §7, adapted to Phase 0)
- [x] P0.1 `fable/integration` created from `main` @ ed9f5b9 and pushed (done by the Integrator; verified with `git ls-remote --heads origin fable/integration` → `ed9f5b943297caf357ac33dcec1cab2be2de84f0`)
- [x] P0.2 Verification matrix on `main`, **Node half** → `docs/fable/baseline/checks.md` (browser half: `p0-browser`, `checks-browser.md`). All 14 required commands exit 0, two passes, nothing to fix
- [ ] P0.3 Performance baseline → `perf.md` (owned by `p0-browser`)
- [ ] P0.4 Baseline captures → `captures/`, `captures.md` (owned by `p0-browser`)
- [ ] P0.5 Budgets → `budgets.md` (owned by `p0-browser`)
- [x] P0.6 Swap matrix → `docs/fable/baseline/swap_matrix.md` (186 rows = 186 active inventory rows), regenerate with `node tools/fable_swap_matrix.mjs --write`, check with `node tools/fable_swap_matrix.mjs`
- [x] P0.7 Decisions D1–D8 → `docs/fable/decisions.md` (Integrator rulings; operator asleep; every answer labelled as an Integrator ruling the operator may overturn). Also `docs/fable/README.md`

## Checks run (command → real result)
Full detail, exit codes, wall times and output: `docs/fable/baseline/checks.md` (run on `50bca49` = `main` @ `ed9f5b9` plus this file).

| Command | Exit | Result line |
|---|:--:|---|
| `node tools/check_syntax.mjs` | 0 | `All 37 modules OK` |
| `node tools/verify.mjs` | 0 | `All checks passed` (summit state machine `70 passed, 0 failed`) |
| `node tools/labs_check.mjs` | 0 | `All labs checks OK` |
| `git diff --check` | 0 | no output (clean tree) |
| `node tools/rooftop_test.mjs` | 0 | `38 passed, 0 failed` |
| `node tools/summit_test.mjs` | 0 | `70 passed, 0 failed` |
| `node tools/catalog_check.mjs` | 0 | `OK Asset Library: 17 modules, 190 records, 120 evidence targets, 134 pictured assets, 386 WebP files (2.45 MB), 126 active editable entries` |
| `node tools/labs_coverage.mjs` | 0 | `OK 37 source modules, 112 construction methods, 190 inventory rows, 120 evidence targets` |
| `node --test tools/labs_coverage_test.mjs` | 0 | tests 11, pass 11, fail 0 |
| `node --test catalog/tests/*.test.mjs` | 0 | tests 37, pass 37, fail 0 |
| `cd cadJS && npm run check` | 0 | `server/catalog/agent/asset modules: ok`, `15/15 tests passed` |
| `cd dawCAT && npm test` | 0 | `246 passed, 0 failed` |
| `node tools/interiors_test.mjs` | 0 | `28 interiors checks passed.` |
| `node tools/ranges_test.mjs` | 0 | `19 ranges checks passed.` |

Not yet built (Phase 1): `tools/kit_check.mjs`, `tools/kit_index.mjs`, `tools/kit_contract_test.html`,
`tools/footprint_golden.html` + `tools/golden/`, `src/kit/`. The 44-check smoke suite `/tmp/michi-test/` does not exist, so it was not run.
Browser rows: `docs/fable/baseline/checks-browser.md` (lane part 2).

## Deferred assets and why
None (Phase 0).

## Footprint waivers requested
None (Phase 0).

## Notes for the Integrator
1. **D2 evidence in the brief is not quite right.** It says the last substantive edit to `src/mountaintop.js` was 2026-10-28 (`2243d67`) with only cache-tag bumps since. Git shows `c16aeb0` (2026-11-06, a labs commit titled "cache tag bump") changed the file by +558/-168 lines (718 non-tag lines). Since then only `efbfd8c` (2026-11-07, four `?v=` strings). The ruling (Phase 4 OPEN) is recorded unchanged; the corrected evidence is in `decisions.md` D2. Nothing has touched the file for six days and no branch holds an unmerged change to it.
2. **D3, question 3 (Chidori as a villager) is inferred, not quoted.** Spec section 11 poses the four questions and prints no recommendation. Questions 1, 2 and 4 take the answer the spec's own design states (Seven Posts walk; one continuous run; sky driven by route progress, so the finale is night). The spec is silent on a villager entry, so the recorded answer is "no, not now". Please confirm.
3. **Swap matrix.** 186 rows = 186 active inventory rows, per the Integrator rulings including the offering-bells correction (v-shrine, not v-garden). 14 rows are `judgement` calls and 9 overlaps are listed in `swap_matrix.md` for confirmation. Notable: `god-rays` (v-sky by Appendix D) is built in `src/particles.js`, which v-weather owns as single writer; Appendix D lists `mist-altar` as a gap but the inventory says `direct`; `interior-fish` is claimed by both the v-keepsakes and v-interiors cards.
4. **Checks.** All 14 required Node commands exit 0 on `main` (two passes); nothing to fix. `AGENTS.md` says `check_syntax.mjs` covers 36 modules, the tool reports 37. Plain `git diff --check` is vacuous for committed work: use `git diff --check origin/fable/integration...HEAD` at merge time as well.
5. **Not run / not built.** `kit_check`, `kit_index`, the kit contract test and the footprint golden do not exist (Phase 1). `/tmp/michi-test/` (the 44-check smoke suite) does not exist on this machine. Browser rows are `p0-browser`'s (`checks-browser.md`).
6. **Regenerate the matrix** after an inventory change or a lane re-assignment: `node tools/fable_swap_matrix.mjs --write`; `node tools/fable_swap_matrix.mjs` checks it is current (exit 1 if stale). It refuses to run if an active inventory row has no lane or two, and cross-checks the coverage counts against `labs/ASSET_COVERAGE.md`.
