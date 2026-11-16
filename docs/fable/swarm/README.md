# docs/fable/swarm/

A snapshot (2026-11-16, refreshed at the second pause) of the swarm's working records for `BUILD_GUIDE_FABLE.md`. They are kept here so the build can be
resumed from any machine or session.

| Path | What it holds |
|---|---|
| `RESUME.md` | The ready-to-paste prompt that restarts the build from the second pause (2026-11-16). |
| `ledger.md` | The Integrator's ledger: every dispatch, review verdict, merge, gate and ruling (R1–R89), in order. Read the rulings first (`grep -n "Ruling R" ledger.md`). Some stamps between 22:45 and 01:16 on 11-14 are wrong; a clock-correction line in the ledger explains it. |
| `briefs/` | The lane and gate briefs the workers were given. `_common.md` (rules every worker follows), `_village.md` (the standard kit-lane recipe plus later rules R36/R52/R54), `_roofroad.md` (Roof Road lanes), `_merge.md` (merge delegate), `_review.md` / `_rereview.md` (reviewers), one file per lane, and the gate chores/review briefs. **Next up: `b1-build-budget.md` (finish fix round 1), a fresh review of `h2-readme.md`, the solo timing window, then `z-final.md`.** |
| `reports/` | Each worker's full report and each gate report (`gate-*-report.md`), plus the operator-approved Roof Road route-fix patches (`route-fix*.patch`, applied as R78). |
| `reviews/` | Review and re-review verdicts per lane (the review diffs themselves are not kept; regenerate them from git). |

The live copies are in `.superpowers/sdd/BUILD_GUIDE_FABLE/` in the main checkout, which git ignores. When you resume, continue the
ledger there, or here if that folder is gone, and keep this snapshot in step at each gate.
