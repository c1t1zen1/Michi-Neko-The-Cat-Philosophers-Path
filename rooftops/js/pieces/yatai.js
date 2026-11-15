// pieces/yatai.js — Roof Road piece 'yatai': a yatai festival stall.
// Lane r4-festival (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import * as THREE from 'three';
import { box, cyl, frameGroup } from './common.js';

export const yatai = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0;
  const g = frameGroup(ctx.rail, sm);
  const awning = M.cloth[Math.floor(pc.look * M.cloth.length) % M.cloth.length];

  // A compact festival stall: timber counter, climbable striped awning,
  // noren, trays and one warm chōchin. Each fare has its own silhouette.
  g.add(box(w, 0.08, 1.55, awning, 0, pc.y - 0.04, pc.d));
  for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) {
    g.add(box(0.09, pc.y - 0.22, 0.09, M.timber, x, (pc.y - 0.22) / 2, pc.d - 0.58));
  }
  g.add(box(w * 0.9, 0.12, 0.72, M.timberMed, 0, 0.86, pc.d + 0.42));
  g.add(box(w * 0.86, 0.30, 0.04, M.noren[pc.look > 0.66 ? 'crimson' : pc.look > 0.33 ? 'indigo' : 'hemp'], 0, pc.y - 0.18, pc.d + 0.76));
  if (pc.fare === 'yakitori' || pc.fare === 'dango') {
    for (let x = -w * 0.32; x <= w * 0.32; x += 0.25) {
      const skewer = cyl(0.018, 0.78, M.bamboo, 'y', 5); skewer.position.set(x, 1.18, pc.d + 0.62); g.add(skewer);
      for (let y = 1.0; y < 1.32; y += 0.14) {
        const bite = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), M.goods[pc.fare === 'dango' ? 3 : 0]);
        bite.position.set(x, y, pc.d + 0.62); g.add(bite);
      }
    }
  } else if (pc.fare === 'festival masks') {
    for (let x = -w * 0.3, i = 0; x <= w * 0.3; x += 0.3, i++) {
      const mask = new THREE.Mesh(new THREE.CircleGeometry(0.105, 10), M.goods[(i + 1) % M.goods.length]);
      mask.position.set(x, 1.48, pc.d + 0.82); g.add(mask);
    }
  } else {
    for (let x = -w * 0.3, i = 0; x <= w * 0.3; x += 0.3, i++) {
      const bottle = cyl(0.045, 0.25, M.goods[(i + 4) % M.goods.length], 'y', 7);
      bottle.position.set(x, 1.05, pc.d + 0.58); g.add(bottle);
    }
  }
  const lantern = cyl(0.12, 0.34, pc.look > 0.5 ? M.lanternRed : M.lanternWhite, 'y', 10);
  lantern.position.set(w * 0.36, pc.y - 0.32, pc.d + 0.68); g.add(lantern);
  ctx.add(g);
  ctx.light(ctx.rail, sm + w * 0.28, pc.y - 0.3, pc.d + 0.7);
};
