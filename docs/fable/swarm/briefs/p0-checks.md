# Lane brief: p0-checks (Phase 0, part 1 of 2 of lane `p0-baseline`)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/p0-checks   Branch: fable/p0-checks (from fable/integration = main @ ed9f5b9)
Report file: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/p0-checks-report.md
Read first: ../_common.md rules apply (path: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md)

Phase 0 changes NOTHING in the game. A sibling worker (`p0-browser`) does the browser half (headless tool,
perf, captures, budgets) in another worktree — do not create or edit its files:
`tools/headless.mjs`, `tools/perf_spots.mjs`, `docs/fable/baseline/perf.md`, `budgets.md`,
`checks-browser.md`, `captures/`.

## Your files (create/edit only these)
- `docs/fable/baseline/checks.md`
- `docs/fable/baseline/swap_matrix.md` (+ a generator script if you write one: `tools/fable_swap_matrix.mjs`)
- `docs/fable/decisions.md`
- `docs/fable/status/p0-baseline.md` (Appendix B template adapted to Phase 0 steps P0.1–P0.7)
- `docs/fable/README.md` (one short page: what docs/fable/ holds — status/, handoff/, baseline/, decisions.md)

## Steps (guide §7)
P0.1 is done by the Integrator: `fable/integration` was created from `main` @ ed9f5b9 and pushed. Record it.

P0.2 (Node half). Run every Node/CLI command of guide Appendix C on this checkout and record, in
`checks.md`, each exact command, exit code, wall time and real output (trim long output to the summary
lines, but never paraphrase a result). Include at least:
`node tools/check_syntax.mjs`, `node tools/verify.mjs`, `node tools/labs_check.mjs`, `git diff --check fable/integration...HEAD`,
`node tools/rooftop_test.mjs`, `node tools/summit_test.mjs`, `node tools/catalog_check.mjs`,
`node tools/labs_coverage.mjs`, `node --test tools/labs_coverage_test.mjs`, `node --test catalog/tests/*.test.mjs`,
`cd cadJS && npm run check`, `cd dawCAT && npm test`, `node tools/interiors_test.mjs`, `node tools/ranges_test.mjs`.
For cadJS/dawCAT: look at package.json first. If tests need declared dependencies that are not installed,
you may run `npm ci`/`npm install` ONLY if a lockfile exists and node_modules is git-ignored; otherwise record
"not run: deps missing" with the exact error. Never add dependencies.
List the Appendix C commands that do not exist yet (kit_check, kit_index, contract test, footprint golden) as
"not yet built (Phase 1)". Record whether `/tmp/michi-test/` (44-check smoke suite) exists — it does not appear
to; do not report it as run. Browser rows (G2/G4 pages) are recorded by p0-browser in checks-browser.md; just
link to that file. A failure on main is recorded and reported, NOT fixed.

P0.6 `swap_matrix.md`: generated from `labs/asset_inventory.json` and `catalog/js/asset-loader.mjs`: one row per
active asset: inventory id, area/group, owning lane (use guide §9–§12 lane cards + Appendix D + the ownership
rulings below), best lab target (lab slug/specimen if known), coverage level (from the inventory/ASSET_COVERAGE),
lab adapter exists (yes/no), original adapter exists (yes/no). Summaries per lane at the top. Write a small
generator `tools/fable_swap_matrix.mjs` (pure Node, no deps) so it can be regenerated, and note the command.
Ownership rulings (Integrator): offering bells → v-garden; courtyard-toro and pool-toro → v-lanterns;
guardian-crows → c4-creatures (v-critters adds the lab study); roadside-moss → v-greenery; paddy-bunds → v-water;
crates/barrel/pots/signs clutter → v-alley, village-street + houses → v-machiya. Summit rows → s2/s3/s4 by the
§11 table. Media rows `summit-transition`, `blender-roofscape` → "media, not a kit asset". Inactive rows → listed
separately as inactive.

P0.7 `docs/fable/decisions.md`: the eight operator decisions D1–D8 (guide §7 table), each with: the question,
the guide default, and the Integrator ruling below, clearly labelled "Integrator ruling (operator asleep;
standing instruction: complete all phases) — operator may overturn". Rulings:
- D1: accept the P0.5 budgets (in docs/fable/baseline/budgets.md, written by p0-browser) provisionally.
- D2: Phase 4 OPEN. Evidence: `origin/fix/hilltop-ground-transitions` is fully merged; the last substantive edit to
  `src/mountaintop.js` was 2026-10-28 (2243d67), only cache-tag bumps since; the operator asked for all phases.
  AGENTS.md's summit ownership line is updated in the commit that starts lane s1.
- D3: `r6-game-wiring` OPEN; each of the four open questions in
  `docs/superpowers/specs/2026-10-24-rooftop-road-design.md` §11 takes the spec's own recommended answer — quote
  each question and the chosen answer verbatim from the spec.
- D4: period only (default). D5: yes, new tree lab (default). D6: ignored, not deleted (default).
- D7: Workers on Claude Sonnet 5.5; system lanes v-ground, v-water, v-sky and serial splits f2, f3, c1, s1, r1, r6
  on Claude Opus 5.5; f1, gate reviews and the Phase 9 review on Claude Fable 5.1; Integrator/controller Claude Opus 5.5.
- D8: captures only in "From the build"; concept art kept in a labelled section (default).
- The default flip (§16 X.1–X.4) is decided only after the Phase 9 go/no-go.

Status file: tick P0.1, P0.2 (Node half), P0.6, P0.7 as you finish them. Commit per step. Push; open the PR.

## Acceptance
Every listed command recorded with real output; swap matrix regenerable by one command and consistent with
the inventory (row count = active rows); decisions file complete; no game file touched (`git diff --stat
fable/integration` shows only your files).
