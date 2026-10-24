# Grass research — 2026-10-23

Notes behind `grass/` (the Grass Lab). 15 searches, then full reads of the
pages that opened. "Read" = fetched and summarised; "Snippet" = only the
search-result excerpt was available (page blocked or paywalled), so claims
from it are limited to what the excerpt said.

## What the field agrees on

| Lever | What works | Where it came from |
|-------|-----------|--------------------|
| Draw calls | One `InstancedMesh` / `InstancedBufferGeometry` per chunk; wind, bend and colour all in the vertex/fragment shader so the CPU does ~nothing per frame | Three.js forum "simple instanced grass", Tessl/skills.cat pipelines (read) |
| Triangle budget | ~3 M triangles is the sweet spot on mid GPUs; a 20-tri blade × 3 M instances is ~20× over. Prefer 5–9 tri blades or 2-tri textured clumps | Three.js forum "Optimizing 3M instanced grass" (read) |
| Alpha cards | Textured planes with `alphaTest` (not blending — blending needs a per-frame sort). Keep the card silhouette close to the blade shape; overdraw is the cost | Codrops "Fluffiest grass" (snippet), forum (read), Hexaquo LOD (read) |
| Placement | Hash the instance index in the shader (no attribute buffers). False Earth derives five random streams from the index and samples the same height function as the CPU terrain | Codrops *False Earth* 2026 + Cinevva spike 56 (read) |
| Clump = 3 quads | Three tapered quads 60° apart: one is always near-perpendicular to the camera, so a clump covers ~3 blade-widths. Single thin blades go sub-pixel and read as confetti | Cinevva spike 56 (read) |
| Wind layers | Global sway + travelling gust fronts + per-blade flutter, all scaled by height² so the root stays pinned. Scrolling noise texture (or cheap sin/value-noise) | skills.cat (read), GodotGrass (read), forum "Grass experiment" (read) |
| Bezier blades | Evaluate a cubic Bézier spine per vertex; wind perturbs the tip control point; widen blades that are edge-on to the camera in view space; bend normals toward "round"; darken by height as fake AO | Ghost of Tsushima GDC (snippet), GodotGrass README (read) |
| Interaction | Few colliders → uniform array of positions. Many → a top-down texture the shader samples to bend blades | Three.js forum "interactive grass patches" (read), skills.cat (read) |
| LOD | Rings of density + geometry (5 → 3 → 2 segments); far blades are widened to keep coverage; a ground-plane impostor takes over with a dithered fade. "Bad hardware doesn't mean less grass, just earlier impostors" | skills.cat, Hexaquo part 4 (read) |
| Shell texturing | N copies of one plane lifted along the normal; each fragment discards where a per-cell hash says the strand is shorter than this layer. Cost scales with layers × fill, not blade count. Breaks at grazing angles | Godot shader (CC0, read), j-vandy itch (read) |
| Culling | Per-instance CPU culling cost more than it saved; cull whole chunks/sub-cells and let the GPU take the rest | Unity foliage post (snippet) |
| Camera angle | Billboard grass looks wrong from steep angles; near the camera use real blades, far away simpler stand-ins. Horizon tilts blades away as the player approaches | Polycount thread (snippet) |

## Numbers worth remembering

* Mobile 50–100 k blades / 1–3 draws · desktop 200–500 k / 1–5 · WebGPU 0.5–2 M (skills.cat budget table).
* Ring LOD defaults: near 0–20 m full density 5 segments, mid 20–45 m 40 % 3 segments, far 45–80 m 10 % 2 segments.
* Hexaquo: 5×5 m chunk of 10 000 blades ≈ 90 000 tris; far blades collapse to 1 triangle; impostor fades in 5–10 m, real grass fades out 10–20 m; whole effect < 2 ms.
* Presets from skills.cat: lawn 0.3 m / 3 seg / 80 per m², meadow 1.0 m / 5 seg / 35, tallGrass 1.8 m / 6 seg / 20.

## Decisions for the Lab

1. Everything placed by `gl_InstanceID` hash (`pcg`) — zero per-blade buffers, density is a single uniform (`uGrid`), so a quality governor is free.
2. One shared GLSL library: wind, push field, fog, lighting. Per-type "hooks" for placement, colour, lighting and emission.
3. **Cat physics** is a tiny GPU simulation: a 20 texel/m half-float texture holding displacement + velocity, integrated as a damped spring with a wave-coupling term (blades spring back and ripple outward), plus a slow "pressed grass" trail texture. The CPU only passes 6 stamp positions (body ×2, paws ×4) per frame.
4. Cubes share one renderer and one canvas (scissor viewports) instead of 20 contexts.

## Running the Lab

```
python3 -m http.server 8000      # from the repo root
# open http://localhost:8000/grass/
```

Three.js 0.160 comes from the unpkg import map (network needed). URL flags for
testing: `?quality=eco|lush`, `?pr=1` (pixel ratio cap), `?wind=1.2`, `?cat=0`
(skip the cat), `?prewarm=0` (do not build/compile every cube in the
background), `?shot=1` (keep the drawing buffer; disables the auto governor).

Files: `grass/js/kit.js` (GLSL library, physics, engines), `types_*.js` (the 20
recipes: ours / field / mixed / wild), `patch.js` (a floating slab of cells),
`hero.js` (cat, patterns, cameras), `lab.js` (page, stats, governor).

## Sources

* Codrops — *How to Make the Fluffiest Grass With Three.js* — <https://tympanus.net/codrops/2025/02/04/how-to-make-the-fluffiest-grass-with-three-js/> (snippet)
* Codrops — *False Earth: From WebGL Limits to a WebGPU-Driven World* — <https://tympanus.net/codrops/2026/04/21/false-earth-from-webgl-limits-to-a-webgpu-driven-world/>
* Cinevva — *Open World Browser, part 28: grass and occlusion* — <https://app.cinevva.com/blog/2026-05-14-open-world-browser-part-28-grass-and-occlusion>
* Three.js forum — *Optimizing 3M instanced grass* — <https://discourse.threejs.org/t/performance-optimizing-3m-instanced-grass-in-three-js/81286>
* Three.js forum — *How do I make interactive grass patches* — <https://discourse.threejs.org/t/how-do-i-make-interactive-grass-patches/65340>
* Three.js forum — *Grass experiment (clump instancing, noise-texture wind)* — <https://discourse.threejs.org/t/grass-experiment-injected-meshstandardmaterial-noise-textures-clump-instancing/57598>
* Three.js forum — *Simple instanced grass example* — <https://discourse.threejs.org/t/simple-instanced-grass-example/26694>
* Three.js forum — *Grassworks (WebGPU)* — <https://discourse.threejs.org/t/i-built-a-real-time-grass-system-for-three-js-webgpu/94175>
* skills.cat — *procedural-grass-threejs* — <https://skills.cat/skills/ck42bb/procedural-grass-threejs>
* GDC Vault — *Procedural Grass in Ghost of Tsushima* — <https://gdcvault.com/play/1027214/Advanced-Graphics-Summit-Procedural-Grass> (members only)
* GodotGrass (GoT reimplementation) — <https://github.com/2Retr0/GodotGrass>
* Hexaquo — *Grass rendering series part 4: LOD tricks* — <https://hexaquo.at/pages/grass-rendering-series-part-4-level-of-detail-tricks-for-infinite-plains-of-grass-in-godot/>
* Godot Shaders — *Fur/Grass with Shell Texturing* (CC0) — <https://godotshaders.com/shader/fur-grass-with-shell-texturing/>
* j-vandy — *Shell Textured Grass Rendering* — <https://jvandy.itch.io/shell-texturing>
* Jahrmann & Wimmer — *Interactive Grass Rendering Using Real-Time Tessellation* — <https://www.cg.tuwien.ac.at/research/publications/2013/JAHRMANN-2013-IGR/JAHRMANN-2013-IGR-paper.pdf>
