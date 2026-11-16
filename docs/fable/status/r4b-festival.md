# r4b-festival status

Model: Claude Sonnet 5.5 | Started: 2026-11-15 | Base: e83f997 (fable/integration) | State: DONE_WITH_CONCERNS
Lane: Phase 5 Roof Road kit part b (family `src/kit/rooffestival/`): roof-distant-city, roof-sky, roof-hills, roof-okuribi, roof-atmosphere (all 5 promoted)

## Routing (ruling R76), commit "route sky, hills, fires and atmosphere through assets.build"
`Sky` and `RooftopAtmosphere` take `opts.assets`; `rooftops/js/game.js` builds the AssetRuntime (and awaits preload) before the Sky and passes it (two option lines + a moved block: the one non-granted file touched, needed because the Sky is constructed before the runtime existed). Classic builders unchanged (dome moved into `buildDome()` verbatim). Proof: scene digest (dome, hills, fire point clouds, clouds, atmosphere children) equal before/after at classic, `rooftop_golden` classic EQUAL, finale PNGs are not pixel-repeatable between two runs of the SAME code (wall-clock), so the digest is the evidence. `labs/asset_inventory.json` gained the `buildDome` source row (labs_coverage requires it); `labs/ASSET_COVERAGE.md` regenerated.

## Checks (uptime 1-min load 1.5 to 2.6)
- kit_check 517 OK; contract `--family rooffestival`: 12 assets, 36 builds, 697 checks, 0 failed (budget rows for roof-okuribi, roof-atmosphere, roof-distant-city with measured classic numbers)
- rooftop_golden classic EQUAL; swap of the 5 ids: only the city root child changes (+ none other); footprint_golden EQUAL; rooftop_test 38 passed / 2 failed (baseline pair); cadJS check 15/15 + 16/16; check_syntax 189; verify OK; labs_check OK
- `?auto=1` with all 5 swapped: s=1232.1749, y=4.5, cameraFailures 3 (= classic), no console errors
- `?finale=1` kindle curve identical on both sets at 3 s steps: `0.81,0.53,0,0,0 | 0.96,0.91,0.79,0.48,0 | 0.99,0.98,0.96,0.90,0.76 | 1.00,1.00,0.99,0.98,0.95 | 1.00x4,0.99`; fires lit in order
- Page draw calls (one render, shadows incl.), classic / swap of the 5: mouth 6 yama 789 / 788, mouth 7 hoko 617 / 616, finale 454 / 453

## Measured classic vs modular (meshes / tris / materials)
- sky (dome + clouds + moon): classic 15 / 960 / 15; modular hero 15 / 2,208 / 15, mid 8 / 960 / 8, far 3 / 360 / 3
- hills: classic 1 / 1,536 / 1; modular 1 / 4,608 / 1, mid 1,536, far 384
- okuribi: classic 10 / 0 / 10; modular 10 / 0 / 10 (hero adds embers in the same Points: 332/1057/302/332/305 points vs ~150/470 classic)
- distant city: classic 2 / 79,560 (7,956 instances) / 2; modular 1 / 10,276 / 1 hero, 2,240 mid, 228 far (one draw; far fits the 1k cap)
- atmosphere ambient part: classic 12 / ~16 / 5; modular hero 12 / 48 / 5, mid 8, far 6

## L6 (docs/fable/status/r4b-festival/*.jpg, 960x600, <= 59 KB; none byte-identical; the page has no free camera: game camera, cat at the piece)
Mouth pairs at s=833 (day 0.05, dusk 0.55, night 1) for sky, hills, city; atmosphere at the cherry boughs s=357 (day/dusk/night); finale pairs (30 s) for every id; okuribi finale at 8 s, 14 s, 30 s; sky finale at 8 s.
AAA-1 judgement, honest: okuribi is a modest gain (denser, crisper glyph beds, rising embers; same shape, order and curve). The finale camera never frames the hills or city closely, so hills/city/sky pairs differ only slightly (ridge noise, haze band, bigger stars); city is a better-sourced silhouette at 8x fewer triangles and one draw rather than a visible upgrade. Atmosphere: spinning petals and soft fireflies read better at night. Pass for okuribi/atmosphere, marginal for sky/hills/city.
