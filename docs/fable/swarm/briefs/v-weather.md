# Lane brief: v-weather (Phase 2, wave 2.3 — systems and life)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/v-weather   Branch: fable/v-weather (from fable/integration)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/v-weather-report.md
Read in order: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md, then /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_village.md (the standard lane recipe, files, checks), then this card.
Guide card: BUILD_GUIDE_FABLE.md §9 wave 2.3 row `v-weather` and the paragraph above the table ("These replace shaders and simulations…"), Appendix D.

- Family folder: `src/kit/weather/`        Lab: `labs/weather/` (lab 20, 22 (labs/weather, labs/komorebi))
- Classic builders / system: `src/particles.js` (split by f3), the dappled-light builder
- Inventory ids you own (promote each, or defer with a reason): `dappled-light`, `rain`, `snow`, `falling-petals`, `river-petals`, `fireflies`, `dust-motes`, `scent`, `splash`, `landing-dust`, `rain-ripples`
- Gap ids needing a lab specimen first (L4 — no study, no swap): `fireflies`, `dust-motes`, `splash` (related), `scent`, `landing-dust` (missing) — add focused specimens to labs/weather (komorebi lab for dappled light)
- Single-writer grant (system lanes, guide §9 wave 2.3): single writer of `src/particles.js` for this lane. Record the grant in your first commit message ("Integrator grant: single writer of …"). Any other hot file → exact patch in your handoff.
- Classic must stay byte-identical on screen: with `?assets=classic` (and always on quality `low`) the system runs today's code path. Modular behaviour is selected through the runtime (`game.assets`, `resolveSet`/`?swap=<id>:modular`). Goldens (`node tools/footprint_golden.mjs`, `--systems`) EQUAL on classic; full headless boot clean on classic and with your ids on modular.
- Card notes (binding): Rain rings (`rainRipples` pool, separate from cat/koi ripples), wetness, settling snow, petal drifts, komorebi. The two retired builders in the inventory stay retired. Reduce-motion (comfort settings) must still damp particles. `grass-fireflies` is at standard (grass.js) — not yours. s4-summit-life will reuse your rain/snow/petals: keep spawn volume params general.
- Already merged kit families you may REUSE by importing from `src/kit/<family>/` (read-only): check `ls src/kit` after merging integration.
