// Tree and foliage review sheets for art review.
//
//   python3 -m http.server 8000
//   open http://localhost:8000/tools/tree_preview.html?sheet=hero
//
// Sheets: hero (sakura / maple / pine with individual leaves on twigs),
// rim (edge-forest wall, rim trees and foothills as painted leaf masses),
// bush (street shrubs and wall undergrowth), compare (the old clump
// canopy beside the new one), detail (arm's-length close-ups), thicket
// (the shrine thicket closed and opened after main.js-style chunking),
// textures (spray and leaf-mass textures laid flat, tinted as in game).
// Everything is built through the real
// Vegetation / Countryside builders with seeded randomness, so a sheet
// renders identically on every capture. Extras: &golden=1 (low sun),
// &perf=1 (build timings and leaf counts in the corner), &time=/&wind=
// (freeze the canopy wind at a moment / strength).
import * as THREE from 'three';
import { Vegetation } from '../src/vegetation.js?v=20261022f';
import { Countryside } from '../src/countryside.js?v=20261022f';
import { chunkSceneInstances } from '../src/instanced_chunks.js?v=20261022f';
import {
  foliageUniforms, buildCanopy, createFoliageMaterial, createFoliageDepthMaterial, leafCardTexture,
  leafSprayTexture, leafMassTexture
} from '../src/foliage.js?v=20261022f';

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One set of vegetation materials shared by every cell; each cell gets its
// own builder state (scene group, RNG, static merges) on top of it.
const vegBase = Object.create(Vegetation.prototype);
vegBase._initMaterials();
function vegetation(group, style, seed = 77) {
  const v = Object.create(vegBase);
  Object.assign(v, { scene: group, colliders: [], rng: mulberry32(seed), swayables: [], _treeCount: 0, _staticAccum: new Map() });
  v.treeStyle = () => style;
  return v;
}
/** A cell that builds one tree through the real Vegetation code. */
const tree = (style, kind, scale) => (g) => {
  const v = vegetation(g, style);
  v[kind](0, 0, scale);
  v._finalizeStatic();
};
const HERO = { rim: false, bake: false };
const HERO_BAKED = { rim: false, bake: true };
const RIM = { rim: true, bake: true };

function countryside(group) {
  const c = Object.create(Countryside.prototype);
  Object.assign(c, {
    scene: group, rng: mulberry32(20260729), colliders: [],
    terrainHeight: () => 0, terrainSector: () => ({ opening: 0 })
  });
  return c;
}

/** The pre-rework near-village sakura: clump cores fringed with cards. */
function legacySakura(group, scale) {
  const v = vegetation(group, HERO);
  const rng = v.rng;
  const tree = new THREE.Group();
  tree.rotation.y = rng() * Math.PI * 2;
  const trunk = v.trunkMesh(0.13 * scale, 0.22 * scale, 2.3 * scale, v.matTrunks[0], (rng() - 0.5) * 0.14);
  tree.add(trunk);
  const built = buildCanopy(rng, {
    scale, colors: v.colSakura, trunkH: 2.3, trunkR: 0.13 * 1.15,
    primaries: 6, tilt: 0.9, tiltVar: 0.2, droop: -0.08, bend: 0.14, branchLen: 1.5,
    secondaries: 2, twigs: true, crownFill: 3, clumpR: 0.4,
    tuftsPerClump: [3, 3, 2], cardsPerClump: [11, 10, 7], cardSize: 0.6,
    tuftFlat: 0.72, lump: 0.34, seed: 11
  });
  const map = leafCardTexture('sakura');
  const parts = [
    new THREE.Mesh(built.branches, v.matTrunks[0]),
    new THREE.Mesh(built.tufts, createFoliageMaterial({ sss: 0.42, wind: 1.15, mottle: 0.24, bump: 0.44, roughness: 0.85 })),
    new THREE.Mesh(built.cards, createFoliageMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, sss: 0.5, wind: 1.2, mottle: 0.14, bump: 0.28, roughness: 0.85 }))
  ];
  parts[2].customDepthMaterial = createFoliageDepthMaterial(map, 0.5);
  for (const m of parts) {
    m.castShadow = m.receiveShadow = true;
    tree.add(m);
  }
  group.add(tree);
}

const SAKURA = { look: [0, 2.7, 0], az: 30, el: 8, dist: 11 };
const UNDER = { cam: [3.6, 0.35, 2.2], look: [0.6, 3.0, 0] };
const SHEETS = {
  hero: { cols: 3, cells: [
    { label: 'sakura · three-quarter', build: tree(HERO, 'sakuraTree', 1.2), ...SAKURA },
    { label: 'sakura · under the crown (cat eye)', build: tree(HERO, 'sakuraTree', 1.2), ...UNDER },
    { label: 'sakura · crown close-up', build: tree(HERO, 'sakuraTree', 1.2), cam: [4.4, 3.5, 2.6], look: [1.2, 3.4, 0.6] },
    { label: 'maple · three-quarter', build: tree(HERO, 'mapleTree', 1.1), look: [0, 2.2, 0], az: 30, el: 10, dist: 9 },
    { label: 'garden pine · three-quarter', build: tree(HERO, 'pineTree', 1.4), look: [0, 2.4, 0], az: 30, el: 10, dist: 9 },
    { label: 'sakura · across the field (baked)', build: tree(HERO_BAKED, 'sakuraTree', 1.2), look: [0, 2.7, 0], az: 30, el: 4, dist: 26 }
  ] },
  rim: { cols: 3, cells: [
    { label: 'edge wall · from the meadow', build: (g) => countryside(g).buildEdgeForest(), cam: [0, 1.7, 18], look: [0, 3.5, 40], shadow: 40 },
    { label: 'edge wall · close', build: (g) => countryside(g).buildEdgeForest(), cam: [2, 1.2, 31], look: [0, 3, 39], shadow: 30 },
    { label: 'foothills', build: (g) => countryside(g).buildFoothillForest(), cam: [0, 8, 35], look: [0, 6, 100], shadow: 60 },
    { label: 'rim sakura (mass)', build: tree(RIM, 'sakuraTree', 1.15), ...SAKURA },
    { label: 'rim maple (mass)', build: tree(RIM, 'mapleTree', 1.1), look: [0, 2.2, 0], az: 30, el: 10, dist: 9 },
    { label: 'rim pine (mass)', build: tree(RIM, 'pineTree', 1.4), look: [0, 2.4, 0], az: 30, el: 10, dist: 9 }
  ] },
  bush: { cols: 2, cells: [
    { label: 'street bushes · cat eye', build: streetBushes, frame: (s) => ({ cam: [0, 0.4, s.z + 3.2], look: [s.x, 0.45, s.z] }) },
    { label: 'street bushes · standing', build: streetBushes, frame: (s) => ({ cam: [-0.6, 1.7, s.z + 6], look: [s.x, 0.3, s.z - 1.5] }) },
    { label: 'street bush · close', build: streetBushes, frame: (s) => ({ cam: [s.x - 1.6, 0.75, s.z + 1.3], look: [s.x, 0.4, s.z] }) },
    { label: 'wall undergrowth', build: (g) => countryside(g).buildEdgeUndergrowth(), cam: [0, 1.0, 30], look: [0, 0.7, 37] }
  ] },
  compare: { cols: 2, cells: [
    { label: 'before · clump canopy', build: (g) => legacySakura(g, 1.2), ...SAKURA },
    { label: 'after · leaves on twigs', build: tree(HERO, 'sakuraTree', 1.2), ...SAKURA },
    { label: 'before · under the crown', build: (g) => legacySakura(g, 1.2), ...UNDER },
    { label: 'after · under the crown', build: tree(HERO, 'sakuraTree', 1.2), ...UNDER }
  ] },
  thicket: { cols: 2, cells: [
    { label: 'shrine thicket · closed', build: thicket(0), cam: [0, 2.2, -21], look: [0, 2.4, -40], shadow: 25 },
    { label: 'shrine thicket · opened (after main.js chunking)', build: thicket(1), cam: [0, 2.2, -21], look: [0, 2.4, -40], shadow: 25 }
  ] },
  detail: { cols: 2, cells: [
    { label: 'sakura · arm\'s length', build: tree(HERO, 'sakuraTree', 1.2), cam: [3.2, 2.7, 1.6], look: [1.6, 3.3, 0.2] },
    { label: 'maple · arm\'s length', build: tree(HERO, 'mapleTree', 1.1), cam: [2.8, 2.0, 1.8], look: [1.2, 2.6, 0.3] },
    { label: 'garden pine · pads', build: tree(HERO, 'pineTree', 1.4), look: [0, 2.9, 0], az: 30, el: 18, dist: 5.5 },
    { label: 'sakura · looking up from the cat', build: tree(HERO, 'sakuraTree', 1.2), cam: [0.9, 0.3, 0.9], look: [1.4, 3.5, 1.0] }
  ] },
  textures: { cols: 1, cells: [
    { label: 'sprays · sakura, maple, broadleaf, needle', build: swatches([
      [leafSprayTexture('sakura'), 0xf6c6d2], [leafSprayTexture('maple'), 0xe0704a],
      [leafSprayTexture('broadleaf'), 0x5a8536], [leafSprayTexture('needle'), 0x4a7040]
    ]), look: [0, 1.2, 0], az: 0, el: 0, dist: 6.5 },
    { label: 'leaf masses · leaf, blossom, needle (shading channel, 2×2 tiles)', build: swatches([
      [leafMassTexture('leaf'), 0xffffff, 2], [leafMassTexture('blossom'), 0xffffff, 2], [leafMassTexture('needle'), 0xffffff, 2]
    ]), look: [0, 1.2, 0], az: 0, el: 0, dist: 5 }
  ] }
};

/**
 * The edge forest behind the shrine, chunked exactly as main.js chunks the
 * live scene, then opened to `t` — the parted thicket must move with it.
 */
function thicket(t) {
  return (g) => {
    const c = countryside(g);
    c.buildEdgeForest();
    chunkSceneInstances(g, { cell: 32, minRadius: 40, minCount: 12, minTriangles: 80000 });
    if (t > 0) c.setShrineThicketOpen(t);
  };
}

/** Flat swatches of one texture family, tinted the way the game tints them. */
function swatches(textures) {
  return (g) => {
    textures.forEach(([tex, tint, repeat], i) => {
      const map = repeat ? tex.clone() : tex;
      if (repeat) {
        map.repeat.set(repeat, repeat);
        map.needsUpdate = true;
      }
      const mat = new THREE.MeshBasicMaterial({ map, color: tint, alphaTest: repeat ? 0 : 0.5, side: THREE.DoubleSide });
      // Leaf masses: show the shading channel alone (G/B hold leaf tilts)
      if (repeat) {
        mat.onBeforeCompile = (s) => {
          s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = vec3(diffuseColor.r);');
        };
      }
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
      quad.position.set((i - (textures.length - 1) / 2) * 2.15, 1.2, 0);
      g.add(quad);
    });
  };
}

/** Street bushes, framed on the biggest one near the middle of the street. */
function streetBushes(g) {
  const c = countryside(g);
  c.buildStreetBushes();
  let best = null;
  for (const [x, z, s] of c.bushColliderSpots) {
    if (x > 0 && Math.abs(z) < 12 && (!best || s > best.s)) best = { x, z, s };
  }
  return best;
}

const params = new URLSearchParams(location.search);
const sheet = SHEETS[params.get('sheet')] || SHEETS.hero;
const golden = params.get('golden') === '1';
const log = document.getElementById('log');

const canvas = document.getElementById('preview');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.32;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(golden ? 0xe8b48a : 0x9cc4dc);
const sunColor = new THREE.Color(golden ? 0xffb070 : 0xffd9a8);
const sunOffset = new THREE.Vector3(-9, golden ? 4 : 14, 10).normalize();
const sun = new THREE.DirectionalLight(sunColor, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight(0x8fa5c9, 0x9a7a55, 0.85));
const fill = new THREE.DirectionalLight(0x5a4a78, 0.35);
fill.position.set(40, 30, 60);
scene.add(fill);
foliageUniforms.uSunDir.value.copy(sunOffset);
foliageUniforms.uSunColor.value.copy(sunColor).multiplyScalar(golden ? 0.8 : 1.15);
// &time= / &wind= freeze the canopy wind at a moment and strength (e.g.
// wind=4 exaggerates a gust, to check leaves stay on their twigs)
foliageUniforms.uTime.value = parseFloat(params.get('time') || '0');
foliageUniforms.uWindGlobal.value = parseFloat(params.get('wind') || '1');

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(600, 600),
  new THREE.MeshStandardMaterial({ color: 0x7f8a5c, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const perfLines = [];
const cells = sheet.cells.map((c) => {
  const group = new THREE.Group();
  const t0 = performance.now();
  const framed = c.build(group);
  // Vegetation cells finish their static merges (trunks, baked canopies)
  group.userData.ms = performance.now() - t0;
  scene.add(group);
  let leaves = 0, verts = 0;
  group.traverse((o) => {
    if (!o.isMesh) return;
    const n = o.geometry.attributes.position ? o.geometry.attributes.position.count : 0;
    verts += n * (o.isInstancedMesh ? o.count : 1);
    if (o.material && o.material.map) leaves += n / 9; // spray cards are 9-vertex
  });
  perfLines.push(`${c.label}: ${group.userData.ms.toFixed(0)} ms · ${(verts / 1000).toFixed(0)}k verts` + (leaves ? ` · ${leaves | 0} sprays` : ''));
  return { ...c, ...(c.frame && framed ? c.frame(framed) : {}), group };
});
if (params.get('perf') === '1') {
  console.log('PERF ' + perfLines.join(' | '));
  log.textContent += perfLines.join('\n');
}

const cols = sheet.cols;
const rows = Math.ceil(cells.length / cols);
const cw = Math.floor(innerWidth / cols);
const ch = Math.floor(innerHeight / rows);
const camera = new THREE.PerspectiveCamera(42, cw / ch, 0.05, 600);
const deg = THREE.MathUtils.degToRad;

renderer.setScissorTest(true);
cells.forEach((c, i) => {
  const col = i % cols;
  const row = Math.floor(i / cols);
  const x = col * cw;
  const y = innerHeight - (row + 1) * ch;
  renderer.setViewport(x, y, cw, ch);
  renderer.setScissor(x, y, cw, ch);
  for (const o of cells) o.group.visible = o === c;

  const look = new THREE.Vector3(...c.look);
  if (c.cam) {
    camera.position.set(...c.cam);
  } else {
    const az = deg(c.az), el = deg(c.el);
    camera.position.set(
      look.x + Math.sin(az) * Math.cos(el) * c.dist,
      look.y + Math.sin(el) * c.dist,
      look.z + Math.cos(az) * Math.cos(el) * c.dist
    );
  }
  camera.lookAt(look);
  // The sun's shadow frustum follows the subject
  const span = c.shadow || 14;
  sun.target.position.copy(look);
  sun.position.copy(look).addScaledVector(sunOffset, span * 1.5);
  Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 0.5, far: span * 3.5 });
  sun.shadow.camera.updateProjectionMatrix();
  renderer.render(scene, camera);

  const label = document.createElement('div');
  label.className = 'cell-label';
  label.textContent = c.label;
  label.style.left = `${x + 10}px`;
  label.style.top = `${row * ch + 8}px`;
  document.body.appendChild(label);
});

document.title = 'ready';
