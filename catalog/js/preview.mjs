import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadCatalogAsset } from './asset-loader.mjs';
import { originalContextLink } from './links.mjs';

const $ = (s) => document.querySelector(s), query = new URLSearchParams(location.search);
const id = query.get('asset') || 'torii', variant = query.get('variant') || 'original', targetId = query.get('target') || null;
let renderer, controls, loaded, scene, camera, grid, extent, clock, playing = true;
const materialWire = new Map();
function fit(view = 'iso') {
  if (!extent) return;
  const center = extent.getCenter(new THREE.Vector3()), radius = Math.max(.12, extent.getBoundingSphere(new THREE.Sphere()).radius);
  const dir = view === 'front' ? new THREE.Vector3(0, .12, 1) : view === 'side' ? new THREE.Vector3(1, .12, 0) : view === 'top' ? new THREE.Vector3(.001, 1, .001) : new THREE.Vector3(1, .65, 1.2);
  camera.position.copy(center).addScaledVector(dir.normalize(), radius * 2.8); controls.target.copy(center); camera.near = Math.max(.001, radius / 1000); camera.far = Math.max(1000, radius * 100); camera.updateProjectionMatrix(); controls.minDistance = radius * .07; controls.maxDistance = radius * 30; controls.update();
}
function resize() { const rect = $('#viewer-canvas').getBoundingClientRect(); renderer.setSize(rect.width, rect.height, false); camera.aspect = rect.width / Math.max(1, rect.height); camera.updateProjectionMatrix(); }
function stats(group) {
  let meshes = 0, triangles = 0, vertices = 0, instances = 0; const materials = new Set();
  group.traverse((o) => { if (!o.geometry) return; const count = o.isInstancedMesh ? o.count : 1; vertices += (o.geometry.attributes.position?.count || 0) * count; if (o.isMesh) { meshes++; triangles += ((o.geometry.index?.count || o.geometry.attributes.position?.count || 0) / 3) * count; } if (o.isInstancedMesh) instances += count; [].concat(o.material || []).forEach((m) => materials.add(m)); });
  return { meshes, triangles: Math.round(triangles), vertices, materials: materials.size, instances };
}
async function init() {
  const res = await fetch('../labs/asset_inventory.json'); if (!res.ok) throw new Error('The asset inventory is unavailable.'); const inventory = await res.json(), asset = inventory.assets.find((a) => a.id === id);
  if (!asset) throw new Error('This asset ID is not in the inventory.');
  document.title = `${asset.label} · ${variant === 'lab' ? 'Study' : 'Original'} · Michi-Neko`;
  $('#viewer-name').textContent = asset.label; $('#viewer-category').textContent = asset.group.toUpperCase(); $('#viewer-version').textContent = variant === 'lab' ? 'LAB STUDY · NOT SHIPPED' : 'GAME SOURCE · ISOLATED';
  const back = new URL('./', location.href); back.hash = id; $('#back-to-library').href = back.href;
  const cad = new URL('../cadJS/', location.href); cad.searchParams.set('asset', id); cad.searchParams.set('variant', variant); if (targetId) cad.searchParams.set('target', targetId); $('#viewer-cad').href = cad.href;
  renderer = new THREE.WebGLRenderer({ canvas: $('#viewer-canvas'), antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2; renderer.shadowMap.enabled = true;
  scene = new THREE.Scene(); scene.background = new THREE.Color(0xe5e4d9);
  const hemi = new THREE.HemisphereLight(0xe9f4ff, 0x5c6547, 2); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffefd0, 2.8); sun.position.set(7, 12, 9); scene.add(sun);
  const fill = new THREE.DirectionalLight(0xb7cfdd, .6); fill.position.set(-8, 4, -6); scene.add(fill);
  camera = new THREE.PerspectiveCamera(38, 1, .01, 3000); controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = .08;
  loaded = await loadCatalogAsset(id, { variant, targetId, renderer }); scene.add(loaded.group);
  loaded.group.updateMatrixWorld(true); extent = new THREE.Box3().setFromObject(loaded.group);
  if (extent.isEmpty() || !Number.isFinite(extent.min.x)) throw new Error('The builder did not produce measurable geometry. Open its original scene instead.');
  const size = extent.getSize(new THREE.Vector3()), center = extent.getCenter(new THREE.Vector3()), width = Math.max(size.x, size.z, size.y, .5) * 2;
  grid = new THREE.GridHelper(width, 20, 0xaab39a, 0xc5c9b8); grid.position.set(center.x, extent.min.y - .006, center.z); grid.material.transparent = true; grid.material.opacity = .5; scene.add(grid);
  fit(); resize(); new ResizeObserver(resize).observe($('#viewer-canvas'));
  const counts = stats(loaded.group); $('#viewer-stats').textContent = `${counts.meshes} meshes · ${counts.triangles.toLocaleString()} triangles · ${counts.materials} materials${counts.instances ? ' · ' + counts.instances.toLocaleString() + ' instances' : ''}`;
  $('#viewer-caption').textContent = loaded.caption || `${loaded.source.file} · ${loaded.source.symbol}`;
  $('#viewer-status').hidden = true;
  $('#viewer-fit').onclick = () => fit(); document.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => fit(b.dataset.view));
  $('#viewer-spin').onchange = (e) => { controls.autoRotate = e.target.checked; controls.autoRotateSpeed = .8; };
  $('#viewer-motion').onchange = (e) => { playing = e.target.checked; };
  $('#viewer-grid').onchange = (e) => { grid.visible = e.target.checked; };
  $('#viewer-wire').onchange = (e) => loaded.group.traverse((o) => { [].concat(o.material || []).forEach((m) => { if (!materialWire.has(m)) materialWire.set(m, m.wireframe); m.wireframe = e.target.checked ? true : materialWire.get(m); m.needsUpdate = true; }); });
  $('#viewer-capture').onclick = () => { renderer.render(scene, camera); renderer.domElement.toBlob((blob) => { if (!blob) return; const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = `${id}-${variant}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }); };
  clock = new THREE.Clock(); let time = 0;
  renderer.setAnimationLoop(() => { const dt = Math.min(clock.getDelta(), .05); if (!document.hidden && playing) { time += dt; loaded.update?.(dt, time); } controls.update(); renderer.render(scene, camera); });
  window.__assetPreview = { ready: true, id, variant, targetId, loaded, scene, camera, renderer, stats: counts, fit };
  addEventListener('pagehide', () => { renderer.setAnimationLoop(null); controls.dispose(); loaded.dispose?.(); renderer.dispose(); }, { once: true });
}
init().catch(async (error) => {
  $('#viewer-status').hidden = false; $('#viewer-status').classList.add('error'); $('#viewer-status').replaceChildren();
  const title = document.createElement('h2'); title.textContent = 'An honest limit.'; const message = document.createElement('p'); message.textContent = error.message; $('#viewer-status').append(title, message);
  try { const data = await (await fetch('../labs/asset_inventory.json')).json(); const asset = data.assets.find((a) => a.id === id); if (asset) { const context = originalContextLink(asset); const link = document.createElement('a'); link.href = context.href; link.textContent = 'Open the original game scene ↗'; link.target = '_blank'; link.rel = 'noopener'; $('#viewer-status').append(link); } } catch {}
  $('#viewer-cad').hidden = true; window.__assetPreview = { ready: false, error: error.message, id, variant }; console.error(error);
});
