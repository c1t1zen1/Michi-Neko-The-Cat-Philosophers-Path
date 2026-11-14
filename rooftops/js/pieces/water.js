// pieces/water.js — Roof Road piece 'water': the Takase canal water and towpath.
// Lane r3-canal-market (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import { ribbon } from './common.js';

export const water = (pc, ctx) => {
  const { M, rail } = ctx;
  const waterY = pc.y + 0.18;
  ctx.add(ribbon(rail, pc.s0, pc.s1, pc.d - 1.55, pc.d + 1.65, pc.y - 0.04, M.sand, 0.5));
  ctx.addGlass(ribbon(rail, pc.s0, pc.s1, pc.d - 1.53, pc.d + 1.63, waterY, M.water, 0.24));
  // Soft current lines collect against the dressed-stone banks.
  ctx.addGlass(ribbon(rail, pc.s0 + 0.2, pc.s1 - 0.2, pc.d - 1.48, pc.d - 1.34, waterY + 0.018, M.foam, 0.7));
  ctx.addGlass(ribbon(rail, pc.s0 + 0.2, pc.s1 - 0.2, pc.d + 1.43, pc.d + 1.57, waterY + 0.018, M.foam, 0.7));
  // Kiyamachi's towpath remains the safe ground-level route beside the flow.
  // Keep it lane-narrow: an over-wide foreground apron hid the canal and its
  // stepping-stone maze whenever the cat dropped to water level.
  ctx.add(ribbon(rail, pc.s0, pc.s1, pc.d + 1.82, pc.d + 4.35, 0.0, M.cobble, 1));
};
