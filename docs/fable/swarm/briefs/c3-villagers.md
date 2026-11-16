# Lane brief: c3-villagers (Phase 3 — Luna, Mochi, Kuro as CharacterDefs)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/c3-villagers   Branch: fable/c3-villagers
Report: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/c3-villagers-report.md
Read in order: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md, /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_character.md, this card. Guide: §10 table row c3-villagers; lab 19 `labs/villagers/`.

- Scope: Luna, Mochi, Kuro as `CharacterDef`s; idle grooming; personalities (PERSONALITIES in src/npc.js: coat stripes,
  body scale, idle verb weights, pacing, greeting, startle). Schedules stay in src/main.js (do not touch main.js).
- Inventory ids: `luna`, `mochi`, `kuro`.
- Your files: NEW `src/characters/defs/{luna,mochi,kuro}.js` (+ a small shared villager-def helper if needed),
  NEW behaviour files for idle grooming if it does not exist yet (`src/characters/behaviour/grooming.js`), `src/npc.js`
  (granted: build each villager from its def when its id resolves to modular; classic path byte-identical),
  `tools/cat_preview.js` (granted: make it READ the defs/PERSONALITIES palettes instead of mirroring them — AGENTS.md says
  it mirrors coat palettes; the classic sheets must render identically afterwards — prove with the Phase 0 masters),
  `labs/villagers/**`, status/handoff files.
- Villagers must still part the grass as before (grass physics stamps villagers within 10 m) — G-C requires it.
- Night sleep stays opt-in per cat (schedule.sleepAtNight). Eye shine at dusk from lab 19 is c2's for Michi; villagers may reuse it if it lands first (coordinate via handoff, do not edit c2's files).
