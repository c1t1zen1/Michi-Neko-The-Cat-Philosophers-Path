# Lane brief: v-critters (Phase 2, wave 2.3 — systems and life)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/v-critters   Branch: fable/v-critters (from fable/integration)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/v-critters-report.md
Read in order: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md, then /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_village.md (the standard lane recipe, files, checks), then this card.
Guide card: BUILD_GUIDE_FABLE.md §9 wave 2.3 row `v-critters` and the paragraph above the table ("These replace shaders and simulations…"), Appendix D.

- Family folder: `src/kit/critters/`        Lab: `labs/critters/` (lab 18)
- Classic builders / system: `src/ambient_life.js` (split by f3)
- Inventory ids you own (promote each, or defer with a reason): `sparrows`, `koi`, `butterflies`; plus a focused lab STUDY (not a kit asset) for `guardian-crows` in labs/critters, which c4-creatures will promote
- Gap ids needing a lab specimen first (L4 — no study, no swap): `guardian-crows` — study only (see above)
- Single-writer grant (system lanes, guide §9 wave 2.3): single writer of `src/ambient_life.js` for this lane. Record the grant in your first commit message ("Integrator grant: single writer of …"). Any other hot file → exact patch in your handoff.
- Classic must stay byte-identical on screen: with `?assets=classic` (and always on quality `low`) the system runs today's code path. Modular behaviour is selected through the runtime (`game.assets`, `resolveSet`/`?swap=<id>:modular`). Goldens (`node tools/footprint_golden.mjs`, `--systems`) EQUAL on classic; full headless boot clean on classic and with your ids on modular.
- Card notes (binding): Koi with dorsal and forked tail, paired butterfly wings (hinged), sparrow flock. Ripple hooks (koi ripples) and startle hooks (cat approach) stay. Animated meshes are live (not merged). Instanced where counts are high. s4-summit-life will reuse butterflies/birds.
- Already merged kit families you may REUSE by importing from `src/kit/<family>/` (read-only): check `ls src/kit` after merging integration.
