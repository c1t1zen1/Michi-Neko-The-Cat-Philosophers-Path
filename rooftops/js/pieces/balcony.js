// pieces/balcony.js — Roof Road piece 'balcony': engawa, shop awnings and alley bridges.
// Lane r2-roofs-streets (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import { box, cyl, frameGroup } from './common.js';

export const balcony = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0;
  const g = frameGroup(ctx.rail, sm);
  const near = pc.d > -1;
  const outer = pc.d + (near ? 0.72 : -0.72);
  const inner = pc.d - (near ? 0.38 : -0.38);
  const deckMat = pc.style === 'awning' ? M.cloth[(Math.floor(pc.look * 7) + 1) % M.cloth.length] : M.timberMed;

  g.add(box(w, pc.style === 'awning' ? 0.07 : 0.11, 1.45, deckMat, 0, pc.y - 0.055, pc.d));
  g.add(box(w, 0.08, 0.1, M.timber, 0, pc.y - 0.13, outer));
  for (let x = -w / 2 + 0.12; x < w / 2; x += 0.78) {
    const brace = box(0.065, Math.max(0.6, pc.y - 0.25), 0.065, M.timber, x,
      (pc.y - 0.25) / 2, inner);
    g.add(brace);
    if (pc.style !== 'awning') g.add(box(0.055, 0.46, 0.055, M.timber, x, pc.y + 0.23, outer));
  }
  if (pc.style !== 'awning') {
    g.add(box(w, 0.055, 0.06, M.timber, 0, pc.y + 0.48, outer));
  } else {
    // A scalloped shop awning: the fringe moves with the same breeze shader as
    // the laundry, while the timber braces explain why a cat can stand on it.
    for (let x = -w / 2 + 0.18, i = 0; x < w / 2 - 0.05; x += 0.36, i++) {
      g.add(box(0.28, 0.16 + (i % 2) * 0.05, 0.018, deckMat, x, pc.y - 0.13, outer + 0.04));
    }
  }
  if (pc.style === 'bridge') {
    for (const x of [-w / 2 + 0.12, w / 2 - 0.12]) {
      const rope = cyl(0.018, 2.1, M.hemp, 'y', 5);
      rope.position.set(x, pc.y + 0.98, outer);
      g.add(rope);
    }
  }
  if (pc.look > 0.46) {
    const lantern = cyl(0.105, 0.28, pc.look > 0.72 ? M.lanternRed : M.lanternWhite, 'y', 9);
    lantern.position.set((pc.look - 0.5) * w * 0.75, pc.y - 0.28, outer);
    g.add(lantern);
    ctx.light(ctx.rail, sm, pc.y - 0.25, outer);
  }
  ctx.add(g);
};
