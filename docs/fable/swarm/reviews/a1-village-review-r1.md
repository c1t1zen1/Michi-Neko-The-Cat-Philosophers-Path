# a1-village review r1 (98c3a61..09166b9, lane commits only; reviewer: Claude Opus 5.5)

### Spec Compliance

- ❌ Issues found:
  - A.1 "list every frame that breaks the bar" is incomplete, and `docs/fable/status/a1-village.md:96` ("Everything else holds at cat height") claims more than the frames show (Important 2).
  - No in-repo test covers any new behaviour (R66 equality, A.5 edges). `_common.md` requires them (Important 1).
  - A.6 "look for cheap wins ... record before/after": one win was proposed (status issue 16) but nothing was measured before or after (Minor 11).
- ⚠️ Cannot verify from the diff:
  - **R66 is not closed by the lane.** It closes only with handoff §2a + §2b plus a re-measure on a quiet machine. The lane's own A/B ran at load 1.9–4.6, and medium sits at 1.24 against the 1.25 rule, which is inside the per-boot spread.
  - **Summit sounds** need handoff §1 (mountaintop.js).
  - **Classic game_shot pairs on main** are with the Integrator's delegate.
- Done as the brief asks:
  - A.5 sink and call sites.
  - Deferred minors (each fixed or ranked with a reason).
  - G-V3 M1 (dusk paving: the L6 before/after pair shows the lavender gone) and M2.
  - Budgets: only tightened.
  - A.7 and A.8.

### R69: does a classic (default) player on main see a change? No, so no Critical

- **Emitters live only in the kit.** Every `audio.play(` in `src/` is in `src/kit/**`: garden/build.js:139,225, hidden/glade.js:175, lanterns/light.js:76, machiya/screens.js:160, water/river.js:270, nest/build.js:158.
- **Classic code does not load any touched module.** Classic modules import only `kit/runtime.js` and `kit/contract.js` (countryside.js:11, vegetation.js:9, mountaintop.js:13, characters/character.js:4, …), and the lane touches neither.
- **The main.js sink (main.js:229–268) does nothing on classic.** It defines a `listener` getter and installs a closure. It creates no AudioContext and imports nothing until an event passes every gate, and classic has 0 instances (A.7 boots).
- **Gate names checked against the code:**
  - audio.js:9 `initialized`; audio.js:33 `buses`; audio.js:43 `isRunning` (a getter that does not create a context)
  - menus.js:87 `isPlaying`
  - settings.js:4–7 master/sfx/ambient
  - main.js:55 `capture.shot`
- **No spurious purr when a save loads.** `loadGame()` runs before the first frame (main.js:489), so the nest edge cannot fire when a save is restored.

### R66 "same output"
- **The proofs are real.** Each is a byte-equality check at function level against the original code:
  - `stub/cloudfield_new.mjs` is identical to `src/kit/sky/field.js` except for the import lines (I diffed them). It was checked on 51 seeds, including `assetRng('clouds', 0..7)`.
  - The `bake_eq.js` check compares attributes, index type, userData, groups and bounds over 36 cases with random TRS.
- **The gaps:**
  - The proofs live only in `michi-wt/_scratch/`, and nothing in the repo can re-run them.
  - There is no end-to-end modular check: no game_shot pair of d97a6da against 98c3a61 on `?assets=modular`. The modular two-boot `maxDelta 0` proves the build is deterministic, not that its output is unchanged.
- **The §2a/§2b patches are safe for classic and for the boot order:**
  - §2a runs only after the `needsKit()` gate (runtime.js:211–214, 264). It keeps the generated registration order and the per-family warnings.
  - §2b fetches early only when the set is `modular`: either from the URL, or from saved settings on a saved medium/high quality. The settings key matches settings.js:1, and the quality gate matches `initialQuality` (main.js:119–125). Classic, `auto` and low never prefetch.
  - Neither patch defers a build. preload is still awaited before `assembleWorld`, so no frame renders a half-built world and nothing races the colliders or anchors.
  - Only §2c.2 (summit kit "after the first frame") would need that guard. It is a suggestion, not a patch.

### Strengths
- **The R66 family work is careful and measured:**
  - Cloud lattice tables with masked wraps. I checked that every lattice is a power of two and that cell lookups stay within the ±2 border.
  - Caustic f2 pruning with a squared bound and a margin that cannot misfire.
  - A fence bake that repeats three's per-vertex calls, including `setIndex`'s Uint16/Uint32 choice.
  - The ground's first build keeps no 17 MB snapshot.
  - Attribution and A/B by profiling, with the roots interleaved.
- **The sink holds to R50/R62:**
  - It is the one gate: shot, menu, hidden tab, autoplay lock, volumes, and falloff with distance.
  - Kindles are throttled to 0.15 s (main.js:238).
  - The pack is imported only after an event passes the gate.
  - Handoff §1 is correct: the scoped view exposes `runtime` (runtime.js ≈340).
- **The edges are designed well:**
  - `lampUpdate` is silent on its first update (light.js:72–79), so booting at night makes no sound.
  - Glade kindle edges are per lantern.
  - The noren fires on entry, with a cooldown and its cat-height exclusion.
  - The nest fires on the visibility edge.
- **Budgets were only tightened** (budgets.js:53–68); the tea-interior and mountains exceptions were correctly left to their own lanes.
- **The status file is honest about R66, and the 17 remaining issues are ranked with owners.**
- **I ran:**
  - R67: `cd cadJS && npm run check` gives `server/catalog/agent/asset modules: ok`, `16/16`.
  - `src/kit/sfx_pack.js` has no `Math.random`, `Date.now`, AudioContext, `window` or `document`, and it imports in Node.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
1. **No tests in the repo for any new behaviour, and an unused copy of the old logic shipped in src.**
   - **Where:** src/kit/fences/culm.js:65 (`bakeReference`); src/kit/sky/field.js; src/kit/hidden/pool.js:72–92; src/kit/lanterns/light.js:72–79.
   - **What's wrong:** `bakeReference` is the old baker, kept verbatim and exported, with no caller anywhere in the repo. Its only user is the scratch `bake_eq.js`. The cloud and caustic equality proofs, and the whole A.5 edge proof (`audio_check.mjs`), exist only in `_scratch`.
   - **Why it matters:** `_common.md` says "Add tests for new behaviour". Nothing stops a later edit to bake, cells or caustics from silently changing the modular world, which R66 forbids.
   - **Fix:** add focused units to `tools/kit_test.mjs`, loading three the way the cadJS check does:
     - cloudField bytes on the game seeds against a frozen hash;
     - bake == bakeReference on a few TRS cases;
     - lampUpdate: no event on the first update, one event on crossing 0.08, none while lit.

     Otherwise delete `bakeReference`.
2. **The A.1 list of frames that break the bar is incomplete.**
   - **Where:** docs/fable/status/a1-village.md:82–99.
   - **What's wrong:** I opened 14 frames. These break the bar and are not listed, and the summary at :96 says everything else holds:
     - `r1_12`: the aze bund is a smooth, untextured green slab at cat height.
     - `r1_12`, `r3_12`, `r4_12`: at noon the river reads as an opaque beige-grey sheet. It has no depth or reflection, and it is the main subject of route R2.
     - `r4_22`: at night the distant range glows pale through hard-edged gaps in a black tree line. It is brighter than the sky.
   - **Why it matters:** these rows feed the A.8 ranked issues, which the operator relies on.
   - **Fix:** add each frame with its set (both/modular, checked against a classic frame) and owner (water, rice/paddies, ranges/fog), and drop the overclaim.

   **AAA area bar, my read:**
   - The street route holds: s3 at noon, night and dusk; s6 at noon; the M1 after-frame.
   - The dusk paving still carries a heavy orange outline on every joint (s3_18.5).
   - The river route, the Moon Pool rim (r6_12 seams), the rim forest (m6_12 low-poly), dawn on the bridge (s1_6) and the secret interior (grass through the tatami) do not meet the bar. The lane lists most of these honestly.

#### Minor (Nice to Have)
1. **Nest eggs add a second merged material for the nest family.**
   - **Where:** src/kit/nest/build.js:95.
   - **What's wrong:** `km.bag({ rough: 0.4, metal: 0.1 })` is a second nest-owned merged material after `matte` (R26 allows ≤1 per family without a handoff request). It is not registered in `KIT_SHARED` (materials.js:363).
   - **Why it matters:** draw calls still hold under R52 (A.6 table), so this is a registry and ruling question only.
   - **Fix:** register the material in `KIT_SHARED` or record the request.
2. **Tipping the shishi-odoshi is voiced twice on modular.**
   - **Where:** src/kit/garden/build.js:139.
   - **What's wrong:** context_actions.js:643–646 already plays a splash and then a bell at 420 ms as the clack. On modular the kit's `garden.shishi.clack` edge sounds on top of it. This is the same double-play the lane avoided for the shrine bell.
3. **The river sound is a timer, not an edge.**
   - **Where:** src/kit/water/river.js:261–270.
   - **What's wrong:** `water.stones.flow` plays every 2.2–3.4 s while the cat is within 7 m. That is a proximity loop, not the edge R50 asks for.
   - **Fix:** it is reasonable for flowing water, but have the Integrator rule on it.
4. **The lazy moon paint only moves its cost.**
   - **Where:** src/kit/sky/night.js:444.
   - **What's wrong:** the 16–20 ms paint moves to the first frame that draws the moon: a one-time hitch at the first dusk, or on frame 1 of a night boot, counted in "ready". "None on a day boot" also relies on the first update (night.js:463) running before the first render, because `disc.visible` defaults to true.
5. **The §2a/§2b patches are not proven unchanged on modular, and their diffs cannot be applied as written.**
   - **Where:** handoff a1-village.md:35, 38–79.
   - **What's wrong:** "Neither changes what is built, in what order" is backed only by kit_test and verify. The diffs are hand-written and `git apply` cannot apply them, although real `runtime.patch` and `bootstrap.patch` files sit in the lane's scratch folder.
   - **Fix:** inline those patches, and name the proof to run after applying them: `footprint_golden --query "?assets=modular"` equal to the unpatched tree, plus a modular game_shot pair at `maxDelta 0`. §2b evaluates kit modules before main.js, so their evaluation order changes.
6. **The budget drops were measured under load, and related docs were not updated.**
   - **Where:** src/kit/budgets.js:53–68.
   - **What's wrong:**
     - The drops were measured at load 1.9–4.7, not on a quiet machine. Tightening is allowed under R54-in-reverse, but the numbers are not quiet.
     - budgets.md §5 was not updated.
     - The `distant-pagoda` hero warm-build watch-list flake (6.3–6.6 / 6 ms), which budgets.md §5 assigns to this lane, was not trimmed.
7. **Crate corner posts still share their outer side faces with the slats.**
   - **Where:** src/kit/alley/index.js:54 vs :42–43.
   - **What's wrong:** the posts' outer x/z faces are coplanar with the slat faces and ends at every corner, which risks z-fighting. This predates the lane, and the ledger item named only the tops.
8. **The noren hem band disappears from behind.**
   - **Where:** src/kit/machiya/screens.js:131.
   - **What's wrong:** the hem is now a one-sided strip 4 mm in front of the cloth, so from behind (inside the shop) it is hidden. The old box showed on both faces.
9. **The sky cell lookup could pick a different cell than the old code on exact ties.**
   - **Where:** src/kit/sky/field.js `cells()`.
   - **What's wrong:** it chooses by squared distance where the old code chose by `Math.hypot`, so a tie within one ulp could select a different cell. Equality was proven on the game seeds, so this is theoretical. A frozen-hash test (Important 1) covers it.
10. **A.4 wind proof:** the pixel diff is solid, but `env.wind` is a constant 1, so no kit wind response ever varies. The lane ranked this as issue 8; it needs main.js `assetEnv` (a hot file).
11. **A.6:** the brief asked for cheap frame-time wins with before/after numbers. None was measured; the one proposal (ground mid-tier defines) is untested.

### Assessment

**Task quality:** Needs fixes

**Reasoning:** Nothing reaches classic. The sink and edges meet R50/R62, the R66 family speedups are byte-equal where tested, and the §2a/§2b patches are safe for classic and the boot order. Two things need fixing, both cheap: the equality and edge proofs exist only in scratch (with a dead reference copy left in src), and the A.1 breaker list omits visible river-route failures while saying everything else holds.
