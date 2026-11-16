# Lane brief: v-interiors-b (Phase 2, wave 2.2 — landmarks where players stop (part b: courtyard and secret house))

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/v-interiors-b   Branch: fable/v-interiors-b (from fable/integration)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/v-interiors-b-report.md
Read in order: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md, then /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_village.md (the standard lane recipe, files, checks), then this card.
Guide card: BUILD_GUIDE_FABLE.md §9 wave 2.2 — landmarks where players stop (part b: courtyard and secret house) row `v-interiors`, Appendix D.

- Family folder: `src/kit/interiors/`        Lab: `labs/interiors/` (lab 21)
- Classic builders: `src/interior.js` courtyard and secret-house interior builders (split form by f3)
- Inventory ids you own (promote each, or defer with a reason): `courtyard-gravel`, `courtyard-wall`, `secret-tatami`, `secret-table`, `secret-bed`, `secret-andon`
- Gap ids needing a lab specimen first (L4 — no study, no swap): `courtyard-wall`, `secret-tatami`, `secret-table`, `secret-bed`, `secret-andon` (embedded) — add focused specimens to labs/interiors
- Card notes (binding): Builds on part a (merged into the same family folder; never rewrite part a's assets, only add). `secret-andon` is yours (ruling R13) — reuse the lanterns kit's andon builder if it fits. Nap anchors (secret bed) and interaction anchors stay exactly. Run `node tools/interiors_test.mjs`.
- Already merged kit families you may REUSE by importing from `src/kit/<family>/` (read-only; never edit them): check `ls src/kit` after merging integration. Reuse beats copying.
