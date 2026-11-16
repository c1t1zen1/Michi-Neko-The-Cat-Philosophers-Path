# s4-summit-life report (Worker B, Claude Sonnet 5.5)

PR: https://github.com/c1t1zen1/Michi-Neko-The-Cat-Philosophers-Path/pull/36 (branch fable/s4-summit-life, base 49c09bc)
Commits: 9d17e48 kit family + claim; a820192 lab specimens, compare captures, handoff, status.

## Built
`src/kit/summitlife/` (index, weather, wildlife, light), 8 assets, all three tiers each:
summit-snow (flakes), summit-rain (drops), summit-pollen (pollen), summit-petals (petals), summit-butterflies (swarm flag + flock), summit-birds (bird_1..4 + wings), shrine-rays (beacon), summit-light (sky_fill, warm_fill).
Reused: weather sprite cloud (`weatherCloud`, textures, `buildRain`, `reducedMotion`/`CALM`) and critters `buildButterflies`. Birds are new (the sparrow has one fixed palette; the summit needs four) and use `km.shared('matte')`.
Deferred: summit-wildlife (umbrella row; classic builds nothing of its own).
Lab 09: `labs/summit/js/life.js` (8 specimens `life-*`, wired by one line each in `labs/summit/js/main.js`); the lab loads with no console errors and the tiles build.
Also changed: regenerated `src/kit/index.js`; two `BUDGET_EXCEPTIONS` entries in `src/kit/budgets.js` (summit-birds mid/far 12 meshes; shrine-rays 11 meshes/11 materials, per-ray opacity pulsing as classic).

## Design points
- No facade edit. Kit snow/rain/petals leave the classic material fields unset so the facade skips them; each instance self-drives from `env.snow` / `env.wet` (the same `summitWeatherAmount`), first frame snaps to target: summit opens in the valley's weather (kit rain 0.62 at 300 ms, classic 0.32 mid-ramp).
- Reduce motion: kit particles run at CALM 0.3 (petals 0.2 like classic); measured petals 0.045 vs 0.227, snow damped.
- Butterfly part `swarm` is a geometry-free flag group (the facade would otherwise write points into wing vertices); the kit fades by scale from the flag.
- Birds go to the facade as `summitBirds` records via `footprint.anchors` (waiver).
- summit-light: same lights and values; the sky-palette driver in vista.js still sets intensity/colour every frame, so exposure is unchanged.

## Checks (real output)
- kit_check: All kit checks OK (306 passed)
- kit_contract_test --family summitlife: 8 assets, 24 builds, 656 checks, 0 failed; merge OK; self-test OK
- footprint_golden: EQUAL; `?swap=<8 ids>:modular`: EQUAL. `?assets=modular&swap=...`: DIFFERENT (54/559/346), identical numbers on the base without my files (other families).
- summit_test: 83 passed, 0 failed. summit_golden: EQUAL, routing ok 32 ids, modular 34/34, single swaps 32/32, 0 throws.
- check_syntax: All 130 modules OK. verify: All checks passed. labs_check: All labs checks OK. git diff --check fable/integration...HEAD: clean.
- Boot `index.html?assets=modular`: summit scoped view modular, 8 instances, problems empty, no console errors.
- Draw calls summit preview (high and medium): 233 clear / 235 rain / 234 snow, classic == modular.

## Captures
docs/fable/status/s4-summit-life/: meditation-{6,12,18,22} classic/modular (exposure identical; pixel deltas are grass/cloud motion), plus birds, birds-close, butterflies, petals-pollen, rays, rain, snow pairs. Produced by a scratch script (outside the repo) that patches `tools/summit_preview.js` in the browser to give the stub game an AssetRuntime; the committed preview has no swap flag.

## Concerns
- Pollen is moved by the facade (not the kit), and that loop ignores reduce-motion for both sets: patch in the handoff.
- Preview snow reads sparse in both sets; butterflies read slightly bright at night (critters emissive).
- Summit Lab specimens are separate studies, not the kit builders. labs/summit/js/main.js may conflict trivially with s2/s3.
- `?assets=modular` footprint golden difference exists on the base; not from this lane.
