// pieces/deck.js — Roof Road piece 'deck': yuka decks on stilts and the kaisho plank.
// Lane r2-roofs-streets (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import { box, frameGroup } from './common.js';

export const deck = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0;
  const g = frameGroup(ctx.rail, sm);
  if (pc.style === 'plank') {
    g.add(box(w, 0.08, 0.5, M.timberMed, 0, pc.y - 0.04, pc.d));
    for (const z of [-0.26, 0.26]) g.add(box(w, 0.05, 0.05, M.lacquer, 0, pc.y + 0.55, pc.d + z));
    ctx.add(g);
    return;
  }
  // Yuka: a timber deck on stilts over the riverbank, lanterns and low tables.
  g.add(box(w, 0.12, 2.6, M.timberMed, 0, pc.y - 0.06, pc.d));
  for (let x = -w / 2 + 0.2; x <= w / 2 - 0.15; x += 1.6) {
    for (const z of [pc.d - 1.2, pc.d + 1.2]) g.add(box(0.12, pc.y, 0.12, M.timber, x, pc.y / 2, z));
  }
  g.add(box(w, 0.06, 0.06, M.timber, 0, pc.y + 0.55, pc.d + 1.28));
  for (let x = -w / 2 + 1.2; x < w / 2 - 0.8; x += 2.4) {
    g.add(box(0.9, 0.3, 0.55, M.dark, x, pc.y + 0.15, pc.d - 0.2));
    g.add(box(0.4, 0.06, 0.4, M.goods[3], x - 0.6, pc.y + 0.03, pc.d - 0.2));
    g.add(box(0.4, 0.06, 0.4, M.goods[3], x + 0.6, pc.y + 0.03, pc.d - 0.2));
  }
  ctx.add(g);
};
