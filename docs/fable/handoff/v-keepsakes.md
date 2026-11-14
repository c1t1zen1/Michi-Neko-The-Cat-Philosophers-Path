# v-keepsakes handoff
- Regenerate `src/kit/index.js` with `node tools/kit_index.mjs` (already committed here).
- Inventory (`labs/asset_inventory.json`, hot): set coverage for the four lab specimens in lab 17, e.g.
  `dango` -> `{"target":"keepsakes/dango","level":"direct"}`, `jade-paw` -> `keepsakes/jade-paw`, `secret-fish` -> `keepsakes/secret-fish`, `interior-fish` -> `keepsakes/interior-fish` (all direct); drop their "no study" notes. Then `node tools/labs_coverage.mjs --write`. (Specimens live in `labs/keepsakes/js/treats.js`, spliced in by main.js, so recipes.js line links are unchanged.) `yarn` already has keepsakes/wound; add `"production": "keepsakes"` adapter ids if the catalog uses them.
- New parts: yarn core/thread; key key/glint; dango balls/trim/glow; jade-paw paw/ring; secret-fish fish; interior-fish platter/fish/garnish.
- Footprint waivers: none for the valley ids. interior-fish: bound `fishMesh` is the `fish` part (see status).
- Helpers: src/kit/keepsakes/shapes.js is local; its lab twin labs/keepsakes/js/shapes.js differs only in the craft import. Nothing to move to craft.js.
- Materials: reuses ctx.MAT yarn / goldAntique / plasterWarm (fallbacks to kit materials), km.bag for vertex-coloured shapes. No new merged material.
- Wiring: none in hot files.
