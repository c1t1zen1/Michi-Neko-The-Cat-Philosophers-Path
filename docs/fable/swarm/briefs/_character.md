# Character lane template (Phase 3: c2, c3, c4 and the Roof Road cast r5)

Read with _common.md and your per-lane brief. Guide: BUILD_GUIDE_FABLE.md §10 (character tiers, gate G-C), §3, §5,
the standard lane recipe §9 L1–L10 (L6/L7 adapted below), and docs/fable/handoff/c1-rig-split.md + docs/fable/status/c1-rig-split.md
(the CharacterDef contract, slots, part registry, tier hooks — read src/characters/character.js itself).

## Rules
- Never edit `src/characters/character.js`, `rig.js`, `behaviour/*` or the existing `parts/*` (c1's contract). Add NEW
  files (new parts, defs) in `src/characters/`; contract changes go in your handoff as exact patches.
- Classic stays classic: on `assetSet` classic (and always on quality `low`) the game builds today's character exactly.
  The modular character is used only when the runtime resolves the character's inventory id to modular
  (`game.assets` / `src/kit/runtime.js` — read how `setFor(id)` / `?swap=` work). Golden + sheets must stay EQUAL on classic.
- Ruling R22: the player character (Michi) is always `hero` tier except on quality `low`; villagers and creatures follow
  the kit TIER_POLICY (`src/kit/contract.js`) through `characterTierFor`.
- No `Math.random()` in new character geometry/texture code (seeded rng); the sculpt cache must not re-sculpt on swaps.
- Saves unchanged.

## Checks (L7)
`node tools/cat_golden.mjs` (classic EQUAL — never `--write` it), `node tools/rooftop_test.mjs`, `node tools/check_syntax.mjs`,
`node tools/verify.mjs`, `node tools/kit_check.mjs`, `node tools/labs_check.mjs`, `node tools/labs_coverage.mjs`
(+`--write` if lines moved), `git diff --check fable/integration...HEAD`; the cat sheets
(`tools/cat_preview.html?sheet=…`) on classic vs the Phase 0 masters (`node tools/capture_baseline.mjs --compare` or
headless `--diff`; see docs/fable/baseline/captures.md); full headless boot on `?assets=classic` and with your ids swapped
to modular (console clean). Run on Metal (cat golden texture hashes are Metal-only).

## L6 compare
Cat sheets rendered with your ids on modular vs classic (`&swap=` or whatever flag cat_preview supports — if none, add
it in your lane only if your brief grants cat_preview.js, otherwise use `tools/game_shot.mjs` with `?swap=<id>:modular`
at dawn/noon/dusk/night, cam near the character at cat height). Save small JPGs under `docs/fable/status/<lane>/`.
Look at them (Read the images) and judge AAA-1/AAA-5 honestly.
