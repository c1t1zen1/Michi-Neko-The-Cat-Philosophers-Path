// pieces/komayose.js — Roof Road piece 'komayose': komayose rails along a frontage.
// Lane r2-roofs-streets (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import { box, frameGroup } from './common.js';

export const komayose = (pc, ctx) => {
  const { M } = ctx;
  const g = frameGroup(ctx.rail, (pc.s0 + pc.s1) / 2);
  const w = pc.s1 - pc.s0;
  g.add(box(w, 0.1, 0.16, M.timberMed, 0, pc.y - 0.05, pc.d));
  for (let x = -w / 2 + 0.08; x <= w / 2 - 0.07; x += 0.22) g.add(box(0.08, pc.y - 0.1, 0.08, M.timberMed, x, (pc.y - 0.1) / 2, pc.d));
  ctx.add(g);
};
