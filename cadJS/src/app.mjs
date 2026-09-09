import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { fingerprintDescriptor, splitLabel } from './catalog.mjs';
import { AgentPanel } from './agent-panel.mjs';
import {
  ASSET_PACKAGE_FORMAT, changedObjectComponents, createAssetPackage, evaluateAssetCompatibility,
  hashValue, normalizeAssetId, validateAssetPackage
} from './asset-package.mjs';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const STORAGE_KEY = 'michi-neko-cadjs-project-v1';
const editorOwned = Symbol('cadJSOwned');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);
}

function download(name, data, type = 'application/json') {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
}

function objectLabel(object) {
  return object?.name || object?.userData?.cadLabel || object?.geometry?.type?.replace('Geometry', '') || object?.type || 'Object';
}

function objectIcon(object) {
  if (object?.isMesh || object?.isInstancedMesh) return '◆';
  if (object?.isLight) return '☼';
  if (object?.isCamera) return '◩';
  if (object?.isPoints) return '⁙';
  if (object?.isSprite) return '◇';
  return '▱';
}

function pathForObject(object) {
  const parts = [];
  let node = object;
  while (node) {
    const siblings = node.parent?.children || [];
    const index = siblings.indexOf(node);
    parts.unshift(`${objectLabel(node)}[${Math.max(0, index)}]`);
    node = node.parent;
  }
  return parts.join('/');
}

function findByPath(root, path) {
  const parts = String(path || '').split('/').filter(Boolean);
  let current = root;
  const start = parts[0]?.match(/\[(\d+)\]$/);
  if (start && Number(start[1]) === 0) parts.shift();
  for (const part of parts) {
    const match = part.match(/^(.*)\[(\d+)\]$/);
    if (!match) return null;
    const index = Number(match[2]);
    current = current?.children?.[index];
    if (!current) return null;
  }
  return current;
}

function cloneMaterial(material) {
  if (Array.isArray(material)) return material.map((item) => item.clone());
  return material?.clone ? material.clone() : material;
}

function snapshotObject(object) {
  if (!object) return null;
  const material = Array.isArray(object.material) ? object.material[0] : object.material;
  return {
    position: object.position?.toArray(), rotation: object.rotation ? [object.rotation.x, object.rotation.y, object.rotation.z, object.rotation.order] : null,
    scale: object.scale?.toArray(), visible: object.visible, name: object.name, renderOrder: object.renderOrder,
    castShadow: object.castShadow, receiveShadow: object.receiveShadow, frustumCulled: object.frustumCulled,
    material: material ? {
      color: material.color?.getHex(), emissive: material.emissive?.getHex(), roughness: material.roughness,
      metalness: material.metalness, opacity: material.opacity, transparent: material.transparent,
      wireframe: material.wireframe, flatShading: material.flatShading, emissiveIntensity: material.emissiveIntensity,
      side: material.side, depthWrite: material.depthWrite, depthTest: material.depthTest
    } : null
  };
}

function applySnapshot(object, data) {
  if (!object || !data) return;
  if (data.position && object.position) object.position.fromArray(data.position);
  if (data.rotation && object.rotation) object.rotation.set(data.rotation[0], data.rotation[1], data.rotation[2], data.rotation[3] || 'XYZ');
  if (data.scale && object.scale) object.scale.fromArray(data.scale);
  for (const key of ['visible', 'name', 'renderOrder', 'castShadow', 'receiveShadow', 'frustumCulled']) {
    if (data[key] !== undefined) object[key] = data[key];
  }
  const materials = Array.isArray(object.material) ? object.material : [object.material];
  for (const material of materials.filter(Boolean)) {
    const state = data.material;
    if (!state) continue;
    if (state.color !== undefined && material.color) material.color.setHex(state.color);
    if (state.emissive !== undefined && material.emissive) material.emissive.setHex(state.emissive);
    for (const key of ['roughness', 'metalness', 'opacity', 'transparent', 'wireframe', 'flatShading', 'emissiveIntensity', 'side', 'depthWrite', 'depthTest']) {
      if (state[key] !== undefined && key in material) material[key] = state[key];
    }
    material.needsUpdate = true;
  }
}

function semanticSegment(value, fallback = 'object') {
  return normalizeAssetId(value, fallback).replace(/\./g, '-');
}

function arrayType(name) {
  return {
    Float32Array, Float64Array, Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array,
    Int32Array, Uint32Array
  }[name] || Float32Array;
}

function attributeValues(attribute) {
  if (!attribute?.isInterleavedBufferAttribute) return Array.from(attribute?.array || []);
  const values = [];
  for (let index = 0; index < attribute.count; index++) {
    for (let component = 0; component < attribute.itemSize; component++) {
      values.push(attribute.data.array[index * attribute.data.stride + attribute.offset + component]);
    }
  }
  return values;
}

function serializeAttribute(attribute) {
  if (!attribute) return null;
  const source = attribute.isInterleavedBufferAttribute ? attribute.data.array : attribute.array;
  return { itemSize:attribute.itemSize, normalized:!!attribute.normalized, arrayType:source?.constructor?.name || 'Float32Array', values:attributeValues(attribute) };
}

function serializeGeometry(geometry) {
  if (!geometry) return null;
  const attributes = {};
  for (const [name, attribute] of Object.entries(geometry.attributes || {})) attributes[name] = serializeAttribute(attribute);
  const morphAttributes = {};
  for (const [name, list] of Object.entries(geometry.morphAttributes || {})) morphAttributes[name] = list.map(serializeAttribute);
  return {
    type:geometry.type, name:geometry.name || '', userData:geometry.userData || {}, index:serializeAttribute(geometry.index), attributes,
    morphAttributes, morphTargetsRelative:!!geometry.morphTargetsRelative, groups:(geometry.groups || []).map((group) => ({ ...group })),
    drawRange:{ start:geometry.drawRange?.start || 0, count:Number.isFinite(geometry.drawRange?.count) ? geometry.drawRange.count : null }
  };
}

function parseAttribute(data) {
  if (!data) return null;
  return new THREE.BufferAttribute(new (arrayType(data.arrayType))(data.values || []), Number(data.itemSize || 1), !!data.normalized);
}

function parseGeometry(data) {
  if (!data) return null;
  const geometry = new THREE.BufferGeometry(); geometry.type = data.type || 'BufferGeometry'; geometry.name = data.name || ''; geometry.userData = data.userData || {};
  if (data.index) geometry.setIndex(parseAttribute(data.index));
  for (const [name, attribute] of Object.entries(data.attributes || {})) geometry.setAttribute(name, parseAttribute(attribute));
  for (const [name, list] of Object.entries(data.morphAttributes || {})) geometry.morphAttributes[name] = list.map(parseAttribute);
  geometry.morphTargetsRelative = !!data.morphTargetsRelative;
  for (const group of data.groups || []) geometry.addGroup(group.start, group.count, group.materialIndex || 0);
  if (data.drawRange) geometry.setDrawRange(data.drawRange.start || 0, data.drawRange.count == null ? Infinity : data.drawRange.count);
  geometry.computeBoundingBox(); geometry.computeBoundingSphere(); return geometry;
}

function serializeTexture(texture) {
  const dataUrl = texture?.userData?.dataUrl;
  if (!texture || !dataUrl) return null;
  return {
    dataUrl, name:texture.name || texture.userData?.fileName || '', colorSpace:texture.colorSpace,
    repeat:texture.repeat?.toArray(), offset:texture.offset?.toArray(), center:texture.center?.toArray(), rotation:texture.rotation || 0,
    wrapS:texture.wrapS, wrapT:texture.wrapT, flipY:texture.flipY
  };
}

function serializeMaterial(material) {
  if (!material) return null;
  const state = { type:material.type, name:material.name || '' };
  for (const key of ['roughness','metalness','opacity','transparent','wireframe','flatShading','emissiveIntensity','side','depthWrite','depthTest','alphaTest']) if (key in material) state[key] = material[key];
  if (material.color) state.color = material.color.getHex();
  if (material.emissive) state.emissive = material.emissive.getHex();
  state.map = serializeTexture(material.map);
  return state;
}

function serializeAssetObject(object) {
  return {
    type:object.type,
    transform:{ position:object.position?.toArray(), rotation:object.rotation ? [object.rotation.x, object.rotation.y, object.rotation.z, object.rotation.order] : null, scale:object.scale?.toArray() },
    properties:{ visible:object.visible, name:object.name, renderOrder:object.renderOrder, castShadow:object.castShadow, receiveShadow:object.receiveShadow, frustumCulled:object.frustumCulled },
    geometry:serializeGeometry(object.geometry),
    materials:(Array.isArray(object.material) ? object.material : [object.material]).filter(Boolean).map(serializeMaterial)
  };
}

async function applyMaterialState(material, state, textureLoader) {
  if (!material || !state) return;
  if (state.color !== undefined && material.color) material.color.setHex(state.color);
  if (state.emissive !== undefined && material.emissive) material.emissive.setHex(state.emissive);
  for (const key of ['roughness','metalness','opacity','transparent','wireframe','flatShading','emissiveIntensity','side','depthWrite','depthTest','alphaTest']) if (state[key] !== undefined && key in material) material[key] = state[key];
  if (state.map?.dataUrl) {
    const texture = await textureLoader.loadAsync(state.map.dataUrl); texture.name = state.map.name || '';
    texture.userData = { ...texture.userData, dataUrl:state.map.dataUrl, fileName:state.map.name || '' };
    if (state.map.repeat) texture.repeat.fromArray(state.map.repeat); if (state.map.offset) texture.offset.fromArray(state.map.offset); if (state.map.center) texture.center.fromArray(state.map.center);
    texture.rotation = state.map.rotation || 0; texture.wrapS = state.map.wrapS; texture.wrapT = state.map.wrapT; texture.flipY = state.map.flipY; texture.colorSpace = state.map.colorSpace; texture.needsUpdate = true; material.map = texture;
  } else if (state.map === null) material.map = null;
  material.needsUpdate = true;
}

async function applyAssetObjectState(object, state, textureLoader) {
  if (!object || !state) return;
  const transform = state.transform || {};
  if (transform.position && object.position) object.position.fromArray(transform.position);
  if (transform.rotation && object.rotation) object.rotation.set(transform.rotation[0], transform.rotation[1], transform.rotation[2], transform.rotation[3] || 'XYZ');
  if (transform.scale && object.scale) object.scale.fromArray(transform.scale);
  for (const [key, value] of Object.entries(state.properties || {})) if (value !== undefined && key in object) object[key] = value;
  if (state.geometry && object.geometry) object.geometry = parseGeometry(state.geometry);
  const materials = Array.isArray(object.material) ? object.material : [object.material];
  for (let index = 0; index < Math.min(materials.length, state.materials?.length || 0); index++) await applyMaterialState(materials[index], state.materials[index], textureLoader);
}

class History {
  constructor(onChange) { this.undoStack = []; this.redoStack = []; this.onChange = onChange; }
  push(label, undo, redo) { this.undoStack.push({ label, undo, redo }); this.redoStack.length = 0; this.onChange?.(); }
  undo() { const item = this.undoStack.pop(); if (!item) return; item.undo(); this.redoStack.push(item); this.onChange?.(); }
  redo() { const item = this.redoStack.pop(); if (!item) return; item.redo(); this.undoStack.push(item); this.onChange?.(); }
}

class CadApp {
  constructor() {
    this.canvas = $('#editor-canvas');
    this.frame = $('#game-frame');
    this.editorView = $('#editor-view');
    this.gameView = $('#game-view');
    this.catalog = null;
    this.selected = null;
    this.sourceMode = 'editor';
    this.viewMode = 'editor';
    this.expanded = new Set();
    this.isolated = null;
    this.runtimeOverrides = new Map();
    this.assetBaselines = new Map();
    this.lastAssetPackage = null;
    this.originalGeometries = new WeakMap();
    this.textureLoader = new THREE.TextureLoader();
    this.shapeSettings = { amount: .65, axis: 'y', frequency: 3, seed: 1 };
    this.history = new History(() => this.updateStatus());
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.frames = 0; this.fpsTime = performance.now();
    this.setupThree();
    this.setupUi();
    this.addStarterScene();
    this.loadCatalog();
    this.animate();
  }

  setupThree() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111820);
    this.scene.fog = new THREE.Fog(0x111820, 45, 150);
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.01, 1000);
    this.camera.position.set(5, 3.5, 7);
    this.root = new THREE.Group(); this.root.name = 'CAD WORKSPACE'; this.root[editorOwned] = true; this.scene.add(this.root);
    this.grid = new THREE.GridHelper(200, 200, 0x315f82, 0x203847);
    this.grid.material.transparent = true; this.grid.material.opacity = 0.48; this.scene.add(this.grid);
    this.axes = new THREE.AxesHelper(3); this.scene.add(this.axes);
    const hemi = new THREE.HemisphereLight(0x9fc9ee, 0x20252a, 1.55); hemi.name = 'Editor Hemisphere'; this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xdcecff, 2.3); key.name = 'Editor Key'; key.position.set(5, 9, 6); key.castShadow = true; this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x4f7ead, 0.65); fill.position.set(-6, 2, -5); this.scene.add(fill);
    this.orbit = new OrbitControls(this.camera, this.canvas); this.orbit.enableDamping = true; this.orbit.dampingFactor = 0.08;
    this.transform = new TransformControls(this.camera, this.canvas); this.transform.setSize(0.78); this.scene.add(this.transform);
    this.transform.addEventListener('dragging-changed', (event) => { this.orbit.enabled = !event.value; });
    this.transform.addEventListener('mouseDown', () => { if (this.selected) this.transformBefore = snapshotObject(this.selected); });
    this.transform.addEventListener('mouseUp', () => {
      if (!this.selected || !this.transformBefore) return;
      const object = this.selected; const before = this.transformBefore; const after = snapshotObject(object);
      this.history.push('Transform', () => { applySnapshot(object, before); this.refreshInspector(); }, () => { applySnapshot(object, after); this.refreshInspector(); });
      this.transformBefore = null; this.recordRuntimeOverride(object); this.refreshInspector();
    });
    this.canvas.addEventListener('pointerdown', (event) => this.pickEditor(event));
    window.addEventListener('resize', () => this.resize());
    new ResizeObserver(() => this.resize()).observe(this.editorView);
    this.resize();
  }

  addStarterScene() {
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2, 0.16, 48), new THREE.MeshStandardMaterial({ color: 0x202b33, roughness: 0.78, metalness: 0.25 }));
    platform.name = 'Isolation Platform'; platform.position.y = -0.1; platform.receiveShadow = true; platform.userData.helper = true; this.root.add(platform);
    this.loadProceduralCat();
  }

  async loadProceduralCat() {
    try {
      const { Cat } = await import('../../src/cat.js');
      const cat = new Cat({ fur: 0xc99c63, belly: 0xf3e7d0, accent: 0x6b4429, eyeColor: 0xebb02a, ribbonColor: 0x315d80 });
      cat.group.name = 'Michi-Neko Character'; cat.group.userData.cadLabel = 'Michi-Neko Character'; cat.group.userData.sourceModule = 'src/cat.js';
      this.labelCatParts(cat); this.root.add(cat.group); this.catAdapter = cat;
      this.registerAsset(cat.group, { assetId:'character.michi-neko', assetType:'procedural-transform-rig', sourceModule:'src/cat.js', sourceSymbol:'Cat' });
      this.focusObject(cat.group); this.rebuildTree();
      this.status('PROCEDURAL CAT LOADED');
    } catch (error) { this.status(`CAT ADAPTER: ${error.message}`, true); }
  }

  labelCatParts(cat) {
    const named = { body: cat.body, chest: cat.chest, hips: cat.hips, head: cat.head, neck: cat.neck, muzzle: cat.muzzle, tailRoot: cat.tailRoot };
    for (const [name, object] of Object.entries(named)) if (object) { object.name ||= splitLabel(name); object.userData.characterPart = name; }
    for (const key of ['eyes', 'pupils', 'ears', 'legs', 'tailSegs']) (cat[key] || []).forEach((object, index) => {
      const target = object.root || object; target.name ||= `${splitLabel(key)} ${index + 1}`; target.userData.characterPart = `${key}.${index}`;
    });
  }

  assignSemanticIds(root, assetId) {
    const used = new Set();
    const explicit = (object) => {
      const part = object.userData?.characterPart;
      if (!part) return null;
      const mapped = String(part)
        .replace(/^tailRoot$/, 'tail.root').replace(/^tailSegs\.(\d+)$/, 'tail.$1')
        .replace(/^ears\.0$/, 'ear.left').replace(/^ears\.1$/, 'ear.right')
        .replace(/^eyes\.0$/, 'eye.left').replace(/^eyes\.1$/, 'eye.right')
        .replace(/^pupils\.0$/, 'pupil.left').replace(/^pupils\.1$/, 'pupil.right')
        .replace(/^legs\.0$/, 'leg.front.left').replace(/^legs\.1$/, 'leg.front.right')
        .replace(/^legs\.2$/, 'leg.rear.left').replace(/^legs\.3$/, 'leg.rear.right');
      return `${assetId}.${mapped}`;
    };
    const walk = (object, parentId) => {
      const existing = object.userData?.cadSemanticId;
      let semanticId = object === root ? assetId : explicit(object) || (existing?.startsWith(`${assetId}.`) ? existing : null);
      if (!semanticId) {
        const base = `${parentId}.${semanticSegment(object.name || object.geometry?.type || object.type)}`;
        semanticId = base; let suffix = 2; while (used.has(semanticId)) semanticId = `${base}-${suffix++}`;
      }
      if (used.has(semanticId)) {
        const base = semanticId; let suffix = 2; while (used.has(semanticId)) semanticId = `${base}-${suffix++}`;
      }
      used.add(semanticId); object.userData.cadSemanticId = semanticId;
      for (const child of object.children || []) walk(child, semanticId);
    };
    walk(root, assetId); return used.size;
  }

  assetObjects(root) {
    const objects = {};
    root?.traverse?.((object) => { const id = object.userData?.cadSemanticId; if (id) objects[id] = object; });
    return objects;
  }

  assetStates(root) {
    const states = {};
    for (const [id, object] of Object.entries(this.assetObjects(root))) states[id] = serializeAssetObject(object);
    return states;
  }

  assetHierarchy(root) {
    return Object.entries(this.assetObjects(root)).map(([id, object]) => ({ id, type:object.type, parent:object.parent?.userData?.cadSemanticId || null })).sort((a, b) => a.id.localeCompare(b.id));
  }

  registerAsset(root, options = {}) {
    if (!root) throw new Error('Select an asset before registering it');
    const assetId = normalizeAssetId(options.assetId || root.userData?.cadAssetId || objectLabel(root));
    root.userData.cadAssetId = assetId; root.userData.cadAssetType = options.assetType || root.userData.cadAssetType || 'three-object';
    root.userData.cadSourceModule = options.sourceModule ?? root.userData.cadSourceModule ?? root.userData.sourceModule ?? '';
    root.userData.cadSourceSymbol = options.sourceSymbol ?? root.userData.cadSourceSymbol ?? '';
    this.assignSemanticIds(root, assetId);
    const states = this.assetStates(root); const hierarchy = this.assetHierarchy(root);
    const baselineFingerprint = hashValue({ assetId, hierarchy, states });
    root.userData.cadBaselineFingerprint = baselineFingerprint;
    this.assetBaselines.set(assetId, { assetId, hierarchy, states, baselineFingerprint });
    return root;
  }

  assetRootFor(object = this.selected) {
    let node = object;
    while (node && node !== this.root) { if (node.userData?.cadAssetId) return node; node = node.parent; }
    if (object && this.isEditorObject(object)) {
      node = object; while (node.parent && node.parent !== this.root) node = node.parent;
      return node !== this.root ? node : null;
    }
    return null;
  }

  ensureAssetRoot(object = this.selected) {
    let root = this.assetRootFor(object); if (!root) throw new Error('Select an editor asset first');
    if (!root.userData?.cadAssetId) root = this.registerAsset(root);
    if (!this.assetBaselines.has(root.userData.cadAssetId)) this.registerAsset(root, { assetId:root.userData.cadAssetId, assetType:root.userData.cadAssetType, sourceModule:root.userData.cadSourceModule, sourceSymbol:root.userData.cadSourceSymbol });
    return root;
  }

  packageChanges(root) {
    const assetId = root.userData.cadAssetId; this.assignSemanticIds(root, assetId);
    const baseline = this.assetBaselines.get(assetId); const current = this.assetStates(root); const changes = {};
    const baselineIds = Object.keys(baseline?.states || {}).sort(); const currentIds = Object.keys(current).sort();
    if (hashValue(baselineIds) !== hashValue(currentIds)) throw new Error('Structural asset changes are not package-safe yet; restore added or removed parts before export');
    for (const [id, state] of Object.entries(current)) { const change = changedObjectComponents(baseline?.states?.[id], state); if (change) changes[id] = change; }
    return changes;
  }

  findAssetRoot(assetId) {
    let found = null;
    this.root.traverse((object) => { if (!found && object.userData?.cadAssetId === assetId) found = object; });
    return found;
  }

  assetPackageSection(object) {
    const root = this.assetRootFor(object); if (!root) return '';
    const assetId = root.userData.cadAssetId;
    if (!assetId) return this.section('ASSET PACKAGE', `
      <div class="property-row"><span>Status</span><input value="Unregistered CAD asset" disabled></div>
      <button class="wide-button" data-inspector-action="register-asset">REGISTER + CAPTURE BASELINE</button>
    `);
    const baseline = this.assetBaselines.get(assetId);
    let changed = 0; try { changed = Object.keys(this.packageChanges(root)).length; } catch { changed = -1; }
    return this.section('ASSET PACKAGE', `
      <div class="property-row"><span>Asset ID</span><input value="${escapeHtml(assetId)}" disabled></div>
      <div class="property-row"><span>Baseline</span><input value="${escapeHtml(baseline?.baselineFingerprint || 'Not captured')}" disabled></div>
      <div class="property-row"><span>Changes</span><input value="${changed < 0 ? 'Structural change detected' : `${changed} semantic objects`}" disabled></div>
      <div class="button-grid"><button data-inspector-action="export-asset-package">EXPORT PACKAGE</button><button data-inspector-action="rebase-asset">CAPTURE NEW BASELINE</button></div>
    `);
  }

  setupUi() {
    this.agentPanel = new AgentPanel({
      getContext: (scope) => this.getAgentContext(scope),
      executePlan: (plan, references) => this.executeAgentPlan(plan, references),
      undo: () => this.history.undo()
    });
    $('#refresh-catalog').addEventListener('click', () => this.loadCatalog(true));
    $('#mode-toggle').addEventListener('click', () => this.toggleView());
    $('#scan-runtime').addEventListener('click', () => this.scanRuntime());
    $('#runtime-source').addEventListener('click', () => this.toggleTreeSource());
    $('#tree-filter').addEventListener('input', () => this.rebuildTree());
    $('#asset-filter').addEventListener('input', () => this.renderCatalog());
    $('#catalog-select').addEventListener('change', (event) => this.openCatalogEntry(event.target.value));
    $$('.tool[data-tool]').forEach((button) => button.addEventListener('click', () => this.setTool(button.dataset.tool)));
    $$('[data-action]').forEach((button) => button.addEventListener('click', () => this.action(button.dataset.action)));
    $$('[data-add]').forEach((button) => button.addEventListener('click', () => this.addObject(button.dataset.add)));
    $$('[data-view]').forEach((button) => button.addEventListener('click', () => this.setCameraView(button.dataset.view)));
    $('#wire-toggle').addEventListener('click', () => this.toggleWireframe());
    $('#grid-toggle').addEventListener('click', () => { this.grid.visible = !this.grid.visible; $('#grid-toggle').classList.toggle('active', this.grid.visible); });
    $('#snap-toggle').addEventListener('click', () => this.toggleSnap());
    $$('.panel-tabs button[data-panel]').forEach((button) => button.addEventListener('click', () => this.setPanel(button.dataset.panel)));
    $$('#menu-bar button').forEach((button) => button.addEventListener('click', (event) => this.showMenu(button.dataset.menu, event.currentTarget)));
    document.addEventListener('pointerdown', (event) => { if (!event.target.closest('#menu-bar, #menu-popover')) $('#menu-popover').classList.add('hidden'); });
    document.addEventListener('keydown', (event) => this.onKey(event));
    $('#file-input').addEventListener('change', (event) => this.openFile(event.target.files[0]));
    $('#texture-input').addEventListener('change', (event) => { const file = event.target.files[0]; const descendants = event.target.dataset.descendants === 'true'; if (file) this.applyTextureFile(file, descendants); event.target.value = ''; delete event.target.dataset.descendants; });
    this.frame.addEventListener('load', () => { $('#bridge-state').textContent = 'Game loaded — runtime available'; this.installRuntimePicking(); setTimeout(() => this.scanRuntime(), 1200); });
  }

  async loadCatalog(refresh = false) {
    this.status('SCANNING SOURCE + ASSETS');
    try {
      const response = await fetch(refresh ? '/api/catalog/refresh' : '/api/catalog', { cache: 'no-store' });
      if (!response.ok) throw new Error('Start cadJS with npm start to enable scanning');
      this.catalog = await response.json(); this.populateCatalogSelect(); this.renderCatalog();
      this.status(`CATALOG: ${this.catalog.stats.entries} ENTRIES / ${this.catalog.stats.sources} THREE.JS SOURCES`);
    } catch (error) {
      this.catalog = { entries: [], stats: { entries: 0, sources: 0 } };
      this.status(error.message, true); this.populateCatalogSelect();
    }
  }

  populateCatalogSelect() {
    const select = $('#catalog-select');
    select.innerHTML = '<option value="">DISCOVERED GAME ELEMENTS</option>';
    const groups = new Map();
    for (const entry of this.catalog?.entries || []) {
      if (!groups.has(entry.category)) groups.set(entry.category, []);
      groups.get(entry.category).push(entry);
    }
    for (const [category, entries] of groups) {
      const group = document.createElement('optgroup'); group.label = category;
      for (const entry of entries) { const option = document.createElement('option'); option.value = entry.id; option.textContent = entry.label; group.append(option); }
      select.append(group);
    }
  }

  renderCatalog() {
    const host = $('#asset-list'); const filter = $('#asset-filter').value.trim().toLowerCase(); host.innerHTML = '';
    for (const entry of this.catalog?.entries || []) {
      if (filter && !`${entry.label} ${entry.file} ${entry.category}`.toLowerCase().includes(filter)) continue;
      const row = document.createElement('div'); row.className = 'asset-row'; row.dataset.id = entry.id;
      row.innerHTML = `<span class="asset-kind">${entry.kind === 'builder' ? 'ƒ' : entry.kind === 'class' ? 'C' : entry.kind === 'image' ? '▧' : '◆'}</span><b>${escapeHtml(entry.label)}</b><small>${escapeHtml(entry.category)} · ${escapeHtml(entry.file)}</small>`;
      row.addEventListener('dblclick', () => this.openCatalogEntry(entry.id)); host.append(row);
    }
  }

  openCatalogEntry(id) {
    const entry = this.catalog?.entries?.find((item) => item.id === id); if (!entry) return;
    if (entry.symbol === 'Cat') return this.select(this.catAdapter?.group || null);
    if (entry.kind === 'model') return this.loadModelUrl(`../${entry.file}`);
    if (entry.kind === 'image') return window.open(`../${entry.file}`, '_blank', 'noopener');
    this.status(`${entry.label.toUpperCase()} DISCOVERED IN ${entry.file}`);
    this.setPanel('assets');
  }

  get runtimeGame() { try { return this.frame.contentWindow?.game || null; } catch { return null; } }
  get activeRoot() { return this.sourceMode === 'runtime' ? this.runtimeGame?.scene : this.root; }

  scanRuntime() {
    const game = this.runtimeGame;
    if (!game?.scene) { this.status('LIVE GAME SCENE IS NOT READY', true); return; }
    this.labelRuntimeSystems(game); this.sourceMode = 'runtime'; $('#runtime-source').textContent = 'RUNTIME'; this.rebuildTree();
    const count = this.countObjects(game.scene); $('#bridge-state').textContent = `${count} runtime objects found`;
    this.status(`RUNTIME SCAN COMPLETE: ${count} OBJECTS`);
  }

  labelRuntimeSystems(game) {
    game.scene.name ||= 'Michi-Neko Live Scene';
    const systems = {
      'Player Character': game.player?.mesh, 'Luna': game.luna?.mesh, 'Mochi': game.mochi?.mesh, 'Kuro': game.kuro?.mesh,
      'Interior': game.interior?.group, 'Sky Dome': game.sky?.dome
    };
    for (const [name, object] of Object.entries(systems)) if (object) { object.name ||= name; object.userData.cadSystem = name; }
    for (const npc of game.npcs || []) if (npc?.mesh) npc.mesh.name ||= npc.name || 'NPC Cat';
  }

  installRuntimePicking() {
    try {
      const canvas = this.frame.contentDocument?.getElementById('canvas');
      if (!canvas || canvas.dataset.cadPicking) return;
      canvas.dataset.cadPicking = 'true';
      canvas.addEventListener('dblclick', (event) => {
        const game = this.runtimeGame; if (!game?.scene || !game.camera) return;
        const rect = canvas.getBoundingClientRect();
        this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
        this.raycaster.setFromCamera(this.pointer, game.camera);
        const hit = this.raycaster.intersectObjects(game.scene.children, true).find((item) => item.object.visible && !item.object.isSprite);
        if (hit) { this.sourceMode = 'runtime'; this.select(hit.object); this.rebuildTree(); }
      }, true);
    } catch (error) { this.status(`RUNTIME PICKING: ${error.message}`, true); }
  }

  toggleTreeSource() {
    if (this.sourceMode === 'editor') {
      if (!this.runtimeGame?.scene) return this.scanRuntime();
      this.sourceMode = 'runtime';
    } else this.sourceMode = 'editor';
    $('#runtime-source').textContent = this.sourceMode.toUpperCase(); this.select(null); this.rebuildTree();
  }

  rebuildTree() {
    const host = $('#scene-tree'); host.innerHTML = ''; const root = this.activeRoot;
    if (!root) { host.innerHTML = '<div class="empty-state"><span>Runtime scene is not ready.</span></div>'; return; }
    const filter = $('#tree-filter').value.trim().toLowerCase();
    const append = (object, depth) => {
      const children = (object.children || []).filter((child) => !child.userData?.cadInternal);
      const matches = !filter || objectLabel(object).toLowerCase().includes(filter) || children.some((child) => objectLabel(child).toLowerCase().includes(filter));
      if (!matches && filter) return;
      const row = document.createElement('div'); row.className = `tree-row${object === this.selected ? ' selected' : ''}`; row.style.paddingLeft = `${5 + depth * 11}px`;
      const key = object.uuid || pathForObject(object); const open = this.expanded.has(key) || depth < 1 || !!filter;
      row.innerHTML = `<span class="twisty">${children.length ? (open ? '▾' : '▸') : '·'}</span><span class="type">${objectIcon(object)}</span><span class="label">${escapeHtml(objectLabel(object))}</span><button class="vis">${object.visible ? '◉' : '○'}</button>`;
      row.addEventListener('click', (event) => { if (event.target.closest('.vis')) return; this.select(object); });
      $('.twisty', row).addEventListener('click', (event) => { event.stopPropagation(); open ? this.expanded.delete(key) : this.expanded.add(key); this.rebuildTree(); });
      $('.vis', row).addEventListener('click', (event) => { event.stopPropagation(); this.changeProperty(object, 'Visibility', () => { object.visible = !object.visible; }, () => { object.visible = !object.visible; }); this.rebuildTree(); });
      host.append(row); if (open) children.forEach((child) => append(child, depth + 1));
    };
    append(root, 0); $('#object-stats').textContent = `${this.countObjects(root)} OBJECTS`;
  }

  countObjects(root) { let count = 0; root?.traverse?.(() => count++); return count; }

  pickEditor(event) {
    if (this.transform.dragging || event.button !== 0) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.root.children, true).find((item) => !item.object.userData?.helper && item.object.visible);
    if (hit) { this.sourceMode = 'editor'; $('#runtime-source').textContent = 'EDITOR'; this.select(hit.object); }
  }

  select(object) {
    this.selected = object || null;
    const editorObject = object && this.isEditorObject(object);
    if (editorObject && !object.isScene && !object.isLight && !object.isCamera) this.transform.attach(object); else this.transform.detach();
    $('#selection-box').textContent = object ? `${objectLabel(object).toUpperCase()} / ${object.type}` : 'NO SELECTION';
    this.rebuildTree(); this.refreshInspector();
  }

  isEditorObject(object) { let node = object; while (node) { if (node === this.root) return true; node = node.parent; } return false; }

  refreshInspector() {
    const host = $('#inspector'), object = this.selected;
    if (!object) { host.innerHTML = '<div class="empty-state"><b>SELECT AN OBJECT</b><span>Click a mesh, hierarchy row, or double-click the live game canvas.</span></div>'; return; }
    const material = Array.isArray(object.material) ? object.material[0] : object.material;
    const box = new THREE.Box3(); let size = new THREE.Vector3();
    try { box.setFromObject(object); if (!box.isEmpty()) box.getSize(size); } catch {}
    host.innerHTML = `
      <div class="object-title"><b>${escapeHtml(objectLabel(object))}</b><small>${escapeHtml(object.type)} · ${escapeHtml((object.uuid || '').slice(0, 18))}</small></div>
      ${this.section('OBJECT', `
        ${this.textRow('Name', 'obj-name', object.name || '')}${this.checkRow('Visible', 'obj-visible', object.visible)}
        ${this.checkRow('Cast shadow', 'obj-cast', !!object.castShadow)}${this.checkRow('Receive shadow', 'obj-receive', !!object.receiveShadow)}
        ${this.checkRow('Frustum cull', 'obj-frustum', object.frustumCulled !== false)}${this.numberRow('Render order', 'obj-order', object.renderOrder || 0, 1)}
        <div class="property-row"><span>Source</span><input value="${escapeHtml(this.sourceMode)} · ${escapeHtml(object.userData?.sourceModule || object.userData?.cadSystem || 'scene graph')}" disabled></div>
      `)}
      ${this.section('TRANSFORM', `
        ${this.vectorRow('Position', 'pos', object.position, 1)}${this.vectorRow('Rotation °', 'rot', { x: object.rotation?.x * DEG || 0, y: object.rotation?.y * DEG || 0, z: object.rotation?.z * DEG || 0 }, 1)}
        ${this.vectorRow('Scale', 'scale', object.scale || { x: 1, y: 1, z: 1 }, .01)}
        <div class="property-row"><span>Bounds</span><input value="${size.x.toFixed(3)} × ${size.y.toFixed(3)} × ${size.z.toFixed(3)}" disabled></div>
        <div class="button-grid"><button data-inspector-action="reset-transform">RESET</button><button data-inspector-action="focus">FRAME</button><button data-inspector-action="duplicate">DUPLICATE</button><button data-inspector-action="isolate">ISOLATE</button></div>
      `)}
      ${object.geometry ? this.geometrySection(object) : ''}
      ${material ? this.materialSection(material) : ''}
      ${object.isLight ? this.lightSection(object) : ''}
      ${object.isCamera ? this.cameraSection(object) : ''}
      ${object.isInstancedMesh ? this.instanceSection(object) : ''}
      ${this.assetPackageSection(object)}
      ${this.section('METADATA', `<div class="property-row"><span>Path</span><input value="${escapeHtml(pathForObject(object))}" disabled></div><div class="property-row"><span>Children</span><input value="${object.children?.length || 0}" disabled></div>`)}
    `;
    this.bindInspector(object, material);
  }

  section(title, body) { return `<div class="section"><h3>${title}</h3><div class="section-body">${body}</div></div>`; }
  textRow(label, id, value) { return `<label class="property-row"><span>${label}</span><input id="${id}" value="${escapeHtml(value)}"></label>`; }
  numberRow(label, id, value, step = .01, min = '') { return `<label class="property-row"><span>${label}</span><input id="${id}" type="number" value="${Number(value ?? 0).toFixed(step < .01 ? 4 : 3)}" step="${step}" ${min !== '' ? `min="${min}"` : ''}></label>`; }
  checkRow(label, id, checked) { return `<label class="property-row"><span>${label}</span><input id="${id}" type="checkbox" ${checked ? 'checked' : ''}></label>`; }
  colorRow(label, id, color) { return `<label class="property-row"><span>${label}</span><input id="${id}" type="color" value="#${color.getHexString()}"></label>`; }
  vectorRow(label, prefix, vector, step) { return `<div class="property-row"><span>${label}</span><div class="axis-inputs">${['x','y','z'].map((axis) => `<label><span>${axis.toUpperCase()}</span><input id="${prefix}-${axis}" type="number" value="${Number(vector?.[axis] || 0).toFixed(3)}" step="${step}"></label>`).join('')}</div></div>`; }

  geometrySection(object) {
    const geometry = object.geometry; const params = geometry.parameters || {};
    const rows = Object.entries(params).filter(([, value]) => typeof value === 'number').slice(0, 8)
      .map(([key, value]) => this.numberRow(splitLabel(key), `geo-${key}`, value, key.toLowerCase().includes('segment') ? 1 : .01, key.toLowerCase().includes('segment') ? 1 : '')).join('');
    return this.section(`GEOMETRY / ${geometry.type}`, `
      <div class="property-row"><span>Vertices</span><input value="${geometry.attributes?.position?.count || 0}" disabled></div>
      <div class="property-row"><span>Triangles</span><input value="${geometry.index ? Math.floor(geometry.index.count / 3) : Math.floor((geometry.attributes?.position?.count || 0) / 3)}" disabled></div>${rows}
      <div class="shape-controls">
        <label class="property-row"><span>Amount</span><input id="shape-amount" type="number" min="-2" max="2" step=".05" value="${this.shapeSettings.amount}"></label>
        <label class="property-row"><span>Axis</span><select id="shape-axis"><option value="x" ${this.shapeSettings.axis === 'x' ? 'selected' : ''}>X</option><option value="y" ${this.shapeSettings.axis === 'y' ? 'selected' : ''}>Y</option><option value="z" ${this.shapeSettings.axis === 'z' ? 'selected' : ''}>Z</option></select></label>
        <label class="property-row"><span>Frequency</span><input id="shape-frequency" type="number" min=".1" max="20" step=".1" value="${this.shapeSettings.frequency}"></label>
        <label class="property-row"><span>Seed</span><input id="shape-seed" type="number" step="1" value="${this.shapeSettings.seed}"></label>
      </div>
      <div class="button-grid"><button data-distort="twist">TWIST</button><button data-distort="bend">BEND</button><button data-distort="taper">TAPER</button><button data-distort="noise">NOISE</button><button data-distort="flatten">FLATTEN</button><button data-distort="inflate">INFLATE</button><button data-distort="pinch">PINCH</button><button data-distort="shear">SHEAR</button><button data-distort="spherize">SPHERIZE</button><button data-distort="reset">RESET GEO</button></div>
    `);
  }

  materialSection(material) {
    const texture = material.map;
    return this.section(`MATERIAL / ${material.type}`, `
      ${material.color ? this.colorRow('Color', 'mat-color', material.color) : ''}${material.emissive ? this.colorRow('Emissive', 'mat-emissive', material.emissive) : ''}
      ${'roughness' in material ? this.numberRow('Roughness', 'mat-roughness', material.roughness, .01, 0) : ''}${'metalness' in material ? this.numberRow('Metalness', 'mat-metalness', material.metalness, .01, 0) : ''}
      ${'emissiveIntensity' in material ? this.numberRow('Emission', 'mat-emission', material.emissiveIntensity, .01, 0) : ''}${this.numberRow('Opacity', 'mat-opacity', material.opacity, .01, 0)}
      ${this.checkRow('Transparent', 'mat-transparent', material.transparent)}${'wireframe' in material ? this.checkRow('Wireframe', 'mat-wireframe', material.wireframe) : ''}
      ${'flatShading' in material ? this.checkRow('Flat shading', 'mat-flat', material.flatShading) : ''}${this.checkRow('Depth write', 'mat-depth', material.depthWrite)}
      <button class="wide-button" data-inspector-action="clone-material">CLONE SHARED MATERIAL</button>
      <div class="texture-preview" ${texture?.userData?.dataUrl ? `style="background-image:url('${texture.userData.dataUrl}')"` : ''}></div>
      <div class="property-row"><span>Texture</span><input value="${escapeHtml(texture?.name || texture?.userData?.fileName || 'None')}" disabled></div>
      <div class="button-grid"><button data-inspector-action="texture-upload">UPLOAD IMAGE</button><button data-inspector-action="texture-clear">CLEAR MAP</button><button data-inspector-action="texture-descendants">APPLY TO PARTS</button><button data-inspector-action="texture-fit">FIT UV</button></div>
      ${this.numberRow('Repeat X', 'tex-repeat-x', texture?.repeat?.x ?? 1, .05)}${this.numberRow('Repeat Y', 'tex-repeat-y', texture?.repeat?.y ?? 1, .05)}
      ${this.numberRow('Offset X', 'tex-offset-x', texture?.offset?.x ?? 0, .01)}${this.numberRow('Offset Y', 'tex-offset-y', texture?.offset?.y ?? 0, .01)}
      ${this.numberRow('Rotation °', 'tex-rotation', (texture?.rotation || 0) * DEG, 1)}
      <label class="property-row"><span>Wrap</span><select id="tex-wrap"><option value="repeat" ${texture?.wrapS === THREE.RepeatWrapping ? 'selected' : ''}>Repeat</option><option value="clamp" ${!texture || texture.wrapS === THREE.ClampToEdgeWrapping ? 'selected' : ''}>Clamp</option><option value="mirror" ${texture?.wrapS === THREE.MirroredRepeatWrapping ? 'selected' : ''}>Mirror</option></select></label>
    `);
  }

  lightSection(object) { return this.section('LIGHT', `${object.color ? this.colorRow('Color', 'light-color', object.color) : ''}${this.numberRow('Intensity', 'light-intensity', object.intensity, .05, 0)}${'distance' in object ? this.numberRow('Distance', 'light-distance', object.distance, .1, 0) : ''}${'decay' in object ? this.numberRow('Decay', 'light-decay', object.decay, .1, 0) : ''}${this.checkRow('Shadow', 'light-shadow', object.castShadow)}`); }
  cameraSection(object) { return this.section('CAMERA', `${'fov' in object ? this.numberRow('Field of view', 'camera-fov', object.fov, 1, 1) : ''}${this.numberRow('Near', 'camera-near', object.near, .01, .001)}${this.numberRow('Far', 'camera-far', object.far, 1, .1)}${this.numberRow('Zoom', 'camera-zoom', object.zoom, .01, .01)}`); }
  instanceSection(object) { return this.section('INSTANCES', `<div class="property-row"><span>Count</span><input value="${object.count}" disabled></div>${this.numberRow('Instance index', 'instance-index', 0, 1, 0)}<button class="wide-button" data-inspector-action="extract-instance">EXTRACT INSTANCE AS MESH</button>`); }

  bindInspector(object, material) {
    const bind = (id, event, read, apply) => { const input = $(`#${id}`); if (!input) return; input.addEventListener(event, () => { const before = read(); const value = input.type === 'checkbox' ? input.checked : input.value; apply(value); const after = read(); this.history.push(splitLabel(id), () => { apply(before); this.refreshInspector(); }, () => { apply(after); this.refreshInspector(); }); this.recordRuntimeOverride(object); this.rebuildTree(); }); };
    bind('obj-name', 'change', () => object.name, (value) => { object.name = value; });
    bind('obj-visible', 'change', () => object.visible, (value) => { object.visible = Boolean(value); });
    bind('obj-cast', 'change', () => object.castShadow, (value) => { object.castShadow = Boolean(value); });
    bind('obj-receive', 'change', () => object.receiveShadow, (value) => { object.receiveShadow = Boolean(value); });
    bind('obj-frustum', 'change', () => object.frustumCulled, (value) => { object.frustumCulled = Boolean(value); });
    bind('obj-order', 'change', () => object.renderOrder, (value) => { object.renderOrder = Number(value); });
    for (const axis of ['x','y','z']) {
      bind(`pos-${axis}`, 'change', () => object.position[axis], (value) => { object.position[axis] = Number(value); });
      bind(`rot-${axis}`, 'change', () => object.rotation[axis] * DEG, (value) => { object.rotation[axis] = Number(value) * RAD; });
      bind(`scale-${axis}`, 'change', () => object.scale[axis], (value) => { object.scale[axis] = Number(value); });
    }
    if (material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      const each = (fn) => materials.filter(Boolean).forEach((item) => { fn(item); item.needsUpdate = true; });
      if (material.color) bind('mat-color', 'change', () => `#${material.color.getHexString()}`, (value) => each((item) => item.color?.set(value)));
      if (material.emissive) bind('mat-emissive', 'change', () => `#${material.emissive.getHexString()}`, (value) => each((item) => item.emissive?.set(value)));
      for (const [id, key] of [['mat-roughness','roughness'],['mat-metalness','metalness'],['mat-emission','emissiveIntensity'],['mat-opacity','opacity']]) {
        bind(id, 'change', () => material[key], (value) => each((item) => { if (key in item) item[key] = Number(value); }));
      }
      for (const [id, key] of [['mat-transparent','transparent'],['mat-wireframe','wireframe'],['mat-flat','flatShading'],['mat-depth','depthWrite']]) bind(id, 'change', () => material[key], (value) => each((item) => { if (key in item) item[key] = Boolean(value); }));
      for (const [id, key, axis] of [['tex-repeat-x','repeat','x'],['tex-repeat-y','repeat','y'],['tex-offset-x','offset','x'],['tex-offset-y','offset','y']]) {
        bind(id, 'change', () => material.map?.[key]?.[axis] ?? (key === 'repeat' ? 1 : 0), (value) => each((item) => { if (item.map) { item.map[key][axis] = Number(value); item.map.needsUpdate = true; } }));
      }
      bind('tex-rotation', 'change', () => (material.map?.rotation || 0) * DEG, (value) => each((item) => { if (item.map) { item.map.center.set(.5,.5); item.map.rotation = Number(value) * RAD; item.map.needsUpdate = true; } }));
      bind('tex-wrap', 'change', () => material.map?.wrapS || THREE.ClampToEdgeWrapping, (value) => each((item) => { if (item.map) { const mode = { repeat:THREE.RepeatWrapping, clamp:THREE.ClampToEdgeWrapping, mirror:THREE.MirroredRepeatWrapping }[value] || Number(value); item.map.wrapS = item.map.wrapT = mode; item.map.needsUpdate = true; } }));
    }
    if (object.isLight) {
      if (object.color) bind('light-color', 'change', () => `#${object.color.getHexString()}`, (value) => object.color.set(value));
      for (const key of ['intensity','distance','decay']) bind(`light-${key}`, 'change', () => object[key], (value) => { object[key] = Number(value); });
      bind('light-shadow', 'change', () => object.castShadow, (value) => { object.castShadow = Boolean(value); });
    }
    if (object.isCamera) for (const key of ['fov','near','far','zoom']) bind(`camera-${key}`, 'change', () => object[key], (value) => { object[key] = Number(value); object.updateProjectionMatrix(); });
    for (const button of $$('[data-inspector-action]', $('#inspector'))) button.addEventListener('click', () => this.action(button.dataset.inspectorAction));
    for (const button of $$('[data-distort]', $('#inspector'))) button.addEventListener('click', () => this.distortGeometry(button.dataset.distort));
    for (const key of ['amount','axis','frequency','seed']) $(`#shape-${key}`)?.addEventListener('change', (event) => { this.shapeSettings[key] = key === 'axis' ? event.target.value : Number(event.target.value); });
    for (const input of $$('[id^="geo-"]', $('#inspector'))) input.addEventListener('change', () => this.rebuildGeometryFromInputs(object));
  }

  changeProperty(object, label, redo, undo) { redo(); this.history.push(label, undo, redo); this.recordRuntimeOverride(object); this.refreshInspector(); }
  recordRuntimeOverride(object) { if (this.sourceMode !== 'runtime' || !object) return; this.runtimeOverrides.set(fingerprintDescriptor({ source: 'game', path: pathForObject(object), type: object.type, name: object.name }), { path: pathForObject(object), state: snapshotObject(object) }); }

  rebuildGeometryFromInputs(object) {
    if (!object.geometry?.parameters) return;
    const before = object.geometry; const p = { ...before.parameters };
    for (const [key, value] of Object.entries(p)) { const input = $(`#geo-${key}`); if (input && typeof value === 'number') p[key] = Number(input.value); }
    const type = before.type; let next = null;
    try {
      const constructors = {
        BoxGeometry: () => new THREE.BoxGeometry(p.width, p.height, p.depth, p.widthSegments, p.heightSegments, p.depthSegments),
        SphereGeometry: () => new THREE.SphereGeometry(p.radius, p.widthSegments, p.heightSegments, p.phiStart, p.phiLength, p.thetaStart, p.thetaLength),
        CylinderGeometry: () => new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, p.radialSegments, p.heightSegments, p.openEnded, p.thetaStart, p.thetaLength),
        ConeGeometry: () => new THREE.ConeGeometry(p.radius, p.height, p.radialSegments, p.heightSegments, p.openEnded, p.thetaStart, p.thetaLength),
        PlaneGeometry: () => new THREE.PlaneGeometry(p.width, p.height, p.widthSegments, p.heightSegments),
        TorusGeometry: () => new THREE.TorusGeometry(p.radius, p.tube, p.radialSegments, p.tubularSegments, p.arc),
        CapsuleGeometry: () => new THREE.CapsuleGeometry(p.radius, p.length, p.capSegments, p.radialSegments),
        IcosahedronGeometry: () => new THREE.IcosahedronGeometry(p.radius, p.detail)
      };
      next = constructors[type]?.(); if (!next) return this.status(`${type} parameter rebuilding is not available`, true);
      object.geometry = next;
      if (!this.originalGeometries.has(object)) this.originalGeometries.set(object, before.clone());
      this.history.push('Geometry parameters', () => { object.geometry = before; this.refreshInspector(); }, () => { object.geometry = next; this.refreshInspector(); });
      this.status(`${type.toUpperCase()} REBUILT`);
    } catch (error) { this.status(`GEOMETRY: ${error.message}`, true); }
  }

  distortGeometry(mode) {
    const object = this.selected; if (!object?.geometry?.attributes?.position) return;
    if (mode === 'reset') {
      const original = this.originalGeometries.get(object); if (!original) return this.status('NO ORIGINAL GEOMETRY SNAPSHOT', true);
      const before = object.geometry; const next = original.clone(); object.geometry = next;
      this.history.push('Reset geometry', () => object.geometry = before, () => object.geometry = next); this.refreshInspector(); return;
    }
    const before = object.geometry;
    if (!this.originalGeometries.has(object)) this.originalGeometries.set(object, before.clone());
    const next = before.clone(); const position = next.attributes.position; next.computeBoundingBox();
    const box = next.boundingBox, center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    const v = new THREE.Vector3(), radial = new THREE.Vector3();
    const settings = this.shapeSettings; const amount = Number(settings.amount) || 0; const axis = settings.axis || 'y';
    const axes = axis === 'x' ? ['x','y','z'] : axis === 'z' ? ['z','x','y'] : ['y','x','z']; const [main, sideA, sideB] = axes;
    const min = box.min[main], extent = size[main] || 1, maxSize = Math.max(size.x, size.y, size.z) || 1;
    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i); const t = (v[main] - min) / extent; const a0 = v[sideA] - center[sideA], b0 = v[sideB] - center[sideB];
      if (mode === 'twist') { const angle = (t - .5) * amount * Math.PI; v[sideA] = center[sideA] + a0 * Math.cos(angle) - b0 * Math.sin(angle); v[sideB] = center[sideB] + a0 * Math.sin(angle) + b0 * Math.cos(angle); }
      if (mode === 'bend') v[sideA] += Math.sin((t - .5) * Math.PI) * extent * amount * .35;
      if (mode === 'taper') { const scale = Math.max(.02, 1 + (t - .5) * amount); v[sideA] = center[sideA] + a0 * scale; v[sideB] = center[sideB] + b0 * scale; }
      if (mode === 'noise') { const frequency = Number(settings.frequency) || 3; const seed = Number(settings.seed) || 0; const n = Math.sin((v.x * 1.71 + v.y * 1.17 + v.z * 2.33) * frequency + seed * 12.9898) * amount * .08 * maxSize; radial.copy(v).sub(center).normalize(); v.addScaledVector(radial, n); }
      if (mode === 'flatten') v[main] = center[main] + (v[main] - center[main]) * Math.max(.02, 1 - amount);
      if (mode === 'inflate') { radial.copy(v).sub(center).normalize(); v.addScaledVector(radial, amount * .12 * maxSize); }
      if (mode === 'pinch') { const scale = Math.max(.02, 1 - Math.sin(t * Math.PI) * amount * .65); v[sideA] = center[sideA] + a0 * scale; v[sideB] = center[sideB] + b0 * scale; }
      if (mode === 'shear') v[sideA] += (t - .5) * extent * amount * .5;
      if (mode === 'spherize') { radial.copy(v).sub(center); const radius = maxSize * .5; const target = radial.lengthSq() ? radial.normalize().multiplyScalar(radius) : radial; v.lerp(center.clone().add(target), Math.min(1, Math.abs(amount)) * .75); }
      position.setXYZ(i, v.x, v.y, v.z);
    }
    position.needsUpdate = true; next.computeVertexNormals(); next.computeBoundingBox(); next.computeBoundingSphere(); object.geometry = next;
    this.history.push(splitLabel(mode), () => { object.geometry = before; this.refreshInspector(); }, () => { object.geometry = next; this.refreshInspector(); }); this.refreshInspector();
  }

  async textureFromDataUrl(dataUrl, name = 'Uploaded texture') {
    const texture = await this.textureLoader.loadAsync(dataUrl); texture.name = name; texture.colorSpace = THREE.SRGBColorSpace; texture.flipY = false;
    texture.userData = { ...texture.userData, dataUrl, fileName: name }; texture.needsUpdate = true; return texture;
  }

  textureTargets(object, descendants = false) {
    const targets = []; const add = (item) => { if (item?.isMesh && item.material) targets.push(item); };
    if (descendants) object?.traverse(add); else add(object);
    return targets;
  }

  async applyTextureData(dataUrl, name, object = this.selected, descendants = false, options = {}) {
    const targets = this.textureTargets(object, descendants); if (!targets.length) throw new Error('Select a mesh or character containing meshes');
    const before = targets.map((mesh) => ({ mesh, material: cloneMaterial(mesh.material) }));
    const base = await this.textureFromDataUrl(dataUrl, name);
    const wrap = { repeat:THREE.RepeatWrapping, clamp:THREE.ClampToEdgeWrapping, mirror:THREE.MirroredRepeatWrapping }[options.wrap] || THREE.RepeatWrapping;
    base.wrapS = base.wrapT = wrap; base.repeat.fromArray(options.repeat || [1,1]); base.offset.fromArray(options.offset || [0,0]); base.center.set(.5,.5); base.rotation = Number(options.rotation || 0) * RAD;
    for (const mesh of targets) {
      const materials = Array.isArray(mesh.material) ? mesh.material.map((item) => item.clone()) : [mesh.material.clone()];
      for (const material of materials) { material.map = base.clone(); material.map.needsUpdate = true; material.needsUpdate = true; }
      mesh.material = Array.isArray(mesh.material) ? materials : materials[0]; mesh.userData.cadTexture = { name, dataUrl, options };
    }
    const after = targets.map((mesh) => ({ mesh, material: cloneMaterial(mesh.material) }));
    this.history.push('Apply texture', () => { before.forEach((item) => item.mesh.material = cloneMaterial(item.material)); this.refreshInspector(); }, () => { after.forEach((item) => item.mesh.material = cloneMaterial(item.material)); this.refreshInspector(); });
    this.refreshInspector(); this.status(`TEXTURE APPLIED TO ${targets.length} MESH${targets.length === 1 ? '' : 'ES'}`); return targets.length;
  }

  applyTextureFile(file, descendants = false) {
    const reader = new FileReader(); reader.onload = () => this.applyTextureData(reader.result, file.name, this.selected, descendants).catch((error) => this.status(error.message, true)); reader.readAsDataURL(file);
  }

  clearTexture(descendants = false) {
    const targets = this.textureTargets(this.selected, descendants); if (!targets.length) return;
    const before = targets.map((mesh) => ({ mesh, material: cloneMaterial(mesh.material) }));
    targets.forEach((mesh) => { const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]; materials.forEach((material) => { material.map = null; material.needsUpdate = true; }); delete mesh.userData.cadTexture; });
    const after = targets.map((mesh) => ({ mesh, material: cloneMaterial(mesh.material) }));
    this.history.push('Clear texture', () => { before.forEach((item) => item.mesh.material = cloneMaterial(item.material)); this.refreshInspector(); }, () => { after.forEach((item) => item.mesh.material = cloneMaterial(item.material)); this.refreshInspector(); }); this.refreshInspector();
  }

  objectManifest(object, depth = 0) {
    if (!object || depth > 5) return null;
    const material = Array.isArray(object.material) ? object.material[0] : object.material;
    const geometry = object.geometry;
    return {
      uuid: object.uuid, name: objectLabel(object), type: object.type, characterPart: object.userData?.characterPart || null,
      transform: { position: object.position?.toArray(), rotationDegrees: object.rotation ? [object.rotation.x * DEG, object.rotation.y * DEG, object.rotation.z * DEG] : null, scale: object.scale?.toArray() },
      geometry: geometry ? { type: geometry.type, parameters: geometry.parameters || {}, vertices: geometry.attributes?.position?.count || 0 } : null,
      material: material ? { type: material.type, color: material.color ? `#${material.color.getHexString()}` : null, roughness: material.roughness, metalness: material.metalness, hasTexture: !!material.map } : null,
      children: (object.children || []).filter((child) => !child.userData?.helper && !child.userData?.cadInternal).slice(0, 80).map((child) => this.objectManifest(child, depth + 1)).filter(Boolean)
    };
  }

  getAgentContext(scope = 'selection') {
    const selected = this.selected && this.isEditorObject(this.selected) ? this.selected : null;
    let contextRoot = selected || this.root;
    if (scope === 'character' && selected) { let node = selected; while (node.parent && node.parent !== this.root) node = node.parent; contextRoot = node; }
    if (scope === 'workspace') contextRoot = this.root;
    return { editor:'cadJS', sourceMode:this.sourceMode, scope, selectionUuid:selected?.uuid || null, selectionPath:selected ? pathForObject(selected) : null, root:this.objectManifest(contextRoot), catalogue:{ entries:this.catalog?.stats?.entries || 0, images:this.catalog?.stats?.images || 0 }, constraints:{ reversible:true, sourceFilesWritable:false, maxActions:64 } };
  }

  findAgentTarget(target) {
    if (!target || target === 'selection') return this.selected;
    if (target === 'workspace') return this.root;
    return this.root.getObjectByProperty('uuid', target) || null;
  }

  restoreWorkspace(json) {
    const loaded = new THREE.ObjectLoader().parse(json); this.transform.detach(); while (this.root.children.length) this.root.remove(this.root.children[0]);
    for (const child of [...loaded.children]) this.root.add(child); this.select(null); this.rebuildTree();
  }

  async executeAgentAction(action, references) {
    let object = this.findAgentTarget(action.target); const p = action.params || {};
    if (action.type === 'select') { object = this.findAgentTarget(p.target || action.target); if (object) this.select(object); return; }
    if (action.type === 'addPrimitive') {
      const geometry = { box:'BoxGeometry', sphere:'SphereGeometry', cylinder:'CylinderGeometry', cone:'ConeGeometry', plane:'PlaneGeometry', torus:'TorusGeometry', capsule:'CapsuleGeometry', icosahedron:'IcosahedronGeometry' }[p.geometry];
      if (!geometry) throw new Error(`Unknown primitive: ${p.geometry}`); object = this.addObject(geometry); if (p.name) object.name = String(p.name);
      if (Array.isArray(p.position)) object.position.fromArray(p.position.map(Number)); if (Array.isArray(p.rotation)) object.rotation.set(...p.rotation.map((n) => Number(n) * RAD)); if (Array.isArray(p.scale)) object.scale.fromArray(p.scale.map(Number));
      const material = Array.isArray(object.material) ? object.material[0] : object.material; if (p.color && material?.color) material.color.set(p.color); this.select(object); return;
    }
    if (!object) throw new Error(`Agent target not found: ${action.target}`);
    if (action.type === 'setTransform') { if (Array.isArray(p.position)) object.position.fromArray(p.position.map(Number)); if (Array.isArray(p.rotation)) object.rotation.set(...p.rotation.map((n) => Number(n) * RAD)); if (Array.isArray(p.scale)) object.scale.fromArray(p.scale.map(Number)); }
    if (action.type === 'setMaterial') object.traverse((mesh) => { const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]; materials.filter(Boolean).forEach((material) => { if (p.color && material.color) material.color.set(p.color); if (p.emissive && material.emissive) material.emissive.set(p.emissive); for (const key of ['roughness','metalness','opacity']) if (p[key] !== undefined && key in material) material[key] = Number(p[key]); for (const key of ['flatShading','wireframe']) if (p[key] !== undefined && key in material) material[key] = Boolean(p[key]); if (p.opacity !== undefined) material.transparent = Number(p.opacity) < 1; material.needsUpdate = true; }); });
    if (action.type === 'duplicate') { this.select(object); this.duplicateSelected(); }
    if (action.type === 'delete') { this.select(object); this.deleteSelected(); }
    if (action.type === 'distort') { this.select(object); this.shapeSettings = { ...this.shapeSettings, amount:Number(p.amount ?? .65), axis:p.axis || 'y', frequency:Number(p.frequency ?? 3), seed:Number(p.seed ?? 1) }; this.distortGeometry(p.mode); }
    if (action.type === 'rename') object.name = String(p.name || object.name);
    if (action.type === 'setVisibility') object.visible = Boolean(p.visible);
    if (action.type === 'focus') this.focusObject(object);
    if (action.type === 'applyTexture') { const reference = references[Number(p.referenceIndex || 0)]; if (!reference?.dataUrl) throw new Error('Requested reference image is missing'); await this.applyTextureData(reference.dataUrl, reference.name, object, p.scope === 'descendants', p); }
  }

  async executeAgentPlan(plan, references = []) {
    if (this.sourceMode !== 'editor') { this.sourceMode = 'editor'; $('#runtime-source').textContent = 'EDITOR'; }
    const before = this.root.toJSON(); const historyStart = this.history.undoStack.length;
    try { for (const action of plan.actions) await this.executeAgentAction(action, references); }
    catch (error) { this.restoreWorkspace(before); this.history.undoStack.splice(historyStart); throw error; }
    const after = this.root.toJSON(); this.history.undoStack.splice(historyStart); this.history.redoStack.length = 0;
    this.history.push(`AI: ${plan.summary}`, () => this.restoreWorkspace(before), () => this.restoreWorkspace(after)); this.rebuildTree(); this.refreshInspector(); return plan.actions.length;
  }

  setTool(tool) {
    $$('.tool[data-tool]').forEach((button) => button.classList.toggle('active', button.dataset.tool === tool));
    if (tool === 'select' || tool === 'orbit') this.transform.detach();
    else if (this.selected && this.isEditorObject(this.selected)) { this.transform.attach(this.selected); this.transform.setMode(tool); }
    this.orbit.enabled = tool === 'orbit' || tool === 'select' || !this.selected;
  }

  action(action) {
    if (action === 'agent') return this.agentPanel.toggle();
    if (action === 'focus') return this.focusObject(this.selected);
    if (action === 'isolate') return this.toggleIsolation();
    if (action === 'duplicate') return this.duplicateSelected();
    if (action === 'delete') return this.deleteSelected();
    if (action === 'reset-transform' && this.selected) {
      const object = this.selected, before = snapshotObject(object); object.position.set(0,0,0); object.rotation.set(0,0,0); object.scale.set(1,1,1); const after = snapshotObject(object);
      this.history.push('Reset transform', () => applySnapshot(object, before), () => applySnapshot(object, after)); this.refreshInspector();
    }
    if (action === 'clone-material' && this.selected?.material) { this.selected.material = cloneMaterial(this.selected.material); this.refreshInspector(); this.status('MATERIAL MADE UNIQUE'); }
    if (action === 'texture-upload') $('#texture-input').click();
    if (action === 'texture-clear') this.clearTexture(false);
    if (action === 'texture-descendants') { $('#texture-input').dataset.descendants = 'true'; $('#texture-input').click(); }
    if (action === 'texture-fit' && this.selected?.material) {
      const materials = Array.isArray(this.selected.material) ? this.selected.material : [this.selected.material]; materials.forEach((material) => { if (material.map) { material.map.repeat.set(1,1); material.map.offset.set(0,0); material.map.center.set(.5,.5); material.map.rotation = 0; material.map.needsUpdate = true; } }); this.refreshInspector();
    }
    if (action === 'extract-instance') this.extractInstance();
    if (action === 'export-asset-package') this.exportAssetPackage();
    if (action === 'rebase-asset') this.rebaseAsset();
    if (action === 'register-asset') this.registerSelectedAsset();
  }

  addObject(type) {
    let object;
    const material = () => new THREE.MeshStandardMaterial({ color: 0x789aaa, roughness: .65, metalness: .12 });
    if (type === 'BoxGeometry') object = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), material());
    if (type === 'SphereGeometry') object = new THREE.Mesh(new THREE.SphereGeometry(.65,32,20), material());
    if (type === 'CylinderGeometry') object = new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,1.2,32), material());
    if (type === 'ConeGeometry') object = new THREE.Mesh(new THREE.ConeGeometry(.6,1.3,32,4), material());
    if (type === 'TorusGeometry') object = new THREE.Mesh(new THREE.TorusGeometry(.65,.2,20,48), material());
    if (type === 'CapsuleGeometry') object = new THREE.Mesh(new THREE.CapsuleGeometry(.38,.8,8,20), material());
    if (type === 'PlaneGeometry') object = new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5,8,8), material());
    if (type === 'IcosahedronGeometry') object = new THREE.Mesh(new THREE.IcosahedronGeometry(.7,2), material());
    if (type === 'DirectionalLight') { object = new THREE.DirectionalLight(0xffffff, 2); object.position.set(3,5,2); object.castShadow = true; }
    if (type === 'PerspectiveCamera') { object = new THREE.PerspectiveCamera(50,1,.1,500); object.position.set(3,2,4); }
    if (!object) return; object.name = `New ${splitLabel(type.replace('Geometry',''))}`; object.position.y ||= .6; object.castShadow = !!object.isMesh; object.receiveShadow = !!object.isMesh;
    this.root.add(object); this.history.push(`Add ${type}`, () => { this.root.remove(object); this.select(null); }, () => { this.root.add(object); this.select(object); }); this.select(object); this.setTool('translate'); return object;
  }

  duplicateSelected() {
    const source = this.selected; if (!source || !this.isEditorObject(source) || source === this.root) return this.status('DUPLICATE IS AVAILABLE IN ISOLATION MODE', true);
    const copy = source.clone(true); copy.name = `${objectLabel(source)} Copy`; copy.position.x += .35;
    copy.traverse((child) => { if (child.geometry) child.geometry = child.geometry.clone(); if (child.material) child.material = cloneMaterial(child.material); });
    source.parent.add(copy); this.history.push('Duplicate', () => { copy.parent?.remove(copy); this.select(source); }, () => { source.parent.add(copy); this.select(copy); }); this.select(copy);
  }

  deleteSelected() {
    const object = this.selected; if (!object || object === this.root || !object.parent) return;
    const parent = object.parent, index = parent.children.indexOf(object); parent.remove(object); this.select(null);
    this.history.push('Remove', () => { parent.children.splice(Math.min(index, parent.children.length), 0, object); object.parent = parent; this.select(object); }, () => { parent.remove(object); this.select(null); }); this.rebuildTree();
  }

  toggleIsolation() {
    const selected = this.selected;
    if (this.isolated) { for (const [object, visible] of this.isolated) object.visible = visible; this.isolated = null; this.status('ISOLATION CLEARED'); }
    else if (selected) {
      const chain = new Set(); let node = selected; while (node) { chain.add(node); node = node.parent; }
      this.isolated = new Map(); for (const object of this.root.children) { if (object.userData?.helper) continue; this.isolated.set(object, object.visible); object.visible = chain.has(object) || object === selected; }
      selected.visible = true; this.focusObject(selected); this.status(`ISOLATED: ${objectLabel(selected)}`);
    }
    this.rebuildTree();
  }

  focusObject(object) {
    if (!object) return; const box = new THREE.Box3().setFromObject(object); if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()); const radius = Math.max(size.length() * .65, .35);
    const direction = this.camera.position.clone().sub(this.orbit.target).normalize(); this.orbit.target.copy(center); this.camera.position.copy(center).addScaledVector(direction, radius * 2.3); this.camera.near = Math.max(.001, radius / 100); this.camera.far = Math.max(1000, radius * 100); this.camera.updateProjectionMatrix(); this.orbit.update();
  }

  extractInstance() {
    const instanced = this.selected; if (!instanced?.isInstancedMesh) return; const index = Math.min(instanced.count - 1, Math.max(0, Number($('#instance-index')?.value || 0)));
    const matrix = new THREE.Matrix4(); instanced.getMatrixAt(index, matrix); const mesh = new THREE.Mesh(instanced.geometry.clone(), cloneMaterial(instanced.material)); mesh.name = `${objectLabel(instanced)} Instance ${index}`; mesh.applyMatrix4(matrix); instanced.localToWorld(mesh.position); this.root.add(mesh); this.select(mesh); this.status(`INSTANCE ${index} EXTRACTED`);
  }

  setCameraView(view) {
    const target = this.orbit.target.clone(), distance = Math.max(5, this.camera.position.distanceTo(target));
    if (view === 'front') this.camera.position.set(target.x, target.y, target.z + distance);
    if (view === 'side') this.camera.position.set(target.x + distance, target.y, target.z);
    if (view === 'top') this.camera.position.set(target.x, target.y + distance, target.z + .001);
    if (view === 'perspective') this.camera.position.set(target.x + distance * .65, target.y + distance * .45, target.z + distance * .75);
    this.camera.lookAt(target); this.orbit.update(); $$('[data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  }

  toggleWireframe() { this.root.traverse((object) => { const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.filter(Boolean).forEach((material) => { if ('wireframe' in material) { material.wireframe = !this.wireframe; material.needsUpdate = true; } }); }); this.wireframe = !this.wireframe; $('#wire-toggle').classList.toggle('active', this.wireframe); }
  toggleSnap() { this.snap = !this.snap; this.transform.setTranslationSnap(this.snap ? .1 : null); this.transform.setRotationSnap(this.snap ? 15 * RAD : null); this.transform.setScaleSnap(this.snap ? .1 : null); $('#snap-toggle').classList.toggle('active', this.snap); $('#snap-toggle').textContent = this.snap ? 'SNAP 0.1' : 'SNAP OFF'; }

  toggleView(force) {
    this.viewMode = force || (this.viewMode === 'editor' ? 'game' : 'editor'); const game = this.viewMode === 'game';
    this.editorView.classList.toggle('active', !game); this.gameView.classList.toggle('active', game); $('#mode-toggle').textContent = game ? 'CAD / TAB' : 'GAME / TAB';
    if (game) { this.installRuntimePicking(); setTimeout(() => this.scanRuntime(), 100); } else { this.sourceMode = 'editor'; $('#runtime-source').textContent = 'EDITOR'; this.rebuildTree(); this.resize(); }
  }

  setPanel(panel) { $$('.panel-page').forEach((page) => page.classList.toggle('active', page.id === `${panel}-panel`)); $$('.panel-tabs button[data-panel]').forEach((button) => button.classList.toggle('active', button.dataset.panel === panel)); }

  showMenu(name, anchor) {
    const menus = {
      file: [['New project','new'],['Open project / package…','open'],['Save browser project','save'],['Export project JSON','export-project'],['Export versioned asset package','export-asset-package'],['Export selected GLB','export-glb'],['Export selected OBJ','export-obj'],['Export game overrides','export-overrides'],['Viewport PNG','screenshot']],
      edit: [['Undo','undo','Ctrl+Z'],['Redo','redo','Ctrl+Y'],['Duplicate','duplicate','Ctrl+D'],['Remove','delete','Delete'],['Reset transform','reset-transform']],
      object: [['Add box','add-box'],['Add sphere','add-sphere'],['Add cylinder','add-cylinder'],['Add directional light','add-light'],['Isolate selection','isolate','I'],['Frame selection','focus','F']],
      view: [['CAD / game environment','toggle-view','Tab'],['Perspective','view-persp','1'],['Front','view-front','2'],['Right','view-side','3'],['Top','view-top','4'],['Grid','grid','G'],['Wireframe','wireframe','X']],
      agent: [['Open AI design agent','agent-open','A'],['Use local llama-server','agent-local'],['Use MCP/custom gateway','agent-mcp'],['Use OpenAI','agent-openai'],['Use OpenRouter','agent-openrouter'],['Use Anthropic','agent-anthropic']],
      info: [['About cadJS','about'],['Rescan repository','rescan'],['Reload game preview','reload-game']]
    };
    const host = $('#menu-popover'); host.innerHTML = (menus[name] || []).map(([label, action, key]) => `<button data-menu-action="${action}"><span>${label}</span><kbd>${key || ''}</kbd></button>`).join('');
    const rect = anchor.getBoundingClientRect(); host.style.left = `${rect.left}px`; host.style.top = `${rect.bottom + 4}px`; host.classList.remove('hidden');
    $$('[data-menu-action]', host).forEach((button) => button.addEventListener('click', () => { this.menuAction(button.dataset.menuAction); host.classList.add('hidden'); }));
  }

  menuAction(action) {
    const map = { undo: () => this.history.undo(), redo: () => this.history.redo(), duplicate: () => this.duplicateSelected(), delete: () => this.deleteSelected(), 'reset-transform': () => this.action('reset-transform'), isolate: () => this.toggleIsolation(), focus: () => this.focusObject(this.selected),
      'add-box': () => this.addObject('BoxGeometry'), 'add-sphere': () => this.addObject('SphereGeometry'), 'add-cylinder': () => this.addObject('CylinderGeometry'), 'add-light': () => this.addObject('DirectionalLight'),
      'toggle-view': () => this.toggleView(), 'view-persp': () => this.setCameraView('perspective'), 'view-front': () => this.setCameraView('front'), 'view-side': () => this.setCameraView('side'), 'view-top': () => this.setCameraView('top'),
      grid: () => $('#grid-toggle').click(), wireframe: () => this.toggleWireframe(), save: () => this.saveProject(), open: () => $('#file-input').click(), 'export-project': () => this.exportProject(), 'export-asset-package': () => this.exportAssetPackage(), 'export-overrides': () => this.exportOverrides(),
      'export-glb': () => this.exportGlb(), 'export-obj': () => this.exportObj(), screenshot: () => this.screenshot(), rescan: () => this.loadCatalog(true), 'reload-game': () => { this.frame.contentWindow.location.reload(); },
      'agent-open': () => this.agentPanel.open(), 'agent-local': () => this.setAgentProvider('local'), 'agent-mcp': () => this.setAgentProvider('mcp'), 'agent-openai': () => this.setAgentProvider('openai'), 'agent-openrouter': () => this.setAgentProvider('openrouter'), 'agent-anthropic': () => this.setAgentProvider('anthropic'),
      new: () => this.newProject(), about: () => alert('cadJS\nStandalone Three.js CAD workspace for Michi-Neko.\nAll editor files and saved data remain separate from the game source.') };
    map[action]?.();
  }

  onKey(event) {
    if (/INPUT|SELECT|TEXTAREA/.test(event.target.tagName)) return;
    const key = event.key.toLowerCase();
    if (key === 'tab') { event.preventDefault(); return this.toggleView(); }
    if ((event.ctrlKey || event.metaKey) && key === 'z') { event.preventDefault(); return event.shiftKey ? this.history.redo() : this.history.undo(); }
    if ((event.ctrlKey || event.metaKey) && (key === 'y')) { event.preventDefault(); return this.history.redo(); }
    if ((event.ctrlKey || event.metaKey) && key === 'd') { event.preventDefault(); return this.duplicateSelected(); }
    if (key === 'delete' || key === 'backspace') return this.deleteSelected();
    if (key === 'a') return this.agentPanel.toggle();
    if (key.startsWith('arrow')) { event.preventDefault(); return event.shiftKey ? this.panCamera(key) : this.zoomCamera(key === 'arrowup' || key === 'arrowright' ? -1 : 1); }
    const tools = { q:'select', w:'translate', e:'rotate', r:'scale' }; if (tools[key]) return this.setTool(tools[key]);
    if (key === 'f') return this.focusObject(this.selected); if (key === 'i') return this.toggleIsolation();
    if (key === 'g') return $('#grid-toggle').click(); if (key === 'x') return this.toggleWireframe();
    const views = { '1':'perspective','2':'front','3':'side','4':'top' }; if (views[key]) this.setCameraView(views[key]);
  }

  setAgentProvider(provider) {
    $('#agent-provider').value = provider; $('#agent-provider').dispatchEvent(new Event('change')); this.agentPanel.open();
  }

  zoomCamera(direction) {
    const offset = this.camera.position.clone().sub(this.orbit.target); const distance = offset.length(); const next = Math.max(.05, Math.min(1000, distance * (direction < 0 ? .88 : 1.14)));
    this.camera.position.copy(this.orbit.target).add(offset.setLength(next)); this.orbit.update(); this.status(direction < 0 ? 'CAMERA ZOOM IN' : 'CAMERA ZOOM OUT');
  }

  panCamera(key) {
    const distance = this.camera.position.distanceTo(this.orbit.target); const amount = Math.max(.01, distance * .035);
    const forward = this.orbit.target.clone().sub(this.camera.position).normalize(); const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize(); const up = this.camera.up.clone().normalize();
    const delta = key === 'arrowleft' ? right.multiplyScalar(-amount) : key === 'arrowright' ? right.multiplyScalar(amount) : key === 'arrowup' ? up.multiplyScalar(amount) : up.multiplyScalar(-amount);
    this.camera.position.add(delta); this.orbit.target.add(delta); this.orbit.update();
  }

  serializeProject() {
    return {
      format: 'cadJS-project', version: 1, savedAt: new Date().toISOString(),
      scene: this.root.toJSON(), camera: { position: this.camera.position.toArray(), target: this.orbit.target.toArray() },
      settings: { background: `#${this.scene.background.getHexString()}`, grid: this.grid.visible, snap: !!this.snap },
      runtimeOverrides: [...this.runtimeOverrides.values()], assetBaselines: Object.fromEntries(this.assetBaselines), lastAssetPackage: this.lastAssetPackage
    };
  }

  saveProject() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.serializeProject())); this.status('PROJECT SAVED TO BROWSER'); }
  exportProject() { download(`michi-neko-${Date.now()}.cadjs.json`, JSON.stringify(this.serializeProject(), null, 2)); }
  exportOverrides() { download(`michi-neko-${Date.now()}.overrides.json`, JSON.stringify({ format: 'cadJS-overrides', version: 1, overrides: [...this.runtimeOverrides.values()] }, null, 2)); }

  exportAssetPackage() {
    try {
      const root = this.ensureAssetRoot(); const assetId = root.userData.cadAssetId; const baseline = this.assetBaselines.get(assetId);
      const packageVersion = prompt('Asset package version (semantic versioning)', this.lastAssetPackage?.assetId === assetId ? this.lastAssetPackage.packageVersion : '0.1.0');
      if (packageVersion == null) return;
      const notes = prompt('Describe this asset revision', '') ?? '';
      const changes = this.packageChanges(root);
      const assetPackage = createAssetPackage({
        assetId, packageVersion, assetType:root.userData.cadAssetType,
        source:{ module:root.userData.cadSourceModule || root.userData.sourceModule || '', symbol:root.userData.cadSourceSymbol || '', baselineFingerprint:baseline.baselineFingerprint },
        parentPackage:this.lastAssetPackage?.assetId === assetId ? { version:this.lastAssetPackage.packageVersion, checksum:this.lastAssetPackage.checksum } : null,
        changes:{ objects:changes }, metadata:{ notes }
      });
      validateAssetPackage(assetPackage); this.lastAssetPackage = { assetId, packageVersion:assetPackage.packageVersion, checksum:assetPackage.checksum };
      download(`${assetId}-${assetPackage.packageVersion}.cadasset.json`, JSON.stringify(assetPackage, null, 2));
      this.status(`ASSET PACKAGE ${assetPackage.packageVersion}: ${Object.keys(changes).length} OBJECT CHANGES`); this.refreshInspector();
    } catch (error) { this.status(`ASSET PACKAGE: ${error.message}`, true); }
  }

  rebaseAsset() {
    try {
      const root = this.ensureAssetRoot();
      if (!confirm(`Capture the current ${root.userData.cadAssetId} design as a new package baseline?\n\nExisting packages from the old baseline will become incompatible.`)) return;
      this.registerAsset(root, { assetId:root.userData.cadAssetId, assetType:root.userData.cadAssetType, sourceModule:root.userData.cadSourceModule, sourceSymbol:root.userData.cadSourceSymbol });
      this.lastAssetPackage = null; this.refreshInspector(); this.status('NEW ASSET BASELINE CAPTURED');
    } catch (error) { this.status(`ASSET BASELINE: ${error.message}`, true); }
  }

  registerSelectedAsset() {
    try {
      const root = this.assetRootFor(this.selected); if (!root) throw new Error('Select an editor asset first');
      const suggested = normalizeAssetId(`asset.${objectLabel(root)}`);
      const assetId = prompt('Stable asset ID', suggested); if (assetId == null) return;
      this.registerAsset(root, { assetId }); this.select(root); this.status(`ASSET REGISTERED: ${root.userData.cadAssetId}`);
    } catch (error) { this.status(`ASSET REGISTRATION: ${error.message}`, true); }
  }

  async loadAssetPackage(input) {
    const assetPackage = validateAssetPackage(input); const root = this.findAssetRoot(assetPackage.assetId);
    const baseline = root ? this.assetBaselines.get(assetPackage.assetId) : null;
    const compatibility = evaluateAssetCompatibility(assetPackage, { assetId:root?.userData?.cadAssetId, baselineFingerprint:baseline?.baselineFingerprint });
    if (!compatibility.compatible) throw new Error(compatibility.issues.join('; '));
    const objects = this.assetObjects(root); const missing = Object.keys(assetPackage.changes.objects).filter((id) => !objects[id]);
    if (missing.length) throw new Error(`Package objects are missing from the loaded asset: ${missing.slice(0, 3).join(', ')}`);
    const typeMismatches = Object.entries(assetPackage.changes.objects).filter(([id, state]) => state.type && state.type !== objects[id].type).map(([id]) => id);
    if (typeMismatches.length) throw new Error(`Package object types do not match the loaded asset: ${typeMismatches.slice(0, 3).join(', ')}`);
    const count = compatibility.objectCount;
    if (!confirm(`Apply ${assetPackage.assetId} package ${assetPackage.packageVersion}?\n\n${count} semantic object change${count === 1 ? '' : 's'}\nChecksum: ${assetPackage.checksum}\n\nThis is reversible with Undo.`)) return;
    const before = {}; for (const id of Object.keys(assetPackage.changes.objects)) before[id] = serializeAssetObject(objects[id]);
    for (const [id, state] of Object.entries(assetPackage.changes.objects)) await applyAssetObjectState(objects[id], state, this.textureLoader);
    const after = {}; for (const id of Object.keys(assetPackage.changes.objects)) after[id] = serializeAssetObject(objects[id]);
    const applyStates = async (states) => { for (const [id, state] of Object.entries(states)) await applyAssetObjectState(objects[id], state, this.textureLoader); this.refreshInspector(); this.rebuildTree(); };
    this.history.push(`Asset ${assetPackage.packageVersion}`, () => applyStates(before), () => applyStates(after));
    this.lastAssetPackage = { assetId:assetPackage.assetId, packageVersion:assetPackage.packageVersion, checksum:assetPackage.checksum };
    this.select(root); this.status(`ASSET PACKAGE ${assetPackage.packageVersion} APPLIED: ${count} OBJECTS`);
  }

  async openFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'json') { try { const data = JSON.parse(await file.text()); if (data.format === ASSET_PACKAGE_FORMAT) await this.loadAssetPackage(data); else this.loadProject(data); } catch (error) { this.status(`OPEN: ${error.message}`, true); } }
    else this.loadModelFile(file);
    $('#file-input').value = '';
  }

  loadProject(project) {
    if (project.format === 'cadJS-overrides') { this.runtimeOverrides = new Map((project.overrides || []).map((item) => [fingerprintDescriptor({ source:'game', path:item.path }), item])); this.applyRuntimeOverrides(); return; }
    if (project.format !== 'cadJS-project' || !project.scene) throw new Error('Not a cadJS project');
    const loader = new THREE.ObjectLoader(); const loaded = loader.parse(project.scene);
    this.transform.detach(); while (this.root.children.length) this.root.remove(this.root.children[0]);
    for (const child of [...loaded.children]) this.root.add(child);
    if (project.camera?.position) this.camera.position.fromArray(project.camera.position); if (project.camera?.target) this.orbit.target.fromArray(project.camera.target);
    this.grid.visible = project.settings?.grid !== false; this.runtimeOverrides = new Map((project.runtimeOverrides || []).map((item) => [fingerprintDescriptor({ source:'game', path:item.path }), item]));
    this.assetBaselines = new Map(Object.entries(project.assetBaselines || {})); this.lastAssetPackage = project.lastAssetPackage || null;
    if (!this.assetBaselines.size) this.root.children.filter((child) => child.userData?.cadAssetId).forEach((child) => this.registerAsset(child, { assetId:child.userData.cadAssetId, assetType:child.userData.cadAssetType, sourceModule:child.userData.cadSourceModule, sourceSymbol:child.userData.cadSourceSymbol }));
    this.select(null); this.rebuildTree(); this.status('PROJECT LOADED');
  }

  newProject() { if (!confirm('Clear the current CAD workspace?')) return; this.transform.detach(); while (this.root.children.length) this.root.remove(this.root.children[0]); this.runtimeOverrides.clear(); this.assetBaselines.clear(); this.lastAssetPackage = null; this.addStarterScene(); this.rebuildTree(); }

  applyRuntimeOverrides() {
    const root = this.runtimeGame?.scene; if (!root) return this.status('GAME SCENE NOT READY', true);
    let applied = 0; for (const item of this.runtimeOverrides.values()) { const object = findByPath(root, item.path); if (object) { applySnapshot(object, item.state); applied++; } }
    this.status(`${applied} RUNTIME OVERRIDES APPLIED`); this.rebuildTree();
  }

  async loadModelUrl(url) {
    const ext = url.split('.').pop().split('?')[0].toLowerCase();
    try {
      let object;
      if (ext === 'glb' || ext === 'gltf') object = (await new GLTFLoader().loadAsync(url)).scene;
      else if (ext === 'obj') object = await new OBJLoader().loadAsync(url);
      else if (ext === 'stl') { const geometry = await new STLLoader().loadAsync(url); object = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x8aa5b3, roughness: .7 })); }
      if (!object) return this.status(`MODEL FORMAT .${ext} IS CATALOGUED BUT NOT PREVIEWABLE`, true);
      object.name ||= url.split('/').pop(); this.root.add(object); this.select(object); this.focusObject(object); this.status(`MODEL LOADED: ${object.name}`);
    } catch (error) { this.status(`MODEL LOAD: ${error.message}`, true); }
  }

  loadModelFile(file) { const url = URL.createObjectURL(file); this.loadModelUrl(url).finally(() => setTimeout(() => URL.revokeObjectURL(url), 2000)); }
  exportGlb() { const object = this.selected || this.root; new GLTFExporter().parse(object, (result) => download('cadjs-selection.glb', result, 'model/gltf-binary'), (error) => this.status(error.message, true), { binary: true, onlyVisible: false }); }
  exportObj() { const result = new OBJExporter().parse(this.selected || this.root); download('cadjs-selection.obj', result, 'text/plain'); }
  screenshot() { this.renderer.render(this.scene, this.camera); this.canvas.toBlob((blob) => blob && download('cadjs-viewport.png', blob, 'image/png')); }

  resize() { const rect = this.editorView.getBoundingClientRect(); if (!rect.width || !rect.height) return; this.renderer.setSize(rect.width, rect.height, false); this.camera.aspect = rect.width / rect.height; this.camera.updateProjectionMatrix(); }
  status(message, error = false) { const element = $('#status-message'); element.textContent = message; element.style.color = error ? 'var(--danger)' : ''; }
  updateStatus() { $('#status-message').textContent = `UNDO ${this.history.undoStack.length} / REDO ${this.history.redoStack.length}`; }

  animate() {
    requestAnimationFrame(() => this.animate()); const dt = Math.min(.05, this.clock.getDelta()); this.orbit.update();
    if (this.viewMode === 'editor') this.renderer.render(this.scene, this.camera);
    this.frames++; const now = performance.now(); if (now - this.fpsTime > 500) { $('#render-stats').textContent = `${Math.round(this.frames * 1000 / (now - this.fpsTime))} FPS`; this.frames = 0; this.fpsTime = now; }
  }
}

new CadApp();