# Handoff: c3-villagers

## main.js (hot, Integrator)
`NPC` builds from its CharacterDef when `options.assets.setFor('luna'|'mochi'|'kuro') === 'modular'`
(never on quality `low`). Add `assets: this.assets` to the options of the three `new NPC(...)` calls
in `src/main.js` (~lines 268, 292, 307), e.g. `{ wanderRadius: 3, assets: this.assets }`.
Until then every villager is classic. Test: `?swap=luna:modular,mochi:modular,kuro:modular`.

## Notes
- `src/npc.js` PERSONALITIES is now derived from the defs (same values). `personality.groom`
  ({bout, pause, chance}) drives `behaviour/grooming.js`; modular villagers only.
- `tools/check_syntax.mjs` still needs the c1 patch to walk `src/characters/`.
- `node tools/villagers_check.mjs` is the lane check; add it to G2 if wanted.
- Eye shine at dusk: not done (c2's for Michi; reuse if it lands).
