# Integrator merge delegate — instructions (guide §4.6). The dispatch names LANE(s) and anything special.

You act for the Integrator on the integration worktree /Users/c1t1zen/Documents/GitHub/michi-wt/integration (branch
fable/integration). You merge reviewed, approved lanes ONE AT A TIME, in the order given. Read first: AGENTS.md (Run,
Cache busting, Verification), BUILD_GUIDE_FABLE.md §3, §4.5, §4.6, §6 (master board), Appendix C, and docs/fable/README.md.
export PLAYWRIGHT_MODULE=/Users/c1t1zen/.npm/_npx/e41f203b7505f1fb/node_modules/playwright

## Per lane
1. `git fetch origin`; the lane branch is `origin/fable/<lane>`. Confirm its status file (docs/fable/status/<lane>.md) shows
   L1–L10 ticked or explains each gap, and read docs/fable/handoff/<lane>.md.
2. `git merge --no-ff origin/fable/<lane> -m "Merge <lane>: <one line> (PR #<n>)"` (find the PR number with
   `gh pr list --head fable/<lane> --state all`). Conflicts: `src/kit/index.js` → regenerate (`node tools/kit_index.mjs`);
   `labs/ASSET_COVERAGE.md` → regenerate (`node tools/labs_coverage.mjs --write`); `?v=` tags → keep the integration tag;
   status/handoff files of OTHER lanes → keep both. Anything else: resolve keeping both sides' intent; if unsure, abort
   the merge and report BLOCKED with the conflict.
3. Apply the handoff in a follow-up commit ("<lane> handoff: …"): inventory rows in labs/asset_inventory.json (keep the
   file's formatting; validate JSON; `node tools/labs_coverage.mjs` must pass — `--write` the report if lines moved),
   labs/registry.js specimen/lab entries, helper moves into src/kit/craft.js or materials.js ONLY if the handoff gives an
   exact patch and the move does not change any family's behaviour (otherwise record it as pending in the board note),
   and exact hot-file patches it lists (countryside.js/vegetation.js/main.js/etc.) — apply verbatim, then prove classic is
   unchanged (footprint golden EQUAL). Catalog `production` adapter ids are recorded for lane t1 — append them to
   docs/fable/handoff/_production_adapters.md (create it: one table, lane | id | kit export), do not edit the catalog.
   If the fable swap matrix generator needs updating, run `node tools/fable_swap_matrix.mjs --write`.
4. `node tools/kit_index.mjs` (commit if changed), then gate G1: `node tools/check_syntax.mjs`, `node tools/verify.mjs`,
   `node tools/kit_check.mjs`, `node tools/labs_check.mjs`, `git diff --check HEAD~1` (and for the merge commit
   `git diff --check <pre-merge-head>..HEAD`); plus `node tools/footprint_golden.mjs` (EQUAL), `node --test tools/labs_coverage_test.mjs`,
   `node tools/kit_contract_test.mjs --family <family>` for the merged family, and `node tools/fable_swap_matrix.mjs` (current).
   After merging any lane that adds or changes a kit family: `cd cadJS && npm run check` and `cd catalog && npm test` must pass (R67).
   Any failure: fix only if it is integration glue (regeneration, tag, JSON); otherwise `git merge --abort`/revert your
   commits and report BLOCKED with the output.
5. Tick the lane `[x]` on the master board in BUILD_GUIDE_FABLE.md §6 (only the board row; Integrator-only file) in the
   handoff commit. Push: `git push origin fable/integration`. Close the PR: `gh pr merge <n> --merge` is NOT used (we
   merged locally); instead `gh pr close <n> -c "Merged into fable/integration as <sha>."` only if GitHub did not
   auto-mark it merged after the push (check `gh pr view <n> --json state`).
Commits end with: Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>. Stage explicit paths only; never anything
under dawCAT/ or cadJS/ unless the lane changed it. Never force-push. Never touch other worktrees or the main checkout.

## Report
Reply with ONLY: per lane — merge sha, handoff items applied / pending, G1 + golden + contract results (one line), PR
state; then any BLOCKED item with the exact output. You do not dispatch subagents.

- Scratch worktrees you create: remove them with plain `git worktree remove <path>` (never `--force`); if it refuses, leave the worktree and report it.
