# Handoff: f3-systems-split

What the Integrator should know or wire after merging this lane. Nothing here
is required for the classic game: the classic set is unchanged (goldens
byte-identical, review sheets byte-identical, boots clean).

## 1. Cache tags

New files that import game modules with the tag (bump them with the others;
they are outside the AGENTS.md `src/*.js index.html` one-liner):

- `tools/golden/systems_digest.js` — imports `../../src/{countryside,hidden_places,interior,vegetation,particles,ambient_life,context_actions}.js?v=20261107a` (one `TAG` constant at the top)
- `tools/footprint_golden.js` — imports `./golden/systems_digest.js?v=20261107a`
- The five split modules import `./kit/runtime.js?v=20261107a` (src/, covered by the one-liner)

## 2. Interior anchors → context_actions.js (optional, recommended)

The interior's gameplay anchors now live in its layout (F3.2) and register on
`InteriorManager` fields (R18): `eatFishAnchor` `[0.3, 0.5, -0.1]`,
`napAnchor` `[-2.2, 0.1, -1.2]`, `enterAnchor` `{ at, heading, camera }` and
`exitZone` `{ minZ: 1.8, halfX: 1.8, rearmZ: 1.2 }`, all origin-relative.
`transitionToInterior()` already reads `enterAnchor`. `context_actions.js` (not
this lane's file) still hard-codes the other three. This patch makes a kit
interior's anchors drive the context actions; it changes no value
(`o.x + 0.3` and `o.z + (-0.1)` are the same doubles as today's `o.x + 0.3`,
`o.z - 0.1`):

```diff
--- a/src/context_actions.js
+++ b/src/context_actions.js
@@ findAction()
       if (!interior.fishEaten) {
-        _tableCenter.set(interior.origin.x + 0.3, interior.origin.y + 0.5, interior.origin.z - 0.1);
+        const a = interior.eatFishAnchor || [0.3, 0.5, -0.1];
+        _tableCenter.set(interior.origin.x + a[0], interior.origin.y + a[1], interior.origin.z + a[2]);
@@
-      _napCenter.set(interior.origin.x - 2.2, interior.origin.y + 0.1, interior.origin.z - 1.2);
+      const n = interior.napAnchor || [-2.2, 0.1, -1.2];
+      _napCenter.set(interior.origin.x + n[0], interior.origin.y + n[1], interior.origin.z + n[2]);
@@ updateDoorProximity()
-      if (!this._doorLatch && localZ > 1.8 && Math.abs(localX) < 1.8) {
+      const ez = interior.exitZone || { minZ: 1.8, halfX: 1.8, rearmZ: 1.2 };
+      if (!this._doorLatch && localZ > ez.minZ && Math.abs(localX) < ez.halfX) {
@@
-      } else if (localZ < 1.2) {
+      } else if (localZ < ez.rearmZ) {
```

`node tools/footprint_golden.mjs --systems` probes all four through the real
code (`interior.anchors.actions` / `exitZone` / `enter` / `exit` in the
digest) and must stay EQUAL after the patch.

## 3. Pre-existing bug found: the knick-knacks hang 100 m above the table

`buildKnockables()` positions the three knick-knacks at `origin + offset`
inside `this.group`, which already sits at the origin, so they render at
world y ≈ 200.6 (the table top is at 100.58) and are never seen. The physics
runs in the same doubled numbers (`floorY` = origin.y + 0.05 in group space),
and the cat-brush test compares the player's world x/z with their local x/z
(equal only because origin.x = origin.z = 0). Kept exactly as built (Phase 1
must not change the picture); `layoutKnockables()` documents it. A fix is a
v-interiors (or Integrator) decision: rest positions and `floorY` in group
space (`[d.x, 0.63, d.z]`, `0.05`) and the brush test converted to group
space. It is an intended visible change: regenerate with
`node tools/footprint_golden.mjs --systems --write` and say why.

## 4. For the kit lanes (v-hidden, v-interiors, v-trees, v-greenery, v-weather, v-critters)

- Owners: each of the five modules has `placeAsset(id, layout, classicFn, parent)`
  and `registerFootprint(fp, …)`; `this.assets = scopeAssets(...)`. Hidden places,
  vegetation, particles and ambient life pass the shared `KIT_TABLES` (`{ MAT, textures }`
  exported by `countryside.js`, gate G-F I2: every owner's `ctx.MAT` / `ctx.textures` are
  Countryside's); the interior passes `{ MAT }` (its `_mergeStatics()` merges by it; kit `live`
  objects stay out of the merge, other kit meshes are eligible).
- Parent / child seams: a kit `moon-pool`, `lantern-glade` or `tea-interior`
  replaces the whole (its footprint is the whole's: all colliders, exclusions,
  water rects, anchors). A kit `tokonoma` / `chabudai` still gets the classic or
  kit `scroll`, `bonsai`, `teaware`, `interior-fish` placed into its group (table
  frame: the classic table group at (0, 0, -0.2); alcove frame: the room origin).
- Part names the owners bind (public interface): `interior-fish` and
  `tea-interior` → `fish` (→ `fishMesh`, protected from the merge);
  `knockables` → `cup`, `bowl`, `ball`; `sparrows`, `guardian-crows` → `wing_l`,
  `wing_r`; `koi` → `tail` (a pivot), `pectoral_l`, `pectoral_r`;
  `falling-petals`, `fireflies`, `dust-motes`, `river-petals`, `snow` → `points`
  (a `THREE.Points` over `layout.positions`, driven by the classic update);
  `rain` → `lines`. `god-rays`: the instance group is the card record's mesh
  (opacity is animated only when it has a material).
- Handles a kit replaces without binding (pool water / caustics / moon / toro
  glow / motes, glade lanterns and fireflies, butterflies) are skipped by the
  owners' update(); such a kit animates itself through `update(dt, t, env)`.
- Footprint formats: hidden places and the interior push `THREE.Box3`
  colliders and `{ x, z, width, depth }` exclusions / `[x, z, w, d]` water rects;
  vegetation registers colliders as `addCollider(x, z, r, h)` records
  `{ x, z, r }`. Extra R18 keys: `platforms`, `knockables` (interior),
  `birds`, `guardianBirds`, `koi` (ambient life), `godRays` (particles).
- Trees: `layout.canopy` is the classic canopy geometry built in the layout
  step (its draws are part of the stream). When a kit tree comes back,
  `canopyTree()` disposes those geometries once and sets `layout.canopy =
  null` (review round 1), so a kit tree must not rely on it. Kit trees are
  not baked into the vegetation's per-material merges; v-trees may want a
  bake hook there.
- Anchors: a kit footprint may leave `anchors` out; `registerFootprint()` in
  the interior and the hidden places fills each missing one from the layout's
  footprint (review round 1).
- The systems golden is the check: classic must stay `EQUAL`; a modular run
  (`--systems --query "?swap=<id>:modular"`) is expected to differ, and the
  `seam` lines (stub runtime: every id modular / every part modular / kit
  footprints without anchors; every update() under the game's Sky, classic
  included; kit trees free their canopies) must stay ok.

## 5. Process notes

- Commits are per module (hidden, interior, vegetation, ambient life,
  particles), not strictly per builder; both goldens were EQUAL at each commit.
- The coordinator's rebases (onto 4bac869 and 619aab7) rewrote this lane's
  own pushed commits; they were published with `git push --force-with-lease`
  to `fable/f3-systems-split` only.
- One pushed commit message lost a word to shell backtick expansion
  (d4dbdbe: "protects kit  objects" should read "protects kit `live` objects").
- `labs/asset_inventory.json` untouched: every anchor snippet in the five
  modules survived verbatim; `labs/ASSET_COVERAGE.md` regenerated (line links).
