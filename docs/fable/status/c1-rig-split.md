# c1-rig-split

- Worker / model:     Claude Opus 5.5 (claude-opus-5-5)
- Claimed:            2026-11-13 04:12 PST
- Branch:             fable/c1-rig-split
- Base commit:        5dc924a (`fable/integration`, "Merge f1-golden: classic footprint golden page, CLI and digest (F1.6, PR #4)")
- State:              in progress

Lane: guide §10, Phase 3 step C1 (serial). Split the `Cat` class into
`src/characters/` (rig, parts, behaviour, `CharacterDef`), with `Cat` kept as
the facade. No visible or behavioural change.

## Assets
| Inventory id | Promoted from (lab/specimen) | Parts | Tiers | Footprint | State |
|---|---|---|---|---|---|
| (none: structural split, no promotion) | | | | | |

## Steps
- [ ] C0 Claim, read, API contract (callers + public surface, below)
- [ ] C0.1 Numeric golden from the UNCHANGED code (`tools/cat_golden.*`, `tools/golden/cat_classic.json`), committed before any move
- [ ] C1.1 `src/characters/` modules as named in the card
- [ ] C1.2 Code moved out of `Cat`, one module per commit; `Cat` keeps every public method and property and delegates
- [ ] C1.3 `CharacterDef` contract, accessory slots (`collar`, `bell`, `head`, `back`), `setMasterCat()` as a slot swap, tier mechanism
- [ ] C1.4 Proof of no change: cat sheets vs Phase 0 masters, `&perf=1` before/after, `rooftop_test.mjs`
- [ ] C1.5 Sculpt cache per body type; a part swap does not re-sculpt (counter)
- [ ] Checks, handoff, report, PR

## API contract (who calls `Cat`, and what they use)

To be filled in step C0.

## Checks run (command → real result)

## Deferred assets and why
None (structural lane).

## Footprint waivers requested
None.

## Notes for the Integrator
