# v-machiya-a review r1

### Spec Compliance
- ✅ Spec compliant for the ten ids (all promoted, three tiers, params, parts, 0 new merged materials, no labs imports, no hot-file edits beyond kit/index.js regen, no tag bumps, L4 specimens for namako/tea-bench/secret-door/lock-plate in labs/machiya/js/gaps.js, 80 JPG pairs, handoff present).
- ⚠️ Live-mesh budget (KIT_LIMITS.liveMeshes.hero = 2) is exceeded by design at the street spot: see Important #1. The card note "cloth is live" is satisfied, but the budget is not.
- ⚠️ Cannot verify from diff: the perf table (tris +1.3%) and classic roof triangle counts; kit_contract/footprint results taken from the report.

### Named-risk checks
1. Secret door / lock plate. Classic (countryside.js:2672-2685, 2924): group "Secret Sliding Door" at (0,0,2.52), leaf box 2.35x2.05x0.08 centred y=1.05; lock group "Brass Lock Plate" child of the door, plate box 0.24x0.3x0.06 at (0,1.05,0.1), half-torus shackle at (0,1.2,0.1). Kit door.js:15-16,47-53 reproduces the same pivot (origin on floor at group origin, leaf centre y=1.05, plate (0,1.05,0.1), shackle (0,1.2,0.1)). Bind `.` for secretDoorMesh/lockPlate is untouched (layout, countryside.js:2435-2439); the name comes from layout.name (runtime.js:398). Gameplay reads only `lockPlate.visible=false` (countryside.js:2924) and the group is in `protectedRoots` (countryside.js:500), so it is never merged; both plate and keyhole sit in that group and hide together. Nothing in src/ translates or rotates `secretDoorMesh` (grep), so there is no hinge/slide axis to preserve; the comment door.js:2 "what gameplay slides" is inaccurate. OK. No context_actions.js reference to either handle.
2. Noren. Valley has 10 noren: tea house 1 (countryside.js:2176), secret house 1 (:2469), 8 street houses (:2982; spots :2937-2944). Classic noren is one static box merged into the scene (:2694): 0 live. Modular at high: all 10 are `near` (r<39 from origin, BAND_RADII), so all 10 build at hero, each a live un-merged cloth mesh (screens.js:~100-113) = 10 live draws (~20 with the shadow pass), vs cap hero 2 (src/kit/budgets.js:41). 5x over the whole-spot cap at the street spot (8 of the 10 are on the street). Medium/low-end: mid is static and merges, so 0 live. Only the nearest ~2 could ever be "hero (<12 m)" per budgets.md:107 (street hero band = 10 colliders), but the tier is by distance from the origin, not the cat, so the cap is not honoured. No test enforces liveMeshes (grep: only budgets.js defines it), so the green checks do not catch it.
3. Roofs. 11 kawara-roofs in the valley (3 landmark + 8 street houses); every one is `near`. High: 11 x 7,960 = 87.6k tris (about 175k with the shadow pass); medium: 11 x 4,440 = 48.8k (about 73k at x1.5). Per-asset cap (25k/6k) is met with margin; the sample is the largest real roof (roof.js sample 7.6x5.2). Street-triangle budget: 87.6k-175k is 1.1-2.2% of the classic high street mean (8.12M), so the lane stays inside the 1.3x rule. The report's net +1.3% (+102k) cannot be reconciled from the diff: the roofs alone are 88-175k before lattices/engawa/frame, so classic roof triangles (not given) must offset most of it, or part of the 11 roofs are out of frustum. Medium +0.7% (+44k) is below 11 mid roofs x1.5 (73k) for the same reason. Not a budget breach; the derivation is missing (Minor #1).
4. Generality. kawara-roof reads w, d, ridgeH, overhang from the layout with defaults (roof.js buildRoof) plus sori/ribs/onigawara/weather params: fine for b and the Roof Road, but there is no bays/hip param and the tier is chosen by position (a layout without x/z always resolves `near`, so a Roof Road lane must pass layout.band). koushi: layout w/h/count + slat/cutback/finish; noren: layout w/h/mat + panels/crest; engawa/timber-frame/namako read w/d (post arrays optional). OK for reuse.

### Strengths
- Doors/lock reproduce classic pivots and positions exactly; kit lock plate adds screws/keyhole without moving any anchor. Gameplay handle model survives (protected group, `.` binds).
- Static pieces are plain merged geometry on MAT entries or the single shared km.bag, so no new merged material; roof moves from four InstancedMeshes (unmerged) to merged meshes: draws 761 to 670 (claimed).
- Deterministic (ctx.rng only, noren phase from layout.index), clean disposal via assemble, honest weak-spot notes in the status file (roof occluded by the cherry, timber-frame mostly hidden).
- L6 pairs read: noren (3 slit panels + hem + crest vs a flat slab) and secret-door (kumiko grid, keyhole, noren split) and koushi (rear ties, cut-back) are clearly better and tonally consistent; the four sampled 12h pairs are not byte-identical.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
1. src/kit/machiya/screens.js (hero noren, `inst.live = [mesh]`) / src/kit/budgets.js:41: 10 hero live noren cloth draws at high against a hero cap of 2; classic had zero (static box). The handoff admits it but leaves the decision to the Integrator and the status file lists "1 per hero noren" without the count. Fix before merge: either (a) make the cloth static at all tiers and bake a fixed slight sway/curl (merges, 0 live), (b) keep live only for the nearest <=2 (build live for layouts the runtime marks hero by cat distance, or a param), or (c) record an explicit BUDGET exception with measured draws. Do not ship the unbounded 10.

#### Minor (Nice to Have)
1. docs/fable/status/v-machiya-a.md (Perf): per-roof classic vs kit triangle numbers and the roof count (11) are not given; the +1.3% claim cannot be checked. Add the derivation.
2. src/kit/machiya/door.js:2: comment says gameplay slides secretDoorMesh; nothing does. Fix the comment.
3. src/kit/machiya/screens.js (noren update): displaced vertices without recomputing normals/bounds; negligible at 3 cm amplitude, but note it if amplitude is raised.
4. roof.js: no `bays`/hip params named in the card ("bays, pitch, eave depth, weathering"); pitch is only via ridgeH, bays absent. Acceptable for components, flag for the Roof Road lane.

### Assessment

**Task quality:** Needs fixes

**Reasoning:** Components are faithful and gameplay-safe (pivots, binds, protected roots verified) and roof triangles are within caps, but ten always-live hero noren breach the spot live-mesh budget 5x with no test guarding it; resolve that and it is approvable.
