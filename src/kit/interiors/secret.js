// The secret house's furnishings as their own ids (wave 2.2b): tatami floor,
// chabudai with its tea set, the nap cushion and the andon. Hisomu-an is a
// walkable shell on the valley floor, so these live in the HOUSE frame (the
// classic numbers of meshSecret*Classic in src/countryside.js). Reuses part a's
// builders (tatami, teaware, platter, zabuton) and the lanterns family's andon.
import * as THREE from 'three';
import { Bag } from '../craft.js?v=20261113a';
import { buildAndon } from '../lanterns/build.js?v=20261113a';
import { TexBag, roomMats, bagMesh, groupOf, tierFlags } from './common.js?v=20261113a';
import { buildTatami } from './room.js?v=20261113a';
import { buildTeaware, buildFishPlatter, buildZabuton } from './small.js?v=20261113a';

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

/** The nap cushion, origin at its middle (y 0.07 in the house): the tea room's zabuton scaled to 0.75 m. */
export function buildSecretBed(ctx, L = {}, tier = 'hero', o = {}) {
  const z = buildZabuton(ctx, {}, tier, o);
  const cushion = z.children[0], k = 0.75 / 0.9;
  cushion.scale.setScalar(k);
  cushion.position.y = -0.07;
  const g = new THREE.Group();
  g.add(cushion);
  return g;
}

/** The lanterns family's andon, fitted to the classic 0.72 m. */
export function buildSecretAndon(ctx, layout, p) {
  const inst = buildAndon(ctx, layout, p);
  inst.group.scale.setScalar(0.82);
  return inst;
}
