# Phase 0 performance baseline (P0.3)

**This is not a phone or low-end benchmark.** Every number here comes from
one development Mac (Apple M5 Max) in headless Chromium at 1200 × 750. It
says how the classic asset set costs on this machine, and it is the yardstick
that the modular set is compared against on the same machine. No real-device
benchmark exists yet (`AGENTS.md`, open items V1.1/V1.3).

Lane `p0-browser`, classic asset set (the only one that exists today). The
numbers below are the **re-baseline of 2026-11-13 17:00 PST** (review fix
round 1): boots interleaved across tiers, load average recorded per boot,
frames split by shadow-map refresh. It supersedes the first run of 11:20,
which was taken under heavy contention from other lanes (world ready
2.8–3.3 s there against 1.2 s here); that run's raw JSON is kept for the
record (see "Raw data").

## Machine, browser, GPU backend

| | |
|---|---|
| Machine | `Mac17,7`, Apple M5 Max, 18 cores, 128 GB, macOS 26.6.2 |
| Browser | Chromium 153.0.8010.12, Playwright 1.63.0 headless shell |
| GPU backend | `ANGLE (Apple, ANGLE Metal Renderer: Apple M5 Max, Unspecified Version)` (`--use-angle=metal`) |
| Viewport | 1200 × 750 CSS px, device scale 1, so every tier's pixel-ratio cap resolves to 1.0 |
| Load | 1-minute load average 1.35–2.54 across the 9 boots (recorded at the start and end of each boot; 3 other agents were active). Not an idle machine: frame-time rows are provisional (`budgets.md`) |

## Raw data

Kept outside the repo with the capture masters (ruling R8):

| File (`/Users/c1t1zen/Documents/GitHub/michi-wt/_baseline/perf/`) | What | SHA-256 |
|---|---|---|
| `perf-baseline.json` | this re-baseline (every spot, boot, round summary, pinned state, load) | `f82e49e8fb8251424f80f8eec93416d8874a43e58ce7009f4f03b11c4d63fbe6` |
| `assets-baseline.json` | per-asset classic costs, quiet machine | `d5eebb6e8808893d131812f6e366189a80e0a12a32a210983b726ec9e985351d` |
| `inview-bands.json` | in-view object counts per distance band (used by `budgets.md`) | `4ef77e619a91401a95e9f90b6dcf53191162843061875f562298de130f6a1aef` |
| `perf-baseline-run1-contended.json` | the superseded first run (tiers in blocks, heavy contention, no shadow split) | `f22b4a68943c98e6f25a0d4074dbc59afc007fc6a1d1d555ee17347293217355` |
| `assets-baseline-run1-contended.json` | per-asset costs from the contended first run | `54aaad6f48fa647de1fd17391b013f3fba4a13b7d1b06b46f8827b2362170fad` |

## How to re-measure

```sh
export PLAYWRIGHT_MODULE=/path/to/node_modules/playwright
node tools/perf_spots.mjs --out perf.json                        # 3 tiers × 4 spots × 3 boots, ~10 min
# same-session classic vs modular (the preferred gate, budgets.md): boots interleave both sets
node tools/perf_spots.mjs --url-suffix "" --url-suffix "?assets=modular" --out cmp.json
node tools/perf_spots.mjs --tiers medium --spots river --boots 1 --out quick.json
node tools/perf_spots.mjs --assets --out assets.json             # per-asset classic costs (budgets.md)
```

It prints the tables below and writes every summary to `--out`. Compare a
re-measure with this file only on the same machine, backend and viewport,
and look at the load column first; better, compare sets measured in the
same session.

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

The four spots on the high tier (first boot), 1200 × 750:
`captures/perf/high-street.jpg`, `high-shrine.jpg`, `high-river.jpg`,
`high-meadow.jpg`.

## Method

- **Boot.** `/index.html` with `sessionStorage.catwalk_autostart = 'new'` (what
  `/__boot.html` sets) and the tier saved in `localStorage.catwalk_settings_v1`
  before navigation, exactly as the settings menu saves it, so the world is
  built at that tier. A fresh browser profile per boot. Three boots per
  tier, **interleaved** (low, medium, high, then again ×3), so background
  load spreads across tiers instead of landing on one; `os.loadavg()` is
  recorded at the start and end of every boot.
- **Pinned state.** After the first frame: hour fixed at 10.5
  (`sky.cycleSpeed = 0`), clear weather (weather timer parked), the adaptive
  resolution ladder and the eco frame governor switched off (both replaced
  with no-ops in the page), then `game.applyQuality()` re-applies the tier
  (pixel ratio, MSAA, shadow map, AO, bloom, shafts, densities). Each tier
  is measured as itself, not as whatever the governor would drop it to.
- **Per spot.** Place the cat, run 3 s of normal frames (warm-up: shaders,
  grass rings, shadow map), then 3 rounds × 240 frames (an even count, so
  both frame kinds below are equally represented).
- **Two kinds of frame.** `Game.loop()` refreshes the sun's shadow map on
  every frame on high but only on every 2nd frame on low and medium
  (`main.js` `shadowCadence`, `_shadowFrame`). On a refresh frame
  `renderer.info` counts the shadow pass too, so per-frame draw calls,
  triangles and times are **bimodal** on low and medium (low street: 655
  calls and 6.24 M triangles on a refresh frame, 392 and 3.99 M on the next).
  Each frame is tagged by whether it refreshed the shadow map
  (`game._shadowFrame === 0` after the loop) and every metric keeps both
  modes: *shadow-refresh* = median of refresh frames, *other* = median of the
  rest (— on high), *mean* = plain mean, *amortised* = the two medians
  weighted by how often each occurs (50/50 on low/medium), which is the
  per-frame cost averaged over the shadow cycle and, unlike the mean, robust
  to contention spikes. A single median of a 50/50 bimodal set is a
  meaningless midpoint; the first run reported exactly that.
- **Frame ms (GPU-synced).** Each real `Game.loop()` call (world update plus
  `composer.render()` submission) is followed by a 1-pixel `readPixels`, so
  the clock stops when the GPU has finished that frame: frame = loop CPU +
  GPU wait. This serialises CPU and GPU, so it is a latency, an upper bound
  on frame cost (a real browser overlaps the two). Headless Chromium paces
  `requestAnimationFrame` at 60 Hz whatever the flags: on a static page the
  rAF interval was 16.66 ms by default and 18.2 ms with
  `--disable-gpu-vsync --disable-frame-rate-limit`, and the game dropped from
  36 to 10 fps with those flags. So the rAF interval is kept in the raw JSON
  (`rafIntervalMs`) but is not the frame time.
- **Loop CPU ms.** Main-thread time inside one `Game.loop()` call.
- **GPU wait ms.** Time the 1-pixel readback waited after the loop returned.
- **Render-only ms.** `composer.render()` 30× back to back at the tier's
  shadow cadence, synced once at the end, divided by 30; 5 repetitions. No
  world update in between, and the GPU queue stays full, so this is a
  throughput figure, not comparable with the per-frame latency above.
- **Draw calls, triangles.** `renderer.info` with `autoReset` off across
  one whole loop: every pass (shadow map, scene, AO, atmosphere, bloom
  levels, grade, grass physics targets, the environment bake when due).
  *Scene pass* is the `RenderPass` call alone (scene plus its shadow map).
- **World build.** Timing hooks installed before any page script (no game
  file changed): *world build* = the `Game` constructor's first statement
  (its `#canvas` lookup) to its closing `this.loop()` call; *first frame* =
  that first loop (shader compilation plus the first render); *world ready* =
  the two together. *Boot total* adds the time from the boot screen turning
  to "loading" to the constructor (module download and evaluation, including
  three.js from the CDN), so it moves with the network.
- **Spread.** Each boot gives one value per spot and metric. Tables show the
  median of the 3 boot values; frame ms brackets hold the min–max of all 9
  round values (3 boots × 3 rounds of 240 frames); loop CPU and render-only
  brackets the min–max of the 3 boot values; p90 is the median of the 3 boot
  p90s; counts are the median of the 3 boot medians/means. World build:
  median and min–max of the 3 boots.

## Results

Command (2026-11-13 17:04–17:13 PST, 9.6 minutes, exit 0):
`node tools/perf_spots.mjs --shots <scratch>/perf-shots2 --out <scratch>/perf-baseline2.json`
(copied to `_baseline/perf/perf-baseline.json`; defaults: tiers low, medium,
high; spots street, shrine, river, meadow; 3 interleaved boots; 3 rounds ×
240 frames; 3 s warm-up; hour 10.5; 1200 × 750; Metal). The one page error
in every boot is the optional `cad-overrides.json` 404 (a missing file is
normal, guide §3.5).

### Frame time (classic set)

| Tier | Spot | Frame ms amortised (round values min–max) | Shadow-refresh frame ms | Other frame ms | p90 | Loop CPU ms amortised (boot min–max) | GPU wait ms (shadow / other) | Render-only ms (boot min–max) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| low | street | 10.20 (8.50–10.60) | 11.00 | 9.40 | 11.50 | 3.18 (2.70–3.20) | 7.40 / 6.80 | 1.38 (1.38–1.61) |
| low | shrine | 7.65 (5.63–9.40) | 8.30 | 7.00 | 9.60 | 1.95 (1.70–2.75) | 6.20 / 5.40 | 1.12 (1.09–1.12) |
| low | river | 9.05 (5.57–10.15) | 9.80 | 8.30 | 10.60 | 2.75 (2.35–3.45) | 6.80 / 6.00 | 1.37 (1.19–1.48) |
| low | meadow | 9.50 (7.90–10.25) | 10.20 | 8.80 | 11.11 | 2.85 (2.75–3.20) | 7.10 / 6.40 | 1.45 (1.37–1.58) |
| medium | street | 10.40 (8.22–11.00) | 11.60 | 9.10 | 12.50 | 2.95 (2.90–2.95) | 8.30 / 6.60 | 1.67 (1.65–1.70) |
| medium | shrine | 7.88 (6.85–9.28) | 8.85 | 6.90 | 10.80 | 2.20 (2.05–2.32) | 5.30 / 4.60 | 1.36 (1.35–1.41) |
| medium | river | 8.25 (7.52–9.63) | 9.10 | 7.40 | 11.60 | 2.95 (2.45–3.40) | 5.25 / 4.40 | 1.58 (1.42–1.72) |
| medium | meadow | 7.98 (7.15–10.68) | 8.60 | 7.35 | 11.50 | 2.95 (2.55–3.00) | 5.00 / 4.70 | 1.73 (1.64–1.83) |
| high | street | 12.30 (11.50–14.00) | 12.30 | — | 15.20 | 3.20 (3.10–3.30) | 9.20 / — | 2.40 (2.36–2.41) |
| high | shrine | 10.00 (9.60–11.00) | 10.00 | — | 12.40 | 2.50 (2.30–3.20) | 7.60 / — | 2.12 (2.10–2.13) |
| high | river | 11.00 (10.70–12.20) | 11.00 | — | 11.40 | 3.40 (2.90–3.50) | 7.50 / — | 2.00 (1.99–2.20) |
| high | meadow | 11.00 (10.50–11.20) | 11.00 | — | 11.50 | 3.40 (3.20–3.40) | 7.60 / — | 2.39 (2.38–2.43) |

### Draw calls and triangles per frame (classic set)

| Tier | Spot | Draw calls per frame: shadow-refresh / other / mean | Scene-pass calls: shadow / other | Triangles per frame: shadow-refresh / other / mean | Scene-pass triangles: shadow / other |
|---|---|---:|---:|---:|---:|
| low | street | 655 / 392 / 515 | 651 / 388 | 6,244,046 / 3,985,456 / 5,061,303 | 6,244,040 / 3,985,450 |
| low | shrine | 366 / 151 / 258 | 362 / 147 | 5,211,933 / 3,012,333 / 4,117,657 | 5,211,927 / 3,012,327 |
| low | river | 511 / 275 / 392 | 507 / 271 | 5,200,139 / 3,232,667 / 4,192,985 | 5,200,133 / 3,232,661 |
| low | meadow | 606 / 361 / 483 | 602 / 357 | 5,707,993 / 3,747,407 / 4,727,634 | 5,707,987 / 3,747,401 |
| medium | street | 777 / 419 / 596 | 757 / 399 | 7,245,141 / 4,914,393 / 6,072,801 | 7,245,119 / 4,914,371 |
| medium | shrine | 450 / 171 / 311 | 430 / 151 | 6,166,345 / 3,891,951 / 5,036,415 | 6,166,323 / 3,891,929 |
| medium | river | 646 / 319 / 485 | 626 / 299 | 6,108,399 / 4,067,531 / 5,088,264 | 6,108,377 / 4,067,509 |
| medium | meadow | 729 / 385 / 557 | 709 / 365 | 6,661,519 / 4,627,033 / 5,644,238 | 6,661,497 / 4,627,011 |
| high | street | 783 / — / 774 | 763 / — | 8,171,125 / — / 8,119,710 | 8,171,103 / — |
| high | shrine | 450 / — / 452 | 430 / — | 7,039,412 / — / 7,062,756 | 7,039,390 / — |
| high | river | 590 / — / 589 | 570 / — | 6,929,040 / — / 6,929,277 | 6,929,018 / — |
| high | meadow | 728 / — / 728 | 708 / — | 7,533,270 / — / 7,533,427 | 7,533,248 / — |

### World build time (classic set)

| Tier | World ready ms, ctor → first frame (min–max) | World build ms (min–max) | First frame ms (min–max) | Boot total ms, engine start → first frame (min–max) | Boots | Load avg, 1 min, at boot start (min–max) |
|---|---:|---:|---:|---:|---:|---:|
| low | 1210 (1184–1235) | 891 (871–908) | 319 (312–327) | 1889 (1823–1897) | 3 | 1.99 (1.35–2.54) |
| medium | 1258 (1238–1371) | 896 (863–904) | 355 (342–508) | 1930 (1899–2004) | 3 | 2.19 (1.54–2.22) |
| high | 1231 (1214–1250) | 890 (881–892) | 338 (333–359) | 1877 (1861–1918) | 3 | 2.19 (2.06–2.29) |

### What each tier resolved to (pinned state, from the raw JSON)

| Tier | Pixel ratio | Drawing buffer | MSAA | Shadow map | Shadow refresh | Bloom | AO | Programs | Geometries | Textures |
|---|---:|---|---:|---:|---|---|---|---:|---:|---:|
| low | 1.0 | 1200 × 750 | 0 | 1024 | every 2nd frame | off | off | 93 | 415 | 107 |
| medium | 1.0 | 1200 × 750 | 0 | 2048 | every 2nd frame | on | on | 108 | 461 | 122 |
| high | 1.0 | 1200 × 750 | 4× | 4096 | every frame | on | on | 108 | 472 | 124 |

(Programs, geometries and textures from `renderer.info` at the street spot,
first boot. `high` gets 4096 shadows because the GPU string matches
`isDiscreteGPU()`.)

### Reading the numbers

- **Use the amortised and mean columns, never a single median, on low and
  medium.** Refresh frames on medium draw as much as a high frame (street 777
  vs 783 calls; river even 646 vs 590) because the shadow pass redraws the
  casters; the frames between draw about half (419). The mean is what a
  second of play costs; the shadow-refresh column is the worst frame.
- **Triangles are stable, draw calls mostly so.** Boot to boot, per-frame
  mean triangles vary ≤ 1.9 % at every tier and spot. Draw calls vary ≤ 3.7 %
  except at the river (low 350–437, medium 438–496, high 580–642 between
  boots): something there with many small meshes changes from boot to boot.
- **Frame time is still noisy, so it is provisional.** With the load average
  at 1.35–2.54, a spot's amortised frame time still moves by up to ~4 ms
  between boots (low river 10.0 / 5.9 / 9.05 ms; medium meadow 7.55–10.4 ms).
  The worst single frames were 160.8 ms (low, one spike), 14.5 ms (medium)
  and 16.9 ms (high); loop-CPU p90 stayed at 2.7–4.2 ms everywhere.
- **Low is not cheaper than medium per synced frame at two spots** (river
  9.05 vs 8.25 ms, meadow 9.50 vs 7.98 ms; street and shrine are within
  0.3 ms), although render-only throughput orders the tiers as
  expected (1.1–1.5 / 1.4–1.8 / 2.0–2.4 ms). The synced number is a latency
  with the GPU idle most of each 16.7 ms rAF slot, so it does not scale with
  the work the way throughput does (GPU clocks are likely to ramp down
  between frames; not investigated). Compare tiers on draw calls, triangles
  and render-only, and compare sets with a same-session run.
- **Triangles are mostly grass.** Low already draws 3.0–4.0 M triangles on a
  frame without the shadow pass; the GPU-instanced grass rings (density 0.5 /
  0.75 / 1.0 by tier) account for most of it. The shadow pass adds
  1.96–2.33 M triangles on each refresh frame on low and medium (high redraws
  it on every frame, so it has no frame without it to subtract).
- **World ready is ~1.2 s** on every tier on this quieter machine (world build
  ~0.9 s plus a first frame of ~0.3–0.5 s). The contended first run measured
  2.8–3.3 s for the same thing: load matters more than tier.
- On SwiftShader (`checks-browser.md` §3) the same timing hooks measured a
  ~40 s world build and a ~128 s first frame (shader compilation on the CPU),
  2.2–3.3 minutes from launch to playing. SwiftShader was not used for frame
  timing (a CPU rasteriser says nothing about GPU budgets).

## Per-asset classic costs (for the AAA-7 budgets)

`node tools/perf_spots.mjs --assets --out <scratch>/assets-baseline2.json`
(2.3 s, quiet machine, load 1.5; copied to `_baseline/perf/assets-baseline.json`).
Every active inventory asset with an isolated original adapter in
`catalog/js/asset-loader.mjs` (124 of them, 0 errors) is built once to warm
module and texture caches, then 5 more times; triangles and draw calls come
from the warm build (instanced meshes count every instance; draw calls are
one per visible mesh or material group, before any `_mergeStatics()` merge,
and without the shadow pass), build ms is the median of the 5 timed builds
(min–max in brackets). Triangles match the contended first run exactly;
build times here are about half of that run's. Read with care:

- Several component ids build their host for context: `shrine-hall`,
  `shimenawa`, `shrine-bell` and `offering-box` all build the shrine hall
  (2,658 triangles); `tea-bench` builds the tea house; `namako` builds a
  street house; `cat-coat` builds Michi. Their numbers are the host's.
- Grass layers (`grass-near`, `grass-mid`, …) are one blade card each in
  isolation; in the game their cost is set by instance density, which is
  the per-tier grass number in the frame tables above.
- `valley-ground` (45,000 triangles, 12 ms) and `village-street` (8 houses,
  398 meshes) are whole-area builds.
- The cats are SDF sculpts: ~116–124 k triangles in 23 skinned parts each.

| Group | Assets | Triangles median | p90 | max | Draw calls median | max | Build ms median | p90 | max |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Building components | 10 | 198 | 3,302 | 5,318 | 16 | 108 | 0.45 | 0.54 | 0.90 |
| Buildings | 5 | 4,890 | 17,259 | 25,220 | 108 | 398 | 0.80 | 2.42 | 3.30 |
| Cat components | 5 | 6,036 | 116,260 | 116,260 | 9 | 23 | 2.00 | 2.46 | 2.50 |
| Characters | 9 | 1,090 | 120,305 | 123,876 | 8 | 23 | 1.90 | 3.52 | 3.60 |
| Ground and water | 11 | 348 | 4,132 | 45,000 | 3 | 167 | 0.20 | 1.20 | 12.00 |
| Hidden places | 16 | 801 | 3,772 | 4,276 | 6 | 50 | 0.90 | 1.10 | 1.20 |
| Interiors | 19 | 380 | 1,424 | 4,822 | 10 | 87 | 0.40 | 0.72 | 1.10 |
| Items | 8 | 224 | 394 | 456 | 2 | 5 | 0.25 | 0.69 | 0.90 |
| Props | 12 | 194 | 646 | 4,354 | 6 | 189 | 0.10 | 0.66 | 2.70 |
| Shrine | 7 | 2,658 | 2,658 | 2,658 | 32 | 93 | 0.30 | 0.58 | 0.70 |
| Summit | 1 | 4,088 | 4,088 | 4,088 | 6 | 6 | 1.40 | 1.40 | 1.40 |
| Vegetation | 21 | 206 | 10,926 | 36,000 | 1 | 3 | 0.20 | 1.90 | 2.70 |
| **all** | 124 | 379 | 8,430 | 123,876 | 6 | 398 | 0.40 | 1.97 | 12.00 |

<details><summary>Every asset (124), by triangles</summary>

| Asset | Group | Triangles | Draw calls | Meshes | Build ms median (min–max of 5) |
|---|---|---:|---:|---:|---:|
| mochi | Characters | 123,876 | 23 | 23 | 3.10 (2.40–3.60) |
| kuro | Characters | 119,412 | 23 | 23 | 2.80 (2.60–3.30) |
| michi | Characters | 116,260 | 23 | 23 | 3.50 (3.20–7.20) |
| cat-coat | Cat components | 116,260 | 23 | 23 | 2.50 (2.30–2.70) |
| cat-face | Cat components | 116,260 | 23 | 23 | 2.40 (2.00–12.00) |
| luna | Characters | 112,804 | 23 | 23 | 3.60 (3.20–4.00) |
| valley-ground | Ground and water | 45,000 | 1 | 1 | 12.00 (11.80–14.00) |
| street-bushes | Vegetation | 36,000 | 1 | 1 | 0.10 (0.00–0.10) |
| village-street | Buildings | 25,220 | 398 | 398 | 3.30 (2.90–3.90) |
| sakura | Vegetation | 10,926 | 3 | 3 | 2.70 (2.60–5.70) |
| tree-trunks | Vegetation | 10,926 | 3 | 3 | 1.90 (1.90–2.20) |
| tree-canopies | Vegetation | 10,926 | 3 | 3 | 1.90 (1.70–2.20) |
| maples | Vegetation | 9,456 | 3 | 3 | 2.00 (1.80–2.60) |
| master-bells | Cat components | 6,036 | 9 | 9 | 2.00 (1.90–2.40) |
| cat-collar | Cat components | 5,464 | 8 | 8 | 2.00 (1.80–2.30) |
| tea-house | Buildings | 5,318 | 108 | 108 | 1.10 (0.90–1.30) |
| tea-bench | Building components | 5,318 | 108 | 108 | 0.90 (0.80–1.00) |
| rim-trees | Vegetation | 5,000 | 2 | 2 | 1.10 (0.90–1.50) |
| residence | Buildings | 4,890 | 108 | 108 | 0.80 (0.80–1.40) |
| secret-house | Buildings | 4,822 | 87 | 87 | 0.80 (0.60–1.20) |
| secret-bed | Interiors | 4,822 | 87 | 87 | 0.80 (0.60–0.80) |
| corral | Props | 4,354 | 189 | 189 | 2.70 (2.40–3.40) |
| lantern-glade | Hidden places | 4,276 | 50 | 50 | 1.10 (0.90–1.50) |
| glade-seat | Hidden places | 4,276 | 50 | 50 | 1.10 (1.00–1.60) |
| pines | Vegetation | 4,146 | 3 | 3 | 0.70 (0.60–0.80) |
| paddies | Ground and water | 4,132 | 25 | 25 | 0.20 (0.20–0.30) |
| blender-roofscape | Summit | 4,088 | 6 | 6 | 1.40 (1.10–1.70) |
| rice | Ground and water | 3,924 | 1 | 1 | 0.20 (0.10–0.20) |
| glade-bamboo | Hidden places | 3,268 | 2 | 2 | 0.90 (0.80–0.90) |
| street-house | Buildings | 3,078 | 46 | 46 | 0.40 (0.30–0.70) |
| namako | Building components | 3,078 | 46 | 46 | 0.50 (0.40–0.90) |
| shrine-hall | Shrine | 2,658 | 32 | 32 | 0.50 (0.30–0.80) |
| shimenawa | Shrine | 2,658 | 32 | 32 | 0.30 (0.30–0.50) |
| shrine-bell | Shrine | 2,658 | 32 | 32 | 0.30 (0.30–0.50) |
| offering-box | Shrine | 2,658 | 32 | 32 | 0.40 (0.30–0.40) |
| grass-shell | Vegetation | 2,592 | 1 | 1 | 0.20 (0.10–0.40) |
| kawara-roof | Building components | 2,454 | 16 | 16 | 0.10 (0.10–0.20) |
| moon-pool | Hidden places | 2,052 | 43 | 43 | 1.20 (1.10–1.40) |
| pool-apron | Hidden places | 2,052 | 43 | 43 | 1.10 (0.90–1.20) |
| pool-seat | Hidden places | 2,052 | 43 | 43 | 1.00 (0.90–1.00) |
| pool-toro | Hidden places | 2,052 | 43 | 43 | 0.90 (0.90–1.00) |
| path-slabs | Ground and water | 2,004 | 167 | 167 | 1.20 (1.00–3.30) |
| distant-pagoda | Shrine | 1,564 | 93 | 93 | 0.70 (0.70–1.10) |
| tea-interior | Interiors | 1,424 | 64 | 64 | 0.70 (0.60–0.80) |
| interior-frame | Interiors | 1,424 | 64 | 64 | 1.10 (0.80–5.10) |
| courtyard-gravel | Interiors | 1,424 | 64 | 64 | 0.60 (0.50–1.10) |
| courtyard-wall | Interiors | 1,424 | 64 | 64 | 0.60 (0.50–0.70) |
| pool-rim | Hidden places | 1,224 | 1 | 1 | 0.90 (0.80–0.90) |
| koi | Characters | 1,090 | 8 | 8 | 1.80 (1.40–3.00) |
| path-boulders | Ground and water | 720 | 20 | 20 | 0.20 (0.10–0.30) |
| mist-altar | Shrine | 700 | 6 | 6 | 0.10 (0.10–0.20) |
| nest | Props | 656 | 7 | 7 | 0.20 (0.10–0.20) |
| street-lamps | Props | 560 | 35 | 35 | 0.30 (0.30–0.40) |
| larry | Characters | 504 | 7 | 7 | 1.30 (0.90–3.60) |
| tokonoma | Interiors | 492 | 7 | 7 | 0.40 (0.20–0.40) |
| scroll | Interiors | 492 | 7 | 7 | 0.40 (0.30–0.40) |
| bonsai | Interiors | 492 | 7 | 7 | 0.40 (0.30–0.40) |
| yarn | Items | 456 | 2 | 2 | 0.30 (0.10–0.30) |
| bamboo-fence | Props | 428 | 21 | 21 | 0.30 (0.20–0.40) |
| torii | Shrine | 380 | 17 | 17 | 0.20 (0.10–0.20) |
| chabudai | Interiors | 380 | 11 | 11 | 0.50 (0.40–0.80) |
| teaware | Interiors | 380 | 11 | 11 | 0.40 (0.30–0.50) |
| lotus | Hidden places | 378 | 21 | 21 | 0.90 (0.80–1.40) |
| offering-bells | Items | 368 | 3 | 3 | 0.20 (0.10–0.20) |
| bridge | Ground and water | 348 | 29 | 29 | 0.30 (0.20–0.50) |
| secret-door | Building components | 348 | 18 | 18 | 0.50 (0.40–0.50) |
| key | Items | 344 | 5 | 5 | 0.10 (0.10–0.10) |
| nest-eggs | Props | 336 | 3 | 3 | 0.10 (0.10–0.20) |
| jade-paw | Items | 296 | 2 | 2 | 0.90 (0.70–1.20) |
| roadside-moss | Vegetation | 296 | 1 | 1 | 0.20 (0.00–0.30) |
| secret-table | Interiors | 264 | 10 | 10 | 0.60 (0.40–0.70) |
| knockables | Interiors | 244 | 3 | 3 | 0.40 (0.30–0.40) |
| grass-moss | Vegetation | 242 | 1 | 1 | 0.10 (0.00–0.20) |
| wind-chime | Props | 224 | 4 | 4 | 0.10 (0.00–0.10) |
| key-rock | Ground and water | 216 | 3 | 3 | 0.10 (0.10–0.20) |
| upper-windows | Building components | 216 | 18 | 18 | 0.10 (0.10–0.20) |
| bamboo-groves | Vegetation | 206 | 3 | 3 | 0.20 (0.00–0.30) |
| paddy-bunds | Ground and water | 200 | 20 | 20 | 0.20 (0.20–0.30) |
| koushi | Building components | 180 | 15 | 15 | 0.10 (0.00–0.20) |
| shishi | Props | 164 | 6 | 6 | 0.10 (0.10–0.10) |
| path-shoulders | Ground and water | 160 | 1 | 1 | 0.10 (0.00–0.10) |
| lock-plate | Building components | 156 | 2 | 2 | 0.50 (0.40–0.80) |
| interior-fish | Items | 152 | 2 | 2 | 0.60 (0.30–0.60) |
| grass-susuki | Vegetation | 147 | 1 | 1 | 0.20 (0.10–0.30) |
| tatami | Interiors | 144 | 12 | 12 | 0.30 (0.30–0.50) |
| secret-tatami | Interiors | 144 | 12 | 12 | 0.40 (0.30–0.50) |
| path | Ground and water | 142 | 1 | 1 | 0.20 (0.10–0.30) |
| lily-pads | Hidden places | 126 | 9 | 9 | 0.90 (0.80–1.10) |
| river | Ground and water | 120 | 1 | 1 | 0.20 (0.10–0.20) |
| toro | Props | 108 | 6 | 6 | 0.10 (0.00–0.20) |
| chochin | Props | 100 | 6 | 6 | 0.00 (0.00–0.20) |
| pool-water | Hidden places | 96 | 2 | 2 | 1.00 (0.90–1.40) |
| guardian-crows | Characters | 93 | 5 | 5 | 1.40 (1.30–1.90) |
| secret-fish | Items | 92 | 2 | 2 | 0.40 (0.30–0.40) |
| crates | Props | 88 | 5 | 5 | 0.10 (0.00–0.10) |
| sparrows | Characters | 81 | 4 | 4 | 1.90 (1.70–2.10) |
| engawa | Building components | 72 | 6 | 6 | 0.10 (0.00–0.10) |
| grass-thicket | Vegetation | 71 | 1 | 1 | 0.10 (0.10–0.20) |
| timber-frame | Building components | 60 | 5 | 5 | 0.50 (0.40–0.60) |
| zabuton | Interiors | 60 | 5 | 5 | 0.30 (0.30–0.40) |
| courtyard-toro | Interiors | 48 | 4 | 4 | 0.40 (0.30–0.40) |
| corral-sign | Props | 42 | 3 | 3 | 0.70 (0.60–0.80) |
| sake-barrel | Props | 40 | 1 | 1 | 0.10 (0.00–0.10) |
| glade-lanterns | Hidden places | 40 | 1 | 1 | 0.90 (0.80–1.10) |
| glade-floor | Hidden places | 36 | 1 | 1 | 0.80 (0.70–0.90) |
| andon | Interiors | 36 | 3 | 3 | 0.30 (0.20–0.40) |
| secret-andon | Interiors | 36 | 3 | 3 | 0.30 (0.30–0.40) |
| grass-near | Vegetation | 27 | 1 | 1 | 0.20 (0.00–0.20) |
| cat-shadow | Cat components | 24 | 1 | 1 | 1.90 (1.50–2.00) |
| guardian-feather | Items | 24 | 2 | 2 | 0.10 (0.00–0.10) |
| grass-yarn | Vegetation | 23 | 1 | 1 | 0.10 (0.10–0.10) |
| grass-mid | Vegetation | 15 | 1 | 1 | 0.10 (0.10–0.20) |
| noren | Building components | 12 | 1 | 1 | 0.40 (0.30–0.50) |
| shoji-doors | Interiors | 12 | 1 | 1 | 0.40 (0.20–0.40) |
| grass-sumi | Vegetation | 11 | 1 | 1 | 0.10 (0.00–0.20) |
| grass-flowers | Vegetation | 9 | 1 | 1 | 0.20 (0.10–0.40) |
| dango | Items | 8 | 1 | 1 | 0.20 (0.10–0.20) |
| grass-lantern | Vegetation | 7 | 1 | 1 | 0.10 (0.10–0.20) |
| grass-far | Vegetation | 6 | 1 | 1 | 0.20 (0.10–0.20) |
| grass-mown | Vegetation | 5 | 1 | 1 | 0.10 (0.00–0.20) |
| butterflies | Characters | 0 | 1 | 1 | 1.30 (1.20–1.50) |
| pool-moon | Hidden places | 0 | 1 | 1 | 0.90 (0.70–0.90) |
| pool-motes | Hidden places | 0 | 1 | 1 | 0.80 (0.70–1.00) |
| glade-fireflies | Hidden places | 0 | 1 | 1 | 0.80 (0.80–0.90) |

</details>
