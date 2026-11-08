// Lab 18 tiles. Tile code = build().
import * as THREE from 'three';
import { loadAmbientLifeModule } from '../../shared/game.js';
import { ownMaterials } from '../../shared/original.js';
import { V3, TAU, Bag, instances } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { KOI_KINDS, koiTexture, koiGeometry, koiMaterial, sparrowGeo, wingGeo, butterfly, wingTexture } from './kit.js';

let AL = null;
export const loadDeps = async () => { AL = (await loadAmbientLifeModule()).AmbientLife; };
const life = () => new AL(new THREE.Group(), null, new THREE.Vector3());
let lifeCache = null;
const gameLife = () => (lifeCache ||= life());

export const SOURCES = {
  boid: ['Boid Fish · CPU flocking in Three.js', 'https://github.com/RAPHCRAP/Boid_Fish', 'excerpt'],
  reef: ['The Coral Reef · 500 boids with a spatial hash', 'https://kody-w.github.io/learnwithkody/examples/coral-reef/', 'excerpt'],
  gpu: ['GPU flocking notes', 'https://sites.google.com/site/gpuplayground/home/gpu-flocking', 'excerpt'],
  showa: ['Pond Informer · Guide to Shōwa koi', 'https://pondinformer.com/showa-koi-guide/', 'excerpt'],
  five: ['Pond Trade · Five tips to tell Sanke from Shōwa', 'https://www.pondtrademag.com/five-tips-identifying-sanke-showa-koi/', 'excerpt'],
  sanke: ['Vijverleven · Sanke versus Shōwa', 'https://vijverleven.nl/en/blogs/kennisbank/sanke-versus-showa', 'excerpt'],
  notes: ['Critters research notes', 'research.md', 'notes']
};

export const FAMILIES = [
  { key: 'koi', title: 'Painted fish, <em>bent from the tail</em>', sub: 'The game’s koi already have good patterns. Swimming is a sine wave along the body, and the real difference between kinds is where the colour goes.' },
  { key: 'birds', title: 'Small birds, <em>in silhouette</em>', sub: 'Up in the sky, birds are a shape and a rhythm.' },
  { key: 'flutter', title: 'Things that choose <em>a flower</em>', sub: 'The game’s butterflies are coloured dots. Up close, a butterfly is two painted hinges.' }
];

export const SPECIMENS = [
  { id: 'game-koi', family: 'koi', original: true, name: 'A koi from the river', jp: '今の鯉', tag: 'AmbientLife, as it ships', plinth: 'water', hour: 12, game: () => AL.prototype.buildKoi,
    blurb: 'One of the real game koi: a toon body with a painted hide, an ink outline, and tail and pectoral pivots.',
    how: ['Toon-shaded body with a separate tail and pectoral meshes.'], use: 'Baseline.', sources: ['notes'],
    build(k) { const f = gameLife().koi[1].mesh.clone(); f.position.set(0, 0.25, 0); f.rotation.set(0, 0.6, 0); return f; } },
  ...Object.entries(KOI_KINDS).map(([id, P], i) => ({
    id, family: 'koi', name: P.label, jp: ['紅白', '三色', '昭和', '黄金', '丹頂'][i], tag: P.hint, plinth: 'water', hour: 12, animatedShadow: false,
    blurb: { kohaku: 'White with patches of red: the classic. Where the red sits decides how good it is.', sanke: 'White, red and small black spots that stay above the lateral line.', showa: 'A black fish with white and red, and the black wraps right round to the belly.', ogon: 'One colour, shining. Simple and it reads well from above.', tancho: 'All white with one red circle on the head, named for the crane.' }[id],
    how: ['A hide painted once to canvas.', 'The body bends with a travelling sine, driven in the vertex shader per instance.'], use: 'Mixed through the valley’s river and the stage’s pond.', sources: ['showa', 'five', 'sanke'], also: [koiGeometry],
    build: new Function('k', `return window.__koiTile(${JSON.stringify(id)}, k);`)
  })),
  { id: 'game-bird', family: 'birds', original: true, name: 'A sparrow', jp: '今の雀', tag: 'A low-poly body and two flapping wings', plinth: 'wood', hour: 12, animatedShadow: false, game: () => AL.prototype.buildBirds,
    blurb: 'One real sparrow from the game’s flock: a lathe body, swept wings and a forked tail.',
    how: ['Each bird is its own group with two wing meshes flapped in JavaScript.'], use: 'Baseline.', sources: ['notes'],
    build(k) { const b = gameLife().birds[0], m = b.mesh.clone(); m.position.set(0, 0.55, 0); m.rotation.y = 0.6; m.scale.setScalar(2.2); return { group: m, noCast: false, update: (t) => { const f = Math.sin(t * 15) * 0.7; m.children[1].rotation.z = -f; m.children[2].rotation.z = f; } }; } },
  { id: 'flock', family: 'birds', name: 'A flock, as one draw', jp: '群れ', tag: 'Boids and three instanced meshes', plinth: 'wood', hour: 12, animatedShadow: false,
    blurb: 'One small flock, instanced: body, left wing and right wing are three instanced meshes.',
    how: ['Separation, alignment, cohesion.', 'Beyond a few hundred, O(n²) is the bottleneck, and a spatial hash or GPU flocking takes over.'], use: 'The stage’s sparrows.', sources: ['boid', 'reef', 'gpu'], also: [sparrowGeo],
    build(k) { const body = new k.THREE.InstancedMesh(sparrowGeo(), k.M.plain(0x6a5444, { rough: 0.8 }), 8), wings = [new k.THREE.InstancedMesh(wingGeo(), k.M.plain(0x54402f, { side: k.THREE.DoubleSide, rough: 0.8 }), 8), new k.THREE.InstancedMesh(wingGeo(), k.M.plain(0x54402f, { side: k.THREE.DoubleSide, rough: 0.8 }), 8)]; const o = new k.THREE.Object3D(), g = new k.THREE.Group(); g.add(body, ...wings); return { group: g, update(t) { for (let i = 0; i < 8; i++) { const a = t * 0.8 + i * 0.78, x = Math.cos(a) * 0.5, y = 0.6 + Math.sin(a * 2.1) * 0.08, z = Math.sin(a) * 0.5; o.position.set(x, y, z); o.rotation.set(0, -a, 0); o.scale.setScalar(0.9); o.updateMatrix(); body.setMatrixAt(i, o.matrix); const f = Math.sin(t * 14 + i) * 0.9; for (const [m, s] of [[wings[0], 1], [wings[1], -1]]) { o.rotation.set(0, -a, f * s); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.scale?.set?.(1, 1, 1); } } body.instanceMatrix.needsUpdate = true; wings[0].instanceMatrix.needsUpdate = true; wings[1].instanceMatrix.needsUpdate = true; } }; } },
  { id: 'game-flutter', family: 'flutter', original: true, name: 'Our butterflies', jp: '今の蝶', tag: 'A cloud of coloured points', plinth: 'moss', hour: 12, animatedShadow: false, game: () => AL.prototype.buildButterflies,
    blurb: 'The real system: fifty additive sprites with a bobbing path. Lovely from afar. They have no wings up close.',
    how: ['A Points cloud with an additive butterfly texture.'], use: 'Baseline.', sources: ['notes'],
    build(k) { const g = gameLife(); g.bflyMat.opacity = 1; const p = g.butterflies.clone(); p.position.set(0, 0.2, 0); p.scale.setScalar(0.07); return { group: p, noCast: true }; } },
  { id: 'hinge', family: 'flutter', name: 'Two painted hinges', jp: '羽ばたき', tag: 'Wings that open and close', plinth: 'moss', hour: 12, animatedShadow: false,
    blurb: 'Two alpha-tested quads hinged at the body, flapping on a sine with short stops at the top and bottom.',
    how: ['A canvas wing with veins and a dark margin.', 'Flap = Math.pow(abs(sin), 0.7), which spends more time open than closed.'], use: 'Within a few metres of the cat.', sources: ['notes'], also: [butterfly],
    build(k) { const b = butterfly('#f0b42a', 3), w = new k.THREE.Group(); b.position.y = 0.42; b.scale.setScalar(3.4); w.add(b); return { group: w, noCast: true, update: (t) => { const f = Math.pow(Math.abs(Math.sin(t * 7)), 0.7) * 1.15; b.userData.wings[0].rotation.z = f; b.userData.wings[1].rotation.z = -f; } }; } }
];

window.__koiTile = (id, k) => {
  const g = new k.THREE.Group(), u = { value: 0 };
  const mesh = new k.THREE.InstancedMesh(koiGeometry(), koiMaterial(koiTexture(id, 3), u), 1);
  mesh.geometry.setAttribute('aKoi', new k.THREE.InstancedBufferAttribute(new Float32Array([7, 0]), 2));
  const o = new k.THREE.Object3D(); o.position.set(0, 0.28, 0); o.rotation.y = 0.6; o.updateMatrix(); mesh.setMatrixAt(0, o.matrix); g.add(mesh);
  return { group: g, noCast: true, update: (t) => { u.value = t; } };
};

export const STEPS = [
  { title: 'Paint the hide', body: '<p>All of the koi’s character is one canvas, drawn once at load.</p>', phase: 0 },
  { title: 'Lathe a body', body: '<p>A lathed profile, fatter toward the head, with two fins and a tail merged in.</p>', phase: 1 },
  { title: 'Send a wave down it', body: '<p>A travelling sine along the body, growing toward the tail. Nothing else moves the fish.</p>', code: 'transformed.x += sin(position.z * 9. + uT * aKoi.x) * tail * tail * 0.08', phase: 2 },
  { title: 'Let it flock', body: '<p>Separation, alignment and cohesion, plus a bias toward the last place food fell.</p>', phase: 3 }
];

export const ASSEMBLY = {
  radius: 1.2, target: [0, 0.3, 0], shadow: 2,
  build(k) {
    const g = new k.THREE.Group(), u = { value: 0 };
    const mesh = new k.THREE.InstancedMesh(koiGeometry(), koiMaterial(koiTexture('sanke', 3), u), 1);
    const attr = new k.THREE.InstancedBufferAttribute(new Float32Array([0, 0]), 2); mesh.geometry.setAttribute('aKoi', attr);
    const o = new k.THREE.Object3D(); o.position.y = 0.3; o.updateMatrix(); mesh.setMatrixAt(0, o.matrix); g.add(mesh);
    const base = new k.THREE.Mesh(new k.THREE.CylinderGeometry(1, 1, 0.06, 32), k.M.plain(0x3f6a6a)); base.position.y = -0.03; base.userData.noShadow = true; g.add(base);
    let ph = 0;
    return { group: g, setPhase(p) { ph = p; attr.setX(0, p >= 2 ? 7 : 0); attr.needsUpdate = true; }, update(t) { u.value = t; } };
  }
};
