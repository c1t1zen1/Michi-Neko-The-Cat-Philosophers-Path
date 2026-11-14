// pieces/chimney.js — Roof Road piece 'chimney': a chimney with its rain cap.
// Lane r3-canal-market (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import * as THREE from 'three';
import { box, frameGroup } from './common.js';

export const chimney = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0;
  const g = frameGroup(ctx.rail, sm);
  const h = 1.55;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.32, w * 0.42, h, 8), pc.look > 0.5 ? M.bengara : M.plasterWarm);
  body.position.set(0, pc.y - h / 2 - 0.08, pc.d); g.add(body);
  g.add(box(w * 0.86, 0.13, w * 0.82, M.stone, 0, pc.y - 0.1, pc.d));
  const rainCap = new THREE.Mesh(new THREE.ConeGeometry(w * 0.48, 0.22, 4), M.ridge);
  rainCap.rotation.y = Math.PI / 4; rainCap.position.set(0, pc.y + 0.07, pc.d); g.add(rainCap);
  for (const x of [-w * 0.29, w * 0.29]) g.add(box(0.05, 0.25, 0.05, M.steel, x, pc.y - 0.02, pc.d));
  ctx.add(g);
};
