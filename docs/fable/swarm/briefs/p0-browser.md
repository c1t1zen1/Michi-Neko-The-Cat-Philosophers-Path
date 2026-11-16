# Lane brief: p0-browser (Phase 0, part 2 of 2 of lane `p0-baseline`)

Worktree: /Users/c1t1zen/Documents/GitHub/michi-wt/p0-browser   Branch: fable/p0-browser (from fable/integration = main @ ed9f5b9)
Report file: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/reports/p0-browser-report.md
Common rules: /Users/c1t1zen/Documents/GitHub/Michi-Neko-The-Cat-Philosophers-Path/.superpowers/sdd/BUILD_GUIDE_FABLE/briefs/_common.md

Phase 0 changes NOTHING in the game. Sibling worker `p0-checks` owns checks.md, swap_matrix.md, decisions.md,
status/p0-baseline.md, docs/fable/README.md — do not create those.

## Your files (create/edit only these)
- `tools/headless.mjs` (NEW, shared CLI every later lane uses — build it well, it is infrastructure)
- `tools/perf_spots.mjs` (NEW)
- `tools/capture_baseline.mjs` (NEW, optional driver for P0.4 built on headless.mjs)
- `docs/fable/baseline/checks-browser.md`, `perf.md`, `budgets.md`, `captures.md`, `captures/` (JPG previews)
- Lossless masters OUTSIDE the repo: `/Users/c1t1zen/Documents/GitHub/michi-wt/_baseline/` (Integrator ruling R8)

## 1. `tools/headless.mjs` (Integrator ruling R7)
Pure Node + external Playwright (`process.env.PLAYWRIGHT_MODULE`, same pattern as `catalog/tests/browser-smoke.mjs`;
read that file first). No new deps, nothing installed into the repo. Requirements:
- Serves a root directory (default: the repo root it lives in) with a tiny built-in static server on a free
  port (correct MIME types for .js/.mjs/.json/.html/.css/.png/.jpg/.glb/.wasm), so parallel worktrees never collide.
- `node tools/headless.mjs <path-or-url> [options]` where a leading `/` path is resolved against the served root.
- Options: `--shot <file.png|file.jpg>`, `--size WxH` (default 1200x750), `--wait "<js expression>"` (poll until
  truthy), `--eval "<js expression>"` (print JSON result), `--timeout <s>`, `--gpu metal|swiftshader`
  (default metal on macOS), `--console` (stream console + pageerror lines, prefixed), `--session k=v` (sessionStorage
  before navigation, needed for `/__boot.html`-style autostart), `--settle <ms>`, `--jpeg-quality N`.
- Exit code non-zero on page errors when `--fail-on-error` is given; always print a final one-line JSON summary
  (`{ok, url, ms, errors, warnings, shot}`).
- `--diff a.png b.png [--out diff.png]` mode: compares two images in the browser via canvas (no deps) and prints
  `{width,height,maxDelta,meanDelta,pixelsOver8}`; exit 0 always (it measures, it does not judge).
- `--help` prints usage with real examples. Keep it one readable file.

## 2. Browser half of P0.2 → `docs/fable/baseline/checks-browser.md`
Using headless.mjs, run and record (command, wall time, real result): `tools/labs_geometry_test.html` (32 checks),
`/__boot.html` full-game headless boot (read `__boot.html`; record every console line that is not an AudioContext
autoplay warning; record wall time on Metal and, if under ~25 min, once on SwiftShader for comparison — skip
SwiftShader if too slow and say so), and the optional catalog browser suites if they run against
`node cadJS/server.mjs` (record "not run" with reason otherwise). Note the machine (sysctl hw.model, chip),
browser version, GPU backend.

## 3. P0.3 perf → `tools/perf_spots.mjs` + `docs/fable/baseline/perf.md`
Boot the full game headlessly (as `__boot.html` does), then via `window.game` (exposed in `src/main.js`) set quality
`low`, `medium`, `high` (find how `Game.applyQuality()` / `settings.values.quality` work) and place the player/camera at
four fixed spots: street, shrine, river, meadow (pick real coordinates from `src/countryside.js` landmarks; record
them in perf.md so they are fixed for every later re-measure). Per tier × spot: frame time (state the method —
e.g. median of N rAF intervals with vsync/frame-rate limit disabled, or timed render+gl.finish), draw calls and
triangles from `renderer.info`, and world build time (time from start to world ready). Each measurement repeated
enough to show its spread. State the machine, browser, GPU backend, and plainly: "this is not a phone or low-end
benchmark". The script must be rerunnable later: `node tools/perf_spots.mjs [--tiers low,medium,high] [--spots ...]
[--url-suffix "?assets=modular"] --out file.json` printing a markdown table.

## 4. P0.4 captures → masters + previews
Every sheet of `tools/town_preview.html`, `hidden_preview.html`, `tree_preview.html`, `cat_preview.html`,
`summit_preview.html` (enumerate sheets/views from their .js files and AGENTS.md; include the `golden`/`night`
variants AGENTS.md lists) and the Roof Road `kyoto-rooftops.html?mouth=1..7` plus `?finale=1` (with `&shot=1&nohud=1`).
Find how each page signals "ready" (read its JS) and wait on that, not on a fixed sleep.
- Lossless PNG masters → `/Users/c1t1zen/Documents/GitHub/michi-wt/_baseline/<page>/<sheet>.png`.
- JPG previews (≤ ~250 KB each, quality ~80) → `docs/fable/baseline/captures/<page>/<sheet>.jpg`.
- `captures.md`: table of every capture: exact URL, size, master path, SHA-256 of the master, preview path.
- Repeatability: capture every sheet a second time and `--diff` against the first; record maxDelta/meanDelta per
  sheet. This is the noise floor later "matches Phase 0" claims are judged against. If a page is not repeatable,
  say why (time-driven animation, unseeded randomness) — do not fix game code.
Keep the total repo footprint of previews modest (< ~25 MB); masters live outside the repo.

## 5. P0.5 → `docs/fable/baseline/budgets.md`
Propose triangle, draw-call, frame-time and world-build-time budgets per tier for the modular set, derived from the
P0.3 numbers (e.g. modular `medium` ≤ measured classic `high`; modular `low` = classic, since low always resolves to
classic). Also a per-asset build-time and triangle budget per tier (hero/mid/far) for the contract test (AAA-7).
Label them "proposals — accepted provisionally under ruling D1".

## Acceptance
headless.mjs works for every page above (proven by the recorded runs); perf table complete for 3 tiers × 4 spots with
spread; every capture recorded with hash + noise floor; budgets derived from the numbers; no game file touched
(`git diff --stat fable/integration` shows only your files). Commit per step; push; open the PR.

## 6. Module API of headless.mjs (other lanes code against this — keep it exactly)
Besides the CLI, `tools/headless.mjs` must export (and only run its CLI when executed directly):
```js
export async function openPage(pathOrUrl, { root, size = '1200x750', gpu, session = {}, timeout = 120, console: echo = false } = {})
  // → { page, browser, url, errors: [], warnings: [], close: async () => {} }   (close stops browser AND server)
export async function runPage(pathOrUrl, { wait, eval: expr, shot, settle, ...openOpts } = {})
  // → { ok, url, ms, errors, warnings, shot, value }   (value = JSON result of eval)
export async function diffImages(aPath, bPath, { out } = {})
  // → { width, height, maxDelta, meanDelta, pixelsOver8 }
```
`root` defaults to the repo root containing the script. **Do step 1 first and push it as its own commit as early
as possible** (`git push -u origin fable/p0-browser`): the Phase 1 workers are waiting to use it.
