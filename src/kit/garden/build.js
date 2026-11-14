// Shishi-odoshi and fūrin builders. Both have a gameplay-driven part (the
// game rocks `rocker`, sways the chime group), so their meshes are `live`
// (never merged): shishi = tube + feed stream + pour stream (3 live draws),
// chime = cord, bell, clapper, tanzaku (4 live draws). The basin, posts,
// feeder and anvil are static and merge by material.
import * as THREE from 'three';
import { merge, indexed, shadows, V3 } from '../craft.js?v=20261113a';

const mesh = (geo, mat, name, cast = true) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = cast; m.receiveShadow = true; return m; };
const seg = (tier, hero, mid, far) => (tier === 'hero' ? hero : tier === 'mid' ? mid : far);
const matOr = (ctx, name, make) => (ctx.MAT && ctx.MAT[name]) || make();

/* ------------------------------------------------------------ shishi --- */

const PIVOT = V3(0.15, 0.66, 0);
const ARM_MOUTH = 0.32, ARM_TAIL = 0.3, TUBE_R = 0.042;
const FEED_TIP = V3(-0.17, 0.95, 0);
const WATER_Y = 0.34;
const REST_TILT = 0, FILL_TILT = 0.38;

/** Bamboo tube along local +Y: mouth (diagonal cut) at +Y, closed tail at -Y. */
function sozuGeometry(tier) {
  const radial = seg(tier, 20, 10, 6), len = ARM_MOUTH + ARM_TAIL;
  const body = new THREE.CylinderGeometry(TUBE_R, TUBE_R * 1.06, len, radial, 1, true).translate(0, (ARM_MOUTH - ARM_TAIL) / 2, 0);
  const pos = body.attributes.position;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) > ARM_MOUTH - 1e-4) pos.setY(i, ARM_MOUTH - pos.getX(i) * 1.15); // diagonal cut
  body.computeVertexNormals();
  const list = [body, new THREE.CircleGeometry(TUBE_R * 1.06, radial).rotateX(Math.PI / 2).translate(0, -ARM_TAIL, 0),
    new THREE.CircleGeometry(TUBE_R, radial).rotateX(-Math.PI / 2).translate(0, 0.02, 0)]; // tail cap, inner node
  if (tier !== 'far') for (const y of [-0.12, 0.12]) list.push(new THREE.TorusGeometry(TUBE_R * 1.08, 0.006, 5, radial).rotateX(Math.PI / 2).translate(0, y, 0));
  return indexed(merge(list));
}

export function buildShishi(ctx, layout, p) {
  const { tier, kitMaterials: km, rng } = ctx;
  const g = new THREE.Group(), parts = {};
  const add = (name, geo, mat, cast = true, to = g) => { const m = mesh(indexed(geo), mat, name, cast); to.add(m); parts[name] = m; return m; };
  const stone = km.stone({ tint: 0x77736a });
  const age = p.culm_age;
  const bamboo = km.bamboo({ color: new THREE.Color(0x7fa84f).lerp(new THREE.Color(0xc2b36a), age).getHex(), side: THREE.DoubleSide });
  const stem = km.bamboo({ color: new THREE.Color(0x6c8d44).lerp(new THREE.Color(0xa89a5a), age).getHex() });
  const timber = matOr(ctx, 'timberDark', () => km.wood());
  const n = seg(tier, 24, 12, 8);

  // tsukubai: a hollow stone bowl (lathe) with a rolled lip; the water sits low inside
  const prof = [[0.0, 0.0], [0.26, 0.0], [0.34, 0.05], [0.355, 0.2], [0.35, 0.38], [0.36, 0.425], [0.33, 0.43], [0.3, 0.4], [0.29, 0.34]].map(([x, y]) => new THREE.Vector2(x, y));
  add('basin', new THREE.LatheGeometry(prof, n), stone);
  const waterMat = matOr(ctx, 'water', () => km.plain(0x568181, { rough: 0.1 }));
  add('water', new THREE.CircleGeometry(0.29, n).rotateX(-Math.PI / 2).translate(0, WATER_Y, 0), waterMat, false);

  // feeder: a bamboo pipe sloping down to a tip over the mouth, on a stake
  const a = V3(-0.62, 1.08, 0), b = FEED_TIP.clone().add(V3(0.0, 0.0, 0)), d = b.clone().sub(a), L = d.length();
  const pipe = new THREE.CylinderGeometry(0.032, 0.034, L, seg(tier, 12, 8, 6)).rotateZ(-Math.atan2(d.x, d.y) * 0 + 0);
  pipe.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), d.clone().normalize()));
  pipe.translate((a.x + b.x) / 2, (a.y + b.y) / 2, 0);
  add('feed', merge([pipe, new THREE.CylinderGeometry(0.03, 0.03, 0.04, 8).translate(a.x, a.y, 0)]), stem);
  add('stake', new THREE.CylinderGeometry(0.026, 0.03, 1.05, seg(tier, 10, 6, 5)).translate(-0.6, 0.525, 0), stem);

  // posts, axle and the stone the tail strikes
  const post = (z) => new THREE.CylinderGeometry(0.026, 0.032, PIVOT.y + 0.1, 7).translate(PIVOT.x, (PIVOT.y + 0.1) / 2, z);
  add('post_l', post(-0.16), timber); add('post_r', post(0.16), timber);
  add('axle', new THREE.CylinderGeometry(0.014, 0.014, 0.36, 8).rotateX(Math.PI / 2).translate(PIVOT.x, PIVOT.y, 0), timber, false);
  const tailX = PIVOT.x + ARM_TAIL - 0.01, topY = PIVOT.y - TUBE_R * 1.06;
  add('anvil', new THREE.CylinderGeometry(0.075, 0.1, topY, seg(tier, 10, 8, 6)).translate(tailX, topY / 2, 0), stone);
  if (p.pebbles && tier !== 'far') {
    const peb = [], k = seg(tier, 9, 5, 0);
    for (let i = 0; i < k; i++) {
      const t = (i + rng() * 0.6) / k * Math.PI * 2, r = 0.42 + rng() * 0.07, s = 0.035 + rng() * 0.03;
      peb.push(new THREE.SphereGeometry(s, 7, 5).scale(1.2, 0.7, 1).translate(Math.cos(t) * r, s * 0.5, Math.sin(t) * r));
    }
    add('pebbles', merge(peb), stone, false);
  }

  if (tier !== 'hero') { // two static draws: stone and bamboo (water, pebbles dropped)
    const fold = (names, mat, name) => {
      const geos = names.map((k) => { const m = parts[k]; g.remove(m); delete parts[k]; return m.geometry; });
      const m = mesh(indexed(merge(geos)), mat, name); g.add(m); parts[name] = m;
    };
    fold(['basin', 'anvil'], stone, 'basin');
    fold(['feed', 'stake', 'post_l', 'post_r', 'axle'], stem, 'frame');
    if (tier === 'far') { g.remove(parts.water); delete parts.water; }
  }

  // the rocker: the game sets rotation.z = π/2 + tilt on this group
  const rocker = new THREE.Group();
  rocker.position.copy(PIVOT); rocker.rotation.z = Math.PI / 2 + REST_TILT;
  const tube = mesh(sozuGeometry(tier), tier !== 'hero' ? stem : bamboo, 'tube'); rocker.add(tube);
  g.add(rocker); parts.rocker = rocker;

  const live = [tube];
  const streamMat = new THREE.MeshStandardMaterial({ color: 0xc4e1de, transparent: true, opacity: 0.65, roughness: 0.12 });
  const priv = [streamMat];
  let feed = null, pour = null;
  if (tier !== 'far') {
    const sg = new THREE.CylinderGeometry(0.008, 0.011, 1, 6);
    feed = mesh(sg, streamMat, 'stream', false); pour = mesh(sg.clone(), streamMat, 'pour', false);
    pour.visible = false;
    g.add(feed, pour); parts.stream = feed; parts.pour = pour; live.push(feed, pour);
  }

  const up = V3(0, 1, 0), mouth = V3(), top = V3(), bot = V3(), dir = V3();
  const link = (m, hi, lo) => { dir.copy(hi).sub(lo); const l = Math.max(1e-4, dir.length()); m.position.copy(hi).add(lo).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(up, dir.multiplyScalar(1 / l)); m.scale.y = l; };
  let mine = rocker.rotation.z, ext = false, prev = REST_TILT, cool = 0;
  const inst = {
    group: g, parts, live, onClack: null,
    update(dt, t) {
      if (Math.abs(rocker.rotation.z - mine) > 1e-6) ext = true;
      if (!ext) { // standalone (catalog, lab): the same cycle the game runs
        const c = (t * 0.4) % (Math.PI * 2);
        rocker.rotation.z = Math.PI / 2 + (c < 4.8 ? c / 4.8 * FILL_TILT : c < 5.3 ? FILL_TILT + (c - 4.8) / 0.5 * 0.45 : 0.83 * (1 - (c - 5.3) / (Math.PI * 2 - 5.3)));
      }
      mine = rocker.rotation.z;
      const tilt = mine - Math.PI / 2, th = mine;
      // the mouth in group space; the pour follows it as it dips
      mouth.set(-ARM_MOUTH * Math.sin(th), ARM_MOUTH * Math.cos(th), 0).add(PIVOT);
      cool -= dt;
      if (prev > 0.08 && tilt <= 0.08 && cool <= 0) { cool = 0.6; if (typeof inst.onClack === 'function') inst.onClack(); if (typeof layout.onClack === 'function') layout.onClack(); }
      if (feed) {
        const under = Math.abs(mouth.x - FEED_TIP.x) < 0.1 && mouth.y < FEED_TIP.y;
        link(feed, top.copy(FEED_TIP), bot.set(FEED_TIP.x, under ? mouth.y + TUBE_R * 0.6 : WATER_Y, 0));
        const pouring = tilt > 0.4 && tilt >= prev - 1e-4;
        pour.visible = pouring;
        if (pouring) link(pour, top.copy(mouth), bot.set(mouth.x, WATER_Y, 0));
      }
      prev = tilt;
    },
    setTier() {},
    dispose() { for (const m of priv) m.dispose(); }
  };
  shadows(g, true, true);
  if (feed) { feed.castShadow = false; pour.castShadow = false; }
  return inst;
}

/* -------------------------------------------------------------- fūrin --- */

const GLASS = { sky: 0x9ccfe6, amber: 0xe3b86a, smoke: 0x9aa0a6 };

export function buildWindChime(ctx, layout, p) {
  const { tier, kitMaterials: km } = ctx;
  const g = new THREE.Group(), parts = {};
  const radial = seg(tier, 24, 14, 8);
  const cordMat = km.plain(0xe7d8ba), bronze = km.bronze({ color: 0x8a6a3a });
  const priv = [];

  // hook ring at the hanging point + cord down to the bell
  const cordGeo = merge([
    new THREE.TorusGeometry(0.02, 0.006, 5, seg(tier, 12, 8, 6)).translate(0, 0.0, 0),
    new THREE.CylinderGeometry(0.007, 0.007, 0.5, 5).translate(0, -0.27, 0)
  ]);
  const cord = mesh(indexed(cordGeo), cordMat, 'cord', false); g.add(cord); parts.cord = cord;

  // the bell: an open glass bowl, rim at -0.59
  const prof = [[0.008, 0], [0.04, -0.012], [0.075, -0.04], [0.092, -0.075], [0.09, -0.095]].map(([x, y]) => new THREE.Vector2(x, y - 0.5));
  const glass = tier === 'far'
    ? new THREE.MeshStandardMaterial({ color: GLASS[p.glass], transparent: true, opacity: 0.55, roughness: 0.15, side: THREE.DoubleSide })
    : new THREE.MeshPhysicalMaterial({ color: GLASS[p.glass], transparent: true, opacity: 0.5, roughness: 0.08, clearcoat: 1, side: THREE.DoubleSide });
  priv.push(glass);
  const bell = mesh(new THREE.LatheGeometry(prof, radial), glass, 'bell'); bell.castShadow = false; g.add(bell); parts.bell = bell;

  // clapper on its own pivot at the bell's crown; its material is the one the game binds
  const clapMat = new THREE.MeshStandardMaterial({ color: 0xd6cdb8, roughness: 0.9 });
  priv.push(clapMat);
  const clapper = mesh(new THREE.CylinderGeometry(0.01, 0.014, 0.1, 6).translate(0, -0.05, 0), clapMat, 'clapper', false);
  clapper.position.set(0, -0.5, 0); clapper.geometry.translate(0, 0, 0); g.add(clapper); parts.clapper = clapper;

  // tanzaku: a paper strip hung from the clapper
  if (tier === 'far') { clapper.material = cordMat; clapMat.dispose(); priv.splice(priv.indexOf(clapMat), 1); return farChime(g, parts, [cord, bell, clapper], priv); }
  const tLen = p.tanzaku;
  const stripGeo = new THREE.PlaneGeometry(0.05, tLen, 1, seg(tier, 8, 4, 1)).translate(0, -tLen / 2, 0);
  const tanzaku = mesh(stripGeo, km.paper({ color: 0xf3e4c8, side: THREE.DoubleSide }), 'tanzaku', false);
  tanzaku.position.set(0, -0.6, 0); g.add(tanzaku); parts.tanzaku = tanzaku;
  const live = [cord, bell, clapper, tanzaku];

  const S = { a: 0, va: 0, s: 0, vs: 0 };
  return {
    group: g, parts, live,
    update(dt, t, env) {
      const wind = env && typeof env.wind === 'number' ? env.wind : 0.2;
      const f = (0.15 + wind) * (0.6 + Math.sin(t * 1.7) * 0.4 + Math.sin(t * 3.9) * 0.3);
      S.va += (f - S.a * 22 - S.va * 2.5) * dt; S.a += S.va * dt;
      S.vs += ((f * 0.7 - S.s * 36 - S.vs * 4) + S.va * 2) * dt; S.s += S.vs * dt;
      clapper.rotation.z = Math.max(-0.5, Math.min(0.5, S.a * 1.4));
      tanzaku.rotation.z = Math.max(-0.9, Math.min(0.9, S.s * 1.3 + S.a * 0.5));
      tanzaku.rotation.x = Math.sin(t * 2.1) * 0.08 * (0.3 + wind);
    },
    setTier() {},
    dispose() { for (const m of priv) m.dispose(); }
  };
}

function farChime(g, parts, live, priv) {
  return { group: g, parts, live, update() {}, setTier() {}, dispose() { for (const m of priv) m.dispose(); } };
}
