// The Lantern Glade, part by part (lab 07 "moonpool"). Same builder shape as
// pool.js: (ctx, layout, params) -> { group, parts, live, update, dispose },
// positions local to the part's origin, `buildLanternGlade` composes them.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TAU, sstep, canvas2d, canvasTexture, merge, indexed, rockGeometry } from '../craft.js?v=20261113a';
import { fitRock, rockMaterials } from '../rocks/stone.js?v=20261113a';
import { culmGeometry, bladeGeometry } from '../greenery/bamboo.js?v=20261113a';
import { washiTexture, haloTexture, kindle } from '../lanterns/light.js?v=20261113a';
import {
  nightnessAt, hourOf, shared, glowTexture, leafMaterial, freePrivate, polarDisc, tint, strut,
  glowPoints, billboardSet, compose, single
} from './common.js?v=20261113a';
import { slabGeometry } from './pool.js?v=20261113a';

const TIER = (t, hero, mid, far) => (t === 'hero' ? hero : t === 'mid' ? mid : far);

/* ----------------------------------------------------------------- floor --- */

// Leaf litter: the layout's 320 strokes become pointed bamboo leaves in the
// olive and gold of old fallen blades, with moss patches and a worn, paler
// clearing where the seat is.
function floorTexture(L) {
  const [c, x] = canvas2d(256, 256), s = 256;
  const g = x.createRadialGradient(s / 2, s / 2, s * 0.1, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(158,140,90,1)'); g.addColorStop(0.75, 'rgba(120,128,70,0.92)'); g.addColorStop(1, 'rgba(100,126,64,0)');
  x.fillStyle = g; x.fillRect(0, 0, s, s);
  L.litter.forEach(([h, sat, light, alpha, mx, my, turn, length], i) => {
    const px = mx * s, py = my * s;
    if (i % 8 === 0) {                                                // moss
      const rad = 4 + length * 0.9, m = x.createRadialGradient(px, py, 0, px, py, rad);
      m.addColorStop(0, `hsla(${88 + h * 0.15},40%,${30 + light * 0.2}%,0.5)`); m.addColorStop(1, 'hsla(90,40%,32%,0)');
      x.fillStyle = m; x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
      return;
    }
    x.save(); x.translate(px, py); x.rotate(turn * 2.1);              // a fallen blade: a pointed ellipse
    x.fillStyle = `hsla(${h - 8 + (i % 3) * 7},${sat + 8}%,${light + 6}%,${Math.min(0.85, alpha + 0.25)})`;
    x.beginPath(); x.ellipse(0, 0, length * 1.2 + 2, 0.9 + (i % 2) * 0.5, 0, 0, TAU); x.fill();
    x.restore();
  });
  const worn = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s * 0.17);
  worn.addColorStop(0, 'rgba(176,160,112,0.55)'); worn.addColorStop(1, 'rgba(176,160,112,0)');
  x.fillStyle = worn; x.fillRect(0, 0, s, s);
  return canvasTexture(c);
}

export function buildFloor(ctx, L, p) {
  const { tier, kitMaterials: km } = ctx;
  const map = shared(km, 'floor:' + L.litter.length + ':' + L.litter[0][4].toFixed(5), () => floorTexture(L));
  const mat = new THREE.MeshStandardMaterial({ map, color: p.tint, transparent: true, roughness: 1, depthWrite: false });
  const mesh = new THREE.Mesh(polarDisc(L.radius * p.spread, TIER(tier, 4, 2, 1), TIER(tier, 48, 28, 14), { uvScale: 1 / p.spread }), mat);
  mesh.position.y = Math.min(L.lift, 0.02);
  mesh.receiveShadow = true; mesh.name = 'disc';
  return single('disc', mesh, { dispose() { freePrivate([mat]); } });
}

/* ---------------------------------------------------------------- bamboo --- */

const BAMBOO = { hero: { radial: 6, nodes: 11, ring: 2, rows: 4, keep: 6 }, mid: { radial: 4, nodes: 0, ring: 1, rows: 3, keep: 4 }, far: { radial: 3, nodes: 0, ring: 1, rows: 2, keep: 2 } };

function bladeWithColour(rows, width) {
  const g = bladeGeometry(THREE, rows, 0.2 * width, 1.35, 0.35);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) { const k = 0.75 + 0.3 * (pos.getY(i) / 1.35); col[i * 3] = k; col[i * 3 + 1] = k; col[i * 3 + 2] = k * 0.9; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

// The ring of tall stalks round the glade: the greenery family's noded culm
// (a swollen node, a dark ridge, the pale band under it) on the classic ring
// and lean, with slim drooping blades in place of the cones.
export function buildBamboo(ctx, L, p) {
  const { tier, kitMaterials: km } = ctx;
  const cfg = BAMBOO[tier], n = L.stalks.length;
  const culm = culmGeometry(THREE, { rBot: 0.072, rTop: 0.05, radial: cfg.radial, nodes: cfg.nodes, ring: cfg.ring, bulge: 0.14, length: 7 }).translate(0, 3.5, 0);
  const culms = new THREE.InstancedMesh(culm, km.bamboo({ color: 0xa9c06a, vcol: true, rough: 0.5 }), n);
  const blade = bladeWithColour(cfg.rows, p.leaf);
  const leafCount = L.stalks.reduce((a, s) => a + Math.min(cfg.keep, s.leaves.length), 0);
  const leaves = new THREE.InstancedMesh(blade, leafMaterial(km), leafCount);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  let sn = 0, ln = 0;
  for (const { a, sx, sz, h, lean, hsl, leaves: blades } of L.stalks) {
    e.set(Math.sin(a) * lean, 0, -Math.cos(a) * lean, 'XYZ'); q.setFromEuler(e);
    const hh = h * p.height;
    m4.compose(v.set(sx, 0, sz), q, sc.set(p.girth, hh / 7, p.girth));
    culms.setMatrixAt(sn, m4);
    culms.setColorAt(sn, col.setHSL(hsl[0], hsl[1] * 0.5, 0.74 + (hsl[2] - 0.42) * 1.2));
    sn++;
    for (let k = 0; k < Math.min(cfg.keep, blades.length); k++) {
      const { ly, euler, length, hsl: t } = blades[k];
      e.set(euler[0], euler[1], 0, 'YXZ'); q.setFromEuler(e);
      const y = ly * p.height;
      m4.compose(v.set(sx + Math.cos(a) * lean * y, y, sz + Math.sin(a) * lean * y), q, sc.set(1, length * (tier === 'far' ? 1.3 : 1), 1));
      leaves.setMatrixAt(ln, m4);
      leaves.setColorAt(ln, col.setHSL(t[0], t[1], t[2]));
      ln++;
    }
  }
  culms.count = sn; leaves.count = ln;
  for (const mesh of [culms, leaves]) { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; mesh.castShadow = true; }
  culms.receiveShadow = true;
  const group = new THREE.Group();
  group.add(culms, leaves);
  return { group, parts: { culms, leaves }, live: [] };
}

/* ------------------------------------------------------------- lanterns --- */

const PAPER = [[0.1, 0.21], [0.15, 0.16], [0.17, 0.07], [0.172, 0], [0.17, -0.07], [0.15, -0.16], [0.1, -0.21]];
const PAPER_FAR = [[0.1, 0.21], [0.17, 0], [0.1, -0.21]];

// Washi lit from inside, one mesh for every lantern of a set: the kindle level
// is a vertex attribute (aK), so each lantern lights on its own onset with no
// draw of its own. The belly glow falls off from the lantern's own centre (aH).
function paperSetMaterial(tex) {
  const m = new THREE.MeshStandardMaterial({ color: 0xfff0dc, map: tex, roughness: 0.9, side: THREE.DoubleSide });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float aK; attribute float aH; varying float vK; varying float vH;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvK = aK; vH = aH;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vK; varying float vH;').replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float bl = exp(-pow(abs(vH) * 3.2 / 0.28, 2.0));
      totalEmissiveRadiance += vec3(1.0, 0.58, 0.24) * (0.5 + 1.6 * bl) * texture2D(map, vMapUv).rgb * vK;`);
  };
  m.customProgramCacheKey = () => 'kit-hidden-paperset';
  return m;
}

/** entries: [{ L, o: [x, y, z] }] with `o` the lantern centre in the set's frame. */
export function buildLanternSet(ctx, entries, p) {
  const { tier, kitMaterials: km } = ctx;
  const seg = TIER(tier, 20, 12, 7), prof = (tier === 'far' ? PAPER_FAR : PAPER).map(([r, y]) => new THREE.Vector2(r * p.size, y * p.size));
  const statics = [], papers = [], centers = [];
  for (const { L, o } of entries) {
    const lathe = new THREE.LatheGeometry(prof, seg);
    const hs = new Float32Array(lathe.attributes.position.count);
    for (let i = 0; i < hs.length; i++) hs[i] = lathe.attributes.position.getY(i);
    lathe.setAttribute('aH', new THREE.BufferAttribute(hs, 1));
    lathe.setAttribute('aK', new THREE.BufferAttribute(new Float32Array(hs.length), 1));
    lathe.translate(o[0], o[1], o[2]);
    papers.push(lathe);
    const s = p.size, dark = 0x3a2a1c, ring = (r, h, y, hex) => tint(new THREE.CylinderGeometry(r * s, r * s, h * s, Math.max(6, seg - 2), 1).translate(o[0], o[1] + y * s, o[2]), hex);
    statics.push(ring(0.108, 0.035, 0.225, dark), ring(0.1, 0.03, -0.225, dark));
    if (tier !== 'far') statics.push(tint(new THREE.CylinderGeometry(0.016 * s, 0.016 * s, 0.05 * s, 6).translate(o[0], o[1] + 0.26 * s, o[2]), dark));
    if (tier === 'hero') statics.push(tint(new THREE.CylinderGeometry(0.01 * s, 0.004 * s, 0.14 * s, 5).translate(o[0], o[1] - 0.3 * s, o[2]), 0xb03a28));
    const end = [L.string[0] - L.ix + o[0], L.string[1] - L.y + o[1], L.string[2] - L.iz + o[2]];
    statics.push(tint(strut(end, [o[0], o[1] + 0.25 * s, o[2]], 0.0045, 3), 0x4a3a28));
    centers.push(o);
  }
  const frame = new THREE.Mesh(indexed(merge(statics)), leafMaterial(km));
  frame.castShadow = true; frame.name = 'frame';
  const ranges = []; let at = 0;                                   // vertex range per lantern (merge keeps the order)
  for (const g of papers) { ranges.push([at, g.attributes.position.count]); at += g.attributes.position.count; }
  const paperGeo = mergeGeometries(papers);
  const pm = paperSetMaterial(washiTexture(km, { ribs: 9 }));
  const paper = new THREE.Mesh(paperGeo, pm);
  paper.name = 'paper';
  const halos = billboardSet(haloTexture(km), centers, { size: 1.9, color: 0xffc070 });
  halos.mesh.name = 'halos';
  statics.forEach((g) => g.dispose()); papers.forEach((g) => g.dispose());
  const aK = paperGeo.attributes.aK;
  const group = new THREE.Group();
  group.add(frame, paper, halos.mesh);
  return {
    group, parts: { frame, paper, halos: halos.mesh }, live: [paper, halos.mesh],
    update(dt, t, env) {
      const night = nightnessAt(hourOf(env));
      for (let i = 0; i < entries.length; i++) {
        const L = entries[i].L;
        const k = kindle(night, L.onset), fl = 0.9 + Math.sin(t * 6.3 + L.phase) * 0.06 + Math.sin(t * 17 + L.phase) * 0.04;
        const val = 0.1 + k * 1.5 * fl;
        for (let v = ranges[i][0]; v < ranges[i][0] + ranges[i][1]; v++) aK.array[v] = val;
        halos.set(i, k * 0.6 * fl);
      }
      aK.needsUpdate = true; halos.done();
    },
    dispose() { freePrivate([pm, halos.mesh.material]); }
  };
}

/* ------------------------------------------------------------------ seat --- */

export function buildGladeSeat(ctx, L, p) {
  const { tier, rng, kitMaterials: km } = ctx;
  const seed = () => 1 + Math.floor(rng() * 9000);
  const slab = new THREE.Mesh(slabGeometry(seed(), tier, 0.76 * p.size, 0.05, 0.74 * p.size), rockMaterials(km, p.moss).stone);
  slab.position.set(L.x, 0.05, L.z);
  const b = L.boulder, sc = b.scale;
  const bg = fitRock(rockGeometry(seed(), { detail: TIER(tier, 3, 2, 1), h: 0.8, rough: 0.16, ridge: 0.06, cuts: 7, cutDepth: 0.7, flat: 0.25 }), 0.6 * sc[0] * p.size, 0.41 * sc[1] / 0.75, 0.5 * sc[2] * p.size);
  const boulder = new THREE.Mesh(bg, rockMaterials(km, p.moss).stoneDark);
  boulder.position.set(b.x, b.y, b.z);
  for (const m of [slab, boulder]) { m.castShadow = true; m.receiveShadow = true; }
  const group = new THREE.Group();
  group.add(slab, boulder);
  return { group, parts: { slab, boulder }, live: [] };
}

/* ------------------------------------------------------------- fireflies --- */

export function buildFlies(ctx, L, p) {
  const { tier, kitMaterials: km } = ctx;
  const n = Math.max(6, Math.round(L.list.length * TIER(tier, 1, 0.6, 0.35) * p.density));
  const gp = glowPoints(km, n, { size: 0.16, tex: glowTexture(km, 'fly', 'rgba(255,236,150,1)', 'rgba(255,200,90,0.5)'), color: 0xffe9a0 });
  gp.points.name = 'points';
  const fl = L.list.slice(0, n).map((f) => ({ ...f }));
  const step = (dt, t, env) => {
    const strength = sstep(0.5, 1, nightnessAt(hourOf(env)));
    gp.points.visible = strength > 0.01;
    if (!gp.points.visible) return;
    for (let i = 0; i < fl.length; i++) {
      const f = fl[i];
      f.a += dt * f.sp * 0.35;
      const y = f.y + Math.sin(t * f.sp * 2 + f.ph) * 0.35;
      const blink = Math.max(0, Math.sin(t * (1.1 + f.sp * 2.2) + f.ph * 3));       // each one on its own pulse
      gp.set(i, Math.cos(f.a) * f.rr + Math.sin(t * 0.5 + f.ph) * 0.2, y, Math.sin(f.a) * f.rr + Math.cos(t * 0.45 + f.ph) * 0.2, strength * (0.25 + 0.75 * blink * blink));
    }
    gp.done();
  };
  step(0, 0, { hour: 0 });
  return { ...single('points', gp.points), live: [gp.points], update: step, dispose() { freePrivate([gp.points.material]); } };
}

/* ------------------------------------------------------------- the whole --- */

export function buildLanternGlade(ctx, L, p) {
  const entries = L.lanterns.map((l) => ({ L: l, o: [l.ix, l.y, l.iz] }));
  return compose([
    ['floor', buildFloor(ctx, L.floor, { tint: 0xffffff, spread: 1 })],
    ['bamboo', buildBamboo(ctx, L.bamboo, { leaf: 1, height: 1, girth: p.girth })],
    ['lanterns', buildLanternSet(ctx, entries, { size: 1 })],
    ['seat', buildGladeSeat(ctx, L.seat, { size: 1, moss: p.moss }), { x: L.seat.x, y: L.seat.y, z: L.seat.z }],
    ['flies', buildFlies(ctx, L.flies, { density: p.density })]
  ]);
}
