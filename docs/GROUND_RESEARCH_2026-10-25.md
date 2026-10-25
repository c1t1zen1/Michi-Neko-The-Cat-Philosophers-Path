# Ground research — 2026-10-25

Notes behind `labs/ground/` (Lab 01: ground, path and shoulders). 16 searches,
then full reads where a page opened. "Read" = fetched and summarised;
"Excerpt" = only the search-result excerpt was available (claims from it are
limited to what the excerpt said).

What the game does today (`src/countryside.js`): `buildGround()` is a 260 m
plane, 150 × 150 segments, tinted by vertex colour over one tiling moss
texture (`groundTextures(6)`, repeat 81×). `buildPathShoulders()` is a 6.4 m
dirt strip whose edges fade by a UV alpha. Nothing blends by height, nothing
gets wet, and the tiling shows wherever the grass thins out.

## What the field agrees on

| Lever | What works | Where it came from |
|-------|-----------|--------------------|
| Splat map | Each layer has a weight map stretched over the whole terrain; layers tile on top. 4 weights fit one RGBA texture, the base layer is the remainder | Mishkinis (excerpt), three.js forum terrain thread (excerpt), textureSplat (excerpt) |
| Height blend | Store each layer's height in its alpha. Add the splat weight to the height, keep only what lies within a `depth` window of the top: `ma = max(h1+a1, h2+a2) - depth; b = max(h+a - ma, 0)`. Sand falls into the cracks, stone tops stay clean. A linear cross-fade looks like "stones evenly soiled by sand" | Mishkinis (excerpt, code), ezEngine (excerpt), jensnt TerrainHeightBlend (excerpt) |
| Tiling | Break repetition by offsetting tiles: per-tile random offsets with blending (4 taps), Voronoi scatter, or a slow noise index choosing between two offsets (2 taps, cheapest). Histogram-preserving blending keeps contrast when tiles mix | Quilez *Texture repetition* (excerpt; page 404 on fetch), Gizmos & Games (excerpt), Heitz & Neyret 2018 (abstract), Unity stochastic texturing (excerpt) |
| Wetness | Four surface states: dry, wet, drenched, puddle (Nakamae et al.). Wet: diffuse ×0.1–0.3, specular ×5–10 (classic). Physically: porous materials darken because water fills the pores; link porosity to roughness. Puddles: a progressive blend from the normal map to the flat vertex normal as the water layer thickens | Lagarde *Water drop 2b* and *3b* (excerpt), fxguide part C (excerpt) |
| Puddles | Water gathers in the lowest height first, which also breaks up big repeating surfaces | fxguide part C (excerpt), Unity Production Ready Shaders (excerpt) |
| Rain rings | A 3×3 hash-cell ripple field, `sin(k·d)` crests, each cell on its own clock; differentiate for the normal. Wetness and ripples on separate schedules so the ground darkens before it moves | Originkit *Rain Puddle* (excerpt), ShaderBattle (excerpt), Summer Engine ripple buffer (excerpt) |
| Footprints | A top-down "trail buffer" texture. Store *height* (1 = untouched), not depth, so overlapping prints combine with the fixed-function `MIN` blend and no read-back. Untargeted channels write 1.0. A fixed buffer that never moves cannot smear. Rims come back from the slope | Shards of Stone (read) |
| Cobbles | Voronoi: F2 − F1 below a threshold is the joint; a dome `1 − (F1·s)^roundness` per stone; colour from the cell hash. Typical: jitter 0.55, roundness 1.4, channel width 0.3 | symbios-texture (excerpt), FreeAlphas (excerpt), Blender procedural cobbles (excerpt) |
| Depth illusion | Flat < single-sample parallax (swims at grazing angles) < parallax occlusion (ray-march). r160 WebGL has no POM node; a hand-written loop works, but geometry near the camera beats both | Cinevva part 20 (excerpt), threejs-kit parallax material (excerpt) |

## Kyoto ground, with numbers

* **Amaochi 雨落ち** — before gutters (late 19th c.) the eaves dripped straight down. A strip of gravel or river pebbles under the drip line keeps mud off the walls: 4–10 cm stones, 10–15 cm deep, about 35 cm toward the building and 15 cm outside the drip line; a ditch up to 1 m wide catches wind-blown rain (JAANUS, Hongō Fujiyama park, NAJGA — excerpts).
* **Tobi-ishi 飛石** — stepping stones from Rikyū's tea gardens, for walking over moss that turns to mud. They sit 6 cm proud (Rikyū), 5 cm (Oribe) or 3 cm (Enshū), about 10 cm apart. Layouts: chokuuchi (straight), niren'uchi / sanren'uchi (sets of 2 / 3), chidorigake (plover zig-zag), gan'uchi (flying geese). A larger yaku-ishi marks a place to pause (JAANUS, NAJGA — excerpts).
* **Nobedan 延段** — a paved strip of many stones (cut, mixed, round), 72–75 cm or 51–60 cm wide; the joint patterns are *arare-koboshi* ("scattered hail") (JAANUS — excerpt). Paths run formal → informal as shin → gyō → sō: fitted cut stone, then stepping stones with cut stone, then gravel or packed earth (NAJGA — excerpt).
* **Ishidatami 石畳** — Ishibe-kōji (Gion) was laid in the late Meiji–Taishō years; part of its paving is granite reused from the Kyoto city tram, removed in the 1970s (Kyoto ni Kanpai, japan365days — excerpts).
* **Samon 砂紋** — raked gravel: *sazanami-mon* (parallel ripples), *mizu-mon* (rings around a stone), *aranami-mon* (rough sea), *ichimatsu-mon* (checkerboard). A typical rake is 76 cm with 12 teeth; Daitoku-ji's gardeners use light metal rakes with narrow upright teeth (NAJGA, JAANUS — excerpts).
* **Koke 苔** — Saihō-ji grows 120 mosses in ~95 % humidity. Paths wear through moss wherever gardeners keep stepping in the same place; fallen leaves are left on it through the winter (into Saihoji, JTA, Japan Travel — excerpts).
* **Painting it** — Kazuo Oga paints large shapes first and small details last, in 24 poster colours. Real greens are muted; a touch of a non-adjacent colour beside a green makes it glow (Open Culture; Oga workshop video — excerpts).

## Decisions for the Lab

1. **Five layers, one splat.** Earth is the base; gravel, moss, ishidatami and cobble live in one RGBA splat. Earth, gravel and moss are painterly 256 px canvases (albedo + height in alpha) packed into a `DataArrayTexture`. Setts and cobbles are evaluated in world space in the shader, so the CPU can reproduce every stone.
2. **The splat, heights and rake live on the CPU.** Typed arrays are uploaded as `DataTexture`s after each brush stroke. The CPU can then answer "what is under this paw?" for prints, sounds and the stone LOD.
3. **Height blend is a uniform (`uBlendDepth`), and 0 means linear.** The split view shows linear on the left and height blend on the right, from the same material.
4. **Anti-tiling** uses Quilez's two-tap noise-index variant (cheapest). A debug grid shows the tiles.
5. **Rain** has one global wetness schedule (darken by porosity, drop roughness), plus a water level that fills the lowest height first. Puddles flatten the normal, reflect an analytic sky from the light rig, and ripple with hash-cell rings. Drying lags the rain.
6. **Prints** go into a fixed 12 m trail buffer: R = surface height, G = dryness. `MIN` blending stamps a paw-pad shape on each paw-down, and an additive pass heals it slowly.
7. **Stones near the paws.** Inside ~2.5 m of the cat, instanced rounded stones replace the shader's setts and cobbles (same integer hash in GLSL and JS), cross-faded with a dither.
8. **Kyoto recipes**: packed earth, ishidatami, tama-ishi cobbles, raked sandō gravel, moss with tobi-ishi, amaochi, nobedan, riverbank mud.

## Sources

* Andrey Mishkinis — *Advanced Terrain Texture Splatting* — <https://www.gamedeveloper.com/programming/advanced-terrain-texture-splatting> · <https://habr.com/en/articles/442924/> (excerpt, code)
* ezEngine — *Terrain Materials: height blending* — <https://ezengine.net/pages/docs/terrain/terrain-materials.html> (excerpt)
* jensnt — *TerrainHeightBlend-Shader* — <https://github.com/jensnt/TerrainHeightBlend-Shader> (excerpt)
* Inigo Quilez — *Texture repetition* — <https://iquilezles.org/articles/texturerepetition/> (excerpt)
* Gizmos and Games — *Texture tiling with Voronoi* — <https://gizmosandgames.com/2017/03/18/texture-tiling-with-voronoi/> (excerpt)
* Heitz & Neyret — *High-Performance By-Example Noise using a Histogram-Preserving Blending Operator* (HPG 2018) — <https://doi.org/10.1145/3233304> (abstract)
* Unity Labs — *Procedural Stochastic Texturing in Unity* — <https://unity.com/blog/engine-platform/procedural-stochastic-texturing-in-unity> (excerpt)
* Sébastien Lagarde — *Water drop 2b – Dynamic rain and its effects* — <https://seblagarde.wordpress.com/2013/01/03/water-drop-2b-dynamic-rain-and-its-effects/> (excerpt)
* Sébastien Lagarde — *Water drop 3b – Physically based wet surfaces* — <https://seblagarde.wordpress.com/2013/04/14/water-drop-3b-physically-based-wet-surfaces/> (excerpt)
* fxguide — *Game environments, part C: making wet environments* — <https://www.fxguide.com/fxfeatured/game-environments-partc/> (excerpt)
* Unity — *Shader Graph Production Ready Shaders: rain, puddles* — <https://docs.unity3d.com/Packages/com.unity.shadergraph@17.6/manual/Shader-Graph-Sample-Production-Ready-Detail.html> (excerpt)
* Originkit — *Rain Puddle* — <https://www.originkit.dev/components/rain-puddle> (excerpt)
* ShaderBattle — *Water simulation 2: rain on the pond* — <https://shaderbattle.com/learn/water-simulation-2-rain-on-the-pond> (excerpt)
* Shards of Stone — *Snow that remembers where you walked* — <https://www.shardsofstone.com/blog/snow-that-remembers-where-you-walked> (read)
* Cinevva — *Open world in the browser, part 20: parallax occlusion* — <https://app.cinevva.com/blog/2026-05-05-open-world-browser-part-20-parallax-occlusion> (excerpt)
* threejs-kit — *MeshParallaxMaterial* — <https://three-kit.vercel.app/materials/parallax-material/> (excerpt)
* symbios-texture — *cobblestone* — <https://docs.rs/symbios-texture/latest/symbios_texture/cobblestone/index.html> (excerpt)
* FreeAlphas — *Large cobblestone* — <https://freealphas.com/a/large-cobblestone/> (excerpt)
* Three.js forum — *How to create a multiple textured terrain* — <https://discourse.threejs.org/t/how-to-create-a-multiple-textured-terrain/5069> (excerpt)
* nickfallon — *textureSplat for three.js* — <https://github.com/nickfallon/textureSplat> (excerpt)
* JAANUS — *amaochi 雨落* — <https://projects.mcah.columbia.edu/jaanus/record/amaochi> (excerpt)
* Hongō Fujiyama Park — *古民家ミニ博物館: 雨落ち* — <https://hongofujiyama.jp/guidance/cultural-property/museum/> (excerpt)
* NAJGA — *Japanese Gardens: The Architectural Interface* — <https://najga.org/japanese-gardens-the-architectural-interface/> (excerpt)
* JAANUS — *tobi-ishi 飛石* — <https://projects.mcah.columbia.edu/jaanus/record/tobiishi> (excerpt)
* JAANUS — *nobedan 延段* — <https://projects.mcah.columbia.edu/jaanus/record/nobedan> (excerpt)
* NAJGA — *Japanese Garden Paths* — <https://najga.org/japanese-garden-paths/> · *The Garden Path* — <https://najga.org/the-garden-path/> (excerpts)
* Kyoto ni Kanpai — *石塀小路* — <https://kyotonikanpai.com/spot/02_01_gion_higashiyama/ishibekoji.php> (excerpt)
* NAJGA — *7 Common Raking Patterns* — <https://najga.org/7-common-raking-patterns-in-japanese-dry-landscape-gardens/> · *Pulling the Rake* — <https://najga.org/pulling-the-rake-a-practical-guide-to-raking-karesansui-garden/> (excerpts)
* JAANUS — *samon 砂紋* — <https://projects.mcah.columbia.edu/jaanus/record/samon> (excerpt)
* into Saihoji — *What Little Moss Teaches Us* — <https://intosaihoji.com/en/journal/kosaten004-2/> (excerpt)
* Japan Tourism Agency — *Moss at Saihoji* — <https://www.mlit.go.jp/tagengo-db/en/R1-00439.html> (excerpt)
* Open Culture — *Inside the painting process of Kazuo Oga* — <https://www.openculture.com/2021/01/a-look-inside-the-painting-process-of-the-studio-ghibli-artist-kazuo-oga.html> (excerpt)
