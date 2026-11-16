# Lane brief: a3-rooftops (Phase 7 — area polish pass: the Roof Road, level two, 屋根道)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/a3-rooftops   Branch: fable/a3-rooftops (from fable/integration; the dispatch names the base)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/a3-rooftops-report.md
Read: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md and
briefs/_roofroad.md (same folder), AGENTS.md (the Roof Road rows), BUILD_GUIDE_FABLE.md §2 (AAA bar + area bar), §3, §12, §14 (A.1–A.8,
gate G-A), the status + handoff files of every Roof Road family (docs/fable/status|handoff/r1-…r6-*.md, r2b, r3b, r4b, r5b),
docs/fable/baseline/budgets.md, docs/fable/status/a1-village.md and a2-hilltop.md (how the other two areas did this pass), and
the ledger lines about the Roof Road: `grep -nE "r[1-6]b?-|R7[0-9]|R8[0-9]|route-fix" /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/progress.md`.

## Scope (rulings R57 + R58, extend guide §14)
§14 limits area lanes to kit params, `kit-overrides.json` defaults and area notes. Because the family lanes are finished you MAY also
make SMALL fixes inside `src/kit/roof*/**` (roofstreets, roofcanal, rooffestival, roofcast) and `src/characters/defs/chidori.js` for the
deferred minors listed below (each fix: the family's contract test + rooftop golden classic EQUAL + modular routing pass, an L6 pair
re-shot where the look changes). `rooftops/js/**`, `kyoto-rooftops.html`, `src/rooftops/**` and `src/main.js` are NOT yours (operator's
level/run code and the r6 wiring): anything there → a ranked issue in your status file with an exact proposed patch. Never edit classic
code paths (classic stays byte-identical: rooftop golden classic EQUAL, footprint golden EQUAL).

## Area specifics
- Two ways in, judge both: the sandbox `/kyoto-rooftops.html` (flags `?at=<s>`, `?mouth=1..`, `?hour=0..1`, `?auto=1`, `?finale=1`,
  `?assets=classic|modular`, `?swap=`, `?shot=1&nohud=1`) and the game pocket (valley bridge → Seven Posts → Odoi gap → pocket; the r6
  report and docs/fable/handoff/r6-game-wiring.md describe the drill and the manager test).
- Routes (write them down as `s` ranges + camera framing in the status file): (1) the bridge gate and the machiya roofs through Pontochō
  (mouths 1–2), (2) the Takase canal, the boat and the Nishiki canopy / laundry sky (mouths 3–5), (3) the festival: yatai, the hoko float,
  the temple gate and the Okuribi finale (mouths 6–7 and the last mouth from `finaleMouth(level)`). Times: dawn, noon, dusk, night
  (`?hour=` is 0..1 on the sandbox). Weather only where the Roof Road supports it.
- Deferred minors to fix or rank (from the family reviews): r2-a crate slat gaps shallow, trellis without bark curls; r2-b the
  decorateHouse bicycle not ported (AAA-1 gap), machiya hero buildMs 12 vs a quiet 11.0 read; r4 hayashi weaker than classic, sky / hills
  / distant city only marginal on AAA-1 (barely framed — judge from the run camera, not a close-up); r4-b okuribi mid/far and pagoda mid
  warm builds (quiet re-read); r5 treats seen close-up only; the rooftop golden glue that finds the distant-city child by position (z-final
  minor: identify by name — `tools/rooftop_golden.js` is GRANTED for that one change, classic EQUAL before and after).
- Still classic by deferral (do NOT port them in this lane; list them in the status file as "deferred, classic"): r2 part c (bridge, corner
  house, roji, balconies, zushi, alley pockets/routes, street, ground), r3 willows, culvert ledges, tenmangu gate.
- Operator layout notes (record, do not fix — `rooftops/js/level.js` is the operator's): overlapping stage-2 legs block the camera near
  s≈1010/1558; mouth 12 zero length; `roofRoad.view` throws under `?finale=1` before the camera is placed; tools/rooftop_browser_test.mjs
  asserts 30 residents where the route has 40.

## Steps (§14)
A.1 Walk it along the three routes at the four times; capture every ~10–20 m of run with the sandbox's `?shot=1&nohud=1` (tools/headless.mjs,
`--use-angle=metal`) on `?assets=modular`, plus the pocket arrival and the finale in the game; small JPGs in docs/fable/status/a3-rooftops/
(≤150 KB each, set ≤ 60 images); list every frame that breaks the bar. A.2 composition (what closes each view, landmark sightlines —
the pagoda, Daimonji, the hoko — lantern rhythm along the roofs). A.3 light (dusk and night lantern falloff, the Okuribi glow, nothing that
ignores fog or time of day). A.4 life (residents, the boat, laundry, banners, festival crowds; nothing moves that should not). A.5 sound
(the Rooftops music mood, the hayashi at the festival, water at the canal, the bell; nothing loops audibly — read the env.audio calls of the
roof families and the r6 music patch). A.6 performance: frame ms, draws, triangles at three Roof Road mouths (one per route) on low /
medium / high, classic vs modular, against budgets.md and R52 (modular draws ≤ classic); measure only at `uptime` 1-min load < 3 (R54;
wait for quiet, record the load next to every number; other agents may be running — never loosen a budget from a loaded reading). Tune
tier distances before cutting detail. A.7 comfort in the pocket and the sandbox: reduce-motion, high-contrast prompts, large text (the
arrival hint, "Leave the Roof Road"), FOV. A.8 status file docs/fable/status/a3-rooftops.md with before/after pairs (classic vs modular
from one camera, and against the Phase 0 / r1 captures where they exist) and the remaining issues, ranked.

Fix what the bar and your scope allow; record the rest honestly. Checks: G1 (check_syntax, verify, kit_check, labs_check), every touched
family's `node tools/kit_contract_test.mjs --family <f>`, rooftop golden classic EQUAL + modular routing, `node tools/rooftop_test.mjs`
40/40, the companion and alley tests and `rooftop_manager_test` per _roofroad.md, footprint golden EQUAL, game boots classic + modular
clean, `cd cadJS && npm run check` and `cd catalog && npm test` if a kit family changed (R67). Push, PR into fable/integration
(title "a3-rooftops: Roof Road polish"), report per _common.md.

## Gate G-A (closing Phase 7) — evidence only
G-A is "operator accepts each area from the capture set". The Integrator records a provisional acceptance (operator may overturn) from
your capture set, as R59 did for the meditation view. Make the evidence easy to judge: a short "contact sheet" section in your status
file listing the best frame per route and time, classic vs modular.
