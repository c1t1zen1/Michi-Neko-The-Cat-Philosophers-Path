// The land round the tower, laid out like Higashiyama: a temple precinct
// on a rise, a street of machiya running downhill toward the viewer, a
// wooded ridge behind, a hill to the east for Michi's perch, the city basin
// to the west and three mountain ranges that the air turns blue. Everything
// is instanced or one mesh; every lit surface wears the same air patch, so
// distance does the painting.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { patchAir, addPatch } from './air.js';
import { rng, smooth, clamp, cloudTexture, Bag, UNIT } from './util.js';
import { FX_LAYER } from './finish.js';
import { HASH, NOISE } from '../../shared/glsl.js';

export const PERCH_DIR = new THREE.Vector3(0.94, 0, 0.34).normalize();
// the game's bridge sees the tower across a meadow and the edge forest
export const VALLEY_DIR = new THREE.Vector3(-0.97, 0, 0.24).normalize();
const frame = (x, z, d) => [x * d.x + z * d.z, -x * d.z + z * d.x];
/** The perch's view lane and the valley meadow stay clear of houses and trees. */
export function clearLane(x, z, extra = 0) {
  const [a, l] = frame(x, z, PERCH_DIR), [va, vl] = frame(x, z, VALLEY_DIR);
  return (a > 24 && Math.abs(l) < 9 + extra + a * (0.035 + extra * 0.001)) || (va > 36 && va < 1400 && Math.abs(vl) < 60 + va * 0.25);
}
export const SEASONS = {
  spring: { name: 'Spring', jp: '春', ground: 0x86ad55, field: 0x93b85e, hill: 0x3f6a34, leaf: [0x6f9a45, 0xe8b8c4, 0xf2cad3, 0x87b25a], ever: 0x35572c, snow: 0, haze: 1.35 },
  summer: { name: 'Summer', jp: '夏', ground: 0x6f9a42, field: 0x7aa34a, hill: 0x2f5a28, leaf: [0x3f7a32, 0x4c8a3a, 0x5a9440, 0x37702e], ever: 0x2b4f26, snow: 0, haze: 1.15 },
  autumn: { name: 'Autumn', jp: '秋', ground: 0x8e9450, field: 0xb59a58, hill: 0x4c5a2e, leaf: [0xc8452a, 0xe07a2e, 0xe9b33d, 0x9c3a26], ever: 0x2f4f2a, snow: 0, haze: 0.85 },
  winter: { name: 'Winter', jp: '冬', ground: 0xdfe4e8, field: 0xe6eaee, hill: 0x8a9488, leaf: [0x7a6a5a, 0x8a7b6a, 0x6e6052, 0x9a8c7c], ever: 0x3a5236, snow: 1, haze: 0.7 }
};

export function heightAt(x, z) {
  const r = Math.hypot(x, z);
  let h = 2.0 * (1 - smooth(32, 75, r));
  h -= 0.04 * Math.max(0, z - 25) * smooth(20, 120, z);
  const back = Math.max(0, -z - 150);
  h += Math.pow(back, 1.15) * 0.075 * (0.8 + 0.2 * Math.sin(x * 0.0035));
  const [along, lat] = frame(x, z, PERCH_DIR);
  // convex, so every chord from the perch down to the tower clears the slope
  h += 0.0055 * Math.pow(Math.max(0, along - 40), 1.5) * Math.exp(-Math.pow(lat / (170 + Math.max(0, along) * 0.35), 2));
  h += smooth(70, 160, r) * 1.2 * Math.sin(x * 0.013 + 1.3) * Math.sin(z * 0.011 + 0.4);
  h += smooth(2600, 6000, r) * 140;
  return h;
}

function zoneOf(x, z) {
  const r = Math.hypot(x, z);
  if (Math.abs(x) < 31 && Math.abs(z) < 31) return 'precinct';
  if (Math.abs(x) < 6.5 && z > 25 && z < 700) return 'street';
  const lift = heightAt(x, z) - (2.0 * (1 - smooth(32, 75, r)) - 0.04 * Math.max(0, z - 25) * smooth(20, 120, z));
  const [va, vl] = frame(x, z, VALLEY_DIR);
  if (va > 36 && va < 1400 && Math.abs(vl) < 60 + va * 0.25 && lift < 9) return 'field';
  if (lift > 9) return 'hill';
  if (r < 720) return 'town';
  return 'field';
}

const lumpy = (detail) => {
  const ico = new THREE.IcosahedronGeometry(1, detail);
  ico.deleteAttribute('normal'); ico.deleteAttribute('uv');
  const g = mergeVertices(ico), p = g.attributes.position, R = rng(9);
  const bumps = Array.from({ length: 7 }, () => [new THREE.Vector3(R() - 0.5, R() * 0.6, R() - 0.5).normalize(), 0.12 + R() * 0.18]);
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    let s = 1;
    for (const [d, a] of bumps) s += a * Math.max(0, v.dot(d)) ** 3;
    p.setXYZ(i, v.x * s, v.y * s * 0.82 + 0.15, v.z * s);
  }
  g.computeVertexNormals();
  return g;
};
const blobGeo = lumpy(1), blobGeo0 = lumpy(0);
const pineGeo = (() => {
  const B = new Bag();
  for (const [y, r, h] of [[0.25, 1.0, 0.28], [0.62, 0.78, 0.24], [0.92, 0.5, 0.22]]) B.add(UNIT.sphere, { y, sx: r, sy: h, sz: r * 0.9 });
  B.cyl(0.07, 0.5, { y: 0.0, color: 0x5a4434 });
  const g = B.geometry();
  g.deleteAttribute('color');
  return g;
})();
const roofGeo = (() => {
  // gable prism over a unit footprint: ridge along local z, eaves past the walls
  const g = new THREE.BufferGeometry();
  const o = 0.12, w = 0.5 + o, d = 0.5 + o * 0.6;
  const v = [-w, 0, -d, w, 0, -d, 0, 1, -d, -w, 0, d, w, 0, d, 0, 1, d];
  const idx = [0, 2, 1, 3, 4, 5, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 4, 0, 1, 4, 0, 4, 3];
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex(idx);
  const ng = g.toNonIndexed(); ng.computeVertexNormals();
  return ng;
})();

export class World {
  constructor(scene, air, { season = 'autumn' } = {}) {
    this.scene = scene;
    this.air = air;
    this.root = new THREE.Group();
    this.root.name = 'World';
    scene.add(this.root);
    this.uNight = { value: 0 };
    this.uSnow = { value: 0 };
    this._terrain();
    this._precinct();
    this._town();
    this._trees();
    this._ranges();
    this._sky();
    this._perch();
    this._forestArc();
    this.setSeason(season);
  }

  _mat(params, opts) { return patchAir(new THREE.MeshLambertMaterial(params), this.air, opts); }
  /** Leaf masses: Voronoi clumps darken toward their edges, like painted foliage. */
  _leafMat() {
    return addPatch(this._mat({}), 'leaves', (sh) => {
      sh.fragmentShader = HASH + NOISE + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec3 vo = voronoi2(vAirWorld.xz * 0.95 + vAirWorld.yy * 0.8);
          float clump = smoothstep(0.05, 0.85, vo.x);
          diffuseColor.rgb *= 0.72 + 0.4 * (1.0 - clump) + 0.14 * (vo.z - 0.5);
        }`);
    });
  }

  _terrain() {
    const rings = [0], seg = 168;
    while (rings[rings.length - 1] < 7400) rings.push(rings.length * 2.4 + Math.pow(1.073, rings.length) - 1);
    const pos = [], idx = [];
    for (let i = 0; i < rings.length; i++) for (let j = 0; j < seg; j++) {
      const a = (j / seg) * Math.PI * 2, r = rings[i], x = Math.cos(a) * r, z = Math.sin(a) * r;
      pos.push(x, heightAt(x, z) - (zoneOf(x, z) === 'town' ? 0.1 : 0), z);
    }
    for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < seg; j++) {
      const a = i * seg + j, b = i * seg + ((j + 1) % seg), c = a + seg, d = b + seg;
      idx.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(pos.length), 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    this.terrainGeo = g;
    const mat = this._mat({ vertexColors: true });
    addPatch(mat, 'ground', (sh) => {
      sh.uniforms.uSnow = this.uSnow;
      sh.vertexShader = 'varying vec3 vGW;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvGW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = `varying vec3 vGW; uniform float uSnow;\n${HASH}\n${NOISE}\n` + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float gn = fbm2(vGW.xz * 0.045, 4);
        diffuseColor.rgb *= 0.82 + 0.34 * gn;
        diffuseColor.rgb *= 0.94 + 0.12 * vnoise2(vGW.xz * 0.6);`);
    });
    this.terrain = new THREE.Mesh(g, mat);
    this.terrain.receiveShadow = true;
    this.terrain.name = 'Terrain';
    this.root.add(this.terrain);
  }

  _paintTerrain(S) {
    const g = this.terrainGeo, p = g.attributes.position, c = g.attributes.color, col = new THREE.Color(), R = rng(3);
    const C = {
      precinct: new THREE.Color(S.snow ? 0xedf0f3 : 0xcfc7b4), street: new THREE.Color(S.snow ? 0xd6dade : 0x9a9287),
      town: new THREE.Color(S.snow ? 0xc9ced2 : 0x56514a), hill: new THREE.Color(S.hill), field: new THREE.Color(S.field), ground: new THREE.Color(S.ground)
    };
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), zone = zoneOf(x, z);
      col.copy(C[zone] || C.ground);
      if (zone === 'town') col.lerp(C.ground, 0.06 + R() * 0.08);
      if (zone === 'field' && Math.hypot(x, z) > 2400) col.lerp(C.hill, smooth(2400, 4200, Math.hypot(x, z)));
      c.setXYZ(i, col.r, col.g, col.b);
    }
    c.needsUpdate = true;
  }

  _precinct() {
    // tsuiji: a rammed-earth wall with a tiled coping round the temple ground
    const B = new Bag(), T = new Bag(), half = 33, th = 1.1, h = 2.6;
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2, nx = Math.sin(a), nz = Math.cos(a);
      for (const [from, to] of k === 0 ? [[-half, -5], [5, half]] : [[-half, half]]) {
        const len = to - from, mid = (from + to) / 2;
        const x = nx * half + Math.cos(a) * mid, z = nz * half - Math.sin(a) * mid, y0 = heightAt(x, z);
        B.box(len, h, th, { x, y: y0 + h / 2 - 0.3, z, ry: a, color: 0xd9c9a3 });
        B.box(len, 0.12, th * 0.6, { x, y: y0 + h * 0.62, z, ry: a, color: 0xf1ebdc });
        T.add(roofGeo, { x, y: y0 + h - 0.3, z, ry: a + Math.PI / 2, sx: th * 2.0, sy: 0.55, sz: len + 0.3, color: 0x3d4448 });
      }
    }
    // a small gate (mon) in the street side
    const gy = heightAt(0, half);
    for (const sx of [-1, 1]) B.cyl(0.22, 4.2, { x: sx * 2.6, y: gy + 2.1, z: half, color: 0x3c2c22 });
    B.box(6.4, 0.4, 0.5, { x: 0, y: gy + 3.9, z: half, color: 0x3c2c22 });
    T.add(roofGeo, { x: 0, y: gy + 4.1, z: half, sx: 7.6, sy: 1.5, sz: 3.2, color: 0x363d42 });
    const m1 = new THREE.Mesh(B.geometry(), this._mat({ vertexColors: true }));
    const m2 = new THREE.Mesh(T.geometry(), this._mat({ vertexColors: true }));
    for (const m of [m1, m2]) { m.castShadow = m.receiveShadow = true; this.root.add(m); }
    // stone lanterns along the approach
    const L = new Bag();
    for (const z of [10, 17, 24]) for (const sx of [-1, 1]) {
      const y = heightAt(sx * 3.4, z);
      L.box(0.5, 0.9, 0.5, { x: sx * 3.4, y: y + 0.45, z, color: 0xa8a49a });
      L.box(0.8, 0.5, 0.8, { x: sx * 3.4, y: y + 1.15, z, color: 0xb8b4aa });
      L.add(roofGeo, { x: sx * 3.4, y: y + 1.4, z, sx: 1.1, sy: 0.45, sz: 1.1, color: 0x9a968c });
    }
    this.lanterns = new THREE.Mesh(L.geometry(), this._mat({ vertexColors: true }));
    this.root.add(this.lanterns);
  }

  _town() {
    const R = rng(21), bodies = [], roofs = [];
    const add = (x, z, w, d, h, ry, tone) => {
      const y = heightAt(x, z);
      bodies.push({ x, y, z, w, d, h, ry, tone });
      roofs.push({ x, y: y + h, z, w, d, rh: 1.3 + R() * 0.9, ry });
    };
    // machiya rows facing the street, tight frontages running downhill
    for (const sx of [-1, 1]) {
      for (let z = 38; z < 640;) {
        const w = 5 + R() * 2.5, d = 10 + R() * 4, h = 5.2 + R() * 2.4;
        if (R() > 0.08) add(sx * (7 + d / 2), z + w / 2, d, w, h, 0, R());
        z += w + 0.3;
      }
    }
    // the rest of the city on a jittered grid
    for (let gx = -720; gx <= 720; gx += 13) for (let gz = -720; gz <= 720; gz += 17) {
      const x = gx + (R() - 0.5) * 4, z = gz + (R() - 0.5) * 5, r = Math.hypot(x, z);
      if (r < 42 || r > 720 || (Math.abs(x) < 22 && z > 25)) continue;
      if (zoneOf(x, z) !== 'town' || clearLane(x, z) || R() < smooth(380, 720, r) * 0.55) continue;
      const along = R() > 0.5, w = 9 + R() * 3, d = 12 + R() * 4, h = 4.4 + R() * (r < 200 ? 3.2 : 2.2);
      add(x, z, along ? w : d, along ? d : w, h, along ? 0 : Math.PI / 2, R());
    }
    const n = bodies.length, o = new THREE.Object3D(), col = new THREE.Color();
    const bodyMat = this._mat({});
    // machiya fronts from the box's own local coordinates: a dark koshi
    // lattice ground storey, timber posts on plaster above, mushiko windows,
    // and lamplight through the lattice at night
    addPatch(bodyMat, 'machiya', (sh) => {
      sh.uniforms.uNight = this.uNight;
      sh.vertexShader = 'varying vec3 vLocal, vScale; varying float vSeed;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vLocal = position;
        vScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vSeed = fract(sin(float(gl_InstanceID) * 12.9898) * 43758.5453);`);
      sh.fragmentShader = 'varying vec3 vLocal, vScale; varying float vSeed; uniform float uNight;\n' + sh.fragmentShader
        .replace('#include <color_fragment>', `#include <color_fragment>
          float mAx = abs(vLocal.x), mAz = abs(vLocal.z);
          float mSide = step(0.495, max(mAx, mAz));
          float mAlong = mAx > mAz ? vLocal.z * vScale.z : vLocal.x * vScale.x;
          float mG = (vLocal.y + 0.5) * vScale.y - 0.4;
          float mLower = 1.0 - smoothstep(2.6, 2.75, mG);
          float mSlat = smoothstep(0.35, 0.5, abs(fract(mAlong / 0.14) - 0.5) * 2.0);
          mSlat = mix(mSlat, 0.45, smoothstep(0.25, 0.7, fwidth(mAlong / 0.14)));
          vec3 mLattice = mix(vec3(0.12, 0.085, 0.065), vec3(0.3, 0.2, 0.13), mSlat);
          float mPost = 1.0 - smoothstep(0.05, 0.09, abs(fract(mAlong / 1.8) - 0.5) * 1.8);
          vec3 mUpper = mix(diffuseColor.rgb, vec3(0.2, 0.14, 0.1), mPost * 0.85);
          float mMushi = step(3.5, mG) * step(mG, 4.3) * step(0.32, abs(fract(mAlong / 2.4) - 0.5) * 2.0);
          mUpper = mix(mUpper, vec3(0.15, 0.12, 0.1), mMushi * 0.75);
          diffuseColor.rgb = mix(diffuseColor.rgb, mix(mUpper, mLattice, mLower), mSide);`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          totalEmissiveRadiance += vec3(1.0, 0.6, 0.28) * uNight * mSide * (mLower * (1.0 - mSlat) * step(0.35, vSeed) * 0.55 + mMushi * step(0.6, vSeed) * 0.3) * step(0.4, mG);`);
    });
    const BI = new THREE.InstancedMesh(UNIT.box, bodyMat, n), RI = new THREE.InstancedMesh(roofGeo, this._mat({}), n);
    const near = bodies.filter((b) => Math.hypot(b.x, b.z) < 460);
    const HI = new THREE.InstancedMesh(UNIT.box, this._mat({}), near.length * 2);
    bodies.forEach((b, i) => {
      o.position.set(b.x, b.y + b.h / 2 - 0.4, b.z); o.rotation.set(0, b.ry, 0); o.scale.set(b.w, b.h + 0.8, b.d); o.updateMatrix();
      BI.setMatrixAt(i, o.matrix);
      BI.setColorAt(i, col.set(b.tone < 0.4 ? 0x5a4636 : b.tone < 0.82 ? 0xe2d9c6 : 0x9a7656));
      const r = roofs[i];
      o.position.set(r.x, r.y - 0.05, r.z); o.scale.set(r.w * 1.02, r.rh, r.d * 1.02); o.updateMatrix();
      RI.setMatrixAt(i, o.matrix);
      RI.setColorAt(i, col.setHSL(0.58 + (R() - 0.5) * 0.04, 0.08 + R() * 0.06, 0.24 + R() * 0.08));
    });
    // hisashi: the lower eave along both long sides, at the top of the ground storey
    const e = new THREE.Euler(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3(), m4 = new THREE.Matrix4();
    near.forEach((b, i) => {
      for (const s of [-1, 1]) {
        const off = new THREE.Vector3(s * (b.w / 2 + 0.4), 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), b.ry);
        pos.set(b.x + off.x, b.y + 2.85, b.z + off.z);
        q.setFromEuler(e.set(0, b.ry, -s * 0.38));
        m4.compose(pos, q, scl.set(1.0, 0.09, b.d + 0.2));
        HI.setMatrixAt(i * 2 + (s > 0 ? 1 : 0), m4);
        HI.setColorAt(i * 2 + (s > 0 ? 1 : 0), col.setHSL(0.58, 0.08, 0.25));
      }
    });
    this.hisashi = HI;
    this.root.add(HI);
    for (const m of [BI, RI, HI]) { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; m.receiveShadow = true; m.computeBoundingSphere(); if (m !== HI) this.root.add(m); }
    this.houses = { bodies: BI, roofs: RI, count: n };
    this.roofColors = RI.instanceColor.array.slice();
  }

  _trees() {
    // temple trees cast shadows; the town's and the near hills' are rounder
    // blobs; the far forest is 20-triangle lumps the air will flatten anyway
    const R = rng(33), temple = [], near = [], far = [], pines = [];
    for (const [x, z, s] of [[-22, -20, 7], [21, -23, 8], [-25, 12, 6], [24, 15, 6.5], [-14, -26, 5.5], [12, 26, 5], [-26, -4, 6], [26, -6, 5.5]]) temple.push({ x, z, s, kind: 'leaf' });
    for (const [x, z, s] of [[-18, 22, 6], [18, -14, 7], [-27, 26, 5.5], [27, 27, 6], [9, -27, 5]]) pines.push({ x, z, s });
    for (let gx = -2600; gx <= 2600; gx += 30) for (let gz = -2600; gz <= 2600; gz += 30) {
      const x = gx + (R() - 0.5) * 22, z = gz + (R() - 0.5) * 22, r = Math.hypot(x, z);
      if (zoneOf(x, z) !== 'hill' || clearLane(x, z, 24) || R() < 0.15) continue;
      const f = smooth(900, 2600, r);
      if (R() < f * 0.5) continue;
      (r < 1100 ? near : far).push({ x, z, s: 9 + R() * 7 + f * 14, kind: R() < 0.55 ? 'ever' : 'leaf' });
    }
    for (let i = 0; i < 260; i++) {
      const x = (R() - 0.5) * 1300, z = (R() - 0.5) * 1300;
      if (zoneOf(x, z) !== 'town' || clearLane(x, z) || Math.hypot(x, z) < 45 || (Math.abs(x) < 15 && z > 20)) continue;
      near.push({ x, z, s: 4 + R() * 3, kind: 'leaf' });
    }
    const o = new THREE.Object3D();
    const mk = (geo, list, name, shadow) => {
      const m = new THREE.InstancedMesh(geo, this._leafMat(), list.length);
      list.forEach((t, i) => {
        const y = heightAt(t.x, t.z);
        o.position.set(t.x, y + (name === 'Pines' ? 0.4 : t.s * 0.35), t.z);
        o.rotation.set(0, R() * 6.28, 0);
        o.scale.set(t.s * (0.8 + R() * 0.4), t.s * (name === 'Pines' ? 0.9 : 0.85 + R() * 0.3), t.s * (0.8 + R() * 0.4));
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
        m.setColorAt(i, new THREE.Color(0x2f5a28));
      });
      m.instanceMatrix.needsUpdate = true;
      m.name = name;
      m.castShadow = shadow;
      m.userData.trees = list;
      m.computeBoundingSphere();
      this.root.add(m);
      return m;
    };
    this.treeMeshes = [mk(blobGeo, temple, 'Temple trees', true), mk(blobGeo, near, 'Trees', false), mk(blobGeo0, far, 'Far forest', false)];
    this.pines = mk(pineGeo, pines, 'Pines', true);
  }

  _ranges() {
    this.ranges = [];
    const R = rng(51);
    for (const [rad, h0, h1, col] of [[3500, 170, 360, 0x355a34], [5000, 280, 560, 0x34503a], [6900, 420, 760, 0x3a4a44]]) {
      const seg = 360, pos = [], cols = [], idx = [], c0 = new THREE.Color(col), c1 = new THREE.Color(col).multiplyScalar(1.25);
      const ph = [R() * 6, R() * 6, R() * 6, R() * 6];
      for (let j = 0; j <= seg; j++) {
        const a = (j / seg) * Math.PI * 2;
        const ridge = 0.5 + 0.28 * Math.sin(a * 3 + ph[0]) + 0.16 * Math.sin(a * 7 + ph[1]) + 0.08 * Math.sin(a * 17 + ph[2]) + 0.04 * Math.sin(a * 41 + ph[3]);
        const top = h0 + (h1 - h0) * ridge, x = Math.cos(a) * rad, z = Math.sin(a) * rad;
        pos.push(x, -60, z, x * 0.985, top, z * 0.985);
        cols.push(c0.r, c0.g, c0.b, c1.r, c1.g, c1.b);
      }
      for (let j = 0; j < seg; j++) { const a = j * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, this._mat({ vertexColors: true, side: THREE.DoubleSide }));
      m.name = 'Range';
      this.root.add(m);
      this.ranges.push(m);
    }
  }

  _sky() {
    // painted clouds: billboards far out, lit by the hour, drawn in the fx layer
    this.clouds = [];
    const R = rng(71);
    this.cloudU = { uSun: { value: new THREE.Color() }, uBelly: { value: new THREE.Color() }, uSky: { value: new THREE.Color() }, uOpacity: { value: 0.9 } };
    for (let i = 0; i < 14; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: { tMap: { value: cloudTexture(1 + (i % 4)) }, ...this.cloudU },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform sampler2D tMap; uniform vec3 uSun, uBelly, uSky; uniform float uOpacity; varying vec2 vUv;
          void main(){ vec4 t = texture2D(tMap, vUv); vec3 c = mix(uBelly, uSun, smoothstep(0.15, 0.85, vUv.y));
          c = mix(c, uSky, 0.25); gl_FragColor = vec4(c, t.a * uOpacity);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          }`,
        transparent: true, depthWrite: false, fog: false
      });
      const w = 900 + R() * 900, m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.5), mat);
      const a = R() * Math.PI * 2, r = 2600 + R() * 2600;
      m.position.set(Math.cos(a) * r, 650 + R() * 900, Math.sin(a) * r);
      m.layers.set(FX_LAYER);
      m.renderOrder = -5;
      m.userData.drift = 2 + R() * 4;
      this.root.add(m);
      this.clouds.push(m);
    }
    // stars and a moon for the night
    const sp = [], Rs = rng(91);
    for (let i = 0; i < 900; i++) {
      const u = Rs() * 2 - 1, a = Rs() * Math.PI * 2, y = Math.abs(u) * 0.95 + 0.05, r = Math.sqrt(1 - y * y);
      sp.push(Math.cos(a) * r * 8000, y * 8000, Math.sin(a) * r * 8000);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xfff6e8, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    this.stars.layers.set(FX_LAYER);
    this.stars.frustumCulled = false;
    this.root.add(this.stars);
    const mc = document.createElement('canvas'); mc.width = mc.height = 64;
    const x = mc.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, '#fffbe8'); gr.addColorStop(0.42, '#fff4d6'); gr.addColorStop(0.5, 'rgba(255,240,200,0.35)'); gr.addColorStop(1, 'rgba(255,240,200,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    const mt = new THREE.CanvasTexture(mc); mt.colorSpace = THREE.SRGBColorSpace;
    this.moon = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), new THREE.MeshBasicMaterial({ map: mt, transparent: true, depthWrite: false, fog: false }));
    this.moon.layers.set(FX_LAYER);
    this.root.add(this.moon);
  }

  _perch() {
    // a short length of garden wall for Michi to sit on
    const B = new Bag(), T = new Bag();
    B.box(5.5, 1.15, 0.7, { y: 0.575 - 0.3, color: 0xcdbd98 });
    B.box(5.5, 0.12, 0.45, { y: 0.55, color: 0xefe6d2 });
    T.add(roofGeo, { y: 0.85, ry: Math.PI / 2, sx: 1.05, sy: 0.32, sz: 5.8, color: 0x6c7378 });
    this.perch = new THREE.Group();
    // an ishigaki terrace lifts the wall a few metres above the slope
    const st = new Bag();
    st.box(7.5, 1, 4.6, { y: -0.5, color: 0x9d988c });
    this.terrace = new THREE.Mesh(st.geometry(), this._mat({ vertexColors: true }));
    this.perch.add(this.terrace);
    this.perch.add(new THREE.Mesh(B.geometry(), this._mat({ vertexColors: true })));
    this.perch.add(new THREE.Mesh(T.geometry(), this._mat({ vertexColors: true })));
    this.perch.traverse((m) => { if (m.isMesh) m.receiveShadow = m.castShadow = true; });
    this.perch.name = 'Perch';
    this.perchTop = 1.0;
    this.root.add(this.perch);
  }

  _forestArc() {
    // the valley's edge forest (src/countryside.js buildEdgeForest), between the bridge and the tower
    const n = 90;
    this.arc = new THREE.InstancedMesh(blobGeo, this._leafMat(), n);
    this.arc.name = 'Edge forest';
    this.arc.visible = false;
    const R = rng(77);
    this.arcSeed = Array.from({ length: n }, () => [R(), R(), R(), R()]);
    for (let i = 0; i < n; i++) this.arc.setColorAt(i, new THREE.Color().setHSL(0.28 + (R() - 0.5) * 0.06, 0.45, 0.22 + R() * 0.1));
    this.arc.frustumCulled = false;
    this.root.add(this.arc);
  }

  /** Place the edge forest as in the game: 0.23–0.35 of the way from tower to viewer. */
  placeArc(camPos, H) {
    const o = new THREE.Object3D(), d = Math.hypot(camPos.x, camPos.z), dir = Math.atan2(camPos.x, camPos.z);
    this.arcSeed.forEach(([a, b, c, e], i) => {
      const row = i % 3, ang = dir + (a - 0.5) * 1.6, r = d * (0.24 + row * 0.05) + (b - 0.5) * 2;
      const x = Math.sin(ang) * r, z = Math.cos(ang) * r, s = H * (0.08 + c * 0.07);
      o.position.set(x, heightAt(x, z) + s * 0.3, z); o.rotation.set(0, e * 6.3, 0); o.scale.set(s * 0.75, s, s * 0.75); o.updateMatrix();
      this.arc.setMatrixAt(i, o.matrix);
    });
    this.arc.instanceMatrix.needsUpdate = true;
  }

  setSeason(key) {
    const S = SEASONS[key] || SEASONS.autumn;
    this.season = key;
    this._paintTerrain(S);
    const R = rng(5), c = new THREE.Color();
    for (const m of this.treeMeshes) {
      m.userData.trees.forEach((t, i) => {
        if (t.kind === 'ever') c.set(S.ever).multiplyScalar(0.85 + R() * 0.3);
        else c.set(S.leaf[Math.floor(R() * S.leaf.length)]).multiplyScalar(0.85 + R() * 0.25);
        if (S.snow) c.lerp(new THREE.Color(0xe8edf2), 0.25 + R() * 0.2);
        m.setColorAt(i, c);
      });
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    for (let i = 0; i < this.pines.count; i++) this.pines.setColorAt(i, c.set(S.ever).lerp(new THREE.Color(0xe8edf2), S.snow ? 0.3 : 0));
    this.pines.instanceColor.needsUpdate = true;
    const rc = this.houses.roofs.instanceColor.array;
    for (let i = 0; i < rc.length; i += 3) {
      const k = S.snow ? 0.55 + R() * 0.2 : 0;
      rc[i] = this.roofColors[i] * (1 - k) + 0.88 * k; rc[i + 1] = this.roofColors[i + 1] * (1 - k) + 0.9 * k; rc[i + 2] = this.roofColors[i + 2] * (1 - k) + 0.94 * k;
    }
    this.houses.roofs.instanceColor.needsUpdate = true;
    this.uSnow.value = S.snow;
    this.haze = S.haze;
    return S;
  }

  setPerch(d) {
    const p = PERCH_DIR.clone().multiplyScalar(d);
    const ground = heightAt(p.x, p.z), lift = d > 40 ? 6 : 0;
    p.y = ground + lift;
    this.terrace.scale.y = lift + 3;
    this.terrace.position.y = 0;
    this.perch.position.copy(p);
    this.perch.rotation.y = Math.atan2(PERCH_DIR.x, PERCH_DIR.z) + Math.PI / 2;
    return p.clone().setY(p.y + this.perchTop);
  }

  /** Per frame: the dome, clouds, stars and moon follow the camera. */
  update(camera, rig, t) {
    const night = clamp((-rig.sunDir.y + 0.04) / 0.16, 0, 1);
    this.uNight.value = night;
    if (rig.dome) {
      rig.dome.position.copy(camera.position);
      rig.dome.scale.setScalar((camera.far * 0.92) / 400);
    }
    const U = this.cloudU;
    U.uSun.value.copy(rig.palette.sun).lerp(new THREE.Color(1, 1, 1), 0.45).multiplyScalar(0.6 + 0.9 * (1 - night) * clamp(rig.sun.intensity / 2, 0.2, 1));
    U.uBelly.value.copy(rig.palette.skyTop).lerp(rig.palette.horizon, 0.5).multiplyScalar(0.62 * (1 - night * 0.7) + 0.05);
    U.uSky.value.copy(rig.palette.horizon);
    U.uOpacity.value = 0.85 - night * 0.35;
    for (const c of this.clouds) {
      c.rotation.set(0, Math.atan2(camera.position.x - c.position.x, camera.position.z - c.position.z), 0);
      c.position.x += c.userData.drift * 0.016;
      if (c.position.x > 6000) c.position.x = -6000;
    }
    this.stars.position.copy(camera.position);
    this.stars.material.opacity = night * 0.85;
    this.moon.visible = night > 0.02;
    if (this.moon.visible) {
      this.moon.position.copy(rig.moon.position).normalize().multiplyScalar(7000).add(camera.position);
      this.moon.lookAt(camera.position);
    }
  }
}
