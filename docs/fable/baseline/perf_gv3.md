# Gate G-V3 performance: every village family on modular

Gate G-V3 (guide §9): "performance re-measured at the four spots on all three
tiers and compared with the budgets". Same-session measurement against
`budgets.md` sections 1 and 2, taken by the G-V3 chores (Integrator delegate)
on `fable/integration` at `ca3a6b0` (day run, attribution) and `b97a553`
(night run, build-time re-check; the same game code with the cache tag bumped).

**What `?assets=modular` turns on.** All 24 families in `src/kit/index.js`
(140 asset ids): the eight wave-2.1 families, the five wave-2.2 families
(shrine, machiya, pagoda, hidden, interiors), the seven wave-2.3 families
(ground, water, ranges, sky, weather, trees, critters), creatures, and the
summit's clearing, vista and summitlife. `kit-overrides.json` as committed
(R49: `edge-forest` stays classic). 261 kit instances in a valley boot.

**Machine and load.** Apple M5 Max, headless Chromium 153 on Metal
(`ANGLE Metal`), 1200 × 750, clear weather, perf_spots' four fixed spots.
The swarm was paused for these items (ruling R54; one read-only code reviewer
left). The machine was **not** idle: processes outside the swarm ran
throughout (a resident 65B `llama-server` on the GPU, the Devin IDE renderer
at up to 120 % CPU, WindowServer, QuickTime, an RDP client, short Blender
jobs, the operator's own `rooftop_browser_test`). The 1-minute load average
at boot starts was 1.5 to 5.5 (each table lists it). Render-only GPU time was
about twice the G-V1 figure for classic as well (street medium 5.0 against
2.2 ms), so absolute frame times here are not comparable with `perf.md` or
`perf_gv1.md`; the same-session classic against modular comparison is.

```sh
export PLAYWRIGHT_MODULE=/Users/c1t1zen/.npm/_npx/e41f203b7505f1fb/node_modules/playwright
node tools/perf_spots.mjs --boots 2 --rounds 3 --url-suffix "" --url-suffix "?assets=modular" --out perf_gv3_day.json
node tools/perf_spots.mjs --hour 22 --spots street,shrine --boots 2 --rounds 3 --url-suffix "" --url-suffix "?assets=modular" --out perf_gv3_night.json
```

Raw data (outside the repo, ruling R8): `michi-wt/_scratch/gate-v3-chores/`
(`perf_gv3_day.json`, `perf_gv3_night.json`, `attr_street_high.json`,
`build_integ.json`, `build_main.json`, their logs, and `summ.mjs` /
`attr_summ.mjs`, which print the tables below).

## Day (hour 10.5): four spots, three tiers, 2 boots × 3 rounds

Per-frame means (calls, triangles) and amortised frame ms (budgets.md "Use
amortised values"), medians of the two boots; render-only ms is
`composer.render()` 30 times back to back (GPU-bound).

| Spot | Tier | Set | Calls mean (boot min–max) | Tris mean | Frame ms amortised (boot min–max) | p90 | Render-only ms | Load 1-min at boot starts |
|---|---|---|---:|---:|---:|---:|---:|---|
| street | low | classic | 514 (502–525) | 5.05 M | 8.68 (8.35–9.00) | 10.05 | 4.07 | 1.52, 2.96 |
| street | low | ?assets=modular | 330 (320–339) | 4.27 M | 8.57 (8.20–8.95) | 9.91 | 4.26 | 5.39, 2.99 |
| street | medium | classic | 589 (581–596) | 6.04 M | 11.43 (10.92–11.95) | 13.55 | 5.01 | 2.56, 3.26 |
| street | medium | ?assets=modular | 442 (439–444) | 5.75 M | 13.10 (12.95–13.25) | 15.45 | 6.64 | 5.47, 3.36 |
| street | high | classic | 768 (767–769) | 8.12 M | 15.85 (15.80–15.90) | 17.55 | 8.89 | 2.15, 4.25 |
| street | high | ?assets=modular | 583 (582–584) | 8.81 M | 17.50 (17.40–17.60) | 19.30 | 10.57 | 5.11, 3.76 |
| shrine | low | classic | 258 (257–258) | 4.12 M | 7.65 (7.55–7.75) | 9.15 | 3.50 | 1.52, 2.96 |
| shrine | low | ?assets=modular | 204 (203–204) | 3.54 M | 7.81 (7.45–8.17) | 9.40 | 3.72 | 5.39, 2.99 |
| shrine | medium | classic | 310 (309–311) | 5.03 M | 10.38 (9.40–11.35) | 12.70 | 4.74 | 2.56, 3.26 |
| shrine | medium | ?assets=modular | 277 (276–277) | 4.86 M | 11.54 (10.70–12.38) | 13.50 | 5.60 | 5.47, 3.36 |
| shrine | high | classic | 455 (454–455) | 7.08 M | 14.10 (13.50–14.70) | 15.60 | 8.93 | 2.15, 4.25 |
| shrine | high | ?assets=modular | 415 (413–417) | 7.72 M | 15.35 (14.70–16.00) | 17.51 | 9.85 | 5.11, 3.76 |
| river | low | classic | 409 (390–427) | 4.22 M | 8.82 (8.48–9.15) | 10.25 | 3.61 | 1.52, 2.96 |
| river | low | ?assets=modular | 275 (274–275) | 3.67 M | 7.87 (7.85–7.88) | 9.45 | 4.37 | 5.39, 2.99 |
| river | medium | classic | 509 (504–513) | 5.09 M | 11.19 (10.25–12.13) | 12.85 | 4.93 | 2.56, 3.26 |
| river | medium | ?assets=modular | 357 (334–379) | 4.90 M | 11.09 (10.83–11.35) | 13.10 | 6.11 | 5.47, 3.36 |
| river | high | classic | 678 (675–680) | 6.93 M | 14.88 (14.55–15.20) | 16.15 | 8.94 | 2.15, 4.25 |
| river | high | ?assets=modular | 548 (543–552) | 7.55 M | 14.80 (14.80–14.80) | 16.10 | 9.84 | 5.11, 3.76 |
| meadow | low | classic | 483 (483–483) | 4.73 M | 8.90 (8.60–9.20) | 10.40 | 3.91 | 1.52, 2.96 |
| meadow | low | ?assets=modular | 335 (334–335) | 4.02 M | 8.72 (8.70–8.75) | 10.30 | 4.31 | 5.39, 2.99 |
| meadow | medium | classic | 557 (556–557) | 5.64 M | 11.02 (10.45–11.60) | 12.61 | 4.78 | 2.56, 3.26 |
| meadow | medium | ?assets=modular | 433 (432–434) | 5.39 M | 11.57 (11.55–11.60) | 13.40 | 5.63 | 5.47, 3.36 |
| meadow | high | classic | 732 (732–732) | 7.53 M | 15.75 (14.70–16.80) | 17.91 | 9.22 | 2.15, 4.25 |
| meadow | high | ?assets=modular | 581 (581–581) | 8.24 M | 17.50 (16.70–18.30) | 18.85 | 10.98 | 5.11, 3.76 |

**Rules (budgets.md section 1), same session:**

| Spot | medium modular calls ≤ classic high | medium tris ≤ classic high | medium frame ≤ classic high | high calls ≤ 1.2× | high tris ≤ 1.3× | high frame ≤ 1.2× | R52 calls ≤ classic same tier (low/med/high) | Δ frame medium / high (ms) |
|---|---|---|---|---|---|---|---|---|
| street | 442 ≤ 768 holds | 5.75 ≤ 8.12 holds | 13.10 ≤ 15.85 holds | 0.76× holds | 1.085× holds | 1.10× holds | 330/514 · 442/589 · 583/768 | 1.67 / 1.65 |
| shrine | 277 ≤ 455 holds | 4.86 ≤ 7.08 holds | 11.54 ≤ 14.10 holds | 0.91× holds | 1.090× holds | 1.09× holds | 204/258 · 277/310 · 415/455 | 1.16 / 1.25 |
| river | 357 ≤ 678 holds | 4.90 ≤ 6.93 holds | 11.09 ≤ 14.88 holds | 0.81× holds | 1.089× holds | 0.99× holds | 275/409 · 357/509 · 548/678 | -0.10 / -0.07 |
| meadow | 433 ≤ 732 holds | 5.39 ≤ 7.53 holds | 11.57 ≤ 15.75 holds | 0.79× holds | 1.094× holds | 1.11× holds | 335/483 · 433/557 · 581/732 | 0.55 / 1.75 |

**Verdict, section 1: every rule holds at every spot.** Modular medium is
below classic high in draw calls (277 to 442 against 455 to 768), triangles
(4.86 to 5.75 M against 6.93 to 8.12 M) and frame time; modular high stays
inside 1.2 × (calls 0.76 to 0.91 ×, frame 0.99 to 1.10 ×) and 1.3 ×
(triangles 1.085 to 1.094 ×). **R52 holds on every tier**: modular draws are
below classic at every spot (low −54 to −184, medium −33 to −152, high −40 to
−185 calls a frame).

## Night (hour 22): street and shrine, three tiers

| Spot | Tier | Set | Calls mean (boot min–max) | Tris mean | Frame ms amortised (boot min–max) | p90 | Render-only ms | Load 1-min at boot starts |
|---|---|---|---:|---:|---:|---:|---:|---|
| street | low | classic | 492 (491–492) | 4.99 M | 8.65 (8.65–8.65) | 10.05 | 3.59 | 2.58, 2.71 |
| street | low | ?assets=modular | 327 (318–335) | 4.27 M | 10.07 (9.65–10.48) | 15.55 | 5.19 | 2.27, 4.74 |
| street | medium | classic | 569 (567–570) | 6.06 M | 11.70 (11.30–12.10) | 13.95 | 5.36 | 2.45, 2.26 |
| street | medium | ?assets=modular | 437 (428–445) | 5.73 M | 13.01 (12.85–13.17) | 15.96 | 10.56 | 3.36, 4.06 |
| street | high | classic | 719 (712–725) | 8.15 M | 16.75 (15.60–17.90) | 18.05 | 10.69 | 2.61, 4.83 |
| street | high | ?assets=modular | 573 (571–574) | 8.83 M | 18.52 (17.35–19.70) | 21.85 | 11.60 | 3.36, 4.74 |
| shrine | low | classic | 266 (265–266) | 4.11 M | 7.88 (7.85–7.90) | 9.65 | 3.10 | 2.58, 2.71 |
| shrine | low | ?assets=modular | 206 (205–207) | 3.54 M | 9.18 (9.00–9.35) | 11.05 | 3.99 | 2.27, 4.74 |
| shrine | medium | classic | 321 (320–321) | 5.04 M | 10.57 (9.90–11.25) | 12.55 | 5.01 | 2.45, 2.26 |
| shrine | medium | ?assets=modular | 285 (284–285) | 4.86 M | 11.94 (11.60–12.28) | 14.05 | 6.15 | 3.36, 4.06 |
| shrine | high | classic | 469 (467–471) | 7.07 M | 14.65 (14.20–15.10) | 15.75 | 9.08 | 2.61, 4.83 |
| shrine | high | ?assets=modular | 428 (426–429) | 7.68 M | 15.50 (14.80–16.20) | 16.85 | 10.57 | 3.36, 4.74 |

| Spot | medium modular calls ≤ classic high | medium tris ≤ classic high | medium frame ≤ classic high | high calls ≤ 1.2× | high tris ≤ 1.3× | high frame ≤ 1.2× | R52 calls ≤ classic same tier (low/med/high) | Δ frame medium / high (ms) |
|---|---|---|---|---|---|---|---|---|
| street | 437 ≤ 719 holds | 5.73 ≤ 8.15 holds | 13.01 ≤ 16.75 holds | 0.80× holds | 1.083× holds | 1.11× holds | 327/492 · 437/569 · 573/719 | 1.31 / 1.77 |
| shrine | 285 ≤ 469 holds | 4.86 ≤ 7.07 holds | 11.94 ≤ 14.65 holds | 0.91× holds | 1.087× holds | 1.06× holds | 206/266 · 285/321 · 428/469 | 1.37 / 0.85 |

**Verdict, night: every rule holds** (medium calls 437 / 285 against classic
high 719 / 469; high frame 1.11 × / 1.06 ×; R52 draws below classic on every
tier). Street medium boot 1 on modular stalled in its render-only reps (23 to
26 ms, a contention spike); boot 2 reads 6.93 against classic 5.15 to 5.56 ms.

## Frame-time regressions over 1 ms (medium / high): attribution

Modular is slower than classic by more than 1 ms at street (day +1.67 medium,
+1.65 high; night +1.31, +1.77), shrine (day +1.16, +1.25; night +1.37
medium) and meadow high (day +1.75). River is flat (−0.10 / −0.07). These do
not break a rule (modular medium stays below classic high everywhere, modular
high within 1.2 ×), but the brief asks for each one to be attributed.

**Method.** Street, quality high (the spot with the regression on both
tiers): classic, all-modular, and all-modular with one family switched back
to classic (`?assets=modular&swap=<every id of the family>:classic`), 2 boots
× 3 rounds each, one session, boots interleaved:

```sh
node tools/perf_spots.mjs --tiers high --spots street --boots 2 --rounds 3 \
  --url-suffix "" --url-suffix "?assets=modular" \
  --url-suffix "?assets=modular&swap=valley-ground:classic,path:classic,…" …   # one per family
```

The machine's load rose to 8.5 during this run (Blender jobs outside the
swarm started), so single boots stalled: one boot each of "− ranges",
"− machiya" and "− greenery" read 48 to 70 ms. Read a family as a cause only
when both boots move the same way, in frame time **and** in the GPU-bound
render-only time. "small" is alley, garden, rocks, nest, keepsakes and
creatures together; "summit" is clearing, vista and summitlife (built in a
valley boot, seen only at the summit).

| Config (street, high) | Frame ms amortised (boots) | Δ vs all-modular | Render-only ms (boots) | Δ render | Loop CPU ms | Calls | Tris | World build ms (boots) | Δ build vs all-modular | Load at boot starts |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| classic | 16.20 (15.7, 16.7) | -1.25 | 8.99 (8.88, 9.11) | -1.86 | 3.58 | 764 | 8.07 M | 1743 (1565, 1920) | -637 | 2.00, 3.91 |
| modular (all) | 17.45 (16.8, 18.1) | 0.00 | 10.85 (10.22, 11.49) | 0.00 | 3.10 | 597 | 8.88 M | 2380 (2279, 2481) | 0 | 3.88, 5.13 |
| modular − ground | 16.30 (15.7, 16.9) | -1.15 | 9.83 (9.57, 10.08) | -1.03 | 3.10 | 582 | 8.80 M | 2178 (2054, 2302) | -202 | 4.01, 4.23 |
| modular − sky | 17.30 (16.3, 18.3) | -0.15 | 11.49 (10.42, 12.56) | 0.64 | 3.05 | 600 | 8.88 M | 2572 (2095, 3049) | 192 | 3.42, 6.59 |
| modular − water | 16.65 (16.5, 16.8) | -0.80 | 10.27 (10.25, 10.29) | -0.58 | 3.00 | 589 | 8.81 M | 2669 (2162, 3176) | 289 | 3.07, 8.50 |
| modular − weather | 17.10 (16.3, 17.9) | -0.35 | 11.28 (10.49, 12.08) | 0.43 | 3.05 | 588 | 8.82 M | 2162 (2197, 2126) | -218 | 2.90, 6.56 |
| modular − trees | 17.45 (16.4, 18.5) | -0.00 | 11.41 (10.56, 12.27) | 0.56 | 3.10 | 586 | 8.79 M | 2272 (2039, 2506) | -108 | 3.31, 5.22 |
| modular − ranges | 18.15 (17.7, 18.6) | 0.70 | 30.48 (48.55, 12.42) | 19.63 | 3.10 | 560 | 8.93 M | 2487 (2201, 2773) | 107 | 3.30, 4.81 |
| modular − machiya | 40.55 (64.2, 16.9) | 23.10 | 32.99 (55.79, 10.20) | 22.14 | 3.20 | 694 | 8.65 M | 2113 (1913, 2312) | -267 | 2.34, 4.63 |
| modular − greenery | 43.35 (70.0, 16.7) | 25.90 | 32.10 (53.64, 10.56) | 21.24 | 2.90 | 592 | 8.86 M | 1954 (1825, 2083) | -425 | 1.67, 4.04 |
| modular − fences | 16.70 (16.8, 16.6) | -0.75 | 10.24 (10.46, 10.02) | -0.61 | 3.00 | 587 | 8.50 M | 2003 (1979, 2027) | -377 | 1.78, 3.50 |
| modular − critters | 16.85 (17.3, 16.4) | -0.60 | 10.86 (10.71, 11.00) | 0.00 | 2.95 | 579 | 8.83 M | 2166 (2192, 2139) | -214 | 1.84, 3.35 |
| modular − hidden | 18.65 (16.8, 20.5) | 1.20 | 11.46 (10.40, 12.52) | 0.61 | 3.55 | 604 | 8.76 M | 2161 (2088, 2234) | -219 | 2.04, 3.51 |
| modular − lanterns | 17.60 (16.9, 18.3) | 0.15 | 10.93 (10.61, 11.26) | 0.08 | 3.15 | 590 | 8.80 M | 2605 (2131, 3080) | 226 | 2.42, 6.46 |
| modular − shrine | 17.40 (16.9, 17.9) | -0.05 | 11.26 (10.76, 11.75) | 0.40 | 3.00 | 592 | 8.80 M | 2242 (2073, 2412) | -137 | 2.27, 5.63 |
| modular − pagoda | 17.60 (16.9, 18.3) | 0.15 | 11.24 (10.58, 11.89) | 0.38 | 3.10 | 637 | 8.76 M | 2732 (3049, 2415) | 352 | 2.20, 5.10 |
| modular − interiors | 17.30 (16.5, 18.1) | -0.15 | 11.10 (10.56, 11.64) | 0.25 | 2.90 | 585 | 8.80 M | 2454 (2100, 2807) | 74 | 2.42, 5.87 |
| modular − small | 17.85 (17.3, 18.4) | 0.40 | 11.38 (10.50, 12.25) | 0.52 | 3.05 | 575 | 8.60 M | 2574 (2017, 3131) | 194 | 2.26, 6.24 |
| modular − summit | 18.50 (18.2, 18.8) | 1.05 | 11.56 (10.93, 12.19) | 0.70 | 3.15 | 575 | 8.77 M | 2235 (2045, 2426) | -144 | 2.08, 5.48 |

**Findings.**

- **`ground` (v-ground) is the largest single cost**: switching it off saves
  1.15 ms a frame and 1.03 ms of GPU render time, both boots agreeing
  (render 9.57 / 10.08 against 10.22 / 11.49 ms), with almost no change in
  calls (−15) or triangles (−0.08 M). That is fragment cost: the one ground
  material (`src/kit/ground/material.js`: height blend, 3-tap hex-tiled
  sampler, procedural pavings, wear, wetness, macro noise; POM and puddles on
  hero only) shades most of the screen at street. It is the expected price of
  the lane's look, not a defect. Medium already drops POM and puddles; to
  close the medium gap `a1-village` could give medium the far tier's 2-tap
  sampler, or drop the fringe and macro noise there.
- **`water` (v-water)**: −0.80 ms frame, −0.58 ms render, both boots agreeing
  (10.25 / 10.29). The river and paddies are in view from the street spot.
- **`fences` (v-fences)**: −0.75 ms frame, −0.61 ms render, and −0.38 M
  triangles: the hero bamboo fences are merged valley-wide (budgets.md
  "merged statics are not culled per object") and drawn with their shadows
  from every spot; R51's 11 m runs make them the biggest kit triangle source.
- Every other family moves the frame by less than the boot-to-boot noise
  (±0.6 ms) or in the wrong direction; none shows a consistent render-time
  saving. The machiya-b fence/skirt merge (R53) is not a cost: see budgets.md
  section 4, "Ruling R53".
- Ground + water + fences explain the ~1.25 ms (frame) and ~1.9 ms (render)
  gap at street high in this run; the three overlap with noise, so the sum
  (2.7 ms) overshoots.

## World build (budgets.md section 2): the rule FAILS on modular

The day run's build times (2 boots per set and tier, load 1.5 to 5.5):

| Set | Tier | World ready ms (min–max) | World build ms | Boot total ms |
|---|---|---:|---:|---:|
| classic | low | 1819 (1755–1883) | 1302 | 2531 |
| classic | medium | 2486 (2383–2590) | 1722 | 3412 |
| classic | high | 1932 (1892–1973) | 1369 | 2856 |
| ?assets=modular | low | 3054 (2167–3940) | 2016 | 3928 |
| ?assets=modular | medium | 3968 (3280–4657) | 2807 | 4936 |
| ?assets=modular | high | 2950 (2929–2971) | 2234 | 3661 |

Because those boots were spread over a load of 1.5 to 5.5, the build time
was re-measured on its own: 4 boots per set and tier, interleaved, street
only, minimal frames, load 2.3 to 4.3 (`b97a553`):

```sh
node tools/perf_spots.mjs --tiers medium,high --spots street --boots 4 --rounds 1 --frames 20 --warmup 200 \
  --url-suffix "" --url-suffix "?assets=modular" --out build_integ.json
```

| Tier | Classic world build / ready / boot total (ms, median of 4) | Modular world build / ready / boot total | Ratio build / ready, boot Δ | Rule (budgets.md §2) |
|---|---|---|---|---|
| medium | 1,316 / 1,852 / 2,605 | 2,262 / 3,016 / 3,807 | 1.72 × / 1.63 ×, +1,202 ms | ≤ 1.25 ×, boot ≤ +1,000 ms: **fails** |
| high | 1,389 / 1,927 / 2,734 | 2,414 / 3,144 / 3,953 | 1.74 × / 1.63 ×, +1,219 ms | ≤ 1.25 ×, boot ≤ +1,000 ms: **fails** |

The lowest-load pair (classic 1,215 ms at load 2.37, modular 1,986 ms at
2.40, medium) is still 1.63 ×, so this is not load noise. At G-V1 (nine
families) the same rule held at 1.19 × / 1.07 ×; it has grown with every
wave since, as perf_gv1.md warned ("watch it as wave 2.2 adds families").

**Classic has not slowed.** MAIN (`414225f`, the game code `main` ships
today; `a3221d4` only adds `Shinkansen/`), classic, same settings, run right
after: world build 1,744 (medium) / 1,883 (high) ms at load 4.2 to 4.9,
against `fable/integration` classic 1,316 / 1,389 at load 2.3 to 4.2. The
two are not one session, but integration's classic is not slower than
MAIN's. The rise against `perf.md` (896 ms) is today's machine: the classic
first frame is also 520 to 860 ms against 390 at Phase 0.

**Where the modular build time goes.** One modular boot per tier, summing
each kit instance's own `buildMs` (AssetRuntime records it; 261 instances;
first builds, so texture painting and field baking are in them; load about
3.5):

| Family | medium (two boots) | high | Largest instances (medium) |
|---|---:|---:|---|
| ground | 213 / 266 | 263 | `valley-ground` 199 / 251 (the 262k-texel GroundField and the height copy) |
| fences | 115 / 137 | 139 | `corral-sign` 38 / 45 (its painted face), 11 m fence runs |
| sky | 88 / 107 | 118 | `clouds` 65 / 81, `moon` 22 / 23 |
| machiya | 59 / 73 | 98 | 62 instances |
| trees | 59 / 68 | 142 | 25 instances (hero leaf sprays on high) |
| hidden | 56 / 68 | 73 | `moon-pool` 52 / 63 |
| ranges | 39 / 47 | 48 | `mountains` 20 / 24, `foothill-forest` 14 / 16 |
| greenery | 32 / 36 | 42 | `street-bushes` 30 / 34 |
| all 24 families | **845 / 1,031** | **1,229** | |

These are gross kit costs (the classic builders they replace cost something
too), but they match the ~950 ms gap. Six assets alone take ~420 ms on
medium: `valley-ground`, `clouds`, `moon-pool`, `corral-sign`,
`street-bushes`, `moon`. For `a1-village` (and the owning families): cache or
defer the ground field bake, the cloud deck, the moon pool and the sign
face; none of these needs to exist before the first frame at full detail.

**What this means for the merge to `main`.** The default set stays
`classic` (`settings.assetSet`), and quality `low` never loads the kit (next
section), so a player on default settings builds the classic world exactly as
on MAIN. Modular is opt-in (`?assets=modular` or the setting). The rule is
still a budget rule and it fails, so the chores do **not** tick G-V3; the
Integrator (or the operator) rules whether to merge with modular opt-in and
the build-time work owned by `a1-village`, or to hold.

## Low never loads the kit (the low rule)

Saved settings `{"quality":"low","assetSet":"modular"}`, no URL flag, at
`b97a553`:

```
node tools/headless.mjs /index.html --session catwalk_autostart=new \
  --local 'catwalk_settings_v1={"quality":"low","assetSet":"modular"}' \
  --wait "window.game?._bootDissolved && game.menu.isPlaying" --eval "…"
→ {"quality":"low","stored":"modular","set":"classic","loaded":false,"instances":0,
   "kitScripts":["…/src/kit/runtime.js?v=20261114a","…/src/kit/rng.js?v=20261114a",
                 "…/src/kit/contract.js?v=20261114a","…/src/kit/audio.js?v=20261114a"]}
```

The four kit scripts are `main.js`'s static imports (the runtime and what it
imports; `audio.js` since t3-audio). No family module, `materials.js` or
`kit-overrides.json` was requested; nothing was built. **Holds.**

## Against G-V1

| | G-V1 (9 families) | G-V3 (24 families) |
|---|---|---|
| Medium calls, modular − classic | −6 to −71 | −33 to −152 |
| High triangles, modular / classic | 1.073 × worst | 1.094 × worst |
| High frame, modular / classic | 1.04 × worst | 1.11 × worst |
| Medium world build, modular / classic | 1.19 × | 1.72 × (**over 1.25 ×**) |
