// Lab 10 tiles. Tile code = build().
import * as THREE from 'three';
import { gameKit, ensureCountryside, ownMaterials } from '../../shared/original.js';
import { V3, TAU, tube, rng } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { buildNest, twigGeometry, twigPlacement, lining, eggTexture, feather } from './kit.js';

let cs = null;
export const loadDeps = async () => { cs = (await ensureCountryside()).prototype; };
const G = (n) => () => cs[n];

export const SOURCES = {
  birdfact: ['Birdfact · How do birds build nests?', 'https://birdfact.com/articles/how-do-birds-build-nests', 'excerpt'],
  allb: ['All About Birds · How nest designs protect baby birds', 'https://academy.allaboutbirds.org/understand-how-nest-designs-protect-baby-birds/', 'excerpt'],
  peerj: ['PeerJ, 2017 · bullfinch nest materials by position', 'https://doaj.org/article/1dbad2e2bd7a41b5978ded14b3edb7ef', 'excerpt'],
  inst: ['Three.js docs · InstancedMesh', 'https://threejs.org/docs/pages/InstancedMesh.html', 'docs'],
  notes: ['Nest research notes', 'research.md', 'notes']
};

export const FAMILIES = [
  { key: 'bowl', title: 'How much of a bowl <em>is a bowl</em>', sub: 'From the game’s torus to a nest laid twig by twig, in the order a bird would do it.' },
  { key: 'inside', title: 'What goes <em>inside</em>', sub: 'Moss, eggs and a feather. The small soft things.' }
];

const nestOf = (k, n) => { const b = buildNest(0.62, 3, n); const p = (ph, c) => { for (let i = 0; i < c; i++) b.add(ph, i); }; return { b, p }; };

export const SPECIMENS = [
  { id: 'game-nest', family: 'bowl', original: true, name: 'Our nest', jp: '今の巣', tag: 'buildBirdNest(), as it stands', plinth: 'wood', hour: 15, game: G('buildBirdNest'),
    blurb: 'A torus and a shallow disc, three eggs, and a golden feather standing in as the reward at the top of the climb.',
    how: ['TorusGeometry for the rim; a low cylinder for the floor.'], use: 'Baseline.', sources: ['notes'],
    build(k) { const kit = gameKit(); const g = new k.THREE.Group(); kit.buildBirdNest(g, k.V3()); g.children[0].position.set(0, 0, 0); return ownMaterials(g); } },
  { id: 'base', family: 'bowl', name: 'Coarse base', jp: '土台', tag: 'Thick sticks, laid every which way', plinth: 'wood', hour: 15,
    blurb: 'A first layer of the thickest twigs, scattered flat. A real cup nest uses its coarsest material at the bottom.',
    how: ['Placement on a disc, random yaw.'], use: 'First stage.', sources: ['birdfact', 'peerj'], also: [twigPlacement],
    build(k) { const { b, p } = nestOf(k, 80); p('base', 80); return b.im; } },
  { id: 'wall', family: 'bowl', name: 'Walls laid round', jp: '壁', tag: 'Twigs tangent to the rim', plinth: 'wood', hour: 15,
    blurb: 'The middle layers go on tangent to the cup, which is what makes it hold together visually as well as physically.',
    how: ['Each twig’s yaw follows the tangent at its angle, with a little noise.'], use: 'Second stage.', sources: ['birdfact'], also: [twigPlacement],
    build(k) { const { b, p } = nestOf(k, 240); p('base', 60); p('wall', 180); return b.im; } },
  { id: 'rim', family: 'bowl', name: 'Fine rim', jp: '縁', tag: 'Finer twigs, tucked in', plinth: 'wood', hour: 15,
    blurb: 'Thin twigs and grass at the top edge, lighter in colour because they are newer.',
    how: ['Smaller radius; brighter instance colour.'], use: 'Finishing stage.', sources: ['birdfact', 'peerj'], also: [twigPlacement],
    build(k) { const { b, p } = nestOf(k, 340); p('base', 60); p('wall', 180); p('rim', 100); return b.im; } },
  { id: 'lined', family: 'inside', name: 'Lined with moss', jp: '苔の内張り', tag: 'Pressed in by a warm body', plinth: 'wood', hour: 15,
    blurb: 'A lathed lining with a procedural moss bump, sitting inside the finished twigs.',
    how: ['Lining is a lathe shaped to the cup, with the shared moss shader.'], use: 'What makes it look lived in.', sources: ['allb'], also: [lining],
    build(k) { const { b, p } = nestOf(k, 340); p('base', 60); p('wall', 180); p('rim', 100); const g = new k.THREE.Group(); g.add(b.im, lining()); return g; } },
  { id: 'eggs', family: 'inside', name: 'Three eggs', jp: '卵', tag: 'Speckled, in a soft blue', plinth: 'wood', hour: 15,
    blurb: 'Spheres squashed a little, painted with speckles. The game’s eggs are the same colour and otherwise bald.',
    how: ['A speckled canvas and non-uniform scale.'], use: 'A detail for very close cameras.', sources: ['notes'], also: [eggTexture],
    build(k) { const g = new k.THREE.Group(), m = new k.THREE.MeshStandardMaterial({ map: eggTexture(), roughness: 0.5 }); for (let i = 0; i < 3; i++) { const a = i / 3 * k.TAU, e = new k.THREE.Mesh(new k.THREE.SphereGeometry(0.1, 18, 14), m); e.scale.set(1, 1.35, 1); e.position.set(Math.cos(a) * 0.14, 0.13, Math.sin(a) * 0.14); e.rotation.z = (i - 1) * 0.2; g.add(e); } return g; } },
  { id: 'feather', family: 'inside', name: 'A feather', jp: '羽根', tag: 'A quill and barbs on a card', plinth: 'wood', hour: 15, animatedShadow: false,
    blurb: 'A card with a painted quill and barbs. The reward in the game is a golden version of this.',
    how: ['Alpha-tested plane with a painted canvas.'], use: 'Replaces the two boxes that form the game’s feather.', sources: ['notes'], also: [feather],
    build(k) { const g = new k.THREE.Group(); const f = feather('#d8b45c'); f.position.y = 0.32; f.rotation.set(0.5, 0.4, 0.3); g.add(f); return g; } }
];

export const STEPS = [
  { title: 'Coarse on the bottom', body: '<p>The heaviest sticks first, flat and in no particular direction.</p>', phase: 0 },
  { title: 'Walls, tangent to the rim', body: '<p>Twigs laid round the cup, overlapping, working up from the base.</p>', phase: 1 },
  { title: 'Finer at the top', body: '<p>Thin twigs and grass at the rim. A bird’s beak is the only tool.</p>', phase: 2 },
  { title: 'Press out the cup', body: '<p>The bird sits in it and turns, pressing the shape out with its body and wings.</p>', phase: 3 },
  { title: 'Line it', body: '<p>Moss and soft things go in last. Then eggs.</p>', phase: 4 }
];

export const ASSEMBLY = {
  radius: 1.15, target: [0, 0.25, 0], shadow: 2.4,
  build(k) {
    const root = new k.THREE.Group(), base = new k.THREE.Mesh(new k.THREE.CylinderGeometry(1, 1, 0.05, 32), k.M.plain(0xa89a7c)); base.position.y = -0.03; base.userData.noShadow = true; root.add(base);
    const b = buildNest(0.62, 9, 340), line = lining(); root.add(b.im, line); line.visible = false;
    const eggs = new k.THREE.Group(); const m = new k.THREE.MeshStandardMaterial({ map: eggTexture(), roughness: 0.5 }); for (let i = 0; i < 3; i++) { const a = i / 3 * k.TAU, e = new k.THREE.Mesh(new k.THREE.SphereGeometry(0.1, 18, 14), m); e.scale.set(1, 1.35, 1); e.position.set(Math.cos(a) * 0.14, 0.15, Math.sin(a) * 0.14); eggs.add(e); } root.add(eggs); eggs.visible = false;
    const targets = [70, 250, 340, 340, 340]; let want = 0, phase = 0;
    return { group: root, setPhase(p) { phase = p; want = targets[p]; b.im.count = 0; b.im.instanceMatrix.needsUpdate = true; if (b.im.count) {} line.visible = p >= 4; eggs.visible = p >= 4; }, update(t, dt) { if (b.im.count < want) { for (let i = 0; i < Math.min(8, want - b.im.count); i++) { const n = b.im.count; b.add(n < 70 ? 'base' : n < 250 ? 'wall' : 'rim', n); } } } };
  }
};
