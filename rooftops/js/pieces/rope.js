// pieces/rope.js — Roof Road piece 'rope': laundry poles, the tow rope and lantern lines.
// Lane r3-canal-market (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import * as THREE from 'three';
import { box, cyl, frameGroup } from './common.js';

export const rope = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0;
  const g = frameGroup(ctx.rail, sm);
  if (pc.style === 'laundry') {
    const pole = cyl(0.045, w + 0.4, M.bamboo, 'x', 8);
    pole.position.set(0, pc.y - 0.04, pc.d);
    g.add(pole);
    for (let x = -w / 2 + 0.45, i = 0; x < w / 2 - 0.3; x += 0.8, i++) {
      const fabric=M.cloth[(i*2+Math.floor(sm))%M.cloth.length];
      g.add(box(.46,.75,.018,fabric,x,pc.y-.48,pc.d+.02));
      if(i%2===0) for(const side of [-1,1]) g.add(box(.23,.28,.018,fabric,x+side*.3,pc.y-.24,pc.d+.02));
      for(const side of [-1,1]) g.add(box(.025,.09,.04,M.agedWood,x+side*.17,pc.y-.07,pc.d+.04));
    }
  } else if (pc.style === 'tow') {
    // The Takase boats were hauled by hand. A weathered hemp line crosses
    // between two mooring posts and doubles as the upper route's balance beam.
    const line = cyl(0.045, w + 0.36, M.hemp, 'x', 8);
    line.position.set(0, pc.y - 0.045, pc.d);
    line.rotation.x = 0.025;
    g.add(line);
    for (const x of [-w / 2 - 0.08, w / 2 + 0.08]) {
      const post = cyl(0.075, 1.0, M.timberMed, 'y', 8);
      post.position.set(x, pc.y - 0.52, pc.d);
      g.add(post);
      const knot = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 5, 9), M.hemp);
      knot.position.set(x, pc.y - 0.06, pc.d);
      knot.rotation.y = Math.PI / 2;
      g.add(knot);
    }
  } else {
    const line = cyl(0.02, w + 0.3, M.dark, 'x', 5);
    line.position.set(0, pc.y - 0.03, pc.d);
    g.add(line);
    for (let x = -w / 2 + 0.3, i = 0; x < w / 2 - 0.2; x += 0.55, i++) {
      const l = cyl(0.11, 0.26, i % 3 === 1 ? M.lanternWhite : M.lanternRed, 'y', 10);
      l.position.set(x, pc.y - 0.28, pc.d);
      g.add(l);
    }
    ctx.light(ctx.rail, sm, pc.y - 0.3, pc.d);
  }
  ctx.add(g);
};
