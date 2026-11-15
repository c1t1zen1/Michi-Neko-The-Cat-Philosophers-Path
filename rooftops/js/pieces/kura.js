// pieces/kura.js — Roof Road piece 'kura': a kura storehouse with namako skirt and barred window.
// Lane r2-roofs-streets (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import { box, frameGroup } from './common.js';
import { tsumaRoof } from './machiya.js';

export const kura = (pc, ctx) => {
  const { M, rail } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(rail, sm);
  const x0 = pc.s0 - sm, x1 = pc.s1 - sm, w = x1 - x0;
  const zF = pc.dFront, zB = zF - pc.depth, zm = (zF + zB) / 2;
  g.add(box(w, pc.foot, pc.depth, M.plaster, 0, pc.foot / 2, zm));
  g.add(box(w + 0.05, 1.6, pc.depth + 0.05, M.namako, 0, 0.8, zm));
  g.add(box(w + 0.16, 0.22, pc.depth + 0.16, M.timber, 0, pc.foot - 0.11, zm));
  // A small barred window high on the gable side.
  g.add(box(0.8, 0.7, 0.08, M.dark, 0, pc.foot - 1.0, zF + 0.03));
  for (let i = -1; i <= 1; i++) g.add(box(0.05, 0.7, 0.1, M.plaster, i * 0.22, pc.foot - 1.0, zF + 0.05));
  tsumaRoof(g, M, x0, x1, zF, zB, pc.foot, pc.ridge, 0.25);
  ctx.add(g);
};
