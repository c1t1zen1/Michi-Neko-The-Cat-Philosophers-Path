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
