# Phase 0 browser checks (P0.2, browser half)

Lane `p0-browser`, run 2026-11-13 on `fable/integration` = `main` @ `ed9f5b9`
(worktree `michi-wt/p0-browser`). The Node half of P0.2 is in `checks.md`
(lane `p0-checks`). Every page below except the catalog suites (§4, which
bring their own launcher) was run with `tools/headless.mjs` from the
worktree root, which serves the worktree on a free 127.0.0.1 port.
Times are wall clock for the whole command (browser launch, local server,
three.js from the unpkg CDN, the page, shutdown).

## Machine and browser

| | |
|---|---|
| Machine | `sysctl hw.model` = `Mac17,7`; chip `Apple M5 Max` (`machdep.cpu.brand_string`); 18 cores; 128 GB |
| OS | macOS 26.6.2 (25G83) |
| Node | v26.7.0 |
| Browser | Chromium 153.0.8010.12, Playwright 1.63.0 headless (`chromium_headless_shell-1243`), outside the repo via `PLAYWRIGHT_MODULE` |
| GPU backend, default (`--gpu metal`) | `ANGLE (Apple, ANGLE Metal Renderer: Apple M5 Max, Unspecified Version)` |
| GPU backend, `--gpu swiftshader` | `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0) (0x0000C0DE)), SwiftShader driver)` |
| Viewport | 1200 × 750, device scale 1 (headless.mjs default) |

Headless Chromium here is not a touch device (`ontouchstart` absent,
`maxTouchPoints` 0, `(pointer: coarse)` false), so the game takes its desktop
paths; it reports 18 hardware threads, so `quality: 'auto'` resolves to
`high` on Metal (the GPU string matches the "Apple M… Max" rule in
`isDiscreteGPU()`) and to `medium` on SwiftShader.

```sh
export PLAYWRIGHT_MODULE=/Users/c1t1zen/.npm/_npx/e41f203b7505f1fb/node_modules/playwright
```

## Results

| Check | Command | Wall time | Result |
|---|---|---:|---|
| Lab geometry suite | §1 | 2.0 s (headless.mjs `ms` 0.6–1.9 s, launch included) | **32/32 pass**, title `PASS: lab geometry`, no console errors or warnings |
| Full-game boot, Metal | §2 | 3.0–4.9 s from launch to playing (3 runs); up to ~7 s under heavier contention | **boots and plays**; the only console line is the optional `cad-overrides.json` 404 |
| Full-game boot, SwiftShader | §3 | run 1: 132 s in all (incl. 10 s settle + screenshot); run 2, timed: first frame 167 s after the constructor began, playing 196 s after launch | **boots and plays**; the same 404 plus a SwiftShader-only driver performance warning |
| Catalog browser suites | §4 | 14.1 s / 27.6 s / 2.8 s | **17/17, 195/195, 12/12 pass**, 0 browser errors, no repository file changed |
| 44-check smoke suite (`/tmp/michi-test/`) | — | — | **not run: it does not exist on this machine** (`ls /tmp/michi-test` → No such file or directory) |

## 1. Lab geometry suite (`tools/labs_geometry_test.html`)

The page runs its checks on load, stores them in `window.__geometryResults`,
sets the title to `PASS: lab geometry` or `FAIL: …`, and logs the results as
JSON.

```sh
node tools/headless.mjs /tools/labs_geometry_test.html --console --wait "window.__geometryResults" \
  --eval "({ passed: __geometryResults.filter(r => r.pass).length, total: __geometryResults.length, title: document.title, failed: __geometryResults.filter(r => !r.pass).map(r => r.name) })" \
  --fail-on-error
```

```text
[+1.4s log] [{"name":"myojin 0.24 post -1 bears on lintel","pass":true,"detail":"gap -0.0158 m"}, … 32 results]
{"passed":32,"total":32,"title":"PASS: lab geometry","failed":[]}
{"ok":true,"url":"/tools/labs_geometry_test.html","ms":1870,"errors":[],"warnings":[],"shot":null,"gpu":"ANGLE (Apple, ANGLE Metal Renderer: Apple M5 Max, Unspecified Version)"}
real 1.99
```

Exit 0. An earlier run of the same check without `--console` reported `"ms":599`.

## 2. Full-game boot on Metal (`/__boot.html`)

`/__boot.html` sets `sessionStorage.catwalk_autostart = 'new'` and replaces
itself with `/index.html`; `bootstrap.js` sees the flag and starts the game
without the entry button. The game renders its first frame inside the `Game`
constructor (its closing `this.loop()`), which sets `game._bootDissolved`;
`game.menu.isPlaying` is true once the new game has started. headless.mjs
follows the redirect and keeps polling.

```sh
node tools/headless.mjs /__boot.html --console --timeout 1500 \
  --wait "window.game?._bootDissolved === true && window.game.menu?.isPlaying"
```

```text
[+4.7s error] Failed to load resource: the server responded with a status of 404 (Not Found) (/cad-overrides.json)
{"ok":true,"url":"/__boot.html","ms":4920,"errors":["Failed to load resource: the server responded with a status of 404 (Not Found) (/cad-overrides.json)"],"warnings":[],"shot":null,"gpu":"ANGLE (Apple, ANGLE Metal Renderer: Apple M5 Max, Unspecified Version)","finalUrl":"/index.html"}
real 5.01
```

Three runs of exactly this command: 2,956 / 3,451 / 4,920 ms (launch to
playing). Two more runs went on playing for 10 s (below); their only console
line arrived at +4.2 s and +7.0 s. The spread is GPU and CPU contention:
other Fable lanes were running browsers at the same time. `perf.md` has the
precise split with timing hooks (world ready ~1.2 s from the
constructor's start). With 10 s of play, an eval and a screenshot:

```sh
node tools/headless.mjs /__boot.html --console --timeout 1500 \
  --wait "window.game?._bootDissolved === true && window.game.menu?.isPlaying" --settle 10000 \
  --eval "({ playing: game.menu.isPlaying, quality: game.settings.resolveQuality(), fps: game.ui.fps, perfStage: game.perfStage, pixelRatio: game.renderer.getPixelRatio() })" \
  --shot <scratch>/boot-metal-final.png
```

```text
[+4.2s error] Failed to load resource: the server responded with a status of 404 (Not Found) (/cad-overrides.json)
{"playing":true,"quality":"high","fps":60,"perfStage":1,"pixelRatio":1}
{"ok":true,"url":"/__boot.html","ms":14599,"errors":["Failed to load resource: the server responded with a status of 404 (Not Found) (/cad-overrides.json)"],"warnings":[],"shot":"…/boot-metal-final.png","gpu":"ANGLE (Apple, ANGLE Metal Renderer: Apple M5 Max, Unspecified Version)","finalUrl":"/index.html"}
real 14.69
```

(An earlier identical run: 17.8 s, the same single line, and the adaptive
ladder at stage 2 / pixel ratio 0.61 / 36 fps after 10 s, under heavier
contention.)

**Every console line that is not an AudioContext autoplay warning:** one,
`Failed to load resource: … 404 (Not Found) (/cad-overrides.json)`, in every
boot. `cad-overrides.json` is the optional file cadJS publishes; a missing
file is normal (guide §3.5) and `applyCadOverrides()` carries on. No page
error, no other warning.

**AudioContext warnings:** none were logged in any recorded boot (the 5
Metal boots above, the SwiftShader boot, 2 direct `/index.html` boots with
`--session catwalk_autostart=new`, with and without a saved tier, and the 18
boots of the two perf runs). One early exploratory scratch run (an early version
of the perf timing hook, polling the page every second) logged 9 `The
AudioContext was not allowed to start` warnings from `src/audio.js` and
`src/music.js`; they did not recur. If they appear, they are the expected
autoplay warnings `AGENTS.md` mentions; `--ignore "AudioContext was not
allowed"` keeps them out of the summary.

The frame (1200 × 750, high tier, adaptive stage 1) shows the village street
with Luna and Kuro, the HUD, compass and prompt, as in the shipped game.

## 3. Full-game boot on SwiftShader (comparison)

```sh
/usr/bin/time -p node tools/headless.mjs /__boot.html --gpu swiftshader --console --timeout 1800 \
  --wait "window.game?._bootDissolved === true && window.game.menu?.isPlaying" --settle 10000 \
  --eval "({ quality: game.settings.resolveQuality(), pixelRatio: game.renderer.getPixelRatio(), perfStage: game.perfStage, fps: game.ui.fps, frameFloor: game.frameFloor })" \
  --shot <scratch>/boot-swiftshader.png
```

```text
[+64.5s warning] [.WebGL-0x12c00446e00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (/index.html)
[+64.5s warning] [.WebGL-0x12c00446e00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (/index.html)
[+64.5s warning] [.WebGL-0x12c00446e00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (this message will no longer repeat) (/index.html)
[+64.5s error] Failed to load resource: the server responded with a status of 404 (Not Found) (/cad-overrides.json)
{"quality":"medium","pixelRatio":1,"perfStage":0,"fps":60,"frameFloor":0}
{"ok":true,"url":"/__boot.html","ms":132063,"errors":["Failed to load resource: … 404 (Not Found) (/cad-overrides.json)"],"warnings":["[.WebGL-…]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (/index.html) (×2)","… (this message will no longer repeat) (/index.html)"],"shot":"…/boot-swiftshader.png","gpu":"ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0) (0x0000C0DE)), SwiftShader driver)","finalUrl":"/index.html"}
real 132.11   user 750.37   sys 204.63
```

Run 1 took 132 s in all, including the 10 s settle, the eval and a
SwiftShader screenshot. Run 2 timed the boot exactly, with the timing hooks
`tools/perf_spots.mjs` installs (scratch script: `openPage('/__boot.html',
{ gpu: 'swiftshader', init: TIMING_HOOK })`, polling once a second). It ran
slower than run 1; other lanes were busy on the same machine:

```text
{"wallMsToPlaying":196096,"worldBuildMs":39601,"firstFrameMs":127647,"worldReadyMs":167248,"bootTotalMs":179607,"ctorAtMs":12891,
 "errors":["Failed to load resource: … 404 (Not Found) (/cad-overrides.json)"],"warnings":3}
real 244.51
```

So on SwiftShader the world builds in ~40 s and the first frame (shader
compilation on the CPU) takes another ~128 s: 2.2–3.3 minutes from launch to
playing across the two runs, depending on load. That is well under the ~25
min ceiling the brief set (`AGENTS.md` quotes 15–20 min on a weak laptop;
this machine has 18 cores), so the comparison was run rather than skipped.
Auto quality resolves to `medium` (SwiftShader is not a discrete GPU).
Besides the same 404, the three `GPU stall due to ReadPixels` lines are a
SwiftShader driver performance notice, not an error. The frame matches the
Metal one.

## 4. Catalog browser suites (optional, against `node cadJS/server.mjs`)

They use their own launcher (`catalog/tests/browser-support.mjs`, also
`PLAYWRIGHT_MODULE`) against the cadJS server, started on a free port so
parallel worktrees never collide:

```sh
PORT=<free> HOST=127.0.0.1 node cadJS/server.mjs &        # serves this worktree
export CATALOG_URL=http://127.0.0.1:<free> CATALOG_QA_DIR=<scratch>/catalog-qa
node catalog/tests/browser-smoke.mjs
node catalog/tests/adapters-browser.mjs
node catalog/tests/cad-handoff-browser.mjs
```

```text
browser-smoke        exit 0  17/17 browser workflow checks passed.              real 14.10
adapters-browser     exit 0  195/195 runtime asset cases passed; 0 browser errors. real 27.63
cad-handoff-browser  exit 0  12/12 CAD handoff checks passed.                    real 2.75
git status --porcelain before vs after the three suites: no change
```

The smoke suite mocks the repository save, and nothing was written to
`catalog/metadata.json`, `cad-overrides.json` or anywhere else in the
worktree. Screenshots and JSON reports went to the scratch directory.

## headless.mjs was proven on

Every page this lane ran, except the catalog suites, went through
`tools/headless.mjs` (CLI or module): the lab geometry suite; `/__boot.html`
on Metal and SwiftShader and `/index.html` on Metal; all 62 review-sheet and
Roof Road captures (`captures.md`); the
18 perf boots (the first run and the re-baseline), two trials and two per-asset runs (`perf.md`); plus its own modes:
`--diff` (identical pair → `maxDelta 0`), `--convert` (PNG → 185 KB JPG),
an HTTP 404 page (`exit 2`, `"error":"HTTP 404 for /no-such-page.html"`), a
`--wait` timeout (`exit 2`), a bad option (`exit 64`), and module import
without running the CLI.
