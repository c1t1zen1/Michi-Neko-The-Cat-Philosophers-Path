// River koi: a painted hide (canvas, 256px, cached per variant and pattern
// seed), a lathed body that is fatter at the shoulder, a dorsal sail, a
// deep-forked flowing tail on a pivot, and two pectoral pivots. The ambient
// life update drives `tail` (rotation.y) and `pectoral_l` / `pectoral_r`
// (rotation.z), ripples and the startle hook; this only supplies the meshes.
// Body, dorsal, tail and the two fins are the five live meshes a fish has
// (classic: body, outline, tail, dorsal, two fins, two eyes = 8).
import * as THREE from 'three';
import { TAU, rng as seeded, canvas2d, canvasTexture } from '../craft.js?v=20261113a';

const PATTERNS = {
  kohaku: { base: '#f6efe0', blobs: [['#d83a18', 5]], fin: 0xffd9c2 },
  sanke: { base: '#f6efe0', blobs: [['#d83a18', 4], ['#16131a', 4, 0.5]], fin: 0xffd9c2 },
  showa: { base: '#191720', blobs: [['#d83a18', 4], ['#f6efe0', 3, 0.8]], fin: 0x4a4250 },
  ogon: { base: '#e8b24a', blobs: [['#f6d26a', 6, 1.2]], fin: 0xf6cf74 },
  tancho: { base: '#f8f3e8', blobs: [], crown: true, fin: 0xfff1e4 }
};
export const KOI_VARIANTS = Object.keys(PATTERNS);

const shared = (g) => { g.userData.sharedGeometry = true; return g; };
const _cache = new WeakMap(); // kitMaterials -> { hide, fin, geo, ink }
const store = (km) => { if (!_cache.has(km)) _cache.set(km, { hide: new Map(), fin: new Map(), geo: {}, ink: null }); return _cache.get(km); };

/** The koi hide, painted once. u runs round the body (back at u .5), v from tail to nose (nose at the canvas top). */
function hideTexture(variant, seed) {
  const P = PATTERNS[variant] || PATTERNS.kohaku, [c, x] = canvas2d(256, 256), r = seeded(seed * 97 + variant.length);
  x.fillStyle = P.base; x.fillRect(0, 0, 256, 256);
  for (const [colr, n, sz = 1] of P.blobs) {
    x.fillStyle = colr;
    for (let i = 0; i < n; i++) {
      const cy = 30 + (i + r()) * (190 / n), cx = 128 + (r() - 0.5) * 120, R = (24 + r() * 26) * sz;
      for (let k = 0; k < 7; k++) { x.beginPath(); x.ellipse(cx + (r() - 0.5) * R * 1.3, cy + (r() - 0.5) * R * 1.2, R * (0.5 + r() * 0.5), R * (0.5 + r() * 0.4), r() * 3, 0, TAU); x.fill(); }
    }
  }
  if (P.crown) { x.fillStyle = '#d83a18'; x.beginPath(); x.ellipse(128, 34, 38, 28, 0, 0, TAU); x.fill(); }
  for (const cx of [64, 192]) { x.fillStyle = '#c3b784'; x.beginPath(); x.ellipse(cx, 30, 8, 6, 0, 0, TAU); x.fill(); x.fillStyle = '#14181a'; x.beginPath(); x.ellipse(cx, 30, 5, 4, 0, 0, TAU); x.fill(); }
  x.strokeStyle = 'rgba(30,20,20,.14)'; x.lineWidth = 1; // scale reticulation
  for (let y = 0; y < 256; y += 9) for (let i = 0; i < 28; i++) { x.beginPath(); x.arc(i * 9 + (y % 18 ? 4.5 : 0), y, 6, 0.2, Math.PI - 0.2); x.stroke(); }
  return canvasTexture(c);
}

function bodyGeometry(tier) {
  const prof = [[0.012, -0.5], [0.03, -0.45], [0.05, -0.36], [0.07, -0.25], [0.088, -0.12], [0.098, 0.0], [0.1, 0.1], [0.098, 0.2], [0.088, 0.3], [0.072, 0.38], [0.054, 0.44], [0.034, 0.48], [0.012, 0.5]];
  const seg = tier === 'hero' ? 24 : tier === 'mid' ? 14 : 8;
  const step = tier === 'far' ? 2 : 1;
  const pts = prof.filter((_, i) => i % step === 0 || i === prof.length - 1).map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(pts, seg).rotateX(Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), z = pos.getZ(i);
    pos.setX(i, pos.getX(i) * 0.8);                  // compressed from the sides
    pos.setY(i, y > 0 ? y * (1 + 0.16 * Math.exp(-((z - 0.05) ** 2) / 0.05)) : y * 0.94); // arched shoulder, flatter belly
  }
  g.computeVertexNormals();
  return shared(g);
}

function polyFin(pts, curves) {
  const s = new THREE.Shape(); s.moveTo(...pts[0]);
  for (const c of curves) s.quadraticCurveTo(...c);
  s.closePath();
  return new THREE.ShapeGeometry(s, 6);
}

function finGeometries(tier) {
  // Caudal: two soft lobes with a deep notch, root at the origin, sweeping to +x, then laid along -z
  const tail = polyFin([[0, 0.026]], [[0.12, 0.1, 0.3, 0.19], [0.27, 0.1, 0.2, 0.012], [0.19, 0, 0.2, -0.012], [0.27, -0.1, 0.3, -0.19], [0.12, -0.1, 0, -0.026]]).rotateY(Math.PI / 2);
  // Dorsal sail: along the back, rising from the shoulder
  const dorsal = polyFin([[-0.15, 0]], [[-0.09, 0.085, 0.03, 0.08], [0.1, 0.06, 0.17, 0]]).rotateY(-Math.PI / 2);
  // Pectoral fan, root at the origin reaching outward (+x) and back
  const pect = polyFin([[0, 0]], [[0.09, -0.015, 0.13, 0.055], [0.07, 0.095, 0, 0.045]]).rotateX(-Math.PI / 2);
  // soften the fin tips toward the root with a vertex-alpha-free taper: shade is in the material tint
  return { tail: shared(tail), dorsal: shared(dorsal), pect: shared(pect) };
}

export function buildKoi(ctx, layout, p) {
  const { tier, kitMaterials: km } = ctx;
  const S = store(km);
  const variant = PATTERNS[layout.variant] ? layout.variant : 'kohaku';
  const geo = (S.geo[tier] ||= { body: bodyGeometry(tier), fins: finGeometries(tier) });
  const hk = variant + ':' + ((layout.patternSeed || 1) % 4);
  const hide = S.hide.get(hk) || (S.hide.set(hk, new THREE.MeshStandardMaterial({ map: hideTexture(variant, (layout.patternSeed || 1) % 4 + 1), roughness: 0.4, metalness: variant === 'ogon' ? 0.45 : 0, name: 'critters:hide-' + hk })), S.hide.get(hk).userData.kit = true, S.hide.get(hk));
  const finMat = S.fin.get(variant) || (S.fin.set(variant, new THREE.MeshStandardMaterial({ color: PATTERNS[variant].fin, roughness: 0.55, side: THREE.DoubleSide, transparent: true, opacity: 0.8, depthWrite: false, name: 'critters:fin-' + variant })), S.fin.get(variant).userData.kit = true, S.fin.get(variant));

  const group = new THREE.Group(), parts = {};
  const body = new THREE.Mesh(geo.body, hide); body.castShadow = true; group.add(body); parts.body = body;
  if (tier === 'hero') { // the game's ink outline: one inverted hull on one shared basic material (+1 draw a fish, hero only)
    const ink = (S.ink ||= Object.assign(new THREE.MeshBasicMaterial({ color: 0x1b1418, side: THREE.BackSide, name: 'critters:ink' }), { userData: { kit: true } }));
    const hull = new THREE.Mesh(geo.body, ink); hull.scale.set(1.09, 1.07, 1.02); body.add(hull);
  }
  const far = tier === 'far'; // far: body and tail only (the pivots stay, empty, so the bound parts resolve)
  const dorsal = far ? null : new THREE.Mesh(geo.fins.dorsal, finMat);
  if (dorsal) { dorsal.position.set(0, 0.085, 0.02); group.add(dorsal); parts.dorsal = dorsal; }
  const tail = new THREE.Group(); tail.position.z = -0.485;
  const tailFin = new THREE.Mesh(geo.fins.tail, finMat); tailFin.scale.setScalar(p.tail); tail.add(tailFin);
  group.add(tail); parts.tail = tail;
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.07, -0.02, 0.2);
    if (!far) { const fin = new THREE.Mesh(geo.fins.pect, finMat); fin.scale.x = side; pivot.add(fin); }
    pivot.rotation.z = -side * 0.4;
    group.add(pivot); parts[side < 0 ? 'pectoral_l' : 'pectoral_r'] = pivot;
  }
  return { group, parts, sockets: {}, live: group.getObjectsByProperty('isMesh', true), dispose() {} };
}
