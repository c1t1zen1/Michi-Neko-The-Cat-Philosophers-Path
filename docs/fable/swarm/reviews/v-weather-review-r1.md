### Spec Compliance
- ✅ Spec compliant for the 8 promoted ids; the 3 deferrals are recorded.
- ⚠️ Cannot verify from diff: rain-ripples visual swap (L6 pair is byte-identical, see Important 2). Contract-test tri counting of `InstancedMesh.count` (light.js sets `mesh.count = live`); trusted via the reported 623 checks / budgets.js:26 comment.

### Strengths
- Kit systems keep the game's simulation (position buffers moved by Particles.update); look is dressed in a per-sprite shader. Classic stays untouched behind `kitHandles` (empty on classic).
- Dappled light is one InstancedMesh with per-instance colour, update allocation-free; medium tier thinning matches setDensity intent.
- Rain-ripple parts ring_1..28 match the footprint list names; `updateRainRipples` (countryside.js:983-1012) is unchanged and writes `mesh.material.opacity`/scale/position, which works on the kit rings.
- Deferral is written into the handoff (docs/fable/handoff/v-weather.md:17-18) with a concrete port plan; specimens exist (L4 satisfied).
- No Math.random/Date.now in kit; textures shared per KitMaterials set.

### Issues
#### Critical
none
#### Important
1. src/particles.js (update(), new `const dtOf = (handle) => ...`): creates a closure every frame on the classic path too. Risk 1 says "no per-frame allocation added". Behaviour is identical (calm===1 so dt passes through), but the allocation is new. Fix: make it a method `dtFor(handle, dt, calm)` or inline `const dtP = calm !== 1 && this.kitHandles.has('petals') ? dt*calm : dt`. Also `motionScale()` reads DOM classList each frame (only when kit handles exist; fine) — cache via a flag if Game.applyComfort can set one.
2. docs/fable/status/v-weather/rain-ripples-{14,18}-classic|modular.jpg: pairs are byte-identical, so L6 (compare judged honestly) is not met for this id; "live eval" is a console count of 28 rings, not a rendering. The code path is sound (above) but nothing shows a ring drawn. Fix: pin the camera on the river/pond within 24 m (or teleport the cat) and capture a frame with rings visible, or document an explicit L6 waiver in the handoff.
#### Minor
1. Risk 2: classic never reads reduce-motion for particles (grep src/: only main.js:849 toggles the class; particles.js hits are all new). So the lane did not "keep" damping, it added new damping to kit systems only (particles.js `motionScale`, sprites.js `reducedMotion`, light.js flicker). Modular and classic now differ under reduce-motion; acceptable (comfort-positive) but the report calls it parity and should say it is new. Three separate reads of the body class (particles.js, sprites.js, light.js) duplicate logic; the 0.3 / CALM constants are duplicated (particles.js:61 vs sprites.js CALM).
2. Risk 6: 28 materials is required as built. countryside.js:1005 writes `r.mesh.material.opacity` per ring, so rings fade independently; a shared material cannot do that without changing hot file countryside.js (per-instance attribute + game change). The exception (budgets.js `BUDGET_EXCEPTIONS['rain-ripples']`, cites why) is justified. Could mention in the handoff that a future InstancedMesh needs an f2 seam change.
3. Risk 5: deferral of scent/splash/landing-dust is acceptable under L4/no-seam, but the handoff only says "needs a small f3-style split"; it should list the three exact patch requests (file, function) for the Integrator so they are actionable.
4. light.js:176: pool count `live` is fixed at build, so a runtime quality change does not re-thin the pools (report admits Vegetation.setDensity does not reach them; dapplePools is empty on modular, so setDensity is a no-op there, no crash). Expose `setLive` or have update read ctx quality.
5. light.js:118-135 re-derives the Sky sun path (6.0-19.2, /sqrt(1.25)); drifts silently if Sky changes. Fine, but note a comment/test.
6. rain: report notes daylight modular rain is lighter than classic and +13 draw calls in one run are unexplained; perf rows are within noise, no action.

### Assessment
**Task quality:** Needs fixes
**Reasoning:** Kit implementation and classic isolation are sound and the contract is met, but a per-frame closure was added to the hot classic update loop against the stated constraint, and the rain-ripples compare pair is identical so L6 is unmet for that asset.
