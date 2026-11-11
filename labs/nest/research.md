# The cat's nest research — 2026-11-06

Notes behind `labs/nest/` (Lab 10). 4 searches. "Read" = fetched and
summarised; "Excerpt" = only the search-result excerpt was available (claims
from it are limited to what the excerpt said).

What the game does today (`src/countryside.js`): `buildBirdNest()` is a torus
bowl with a shallow cylinder base in `MAT.nestTwig`, three speckled blue eggs,
and a golden "Guardian's Feather" trophy, sitting at (0.15, 4.9, 2.72) on the
tea-house roof. It's a climb goal, not a living object — the twigs don't
interlace, there's no lining and no blanket, and the cat cannot knead.

## How a cup nest is actually built

* A cup nest is built **from the inside out**: the bird presses dead grass
  and twigs into a cup shape with the wrist of one wing, starting from a
  platform of the **strongest twigs at the base**, binding with mud, then
  lining with finer material — rootlets, moss, hair, feathers, spider silk
  (Cornell *American Robin*, Schlitz Audubon — excerpts).
* The **lining does the insulating**: a 6–10 cm feather-and-hair lining
  supplies ~90 % of a chaffinch nest's insulation; the same thickness of
  grassy lining in a blackbird's nest gives only ~40 % (Discover Wildlife —
  excerpt).
* Cup nests run roughly 8–20 cm across, take 2–6 days, and sit in a fork or
  on a ledge under cover; robins happily nest on eaves, gutters and light
  fixtures (Schlitz Audubon, Cornell — excerpts).
* **Weaving** nests (weavers, red-winged blackbirds) actually knot, loop and
  hitch fibres; a mud wall is plastered over and finer grass woven inside
  (Schlitz Audubon — excerpt).

## Why the cat kneads

* Kneading is pressing each forepaw in turn into a soft surface, "walking in
  place", usually with purring. Kittens knead the mother's belly to stimulate
  milk and release oxytocin; adults keep the behaviour through **neoteny**
  (retaining juvenile traits), and it reads as "I'm happy / you're my
  person". Paw pads carry scent glands, so it also marks the spot (Cats
  Protection, The Conversation, Scientific American — excerpts).
* Some cats knead *and suck* soft woollen blankets, as if from a teat — the
  exact loop for a nest with a soft blanket (Commons *Cat kneading and
  sucking blanket*, Scientific American — excerpt).

## Decisions for the Lab

1. **Weave the nest one twig at a time.** A timeline drops twigs that settle
   into a cup: strongest at the base, tips interlacing outward, a mud layer,
   then a soft lining.
2. **A blanket the cat can knead.** A cloth patch that deforms under the
   forepaws with the real cat's alternating press (the paws are already
   exposed by the shared CatWalker), plus a little purr.
3. **The climb.** The nest stays a reachable goal on the tea-house roof,
   with the golden feather as the reward — but now the twigs read as woven,
   the eggs speckle, and the blanket invites Michi in.

## Image references

* Bird nests category (cups, weavers, eggs): <https://commons.wikimedia.org/wiki/Category:Bird_nests>
* Cat kneading and sucking a blanket (photo): <https://commons.wikimedia.org/wiki/File:Cat_kneading_and_sucking_blanket_2.jpg>
* Kneading cats category (incl. a kneading GIF): <https://commons.wikimedia.org/wiki/Category:Kneading_cats>

## Sources

* Cornell Lab of Ornithology — *American Robin life history* — <https://www.allaboutbirds.org/guide/American_Robin/lifehistory> (excerpt)
* Schlitz Audubon — *A diversity of bird nests* — <https://www.schlitzaudubon.org/2024/04/29/a-diversity-of-bird-nests/> (excerpt)
* Discover Wildlife — *A guide to bird nests* — <https://www.discoverwildlife.com/animal-facts/birds/bird-nests-guide> (excerpt)
* Cats Protection — *Why do cats knead?* — <https://www.cats.org.uk/cats-blog/why-do-cats-knead> (excerpt)
* The Conversation — *Why do cats knead?* — <https://theconversation.com/why-do-cats-knead-192743> (excerpt)
* Scientific American — *Why do cats knead like they're making biscuits?* — <https://www.scientificamerican.com/article/why-do-cats-knead-like-theyre-making-biscuits/> (excerpt)

---

### Summit vista & gate (item 9) — owned elsewhere

The summit clearing (天上, `src/mountaintop.js`: `buildKyotoCity`,
`buildKyotoPagoda`, `buildSummitBay`, `buildHarbourAndIslands`,
`buildHorizonRanges`, the torii and steps) is owned by a separate effort and
is **not researched here**; coordinate with them before a lab. The
`docs/VISUAL_NEXT_STEPS_2026-10-24.md` list keeps it in the queue so the
hub doesn't drop it.
---

# Lab build notes — 2026-11-08

* **Materials by position.** Cup nests use coarser sticks at the base and finer material higher up, and birds press out the cup with wings and beak before lining it ([Birdfact](https://birdfact.com/articles/how-do-birds-build-nests), excerpt). A bullfinch study tested whether materials serve different functions by position ([PeerJ 2017](https://doaj.org/article/1dbad2e2bd7a41b5978ded14b3edb7ef), excerpt).
* **Gaps.** Sources gave no twig counts or angles, so the stage's 70, 180 and 90 twigs are chosen by eye, and no Three.js nest source was found.
* **Scale.** The game's nest is sized for eggs on a roof. The lab's is about 1.2 m across so Michi can curl up inside it.


## Construction review — 2026-11-10

### Support the roof section

The backdrop roof now sits on a sloping timber/plaster house section. The portal capture uses the existing built=1 state so it shows the finished nest, rather than the empty starting stone. The nest remains a fictional oversized reward, not an identification of a Kyoto bird species.

[Kyoto City machiya guide](https://plus.kyoto.travel/entry/kyomachiya) (text read); existing nest research remains the biological reference.

See the [complete lab review and before/after gallery](../REVIEW_2026-11-10.md).
