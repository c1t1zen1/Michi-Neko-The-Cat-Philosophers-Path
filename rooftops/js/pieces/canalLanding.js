// pieces/canalLanding.js — Roof Road piece 'canalLanding': a canal landing with its steps and posts.
// Lane r3-canal-market (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import { box, frameGroup } from './common.js';

export const canalLanding = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(ctx.rail, sm);
  const w = pc.s1 - pc.s0;
  g.add(box(w, 0.14, 1.25, M.timberMed, 0, pc.y - 0.07, pc.d));
  for (let i = 0; i < 3; i++) {
    const h = pc.y * (i + 1) / 3;
    const step = box(w * 0.62, 0.12, 0.36, M.wetStone, (i - 1) * w * 0.14, h - 0.06, pc.d + (pc.side === 'near' ? 0.75 + i * 0.28 : -0.75 - i * 0.28));
    g.add(step);
  }
  for (const x of [-w / 2 + 0.12, w / 2 - 0.12]) {
    const post = box(0.08, pc.y + 0.48, 0.08, M.timber, x, (pc.y + 0.48) / 2, pc.d + 0.52);
    g.add(post);
  }
  ctx.add(g);
};
