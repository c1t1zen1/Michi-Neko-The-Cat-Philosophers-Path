// pieces/kido.js — Roof Road piece 'kido': the kido gate at the first street.
// Lane r2-roofs-streets (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import { box, slope, frameGroup } from './common.js';
import { ridgeCap } from './machiya.js';

export const kido = (pc, ctx) => {
  const { M, rail } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(rail, sm);
  const hw = (pc.s1 - pc.s0) / 2;
  for (const x of [-hw + 0.15, hw - 0.15]) g.add(box(0.18, 2.2, 0.18, M.timber, x, 1.1, pc.d));
  g.add(box(hw * 2, 0.16, 0.2, M.timber, 0, 2.1, pc.d));
  slope(g, M.roof, { x: 0, y: 2.15, z: pc.d + 0.55 }, 0.1, 0.55, hw * 2 + 0.3, 0);
  slope(g, M.roof, { x: 0, y: 2.15, z: pc.d - 0.55 }, 0.1, 0.55, hw * 2 + 0.3, Math.PI);
  ridgeCap(g, M, -hw - 0.15, hw + 0.15, pc.y - 0.25, pc.d);
  // The gate leaves stand open.
  for (const sx of [-1, 1]) {
    const leaf = box(0.9, 1.8, 0.06, M.timberMed, sx * (hw - 0.2), 1.0, pc.d - 0.5);
    leaf.rotation.y = sx * 1.2;
    g.add(leaf);
  }
  ctx.add(g);
  ctx.light(rail, sm, 1.9, pc.d + 0.5);
};
