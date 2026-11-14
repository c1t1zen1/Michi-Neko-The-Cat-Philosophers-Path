// The guardian crow's modular body (promoted from the labs/critters study):
// body, head, beak, tail fan, two legs and two HINGED wings. Metres, nose +Z,
// about 0.5 m long at the game's size 1.4. AmbientLife.updateGuardianBirds drives
// `wing_l` / `wing_r` rotation.z (left +theta, right -theta: the right hinge is
// mirrored by scale.x = -1) and lookAt()s the whole group at the cat, so the
// nose is +Z. The wrist hinge (wing_*_hand) and the tail fan follow the shoulder
// in update(), which reads the wing angle: no behaviour change is needed.
// Tiers: hero (body, head, beak, tail, 2 legs, 2x arm + wrist + primaries = 14
// meshes), mid (body with head/beak/tail/legs merged + one mesh a wing = 3),
// far (one body mesh + one wing quad a side = 3, 3-sided lathe).
import * as THREE from 'three';
import { Bag } from '../../kit/craft.js?v=20261113a';

const shared = (g) => { g.userData.sharedGeometry = true; return g; };
const col = (h) => new THREE.Color(h);
const _mats = new Map();

function materials(def) {
  const key = def.id + ':' + Object.values(def.palette).join(',');
  if (!_mats.has(key)) {
    const solid = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.15, name: 'crow:solid' });
    const wing = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide, name: 'crow:wing' });
    solid.userData.kit = wing.userData.kit = true;
    _mats.set(key, { solid, wing });
  }
  return _mats.get(key);
}

function paint(g, fn) {
  const p = g.attributes.position, c = new Float32Array(p.count * 3), k = new THREE.Color();
  for (let i = 0; i < p.count; i++) { fn(k, p.getX(i), p.getY(i), p.getZ(i)); c.set([k.r, k.g, k.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

function shapeGeo(pts, fn) {
  const s = new THREE.Shape(); s.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) s.lineTo(...pts[i]); s.closePath();
  return paint(new THREE.ShapeGeometry(s).rotateX(Math.PI / 2), fn);
}

const geoCache = new Map();
function geometries(def, tier) {
  const key = def.id + ':' + tier;
  if (geoCache.has(key)) return geoCache.get(key);
  const P = def.palette, hero = tier === 'hero', seg = hero ? 12 : tier === 'mid' ? 8 : 5;
  const body = col(P.body), sheen = col(P.sheen), wingC = col(P.wing);
  const G = {};
  const torso = () => paint(new THREE.SphereGeometry(0.075, seg, Math.max(4, seg - 3)).scale(0.85, 0.8, 1.9), (k, x, y) => k.copy(body).lerp(sheen, THREE.MathUtils.smoothstep(y, 0.0, 0.06)));
  const headG = () => new THREE.SphereGeometry(0.052, Math.max(6, seg - 2), Math.max(4, seg - 4)).scale(0.95, 0.95, 1.05);
  const beakG = () => new THREE.ConeGeometry(0.026, 0.12, 6).rotateX(Math.PI / 2).scale(0.75, 1.1, 1);
  const tailG = () => { // a fan of three overlapping feathers
    const f = (a) => shapeGeo([[-0.02, 0], [-0.04, -0.2], [0.04, -0.2], [0.02, 0]], (k, x, y, z) => k.copy(sheen).lerp(body, THREE.MathUtils.smoothstep(z, 0, 0.2))).rotateY(a);
    return hero ? [f(-0.22), f(0), f(0.22)] : [f(0)];
  };
  const legG = () => new THREE.CylinderGeometry(0.006, 0.005, 0.07, 5);
  const arm = () => shapeGeo([[0, 0.05], [0.15, 0.06], [0.17, -0.04], [0, -0.07]], (k, x) => k.copy(wingC).lerp(sheen, x / 0.17 * 0.5));
  const fan = () => {
    const pts = [[0, 0.06], [0.2, 0.05], [0.3, 0.0]];
    for (let i = 0; i < 5; i++) { pts.push([0.27 - i * 0.035, -0.02 - i * 0.012]); pts.push([0.255 - i * 0.035, -0.07 - i * 0.004]); }
    pts.push([0, -0.06]);
    return shapeGeo(pts, (k, x) => k.copy(wingC).lerp(body, THREE.MathUtils.smoothstep(x, 0.05, 0.3) * 0.7));
  };
  const staticBag = (withHead) => {
    const b = new Bag();
    b.add(torso(), { z: -0.02, keep: true });
    if (withHead) {
      b.add(headG(), { y: 0.035, z: 0.15, color: P.body });
      b.add(beakG(), { y: 0.026, z: 0.245, color: P.beak });
      for (const g of tailG()) b.add(g, { y: 0.005, z: -0.15, keep: true });
      for (const s of [-1, 1]) b.add(legG(), { x: s * 0.03, y: -0.085, color: P.leg });
      if (hero) for (const s of [-1, 1]) b.sphere(0.011, { x: s * 0.044, y: 0.052, z: 0.178, color: P.eye });
    }
    return b;
  };
  if (hero) {
    G.body = shared(new Bag().add(torso(), { z: -0.02, keep: true }).geometry());
    G.head = shared((() => { const b = new Bag(); b.add(headG(), { color: P.body }); for (const s of [-1, 1]) b.sphere(0.011, { x: s * 0.044, y: 0.017, z: 0.028, color: P.eye }); return b.geometry(); })());
    G.beak = shared(new Bag().add(beakG(), { color: P.beak }).geometry());
    G.tail = shared((() => { const b = new Bag(); for (const g of tailG()) b.add(g, { keep: true }); return b.geometry(); })());
    G.leg = shared(new Bag().add(legG(), { color: P.leg }).geometry());
    G.arm = shared(arm()); G.fan = shared(fan());
  } else {
    G.body = shared(staticBag(true).geometry());
    if (tier === 'mid') G.wing = shared(new Bag().add(arm(), { keep: true }).add(fan(), { x: 0.17, keep: true }).geometry());
    else G.wing = shared(shapeGeo([[0, 0.05], [0.17, 0.06], [0.47, 0], [0.2, -0.05], [0, -0.07]], (k, x) => k.copy(wingC).lerp(body, x / 0.47 * 0.7)));
  }
  geoCache.set(key, G);
  return G;
}

/** Build one guardian crow. layout.size is the classic body scale (1.4); p.size multiplies it. */
export function buildCrow(def, ctx, layout, p = {}) {
  const tier = ctx.tier, G = geometries(def, tier), { solid, wing } = materials(def);
  const group = new THREE.Group(), pr = {}, live = [];
  const mesh = (geo, name, mat, parent = group) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; parent.add(m); live.push(m); pr[name] = m; return m; };
  const hinge = (side, k) => { // shoulder hinge at the wing root; the right one is mirrored
    const h = new THREE.Group(); h.position.set(side * 0.04, 0.025, 0.04); if (side < 0) h.scale.x = -1; group.add(h); pr['wing_' + k] = h; return h;
  };
  const hands = [];
  if (tier === 'hero') {
    mesh(G.body, 'body', solid);
    mesh(G.head, 'head', solid).position.set(0, 0.035, 0.15);
    mesh(G.beak, 'beak', solid).position.set(0, 0.026, 0.245);
    mesh(G.tail, 'tail', wing).position.set(0, 0.005, -0.15);
    for (const [k, s] of [['l', 1], ['r', -1]]) {
      mesh(G.leg, 'leg_' + k, solid).position.set(s * 0.03, -0.085, 0);
      const h = hinge(s, k);
      mesh(G.arm, `wing_${k}_arm`, wing, h);
      const hand = new THREE.Group(); hand.position.set(0.17, 0, 0); h.add(hand); pr[`wing_${k}_hand`] = hand; hands.push([hand, h, s]);
      mesh(G.fan, `wing_${k}_primaries`, wing, hand);
    }
  } else {
    mesh(G.body, 'body', solid);
    for (const [k, s] of [['l', 1], ['r', -1]]) mesh(G.wing, `wing_${k}_arm`, wing, hinge(s, k));
  }
  const s = (def.scale || 1) * (p.size || 1) * ((layout && layout.size) || 1.4) / 1.4;
  group.scale.setScalar(s);
  group.userData.baseScale = s;

  // the wrist folds the primaries on the upstroke, following whatever the shoulder is told to do
  const update = () => {
    for (const [hand, h, sg] of hands) hand.rotation.z = -(h.rotation.z * sg - 0.16) * 0.5 * sg - 0.05 * sg;
    if (pr.tail) pr.tail.rotation.x = 0.04 + 0.05 * Math.sin(pr.wing_l.rotation.z * 2);
  };
  update();
  return { group, parts: pr, sockets: {}, live, update: tier === 'hero' ? update : () => {}, dispose() {} };
}
