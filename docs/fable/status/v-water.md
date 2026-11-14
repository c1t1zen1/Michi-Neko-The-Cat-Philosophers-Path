# v-water

- Worker / model:     Claude Opus 5.5 (claude-opus-5-5), Worker J
- Claimed:            2026-11-13 22:20 PST
- Branch:             fable/v-water
- Base commit:        a964169 (fable/integration)
- State:              ready for review

Family `src/kit/water/`, lab 02 (`labs/water/`). System lane, wave 2.3.
Integrator grant (first commit): no system module (everything routes through `Countryside.placeAsset`);
`src/kit/budgets.js` granted in-lane for BUDGET_EXCEPTIONS; `src/kit/index.js` regenerated with
`node tools/kit_index.mjs`. No ripple-pool or wade hook in `countryside.js` / `player.js` was needed.

## Assets
| Inventory id | Promoted from (lab/specimen) | Parts | Tiers | Footprint | State |
|---|---|---|---|---|---|
| river | water/kyoto (+ field.js CPU water field) | water | hero/mid/far | layout | promoted |
| bridge | water/b-sanjo | deck, frame, koran_e, koran_w, giboshi, abutment_n, abutment_s; sockets post_e_1…7, post_w_1…7, shoki | hero/mid/far | layout | promoted |
| paddies | water/p-taue, p-mirror, p-summer, p-autumn, p-winter | water_1…water_4 | hero/mid/far | layout | promoted |
| paddy-bunds | water/p-aze (NEW, L4) | bed, ridges, weir | hero/mid/far | layout | promoted |
| rice | water/p-taue (+ summer/autumn/winter hills) | stalks | hero/mid/far | layout | promoted |
| water-ripples | water/ripple (+ effects.js rings) | ring_1…ring_24 | hero/mid/far (shared) | layout | promoted |

## L3 choices
- **Water style: `kyoto`** ("The lab's river", the lab's own recommendation and the only style that joins flow,
  depth, foam and light). Flow-mapped normals (Vlachos two-phase + per-pixel phase noise) in river space so ripples
  follow the bends; Beer-Lambert depth from the game's real carved bed; foam on the shallows and round the pier posts
  (potential flow, eddy, pillow); Fresnel sky; sun glitter; moon glints; caustic dapple; the classic's sparkle cells
  now drifting with the current. Not promoted: the half-res planar mirror (re-renders the scene; the analytic sky is
  the lab's own default), replaced by a forest-wall reflection for low rays, and the Kuwahara pass (post, v-sky).
- **Bridge: `b-sanjo`** (the lab's recommendation for the valley bridge, and the Roof Road spec's "Sanjō Ōhashi"):
  plank deck on keta, two pier bents in the river, ishigaki abutments with wing walls, a wayō kōran (jifuku, the seven
  posts, hirageta, tozuka on masu, hokogi) and bronze giboshi on the four oyabashira. Deck 1.08, rails 1.66 ± 0.21
  (flat-topped hokogi), ramp treads exactly on the sloped platforms, the seven posts at the classic z, the channel
  under the deck (|x| < 0.9) and the River-Spirit Charm left clear.
- **Paddies through the seasons**: one `season` param (spring mizukagami / early taue (default, nearest the classic) /
  summer / autumn puddles / winter ice) on paddies and rice; a snowfall (`env.snow`) ices the sheets in any season.
- **Rice**: hills on the transplanting grid (rows 0.48 m, hills 0.32 m at hero), blades per season, honami sway.
  The rice layout carries stalks, not plots: plots are recovered by clustering the stalks (`plotsFromStalks`).
- **Ripples**: a crest + echo ring sprite; the kit pool registers its rings and the kit river and paddies bend
  their normals under every visible ring (classic rings are not looked up).

## Steps
- [x] L1 Claim
- [x] L2 Read (guide §3/§5/§9/App. D, f2/f3 handoffs, lab research.md, variants, field/water/glsl/bridges/paddies)
- [x] L3 Choose (above)
- [x] L4 Close gaps: `paddy-bunds` → new specimen `water/p-aze` (`labs/water/js/bunds.js`, card + stage); research note
      appended. Order note: the kit code was drafted first; the specimen was added before any compare of the bund look,
      and the kit's `buildBunds` is the specimen's algorithm.
- [x] L5 Promote (src/kit/water: index, river, field, sky, textures, bridge, parts, paddies, ripples)
- [x] L6 Compare: 48 pairs (6 ids × 6/12/18/22 h) + rain (river) and snow (paddies) pairs in `docs/fable/status/v-water/`
- [x] L7 Check (below)
- [x] L8 Self-review (below)
- [x] L9 Handoff `docs/fable/handoff/v-water.md`
- [x] L10 PR

## Checks run (command → real result)
- `node tools/kit_index.mjs` → wrote src/kit/index.js (10 families … water, tag 20261113a)
- `node tools/kit_check.mjs` → All kit checks OK (150 passed)
- `node tools/kit_contract_test.mjs --family water` → 6 assets, 18 asset×tier builds, 562 checks, 0 failed; self-test OK; PASS
  - triangles hero/mid/far: river 1,920 / 480 / 120; bridge 3,612 / 1,880 / 156; paddies 8 / 8 / 8; paddy-bunds 1,854 / 546 / 42;
    rice 12,180 / 5,172 / 916; water-ripples 0 visible (24 hidden rings). Warm build ≤ 2.6 ms (bridge hero).
- `node tools/kit_contract_test.mjs` (all families) → 3062 checks, 1–2 failed, none in `water`: `distant-pagoda [hero] warm
  build` 6.4–9.0 ms and once `bamboo-fence [mid]` 3.3 ms, at load average 7–9 (other lanes running); `--family pagoda` alone
  also fails (6.6 ms). Timing under load in files this lane does not touch.
- `node tools/footprint_golden.mjs` → footprint golden: EQUAL
- `node tools/footprint_golden.mjs --systems` → EQUAL (byte-identical)
- `node tools/footprint_golden.mjs --query "?assets=classic&swap=river:modular,bridge:modular,paddies:modular,paddy-bunds:modular,rice:modular,water-ripples:modular"`
  → DIFFERENT only in objects/baked meshes; counts 518 colliders · 65 platforms · 5 water rects · 4 exclusions · 25 anchors
  (= classic), rng valley 49233 draws (= classic)
- Water probe (headless, both sets): 112,623 `isInWater(x, z, y)` samples (3 heights), `wadeDepthAt`, `shoreDistance` and the
  walkable height at 41 × 171 points over the bridge → hash `d89ce039` on BOTH sets; waterRects, 61 riverSamples, 24 ripples,
  28 rainRipples, 65 platforms, deck clearance, riverMat, 4 paddyWaterMaterials identical
- `tools/place_asset_test.html?per=1` → PASS (162 placements, 479/479 colliders, 67/67 ids)
- `node tools/check_syntax.mjs` → All 95 modules OK; `node tools/verify.mjs` → All checks passed;
  `node --test tools/kit_test.mjs` → 36 pass, 0 fail; `node tools/labs_check.mjs` → All labs checks OK;
  `node tools/rooftop_test.mjs` → 40 passed, 0 failed; `git diff --check fable/integration...HEAD` → clean
- Full boots (`/index.html` + session autostart, as `__boot.html` does; `__boot.html` itself drops the query string):
  `?assets=classic` → set classic, 0 instances; `?assets=modular` → 78 instances, 0 problems;
  `?assets=classic&swap=<six ids>` → 9 instances, 0 problems. Console on all three: only the pre-existing 404
  `/cad-overrides.json` (also on classic); no warnings.

### Performance (river spot)
Deterministic counts (scene render at a fixed capture frame, camera 10,2.2,26.5 → −1,0.5,30.5, 30 frames):

| hour | tier | classic calls | swap calls | classic triangles | swap triangles |
|---|---|---|---|---|---|
| 12 | high | 311–313 | 311–313 | 3,893,150 | 3,913,430 (+20,280) |
| 12 | medium | 308–310 | 308–310 | 3,305,586 | 3,310,654 (+5,068) |
| 6 | high | 316–318 | 316–318 | 3,893,085 | 3,913,365 (+20,280) |
| 6 | medium | 313–315 | 313–315 | 3,305,521 | 3,310,589 (+5,068) |

Draw calls unchanged: the bridge and bunds sit on MAT materials and `KIT_SHARED.matte`; the classic `MAT.ridge` bake goes, the
`matte` bake comes; the water surfaces keep the classic's one-for-one draws (river 1, sheets 4, rice 1, rings while visible).
New merged materials: 0. The triangle delta is the rice hills (12.2k vs 2.6k), the river ribbon (1.9k vs 120) and the bridge.

`node tools/perf_spots.mjs --tiers high,medium --spots river --hour 12|6 --boots 2 --rounds 2 --url-suffix "" --url-suffix "?assets=classic&swap=<six>"`
(load average 7–9 during the runs; per-boot values; frame = amortised ms, calls/triangles = per-frame mean):

| run | set | tier | frame ms | render-only ms | calls | triangles |
|---|---|---|---|---|---|---|
| noon | classic | high | 21.30 / 18.75 | 6.57 / 7.47 | 573 / 638 | 6.79 M / 6.84 M |
| noon | classic | medium | 12.17 / 12.85 | 4.50 / 4.31 | 479 / 431 | 5.04 M / 5.04 M |
| noon | swap | high | 14.20 / 17.80 | 7.59 / 7.12 | 650 / 602 | 6.87 M / 6.87 M |
| noon | swap | medium | 12.90 / 12.35 | 5.54 / 5.01 | 444 / 458 | 5.05 M / 5.05 M |
| dawn | classic | high | 16.85 / 15.20 | 7.95 / 8.79 | 640 / 665 | 6.94 M / 6.94 M |
| dawn | classic | medium | 11.90 / 13.90 | 4.88 / 5.21 | 516 / 479 | 5.09 M / 5.09 M |
| dawn | swap | high | 18.90 / 20.60 | 8.72 / 7.77 | 674 / 663 | 6.98 M / 6.97 M |
| dawn | swap | medium | 14.40 / 12.43 | 5.95 / 7.03 | 443 / 480 | 5.09 M / 5.10 M |

Budget rule "modular medium ≤ classic high": frame 12.35–14.40 ≤ 15.20–21.30, calls 443–480 ≤ 573–665, triangles 5.05–5.10 M
≤ 6.79–6.94 M: holds at dawn and noon. Boot-to-boot noise in calls (±65) is larger than any kit effect, hence the deterministic
table above. Medium render-only rises ~0.5–1.8 ms against classic medium: the kit water fragment shaders are heavier than the
classic sine shader (an estimate on a loaded machine).

## L8 self-review (AAA)
| | river | bridge | paddies | paddy-bunds | rice | water-ripples |
|---|---|---|---|---|---|---|
| AAA-1 cat-eye | ✓ depth, koi through clear water, ripples follow the bend | ✓ posts, rails, planks, piers, giboshi; no box deck | ✓ mirror + seedling shade | ✓ rounded aze, no box ridge | ✓ hills in rows, not cones | ✓ crest + echo; the water bends under rings only when `river`/`paddies` AND `water-ripples` are both modular |
| AAA-2 bearing | ✓ contract | ✓ piers into the bed, kōran on deck, caps on posts; walk volumes clear (fix round 1 probe) | ✓ | ✓ | ✓ | n/a (declared floating on the water) |
| AAA-3 parts | ✓ | ✓ + Roof Road sockets | ✓ bound | ✓ | ✓ | ✓ bound |
| AAA-4 tiers | ✓ chosen at build (TIER_POLICY); mid looked at on medium (bridge, rice) | ✓ | ✓ | ✓ | ✓ | shared (R9) |
| AAA-5 world | ✓ sun/sky from the kit env (Sky public API) every frame: dawn mist, gold dusk glitter, moon at night; rain pocking (env.wet; the visible rain rings stay the rain-ripples pool's, no doubling) | MAT timber (lit, fog, shadows) | ✓ warm dusk mirror; snow → ice | snow on crests (kit P_SNOW) | Lambert lit/fog/shadow; honami wind | rings unlit like the classic |
| AAA-6 footprint | ✓ layout's; probe hash equal | ✓ platforms/clearances equal; walkable surfaces exact | ✓ | ✓ (empty) | ✓ (empty) | ✓ |
| AAA-7 budget | ✓ | ✓ (also within the structure class 12k/3k/600) | ✓ via exception (bound sheets) | ✓ | ✓ | ✓ via exception (bound materials) |
| AAA-8 deterministic | ✓ | ✓ ctx.rng | ✓ | ✓ ctx.rng | ✓ ctx.rng | ✓ |
| AAA-9 editable | ✓ 7 params* | ✓ giboshi, plank_gap | ✓ season, still, film* | ✓ mizuguchi | ✓ season, height | ✓ color |
| AAA-10 catalogued | handoff (inventory rows + production adapter) | ″ | ″ | ″ (p-aze specimen) | ″ | ″ |

\* Shader-uniform params (river clarity/flow/foam/rough/paint/colours; paddies still/film) reach the build through the
material uniforms and the field; the contract hash sees them because the material name carries the values (the hash reads
names, not uniforms). Said here so nobody mistakes it for a geometry change.

AAA-1/AAA-5 judgement from the pairs (Read: river 6/12/18/22, bridge 12/18, paddies 12/18, bunds 12, rice 12, ripples 12/22,
rain, snow; medium-quality bridge and rice): the modular river reads as water with depth (teal shallows, deeper blue
mid-stream, koi visible), dusk lays a golden glitter road under the bridge, the classic's pale silver sheet is gone; the
bridge reads as a timber kōran bridge standing on piers instead of a box; rice reads as transplanted rows. Honest differences:
at grazing angles the kit water is darker than the classic (it reflects the treeline, not the sky); in rain it follows the
darker palette; the aze banks are grassy green where the classic ridges are dark brown boxes; the kit water does not receive
shadows (neither does the classic).

## Deferred assets and why
None of the six. Not promoted from the lab (by choice): the planar mirror, the Kuwahara/painterly post, kame-ishi stepping
stones, the other seven bridges, frogs, the hasakake rack, floating lanterns, petal rafts (river-petals is v-weather's).

## Footprint waivers requested
None (every asset's footprint is `layout.footprint`; the contract's R12 checks pass without waivers).

## Notes for the Integrator
- See `docs/fable/handoff/v-water.md`: inventory coverage rows (paddy-bunds → `water/p-aze` direct), production adapter,
  part names and Roof Road sockets, the two BUDGET_EXCEPTIONS, an optional `assetEnv()` patch (sun + palette in env).
- The kit water reads the sun and sky colours from env (`Game.assetEnv()`, Sky public API; pre-review change below); the hour-based palette is only the fallback.
- Size: 2,043 added lines in src/ and labs/ (17 files; the kit family is ~1,800 of them) plus 52 JPGs, above the ~1,500-line guide; kept as one PR because the six assets share the water state (sky, rings, field) and split badly.

## Pre-review: env colours
Integrator ruling (R47 pattern): `src/main.js` granted in-lane. Merged `origin/fable/integration` first (51d597b;
conflicts: `src/kit/budgets.js` kept both sides' exception rows, `src/kit/index.js` regenerated, 20 families).

- `Game.assetEnv()` now sets `env.sunDir` (Vector3 copy of `sky.sunDir`) and `env.palette` = { sun, horizon, top, warm }
  (Color copies of `sky.resolvePalette()`): the Sky's public API, the values Countryside.update() gives the classic river.
- `src/kit/water/sky.js`: the Sky-dome uniform lookup and the scene walk are removed. The water reads env only; the
  hour-based palette is the fallback when env lacks them. The ripple rings and the bridge's pier posts are now
  registered by the kit `water-ripples` and `bridge` instances on the family's shared state (`registerRings`,
  `registerObstacles`, removed on dispose) instead of being found by name in the scene.
- `src/kit/runtime.js` untouched (its default env is only for calls without one; the fallback covers it).
- `labs/ASSET_COVERAGE.md` regenerated (`node tools/labs_coverage.mjs --write`: three `src/main.js` line links moved).

Checks (real output):
- `node tools/footprint_golden.mjs` → footprint golden: EQUAL; `--systems` → footprint golden: EQUAL
- `node tools/kit_contract_test.mjs --family water` → 6 assets, 18 asset×tier builds, 562 checks, 0 failed; PASS: kit contract
- `node tools/kit_check.mjs` → All kit checks OK (345 passed); `node tools/verify.mjs` → All checks passed;
  `node --test tools/kit_test.mjs` → pass 36, fail 0; `node tools/labs_check.mjs` → All labs checks OK;
  `node tools/check_syntax.mjs` → All 145 modules OK
- Boots (`/index.html` + autostart): classic → set classic, 0 instances, errors only the pre-existing `/cad-overrides.json`
  404, no warnings, env keys hour…audio, sunDir, palette; six-id swap → 9 instances, 0 problems, river field obstacles 4,
  river `uSky` [1, 0.672, 0.352] = `sky.resolvePalette().horizon` [1, 0.672, 0.352]; `?assets=modular` → 235 instances,
  0 problems, obstacles 4. Ring feedback: after `spawnRipple(2.2, 31.2, 1.4)` the river's `uRip` holds [2.2, 31.2, 1.64, 0.64].
- Look unchanged: re-shot `river` pairs at 6/12/18/22 (classic and modular, same cameras) are byte-identical (`cmp`) to the
  committed L6 pairs (8/8 "same"): classic is neutral and the env values equal the ones the dome gave. Read the four
  modular frames: dawn mist, noon teal with koi, dusk gold glitter under the bridge, night blue: as before.

## Fix round 1 (review r1)
Merged `origin/fable/integration` first (f16ed98; `src/kit/index.js` regenerated, 21 families).

Important 1 (oyabashira in the rail line) and Important 2 (wing walls beside the ramps), `src/kit/water/bridge.js`:
- The rails (jifuku, hirageta, hokogi) now end at z ±4.2, where the walkable rail ends. The four oyabashira stand
  outboard at the corners: centre |x| 1.66, z ±4.2 (0.17 m post, |x| 1.575–1.745: 0.125 m clear of the rail band
  1.03–1.45), on stone footings of kerb height (0.18 m). Giboshi caps unchanged; the r6 sockets are unchanged.
- The stone wing-wall wedges are gone. The retaining stone under each ramp is a skirt inside the ramp band
  (|x| 1.16–1.30) and below the tread (top = tread − 0.07); beside each ramp only a kerb rises (|x| 1.30–1.46,
  0.20 m, the classic's kerbs were 0.22 m). The abutment end walls are cut to the ramp band (|x| ≤ 1.30).
- Found by the probe and fixed: the last ramp tread spanned the platform's kink (the slope reaches 0.03 m at
  o = 2.528 m, then flat) and stood up to 2 cm above the platform there; the treads now follow the slope to the kink
  and a flat tread to 2.6 m.
- Minor 1: the pier posts moved under the deck edges (x ±1.2, |x| 1.09–1.31); the nuki tie widened to 2.5 m.

Walk-volume probe (the kit bridge built through its `build()` at each tier, every triangle tested with
`Box3.intersectsTriangle` against walk volumes shrunk 5 mm so a flush face is not counted; raycasts every 1 cm down
each ramp at x −1.2 / 0 / 1.2 for the highest surface above the platform). Script:
`/Users/c1t1zen/Documents/GitHub/michi-wt/_scratch/v-water/walk_probe.js`, run as
`node tools/headless.mjs "/tools/kit_contract_test.html?family=none&selftest=0&merge=0" --wait "window.__contractResults" --eval "$(cat walk_probe.js)"`.
Volumes: rails |x| 1.03–1.45, z ±4.45 (0.25 m past the ends), y 1.67–2.01; deck |x| ≤ 1.16, z ±4.2, y 1.09–1.43;
ramps |x| ≤ 1.3, 1.2 cm to 0.35 m above the tread; bank beside each ramp |x| 1.30–2.20, z 4.2–7.0, y 0.23–0.60;
swim channel |x| ≤ 1.05, z ±4.2, y −0.30–0.42.

| volume | before (8a10f1b, hero) | after (hero) | after (mid) | after (far) |
|---|---|---|---|---|
| rail W / E | koran_w, giboshi / koran_e, giboshi | clear / clear | clear / clear | clear / clear |
| deck | clear | clear | clear | clear |
| ramp N / S | koran_e, koran_w / koran_e, koran_w | clear / clear | clear / clear | clear / clear |
| bank beside ramps NW/NE/SW/SE | koran + abutment (stone x 0.78–1.54, z 4.2–6.95, y −0.05–1.80) | only the corner posts: x ±1.575–1.745, z ±4.115–4.285, y 0.18–1.80 | the same posts | clear |
| swim channel | frame (pier posts at x ±1.0) | clear | clear | clear |
| ramp surface max above the platform | 0.611 m (posts and rails over the ramp) | 0.0000 m | 0.0000 m | 0.0033 m |

The only solids left beside the ramps are the four 0.17 m corner posts, outboard as the review directs (no colliders,
footprint unchanged).

Minors:
- 2: the AAA row now states the ring coupling (`river`/`paddies` AND `water-ripples` modular); handoff asks for it in
  the swap matrix. Rain: no doubling — the visible rain rings stay the rain-ripples pool's; the kit water's rain is now
  a fine, faint pocking (smaller cells, radius 0.3 → no crest), documented for v-weather.
- 3: grazing sheen lifted: low reflected rays blend from forest to sky between R.y 0.035–0.32 (was 0.08–0.45, sky
  × 0.82), and the shallows keep a body-opacity floor of 0.36. New along-stream cat-height pair `river-along` (cam below).
- 4: cameras recorded (below).
- 5: the gameplay probe's exact command is recorded (below).
- 6: shared `sunDirAt` and rice plots in the layout requested in the handoff (optional).
- 7: `waterSky` / `WaterSky` renamed `waterShared` / `WaterShared` (it holds light, rings and obstacles).
- 8: the river re-lays its pier obstacles whenever the registry changes (version + placed count), not once.
- 9: ring positions via `getWorldPosition()`.
- 10: rice plot clustering: kept, limit and optional layout patch in the handoff.
- 11: `floating` lists 24 rings (was 64); the handoff counts 21 families.

L6 cameras (`?cam=px,py,pz,tx,ty,tz,fov`, with `hour=<6|12|18|22>&nohud=1&shot=1&assets=classic` or
`&swap=river:modular,bridge:modular,paddies:modular,paddy-bunds:modular,rice:modular,water-ripples:modular`,
`node tools/game_shot.mjs --size 960x600`):
river `5.5,0.45,27,-2,0.15,30.8,55`; river-along `21,0.42,27.4,8,0.05,31.9,55`; bridge `4,2.4,27.8,-1,0.9,31,55`;
paddies `21.5,1.8,29.3,15,0,23,55`; paddy-bunds `7.4,0.5,28.2,11,0.1,25.5,55`; rice `21,0.55,24,14,0.1,21.5,55`;
water-ripples `5.5,1.6,27.6,1.5,0,31,55` through `tools/headless.mjs` with `--session catwalk_autostart=new` and an
`--eval` that calls `game.city.spawnRipple(2.2,31.2,1.4)`, `(3.6,30.5,1.0)`, `(1.0,30.0,0.7)` before the shot;
river-rain / paddies-snow at 12 h with `&weather=rain` / `&weather=snow` (river-rain cam `10,2.5,29,2,0.1,31.5,55`).
All modular frames re-shot after this round (60 JPGs, ≤ 111 KB, no pair byte-identical); classic frames unchanged.
Read: bridge 6/12/18/22 (rails end at the deck end, corner posts outboard, no wedges, piers under the deck edges),
river-along 12 (classic vs modular) and 18, river 12, river-rain 12 (faint pocking only).

Gameplay probe command (both sets give hash `d89ce039`):
```
node tools/headless.mjs "/index.html?hour=12&nohud=1&shot=1&<SET>" --session catwalk_autostart=new --wait "window.game && window.game.capture && window.game.capture.frame > 30" --timeout 200 --eval "(() => { const c = window.game.city; let h = 0x811c9dc5, n = 0, wet = 0; const mix = (v) => { const s = String(v); for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 0x01000193); } }; for (let x = -40; x <= 40; x += 0.37) for (let z = -10; z <= 40; z += 0.29) for (const y of [0, 0.5, 1.2]) { const w = c.isInWater(x, z, y); mix(w ? 1 : 0); if (w) wet++; n++; } for (let x = -40; x <= 40; x += 0.5) for (let z = 20; z <= 40; z += 0.5) { mix(c.wadeDepthAt(x, z).toFixed(6)); mix(c.shoreDistance(x, z).toFixed(6)); } let ph = 0; for (let x = -3; x <= 1; x += 0.1) for (let z = 22; z <= 39; z += 0.1) { let best = -1; for (const p of c.platforms) { const y = p.getHeightAt ? p.getHeightAt(x, z, 0) : (p.isBox3 && x >= p.min.x && x <= p.max.x && z >= p.min.z && z <= p.max.z ? p.max.y : null); if (y != null && y > best) best = y; } mix(best.toFixed(5)); } return { hash: (h >>> 0).toString(16), samples: n, wet }; })()"
```
(`<SET>` = `assets=classic` or `assets=classic&swap=<six ids>`.)

Checks (real output, after this round):
- `node tools/kit_contract_test.mjs --family water` → 6 assets, 18 asset×tier builds, 562 checks, 0 failed; PASS: kit contract
- `node tools/footprint_golden.mjs` → footprint golden: EQUAL; `--systems` → footprint golden: EQUAL
- `node tools/footprint_golden.mjs --query "?assets=classic&swap=<six ids>"` → DIFFERENT in objects/bakes only; counts
  518 colliders · 65 platforms · 5 water rects · 4 exclusions · 25 anchors; rng valley 49233 draws (= classic)
- Gameplay probe → `{"hash":"d89ce039","samples":112623,"wet":27921,…,"platforms":65,…}` on both sets
- `node tools/verify.mjs` → All checks passed; `node tools/kit_check.mjs` → All kit checks OK (367 passed);
  `node --test tools/kit_test.mjs` → pass 36, fail 0; `node tools/labs_check.mjs` → All labs checks OK;
  `node tools/rooftop_test.mjs` → 40 passed, 0 failed; `node tools/check_syntax.mjs` → All 149 modules OK;
  `git diff --check origin/fable/integration...HEAD` → clean
- Boots: classic → 0 instances, 0 problems; six-id swap → 9 instances, 0 problems, river field obstacles at
  (s, u) (57.83, −3.10) (60.26, −3.27) (58.14, 0.89) (60.52, 0.72); `?assets=modular` → 241 instances, 0 problems.
  Console on all three: only the pre-existing `/cad-overrides.json` 404, no warnings.

