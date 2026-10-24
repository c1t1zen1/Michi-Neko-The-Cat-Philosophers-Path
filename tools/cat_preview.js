// Cat model turnaround / pose sheets for art review.
//
//   python3 -m http.server 8000
//   open http://localhost:8000/tools/cat_preview.html?sheet=anatomy
//
// Sheets: anatomy, face, coat, gait, stride, poses, sleep, closeup, npcs. Every
// cat is posed by driving the real Cat.update() with fixed time steps, and
// Math.random is seeded so a sheet renders identically on every capture.
// Extras: &raw=1 (bare sculpts), &golden=1 (sunset light), &debug=1 (bone
// positions in the console), &perf=1 (build + update timings).
import * as THREE from 'three';
import { Cat, catRimUniforms } from '../src/cat.js?v=20261024a';
import { getCatAnatomy, BUILDS } from '../src/cat_anatomy.js?v=20261024a';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * `?raw=1` swaps every cat for its bare sculpted anatomy (rest pose, no
 * skinning or coat shader) — the quickest way to judge silhouettes.
 */
function rawAnatomy(buildName) {
  const a = getCatAnatomy(BUILDS[buildName] || BUILDS.michi);
  const L = a.landmarks;
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xc9a27a, roughness: 0.75 });
  const add = (geo, pos, m = mat) => {
    const mesh = new THREE.Mesh(geo, m);
    if (pos) mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.castShadow = true;
    g.add(mesh);
    return mesh;
  };
  add(a.body);
  add(a.tail);
  add(a.head, L.head);
  add(a.collar.geometry, L.neck, new THREE.MeshStandardMaterial({ color: 0xc8402a }));
  add(a.nose, [L.head[0] + a.face.nose[0], L.head[1] + a.face.nose[1], L.head[2] + a.face.nose[2]], new THREE.MeshStandardMaterial({ color: 0xd07a80 }));
  for (const e of a.face.earBase) {
    const ear = new THREE.Group();
    ear.position.set(L.head[0] + e.pos[0], L.head[1] + e.pos[1], L.head[2] + e.pos[2]);
    ear.rotation.set(-0.12, e.side * 0.35, e.side * -0.32);
    ear.add(new THREE.Mesh(a.ears.outer, mat));
    ear.add(new THREE.Mesh(a.ears.inner, new THREE.MeshStandardMaterial({ color: 0xe0a0a8, side: THREE.DoubleSide })));
    g.add(ear);
  }
  console.log(`anatomy ${buildName}: ${a.buildMs.toFixed(0)} ms, body ${a.body.attributes.position.count} v, head ${a.head.attributes.position.count} v`);
  const label = document.getElementById('log');
  if (label && !label.dataset.timed) { label.dataset.timed = '1'; label.textContent += `build ${a.buildMs.toFixed(0)} ms · body ${a.body.attributes.position.count} v · head ${a.head.attributes.position.count} v\n`; }
  return g;
}

let seed = 20261022;
Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

const PALETTES = {
  michi: { fur: 0xae8450, belly: 0xeedcb8, accent: 0x5e3d26 },
  // Mirrors src/npc.js (coat + PERSONALITIES.stripes)
  luna: { fur: 0x7f8796, belly: 0xdadce2, accent: 0x474e5f, stripeAmount: 0.3, eyeColor: 0xdec056, ribbonColor: 0x2b3d63 },
  mochi: { fur: 0xe8b06a, belly: 0xfaf0dc, accent: 0xb07840, stripeAmount: 1.0, eyeColor: 0xa2ba6e, ribbonColor: 0xc8402a },
  kuro: { fur: 0x1c1c22, belly: 0x2e2e38, accent: 0x101014, stripeAmount: 0.0, eyeColor: 0xd8b04a, ribbonColor: 0xc8402a }
};

const STEP = 1 / 60;
function run(cat, seconds, args) {
  for (let t = 0; t < seconds; t += STEP) cat.update(STEP, ...args);
}

/** Drive a fresh cat into a named pose. */
function pose(cat, name, phase) {
  switch (name) {
    case 'walk':
      run(cat, 1.5, [4.5, true, false, false]);
      cat.phase = phase;
      cat.update(1e-5, 4.5, true, false, false);
      break;
    case 'slow':
      run(cat, 1.5, [1.15, true, false, false]);
      cat.phase = phase;
      cat.update(1e-5, 1.15, true, false, false);
      break;
    case 'run':
      run(cat, 1.5, [7.6, true, true, false]);
      cat.phase = phase;
      cat.update(1e-5, 7.6, true, true, false);
      break;
    case 'prowl':
      cat.setProwling(true);
      run(cat, 1.5, [2.2, true, false, false]);
      cat.phase = phase;
      cat.update(1e-5, 2.2, true, false, false);
      break;
    case 'jump':
      cat.onJump();
      run(cat, 0.2, [0, false, false, false]);
      break;
    case 'drink':
      cat.setDrinking(true);
      run(cat, 0.5, [0, true, false, false]);
      break;
    case 'startled':
      // What a diving bird does: hiss, bottlebrush tail
      cat.setMood('startled', 10, 3);
      run(cat, 1.0, [0, true, false, false]);
      break;
    case 'sit': case 'groom': case 'stretch': case 'yawn': case 'sleep':
      cat.idleAction = name;
      cat.idleActionTimer = 0;
      cat.idleActionDuration = name === 'sleep' ? Infinity : 10;
      run(cat, name === 'sleep' ? 5 : 4, [0, true, false, false]);
      break;
    default:
      run(cat, 1.0, [0, true, false, false]);
  }
}

const deg = THREE.MathUtils.degToRad;
// az: 0 = looking at the cat's face, 90 = its left flank. el = camera pitch.
const SHEETS = {
  anatomy: { cols: 3, cells: [
    { label: 'stand · side', az: 90, el: 4, dist: 2.1 },
    { label: 'stand · front', az: 0, el: 6, dist: 1.8 },
    { label: 'stand · three-quarter', az: 38, el: 12, dist: 2.0 },
    { label: 'stand · rear three-quarter', az: 145, el: 14, dist: 2.0 },
    { label: 'stand · top', az: 90, el: 82, dist: 2.2 },
    { label: 'stand · low three-quarter', az: -40, el: -2, dist: 1.8, ty: 0.3 }
  ] },
  face: { cols: 2, cells: [
    { label: 'face · front', az: 0, el: 4, dist: 0.62, ty: 0.65, tz: 0.33 },
    { label: 'face · three-quarter', az: 35, el: 8, dist: 0.65, ty: 0.65, tz: 0.33 },
    { label: 'face · profile', az: 90, el: 3, dist: 0.7, ty: 0.63, tz: 0.3 },
    { label: 'collar · front low', az: 12, el: -6, dist: 0.6, ty: 0.56, tz: 0.3 }
  ] },
  gait: { cols: 4, cells: [
    { label: 'walk 0.00', pose: 'walk', phase: 0.0, az: 90, el: 4, dist: 2.0 },
    { label: 'walk 0.125', pose: 'walk', phase: 0.125, az: 90, el: 4, dist: 2.0 },
    { label: 'walk 0.25', pose: 'walk', phase: 0.25, az: 90, el: 4, dist: 2.0 },
    { label: 'walk 0.375', pose: 'walk', phase: 0.375, az: 90, el: 4, dist: 2.0 },
    { label: 'run 0.00', pose: 'run', phase: 0.0, az: 90, el: 4, dist: 2.1 },
    { label: 'run 0.25', pose: 'run', phase: 0.25, az: 90, el: 4, dist: 2.1 },
    { label: 'prowl 0.25', pose: 'prowl', phase: 0.25, az: 90, el: 4, dist: 2.0 },
    { label: 'walk · three-quarter', pose: 'walk', phase: 0.3, az: 40, el: 12, dist: 2.0 }
  ] },
  poses: { cols: 4, cells: [
    { label: 'sit · side', pose: 'sit', az: 90, el: 6, dist: 1.9 },
    { label: 'sit · three-quarter', pose: 'sit', az: 35, el: 10, dist: 1.7 },
    { label: 'sleep', pose: 'sleep', az: 60, el: 40, dist: 1.6, ty: 0.15 },
    { label: 'groom', pose: 'groom', az: 50, el: 12, dist: 1.6 },
    { label: 'stretch', pose: 'stretch', az: 90, el: 6, dist: 2.0 },
    { label: 'jump', pose: 'jump', az: 90, el: 4, dist: 2.1, ty: 0.5 },
    { label: 'drink', pose: 'drink', az: 60, el: 10, dist: 1.8 },
    { label: 'yawn', pose: 'yawn', az: 25, el: 6, dist: 0.9, ty: 0.55, tz: 0.2 }
  ] },
  coat: { cols: 3, cells: [
    { label: 'coat · side', az: 90, el: 4, dist: 1.7 },
    { label: 'coat · back', az: 90, el: 70, dist: 1.8 },
    { label: 'coat · rear three-quarter', az: 145, el: 22, dist: 1.7 },
    { label: 'coat · front three-quarter', az: 35, el: 8, dist: 1.6 },
    { label: 'startled · side', pose: 'startled', az: 90, el: 6, dist: 1.9, ty: 0.5 },
    { label: 'startled · rear three-quarter', pose: 'startled', az: 145, el: 22, dist: 1.9, ty: 0.5 }
  ] },
  stride: { cols: 4, cells: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875].map((ph) => (
    { label: `slow walk ${ph}`, pose: 'slow', phase: ph, az: 90, el: 2, dist: 1.9 }
  )) },
  sleep: { cols: 2, cells: [
    { label: 'sleep · side', pose: 'sleep', az: 90, el: 10, dist: 1.5, ty: 0.15 },
    { label: 'sleep · front three-quarter', pose: 'sleep', az: 30, el: 25, dist: 1.4, ty: 0.15 },
    { label: 'sleep · top', pose: 'sleep', az: 0, el: 80, dist: 1.6, ty: 0.1 },
    { label: 'sleep · other side', pose: 'sleep', az: -100, el: 15, dist: 1.5, ty: 0.15 }
  ] },
  closeup: { cols: 2, cells: [
    { label: 'sit · shoulder', pose: 'sit', az: 90, el: 4, dist: 0.75, ty: 0.38, tz: 0.12 },
    { label: 'walk · shoulder', pose: 'walk', phase: 0.0, az: 90, el: 4, dist: 0.75, ty: 0.38, tz: 0.12 },
    { label: 'sit · shoulder (no outline)', pose: 'sit', az: 90, el: 4, dist: 0.75, ty: 0.38, tz: 0.12, noOutline: true },
    { label: 'walk · shoulder (no outline)', pose: 'walk', phase: 0.0, az: 90, el: 4, dist: 0.75, ty: 0.38, tz: 0.12, noOutline: true }
  ] },
  npcs: { cols: 3, cells: [
    { label: 'Luna', cat: 'luna', az: 38, el: 12, dist: 2.0 },
    { label: 'Mochi', cat: 'mochi', az: 38, el: 12, dist: 2.0 },
    { label: 'Kuro', cat: 'kuro', az: 38, el: 12, dist: 2.0 },
    { label: 'Luna · side', cat: 'luna', az: 90, el: 4, dist: 2.1 },
    { label: 'Mochi · slow walk', cat: 'mochi', pose: 'slow', phase: 0.2, az: 90, el: 4, dist: 2.1 },
    { label: 'Kuro · face', cat: 'kuro', az: 20, el: 6, dist: 0.7, ty: 0.65, tz: 0.33 }
  ] }
};

const params = new URLSearchParams(location.search);
const sheet = SHEETS[params.get('sheet')] || SHEETS.anatomy;

if (params.get('perf') === '1') {
  // Construction cost per build (first use sculpts; later ones hit the
  // cache) and the per-frame animation cost of four cats.
  const log = document.getElementById('log');
  const lines = [];
  const cats = [];
  for (const name of ['michi', 'luna', 'mochi', 'kuro', 'michi']) {
    const t0 = performance.now();
    const cat = new Cat({ ...PALETTES[name], build: name });
    lines.push(`${name}: ${(performance.now() - t0).toFixed(0)} ms` + (cat.anatomy.timings ? ` (sculpt ${cat.anatomy.buildMs.toFixed(0)})` : ''));
    cats.push(cat);
  }
  let t1 = performance.now();
  const frames = 600;
  for (let f = 0; f < frames; f++) {
    for (let i = 0; i < 4; i++) cats[i].update(1 / 60, i === 0 ? 4.5 : 1.15, true, false, false);
  }
  lines.push(`update: ${((performance.now() - t1) / frames).toFixed(3)} ms/frame for 4 cats`);
  const tris = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;
  const a = cats[0].anatomy;
  lines.push(`tris: body ${tris(a.body)} head ${tris(a.head)} tail ${tris(a.tail)} (×2 with outlines)`);
  console.log('PERF ' + lines.join(' | '));
  log.textContent = lines.join('\n');
}

const canvas = document.getElementById('preview');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.32;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Midday rim strength (main.js drives this from the time of day);
// `?golden=1` approximates the late-afternoon light instead
const golden = new URLSearchParams(location.search).get('golden') === '1';
catRimUniforms.uRimStrength.value = golden ? 0.84 : 0.22;
if (golden) catRimUniforms.uRimColor.value.set(0xff9a50);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9cc4dc);
// The game lights metals with the sky's PMREM; a neutral room stands in
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const sun = new THREE.DirectionalLight(golden ? 0xffb070 : 0xffd9a8, 2.4);
sun.position.set(-9, golden ? 4 : 14, 10);
if (golden) catRimUniforms.uRimDir.value.copy(sun.position).normalize();
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 60 });
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight(0x8fa5c9, 0x9a7a55, 0.85));
const fill = new THREE.DirectionalLight(0x5a4a78, 0.35);
fill.position.set(40, 30, 60);
scene.add(fill);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0x9a9a84, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const SPACING = 4;
const raw = params.get('raw') === '1';
const cells = sheet.cells.map((c, i) => {
  let cat;
  if (raw) {
    cat = { group: rawAnatomy(c.cat || 'michi') };
  } else {
    cat = new Cat({ ...PALETTES[c.cat || 'michi'], build: c.cat || 'michi' });
    pose(cat, c.pose || 'stand', c.phase || 0);
  }
  cat.group.position.x = (i - (sheet.cells.length - 1) / 2) * SPACING;
  scene.add(cat.group);
  if (c.noOutline) {
    cat.group.traverse((o) => { if (o.isMesh && o.material && o.material.side === THREE.BackSide) o.visible = false; });
  }
  if (params.get('debug') === '1' && cat.bones) {
    // Bone positions in cat space, for placing pose targets by numbers
    cat.group.updateMatrixWorld(true);
    const at = (o) => {
      const p = o.getWorldPosition(new THREE.Vector3()).sub(cat.group.position);
      return `${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}`;
    };
    console.log(`[${c.label}] head ${at(cat.head)} muzzle ${at(cat.nose)} chest ${at(cat.chest)} hips ${at(cat.hips)} ` +
      `fpawR ${at(cat.legs[0].paw)} fpawL ${at(cat.legs[1].paw)} hpawR ${at(cat.legs[2].paw)} hpawL ${at(cat.legs[3].paw)}`);
  }
  return { ...c, cat };
});
sun.target.position.set(0, 0, 0);

const cols = sheet.cols;
const rows = Math.ceil(cells.length / cols);
const cw = Math.floor(innerWidth / cols);
const ch = Math.floor(innerHeight / rows);
const camera = new THREE.PerspectiveCamera(32, cw / ch, 0.02, 100);

renderer.setScissorTest(true);
cells.forEach((c, i) => {
  const col = i % cols;
  const row = Math.floor(i / cols);
  const x = col * cw;
  const y = innerHeight - (row + 1) * ch;
  renderer.setViewport(x, y, cw, ch);
  renderer.setScissor(x, y, cw, ch);
  for (const o of cells) o.cat.group.visible = o === c;

  const target = new THREE.Vector3(c.cat.group.position.x, c.ty ?? 0.42, c.tz ?? 0.0);
  const az = deg(c.az), el = deg(c.el);
  camera.position.set(
    target.x + Math.sin(az) * Math.cos(el) * c.dist,
    target.y + Math.sin(el) * c.dist,
    target.z + Math.cos(az) * Math.cos(el) * c.dist
  );
  camera.lookAt(target);
  renderer.render(scene, camera);

  const label = document.createElement('div');
  label.className = 'cell-label';
  label.textContent = c.label;
  label.style.left = `${x + 10}px`;
  label.style.top = `${row * ch + 8}px`;
  document.body.appendChild(label);
});

document.title = 'ready';
