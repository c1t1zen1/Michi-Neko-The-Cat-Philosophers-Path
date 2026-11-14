// pieces/float.js — Roof Road piece 'float': the hoko float: wheels, undercarriage, brocade, deck, roof, shingi mast, tassels, hayashi musicians.
// Lane r4-festival (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import * as THREE from 'three';
import { UP, box, cyl, slope, frameGroup } from './common.js';
import { ridgeCap } from './machiya.js';

export const float = (pc, ctx) => {
  const { M, rail } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(rail, sm);
  const z = pc.d;

  // Four person-height spoked wheels, with iron tyres, lacquer hubs and
  // through-axles. The open spokes read far more clearly than solid discs as
  // the camera pulls out for the vertical climb.
  for (const x of [-2.1, 2.1]) for (const dz of [-1.25, 1.25]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.13, 7, 24), M.timberMed);
    rim.position.set(x, 0.95, z + dz);
    g.add(rim);
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.955, 0.032, 5, 28), M.steel);
    tyre.position.copy(rim.position);
    g.add(tyre);
    const hub = cyl(0.17, 0.34, M.lacquer, 'z', 10);
    hub.position.copy(rim.position);
    g.add(hub);
    for (let i = 0; i < 8; i++) {
      const spoke = box(1.43, 0.055, 0.065, M.timber, x, 0.95, z + dz);
      spoke.rotation.z = (i * Math.PI) / 8;
      g.add(spoke);
    }
  }
  for (const x of [-2.1, 2.1]) {
    const axle = cyl(0.105, 2.85, M.steel, 'z', 10);
    axle.position.set(x, 0.95, z);
    g.add(axle);
  }

  // Massive undercarriage, visible cross-bracing and the textile-draped
  // lower body. Three separate front panels catch the breeze independently.
  g.add(box(5.8, 0.45, 2.2, M.timber, 0, 1.55, z));
  for (const x of [-2.35, 0, 2.35]) g.add(box(0.18, 1.25, 2.32, M.timberMed, x, 2.05, z));
  g.add(box(5.0, 1.48, 2.34, M.dark, 0, 2.55, z));
  for (let i = 0; i < 3; i++) {
    const x = -1.67 + i * 1.67;
    g.add(box(1.52, 1.42, 0.035, M.brocade[i % 2], x, 2.55, z + 1.19));
  }
  for (const sx of [-1, 1]) g.add(box(0.035, 1.4, 2.12, M.brocade[sx > 0 ? 1 : 0], sx * 2.52, 2.55, z));
  g.add(box(5.2, 0.08, 0.08, M.gold, 0, 3.25, z + 1.23));
  g.add(box(5.2, 0.08, 0.08, M.gold, 0, 1.84, z + 1.23));

  // Lacquer deck, carved brackets and a balustrade at cat height.
  g.add(box(6.0, 0.14, 3.0, M.lacquer, 0, pc.deckY - 0.07, z + 0.2));
  for (const zz of [z - 1.3, z + 1.7]) g.add(box(6.0, 0.06, 0.06, M.gold, 0, pc.deckY + 0.6, zz));
  for (const x of [-2.9, -1.4, 0, 1.4, 2.9]) g.add(box(0.07, 0.6, 0.07, M.lacquer, x, pc.deckY + 0.3, z + 1.7));
  for (const x of [-2.45, -1.65, -0.85, 0, 0.85, 1.65, 2.45]) {
    const bracket = box(0.34, 0.16, 0.28, M.gold, x, pc.deckY - 0.28, z + 1.32);
    bracket.rotation.z = (Math.abs(x) % 1.5 - 0.5) * 0.08;
    g.add(bracket);
  }

  // Pillars to the roof, the lower eave tier and the raised roof.
  for (const x of [-2.4, 2.4]) for (const dz of [-1.0, 1.0]) g.add(box(0.14, pc.eaveY - pc.deckY, 0.14, M.lacquer, x, (pc.eaveY + pc.deckY) / 2, z + dz));
  for (const x of [-2.35, -1.15, 0, 1.15, 2.35]) g.add(box(0.09, pc.eaveY - pc.deckY - 0.2, 0.09, M.timberMed, x, (pc.eaveY + pc.deckY) / 2, z + 1.28));
  g.add(box(5.95, 0.16, 3.0, M.timber, 0, pc.eaveY - 0.11, z));
  g.add(box(5.95, 0.08, 0.1, M.gold, 0, pc.eaveY - 0.01, z + 1.53));
  // A real gabled roof turns the final route from eave to ridge in silhouette.
  slope(g, M.roof, { x: -3.0, y: pc.eaveY, z }, pc.ridgeY - pc.eaveY - 0.18, 3.0, 2.8, -Math.PI / 2, 0.15);
  slope(g, M.roof, { x: 3.0, y: pc.eaveY, z }, pc.ridgeY - pc.eaveY - 0.18, 3.0, 2.8, Math.PI / 2, 0.15);
  ridgeCap(g, M, z - 1.42, z + 1.42, pc.ridgeY - 0.28, 0, true);

  // Lantern frame on the float (komagata), left side.
  for (const y of [pc.deckY + 0.5, pc.deckY + 0.85]) {
    for (let x = -2.6; x < -1.3; x += 0.28) {
      const l = cyl(0.1, 0.28, M.lanternWhite, 'y', 10);
      l.position.set(x, y, z + 1.4);
      g.add(l);
    }
  }
  g.add(box(1.5, 0.06, 0.12, M.timber, -1.95, 4.7 - 0.03, z));

  // The shingi pole stands just behind the climb; a crossbar of sakaki and a
  // small perch bracket stick out from it toward the street. A crescent tops it.
  const zp = z - 0.75, zc = z - 0.2;
  const pole = cyl(0.11, 10.5, M.timber, 'y', 8);
  pole.position.set(0, pc.ridgeY + 5.25, zp);
  g.add(pole);
  const bar = cyl(0.06, 1.3, M.timber, 'x', 6);
  bar.position.set(0, pc.barY - 0.06, zc);
  g.add(bar);
  g.add(box(0.08, 0.08, zc - zp, M.timber, 0, pc.barY - 0.06, (zc + zp) / 2));
  for (const sx of [-1, 1]) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 1), M.pine);
    leaf.position.set(sx * 0.58, pc.barY + 0.02, zc - 0.1);
    g.add(leaf);
  }
  const disc = cyl(0.34, 0.06, M.lacquer, 'y', 14);
  disc.position.set(0, pc.perchY - 0.03, zc);
  g.add(disc);
  g.add(box(0.08, 0.08, zc - zp, M.timber, 0, pc.perchY - 0.08, (zc + zp) / 2));
  const moon = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.07, 6, 18, Math.PI * 1.2), M.gold);
  moon.position.set(0, pc.ridgeY + 10.6, zp);
  moon.rotation.z = 0.9;
  g.add(moon);

  // Shimenawa-like lashings and four guy ropes make the mast feel physically
  // tied into the roof instead of floating above it.
  for (let y = pc.ridgeY + 0.25; y < pc.ridgeY + 0.72; y += 0.12) {
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.024, 5, 12), M.hemp);
    wrap.rotation.x = Math.PI / 2;
    wrap.position.set(0, y, zp);
    g.add(wrap);
  }
  const ropeBetween = (a, b) => {
    const dir = b.clone().sub(a);
    const rope = cyl(0.018, dir.length(), M.hemp, 'y', 5);
    rope.position.copy(a).add(b).multiplyScalar(0.5);
    rope.quaternion.setFromUnitVectors(UP, dir.normalize());
    g.add(rope);
  };
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    ropeBetween(
      new THREE.Vector3(sx * 2.55, pc.eaveY - 0.08, z + sz * 1.1),
      new THREE.Vector3(0, pc.ridgeY + 4.1, zp)
    );
  }

  // Live details stay out of the static merge: tassels and three seated
  // hayashi musicians breathe just enough to keep the parked hoko alive.
  const live = frameGroup(rail, sm);
  const tassels = [];
  for (let i = 0; i < 6; i++) {
    const pivot = new THREE.Group();
    pivot.position.set(-2.55 + i * 1.02, pc.eaveY - 0.03, z + 1.52);
    const cord = cyl(0.014, 0.42, M.hemp, 'y', 5);
    cord.position.y = -0.21;
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 7, 5), M.gold);
    knot.position.y = -0.43;
    const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.34, 8), i % 2 ? M.goods[3] : M.goods[1]);
    tassel.position.y = -0.62;
    pivot.add(cord, knot, tassel);
    pivot.userData.phase = i * 0.83;
    live.add(pivot);
    tassels.push(pivot);
  }

  const musicians = [];
  for (let i = 0; i < 3; i++) {
    const person = new THREE.Group();
    person.position.set(-1.25 + i * 1.25, pc.deckY + 0.04, z - 0.34 + (i % 2) * 0.16);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.43, 8), M.goods[[5, 3, 0][i]]);
    body.position.y = 0.4;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 9, 7), M.plasterWarm);
    head.position.y = 0.72;
    const hachimaki = box(0.23, 0.045, 0.16, M.plaster, 0, 0.75, 0);
    const knees = box(0.46, 0.15, 0.24, M.dark, 0, 0.12, 0);
    person.add(body, head, hachimaki, knees);
    if (i === 1) {
      const drum = cyl(0.18, 0.26, M.timberMed, 'z', 10);
      drum.position.set(0.23, 0.38, 0.12);
      person.add(drum);
    } else {
      const flute = cyl(0.022, 0.58, M.bamboo, 'x', 6);
      flute.position.set(0, 0.55, 0.16);
      flute.rotation.z = i ? -0.08 : 0.08;
      person.add(flute);
    }
    person.userData.phase = i * 1.9;
    person.userData.baseY = person.position.y;
    live.add(person);
    musicians.push(person);
  }

  ctx.add(g);
  ctx.addDyn(live);
  ctx.dynamic.float = { group: live, tassels, musicians };
  ctx.light(rail, sm, pc.deckY + 0.7, z + 1.4);
  ctx.light(rail, sm, 2.4, z + 1.6);
};
