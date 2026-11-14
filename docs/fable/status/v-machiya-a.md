# v-machiya-a status
Model: Claude Sonnet 5.5. Base: fable/integration (merged, 48ab078). Family: src/kit/machiya, lab 04 (labs/machiya).

- [x] L1 status  - [x] L2-L3 family `machiya` (10 ids)  - [x] L4 gap specimens (namako, tea-bench, secret-door, lock-plate)
- [x] L5 `node tools/kit_index.mjs`  - [x] L6 compare JPGs (80, 10 ids x 4 hours)  - [x] L7 checks  - [x] L9 handoff  - [x] L10 push + PR

Size: about 1,100 changed source lines (src/kit/machiya ~720, lab gaps ~120) plus 80 JPGs; under the 1,500 cap.

## Assets (all promoted)
| id | parts | tris hero / mid / far | notes |
|---|---|---|---|
| kawara-roof | tiles, ridge, trim | 7,960 / 4,440 / 184 | closed slab slopes with pan-and-roll relief and sori; MAT.roofTile + MAT.roofRidge + kit bag. Sample = the envelope of the biggest real roofs (7.6 x 5.2, ridge 1.5, eave 0.7). Far folds ridge into trim (2 materials) |
| koushi / upper-windows | lattice | 204 / 180 / 180; 276 / 252 / 240 | one km.bag mesh; slat width, cut-back, finish (dark / bengara / natural); upper-windows adds a sill |
| noren | cloth, trim | 812 / 634 / 78 | cloth is the only live mesh (hero only; mid and far are static on the game's MAT.noren*); panels, crest |
| timber-frame | frame | 1,524 / 1,260 / 96 | sill on stone shoes with a shadow gap, eave beam exact, bevelled hashira |
| namako | wall, trim | 180 / 180 / 120 | game MAT.namako with metre UVs, kick board and lime rail |
| engawa | deck, base | 1,776 / 1,644 / 144 | butt-jointed boards, joists, stone shoes, boot stone |
| tea-bench | bench | 408 / 372 / 84 | rounded felt, piping, optional tray |
| secret-door | panel, frame | 308 / 188 / 60 | MAT.shoji (lit) leaf + frame, floor rail, kumiko, pull recess. Gameplay group `secretDoorMesh` slides it |
| lock-plate | plate, keyhole | 904 / 456 / 296 | MAT.goldAntique plate; `lockPlate` group; floating (screwed to the door leaf) |

New merged materials: 0 (everything is MAT.* from the game or the alley's km.bag, same args). Live meshes: 1 per hero noren, 0 at mid/far.
Part names for gameplay binds: lock-plate and secret-door bind `.` (the group); nothing else binds.

## Checks (real output)
- `node tools/kit_check.mjs`: All kit checks OK (93 passed)
- `node tools/kit_contract_test.mjs --family machiya`: 10 assets, 30 asset x tier builds, 901 checks, 0 failed; merge OK (valley 237 calls; +48 kit meshes -> 285; after _mergeInto -> 240)
- `node tools/footprint_golden.mjs`: EQUAL
- `... --query "?swap=<all ten>:modular"`: DIFFERENT only by replaced meshes (objects/aggregates/baked/counts); colliders, platforms, anchors, rng, waterRects, exclusions unchanged (no section diff). With `assets=modular` one anchor differs (`shishiRocker`), from the garden family, not this one.
- check_syntax 82 OK; verify.mjs All checks passed; labs_check OK; `git diff --check fable/integration...HEAD` clean
- Lab: /labs/machiya/ 43 specimens, four new shelves build in headless Chromium with no page errors.

## Perf (tools/perf_spots.mjs, Metal, street spot, 1 boot x 2 rounds, same-day)
| | draws/frame (mean) | triangles/frame (mean) | frame ms |
|---|---|---|---|
| classic high | 761 | 8,073,902 | 11.95 |
| modular high | 670 | 8,175,979 | 12.40 |
| classic medium | 597 | 6,072,692 | 8.82 |
| modular medium | 518 | 6,116,404 | 9.80 |
Draws fall ~90 (high) and ~80 (medium): the classic roofs are four InstancedMeshes each, which `_mergeStatics` skips; the kit roof is plain meshes that merge per material. Triangles +1.3% (roofs, lattices, boards). Modular medium (6.12M) stays below classic high (8.07M). Frame ms is within the run-to-run spread on a loaded laptop (+0.45 / +1.0); not a regression I can attribute.

## Judgement
AAA-1: roofs gain rafter tails, bargeboards, the onigawara horn and pan relief; lattices gain rear ties and cut-back slats; the bench gets a soft felt cushion and legs; the engawa shows boards, joists and stone shoes; the noren is slit into panels with a hem and crest; the lock is a bevelled plate with screws and a keyhole. Tone is close to classic (the dark timber is slightly browner, painterly). AAA-5: legible at 0.35 m (tea-bench), 1-3 m, 6/12/18/22 h. Weak spots, said plainly: the roof compare frame is half hidden by the cherry tree (rafters and bargeboards still show); timber-frame is mostly behind the walls, so the pair reads as stone shoes plus bevelled posts at the foot only; the secret-door pair is nearly identical in the dark at 18/22 h (the leaf is unlit in both).
Footprint waivers: none.

## Fix round 1
- noren cloth is no longer live: one shared static kit material (km.cloth key `noren-sway`, vertex colour per noren) with a vertex-shader sway (aSway = hang fraction, phase from world position, displacement along the vertex normal so merged/baked cloth sways off its own wall). Every noren instance's update() writes the shared time/wind uniform; `live` is empty at every tier. Reduce-motion is not exposed to kit materials (env has only hour/wind/wet/snow/lanternOn), so it cannot be damped from the family. Material count: 1 shared (the noren cloth); hemp weave texture is now a flat colour.
- Merged origin/fable/integration (10 families); kit_index regenerated.
- Checks: kit_check 131 passed; contract machiya 10 assets / 30 builds / 903 checks / 0 failed, merge OK; footprint golden EQUAL; swap golden objects/aggregates/baked/counts only (colliders, platforms, anchors unchanged); verify passed; labs_check OK; noren pairs re-shot and Read (3 panels, crest, colour right).
- Perf (street, same session, classic vs modular): high draws 780 -> 657, tris 8.170M -> 8.232M (+0.8%), frame 9.70 -> 12.05 ms (GPU wait 6.3 -> 8.5; the shadow pass dominates); medium draws 600 -> 515, tris 6.098M -> 6.111M, frame 7.95 -> 9.13 ms. Modular medium stays below classic high. The frame-ms rise is real in this run (+2.3 / +1.2 ms) and is not explained by draws; flagged for the Integrator's perf gate.
- Roof triangle derivation (11 roofs: tea house, residence, secret house, 8 street houses = 11): classic roof is about 2.4k tris (two 10-segment slabs ~130, ~37 half-cylinder eave tiles x2 ~1.8k, rafters ~0.4k, ridge); kit hero 7,960, so roofs add about 11 x 5.5k = 61k at high; lattices, boards and frame add the rest of the ~62k net (8.170M to 8.232M). Classic counts are my estimate from the builder, not a measured per-asset number.
- door.js comment fixed. Roof Road callers must pass `layout.band` (a layout without x/z resolves to near); added to the handoff.
