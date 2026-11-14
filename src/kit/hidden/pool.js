// The Moon Pool, part by part (lab 07 "moonpool"). Every builder takes
// (ctx, layout) and returns { group, parts, live, update, dispose }; the
// per-part assets use one each, and `buildMoonPool` composes them (with the
// lanterns family's pool toro) for a kit whole. Positions are local to the
// part's own origin: the owner places the group at the layout's x, y, z.
import * as THREE from 'three';
import { TAU, sstep, canvas2d, canvasTexture, merge, indexed, rockGeometry, withUv } from '../craft.js?v=20261113a';
import { fitRock, variantRock, placed, bake, DETAIL } from '../rocks/stone.js?v=20261113a';
import { buildStoneLantern } from '../lanterns/build.js?v=20261113a';
import {
  nightnessAt, dayLightAt, calmAt, hourOf, shared, glowTexture, leafMaterial, freePrivate,
  polarDisc, bakeAt, tint, glowPoints, compose, single
} from './common.js?v=20261113a';

const TIER = (t, hero, mid, far) => (t === 'hero' ? hero : t === 'mid' ? mid : far);

/* ----------------------------------------------------------------- apron --- */

// The mossy ground around the water: the layout's 260 marks become moss
// clumps and pebble flecks, a wet dark band at the water's edge, and a worn,
// paler trail up the south shore where visitors arrive.
function apronTexture(L) {
  const [c, x] = canvas2d(256, 256), s = 256;
  const g = x.createRadialGradient(s / 2, s / 2, s * 0.16, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(66,92,58,1)'); g.addColorStop(0.7, 'rgba(84,112,66,0.88)'); g.addColorStop(1, 'rgba(92,122,70,0)');
  x.fillStyle = g; x.fillRect(0, 0, s, s);
  const inner = (s / 2) * (L.radius - 2.4) / L.radius;
  // wet band: where the stones keep the ground dark
  const wet = x.createRadialGradient(s / 2, s / 2, inner * 0.92, s / 2, s / 2, inner * 1.3);
  wet.addColorStop(0, 'rgba(30,46,34,0.55)'); wet.addColorStop(1, 'rgba(30,46,34,0)');
  x.fillStyle = wet; x.fillRect(0, 0, s, s);
  L.marks.forEach(([r, gg, b, a, mx, my, mw, mh], i) => {
    const px = mx * s, py = my * s;
    if (Math.hypot(px - s / 2, py - s / 2) < inner * 0.9) return;     // keep the water's footprint clean
    if (i % 5 === 0) {                                                // a soft moss clump
      const rad = 3 + mw * 1.6, cl = x.createRadialGradient(px, py, 0, px, py, rad);
      cl.addColorStop(0, `rgba(${r - 10},${gg + 28},${b - 4},${Math.min(0.7, a * 2.4)})`); cl.addColorStop(1, `rgba(${r},${gg},${b},0)`);
      x.fillStyle = cl; x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    } else if (i % 7 === 1) {                                         // a pale pebble
      x.fillStyle = `rgba(168,170,158,${0.25 + a})`; x.beginPath(); x.ellipse(px, py, 1 + mh * 0.4, 0.8 + mh * 0.25, mx * 6, 0, TAU); x.fill();
    } else { x.fillStyle = `rgba(${r},${gg},${b},${a})`; x.fillRect(px, py, mw, mh); }
  });
  // the arrival trail, bottom of the sheet = south (+z)
  const trail = x.createLinearGradient(0, s * 0.62, 0, s);
  trail.addColorStop(0, 'rgba(150,138,104,0)'); trail.addColorStop(0.55, 'rgba(150,138,104,0.42)'); trail.addColorStop(1, 'rgba(150,138,104,0)');
  x.fillStyle = trail; x.fillRect(s * 0.42, s * 0.62, s * 0.16, s * 0.38);
  return canvasTexture(c);
}

export function buildApron(ctx, L, p) {
  const { tier, kitMaterials: km } = ctx;
  const map = apronTexture(L);
  const mat = new THREE.MeshStandardMaterial({ map, color: p.tint, transparent: true, roughness: 1, depthWrite: false });
  const r = L.radius * p.spread;
  const mesh = new THREE.Mesh(polarDisc(r, TIER(tier, 4, 2, 1), TIER(tier, 56, 32, 16), { uvScale: 1 / p.spread }), mat);
  mesh.position.y = Math.min(L.lift, 0.02);
  mesh.receiveShadow = true;
  mesh.name = 'disc';
  return single('disc', mesh, { dispose() { freePrivate([mat, map]); } });
}

/* ----------------------------------------------------------------- water --- */

// Caustic cells: the layout's ring centres become the sites of a wrapped
// Voronoi; the bright network is the cell edges (F2 - F1), as light is on a
// real pool floor. One texture per layout, shared by every instance.
function causticTexture(km, L) {
  const sites = L.rings.map((r) => [r.cx, r.cy]);
  return shared(km, 'caustic:' + sites.length + ':' + sites[0][0].toFixed(5), () => {
    const N = 96, [c, x] = canvas2d(N, N), img = x.createImageData(N, N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const u = (i + 0.5) / N, v = (j + 0.5) / N;
      let f1 = 9, f2 = 9;
      for (const [sx, sy] of sites) for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const d = Math.hypot(sx + ox - u, sy + oy - v);
        if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
      }
      const e = f2 - f1, k = Math.max(0, 1 - e * 38);
      const a = Math.round(255 * k * k);
      const o = (j * N + i) * 4;
      img.data[o] = 180; img.data[o + 1] = 255; img.data[o + 2] = 238; img.data[o + 3] = 255;
      img.data[o] = img.data[o] * a / 255; img.data[o + 1] = img.data[o + 1] * a / 255; img.data[o + 2] = img.data[o + 2] * a / 255;
    }
    x.putImageData(img, 0, 0);
    const t = canvasTexture(c, { repeat: true });
    t.repeat.set(2.2, 2.2); t.center.set(0.5, 0.5);
    return t;
  });
}

const DEEP = new THREE.Color(0x173f4a), SHALLOW = new THREE.Color(0x3f8f88);
export function buildWater(ctx, L, p) {
  const { tier, kitMaterials: km } = ctx;
  const r = L.radius, c = new THREE.Color();
  // depth shows as colour: dark in the middle, clear turquoise over the stones of the rim
  const geo = polarDisc(r, TIER(tier, 8, 4, 2), TIER(tier, 64, 36, 20), {
    y: () => 0, color: (rn) => { c.copy(DEEP).lerp(SHALLOW, sstep(0.5, 1, rn)); return [c.r, c.g, c.b]; }
  });
  const mat = new THREE.MeshStandardMaterial({
    color: p.tint, vertexColors: true, roughness: p.shine, metalness: 0.05, transparent: true, opacity: 0.9,
    emissive: 0x0a2a30, emissiveIntensity: 0.35, envMapIntensity: 1.5
  });
  const surface = new THREE.Mesh(geo, mat);
  surface.position.y = L.surface; surface.renderOrder = 1; surface.name = 'surface';
  const group = new THREE.Group(), parts = { surface }, live = [];
  group.add(surface);
  let cmat = null, tex = null;
  if (tier !== 'far') {
    tex = causticTexture(km, L);
    cmat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const caustic = new THREE.Mesh(polarDisc(r * 0.98, 2, TIER(tier, 48, 24, 12)), cmat);
    caustic.position.y = 0.056; caustic.renderOrder = 2; caustic.name = 'caustic';
    group.add(caustic); parts.caustic = caustic; live.push(caustic);
  }
  return {
    group, parts, live,
    update(dt, t, env) {
      const hour = hourOf(env), night = nightnessAt(hour);
      mat.emissiveIntensity = 0.3 + night * 0.9;
      if (cmat) {
        cmat.opacity = dayLightAt(hour) * 0.55 * calmAt(env);
        tex.offset.set(t * 0.012, t * 0.008); tex.rotation = t * 0.015;
      }
    },
    dispose() { freePrivate([mat, cmat]); }
  };
}

/* ------------------------------------------------------------------ moon --- */

export function buildMoon(ctx, L, p) {
  const { tier, kitMaterials: km, rng } = ctx;
  const tex = glowTexture(km, 'moon', 'rgba(235,246,255,1)', 'rgba(150,200,235,0.45)');
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const sprite = new THREE.Sprite(mat);
  const size = L.size * p.size;
  sprite.scale.set(size, size, 1); sprite.renderOrder = 3; sprite.name = 'sprite';
  const group = new THREE.Group(), parts = { sprite }, live = [sprite];
  group.add(sprite);
  // a path of glints toward the sitting stone: short-lived sparks on their own timers
  let glints = null, gl = null, ph = null;
  if (tier === 'hero') {
    const n = 18;
    gl = glowPoints(km, n, { size: 0.085, tex: glowTexture(km, 'glint', 'rgba(255,255,255,1)', 'rgba(190,225,255,0.4)'), color: 0xdcefff });
    ph = [];
    for (let i = 0; i < n; i++) {
      const f = (i + rng()) / n;
      ph.push({ x: (rng() - 0.5) * (0.25 + 0.7 * f), z: f * 2.5 * p.size, sp: 0.5 + rng() * 1.1, ph: rng() * TAU });
    }
    glints = gl.points; glints.name = 'glints';
    group.add(glints); parts.glints = glints; live.push(glints);
  }
  return {
    group, parts, live,
    update(dt, t, env) {
      const night = nightnessAt(hourOf(env));
      mat.opacity = night * 0.75 * (0.9 + 0.1 * Math.sin(t * 1.3));
      sprite.position.x = Math.sin(t * 0.5) * 0.08;
      if (gl) {
        glints.visible = night > 0.02;
        for (let i = 0; i < ph.length; i++) {
          const q = ph[i], k = Math.max(0, Math.sin(t * q.sp + q.ph));
          gl.set(i, q.x, -0.02, q.z, night * k * k * k * 0.9 * calmAt(env));
        }
        gl.done();
      }
    },
    dispose() { freePrivate([mat, glints && glints.material]); }
  };
}

/* ------------------------------------------------------------------- rim --- */

// 34 chiselled stones round the pool, each tinted by the layout's own hue
// (the rock material is world-painted, so the variety comes from three
// variants, moss and the layout's scale and tumble).
export function buildRim(ctx, L, p) {
  const { tier, rng, kitMaterials: km } = ctx;
  const det = DETAIL[tier][1];
  const opts = { cuts: p.facets, cutDepth: 0.66, rough: 0.2, ridge: 0.05 };
  const variants = [0, 1, 2].map(() => variantRock(1 + Math.floor(rng() * 9000), det, opts));
  const list = [];
  L.stones.forEach(({ a, rr, s, euler }, i) => {
    const k = p.size, sx = 0.33 * 1.15 * s * k, sy = 0.3 * 0.62 * s * k * 1.25, sz = 0.33 * s * k;
    list.push(placed(variants[i % 3], [Math.cos(a) * rr, 0.07 * s * k, Math.sin(a) * rr], [euler[0] * 0.3, euler[1], euler[2] * 0.3], [sx, sy / 0.85, sz]));
  });
  for (const v of variants) v.dispose();
  const geo = bake(list);
  const mesh = new THREE.Mesh(geo, km.rock({ a: 0x4e5b4a, b: 0x9aa08e, moss: p.moss, lichen: 0.18 }));
  mesh.castShadow = mesh.receiveShadow = true; mesh.name = 'stones';
  return single('stones', mesh);
}

/* ------------------------------------------------------------------ seat --- */

// A flat worn stone, dished a little where visitors sit. Top at 9 cm, the
// classic cylinder's height, so the rest anchor stays where it was.
export function slabGeometry(seed, tier, hx, hy, hz) {
  const g = fitRock(rockGeometry(seed, { detail: TIER(tier, 3, 2, 1), h: 0.3, flat: 0.6, rough: 0.1, ridge: 0.04, cuts: 6, cutDepth: 0.7 }), hx, hy, hz);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {   // a shallow dish in the top face
    const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i);
    if (y > hy * 0.4) pos.setY(i, y - 0.012 * Math.max(0, 1 - (x * x / (hx * hx) + z * z / (hz * hz))));
  }
  g.computeVertexNormals();
  return withUv(g, 1);
}

export function buildPoolSeat(ctx, L, p) {
  const { tier, rng, kitMaterials: km } = ctx;
  const geo = slabGeometry(1 + Math.floor(rng() * 9000), tier, 0.67 * p.size, 0.048, 0.62 * p.size);
  const mesh = new THREE.Mesh(geo, km.rock({ a: 0x6a665e, b: 0xa8a294, moss: p.moss, lichen: 0.3 }));
  mesh.position.set(0, 0.045, 0);
  mesh.castShadow = mesh.receiveShadow = true; mesh.name = 'slab';
  return single('slab', mesh);
}

/* ------------------------------------------------------------- lily pads --- */

const PAD = new THREE.Color(0x4f8a4c);
// A pad: a polar grid with the notch cut out, the rim curled up a centimetre
// or two, veins as stripes of vertex colour, a darker heart where the stem is.
function padGeometry(tier, tintK, curl, wide) {
  const c = new THREE.Color();
  return polarDisc(0.3 * wide, TIER(tier, 3, 2, 1), TIER(tier, 30, 18, 10), {
    a0: 0.4, a1: TAU - 0.1,
    y: (rn) => curl * 0.03 * Math.pow(rn, 4),
    color: (rn, a, j) => {
      const vein = j % 3 === 0 && rn > 0.2 ? 0.8 : 1;
      c.copy(PAD).multiplyScalar(vein * tintK * (0.82 + 0.3 * sstep(0.2, 1, rn) - 0.2 * (1 - sstep(0, 0.25, rn))));
      if (rn > 0.92) c.lerp(new THREE.Color(0x8aa04a), 0.3);
      return [c.r, c.g, c.b];
    }
  });
}

const padList = (ctx, list, p, rng, local) => list.map((pad) => ({
  geo: padGeometry(ctx.tier, 0.9 + rng() * 0.25, p.curl, p.size),
  at: local ? {} : { x: pad.x, y: pad.y, z: pad.z, ry: pad.ry, scale: pad.scale }
}));

// ----- lotus
function petalGeometry(m, len, w, tilt, curl, base, tip) {
  const pos = [], col = [], idx = [], b = new THREE.Color(base), t = new THREE.Color(tip), c = new THREE.Color();
  let x = 0, y = 0;
  for (let i = 0; i <= m; i++) {
    const f = i / m, th = tilt + curl * f, hw = w * Math.sin(Math.PI * (0.18 + 0.82 * Math.pow(f, 0.8))) * (i === m ? 0.05 : 1);
    pos.push(-hw, y, x, 0, y + 0.004 * Math.sin(f * 3), x, hw, y, x);   // petal width along x, length rises in y and leans out along z
    c.copy(b).lerp(t, sstep(0.2, 1, f));
    for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b);
    x += Math.sin(th) * len / m; y += Math.cos(th) * len / m;
  }
  for (let i = 0; i < m; i++) { const a = i * 3, d = a + 3; idx.push(a, d, a + 1, a + 1, d, d + 1, a + 1, d + 1, a + 2, a + 2, d + 1, d + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function lotusGeometry(tier, flower, rng, p) {
  const parts = [], m = TIER(tier, 4, 3, 2);
  const stemH = 0.22 * p.height, top = stemH;
  const rows = tier === 'far' ? [{ n: 6, tilt: 0.5, len: 0.2 }] : [{ n: 5, tilt: 0.18, len: 0.16 }, { n: 7, tilt: 0.5, len: 0.2 }, { n: 8, tilt: 0.85, len: 0.21 }];
  const stem = new THREE.CylinderGeometry(0.011, 0.014, stemH + 0.08, 5, 1, true).translate(0, (stemH - 0.08) / 2, 0);
  parts.push(tint(stem, 0x5f8a4a));
  rows.forEach((row, ri) => {
    const pg = petalGeometry(m, row.len, 0.052 + ri * 0.006, row.tilt, 0.5, ri === 0 ? 0xfff6e0 : 0xfff0ee, ri === 2 ? 0xe9a2bc : 0xf3bfd0);
    for (let k = 0; k < row.n; k++) {
      const g = pg.clone(), a = (k / row.n) * TAU + ri * 0.4 + rng() * 0.12;
      g.rotateY(a).translate(0, top, 0);
      parts.push(g);
    }
    pg.dispose();
  });
  if (tier !== 'far') parts.push(tint(new THREE.CylinderGeometry(0.036, 0.03, 0.03, 8).translate(0, top + 0.04, 0), 0xd6c866));
  if (tier === 'hero') {                                             // the standing leaf: lotus raises its leaves, lilies do not
    const a = rng() * TAU, lx = Math.cos(a) * 0.36, lz = Math.sin(a) * 0.36, lh = 0.3 + rng() * 0.12;
    const dish = polarDisc(0.19, 2, 18, { y: (rn) => 0.07 * rn * rn, color: (rn) => { const k = 0.85 + 0.2 * rn; return [0.3 * k, 0.5 * k, 0.28 * k]; } }).translate(lx, lh, lz);
    parts.push(dish, tint(new THREE.CylinderGeometry(0.008, 0.011, lh + 0.08, 4, 1, true).translate(lx, (lh - 0.08) / 2, lz), 0x5f8a4a));
  }
  const geo = indexed(merge(parts));
  for (const g of parts) g.dispose();
  return bakeAt(geo, { x: flower.x, y: flower.y, z: flower.z });
}

/** Lily pads and lotus as one leafy mesh each (list may be one entry, local to its own origin). */
export function buildPads(ctx, list, p, key = 'pad', local = false) {
  const { kitMaterials: km, rng } = ctx;
  const geos = padList(ctx, list, p, rng, local).map((e) => bakeAt(e.geo, e.at));
  const geo = indexed(merge(geos)); geos.forEach((g) => g.dispose());
  const mesh = new THREE.Mesh(geo, leafMaterial(km));
  mesh.receiveShadow = true; mesh.name = key;
  return single(key, mesh);
}

export function buildLotus(ctx, list, p, key = 'bloom', local = false) {
  const { tier, kitMaterials: km, rng } = ctx;
  const geos = list.map((f) => lotusGeometry(tier, local ? { x: 0, y: 0, z: 0 } : f, rng, p));
  const geo = indexed(merge(geos)); geos.forEach((g) => g.dispose());
  const mesh = new THREE.Mesh(geo, leafMaterial(km));
  mesh.castShadow = true; mesh.name = key;
  return single(key, mesh);
}

/* ----------------------------------------------------------------- motes --- */

export function buildMotes(ctx, L, p) {
  const { tier, kitMaterials: km, rng } = ctx;
  const n = Math.max(6, Math.round(L.list.length * TIER(tier, 1, 0.6, 0.35) * p.density));
  const gp = glowPoints(km, n, { size: 0.13, tex: glowTexture(km, 'mote', 'rgba(220,245,255,1)', 'rgba(150,215,235,0.5)'), color: 0xcdeaf5 });
  const ms = L.list.slice(0, n).map((m) => ({ ...m }));
  gp.points.name = 'points';
  const R = 3.0;
  const step = (dt, t, env) => {
    const strength = nightnessAt(hourOf(env)) * calmAt(env);
    gp.points.visible = strength > 0.01;
    if (!gp.points.visible) return;
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i];
      m.y += m.sp * dt;
      if (m.y > 2.6) { m.y = 0.05; m.a = rng() * TAU; m.rr = rng() * (R - 0.2); }
      const fade = sstep(0, 0.3, m.y) * (1 - sstep(1.7, 2.6, m.y));
      gp.set(i, Math.cos(m.a) * m.rr + Math.sin(t * 0.7 + m.ph) * 0.18, 0.1 + m.y, Math.sin(m.a) * m.rr + Math.cos(t * 0.6 + m.ph) * 0.18, strength * 0.85 * (0.3 + 0.7 * fade));
    }
    gp.done();
  };
  step(0, 0, { hour: 0, wet: 0 });
  return { ...single('points', gp.points), live: [gp.points], update: step, dispose() { freePrivate([gp.points.material]); } };
}

/* ------------------------------------------------------------- the whole --- */

export function buildMoonPool(ctx, L, p) {
  const sub = (fn, l, extra = {}) => fn(ctx, l, { ...extra });
  const near = {
    apron: sub(buildApron, L.apron, { tint: 0xffffff, spread: 1 }),
    water: sub(buildWater, L.water, { tint: 0xffffff, shine: p.shine }),
    moon: sub(buildMoon, L.moon, { size: 1 }),
    rim: sub(buildRim, L.rim, { size: 1, moss: p.moss, facets: 8 }),
    seat: sub(buildPoolSeat, L.seat, { size: 1, moss: p.moss }),
    pads: buildPads(ctx, L.pads, { curl: 1, size: 1 }, 'leaf'),
    lotus: buildLotus(ctx, L.lotus, { height: 1 }, 'bloom'),
    motes: sub(buildMotes, L.motes, { density: p.density })
  };
  const toro = buildStoneLantern(ctx, { index: 0 }, { girth: 1, flame: 0.5 }, { kind: 'kasuga', height: 1.14, kasaR: 0.3, halo: { scale: 1.5, fog: false }, base: 0.2, gain: 2.0 });
  toro.group.name = 'toro';
  return compose([
    ['apron', near.apron], ['water', near.water], ['moon', near.moon, { x: L.moon.x, y: L.moon.y, z: L.moon.z }], ['rim', near.rim],
    ['seat', near.seat, { x: L.seat.x, y: L.seat.y, z: L.seat.z }], ['pads', near.pads], ['lotus', near.lotus], ['motes', near.motes],
    ['toro', toro, { x: L.toro.x, y: 0, z: L.toro.z }]
  ]);
}
