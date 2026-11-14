# v-lanterns

- Worker / model:     Claude Sonnet 5.5 (claude-sonnet-5-5)
- Claimed:            2026-11-13
- Branch:             fable/v-lanterns
- Base commit:        c39a982 (fable/integration)
- State:              done (PR open)

## Assets
| Inventory id | Promoted from (lab/specimen) | Parts | Tiers | Footprint | State |
|---|---|---|---|---|---|
| toro | lanterns / kasuga (fixed hollow firebox) | kiso, sao, chudai, hibukuro, kasa, hoju, lamp, halo | hero/mid/far | layout  | promoted |
| chochin | lanterns / gifu (lathed washi) | cord, cap, paper, band, foot, tassel | hero/mid/far | layout  | promoted |
| street-lamps | lanterns / kasuga pattern, 4-sided | kidan, sao, chudai, hibukuro, kasa, hoju, lamp, halo | hero/mid/far | layout  | promoted |
| andon | lanterns / andon | frame, paper | hero/mid/far | layout  | promoted |
| courtyard-toro | new specimen (L4) | as toro | hero/mid/far | layout  | promoted |
| pool-toro | new specimen (L4) | as toro | hero/mid/far | layout  | promoted |

## Steps
- [x] L1 Claim
- [x] L2 Read
- [x] L3 Choose
- [x] L4 Close gaps
- [x] L5 Promote
- [x] L6 Compare
- [x] L7 Check
- [x] L8 Self-review (AAA-1 ... AAA-10 per asset)
- [x] L9 Handoff
- [x] L10 PR

## Checks run (command -> real result)
- kit_check: All kit checks OK (44 passed)
- kit_contract_test --family lanterns: 6 assets, 18 asset x tier builds, 509 checks, 0 failed
- footprint_golden (classic): equal; modular (all 6 swapped): 518 colliders, 65 platforms, 5 water rects, 4 exclusions, 25 anchors as classic; only object-level differences
- check_syntax: All 66 modules OK; labs_check: OK; git diff --check: clean
- verify: 2 checks failed, both from tools/kit_test.mjs fixture copying the real kit tree (see handoff); classic tree passes
- Compare JPGs: docs/fable/status/v-lanterns/ (toro 6/12/18/22, street-lamps 12/22). AAA-1: hollow firebox with visible higuchi and lit paper reads clearly better than the box; AAA-5: night glow and halo match the classic dusk curve.

## Deferred assets and why
None. Chochin/andon/courtyard/pool shots not captured (interior and hidden places need walking there); contract and footprint cover them.

## Footprint waivers requested

## Notes for the Integrator

## Scope completion
- Merged origin/fable/integration (kit_test fixture fix); `node tools/verify.mjs`: "All checks passed".
- L6 compare JPGs now exist for all six ids at 6/12/18/22 h (classic and modular; 44 files, none byte-identical per pair, all under 150 KB). Swap confirmed visually (hollow firebox, lathed chochin, framed andon).
- chochin (street house at 4.2,2,-5.3): AAA-1 round lathed washi with red band and tassel reads as a real chochin vs a box; AAA-5 glow and warm bloom at 18/22 h match the classic dusk curve.
- andon (interior, cam y 100.9): AAA-1 frame, ribs and four panes beat the flat box; AAA-5 lit all hours like the classic (paper glow base 0.4). Concern: at night the paper is close to blown out white; gain could be lowered by the Integrator/design pass.
- courtyard-toro: AAA-1 hollow Kasuga with visible higuchi vs four boxes; AAA-5 always warm, matching the interior being lit.
- pool-toro (-16.1,0,-24.6): AAA-1 hollow firebox and swept roof; AAA-5 halo is a tighter bloom than the classic big orange disc, lamp lights at dusk and stays dark by day; judged better, flagged as a visible look difference.
