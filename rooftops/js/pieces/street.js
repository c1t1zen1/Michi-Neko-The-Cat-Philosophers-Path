// pieces/street.js — Roof Road piece 'street': the street ribbons under the run: Kamo gravel and river, canal bank, market slabs and cobbled lanes.
// Lane r2-roofs-streets (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import { ribbon } from './common.js';

export const street = (pc, ctx) => {
  const { M, rail } = ctx;
  const d = pc.d;
  if (pc.surface === 'gravel') {
    // The Roof Road opens over the Kamo. Its current runs across the route,
    // unlike the longitudinal Takase and Pontochō water, so it gets a
    // direction-aware copy of the painted water shader. Narrow foam seams
    // make both banks readable beneath the timber bridge.
    const river0 = pc.s0 + 2.2;
    const river1 = pc.s1 - 2.0;
    const waterY = pc.y + 0.055;
    ctx.add(ribbon(rail, pc.s0, pc.s1, d - 30, d + 18, pc.y, M.gravel, 0.5));
    ctx.addGlass(ribbon(rail, river0, river1, d - 30, d + 18, waterY, M.kamoWater, 0.2));
    ctx.addGlass(ribbon(rail, river0 + 0.03, river0 + 0.18, d - 29.5, d + 17.5, waterY + 0.018, M.foam, 0.45));
    ctx.addGlass(ribbon(rail, river1 - 0.18, river1 - 0.03, d - 29.5, d + 17.5, waterY + 0.018, M.foam, 0.45));
  } else if (pc.surface === 'bank') {
    ctx.add(ribbon(rail, pc.s0, pc.s1, d - 1.6, d + 1.8, pc.y, M.slab, 0.5));
    ctx.add(ribbon(rail, pc.s0, pc.s1, d + 1.8, d + 3.2, -0.15, M.gravel, 0.5));
    ctx.addGlass(ribbon(rail, pc.s0, pc.s1, d + 3.2, d + 30, -0.38, M.water, 0.2));
    ctx.addGlass(ribbon(rail, pc.s0 + 0.15, pc.s1 - 0.15, d + 3.22, d + 3.42, -0.35, M.foam, 0.65));
  } else if (pc.surface === 'market') {
    ctx.add(ribbon(rail, pc.s0, pc.s1, d - 2.4, d + 2.4, pc.y, M.slab, 0.5));
    ctx.add(ribbon(rail, pc.s0, pc.s1, d + 2.4, d + 9, pc.y - 0.02, M.cobble, 1));
  } else {
    ctx.add(ribbon(rail, pc.s0, pc.s1, d - 2.4, d + 7, pc.y, M.cobble, 1));
  }
};
