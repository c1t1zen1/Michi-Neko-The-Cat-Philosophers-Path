// valley.js — the Roof Road's valley side (BUILD_GUIDE_FABLE R6.1, R6.2; spec
// docs/superpowers/specs/2026-10-24-rooftop-road-design.md §2, §4, §8.2).
//
//   buildSevenPosts(scene, MAT)       bronze giboshi caps on the bridge's railing
//                                     posts and a clay Shōki on the south end of
//                                     the east railing, looking along it
//   buildOdoiThicket(city, MAT)       the Odoi bank south of the bridge's south
//                                     ramp: an earthen bank crowned with bamboo,
//                                     a closed bamboo thicket in its one gap, and
//                                     behind it a small gate hung with an indigo
//                                     洛 noren and two paper lanterns
//
// Countryside calls both (buildRiverAndBridge() and the end of its build). They
// draw NOTHING from the valley's seeded stream: the Odoi has its own
// mulberry32(0x0D01) and the posts draw no numbers at all, so every pre-existing
// object, collider and rng draw of the valley is unchanged. Every material here
// is the module's own (never one of Countryside's MAT entries), so
// Countryside._mergeStatics() leaves these meshes alone: the giboshi glow, the
// thicket parts and the lanterns kindle at runtime.
//
// Both sets: the posts and the bank stand where the classic and the kit bridge
// both have them (the kit bridge keeps the classic posts and rails), and are
// built on either asset set alike.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeShoki } from '../../rooftops/js/pieces/pickups.js';
import { createFoliageMaterial } from '../foliage.js?v=20261114a';
import { BRIDGE_X, BRIDGE_Z, EAST_RAIL, POST_Z } from './posts.js?v=20261114a';

/**
 * The Odoi bank, in world metres. Its gap sits at the foot of the bridge's south
 * ramp, a little east of the ramp's axis (x = -1): the edge forest's trunks stand
 * at x ≈ -1.5 and x ≈ 2.1 just behind the bank, and the gate stands between them.
 */
export const ODOI = Object.freeze({
  seed: 0x0D01,
  z: 38.7, depth: 2.4, crest: 0.9, height: 1.35,
  x0: -11, x1: 9, gap0: -0.45, gap1: 1.15
});
/**
 * Walking into the open gap starts the noren veil: the cat at the foot of the
 * south ramp (it ends at z = 37.3; the forest stops a cat at z ≈ 36.7), anywhere
 * across the ramp's width, on the ground (not on a kerb or a jump).
 */
export const ODOI_GATE = Object.freeze({ x0: -2.0, x1: 1.0, z: 36.45, maxY: 1.25 });
/** The cat's spot on the way back: the bridge's south ramp, facing north (the valley). */
export const ODOI_RETURN = Object.freeze({ x: -1, y: 0.67, z: 35.7, heading: Math.PI });

function mulberry32(a) {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Merge a list of indexed { geo, matrix } into one BufferGeometry (position, normal, uv). */
function mergeParts(parts) {
  const geos = parts.map(({ geo, matrix }) => {
    const g = geo.clone();
    if (matrix) g.applyMatrix4(matrix);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    return g;
  });
  const out = mergeGeometries(geos, false);
  out.computeBoundingSphere();
  return out;
}

const M4 = (x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => new THREE.Matrix4().compose(
  new THREE.Vector3(x, y, z),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
  new THREE.Vector3(s, s, s)
);

/* ------------------------------------------------------------------ */
/*  R6.1  The Seven Posts: giboshi caps and the Shōki                   */
/* ------------------------------------------------------------------ */

// The giboshi profile of the kit bridge's lab (labs/water b-sanjo): a collar,
// a ring, the onion and its point, here at 0.5 scale on the railing posts.
const GIBOSHI = [[0.088, 0], [0.088, 0.13], [0.104, 0.14], [0.104, 0.165], [0.07, 0.185], [0.098, 0.235],
  [0.118, 0.29], [0.104, 0.345], [0.07, 0.392], [0.03, 0.43], [0.008, 0.47], [0, 0.48]];
/** The caps stand on the rail's outer edge, clear of a cat walking its middle. */
const CAP_OUT = 0.19;
const CAP_SCALE = 0.5;
const COLD = new THREE.Color(0x3a2610);
const WARM = new THREE.Color(0xffa64a);

function giboshiGeometry() {
  const pts = GIBOSHI.map(([r, y]) => new THREE.Vector2(r * CAP_SCALE, y * CAP_SCALE));
  return mergeParts([
    { geo: new THREE.BoxGeometry(0.1, 0.03, 0.1), matrix: M4(0, 0.015, 0) },
    { geo: new THREE.LatheGeometry(pts, 12), matrix: M4(0, 0.03, 0) }
  ]);
}

/**
 * Fourteen caps (seven per railing) and the Shōki. The seven east caps keep a
 * material each so each can glow on its own; the west seven are one mesh.
 * Returns { group, caps: [{ mesh, material }], setGlow(i, v), shoki }.
 */
export function buildSevenPosts(scene, MAT = {}) {
  const group = new THREE.Group();
  group.name = 'Seven Posts';
  const base = MAT.spiritualBellBronze;
  const bronze = () => {
    const m = base ? base.clone() : new THREE.MeshStandardMaterial({ color: 0x8a6a3a, metalness: 0.8, roughness: 0.4 });
    m.emissive = COLD.clone();
    m.emissiveIntensity = 0.25;
    m.name = 'giboshi';
    return m;
  };
  const geo = giboshiGeometry();
  const caps = [];
  POST_Z.forEach((z, i) => {
    const material = bronze();
    const mesh = new THREE.Mesh(geo, material);
    mesh.name = `Giboshi East ${i + 1}`;
    mesh.position.set(EAST_RAIL.x + CAP_OUT, EAST_RAIL.top, z);
    mesh.castShadow = true;
    group.add(mesh);
    caps.push({ mesh, material, glow: 0 });
  });
  const westX = BRIDGE_X - 1.24 - CAP_OUT;
  const west = new THREE.Mesh(mergeParts(POST_Z.map((z) => ({ geo, matrix: M4(westX, EAST_RAIL.top, z) }))), bronze());
  west.name = 'Giboshi West';
  west.castShadow = true;
  group.add(west);

  // The Shōki: the Roof Road's own clay figure (rooftops/js/pieces/pickups.js),
  // sitting on the outer edge of the east railing's south end and looking north
  // along it: the only hint, and a wordless one.
  const clay = new THREE.MeshStandardMaterial({ color: 0x9a6a4a, roughness: 0.9 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9ea3a8, roughness: 0.35, metalness: 0.7 });
  const figure = makeShoki({ clay, steel });
  const byMat = new Map();
  figure.updateMatrixWorld(true);
  for (const m of figure.children) {
    if (!byMat.has(m.material)) byMat.set(m.material, []);
    byMat.get(m.material).push({ geo: m.geometry, matrix: m.matrixWorld });
  }
  const shoki = new THREE.Group();
  shoki.name = 'Bridge Shoki';
  for (const [mat, parts] of byMat) {
    const mesh = new THREE.Mesh(mergeParts(parts), mat);
    mesh.castShadow = true;
    shoki.add(mesh);
  }
  shoki.position.set(EAST_RAIL.x + CAP_OUT, EAST_RAIL.top, EAST_RAIL.z1 - 0.06);
  shoki.rotation.y = Math.PI;      // the figure faces +z; turn it to look north along the rail
  shoki.scale.setScalar(0.95);
  group.add(shoki);
  scene.add(group);

  return {
    group, caps, shoki,
    /** v ∈ [0, 1]: cold bronze → a warm glow. */
    setGlow(i, v) {
      const c = caps[i];
      if (!c || c.glow === v) return;
      c.glow = v;
      c.material.emissive.copy(COLD).lerp(WARM, v);
      c.material.emissiveIntensity = 0.25 + v * 1.55;
    }
  };
}

/* ------------------------------------------------------------------ */
/*  R6.2  The Odoi bank and its bamboo thicket                          */
/* ------------------------------------------------------------------ */

/** A bamboo culm 6 m tall at scale 1: a tapered stalk with node rings. */
function culmGeometry() {
  const H = 6, parts = [{ geo: new THREE.CylinderGeometry(0.036, 0.046, H, 7, 1, true), matrix: M4(0, H / 2, 0) }];
  for (let y = 0.32; y < H - 0.3; y += 0.36 + (y * 0.02)) {
    const r = 0.046 - (y / H) * 0.01 + 0.006;
    parts.push({ geo: new THREE.CylinderGeometry(r, r, 0.028, 7, 1, true), matrix: M4(0, y, 0) });
  }
  return mergeParts(parts);
}

/** The leaves of one culm (scale 1): lance blades in sprays on short branches, upper half. */
function culmLeavesGeometry(rng) {
  const pos = [], col = [], idx = [];
  const c = new THREE.Color();
  const greens = [0x4f7a2c, 0x5f8c34, 0x6f9a3c, 0x83a84a];
  const v = new THREE.Vector3();
  let n = 0;
  for (let b = 0; b < 22; b++) {
    const y = 2.3 + Math.pow(rng(), 0.6) * 3.6;
    const a = rng() * Math.PI * 2;
    const len = 0.25 + rng() * 0.45;
    const bx = Math.cos(a) * len, bz = Math.sin(a) * len, by = y + len * 0.25;
    for (let k = 0; k < 7; k++) {
      const la = a + (rng() - 0.5) * 1.8;
      const L = 0.3 + rng() * 0.2, W = 0.035 + rng() * 0.02;
      const droop = -0.35 - rng() * 0.5;
      const dir = new THREE.Vector3(Math.cos(la) * Math.cos(droop), Math.sin(droop), Math.sin(la) * Math.cos(droop));
      const side = new THREE.Vector3(-Math.sin(la), 0, Math.cos(la)).multiplyScalar(W);
      const o = new THREE.Vector3(bx, by, bz);
      c.setHex(greens[(rng() * greens.length) | 0]).multiplyScalar(0.85 + rng() * 0.3);
      // a three-row tapered blade: root, two widening rows, the tip
      const rows = [[0, 0.35], [0.33, 1], [0.66, 0.7], [1, 0]];
      for (const [t, w] of rows) {
        for (const s of [-1, 1]) {
          v.copy(o).addScaledVector(dir, L * t).addScaledVector(side, s * w);
          v.y -= t * t * 0.05;
          pos.push(v.x, v.y, v.z);
          col.push(c.r * (0.8 + t * 0.25), c.g * (0.8 + t * 0.25), c.b * (0.8 + t * 0.25));
        }
      }
      for (let r = 0; r < 3; r++) {
        const a0 = n + r * 2;
        idx.push(a0, a0 + 2, a0 + 1, a0 + 1, a0 + 2, a0 + 3);
      }
      n += 8;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/** The bank's earthen body over [xa, xb]: a trapezoid section, the crest wavering a little. */
function bankGeometry(xa, xb, rng, taperA, taperB) {
  const { z, depth, crest, height } = ODOI;
  const steps = Math.max(2, Math.ceil((xb - xa) / 0.5));
  const prof = (h) => [[z - depth / 2, 0], [z - crest / 2, h], [z + crest / 2, h], [z + depth / 2, 0]];
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= steps; i++) {
    const x = xa + (xb - xa) * (i / steps);
    let h = height * (0.94 + rng() * 0.12);
    if (taperA) h *= Math.min(1, 0.2 + (x - xa) / 2.2);
    if (taperB) h *= Math.min(1, 0.2 + (xb - x) / 2.2);
    const p = prof(h);
    let along = 0;
    for (let k = 0; k < p.length; k++) {
      if (k) along += Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]);
      pos.push(x, p[k][1], p[k][0]);
      uv.push(x * 0.45, along * 0.45);
    }
  }
  for (let i = 0; i < steps; i++) {
    for (let k = 0; k < 3; k++) {
      const a = i * 4 + k, b = a + 4;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** The noren cloth: indigo, three panels, a white 洛 in a ring on the middle one. */
function norenTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#223652';
  g.fillRect(0, 0, 256, 128);
  const rng = mulberry32(0x0D02);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(${rng() < 0.5 ? '255,255,255' : '0,0,0'},${(0.02 + rng() * 0.05).toFixed(3)})`;
    g.fillRect(rng() * 256, rng() * 128, 1 + rng() * 3, 1);
  }
  g.strokeStyle = '#ece6d6';
  g.lineWidth = 5;
  g.beginPath(); g.arc(128, 60, 38, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#ece6d6';
  g.font = 'bold 52px "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif CJK JP", serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('洛', 128, 62);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * The Odoi: bank, bamboo, the closed thicket in the gap, the gate behind it.
 * Registers its colliders and one vegetation exclusion on `city` (appended
 * after everything the valley registered before it). Returns the handle
 * Countryside.setOdoiThicketOpen(t) drives.
 */
export function buildOdoiThicket(city, MAT = {}) {
  const rng = mulberry32(ODOI.seed);
  const group = new THREE.Group();
  group.name = 'Odoi Bank';
  const { z, depth, x0, x1, gap0, gap1 } = ODOI;

  // The earthen bank, either side of the gap, its ends tapering into the forest.
  const earth = MAT.ridge ? MAT.ridge.clone() : new THREE.MeshStandardMaterial({ color: 0x77835a, roughness: 1 });
  earth.name = 'odoi-earth';
  const bank = new THREE.Mesh(mergeGeometries([
    bankGeometry(x0, gap0, rng, true, false),
    bankGeometry(gap1, x1, rng, false, true)
  ], false), earth);
  bank.name = 'Odoi Earthwork';
  bank.receiveShadow = true;
  group.add(bank);

  // Dressed stone faces where the bank is cut for the gate.
  const stone = MAT.stoneDark ? MAT.stoneDark.clone() : new THREE.MeshStandardMaterial({ color: 0x6a6a64, roughness: 0.95 });
  stone.name = 'odoi-stone';
  const faces = [];
  for (const [x, s] of [[gap0, -1], [gap1, 1]]) {
    for (let k = 0; k < 4; k++) {
      const h = ODOI.height * (1 - k * 0.22);
      faces.push({ geo: new THREE.BoxGeometry(0.34, 0.3, depth - k * 0.45), matrix: M4(x + s * 0.17, 0.15 + k * 0.3, z, 0, 0, 0) });
      if (h < 0.3) break;
    }
  }
  const stoneMesh = new THREE.Mesh(mergeParts(faces), stone);
  stoneMesh.name = 'Odoi Stone Faces';
  stoneMesh.castShadow = stoneMesh.receiveShadow = true;
  group.add(stoneMesh);

  // The gate behind the thicket: two posts, a lintel and a little board roof,
  // the noren and two paper lanterns. Hidden until the thicket starts to part.
  const gate = new THREE.Group();
  gate.name = 'Odoi Gate';
  const timber = MAT.timberDark ? MAT.timberDark.clone() : new THREE.MeshStandardMaterial({ color: 0x3a2818, roughness: 0.85 });
  timber.name = 'odoi-timber';
  const gz = z - depth / 2 + 0.25, gx = (gap0 + gap1) / 2, gw = gap1 - gap0;
  const frame = new THREE.Mesh(mergeParts([
    { geo: new THREE.BoxGeometry(0.13, 2.25, 0.13), matrix: M4(gap0 + 0.1, 1.125, gz) },
    { geo: new THREE.BoxGeometry(0.13, 2.25, 0.13), matrix: M4(gap1 - 0.1, 1.125, gz) },
    { geo: new THREE.BoxGeometry(gw + 0.5, 0.14, 0.16), matrix: M4(gx, 2.12, gz) },
    { geo: new THREE.BoxGeometry(gw + 0.9, 0.04, 0.55), matrix: M4(gx, 2.33, gz - 0.12, 0.32, 0, 0) },
    { geo: new THREE.BoxGeometry(gw + 0.9, 0.04, 0.55), matrix: M4(gx, 2.33, gz + 0.12, -0.32, 0, 0) },
    { geo: new THREE.BoxGeometry(gw + 0.95, 0.07, 0.08), matrix: M4(gx, 2.42, gz) }
  ]), timber);
  frame.castShadow = true;
  gate.add(frame);
  const norenMat = new THREE.MeshStandardMaterial({ map: norenTexture(), roughness: 0.92, side: THREE.DoubleSide });
  norenMat.name = 'odoi-noren';
  const panels = [];
  const pw = (gw - 0.3) / 3;
  for (let i = 0; i < 3; i++) {
    const geo = new THREE.PlaneGeometry(pw - 0.03, 0.95, 1, 1);
    const uvs = geo.attributes.uv;
    for (let k = 0; k < uvs.count; k++) uvs.setX(k, (i + uvs.getX(k)) / 3);
    // turned to face the bridge (north, -z): panel 0 is the east one, on the
    // left of a cat looking at it, so the 洛 reads the right way round
    panels.push({ geo, matrix: M4(gap1 - 0.15 - pw * (i + 0.5), 1.55, gz - 0.09, 0, Math.PI, 0) });
  }
  const noren = new THREE.Mesh(mergeParts(panels), norenMat);
  noren.name = 'Odoi Noren';
  gate.add(noren);
  const paper = new THREE.MeshStandardMaterial({ color: 0xf4e2c0, roughness: 0.8, emissive: 0xffa040, emissiveIntensity: 0 });
  paper.name = 'odoi-lantern';
  const lanterns = new THREE.Mesh(mergeParts([gap0 - 0.18, gap1 + 0.18].map((x) => ({
    geo: new THREE.SphereGeometry(0.15, 12, 8).scale(1, 1.3, 1), matrix: M4(x, 1.72, gz - 0.05)
  }))), paper);
  lanterns.name = 'Odoi Lanterns';
  gate.add(lanterns);
  gate.visible = false;
  group.add(gate);

  // Bamboo: culms along the crest (static), and the thicket closing the gap
  // (instanced on its own so the culms can lean apart).
  const culmMat = MAT.bambooGreen || new THREE.MeshStandardMaterial({ color: 0x6a9a44, roughness: 0.55 });
  const leafMat = createFoliageMaterial({ sss: 0.36, wind: 1.25, mottle: 0.22, bump: 0.3, vertexColors: true, side: THREE.DoubleSide });
  const culmGeo = culmGeometry();
  const leafGeo = culmLeavesGeometry(rng);
  const crest = [];
  for (let x = x0 + 0.6; x < x1 - 0.5; x += 0.42 + rng() * 0.32) {
    if (x > gap0 - 0.25 && x < gap1 + 0.25) continue;
    const edgeFade = Math.min(1, (x - x0) / 2.6, (x1 - x) / 2.6);
    crest.push({
      x, y: ODOI.height * (0.55 + 0.4 * edgeFade) - 0.05, z: z + (rng() - 0.5) * (ODOI.crest + 0.5),
      s: 0.72 + rng() * 0.5, yaw: rng() * Math.PI * 2, lean: (rng() - 0.5) * 0.12, tilt: (rng() - 0.35) * 0.1
    });
  }
  const thicket = [];
  for (let i = 0; i < 14; i++) {
    const x = gap0 + 0.12 + rng() * (gw - 0.24);
    thicket.push({
      x, y: 0, z: z - depth / 2 + 0.35 + rng() * (depth - 0.8),
      s: 0.7 + rng() * 0.4, yaw: rng() * Math.PI * 2, lean: (rng() - 0.5) * 0.08, tilt: (rng() - 0.5) * 0.06,
      side: x < gx ? -1 : 1
    });
  }
  const dummy = new THREE.Object3D();
  const pose = (c, open = 0) => {
    const lean = c.lean + (c.side || 0) * 0.55 * open;
    dummy.position.set(c.x + (c.side || 0) * (0.85 + c.s * 0.35) * open, c.y - 0.15 * open, c.z + 0.3 * open);
    dummy.rotation.set(c.tilt, c.yaw, lean, 'ZXY');   // spin on its own axis, then lean in world x
    dummy.scale.setScalar(c.s);
    dummy.updateMatrix();
    return dummy.matrix;
  };
  const instanced = (list, name) => {
    const stalks = new THREE.InstancedMesh(culmGeo, culmMat, list.length);
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, list.length);
    stalks.name = name + ' Culms';
    leaves.name = name + ' Leaves';
    list.forEach((c, i) => { const m = pose(c); stalks.setMatrixAt(i, m); leaves.setMatrixAt(i, m); });
    for (const m of [stalks, leaves]) {
      m.castShadow = true;
      m.receiveShadow = true;
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
      group.add(m);
    }
    return { stalks, leaves };
  };
  instanced(crest, 'Odoi Bamboo');
  const gapSet = instanced(thicket, 'Odoi Thicket');
  city.scene.add(group);

  // Footprint: the bank either side of the gap, and the closed thicket in it.
  const box = (xa, xb, za, zb, h) => new THREE.Box3(new THREE.Vector3(xa, 0, za), new THREE.Vector3(xb, h, zb));
  const colliders = [
    box(x0, gap0, z - depth / 2, z + depth / 2, 2.4),
    box(gap1, x1, z - depth / 2, z + depth / 2, 2.4)
  ];
  const gapCollider = box(gap0, gap1, z - depth / 2, z + depth / 2 - 0.3, 2.4);
  for (const c of colliders) city.colliders.push(c);
  city.colliders.push(gapCollider);
  city.vegetationExclusions.push({ x: (x0 + x1) / 2, z, width: x1 - x0 + 1, depth: depth + 1 });

  let openT = 0, dropped = false;
  return {
    group, gate, colliders, gapCollider, thicket,
    get open() { return openT; },
    /** t: 0 closed → 1 open (the thicket leans apart, the gate shows, the lanterns kindle). */
    setOpen(t) {
      t = Math.max(0, Math.min(1, t));
      if (t === openT) return;
      openT = t;
      thicket.forEach((c, i) => {
        const m = pose(c, t);
        gapSet.stalks.setMatrixAt(i, m);
        gapSet.leaves.setMatrixAt(i, m);
      });
      gapSet.stalks.instanceMatrix.needsUpdate = true;
      gapSet.leaves.instanceMatrix.needsUpdate = true;
      gapSet.stalks.computeBoundingSphere();
      gapSet.leaves.computeBoundingSphere();
      gate.visible = t > 0.02;
      paper.emissiveIntensity = 1.4 * t;
      // One-way, like the shrine thicket: once it starts to part the way is open.
      if (t > 0 && !dropped) {
        dropped = true;
        city.colliders = city.colliders.filter((b) => b !== gapCollider);
      }
    }
  };
}
