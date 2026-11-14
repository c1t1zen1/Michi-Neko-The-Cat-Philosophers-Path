import * as THREE from 'three';

// Applies design overrides authored in cadJS ("Push to game" publishes
// cad-overrides.json at the repo root). Keyed by object name — the stable
// names assigned throughout the builders are the lookup keys. Missing file
// or unmatched names are skipped silently so the game never depends on cadJS.

const OVERRIDES_URL = 'cad-overrides.json';
const OVERRIDES_FORMAT = 'michi-neko-cad-overrides';

// Same table as cadJS/src/app.mjs (Uint16Array was missing here, so a
// published Uint16 index came back as a float index and nothing drew).
function arrayType(name) {
  return {
    Float32Array, Float64Array, Int8Array, Uint8Array, Uint8ClampedArray,
    Int16Array, Uint16Array, Int32Array, Uint32Array
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

// rel is a dot-joined child-index path below the named root ("0.2.1"). It
// never descends into a kit asset group (userData.asset): a kit tree is
// addressed by part name, its child order is not an interface.
function resolveChild(root, rel) {
  if (root.userData?.asset) return null;
  let node = root;
  for (const part of String(rel).split('.')) {
    node = node?.children?.[Number(part)];
    if (!node) return null;
    if (node.userData?.asset) return null;
  }
  return node;
}

// Kit assets (BUILD_GUIDE_FABLE §3.3) name their parts `asset:<id>/<part>`.
// A node may address one by `part` ("kasagi", or the full "asset:torii/kasagi");
// the id comes from the root group (userData.asset.id, or its `asset:<id>` name).
function resolvePart(root, part) {
  const wanted = String(part);
  const id = root.userData?.asset?.id ?? (root.name?.startsWith('asset:') ? root.name.slice(6) : null);
  const full = wanted.includes('/') ? wanted : (id ? `asset:${id}/${wanted}` : null);
  let found = null;
  root.traverse((object) => { if (!found && object !== root && full && object.name === full) found = object; });
  return found;
}

// A node that names a kit part resolves by that name only: an unknown part
// is skipped (never the root, never a child-index guess). A node without a
// part keeps the classic child-index path, so an override file authored
// against the classic tree applies exactly as before.
function resolveTarget(root, node) {
  if (node.part) {
    const byPart = resolvePart(root, node.part);
    return byPart ? { target: byPart } : { skipped: `part '${node.part}' not found` };
  }
  if (!node.rel) return { target: root };
  const byIndex = resolveChild(root, node.rel);
  return byIndex ? { target: byIndex } : { skipped: `path '${node.rel}' not found (kit groups are addressed by part)` };
}

/** The root an entry addresses: its classic `name`, else the kit group `asset:<entry.asset>`. */
function resolveRoot(scene, entry) {
  return (entry.name ? resolveByName(scene, entry.name) : null) ||
    (entry.asset ? resolveByName(scene, `asset:${entry.asset}`) : null);
}

/**
 * Apply a parsed override document to a scene. Returns the number of entries
 * with at least one node applied. A node whose `part` does not exist is
 * skipped with one warning (`warn`, default console.warn).
 */
export async function applyOverridesDoc(scene, doc, { warn = (m) => console.warn(m) } = {}) {
  if (doc?.format !== OVERRIDES_FORMAT || !Array.isArray(doc.overrides)) return 0;
  let applied = 0;
  const warned = new Set();
  for (const entry of doc.overrides) {
    const root = resolveRoot(scene, entry);
    if (!root) continue;
    let hits = 0;
    for (const node of entry.nodes || []) {
      const { target, skipped } = resolveTarget(root, node);
      if (!target) {
        const key = `${entry.name || entry.asset}:${skipped}`;
        if (node.part && !warned.has(key)) { warned.add(key); warn(`[cadJS] override for '${entry.name || entry.asset}' skipped: ${skipped}`); }
        continue;
      }
      await applyState(target, node.state);
      if (node.geometry && target.geometry) target.geometry = parseGeometry(node.geometry);
      hits++;
    }
    if (hits) applied++;
  }
  return applied;
}

export async function applyCadOverrides(scene) {
  let doc = null;
  try {
    const response = await fetch(OVERRIDES_URL, { cache: 'no-store' });
    if (response.ok) doc = await response.json();
  } catch { /* no file or static host without it — fine */ }
  const applied = await applyOverridesDoc(scene, doc);
  if (applied) console.info(`[cadJS] ${applied} published override${applied === 1 ? '' : 's'} applied`);
}
