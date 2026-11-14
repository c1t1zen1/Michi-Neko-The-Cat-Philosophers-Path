// pieces/tsuiji.js — Roof Road piece 'tsuiji': the tsuiji temple wall.
// Lane r4-festival (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import { box, slope, frameGroup } from './common.js';

export const tsuiji = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0;
  const g = frameGroup(ctx.rail, sm);
  g.add(box(w, 1.45, 0.7, M.sujibei, 0, 0.72, pc.d));
  slope(g, M.roof, { x: 0, y: 1.42, z: pc.d + 0.6 }, 0.16, 0.5, w + 0.2, 0, 0.08);
  slope(g, M.roof, { x: 0, y: 1.42, z: pc.d - 0.6 }, 0.16, 0.5, w + 0.2, Math.PI, 0.08);
  ctx.add(g);
};
