# v-shrine status
Model: Claude Sonnet 5.5. Base: fable/integration (merged through the alley PR). Family: src/kit/shrine, lab 06 (labs/shrine).

- [x] L1 status  - [x] L2-L3 family `shrine`: 7 assets  - [x] L4 gap: offering-box specimen `saisen-bako` (labs/shrine/js/recipes.js, appended at the end of SPECIMENS so the generated coverage links keep their line numbers)
- [x] L5 `node tools/kit_index.mjs` (src/kit/index.js regenerated)  - [x] L6 compare JPGs (docs/fable/status/v-shrine/, 52 files)  - [x] L7 checks  - [x] L8 self-review  - [x] L9 handoff  - [x] L10 push + PR

## Assets
| id | parts | tiers | notes |
|----|-------|-------|-------|
| torii | frame, kasagi, footing | hero/mid/far | myojin gate; kasagi and shimaki swept on ONE curve and solved on the leaning posts; nuki top 4.91 m and kasagi top 5.29 m equal the climbing platforms; params span, height, post_r, taper, lean, ext, sori, finish, paint, pegs (general, for s2-clearing) |
| shrine-hall | dan_low, dan_up, hall, shoji, trim, crest | hero/mid/far | stepped dan with a front step, dodai sill, corner posts, board-and-batten walls, door frame and mullions, red kohran on three sides, chigi and katsuogi. Roof, shimenawa, bell, box are components (not built here) |
| shimenawa | rope, shide | hero/mid/far | daikon-jime: three wound straw strands on a catenary, sagari tufts, Yoshida/Shirakawa/Ise shide; static (no sway, one merged draw) |
| shrine-bell | body, cord | hero/mid/far | lathe suzu with belt, slit, lug and striped hanging cord |
| offering-box | box | hero/mid/far | saisen-bako: slatted front, grating tilted to the front, rope strap, coins |
| mist-altar | plinth, bell, flame, ring | hero/mid/far | own transparent materials, because update() fades plinth/bell/flame (`_altarFadeMats`); `.` binds `mistAltar`; far has no ring and the bell shares the stone material (3 fade handles, 2 materials) |
| offering-bells | bell | hero/mid/far | lathe crotal, belt, slit, pea, red cord; ONE mesh per bell on a family-shared emissive bronze (classic: 3 meshes each); `.` keeps collectible userData |

Deferred: none. Materials: torii adds one new merged kit material (black lacquer); everything else reuses ctx.MAT (lacquer, stone, stoneDark, timberMedium, shoji, spiritualBellBronze) and the shared km.bag. Two private (not merged) materials: the mist-altar fade materials (required) and the offering-bell emissive bronze (shared, 1 material for the 5 bells). Live meshes: mist-altar 4 (3 at far), nothing else.

## Checks (real output)
- kit_check: All kit checks OK (104 passed)
- kit_contract_test --family shrine: 7 assets, 21 asset x tier builds, 605 checks, 0 failed; merge OK
- footprint_golden classic: EQUAL
- footprint_golden `?swap=<all 7>:modular`: DIFFERENT only in objects (26 added, aggregates/baked); counts line identical to classic: 518 colliders, 65 platforms, 5 water rects, 4 exclusions, 25 anchors; rng 49233 draws
- check_syntax: All 81 modules OK; verify: All checks passed; labs_check: All labs checks OK; git diff --check fable/integration...HEAD: clean
- perf_spots (high, shrine spot, 2 boots, classic vs all 7 swapped): draw calls 448 -> 447, triangles 7,039,188 -> 7,056,808 (+17.6k), frame ms 9.65 -> 9.50 (noise)
- Gameplay on modular (headless boot, real game, script outside the repo; same result on classic): ringBell found at the shrine and triggered (onBellRing fired, +10 XP); touchAltar found with mist weather, mist altar visible, opacity 1, `_altarFadeMats` all three live, touch sets mistAltarTouched; setShrineThicketOpen(1, 0.5, 0) on 19 bushes / 6 trees without error; offering bell 100 collected through checkCollectibles (4 left); no page errors or warnings.

## Judgement (AAA-1 / AAA-5)
- torii: AAA-1 better: stone kamebara and black nemaki sleeve at the feet, kusabi wedges, a swept kasagi sitting on the posts instead of box wings. AAA-5: reads at the sandō approach and at cat height, 6/12/18/22 h.
- shrine-hall: AAA-1 better: dodai sill closes the 15 cm gap under the classic wall, board-and-batten, door frame, red kohran, front step; at 22 h dark in both. AAA-5 ok.
- shimenawa/shrine-bell: shide, twisted rope, belt and slit read at 1-2 m; classic was a cylinder and a sphere. Shide do not sway (kept static for the draw budget; waiver of the lab animation).
- offering-box: slat gaps and coins read at cat height. offering-bells: glint kept (emissive), reads as a bell at 0.5 m. A first draft of the bells and suzu used lathe profiles in the wrong direction (inside-out); fixed before the final captures (profiles run bottom to top).
- mist-altar: smooth lathe plinth, moss and corner stones; at 22 h the only visible parts are the plinth and the ring, as classic (bell/flame hidden by foliage from the shot position).
- Waivers: shide static; torii far tier has no kamebara/sleeves/shimaki; mist-altar far shares one material between plinth and bell (never built at far in the valley: the altar is inside r 39).
- Note on captures: the offering bell at (4, 0.45, -18.5) sits against the tea house shoji, so its pair is framed at 0.6 m on that wall.
