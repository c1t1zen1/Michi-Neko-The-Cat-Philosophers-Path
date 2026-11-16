This folder holds the inspiration images shown throughout the repository README. They are **concept/inspiration art** — the look the game's design plans to grow into — not in-game alpha captures.

Use descriptive kebab-case scenery names that match what the image actually shows (e.g. `cat-rooftop-pagoda-sunset.jpg`). Current images:

- `title-screen.jpg` — the title screen concept: main menu over the Kyoto valley, machiya rooftops and pagoda at golden hour
- `cat-at-torii-gate-golden-hour.jpg` — Michi-Neko on a stone wall before the vermilion torii gate at golden hour, with a shrine bell and stone lanterns
- `cat-rooftop-pagoda-sunset.jpg` — Michi-Neko prowling a rooftop at sunset, a five-story pagoda over the Kyoto skyline
- `lantern-lit-village-path-dusk.jpg` — a lantern-lit stone path through the village at dusk, cherry blossoms and machiya townhouses
- `tea-ceremony-room.jpg` — the tea house interior concept: tatami, scroll, bonsai, lantern light, and grilled sea bream on the table

Superseded by the hero captures below (the six files were removed in lane h1-hero):

- `capture-in-game.jpg` — a real in-game frame from a headless full boot: the machiya lane, Michi, Luna and Kuro
- `capture-villagers.jpg` — the `npcs` cat sheet: Luna (silver), Mochi (ginger), Kuro (black)
- `capture-landmarks.jpg` — the `landmarks` town sheet: torii, shrine, tea house, craftsman residence
- `capture-street.jpg` — the `street` town sheet: namako walls, toro lanterns, fences
- `capture-hidden-places.jpg` — the `hidden_preview` sheet: Moon Pool and Lantern Glade by day and night

The sheet captures render the real `Cat`, `Countryside` and `HiddenPlaces` classes without the in-game post-processing; regenerate them with the sheets in `tools/`.

Also not concept art:

- `cobble-before-after.png` — a side-by-side of the cobblestone ground texture before and after the tiling rework, kept as a reference for what the current stones should look like

Tip: press **P** in-game to open Photo Mode, orbit to a nice composition, and capture.

Any JPG/PNG under ~1 MB each works well (keeps the README fast to load).

## Hero captures (lane h1-hero, 2026-11-16, game code at 9c7f490)

Real frames, none painted over or composited (decision D8). Masters are 2560x1440 PNGs kept outside the repo; these JPGs are 1600 px wide. Every shot is one entry of `hero/shots.json`; `node tools/hero_capture.mjs --list` lists them, `--only <id>` reshoots one, `--preview` makes a 1600x900 look-see, `--diff <id>` shoots twice and prints maxDelta. Needs `PLAYWRIGHT_MODULE` (Playwright outside the repo); Metal on the Mac. Game-page shots are `?shot=1&nohud=1` frame 120 (fixed step, seeded): two runs of `02-torii-dusk` diff at maxDelta 0. The summit, Roof Road and sheet pages run on wall-time clocks, so repeats keep the composition but differ in drift (`09-summit-seat-dawn` maxDelta 219 between runs).

| File | Shot id | Kind | Shows | Command |
|---|---|---|---|---|
| `hero-valley-golden-hour.jpg` | 01-valley-golden-hour | capture (game, ?assets=modular) | The valley at golden hour, pagoda beyond the roofs | `node tools/hero_capture.mjs --only 01-valley-golden-hour` |
| `hero-torii-dusk.jpg` | 02-torii-dusk | capture (game, ?assets=modular) | Michi at the torii as the lanterns kindle | `node tools/hero_capture.mjs --only 02-torii-dusk` |
| `hero-machiya-lane-rain.jpg` | 03-lane-rain | capture (game, ?assets=modular) | The machiya lane in the rain, at cat height | `node tools/hero_capture.mjs --only 03-lane-rain` |
| `hero-river-morning-mist.jpg` | 04-river-morning | capture (game, ?assets=modular) | River bank in morning mist, the pagoda over the trees | `node tools/hero_capture.mjs --only 04-river-morning` |
| `hero-moon-pool-night.jpg` | 05-moon-pool-night | capture (game, ?assets=modular) | Michi at the Moon Pool at night | `node tools/hero_capture.mjs --only 05-moon-pool-night` |
| `hero-lantern-glade.jpg` | 06-lantern-glade | capture (game, ?assets=modular) | Lantern Glade, lanterns lit | `node tools/hero_capture.mjs --only 06-lantern-glade` |
| `hero-tea-house-interior.jpg` | 07-tea-house-interior | capture (game, ?assets=modular) | The tea house interior, low sun through the shoji | `node tools/hero_capture.mjs --only 07-tea-house-interior` |
| `hero-villagers.jpg` | 08-villagers | review-sheet capture (tools/cat_preview.html?sheet=npcs) | Luna, Mochi and Kuro | `node tools/hero_capture.mjs --only 08-villagers` |
| `hero-summit-seat-dawn.jpg` | 09-summit-seat-dawn | capture (tools/summit_preview.html, real SummitManager) | The meditation seat above the Kyoto basin, early morning | `node tools/hero_capture.mjs --only 09-summit-seat-dawn` |
| `hero-summit-vista-dusk.jpg` | 10-summit-vista-dusk | capture (tools/summit_preview.html, real SummitManager) | The summit vista at dusk | `node tools/hero_capture.mjs --only 10-summit-vista-dusk` |
| `hero-roof-road-michi-chidori.jpg` | 11-roof-road-michi-chidori | capture (/kyoto-rooftops.html sandbox) | Roof Road: Michi and Chidori on the ridge | `node tools/hero_capture.mjs --only 11-roof-road-michi-chidori` |
| `hero-roof-road-okuribi.jpg` | 12-roof-road-finale | capture (/kyoto-rooftops.html sandbox) | Roof Road finale: the five Okuribi fires | `node tools/hero_capture.mjs --only 12-roof-road-finale` |
| `hero-parts-sheet-toro.jpg` | 13-parts-toro | PARTS SHEET: real game frame, kit instance exploded by script | Parts sheet: the stone lantern (toro) exploded into its eight named parts | `node tools/hero_capture.mjs --only 13-parts-toro` |
| `hero-before-classic.jpg` | 14a-before-classic | before/after pair, two separate real frames | Before: the classic set | `node tools/hero_capture.mjs --only 14a-before-classic` |
| `hero-after-modular.jpg` | 14b-after-modular | before/after pair, two separate real frames | After: the modular kit, same camera | `node tools/hero_capture.mjs --only 14b-after-modular` |

Cat staging in some game shots (`eval` in shots.json) only places Michi with `game.player`; nothing is drawn. Shot 12 hides the finale result panel (`#finale`) for the frame. Shot 13 builds a fresh `asset:toro` kit instance in the running game and lifts each named part (kiso, sao, chudai, hibukuro, lamp, halo, kasa, hoju) by height order; it is labelled a parts sheet.

The older concept art above is unchanged. The `capture-*.jpg` files of 2026-10-23 are replaced by the hero files (list in `docs/fable/handoff/h1-hero.md`).
