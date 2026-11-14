// node --test src/kit/shrine/solve.test.mjs : the torii bearing holds across the param range.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bearingFit, SORI } from './solve.js';

const R = { span: [2.4, 3.6, 6], height: [3.2, 5.29, 7], post_r: [0.12, 0.28, 0.4], taper: [0.6, 0.79, 1], lean: [0, 0.02, 0.05], ext: [0.4, 1.3, 1.8] };
test('lintel underside sits on the post top for every sori x post_r x ext x span x lean x height', () => {
  let n = 0, worstGap = -1, worstPen = 1;
  for (const sori of Object.keys(SORI)) for (const post_r of R.post_r) for (const ext of R.ext) for (const span of R.span) for (const lean of R.lean) for (const height of R.height) for (const taper of R.taper) {
    const f = bearingFit({ sori, post_r, ext, span, lean, height, taper });
    worstGap = Math.max(worstGap, f.gap); worstPen = Math.min(worstPen, f.pen); n++;
    assert.ok(f.gap <= 0.01, `gap ${f.gap} at ${sori} r${post_r} ext${ext} span${span}`);
    assert.ok(f.pen >= -0.03, `penetration ${f.pen} at ${sori} r${post_r} ext${ext} span${span}`);
  }
  console.log(`${n} combinations, worst gap ${worstGap.toFixed(4)}, worst penetration ${worstPen.toFixed(4)}`);
});
