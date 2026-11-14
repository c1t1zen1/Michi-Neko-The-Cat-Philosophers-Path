# Roof Road stage 2 — downtown pass

## Reference dive (13 November 2026)

This is an imaginative, compressed Kyoto neighbourhood, not a navigation map.
The visual aim is a warm, hand-painted animated film world grounded in real
construction: convincing joinery, worn surfaces, useful clutter and everyday work.

| Reference | Observation to carry into the build |
| --- | --- |
| [Kyoto Center for Community Collaboration — Machiya Vision](https://kyoto-machisen.jp/machiya-vision/2020/?lang=en) | Deep, narrow homes combine shops and living quarters. Small gardens interrupt the building mass. Use the interiors of blocks as playable spaces. |
| [Hachise — machiya features](https://www.hachise.com/kyomachiya/features/features.html) | Kōshi lattice, tile eaves, bamboo inuyarai, folding benches and passages provide a specific vocabulary for cat-sized climbing. |
| [Kyoto City — machiya wisdom](https://www.city.kyoto.lg.jp/tokei/cmsfiles/contents/0000260/260189/04_kyoumachiyanochie.pdf) | Layer the frontage, threshold, shaded passage and courtyard rather than treating each house as an isolated box. |
| [Kyoto Prefecture — Takase / Ichi-no-Funairi](https://www.kyoto-kankou.or.jp/info_search/32) | Cargo basins and loading edges explain the canal's boats and small working landings. |
| [Kyoto City — Takase history](https://www2.city.kyoto.lg.jp/somu/rekishi/fm/nenpyou/htmlsheet/toshi22.html) | Retain the shallow cargo-boat identity: broad working hull, cargo lashings and human scale. |
| [Nishiki merchants — illustrated market map](https://www.kyoto-nishiki.or.jp/wp-content/uploads/2024/02/nishikimap_ura20240116_en.pdf) | Cross streets break the long market into smaller encounters; mix produce, fish, pickles and craft frontages. |
| [Kyoto City tourism — Yoiyama guide](https://kyoto.travel/en/news/yoiyama-procession-guide/) | Lanterns, decorated floats and homes displaying folding screens create a lived-in festival. This game compresses several seasonal moments into one evening. |
| [Discover Kyoto — Yoiyama film](https://www.youtube.com/watch?v=5cbEJKloyjo) | Food preparation, cloth movement and clustered visitors make the fair feel inhabited even with a small cast. |

## Local lab study and reuse

- `labs/alley/js/props.js`: slatted crate construction, stave barrels, straw
  bindings, clay pots and household clutter. Adapt the geometry recipes into
  shared-material batches; do not load the whole workshop into the game.
- `labs/machiya/js/machiya.js`: layered eaves, timber framing and small façade
  details at believable scale.
- `labs/greenery/js/kit.js` and `labs/shared/bamboo.js`: branching leaf silhouettes,
  varied greens and bamboo nodes; adapt for trellises, vines and utility details.
- `labs/shared/water.js` and `labs/water/`: shallow/deep colour separation,
  directional flow and reflected light. Keep this mobile scene to one water
  pass rather than adding a second full-scene reflection render.
- `labs/shared/paperlantern.js`: paper ribs, end caps and warm emission.
- `labs/villagers/`: distinct roles and small looping actions, applied here to
  human stallkeepers, laundry workers and festival visitors.
- `src/textures.js`: reuse the actual game's kawara, plaster, timber, stone,
  straw, shōji and lacquer sets. New paint maps remain procedural and ≤256px.

## Delivery passes

1. Research and route: approximately triple the 337m run, weave through downtown
   in both turn directions, add low tunnels and alley pockets, retain forgiving
   floors and proven climb-backs. Push the research checkpoint first.
2. Play and framing: Chidori alternates dashes, prowls, waits and harmless feints;
   fit both cats in portrait with touch-safe space. Keep optional guidance soft.
3. Scenery: implement every playable piece, working stalls and laundry, improved
   boats/current/vines/posts, and spatial batching for mobile. Review rendered
   portrait and desktop views and run the complete route before merging.

Validation results and phase commit links are recorded below as work completes.

## Playable expansion checkpoint

- Route: **1,082.05m** (3.21× the previous ~337m), 14 legs and 13 rounded
  intersections, with turns in both directions through the downtown blocks.
- 620 platforms, including the final delivery step; eight solid
  tunnel soffits, five deep alley pockets, two moving takasebune, nineteen
  yatai, thirty residents, trellises, pole crossarms and three market skylights.
- Chidori now uses `Runner` physics and local support planning. The sequence
  includes saunter, dash, wait, prowl, backtrack feint and optional detour.
  Stopping, dropping and reversing from every lantern are regression-tested.
- Portrait fits the volumes of both cats. Small dithered architectural openings
  reveal cats hidden behind foreground houses or canal banks; the feature uses
  the existing opaque render pass. Desktop keeps a wider side view.
- Static meshes are merged by material and 32m spatial cell. Nearby detail and
  live workers are culled by distance; background roofs remain instanced.
- Adapted the Greenery leaf paint and directly reused the shared nodal bamboo
  geometry. New paving, work cloth, weathered timber, rope and clay paint maps
  are procedural and no larger than 256px. No bitmap download was added.

Checks at this checkpoint: `node tools/rooftop_test.mjs` (40/40),
`node tools/rooftop_companion_test.mjs` (4 scenario suites),
`node tools/verify.mjs`, `node tools/labs_check.mjs`, and portrait Chromium
boot/captures at all seven lanterns. The tests exposed and fixed a pre-existing
vent-wall error: its collision wall now begins on the canopy, so it no longer
blocks the market underneath. Real-device frame-rate validation remains a
separate hardware check; browser emulation does not establish phone performance.
