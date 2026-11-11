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
---

# Lab build notes — 2026-11-08

* **Pinhole.** Each canopy gap projects an inverted image of the sun, and during a partial eclipse every coin takes the sun's crescent shape; on an ordinary day the overlapping discs blend together ([WHYY](https://whyy.org/articles/see-the-solar-eclipse-using-natures-pinhole-camera-tree-leaves), [The Nature Institute](https://natureinstitute.org/in-context-48/henrike-holdrege/shadows-and-the-sun), [ClickOrlando](https://clickorlando.com/weather/2023/10/20/crescent-shapes-appeared-during-the-partial-solar-eclipse-what-are-they); excerpts).
* **Size.** No source gave the geometry. Image diameter = height × tan(0.53°) is the standard relation, stated from general knowledge. The stage draws coins at 1.7× that true size so they read at this scale, and that factor is in `js/kit.js`.
* **What didn't exist.** Searches found no Three.js pinhole technique. The closest was [Sundial](https://discourse.threejs.org/t/sundial-paged-virtual-sun-shadows-for-three-js-webgpurenderer-mit-on-npm/94912) (virtual shadow maps for WebGPU, excerpt), which gets leaf-shaped dapples from real shadows, and that is a different result: leaf shapes, not sun shapes. The instanced-quad approach here is original to this lab.
* **Petal drifts.** `buildPetalDrifts()` in `src/vegetation.js` returns immediately with a comment saying the circles were removed, and the tile says so.


## Construction review — 2026-11-10

### Sun images on the specimen surface

The coin shader now applies the model matrix, so translated shelf specimens do not bury the light underneath their slab. The shelf demonstration uses fewer, smaller coins and a nearly overhead light direction, keeping the circles and crescents readable. The stage retains the adjustable projection.

This is a rendering-space correction. The pinhole/eclipsed-sun references already listed above remain the physical reference.

See the [complete lab review and before/after gallery](../REVIEW_2026-11-10.md).
