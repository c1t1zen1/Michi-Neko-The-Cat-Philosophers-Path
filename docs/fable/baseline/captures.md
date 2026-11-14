# Phase 0 baseline captures (P0.4)

The "before" of every later comparison: every sheet of the five review pages
(town, hidden places, trees, cats, summit), the seven Roof Road mouths and
its finale, plus the two grass still sheets (an extra: Appendix C gate G4
compares `grass_preview.html` with Phase 0 too). Captured on the classic
asset set, `fable/integration` = `main` @ `ed9f5b9`, 2026-11-13.

- **Lossless PNG masters** live outside the repo (Integrator ruling R8):
  `/Users/c1t1zen/Documents/GitHub/michi-wt/_baseline/<page>/<sheet>.png`.
  The table gives each master's SHA-256, so a copy can be verified.
- **JPG previews** (quality 80, stepped down only if a preview would pass
  250 KB) are in the repo: `docs/fable/baseline/captures/<page>/<sheet>.jpg`.
  They are for looking, never for pixel comparisons.
- **Noise floor.** Every sheet was captured a second time in a fresh browser
  after the whole first pass, and the two PNGs were diffed with
  `tools/headless.mjs --diff`: per pixel d = max |Δ| over R, G, B, A (0–255);
  *maxΔ* is the largest d, *meanΔ* the mean d, *px>8* the number of pixels
  with d > 8. A later capture "matches Phase 0" only when its diff against
  the master is within that sheet's floor.

## How they were taken, and how to take them again

```sh
export PLAYWRIGHT_MODULE=/path/to/node_modules/playwright
node tools/capture_baseline.mjs --masters ../_baseline            # all 62, then the repeat pass
node tools/capture_baseline.mjs --list                             # every page/sheet and its exact URL
# a later lane, after its change (masters elsewhere, previews off, diff against Phase 0):
node tools/capture_baseline.mjs --masters /tmp/after --previews none --no-repeat \
  --compare /Users/c1t1zen/Documents/GitHub/michi-wt/_baseline --only town,tree/hero
```

Each capture is one fresh headless Chromium (Metal, 1200 × 750, device scale
1) on the page's exact URL, waiting on the page's own ready signal (read from
its JS), never a fixed sleep:

| Page | Ready signal | Then |
|---|---|---|
| `tools/town_preview.html` | `#log` text starts with `town` (written after every cell has rendered, synchronously) | 2 frames |
| `tools/hidden_preview.html` | `#log` text starts with `hidden places` (same pattern) | 2 frames |
| `tools/tree_preview.html` | `document.title === 'ready'` (set after the last cell) | 2 frames |
| `tools/cat_preview.html` | `document.title === 'ready'` (set after the last cell) | 2 frames |
| `tools/summit_preview.html` | `window.previewView` set (setup done) and `game.summit.vistaLandmarks` loaded (the optional Blender roofscape GLB, async) | 90 frames of its live loop |
| `kyoto-rooftops.html` | `window.roofRoad.catReady` (the cat has loaded) | 90 frames of its live loop |
| `kyoto-rooftops.html?finale=1` | as above, then `roofRoad.skipFinale()` (the `AGENTS.md` console hook: all five fires lit), and the page's own "stay" button dismisses the finale card as a player would | 90 frames |
| `tools/grass_preview.html?spots=…` | `window.__ready === true` (set after the fourth panel) | 2 frames |

Variants: the town sheets with `&golden=1` and `&night=1`, the tree and cat
sheets with `&golden=1` (the variants `AGENTS.md` lists). Hidden-place sheets
already show day and night in every sheet. Not captured: `&raw=1` (bare cat
sculpts, a debugging view), `&perf=1` (timings text), `&wind=4`, and summit
`&time=` / `&weather=` variants; add them with `--only` and a custom list if
a lane needs them.

## Run

`node tools/capture_baseline.mjs --masters /Users/c1t1zen/Documents/GitHub/michi-wt/_baseline`,
2026-11-13, 5.31 minutes for both passes, exit 0. Chromium 153.0.8010.12 (Playwright headless),
`ANGLE (Apple, ANGLE Metal Renderer: Apple M5 Max, Unspecified Version)`. No capture logged a console error or warning. The raw
results (timings, diff numbers, preview sizes) are in `_baseline/captures.json`;
the second-pass PNGs are in `_baseline/_repeat/`, the diff views in
`_baseline/_diff/` (dimmed master, red where pixels differ). Masters plus
repeats and diffs take 106 MB outside the repo; the 62 previews take
6.6 MB in the repo (all at quality 80 but one, which
stepped down to 74 to stay under 250 KB).

## Noise floor by page

| Page | Sheets | Byte-identical on repeat | Worst maxΔ | Worst meanΔ | Worst px>8 (of 900,000) | Why |
|---|---:|---:|---:|---:|---:|---|
| town | 9 | 1 | 74 | 0.0008 | 17 | Static sheet (one synchronous render). 1 of 9 byte-identical; the rest differ in 1–17 isolated pixels. Not investigated further (no game change in Phase 0) |
| hidden | 3 | 3 | 0 | 0 | 0 | Static sheet with a fixed stub sky and a frozen animation clock (`&t=`, default 12) |
| tree | 14 | 14 | 0 | 0 | 0 | Static sheet, seeded `Vegetation` / `Countryside` builders |
| cat | 18 | 18 | 0 | 0 | 0 | Static sheet; `cat_preview.js` seeds `Math.random` |
| summit | 8 | 0 | 252 | 10.5622 | 212,010 | Not repeatable: a live rAF loop with real-time dt. Wind moves the meadow grass and trees, clouds drift, the fūrin swings, pollen floats; `&speed=` only scales the day clock, and `Sky` draws cloud opacity and stars from unseeded `Math.random`. `approach-side` sees little of that and is near-identical |
| rooftops | 8 | 0 | 230 | 1.1673 | 30,091 | Not repeatable: a live loop (`?shot=1` caps dt at 1/30 but frames follow real time). The camera eases toward the cat with real-time damping, so edges shift by fractions of a pixel; water, lanterns, the guide cat, Chidori and laundry move; the finale fires flicker |
| grass | 2 | 0 | 207 | 0.1496 | 2,662 | Not repeatable in the cats: each panel walks the real `Cat`, which uses `Math.random`; `grass_preview.js` does not seed it (unlike `cat_preview.js`). The grass itself steps with a fixed dt |

## Every capture

| Page | Sheet | URL | Size | Master (under `_baseline/`) | SHA-256 of the master | Preview (under `captures/`) | Repeat maxΔ / meanΔ / px>8 |
|---|---|---|---|---|---|---|---|
| town | street | `/tools/town_preview.html?sheet=street` | 1200 × 750 | `town/street.png` | `f5724f10bcd8ebfa81d876495dc5067d33b99ed7afb0035780d3b3847d6d11b7` | `town/street.jpg` (181 KB) | 9 / 0 / 1 |
| town | street-golden | `/tools/town_preview.html?sheet=street&golden=1` | 1200 × 750 | `town/street-golden.png` | `6820ab887ee8d7c29c17aa11b4ebfcaa383461ef8bdd67593ddc4cbffc5cba74` | `town/street-golden.jpg` (136 KB) | 17 / 0.0001 / 2 |
| town | street-night | `/tools/town_preview.html?sheet=street&night=1` | 1200 × 750 | `town/street-night.png` | `fbaa5d8ce4341734caa486c25c05fb4566c841a10b540c62cebdf476205d597b` | `town/street-night.jpg` (34 KB) | identical |
| town | landmarks | `/tools/town_preview.html?sheet=landmarks` | 1200 × 750 | `town/landmarks.png` | `6c8b995a3cd28ef8e780800fd0a89a71edf0edfb513fd223c47e0ec5247e5f49` | `town/landmarks.jpg` (180 KB) | 60 / 0.0006 / 17 |
| town | landmarks-golden | `/tools/town_preview.html?sheet=landmarks&golden=1` | 1200 × 750 | `town/landmarks-golden.png` | `9a6cf94505f1782d556ea7a51090abf0586d7f84835d0dd2c3f56121aa1520ac` | `town/landmarks-golden.jpg` (144 KB) | 74 / 0.0008 / 17 |
| town | landmarks-night | `/tools/town_preview.html?sheet=landmarks&night=1` | 1200 × 750 | `town/landmarks-night.png` | `d84a60ef5b1e5703f16412a07570ed38ad9d535a3db6290035020dce1d996d5e` | `town/landmarks-night.jpg` (38 KB) | 32 / 0.0002 / 9 |
| town | props | `/tools/town_preview.html?sheet=props` | 1200 × 750 | `town/props.png` | `1521a5f40e64babf3f159d449e3ae6f6c2eeb43a333e4d0f343aa2934cd3945c` | `town/props.jpg` (127 KB) | 30 / 0.0001 / 3 |
| town | props-golden | `/tools/town_preview.html?sheet=props&golden=1` | 1200 × 750 | `town/props-golden.png` | `8f90d1f99b22690ca4e737ce30f7ab5f0be087c462743b98f24a2495f16096eb` | `town/props-golden.jpg` (95 KB) | 44 / 0.0002 / 7 |
| town | props-night | `/tools/town_preview.html?sheet=props&night=1` | 1200 × 750 | `town/props-night.png` | `3b63ff73077c849bccdb68dc19db85ec3b89d691ab19531b2a12004def5dd0f2` | `town/props-night.jpg` (31 KB) | 16 / 0 / 1 |
| hidden | pool | `/tools/hidden_preview.html?sheet=pool` | 1200 × 750 | `hidden/pool.png` | `f244b20ef961076087f5f44fe34af0c4f9c71307fcfbdc84cdb98566ba0d50c7` | `hidden/pool.jpg` (87 KB) | identical |
| hidden | glade | `/tools/hidden_preview.html?sheet=glade` | 1200 × 750 | `hidden/glade.png` | `95e5ace709a030f8976a2435e8dbcccab9d110481554943d0914a3c4ac1b9a77` | `hidden/glade.jpg` (102 KB) | identical |
| hidden | both | `/tools/hidden_preview.html?sheet=both` | 1200 × 750 | `hidden/both.png` | `03676c394da109a57634b9cd7a3ec7d3c5b01299d9cb92770564be8ddb0773b0` | `hidden/both.jpg` (116 KB) | identical |
| tree | hero | `/tools/tree_preview.html?sheet=hero` | 1200 × 750 | `tree/hero.png` | `711e54514dc1281e22bd89d6fe2a0a38347f51dd29253159e5c8fa251fabdb8a` | `tree/hero.jpg` (115 KB) | identical |
| tree | hero-golden | `/tools/tree_preview.html?sheet=hero&golden=1` | 1200 × 750 | `tree/hero-golden.png` | `2ea83fd9b07f40c7f06a510848b448787c2f9d4700a46c58958351aa5363de63` | `tree/hero-golden.jpg` (102 KB) | identical |
| tree | detail | `/tools/tree_preview.html?sheet=detail` | 1200 × 750 | `tree/detail.png` | `c016fe4258729e053e3eeab56205a13c46bfa580ff313475ba440860f032d2c6` | `tree/detail.jpg` (169 KB) | identical |
| tree | detail-golden | `/tools/tree_preview.html?sheet=detail&golden=1` | 1200 × 750 | `tree/detail-golden.png` | `29d9b1cabf97a9478b5c6bbcc9bf56d0ce7b6446622dccb086c74aa471663fef` | `tree/detail-golden.jpg` (158 KB) | identical |
| tree | rim | `/tools/tree_preview.html?sheet=rim` | 1200 × 750 | `tree/rim.png` | `787ae366ab34ffca758b56f9b3124e9241cd4a48f284cf1268cf680f3fe72162` | `tree/rim.jpg` (87 KB) | identical |
| tree | rim-golden | `/tools/tree_preview.html?sheet=rim&golden=1` | 1200 × 750 | `tree/rim-golden.png` | `5ff33a6afde6ee4e78cdeeb4af412f1f66908d8a2445fba492ed57c09ee7c807` | `tree/rim-golden.jpg` (80 KB) | identical |
| tree | bush | `/tools/tree_preview.html?sheet=bush` | 1200 × 750 | `tree/bush.png` | `df22c4182e5cd85e8aa766aa018a417e4960436a9c0ba58ccbe993f1286d8368` | `tree/bush.jpg` (72 KB) | identical |
| tree | bush-golden | `/tools/tree_preview.html?sheet=bush&golden=1` | 1200 × 750 | `tree/bush-golden.png` | `c0dc76188a70f7bcb8e3fe51534902f13fdc8ed039d8e858a6b867f07d390eff` | `tree/bush-golden.jpg` (66 KB) | identical |
| tree | compare | `/tools/tree_preview.html?sheet=compare` | 1200 × 750 | `tree/compare.png` | `2b450e07ce99207efce9a4f37d61d8045123dcf37f5ac74d70fb0dcc0b0e82b3` | `tree/compare.jpg` (87 KB) | identical |
| tree | compare-golden | `/tools/tree_preview.html?sheet=compare&golden=1` | 1200 × 750 | `tree/compare-golden.png` | `7442066a10d548164f6f357f2f6fef4ea225d5aa20422bfd7d978e0f18e6f4f3` | `tree/compare-golden.jpg` (82 KB) | identical |
| tree | thicket | `/tools/tree_preview.html?sheet=thicket` | 1200 × 750 | `tree/thicket.png` | `ec226a765196ce350b549d92734285c3a6a433273bbb88fac7e1b8bb4eddf184` | `tree/thicket.jpg` (104 KB) | identical |
| tree | thicket-golden | `/tools/tree_preview.html?sheet=thicket&golden=1` | 1200 × 750 | `tree/thicket-golden.png` | `8493dd8ba442b25c687191c8593243e72262f6091b28f0bcc876cf414502bfa5` | `tree/thicket-golden.jpg` (102 KB) | identical |
| tree | textures | `/tools/tree_preview.html?sheet=textures` | 1200 × 750 | `tree/textures.png` | `2d0d104f100483729f8fedcc20a56602d465bd786a72f55e5520478318a6efe9` | `tree/textures.jpg` (69 KB) | identical |
| tree | textures-golden | `/tools/tree_preview.html?sheet=textures&golden=1` | 1200 × 750 | `tree/textures-golden.png` | `3e221af86ddc582d6957796fcbe2b5d480b3a1c70c3348929b1f09a44661ef1f` | `tree/textures-golden.jpg` (68 KB) | identical |
| cat | anatomy | `/tools/cat_preview.html?sheet=anatomy` | 1200 × 750 | `cat/anatomy.png` | `8515ec813e8a605e5374dfb7b4bddd5184771490c56ebefc8d3e2e85021252eb` | `cat/anatomy.jpg` (71 KB) | identical |
| cat | anatomy-golden | `/tools/cat_preview.html?sheet=anatomy&golden=1` | 1200 × 750 | `cat/anatomy-golden.png` | `b053d0f822b7f7a4135f1320d2b78cdc1cbd24ed70347c2dc3458872a42457cd` | `cat/anatomy-golden.jpg` (71 KB) | identical |
| cat | face | `/tools/cat_preview.html?sheet=face` | 1200 × 750 | `cat/face.png` | `e4ff17e133cd06a4ea486183bdcfed98267049ba19fed70e6e42aeea69bddb78` | `cat/face.jpg` (77 KB) | identical |
| cat | face-golden | `/tools/cat_preview.html?sheet=face&golden=1` | 1200 × 750 | `cat/face-golden.png` | `9f1a685f39917cc77f67c34c35e393772bb13fb171037121826883b0206c0378` | `cat/face-golden.jpg` (77 KB) | identical |
| cat | coat | `/tools/cat_preview.html?sheet=coat` | 1200 × 750 | `cat/coat.png` | `c79033a6578630685d4b006e3125892f2b39e93b05479e3e74b91be2aea53e24` | `cat/coat.jpg` (82 KB) | identical |
| cat | coat-golden | `/tools/cat_preview.html?sheet=coat&golden=1` | 1200 × 750 | `cat/coat-golden.png` | `c7ced92405ed3efaeec29420c7ab0a5ae0a6d023a82d539c64438f7950b03696` | `cat/coat-golden.jpg` (81 KB) | identical |
| cat | gait | `/tools/cat_preview.html?sheet=gait` | 1200 × 750 | `cat/gait.png` | `c435175f87fba8010832bd9880e5652eb094e433b910b9aab79a4873ffd5e015` | `cat/gait.jpg` (94 KB) | identical |
| cat | gait-golden | `/tools/cat_preview.html?sheet=gait&golden=1` | 1200 × 750 | `cat/gait-golden.png` | `fdf9d04b9455eb7b90b2c646906c6f887439dd7e8529dbe4ad5d17f39bbd927b` | `cat/gait-golden.jpg` (92 KB) | identical |
| cat | stride | `/tools/cat_preview.html?sheet=stride` | 1200 × 750 | `cat/stride.png` | `fe417e2b870cec83d28ab759be8135bcdf62e934eeab81003d44c16011eb5180` | `cat/stride.jpg` (105 KB) | identical |
| cat | stride-golden | `/tools/cat_preview.html?sheet=stride&golden=1` | 1200 × 750 | `cat/stride-golden.png` | `35c8244879053e50b797867bc9c629d43d709bf563d1fe02bef0c99c5bfb2ece` | `cat/stride-golden.jpg` (104 KB) | identical |
| cat | poses | `/tools/cat_preview.html?sheet=poses` | 1200 × 750 | `cat/poses.png` | `d8868e917c6ab72e4551d73007815d55de29fd785dc2de0c3b80c7429febc9a7` | `cat/poses.jpg` (96 KB) | identical |
| cat | poses-golden | `/tools/cat_preview.html?sheet=poses&golden=1` | 1200 × 750 | `cat/poses-golden.png` | `8bd58e41dfbc526d53ffbd612ca6ab61712528439c02b8e942aedfa0c2c2094b` | `cat/poses-golden.jpg` (94 KB) | identical |
| cat | sleep | `/tools/cat_preview.html?sheet=sleep` | 1200 × 750 | `cat/sleep.png` | `bbbc71b2b53183a8663cd1498ef2ffd03a367c988f3e9731bc6942b9e58733f7` | `cat/sleep.jpg` (51 KB) | identical |
| cat | sleep-golden | `/tools/cat_preview.html?sheet=sleep&golden=1` | 1200 × 750 | `cat/sleep-golden.png` | `cbc9ac5f88aa44dc316c19d1b6f0465a2da7ede697fbc6a6066a63835faf644f` | `cat/sleep-golden.jpg` (51 KB) | identical |
| cat | closeup | `/tools/cat_preview.html?sheet=closeup` | 1200 × 750 | `cat/closeup.png` | `af4b6f1341ca2220aebf7ec708fc7a0822ee32407cec63cc0aa5a4c42cd5a583` | `cat/closeup.jpg` (71 KB) | identical |
| cat | closeup-golden | `/tools/cat_preview.html?sheet=closeup&golden=1` | 1200 × 750 | `cat/closeup-golden.png` | `bcf8e58204d992aa16eeadf31eab4d918262d32a9d6de6e18dc071e59c9dfcfb` | `cat/closeup-golden.jpg` (71 KB) | identical |
| cat | npcs | `/tools/cat_preview.html?sheet=npcs` | 1200 × 750 | `cat/npcs.png` | `18ab4f93e96a995d62cdf07198149a574e1971c596a381d37968ab00c5f6b5b9` | `cat/npcs.jpg` (74 KB) | identical |
| cat | npcs-golden | `/tools/cat_preview.html?sheet=npcs&golden=1` | 1200 × 750 | `cat/npcs-golden.png` | `99d9ef61bfdc13d4abf627d37293852549467b4c515b984fe9db0c4f76e7b392` | `cat/npcs-golden.jpg` (74 KB) | identical |
| summit | meditation | `/tools/summit_preview.html?view=meditation` | 1200 × 750 | `summit/meditation.png` | `010532614a17e172f199efada5fc90f1e070e18ae9a040bac0b0a62b8af852e1` | `summit/meditation.jpg` (210 KB) | 251 / 5.3178 / 138602 |
| summit | arrival | `/tools/summit_preview.html?view=arrival` | 1200 × 750 | `summit/arrival.png` | `42646bd10b3b35ae9b49efd957675830021c496ffbc215e8ad9291c44728f876` | `summit/arrival.jpg` (136 KB) | 212 / 0.4641 / 6353 |
| summit | approach-front | `/tools/summit_preview.html?view=approach-front` | 1200 × 750 | `summit/approach-front.png` | `2b0eff4a4e0f2a2b4fab7de476a3f0b4e0b43db35fe93f9fb54c6752f612411d` | `summit/approach-front.jpg` (128 KB) | 209 / 0.1828 / 2312 |
| summit | approach-side | `/tools/summit_preview.html?view=approach-side` | 1200 × 750 | `summit/approach-side.png` | `af69dcc3463efd9d516837e6dad0cba26d30add3e3504221e2240d546e22258d` | `summit/approach-side.jpg` (146 KB) | 1 / 0 / 0 |
| summit | meadow-gate | `/tools/summit_preview.html?view=meadow-gate` | 1200 × 750 | `summit/meadow-gate.png` | `28ee1de0e2229fdc42d3ad5921612031ed5727a1056b2b33d12e3b8ba4168650` | `summit/meadow-gate.jpg` (208 KB) | 252 / 2.0034 / 50515 |
| summit | edge-left | `/tools/summit_preview.html?view=edge-left` | 1200 × 750 | `summit/edge-left.png` | `b4c20a502adf8b99bafd5cd6cda52fb3830f6a0e40c5ca549cf4b74befb5b330` | `summit/edge-left.jpg` (239 KB) | 230 / 10.5622 / 212010 |
| summit | edge-right | `/tools/summit_preview.html?view=edge-right` | 1200 × 750 | `summit/edge-right.png` | `4519c89a6c9bfd94bcbb728dca5a036ebc78c0d29a8b006bbd48370439267166` | `summit/edge-right.jpg` (225 KB, q74) | 251 / 0.7475 / 17801 |
| summit | edge-sheet | `/tools/summit_preview.html?view=edge-sheet` | 1200 × 750 | `summit/edge-sheet.png` | `f480ccc38b9f70829e183724fbe0edd9902659b10d0ee2a23f8900005233ee3b` | `summit/edge-sheet.jpg` (220 KB) | 247 / 0.7376 / 16946 |
| rooftops | mouth-1 | `/kyoto-rooftops.html?mouth=1&shot=1&nohud=1` | 1200 × 750 | `rooftops/mouth-1.png` | `74cdb8826b183c6da56f82f1f2e85ffb414096d093857b8fa32dd41f5ea9f0c7` | `rooftops/mouth-1.jpg` (76 KB) | 170 / 0.0639 / 1044 |
| rooftops | mouth-2 | `/kyoto-rooftops.html?mouth=2&shot=1&nohud=1` | 1200 × 750 | `rooftops/mouth-2.png` | `b192260d8c4e74192bc8884d1e928e29f2d44e8f8899c871e7f09222b6018435` | `rooftops/mouth-2.jpg` (116 KB) | 201 / 0.9684 / 14725 |
| rooftops | mouth-3 | `/kyoto-rooftops.html?mouth=3&shot=1&nohud=1` | 1200 × 750 | `rooftops/mouth-3.png` | `f445e85f6196f81b2435641234aae836dc98e58f65892b616fb73ff3b8f6f81e` | `rooftops/mouth-3.jpg` (86 KB) | 168 / 0.274 / 3855 |
| rooftops | mouth-4 | `/kyoto-rooftops.html?mouth=4&shot=1&nohud=1` | 1200 × 750 | `rooftops/mouth-4.png` | `bf87e4c3eb73cc0408319af7a2f5f551e0ce89f8f63f9ce4027621d423abd150` | `rooftops/mouth-4.jpg` (106 KB) | 193 / 0.3597 / 4455 |
| rooftops | mouth-5 | `/kyoto-rooftops.html?mouth=5&shot=1&nohud=1` | 1200 × 750 | `rooftops/mouth-5.png` | `d6e8b28dd849f105eed8802184b3f783a2a710fee33d05971c1a8658f430fe26` | `rooftops/mouth-5.jpg` (88 KB) | 201 / 0.3102 / 5183 |
| rooftops | mouth-6 | `/kyoto-rooftops.html?mouth=6&shot=1&nohud=1` | 1200 × 750 | `rooftops/mouth-6.png` | `faa5261c445bee2021a0e9bec74d543196035d59915fc8c74a90502d66459457` | `rooftops/mouth-6.jpg` (82 KB) | 215 / 0.049 / 1287 |
| rooftops | mouth-7 | `/kyoto-rooftops.html?mouth=7&shot=1&nohud=1` | 1200 × 750 | `rooftops/mouth-7.png` | `96176a5b7f983d6d7aed97d9c7cc591890fc1db004b33468b78ace5db9e24fa9` | `rooftops/mouth-7.jpg` (100 KB) | 172 / 1.1673 / 30091 |
| rooftops | finale | `/kyoto-rooftops.html?finale=1&shot=1&nohud=1` | 1200 × 750 | `rooftops/finale.png` | `238c9258b7b59fc0a0876fd2dc0e24c5c658caa04ee8713a2c799415be79d27d` | `rooftops/finale.jpg` (57 KB) | 230 / 0.1721 / 3400 |
| grass | sheet-a | `/tools/grass_preview.html?spots=meadow,path,river,shrine` | 1200 × 750 | `grass/sheet-a.png` | `f7771e2aa9b67fba9096a90e0e585cac9d093e86454f9b647f9f01836199aa9a` | `grass/sheet-a.jpg` (214 KB) | 193 / 0.1247 / 2074 |
| grass | sheet-b | `/tools/grass_preview.html?spots=glade,corral,pool,wide` | 1200 × 750 | `grass/sheet-b.png` | `15fd01357de8d8c82ffb845d804c4e76fdeb14d07be8c08f7b9ca627381c9219` | `grass/sheet-b.jpg` (232 KB) | 207 / 0.1496 / 2662 |
