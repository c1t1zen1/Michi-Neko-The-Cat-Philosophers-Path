// Trees tiles. Tile code = build(). "Our …" tiles run the game's own builders.
import * as THREE from 'three';
import { ensureVegetation, seeded } from '../../shared/original.js';
import { loadFoliageModule } from '../../shared/game.js';
import { SPECIES, makeTree, trunkGeometry, spineX, mulberry, trisOf } from './kit.js';

let ve = null, F = null, base = null;
export const loadDeps = async () => {
  ve = (await ensureVegetation()).prototype; F = await loadFoliageModule();
  base = Object.create(ve); base._initMaterials();
};
export const fol = () => F;

/** One of the game's trees through the real Vegetation code (as tools/tree_preview.js does). */
function original(method, { rim = false, scale = 1, bake = false } = {}) {
  const group = new THREE.Group();
  const v = Object.create(base);
  Object.assign(v, { scene: group, colliders: [], rng: seeded(77), swayables: [], _treeCount: 0, _staticAccum: new Map(), treeStyle: () => ({ rim, bake }) });
  v[method](0, 0, scale);
  v._finalizeStatic();
  return group;
}
/** Original trunk only: the cylinder the game bakes. */
function originalTrunk(kind = 'sakuraTree') {
  const v = Object.create(base), t = { sakuraTree: [0.13, 0.22, 2.3, 0.07], mapleTree: [0.11, 0.2, 2, 0.05], pineTree: [0.09, 0.17, 1.9, 0.1] }[kind];
  const g = v.trunkMesh(t[0], t[1], t[2], base.matTrunks[0], t[3]);
  return g;
}
const row = (items, gap = 4.2) => { const g = new THREE.Group(); items.forEach((it, i) => { it.position.x = (i - (items.length - 1) / 2) * gap; g.add(it); }); return g; };
const tree = (o) => makeTree(F, o).group;

export const SOURCES = {
  weber: ['Weber & Penn · Creation and rendering of realistic trees (SIGGRAPH 1995)', 'https://dl.acm.org/doi/10.1145/218380.218427', 'from memory of the method'],
  abop: ['Prusinkiewicz & Lindenmayer · The Algorithmic Beauty of Plants', 'http://algorithmicbotany.org/papers/#abop', 'from memory of the method'],
  crysis: ['GPU Gems 3, ch. 16 · Vegetation procedural animation and shading in Crysis', 'https://developer.nvidia.com/gpugems/gpugems3/part-iii-rendering/chapter-16-vegetation-procedural-animation-and-shading-crysis', 'from memory of the method'],
  tube: ['Three.js docs · TubeGeometry', 'https://threejs.org/docs/#api/en/geometries/TubeGeometry', 'docs'],
  inst: ['Three.js docs · InstancedMesh', 'https://threejs.org/docs/pages/InstancedMesh.html', 'docs'],
  somei: ['Wikipedia · Prunus × yedoensis (Somei-Yoshino)', 'https://en.wikipedia.org/wiki/Prunus_%C3%97_yedoensis', 'from memory, not re-fetched'],
  niwaki: ['Jake Hobson · Niwaki: pruning, training and shaping trees the Japanese way', 'https://www.niwaki.com/', 'from memory, not re-fetched'],
  notes: ['Trees research notes', 'research.md', 'notes']
};

export const FAMILIES = [
  { key: 'trunk', title: 'The <em>trunk</em>', sub: 'The game bakes a cylinder tilted about its middle. A trunk should stand on its foot and lean from there.' },
  { key: 'crown', title: 'Three <em>species</em>', sub: 'Sakura in blossom, a layered maple, a cloud-pruned pine: what the game has now, then the same crowns on the new trunk.' },
  { key: 'tiers', title: 'One tree, <em>three distances</em>', sub: 'Hero, mid and far: the same skeleton at a shrinking leaf budget, then the rim treatment.' }
];

const S = (kind) => SPECIES[kind];
const sp = (id, family, name, jp, tag, blurb, how, use, build, extra = {}) => ({ id, family, name, jp, tag, plinth: 'moss', hour: 15, blurb, how, use, sources: ['notes'], build, ...extra });

export const SPECIMENS = [
  { id: 'game-trunk', family: 'trunk', original: true, name: 'Our trunk', jp: '今の幹', tag: 'trunkMesh(): a cylinder tilted about its middle', plinth: 'moss', hour: 15, game: () => ve.trunkMesh,
    blurb: 'What the valley bakes: a nine-sided cylinder with a root flare. The lean is a rotation about its centre, so the foot slides off the ground on one side.',
    how: ['CylinderGeometry(rTop, rBot, h, 9, 4), flared by (1 - 4t)².', 'trunk.rotation.z = lean.'], use: 'Baseline.', sources: ['notes'],
    build() { return row([originalTrunk('sakuraTree'), originalTrunk('mapleTree'), originalTrunk('pineTree')], 1.4); } },
  sp('spine', 'trunk', 'A curved spine', '幹', 'The foot stays planted', 'The same radii on a spine that bends from the ground: x(t) = −sin(lean)·h·0.55·t². The canopy origin follows the spine at t = 0.85, so limbs still leave the trunk.',
    ['Rings along a quadratic spine.', 'Cap at the fork; limbs start inside it.'], 'Every tree.',
    () => row(['sakura', 'maple', 'needle'].map((kind) => tree({ kind, canopy: false, trunk: true, style: 'masses' })), 2.2), { sources: ['tube', 'notes'] }),
  sp('buttress', 'trunk', 'Collar and roots', '根張り', 'Five lobes and four roots', 'Near the ground the section is not a circle: five buttress lobes grow out of the flare and four surface roots run off into the soil. Cheap, and it is what the cat sees from 35 cm.',
    ['r(θ, t) = r₀ · (1 + b·(1 − 5t)²·(0.5 + 0.5cos 5θ)).', 'Four tapered tubes along CatmullRom curves.'], 'Hero tier only: mid has three roots, far none.',
    () => row([tree({ kind: 'sakura', canopy: false, flat: true }), tree({ kind: 'maple', canopy: false, flat: true }), tree({ kind: 'needle', canopy: false, flat: true })], 1.6)),
  sp('bark', 'trunk', 'Three barks', '樹皮', 'Warm, grey and dark', 'The valley already has three bark textures; the kit picks one by the tree\'s index, so neighbours do not match, and the choice is a parameter.',
    ['barkTextures(base, dark, seed) × 3.'], 'Variety along the avenue.',
    () => row([0, 1, 2].map((b) => tree({ kind: 'sakura', canopy: false, bark: b })), 1.5)),
  sp('skeleton', 'trunk', 'Bare limbs', '枝ぶり', 'The skeleton before the leaves', 'Primaries, secondaries, twigs and sprigs: four levels of flex-wind wood. In winter, or before you add the leaves, this is the tree.',
    ['buildCanopy(rng, { style: "leaves" }) with the cards left out.'], 'A winter variant; the labs.',
    () => row([tree({ kind: 'sakura', canopy: false }), tree({ kind: 'maple', canopy: false }), tree({ kind: 'needle', canopy: false })], 4.6)),

  { id: 'game-sakura', family: 'crown', original: true, name: 'Our sakura', jp: '今の桜', tag: 'sakuraTree(): leaf sprays on twigs', plinth: 'moss', hour: 15, game: () => ve.sakuraTree,
    blurb: 'The game\'s hero sakura through the real Vegetation code: a cloud of blossom sprays rooted on four levels of twigs.', how: ['buildCanopy style "leaves", habit "cloud".'], use: 'Baseline.', sources: ['somei', 'notes'],
    build() { return original('sakuraTree'); } },
  { id: 'game-maple', family: 'crown', original: true, name: 'Our maple', jp: '今の紅葉', tag: 'mapleTree(): flat tiers', plinth: 'moss', hour: 15, game: () => ve.mapleTree,
    blurb: 'Near-horizontal limbs carry flat tiers of palmate leaves in crimson to coral.', how: ['habit "tier".'], use: 'Baseline.', sources: ['notes'], build() { return original('mapleTree'); } },
  { id: 'game-pine', family: 'crown', original: true, name: 'Our pine', jp: '今の松', tag: 'pineTree(): needle pads', plinth: 'moss', hour: 15, game: () => ve.pineTree,
    blurb: 'A leaning trunk with a few reaching limbs and cloud-pruned needle pads, the niwaki habit.', how: ['habit "pad".'], use: 'Baseline.', sources: ['niwaki', 'notes'], build() { return original('pineTree'); } },
  sp('sakura', 'crown', 'Sakura on the new trunk', '桜', 'Hero tier', 'The same crown on the spine trunk: the lean is carried up into the fork, the roots show, the blossom keeps its sprays.',
    ['makeTree({ kind: "sakura", tier: "hero" }).'], 'The fourteen sakura spots.', () => tree({ kind: 'sakura', S: 1.2 }), { sources: ['somei', 'notes'] }),
  sp('maple', 'crown', 'Maple on the new trunk', '紅葉', 'Hero tier', 'Layered tiers on a grey bark.', ['makeTree({ kind: "maple" }).'], 'The five garden maples.', () => tree({ kind: 'maple', S: 1.1 })),
  sp('pine', 'crown', 'Pine on the new trunk', '松', 'Hero tier', 'A darker bark, a stronger lean, and pads that sit where the limbs end.', ['makeTree({ kind: "needle" }).'], 'The six garden pines.', () => tree({ kind: 'needle', S: 1.3 }), { sources: ['niwaki', 'notes'] }),

  sp('tiers', 'tiers', 'Hero · mid · far', '距離', 'The same sakura, three budgets', 'Left to right: hero leaf sprays, mid (half the sprays, two twigs a limb), far (a few painted masses, 1 clump a tip). The label under each is its triangle count.',
    ['Leaf density × 0.5, sprigs 1 at mid.', 'Far swaps to masses: 20-triangle tufts, 4 limbs.'], 'Medium quality builds mid at the play field, far on the rim.',
    () => { const a = makeTree(F, { kind: 'sakura', tier: 'hero' }), b = makeTree(F, { kind: 'sakura', tier: 'mid' }), c = makeTree(F, { kind: 'sakura', tier: 'far', style: 'masses' }); const g = row([a.group, b.group, c.group], 4.4); g.userData.tris = [a.tris, b.tris, c.tris]; return g; }, { sources: ['crysis', 'notes'] }),
  { id: 'game-rim', family: 'tiers', original: true, name: 'Our rim tree', jp: '今の縁木', tag: 'the same tree as painted leaf masses', plinth: 'moss', hour: 15, game: () => ve.canopyTree,
    blurb: 'Past 39 m the game swaps sprays for lumpy tufts painted with a leaf-mass texture whose outline breaks into leaves.', how: ['buildCanopy style "masses", tuft cores only.'], use: 'Baseline.', sources: ['notes'],
    build() { return row([original('sakuraTree', { rim: true, bake: true }), original('mapleTree', { rim: true, bake: true }), original('pineTree', { rim: true, bake: true })], 4.4); } },
  sp('rim', 'tiers', 'Rim masses, three tiers', '縁', 'Hero, mid and far masses', 'The same painted masses with fewer, flatter pillows: hero is the game\'s own, far is a dozen 20-triangle tufts.',
    ['tuftsPerClump − 1 at mid; [1,1,1] with tuftDetail 0 at far.'], 'The rim sakura, maples and pines beyond r = 39 m.',
    () => row(['hero', 'mid', 'far'].map((tier) => makeTree(F, { kind: 'sakura', style: 'masses', tier }).group), 4.2), { sources: ['notes'] })
];

export const STEPS = [
  { title: 'Stand the trunk', body: '<p>A spine from a planted foot, rings of a nine-to-fourteen sided section.</p>', code: 'x(t) = −sin(lean)·h·0.55·t²', phase: 0 },
  { title: 'Flare the foot', body: '<p>The root collar and five lobes make the base of the tree a shape, not a tube.</p>', phase: 1 },
  { title: 'Fork the limbs', body: '<p>Primaries leave inside the top of the trunk and arc up and out, then secondaries, twigs and sprigs.</p>', phase: 2 },
  { title: 'Root the sprays', body: '<p>Every leaf spray is rooted on a twig and shares the twig\'s wind weight, so leaves stay on their wood.</p>', phase: 3 },
  { title: 'Spend the budget', body: '<p>Halve the sprays at mid; at far trade them for painted masses.</p>', phase: 4 }
];

export const ASSEMBLY = {
  radius: 7, target: [0, 2.4, 0], shadow: 8,
  build(k) {
    const root = new THREE.Group(), ground = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.1, 32), k.M.plain(0x6b7c4e));
    ground.position.y = -0.05; ground.userData.noShadow = true; root.add(ground);
    const sets = [makeTree(F, { kind: 'sakura', canopy: false, flat: true }), makeTree(F, { kind: 'sakura', canopy: false, flat: false }), makeTree(F, { kind: 'sakura', canopy: false }), makeTree(F, { kind: 'sakura', tier: 'hero' }), makeTree(F, { kind: 'sakura', tier: 'far', style: 'masses' })];
    sets.forEach((s) => { s.group.visible = false; root.add(s.group); });
    sets[0].group.visible = true;
    return { group: root, setPhase(p) { sets.forEach((s, i) => { s.group.visible = i === p; }); }, update() {} };
  }
};
