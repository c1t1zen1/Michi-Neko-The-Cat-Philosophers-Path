# Summit vista research — 2026-11-08

Notes behind `labs/summit/` (Lab 09). "Read" = fetched and summarised; "Excerpt" =
only the search-result excerpt was available (claims from it are limited to what
the excerpt said).

**This lab is a study.** `src/mountaintop.js` and the summit UI belong to the summit
effort and are not changed here. The first tile runs `buildKyotoCity()` read-only
through `labs/shared/game.js`, on an object that holds only the state that method
writes to.

What the game does today: instanced wall, roof and eave boxes in the basin, 430
houses in preview quality and 920 at full, with the roads and the river kept clear
by rejecting placements, garden trees, and a separately built pagoda.

## Sources

| Source | How it was used |
|---|---|
| [Neon Zenith README](https://raw.githubusercontent.com/billpwchan/neon-zenith/main/README.md) | Excerpt. 9,373 buildings on a 3.2 km grid, instanced in 300 to 400 m chunks, analytic curtain walls, exponential height haze integrated along the view ray, interior-mapped windows up close. The README is the only source; the code wasn't checked. |
| [Procedural Tokyo wiki](https://github.com/jeantimex/tokyo/wiki) | Excerpt. Aerial perspective from a physical sky, and facades that blend from a far texture to generated detail close up. |
| [Infinitown](https://demos.littleworkshop.fr/infinitown) | Excerpt. A wrapping finite grid of city blocks. |
| [Lightstorm Megacity](https://luma.gl/next/examples/showcase/lightstorm-megacity) | Excerpt. GPU-driven culling for up to a million records. |

## What the lab does

* **Instanced city.** Two InstancedMeshes (walls and hip roofs), about 5,600 houses on the ring-terrain height, with roads and a river left as gaps in the random placement. The game's approach, at higher density.
* **Haze layers.** Five wide cards at set distances, because reading distance as stacked value bands is how painters do it, and it is cheaper than a full aerial perspective pass. Tinted each frame from the sky's own palette.
* **Window wave.** One `Points` object with the onset distance stored per point, so lighting the whole city in a wave is one moving uniform.
* **Height.** `LabWorld.ringY` gives the rendered height of the outer terrain so the city sits on the same land the fields do.

## Not done

The lab does not attempt the summit's landform, grass, meadow or the sun pool (they stay with the classic builders; see docs/fable/handoff/s2-clearing.md).

## The clearing, as modular assets (lane s2-clearing)

Five specimens (`c-stone`, `c-enso`, `c-furin`, `c-entry`, `c-path`) build the game's `src/kit/clearing` assets through the real `AssetRuntime`, so each tile is exactly what `?assets=modular` puts on the hilltop:

* **meditation-stone**: the rocks family's chisel (icosphere cut by planes and displaced), fitted to the classic lump's box; five path stones merged into one mesh and sunk a hand deep.
* **summit-enso**: one brush stroke as a flat ribbon with vertex width and alpha, lifted onto the stone's face (the classic ring is centred inside the stone).
* **summit-furin**: the garden family's glass chime at 2.4x, hung on a thread, pivoting on the hook.
* **summit-entry** and **summit-path**: the stairs as merged slabs, the shrine kit's torii (pegs off, 0.56 scale) and the lanterns kit's toro.

Not promoted (and why): see the handoff. The seat view stays the judge: nothing was added above the horizon line from the meditation seat.
