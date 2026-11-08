# Labs build-out — design and ledger (2026-11-08)

## What was asked

Finish all 22 labs on the portal. `labs/grass/` is the golden template,
`labs/machiya/` shows where the newer labs are going. Each lab needs: fresh web
research beyond the old notes, a page at `labs/<slug>/index.html`, live Three.js
variations with the source recipes on the page, one specimen of the original
game design in every family, an interaction more playful than the grass slab, a
Ghibli × Kyoto Animation look (real light, painted surfaces), and a poster plus
link on the `labs/index.html` portal.

Seven labs were live (ground, water, ranges, machiya, sky, pagoda, interiors).
Fifteen remain: shrine, moonpool, summit, nest, lanterns, fences, rocks, garden,
greenery, alley, keepsakes, critters, villagers, weather, komorebi.

## Decisions

* **No approval gate.** The user said not to stop until all 22 are done, and the
  session is non-interactive, so this file stands in for the reviewed spec.
* **Summit** was marked "elsewhere" because the summit effort owns
  `src/mountaintop.js`. The user asked for all 22, so the lab is built, and it
  only reads that module through `labs/shared/game.js`. Nothing in
  `mountaintop.js` or the summit UI changes.
* **One shared kit, one lab folder each.** The per-lab code is the hero
  interaction and the recipes. Everything else is shared.
* **Recipes are the code that ran.** A card's source is `spec.build.toString()`,
  so it cannot drift from what the tile renders.
* **Originals are real.** The first specimen in a family calls the actual game
  builder through a `Countryside.prototype` stub, the same trick as Machiya.
* **Research labelling.** `research.md` keeps the "Read" / "Excerpt" distinction.
  Nothing is cited as read unless the page was fetched.

## Kit (`labs/shared/`)

| File | Job |
|---|---|
| `craft.js` | seeded rng and noise, `Bag`, swept sections (`sweep`, `tube`, `rope`), `rockGeometry`, instancing, counts |
| `painted.js` | `paintify()` shader patch (brush dabs, moss, lichen, grime, wet, bump) and the material set `M`, built on the game's 256 px textures |
| `finish.js` | the eight painted finishes, promoted from the Pagoda Lab, with `keepBg` so shelf tiles stay on white |
| `sound.js` | small Web Audio synths: bell, clack, drip, chime, wind, rain |
| `world.js` | `LabWorld`: the real game sky, painted ground, ridges, trees, grass, Michi, orbit and cat-eye cameras, click picking, compare split, postcards |
| `original.js` | stubs that run the game's own builders in isolation |
| `workshop.js`, `workshop.css` | `runLab(def)`: shelves, live tiles, search, recipes, stepper, sources, frame loop |

## Each lab

`labs/<slug>/`: `index.html`, `js/main.js` (the `runLab` definition), `js/recipes.js`
(specimens), `js/stage.js` (hero), `research.md`, `poster.png`.

| n | slug | Signature interaction |
|---|---|---|
| 06 | shrine | Draw the kasagi curve, fold the shide, ring the bell, grow a senbon tunnel and walk it |
| 07 | moonpool | Drop pebbles that break the moon's reflection, float paper lanterns at dusk |
| 09 | summit | Dial a city from the perch: roof grids, window lights, haze layers |
| 10 | nest | Drop twigs one at a time and watch the cup form, then Michi curls up in it |
| 11 | lanterns | Kindle a street at dusk, lantern by lantern, stone and paper |
| 12 | fences | Draw a fence with the pointer, age it, change its knots |
| 13 | rocks | Compose a 3-5-7 garden from five stone forms, rake the gravel, let moss grow |
| 14 | garden | A water-timed instrument: deer-scarer, water harp, wind chime |
| 15 | greenery | Time-lapse a bamboo grove from rhizome to culm |
| 16 | alley | Dress a narrow roji from a palette of props, then explore it at cat height |
| 17 | keepsakes | Squint test: find the yarn in busy grass; pull the thread loose |
| 18 | critters | Feed the koi, startle the sparrows, plant a butterfly's flower |
| 19 | villagers | Greet the village cats through dusk, eye-shine and grooming |
| 20 | weather | Paint weather over a corner of town: rain rings, settling snow, petal drifts |
| 22 | komorebi | Sun-coins through leaves, with an eclipse dial that turns coins into crescents |

## Ledger

Kept up to date as labs land. `[ ]` not started, `[~]` in progress, `[x]` verified
in headless Chromium with no console errors and a poster on the portal.

- [x] kit
- [x] shrine
- [x] moonpool
- [x] summit
- [x] nest
- [x] lanterns
- [x] fences
- [x] rocks
- [x] garden
- [x] greenery
- [x] alley
- [x] keepsakes
- [x] critters
- [x] villagers
- [x] weather
- [x] komorebi
- [x] portal, registry, AGENTS.md
