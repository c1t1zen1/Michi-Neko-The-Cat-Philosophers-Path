// pieces/marketCrossing.js — Roof Road piece 'marketCrossing': a market crossing slung under a skylight.
// Lane r3-canal-market (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import { box, cyl, frameGroup } from './common.js';

export const marketCrossing = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0;
  const g = frameGroup(ctx.rail, sm);

  // A narrow bridge slung below the missing canopy bay. The long crossbeams
  // and suspension ropes make the depth change legible from a side camera.
  g.add(box(w, 0.11, 1.2, M.timberMed, 0, pc.y - 0.055, pc.d));
  for (let x = -w / 2 + 0.18; x <= w / 2 - 0.12; x += 0.34) {
    g.add(box(0.07, 0.08, 1.34, M.timber, x, pc.y - 0.12, pc.d));
  }
  for (const x of [-w / 2 + 0.08, w / 2 - 0.08]) {
    for (const z of [pc.d - 0.52, pc.d + 0.52]) {
      const rope = cyl(0.018, 1.12, M.hemp, 'y', 5);
      rope.position.set(x, pc.y + 0.55, z);
      g.add(rope);
    }
  }
  const toward = pc.side === 'near' ? 1 : -1;
  const crossZ = pc.d - toward * 1.65;
  g.add(box(0.13, 0.1, 4.3, M.steel, 0, pc.y + 1.05, crossZ));
  for (const z of [-1, 0, 1]) {
    const pennant = box(0.42, 0.52, 0.018, M.goods[(z + 3) % M.goods.length], 0,
      pc.y + 0.72, crossZ + z * 0.82);
    pennant.rotation.y = 0.04 * z;
    g.add(pennant);
  }
  const lamp = cyl(0.13, 0.34, M.lanternWhite, 'y', 10);
  lamp.position.set(0, pc.y + 0.42, pc.d + toward * 0.8);
  g.add(lamp);
  ctx.add(g);
  ctx.light(ctx.rail, sm, pc.y + 0.42, pc.d + toward * 0.8);
};
