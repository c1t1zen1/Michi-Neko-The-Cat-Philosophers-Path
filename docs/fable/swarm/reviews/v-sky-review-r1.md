# v-sky review r1 (BASE 1e74cf3 → HEAD 2fcf4c7)

Reviewed in passes: the hot-file hunks first (src/sky.js, src/postfx.js, src/main.js, every line), then src/kit/sky/*, then labs/sky + docs, then the L6 JPGs. Line numbers are worktree HEAD lines.

### Spec Compliance

- ✅ Spec compliant. Promoted: `clouds`, `stars`, `moon` (src/kit/sky/index.js:20-56). The gap ids `stars` and `moon` got their specimens first (`night-stars`, `night-moon`, labs/sky/js/data.js night family, bd63379 before d153efb), which satisfies L4. The other six ids are deferred, with reasons, in docs/fable/status/v-sky.md "Deferred assets and why" and in the handoff header. The single-writer grant is recorded (b5db8e1). The main.js line was applied under the pre-review grant (src/main.js:243). The handoff has the inventory JSON, coverage rows, production row, part names and the registry diff. The kit uses no `labs/` imports and no `Math.random`. The Math.random burn loop at src/sky.js:823 is in the owner, outside the kit. Builds go through `ctx.rng`. No `?v=` tag was bumped: new imports use `20261113a`.
- Named risk 1, classic byte-identity. I read every changed classic line:
  - `constructor(scene, options = {})` and `this.assets = skyAssets(options.assets)` (src/sky.js:20,23).
  - The three `placeSkyAsset` calls keep the original order. With no runtime, a classic set or quality low, they return `classicFn()` (src/sky.js:815-817).
  - `update()` gains one guarded line (src/sky.js:802).
  - postfx gains one call (src/postfx.js:444) and one dispose line (468).
  - On classic, `syncKit` gets `kitPostHook()` → `null`, `on = false`, and `material === this.material`. It writes no uniform, swaps no material and allocates nothing (src/postfx.js:482-493). The classic shader string is untouched; the kit copy is built separately (src/postfx.js:525-535). No other code writes the atmosphere `fsQuad.material`: I grepped, and AOPass:222/225 has its own quad. So the per-frame reset at :492 cannot fight anything.
  - Check run: I re-diffed the implementer's saved captures (`_scratch/v-sky/eq/base-{6,12,18,22}.png` vs `lane-*.png`, taken 02:43 after 2fcf4c7) with `game_shot --diff`. Result: `maxDelta 0, meanDelta 0, pixelsOver8 0` at all four hours.
  - Quality low: classic at build (src/sky.js:817), dropped live (src/sky.js:844 → `dropKit`), and post stays classic (src/postfx.js:484).
- Named risk 2, summit and labs:
  - `markSkyKeepers` (src/mountaintop.js:496-503) marks `sky.stars`, `sky.moon` and `sky.clouds`. Those are the kit groups, an empty array, and the deck parented to the keeper dome (src/sky.js:826-838). `dropKit` re-marks the rebuilt classic objects (src/sky.js:873,881).
  - The summit always passes `atmosphereSettings` (src/mountaintop.js:178, src/main.js:1490), so post is classic there.
  - The summit's lights and palette code is untouched. Labs call `new Sky(scene)`, which goes to `skyAssets(undefined)` → `null` → classic (src/sky.js:896-898).
- ⚠️ Cannot verify from the diff: the summit on the modular set has no capture. The deck renders there as a dome child, but there is no shade and no sun-occlusion dimming. The controller should look at one `tools/summit_preview.html` or `?swap=clouds,stars,moon` summit frame before Phase 3. The operator should also look at the art-direction change noted in Minor 7.

### Strengths

- The classic path really is untouched. Kit selection sits behind four guards (no runtime, classic set, quality low, unregistered id). The hot-file hunks total 171 lines and are easy to audit.
- The post hook design is careful:
  - No new pass and no render target.
  - The kit shader is a copy of the classic one, built from three markers asserted to occur exactly once, so a changed classic shader can never half-apply (src/postfx.js:525-535).
  - The kit shader shares every classic uniform object, so `updateFromSky`/`render`/`setSize` drive it unchanged.
- The shade is gated off on low, on the summit and indoors (src/postfx.js:484). It fades with sun height, cover and mist (src/kit/sky/clouds.js:325). It is applied before the height fog, so far terrain fades naturally.
- `?shot=1` stream alignment (burning 26 / 2,100 draws, skipped when the runtime falls back) is correct. I counted the classic builders: 26 defs, and 5 draws per star.
- Clean degradation: `dropKit` relies on runtime `dispose()`, which removes the group from its parent and frees geometry (src/kit/runtime.js:453-467), then rebuilds classic objects. Draws are lower than classic by day at all four spots on both tiers.
- Determinism is solid: integer-hash field, seeded moon painting, per-seed caches.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
1. **Plan-mandated:** 258 lines are copied verbatim between labs/sky/js/night.js:14-272 and src/kit/sky/night.js:18-275. I diffed the two ranges; only the section separator differs. Both copies are new in this diff, and the handoff §8 asks for them to be "kept in step". The cause is the rules: kit code may not import `labs/`, and labs import game code only through the hot file `labs/shared/game.js`. The human decides. A cheap resolution: a handoff line that re-exports `starField`/`moonTexture`/`STAR_*`/`BAND_*` from `src/kit/sky/night.js` through `labs/shared/game.js`, so the lab copy can be deleted at the Integrator step.

#### Minor (Nice to Have)
1. **Stars shine through thick cloud, and the L6 judgement missed it.**
   - The code says the deck hides covered stars (src/kit/sky/night.js:10-14 "no per-star cloud test is needed"; clouds.js:319 "dense enough to hide the stars it covers").
   - But night deck alpha tops out near 0.8 × slab 0.98 ≈ 0.78, so additive stars keep about 22 % and stay plainly visible.
   - Check run: a 4× crop of `stars-22-modular.jpg` inside the big middle cloud (x 220-540, y 240-480) shows dozens of stars through the cloud body. The status reads that frame as "stars between them".
   - This is not a regression: classic stars also draw over classic sprites (transparent sort puts the Points object, centred on the cat, last).
   - Fix: push dense-core alpha toward 1 at night, or dim stars with one field fetch per star vertex. Then correct the comment and the L6 note.
2. **Night draws (named risk 4).**
   - R52 is defined at hour 10.5, clear weather (docs/fable/baseline/perf_gv1.md:17; BUILD_GUIDE_FABLE.md:345), and holds there on both tiers.
   - The night shrine +1 is disclosed. A cloudy or misty night adds one more draw when the tsukigasa ring wakes (src/kit/sky/night.js:376-386, opacity ≈ 0.03 > 0.002 under full `cloudy`). That case was not measured.
   - Classic baked its glow into the moon sprite. Folding `halo` into the disc painting (night.js:366) brings night to ≤ classic.
3. **Cloud shade is a luminance-weighted screen composite, not the studied `shade-soft` direct-light attenuation.**
   - It still darkens already-shadowed pixels at 40 % (`mix(0.4, 1.0, …)`, clouds.js:181-183). It also darkens sky reflections on water and sunlit emissive surfaces.
   - This is disclosed (report concern 3) and reasonable for a system lane that cannot hook every MAT material. Say it in research.md's promotion table so the "promoted from shade-soft" claim is exact.
4. **Possible thin seams along silhouettes.** The post-pass field lookups use implicit-derivative `texture2D` on a mipmapped texture:
   - inside the per-pixel `!sky` branch (clouds.js:171-178)
   - inside the shaft loop, which has a `break` and an early `return` (clouds.js:160-165)

   Derivatives there are undefined, and at depth discontinuities they select the coarsest mip. Inside a shade patch, roof and ridge edges against the sky could then get a 1-2 px unshaded rim. Check run: a 4× crop of the shaded left ridge in `_scratch/v-sky/l6/clouds-12-modular.png` showed no visible rim, but that ridge is far and fogged. Using `texture2DLodEXT(uCloudField, uv, 0.0)` for the post-pass fetches removes the risk for free (r160 maps it to `textureLod`).
5. **Shade moves with the cat's height.** `kitLift` uses `uCloudCenter.y`, which is the cat's y (clouds.js:172, :302). A jump or a roof climb shifts the projected shade by Δy·|sun.xz|/sun.y (≈ 1.7 m per metre at sun.y 0.5). Anchoring the deck base to a fixed world height avoids the slide.
6. **The sky never re-tiers.** No `setTier`, so when the FPS probe drops quality from high to medium (src/main.js:1694), the sky stays hero: 3 slices, 5-tap shade, and a deck test per shaft-march step (`kitSkyClear`, 22 taps). `setTier` is optional, but this is the one kit asset whose cost is per-pixel every frame. Re-tiering means swapping `post` for a new hook object (kitMaterialFor already rebuilds on hook change) and setting the `KIT_TIER`/`KIT_SLICES` defines.
7. **Art direction, for the operator.**
   - Default `coverage 0.46` fills the zenith with large, opaque cumulus even in `clear` weather. Classic deliberately left the overhead blue open: buildClouds places clouds "ABOVE the backdrop", and the lab has a step "Leave room for the blue". On clear nights it also hides much of the new star field.
   - The dusk pair (clouds-18) faces away from the sun. There the kit clouds read as bright cream cut-outs, less warm and less integrated than classic. No sun-facing dusk pair backs the "warm on the sun side at dusk" claim.
   - The slab slices show visible stacked outlines at night (moon-22-modular), more than the "faint" the self-review says.
8. **Small modular-path costs and leftovers.**
   - Five arrays plus reduce closures are allocated per frame (clouds.js:297 → `mixInto`, :187).
   - `AtmospherePass.kitMaterial`/`kitHook` stay alive after `dropKit` until the pass is disposed (postfx.js:496-515).
   - The kit material compiles lazily on the first active frame, a one-off hitch, at dawn when the game boots at night.
   - postfx reads the private `sky._interiorShadow` (postfx.js:484). `sky.envPaused`, which main.js:1467 sets alongside it, is the public twin.
9. **Lab page text is stale.** labs/sky/index.html:70 still says "24 live recipes" (now 26), and the jump nav has no link to the new `#night` family.
10. **Noise in the reported runs (not caused by this lane, still to be tracked).**
    - All-family `kit_contract_test` failed 14, then 8, on warm-build-ms checks in other families under load.
    - Every boot logs `404 /cad-overrides.json` as a console error. The report confirms the same on integration 1e74cf3.
    - The earlier report section lists boots as "errors []" with the 404 filtered out; the pre-review section corrects this.

Named risk 5 (deferrals): all six ids are recorded with reasons that hold. The hero "shafts through gaps" and the deck dimming the shafts and sun glow touch the behaviour of the deferred `atmosphere`/`god-rays` ids. They are disclosed as riding under `clouds`, which is acceptable.

Named risk 6 (size):
- About 1,690 changed lines in src/ + labs/:
  - 1,104 new kit lines
  - 171 hot-file lines
  - about 390 lab lines, of which 258 are the verbatim copy
  - 15 generated lines
- The hot-file part is small, and kit, hooks and studies only make sense together. It is reviewable as one PR, and I do not require a split.

### Assessment

**Task quality:** Approved

**Reasoning:** The classic path in src/sky.js and src/postfx.js is unchanged on screen: I re-diffed the implementer's base/lane captures myself, maxDelta 0 at four hours. Low, the summit and labs stay classic, and the kit path is well isolated and fails safe. The one Important is plan-mandated (lab↔kit copy), and the rest are Minor: the visual claims around stars-through-cloud and dusk, the untested night ring draw, the derivative/mip robustness of the shade lookups, and per-tier re-tiering.
