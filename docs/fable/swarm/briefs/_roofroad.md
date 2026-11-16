# Roof Road kit lane template (Phase 5: r2, r3, r4, r5)

Read with: _common.md, _village.md (the standard lane recipe L1–L10, kit rules, R36/R52/R54 — all binding here too),
then your per-lane brief. Guide: BUILD_GUIDE_FABLE.md §12 (the paragraph "The run's geometry is gameplay" and the
parallel-lanes table), §9 standard lane recipe. Spec: docs/superpowers/specs/2026-10-24-rooftop-road-design.md and the
Roof Road docs on main (docs/ROOFTOPS_*_2026-11-13.md).

## Required reading from r1 (merged before you start)
`docs/fable/handoff/r1-roof-split.md` and `docs/fable/status/r1-roof-split.md`: the piece ids and which lane owns each,
how a Roof Road piece reaches `assets.build` (the layout object your builder receives, part names, the Roof Road's own
`AssetRuntime`, `?assets=` / `?swap=` on `kyoto-rooftops.html`), and the numeric rooftop golden. Your ids are exactly the
ones r1's handoff assigns to your lane — promote each or defer it with a reason.

## Your files (only these)
- `src/kit/<family>/**` — your NEW family folder (named in your brief). Two lanes never share a family.
- `labs/roofroad/<lane>/**` — your specimens (L4 gap studies) and notes; register them only through your handoff
  (labs/registry.js and labs/roofroad shared files are the Integrator's after r1).
- `docs/fable/status/<lane>.md` (+ `docs/fable/status/<lane>/` compare JPGs), `docs/fable/handoff/<lane>.md`.
Read-only for you: everything under `rooftops/js/` (build.js, game.js, pieces/**, and above all level.js, rail.js,
physics.js, reach.js, autopilot.js and the companion code), every hot file, every other family.

## Gameplay is geometry (binding)
Platform heights, widths and positions do not change. A kit piece must give the run exactly the platforms, colliders,
grab edges and pickups the classic piece gives (the numeric rooftop golden proves it on modular with your ids swapped);
any visual overhang that could catch the cat's jump arc is a defect even if the golden passes — check the reach graph
(`node tools/rooftop_test.mjs` must pass with your ids swapped too if the test can take a query/env; otherwise boot the
page with `?auto=1&swap=…` and confirm the autopilot finishes).
The Roof Road is also being extended by the operator on an outside branch (feat/rooftops-stage2: more mouths built from
the SAME piece types). Never touch it. Build pieces generically from their layout, never from a mouth number.

## Checks (L7, add to _village.md's list)
```
node tools/rooftop_test.mjs                          # all pass, report the count
node tools/rooftop_companion_test.mjs
node tools/rooftop_golden.mjs                        # classic EQUAL; and with your ids on modular: only waived diffs
node tools/kit_contract_test.mjs --family <family>
```
(use each tool's --help for its real flags; r1 documents the golden's flags in its handoff.)

## L6 compare
`kyoto-rooftops.html?mouth=<n>&cat=0&shot=1&nohud=1` (+ `&hour=` 0..1 for dusk/night) captured headlessly with
tools/headless.mjs (Metal: `--use-angle=metal`), once `?assets=classic` and once `?swap=<ids>:modular`, framed on each of
your piece types. Mouth captures are not pixel-repeatable (P0 note: time loops) — judge by eye and say so; the numeric
golden is the gate. Small JPGs (≤150 KB) in docs/fable/status/<lane>/. Read them yourself and judge AAA-1/AAA-5 honestly.

## Integrator update (2026-11-15) — binding
- r1 is merged (by the operator, onto main, ruling R69). The Roof Road on integration now includes stage 2: 13 mouths and the
  operator's alley passages, crowds and camera obstacles. Piece ids and lanes are in docs/fable/handoff/r1-roof-split.md.
- KNOWN BASELINE FAILURES (from the operator's stage-2 route, commit 17c9cae; not yours, do not fix them, never edit level.js):
  `node tools/rooftop_test.mjs` → 38 passed, 2 failed ("every piece sits on one straight leg", "autopilot reaches the perch":
  stops after drama school ridge @1221.6, s≈1232), and rooftop_companion_test's "player reaches finale" fails. Your gate is NO NEW
  failure: the same 2 failing names with the same detail lines, on classic AND with your ids swapped. `?auto=1` stalls at
  s≈1232 on the baseline; with your swap it must stall at the same s (record it), not earlier.
- Cache tags: the Roof Road now imports with 20261114a (R70) — one module graph. New files use 20261114a.
- `?assets=modular` on the Roof Road page loads the whole valley kit (r1 review minor 4). The first Roof Road family may add a
  family filter in its handoff (runtime change = Integrator patch), not in-lane.
