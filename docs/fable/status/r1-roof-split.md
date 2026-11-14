# r1-roof-split

- Worker / model:     Claude Opus 5.5 (claude-opus-5-5)
- Claimed:            2026-11-14 03:16 PST
- Branch:             fable/r1-roof-split
- Base commit:        8702cc7 (fable/integration; contains main 676506f, Roof Road stage 2)
- State:              in progress

Lane: guide section 12, Phase 5, steps R1.1 to R1.5 under Integrator ruling
R57 (brief `r1-roof-split.md`). Splits `rooftops/js/build.js` into
`rooftops/js/pieces/<type>.js` behind the `buildWorld` facade, routes every
piece through its own `AssetRuntime`, inventories the Roof Road and registers
its lab. No change to `level.js`, `rail.js`, `physics.js`, `reach.js`,
`autopilot.js` or the companion code.

## R57 pre-check (2026-11-14, after `git fetch origin`)

`origin/main` is `414225f`, an ancestor of this branch's base `8702cc7`
(`git merge-base --is-ancestor origin/main HEAD` holds).
`git diff --stat 676506f origin/main -- rooftops` shows only the two cache-tag
lines (`build.js`, `game.js`) already on `fable/integration`. No Roof Road
change on `origin/main` past 676506f: proceed.

## Assets
| Inventory id | Promoted from (lab/specimen) | Parts | Tiers | Footprint | State |
|---|---|---|---|---|---|
| (none promoted: serial split lane; every Roof Road piece type is routed through `assets.build`, see the handoff) | | | | | |

## Steps
- [ ] R1.0 Claim: R57 pre-check, this file
- [ ] R1.4a Rooftop numeric golden written from the unchanged code
- [ ] R1.2 Split `build.js` into `rooftops/js/pieces/` behind a `PIECES` table (golden EQUAL after each commit)
- [ ] R1.3 Roof Road `AssetRuntime`, every piece through `assets.build`
- [ ] R1.1 Inventory group "Roof Road", coverage tool and test, swap matrix lanes
- [ ] R1.5 Roof Road lab registered with a shelf of the piece types
- [ ] R1.4 Proof: rooftop tests, companion test, golden, checks
- [ ] Handoff, report, PR

## Checks run (command → real result)

## Deferred assets and why

## Footprint waivers requested

## Notes for the Integrator
