# Forest wall and mountains research — 2026-10-25

Notes behind `labs/ranges/` (Lab 03). 13 searches. "Read" = fetched and
summarised; "Excerpt" = only the search-result excerpt was available (claims
from it are limited to what the excerpt said).

What the game does today (`src/countryside.js`): `buildMountains()` is one
900 m plane (170 × 170) displaced by `terrainHeight()`. Its vertex colours run
forest → rock with altitude → haze with distance, the haze being
`smoothstep(105, 380, d)` baked into the colours. `buildEdgeForest()`
instances 260 leaf-mass trees in four variants just inside the boundary.
`buildFoothillForest()` instances 3,800 cones and round crowns between 60 and
190 m. `buildMistRing()` is 14 radial-gradient sprites at 58–72 m. Nothing
moves across the slopes, the ranges don't separate into layers, and the haze
can't follow the sun.

## What the field agrees on

| Lever | What works | Where it came from |
|-------|-----------|--------------------|
| Aerial perspective | With distance, contrast falls (including inside the object), saturation drops and colours shift toward the background: blue by day, reddish near sunrise or sunset. The cause is sky light scattered into the line of sight as a veiling luminance | Wikipedia *Aerial perspective* (excerpt), Gurney *Color and Light* (excerpt) |
| Values step geometrically | Like looking through evenly spaced wedding veils: each layer of air adds a fixed fraction of veil, so darks lighten geometrically (exponential fog), not linearly | Gurney Journey *Atmospheric distance and value* (excerpt) |
| Reverse perspective | Looking into a low sun through moist or dusty air, distance gets *warmer*, not cooler | Gurney Journey *Reverse atmospheric perspective* (excerpt) |
| Sun-aware fog | `fog = 1 − exp(−t·b)`, with the fog colour bent from blue toward yellow by `pow(max(dot(rd, sun), 0), 8)`. Wavelength-dependent extinction `exp(−t·k·vec3(1, 1.5, 4))` reddens the far field | Quilez *Fog* (excerpt), MiniMax shader-dev terrain notes (excerpt) |
| Impostors | Bake N views of a tree into an atlas and pick or blend frames by view direction. Octahedral layouts use texture space best; a hemisphere suits trees seen from above or level. Normal+depth atlases let impostors take light and write depth. Billboards are the 3×3 baseline | Brucks via 80.lv and LightBulbBox (excerpts), Meep docs (excerpt) |
| Multiplane | Disney's 1937 camera put scene elements on separate glass planes, which gave real parallax, per-plane focus and per-plane lighting | SMPE Journal 1938 (abstract), International Photographer 1938 (excerpt) |
| Ridges | Fold the noise basis (`1 − |n|`) and square it for razorback ridges at every scale. Heterogeneous / hybrid multifractals keep valleys smooth and peaks rough | Musgrave, *Texturing & Modeling* (excerpts) |
| Cloud shadows | Project the receiver up to a cloud altitude along the sun direction, then sample the *same* cloud field the sky draws. Or paint the field top-down into one small texture and sample it by world position. Darken direct light only | tosijs-3d (excerpt), threejs procedural materials notes (excerpt), Mirza Beig (excerpt) |

## Kyoto mountains, with numbers

* **Three sides** — Kyoto sits in a basin closed by mountains on three sides: Higashiyama and Mt. Hiei to the east, Kitayama and Mt. Atago to the north, and the western peaks along the Hozu River (Arashiyama, Saga). The basin opens south toward Osaka. Forest covers about 74 % of the city. *Sanshi-suimei* means "purple mountains, clear water" (City of Kyoto — excerpt).
* **Higashiyama 三十六峰** — the "36 peaks" of gentle, undulating slopes, a symbol of the city and the borrowed scenery (*shakkei*) behind Ginkaku-ji, Kiyomizu-dera, Yasaka and Nanzen-ji. Red pine (*akamatsu*) follows the ridge lines with deciduous broadleaf below. Hinoki and *shii* (Castanopsis) grow behind Kiyomizu, with evergreen shii at the foot. The forest is now managed to thin the shii and plant yamazakura and iroha-momiji for scenic beauty (Forestry Agency — excerpt).
* **Kitayama-sugi 北山杉** — cedars grown in Nakagawa, Onogo and Keihoku for the polished alcove pillars of houses (City of Kyoto — excerpt).
* **Tamba-giri 丹波霧** — from autumn to spring a sea of fog fills the Kameoka basin west of Kyoto, thickest at dawn. Cold air settles in the basin overnight, and the Katsura River supplies the moisture (Kameoka City, Kyoto Tourism, Kiri no Kōbō — excerpts).
* **Forest edges** — a forest meets open ground in two belts. The *mantle* community (マント群落), shrubs and climbers such as Rubus, Rosa (noibara), Wisteria, Lonicera and Clematis, stands against the trees. Outside it is the low herbaceous *sode* ("sleeve") community (ソデ群落). The terms come from Tüxen's *Mantelgesellschaft* (1950), translated by Miyawaki (Murakami, Hiroshima Univ.; Yokohama Natl. Univ. — excerpts).
* **Painted depth** — Guo Xi's three distances (*san-en* 三遠): *kō-en* (high distance, looking up from the foot), *shin-en* (deep distance, past the front mountain to the ones behind) and *hei-en* (level distance, out over low hills) (JAANUS — excerpt). In yamato-e, *kasumi* mist bands divide foreground, middle and background. They were soft and indigo in the Heian period. From the 13th century came *suyari-gasumi*, "spear mist" with crisp rounded heads outlined in white or ink. By the Edo period the bands were gold, as in the *Rakuchū rakugai-zu* screens, where gold mist fills Kyoto (JAANUS, Wikipedia ja, Kotobank — excerpts).

## Decisions for the Lab

1. **Ranges as layers.** Each range is a strip mesh generated from a ridge profile (ridged multifractal plus the user's own stroke). Each layer sits at a real distance (150 m–2.5 km) and is shaded by one sun-aware fog with wavelength-dependent extinction. An "explode" slider pulls the layers apart sideways like a multiplane stand.
2. **Draw your own ridge.** The user draws a line on the sky; it becomes a new range layer at the chosen distance, painted with the same rules.
3. **Three distances as camera presets** (kō-en, shin-en, hei-en), plus a dolly that shows parallax.
4. **Kasumi bands** in three styles (Heian soft indigo, suyari crisp, Edo gold), placed between layers.
5. **The forest wall in four tiers** with a live cost readout: real instanced trees, billboard cards, a hemi-octahedral impostor (baked at load from the game's own `buildCanopy`), and a painted leaf-mass silhouette strip. A cross-section shows the edge's mantle and sode belts.
6. **Cloud shadows** from one shared field: projected along the sun onto every range, the same field the sky uses, so Lab 05 can share it.
7. **Kyoto presets**: Higashiyama (gentle, red pine on the ridges), Kitayama (sugi cones), Arashiyama (autumn momiji), and Tamba-giri dawn fog.

## Image references

* Mountains of Kyoto prefecture (incl. Kitayama): <https://commons.wikimedia.org/wiki/Category:Mountains_of_Kyoto_prefecture>
* Higashiyama hillside (ward view): <https://commons.wikimedia.org/wiki/File:Higashiyama_Ward,_Kyoto,_Kyoto_Prefecture,_Japan_-_panoramio_(7).jpg>
* Sagano bamboo forest (foothill / forest-edge texture): <https://commons.wikimedia.org/wiki/Category:Sagano_Bamboo_forest>

## Sources

* Wikipedia — *Aerial perspective* — <https://en.wikipedia.org/wiki/Aerial_perspective> (excerpt)
* James Gurney — *Color and Light* (2010) — via <https://archive.org/> (excerpt)
* James Gurney — *Atmospheric distance and value* — <http://gurneyjourney.blogspot.com/2013/07/atmospheric-distance-and-value.html> (excerpt)
* James Gurney — *Reverse atmospheric perspective* — <http://gurneyjourney.blogspot.com/2007/09/reverse-atmospheric-perspective.html> (excerpt)
* Inigo Quilez — *Fog* — <https://iquilezles.org/articles/fog/> (excerpt)
* MiniMax skills — *Terrain rendering* — <https://github.com/minimax-ai/skills/blob/HEAD/skills/shader-dev/techniques/terrain-rendering.md> (excerpt)
* 80.lv — *Impostor Baker for UE4* (Ryan Brucks) — <https://80.lv/articles/impostor-baker-for-ue4> (excerpt)
* LightBulbBox — *Improved impostor rendering* — <https://lightbulbbox.wordpress.com/2018/05/01/improved-impostor-rendering/> (excerpt)
* Meep engine — *Impostors & LOD* — <https://meep.company-named.com/docs/rendering/impostors/> (excerpt)
* SMPE Journal (1938) — *The Multiplane Camera Crane for Animation Photography* — <https://doi.org/10.5594/j12945> (abstract)
* International Photographer (1938) — *Disney Multiplane Camera* — <https://www.dix-project.net/document/international-photographer_1938-03_disney-multiplane-camera> (excerpt)
* F. K. Musgrave — *Procedural Fractal Terrains* — <https://www.classes.cs.uchicago.edu/archive/2015/fall/23700-1/final-project/MusgraveTerrain00.pdf> (excerpt)
* tosijs-3d — *cloud-shadows* — <https://3d.tosijs.net/cloud-shadows/> (excerpt)
* Mirza Beig — *Unity tutorial: fake cloud shadows* — <https://mirzabeig.substack.com/p/unity-tutorial-fake-cloud-shadows> (excerpt)
* threejs-awesome-graphics skills — *Procedural PBR system: projected cloud shadow* — <https://github.com/scottstts/threejs-awesome-graphics-agent-skills/blob/HEAD/skills/threejs-procedural-materials/references/procedural-pbr-system.md> (excerpt)
* City of Kyoto — *Kyoto at a glance: topography* — <https://www.city.kyoto.lg.jp/tokei/cmsfiles/contents/0000281/281300/1shou.pdf> (excerpt)
* Forestry Agency — *Higashiyama Recreation Forest* — <https://www.rinya.maff.go.jp/e/national_forest/recreation_forest/higashiyama.html> · <https://www.rinya.maff.go.jp/j/kokuyu_rinya/kokumin_mori/katuyo/reku/rekumori/higashiyama.html> (excerpts)
* Kameoka City — *亀岡の霧* — <https://www.city.kameoka.kyoto.jp/site/kankou/3553.html> · Kyoto Tourism — *The Fog Terrace* — <https://www.kyototourism.org/en/sightseeing/492/> · Kiri no Kōbō — *Great Fog of Kameoka* — <https://kirinokobo.com/en/great-fog-of-kameoka/> (excerpts)
* Murakami — *Mantle communities in hilly regions in Japan* — <https://www.jstage.jst.go.jp/article/ecohabitat/7/1/7_KJ00007955379/_pdf/-char/ja> · *日本のマント群落に関する植物社会学的研究* — <http://ir.lib.hiroshima-u.ac.jp/00042313> (excerpts)
* JAANUS — *san-en 三遠* — <https://projects.mcah.columbia.edu/jaanus/record/sanen> (excerpt)
* JAANUS — *kasumi 霞* — <https://projects.mcah.columbia.edu/jaanus/record/kasumi> (excerpt)
* Wikipedia (ja) — *すやり霞* — <https://ja.wikipedia.org/wiki/%E3%81%99%E3%82%84%E3%82%8A%E9%9C%9E> (excerpt)

## Build addendum — what shipped, measured on the page

* `js/profiles.js` — pure profile maths + the game's `terrainSector`/`terrainHeight` port (valley floor flat r<55; near band ~90, mid ~172, far ~310; the pagoda-side `opening` falls away). Kyoto presets: Higashiyama 36 peaks, Kitayama, Atago, Arashiyama, Yamato-e paper, plus `strokeToProfile` (freehand stroke → smoothed silhouette function) and the octahedral `octDir`/`octUV` pair for the impostor atlas.
* `js/ridge.js` — two mountain recipes side by side: `arcFriezeGeometry` (painted friezes wrapped on an arc, the multiplane trick) and `terrainPatch` (displaced heightfield). `gameRangeColors`/`meadowColors` keep the game's tint pipeline — vertex colours are *tints* normalized over detail luminance, not raw dark colours.
* `js/wall.js` — the wall four ways: `instancedWall` (the game's real `buildCanopy` leaf-mass recipe, instanced), `cardWall` (crossed quads on a painted 2×2 atlas), `paintedTreeline` (one matte-painting cylinder), the impostor field, plus `edgeBelts` — the mantle + sode the literature names — and `edgeSlice` for the labelled cross-section.
* `js/impostor.js` — hemisphere atlas bake of the real canopy (octahedral direction map; corner cells fold to the horizon ring and are deliberately unused) + a view-dependent impostor field.
* `js/air.js` — `Air`: shared atmosphere uniforms (`uFogT` per distance band, `uVeilSun`, `uFootMist`, `uTreed`, `uRocky`, `uPaper`, `uSunTint`), `rangeMaterial`, `applyCloudShadow` (idempotent — dedupes per material and extends `customProgramCacheKey` so patched/unpatched foliage programs can't collide).
* `js/kasumi.js` — three mist styles: suyari (horizontal bars), edo (warm-stained bands), rift (drifting sprite ring, the game's `buildMistRing` lite).
* `js/hero.js` — the Valley: terrain patch + wall + edge belts + foothill carpet (the game's `buildFoothillForest` port, 3400 instances, cedars on the high slopes) + three ridge modes (`patch`, `stack` friezes, `paper`) + mist + cloud shadows + `CatWalker` (the real `src/cat.js` through the bridge).

### Poster / hero framing notes (measured)

* The bowl is deep: from inside at cat level the wall ring (r≈40) and the foothill carpet hide the ranges. The money pose is a low camera tilted ~+15° up (`cam=0,9,26,0,60,-160`): sugi slope lower two-thirds, three hazy ridge bands stacked above. That pose is both the default orbit view and the poster (`?poster=1` pins the stage full-viewport).
* `?veil=` multiplies `FogExp2` density and every range material's `uFogT` — the lab wants ~2.2–2.6× the base for the Kyoto-basin read; the game can stay thinner.
* Carpet at the game's own density (3800 → 3400 here) reads as a forested slope once the veil washes it; without aerial perspective it reads as foreground lumps — the veil IS the lesson.
* `?at=<id>` instant-scrolls in shot mode; under headless virtual-time the scrolled regions can rasterize blank — a tall-window capture (`window-size=1400x6400`) is the reliable full-page check.

### Verified

* `node tools/ranges_test.mjs` — 19 invariants (profile continuity/mass order, octDir round-trip inside the diamond, seeded RNG stability, game-port parity, step-state legality).
* `node tools/labs_check.mjs` — all checks OK (syntax, cache tags, registry link, `ranges/poster.png`).
* Headless Chromium (`--use-angle=metal`): no console errors; hero, all five benches, stepper and sources render.

## Second pass — production-technique overhaul (research → what changed)

Isolated captures of each wall technique exposed real failures: cards floated as
green blobs, impostors were a giant blurry band, the painted treeline was black
spikes, and the foothill carpet was uniform noise. A focused research pass on how
games actually ship these produced the fixes below.

### What the industry does (sources this round)

* **Florasynth / SpeedTree crossed billboards** — three upright quads ~60° apart
  carry the *real tree* baked to diffuse + normal; planes fade as the camera goes
  edge-on. Cheap geometry, real silhouette.
* **SpeedTree/Florasynth baking** — bake ambient + depth into the billboard; crown
  interiors go dark, rims stay lit. That value structure is what reads as "tree".
* **Simplygon / Wolfire impostors** — the quad is sized to the *canopy* (height
  and base anchor), never the bounding sphere; views pick by azimuth with
  frame blending; alpha gets dilation so mip levels don't grow dark fringes.
* **Kazuo Oga / Ghibli matte painting** — a treeline is a *designed* mass: a few
  crown silhouettes per rank, three value shapes each (mass / halftone / rim
  light), sparse trunks, sky gaps. Controlled shapes, never scatter brushes.
* **Forest scatter research** — hierarchical stands (parent-seed clumps with
  gaussian falloff), species bands by elevation, clearing masks, feathered edges.
  Kyoto-specific: Kitayama-sugi is planted in *contour rows* — even-aged poles.

### Changes per technique

* `wall.js / cardWall` — now bakes the real canopy texture onto three crossed
  quads per tree (the Florasynth recipe): grounded at the trunk base, per-instance
  azimuth rotation, so the card wall has trunks, crown depth and correct ground
  contact instead of floating blobs.
* `impostor.js` — full rewrite of sizing and bake: quads scale to canopy height
  (was bounding-sphere → ~3× too large → the blurry wall), alpha dilated before
  mips, bake lighting matched to the sun, quads base-anchored to terrain.
* `wall.js / paintedTreeline` — replaced scatter dabs with Oga-style controlled
  crowns: 2 ranks of designed silhouettes, 3 value masses each, rim accents,
  transparent sky gaps (destination-out), sparse trunks. `MeshBasicMaterial`
  (unlit) so the matte painting carries its own light — Lambert was crushing it.
  Bench plane clones the texture with a wide repeat so 4 m crowns don't shrink
  to pickets.
* `wall.js / foothillCarpet` — stand ecology replaces uniform scatter: jittered
  polar stand grid, per-cell either a *plantation stand* (2–3 rough contour rows
  of even poles, the Kitayama signature) or a *natural clump* (gaussian offspring
  around a parent), species bands by elevation (broadleaf crowns low → sugi
  cones high), clearing-noise cells stay empty, belt edges feather out. The
  view corridor *thins* (×0.72) rather than clearing — a bald wedge read as a
  scar, sparse trees read as designed.
* `hero.js` — under the forest belt the terrain tint gets crown-size mottling
  over a stand-size undulation: at distance the gaps between instanced crowns
  read as more canopy, not bald grass. Scene fog decoupled from the range veil
  so near trees keep their green while ridges still wash blue. Carpet budget
  3400→12000 with broad sugi crowns so stands touch into closed canopy.

### What was learned (the repeatable rules)

1. **A billboard is a baked asset, not a quad** — bake lighting, ambient and
   interior shadow into the texture or the cheapness shows.
2. **Impostor scale = canopy scale** — bounding-sphere sizing is the classic
   bug that makes a field of 4 m trees render as a 12 m smear.
3. **Painterly ≠ loose** — the Oga treeline works because every crown is a
   designed silhouette with three value shapes; randomness lives in placement,
   not in the value structure.
4. **Forest reads as floor texture + stands, not trees** — at 150 m the brain
   wants mottled canopy surface with crown bumps, not countable trunks on grass.
   Two noise scales (crown ~3 m, stand ~25 m) on the ground tint do the heavy
   lifting the instances can't.
5. **Clearings must be sized like real gaps** — ~40–60 m lobes read as gullies
   and meadows; 90 m lobes read as missing data.
