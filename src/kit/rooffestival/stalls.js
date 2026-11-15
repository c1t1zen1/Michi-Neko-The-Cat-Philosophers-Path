// rooffestival: the street furniture of Hoko-cho (mouths 6-7): yatai stalls,
// lantern racks, the tsuiji temple wall and the temple gate. Built in the rail
// frame at the piece's middle (local x along the rail, y up, z toward the camera
// at depth d) from `layout.piece`, exactly where the classic builders in
// rooftops/js/pieces/{yatai,rack,tsuiji,gate}.js draw them. Platforms, walls
// and heights are gameplay (level.js): nothing here rises above a classic
// surface or past a classic edge a jump could meet.
import { PBag, seg } from './pbag.js?v=20261114a';

const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ yatai --- */

export function buildYatai(ctx, layout, p) {
  const pc = layout.piece, t = ctx.tier, w = pc.s1 - pc.s0, d = pc.d, y = pc.y, look = pc.look ?? 0.5, fare = pc.fare || 'yakitori';
  const far = t === 'far', hero = t === 'hero';
  const awning = `cloth${Math.floor(look * 5) % 5}`;
  const b = new PBag(ctx, far ? { fold: (m) => (/^(cloth|noren|lantern)/.test(m) ? awning : 'timberMed'), onePart: true } : {});
  const norenKey = look > 0.66 ? 'crimson' : look > 0.33 ? 'indigo' : 'hemp';

  // awning (the climbable roof, top at y exactly as the classic) and its posts
  b.box(w, 0.08, 1.55, { m: awning, part: 'awning', y: y - 0.04, z: d });
  if (!far) {
    // scalloped valance along the front edge, hanging under the platform
    const n = hero ? Math.max(5, Math.round(w / 0.24)) : 1, fw = w / n;
    for (let i = 0; i < n; i++) b.box(fw - (hero ? 0.025 : 0), hero ? 0.17 + 0.03 * Math.sin(i * 2.3) : 0.16, 0.012, { m: awning, part: 'awning', x: -w / 2 + fw * (i + 0.5), y: y - 0.16, z: d + 0.79 });
    b.box(w, 0.035, 0.035, { m: 'timberMed', part: 'frame', y: y - 0.09, z: d + 0.77 });
  }
  for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) {
    b.box(0.09, y - 0.08, 0.09, { m: 'timber', part: 'frame', x, y: (y - 0.08) / 2, z: d - 0.58 });
    if (!far) b.box(0.06, y - 0.1, 0.06, { m: 'timber', part: 'frame', x, y: (y - 0.1) / 2, z: d + 0.74 });
  }
  if (hero) for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) b.beam([x, y - 0.5, d - 0.58], [x * 0.9, y - 0.2, d + 0.4], 0.018, { m: 'timber', part: 'frame' });

  // counter with a plank front, then the noren in three panels
  b.box(w * 0.9, 0.12, 0.72, { m: 'timberMed', part: 'counter', y: 0.86, z: d + 0.42 });
  if (!far) {
    b.box(w * 0.88, 0.8, 0.04, { m: 'timber', part: 'counter', y: 0.4, z: d + 0.76 });
    if (hero) for (let i = -2; i <= 2; i++) b.box(0.012, 0.8, 0.02, { m: 'dark', part: 'counter', x: i * w * 0.17, y: 0.4, z: d + 0.785 });
  }
  if (far) b.box(w * 0.86, 0.3, 0.04, { m: `noren_${norenKey}`, part: 'noren', y: y - 0.18, z: d + 0.76 });
  else for (const k of [-1, 0, 1]) b.box(w * 0.27, 0.3, 0.04, { m: `noren_${norenKey}`, part: 'noren', x: k * w * 0.29, y: y - 0.18, z: d + 0.76 });

  // the day's fare
  if (fare === 'yakitori' || fare === 'dango') {
    for (let x = -w * 0.32; x <= w * 0.32; x += 0.25) {
      b.cyl(0.018, 0.78, { m: 'bamboo', part: 'wares', seg: 5, x, y: 1.18, z: d + 0.62 });
      if (!far) for (let yy = 1.0; yy < 1.32; yy += 0.14) b.sphere(0.055, { m: `goods${fare === 'dango' ? 3 : 0}`, part: 'wares', seg: seg(t, 6), x, y: yy, z: d + 0.62 });
    }
  } else if (fare === 'festival masks') {
    if (!far) b.box(w * 0.92, 0.5, 0.05, { m: 'timberMed', part: 'wares', y: 1.48, z: d + 0.8 });   // the mask rack's backboard
    for (let x = -w * 0.3, i = 0; x <= w * 0.3; x += 0.3, i++) b.add(new ctx.THREE.CircleGeometry(0.105, seg(t, 10)), { m: `goods${(i + 1) % 6}`, part: 'wares', x, y: 1.48, z: d + 0.82 });
  } else {
    for (let x = -w * 0.3, i = 0; x <= w * 0.3; x += 0.3, i++) b.cyl(0.045, 0.25, { m: `goods${(i + 4) % 6}`, part: 'wares', seg: 7, x, y: 1.05, z: d + 0.58 });
  }

  // chochin and its light
  const lx = w * 0.36;
  b.lantern(0.12, 0.34, { m: look > 0.5 ? 'lanternRed' : 'lanternWhite', part: 'lamps', seg: seg(t, 10), rims: !far, x: lx, y: y - 0.32, z: d + 0.68 });
  if (!far) b.cyl(0.006, 0.12, { m: 'dark', part: 'lamps', seg: 4, x: lx, y: y - 0.1, z: d + 0.68 });

  // dressing (decorateStall): sign board, tie cords, bowls, a crate of parcels, the fare's trimmings
  if (!far) {
    const ice = /kakigori|ramune|hiyashi/.test(fare);
    const signMat = ctx.MAT && ctx.MAT.stallSigns && ctx.MAT.stallSigns[fare] ? ctx.MAT.stallSigns[fare] : `signs${ice ? 1 : /dango/.test(fare) ? 5 : 2}`;
    b.box(0.32, 0.66, 0.035, { m: signMat, part: 'sign', x: -w * 0.4, y: 1.45, z: d + 0.8, rz: -0.025 });
    if (hero) for (const s of [-1, 1]) b.beam([s * w * 0.43, 0.92, d - 0.55], [s * w * 0.43, y - 0.04, d + 0.7], 0.012, { m: 'twine', part: 'wares', seg: 5 });
    if (hero) for (const s of [-1, 1]) b.sphere(0.12, { m: 'enamel', part: 'wares', x: s * w * 0.32, y: 0.98, z: d + 0.4, sy: 0.5 });
    b.box(0.52, 0.38, 0.45, { m: 'timberMed', part: 'crate', x: -w * 0.4, y: 0.19, z: d - 0.2 });
    for (let i = 0; i < 4; i++) b.box(0.16, 0.16, 0.15, { m: `goods${(i + 2) % 6}`, part: 'crate', x: -w * 0.4 + (i % 2 - 0.5) * 0.18, y: 0.48 + Math.floor(i / 2) * 0.14, z: d - 0.2, ry: i * 0.3 });
    if (/wind/.test(fare)) for (let i = -2; i <= 2; i++) {
      b.sphere(0.095, { m: 'glass', part: 'chimes', x: i * 0.3, y: y - 0.3, z: d + 0.56, sy: 0.8 });
      b.cyl(0.006, 0.44, { m: 'twine', part: 'chimes', seg: 4, x: i * 0.3, y: y - 0.26, z: d + 0.56 });
      b.box(0.065, 0.22, 0.009, { m: `cloth${(i + 7) % 5}`, part: 'chimes', x: i * 0.3, y: y - 0.57, z: d + 0.56, rz: i * 0.07 });
    }
    if (/masks/.test(fare)) for (let i = -2; i <= 2; i++) {
      b.sphere(1, { m: 'enamel', part: 'wares', x: i * 0.3, y: 1.45, z: d + 0.85, sx: 0.095, sy: 0.13, sz: 0.035 });
      if (hero) for (const s of [-1, 1]) b.cyl(0.035, 0.09, { m: 'goods3', part: 'wares', seg: 5, r2: 0.001, x: i * 0.3 + s * 0.065, y: 1.57, z: d + 0.85 });
    }
    if (/kingyo/.test(fare)) {
      b.box(w * 0.58, 0.08, 0.5, { m: 'bamboo', part: 'wares', y: 0.96, z: d + 0.42 });
      b.box(w * 0.54, 0.015, 0.46, { m: 'goods5', part: 'wares', y: 1.01, z: d + 0.42 });
      for (let i = 0; i < 7; i++) b.sphere(1, { m: `goods${i % 2 ? 0 : 3}`, part: 'wares', x: -0.55 + i * 0.18, y: 1.035, z: d + 0.36 + Math.sin(i * 3) * 0.12, sx: 0.06, sy: 0.025, sz: 0.025 });
    } else if (/kakigori|cotton/.test(fare)) {
      for (let i = -2; i <= 2; i++) {
        b.cyl(0.075, 0.13, { m: `goods${(i + 6) % 6}`, part: 'wares', seg: 9, r2: 0.04, x: i * 0.24, y: 1.0, z: d + 0.55 });
        b.sphere(0.1, { m: 'cloth0', part: 'wares', x: i * 0.24, y: 1.07, z: d + 0.55, sy: 0.75 });
      }
    } else if (/takoyaki|okonomiyaki|yakisoba|ayu/.test(fare)) {
      b.box(w * 0.62, 0.06, 0.52, { m: 'steel', part: 'wares', y: 0.98, z: d + 0.47 });
      for (let i = 0; i < 12; i++) b.sphere(1, { m: 'goods1', part: 'wares', x: -w * 0.25 + (i % 6) * 0.24, y: 1.04, z: d + 0.35 + Math.floor(i / 6) * 0.22, sx: /okono/.test(fare) ? 0.16 : 0.055, sy: 0.035, sz: 0.06 });
      b.box(w * 0.6, 0.035, 0.07, { m: 'goods0', part: 'wares', y: 0.89, z: d + 0.55 });
    } else if (/ringo|chestnuts/.test(fare)) {
      for (let i = -3; i <= 3; i++) { b.sphere(0.075, { m: 'goods3', part: 'wares', x: i * 0.2, y: 1.16, z: d + 0.55 }); b.cyl(0.009, 0.27, { m: 'bamboo', part: 'wares', seg: 4, x: i * 0.2, y: 0.99, z: d + 0.55 }); }
    } else if (/wind|matcha/.test(fare)) {
      for (let i = -2; i <= 2; i++) b.cyl(0.08, 0.11, { m: 'terracotta', part: 'wares', seg: 9, r2: 0.06, x: i * 0.23, y: 1.0, z: d + 0.55 });
    }
  }

  const out = b.finish();
  const light = new ctx.THREE.Object3D();
  light.position.set(w * 0.28, y - 0.3, d + 0.7);
  out.group.add(light);
  out.sockets = { light_0: light };
  return out;
}

/* -------------------------------------------------------------- lantern rack --- */

export function buildRack(ctx, layout, p) {
  const pc = layout.piece, t = ctx.tier, d = pc.d, sm = layout.s, far = t === 'far', hero = t === 'hero';
  const b = new PBag(ctx);
  for (const tier of pc.tiers) {
    const x0 = tier.s0 - sm, x1 = tier.s1 - sm, ty = tier.y;
    b.box(x1 - x0, 0.06, 0.12, { m: 'timber', part: 'beam', x: (x0 + x1) / 2, y: ty - 0.03, z: d });
    for (const x of [x0 + 0.04, x1 - 0.04]) b.box(0.07, ty, 0.07, { m: 'timber', part: 'posts', x, y: ty / 2, z: d });
    if (!far) {
      b.box(x1 - x0 - 0.1, 0.035, 0.07, { m: 'timber', part: 'beam', x: (x0 + x1) / 2, y: ty - 0.4, z: d });   // a lower lantern rail
      for (const x of [x0 + 0.04, x1 - 0.04]) b.beam([x, ty * 0.35, d], [x + (x < (x0 + x1) / 2 ? 0.34 : -0.34), ty - 0.4, d], 0.022, { m: 'timber', part: 'posts' });
    }
    const step = far ? 0.6 : 0.3;
    for (let x = x0 + 0.18; x < x1 - 0.1; x += step) {
      b.lantern(0.11, 0.3, { m: 'lanternWhite', part: 'lamps', seg: seg(t, 10), rims: !far, x, y: ty - 0.28, z: d + 0.02 });
    }
  }
  const out = b.finish();
  const light = new ctx.THREE.Object3D();
  light.position.set(0, 1.6, d + 0.3);
  out.group.add(light);
  out.sockets = { light_0: light };
  return out;
}

/* -------------------------------------------------------------------- tsuiji --- */

export function buildTsuiji(ctx, layout, p) {
  const pc = layout.piece, t = ctx.tier, w = pc.s1 - pc.s0, d = pc.d, far = t === 'far', hero = t === 'hero';
  const b = new PBag(ctx);
  b.box(w, 1.45, 0.7, { m: 'sujibei', part: 'wall', y: 0.72, z: d });
  b.slope('roof', { x: 0, y: 1.42, z: d + 0.6 }, 0.16, 0.5, w + 0.2, 0, 0.08);
  b.slope('roof', { x: 0, y: 1.42, z: d - 0.6 }, 0.16, 0.5, w + 0.2, Math.PI, 0.08);
  if (!far) {
    // footing under the wall and dark eave boards under the roof edges (same two materials as the classic wall)
    b.box(w + 0.04, 0.16, 0.76, { m: 'sujibei', part: 'footing', y: 0.08, z: d });
    for (const s of [-1, 1]) b.box(w + 0.18, 0.05, 0.05, { m: 'roof', part: 'eave', y: 1.4, z: d + s * 0.6 });
  }
  if (hero) {   // a timber post pair every 12 m (a 660 m wall: spacing keeps the hero tier near the classic's size)
    const n = Math.max(1, Math.round(w / 12));
    for (let i = 0; i <= n; i++) for (const s of [-1, 1]) b.box(0.1, 1.4, 0.04, { m: 'sujibei', part: 'posts', x: -w / 2 + 0.05 + (w - 0.1) * (i / n), y: 0.72, z: d + s * 0.36 });
  }
  return b.finish();
}

/* ---------------------------------------------------------------------- gate --- */

export function buildGate(ctx, layout, p) {
  const pc = layout.piece, t = ctx.tier, sm = layout.s, far = t === 'far', hero = t === 'hero';
  const b = new PBag(ctx, far ? { fold: (m) => (m === 'roof' || m === 'ridge' || m === 'plaster' ? 'roof' : 'timber'), onePart: true } : {});
  const x0 = pc.s0 - sm, x1 = pc.s1 - sm, zF = pc.dFront, zB = zF - pc.depth, zm = (zF + zB) / 2, foot = pc.foot;
  for (const x of [x0 + 0.3, x0 + 2.2, x1 - 2.2, x1 - 0.3]) for (const z of [zF - 0.3, zB + 0.3]) {
    b.box(0.36, foot, 0.36, { m: 'timber', part: 'posts', x, y: foot / 2, z });
    if (!far) b.box(0.48, 0.14, 0.48, { m: 'timberMed', part: 'posts', x, y: 0.07, z });          // plinth stone under each post
    if (hero) b.box(0.44, 0.1, 0.44, { m: 'timberMed', part: 'posts', x, y: foot - 0.55, z });   // the daiwa bracket block
  }
  b.box(x1 - x0, 0.4, pc.depth, { m: 'timber', part: 'floor', y: foot - 0.2, z: zm });
  b.box(x1 - x0 - 0.4, 0.6, 0.2, { m: 'timber', part: 'beam', y: foot - 1.0, z: zF - 0.3 });
  b.box(2.4, 3.2, 0.1, { m: 'timberMed', part: 'doors', y: 1.6, z: zm });
  if (!far) {
    for (const s of [-0.6, 0.6]) {   // the door leaves' stiles and nail rows, proud of the boards
      b.box(0.08, 3.1, 0.04, { m: 'timber', part: 'doors', x: s * 2, y: 1.6, z: zm + 0.07 });
    }
    b.box(2.3, 0.08, 0.04, { m: 'timber', part: 'doors', y: 2.6, z: zm + 0.07 });
    b.box(2.3, 0.08, 0.04, { m: 'timber', part: 'doors', y: 0.7, z: zm + 0.07 });
    for (const x of [-0.18, 0.18]) b.sphere(0.07, { m: 'timberMed', part: 'doors', x, y: 1.5, z: zm + 0.09, seg: 6 });
  }
  // tsuma-iri roof (rooftops/js/pieces/machiya.js tsumaRoof, ported), gable to the street
  const oh = 0.6, eave = foot, ridge = pc.ridge - 0.06, xm = (x0 + x1) / 2, half = (x1 - x0) / 2 + oh, width = zF - zB + 1.1;
  b.slope('roof', { x: x0 - oh, y: eave, z: zm }, ridge - eave, half, width, -Math.PI / 2);
  b.slope('roof', { x: x1 + oh, y: eave, z: zm }, ridge - eave, half, width, Math.PI / 2);
  const rl = zF + 0.55 - (zB - 0.55);
  b.cyl(0.13, rl + 0.1, { m: 'ridge', part: 'ridge', axis: 'z', x: xm, y: ridge - 0.2 + 0.08, z: (zB - 0.55 + zF + 0.55) / 2 });
  b.box(0.28, 0.1, rl, { m: 'ridge', part: 'ridge', x: xm, y: ridge - 0.2 + 0.2, z: (zB - 0.55 + zF + 0.55) / 2 });
  for (const e of [zB - 0.55, zF + 0.55]) b.box(0.4, 0.42, 0.14, { m: 'ridge', part: 'ridge', x: xm, y: ridge - 0.2 + 0.22, z: e });
  b.tri('plaster', [x0, eave, zF + 0.02], [x1, eave, zF + 0.02], [xm, ridge - 0.08, zF + 0.02]);
  b.box(x1 - x0 + 0.1, 0.1, 0.1, { m: 'timber', part: 'gable', x: xm, y: eave + 0.02, z: zF + 0.05 });
  b.box(0.1, ridge - eave - 0.1, 0.1, { m: 'timber', part: 'gable', x: xm, y: (eave + ridge) / 2 - 0.05, z: zF + 0.05 });
  if (!far) for (const s of [-1, 1]) b.beam([xm, eave + 0.05, zF + 0.05], [xm + s * (x1 - x0) * 0.32, eave + (ridge - eave) * 0.5, zF + 0.05], 0.04, { m: 'timber', part: 'gable' });
  b.tri('plaster', [x1, eave, zB], [x0, eave, zB], [xm, ridge - 0.08, zB]);
  void TAU; void hero;
  return b.finish();
}
