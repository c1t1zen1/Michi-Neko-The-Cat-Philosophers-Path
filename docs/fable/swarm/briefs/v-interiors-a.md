# Lane brief: v-interiors-a (Phase 2, wave 2.2 — landmarks where players stop (part a: tea-house interior))

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/v-interiors-a   Branch: fable/v-interiors-a (from fable/integration)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/v-interiors-a-report.md
Read in order: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md, then /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_village.md (the standard lane recipe, files, checks), then this card.
Guide card: BUILD_GUIDE_FABLE.md §9 wave 2.2 — landmarks where players stop (part a: tea-house interior) row `v-interiors`, Appendix D.

- Family folder: `src/kit/interiors/`        Lab: `labs/interiors/` (lab 21)
- Classic builders: `src/interior.js` tea-house interior builders (split form by f3)
- Inventory ids you own (promote each, or defer with a reason): `tea-interior`, `tatami`, `shoji-doors`, `teaware`, `interior-frame`, `tokonoma`, `scroll`, `bonsai`, `chabudai`, `zabuton`, `knockables`
- Gap ids needing a lab specimen first (L4 — no study, no swap): `interior-frame`, `tokonoma`, `scroll`, `chabudai`, `zabuton` (embedded), `bonsai` (missing), `knockables` (related) — add focused specimens to labs/interiors
- Card notes (binding): Knockables keep their physics bodies and names; nap/interaction anchors stay in the layout (f3 put them there). Fix the deferred knick-knack height bug (knick-knacks render ~100 m above the table — see docs/fable/handoff/f3-systems-split.md and the gate chores note) in the MODULAR path of your kit; if the classic path also needs it, write the exact interior.js patch in your handoff (hot file) — classic golden must stay EQUAL unless the Integrator applies it. `andon` and `courtyard-toro` belong to v-lanterns (reuse src/kit/lanterns). Run `node tools/interiors_test.mjs`.
- Already merged kit families you may REUSE by importing from `src/kit/<family>/` (read-only; never edit them): check `ls src/kit` after merging integration. Reuse beats copying.
