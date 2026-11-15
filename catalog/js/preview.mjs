import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadCatalogAsset } from './asset-loader.mjs';
import { controlsFor } from './param-controls.mjs';
import { originalContextLink } from './links.mjs';

const $ = (s) => document.querySelector(s), query = new URLSearchParams(location.search);
const id = query.get('asset') || 'torii', variant = query.get('variant') || 'original', targetId = query.get('target') || null;
const TIERS = ['hero', 'mid', 'far'], VARIANT_LABEL = { original: 'Game original', lab: 'Lab study', production: 'Production kit' };
let tier = TIERS.includes(query.get('tier')) ? query.get('tier') : 'mid', params = {}, items = [], rebuildToken = 0, controlsBuilt = false;
try { const raw = query.get('params'); if (raw) params = JSON.parse(raw); } catch { params = {}; }
let renderer, controls, loaded, scene, camera, grid, extent, clock, playing = true, root;
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
  document.title = `${asset.label} · ${VARIANT_LABEL[variant] || 'Three-way compare'} · Michi-Neko`;
  $('#viewer-name').textContent = asset.label; $('#viewer-category').textContent = asset.group.toUpperCase(); $('#viewer-version').textContent = variant === 'lab' ? 'LAB STUDY · NOT SHIPPED' : variant === 'production' ? 'PRODUCTION KIT · MODULAR' : variant === 'compare' ? 'COMPARE · ORIGINAL / STUDY / PRODUCTION' : 'GAME SOURCE · ISOLATED';
  const back = new URL('./', location.href); back.hash = id; $('#back-to-library').href = back.href;
  const cad = new URL('../cadJS/', location.href); cad.searchParams.set('asset', id); cad.searchParams.set('variant', variant); if (targetId) cad.searchParams.set('target', targetId); $('#viewer-cad').href = cad.href;
  renderer = new THREE.WebGLRenderer({ canvas: $('#viewer-canvas'), antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2; renderer.shadowMap.enabled = true;
  scene = new THREE.Scene(); scene.background = new THREE.Color(0xe5e4d9);
  const hemi = new THREE.HemisphereLight(0xe9f4ff, 0x5c6547, 2); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffefd0, 2.8); sun.position.set(7, 12, 9); scene.add(sun);
  const fill = new THREE.DirectionalLight(0xb7cfdd, .6); fill.position.set(-8, 4, -6); scene.add(fill);
  camera = new THREE.PerspectiveCamera(38, 1, .01, 3000); controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = .08;
  root = new THREE.Group(); scene.add(root);
  const wanted = variant === 'compare' ? ['original', 'lab', 'production'] : [variant];
  async function build(first = false) {
    const token = ++rebuildToken, notes = [], built = [];
    for (const v of wanted) {
      try { built.push({ v, loaded: await loadCatalogAsset(id, { variant: v, targetId: v === 'lab' ? targetId : null, renderer, tier, params }) }); }
      catch (error) { if (wanted.length === 1) throw error; notes.push(`${VARIANT_LABEL[v]}: ${error.message}`); }
    }
    if (token !== rebuildToken) { built.forEach((i) => i.loaded.dispose?.()); return; }
    items.forEach((i) => { root.remove(i.loaded.group); i.loaded.dispose?.(); }); items = built;
    let cursor = 0;
    for (const item of items) {
      root.add(item.loaded.group); item.loaded.group.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(item.loaded.group), size = box.getSize(new THREE.Vector3());
      if (box.isEmpty() || !Number.isFinite(box.min.x)) throw new Error('The builder did not produce measurable geometry. Open its original scene instead.');
      if (wanted.length > 1) item.loaded.group.position.x += cursor - box.min.x;
      cursor += size.x + Math.max(0.6, size.x * 0.25);
    }
    loaded = (items.find((i) => i.v === 'production') || items[0]).loaded;
    root.updateMatrixWorld(true); extent = new THREE.Box3().setFromObject(root);
    const size = extent.getSize(new THREE.Vector3()), center = extent.getCenter(new THREE.Vector3()), width = Math.max(size.x, size.z, size.y, .5) * 2;
    if (grid) { scene.remove(grid); grid.geometry.dispose(); }
    grid = new THREE.GridHelper(width, 20, 0xaab39a, 0xc5c9b8); grid.position.set(center.x, extent.min.y - .006, center.z); grid.material.transparent = true; grid.material.opacity = .5; scene.add(grid);
    if (first) { fit(); resize(); new ResizeObserver(resize).observe($('#viewer-canvas')); }
    const total = items.reduce((t, i) => { const c = stats(i.loaded.group); for (const k of ['meshes', 'triangles', 'vertices', 'instances']) t[k] += c[k]; t.materials += c.materials; return t; }, { meshes: 0, triangles: 0, vertices: 0, instances: 0, materials: 0 });
    $('#viewer-stats').textContent = `${total.meshes} meshes · ${total.triangles.toLocaleString()} triangles · ${total.materials} materials${total.instances ? ' · ' + total.instances.toLocaleString() + ' instances' : ''}`;
    $('#viewer-caption').textContent = variant === 'compare' ? `Left to right: ${items.map((i) => VARIANT_LABEL[i.v]).join(' · ')}.${notes.length ? ' Not shown: ' + notes.join(' ') : ''}` : loaded.caption || `${loaded.source.file} · ${loaded.source.symbol}`;
    window.__assetPreview = { ready: true, id, variant, targetId, tier, params, loaded, items, scene, camera, renderer, stats: total, fit, notes };
    return total;
  }
  await build(true);
  const prodItem = items.find((i) => i.v === 'production');
  if (prodItem?.loaded.def && !controlsBuilt) {
    controlsBuilt = true;
    const panel = document.createElement('aside'); panel.className = 'production-panel'; panel.setAttribute('aria-label', 'Production kit controls');
    document.querySelector('.viewer-main').append(panel);
    let timer;
    controlsFor(panel, { def: prodItem.loaded.def, tier, params, onTier(next) { tier = next; schedule(); }, onParams(next) { params = next; schedule(); } });
    const schedule = () => { clearTimeout(timer); timer = setTimeout(() => build().catch((e) => { $('#viewer-caption').textContent = e.message; }), 120); };
  }
  $('#viewer-status').hidden = true;
  $('#viewer-fit').onclick = () => fit(); document.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => fit(b.dataset.view));
  $('#viewer-spin').onchange = (e) => { controls.autoRotate = e.target.checked; controls.autoRotateSpeed = .8; };
  $('#viewer-motion').onchange = (e) => { playing = e.target.checked; };
  $('#viewer-grid').onchange = (e) => { grid.visible = e.target.checked; };
  $('#viewer-wire').onchange = (e) => root.traverse((o) => { [].concat(o.material || []).forEach((m) => { if (!materialWire.has(m)) materialWire.set(m, m.wireframe); m.wireframe = e.target.checked ? true : materialWire.get(m); m.needsUpdate = true; }); });
  $('#viewer-capture').onclick = () => { renderer.render(scene, camera); renderer.domElement.toBlob((blob) => { if (!blob) return; const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = `${id}-${variant}${variant === 'production' ? '-' + tier : ''}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }); };
  clock = new THREE.Clock(); let time = 0;
  renderer.setAnimationLoop(() => { const dt = Math.min(clock.getDelta(), .05); if (!document.hidden && playing) { time += dt; for (const i of items) i.loaded.update?.(dt, time); } controls.update(); renderer.render(scene, camera); });
  addEventListener('pagehide', () => { renderer.setAnimationLoop(null); controls.dispose(); items.forEach((i) => i.loaded.dispose?.()); renderer.dispose(); }, { once: true });
}
init().catch(async (error) => {
  $('#viewer-status').hidden = false; $('#viewer-status').classList.add('error'); $('#viewer-status').replaceChildren();
  const title = document.createElement('h2'); title.textContent = 'An honest limit.'; const message = document.createElement('p'); message.textContent = error.message; $('#viewer-status').append(title, message);
  try { const data = await (await fetch('../labs/asset_inventory.json')).json(); const asset = data.assets.find((a) => a.id === id); if (asset) { const context = originalContextLink(asset); const link = document.createElement('a'); link.href = context.href; link.textContent = 'Open the original game scene ↗'; link.target = '_blank'; link.rel = 'noopener'; $('#viewer-status').append(link); } } catch {}
  $('#viewer-cad').hidden = true; window.__assetPreview = { ready: false, error: error.message, id, variant }; console.error(error);
});
