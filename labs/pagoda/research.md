# Distant pagoda (gojū-no-tō) research — 2026-11-07

Notes behind `labs/pagoda/` (Lab 08). They replace the 2026-11-06 draft, whose
six excerpts are kept below and marked as such. **Read** = fetched and read;
**Excerpt** = only a search-result excerpt was available, and claims from it go
no further than the excerpt; **Estimate** = judged from photographs for the
look, not measured. Three pages could not be read: two Codrops case studies
(HTTP 403) and one octahedral-impostor blog post (HTTP 404). Nothing from them
is used.

## What the game does today

`src/countryside.js` `buildDistantPagoda(12, 56)`:

* Five box bodies, widths 4.55 → 2.68 units (bodies 62–68% of that), storey
  heights 2.2 → 1.64, on a two-box stone dais (5.6 and 4.9 units).
* Vermilion corner posts (`MAT.vermilion`), a dark timber rail at the foot and
  a vermilion band at the head of every storey.
* Roofs are `ConeGeometry(span / √2, h, 4)` turned 45°, flat-shaded dark tile;
  four box edges under each; a tilted 0.42-unit stick at each corner.
* Finial: a shaft, eight discs, a sphere, a cone. About 3.4 of 15.7 units
  (≈ 21%).
* Scaled ×1.232 to ≈ 19.4 m, at r ≈ 57 m from the bridge, beyond the edge
  forest, whose crowns are lowered in the sightline (`buildEdgeForest`).
* Measured in the lab: **93 meshes, 1,564 triangles**. Cheap in triangles,
  expensive in objects, and with no LOD.

The lab runs this builder unchanged on a bare kit (`js/original.js`), so every
shelf can open with the real thing, and “Compare with the game” splits the
viewing platform between the two.

## The tower, by the numbers

| Measure | Value | Source |
|---|---|---|
| Hōryū-ji total height | 32.55 m (to the podium top) | IITK/WCEE (Excerpt) |
| Height ÷ first-storey width | **5.1** (Hōryū-ji) | IITK (Excerpt) |
| Top ÷ first storey width | **0.51** (Hōryū-ji) | IITK (Excerpt) |
| Eave span ÷ body width | **2.2** first storey → **3.0** fifth | IITK (Excerpt) |
| Sōrin ÷ total height | **1 : 3.4** (Hōryū-ji) | IITK (Excerpt) |
| Roof diminution | 10 : 9 : 8 : 7 : 6, roofs steeper toward the top | secondary summary (Excerpt) |
| Daigo-ji | 38 m (38.2), sōrin ≈ 13 m, 951; oldest building in Kyoto | MLIT (Excerpt) |
| Tō-ji | 55 m (Wikipedia: 54 m), present tower 1644; first storey ≈ 9.48 m | Tō-ji (Read); first storey (Excerpt) |
| Yasaka-no-tō (Hōkan-ji) | 46 m, rebuilt 1440, hongawara-buki | Kyoto Travel (Excerpt) |
| Kōfuku-ji | ≈ 50 m, 1426 | Yamahata table (Read); height (Excerpt) |
| Rurikō-ji | 31.2 m, 1442, hiwada-buki (cypress bark) | Yamaguchi City (Excerpt) |
| Ninna-ji | 36.18 m (sources 36.2–37.1), 1644 | (Excerpt) |
| Murō-ji | 16.1 m, smallest outdoor five-storey pagoda, hiwada-buki | MLIT (Excerpt) |

Where a preset needs a number no source gave (taper for most towers, overhang,
H ÷ W₁ outside Hōryū-ji and Tō-ji), `js/presets.js` lists it under `est`, and
each recipe card says which numbers were estimated.

### The insight that shapes the builder

The eave ratio climbs from 2.2 to 3.0 while the body halves. That only works
if the **eave projection stays nearly constant** up the tower: the brackets
are cut from the same timber at every storey. So the builder tapers the bodies
by teigen, keeps the bracket block size almost fixed (`bs = 0.074 · (0.8 +
0.2 w)`), shrinks the overhang only a little (`oTaper`), and then **solves the
storey heights** so the whole matches the recorded H ÷ W₁ and sōrin share.

## The roof curve: Yamahata, Goto & Ando (2008) — Read

*A Study on the Roof Curve of Japanese Pagodas*, Journal for Geometry and
Graphics 12(2), 193–203. They measured the kayaoi (the eave-edge member, the
one whose line *is* the roof's outline) on the first roof of 59 nationally
listed pagodas (15 five-storey, 44 three-storey), from the Agency for Cultural
Affairs' restoration drawings.

* **Ratio of curve** (corner rise when the eave length is 1) ranges from
  **0.0063** (Gankō-ji Gokurakubō) to **0.0480** (Saimyō-ji). Values used here:
  Hōryū-ji **0.0365**, Daigo-ji **0.0310**, Ninna-ji **0.0224**, Rurikō-ji
  **0.0214**, Tō-ji (Kyōō-gokoku-ji) **0.0209**, Kōfuku-ji (five-storey)
  **0.0110**.
* **Where the curve starts.** Before the Edo period the curve begins near the
  middle of the eave and reads as one aesthetic line. Edo curves begin near the
  ends: the middle looks cambered by illusion and the design is “monotonous”.
  The authors call the Edo work *mannerism*: technique taken from the
  textbooks without the master builder's eye.
* **Optical correction.** Seen from the ground, the kayaoi's ends are taller
  than its middle: the average ratio of end to middle height is **1.2 : 1**. The
  ends are farther from the viewer, so they are drawn bigger to look even.
* The curves are not “so obvious by each era”: the builder's eye, not the
  period, decides them.

In the builder: `rise = curve × sori × eave length`; `start` is where along the
half-eave the lift begins (0.1 Heian → 0.6 Edo); the lift is `rise · x²` with
`x = (|u| − start) / (1 − start)`, fading up the slope as `(1 − t)^1.6`;
`flare` also pushes the corners out in plan. `sori` multiplies the measured
ratio: 1 is the record, and the valley preset uses 1.8 because 0.0365 of a
4 m eave is under a pixel at 57 m.

## Parts, bottom to top

* **Kidan** (podium): dressed stone with flights of steps; sized here to sit
  inside the first eave's drip line.
* **Shinbashira** (heart pillar): “None of the pillars of the pagoda extend into
  the ground. Rather, they simply stand on stone foundations … each level moves
  independently of the others, in a motion known as the ‘snake dance’” (Tō-ji,
  Read). Wikipedia (Read): old pagodas had a shinso stone under the pillar;
  later the pillar was shortened. The storeys are separate frames, not tied
  by a column; the lab's **Shake** shows the out-of-phase sway.
* **Body**: three bays (ken) a side; Hōryū-ji's top storey has two. Wayō
  façade: round columns, nageshi tie beams, plank doors (itatobira) in the
  central bay, vertical-bar renji windows either side (common practice; the
  layout is a simplification).
* **Kumimono / tokyō** (Wikipedia: Tokyō, Read): bearing blocks (masu/daito,
  makito, onito at corners) and bracket arms (hijiki). Steps: hitotesaki,
  futatesaki, **mitesaki** (three), up to mutesaki (six). In mitesaki the third
  step is carried by a **tail rafter, odaruki**. Most bearing blocks also carry
  a bracket at 90°. Corner sets (sumitokyō) and regular sets (hiratokyō); Zen
  style uses closely spaced intercolumnar sets (tsumegumi). JAANUS mitesaki:
  three projecting sets of arms, each with three small blocks (Excerpt).
* **Rafters**: futanoki (double eaves: base rafters **jidaruki** and flying
  rafters **hiendaruki**; JAANUS, Excerpt). **Ōgidaruki** fan rafters radiate at
  the corners; popular from the 14th–15th c., with Nara-period fragments
  excavated (JAANUS, Excerpt). **Sumigi**, the hip rafter: larger section, at 45°,
  establishes the eave curvature (JAANUS, Excerpt).
* **Kōran** (balcony rail): three horizontal members, the top rail **hokogi**
  (round or octagonal), the middle **hirageta**, the bottom **jifuku** (JAANUS,
  Excerpt). Every upper storey stands on one.
* **Roof**: hongawara-buki (round tiles over pan tiles) at Yasaka; **hiwada-buki**
  (cypress bark) at Rurikō-ji and Murō-ji. Hips (sumimune) end in onigawara.
* **Fūtaku**: bronze bells. Britannica (Excerpt): hung “profusely … to the eaves
  of temples, shrines, and pagodas”. Niponica (Excerpt): hung “under the four
  corners of the roofs”. Wikipedia (Read): small bells also hang from the sōrin's
  rings or suien. The lab hangs one at every eave corner (twenty) and four on
  the top ring.
* **Sōrin** (Wikipedia, Read), top to bottom: **hōju** (jewel), **ryūsha** (dragon
  vehicle), **suien** (“four decorative sheets of metal set at 90° to each
  other”), **fūtaku**, **kurin** (nine rings; “sometimes only eight or even
  seven”), **ukebana** (usually eight upturned lotus petals; JAANUS, Excerpt,
  notes a double row on pagodas, the lower facing down), **fukubachi**
  (inverted bowl), **roban** (dew basin, “as many sides as the roof”). Usually
  bronze, and on a wooden pagoda it “can be over 10 meters”.

## Rendering research

* **Aerial perspective.** Quílez, *Better fog* (known reference): extinction
  plus in-scatter, with the fog colour bent toward the sun. The Ranges lab's
  `air.js` already uses wavelength extinction (blue first). Here it is one
  `onBeforeCompile` patch on every material, applied *before* tone mapping
  (three r160 applies fog after the colour-space conversion, so its built-in
  fog was not used). Takram's `three-atmosphere` (precomputed scattering,
  Excerpt) is the heavyweight alternative; not needed at this scale.
* **Painterly filtering.** Maxime Heckel, *On crafting painterly shaders* (Read,
  first half): basic Kuwahara (4 box sectors, lowest variance wins), Papari's
  circular 8-sector variant with Gaussian weights, polynomial weights for speed,
  and the anisotropic version via a Sobel structure tensor (that section was
  not retrieved). The lab's version shares spokes between 8 overlapping
  sectors (3 spokes × 4 rings each) and blends sectors by `1 / (1 + σ⁴)`
  (generalised Kuwahara, Kyprianidis et al.) instead of a hard minimum, which
  avoids sector flicker.
* **Outlines.** Heckel, *Moebius-style post-processing* (Read): depth and normal
  buffers, Sobel on both (depth weighted ×25), a hand-drawn wobble
  `hash(fc) · sin(fc.y · 0.08)`, and crosshatching in three luminance bands
  (diagonal < lightest, vertical, horizontal darkest). **Found in testing:**
  any depth gradient, even log-depth, fires on a ground plane seen at a grazing
  angle and blackens it. The fix used here: **1 / z is affine across a plane in
  screen space**, so the Laplacian of inverse depth is zero on every plane and
  spikes only at silhouettes and creases.
* **Watercolour.** A 2004 real-time watercolour paper (Excerpt): edge darkening
  from a Sobel edge map (pigment migrates to the drying boundary), granulation
  as pigment settling in paper valleys, paper as a height field.
* **Anime compositing (satsuei).** Animation Obsessive, *Dangerous Light*, and
  forum threads (Excerpt): bloom/diffusion as light scattering through film
  emulsion or lens filters, light that “stays hot and dense … before falling
  off exponentially”, leaks screen-blended, glow on flat colour. The
  background-art finish screens a blurred bright-pass back over the image,
  adds a sun leak, and lifts shadows toward violet.
* **Kazuo Oga** (Gurney Journey; Animation Obsessive; Excerpts): large soft
  passages first, details last; a stylised rather than naturalistic effect,
  “extracts the essence … then augments them”. This is the licence for
  exaggerating the sori and keeping the eave band darkest at range.
* **Impostors.** Cinevva, *Open world in the browser, part 19* (Read): bake a
  colour and a normal atlas from a grid of angles, build the billboard basis in
  the vertex shader from the view direction, blend the 2×2 nearest cells, set
  the bounding sphere by hand for instanced quads, prefer odd grid sizes. The
  three.js forum's *A forest of octahedral impostors* (Read): swap when the
  model would be no larger on screen than the bake resolution; hemi-octahedral
  mapping; a 5-vertex hull saves ≈ 30% overdraw. The lab uses the simplest
  useful version: one row of 16 azimuths (towers are seen from near the
  horizon), two-cell blend, un-premultiplied colour, rebaked when the light
  changes.
* **Crossfades.** 3d-tiles-renderer's `wrapFadeMaterial` (Excerpt): a Bayer
  threshold and `discard`, chained into existing `onBeforeCompile` hooks. The
  lab's `patchFade` does the same with a `const float[16]`.
* **Procedural towers.** MengTo's *threejs-towers* skill (Read): shared builders
  appending to shared arrays, merge by material not by part, a roof function
  with lift/flare/pow parameters, and the warning that a lower roof must
  “die cleanly behind the wall above it”. Here every upper roof ends under its
  balcony deck, and a slice build caps the opening.
* **Bells.** CCRMA, DAFx-19 (Excerpt): a bell as a sum of exponentially decaying
  sinusoids, one per mode; real bells need two or three sub-modes per partial
  for warble; higher partials decay faster (Risset). `js/sound.js` uses six
  modes with one detuned pair.

## Decisions

1. **The squint test is the interaction.** A log dial from 5 m to 2 km; a ladder
   shows each part's size on screen (tower, sōrin, roof lines, corner lift,
   eave edge, bracket blocks, kōran, rings, rafters, bells, tile rows), faded
   below 3 px and struck through below 1 px.
2. **Tiers by pixels, not metres.** Hero ≥ 380 px tall, mid ≥ 110, far ≥ 26,
   impostor below; Bayer crossfade over 0.45 s.
3. **Every shelf opens with the game's own part**, built by the real builder,
   with the rest ghosted.
4. **Physical light underneath, paint on top.** The default finish is
   background art: PBR and real air, then soft Kuwahara, diffusion glow,
   graded shadows and kasumi bands that start *behind* the tower, never over it.
5. **The valley preset** keeps the shipped height and footprint, borrows
   Hōryū-ji's measured proportions, and doubles the sori so the lift survives
   57 m.

## Image references

* Tō-ji pagoda: <https://commons.wikimedia.org/wiki/File:Toji-temple-kyoto.jpg>
* Tō-ji remote views: <https://commons.wikimedia.org/wiki/Category:Remote_views_of_the_Five-storied_Pagoda,_Toji>
* Tō-ji from the lotus pond: <https://commons.wikimedia.org/wiki/Category:Views_of_the_Five-storied_Pagoda,_Toji_from_the_Lotus_Pond>
* Yasaka-no-tō: <https://commons.wikimedia.org/wiki/Category:Yasaka_no_T%C5%8D>
* Yasaka-dōri at dawn: <https://commons.wikimedia.org/wiki/File:Yasaka-dori_early_morning_with_street_lanterns_and_the_Tower_of_Yasaka_(Hokan-ji_Temple),_Kyoto,_Japan.jpg>
* Yasaka from Yumemi-zaka: <https://commons.wikimedia.org/wiki/Category:Views_of_Yasaka_no_T%C5%8D_from_Yumemi-zaka>

## Sources

Architecture and records:

* Yamahata, Goto & Ando — *A Study on the Roof Curve of Japanese Pagodas*, JGG 12(2), 2008 — <https://www.heldermann-verlag.de/jgg/jgg12/j12h2yama.pdf> (Read)
* Tō-ji — *The five-storied pagoda* — <https://toji.or.jp/en/inside/pagoda.html> (Read)
* Wikipedia — *Tokyō (architecture)* — <https://en.wikipedia.org/wiki/Toky%C5%8D_(architecture)> (Read)
* Wikipedia — *Japanese pagoda* — <https://en.wikipedia.org/wiki/Japanese_pagoda> (Read)
* Wikipedia — *Sōrin* — <https://en.wikipedia.org/wiki/S%C5%8Drin> (Read)
* IITK / WCEE — *Earthquake response of the ancient five-story pagoda of Hōryū-ji* — <https://www.iitk.ac.in/nicee/wcee/article/1229.pdf> (Excerpt)
* JAANUS — ukebana, kōran, ōgidaruki, sumigi, mitesaki tokyō — <https://aisf.or.jp/~jaanus/> (Excerpts)
* MLIT — Daigo-ji Gojū-no-tō — <https://www.mlit.go.jp/tagengo-db/en/R1-00324.html> (Excerpt)
* MLIT — Murō-ji five-storied pagoda — <https://www.mlit.go.jp/tagengo-db/en/R1-00975.html> (Excerpt)
* Yamaguchi City — Rurikō-ji pagoda restoration — <https://yamaguchi-city.jp/kozantop/restoration-en.html> (Excerpt)
* Kyoto Travel — Hōkan-ji (Yasaka Pagoda) — <https://kyoto.travel/en/destinations/hokanji-templeyasaka-pagoda/> (Excerpt)
* Britannica — *wind-bell* — <https://www.britannica.com/art/wind-bell> (Excerpt)
* Niponica — wind chimes from temple roof corners — <https://web-japan.org/niponica/niponica22/en/feature/feature09.html> (Excerpt)
* From the 2026-11-06 draft (Excerpts): JAABE timber towers <https://www.jstage.jst.go.jp/article/jaabe/1/2/1_2_2_25/_pdf/-char/en>; Rachel Stull, *Sōrin* <https://racheldstull.github.io/j301-honors-contract/sorin.html>; Discover Kyoto, *Tō-ji* <https://www.discoverkyoto.com/places-go/toji/>; NJCU structural characters <https://www.njcu.edu/sites/default/files/docs/2020-06/Structural-Characters-FiveStoryPagoda.pdf>; japan365days <https://www.japan365days.com/kyoto_yasaka_pagoda.php>; TōjiMap <https://tojimap.jp/en/contents/content02-2/>

Painting and rendering:

* Maxime Heckel — *On crafting painterly shaders* — <https://blog.maximeheckel.com/posts/on-crafting-painterly-shaders> (Read, first half)
* Maxime Heckel — *Moebius-style post-processing* — <https://blog.maximeheckel.com/posts/moebius-style-post-processing> (Read)
* Kang, Kyprianidis et al. — anisotropic Kuwahara — <https://www.umsl.edu/~kangh/Papers/kang-tpcg2010.pdf> (cited by Heckel; not read)
* Real-time watercolor for virtual environments — <https://www.cs.nthu.edu.tw/~chunfa/pcm2004.pdf> (Excerpt)
* Íñigo Quílez — *Better fog* — <https://iquilezles.org/articles/fog/> (known reference)
* Animation Obsessive — *Dangerous Light* — <https://animationobsessive.substack.com/p/dangerous-light> (Excerpt)
* Animation Obsessive — *What Kazuo Oga thinks about…* — <https://animationobsessive.substack.com/p/what-kazuo-oga-thinks-about-when> (Excerpt)
* Gurney Journey — *Demo by Kazuo Oga* — <https://gurneyjourney.blogspot.com/2017/03/demo-by-kazuo-oga.html> (Excerpt)
* Cinevva — *Open world in the browser, part 19: impostors* — <https://app.cinevva.com/blog/2026-05-04-open-world-browser-part-19-imposters> (Read)
* three.js forum — *A forest of octahedral impostors* — <https://discourse.threejs.org/t/a-forest-of-octahedral-impostors/85735> (Read)
* 3d-tiles-renderer — `wrapFadeMaterial` — <https://app.unpkg.com/3d-tiles-renderer@0.4.19/files/src/three/plugins/fade/wrapFadeMaterial.js> (Excerpt)
* MengTo/Skills — *threejs-towers* — <https://raw.githubusercontent.com/MengTo/Skills/main/agent-skills/web-design/threejs-towers/SKILL.md> (Read)
* CCRMA / DAFx-19 — modal bell synthesis — <https://ccrma.stanford.edu/~orchi/Documents/DAFx19_paper_34.pdf> (Excerpt)
* three.js r160 source — tone mapping is applied only when rendering to the default framebuffer; `attribute vec2 uv` is always declared — <https://unpkg.com/three@0.160.0/build/three.module.js> (Read)

Could not be read: Codrops, *Susurrus: a cozy watercolor world* (403); Codrops,
*Still: from Akira to ink wash* (403); smailikhappy, *Octahedral imposters* (404).
