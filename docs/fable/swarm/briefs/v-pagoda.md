# Lane brief: v-pagoda (Phase 2, wave 2.2 — landmarks where players stop)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/v-pagoda   Branch: fable/v-pagoda (from fable/integration)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/v-pagoda-report.md
Read in order: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md, then /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_village.md (the standard lane recipe, files, checks), then this card.
Guide card: BUILD_GUIDE_FABLE.md §9 wave 2.2 — landmarks where players stop row `v-pagoda`, Appendix D.

- Family folder: `src/kit/pagoda/`        Lab: `labs/pagoda/` (lab 08)
- Classic builders: `buildDistantPagoda` (countryside.js, split form; a component of mountains per f2)
- Inventory ids you own (promote each, or defer with a reason): `distant-pagoda`
- Gap ids needing a lab specimen first (L4 — no study, no swap): none
- Card notes (binding): Promote `buildPagoda` from labs/pagoda/js/pagoda.js with the `valley` preset (labs/pagoda/js/presets.js), its hero/mid/far tiers and the 16-view impostor (js/impostor.js) as the far tier. It is seen from far away in the valley: match the classic silhouette's position/scale/orientation. Export a reusable builder (`src/kit/pagoda/`) that s3-vista (summit Higashiyama pagoda) and r4-festival (Roof Road pagoda) will import with other presets — keep the preset param general. Impostor textures: generated at build time, procedural only, dispose them.
- Already merged kit families you may REUSE by importing from `src/kit/<family>/` (read-only; never edit them): check `ls src/kit` after merging integration. Reuse beats copying.
