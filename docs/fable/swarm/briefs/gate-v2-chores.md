# Integrator delegate brief: G-V2 gate chores (end of wave 2.2 — landmarks) + G-V1 review follow-ups

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/integration (branch fable/integration). You act for the Integrator; you
MAY edit hot files only for the items below. One commit per item; push after each (never force).
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/gate-v2-chores-report.md
Common rules: _common.md in this folder. Read: BUILD_GUIDE_FABLE.md §3, §6, §9 (gate G-V2: "as G-V1, plus the headless full-game
boot on ?assets=modular"), Appendix C; reports/gate-v1-review-report.md (I1, I2 and the Minor list); docs/fable/baseline/budgets.md.
export PLAYWRIGHT_MODULE=/Users/c1t1zen/.npm/_npx/e41f203b7505f1fb/node_modules/playwright

## Items
1. G-V1 I1: src/kit/fences/fence.js contract sample → the real 11 m run (len 11.0) so the R51 exception is exercised; record
   the measured hero/mid/far triangles in budgets.md §4 and perf_gv1.md (replace "needs a ruling" with the R51 outcome).
2. G-V1 I2: unify the material rule (R52) everywhere: guide §9 L5 wording, budgets.md, briefs are the Integrator's (skip),
   `KIT_LIMITS.newMergedMaterials` in src/kit/budgets.js (rename to an informational `mergedMaterialsBaseline` or remove) and
   the kit_check.mjs assertion that pins it (replace with a check that matches R52's mechanical part, e.g. every family that
   adds a merged material lists it in its handoff — or drop it with a note); promote the chores' census script
   (/Users/c1t1zen/Documents/GitHub/michi-wt/_scratch/gate-v1-chores/census.mjs) into tools/kit_material_census.mjs with
   `--help`, so a PR can report "+N merged materials" quickly. Add it to Appendix C as optional.
3a. Catalog fragility found by merges: catalog/js/links.mjs (around line 48) hard-codes allowlists of lab craft/bench ids
   (interiors, ranges, …) so every new specimen breaks `cd catalog && npm test`; derive those allowlists from the labs'
   exported specimen tables or labs/asset_inventory.json `targets` (still an allowlist — never evaluate source), keep tests green.
3. G-V1 Minors: fix those the review marks cheap (read the list); defer the rest in the report.
4. Board: tick `v-machiya` (a+b) and `v-interiors` (a+b) and every merged wave-2.2/2.3 lane row; tick G-V2 only when item 6 is green.
   Record in §6 notes: edge-forest pinned classic via kit-overrides.json (R49); deferred ids (village-street, tree-trunks,
   tree-canopies, scent, splash, landing-dust, and any others found in status files) with reasons.
4b. Gate G-C (Phase 3 characters: c1, c2, c3, c4 all merged): tick rows c2-michi and c3-villagers (merged earlier, unticked)
   and G-C when its §10 criteria have evidence: cat golden EQUAL (cat sheets match), systems golden EQUAL (villagers part the
   grass), G1–G4 green, and SAVES LOAD — prove it: in a headless boot of origin/main's game (serve a `git worktree add --detach`
   of origin/main in _scratch, or use `git show origin/main:<file>` to build one) create a save (localStorage key the game uses
   — find it in src/save*.js / main.js), copy that localStorage payload into a boot of integration on ?assets=classic and on
   ?assets=modular, and show the game loads it (same scene/position/flags, no console error). Record the commands.
5. NO cache-tag bump (R44).
6. Gate checks (record command + real output): G1; G2 (footprint golden classic + --systems + `--query "?assets=modular"`,
   kit_contract_test all families — warm-build millisecond checks may flake under machine load: if ONLY those fail, re-run
   once with no other heavy process and report both runs; any other failure is real), labs_geometry_test via headless,
   rooftop_test, summit_test + summit golden, cat_golden; G3 (catalog_check, labs_coverage + test, catalog tests,
   interiors_test, ranges_test, swap matrix, `cd dawCAT && npm test`); G-V2 extra: full-game headless boot on
   `?assets=modular` with every family on (autostart; wait for 60+ rendered frames; walk the cat a few seconds via the game's
   input API if one exists) — console must show only known lines; same on classic. Any red: do not tick, report BLOCKED.
Reply with the short contract (≤15 lines) and the final `git rev-parse --short HEAD`.
