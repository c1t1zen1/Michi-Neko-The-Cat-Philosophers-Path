# Status: c2-michi
Model: Claude Sonnet 5.5 · base fable/integration @ 55cd691 · started 2026-11-13

- [x] Parts: `eye-shine` (head), `kumihimo-indigo` (collar) in src/characters/parts/michi_extras.js
- [x] Def: src/characters/defs/michi.js (`MICHI_MODULAR`, `michiIsModular`)
- [x] src/player.js wired (4th ctor arg `{assets, quality}`; classic path untouched)
- [x] Lab labs/cat/ (13 in-page checks, classic vs modular)
- [ ] main.js passes `{assets, quality}` to Player (handoff patch), registry row, dusk driver, boot runs
