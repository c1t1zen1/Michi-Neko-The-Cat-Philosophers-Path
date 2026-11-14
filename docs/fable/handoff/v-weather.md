# v-weather handoff

Family `src/kit/weather/` (index.js, sprites.js, rain.js, light.js). Ids promoted: `falling-petals`, `river-petals`, `snow`, `fireflies`, `dust-motes`, `rain`, `rain-ripples`, `dappled-light`. Single-writer grant used: `src/particles.js` (calm-aware dt only, see below).

## Inventory / catalog (`labs/asset_inventory.json`, hot)
Set `production` to the kit adapter `weather/<id>` for the eight ids above. New lab specimens (all in `labs/weather/js/recipes.js`, family `life`) and the coverage rows they close:

```json
{ "id": "fireflies",  "coverage": [{ "target": "weather/fireflies",    "level": "direct" }] },
{ "id": "dust-motes", "coverage": [{ "target": "weather/dust-motes",   "level": "direct" }] },
{ "id": "scent",      "coverage": [{ "target": "weather/scent",        "level": "direct" }] },
{ "id": "landing-dust","coverage": [{ "target": "weather/landing-dust", "level": "direct" }] },
{ "id": "splash",     "coverage": [{ "target": "weather/entry-splash", "level": "direct" }, { "target": "weather/splash", "level": "related" }] }
```
(`labs/ASSET_COVERAGE.md` is regenerated in this PR; re-run `node tools/labs_coverage.mjs --write` after the inventory edit.) `river-petals` also keeps `water/hanaikada` as its lab link.

## Deferred: `scent`, `splash`, `landing-dust`
Specimens exist (L4) but no kit builder: those three effects live in `src/scent.js`, `src/player.js` (`splashPool`) and `src/context_actions.js` (`spawnLandDust`), none of which route through `placeAsset()` (they are not f3 systems), so a swap seam does not exist and building a kit asset would be dead code. Exact seam requests (each: split into `layoutX()` + `meshXClassic(layout)` routed through a `placeAsset(id, layout, classicFn)` like `src/particles.js`, with `bind` parts named below; classic goldens must stay EQUAL):
- `src/scent.js` `ScentTrail.build()` -> id `scent`, part `motes` (the instanced mesh the per-frame update writes; keep `maxPoints` 80).
- `src/player.js` splash pool (constructor lines ~97-105, `spawnSplash`/`updateSplash`) -> id `splash`, parts `drop_1` ... `drop_N` (own material each, opacity driven per droplet).
- `src/context_actions.js` `spawnLandDust()` / `updateDust()` pool -> id `landing-dust`, parts `puff_1` ... `puff_N`.
Needs a small f3-style split (layout + classic mesh step + `placeAsset`) in each file, then the specimens' build code ports directly (sprite pool, per-mote age colour, ring + puffs, ballistic droplets).

## Reduce-motion / sun path
`Particles.motionScale()` (particles.js) and `reducedMotion()`/`CALM` (kit/weather/sprites.js) are twins by design: particles.js must not import the kit (classic would load it). `light.js` `sunHeightAt()` copies Sky's sun path and is annotated to stay in step.

## Part names
- `falling-petals`, `river-petals`, `snow`, `fireflies`, `dust-motes`: `points` (a `THREE.Points` over `layout.positions`; the game binds it as `petals` / `riverPetals` / `snow` / `fireflies` / `motes`; `snow`, `fireflies` also bind their material for opacity).
- `rain`: `lines` (LineSegments, 4-component vertex colour; bound as `rain`, `rainMat`).
- `rain-ripples`: `ring_1` ... `ring_28` (own material each; the rain pool animates them).
- `dappled-light`: `pools` (one InstancedMesh). Vegetation has no `bind` for dappled light, so `dapplePools` / `dappleMeshes` stay empty on modular: the instance animates itself from `update(dt, t, env)` (golden-hour curve from `env.hour`, thinner in rain/snow via `env.wet`/`env.snow`, 25% fewer pools on medium). `Vegetation.setDensity()` therefore does not touch it.

## Footprint
No waivers (all footprints are `{}` / the rain-ripples list, as classic). Modular systems golden: seam ok.

## Hot-file / shared asks
- `src/kit/budgets.js`: added `BUDGET_EXCEPTIONS['rain-ripples']` (materials 28 per tier): `Countryside.updateRainRipples()` writes opacity per ring, so each of the 28 rings must own a material, as classic does. This PR carries it; keep it on merge.
- Reduce-motion: Game.applyComfort() already toggles `body.reduce-motion`; `Particles.motionScale()` and the kit's `reducedMotion()` read that class (no main.js change needed). Under it kit systems run at 0.3x motion (fall, drift) and 0.35x blink; dappled light stops breathing. Classic motion is untouched (`kitHandles` is empty).
- No new merged materials (0 of 11): every weather mesh is live and unmerged by nature (Points / LineSegments / InstancedMesh), with private materials, and textures are shared per `KitMaterials` set.

## Reusable kit builders (s4-summit-life)
All in `src/kit/weather/sprites.js` (import with the cache tag):
- `weatherCloud(ctx, layout, { size, sizeVar, spin, flip, blink, rate, tints, map, additive, opacity })`: one `THREE.Points`, any spawn volume. It reads only `layout.positions` (xyz per sprite, the buffer the caller's update moves) and never decides where sprites live. Per-sprite size, tumble and blink ride in the geometry (`uv`, `normal`), the shader clock in `uTime`. Returns `{ points, material, uniforms, step(t, calm), dispose }`.
- `cloudInstance(cloud, { update })`: the asset-instance wrapper (part `points`, calm-aware update). Wrap with `defineAsset` and `floating: ['points']`.
- `boxVolume(count, { w, h, d, cx, cz, y0, seed, verts })`: a deterministic spawn box (`verts: 2` for rain streaks). The summit can pass its own box and drive `position` with the same code as `Particles.update` (petals, snow).
- Textures: `petalTexture(km)`, `flakeTexture(km)`, `glowTexture(km, key, 'r, g, b', core)`, `sharedTexture(km, key, make)`.
- `rain.js`: `buildRain(ctx, layout, { strength })` (two vertices per streak, head bright, tail fading), `ringTexture`, `buildRainRipples`.
- `light.js`: `buildDappledLight`, `goldenAt(hour)`, `sunHeightAt(hour)` (the Sky's asymmetric sun path from an hour).
- `reducedMotion()` and `CALM` (0.3): honour them in any new weather.

## Draw calls (R36)
One draw per particle system, as classic (Points / LineSegments). `dappled-light`: one InstancedMesh for all 14 pools (classic: 14 transparent quads, 14 draws; modular medium shows 11). `rain-ripples`: unchanged (28 meshes, only visible ones draw). See the status file for measured perf in rain and snow on high and medium.
