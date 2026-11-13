# Phase 0 performance baseline (P0.3)

**This is not a phone or low-end benchmark.** Every number here comes from
one development Mac (Apple M5 Max) in headless Chromium at 1200 × 750. It
says how the classic asset set costs on this machine, and it is the yardstick
that the modular set is compared against on the same machine. No real-device
benchmark exists yet (`AGENTS.md`, open items V1.1/V1.3).

Lane `p0-browser`, run 2026-11-13 on `fable/integration` = `main` @ `ed9f5b9`,
classic asset set (the only one that exists today).

## Machine, browser, GPU backend

| | |
|---|---|
| Machine | `Mac17,7`, Apple M5 Max, 18 cores, 128 GB, macOS 26.6.2 |
| Browser | Chromium 153.0.8010.12, Playwright 1.63.0 headless shell |
| GPU backend | `ANGLE (Apple, ANGLE Metal Renderer: Apple M5 Max, Unspecified Version)` (`--use-angle=metal`) |
| Viewport | 1200 × 750 CSS px, device scale 1, so every tier's pixel-ratio cap resolves to 1.0 |
| Load | Other Fable lanes were running browsers and builds on the same machine at the same time. The spread columns include that noise |

## How to re-measure

```sh
export PLAYWRIGHT_MODULE=/path/to/node_modules/playwright
node tools/perf_spots.mjs --out perf.json                        # 3 tiers × 4 spots × 3 boots, ~13 min
node tools/perf_spots.mjs --url-suffix "?assets=modular" --out modular.json
node tools/perf_spots.mjs --tiers medium --spots river --boots 1 --out quick.json
node tools/perf_spots.mjs --assets --out assets.json             # per-asset classic costs (budgets.md)
```

It prints the tables below (and writes every raw sample summary to `--out`).
Compare a re-measure with this file only on the same machine, backend and
viewport.

## The four fixed spots

The cat is placed on the spot with `player.mesh.position` and its yaw, the
follow camera is snapped to its normal place behind it (4.2 m back, 2.4 m up,
rotated by the yaw; yaw 0 looks toward +z), and the game then runs normally.
The valley floor is y = 0 (`Countryside` has no `groundAt`).

| Spot | Cat (x, z) | Yaw (rad) | What the camera sees |
|---|---|---:|---|
| street | (0, 14) | π | Village street at the W3/E4 houses, looking up the lane toward the torii |
| shrine | (0, −19) | π | Torii approach, looking through the torii (z −22) to the shrine hall (z −32) |
| river | (9, 28.2) | −1.3 | Grass strip between the river and the paddies, east of the bridge, looking west along the water to the bridge at (−1, 30.5) |
| meadow | (−12, 12) | 2.46 | Open meadow west of the street (the `grass_preview` meadow spot) |

The four spots as measured on the high tier (first boot), 1200 × 750:
`captures/perf/high-street.jpg`, `high-shrine.jpg`, `high-river.jpg`,
`high-meadow.jpg`.

## Method

- **Boot.** `/index.html` with `sessionStorage.catwalk_autostart = 'new'` (what
  `/__boot.html` sets) and the tier saved in `localStorage.catwalk_settings_v1`
  before navigation, exactly as the settings menu saves it, so the world is
  built at that tier. A fresh browser profile per boot. Three boots per tier.
- **Pinned state.** After the first frame: hour fixed at 10.5
  (`sky.cycleSpeed = 0`), clear weather (weather timer parked), the adaptive
  resolution ladder and the eco frame governor switched off (both replaced
  with no-ops in the page), then `game.applyQuality()` re-applies the tier
  (pixel ratio, MSAA, shadow map, AO, bloom, shafts, densities). Each tier
  is measured as itself, not as whatever the governor would drop it to.
  The resolved settings per tier are in the raw JSON (`state`).
- **Per spot.** Place the cat, run 3 s of normal frames (warm-up: shaders,
  grass rings, shadow map), then 3 rounds × 240 frames.
- **Frame ms (GPU-synced).** Each real `Game.loop()` call (world update plus
  `composer.render()` submission) is followed by a 1-pixel `readPixels`, so
  the clock stops when the GPU has finished that frame: frame = loop CPU +
  GPU wait. This serialises CPU and GPU, so it is an upper bound on frame
  cost (a real browser overlaps the two), and it is stable enough to compare
  sets. Headless Chromium paces `requestAnimationFrame` at 60 Hz whatever the
  flags: on a static page the rAF interval was 16.66 ms by default and
  18.2 ms with `--disable-gpu-vsync --disable-frame-rate-limit`, and the game
  dropped from 36 to 10 fps with those flags. So the rAF interval is kept in
  the raw JSON (`rafIntervalMs`) but is not the frame time.
- **Loop CPU ms.** Main-thread time inside one `Game.loop()` call.
- **GPU wait ms.** Time the 1-pixel readback waited after the loop returned.
- **Render-only ms.** `composer.render()` 30× back to back at the tier's
  shadow cadence, synced once at the end, divided by 30; 5 repetitions. No
  world update in between, so no grass physics or simulation.
- **Draw calls, triangles.** `renderer.info` with `autoReset` off across
  one whole loop: every pass (shadow map, scene, AO, atmosphere, bloom
  levels, grade, grass physics targets, the environment bake when due).
  "Scene" is the `RenderPass` call alone (scene plus its shadow map).
- **World build.** Timing hooks installed before any page script (no game
  file changed): *world build* = the `Game` constructor's first statement
  (its `#canvas` lookup) to its closing `this.loop()` call; *first frame* =
  that first loop (shader compilation plus the first render); *world ready* =
  the two together. *Boot total* adds the time from the boot screen turning
  to "loading" to the constructor (module download and evaluation, including
  three.js from the CDN), so it moves with the network.
- **Spread.** Each boot gives one median per spot (720 frames). Frame ms is
  the median of the 3 boot medians, with the min–max of all 9 round medians
  (3 boots × 3 rounds of 240 frames) in brackets; p90 is the median of the 3
  boot p90s. Loop CPU and render-only: median of the 3 boot medians, with
  their min–max. GPU wait, draw calls and triangles: median of the 3 boot
  medians. World build: median and min–max of the 3 boots.

## Results

Command (2026-11-13, 13 minutes):
`node tools/perf_spots.mjs --shots <scratch>/perf-shots --out <scratch>/perf-baseline.json`
(defaults: tiers low, medium, high; spots street, shrine, river, meadow; 3
boots; 3 rounds × 240 frames; 3 s warm-up; hour 10.5; 1200 × 750; Metal).
The one page error in every boot is the optional `cad-overrides.json` 404
(a missing file is normal, guide §3.5).

### Frame cost, draw calls, triangles (classic set)

| Tier | Spot | Frame ms, GPU-synced: median (round medians min–max) | p90 | Loop CPU ms (boot medians min–max) | GPU wait ms | Render-only ms (boot medians min–max) | Draw calls (scene / frame) | Triangles (scene / frame) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| low | street | 10.55 (9.50–13.55) | 28.00 | 4.60 (4.55–4.60) | 6.00 | 3.80 (3.27–3.96) | 501 / 505 | 5,026,628 / 5,026,634 |
| low | shrine | 8.80 (7.75–12.15) | 27.94 | 3.30 (3.20–3.60) | 5.20 | 3.51 (3.45–3.62) | 254 / 258 | 4,111,906 / 4,111,912 |
| low | river | 10.10 (8.15–13.30) | 29.95 | 4.60 (4.10–4.80) | 5.50 | 3.95 (2.99–3.95) | 416 / 420 | 4,219,228 / 4,219,234 |
| low | meadow | 10.20 (8.70–13.95) | 29.80 | 4.30 (4.00–4.50) | 5.90 | 3.83 (3.76–5.80) | 481 / 485 | 4,727,477 / 4,727,483 |
| medium | street | 13.50 (11.70–15.95) | 26.93 | 4.50 (4.35–5.30) | 8.60 | 5.58 (5.18–13.70) | 569 / 589 | 6,018,688 / 6,018,710 |
| medium | shrine | 10.40 (9.90–12.80) | 13.41 | 3.60 (3.40–3.80) | 7.00 | 5.00 (4.75–9.73) | 289 / 309 | 5,028,246 / 5,028,268 |
| medium | river | 12.50 (11.10–20.20) | 25.43 | 4.50 (4.20–5.10) | 7.60 | 5.26 (5.09–11.08) | 472 / 492 | 5,088,697 / 5,088,719 |
| medium | meadow | 12.30 (11.00–45.30) | 22.21 | 4.40 (4.30–4.80) | 7.70 | 5.42 (4.88–8.16) | 538 / 558 | 5,643,820 / 5,643,842 |
| high | street | 18.90 (17.10–19.95) | 31.45 | 5.60 (5.50–5.70) | 13.00 | 9.08 (8.91–9.54) | 761 / 781 | 8,170,223 / 8,170,245 |
| high | shrine | 16.20 (14.50–19.50) | 30.80 | 4.30 (4.20–4.60) | 11.50 | 8.30 (8.18–8.82) | 428 / 448 | 7,038,510 / 7,038,532 |
| high | river | 17.10 (13.85–22.15) | 29.34 | 5.80 (5.80–5.80) | 10.90 | 12.53 (8.37–32.86) | 641 / 661 | 6,936,496 / 6,936,518 |
| high | meadow | 17.50 (16.15–20.20) | 27.01 | 5.40 (5.40–5.60) | 12.00 | 9.06 (8.98–9.40) | 714 / 734 | 7,534,574 / 7,534,596 |

### World build time (classic set)

| Tier | World ready ms, ctor → first frame (min–max) | World build ms (min–max) | First frame ms (min–max) | Boot total ms, engine start → first frame (min–max) | Boots |
|---|---:|---:|---:|---:|---:|
| low | 2786 (2710–3309) | 1984 (1964–2012) | 802 (698–1345) | 3879 (3816–4378) | 3 |
| medium | 2888 (2461–2903) | 1724 (1724–2056) | 832 (737–1179) | 3774 (3362–3979) | 3 |
| high | 3259 (2925–3450) | 2105 (2089–2151) | 1170 (820–1299) | 4357 (3997–4846) | 3 |

### What each tier resolved to (pinned state, from the raw JSON)

| Tier | Pixel ratio | Drawing buffer | MSAA | Shadow map | Shadow refresh | Bloom | AO | Programs | Geometries | Textures |
|---|---:|---|---:|---:|---|---|---|---:|---:|---:|
| low | 1.0 | 1200 × 750 | 0 | 1024 | every 2nd frame | off | off | 93 | 419 | 109 |
| medium | 1.0 | 1200 × 750 | 0 | 2048 | every 2nd frame | on | on | 108 | 470 | 124 |
| high | 1.0 | 1200 × 750 | 4× | 4096 | every frame | on | on | 108 | 472 | 122 |

(Programs, geometries and textures from `renderer.info` at the street spot,
first boot. `high` gets 4096 shadows because the GPU string matches
`isDiscreteGPU()`.)

### Reading the numbers

- **Medians are the comparable numbers.** Boot-to-boot they agree within
  about 0.5 ms (street: low 10.2 / 10.7 / 10.55, medium 13.7 / 13.2 / 13.5,
  high 18.9 / 18.9 / 18.75).
- **p90 and the wide brackets are mostly GPU contention.** Other Fable lanes
  were rendering on the same GPU during the run. Every outlier is GPU wait
  (worst single frames 124 / 215 / 252 ms for low / medium / high), while
  loop-CPU p90 stays between 4.2 and 7.1 ms on every tier and spot. The
  render-only outliers (medium street 13.70, high river 32.86) are the same
  contention. Re-measure on a quiet machine before trusting a p90.
- **Triangles are mostly grass.** Low already draws 4.1–5.0 M triangles per
  frame; the GPU-instanced grass rings (density 0.5 / 0.75 / 1.0 by tier)
  account for most of it. The scene pass (scene + shadow map) is all but
  ~4 (low) or ~20 (medium/high) of the frame's draw calls; the rest are the
  post passes.
- **High costs ~1.8× low** in synced frame time (street 18.9 vs 10.55 ms),
  mostly GPU wait (13.0 vs 6.0 ms): 4× MSAA, the 4096 shadow map every frame,
  AO and bloom. Loop CPU only grows from 4.6 to 5.6 ms.
- **World ready is ~2.8–3.3 s** on every tier: about 1.7–2.1 s of world
  build (the constructor) plus 0.7–1.3 s for the first frame (shader
  compilation). Building is not tier-dependent in the classic set; the first
  frame is (more programs, MSAA targets).
- On SwiftShader (`checks-browser.md` §3) the same timing hooks measured a
  ~40 s world build and a ~128 s first frame (shader compilation on the CPU),
  2.2–3.3 minutes from launch to playing. SwiftShader was not used for frame
  timing (a CPU rasteriser says nothing about GPU budgets).

## Per-asset classic costs (for the AAA-7 budgets)

`node tools/perf_spots.mjs --assets --out <scratch>/assets-baseline.json`
(5 s). Every active inventory asset with an isolated original adapter in
`catalog/js/asset-loader.mjs` (124 of them, 0 errors) is built once to warm
module and texture caches, then 5 more times; triangles and draw calls come
from the warm build (instanced meshes count every instance; draw calls are
one per visible mesh or material group, before any `_mergeStatics()` merge),
build ms is the median of the 5 timed builds (min–max in brackets). Read with
care:

- Several component ids build their host for context: `shrine-hall`,
  `shimenawa`, `shrine-bell` and `offering-box` all build the shrine hall
  (2,658 triangles); `tea-bench` builds the tea house; `namako` builds a
  street house; `cat-coat` builds Michi. Their numbers are the host's.
- Grass layers (`grass-near`, `grass-mid`, …) are one blade card each in
  isolation; in the game their cost is set by instance density, which is
  the per-tier grass number in the frame table above.
- `valley-ground` (45,000 triangles, 28.6 ms) and `village-street` (8 houses,
  398 meshes) are whole-area builds.
- The cats are SDF sculpts: ~116–124 k triangles in 23 skinned parts each.

| Group | Assets | Triangles median | p90 | max | Draw calls median | max | Build ms median | p90 | max |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Building components | 10 | 198 | 3,302 | 5,318 | 16 | 108 | 0.75 | 1.41 | 2.40 |
| Buildings | 5 | 4,890 | 17,259 | 25,220 | 108 | 398 | 2.10 | 5.02 | 6.90 |
| Cat components | 5 | 6,036 | 116,260 | 116,260 | 9 | 23 | 6.30 | 7.00 | 7.20 |
| Characters | 9 | 1,090 | 120,305 | 123,876 | 8 | 23 | 3.90 | 7.66 | 8.30 |
| Ground and water | 11 | 348 | 4,132 | 45,000 | 3 | 167 | 0.50 | 2.80 | 28.60 |
| Hidden places | 16 | 801 | 3,772 | 4,276 | 6 | 50 | 1.80 | 2.30 | 2.40 |
| Interiors | 19 | 380 | 1,424 | 4,822 | 10 | 87 | 0.80 | 1.40 | 1.60 |
| Items | 8 | 224 | 394 | 456 | 2 | 5 | 0.50 | 1.35 | 1.70 |
| Props | 12 | 194 | 646 | 4,354 | 6 | 189 | 0.25 | 1.63 | 5.90 |
| Shrine | 7 | 2,658 | 2,658 | 2,658 | 32 | 93 | 0.80 | 1.28 | 1.70 |
| Summit | 1 | 4,088 | 4,088 | 4,088 | 6 | 6 | 9.30 | 9.30 | 9.30 |
| Vegetation | 21 | 206 | 10,926 | 36,000 | 1 | 3 | 0.40 | 4.40 | 6.40 |
| **all** | 124 | 379 | 8,430 | 123,876 | 6 | 398 | 0.90 | 5.40 | 28.60 |

<details><summary>Every asset (124), by triangles</summary>

| Asset | Group | Triangles | Draw calls | Meshes | Build ms median (min–max of 5) |
|---|---|---:|---:|---:|---:|
| mochi | Characters | 123,876 | 23 | 23 | 8.30 (5.30–10.60) |
| kuro | Characters | 119,412 | 23 | 23 | 6.20 (5.00–7.60) |
| michi | Characters | 116,260 | 23 | 23 | 7.50 (6.10–22.30) |
| cat-coat | Cat components | 116,260 | 23 | 23 | 6.30 (4.60–13.40) |
| cat-face | Cat components | 116,260 | 23 | 23 | 7.20 (6.10–18.30) |
| luna | Characters | 112,804 | 23 | 23 | 7.40 (6.60–11.50) |
| valley-ground | Ground and water | 45,000 | 1 | 1 | 28.60 (27.30–30.80) |
| street-bushes | Vegetation | 36,000 | 1 | 1 | 0.10 (0.10–0.20) |
| village-street | Buildings | 25,220 | 398 | 398 | 6.90 (6.70–11.20) |
| sakura | Vegetation | 10,926 | 3 | 3 | 6.40 (6.00–12.40) |
| tree-trunks | Vegetation | 10,926 | 3 | 3 | 4.30 (4.00–5.20) |
| tree-canopies | Vegetation | 10,926 | 3 | 3 | 4.80 (4.10–20.20) |
| maples | Vegetation | 9,456 | 3 | 3 | 4.40 (4.40–5.40) |
| master-bells | Cat components | 6,036 | 9 | 9 | 6.70 (6.20–8.90) |
| cat-collar | Cat components | 5,464 | 8 | 8 | 5.40 (4.10–6.80) |
| tea-house | Buildings | 5,318 | 108 | 108 | 2.10 (2.10–2.60) |
| tea-bench | Building components | 5,318 | 108 | 108 | 2.40 (2.20–3.50) |
| rim-trees | Vegetation | 5,000 | 2 | 2 | 3.10 (2.30–5.30) |
| residence | Buildings | 4,890 | 108 | 108 | 2.20 (1.80–6.30) |
| secret-house | Buildings | 4,822 | 87 | 87 | 1.80 (1.60–5.00) |
| secret-bed | Interiors | 4,822 | 87 | 87 | 1.60 (1.50–1.70) |
| corral | Props | 4,354 | 189 | 189 | 5.90 (5.80–7.60) |
| lantern-glade | Hidden places | 4,276 | 50 | 50 | 2.20 (2.10–3.00) |
| glade-seat | Hidden places | 4,276 | 50 | 50 | 2.40 (2.10–17.90) |
| pines | Vegetation | 4,146 | 3 | 3 | 1.50 (1.40–1.60) |
| paddies | Ground and water | 4,132 | 25 | 25 | 0.50 (0.40–0.60) |
| blender-roofscape | Summit | 4,088 | 6 | 6 | 9.30 (2.70–29.80) |
| rice | Ground and water | 3,924 | 1 | 1 | 0.40 (0.30–0.40) |
| glade-bamboo | Hidden places | 3,268 | 2 | 2 | 1.80 (1.80–2.00) |
| street-house | Buildings | 3,078 | 46 | 46 | 0.80 (0.70–1.00) |
| namako | Building components | 3,078 | 46 | 46 | 0.70 (0.60–0.80) |
| shrine-hall | Shrine | 2,658 | 32 | 32 | 1.00 (0.80–1.20) |
| shimenawa | Shrine | 2,658 | 32 | 32 | 0.80 (0.70–0.90) |
| shrine-bell | Shrine | 2,658 | 32 | 32 | 0.80 (0.70–0.90) |
| offering-box | Shrine | 2,658 | 32 | 32 | 1.00 (0.80–1.20) |
| grass-shell | Vegetation | 2,592 | 1 | 1 | 0.40 (0.30–0.70) |
| kawara-roof | Building components | 2,454 | 16 | 16 | 0.40 (0.30–0.50) |
| moon-pool | Hidden places | 2,052 | 43 | 43 | 2.40 (2.20–2.50) |
| pool-apron | Hidden places | 2,052 | 43 | 43 | 2.00 (1.90–2.20) |
| pool-seat | Hidden places | 2,052 | 43 | 43 | 2.00 (1.90–2.10) |
| pool-toro | Hidden places | 2,052 | 43 | 43 | 2.00 (1.80–2.20) |
| path-slabs | Ground and water | 2,004 | 167 | 167 | 2.80 (2.50–5.10) |
| distant-pagoda | Shrine | 1,564 | 93 | 93 | 1.70 (1.50–1.90) |
| tea-interior | Interiors | 1,424 | 64 | 64 | 1.40 (1.20–1.80) |
| interior-frame | Interiors | 1,424 | 64 | 64 | 1.20 (1.20–1.80) |
| courtyard-gravel | Interiors | 1,424 | 64 | 64 | 1.40 (1.40–2.80) |
| courtyard-wall | Interiors | 1,424 | 64 | 64 | 1.20 (1.20–3.70) |
| pool-rim | Hidden places | 1,224 | 1 | 1 | 1.70 (1.70–1.80) |
| koi | Characters | 1,090 | 8 | 8 | 2.80 (2.80–6.00) |
| path-boulders | Ground and water | 720 | 20 | 20 | 0.40 (0.40–0.50) |
| mist-altar | Shrine | 700 | 6 | 6 | 0.30 (0.30–0.40) |
| nest | Props | 656 | 7 | 7 | 0.50 (0.40–0.50) |
| street-lamps | Props | 560 | 35 | 35 | 1.00 (0.70–1.90) |
| larry | Characters | 504 | 7 | 7 | 3.60 (2.40–4.80) |
| tokonoma | Interiors | 492 | 7 | 7 | 0.70 (0.60–0.80) |
| scroll | Interiors | 492 | 7 | 7 | 0.70 (0.60–0.80) |
| bonsai | Interiors | 492 | 7 | 7 | 0.70 (0.60–0.80) |
| yarn | Items | 456 | 2 | 2 | 0.60 (0.60–0.70) |
| bamboo-fence | Props | 428 | 21 | 21 | 0.60 (0.50–0.70) |
| torii | Shrine | 380 | 17 | 17 | 0.30 (0.30–0.40) |
| chabudai | Interiors | 380 | 11 | 11 | 1.10 (1.00–1.20) |
| teaware | Interiors | 380 | 11 | 11 | 0.90 (0.80–0.90) |
| lotus | Hidden places | 378 | 21 | 21 | 1.80 (1.70–2.00) |
| offering-bells | Items | 368 | 3 | 3 | 0.40 (0.40–0.50) |
| bridge | Ground and water | 348 | 29 | 29 | 0.90 (0.40–1.10) |
| secret-door | Building components | 348 | 18 | 18 | 1.30 (1.00–1.30) |
| key | Items | 344 | 5 | 5 | 0.30 (0.30–0.40) |
| nest-eggs | Props | 336 | 3 | 3 | 0.30 (0.30–0.40) |
| jade-paw | Items | 296 | 2 | 2 | 1.70 (1.70–2.80) |
| roadside-moss | Vegetation | 296 | 1 | 1 | 0.50 (0.40–0.50) |
| secret-table | Interiors | 264 | 10 | 10 | 0.90 (0.80–1.20) |
| knockables | Interiors | 244 | 3 | 3 | 0.80 (0.70–0.80) |
| grass-moss | Vegetation | 242 | 1 | 1 | 0.30 (0.20–0.30) |
| wind-chime | Props | 224 | 4 | 4 | 0.20 (0.20–0.30) |
| key-rock | Ground and water | 216 | 3 | 3 | 0.30 (0.20–0.30) |
| upper-windows | Building components | 216 | 18 | 18 | 0.40 (0.30–0.50) |
| bamboo-groves | Vegetation | 206 | 3 | 3 | 0.50 (0.30–0.60) |
| paddy-bunds | Ground and water | 200 | 20 | 20 | 0.50 (0.40–0.60) |
| koushi | Building components | 180 | 15 | 15 | 0.30 (0.20–0.30) |
| shishi | Props | 164 | 6 | 6 | 0.20 (0.10–0.20) |
| path-shoulders | Ground and water | 160 | 1 | 1 | 0.10 (0.10–0.20) |
| lock-plate | Building components | 156 | 2 | 2 | 0.80 (0.70–0.80) |
| interior-fish | Items | 152 | 2 | 2 | 1.20 (1.00–1.60) |
| grass-susuki | Vegetation | 147 | 1 | 1 | 0.40 (0.30–0.50) |
| tatami | Interiors | 144 | 12 | 12 | 0.70 (0.60–0.90) |
| secret-tatami | Interiors | 144 | 12 | 12 | 1.10 (0.80–1.70) |
| path | Ground and water | 142 | 1 | 1 | 0.60 (0.40–0.70) |
| lily-pads | Hidden places | 126 | 9 | 9 | 1.80 (1.70–2.10) |
| river | Ground and water | 120 | 1 | 1 | 0.50 (0.40–1.00) |
| toro | Props | 108 | 6 | 6 | 0.20 (0.10–0.30) |
| chochin | Props | 100 | 6 | 6 | 0.20 (0.10–0.40) |
| pool-water | Hidden places | 96 | 2 | 2 | 2.00 (1.80–3.10) |
| guardian-crows | Characters | 93 | 5 | 5 | 3.30 (2.80–3.60) |
| secret-fish | Items | 92 | 2 | 2 | 0.80 (0.70–1.20) |
| crates | Props | 88 | 5 | 5 | 0.10 (0.10–0.20) |
| sparrows | Characters | 81 | 4 | 4 | 3.90 (3.70–4.60) |
| engawa | Building components | 72 | 6 | 6 | 0.10 (0.10–0.20) |
| grass-thicket | Vegetation | 71 | 1 | 1 | 0.30 (0.20–0.40) |
| timber-frame | Building components | 60 | 5 | 5 | 1.20 (1.10–2.50) |
| zabuton | Interiors | 60 | 5 | 5 | 0.70 (0.60–0.70) |
| courtyard-toro | Interiors | 48 | 4 | 4 | 0.60 (0.60–0.70) |
| corral-sign | Props | 42 | 3 | 3 | 1.70 (1.60–2.40) |
| sake-barrel | Props | 40 | 1 | 1 | 0.10 (0.00–0.10) |
| glade-lanterns | Hidden places | 40 | 1 | 1 | 1.70 (1.60–2.20) |
| glade-floor | Hidden places | 36 | 1 | 1 | 1.70 (1.60–1.70) |
| andon | Interiors | 36 | 3 | 3 | 0.70 (0.60–1.10) |
| secret-andon | Interiors | 36 | 3 | 3 | 0.70 (0.70–0.80) |
| grass-near | Vegetation | 27 | 1 | 1 | 0.40 (0.20–0.50) |
| cat-shadow | Cat components | 24 | 1 | 1 | 5.40 (3.80–11.30) |
| guardian-feather | Items | 24 | 2 | 2 | 0.20 (0.10–0.20) |
| grass-yarn | Vegetation | 23 | 1 | 1 | 0.30 (0.20–0.30) |
| grass-mid | Vegetation | 15 | 1 | 1 | 0.50 (0.20–0.70) |
| noren | Building components | 12 | 1 | 1 | 0.90 (0.80–1.20) |
| shoji-doors | Interiors | 12 | 1 | 1 | 0.70 (0.60–0.80) |
| grass-sumi | Vegetation | 11 | 1 | 1 | 0.30 (0.20–0.40) |
| grass-flowers | Vegetation | 9 | 1 | 1 | 0.40 (0.30–0.40) |
| dango | Items | 8 | 1 | 1 | 0.30 (0.20–0.50) |
| grass-lantern | Vegetation | 7 | 1 | 1 | 0.30 (0.20–1.10) |
| grass-far | Vegetation | 6 | 1 | 1 | 0.40 (0.20–0.50) |
| grass-mown | Vegetation | 5 | 1 | 1 | 0.30 (0.20–0.30) |
| butterflies | Characters | 0 | 1 | 1 | 2.60 (2.50–3.30) |
| pool-moon | Hidden places | 0 | 1 | 1 | 1.80 (1.70–2.20) |
| pool-motes | Hidden places | 0 | 1 | 1 | 1.70 (1.60–1.90) |
| glade-fireflies | Hidden places | 0 | 1 | 1 | 1.70 (1.60–1.90) |

</details>
