# v-fences re-review r1 (c2707e9..14582ee)

### Finding Verdicts
- **Important 1, fences unmerged InstancedMesh (draw calls)** — ADDRESSED. culm.js `bake()` (new, ~l.62-80) merges clones of the shared geometry into one indexed BufferGeometry; fence.js, corral.js, sign.js now build plain `THREE.Mesh` on `kitMaterials` (bamboo / plain), no InstancedMesh, so `_mergeStatics` can fold them. Perf delta recorded in handoff and status: draws street 763->751 (-12), meadow 735->706 (-29) (net draw calls now go down, was about +56). Measured numbers are the implementer's perf_spots run (not re-run, per instructions).
- **Minor 1, corral-sign JPGs copies** — ADDRESSED. All 8 corral-sign-*.jpg have new blobs (sizes differ from the old ones); I opened corral-sign-12-modular.jpg: a sign-framed shot (board, cap, lashings readable), not the fence overview.
- **Minor 2, handoff Materials paragraph vs R26** — ADDRESSED. handoff "Materials (R26)" is now plain: lists shared (plain cord, wood x2, paper) vs family-specific (bamboo per finish), max 5, 0 new beyond shared set.
- **Minor 3, hero end post +4 cm** — ADDRESSED. fence.js `const ph = h;` (the `h + 0.04` removed).
- **Minor 3b, far sign dark wood** — ADDRESSED as documented. Handoff "Cosmetic deviations" records it; code unchanged, accepted as cosmetic.

### Named risk: triangles +4.4-4.8% (budgets.md)
Within the D1 gates. Street high 8.504 M vs gate 1.3 x classic high = 10.56 M; meadow high 7.868 M vs 9.79 M; draw calls well under 1.2 x gates (929 / 874). If the family is ever resident at medium, medium gate is <= classic high (street 8.12 M, meadow 7.53 M): street 8.50 M would be over only if medium baseline already sat at classic-high; medium classic is lower by ~2 M (headroom table), so fine. Caveats, not blockers: (a) the lane alone takes +388k = ~16% of the street high headroom (+2.44 M) for the whole kit, and ~19% of the medium headroom (+2.05 M), under the "no more than half" target but a large single-lane share; the Integrator should budget the remaining families against what is left; (b) budgets.md's own caveat applies: merged statics are valley-wide, so this triangle cost is paid on every frame, with the shadow pass; the perf_spots figure includes it. The trade (-12/-29 draws, +4.4-4.8% tris) is the right direction given the draw-call headroom (+90 shrine high) was the tighter constraint. The hero-tier culm trim (7 radial, 3 rows) and knot trim are what held it; the shrine and river spots were not measured (fences cluster at street/meadow, so acceptable).

### New Breakage in the Fix Diff
- Minor: every fence instance now owns freshly baked geometry (not `sharedGeometry`); dispose frees it, which is correct (no leak: temp clones are disposed in `bake`). Hero culm trim (radial 7) slightly reduces roundness; cosmetic, the sign shot looks fine.
- Minor: baked-instance tint uses `rng()` in the same order as before (v then jitter), so determinism holds; part-name `culms`/`knots` kept. `mergeGeometries` import uses the import-map specifier `three/addons/...`, same as src/countryside.js:2 and foliage.js:2, so it resolves in the game; kit_check/contract/footprint claims (53 OK, 300/0, golden EQUAL) are the report's, plausible and consistent with the diff.
- Not Critical/Important: none found.

### Out-of-Scope Observations
- culm.js `bake()` assumes the source geometry has the same attribute set for every call (true here: lathe/torus with `color` only on culms).
- Status doc's AAA-7 per-asset triangle caps (12,000 hero structure) are per instance; ~14 fences at ~28k each in the aggregate delta suggests hero-tier fences may be near/over that cap when built at hero for the whole valley; the Integrator should confirm tier selection for valley fences (not checked here).

### Verdict
**Fix round:** All findings addressed, no new Critical/Important breakage.
