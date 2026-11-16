# Lane brief: v-ranges (Phase 2, wave 2.3 — systems and life)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/v-ranges   Branch: fable/v-ranges (from fable/integration)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/v-ranges-report.md
Read in order: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md, then /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_village.md (the standard lane recipe, files, checks), then this card.
Guide card: BUILD_GUIDE_FABLE.md §9 wave 2.3 row `v-ranges` and the paragraph above the table ("These replace shaders and simulations…"), Appendix D.

- Family folder: `src/kit/ranges/`        Lab: `labs/ranges/` (lab 03)
- Classic builders / system: `buildEdgeForest`, `buildFoothillForest`, `buildEdgeUndergrowth`, `buildMountains`, `buildMistRing`, `buildVillage` (distant village), `buildDawnMist` (countryside.js, split form; several are components of mountains per f2)
- Inventory ids you own (promote each, or defer with a reason): `mountains`, `edge-forest`, `edge-undergrowth`, `foothill-forest`, `distant-village`, `mist-ring`, `dawn-mist`
- Gap ids needing a lab specimen first (L4 — no study, no swap): `foothill-forest` (embedded), `distant-village`, `mist-ring`, `dawn-mist` (related) — add focused specimens to labs/ranges (it already has many; extend, don't rewrite; run `node tools/ranges_test.mjs`)
- Single-writer grant (system lanes, guide §9 wave 2.3): none — route through placeAsset. Record the grant in your first commit message ("Integrator grant: single writer of …"). Any other hot file → exact patch in your handoff.
- Classic must stay byte-identical on screen: with `?assets=classic` (and always on quality `low`) the system runs today's code path. Modular behaviour is selected through the runtime (`game.assets`, `resolveSet`/`?swap=<id>:modular`). Goldens (`node tools/footprint_golden.mjs`, `--systems`) EQUAL on classic; full headless boot clean on classic and with your ids on modular.
- Card notes (binding): All seven landscape rows lack a lab adapter today: your handoff lists production adapter ids. The ranges are shared with the summit horizon (s3-vista will import your builders): keep a general API (ring radius, height profile, layers, palette). `distant-pagoda` is v-pagoda's: a kit parent must NOT build its listed components (f2 handoff). Dawn mist keeps its per-time-of-day fade (dawnMists). Rim forest keeps painted leaf masses ('masses' style); tier far = cards/impostor OK.
- Already merged kit families you may REUSE by importing from `src/kit/<family>/` (read-only): check `ls src/kit` after merging integration.
