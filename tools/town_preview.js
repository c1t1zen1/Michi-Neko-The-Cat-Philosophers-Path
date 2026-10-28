// Town review sheets: the machiya, torii, shrine, street lanterns and fences
// framed like the cat and tree sheets, to measure the quality gap between the
// newest assets and the town.
//
//   python3 -m http.server 8000
//   open http://localhost:8000/tools/town_preview.html?sheet=street
//
// Sheets: street (village houses, toro lanterns, fences), landmarks (torii,
// shrine, tea house, residence), props (close-ups of eaves, lanterns, fence
// posts, bells). &golden=1 drops the sun for a sunset look; &night=1 lights
// the lanterns. Built through the real Countryside builder with seeded
// randomness, so captures repeat.
import * as THREE from 'three';
import { Countryside } from '../src/countryside.js?v=20261024b';

const params = new URLSearchParams(location.search);
const sheetName = params.get('sheet') || 'street';
const golden = params.get('golden') === '1';
const night = params.get('night') === '1';

const canvas = document.getElementById('preview');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
const city = new Countryside(scene);

const sunDir = night ? new THREE.Vector3(0.3, -0.4, 0.2)
  : golden ? new THREE.Vector3(-0.8, 0.16, 0.5) : new THREE.Vector3(-0.5, 0.75, 0.4);
sunDir.normalize();
const hemi = new THREE.HemisphereLight(night ? 0x2a3a66 : 0xcfe3ff, 0x6a5a40, night ? 0.2 : golden ? 0.6 : 0.9);
const sun = new THREE.DirectionalLight(golden ? 0xffb070 : 0xfff0d0, night ? 0.05 : golden ? 2.6 : 2.2);
sun.position.copy(sunDir).multiplyScalar(60);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
scene.add(hemi, sun);
const skyCol = night ? 0x0b1226 : golden ? 0xe9b88a : 0x9cc4dc;
scene.background = new THREE.Color(skyCol);
scene.fog = new THREE.Fog(skyCol, 30, 140);
// Drive the real day/night lantern + window glow
city.update(0.016, null, { sunDir, weather: 'clear', weatherBlend: 1, dayTime: night ? 22 : golden ? 18 : 12, resolvePalette: () => ({
  warm: new THREE.Color(0xffb264), sun: new THREE.Color(0xffe6b8), horizon: new THREE.Color(0xffc98a), top: new THREE.Color(0x4a6a9e)
}) });

// target [x,y,z], az (deg, 0 = looking from +z), el (deg), dist
const SHEETS = {
  street: [
    { label: 'street · west row', t: [-6, 1.5, 12], az: 90, el: 12, d: 15 },
    { label: 'street · east row', t: [6, 1.5, 8], az: -90, el: 12, d: 15 },
    { label: 'street · down the lane', t: [0, 1.6, 10], az: 0, el: 8, d: 24 },
    { label: 'house · front', t: [-6, 1.6, 12], az: 90, el: 6, d: 7 }
  ],
  landmarks: [
    { label: 'torii', t: [0, 2.6, -22], az: 0, el: 8, d: 11 },
    { label: 'shrine', t: [0, 2.0, -32], az: 0, el: 10, d: 13 },
    { label: 'tea house', t: [-14, 2.2, -6], az: 35, el: 14, d: 14 },
    { label: 'craftsman residence', t: [13, 2.0, -14], az: -40, el: 14, d: 14 }
  ],
  props: [
    { label: 'toro lantern', t: [2.5, 0.9, 27], az: 20, el: 8, d: 3.4 },
    { label: 'eave + chochin', t: [-6, 2.4, 12], az: 70, el: 14, d: 4.6 },
    { label: 'bamboo fence', t: [-31, 0.8, 4], az: 20, el: 10, d: 5 },
    { label: 'torii pillar', t: [2.6, 1.5, -22], az: 35, el: 10, d: 4.2 }
  ]
};
const cells = SHEETS[sheetName] || SHEETS.street;
const cols = 2, rows = Math.ceil(cells.length / cols);
const cw = Math.floor(innerWidth / cols), ch = Math.floor(innerHeight / rows);

cells.forEach((c, i) => {
  const x = (i % cols) * cw, y = innerHeight - (Math.floor(i / cols) + 1) * ch;
  const cam = new THREE.PerspectiveCamera(48, cw / ch, 0.05, 300);
  const az = THREE.MathUtils.degToRad(c.az), el = THREE.MathUtils.degToRad(c.el);
  cam.position.set(
    c.t[0] + Math.sin(az) * Math.cos(el) * c.d,
    c.t[1] + Math.sin(el) * c.d,
    c.t[2] + Math.cos(az) * Math.cos(el) * c.d
  );
  cam.lookAt(c.t[0], c.t[1], c.t[2]);
  renderer.setViewport(x, y, cw, ch);
  renderer.setScissor(x, y, cw, ch);
  renderer.setScissorTest(true);
  renderer.render(scene, cam);
});
document.getElementById('log').textContent = `town · ${sheetName}${golden ? ' · golden' : ''}${night ? ' · night' : ''}\n` +
  cells.map((c) => c.label).join(' | ');
