# Common brief — every Michi-Neko "Fable" worker reads this

You are a worker in the swarm described by `BUILD_GUIDE_FABLE.md` (in your worktree).
The controller is the Integrator. The operator (human) is asleep; do not wait for them.

## Read first (in your worktree, nothing else first)
1. `AGENTS.md`
2. `BUILD_GUIDE_FABLE.md` §3 (architecture), §4.5 (file ownership), §5 (rules), and your lane card
3. Your lane brief (the file that pointed you here) — it overrides the guide where they differ
4. `docs/fable/decisions.md` and `docs/fable/status/<your-lane>.md` if they exist

## Hard rules (from guide §5 plus Integrator rulings)
- Work ONLY in your worktree directory and ONLY in the files your brief lists as yours.
- Never edit a hot file (guide §4.5) unless your brief explicitly grants it. Need a change there?
  Write it as an exact patch/instruction in `docs/fable/handoff/<lane>.md`.
- Never add, remove or reorder a `this.random()` / `this.rng()` call in `countryside.js` or `mountaintop.js`.
- Never weaken/delete a test or check to make it pass. Add tests for new behaviour.
- Never bump `?v=` cache tags; never bulk-`sed` across `src/`. New files import game modules with the
  tag currently in your worktree (grep an existing `?v=` in `src/main.js`).
- No new npm dependencies, no build step, no downloaded textures/models. No secrets anywhere.
- No destructive git (no force-push, no reset of shared branches, no branch/worktree deletion).
- Preserve line endings (check `file` / CRLF) and UTF-8 (Japanese text, em-dashes).
- Scratch captures/scripts go OUTSIDE the repo: use `/Users/c1t1zen/Documents/GitHub/michi-wt/_scratch/<lane>/`.
- Never `git add -A` / `git add .`; stage explicit paths. Never stage anything under `dawCAT/` or
  `cadJS/` unless your brief says the lane edits them (then only the files you changed).
- Determinism: no `Math.random()` / `Date.now()` in geometry; kit assets use `ctx.rng`.
- Blocked after two attempts at the same problem: write `BLOCKED: <what you tried, what happened>` at the
  top of your status file, commit, push, and report BLOCKED. Do not work around it in files you don't own.
- Report what you actually ran and what it printed. "Should pass" is not a result.
- You do NOT dispatch subagents of any kind (no helpers, no reviewers). The controller schedules review.

## Environment
- macOS arm64, Node v26, Python 3.14. Serve the repo root over HTTP for browser pages (ES modules).
- Playwright lives OUTSIDE the repo: `export PLAYWRIGHT_MODULE=/Users/c1t1zen/.npm/_npx/e41f203b7505f1fb/node_modules/playwright`
  (v1.63.0, Chromium cached). Use `--use-angle=metal` for real GPU rendering (fast); SwiftShader is slow.
- Once Phase 0 has merged, `node tools/headless.mjs --help` is the shared CLI to run any repo page headlessly
  (it serves the worktree itself on a free port, so lanes never collide on ports). Prefer it over ad-hoc scripts.
- Three.js r160 via import map from unpkg — runtime needs network.
- Several workers run at once in sibling worktrees. Keep heavy browser runs short; don't leave servers running.

## Git flow for your lane
- Your worktree and branch already exist (see your brief). Base = `fable/integration` at dispatch time.
- First commit creates `docs/fable/status/<lane>.md` from guide Appendix B (model name, start time, base commit).
- Commit after each step with a clear message; tick the step in YOUR status file only (never the guide's board).
- Push: `git push -u origin fable/<lane>` (claim = push). At the end, open a PR:
  `gh pr create --base fable/integration --head fable/<lane> --title "<lane>: <summary>" --body-file <file>`
  (end the PR body with the line `🤖 Generated with [Claude Code](https://claude.com/claude-code)`).
- End every commit message with the line: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  (use your own model name if you are not Opus — e.g. `Claude Sonnet 5.5`, `Claude Fable 5.1`).
- Do not merge anything. The Integrator merges.

## Report contract
Write your full report to the report file named in your brief: what you built, every check command with
its real output (trimmed to the relevant lines), files changed, assets promoted/deferred and why,
footprint waivers, self-review against the lane's acceptance list, open concerns.
Then reply with ONLY (under 15 lines): Status (DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT),
commits (short SHA + subject), one-line check summary, concerns, report path, PR URL.
If the controller resumes you with review findings: fix them, re-run the covering checks, append a
"Fix round N" section to the same report file, push, and reply with the same short contract.
