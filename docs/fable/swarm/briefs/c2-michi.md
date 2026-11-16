# Lane brief: c2-michi (Phase 3 — the player cat as swappable parts)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/c2-michi   Branch: fable/c2-michi
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/c2-michi-report.md
Read in order: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md, /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_character.md, this card. Guide: §10 table row c2-michi; Appendix D (c2-michi row).

- Scope: player cat coat, face, collar, bow, bell, master gold and twin bells, contact shadow; eye shine at dusk (from lab 19).
- Inventory ids: `michi`, `cat-coat`, `cat-face`, `cat-collar`, `master-bells`, `cat-shadow`.
- L4 gap rule: these five "Cat components" rows have no focused study — add specimens first in a NEW lab `labs/cat/`
  (Integrator ruling: c3 owns labs/villagers/, so do not put them there). Model the lab on an existing small lab
  (e.g. labs/keepsakes/ or labs/nest/: index.html, js/, research.md); registering it in labs/registry.js is a handoff item.
- Your files: NEW `src/characters/parts/*.js` part files you add, NEW `src/characters/defs/michi.js`, `labs/cat/**`,
  `src/player.js` (granted: wiring Michi's def when 'michi' resolves to modular — classic path untouched),
  status/handoff files. Not npc.js, not cat_preview.js (c3 owns them).
- Collar/bell behaviour must survive swaps (c1 added checks for this — keep them green). setMasterCat must still work.
