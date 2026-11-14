// pieces/roji.js — Roof Road piece 'roji': the lantern-lit roji side alley with drain, tobi-ishi, tsukubai and service door.
// Lane r2-roofs-streets (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import * as THREE from 'three';
import { box, cyl, frameGroup } from './common.js';

export const roji = (pc, ctx) => {
  const { M, rail } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const w = pc.s1 - pc.s0;
  const g = frameGroup(rail, sm);
  const zFar = pc.d - 5.0;

  // A thumb-width side alley between the first machiya: wet stone, an open
  // drain and deliberately uneven tobi-ishi draw the eye deep into the block.
  g.add(box(w - 0.1, 0.08, 5.55, M.wetStone, 0, 0.04, pc.d - 2.25));
  for (const x of [-w / 2 + 0.09, w / 2 - 0.09]) {
    g.add(box(0.11, 0.055, 5.45, M.dark, x, 0.082, pc.d - 2.25));
  }
  for (let i = 0; i < 7; i++) {
    const slab = box(0.56 + (i % 2) * 0.08, 0.075, 0.42 + (i % 3) * 0.055,
      i % 3 === 0 ? M.slab : M.stone, (i % 3 - 1) * 0.075, 0.125, pc.d + 0.02 - i * 0.7);
    slab.rotation.y = (i % 2 ? -1 : 1) * (0.035 + i * 0.006);
    g.add(slab);
  }

  // Copper rain chain, clay nandina pot and a low tsukubai make the alley a
  // tiny destination rather than a black gap between two façades.
  const chain = cyl(0.018, 2.1, M.bronze, 'y', 6);
  chain.position.set(-w * 0.34, 1.1, pc.d - 0.35);
  g.add(chain);
  const pot = cyl(0.19, 0.3, M.clay, 'y', 10);
  pot.position.set(w * 0.27, 0.18, pc.d - 2.35);
  g.add(pot);
  for (let i = 0; i < 5; i++) {
    const stem = cyl(0.018, 0.48 + i * 0.06, M.bark, 'y', 5);
    stem.rotation.z = (i - 2) * 0.12;
    stem.position.set(w * 0.27 + (i - 2) * 0.035, 0.52, pc.d - 2.35);
    g.add(stem);
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12 + (i % 2) * 0.025, 1), i % 2 ? M.pine : M.foliage);
    leaf.scale.set(0.8, 1.35, 0.65);
    leaf.position.set(w * 0.27 + (i - 2) * 0.075, 0.74 + (i % 2) * 0.1, pc.d - 2.35 + (i % 3 - 1) * 0.08);
    g.add(leaf);
  }
  const basin = cyl(0.29, 0.24, M.wetStone, 'y', 11);
  basin.position.set(-w * 0.22, 0.18, pc.d - 3.35);
  g.add(basin);
  const basinWater = new THREE.Mesh(new THREE.CircleGeometry(0.21, 14), M.glass);
  basinWater.rotation.x = -Math.PI / 2;
  basinWater.position.set(-w * 0.22, 0.305, pc.d - 3.35);
  g.add(basinWater);
  const spout = cyl(0.028, 0.62, M.bamboo, 'x', 7);
  spout.position.set(-w * 0.02, 0.63, pc.d - 3.35);
  g.add(spout);
  const spoutPost = cyl(0.035, 0.75, M.bamboo, 'y', 7);
  spoutPost.position.set(w * 0.25, 0.42, pc.d - 3.35);
  g.add(spoutPost);

  // A softly lit service door closes the perspective, with a bamboo lintel
  // and short noren that move in the same breeze as the street curtains.
  g.add(box(w - 0.16, 1.72, 0.08, M.timber, 0, 0.86, zFar));
  g.add(box(w - 0.34, 1.38, 0.035, M.shoji, 0, 0.86, zFar + 0.05));
  for (const x of [-w * 0.36, w * 0.36]) g.add(box(0.07, 2.0, 0.07, M.bamboo, x, 1.0, zFar + 0.18));
  const lintel = cyl(0.055, w - 0.12, M.bamboo, 'x', 8);
  lintel.position.set(0, 1.95, zFar + 0.18);
  g.add(lintel);
  g.add(box(w - 0.34, 0.52, 0.018, M.noren.hemp, 0, 1.63, zFar + 0.22));
  const cord = box(0.018, 0.34, 0.018, M.dark, w * 0.25, 1.74, zFar + 0.35);
  g.add(cord);
  const lamp = cyl(0.12, 0.29, M.lanternWhite, 'y', 10);
  lamp.position.set(w * 0.25, 1.47, zFar + 0.35);
  g.add(lamp);

  ctx.add(g);
  ctx.light(rail, sm, 1.47, zFar + 0.38);
};
