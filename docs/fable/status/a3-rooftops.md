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
Captures: `docs/fable/status/a3-rooftops/mod_<phase>_<s>.jpg` (modular, 6 stops x 4 phases, re-shot after fix round 1), `cls_*` (classic pairs, 8), `fix1_*`, `fix3_*`, `pocket_*` (fix round 1).
Tool: scratch script over `roofRoad.at(s)` + `renderNow` on `/kyoto-rooftops.html?hour=&assets=&shot=1&nohud=1`, Metal. Not pixel-repeatable (time loops).

## Contact sheet (best frame per route and time; classic vs modular)
| Route | phase 0.35 noon | phase 0.95 night |
|---|---|---|
| R1 | mod_0.35_150 / cls_0.35_150 | fix1_mod_0.95_150 / fix1_cls_0.95_150 |
| R2 | mod_0.35_350 / cls_0.35_350 | mod_0.95_350 / cls_0.95_280 |
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

## Checks (final pass; load noted)
- check_syntax 192 OK; verify all passed; kit_check 534 passed; labs_check OK
- rooftop_golden classic EQUAL + modular routing 41/41; rooftop_test 40/0; companion 7 passed; alley PASS; manager 81/0; footprint_golden EQUAL
- `kit_contract_test --family rooffestival` at uptime 2.2: 697 checks, 2 failed, both warm-build and both in files not edited here: roof-hoko [mid] 3.4 ms (cap 3), roof-okuribi [mid] 4.3 ms (cap 4). roof-distant-city passes all three tiers. The earlier run at load 4.5-5 failed 10 on warm builds (load, not judged). Ranked 5: re-read hoko/okuribi mid at a quiet machine.
- Not run: game boots classic + modular, cadJS/catalog checks (no family file outside rooffestival/city.js changed; cadJS/catalog not run).

## Fix round 1 (Integrator pre-review)
1. Distant city (AAA-1): the far tier is now ONE InstancedMesh of a 14-triangle gabled house on the shared matte material, on an 8.5 m lattice
   (classic 7 m: 7,956 houses, two InstancedMeshes), the route gap back to 14 m, colours converted to linear (all tiers: they were reading pale/blue).
   Budget row `roof-distant-city` far: `{ triangles: 90000, buildMs: 6 }`, why cites classic's 79,560 tris / 2 meshes / 2 materials / 7,956 instances against the kit's
   about 5,900 houses / about 82,000 tris / 1 mesh / 1 material. build.js untouched. The far buildMs 6 is from a contract pass at load 3.2 and 2.3 (warm build far under 1.5 ms before; no failure reported at 6), not a quiet measurement: re-read at load < 2 (open).
   A/B from the run camera (classic vs modular, day and night): fix1_cls_/fix1_mod_ at s 150 (R1), 350 (R2), 950 (R3), phases 0.35 and 0.95. By eye the modular skyline now matches classic's tone and fills the same view.
   Gates: rooftop golden classic EQUAL, modular routing 41/41.
2. R52 at s=350: modular was 204 vs classic 203. Now 3 runs each at load 3.9-4.4 (draws are load-independent): modular 202, 202, 202; classic 200, 199, 203 (and 203, 206 in
   earlier runs): the classic count itself swings +-3 with animated state, so modular is within it, not clearly below. A per-family swap bisect (streets, festival, cast classic one by one) showed no single family adds the draw: swapping the street family to classic RAISES draws (211), the cast to 205, the festival family 203, i.e. the kit
   is already cheaper in each family and the residual is the shared sandbox state. All spots (s 20/150/350/520/950/1230, high): modular 190/254/204/189/324/97 vs classic 201/265/206/215/339/100 at load 3.9-4.2 on the same run: modular <= classic at every spot. The s=350 margin is 2-4 draws on that run; I could not make it larger without cutting a mesh. ms not recorded (load > 3).
3. Deferred minors: hayashi: close-up pair from the float at noon and night (fix3_hayashi_cls/mod; run camera s 1026/1031 in f3): the kit musicians read equal to classic, with hats and instruments; not weaker, no change. Bicycle: ported on the hero machiya (`dressHouse`, same recipe, 3 spokes per wheel); fix3_bicycle_cls/mod, s 950, matches. Crate slats: 5 (hero) / 4 (mid) slats, thicker and narrower (gap 28% instead of 15%); no frame shows a crate close enough to judge, so the look is unverified (contract passes). Trellis bark curls left ranked.
4. Sound: everything the Roof Road plays is event or state driven, not tied to a mesh. Sandbox (`rooftops/js/game.js`): footsteps by `ground.kind`, the festival drum after mouth 6 at night by s, the river and roof wind layers by s, bounce/land/splash/chimes from the run view's events, the Okuribi drums and chimes from `fire` events. Pocket (`src/rooftops/pocket.js`, `manager.js`): the same event tones on the sfx bus, the Rooftops music mood (`music.setScene('Rooftops')`), the bell and dream chime. `awk` over game.js 100-300 and pocket.js 262-300 finds no scene, mesh, world or assets reference. So `?assets=modular` loses nothing, and no kit family needs an `env.audio` call. There is no hayashi or canal-water source in classic either (the float's musicians are silent; the drum is the festival sound). Hearing it (a real ear check) was not done.
5. Pocket (both sets, real game, `?assets=classic|modular`, autostart new, unlocked via `rooftops.setUnlocked`, walked into the gap, 1280x720): pocket_classic_/pocket_modular_ arrival, run (s 150), finale (t about 9 s). Console clean on both boots (errors [] warnings []). Comfort driven with body classes large-text, high-contrast, reduce-motion in the pocket: the arrival hint is white on black 16 px, "Leave the Roof Road" in the pause menu is 15 px cream on the panel, both legible (pocket_modular_comfort_hint/menu). Not driven: the settings UI itself and a real prefers-reduced-motion. Finale framing: judged in docs/fable/handoff/a3-rooftops.md (Michi at the left edge; a pair-midpoint patch for runview.js, untested).
6. Checks (final): check_syntax 192, verify all passed, kit_check 534, labs_check OK, kit_test 37/0, rooftop_test 40/0, companion 7, alley PASS, manager 81/0, rooftop golden EQUAL (routing 41/41), footprint golden EQUAL, `cd cadJS && npm run check` 16/16, `cd catalog && npm test` 50/0. Both game boots clean (above).
   Contract at load 2.1-2.4: rooffestival 697 checks 0 failed (the hoko/okuribi mid flakes did not recur). roofstreets: 1 failed, roof-machiya [hero] warm build 17-18 ms vs 15; the same check on the unchanged base (git stash) reads 15.3 / 16.6 and fails, so it predates this lane (quiet reads were 11.0 in r2b); the bicycle adds about 1.5 ms of it. roofcast: roof-hayashi warm builds fail at base too (13.7 vs 10 hero). Neither is raised from a loaded read; both need a re-read at load < 2 (not reached: the machine held 2-3).

## Fix round 2 (review r1)
1. `roof-distant-city` far budget `why` rewritten (R86): buildMs 6 is provisional (loaded reads at load 2.3-3.2; Integrator solo re-read pending); the density is stated as about 5,900 houses vs classic's 7,956 (74%) at about 82k tris vs 79.5k, not "classic coverage". The A/B frames (fix1_*, s 150/350/950, day and night) do not read thinner, so the count stays.
2. Hero and mid A/B (classic vs modular, s 150, day and night; fix2_hero_/fix2_mid_*, shot with build.js band set locally to near / rim, then reverted: rooftops/js untouched). After the round-1 linearisation alone hero and mid were still pale blue-white against classic's dark kawara; their display colours in `city.js` are now the far tier's (roof 0.17-0.28, wall 0.30-0.52), and in the new frames they match classic's tone. They stay sparse (16 m / 34 m lattices); the Roof Road never builds them (band far).
3. Both game boots, classic and modular (pocket drill boots the real game): console errors [] warnings []. kit_check 534, rooftop golden EQUAL + routing, footprint golden EQUAL.
4. The runview.js finale patch stays in docs/fable/handoff/a3-rooftops.md, untested, not applied.
5. No timing work this round; machiya, hayashi and city timings go to the Integrator's solo window.
