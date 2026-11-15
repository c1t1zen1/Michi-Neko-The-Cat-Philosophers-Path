# r4-festival status

Model: Claude Sonnet 5.5 | Started: 2026-11-15 13:40 | Base: f8eabc9 (fable/integration) | State: DONE_WITH_CONCERNS (7 of 12 ids promoted, 5 deferred)
Lane: Phase 5 Roof Road kit, mouths 6-7 (family `src/kit/rooffestival/`, handoff `docs/fable/handoff/r4-festival.md`)

## Steps
- [x] promoted (hero/mid/far): roof-yatai, roof-lantern-racks, roof-hoko, roof-temple-gate, roof-tsuiji, roof-yama, roof-skyline-pagodas
- [x] deferred: roof-distant-city (instanced sea vs 1k far budget), roof-sky, roof-hills, roof-okuribi (sky.js not routed), roof-atmosphere (atmosphere.js not routed); reasons in the handoff
- [x] contract test, kit_check, rooftop golden, rooftop tests, ?auto=1 stall s, finale
- [x] L6 compare pairs (42 JPGs + finale pair)

## Checks (uptime 1-min load 2.1 to 3.8 during runs)
- kit_check: All kit checks OK (464 passed; needs `node tools/kit_index.mjs` first, index.js not committed)
- kit_contract_test --family rooffestival: 7 assets, 21 asset x tier builds, 412 checks, 0 failed (BUDGET_EXCEPTIONS rows added for yatai, hoko, temple-gate, tsuiji, yama: parts and materials, hoko mid 7,112 tris)
- rooftop_golden classic: EQUAL. With the 7 ids swapped: only the 29 yatai/rack/float/gate/tsuiji/yamaFloat piece entries, the hoko live group, 3 pagoda root children, batches and update samples change; materials +1 (`kit:bag#1`, the pagoda family's shared matte). Gate and tsuiji bounds equal the classic's; yatai bounds within 2 cm; rack within 0.5 cm
- footprint_golden classic: EQUAL; `?swap=` of the yatai/hoko/gate/pagoda ids: EQUAL
- rooftop_test: 38 passed, 2 failed = the baseline pair (one straight leg; autopilot reaches the perch, s=1232.17), unchanged. rooftop_companion_test: its baseline crash, unchanged
- `?auto=1` via `kyoto-rooftops.html?qa=1&auto=1` + `advanceForReview(450)`: classic stalls at s=1232.1749, y=4.5, cameraFailures 3; all 7 ids swapped: s=1232.1749, y=4.5, cameraFailures 3 (identical), no console errors
- `?finale=1`: fires target/kindle at 4 s steps are identical on classic and modular: 11000, 11110, 11111 ... 5 kindle to 1.00 in order; finale-classic.jpg / finale-modular.jpg
- check_syntax 175 modules OK; verify All checks passed; labs_check OK; `git diff --check fable/integration...HEAD` clean

## L6 compare (docs/fable/status/r4-festival/<id>-<day|dusk|night>-<classic|modular>.jpg, 960x600, <= 72 KB)
The Roof Road page has no free camera, so each pair is the game camera with the cat standing on the piece (`roofRoad.at(s, y)`, 3.5 s settle), i.e. at cat height. Not pixel-repeatable by design; no pair is byte-identical (cmp).
- yatai: valance scallops, front posts, plank counter, split noren, sign and ware detail read better than the classic's flat box stall. AAA-1/AAA-5 pass.
- lantern rack: braced posts, two lantern rails, caps; reads fuller and the lamps glow at night. Pass.
- hoko: brocade lace, fringe, curtains, hubs and brackets are a clear step up from classic. The hayashi are WEAKER than the classic's (blocky, heads small at this scale): r5 owns roof-hayashi and should replace them through `dynamic.float`. AAA-1 pass for the float, fail for its musicians.
- temple gate, yama: pass (more joinery; pine cloud a little sparser than classic).
- tsuiji: the camera at s=1052 frames the wall poorly; the wall itself matches the classic and adds footing and posts; marginal AAA-1.
- skyline pagodas: the play camera never frames them (rooftops from s=748 and s=132 show roofs only), so those 6 pairs are not framed on the piece and are not an AAA judgment. Reported as a concern; geometry judged by bounds only (36.5/43.2/29.7 m vs classic 36/42.7/29.4 m).
