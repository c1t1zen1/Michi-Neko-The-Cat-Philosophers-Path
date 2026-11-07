# Fences & the corral (takegaki) research — 2026-11-06

Notes behind `labs/fences/` (Lab 12). 5 searches. "Read" = fetched and
summarised; "Excerpt" = only the search-result excerpt was available (claims
from it are limited to what the excerpt said).

What the game does today (`src/countryside.js`): `buildBambooFence()` and
`buildBambooCorral()` are bamboo posts and rails with rope lashing around a
turtle corral. The bamboo is plain green tubes; there are no nodes, no
sheath scars, no real lashings and no weathering.

## The vocabulary

| Fence | What it is | From |
|-------|-----------|------|
| **Yotsume-gaki** 四目垣 | The simplest lattice: green, long-jointed bamboo run vertical and horizontal, tied where they cross with black twine (*kai nasa* hessian, or *shūro-nawa* black palm rope over thin copper wire). The name means "four eyes" — the lozenge the lattice makes. Rarely above 1 m, posts 1–8 m apart; it partitions a tea garden's *roji* without blocking the view | NAJGA, JAANUS, JGS, Ketchell (excerpts) |
| **Teppō-gaki** 鉄砲垣 | "Rifle-barrel" fence: thicker round bamboo set upright in rows, alternating front and back of the horizontal *oshibuchi* rails; set close it becomes a solid screen, set open it stays a fence | JGS, Ketchell, NAJGA (excerpts) |
| **Kenninji-gaki** 建仁寺垣 | Vertical slats of split *madake* (Phyllostachys bambusoides), held by 5–6 horizontal tiers and crowned with three slit bamboo slats; first made at Kennin-ji | NAJGA (excerpt) |
| **Kōetsu-gaki** 光悦寺垣 | See-through diamond lattice of split madake bound with black twine, capped by a gently curving *tamabuchi* top bar of tightly-lashed thin slats, 1–2 m tall | NAJGA (excerpt) |
| **Daimyō-gaki** 大名垣 | A knee-high *nozura-ishigumi* (field-stone) wall topped with vertically sheathed, sheared bamboo — a Kyoto style | NAJGA (excerpt) |
| **Katsuragaki** 桂垣 | Split slats with alternating widths of bamboo wattle, named for Katsura Imperial Villa | NAJGA (excerpt) |
| **Ajiro-gaki / Ōtsu-gaki** | Woven: verticals are woven between horizontal supports, split or whole | Ketchell (excerpt) |

* **Build rules that carry over**: cut the top of a culm just *above a node*
  so it can't collect water; choose culms so nodes sit aesthetically; drive
  the nail until snug, never crushing the culm; wire first, then cover the
  tie with the black palm rope (NAJGA — excerpts). The knot shown for fences
  is the *otoko-musubi* ("man's knot").

## Bamboo anatomy (what the tubes are missing)

* A culm is a segmented grass stem: a raised **supra-nodal ridge** above and a
  **sheath scar** (nodal ring) below each **node**, with the smooth
  **internode** between. The sheath is a modified leaf that covers the young
  shoot; when it drops it leaves the scar. Internodes can carry a white
  waxy bloom and colour stripes (bamboo-identification.co.uk, Lewis Bamboo,
  Bamboo Info — excerpts).
* Cut bamboo ages from green to a silvery **tan** as it dries; the lashings
  stay black. That green→tan fade is the fence's "years" dial for the lab.

## Decisions for the Lab

1. **Tie the knot.** A yotsume-gaki builder: place verticals and horizontals,
   and a lashing that actually wraps and knots (otoko-musubi) at each
   crossing, with the black palm rope over copper wire.
2. **Fence chooser** across yotsume, teppō, kenninji and kōetsu, each drawn
   from its real rules (node placement, crown, tamabuchi curve).
3. **Weather it.** One slider ages the culms green → tan and adds a little
   lean and wear; another adds moss at the base.
4. **The corral** reads as the same vocabulary — thicker teppō-style posts
   making a pen — so the turtle's fence and the tea-house fence share one
   system.

## Image references

* Bamboo fences category: <https://commons.wikimedia.org/wiki/Category:Bamboo_fences>
* Yotsume-gaki build sequence (NAJGA, photos from Otsuka Bamboo, Kyoto): <https://najga.org/yotsume-fence/>
* Katsura Imperial Villa bamboo fencing (Texas History): <https://texashistory.unt.edu/ark:/67531/metapth1699594>
* Bamboo fence stagecraft (Kennin-ji, Ginkaku-ji, Shisendō): <https://jgs.org.uk/2025/05/07/the-stagecraft-of-the-bamboo-fence/>

## Sources

* NAJGA — *Yotsume fence* — <https://najga.org/yotsume-fence/> (excerpt)
* NAJGA — *Japanese gardens: boundaries and gates* — <https://najga.org/japanese-gardens-boundaries-and-gates/> (excerpt)
* JAANUS — *yotsumegaki 四目垣* — <https://projects.mcah.columbia.edu/jaanus/record/yotsumegaki> (excerpt)
* Japanese Garden Society — *The stagecraft of the bamboo fence* — <https://jgs.org.uk/2025/05/07/the-stagecraft-of-the-bamboo-fence/> (excerpt)
* Robert Ketchell — *Fences in Japanese gardens* — <http://robertketchell.blogspot.com/2014/04/fences.html> (excerpt)
* Bamboo Identification — *Culms* — <http://bamboo-identification.co.uk/html/culms.html> (excerpt)
* Lewis Bamboo — *Bamboo anatomy* — <https://lewisbamboo.com/pages/bamboo-anatomy> (excerpt)
* Bamboo Info — *Bamboo morphology* — <https://www.bambooinfo.in/species/bamboo-morphology.asp> (excerpt)