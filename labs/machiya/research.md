# Machiya research — 2026-10-25

Notes behind `labs/machiya/` (Lab 04). 12 searches, building on the façade
vocabulary already gathered for the Roof Road (`docs/ROOFTOPS_RESEARCH_2026-10-24.md`:
kawara, ichimonji eaves, mushiko-mado, inuyarai, battari-shōgi, Shōki, drying
decks, *unagi no nedoko*, tile systems). This pass is about construction: how
a machiya stands up, what its walls are made of, and what weathers.
"Read" = fetched and summarised; "Excerpt" = only the search-result excerpt
was available (claims from it are limited to what the excerpt said).

What the game does today (`src/countryside.js`): about 140 parts per building
from `box()` with world-scaled UVs. `createKawaraRoof()` builds curved slopes
with a tile texture, `createKoushi()` is a row of thin boxes and
`createEngawa()` is a slab on posts. Posts have no bevel and plaster has no
frame, there's no wall base and no gap under the floor, and nothing weathers.

## How a machiya is built

| Part | What it is, with numbers | Where it came from |
|------|------------------------|--------------------|
| *Dentō kōhō* 伝統構法 | Traditional post-and-beam framing (*jiku-gumi*). The posts (*hashira*), beams (*hari*), through-ties (*nuki*) and mud walls absorb an earthquake by their tenacity (*nebari*) instead of resisting it rigidly. Joints are tenon and mortise, with no metal. New buildings of this kind became nearly impossible under the 1950 Building Standards Act | Kyoto City *京町家のいろは* (excerpt), Hachise (excerpt) |
| *Soseki* 礎石 / *ishibadate* 石場建て | One natural stone under each post, with the post simply standing on it, not fastened. Engawa posts traditionally stand on half-buried stones, and the post foot is shaped to fit the stone | Kyoto City (excerpt), Wikipedia *Engawa* (excerpt) |
| Posts and beams | The *daikoku-bashira* (main post) and *ebisu-bashira*; beams called *jimune-bari*, *nobori-bari*, *hitomi-bari*, *gawa-tsunagi*. The standard column section is 4 *sun* (121 mm). Kyoto's seismic guideline targets a storey drift under 1/20 rad, with elements that deform to 1/15 rad | Kyoto City (excerpts), Engel *Measure and Construction of the Japanese House* (excerpt) |
| *Nuki* 貫 | Horizontal members passed *through* the posts; they also carry the wall lath. About 105 mm deep | Kyoto City, Toyoda Sakan (excerpts) |
| *Shinkabe* 真壁 | The posts stay visible on the wall face, and the wall sits between them | Kyoto City (excerpt) |
| *Tsuchikabe* 土壁 | 1. *komai*: split bamboo lath lashed with rope · 2. *arakabe*: rough Fukakusa clay with 10 cm fermented straw (*susa*), pushed through the lath · 3. *uragaeshi*: the back coat · 4. *nuki-buse*: cloth, paper or straw over the nuki, because clay will not stick to wood · 5. *mura-naoshi*: levelling · 6. *nakanuri*: the middle coat, with finer straw · 7. *uwanuri*: the top coat, white *shikkui* or a sandy finish. Thin coats, many passes. Finish colours: *sabikabe* (rust), *benikabe* (soft red), *jurakukabe* (grey) | JAANUS *tsuchikabe*, Toyoda Sakan, tutikabe-net (excerpts) |
| *Kōshi* 格子 | Said to date from after the Ōnin War. You can see out but not in. The pattern tells the trade: *itoya* (thread, with the slat tops cut back to let in light to judge colours), *komeya* / *sakaya* (rice, sake: thick, fixed, cask-proof), *fuya* (wheat gluten), *sumiya* (charcoal), *someya* (dyer), *shimotaya* (residence, thinner slats). *Degōshi* projects past the post line and becomes a shop shelf when removed | Hachise, shizen-ya, kyomachiya.net (excerpts) |
| *Bengara* 紅殻 | Iron-oxide red brought from Bengal around the 16th century, mixed into perilla oil (or water, darkened with pine soot, with *tonoko* as a binder and finished with old tempura oil). It preserves and repels insects. It's meant to look good more than red, and it hides knotty pine. *Kakishibu* (persimmon tannin) darkens with time | kyomachiya.net glossary and workshop (excerpts) |
| Façade | Ground floor: *kyō-gōshi*, the big door (*ōdo*) and an *ichimonji* pent roof (*hisashi*), sometimes with a *battari-shōgi*. Upper floor: *mushiko-mado* set in the mud wall. A *tsushi-nikai* has a low storage loft; full two storeys (*hon-nikai*) came later. Neighbours' eaves overlap to shed rain between houses. Some roofs are *mukuri* (gently convex) so the house looks smaller. Kyoto machiya are defined as built before 1950; about 40,100 remain | nippon.com (excerpt), AIJ façade typology (excerpt), sukiya-japan (excerpt), Hachise (excerpt) |
| *Tōriniwa* 通り庭 | An earth-floored passage from the street to the back. *Miseniwa* in front, under the loft; *hashiri-niwa* / *okuniwa* behind, open to the rafters (*fukinuke*), with a smoke louvre over the *kamado*. The floor is *tataki*: fine gravel, slaked lime and 15 % *nigari* water, tamped to half thickness three times | JAANUS *tōriniwa*, Hachise, kyomachiya.net (excerpts) |
| Kawara | Clay fired above 1,100 °C; uneven colour is natural, and moss grows on shaded, damp tiles. J-type *sangawara* (JIS A5208) size 53A is 305 × 305 mm, works 235 × 265 mm, has a valley ≥ 35 mm and lays ~53 per *tsubo* (3.3 m²). Kawara needs at least a 4-*sun* pitch (4/10, 21.8°); 4.5/10 is the usual recommendation | Ichinose Kawara, CHORD JIS table, Komatsu tiles (excerpts) |
| *Noren* 暖簾 | First used against the cold in the late Heian period, with crests from Muromachi and lettering from early Edo. The standard length is 3 *shaku* by the cloth rule (113 cm). A *han-noren* is about 56 cm; a *mizuhiki* noren is 30–40 cm across the whole frontage. Kansai noren hide the hanging loops in one sewn sleeve (Kyoto's taste for hiding), where Kantō noren show a row of loops | Ichimiya noren notes, Itami Art (excerpts) |
| Engawa, *en-no-shita* | The veranda is usually 1–1.3 m wide. Underneath is the ventilated crawl space, *en-no-shita*, which is "a favourite place for cats and dogs to retreat from the heat of the day". The ground under it slopes away and is often paved, with a drain beyond | Meguri Japan (excerpt), Wikipedia *Engawa* (excerpt) |

## Decisions for the Lab

1. **Raise it, step by step.** A construction timeline slider builds a real machiya:
   1. stones
   2. posts
   3. beams and nuki
   4. komai lath
   5. arakabe
   6. nakanuri
   7. shikkui
   8. kōshi
   9. rafters and eaves
   10. tiles row by row
   11. ridge and Shōki
   12. noren

   Each step names its parts with Callouts in Japanese and English and shows the numbers above.
2. **Exploded view and cutaway**: pull the layers apart, or cut the wall to see lath, clay and plaster.
3. **A kōshi chooser** (itoya, komeya, sakaya, fuya, sumiya, shimotaya) that also shows how much a passer-by can see in.
4. **Weathering** from one slider: rain splash at the wall base, bengara fading, moss on the north tiles, kakishibu darkening.
5. **The cat's gap**: a cat-eye camera that slips under the engawa into the en-no-shita.
6. **Real numbers drive the geometry**: 121 mm posts, 305 mm tiles laid on 235 mm courses, a 4.5/10 roof pitch, 113 cm noren.

## Image references

* Machiya in Kyoto (facades, lattices, alleys, eave details): <https://commons.wikimedia.org/wiki/Category:Machiya_in_Kyoto>
* Pontochō at night (noren, lanterns, narrow eaves): <https://commons.wikimedia.org/wiki/Category:Pontocho_at_night>
* Streets in Gion: <https://commons.wikimedia.org/wiki/Category:Streets_in_Gion,_Kyoto>

## Sources

* City of Kyoto — *京町家のいろは* — <https://kyomachiya.city.kyoto.lg.jp/wp-content/uploads/2022/01/iroha.pdf> (excerpt)
* City of Kyoto — *京町家型標準設計法による耐震設計…指針* — <https://www.city.kyoto.lg.jp/tokei/cmsfiles/contents/0000335/335477/kyomachiyagata171020.pdf> (excerpt)
* Hachise — *京町家事始: 造り* — <https://www.hachise.jp/kyomachiya/tsukuri/tsukuri.html> · *Tsushi-nikai*, *Lattice*, *Tōriniwa* — <https://www.hachise.com/kyomachiya/features/facadeTsushinikai.html> (excerpts)
* JAANUS — *tsuchikabe 土壁* — <https://projects.mcah.columbia.edu/jaanus/record/tsuchikabe> · *tōriniwa 通り庭* — <https://projects.mcah.columbia.edu/jaanus/record/toriniwa> (excerpts)
* Toyoda Yasushi — *竹小舞土壁のつくりかた* — <https://www.t-sakan.com/191009tushikabe-tukurikata-toyoda/> (excerpt)
* tutikabe-net — *土壁のつくりかた: 土を塗る* — <http://www.tutikabe-net.com/how_to/howto_3.html> (excerpt)
* shizen-ya — *Discover Kyo-Machiya style* — <https://shizen-ya.jp/english-architecture-blog/post-27209/> (excerpt)
* kyomachiya.net — *出格子の製作* — <https://www.kyomachiya.net/sakuji/skill/degousi.htm> · *べんがら* — <https://kyomachiya.net/library/yogo/bengara.html> · *棟梁塾 実習4* — <http://www.kyomachiya.net/sakuji/touryu/j04.htm> (excerpts)
* Nippon.com — *Recognizing Design Features in Kyoto's Machiya Townhouses* — <https://www.nippon.com/en/guide-to-japan/gu900011/> (excerpt; read for the Roof Road)
* AIJ — *A study on the preservation… of the Kyo-machiya from the viewpoint of façade typology* — <https://doi.org/10.3130/aijax.450.0_113> (excerpt)
* SUKIYA-japan (Araki Kōmuten) — *Introduction to Kyo-Machiya* — <http://www.sukiya-japan.com/kyo-machiya/index.html> (excerpt)
* Ichinose Kawara — *Tips* — <https://ichinose-kawara.jp/en/tips.html> (excerpt)
* CHORD — *瓦ぶき工法の種類と特性 (JIS A5208 table)* — <https://reference.chord.or.jp/sr/ts/kt/m_kawara.html?koz=1> (excerpt)
* Komatsu roofing tiles — *standard pitch table* — <https://sanadakawara.com/wp-content/uploads/2017/12/komatsu_roofingtiles.pdf> (excerpt)
* Heino Engel — *Measure and Construction of the Japanese House* — <https://www.rexresearch1.com/HouseConstructionLibrary/MeasureConstructionJapaneseHouseEngel.pdf> (excerpt)
* Meguri Japan — *The Japanese house: basic elements* — <https://meguri-japan.com/en/knowledge/20210627_1697/> (excerpt)
* Wikipedia — *Engawa* — <https://en.wikipedia.org/wiki/Engawa> (excerpt)
* Ichimiya — *のれん雑学* — <https://www.the.kyoto.jp/ichi_web-old/chirashi/noren/noren_zatsugaku.pdf> (excerpt)
* Itami Art — *のれんの種類やサイズ* — <https://www.i-noren.com/column/noren_types_sizes> (excerpt)

---

# Machiya research — shading pass (2026-11-06)

A second pass, this time on *how to light and paint* the machiya for the
Ghibli / Kyoto-Animation look the lab targets: a photoreal background with
painterly vibes. 18 searches on top of the façade vocabulary above. "Read" =
fetched and summarised; "Excerpt" = only the search summary was available.

## The target look, stated precisely

Kyoto Animation and the studio's imitators build a *hybrid*: the background
is rendered physically (PBR, real lights, ACES colour), the character is
cel-shaded, and a compositing/grade pass ties them together (ZerodotStudio,
note.com — read). The lab maps this to:

1. **Background (photoreal)** — `MeshStandardMaterial` with the painterly
   256 px procedural textures, an environment map, and ACES filmic tone
   mapping. Nothing is downloaded; the "photorealism" lives in the maps and
   the light rig.
2. **Character (painterly)** — the real `src/cat.js`, lit with a soft rim and
   a gentle toon grade.
3. **The grade** — a *soft* five-band toon ramp (`MeshToonMaterial` with a
   smooth gradient map) so surfaces feel physical but read as paint. This is
   the "hybrid" style in the lab.

## Three.js techniques found and used

| Technique | How it works | Where it came from |
|-----------|-------------|--------------------|
| Cel shading | Quantise `N·L` into bands. `MeshToonMaterial` does it via a 1-D `gradientMap` sampled with `NearestFilter`. Three hard bands = Ghibli banding | three.js *MeshToonMaterial* docs (read); salivity article (excerpt); MasterAllArts s4-09 (excerpt) |
| Soft / painterly bands | The same ramp with *more, closer* steps quantises more finely, so painted textures keep their tones instead of flattening to three | D. J. Morris *Ghibli shader* (read); Matsuyama's original palette `#427062 #33594E #234549 #1E363F` is quoted there |
| Gradient map | `new THREE.DataTexture(new Uint8Array([118,224]), 3, 1, THREE.RedFormat)` with `minFilter=magFilter=NearestFilter`, `needsUpdate` | three.js docs (read), sbcode (excerpt) |
| Inverted-hull outline | A second mesh, back faces only, extruded along normals, painted black. Cheap, GPU-friendly, silhouette-only | Moonjump (read); polyfork (read: "smoothed normals matter — hard edges tear the hull"); MasterAllArts (excerpt) |
| Screen-space edge detect | Sobel over depth + normals for interior lines (post-process). The lab uses inverted hull only — enough at cat-eye distance | buggzeth/three-js-toon-shader (excerpt) |
| Fresnel rim light | `pow(1 - max(dot(N, V), 0), e)` separates the roof from the sky, an anime cue | Moonjump (read) |
| Painterly post | Normal maps distort screen UVs for brush strokes; a canvas/paper texture is multiplied on top; colour variation is layered on | 80.lv *First Love* (read) |
| Instanced building parts | One `InstancedMesh` of half-round tiles per roof, one of koushi slats, instead of N `box()` calls | mysimulator *Procedural buildings* (read); jasonsturges three-low-poly (excerpt) |
| Gable vs hip roof | Two slopes meeting at a ridge (`gabledRoof`) vs a shorter ridge with sloped ends (`hipRoof`) — same vertex layout, different ridge length | mysimulator (read, code) |
| Procedural weathering | A single `SkyscraperGenerator`-style builder: one material shades every zone, world-space weathering on top | three.js *SkyscraperGenerator.d.ts* (excerpt) |

## Facade and roof details, with numbers

* **Namako-kabe** — square black tiles set on the diagonal, joints raised
  with white plaster to a sea-cucumber (namako) profile; behind it a ~30 cm
  earthen wall on komai lath (Shimizu; shimizu-spirit.jp — read).
* **Kawara vocabulary** — *marugawara* (round), *hiragawara* (concave),
  *nokigawara* (eave-end, the lipped round ends), *onigawara* (demon ridge
  tiles), *toribusuma* (bird-shaped ridge caps) (Nihongawara, gov-online —
  read). *Sangawara* is the combined single tile (JIS A5208, 305×305 mm).
* **Roof pitch** — 4.5–5 *sun* in 1 *shaku* (≈ 24–26°) on Nara machiya
  (Nara Machiya guide PDF — read); the game and lab use 4.5/10.
* **Façade typology** — *tsushi-nikai* (low second storey + mushiko-mado,
  popular Edo–Meiji; the low roof stopped fire jumping the street) vs
  *hon-nikai* (full second storey, later) (nippon.com, Japanese Wiki Corpus —
  read).
* **Kōshi patterns** — itoya (thread, slat tops cut back to judge colour),
  komeya (rice), sakaya (sake), fuya (wheat gluten), sumiya (charcoal),
  shimotaya (residence, thinner slats) (Hachise, shizen-ya — excerpt).
* **Noren** — 3 *shaku* (113 cm) standard, *han-noren* ≈ 56 cm, *mizuhiki*
  30–40 cm; Kansai noren hide the hanging loops in one sewn sleeve (Ichimiya,
  Itami Art — excerpt).

## Decisions that changed the lab

1. **One builder, three shaders.** The same `buildMachiya()` produces
   standard (PBR), toon (cel) and hybrid (painterly) by swapping the material
   set, so the variants compare apples to apples.
2. **The cat jumps for real.** The hero copies the game's 7.2 m/s take-off
   and −20 m/s² gravity (1.3 m apex), plus step-up, coyote time and a climb
   mode for the kōshi and mushiko-mado. A route that works here works in the
   valley.
3. **A street, not a house.** Three machiya in a row give roof-to-roof jumps
   and the overlapping-eave rhythm; the en-no-shita under the engawa is the
   cat's hiding spot.
4. **Inverted hull, not a post pass.** Silhouette outlines are enough at
   cat-eye distance, and they cost one extra draw per mesh with no render
   target.

## Image references

* Machiya in Kyoto: <https://commons.wikimedia.org/wiki/Category:Machiya_in_Kyoto>
* Pontochō at night: <https://commons.wikimedia.org/wiki/Category:Pontocho_at_night>
* Streets in Gion: <https://commons.wikimedia.org/wiki/Category:Streets_in_Gion,_Kyoto>
* Nara Machiya illustrated guide (PDF): <http://naramachi-nigiwainoie.jp/english/wp-content/uploads/2018/11/machiya_guide_english.pdf>

## Sources added this pass

* three.js — *MeshToonMaterial* — <https://threejs.org/docs/pages/MeshToonMaterial.html> (read)
* Daniel John Morris — *Ghibli-style shaders in Three.js* — <https://danieljohnmorris.com/writing/ghibli-shader-parallax-scene/> (read)
* Moonjump — *Toon shading / cel shading: how it works* — <https://moonjump.com/game-dev-mechanics-toon-shading-cel-shading-how-it-works/> (read)
* polyfork — *Three.js shaders: toon, outline* — <https://polyfork.dev/threejs-shaders> (read)
* MasterAllArts — *Stylized & NPR (toon, outlines, hatching, painterly)* — <https://masterallarts.com/learn/threejs-from-zero/s4-09-stylized-npr/> (excerpt)
* ZerodotStudio — *Anime-style characters & realistic backgrounds with shaders* — <https://note.com/zerodot/n/n42a3aecab98f?hl=en> (read)
* 80.lv — *First Love: 3D environment with Japanese aesthetics* — <https://80.lv/articles/transforming-first-love-into-3d-environment-with-japanese-aesthetics> (read)
* mysimulator — *Procedural buildings in Three.js* — <https://www.mysimulator.uk/content/tutorials/procedural-building-threejs-tutorial.html> (read, code)
* jasonsturges — *three-low-poly* — <https://github.com/jasonsturges/three-low-poly/> (excerpt)
* three.js — *SkyscraperGenerator* (procedural city) — <https://cdn.jsdelivr.net/npm/@types/three@0.185.4/examples/jsm/generators/city/SkyscraperGenerator.d.ts> (excerpt)
* Nihongawara — *Preserving and passing on tradition* (Govt of Japan) — <https://www.gov-online.go.jp/hlj/en/march_2026/march_2026-08.html> (read)
* Blue Vagabond — *Kawara roof building workshop* — <https://blue-vagabond.com/2019/05/10/kawara-japanese-roof-building-workshop/> (read)
* Shimizu — *Visiting a residence with namako-kabe walls* — <https://www.shimizu-spirit.jp/post/02-01-namakokabe> (read)
* Japanese Wiki Corpus — *Kyo-machiya* — <https://www.japanesewiki.com/building/Kyo-machiya.html> (read)
* Nippon.com — *Recognizing design features in Kyoto's machiya townhouses* — <https://www.nippon.com/en/articles/-/16823> (read)
* buggzeth — *three-js-toon-shader* (post-process outlines) — <https://github.com/buggzeth/three-js-toon-shader> (excerpt)
* salivity — *Three.js cel shading with MeshToonMaterial* — <https://salivity.github.io/three.js/article/three-js-cel-shading-with-mesh-toon-material> (excerpt)
* sbcode — *MeshToonMaterial tutorial* — <https://sbcode.net/threejs/meshtoonmaterial/> (excerpt)
