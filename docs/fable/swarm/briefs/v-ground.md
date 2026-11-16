# Lane brief: v-ground (Phase 2, wave 2.3 — systems and life)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/v-ground   Branch: fable/v-ground (from fable/integration)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/v-ground-report.md
Read in order: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md, then /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_village.md (the standard lane recipe, files, checks), then this card.
Guide card: BUILD_GUIDE_FABLE.md §9 wave 2.3 row `v-ground` and the paragraph above the table ("These replace shaders and simulations…"), Appendix D.

- Family folder: `src/kit/ground/`        Lab: `labs/ground/` (lab 01)
- Classic builders / system: ground/path builders in countryside.js (split form: `valley-ground`, `path`, `path-shoulders`, `path-slabs` — find them via placeAsset ids) and the BiomeMask hookup in `Vegetation.buildMeadow()`
- Inventory ids you own (promote each, or defer with a reason): `valley-ground`, `path`, `path-shoulders`, `path-slabs`
- Gap ids needing a lab specimen first (L4 — no study, no swap): none (`paddy-bunds` belongs to v-water)
- Single-writer grant (system lanes, guide §9 wave 2.3): none by default — your kit assets route through placeAsset; if the GroundField must write the grass BiomeMask from vegetation.js, write the exact patch in your handoff (Integrator applies it). Record the grant in your first commit message ("Integrator grant: single writer of …"). Any other hot file → exact patch in your handoff.
- Classic must stay byte-identical on screen: with `?assets=classic` (and always on quality `low`) the system runs today's code path. Modular behaviour is selected through the runtime (`game.assets`, `resolveSet`/`?swap=<id>:modular`). Goldens (`node tools/footprint_golden.mjs`, `--systems`) EQUAL on classic; full headless boot clean on classic and with your ids on modular.
- Card notes (binding): Port labs/ground's `GroundField` (js/field.js) and the one ground material (js/ground.js: height blend, hex tiling, pavings + POM, wetness, puddles, snow) into the kit, tier-gated: `far`/quality-medium may drop POM and puddles. The field must keep writing the grass `BiomeMask` (grass thins where paws pass; lawns stay). Mark buffers render with `renderer.autoClear = false`. Classic ground stays for `low`. Wetness/snow come from `update(env)` (env.wet, env.snow). Colliders and walk heights must not change (golden).
- Already merged kit families you may REUSE by importing from `src/kit/<family>/` (read-only): check `ls src/kit` after merging integration.
