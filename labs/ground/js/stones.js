// Real stones: StoneLOD swaps the shader's painted setts and cobbles for
// instanced stones near the cat, at exactly the same cells (shared hash);
// SteppingStones lays tobi-ishi that the cat can step up onto.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { stoneTextures } from '../../shared/game.js';
import { SETT, COB, hash2i, vnoise, settColor, settHeight, cobPoint, cobColor, cobHeight } from './hash.js';
import { BAYER } from './material.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color();
const UPV = new THREE.Vector3(0, 1, 0);

function pebbleGeometry() {
  const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + (vnoise(x * 1.7 + 5, z * 1.7 + y * 1.3) - 0.5) * 0.35;
    p.setXYZ(i, x * k, y * k * 0.42, z * k);
  }
  g.computeVertexNormals();
  return g;
}

export function makeRock(r = 0.5) {
  const g = new THREE.IcosahedronGeometry(1, 4), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + (vnoise(x * 1.3 + 3, y * 1.3 + z * 1.1) - 0.5) * 0.55 + (vnoise(x * 4, z * 4 + y * 3) - 0.5) * 0.08;
    p.setXYZ(i, x * k * 1.25, Math.max(y * k * 0.75, -0.25), z * k);
  }
  g.computeVertexNormals();
  const t = stoneTextures(0x8d8d86);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughness: 0.9 }));
  m.scale.setScalar(r); m.castShadow = m.receiveShadow = true;
  return m;
}

export class StoneLOD {
  constructor(terrain, groundMat, { radius = 2.4, band = 0.6, capSetts = 1200, capCob = 2000 } = {}) {
    Object.assign(this, { terrain, radius, band, capSetts, capCob });
    this.uStone = groundMat.userData.u.uStone;
    this.cobble = groundMat.userData.u.uCobble;
    this.group = new THREE.Group();
    const patch = (mat) => {
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uStone = this.uStone;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLW;').replace('#include <project_vertex>', '#include <project_vertex>\nvLW = (modelMatrix * instanceMatrix * vec4(transformed, 1.)).xyz;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nuniform vec4 uStone; varying vec3 vLW;\n${BAYER}`)
          .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (bayer4(gl_FragCoord.xy) >= 1. - smoothstep(uStone.z - uStone.w, uStone.z, length(vLW.xz - uStone.xy))) discard;');
      };
      mat.customProgramCacheKey = () => 'michi-stone-lod';
      return mat;
    };
    this.mat = patch(new THREE.MeshStandardMaterial({ roughness: 0.8 }));
    const sg = new RoundedBoxGeometry(SETT.w - SETT.joint, 0.04, SETT.h - SETT.joint, 3, SETT.r);
    this.setts = new THREE.InstancedMesh(sg, this.mat, capSetts);
    this.cobs = new THREE.InstancedMesh(pebbleGeometry(), this.mat, capCob);
    for (const m of [this.setts, this.cobs]) { m.frustumCulled = false; m.count = 0; m.receiveShadow = true; m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(m.instanceMatrix.count * 3), 3); this.group.add(m); }
    this.last = { x: 1e9, z: 1e9, v: -1, r: -1 };
    this.counts = { setts: 0, cobbles: 0 };
  }
  setRadius(r) { this.radius = r; this.uStone.value.z = r; this.uStone.value.w = this.band; if (r <= 0) { this.setts.count = this.cobs.count = 0; this.counts.setts = this.counts.cobbles = 0; this.last.r = -1; } }
  setWet(w) { this.mat.color.setScalar(1 - 0.17 * w); this.mat.roughness = 0.8 - 0.62 * w; }
  update(x, z) {
    const R = this.radius, t = this.terrain;
    this.uStone.value.x = x; this.uStone.value.y = z;
    if (R <= 0) return;
    const L = this.last;
    if (Math.hypot(x - L.x, z - L.z) < 0.2 && L.v === t.splatVersion && L.r === R) return;
    Object.assign(L, { x, z, v: t.splatVersion, r: R });
    // setts
    let n = 0;
    const r0 = Math.floor((z - R) / SETT.h), r1 = Math.ceil((z + R) / SETT.h);
    for (let row = r0; row <= r1 && n < this.capSetts; row++) {
      const off = (row & 1) * SETT.w * 0.5, c0 = Math.floor((x - R + off) / SETT.w), c1 = Math.ceil((x + R + off) / SETT.w);
      for (let col = c0; col <= c1 && n < this.capSetts; col++) {
        const cx = (col + 0.5) * SETT.w - off, cz = (row + 0.5) * SETT.h;
        if (Math.hypot(cx - x, cz - z) > R || Math.abs(cx) > t.size / 2 || Math.abs(cz) > t.size / 2) continue;
        if (t.layerAt(cx, cz).w[3] < 0.35) continue;
        const y = t.groundAt(cx, cz) + 0.012 * settHeight(col, row) - 0.02;
        this.setts.setMatrixAt(n, _m.makeTranslation(cx, y, cz));
        this.setts.setColorAt(n, settColor(col, row, _c));
        n++;
      }
    }
    this.setts.count = this.counts.setts = n;
    this.setts.instanceMatrix.needsUpdate = true; if (this.setts.instanceColor) this.setts.instanceColor.needsUpdate = true;
    // cobbles
    const C = this.cobble.value, cand = [];
    const n0 = Math.floor((x - R) / C) - 1, n1 = Math.ceil((x + R) / C) + 1, m0 = Math.floor((z - R) / C) - 1, m1 = Math.ceil((z + R) / C) + 1;
    for (let nz = m0; nz <= m1; nz++) for (let nx = n0; nx <= n1; nx++) {
      const p = cobPoint(nx, nz, C), d = Math.hypot(p.x - x, p.z - z);
      if (d > R || Math.abs(p.x) > t.size / 2 || Math.abs(p.z) > t.size / 2) continue;
      cand.push([d, nx, nz, p]);
    }
    cand.sort((a, b) => a[0] - b[0]);
    let k = 0;
    for (const [, nx, nz, p] of cand) {
      if (k >= this.capCob) break;
      if (t.layerAt(p.x, p.z).w[4] < 0.35) continue;
      const h = hash2i(nx + 3, nz + 9), sc = 0.45 * C * (0.9 + 0.2 * h[0]) * (0.85 + 0.15 * cobHeight(nx, nz));
      _q.setFromEuler(_e.set(0, h[1] * 6.283, 0)); _s.set(sc * 1.05, sc * 1.0, sc * 0.95);
      this.cobs.setMatrixAt(k, _m.compose(_p.set(p.x, t.groundAt(p.x, p.z) - 0.008, p.z), _q, _s));
      this.cobs.setColorAt(k, cobColor(nx, nz, _c).multiplyScalar(0.9));
      k++;
    }
    this.cobs.count = this.counts.cobbles = k;
    this.cobs.instanceMatrix.needsUpdate = true; if (this.cobs.instanceColor) this.cobs.instanceColor.needsUpdate = true;
  }
}

const STYLE = { rikyu: 0.06, oribe: 0.05, enshu: 0.03 };
export const STYLES = [{ value: 'rikyu', label: 'Rikyū · 6 cm' }, { value: 'oribe', label: 'Oribe · 5 cm' }, { value: 'enshu', label: 'Enshū · 3 cm' }];
export const PATTERNS = [
  { value: 'chokuuchi', label: 'Chokuuchi', hint: 'straight' }, { value: 'chidorigake', label: 'Chidorigake', hint: 'plover zig-zag' },
  { value: 'ganuchi', label: "Gan'uchi", hint: 'flying geese' }, { value: 'sanren', label: 'Sanren-uchi', hint: 'sets of three' }
];

function slabGeometry() {
  const pts = [];
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, r = 0.34 + 0.16 * hash2i(i * 7 + 1, 3)[0] + 0.04 * Math.sin(a * 2); pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r)); }
  const shape = new THREE.Shape(pts);
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.8, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.035, bevelSegments: 2, curveSegments: 4 });
  g.rotateX(-Math.PI / 2); g.translate(0, 0.1, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0.95) p.setY(i, p.getY(i) + 0.35 * (1 - Math.min(1, (p.getX(i) ** 2 + p.getZ(i) ** 2) / 0.2)) * 0.1);
  g.computeVertexNormals();
  return g;
}

export class SteppingStones {
  constructor(terrain, parent) {
    this.t = terrain; this.stones = [];
    const tex = stoneTextures(0x8d8d86);
    this.mat = new THREE.MeshStandardMaterial({ map: tex.map, normalMap: tex.normalMap, roughness: 0.88 });
    this.ghostMat = new THREE.MeshStandardMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.55, roughness: 1 });
    this.geo = slabGeometry();
    this.main = this._mesh(this.mat); this.ghost = this._mesh(this.ghostMat);
    parent.add(this.main, this.ghost);
    this.ghostList = [];
  }
  _mesh(mat) {
    const m = new THREE.InstancedMesh(this.geo, mat, 128);
    m.count = 0; m.frustumCulled = false; m.castShadow = m.receiveShadow = true;
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(128 * 3), 3);
    return m;
  }
  layout(pattern, from, to, style = 'oribe') {
    const out = [], dx = to.x - from.x, dz = to.z - from.z, len = Math.hypot(dx, dz) || 1, ux = dx / len, uz = dz / len, nx = -uz, nz = ux;
    const h = STYLE[style] ?? 0.05;
    let s = 0, i = 0;
    const seed = Math.round(from.x * 10) + Math.round(from.z * 7);
    while (s < len && i < 60) {
      const r = hash2i(i + seed, 77), size = 0.3 + 0.15 * r[0];
      let lat = 0, gap = 0.1;
      if (pattern === 'chidorigake') lat = (i % 2 ? 1 : -1) * 0.22;
      else if (pattern === 'ganuchi') lat = ((i % 4) - 1.5) * 0.14;
      else if (pattern === 'sanren') { const k = i % 3; lat = k === 1 ? 0.14 : k === 0 ? -0.05 : -0.05; gap = k === 2 ? 0.34 : 0.07; }
      const c = s + size / 2;
      out.push({ x: from.x + ux * c + nx * lat, z: from.z + uz * c + nz * lat, rx: size / 2 * (0.9 + 0.2 * r[1]), rz: size / 2, rot: Math.atan2(ux, uz) + (r[1] - 0.5) * 0.7, h });
      s += size + gap; i++;
    }
    const r = hash2i(i + seed, 99);
    out.push({ x: to.x, z: to.z, rx: 0.34, rz: 0.28 + 0.06 * r[0], rot: Math.atan2(ux, uz) + 0.3, h: h + 0.01 });
    return out;
  }
  lay(pattern, from, to, style) { this.add(this.layout(pattern, from, to, style)); this.preview(null); }
  add(list) {
    for (const s of list) { s.g = this.t.groundAt(s.x, s.z); this.stones.push(s); }
    this.stones.splice(0, Math.max(0, this.stones.length - 128));
    this._fill(this.main, this.stones);
    this.t.extraH = (x, z, g) => {
      let y = g;
      for (const s of this.stones) {
        const dx = x - s.x, dz = z - s.z, c = Math.cos(s.rot), sn = Math.sin(s.rot), lx = dx * c - dz * sn, lz = dx * sn + dz * c;
        if ((lx / s.rx) ** 2 + (lz / s.rz) ** 2 < 0.7) y = Math.max(y, s.g + s.h);
      }
      return y;
    };
  }
  preview(list) { this.ghostList = list || []; this._fill(this.ghost, this.ghostList, true); }
  clear() { this.stones.length = 0; this._fill(this.main, this.stones); this.preview(null); this.t.extraH = null; }
  _fill(mesh, list, ghost) {
    list.forEach((s, i) => {
      const g = ghost ? this.t.groundAt(s.x, s.z) : s.g, tot = s.h + 0.08;
      _q.setFromAxisAngle(UPV, s.rot);
      mesh.setMatrixAt(i, _m.compose(_p.set(s.x, g + s.h - tot, s.z), _q, _s.set(s.rx * 2, tot, s.rz * 2)));
      const k = 0.85 + 0.25 * hash2i(i * 3 + 1, 5)[0];
      mesh.setColorAt(i, _c.setRGB(k, k * 0.98, k * 0.95));
    });
    mesh.count = list.length; mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
  }
  setWet(w) { this.mat.color.setScalar(1 - 0.25 * w); this.mat.roughness = 0.88 - 0.55 * w; }
}
