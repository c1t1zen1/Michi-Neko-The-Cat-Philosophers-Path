# Koi, birds & butterflies research — 2026-11-06

Notes behind `labs/critters/` (Lab 18). 5 searches. "Read" = fetched and
summarised; "Excerpt" = only the search-result excerpt was available (claims
from it are limited to what the excerpt said).

What the game does today (`src/ambient_life.js`): koi drift in the river, birds
cross the sky, butterflies visit the valley. This lab gives them real
behaviour and readable patterns: koi that school, birds that flap in
silhouette, butterflies that actually settle on a flower.

## Koi

* The **Gosanke** are the three show classics: **Kōhaku** (white with red
  *hi*), **Sanke** / Taishō Sanshoku (white, red *hi*, small black *sumi*
  spots), and **Shōwa** / Shōwa Sanshoku (black-based, large *sumi* over the
  head, red *hi*). The crisp edge between red and white is called *kiwa*;
  Kōhaku patterns have names like *inazuma* (lightning), *nidan* and *sandan*
  (two- and three-step) (ZNA Northwest, Exclusive Koi — excerpts).
* **Asagi** is the older type: a blue netted scale pattern with orange on the
  cheeks and at the **base of the pectoral fins** (*motoaka*). **Hirenaga**
  ("butterfly" koi) have long, flowing fins and tail (Kodama Koi Farm,
  Exclusive Koi — excerpts).
* A school is a **boids** system: each fish steers by **separation**,
  **alignment** and **cohesion** against only its nearby neighbours (a
  distance + angle neighbourhood). The flock splits naturally around
  obstacles and keeps constant density (Reynolds *Boids*, SIGGRAPH education,
  ALife — excerpts).

## Birds

* Birds work the same way in the air (boids), but in a game they can be cheap
  **silhouettes**: dark flapping cards that read as birds against the sky
  without a single feather. A few frames of wing-up/wing-down on two crossed
  cards is the whole bird.

## Butterflies

* Butterfly flight is **slow, fluttery and low-frequency**: wingbeat averages
  ~11 Hz, stroke amplitude ~103°, forward speed a little over 1 m/s, body
  near horizontal. Slower, more deliberate fliers tend to be the toxic
  (warning-coloured) species (~9 Hz vs ~10.5 Hz) (JEB biomechanics,
  ButterFlySet — excerpts).
* Kyoto's common butterflies are swallowtails (*ageha*): the Asian
  swallowtail (*nami-ageha*, Papilio xuthus) and the bluebottle (*ao-suji-
  ageha*) that visit flowers and lay eggs on citrus (Commons Papilionidae,
  butterfly photos — excerpts).

## Decisions for the Lab

1. **Koi that school.** A boids pool with three Gosanke patterns (kōhaku,
   sanke, shōwa) plus one asagi, whose red sits at the pectoral-fin base.
   Click to drop food and the school turns and gathers.
2. **Birds as silhouettes.** Two crossed cards, two wing poses, a slow flap —
   the flock reads at any distance.
3. **Butterflies that land.** A fluttery ~10 Hz wingbeat in the air, a
   settle-and-fold on a wildflower card (the grass lab's wildflowers), then a
   take-off.

## Image references

* Koi category: <https://commons.wikimedia.org/wiki/Category:Koi>
* Koi ponds: <https://commons.wikimedia.org/wiki/Category:Koi_ponds>
* Butterflies of Japan: <https://commons.wikimedia.org/wiki/Category:Lepidoptera_of_Japan>
* Swallowtails (Papilionidae): <https://commons.wikimedia.org/wiki/Category:Papilionidae>
* Asian swallowtail (*nami-ageha*, photo): <https://commons.wikimedia.org/wiki/File:Papilio_xuthus_1024px.jpg>

## Sources

* ZNA Northwest — *Koi identification* — <https://nwkg.org/koi-identification/> (excerpt)
* Exclusive Koi — *Koi varieties* — <https://exclusivekoisa.co.za/koi-varieties/> (excerpt)
* Kodama Koi Farm — *Types of koi* — <https://www.kodamakoifarm.com/koi-varieties/> (excerpt)
* Craig Reynolds — *Boids* — <https://www.red3d.com/cwr/boids/index.html> (excerpt)
* SIGGRAPH education — *Flocks, herds and schools* — <https://education.siggraph.org/static/HyperGraph/animation/art_life/flocks.htm> (excerpt)
* ALife — *Boids* — <https://alife.org/encyclopedia/software-platforms/boids/> (excerpt)
* Journal of Experimental Biology — *Biomechanics of flight in butterflies* — <https://doi.org/10.1242/jeb.150.1.37> (abstract/excerpt)
* ButterFlySet — *2D dataset for flying-butterfly pose* — <https://homepages.inf.ed.ac.uk/rbf/VAIB24PAPERS/vaib24ka.pdf> (excerpt)
* 蝶の飛翔 (butterfly flight photos) — <https://butterflyandsky.sunnyday.jp/seitai/flying.html> (excerpt)
---

# Lab build notes — 2026-11-08

* **Koi.** Shōwa is a black koi with red and white, its sumi wrapping to the belly, and Sanke is a white koi with red and black above the lateral line ([Pond Informer](https://pondinformer.com/showa-koi-guide/), [Pond Trade](https://www.pondtrademag.com/five-tips-identifying-sanke-showa-koi/), excerpts). The lab's hides follow those rules.
* **Swimming.** A [React Three Fiber fish project](https://github.com/RAPHCRAP/Boid_Fish) (excerpt) uses per-vertex sine displacement rather than skeletons for scale, and the lab does the same with a per-instance speed and phase.
* **Flocking.** CPU boids are fine to about 500, past which O(n²) is the bottleneck. A [reef demo](https://kody-w.github.io/learnwithkody/examples/coral-reef/) claims 500 with a spatial hash, and GPU notes suggest 64² float textures for 4,096 ([GPU flocking](https://sites.google.com/site/gpuplayground/home/gpu-flocking)) (excerpts). The pond's 34 koi use a plain neighbour sweep.
* **Birds and butterflies.** Searches did not return a body-wave reference for koi or a flutter model for butterflies, so the flight here is hand-tuned sine and pause timing.
