# Handoff: r3-canal-market
## 1. Inventory/registry
`src/kit/index.js` regenerated (family roofcanal). Ids: roof-stepping-stones, roof-canal-landings, roof-footbridge, roof-toro, roof-cistern, roof-chimney, roof-futon-racks, roof-canopy-vents (family `roofcanal`, tiers hero/mid/far, param `wear`). New part names: `asset:<id>/body_<material>` (stone, timber, timbermed, wetstone, pine, lacquer, indigo, bronze, steel, dark, bamboo, ridge, bengara, plasterwarm, futon, crimson, lanternwhite as used). No new materials, no live meshes, one light socket (`light_toro`).
## 2. Integrator patch: rooftops/js/pieces/common.js (r1's file)
`mergeByMaterial` deletes every attribute other than position/normal/uv (line ~125), so vertex-coloured kit materials (`km.bag`) render black. Preferred patch: `['position','normal','uv','color']` kept, and add a colour attribute (white) to geos lacking it when any in the bucket has one. Until then every Roof Road family must use `ctx.MAT` entries, as roofcanal does. Classic golden must stay EQUAL after the patch.
## 3. Deferred ids
roof-canal, roof-canal-banks, roof-lines need rail points: add `rail` (or a sampled polyline `route` over [s0,s1]) to `pieceLayout()` (build.js, r1 file), then a kit ribbon is possible. roof-cherry-boughs, roof-canopy, roof-skylight-bridge, roof-market-stalls: next r3 PR. roof-takasebune: r5 coupling (boat dynamic record). roof-willows, roof-culvert-ledges, roof-tenmangu-gate: no PIECES entry.
## 4. Roof Road family filter
`?assets=modular` still loads the whole valley kit (r1 minor 4); the runtime change is an Integrator patch.
## 5. Specimens
None added (no labs/registry change).
