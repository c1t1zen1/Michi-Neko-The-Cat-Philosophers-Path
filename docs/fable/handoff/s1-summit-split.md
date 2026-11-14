# Handoff: s1-summit-split

What the Integrator must know or do to merge lane `s1-summit-split` (guide
section 11, S1.1 to S1.5). No hot-file patch is required: the lane was granted
`src/mountaintop.js`, and `src/main.js`, `index.html` and `src/ui.js` are
untouched.

## 1. The runtime hook (no `main.js` change)

`SummitManager`'s constructor has the owner line, right after its material
table is complete:

```js
this.assets = scopeAssets(game.assets, { MAT: this.MAT, textures: TEX });
```

`src/main.js` builds `this.assets = new AssetRuntime(...)` in `init()` before
`assembleWorld()`, and constructs `this.summit = new SummitManager(this)` later
(line ~355), so the summit gets its own scoped view (its `MAT`, its textures,
its own `instances`). `scopeAssets(undefined)` returns `CLASSIC_ASSETS`, so the
review page, `tools/summit_test.mjs` and the golden (stub games without
`assets`) stay classic. `placeAsset()` falls back to `CLASSIC_ASSETS` when
`this.assets` is missing (the Summit Lab runs builders on
`Object.create(SummitManager.prototype)`).

`main.js` calls `this.assets.update(...)` only off the summit; `SummitManager.update()`
now runs `this.assets.update(dt, t, this.assetEnv(sky))` for the summit's own
instances while the summit is active (a no-op on classic: no instances). The
global runtime's `update()` (valley) also visits summit instances, harmlessly.

Booted and checked: `/__boot.html` (classic) and `/index.html?assets=modular`
(`--session catwalk_autostart=new`) both play; entering the summit in the live
game gives a scoped view (`set` classic / modular), 0 kit instances, 24
colliders, 8 platforms, the update loop running; the only console line is the
known optional `cad-overrides.json` 404.

## 2. Cache tags

Every `src/summit/*.js` import carries the tag (currently `20261107a`), and so
do `tools/summit_golden.html` and `tools/summit_golden.js`. When the tag is
bumped:

- the Node one-liner in AGENTS.md walks all of `src/`, so it covers
  `src/summit/`;
- the `sed` form lists `src/*.js src/kit/*.js src/kit/*/*.js ...`: add
  `src/summit/*.js` to it;
- bump `tools/summit_golden.html` and `.js` by hand (like the other goldens).

`node tools/verify.mjs` now fails ("summit modules import with the main.js
cache tag") if a summit module is left behind.

`tools/check_syntax.mjs` walks `src/*.js`, `src/kit/` and `src/characters/`,
not `src/summit/`. `tools/verify.mjs` step 1 syntax-checks `src/summit/*.js`
itself ("All 8 summit modules OK"); if you prefer one place, add
`src/summit` to the `check_syntax.mjs` walk.

## 3. Inventory anchors (applied in this lane, as the brief allows)

26 of the 32 summit rows anchor a builder name (`"  buildMeadow("`, …) and
still match `src/mountaintop.js` verbatim: the facade keeps every builder as a
one-line delegator. Six anchored a line inside a builder body that moved to
`src/summit/`; inventory sources must be top-level `src/` modules, so only
these anchor strings changed (file stays `src/mountaintop.js`):

| Row | Old anchor | New anchor |
|---|---|---|
| `summit-enso` | `enso.name = 'Weathered Enso'` | `  buildMeditationStone(` |
| `summit-furin` | `furin.name = 'Summit Furin'` | `  buildMeditationAtmosphere(` |
| `bay-bridge` | `bridge.name = 'Bay Bridge'` | `  buildHarbourAndIslands(` |
| `ferris-wheel` | `wheel.name = 'Harbour Ferris Wheel'` | `  buildHarbourAndIslands(` |
| `summit-butterflies` | `this.butterflies.name = 'Summit Butterfly Visitors'` | `  buildAmbientWildlife(` |
| `summit-birds` | ``bird.name = `Summit Fly-by Bird`` | `  buildAmbientWildlife(` |

`labs/ASSET_COVERAGE.md` was regenerated (`--write`, line numbers only);
`labs_coverage` OK (37 modules, 112 construction methods, 190 rows, 120
targets), `fable_swap_matrix` current. The catalog's "Summit game review" link
keys on `src/mountaintop.js` in a row's sources, which is unchanged.

## 4. The Summit Lab code panel

`labs/summit/js/recipes.js` shows `SM.prototype.buildKyotoCity`'s source as the
"The city, today" recipe. The tile still builds (the method is a delegator that
runs the real builder with the lab's kit object as `this`), but the code panel
now shows the one-line delegator. Whoever next owns `labs/summit` (lane `s3`)
can show `vistaMethods.meshKyotoCityClassic` instead (import it through
`labs/shared/game.js`).

## 5. For the summit kit lanes (`s2-clearing`, `s3-vista`, `s4-summit-life`)

Never open `src/mountaintop.js`: add kit assets under `src/kit/<family>/` with
the summit inventory ids. Each id's layout carries `index`, `name` (the classic
object name where there is one), `x, y, z, ry` (summit-local), `parent` (a
summit object name, e.g. `'Layered Kyoto Bay Vista'`) or `space: 'valley'`
(shrine rays), `footprint` (`colliders` / `platforms` as summit-local
`addColliderBox` / `addPlatformBox` argument lists; R12/R18) and `bind`
(manager field → part key). All of an asset's `this.rng()` draws are already in
its layout (the stream position is proven identical with every id swapped in);
a kit draws only from `ctx.rng`.

The classic step also sets manager fields that `update()`, `setQuality()` and
`updateVistaEnvironment()` read. A kit must provide them through `layout.bind`
parts or `footprint.anchors` (`this[name] = value`), or the summit's per-frame
code needs a guard (a facade edit for the Integrator). The ones read without a
guard are marked **unguarded**:

| Id | `bind` (field → part) | Other fields the classic step sets |
|---|---|---|
| `summit-light` | `summitSkyFill → sky_fill`, `summitWarmFill → warm_fill` | (read guarded) |
| `shrine-rays` | `raysGroup → beacon` | `_rays` (**unguarded** in `update()` once unlocked: objects with `material.opacity`, `userData.phase/baseOpacity`) |
| `summit-meadow` | – | – |
| `summit-entry` | `vistaApproach → approach`, `torii → torii` | 8 platforms, 2 colliders (from the footprint) |
| `meditation-stone` | index 0: `perchStone → stone`; index 1 (path): – | `meditationPath` is set by the layout step |
| `summit-enso` | – | – |
| `meditation-atmosphere` | `meditationPool → pool`, `meditationMotes → motes` | `meditationPoolMat`, `meditationMoteMat` (guarded); mote anchors and seeds come from the layout step |
| `summit-furin` | `furin → bell`, `furinSail → sail`, `furinClapper → clapper` | all three are used together once `furin` is set |
| `summit-shoulder` | `approachShoulder → shoulder` | `summit_test` reads `approachShoulder.userData.coverage` |
| `summit-path` | `lowerPath → path` | – |
| `summit-terrain` | `summitTerrain → terrain` | `summit_test` reads `summitTerrain.userData.coverage` |
| `summit-trees` | `backBrush → brush` | `swayables` entries (crowns swayed by `update()`), 22 colliders (footprint) |
| `summit-grass` | – | `grass`, `grassMat` (guarded) |
| `summit-vista` | `vista → layers` (the layers below are added to it) | – |
| `vista-terrain` | – | `vistaRiverMat`, `vistaRoadMat` (guarded) |
| `kyoto-city` | – | `cityWalls/Roofs/Eaves`, `cityInstanceMax`, `city*Mat`, `cityLights`, `cityLightMat` (the pagoda's lanterns share it), `cityGardens`, `cityGardenMax`, `cityGardenMat` (guarded) |
| `summit-pagoda` | `kyotoPagoda → pagoda` | `pagodaWallMat/TimberMat/RoofMat` (guarded) |
| `summit-bay` | `bay → water` | `bayMat`, `bayTexture`, `bayGlints`, `bayGlintMat`, `vistaBoats` (guarded) |
| `harbour` | index 0 (skyline, lights), index 1 (islands): – | `harbourSkyline`, `harbourSkylineMax`, `skylineMat`, `harbourLights`, `harbourLightMat`, `vistaIslands`, `islandMat` (guarded) |
| `bay-bridge` | – | `bridgeMat` (guarded) |
| `ferris-wheel` | `ferrisWheel → wheel` | `ferrisWheelMat` (guarded) |
| `horizon` | – | `horizonRangeMats` (guarded) |
| `slope-forest` | – | `slopeForest`, `rimThicket` (guarded) |
| `summit-clouds` | – | `summitClouds` (**unguarded** in `update()`: `{ mesh, material, storm, speed, minX, maxX }`) |
| `blender-roofscape` | `vistaLandmarks → roofscape` | `landmarkMats` (guarded) |
| `summit-snow` | `snow → flakes` | `snowMat`; `update()` moves `snow.geometry` positions with the layout's seeds |
| `summit-rain` | `rain → drops` | `rainMat`; as snow |
| `summit-pollen` | `pollen → pollen` | `update()` moves its geometry positions |
| `summit-petals` | `petals → petals` | `petalMat` (guarded) |
| `summit-butterflies` | `butterflies → swarm` | `butterflyMat` (**unguarded** in `updateAmbientWildlife()`) |
| `summit-birds` | – | `summitBirds` (**unguarded**: `{ mesh, wings, active, … }`) |
| `summit-wildlife` | – | the umbrella row: its classic step adds nothing; a kit may add visitors |

Gate for every summit kit lane: `node tools/summit_golden.mjs` must stay EQUAL
on classic, and its routing test must stay ok (it swaps a stand-in in for every
id: same stream position, same colliders and platforms).

## 6. Merge notes

- The lane branch merged `fable/integration` twice (619aab7, then 5297f2d)
  instead of rebasing: the claim commit was already pushed and a rebase would
  need a force-push. The second merge had one conflict, the generated
  `labs/ASSET_COVERAGE.md`, resolved by regenerating it.
- `tools/verify.mjs`: four summit checks now read `src/summit/planting.js` /
  `vista.js` / all summit sources; three checks and a summit syntax pass were
  added after the summit block (before f1's kit checks). Nothing was removed.
