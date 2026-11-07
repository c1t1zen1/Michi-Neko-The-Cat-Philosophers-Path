# Rocks & boulders research — 2026-11-06

Notes behind `labs/rocks/` (Lab 13). 4 searches. "Read" = fetched and
summarised; "Excerpt" = only the search-result excerpt was available (claims
from it are limited to what the excerpt said).

What the game does today (`src/countryside.js`): `buildPathBoulders()` scatters
dodecahedron rocks beside the path (two size tiers, stone/stoneDark mats, a
few with colliders). `buildKeyHidingRock()` is a bigger dodecahedron with two
companion stones hiding the secret key. They read as faceted primitives, not
weathered boulders — no flats-and-blunt-edges silhouette, no moss, no ground
contact.

## How stones are placed (ishigumi)

* The Sakuteiki (11th c.) calls garden-making **"the art of setting stones"**
  (*ishi wo taten koto*); stone is the garden's skeleton (Seattle Japanese
  Garden, Ketchell, Foundation for Landscape Studies — excerpts).
* **Rules that survive**: bury one-third to two-thirds of each stone, with
  the widest point at ground level; orient it as it lay in nature; compose on
  **scalene triangles**; group in odd numbers (3, 5, 7); set the largest
  upright stone first, then the rest in proportion to it; keep it asymmetric
  (Seattle Japanese Garden, Ketchell — excerpts).

## Where the moss goes

* Moss is a non-vascular bryophyte that drinks straight from the air, so it
  grows in shade and damp. In the northern hemisphere the **north side** of a
  rock or tree is shadier and moister, so moss favours it — but it also
  colonises any shaded crevice, drips and the damp ground contact (UCSB
  Science Line, Woodland Trust, A Moment of Science — excerpts).

## Making a boulder out of nothing

* The shape that reads as rock is **a sphere cut by a handful of random
  planes** — flat faces meeting at blunt edges — with low-frequency noise
  pushing the surface in and out. Pure noise alone gives a "potato". Stretch
  and squash it so no two share a silhouette, then sink the base below y = 0
  (tosijs *procedural-rock*, vault80 SKILL, three.js forum 100k rocks —
  excerpts).
* A richer recipe: anisotropic scale → large FBM for the silhouette, tighter
  FBM for medium forms, **ridged noise for cracks** (`pow(ridged, 4)`
  subtracted) and grain → 5–8 planar cuts (3 for a pebble) → soft-squash the
  underside → vertex normals → a **cavity** term (concave crevices darken)
  (vault80 SKILL — excerpt).
* The three.js forum thread is the optimisation playbook: marching-cubes
  shapes, per-fragment normal perturbation only up close, icosahedron → box
  impostors as LOD, precomputed instance matrices, and a static shadow map
  that re-renders only when the camera moves (discourse.threejs.org 100k
  procedural rocks — excerpt).

## Decisions for the Lab

1. **Carve a rock.** A seed → sphere → planar cuts → ridged cracks → squash →
   cavity AO, with the silhouette, medium and grain FBM as separate toggleable
   layers.
2. **Sit it right.** Show the 1/3–2/3 burial and the widest-point-at-ground
   rule, with a grass skirt and a contact shadow that ground it.
3. **Grow the moss.** Moss takes the north side and the shaded crevices,
   reusing the ground lab's moss; a "years" slider moves it up the face.
4. **The key-hiding rock** stays a hiding place, but becomes a believable
   cluster: one upright stone flanked by two smaller, in the odd-number,
   scalene-triangle way.

## Image references

* Stones in the Seattle Japanese Garden (photos + Sakuteiki rules): <https://www.seattlejapanesegarden.org/blog/2019/9/19/stones-in-the-seattle-japanese-garden>
* Ketchell on ishigumi (rock-arranging): <http://robertketchell.blogspot.com/2013/05/notes-on-ishigumi-or-art-of-arranging.html>
* 100k procedural rocks (live demo + optimisation notes): <https://discourse.threejs.org/t/100k-procedural-rocks-brutally-optimized/89578>
* Procedural rock generator (docs + option table): <https://3d.tosijs.net/procedural-rock/>

## Sources

* Seattle Japanese Garden — *The power of stone* — <https://www.seattlejapanesegarden.org/blog/2019/9/19/stones-in-the-seattle-japanese-garden> (excerpt)
* Robert Ketchell — *Notes on ishigumi* — <http://robertketchell.blogspot.com/2013/05/notes-on-ishigumi-or-art-of-arranging.html> (excerpt)
* Foundation for Landscape Studies — *Sitelines* — <https://www.foundationforlandscapestudies.org/pdf/sitelines_fall08.pdf> (excerpt)
* UCSB Science Line — *Moss on the north side* — <http://scienceline.ucsb.edu/getkey.php?key=629> (excerpt)
* Woodland Trust — *What side of the tree does moss grow on?* — <https://www.woodlandtrust.org.uk/blog/moss-and-trees/> (excerpt)
* A Moment of Science — *Mossy north side* — <https://www.ipm.org/show/amomentofscience/2019-09-18/mossy-north-side> (excerpt)
* tosijs-3d — *procedural-rock* — <https://3d.tosijs.net/procedural-rock/> (excerpt)
* vault80 — *Procedural rock SKILL* — <https://vault80.com/blog/demos/procedural-rock/SKILL.md> (excerpt)
* Three.js forum — *100k procedural rocks, brutally optimized* — <https://discourse.threejs.org/t/100k-procedural-rocks-brutally-optimized/89578> (excerpt)