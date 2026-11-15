# v-nest handoff
- Inventory: ids `nest`, `nest-eggs`, `guardian-feather` -> add `"kit": {"family": "nest"}` per the lanterns/rocks pattern (no schema change); lab specimens already cover them (`nest/game-nest`, `nest/lined`, `nest/eggs`, `nest/feather`).
- Production adapters (catalog): nest, nest-eggs, guardian-feather -> family `nest`.
- Part names: `asset:nest/twigs`, `asset:nest/lining`, `asset:nest-eggs/eggs`, `asset:guardian-feather/quill`, `asset:guardian-feather/vane`. Bound names unchanged: nestMesh '.', nestFeatherMesh '.'.
- Footprint waivers: none. New merged materials: 1 (`km.bag({rough:0.9, brush:0.1})`, shared by all three-of-nest static parts). Draws: all static, merged by material; +0 live.
- Helpers: none to move (uses src/kit/craft.js Bag/tube/merge only).
- Hot-file patches: none; `src/kit/index.js` regenerated with `node tools/kit_index.mjs`.
