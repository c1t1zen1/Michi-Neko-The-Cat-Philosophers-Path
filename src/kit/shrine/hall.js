// The shrine hall (hongu) and the three things hung on it: shimenawa, suzu
// bell and saisen-bako. The roof (kawara-roof) is its own asset: the hall here
// ends under the eaves, with the chigi and katsuogi that crown the ridge.
//
// Local frame = the classic shrine group: origin on the ground at the hall
// centre, +z the front. Hall box 2.2 x 1.8 x 1.8 at y 1.75 (the collider the
// layout registers), stepped dan 3.8 x 3.0 and 3.2 x 2.4. Every static piece
// sits on merge-able materials so the valley's _mergeStatics folds it in.
import * as THREE from 'three';
import { Bag, V3, merge, indexed } from '../craft.js?v=20261113a';
import { defineAsset } from '../contract.js?v=20261113a';
import { box, bake, castMesh, byTier, gameMat, bagMat, tint } from './util.js?v=20261113a';

const DARK = 0x3b2a1c, BOARD = [0x8a6a46, 0x7d5f3e, 0x94744d], LIGHT = 0xd6c29a, RED = 0xa83a26, STONE_UP = 0x8e8e86;

/* ------------------------------------------------------------------ hall --- */

function wallBattens(bag, rng, tier) {
  // vertical boards over the wall faces, between the rails (door gap on the front)
  const y = 1.76, h = 1.46;
  const step = tier === 'hero' ? 0.24 : 0.36;
  for (let x = -0.96; x <= 0.97; x += step) {
    for (const z of [-0.915, 0.915]) {
      if (z > 0 && Math.abs(x) < 0.68) continue;
      bag.box(0.05, h, 0.03, { x, y, z, color: tint(BOARD[Math.floor(rng() * 3)], (rng() - 0.5) * 0.06) });
    }
  }
  for (let z = -0.7; z <= 0.71; z += step - 0.01) for (const x of [-1.115, 1.115]) {
    bag.box(0.03, h, 0.05, { x, y, z, color: tint(BOARD[Math.floor(rng() * 3)], (rng() - 0.5) * 0.06) });
  }
}

function buildHall(ctx, layout, p) {
  const { THREE: T, tier, rng, kitMaterials: km } = ctx;
  const stoneDark = gameMat(ctx, 'stoneDark', () => km.stone({ tint: 0x62625b, seed: 6 }));
  const stone = gameMat(ctx, 'stone', () => km.stone());
  const wood = gameMat(ctx, 'timberMedium', () => km.wood());
  const shoji = gameMat(ctx, 'shoji', () => km.paper({ glow: 0.12 }));
  const bagM = bagMat(ctx);
  const group = new T.Group(), parts = {};
  const add = (key, mesh) => { parts[key] = mesh; group.add(mesh); return mesh; };

  if (tier === 'far') {
    // one vertex-coloured mesh: dans, hall, door, ridge crown
    const b = new Bag();
    b.box(3.8, 0.35, 3.0, { y: 0.175, color: 0x62625b });
    b.box(3.2, 0.35, 2.4, { y: 0.525, color: STONE_UP });
    b.box(2.2, 1.8, 1.8, { y: 1.75, color: BOARD[0] });
    b.box(1.1, 1.2, 0.08, { y: 1.7, z: 0.92, color: 0xf0d9a8 });
    b.box(4.45, 0.16, 3.86, { y: 2.7, color: DARK });
    for (const sx of [-1, 1]) b.box(0.13, 1.05, 0.16, { x: sx * 0.78, y: 4.05, rz: sx * 0.43, color: LIGHT });
    const m = add('shrine', castMesh(b.geometry(), bagM));
    return { group, parts, sockets: {}, live: [] };
  }

  const hero = tier === 'hero';
  // stepped stone dan, with a stone step up from the ground at the front
  const low = [box(3.8, 0.35, 3.0, 0, 0.175, 0)];
  if (hero) low.push(box(1.7, 0.17, 0.42, 0, 0.085, 1.71));
  add('dan_low', castMesh(bake(low), stoneDark));
  const upGeo = [box(3.2, 0.35, 2.4, 0, 0.525, 0)];
  if (hero) upGeo.push(box(1.4, 0.175, 0.3, 0, 0.4375, 1.35));
  if (hero) add('dan_up', castMesh(bake(upGeo), stone));
  // the timber hall: the collider box, with a shoji door in the front
  add('hall', castMesh(bake([box(2.2, 1.8, 1.8, 0, 1.75, 0)]), wood));
  add('shoji', castMesh(bake([box(1.1, 1.2, 0.08, 0, 1.7, 0.92)]), shoji));

  const trim = new Bag();
  if (!hero) trim.box(3.2, 0.35, 2.4, { y: 0.525, color: STONE_UP });
  // dodai sill (closes the gap between the dan and the wall), corner posts, rails
  trim.box(2.36, 0.15, 1.96, { y: 0.775, color: DARK });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) trim.box(0.16, 1.8, 0.16, { x: sx * 1.04, y: 1.75, z: sz * 0.84, color: tint(DARK, 0.02) });
  trim.box(2.28, 0.12, 1.88, { y: 2.58, color: DARK });
  trim.box(2.26, 0.1, 1.86, { y: 0.93, color: DARK });
  // door frame
  trim.box(1.34, 0.12, 0.1, { y: 2.3, z: 0.94, color: DARK });
  trim.box(1.3, 0.08, 0.14, { y: 1.1, z: 0.96, color: DARK });
  for (const sx of [-1, 1]) trim.box(0.1, 1.2, 0.1, { x: sx * 0.62, y: 1.7, z: 0.94, color: DARK });
  // eave fascia under the roof
  trim.box(4.45, 0.16, 0.14, { y: 2.7, z: 1.93, color: DARK });
  trim.box(4.45, 0.16, 0.14, { y: 2.7, z: -1.93, color: DARK });
  if (hero) {
    wallBattens(trim, rng, tier);
    // a centre mullion and cross-rail over the shoji
    for (const x of [-0.18, 0.18]) trim.box(0.025, 1.2, 0.02, { x, y: 1.7, z: 0.968, color: 0x5a4028 });
    trim.box(1.1, 0.025, 0.02, { y: 1.7, z: 0.968, color: 0x5a4028 });
  } else wallBattens(trim, rng, tier);
  // red kohran rail round the sides and back of the engawa (the front stays open to the offering box)
  const post = (x, z) => trim.box(0.06, 0.45, 0.06, { x, y: 0.925, z, color: RED });
  const railPts = hero ? [-1.1, -0.55, 0, 0.5] : [-1.1, 0.5];
  for (const sx of [-1, 1]) {
    for (const z of railPts) post(sx * 1.52, z);
    trim.box(0.06, 0.05, 1.6, { x: sx * 1.52, y: 1.12, z: -0.3, color: RED });
    if (hero) trim.box(0.04, 0.04, 1.6, { x: sx * 1.52, y: 0.88, z: -0.3, color: RED });
  }
  for (const x of hero ? [-0.5, 0.5] : []) post(x, -1.12);
  trim.box(3.04, 0.05, 0.06, { y: 1.12, z: -1.12, color: RED });
  if (hero) trim.box(3.04, 0.04, 0.04, { y: 0.88, z: -1.12, color: RED });
  add('trim', castMesh(trim.geometry(), bagM));

  // chigi (the crossed rafter ends) and katsuogi (logs along the ridge): the roof is its own asset
  const crest = new Bag();
  for (const sx of [-1, 1]) for (const k of hero ? [-1, 1] : [1]) {
    crest.box(0.1, 1.05, 0.14, { x: sx * 0.78, y: 4.05, rz: sx * k * 0.43, color: tint(LIGHT, k * 0.02) });
  }
  for (const rx of [-0.72, 0, 0.72]) {
    crest.cyl(0.09, 0.54, { x: rx, y: 3.91, rz: Math.PI / 2, color: tint(LIGHT, (rng() - 0.5) * 0.05) });
    if (hero) crest.cyl(0.05, 0.02, { x: rx + 0.275, y: 3.91, rz: Math.PI / 2, color: 0x5a4028 });
  }
  add('crest', castMesh(crest.geometry(), bagM));
  return { group, parts, sockets: {}, live: [] };
}

/* -------------------------------------------------------------- shimenawa --- */

/** Daikon-jime profile: fat in the middle, tapering to the ends. */
const daikon = (t) => 0.045 + 0.075 * Math.pow(Math.sin(t * Math.PI), 1.2);

function buildShimenawa(ctx, layout, p) {
  const { THREE: T, tier, rng } = ctx;
  const span = p.span, half = span / 2, sag = p.sag;
  const strands = byTier(tier, 3, 3, 1), radialN = byTier(tier, 6, 5, 4), segs = byTier(tier, 32, 16, 8);
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    pts.push(V3(-half + span * t, -sag * (1 - Math.pow(2 * t - 1, 2)), 0.02));
  }
  // the rope: strands wound round the catenary (straw, with colour banding)
  const geos = [];
  const twist = 5;
  for (let k = 0; k < strands; k++) {
    const offs = pts.map((q, i) => {
      const t = i / segs, a = t * twist * Math.PI * 2 + (k / strands) * Math.PI * 2, o = strands > 1 ? daikon(t) * 0.5 : 0;
      return q.clone().add(V3(0, Math.cos(a) * o, Math.sin(a) * o));
    });
    const r = (t) => daikon(t) * (strands > 1 ? 0.62 : 1);
    const g = tubeGeo(offs, r, radialN);
    paintStraw(g, rng, k);
    geos.push(g);
  }
  const g = indexed(merge(geos));
  const parts = {}, group = new T.Group();
  const ropeMesh = castMesh(g, ctx.kitMaterials.bag({ rough: 0.85, grime: 0.4, grimeH: 0.3 }));
  group.add(ropeMesh); parts.rope = ropeMesh;
  // sagari tufts and shide papers hang from the rope (never over the bell at the centre)
  if (tier !== 'far') {
    const hang = new Bag();
    const slots = byTier(tier, [0.12, 0.3, 0.7, 0.88], [0.2, 0.8], []);
    for (const t of slots) {
      const q = pts[Math.round(t * segs)];
      const ropeR = daikon(t);
      shide(hang, q.x, q.y - ropeR * 0.7, q.z + 0.03, p.school, tier === 'hero');
    }
    for (const t of [0.04, 0.96]) {
      const q = pts[Math.round(t * segs)];
      for (let i = 0; i < 6; i++) hang.cyl(0.006, 0.16, { x: q.x + (i - 2.5) * 0.007, y: q.y - 0.1, z: q.z + Math.sin(i * 2.3) * 0.008, color: tint(0xcdb077, (rng() - 0.5) * 0.06) });
    }
    if (!hang.empty) { const m = castMesh(hang.geometry(), bagMat(ctx)); group.add(m); parts.shide = m; }
  }
  return { group, parts, sockets: {}, live: [] };
}

/** Straw colouring along a rope tube: warm banding with a seeded jitter. */
function paintStraw(g, rng, k) {
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    c.set(0xd6c085).offsetHSL(0, 0, Math.sin(pos.getX(i) * 31 + k * 2) * 0.035 - 0.02 + (rng() - 0.5) * 0.02);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

/** A round tube geometry (indexed, with uv and colour slot) along points. */
function tubeGeo(pts, rf, radial) {
  const curve = new THREE.CatmullRomCurve3(pts);
  const g = new THREE.TubeGeometry(curve, pts.length * 2, 0.05, radial, false);
  // re-scale each ring by rf(t): TubeGeometry has radius*cos around the centreline
  const pos = g.attributes.position, segs = pts.length * 2, ring = radial + 1;
  const c = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, k = rf(t) / 0.05;
    curve.getPointAt(t, c);
    for (let j = 0; j < ring; j++) {
      const idx = i * ring + j;
      pos.setXYZ(idx, c.x + (pos.getX(idx) - c.x) * k, c.y + (pos.getY(idx) - c.y) * k, c.z + (pos.getZ(idx) - c.z) * k);
    }
  }
  g.computeVertexNormals();
  return g;
}

/** One shide strip: folded paper tongues (zigzag), two-sided so a vertex-colour bag can hold it. */
function shide(bag, x, y, z, school, full) {
  const tiers = full ? 4 : 3, w = 0.07, th = full ? 0.085 : 0.1;
  const step = { yoshida: (i) => i * w * 0.4, shirakawa: (i) => (i % 2 ? w * 0.5 : 0), ise: (i) => (i % 2 ? w * 0.35 : -w * 0.15) }[school] || ((i) => i * w * 0.4);
  for (let i = 0; i < tiers; i++) {
    const cx = x + step(i) - (tiers * w * 0.2), cy = y - i * th - th / 2;
    bag.box(school === 'ise' ? w * 0.72 : w, th * 0.96, 0.006, { x: cx, y: cy, z: z + (i % 2 ? 0.004 : -0.004), color: 0xf5f1e6 });
  }
}

/* ------------------------------------------------------------- suzu bell --- */

const SUZU = [[0.001, 0.15], [0.05, 0.145], [0.1, 0.105], [0.13, 0.03], [0.128, -0.06], [0.1, -0.125], [0.05, -0.15], [0.001, -0.152]];

function buildShrineBell(ctx, layout, p) {
  const { THREE: T, tier, kitMaterials: km } = ctx;
  const bronze = gameMat(ctx, 'spiritualBellBronze', () => km.bronze());
  const seg = byTier(tier, 24, 14, 8);
  const group = new T.Group(), parts = {};
  const lathe = new T.LatheGeometry([...SUZU].reverse().map(([x, y]) => new T.Vector2(x, y)), seg);
  // the lug the bell hangs from
  const lug = new T.TorusGeometry(0.028, 0.011, 6, 12).translate(0, 0.185, 0);
  parts.body = castMesh(bake([lathe, lug]), bronze);
  group.add(parts.body);
  const bag = new Bag(), bagM = bagMat(ctx);
  if (tier !== 'far') {
    // the belt seam, the slit under it, and the striped hanging cord with its tassel
    bag.add(new T.TorusGeometry(0.129, 0.008, 5, seg).rotateX(Math.PI / 2), { y: 0.0, color: 0x6b5026 });
    bag.box(0.16, 0.012, 0.03, { y: -0.075, z: 0.115, color: 0x1a1208 });
  }
  const cords = [0xb8322a, 0xe9dcb8, 0x5a3a6a], band = tier === 'hero' ? 0.07 : 0.11, len = p.cord;
  for (let i = 0; i < Math.round(len / band); i++) bag.cyl(0.02, band, { y: -0.165 - band / 2 - i * band, color: cords[i % 3] });
  bag.sphere(0.04, { y: -0.17 - len, sy: 1.5, color: 0xb8322a });
  parts.cord = castMesh(bag.geometry(), bagM);
  group.add(parts.cord);
  return { group, parts, sockets: {}, live: [] };
}

/* ---------------------------------------------------------- saisen-bako --- */

function buildOfferingBox(ctx, layout, p) {
  const { THREE: T, tier, rng } = ctx;
  const bagM = bagMat(ctx), bag = new Bag();
  // outer 0.8 x 0.45 x 0.5, standing on the dan (origin at its base)
  const SL = [0x5a3a24, 0x4d3220, 0x65432a];
  bag.box(0.78, 0.42, 0.48, { y: 0.21, color: 0x22160d });                  // dark core
  if (tier === 'far') { bag.box(0.8, 0.45, 0.5, { y: 0.225, color: SL[0] }); return finish(); }
  const n = tier === 'hero' ? 9 : 6;
  for (let i = 0; i < n; i++) {                                                // vertical slats on the front and sides
    const x = -0.36 + i * (0.72 / (n - 1)), c = tint(SL[i % 3], (rng() - 0.5) * 0.05);
    bag.box(0.72 / n - 0.012, 0.36, 0.02, { x, y: 0.2, z: 0.245, color: c });
  }
  for (const sx of [-1, 1]) bag.box(0.02, 0.36, 0.44, { x: sx * 0.39, y: 0.2, color: SL[1] });
  bag.box(0.8, 0.05, 0.5, { y: 0.025, color: tint(SL[1], -0.04) });            // base rail
  bag.box(0.82, 0.04, 0.52, { y: 0.43, color: tint(SL[0], 0.03) });            // top frame
  // the grating the coins fall through, tilted toward the front
  const bars = tier === 'hero' ? 9 : 6;
  for (let i = 0; i < bars; i++) {
    const z = -0.19 + i * (0.38 / (bars - 1));
    bag.box(0.74, 0.03, 0.03, { y: 0.465, z, rx: -0.12, color: tint(SL[(i + 1) % 3], 0.04) });
  }
  if (tier === 'hero') {
    // a rope strap and a few coins resting on the bars
    bag.box(0.82, 0.03, 0.012, { y: 0.3, z: 0.262, color: 0xcdb077 });
    for (let i = 0; i < 4; i++) bag.cyl(0.016, 0.004, { x: -0.25 + rng() * 0.5, y: 0.485, z: -0.12 + rng() * 0.3, rx: -0.12, color: i % 2 ? 0xc9a86a : 0xbfc2c4 });
  }
  return finish();
  function finish() {
    const group = new T.Group();
    const m = castMesh(bag.geometry(), bagM);
    group.add(m);
    return { group, parts: { box: m }, sockets: {}, live: [] };
  }
}

export const assets = [
  defineAsset({
    id: 'shrine-hall', family: 'shrine', lab: 'shrine/game-hall', label: 'Shrine hall (hongu)', legacyName: 'Shrine (Hongu)',
    params: {}, tiers: ['hero', 'mid', 'far'], floating: ['crest'], sample: { x: 0, y: 0, z: 0, index: 0, name: 'Shrine (Hongu)' }, build: buildHall
  }),
  defineAsset({
    id: 'shimenawa', family: 'shrine', lab: 'shrine/daikon', label: 'Shimenawa and shide', legacyName: 'Shimenawa',
    params: {
      span: { type: 'number', default: 1.8, min: 1.0, max: 3.2, step: 0.1, label: 'Rope length (m)' },
      sag: { type: 'number', default: 0.12, min: 0.04, max: 0.3, step: 0.01, label: 'Sag (m)' },
      school: { type: 'enum', default: 'yoshida', options: ['yoshida', 'shirakawa', 'ise'], label: 'Shide fold' }
    },
    tiers: ['hero', 'mid', 'far'], floating: ['rope', 'shide'], sample: { x: 0, y: 2.42, z: 0.96, index: 0 }, build: buildShimenawa
  }),
  defineAsset({
    id: 'shrine-bell', family: 'shrine', lab: 'shrine/suzu', label: 'Suzu bell and cord', legacyName: 'Shrine Bell',
    params: { cord: { type: 'number', default: 0.55, min: 0.2, max: 0.9, step: 0.05, label: 'Cord length (m)' } },
    tiers: ['hero', 'mid', 'far'], floating: ['body', 'cord'], sample: { x: 0, y: 2.05, z: 0.96, index: 0 }, build: buildShrineBell
  }),
  defineAsset({
    id: 'offering-box', family: 'shrine', lab: 'shrine/saisen-bako', label: 'Saisen-bako', legacyName: 'Offering Box',
    params: {}, tiers: ['hero', 'mid', 'far'], sample: { x: 0, y: 0.7, z: 0.95, index: 0 }, build: buildOfferingBox
  })
];
