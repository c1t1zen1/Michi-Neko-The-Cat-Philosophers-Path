# v-water review r1 (cde1551..8a10f1b, fable/v-water)

Reviewed in four passes over `reviews/v-water-r1.diff`: (1) the shared water state (`sky.js`, `field.js`, `textures.js`) and `src/main.js`; (2) `river.js` and `ripples.js`; (3) `bridge.js` and `parts.js`; (4) `paddies.js`, `index.js`, `budgets.js` and the `labs/water` diff. I opened 12 compare JPGs: river 6/12 pairs, bridge-12 pair, river-rain-12 pair, water-ripples-12 pair, paddies-12 pair, bridge-18-mod, river-18-mod, river-22-mod and paddy-bunds-12-mod.

### Spec Compliance

- ✅ **Spec compliant.** Every card requirement I could check from the diff is present:
  - **One water style.** The CPU water field (`field.js`) drives one style, `kyoto` (`river.js:56-188`), and the status file gives the reason (status L3).
  - **One bridge.** `b-sanjo` was chosen. Its gameplay dimensions are frozen in `BRIDGE` (`bridge.js:33-38`), and its footprint is the layout's: the build returns no footprint (`bridge.js:247`).
  - **Seasons.** The `season` param covers paddies and rice, and `env.snow` turns paddy water to ice (`paddies.js:83`, `:126`).
  - **Ripple pool contract.** It is unchanged: 24 rings, each with its own material, at y = 0.045, renderOrder 2, hidden until spawned (`ripples.js:21-36`). The runtime honours `sharedGeometry` (`src/kit/runtime.js:499`).
  - **Ids and L4.** All six ids are promoted. The `paddy-bunds` gap is closed by the new specimen `water/p-aze` (`labs/water/js/bunds.js`, `variants.js` p-aze), so L4 is met.
  - **Sockets.** The Roof Road sockets `post_e_1…7`, `post_w_1…7` and `shoki` are present (`bridge.js:226-241`).
  - **Budgets.** The two BUDGET_EXCEPTIONS rows are in the granted file (`budgets.js:+91-99`).
  - **Code rules.** There is no `Math.random`, no `Date.now` and no `labs/` import in `src/kit/water/` (grep, 0 hits).
- ⚠️ **Gameplay-identity proof is not in the repo.** The `isInWater`/`wadeDepthAt`/`shoreDistance`/walkable-height hash `d89ce039` comes from `/Users/c1t1zen/Documents/GitHub/michi-wt/_scratch/v-water/water_probe.sh`. I read it, and it samples exactly those four functions plus `c.platforms` over x −3…1, z 22…39. It is not committed, and the status file has no command line for it. The Integrator should re-run it on `fable/integration` after the merge.
- ⚠️ **Not re-run by me (per the review instructions):** goldens EQUAL, the 562-check water contract run, and the three boots.
- ⚠️ **The all-family `kit_contract_test` is not green.** The report blames `distant-pagoda` timing under load. The Integrator should re-run it on an idle machine.
- ⚠️ **Generated files were edited in-lane.** `src/kit/index.js` (a hot file per `_village.md`) and `labs/ASSET_COVERAGE.md` (outside the lane's files, regenerated after the `main.js` line shift) were both changed. This matches earlier lanes; regenerate them at merge.

### Named risks — what I checked

1. **Gameplay (water level, wade, shore, bridge surfaces): ✅ no path from the kit to these.**
   - What gameplay reads:
     - `isInWater` reads `bridgeRampWaterExclusions`, `bridgeDeckWaterClearance` and `waterRects` (`countryside.js:1051-1062`).
     - `shoreDistance` reads `waterRects` and `riverSamples` (`:1017-1036`).
     - `wadeDepthAt` → `riverBedDepth` reads `riverBedSamples` (`:1370-1385`).
     - All of these come from the countryside layouts (`:1398-1432`).
   - What the kit reads and writes:
     - The kit river only reads `layout.footprint.anchors.riverCurve` (`river.js:208-209`).
     - The bridge reads nothing from its layout.
     - No kit file writes to `layout` or a footprint.
     - The ribbon stays at y = 0.02 with half-width 3.4 (`river.js:24`, `field.js:18`).
   - Nothing in the game looks up the River or Kiyomizu Bridge mesh by name to read geometry. I grepped `src/` and `rooftops/js`.
2. **Ripple pools: ✅ no regression against classic in any reachable combination, with one caveat (Minor 2).**
   - The classic river shader has no ring input (`countryside.js:1590-1603`), so river modular + water-ripples classic is exactly the classic behaviour. That combination is reachable through `?swap=river:modular` or a `kit-overrides.json` pin such as today's `edge-forest` pin.
   - In that case the classic ring sprites still draw at y 0.045 over the y 0.02 sheet. The kit river keeps the classic's default depthWrite and transparent flags.
   - `rainRipples` are never read by the kit. The kit river and paddies draw their own procedural rain rings from `env.wet` (`river.js:115`) on top of whichever rain-ripples set is active.
3. **Roof Road sockets: ✅ present, but see Important 1.**
   - `shoki` sits at (railX, 1.66, posts[6] = +4), turned π so it looks north along the east rail (`bridge.js:237-241`). That matches the spec §4: "south-end post, looking *along* the east railing".
   - `post_*_i` sit at the classic post z values on the rail top.
   - The kit's own end posts block the ends of that same railing walk (Important 1).
4. **`assetEnv()` per-frame cost: ✅ no per-frame allocation.**
   - The Vector3 and four Colors are created once, behind a guard (`main.js:602-603`).
   - `resolvePalette()` returns the shared per-frame buffer (`sky.js:573-575`), and every key, `warm` included, exists in `paletteBuffer()` (`sky.js:4`, `:12-16`).
   - On the valley path, `assetEnv()` runs after `sky.update()` (`main.js:1496` → `:1529`). The cat-rim code has already resolved that frame's palette by then (`main.js:1505`), so this adds five `.copy()` calls and no recompute.
   - The interior path (`main.js:1483`, before `sky.update`) reads the previous frame's cached buffer, again with no recompute.
5. **Darker water at grazing angles and in rain:** judged under Minor 3.
6. **Size:** `src/kit/water` is 1,841 lines; about 2,040 with `labs/` and `main.js`.
   - It is reviewable as one PR. The family is cohesive, and every file has one job and a header comment.
   - If the Integrator wants a split, the clean seam is `bridge.js` + `parts.js` as a second PR (383 lines). It depends on `sky.js` only for `registerObstacles`, and it carries all of the gameplay-surface and Roof Road risk.

### Strengths

- **Gameplay isolation is real.** The layouts drive everything, the kit never writes footprints, and the probe script exercises the right functions.
- **The env change is minimal and safe.** It uses the Sky's public API, copies into env-owned objects so kit code can't scribble on the Sky's buffers, and allocates nothing per frame. The old Sky-dome uniform walk is gone. Kit code reads env only (`sky.js:91-103`) and falls back to the hour when the values are absent.
- **The bridge keeps every gameplay surface.**
  - The plank tops sit at 1.08.
  - The hokogi's flat top is 1.66 across ±0.19 (±0.21 at mid).
  - The ramp treads are computed from the same `rampHeight` as `bridgeRampPlatform` (`bridge.js:41`, `:116-125`).
  - The charm channel stays clear, and the nuki tie sits above the 0.42 underpass (`bridge.js:133`).
  - It adds no merged material: everything uses MAT or KIT_SHARED.
- **The river field works in ribbon space.** Ripples and foam follow the bends, the bed depth is the game's own carve, and pier wakes come from potential flow. It is deterministic and uploaded once.
- **The look is a clear uplift in three-quarter views.**
  - In bridge-12 and bridge-18 the water has depth, flow and a dusk glitter road. The bridge is posts, rails and piers where the classic was a box.
  - In water-ripples-12 the rings are crest-and-echo where the classic's are flat annuli.
  - paddies-12 shows rounded aze and rice in rows.
- **Disclosure is honest.** The status file covers the darker grazing look, the L4 ordering, shader-uniform params and the live-draw count.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)

1. **`bridge.js:37`, `:91-97` — the end posts (oyabashira) and their giboshi stand in line with the ends of both walkable rails, with no collider.**
   - **Where they are:**
     - The rail platform is x 1.03–1.45, z ±4.2, top 1.66 (`countryside.js:1412-1415`).
     - Each oyabashira is a 0.17 m box at x 1.315–1.485, z 4.275–4.445, rising from y 0.5 to 1.8. A bronze giboshi tops it out at 2.28.
     - The post covers the outer 13.5 cm of the rail band, 7.5 cm past the rail's end. The hokogi itself runs into it (`zEnd = oyaZ − 0.085`, `bridge.js:69`).
   - **Why it matters:**
     - A cat that reaches the end of either rail, or steps off it, walks its head and shoulders through a 1.3 m post. The classic has nothing beyond z ±4.2.
     - This is the Seven Posts route: "walk the east railing from the north end to the south end" (`docs/superpowers/specs/2026-10-24-rooftop-road-design.md` §4). The cat mounts at the north oyabashira and finishes at the south one.
     - The footprint must stay equal, so a collider is not the fix.
     - The header's "nothing new stands on a walkable surface" (`bridge.js:18`) is only true in the narrowest sense.
   - **Fix:**
     - Set the oyabashira outboard of the rail band plus cat clearance (centre at x ≥ ~1.6; widen the wing wall to carry it), or set them back so the cap is not in the rail's line of travel.
     - Then re-shoot the bridge pairs and confirm `rooftop_test` is unaffected.
2. **`bridge.js:139` (`x1 = 1.54`), `:162-167` — the stone wing walls and abutment ends stand on the walkable bank beside each ramp, with no collider.**
   - **Where they are:**
     - Each wing wall is a stone wedge at |x| 1.30–1.54, sloping from y 1.15 at the deck end down to 0.10 over 2.75 m.
     - The ramp platform only covers |x| ≤ 1.30 (+0.04/0.12 margins: `player.js:220`, `:532`; `countryside.js:1474-1484`). A cat walking beside the ramp at x 1.34–1.54 stays at ground level, inside up to 1 m of stone.
     - The classic had 0.22 m kerbs here (`countryside.js` `meshBridgeClassic`, "Low stone kerbs").
   - **Why it matters:** this is a new, plainly visible clip at the valley's main crossing (AAA-1, AAA-6). The wedges are prominent in river-rain-12-modular (both ends) and bridge-18-modular (left end).
   - **Fix:** keep the retaining stone inside the ramp band (|x| ≤ 1.30, top ≤ the tread, as a side skirt), or cap the outer wall at the classic kerb height (~0.22–0.25 m).

#### Minor (Nice to Have)

1. **`bridge.js:36`, `:131` — the pier posts (r 0.11 at x ±1.0, z ±2.0) stand in the swimmable river with no collider.** A cat swimming downstream past the bridge at z ≈ ±2 passes through them. The header only promises the |x| < 0.9 channel. The posts are thin and brief to pass, so record this as an accepted clip in status, or move the piers under the deck edge (x ±1.25), where a swimming cat is less likely to line up with them.
2. **Ripple coupling (`sky.js:14-17`, `:83-84`; `ripples.js:39-41`) is not stated where it matters.** The water bends under rings only when `river` and `water-ripples` are both modular. That is documented in handoff §7, but the status AAA-1 row says "surface bends" unconditionally. The kit's procedural rain rings (`river.js:115`) also draw in addition to the `rain-ripples` sprites, so rain shows two ring systems.
   - **Fix:** state the coupling in the AAA row and the swap matrix, and add a note for v-weather.
3. **The river is too dark at grazing angles in clear light (named risk 5).** Physically defensible, but it gives up the classic's bright "this is water" sheen at cat-eye.
   - **Cause:** `reflColor` (`sky.js:163-166`) returns ~97% of the dark forest colour once R.y < ~0.12, which is a 0.35 m eye looking at water 3 m away. Separately, `absorb = 1 − exp(−depth·2.1)` (`river.js:128`) leaves water under 0.3 m deep more than half transparent over the green-painted carved ground.
   - **In the pairs:**
     - In river-12 and the lower left of paddies-12, the kit river reads as olive or dark green where the classic reads sky-blue.
     - Three-quarter and overhead views (bridge-12, bridge-18, water-ripples-12) are a clear upgrade.
     - river-rain-12 is a darker slate with rings, which reads plausibly as rain.
     - At night both versions are dark, and the kit's koi are readable.
   - **Judgement:** acceptable for merge (AAA-5 ✓); AAA-1 at cat-eye on open reaches is weaker than classic.
   - **Follow-up:**
     - Weight `reflColor` toward `skyColor` where no near bank faces the ray, or let `paint` lift grazing views more.
     - Put a floor on body opacity in the shallows.
     - Add a river pair taken at 0.35 m looking along the stream.
4. **L6: the river pairs are not framed on the river.** They use the same camera as the perf table (10, 2.2, 26.5): bushes and the bridge fill most of the frame, and the water is a grazing sliver at the lower left. No `cam=` strings are recorded in status, so the pairs cannot be reproduced.
   - **Fix:** record the cameras, and add a river-centred pair (see Minor 3).
5. **The gameplay probe exists only in scratch** (`_scratch/v-water/water_probe.sh`).
   - **Fix:** paste its exact `node tools/headless.mjs … --eval` line into the status file so the Integrator can re-run it on integration.
6. **Duplication.**
   - `sky.js:23-56` (`PAL`, `sunDirAt`, `palAt`) re-derives `Sky.buildPalettes`, `updateDayNight` and `getDayPhase`. That is a third copy of the sun path after `src/kit/materials.js:410` `nightnessAt`. It is a fallback only, but it will drift if v-sky retunes; request a shared `sunDirAt` in `materials.js` through the handoff.
   - `paddies.js:168` `ridgeGeometry` ≈ `labs/water/js/bunds.js:33` `azeGeometry`. This copy is plan-mandated (kit code may not import labs, and labs may not import kit). It is adapted per tier with a different noise function, not verbatim, hence Minor.
7. **`sky.js:59-90` — `WaterSky` now holds the family's ring and obstacle registries, not just light.** `bridge.js:244-247` imports `waterSky` to register piers.
   - **Fix:** rename it (e.g. `waterShared`) or split the registries out.
8. **`river.js:252-273` — the `piersFound` latch reads obstacles once.** If the bridge instance is disposed and rebuilt (a cadJS hot swap, or a future runtime re-tier), the field keeps stale piers or misses new ones. The registry already changes on register/unregister.
   - **Fix:** bump a version counter there and re-compose when it changes.
9. **`sky.js:124` — the ring world position adds only `m.parent.position`.** That assumes the pool group sits at the origin, unrotated and one level deep, which is true today.
   - **Fix:** `m.getWorldPosition(v)` costs nothing here.
10. **`paddies.js:287-309` — `plotsFromStalks` merges clusters within ±2 grid cells.**
    - The real layout passes by one cell: plots 2 and 3 have stalk extents at x 8.6–19.4 and 22.6–33.4, a 3.2 m gap.
    - Any layout with plots closer than ~2 m would merge them and plant rice across the aze between them.
    - **Fix:** add an assertion to the rice sample or contract run that the real layout yields 4 rects, or request plot rects in the rice layout via the handoff.
11. **Report hygiene.**
    - The all-family contract run has 1–2 failures (pagoda timing), and every boot logs the pre-existing `/cad-overrides.json` 404. Neither is this lane's code, but the output is not pristine.
    - The handoff intro still says "10 families" (the post-merge index has 20).
    - `index.js:147` declares 64 `floating` ring names for a 24-ring pool.

### Assessment

**Task quality:** Needs fixes

**Reasoning:** The water kit is well built and gameplay-safe: the layouts drive everything, `assetEnv` adds no per-frame allocation, the ripple contract is intact, and there is a real look uplift in three-quarter views. But the kit bridge puts un-collided solids directly in the cat's path: oyabashira with giboshi at both ends of the walkable rails (the Seven Posts route), and metre-high stone wing walls on the bank beside each ramp. Both are geometry-only fixes that leave the footprint unchanged.
