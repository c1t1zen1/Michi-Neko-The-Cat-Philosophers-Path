// Valley grass review: builds the real Countryside, HiddenPlaces and
// Vegetation (so the biome mask comes from the real colliders, paths and
// water), drops the real cat at a spot and walks it a few steps so the
// spring + pressed-trail physics show.
//   tools/grass_preview.html?spot=meadow&time=10.5          one live view
//   tools/grass_preview.html?spots=shrine,river,corral,glade@21.5
//                                                            2x2 still sheet
// spots: meadow, path, river, shrine, glade, corral, pool, wide;
// `@hour` sets the time of day per panel. &quality=low|medium|high, &walk=N
import * as THREE from 'three';
import { Sky } from '../src/sky.js?v=20261024b';
import { Player } from '../src/player.js?v=20261024b';
import { Countryside } from '../src/countryside.js?v=20261024b';
import { HiddenPlaces } from '../src/hidden_places.js?v=20261024b';
import { Vegetation } from '../src/vegetation.js?v=20261024b';

const SPOTS = {
  // cat position, heading (rad), camera offset from the cat
  meadow: { cat: [-12, 12], heading: 2.4, cam: [-2.6, 1.25, 3.2] },
  path: { cat: [2.4, 4], heading: 3.4, cam: [2.8, 1.4, 3.6] },
  river: { cat: [-26, 24.6], heading: 0.15, cam: [2.0, 1.6, -4.4] },
  shrine: { cat: [0.4, -22.6], heading: Math.PI, cam: [0.6, 2.3, 5.5] },
  glade: { cat: [-31, -6.8], heading: Math.PI, cam: [2.4, 1.7, 3.6] },
  corral: { cat: [-29.2, 10.6], heading: -2.2, cam: [2.8, 1.6, 2.6] },
  pool: { cat: [-16.6, -24.2], heading: -2.3, cam: [2.6, 1.9, 2.8] },
  wide: { cat: [-4, 10], heading: 0, cam: [6, 7.5, 16] }
};

const query = new URLSearchParams(location.search);
const time = query.has('time') ? Number(query.get('time')) : 10.5;
const quality = query.get('quality') || 'high';
const walkFrames = Number(query.get('walk') || 40);
const parseSpot = (s) => {
  const [name, hour] = s.split('@');
  return { name: SPOTS[name] ? name : 'meadow', hour: hour ? Number(hour) : time };
};
const sheet = query.has('spots') ? query.get('spots').split(',').slice(0, 4).map(parseSpot) : null;
const single = parseSpot(query.get('spot') || 'meadow');

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
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 700);
const sky = new Sky(scene);
if (sky.attachRenderer) sky.attachRenderer(renderer);
sky.cycleSpeed = 0;
const city = new Countryside(scene);
const hidden = new HiddenPlaces(scene, city);
const veg = new Vegetation(scene, city.colliders, {
  pathSamples: city.pathSamples,
  waterRects: city.waterRects,
  riverSamples: city.riverSamples,
  exclusionRects: city.vegetationExclusions
});
veg.setDensity(quality === 'low' ? 0.5 : quality === 'medium' ? 0.75 : 1);
const player = new Player(scene, camera, null);
veg.grassContext = { renderer, camera, player, npcs: [] };
const cat = player.cat;
const label = document.getElementById('label');
const dt = 1 / 30;
const _start = new THREE.Vector3(), _dir = new THREE.Vector3();

function setTime(hour) {
  sky.dayTime = hour;
  sky._palStamp = -1;
}

/** Pose the cat `t` (0..1) of the way along its 2.4 m walk into the spot. */
function step(s, t, walking) {
  const spot = SPOTS[s.name];
  _start.set(spot.cat[0], 0, spot.cat[1]);
  _dir.set(Math.sin(spot.heading), 0, Math.cos(spot.heading));
  player.mesh.rotation.y = spot.heading;
  player.mesh.position.copy(_start).addScaledVector(_dir, (t - 1) * 2.4);
  cat.update(dt, walking ? 1.1 : 0, true, false, false, false, null);
  player.mesh.updateMatrixWorld(true);
  const p = player.mesh.position;
  camera.position.set(p.x + spot.cam[0], p.y + spot.cam[1], p.z + spot.cam[2]);
  camera.lookAt(p.x, p.y + 0.3, p.z);
  sky.update(dt, p);
  veg.update(dt, p, sky);
  if (hidden.update) hidden.update(dt, null, sky);
}

if (sheet) {
  // Physics runs every frame (it only touches its own render targets); the
  // scene itself is drawn once per panel.
  label.textContent = sheet.map((s) => `${s.name} ${s.hour.toFixed(1)}h`).join(' · ') + ` · ${quality}`;
  const W = innerWidth, H = innerHeight, w = Math.floor(W / 2), h = Math.floor(H / 2);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setScissorTest(true);
  let panel = 0;
  const next = () => {
    if (panel >= sheet.length) { window.__ready = true; return; }
    const s = sheet[panel];
    setTime(s.hour);
    for (let i = 0; i <= walkFrames; i++) step(s, i / walkFrames, i < walkFrames);
    for (let i = 0; i < 4; i++) step(s, 1, false);
    const x = (panel % 2) * w, y = H - h - Math.floor(panel / 2) * h;
    renderer.setViewport(x, y, w, h);
    renderer.setScissor(x, y, w, h);
    renderer.render(scene, camera);
    panel++;
    setTimeout(next, 0);
  };
  next();
} else {
  label.textContent = `${single.name} · ${single.hour.toFixed(1)}h · ${quality}`;
  setTime(single.hour);
  let frameNo = 0;
  const frame = () => {
    const t = Math.min(frameNo, walkFrames) / walkFrames;
    step(single, t, frameNo < walkFrames);
    renderer.render(scene, camera);
    frameNo++;
    if (frameNo === walkFrames + 10) window.__ready = true;
    requestAnimationFrame(frame);
  };
  frame();
}
window.__grass = veg.grass;
