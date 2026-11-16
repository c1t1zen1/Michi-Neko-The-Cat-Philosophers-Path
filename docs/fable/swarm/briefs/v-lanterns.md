# Lane brief: v-lanterns (Phase 2, wave 2.1 — props the cat walks past)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/v-lanterns   Branch: fable/v-lanterns (from fable/integration after G-F)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/v-lanterns-report.md
Read in order: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md, then /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_village.md (the standard lane recipe, files, checks), then this card.
Guide card: BUILD_GUIDE_FABLE.md §9 wave 2.1 row `v-lanterns`, Appendix D.

- Family folder: `src/kit/lanterns/`        Lab: `labs/lanterns/` (lab 11)
- Classic builders: `buildToroLantern`, `createChochinLantern`, `buildLanterns` (countryside.js); andon and courtyard toro inside `buildInterior` (interior.js); pool toro inside `buildMoonPool` (hidden_places.js)
- Inventory ids you own (promote each, or defer with a reason): `toro`, `chochin`, `street-lamps`, `andon`, `courtyard-toro`, `pool-toro`
- Gap ids needing a lab specimen first (L4 — no study, no swap): `courtyard-toro` (review only), `pool-toro` (embedded only)
- Card notes (binding): Hollow firebox with real apertures. Keep the per-lantern kindle onset (staggered lanterns, AGENTS.md); expose `lanternOn` through `update(env)` and keep glow meshes in `live`. The lantern light pool (`lanternLightCount`) and halos keep working. Interiors/hidden lanes will reuse your toro assets.
