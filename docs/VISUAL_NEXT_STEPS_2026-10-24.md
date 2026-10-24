# What to research and rebuild next — 2026-10-24

The grass is done: every Grass Lab recipe now grows in the valley and on the
summit (`src/grass.js`, laid out by a biome mask painted from the real
colliders, paths and water). The cat (2026-10-22) and the trees (2026-10-23)
had the same treatment earlier. This list ranks everything else in the game
by how much a grass-style deep dive would improve it.

**How each item was ranked**

| Reason | What it means |
|---|---|
| **Screen share** | How much of a typical frame it fills. Ground, water, sky and the forest wall are in nearly every shot. |
| **Cat-eye distance** | The camera sits low and close to the ground. Anything seen from 1–3 m shows its box edges and flat textures. |
| **Landmark** | A place where players stop, sit and take screenshots. |
| **Repeats** | Built many times over, so one fix lands everywhere. |
| **Light carrier** | Drives the time-of-day and weather look: glow, reflection, wetness. |
| **Life** | Moves, and makes the world feel inhabited. |

For each item: research (10–15 sources) → a lab page with variants, like
`grass/` → a review sheet in `tools/` → the game. Keep the guardrails:
painterly 256 px procedural textures, no heavy downloads, deepen Kyoto
before growing the map.

---

## Tier 1 — biggest visual return

1. **Ground, path and shoulders** (`buildGround`, `buildPath`, `buildPathShoulders`, `buildWalkwaySlabs`) — *screen share, cat-eye distance*
   Lush grass leaves the remaining bare ground (paths, clearings, under
   eaves) as the flattest surface on screen. Research terrain splat blending
   (height-based blending between earth, gravel, moss and cobble),
   worn-edge decals, puddles that come and go with the rain, and
   per-stone cobble geometry near the cat. Reuse the grass biome mask as the
   splat map so ground and grass agree.
2. **River, bridge and paddies** (`buildRiverAndBridge`, `createRiverWaterMaterial`, `buildPaddies`, `createPaddyWaterMaterial`) — *screen share, light carrier*
   A large reflective surface in the middle of the valley. Research flow-map
   normals, depth-tinted shallows, wet dark banks, foam where water meets
   rocks, lantern and moon reflections, and stepping stones. The bridge deck
   needs plank, rail and post detail, because the cat crosses it at eye
   level.
3. **The forest wall and mountains** (`buildEdgeForest`, `buildFoothillForest`, `buildEdgeUndergrowth`, `buildMountains`, `buildMistRing`) — *screen share*
   The backdrop of every outdoor shot. Research layered impostor cards,
   aerial perspective per range, slow cloud shadows crossing the slopes,
   and painted ridge lines in the style of Ghibli background art.
4. **Machiya buildings** (`buildMachiyaTeaHouse`, `buildMachiyaResidence`, `buildSecretMachiya`, `buildVillageHouse`, `createKawaraRoof`, `createKoushi`, `createEngawa`) — *landmark, cat-eye distance, repeats*
   `countryside.js` still builds about 140 parts from `box()`. Research
   Kyoto machiya construction: bevelled posts and beams, plaster panels
   inside timber frames, skirt walls (already an open item), kawara tile
   rows with ridge caps, rafter ends under the eaves, noren curtains,
   weathering at the wall base, and the hollow gap under the engawa that a
   cat would hide in. The village houses repeat, so the gain multiplies.
5. **Sky, clouds and cloud shadows** (`sky.js` `buildClouds`/`buildDome`, `postfx.js`) — *screen share, light carrier*
   Research cheap volumetric-looking clouds (layered noise sprites or
   raymarched 2D slabs), cloud shadows projected on the terrain, and
   god-ray timing. Cloud shadows passing over the new grass would be the
   cheapest big win on this list.

## Tier 2 — landmarks where players stop

6. **Torii, sandō and shrine (Hongu)** (`buildTorii`, `buildShrine`, `buildMistAltar`, `buildOfferingBells`) — *landmark*
   Research the curve of the kasagi lintel, nuki joinery, shimenawa rope and
   shide paper, a raked-gravel sandō between the new mown lawns, a
   chōzuya wash basin, and komainu guardians (new props).
7. **Moon Pool and Lantern Glade** (`hidden_places.js`) — *landmark, light carrier*
   The grass is in place: moss banks and glowing lantern fibres. The water
   and the glade lanterns are next: a moon reflection with ripple
   distortion, lily pads, mist pooling at night, and lantern paper glowing
   through bamboo.
8. **Distant pagoda** (`buildDistantPagoda`) — *landmark, screen share*
   Seen against the sky from the whole valley. Research the five-storey
   roof profile, bracket clusters (as silhouette only) and the sōrin
   spire.
9. **Summit vista and gate** (`mountaintop.js`: `buildKyotoCity`, `buildKyotoPagoda`, `buildSummitBay`, `buildHarbourAndIslands`, `buildHorizonRanges`, the torii and steps) — *landmark*
   The reward view. Research how to layer a city at distance (instanced
   roof grids, night window lights, haze between layers) and the stone of
   mountain steps. Owned by the summit effort, so coordinate first.
10. **The cat's nest on the tea house roof** (`buildBirdNest`) — *landmark*
    A goal the player climbs to. Woven twig geometry and a soft blanket.

## Tier 3 — props the cat walks past (cat-eye scale, repeated)

11. **Lanterns**: tōrō stone lanterns, chōchin paper lanterns, street lanterns (`buildToroLantern`, `createChochinLantern`, `buildLanterns`) — *repeats, light carrier*. Research paper ribbing, light falling off through the paper, lichen on stone, and a flicker that matches the lanterns' staggered kindling.
12. **Fences and the corral** (`buildBambooFence`, `buildBambooCorral`) — *cat-eye distance, repeats*. Research bamboo nodes, rope lashing (an open item for the tea house and residence) and a little lean and wear.
13. **Rocks and boulders** (`buildPathBoulders`, `buildKeyHidingRock`, summit boulders) — *cat-eye distance*. Research SDF-sculpted rocks with moss caps (the moss shader is ready), contact shadows and grass skirts.
14. **Water-garden props**: shishi-odoshi, the furin wind chime, offering bells (`buildShishiOdoshi`, `buildWindChime`) — *landmark, life*. Research small animation and sound sync (the bamboo tip, the glass catching light).
15. **Bushes, street greenery and bamboo groves** (`buildStreetBushes`, `buildStreetGreenery`, `buildBambooGrove`) — *repeats*. Bring them up to the hero-tree leaf sprays, and add culm nodes and sheath scars to the bamboo.
16. **Climb crates and street clutter** (`createClimbCrates`, `buildVillageStreet`) — *cat-eye distance*. Research what a Kyoto alley really holds: potted plants, rain barrels, bicycles, sake barrels, wooden signboards.
17. **Collectibles**: yarn balls, the secret key (`buildYarn`, `buildSecretKey`) — *life*. They need to read clearly against the much busier grass. Research fibre shading for the yarn and a soft glint for the key.

## Tier 4 — life, effects, interiors

18. **Koi, birds, butterflies** (`ambient_life.js`) — *life*. Koi fins and spot patterns, birds that flap in silhouette, butterflies that settle on the new wildflower cards.
19. **Villager cats** (`npc.js`) — *life*. The coats were rebuilt; next comes eye shine at dusk and idle grooming. Villagers already part the grass.
20. **Particles** (`particles.js`: petals, rain, snow, motes, god rays) — *light carrier*. Rain splashes on stone and water, snow settling on roofs and grass tips, petals that collect in the trail grass.
21. **Interiors** (`interior.js`) — *landmark (indoors)*. Tatami weave, light through shoji, a tokonoma alcove, and the props the cat can knock over.
22. **Dappled light and petal drifts** (`buildDappledLight`, `buildPetalDrifts`) — *light carrier*. Fold these into the ground pass from item 1.

---

### Already at the new standard

The cat (sculpted SDF, coats, gait), hero and rim trees (leaf sprays, leaf
masses), and the grass, flowers, susuki and moss.
