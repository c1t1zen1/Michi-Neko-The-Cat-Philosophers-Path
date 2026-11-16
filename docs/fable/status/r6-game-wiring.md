# r6-game-wiring

- Worker / model:     Claude Opus 5.5 (claude-opus-5-5)
- Claimed:            2026-11-15 17:02 PST
- Branch:             fable/r6-game-wiring
- Base commit:        a63ff9e (fable/integration: four Roof Road kit families, Chidori, a1-village)
- State:              in progress

Lane: guide section 12, Phase 5, steps R6.1 to R6.8 (the spec's section 8.2
table) under rulings D3 (Seven Posts unlock, one continuous run, Chidori stays
on the Roof Road, the finale's sky follows the run), R57 (src/rooftops/
re-exports the runner modules from rooftops/js/, nothing moves), R69/R70
(13 mouths, tag 20261114a). Known baseline: rooftop_test 38 passed / 2 failed
and the companion test's "player reaches finale" (operator's stage-2 route,
17c9cae); the play-through-to-finale part of G-R is blocked on the operator's
route fix and is not this lane's gate.

## Assets
| Inventory id | Promoted from (lab/specimen) | Parts | Tiers | Footprint | State |
|---|---|---|---|---|---|
| (none: a wiring lane, no kit family) | | | | | |

## Steps
- [ ] R6.1 Giboshi caps + Shōki on the valley bridge
- [ ] R6.2 Odoi bank + bamboo thicket (own mulberry32(0x0D01) stream)
- [ ] R6.3 RooftopManager (src/rooftops/manager.js)
- [ ] R6.4 Re-exports (R57)
- [ ] R6.5 Save flags
- [ ] R6.6 Journal / XP / music / bells
- [ ] R6.7 index.html noren veil
- [ ] R6.8 Tests (verify.mjs wiring + tools/rooftop_manager_test.mjs)

## Checks run (command → real result)

## Deferred assets and why

## Footprint waivers requested

## Notes for the Integrator
