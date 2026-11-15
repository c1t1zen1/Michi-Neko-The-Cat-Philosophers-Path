// pieces/shopfronts.js — Roof Road piece 'shopfronts': the covered market stalls along the back of the market street.
// Lane r3-canal-market (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import { box, frameGroup } from './common.js';
import { hash1 } from '../level.js';

export const shopfronts = (pc, ctx) => {
  const { M, rail } = ctx;
  // Covered market stalls along the back of the market street.
  for (let s = pc.s0 + 0.2; s < pc.s1 - 1; s += 3.2) {
    if (pc.gaps?.some(([a, b]) => s + 3 > a - .4 && s < b + .4)) continue;
    const g = frameGroup(rail, s + 1.5);
    const k = hash1(s);
    g.add(box(3.0, 3.6, 4.0, k > 0.5 ? M.plaster : M.plasterWarm, 0, 1.8, -2.0));
    g.add(box(3.0, 0.1, 0.9, M.timberMed, 0, 2.3, 0.4));
    g.add(box(2.6, 0.8, 0.7, M.timberMed, 0, 0.4, 0.4));
    for (let i = 0; i < 5; i++) {
      const goods = box(0.4, 0.18, 0.4, M.goods[(i + Math.floor(k * 6)) % M.goods.length], -1.0 + i * 0.5, 0.9, 0.4 + (i % 2) * 0.1);
      g.add(goods);
    }
    g.add(box(1.0, 0.55, 0.02, M.noren[k > 0.66 ? 'crimson' : k > 0.33 ? 'indigo' : 'hemp'], 0.6, 1.95, 0.05));
    ctx.add(g);
  }
};
