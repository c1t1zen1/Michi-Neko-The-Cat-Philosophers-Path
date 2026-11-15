// pieces/futonRack.js — Roof Road piece 'futonRack': a futon rack.
// Lane r3-canal-market (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import { box, frameGroup } from './common.js';

export const futonRack = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0;
  const g = frameGroup(ctx.rail, sm);
  g.add(box(w + 0.18, 0.12, 1.18, M.futon, 0, pc.y - 0.06, pc.d));
  g.add(box(w + 0.12, 0.56, 0.1, M.futon, 0, pc.y - 0.34, pc.d + 0.54));
  for (const x of [-w / 2 + 0.08, w / 2 - 0.08]) {
    g.add(box(0.08, pc.y, 0.08, M.timber, x, pc.y / 2, pc.d - 0.45));
  }
  for (const x of [-w * 0.28, w * 0.28]) {
    const tie = box(0.055, 0.15, 1.24, pc.look > 0.5 ? M.noren.crimson : M.noren.indigo, x, pc.y - 0.03, pc.d);
    g.add(tie);
  }
  ctx.add(g);
};
