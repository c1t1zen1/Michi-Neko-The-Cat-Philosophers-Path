# Performance Review — Michi-Neko · 道猫 (Mobile-First)

**Date:** 2026-09-09 02:38
**Scope:** Environments, textures, post-processing, world systems, gameplay loop
**Goal:** Recover frame budget on mobile browsers first, then ensure smooth + beautiful rendering on all desktop tiers — **without** hurting the image style, detail, character movement, or playability.

---

## Where the frame budget actually goes

**Current pipeline** (`src/main.js`): HDR half-float render target with **4× MSAA** + depth textures on both ping-pong buffers → `RenderPass` → `AOPass` (½-res, 8–14 samples, 2 bilateral blurs) → `AtmospherePass` (**full-res** height fog + 22-step light-shaft march) → `UnrealBloomPass` (**full window resolution**) → `OutputPass` → `GradeShader`. Quality tiers (`applyQuality`, `main.js:369`) only touch: pixel ratio, shadow size, bloom on/off, AO samples, shaft strength, fringe.

**Already good — keep as-is:**

- Procedural 256px canvas textures (tiny memory, no downloads).
- Instanced grass / bamboo / forest / rice.
- Grass on cheap `MeshLambertMaterial` with shader-side wind + player push.
- Tight 76 m shadow frustum that follows the cat.
- Per-chunk grass frustum culling; `castShadow=false` on grass.
- Adaptive pixel-ratio scaling; sensible auto-tier heuristic.

## Findings, ranked by mobile impact

### 1. Bandwidth: MSAA-4 HDR targets (biggest mobile cost)

`main.js:71-75` — 4× MSAA on a half-float HDR target, ping-ponged with a depth texture each, is brutal on tile-based mobile GPUs and adds hundreds of MB VRAM (iOS Safari context-loss risk at DPR 1.25 with the bloom chain on top). MSAA is also mostly redundant with the Grade pass's fringe/grain and bloom softening.

**Fix (no visual identity loss):** per-tier MSAA samples: low/medium **0**, high **4** — the existing AO+fog+bloom grade hides the extra aliasing. Also remove `antialias: true` from the `WebGLRenderer` (`main.js:47`) — it's ignored with EffectComposer but still allocates an MSAA default framebuffer.

### 2. Full-screen passes at full resolution

- **UnrealBloomPass** is constructed at full window size (`main.js:86`). Bloom is a low-frequency effect — constructing it at `new Vector2(w/2, h/2)` (and letting `setSize` follow) is visually near-identical and roughly halves its already-large cost.
- **Light shafts:** the 22-step depth march in `AtmospherePass` runs at full res whenever strength > 0.02 — and on medium it runs at 0.7 strength. On mobile tiers either disable shafts or add a half-res shaft variant; on high desktop keep as-is.
- **Merge `OutputPass` + `GradeShader`** into one ShaderPass (grade math applied with tone-mapping inlined) → removes one full-screen pass + buffer swap every frame.

### 3. PMREM environment re-bake every 3.5 s

`sky.js:530-534` — `pmrem.fromScene()` renders a cubemap + ~15 blur passes; on mobile that's a periodic 10–40 ms hitch every 3.5 s. The day cycle is 60 minutes — re-baking every **20–30 s** (or when the palette delta exceeds a threshold) is undetectable, and skip it entirely while inside the tea house.

### 4. Shadow map cost

- High tier uses **4096²** PCF-soft (`main.js:376`) for a frustum that's only 76 m wide — 2048 is visually indistinguishable at that texel density. Cap 4096 to only `high` + desktop-dGPU; 2048 ceiling elsewhere; low → 1024.
- The sun re-renders every castShadow object every frame, but the sun moves imperceptibly (60-min day); only the *player* moves the frustum. On medium/low, update the shadow map **every 2nd–3rd frame** (frustum move + `shadow.needsUpdate` together) — invisible in motion, halves the shadow pass.
- `shadow.radius = 3` (`sky.js:315`) does nothing with `PCFSoftShadowMap` — harmless, but consider `PCFShadowMap` + SSAO on mobile (cheaper kernel; the AO pass already grounds contacts).
- Many small props (`box()`s, lantern caps, yarn, koushi slats) cast shadows at full draw cost. Gate `castShadow` for sub-~0.3 m props on low/medium.

### 5. Bamboo CPU burn (mobile frame-rate killer)

`vegetation.js:882-892`: every frame, JS recomposes matrices for ~118 stalks + **~8,500 leaf instances** and re-uploads 3 full instanceMatrix buffers per grove. That's pure CPU + bus cost for a sway effect.

**Fix:** move bamboo sway into the vertex shader exactly like the grass already does (aPhase attribute + `uTime`/`uWind` uniforms exist). Result: identical motion, zero per-frame JS, one-time matrix upload. Likely the single biggest CPU win on mobile.

### 6. Draw calls: static architecture isn't merged

Buildings/streets are hundreds of independent `box()` meshes (65 direct `new THREE.Mesh` + the `box()` helper; each koushi window ≈ 18 separate slat/frame meshes; fences, torii, shrine, lanterns likewise). Every one pays twice (main pass + shadow pass), and there's no occlusion culling.

**Fix:** at build time, merge static geometry **per material per district** with `mergeGeometries` (they already share `MAT.*` materials — perfect merge candidates: koushi slats, fence pickets, eave tiles, wall boxes, window frames). Colliders stay separate in `this.colliders` — gameplay/collision untouched. Same applies to tree trunks/branches and canopies that share `matFoliage`/`matBlossom`/`matNeedle`; JS canopy sway (`swayables`) is *additive* to the shader wind in `foliage.js`, so merge the long-tail trees and keep swayables only for the ~15 nearest trees. Expect draw calls to fall from the hundreds into the low 100s — big win on mobile driver overhead, zero visual change.

### 7. Foliage shader pixel cost

`foliage.js` patches `MeshStandardMaterial` with ~10 `folNoise` evaluations per fragment (mottle ×3, bump ×6, crevice) for every canopy/bush/forest pixel. Beautiful, expensive. On the **low** tier: drop the bump noise octave set and one mottle octave (parameters `uBump`/`uMottle` already exist — just fewer octaves), or swap the base to Lambert for the far instanced forest/foothill woods only (they read as mass, not detail, at distance).

### 8. Interior mode still simulates the whole valley

The interior sits at `y = +100` (`interior.js:41`), and while inside, `city.update`, vegetation/particle/ambient-life updates, lantern-light selection and the full outdoor shadow pass all keep running for a scene you can't see (frustum culling saves rasterizing, not CPU/shadow-pass bookkeeping). Gate outdoor updates + particles + lantern lights + sun shadow while `interior.isInside` — inside, the room only needs its two point lights + hemi.

### 9. Per-frame allocations (GC hitching on mobile)

Small but free: `postfx.js:414/417` allocates two `new THREE.Color` per frame, `sky.js:503` one, `countryside.js:2691` two — hoist to module constants.

### 10. Expand the quality tiers (framework exists; levers don't)

`applyQuality()` should also drive (all currently fixed):

- Grass density: instanced `mesh.count` can be lowered at runtime — low: ~2,200/chunk, medium: 3,200, high: 4,600 (spread dropped instances evenly per chunk).
- Particle counts via geometry `setDrawRange` (petals/fireflies/motes/snow/rain), god-ray card count, dapple pool count.
- Lantern point lights: 4 → 2 on low (flicker/still-warm look preserved).
- Shadow cadence (§4), shafts (§2), foliage detail (§7), PMREM interval (§3).
- MSAA samples (§1).

Upgrade adaptive behavior: `updateAdaptiveResolution` currently only touches pixel ratio. Add a two-stage drop (first post-FX strengths/shafts/bloom resolution, then resolution scale), with slow re-escalation — protects low-end phones without ever touching movement or camera code.

### 11. Smaller items

- `settings.js` auto-tier uses core count; add a quick GPU string probe (`WEBGL_debug_renderer_info`) or a 2-second startup frame-rate probe to catch weak-core/high-core mismatches (e.g., older iPad Pro vs. budget Android).
- `index.html:254` `backdrop-filter: blur(3px)` — costly on mobile Safari compositing; restrict to desktop via media query or reduce blur radius on touch devices.
- `updateLanternLights` re-sorts nearest-4 spots each frame; cache + refresh on player movement > 2 m.
- Particle CPU loops (petals/fireflies/motes) are fine on desktop; on low tier halve counts rather than restructure.
- Textures are already ideal (256px canvas, mipmapped, procedural) — **no changes needed**; do not add 512px maps for "quality," they'd only hurt.

---

## Proposed plan (ordered)

### Phase 1 — mobile-critical, zero visual identity change

1. Tier-driven MSAA samples (0/0/4) + drop `antialias:true`; bloom pass at half resolution; merge OutputPass+Grade.
2. Bamboo sway → vertex shader (delete per-frame JS matrix loop).
3. PMREM re-bake interval 3.5 s → 25 s + delta-gate + skip while inside.
4. Shadow: cap 2048 on medium/auto-mobile, shadow-map cadence every 2nd frame on low/medium, no small-prop castShadow on low.
5. Gate outdoor simulation + sun shadow during interior mode.
6. Hoist per-frame `new THREE.Color` allocations.

### Phase 2 — draw-call reduction (all platforms)

7. Merge static architecture geometry per material per district (colliders/interactivity untouched).
8. Merge tree canopies/trunks where materials match; keep swayables only for nearby trees (shader wind continues everywhere).
9. Interior + yarn + prop merges.

### Phase 3 — tier depth + adaptivity

10. Expand `applyQuality()` with the levers in §10 (grass count, particle ranges, god rays, lantern lights, shafts, foliage octaves).
11. Two-stage adaptive performance mode; GPU-string/probe-based auto-tier.
12. Foliage shader LOD for far instanced woods; `backdrop-filter` gated to desktop.

### Verification (kept strict per constraint)

- Side-by-side captures at golden hour, dusk, night, rain/mist on each tier.
- `renderer.info` draw-call/triangle deltas.
- Frame-time traces (no periodic spikes after PMREM fix) on: mid-range Android Chrome, iPhone Safari, low-end integrated-graphics desktop, high-end desktop.
- Movement, jump-boost, fence-walking, drinking, bat/knockable interactions, corral event, interior transitions, and photo mode retested after each phase.

### Explicitly NOT touching

The painterly texture style, grade/vignette/grain/warmth look, cat rig and movement physics, day/night/weather systems, gameplay logic, audio.


