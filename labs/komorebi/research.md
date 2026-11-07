# Dappled light & petal drifts (komorebi) research — 2026-11-06

Notes behind `labs/komorebi/` (Lab 22). 3 searches. "Read" = fetched and
summarised; "Excerpt" = only the search-result excerpt was available (claims
from it are limited to what the excerpt said).

What the game does today (`src/countryside.js`): `buildDappledLight()` and
`buildPetalDrifts()` are flagged in the visual plan as folding into the
ground pass. This lab makes the dapples real — moving coins of light that are
*images of the sun*, not just noise — and lets the petals settle into them.

## The word

* **Komorebi 木漏れ日** is 木 (tree) + 漏れ (to leak) + 日 (sunlight):
  literally "sunlight leaking through trees" — dappled light. Its leaf-level
  cousin is **hamorebi 葉洩れ日** ("through the leaves"). It's the classic
  example of an untranslatable Japanese nature word (Wiktionary, TKG,
  Tokyo Weekender — excerpts).

## Why the patches are round

* Each gap between leaves is a **pinhole camera**: it projects an image of
  the sun, so dapples are little overlapping *discs* — and during a partial
  eclipse they turn into crescents. Aristotle already puzzled over it: light
  through wickerwork does not come out square, but round (Alaska Science
  Forum, Ted Bunn, AAS eclipse page — excerpts).
* So the lab rule is: a dapple is not a blob, it's a **soft-edged ellipse**
  with a crisp penumbra and true dark between, and all the ellipses share the
  sun's projection slant.

## Rendering it

* The cheap look: thresholded multi-octave noise for the canopy, swept by
  wind, with a **warm fringe** where the sun blooms around each shadow edge
  (jzhao *procedural dappled light* — excerpt).
* The better look: a **sparse constellation of discrete elliptical
  sun-flecks** — countable patches, never a continuous field — that all sway
  in lockstep with the wind and individually fade out and pinch in two as
  gaps overhead open and close (shader.gallery *dapple* — excerpt).

## Decisions for the Lab

1. **Coins of sun.** A ground pass where each dapple is an image of the sun
   disc — round, soft-edged, slanting with the sun — drawn from the same
   canopy field the trees use, so the light agrees with the leaves above.
2. **Wind sweeps them together.** One wind slider sways the whole
   constellation in lockstep while single flecks blink and pinch as gaps
   close.
3. **Petals into the light.** Sakura petals (the weather lab's) drift down
   through the dapples and settle where the light lands.

## Image references

* Crescent sun-dapples through leaves during an eclipse (Alaska Science Forum photo + explanation): <https://www.gi.alaska.edu/alaska-science-forum/pinhole-natures-lens>
* Dapple shader (live, technique reference): <https://shader.gallery/dapple/>
* Procedural dappled-light experiments: <https://jzhao.xyz/posts/dappled-light>

## Sources

* Wiktionary — *木漏れ日* — <https://en.wiktionary.org/wiki/%E6%9C%A8%E6%BC%8F%E3%82%8C%E6%97%A5> (excerpt)
* TKG dictionary — *木漏れ日* — <https://www.tkgje.jp/entries/07500/07683_komorebi.html> (excerpt)
* Tokyo Weekender — *Komorebi* — <https://www.tokyoweekender.com/art_and_culture/history/japanese-words-we-cant-translate-komorebi/> (excerpt)
* University of Alaska — *The pinhole: nature's lens* — <https://www.gi.alaska.edu/alaska-science-forum/pinhole-natures-lens> (excerpt)
* Ted Bunn — *Pinholes and eclipses* — <https://blog.richmond.edu/physicsbunn/2017/08/05/pinholes-and-eclipses/> (excerpt)
* American Astronomical Society — *Indirect solar viewing: pinhole projection* — <https://eclipse.aas.org/eye-safety/projection> (excerpt)
* shader.gallery — *Dapple* — <https://shader.gallery/dapple/> (excerpt)
* jzhao — *Experiments in procedural dappled light shaders* — <https://jzhao.xyz/posts/dappled-light> (excerpt)