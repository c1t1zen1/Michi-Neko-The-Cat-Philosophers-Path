// The torii (valley gate and, with other params, the summit entrance).
// A myojin gate solved from the lab (labs/shrine/js/gate.js, 'myojin'): the
// kasagi and shimaki are swept along ONE curve and sit exactly on the leaning
// posts (the lintel underside is solved at the bearing point, labs/REVIEW
// 2026-11-10), the nuki passes through the posts, black kusabi wedges and a
// black nemaki sleeve at each foot on a lathe kamebara stone.
//
// Game fit: with the defaults the nuki top is 4.91 m and the kasagi top 5.29 m
// at the centre, which are the climbing platforms countryside.layoutTorii
// registers (late-game route); the three joinery pegs stay at +-span/2.
// Geometry is merged per material: lacquer frame, black kasagi/sleeves, stone.
import * as THREE from 'three';
import { V3, sweep, ringRect, tube, lerp } from '../craft.js?v=20261113a';
import { defineAsset } from '../contract.js?v=20261113a';
import { SORI, curveOf, solveGate, postTopY } from './solve.js?v=20261113a';
import { bake, castMesh, byTier, gameMat } from './util.js?v=20261113a';

export { SORI, curveOf, solveGate };
const DEFAULT_PAINT = 0xd8482c;

/** Shear the last few centimetres of a beam so its end face is cut at an angle. */
function cutEnds(g, halfL, tan, yMid) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    if (Math.abs(x) > halfL * 0.985) p.setX(i, x + Math.sign(x) * (p.getY(i) - yMid) * tan);
  }
  g.computeVertexNormals();
  return g;
}

function beamOnCurve(L, y0, curve, h, d, bev, steps, tan = 0.35) {
  const pts = [];
  for (let i = 0; i <= steps; i++) { const t = i / steps, x = (t - 0.5) * L, u = Math.abs(x) / (L / 2); pts.push(V3(x, y0 + curve(u), 0)); }
  return cutEnds(sweep(pts, ringRect(h, d, bev), { uScale: 1.2 }), L / 2, tan, y0 + curve(1));
}

function buildTorii(ctx, layout, p) {
  const { THREE: T, tier, kitMaterials: km } = ctx;
  const S = solveGate(p), n = byTier(tier, 48, 20, 8), radial = byTier(tier, 18, 12, 6), stone = p.finish === 'stone';
  const paint = p.paint === DEFAULT_PAINT ? gameMat(ctx, 'lacquer', () => km.lacquer()) : km.lacquer({ color: p.paint });
  const black = km.lacquer({ color: 0x1c1816, rough: 0.45, grime: 0.2 });
  const stoneMat = gameMat(ctx, 'stone', () => km.stone());
  const body = stone ? stoneMat : paint, top = stone ? stoneMat : black;
  const frame = [], dark = [], foot = [];
  const half = p.span / 2;
  for (const s of [-1, 1]) {
    const a = V3(s * half, 0, 0), b = V3(s * (half - p.lean * p.height), S.H, 0);
    const post = tube([a, a.clone().lerp(b, 0.5), b], (t) => p.post_r * lerp(1, p.taper, t), { radial, uScale: 1.2 });
    const pp = post.attributes.position;           // cut the post top on the lintel curve
    for (let i = 0; i < pp.count; i++) if (pp.getY(i) > S.H - 1e-4) pp.setY(i, postTopY(S, pp.getX(i)));
    post.computeVertexNormals();
    frame.push(post);
    if (tier !== 'far') {
      if (!stone) dark.push(tube([a, V3(s * (half - p.lean * 0.6), 0.6, 0)], (t) => p.post_r * lerp(1.14, 1.08, t), { radial, uScale: 1.2 }));
      const k = new T.LatheGeometry([[0.001, 0], [p.post_r * 1.25, 0], [p.post_r * 1.27, 0.07], [p.post_r * 1.12, 0.2], [p.post_r * 0.98, 0.3], [0.001, 0.31]].map(([x, y]) => new T.Vector2(x, y)), radial);
      foot.push(k.translate(s * half, 0, 0));
      // black kusabi wedges driven in under the nuki where it passes through each post
      const wx = s * (half - p.lean * (S.nukiTop - S.nukiH));
      dark.push(new T.BoxGeometry(0.46, 0.17, 0.34).translate(wx, S.nukiTop - S.nukiH - 0.085, 0));
    }
  }
  // the nuki: straight through both posts, projecting a metre each side
  const NL = p.span + 2;
  frame.push(sweep([V3(-NL / 2, S.nukiTop - S.nukiH / 2, 0), V3(NL / 2, S.nukiTop - S.nukiH / 2, 0)], ringRect(S.nukiH, 0.34, 0.02), { uScale: 1.2 }));
  // the shimaki rides under the kasagi; both are cut on a slant and swept on the same curve
  if (tier !== 'far') frame.push(beamOnCurve(S.L * 0.965, S.shimY, (t) => S.C(t * 0.965), S.shimH, 0.44, 0.02, n));
  const kas = beamOnCurve(S.L, S.kasY, S.C, S.lintelH, 0.5, 0.03, n);
  if (stone || tier === 'far') frame.push(kas); else dark.push(kas);
  // joinery pegs of the late-game climb (platforms come from the layout)
  if (p.pegs) for (const [sx, sy] of [[-half, 1.35], [-half, 2.55], [half, 3.65]]) frame.push(new T.BoxGeometry(0.72, 0.16, 0.72).translate(sx, sy, 0));

  const group = new T.Group(), parts = {};
  parts.frame = castMesh(bake(frame), body); group.add(parts.frame);
  if (dark.length) { parts.kasagi = castMesh(bake(dark), top); group.add(parts.kasagi); }
  if (foot.length) { parts.footing = castMesh(bake(foot), stoneMat); group.add(parts.footing); }
  return { group, parts, sockets: {}, live: [] };
}

const GATE_PARAMS = {
  span: { type: 'number', default: 3.6, min: 2.4, max: 6, step: 0.1, label: 'Span between posts (m)' },
  height: { type: 'number', default: 5.29, min: 3.2, max: 7, step: 0.05, label: 'Height to the kasagi top (m)' },
  post_r: { type: 'number', default: 0.28, min: 0.12, max: 0.4, step: 0.01, label: 'Post radius at the foot (m)' },
  taper: { type: 'number', default: 0.79, min: 0.6, max: 1, step: 0.01, label: 'Post taper (top / foot)' },
  lean: { type: 'number', default: 0.02, min: 0, max: 0.05, step: 0.005, label: 'Inward lean (uchikorobi)' },
  ext: { type: 'number', default: 1.3, min: 0.4, max: 1.8, step: 0.05, label: 'Kasagi overhang past each post (m)' },
  sori: { type: 'enum', default: 'gentle', options: ['straight', 'gentle', 'myojin', 'deep'], label: 'Sweep of the lintel' },
  finish: { type: 'enum', default: 'lacquer', options: ['lacquer', 'stone'], label: 'Finish' },
  paint: { type: 'color', default: DEFAULT_PAINT, label: 'Vermilion' },
  pegs: { type: 'boolean', default: true, label: 'Late-game joinery pegs' }
};

export const assets = [
  defineAsset({
    id: 'torii', family: 'shrine', lab: 'shrine/myojin', label: 'Torii gate', legacyName: 'Torii Gate',
    params: GATE_PARAMS, tiers: ['hero', 'mid', 'far'], sample: { x: 0, y: 0, z: 0, index: 0, name: 'Torii Gate' }, build: buildTorii
  })
];
