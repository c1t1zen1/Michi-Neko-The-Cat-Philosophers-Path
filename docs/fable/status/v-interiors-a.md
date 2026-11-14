# v-interiors-a
- Worker / model: Claude Sonnet 5.5 (claude-sonnet-5-5)
- Claimed: 2026-11-13   Branch: fable/v-interiors-a   Base: fable/integration 559d18c
- State: done (PR open)

## Assets
| Inventory id | Promoted from | Parts | Tiers | Footprint | State |
|---|---|---|---|---|---|
| tea-interior | new whole-room kit (composes the parts below + courtyard + lanterns' andon/toro) | tatami, frame, tokonoma, scroll, bonsai, chabudai, teaware, platter, fish, zabuton, door, courtyard, andon, toro | hero/mid/far | layout | promoted (needs BUDGET_EXCEPTIONS, handoff 1) |
| tatami | lab tatami + new heri | mats, heri | h/m/f | layout | promoted |
| interior-frame | new specimen frame | walls, timber, border, trim | h/m/f | layout | promoted |
| shoji-doors | lab shoji | frame, paper | h/m/f | layout | promoted |
| tokonoma | new specimen | floor, trim | h/m/f | layout | promoted |
| scroll | new specimen | mount, painting | h/m/f | layout | promoted |
| bonsai | new specimen (was missing) | tree | h/m/f | layout | promoted |
| chabudai | new specimen | top, legs | h/m/f | layout | promoted |
| teaware | lab pottery | set | h/m/f | layout | promoted |
| zabuton | new specimen | cushion | h/m/f | layout | promoted |
| knockables | new specimen | cup, bowl, ball | h/m/f | waiver (floorY/rest in group space) | promoted |
Deferred: none. andon, courtyard-toro (v-lanterns) are reused inside tea-interior; courtyard-gravel and courtyard-wall (not mine) are built inline by the room parent.

## Steps
- [x] L1 Claim  - [x] L2 Read  - [x] L3 Choose  - [x] L4 Close gaps (labs/interiors/js/specimens.js: 7 bench specimens)  - [x] L5 Promote  - [x] L6 Compare  - [x] L7 Check  - [x] L8 Self-review  - [x] L9 Handoff  - [x] L10 PR

## Checks run (command -> real result)
- `node tools/kit_check.mjs`: All kit checks OK (112 passed)
- `node tools/kit_contract_test.mjs --family interiors` (committed tree): 11 assets, 33 builds, 754 checks; the only failures are 10 tea-interior budget checks (meshes 32 > 16, materials 11 > 6, mid tris 7,753 > 6000, far 2,436 > 1000 / 23 meshes / 10 materials, warm build 6.4 / 4.1 ms). With the BUDGET_EXCEPTIONS entry from the handoff applied locally (not committed, hot file): 0 failed, three runs.
- `node tools/footprint_golden.mjs`: EQUAL (classic). `--systems`: EQUAL.
- `node tools/footprint_golden.mjs --query "?swap=<all 11>:modular"`: EQUAL (valley golden has no interior).
- `--systems --query "?swap=<10 ids, not knockables>:modular"`: DIFFERENT (replaced meshes only), seam ok, counts 135 colliders / 1 platform / 5 anchors as classic. With knockables: seam line floorY 100.05 vs 0.08 = the waived fix.
- `node tools/interiors_test.mjs`: 28 interiors checks passed. `node tools/check_syntax.mjs`: All 81 modules OK. `node tools/verify.mjs`: All checks passed. `node tools/labs_check.mjs`: All labs checks OK. `git diff --check fable/integration...HEAD`: clean. `node tools/kit_index.mjs --check`: in sync.
- Perf (in the room, headless Metal, `?shot=1`): high classic 73 draws / 414,088 tris, modular 69 / 425,421; medium classic 73 / 414,088, modular 70 / 420,567 (draws -3/-4; medium modular tris +6.5k over classic high, 1.6 percent, noted). Room meshes after merge: 20 classic, 15 modular.

## L6 (docs/fable/status/v-interiors-a/, 88 JPGs 960x600, none byte-identical per pair)
Shot inside the tea house at cat height (y 100.2-100.5) at 6/12/18/22 h, `?assets=classic` vs `?swap=<all 11>:modular`; entry command in the handoff (section 8). Read: tea-interior, shoji-doors (12, 22), tokonoma (18), chabudai/tatami/teaware/zabuton (12), knockables (6, 18), interior-frame (22), zabuton (22 classic).
- AAA-1: tea-interior reads as a room (rails, skirting, battens, closed transoms, lit paper doors) against flat slabs; shoji-doors a real kumiko with kick boards, tokonoma/scroll an earthen wall, natural post and an ink painting where classic has a brown rectangle; teaware hollow lathed pot; knockables now visible on the table (classic hides them 100 m up). Weakest: the fish (reads as a simple grilled body, tail fan is small), and the floor board texture (the classic engawa texture, unchanged).
- AAA-5: legible at 0.35 m and 3 m, 6/12/18/22 h. Shoji glows warm white by day, amber at dusk, moon blue at night; room lights follow the cat's presence; night 22 h is warm and readable. The hour tint only updates while the cat is outside (main.js skips assets.update inside; handoff 4).

## Footprint waivers
- knockables: rest/floorY in room-group space (table 0.49, tatami 0.08) instead of origin-doubled 100.05 (f3 handoff 3, the card's required fix).

## Notes for the Integrator
- Size: 884 changed lines (git diff --numstat, images excluded) plus 88 compare JPGs; under the ~1500 guide.
- Required: BUDGET_EXCEPTIONS entry (handoff 1). Recommended: handoff 2 (lights hook), 3 (classic knockables), 4 (inside update).
- Draw calls: 0 live meshes of its own; 1 new merged material for shoji paper plus 1 for the scroll painting.
