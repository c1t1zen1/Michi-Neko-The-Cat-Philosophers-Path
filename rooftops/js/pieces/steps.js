// pieces/steps.js — Roof Road piece 'steps': the river steps down from the bridge.
// Lane r2-roofs-streets (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import { box, frameGroup } from './common.js';

export const steps = (pc, ctx) => {
  const g = frameGroup(ctx.rail, (pc.s0 + pc.s1) / 2);
  g.add(box(pc.s1 - pc.s0, 0.3, 4.0, ctx.M.stone, 0, pc.y - 0.15, pc.d));
  ctx.add(g);
};
