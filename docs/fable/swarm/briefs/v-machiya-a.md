# Lane brief: v-machiya-a (Phase 2, wave 2.2 — landmarks where players stop (part a: components))

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/v-machiya-a   Branch: fable/v-machiya-a (from fable/integration)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/v-machiya-a-report.md
Read in order: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md, then /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_village.md (the standard lane recipe, files, checks), then this card.
Guide card: BUILD_GUIDE_FABLE.md §9 wave 2.2 — landmarks where players stop (part a: components) row `v-machiya`, Appendix D.

- Family folder: `src/kit/machiya/`        Lab: `labs/machiya/` (lab 04)
- Classic builders: `createKawaraRoof`, `createKoushi`, `createEngawa` and the component builders inside `buildMachiyaTeaHouse` / `buildMachiyaResidence` / `buildSecretMachiya` / `buildVillageHouse` (countryside.js, split form; components are routed as their own ids by f2)
- Inventory ids you own (promote each, or defer with a reason): `kawara-roof`, `koushi`, `engawa`, `namako`, `timber-frame`, `upper-windows`, `noren`, `tea-bench`, `secret-door`, `lock-plate`
- Gap ids needing a lab specimen first (L4 — no study, no swap): `namako`, `tea-bench`, `secret-door`, `lock-plate` (embedded only — add focused specimens to labs/machiya)
- Card notes (binding): Components only in this PR; the buildings (part b) follow on top of your family. The secret door, lock plate and every door/entry trigger keep their names and footprint anchors exactly. Noren cloth is live (animated) — keep it out of merged statics. Roof Road lanes (r2) will reuse kawara-roof/koushi/noren: keep params general (bays, pitch, eave depth, weathering).
- Already merged kit families you may REUSE by importing from `src/kit/<family>/` (read-only; never edit them): check `ls src/kit` after merging integration. Reuse beats copying.
