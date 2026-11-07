// What stands on the ground: the machiya frontage and its eave (the reason
// for the amaochi), inuyarai, the stone gutter, the engawa, the tsukubai's
// bamboo spout, the maple and the pine (the game's own canopy kit), the
// valley beyond, and a cutaway skirt that shows what lies under each surface.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { plasterTextures, woodTextures, kawaraTextures, barkTextures, groundTextures, texturedMaterial } from '../../shared/game.js';
import { weatherPatch } from './stones.js';
import { LAYOUT, laneZ } from './scene.js';
import { mulberry32, fbm, vnoise, sstep } from './util.js';

const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

/* ---------------- machiya ---------------- */

export function buildMachiya(U) {
  const L = LAYOUT, g = new THREE.Group();
  g.name = 'Machiya frontage';
  const x0 = -8.6, x1 = L.houseX1, z = L.wallZ;
  const plaster = weatherPatch(texturedMaterial(plasterTextures(0xe8dcc2, 3), { roughness: 0.95, normalScale: 0.5 }), U, { porosity: 0.7, snow: 0.4 });
  const plasterUp = weatherPatch(texturedMaterial(plasterTextures(0xddcfb2, 4), { roughness: 0.95, normalScale: 0.5 }), U, { porosity: 0.7, snow: 0.4 });
  const wood = weatherPatch(texturedMaterial(woodTextures(0x3f2c1f, 0x1d130c, 5), { roughness: 0.82, normalScale: 0.8 }), U, { porosity: 0.5 });
  const woodLight = weatherPatch(texturedMaterial(woodTextures(0x6b4c33, 0x2e1f14, 6), { roughness: 0.8 }), U, { porosity: 0.5 });
  const tile = weatherPatch(texturedMaterial(kawaraTextures(0x5a636b, 7), { roughness: 0.55, normalScale: 0.9 }), U, { porosity: 0.15, snow: 1.3 });
  const span = x1 - x0;
  const walls = [], posts = [], boards = [], slats = [], dark = [];
  // ground floor: plaster over a koshi-ita skirt of boards, posts every ken (1.82 m)
  walls.push(box(span, 1.55, 0.16, (x0 + x1) / 2, 0.85 + 0.78, z - 0.08));
  boards.push(box(span, 0.85, 0.12, (x0 + x1) / 2, 0.42, z - 0.04));
  for (let x = x0 + 0.3; x <= x1 + 0.01; x += 1.82) posts.push(box(0.13, 2.5, 0.15, Math.min(x, x1 - 0.07), 1.25, z));
  // sen-bon kōshi: a "thousand slat" lattice in front of the shop window
  const kx0 = -7.2, kx1 = -4.3;
  dark.push(box(kx1 - kx0, 1.05, 0.05, (kx0 + kx1) / 2, 1.42, z + 0.02));
  for (let x = kx0 + 0.02; x < kx1; x += 0.052) slats.push(box(0.026, 1.12, 0.035, x, 1.42, z + 0.09));
  slats.push(box(kx1 - kx0 + 0.06, 0.05, 0.06, (kx0 + kx1) / 2, 0.88, z + 0.09), box(kx1 - kx0 + 0.06, 0.05, 0.06, (kx0 + kx1) / 2, 1.97, z + 0.09));
  // a second kōshi, the doorway between
  const k2 = [-1.25, 0.55];
  dark.push(box(k2[1] - k2[0], 1.05, 0.05, (k2[0] + k2[1]) / 2, 1.42, z + 0.02));
  for (let x = k2[0] + 0.02; x < k2[1]; x += 0.052) slats.push(box(0.026, 1.12, 0.035, x, 1.42, z + 0.09));
  dark.push(box(1.5, 2.05, 0.08, L.door.x, 1.02, z + 0.04));
  // the eave: a tiled skirt roof (hisashi) out to the drip line
  const ez0 = z - 0.05, ez1 = L.dripZ - 0.05, eyIn = 3.02, eyOut = L.eaveY;
  const len = Math.hypot(ez1 - ez0, eyOut - eyIn), ang = Math.atan2(eyIn - eyOut, ez1 - ez0);
  const roof = new THREE.BoxGeometry(span + 0.4, 0.07, len + 0.12);
  roof.rotateX(ang); roof.translate((x0 + x1) / 2, (eyIn + eyOut) / 2 + 0.05, (ez0 + ez1) / 2);
  const roofUnder = new THREE.BoxGeometry(span + 0.4, 0.03, len + 0.1);
  roofUnder.rotateX(ang); roofUnder.translate((x0 + x1) / 2, (eyIn + eyOut) / 2 - 0.02, (ez0 + ez1) / 2);
  const rafters = [];
  for (let x = x0; x <= x1 + 0.2; x += 0.36) {
    const r = new THREE.BoxGeometry(0.05, 0.06, len + 0.16);
    r.rotateX(ang); r.translate(x, (eyIn + eyOut) / 2 - 0.05, (ez0 + ez1) / 2 + 0.03);
    rafters.push(r);
  }
  // nokigawara: the round tile ends along the drip edge
  const ends = [];
  for (let x = x0 - 0.15; x <= x1 + 0.2; x += 0.27) {
    const c = new THREE.CylinderGeometry(0.075, 0.075, 0.05, 14, 1, false, 0, Math.PI);
    c.rotateX(Math.PI / 2); c.rotateZ(Math.PI / 2 + Math.PI / 2);
    c.translate(x, eyOut + 0.1, ez1 + 0.09);
    ends.push(c);
  }
  const fascia = box(span + 0.4, 0.09, 0.04, (x0 + x1) / 2, eyOut + 0.02, ez1 + 0.06);
  // upstairs: a low plaster storey with mushiko-mado (slotted clay windows)
  walls.push(box(span, 1.5, 0.18, (x0 + x1) / 2, 3.6, z - 0.62));
  for (const wx of [-6.6, -3.3, -0.4]) {
    dark.push(box(1.3, 0.55, 0.05, wx, 3.55, z - 0.5));
    for (let x = wx - 0.6; x <= wx + 0.61; x += 0.1) walls.push(box(0.05, 0.56, 0.06, x, 3.55, z - 0.47));
  }
  const top = new THREE.BoxGeometry(span + 0.6, 0.08, 1.4);
  top.rotateX(-0.42); top.translate((x0 + x1) / 2, 4.55, z - 0.2);
  const add = (geos, mat, name, cast = true) => {
    const m = new THREE.Mesh(mergeGeometries(geos.map((x) => x.index ? x.toNonIndexed() : x)), mat);
    m.name = name; m.castShadow = cast; m.receiveShadow = true;
    g.add(m);
    return m;
  };
  add(walls, plaster, 'Plaster');
  add(boards.concat(posts, rafters, [fascia]), wood, 'Timber');
  add(slats, woodLight, 'Kōshi');
  add(dark, new THREE.MeshStandardMaterial({ color: 0x14100d, roughness: 1 }), 'Interior dark');
  add([roof, top].concat(ends), tile, 'Kawara');
  add([roofUnder], wood, 'Eave soffit');
  g.add(noren(L.door.x, z + 0.14));
  return g;
}

function noren(x, z) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 192;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#23345a'; ctx.fillRect(0, 0, 256, 192);
  for (let i = 0; i < 1800; i++) { ctx.fillStyle = `rgba(${10 + Math.random() * 30},${20 + Math.random() * 30},${50 + Math.random() * 40},0.25)`; ctx.fillRect(Math.random() * 256, Math.random() * 192, 1, 3); }
  ctx.strokeStyle = '#efe8d8'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.arc(128, 92, 34, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#efe8d8'; ctx.font = '600 44px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('魚', 128, 94);
  for (const sx of [85, 171]) { ctx.fillStyle = '#152238'; ctx.fillRect(sx - 2, 0, 4, 192); }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.PlaneGeometry(1.35, 0.95, 12, 6);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 11) * 0.012 * (0.5 - p.getY(i)));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, side: THREE.DoubleSide }));
  m.position.set(x, 1.62, z);
  m.castShadow = true;
  m.name = 'Noren';
  return m;
}

/** inuyarai: curved bamboo slats that keep splashes and dogs off the wall (≈ 60 cm high) */
export function buildInuyarai(U) {
  const L = LAYOUT, z = L.wallZ;
  const geos = [];
  const runs = [[-7.55, -3.35], [-1.6, 0.85]];
  for (const [a, b] of runs) {
    for (let x = a; x <= b; x += 0.038) {
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x, 0.64, z + 0.03), new THREE.Vector3(x, 0.08, z + 0.06), new THREE.Vector3(x, 0.0, z + 0.44));
      geos.push(new THREE.TubeGeometry(curve, 8, 0.0085, 4, false));
    }
    for (const t of [0.18, 0.5, 0.82]) {
      const q = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.64, z + 0.03), new THREE.Vector3(0, 0.08, z + 0.06), new THREE.Vector3(0, 0.0, z + 0.44)).getPoint(t);
      geos.push(new THREE.CylinderGeometry(0.012, 0.012, b - a + 0.08, 6).rotateZ(Math.PI / 2).translate((a + b) / 2, q.y, q.z + 0.012));
    }
  }
  const mat = weatherPatch(new THREE.MeshStandardMaterial({ color: 0x3b2a1c, roughness: 0.5, metalness: 0 }), U, { porosity: 0.2, snow: 0.8 });
  const m = new THREE.Mesh(mergeGeometries(geos.map((x) => x.toNonIndexed())), mat);
  m.castShadow = true; m.receiveShadow = true; m.name = 'Inuyarai';
  return m;
}

/** the gutter's water: a narrow flowing strip, a little higher after rain */
export function buildGutter(U) {
  const G = LAYOUT.gutter;
  const geo = new THREE.PlaneGeometry(G.x1 - G.x0, G.half * 1.6, 120, 2);
  geo.rotateX(-Math.PI / 2);
  geo.translate((G.x0 + G.x1) / 2, 0, G.z);
  const mat = new THREE.MeshStandardMaterial({ color: 0x24302c, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.88 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      { vec2 q = vViewPosition.xy; float t = uTime;
        vec3 w = (viewMatrix * vec4(sin(gl_FragCoord.x * .05 - t * 6.) * .08, 1., cos(gl_FragCoord.y * .07 + gl_FragCoord.x * .02 - t * 5.) * .08, 0.)).xyz;
        normal = normalize(normal + w - (viewMatrix * vec4(0., 1., 0., 0.)).xyz); }`);
  };
  const m = new THREE.Mesh(geo, mat);
  m.name = 'Gutter water';
  m.position.y = -G.depth + 0.035;
  m.receiveShadow = true;
  return m;
}

/** the engawa: a timber veranda with the kutsunugi-ishi below it */
export function buildEngawa(U) {
  const E = LAYOUT.engawa;
  const wood = weatherPatch(texturedMaterial(woodTextures(0x8a6a4a, 0x4a3524, 9), { roughness: 0.7, normalScale: 0.6 }), U, { porosity: 0.4 });
  const dark = weatherPatch(texturedMaterial(woodTextures(0x4a3424, 0x22160e, 10), { roughness: 0.8 }), U, { porosity: 0.4 });
  const boards = [], frame = [];
  for (let x = E.x0 + 0.06; x < E.x1; x += 0.16) boards.push(box(0.15, 0.03, E.z1 - E.z0 + 0.4, x + 0.075, E.y, (E.z0 + E.z1) / 2 + 0.2));
  frame.push(box(E.x1 - E.x0, 0.1, 0.1, (E.x0 + E.x1) / 2, E.y - 0.065, E.z0 + 0.05));
  for (let x = E.x0 + 0.4; x < E.x1; x += 1.82) frame.push(box(0.1, E.y, 0.1, x, E.y / 2, E.z0 + 0.08), box(0.12, 0.06, 0.12, x, 0.03, E.z0 + 0.08));
  frame.push(box(0.12, 2.6, 0.12, E.x1 - 0.06, 1.3, E.z0 + 0.08));
  const g = new THREE.Group();
  g.name = 'Engawa';
  const a = new THREE.Mesh(mergeGeometries(boards.map((x) => x.toNonIndexed())), wood);
  const b = new THREE.Mesh(mergeGeometries(frame.map((x) => x.toNonIndexed())), dark);
  for (const m of [a, b]) { m.castShadow = true; m.receiveShadow = true; g.add(m); }
  return g;
}

/** kakei: a bamboo spout feeding the tsukubai, and its trickle */
export function buildKakei(U) {
  const T = LAYOUT.tsukubai, g = new THREE.Group();
  g.name = 'Kakei';
  const mat = weatherPatch(new THREE.MeshStandardMaterial({ color: 0x8f8a4c, roughness: 0.45 }), U, { porosity: 0.1 });
  const sx = T.x + 0.12, sz = T.z - 0.05, sy = 0.62;
  const ex = T.x + 0.95, ey = 0.74, ez = T.z - 0.55;
  const dir = new THREE.Vector3(ex - sx, ey - sy, ez - sz);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.03, dir.length(), 10), mat);
  m.position.set((sx + ex) / 2, (sy + ey) / 2, (sz + ez) / 2);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  const legs = [];
  for (const s of [-1, 1]) legs.push(new THREE.CylinderGeometry(0.018, 0.02, 0.92, 8).rotateZ(s * 0.22).translate(ex - 0.15 + s * 0.08, 0.42, ez + 0.02));
  const lg = new THREE.Mesh(mergeGeometries(legs.map((x) => x.toNonIndexed())), mat);
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.004, sy - 0.36, 6, 1, true), new THREE.MeshStandardMaterial({ color: 0xcfe0e6, roughness: 0.05, transparent: true, opacity: 0.55 }));
  tr.position.set(sx - 0.03, (sy + 0.36) / 2, sz);
  tr.name = 'Trickle';
  for (const x of [m, lg]) { x.castShadow = true; x.receiveShadow = true; g.add(x); }
  g.add(tr);
  g.userData.trickle = tr;
  return g;
}

/* ---------------- trees from the game's canopy kit ---------------- */

const LEAF_COLS = {
  spring: [0x6a9a36, 0x86b445, 0xa3c95a, 0xbcd96e],
  summer: [0x2f4f1c, 0x3f6626, 0x5a8536, 0x7aa348],
  autumn: [0x8e2d20, 0xc24a34, 0xe0704a, 0xf09060],
  winter: [0x6a3a24, 0x8a4a2c, 0x9a5a34, 0xa8693c]
};
const PINE = [0x24401f, 0x33582f, 0x4a7040, 0x5f8850];

export class Trees {
  constructor(F, U) {
    this.F = F;
    this.group = new THREE.Group();
    this.group.name = 'Trees';
    const bark = texturedMaterial(barkTextures(0x5d4636, 0x231811, 1), { roughness: 0.95, normalScale: 1.2 });
    this.trunkMat = bark;
    this.branchMat = F.createBranchMaterial(bark, { wind: 1.1 });
    this.branchDepth = F.createFoliageDepthMaterial(null, 0, { flex: true, wind: 1.1 });
    this.sets = {};
    for (const [kind, o] of Object.entries({ maple: { sss: 0.46, mottle: 0.16, bump: 0.32 }, needle: { sss: 0.22, mottle: 0.2, bump: 0.36 } })) {
      const map = F.leafSprayTexture(kind);
      this.sets[kind] = {
        material: F.createFoliageMaterial(Object.assign({ map, alphaTest: 0.5, side: THREE.DoubleSide, flex: true, twoSided: true, wind: 1.1 }, o)),
        depth: F.createFoliageDepthMaterial(map, 0.5, { flex: true, wind: 1.1 })
      };
    }
    this.maple = null;
    this.season = null;
    const L = LAYOUT;
    this._trunk(L.maple.x, L.maple.z, 0.11 * 1.2, 0.21 * 1.2, 2.0 * 1.2, 0.12);
    this._trunk(L.pine.x, L.pine.z, 0.1 * 1.25, 0.19 * 1.25, 1.9 * 1.25, -0.22);
    this.pine = this._canopy('needle', L.pine.x, L.pine.z, 1.25, PINE, 37,
      { trunkH: 1.9, trunkR: 0.11, primaries: 4, tilt: 1.05, tiltVar: 0.28, droop: 0.12, bend: 0.06, branchLen: 1.45, secondaries: 2, habit: 'pad', sprayLen: 0.38, sprayAspect: 1, padSprays: 46, padR: 0.55 }, 2.1);
    this.footprints = [{ x: L.maple.x, z: L.maple.z, r: 0.18 }, { x: L.pine.x, z: L.pine.z, r: 0.18 }];
  }
  _trunk(x, z, rTop, rBot, h, lean) {
    const g = new THREE.CylinderGeometry(rTop, rBot, h, 12, 6);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) + h / 2, t = y / h;
      p.setX(i, p.getX(i) * (1 + Math.max(0, 0.35 - t) * 1.6) + lean * t * t * h * 0.4);
      p.setZ(i, p.getZ(i) * (1 + Math.max(0, 0.35 - t) * 1.6));
    }
    g.translate(0, h / 2 - 0.05, 0);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, this.trunkMat);
    m.position.set(x, 0, z);
    m.castShadow = m.receiveShadow = true;
    this.group.add(m);
  }
  _canopy(kind, x, z, scale, colors, seed, opts, rotY = 0) {
    const built = this.F.buildCanopy(mulberry32(seed), Object.assign({ scale, colors, style: 'leaves' }, opts));
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    const br = new THREE.Mesh(built.branches, this.branchMat);
    br.customDepthMaterial = this.branchDepth;
    const cards = new THREE.Mesh(built.cards, this.sets[kind].material);
    cards.customDepthMaterial = this.sets[kind].depth;
    for (const m of [br, cards]) { m.castShadow = true; m.receiveShadow = true; g.add(m); }
    g.userData.cards = cards;
    this.group.add(g);
    return g;
  }
  setSeason(season) {
    if (season === this.season) return;
    this.season = season;
    if (this.maple) {
      this.group.remove(this.maple);
      this.maple.traverse((o) => o.geometry?.dispose());
    }
    const L = LAYOUT;
    this.maple = this._canopy('maple', L.maple.x, L.maple.z, 1.2, LEAF_COLS[season], 23,
      { trunkH: 2.0, trunkR: 0.11 * 1.15, primaries: 5, tilt: 1.02, tiltVar: 0.18, droop: 0.05, bend: 0.1, branchLen: 1.3, secondaries: 2, habit: 'tier', twigsPerLimb: 3, sprigs: 3, sprayLen: 0.44, density: season === 'winter' ? 3 : 20, tipSprays: season === 'winter' ? 1 : 4 }, 0.6);
  }
  /** where leaves fall from: points in the maple's crown */
  crown(rnd) {
    const L = LAYOUT, a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 2.3;
    return [L.maple.x + Math.cos(a) * r, 2.4 + rnd() * 1.6, L.maple.z + Math.sin(a) * r];
  }
}

/* ---------------- the valley beyond, and the cutaway ---------------- */

/** a ring of the game's painted leaf-mass trees on the hills, merged per material */
export function buildBackdropTrees(F, heightAt) {
  const rng = mulberry32(5), g = new THREE.Group();
  g.name = 'Backdrop trees';
  const mats = {
    leaf: F.createFoliageMaterial({ sss: 0.3, wind: 0.6, mottle: 0.22, bump: 0.4, massMap: F.leafMassTexture('leaf'), massScale: 1 / 1.1, ragged: 1 }),
    needle: F.createFoliageMaterial({ sss: 0.18, wind: 0.4, mottle: 0.24, bump: 0.4, massMap: F.leafMassTexture('needle'), massScale: 1 / 1.2, ragged: 1 })
  };
  const bark = new THREE.MeshStandardMaterial({ color: 0x4a3a2e, roughness: 1 });
  const geos = { leaf: [], needle: [], bark: [] };
  for (let i = 0; i < 46; i++) {
    const a = rng() * Math.PI * 2, r = 19 + rng() * 34;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x) < 10 && Math.abs(z) < 8) continue;
    const kind = rng() < 0.4 ? 'needle' : 'leaf';
    const s = 1.6 + rng() * 1.8;
    const built = F.buildCanopy(rng, {
      style: 'masses', scale: s, trunkH: 1.6, trunkR: 0.12, primaries: 4 + Math.floor(rng() * 3), tilt: 0.8, tiltVar: 0.25, droop: kind === 'needle' ? 0.1 : -0.02,
      bend: 0.1, branchLen: 1.1, secondaries: 2, twigs: false, crownFill: 3, clumpR: kind === 'needle' ? 0.5 : 0.44,
      colors: kind === 'needle' ? [0x24401f, 0x33582f, 0x4a7040, 0x5f8850] : [0x2f4f1c, 0x3f6626, 0x5a8536, 0x7aa348],
      tuftsPerClump: [3, 3, 2], tuftFlat: kind === 'needle' ? 0.45 : 0.74, pad: kind === 'needle', lump: 0.38, seed: i + 3
    });
    const m = new THREE.Matrix4().makeRotationY(rng() * 6.3).setPosition(x, heightAt(x, z) - 0.2, z);
    geos[kind].push(built.tufts.applyMatrix4(m));
    geos.bark.push(built.branches.applyMatrix4(m));
  }
  for (const [k, list] of Object.entries(geos)) {
    if (!list.length) continue;
    const mesh = new THREE.Mesh(mergeGeometries(list.map((x) => (x.index ? x.toNonIndexed() : x))), k === 'bark' ? bark : mats[k]);
    mesh.castShadow = false; mesh.receiveShadow = true;
    g.add(mesh);
  }
  return g;
}

export function buildSurroundings(U) {
  const g = new THREE.Group();
  g.name = 'Valley beyond';
  const size = 140, seg = 70;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position, col = [];
  const c = new THREE.Color(), a = new THREE.Color(0x60784a), b = new THREE.Color(0x7d8a52), dk = new THREE.Color(0x3a4d34), haze = new THREE.Color(0x9aa8a0);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), d = Math.max(Math.abs(x) / 8.6, Math.abs(z) / 6.6);
    const r = Math.hypot(x, z);
    // under the stage the floor drops away: ruts, the ditch and the gutter go deeper than it
    const under = Math.abs(x) < 7.99 && Math.abs(z) < 5.99;
    p.setY(i, under ? -0.7 : -0.035 - sstep(1, 1.4, d) * 0.02 + sstep(30, 70, r) * (fbm(x * 0.03, z * 0.03, 3) * 14));
    c.copy(a).lerp(b, fbm(x * 0.05, z * 0.05, 3)).lerp(dk, sstep(14, 40, r) * 0.6 * fbm(x * 0.09 + 4, z * 0.09, 2) * 2);
    const l = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b, k = 0.3 / Math.max(0.05, l);
    c.multiplyScalar(k).lerp(haze, sstep(24, 75, r) * 0.45);
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mat = texturedMaterial(groundTextures(6), { roughness: 0.96, normalScale: 0.7, repeat: [size / 3.2, size / 3.2] });
  mat.vertexColors = true;
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  m.name = 'Valley floor';
  g.add(m);
  g.userData.heightAt = (x, z) => -0.035 + sstep(30, 70, Math.hypot(x, z)) * fbm(x * 0.03, z * 0.03, 3) * 14;
  return g;
}

// what lies under each surface, top down: [thickness m, colour]
const STRATA = {
  paving: [[0.08, 0x8d8a83], [0.03, 0xcdbf9f], [0.16, 0x74716c]],
  gravel: [[0.13, 0x8a857c], [0.06, 0x6c675f]],
  sand: [[0.06, 0xdcd6c8], [0.1, 0x8a857c]],
  tataki: [[0.1, 0x8e6a4f], [0.08, 0x6c5a48]],
  moss: [[0.03, 0x3f5a26], [0.13, 0x3a2d22]],
  grass: [[0.05, 0x4d6a2e], [0.14, 0x3e3023]],
  wild: [[0.06, 0x4d6a2e], [0.14, 0x3e3023]],
  needles: [[0.04, 0x8a6538], [0.12, 0x3a2d22]],
  earth: [[0.09, 0xa8916f], [0.08, 0x8f7556]]
};
const SUB = [[0.22, 0xb59466], [0.2, 0xc4a070], [0.4, 0x8a8178]];

/** A cutaway skirt round the stage: the strata under each surface, as a painter's section. */
export function buildSkirt(field) {
  const pos = [], col = [];
  const c = new THREE.Color();
  const N = 220, bottom = -0.95;
  const { x0, z0, w, d } = field;
  const edges = [
    (t) => [x0 + t * w, z0 + d - 0.001, 0, 0, 1], (t) => [x0 + w - 0.001, z0 + d - t * d, 1, 0, 0],
    (t) => [x0 + w - t * w, z0 + 0.001, 0, 0, -1], (t) => [x0 + 0.001, z0 + t * d, -1, 0, 0]
  ];
  for (const edge of edges) {
    let prev = null;
    for (let i = 0; i <= N; i++) {
      const [x, z] = edge(i / N);
      const top = field.heightAt(x, z), mat = field.surfaceAt(x, z).mat;
      const bands = [];
      let y = top;
      for (const [th, hex] of (STRATA[mat] || STRATA.earth).concat(SUB)) { bands.push([y, y - th, hex]); y -= th; }
      bands.push([y, bottom, 0x6e665e]);
      if (prev) {
        const n = Math.min(prev.bands.length, bands.length);
        for (let k = 0; k < n; k++) {
          const [a0, a1, hexA] = prev.bands[k], [b0, b1] = bands[k];
          const jitter = (vnoise(x * 3 + k, z * 3) - 0.5) * 0.08;
          c.set(hexA).multiplyScalar(0.92 + jitter);
          pos.push(prev.x, a0, prev.z, x, b0, z, x, b1, z, prev.x, a0, prev.z, x, b1, z, prev.x, a1, prev.z);
          for (let q = 0; q < 6; q++) col.push(c.r, c.g, c.b);
        }
      }
      prev = { x, z, bands };
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }));
  m.name = 'Cutaway strata';
  m.receiveShadow = true;
  return m;
}
