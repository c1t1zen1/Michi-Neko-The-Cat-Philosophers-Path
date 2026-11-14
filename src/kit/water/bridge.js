// The valley bridge as a Sanjō-style mokugeta-bashi, promoted from Lab 02's
// `b-sanjo` (the lab's recommendation for the valley bridge): plank deck
// (shiki-ita) on keta beams, two pier bents (hashigui) standing in the river,
// dressed-stone abutments (ishigaki) with wing walls along the ramps, and a
// wayō kōran on each side: jifuku curb rail, the seven posts, hirageta middle
// rail, tozuka struts on masu blocks, the top rail (hokogi), and oyabashira at
// the four ends capped with bronze giboshi.
//
// Gameplay stays the classic bridge's, exactly (the footprint is the layout's:
// deck platform, both railing platforms, both ramp slopes, the deck water
// clearance, the ramp water exclusions and the grass exclusion):
//   - deck walking surface y = 1.08 over x ±1.3, z ±4.2 (deckY 1.0 + 0.08)
//   - railings: the walkable top of each top rail is y = 1.66, x = ±1.24 ± 0.21,
//     z ±4.2 (the classic's 0.42 m flat cap; the hokogi here keeps that flat top
//     and only chamfers its edges)
//   - the seven posts per side sit at the classic z = −4 + i·8/6 (Roof Road:
//     the Seven Posts), the ramps' treads lie exactly on the sloped platforms
//     (1.08 m over 2.6 m), nothing new stands on a walkable surface, and the
//     channel under the deck between the pier posts (|x| < 0.9) stays open for
//     a swimming cat and the River-Spirit Charm at the centre.
// Sockets for the Roof Road (r6): post_e_1…7 / post_w_1…7 on the top rail
// over each post (east = +x), and `shoki` on the south (+z) end of the east
// railing, its +z turned to look north along the rail.
// The pier posts are published on the family's shared state (sky.js
// registerObstacles, group space) so a kit river can lay wakes behind them.
//
// Materials: the valley's own MAT set (timberEngawa planks as the classic
// deck, timberDark / timberMedium wood, stoneDark stone, spiritualBellBronze
// caps), so every mesh merges with the classic statics: no new material.
import { Parts } from './parts.js?v=20261113a';
import { waterSky } from './sky.js?v=20261113a';

export const BRIDGE = Object.freeze({
  top: 1.08, halfL: 4.2, halfW: 1.3, railX: 1.24, railTop: 1.66, railHalf: 0.21, ramp: 2.6,
  posts: Object.freeze([0, 1, 2, 3, 4, 5, 6].map((i) => -4 + (i / 6) * 8)),
  bents: Object.freeze([-2.0, 2.0]), pierX: 1.0, pierR: 0.11,
  oyaX: 1.4, oyaZ: 4.36
});

/** The ramp's walkable height `o` metres out from the deck end (Countryside.bridgeRampPlatform). */
export const rampHeight = (o) => Math.max(0.03, BRIDGE.top * (1 - Math.min(1, Math.max(0, o / BRIDGE.ramp))));

// lab giboshi profile: collar over the post top, a ring, the onion and its point
const GIBOSHI = [[0.088, 0], [0.088, 0.13], [0.104, 0.14], [0.104, 0.165], [0.07, 0.185], [0.098, 0.235], [0.118, 0.29], [0.104, 0.345], [0.07, 0.392], [0.03, 0.43], [0.008, 0.47], [0, 0.48]];

const DETAIL = {
  hero: { planks: 31, rampPlanks: 10, keta: [-0.99, -0.33, 0.33, 0.99], postSeg: 10, nuki: true, tozuka: true, giboshiSeg: 18, courses: 3 },
  mid: { planks: 16, rampPlanks: 5, keta: [-0.75, 0.75], postSeg: 6, nuki: false, tozuka: false, giboshiSeg: 10, courses: 0 },
  far: null
};

function materials(ctx, tier) {
  const M = ctx.MAT || {};
  const km = ctx.kitMaterials;
  const pick = (name, make) => M[name] || make();
  const timberDark = pick('timberDark', () => km.shared('darkWood'));
  const timberMedium = pick('timberMedium', () => km.wood());
  return {
    plank: tier === 'far' ? timberDark : pick('timberEngawa', () => km.wood({ base: 0x9a7a52, dark: 0x5e4630 })),
    frame: tier === 'hero' ? timberDark : timberMedium,
    koran: timberMedium,
    stone: pick('stoneDark', () => km.shared('stone')),
    bronze: pick('spiritualBellBronze', () => km.bronze())
  };
}

/** The kōran of one side (sx = +1 east, −1 west). */
function koran(P, key, bronzeKey, sx, det, caps) {
  const B = BRIDGE, x = sx * B.railX, zEnd = B.oyaZ - 0.085;
  // jifuku: the curb rail standing on the deck edge
  P.box(key, 0.12, 0.1, zEnd * 2, x, B.top + 0.05, 0);
  // the seven posts, each with a masu block under the top rail
  for (const z of B.posts) {
    P.box(key, 0.11, 0.37, 0.11, x, B.top + 0.1 + 0.185, z);
    P.box(key, 0.15, 0.03, 0.15, x, 1.565, z);
  }
  if (det.tozuka) {
    // hirageta (middle rail), and a tozuka strut on a masu between each pair of posts
    P.box(key, 0.07, 0.07, zEnd * 2, x, 1.4, 0);
    for (let i = 0; i < B.posts.length - 1; i++) {
      const z = (B.posts[i] + B.posts[i + 1]) / 2;
      P.box(key, 0.065, 0.12, 0.065, x, 1.495, z);
      P.box(key, 0.1, 0.03, 0.1, x, 1.565, z);
    }
  }
  // hokogi: the walkable top rail, flat 0.42 m top at y = 1.66, chamfered edges
  const sec = det.tozuka
    ? [[-0.15, 1.58], [0.15, 1.58], [0.21, 1.615], [0.21, 1.64], [0.19, 1.66], [-0.19, 1.66], [-0.21, 1.64], [-0.21, 1.615]]
    : [[-0.17, 1.58], [0.17, 1.58], [0.21, 1.62], [0.21, 1.66], [-0.21, 1.66], [-0.21, 1.62]];
  P.extrudeZ(key, sec, x, -zEnd, zEnd);
  // oyabashira at both ends, rising out of the wing walls, bronze giboshi on top
  for (const sz of [-1, 1]) {
    const ox = sx * B.oyaX, oz = sz * B.oyaZ;
    P.box(key, 0.17, 1.3, 0.17, ox, 0.5 + 0.65, oz);
    if (caps) P.lathe(bronzeKey, GIBOSHI, ox, 1.8, oz, det.giboshiSeg);
    else P.box(key, 0.21, 0.05, 0.21, ox, 1.825, oz);
  }
}

/** Deck planks, the ramp treads lying exactly on the sloped platforms. */
function planks(P, key, det, rng, hero, gap) {
  const B = BRIDGE, n = det.planks, pitch = (B.halfL * 2) / n, t = 0.065;
  for (let i = 0; i < n; i++) {
    const z = -B.halfL + (i + 0.5) * pitch;
    const w = B.halfW * 2 + (hero ? (rng() - 0.5) * 0.04 : 0);
    const dy = hero ? -rng() * 0.004 : 0;
    P.box(key, w, t, pitch - gap, (hero ? (rng() - 0.5) * 0.02 : 0), B.top - t / 2 + dy, z, { rx: hero ? (rng() - 0.5) * 0.006 : 0 });
  }
  // ramps: contiguous treads (no gaps: the space under them is closed)
  const m = det.rampPlanks, step = B.ramp / m;
  for (const sz of [-1, 1]) {
    for (let i = 0; i < m; i++) {
      const a = i * step, b = (i + 1) * step;
      const ha = rampHeight(a), hb = rampHeight(b);
      const ang = Math.atan2(ha - hb, step);
      const len = Math.hypot(step, ha - hb) + 0.004;
      const nx = Math.sin(ang) * t / 2, ny = Math.cos(ang) * t / 2; // the tread's half-thickness along its normal
      const zc = sz * (B.halfL + (a + b) / 2), yc = (ha + hb) / 2 - ny;
      P.box(key, B.halfW * 2, t, len, 0, yc, zc - sz * nx, { rx: sz * ang });
    }
  }
}

/** Keta beams, two pier bents (cap beam, posts down into the bed, a tie) standing in the river. */
function frame(P, key, det) {
  const B = BRIDGE, ketaTop = B.top - 0.065, ketaH = 0.22;
  for (const x of det.keta) P.box(key, det.keta.length > 2 ? 0.16 : 0.2, ketaH, B.oyaZ * 2 - 0.02, x, ketaTop - ketaH / 2, 0);
  const capTop = ketaTop - ketaH, capH = 0.2;
  for (const z of B.bents) {
    P.box(key, 2.7, capH, 0.24, 0, capTop - capH / 2, z);
    for (const sx of [-1, 1]) P.post(key, B.pierR, sx * B.pierX, -1.2, capTop - capH, z, det.postSeg);
    // the tie runs above a swimming cat's head (deck clearance 0.42)
    if (det.nuki) P.box(key, 2.3, 0.08, 0.06, 0, 0.49, z + B.pierR + 0.03);
  }
}

/** The stone abutment at one end (sz = −1 north, +1 south): ishigaki face under the deck end, wing walls along the ramp. */
function abutment(P, key, sz, det, rng) {
  const B = BRIDGE, z0 = sz * B.halfL, depthZ = 0.35, x1 = 1.54;
  // dressed-stone courses facing the river, joints staggered
  const top = 0.8;
  if (det.courses) {
    const ch = (top + 0.3) / det.courses;
    for (let c = 0; c < det.courses; c++) {
      const y0 = -0.3 + c * ch, off = c % 2 ? 0.385 : 0;
      const edges = [-x1];
      for (let x = -x1 + 0.77 - off; x < x1 - 0.1; x += 0.77) edges.push(x);
      edges.push(x1);
      for (let k = 0; k < edges.length - 1; k++) {
        const w = edges[k + 1] - edges[k] - 0.02, h = ch - 0.02;
        const inset = rng() * 0.025;
        P.box(key, w, h, depthZ - inset, (edges[k] + edges[k + 1]) / 2, y0 + ch / 2, z0 + sz * (depthZ + inset) / 2);
      }
    }
  } else {
    P.box(key, x1 * 2, top + 0.3, depthZ, 0, (top - 0.3) / 2, z0 + sz * depthZ / 2);
  }
  // the sloped cap under the ramp's first treads
  const zA = z0, zB = z0 + sz * depthZ;
  const yA = rampHeight(0) - 0.07, yB = rampHeight(depthZ) - 0.07;
  P.hexa(key, [[-x1, top, zA], [x1, top, zA], [x1, top, zB], [-x1, top, zB], [-x1, yA, zA], [x1, yA, zA], [x1, yB, zB], [-x1, yB, zB]]);
  // wing walls: earth-retaining stone along both sides of the ramp, a curb 7 cm above the tread
  const zE = z0 + sz * (B.ramp + 0.15);
  for (const sx of [-1, 1]) {
    const xa = sx * B.halfW, xb = sx * x1;
    const ya = rampHeight(0) + 0.07, yb = rampHeight(B.ramp + 0.15) + 0.07;
    P.hexa(key, [[xa, -0.05, z0], [xb, -0.05, z0], [xb, -0.05, zE], [xa, -0.05, zE], [xa, ya, z0], [xb, ya, z0], [xb, yb, zE], [xa, yb, zE]]);
  }
}

/** The far tier: deck slab, ramps and rails in one timber mesh; each abutment one stone block. */
function farBridge(P, keys) {
  const B = BRIDGE;
  P.box(keys.plank, B.halfW * 2, 0.16, B.halfL * 2, 0, B.top - 0.08, 0);
  for (const sx of [-1, 1]) {
    P.box(keys.plank, 0.42, 0.08, B.halfL * 2, sx * B.railX, B.railTop - 0.04, 0);
    P.box(keys.plank, 0.12, 0.5, B.halfL * 2, sx * B.railX, B.top + 0.25, 0);
  }
  for (const sz of [-1, 1]) {
    const ang = Math.atan2(B.top, B.ramp), len = Math.hypot(B.ramp, B.top);
    P.box(keys.plank, B.halfW * 2, 0.08, len, 0, B.top / 2 - 0.04, sz * (B.halfL + B.ramp / 2), { rx: sz * ang });
  }
}

export function buildBridge(ctx, layout, p) {
  const { THREE: T, tier, rng } = ctx;
  const mats = materials(ctx, tier);
  const det = DETAIL[tier];
  const group = new T.Group();
  const parts = {};
  const P = new Parts();
  const keyOf = (part, mat) => `${part}:${mat}`;
  if (det) {
    planks(P, keyOf('deck', 'plank'), det, rng, tier === 'hero', tier === 'hero' ? p.plank_gap : 0.01);
    frame(P, keyOf('frame', 'frame'), det);
    koran(P, keyOf('koran_e', 'koran'), keyOf('giboshi', 'bronze'), 1, det, p.giboshi);
    koran(P, keyOf('koran_w', 'koran'), keyOf('giboshi', 'bronze'), -1, det, p.giboshi);
    abutment(P, keyOf('abutment_n', 'stone'), -1, det, rng);
    abutment(P, keyOf('abutment_s', 'stone'), 1, det, rng);
  } else {
    farBridge(P, { plank: keyOf('deck', 'plank') });
    for (const sz of [-1, 1]) {
      const k = keyOf(sz < 0 ? 'abutment_n' : 'abutment_s', 'stone');
      P.box(k, 3.08, 1.1, 0.35, 0, 0.25, sz * (BRIDGE.halfL + 0.175));
      for (const sx of [-1, 1]) P.box(k, 0.24, 0.6, BRIDGE.ramp, sx * 1.42, 0.25, sz * (BRIDGE.halfL + BRIDGE.ramp / 2));
    }
  }
  for (const part of ['deck', 'frame', 'koran_e', 'koran_w', 'giboshi', 'abutment_n', 'abutment_s']) {
    const holder = new T.Group();
    for (const mat of ['plank', 'frame', 'koran', 'bronze', 'stone']) {
      const mesh = P.mesh(keyOf(part, mat), mats[mat]);
      if (mesh) holder.add(mesh);
    }
    group.add(holder);
    parts[part] = holder;
  }
  P.dispose();
  // a single mesh in a part is the part itself (fewer nodes for cadJS to address)
  for (const [key, holder] of Object.entries(parts)) {
    if (holder.children.length === 1) {
      const mesh = holder.children[0];
      group.remove(holder); holder.remove(mesh); group.add(mesh);
      parts[key] = mesh;
    }
  }

  // Roof Road sockets: the top rail over each of the seven posts, and the Shōki seat
  const sockets = {};
  BRIDGE.posts.forEach((z, i) => {
    for (const [side, sx] of [['e', 1], ['w', -1]]) {
      const s = new T.Object3D();
      s.position.set(sx * BRIDGE.railX, BRIDGE.railTop, z);
      group.add(s);
      sockets[`post_${side}_${i + 1}`] = s;
    }
  });
  const shoki = new T.Object3D();
  shoki.position.set(BRIDGE.railX, BRIDGE.railTop, BRIDGE.posts[6]);
  shoki.rotation.y = Math.PI;
  group.add(shoki);
  sockets.shoki = shoki;

  // the pier posts as flow obstacles for a kit river's field (group space), on the family's shared state
  const obstacles = det ? BRIDGE.bents.flatMap((z) => [-1, 1].map((sx) => ({ x: sx * BRIDGE.pierX, z, r: BRIDGE.pierR * 1.1 }))) : [];
  const shared = waterSky(ctx.kitMaterials);
  if (obstacles.length) shared.registerObstacles(group, obstacles);
  return { group, parts, sockets, live: [], dispose() { shared.unregisterObstacles(group); } };
}
