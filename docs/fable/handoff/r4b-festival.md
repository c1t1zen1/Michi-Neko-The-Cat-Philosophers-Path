# Handoff: r4b-festival (family `rooffestival`, part b)

Ids: roof-sky, roof-hills, roof-okuribi, roof-distant-city, roof-atmosphere (files hills.js, sky.js, fires.js, city.js, atmosphere.js, fx.js).
Run `node tools/kit_index.mjs`; `src/kit/index.js` is not committed.

## Routing (in-lane, R76)
- `rooftops/js/sky.js`: `Sky` takes `opts.assets`; `_route(id, more, classic)` calls `assets.build`; `roof-sky` returns `{ uniforms, dome, clouds, moon }`, `roof-hills` `{ parts.hills, hillMat }`, `roof-okuribi` `{ fires }` (the classic fire records, so `Sky.update`, `lightFire`, `resetFires` are unchanged). The lights, fog and `setPhase` stay classic. Layout: `{ center: {x,z}, ringR, lowPower }`, band `near`.
- `rooftops/js/atmosphere.js`: `RooftopAtmosphere` takes `opts.assets`; `_ambientLayout()` derives the petal, smoke and firefly positions from the level (plain data); `roof-atmosphere` returns `{ petals, smoke, fireflies, birds, motes }`. ImpactFX (landing bursts) stays classic.
- `rooftops/js/game.js` (one block moved, two option lines): the AssetRuntime is built and preloaded before the Sky.
- `roof-distant-city` was already routed by `build.js` (extraLayout): the kit city reads `layout.bounds` and `layout.route`.
- `labs/asset_inventory.json`: `roof-sky` gets a `buildDome()` source row; `labs/ASSET_COVERAGE.md` regenerated.

## Integrator
1. `node tools/kit_index.mjs`, commit `src/kit/index.js`.
2. budgets.js rows added (roof-okuribi, roof-atmosphere, roof-distant-city) with measured classic numbers.
3. The city uses `km.shared('matte')` (already added by roof-skyline-pagodas in part a): 0 new merged materials; modular draws <= classic (see the status file).
4. Hayashi/attach notes for r5 are in the part-a handoff.

## Deferred / notes
- No footprint waivers. Hills and city are barely visible from the run camera; judged by geometry counts and the finale framing.
- Pagoda warm-build flake (part a) still recorded for the quiet pass (R54).
