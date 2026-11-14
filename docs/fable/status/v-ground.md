# v-ground

- Worker / model:     Worker L, Claude Opus 5.5
- Claimed:            2026-11-13 22:26 PST
- Branch:             fable/v-ground
- Base commit:        5575aee (fable/integration)
- State:              ready for review
- Grant:              single writer of `src/kit/budgets.js` for this lane (BUDGET_EXCEPTIONS entry for the
                      whole-system valley ground). Pre-review grant (R47 pattern): `src/main.js` for the one
                      `bindWorld` loop of the handoff §1 (applied in-lane), with `labs/ASSET_COVERAGE.md` regenerated.
                      R52: the `kit-ground` material is accepted.

## Assets
| Inventory id | Promoted from (lab/specimen) | Parts | Tiers | Footprint | State |
|---|---|---|---|---|---|
| `valley-ground` | ground / height + hex + macro + weather (lab 01 `field.js`, `ground.js`, `glsl.js`, `paint.js`) | `terrain` | hero/mid/far | layout.footprint (empty) | promoted |
| `path` | ground / setts, pom, nobedan (paving painted into the field) | `road` | hero/mid/far | layout.footprint (`pathSamples` anchor) | promoted |
| `path-shoulders` | ground / height ("the shoulder is wherever G is in between": standing wear G0) | `shoulders` | hero/mid/far | layout.footprint (empty) | promoted |
| `path-slabs` | ground / slabs, tobi-ishi (`stones.js`) | `stones_light`, `stones_dark`, `stones_warm` | hero/mid/far | layout.footprint (empty) | promoted |

L3 choices: the lab's ONE ground (GroundField + the height-blended, hex-tiled material) rather than any one card; its
stage is a 16 x 12 m corner, so the field is re-authored for the valley (128 m, 4 texels/m: meadow, kawara pebbles and
moss at the river's waterline, damp bank, moss under the shrine's moss pillows). Road paving: **nobedan** by default
(cut and natural stones, the closest Kyoto paving to the classic "cobbles"; the lab's use note is "the formal path");
ishidatami setts and four more are the `paving` param. POM is extended to nobedan with a height-only `pavingH` (the
lab marched setts/slabs only). The shoulders are standing wear G0 + kicked gravel + a rut (lab decisions 5 and 6).
Tobi-ishi follow the lab's Rikyū-to-Enshū heights inside the classic slab sizes. No construction fix in
`labs/REVIEW_2026-11-10.md` concerns these (the ground lab's fix is the frontage eave, not promoted).

## Steps
- [x] L1 Claim
- [x] L2 Read (research.md, field.js, ground.js, glsl.js, paint.js, weather.js, stage.js, variants.js; countryside
      layoutGround/meshGroundClassic, layoutPathShoulders, layoutPath, layoutWalkwaySlabs; vegetation buildMeadow and
      grass.js BiomeMask; f2/f3 handoffs)
- [x] L3 Choose (above)
- [x] L4 Close gaps: none on the card (`paddy-bunds` is v-water's)
- [x] L5 Promote (`src/kit/ground/`: field, glsl, layers, material, valley, road, slabs, index)
- [x] L6 Compare (64 JPGs, `docs/fable/status/v-ground/`)
- [x] L7 Check
- [x] L8 Self-review
- [x] L9 Handoff (`docs/fable/handoff/v-ground.md`)
- [x] L10 PR

## What the modular ground does
- **Heights and walk heights unchanged.** The terrain runs the valley's own `terrainHeight` + river carve on a bare
  `Countryside.prototype` object; walk heights still come from `Countryside.groundAt` (never this mesh). Proof: the
  modular footprint digest of `Village Ground/asset:valley-ground/terrain` has the classic geometry record exactly
  (`v 22801, box [-130,-34.0837,-130,130,73.7006,130], c [0,4.7053,0], cov [...], i 135000`, string-equal).
- **One field, one material.** 8-channel GroundField (grass, moss, gravel, sand, paving, tataki, needles, wild; earth
  is the remainder), wear G / G0, wetness, snow, paving style, puddle relief. Shader: height blend (Mishkinis), hex
  tiling (Mikkelsen), six procedural Kyoto pavings, POM (hero), wear eats meadow/moss to compacted earth, Lagarde
  wetness, low-first puddles with rain rings (hero), snow cover, the komorebi warm fringe and cool shade (the lab's
  shadow-term capture). The classic vertex tint is kept on the meadow floor, so open meadow reads as before.
- **Road and shoulders are paint** when the ground is modular (one draw for all three); swapped alone they build
  ribbons at the classic heights on the same material over a small field of their own.
- **Weather from `update(env)`**: `env.wet` (rain amount) drives the lab's schedule (wet, wetSpec, water level),
  `env.snow` the snow cover, `env.mist` (when sent) a dew film; the sun from `env.hour` (Sky's sun path). A valley
  entered in rain starts wet.
- **Tiers** (`TIER_DEFINES`): hero all; mid drops POM, puddles and rain rings; far also the hex sampler (2-tap
  Quilez). Quality low never reaches the kit. `setTier` re-defines the live material.
- **Grass mask**: unchanged at build (systems golden EQUAL with the swap). Live wear (paws thin the meadow; lawns
  never) needs one main.js line (handoff §1); tested below.

## Checks run (command → real result)
- `node tools/kit_check.mjs` → `All kit checks OK (146 passed)`
- `node tools/kit_index.mjs --check` → `OK   src/kit/index.js in sync (10 families, tag 20261113a)`
- `node tools/kit_contract_test.mjs --family ground` → `4 assets, 12 asset×tier builds, 433 checks, 0 failed` ·
  `merge: OK — valley 237 calls; +48 kit meshes → 285; after _mergeInto → 240` · `PASS: kit contract` (before the
  budget entry: only valley-ground triangles 45,000 / 45,000 / 5,000 and far warm build 2.0-3.0 ms failed)
- `node tools/footprint_golden.mjs` → `footprint golden: EQUAL`
- `node tools/footprint_golden.mjs --systems` → `footprint golden: EQUAL`
- `node tools/footprint_golden.mjs --query "?swap=valley-ground:modular,path:modular,path-shoulders:modular,path-slabs:modular"`
  → `DIFFERENT (4 changed, 3 added, 0 removed)`: only the three replaced objects (`Village Ground`, `Earthen
  Shoulders`, `Cobbled Path` become groups with `asset:<id>/<part>` children) and `counts.objects 312 → 315`;
  `518 colliders · 65 platforms · 5 water rects · 4 exclusions · 25 anchors`, `rng valley 49233 draws (probe ok)`,
  no anchor diff (the `pathSamples` anchor is identical). No waiver needed.
- same query with `--systems` → `footprint golden: EQUAL` (the baked grass BiomeMask is byte-identical)
- `node tools/check_syntax.mjs` → `All 94 modules OK`; `node tools/verify.mjs` → `kit_test: tests 36, pass 36, fail 0`,
  `All checks passed`; `node tools/labs_check.mjs` → `All labs checks OK`; `node tools/cad_overrides_test.mjs` →
  `27 passed, 0 failed`; `node tools/catalog_check.mjs` → `OK Asset Library: … 126 active editable entries`;
  `node tools/summit_test.mjs` → `83 passed, 0 failed`; `node tools/rooftop_test.mjs` → `40 passed, 0 failed`;
  `git diff --check fable/integration...HEAD` → clean
- Full boots (`tools/headless.mjs /index.html`, autostart, playing + 5 s): `?assets=classic`, `?swap=<my 4 ids>`,
  `?assets=modular` → `warnings: []`, kit `problems: []`; the only error line is the pre-existing optional
  `/cad-overrides.json` 404, present on classic too.
- Determinism: two boots `game_shot --query "hour=12&cam=1.5,0.5,9,…&shot=1&swap=<ids>"` → `--diff` `maxDelta 0, pixelsOver8 0`.
- **After merging `origin/fable/integration` (31661bb; 83 commits, 21 families; `budgets.js` and the generated
  `index.js` resolved):** kit_check `All kit checks OK (361 passed)`, check_syntax `All 148 modules OK`, verify
  `kit_test 36/36`, `All checks passed`, labs_check OK; contract `--family ground` `433 checks, 0 failed`; goldens
  classic EQUAL, systems EQUAL, swap the same 4 changed / 3 added (518 colliders, rng 49233), systems swap EQUAL;
  boots `?assets=classic`, `?swap=<my ids>`, `?assets=modular` (235 kit instances): `warnings: []`, `problems: []`;
  `env.mist` (now sent by main.js) reaches the ground's dew film (a dusk-mist capture on `?assets=modular`).

### Draw calls (deterministic: frame 120 of `?shot=1`, `renderer.render(scene)` incl. shadow pass, perf-spot cameras)
| tier | street | shrine | river | meadow |
|---|---|---|---|---|
| high classic → modular | 418 → 416 | 130 → 128 | 319 → 317 | 400 → 398 |
| medium classic → modular | 417 → 415 | 130 → 128 | 316 → 314 | 399 → 397 |

Every spot, both tiers: **-2 draws, -302 triangles** (ground + ribbon + strip → one ground). R52 holds.

### perf_spots (Metal, boots 2 × rounds 3, interleaved, load average ~5-6; raw in `_scratch/v-ground/perf2.json`)
| set | tier | street frame / render ms | shrine | river | meadow |
|---|---|---|---|---|---|
| classic | high | 17.6 / 10.24 | 15.0 / 11.35 | 15.05 / 11.16 | 16.2 / 8.56 |
| modular | high | 18.5 / 9.45 | 14.6 / 9.43 | 15.7 / 8.67 | 16.0 / 9.49 |
| classic | medium | 12.2 / 5.30 | 10.33 / 5.54 | 11.4 / 6.02 | 11.8 / 6.17 |
| modular | medium | 13.8 / 6.01 | 13.1 / 5.75 | 13.83 / 5.73 | 11.4 / 5.44 |

Modular medium (11.4-13.8 ms) ≤ classic high (15.0-17.6 ms) at all four spots: the budget rule holds. Modular high is
within boot noise of classic high (±1 ms either way). perf_spots' amortised draw-call column moves ±40 between boots
of ONE set (villagers, koi, fireflies), so the deterministic table above is the draw-call evidence. A first run
(`perf1.json`) under heavy sibling load (load average 7-14, another lane's perf run on the GPU) read modular render
2-3x classic; an in-page A/B of the ground material against a plain one in the same boot (`cost_eval.js`) put the
ground's own cost at ~1-3 ms on high and ~0 on medium, and the shader was then trimmed (weather branches, edge noise
only where needed, 3 macro noises, 3-tap paving slopes) before `perf2`.

### Build time
- Contract (warm): valley-ground 2-3 ms (cached heights/field), path / shoulders / slabs within their budgets.
- In the game, first build: classic ground ~35-43 ms (repeat calls of `meshGroundClassic`, its textures cached);
  modular valley-ground 388 ms under sibling load, down from 575 before the speed pass (layers ~115 incl. the
  `groundTextures(6)` map the classic ground also generates, heights ~50, field ~30), shoulders 22 ms, road 2 ms.
  Net boot cost of the modular ground ~+0.3 s on the dev Mac. Exception `BUDGET_EXCEPTIONS['valley-ground']`
  (hero 45k / mid 45k + 5 ms / far 5k + 4 ms) carries these numbers in its `why`.

### Live wear (the handoff's main.js line, in a scratch eval: `_scratch/v-ground/wear_eval.js`)
`bindWorld({ grass, player, npcs })` → `true`; 60 laps along a meadow line and across the shrine's west lawn:
meadow texel wear 0.694 and mask meadow `255 → 0`; lawn texel wear 0.737 but lawn `g 255 → 255` (lawns stay); after
regrowth (T 60 s, 400 s): wear 0, mask meadow back to 255, `maskTexelsDifferentFromBaked: 0`, `live: null`.

## L6 compare (`docs/fable/status/v-ground/`, 960 × 600, all ≤ 150 KB, 0 of 32 pairs byte-identical)
`<id>-<low|mid>-<6|12|18|22>-<classic|modular>.jpg`; low = 0.35 m camera, mid = 2.4-2.6 m. Modular = all four ids
swapped. `path-slabs` is never built by the game, so its pairs build the catalog's walkway at runtime
(`Countryside.buildWalkwaySlabs` on the road curve, routed through `placeAsset`) before the shot.

## L8 self-review (AAA)
| | valley-ground | path | path-shoulders | path-slabs |
|---|---|---|---|---|
| AAA-1 cat-eye | yes: meadow floor as classic but hex-tiled; pebbled, damp river bank where classic was flat green | yes: stones with relief, joints, per-stone colour (POM at hero); classic was a flat texture ribbon | partly: a worn, gravelled verge instead of an alpha stripe; subtle at 0.35 m behind blades | yes: rounded, bedded stones with an arris instead of boxes |
| AAA-2 bearing | contract: grounded | grounded (empty anchor; ribbon at 0.02 m standalone) | grounded | stones bedded 4 cm |
| AAA-3 parts | `terrain` | `road` | `shoulders` | `stones_*` |
| AAA-4 tiers | hero/mid/far; mid = no POM/puddles; same vertices hero/mid, so no pop | same field | same field | 12/6/4-sided |
| AAA-5 world | dawn/noon/dusk/night, rain (wet, sheen, puddles in ruts and joints), snow, dew from mist | yes (lantern light picks out stone relief at night) | yes (ruts hold rain) | shared stone materials (wet/snow via KitMaterials) |
| AAA-6 footprint | counts EQUAL, no waiver | `pathSamples` anchor identical | empty, as classic | empty, as classic |
| AAA-7 budget | exception (whole system) | in budget | in budget | in budget (14k / 5k / 0.6k tris) |
| AAA-8 deterministic | contract hash; two boots maxDelta 0 | yes | yes | yes |
| AAA-9 editable | 5 params (1 `visual: false`); dispose frees material + 4 field textures | 3 params | 3 params | 3 params |
| AAA-10 catalogued | handoff §4 (production rows) | idem | idem | idem |

Honest notes: at 2-3 m the noon road reads paler and cleaner than the classic's warm cobble texture (painterly but a
little "new"); the cool shade tint was lowered to 0.35 for that reason. The shoulders are the weakest visual change:
the grass mask still grows blades over most of the verge (by design: the baked mask must not change), so the worn
earth shows mainly at cat height and in rain.

## Deferred assets and why
None of the four ids. Not promoted from the lab (handoff §8): GPU paw prints and rake/broom grooves (need a renderer
pass with `autoClear = false`; ctx has no renderer; field wear is the paw trace instead), eave dry rects / amaochi
(the houses are built after the ground), walkers / litter / raking (lab interactions).

## Footprint waivers requested
None.

## Notes for the Integrator
- Apply handoff §1 (one guarded loop in main.js) to turn on live wear; everything else works without it.
- One new material (R52): `kit-ground`, net **-2 draws** at every spot (table above).
- `src/kit/budgets.js`: `BUDGET_EXCEPTIONS['valley-ground']` added in-lane (grant).
- PR size: ~2,000 added lines in `src/kit/ground/` (≈ 900 of them the lab's shader, field and painter ported) plus
  64 small JPGs; over the ~1,500-line guide, but one system that does not split cleanly (the four ids share the field
  and material).

## Pre-review: bindWorld (main.js applied in-lane; R52 accepted)
- `src/main.js`: the handoff §1 loop after the `grassContext` line (7 lines); `labs/ASSET_COVERAGE.md` regenerated
  (`node tools/labs_coverage.mjs --write` → `Active coverage: direct=137, …`; only `src/main.js` line anchors moved).
- Classic-neutral: `node tools/footprint_golden.mjs` → `footprint golden: EQUAL`; `--systems` → `footprint golden: EQUAL`;
  boot `?assets=classic` → `{"kit":0,"problems":[],"ground":0}`, `warnings: []` (only the pre-existing cad-overrides 404).
- Modular boot `?assets=modular` → `{"kit":235,"problems":[],"ground":1}`, `warnings: []`.
- Wear test with main.js doing the binding (no manual `bindWorld` call; `_scratch/v-ground/wear_eval_main.js`):
  `{"mid":{"lawnWear":0.737,"wear":0.694,"maskR":0,"bakedR":255,"lawnG":255,"lawnBakedG":255},"after":{"wear":0,"maskR":255,"bakedR":255,"live":null},"maskTexelsDifferentFromBaked":0}`
  → meadow thins (255 → 0) where the cat wore it, the lawn stays (g 255), and it heals back to the baked mask exactly.
- Also: check_syntax `All 148 modules OK`; verify `kit_test 36/36`, `All checks passed`; kit_check `361 passed`;
  labs_check `All labs checks OK`; `node --test tools/labs_coverage_test.mjs` → `pass 11, fail 0`; `git diff --check` clean.
- Re-merged `origin/fable/integration` (ce8e332, v-sky; `src/main.js` auto-merged, `src/kit/index.js` regenerated,
  22 families) and re-ran: kit_check `373 passed`, check_syntax `All 153 modules OK`, verify `All checks passed`,
  labs_check OK, goldens classic / `--systems` EQUAL, swap golden the same 3 replaced objects, `--systems` swap EQUAL,
  boots `?assets=classic` `{"kit":0,"problems":[],"ground":0}` and `?assets=modular` `{"kit":238,"problems":[],"ground":1}`
  with `warnings: []`, the main.js wear test identical to the line above.
- Contract under sibling load (load average 7-9): valley-ground hero warm build read 7.1 ms once and path-slabs hero
  6.1-6.7 ms twice. Fixes: the valley-ground exception's warm allowance is now hero 10 / mid 8 / far 6 ms (2-3 ms quiet;
  the warm build copies a 262k-texel field), and the slabs cache their superellipse outlines per segment count (no
  exception). Then three runs of `--family ground` → `433 checks, 0 failed` each.
