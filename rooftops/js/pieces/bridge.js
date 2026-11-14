// pieces/bridge.js — Roof Road piece 'bridge': the Sanjō-style bridge: Kamo riverbed, deck joinery, piers and cutwaters, giboshi caps, ramp.
// Lane r2-roofs-streets (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import * as THREE from 'three';
import { box, cyl, slope, frameGroup } from './common.js';

export const bridge = (pc, ctx) => {
  const { M, rail } = ctx;
  const g = frameGroup(rail, 5.5);

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

  // Heavy edge beams, visible cross-ties and individual plank seams give the
  // starting deck real joinery while preserving its single forgiving plane.
  g.add(box(11.0, 0.18, 2.7, M.timberMed, 0, pc.deckY - 0.09, 0));
  g.add(box(11.0, 0.16, 2.5, M.timber, 0, pc.deckY - 0.26, 0));
  for (const z of [-1.4, 1.4]) g.add(box(11.25, 0.3, 0.17, M.timber, 0, pc.deckY - 0.34, z));
  for (let x = -5.18, i = 0; x <= 5.18; x += 0.54, i++) {
    g.add(box(0.026, 0.022, 2.5, M.dark, x, pc.deckY + 0.011, 0));
    if (i % 2 === 0) {
      for (const z of [-1.04, 1.04]) {
        const peg = cyl(0.024, 0.026, M.bronze, 'y', 7);
        peg.position.set(x, pc.deckY + 0.025, z);
        g.add(peg);
      }
    }
  }
  for (let x = -4.8; x <= 4.8; x += 1.2) g.add(box(0.18, 0.19, 3.05, M.timber, x, pc.deckY - 0.41, 0));

  // Three masonry piers stand in the flow. Pointed upstream cutwaters split
  // the current; lighter cap stones catch the morning sky beneath the deck.
  const cutwaterGeo = new THREE.ConeGeometry(0.56, 1.45, 4);
  cutwaterGeo.rotateY(Math.PI / 4);
  cutwaterGeo.rotateX(-Math.PI / 2);
  for (const x of [-2.8, 0, 2.0]) {
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
    g.add(box(11.0, 0.08, 0.14, M.timber, 0, 1.62, z));
    g.add(box(11.0, 0.06, 0.1, M.timber, 0, 1.3, z));
    for (const s of [0.2, ...pc.caps, 10.8]) {
      const x = s - 5.5;
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
  slope(g, M.timberMed, { x: 7.9, y: 0.05, z: 0 }, pc.deckY - 0.05, 2.4, 2.7, Math.PI / 2, 0.14);
  ctx.add(g);
};
