// pieces/inuyarai.js — Roof Road piece 'inuyarai': curved bamboo inuyarai at a wall foot.
// Lane r2-roofs-streets (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import * as THREE from 'three';
import { frameGroup } from './common.js';

export const inuyarai = (pc, ctx) => {
  const g = frameGroup(ctx.rail, (pc.s0 + pc.s1) / 2);
  const w = pc.s1 - pc.s0;
  const geo = new THREE.CylinderGeometry(0.9, 0.9, w, 12, 1, true, 0, Math.PI / 2);
  geo.rotateZ(Math.PI / 2);
  const m = new THREE.Mesh(geo, ctx.M.inuyarai);
  m.position.set(0, 0, pc.d - 0.4);              // top against the wall, foot out on the street
  g.add(m);
  ctx.add(g);
};
