# v-fences

- Worker / model:     Worker C / Claude Sonnet 5.5
- Claimed:            2026-11-14 04:56 UTC
- Branch:             fable/v-fences
- Base commit:        4273c90 (fable/integration)
- State:              ready for review

## Assets
| Inventory id | Promoted from (lab/specimen) | Parts | Tiers | Footprint | State |
|---|---|---|---|---|---|
| bamboo-fence | fences/game-fence + yotsume/kenninji vocabulary (instanced culm, nodes, lashing) | culms, knots | hero/mid/far | layout (no waiver) | promoted |
| corral | fences/corral | corner_posts, lashings | hero/mid/far | layout (no waiver) | promoted |
| corral-sign | NEW specimen fences/corral-sign (L4) | post, board, face, cap, lashing | hero/mid/far | layout (no waiver) | promoted |

## Steps
- [x] L1 Claim
- [x] L2 Read
- [x] L3 Choose: the game fence keeps its closely set verticals and two rails (so colliders, the fenceWalk platform and the tilts stay the layout's); the lab contributes the node-swollen instanced culm and the cord lashing at every crossing. Kenninji/koetsu/teppo/ginkaku styles are not promoted: they change the silhouette and need new layout fields (style), which is countryside.js.
- [x] L4 Close gaps: `labs/fences/js/sign.js` + specimen `corral-sign`
- [x] L5 Promote
- [x] L6 Compare (docs/fable/status/v-fences/*.jpg)
- [x] L7 Check (below)
- [x] L8 Self-review: AAA-2/3/6/7/8/9 by the contract test; AAA-1/5 below
- [x] L9 Handoff
- [x] L10 PR

## Checks run (command → real result)
- `node tools/kit_check.mjs` → All kit checks OK (45 passed)
- `node tools/kit_contract_test.mjs --family fences` → 3 assets, 9 asset×tier builds, 300 checks, 0 failed; merge OK; self-test OK
- `node tools/footprint_golden.mjs` → EQUAL
- `... --query "?assets=modular&swap=bamboo-fence:modular,corral:modular,corral-sign:modular"` → DIFFERENT only in objects (+28), aggregates (-11), baked, counts: mesh composition; colliders 518, platforms 65, exclusions 4, anchors 25, water rects 5 unchanged
- `node tools/check_syntax.mjs` → All 67 modules OK
- `node tools/labs_check.mjs` → All labs checks OK (after regenerating labs/ASSET_COVERAGE.md)
- `node tools/verify.mjs` → 70 passed, 0 failed; kit_test 35/36: the one failure is the fixture bug described in the handoff (not caused by asset behaviour)
- `git diff --check fable/integration...HEAD` → clean

## L6 / AAA-1, AAA-5 (honest)
Shots at hour 6/12/18/22, cat height from 2 m and a corral overview, classic vs `swap=…:modular`. The modular fence reads as real bamboo: swollen nodes, a straw tone with per-culm variation, dark cord lashings at each rail crossing, posts at the ends, and the corral's corner posts tie the four runs; the sign gains a rain cap, framed board and a lit painted face (classic face was unlit and glowed at night). At night it dims with the scene instead of staying bright. Classic's dark verticals with green rails read stronger at dusk silhouette; modular is lighter. AAA-1 met (clearly richer at 0.35 m), AAA-5 met (same silhouette, same footprint, same part layout). The rail lashings look like dots from the front: acceptable, they are cord.

## Deferred assets and why
None of mine. (`jade-paw`, `larry` are other lanes' components.)

## Footprint waivers requested
None.

## Notes for the Integrator
See docs/fable/handoff/v-fences.md (inventory row for corral-sign, kit_test fixture bug, helper promotion).

## Fix round 1
Fences/corral posts/sign lashings baked into plain merged geometry (no InstancedMesh); merged fable/integration. perf_spots draw calls 763->751 (street), 735->706 (meadow); triangles +4.8% / +4.4%. corral-sign JPGs re-shot from a real sign-framed camera. Hero end posts no longer 4 cm taller. Far sign dark wood is documented in the handoff. See the report's Fix round 1 section.
