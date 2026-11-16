# Integrator delegate brief: G-V3 gate chores (end of Phase 2 — the village) → merge to main

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/integration (branch fable/integration). You act for the Integrator; hot files
only for the items below. One commit per item; push after each (never force).
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/gate-v3-chores-report.md
Read: _common.md; BUILD_GUIDE_FABLE.md §6, §9 (G-V3: "all village lanes merged or explicitly deferred; G1–G4 pass; performance
re-measured at the four spots on all three tiers and compared with the budgets; operator may merge to main"), Appendix C;
docs/fable/baseline/budgets.md, perf_gv1.md; reports/gate-v2-chores-report.md.
export PLAYWRIGHT_MODULE=/Users/c1t1zen/.npm/_npx/e41f203b7505f1fb/node_modules/playwright

## QUIET MACHINE (ruling R54)
The Integrator pauses other heavy agents for your perf/timing items. Before items 2–3 run `uptime`; proceed when the 1-min load
average is < 3 (wait/poll up to 10 min with `sleep 60` loops in one command; if still high, measure anyway and record the load).

## Items
1. Board: every village lane (§6 rows 2.1–2.3) merged `[x]` or recorded deferred with a reason in the §6 notes.
2. Warm-build re-check on the quiet machine: `node tools/kit_contract_test.mjs` (all families) twice; list every warm-build-ms
   failure that reproduces on BOTH runs. For each: if the asset is genuinely over, record it in budgets.md "Known over-budget
   build times" with measured numbers and the owning family for a1-village to optimise — do NOT raise caps silently; if a cap
   is plainly mis-set for its class (e.g. whole-room/whole-building exceptions), propose the change in the report instead.
3. Performance (G-V3): `node tools/perf_spots.mjs` at street, shrine, river, meadow on quality low, medium, high — classic vs
   `?assets=modular` (all families on, kit-overrides as committed) — 2 boots × 3 rounds, frame ms + draw calls + triangles; also
   night (hour 22) at street and shrine. Compare with budgets.md rules (modular medium ≤ classic high; per-tier gates; R52 draws).
   Write docs/fable/baseline/perf_gv3.md. Investigate any frame-ms regression > 1 ms on medium/high: swap families one at a time
   at the worst spot to attribute it (e.g. machiya-b fence/skirt merge (R53), merged statics losing culling) and record findings.
4. Cache-tag bump to `20261114a` (R44: this gate merges to main): every `?v=` in src/**/*.js (incl. src/kit/**, src/summit/**,
   src/characters/**), index.html, tools pages/js importing tagged game modules, rooftops/js/game.js, rooftops/js/build.js (and
   rooftops/js/pieces/** if present), labs/shared/game.js, catalog/cadJS files that import tagged game modules (grep), the
   generated src/kit/index.js via `node tools/kit_index.mjs`. Byte-safe (Node or the AGENTS.md find/sed one-liner; preserve CRLF).
   Update "Current tag" in AGENTS.md. Then `grep -rn "?v=2026" --include=*.js --include=*.html --include=*.mjs . | grep -v 20261114a
   | grep -v node_modules` prints nothing outside dawCAT/ and cadJS/ untagged files — show it. Goldens ignore tags (re-run).
5. Gate checks (record command + real output): G1; G2 (footprint golden classic + --systems + `--query "?assets=modular"`,
   contract all families, labs_geometry_test via headless, rooftop_test + companion, summit_test + summit golden +
   summit_kit_parity, cat_golden); G3 (catalog_check, labs_coverage + test, catalog tests, cadJS check, dawCAT test,
   interiors_test, ranges_test, swap matrix); G4: full headless boot classic and modular (autostart, ≥60 rendered frames, walk the
   cat if an input API exists) — console only known lines; the review sheets town/hidden/tree/cat vs Phase 0 masters on classic
   (`node tools/capture_baseline.mjs --compare` or the documented equivalent; within noise; summit/rooftops/grass sheets are not
   pixel-repeatable — numeric goldens instead).
6. Tick G-V3 only if items 1–5 are green (warm-build/perf findings recorded honestly count as green if no budget RULE fails).
Do NOT merge to main yourself — the Integrator does that after reading your report.
Reply with the short contract (≤15 lines) and the final `git rev-parse --short HEAD`.

## Integrator update (2026-11-15, RESUME #4) — overrides the items above where they differ
0. FIRST: `git fetch origin && git merge --no-ff origin/main -m "Merge origin/main (a3221d4: Shinkansen project) into fable/integration"`.
   origin/main gained one operator commit (a3221d4) that only adds `Shinkansen/` (a separate project). Expect no conflict; if any
   file outside Shinkansen/ conflicts, abort and report BLOCKED. Do not edit anything under Shinkansen/. After this merge, main is
   an ancestor of integration, so the Integrator can fast-forward main later.
4. The cache tag is `20261114a` (corrected: today is 2026-11-14). Include `rooftops/js/pieces/**` only if r1 has merged (it has NOT
   at dispatch; r1 merges after you finish — do not merge r1).
5. G2 additions: `node tools/ground_wear_test.mjs` (v-ground's wear contract test, 14 checks).
2. Warm-build flakes already seen under load (re-measure these first on the quiet machine): vista `summit-pagoda` hero (6.9/6) and
   `horizon` mid (3.1/3); machiya `kawara-roof` hero 7.2/6, mid 3.8/3; `timber-frame` mid 3.1/3; trees `sakura` hero 10.6/6.
   R53 (machiya-b): confirm inuyarai merges across instances (if not, record it for a1-village) and explain the +3 medium draws.
- Quiet machine: the Integrator holds every other heavy agent while you run items 2–3. Only a code reviewer (read-mostly) may
  be running; if `uptime` 1-min load stays ≥ 3 for 10 minutes, measure anyway and record the load beside every number.
