// Hidden-places review sheet (Moon Pool, Lantern Glade) for art review.
//
//   python3 -m http.server 8000
//   open http://localhost:8000/tools/hidden_preview.html?sheet=pool
//
// Sheets: pool, glade, both (default). Each shows the place by day and by
// night, from a three-quarter view and from the visitor's eye line. Built
// through the real Countryside + HiddenPlaces classes; the sky is a stub
// with a fixed sun so captures repeat exactly. Extras: &t=<seconds> freezes
// the animation clock, &weather=rain.
import * as THREE from 'three';
import { Countryside } from '../src/countryside.js?v=20261022f';
import { HiddenPlaces } from '../src/hidden_places.js?v=20261022f';

const params = new URLSearchParams(location.search);
const sheet = params.get('sheet') || 'both';
const clock = parseFloat(params.get('t') || '12');
const weather = params.get('weather') || 'clear';

const canvas = document.getElementById('preview');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
const city = new Countryside(scene);
const hidden = new HiddenPlaces(scene, city);

const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x6a5a40, 0.9);
const sun = new THREE.DirectionalLight(0xfff0d0, 2.2);
sun.position.set(-30, 40, 20);
scene.add(hemi, sun);

const POOL = { x: -20, z: -27 };
const GLADE = { x: -31, z: -10 };
const SPOTS = {
  pool: { c: POOL, near: [4.6, 3.0, 4.4], far: [0.6, 1.0, 6.2], look: [0, 0.2, 0] },
  glade: { c: GLADE, near: [9.5, 5.5, 3.2], far: [6.8, 1.3, 0.2], look: [-1, 2.0, 0] }
};

function cell(x, y, w, h, spot, view, night) {
  const s = SPOTS[spot];
  const camera = new THREE.Camera();
  const cam = new THREE.PerspectiveCamera(view === 'far' ? 62 : 52, w / h, 0.1, 400);
  cam.position.set(s.c.x + s[view][0], s[view][1], s.c.z + s[view][2]);
  cam.lookAt(s.c.x + s.look[0], s.look[1], s.c.z + s.look[2]);
  const sky = {
    sunDir: night ? new THREE.Vector3(0.2, -0.4, 0.3).normalize() : new THREE.Vector3(-0.5, 0.7, 0.4).normalize(),
    weather
  };
  hemi.intensity = night ? 0.18 : 0.9;
  hemi.color.set(night ? 0x2a3a66 : 0xcfe3ff);
  sun.intensity = night ? 0.06 : 2.2;
  scene.background = new THREE.Color(night ? 0x0b1226 : 0x9cc4dc);
  scene.fog = new THREE.Fog(night ? 0x0b1226 : 0xbcd2dc, 20, 120);
  // Step the place a little so motes / lanterns are mid-animation
  hidden.time = clock;
  for (let i = 0; i < 90; i++) hidden.update(1 / 30, null, sky);
  renderer.setViewport(x, y, w, h);
  renderer.setScissor(x, y, w, h);
  renderer.setScissorTest(true);
  renderer.render(scene, cam);
  void camera;
}

const W = innerWidth, H = innerHeight;
const spots = sheet === 'both' ? ['pool', 'glade'] : [sheet];
const rows = spots.length * 2;
const cols = 2;
const cw = Math.floor(W / cols), ch = Math.floor(H / rows);
let r = 0;
for (const spot of spots) {
  for (const night of [false, true]) {
    cell(0, H - (r + 1) * ch, cw, ch, spot, 'near', night);
    cell(cw, H - (r + 1) * ch, cw, ch, spot, 'far', night);
    r++;
  }
}
document.getElementById('log').textContent =
  `hidden places · ${sheet} · weather=${weather}\ncolliders ${city.colliders.length} · waterRects ${city.waterRects.length}`;
