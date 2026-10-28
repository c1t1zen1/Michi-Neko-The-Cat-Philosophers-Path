import * as THREE from 'three';
import { Sky } from '../src/sky.js?v=20261024c';
import { Player } from '../src/player.js?v=20261024c';
import { SummitManager } from '../src/mountaintop.js?v=20261024c';

const canvas = document.getElementById('preview');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(49, innerWidth / innerHeight, 0.1, 700);
const sky = new Sky(scene);

const query = new URLSearchParams(location.search);
const parsedTime = Number(query.get('time'));
const parsedSpeed = Number(query.get('speed'));
const requestedWeather = query.get('weather');
const weatherTypes = new Set(['clear', 'cloudy', 'mist', 'rain', 'snow']);
const requestedView = query.get('view') || 'meditation';
const viewTypes = new Set([
  'meditation', 'arrival', 'approach-front', 'approach-side',
  'meadow-gate', 'edge-left', 'edge-right', 'edge-sheet'
]);
const previewTime = query.has('time') && Number.isFinite(parsedTime)
  ? THREE.MathUtils.clamp(parsedTime, 0, 24)
  : 10.35;
const previewWeather = weatherTypes.has(requestedWeather) ? requestedWeather : 'clear';
const cycleMultiplier = query.has('speed') && Number.isFinite(parsedSpeed)
  ? Math.max(0, parsedSpeed)
  : 1;
const previewView = viewTypes.has(requestedView) ? requestedView : 'meditation';

sky.dayTime = previewTime;
sky.cycleSpeed *= cycleMultiplier;
sky.weather = sky.previousWeather = sky.targetWeather = previewWeather;
sky.weatherBlend = 1;
if (query.has('weather')) sky.weatherTimer = sky.weatherDurations[previewWeather];
document.title = `Summit ${previewView} — ${previewWeather}, ${previewTime.toFixed(2)}h, ${cycleMultiplier}×`;
const player = new Player(scene, camera, null);

// The summit grows its own grass (src/grass.js); no valley needed.
const vegetation = null;
const game = {
  scene, camera, renderer, sky, player, vegetation,
  summitPreview: true,
  controls: { enabled: true },
  ui: {
    hideAllGuidance() {}, showToast() {},
    setSummitMode() {}, setScenicView() {}
  },
  audio: null, city: null, waypoints: null, progression: null,
  discover() {}, saveGame() {}, refreshCompassPois() {}
};
window.game = game;
const summit = new SummitManager(game);
game.summit = summit;
summit.active = true;
summit.group.visible = true;
sky.paletteOverride = summit.skyPalette;
sky._palStamp = -1;
player.mesh.position.set(
  summit.origin.x + summit.perchLocal.x,
  summit.origin.y + summit.perchLocal.y,
  summit.origin.z + summit.perchLocal.z
);
player.heading = 0;
player.yaw = 0;
player.yawPrev = 0;
player.mesh.rotation.y = 0;
player.cat.idleAction = 'sit';
player.cat.idleActionTimer = 1.4;
player.cat.idleActionDuration = Infinity;
// Start the review frame with the pose fully blended instead of relying on
// the screenshot runner to deliver enough real-time animation frames.
for (let i = 0; i < 75; i++) player.cat.update(1 / 60, 0, true, false, false, false, null);
summit.meditateT = 78;
const auditViews = {
  // Mirrors the live post-transition camera.
  arrival: { position: [0, 0.3, 21.2], lookAt: [0, 0.35, 7.75], fov: 55 },
  // Deliberately low views expose any air gap beneath the stair and landing.
  'approach-front': { position: [0, -0.25, 23], lookAt: [0, -0.8, 11.5], fov: 55 },
  'approach-side': { position: [7, -0.5, 16], lookAt: [0, -0.8, 12], fov: 55 },
  'meadow-gate': { position: [0, 1.45, 3.5], lookAt: [0, -0.65, 16.2], fov: 55 },
  'edge-left': { position: [0, 2.1, -2], lookAt: [-55, -18, 48], fov: 55 },
  'edge-right': { position: [0, 2.1, -2], lookAt: [55, -18, 48], fov: 55 }
};
const applyAuditView = (viewName, aspect = camera.aspect) => {
  const view = auditViews[viewName];
  const [px, py, pz] = view.position;
  const [lx, ly, lz] = view.lookAt;
  camera.position.set(summit.origin.x + px, summit.origin.y + py, summit.origin.z + pz);
  camera.lookAt(summit.origin.x + lx, summit.origin.y + ly, summit.origin.z + lz);
  camera.fov = view.fov;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
};
if (previewView === 'meditation') {
  camera.position.set(
    player.mesh.position.x - 1.65,
    player.mesh.position.y + 1.36,
    player.mesh.position.z - 2.95
  );
  camera.fov = 48;
  camera.updateProjectionMatrix();
  summit.setVistaView(true);
  summit.updateVistaCamera(1);
} else {
  summit._vistaSuppressed = true;
  summit.setVistaView(false);
  applyAuditView(previewView === 'edge-sheet' ? 'arrival' : previewView);
}
window.previewView = previewView;

const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  sky.update(dt, player.mesh.position);
  player.cat.update(dt, 0, true, false, false, false, null);
  summit.update(dt, false);
  summit.updateVistaCamera(dt);
  if (previewView === 'edge-sheet') {
    const sheetViews = [
      'arrival', 'approach-front', 'approach-side',
      'meadow-gate', 'edge-left', 'edge-right'
    ];
    const width = Math.floor(canvas.width / 3);
    const height = Math.floor(canvas.height / 2);
    renderer.setScissorTest(true);
    for (let i = 0; i < sheetViews.length; i++) {
      const x = (i % 3) * width;
      const y = (i < 3 ? 1 : 0) * height;
      renderer.setViewport(x, y, width, height);
      renderer.setScissor(x, y, width, height);
      applyAuditView(sheetViews[i], width / height);
      renderer.render(scene, camera);
    }
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, canvas.width, canvas.height);
    return;
  }
  renderer.render(scene, camera);
}
frame();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
