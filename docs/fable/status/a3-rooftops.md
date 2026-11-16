# a3-rooftops

- Worker / model:     Claude Sonnet 5.5
- Claimed:            2026-11-16
- Branch:             fable/a3-rooftops
- Base commit:        ef6adad (fable/integration, G-R chores done, tag 20261116a)
- State:              ready for review

## Steps
- [x] A.1 Routes walked and captured (below); [x] A.2 composition; [x] A.3 light; [x] A.4 life
- [x] A.5 sound audit; [x] A.6 performance (partial, see load notes); [x] A.7 comfort (read-through + manager test); [x] A.8 pairs + ranked issues

## Fixed
- `src/kit/rooffestival/city.js` (roof-distant-city): the empty ring beside the route was 14 + 0.35 x step metres (36 m at far, where the Roof Road
  always builds it), so the run camera looked at bare ground; now 14 + min(0.35 x step, 6). Far step 63 -> 52 (still under the 1000-tri far budget).
  Small gain only; the real fix needs the build.js band patch (issue 1).

## Routes (sandbox s ranges; camera = the run camera, `roofRoad.at(s)`)
Mouth s ranges from `buildLevel()`: 1 0-100, 2 100-242, 3 242-402, 4 402-590, 5 590-799, 6 799-1080, 7 1080-1261, 8 1261-1411, 9 1411-1563, 10 1563-1612, 11 1612-1709, 12 zero length, 13 finale (float roof s 1029-1035, Okuribi).
- R1 bridge gate + machiya roofs, Pontocho: s 0-242. Stops 20, 70, 150, 220. Camera: the run camera 3/4 from above and behind, cat on the ridge.
- R2 Takase canal, boat, Nishiki canopy, laundry sky: s 242-799. Stops 280, 350, 520, 650.
- R3 festival: hoko-cho yatai, float, castle, to the finale: s 799-1261 and the float roof. Stops 760, 950, 1230, finale.
Times (sandbox phase 0..1; the sandbox is one summer afternoon into festival night, so there is no dawn): 0.05 early afternoon, 0.35 noon, 0.72 dusk, 0.95 night.
Captures: `docs/fable/status/a3-rooftops/mod_<phase>_<s>.jpg` (modular, 48), `cls_*` (classic pairs, 8), `patch_band_near_0.35_150.jpg` (modular with the issue-1 patch applied locally).
Tool: scratch script over `roofRoad.at(s)` + `renderNow` on `/kyoto-rooftops.html?hour=&assets=&shot=1&nohud=1`, Metal. Not pixel-repeatable (time loops).

## Contact sheet (best frame per route and time; classic vs modular)
| Route | phase 0.35 noon | phase 0.95 night |
|---|---|---|
| R1 | mod_0.35_70 / cls_0.35_20 | mod_0.95_70 |
| R2 | mod_0.35_350 / cls_0.35_350 | mod_0.95_520 / cls_0.95_280 |
| R3 | mod_0.35_950 / cls_0.35_650 | mod_0.95_950 / cls_0.95_950 |
| finale | mod_0.05_finale | mod_0.95_finale / cls_0.95_finale |

## A.2 / A.3 / A.4 by eye
- Frames that break the bar (modular): every frame where the camera looks past the route (s 20, 150, 450, 650, 760, 850, 1150 at all times): the distant city is the far
  tier (a few flat roof blocks 52 m apart, 228-900 tris) and the skyline reads as a brown void. Classic fills the same view with a sea of 7 m houses.
  s 150 noon is the clearest pair (cls_0.35_150 vs mod_0.35_150). Cause: build.js passes band 'far', so the city is always the far tier even on high.
- Night: the canal water is as bright at night as at noon in classic and modular alike (not a regression, ranked 4). Lanterns on the long roof runs (s 650-850, 1150)
  are not visible; only the shopfront and teahouse glow (s 70, 520, 950) carry the night. Okuribi finale: five fires read well, the lit city line is thinner on modular.
- Finale framing (the G-R chore question): with `roofRoad.skipFinale()` the card covers the lower centre; in classic Michi sits at the left edge and Chidori is hidden by the card.
  The five fires are well framed in the upper band. Camera code is the operator's: a patch is not proposed; the card is the thing that crowds the bottom third.
- Life: boat with the boatman (s 350), the market figure (s 520), the laundry rail (s 650) and the yatai crowd (s 950) all read and animate; nothing moves that should not.

## A.5 Sound audit
- No roof kit family calls `env.audio` (`grep -rn audio src/kit/roof*` finds nothing). The sandbox has its own procedural layer (game.js: footsteps, festival drum after mouth 6 at night, river and roof wind).
- The game pocket: the Rooftops music mood exists (`src/music.js` 'Rooftops'); `manager.js` sets it (`music.setScene('Rooftops')`) and rings the Shoki bell and dream chime. Not present in the pocket: hayashi at the festival, canal water, a lantern kindle. These are the t3 audio contract events; the call sites are not in the roof families. Ranked 3.

## A.6 Performance (sandbox, `perf.mjs`: 90 `renderNow(1)` calls, CPU submit ms, vsync off; the sandbox quality flag is low/high only, so there is no medium row)
| s | set | quality | draws | tris | median ms (p95) | uptime 1-min load |
|---|---|---|---|---|---|---|
| 150 | classic | high | 265 | 429,759 | 1.9 (2.4) | 3.1 |
| 150 | modular | high | 254 | 337,177 | 2.0 (2.5) | 3.0 |
| 350 | classic | high | 203 | 379,244 | 1.7 (2.2) | 3.1 |
| 350 | modular | high | 204 | 319,959 | 4.0 (4.4) | 3.0 |
| 950 | classic | high | 339 | 558,011 | 2.1 (2.6) | 3.1 |
| 950 | modular | high | 324 | 487,320 | 2.9 (3.4) | 3.0 |
| 150 | classic | low | 179 | 392,796 | 2.3 (2.6) | 3.1 |
| 350 | classic | low | 137 | 344,602 | 2.1 (2.4) | 3.1 |
| 950 | classic | low | 249 | 488,763 | 2.5 (2.9) | 3.1 |
Load was 3.0-3.1, at the R54 limit, so the ms are indicative only; draws and triangles are load-independent. R52 (modular draws <= classic): holds at s 150 and 950, FAILS by one draw at s 350 (204 vs 203, canal), and the modular canal frame costs 2.3x the CPU submit ms: ranked 2. Low resolves to classic in the kit (so no modular low row).

## A.7 Comfort
Read-through, no capture: `body.large-text #toast-stack .roof-hint` (16 px), `body.high-contrast #toast-stack > *` covers the arrival hint, `#btn-leave-roofs` is a `.menu-btn` shown on `rooftop-mode`; the pocket takes `g.reducedMotion` into the world and atmosphere. `rooftop_manager_test` 81/0 covers the hint and the leave button. Not driven in a browser here (no pocket capture): FOV and reduce-motion in the pocket were not re-run.

## Deferred, classic (not ported, by brief)
r2 part c (bridge, corner house, roji, balconies, zushi, alley pockets/routes, street, ground), r3 willows, culvert ledges, tenmangu gate.

## Operator layout notes (recorded, not fixed)
Overlapping stage-2 legs block the camera near s 1010 / 1558; mouth 12 has zero length; `roofRoad.view` throws under `?finale=1` before the camera is placed; tools/rooftop_browser_test.mjs asserts 30 residents where the route has 40.

## Deferred minors (from the family reviews): disposition
Not touched, ranked 5: crate slat gaps and trellis bark curls, decorateHouse bicycle (seen on s 950 as a bicycle in the classic and a cloned one in modular: present), machiya hero buildMs, hayashi weaker than classic, okuribi mid/far and pagoda mid warm builds (they fail the contract's warm-build check under load 4-5 and passed at quiet; not re-verified quiet for all), r5 close-up only. The rooftop golden city-by-position glue (`tools/rooftop_golden.js`) was not changed.

## Remaining issues, ranked
1. Distant city is always the far tier (build.js band 'far'): bare skyline from the run camera. Patch for the operator (`rooftops/js/build.js` line 248): change `'far'` to `'near'` in `extraLayout('distant-city', 0, 0, 0, 0, 0, 'far', ...)`; hero then builds on high (10k tris, one draw, a visible city: patch_band_near_0.35_150.jpg), mid on medium. A denser hero (step 11, about 21k tris) needs a `buildMs` exception above 13 ms in `src/kit/budgets.js`. Not mine to edit.
2. Canal +1 draw and 2.3x submit ms on modular at s 350 (R52 fails by one draw).
3. No roof kit audio call sites (hayashi, canal water, lantern kindle); needs the t3 sink block.
4. Canal water not time-of-day aware (classic too); lanterns on the long roof runs at night.
5. The deferred minors above.
6. Pocket arrival and finale were not captured in the game; comfort in the pocket read, not driven.
