// pieces/canalBridge.js — Roof Road piece 'canalBridge': the arched canal footbridge.
// Lane r3-canal-market (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import { box, frameGroup } from './common.js';

export const canalBridge = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(ctx.rail, sm);
  const w = pc.s1 - pc.s0;
  // A tiny sori bridge: three gently stepped planks span bank to bank. The
  // collision top stays flat and forgiving while the silhouette reads arched.
  for (let i = -3; i <= 3; i++) {
    const z = pc.d + i * 0.62;
    const y = pc.y - 0.12 + 0.18 * (1 - Math.abs(i) / 3);
    g.add(box(w, 0.15, 0.66, M.timberMed, 0, y, z));
  }
  for (const side of [-1, 1]) {
    const z = pc.d + side * 2.0;
    g.add(box(w, 0.08, 0.08, M.lacquer, 0, pc.y + 0.65, z));
    for (let x = -w / 2 + 0.12; x <= w / 2 - 0.08; x += 0.48) {
      g.add(box(0.06, 0.7, 0.06, M.lacquer, x, pc.y + 0.3, z));
    }
  }
  const plaque = box(0.9, 0.35, 0.05, M.noren.indigo, 0, pc.y + 0.9, pc.d + 2.04);
  g.add(plaque);
  ctx.add(g);
};
