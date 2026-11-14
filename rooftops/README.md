# The Roof Road — stage 2

Open **`/kyoto-rooftops.html`** from the served repository root. This buildless
Three.js prototype follows a winding 2.5D route through an imagined downtown
Kyoto: **1,082m**, with 14 street sections, 13 turns, eight tunnel passages,
five deep alley pockets, **six selectable courtyard lanes**, two moving cargo boats and nineteen festival stalls.
The seven districts and the five-fire finale remain part of the same run.

At a marked noren, press **drop** to choose an alley into the block. Both ends return to the street; the optional map shows these lanes with dotted lines. The six lanes add about **225m of winding ground** to explore. Jump to choose roofs, pole crossarms, trellises and laundry lines. Drop to
explore the low alleys, market rafters and canal stones. The streets remain
safe and the level's reach graph checks a way back to the finale from every
platform. Chidori saunters, dashes, waits, prowls, feints backwards and chooses
alternate surfaces; his decisions and action lengths vary with the place and Michi’s pace. He sometimes peeks into an alley and doubles back when ignored. He uses the same jump and landing physics as Michi.

The camera fits both cats in portrait and gives desktop more space to either
side. Foreground architecture opens around obscured cats. An optional paper
map shows both cats, the winding route and the lantern checkpoints. On touch,
drag the left pad (farther to sprint), hold **jump** for height and use **drop**
for lower routes. Desktop: arrows / A D, Space, Shift and ↓. R returns to the
last lantern; M toggles sound; Escape / P pauses. A standard gamepad also works.

Scenery uses procedural paint maps up to 256px, spatial material batches,
instanced distant roofs and nearby animated stallkeepers, laundry workers and
sweepers. The nodal bamboo is shared directly with the Labs; other craft
recipes are adapted to avoid loading the whole lab UI. Roof tiles, washi lanterns,
patterned cloth, weathered boats, vines and fittings use shared procedural maps.
Mobile defaults to the low power profile with dynamic shadows off (override with
`?quality=high` or `?shadows=1`).
[Downtown overview](../docs/ROOFTOPS_DOWNTOWN_2026-11-13.md) ·
[Agility, scenery research and follow-up results](../docs/ROOFTOPS_AGILITY_2026-11-13.md).

## Run and check

```sh
# From the repository root
python3 -m http.server 8000
node tools/rooftop_test.mjs
node tools/rooftop_companion_test.mjs
node tools/rooftop_alley_test.mjs
```

Or run all three pure suites with `cd rooftops && npm test` (no dependencies to
install). They cover rail continuity, reachability, floor coverage,
climb-backs, strict jump budgets, the complete physics run, guide separation
at several boat phases, backtracking and tunnel ceilings. The alley suite drives the safe floor and every
raised agility sequence with real physics, checks both exits and prevents
accidental landings on the wrong lane.

The optional browser suite uses an external Playwright installation and the
server above:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright node tools/rooftop_browser_test.mjs
```

Set `ROOFTOP_URL` for another server, `ROOFTOP_QA_DIR` for the report/capture
folder. It runs the actual game loop through the finale at 360×780, 390×844,
844×390 touch and 1440×900 desktop, checks cat bounds throughout the chase,
exercises simultaneous touch movement/jump, buffered presses between physics
ticks, both directions through every alley, local boat/worker visibility, map
and pause, and checks for
runtime/shader errors and a rendered five-fire finale. The accelerated review
hook exists only with `?qa=1`; it is not a performance benchmark.

Useful review flags: `?mouth=1..7`, `?at=<metres>`, `?finale=1`, `?auto=1`,
`?hour=0..1`, `?quality=low|high`, `?shadows=0`, `?debug=1`, `?cat=0`,
`?shot=1&nohud=1`. Console: `roofRoad.at(s, optionalY)`,
`roofRoad.jumpToMouth(id)`, `roofRoad.renderNow()`, `roofRoad.view`,
`roofRoad.skipFinale()`.

Phone frame rate and thermal behaviour still need physical-device testing.
The prototype remains a separate entry point from the valley game.
