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
