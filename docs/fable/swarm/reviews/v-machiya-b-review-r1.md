### Spec Compliance
- ✅ Spec compliant for the four promoted ids; village-street deferral accepted (see Risk 5).
- ⚠️ Cannot verify from diff: perf numbers, golden EQUAL, the "+3 medium / +9 high" draw attribution (needs a quiet-machine perf_spots run, G-V3); whether `buildVillageStreet` draws anything beyond its eight street-house components (I read `layoutVillageHouse`, not the street builder).

### Strengths
- Risk 1 verified against classic (src/countryside.js 2148-2250, 2298-2345, 2388-2500, 2963-3040): houses.js draws only what classic's parent draws itself. Tea house: ground/upper box, door, lower eave + 4 ledges + tutorial lip, ridge strips, upper hashira. Sill, eave beam and corner posts stay with `timber-frame`. Koushi, upper-windows, kawara-roof, noren, chochin, nest, crates, bench, engawa, namako (street-house), tatami, table, door and lock are not drawn (houses.js:1-6, 77-101). Residence omits engawa/shishi. Secret house keeps walls, tansu, door-frame backing and scroll, and omits tatami, bed, andon, door, lock and roof. Street house: base, sill, posts, eave beam, studs, step, door, no namako. No double-build found.
- Dimensions and positions match classic exactly (houses.js:80-86, 118-123, 145-152, 175-181), so the colliders, platforms and anchors from the layout stay valid. Footprint comes from the layout, so tea-house entry, secret door, lock plate and the climb platforms cannot move (Risk 3: nothing in the diff touches layout/footprint; the sample footprint is empty only for the contract build).
- Reuses the fences kit's bamboo-fence for the inuyarai (houses.js:36-42), via the kit's own builder and materials. No new materials, no Math.random/Date.now, no labs import, and the hero-only extras keep mid/far cheap. Far is one bag mesh.
- Compare notes are mostly honest. The residence pair (6) clearly shows new fascia, rafter tails and upper hashira.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
- docs/fable/status/v-machiya-b.md (Perf paragraph): the +3 medium draw delta is explained by "the reused fence's culm and knot meshes and the skirt". Both are hero-only (houses.js:93-96, 134-137). At medium they do not exist, so the explanation does not account for the +3. The likely cause is the new vertex-coloured kit bag material, plus the tile/shoji fallbacks, in a 4-id swap where classic roof components still draw. At high the +9 is only partly explained. R52 wants modular draws <= classic per tier. The 4-building-only number violates it, and the full-swap 576->510 / 781->661 is the only defensible evidence. It conflates part a's roofs and components, and was measured at load avg 8-10. Action: the Integrator re-measures on a quiet machine (G-V3) with the real swap, and the handoff reasoning is corrected.
- Risk 4 (R36) is only partly answered. The `inuyarai` group (houses.js:36-42) is a Group of fence meshes. Whether `_mergeStatics` merges them across the two instances depends on the fences-kit meshes being plain merged geometry on shared km.bamboo (the report says so, not shown in this diff). The skirt is on MAT.namako, the same material as the namako component, so it merges. Action: confirm in the quiet-machine run that hero draws with the two inuyarai are <= classic, or drop the inuyarai at hero if not.

#### Minor
- src/kit/budgets.js:55-62: `buildMs: { hero: 12 }` is granted for tea-house/residence but the `why` justifies only materials and cites no measured buildMs. The only numbers were taken on a loaded machine (the four part-a failures). Keep, but re-measure and record it, or drop buildMs.
- Compare frames (Risk 6): AAA-1 judgment is honest about tea-house (the 6h pair is dominated by a black foreground box and the cherry trunk, and differs only in the eave band and lantern). It under-states a confound. The tea-house/residence modular frames also show a visibly different shoji/koushi grid and a clipped chochin lantern (tea-house-6-modular, residence-6-modular). Those come from part-a components, not this lane's bodies, so the pairs do not isolate this lane's change. Neither the inuyarai nor the skirt appears in any frame I opened. They are untested visually, so "closes the open item" is asserted and not shown. Add one side-wall compare frame per house.
- houses.js:178-186: the street-house `post()` calls `rng()` in all tiers, so far/mid/hero consume the same draws; fine, but pass-through of the tint on the far tier (bag color) is unused. Trivial.
- Handoff/status claim "closes the AGENTS.md open item"; the skirt is only on the side/back walls (houses.js:44-50) and the fence is hero-only, so mid/far players see no skirt detail. Acceptable; reword to "hero".

### Risk checks run
1. Components: diffed houses.js geometry against classic builders for all four buildings (see Strengths): no duplication.
2. Skirt/fence/lantern item: skirt (new geometry on MAT.namako) plus the reused bamboo-fence inuyarai plus chochin hooks (bracket only; lantern itself stays the chochin component). Closed at hero; unverified visually.
3. Anchors/doors: no layout or footprint change in the diff; the door/secret door/lock/anchors live in layout components; the fence has no colliders and sits clear of crates (tea house west x=-3.95; crates at x=+4.65; residence fence east x=4.12, crates at -5.6, engawa z>=2.2 vs fence z<=1.8).
4. Draws: see Important 1-2.
5. village-street: deferral sound. `layoutVillageHouse` shows the street parent holds only street-house components (street clutter is v-alley's per the brief); an empty parent asset adds nothing and L4 permits a reasoned deferral. Brief's "add a focused street specimen" was not done; deferral covers it.
6. Compare honesty: see Minor 3; images read: tea-house-6, residence-6 (both tiers), secret-house-12-modular, street-house-6-modular.

### Assessment
**Task quality:** Approved
**Reasoning:** The buildings reuse part a's components correctly with no double-building and unchanged gameplay footprints. The open items are the unexplained +3 medium draw delta (needs a quiet-machine re-measure) and thin visual evidence for the skirt/inuyarai.
