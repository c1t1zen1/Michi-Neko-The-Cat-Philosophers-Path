# Gate review G-V3 (Reviewer: Fable) — the whole village merged → this gate merges to `main`

You review and test; you do not write lane code. Read-only: never commit, modify tracked files, or push.
Checkout: a detached read-only worktree named in the dispatch (a fixed commit of fable/integration after the G-V3 chores).
Gate G-V3 (guide §9): "all village lanes merged or explicitly deferred; G1–G4 pass; performance re-measured at the four spots
on all three tiers and compared with the budgets; operator may merge to main". This is the first merge to `main` since G-F
(main is at the dispatch's MAIN sha): everything waves 2.1–2.3, Phase 3, Phase 4 and Phase 6 merged reaches players' files,
with `assetSet` still `'classic'` by default.
Read: BUILD_GUIDE_FABLE.md §2 (AAA-1…10), §3, §5, §6 (board + notes), §9; docs/fable/baseline/budgets.md, perf_gv1.md,
perf_gv3.md; reports/gate-v3-chores-report.md, reports/gate-v2-chores-report.md, reports/gate-v1-review-report.md (all in the
workspace folder next to this brief's folder).
export PLAYWRIGHT_MODULE=/Users/c1t1zen/.npm/_npx/e41f203b7505f1fb/node_modules/playwright

## Judge
1. Classic safety (the one that matters most — players get this): diff every hot file (guide §4.5) between MAIN and the
   review commit. For each change, confirm a player on default settings (classic, any quality tier) runs the same code path
   and sees the same frame: footprint golden classic + `--systems` EQUAL; summit golden EQUAL; cat golden EQUAL; classic boot
   console clean (only known lines); and at least four classic `node tools/game_shot.mjs` pairs (street noon, shrine dusk,
   river night, meadow rain) built from MAIN vs the review commit (scratch worktrees under
   /Users/c1t1zen/Documents/GitHub/michi-wt/_scratch/gate-v3-review/) → maxDelta 0 or explained. Cache tag bumped everywhere
   (a stale tag would load duplicate modules on a returning player's browser).
2. Saves: a save written on MAIN loads on the review commit with `?assets=classic` and `?assets=modular` (the G-C drill
   repeated on the final tree), and no new key is required.
3. Performance: re-run perf_spots at two spots (the chores report's worst one + one other) on medium and high, classic vs
   modular, on a quiet machine (`uptime` 1-min < 3; record it). Do the numbers match perf_gv3.md? Any budget RULE (modular
   medium ≤ classic high; R52 draws ≤ classic per tier; per-asset tris) failing is Important.
4. Spot-check TWO wave-2.3 system lanes end to end against AAA-1…AAA-10 (v-ground and one of v-water / v-sky / v-weather /
   v-trees — say why): read the family, run its contract test, open its L6 pairs, boot with only that family swapped,
   capture one shot of your own at cat height at dusk, verify footprint/collider/walk-height claims.
5. Modular as a whole: boot `?assets=modular` and walk the cat (input API) across street → bridge → meadow; console clean;
   no missing bound parts (warn-once lines); interiors enter/exit; night lanterns kindle.
6. Deferred work is recorded where the next lanes will see it: §6 board notes, budgets.md "Known over-budget build times",
   ledger minors for a1-village. Anything silently dropped is a finding.

## Output
Write to the report path in the dispatch: "### Verdict: GO (merge to main) | NO-GO" first line, then findings
(Critical/Important/Minor with file:line), evidence (command → real result), and a deferred-minor triage (which lane owns
each). Reply with ONLY the verdict line, counts, and one line per Critical/Important. You do not dispatch subagents.
