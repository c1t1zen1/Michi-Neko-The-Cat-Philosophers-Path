// pieces/cherry.js — Roof Road piece 'cherry': a cherry bough over the canal: trunk, twigs and blossom.
// Lane r3-canal-market (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import * as THREE from 'three';
import { cyl, frameGroup } from './common.js';
import { hash1 } from '../level.js';

export const cherry = (pc, ctx) => {
  const { M, rail } = ctx;
  const bg = pc.bough;
  const sm = (bg.s0 + bg.s1) / 2;
  const g = frameGroup(rail, sm);
  const bx0 = bg.s0 - sm, bx1 = bg.s1 - sm;
  // Trunk leaning out over the canal from alternating banks. The playable
  // branch zigzags in depth, so this is a real upper-layer route, not scenery.
  const bankDir = pc.bank === 'far' ? -1 : 1;
  const trunk = cyl(0.14, bg.y + 0.9, M.bark, 'y', 7);
  trunk.position.set(bx0 - 0.5, (bg.y - 0.3) / 2, pc.d + bankDir * 1.55);
  trunk.rotation.x = -bankDir * 0.35;
  g.add(trunk);
  const bough = cyl(0.09, bx1 - bx0 + 0.6, M.bark, 'x', 6);
  bough.position.set((bx0 + bx1) / 2, bg.y - 0.09, pc.d);
  g.add(bough);

  // Fine side twigs keep the blossom cloud connected to the playable limb.
  // They alternate across the canal, making the high route read as a real old
  // tree instead of a row of floating pom-poms.
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1;
    const len = 0.48 + 0.42 * hash1(sm * 1.7 + i * 4.3);
    const twig = cyl(0.028 + 0.008 * hash1(sm + i), len, M.bark, 'z', 5);
    twig.position.set(bx0 + (i + 0.55) / 6 * (bx1 - bx0), bg.y + 0.05, pc.d + side * len * 0.46);
    twig.rotation.x = side * (0.18 + 0.12 * hash1(sm * 2.2 + i));
    g.add(twig);
  }

  // Many small, irregular clumps read as blossom sprays at cat scale. Keep
  // them above and mostly behind the bough so the route remains legible.
  const blossomMats = [M.blossomPale, M.blossom, M.blossomRose];
  for (let i = 0; i < 30; i++) {
    const r = 0.065 + 0.075 * hash1(sm + i * 3.1);
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), blossomMats[i % blossomMats.length]);
    const u = (i + hash1(sm * 0.7 + i * 5.9) * 0.8) / 30;
    c.position.set(
      bx0 - 0.45 + u * (bx1 - bx0 + 0.9),
      bg.y + 0.18 + 0.42 * hash1(sm + i),
      pc.d - bankDir * (0.12 + 0.82 * hash1(sm * 2 + i))
    );
    g.add(c);
  }
  ctx.add(g);
};
