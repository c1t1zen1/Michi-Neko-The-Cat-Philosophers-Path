# v-machiya-b status
Model: Claude Sonnet 5.5. Base: fable/integration 5c0318e (merged: up to date). Family: src/kit/machiya (part b: buildings), lab 04.

- [x] L1 status  - [x] L2-L3 assets  - [x] L4 (village-street deferred, no own geometry)  - [x] L5 kit_index  - [x] L6 compare JPGs (32)  - [x] L7 checks  - [x] L9 handoff  - [x] L10 push + PR

## Assets
| id | parts | notes |
|---|---|---|
| tea-house | walls_warm, walls, roof, door, timber, skirt, inuyarai | own body only (components are placed by the Countryside); hero adds fascia + rafter tails, top plate, chochin hooks, namako skirt, reused bamboo-fence inuyarai |
| residence | same | same treatment, inuyarai on the east wall |
| secret-house | walls, timber | side walls, door-frame backing, tansu with drawers and brass pulls, kakejiku, hero lintel / threshold / plinth |
| street-house | walls, door, timber | sill, posts, eave beam, studs, front step; far = one bag mesh |
Deferred: `village-street` (parent of eight street-house components only; an empty kit asset adds nothing).
Footprint waivers: none. New merged materials: 0 (MAT plaster / roof tile / shoji / namako + the shared kit bag; the fence is the fences kit's own bamboo material).
BUDGET_EXCEPTIONS added (src/kit/budgets.js): tea-house, residence: materials hero 8 / mid 5, buildMs hero 12.

## Checks (real output)
- `node tools/kit_check.mjs`: All kit checks OK (162 passed)
- `node tools/kit_contract_test.mjs --family machiya`: 14 assets, 42 builds, 1131 checks; the four new assets pass. 4 failures, all warm build ms of part a assets (kawara-roof hero 8.0 / mid 4.3, timber-frame mid 3.3, engawa mid 3.5) on a loaded machine (load avg ~9; the same four failed at 12 / 7 / 5 / 7 ms in the earlier run). Not my files; flagged. merge OK.
- `node tools/footprint_golden.mjs`: EQUAL
- modular (`?swap=` the four ids): sections that differ are objects / aggregates / baked / counts only; colliders 518, platforms 65, anchors 25, rng, waterRects, exclusions unchanged. (`?assets=modular` also moves `shishiRocker` from the garden family, not this one.)
- check_syntax 99 modules OK; verify.mjs All checks passed; labs_check OK; `git diff --check fable/integration...HEAD` clean.

## Perf (perf_spots street, Metal, 1 boot x 2 rounds, load avg ~9)
| set | tier | draws mean | tris mean | frame ms |
|---|---|---|---|---|
| classic | medium | 597 | 6.068M | n/a (see below) |
| 4 buildings modular | medium | 600 | 6.077M | 27.5 |
| classic | high | 764 | 8.074M | |
| 4 buildings modular | high | 773 | 8.139M | 29.4 |
| classic (second session) | medium / high | 576 / 781 | 5.956M / 8.193M | 22.6 / 32.9 |
| ALL 14 machiya modular | medium / high | 510 / 661 | 6.095M / 8.237M | 25.4 / 35.9 |
The buildings alone add +3 (medium) / +9 (high) draws: the reused fence's culm and knot meshes and the skirt are new baked draws and classic roofs (4 InstancedMeshes each, not merged) are still classic in that run. With the roofs and the other components in the kit too (the real swap), draws fall 576 -> 510 (medium) and 781 -> 661 (high), triangles +2.3% / +0.5%; modular medium (6.09M) stays below classic high (8.19M), R52 holds for the family as a whole. Frame ms rose 2.7 / 3.0 ms in the second session with the full swap; machine load varied (load avg 8-10) so I cannot separate it from noise, but the rise matches part a's reported frame-ms rise: for the Integrator's perf gate.

## Judgement (compare JPGs, docs/fable/status/v-machiya-b/)
AAA-1: house bodies gain fascia and rafter tails under the lower eave, upper hashira, a ridge cap on the ledge, a namako skirt, an inuyarai, tansu drawers and brass pulls, a lintel and threshold on the secret door; street houses gain studs, a nosing and stone shoes. AAA-5: legible at 1.5 m cam height, 6/12/18/22 h; pairs are not byte-identical (cmp). Weak spots, said plainly: the tea-house frame is half hidden by the cherry tree and a dark foreground box, so the pair differs only in the eave band and lantern hook; the residence and tea-house inuyarai sit on the side walls and are rarely in frame; the secret-house pair barely differs at 18 / 22 h (dark). Colour tone matches classic (same MAT entries).
