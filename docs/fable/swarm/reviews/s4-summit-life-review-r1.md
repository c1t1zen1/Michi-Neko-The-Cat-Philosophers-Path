# s4-summit-life review r1

### Spec Compliance
- ✅ Spec compliant. 8 of 9 ids promoted; `summit-wildlife` deferred with a reason (umbrella row, classic builds nothing; handoff.md). Lab specimens added first (labs/summit/js/life.js, 8 `life-*`), L4 satisfied. No hot-file edit; no `?v=` bump; generated kit index only.
- ⚠️ Not verifiable from diff: footprint golden / contract numbers (reported 656 checks, EQUAL) and boot run; captures were viewed, tests not re-run.

### Named risks
1. Weather on entry: `SummitManager` passes `env.snow/env.wet` (mountaintop.js:360, `assets.update` at :886, same `summitWeatherAmount` value as classic). Kit snow/rain/petals leave `snowMat/rainMat/petalMat` unset, so the facade blocks (mountaintop.js:930, :960; weather.js:235) skip; each kit update self-drives from env and snaps on first frame (weather.js kit lines `first ? target : ease`). So the summit opens in the valley's state; rain-12 pair confirms visible rain in kit while classic is mid-ramp. Honoured. Side effect: kit differs from classic during the first ~second (intended, disclosed). Petals fade with snow as classic.
2. Reduce-motion: handoff patch is NOT in the diff (docs only); `src/mountaintop.js` unchanged, so classic is neutral by construction. Kit snow/rain use CALM (0.3) and petals 0.2 via `reducedMotion()` read each frame; sprite shader step also calm (sprites.js:207). Kit pollen: facade moves positions, ignoring reduce-motion on both sets (pre-existing); the kit only calms blink. Brief says "reduce-motion must still damp particles" — pollen is not damped on the kit path (flagged, accepted by classic parity; see Minor 1). Shrine ray sway also calm.
3. Exposure: light.js builds the same Hemisphere(0xbfe5ff,0x5b6638,1.15) and Directional(0xffedc2,1.1) and the vista driver overwrites intensity/colour each frame; code has no exposure/tone-mapping edit. Viewed meditation 18 and 22 classic vs modular: sky, grading, grass and cat luminance indistinguishable; differences are only particles and one butterfly. Night: modular shows a bright pink butterfly bottom-right (disclosed); classic has a large soft orb at right instead. Acceptable but see Minor 2. Four-time set exists (6/12/18/22); I looked at 18 and 22 only.
4. Reuse: imports `../weather/sprites.js` (weatherCloud, textures, reducedMotion, CALM), `../weather/rain.js` buildRain, `../critters/butterflies.js` buildButterflies, `../craft.js`. No copies of those builders. Birds are new (justified: 4 palettes vs one sparrow). Rays/pollen reuse glowTexture/sharedTexture. No `labs/` import from kit; no Math.random/Date.now (grep of source shows `ctx.rng`/seeded only; summitBox uses its own mulberry).
5. labs/summit/js/main.js: one import line plus one 2-line changed `runLab` call (spreads FAMILIES/SPECIMENS). Checked `fable/s2-clearing`: it does not touch this file, so no current conflict. s3 (recipes owner) could reorder families; the handoff documents "LIFE_FAMILY last". Low risk.
6. BUDGET_EXCEPTIONS: summit-birds mid/far meshes 12 (4 birds x body+2 wings) is justified and is the real facade pool size, but note it means mid/far are not real LODs (disclosed). shrine-rays 11 meshes/11 materials in all tiers: per-ray material opacity pulsing is how classic and the facade (`_rays` list) work, so it is justified; numbers match the code (9 shafts + bloom + pool = 11). Both carry `why`. Entries match precedent (f2 28 rings). No merged-material additions (birds use `km.shared('matte')`).

### Strengths
- No facade/hot-file edit; clever self-driving via unset material fields; the geometry-free `swarm` flag avoids the facade writing wing vertices.
- Honest disclosure of sparse preview snow, bright night butterfly, pollen reduce-motion gap, and the baseline `?assets=modular` golden difference.
- Four-time exposure captures and rain/snow pairs present; budgets numbers match code; dispose paths defined.

### Issues
#### Critical
none
#### Important
none
#### Minor
1. src/kit/summitlife/weather.js:buildPollen / src/mountaintop.js pollen block: reduce-motion does not damp pollen on either set; the brief's "must still damp particles" is only met for snow/rain/petals. Land the one-line facade patch in the integrator pass (classic-neutral only if gated on `_reducedMotion`, which defaults to OS preference: it WOULD change classic behaviour, so it needs an explicit decision, not a silent merge).
2. src/kit/summitlife/wildlife.js: butterflies read bright at night (critters emissive, meditation-22-modular bottom-right); suggest scaling emissive by sky darkness or note as a critters-lane item.
3. weather.js kit rain/snow `first` snap makes kit and classic differ for ~1 s after entry; consider documenting in the handoff for golden/compare authors.
4. src/kit/summitlife/weather.js: `buildPetals` loops all `n` without the `active()` quality clamp used for snow/rain (setQuality does not narrow petals; classic same) — fine, mention only.

### Assessment
**Task quality:** Approved
**Reasoning:** Kit path honours valley weather on entry via env, reuses weather/critters builders, leaves exposure and classic untouched, and budget exceptions are measured and justified. Only the pollen reduce-motion gap and night butterfly brightness remain, both disclosed.
