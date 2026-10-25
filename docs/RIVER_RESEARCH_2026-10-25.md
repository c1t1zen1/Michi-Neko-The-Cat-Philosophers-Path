# River, bridge and paddies research — 2026-10-25

Notes behind `labs/water/` (Lab 02). 14 searches. "Read" = fetched and
summarised; "Excerpt" = only the search-result excerpt was available (claims
from it are limited to what the excerpt said).

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
