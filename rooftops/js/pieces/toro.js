// pieces/toro.js — Roof Road piece 'toro': a stone tōrō lantern.
// Lane r3-canal-market (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import * as THREE from 'three';
import { box, cyl, frameGroup } from './common.js';

export const toro = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(ctx.rail, sm);
  g.add(box(0.5, 0.15, 0.5, M.stone, 0, 0.08, pc.d));
  const post = cyl(0.11, 0.7, M.stone, 'y', 8); post.position.set(0, 0.5, pc.d); g.add(post);
  g.add(box(0.42, 0.12, 0.42, M.stone, 0, 0.9, pc.d));
  g.add(box(0.3, 0.25, 0.3, M.lanternWhite, 0, 1.08, pc.d));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.25, 4), M.stone);
  roof.rotation.y = Math.PI / 4; roof.position.set(0, 1.33, pc.d);
  g.add(roof);
  ctx.add(g);
  ctx.light(ctx.rail, sm, 1.1, pc.d);
};
