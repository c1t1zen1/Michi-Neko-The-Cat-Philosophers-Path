// Lab 15 tiles. Tile code = build().
import * as THREE from 'three';
import { originalOf, gameKit, vegetationKit, ensureCountryside, ensureVegetation, ownMaterials } from '../../shared/original.js';
import { loadFoliageModule } from '../../shared/game.js';
import { V3, TAU, Bag, instances, sstep } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { culmGeometry, bambooColor } from '../../shared/bamboo.js';
import { CULM, leafTexture, swayMat } from './kit.js';

let cs = null, ve = null, F = null;
export const loadDeps = async () => { cs = (await ensureCountryside()).prototype; ve = (await ensureVegetation()).prototype; F = await loadFoliageModule(); };
const G = (n) => () => cs[n];

export const SOURCES = {
  front: ['Frontiers · Moso bamboo’s rapid growth phase', 'https://www.frontiersin.org/articles/10.3389/ffgc.2024.1343206/full', 'excerpt'],
  mdpi: ['Plants (MDPI) · Internode elongation in moso bamboo', 'https://mdpi.com/2223-7747/13/11/1484', 'excerpt'],
  fron2: ['Frontiers · Moso rhizome system', 'https://www.frontiersin.org/articles/10.3389/fevo.2024.1440494/full', 'excerpt'],
  inst: ['Three.js docs · InstancedMesh', 'https://threejs.org/docs/pages/InstancedMesh.html', 'docs'],
  notes: ['Greenery research notes', 'research.md', 'notes']
};

export const FAMILIES = [
  { key: 'culm', title: 'A culm, <em>up close</em>', sub: 'The game’s grove is plain cylinders. Real culms have rings, scars and a powdery white band below each node.' },
  { key: 'grove', title: 'The grove', sub: 'Stalks and leaves, and how little of either you can get away with.' },
  { key: 'bush', title: 'What grows <em>along the road</em>', sub: 'The game’s lumpy bushes, then the clipped green that Kyoto actually keeps.' }
];

export const SPECIMENS = [
  { id: 'game-stalk', family: 'culm', original: true, name: 'Our culm', jp: '今の竹', tag: 'A plain cylinder', plinth: 'moss', hour: 15, game: () => ve.buildBambooGrove,
    blurb: 'What buildBambooGrove() actually uses: a six-sided cylinder, no nodes at all.',
    how: ['CylinderGeometry(0.065, 0.075, 7, 6).'], use: 'Baseline.', sources: ['notes'],
    build(k) { const g = new k.THREE.Group(); const m = new k.THREE.Mesh(new k.THREE.CylinderGeometry(0.065, 0.075, 3, 6), new k.THREE.MeshStandardMaterial({ color: 0x6f9e4c, roughness: 0.6 })); m.position.y = 1.5; g.add(m); return g; } },
  { id: 'nodes', family: 'culm', name: 'Nodes and scars', jp: '節', tag: 'A bulge, a line, a band of white', plinth: 'moss', hour: 15,
    blurb: 'A lathe with swollen nodes. Just below each node, a ring of waxy white powder, which is the first thing you see in a real grove.',
    how: ['Node bulges in the lathe profile.', 'A pale band in a paint shader driven by height.'], use: 'Every culm the cat passes close to.', sources: ['mdpi'], also: [culmGeometry],
    build(k) { const g = new k.THREE.Group(); const C = (r, x) => { const m = new k.THREE.Mesh(CULM, k.M.bamboo({ color: 0x7fa84f, vcol: true })); m.scale.set(r, 3, r); m.position.x = x; g.add(m); }; C(0.09, -0.3); C(0.07, 0); C(0.05, 0.28); return g; } },
  { id: 'sheath', family: 'culm', name: 'Takenoko', jp: '筍', tag: 'A shoot, still in its sheaths', plinth: 'moss', hour: 15,
    blurb: 'The brown overlapping sheaths of a shoot just out of the ground. The number of nodes is already decided before it emerges.',
    how: ['Stacked cones with brown colour, each a little smaller.'], use: 'Scattered through a young grove in spring.', sources: ['front', 'mdpi'],
    build(k) { const g = new k.THREE.Group(); for (let i = 0; i < 8; i++) { const m = new k.THREE.Mesh(new k.THREE.ConeGeometry(0.16 - i * 0.012, 0.3, 14, 1, true), k.M.plain(i % 2 ? 0x8a6a42 : 0x7a5a36, { rough: 0.9, side: k.THREE.DoubleSide })); m.position.y = 0.12 + i * 0.28; m.rotation.y = i * 0.4; m.scale.set(1, 1 + i * 0.08, 1); g.add(m); } const tip = new k.THREE.Mesh(new k.THREE.ConeGeometry(0.05, 0.4), k.M.plain(0x6a9a3a)); tip.position.y = 2.4; g.add(tip); return g; } },
  { id: 'gold-bamboo', family: 'culm', name: 'Gold bamboo', jp: '金竹', tag: 'Golden stems with green streaks', plinth: 'moss', hour: 15,
    blurb: 'Phyllostachys aurea: golden canes with vertical green stripes. The classic ornamental bamboo of Japanese gardens.',
    how: ['Same culm geometry, gold base colour with green streaks in the paint shader.'], use: 'A single specimen beside a path or stepping stone.', sources: ['notes'],
    build(k) { const g = new k.THREE.Group(); const m = new k.THREE.Mesh(CULM, k.M.bamboo({ color: 0xd8a828, vcol: true })); m.scale.set(0.07, 3.2, 0.07); m.position.x = -0.2; g.add(m); const m2 = new k.THREE.Mesh(CULM, k.M.bamboo({ color: 0xc89818, vcol: true })); m2.scale.set(0.05, 2.8, 0.05); m2.position.x = 0.3; g.add(m2); return g; } },
  { id: 'black-bamboo', family: 'culm', name: 'Black bamboo', jp: '黒竹', tag: 'Phyllostachys nigra', plinth: 'moss', hour: 15,
    blurb: 'Narrow black-green culms that turn almost jet black with age. A striking silhouette against the garden light.',
    how: ['Same culm geometry, dark colour in the paint shader.'], use: 'A small clump as a focal point.', sources: ['notes'],
    build(k) { const g = new k.THREE.Group(); const C = (r, x, z, h) => { const m = new k.THREE.Mesh(CULM, k.M.bamboo({ color: 0x2a2a28, vcol: true })); m.scale.set(r, h, r); m.position.set(x, 0, z); g.add(m); }; C(0.04, -0.3, 0.1, 2.8); C(0.05, 0, -0.1, 3.4); C(0.035, 0.35, 0.15, 2.5); return g; } },
  { id: 'colors', family: 'culm', name: 'Age and species', jp: '色', tag: 'Green, gold and black bamboo', plinth: 'moss', hour: 15,
    blurb: 'Moso green, the warm gold of a madake, the black of kurochiku. In a grove you want more than one in a shot.',
    how: ['Instance colours over one geometry.'], use: 'Breaking up a grove’s single green.', sources: ['notes'],
    build(k) { const g = new k.THREE.Group(); [0x7fa84f, 0xb7a95a, 0x4c463a, 0x6e9440].forEach((c, i) => { const m = new k.THREE.Mesh(CULM, k.M.bamboo({ color: c, vcol: true })); m.scale.set(0.06, 2.6, 0.06); m.position.x = (i - 1.5) * 0.3; g.add(m); }); return g; } },

  { id: 'game-grove', family: 'grove', original: true, name: 'The grove today', jp: '今の竹林', tag: 'buildBambooGrove(), as it stands', plinth: 'moss', hour: 15, game: () => ve.buildBambooGrove,
    blurb: 'The real grove builder with its shader-driven bend. Good motion for almost no cost.',
    how: ['Instanced culms and leaf cards; the bend lives in the vertex shader.'], use: 'Baseline.', sources: ['notes'],
    build(k) { const kit = vegetationKit(9); kit.bambooTime = { value: 0 }; kit.matBambooSway = kit.bambooSwayMaterial(false, false); kit.matBambooLeafSway = kit.bambooSwayMaterial(true, false); kit.bambooDepthStalk = kit.bambooSwayMaterial(false, true); kit.bambooDepthLeaf = kit.bambooSwayMaterial(true, true); kit.buildBambooGrove(0, 0, 2.6); return { group: kit.scene, update: (t) => { kit.bambooTime.value = t; }, noCast: false }; } },
  { id: 'leaves', family: 'grove', name: 'Leaf cards', jp: '葉', tag: 'A narrow, drooping blade', plinth: 'moss', hour: 15, animatedShadow: true,
    blurb: 'Moso leaves are narrow and hang down. A real card with a mid-rib, instanced around a twig.',
    how: ['A two-triangle card with a painted blade and alpha test.', 'Per-instance sway from the world position.'], use: 'The grove’s top third.', sources: ['inst'], also: [swayMat],
    build(k) {
      const u = { uT: { value: 0 }, uW: { value: 1 } }, root = new k.THREE.Group(), list = [], twigs = new k.Bag(), r = k.rand;
      const mat = swayMat(new k.THREE.MeshStandardMaterial({ map: leafTexture(), alphaTest: 0.4, roughness: 0.7, side: k.THREE.DoubleSide }), u);
      for (let i = 0; i < 16; i++) {
        const a = r() * k.TAU, y = (4 + Math.floor(i / 3)) / 11 * 2.6, d = 0.25 + r() * 0.4;
        const start = k.V3(0, y, 0), end = k.V3(Math.cos(a) * d, y + 0.1, Math.sin(a) * d);
        twigs.add(k.tube([start, end], 0.008, { radial: 6 }), { color: 0x819951 });
        for (let j = 0; j < 5; j++) { const p = start.clone().lerp(end, 0.4 + j * 0.15); list.push({ x: p.x, y: p.y, z: p.z, rx: 0.6 + r() * 0.4, ry: a + (j % 2 ? 0.5 : -0.5), rz: 0, s: 0.9 + r() * 0.4 }); }
      }
      const leaves = k.instances(new k.THREE.PlaneGeometry(0.1, 0.34, 1, 3).translate(0, -0.17, 0), mat, list); leaves.frustumCulled = false; root.add(leaves, twigs.mesh(swayMat(k.M.bag({ rough: 0.8 }), u)));
      const c = new k.THREE.Mesh(CULM, k.M.bamboo({ vcol: true })); c.scale.set(0.05, 2.6, 0.05); root.add(c);
      return { group: root, update: (t) => { u.uT.value = t; } };
    } },

  { id: 'game-bush', family: 'bush', original: true, name: 'A street bush', jp: '今の茂み', tag: 'bushGeometry() + the foliage shader', plinth: 'earth', hour: 15, game: G('buildStreetBushes'),
    blurb: 'The real lumpy-bush geometry and the foliage shader the street bushes use.',
    how: ['Lobes merged into one lumpy mesh, shaded with a painted leaf mass.'], use: 'Baseline.', sources: ['notes'],
    build(k) { const g = new k.THREE.Group(); const mat = F.createFoliageMaterial({ sss: 0.3, wind: 0.9, rustle: 1.0, mottle: 0.2, bump: 0.45, vertexColors: true, massMap: F.leafMassTexture('leaf'), massScale: 1 / 0.55, ragged: 1 }); mat.color.set(0x54763b); const m = new k.THREE.Mesh(F.bushGeometry(9, { lobes: 8, detail: 2, lump: 0.34 }), mat); m.scale.setScalar(0.9); m.position.y = 0.42; g.add(m); return g; } },
  { id: 'karikomi', family: 'bush', name: 'Karikomi', jp: '刈込', tag: 'Azalea clipped into cushions', plinth: 'earth', hour: 15,
    blurb: 'The clipped rounds of a Kyoto garden: not a bush but a shape held by someone with shears every year.',
    how: ['Smooth lumpy forms with a fine leaf mass; lower detail than a free-growing bush.'], use: 'Street corners and garden edges.', sources: ['notes'],
    build(k) { const g = new k.THREE.Group(); const mat = F.createFoliageMaterial({ sss: 0.3, wind: 0.5, mottle: 0.3, bump: 0.5, vertexColors: true, massMap: F.leafMassTexture('leaf'), massScale: 1 / 0.3, ragged: 0.35 }); mat.color.set(0x54763b); for (const [x, z, s] of [[-0.5, 0, 0.75], [0.48, 0.14, 0.62], [0.05, -0.55, 0.52]]) { const m = new k.THREE.Mesh(F.bushGeometry(5, { lobes: 6, detail: 2, lump: 0.14 }), mat); m.scale.set(s, s * 0.72, s); m.position.set(x, s * 0.42, z); g.add(m); } return g; } },
  { id: 'pine', family: 'bush', name: 'Black pine', jp: '黒松', tag: 'A small garden pine', plinth: 'earth', hour: 15,
    blurb: 'Matted black pine held by wire and pruned into its classic horizontal shape. The spine of any formal garden.',
    how: ['Lumpy crown geometry, pine-green, low detail to suggest dense needle masses.'], use: 'The centrepiece of a front garden.', sources: ['notes'],
    build(k) { const g = new k.THREE.Group(); const mat = F.createFoliageMaterial({ sss: 0.2, wind: 0.3, mottle: 0.4, bump: 0.5, vertexColors: true, massMap: F.leafMassTexture('leaf'), massScale: 1 / 0.25, ragged: 0.4 }); mat.color.set(0x3e5e28); const m = new k.THREE.Mesh(F.bushGeometry(7, { lobes: 5, detail: 2, lump: 0.18 }), mat); m.scale.set(0.8, 0.6, 0.7); m.position.y = 0.55; g.add(m); const trunk = new k.THREE.Mesh(new k.THREE.CylinderGeometry(0.04, 0.08, 0.5), k.M.wood({ base: 0x4a3828, dark: 0x2e2218, rough: 1 })); trunk.position.y = 0.28; g.add(trunk); return g; } },
  { id: 'maple', family: 'bush', name: 'Japanese maple', jp: '紅いも', tag: 'A small ornamental maple', plinth: 'earth', hour: 15,
    blurb: 'A small maple kept at shrub height by the garden. In autumn the leaves turn a deep red.',
    how: ['Open lumpy canopy in the foliage shader; autumn colour study below.'], use: 'A view through the engawa, or at the garden gate.', sources: ['notes'],
    build(k) { const g = new k.THREE.Group(); const mat = F.createFoliageMaterial({ sss: 0.25, wind: 0.8, mottle: 0.35, bump: 0.55, vertexColors: true, massMap: F.leafMassTexture('leaf'), massScale: 1 / 0.6, ragged: 1 }); mat.color.set(0x7a8a3c); const m = new k.THREE.Mesh(F.bushGeometry(9, { lobes: 9, detail: 2, lump: 0.42 }), mat); m.scale.set(0.7, 0.55, 0.7); m.position.y = 0.5; g.add(m); const trunk = new k.THREE.Mesh(new k.THREE.CylinderGeometry(0.03, 0.06, 0.4), k.M.wood({ base: 0x5e4838, dark: 0x3a2a1e, rough: 1 })); trunk.position.y = 0.22; g.add(trunk); return g; } },
  { id: 'maple-autumn', family: 'bush', name: 'Maple in autumn', jp: '紅葉', tag: 'The maple at its peak', plinth: 'earth', hour: 15,
    blurb: 'In November and December the maple turns red, orange and gold. Kyoto is painted in this colour.',
    how: ['Same maple geometry, autumn palette in the paint shader.'], use: 'The seasonal view that visitors wait for.', sources: ['notes'],
    build(k) { const g = new k.THREE.Group(); const mat = F.createFoliageMaterial({ sss: 0.25, wind: 0.8, mottle: 0.35, bump: 0.55, vertexColors: true, massMap: F.leafMassTexture('leaf'), massScale: 1 / 0.6, ragged: 1 }); mat.color.set(0xc44a24); const m = new k.THREE.Mesh(F.bushGeometry(9, { lobes: 9, detail: 2, lump: 0.42 }), mat); m.scale.set(0.7, 0.55, 0.7); m.position.y = 0.5; g.add(m); const trunk = new k.THREE.Mesh(new k.THREE.CylinderGeometry(0.03, 0.06, 0.4), k.M.wood({ base: 0x5e4838, dark: 0x3a2a1e, rough: 1 })); trunk.position.y = 0.22; g.add(trunk); return g; } },
  { id: 'hydrangea', family: 'bush', name: 'Hydrangea', jp: '紫陽花', tag: 'A bush of blue-green balls', plinth: 'earth', hour: 15,
    blurb: 'In July the hydrangea blooms into clusters of blue or pink balls. A sign of the rainy season.',
    how: ['Bush geometry with many small sphere "flowers" attached.'], use: 'Along the path in early summer.', sources: ['notes'],
    build(k) { const g = new k.THREE.Group(); const mat = F.createFoliageMaterial({ sss: 0.3, wind: 0.9, rustle: 1.0, mottle: 0.2, bump: 0.45, vertexColors: true, massMap: F.leafMassTexture('leaf'), massScale: 1 / 0.55, ragged: 1 }); mat.color.set(0x487a3c); const m = new k.THREE.Mesh(F.bushGeometry(8, { lobes: 8, detail: 2, lump: 0.38 }), mat); m.scale.setScalar(0.8); m.position.y = 0.38; g.add(m); const flowerMat = k.M.plain(0x4a8ab8, { rough: 0.6 }); const r = k.rng(42); for (let i = 0; i < 12; i++) { const a = r() * k.TAU, d = r() * 0.5 + 0.1; const f = new k.THREE.Mesh(new k.THREE.SphereGeometry(0.06, 10, 8), flowerMat); f.position.set(Math.cos(a) * d * 0.8, 0.65 + r() * 0.15, Math.sin(a) * d * 0.8); g.add(f); } return g; } },
  { id: 'cherry', family: 'bush', name: 'Cherry blossom', jp: '桜', tag: 'A dwarf ornamental cherry', plinth: 'earth', hour: 15,
    blurb: 'In late March and April the cherry blossoms open. A small ornamental cherry for the front garden.',
    how: ['Maple canopy geometry, pink-white blossoms.'], use: 'A view from the engawa; a photo op for visitors.', sources: ['notes'],
    build(k) { const g = new k.THREE.Group(); const mat = F.createFoliageMaterial({ sss: 0.2, wind: 0.8, mottle: 0.25, bump: 0.5, vertexColors: true, massMap: F.leafMassTexture('leaf'), massScale: 1 / 0.7, ragged: 0.8 }); mat.color.set(0xf2d8d4); const m = new k.THREE.Mesh(F.bushGeometry(9, { lobes: 10, detail: 2, lump: 0.48 }), mat); m.scale.set(0.65, 0.5, 0.65); m.position.y = 0.48; g.add(m); const trunk = new k.THREE.Mesh(new k.THREE.CylinderGeometry(0.03, 0.05, 0.35), k.M.wood({ base: 0x4e3a2e, dark: 0x2e2018, rough: 1 })); trunk.position.y = 0.18; g.add(trunk); return g; } },
  { id: 'camellia', family: 'bush', name: 'Camellia', jp: '椿', tag: 'A camellia in bloom', plinth: 'earth', hour: 15,
    blurb: 'Camellias bloom in late winter and early spring, a splash of colour before the cherry trees.',
    how: ['Dense evergreen foliage, glossy red flowers.'], use: 'Along the garden wall; a winter bloom.', sources: ['notes'],
    build(k) { const g = new k.THREE.Group(); const mat = F.createFoliageMaterial({ sss: 0.18, wind: 0.4, mottle: 0.15, bump: 0.4, vertexColors: true, massMap: F.leafMassTexture('leaf'), massScale: 1 / 0.35, ragged: 0.3 }); mat.color.set(0x385e2c); const m = new k.THREE.Mesh(F.bushGeometry(6, { lobes: 7, detail: 2, lump: 0.2 }), mat); m.scale.set(0.7, 0.55, 0.65); m.position.y = 0.35; g.add(m); const flowerMat = k.M.plain(0xb82828, { rough: 0.4 }); const r = k.rng(88); for (let i = 0; i < 5; i++) { const f = new k.THREE.Mesh(new k.THREE.SphereGeometry(0.05, 10, 8), flowerMat); f.position.set((r() - 0.5) * 0.7, 0.55 + r() * 0.1, (r() - 0.5) * 0.7); g.add(f); } return g; } }
];

export const STEPS = [
  { title: 'Before it shows', body: '<p>The shoot sets its number of nodes while still underground.</p>', phase: 0 },
  { title: 'The first week', body: '<p>Internodes at the base stretch first. The shoot is mostly sheath.</p>', code: 'height = H * growthCurve(days, born)', phase: 1 },
  { title: 'A metre a day', body: '<p>At peak the culm grows faster than a metre a day, and the longest internodes move up toward the middle.</p>', phase: 2 },
  { title: 'Shed the sheaths', body: '<p>They dry and fall off from the bottom, leaving the white-powdered ring.</p>', phase: 3 },
  { title: 'Open the leaves', body: '<p>Branches spread in the top third. Sixty days, and it is the height of a house.</p>', phase: 4 }
];

export const ASSEMBLY = {
  radius: 3.2, target: [0, 2.6, 0], shadow: 6,
  build(k) {
    const root = new k.THREE.Group(), g = new k.THREE.Mesh(CULM, k.M.bamboo({ vcol: true })), L = new k.THREE.Mesh(new k.THREE.ConeGeometry(0.15, 0.5, 12), k.M.plain(0x7a5a36));
    g.scale.set(0.09, 0.2, 0.09); root.add(g); L.position.y = 0.2; root.add(L);
    const ground = new k.THREE.Mesh(new k.THREE.CylinderGeometry(1.4, 1.4, 0.1, 32), k.M.plain(0x6b7c4e)); ground.position.y = -0.05; ground.userData.noShadow = true; root.add(ground);
    const heights = [0.1, 0.7, 3.2, 5.6, 6]; let h = 0.2;
    return { group: root, setPhase(p) { h = heights[p]; L.visible = p < 2; }, update(t, dt) { g.scale.y += (h - g.scale.y) * Math.min(1, dt * 2); } };
  }
};
