# c3-villagers report (Claude Sonnet 5.5)

Built: CharacterDefs for Luna/Mochi/Kuro (src/characters/defs/{villager,luna,mochi,kuro,index}.js; full old PERSONALITIES
entry plus a `groom` entry); src/characters/behaviour/grooming.js (GroomingBehaviour: personality-flavoured long wash bouts);
src/npc.js builds from the def when options.assets.setFor(id)==='modular' and quality!=='low', else the unchanged options path;
PERSONALITIES now derived from the defs (same values). tools/cat_preview.js reads the defs (no mirrored palettes; &def=1 builds from the def).
tools/villagers_check.{html,js,mjs}. Grass stamps unchanged (villager Cat group/mesh path same).

Checks run (Metal):
- node tools/villagers_check.mjs: 14 passed, 0 failed (defs valid; classic NPC cat == def cat for all three; modular uses def; classic on low/classic; grooming starts in NPC.update)
- node tools/cat_golden.mjs: EQUAL, 40 contract checks pass
- capture_baseline --compare vs Phase 0, cat sheets (18): all 0 / 0 / 0
- check_syntax OK (44 modules), verify OK, labs_check OK, kit_check OK (27), labs_coverage --write then OK; git diff --check clean
- L6: docs/fable/status/c3-villagers/npcs-def{0,1}.jpg (classic vs def). Def renders the same cats; differs from the preview's classic
  mirror only by def scale (0.96/1.05) and persona, as intended.

NOT done / concerns:
- main.js is not wired (hot file): handoff docs/fable/handoff/c3-villagers.md says add `assets: this.assets` to the three NPC calls. Until then no villager is modular, so a modular in-game boot could not be run; classic full boot also not run (15-20 min, npc.js import path exercised by villagers_check page instead).
- Modular villagers look identical to classic apart from grooming bouts; no new parts or eye shine (c2's lane). AAA judgement: parity, not an upgrade yet.
- labs/villagers/** not touched.

## Scope completion
main.js wired in-lane; classic and swapped boots clean (only the pre-existing cad-overrides 404); grass-stamp fields verified by eval; L6 shots in docs/fable/status/c3-villagers/; dusk eye shine promoted from lab 19 (src/characters/behaviour/eyeshine.js); coat chooser not promoted (needs c1 coat contract). villagers_check 15/15, cat_golden EQUAL, check_syntax OK. Details: docs/fable/status/c3-villagers.md.

## Review fix round 1
Merged fable/integration; deleted behaviour/eyeshine.js; defs use c2's `eye-shine` part; shared curve in behaviour/dusk.js (also main.js player driver); NPC early-out at 60 m; grooming also gated on effHome===home. c2's part: depth-tested, one-sided, hero-only, facing correct (render pair dusk-front/behind.jpg in docs/fable/status/c3-villagers/). villagers_check 18/18, cat_golden EQUAL, check_syntax 62 modules OK, verify OK, kit_check 29 OK, labs_check OK, 18 cat sheets 0 diff.
