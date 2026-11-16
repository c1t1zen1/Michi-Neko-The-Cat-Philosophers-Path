# Lane brief: a1-village (Phase 7 — area polish pass: the Kyoto village (valley))

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/a1-village   Branch: fable/a1-village (from fable/integration)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/a1-village-report.md
Read: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md, AGENTS.md, BUILD_GUIDE_FABLE.md §2 (AAA bar + area bar), §3, §14 (A.1–A.8, gate G-A), the status +
handoff files of every family in your area (docs/fable/status|handoff/*), docs/fable/baseline/budgets.md + perf_gv1.md (+ perf_gv3.md
if present), and the Integrator ledger lines that defer work to you: `grep -nE "minor \(deferred|a1-village|R5[0-9]" /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/progress.md`.

## Scope (Integrator ruling R58, extends guide §14)
§14 limits area lanes to params, kit-overrides.json defaults and area notes. Because the family lanes are finished, you MAY also
make SMALL fixes inside src/kit/<family>/** for the deferred minors listed for your area (each fix: the family's contract test +
footprint/systems/summit goldens stay green, an L6 pair re-shot where the look changes). Anything bigger → an issue in your status
file (ranked) for the operator. Hot files: only those named below. Never edit classic code paths (classic stays byte-identical).

## Area specifics
- Deferred minors to fix (from the ledger): alley corner-post z-fight + hidden far core box; nest egg gloss (reuse MAT.birdEgg) +
  noon lining saturation; pagoda valley overhang 0.30–0.35 (classic width); hidden lotus leaf + glade lantern 3 cm bob; fences mid tier
  lighter so the R51 exception can be removed (bamboo-fence mid ≤ 6k on 11 m runs, or keep the exception with the reason); trees
  maple silhouette + a wind-motion pixel proof (freeze time, uWindGlobal 0 vs 4); butterflies too bright at night (critters emissive);
  greenery medium peak-call margin; keepsakes glint texture dispose + dango size; garden washi texture dispose; machiya noren hem band.
- Sound (A.5, ruling R50): install the env.audio sink mapping in src/main.js (GRANTED: the sink block t3 added — extend it) for the kit
  events and wire the family call sites from docs/fable/handoff/t3-audio.md (garden clack, shrine bell, lanterns kindle throttled
  ≥0.15 s, water over stones, noren, nest) — edge-triggered only, sink owns gating (mute, autoplay lock); classic unchanged (classic has
  no kit instances).
- Performance: use perf_gv3.md if G-V3 has run; otherwise measure street/shrine/river/meadow on medium+high (quiet machine: uptime < 3).
- Routes: the main street (bridge → tea house → shrine sandō), the river path (paddies → bridge → Moon Pool), the meadow (corral →
  glade → rim forest). Interiors: one pass inside the tea house and the secret house.

## Steps (§14)
A.1 Walk it at cat height along three fixed routes (write them down as camera paths) at dawn, noon, dusk, night; clear/rain/snow
where supported; capture every ~10 m with tools/game_shot.mjs on ?assets=modular (small JPGs in docs/fable/status/a1-village/, ≤150 KB,
keep the set ≤ 60 images); list every frame that breaks the bar. A.2 composition, A.3 light, A.4 life, A.5 sound, A.6 performance
(tier distances before cutting detail; record numbers), A.7 comfort (reduce-motion, high-contrast prompts, large text, FOV — boot
with each set and check), A.8 status file with before/after pairs vs the Phase 0 captures (docs/fable/baseline/captures/) and the
remaining issues ranked. Fix what the bar and your scope allow; record the rest honestly.
Checks: G1, every touched family's contract test, goldens, boots classic + modular. Push, PR into fable/integration
(title "a1-village: <area> polish"), report per _common.md.

## Integrator additions (2026-11-15, after G-V3) — binding
- READ FIRST: docs/fable/baseline/perf_gv3.md and budgets.md §2 and §5, and reports/gate-v3-chores-report.md.
- Ruling R66, you own it: the budgets.md §2 world-build rule fails on modular (build 1.72× classic on medium, 1.74× on high, boot
  +1.2 s; rule 1.25× / +1.0 s). Six first builds take about 420 ms, led by valley-ground (~200 ms) and the clouds. Bring modular under the
  rule without changing what is drawn. Options: cache/precompute per-session work, defer non-visible first builds past the first frame
  through the runtime, cheaper field generation. Prove it with the same measurement perf_gv3.md used (same command, quiet machine,
  load recorded), plus every golden EQUAL. This blocks the default flip, so it is your top priority after the A.1 walk.
- Modular frame time is +1.2–1.8 ms at street/shrine/meadow (ground ≈1 ms GPU, water ≈0.6, fences ≈0.6). Look for cheap wins
  (tier gating at medium, POM/puddle distance, merge-ability) and record before/after. Frame-time rules hold already; this is polish.
- Ruling R62: the single env.audio sink you install in src/main.js also maps the SUMMIT kit events (fūrin, summit lanterns), using the
  call sites listed in reports/a2-hilltop-report.md "summit audio". One sink, one owner.
- v-ground deferred minors (ledger 23:40 line): palette verbatim copy, duplicated sun path, ~35 MB JS heap on modular, wearGrassMask
  mixed interpolation, long upload churn after one walk. Fix the heap and upload churn if they are cheap. They feed the world-build and
  frame-time work above.
- budgets.md §5 lists buildMs exceptions that the quiet pass showed are no longer needed. Drop each one whose family you touch, with a
  quiet re-measure (R54 in reverse: tightening is always allowed).
- Tag is now 20261114a. New files import game modules with it. Kit modules must load in Node without a DOM (R67): no top-level
  countryside.js/textures.js import and no module-level THREE math in src/kit/**. `cd cadJS && npm run check` must pass.
