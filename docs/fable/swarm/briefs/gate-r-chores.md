# Integrator delegate brief: G-R gate chores (end of Phase 5 — the Roof Road) → merge to main

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/integration (fable/integration). You act for the Integrator; hot files only for the
items below. One commit per item; push after each (never force).
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/gate-r-chores-report.md
Read: _common.md, _merge.md; BUILD_GUIDE_FABLE.md §6 (board + notes) and §12 (gate G-R: "rooftop tests plus the new manager tests;
a full play-through from the valley bridge to the finale and back on classic and modular; saves from before the Roof Road load;
operator may merge to main"); Appendix C; the r6 handoff and reports/r6-game-wiring-report.md; reports/route-fix-report.md.
Ledger rulings to know: R57, R64/R70 (Roof Road tags), R69 (operator merges stand), R75–R81.
export PLAYWRIGHT_MODULE=/Users/c1t1zen/.npm/_npx/e41f203b7505f1fb/node_modules/playwright

## Items
0. `git fetch origin`. If origin/main moved past the last main merge, `git merge --no-ff origin/main` (operator work; never edit it;
   conflicts outside generated files → BLOCKED). Show `git merge-base --is-ancestor origin/main HEAD`.
1a. Roof Road family filter (r3 handoff §4, still pending): the Roof Road sandbox (`kyoto-rooftops.html` → rooftops/js/game.js)
   on `?assets=modular` imports the whole valley kit. Make it import only the Roof Road families (`roof*` in src/kit/index.js)
   through the runtime's existing `loadFamilies` option (src/kit/runtime.js) or a small generic `families` filter option on
   AssetRuntime (unit test in tools/kit_test.mjs). The game's own runtime (src/main.js) keeps loading everything (the pocket needs
   the roof families and the valley needs its own). Classic-neutral: rooftop golden classic EQUAL, modular routing passes, kit_test
   passes. The edit to rooftops/js/game.js is the option line only (operator's file; R81 precedent).
1b. Ruling R84: in src/kit/budgets.js raise the roof-machiya hero `buildMs` exception from 12 to 15; its `why` cites the quiet
   re-read (reports/r2b-roofs-streets-merge-report.md: 9 runs at load 1.3–1.5, 6 pass, max 13.7 ms, cold 64–77 ms) and R84. Then
   `node tools/kit_contract_test.mjs --family roofstreets` three times at load < 3: 0 failed each.
1. Board: every Phase 5 row (r1–r6, incl. the a/b parts) merged [x] or deferred with a reason in the §6 notes; list the Roof Road ids
   still classic-only (willows, culvert ledges, tenmangu gate, any r2 part-c ids) as "deferred, classic" — not blockers.
2. Cache-tag bump to `20261116a` (R44: this gate merges to main; resumed 2026-11-16, so that day's date) across every tagged file: src/**, index.html, labs/shared/game.js,
   tools pages/js that import tagged game modules, rooftops/js/** (incl. pieces/, runview.js), tools/rooftop_golden.js, catalog/cadJS
   files that import tagged modules; `node tools/kit_index.mjs`; AGENTS.md "Current tag" (and drop the R64 exception text — R70 ended it). SKIP `Shinkansen/**` and `Skretch/**`: the operator
   has uncommitted edits there (Shinkansen/index.html carries a tag); a tag change on main would block their pull (R64 reasoning).
   Byte-safe (preserve CRLF). Proof: the grep in gate-v3-chores.md item 4 prints nothing but known untagged files.
3. Play-through (G-R's core): headless, on `?assets=classic` and `?assets=modular`, the scripted drill — new save → walk to the valley
   bridge → the Seven Posts unlock → enter the pocket through the Odoi gap (noren veil) → run the whole route to the finale (autopilot
   or the manager's run driver) → finale plays (five fires) → exit back to the valley at the return spot → save → reload → flags
   (`rooftopsUnlocked`, Shōki mask, `rooftopFinished`) restored, cat in the valley (never a pocket position). Console clean (known lines only).
   Also: "Leave the Roof Road" mid-run returns home; a failed pocket load (r6 I1 harness) never strands the cat.
4. Saves: a save from 08bd3b5 (the last main) and one from 8ab0c9b load on both sets with no new required key.
5. Gate checks (record command + real output): G1; G2 (footprint golden classic + --systems + modular query, summit golden + test 83 +
   parity, cat golden, rooftop golden classic + modular routing, rooftop_test 40/40, companion, alley, rooftop_manager_test,
   ground_wear_test, a1_village_test, contract all families — `uptime` first); G3 (catalog_check, labs_coverage + test, catalog tests,
   cadJS check, dawCAT test, swap matrix); G4: full headless game boot classic + modular, ≥120 frames, console clean; classic
   game_shot pairs vs the last main (08bd3b5 … use a scratch worktree, remove it plainly after) at street noon, shrine dusk, river night,
   meadow rain: maxDelta 0 except frames showing the new bridge caps / Odoi bank (explain each).
5b. Operator layout notes (route-fix report; NOT blockers, operator's files — record in the §6 G-R note, do not fix): overlapping
   stage-2 legs block the camera near s≈1010/1558; mouth 12 has zero length; `roofRoad.view` throws under `?finale=1` before the
   camera is placed; tools/rooftop_browser_test.mjs asserts 30 residents where the route has 40.
6. Tick G-R only if items 1–5 are green. Do NOT merge to main — the Integrator does that after the G-R review.
Reply with the short contract (≤15 lines) and the final `git rev-parse --short HEAD`.
