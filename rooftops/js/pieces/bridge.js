// pieces/bridge.js — Roof Road piece 'bridge': the Sanjō-style bridge: Kamo riverbed, deck joinery, piers and cutwaters, giboshi caps, ramp.
// Lane r2-roofs-streets (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import * as THREE from 'three';
import { box, cyl, frameGroup } from './common.js';

export const bridge = (pc, ctx) => {
  const { M, rail } = ctx;
  const deck = ctx.platforms[pc.plats[0]], ramp = ctx.platforms[pc.plats[1]];
  const deckLength = deck.s1 - deck.s0, deckMid = (deck.s0 + deck.s1) / 2;
  const g = frameGroup(rail, deckMid);

  // Kamo riverbed close-up: long dressed-stone banks, pale gravel shoals and
  // a few water-worn rocks keep the opening vista from reading as one flat
  // rectangle beneath the bridge. All of it is static-merged after framing.
  for (const x of [-3.28, 2.08]) {
    g.add(box(0.44, 0.72, 30, M.wetStone, x, -0.24, -3.8));
    for (let z = -17.0, i = 0; z <= 9.5; z += 2.15, i++) {
      const cap = box(0.62, 0.15, 1.88, i % 3 === 0 ? M.slab : M.stone, x, 0.185 + (i % 2) * 0.012, z);
      cap.rotation.y = (i % 3 - 1) * 0.018;
      g.add(cap);
    }
  }
  for (const [x, z, sx, sz, turn] of [
    [-2.72, -8.8, 0.42, 3.3, -0.12], [1.55, -2.5, 0.34, 2.5, 0.08],
    [-2.62, 5.2, 0.28, 2.0, 0.16], [1.62, 8.0, 0.22, 1.5, -0.09]
  ]) {
    const shoal = new THREE.Mesh(new THREE.CircleGeometry(1, 18), M.sand);
    shoal.rotation.x = -Math.PI / 2;
    shoal.rotation.y = turn;
    shoal.scale.set(sx, sz, 1);
    shoal.position.set(x, -0.525, z);
    g.add(shoal);
  }
  for (const [x, z, size, turn] of [
    [-2.55, -7.4, 0.42, 0.2], [-2.76, -3.4, 0.31, -0.5], [1.47, -1.5, 0.38, 0.7],
    [1.66, 3.8, 0.27, -0.2], [-2.63, 6.1, 0.34, 0.5], [1.55, 8.5, 0.24, -0.7]
  ]) {
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), M.wetStone);
    stone.scale.set(1.15, 0.38, 1.5);
    stone.rotation.y = turn;
    stone.position.set(x, -0.43, z);
    g.add(stone);
  }

  // River scenery stays at its original crossing while the walking deck
  // extends all the way to the collision ramp.
  for (const child of g.children) child.position.x += 5.5 - deckMid;

  // Heavy edge beams, visible cross-ties and individual plank seams give the
  // starting deck real joinery while preserving its single forgiving plane.
  g.add(box(deckLength, 0.18, 2.7, M.timberMed, 0, pc.deckY - 0.09, 0));
  g.add(box(deckLength, 0.16, 2.5, M.timber, 0, pc.deckY - 0.26, 0));
  for (const z of [-1.4, 1.4]) g.add(box(deckLength + .25, 0.3, 0.17, M.timber, 0, pc.deckY - 0.34, z));
  for (let x = -deckLength / 2 + .32, i = 0; x <= deckLength / 2 - .32; x += 0.54, i++) {
    g.add(box(0.026, 0.022, 2.5, M.dark, x, pc.deckY + 0.011, 0));
    if (i % 2 === 0) {
      for (const z of [-1.04, 1.04]) {
        const peg = cyl(0.024, 0.026, M.bronze, 'y', 7);
        peg.position.set(x, pc.deckY + 0.025, z);
        g.add(peg);
      }
    }
  }
  for (let x = -deckLength / 2 + .7; x <= deckLength / 2 - .7; x += 1.2) g.add(box(0.18, 0.19, 3.05, M.timber, x, pc.deckY - 0.41, 0));

  // Three masonry piers stand in the flow. Pointed upstream cutwaters split
  // the current; lighter cap stones catch the morning sky beneath the deck.
  const cutwaterGeo = new THREE.ConeGeometry(0.56, 1.45, 4);
  cutwaterGeo.rotateY(Math.PI / 4);
  cutwaterGeo.rotateX(-Math.PI / 2);
  for (const originalX of [-2.8, 0, 2.0]) {
    const x = originalX + 5.5 - deckMid;
    g.add(box(0.72, pc.deckY + 0.3, 1.8, M.stone, x, (pc.deckY - 0.6) / 2 - 0.15, 0));
    g.add(box(1.02, 0.18, 2.12, M.slab, x, pc.deckY - 0.28, 0));
    const cutwater = new THREE.Mesh(cutwaterGeo, M.wetStone);
    cutwater.position.set(x, -0.03, -1.5);
    g.add(cutwater);
  }
  const giboshi = new THREE.LatheGeometry([
    new THREE.Vector2(0.0, 0.0), new THREE.Vector2(0.12, 0.0), new THREE.Vector2(0.13, 0.05),
    new THREE.Vector2(0.1, 0.1), new THREE.Vector2(0.16, 0.2), new THREE.Vector2(0.15, 0.3),
    new THREE.Vector2(0.08, 0.38), new THREE.Vector2(0.03, 0.46), new THREE.Vector2(0.0, 0.5)
  ], 14);
  for (const z of [-1.25, 1.25]) {
    g.add(box(deckLength, 0.08, 0.14, M.timber, 0, 1.62, z));
    g.add(box(deckLength, 0.06, 0.1, M.timber, 0, 1.3, z));
    for (const s of [deck.s0 + .2, ...pc.caps, deck.s1 - .2]) {
      const x = s - deckMid;
      g.add(box(0.2, 0.75, 0.2, M.timber, x, pc.deckY + 0.36, z));
      const collar = cyl(0.13, 0.07, M.bronze, 'y', 10);
      collar.position.set(x, pc.deckY + 0.13, z);
      g.add(collar);
      if (pc.caps.includes(s)) {
        const gb = new THREE.Mesh(giboshi, M.bronze);
        gb.position.set(x, pc.capY - 0.5, z);
        g.add(gb);
      }
    }
  }
  // Ramp down into the city.
  // Shear the plank box so its top matches platTop at every point, including
  // both joins. The old hard-coded mesh ended three metres before collision.
  const rampGeo = new THREE.BoxGeometry(ramp.s1 - ramp.s0, .14, 2.7);
  const positions = rampGeo.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const u = positions.getX(i) / (ramp.s1 - ramp.s0) + .5;
    positions.setY(i, positions.getY(i) - .07 + ramp.y0 + (ramp.y1 - ramp.y0) * u);
  }
  rampGeo.computeVertexNormals();
  const rampMesh = new THREE.Mesh(rampGeo, M.timberMed);
  rampMesh.position.x = (ramp.s0 + ramp.s1) / 2 - deckMid;
  g.add(rampMesh);
  ctx.add(g);
};
