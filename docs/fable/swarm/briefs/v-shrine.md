# Lane brief: v-shrine (Phase 2, wave 2.2 — landmarks where players stop)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/v-shrine   Branch: fable/v-shrine (from fable/integration)
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/v-shrine-report.md
Read in order: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md, then /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_village.md (the standard lane recipe, files, checks), then this card.
Guide card: BUILD_GUIDE_FABLE.md §9 wave 2.2 — landmarks where players stop row `v-shrine`, Appendix D.

- Family folder: `src/kit/shrine/`        Lab: `labs/shrine/` (lab 06)
- Classic builders: `buildTorii`, `buildShrine`, `buildMistAltar`, `buildOfferingBells` (countryside.js, split form)
- Inventory ids you own (promote each, or defer with a reason): `torii`, `shrine-hall`, `mist-altar`, `offering-box`, `offering-bells`, `shimenawa`, `shrine-bell`
- Gap ids needing a lab specimen first (L4 — no study, no swap): `offering-box` (embedded only — add a focused specimen to labs/shrine)
- Card notes (binding): Lintel (kasagi/shimaki) underside solved at each leaning post (labs/REVIEW_2026-11-10.md construction fix). The shrine thicket open/close (`setShrineThicketOpen`) and the bell/offering interactions must still work — every part gameplay binds via layout.bind must exist. Offering bells were assigned to you (ruling R13). Torii will be reused by s2-clearing (summit entrance torii): keep span/height/finish params general.
- Already merged kit families you may REUSE by importing from `src/kit/<family>/` (read-only; never edit them): check `ls src/kit` after merging integration. Reuse beats copying.
