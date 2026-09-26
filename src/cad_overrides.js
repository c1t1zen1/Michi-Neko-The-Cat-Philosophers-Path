import * as THREE from 'three';

// Applies design overrides authored in cadJS ("Push to game" publishes
// cad-overrides.json at the repo root). Keyed by object name — the stable
// names assigned throughout the builders are the lookup keys. Missing file
// or unmatched names are skipped silently so the game never depends on cadJS.

const OVERRIDES_URL = 'cad-overrides.json';
const OVERRIDES_FORMAT = 'michi-neko-cad-overrides';

function arrayType(name) {
  return {
    Float32Array, Float64Array, Int8Array, Uint8Array, Uint8ClampedArray,
    Int16Array, Int32Array, Uint32Array
  }[name] || Float32Array;
}

function parseAttribute(data) {
  if (!data) return null;
  return new THREE.BufferAttribute(new (arrayType(data.arrayType))(data.values || []), Number(data.itemSize || 1), !!data.normalized);
}

function parseGeometry(data) {
  if (!data) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.type = data.type || 'BufferGeometry';
  geometry.name = data.name || '';
  if (data.index) geometry.setIndex(parseAttribute(data.index));
  for (const [name, attribute] of Object.entries(data.attributes || {})) {
    const parsed = parseAttribute(attribute);
    if (parsed) geometry.setAttribute(name, parsed);
  }
  for (const group of data.groups || []) geometry.addGroup(group.start, group.count, group.materialIndex || 0);
  if (data.drawRange) geometry.setDrawRange(data.drawRange.start || 0, data.drawRange.count == null ? Infinity : data.drawRange.count);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

// Mirror of cadJS applySnapshot — transform, visibility, render flags,
// scalar material fields, and CAD-authored texture maps. Never adds,
// removes or reparents objects.
const textureCache = new Map();

async function loadOverrideTexture(map) {
  if (!textureCache.has(map.dataUrl)) {
    const base = await new THREE.TextureLoader().loadAsync(map.dataUrl);
    base.name = map.name || 'CAD texture';
    textureCache.set(map.dataUrl, base);
  }
  const texture = textureCache.get(map.dataUrl).clone();
  if (map.repeat) texture.repeat.fromArray(map.repeat);
  if (map.offset) texture.offset.fromArray(map.offset);
  texture.center.set(.5, .5);
  texture.rotation = map.rotation || 0;
  if (map.wrapS !== undefined) texture.wrapS = map.wrapS;
  if (map.wrapT !== undefined) texture.wrapT = map.wrapT;
  if (map.flipY !== undefined) texture.flipY = map.flipY;
  if (map.colorSpace !== undefined) texture.colorSpace = map.colorSpace;
  texture.needsUpdate = true;
  return texture;
}

async function applyState(object, state) {
  if (!object || !state) return;
  if (state.position && object.position) object.position.fromArray(state.position);
  if (state.rotation && object.rotation) object.rotation.set(state.rotation[0], state.rotation[1], state.rotation[2], state.rotation[3] || 'XYZ');
  if (state.scale && object.scale) object.scale.fromArray(state.scale);
  for (const key of ['visible', 'name', 'renderOrder', 'castShadow', 'receiveShadow', 'frustumCulled']) {
    if (state[key] !== undefined) object[key] = state[key];
  }
  const materials = Array.isArray(object.material) ? object.material : [object.material];
  for (const material of materials.filter(Boolean)) {
    const m = state.material;
    if (!m) continue;
    if (m.color !== undefined && material.color) material.color.setHex(m.color);
    if (m.emissive !== undefined && material.emissive) material.emissive.setHex(m.emissive);
    for (const key of ['roughness', 'metalness', 'opacity', 'transparent', 'wireframe', 'flatShading', 'emissiveIntensity', 'side', 'depthWrite', 'depthTest']) {
      if (m[key] !== undefined && key in material) material[key] = m[key];
    }
    if (m.map && m.map.dataUrl) {
      try { material.map = await loadOverrideTexture(m.map); }
      catch { /* undecodable data URL — keep the built-in map */ }
    }
    material.needsUpdate = true;
  }
}

function resolveByName(scene, name) {
  let found = null;
  scene.traverse((object) => { if (!found && object.name === name) found = object; });
  return found;
}

// rel is a dot-joined child-index path below the named root ("0.2.1").
function resolveChild(root, rel) {
  let node = root;
  for (const part of String(rel).split('.')) {
    node = node?.children?.[Number(part)];
    if (!node) return null;
  }
  return node;
}

export async function applyCadOverrides(scene) {
  let doc = null;
  try {
    const response = await fetch(OVERRIDES_URL, { cache: 'no-store' });
    if (response.ok) doc = await response.json();
  } catch { /* no file or static host without it — fine */ }
  if (doc?.format !== OVERRIDES_FORMAT || !Array.isArray(doc.overrides)) return;
  let applied = 0;
  for (const entry of doc.overrides) {
    const root = entry.name ? resolveByName(scene, entry.name) : null;
    if (!root) continue;
    for (const node of entry.nodes || []) {
      const target = node.rel ? resolveChild(root, node.rel) : root;
      if (!target) continue;
      await applyState(target, node.state);
      if (node.geometry && target.geometry) target.geometry = parseGeometry(node.geometry);
    }
    applied++;
  }
  if (applied) console.info(`[cadJS] ${applied} published override${applied === 1 ? '' : 's'} applied`);
}
