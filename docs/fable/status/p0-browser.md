# p0-browser

Phase 0, browser half of lane `p0-baseline` (the Node half is `p0-checks`,
recorded in `docs/fable/status/p0-baseline.md`).

- Worker / model:     Claude Opus 5.5
- Claimed:            2026-11-13 03:10 PST
- Branch:             fable/p0-browser
- Base commit:        ed9f5b9 (fable/integration = main)
- State:              in progress

## Steps
- [x] 1 `tools/headless.mjs` — shared headless CLI + module (pushed first, 6f0fca8)
- [ ] 2 Browser half of P0.2 → `docs/fable/baseline/checks-browser.md`
- [ ] 3 P0.3 perf → `tools/perf_spots.mjs` + `docs/fable/baseline/perf.md`
- [ ] 4 P0.4 captures → masters (outside the repo) + previews + `captures.md`
- [ ] 5 P0.5 budgets → `docs/fable/baseline/budgets.md`
- [ ] 6 Report + PR

## Checks run (command → real result)

## Notes for the Integrator
- Phase 0 changes no game file. Lossless masters live outside the repo in
  `/Users/c1t1zen/Documents/GitHub/michi-wt/_baseline/` (ruling R8).
