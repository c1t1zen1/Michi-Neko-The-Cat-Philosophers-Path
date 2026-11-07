# Lab 02 · River, bridge & paddies (川と田んぼ) — design

Date: 2026-11-06 · Lab folder: `labs/water/` · Registry slug `water` (n = 2, tier 1)

## What was asked

- A new lab for item 2 of `docs/VISUAL_NEXT_STEPS_2026-10-24.md` (river, bridge and
  paddies), built on the Grass Lab page pattern and the shared lab kit.
- Every Three.js technique worth trying for Kyoto water, bridges and paddies, as live
  variants, aimed at the game's look: photoreal background with a painterly finish
  (Ghibli / Kyoto Animation).
- Research beyond the existing `labs/water/research.md`, for each part the lab builds.
- Richer interaction than the grass slab: the real cat walks everywhere, hops the
  stepping stones and jumps off the bridge into the water.
- The output lives in `labs/water/index.html`. The hub `labs/index.html` links it with
  an image, as lab 02 in the "Biggest visual return" tier.

Assumptions (not stated by the user): the slug stays `water` (already in the
registry); the page reuses `labs/shared/*` without changing it; nothing in `src/` changes
(the lab says how it would go into the game); no commit unless asked.

## Page

1. Masthead: kicker, title, lede, jump links.
2. **The stage**: a 30 × 22 m diorama. A meandering river (6.8 m wide, like the game's)
   flows left to right past a weir. It has a bridge, kame-ishi stepping stones, and two
   terraced paddies linked by a mizuguchi spill. A typographic sentence picks three slots:
   "Michi crosses [bridge] over [water] beside [paddies]".
   Tools: Walk, Flow brush, Rock, Petals, Lanterns, Poke. "Jump in!" scripts the cat:
   onto the railing, a look down, then the leap. World controls: water level, hour (with
   presets), rain, season. Look controls: painterly (0–1), mirror, before/after split,
   debug view (final, flow, depth, foam), orbit or cat-eye, sound. Quality is Auto, Eco
   or Lush.
3. **Build it up**: 12 steps from the game's river to the lab's, each one setting the
   stage.
4. **Variants**: 28 live isometric cubes in four families (water from the field, water
   painted in Kyoto, bridges, paddies). Clicking a card plants it on the stage.
5. **Into the game**: how each builder in `countryside.js` / `player.js` would change.
6. **Sources**.

## Modules (`labs/water/js/`)

| File | Job |
|------|-----|
| `field.js` | `WaterField`: CPU grid of bed height + flow + foam. Flow comes from the centreline (parabolic profile, thalweg pushed to the outside of bends), potential flow around rocks/piers/stones with an eddy wake and eddy-line foam, a weir, and a painted flow overlay. Uploaded as an RGBA half-float texture. `sample()` for the CPU side. |
| `textures.js` | 256 px procedural textures: tileable ripple normals, foam, petal, maple, paper grain. |
| `glsl.js` | Water GLSL chunks: field lookup, two-phase flow normals, ripple rings, rain rings, point-light glitter, painterly helpers. |
| `water.js` | `createWater(style, ctx)`: one shader, 11 styles (`KYOTO`, `GAME` port, `SCROLL`, `FLOWMAP`, `GERSTNER`, `TOON`, `RIPPLE`, `MIRROR`, `CAUSTIC`, `PAINTED`, `SUMI`). Premultiplied alpha with Beer-Lambert opacity. |
| `mirror.js` | `PlanarMirror`: a Reflector-style virtual camera (perspective or ortho) with an oblique clip plane, rendered to a half-float target. |
| `ripple.js` | `RippleSim`: a GPGPU heightfield wave equation (ping-pong), used by the `RIPPLE` style. |
| `terrain.js` | Heightfield ground with an `onBeforeCompile` MeshStandard shader: grass, earth, gravel point bar, silt bed, wet dark band above the waterline, caustics under water, paddy mud, snow. Builds the cube slab (top plus strata skirts) and the water cutaway walls. |
| `bridges.js` | The bridge kit at any span: `game`, `sanjo` (mokugeta-bashi with giboshi kōran: hokogi, hirageta, jifuku, tozuka, oyabashira), `taiko`, `yatsuhashi`, `ippon`, `nagare` (deck sections float and swing on tethers in a flood), `uji` (san-no-ma platform), `stones`. Returns meshes, walkable surfaces, walls, the piers as flow obstacles, callouts and a leap spot. Wood weathers by orientation. |
| `props.js` | Kame-ishi (turtle, plover, square), weir sill, boulders, reeds, irises, tōrō, chōchin, hasakake, frogs. |
| `paddies.js` | Ridges, paddy water (mirror, cat's-paws, ice), rice hills on a 30 × 15 cm grid at each growth stage, with honami wind and a cat push. |
| `effects.js` | Ripple pool (uniform rings advected by the flow), droplets, petals and leaves advected by the field, floating lanterns, fireflies (2 s West-Japan flash), dawn mist, rain streaks. |
| `paint.js` | Painterly post pass: Kuwahara (4 sectors) plus paper grain and edge pooling, mixed by a 0–1 slider. Can split left/right. |
| `cat.js` | `RiverCat` extends `CatWalker`: the game's jump (7.2 m/s, g 20, ×1.4 fall), surfaces and walls, wading (×0.55), swimming (float, paddle gait, current drift), auto-mantle onto stones and banks, wet fur (palette darkened, dries over about 30 s), a 9.4 Hz shake that flings droplets, wet paw prints, and the scripted "Jump in!". |
| `stage.js` | Composes the stage. Owns the state, rebuilds slots and tools, routes around the bridge, and runs the HUD read-outs. |
| `variants.js` | The 28 cards: metadata, card text, code excerpts and sources. Builds each cube. |
| `gallery.js` | Cards and cube views (shared `Views`), with hover interaction and stats. |
| `steps.js` | 12 stepper steps (state overrides plus text and code). |
| `sound.js` | Synthesised river murmur, weir, splash, paddle and frog chorus. Off by default. |
| `main.js` | Page bootstrap and wiring. |

## Physics (stage)

Units are metres. The default water level is 0.02, as in the game. Depth under the
cat decides its state:

- dry: 3 cm or less
- wading: up to 24 cm (speed ×0.55)
- swimming: deeper. The cat floats at level − 0.16, paddles with the walk gait, and
  drifts with the current at 0.85 × the local flow.

Jumping takes off at 7.2 m/s, with gravity 20 and ×1.4 on the way down (the apex is
about 1.3 m). Support comes from three points (front paws, centre, back paws), which
bridges gaps under 35 cm. Walls block when the cat is below `top − 0.08`. Hitting water
from the air splashes by impact speed, then buoyancy settles the cat. When a swimming or
wading cat walks into a stone or bank lip less than 0.65 m above it, it hops up.

## Verification

- `node tools/labs_check.mjs` (syntax, cache tags, registry, posters).
- A headless Chromium (Playwright, scratchpad) loads `/labs/water/`. Checks: no console
  or shader errors; the stage renders; every cube builds; every step applies; the
  scripted jump puts the cat in the water (swimming) and back out (shake, then dry); the
  water level floods the nagare-bashi.
- The hub poster is captured from the lab itself (`?shot=1`).
