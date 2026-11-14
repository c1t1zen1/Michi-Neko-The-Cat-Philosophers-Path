// The secret house's furnishings as their own ids (wave 2.2b): tatami floor,
// chabudai with its tea set, the nap cushion and the andon. Hisomu-an is a
// walkable shell on the valley floor, so these live in the HOUSE frame (the
// classic numbers of meshSecret*Classic in src/countryside.js). Reuses part a's
// builders (tatami, teaware, platter, zabuton) and the lanterns family's andon.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Bag } from '../craft.js?v=20261113a';
import { buildAndon } from '../lanterns/build.js?v=20261113a';
import { TexBag, roomMats, bagMesh, groupOf, tierFlags } from './common.js?v=20261113a';
import { buildTatami } from './room.js?v=20261113a';
import { buildTeaware, buildFishPlatter } from './small.js?v=20261113a';

const SECRET_MATS = [[-1.15, 0.04, -1.15, false], [1.15, 0.04, -1.15, false], [-1.15, 0.04, 1.15, false], [1.15, 0.04, 1.15, false], [-2.3, 0.04, 0, true], [2.3, 0.04, 0, true]];

/** Six 1.15 x 2.3 mats (the secret house is a size smaller than the tea room). House frame. */
export function buildSecretTatami(ctx, L = {}, tier = 'hero') {
  const g = buildTatami(ctx, { mat: { w: 1.15, l: 2.3, h: 0.08 }, mats: SECRET_MATS }, tier);
  g.name = 'Tatami Floor';
  return g;
}

/**
 * The low table: a stepped top, four legs on pads, aprons, the kyusu and
 * yunomi and the fish platter. The grilled fish itself is the 'secret-fish'
 * component the house places on the plate (not built here). Origin on the floor
 * under the table's centre; top surface at 0.46.
 */
export function buildSecretTable(ctx, L = {}, tier = 'hero') {
  const { hi, far } = tierFlags(tier), m = roomMats(ctx);
  if (far) {   // one vertex-coloured mesh with the shared bag material: top, legs
    const b = new Bag();
    b.box(1.5, 0.08, 1.1, { y: 0.42, color: 0x8a5f3a });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.1, 0.38, 0.1, { x: sx * 0.65, y: 0.19, z: sz * 0.45, color: 0x3f2818 });
    return addSet(groupOf('Chabudai Table', bagMesh(b, m.bag, 'top')), ctx, tier);
  }
  const top = new TexBag(m.engawa), legs = new TexBag(m.timber);
  top.box(1.5, 0.04, 1.1, 0, 0.44, 0).box(1.46, 0.04, 1.06, 0, 0.40, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    legs.box(0.1, 0.38, 0.1, sx * 0.65, 0.19, sz * 0.45);
    if (!far) legs.box(0.14, 0.03, 0.14, sx * 0.65, 0.015, sz * 0.45);
  }
  if (!far) {
    for (const sz of [-1, 1]) legs.box(1.2, 0.06, 0.03, 0, 0.33, sz * 0.45);
    for (const sx of [-1, 1]) legs.box(0.03, 0.06, 0.8, sx * 0.65, 0.33, 0);
    if (hi) for (const sx of [-1, 1]) for (const sz of [-1, 1]) legs.box(0.14, 0.04, 0.14, sx * 0.65, 0.35, sz * 0.45);
  }
  return addSet(groupOf('Chabudai Table', top.mesh('top'), legs.mesh('legs')), ctx, tier);
}

function addSet(t, ctx, tier) {
  const set = buildTeaware(ctx, {}, tier).children[0];
  set.position.set(-0.35, 0.46, -0.2);
  const dish = buildFishPlatter(ctx, tier).plate.children[0];
  dish.position.set(0.2, 0.46, 0.1);
  t.add(set, dish);
  return t;
}

/** Futon colourways: [shikibuton, kakebuton trim, makura band]. Muted, never cushion red. */
export const FUTONS = { indigo: [0x3d4c6b, 0x2f3b55, 0x4a5d82], moss: [0x55663f, 0x44532f, 0x687a4e], plum: [0x5d4558, 0x4a3646, 0x745a6c] };
const CREAM = 0xe9dfc6;
/**
 * The nap spot as a futon: a thick rounded shikibuton, a folded kakebuton
 * quilt across the far half and a small pillow (makura) at the head. Origin at
 * the middle of the old cushion (the house places it at y 0.07, the tatami top
 * is 0.08, so local y 0.01 is the mat surface); the nap anchor is unchanged.
 */
export function buildSecretBed(ctx, L = {}, tier = 'hero', o = {}) {
  const { hi, far } = tierFlags(tier), m = roomMats(ctx), bag = new Bag();
  const [c1, c2, c3] = FUTONS[o.cloth] || FUTONS.indigo;
  const seg = far ? 1 : hi ? 4 : 2, y0 = 0.01;
  const rb = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, seg, r);
  bag.add(rb(0.78, 0.13, 0.96, 0.05), { y: y0 + 0.065, color: c1 });                         // shikibuton
  bag.add(rb(0.7, 0.085, 0.4, 0.035), { y: y0 + 0.13 + 0.04, z: -0.22, color: CREAM });        // the folded kakebuton
  if (!far) {
    bag.add(rb(0.7, 0.03, 0.12, 0.012), { y: y0 + 0.13 + 0.07, z: -0.34, color: c2 });          // its dyed fold edge
    bag.add(rb(0.34, 0.075, 0.2, 0.035), { y: y0 + 0.13 + 0.035, z: 0.3, color: 0xf1ebdc });     // the makura
    bag.box(0.345, 0.078, 0.05, { y: y0 + 0.13 + 0.035, z: 0.3, color: c3 });                    // its band
    bag.box(0.8, 0.012, 0.02, { y: y0 + 0.07, z: 0.0, color: c2 });                              // a stitched seam across the mattress
  }
  const g = new THREE.Group();
  g.add(bagMesh(bag, m.bag, 'cushion'));
  return g;
}

/** The lanterns family's andon, fitted to the classic 0.72 m. */
export function buildSecretAndon(ctx, layout, p) {
  const inst = buildAndon(ctx, layout, p);
  inst.group.scale.setScalar(0.82);
  return inst;
}
