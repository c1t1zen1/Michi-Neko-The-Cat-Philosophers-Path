# v-interiors-b report (Claude Sonnet 5.5)

Built six assets in src/kit/interiors/ (court.js, secret.js; index.js only appended): courtyard-gravel, courtyard-wall, secret-tatami, secret-table, secret-bed, secret-andon. All promoted, none deferred. Five lab specimens added (labs/interiors/js/specimens_b.js, tabs 11-15), loaded without console errors. Commit 88241ee on fable/v-interiors-b, ~345 changed lines plus 48 compare JPGs.

## Checks (real output)
- kit_check: All kit checks OK (292 passed)
- kit_contract_test --family interiors: 17 assets, 51 asset x tier builds, 1144 checks, 0 failed (needed: secret-table far collapsed to one vertex-colour mesh to meet 3 meshes / 2 materials; tea-interior buildMs 9/6 -> 14/9 in budgets.js, measured 10.8-12.1 / 6.2-7.3 ms under sibling load)
- interiors_test: 28 interiors checks passed. check_syntax: All 125 modules OK. verify: All checks passed. labs_check: All labs checks OK. kit_index --check: in sync. git diff --check fable/integration...HEAD: clean.
- footprint_golden (classic): EQUAL; --systems: EQUAL.
- footprint_golden --query ?swap=<six>:modular: DIFFERENT only by replaced/added meshes; counts identical to classic (518 colliders, 65 platforms, 25 anchors; systems 135 / 1 / 5, seam ok, 50 ids routed).
- Draws (game_shot render.calls, hour 12, all six swapped): secret house view 179 -> 175, courtyard view 32 -> 33 (first vertex-colour bag draw beside a classic frame; shared when tea-interior is swapped too). No new merged materials; secret-andon has 1 live mesh.

## L6
48 JPGs (6 ids x 6/12/18/22 x classic/modular) in docs/fable/status/v-interiors-b/, none byte-identical, max 108 KB. Read: secret-table 12, courtyard-gravel 12, courtyard-wall 12, secret-andon 22, secret-bed 12, secret-tatami 18 (classic). AAA-1: wall gets plinth, rails, battens and tiled coping; gravel rakes part round three ringed stones; table has stepped top, pads, a hollow kyusu and a platter; andon is a real lattice. Weakest: secret-bed is a flat red cushion at game scale (scaled zabuton), and tatami reads the same as classic. AAA-5: legible at cat height and 1-3 m, andon kindles at 18/22.

## Notes / concerns
- secret-table does not build the fish (secret-fish component, keepsakes). Footprint: no waivers.
- Handoff (inventory rows, adapters, part names, draw costs): docs/fable/handoff/v-interiors-b.md. specimens.js lines appended at the end to keep lab coverage anchors stable.
- Courtyard assets only matter with a classic/kit frame; tea-interior keeps its inline courtyard.

## Pre-review fixes (commit 72d9b71)
1. budgets.js reverted to integration (git diff fable/integration -- src/kit/budgets.js is empty). None of my six needs an exception.
2. secret-bed rebuilt as a futon: rounded shikibuton (indigo), folded cream kakebuton with a dyed fold edge, small makura with a band, a stitched seam; param `cloth` indigo/moss/plum; origin and placement (-1.8, 0.07, -0.8) unchanged, no anchor in classic either. New pairs 6/12/18/22 shot; Read 12 h: reads clearly as a futon, no cushion red.
Re-run (machine load averages 8.5-12 from sibling lanes, so warm-build timings are not valid):
- kit_contract_test --family interiors: 17 assets, 1144 checks, 1 failed: tea-interior [hero] warm build <= 9 ms, 10.8 ms (part a's asset, unchanged, load-dependent; left for the quiet-machine G-V3 gate). No failures on the six.
- footprint_golden: EQUAL; --systems: EQUAL. interiors_test: 28 passed. verify: All checks passed. kit_check 292 OK, labs_check OK, kit_index in sync, git diff --check clean.
