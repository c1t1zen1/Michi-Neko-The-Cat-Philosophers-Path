# Gate review G-F (Reviewer: Fable) — Phase 1 foundation (+ Phase 3 c1/c2 already merged)

You are the Reviewer named in BUILD_GUIDE_FABLE.md §4.1 ("Fable, at the end and at each gate"). You review and test;
you do not write lane code. Read-only on every worktree: never commit, never modify files, never push.

Checkout to review: /Users/c1t1zen/Documents/GitHub/michi-wt/integration (branch fable/integration). Base of the
whole project: `ed9f5b9` (= main, the live site). Gate G-F (guide §8): "G1 and G2 (Appendix C) pass on
fable/integration; golden diffs empty; operator may merge to main (classic remains default, so players see no change)."
If you approve, the Integrator fast-forwards `main` (GitHub Pages — live players) to this integration HEAD.

## What to judge (in this order)
1. **Live-site safety (the deciding question).** With no URL flags and default settings, is the game a player loads
   from `main` after this merge identical to today's? Review every hot-file diff since ed9f5b9 with
   `git diff ed9f5b9..HEAD -- src/main.js src/bootstrap.js src/settings.js src/cad_overrides.js src/player.js src/npc.js
   src/cat.js src/context_actions.js index.html` and judge boot ordering (async startGame), error paths (a thrown kit
   import, a 404/invalid kit-overrides.json, WebGL context loss), save compatibility (§3.6), the capture flags' inertness,
   and what a quality-low device downloads. Then skim the large refactors (`src/countryside.js`, `src/vegetation.js`,
   `src/interior.js`, `src/hidden_places.js`, `src/ambient_life.js`, `src/particles.js`, `src/characters/**`) for
   classic-path risks the goldens cannot see (runtime update paths, render order, per-frame allocation).
2. **Evidence.** Run (record command + real output): `node tools/check_syntax.mjs`, `node tools/verify.mjs`,
   `node tools/kit_check.mjs`, `node tools/labs_check.mjs`, `node tools/footprint_golden.mjs` (and `--query "?assets=modular"`,
   and `--systems`), `node tools/cat_golden.mjs`, `node tools/kit_contract_test.mjs`, `node tools/rooftop_test.mjs`,
   `node tools/summit_test.mjs`, a full headless boot of `/__boot.html` on classic and on `?assets=modular`
   (`node tools/headless.mjs --help`; boots take seconds on Metal), and a same-session classic-vs-modular perf spot check
   (`node tools/perf_spots.mjs --help`) against `docs/fable/baseline/budgets.md`.
3. **Contract quality for the ~30 kit lanes about to start** (guide §3 as reconciled): is the AssetRuntime / defineAsset /
   placeAsset / footprint (R12, R18) / scopeAssets / tier-policy contract coherent, documented in §3, and enforced by
   kit_check + the contract test? Anything that will make every lane stumble is Important.
4. Ledger of earlier deferred minors (triage which, if any, must be fixed before main): read the lines containing
   "minor (deferred)", "Parked", "Deferred" in
   /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/progress.md.

## Output
### Verdict: GO (merge to main) | NO-GO — one line, first.
### Live-site safety findings (Critical/Important/Minor, file:line)
### Evidence run (command → result)
### Contract findings for the kit lanes
### Deferred-minor triage (must-fix-before-main vs later)
No preamble. You do not dispatch subagents.
