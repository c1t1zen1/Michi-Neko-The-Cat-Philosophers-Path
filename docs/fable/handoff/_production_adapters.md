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

Done at G-V1 (chores item 1): lanterns -> `src/kit/materials.js`, fences culm/knot -> `src/kit/craft.js`, pagoda `CBag` -> `src/kit/craft.js` (exported class; `Bag` internals unchanged). The family files re-export what moved, so existing imports keep working. Kept below for the record.


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
  - `buildPagoda({ preset, H, ... }, { detail: 'hero'|'mid'|'far', material })`: use the kit's shared vertex-colour material, `ctx.kitMaterials.shared('matte')` (G-V1: was `bag({ rough: 0.78, brush: 0.05 })`; budgets.md section 4).
  - Presets (`src/kit/pagoda/presets.js`, verbatim copy of `labs/pagoda/js/presets.js`, keep in step): nine measured towers plus the game-fit `valley`; also `muroji`, `daigoji`, `yasaka`.
  - Detail meshes: hero 7, mid 7, far 3 (podium, tower, sorin). One material (`km.shared('matte')`), deterministic, mergeable.
| v-shrine | torii, shrine-hall, shimenawa, shrine-bell, offering-box, mist-altar, offering-bells | src/kit/shrine/index.js assets |
| v-machiya-a | kawara-roof, koushi, upper-windows, noren, timber-frame, namako, engawa, tea-bench, secret-door, lock-plate | src/kit/machiya/index.js assets (production: "machiya") |
| v-hidden | all 15 hidden ids (moon-pool, lantern-glade, glade-lanterns, ...) | src/kit/hidden/index.js assets (production: "hidden") |
| v-interiors-a | tea-interior, tatami, interior-frame, shoji-doors, tokonoma, scroll, bonsai, chabudai, teaware, zabuton, knockables | src/kit/interiors/index.js assets (production: "interiors/<id>") |
| v-critters | sparrows, koi, butterflies | src/kit/critters/index.js assets (family critters; lab ids critters/flock, critters/sanke, critters/hinge) |
| v-ranges | mountains, edge-forest, edge-undergrowth, foothill-forest, distant-village, mist-ring, dawn-mist | src/kit/ranges/index.js assets |
| v-weather | falling-petals, river-petals, snow, fireflies, dust-motes, rain, rain-ripples, dappled-light | src/kit/weather/index.js assets (production: "weather/<id>") |
| v-machiya-b | tea-house, residence, secret-house, street-house (village-street deferred, classic) | src/kit/machiya/index.js assets (production: "machiya") |
| v-trees | sakura, maples, pines, rim-trees (tree-trunks, tree-canopies DEFERRED, classic) | src/kit/trees/index.js assets (production: "trees") |
| c4-creatures | larry, guardian-crows | src/kit/creatures/index.js assets (production: "creatures") |
| s4-summit-life | summitlife/summit-snow, summit-rain, summit-pollen, summit-petals, summit-butterflies, summit-birds, shrine-rays, summit-light | `src/kit/summitlife/index.js` `assets` |
| s2-clearing | meditation-stone, summit-enso, summit-furin, summit-entry, summit-path | `src/kit/clearing/index.js` `assets` (production: "clearing") |
| v-sky | clouds, stars, moon | src/kit/sky/index.js assets (production: "sky") |
| v-interiors-b | interiors/courtyard-gravel, courtyard-wall, secret-tatami, secret-table, secret-bed, secret-andon | src/kit/interiors/index.js assets (production: "interiors/<id>") |
