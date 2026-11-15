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
(line ~356), so the summit gets its own scoped view (its `MAT`, its textures,
its own `instances`). `scopeAssets(undefined)` returns `CLASSIC_ASSETS`, so the
review page, `tools/summit_test.mjs` and the golden (stub games without
`assets`) stay classic. `placeAsset()` falls back to `CLASSIC_ASSETS` when
`this.assets` is missing (the Summit Lab runs builders on
`Object.create(SummitManager.prototype)`).

`main.js` calls `this.assets.update(...)` only in the valley (not on the summit,
not inside an interior). `SummitManager.update()` runs
`this.assets.update(dt, t, this.assetEnv(sky))` for the summit's own instances
while the summit is active (a no-op on classic: no instances). The global
runtime's `update()` walks every instance it built, so in the valley it also
updates the summit's kit instances while the summit is hidden: nothing is seen,
and the cost is whatever those instances' `update()` does (none exist yet). If
a summit kit animates heavily, `main.js` can pass the valley's instances only;
that is an Integrator call, not needed today.

Booted and checked (review fix round 1, on the merged tree): `/__boot.html`
(classic) and `/index.html?assets=modular` (`--session catwalk_autostart=new`)
both play; entering the summit in the live game gives a scoped view (`set`
classic / modular), 0 kit instances, 24 colliders, 8 platforms, the update loop
running, `assets.summary().problems` empty; the only console line is the known
optional `cad-overrides.json` 404. `/index.html?swap=summit-furin:modular`
adds exactly one warning (`[kit] summit-furin: ?swap asks for the kit, but no
kit asset is registered under that id; it builds classic`).

## 2. Cache tags

Every `src/summit/*.js` import carries the tag (currently `20261113a`), and so
do `tools/summit_golden.html` and `tools/summit_golden.js`. When the tag is
bumped:

- both AGENTS.md forms (the `find src -name '*.js'` `sed` and the Node
  one-liner) walk all of `src/`, so they cover `src/summit/`;
- bump `tools/summit_golden.html` and `.js` by hand (like the other goldens).
  The golden records the roofscape GLB's URL without its `?v=` (fix round 1,
  01c745e), so a tag bump never reads as a difference.

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

The classic step also sets manager fields that `update()`, `setQuality()`,
the transitions and `updateVistaEnvironment()` read. Since review fix round 1
every one of them is either bound through `layout.bind` or null-guarded, so a
kit may leave any of them out and nothing throws (proven by `summit_test.mjs`
and the golden's routing drive, below):

- **Bound parts** (`layout.bind`): a part the instance does not have binds
  `null` and is warned once through the runtime (`[kit] <id>: the instance
  has no part '<part>' that layout.bind.<field> names`; also in
  `assets.summary().problems`). The per-frame code skips a null handle, and a
  bound part may be any Object3D: positions are only moved when it has a
  position attribute (`pointsPosition()`), colours only set when it has them.
  `summit-vista` without a `layers` part: the classic layers go into the
  instance group. `summit-furin`: the chime's proximity uses the bell part's
  position converted to summit-local space, so a bell inside its instance
  group rings at the layout's spot; the sail and the clapper may be missing.
  `summit-butterflies`: without the classic material, a kit swarm is shown for
  each visit and hidden between visits (its own `update()` animates it).
- **Classic-only fields** (materials, `_rays`, `summitClouds`,
  `summitBirds`, `vistaBoats`, …): a kit build leaves them unset and the
  code that reads them skips them; a kit that wants the facade to drive one
  sets it through `footprint.anchors` with the classic shape (the shapes are
  in the table), and owns that shape.
- **Also warned once**: a `layout.parent` that is not in the summit (the
  instance goes to the summit root) and a `?swap=<id>:modular` for an id with
  no kit registered (it builds classic).
- **Beacon and portal**: the valley-side `update()` no longer depends on
  `raysGroup`; the thicket, the reveal and the walk-into-the-light portal run
  once unlocked whatever `shrine-rays` brings.

| Id | `bind` (field → part) | Other fields the classic step sets |
|---|---|---|
| `summit-light` | `summitSkyFill → sky_fill`, `summitWarmFill → warm_fill` | (read guarded) |
| `shrine-rays` | `raysGroup → beacon` | `_rays` (pulsed once unlocked: objects with `material.opacity`, `userData.phase/baseOpacity`; skipped when unset) |
| `summit-meadow` | – | – |
| `summit-entry` | `vistaApproach → approach`, `torii → torii` | 8 platforms, 2 colliders (from the footprint) |
| `meditation-stone` | index 0: `perchStone → stone`; index 1 (path): – | `meditationPath` is set by the layout step |
| `summit-enso` | – | – |
| `meditation-atmosphere` | `meditationPool → pool`, `meditationMotes → motes` | `meditationPoolMat`, `meditationMoteMat` (guarded); mote anchors and seeds come from the layout step |
| `summit-furin` | `furin → bell`, `furinSail → sail`, `furinClapper → clapper` | the bell sways and rings (summit-local position); the sail and the clapper move when present |
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
| `summit-clouds` | – | `summitClouds` (drifted by `update()` when set: `{ mesh, material, storm, speed, minX, maxX }`) |
| `blender-roofscape` | `vistaLandmarks → roofscape` | `landmarkMats` (guarded) |
| `summit-snow` | `snow → flakes` | `snowMat`; with it `update()` moves `snow.geometry` positions with the layout's seeds; `setQuality()` and `reseedSnow()` skip a part without geometry |
| `summit-rain` | `rain → drops` | `rainMat`; as snow |
| `summit-pollen` | `pollen → pollen` | `update()` moves its geometry positions when it has them |
| `summit-petals` | `petals → petals` | `petalMat` (guarded) |
| `summit-butterflies` | `butterflies → swarm` | `butterflyMat` (guarded: without it the swarm shows for each visit) |
| `summit-birds` | – | `summitBirds` (flown when set: `{ mesh, wings, active, … }`; no pool, no fly-by) |
| `summit-wildlife` | – | the umbrella row: its classic step adds nothing; a kit may add visitors |

Gate for every summit kit lane: `node tools/summit_golden.mjs` must stay EQUAL
on classic, and its routing test must stay ok: it swaps a stand-in in for every
id (same stream position, same colliders and platforms), then drives
`update()`, the unlock, the portal, every weather and light, the perch,
`setQuality()` and leaving on a classic build, an all-kit build with every
bound part a plain Object3D and an all-kit build with no bound parts (no throw,
portal opens, fūrin rings once where a bell exists, each unresolved bind warned
once). `node tools/summit_test.mjs` runs the same drive in Node with bare,
first-part-only and plain-part stand-ins (83 checks). Exit 2 means the routing
test did not run.

## 6. Merge notes

- The lane branch merged `fable/integration` four times (619aab7, 5297f2d,
  c39a982, then 4273c90 in review fix round 1) instead of rebasing: the claim
  commit was already pushed and a rebase would need a force-push. The second
  merge had one conflict, the generated `labs/ASSET_COVERAGE.md`, resolved by
  regenerating it; the fourth merged cleanly (the report regenerated
  byte-identically; the fix round's own line moves then regenerated it again).
- Review fix round 1 regenerated `tools/golden/summit_test.txt` (70 → 83
  checks: 74 lines unchanged, 13 checks and a section header added, the
  summary line changed). `tools/golden/summit_classic.json` changed in one
  line only (01c745e: the GLB URL without its cache tag).
- `tools/verify.mjs`: four summit checks now read `src/summit/planting.js` /
  `vista.js` / all summit sources; three checks and a summit syntax pass were
  added after the summit block (before f1's kit checks). Nothing was removed.
