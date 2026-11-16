# Gate review G-R (Reviewer: Fable) — the Roof Road merged and wired → this gate merges to `main`

Read-only reviewer (never commit, modify tracked files, or push). Checkout: a detached worktree named in the dispatch (a fixed commit
of fable/integration after the G-R chores). MAIN = the dispatch's last-main sha. Report path in the dispatch.
Read: BUILD_GUIDE_FABLE.md §2, §3, §5, §6, §12; reports/gate-r-chores-report.md, reports/r6-game-wiring-report.md,
reviews/r6-game-wiring-review-r1.md + rereview, reports/route-fix-report.md; decisions.md D3; the ledger rulings R57–R81
(`grep -nE "Ruling R[5-8][0-9]" …/progress.md`) — challenge any that leave players worse off.
export PLAYWRIGHT_MODULE=/Users/c1t1zen/.npm/_npx/e41f203b7505f1fb/node_modules/playwright

## Judge (players get this)
1. Valley classic safety vs MAIN: the only valley changes a classic player sees are the Seven Posts (bridge caps + Shōki) and the Odoi
   bank/thicket. Prove: footprint golden (additions only — diff MAIN's golden vs the review commit's), valley rng 49,233, four classic
   game_shot pairs MAIN vs review (differences only on the new objects/shadows), summit + cat goldens EQUAL, music unchanged outside
   the Roof Road, console clean.
2. The Roof Road as a player meets it: unlock discoverable but soft (guidance stays optional), enter/exit never strands the cat, no fail
   states, no timers, a fall puts the cat back on a roof, the arrival hint, "Leave the Roof Road", reduce-motion / large text /
   high contrast in the pocket, the finale plays and returns home. Play it yourself headlessly on both sets (drill + your own path).
3. Saves: MAIN saves load on both sets; no pocket position ever saved; flags restore.
4. Performance: the pocket scene on medium/high (frame ms, draws) vs the valley budgets; entering/leaving does not leak (draw calls
   and JS heap back to valley levels after exit — measure twice).
5. Tags: one cache tag everywhere (no duplicate module instances on any page).
6. Kit on the Roof Road: spot-check two Roof Road families end to end (AAA-1…10) on `?assets=modular`.
## Output
"### Verdict: GO (merge to main) | NO-GO" first line, then findings (Critical/Important/Minor with file:line), evidence, deferred-minor
triage. Reply with ONLY the verdict line, counts, and one line per Critical/Important.
