// The room itself: tatami floor, walls and timber frame, the shoji entrance,
// the tokonoma alcove with its scroll, and the chabudai. Each builder takes the
// classic layout's sub-record `L` (defaults are the classic numbers, so a
// sparse sample still builds) and returns a Group of named meshes, local to
// the frame the classic builders used (see each header).
import * as THREE from 'three';
import { Bag } from '../craft.js?v=20261113a';
import { TexBag, roomMats, bagMesh, groupOf, tierFlags, paperMat, paintingTexture } from './common.js?v=20261113a';

const MATS = [[-1.25, 0.04, -1.25, false], [1.25, 0.04, -1.25, false], [-1.25, 0.04, 1.25, false], [1.25, 0.04, 1.25, false], [-2.5, 0.04, 0, true], [2.5, 0.04, 0, true]];

/** Eight-mat floor (six slabs): rush faces, the doko under them, brocade heri along the long edges. Room frame. */
export function buildTatami(ctx, L = {}, tier = 'hero') {
  const { far } = tierFlags(tier), m = roomMats(ctx);
  const mat = L.mat || { w: 1.25, l: 2.5, h: 0.08 }, list = L.mats || MATS;
  const face = new TexBag(m.tatami), trim = new Bag();
  for (const [mx, my, mz, rot] of list) {
    const w = rot ? mat.l : mat.w, d = rot ? mat.w : mat.l;
    face.box(w - 0.04, mat.h, d - 0.04, mx, my, mz);
    if (far) continue;
    trim.box(w, mat.h * 0.8, d, { x: mx, y: my - 0.01, z: mz, color: 0x2a3322 });      // doko showing in the joints
    const zLong = d >= w, run = (zLong ? d : w) - 0.07, off = (zLong ? w : d) / 2 - 0.05, y = my + mat.h / 2 + 0.0015;
    for (const s of [-1, 1]) {
      const o = s * off, o2 = s * (off - 0.03);
      trim.box(zLong ? 0.05 : run, 0.003, zLong ? run : 0.05, { x: mx + (zLong ? o : 0), y, z: mz + (zLong ? 0 : o), color: 0x323f2a });
      trim.box(zLong ? 0.006 : run, 0.0035, zLong ? run : 0.006, { x: mx + (zLong ? o2 : 0), y: y + 0.0003, z: mz + (zLong ? 0 : o2), color: 0x9a9560 });   // the pale brocade line
    }
  }
  return groupOf('Tatami Floor', face.mesh('mats'), bagMesh(trim, m.bag, 'heri', false));
}

/** Walls, ceiling, beams, posts: the classic boxes plus rails, skirting and the two openings closed above. Room frame. */
export function buildFrame(ctx, L = {}, tier = 'hero') {
  const { hi, far } = tierFlags(tier), m = roomMats(ctx);
  const H = L.size ? L.size[1] : 3.6, beams = L.beams || [-3, -1, 1, 3], posts = L.posts || [-4.1, 4.1, -3.6, 3.6];
  const plaster = new TexBag(m.plaster), timber = new TexBag(m.timber), floor = new TexBag(m.engawa), trim = new Bag();
  if (!far) floor.box(8.2, 0.1, 7.2, 0, 0.02, 0);
  plaster.box(8.4, H, 0.3, 0, H / 2, -3.6);
  plaster.box(0.3, H, 7.2, -4.1, H / 2, 0);
  plaster.box(0.3, H, 2, 4.1, H / 2, -2.6);
  plaster.box(0.3, H, 2, 4.1, H / 2, 2.6);
  plaster.box(2.8, H, 0.3, -2.7, H / 2, 3.6);
  plaster.box(2.8, H, 0.3, 2.7, H / 2, 3.6);
  plaster.box(2.6, H - 2.2, 0.3, 0, 2.2 + (H - 2.2) / 2, 3.6);        // above the entrance (open in the classic room)
  plaster.box(0.3, H - 2.3, 3.2, 4.1, 2.3 + (H - 2.3) / 2, 0);        // above the engawa opening
  timber.box(8.4, 0.2, 7.4, 0, H, 0);
  for (const bx of beams) timber.box(0.2, 0.28, 7.2, bx, H - 0.14, 0);
  for (const sx of [posts[0], posts[1]]) for (const sz of [posts[2], posts[3]]) timber.box(0.35, H, 0.35, sx, H / 2, sz);
  if (!far) {
    const dark = 0x2b1b10, mid = 0x4a3220, y = 2.35;
    trim.box(7.9, 0.13, 0.08, { x: 0, y, z: -3.41, color: dark });                                     // nageshi, back
    trim.box(0.08, 0.13, 7.0, { x: -3.91, y, z: 0, color: dark });                                     // left
    for (const s of [-1, 1]) trim.box(2.7, 0.13, 0.08, { x: s * 2.65, y, z: 3.41, color: dark });      // front, both sides of the door
    trim.box(2.7, 0.12, 0.1, { x: 0, y: 2.26, z: 3.4, color: dark });                                  // kamoi over the door
    trim.box(0.12, 0.2, 3.3, { x: 3.9, y: 2.3, z: 0, color: dark });                                   // lintel of the engawa opening
    trim.box(7.9, 0.1, 0.04, { x: 0, y: 0.13, z: -3.43, color: mid });                                 // skirting (habaki)
    trim.box(0.04, 0.1, 7.0, { x: -3.93, y: 0.13, z: 0, color: mid });
    for (const sx of [posts[0], posts[1]]) for (const sz of [posts[2], posts[3]]) trim.box(0.43, 0.07, 0.43, { x: sx, y: 0.115, z: sz, color: 0x6c685e });   // stone post bases
    if (hi) for (let i = 0; i < 16; i++) trim.box(0.05, 0.03, 7.2, { x: -3.75 + i * 0.5, y: H - 0.115, z: 0, color: 0x2e1d12 });   // ceiling battens
  }
  return groupOf('Room Frame', plaster.mesh('walls'), timber.mesh('timber'), floor.mesh('border'), bagMesh(trim, m.bag, 'trim', false));
}

/** The entrance: two overlapping shoji leaves on a track, kumiko lattice, kick boards, lit paper. Local origin on the sill, centred in the wall. */
export function buildDoor(ctx, L = {}, tier = 'hero') {
  const { hi, far } = tierFlags(tier), m = roomMats(ctx);
  const W = 2.6, H = 2.2, lw = W / 2, wood = new Bag(), panes = [];
  const light = 0x9c7a54, kick = 0x7a5a3a;
  wood.box(W + 0.24, 0.05, 0.1, { y: 0.025, color: 0x2b1b10 });                                         // sill track
  const leaf = (cx, z) => {
    for (const s of [-1, 1]) wood.box(0.05, H - 0.1, 0.045, { x: cx + s * (lw / 2 - 0.025), y: H / 2, z, color: light });
    wood.box(lw, 0.07, 0.045, { x: cx, y: H - 0.035, z, color: light });
    wood.box(lw, 0.09, 0.045, { x: cx, y: 0.095, z, color: light });
    wood.box(lw - 0.1, 0.34, 0.03, { x: cx, y: 0.3, z, color: kick });
    const y0 = 0.5, y1 = H - 0.07;
    const pane = new THREE.PlaneGeometry(lw - 0.1, y1 - y0);
    pane.translate(cx, (y0 + y1) / 2, z);
    panes.push(pane);
    if (far) return;
    const nx = hi ? 4 : 2, ny = hi ? 8 : 4;
    for (let i = 1; i < nx; i++) wood.box(0.012, y1 - y0, 0.02, { x: cx - (lw - 0.1) / 2 + i * (lw - 0.1) / nx, y: (y0 + y1) / 2, z: z + 0.004, color: light });
    for (let j = 1; j < ny; j++) wood.box(lw - 0.1, 0.012, 0.02, { x: cx, y: y0 + j * (y1 - y0) / ny, z: z + 0.004, color: light });
  };
  leaf(-lw / 2, 0.035);
  leaf(lw / 2, -0.035);
  const paper = new THREE.Mesh(mergePanes(panes), paperMat(ctx));
  paper.name = 'paper'; paper.receiveShadow = true;
  return groupOf('Exit Door', bagMesh(wood, m.bag, 'frame'), paper);
}

function mergePanes(list) {
  const g = new THREE.BufferGeometry();
  const pos = [], uv = [], nor = [], idx = [];
  for (const p of list) {
    const base = pos.length / 3;
    pos.push(...p.attributes.position.array); uv.push(...p.attributes.uv.array); nor.push(...p.attributes.normal.array);
    for (const i of p.index.array) idx.push(base + i);
    p.dispose();
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** The alcove: raised floor board, earthen back wall, tokobashira, otoshigake. Room frame (the recess is at z -3). */
export const EARTHS = { ochre: 0xc4a074, umber: 0x9a7a58, ash: 0xb8b2a2 };
export function buildTokonoma(ctx, L = {}, tier = 'hero', o = {}) {
  const { far } = tierFlags(tier), m = roomMats(ctx);
  const floor = new TexBag(m.timber).box(3.2, 0.22, 1.2, 0, 0.11, -3.0), trim = new Bag();
  trim.box(3.2, 2.98, 0.02, { x: 0, y: 0.22 + 1.49, z: -3.44, color: EARTHS[o.earth] || EARTHS.ochre });                       // the earthen wall (tsuchikabe)
  if (!far) {
    trim.box(3.4, 0.18, 0.16, { x: 0, y: 3.15, z: -2.45, color: 0x3b2616 });                           // otoshigake
    trim.cyl(0.07, 2.93, { x: 1.62, y: 0.22 + 1.465, z: -2.46, color: 0x6b4a2e });                     // tokobashira, a natural post
    trim.box(3.2, 0.03, 0.05, { x: 0, y: 0.235, z: -2.405, color: 0x7a5a3a });                         // kamachi
  }
  return groupOf('Tokonoma Alcove', floor.mesh('floor'), bagMesh(trim, m.bag, 'trim', false));
}

/** Kakejiku. Local origin: the bottom of the lower roller on the wall (y up the scroll). */
export function buildScroll(ctx, L = {}, tier = 'hero') {
  const { hi, far } = tierFlags(tier), km = ctx.kitMaterials, m = roomMats(ctx), bag = new Bag();
  bag.box(1.2, 2.2, 0.012, { y: 1.1, z: 0.006, color: 0xd8c89c });                                      // mounting silk
  if (!far) {
    bag.box(1.2, 0.035, 0.014, { y: 1.93, z: 0.007, color: 0xa98a3d });                                // ichimonji
    bag.box(1.2, 0.035, 0.014, { y: 0.52, z: 0.007, color: 0xa98a3d });
    for (const s of [-1, 1]) bag.box(0.03, 0.5, 0.008, { x: s * 0.2, y: 1.95, z: 0.016, color: 0x6d4f2a });   // fuutai streamers
    bag.cyl(0.02, 1.3, { y: 2.2, z: 0.012, rz: Math.PI / 2, color: 0x3b2616 });
    bag.cyl(0.03, 1.36, { y: 0.03, z: 0.012, rz: Math.PI / 2, color: 0x2b1b10 });
    for (const s of [-1, 1]) bag.sphere(0.04, { x: s * 0.68, y: 0.03, z: 0.012, color: hi ? 0xd6b45a : 0x9a7a3a });
  }
  const paint = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.3), km.paper({ color: 0xffffff, glow: 0, glowColor: 0x000000, rough: 0.95, map: paintingTexture(km), side: THREE.FrontSide }));
  paint.geometry.translate(0, 1.2, 0.0145);
  paint.name = 'painting'; paint.receiveShadow = true;
  return groupOf('Hanging Scroll', bagMesh(bag, m.bag, 'mount'), paint);
}

/** Chabudai. Local origin on the floor under the table's centre; the top is at 0.49. */
export function buildChabudai(ctx, L = {}, tier = 'hero') {
  const { hi, far } = tierFlags(tier), m = roomMats(ctx);
  const top = new TexBag(m.engawa), legs = new TexBag(m.timber);
  top.box(1.8, 0.05, 1.3, 0, 0.415, 0).box(1.76, 0.05, 1.26, 0, 0.465, 0);        // two slabs: a stepped edge
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    legs.box(0.11, far ? 0.4 : 0.36, 0.11, sx * 0.75, far ? 0.2 : 0.21, sz * 0.52);
    if (!far) legs.box(0.15, 0.03, 0.15, sx * 0.75, 0.015, sz * 0.52);               // foot pads
  }
  if (!far) {
    for (const sz of [-1, 1]) legs.box(1.4, 0.07, 0.03, 0, 0.355, sz * 0.52);          // aprons
    for (const sx of [-1, 1]) legs.box(0.03, 0.07, 0.94, sx * 0.75, 0.355, 0);
    if (hi) for (const sx of [-1, 1]) for (const sz of [-1, 1]) legs.box(0.15, 0.05, 0.15, sx * 0.75, 0.365, sz * 0.52);   // leg-head blocks
  }
  return groupOf('Chabudai Table', top.mesh('top'), legs.mesh('legs'));
}
