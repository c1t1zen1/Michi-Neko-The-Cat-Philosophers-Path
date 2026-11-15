// pieces/tsuboniwa.js — Roof Road piece 'tsuboniwa': a tsuboniwa garden tree over a wall.
// Lane r2-roofs-streets (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import * as THREE from 'three';
import { cyl, frameGroup } from './common.js';
import { hash1 } from '../level.js';

export const tsuboniwa = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(ctx.rail, sm);
  const tr = cyl(0.07, 2.2, M.bark, 'y', 6); tr.position.set(0, 1.1, pc.d - 0.8); g.add(tr);
  const k = hash1(sm);
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 + 0.14 * hash1(sm + i), 1), k > 0.5 ? M.pine : M.foliage);
    c.position.set((hash1(sm * 3 + i) - 0.5) * 1.1, 1.9 + i * 0.12, pc.d - 1.2 + (hash1(sm + i * 7) - 0.5) * 0.7);
    g.add(c);
  }
  ctx.add(g);
};
