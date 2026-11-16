# Lane brief: r5-roof-cast (Phase 5 — Roof Road, mouths all)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/r5-roof-cast   Branch: fable/r5-roof-cast (from fable/integration after r1 merged)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/r5-roof-cast-report.md
Read in order: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md, /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_village.md, /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_roofroad.md, then this card.
Guide card: BUILD_GUIDE_FABLE.md §12 parallel-lanes row `r5-roof-cast`; Appendix D if it lists Roof Road ids.

- Family folder: `src/kit/roofcast/`        Specimens: `labs/roofroad/r5-roof-cast/`
- Scope (guide): Chidori the guide cat, the Shōki figures (several poses), the takasebune boatman, the hayashi musicians
- Inventory ids you own: exactly the ids docs/fable/handoff/r1-roof-split.md assigns to `r5-roof-cast` (promote each or defer with a reason).
- Reuse (read-only imports from merged families): `src/characters/` (CharacterDef, accessories, tiers — guide §10; Chidori is a cat: build it on the Michi rig like the villagers, c3), `src/kit/creatures` for patterns
- Hot files: none. Anything the Roof Road page or a shared file needs → exact patch in your handoff.
- Read docs/fable/handoff/c1-rig-split.md, c3-villagers.md, c4-creatures.md and _character.md in this briefs folder. `node tools/cat_golden.mjs` must stay EQUAL. Chidori's behaviour (rooftops companion code) is read-only: the def must provide every node/anchor the companion and Chidori code look up (grep them). Shōki figures are static roof ornaments: merge-able statics (R36).
