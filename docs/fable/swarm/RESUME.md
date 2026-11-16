# Restart prompt — BUILD_GUIDE_FABLE swarm (paused 2026-11-16, second pause)

Paste everything in the block below into a new Claude Code window opened in the main checkout
(`/Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path`).

```text
Continue the BUILD_GUIDE_FABLE swarm build from where it paused on 2026-11-16 (second pause, session usage limit), and push
everything to GitHub as each step lands. You are the Integrator: you orchestrate subagents, rule on findings, merge, and keep the
ledger. Use the superpowers:subagent-driven-development skill for the review/fix loop.

READ FIRST, in this order:
1. AGENTS.md in the integration worktree, not the main checkout (the main checkout lags).
2. §0 "Status and how to resume" and §6 "Master board" (including its "Open for z-final" notes) of BUILD_GUIDE_FABLE.md on branch
   fable/integration. The worktree is /Users/c1t1zen/Documents/GitHub/michi-wt/integration.
3. The live ledger: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/progress.md.
   It is git-ignored. Read the rulings with `grep -n "Ruling R" progress.md` (R1–R89) and the last ~40 lines. A committed snapshot is
   in docs/fable/swarm/ on fable/integration. If the live folder is gone, continue from the snapshot.
4. The briefs in the same .superpowers folder (briefs/): _common.md, _merge.md, _review.md, _rereview.md, _roofroad.md, plus
   b1-build-budget.md, h2-readme.md and z-final.md for the work ahead.

STATE AT THE PAUSE
- origin/main = ef6adad (the G-R reviewed commit: the Roof Road in the game, classic default), plus one commit on top with the
  operator's own Skretch/ and Shinkansen/ work. fable/integration does NOT contain that operator commit yet. Merge origin/main into
  integration before the next fast-forward of main.
- fable/integration = 865ca20 + the pause docs. Merged since G-R:
  - a3-rooftops (PR #55);
  - pocket reduce-motion live (45c0b54);
  - finale framing (9c7f490; the operator may overturn it);
  - R88, the pocket disposed on exit (713967a);
  - h1-hero (PR #56).
- Gates: G-R done and on main. G-A, G-H and G-FINAL are open. G-S is provisional.
- Cache tag 20261116a. Classic is still the default asset set.

IN FLIGHT (paused; the agents from the old window are gone, so start fresh agents)
1. b1-build-budget. Closes ruling R66, the modular world-build budget that blocks the default flip.
   - PR #57, branch fable/b1-build-budget, worktree /Users/c1t1zen/Documents/GitHub/michi-wt/b1-build-budget, head 1afb974.
   - Round 0: world build 1.20–1.23× classic on medium (pass), 1.30–1.31× on high (fail, rule ≤ 1.25×). Boot total +680–816 ms
     (pass, rule ≤ +1,000 ms). World ready is 1.30–1.42× and is reported for z-final.
   - Fix round 1 (ruling R89) committed two levers: 3cc67e7 (family textures paint on first upload) and 74a87a5 (draw-only classic
     canopy, which keeps the valley rng stream; tools/b1_build_budget_browser_test.mjs).
   - Not done yet, all listed in its status file under "Paused mid fix round 1": the proof re-run, the 12-boots-per-cell interleaved
     re-measure vs ef6adad (medium and high, every boot start at load < 3), the budgets.md §2 tick if both tiers pass, and the
     report's "Fix round 1" section.
   - Dispatch an Opus worker to finish it, then a reviewer, then a merge delegate. Brief: briefs/b1-build-budget.md. Report:
     reports/b1-build-budget-report.md.
2. h2-readme. The README/INSTALL/QUICKSTART/AGENTS/catalog README rewrite.
   - PR #58, branch fable/h2-readme, head 410e487. The work is done and pushed.
   - Its review (an Opus G-H stand-in under R82) was cut off by the usage limit. Dispatch a fresh reviewer; the focus list is in the
     ledger entry for that dispatch.
   - After b1 merges, update the world-build numbers in the docs (they still say 1.26–1.42×).
   - Nothing under cadJS/ or dawCAT/ is touched. The harness blocks that (it is the operator's standing rule), so the cadJS README
     change is only proposed text in docs/fable/handoff/h2-readme.md §1.

NEXT STEPS, IN ORDER
1. Finish b1 → review → merge (rule R67: every kit-family merge runs `cd cadJS && npm run check` and `cd catalog && npm test`).
2. Review h2 → fixes → merge → refresh the world-build numbers.
3. The SOLO timing window (R86/R87: no other agent running a browser; `uptime` 1-min load < 3). It covers:
   - the R66 verdict on medium and high;
   - the provisional timing rows: roof-distant-city far buildMs 6, roof-machiya hero 15, roof-hayashi 10/5/2.5;
   - the watch list: summit-pagoda mid, valley-ground far, summit-bay mid, roof-hoko mid, roof-okuribi mid;
   - `node tools/kit_contract_test.mjs` (all families) three times.
   Fix numbers only from those solo reads (R54: never loosen from a loaded reading), and drop "provisional" from the distant-city why.
4. Tick G-A and G-H provisionally (R82: the operator may overturn), with the evidence in §6.
5. Merge origin/main into fable/integration. Then run z-final (model: fable; brief: briefs/z-final.md) on a fixed commit in a
   detached worktree. MAIN = ef6adad.
6. On a z-final "merge to main: GO", fast-forward main to the reviewed commit and push. Do NOT do the default flip (X.1–X.4) without
   asking me explicitly: show me the z-final verdict and the R66 numbers first.
7. Before stopping: snapshot the ledger, briefs, reports and reviews into docs/fable/swarm/, update §0 of the guide, update the
   memory note, push every branch, and give me a summary.

RULES THAT BIT LAST TIME
- At most ~3 agents at once, and at most 2 of them on Opus. The session usage limit stopped the swarm a third time.
- Timing verdicts come only from a solo window. Readings at load 2–2.3 with three agents running were ~30 % slower than solo.
- Stage explicit paths only. Never stage dawCAT/ or cadJS/. Never force-push. Never edit the main checkout's working tree except
  to commit my own work when I ask.
- Models: workers sonnet, system or perf lanes opus, gate reviews and z-final fable, task reviewers sonnet (opus for prose or
  front-page review).
- Look at hero and capture images yourself before accepting them.
- Check `ps` for leftover scratch scripts from agents. A reviewer once left a detached chain running that competed for quiet windows.
- Env: `export PLAYWRIGHT_MODULE=/Users/c1t1zen/.npm/_npx/e41f203b7505f1fb/node_modules/playwright`. Use `--use-angle=metal`.
- The review-package script lives in the subagent-driven-development skill's scripts/ folder. Usage:
  `bash <skill>/scripts/review-package -C <worktree> <guide> BASE HEAD <out.diff>`.
- Commits end with the Co-Authored-By line for the model that wrote them.

OPERATOR TO-DOS (tell me about these at the end; don't do them)
- The cadJS README proposal (docs/fable/handoff/h2-readme.md §1).
- Stale text in files h2 did not own (same handoff §2).
- The rulings marked "operator may overturn": R82 (provisional G-A and G-H), R84/R85 (warm-build allowances, median of 3), the
  finale camera change, R88 (dispose on exit).
- The open visual items in §6 "Open for z-final".
- The default flip decision.
```
