// Things in and beside the river: kame-ishi stepping stones (turtle, plover,
// plain block), the weir sill, boulders, reeds, a stone tōrō, a willow, the
// hasakake rice rack and paddy frogs. Each builder returns meshes plus the
// solids the cat stands on and the obstacles the flow goes round.
import * as THREE from 'three';
import { stoneTextures, strawTextures, barkTextures } from '../../shared/game.js';
import { willowTexture } from './textures.js';
import { Parts } from './bridges.js';
import { ellipseSolid, rectSolid } from './physics.js';

export function propMaterials() {
  const conc = stoneTextures(0xb3ad9f, 41), granite = stoneTextures(0x8f8b83, 42), straw = strawTextures(0xc9a865), bark = barkTextures(0x5a4a3c, 0x2c2219, 43);
  const std = (o) => new THREE.MeshStandardMaterial(o);
  return {
    concrete: std({ map: conc.map, normalMap: conc.normalMap, roughness: 0.93 }),
    granite: std({ map: granite.map, normalMap: granite.normalMap, roughness: 0.9 }),
    rock: std({ map: granite.map, normalMap: granite.normalMap, color: 0xc4bfb2, roughness: 0.88 }),
    reed: std({ color: 0x7c8c4a, roughness: 0.8, side: THREE.DoubleSide }),
    straw: std({ map: straw.map, roughness: 0.9, side: THREE.DoubleSide }),
    pole: std({ color: 0x9a8a62, roughness: 0.75 }),
    bark: std({ map: bark.map, roughness: 0.95 }),
    willow: std({ map: willowTexture(), alphaTest: 0.45, color: 0xffffff, roughness: 0.72, side: THREE.DoubleSide }),
    lamp: std({ color: 0xfff2d8, emissive: 0xffa54d, emissiveIntensity: 0, roughness: 0.6 }),
    frog: std({ color: 0x6fb43a, roughness: 0.5 }),
    eye: std({ color: 0x1c1a14, roughness: 0.3 })
  };
}

/* ---------------- kame-ishi ---------------- */

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();
function blob(P, key, x, y, z, sx, sy, sz, ry = 0, seg = 18) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.6));
  _e.set(0, ry, 0); _q.setFromEuler(_e);
  return P.put(key, g, _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz)));
}

/**
 * One stepping stone on the bed at (x, z), its top `top` m above y = 0.
 * kind: 'kame' (turtle), 'chidori' (plover), 'square'. heading = which way it faces.
 */
function steppingStone(P, kind, x, z, top, bed, heading, s = 1) {
  const base = bed - 0.15;
  const h = top - base;
  const c = Math.cos(heading), n = Math.sin(heading);
  const fx = (f, a) => x + n * f + c * a, fz = (f, a) => z + c * f - n * a;
  if (kind === 'square') {
    P.box('concrete', 0.78 * s, h, 0.78 * s, x, base + h / 2, z, { ry: heading, tex: 0.9 });
    return { rx: 0.4 * s, rz: 0.4 * s, top, ang: heading, square: true };
  }
  if (kind === 'chidori') {
    // a plover: a long flat block, a pointed head, a fan tail
    P.box('concrete', 0.48 * s, h, 0.8 * s, x, base + h / 2, z, { ry: heading, tex: 0.9 });
    P.box('concrete', 0.26 * s, h - 0.03, 0.26 * s, fx(0.5 * s, 0), base + (h - 0.03) / 2, fz(0.5 * s, 0), { ry: heading + Math.PI / 4, tex: 0.9 });
    P.box('concrete', 0.08 * s, 0.06, 0.2 * s, fx(0.7 * s, 0), top - 0.08, fz(0.7 * s, 0), { ry: heading, tex: 0.9 });
    for (const sd of [-1, 1]) P.box('concrete', 0.2 * s, h - 0.05, 0.3 * s, fx(-0.42 * s, sd * 0.12 * s), base + (h - 0.05) / 2, fz(-0.42 * s, sd * 0.12 * s), { ry: heading + sd * 0.4, tex: 0.9 });
    return { rx: 0.3 * s, rz: 0.55 * s, top, ang: heading };
  }
  // the turtle: a domed shell on a plinth, head and four flippers just above the water
  P.cyl('concrete', 0.47 * s, h - 0.12, x, base + (h - 0.12) / 2, z, { r1: 0.44 * s, seg: 20, tex: 0.9 });
  blob(P, 'concrete', x, top - 0.13, z, 0.5 * s, 0.14, 0.56 * s, heading);
  blob(P, 'concrete', fx(0.6 * s, 0), top - 0.11, fz(0.6 * s, 0), 0.13 * s, 0.085, 0.17 * s, heading, 12);
  for (const [f, a] of [[0.34, 0.42], [0.34, -0.42], [-0.38, 0.36], [-0.38, -0.36]]) blob(P, 'concrete', fx(f * s, a * s), top - 0.17, fz(f * s, a * s), 0.15 * s, 0.05, 0.1 * s, heading + Math.sign(a) * 0.6, 10);
  blob(P, 'concrete', fx(-0.6 * s, 0), top - 0.17, fz(-0.6 * s, 0), 0.07 * s, 0.04, 0.09 * s, heading, 8);
  return { rx: 0.5 * s, rz: 0.56 * s, top, ang: heading, dome: true };
}

/**
 * Kame-ishi across the river at x: tops `rise` above the normal water line.
 * Returns { group, solids, obstacles, stones, neckY }.
 */
export function buildKameIshi({ x, zFrom, zTo, level, rise = 0.24, bedAt, mats, kinds = ['square', 'kame', 'kame', 'chidori', 'kame', 'square'], s = 1 }) {
  const P = new Parts(91);
  const solids = [], obstacles = [], stones = [];
  const n = kinds.length;
  for (let i = 0; i < n; i++) {
    const z = zFrom + (zTo - zFrom) * ((i + 0.5) / n);
    const sx = x + (i % 2 ? 0.12 : -0.12) * s;
    const top = level + rise;
    const heading = Math.PI / 2 + Math.PI;                 // the turtles face upstream (-x), into the current
    const st = steppingStone(P, kinds[i], sx, z, top, bedAt(sx, z), heading, s);
    st.x = sx; st.z = z; st.kind = kinds[i];
    stones.push(st);
    const topFn = st.dome
      ? (px, pz) => top - 0.02 - 0.12 * Math.min(1, ((px - sx) ** 2 + (pz - z) ** 2) / (0.5 * s) ** 2)
      : () => top;
    solids.push(ellipseSolid({ x: sx, z, rx: st.rx + 0.04, rz: st.rz + 0.04, ang: st.ang, top: topFn, bottom: -20, kind: 'stone', name: kinds[i] === 'kame' ? 'a turtle stone' : kinds[i] === 'chidori' ? 'a plover stone' : 'a stepping stone' }));
    obstacles.push({ x: sx, z, r: Math.max(st.rx, st.rz) * 0.9 });
  }
  return { group: P.build(mats), solids, obstacles, stones, neckY: level + rise - 0.11 };
}

/* ---------------- the weir and boulders ---------------- */

/** A low weir sill across the channel: squared granite, just under the water. */
export function buildWeir({ x, z0, z1, level, bedAt, mats }) {
  const P = new Parts(17);
  for (let z = z0; z < z1; z += 0.62) {
    const b = bedAt(x, z + 0.3) - 0.2, top = level - 0.035;
    P.box('granite', 0.55, top - b, 0.6, x, (top + b) / 2, z + 0.31, { tex: 0.8 });
  }
  return P.build(mats);
}

/** A rounded boulder: an icosphere pushed about by noise, mossy on top. */
export function makeRock(r, seed = 1, mat) {
  const g = new THREE.IcosahedronGeometry(r, 3);
  const pos = g.attributes.position;
  const h = (a, b, c) => { const v = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719 + seed * 4.1) * 43758.5453; return v - Math.floor(v); };
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const k = 1 + (h(Math.round(x * 6), Math.round(y * 6), Math.round(z * 6)) - 0.5) * 0.22 + Math.sin(x * 5 + seed) * 0.05;
    pos.setXYZ(i, x * k * 1.15, y * k * (y < 0 ? 0.55 : 0.78), z * k);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/* ---------------- reeds, tōrō, willow ---------------- */

/** Reeds in the shallows: instanced leaning blades that sway. */
export function buildReeds({ spots, mats, rnd, wind }) {
  const blade = new THREE.PlaneGeometry(0.03, 1, 1, 4);
  blade.translate(0, 0.5, 0);
  const pos = blade.attributes.position;
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); pos.setX(i, pos.getX(i) * (1 - y * 0.85)); pos.setZ(i, y * y * 0.12); }
  blade.computeVertexNormals();
  const count = spots.length * 14;
  const mat = mats.reed.clone();
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uWind = wind;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform vec2 uWind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 ip = instanceMatrix * vec4(0., 0., 0., 1.);
        float sway = sin(uWind.x * 1.7 + ip.x * 0.8 + ip.z * 0.6) * 0.5 + sin(uWind.x * 3.1 + ip.x * 2.3) * 0.2;
        transformed.z += sway * uWind.y * position.y * position.y * 0.18;`);
  };
  const mesh = new THREE.InstancedMesh(blade, mat, count);
  const d = new THREE.Object3D();
  let k = 0;
  for (const sp of spots) for (let i = 0; i < 14; i++) {
    d.position.set(sp.x + (rnd() - 0.5) * 0.5, sp.y - 0.05, sp.z + (rnd() - 0.5) * 0.5);
    d.rotation.set((rnd() - 0.5) * 0.3, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.3);
    const hgt = 0.6 + rnd() * 0.7;
    d.scale.set(1, hgt, 1);
    d.updateMatrix();
    mesh.setMatrixAt(k++, d.matrix);
  }
  mesh.count = k;
  mesh.castShadow = true;
  return mesh;
}

/** An ishi-dōrō: base, post, fire box with a lit window, roof with turned-up corners, jewel. */
export function buildToro({ x, y, z, mats }) {
  const P = new Parts(5);
  P.box('granite', 0.5, 0.12, 0.5, x, y + 0.06, z, { tex: 1 });
  P.cyl('granite', 0.09, 0.62, x, y + 0.43, z, { r1: 0.075, seg: 10 });
  P.box('granite', 0.38, 0.08, 0.38, x, y + 0.78, z, { tex: 1 });
  P.box('lamp', 0.24, 0.22, 0.24, x, y + 0.93, z);
  for (const [dx, dz] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) P.box('granite', 0.06, 0.24, 0.06, x + dx, y + 0.93, z + dz);
  P.cyl('granite', 0.38, 0.18, x, y + 1.13, z, { r1: 0.06, seg: 4 });
  P.cyl('granite', 0.07, 0.1, x, y + 1.27, z, { r1: 0.03, seg: 8 });
  const g = P.build(mats);
  return { group: g, light: { x, y: y + 0.93, z, i: 1.4 }, solid: rectSolid({ x0: x - 0.25, x1: x + 0.25, z0: z - 0.25, z1: z + 0.25, top: y + 1.32, bottom: -20, walk: false, kind: 'post' }) };
}

/** A riverside willow (yanagi): a leaning trunk and curtains of drooping strands. */
export function buildWillow({ x, y, z, mats, rnd, wind }) {
  const P = new Parts(13);
  const V = (a, b, c) => new THREE.Vector3(a, b, c);
  const top = V(x + 0.45, y + 2.7, z - 0.25);
  P.between('bark', V(x, y - 0.1, z), top, { r: 0.17, seg: 9 });
  // arching limbs, each ending in a fall of strands
  const tips = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rnd() * 0.5, r = 1.1 + rnd() * 0.7;
    const mid = top.clone().add(V(Math.cos(a) * r * 0.45, 0.42 + rnd() * 0.2, Math.sin(a) * r * 0.45));
    const tip = top.clone().add(V(Math.cos(a) * r, 0.28 + rnd() * 0.2, Math.sin(a) * r));
    P.between('bark', top, mid, { r: 0.075, seg: 6 });
    P.between('bark', mid, tip, { r: 0.04, seg: 5 });
    tips.push([mid, tip]);
  }
  const group = P.build(mats);
  // strands hang from points on a dome over the limbs; long near the rim, short on top
  const strand = new THREE.PlaneGeometry(0.26, 1, 1, 8);
  strand.translate(0, -0.5, 0);
  const sp = strand.attributes.position;
  for (let i = 0; i < sp.count; i++) { const d = -sp.getY(i); sp.setZ(i, d * d * 0.16); sp.setX(i, sp.getX(i) * (1 - d * 0.55)); }
  strand.computeVertexNormals();
  const n = 720;
  const mat = mats.willow.clone();
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uWind = wind;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform vec2 uWind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 ip = instanceMatrix * vec4(0., 0., 0., 1.);
        float d = -position.y;
        transformed.x += sin(uWind.x * 1.3 + ip.x * 3. + ip.z) * d * d * 0.1 * uWind.y;
        transformed.z += cos(uWind.x * 1.1 + ip.z * 2.) * d * d * 0.07 * uWind.y;`);
  };
  const mesh = new THREE.InstancedMesh(strand, mat, n);
  const d = new THREE.Object3D(), col = new THREE.Color();
  const domeC = top.clone().add(V(0, 0.45, 0));
  for (let i = 0; i < n; i++) {
    const [mid, tip] = tips[i % tips.length];
    const t = rnd();
    // a quarter of the strands make the crown itself, so no bare limb shows on top
    const o = i % 3 === 0
      ? domeC.clone().add(V((rnd() - 0.5) * 2.2, 0.1 + rnd() * 0.3, (rnd() - 0.5) * 2.2))
      : t < 0.5 ? top.clone().lerp(mid, 0.4 + t).lerp(tip, t) : mid.clone().lerp(tip, t);
    o.add(V((rnd() - 0.5) * 0.7, (rnd() - 0.5) * 0.25, (rnd() - 0.5) * 0.7));
    const rim = Math.min(1, Math.hypot(o.x - domeC.x, o.z - domeC.z) / 1.8);
    const len = Math.max(0.5, (o.y - y) - 0.35 - (1 - rim) * 0.9 + (rnd() - 0.5) * 0.5);
    d.position.copy(o);
    d.rotation.set(0, Math.atan2(o.x - domeC.x, o.z - domeC.z) + (rnd() - 0.5) * 0.8, (rnd() - 0.5) * 0.1);
    d.scale.set(1, len, 1);
    d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
    col.setHSL(0.2 + rnd() * 0.06, 0.25 + rnd() * 0.2, 0.62 + rnd() * 0.22);
    mesh.setColorAt(i, col);
  }
  mesh.castShadow = true;
  group.add(mesh);
  return { group, solid: rectSolid({ x0: x - 0.2, x1: x + 0.2, z0: z - 0.2, z1: z + 0.2, top: y + 3, bottom: -20, walk: false, kind: 'post' }) };
}

/* ---------------- autumn: the hasakake ---------------- */

/** A hasakake (haza / inagi) rack: crossed legs, three poles, sheaves hung over them. */
export function buildHasakake({ x0, x1, z, y, mats }) {
  const P = new Parts(29);
  const V = (a, b, c) => new THREE.Vector3(a, b, c);
  const legs = Math.max(2, Math.round((x1 - x0) / 1.8) + 1);
  for (let i = 0; i < legs; i++) {
    const x = x0 + (x1 - x0) * (i / (legs - 1));
    P.between('pole', V(x - 0.35, y - 0.1, z - 0.25), V(x + 0.12, y + 1.75, z + 0.08), { r: 0.035, seg: 6 });
    P.between('pole', V(x + 0.35, y - 0.1, z + 0.25), V(x - 0.12, y + 1.75, z - 0.08), { r: 0.035, seg: 6 });
  }
  for (const h of [0.62, 1.08, 1.52]) {
    P.between('pole', V(x0 - 0.3, y + h, z), V(x1 + 0.3, y + h, z), { r: 0.028, seg: 6 });
    for (let x = x0 - 0.15; x < x1 + 0.2; x += 0.16) {
      // one sheaf: straw hung over the pole, heads down on both sides
      P.box('straw', 0.13, 0.42, 0.03, x, y + h - 0.2, z + 0.06, { rx: 0.18 });
      P.box('straw', 0.13, 0.42, 0.03, x, y + h - 0.2, z - 0.06, { rx: -0.18 });
    }
  }
  return P.build(mats);
}

/* ---------------- frogs ---------------- */

/** Amagaeru on the ridges. They plop into the paddy when Michi comes close. */
export class Frogs {
  constructor({ spots, mats, onPlop }) {
    this.group = new THREE.Group();
    this.onPlop = onPlop;
    this.frogs = spots.map((sp, i) => {
      const P = new Parts(70 + i);
      P.put('frog', new THREE.SphereGeometry(0.05, 12, 8), new THREE.Matrix4().compose(new THREE.Vector3(0, 0.035, 0), new THREE.Quaternion(), new THREE.Vector3(1, 0.7, 1.3)));
      for (const sd of [-1, 1]) {
        P.put('eye', new THREE.SphereGeometry(0.012, 8, 6), new THREE.Matrix4().makeTranslation(sd * 0.025, 0.065, 0.035));
        P.put('frog', new THREE.SphereGeometry(0.025, 8, 6), new THREE.Matrix4().compose(new THREE.Vector3(sd * 0.05, 0.02, -0.03), new THREE.Quaternion(), new THREE.Vector3(1, 0.6, 1.8)));
      }
      const g = P.build(mats, { shadows: false });
      g.position.set(sp.x, sp.y, sp.z);
      g.rotation.y = sp.face ?? 0;
      this.group.add(g);
      return { g, home: { ...sp }, state: 'sit', t: 0, vy: 0, vx: 0, vz: 0 };
    });
  }
  update(dt, cat, waterY) {
    for (const f of this.frogs) {
      f.t += dt;
      if (f.state === 'sit') {
        f.g.position.y = f.home.y + Math.max(0, Math.sin(f.t * 9)) * 0.004;     // the throat pumping
        if (cat && Math.hypot(cat.x - f.home.x, cat.z - f.home.z) < 1.1) {
          f.state = 'jump'; f.t = 0;
          const dx = f.home.x - cat.x, dz = f.home.z - cat.z, l = Math.hypot(dx, dz) || 1;
          f.vx = (dx / l) * 1.3; f.vz = (dz / l) * 1.3; f.vy = 2.2;
          f.g.rotation.y = Math.atan2(f.vx, f.vz);
        }
      } else if (f.state === 'jump') {
        f.vy -= 9.8 * dt;
        f.g.position.x += f.vx * dt; f.g.position.z += f.vz * dt; f.g.position.y += f.vy * dt;
        const wy = waterY(f.g.position.x, f.g.position.z);
        if (f.vy < 0 && f.g.position.y < wy) { f.state = 'gone'; f.t = 0; f.g.visible = false; this.onPlop && this.onPlop(f.g.position.x, f.g.position.z); }
      } else if (f.t > 14) {
        f.state = 'sit'; f.t = 0; f.g.visible = true;
        f.g.position.set(f.home.x, f.home.y, f.home.z);
        f.g.rotation.y = f.home.face ?? 0;
      }
    }
  }
}
