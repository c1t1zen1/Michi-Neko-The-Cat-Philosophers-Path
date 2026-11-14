import * as THREE from 'three';
import { loadCatModule, loadMichiModule } from '../../shared/game.js';

// Michi as parts: classic (left) and modular (right), same camera, same light.
const { Cat } = await loadCatModule();
const { MICHI_MODULAR } = await loadMichiModule();

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2a3a);
scene.add(new THREE.HemisphereLight(0xbcd0ff, 0x4a3a2a, 1.1));
const sun = new THREE.DirectionalLight(0xffe0b0, 2.2);
sun.position.set(2, 3, 2.5);
scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ color: 0x4d5a3c }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const classic = new Cat({ fur: 0xae8450, belly: 0xeedcb8, accent: 0x5e3d26 });
const modular = new Cat({ def: MICHI_MODULAR });
classic.group.position.x = -0.55;
modular.group.position.x = 0.55;
for (const c of [classic, modular]) { c.group.rotation.y = 0.5; scene.add(c.group); }
const camera = new THREE.PerspectiveCamera(32, 2, 0.05, 50);
camera.position.set(0, 0.55, 2.6);
camera.lookAt(0, 0.28, 0);

const $ = (id) => document.getElementById(id);
const out = $('out');
function size() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', size); size();

$('collar').onchange = (e) => modular.setAccessory('collar', e.target.value);
$('bell').onchange = (e) => modular.setAccessory('bell', e.target.value);
$('shine').oninput = (e) => modular.setEyeShine?.(+e.target.value);
$('shadow').onchange = (e) => { modular.blob.visible = e.target.checked; };
$('master').onclick = () => { modular.setMasterCat(); $('bell').value = 'suzu-master'; };
modular.setEyeShine?.(+$('shine').value);

function checks() {
  const r = [];
  const ok = (m, c) => r.push(`${c ? 'ok  ' : 'FAIL'} ${m}`);
  ok('modular Michi has the head eye-shine part', !!modular.slots.head && modular.slots.head.part.id === 'eye-shine');
  ok('classic Michi has no head part', !classic.slots.head);
  ok('shine is invisible by day', modular.slots.head.objects.every((d) => !d.visible) || modular.eyeShine > 0);
  modular.setAccessory('collar', 'kumihimo-indigo');
  ok('indigo collar: the bell is hung again on the new mount', !!modular.collarBell && modular.collarBell.parent === modular.bellMount && modular.slots.bell.part.id === 'suzu');
  const mount = modular.bellMount;
  modular.setAccessory('collar', { part: 'kumihimo-indigo', color: 0x7a2a2a });
  ok('same-part recolour repaints in place', modular.bellMount === mount);
  modular.setAccessory('collar', 'kumihimo');
  ok('back to kumihimo keeps the bell', !!modular.collarBell && modular.collarBell.parent === modular.bellMount);
  modular.setMasterCat();
  ok('setMasterCat gives the gold twin', !!modular.collarBellTwin && modular.slots.bell.part.id === 'suzu-master');
  modular.setAccessory('bell', 'suzu');
  ok('Master Cat sticks (suzu → suzu-master)', modular.slots.bell.part.id === 'suzu-master');
  modular.setAccessory('collar', 'kumihimo-indigo');
  ok('master bell survives a collar swap', !!modular.collarBellTwin && modular.slots.bell.part.id === 'suzu-master');
  modular.setAccessory('head', null);
  ok('head slot empties and frees the field', modular.setEyeShine === undefined);
  modular.setAccessory('head', 'eye-shine');
  modular.setEyeShine(1);
  ok('eye shine shows at hero tier', modular.slots.head.objects.every((d) => d.visible));
  modular.setTier('mid');
  ok('eye shine hides at mid tier', modular.slots.head.objects.every((d) => !d.visible));
  modular.setTier('hero');
  ok('contact shadow present on both', !!classic.blob && !!modular.blob);
  modular.setAccessory('collar', 'kumihimo');
  return r;
}
const results = checks();
out.textContent = results.join('\n');
window.__catChecks = results;
modular.update?.(0.016, 0, true);
renderer.render(scene, camera);
let t = 0;
renderer.setAnimationLoop(() => {
  t += 0.016;
  for (const c of [classic, modular]) c.update(0.016, 0, true, false, false, false, false, null);
  renderer.render(scene, camera);
});
window.__catReady = true;
