# v-greenery review r1 (BASE a2efa7a, HEAD 3388763)

### Spec Compliance
- ❌ Issues found (one Important: per-asset triangle budget not met for the real grove; the sample used by the contract test hides it).
- ⚠️ Cannot verify from diff: classic and `--systems` footprint golden EQUAL (status file only; I did not re-run), draw/tri numbers (status only).

### Strengths
- Footprint untouched (no waiver); bamboo builder takes the already-laid-out `layout` and in the group's local frame (bamboo.js bambooGrove, ox/oz subtraction), so exclusion rects registered by `Vegetation.layoutBambooGrove` cannot change. Culm builder is parametric (`culmGeometry`) for glade-bamboo reuse.
- Determinism: only `ctx.rng` (bushes.js, moss); sample grove has its own seeded rng. No labs imports. `bushes.material` kept as one shared foliage material so rustle binding survives.
- L6: 48 JPGs (24 pairs, 960x600, all <=150 KB), none byte-identical under `cmp`. Judgement of roadside-moss is honest.

### Issues
#### Critical
none
#### Important
1. src/kit/greenery/bamboo.js:`bambooGrove` / index.js `sample: () => sampleGrove(2)` — per-asset triangle caps (25k/6k/1k, counted per instance incl. instances, budgets.js:25-34) are exceeded by the real groves and no BUDGET_EXCEPTIONS entry or waiver is recorded. Real groves are radius 7 (78 culms) and 5 (40) (vegetation.js:90,95; count = floor(r*r*1.6)). Hero: each culm is two 12x4-ring x 7-side lathes = about 1344 tris, so about 105k culm tris for r=7, plus about 73k leaf tris, around 178k against 25k. Mid: about 28k culm + leaves against 6k. Far leaves about 13k against 1k. The contract test passes only because the sample is 6 culms. Fix: record an explicit budget exception (with the measured per-grove counts) in the handoff and BUDGET_EXCEPTIONS (Integrator), or cut hero/mid nodes; make the sample grove representative (radius 5-7) so the check means something.
2. Draw delta unexplained: handoff says "3 draws per grove, same as classic", but status measures bamboo-groves alone +22 calls at street (782 vs 760), -3 at meadow. R36 requires the instanced delta be measured AND recorded; it is recorded, but the cause is not stated (likely `lower` InstancedMesh now casting shadow / culling differences, castShadow on lower at bamboo.js `lower.castShadow = true`, and the per-grove 4 private sway materials/depth programs). State the cause or fix. Within budget regardless: 782 <= 929 (1.2x high), 8.44M <= 10.56M (1.3x). Only high was measured; medium (modular medium must be <= classic high 774 calls at street) was not, and 782 > 774 would fail if medium behaves like high. Measure medium.

#### Minor
- Handoff/status call `km.bamboo` a new "merged" material, but it sits on an InstancedMesh (bamboo.js lower), which `_mergeStatics` skips; it adds a MAT-table key, not a merged draw. Truthful count for greenery is 1 merged (`km.moss`) + 1 instanced km.bamboo.
- bushes.js: creates a new `createFoliageMaterial` per asset instance with no memo; fine for 1 street build but dispose of `mat` only, geometries (freeGeo/clipGeo) are not disposed.
- Bamboo L6 pair (bamboo-groves-low-12) is nearly indistinguishable at cat height; nodes barely read. AAA-1 claim "culms show nodes and bands up close" is generous. Bush pair (street-bushes-mid-12) reads as a real change (lumpy cushions), but the modular bush appears to cast a weaker ground shadow than classic.
- roadside-moss visibly equals classic under the grass; a ground-level moss compare off the grass would be more honest evidence, but it is acknowledged.

### Risk checks
1. Materials (R26 / kit-wide <=11). Source: `src/kit/materials.js` `_once` memoises per (name + args) and every distinct arg set is a separate material and MAT key; integration HEAD 48ab078. Count of distinct kit materials the merged families create by default:
   - rocks: km.rock x2 (stone, stoneDark; moss/lichen params) = 2
   - lanterns: km.stone() = 1 (lacquer only in fallbacks)
   - fences: bamboo(finish, vcol) 1 (up to 3 by finish), plain cord 1, wood x2, paper 1 = 5 (handoff admits 5)
   - garden: stone(tint), bamboo(age colour), stem(age colour), paper(washi) = 4 (handoff says "0 new"; age-varied colours can add more)
   - alley: km.bag 1
   Strict arg-level total already 13 (rocks 2 + lanterns 1 + fences 5 + garden 4 + alley 1), above 11 before greenery. Counting by factory/family claims (rocks 2, lanterns 1, fences 0, garden 0, alley 1 = 4), greenery's two (km.moss merged, km.bamboo instanced-only) gives 6 and stays <=11. Verdict: two here keeps the kit <=11 on the family-claim count and does not on the strict arg-level count; but the strict count is already over without greenery, so that is an Integrator-level reconciliation (garden/fences sharing km.bamboo/paper/plain args), not this lane's. Since km.bamboo here is not merged, I recommend granting km.moss as the lane's one and not counting km.bamboo (or reuse fences' `km.bamboo({vcol:true, rough:0.5, color:FINISHES.fresh})` args to add zero).
2. Grass exclusions: modular bamboo uses `layout` positions/x/z only; footprint = layout.footprint, no builder registers rects. Status claims classic and `--systems` golden EQUAL and modular grove diffs only replaced meshes with rng unchanged; consistent with the code, not re-run by me.
3. R36 / budgets: instancing is used for culms and leaves (as classic) and delta is measured and recorded (+22 calls, +4.8% tris at street), within the high cap; unexplained (item 2) and medium unmeasured. Street/moss/bush merge/draw behavior fine (moss is plain merged geometry on km.moss; bushes remain instanced, +1 draw).

### Assessment
**Task quality:** Needs fixes

**Reasoning:** Clean, deterministic, footprint-neutral port with honest L6, but the real grove blows the per-asset triangle budget with no recorded exception (masked by a 6-culm sample), and the +22 street draw delta and medium tier are unexplained/unmeasured. The material request is the Integrator's call (counts above).
