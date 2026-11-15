# Trees research — 2026-11-13

Notes behind `labs/trees/` (decision D5: the trees lab did not exist; only the
`tools/tree_preview.html` review sheets did). No web search was run for this
lab: every external source below is cited **from memory, not re-fetched**, and
the page marks them so. The measurements are from the repo itself.

## What the game does today

* `Vegetation.canopyTree()` builds a tree as a trunk (`trunkMesh`, a nine-sided
  `CylinderGeometry` with a root flare) plus `buildCanopy()` from `src/foliage.js`.
* **Hero trees** (r < 39 m) use style `'leaves'`: a four-deep twig skeleton
  (primaries, secondaries, twigs, sprigs) carrying only alpha-cut leaf-spray
  cards, with the flex wind (`aWind`) on limbs and cards so leaves stay on wood.
* **Rim trees** (r > 39 m) use style `'masses'`: the clump skeleton with lumpy
  tuft cores painted with a leaf-mass texture whose outline breaks into leaves.
* The summit uses the default `'clumps'` style (tuft cores + leaf cards).
* 25 trees in the valley: 14 sakura, 5 maples, 6 pines. About seven of them
  stand past r = 39 m. (The 260-tree edge forest belongs to `countryside.js`.)
* Trunks bake into per-material static merges; near hero trees (r < 36 m) keep
  their own limb and leaf meshes so they cull per tree.

## Findings that drove the kit

1. **The classic lean lifts the foot.** `trunk.rotation.z = lean` rotates the
   cylinder about its middle, so one side of the foot leaves the ground and the
   limbs (built on the unrotated axis) no longer sit on the trunk top. The kit
   bends a spine from a planted foot and puts the canopy origin on the spine.
2. **A trunk is not a tube near the ground.** Buttress lobes and surface roots
   (Weber & Penn model a trunk's "flare" and "lobes" as parameters; from memory)
   make the part the cat sees at 35 cm read as a tree.
3. **Species hold their own habit.** Sakura (Somei-Yoshino): short trunk forking
   into wide, slightly drooping limbs. Maple: near-horizontal tiers. Niwaki pine:
   a leaning trunk and cloud-pruned pads at the limb ends (Hobson, *Niwaki*).
4. **Wind stays per vertex.** The flex wind of GPU Gems 3 ch. 16 (Crysis) splits
   motion into a main bend weighted by height and a detail flutter on leaves; the
   game's `aWind` (bend weight, tree phase) is that idea, so any kit tree must
   carry the attribute on every vertex that bends (the trunk carries zeros).
5. **Tier by leaf budget, not by look.** Hero: classic sprays. Mid: half the
   sprays, two twigs a limb, one sprig. Far: masses with 20-triangle tufts.

## Decisions for the kit

* Hero tier keeps leaf sprays on twigs; rim keeps painted masses (card notes).
* One foliage material per species, shared by every tree, so a later bake can
  merge their draws; bark comes from `ctx.kitMaterials.bark` (merge-able).
* Trunk and limbs are one geometry and one draw per tree.
* Contract samples are the biggest real layouts: sakura 1.3 (`-12, -2`), maple
  1.2, pine 1.5, rim sakura 1.15.

## Not done

* No wind specimen of its own: the orchard's wind slider drives the real
  `foliageUniforms.uWindGlobal` (`tools/tree_preview.html?sheet=hero&wind=4` is
  the check that leaves stay on their twigs).
* Season colours (autumn maple, bare winter limbs) exist only as the `skeleton`
  tile.
