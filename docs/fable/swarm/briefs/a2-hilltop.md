# Lane brief: a2-hilltop (Phase 7 — area polish pass: the meditation hilltop (summit))

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/a2-hilltop   Branch: fable/a2-hilltop (from fable/integration)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/a2-hilltop-report.md
Read: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md, AGENTS.md, BUILD_GUIDE_FABLE.md §2 (AAA bar + area bar), §3, §14 (A.1–A.8, gate G-A), the status +
handoff files of every family in your area (docs/fable/status|handoff/*), docs/fable/baseline/budgets.md + perf_gv1.md (+ perf_gv3.md
if present), and the Integrator ledger lines that defer work to you: `grep -nE "minor \(deferred|a2-hilltop|R5[0-9]" /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/progress.md`.

## Scope (Integrator ruling R58, extends guide §14)
§14 limits area lanes to params, kit-overrides.json defaults and area notes. Because the family lanes are finished, you MAY also
make SMALL fixes inside src/kit/<family>/** for the deferred minors listed for your area (each fix: the family's contract test +
footprint/systems/summit goldens stay green, an L6 pair re-shot where the look changes). Anything bigger → an issue in your status
file (ranked) for the operator. Hot files: only those named below. Never edit classic code paths (classic stays byte-identical).

## Area specifics
- Deferred minors to fix: kit pollen must damp on reduce-motion (R55; classic pollen stays as is); s4 butterflies bright at night;
  kit rain/snow snap on summit entry (~1 s) → ramp like classic or document; s2 stone tint at noon; s2 parity tool's lanternY should
  measure the built toro's world y; summit-trees/slope-forest stay deferred unless a study can be added cheaply; s3 minors: night lit-city wave is weak from the
  seat (strengthen within budget), pagoda proxy lighting in rain/storm, kyoto-city far tier is only fewer houses.
- Tooling (GRANTED): tools/summit_preview.html/js — add a kit runtime + `&assets=`/`&swap=` flags (both s2 and s4 had to use
  scratch copies), so summit captures are reproducible on both sets. Keep every existing view and flag working.
- Judge from the meditation seat first (`tools/summit_preview.html?view=meditation` at four times) — meditation is the point of
  this place; then arrival and the lower path. The protected view (perchSightlineAt) must hold.
- Routes: torii steps → lower path → clearing; clearing → meditation seat; brow walk along the shoulder.

## Steps (§14)
A.1 Walk it at cat height along three fixed routes (write them down as camera paths) at dawn, noon, dusk, night; clear/rain/snow
where supported; capture every ~10 m with tools/game_shot.mjs on ?assets=modular (small JPGs in docs/fable/status/a2-hilltop/, ≤150 KB,
keep the set ≤ 60 images); list every frame that breaks the bar. A.2 composition, A.3 light, A.4 life, A.5 sound, A.6 performance
(tier distances before cutting detail; record numbers), A.7 comfort (reduce-motion, high-contrast prompts, large text, FOV — boot
with each set and check), A.8 status file with before/after pairs vs the Phase 0 captures (docs/fable/baseline/captures/) and the
remaining issues ranked. Fix what the bar and your scope allow; record the rest honestly.
Checks: G1, every touched family's contract test, goldens, boots classic + modular. Push, PR into fable/integration
(title "a2-hilltop: <area> polish"), report per _common.md.

## Gate G-S (closing Phase 4) — do this at the end
s1–s4 are merged. G-S: "summit test and verify pass with no check removed; meditation view accepted by the operator; G1–G4 pass."
Ruling R59: the operator is asleep — the Integrator accepts the meditation view PROVISIONALLY from your four-time seat captures
(classic vs modular, after your polish); record that in the §6 G-S line ("provisional, operator may overturn") — you are GRANTED
BUILD_GUIDE_FABLE.md §6 for that one tick with evidence (summit_test count, summit golden, summit_kit_parity, verify, G1, boots).
