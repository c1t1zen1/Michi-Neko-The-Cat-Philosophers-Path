import * as THREE from 'three';
import { Sky } from '../src/sky.js?v=20261022d';
import { Player } from '../src/player.js?v=20261022d';
import { Vegetation } from '../src/vegetation.js?v=20261022d';
import { SummitManager } from '../src/mountaintop.js?v=20261022d';

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
sky.dayTime = 10.35;
sky.weather = sky.previousWeather = sky.targetWeather = 'clear';
sky.weatherBlend = 1;
const player = new Player(scene, camera, null);

// Summit only needs these two geometry/material factories; borrowing the
// real prototype avoids constructing the entire valley for this art preview.
const vegetation = {
  bladeGeometry: Vegetation.prototype.bladeGeometry,
  grassMaterial: Vegetation.prototype.grassMaterial
};
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
camera.position.set(
  player.mesh.position.x - 1.65,
  player.mesh.position.y + 1.36,
  player.mesh.position.z - 2.95
);
camera.fov = 48;
camera.updateProjectionMatrix();
summit.setVistaView(true);
summit.meditateT = 78;
summit.updateVistaCamera(1);

const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  sky.update(dt, player.mesh.position);
  player.cat.update(dt, 0, true, false, false, false, null);
  summit.update(dt, false);
  summit.updateVistaCamera(dt);
  renderer.render(scene, camera);
}
frame();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
