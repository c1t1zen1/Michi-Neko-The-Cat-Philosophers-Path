// The Roof Road's working figures: the takasebune boatman with his pole
// (roof-boatman) and the three seated hoko musicians (roof-hayashi).
//
// Neither is placed by the facade on its own: they ride on a host's boat record
// or float record, classic or kit. buildWorld() (rooftops/js/build.js, the
// `castPass` after each boat / float piece) builds the instance with
// assets.build(id, layout, () => null) and moves its parts into the record's own
// slots, so a classic hull can carry a kit boatman and a kit hull a classic one:
//   roof-boatman  parts.figure -> boat.boatman (the group world.update turns and
//                 tilts, boat-local at 1.55, 0.28, -0.24), parts.pole -> boat.pole
//                 (the pole pivot at 0.04, 0.66, 0 that update swings)
//   roof-hayashi  parts.musician_0..2 -> float.group at the classic positions,
//                 replacing float.musicians[i]; each carries userData.phase / baseY
//                 (update bobs position.y and rotation.z)
// Everything is vertex-coloured on the kit's one `bag` material (km.bag), as the
// residents are, so nothing needs the Roof Road's MAT beyond the resident set.
import * as THREE from 'three';
import { defineAsset } from '../contract.js?v=20261114a';
import { Bag, UNIT } from '../craft.js?v=20261114a';
import { buildResident, residentMats } from './resident.js?v=20261114a';

const ell = (bag, rx, ry, rz, o) => bag.add(UNIT.sphere, { ...o, sx: rx, sy: ry, sz: rz });
const seg = (tier, n) => Math.max(5, Math.round(n * (tier === 'hero' ? 1 : tier === 'mid' ? 0.65 : 0.45)));
const lathe = (pts, n) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n);
const meshOf = (bag, mat, name) => { const m = bag.mesh(mat, name); m.castShadow = m.receiveShadow = true; return m; };

/* ---------------------------------------------------------------- boatman --- */
// Classic: a box, a cone, a ball and a straw cone, and a bare bamboo pole.
// Here: tapered hakama legs and tabi, a belted happi coat with shoulders and
// forearms reaching the pole, a head with a hachimaki towel, a woven kasa with
// rib rings, and a jointed bamboo pole shod with iron. Boat-local, origin at the
// boatman's feet; the pole is built in the pivot's frame (the pole's middle 0.25 m
// below the pivot, 3.8 m long, as the classic one).
function buildBoatman(ctx, layout, p) {
  const t = ctx.tier, n = seg(t, 12), hero = t === 'hero', mat = ctx.kitMaterials.bag({ rough: 0.9 });
  const b = new Bag();
  for (const s of [-1, 1]) {
    b.add(lathe([[0.05, 0.0], [0.065, 0.1], [0.085, 0.3], [0.1, 0.34]], n), { x: s * 0.07, color: 0x2b3a55 });             // hakama legs
    if (hero) ell(b, 0.05, 0.03, 0.09, { x: s * 0.07, y: 0.03, z: 0.03, color: 0xe8dcc0 });                                // tabi
  }
  b.add(lathe([[0.15, 0.3], [0.16, 0.42], [0.13, 0.58], [0.15, 0.68], [0.1, 0.72], [0.05, 0.74]], n), { color: 0x7a4a2a });  // happi coat
  b.add(new THREE.TorusGeometry(0.145, 0.018, 5, n).rotateX(Math.PI / 2), { y: 0.45, color: 0xe3d7b6 });                    // belt
  ell(b, 0.05, 0.06, 0.05, { y: 0.74, color: 0xd9a981 });                                                                    // neck
  ell(b, 0.1, 0.11, 0.1, { y: 0.81, color: 0xd9a981 });                                                                      // head
  if (t !== 'far') {
    b.add(new THREE.TorusGeometry(0.103, 0.017, 5, n).rotateX(Math.PI / 2), { y: 0.86, color: 0xf2efe6 });                   // hachimaki
    for (const s of [-1, 1]) {                                                                                                // arms toward the pole
      b.add(new THREE.CylinderGeometry(0.036, 0.03, 0.34, 6), { x: s * 0.17, y: 0.6, z: 0.08, rx: 1.0, rz: s * 0.12, color: 0x7a4a2a });
      ell(b, 0.04, 0.04, 0.04, { x: s * 0.13, y: 0.5, z: 0.19, color: 0xd9a981 });                                           // hands on the pole
    }
  }
  b.add(new THREE.ConeGeometry(0.27, 0.13, seg(t, 16), 1, true), { y: 0.93, color: 0xc8a96a });                                // kasa
  if (hero) for (const [r, y] of [[0.09, 0.954], [0.17, 0.914], [0.24, 0.881]]) b.add(new THREE.TorusGeometry(r, 0.006, 4, seg(t, 16)).rotateX(Math.PI / 2), { y, color: 0x8a6c3a });
  const figure = meshOf(b, mat, 'figure');
  figure.material.side = THREE.FrontSide;

  const pb = new Bag();
  pb.cyl(0.027, 3.8, { y: -0.25, color: 0x8f9a52 });
  if (t !== 'far') {
    for (let y = -1.9; y <= 1.4; y += 0.55) pb.add(new THREE.TorusGeometry(0.029, 0.007, 4, 8).rotateX(Math.PI / 2), { y: y - 0.25, color: 0x6e7a3a });   // nodes
    pb.cyl(0.032, 0.12, { y: -2.1, color: 0x3d4045 });                                                                     // iron shoe
  }
  const pole = meshOf(pb, mat, 'pole');
  const group = new THREE.Group();
  group.add(figure, pole);
  return { group, parts: { figure, pole }, sockets: {}, live: [], dispose() {} };
}

/* ----------------------------------------------------------------- hayashi --- */
// Three seated musicians: a yokobue flute, a taiko with two bachi, a kane gong.
// Classic: the resident figure with a bare cylinder for a drum or flute. Built in
// the float's live frame at the classic seats (-1.25 + 1.25 i, deckY + 0.04,
// z - 0.34 + 0.16 (i odd)), where z = the piece's depth.
const SEATS = [0, 1, 2];
function instrument(ctx, i, mat) {
  const b = new Bag();
  if (i === 1) {                                                              // taiko
    b.add(new THREE.CylinderGeometry(0.18, 0.18, 0.26, seg(ctx.tier, 16)).rotateX(Math.PI / 2), { x: 0.23, y: 0.38, z: 0.12, color: 0x6e4c30 });
    for (const dz of [-0.14, 0.14]) b.add(new THREE.CylinderGeometry(0.17, 0.17, 0.012, seg(ctx.tier, 16)).rotateX(Math.PI / 2), { x: 0.23, y: 0.38, z: 0.12 + dz, color: 0xe8dcc0 });
    if (ctx.tier === 'hero') for (const s of [-1, 1]) b.cyl(0.012, 0.34, { x: 0.05 + s * 0.12, y: 0.62, z: 0.22, rx: 1.2, rz: s * 0.3, color: 0xe3d7b6 });   // bachi
  } else if (i === 0) {                                                       // yokobue
    b.add(new THREE.CylinderGeometry(0.022, 0.022, 0.58, 6).rotateZ(Math.PI / 2), { y: 0.9, z: 0.25, rz: 0.08, color: 0x8f9a52 });
    if (ctx.tier === 'hero') for (let k = 0; k < 5; k++) b.sphere(0.006, { x: -0.1 + k * 0.06, y: 0.923, z: 0.25, color: 0x2a2017 });
  } else {                                                                    // kane gong on a small stand
    b.add(new THREE.CylinderGeometry(0.11, 0.11, 0.035, seg(ctx.tier, 14)).rotateX(Math.PI / 2), { x: 0.18, y: 0.46, z: 0.2, color: 0xb28538 });
    if (ctx.tier !== 'far') { b.box(0.02, 0.3, 0.02, { x: 0.18, y: 0.3, z: 0.18, color: 0x6e4c30 }); b.cyl(0.01, 0.22, { x: 0.02, y: 0.78, z: 0.22, rx: 1.1, rz: -0.5, color: 0xe3d7b6 }); }
  }
  const m = meshOf(b, mat, 'instrument');
  return m;
}

function buildHayashi(ctx, layout, p) {
  const pc = layout.piece, z = pc.d ?? 0, deckY = pc.deckY ?? 1.1, mat = ctx.kitMaterials.bag({ rough: 0.9 });
  const group = new THREE.Group(), parts = {};
  for (const i of SEATS) {
    const r = buildResident(ctx, { look: 0.18 + i * 0.27, role: 'musician', seated: true, y: 0, d: 0 });
    const person = r.body;
    r.group.remove(person);
    person.position.set(-1.25 + i * 1.25, deckY + 0.04, z - 0.34 + (i % 2) * 0.16);
    r.arms[0].rotation.x = -1.05; r.arms[1].rotation.x = -1.15;
    r.arms[0].rotation.z = -0.35; r.arms[1].rotation.z = 0.35;
    person.add(instrument(ctx, i, mat));
    person.userData.phase = i * 1.9;
    person.userData.baseY = person.position.y;
    group.add(person);
    parts[`musician_${i}`] = person;
  }
  return { group, parts, sockets: {}, live: [], dispose() {} };
}

const PARAMS = {};
export const castAssets = [
  defineAsset({ id: 'roof-boatman', family: 'roofcast', label: 'Takasebune boatman and pole', params: PARAMS, tiers: ['hero', 'mid', 'far'],
    sample: () => ({ index: 0, type: 'boat', x: 0, y: 0, z: 0, ry: 0, band: 'near', piece: { plat: 'boat1', d: 2.65, y: 1.28, s0: -11, s1: 11 } }), build: buildBoatman }),
  defineAsset({ id: 'roof-hayashi', family: 'roofcast', label: 'Hoko hayashi musicians', params: PARAMS, tiers: ['hero', 'mid', 'far'], floating: ['musician_0', 'musician_1', 'musician_2'],
    sample: () => ({ index: 0, type: 'float', x: 0, y: 0, z: 0, ry: 0, band: 'near', piece: { type: 'float', d: 0.4, deckY: 1.1, s0: -4, s1: 4 } }), build: buildHayashi })
];
export { residentMats };
