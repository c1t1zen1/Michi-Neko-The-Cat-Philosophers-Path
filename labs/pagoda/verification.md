# Lab 08 verification — 2026-11-07

## Static

* `node tools/labs_check.mjs`: all checks OK (module syntax for every file in
  `labs/pagoda/js/`, the cache tag on the one `src/` bridge in
  `labs/shared/game.js`, the registry, the poster path and the research notebook).
* Only `labs/shared/game.js` imports from `src/`. This lab reaches the game
  through it: `loadCountrysideModule` (the shipped `buildDistantPagoda`),
  `loadCatModule` (Michi), and `plasterTextures` / `stoneTextures` /
  `texturedMaterial` (the game's painted 256 px sets).

## In a browser

Headless Chrome for Testing (Playwright build 1243), `--use-angle=metal`,
driven over the DevTools protocol, serving the repo root with
`python3 -m http.server`. GPU reported: Apple M5 Max.

* **Console:** a full scroll that builds every live view (the platform, the
  assembly view and all 65 specimen tiles: 67 views) logged no errors or
  shader failures.
* **Frame rate:** the viewing platform at 1440×900 ran at about 60 fps in the
  default view (Yasaka, Michi's perch at 190 m, background-art finish, mid
  tier), with about 2 ms of JavaScript per frame.

| Build | Meshes | Triangles | Instances |
|---|---|---|---|
| The game's `buildDistantPagoda` | 93 | 1,564 | 0 |
| Hero tier (Yasaka, every part on) | 79 | 74,318 | 1,476 |
| Mid tier | 47 | 28,126 | 0 |
| Far tier | 32 | 2,988 | 0 |
| Impostor | 1 | 2 | 0 |

The whole platform scene (town, forest, ranges, clouds, shadow pass) draws
about 150 calls and 0.6–0.7 M triangles per frame in the perch view.

## Checked by eye (captures in the session scratchpad)

* Perch, street, valley-bridge, orbit and kite views; distances from 8 m to 2 km.
  The convex perch hill keeps every sightline to the tower clear of the slope.
* Detail tiers switch at 380 / 110 / 26 px and crossfade through the Bayer
  screen door. The impostor bakes once per light change (2 bakes in a test
  that changed the hour once).
* Frame view (walls and roofs hidden, heart pillar shown), labels, the snake
  dance, Raise it, the explode slider, and the split compare with the game's
  own tower.
* Seasons (winter snow settles on the tiles and pans first; autumn maples),
  dawn, golden hour, night light-up with lit lattices in the town.
* All eight finishes on the platform and in the shelf. The line finishes use
  the Laplacian of inverse depth, after a log-depth Sobel was found to blacken
  ground planes at grazing angles.
* Rafters stay under the tiles: they run along the roof's eave tangent, below
  a convex surface. A first build with a steeper rafter line pushed them
  through the roof; that is fixed.

## Not verified

* Sound: the bell synth and wind run in headless Chrome without errors, but no
  one has listened to them in this session.
* Touch input, small phones and low-end GPUs. The governor lowers the pixel
  ratio under load, but no real-device benchmark has been run.
* Fraunces italic draws the macrons in some romanised names (ō, ū) a little to
  the right in headless captures. This may be a font-subset loading race in
  headless Chrome; it is not checked in a desktop browser.
