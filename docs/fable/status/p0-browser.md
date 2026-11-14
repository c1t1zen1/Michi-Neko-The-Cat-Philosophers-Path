# p0-browser

Phase 0, browser half of lane `p0-baseline` (the Node half is `p0-checks`,
recorded in `docs/fable/status/p0-baseline.md`).

- Worker / model:     Claude Opus 5.5
- Claimed:            2026-11-13 03:10 PST
- Branch:             fable/p0-browser
- Base commit:        ed9f5b9 (fable/integration = main)
- State:              ready for review

## Steps
- [x] 1 `tools/headless.mjs`: shared headless CLI + module (pushed first, 6f0fca8; `local`/`init` options 09760ef)
- [x] 2 Browser half of P0.2 → `docs/fable/baseline/checks-browser.md` (6852c43)
- [x] 3 P0.3 perf → `tools/perf_spots.mjs` + `docs/fable/baseline/perf.md` (bd46685)
- [x] 4 P0.4 captures → masters (outside the repo) + previews + `captures.md` (1a86f0b)
- [x] 5 P0.5 budgets → `docs/fable/baseline/budgets.md` (8a94d1b)
- [x] 6 Merged `origin/fable/integration` in (no overlap; merge, not rebase, so no force-push), checks rerun, report + PR

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
- After merging `origin/fable/integration` (5dc924a): `node tools/footprint_golden.mjs` (f1-golden's CLI, through this `runPage`) → `footprint golden: EQUAL`, exit 0, 3.3 s; `node tools/check_syntax.mjs` → All 37 modules OK; `node tools/verify.mjs` → All checks passed; `node tools/labs_check.mjs` → All labs checks OK; `git diff --check origin/fable/integration` → clean; `git diff --name-only origin/fable/integration` → only this lane's 8 files + 66 preview JPGs

## Review fix round 1 (2026-11-13 17:00 PST)
- [x] Bimodal counts: frames tagged by shadow-map refresh (`game._shadowFrame === 0`); perf.md reports shadow-refresh / other / mean (and amortised frame ms); `--frames` must be even
- [x] Contention: boots interleaved across tiers, `os.loadavg()` per boot; re-baselined at load 1.35–2.54 (`node tools/perf_spots.mjs --shots … --out …` → exit 0, 9.6 min); frame-ms budgets marked provisional; gate prefers a same-session run (`--url-suffix` is repeatable)
- [x] budgets.md: shadow pass ×1.5 (medium) / ×2 (high) in the derivation; caps lowered to 25k / 6k / 1k (worst case 1.54 M ≤ 1.84 M medium, 2.06 M ≤ 2.08 M high); draw calls re-checked (≤ 11 new merged materials)
- [x] Raw JSON in `/Users/c1t1zen/Documents/GitHub/michi-wt/_baseline/perf/` (cited in perf.md with SHA-256); probe page is `labs_geometry_test.html`
- [x] Merged `origin/fable/integration` @ b45953d, then @ 4bac869 (f1-runtime); perf hooks re-checked on the new `Game.init()` wiring with a same-session run (`--url-suffix "" --url-suffix "?assets=modular"`, medium/shrine: both sets measured, identical counts with no kit families yet); `tools/game_shot.mjs` exit 0; check_syntax 44 OK, verify passed, kit_check 27 passed, labs_check OK, footprint golden EQUAL

## Notes for the Integrator
- Phase 0 changes no game file. Lossless masters live outside the repo in
  `/Users/c1t1zen/Documents/GitHub/michi-wt/_baseline/` (ruling R8).
- `tools/headless.mjs` API is exactly the brief's (`openPage`, `runPage`,
  `diffImages`), plus additive exports and options (`local`, `init`, `args`,
  `ignore`, `waitUntil`; `convertImage`, `openImageTool`, `startServer`,
  `gpuInfo`, `waitForExpression`). f1-golden's CLI already runs on it.
- This lane's status file is `p0-browser.md`; p0-checks kept
  `p0-baseline.md` for the Node half. Fold them if one lane record is wanted.
- The review sheets (`tools/*_preview.js`) import game modules with
  `?v=20261106a` while `src/` is on `20261107a`; pre-existing, not changed
  here (tags are Integrator-only).
