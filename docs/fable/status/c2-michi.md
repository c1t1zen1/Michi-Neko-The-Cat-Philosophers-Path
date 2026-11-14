# Status: c2-michi
Model: Claude Sonnet 5.5 · base fable/integration @ 55cd691 · started 2026-11-13

- [x] Parts: `eye-shine` (head), `kumihimo-indigo` (collar) in src/characters/parts/michi_extras.js
- [x] Def: src/characters/defs/michi.js (`MICHI_MODULAR`, `michiIsModular`)
- [x] src/player.js wired (4th ctor arg `{assets, quality}`; classic path untouched)
- [x] Lab labs/cat/ (13 in-page checks, classic vs modular)
- [ ] main.js passes `{assets, quality}` to Player (handoff patch), registry row, dusk driver, boot runs

## Scope completion
Checks run after wiring main.js: full game boots (tools/game_shot.mjs, Metal) on `assets=classic` and `assets=classic&swap=michi:modular` at hour 6/12/18/22: no console errors or warnings except the pre-existing 404 for /cad-overrides.json (also on classic). `capture_baseline --only cat --compare ../_baseline`: all 18 cat sheets 0/0/0 (classic equal to Phase 0). cat_golden EQUAL.

L6 (docs/fable/status/c2-michi/h{6,12,18,22}_{classic,modular}.jpg, cam at cat height): hour 12 byte-identical. At 22 the modular Michi has a warm eye glint that reads as a real cat in lantern light, no halo or clipping (AAA-1 up from classic, AAA-5: no regression elsewhere; the shine is the only visible difference). Modest: it is one glint disc per eye, not a full tapetum reflection with view-dependence.

Scope accounting (modular vs classic):
- coat: shared (c1 coat part, not a slot; identical sculpt/texture, no re-sculpt). Deferred as swappable; no study found a better variant.
- face: shared (c1 face part). Same reason.
- collar: modular offers `kumihimo` (red, default) and new `kumihimo-indigo`, swappable in the collar slot, bell survives.
- bow: the cord bow is part of the collar cord (shared geometry); a separate bow part needs a mount that the contract does not define for the nape. Deferred.
- bell: `suzu`, same as classic; swappable.
- master gold + twin bells: `suzu-master`, same as classic; setMasterCat works and sticks across collar swaps (lab checks).
- contact shadow: shared c1 blob, same as classic. Upgrade deferred.
- dusk eye shine: modular only (`eye-shine`, head slot), driven from main.js; classic has none.
