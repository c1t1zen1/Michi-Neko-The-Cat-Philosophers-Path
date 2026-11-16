# v-fences review r1 (4273c90..4d34a74)

### Spec Compliance
- ✅ Spec compliant. Three ids promoted (bamboo-fence, corral, corral-sign) with parts, hero/mid/far, params with ranges, footprint left to `layout.footprint` (no waivers), L4 specimen `corral-sign` added (labs/fences/js/sign.js, recipes.js), handoff and status present, no hot file edited except the generated `src/kit/index.js` and `labs/ASSET_COVERAGE.md` (both regenerated, disclosed). No `labs/` import in `src/kit/fences`, no `Math.random`/`Date.now`, no tag bump (new imports use 20261113a).
- Corral builds only its own body (corner posts + lashings; src/kit/fences/corral.js:28-50), components (fences, sign, Jade Paw, Larry) left to countryside. Matches card note; Larry's patrol bounds untouched.
- ⚠️ Cannot verify from diff: kit_check / contract (300 checks) / footprint golden results are the implementer's claims; per-lane material count vs R26 (bamboo, plain, wood x2, paper, see Minor 2) depends on which `KitMaterials` entries already exist; whole-frame draw-call effect (see Important 1) needs `tools/perf_spots.mjs`.

### Strengths
- One cached unit-culm LatheGeometry per tier shared by every fence/post/sign, flagged `sharedGeometry` so dispose() never frees it (culm.js:19-50). Far tier is a 2-ring cone, hero has node swells and vertex-colour darkening.
- Fence geometry derives verticals, tilts, length, height from the layout, so colliders/platform/bambooFences stay identical (fence.js:21-40); tilt pivot compensation keeps slats where classic put them (fence.js:50-55).
- Visual quality is real: I opened bamboo-fence-12 classic vs modular and corral-12 modular. Modular shows swollen nodes, straw tone with per-culm variation, cord lashings, ridge-capped sign with lit face; the corral overview shows corner posts tying the runs. Same silhouette and placement. The status file's AAA-1/AAA-5 verdict (richer up close, lighter at dusk silhouette) is honest.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
1. Draw-call cost (named risk). `src/countryside.js:519` shows `_mergeStatics` skips InstancedMesh, so every modular fence is 2 permanent draws (culms fence.js:57, knots fence.js:81) plus 2 more in the shadow pass (both `castShadow`), instead of joining classic's merged aggregates. Count: the corral places 4 fences (countryside.js:3331-3334) and `village-gap` places one per house pair on each side (countryside.js:3175-3193); the implementer and golden agree on ~14 fences, i.e. about 28 unmerged draws (+28 shadow), 28 new objects vs only 11 aggregates removed (footprint golden: objects +28, aggregates -11). Plus corral posts and lashings (2 each corral) and sign lashing. Against budgets: per-asset `meshes` budget (2 vs 16/8/3) passes AAA-7 as written, but AAA-7 never sees the world total; the kit's whole headroom at shrine/high is only +90 draws (budgets.md, headroom table), river medium +104, and the village street is where the fences cluster. Nothing in this lane measures it. Fix options: (a) run `node tools/perf_spots.mjs --url-suffix "" --url-suffix "?assets=modular&swap=bamboo-fence:modular,corral:modular,corral-sign:modular"` at street/meadow and put the draw delta in the status file; (b) cut to 1 draw per fence by dropping `knots` to a single merged-into-culms geometry or turning off knot `castShadow`; (c) have the fence share one InstancedMesh across all fences (needs Integrator/countryside support, so a handoff note). At minimum a handoff line to the Integrator that this is a +~28/+56 draw item to be judged by the same-session perf run.

#### Minor (Nice to Have)
1. L6 evidence for `corral-sign` is not independent: all 8 `corral-sign-*` JPGs are byte-identical to the `bamboo-fence-*` ones (same blob ids in the diff, md5 of bamboo-fence-12-modular == corral-sign-12-modular). They do show the sign, but they are copies and the status file does not say so. State it, or take a closer sign-only cam (sign face, board at 0.35 m).
2. docs/fable/handoff/v-fences.md "Materials" paragraph is muddled (a stream-of-consciousness question about R26 with "4 ... 5th"). State plainly which `KitMaterials` entries are used (bamboo straw/fresh/weathered tint, plain, wood x2, paper) and which are new vs shared with other lanes; the three bamboo finishes mean up to 3 bamboo materials if different fences use different `finish` (default is only straw).
3. Tier shape: `bamboo-fence` hero adds a 0.04 m taller end post only at hero (fence.js:44) and corral-sign far swaps bamboo for dark wood; harmless, but the far/mid silhouette no longer matches hero by 4 cm. Cosmetic.
4. labs/fences/js/sign.js duplicates the face-texture code in src/kit/fences/sign.js:10-21 (unavoidable under the no-labs-import rule; fine, but comment in sign.js should point to it, which it does).

### Assessment

**Task quality:** Needs fixes

**Reasoning:** The kit is correct, deterministic, footprint-safe and visibly better at cat height, and the lane honestly disclosed the draw-call concern, but it ships ~28 unmerged instanced draws (+28 shadow) with no measured whole-frame cost and no handoff note against a tight 90-155 call kit headroom; measure it (or reduce to 1 draw per fence) before merge. The kit_test fixture failure is the Integrator's and not counted.
