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

## Hero captures (lane h1-hero, 2026-11-16)

Real frames, none painted over or composited (decision D8). Masters are 2560x1440 PNGs kept outside the repo; these JPGs are 1600 px wide. Every shot is one entry of `hero/shots.json`; `node tools/hero_capture.mjs --list` lists them, `--only <id>` reshoots one, `--preview` makes a 1600x900 look-see, `--diff <id>` shoots twice and prints maxDelta. Needs `PLAYWRIGHT_MODULE` (Playwright outside the repo); Metal on the Mac. The game code (src/) is the same in every commit named below (9c7f490's); the Commit column is the h1-hero commit whose `shots.json` and tool produced the file. Game-page shots are `?shot=1&nohud=1` frame 120 (fixed step, seeded) and repeat at maxDelta 0 (05, 08 too) or a few pixels (04: 54 pixels over 8). The summit, Roof Road and title pages run on wall-time clocks, so repeats keep the composition but differ in drift (09: 216, 11: 193, 12: 233).

| File | Shot id | Commit | Kind | Shows | Command |
|---|---|---|---|---|---|
| `hero-title-menu.jpg` | 00-title-menu | cb21a20 | capture (live title menu, /index.html) | The live title menu | `node tools/hero_capture.mjs --only 00-title-menu` |
| `hero-valley-golden-hour.jpg` | 01-valley-golden-hour | d5e9ad9 | capture (game, ?assets=modular) | The valley at golden hour, pagoda beyond the roofs | `node tools/hero_capture.mjs --only 01-valley-golden-hour` |
| `hero-torii-dusk.jpg` | 02-torii-dusk | d5e9ad9 | capture (game, ?assets=modular) | Michi at the torii as the lanterns kindle | `node tools/hero_capture.mjs --only 02-torii-dusk` |
| `hero-machiya-lane-rain.jpg` | 03-lane-rain | d5e9ad9 | capture (game, ?assets=modular) | The machiya lane in the rain, at cat height | `node tools/hero_capture.mjs --only 03-lane-rain` |
| `hero-river-morning.jpg` | 04-river-morning | cb21a20 | capture (game, ?assets=modular) | River bank in morning light, Michi and Kuro, the pagoda over the trees | `node tools/hero_capture.mjs --only 04-river-morning` |
| `hero-moon-pool-night.jpg` | 05-moon-pool-night | cb21a20 | capture (game, ?assets=modular) | Michi at the Moon Pool at night | `node tools/hero_capture.mjs --only 05-moon-pool-night` |
| `hero-lantern-glade.jpg` | 06-lantern-glade | d5e9ad9 | capture (game, ?assets=modular) | Lantern Glade, lanterns lit | `node tools/hero_capture.mjs --only 06-lantern-glade` |
| `hero-tea-house-interior.jpg` | 07-tea-house-interior | d5e9ad9 | capture (game, ?assets=modular) | The tea house interior, low sun through the shoji | `node tools/hero_capture.mjs --only 07-tea-house-interior` |
| `hero-villagers.jpg` | 08-villagers | cb21a20 | review-sheet capture (tools/cat_preview.html?sheet=npcs&golden=1) | Luna, Mochi and Kuro | `node tools/hero_capture.mjs --only 08-villagers` |
| `hero-summit-seat-morning.jpg` | 09-summit-seat-morning | cb21a20 | capture (tools/summit_preview.html, real SummitManager) | The meditation seat above the Kyoto basin, morning (the summit sky has no true dawn: 5.7-6.0 h reads as blue night, 6.4 h as bright day) | `node tools/hero_capture.mjs --only 09-summit-seat-morning` |
| `hero-summit-vista-dusk.jpg` | 10-summit-vista-dusk | d5e9ad9 | capture (tools/summit_preview.html, real SummitManager) | The summit vista at dusk | `node tools/hero_capture.mjs --only 10-summit-vista-dusk` |
| `hero-roof-road-michi-chidori.jpg` | 11-roof-road-michi-chidori | cb21a20 | capture (/kyoto-rooftops.html sandbox) | Roof Road: Michi and Chidori on the ridge at dusk, pagoda on the skyline | `node tools/hero_capture.mjs --only 11-roof-road-michi-chidori` |
| `hero-roof-road-okuribi.jpg` | 12-roof-road-finale | cb21a20 | capture (/kyoto-rooftops.html sandbox) | Roof Road finale: the five Okuribi fires | `node tools/hero_capture.mjs --only 12-roof-road-finale` |
| `hero-parts-sheet-toro.jpg` | 13-parts-toro | d5e9ad9 | PARTS SHEET: real game frame, kit instance exploded by script | Parts sheet: the stone lantern (toro) exploded into its eight named parts | `node tools/hero_capture.mjs --only 13-parts-toro` |
| `hero-before-classic.jpg` | 14a-before-classic | d5e9ad9 | before/after pair, two separate real frames | Before: the classic set | `node tools/hero_capture.mjs --only 14a-before-classic` |
| `hero-after-modular.jpg` | 14b-after-modular | d5e9ad9 | before/after pair, two separate real frames | After: the modular kit, same camera | `node tools/hero_capture.mjs --only 14b-after-modular` |

Staging (`eval`/`after` in shots.json) only places Michi with `game.player`, hides DOM overlays (Kuro's greeting box in 04, the finale panel in 12) or, in the sandbox (11, 12), moves the page's own camera; nothing is drawn. Shot 13 builds a fresh `asset:toro` kit instance in the running game and lifts each named part (kiso, sao, chudai, hibukuro, lamp, halo, kasa, hoju) by height order; it is labelled a parts sheet.

`title-screen.jpg` (concept art, above) is NOT replaced: the game itself loads it as the title backdrop (`index.html` lines 11 and 806), so a screenshot of the title would be baked under its own title. The live menu is `hero-title-menu.jpg`.

The `capture-*.jpg` files of 2026-10-23 are replaced by the hero files (list in `docs/fable/handoff/h1-hero.md`).
