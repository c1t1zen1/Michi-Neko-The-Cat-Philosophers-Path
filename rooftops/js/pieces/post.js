// pieces/post.js — Roof Road piece 'post': a lantern post with its red chōchin.
// Lane r2-roofs-streets (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import { box, cyl, frameGroup } from './common.js';

export const post = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(ctx.rail, sm);
  g.add(box(0.1, pc.y - 1.4, 0.1, M.timber, 0, 1.4 + (pc.y - 1.4) / 2, pc.d));
  g.add(box(0.3, 0.05, 0.3, M.agedWood, 0, pc.y - 0.02, pc.d));
  for(const y of [pc.y-.12,1.5]) {g.add(box(.13,.055,.13,M.steel,0,y,pc.d));}
  for(const side of [-1,1]) {const brace=box(.035,.38,.04,M.agedWood,side*.1,pc.y-.18,pc.d);brace.rotation.z=side*-.48;g.add(brace);}

  const l = cyl(0.16, 0.4, M.lanternRed, 'y', 10);
  l.position.set(0, pc.y - 0.35, pc.d + 0.25);
  g.add(l);
  ctx.add(g);
  ctx.light(ctx.rail, sm, pc.y - 0.35, pc.d + 0.3);
};
