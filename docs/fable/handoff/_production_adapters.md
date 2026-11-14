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

## Pending helper moves

- lanterns: `lanterns/light.js` `litWashi`, `washiTexture`, `haloTexture`, `nightnessAt` -> `src/kit/materials.js`
- fences: `fences/culm.js` `culmGeometry`, `knotGeometry` -> `src/kit/craft.js`
- garden: none requested.
- alley: none requested.
- nest: none requested.
- greenery: none requested (bamboo.js `culmGeometry` etc. stay local; v-hidden may import them).
- keepsakes: none requested (shapes.js stays local).
