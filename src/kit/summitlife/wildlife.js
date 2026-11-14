// Summit wildlife (天上): the butterfly visitors and the fly-by birds.
//
// The facade (src/summit/wildlife.js) owns the schedule: it decides when a
// visit or a fly-by starts (summit rng draws, unchanged) and moves the birds.
// The kit supplies what is seen:
//  - butterflies: the critters family's vertex-shader butterflies (one
//    InstancedMesh). The facade shows/hides the bound part `swarm` for each
//    visit; that part is an empty flag group, and the kit reads its
//    `visible` as "a visit is on" so the wings fade in and out instead of
//    popping. (The facade moves a bound part's position attribute when it has
//    one, so the flag must have no geometry.)
//  - birds: four painted birds (one body mesh, two hinged wings each, three
//    meshes a bird against six) handed to the facade as `summitBirds` records
//    through footprint.anchors, in the classic record shape.
import * as THREE from 'three';
import { buildButterflies } from '../critters/butterflies.js?v=20261113a';

/* ---------------------------------------------------------- butterflies --- */

export function buildSummitButterflies(ctx, layout, p) {
  const n = layout.positions.length / 3, r = ctx.rng;
  const seeds = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    seeds[i * 3] = r() * 100;
    seeds[i * 3 + 1] = 0.55 + r() * 0.65;
    seeds[i * 3 + 2] = Math.max(0, layout.positions[i * 3 + 1] - 0.6); // flight height above the 0.6 m floor
  }
  const sky = { sunDir: { y: 0 }, weather: 'clear' }; // the visit flag, in the critters swarm's own terms
  const swarm = buildButterflies(ctx, { count: n, positions: layout.positions, colors: layout.colors, seeds, sky }, p);
  const flag = new THREE.Group();
  flag.visible = false;
  swarm.group.add(flag);
  swarm.parts.swarm.name = ''; // the critters part key is `swarm`; here the visit flag owns that name
  const run = swarm.update;
  return {
    group: swarm.group,
    parts: { swarm: flag, flock: swarm.parts.swarm },
    live: swarm.live,
    update(dt, t, env) { sky.sunDir.y = flag.visible ? 1 : 0; run(dt, t, env); },
    dispose: swarm.dispose
  };
}

/* ---------------------------------------------------------------- birds --- */

// body, wing, beak (the classic palettes: kingfisher blue, pale gull, mountain thrush, slate)
const PALETTES = [
  [0x315f82, 0x8fc6df, 0xe8a33b, 0xcfe4ec],
  [0xf0eee5, 0xc8d1d4, 0xd6a642, 0xffffff],
  [0x4b4039, 0x9a6f54, 0xc89335, 0xc9b49a],
  [0x263c53, 0x718ba0, 0xe0a33d, 0xa6b4c0]
];
const TIER = { hero: { seg: 10, rows: 7, feathers: true }, mid: { seg: 8, rows: 5, feathers: false }, far: { seg: 5, rows: 3, feathers: false } };
const _cache = new WeakMap();
const col = (h) => new THREE.Color(h);

function paint(geo, fn) {
  const p = geo.attributes.position, c = new Float32Array(p.count * 3), k = new THREE.Color();
  for (let i = 0; i < p.count; i++) { fn(k, p.getX(i), p.getY(i), p.getZ(i)); c.set([k.r, k.g, k.b], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}
const both = (geo) => { // both faces of a flat blade (the shared matte material is front-face only)
  const ix = geo.index.array, out = new Uint16Array(ix.length * 2);
  out.set(ix);
  for (let i = 0; i < ix.length; i += 3) out.set([ix[i], ix[i + 2], ix[i + 1]], ix.length + i);
  geo.setIndex(new THREE.BufferAttribute(out, 1));
  return geo;
};
const prep = (g) => { if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g; };

/** The classic bird's size: body 0.46 x 0.31 x 0.67, wingspan 1.9 m, painted back-to-belly with a pale underside. */
function bodyGeometry(tier, [bodyC, , beakC, pale]) {
  const T = TIER[tier];
  const parts = [];
  const torso = new THREE.SphereGeometry(0.23, T.seg, T.rows).scale(0.85, 0.68, 1.45);
  parts.push(paint(torso, (k, x, y) => { k.copy(col(bodyC)).lerp(col(pale), THREE.MathUtils.smoothstep(-y, 0.02, 0.16) * 0.85); }));
  const head = new THREE.SphereGeometry(0.135, T.seg, T.rows).translate(0, 0.045, 0.31);
  parts.push(paint(head, (k, x, y, z) => { k.copy(col(bodyC)); if (tier !== 'far' && y < 0.03 && z > 0.36) k.lerp(col(pale), 0.5); }));
  const beak = new THREE.ConeGeometry(0.045, 0.15, tier === 'far' ? 3 : 6).rotateX(Math.PI / 2).translate(0, 0.025, 0.48);
  parts.push(paint(beak, (k) => k.copy(col(beakC))));
  const tail = new THREE.BufferGeometry();
  tail.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.11, 0, 0, 0.11, 0, 0, -0.2, 0, -0.42, 0.11, 0, 0, 0.2, 0, -0.42, 0, 0, -0.28]), 3));
  tail.setIndex([0, 2, 1, 3, 5, 4]);
  parts.push(paint(both(tail), (k, x, y, z) => k.copy(col(bodyC)).lerp(col(pale), THREE.MathUtils.smoothstep(-z, 0.1, 0.42) * 0.55)));
  tail.translate(0, 0, -0.23);
  for (const g of parts) prep(g);
  return mergeFlat(parts);
}

function mergeFlat(list) {
  let count = 0, idx = 0;
  for (const g of list) { count += g.attributes.position.count; idx += g.index.count; }
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), uv = new Float32Array(count * 2), col3 = new Float32Array(count * 3), ix = new Uint16Array(idx);
  let o = 0, io = 0;
  for (const g of list) {
    g.computeVertexNormals();
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); col3.set(g.attributes.color.array, o * 3);
    for (let i = 0; i < g.index.count; i++) ix[io++] = g.index.array[i] + o;
    o += g.attributes.position.count;
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  m.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); m.setAttribute('color', new THREE.BufferAttribute(col3, 3));
  m.setIndex(new THREE.BufferAttribute(ix, 1));
  m.computeBoundingSphere();
  m.userData.sharedGeometry = true;
  return m;
}

/** One wing, root at the origin, span +X (mirror for the right), leading edge +Z; flap about Z. */
function wingGeometry(tier, [, wingC, , pale], mirror) {
  const T = TIER[tier];
  const pts = T.feathers
    ? [[0.02, 0.1], [0.5, 0.07], [0.92, 0.02], [0.86, -0.07], [0.78, -0.04], [0.72, -0.15], [0.64, -0.1], [0.56, -0.22], [0.42, -0.14], [0.26, -0.15], [0.08, -0.13]]
    : [[0.02, 0.1], [0.92, 0.02], [0.56, -0.22], [0.08, -0.13]];
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  shape.closePath();
  const g = new THREE.ShapeGeometry(shape).rotateX(Math.PI / 2); // flat in XZ
  paint(g, (k, x, y, z) => { k.copy(col(wingC)).lerp(col(pale), THREE.MathUtils.smoothstep(0.55, 0.1, x) * 0.55 + (tier !== 'far' && z > 0.04 && x > 0.2 && x < 0.62 ? 0.28 : 0)); k.multiplyScalar(1 - 0.22 * THREE.MathUtils.smoothstep(0.6, 0.95, x)); });
  prep(g); both(g);
  if (mirror) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setX(i, -p.getX(i)); const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const a = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = a; } }
  g.computeVertexNormals();
  g.computeBoundingSphere();
  g.userData.sharedGeometry = true;
  return g;
}

export function buildSummitBirds(ctx, layout, p) {
  const { tier, kitMaterials: km } = ctx;
  if (!_cache.has(km)) _cache.set(km, {});
  const S = _cache.get(km);
  const mat = km.shared('matte');
  const group = new THREE.Group(), parts = {}, live = [], records = [];
  const phases = layout.phases || [0, 1.6, 3.1, 4.7];
  for (let i = 0; i < 4; i++) {
    const pal = PALETTES[i % PALETTES.length], key = `${tier}:${i % PALETTES.length}`;
    const geo = (S[key] ||= { body: bodyGeometry(tier, pal), wl: wingGeometry(tier, pal, false), wr: wingGeometry(tier, pal, true) });
    const bird = new THREE.Group();
    const body = new THREE.Mesh(geo.body, mat);
    const wl = new THREE.Mesh(geo.wl, mat); wl.position.set(0.04, 0.05, 0.06);
    const wr = new THREE.Mesh(geo.wr, mat); wr.position.set(-0.04, 0.05, 0.06);
    for (const m of [body, wl, wr]) { m.castShadow = false; m.frustumCulled = false; }
    const inner = new THREE.Group(); // the size param lives here; the facade scales the outer group per fly-by
    inner.scale.setScalar(p.size);
    inner.add(body, wl, wr);
    bird.add(inner);
    bird.visible = false;
    group.add(bird);
    parts[`bird_${i + 1}`] = bird; parts[`bird_${i + 1}_wing_l`] = wl; parts[`bird_${i + 1}_wing_r`] = wr;
    live.push(body, wl, wr);
    records.push({
      mesh: bird, wings: [wl, wr], active: false, age: 0, duration: 0, direction: 1,
      startX: 0, baseY: 0, baseZ: 0, span: 0, depthDrift: 0, phase: phases[i % phases.length]
    });
  }
  const f = layout.footprint || {};
  return {
    group, parts, live,
    footprint: { colliders: f.colliders || [], platforms: f.platforms || [], exclusions: f.exclusions || [], anchors: { ...(f.anchors || {}), summitBirds: records } },
    dispose() {}
  };
}
