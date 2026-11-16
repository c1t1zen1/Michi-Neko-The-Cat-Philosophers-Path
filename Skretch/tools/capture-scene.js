// Build the actual level pieces once on a straightened copy of the rail.
// All cameras see the same scene, so geometry and lighting are continuous.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildLevel } from '../../rooftops/js/level.js';
import { PIECES } from '../../rooftops/js/pieces/index.js';
import { makeMaterials } from '../../rooftops/js/pieces/paint.js';
import { paintDowntown } from '../../rooftops/js/downtown.js';

// Overscan lets capture.mjs compare and feather the matching overlaps.
const width = 1264, height = 750, span = 32, viewHeight = 20;
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('canvas'), antialias: true, preserveDrawingBuffer: true });
renderer.setSize(width, height); renderer.setPixelRatio(1);
// Keep transparent draw order stable as the orthographic camera moves.
renderer.sortObjects = false;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#dce8e1');
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
scene.add(new THREE.HemisphereLight(0xeef6ff, 0x9a8065, 2));
const sun = new THREE.DirectionalLight(0xffe5bc, 2.3); sun.position.set(20, 40, 25); scene.add(sun);
const level = buildLevel();
const M = makeMaterials(); paintDowntown(M);
// The piece builders already describe their positions in route metres (s,d).
// Supply that same contract on a straight line; no game source is changed.
const rail = {
  pointAt(s, out = {}) { out.x = s; out.z = 0; return out; },
  tangentAt(s, out = {}) { out.x = 1; out.z = 0; return out; },
  normalAt(s, out = {}) { out.x = 0; out.z = 1; return out; },
  place(s, d, out = {}) { out.x = s; out.z = d; return out; }
};
const root = new THREE.Group(); scene.add(root);
const dynamic = { boat: null, boats: [], people: [], float: null, shoki: [], treats: [] };
const ctx = { M, rail, dynamic, platforms: level.platforms, alleys: level.alleys,
  add: o => root.add(o), addGlass: o => root.add(o), addDyn: o => root.add(o), light: () => {} };
for (const pc of level.pieces) {
  const piece = PIECES[pc.type];
  piece.build(pc, ctx); if (piece.decorate) piece.decorate(pc, ctx);
}
// In the game the update loop positions boats. Freeze them on their platform
// midpoint for this still, in the same straightened frame as the rest.
for (const boat of dynamic.boats) {
  const platform = level.platforms[boat.plat];
  boat.group.position.set((platform.s0 + platform.s1) / 2, .005, boat.d);
}
scene.updateMatrixWorld(true);
const camera = new THREE.OrthographicCamera(-span * width / 2400, span * width / 2400, viewHeight / 2, -viewHeight / 2, .1, 200);
function render(frame) {
  const center = frame.s0 + span / 2;
  camera.position.set(center, viewHeight / 2 - 1, 60);
  camera.lookAt(center, viewHeight / 2 - 1, 0);
  camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  renderer.render(scene, camera);
  return { projection: 'orthographic-unfolded', span, viewHeight, groundY: -1, overscanPixels: 32 };
}
window.skretchCapture = { ready: true, render, level };
