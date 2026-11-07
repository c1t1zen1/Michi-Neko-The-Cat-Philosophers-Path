# Bushes, street greenery & bamboo research — 2026-11-06

Notes behind `labs/greenery/` (Lab 15). 3 searches. "Read" = fetched and
summarised; "Excerpt" = only the search-result excerpt was available (claims
from it are limited to what the excerpt said).

What the game does today: `buildStreetBushes()` and `buildStreetGreenery()`
(`src/countryside.js`) put clipped bushes and plants along the village street;
`buildBambooGrove()` (`src/vegetation.js`) makes the grove the valley border
hides. They are simpler than the hero trees (no leaf sprays, no culm nodes).

## The bamboo grove

* Arashiyama's **Chikurin-no-Komichi** ("bamboo forest path") is the reference:
  a ~400 m path between *moso* bamboo (Phyllostachys edulis) that reaches ~20 m,
  with sunlight filtering through the canopy and dappling the floor. When the
  wind blows, the stalks knock together with a low hollow sound the government
  listed among the **"100 Soundscapes of Japan"** (JNTO, Highlighting Japan,
  japansophy — excerpts).
* At the Arashiyama **Hanatōro** the grove is lit at night — the model for the
  valley's bamboo grove with lanterns strung inside (Commons Hanatōro
  category).
* The culm detail to carry over from the fence notes: a raised **supra-nodal
  ridge** and a **sheath scar** at every node, with the smooth internode
  between, plus a pale waxy bloom that fades as the culm ages.

## What grows in a machiya front garden (senzai / zensai)

* The small front garden favours slow-growing evergreens (pine, *maki*
  Podocarpus, *mokkoku*, oak), long-flowering trees (crape myrtle, camellia
  *tsubaki*, sasanqua *sazanka*), perennial flowers and a small maple by the
  engawa, with a *tsukubai* low basin, a tōrō and stepping stones (Sakujigumi
  glossary — excerpt).
* The **tsubo-niwa** ("pot-garden", about 3.3 m² or two tatami) is the tiny
  courtyard seen-but-not-entered: a stone lantern, a *chōzubachi* basin,
  stepping stones, and shiny dark-green shade plants — ferns, grasses, bamboo —
  that thrive in the cool, damp shadow between buildings (Wikipedia
  *tsubo-niwa*, NAJGA courtyard garden — excerpts).

## Decisions for the Lab

1. **A bamboo culm you can read up close**: node, supra-nodal ridge, sheath
   scar, internode bloom — the same culm vocabulary the fence lab uses, so the
   grove and the fences agree.
2. **Street greenery as a palette**: clipped *maki* balls, sasanqua and
   camellia shrubs, crape myrtle, a small maple and a potted front-garden,
   each brought up to the hero tree's leaf-spray standard.
3. **The grove with light in it**: dappled light between the culms by day
   (this shares the komorebi lab's field), and lanterns strung through it at
   night, Arashiyama Hanatōro style.

## Image references

* Sagano bamboo forest (Arashiyama) category: <https://commons.wikimedia.org/wiki/Category:Sagano_Bamboo_forest>
* Sagano bamboo forest lit for Arashiyama Hanatōro: <https://commons.wikimedia.org/wiki/Category:Sagano_Bamboo_Forest_during_Arashiyama_Hanat%C5%8Dro>

## Sources

* Japan National Tourism Organization — *Arashiyama bamboo grove* — <https://www.japan.travel/en/spot/1141/> (excerpt)
* Highlighting Japan — *Two paths through the bamboo in Sagano* — <https://www.gov-online.go.jp/eng/publicity/book/hlj/html/202208/202208_02_en.html> (excerpt)
* japansophy — *Is the Arashiyama bamboo forest worth it?* — <https://www.japansophy.com/post/arashiyama-bamboo-forest-kyoto-japan> (excerpt)
* Sakujigumi (京町家作事組) — *せんざい【前栽】* — <https://sakujigumi.com/sakujiwiki/senzai> (excerpt)
* Wikipedia — *Tsubo-niwa* — <https://en.wikipedia.org/wiki/Tsubo-niwa> (excerpt)
* NAJGA — *The courtyard garden* — <https://najga.org/courtyard-garden/> (excerpt)