# Lane brief: v-sky (Phase 2, wave 2.3 — systems and life)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/v-sky   Branch: fable/v-sky (from fable/integration)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/v-sky-report.md
Read in order: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md, then /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_village.md (the standard lane recipe, files, checks), then this card.
Guide card: BUILD_GUIDE_FABLE.md §9 wave 2.3 row `v-sky` and the paragraph above the table ("These replace shaders and simulations…"), Appendix D.

- Family folder: `src/kit/sky/`        Lab: `labs/sky/` (lab 05)
- Classic builders / system: `src/sky.js`, `src/postfx.js` (systems — not split by f3)
- Inventory ids you own (promote each, or defer with a reason): `sky-dome`, `clouds`, `stars`, `moon`, `sky-light`, `god-rays`, `ao`, `atmosphere`, `grade`
- Gap ids needing a lab specimen first (L4 — no study, no swap): `stars`, `moon` (embedded), `sky-light`, `god-rays`, `atmosphere`, `grade` (related), `ao` (missing) — add focused specimens to labs/sky; any you cannot study this pass stay classic and are listed as deferred
- Single-writer grant (system lanes, guide §9 wave 2.3): single writer of `src/sky.js` and `src/postfx.js` for this lane. Record the grant in your first commit message ("Integrator grant: single writer of …"). Any other hot file → exact patch in your handoff.
- Classic must stay byte-identical on screen: with `?assets=classic` (and always on quality `low`) the system runs today's code path. Modular behaviour is selected through the runtime (`game.assets`, `resolveSet`/`?swap=<id>:modular`). Goldens (`node tools/footprint_golden.mjs`, `--systems`) EQUAL on classic; full headless boot clean on classic and with your ids on modular.
- Card notes (binding): Clouds and cloud shadows from labs/sky. Post-processing changes are tier-gated; quality `low` keeps today's chain EXACTLY. The summit has its own sky lights — do not change them (summit golden EQUAL). Add a modular path behind the runtime switch, keep the classic path's code untouched where possible (diff review is strict on these two files). god-rays: kit-only per ruling. Labs (labs/sky, labs/ground, etc.) import Sky through labs/shared/game.js — keep Sky's public API.
- Already merged kit families you may REUSE by importing from `src/kit/<family>/` (read-only): check `ls src/kit` after merging integration.
