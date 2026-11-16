# Lane brief: v-machiya-b (Phase 2, wave 2.2 — landmarks where players stop (part b: buildings))

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/v-machiya-b   Branch: fable/v-machiya-b (from fable/integration)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/v-machiya-b-report.md
Read in order: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md, then /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_village.md (the standard lane recipe, files, checks), then this card.
Guide card: BUILD_GUIDE_FABLE.md §9 wave 2.2 — landmarks where players stop (part b: buildings) row `v-machiya`, Appendix D.

- Family folder: `src/kit/machiya/`        Lab: `labs/machiya/` (lab 04)
- Classic builders: `buildMachiyaTeaHouse`, `buildMachiyaResidence`, `buildSecretMachiya`, `buildVillageHouse`, `buildVillageStreet` (houses only; street clutter is v-alley's)
- Inventory ids you own (promote each, or defer with a reason): `tea-house`, `residence`, `secret-house`, `street-house`, `village-street`
- Gap ids needing a lab specimen first (L4 — no study, no swap): `village-street` (related only — add a focused street specimen to labs/machiya)
- Card notes (binding): Builds on part a: your family folder already holds the machiya components (merged); add the building assets and REUSE those components (a kit parent must NOT build its listed components itself — read f2's handoff). Doors, the secret door, lock plate and the tea-house entry trigger stay in footprint. Closes the AGENTS.md open item 'skirt walls and fence/lantern detail for the tea house and craftsman residence' (reuse the merged fences/lanterns kits). Colliders and climb surfaces must match classic exactly (golden).
- Already merged kit families you may REUSE by importing from `src/kit/<family>/` (read-only; never edit them): check `ls src/kit` after merging integration. Reuse beats copying.
