# p0-browser report

Lane `p0-browser` (Phase 0, browser half of `p0-baseline`). Worker: Claude Opus 5.5.
Worktree `/Users/c1t1zen/Documents/GitHub/michi-wt/p0-browser`, branch `fable/p0-browser`,
base `ed9f5b9`; `origin/fable/integration` @ `5dc924a` merged in at the end.
PR: https://github.com/c1t1zen1/Michi-Neko-The-Cat-Philosophers-Path/pull/6 (base `fable/integration`, MERGEABLE).

**Status: DONE_WITH_CONCERNS.** Every step is done. The concerns are about
measurement conditions and non-repeatable pages, not about failures (see the end).

## What was built

### 1. `tools/headless.mjs` (shared infrastructure, ruling R7)
It was pushed first, in commit `6f0fca8`, minutes into the lane, so the Phase 1 workers could start.
One file of 667 lines, Node and external Playwright only (`PLAYWRIGHT_MODULE`, the same pattern as
`catalog/tests/browser-support.mjs`). No dependencies were added and nothing was installed into the repo.

- **Static server.** Serves `--root` (default: the repo containing the script) on a free 127.0.0.1 port.
  - It has MIME types for js/mjs/json/html/css/png/jpg/glb/gltf/wasm/mp4/fonts and others.
  - Directories redirect to a trailing slash, like `python3 -m http.server`.
  - It supports byte ranges and rejects paths outside the root.
- **CLI.** `node tools/headless.mjs <path-or-url> [options]`.
  - A leading `/` path, a bare relative path, or an absolute file path inside the root all resolve against the served root; a full URL is opened as is.
  - Options from the brief: `--shot` (png/jpg), `--size` (default 1200x750), `--wait`, `--eval`, `--timeout`, `--gpu metal|swiftshader` (default metal on macOS), `--console`, `--session k=v`, `--settle`, `--jpeg-quality`, `--fail-on-error`.
  - Additive options: `--local k=v` (localStorage before navigation), `--ignore <regex>`, `--root`, `--arg <chromium flag>`.
  - `--wait` polls every 250 ms. Exceptions count as "not yet", and polling survives redirects (`/__boot.html` → `/index.html`).
  - With `--console`, console, pageerror and failed-request lines go to stderr with a `[+seconds type]` prefix.
- **Output.** stdout always ends with one JSON line: `{ok,url,ms,errors,warnings,shot,gpu[,finalUrl][,error]}`.
  - Repeated messages fold as `(×N)`.
  - The server origin is stripped from all messages, so output is the same on every port.
  - With `--eval`, the line before the summary is the JSON value.
  - Exit codes: 0 ok; 1 page errors with `--fail-on-error`; 2 the run failed; 64 bad arguments.
- **`--diff a b [--out]`** compares the images in the browser via canvas, decoding with no colour conversion.
  - Per pixel, d = max |Δ| over R, G, B, A. It prints `{width,height,maxDelta,meanDelta,pixelsOver8}` and exits 0.
  - The one exception is an unreadable image, which exits 2. That is the only deviation from "exit 0 always"; it is documented in `--help`.
  - `--out` writes a diff view.
- **`--convert src dst`** re-encodes an image, for example a PNG master into a JPG preview.
- **Module API, exactly as in the brief:**
  - `openPage(pathOrUrl, { root, size, gpu, session, timeout, console })` returns `{ page, browser, url, errors, warnings, close }`, and `close` stops both the browser and the server. Additive: the options `local`, `init`, `args`, `ignore`, `waitUntil`, and the return fields `context`, `origin`, `gpu`.
  - `runPage(…, { wait, eval, shot, settle, ...openOpts })` returns `{ ok, url, ms, errors, warnings, shot, value }`, plus `gpu`, `error` and `finalUrl`, and accepts `failOnError` and `jpegQuality`.
  - `diffImages(a, b, { out })`.
  - Extra exports: `convertImage`, `openImageTool` (one browser for many images), `startServer`, `loadPlaywright`, `gpuInfo`, `waitForExpression`, `REPO_ROOT`, `DEFAULT_GPU`.
  - The CLI runs only when the file is executed directly.
- **`--help`** shows usage with real, tested examples: the town sheet, the geometry suite, the full game boot, a tier via `--local`, a Roof Road mouth, `--diff` and `--convert`.
- **Playwright lookup:** `PLAYWRIGHT_MODULE` first, then a normal resolve, then the newest `~/.npm/_npx/*/node_modules/playwright`. No machine path is written in the repo.

### 2. Browser half of P0.2 → `docs/fable/baseline/checks-browser.md`
Machine: `Mac17,7`, Apple M5 Max, 18 cores, 128 GB, macOS 26.6.2, Node v26.7.0.
Browser: Chromium 153.0.8010.12 (Playwright 1.63.0 headless shell).
GPU strings:
- Metal: `ANGLE (Apple, ANGLE Metal Renderer: Apple M5 Max, Unspecified Version)`
- SwiftShader: `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0) …), SwiftShader driver)`

### 3. P0.3 → `tools/perf_spots.mjs` + `docs/fable/baseline/perf.md`
- **Boot.** Each boot loads `/index.html` with `catwalk_autostart=new`. The tier is saved in `localStorage.catwalk_settings_v1` before boot, the way the settings menu saves it.
- **Timing hooks.** An init script hooks the `Game` constructor (its `#canvas` lookup, then its closing `loop()`) to time world build and first frame. No game file is changed.
- **Pinned state.**
  - Hour 10.5 with clear weather.
  - The adaptive ladder and the eco governor are switched off in the page.
  - `applyQuality()` re-applies the tier.
- **Spots.** Four fixed spots, coordinates recorded in perf.md:

  | Spot | Cat (x, z) | Yaw |
  |---|---|---|
  | street | (0, 14) | π |
  | shrine | (0, −19) | π |
  | river | (9, 28.2) | −1.3 |
  | meadow | (−12, 12) | 2.46 |

  The framing was checked with screenshots, and the high-tier shots are committed.
- **Frame time is measured GPU-synced:** loop CPU + a 1-pixel `readPixels` wait.
  - Headless Chromium paces rAF at 60 Hz whatever the flags.
  - Measured on a static page: 16.66 ms by default, and 18.2 ms with `--disable-gpu-vsync --disable-frame-rate-limit`. With those flags the game also dropped to 10 fps.
- **Also recorded:** render-only time, draw calls and triangles over all passes (scene vs frame), and world build split into build, first frame, world ready and boot total.
- **Rerunnable:** `[--tiers][--spots][--boots][--rounds][--frames][--url-suffix "?assets=modular"][--gpu][--shots] --out`, printing markdown tables.
- **`--assets`** measures triangles, draw calls and build ms for all 124 classic assets that have an original catalog adapter.

### 4. P0.4 → `tools/capture_baseline.mjs` + `docs/fable/baseline/captures.md` + `captures/`
62 captures. Each one waits on the page's own ready signal, read from its JS:

| Page | Sheets |
|---|---|
| town | 3 sheets × {default, golden, night} |
| hidden | 3 |
| tree | 7 × {default, golden} |
| cat | 9 × {default, golden} |
| summit | 8 views |
| Roof Road | mouths 1–7 and the finale |
| grass | 2 still sheets (an extra; Appendix C G4 compares them with Phase 0 too) |

- **The finale** uses the `AGENTS.md` hook `roofRoad.skipFinale()` (all five fires), then the page's own "stay" button dismisses the card.
- **Masters** (lossless PNG) are in `/Users/c1t1zen/Documents/GitHub/michi-wt/_baseline/<page>/<sheet>.png`. That directory also holds the repeat pass in `_repeat/`, the diff views in `_diff/`, and `captures.json`: 106 MB, all outside the repo.
- **Previews** are 62 JPGs (6.6 MB at quality 80; one stepped down to q74 to stay under 250 KB) in `docs/fable/baseline/captures/<page>/<sheet>.jpg`, plus 4 perf-spot JPGs (0.8 MB).
- **`captures.md`** gives the exact URL, size, master path, SHA-256, preview path and repeat diff of every capture.
- **For later lanes:** `--compare <old masters>` diffs a new capture set against Phase 0.

### 5. P0.5 → `docs/fable/baseline/budgets.md`
Labelled "proposals — accepted provisionally under ruling D1".

- **Scene budgets per tier and spot:**
  - low = classic (the kit never loads on low; ±2 % is the boot-to-boot spread);
  - medium ≤ measured classic high;
  - high ≤ 1.2 × classic high in frame time and draw calls, and 1.3 × in triangles.
- **World build:** world ready ≤ 1.25 × classic; boot total ≤ classic + 1 s.
- **Per-asset caps (AAA-7)**, hero / mid / far by class:

  | Class | Triangles | Build ms |
  |---|---|---|
  | small prop | 6k / 1.5k / 300 | 2 / 1 / 0.5 |
  | structure | 16k / 4k / 800 | 4 / 2 / 1 |
  | building | 40k / 10k / 2k | 12 / 5 / 2 |
  | tree | 30k / 8k / 1.5k | 10 / 4 / 1.5 |
  | character | 130k / 32k / 8k | 12 / 6 / 3 |

  Also: repeat instances ≤ 0.2 ms; materials ≤ 6 / 4 / 2; live meshes ≤ 3 / 1 / 0.
- **Derivation.** The caps are sized from the measured medium headroom: worst spot +1.85 M triangles (river) and +139 draw calls (shrine). They use the in-view object counts per band (hero < 12 m: 14, mid: 81, far: 192, with colliders as a proxy):
  - 14×40k + 81×10k + 192×2k = 1.75 M ≤ 1.85 M;
  - 14×3 + 81×1 = 123 ≤ 139.
- **Caveat for f1-runtime.** Classic `_mergeStatics()` merges valley-wide by material with no spatial cells, so merged kit statics are never culled per object. The scene re-measure is therefore the binding gate.

## Checks run (command → real output, trimmed)

All commands were run from the worktree root with
`PLAYWRIGHT_MODULE=/Users/c1t1zen/.npm/_npx/e41f203b7505f1fb/node_modules/playwright`.

```text
# headless.mjs first test (review sheet)
node tools/headless.mjs "/tools/town_preview.html?sheet=street" --wait "document.getElementById('log').textContent.startsWith('town')" --shot …/street.png --console
{"ok":true,"url":"/tools/town_preview.html?sheet=street","ms":3599,"errors":[],"warnings":[],"shot":"…/street.png","gpu":"ANGLE (Apple, ANGLE Metal Renderer: Apple M5 Max, Unspecified Version)"}   exit=0

# headless.mjs modes
--diff street.png street-2.png --out …   → {"width":1200,"height":750,"maxDelta":19,"meanDelta":0.0001,"pixelsOver8":3,"out":"…"} exit=0
--diff street.png street.png             → {"width":1200,"height":750,"maxDelta":0,"meanDelta":0,"pixelsOver8":0} exit=0
--convert street.png street.jpg --jpeg-quality 80 → {"width":1200,"height":750,"bytes":185365,"quality":80}
/no-such-page.html                       → {"ok":false,…,"error":"HTTP 404 for /no-such-page.html"} exit=2
--wait "window.nope" --timeout 3         → {"ok":false,…,"error":"wait timed out: window.nope"} exit=2
--bogus                                  → exit=64;   --local novalue → exit=64
module import                            → exports listed, CLI not run
--session + --local quality=low + --ignore "AudioContext was not allowed" → ["low","{\"quality\":\"low\"}"] ok, exit=0
runPage(…, { ignore: [/404/g] }) with two identical 404 console.errors → {"ok":true,"value":32,"errors":[]}

# P0.2 lab geometry
node tools/headless.mjs /tools/labs_geometry_test.html --console --wait "window.__geometryResults" --eval "({ passed: …, total: …, title: document.title, failed: … })" --fail-on-error
{"passed":32,"total":32,"title":"PASS: lab geometry","failed":[]}
{"ok":true,"url":"/tools/labs_geometry_test.html","ms":1870,"errors":[],"warnings":[],…}   real 1.99  exit=0

# P0.2 full-game boot, Metal (5 runs; 3 of the plain command)
node tools/headless.mjs /__boot.html --console --timeout 1500 --wait "window.game?._bootDissolved === true && window.game.menu?.isPlaying"
[+4.7s error] Failed to load resource: the server responded with a status of 404 (Not Found) (/cad-overrides.json)
{"ok":true,"url":"/__boot.html","ms":4920,…,"finalUrl":"/index.html"}     (other runs: ms 2956, 3451)
… --settle 10000 --eval "({ playing, quality, fps, perfStage, pixelRatio })" → {"playing":true,"quality":"high","fps":60,"perfStage":1,"pixelRatio":1}  ms 14599
Only console line in every boot: the optional cad-overrides.json 404.

# P0.2 SwiftShader
… --gpu swiftshader --console --timeout 1800 … --settle 10000 … → ok, ms 132063 (real 132.11, user 750 s)
  console: cad-overrides.json 404 + 3× "GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels"
timed with the perf hooks (scratch script) → {"wallMsToPlaying":196096,"worldBuildMs":39601,"firstFrameMs":127647,"worldReadyMs":167248,"bootTotalMs":179607}

# P0.2 catalog suites against PORT=<free> HOST=127.0.0.1 node cadJS/server.mjs
browser-smoke        exit 0  17/17 browser workflow checks passed.               real 14.10
adapters-browser     exit 0  195/195 runtime asset cases passed; 0 browser errors.  real 27.63
cad-handoff-browser  exit 0  12/12 CAD handoff checks passed.                     real 2.75
git status --porcelain before vs after: no change
ls /tmp/michi-test → No such file or directory   (44-check smoke suite: not run, does not exist)

# P0.3
node tools/perf_spots.mjs --shots …/perf-shots --out …/perf-baseline.json   → exit 0, 13 min
| low | street | 10.55 (9.50–13.55) | 28.00 | 4.60 … | 6.00 | 3.80 … | 501 / 505 | 5,026,628 / 5,026,634 |
| medium | street | 13.50 (11.70–15.95) | 26.93 | 4.50 … | 8.60 | 5.58 … | 569 / 589 | 6,018,688 / 6,018,710 |
| high | street | 18.90 (17.10–19.95) | 31.45 | 5.60 … | 13.00 | 9.08 … | 761 / 781 | 8,170,223 / 8,170,245 |
(full 12-row table in perf.md)
| low | 2786 (2710–3309) | 1984 … | 802 … | 3879 … | 3 |   | medium | 2888 … |   | high | 3259 (2925–3450) | …
node tools/perf_spots.mjs --assets --out …   → "measured 124 classic assets (0 errors)", real 5.10

# P0.4
node tools/capture_baseline.mjs --masters /Users/c1t1zen/Documents/GitHub/michi-wt/_baseline → exit 0, 5.31 min, 62 captures × 2, 0 console errors
noise floor: cat 18/18, tree 14/14, hidden 3/3 byte-identical; town ≤ 17 px > 8 (1/9 identical);
summit worst maxΔ 252 / meanΔ 10.56 / 212,010 px; rooftops worst 230 / 1.17 / 30,091; grass worst 207 / 0.15 / 2,662

# After merging origin/fable/integration (5dc924a)
node tools/footprint_golden.mjs        → footprint golden: EQUAL … run 3.2 s   exit=0  (f1-golden's CLI through runPage)
node tools/check_syntax.mjs            → All 37 modules OK
node tools/verify.mjs                  → All checks passed
node tools/labs_check.mjs              → All labs checks OK
git diff --check origin/fable/integration → clean
git diff --name-only origin/fable/integration → the 8 files below + 66 JPGs; no game file
```

## Files changed (vs `origin/fable/integration`: 74 files, +2,249, no deletions)
- `tools/headless.mjs`
- `tools/perf_spots.mjs`
- `tools/capture_baseline.mjs`
- `docs/fable/baseline/checks-browser.md`
- `docs/fable/baseline/perf.md`
- `docs/fable/baseline/captures.md`
- `docs/fable/baseline/budgets.md`
- `docs/fable/baseline/captures/{town,hidden,tree,cat,summit,rooftops,grass}/*.jpg` (62)
- `docs/fable/baseline/captures/perf/high-{street,shrine,river,meadow}.jpg` (4)
- `docs/fable/status/p0-browser.md`

These files are not in the brief's list. Per the common brief, every lane keeps a status file, and p0-checks owns `p0-baseline.md`. The grass previews and the perf-spot shots are extras inside `captures/`.

Commits:
- `6f0fca8` add tools/headless.mjs
- `31769e6` lane status file
- `09760ef` headless.mjs local/init options, real --help examples
- `bd46685` P0.3 perf baseline
- `8a94d1b` P0.5 budget proposals
- `1a86f0b` P0.4 baseline captures
- `6852c43` P0.2 browser checks, status
- `81efef4` merge origin/fable/integration
- `96bd7a3` headless.mjs ignore patterns drop g/y flags
- `4a63890` status ready for review

Assets promoted or deferred: none (Phase 0). Footprint waivers: none.

## Self-review against the acceptance list
- **headless.mjs works for every page above, proven by recorded runs: yes.**
  - the lab geometry suite;
  - `/__boot.html` on Metal and SwiftShader, and `/index.html` with a session flag;
  - all 62 review-sheet, Roof Road and grass captures;
  - 9 perf boots, a 1-boot trial and the asset run;
  - f1-golden's `footprint_golden.mjs`.
- **Perf table complete for 3 tiers × 4 spots with spread: yes.**
  - 3 boots × 3 rounds × 240 frames per cell, with round-median and boot-median ranges.
  - World build is reported per tier as a median with min–max over 3 boots.
- **Every capture recorded with hash and noise floor: yes.** 62 rows, each with a SHA-256 and a repeat diff, plus a per-page summary that says why a page is not repeatable.
- **Budgets derived from the numbers: yes.** Every scene budget is a measured classic number or a multiple of one; the per-asset caps are checked against the measured headroom and in-view counts.
- **No game file touched: yes.** The diff contains only the files above.
- **Commit per step, push, PR: yes.** PR #6.

## Open concerns
1. **GPU and CPU contention.** Other lanes ran browsers on the same Mac during every measurement.
   - Medians are stable boot to boot (within ~0.5 ms).
   - The p90s and some brackets are GPU-wait spikes. Worst single frames were 124 / 215 / 252 ms, while loop CPU p90 stays at ≤ 7.1 ms.
   - Final p90-sensitive decisions should re-measure on a quiet machine.
2. **The frame-time method is GPU-synced** (CPU + GPU serialised, plus headless compositing). It is an upper bound and stable for A/B comparison, but it is not the fps a player sees.
3. **Summit, Roof Road and grass captures are not repeatable.**
   - Summit and Roof Road run real-time loops. `Sky` uses unseeded `Math.random`, and the cat uses `Math.random` while `grass_preview` does not seed it.
   - Their noise floors are recorded, but a pixel "matches Phase 0" claim there needs visual judgment or loose thresholds.
   - A frozen-clock or seeded mode in those preview pages would fix it. That is outside Phase 0: the summit is AGENTS.md-protected and the pages are not mine.
   - Cat, tree and hidden sheets are byte-identical; town differs in ≤ 17 pixels.
4. **Merged statics are not culled per object** (`_mergeStatics()` pass 1 is valley-wide per material). How tiered kit assets merge is an f1-runtime decision, and the per-asset caps assume the scene re-measure stays the gate.
5. **Per-asset numbers are rough in places.**
   - Several component ids (`shrine-hall`, `shimenawa`, `shrine-bell`, `offering-box`, `tea-bench`, `namako`, `cat-coat`) build their host in the catalog adapters, so their numbers are the host's.
   - Grass layers are one blade each in isolation.
   - The in-view counts use colliders as a proxy for objects and over-count.
6. **Smaller notes.**
   - The `--diff` mode exits 2 on an unreadable image (otherwise always 0).
   - One exploratory scratch run logged 9 AudioContext autoplay warnings that never recurred in any recorded boot.
   - The review sheets import `?v=20261106a` while `src/` is on `20261107a`. This is pre-existing and tags are Integrator-only.
   - The `p0-browser.md` status file sits beside p0-checks's `p0-baseline.md`.

## Review fix round 1 (2026-11-13 ~17:00 PST)

Commits:
- `da8521f` merge integration b45953d
- `3e88c16` the fix round
- `45f700d` merge integration 4bac869 (f1-runtime)
- `96fac3c` budgets preload note, status

Status: **DONE_WITH_CONCERNS** (frame-ms budgets remain provisional by design).

### 1. Bimodal draw calls and triangles: fixed
- `perf_spots.mjs` tags every measured frame by whether `Game.loop()` refreshed the sun's shadow map (`game._shadowFrame === 0` after the loop; `main.js` `shadowCadence`: every frame on high, every 2nd on low and medium).
- Every metric now reports:
  - *shadow-refresh* (median of refresh frames);
  - *other* (median of the rest; — on high);
  - *mean*;
  - *amortised* (the two medians weighted by their share; used for frame ms because it is robust to spikes, unlike the mean).
- `--frames` must be even: `node tools/perf_spots.mjs --frames 41 --out x.json` → exit 64.
- Re-measured street: low 655 / 392 / 515 calls and 6.24 / 3.99 / 5.06 M triangles; medium 777 / 419 / 596 and 7.25 / 4.91 / 6.07 M. The old single "medians" (505, 5.03 M; 589) were midpoints of a 50/50 split, as the review said.
- perf.md has a frame-time table (amortised, shadow-refresh, other, p90, CPU, GPU wait shadow/other, render-only) and a counts table (calls and triangles shadow / other / mean, plus the scene pass).

### 2. Contention measured, tiers interleaved, re-baselined: done
- Boots are now interleaved: boot 1 of every set and tier, then boot 2, and so on. Each boot records `os.loadavg()` at its start and end.
- `--url-suffix` is repeatable, so classic and modular can be compared in one session; the sets interleave as well.
- The GPU/browser probe page is now `labs_geometry_test.html`.
- Re-baseline command: `node tools/perf_spots.mjs --shots <scratch>/perf-shots2 --out <scratch>/perf-baseline2.json` → exit 0, 9.6 min (real 573 s).
- Load average was 1.35–2.54 across the 9 boots, in order low, medium, high, low, medium, high, low, medium, high.
- Boot lines, e.g. `low boot 1: world ready 1183.6 ms (build 871.2, first frame 312.4); load 1.35 1.59 1.52 → 1.54 1.59 1.52`.
- **World ready is ~1.2 s on every tier**, against 2.8–3.3 s in the contended first run, which is superseded and kept as raw JSON.
- p90 now sits close to the medians: frame p90 8.8–15.3 ms, worst frames 14.5 ms (medium) and 16.9 ms (high), plus one 160.8 ms spike on low.
- Frame time still moves by up to ~4 ms between boots for the same spot (low river 10.0 / 5.9 / 9.05 ms), so budgets.md marks every frame-ms row **provisional** until an idle-machine re-baseline.
- The gate wording now prefers a **same-session** comparison: `node tools/perf_spots.mjs --url-suffix "" --url-suffix "?assets=modular"`, judging modular against that run's classic. The absolute tables are the fallback.
- **New observation, recorded not explained:** low is not cheaper than medium per synced frame at river and meadow, although render-only throughput orders the tiers (1.1–1.5 / 1.4–1.8 / 2.0–2.4 ms). The synced number is a latency with the GPU idle most of each 60 Hz slot.
- Draw calls at the river vary between boots (low 350–437), so the low-tier rule uses the measured boot range for calls and ±2 % for triangles (boot spread ≤ 1.9 %).

### 3. Shadow pass in the budget derivation: fixed, and the proof re-checked
- budgets.md now has "The shadow pass counts twice": casters cost ×1.5 amortised on medium and ×2 on high (×2 on any refresh frame). The sun's shadow camera is a 76 m box centred on the cat, so nearly every caster is in it.
- **The old proof fails with shadows:** 1.754 M × 1.5 = 2.63 M > 1.84 M (medium) and × 2 = 3.51 M > 2.08 M (high). The old caps are withdrawn.
- **New largest caps per band: 25,000 / 6,000 / 1,000.** Worst case 14 × 25k + 81 × 6k + 192 × 1k = 1,028,000 before shadows:
  - medium × 1.5 = 1,542,000 ≤ 1,841,013 (river headroom, mean);
  - high × 2 = 2,056,000 ≤ 2,078,783 (0.3 × classic high at the river).
- Class caps:

  | Class | Triangles hero / mid / far |
  |---|---|
  | small prop | 5,000 / 1,200 / 250 |
  | structure | 12,000 / 3,000 / 600 |
  | building | 25,000 / 6,000 / 1,000 |
  | tree | 25,000 / 6,000 / 1,000 |
  | character | 130,000 / 32,000 / 8,000 (≈ classic, one for one) |

- **Draw calls re-checked with the shadow pass.** Live meshes: hero ≤ 2, mid and far 0, all non-casting; ≤ 2 shared live calls per family; 20 families. 68 + 1.5 M ≤ 104 (medium) and 68 + 2 M ≤ 90 (high) give **≤ 11 new merged materials** for the whole kit.
- **Build time re-checked against the quiet re-measure of `--assets`** (2.3 s, build ms about half the contended run's; triangles identical): the +25 % headroom is 224 ms, and the worst case of 40 hero variants + 600 repeats at 0.1 ms = 195 ms.
- Scene budgets now use means and amortised values: medium ≤ classic high; high ≤ 1.2× (frame, calls) / 1.3× (triangles).
- Headroom table: medium +1.84 M triangles and +104 calls (river); high +2.08 M and +90 (shrine).

### Raw data copied out of scratch, cited in perf.md with SHA-256
All in `/Users/c1t1zen/Documents/GitHub/michi-wt/_baseline/perf/`:

| File | SHA-256 |
|---|---|
| `perf-baseline.json` | `f82e49e8…63fbe6` |
| `assets-baseline.json` | `d5eebb6e…5351d` |
| `inview-bands.json` | `4ef77e61…1aef` |
| `perf-baseline-run1-contended.json` | `f22b4a68…17355` |
| `assets-baseline-run1-contended.json` | `54aaad6f…351d` |

### After merging integration 4bac869 (f1-runtime moved startGame/init)
- The hooks still bracket the build. `Game.init()` now awaits `assets.preload()` after the constructor's `#canvas` lookup, so world build includes the preload; budgets.md says so.
- Same-session smoke: `node tools/perf_spots.mjs --tiers medium --spots shrine --boots 1 --rounds 1 --frames 60 --warmup 1500 --url-suffix "" --url-suffix "?assets=modular"` → both sets measured.
  - Classic: 7.02 ms amortised, 448/170/309 calls, world ready 1239 ms.
  - Modular: 7.70 ms, 447/170/309 calls, 1230 ms. With no kit families registered yet the counts are identical.
- `node tools/game_shot.mjs --query "hour=10.5&cam=0,4,-6,0,1,0&nohud=1&shot=1&assets=classic" --out …` → `render: {"calls":449,"triangles":5102973,…}`, exit 0 (f1-runtime's tool on headless.mjs).
- `node tools/check_syntax.mjs` → All 44 modules OK.
- `node tools/verify.mjs` → All checks passed.
- `node tools/kit_check.mjs` → All kit checks OK (27 passed).
- `node tools/labs_check.mjs` → All labs checks OK.
- `git diff --check` → clean.
- `node tools/footprint_golden.mjs` → EQUAL.
- PR diff vs merge-base: the same 8 lane files + 66 preview JPGs.

### Deferred (as instructed)
Repeatability via seeded `Math.random` / `page.clock`, the headless nits, and per-capture try/catch.
