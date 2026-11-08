# Labs verification — 2026-11-08

Covers the 15 labs added this round: shrine, moonpool, summit, nest, lanterns,
fences, rocks, garden, greenery, alley, keepsakes, critters, villagers, weather and
komorebi. All 22 labs on the portal are now open.

## Static

* `node tools/labs_check.mjs`: all checks OK (module syntax for every file under
  `labs/`, cache tags, registry, every live lab has `index.html`, `research.md` and
  a poster).
* `node tools/verify.mjs`: all checks passed.

## In a browser

Headless Chrome for Testing (Playwright build 1243), `--use-angle=metal`, driven
over the DevTools protocol, serving the repo root with `python3 -m http.server`.
GPU reported: Apple M5 Max.

| Check | Result |
|---|---|
| Scroll every page so every tile builds | 166 of 166 tiles built, no console errors or shader failures on any page |
| Press every stage and bar button, every tile's "try it" button, every Stepper step | No errors on any of the 15 pages |
| Real mouse input | Pebble and finger in the Moon Pool, drawing a fence, placing stones, painting weather, placing props, planting a rhizome, feeding koi, finding yarn: each changed the state it should |
| Pick targets | Komainu, offering box and basin respond when clicked |
| Frame rate | 60 fps on the stages at 1200×750 |
| Pagoda Lab after its finish code moved to `labs/shared/finish.js` | Loads and renders, no errors |

Every poster was looked at by eye. Stages and some shelves were captured and
reviewed during the build.

## Not verified

* **Sound.** The synths run without errors, but nobody has listened to them.
* **Phones and low-end GPUs.** No real-device runs. The shelf's painted finish is
  the heaviest part, and the governor turns it off under load.
* **Touch input.** The drag tools use pointer events and were tested with a mouse only.
* **Research depth.** Most sources were read only as search excerpts, and each
  `research.md` and the page's notebook says which. Heckel's painterly article was
  read in part; the Codrops *Susurrus* article refused the fetch.

## Accuracy notes

The numbers below are artistic or simplified, and the notebooks say so:
the shishi-odoshi cycle, the sōzu fill curve, the water harp's scale, coin size
(drawn at 1.7× the true pinhole image) and the bamboo growth curve (a single easing
per culm, not per internode).
