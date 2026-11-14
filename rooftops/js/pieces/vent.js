// pieces/vent.js — Roof Road piece 'vent': a canopy vent.
// Lane r3-canal-market (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import { box, frameGroup } from './common.js';

export const vent = (pc, ctx) => {
  const g = frameGroup(ctx.rail, (pc.s0 + pc.s1) / 2);
  const w = pc.s1 - pc.s0;
  g.add(box(w, pc.y - 4.95, 1.0, ctx.M.steel, 0, (pc.y + 4.95) / 2, pc.d));
  for (let i = 0; i < 3; i++) g.add(box(w + 0.02, 0.03, 1.02, ctx.M.dark, 0, 5.05 + i * 0.12, pc.d));
  ctx.add(g);
};
