# Lane brief: r2-roofs-streets (Phase 5 — Roof Road, mouths 1–2)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/r2-roofs-streets   Branch: fable/r2-roofs-streets (from fable/integration after r1 merged)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/r2-roofs-streets-report.md
Read in order: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md, /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_village.md, /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_roofroad.md, then this card.
Guide card: BUILD_GUIDE_FABLE.md §12 parallel-lanes row `r2-roofs-streets`; Appendix D if it lists Roof Road ids.

- Family folder: `src/kit/roofstreets/`        Specimens: `labs/roofroad/r2-roofs-streets/`
- Scope (guide): Sanjō bridge, giboshi, kido gate, Awataguchi machiya roofs (hira and tsuma) and façades, eave details, side alley, Pontochō rows, drying decks, futon racks, yuka decks
- Inventory ids you own: exactly the ids docs/fable/handoff/r1-roof-split.md assigns to `r2-roofs-streets` (promote each or defer with a reason).
- Reuse (read-only imports from merged families): `src/kit/machiya`, `src/kit/lanterns`, `src/kit/alley`, `src/kit/water` (bridge parts)
- Hot files: none. Anything the Roof Road page or a shared file needs → exact patch in your handoff.
- Note: machiya roofs repeat many times along the run — R36 merge-able statics and a representative contract sample (the longest real row) are mandatory; measure the page's draw calls classic vs modular at mouths 1–2 (renderer.info) and record them.
