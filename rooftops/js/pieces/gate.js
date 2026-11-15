// pieces/gate.js — Roof Road piece 'gate': the temple gate.
// Lane r4-festival (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import { box, frameGroup } from './common.js';
import { tsumaRoof } from './machiya.js';

export const gate = (pc, ctx) => {
  const { M, rail } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(rail, sm);
  const x0 = pc.s0 - sm, x1 = pc.s1 - sm;
  const zF = pc.dFront, zB = zF - pc.depth, zm = (zF + zB) / 2;
  for (const x of [x0 + 0.3, x0 + 2.2, x1 - 2.2, x1 - 0.3]) for (const z of [zF - 0.3, zB + 0.3]) {
    g.add(box(0.36, pc.foot, 0.36, M.timber, x, pc.foot / 2, z));
  }
  g.add(box(x1 - x0, 0.4, pc.depth, M.timber, 0, pc.foot - 0.2, zm));
  g.add(box(x1 - x0 - 0.4, 0.6, 0.2, M.timber, 0, pc.foot - 1.0, zF - 0.3));
  g.add(box(2.4, 3.2, 0.1, M.timberMed, 0, 1.6, zm));
  tsumaRoof(g, M, x0, x1, zF, zB, pc.foot, pc.ridge, 0.6);
  ctx.add(g);
};
