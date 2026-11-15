# s4-summit-life handoff

Family `src/kit/summitlife/` (index.js, weather.js, wildlife.js, light.js). Promoted: `summit-snow`, `summit-rain`, `summit-pollen`, `summit-petals`, `summit-butterflies`, `summit-birds`, `shrine-rays`, `summit-light`. Deferred: `summit-wildlife` (the umbrella row: the classic step builds nothing of its own, `() => null`; the butterflies and birds it names are routed and promoted separately). No hot-file edit is needed beyond the generated `src/kit/index.js` (committed) and the budgets entries below.

## Part names (what the facade binds)
| id | parts | bound as |
|---|---|---|
| summit-snow | `flakes` (Points) | `snow` |
| summit-rain | `drops` (LineSegments) | `rain` |
| summit-pollen | `pollen` (Points) | `pollen` (the facade still moves it) |
| summit-petals | `petals` (Points) | `petals` |
| summit-butterflies | `swarm` (empty visit-flag group), `flock` (the InstancedMesh) | `butterflies` -> `swarm` |
| summit-birds | `bird_1..4`, `bird_N_wing_l`, `bird_N_wing_r` | records through `footprint.anchors.summitBirds` |
| shrine-rays | `beacon` (child of the instance root) | `raysGroup`; pulse list through `footprint.anchors._rays` |
| summit-light | `sky_fill`, `warm_fill` | `summitSkyFill`, `summitWarmFill` |

Why the butterfly flag: the facade sets `butterflies.visible` for each visit and, when the bound part has geometry, writes its first vertices as points. The flag is a geometry-free Group, so the facade cannot touch the wings; the kit reads the flag's `visible` and fades the swarm by scale.

## How the kit drives itself (no facade change)
Kit snow, rain and petals leave the classic material fields (`snowMat`, `rainMat`, `petalMat`) unset, so the facade's snow/rain/petal blocks skip, and each instance's `update(dt, t, env)` (run by `SummitManager.update` through `assets.update`) does opacity, visibility and motion from `env.snow` / `env.wet` (= `summitWeatherAmount(sky, ...)`, the same cross-faded value as classic). First frame snaps to the target, so the summit opens in the valley's weather (measured: rain 0.62 at 300 ms, classic 0.32). Volumes are fixed boxes over the clearing (the classic ones, centred on the origin, not on the cat). `setQuality()` still works: it narrows `geometry.drawRange`, which the kit loops honour.

## Footprint waivers
`summit-birds` (`anchors.summitBirds`) and `shrine-rays` (`anchors._rays`) add one anchor each (the facade reads both through `this[name]`); colliders, platforms and exclusions are the classic ones. Both carry `footprintWaiver`.

## Budgets (`src/kit/budgets.js`, carried in this PR as v-weather did)
```js
'summit-birds': { mid: { meshes: 12 }, far: { meshes: 12 } }       // 4 bird records x (body + 2 wings); summit builds near-band only
'shrine-rays': { hero/mid/far: { meshes: 11, materials: 11 } }     // 9 shafts + bloom + pool, each pulsed through its own material.opacity (as classic)
```
Merged materials added: 0. `summit-birds` uses `km.shared('matte')` (R52); the other seven are live Points / Lines / lights with private materials. Draws: unchanged (summit preview, clear/rain/snow, high and medium: 233/235/234 calls classic and modular).

## Inventory rows (`labs/asset_inventory.json`)
Set `production` to `summitlife/<id>` and replace the review coverage with the new specimens (lab 09 `labs/summit/js/life.js`):
```json
{ "id": "summit-snow",        "coverage": [{ "target": "summit/life-snow",        "level": "direct" }] },
{ "id": "summit-rain",        "coverage": [{ "target": "summit/life-rain",        "level": "direct" }] },
{ "id": "summit-pollen",      "coverage": [{ "target": "summit/life-pollen",      "level": "direct" }] },
{ "id": "summit-petals",      "coverage": [{ "target": "summit/life-petals",      "level": "direct" }] },
{ "id": "summit-butterflies", "coverage": [{ "target": "summit/life-butterflies", "level": "direct" }] },
{ "id": "summit-birds",       "coverage": [{ "target": "summit/life-birds",       "level": "direct" }] },
{ "id": "shrine-rays",        "coverage": [{ "target": "summit/life-rays",        "level": "direct" }] },
{ "id": "summit-light",       "coverage": [{ "target": "summit/life-light",       "level": "direct" }] },
{ "id": "summit-wildlife",    "coverage": [{ "target": "summit/life-butterflies", "level": "related" }, { "target": "summit/life-birds", "level": "related" }] }
```
Then `node tools/labs_coverage.mjs --write`. No `labs/registry.js` change (lab 09 already registered; specimens are added in `labs/summit/js/main.js`, one line each for families and specimens).

## Open asks
- Pollen and reduce-motion: the facade moves pollen (`src/mountaintop.js` update, the `pp` block), and that loop ignores the comfort setting for the classic and the kit alike. One-line patch: multiply `wv` and every `dt` term in that block by `(this._reducedMotion ? 0.3 : 1)`. The kit's shader glint is already calm-aware.
- Summit Lab: lane s3 owns the recipes file; this lane only touched `labs/summit/js/main.js` and added `labs/summit/js/life.js`. If s3 reorders families, keep `LIFE_FAMILY` last.
- `summit-light` is the classic pair of lights with the classic starting values; the sky-palette driver in `src/summit/vista.js` still sets their intensity and colour each frame, so exposure from the meditation seat is unchanged (four-time captures in `docs/fable/status/s4-summit-life/meditation-*`).
