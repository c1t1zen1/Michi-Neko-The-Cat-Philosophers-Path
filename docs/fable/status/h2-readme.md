# h2-readme

- Worker / model:     Claude Opus 5.5
- Claimed:            2026-11-16 04:50
- Branch:             fable/h2-readme
- Base commit:        d69a6b0 (fable/h1-hero: fable/integration 9c7f490 plus the h1 hero images); merged
                      origin/fable/integration 865ca20 (h1-hero PR #56, R88) as fb42570
- State:              ready for review

## Assets
None. This lane writes documentation only (README.md, INSTALL.md, QUICKSTART.md, AGENTS.md, catalog/README.md,
labs/ASSET_COVERAGE.md regenerated, and the cadJS README proposal in docs/fable/handoff/h2-readme.md).

## Steps
- [x] L1 Claim (this file)
- [x] L2 Read (brief, guide §0 §2 §3 §6 §15 Appendix C, D8, h1 handoff, the current docs, budgets.md; every changed
      claim checked against the code or a run)
- [x] H2.1 README.md rewritten in the thirteen sections, in order
- [x] H2.2 INSTALL.md, QUICKSTART.md, AGENTS.md, catalog/README.md updated; labs/ASSET_COVERAGE.md regenerated (no change);
      cadJS/README.md proposal in docs/fable/handoff/h2-readme.md §1 (cadJS never staged by this lane)
- [x] H2.3 Link checker 0 broken; README rendered (GitHub's own markdown API + github-markdown-css) at 1280 and 390 px
- [x] Checks: labs_check, verify, labs_coverage_test, check_syntax, git diff --check
- [x] Merge origin/fable/integration, re-check, PR

## Checks run (command → real result)
- `node tools/labs_check.mjs` → All labs checks OK
- `node tools/verify.mjs` → All checks passed
- `node --test tools/labs_coverage_test.mjs` → 18 tests, 18 pass, 0 fail
- `node tools/labs_coverage.mjs --write` → 254 inventory rows, direct=152 review=77 embedded=6 related=11 missing=4; file unchanged
- `node tools/check_syntax.mjs` → All 192 modules OK
- `git diff --check` → clean
- Scratch link checker (`_scratch/h2-readme/linkcheck.mjs`, relative links, image paths and #anchors with GitHub slugs) on the
  seven lane files → 130 checked, 0 broken; on the old README (d69a6b0) → 6 broken (the removed capture-*.jpg), so it can fail
- Render: GitHub markdown API → scratch page with github-markdown-css 5.5.1, headless (tools/headless.mjs, Metal), with `video{max-width:100%}` standing in for GitHub's own video player: 1280 px page
  31 images, 0 broken, no horizontal page scroll, no overflowing table or code block; 390 px no horizontal page scroll, every
  table fits, the 13 code blocks scroll inside themselves (as on GitHub)
- Tutorial, run end to end: kit_index (29 families with a scratch `demo`), kit_check 538 passed, contract `--family demo`
  70 checks 0 failed, catalog preview of the demo, summit preview `?swap=summit-clouds:modular` 1 kit instance; README code
  block re-extracted and re-run verbatim in a second scratch worktree (same results); toro: contract `--family lanterns`
  483 checks 0 failed, catalog production preview and cadJS `?asset=toro&variant=production` load, game_shot classic vs
  `swap=toro:modular` maxDelta 169, 4,749 px > 8. Both scratch worktrees removed with plain `git worktree remove`

## Deferred assets and why
None (no assets in this lane).

## Footprint waivers requested
None.

## Notes for the Integrator
- cadJS/README.md: exact replacement text in the handoff §1 (Current boundaries, Game boundary, structure note, file map,
  Node version). Not applied: the operator's rule.
- Stale text in files this lane does not own (handoff §2): `labs/asset_inventory.json` scope ("the game does not load it
  yet"), `catalog/js/links.mjs:107`, `docs/images/README.md` first paragraph, `rooftops/README.md` route length,
  the catalog inspector's cadJS button label on the production variant.
- `b1-build-budget` was not merged at the end of this lane; the README still says 1.26–1.42 × (handoff §3).
- The video poster is an absolute URL on `main`; it resolves once `main` has `hero-torii-dusk.jpg`.
