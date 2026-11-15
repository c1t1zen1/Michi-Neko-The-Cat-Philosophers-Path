# v-interiors-b
- Worker / model: Claude Sonnet 5.5 (claude-sonnet-5-5)
- Claimed: 2026-11-14   Branch: fable/v-interiors-b   Base: fable/integration 23f1852
- State: done (PR open)

## Assets (family src/kit/interiors/, files court.js, secret.js, index.js)
| Inventory id | Promoted from | Parts | Tiers | Footprint | State |
|---|---|---|---|---|---|
| courtyard-gravel | classic slab; lab rocks/rake direct | gravel, rake, stones | h/m/f | layout | promoted |
| courtyard-wall | classic 3 slabs; new specimen | wall, trim, cap | h/m/f | layout | promoted |
| secret-tatami | part a's tatami builder at 1.15 x 2.3; new specimen | mats, heri | h/m/f | layout | promoted |
| secret-table | new (stepped top, pads, aprons, kyusu+yunomi, platter); new specimen | top, legs, set, dish (far: top, set, dish) | h/m/f | layout | promoted |
| secret-bed | part a's zabuton scaled to 0.75 m; new specimen | cushion | h/m/f | layout | promoted |
| secret-andon | lanterns kit `buildAndon` (reused, scaled 0.82 to the classic 0.72 m); new specimen | frame, paper (live: paper) | h/m/f | layout | promoted |
Deferred: none.

## Steps
- [x] L1 Claim  - [x] L2 Read  - [x] L3 Choose  - [x] L4 Close gaps (labs/interiors/js/specimens_b.js: 5 specimens, tabs 11-15)  - [x] L5 Promote  - [x] L6 Compare  - [x] L7 Check  - [x] L8 Self-review  - [x] L9 Handoff  - [x] L10 PR

## Checks run (command -> real result)
See the report file (.superpowers/sdd/BUILD_GUIDE_FABLE/reports/v-interiors-b-report.md) for the full output.

## Footprint waivers
None. Colliders / platforms / anchors identical to classic (518 / 65 / 25 valley, 135 / 1 / 5 systems).

## Notes
- The secret-table does not build the grilled fish: it is the `secret-fish` component the house places on the plate (keepsakes kit).
- Part a is untouched; tea-interior keeps its inline courtyard. court.js is the same look as separate ids for a mixed room.
- budgets.js: tea-interior buildMs raised 9/6 to 14/9 (warm build re-measured under sibling load).
