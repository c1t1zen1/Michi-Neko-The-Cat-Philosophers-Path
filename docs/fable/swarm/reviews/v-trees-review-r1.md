### Spec Compliance

- ❌ Issues found:
  - `tree-trunks` / `tree-canopies` are claimed promoted with no compare pair and no matching lab specimen (L4/L6, see Important 1).
  - The AAA-1 "better than classic" claim is not borne out by the sakura and maple noon and dusk pairs (Important 2).
- ⚠️ Cannot verify from diff: modular wind sway after the bake (no test or capture, only a code reading; Important 3). Full-boot, golden and perf numbers are the implementer's runs; I did not re-run them.

### Strengths
- The bake hook (src/vegetation.js:1286-1294) is classic-neutral. It sits after `if (!isAssetInstance(out)) return out;` and is gated on `layout.bake && out.bake`, and only kit instances carry `bake`. The classic path and `meshTreeClassic` are untouched, so the golden-EQUAL claim is plausible by construction.
- The bake keeps per-vertex `aWind` (geometry.clone, world matrix baked), the same mechanism the classic path uses at vegetation.js:284-285. It also carries over `customDepthMaterial`, so shadows follow the wind.
- Hero trees keep leaf sprays (`styleFor`, build.js:1144) and the rim keeps painted masses, as the card requires.
- Trunk code is sound: a planted foot, a root collar, and wood in one geometry with zeros for `aWind` on the trunk. No `Math.random` or `Date.now`, and no `labs/` import in the kit.
- Foliage materials are ref-counted. Bark comes from `kitMaterials`, so 0 new merged materials.
- The registry entry in the handoff (handoff:68) matches the shape of the grass extra (`poster`, `kind`, `href`).
- Reporting is honest in places: the report says "not a dramatic upgrade" and admits sparser crowns.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
1. **`tree-trunks` and `tree-canopies`: dead assets claimed promoted (named risk 3).**
   - Vegetation never routes to them. The handoff says so at handoff:86, and `?swap=` is a no-op for them.
   - Their `lab` ids do not exist as specimens. src/kit/trees/index.js:1251 uses `trees/trunk` and :1260 uses `trees/canopy`. The lab specimens are `spine`, `buttress`, `bark`, `skeleton`, `tiers`, `sakura`, `maple`, `pine` and `rim` (labs/trees/js/recipes.js:604-637). The handoff inventory rows map them to `trees/spine` and `trees/tiers` (handoff:75), which disagrees with the code.
   - The distinguishing feature of `tree-canopies`, the `clumps` style (build.js:1073, plus the `tufts` and `cardsPerClump` materials), has no lab specimen at all. No study means no swap (L4).
   - There is no compare pair (L6), and no consumer exists until s2-clearing. Both are unproven and untestable in the game.
   - Fix: defer both ids with a reason ("no routing, no consumer, no pair; s2-clearing to promote with a summit compare"). Keep the code reachable through the exported `addCanopy`/`buildTrunkGeometry`, or fix the `lab` ids and add a clumps specimen and a trunk specimen if they stay.
2. **Crown quality regresses on the compare pairs (AAA-1 / L6 honesty).**
   - Maple 12/18: the modular crown is visibly thinner and higher, with sky through the lower limbs. Classic is a full mass. The fork also shows a small stub or nub at the top of the trunk (maples-18-modular, around x=480, y=350).
   - Sakura 12/18: the modular crown is sparser and leans off-centre, so the facade shows through. The roots and foot are better, but the crown is a net loss in fullness.
   - Status says "a touch sparser" and "sakura and maple pairs show the change". That understates the maple.
   - Fix: raise leaf density or sprays per limb, or tie the canopy origin back toward the fork centre, and check the cap against the limb start. Re-shoot, or record the downgrade as a waiver.
3. **Wind after the bake is unverified (named risk 1).**
   - Reading the code, sway should survive, since `aWind` is kept and the clone carries the depth material. But `tools/tree_preview.html?sheet=hero&wind=4` uses the classic builders only (status line 29), so it does not exercise modular trees.
   - The only modular wind evidence is the lab slider and an `aWind` presence check.
   - Add a contract check, or a capture, that a baked modular tree's merged mesh has `aWind` with non-zero bend weights and a flex material. Run it with `?swap=sakura,maples:modular` at `uWindGlobal=4`.

#### Minor (Nice to Have)
- **Stale handoff (docs/fable/handoff/v-trees.md:99-112, 123-132, and status line 32).** The hook is now committed in cb54172, but the handoff still says "optional" and "to apply", and the perf table lacks committed-tree rows. An integrator may double-apply the patch. Mark it applied.
- **Hook cleanliness (vegetation.js:1291).** `_bakeStatic` is called with the default name `'Trunks & Canopy'`, so hero-bake limbs and leaves are not named 'Canopy Limbs' / 'Canopy Leaves' as in classic (cosmetic). Detached meshes stay in `out.parts`, and the shared foliage materials are disposed at refcount zero while the baked statics still use them. Teardown-only, same as classic's lifetime, but worth a comment.
- **Dead line (build.js:1109).** `trunk.setIndex(...)` guards the wrong geometry. The trunk is always indexed, and the limbs are the geometry that would need it. `mergeGeometries` returns null if the limbs are ever non-indexed.
- **Silent attribute drop (build.js:1108).** `joinWood` silently deletes any attribute missing from either side. If a colour attribute is ever added to the limbs, it disappears without notice.
- **Lab copy-paste (labs/trees/index.html:86).** The no-file:// message points at `labs/greenery/`.
- **Copy drift (named risk 5).** `labs/trees/js/kit.js` and `src/kit/trees/build.js` are near-verbatim copies of the trunk, species table and canopy options. This is acceptable under "no kit imports labs/", but the two already differ: kit.js has no `size` or `density` option, and `masses` handling differs at mid. A shared-data comment is present, and a drift test (compare `SPECIES` and `trunkGeometry` vertex counts) is recommended.

Named-risk summary:
- Risk 1 (bake hook, neutrality, wind): neutral. Wind is plausible, but unverified on modular (Important 3).
- Risk 2 (hero sprays, rim masses): OK.
- Risk 3: Important 1.
- Risk 4: registry entry exact and the lab follows `runLab`, apart from the Minor copy-paste. The lab ships research.md and poster.png. Sources are honestly marked "from memory".
- Risk 5: Minor.

### Assessment

**Task quality:** Needs fixes

**Reasoning:** The system work is sound. The bake hook is classic-neutral, hero sprays and rim masses are kept, budgets pass, and the lab and registry entry are in order. But two components are claimed promoted without a specimen, a route or a compare pair, and the sakura and maple compare pairs show thinner crowns than classic, which contradicts the AAA-1 claim. Modular wind survival rests on code reading only.
