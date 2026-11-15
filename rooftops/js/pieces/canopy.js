// pieces/canopy.js — Roof Road piece 'canopy': Nishiki's glass canopy: vault sections, steel ribs, skylight gaps, banners.
// Lane r3-canal-market (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import * as THREE from 'three';
import { box, frameGroup } from './common.js';

export const canopy = (pc, ctx) => {
  const { M, rail } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(rail, sm);
  const R = 3.63, half = Math.asin(2.0 / R);
  const yC = pc.y - R;
  // Translucent vault in sections, skipping the skylights.
  const cuts = [pc.s0, ...pc.gaps.flat(), pc.s1];
  for (let i = 0; i < cuts.length; i += 2) {
    const a = cuts[i] - sm, b = cuts[i + 1] - sm;
    const pos = [], idx = [];
    const K = 10;
    for (const x of [a, b]) {
      for (let k = 0; k <= K; k++) {
        const ang = -half + (2 * half * k) / K;
        pos.push(x, yC + Math.cos(ang) * R, pc.d + Math.sin(ang) * R);
      }
    }
    for (let k = 0; k < K; k++) idx.push(k, k + 1, K + 1 + k, k + 1, K + 2 + k, K + 1 + k);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, M.glass));         // pulled out with its world transform in buildWorld()
  }
  // Steel ribs and the side beams the vault springs from.
  for (let x = pc.s0 - sm; x <= pc.s1 - sm + 0.01; x += 2.4) {
    for (let k = 0; k < 6; k++) {
      const a0 = -half + (2 * half * k) / 6, a1 = -half + (2 * half * (k + 1)) / 6;
      const z0 = pc.d + Math.sin(a0) * R, y0 = yC + Math.cos(a0) * R;
      const z1 = pc.d + Math.sin(a1) * R, y1 = yC + Math.cos(a1) * R;
      const seg = box(0.06, 0.08, Math.hypot(z1 - z0, y1 - y0) + 0.02, M.steel, x, (y0 + y1) / 2, (z0 + z1) / 2);
      seg.rotation.x = -Math.atan2(y1 - y0, z1 - z0);
      g.add(seg);
    }
  }
  const len = pc.s1 - pc.s0;
  for (const z of [pc.d - 2.0, pc.d + 2.0]) {
    g.add(box(len, 0.14, 0.14, M.steel, 0, yC + Math.cos(half) * R - 0.05, z));
  }
  // Hanging banners in the market's colours.
  for (let x = pc.s0 - sm + 1.2, i = 0; x < pc.s1 - sm - 0.5; x += 3.6, i++) {
    g.add(box(0.7, 1.0, 0.015, M.goods[i % M.goods.length], x, pc.y - 1.35, pc.d + (i % 2 ? 0.9 : -0.9)));
  }
  ctx.add(g);
  for (let s = pc.s0 + 4; s < pc.s1; s += 9) ctx.light(rail, s, pc.y - 1.0, pc.d);
};
