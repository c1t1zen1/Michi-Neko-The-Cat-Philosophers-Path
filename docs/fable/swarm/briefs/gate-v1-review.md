# Gate review G-V1 (Reviewer: Fable) — wave 2.1 props merged

You review and test; you do not write lane code. Read-only: never commit, modify tracked files, or push.
Checkout: a detached read-only worktree named in the dispatch (a fixed commit of fable/integration after the G-V1 chores).
Gate G-V1 (guide §9): "all eight merged; G1, G2, G3 pass; budgets (D1) hold with the eight families on modular; Reviewer
spot-checks two lanes end to end. If the pipeline needed a rule change, update §3–§5 before wave 2.2 starts."
Read: BUILD_GUIDE_FABLE.md §2 (AAA-1…10), §3, §5, §9; docs/fable/baseline/budgets.md and perf_gv1.md;
reports/gate-v1-chores-report.md (in the workspace folder next to this brief's folder).
export PLAYWRIGHT_MODULE=/Users/c1t1zen/.npm/_npx/e41f203b7505f1fb/node_modules/playwright

## Judge
1. Classic safety: diff the hot files since the last main merge (the dispatch gives that sha) and confirm a player on main
   with default settings sees no change (goldens EQUAL, classic boot clean, a classic game_shot pair maxDelta 0 vs the
   last main commit if you can build both).
2. Spot-check TWO lanes end to end against AAA-1…AAA-10 (pick the riskiest two of the eight; say why): read the family
   code, run its contract test, open its L6 pairs, boot with only that family swapped and capture one shot of your own at
   cat height near the asset at dusk; verify the footprint claims.
3. Budgets: re-run perf_spots at two spots on medium and high (classic vs modular) and compare with perf_gv1.md.
4. Pipeline rules: are the wave-2.1 lessons (R36 merge-able statics, representative contract samples, two-tier perf,
   material reuse, L6 rules) now in guide §5/§9 and enforced where they can be (kit_check/contract test)? Anything every
   wave-2.2/2.3 lane will trip on is Important.
## Output
Write to the report path in the dispatch: "### Verdict: PASS (tick G-V1) | FAIL" first line, then findings
(Critical/Important/Minor with file:line), evidence (command → result), and a deferred-minor triage. Reply with ONLY the
verdict line, counts, and one line per Critical/Important. You do not dispatch subagents.
