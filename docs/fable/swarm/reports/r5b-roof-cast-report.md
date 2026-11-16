# r5b-roof-cast report (Claude Sonnet 5.5, Metal, load 2-3.5)

Built `roof-boatman` and `roof-hayashi` (src/kit/roofcast/cast.js), seated residents (resident.js), `castPass` in rooftops/js/build.js (committed; r1's file, review it), `roof-hayashi` budget row. Both ride on the boat/float record, so they work on classic or kit hulls/floats (handoff section 2).

Checks: kit_check OK (523); contract roofcast 5 assets 15 builds 311 checks 0 failed; cat_golden EQUAL; rooftop_golden classic EQUAL; check_syntax 190 modules OK; verify All checks passed; labs_check OK after `labs_coverage --write`; cadJS `npm run check` 16/16 tests passed; git diff --check clean; rooftop_test 38/2 (baseline).
Golden swaps: boatman alone: 2 boat pieces/root changed, NO update (boatmotion) rows differ, +1 material (kit bag, already in the villager swap). hayashi alone: the float piece/root and batches, no update rows. With kit hull+hoko too: same, update rows differ only for the hoko's own sample (5) as r4 documented.
`?auto=1`: swapped (boatman+hayashi; kit hull+hoko; all six cast ids) s=1232.1749 every run; classic 1232.2124 once, 1232.1749 twice (run-to-run).
Budget (measured): classic hayashi 44 meshes / 31,378 tris / 16 mats; modular hero 33 / 34,082 / 7 (+9% tris), exception row added. Classic boatman 5 / 236 / 5; modular 2 meshes, in caps.
L6: see docs/fable/status/r5b-roof-cast.md. Hayashi equal to classic; boatman judged on close-up (page camera hides him); finale not captured.

Concerns: finale identity unverified (finale page errors headlessly on classic too); hayashi is equal, not better, in context; castPass is a build.js change outside the strict file list; skin tone of residents slightly darker than classic.
