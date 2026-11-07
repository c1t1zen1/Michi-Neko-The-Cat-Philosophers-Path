# Machiya workshop · research & implementation notebook

Fresh investigation: **2026-11-06**. Runtime: **Three.js 0.160.0**, vanilla ES
modules, no build step. Open `/labs/machiya/` from a server at the repo root.

This replaces the first draft’s research-to-feature claims with a traceable
inventory. The earlier notebook supplied useful vocabulary; the present pass
independently inspected the game, read official Three.js documentation and
version-pinned code, and studied a Kyoto builder’s illustrated restoration
records. We do not claim an exhaustive collection of every technique online.
The result is a curated, runnable set: **35 specimens across 11 shelves**.

## What “the game today” means

`js/original.js` creates an object inheriting `Countryside.prototype`, supplies
a scene, seeded fixture randomness and no-op gameplay registration, then calls
the actual methods through `labs/shared/game.js`. It never runs the valley
constructor. The tea house, craftsman’s residence, Hisomu-an and village house
are real game meshes, not approximate copies from the lab kit. Their material
objects are cloned before the lab changes lighting state. Shared textures are
not duplicated. The bird-nest egg tilt remains the original builder’s random
detail; village proportions are deterministic in the adapter.

The part shelves use the game’s `createKawaraRoof`, `createKoushi`,
`createEngawa` and `createChochinLantern`, plus extracted tea-house wall, post
and curtain meshes. **There is no inuyarai in these game house builders**:
that shelf explicitly shows the bare original wall. The original upstairs
window is a **timber lattice**, not plaster-coated mushiko-mado.

The full original references have their original dimensions; part specimens
are framed individually so that small details can be examined. Triangle and
mesh counts are actual traversals; draw counts come from the renderer.
Comparisons are demonstrations, not a controlled GPU benchmark.

## Looking at real buildings

### Façade, plaster, timber and the threshold

**Read:** [Araki — Inuyarai machiya restoration](https://www.kyoto-araki.jp/sekou/konnaie/kyomachiya/machi_raisa.html).
The builder documents a recessed upper floor, replacement stone footings,
bengara-finished timber, yellow Otsu plaster, and paper shoji behind the outer
lattice. The photographs distinguish a dark opening from a flat dark rectangle.
Those observations motivate recessed backing, warm plaster, separate frame
members and an accessible under-deck shadow. The 16 cm posts and 42 cm veranda
height here are game-scale choices, not dimensions measured from that project.

### Roof, cut-back lattice and the wall beneath

**Read:** [Araki — Two adjoining machiya restored](https://www.kyoto-araki.jp/sekou/konnaie/kyomachiya/machi_maii.html).
The record identifies ichimonji small-tile roofing, itoya lattice and earthen
wall repairs. Its construction photographs make the layering legible: tiles
are a continuous covering over a substrate. This informs the restrained eave
line and complete supporting deck in our kit. The lab’s cosine pan-and-roll
section is an economical visual approximation, not a manufacturer’s sangawara
profile. The 0.265 m columns and 0.235 m courses are modelling targets, not
installation specifications or a certified roofing system.

### Inuyarai

**Read:** [Araki — House construction notes, exterior section](https://www.kyoto-araki.jp/kyomachiya/sumaiarekore/kouen_thehouse1.html).
The builder describes curved split-bamboo guards at the street boundary. In
our implementation **each stave bends in the vertical Y/Z plane**; the draft
instead varied upright tilt across the width. A quadratic Bézier curve gives
all staves the same credible bend. They are a visual screen. The lab lets the
cat climb crates and lattice rather than treating a protective bamboo guard as
a structural ramp.

### Upper-storey silhouette

**Read:** [Hachise — Tsushi-nikai](https://www.hachise.com/kyomachiya/features/facadeTsushinikai.html).
Hachise distinguishes the low storage mezzanine and its mushiko windows from
later full two-storey houses. The short-loft recipe changes the upper wall and
roof height together. A plaster surround, actual opening and coated bars are
an architectural alternative to our game’s existing timber upper lattice.
It is not a claim that every machiya has the same window form.

### Cloth and lantern design

The original game’s indigo curtain and cylindrical chōchin anchor these
shelves. The three-panel cloth, undyed ring crest and lathed ribbed lantern are
**our visual design studies**. Panel size, paper profile, crest and rib count
are selected for legibility and runtime cost, not presented as a reconstruction
of a particular shop. The older notebook’s very specific noren dimensions and
unverified studio-pipeline assertions are not used as engineering requirements.

## Rendering techniques: evidence → adaptation → implementation

The current docs can include APIs newer than r160. For implementation we also
read r160 source/examples; only compatible APIs are used. No copied third-party
asset or shader package is bundled. All algorithms in the workshop are original
adaptations of the documented APIs; Three.js itself still loads from the repo’s
existing CDN/import-map pattern.

| Part | Game baseline | Working alternatives | API evidence / source |
|---|---|---|---|
| Roof | Actual curved slabs and eave details | Low-relief overlapping pans; sculpted pan-and-roll courses; textured-shell and lifted-eave controls | [BufferGeometry](https://threejs.org/docs/pages/BufferGeometry.html), [r160 instancing example](https://github.com/mrdoob/three.js/blob/r160/examples/webgl_instancing_dynamic.html) |
| Frame | Extracted square posts and eave beam | Small bevels; bengara-finished frame | [r160 RoundedBoxGeometry](https://github.com/mrdoob/three.js/blob/r160/examples/jsm/geometries/RoundedBoxGeometry.js) |
| Wall | Actual painted plaster box | Ochre earthen infill; existing game namako skirt | [MeshStandardMaterial](https://threejs.org/docs/pages/MeshStandardMaterial.html), [r160 shader modification example](https://github.com/mrdoob/three.js/blob/r160/examples/webgl_materials_modified.html) |
| Kōshi | Actual eleven-slat game lattice | Cut-back itoya rhythm; heavier bengara komeya | [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) |
| Upper window | Actual timber lattice | Shaped plaster-coated opening; low-loft proportion study | [Shape.holes](https://threejs.org/docs/pages/Shape.html), [ExtrudeGeometry](https://threejs.org/docs/pages/ExtrudeGeometry.html) |
| Engawa | Actual slab, plinths and step | Separate boards over beams; aged plank finish | [r160 instancing example](https://github.com/mrdoob/three.js/blob/r160/examples/webgl_instancing_dynamic.html) |
| Bamboo | Actual bare frontage; absent in game | Straight stave control; curved repeated stave | [TubeGeometry](https://threejs.org/docs/pages/TubeGeometry.html) |
| Noren | Extracted original single slab | Pinned indigo cloth; crimson dye variation | [BufferGeometry attributes](https://threejs.org/docs/pages/BufferGeometry.html) |
| Chōchin | Actual cylinder, caps, band and tassel | Lathed corrugated paper; dusk emission and local light | [LatheGeometry](https://threejs.org/docs/pages/LatheGeometry.html), [MeshStandardMaterial](https://threejs.org/docs/pages/MeshStandardMaterial.html) |
| Finish | Original full house materials | Physical; painterly PBR; explicit three-band cel study | [r160 MeshToonMaterial](https://github.com/mrdoob/three.js/blob/r160/src/materials/MeshToonMaterial.js), [colour management](https://threejs.org/manual/pages/color-management.html) |

### 1. Solve the roof as a surface, not a bag of tubes

The draft used a half-cylinder whose effective width did not cover its column
pitch, rotated its axis incorrectly for the intended course direction, and
omitted the supporting deck. Its slab comparison also placed both slope
centres at the eave height instead of halfway between eave and ridge.

The new roof starts with a **closed segmented box**. At every vertex its upper
surface is evaluated by:

```js
const t = Math.abs(z) / halfDepth;
y = eaveY + ridgeHeight * (1 - t) + lift * t ** 6;
```

The modest last term eases the eave. It is an art-directed profile, not a survey
of mukuri construction. Tiles have an explicit X/Z footprint and overlap:
width = column pitch × 1.015, length = course slope length × 1.18. Their local
rotation follows the derivative of the same height function. A closed backing
means seams between the visible tiles cannot reveal the sky below.

Bargeboards, circular end faces, exposed rafter tails, gable infill and a
layered ridge complete the silhouette. The lower **hisashi is a true single
slope**, with its inner edge tucked into the upstairs wall. It has no miniature
gable or separate ridge. Roof dimensions follow the upper wall when it exists,
so the triangular gable closure cannot float outside the wall.

The cat collider uses this same height function plus a small average tile
clearance. It does not model every tile lip or the decorative ridge barrel.
The original reference roofs retain their game geometry for honest comparison.

### 2. Put repeated detail in instances

`InstancedMesh` reuses geometry/material with per-instance transforms and
colours. In the kit it carries tile courses, kōshi slats, deck boards, bamboo
staves, eave end faces and rafter tails. Matrices and colour attributes are
updated once; bounding spheres are computed after placement. The whole house
is **not** one draw call: each instance batch, ordinary mesh, material and light
pass has a cost. The live statistics make this tradeoff visible.

Static ordinary meshes are merged by material **within each assembly group**,
using `BufferGeometryUtils.mergeGeometries`. Instances and dynamic cloth remain
separate. This preserves the stepper while reducing the street from 894 to 256
draws in the development check, including shadow passes. Distant textured-shell
LODs remain a promotion task. The game's own merge pipeline and `MAT` ownership
still need separate review.

### 3. Edge geometry where normal maps cannot help

Rounded boxes supply real edge highlights for visible joinery. Normal maps
remain useful for plaster and timber texture, but do not repair silhouettes.
The opening in the mushiko surround is a hole in a `Shape`, extruded to a thin
solid with restrained bevels. Coated bars stand in front of a dark recess.
This avoids the draft’s solid painted panel with bars laid over it.

### 4. Physical light with an illustrated palette

The default **painterly PBR** uses `MeshStandardMaterial`: painted albedo,
normal maps, high plaster roughness, a shared generated PMREM environment,
the kit’s sun/hemisphere rig and ACES tone mapping. A small object-space
sinusoidal modulation adds broad brushlike variation to albedo. It preserves
the standard lighting path. It is neither a volumetric paint simulation nor
a documented shader from Studio Ghibli or Kyoto Animation.

The physical comparison reduces that modulation. The cel comparison uses
`MeshToonMaterial` with three valid ramp texels and nearest filtering. A toon
material is **not** PBR with an environment response. Unlike the old notebook,
we do not describe a five-band toon ramp as “photoreal PBR.” No inverted-hull
outline is promised or rendered; fine latticework is clearer without it.

Colour textures stay sRGB; normal/height data remains non-colour data. Reusing
the game’s already painted texture albedo avoids multiplying it by another
dark wood/plaster swatch, which made the first draft unnecessarily muddy.

### 5. Reversible age, wetness and light

Age is a subtle colour grade evaluated from unmodified materials. It is not a
physically predicted patina or a directional moss simulation. Wetness darkens
surfaces and lowers tile roughness, while the complete geometry stays intact.
The UI deliberately calls this **wet tiles**, not a rain particle system.

The lantern has emissive paper **and** a short-range point light. Emission makes
the paper luminous; the light illuminates the adjacent wall and pavement.
Both follow the hour. One generated environment texture is shared across the
street, specimens and assembly model. GPU environment resources are disposed
when their temporary generator is finished.

### 6. Keep interaction honest

The actual game cat loads through `labs/shared/game.js`. The lab controller
uses 7.2 m/s vertical takeoff and −20 m/s² gravity (about a 1.296 m jump apex).
Crate rises are 0.58 m. Neighbouring roofs are close in height so the gaps are
within the lab controller's reach. These shared constants do not prove that
the game's different controller will behave identically after integration.

There are explicit street/eave/roof starting positions, keyboard controls,
touch buttons, a rooftop wander, part-focused cameras, reversible reference
comparison and JSON recipe export. Lattice climbing is a lab experiment.
The assembly stepper changes real group visibility; its exploded view separates
construction groups. Real multi-coat wall construction is described rather
than pretending to render seven physically distinct plaster coats.

Reduced-motion preferences stop turntables and curtain movement. Gallery
scenes build lazily and use one scissored renderer, following Grass Lab. No
fails, score, countdown or required collectible is added.

## Source code map

- `js/original.js`: adapters to real game builders and parts.
- `js/machiya.js`: geometry, materials, instances, collider, assembly, disposal.
- `js/variants.js`: all 35 specimens, explanations, short recipes and sources.
- `js/hero.js`: cat, cameras, keyboard/touch support and rooftop wander.
- `js/main.js`: shared renderer, gallery filtering, controls, assembly and export.
- `js/steps.js`: construction captions tied to visible model phases.

A saved JSON recipe has `options` for `buildMachiya()`, `lighting.hour` and
`wind`. A copied source recipe includes the builder call. Snippets that show a
technique fragment are labelled with a link to the complete runnable builder.

## Promotion checklist

1. Choose reviewed recipes and add all material variants to the game's `MAT`.
2. Merge static joinery by material and add near/far roof LODs.
3. Review building dimensions, original route progression and game collisions.
4. Preserve seeded valley RNG order; give patina its own deterministic seed.
5. Compare afternoon, dusk, rain and night on actual target devices.
6. Keep the summit and its UI outside this effort.

Verification results for this revision are recorded in `verification.md`.
