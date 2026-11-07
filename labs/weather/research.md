# Particles (petals, rain, snow, motes) research — 2026-11-06

Notes behind `labs/weather/` (Lab 20). 4 searches. "Read" = fetched and
summarised; "Excerpt" = only the search-result excerpt was available (claims
from it are limited to what the excerpt said).

What the game does today (`src/particles.js`): petals, rain, snow, motes and
god rays exist as particle systems; `src/countryside.js` has dawn mist and
rain-ripple pools. This lab makes each one land somewhere real — petals in the
trail grass, snow on roofs and grass tips, rain splashing on stone and water —
and lets the motes ride the god rays.

## The words

* **Hanafubuki / sakura-fubuki** 桜吹雪 is the "flower snowstorm": petals
  falling thickly right after full bloom, whirled up again by the wind. It
  sits beside *hanakumori* (cloudy blossom weather) and *ame no sakura*
  (gentle rain on the blossoms) in a language with more than 70 words for
  cherry blossoms (zoomingjapan, TKG dictionary, Time Out — excerpts).

## Where the cover lands

* **Snow settles on up-facing surfaces.** The cheap rule is "a pixel is snowy
  when its world normal points up", with a soft threshold and a snowline that
  fades. Company of Heroes 2 added the two fixes that make it look real: a
  **top-down "snow shadow" map** so only the *topmost* surfaces get snow (not
  the ground under a roof), and a **virtual extrusion** that thins the snow
  toward surface edges first (CoH2 talk, Knights of Unity — excerpts).
* The generic version is **surface accumulation**: pick a direction (world up
  for snow, tilted for moss), and blend a cover colour on faces that face it,
  with a coverage amount, an edge softness, edge noise and a normal-flatten
  that smooths the bump under the cover. No texture, just arithmetic (ZLZ env
  shader — excerpt).

## The light

* Dust motes are the **Tyndall effect**: colloidal particles — dust, smoke,
  fog droplets, mostly under 10–100 µm so they float — scatter the beam and
  make the shaft visible; they jitter in **Brownian motion** (OpenStax,
  Tyndall's 1870 note, physics.stackexchange — excerpts). God rays and motes
  are the same phenomenon at two scales: the shaft is the light, the motes
  are the particles making it visible.

## Decisions for the Lab

1. **One "landing" rule for all weather.** Snow, petals and dust share a
   surface-accumulation shader (direction + coverage + edge noise + normal
   flatten): snow settles on roofs and grass tips, petals collect in the
   trail grass and hollows, dust gathers on top edges.
2. **Rain that touches things.** Splash rings on stone (the ground lab's
   puddles) and on the river (the water lab's rings), darkening wet bands
   under the eaves.
3. **Motes that belong to the light.** Motes are born inside a god-ray
   shaft, drift in Brownian jitter, and vanish when the beam dies.

## Image references

* Fallen sakura petals category: <https://commons.wikimedia.org/wiki/Category:Fallen_sakura_petals>
* Sakura after the rain (photo): <https://commons.wikimedia.org/wiki/File:Sakura_After_The_Rain_(206709015).jpeg>
* Hanafubuki (photos + video): <https://zoomingjapan.com/nature/hanafubuki/>

## Sources

* zoomingjapan — *Hanafubuki: a cherry blossom blizzard* — <https://zoomingjapan.com/nature/hanafubuki/> (excerpt)
* TKG dictionary — *桜吹雪* — <https://www.tkgje.jp/entries/13000/13137_sakurafubuki.html> (excerpt)
* Time Out Tokyo — *Japan has more than 70 words for cherry blossoms* — <https://www.timeout.com/tokyo/things-to-do/japan-has-more-than-70-words-for-cherry-blossoms> (excerpt)
* Company of Heroes 2 — *Rendering tech: procedural snow* — <https://www.gamedevs.org/uploads/company-of-heroes-2-rendering-tech.pdf> (excerpt)
* Knights of Unity — *Fast screen-space snow accumulation* — <https://theknightsofu.com/make-it-snow-fast-screen-space-snow-shader/> (excerpt)
* ZLZ Studio — *Surface accumulation env shader* — <https://zlz-studio.github.io/env/shader/snow-accumulation/> (excerpt)
* OpenStax Chemistry — *Colloids and the Tyndall effect* — <https://openstax.org/books/chemistry/pages/11-5-colloids> (excerpt)
* J. Tyndall — *On floating matter and beams of light* (1870) — <https://doi.org/10.1038/001499a0> (excerpt)
* physics.stackexchange — *Specks in light through a window* — <https://physics.stackexchange.com/questions/875075/why-is-there-specs-coming-from-the-light-shining-through-my-window> (excerpt)