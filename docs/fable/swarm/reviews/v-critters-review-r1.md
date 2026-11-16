### Spec Compliance
- ✅ Spec compliant for scope: sparrows, koi, butterflies promoted (src/kit/critters/*), guardian-crows study only (labs/critters/js/recipes.js crow specimen, kit.js `crow()`), grant recorded, handoff and 30 compare JPGs present. Two deviations below (lab ids, crow rig sign) plus an unproven budget attribution.
- ⚠️ Cannot verify from diff: goldens/boot/perf numbers (reported, not re-run); koi startle on modular beyond code reading.

### Strengths
- Hot-file edit is minimal and correct: `ambient_life.js` +6 lines; `_bflyLayout` set once at build, and the `updateButterflies` early-return (only when `this.butterflies` is absent, i.e. kit swarm) does two property writes, no allocation. Classic path (`this.butterflies` set) is untouched.
- Butterflies: one InstancedMesh, flap in vertex shader, classic drift arithmetic reused, `ctx.rng` (no Math.random/Date.now). Sparrow body reuses `km.bag` (0 new merged materials, R26 met). Koi tail/pectoral pivots and part names match what the classic update drives.

### Issues
#### Critical (Must Fix)
none

#### Important (Should Fix)
- src/kit/critters/index.js:36,43 (and handoff): `lab: 'critters/sparrow'` and `'critters/koi'` are not specimen ids (real: `game-bird`/`flock`, `kohaku`/`sanke`...; labs/critters/js/recipes.js:42-46). Guide §3.3 defines `lab` as the specimen promoted from; the report/handoff admits the mismatch and defers the retarget. Fix now: `critters/flock`, `critters/sanke`.
- labs/critters/js/kit.js (crow(), `if (side < 0) hinge.scale.x = -1` and `pose()`): the comment "right hinge is mirrored so both take the same sign" is wrong. With T*R*S, scale.x=-1 then rotation.z=+θ sends the right tip DOWN while the left goes up, so `pose()` (same sh/wr on both) flaps asymmetrically. The game's guardianBirds drive opposite signs (src/ambient_life.js:293-294: wings[0]=+, wings[1]=-), which is what a mirrored hinge needs. So the study's own pose is likely wrong, and the handoff's "drop-in shoulder hinge" / "same sign" text would mislead c4. Fix: in pose() set the right hinge to the negated angles (or drop the mirror), correct the comment and handoff, and confirm with a rendered crow frame (L6 includes no crow image).

#### Minor (Nice to Have)
- koi.js:75-100: the classic koi has an ink outline (ambient_life.js:645,698-700, BackSide hull x1.09). Dropping it is a stylistic change from the game's inked look, justified only by the implementer's own "deliberate". In koi-12 pair the fish still read from the water, but classic has visible eyes and the modular fish has none visible at that distance, so it is a softer read. Consider a cheap hull on hero only, or accept with human sign-off.
- Budget (risk 4): modular high meadow is 742 vs classic 734 and the medium-modular 740 vs 734 is attributed to a "shadow-refresh frame" without evidence. The family only removes meshes (koi 144->90, sparrows 56->42, butterflies 1 draw), and the meadow is away from the river, so +6/+8 is unexplained by this family and not shown to be from it; likely a single-boot sampling difference (random ambient state). Mean 563 vs 734 passes the rule, river 622 vs 683 improves. Re-measure with 2+ boots or attribute by toggling the family only.
- Koi/butterfly modular pairs are modest steps: butterfly wings in butterflies-12-modular read as small silhouettes (one wing almost invisible, a pale one) vs classic's solid coloured dots; AAA-1 uplift is not obvious at game distance. Sparrow 6/22 pairs are identical (nothing visible), acknowledged.
- Koi hide/fin and butterfly materials are `new THREE.Mesh*Material` outside the kit material set (flagged userData.kit, never disposed). Acceptable per ambient creatures being unmerged, but they are uncounted against R26.

### Named-risk checks
1. ambient_life.js: read the hunks; classic identical, no per-frame allocation (see Strengths).
2. Ripples/startle: `spawnRipple` call at ambient_life.js:822-823 and `scatterKoi` (ambient_life.js:383, caller context_actions.js:472, pawKoi) operate on koi records built by `registerFootprint` from footprint `koi` entries with `tail`/`pectorals` parts; kit supplies those parts, so both hooks fire identically. koi use `world.spawnRipple`, a separate pool from `rainRipples`.
3. Outline: classic has one; see Minor.
4. Budget: see Minor.
5. Lab ids: see Important.
6. Crow part names documented in handoff, but rig sign issue above.

### Assessment
**Task quality:** Needs fixes

**Reasoning:** Kit assets and the hot-file hook are sound and classic-safe; the two cheap but real defects are the non-existent `lab` ids and the guardian-crow study's mirrored-hinge sign error that would mislead c4-creatures.
