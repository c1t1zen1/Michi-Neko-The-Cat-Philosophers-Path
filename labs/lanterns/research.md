# Lanterns (tōrō, chōchin, street) research — 2026-11-06

Notes behind `labs/lanterns/` (Lab 11). 5 searches. "Read" = fetched and
summarised; "Excerpt" = only the search-result excerpt was available (claims
from it are limited to what the excerpt said).

What the game does today (`src/countryside.js`): `buildToroLantern()` is a
stone pedestal lantern, `createChochinLantern()` a paper lantern on a string,
and `buildLanterns()` scatters street lanterns whose glow pools share a halo
texture and kindle with a per-lantern onset at dusk (`this.lanternHalos`,
`lanternHaloTex`). The grass pass added glowing "lantern fibres" in the glade.
This lab gives each lantern its anatomy, its paper and its light.

## The stone lantern (tōrō), top to bottom

Each part carries one of the five elements — from top: **hōju** (jewel) →
**ukebana** (lotus support) = space/void; **kasa** (umbrella) = wind;
**hibukuro** (fire box) = fire; **chūdai** (platform) = water; **sao** (shaft)
+ **kiso** (base) + **kidan** (slab) = earth (Wikipedia *stone lantern*,
NAJGA, japanobjects — excerpts).

* The **kasa** descends in concave arcs with ridge lines (*kudarimune*)
  ending in bracken-shoot scrolls called **warabide**.
* The **hibukuro** has a light opening (*higuchi*) on each side; openings can
  be plain, or a crescent moon (which a tea master faces **west**) and a full
  moon (faced **east**). The light was an oil-soaked wick screened with paper
  against the wind.
* **Kasuga-dōrō** (named for Kasuga-taisha, Nara) is the tall, thin pedestal
  form: a six- or eight-sided umbrella, a hexagonal fire box carved with
  deer, moon or sun, found near a shrine's second torii.
* **Yukimi-dōrō** ("snow-viewing" / "floating light") is the squat, broad-roof
  lantern on 3–6 curved legs, set at the water's edge — a three-legged one
  with one leg on land and two in the water. The broad roof catches snow and
  throws light across the water. Used in tea gardens; examples at Katsura
  Villa, Sennyū-ji and Daigo-ji Sanbō-in in Kyoto (NAJGA, JAANUS — excerpts).

## The paper lantern (chōchin)

* A chōchin is a **single bamboo spiral** (the *ichijō rasen* "one-strip
  spiral" was devised in Yame in the Edo period) wound around a wooden mould,
  fixed with thread, then covered with dampened washi that tightens smooth as
  it dries. The strip can be ~0.4 mm wide and 4.5 m long, with 12–25 joined to
  make one frame. Outdoor lanterns are oil-coated to waterproof the paper
  (Yame Chōchin, Mikuni/Itoya, japaneselantern.jp — excerpts).
* The glow already has a recipe from the Moon Pool notes: a **hot spot near
  the flame with a short falloff**, warm translucency on the far side of the
  paper, and the ribs darkening the edges — not an evenly-lit shade.

## Decisions for the Lab

1. **Name every part.** A tōrō you can spin and take apart: hōju, ukebana,
   kasa + warabide, hibukuro with its higuchi, chūdai, sao, kiso, kidan.
2. **Two lanterns, two fires.** Kasuga-dōrō (pedestal) vs yukimi-dōrō
   (legged, at the water). Choose the higuchi: plain, crescent west, full
   moon east.
3. **Fold a chōchin.** Wind one spiral of bamboo, paste damp washi that
   tightens as it dries, and light it so the ribs read through the paper.
4. **Flicker that matches the kindling.** A candle-flame flicker whose
   amplitude and stagger match the game's per-lantern dusk onset, plus lichen
   growing up the stone base.

## Image references

* Stone lanterns in Kyoto prefecture (category): <https://commons.wikimedia.org/wiki/Category:Stone_lanterns_in_Kyoto_prefecture>
* Kasuga-taisha stone lanterns: <https://commons.wikimedia.org/wiki/Category:Stone_lanterns_in_Kasuga-taisha>
* Stone lanterns (all): <https://commons.wikimedia.org/wiki/Category:Stone_lanterns>
* Yukimi-dōrō (snow lanterns): <https://commons.wikimedia.org/wiki/Category:Yukimi-d%C5%8Dr%C5%8D>
* Paper lanterns in Japan: <https://commons.wikimedia.org/wiki/Category:Paper_lanterns_in_Japan>

## Sources

* NAJGA — *Japanese garden lanterns* — <https://najga.org/japanese-garden-lanterns/> (excerpt)
* NAJGA — *Yukimi-dōrō* — <https://najga.org/yukimi-doro-japanese-lantern/> (excerpt)
* Wikipedia — *Stone lantern* — <https://en.wikipedia.org/wiki/Stone_lantern> (excerpt)
* japanobjects — *What are tōrō?* — <https://japanobjects.com/features/japanese-lanterns> (excerpt)
* JAANUS — *yukimi dōrō 雪見灯籠* — <https://www.aisf.or.jp/~jaanus/deta/y/yukimidourou.htm> (excerpt)
* Journal of the Japanese Institute of Landscape Architecture — *Typical features of "Kasuga" lanterns* — <https://doi.org/10.5632/jila1934.25.3_28> (excerpt)
* Mikuni / Itoya Chōchin — *Manufacturing process* — <https://itoya-chouchin.jp/en/stories/stories-3/> (excerpt)
* Japanese Lantern Co. — *The chōchin creation process* — <https://japaneselantern.jp/process/> (excerpt)
* Traditional Crafts Aoyama Square — *Yame Chōchin* — <https://kougeihin.jp/en/craft/1417/> (excerpt)
---

# Lab build notes — 2026-11-08

* **Parts.** Hōju, kasa, hibukuro, chūdai, sao and kiso are the common terms, and
  one source notes that any part may be absent except the firebox
  ([Mark Schumacher](https://onmarkproductions.com/html/ishidoro.shtml),
  [Japan Objects](https://japanobjects.com/features/japanese-lanterns),
  [japanesegardens.jp](https://japanesegardens.jp/stone-lanterns-in-the-japanese-garden/); excerpts).
* **Kinds built.** Kasuga (long sao, high hibukuro), Yukimi (short legs, wide kasa,
  round or hexagonal), Oribe (the shaft sunk straight into the ground). Kotoji is
  from general knowledge of Kenroku-en and was not confirmed by these searches.
  Sources differ on dating and naming, and most are garden and antique-dealer sites.
* **Paper.** Reuses the belly-weighted emissive from Lab 07
  (`labs/shared/paperlantern.js`).
* **Light.** The game already rotates four PointLights among the nearest lanterns.
  The lab keeps that idea: four real lights, and the rest are halo sprites.


## Construction review — 2026-11-10

### A hollow firebox and connected legs

Replaced the continuous glowing belt with stone walls cut around real apertures and a small interior light carrier. Both kotoji legs now meet the lamp table; the shorter foot rests on a stone. This specimen uses Kenrokuen as a comparative construction reference, not a claim that its exact form originated in Kyoto.

[Kasuga Taisha stone lanterns, Japan Tourism Agency](https://www.mlit.go.jp/tagengo-db/H30-00885.html) (text read), [Kenrokuen official photograph](https://www.hot-ishikawa.jp/photo/detail_1.html) (photograph inspected).

See the [complete lab review and before/after gallery](../REVIEW_2026-11-10.md).
