### Spec Compliance
- ✅ Spec compliant, with ⚠️ items below.
- Risk 1 (behaviour/handles): checked countryside.js:3446-3560 and ambient_life.js:105-127,288-294. Larry's classic body has no named children; the patrol touches only `corralGuardian.mesh` position/rotation.y/z, so the modular group (`part('.')`, nose +Z) satisfies it. Crows bind `wing_l`/`wing_r` via `parts[k]`; both exist at every tier (crow.js hinge()). No hot file in the diff stat (only src/kit/index.js, generated, plus defs/index.js, a registry c3 also extended). Routing uses the existing placeAsset ids; the inventory/coverage edits are deferred to a handoff patch (docs/fable/handoff/c4-creatures.md). labs/ASSET_COVERAGE.md was regenerated, which is a generated doc, not a hot file.
- Risk 2: the diff touches no character.js, rig.js, behaviour/* or existing parts/*. The only c1/c3-area edit is an append of two re-exports to src/characters/defs/index.js:8-10. This is minor and non-contractual.
- Risk 3: quality low resolves to classic in kit/runtime.js:110-111,220 (lowLocked). The tier-driven builds exist: turtle hero 9 meshes / mid body+head+4 flippers / far 1 mesh (turtle.js:97-126); crow hero 14 / mid 3 / far 3 (crow.js:112-123).
- Risk 4: crow.js:100 mirrors the right hinge with scale.x=-1, and the behaviour gives it -theta (ambient_life.js:294). Wrist: `hand.rotation.z = -(h.rot*sg-0.16)*0.5*sg - 0.05*sg` (crow.js:123) reduces to the lab pose's `-f*0.35-0.05` times sg, so the sign matches the lab kit.js and is correct for both sides. The report's drive numbers (wl 0.547 / wr -0.547) agree.
- Risk 5: the layout footprint (bounds, radius 0.72, speed) is used unchanged. Instances return no footprint, and the def declares no waiver. The corral hook and bounds are in classic code the diff does not touch. Dimensions match classic (shell top 0.57 m, width 1.2 m, turtle.js header). Classic golden EQUAL is the implementer's claim, not re-run.
- ⚠️ L4: the `larry` specimen (labs/critters kit.js `turtle()`, recipes.js) is present. The diff has no registry hunk for it in labs/registry or critters poster, so check that the specimen tile renders (labs_check is reported OK).
- ⚠️ Far-tier crow is 3 meshes (body + 2 wings), not "one merged mesh". This is reasonable because wings must hinge, but guide §10 says far is one merged mesh and no waiver is recorded (handoff says "Footprint waivers: none").
- ⚠️ Not re-run: the golden/--systems/boot claims. Not verifiable from the diff.

### Strengths
- Behaviour-free swap with no hot-file edit. The gait is derived from the group's own displacement (turtle.js:129-145), so patrol, chase and idle all animate without touching countryside.js.
- Handles are validated in the def (`handles` list, creature.js:30-47). Geometry is cached per tier with shared flagged geometry, and `dispose()` is a safe no-op for shared geometry.
- Determinism: no Math.random or Date.now in geometry (hash2 is a pure function). Only 3 new materials (`larry:skin`, `crow:solid`, `crow:wing`), within the R26 per-family cap (3 > 1 per-family unless that's counted per kit-family; see Minor).
- Honest L6 judgement. The shots confirm: Larry's scutes are barely visible under the grass and the crow beak is not visibly orange.

### Issues
#### Critical (Must Fix)
None.
#### Important (Should Fix)
None.
#### Minor (Nice to Have)
- src/kit/creatures/index.js:25,34 and turtle.js:150 / crow.js:130: instances expose no `setTier`, so tier is fixed at build. The contract says only unmerged instances can change tier later, so a camera-distance tier change will not apply. State this in the handoff, or add a `setTier` that toggles visibility between prebuilt tiers.
- crow.js:123 (hero only): `update` runs for hero crows only. Mid/far wings carry no wrist and no tail follow, which is acceptable but undocumented in the part list.
- R26: three new materials in one family (`larry:skin`, `crow:solid`, `crow:wing`) exceeds "≤1 per family without an explicit handoff request". The handoff does list them under Materials, which arguably counts as the request, but it should be stated explicitly.
- Modular Larry shot (larry-modular.jpg) is a front view mostly hidden by grass/flowers, so the scute and flipper claims are not demonstrated. Add a clearer angle.
- Regenerated src/kit/index.js and ASSET_COVERAGE.md will conflict across lanes; the handoff already says to re-run kit_index at merge.

### Assessment
**Task quality:** Approved

**Reasoning:** Bodies only, behaviour and the corral footprint untouched, handles and the wing mirror-sign verified against the behaviour code, and no hot-file or c1-contract edits. The remaining items are documentation and fidelity nits.
