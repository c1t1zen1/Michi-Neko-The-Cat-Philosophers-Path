// pieces/common.js — geometry helpers every Roof Road piece builds with.
//
// Each piece is built in its own rail frame (frameGroup): local x along the
// rail (s − sMid), y up, z toward the camera (depth d). box() and cyl() are
// the painted primitives; ribbon() follows the rail; mergeByMaterial() bakes
// static meshes one per material and 32 m cell, as Countryside._mergeStatics()
// does in the valley. Moved verbatim from build.js (r1-roof-split).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { worldScaleBoxUVs } from '../../../src/textures.js?v=20261113a';

const UP = new THREE.Vector3(0, 1, 0);
const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ */
/*  Geometry helpers                                                    */
/* ------------------------------------------------------------------ */

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (!(mat.userData && mat.userData.panel)) worldScaleBoxUVs(g, 1);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  return m;
}

const paperCapMaterial = new THREE.MeshStandardMaterial({ color: 0x2d261e, roughness: .85 });
function cyl(r, len, mat, axis = 'y', seg = 10) {
  const paper = mat.userData.paper;
  const g = paper ? new THREE.LatheGeometry([[-.5,.7],[-.42,.94],[-.25,1],[.25,1],[.42,.94],[.5,.7]].map(([y,w]) => new THREE.Vector2(r * w, len * y)), seg) : new THREE.CylinderGeometry(r, r, len, seg);
  if (axis === 'x') g.rotateZ(Math.PI / 2);
  if (axis === 'z') g.rotateX(Math.PI / 2);
  const mesh = new THREE.Mesh(g, mat);
  if (paper) for (const sign of [-1,1]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * .74, r * .74, len * .065, seg), paperCapMaterial);
    if (axis === 'x') { cap.rotation.z = Math.PI / 2; cap.position.x = sign * len * .5; }
    else if (axis === 'z') { cap.rotation.x = Math.PI / 2; cap.position.z = sign * len * .5; }
    else cap.position.y = sign * len * .5;
    mesh.add(cap);
  }
  return mesh;
}

/**
 * A tiled slope. `eave` is the low edge's midpoint; the slope rises `rise`
 * over `run` toward the ridge, opposite to `yaw` (the down-slope heading:
 * 0 = +z, π = −z, π/2 = +x, −π/2 = −x). `width` runs along the eave.
 */
function slope(g, mat, eave, rise, run, width, yaw, thick = 0.12) {
  const dx = Math.sin(yaw), dz = Math.cos(yaw);
  const len = Math.hypot(run, rise);
  const b = box(width, thick, len + 0.04, mat);
  b.position.set(eave.x - dx * run / 2, eave.y + rise / 2, eave.z - dz * run / 2);
  b.rotation.set(Math.atan2(rise, run), yaw, 0, 'YXZ');
  g.add(b);
  return b;
}

function triangle(mat, ax, ay, az, bx, by, bz, cx, cy, cz) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([ax, ay, az, bx, by, bz, cx, cy, cz], 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([az, ay, bz, by, cz, cy].map((v) => v * 0.45), 2));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

/* ------------------------------------------------------------------ */
/*  Frames on the rail                                                  */
/* ------------------------------------------------------------------ */

function frameGroup(rail, s) {
  const g = new THREE.Group();
  const p = rail.pointAt(s), t = rail.tangentAt(s);
  g.position.set(p.x, 0, p.z);
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(t.x, 0, t.z), UP, new THREE.Vector3(-t.z, 0, t.x));
  g.quaternion.setFromRotationMatrix(m);
  return g;
}

/** A flat ribbon following the rail between depths dA and dB at height y. */
function ribbon(rail, s0, s1, dA, dB, y, mat, uv = 1) {
  const pos = [], uvs = [], idx = [];
  const step = 0.5;
  const n = Math.max(1, Math.ceil((s1 - s0) / step));
  const p = { x: 0, z: 0 };
  for (let i = 0; i <= n; i++) {
    const s = s0 + ((s1 - s0) * i) / n;
    for (const d of [dA, dB]) {
      rail.place(s, d, p);
      pos.push(p.x, y, p.z);
      uvs.push(s * uv, d * uv);
    }
    if (i < n) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // Make sure the face points up whichever way the rail turns.
  const nrm = geo.attributes.normal;
  if (nrm.getY(0) < 0) {
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    geo.setIndex(idx);
    geo.computeVertexNormals();
  }
  return new THREE.Mesh(geo, mat);
}

/* ------------------------------------------------------------------ */
/*  Merging                                                             */
/* ------------------------------------------------------------------ */

function mergeByMaterial(group, castShadow = true) {
  group.updateMatrixWorld(true);
  const buckets = new Map();
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return;
    let geo = o.geometry.clone();
    geo.applyMatrix4(o.matrixWorld);
    if (geo.index) geo = geo.toNonIndexed();
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((geo.attributes.position.count) * 2), 2));
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    geo.computeBoundingBox();
    const center = geo.boundingBox.getCenter(new THREE.Vector3());
    // Spatial material batches keep a kilometre of streets out of each draw.
    const key = o.material.uuid + ':' + Math.floor(center.x / 32) + ':' + Math.floor(center.z / 32);
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, geos: [] });
    buckets.get(key).geos.push(geo);
  });
  const out = new THREE.Group();
  for (const { mat, geos } of buckets.values()) {
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = castShadow && !mat.transparent;
    m.receiveShadow = true;
    merged.computeBoundingSphere();
    m.userData.spatialBatch = true;
    out.add(m);
    for (const geo of geos) geo.dispose();
  }
  return out;
}

export { UP, TAU, box, paperCapMaterial, cyl, slope, triangle, frameGroup, ribbon, mergeByMaterial };
