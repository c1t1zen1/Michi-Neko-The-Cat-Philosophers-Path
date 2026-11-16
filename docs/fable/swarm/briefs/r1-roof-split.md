# Lane brief: r1-roof-split (Phase 5 — Roof Road build.js split + inventory; serial, single writer of rooftops/js/build.js)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/r1-roof-split   Branch: fable/r1-roof-split (from fable/integration)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/r1-roof-split-report.md
Read in order: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md, AGENTS.md (rooftops row, Roof Road verification), BUILD_GUIDE_FABLE.md §3, §12 (R1.1–R1.5 and the
paragraph "The run's geometry is gameplay"), the spec docs/superpowers/specs/2026-10-24-rooftop-road-design.md, and the Roof Road docs
added since (docs/ROOFTOPS_DOWNTOWN_2026-11-13.md, docs/ROOFTOPS_AGILITY_2026-11-13.md and any stage-2 notes on main).

## Integrator ruling R57 (binding)
The Roof Road is being actively developed by the operator in another worktree (feat/rooftops-stage2, uncommitted edits to
rooftops/js/level.js). To keep their work mergeable:
- NEVER edit rooftops/js/level.js, rail.js, physics.js, reach.js, autopilot.js (the pure runner modules) or the companion code.
- Split ONLY rooftops/js/build.js (+ the minimal edit to rooftops/js/game.js that calls the new PIECES walker, if needed) into
  rooftops/js/pieces/<type>.js — MOVE code, do not redesign; `build.js` keeps its exported API (buildWorld etc.) as a facade
  that walks a PIECES table. Keep the diff of build.js reviewable (moved blocks should be byte-identical where possible).
- Before starting: `git fetch origin`; your base is fable/integration, which contains main 676506f (stage 2). If origin/main has
  moved past 676506f with rooftops changes, STOP and report NEEDS_CONTEXT (the Integrator merges main first).

## Steps
- R1.1 Inventory: add a "Roof Road" group to labs/asset_inventory.json (remove the Roof Road from `exclusions`), one row per piece
  type and character (~40 rows; the guide lists them; include the downtown/agility additions that exist on main), coverage
  levels honest (most "review" or "embedded"); update tools/labs_coverage.mjs totals and its test (never loosen a check).
  You are granted labs/asset_inventory.json, tools/labs_coverage*.mjs, labs/ASSET_COVERAGE.md (regenerate) and
  tools/fable_swap_matrix.mjs (add a lane mapping for the new rows: r2/r3/r4/r5 per guide §12's mouth table) for this.
- R1.2 Split build.js into rooftops/js/pieces/<type>.js with a PIECES table that buildWorld walks.
- R1.3 Route each piece through the same assets.build contract (rooftops has its own page — give the Roof Road its own
  AssetRuntime instance exactly as main.js does: classic by default, ?assets=modular / ?swap= honoured; import src/kit/runtime.js
  with the current ?v= tag). With zero Roof Road kit assets, modular == classic.
- R1.4 Proof: `node tools/rooftop_test.mjs` all pass (report the count — it is 40+ now, not 38), `node tools/rooftop_companion_test.mjs`,
  `?auto=1` completes (the autopilot test covers it), and a numeric golden of the built world (positions/bounds of every piece
  group, platforms, colliders) EQUAL before vs after the split — build a small tool tools/rooftop_golden.mjs (+html/js) modelled on
  the footprint golden, write the golden from the UNCHANGED code first, then split. Captures of mouths are not pixel-repeatable
  (P0 note) — the numeric golden is the gate.
- R1.5 Register a Roof Road lab in labs/registry.js (promote the `roofroad` extra) with a shelf of the piece types (granted:
  labs/registry.js, labs/roofroad/**), so each piece type has a specimen the catalog can link.
- Status docs/fable/status/r1-roof-split.md, handoff docs/fable/handoff/r1-roof-split.md (piece ids → lanes r2/r3/r4/r5,
  part names, how a kit piece registers). Checks: check_syntax, verify, kit_check, labs_check, labs_coverage + test, swap matrix,
  rooftop tests, the new rooftop golden, footprint golden (valley unchanged), `git diff --check`.
Push, PR into fable/integration (title "r1-roof-split: Roof Road pieces, inventory, runtime"), report per _common.md.
