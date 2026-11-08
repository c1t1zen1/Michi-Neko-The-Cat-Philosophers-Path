# Climb crates & street clutter research — 2026-11-06

Notes behind `labs/alley/` (Lab 16). 5 searches. "Read" = fetched and
summarised; "Excerpt" = only the search-result excerpt was available (claims
from it are limited to what the excerpt said).

What the game does today (`src/countryside.js`): `createClimbCrates()` stacks
plain wooden boxes as a climb route; `buildVillageStreet()` dresses the street
with a few props. This lab fills the alley at cat height with the things a
Kyoto back lane actually holds, and makes the crates read as real wooden
crates.

## What a Kyoto alley holds

* Kyoto's alleys divide into **roji** (dead-end lanes) and **zushi**
  (pass-through lanes). The everyday view is laundry drying in the wind,
  **bicycles parked against the houses**, noren and painted **kanban**
  signboards, potted plants, and the V-shaped wedge of sky between the roofs
  (On the Trip — excerpt).
* At cat height the recurring objects are: crates and stacked wooden boxes,
  potted plants and a tsukubai basin, a bicycle, a rain barrel or watering
  can, sake barrels, a broom, a folded noren, and a signboard leaning by the
  door (Kyoto alley photos — cizucu, Commons machiya/Gion categories).

## The objects, with their craft

* **Sake barrels (taru)** are Yoshino-cedar staves held by hoops (*taga*).
  Breweries hang a **sugidama / sakabayashi** — a cedar ball of trimmed
  needles, ~40 cm (up to 70–80 cm) across — under the eaves; it starts green
  and slowly browns as the new sake matures, so it doubles as a clock and a
  signboard. Sake's patron shrine is Ōmiwa, whose sacred tree is the cedar
  (Hakushika, Sake Museum, Nada-ken glossary — excerpts).
* **Wooden crates** are rigid frames with planks nailed to corner posts
  (planks ≥ 6 mm), with gaps between planks for ventilation, built to last
  many trips (FAO packaging guide — excerpt).
* **The oke (bucket / small barrel)** is the *yui-mono* craft: split staves
  bound by bamboo or metal hoops, sealed when the wood swells with water —
  which is why a rain barrel never quite dries out at the seams (Kōtō ward
  traditional crafts — excerpt).

## Decisions for the Lab

1. **A kit of alley props.** Crates (with real nailed-corner and plank
   construction), sake barrels with a sugidama that greens and browns with
   the season, a bicycle, a rain barrel, a broom, potted plants, a kanban and
   a noren.
2. **Stack and climb.** Draggable crates and barrels snap into climb routes
   the cat can actually take (the game's platforms), so "clutter" and
   "climbing" become the same system.
3. **Lived-in disorder.** A subtle lean, a crate turned on its side, a barrel
   lid askew — the asymmetry the rest of the labs keep as a guardrail.

## Image references

* Machiya in Kyoto (category, incl. alleys and storefronts): <https://commons.wikimedia.org/wiki/Category:Machiya_in_Kyoto>
* Pontochō at night (narrow alley, noren, lanterns): <https://commons.wikimedia.org/wiki/Category:Pontocho_at_night>
* Gion Alley at Night: <https://commons.wikimedia.org/wiki/Category:Machiya_in_Kyoto>
* Sake barrels + sugidama outside a brewery: <https://commons.wikimedia.org/wiki/Category:Harada_Sake_Brewery>
* Meiji Shrine sake-barrel wall (stacked *komodaru*): <https://commons.wikimedia.org/wiki/Category:Sake_Barrel_Offerings_at_Meiji_Shrine>
* Kyoto alley storefront with bicycles (photo): <https://www.cizucu.com/en/photos/bxS1RLh2Q9CCesR6LBJ4>

## Sources

* On the Trip — *Kyoto alleys: roji and zushi* — <https://on-the-trip.net/indices/2115?locale=en> (excerpt)
* Hakushika — *Sake and sugi* — <https://www.hakushika.co.jp/en/culture/sakeandsugi.html> (excerpt)
* Hakushika Sake Museum — *Sakabayashi heralds the new sake season* — <https://sake-museum.jp/en/saketalk/1155/> (excerpt)
* Hakushika Sake Museum — *Containers for sake: wooden casks* — <https://sake-museum.jp/en/saketalk/951/> (excerpt)
* Nada-ken — *Sakabayashi / sugidama glossary* — <https://www.nada-ken.com/main/en/index_s/516.html> (excerpt)
* FAO — *Packaging for fruits and vegetables: wooden crates* — <https://www.fao.org/4/x5016e/X5016E04.htm> (excerpt)
* Kōtō ward — *伝統工芸 桶* — <https://www.city.koto.lg.jp/103020/bunkasports/bunka/documents/r03-07-oke3-pdf.pdf> (excerpt)
---

# Lab build notes — 2026-11-08

* **Roji.** In Kyoto a *roji* is often a cul-de-sac, and the local pronunciation
  differs ([Kyoto tourism](https://kyoto.travel/en/travel-inspiration/a-row-of-traditional-wooden-tenement-houses-that-support-young-artists-and-what-the-scenes-of-everyday-life-here-convey-to-visitors-kyoto-tourism-today/), excerpt).
* **Detail.** A 3D artist's interview on back alleys makes the case that dense,
  layered detail is what makes a place feel inhabited
  ([Yokogao](https://www.yokogaomag.com/editorial/tokyo-back-alleys-michael-yoshimura), excerpt).
  The lab is built around that idea.
* **Light.** [Ajiki Alley](https://kyoto.travel/en/see-and-do/Ajiki_Alley.html) keeps warm-white bulbs to preserve the look of Kyoto's alleys at night (excerpt).
* **Gaps.** Searches did not reach Kyoto Animation or Ghibli production material,
  or Kyoto-specific sources for the prop list. The props come from general knowledge of Japanese backstreets and are not attributed to a source.
