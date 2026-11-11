# Moon Pool & Lantern Glade research — 2026-11-06

Notes behind `labs/moonpool/` (Lab 07). 5 searches. "Read" = fetched and
summarised; "Excerpt" = only the search-result excerpt was available (claims
from it are limited to what the excerpt said).

What the game does today (`src/hidden_places.js`): the Moon Pool is a 3 m
spring tucked behind the shrine grove — turquoise caustics and drifting lotus
by day, and at night a soft cool moon-disc sprite pooled on the water
(`this.moonGlow`), lily pads with three pale blossoms, and a ring of stones.
The Lantern Glade is a 6 m ring of bamboo with paper lanterns strung from it
that kindle one at a time at dusk (staggered by a golden-ratio offset), plus
fireflies that gather once lit. The moss banks and lantern fibres came in
with the grass pass. This lab is about the water itself, the moon reflection,
the lily pads and how lantern light reads through paper.

## The water

* **Shinji-ike 心字池**, the "heart-character" pond, is the classic Kyoto
  still-water form — shaped like the cursive character 心 so that it can
  never be seen whole from one vantage, which deepens it. Musō Soseki
  (1275–1351) popularised it, and it survives at Nanzen-ji and Eikan-dō
  (JTA, Nabunken — excerpts).
* **Moon on water** is not a mirror disc but a *glitter path*: a vertical
  streak of small, horizontally-stretched specular glints that compress and
  densify toward the horizon and grow sparser and larger near the viewer. On
  still water the path is a narrow column; ripples widen it into a dancing
  band. Each glint flickers on its own 1–4 s life, passing through zero so
  nothing pops (shader.gallery *glint*, AI CSS Animations *moonlit sea
  glitter*, Radiant *moonlit ripple* — excerpts).

## The pads

* A floating water-lily leaf keeps its stomata on the *upper* side only, and
  floats on large air cavities inside the leaf tissue; those intercellular
  spaces continue down the stem to feed the roots oxygen. A thick cuticle
  protects the sun-facing side (Nijmegen virtual lesson — excerpt).
* The leaf has a radial network of strong veins, and a notch cut into one
  side of the round blade where the leaf stalk attaches (the *Victoria*
  water lily instead rolls the leaf edge up into a rim that keeps neighbours
  from overlapping, with notches to drain rain) (Nymphaea leaves, Penn State
  Arboretum — excerpts).
* Lotus (*hasu*) flowers are held clear above the water on tall stems and
  have a distinctive seedpod; water-lily (*suiren*, Nymphaea) flowers sit at
  the surface. The game's "drifting lotus" can read as either, but a pad
  with a notch plus a raised pink blossom reads most clearly.

## Light through paper

* A lit lantern reads as a **hot spot near the light source with a short
  falloff**, not an evenly-lit shade. The cheap recipe is a warm emissive
  that peaks at the centre and falls off, plus a cooler, darker rim where the
  paper is thickest at the ribs (polycount thread — excerpt).
* More physically: translucency = light passing through the side facing
  *away* from the lamp, strongest where your eye lines up with the light.
  `emissive += albedo · lightColour · trans · lit · fall · (base + cloud)`
  with a Gaussian falloff around the light point and a tiled pulp-mottle
  texture (Godot *shoji shader*, pdoom.video *paper lantern* — excerpts).
* The Lantern Glade's staggered kindling already matches the town lanterns'
  per-lantern onset in the game; the lab can show one lantern's paper lit
  from inside with the ribs darkening the edges.

## Decisions for the Lab

1. **A moon you can ripple.** Click the pool to send a ring outward; the moon
   disc breaks into a glitter path whose width tracks the ripple amplitude,
   then stills back to a narrow column.
2. **Lily pads that ride the water.** A pad is a rounded, notched disc with a
   top-side sheen, bobbing on the same ripple field; click a pad and it
   dips, sheds a droplet, and springs back.
3. **The glade at night**: a paper lantern whose glow reads as a hot centre
   with ribbed darkening at the edges, strung from bamboo, kindling one by
   one, with fireflies gathering as it brightens.
4. **Two ponds, two moods**: the round Moon Pool (still, for the moon) and a
   shinji-ike that can never be seen whole.

## Image references

* Water-lily leaves (Nymphaea) category: <https://commons.wikimedia.org/wiki/Category:Nymphaea_leaves>
* Water lily leaves and flower: <https://commons.wikimedia.org/wiki/File:Waterlelie_R01.jpg>
* Nanzen-ji (Kyoto) category, incl. pond and koi: <https://commons.wikimedia.org/wiki/Category:Nanzen-ji>
* Tenjuan garden (Nanzen-ji) category: <https://commons.wikimedia.org/wiki/Category:Tenjuan_(Nanzenji)>
* Paper lanterns in Japan category: <https://commons.wikimedia.org/wiki/Category:Paper_lanterns_in_Japan>
* Goldfish paper lanterns (kingyo chōchin) category: <https://commons.wikimedia.org/wiki/Category:Kingyo_chochin>
* Moon glitter path (live shader, technique ref): <https://shader.gallery/glint/>

## Sources

* Japan Tourism Agency — *Shinjiike pond (Eikan-dō)* — <https://www.mlit.go.jp/tagengo-db/en/R1-01634.html> (excerpt)
* Nabunken (Nara National Research Institute) — *heart character pond* — <https://www.nabunken.go.jp/org/bunka/jgd/pages/HeartCharacterPond.html> (excerpt)
* Nijmegen virtual botany lesson — *Floating plants* — <https://vcbio.science.ru.nl/en/virtuallessons/leaf/floating/> (excerpt)
* Penn State Arboretum — *Santa Cruz water lily* — <https://arboretum.psu.edu/about/news/an-oasis-of-large-leaves-victoria-cruziana-santa-cruz-water-lily/> (excerpt)
* Gardens by the Bay — *Victoria water lilies* — <https://www.gardensbythebay.com.sg/en/learn-with-us/explore-resources/whats-blooming/victoria-water-lilies.html> (excerpt)
* shader.gallery — *Glint (moonlight on water)* — <https://shader.gallery/glint/> (excerpt)
* AI CSS Animations — *Moonlit sea glitter* — <https://www.aicssanimations.com/directory/Shaders/moonlit-sea-glitter> (excerpt)
* Radiant Shaders — *Moonlit ripple* — <https://radiant-shaders.com/gallery/technique/webgl> (excerpt)
* Godot Shaders — *Shoji shader (translucency + sun spot)* — <https://godotshaders.com/shader/shoji-shader-translucency-sun-spot/> (excerpt)
* pdoom.video — *Paper lantern (light through paper)* — <https://pdoom.video/styles/paper-lantern/> (excerpt)
* Polycount forum — *Paper lantern with bright spot and falloff* — <https://polycount.com/discussion/235361/texturing-help-paper-lantern-with-bright-spot-and-light-falloff-effect> (excerpt)
---

# Lab build notes — 2026-11-08

## Water

Searched for interactive heightfield water and planar reflections in Three.js.

* The two-buffer wave equation here follows the classic approach described for
  [Codevember 2016 by Jaume Sánchez](https://www.clicktorelease.com/code/codevember-2016/11)
  (excerpt: three buffers for stability, mouse ripples). The lab uses two buffers
  and a 0.986 damping, stepped in JavaScript at 256² (65k cells).
* The official route is the
  [r160 GPGPU water example](https://github.com/mrdoob/three.js/blob/r160/examples/webgl_gpgpu_water.html)
  on GPUComputationRenderer. A
  [forum user reports a 128×128 version](https://discourse.threejs.org/t/use-gpucomputationrenderer-texture-for-dynamic-instancedmesh-objects-positions/37741)
  running smoothly (excerpt). The CPU route was chosen because it needs no float
  render targets, so it runs on phones that lack them, and it can be sampled in
  JavaScript so pads and lanterns can bob on it.
* [skunami.js](https://github.com/layshua/skunami.js) (excerpt) implements a pipe
  model, Mueller's GDC 2008 method and iWave for plane meshes, with waves bouncing
  off obstacles. It's a reference for what a heavier model buys.
* Nothing found combined a ripple heightfield with a pond reflection, so that
  pairing is the lab's own: `labs/shared/water.js` mirrors the camera about the
  water plane, draws the scene to a target with a global clipping plane, and
  offsets the lookup by the wave normal.

## Moon

No source described a moon glitter path in Three.js. The glitter tile and the
tight specular are original, following the "glitter path" observation in the notes
above. Water only mirrors the sky near the horizon at a low camera, so a moon
high overhead never shows in the pool from the main view. The stage keeps its moon
low, behind the water, and holds a gap in the forest for it.

## Paper

Three.js' [TranslucentShader](https://threejs.org/docs/pages/module-SubsurfaceScatteringShader.html)
(docs, based on a GDC 2011 approach) and a
[backlit shoji shader for Godot](https://godotshaders.com/?p=8017) (excerpt) both
use a view-versus-light term for thin translucent sheets. For a closed lantern with
the flame inside, the lab uses an emissive with the fibre and rib map multiplied
in, falling off from the belly as a Gaussian. It's cheaper and reads correctly.

## Sources that came up short

Searches did not return construction details for tōrō-nagashi lanterns or botanical
detail on the water-lily notch. The float is a paper box on a tray, which matches
the
[Toro Nagashi article](https://japanese-wiki-corpus.github.io/culture/Toro%20Nagashi%20(Floating%20Lanterns%20Down%20a%20River).html)
and the [2026 Arashiyama listing](https://selfguidejapan.com/blog/toro-nagashi-2026)
(both excerpts) only in general form.

## One bug found here, fixed for every lab

The game's sky bakes its reflection probe from a dome of radius 200, but PMREM's
default far plane is 100, so the bake saw the renderer's clear colour instead. On a
white lab page that lit every surface white, day and night. `labs/shared/world.js`
scales the probe dome to fit. The game itself clears to a different colour, and this
lab does not change `src/sky.js`.


## Construction review — 2026-11-10

### A stable shelf water surface

Flat specimens are raised 8 mm above the plinth to remove coplanar z-fighting. Points and sprites take a direct shelf render, preserving fireflies and the game butterfly/mote comparisons. The original Moon Pool and all game builders remain unchanged.

This is a rendering correction, not a new historical claim. See the existing pond, lantern and plant sources above.

See the [complete lab review and before/after gallery](../REVIEW_2026-11-10.md).
