import * as THREE from 'three';
import { Sky } from '../src/sky.js?v=20261021a';
import { Player } from '../src/player.js?v=20261021a';
import { Vegetation } from '../src/vegetation.js?v=20261021a';
import { SummitManager } from '../src/mountaintop.js?v=20261021a';

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
  ui: { hideAllGuidance() {}, showToast() {} },
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
player.mesh.position.set(summit.origin.x + 8.5, summit.origin.y + 0.06, summit.origin.z + 11.5);
player.mesh.rotation.y = 0;
camera.position.set(summit.origin.x, summit.origin.y + 3.6, summit.origin.z - 5.5);
camera.lookAt(summit.origin.x, summit.origin.y + 4.8, summit.origin.z + 92);

const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  sky.update(dt, player.mesh.position);
  summit.update(dt, false);
  renderer.render(scene, camera);
}
frame();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
