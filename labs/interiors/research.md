# Interiors research — 2026-11-06

Notes behind `labs/interiors/` (Lab 21). 4 searches. "Read" = fetched and
summarised; "Excerpt" = only the search-result excerpt was available (claims
from it are limited to what the excerpt said).

What the game does today (`src/interior.js`): an `InteriorManager` handles a
few interior pockets (the tea-ceremony room among them) with tatami, shoji and
props. This lab gives each surface its construction — the weave, the light,
the alcove — and a few things a cat can knock over.

## Tatami, layer by layer

* A tatami has three parts: the **doko** (core — traditionally sewn rice
  straw, a ~40 cm stack compressed to ~5 cm), the **omote** (a weft-faced
  weave of *igusa* rush on a hemp or cotton warp; a fine mat has ~5,000–6,000
  rush strands), and the **heri** (the brocade border on the long edges).
  Kyoto's size is **Kyōma: 191 × 95.5 cm, 5.5 cm thick** (Motoyama Tatami,
  Wikipedia, Embassies of Japan — excerpts).
* Layout is a solved art: an **auspicious** tiling never lets four mat
  corners meet at one point (the "tatami tiling" rule) (Ruskey et al. —
  excerpt).

## Light through shoji

* Shoji is a **kumiko** lattice (interlocking, interwoven laths) pasted with
  washi that is **tensioned by spraying it with water**. The paper diffuses
  and roughly **halves** the sunlight, so a room glows softly and you see
  only silhouettes from outside. *Kōzo*-fibre paper blocks blue light more,
  so it reads warmer than pulp paper (Wikipedia, eshoji, ICRESS shoji study —
  excerpts).
* The lattice is structural: interwoven half-joints carry the panel, and the
  taut paper strengthens it further. Shoji block wind but let air and sound
  through (Wikipedia — excerpt).

## The tokonoma

* The alcove holds a **kakemono** hanging scroll and an **ikebana**
  arrangement, changed with the season. The guest of honour sits at the
  **kamiza**, the seat closest to the tokonoma (furthest from the door), and
  nobody steps inside the alcove. At a tea gathering the scroll sets the
  theme, and guests bow to the calligrapher through it (Wikipedia *tokonoma*,
  Society for Japanese Art, Asian Art Museum — excerpts).

## Decisions for the Lab

1. **Weave the floor.** A tatami that shows its doko → omote → heri stack,
   with the igusa warp and weft visible up close and an auspicious
   no-four-corners layout the user can re-arrange.
2. **Light the shoji.** A sliding panel whose washi diffuses a warm ~50 % —
   with silhouettes cast on the paper and the kumiko lattice darkening the
   grid.
3. **A tokonoma to knock over.** A scroll and an ikebana on the raised floor,
   with props (a chawan tea bowl, a vase, an incense box) that the cat can
   bat off — because "what can a cat knock over" is the point.

## Image references

* Traditional rooms of Japan (washitsu: tatami + shoji + tokonoma): <https://commons.wikimedia.org/wiki/Category:Traditional_rooms_of_Japan>
* Tokonoma category: <https://commons.wikimedia.org/wiki/Category:Tokonoma>
* Shōji category: <https://commons.wikimedia.org/wiki/Category:Sh%C5%8Dji>

## Sources

* Motoyama Tatami — *Structure of tatami* — <https://kyo-tatami.com/world/about/structure/> (excerpt)
* Wikipedia — *Tatami* — <https://en.wikipedia.org/wiki/Tatami> (excerpt)
* Embassies of Japan — *Tatami mats: sizes, use and etiquette* — <https://www.embjapan.org/tatami/> (excerpt)
* Ruskey et al. — *Auspicious tatami mat arrangements* — <https://www.cs.uvic.ca/~ruskey/Publications/Tatami/TatamiMonomerDimer.pdf> (excerpt)
* Wikipedia — *Shoji* — <https://en.wikipedia.org/wiki/Shoji> (excerpt)
* eshoji — *Shoji, shoji paper, rice paper* — <https://www.eshoji.com/faq/shoji-shoji-paper-rice-paper-everything-you-need-to-know/> (excerpt)
* ICRESS — *Properties and application potential of shoji screens* — <https://doi.org/10.54254/2755-2721/2025.gl22979> (excerpt)
* Wikipedia — *Tokonoma* — <https://en.wikipedia.org/wiki/Tokonoma> (excerpt)
* Society for Japanese Art — *Uki-pedia: hanging scrolls* — <https://www.societyforjapaneseart.org/news/uki-pedia-hanging-scrolls> (excerpt)
* Asian Art Museum — *Teahouse alcove (tokonoma)* — <https://education.asianart.org/resources/teahouse-alcove-tokonoma/> (excerpt)