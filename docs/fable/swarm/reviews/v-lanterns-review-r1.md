# v-lanterns review r1

### Spec Compliance
- ❌ Issues found: R36 / card "say how many live draws" is not met (see Important 1). Otherwise every id is promoted, no deferrals, L4 specimens added, no hot-file edits, no `?v=` bumps, one new merged material (`kitMaterials.stone()`).
- ⚠️ Cannot verify from diff: tris per tier and the 509 contract checks (reported only); `kitMaterials.bind` actually makes `km.stone()` merge-eligible in `_mergeStatics` (`matSet = Object.values(MAT)`, countryside.js:490); the final `verify:` line in the report is blank.

### Strengths
- Hollow firebox is real: hero builds extruded panels with higuchi holes (stone.js firebox()), mid uses corner posts, far a prism with a standing lit prism. toro-22 and pool-toro-22 shots show a visibly lit opening, swept kasa and hoju against the classic box. AAA-1 is honestly judged. Classic and modular JPGs differ per pair.
- Risk 2 holds. `lampUpdate` (light.js) keeps the classic onset `((i*0.618)%1)*0.4` and smoothstep kindle, and reads `env.hour` and `env.lanternOn`. Toro keeps the game-bound `halo` part (`ownHalo:false`), so the game's `lanternHalos[i]` loop still drives it. The light pool is unaffected: `toroSpots` and the lantern lists come from the layout footprint (countryside.js:3569), not the meshes.
- Chochin keeps all meshes inside the swaying `lanterns` group exactly as classic (6 meshes hero/mid, 2 on far, so it does not add draws). Andon glow was toned down, and the shot at 22 h reads as warm paper.

### Issues
#### Critical
None.

#### Important
1. Draw-call cost is unmeasured and unreported. R36 and the card require the live-draw delta per lantern to be recorded. Neither the status file nor the handoff states one, and `tools/perf_spots.mjs` was not run. From the code, hero/mid each add one unmerged draw for the private `lit` lamp (build.js buildStoneLantern: `litWashi` is private and in `live`). Lantern instances placed: valley toro 6 (roadside-moss, countryside.js:3205), street-lamps 7 (`layoutLanterns`), plus courtyard 1, pool 1, andon 1 (chochin is unchanged vs classic).
   - Estimated delta at hero/mid: toro +6 (halo already existed), courtyard +1, pool +1, andon +1, street-lamps +14 (lamp + new halo each) = about +23 unmerged draws. Far tier adds 0 (shared `ownerGlow`).
   - Fix: run perf_spots classic vs swap on a lantern-heavy spot and record draw/tri deltas in status and handoff. Consider the shared glow material on mid, as on far, to cut it.
#### Minor
- build.js:~42 and index.js: `street-lamps` now gets a halo sprite that classic does not have (classic `meshStreetLampClassic` registers no halo). That is a visible look change and 7 extra transparent additive draws, and it is not called out as a deliberate difference.
- light.js `nightnessAt`: a hand-copied sun curve that must track `Sky.updateDayNight()`; it ignores weather and an overcast sky. `lanternOn:false` only forces dark when night < 0.035, so the valley's hysteresis band and this curve can disagree briefly at dusk/dawn. Acceptable, but name `sky.sunDir` as the source of truth in a comment.
- Status file: the "Andon fix" section ends with an empty `verify:` line, and the L6 text for pool-toro says the halo is a "tighter bloom than classic" (a flagged look change). Add the final verify result.
- Handoff: lists `tools/kit_test.mjs` fixture breakage that was later fixed by merging integration; update the note so the Integrator is not misled.

### Assessment
**Task quality:** Needs fixes

**Reasoning:** Implementation is sound: hollow firebox, kindle onset, halos and light pool all keep working through `update(env)`/layout, and the visuals are clearly better. The only blocker is R36 compliance: the live draw delta (about +23 at hero/mid, driven by the 7 street lamps gaining a halo) is neither measured nor recorded.
