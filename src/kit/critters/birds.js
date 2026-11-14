// The sparrow flock: a painted sparrow with a head, bib, cheek patch, beak and a
// forked tail on ONE vertex-coloured body mesh, plus two hinged wings (a shaped
// primary fan, horizontal when the bird glides) that the ambient-life update
// flaps through wing_l / wing_r (rotation.z about the shoulder). 3 live meshes a
// bird (classic: 4). Geometry is cached per tier and shared by every bird.
import * as THREE from 'three';
import { Bag } from '../craft.js?v=20261113a';

const shared = (g) => { g.userData.sharedGeometry = true; return g; };
const _cache = new WeakMap(); // kitMaterials -> { wingMat, bodyGeo{tier}, wingGeo{tier} }
const store = (km) => { if (!_cache.has(km)) _cache.set(km, { geo: {}, wingMat: null }); return _cache.get(km); };

const C = { back: 0x6d5a48, breast: 0xc9b9a0, cap: 0x7a4a2c, bib: 0x2a2420, cheek: 0xe2d8c4, beak: 0x4a3f36, tail: 0x5a4a3c };
const col = (h) => new THREE.Color(h);

/** Body along +Z, nose forward: lathe torso coloured back-to-belly, head, bib, cheek, beak, forked tail. */
function bodyGeometry(tier) {
  const seg = tier === 'hero' ? 10 : tier === 'mid' ? 7 : 5;
  const prof = [[0, -0.17], [0.02, -0.1], [0.04, -0.02], [0.044, 0.05], [0.036, 0.11], [0.0, 0.14]].map(([r, y]) => new THREE.Vector2(r, y));
  const torso = new THREE.LatheGeometry(prof, seg).rotateX(Math.PI / 2);
  torso.scale(0.95, 0.9, 1); // slightly flat-sided
  const p = torso.attributes.position, cc = new Float32Array(p.count * 3), k = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), z = p.getZ(i);
    k.copy(col(C.breast)).lerp(col(C.back), THREE.MathUtils.smoothstep(y, -0.012, 0.025));
    if (z > 0.07 && y < 0.01) k.lerp(col(C.bib), 0.8); // bib under the throat
    cc.set([k.r, k.g, k.b], i * 3);
  }
  torso.setAttribute('color', new THREE.BufferAttribute(cc, 3));
  const bag = new Bag();
  bag.add(torso, { keep: true });
  bag.sphere(0.036, { x: 0, y: 0.03, z: 0.105, sz: 1.05, sy: 0.95, color: C.cap });
  if (tier !== 'far') {
    bag.sphere(0.02, { x: 0.03, y: 0.016, z: 0.12, sx: 0.6, color: C.cheek });
    bag.sphere(0.02, { x: -0.03, y: 0.016, z: 0.12, sx: 0.6, color: C.cheek });
  }
  bag.add(new THREE.ConeGeometry(0.011, 0.034, tier === 'far' ? 3 : 5).rotateX(Math.PI / 2), { x: 0, y: 0.024, z: 0.155, color: C.beak });
  // forked tail: two overlapping feather blades in the horizontal plane
  const tail = new THREE.Shape();
  tail.moveTo(-0.02, 0); tail.lineTo(-0.045, -0.15); tail.lineTo(-0.012, -0.12); tail.lineTo(0, -0.135); tail.lineTo(0.012, -0.12); tail.lineTo(0.045, -0.15); tail.lineTo(0.02, 0); tail.closePath();
  const tg = new THREE.ShapeGeometry(tail).rotateX(-Math.PI / 2);
  const tc = new Float32Array(tg.attributes.position.count * 3);
  for (let i = 0; i < tg.attributes.position.count; i++) { const k2 = col(C.tail); tc.set([k2.r, k2.g, k2.b], i * 3); }
  tg.setAttribute('color', new THREE.BufferAttribute(tc, 3));
  const ix = tg.index.array, both = new Uint16Array(ix.length * 2); both.set(ix); for (let i = 0; i < ix.length; i += 3) both.set([ix[i], ix[i + 2], ix[i + 1]], ix.length + i);
  tg.setIndex(new THREE.BufferAttribute(both, 1)); // both faces of the blade
  bag.add(tg, { y: -0.004, z: -0.16, keep: true });
  const geo = bag.geometry();
  geo.computeBoundingSphere();
  return shared(geo);
}

/** One wing, horizontal, root at the origin, leading edge +Z, span +X (mirror for the right wing). */
function wingGeometry(tier, mirror) {
  const pts = tier === 'far'
    ? [[0, 0.03], [0.16, 0.04], [0.29, 0], [0.18, -0.04], [0, -0.04]]
    : [[0, 0.03], [0.05, 0.047], [0.12, 0.05], [0.2, 0.038], [0.29, 0.0], [0.265, -0.026], [0.225, -0.016], [0.21, -0.05], [0.165, -0.034], [0.15, -0.062], [0.1, -0.04], [0.085, -0.06], [0.04, -0.04], [0, -0.042]];
  const shape = new THREE.Shape(); shape.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) shape.lineTo(...pts[i]); shape.closePath();
  const g = new THREE.ShapeGeometry(shape).rotateX(Math.PI / 2);
  const p = g.attributes.position, cc = new Float32Array(p.count * 3), k = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const t = p.getX(i) / 0.29;
    k.copy(col(0x826b55)).lerp(col(0x3c3026), THREE.MathUtils.smoothstep(t, 0.45, 1));
    if (tier !== 'far' && p.getZ(i) > 0.02 && t > 0.15 && t < 0.7) k.lerp(col(0xe8dcc6), 0.55); // pale wing-bar on the coverts
    cc.set([k.r, k.g, k.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(cc, 3));
  if (mirror) {
    for (let i = 0; i < p.count; i++) p.setX(i, -p.getX(i));
    const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const a = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = a; }
  }
  g.computeVertexNormals();
  return shared(g);
}

export function buildSparrow(ctx, layout, p) {
  const { tier, kitMaterials: km } = ctx;
  const S = store(km), r = ctx.rng;
  const key = tier;
  const geo = (S.geo[key] ||= { body: bodyGeometry(tier), wl: wingGeometry(tier, false), wr: wingGeometry(tier, true) });
  const bodyMat = km.bag({ rough: 0.9, brush: 0.1 });
  const wingMat = (S.wingMat ||= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide, name: 'critters:wing' }), (S.wingMat.userData.kit = true, S.wingMat));
  const group = new THREE.Group(), parts = {};
  const body = new THREE.Mesh(geo.body, bodyMat); body.name = 'body'; body.castShadow = true;
  const wl = new THREE.Mesh(geo.wl, wingMat); wl.position.set(0.015, 0.012, 0.05);
  const wr = new THREE.Mesh(geo.wr, wingMat); wr.position.set(-0.015, 0.012, 0.05);
  group.add(body, wl, wr);
  const s = p.size * (0.94 + r() * 0.12);
  group.scale.setScalar(s);
  group.userData.baseScale = s;
  parts.body = body; parts.wing_l = wl; parts.wing_r = wr;
  return { group, parts, sockets: {}, live: [body, wl, wr], dispose() {} };
}
