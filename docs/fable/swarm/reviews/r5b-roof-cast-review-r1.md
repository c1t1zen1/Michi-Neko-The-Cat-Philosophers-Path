# r5b-roof-cast review r1: APPROVED (0 Critical, 0 Important, 3 Minor)

Verified by running on the worktree (Metal):
- rooftop_golden classic: EQUAL (castPass is classic-neutral; assets.build returns null when not swapped).
- swap=roof-boatman:modular: only pieces/root (2 boats) and +1 material (kit bag) differ; NO update/boatmotion rows. Full swap (boatman, takasebune, hayashi, hoko): routing 41/41, update differs in 5 rows (hoko sample, as r4 documented). The routing self-test "fails" on a boatman-only swap only because it asserts materials identical; expected.
- ?finale=1 headless via tools/headless.mjs, classic and swap=roof-hayashi:modular: ok, errors [], body.at-finale set. The lane's "page errors on classic too" did not reproduce; not caused by this lane. (I did not count fires.)
- cat_golden EQUAL; cadJS npm run check 16/16; rooftop_test 38/2 (baseline); no labs/ import, no Math.random/Date.now in src/kit/roofcast.
- castPass: minimal (31 lines, additive, rooftops/js/build.js only). Covers all four combos by operating on the record slots (boat.boatman/pole, float.group/musicians); kit-hull+kit-boatman and kit-hoko+kit-hayashi exercised in the full-swap golden without errors. Recommend landing as-is under a retroactive ruling (a smaller hook would be the same code).
- Budget: hayashi hero 34,082 tris is +9% over classic 31,378 and over the 25,000 hero default; exception row 35,000 is justified (classic is already above cap; meshes 44->33, mats 16->7). Kit bag +1 material measured in the golden.
- AAA-1 pairs opened: hayashi day classic vs modular equal in context; boatman judged on close-up only (hidden by the deck in-page), looks sound.

Minor
1. src/kit/budgets.js:68 hero triangle cap 35000 leaves under 3% headroom over 34,082; consider 36000.
2. rooftops/js/build.js castPass: drop() disposes geometry of the replaced classic figures; safe now (unique geometry), would break if a classic boatman ever shared geometry. Note in the ruling.
3. Boatman never seen in context (AAA-1 unproven for him); accept per R75, re-judge when a camera reaches him.
