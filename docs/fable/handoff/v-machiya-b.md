# v-machiya-b handoff

## Integrator
- `node tools/kit_index.mjs` was run (unchanged: the family index already lists `machiya`; the new assets arrive through `src/kit/machiya/index.js`).
- `src/kit/budgets.js`: granted in-lane; added BUDGET_EXCEPTIONS `tea-house` and `residence` (materials hero 8 / mid 5, buildMs hero 12) with measured numbers in each `why`.

## Inventory (`labs/asset_inventory.json`)
Add `"production": "machiya"` adapters to `tea-house`, `residence`, `secret-house`, `street-house`.
`village-street` is DEFERRED: it has no geometry of its own (all eight `street-house` components), so a kit asset would be an empty group. It stays classic; its houses are the kit's.

## Part names
tea-house / residence: walls_warm, walls, roof (lower eave and ledges), door, timber (bag), skirt (hero), inuyarai (hero; the merged `bamboo-fence` kit builder, reused).
secret-house: walls, timber. street-house: walls, door, timber.
Far tier: one `timber` bag mesh each. No gameplay binds: the door, lock plate and anchors live in the layout / components (`secret-door`, `lock-plate`).

## Footprint waivers
None. Colliders, platforms, anchors, rng, waterRects and exclusions are the layouts' (golden below).

## Notes
- The house parents do NOT draw koushi, upper-windows, roofs (kawara-roof), noren, timber-frame, namako (street-house), engawa, tea-bench, chochin, nest, crates, secret-tatami / table / bed / andon / door / lock: the Countryside places those from `layout.components`.
- tea-house and residence now carry a namako skirt on the side and back walls (own geometry, game MAT.namako), the inuyarai (reused fence kit) on one side wall, and chochin hooks. This closes the AGENTS.md open item about skirt walls and fence/lantern detail for tea house and craftsman residence; the AGENTS.md line can be reworded by the Integrator.
- The reused `bamboo-fence` builder is called directly with the default params; its material is the fences family's own (`km.bamboo`, same args), no new material.
- New merged materials: 0.
