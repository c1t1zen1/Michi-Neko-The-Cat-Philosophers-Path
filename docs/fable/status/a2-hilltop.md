# a2-hilltop

- Worker / model:     Claude Sonnet 5.5 (resumed after a first session ended before its first commit)
- Claimed:            2026-11-14
- Branch:             fable/a2-hilltop
- Base commit:        2f78865
- State:              ready for review (scoped: deferred minors + tooling + meditation-seat evidence; walk routes not done)

## Steps
- [ ] A.1 Walk routes: NOT done (three cat-height route sweeps need a long quiet-machine session; ranked issue 1)
- [x] A.2/A.3 Seat judged at 6.5/12/18/23 h, classic vs modular: no regression; protected view holds (`seat_*.jpg`, this folder)
- [x] A.4 Life: kit pollen damps on reduce-motion; butterflies dim at night; rain/snow ramp in on entry
- [ ] A.5 Sound: no summit sound change (out of kit scope)
- [ ] A.6 Performance: no tier changes; nothing cut
- [ ] A.7 Comfort: reduce-motion verified in code only (pollen); FOV/contrast/large-text boots not run
- [x] A.8 This file. Before/after vs Phase 0 captures not made (seat pairs classic vs modular instead)

## Fixed (deferred minors)
- Pollen (kit) damps on reduce-motion (R55); classic untouched.
- Butterflies (critters, small fix): wing emissive follows sun height (uGlow), dark at night.
- Kit rain/snow ramp in from zero on summit entry like the classic.
- summit_kit_parity: lanternY now measured from the built toro (null = failure); derived value kept as lanternYDerived.
- summit_preview: kit runtime with `?assets=`, `?swap=`, `&quality=`; existing views unchanged.

## Checks
- summit_kit_parity: EQUAL; kit_contract_test critters + summitlife: PASS; kit_check 422 passed
- summit_golden EQUAL (advisory diffs pre-existing); footprint_golden EQUAL; summit_test 83/0; verify all passed; check_syntax 162 OK
- game_shot boots classic + modular: 120 frames, only the optional /cad-overrides.json 404

## G-S (Ruling R59): meditation view accepted PROVISIONALLY from the four-time seat pairs; operator may overturn.

## Remaining issues, ranked
1. A.1 route walks and A.7 comfort boots not run.
2. s2 stone slightly light/yellow at noon (not touched).
3. s3: night lit-city wave weak from the seat; pagoda proxy lighting in rain/storm; kyoto-city far tier only fewer houses.
4. Butterfly still faintly visible at night (lit by the sky fill), minor.
5. summit-trees / slope-forest still deferred.
