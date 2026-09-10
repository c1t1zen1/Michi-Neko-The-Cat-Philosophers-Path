# Performance Review — Michi-Neko · 道猫 (Follow-up)

**Date:** 2026-09-10 02:22
**Predecessor:** `PERFORMANCE_REVIEW_2026-09-09_023812.md`
**Scope:** Verify the previous review's plan against the code as it stands, then rank what is still open, what regressed, and what was missed.
**Constraint (unchanged):** no loss of image style, detail, character movement, or playability.

---

## 1. Audit of the previous review

Phase 1 and Phase 2 landed in `28beb92` (with follow-up fixes in `d6a7e05` and `80a6898`). Phase 3 landed partially. Verified item by item against the current tree:

| § | Item | Status | Evidence |
|---|---|---|---|
| 1 | Tier-driven MSAA (0/0/4), drop `antialias` | **Done** | `main.js:49` `antialias:false`; `main.js:437-460` rebuilds ping-pong targets at the tier's sample count |
| 2 | Bloom at half resolution | **Done** | `main.js:83-86`, restored after resize at `main.js:776-779` |
| 2 | Merge `OutputPass` + `GradeShader` | **Done** | `GradeOutputShader`, one `ShaderPass` at `main.js:90` |
| 2 | Light shafts off on mobile tiers | **Done** (via disable, not a half-res variant) | `main.js:484-486` |
| 3 | PMREM re-bake 3.5 s → long interval + gate + interior skip | **Done** | `sky.js:32` `envInterval = 25`, `sky.js:53-69` delta gate, `sky.js:580-589` |
| 4 | Shadow map size cap per tier | **Done** | `main.js:460-470` — 1024 / 2048 / 4096-only-on-discrete |
| 4 | Shadow-map cadence on low/medium | **Done** | `main.js:471`, `main.js:1042-1045` |
| 4 | Small-prop `castShadow` gating | **Done** | `applySmallPropShadows`, `main.js:501-518` |
| 4 | `shadow.radius = 3` is inert under `PCFSoftShadowMap` | **Not addressed** (harmless); `PCFShadowMap` on mobile not adopted | `sky.js:362` |
| 5 | Bamboo sway → vertex shader | **Done** | `aPlant` instanced attribute, `vegetation.js:356-466`; JS loop deleted (`vegetation.js:1193`) |
| 6 | Merge static architecture | **Done, but needs rework** — see §2.4 | `countryside.js:210-303`, `interior.js:67`, `vegetation.js:170-180` |
| 7 | Foliage shader LOD on low tier | **Not done** | `foliage.js:170-192` still runs all 10 `folNoise` calls unconditionally |
| 8 | Gate outdoor simulation during interior mode | **Done** | `main.js:835-855`; shadow frustum tightened to the room, `sky.js:78-93` |
| 9 | Hoist per-frame `THREE.Color` allocations | **Partial** — the four named sites are fixed, the larger source was missed; see §2.2 | `postfx.js:470-471`, `countryside.js:17-19` |
| 10 | Grass density lever | **Done** | `vegetation.js:1146-1150` |
| 10 | Particle counts via `setDrawRange` | **Done but ineffective** — see §2.3 | `particles.js:22-35` |
| 10 | God-ray card count / dapple pool count levers | **Not done** | no tier hook on `particles.js:73-92` or `vegetation.js:270` |
| 10 | Lantern lights 4 → 2 on low | **Done but ineffective** — see §2.5 | `countryside.js:3021` |
| 10 | PMREM interval as a tier lever | **Not done** — fixed 25 s on all tiers | `sky.js:32` |
| 10 | Two-stage adaptive performance mode | **Implemented but stage 2 is unreachable** — see §2.1 | `main.js:340-389` |
| 11 | GPU-string auto-tier probe | **Done** (with a caching defect, §3.3) | `settings.js:54-71` |
| 11 | `backdrop-filter` gated to desktop | **Done** | `index.html:256-260` |
| 11 | `updateLanternLights` re-sort caching | **Done** | `countryside.js:3022-3032` |
| 11 | Particle counts halved on low tier | **Not done** — draw range only, CPU loops untouched | `particles.js:405-455` |
| 11 | "Textures are already ideal — do not add larger maps" | **Regressed after the review** — see §2.6 | `textures.js:360` |

The work that landed is solid and the two black/white-screen regressions it caused were correctly diagnosed and fixed. What follows is what is still open.

---

## 2. Findings — needs implementing or reworking

### 2.1 Adaptive resolution stage 2 is dead code (highest priority)

`main.js:340-389`. The two-stage ladder never reaches stage 2, so the framebuffer never scales down — the one mechanism that was meant to rescue a phone that is still below 45 fps after post-FX has been shed.

```js
if (this.perfStage === 0) { this.perfStage = 1; /* shed shafts + quarter bloom */ return; }
…
if (this.perfStage < 2) return;   // main.js:376 — never false
```

`perfStage` is only ever assigned `0` (`main.js:277`), `1` (`main.js:351`), or decremented (`main.js:360`). Nothing increments it past 1, so the `pixelScale` block below line 376 is unreachable. On a device that is still at 30 fps with shafts off and bloom at quarter res, the loop now does nothing further — whereas the *pre-overhaul* code scaled resolution immediately. This is a net regression on the weakest devices, which were the review's stated priority.

**Fix:** on a sustained sub-45 fps reading while `perfStage === 1`, advance to `2`; keep the existing hysteresis so it walks back down. Give stage 1 a grace period (e.g. two consecutive 2-second samples) before escalating so a single hitch does not drop resolution.

### 2.2 `resolvePalette()` runs 7× per frame and allocates ~63–126 `THREE.Color` objects per frame

`sky.js:446-470`. Every call builds a fresh object and nine `new THREE.Color()` (`sky.js:466`); during sunrise and sunset `lerpPalette` (`sky.js:437-444`) allocates nine more. Per-frame callers:

- `sky.js:546` (own update) · `main.js:845` (cat rim light) · `postfx.js:405` (atmosphere) · `foliage.js:649` · `vegetation.js:1165` · `countryside.js:3064` (far ridges) · `countryside.js:3078` (river)

That is **63 Color allocations per frame at midday and up to 126 across sunrise/sunset**, plus 7 throwaway objects — every frame, forever. §9 of the last review fixed four single-allocation sites and left the source that dwarfs them untouched. `sky.js:550` adds one more (`new THREE.Color(0xff6e30)` inside `update`).

**Fix:** memoise. Compute the palette once per frame into a persistent object owned by `Sky` (nine reused `Color` instances), keyed on a `dayTime`/`weather`/`weatherBlend` signature; `resolvePalette()` returns that object. Hoist `0xff6e30` to a module constant. Zero visual change, and it removes the single largest GC pressure source in the frame.

### 2.3 The particle budget lever saves rasterisation only — CPU and bus cost are unchanged

`particles.js:22-35` narrows `setDrawRange`, but every simulation loop iterates the **full attribute count**, not the draw range, and `needsUpdate = true` re-uploads the whole buffer:

- `particles.js:406` `for (let i = 0; i < pp.count; i++)` — 1,100 petals
- `particles.js:423` — 90 fireflies · `particles.js:436` — 140 river petals · `particles.js:448` — 70 motes
- `particles.js:375` — 900 snowflakes · `particles.js:160` — 350 rain streaks (700 vertices)

Worse, **snow and rain simulate and upload every frame regardless of weather.** `updateSnow` (`particles.js:365`) fades `snowMat.opacity` toward 0 in clear weather and then runs the full 900-particle loop and buffer upload anyway. Same for rain. Fireflies likewise run all day at `opacity = 0` (`particles.js:432`). Roughly **2,650 particle updates and six full attribute uploads per frame, most of them invisible**, on every tier.

**Fix:** (a) loop to the draw-range count, not `attributes.position.count`; (b) early-out of `updateSnow`/`updateRain` when the material's opacity is below ~0.01 *and* the target is 0 — one `needsUpdate = false` frame and the system parks; (c) same gate for fireflies against `nightness`. This is the largest remaining pure-CPU win after the bamboo fix.

### 2.4 Static merges are global, not per district — frustum and shadow culling are defeated

`countryside.js:242` merges every eligible mesh into `this.scene`, grouped by material only. `vegetation.js:170-180` does the same for long-tail tree crowns. The result is roughly one mesh per `MAT.*` entry (~40 of them) each spanning the whole **260 m** valley (`countryside.js:450`).

The draw-call win is real and worth keeping, but the merged meshes now carry a ~185 m bounding sphere, so:

- every merged architecture and canopy mesh passes the camera frustum test from every position — all vertices are transformed every frame even when the district is behind the cat;
- the same geometry is re-submitted in full on every shadow-map update, inside the 76 m sun frustum that was specifically tightened to avoid this.

The previous review specified "merge static geometry **per material per district**". The district split is the part that was dropped.

**Fix:** bucket the merge by a spatial cell (a 48–64 m grid over the valley, or the existing district groupings) before grouping by material. Expect ~4–8× more merged meshes than today — still a fraction of the pre-merge hundreds — while restoring per-cell frustum and shadow culling. Colliders and runtime-referenced objects are unaffected either way.

### 2.5 Every light in the game is evaluated in every fragment, everywhere

Currently in the scene at all times:

- 4 lantern `PointLight`s (`countryside.js:3001`) — outdoors
- 2 room `PointLight`s (`interior.js:325`, `interior.js:329`) — inside the tea house
- 3 `DirectionalLight`s: `sun`, `fill`, `bounce` (`sky.js:347`, `369`, `375`)

Three.js collects lights by `object.visible`, not by intensity. Setting `intensity = 0` — which is what `updateLanternLights` does in daylight (`countryside.js:3018`) and what the `lanternLightCount` lever does on low (`countryside.js:3036`) — leaves the light in the uniform array and in `NUM_POINT_LIGHTS`. So **every `MeshStandardMaterial` fragment in the valley runs a six-point-light + three-directional-light loop, all day, including the two tea-house lights that are 100 m above and invisible**; and the `lanternLightCount = 2` lever on the low tier saves nothing on the GPU at all.

**Fix:** toggle `light.visible` instead of zeroing intensity, at the two boundaries that already have a transition to hide the shader recompile: the interior door transition (outdoor lanterns off / room lights on, and vice versa) and the dusk/dawn kindling threshold. Build the lantern pool at the tier's count so `lanternLightCount` never needs a runtime toggle. Retire `bounce` from the scene when its intensity is 0. Going from 6+3 to 2+2 lights in the interior and 4+2 outdoors-at-night — 0+2 outdoors by day — is a straight fragment-cost cut across every lit surface, with no lighting change.

### 2.6 The cobblestone rework added the largest texture in the game (post-review regression)

`textures.js:360`: `const TILE = 256, GRID = 4, SIZE = TILE * GRID` — a **1024 × 1024** albedo plus a 1024 × 1024 normal map (`textures.js:502`). Roughly **11 MB of VRAM with mipmaps**, against ~22 MB for the whole texture set — the cobble pair alone is now about half the game's texture memory, on a valley where every other map is 256² or smaller.

The startup cost is the sharper problem: `rasterise` (`textures.js:399-421`) is 256² pixels × ~37 seeds × 5 variants ≈ **12 million `sqrt` distance evaluations**, followed by composition, `fieldToCanvas` and `heightToNormal` passes over 1,048,576 pixels each. All of it synchronous on the main thread during boot, before the first frame. On a mid-range phone this is plausibly a several-hundred-millisecond stall added to load.

This is not an argument against the visual fix — the five-pattern shuffle solved a real wallpapering problem, and dropping `TILE` to 128 would halve the pavement's texel density versus the original 256² tile, which is a genuine quality loss. The cost is in *how* it is produced, not what it produces.

**Fix, in order of preference:** (a) bake the two cobble maps once at build time and ship them as compressed images — the generator is deterministic on `seed`, so nothing about the art changes; (b) failing that, generate them in a Worker (or across `requestIdleCallback` slices) and swap the material's maps in when ready, starting on a 256² placeholder — the road is the last thing the eye resolves during the title dissolve; (c) at minimum, halve the **normal map** to 512² (normal maps tolerate it far better than albedo), saving ~4 MB and one full-size pass.

### 2.7 Player collision scans every collider ~5× per frame with per-iteration allocations

`player.js:275` takes the whole collider array — several hundred boxes, fed by per-tree (`vegetation.js:154`), per-bush (`countryside.js:2072`) and per-forest-trunk (`countryside.js:2783`) loops — and scans it linearly in four places per frame: the resolve loop up to 3 passes (`player.js:293`), the camera ray (`player.js:364`), and the camera push-out (`player.js:396`).

Each inner iteration allocates: `catBox.getCenter(new THREE.Vector3())` (`player.js:298`, `player.js:313`), `c.clone()` and `new THREE.Vector3(0.25, 0, 0.45)` (`player.js:299`), `catBox` itself rebuilt per collider (`player.js:295`), and `new THREE.Vector3()` per ray test (`player.js:367`). That is on the order of a thousand-plus `Vector3`/`Box3` allocations per frame during normal movement — the same GC-hitch class as §2.2, and it scales with world size.

**Fix:** a static uniform grid built once at load (colliders are all static), queried by the cat's cell plus neighbours, cutting each scan from hundreds to single digits. Hoist the scratch `Vector3`/`Box3` instances to module constants and hoist the `expandByVector` amount out of the loop. This is pure bookkeeping — collision behaviour, fence-walking and camera feel are untouched.

### 2.8 Foliage fragment shader still has no LOD (carried forward from §7, unchanged)

`foliage.js:177-190` runs six `folNoise` calls for the bump octaves, three for the mottle, and one for the crevice — **ten per fragment on every canopy, bush and forest pixel**, on every tier. `uBump` and `uMottle` are per-material scalars fixed at construction (`foliage.js:116-117`); zeroing them would not skip the noise, only its contribution.

**Fix:** compile-time variants. Add a `#define FOL_LOD` injected via `material.defines` and guard the second bump octave (`foliage.js:179`) and the highest mottle octave (`foliage.js:187`) behind it; rebuild the handful of foliage materials when the tier changes. On the low tier this removes four of the ten noise evaluations for free. The far instanced forest and foothill woods are the other candidate — they read as mass, not leaf detail, so a Lambert base for those sets alone would be invisible and much cheaper.

---

## 3. Smaller items

### 3.1 Module cache versions are stale — the last two commits may not reach returning players

`index.html:643` loads `src/main.js?v=20260910a`, bumped in `80a6898` (09-10 00:44). The cobblestone commit `b133f84` (09-10 01:46) then changed `countryside.js` and `textures.js` **without bumping their `?v=` query strings** (`countryside.js:7`, `vegetation.js:3`, `interior.js:6` all still import `./textures.js?v=20260909a`, and `main.js:8` still imports `./countryside.js?v=20260909a`).

A returning visitor therefore gets the new `main.js` and the **cached 09-09 `countryside.js` and `textures.js`** — the cobblestone rework does not ship, and neither would any future perf fix in those two files. Worth a pre-commit habit or a single build-time version constant rather than 27 hand-maintained query strings.

### 3.2 Bloom resolution drifts with device pixel ratio

`main.js:779` calls `this.bloom.setSize(window.innerWidth / 2, …)` in **CSS pixels**, but `EffectComposer.setSize` has already sized every pass in **device pixels** (`width × pixelRatio`). At DPR 1.0 bloom lands at the intended half of the framebuffer; at DPR 1.5 it lands at one third; at the 1.0 cap on the low tier it is half again. Harmless in cost terms (it only ever errs cheaper) but the bloom's softness silently varies by device. Multiply by `renderer.getPixelRatio()` for a consistent ratio.

### 3.3 `isDiscreteGPU()` creates a fresh WebGL context on every call

`settings.js:54-71` builds a `<canvas>` and a WebGL context each time, and never releases it via `WEBGL_lose_context`. It is called from `resolveQuality()` (`settings.js:43`) and `applyQuality()` (`main.js:460`), and `resolveQuality()` is called again from the adaptive loop (`main.js:363`). Browsers cap live contexts (commonly 16) and drop the oldest — which would be the game's own. Memoise the result in a module-level variable on first call and lose the probe context immediately.

### 3.4 `swayables` are selected by distance from the world origin, not from the cat

`vegetation.js:130` keeps per-tree JS sway for trees inside a 36 m radius **of the origin**, and bakes everything beyond into the merges. That is a reasonable static split, but it means the cat standing at the far edge of the valley is surrounded by shader-only trees while the JS sway loop keeps running on trees it cannot see. Small (the loop is short), but the selection is anchored to the wrong point; a periodic re-pick against the player, or simply accepting shader-only wind everywhere, would be more honest.

### 3.5 `barkTextures` is non-power-of-two

`textures.js:589` uses `size = 320`. WebGL2 handles NPOT mipmapping correctly so this is not a bug, but 256 would sample more predictably across drivers and cut three bark sets from ~1.1 MB to ~0.7 MB.

### 3.6 Still-inert `shadow.radius`

`sky.js:362` sets `shadow.radius = 3`, which `PCFSoftShadowMap` ignores. Carried over from the last review; still harmless, still misleading to read.

---

## 4. Plan and progress

Implemented 2026-09-10. Every item was verified in a headless Chromium
harness driving the real game: scripted collision replays, per-view draw-call
and triangle counts, deterministic screenshot diffs, and a CPU profile.
Measured results are recorded against each item; §5 records the three places
where measurement contradicted the diagnosis above and the plan changed.

### Phase 4 — correctness of what already shipped

1. ✅ **§2.1** Adaptive stage 2 made reachable. `perfStage` now advances to 2
   after two consecutive sub-45 fps samples at stage 1, and `setPerfStage()`
   restores the tier's pixel cap before walking back down so the two
   mechanisms cannot fight. The tier reset moved ahead of `onResize()`, which
   sizes bloom from the current stage.
2. ✅ **§3.1** All 34 module imports plus `index.html` unified to one version
   tag (`?v=20260910b`), so a changed file can no longer ship against a
   cached sibling. The bump command is documented in `index.html`.
3. ✅ **§3.3** `isDiscreteGPU()` memoised on first call and its probe context
   released via `WEBGL_lose_context`.
4. ✅ **§3.2** Bloom `setSize` now multiplies by the renderer's pixel ratio,
   so its share of the framebuffer no longer drifts with DPR.

### Phase 5 — CPU and GC (mobile-critical)

5. ✅ **§2.2** `resolvePalette()` computes once per frame into persistent
   buffers. Verified in-browser: two calls in a frame return the *same
   object*. 63–126 `THREE.Color` allocations per frame → **zero**.
6. ✅ **§2.3** Every particle loop now iterates its budgeted count, uploads
   only the live prefix (`uploadRange`, feature-detected across three's
   mid-r15x API rename), and snow, rain and fireflies park entirely when
   invisible — verified parked at boot. Snow reseeds around the player on the
   way back in, fixing a latent bug where it would resume 100 m away.
7. ✅ **§2.7** `ColliderGrid` broad phase (`src/collider_grid.js`). Verified
   against brute force over 3,000 randomised queries: **zero misses**.
   In-game the cat's query returns **8 boxes instead of 495**. Scratch
   `Vector3`/`Box3` hoisted to module constants.
   **Behaviour proof:** ~2,800 frames of scripted driving — into architecture
   from every direction, a sprint-and-jump pass, and a deliberate
   wall-tunnelling attempt — replayed against the pre-change build gives a
   worst-case position delta of **0.00000000**. Collision is bit-identical.

### Phase 6 — GPU

8. ✅ **§2.5** Lights switched by zone and time of day instead of dimmed to
   zero. Measured across a full cycle: noon **0 point / 2 directional**
   (was 6/3), night 4/2, inside the tea house 2/2 with the valley's lanterns
   doused, low tier 2/2 with a pool of **2** — the tier lever now changes
   what exists rather than what is turned up. The recompiles land on the door
   wipe and the dusk threshold, and are cached after the first cycle.
9. ✅ **§2.4** — **but not as diagnosed; see §5.1.** The merged statics were
   not the problem. The real cost was 30 *instanced* vegetation sets with
   ~65 m cull radii carrying 2.2 M triangles — two thirds of the scene —
   submitted whichever way the camera faced. `src/instanced_chunks.js` splits
   the heaviest of those into spatial chunks after build. Parameters swept
   empirically; `cell: 32, minTriangles: 80000` chosen. Result per view:
   **−9 % to −28 % triangles for +3 to +50 draw calls**, and a controlled
   screenshot diff of **0.02–0.11 % of pixels** (draw-order edge noise).
10. ✅ **§2.8** Foliage LOD via a real `#define FOL_LOW`, folded into the
    program cache key, flipped by `setFoliageDetail()` on the tier change:
    **10 world-space noise lookups per fragment → 6** on the low tier. The
    dropped mottle octave's weight is redistributed so average tone is
    unchanged. *Lambert for the far woods was deliberately not taken* — the
    forest is what the player sees across the valley, and flattening its
    shading is exactly the visual loss this review is not allowed to spend.

### Phase 7 — load time and memory

11. ✅ **§2.6** — **reached differently; see §5.2.** Profiling showed the
    Voronoi raster was only 12.8 % of cobble generation while `fbm`/
    `valueNoise`/`hash2` were 67 % — four noise fields over 1024², two of
    them ~20× oversampled for their own frequency content. New `fbmSampler()`
    evaluates a field on a grid sized to its finest octave and interpolates,
    falling back to direct evaluation when that would not pay. Cobble
    generation **210 ms → 132 ms (−37 %)** with a **maximum byte difference
    of 1/255**. No build-time baking and no Worker needed, so the project
    stays fully procedural.
12. ✅ **§3.6** Inert `shadow.radius` removed.
    ⛔ **§3.5** `barkTextures` deliberately left at 320². The finding's
    premise was NPOT support; the game runs on **WebGL 2.0** (verified),
    where NPOT mipmapping and repeat wrapping are fully supported. Downsizing
    would trade visible trunk detail for ~1.2 MB. Not a defect.
13. ✅ **§10 levers** God-ray cards and dapple pools are now tier-driven
    (both are additive transparent overdraw, the right thing to thin first on
    a phone), and the PMREM re-bake interval is 25 / 40 / 60 s by tier.

---

## 5. Where measurement contradicted this review

Three findings above were written from reading the code and did not survive
contact with a profiler. They are left in place rather than quietly edited,
because the corrected version is the useful record.

### 5.1 §2.4 named the wrong culprit

The claim was that scene-global static merges defeat frustum culling.
Measured: turning the camera away from the village still drops draw calls
866 → 171, so culling was working. The merged statics are **16 meshes
carrying 232 K triangles — 7 % of the scene**, and two of those are the
mountains and the ground, which were never merge products.

The actual distribution is **90 instanced meshes carrying 2.52 M of the
scene's 3.34 M triangles (75 %)**, and 30 of them have cull radii over 60 m
because their instances ring the whole valley. Those are what get submitted
in every direction. Chunking them is what the fix became. Re-bucketing the
static merges was **not** done: at 7 % of triangles it does not earn the
extra draw calls.

### 5.2 §2.6 named the wrong half of the cobble generator

The claim was ~12 M `sqrt` distance evaluations in the Voronoi raster. That
arithmetic is right but the conclusion was not: a bit-identical rewrite of
that loop (flattened seed array plus an exact squared-distance early-out)
changed the runtime by **nothing** — 211 ms → 216 ms. It was reverted.

A CPU profile put `valueNoise` at 40 %, `fbm` at 16 % and `hash2` at 11 %,
against `rasterise` at 12.8 %. The cost was the *noise fields*, not the
Voronoi. Fixing what the profile actually pointed at gave −37 %.

### 5.3 A measured number that was an artifact, not a finding

Timing every generator cold showed `plasterTextures` at **2,500–3,700 ms**
for a 256² texture — 150× its peers, and it is built three times at boot.
That looked like the single worst thing in the codebase.

Bisecting it: the noise work is 7 ms and a single `getImageData` call on a
256² canvas is **4,309 ms**. That is a headless-SwiftShader readback stall,
not real-world behaviour; on a GPU-backed canvas the same call is
sub-millisecond. **No change was made.** Recorded here so the next person to
profile in headless does not spend a day "fixing" plaster. Canvas readback
*is* worth watching on real mobile hardware, but it needs measuring there.

---

## 6. Still open

- **Static-merge spatial bucketing** — measured at 7 % of triangles (§5.1).
  Worth revisiting only if the draw-call budget changes.
- **Lambert base for the far instanced woods** (§2.8) — declined on visual
  grounds; the chunking already removed most of that geometry from the
  average frame.
- **Canvas `getImageData` in `plasterTextures`** — needs a measurement on
  real mobile hardware before anything is decided (§5.3).
- **`swayables` anchored to the world origin** (§3.4) — still origin-relative
  rather than player-relative. The loop is short; left as a known oddity.
- **Cobble texture memory** — the 1024² pair is 11.2 MB of the game's
  **38.5 MB** of texture memory (verified: the clone-per-`repeat` in
  `texturedMaterial` shares its `source`, so it costs no extra VRAM). The
  boot-time cost is addressed; the memory was left intact deliberately to
  keep the pavement detail the previous commit added.

### Verification (unchanged from the previous review, plus)

- Confirm stage 2 actually engages: throttle a desktop tab to ~30 fps and watch `pixelScale` move.
- `renderer.info.render.calls` and `.triangles` before and after §2.4, sampled facing into and away from the village — the second reading is the one that should change.
- Heap allocation profile over 60 s of walking, before and after §2.2/§2.3/§2.7; the sawtooth should flatten.
- Cold-load timing on a mid-range Android before and after §2.6.
- Movement, jump-boost, fence-walking, drinking, bat/knockable interactions, the corral event, interior transitions and photo mode retested after each phase — §2.5 and §2.7 touch systems adjacent to gameplay and deserve the full pass.

### Explicitly NOT touching

The painterly texture style, the grade/vignette/grain/warmth look, the cat rig and movement physics, the day/night/weather systems, gameplay logic, audio. Nothing above changes what any of them look like or how they feel — §2.6 in particular is a proposal about *when* the cobblestones are generated, not what they look like.
