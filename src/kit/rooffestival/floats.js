// rooffestival: the two festival floats (the hoko of mouth 7, the kakiyama of
// mouth 6) and the skyline pagodas. Ported from rooftops/js/pieces/float.js and
// downtown.js yamaFloat; same rail frame, same platforms (level.js). The hoko's
// tassels and hayashi breathe, so they are `live` and `dynamic.float` carries the
// classic record { group, tassels, musicians } that world.update() animates.
import { PBag, seg } from './pbag.js?v=20261114a';
import { Bag } from '../craft.js?v=20261114a';
import { buildPagoda } from '../pagoda/build.js?v=20261114a';
import { makeResident } from '../../../rooftops/js/people.js?v=20261114a';
import { mergeByMaterial } from '../../../rooftops/js/pieces/common.js?v=20261114a';

/* ------------------------------------------------------------------- hoko --- */

export function buildHoko(ctx, layout, p) {
  const { THREE: T } = ctx, pc = layout.piece, t = ctx.tier, z = pc.d, far = t === 'far', hero = t === 'hero';
  const b = new PBag(ctx, far ? { fold: (m) => (m === 'roof' || m === 'ridge' ? 'roof' : 'brocade0'), onePart: true } : {});
  const spokes = hero ? 8 : t === 'mid' ? 5 : 0;

  // four person-height spoked wheels: iron tyre, felloe, lacquer hub with a gold boss (far: a disc)
  for (const x of [-2.1, 2.1]) for (const dz of [-1.25, 1.25]) {
    if (far) { b.cyl(0.95, 0.14, { m: 'timber', part: 'wheels', axis: 'z', seg: 9, x, y: 0.95, z: z + dz }); continue; }
    b.add(new T.TorusGeometry(0.82, 0.13, hero ? 7 : 5, hero ? 24 : 14), { m: 'timberMed', part: 'wheels', x, y: 0.95, z: z + dz });
    b.add(new T.TorusGeometry(0.955, 0.032, hero ? 5 : 3, hero ? 28 : 18), { m: 'dark', part: 'tyres', x, y: 0.95, z: z + dz });
    b.cyl(0.17, 0.34, { m: 'lacquer', part: 'hubs', axis: 'z', seg: 10, x, y: 0.95, z: z + dz });
    b.cyl(0.08, 0.04, { m: 'gold', part: 'hubs', axis: 'z', seg: 8, x, y: 0.95, z: z + dz + Math.sign(dz) * 0.19 });
    for (let i = 0; i < spokes; i++) b.box(1.43, 0.055, 0.065, { m: 'timber', part: 'spokes', x, y: 0.95, z: z + dz, rz: (i * Math.PI) / spokes });
  }
  for (const x of [-2.1, 2.1]) b.cyl(0.105, 2.85, { m: 'dark', part: 'axles', axis: 'z', seg: far ? 6 : 10, x, y: 0.95, z });

  // undercarriage, cross-bracing, the textile-draped lower body (three separate front panels)
  b.box(5.8, 0.45, 2.2, { m: 'timber', part: 'carriage', y: 1.55, z });
  for (const x of [-2.35, 0, 2.35]) b.box(0.18, 1.25, 2.32, { m: 'timberMed', part: 'carriage', x, y: 2.05, z });
  b.box(5.0, 1.48, 2.34, { m: 'dark', part: 'body', y: 2.55, z });
  for (let i = 0; i < 3; i++) b.box(1.52, 1.42, 0.035, { m: `brocade${i % 2}`, part: 'brocade', x: -1.67 + i * 1.67, y: 2.55, z: z + 1.19 });
  for (const sx of [-1, 1]) b.box(0.035, 1.4, 2.12, { m: `brocade${sx > 0 ? 1 : 0}`, part: 'brocade', x: sx * 2.52, y: 2.55, z });
  b.box(5.2, 0.08, 0.08, { m: 'gold', part: 'trim', y: 3.25, z: z + 1.23 });
  b.box(5.2, 0.08, 0.08, { m: 'gold', part: 'trim', y: 1.84, z: z + 1.23 });
  if (!hero) b.box(5.9, 0.3, 2.7, { m: 'timber', part: 'carriage', y: pc.deckY - 0.3, z });   // the deck's beam course (hero shows the brackets instead)
  if (!far) {
    for (const x of [-2.5, -0.835, 0.835, 2.5]) b.box(0.05, 1.44, 0.05, { m: 'gold', part: 'trim', x, y: 2.55, z: z + 1.22 });   // lace between the panels
    if (hero) for (let i = 0; i < 15; i++) b.box(0.14, 0.16, 0.012, { m: `goods${i % 2 ? 1 : 3}`, part: 'fringe', x: -2.45 + i * 0.35, y: 1.74, z: z + 1.235 });
  }

  // lacquer deck, brackets, balustrade at cat height
  b.box(6.0, 0.14, 3.0, { m: 'lacquer', part: 'deck', y: pc.deckY - 0.07, z: z + 0.2 });
  for (const zz of [z - 1.3, z + 1.7]) b.box(6.0, 0.06, 0.06, { m: 'gold', part: 'rail', y: pc.deckY + 0.6, z: zz });
  if (!far) for (const x of [-2.9, -1.4, 0, 1.4, 2.9]) {
    b.box(0.07, 0.6, 0.07, { m: 'lacquer', part: 'rail', x, y: pc.deckY + 0.3, z: z + 1.7 });
    if (hero) b.sphere(0.05, { m: 'gold', part: 'rail', x, y: pc.deckY + 0.63, z: z + 1.7 });
  }
  if (!far) for (const x of [-2.45, -1.65, -0.85, 0, 0.85, 1.65, 2.45]) {
    b.box(0.34, 0.16, 0.28, { m: 'gold', part: 'brackets', x, y: pc.deckY - 0.28, z: z + 1.32, rz: (Math.abs(x) % 1.5 - 0.5) * 0.08 });
    if (hero) b.box(0.2, 0.2, 0.16, { m: 'gold', part: 'brackets', x, y: pc.deckY - 0.46, z: z + 1.32, rz: 0.78 });
  }

  // pillars, the lower eave tier, the raised gabled roof, ridge
  const ph = pc.eaveY - pc.deckY, pm = (pc.eaveY + pc.deckY) / 2;
  for (const x of [-2.4, 2.4]) for (const dz of [-1.0, 1.0]) b.box(0.14, ph, 0.14, { m: 'lacquer', part: 'pillars', x, y: pm, z: z + dz });
  if (!far) for (const x of [-2.35, -1.15, 0, 1.15, 2.35]) b.box(0.09, ph - 0.2, 0.09, { m: 'timberMed', part: 'pillars', x, y: pm, z: z + 1.28 });
  b.box(5.95, 0.16, 3.0, { m: 'timber', part: 'eave', y: pc.eaveY - 0.11, z });
  b.box(5.95, 0.08, 0.1, { m: 'gold', part: 'eave', y: pc.eaveY - 0.01, z: z + 1.53 });
  if (!far) {   // mizu-maku: brocade curtains hung under the front eave, clear of the climb frame at x < -1.3
    for (let i = 0; i < 4; i++) b.box(0.84, 0.3, 0.02, { m: `brocade${i % 2}`, part: 'brocade', x: -0.35 + i * 0.95, y: pc.eaveY - 0.27, z: z + 1.46 });
  }
  b.slope('roof', { x: -3.0, y: pc.eaveY, z }, pc.ridgeY - pc.eaveY - 0.18, 3.0, 2.8, -Math.PI / 2, 0.15);
  b.slope('roof', { x: 3.0, y: pc.eaveY, z }, pc.ridgeY - pc.eaveY - 0.18, 3.0, 2.8, Math.PI / 2, 0.15);
  { // ridgeCap (machiya.js), along z
    const y = pc.ridgeY - 0.28, z0 = z - 1.42, z1 = z + 1.42, len = z1 - z0, cz = (z0 + z1) / 2;
    b.cyl(0.13, len + 0.1, { m: 'ridge', part: 'ridge', axis: 'z', y: y + 0.08, z: cz });
    b.box(0.28, 0.1, len, { m: 'ridge', part: 'ridge', y: y + 0.2, z: cz });
    for (const e of [z0, z1]) b.box(0.4, 0.42, 0.14, { m: 'ridge', part: 'ridge', y: y + 0.22, z: e });
  }

  // lantern frame (komagata), climb frame along the outside face
  if (!far) for (const y of [pc.deckY + 0.5, pc.deckY + 0.85]) for (let x = -2.6; x < -1.3; x += 0.28) b.lantern(0.1, 0.28, { m: 'lanternWhite', part: 'lamps', seg: hero ? 10 : 6, rims: hero, x, y, z: z + 1.4 });
  b.box(1.5, 0.06, 0.22, { m: 'timber', part: 'climb', x: -1.95, y: 4.67, z: z + 1.7 });
  if (!far) for (const x of [-2.55, -1.35]) {
    b.box(0.09, 1.1, 0.09, { m: 'lacquer', part: 'climb', x, y: 4.15, z: z + 1.7 });
    b.box(0.08, 0.08, 0.7, { m: 'timber', part: 'climb', x, y: 4.65, z: z + 1.4, rx: -0.35 });
  }
  b.box(5.95, 0.08, 0.45, { m: 'timber', part: 'climb', y: pc.eaveY - 0.04, z: z + 1.4 });

  // the shingi mast, its crossbar and perch, the crescent, lashings and guy ropes
  const zp = z - 0.75, zc = z - 0.2;
  b.cyl(0.11, 10.5, { m: 'timber', part: 'mast', seg: seg(t, 8), y: pc.ridgeY + 5.25, z: zp });
  b.cyl(0.06, 1.3, { m: 'timber', part: 'mast', axis: 'x', seg: 6, y: pc.barY - 0.06, z: zc });
  b.box(0.08, 0.08, zc - zp, { m: 'timber', part: 'mast', y: pc.barY - 0.06, z: (zc + zp) / 2 });
  if (!far) for (const sx of [-1, 1]) b.add(new T.IcosahedronGeometry(0.16, hero ? 1 : 0), { m: 'pine', part: 'sakaki', x: sx * 0.58, y: pc.barY + 0.02, z: zc - 0.1 });
  b.cyl(0.34, 0.06, { m: 'lacquer', part: 'mast', seg: 14, y: pc.perchY - 0.03, z: zc });
  b.box(0.08, 0.08, zc - zp, { m: 'timber', part: 'mast', y: pc.perchY - 0.08, z: (zc + zp) / 2 });
  b.add(new T.TorusGeometry(0.45, 0.07, 6, 18, Math.PI * 1.2), { m: 'gold', part: 'crescent', y: pc.ridgeY + 10.6, z: zp, rz: 0.9 });
  if (!far) for (let y = pc.ridgeY + 0.25; y < pc.ridgeY + 0.72; y += 0.12) b.add(new T.TorusGeometry(0.135, 0.024, 5, 12), { m: 'hemp', part: 'ropes', y, z: zp, rx: Math.PI / 2 });
  if (!far) for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.beam([sx * 2.55, pc.eaveY - 0.08, z + sz * 1.1], [0, pc.ridgeY + 4.1, zp], 0.018, { m: 'hemp', part: 'ropes', seg: 5 });

  // live: six tassels and three seated hayashi
  const live = new T.Group(), tassels = [], musicians = [];
  for (let i = 0; i < (far ? 0 : 6); i++) {
    const pivot = new T.Group();
    pivot.position.set(-2.55 + i * 1.02, pc.eaveY - 0.03, z + 1.52);
    const tb = new Bag();
    tb.cyl(0.014, 0.42, { y: -0.21 }); tb.sphere(0.06, { y: -0.43 });
    const tassel = new T.Mesh(new T.ConeGeometry(0.105, 0.34, seg(t, 8)), b.mat(i % 2 ? 'goods3' : 'goods1'));
    tassel.position.y = -0.62;
    const cord = tb.mesh(b.mat('hemp'));
    pivot.add(cord, tassel);
    pivot.userData.phase = i * 0.83;
    live.add(pivot);
    tassels.push(pivot);
  }
  // The classic hayashi (ruling R75): the same makeResident figures, built exactly as pieces/float.js builds them, until r5's
  // roof-hayashi replaces them. Only where the Roof Road's resident materials exist (ctx.MAT.workCloth).
  if (!far && ctx.MAT && ctx.MAT.workCloth) {
    const M = ctx.MAT;
    for (let i = 0; i < 3; i++) {
      const { body: person, arms } = makeResident(M, { look: 0.18 + i * 0.27, role: 'musician', seated: true });
      person.position.set(-1.25 + i * 1.25, pc.deckY + 0.04, z - 0.34 + (i % 2) * 0.16);
      arms[0].rotation.x = -1.05; arms[1].rotation.x = -1.15;
      arms[0].rotation.z = -0.35; arms[1].rotation.z = 0.35;
      if (i === 1) { const drum = new T.Mesh(new T.CylinderGeometry(0.18, 0.18, 0.26, 10).rotateX(Math.PI / 2), M.timberMed); drum.position.set(0.23, 0.38, 0.12); person.add(drum); }
      else { const flute = new T.Mesh(new T.CylinderGeometry(0.022, 0.022, 0.58, 6).rotateZ(Math.PI / 2), M.bamboo); flute.position.set(0, 0.9, 0.25); flute.rotation.z = i ? -0.08 : 0.08; person.add(flute); }
      const source = new T.Group();
      for (const child of [...person.children]) source.add(child);
      person.add(mergeByMaterial(source));
      person.userData.phase = i * 1.9;
      person.userData.baseY = person.position.y;
      live.add(person);
      musicians.push(person);
    }
  }

  const out = b.finish();
  out.group.add(live);
  out.live = [live];
  out.parts.live_group = live;
  out.dynamic = { float: { group: live, tassels, musicians } };
  const l1 = new T.Object3D(), l2 = new T.Object3D();
  l1.position.set(0, pc.deckY + 0.7, z + 1.4); l2.position.set(0, 2.4, z + 1.6);
  out.group.add(l1, l2);
  out.sockets = { light_deck: l1, light_body: l2 };
  return out;
}

/* ------------------------------------------------------------------- yama --- */

export function buildYama(ctx, layout, p) {
  const { THREE: T } = ctx, pc = layout.piece, t = ctx.tier, w = pc.s1 - pc.s0, d = pc.d, far = t === 'far', hero = t === 'hero';
  const b = new PBag(ctx, far ? { fold: (m) => (/^leaves|^pine$|^bark$/.test(m) ? 'pine' : 'tapestry'), onePart: true } : {}), rng = ctx.rng;
  b.box(w, 0.18, 2.4, { m: 'timberMed', part: 'deck', y: pc.deckY - 0.09, z: d });
  for (const zz of [-1.1, 1.1]) b.box(w, 1.4, 0.035, { m: 'tapestry', part: 'skirt', y: pc.deckY - 0.8, z: d + zz });
  for (const sx of [-1, 1]) b.box(0.035, 1.4, 2.2, { m: 'tapestry', part: 'skirt', x: sx * (w / 2 - 0.02), y: pc.deckY - 0.8, z: d });
  b.box(w + 0.04, 0.05, 0.05, { m: 'timberMed', part: 'trim', y: pc.deckY - 0.12, z: d + 1.2 });
  b.box(w * 0.82, 0.6, 1.9, { m: 'timber', part: 'chassis', y: 0.95, z: d });   // the axle bed under the skirts
  for (const x of [-w * 0.3, w * 0.3]) for (const zz of [-0.85, 0.85]) {
    b.cyl(0.44, 0.12, { m: 'timber', part: 'wheels', axis: 'z', seg: seg(t, 12), x, y: 0.455, z: d + zz });
    if (!far) { b.cyl(0.07, 0.16, { m: 'timber', part: 'wheels', axis: 'z', seg: 6, x, y: 0.455, z: d + zz }); if (hero) b.add(new T.TorusGeometry(0.44, 0.025, 5, 16), { m: 'timber', part: 'wheels', x, y: 0.455, z: d + zz + Math.sign(zz) * 0.065 }); }
  }
  b.cyl(0.05, 2.0, { m: 'timber', part: 'wheels', axis: 'z', seg: 6, x: -w * 0.3, y: 0.455, z: d });
  b.cyl(0.05, 2.0, { m: 'timber', part: 'wheels', axis: 'z', seg: 6, x: w * 0.3, y: 0.455, z: d });
  b.box(1.8, 0.09, 1.5, { m: 'timber', part: 'stage', y: pc.deckY + 1.005, z: d - 0.1 });
  if (!far) {   // a low rail round the pine's stage, under the classic stage's top face
    for (const sx of [-1, 1]) b.box(0.04, 0.5, 0.04, { m: 'timber', part: 'stage', x: sx * 0.8, y: pc.deckY + 0.75, z: d + 0.6 });
    b.box(1.62, 0.04, 0.04, { m: 'timberMed', part: 'stage', y: pc.deckY + 0.98, z: d + 0.62 });
    b.box(0.16, 0.9, 0.16, { m: 'timber', part: 'stage', x: 0, y: pc.deckY + 0.5, z: d - 0.1 });
  }
  b.beam([0, pc.deckY, d - 0.5], [0.1, pc.pineY - 0.08, d - 0.15], 0.09, { m: 'bark', part: 'trunk', seg: 7 });
  b.beam([-0.65, pc.pineY - 0.06, d - 0.15], [0.65, pc.pineY - 0.06, d - 0.15], 0.08, { m: 'bark', part: 'trunk', seg: 7 });
  if (!far) for (const s of [-1, 1]) b.beam([0.04, pc.deckY + 1.6, d - 0.3], [s * 0.7, pc.deckY + 1.1, d + 0.2], 0.035, { m: 'bark', part: 'trunk', seg: 5 });
  // pine foliage: leaf planes on the classic's 48-leaf cloud
  const count = hero ? 72 : t === 'mid' ? 40 : 14, leafGeo = new T.PlaneGeometry(1, 1, 1, 2);
  for (let i = 0; i < count; i++) {
    const a = rng() * TAU, rad = rng() * 0.55 * 2;
    b.add(leafGeo, { m: `leaves${i % 3}`, part: 'foliage', x: Math.cos(a) * rad, y: pc.pineY + 0.15 + Math.sin(i * 2.1) * 0.46, z: d - 0.35 + Math.sin(a) * rad, sx: 0.36, sy: 0.7, rx: -0.4 + rng() * 1.2, ry: a, rz: Math.sin(a) * 0.7 });
  }
  leafGeo.dispose();
  return b.finish();
}
const TAU = Math.PI * 2;

/* --------------------------------------------------------- skyline pagodas --- */

export function buildSkylinePagoda(ctx, layout, p) {
  const T = ctx.THREE, k = layout.scale || 1;
  // the classic's five fat cones read as a toy at 150 m; the measured valley tower, far tier, in the same footprint and height
  const H = p.height * k;
  const { group: tower, parts } = buildPagoda({ preset: 'valley', H, storeys: 5, age: 0.35 }, { detail: ctx.tier, material: ctx.kitMaterials.shared('matte') });
  const group = new T.Group();
  group.add(tower);
  return { group, parts, sockets: {}, live: [], dispose() { tower.traverse((m) => { if (m.isMesh) m.geometry.dispose(); }); } };
}
