# Ground, path & shoulders: research and design (2026-11-07)

Notes behind `labs/ground/` (Lab 01, 土と道 *tsuchi to michi*). This replaces
the 2026-10-25 version of the lab. Two rounds of research went into it: how
the field draws ground, and what Kyoto's ground is actually made of. About
forty searches, with full reads where a page opened. **Read** = fetched and
summarised; **excerpt** = only the search-result excerpt was available, so
claims from it go no further than the excerpt did.

## The brief

Grass now covers most of the valley, which leaves the bare ground as the
flattest thing on screen: paths, shoulders, clearings, the earth under the
eaves. `docs/VISUAL_NEXT_STEPS_2026-10-24.md` (item 1) asks for height-based
blending between earth, gravel, moss and cobble, worn-edge decals, puddles
that come and go with rain, per-stone geometry near the cat, and "reuse the
grass biome mask as the splat map so ground and grass agree". Item 22 asks
for dappled light and petal drifts to be folded into the same pass.

What the game does today (`src/countryside.js`):

* `buildGround()`: one 260 m plane, 150 × 150 segments, tinted by vertex
  colour over one tiling meadow texture (`groundTextures(6)`, repeat 81×).
* `buildPathShoulders()`: a 6.4 m dirt strip whose edges fade by a UV alpha.
* `buildPath()`: a 3.8 m cobble ribbon on top.
* `buildWalkwaySlabs()`: written, never called.

Nothing blends by height, nothing gets wet, and the tiling shows wherever
the grass thins. The shoulder is a stripe, not a place.

## The idea

**Every path begins as a shortcut.** Nobody draws a Kyoto garden's paths
first; feet do. The lab is a 16 × 12 m corner of Michi's valley where that
happens for real. The ground keeps a *wear field* G. Paws raise it, the
ground grows it back, and everything else reads it: the game's own grass
thins and goes, moss wears through, earth packs down into ruts, and the
ruts are where the rain stands. The shoulder stops being authored: it is
wherever G is in between. Then the gardener steps in, and the formality
scale of Japanese gardens (shin-gyō-sō) turns a trail into a path.

## What the field agrees on (technique)

| Lever | What works | Where it came from |
|-------|-----------|--------------------|
| Splat | Weights per layer in RGBA maps, earth is the remainder; extend a standard material with `onBeforeCompile` instead of a bare ShaderMaterial so lights, shadows and fog stay | THREE.Terrain `generateBlendedMaterial` (excerpt); three.js forum 5069, 77826 (excerpt); Activision terrain layers, Advances 2023 (excerpt) |
| Height blend | `ma = max(h + a) − depth; b = max(h + a − ma, 0)`. Sand drops into gaps first; a linear blend looks "evenly soiled" | Mishkinis (excerpt + code) |
| Edge noise | A painted path mask → SDF; edge noise 0.5 m at 6 cycles per 40 m; a soil strip between road and grass (cobbles fade over ~0.3 m, grass over the outer 60 % of the edge) | dedekpo/stylized-scene `path-blend.ts` (read) |
| Ground-colour projection | Grass roots take the full ground tint, tips 40 %: ground and grass agree by construction | dedekpo/stylized-scene `grass-material.ts` (read) |
| Hex-tiling | Triangle grid in skewed space × 2√3; each tile rotated about its own centre and offset by a hash; weights `lerp(1, luminance, 0.6) · w⁷`, normalised; normal maps use slope magnitude instead of luminance and rotate the derivative back | Mikkelsen, JCGT 11(3) 2022; `hextiling.h` (read, verbatim); three-hex-tiling (excerpt) |
| Quilez | (1) per-tile random offset + mirror, 4 taps blended over the tile border; (3) a slow noise picks one of 8 offsets, 2 taps | Quilez, *Texture repetition* (excerpt) |
| Parallax | three.js removed its parallax example in r132 (no lighting support). A WebGL2 POM loop: layer search then interpolation between the last two layers; TSL ports use 4 steps + 3 secant ≈ 64 steps; fade with distance; POM swims and clamps at grazing angles | three.js #22529 (excerpt); Kristian Dixon 2025 (read); Cinevva part 20 (read) |
| Wetness | Porosity from roughness; diffuse × lerp(1, 0.2, porosity); gloss boosted by lerp(1, factor, 0.5·wet); water F0 0.02; regions: wet → thin drenched film → puddle (flat normal) | Lagarde, *Water drop 3b* (read, code) |
| Drying | The shine goes before the darkening; drying is not homogeneous | Lagarde 3b (read) |
| Puddles | A puddle mask that *only* lowers roughness looks wrong: it needs a mask, a normal response and ripples; ripples = 3 × 3 hashed cells, ring radius 0→2 cells, normal from the radial derivative of sin(31 d); the reference mask is noise, not height | scottstts precipitation skill (read; GPL notice on part of the example, so ideas only, no code taken) |
| Why wet is dark | Light trapped by total internal reflection in the water film; strongest for weakly absorbing materials | Lekner & Dorf 1988 (excerpt) |
| Marks | A top-down buffer; store depth, combine with MAX, heal by a pass; never read back | Shards of Stone (read, earlier round); Phaser deform-terrain heal step (excerpt) |
| Painterly | Kuwahara keeps edges while flattening noise; one pass at the end of the frame | Maxime Heckel (excerpt); Codrops *Susurrus* (excerpt) |
| Dappled light | A warm fringe only where tone is mid-range and the light–shade gradient is sharp; penumbra grows with distance from the leaves | Jacky Zhao, *Experiments in procedural dappled light* (read) |
| Footsteps | A step is many micro-impacts; aggregate ground (gravel) is granular, solid ground is not | Nordahl, Serafin & Turchet, IEEE VR 2010 (excerpt) |
| Trails | Active walkers: `dG/dt = (G0 − G)/T + I(1 − G/Gmax) Σ δ(r − r_α)`; heading `e = ∇[U + V_tr]/‖…‖`, `U = −‖d − r‖`, `V_tr = ∫ exp(−‖r − r'‖/σ) G d²r'`; pedestrians make "minimal detour systems" | Helbing, Schweitzer, Keltsch & Molnár 1997 (read); Helbing et al., *Nature* 1997 (excerpt) |

## Kyoto ground, with numbers

* **Masa-do 真砂土 / Shirakawa-suna 白川砂.** Weathered granite. Shirakawa
  sand comes from the Kitashirakawa granite between Hiei-zan and
  Daimonji-yama, about 5–7 km north–south; it began as the chippings of
  Shirakawa-ishi stonework; *Meigetsuki* (early 13th c.) records it spread at
  the Minase palace. It **turns dark when wet because of its mica, and
  returns to white as it dries**. Quarrying is now banned (the Kyoto scenic
  ordinance and the quarrying law), coarse grades wear quickly, and
  substitutes are being studied (Nara NRICP; Kyoto University repository;
  J-STAGE *Landscape Research Japan* 81(5), excerpts).
* **Samon 砂紋**, also **hōkime 箒目** (broom pattern): swirls, swells and
  waves drawn in raked sand (Nara NRICP, read). A typical rake is 76 cm with
  12 teeth (NAJGA, earlier round).
* **Ishidatami 石畳.** Ishibe-kōji's paving is stone from the Kyoto city
  tram, lifted in the 1970s; Gion's paving reused tram stones after the line
  closed in 1978 (Keihan, excerpt). Kyoto's stone-road specification for
  Kawabata-dōri calls for **600 × 300 × 80 mm** slabs (Kyoto City, excerpt).
  A survey of Kyoto's rōji found about **45 %** of them stone-paved (GISA
  2010, excerpt).
* **Nobedan 延段**: smooth natural or dressed stones paved to a uniform
  width; millstones and tanzaku stones sometimes included; also *tatami-ishi*.
  **Arare-koboshi 霰こぼし**: small natural stones, like hail on the ground.
  **Arare-kuzushi 霰くずし**: the same with larger round and dressed stones
  mixed in. **Irokojiki 鱗敷**: square stones with every other one turned
  45°, known from Konchi-in. **Shiki-ishi 敷石**: pavement named by its stone
  (Nara NRICP, read).
* **Tobi-ishi 飛石**: separately spaced stones on an earthen path, from the
  Azuchi-Momoyama tea garden (Nara NRICP, read). Set 6 cm proud (Rikyū), 5 cm
  (Oribe), 3 cm (Enshū), about 10 cm apart (JAANUS, earlier round).
  **Fumiwake-ishi 踏分石**: a larger stone at a junction, or the third stone
  from the kutsunugi-ishi, where the stepping stones begin. **Kutsunugi-ishi
  沓脱石**: the flat stone by the veranda (Nara NRICP, read).
* **Sekimori-ishi 関守石**: a fist-sized stone tied crosswise with dyed palm
  rope (*shuro-nawa*), set on a path to say "not this way" without a sign
  (Nara NRICP, JAANUS, MLIT, read).
* **Amaochi 雨落ち**: pebbles under the drip line (JAANUS, earlier round).
  **Inubashiri 犬走り**: the strip along a wall base, typically 40–60 cm,
  gravel or concrete, against splash (at home, excerpt). **Inuyarai 犬矢来**:
  curved bamboo screens about **60 cm** high at a machiya's foot, also
  *komayose* (JAANUS, excerpt).
* **Tataki 三和土**: "three things mixed": red earth and gravel with slaked
  lime and nigari, rammed hard; the doma, covered passages, kitchens (Tokyu
  Livable, excerpt; Yano & Yano 2011, excerpt).
* **Araidashi 洗い出し**: Meiji–Taishō cement finish washed before it sets
  so the pebbles stand out; Kyoto machiya entrances (Sanyo Chemical, excerpt).
* **Moss.** Kyoto Prefecture records **560** species; gardens are a key
  habitat (Kyoto Prefecture, excerpt). Sugigoke is the commonest garden moss;
  haigoke yellows in sun and greens in shade; moss cannot take trampling
  (japanesegardens.jp, excerpt). **Shikimatsuba 敷松葉**: withered pine
  needles laid over the ground for winter, against drying and frost, and as
  a winter decoration in tea gardens (Nara NRICP, read).
* **Uchimizu 打ち水**: sweep the front of the house, then throw water: to
  purify, to welcome, and to cool. Kyoto City's waterworks measured about
  **1.8 °C** cooler near the surface; felt temperature about 1.5 °C (Kyoto
  City, Shikibo, Weathernews, excerpts).
* **Shin-gyō-sō 真行草**: formal, semi-formal, informal; from the Edo
  period applied to gardens (Nara NRICP, read). Paths run shin (fitted cut
  stone) → gyō (stepping stones with cut stone) → sō (gravel, packed earth)
  (NAJGA, earlier round).
* **Painting it.** Kazuo Oga paints large shapes first and small details
  last, in poster colour, about twenty-one colours; real greens are muted,
  and a warm neighbour makes a green glow (Animation Obsessive, Open Culture,
  excerpts). Kyoto Animation's art director on *Sparks of Tomorrow* (2026):
  the light was painted into the backgrounds because composited light did
  not suit them (Anime Corner, excerpt).

## Decisions

1. **One field, everything reads it.** `GroundField` is a 6 cm CPU grid:
   eight weights (grass, moss, gravel, sand, paving, tataki, needles, wild;
   earth is the remainder), wear G and its rest value G0, wetness, snow
   cover, a paving style and authored relief. It uploads as three RGBA8
   textures and one half-float height. The cat, the sounds, the walkers, the
   litter and the grass all ask it what is underfoot.
2. **The grass agrees by construction.** `writeGrassMask()` writes the
   game's `BiomeMask` (r meadow, g edge thicket, b flowers, a wild) from the
   field four times a second: `meadow = grass × (1 − smoothstep(0.26, 0.58, G))`.
   The ground under the blades is the game's own meadow floor texture. No
   blade grows through a stone.
3. **Kemonomichi.** The Helbing model on the field: every paw-down adds
   `I(1 − G)`, everything relaxes to G0 with T (180 s live, 14 s in the
   fast-forward). Walkers head for favourite places (the engawa stone, the
   basin, the fishmonger's door, the shrine, the sun-warmed rock, the lane),
   lean toward trodden ground by ∇(G blurred to σ ≈ 0.9 m), **with the trail
   force capped below the way there** (uncapped, sharp ruts trapped them and
   wear collapsed), avoid puddles and a sekimori-ishi. A parameter sweep
   (headless, 22 s, 16 walkers) chose 1.5 × deposit, T 14, attraction 4.
4. **Eight layers, one shader.** Seven painted 256 px tiles (Canvas2D dabs:
   big shapes, then grit) in a `DataArrayTexture` with height in alpha,
   plus a procedural stone layer with six Kyoto pavings evaluated in world
   space. Height blend (0.2 window) with a little noise to break the 6 cm
   grid; hex-tiling with one triangle grid shared by every layer.
5. **Wear is visible as material.** G 0.1–0.34 tints the meadow floor
   straw-pale; 0.28–0.6 eats grass, moss and needles to earth; the earth
   compacts 4.5 cm and darkens; gravel is kicked aside down the middle; stone
   and tataki get polished (lower roughness).
6. **Weather after Lagarde, puddles after the relief.** One schedule: wet
   (diffuse), wetSpec (the film, dries ~2× faster), a water level that
   rises with rain and drains with sun, snow cover. Only compacted or sealed
   ground holds water, so the ruts the cats wore are where puddles stand.
   Under the machiya eave the ground stays dry; the drip line gets the
   water and the splash: the reason amaochi exist.
7. **Marks on the GPU.** Prints (MAX-blended paw stamps: depth and the wet
   a paw carries out of a puddle, faded by a multiply pass) and grooves
   (stroke ribbons storing only across-distance, angle and tool, so the
   shader draws 6.3 cm rake ridges or 6.5 mm broom streaks at any zoom).
   **renderer.autoClear must be off while drawing them**, or every pass
   clears them to the page's white.
8. **The game's sky.** The stage uses `src/sky.js`'s `Sky` (dome, painted
   clouds, sun, fill, golden-hour bounce, palettes) with its clock stopped;
   the bounce is halved on the corner because pale masa-do over-lights.
   The ground keeps the sun's shadow term: a warm fringe at the penumbra,
   a cool tint in the shade.
9. **The finish is one pass**: glow from a blurry mip, Oga split-tone, sun
   haze, Kuwahara brush, paper tooth, and the photograph/painting split.
10. **Diorama by default.** Orbit and plan show the corner cut open, with
    the strata under each surface on the skirt (setts on bedding sand on
    crushed stone; amaochi pebbles 13 cm deep; topsoil under moss; masa-do
    down to the bedrock). At cat height the valley goes round it.

## The stage

* North: a machiya frontage (plaster, koshi-ita, a sen-bon kōshi, noren,
  tiled eave with rafter ends, mushiko-mado upstairs), inuyarai, the amaochi
  strip, a stone gutter with water, a tataki threshold, then the ishidatami
  street.
* North-east: a shrine sandō of tamajari with granite kerbs, a nobedan walk
  and a pine.
* Middle: the lane: two ruts held as standing wear (G0), grass down the
  middle, worn shoulders, a ditch with wild grass.
* South-west: the roji: sugigoke, tobi-ishi in chidori-gake from the
  kutsunugi-ishi to the lane with branches to the tsukubai and to a closed
  corner (where a sekimori-ishi sits), a maple, the basin and its kakei.
* South-east: a karesansui of Shirakawa sand, raked in sazanami-mon with
  mizu-mon rings round three rocks, a tile kerb.

## Interactions

* **Walk**: Michi wears the ground, prints it (deeper in mud, sand and snow;
  wet prints on stone after a puddle), kicks leaves.
* **The gardener's hand**: broom (hōkime; sweeps leaves and snow; wipes
  prints), rake (samon; click a rock for mizu-mon), uchimizu ladle (a fan of
  droplets that wet where they land and dry in the sun), stones (Rikyū /
  Oribe / Enshū heights; Kurama, Kibune, granite), a sekimori-ishi, paint
  (moss, grass, earth, gravel, sand, six pavings), dig and raise.
* **The village**: Luna, Mochi and Kuro (the game's coats) roam between
  their places; "Let a season pass" runs 90 days in about 20 s with a wet
  spell in the middle; pave the result as sō (keep it as earth), gyō
  (tobi-ishi along it; grass closes in) or shin (nobedan with a gravel
  shoulder). Only *new* trails are paved.
* **Look**: orbit, cat-eye, plan; show the wear field, the splat, the tiles;
  compare the game today, linear vs height blend, repeat vs hex-tiling, with
  and without wear, photograph vs painting; how painted; sound.

## Into the game

The same list is on the page. In short: `buildGround()` wears
`createGroundMaterial` over a village field (64 m at 16 texels/m) and a
coarse rim field; `buildPath()` and `buildPathShoulders()` paint into the
field instead of laying ribbons; `Vegetation.buildMeadow()` calls
`writeGrassMask`; NPC and player paws call `field.step()` (T ≈ 7 game days;
upload dirty rows); weather drives `Weather.apply(U)`; eaves become a short
list of dry rects with amaochi; `buildWalkwaySlabs()` is replaced by real
tobi-ishi; raking, sweeping and uchimizu can be quiet activities. No fail
states, no timers.

## Running the lab

```
python3 -m http.server 8000      # from the repo root
# open http://localhost:8000/labs/ground/
```

Flags: `?hour=6.4..21.5`, `?season=spring|summer|autumn|winter`,
`?sky=clear|drops|rain|after|snow`, `?view=orbit|eye|plan`, `?step=1..12`,
`?compare=game|blend|tile|wear|paint`, `?tool=sweep|rake|ladle|…`,
`?village=1`, `?ff=1` (a season at load), `?paint=0..1`,
`?quality=eco|lush`, `?cat=0`, `?cam=px,py,pz,tx,ty,tz[,fov]`, `?nohud=1`,
`?shot=1` (keeps the drawing buffer, disables the governor). Console:
`__ground.stage` (field, weather, sim, stones, grass), `__ground.stepper`,
`__ground.views`.

Files: `js/field.js` (the ground field and the grass mask writer),
`paint.js` (the painted tiles), `glsl.js` (hex-tiling, Quilez, pavings, POM,
rain rings, grooves), `ground.js` (the material), `marks.js` (prints and
grooves), `stones.js`, `props.js`, `scene.js` (the layout and its painter),
`walkers.js` (Kemonomichi and the village cats), `weather.js`, `litter.js`,
`finish.js`, `sound.js`, `stage.js`, `today.js` (the game's ground for the
split), `variants.js` + `gallery.js` (thirty-one core samples), `steps.js`,
`main.js`. Only `labs/shared/game.js` imports game modules (textures, cat,
foliage, grass, sky; cache-tagged).

## Verification (2026-11-07)

Headless Chromium (Metal) on the dev Mac: the page loads with no console
errors or warnings; tools checked by state (stones land where clicked, moss
paints, the ladle wets the street) and by eye (samon rings and ripples);
a fast-forwarded season wears distinct trails; gyō paving lays stones only
on new trails; rain, autumn, snow, every compare split and the steps render.
Not done: a real-device benchmark, and a mobile pass beyond the CSS.

## Image references

* Ishibei-kōji, Gion: <https://commons.wikimedia.org/wiki/Category:Streets_in_Gion,_Kyoto>
* Stepping stones in Japan: <https://commons.wikimedia.org/wiki/Category:Stepping_stones_in_Japan>
* Tenju-an moss and pond garden (Nanzen-ji): <https://commons.wikimedia.org/wiki/Category:Tenjuan_(Nanzenji)>
* Inuyarai: <https://projects.mcah.columbia.edu/jaanus/record/inuyarai>

## Sources

Technique

* Andrey Mishkinis, *Advanced Terrain Texture Splatting* — <https://www.gamedeveloper.com/programming/advanced-terrain-texture-splatting> (excerpt, code)
* IceCreamYou, THREE.Terrain — <https://github.com/IceCreamYou/THREE.Terrain> (excerpt)
* three.js forum, *How to create a multiple textured terrain* — <https://discourse.threejs.org/t/how-to-create-a-multiple-textured-terrain/5069> (excerpt)
* Activision, *Large Scale Terrain Rendering* (Advances 2023) — <https://advances.realtimerendering.com/s2023/> (excerpt)
* dedekpo, stylized-scene — <https://github.com/dedekpo/stylized-scene> (read: `ground-material.ts`, `path-blend.ts`, `grass-material.ts`, `path-sdf.ts`)
* Inigo Quilez, *Texture repetition* — <https://iquilezles.org/articles/texturerepetition/> (excerpt)
* Morten Mikkelsen, *Practical Real-Time Hex-Tiling*, JCGT 11(3) 2022 — <https://jcgt.org/published/0011/03/05/> (excerpt); mmikk/hextile-demo `hextiling.h` — <https://github.com/mmikk/hextile-demo> (read)
* ameobea, three-hex-tiling — <https://github.com/ameobea/three-hex-tiling> (excerpt)
* Heitz & Neyret, HPG 2018 — <https://doi.org/10.1145/3233304> (abstract)
* three.js issue #22529 — <https://github.com/mrdoob/three.js/issues/22529> (excerpt)
* Kristian Dixon, *Parallax mapping* (2025) — <http://kristiandixon.com/2025/05/13/Parallax.html> (read)
* Cinevva, *Open world in the browser, part 20* — <https://app.cinevva.com/blog/2026-05-05-open-world-browser-part-20-parallax-occlusion> (read)
* Sébastien Lagarde, *Water drop 2b* — <https://seblagarde.wordpress.com/2013/01/03/water-drop-2b-dynamic-rain-and-its-effects/> (excerpt); *Water drop 3b* — <https://seblagarde.wordpress.com/2013/04/14/water-drop-3b-physically-based-wet-surfaces/> (read)
* Lekner & Dorf, *Why some things are darker when wet* — <https://www.wgtn.ac.nz/scps/staff/pdf/darkerwhenwet.pdf> (excerpt)
* scottstts, three.js precipitation surfaces — <https://github.com/scottstts/Threejs-Awesome-Graphics-Agent-Skills> (read)
* fxguide, *Game environments part C* — <https://www.fxguide.com/fxfeatured/game-environments-partc/> (excerpt)
* Shards of Stone, *Snow that remembers where you walked* — <https://www.shardsofstone.com/blog/snow-that-remembers-where-you-walked> (read)
* Helbing, Schweitzer, Keltsch & Molnár, *Active walker model* — <https://arxiv.org/abs/cond-mat/9806097> (read); Helbing, Keltsch & Molnár, *Modelling the evolution of human trail systems* — <https://arxiv.org/abs/cond-mat/9805158> (excerpt)
* Maxime Heckel, *On crafting painterly shaders* — <https://blog.maximeheckel.com/posts/on-crafting-painterly-shaders> (excerpt)
* Codrops, *Susurrus* — <https://tympanus.net/codrops/2026/04/24/susurrus-crafting-a-cozy-watercolor-world-with-three-js-and-shaders/> (excerpt)
* Jacky Zhao, *Experiments in procedural dappled light* — <https://jzhao.xyz/posts/dappled-light> (read)
* Nordahl, Serafin & Turchet, IEEE VR 2010 — <https://vbn.aau.dk/ws/files/40509677/NORDAHL_IEEE_VR_2010.pdf> (excerpt)
* Codrops, *How to make the fluffiest grass* — <https://tympanus.net/codrops/2025/02/04/how-to-make-the-fluffiest-grass-with-three-js/> (excerpt)

Kyoto ground

* Nara National Research Institute for Cultural Properties, *Japanese Garden Dictionary* (Ono & Edwards, 2010): Barrier stone, Stepping stones, Nobedan, Stone pavement, Scattered hailstone pavement, Stony path, Fish scale paving, Shoe-removing stone, Path junction stone, Raked pattern, Shirakawa sand, Pine-needle covering, Moss, Shin-gyō-sō, Tea garden — <https://www.nabunken.go.jp/org/bunka/jgd/EnglishIndex.html> (read)
* JAANUS: tobi-ishi, amaochi, nobedan, samon, inuyarai — <https://projects.mcah.columbia.edu/jaanus/> (excerpts)
* Kyoto University repository, Shirakawa sand — <https://repository.kulib.kyoto-u.ac.jp/dspace/bitstream/2433/232337/2/dnogk02262.pdf> (excerpt)
* J-STAGE, *Landscape Research Japan* 81(5) — <https://www.jstage.jst.go.jp/article/jila/81/5/81_467/_article/-char/ja> (excerpt)
* Keihan, 石塀小路 — <https://www.keihan.co.jp/navi/kyoto_tsu/tsu201802.html> (excerpt)
* Kyoto City, Kawabata-dōri paving specification — <https://www2.nyusatsu.city.kyoto.lg.jp/keiyaku/mitsumori/up_file/20250417154726_00411034/tenp1.pdf> (excerpt)
* GISA 2010, Kyoto rōji paving — <https://www.gisa-japan.org/content/files/conferences/proceedings/2010cd/papers/4G-2.pdf> (excerpt)
* Kyoto City Waterworks Bureau, 打ち水 — <https://www.city.kyoto.lg.jp/suido/cmsfiles/contents/0000343/343487/20250801_uchimizu.pdf> (excerpt); Shikibo — <https://www.shikibo.co.jp/product/textile/pdf/Uchimizu.pdf> (excerpt); Weathernews — <https://weathernews.jp/news/202607/210161/> (excerpt)
* Tokyu Livable, 三和土 — <https://www.livable.co.jp/l-note/?p=18151> (excerpt); Yano & Yano 2011 — <https://www.jstage.jst.go.jp/article/qes/19/2/19_60/_article/-char/ja> (excerpt)
* Sanyo Chemical, 洗い出し — <https://www.sanyo-chemical.co.jp/magazine/wp/wp-content/uploads/2021/01/No.524kyo.pdf> (excerpt)
* at home, 犬走り — <https://www.athome.co.jp/contents/custom/build-design/scarcement/> (excerpt)
* japanesegardens.jp, *Moss in the Japanese garden* — <https://japanesegardens.jp/moss-types-overview/> (excerpt); Kyoto Prefecture moss pamphlet — <https://www.pref.kyoto.jp/kankyo/documents/kokepamphlet.pdf> (excerpt)
* MLIT multilingual database, *Building a hermit's retreat: tea houses and roji* — <https://www.mlit.go.jp/tagengo-db/en/R4-00289.html> (excerpt)
* Animation Obsessive, *What Kazuo Oga thinks about when he thinks about backgrounds* — <https://animationobsessive.substack.com/p/what-kazuo-oga-thinks-about-when> (excerpt)
* Anime Corner, *Sparks of Tomorrow* interview (Kyoto Animation) — <https://animecorner.me/interview-sparks-of-tomorrow-director-minoru-ota-and-producer-satori-senami-on-kyoto-animations-new-creative-challenge/> (excerpt)
* Earlier round (2026-10-25): NAJGA (paths, raking, architectural interface), Hongō Fujiyama park (amaochi), into Saihoji, Kyoto ni Kanpai, Open Culture (Oga).

## Construction review — 2026-11-10

The upper frontage eave now falls toward the street instead of rising at the
outer edge. A timber bearing closes the joint to the upper wall. Compared with
[Kyoto City's machiya guide](https://plus.kyoto.travel/entry/kyomachiya) and the
[Sugimoto residence photographs](https://en.sugimotoke.or.jp/). The frontage
remains a cutaway study rather than a complete house survey. See the
[full review](../REVIEW_2026-11-10.md).
