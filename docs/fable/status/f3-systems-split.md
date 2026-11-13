# f3-systems-split

- Worker / model:     Claude Opus 5.5 (claude-opus-5-5)
- Claimed:            2026-11-13 04:06 PST
- Branch:             fable/f3-systems-split
- Base commit:        5dc924a (fable/integration, includes the f1-golden footprint golden)
- State:              in progress

Lane: guide §8 "Lane f3-systems-split" (F3.1–F3.4). Layout / mesh split and
`placeAsset` routing for the 21 builders in `src/vegetation.js`,
`src/interior.js`, `src/hidden_places.js`, `src/ambient_life.js`,
`src/particles.js`; the footprint golden extended to the interior, the hidden
places, vegetation, ambient life and particles.

## Assets
| Inventory id | Promoted from (lab/specimen) | Parts | Tiers | Footprint | State |
|---|---|---|---|---|---|
| (none: Phase 1 split lane, no kit assets) | | | | | |

## Steps
- [x] F0 Claim (this file, pushed)
- [ ] F3.3a Systems golden from the UNCHANGED code (`tools/golden/systems_classic.json`), committed before any split
- [ ] F3.1 hidden_places.js: buildMoonPool, buildLanternGlade
- [ ] F3.1/F3.2 interior.js: buildInterior, buildKnockables
- [ ] F3.1 vegetation.js: buildSakuraGrove, buildDappledLight, buildPetalDrifts, buildBambooGrove, buildMaplesAndPines, buildMeadow
- [ ] F3.1 ambient_life.js: buildBirds, buildGuardianBirds, buildButterflies, buildKoi
- [ ] F3.1 particles.js: buildGodRays, buildRain, buildRiverPetals, buildPetals, buildFireflies, buildMotes, buildSnow
- [ ] F3.4 sky.js / postfx.js / grass.js untouched (checked)
- [ ] Checks, review sheets, headless boot, handoff, report, PR

## Checks run (command → real result)

## Deferred assets and why

## Footprint waivers requested

## Notes for the Integrator
