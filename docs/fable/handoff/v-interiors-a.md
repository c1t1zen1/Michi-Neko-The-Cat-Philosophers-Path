# v-interiors-a handoff

Family `src/kit/interiors/` (index, common, room, small, tea). Ids: tea-interior, tatami, interior-frame, shoji-doors, tokonoma, scroll, bonsai, chabudai, teaware, zabuton, knockables. `andon` and `courtyard-toro` stay v-lanterns (tea-interior composes the lanterns builders; they are not re-registered here).

## 1. REQUIRED before the contract gate is green: BUDGET_EXCEPTIONS (src/kit/budgets.js, hot)
`tea-interior` is the whole room (every classic sub-part, engawa, courtyard, andon, toro), not a prop. Without this entry `node tools/kit_contract_test.mjs --family interiors` fails 10 budget checks on tea-interior only (meshes, materials, mid/far triangles, warm build ms), nothing else. With it: 11 assets, 33 asset x tier builds, 754 checks, 0 failed.
```diff
 export const BUDGET_EXCEPTIONS = Object.freeze({
+  'tea-interior': { hero: { meshes: 34, materials: 12, buildMs: 12 }, mid: { triangles: 9500, meshes: 34, materials: 12, buildMs: 8 }, far: { triangles: 3000, meshes: 24, materials: 11, buildMs: 5 }, why: 'the whole room as one asset (every classic sub-part plus courtyard, andon and toro)' },
   // 'tea-house': { hero: { triangles: 40000, meshes: 40 }, why: 'a whole building with interior-facing walls' }
```
(Measured: hero 32 meshes / 11 materials / 6.4 ms warm, mid 7,753 tris / 32 meshes / 11 materials / 4.1 ms, far 2,436 tris / 23 meshes / 10 materials. After InteriorManager._mergeStatics the room is 15 meshes vs 20 classic.)

## 2. Room lights (src/interior.js, hot) - works without it, cleaner with it
A kit room replaces the classic assembly, so `this.roomLights` is never set by classic code. The kit instance hands the manager its two lights itself on its first update (`gi.roomLights = lights`, only when `root.parent === gi.group`), because `assets.update` only runs while the cat is OUTSIDE (main.js skips it inside). Clean version: in `setLightsActive(on)` add
```diff
     this._lightsActive = on;
     for (const l of this.roomLights || []) l.visible = on;
+    for (const inst of this.assetInstances || []) if (inst.setLightsActive) inst.setLightsActive(on);
```
(the instance exposes `setLightsActive`). Then delete the `hooked` block in `src/kit/interiors/tea.js` update().

## 3. Knick-knack height bug (f3 handoff section 3) - modular path fixed, classic needs this patch
Modular `knockables` places the cup, bowl and ball at (x, 0.49 + h/2, z) in room-group space (on the table top) and registers `floorY` 0.08 (the tatami top) in group space; the footprint carries a `footprintWaiver`. The brush test in `update()` only compares x/z so it already works (origin x = z = 0). The classic path stays byte-identical and still hides them 100 m up; the exact patch (intended visible change, then `node tools/footprint_golden.mjs --systems --write`) for `layoutKnockables()`:
```diff
-    ].map((d, i) => ({ ...d, index: i, name: `Table Knick-knack ${i + 1}`, rest: [o.x + d.x, topY + 0.05, o.z + d.z], floorY: o.y + 0.05 }));
+    ].map((d, i) => ({ ...d, index: i, name: `Table Knick-knack ${i + 1}`, rest: [d.x, 0.63, d.z], floorY: 0.05 }));
```
(`topY` then goes unused.) That is the f3 handoff's own suggestion (group space, 0.63 above the 0.58 cat platform); the kit seats them on the visible 0.49 table top and the 0.08 tatami top instead, which looks right to the eye.
Classic cup/bowl are CylinderGeometry(top r, bottom r, height): height is `size[2]` for cylinders, so use `d.shape === 'sphere' ? 0.049 + d.size[0] : 0.49 + d.size[2] / 2` if you want exact seats.
Footprint golden: `--systems` with `?swap=knockables:modular` reports the seam line "knockables [[0.08..]] -> [[100.05..]]"; that is the waived difference. With the other ten ids swapped (no `assets=modular`) the seam is ok and counts are unchanged (135 colliders, 1 platform, 5 anchors).

## 4. Shoji paper and andon follow the hour only while the cat is outside
Same cause as section 2: main.js calls `this.assets.update(...)` only when not inside. The paper tint and the andon's glow are set every frame up to the moment of entry and then hold (a visit is short; the day clock barely moves). To keep them live inside add, in main.js after `this.interior.setLightsActive(inside)`:
```diff
+    if (inside) this.interior.assets.update(dt, this.elapsed, this.assetEnv());
```
(scoped view: updates only the interior's instances.)

## 5. Inventory / catalog
- Set `production` adapter ids `interiors/<id>` for the eleven ids; lab evidence for the seven L4 gaps is the new bench (js/specimens.js). New evidence targets (add next to `interiors/pottery`), each `kind: "bench"`, `file: "labs/interiors/js/specimens.js"`:
```json
"interiors/frame":      { "lab": "interiors", "selector": "frame",      "kind": "bench", "file": "labs/interiors/js/specimens.js", "anchor": "  frame: {" },
"interiors/tokonoma":   { "lab": "interiors", "selector": "tokonoma",   "kind": "bench", "file": "labs/interiors/js/specimens.js", "anchor": "  tokonoma: {" },
"interiors/scroll":     { "lab": "interiors", "selector": "scroll",     "kind": "bench", "file": "labs/interiors/js/specimens.js", "anchor": "  scroll: {" },
"interiors/chabudai":   { "lab": "interiors", "selector": "chabudai",   "kind": "bench", "file": "labs/interiors/js/specimens.js", "anchor": "  chabudai: {" },
"interiors/zabuton":    { "lab": "interiors", "selector": "zabuton",    "kind": "bench", "file": "labs/interiors/js/specimens.js", "anchor": "  zabuton: {" },
"interiors/bonsai":     { "lab": "interiors", "selector": "bonsai",     "kind": "bench", "file": "labs/interiors/js/specimens.js", "anchor": "  bonsai: {" },
"interiors/knockables": { "lab": "interiors", "selector": "knockables", "kind": "bench", "file": "labs/interiors/js/specimens.js", "anchor": "  knockables: {" }
```
  then in each row's `coverage` replace the `embedded`/empty entry: interior-frame -> interiors/frame (direct), tokonoma -> interiors/tokonoma, scroll -> interiors/scroll, chabudai -> interiors/chabudai, zabuton -> interiors/zabuton, bonsai (was `[]`, drop the "No original bonsai specimen" note) -> interiors/bonsai, knockables keep `interiors/pottery` related and add interiors/knockables (direct). Then `node tools/labs_coverage.mjs --write`. (The craft bench edits kept craft.js line numbers, so labs_check is green today.)
- `src/kit/index.js` regenerated here (`node tools/kit_index.mjs`; family `interiors`).

## 6. Part names (public)
tea-interior: tatami, frame, tokonoma, scroll, bonsai, chabudai, teaware, platter, fish (bound: `fishMesh`), zabuton, door, courtyard, andon, toro. Standalone: tatami {mats, heri}, interior-frame {walls, timber, border, trim}, shoji-doors {frame, paper}, tokonoma {floor, trim}, scroll {mount, painting}, bonsai {tree}, chabudai {top, legs}, teaware {set}, zabuton {cushion}, knockables {cup, bowl, ball}.

## 7. Footprint / materials / draws
No waivers except knockables (section 3). New merged materials: 1 (`km.paper` shoji, hour-driven; the scroll painting is a second `km.paper` with a map = 2 paper materials, bag/plaster/wood/straw are shared or the interior's own MAT). Live meshes: 0 (the lanterns' andon/toro bring theirs). Perf (in the room, real boot, `tools/headless.mjs`): high classic 73 draws / 414,088 tris vs modular 69 / 425,421; medium classic 73 / 414,088 vs modular 70 / 420,567 (draws lower, tris +1.6 percent at medium over classic high: noted, not waived).
Helpers worth moving into src/kit/craft.js: `TexBag` (textured boxes with world-scale UVs) and `paintingTexture` pattern from `interiors/common.js`.

## 8. Enter the room for a shot
The valley needs the antique key to open the door. For captures: boot `index.html?shot=1&nohud=1&hour=<h>&cam=0,100.4,2,0,100.5,-1&swap=<ids>` with `session catwalk_autostart=new`, then after frame >= 40 run `game.contextActions._doorLatch = true; game.interior.transitionToInterior()` and wait for `game.interior.isInside && !game.interior.isTransitioning` (the latch stops the exit trigger at the entrance), move the cat to (-2, 100, 0.6), and set `game.capture.cam = { pos, target, fov }` per shot. Cat height is y 100.35-100.4.
