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
