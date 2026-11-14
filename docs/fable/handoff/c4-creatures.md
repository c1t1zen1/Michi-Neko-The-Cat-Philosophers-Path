# Handoff: c4-creatures

No hot file was edited; both ids already route through `placeAsset('larry' | 'guardian-crows', ...)` (countryside.js `component('larry')`, ambient_life.js `buildGuardianBirds`). They go modular with `?swap=larry:modular,guardian-crows:modular` (or the modular set), and are classic on `?assets=classic` and quality `low`.

## labs/asset_inventory.json (hot) — apply
- rows `larry`, `guardian-crows`: add `"kit": { "family": "creatures" }`.
- row `larry`: replace its `fences/corral` embedded coverage with `[{ "target": "critters/larry", "level": "direct" }]` (new lab specimen); drop the "no isolated turtle" note. Then `node tools/labs_coverage.mjs --write`.
- catalog production adapters: larry, guardian-crows -> family `creatures`.

## src/kit/index.js
Regenerated (`node tools/kit_index.mjs`): adds `creatures`. Re-run at merge if another lane added a family.

## Part names (asset:<id>/<part>)
- `larry`: tiers hero `shell, plastron, neck, head, tail, flipper_{fl,fr,bl,br}` (pivot Groups, rotation.x; each holds `flipper_xx_mesh`); mid `shell` (body merged), `head`, 4 flippers; far `body` (one mesh, ~250 tris). Group = the patrol anchor (`corralGuardian.mesh`, `part('.')`), nose +Z.
- `guardian-crows`: hero `body, head, beak, tail, leg_l, leg_r`, hinges `wing_l/wing_r` (rotation.z; right mirrored, takes the opposite sign, exactly as updateGuardianBirds does), `wing_*_arm`, `wing_*_hand` (wrist), `wing_*_primaries`; mid `body` + `wing_*_arm` (one mesh a wing); far the same with a flat quad. Nose +Z so `mesh.lookAt()` still faces the cat.

## Behaviour hooks kept (nothing moved)
- Larry: updateCorralGuardian moves the group (x, z, y bob, rotation.y/z). The modular gait reads the group's own displacement in `update()`, so no patrol change. Footprint (bounds, radius 0.72, speed) is the layout's, unchanged.
- Crows: registerFootprint binds `wing_l`/`wing_r`; circling, swoop and the nudge are untouched. `update()` folds the wrist from the shoulder angle (hero only).

## Materials / draws
New materials: `larry:skin`, `crow:solid`, `crow:wing` (vertex-coloured, shared, flagged userData.kit, live, never merged). Larry hero 9 meshes (+4 pivots), classic 8; crow hero 14 meshes, classic 4 (x3 crows).
## Footprint waivers: none. Tag bumps: none.
