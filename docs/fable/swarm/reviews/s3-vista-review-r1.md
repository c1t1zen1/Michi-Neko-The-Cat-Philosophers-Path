# s3-vista review r1

### Spec Compliance
- ✅ Spec compliant. Nine of ten ids promoted. `summit-clouds` is deferred with a reason. `blender-roofscape` is out of scope, as the brief says. Family `src/kit/vista/` exists, with Summit Lab specimens `v-*` in `labs/summit/js/vista.js` (L4) and compare JPGs at 6/12/18/22 for every id plus `meditation-*` (L6; 80 files).
- No kit file imports from `labs/` and none uses `Math.random` or `Date.now` (grep over `src/kit/vista/*.js`; the only `labs/` hit is a comment at `index.js:4`). Every random draw goes through `ctx.rng` or `seeded(seedOf(rng))`.
- Hot files edited: only `src/kit/budgets.js` and the generated `src/kit/index.js`, as the handoff says. No `?v=` bump and no `src/summit/**` change, which fits the "classic unchanged" constraint.
- ⚠️ Cannot verify from the diff: warm `buildMs` (R54 ruling; re-measure at G-V3 on a quiet machine). The golden, parity and summit_test results are claimed by the report and not re-run here.
- ⚠️ Compare images were reviewed at dawn, dusk and night. See Risks 1 to 6 below.

### Strengths
- Reuse is real. `landmark.js:17` imports `buildPagoda` from `../pagoda/build.js` with preset `yasaka`. `horizon.js:481` imports `ridgeRingGeometry` from `../ranges/landform.js`. Neither is copied.
- The anchor contract is a clean seam. Each asset returns `footprint.anchors` in the classic field names and shapes. `setQuality` (`mountaintop.js:378`) and `updateVistaEnvironment` (`vista.js:1339-1378`) null-guard the fields, so hero-only eaves and the missing fields are safe. The pagoda uses `{color, emissive, emissiveIntensity, roughness}` proxies that `follow()` folds into its one vertex-coloured material (`landmark.js:56-66`). That keeps the summit's per-frame palette driving the tower without touching `vista.js`.
- `ground.js` samples `terrainHeightAt` on a plain object. Its transitive dependencies are `landHeightAt`, `vistaGroundHeight` and `approachSupportAt`, all pure helpers. `perchLocal` is only read by `perchSightlineAt`, which the kit does not call. Nothing is written to the landform.
- Budget exceptions are scoped per tier and carry measured numbers. The lane reverted its buildMs allowances (R54). Zero new merged materials, which fits R26.
- Honest in-game perf table: tris are equal to classic at high, and draw calls fall about 40%.

### Risks (named by the Integrator)
1. **Protected view.** In `meditation-{6,18,22}` the modular frame keeps the city, bay, bridge, torii and ranges in the same places, and nothing new sits in the view window.
   - At dusk the roofs show ridges and eaves, the pagoda is legible, and the bridge now has towers and suspension cables where classic has a bar and poles. The ranges are slightly more shaped. Reads better than classic.
   - At dawn the modular bridge and city are marginally more readable.
   - At night the modular city is only a little better than classic. The lit-window wave is faint at the seat. Pinpricks show at `kyoto-city-22-modular`, and the pagoda is a dark silhouette. The bridge cables are an improvement. See Minor 1.
2. **Waivers and anchors.** The waivers are honest: the colliders and platforms are the classic empty ones, and the one extra thing is the anchors. They are arguably unnecessary, since `anchors` is a contract field (`contract.js:337`). That is no harm. The parity tool and golden are reported EQUAL on classic and modular, and the null guards above make a throw unlikely.
3. **Terrain.** Unchanged. See Strengths.
4. **Reuse.** Confirmed at `landmark.js:17` and `horizon.js:481`. See Strengths.
5. **BUDGET_EXCEPTIONS.** Justified, with measured numbers in each `why` (`budgets.js` +19). The far-tier numbers are the weak part. See Minor 2.
6. **GLB roofscape fallback.** The diff touches nothing under `src/summit/**`, `assets/` or `mountaintop.js`.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)
1. `src/kit/vista/city.js:365-369` (window-light wave) and the night compares. The lit city is the brief's headline wave. At the seat at 22:00 it adds little over classic (faint dots). If the wave threshold `smoothstep(vWave*0.5, +0.3, opacity*1.4)` only completes near full opacity, consider a stronger point size or opacity curve. The report's own AAA note says the city "reads the same". The judgement is honest; it is not a defect.
2. `budgets.js:115`. `kyoto-city` far is allowed 12,000 tris (limit 1k) and is really just fewer houses (460), not a coarser LOD. The handoff says the summit builds hero and mid only, so this is benign. If a far tier is ever really used at 2 km, it should merge or impostor.
3. `ground.js:422` and `index.js:560` import `../../summit/terrain.js` and `../../summit/common.js` into the kit, which reverses the kit-to-game layering. This is read-only and disclosed in the handoff (open ask: put `heightAt` on layouts). It stays a coupling to a hot file.
4. `landmark.js:56-66`. The `follow()` heuristic (luminance 0.62, 2.2 emissive factor) approximates the classic three-material lighting for the pagoda. In rain or storm the match is approximate. Acceptable, but cover it with a visual check at G-V3.
5. `city.js` draws house positions from `ctx.rng`, not the summit's layout stream. The kit city's lot layout therefore differs from classic (only counts and total density match). This is acceptable under parity EQUAL, which checks the colliders and the rng, not the instance positions.

### Assessment

**Task quality:** Approved

**Reasoning:** A clean, contract-faithful family that reuses the pagoda and ranges kits read-only, leaves the landform and classic untouched, and keeps the protected view clear, with an honest and measured budget story. The only soft spot is that the night lit-city is hardly improved at the seat.
