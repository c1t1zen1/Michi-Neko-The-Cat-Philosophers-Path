// A small accumulator for timber-and-stone construction (promoted from the
// `Parts` class of labs/water/js/bridges.js): boxes, posts, beams between two
// points, lathes and extruded sections, baked per material key into ONE
// indexed geometry with position / normal / uv only, so the meshes merge
// with the valley's MAT statics (no colour attribute: a colour attribute
// would split the merge). UVs are in metres (the classic box() helper's
// worldScaleBoxUVs), so MAT's 256 px wood and stone textures keep their scale.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { worldScaleBoxUVs } from '../../textures.js?v=20261113a';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1);
const _up = new THREE.Vector3(0, 1, 0), _dir = new THREE.Vector3(), _mid = new THREE.Vector3();

function clean(g) {
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
  return g;
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Flat-shaded convex solid from planar polygon faces ({ p: [[x,y,z]…], uv }), each turned to face away from the centroid. */
function solid(faces) {
  const all = faces.flatMap((f) => f.p);
  const c = all.reduce((s, q) => [s[0] + q[0], s[1] + q[1], s[2] + q[2]], [0, 0, 0]).map((v) => v / all.length);
  const pos = [], uv = [], idx = [];
  for (const f of faces) {
    let p = f.p, t = f.uv;
    const fc = p.reduce((s, q) => [s[0] + q[0], s[1] + q[1], s[2] + q[2]], [0, 0, 0]).map((v) => v / p.length);
    let nrm = [0, 0, 0];
    for (let i = 1; i < p.length - 1; i++) { const k = cross(sub(p[i], p[0]), sub(p[i + 1], p[0])); nrm = [nrm[0] + k[0], nrm[1] + k[1], nrm[2] + k[2]]; }
    if (dot(nrm, sub(fc, c)) < 0) { p = p.slice().reverse(); t = t.slice().reverse(); }
    const base = pos.length / 3;
    p.forEach((q, i) => { pos.push(q[0], q[1], q[2]); uv.push(t[i][0], t[i][1]); });
    for (let i = 1; i < p.length - 1; i++) idx.push(base, base + i, base + i + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export class Parts {
  constructor() { this.m = new Map(); }
  put(key, g, matrix) {
    if (matrix) g.applyMatrix4(matrix);
    clean(g);
    if (!this.m.has(key)) this.m.set(key, []);
    this.m.get(key).push(g);
    return g;
  }
  at(x, y, z, rx = 0, ry = 0, rz = 0) { _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); return _m.compose(_p.set(x, y, z), _q, _one); }
  /** A w × h × d box centred at (x, y, z). */
  box(key, w, h, d, x, y, z, { rx = 0, ry = 0, rz = 0 } = {}) {
    const g = worldScaleBoxUVs(new THREE.BoxGeometry(w, h, d), 1);
    return this.put(key, g, this.at(x, y, z, rx, ry, rz));
  }
  /** A round post from (x, y0, z) to (x, y1, z). */
  post(key, r, x, y0, y1, z, seg = 10) {
    const h = y1 - y0;
    const g = new THREE.CylinderGeometry(r, r, h, seg, 1);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * 2 * r, uv.getY(i) * h);
    return this.put(key, g, this.at(x, (y0 + y1) / 2, z));
  }
  /** A square-section member from a to b (Vector3s), w × h. */
  between(key, a, b, w, h = w) {
    _dir.subVectors(b, a);
    const len = _dir.length();
    if (len < 1e-4) return null;
    _dir.multiplyScalar(1 / len);
    const g = worldScaleBoxUVs(new THREE.BoxGeometry(w, len, h), 1);
    _q.setFromUnitVectors(_up, _dir);
    _mid.addVectors(a, b).multiplyScalar(0.5);
    return this.put(key, g, _m.compose(_mid, _q, _one));
  }
  /** A lathe of [r, y] points around (x, y, z). */
  lathe(key, pts, x, y, z, seg = 16) {
    const g = new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg);
    return this.put(key, g, this.at(x, y, z));
  }
  /**
   * A convex closed section (points [a, y] in the x–y plane) swept straight
   * along z from z0 to z1 at x offset `x`; faces are flat-shaded and turned
   * outward.
   */
  extrudeZ(key, section, x, z0, z1) {
    const n = section.length, faces = [];
    const len = z1 - z0;
    for (let i = 0; i < n; i++) {
      const [ax, ay] = section[i], [bx, by] = section[(i + 1) % n];
      const el = Math.hypot(bx - ax, by - ay);
      faces.push({ p: [[x + ax, ay, z0], [x + bx, by, z0], [x + bx, by, z1], [x + ax, ay, z1]], uv: [[0, 0], [el, 0], [el, len], [0, len]] });
    }
    for (const z of [z0, z1]) faces.push({ p: section.map(([a, y]) => [x + a, y, z]), uv: section.map(([a, y]) => [a, y]) });
    return this.put(key, solid(faces), null);
  }
  /** A convex hexahedron from 8 corners (0-3 the bottom ring, 4-7 the top above them), e.g. a sloped wall. */
  hexa(key, c) {
    const rings = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
    const faces = rings.map((f) => {
      const p = f.map((i) => c[i]);
      const a = p[0], ux = sub(p[1], a), vx = sub(p[p.length - 1], a);
      const lu = Math.hypot(...ux) || 1, lv = Math.hypot(...vx) || 1;
      return { p, uv: p.map((q) => { const r = sub(q, a); return [dot(r, ux) / lu, dot(r, vx) / lv]; }) };
    });
    return this.put(key, solid(faces), null);
  }
  /** One merged geometry for a key (null when empty); the pieces are disposed. */
  geometry(key) {
    const list = this.m.get(key);
    if (!list || !list.length) return null;
    const g = mergeGeometries(list);
    for (const x of list) x.dispose();
    this.m.delete(key);
    if (g) { g.computeBoundingSphere(); g.computeBoundingBox(); }
    return g;
  }
  /** A mesh for a key on `material` (shadows on), or null. */
  mesh(key, material) {
    const g = this.geometry(key);
    if (!g) return null;
    const mesh = new THREE.Mesh(g, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
  /** Drop whatever was not turned into a mesh. */
  dispose() { for (const list of this.m.values()) for (const g of list) g.dispose(); this.m.clear(); }
}
