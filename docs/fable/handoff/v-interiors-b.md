# v-interiors-b handoff

Ids (all `family: 'interiors'`): courtyard-gravel, courtyard-wall, secret-tatami, secret-table, secret-bed, secret-andon. New files: src/kit/interiors/court.js, secret.js; index.js only appends (part a untouched). src/kit/index.js regenerated (unchanged: the family already exported).

## 1. Budgets
No change to src/kit/budgets.js. None of the six needed an exception.

## 2. Inventory / catalog (hot: labs/asset_inventory.json)
Lab evidence targets (`kind: "bench"`, `file: "labs/interiors/js/specimens_b.js"`), add next to `interiors/knockables`:
```json
"interiors/courtyard-wall": { "lab": "interiors", "selector": "courtyard-wall", "kind": "bench", "file": "labs/interiors/js/specimens_b.js", "anchor": "  'courtyard-wall': {" },
"interiors/secret-tatami":  { "lab": "interiors", "selector": "secret-tatami",  "kind": "bench", "file": "labs/interiors/js/specimens_b.js", "anchor": "  'secret-tatami': {" },
"interiors/secret-table":   { "lab": "interiors", "selector": "secret-table",   "kind": "bench", "file": "labs/interiors/js/specimens_b.js", "anchor": "  'secret-table': {" },
"interiors/secret-bed":     { "lab": "interiors", "selector": "secret-bed",     "kind": "bench", "file": "labs/interiors/js/specimens_b.js", "anchor": "  'secret-bed': {" },
"interiors/secret-andon":   { "lab": "interiors", "selector": "secret-andon",   "kind": "bench", "file": "labs/interiors/js/specimens_b.js", "anchor": "  'secret-andon': {" }
```
Coverage rows: courtyard-wall -> interiors/courtyard-wall (direct, replacing the `interiors/garden` embedded entry); secret-tatami / secret-table / secret-bed / secret-andon -> their `interiors/<id>` (direct; keep `machiya/original-secret` as a second, embedded entry if wanted). courtyard-gravel already has `rocks/rake` (direct). Then `node tools/labs_coverage.mjs --write`. Production adapter ids `interiors/<id>` for the six. (specimens.js got its three lines appended at the end so no line anchor moved: labs_check stays green.)

## 3. Part names (public)
courtyard-gravel {gravel, rake, stones}; courtyard-wall {wall, trim, cap}; secret-tatami {mats, heri}; secret-table {top, legs, set, dish; far: top, set, dish}; secret-bed {cushion} (a futon: rounded shikibuton, folded kakebuton, makura; param `cloth` indigo/moss/plum); secret-andon {frame, paper}. No `layout.bind` parts on any of the six (the table's `fishMesh` bind belongs to its secret-fish component).

## 4. Footprint / gameplay
No waivers. The six carry the classic empty `footprint`; the house's table box, platform and door stay layout data. Nap anchors (tea room zabuton) are part a's and unchanged; the secret bed has no anchor in classic either. The kit andon is scaled 0.82 (frame 0.44 m becomes 0.36 vs classic 0.40, height 0.72).

## 5. Draws / materials / live
New merged materials: none (bag, the room's plaster/timber/engawa/tatami MAT, and the lanterns' andon). Live meshes: secret-andon has 1 (its lit paper, `litWashi`); the others 0. Draw cost measured with `game_shot` (render.calls, hour 12, all six swapped): secret-house view classic 179 / modular 175 (-4); courtyard view classic 32 / modular 33 (+1: the first vertex-colour `km.bag` draw in a room whose frame is still classic; this +1 exists only in a mixed configuration. In the all-modular configuration `tea-interior` builds its own inline courtyard, so the bag is shared and part a measured -3/-4). Triangles +1.3 percent at the courtyard view, +0.2 at the house view.

## 6. Mixed rooms
`courtyard-gravel` / `courtyard-wall` are only placed on the classic or kit-frame path; in the all-modular configuration `tea-interior` builds its own inline courtyard, so they are not placed there. Wall coordinates are room-frame (origin of the room group), gravel is centred on `layout.x/z`.
