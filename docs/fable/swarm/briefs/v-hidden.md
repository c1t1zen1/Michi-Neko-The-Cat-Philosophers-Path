# Lane brief: v-hidden (Phase 2, wave 2.2 — landmarks where players stop)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/v-hidden   Branch: fable/v-hidden (from fable/integration)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/v-hidden-report.md
Read in order: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md, then /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_village.md (the standard lane recipe, files, checks), then this card.
Guide card: BUILD_GUIDE_FABLE.md §9 wave 2.2 — landmarks where players stop row `v-hidden`, Appendix D.

- Family folder: `src/kit/hidden/`        Lab: `labs/moonpool/` (lab 07)
- Classic builders: everything in `src/hidden_places.js` (split form by f3: Moon Pool and Lantern Glade builders)
- Inventory ids you own (promote each, or defer with a reason): `moon-pool`, `pool-water`, `pool-moon`, `lily-pads`, `lotus`, `pool-motes`, `glade-lanterns`, `glade-fireflies`, `pool-apron`, `pool-rim`, `pool-seat`, `lantern-glade`, `glade-floor`, `glade-bamboo`, `glade-seat`
- Gap ids needing a lab specimen first (L4 — no study, no swap): `pool-apron`, `pool-rim`, `pool-seat` (embedded), `lantern-glade`, `glade-bamboo`, `glade-seat` (related), `glade-floor` (missing) — add focused specimens to labs/moonpool
- Card notes (binding): Hidden places are built BEFORE Vegetation (they register exclusion/water rects) and attached after ContextActionManager — the order and every rect are fixed (systems golden must stay EQUAL on classic). Never touches the summit. `pool-toro` belongs to v-lanterns: REUSE src/kit/lanterns (merged). `glade-bamboo` should reuse v-greenery's bamboo culm builder if merged (src/kit/greenery). Water/glow/motes/fireflies are live meshes. Rest-spot/meditation anchors must not move.
- Already merged kit families you may REUSE by importing from `src/kit/<family>/` (read-only; never edit them): check `ls src/kit` after merging integration. Reuse beats copying.
