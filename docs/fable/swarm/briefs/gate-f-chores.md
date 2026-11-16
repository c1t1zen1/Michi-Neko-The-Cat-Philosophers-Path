# Integrator delegate brief: G-F gate chores (end of Phase 1)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/integration (branch fable/integration — the integration branch itself).
You act for the Integrator (guide §4.1): you MAY edit hot files, but only for the items below. One commit per item.
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/gate-f-chores-report.md
Common rules: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md
(attribution, no destructive git, explicit `git add` paths, never touch the main checkout or other worktrees). Push
`fable/integration` after each item (plain push, never force).

Phase 1 is merged: f1-golden, f1-runtime, f2-countryside-split, f3-systems-split. Read their handoff files in
`docs/fable/handoff/` and the status files first.

## Items
1. `src/kit/budgets.js` (or wherever f1-runtime keeps the machine-readable budgets — grep `budgets` in src/kit and tools):
   set the numbers from `docs/fable/baseline/budgets.md` (per-asset triangle caps hero/mid/far 25k/6k/1k, the ≤11 new
   merged materials limit, per-asset build-time allowance, tier rules), drop the "provisional" marker for everything
   budgets.md does not itself mark provisional (frame-ms rows stay provisional), and make `node tools/kit_check.mjs`
   and the contract test read them. Cite budgets.md + decision D1.
2. Apply the page patch in `docs/fable/handoff/f1-golden.md` (golden.error on a diff throw → CLI prints COULD NOT
   COMPARE) to `tools/footprint_golden.js`, and reword its "must update the hook in the same PR" line to "tell the
   Integrator, or update the hook if your brief grants the page".
3. Apply every exact patch in `docs/fable/handoff/f2-countryside-split.md` and `docs/fable/handoff/f3-systems-split.md`
   that the Integrator must apply (e.g. the `src/context_actions.js` interior-anchor patch that changes no values).
   Do NOT apply anything that changes classic output (e.g. the tea-house knick-knack height bug fix — record it as
   deferred to lane v-interiors in `docs/fable/status/f3-systems-split.md` notes instead). Golden EQUAL after each.
4. Refresh the golden's advisory builder-attribution only: run `node tools/footprint_golden.mjs --write` ONLY if a
   JSON diff of old vs new `tools/golden/valley_classic.json` shows changes confined to the advisory `builders`
   section (prove it with a key-level diff in the report); otherwise do not write and report why. Same for the systems golden.
5. Cache-tag bump to `20261113a` — ONE bump for gate G-F, per AGENTS.md "Cache busting": every `?v=` tag in
   `src/**/*.js` (including `src/kit/**`), `index.html`, `tools/*_preview.*` and every other tools page/js that imports
   game modules with a tag (grep `?v=2026` across tools/), `rooftops/js/game.js`, `rooftops/js/build.js`,
   `labs/shared/game.js`, and any other file `node tools/labs_check.mjs` / `node tools/kit_check.mjs` check. Use the
   find-based command from AGENTS.md (byte-safe; zsh-safe). Update "Current tag" in AGENTS.md. Then
   `grep -rn "?v=2026" --include=*.js --include=*.html --include=*.mjs . | grep -v 20261113a | grep -v node_modules`
   must print nothing outside dawCAT/ and cadJS/ (which carry no tags) — show it.
6. Guide notes in `BUILD_GUIDE_FABLE.md` (Integrator-owned): (a) §6 master board: tick `[x]` G-P0, lanes `p0-baseline`,
   `f1-runtime`, `f2-countryside-split`, `f3-systems-split` (add a note that F1.6 was split into lane f1-golden), and
   G-F once item 7 is green; (b) Appendix C G4 row: summit, Roof Road and grass review sheets are NOT pixel-repeatable
   (time-driven loops, unseeded Math.random — see docs/fable/baseline/captures.md); their gates are the numeric goldens;
   (c) AGENTS.md: fix the module count claim (check_syntax now reports the real number).
7. Gate checks (record every command + real output in the report): G1 — `node tools/check_syntax.mjs`,
   `node tools/verify.mjs`, `node tools/kit_check.mjs`, `node tools/labs_check.mjs`, `git diff --check ed9f5b9...HEAD`;
   G2 — `node tools/footprint_golden.mjs` (classic) and `--query "?assets=modular"`, the systems golden, the kit
   contract test CLI, `tools/labs_geometry_test.html` via headless, `node tools/rooftop_test.mjs`, `node tools/summit_test.mjs`;
   G3 — `node tools/catalog_check.mjs`, `node tools/labs_coverage.mjs` + `node --test tools/labs_coverage_test.mjs`,
   `node --test catalog/tests/*.test.mjs`, `node tools/interiors_test.mjs`, `node tools/ranges_test.mjs`; G4 — full headless
   boot on `?assets=classic` and `?assets=modular` (console: only known lines), and `node tools/capture_baseline.mjs
   --compare` (or equivalent) for town/hidden/tree/cat sheets vs the Phase 0 masters (within noise floor).
   Any red: stop, do not tick G-F, report BLOCKED with the output.

Reply with the short contract (≤15 lines) and the final `git rev-parse --short HEAD`.
