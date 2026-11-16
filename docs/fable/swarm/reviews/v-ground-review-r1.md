# v-ground review r1 (2f78865..0264040, Claude Opus 5.5)

Reviewed in one pass from `reviews/v-ground-r1.diff` (all 8 family files, budgets.js, main.js, index.js, coverage, handoff, status). Outside-diff reads were each tied to a named risk and are listed under "Checks run".

### Spec Compliance

- ❌ One issue against binding ruling R54. Everything else on the card is implemented as specified:
  - `src/kit/budgets.js:125-126`: the restored `valley-ground` exception still loosens warm-build caps without R54 evidence. Details under Important #1.
- ✅ Card items verified in the diff:
  - GroundField port (`field.js`) and the one ground material (`material.js`): height blend, hex tiling, six pavings + POM, Lagarde wetness, low-first puddles + rain rings, snow.
  - Tier gating `TIER_DEFINES` (`material.js:36-40`): mid drops POM and PUDDLES (rain rings sit inside PUDDLES); far also drops to ANTI 2 and FRINGE 0. Quality low resolves to classic (`runtime.js resolveSet`).
  - `update(env)` drives `GroundWeather` from `env.wet`, `env.snow` and `env.mist` (`valley.js` update, `material.js` GroundWeather). `main.js assetEnv()` sends all three plus `hour`.
  - BiomeMask: the baked mask is untouched (systems golden EQUAL on classic and on the swap). Live thinning skips lawn and other `r==0` texels (`field.js:255`), and the heal pass restores the baked copy (`valley.js:250-262`).
  - Marks / autoClear: not promoted, deferred with a reason (handoff §8). Acceptable.
  - Colliders, walk heights and anchors are unchanged: the swap golden shows only the 3 replaced objects, 518 colliders and rng 49233. The mesh copies classic vertices via `Countryside.prototype` (`valley.js:34-36`).
  - All 4 ids are promoted, and 32 compare pairs exist.
- ⚠️ Cannot verify from the diff alone (controller: re-measure at G-V3):
  - Warm-build and frame times on a quiet machine. Every recorded number came at load ≥ 3.4.
  - The live-wear evals (`_scratch/v-ground/wear_eval*.js`) live outside the repo and were not re-run.
  - Hero shader compile time on ANGLE/D3D-class devices.

### Strengths

- **Hot-file hunks are classic-neutral.**
  - `src/main.js:335-341`: the loop only acts on an instance with id `valley-ground` and a `bindWorld`. Classic has no kit instances, and `city.assetInstances` is filled by `placeAsset` (`countryside.js:387-388`).
  - `budgets.js`: one entry added, nothing else touched.
- **Shader parity is careful.** I checked every `.replace()` target against three r160 (`meshphysical.glsl.js`, `lights_fragment_begin`); all match:
  - The shadow-capture string matches exactly, so `gSun` really is captured.
  - `fog_fragment` still follows `opaque_fragment`, so fog is intact.
  - The material stays MeshStandard, same as classic `texturedMaterial`, so lights, fog, shadow receive and envMap behave as classic.
  - `receiveShadow = true` and `castShadow = false` match classic.
  - Dropping the material's `STANDARD` define is harmless: the r160 source `#define`s it itself.
- **Weather and wear cost is well controlled.**
  - Weather paths are uniform branches, so rain and snow never trigger a recompile.
  - Wear has a dynamic box, partial refills and a 0.25 s upload throttle.
  - Micro-bench of `field.js` on a valley-wide live box: regrow 0.13 ms, upload refill 0.37 ms, `wearGrassMask` 0.49 ms.
- **First-build cost is paid at load.** The ~200-390 ms runs inside `assembleWorld()` in `Game.init` (`main.js:228-238`), before `started`. The first-frame `field.upload()` (`valley.js:169`) lands on the title screen.
- **R36/R52 are satisfied.** The ground escapes `_mergeStatics` only because its material is not in `matSet` (`countryside.js:525-527`). That is measured (−2 draws per spot and tier) and accepted. path-slabs use KIT_SHARED materials and merge.
- **The R54 revert itself is correct:** 21c95bf's hero 10 / mid 8 / far 6 are gone.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

1. **`src/kit/budgets.js:125-126`: R54 evidence missing; `mid.buildMs: 5` is a loosened cap with no failing reading behind it.**
   - The defaults are 6 / 3 / 1.5 ms (`budgets.js:33-35`).
   - The lane's own record (status, "before the budget entry") says only the triangles and the far warm build (2.0-3.0 ms) failed. Mid never failed the 3 ms default.
   - The only load-recorded runs (load 3.4-3.9, report) read mid 1.5-1.9 ms and far 1.4-1.5 ms.
   - The `why` says "2-3 ms on a quiet machine", but no measurement with 1-min load < 3 is recorded anywhere. R54 requires "measure with `uptime` 1-min load < 3 and record the load next to the number."
   - Fix:
     - Drop `buildMs: 5` from mid; the default 3 ms covers every reading.
     - Either drop far's `buildMs: 4` until G-V3 shows it is needed, or record a load<3 reading that needs it.
     - Rewrite the `why` with the measured numbers and their loads.
     - Same caveat for "~200 ms on a quiet page": state the load or drop "quiet".
   - The triangle allowances (45k / 45k / 5k) are structural (classic equivalence) and are fine.

#### Minor (Nice to Have)

1. **Style flips at the road edges.**
   - Where: `src/kit/ground/road.js:94` with `material.js:91`.
   - Cause: `style` is written only where paving weight `a > 0.2`, but `texF` is LinearFilter. `int(F.a*8.)` therefore steps 2 → 1 → 0 across the road edge, so slab and sett fragments can show in the fringe where `w[7]` is 0.1-0.3.
   - Fix: write `sid` for every texel in the road frame, or fetch style with `texelFetch` / nearest.
2. **Verbatim copy of the classic ground palette.**
   - Where: `valley.js:49-78` copies `countryside.js:741-799` (`meshGroundClassic`): about 25 lines of tint logic.
   - Smaller copies of the same kind:
     - `slabs.js:131` repeats `ROAD_POINTS` inline instead of importing it.
     - `road.js:30` mirrors `meshPathClassic`'s bridge-gap constant.
     - `road.js:160-169` repeats the sun and weather lines of `valley.js` update.
   - Fix: ask in the handoff for a shared `groundTint(x, z)` in countryside.js, and import `ROAD_POINTS` in slabs.js.
3. **Duplicated sun path.**
   - `material.js:333` (`sunDirAt`) re-derives Sky's sun path. `env.sunDir` and `env.palette.sun` are now in env (`main.js assetEnv`).
   - Fix: use them so the fringe and the cool shade stay in step if the sky's day length changes.
4. **About 35 MB of JS heap on the modular set.**
   - Where: `field.js:41` and `field.js:304-313`.
   - Breakdown: the valley field is ~17.6 MB (`S` alone is 262k × 8 Float32 = 8.4 MB, plus 5 Float32 arrays and 4 upload buffers). `_snapshots` keeps a same-size copy for the session.
   - In the game the valley builds once, so the snapshot only serves contract warm rebuilds.
   - Fix: release it after the first game build, or store `S` as Uint8.
5. **`wearGrassMask` mixes interpolation modes.**
   - Where: `field.js:261` subtracts the nearest-texel `G0[idx]` from a bilinear `wear` sample.
   - Effect: at shoulder G0 gradients this reads spurious dynamic wear. It stays under the 0.18 threshold at default params but can pass it at the extremes (`wear` 1, `width` 5 gives ~0.21). The heal pass then recomputes `keep` instead of restoring the baked mask exactly.
   - Fix: sample G0 bilinearly.
6. **Long upload churn after a single walk.**
   - Mechanism: with T = 1800 s and a 0.002 threshold, one walk keeps the live box for ~10,664 s (bench, 1 Hz regrow). Until then `texF` + `texH` (1.5 MB) re-upload about once a second.
   - CPU cost is sub-ms; GPU upload churn on low-end devices is unmeasured.
   - Fix: consider a coarser heal threshold, or `updateRanges`.
7. **Stale docs.**
   - Handoff §9 says `labs_coverage --write` is not needed, which contradicts §1 (main.js changed and was regenerated).
   - The status "Notes for the Integrator: Apply handoff §1" is already done.
   - `road.js` says the standalone ribbon sits "at the classic heights", but it is at y 0.02 against classic 0.03 (`road.js:195`, `countryside.js meshPathClassic`).
8. **No in-repo regression test for the BiomeMask wear contract** (meadow thins / lawn stays / heals to baked). The evidence is a scratch script outside the repo.
   - Fix: propose a `tools/` test in the handoff.
9. **PR size.** About 2,000 kit lines is over the ~1,500-line guide (the lane disclosed it).

### Checks run (named risk → what I checked)

- **BiomeMask field names and lawn encoding** (`grass.js:1316-1418`)
  - Checked: lawn texels are r=0, g=lawn; meadow texels are r/g/b/a = meadow/edge/flower/wild.
  - Checked: `rectUniform` = (x0, z0, 1/size, 1/size).
  - Result: `bindWorld`'s `k = res / size` and the `r0 === 0` skip are correct. The mask is 256² over 104 m.
- **Bare-prototype terrain** (`countryside.js:669-716, 1362-1388`)
  - `terrainHeight`, `terrainSector`, `riverBedSamples` and `riverBedDepth` touch only `this._riverBed`, which the bare object creates itself. Safe.
- **Runtime tier and recompile hitch** (`runtime.js:413, 438-449`; `main.js:879-884, 1690-1712`)
  - The runtime sets `instance.tier`, so `setTier` works.
  - Automatic quality changes come only from the title-screen probe (`menu.mode === 'title'`); otherwise only the user changes quality. The `setGroundTier` recompile therefore never lands in unprompted play.
- **Merge escape** (`countryside.js:519-530`): only `matSet` materials merge, so the ground mesh keeps its `onBeforeRender`.
- **Dispose** (`runtime.js:497-500`): the runtime disposes geometry, and the instance disposes its material and field textures.
- **three r160 chunk match**: fetched `meshphysical.glsl.js` and `lights_fragment_begin.glsl.js` from unpkg@0.160.0. All 9 replace targets are present, and the shadow line matches byte for byte.
- **Wear cost**: scratch micro-bench of `field.js` (`michi-wt/_scratch/v-ground-review/bench.mjs`): 1,139 steps, live box `[74, 94, 438, 418]`, numbers as above.
- **Compare pairs**: read `path-low-12`, `path-mid-22`, `valley-ground-mid-12` and `path-shoulders-mid-12-modular`.
  - Night lantern light, cat shadow and fog look the same as classic.
  - The pebbled river bank and stone relief are real gains.
  - The lane's "noon road paler/cleaner" note is honest.

### Assessment

**Task quality:** Needs fixes

**Reasoning:** The system port is solid:
- Shader patches match r160, with fog, shadow and light parity.
- The tier gating and weather/wear paths are correct and cheap.
- Hot-file hunks are classic-neutral, and first-build cost is paid at load.

The one blocker is the restored `valley-ground` warm-build exception. It keeps a mid 5 ms cap that no reading ever needed, and it claims quiet-machine numbers without the load record R54 requires. It is a two-line fix in `budgets.js`.
