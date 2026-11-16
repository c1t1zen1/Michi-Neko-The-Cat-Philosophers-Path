# v-water report (Worker J, Claude Opus 5.5)

Status: **DONE_WITH_CONCERNS**. Lane: v-water. Branch `fable/v-water`, base a964169. PR: https://github.com/c1t1zen1/Michi-Neko-The-Cat-Philosophers-Path/pull/38

## What was built
I built the family `src/kit/water/` from Lab 02. It has six assets. All six are promoted and none are deferred. Every footprint is the layout's own, so no waivers were needed.

- **river** (`river.js`, `field.js`, `sky.js`, `textures.js`)
  - It uses the lab's `kyoto` style: the lab's own recommendation, and the only one of its eleven styles that combines flow, depth, foam and light.
  - A CPU water field is laid out in river space (s along the centreline, u across it) as an RGBA half-float texture:
    - **R** is depth from the game's carved bed (`riverBedDepth` constants).
    - **G/B** is the current, with the thalweg moved toward the outside of each bend.
    - **A** is foam, laid by potential flow round obstacles.
  - The bridge's pier posts reach the field through `group.userData.waterObstacles`. Discovery is verified in the game: 4 posts found.
  - The shader:
    - Flow-mapped normals (Vlachos two-phase, with per-pixel phase noise) that follow the bends.
    - Beer-Lambert depth, and foam on the banks and at the piers.
    - Fresnel reflection of the sky, with a treeline colour for low rays.
    - Sun glitter, moon glints, caustics, and the classic's sparkle cells drifting with the current.
    - Rain rings from `env.wet`, and rings that follow the ripple pool.
  - The ribbon keeps the classic curve, the y = 0.02 water level and the 3.4 m half-width.
  - Light comes from the Sky dome's uniforms, found once by walking the scene. If the dome is missing, an `env.hour` fallback is used.
- **bridge** (`bridge.js`, `parts.js`)
  - A Sanjō-style beam bridge: planks on keta, two pier bents, ishigaki abutments with wing walls, a wayō kōran (seven posts, hirageta, tozuka on masu, hokogi), and bronze giboshi on the four oyabashira.
  - It uses only MAT materials, so no new merged material.
  - Gameplay surfaces match the classic exactly: deck at 1.08, rail top at 1.66 ± 0.21, ramp treads on the sloped platforms, posts at the classic z.
  - The channel under the deck and the River-Spirit Charm are left clear.
  - Roof Road sockets: `post_e_1…7`, `post_w_1…7`, `shoki`.
- **paddies, rice, paddy-bunds** (`paddies.js`)
  - The paddy sheets take a `season` param: spring, early (default), summer, autumn or winter. Snow ices them in any season.
  - Rice hills sit in transplanting rows and sway in honami waves. The rice layout only carries stalks, so the plots are recovered by clustering them.
  - The aze banks are on `KIT_SHARED.matte`, with the bed on `MAT.paddyMud` and the seki-ita board on `MAT.timberDark`.
- **water-ripples** (`ripples.js`)
  - The 24-ring pool uses crest + echo ring sprites.
  - The pool contract is unchanged: parts `ring_1…24`, each with its own material, at y = 0.045.
- **L4 gap:** `paddy-bunds` now has its own study, `water/p-aze`. It is in `labs/water/js/bunds.js`, with a gallery card, a stage option and a research note. The lab now has 29 variants.
- **Budgets:** I added two BUDGET_EXCEPTIONS to `src/kit/budgets.js`, which this lane was granted. Both match the classic counts.
  - `paddies` far tier: 4 meshes and 4 materials (the bound sheets).
  - `water-ripples`: 24 materials (the bound ring pool).

## Checks (real output)
- **kit_check:** All kit checks OK (150 passed).
- **kit_contract_test --family water:** 562 checks, 0 failed, self-test OK.
  - Triangles (hero / mid / far):

    | Asset | hero | mid | far |
    |---|---|---|---|
    | river | 1,920 | 480 | 120 |
    | bridge | 3,612 | 1,880 | 156 |
    | paddy-bunds | 1,854 | 546 | 42 |
    | rice | 12,180 | 5,172 | 916 |

  - The slowest warm build is 2.6 ms.
- **kit_contract_test, all families:** 1–2 failures, none in water. `distant-pagoda` hero warm build took 6.4–9.0 ms and once `bamboo-fence` mid took 3.3 ms. The machine's load average was 7–9 at the time. The pagoda fails the same way when run alone.
- **footprint_golden (classic):** EQUAL. **--systems:** EQUAL.
- **footprint_golden with all six ids swapped:** objects and bakes differ only. The counts match classic: 518 colliders, 65 platforms, 5 water rects, 4 exclusions, 25 anchors, rng 49233 draws.
- **Water probe:** 112,623 `isInWater` samples at three heights, plus `wadeDepthAt`, `shoreDistance` and the bridge's walkable heights, give hash `d89ce039` on both sets.
- **place_asset_test ?per=1:** PASS. 162 placements, 479/479 colliders, 67/67 ids.
- **Other static checks:**
  - check_syntax: 95 OK.
  - verify: all passed.
  - kit_test: 36/36.
  - labs_check: OK.
  - rooftop_test: 40/40.
  - `git diff --check fable/integration...HEAD`: clean.
- **Full boots** (`index.html` with session autostart): classic, `?assets=modular` (78 instances, 0 problems) and the six-id swap (9 instances) all logged nothing beyond the existing 404 for `/cad-overrides.json`.
- **L6 compare images:** 48 pairs (6 ids × 6, 12, 18 and 22 h) plus a rain pair and a snow pair, in `docs/fable/status/v-water/`. All are ≤ 113 KB and no pair is byte-identical. I looked at each one.
- **Perf at the river spot**, measured at dawn and noon on high and medium:
  - With a fixed capture frame, draw calls are the same as classic: high 311–313 / 316–318, medium 308–310 / 313–315.
  - Triangles rise by 20,280 on high and 5,068 on medium.
  - `perf_spots` (2 boots × 2 rounds, load 7–9): modular medium stays within classic high in frame time (12.35–14.40 ≤ 15.20–21.30 ms), calls (443–480 ≤ 573–665) and triangles (5.05–5.10 M ≤ 6.79–6.94 M).
  - Medium render-only time rises about 0.5–1.8 ms. The water shaders are heavier than the classic ones.

## Files changed
- **New:**
  - `src/kit/water/`: index, river, field, sky, textures, parts, bridge, paddies, ripples.
  - `labs/water/js/bunds.js`.
  - `docs/fable/status/v-water.md`, plus the 52 JPGs in `docs/fable/status/v-water/`.
  - `docs/fable/handoff/v-water.md`.
- **Edited:**
  - `src/kit/index.js` (generated).
  - `src/kit/budgets.js` (granted).
  - In `labs/water/`: `js/paddies.js`, `js/gallery.js`, `js/variants.js`, `index.html` and `research.md`.
- About 2,040 lines were added in `src/` and `labs/`, which is above the ~1,500-line guide. I kept it as one PR because the six assets share the water state.

## Concerns
1. **The light source is a hack.** The water finds the sky by looking for the Sky dome's uniform names. If v-sky renames them, the water falls back to a palette computed from the hour. An optional `assetEnv()` patch that passes the sun and palette directly is in the handoff.
2. **Two params only change shader uniforms.** For the river (clarity, flow, foam, rough, paint, colours) and the paddies (still, film), the values reach the build, but the contract hash only sees them because the material name carries the values.
3. **The look differs from classic in places.** At grazing angles and in rain, the kit water is darker than classic because it reflects the treeline. The aze banks are green where the classic ridges are brown boxes.
4. **The river's depth is tied to the ground.** It assumes the classic carve, so v-ground should keep `field.js`'s bed constants in step with any change it makes.
5. **There are more live draws than budgets.md's two per hero instance.** I listed all the water meshes in `live`: river 1, paddy sheets 4, rice 1, rings 24. This matches the classic's unmerged draws one for one.
6. **L4 order.** The bund study was added after the kit code was drafted, but before the bund look was compared or settled.

## Pre-review: env colours
Integrator ruling (R47 pattern): `src/main.js` granted in-lane.

Commits:
- 51d597b: merge `origin/fable/integration`. In `budgets.js` I kept both sides' exception rows; `src/kit/index.js` was regenerated (20 families).
- c79976f: the env change below.
- 8a10f1b: whitespace fix.

What changed:
- **`Game.assetEnv()`** now sets `env.sunDir`, a Vector3 copy of `sky.sunDir`. It also sets `env.palette = { sun, horizon, top, warm }`, Color copies of `sky.resolvePalette()`. This uses only the Sky's public API: the same values `Countryside.update()` gives the classic river.
- **`src/kit/water/sky.js`** reads env only. The Sky-dome uniform lookup and the scene walk are gone. The hour-based palette is kept only as the fallback when env lacks these values.
- **Ripple rings and pier posts** are now registered by the kit `water-ripples` and `bridge` instances on the family's shared state, and removed on dispose. Before, they were found by name in the scene. One consequence: on the classic ripple set, the water no longer bends under the rings. The rings still draw as before.
- **`src/kit/runtime.js`** is untouched.
- **`labs/ASSET_COVERAGE.md`** was regenerated: three `main.js` line links moved.

Checks (real output):
- **Goldens:**
  - `footprint_golden`: EQUAL.
  - `--systems`: EQUAL.
- **Water contract test:** 562 checks, 0 failed. PASS.
- **Static and unit checks:**
  - kit_check: 345 passed.
  - verify: All checks passed.
  - kit_test: 36/0.
  - labs_check: OK.
  - syntax: 145 modules OK.
- **Classic boot is clean.** The only message is the existing 404 for `/cad-overrides.json`; there are no warnings.
- **Swap boot:** 9 instances, 0 problems. The field has 4 obstacles. The river's `uSky` is [1, 0.672, 0.352], equal to `sky.resolvePalette().horizon`.
- **`?assets=modular` boot:** 235 instances, 0 problems.
- **Ring feedback works:** after `spawnRipple`, `uRip` holds [2.2, 31.2, 1.64, 0.64].
- **The look is unchanged.** The river pairs re-shot at 6, 12, 18 and 22 h are byte-identical under `cmp` to the committed L6 pairs (8/8). I read the four modular frames.

## Fix round 1
Commits:
- f16ed98: merge `origin/fable/integration`. `src/kit/index.js` was regenerated (21 families).
- 899a5ca: the fixes below.
- c0c0727: whitespace.

**Important 1: the oyabashira stood in the rail line.**
- The rails now end at z ±4.2, where the walkable rail ends.
- The four oyabashira stand outboard at the corners: centre |x| 1.66, z ±4.2. Each post covers |x| 1.575–1.745, which is 0.125 m clear of the rail band (1.03–1.45). They sit on stone footings of kerb height (0.18 m).
- The giboshi caps and the r6 sockets are unchanged. No colliders were added.

**Important 2: the wing walls stood on the bank beside the ramps.**
- The stone wedges are gone.
- The retaining stone is now a skirt inside the ramp band (|x| 1.16–1.30), below the tread.
- Beside each ramp, only a 0.20 m kerb rises (classic: 0.22 m).
- The abutment end walls are cut to |x| ≤ 1.30.

**Found by the probe and fixed:** the last ramp tread spanned the platform's kink and stood up to 2 cm above the platform. The treads now follow the slope to the kink, then a flat tread runs to 2.6 m.

**Walk-volume probe.** I built the kit bridge at each tier and tested every triangle against these walk volumes with `Box3.intersectsTriangle` (volumes shrunk 5 mm so a flush face is not counted), plus 1 cm raycasts down each ramp:

| Volume | Extent |
|---|---|
| Rails | z ±4.45, y 1.67–2.01 |
| Deck | |x| ≤ 1.16 |
| Ramps | 1.2 cm to 0.35 m above the tread |
| Banks beside the ramps | |x| 1.30–2.20, y 0.23–0.60 |
| Swim channel | |x| ≤ 1.05, y up to 0.42 |

Results:
- **Before (8a10f1b):**
  - The rails were hit by koran and giboshi.
  - The ramps were hit by koran.
  - The banks were hit by koran and abutment stone (x 0.78–1.54, y up to 1.80).
  - The swim channel was hit by frame.
  - The ramp surface rose up to 0.611 m above the platform.
- **After (hero, mid, far):**
  - Rails, deck, ramps and swim channel are clear.
  - The only solids beside the ramps are the four corner posts, which is the outboard placement the review asked for.
  - The ramp surface sits at most 0.0000 m above the platform (hero and mid) and 0.0033 m (far).

**Minors:**
- **Rain:** no doubling. The visible rain rings belong to the rain-ripples pool. The kit water's rain is now only a faint pocking.
- **Ring coupling:** stated in the AAA row and in the handoff (swap matrix note).
- **Grazing sheen:** lifted, with an opacity floor in the shallows. There is a new cat-height `river-along` pair.
- **Recorded in the status file:** the L6 cameras and the gameplay-probe command line.
- **Renames and fixes:**
  - `waterShared` rename.
  - Obstacle registry versioning.
  - `getWorldPosition` for ring positions.
  - The `floating` list now has 24 rings.
  - The handoff now says 21 families.
- **Piers:** moved under the deck edges (x ±1.2).
- **Handoff requests:** a shared `sunDirAt`, and an optional patch to carry rice plot rects in the layout.

Checks (real output):
- **Water contract test:** 562 checks, 0 failed. PASS.
- **footprint_golden:** EQUAL. **--systems:** EQUAL.
- **Swap golden:** differs in objects and bakes only. Counts match classic: 518 colliders, 65 platforms, 5 water rects, 4 exclusions, 25 anchors, rng 49233.
- **Gameplay probe:** hash `d89ce039` on both sets (112,623 samples, 65 platforms).
- **Static checks:**
  - verify: All checks passed.
  - kit_check: 367 OK.
  - kit_test: 36/0.
  - labs_check: OK.
  - rooftop_test: 40/0.
  - syntax: 149 OK.
  - `git diff --check origin/fable/integration...HEAD`: clean.
- **Boots:**
  - classic: 0 problems.
  - Six-id swap: 9 instances, 4 pier obstacles in the field.
  - `?assets=modular`: 241 instances, 0 problems.
  - All three logged only the existing cad-overrides 404.
- **Compare images:** all modular frames re-shot (60 JPGs, ≤ 111 KB, no pair byte-identical). I read bridge 6/12/18/22, river-along 12 (both sets) and 18, river 12, and river-rain 12.
