# Lane brief: v-trees (Phase 2, wave 2.3 — systems and life)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/v-trees   Branch: fable/v-trees (from fable/integration)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/v-trees-report.md
Read in order: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md, then /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_village.md (the standard lane recipe, files, checks), then this card.
Guide card: BUILD_GUIDE_FABLE.md §9 wave 2.3 row `v-trees` and the paragraph above the table ("These replace shaders and simulations…"), Appendix D.

- Family folder: `src/kit/trees/`        Lab: `labs/trees/` (lab new (create labs/trees/))
- Classic builders / system: tree builders in `src/vegetation.js` (sakura, maples, pines, rim trees; split by f3) and `src/foliage.js` (canopy styles 'leaves', 'masses', 'clumps')
- Inventory ids you own (promote each, or defer with a reason): `sakura`, `maples`, `pines`, `rim-trees`, `tree-trunks`, `tree-canopies`
- Gap ids needing a lab specimen first (L4 — no study, no swap): ALL six (review-sheet coverage only) — decision D5: build a new lab `labs/trees/` FIRST, modelled on the other workshop labs (labs/shared/workshop.js `runLab(def)`, research.md with sources, specimens per species/tier). Its registry entry is a hot file: put the exact `labs/registry.js` entry in your handoff (the registry already lists a 'trees' extra slug — promote it).
- Single-writer grant (system lanes, guide §9 wave 2.3): single writer of `src/foliage.js` (ADDITIVE changes only — it is shared with the summit; summit golden must stay EQUAL) for this lane; `src/vegetation.js` changes only through your handoff. Record the grant in your first commit message ("Integrator grant: single writer of …"). Any other hot file → exact patch in your handoff.
- Classic must stay byte-identical on screen: with `?assets=classic` (and always on quality `low`) the system runs today's code path. Modular behaviour is selected through the runtime (`game.assets`, `resolveSet`/`?swap=<id>:modular`). Goldens (`node tools/footprint_golden.mjs`, `--systems`) EQUAL on classic; full headless boot clean on classic and with your ids on modular.
- Card notes (binding): Hero trees keep leaf sprays on twigs (`buildCanopy` style 'leaves'); rim keeps painted leaf masses ('masses'). Wind response (`&wind=4` in tools/tree_preview.html) must keep working. s2-clearing will reuse your trees for the summit (which uses 'clumps'). Review with `tools/tree_preview.html?sheet=hero|detail|rim|compare`.
- Already merged kit families you may REUSE by importing from `src/kit/<family>/` (read-only): check `ls src/kit` after merging integration.
