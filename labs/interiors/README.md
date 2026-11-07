# Interiors Lab · 座敷

A standalone Three.js r160 room book and playable cutaway house. Serve the
repository root, then open **http://localhost:8000/labs/interiors/**:

```sh
python3 -m http.server 8000
```

The Labs portal links here and uses `poster.png`, a 1200 × 750 render made
with the lab's **Save room image** action. Runtime room geometry and 256 px
textures are generated locally; only Three.js and optional web fonts use a
CDN. This lab does not modify the game's interior or summit.

## Explore

- Click a floor patch, or use WASD / arrows. Click a furniture top to plan a
  jump; **Hop onto furniture** also finds a clear approach.
- **Space** jumps; **E** bats a nearby cup; **C** toggles prowl. Cups are
  unbreakable and reset with **Put the cups back**.
- Drag the room to orbit; scroll over it to zoom. The camera buttons switch
  between dollhouse, a low first-person view, and a plan.
- **Take a stroll** follows routes around the furniture. **Find a nap spot**
  sends Michi to a cushion. Moving or clicking wakes the cat.
- Touch screens get direction, Jump, and Bat buttons. Sliders and native
  selects work with a keyboard. Reduced motion defaults to the OS preference.
- Move the light through the day, slide the screens, reveal labels, lift the
  ceiling, and rotate the complete valid tatami arrangement.

The twelve recipes include garden zashiki, a sparse 4½-mat ceremonial study,
rainy writing room, pottery workspace, family room, indigo room, summer reeds,
autumn maple, winter kotatsu, lantern evening, moon viewing, and guest bedding.
They are original compositions informed by the sources, not reconstructions
of named historic buildings.

The craft bench reuses the room builders for an exploded tatami, five
partition types, and five ceramic finishes/profiles. Six construction passes
on the open house expose floor → frame → screens → alcove → furniture →
atmosphere. Shoji glow and branch wash are painterly approximations, not
physically measured transmission or a global illumination simulation.

## Files

| Module | Purpose |
| --- | --- |
| `js/data.js` | Room recipes, sources, validated Kyōma tilings, construction passes |
| `js/materials.js` | Seeded 256 px maps, linear bump maps, original ink paintings |
| `js/build.js` | Room/component geometry, static batching, garden and atmosphere |
| `js/physics.js` | Pure collision, A* routes, jump/landing and cup helpers |
| `js/cat.js` | Real shared CatWalker extended with jumping, routes and rest |
| `js/craft.js` | Exploded/cutaway specimens from the actual builders |
| `js/main.js` | Shared stage Views, UI, camera, quality, export, and loop |
| `research.md` | Original brief plus expanded primary-source research ledger |

Only the existing `labs/shared/game.js` bridge imports game modules, with the
current cache tag. Room recipes and lab-local imports need no game tag bump.
Shared cached materials survive room changes; private geometries, materials,
textures and shadow targets are disposed. Preview rooms build lazily and
only visible scenes render through one scissored canvas.

## Review & verification

```sh
node tools/labs_check.mjs
node tools/interiors_test.mjs
```

The 28 Node checks cover mat coverage and junctions, recipe integrity,
floor/furniture support, collision boundaries, closed/open screens, A* routes,
and jump landings at 30/60/120 Hz. Safari review on 2026-11-06 covered all
twelve room builds/shader compilation, live catalogue filtering, the three
craft specimens, table approach/jump/landing, cup nudge, and a 390 × 844
responsive viewport with touch jumping. The console was clear of runtime
errors during review. A responsive desktop preview is not a real-device
performance benchmark.

Review flags: `?room=winter&hour=17&doors=.8&view=plan&still=1`. Quality can be
`auto`, `eco`, or `lush`; `?cat=0` skips cat sculpting; `?shot=1` makes the
atmosphere still for captures. **Copy room link** preserves the room, hour,
screen position, camera mode, and still-air setting. `window.interiorLab`
exposes the active room, cat, builders' view handles, state setters and
runtime statistics for review.
