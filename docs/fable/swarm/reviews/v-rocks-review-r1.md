### Spec Compliance
- ❌ Issues found: L6 compare evidence for `path-boulders` is invalid. 7 of 8 classic/modular pairs are byte-identical (cmp: low-6, low-18, low-22, mid-6, mid-12, mid-18, mid-22). The ones I opened show no boulder: mid-12 is a blurred wall close-up, low-12 is grass. The report's claim at status/v-rocks.md "path-boulders code unchanged since its shots" and its AAA-1/AAA-5 judgement therefore cover only key-rock. Brief L6 requires honestly judged shots, and the swap may not even have applied in those captures.
- ⚠️ Cannot verify from diff: key hiding anchor unchanged. The layout is unchanged, but the modular main rock is centred at y 0.64 (stone.js/index.js MAIN.pos) against classic 0.58, so its top sits about 0.06 m higher. Check the key anchor still sits behind/against the rock. Collider equality is claimed from footprint_golden but not re-run by me.
- ⚠️ Handoff does not state that `layout.stoneYaw` is consumed or that rng draw counts (valley 49233) are unchanged. The report claims the latter and I did not verify it.

### Strengths
- key-rock modular compare (low-12) is a clear AAA-1 win: chiselled, mossed granite with seated companion stones, same silhouette and volume as the classic blob.
- Clean family: all randomness goes through `ctx.rng` (no Math.random/Date.now), no `labs/` imports, and all three tiers are built through the `DETAIL` and `KEY_DETAIL` tables.
- `fitRock` fits the kit rocks to the classic dodecahedron half-extents, so the colliders stay honest.
- Params are general (size/moss/weathering/facets) as the card requires for reuse by s2-clearing.
- Footprint is the layout's, with no waiver. 0 new materials (km.rock variants only). Only `src/kit/index.js` (generated) was touched among the hot files.
- Geometries are disposed after baking.

### Issues
#### Critical (Must Fix)
none
#### Important (Should Fix)
- docs/fable/status/v-rocks/path-boulders-*: shots are byte-identical classic vs modular, or frame no boulders (mid-12 wall, low-12 grass). Re-shoot with a camera that actually faces a boulder (a big rock, s>0.5, on the road), verify the images differ, and re-judge AAA-1/AAA-5 for path-boulders. Also confirm that `swap=path-boulders:modular` takes effect in those captures.
- docs/fable/status/v-rocks.md (Judgement): AAA-1/5 is written as one verdict for both assets, but only key-rock has valid evidence. Say so, or fix the shots above.
#### Minor
- src/kit/rocks/stone.js:9-10: imports `three` and `three/addons` directly. This is the same pattern as craft.js, so acceptable, but ctx.THREE is used elsewhere in the family; keep it consistent.
- src/kit/rocks/index.js (buildPathBoulders): the tilt formula `(rotation[0] % Math.PI - Math.PI/2) * 0.1` gives a fixed lean even for rotation 0..PI/2. It is harmless but unexplained.
- src/kit/rocks/index.js (MAIN.pos y 0.64 vs classic 0.58): the rock rises about 0.06 m above classic. If the anchor/collider tolerances are tight, use 0.58.
- Sample for path-boulders uses a separate inline PRNG; fine for a sample, no issue.

### Assessment
**Task quality:** Needs fixes

**Reasoning:** The code is clean and conforms to the kit contract, and the key-rock evidence is convincing. The path-boulders L6 compare is vacuous (identical or boulder-free frames), so the lane's AAA-1/AAA-5 claim for that asset is unverified.
