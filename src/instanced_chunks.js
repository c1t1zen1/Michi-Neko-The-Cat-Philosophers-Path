import * as THREE from 'three';

/**
 * Split wide instanced meshes into spatial chunks so frustum culling works.
 *
 * The valley's vegetation is drawn as a handful of large InstancedMeshes —
 * one per forest variant, per bush kind, per bamboo grove. Three culls an
 * InstancedMesh as a single unit against the bounding sphere of *all* its
 * instances, so a forest ring 40 m out resolves to one ~65 m sphere centred
 * on the village: it intersects the frustum from anywhere in the valley and
 * every instance is submitted, in every direction the cat can face.
 *
 * Measured before this pass: 30 sets with a cull radius over 60 m carrying
 * 2.2 M triangles — two thirds of the entire scene — drawn whichever way the
 * camera pointed. The grass already avoids this by building one mesh per
 * chunk; this does the same thing for everything else, after the fact.
 *
 * Chunk geometries share the source's vertex buffers (three keys its GPU
 * uploads on the attribute object, so the base mesh is uploaded once no
 * matter how many chunks reference it); only the per-instance data is
 * actually split.
 */

/** Triangles a whole instanced set submits when it is drawn. */
function setTriangles(mesh) {
  const g = mesh.geometry;
  const perInstance = (g.index ? g.index.count : g.attributes.position.count) / 3;
  return perInstance * mesh.count;
}

/**
 * Meshes that own per-instance state at runtime must not be split, and sets
 * too light to matter must not be either: every chunk is another draw call,
 * so splitting a few hundred triangles of moss trades real driver overhead
 * for a saving too small to measure.
 */
function isChunkable(mesh, minRadius, minCount, minTriangles) {
  if (!mesh.isInstancedMesh) return false;
  // frustumCulled === false marks the systems that animate their instances
  // every frame (the scent trail); they are deliberately never culled.
  if (mesh.frustumCulled === false) return false;
  if (mesh.userData && mesh.userData.noChunk) return false;
  if (mesh.count < minCount) return false;
  if (setTriangles(mesh) < minTriangles) return false;
  if (mesh.boundingSphere === null || mesh.boundingSphere === undefined) mesh.computeBoundingSphere();
  return !!mesh.boundingSphere && mesh.boundingSphere.radius > minRadius;
}

/**
 * Build a geometry that reuses `src`'s vertex data but carries its own
 * per-instance attributes, taken from `indices`.
 */
function chunkGeometry(src, indices) {
  const geo = new THREE.BufferGeometry();
  if (src.index) geo.setIndex(src.index);
  for (const name of Object.keys(src.attributes)) {
    const attr = src.attributes[name];
    if (attr.isInstancedBufferAttribute) {
      const size = attr.itemSize;
      const out = new attr.array.constructor(indices.length * size);
      for (let i = 0; i < indices.length; i++) {
        const from = indices[i] * size;
        for (let k = 0; k < size; k++) out[i * size + k] = attr.array[from + k];
      }
      geo.setAttribute(name, new THREE.InstancedBufferAttribute(out, size, attr.normalized));
    } else {
      // Shared with the source: same BufferAttribute object, one GPU upload.
      geo.setAttribute(name, attr);
    }
  }
  for (const name of Object.keys(src.morphAttributes || {})) {
    geo.morphAttributes[name] = src.morphAttributes[name];
  }
  if (src.boundingSphere) geo.boundingSphere = src.boundingSphere.clone();
  if (src.boundingBox) geo.boundingBox = src.boundingBox.clone();
  geo.groups = src.groups.map(g => ({ ...g }));
  return geo;
}

/**
 * Replace `mesh` in its parent with one InstancedMesh per occupied cell.
 * Returns the number of chunks created (0 when the mesh was left alone).
 */
export function chunkInstancedMesh(mesh, cell) {
  const parent = mesh.parent;
  if (!parent) return 0;

  // Bucket instance indices by the cell their translation falls in.
  const buckets = new Map();
  const m = new THREE.Matrix4();
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, m);
    const cx = Math.floor(m.elements[12] / cell);
    const cz = Math.floor(m.elements[14] / cell);
    const key = cx + ':' + cz;
    let b = buckets.get(key);
    if (!b) { b = []; buckets.set(key, b); }
    b.push(i);
  }
  if (buckets.size < 2) return 0;

  const created = [];
  for (const indices of buckets.values()) {
    const geo = chunkGeometry(mesh.geometry, indices);
    const chunk = new THREE.InstancedMesh(geo, mesh.material, indices.length);
    for (let i = 0; i < indices.length; i++) {
      mesh.getMatrixAt(indices[i], m);
      chunk.setMatrixAt(i, m);
    }
    chunk.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      const c = new THREE.Color();
      for (let i = 0; i < indices.length; i++) {
        mesh.getColorAt(indices[i], c);
        chunk.setColorAt(i, c);
      }
      chunk.instanceColor.needsUpdate = true;
    }
    chunk.castShadow = mesh.castShadow;
    chunk.receiveShadow = mesh.receiveShadow;
    chunk.renderOrder = mesh.renderOrder;
    chunk.visible = mesh.visible;
    chunk.name = mesh.name;
    chunk.userData = { ...mesh.userData, chunkOf: mesh.name || 'instanced' };
    if (mesh.customDepthMaterial) chunk.customDepthMaterial = mesh.customDepthMaterial;
    if (mesh.customDistanceMaterial) chunk.customDistanceMaterial = mesh.customDistanceMaterial;
    chunk.position.copy(mesh.position);
    chunk.quaternion.copy(mesh.quaternion);
    chunk.scale.copy(mesh.scale);
    chunk.updateMatrix();
    chunk.computeBoundingSphere();
    created.push(chunk);
  }

  parent.remove(mesh);
  for (const c of created) parent.add(c);
  // The source geometry's vertex buffers live on in the chunks, so only the
  // per-instance arrays are dropped here.
  mesh.dispose();
  return created.length;
}

/**
 * Walk the scene and chunk every instanced mesh whose instances are spread
 * wider than `minRadius`. Safe to call once, after the world has built.
 */
export function chunkSceneInstances(scene, { cell = 24, minRadius = 40, minCount = 12, minTriangles = 40000 } = {}) {
  const targets = [];
  scene.traverse((o) => { if (isChunkable(o, minRadius, minCount, minTriangles)) targets.push(o); });
  let chunks = 0, split = 0;
  for (const mesh of targets) {
    const n = chunkInstancedMesh(mesh, cell);
    if (n > 0) { chunks += n; split++; }
  }
  return { split, chunks };
}
