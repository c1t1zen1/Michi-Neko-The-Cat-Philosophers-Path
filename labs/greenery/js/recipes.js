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
    build(k) { const g = new k.THREE.Group(); for (let i = 0; i < 8; i++) { const m = new k.THREE.Mesh(new k.THREE.ConeGeometry(0.16 - i * 0.012, 0.3, 14, 1, true), k.M.plain(i % 2 ? 0x8a6a42 : 0x7a5a36, { rough: 0.9, side: k.THREE.DoubleSide })); m.position.y = 0.12 + i * 0.1; m.rotation.y = i * 2.4; g.add(m); } return g; } },
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
    build(k) { const u = { uT: { value: 0 }, uW: { value: 1 } }; const mat = swayMat(new k.THREE.MeshStandardMaterial({ map: leafTexture(), alphaTest: 0.4, roughness: 0.7, side: k.THREE.DoubleSide }), u); const g = new k.THREE.PlaneGeometry(0.1, 0.34, 1, 3).translate(0, -0.17, 0); const list = [], r = k.rand; for (let i = 0; i < 160; i++) { const a = r() * k.TAU, d = 0.1 + r() * 0.55; list.push({ x: Math.cos(a) * d, y: 0.9 + r() * 1.4, z: Math.sin(a) * d, rx: 0.5 + r() * 0.8, ry: a, rz: (r() - 0.5) * 0.5, s: 0.9 + r() * 0.4 }); } const m = k.instances(g, mat, list); m.frustumCulled = false; const t = new k.THREE.Group(); t.add(m); const c = new k.THREE.Mesh(CULM, k.M.bamboo({ vcol: true })); c.scale.set(0.05, 2.6, 0.05); t.add(c); return { group: t, update: (T) => { u.uT.value = T; } }; } },

  { id: 'game-bush', family: 'bush', original: true, name: 'A street bush', jp: '今の茂み', tag: 'bushGeometry() + the foliage shader', plinth: 'earth', hour: 15, game: G('buildStreetBushes'),
    blurb: 'The real lumpy-bush geometry and the foliage shader the street bushes use.',
    how: ['Lobes merged into one lumpy mesh, shaded with a painted leaf mass.'], use: 'Baseline.', sources: ['notes'],
    build(k) { const g = new k.THREE.Group(); const mat = F.createFoliageMaterial({ sss: 0.3, wind: 0.9, rustle: 1.0, mottle: 0.2, bump: 0.45, vertexColors: true, massMap: F.leafMassTexture('leaf'), massScale: 1 / 0.55, ragged: 1 }); const m = new k.THREE.Mesh(F.bushGeometry(9, { lobes: 8, detail: 2, lump: 0.34 }), mat); m.scale.setScalar(0.9); m.position.y = 0.42; g.add(m); return g; } },
  { id: 'karikomi', family: 'bush', name: 'Karikomi', jp: '刈込', tag: 'Azalea clipped into cushions', plinth: 'earth', hour: 15,
    blurb: 'The clipped rounds of a Kyoto garden: not a bush but a shape held by someone with shears every year.',
    how: ['Smooth lumpy forms with a fine leaf mass; lower detail than a free-growing bush.'], use: 'Street corners and garden edges.', sources: ['notes'],
    build(k) { const g = new k.THREE.Group(); const mat = F.createFoliageMaterial({ sss: 0.3, wind: 0.5, mottle: 0.3, bump: 0.5, vertexColors: true, massMap: F.leafMassTexture('leaf'), massScale: 1 / 0.3, ragged: 0.35 }); for (const [x, z, s] of [[-0.5, 0, 0.75], [0.48, 0.14, 0.62], [0.05, -0.55, 0.52]]) { const m = new k.THREE.Mesh(F.bushGeometry(5, { lobes: 6, detail: 2, lump: 0.14 }), mat); m.scale.set(s, s * 0.72, s); m.position.set(x, s * 0.42, z); g.add(m); } return g; } }
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
