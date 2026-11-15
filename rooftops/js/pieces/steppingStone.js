// pieces/steppingStone.js — Roof Road piece 'steppingStone': a wet stepping stone with a moss cap.
// Lane r3-canal-market (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import * as THREE from 'three';
import { frameGroup } from './common.js';

export const steppingStone = (pc, ctx) => {
  const g = frameGroup(ctx.rail, (pc.s0 + pc.s1) / 2);
  const w = pc.s1 - pc.s0;
  const geo = new THREE.DodecahedronGeometry(0.55, 0);
  const stone = new THREE.Mesh(geo, ctx.M.wetStone);
  stone.scale.set(w, 0.24 + pc.look * 0.08, 0.78 + pc.look * 0.28);
  stone.rotation.set(0.04 * (pc.look - 0.5), pc.look * 0.7, 0.035 * (pc.look - 0.5));
  stone.position.set(0, pc.y - 0.17, pc.d);
  g.add(stone);
  // A thin moss cap keeps each stone readable against the moving water.
  const moss = new THREE.Mesh(new THREE.CircleGeometry(0.34 + pc.look * 0.12, 9), ctx.M.pine);
  moss.rotation.x = -Math.PI / 2;
  moss.scale.x = 1.25;
  moss.position.set(0.08, pc.y + 0.015, pc.d - 0.04);
  g.add(moss);
  ctx.add(g);
};
