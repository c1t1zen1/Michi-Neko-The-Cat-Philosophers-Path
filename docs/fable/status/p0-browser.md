# p0-browser

Phase 0, browser half of lane `p0-baseline` (the Node half is `p0-checks`,
recorded in `docs/fable/status/p0-baseline.md`).

- Worker / model:     Claude Opus 5.5
- Claimed:            2026-11-13 03:10 PST
- Branch:             fable/p0-browser
- Base commit:        ed9f5b9 (fable/integration = main)
- State:              in progress

## Steps
- [x] 1 `tools/headless.mjs`: shared headless CLI + module (pushed first, 6f0fca8; `local`/`init` options 09760ef)
- [x] 2 Browser half of P0.2 → `docs/fable/baseline/checks-browser.md`
- [x] 3 P0.3 perf → `tools/perf_spots.mjs` + `docs/fable/baseline/perf.md` (bd46685)
- [x] 4 P0.4 captures → masters (outside the repo) + previews + `captures.md` (1a86f0b)
- [x] 5 P0.5 budgets → `docs/fable/baseline/budgets.md` (8a94d1b)
- [ ] 6 Report + PR

## Checks run (command → real result)
- `node tools/headless.mjs "/tools/town_preview.html?sheet=street" --wait "…startsWith('town')" --shot …` → ok, 3.6 s, Metal renderer confirmed
- `node tools/headless.mjs /tools/labs_geometry_test.html --wait "window.__geometryResults" --eval "…" --fail-on-error` → `"32/32"`, exit 0
- `node tools/perf_spots.mjs --shots … --out …` → 3 tiers × 4 spots × 3 boots in 13 min, exit 0 (tables in `perf.md`)
- `node tools/perf_spots.mjs --assets --out …` → 124 classic assets, 0 errors, 5 s
- Catalog suites against `PORT=<free> node cadJS/server.mjs`: browser-smoke 17/17, adapters-browser 195/195, cad-handoff-browser 12/12; `git status` unchanged by the suites
- `node tools/headless.mjs /__boot.html --console --timeout 1500 --wait "window.game?._bootDissolved === true && window.game.menu?.isPlaying"` (Metal) → ok, 2,956 / 3,451 / 4,920 ms; only console line: the optional `cad-overrides.json` 404
- same on `--gpu swiftshader` → ok; 132 s with a 10 s settle; timed run: world build 39.6 s, first frame 127.6 s, playing at 196 s
- `node tools/capture_baseline.mjs --masters …/_baseline` → 62 captures × 2 passes in 5.3 min, exit 0, no console errors; noise floor in `captures.md`
- `ls /tmp/michi-test` → No such file or directory (the 44-check smoke suite was not run)

## Notes for the Integrator
- Phase 0 changes no game file. Lossless masters live outside the repo in
  `/Users/c1t1zen/Documents/GitHub/michi-wt/_baseline/` (ruling R8).
- `tools/headless.mjs` API is exactly the brief's (`openPage`, `runPage`,
  `diffImages`), plus additive exports and options.
