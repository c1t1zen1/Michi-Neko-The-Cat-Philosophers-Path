# Lane brief: z-final (Phase 9 — the Fable review and test; go / no-go for the default flip)

Reviewer and tester: Fable. Mostly read-only: you commit ONLY `docs/FABLE_REVIEW_<date>.md` (and its small evidence JPGs under
`docs/fable/review/`), on branch fable/z-final created from the commit the dispatch names. Never edit code, tests or other docs; findings go in
the review. Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/z-final-report.md
Read: briefs/_common.md (same folder; the rules on scratch dirs, staging, commits apply), AGENTS.md, BUILD_GUIDE_FABLE.md (all of it: §0–§16
and the appendices — Z.1–Z.9 in §16 are your acceptance list, Appendix C is the verification matrix), docs/fable/decisions.md,
docs/fable/baseline/budgets.md, the gate reports (docs/fable/swarm/reports/gate-*-report.md and the live ones in
/Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/), and every ruling
(`grep -n "Ruling R" …/progress.md`) — challenge any ruling that leaves players worse off.
export PLAYWRIGHT_MODULE=/Users/c1t1zen/.npm/_npx/e41f203b7505f1fb/node_modules/playwright

## Do
- Z.1 a FRESH clone of the repo (`git clone` from the local repo or origin into `/Users/c1t1zen/Documents/GitHub/michi-wt/_scratch/z-final/clone`,
  checkout the named commit); run the entire Appendix C matrix there and record real output.
- Z.2–Z.6 as §16 says. Classic regression against MAIN (the dispatch gives MAIN's sha): footprint golden additions only / EQUAL as the
  matrix says, Phase 0 captures (docs/fable/baseline/captures/) reproduced on `?assets=classic`, headless full boot clean. Modular: full boot
  clean in the valley, at the summit and in the Roof Road pocket; contract suite for every family at every tier. Z.4 fallback drill IN THE
  CLONE ONLY (delete one family folder, regenerate nothing, confirm classic for that family and one warning; corrupt kit-overrides.json, confirm
  ignored). Z.5 saves: a MAIN save (08bd3b5 and 8ab0c9b) loads on both sets; a modular save loads on classic. Z.6 performance at the four valley
  spots, the meditation seat and three Roof Road mouths on low/medium/high against budgets.md — timings only at `uptime` load < 3 (R54), and
  the §2 world-build rule (R66) on medium and high.
- Z.7 code review of every hot-file diff since Phase 0 (`git diff <phase-0 base>..<commit> -- <hot files from §4.5>`) and at least one asset per
  family against AAA-1…10. Z.8 inventory truth: labs/ASSET_COVERAGE.md regenerated (in the clone) equals the committed one; every "shipped"
  claim in README.md matches the inventory and the code.
- Z.9 write docs/FABLE_REVIEW_<date>.md: findings ranked (Critical / Important / Minor with file:line), what was tested and how, what was NOT
  tested (phones, low-end GPUs, listening tests), and a clear **go / no-go for the default flip** (X.1–X.4 in §16) with its conditions.
Remove the clone with plain `rm -rf` of the scratch folder only after the report is written (it is outside the repo). Commit the review on
fable/z-final, push, open a PR into fable/integration ("z-final: Fable review <date>").

## Output
First line of the review and of your reply: "### Verdict: GO for the flip | NO-GO for the flip" (and separately: "Merge to main: GO | NO-GO",
i.e. whether fable/integration may reach main on classic). Reply with ONLY the two verdict lines, counts, and one line per Critical/Important.
