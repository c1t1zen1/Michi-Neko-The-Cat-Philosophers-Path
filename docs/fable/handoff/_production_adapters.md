# Catalog production adapter ids (for lane t1)

| lane | id | kit export |
|------|----|------------|
| v-rocks | rocks (path-boulders, key-rock) | `src/kit/rocks/index.js` `assets` |
| v-lanterns | lanterns/toro, lanterns/chochin, lanterns/street-lamps, lanterns/andon, lanterns/courtyard-toro, lanterns/pool-toro | `src/kit/lanterns/index.js` `assets` |
| v-fences | bamboo-fence, corral, corral-sign | `src/kit/fences/index.js` `assets` |
| v-garden | shishi, wind-chime | `src/kit/garden/index.js` `assets` |
| v-alley | crates, sake-barrel | `src/kit/alley/index.js` `assets` |
| v-nest | nest, nest-eggs, guardian-feather | `src/kit/nest/index.js` `assets` |
| v-greenery | greenery (street-bushes, roadside-moss, bamboo-groves) | `src/kit/greenery/index.js` `assets` |
| v-keepsakes | keepsakes (yarn, key, dango, jade-paw, secret-fish, interior-fish) | `src/kit/keepsakes/index.js` `assets` |
| v-pagoda | distant-pagoda (podium, storey_1..5, tower, sorin) | `src/kit/pagoda/index.js` `assets` |

## Pending helper moves

- lanterns: `lanterns/light.js` `litWashi`, `washiTexture`, `haloTexture`, `nightnessAt` -> `src/kit/materials.js`
- fences: `fences/culm.js` `culmGeometry`, `knotGeometry` -> `src/kit/craft.js`
- garden: none requested.
- alley: none requested.
- nest: none requested.
- greenery: none requested (bamboo.js `culmGeometry` etc. stay local; v-hidden may import them).
- keepsakes: none requested (shapes.js stays local).
- pagoda: `CBag` flat-array primitive accumulator (src/kit/pagoda/build.js) could replace `Bag` internals in craft.js (3-4x faster); no exact patch given, so pending. 16-view impostor not promoted (R42).

## Reusable kit builders

For s3-vista and r4-festival (import with the current `?v=` tag):

- `src/kit/pagoda/index.js` exports `buildTower(ctx, layout, p)`, `buildPagoda`, `PRESETS`, and `assets`.
  - `buildTower(ctx, layout, p)`: e.g. `p.preset = 'yasaka'`; divides H by `layout.scale`, so layout scale does not change world height.
  - `buildPagoda({ preset, H, ... }, { detail: 'hero'|'mid'|'far', material })`: use a vertex-colour material, `ctx.kitMaterials.bag({ rough: 0.78, brush: 0.05 })`.
  - Presets (`src/kit/pagoda/presets.js`, verbatim copy of `labs/pagoda/js/presets.js`, keep in step): nine measured towers plus the game-fit `valley`; also `muroji`, `daigoji`, `yasaka`.
  - Detail meshes: hero 7, mid 7, far 3 (podium, tower, sorin). One material (`km.bag`), deterministic, mergeable.
