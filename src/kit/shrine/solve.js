// The torii's pure numbers (no three.js, so a node test can sweep them).
// The kasagi and shimaki are swept along one curve; the posts are cut on that
// curve at their tops so the lintel underside sits on the whole post top at
// every param (the card's "solve the underside at each leaning post").
export const SORI = { straight: [0, 0, 0, 0, 0], gentle: [0, 0.01, 0.03, 0.07, 0.13], myojin: [0, 0.015, 0.05, 0.12, 0.24], deep: [0, 0.03, 0.1, 0.24, 0.46] };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Catmull-Rom through evenly spaced values: the kasagi's drawn curve (0 centre .. 1 end). */
export const curveOf = (vals) => (t) => {
  const n = vals.length - 1, x = clamp(t, 0, 1) * n, i = Math.min(n - 1, Math.floor(x)), f = x - i;
  const a = vals[Math.max(0, i - 1)], b = vals[i], c = vals[i + 1], d = vals[Math.min(n, i + 2)];
  return 0.5 * ((2 * b) + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
};

/** The solved dimensions of a gate. Kasagi top at the centre = p.height. */
export function solveGate(p) {
  const lintelH = 0.28, shimH = 0.14, C = curveOf(SORI[p.sori] || SORI.gentle);
  const L = p.span + 2 * p.ext;
  let H = p.height, Cb = 0;
  for (let i = 0; i < 8; i++) {                       // the lean runs over the real post height H
    const topX = p.span / 2 - p.lean * H;
    Cb = C(Math.abs(topX) / (L / 2));
    H = p.height - shimH - lintelH + Cb + 0.027;
  }
  const shimY = H + shimH / 2 - Cb - 0.015;
  const kasY = shimY + (shimH + lintelH) / 2 - 0.012;
  return { lintelH, shimH, C, L, H, Cb, shimY, kasY, nukiH: 0.3, nukiTop: H - 0.02 };
}

/** Height of the (cut) post top at world x: it follows the lintel curve. */
export const postTopY = (S, x) => S.H + S.C(Math.abs(x) / (S.L / 2)) - S.Cb;
/** Underside of the shimaki at world x (the beam the posts bear). */
export const undersideY = (S, x) => S.shimY + S.C(Math.abs(x) / (S.L / 2)) - S.shimH / 2;

/** Gap (+) or penetration (-) between post top and beam underside across the post's top width. */
export function bearingFit(p) {
  const S = solveGate(p), cx = p.span / 2 - p.lean * S.H, r = p.post_r * p.taper;
  let gap = -Infinity, pen = Infinity;
  for (let k = 0; k <= 20; k++) {
    const x = cx - r + (2 * r * k) / 20, d = undersideY(S, x) - postTopY(S, x);
    gap = Math.max(gap, d); pen = Math.min(pen, d);
  }
  return { gap, pen };
}
