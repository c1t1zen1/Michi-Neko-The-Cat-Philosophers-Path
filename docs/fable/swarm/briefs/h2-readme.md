# Lane brief: h2-readme (Phase 8 — README and docs rewrite)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/h2-readme   Branch: fable/h2-readme (from fable/integration after h1-hero merged; the dispatch names the base)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/h2-readme-report.md
Read: briefs/_common.md (same folder), AGENTS.md, BUILD_GUIDE_FABLE.md §0, §2, §3, §6, §15 (lane h2-readme: H2.1–H2.3 are your acceptance
list), Appendix C, docs/fable/decisions.md (D8), docs/images/README.md and docs/fable/handoff/h1-hero.md (the new image paths), the current
README.md, INSTALL.md, QUICKSTART.md, catalog/README.md, cadJS/README.md, labs/ASSET_COVERAGE.md, docs/fable/baseline/budgets.md.

## Files you own
README.md (full rewrite, not an append: restructure and rewrite, but carry over every still-true fact, the licence, credits and "How this was made" text; nothing true is lost), INSTALL.md, QUICKSTART.md, AGENTS.md (layout table, cache-tag file list, kit rules, summit
ownership, status — keep every fact that is still true; the agents depend on it), catalog/README.md, labs/ASSET_COVERAGE.md
(regenerate with `node tools/labs_coverage.mjs --write`, never hand-edit). Nothing under src/, rooftops/, tools/ (except reading).
NOTHING under cadJS/ or dawCAT/ (the operator's standing rule: never stage those subprojects). Guide H2.2's cadJS/README.md update
("Game boundary" and "Structural limitation") becomes proposed text in docs/fable/handoff/h2-readme.md for the operator to apply.

## Rules
- Keep it true: every claim maps to something merged on fable/integration. Read the code or run the check before you write a sentence about
  it. The default asset set is still `classic` (the flip is a later, operator-approved step): say so plainly, and how to try modular
  (`?assets=modular`, the setting if it exists). Say what has NOT been benchmarked (real phones, low-end GPUs — §0, Z.9).
- Voice: plain, warm, short sentences; the game's identity (no fail states, no combat, no timers; free exploration). Keep the existing
  licence and credits facts exactly. Keep the "How this was made" honesty. Concept art stays in its own labelled section (D8); the
  "From the build" gallery holds only real captures with dates.
- Structure: H2.1's thirteen sections in that order. "Make and swap an asset" is a short, runnable tutorial (lab → kit family →
  `node tools/kit_index.mjs` → contract test → catalog → cadJS → `?swap=id:modular`), checked against the real commands.
- H2.3: every relative link and image path resolves (write a tiny scratch checker outside the repo; report its output); the page reads well at
  desktop and phone widths (GitHub renders README; check line lengths of tables and image widths — render the markdown to HTML in a scratch
  page and screenshot it at 1280 and 390 px with tools/headless.mjs).
Checks: link checker 0 broken; `node tools/labs_check.mjs`, `node tools/verify.mjs` (AGENTS.md is read by checks — keep them green);
`node --test tools/labs_coverage_test.mjs`. Push, PR into fable/integration ("h2-readme: README and docs rewrite"), report per _common.md.
