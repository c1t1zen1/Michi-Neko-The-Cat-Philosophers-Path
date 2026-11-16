# s2-clearing review r1

### Spec Compliance
- ✅ Spec compliant on structure: 5 of 12 ids promoted, 7 deferred with reasons; family folder, lab specimens (c-stone/c-enso/c-furin/c-entry/c-path), budgets exceptions, regenerated kit index, handoff, 40 compare JPGs present. Reuse of rocks/garden/shrine/lanterns honoured. No edits to src/summit/**, mountaintop.js, index.html.
- ⚠️ Not verifiable from diff: summit colliders/platforms/binds identical and "next summit rng draw identical" (scratch-page claims; scratch page uncommitted). Controller should re-run summit_golden and a modular boot.

### Strengths
- All kit randomness is ctx.rng (approach.js, stones.js); runtime.js:316 gives it a per-asset stream (assetRng(def.id, index)), so summit this.rng (seed 20261004) is untouched. No Math.random/Date.now. Risk 2 answered: clean by construction.
- Torii reuse: pegs:false, scale 0.56 matching the 1.8 m classic pillar offset (index.js entryFootprint colliders x = s*1.8*0.56), footprint stays layout.footprint. Risk 5 ok.
- Sightline (risk 1): every promoted object is the classic's own placement (seat stone, ensō at 5.25/3.95, fūrin at 4.55/3.75/5.1, stairs on the approach axis). Nothing is planted/new and nothing is taller than classic (toro 1.5-1.62 m vs classic ~1.6); the fūrin scales a 0.185 m chime x2.4 ≈ classic 0.39 m with glass top at the layout point. No cap violation found; no new object lies in the −0.62…0.38 bearing window beyond classic's.
- Honest, specific deferrals; hot-file edits limited to the two granted; two new materials documented.

### Issues

#### Critical
none

#### Important
1. src/kit/clearing/stones.js:70-73 (buildEnso) and compare images meditation-stone-{6,12,18,22}-modular.jpg / summit-enso-*: the ensō renders as a bright near-white solid ring (MeshBasicMaterial, vertexColors 0.4/0.37/0.3, unlit). At 22:00 and 06:00 it is the brightest thing in a dark frame (stone-22-modular, stone-6-modular), i.e. it glows at night. Report says "visible but faint" and "judged honestly" (L6) — the JPGs contradict that. A weathered ink ring should be dark and low-contrast against the stone (classic is hidden). Fix: darken/tint the vertex colour or use a lit material (or modulate by sky light) and lower opacity; re-capture and re-judge.
2. src/kit/clearing/approach.js:171 `y = lowerStepTopAt(z) - 0.12` with a 0.5 m buried footing (risk 3). Classic placed the toro at `terrainHeightAt(x, z) - 0.05` (clearing.js:688); at x = ±3.15 the terrain is only partly pressed into the stair bed (terrain.js bed falloff halfWidth+2.6), so it is not equal to the step top and diverges as the landform or step count changes. Footing depth hides only a ≤0.5 m terrain-below gap and a terrain-above case would bury the base. Not robust: the layout should carry the height. Fix now (small): give the layout `lanternY: [yL, yR]` computed in clearing.js from terrainHeightAt (a summit-lane patch the Integrator can apply; classic output unchanged) and read it in buildLowerPath with the step-top fallback. At minimum, add a contract/parity assertion comparing kit y against terrainHeightAt-0.05 at both x.
3. Stone colour/size read (meditation-stone-12/18-modular vs classic): modular stone is a pale bleached beige lump, much lighter than the classic's dark earthy mass and clearly larger-looking; in the 18:00 frame it is a tan slab that stands out of the grass. Report's "stone fine" under-states a visible tonal change at the one object the seat looks at. Reduce warmRock lightness (a 0x8c7c64..0xcbbf9f -> darker/greyer) or justify.

#### Minor
1. src/kit/clearing/index.js:44-47 contract sample for meditation-stone is the path layout only; the single seat-stone branch (stones.js:46-59) has no contract coverage (report admits). Add a second sample or a test for index 0.
2. summit-trees deferral (handoff) is defensible for the layout-carried canopy buffers, but the brief said reuse the trees kit if merged; the trunk/stem could still be kit. Record explicitly as "no study, no swap" (L4) rather than a rng argument; same for slope-forest.
3. furin.js:20 thread is added to rig (scaled 2.4) so its 0.36 m length is really 0.86 m and swings with the bell; confirm intended. `parts.cord` aliases chime clapper renamed 'cord' (mutates the reused chime's part name).
4. tools/summit_preview.html has no kit runtime, so modular captures came from an uncommitted scratch copy: compare JPGs are not reproducible from the repo.
5. Perf not measured for summit (no draw delta); acceptable but noted.

### Assessment
**Task quality:** Needs fixes

**Reasoning:** Architecture, rng discipline, reuse, sightline and parity are sound, but the ensō glows white at night and the stone is visibly paler than classic, contradicting the L6 self-judgment, and the lantern height depends on a fragile buried-footing assumption that should be a layout field.
