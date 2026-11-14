// pieces/rack.js — Roof Road piece 'rack': a tiered lantern rack.
// Lane r4-festival (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import { box, cyl, frameGroup } from './common.js';

export const rack = (pc, ctx) => {
  const { M, rail } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(rail, sm);
  for (const t of pc.tiers) {
    const x0 = t.s0 - sm, x1 = t.s1 - sm;
    g.add(box(x1 - x0, 0.06, 0.12, M.timber, (x0 + x1) / 2, t.y - 0.03, pc.d));
    for (const x of [x0 + 0.04, x1 - 0.04]) g.add(box(0.07, t.y, 0.07, M.timber, x, t.y / 2, pc.d));
    for (let x = x0 + 0.18; x < x1 - 0.1; x += 0.3) {
      const l = cyl(0.11, 0.3, M.lanternWhite, 'y', 10);
      l.position.set(x, t.y - 0.28, pc.d + 0.02);
      g.add(l);
    }
  }
  ctx.add(g);
  ctx.light(rail, sm, 1.6, pc.d + 0.3);
};
