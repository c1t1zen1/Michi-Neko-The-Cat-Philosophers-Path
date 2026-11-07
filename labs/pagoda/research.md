# Distant pagoda (gojū-no-tō) research — 2026-11-06

Notes behind `labs/pagoda/` (Lab 08). 6 searches. "Read" = fetched and
summarised; "Excerpt" = only the search-result excerpt was available (claims
from it are limited to what the excerpt said).

What the game does today (`src/countryside.js`): `buildDistantPagoda()` stacks
five box bodies (widths 4.55 → 2.68 m), framed by vermilion posts, with
four-sided cone roofs, dark eave edges with upturned corners, and a sōrin of
eight metal discs plus a jewel and tip. It reads as a pagoda at distance but
misses the bracket clusters, the correct sōrin order and the true eave
proportions. It sits at r≈62 beyond the boundary, a landmark against the sky.

## Why a pagoda looks the way it does

* A pagoda is a Japanese descendant of the Indian **stupa**, a reliquary for
  the Buddha's ashes: a stone stupa topped by a sōrin, combined with Chinese
  multi-storey tower building (JAABE timber-tower study — excerpt).
* **Deep eaves are the whole point.** The square area that covers the eaves
  of a storey leaves the main body at less than 1/4 of it; the rest is the
  eave projection (*noki-no-de*), cantilevered out by stacked bracket arms
  (*hijiki*), blocks (*masu*) and rafters (*taruki*) — the *kumimono* system
  (JAABE — excerpt).

## Numbers to build from

| Measure | Value | From |
|---|---|---|
| Hōryū-ji pagoda (711, oldest) | 32.55 m total; storeys 1–4 are 5.45 m square, storey 5 is 3.64 m | IITK earthquake study (excerpt) |
| Height : first-storey width | **5.1** | IITK |
| Top : first storey width | **0.51** | IITK |
| Eave : body width per storey | **2.2** (storey 1) → **3.0** (storey 5) | IITK |
| Sōrin : total height | **1 : 3.4** | IITK |
| Tō-ji (Kyōō-gokoku-ji) | 54.8 m, tallest wooden tower in Japan, rebuilt 1644, first floor 9.48 m wide | Discover Kyoto, World History, NJCU (excerpts) |
| Yasaka pagoda (Hōkan-ji) | 46 m, rebuilt 1440, third-highest wooden building in Kyoto, *honkawara-buki* roof | Kyoto Travel, japan365days (excerpts) |

* The **shinbashira** is a central pole, often three trunks joined end to end,
  fixed into the ground; it carries the sōrin and is what makes the tower sway
  through earthquakes instead of breaking. The storeys are separate frames
  with no column tying them together, joined only by kumimono joints and no
  nails (Discover Kyoto, IITK, TōjiMap — excerpts).

## The sōrin (finial), top to bottom

**hōju** (jewel) → **ryūsha** (dragon wheel) → **suien** (water flame) →
**fūtaku** (wind bells) → **kurin** (nine rings; can be seven or eight despite
the name) → **ukebana** (upturned lotus, usually eight petals) → **fukubachi**
(inverted bowl) → **roban** (the base the whole finial rests on) (rachelstull
*sōrin* — excerpt). The sōrin is 1/3 to 1/4 of the total height and is the
main source of the tower's upward thrust.

## Decisions for the Lab

1. **The squint test.** A distance slider walks the pagoda from 5 m to 2 km.
   Near: full kumimono, rafters and sōrin parts. Far: it collapses to a
   five-roof silhouette with the correct 2.2 → 3.0 eave taper and a sōrin
   that still reads as 1/3 of the height.
2. **Build the sōrin correctly.** The eight rings become the full chain —
   hōju, ryūsha, suien, fūtaku, nine kurin, ukebana, fukubachi, roban — with
   labels.
3. **Bracket clusters as a silhouette.** Masu + hijiki stepped out in a few
   tiers, just enough to read at distance without geometry cost.
4. **Three presets**: Tō-ji (54.8 m), Yasaka (46 m), Hōryū-ji (32.55 m) —
   each drawn with its real proportions.

## Image references

* Tō-ji pagoda (photo): <https://commons.wikimedia.org/wiki/File:Toji-temple-kyoto.jpg>
* Tō-ji remote views (distant/skyline): <https://commons.wikimedia.org/wiki/Category:Remote_views_of_the_Five-storied_Pagoda,_Toji>
* Tō-ji from the lotus pond: <https://commons.wikimedia.org/wiki/Category:Views_of_the_Five-storied_Pagoda,_Toji_from_the_Lotus_Pond>
* Yasaka pagoda category: <https://commons.wikimedia.org/wiki/Category:Yasaka_no_T%C5%8D>
* Yasaka pagoda from Yasaka-dōri (street view): <https://commons.wikimedia.org/wiki/File:Yasaka-dori_early_morning_with_street_lanterns_and_the_Tower_of_Yasaka_(Hokan-ji_Temple),_Kyoto,_Japan.jpg>
* Yasaka pagoda from Yumemi-zaka: <https://commons.wikimedia.org/wiki/Category:Views_of_Yasaka_no_T%C5%8D_from_Yumemi-zaka>
* Tō-ji pagoda at World History Encyclopedia: <https://www.worldhistory.org/image/7897/kyotos-five-story-pagoda-at-toji-temple/>

## Sources

* IITK (WCEE) — *Earthquake response of ancient five-story pagoda of Hōryū-ji* — <https://www.iitk.ac.in/nicee/wcee/article/1229.pdf> (excerpt)
* JAABE — *Structural mechanism and morphology of timber towers in Japan* — <https://www.jstage.jst.go.jp/article/jaabe/1/2/1_2_2_25/_pdf/-char/en> (excerpt)
* Rachel Stull — *Sōrin* — <https://racheldstull.github.io/j301-honors-contract/sorin.html> (excerpt)
* Discover Kyoto — *Tō-ji* — <https://www.discoverkyoto.com/places-go/toji/> (excerpt)
* World History Encyclopedia — *Kyoto's five-story pagoda at Tō-ji* — <https://www.worldhistory.org/image/7897/kyotos-five-story-pagoda-at-toji-temple/> (excerpt)
* NJCU — *Structural characters of five-story pagoda* — <https://www.njcu.edu/sites/default/files/docs/2020-06/Structural-Characters-FiveStoryPagoda.pdf> (excerpt)
* Kyoto Travel — *Hōkan-ji (Yasaka Pagoda)* — <https://kyoto.travel/en/destinations/hokanji-templeyasaka-pagoda/> (excerpt)
* japan365days — *Yasaka Pagoda* — <https://www.japan365days.com/kyoto_yasaka_pagoda.php> (excerpt)
* TōjiMap — *Architecture of the pagoda* — <https://tojimap.jp/en/contents/content02-2/> (excerpt)