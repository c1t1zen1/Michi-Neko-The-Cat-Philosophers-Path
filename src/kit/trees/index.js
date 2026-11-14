// The trees family (Phase 2, wave 2.3): lab 'trees' (labs/trees/).
//   sakura          the 14 hero blossom trees (leaf sprays on twigs)
//   maples          the garden maples
//   pines           the niwaki pines
//   rim-trees       any of the three past r = 39 m, as painted leaf masses
// Deferred (not assets): tree-trunks / tree-canopies; buildSkeleton / buildCanopyOnly are exported building blocks.
// Reusable builders: buildTree, buildTrunkGeometry, addCanopy, SPECIES (see build.js).
import { defineAsset } from '../contract.js?v=20261113a';
import { buildTree, addCanopy, buildTrunkGeometry, spineX, SPECIES, TREE_PARAMS, sampleLayout, KIND_OF_ID } from './build.js?v=20261113a';

export { buildTree, addCanopy, buildTrunkGeometry, SPECIES };

const tree = (id, kind, label, legacyName, scale) => defineAsset({
  id, family: 'trees', lab: `trees/${kind}`, label, legacyName,
  params: TREE_PARAMS, tiers: ['hero', 'mid', 'far'],
  sample: sampleLayout(kind, { scale }),
  build: (ctx, layout, p) => buildTree(ctx, layout, p, kind)
});

/** Trunk and bare limbs: the skeleton with no foliage, for winter and for the labs. */
function buildSkeleton(ctx, layout, p) {
  const T = ctx.THREE;
  const sp = SPECIES[p.species];
  const group = new T.Group();
  const lean = sp.trunk.lean * 0.5;
  const geo = buildTrunkGeometry(T, { ...sp.trunk, tier: ctx.tier, girth: p.trunk_girth, buttress: sp.buttress, lean, rng: ctx.rng });
  const c = addCanopy(ctx, group, sp, 'masses', ctx.tier, { S: 1, size: 1, density: 1 }, 0, spineX(lean, sp.trunk.h, 0.85), geo);
  // keep the wood, drop the leaf masses
  const tufts = c.parts.tufts;
  if (tufts) { group.remove(tufts); tufts.geometry.dispose(); delete c.parts.tufts; }
  return { group, parts: { trunk: c.parts.trunk }, sockets: {}, live: [], dispose() { c.release(); } };
}

/** One canopy on its own at the origin (a fork at trunk height): the part the summit reuses. */
function buildCanopyOnly(ctx, layout, p) {
  const T = ctx.THREE;
  const sp = SPECIES[p.species];
  const group = new T.Group();
  const style = p.style === 'leaves' && ctx.tier === 'far' ? 'masses' : p.style;
  const c = addCanopy(ctx, group, sp, style, ctx.tier, { S: layout.scale || 1, size: p.crown_spread, density: p.leaf_density }, 0, 0);
  return { group, parts: c.parts, sockets: {}, live: [], dispose() { c.release(); } };
}

export const assets = [
  tree('sakura', 'sakura', 'Sakura trees', 'Sakura Tree', 1.3),
  tree('maples', 'maple', 'Maple trees', 'Maple Tree', 1.2),
  tree('pines', 'needle', 'Garden pines', 'Needle Tree', 1.5),
  defineAsset({
    id: 'rim-trees', family: 'trees', lab: 'trees/rim', label: 'Rim sakura, maple and pine leaf masses', legacyName: 'Rim Tree',
    params: TREE_PARAMS, tiers: ['hero', 'mid', 'far'],
    // the heaviest rim tree: a sakura (six primaries, three-tuft clumps) at the rim
    sample: sampleLayout('sakura', { scale: 1.15, rim: true }),
    build: (ctx, layout, p) => buildTree(ctx, layout, p, KIND_OF_ID[layout.kind] || layout.kind)
  })
];

// DEFERRED ids `tree-trunks` and `tree-canopies` (v-trees review r1): Vegetation never routes to them, there is no
// consumer or compare pair yet, and the lab has no clumps specimen. Their builders stay as building blocks for
// s2-clearing, which should promote them with a summit compare.
export { buildSkeleton, buildCanopyOnly };
