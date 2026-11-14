# f2-countryside-split

- Worker / model:     Claude Opus 5.5 (claude-opus-5-5)
- Claimed:            2026-11-13 04:20 PST
- Branch:             fable/f2-countryside-split
- Base commit:        5dc924a (fable/integration: f1-golden merged)
- State:              in progress

Lane: guide §8 F2.1–F2.6. Split every builder in `src/countryside.js` into
`layoutX()` (every seeded draw, in its original order, plus the R12/R18
footprint) and `meshXClassic(layout)` (the original meshes, no draws), joined
by `placeAsset(id, layout, classicFn)`.

## Steps
- [ ] F2.1 Builder → inventory id map (below)
- [ ] F2.2 Split + route every builder
- [ ] F2.3 Footprint golden EQUAL after each builder (one commit per builder)
- [ ] F2.4 Nested builders keyed by component ids
- [ ] F2.5 `_mergeStatics()`: classic unchanged; kit instances merge except `live`
- [ ] F2.6 Full-game headless boot

## Checks run (command → real result)

## Notes for the Integrator
