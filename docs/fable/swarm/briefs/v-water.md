# Lane brief: v-water (Phase 2, wave 2.3 — systems and life)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/v-water   Branch: fable/v-water (from fable/integration)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/v-water-report.md
Read in order: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md, then /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_village.md (the standard lane recipe, files, checks), then this card.
Guide card: BUILD_GUIDE_FABLE.md §9 wave 2.3 row `v-water` and the paragraph above the table ("These replace shaders and simulations…"), Appendix D.

- Family folder: `src/kit/water/`        Lab: `labs/water/` (lab 02)
- Classic builders / system: `buildRiverAndBridge`, `buildPaddies` (countryside.js, split form) and their water materials
- Inventory ids you own (promote each, or defer with a reason): `river`, `bridge`, `paddies`, `paddy-bunds`, `rice`, `water-ripples`
- Gap ids needing a lab specimen first (L4 — no study, no swap): `paddy-bunds` (embedded — add a focused specimen to labs/water)
- Single-writer grant (system lanes, guide §9 wave 2.3): none by default — route through placeAsset; ripple-pool or wade hooks in countryside.js/player.js go in your handoff as exact patches. Record the grant in your first commit message ("Integrator grant: single writer of …"). Any other hot file → exact patch in your handoff.
- Classic must stay byte-identical on screen: with `?assets=classic` (and always on quality `low`) the system runs today's code path. Modular behaviour is selected through the runtime (`game.assets`, `resolveSet`/`?swap=<id>:modular`). Goldens (`node tools/footprint_golden.mjs`, `--systems`) EQUAL on classic; full headless boot clean on classic and with your ids on modular.
- Card notes (binding): CPU water field driving ONE chosen shader style (pick the best-reviewed of labs/water's eleven; say why), ONE bridge chosen from the eight (keep the classic bridge's deck height, rails, colliders and its walkable surface EXACTLY — the Roof Road design puts giboshi caps and a Shōki on this bridge later, r6), paddies through the seasons. Ripple pools (`rainRipples`, cat and koi ripples) must keep working against the modular river surface. Wade/swim is the player's, not yours: water level and `isInWater`/`wadeDepth` results must not change. Dawn mist is v-ranges'.
- Already merged kit families you may REUSE by importing from `src/kit/<family>/` (read-only): check `ls src/kit` after merging integration.
