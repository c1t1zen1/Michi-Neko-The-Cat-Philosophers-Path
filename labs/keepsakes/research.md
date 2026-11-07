# Collectibles (yarn & the secret key) research — 2026-11-06

Notes behind `labs/keepsakes/` (Lab 17). 3 searches. "Read" = fetched and
summarised; "Excerpt" = only the search-result excerpt was available (claims
from it are limited to what the excerpt said).

What the game does today (`src/countryside.js`): `buildYarn()` is a glowing
pink `MeshStandardMaterial` ball; `buildSecretKey()` is an antique golden key
in the field by the hiding rock. Both are single flat-coloured primitives —
no fibre on the yarn, no glint on the key — so they can vanish into the
much-busier new grass.

## Making the yarn fuzzy

* The standard real-time fur/yarn trick is **shell texturing** (Lengyel 2001,
  the NVIDIA "Wolfman" method): extrude concentric shells along the surface
  normal, and texture each shell with a slice of a fur cross-section that
  tapers and fades with height, so the shells read as strands. It's the same
  idea the grass lab already used for its "shell" grass recipe (NVIDIA
  *FurShellsAndFins*, Gamelogic, Pseudopode — excerpts).
* Cheaper still are **cards**: quads of fuzz sticking out of the ball with an
  alpha fringe; the accumulation of overlapping cards reads as a halo of
  strands.

## A believable Edo key

* The **warded lock** reached Japan from Dutch and Portuguese sources; the bit
  carries notches that clear obstructions inside the lock. Edo-period
  storehouse (*kura*) keys were large — 20–30 cm of iron with a wooden handle
  — and could require three things at once: the right **length**, the right
  **kobu** (knob) to clear a ward, and the right **tip** to catch the latch
  (Locksystem key-story, ALSOK key-story — excerpts).
* Regional *wajō* locks (Awa, Tosa, Inaba, Aki) were made by swordsmiths who
  turned to locks after the wars, and are prized for their fine iron surface
  (*tetsu-hada*) and flower-worked cases (Locksystem — excerpt). The game's
  key is gold rather than iron, but it should carry the **bit + shaft + bow**
  silhouette and the idea of a warded notch.

## Reading against the grass

* A collectible needs a **soft glint**, not a constant glow. The recipe is a
  procedural sparkle: give each surface point a random direction, and light
  it only where that direction meets the view — plus a Fresnel rim and a slow
  sweep so it winks rather than shouts (Daniel Ilett *glitter*, Tim Chism
  *coin shimmer*, Godot *item highlighter* — excerpts).

## Decisions for the Lab

1. **A yarn ball that is actually yarn.** A fuzz shell or fringe cards around
   the ball, in a few pinks, with a trailing loose end that can snag — and
   which the cat can bat across the grass.
2. **An antique key with a history.** Bit, shaft and bow with a warded notch
   and a soft glint that catches the sun as it spins, so it reads against the
   grass without glowing.
3. **One "picking things up" feel.** Both share a gentle pickup sound, a
   glint, and the same rule: a collectible should be *discoverable* by a
   wink of light, not a beacon.

## Image references

* Meiji Shrine sake-barrel wall (for the key's warm metal/organic palette, not required): <https://commons.wikimedia.org/wiki/Category:Sake_Barrel_Offerings_at_Meiji_Shrine>
* Fur shells & fins (NVIDIA, technique reference): <https://developer.download.nvidia.com/SDK/10/direct3d/Source/Fur/doc/FurShellsAndFins.pdf>
* Shell texturing walkthrough (Gamelogic): <https://gamelogic.co.za/exploring-shell-texturing-a-shader-technique-for-fur-effects/>

## Sources

* NVIDIA — *Fur: shells and fins* — <https://developer.download.nvidia.com/SDK/10/direct3d/Source/Fur/doc/FurShellsAndFins.pdf> (excerpt)
* Gamelogic — *Exploring shell texturing* — <https://gamelogic.co.za/exploring-shell-texturing-a-shader-technique-for-fur-effects/> (excerpt)
* Pseudopode — *UnityFurShells* — <https://github.com/Pseudopode/UnityFurShells> (excerpt)
* Locksystem — *鍵・錠ものがたり 第5話: 和錠の発展* — <https://locksystem.co.jp/news/column-kagijyoumonogatari_5/> (excerpt)
* ALSOK — *鍵ものがたり Vol.4 江戸時代のオートロック 蔵の鍵* — <https://www.alsok.co.jp/person/keystory/04/> (excerpt)
* Daniel Ilett — *Glitter effect in Unity Shader Graph* — <https://danielilett.com/2021-11-06-tut5-19-glitter/> (excerpt)
* Tim Chism — *Coin shimmer* — <https://www.timchism.com/coin-shimmer.html> (excerpt)
* Godot Shaders — *Item highlighter* — <https://godotshaders.com/shader/collectable-item-shining-highlight/> (excerpt)