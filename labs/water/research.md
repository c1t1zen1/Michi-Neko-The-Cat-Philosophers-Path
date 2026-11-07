# River, bridge and paddies research — 2026-10-25

Notes behind `labs/water/` (Lab 02). Two passes: 14 searches on 2026-10-25,
then 30 more on 2026-11-06 for every part the lab builds (second pass at the
end). "Read" = fetched and summarised; "Excerpt" = only the search-result
excerpt was available (claims from it are limited to what the excerpt said).
Every source in the second pass is an excerpt.

What the game does today (`src/countryside.js`): `buildRiverAndBridge()`
sweeps a 6.8 m ribbon along a five-point Catmull-Rom spline.
`createRiverWaterMaterial()` is a pure `ShaderMaterial`. It has sine ripple
trains in world X/Z, so they ignore the river's bend. "Depth" is a tint from
the distance to the bank (UV), not from the carved bed. It also has a Fresnel
sky mix, a sun highlight, sparkle cells and two foam bands along the banks.
The bridge is a 2.6 × 8.4 m box deck at 1 m, with seven box posts a side,
box rails and two ramps. Paddies are flat tinted water planes.

## What the field agrees on

| Lever | What works | Where it came from |
|-------|-----------|--------------------|
| Flow map | Keep a ripple normal map, but distort its UVs along a per-texel 2D flow vector instead of scrolling it. Run two layers half a phase apart and cross-fade, so each restart is hidden. Offset the phase per pixel with noise to kill pulsing. Scale normal strength by flow speed. ~4 texels/m is enough. Costs 2 extra fetches (flow and noise) over two scrolling maps | Vlachos, *Water Flow in Portal 2*, SIGGRAPH 2010 (excerpt, slides) |
| Flow in three.js | `examples/jsm/objects/Water2.js` already takes a `flowMap` (RG = direction). The two-phase lerp is `mix(c1, c2, abs(cycle - 0.5) * 2.0)` | three.js `webgl_water_flowmap` (excerpt), John Sietsma *Flow maps in three.js* (excerpt) |
| Depth colour | Colour by water depth below the surface (shallow → deep), from a depth texture or, cheaper, a known bed height. Three bands: shoreline, in-between, deep "fog". Light is absorbed with depth; clear water keeps ~77–80 % of light per metre | Alisavakis stylised water (excerpt), Roystan toon water (excerpt), GPU Gems ch. 2 (excerpt) |
| Shore foam | Foam where depth → 0, i.e. where water meets banks and rocks. Reconstructing the world height of what is below avoids the warping you get from camera-plane depth | Cyanilux shoreline breakdown (excerpt), Roystan (excerpt) |
| Rocks in a current | A submerged rock near the surface lifts a *pillow* downstream. A wider one leaves a *hole* (hydraulic). An exposed rock can only be filled from the sides, so an *eddy* forms behind it, flowing back upstream, with an *eddy line* where the two currents shear | Kauffman, *River Dynamics* (excerpt) |
| Standing waves | Their wavelength tells the speed: v ≈ 1.25 √λ (Kennedy), checked in the field for λ = 0.5–7 m | Tinkler 1997 ASCE (abstract) |
| Caustics | Aesthetic, not physical: caustics are strongest for vertical light and shallow water. Cheap version: animated Worley/Voronoi in world X/Z, raised to a power, added to the bed | GPU Gems ch. 2 (excerpt), Cyanilux water breakdown (excerpt), Landon Townsend (excerpt) |
| Reflections | `Reflector` re-renders the whole scene, so the scene must render in half the frame budget. Use a small target (½ res or less). A clip bias of ~0.003 avoids self-intersection | three.js docs (excerpt), forum threads (excerpt) |
| Painted water | Water as a gradient inverted from the sky (lighter far, darker near), with crisp white highlight shapes. "Nature painted with translucent colours" | LinkArtStories (excerpt), Art of *Totoro* (excerpt), 80.lv Ghibli water (excerpt) |

## Kyoto water, with numbers

* **Kame-ishi 亀石** — the Kamo River's stepping stones. 83 concrete turtles, plovers (chidori) and plain blocks were laid in 1992 at the Demachiyanagi delta and elsewhere, about a metre long. They hold back gravel that the rapids would scour, so the bed stays stable. Locals read the water level off them: "today the turtle is up to its neck" (Atlas Obscura, Star-Advertiser, GaijinPot, Kyoto tourist office — excerpts).
* **Giboshi 擬宝珠** — the bronze onion-shaped finials on bridge railing posts, used where a bridge leads to a castle or shrine. They also cap the cut end grain so the post does not rot. Sanjō Ōhashi got its wooden railing and giboshi in 1590 (Hideyoshi), and some of those giboshi survive. The bridge is about 73 m long and 16.7 m wide. Its hinoki railing was renewed in 1974 and again by 2024, reusing the giboshi (NDL reference database, Sankei 2024 — excerpts).
* **How a railing weathers** — on Sanjō Ōhashi the horizontal rails, especially the top rail, rot first; the vertical members last longer. Wood under the bronze fittings (giboshi, nail covers) stays sound, probably because copper ions leach into it. Algae grows on the north-facing faces of the posts and hardly at all on the south faces (Japan Wood Protection Association, *Mokuzai Hozon* 49-1, 2023 — excerpt).
* **Paddies** — in spring the flooded paddies become a "water mirror" before and after planting, from May to early June. Summer turns them deep green, autumn gold, and winter brings snow. Windless mornings give the clearest mirror (Mainichi, JeePe — excerpts). Machine transplanting in Japan uses 30 cm rows (28–33 cm), 3–8 seedlings a hill and 18–30 hills/m², planted 1–5 cm deep. A typical layout is 30 × 15 cm (22 hills/m²), with 2–3 cm of standing water (JARQ, JICA handbook, IRRI — excerpts).

## Decisions for the Lab

1. **A painted flow field.** The flow lives in a CPU `Float32Array` (8 texels/m) uploaded as an RG texture, built from the river centreline (downstream along the spline, fastest mid-channel, slow at the banks). Users paint flow with the mouse. Placing a rock adds a potential-flow deflection, plus an eddy (reversed flow) and an eddy line behind it.
2. **Two-phase flow normals** with per-pixel noise phase offsets (Vlachos), normal strength scaled by speed, and a debug view of animated arrows.
3. **Real depth.** The bed is a heightfield, so the shader knows the true water depth: Beer–Lambert-style absorption tint, caustics on the bed by depth, and foam where depth < 4 cm, on the upstream face of rocks and along eddy lines.
4. **Reflections in two tiers**: an analytic sky (cheap, the default) and a half-resolution `Reflector`-style mirror that shows the bridge, lanterns and moon (a toggle with measured cost).
5. **The bridge as a kit**: planks with gaps, beams (*keta*), posts with giboshi, top rail and lower rail, and weathering by orientation (algae on north faces, rot on the top rail, sound wood under bronze).
6. **Kame-ishi** across the river, with a water-level slider: watch the turtle go under to its neck.
7. **Paddies through the seasons**: a mirror in spring, green in summer, gold in autumn, snow in winter. Rice hills sit on a 30 × 15 cm grid (instanced), and the aze ridges are walkable.

## Image references

* Kamogawa Delta stepping stones (the turtle / kame-ishi): <https://commons.wikimedia.org/wiki/Category:Kamogawa_Delta>
* Kamo River (bridge and bank views): <https://commons.wikimedia.org/wiki/Category:Kamo_River>
* Stepping stones in Japan: <https://commons.wikimedia.org/wiki/Category:Stepping_stones_in_Japan>
* Water-mirror rice paddies (photos): <https://mainichi.jp/english/articles/20220507/p2a/00m/0na/008000c> · <https://www.jeepe.jp/en/articles/hoshi-toge-tanada-guide-1139>

## Sources

* Alex Vlachos (Valve) — *Water Flow in Portal 2*, SIGGRAPH 2010 — <https://alex.vlachos.com/graphics/Vlachos-SIGGRAPH10-WaterFlow.pdf> (excerpt)
* three.js — *webgl_water_flowmap* / `Water2.js` — <https://threejs.org/examples/webgl_water_flowmap.html> (excerpt via mirrors)
* John Sietsma — *Flow maps in three.js* — <http://johnsietsma.com/2015/12/01/flow-maps/> (excerpt)
* Harry Alisavakis — *Stylized water shader* — <https://halisavakis.com/my-take-on-shaders-stylized-water-shader/> (excerpt)
* Roystan — *Toon water shader* — <https://github.com/IronWarrior/ToonWaterShader> (excerpt)
* Cyanilux — *Shoreline shader breakdown* — <https://www.cyanilux.com/tutorials/shoreline-shader-breakdown/> (excerpt)
* Cyanilux — *Water shader breakdown* — <https://www.cyanilux.com/tutorials/water-shader-breakdown/> (excerpt)
* NVIDIA GPU Gems, ch. 2 — *Rendering Water Caustics* — <https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-2-rendering-water-caustics> (excerpt)
* Landon Townsend — *Animated Worley noise* — <https://www.landontownsend.com/single-post/2019/05/30/animated-worley-noise-trypophobia-warning> (excerpt)
* Robert B. Kauffman — *River dynamics* (swiftwater rescue primer) — <https://www.frostburg.edu/faculty/rkauffman/_files/images_swr/Ch04_RiverDynamics_v2.pdf> (excerpt)
* Tinkler — *Indirect velocity measurement from standing waves in rockbed rivers* (ASCE 1997) — <https://doi.org/10.1061/(asce)0733-9429(1997)123:10(918)> (abstract)
* three.js docs — *Reflector* — <https://threejs.org/docs/pages/Reflector.html> · *Water* — <https://threejs.org/docs/pages/Water.html> (excerpts)
* Three.js forum — *Is reflector material usable…* — <https://discourse.threejs.org/t/is-reflector-material-usable-on-a-project-which-must-be-fluid/80076> (excerpt)
* Atlas Obscura — *Kamo River Turtle Stepping Stones* — <https://www.atlasobscura.com/places/kamogawa-river-turtle-stepping-stones> (excerpt)
* Honolulu Star-Advertiser — *Stones add flair and function to an urban river crossing* (2022) — <https://www.staradvertiser.com/2022/11/03/news/stones-add-flair-and-function-to-an-urban-river-crossing/> (excerpt)
* GaijinPot Travel — *Turtle Stepping Stones of Kamo River* — <https://travel.gaijinpot.com/turtle-stepping-stones-of-kamo-river/> (excerpt)
* Kyoto Online Tourist Information — *Stepping stones to cross the river* — <https://global.kyoto.travel/en/faq/detail.php?faq_id=1028> (excerpt)
* NDL Collaborative Reference Database — *京都の橋の擬宝珠* — <https://crd.ndl.go.jp/reference/entry/index.php?id=1000102410&page=ref_view> (excerpt)
* *Mokuzai Hozon* 49-1 (2023) — *京の三条大橋* — <https://doi.org/10.5990/jwpa.49.28> (excerpt)
* Sankei News — *擬宝珠そのまま、三条大橋がリニューアル* (2024) — <https://www.sankei.com/article/20240117-T47E2VP3FFMWRP5565TZBOX5UA/> (excerpt)
* The Mainichi — *Water-filled rice terraces reflect changing sky* (2022) — <https://mainichi.jp/english/articles/20220507/p2a/00m/0na/008000c> (excerpt)
* JeePe — *Hoshitoge rice terraces* — <https://www.jeepe.jp/en/articles/hoshi-toge-tanada-guide-1139> (excerpt)
* JARQ 14-2 — *Rice transplanters* — <https://www.jircas.go.jp/sites/default/files/publication/jarq/14-2-084-087_0.pdf> (excerpt)
* JICA — *Rice cultivation handbook* — <https://www.jica.go.jp/Resource/activities/issues/agricul/approach/ku57pq00002m21du-att/handbook_01.pdf> (excerpt)
* IRRI Rice Knowledge Bank — *Transplanting* — <http://www.knowledgebank.irri.org/step-by-step-production/growth/planting/transplanting> (excerpt)
* LinkArtStories — *Paysage acrylique inspiration Studio Ghibli* — <https://linkartstories.com/paysage-acrylique-inspiration-studio-ghibli/> (excerpt)
* Character Design References — *Art of My Neighbor Totoro* — <https://characterdesignreferences.com/art-of-animation-7/art-of-my-neighbor-totoro> (excerpt)

---

# Second pass — 2026-11-06

30 searches, one or more per part the lab builds. All are excerpts (search
summaries); where two excerpts disagreed, both are given.

## Water: how the techniques were chosen

| Part | What the sources say | What the lab does |
|------|---------------------|-------------------|
| Heightfield ripples | three.js `webgl_gpgpu_water` drives a heightmap with a compute shader and the mouse; Evan Wallace's WebGL Water (2011) is the origin, with a three.js port that adds ray-traced reflection, refraction and caustics. | `RippleSim`: the wave equation, ping-ponged twice a frame. Land from the field texture is a wall, so rings bounce off banks and stones. The *Ripple tank* variant. |
| Caustics | Wallace's 2016 write-up: treat the water surface as a mesh of light rays. Refract each vertex along the sun, intersect the floor, and brighten each triangle by the ratio of its original to final area. WebGL lacks geometry shaders, so the old and new positions go to the fragment shader. | The cheap cousin: two multiplied Voronoi edge layers on the bed, faded by depth and sun height, with a red/blue split in the *Caustic* style. The mesh method is noted as the upgrade. |
| Water2 / flow map | `Water2` defaults: `textureWidth` 512 (a reflector and a refractor at that size), `flowSpeed` 0.03, `reflectivity` 0.02; a `flowMap` switches on the flow path. | The *Flow map* style keeps the 0.02 base reflectivity. Our own mirror is one target at half the stage size, and no refractor is needed because depth comes from the bed. |
| Toon water | The Tuts+ series (PlayCanvas, with a three.js port) builds foam lines from the depth buffer. A three.js forum thread linearises scene depth minus fragment depth to blend by water depth. | The bed height is known, so depth bands and the foam line cost nothing (*Toon*). |
| Painterly post | Maxime Heckel, *On Crafting Painterly Shaders* (2024): the Kuwahara filter smooths but keeps edges and corners; it extends to Papari's anisotropic version. TresJS ships it with `radius` and `sectorCount`. Codrops' *Susurrus* (2026) builds a whole watercolour world on Kuwahara as its only pass. | `PaintPass`: four-sector Kuwahara (radius 3), paper grain and edge pooling, mixed 0–1. Default 0.35: real light, painted surfaces. |
| Ghibli backgrounds | Animation Obsessive and Gurney Journey on Kazuo Oga: Nicker poster colour (an opaque, gouache-like paint), a base coat (*ji-nuri*) laid wet before the paper dries, both sides of the paper wetted. Nothing specific on how he paints reflections. | The *Ghibli painted* style: flat tones, the sky gradient inverted by view angle, white strokes along the current, an ink line at the shore. |
| Painting reflections | Reflections compress values toward the middle: darks lighter, lights darker (Draw Paint Academy). Moving water's reflection is broken and shifting, so two or three confident strokes beat many fussy ones (Jenna Rainey). | The mirror is sampled with a normal offset, so it breaks into vertical streaks, and the sky reflection is mixed toward mid-tones as the painterly slider rises. |
| Kyoto Animation | *Sound! Euphonium* is set in Uji. KyoAni locations include the Demachiyanagi delta's stepping stones (K-On!; a fan guide also places *Tamako Market* there). No source on how their water is painted. | Context only: the Uji-bashi and Kame-ishi variants. |

## Rivers: what moves the water

* **Meanders** — the thalweg (deepest, fastest line) hugs the outside of a bend, at the cut bank. The point bar builds on the slow inside. Helical flow carries sediment from the outer to the inner bank along the bed (NPS, LibreTexts; one wiki excerpt claims the opposite and is treated as an outlier). At low stages the thalweg sits close to the outside of the bend. **Lab:** the field shifts the speed peak and the carve toward the outside of each bend by up to 32 % of the half-width; the ground shader lays gravel where the inside bank eases off.
* **Weirs on the Kamo** — searches found the post-1935 Kamogawa improvement project and MLIT's widening and levee plan, but nothing on the drop structures (落差工) themselves. **Lab:** a granite sill 3–4 cm under the surface plus a scour pool, with standing waves spaced by v ≈ 1.25√λ (first pass).
* **Wakes** — the Kelvin half-angle is arcsin(1/3) = 19.47°, independent of speed for slow sources like ducks and swimming cats. At high speed the amplitude peak narrows (Rabaud & Moisy 2013); the outer edge stays Kelvin's (Darmon et al.). **Lab:** a ring every 0.19 s from a swimmer, each drifting with the current it was born in. Their envelope is the wake.

## Bridges: parts and types

* **Kōran (railing) anatomy** (JAANUS) — three horizontal members: *hokogi* 架木 (top rail, round or octagonal), *hirageta* 平桁 (middle rail) and *jifuku* 地覆 (bottom/curb rail). Vertical *tsuka* 束 are often capped with *masu* 斗 bearing blocks under the top rail. In the *wayō kōran* the corner posts carry *giboshi*, which sets it apart from the Zen style. *Oyabashira* 親柱 (also hōjubashira) are the main posts. From the Heian period the top rail's ends became wider and curved up. Bridges have kōran to stop people falling.
* **Giboshi** — onion-shaped caps representing a *hōju*, the Buddhist wish-granting jewel that wards off evil. A railing with them is a *giboshi kōran* (Muza-chan).
* **History** — until the early modern period almost all Japanese bridges were wooden *mokugeta-bashi* (wooden-beam bridges), except very short stone ones (Highlighting Japan, Sept 2023).
* **Taikobashi / sorihashi** (MLIT) — the official name is sorihashi (arched bridge). It is called the drum bridge because its reflection makes a drum. So steep it needs steps; the steep arch saves the long approaches a high bridge would need. Sumiyoshi Taisha's (c. 1600) and Itsukushima's are the famous ones.
* **Yatsuhashi** (MLIT, JAANUS) — boards laid end to end, each turned the other way. It is named after the eight-plank bridge over an iris marsh in *The Tales of Ise*, and the name is used whatever the plank count. It crosses shallow marshes and ponds with *kakitsubata* irises, which bloom in early May (Korakuen). The zigzag is said to ward off spirits that travel in straight lines, or to give the garden depth.
* **Ippon-bashi / Gyōja-bashi** (NFAJ) — a narrow stone bridge over the Shirakawa near Chion-in's Furumon gate. *Hashibasami-ishi* 橋挟石 are the stones at the four corners of a stone bridge (JAANUS).
* **Nagare-bashi (Kōzuya-bashi), Yawata** — not fastened at the bottom: the deck planks come away when the river rises, and the girders are in eight parts connected by wire. It is designed to avoid flood damage rather than resist it. Built in 1953 to replace a ferry, first washed away that August. 356.5 m long (one excerpt says 356.6), the longest nagare-bashi in Japan as of 2007, and closed in high water.
* **Uji-bashi** — a square platform, the *san-no-ma* 三の間, juts upstream. It is said to have held a shrine to the bridge deity Hashihime, and tradition says Hideyoshi had tea water drawn there (with a bucket attributed to Sen no Rikyū). Water is drawn there at the Uji Tea Festival on the first Sunday of October. Rebuilt in 1996, 155.4 × 25 m; the 646 founding date comes from an inscription at Hashidera.
* **Togetsukyō** — rebuilt 1934: reinforced-concrete piers with wooden railings chosen to suit the scenery; 155 m. One LLM-written encyclopedia claims timber piers; ignored.

## Paddies

* **Growth** — Koshihikari (a 1996 Toyama study, via JIRCAS / J-STAGE crop-science excerpts; the paper itself wasn't opened): 30 cm at the end of effective tillering, 51 cm at maximum tillers, 68 cm at panicle formation, 100 cm at heading; final height 117 cm (2014 study). Nipponbare transplanted 16 May matures about mid-September (122 days). Ripening runs milky → dough → yellow-ripe → mature. **Lab:** seedlings 16 cm, summer 72 cm, autumn 95 cm with nodding panicles.
* **Hasakake / haza** — rice dried on racks in the sun (haza, also inagi, inekake, inabata). Once common nationwide, now mostly replaced by machines, and said to keep the grain from cracking (Nippon.com, Noto). The *hasa* could be bamboo poles tied to rows of tall thin trees (*hasagi*, e.g. Manchurian ash) along the paddies (Kihachi Homma's 1951 "Hasakake").
* **Aze (ridges)** — no dimensions found. Aze-nuri hardens the edge into a soil wall that stops leaks. In a Shikoku terrace study, levees took 29.4 % of the paddy area. **Lab:** ridges 42 cm wide, 22 cm above the mud floor (the game's are 50 cm and 28 cm).
* **Frogs** — Japanese tree frogs (*amagaeru*, "rain frog") chorus at night along paddy edges from spring to late summer. An isolated male calls about four times a second, and eggs float among the young rice stalks. **Lab:** frogs on the ridges in early summer and summer that plop in when Michi comes near, and a pulse-train chorus at night in sound.

## Life on and over the water

* **Genji fireflies** — males flash about every 2 s in western Japan, which includes Kansai, and every 3–4 s in eastern Japan; the Fossa Magna is the boundary. **Lab:** a 2 s cycle, neighbours partly in step, early-summer nights only.
* **Tōrō-nagashi, Arashiyama** — 16 August on the Katsura River by Togetsukyō, 6,000–10,000 lanterns (sources differ), the same night as the Gozan Okuribi. It sends the ancestors' spirits back at the end of Obon.
* **Hanaikada** — the term itself didn't turn up. Guides to the Philosopher's Path (the Biwako Sosui canal, 1.5 km, 1890) note that petals floating on the canal are a sight even after peak bloom.
* **Kawadoko / noryo-yuka** — summer decks: *noryo-yuka* on stilts on the Kamogawa's west bank between Nijō and Gojō (May to September or October), *kawadoko* low over the stream at Kibune and Takao. The tradition dates from the 1600s. Noted for a later summer variant.

## The cat in water

* **Shaking dry** — Dickerson, Mills & Hu (2012): wet mammals shake at frequencies tuned to fling drops off, and smaller animals shake faster. The paper's table lists a 3.3 kg domestic cat at 9.4 Hz (radius 5.9 cm). Press coverage said "about 6 Hz", and the preprint's scaling law was corrected to R^0.75. **Lab:** 9.4 Hz, drops thrown tangentially, the coat 55 % drier after a shake.
* **Wet fur is darker** — water fills the air gaps between fibres. The index mismatch drops, so less light scatters back, and the surface becomes smoother and more mirror-like (Baird, WTAMU; Physics Forums). **Lab:** the coat palette is scaled down up to 42 % when soaked, and dries over about 30 s.
* **Swimming** — cats can swim instinctively, keeping their heads above water, but cats not used to water may swim poorly. The Turkish Van's semi-long coat is water-resistant (excerpts; the breed's water-love is partly folklore). **Lab:** the root floats 25 cm under the surface with the nose tilted up. The walk gait, slowed to 42 %, reads as a doggy paddle. No jumping out of deep water: Michi paddles to a stone or the bank and scrambles up.

## Sources (second pass)

* three.js — *webgl_gpgpu_water* — <https://threejs.org/examples/webgl_gpgpu_water.html> (excerpt)
* Evan Wallace — *WebGL Water* — <https://madebyevan.com/webgl-water/> · *Rendering realtime caustics in WebGL* — <https://medium.com/@evanwallace/rendering-realtime-caustics-in-webgl-2a99a29a0b2c> (excerpts)
* three.js — *Water2.js* source (r160) — <https://github.com/mrdoob/three.js/blob/r160/examples/jsm/objects/Water2.js> (excerpt)
* Envato Tuts+ — *Creating Toon Water for the Web* — <https://code.tutsplus.com/creating-toon-water-for-the-web-part-1--cms-30447t> (excerpt)
* three.js forum — toon water depth and intersection foam — <https://discourse.threejs.org/t/toon-water-shader-with-depth-based-fog-and-intersection-foam/35978> (excerpt)
* Maxime Heckel — *On Crafting Painterly Shaders* — <https://blog.maximeheckel.com/posts/on-crafting-painterly-shaders/> (excerpt)
* Codrops — *Susurrus* — <https://tympanus.net/codrops/2026/04/24/susurrus-crafting-a-cozy-watercolor-world-with-three-js-and-shaders/> (excerpt)
* Animation Obsessive — *What Kazuo Oga thinks about when he thinks about backgrounds* — <https://animationobsessive.substack.com/p/what-kazuo-oga-thinks-about-when> (excerpt)
* Gurney Journey — *Painting in Ghibli style* — <https://gurneyjourney.blogspot.com/2018/05/painting-in-ghibli-style.html> (excerpt)
* Jenna Rainey — *Painting water reflections* — <https://jennarainey.com/painting-water-reflections/> (excerpt)
* Eric Lengyel — *Oblique view frustum depth projection and clipping* — <https://terathon.com/lengyel/Lengyel-Oblique.pdf> (method, as used by three's Reflector)
* National Park Service — *Fluvial features: meandering stream* — <https://www.nps.gov/articles/meandering-stream.htm> (excerpt)
* Kelvin wake pattern — <https://en.wikipedia.org/wiki/Kelvin_wake_pattern> · Rabaud & Moisy, PRL 2013 — <https://data-ww3.ifremer.fr/BIB/Rabaud_Moisy_PRL2013.pdf> (excerpts)
* JAANUS — *kōran* — <https://www.aisf.or.jp/~jaanus/deta/k/kouran.htm> · *wayō kōran* — <https://projects.mcah.columbia.edu/jaanus/node/302> · *hashibasami-ishi* — <https://projects.mcah.columbia.edu/jaanus/node/4193> · *yatsuhashi* — <https://projects.mcah.columbia.edu/jaanus/node/193> (excerpts)
* Muza-chan — *Giboshi* — <https://muza-chan.net/japan/index.php/blog/traditional-japanese-bridge-architecture-giboshi> (excerpt)
* Highlighting Japan, Sept 2023 — traditional bridges, Uji-bashi — <https://www.gov-online.go.jp/eng/publicity/book/hlj/html/202309/202309_00_en.html> · <https://www.gov-online.go.jp/pdf/hlj/20230901/hlj_202309_10-11_uji-bashi_bridge_and_tea_house.pdf> (excerpts)
* MLIT multilingual database — *Sorihashi* — <https://www.mlit.go.jp/tagengo-db/en/R3-00129.html> · *Yatsuhashi* — <https://www.mlit.go.jp/tagengo-db/en/R2-01679.html> · *Tōrō nagashi* — <https://www.mlit.go.jp/tagengo-db/en/R1-00499.html> (excerpts)
* Japanese Gardens — *Taiko-bashi* — <https://japanesegardens.jp/taiko-bashi-and-their-use-in-japanese-shrines-and-temples/> (excerpt)
* Kōzuya-bashi — <https://japanese-wiki-corpus.github.io/building/Kozuya-bashi%20Bridge.html> · Kansai Scene — <https://www.kansaiscene.com/2012/07/the-bridge-that-flows/> (excerpts)
* NFAJ — Ippon-bashi / Gyōja-bashi — <https://jl-db.nfaj.go.jp/en/location/260200010> (excerpt)
* Uji-bashi — <https://japanese-wiki-corpus.github.io/building/Uji-bashi%20Bridge.html> (excerpt)
* Togetsukyō — <https://japanese-wiki-corpus.github.io/building/Togetsu-kyo%20Bridge.html> (excerpt)
* Nippon.com — rice dried on haza racks, Noto — <https://www.nippon.com/en/japan-video/ct171000038/delicious-rice-dried-the-old-fashioned-way-on-racks-in-the-sun-noto-ishikawa-prefecture.html> (excerpt)
* Google Arts & Culture — Kihachi Homma, *Hasakake* — <https://artsandculture.google.com/asset/3wHndYnD-KEE_Q> (excerpt)
* Tree-frog choruses in paddy fields — <https://pmc.ncbi.nlm.nih.gov/articles/PMC5384602> (excerpt)
* Genji firefly flash intervals — <https://nishi2.jp/en/?p=49204> · JST (2024) — <https://sj.jst.go.jp/news/202401/n0118-02k.html> (excerpts)
* Kansai Finder — Arashiyama tōrō-nagashi — <https://kansaifinder.com/event/arashiyama-lantern-festival> (excerpt)
* Nippon.com — the Philosopher's Walk — <https://www.nippon.com/en/guide-to-japan/gu003021/> (excerpt)
* kyoto.travel — *Noryo yuka & kawadoko* — <https://kyoto.travel/en/travel-inspiration/noryo-yuka-kawadoko-summer-riverside-dining/> (excerpt)
* Kanpai — Demachiyanagi delta — <https://www.kanpai-japan.com/kyoto/demachiyanagi-delta> (excerpt)
* Dickerson, Mills & Hu (2012) — *Wet mammals shake at tuned frequencies to dry* — <https://pmc.ncbi.nlm.nih.gov/articles/PMC3481573> (excerpt)
* Baird (WTAMU) — *Why does water make a shirt darker?* — <https://wtamu.edu/~cbaird/sq/2013/11/06/why-does-water-make-a-shirt-darker> (excerpt)
* Catster — *Can cats swim?* — <https://www.catster.com/lifestyle/can-cats-swim/> (excerpt)
