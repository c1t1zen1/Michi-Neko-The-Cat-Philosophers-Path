# v-trees handoff

## Lab registry (labs/registry.js is hot): promote the `trees` extra
labs/trees/ is the new lab (decision D5). In `labs/registry.js` replace the `trees` entry of `EXTRAS`:
```js
{ slug: 'trees', poster: 'trees/poster.png', kind: 'standard', title: 'Trees', jp: '木', romaji: 'ki', href: 'trees/', blurb: 'Sakura, maple and pine from the trunk up: a planted foot, a root collar, limbs that fork, leaf sprays for the hero trees and painted masses for the rim. Pick a tier and watch the triangles fall.' },
```
The review sheets stay reachable at `tools/tree_preview.html?sheet=hero`. (`node tools/labs_check.mjs` checks `extra trees -> trees/` exists.)

## Inventory rows (labs/asset_inventory.json)
`sakura`, `maples`, `pines`, `rim-trees`, `tree-trunks`, `tree-canopies` exist. Set, for each, the lab specimen and kit status:
- `sakura` -> lab `trees/sakura`, `maples` -> `trees/maple`, `pines` -> `trees/pine`, `rim-trees` -> `trees/rim`, `tree-trunks` -> `trees/spine`, `tree-canopies` -> `trees/tiers`
- coverage: change `tree/hero`, `tree/rim`, `tree/detail`, `tree/compare` from `review` to `lab` where the catalog distinguishes it.
- catalog `production` adapter: family `trees` (`"production": "trees"`), all six ids.

## Part names
`sakura`, `maples`, `pines`, `rim-trees`: `trunk` (trunk, roots and every limb: ONE mesh, one bark material), `leaves` (hero and mid sprays) or `tufts` (masses: rim, far). `tree-trunks`: `trunk`. `tree-canopies`: `limbs` + `leaves` | `tufts` | `tufts` + `leaf_cards` (style param; `floating`: all of them, it is a canopy without a trunk). Gameplay binds nothing on trees.

## Footprint waivers
None: the footprint is `layout.footprint` (one collider at the tree's x, z, r = 0.35 / 0.3 x scale). Golden: classic EQUAL (valley and `--systems`); with the four tree ids swapped the valley golden is still EQUAL and `--systems` differs only by the tree objects (518 / 135 colliders, 25 anchors, 249867 vegetation draws unchanged, `canopies freed 25/25`).

## Routing not wired (components)
`tree-trunks` and `tree-canopies` are promoted and pass the contract, but Vegetation does not route to them (a tree is built whole). They exist for the labs and for s2-clearing. `?swap=tree-trunks:modular` is a no-op in the valley, so they have no compare pair.

## Reusable kit builders (s2-clearing: the summit's 'clumps' trees)
```js
import { buildTree, addCanopy, buildTrunkGeometry, SPECIES } from '../kit/trees/index.js?v=<tag>';
// a whole tree, any species ('sakura' | 'maple' | 'needle'), as the layout builder would:
buildTree(ctx, { kind: 'sakura', scale: 1.1, lean: 0.07, barkIdx: 1, rim: false, trunk: SPECIES.sakura.trunk }, params, 'sakura')
// just a canopy, any style, onto a group you own (leaves | masses | clumps, tier from ctx.tier):
const c = addCanopy(ctx, group, SPECIES.maple, 'clumps', ctx.tier, { S: 1, size: 1, density: 1 }, 0, 0, null);
// c.parts { limbs, tufts, leaf_cards }, c.release() frees geometry + shared materials (ref-counted)
```
or build the `tree-canopies` asset with `style: 'clumps'`. 'clumps' draws tuft cores + leaf cards (`km`-free foliage materials, one set per species, ref-counted: `release()` frees them when the last tree goes). Everything is drawn from `ctx.rng`; nothing touches `this.rng`.

## Vegetation bake hook: ALREADY APPLIED (committed in src/vegetation.js under the R47 grant; do not apply again)
Kit trees put their wood and leaves in two meshes per tree instead of the classic per-material static merges (trunks merged globally, rim canopies merged). The kit instance lists `bake` (part keys) when `layout.bake` is true; this lets Vegetation fold those into the same `_staticAccum` merges the classic path uses. In `canopyTree()`, after `if (!isAssetInstance(out)) return out;` add:
```js
    if (layout.bake && out.bake && out.bake.length) {
      out.group.updateMatrixWorld(true);
      for (const key of out.bake) {
        const m = out.parts[key];
        if (!m || !m.geometry) continue;
        this._bakeStatic(m.geometry.clone(), m.matrixWorld, m.material, m.customDepthMaterial || null, 'Trunks & Canopy');
        m.parent.remove(m);
      }
    }
```
The patch below is shown for reference only. Without it everything works; with it the rim and far trees add no draws of their own (measured below).

## Helpers to move
None (the trunk builder lives in src/kit/trees/build.js; the study copy is in labs/trees/js/kit.js; keep them in step).

## foliage.js
Not touched: the single-writer grant was not needed (buildCanopy already exposes every knob the tiers use: primaries, secondaries, twigs, tuftsPerClump, tuftDetail, density, sprigs, padSprays).

## Materials and draws
New kit materials: 0 new (bark is `km.bark` with the classic three bark textures' args, so `_once` hands back one material per bark). Foliage materials: one set per species (3 spray + 3 depth, 3 mass, 3 branch clones), shared by every tree and ref-counted (classic: the same sets, once, on Vegetation). Live meshes: 0 (wind is the global foliage uniform).

## Measured draws and triangles (tools/perf_spots.mjs, Metal, 2 boots, street spot; meadow in the status file)
| set | street calls (shadow-refresh / mean) | street triangles |
|---|---|---|
| classic high | 771 | 8.11M |
| classic medium | 785 / 600 | 7.28M / 6.09M |
| modular high, no hook | 817 | 8.15M |
| modular medium, no hook | 817 / 621 | 7.03M / 5.92M |
| modular high, with the bake hook | 778 | 8.18M |
| modular medium, with the bake hook | 767 / 589 | 6.96M / 5.88M |
Without the hook, +46 shadow-refresh calls (about 23 per pass): the 19 near trees keep two draws each as classic did, but the six rim and far trees and the trunks that classic merged globally now draw on their own. Rule "modular medium <= classic high": passes on the mean (621 <= 771) and on triangles; on the shadow-refresh frame it needs the hook (767 <= 771). Recommend applying the hook.

## Fix round 1 changes
- DEFERRED: `tree-trunks` and `tree-canopies` are no longer assets (no routing, no consumer, no compare pair, no clumps specimen). `buildSkeleton` / `buildCanopyOnly` stay exported from src/kit/trees/index.js as building blocks; s2-clearing should promote them with a summit compare. Inventory: leave both ids as not-promoted; only `sakura`, `maples`, `pines`, `rim-trees` map to the trees family (lab specimens `trees/sakura`, `trees/maple`, `trees/pine`, `trees/rim`).
- Hook names baked meshes 'Canopy Limbs' / 'Canopy Leaves' (near) like classic.
- Drift check: `node labs/trees/drift_check.mjs` compares the species table, trunk tier detail and taper between the lab study and the kit.
