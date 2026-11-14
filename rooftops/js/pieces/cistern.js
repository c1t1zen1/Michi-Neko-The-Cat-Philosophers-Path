// pieces/cistern.js — Roof Road piece 'cistern': a rooftop cistern with its stand and ladder.
// Lane r3-canal-market (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import * as THREE from 'three';
import { box, cyl, frameGroup } from './common.js';

export const cistern = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0;
  const g = frameGroup(ctx.rail, sm);
  const tankH = 1.28, radius = Math.min(0.96, w * 0.43);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.94, radius, tankH, 16), M.timberMed);
  tank.position.set(0, pc.y - tankH / 2 - 0.06, pc.d);
  g.add(tank);
  for (const y of [pc.y - 0.25, pc.y - 0.66, pc.y - 1.06]) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.015, 0.025, 5, 18), M.steel);
    hoop.rotation.x = Math.PI / 2; hoop.position.set(0, y, pc.d); g.add(hoop);
  }
  const lid = cyl(radius * 0.96, 0.1, M.timber, 'y', 16);
  lid.position.set(0, pc.y - 0.05, pc.d); g.add(lid);
  const cap = cyl(0.16, 0.09, M.bronze, 'y', 10);
  cap.position.set(0, pc.y + 0.045, pc.d); g.add(cap);
  // Cross-braced stand and a tiny ladder explain the high cat route.
  for (const x of [-radius * 0.62, radius * 0.62]) {
    g.add(box(0.11, 1.0, 0.11, M.timber, x, pc.y - 1.78, pc.d));
  }
  for (let y = pc.y - 1.95; y < pc.y - 0.78; y += 0.24) {
    g.add(box(0.62, 0.04, 0.05, M.bamboo, radius + 0.16, y, pc.d + 0.74));
  }
  for (const x of [radius - 0.13, radius + 0.45]) {
    g.add(box(0.045, 1.35, 0.045, M.bamboo, x, pc.y - 1.36, pc.d + 0.74));
  }
  ctx.add(g);
};
