// build.js — the Roof Road's meshes, built from level.pieces.
//
// Every surface uses the game's painted procedural sets (src/textures.js):
// kawara, plaster, timber, namako, shoji, cobbles. Each piece is built in its
// own rail frame — local x along the rail (s − sMid), y up, z toward the
// camera (depth d) — then the static meshes are merged one per material, the
// way Countryside._mergeStatics() does it in the valley.
//
// Returns { root, dynamic: {...}, lights: [Vector3], update(t, night) }.

import * as THREE from 'three';
import { hash1 } from './level.js';
import { paintDowntown, installDowntown } from './downtown.js';
import { makeCutaway } from './cutaway.js';
import { makeMaterials } from './pieces/paint.js';
import { UP, box, cyl, slope, frameGroup, ribbon, mergeByMaterial } from './pieces/common.js';
import { ridgeCap, hiraRoof, tsumaRoof } from './pieces/machiya.js';
import { street } from './pieces/street.js';
import { steps } from './pieces/steps.js';
import { bridge } from './pieces/bridge.js';
import { kido } from './pieces/kido.js';
import { house } from './pieces/house.js';
import { kura } from './pieces/kura.js';
import { corner } from './pieces/corner.js';
import { komayose } from './pieces/komayose.js';
import { inuyarai } from './pieces/inuyarai.js';
import { roji } from './pieces/roji.js';
import { tsuboniwa } from './pieces/tsuboniwa.js';
import { deck } from './pieces/deck.js';
import { balcony } from './pieces/balcony.js';
import { post } from './pieces/post.js';
import { water } from './pieces/water.js';
import { canalQuarter } from './pieces/canalQuarter.js';
import { steppingStone } from './pieces/steppingStone.js';
import { canalLanding } from './pieces/canalLanding.js';
import { canalBridge } from './pieces/canalBridge.js';
import { toro } from './pieces/toro.js';
import { cherry } from './pieces/cherry.js';
import { boat } from './pieces/boat.js';
import { canopy } from './pieces/canopy.js';
import { vent } from './pieces/vent.js';
import { shopfronts } from './pieces/shopfronts.js';
import { marketCrossing } from './pieces/marketCrossing.js';
import { rope } from './pieces/rope.js';
import { cistern } from './pieces/cistern.js';
import { chimney } from './pieces/chimney.js';
import { futonRack } from './pieces/futonRack.js';

/* ------------------------------------------------------------------ */
/*  Piece builders                                                      */
/* ------------------------------------------------------------------ */

const B = {};
Object.assign(B, { street, steps, bridge, kido, house, kura, corner, komayose, inuyarai, roji, tsuboniwa, deck, balcony, post });
Object.assign(B, { water, canalQuarter, steppingStone, canalLanding, canalBridge, toro, cherry, boat, canopy, vent, shopfronts, marketCrossing, rope, cistern, chimney, futonRack });

B.yatai = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0;
  const g = frameGroup(ctx.rail, sm);
  const awning = M.cloth[Math.floor(pc.look * M.cloth.length) % M.cloth.length];

  // A compact festival stall: timber counter, climbable striped awning,
  // noren, trays and one warm chōchin. Each fare has its own silhouette.
  g.add(box(w, 0.08, 1.55, awning, 0, pc.y - 0.04, pc.d));
  for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) {
    g.add(box(0.09, pc.y - 0.22, 0.09, M.timber, x, (pc.y - 0.22) / 2, pc.d - 0.58));
  }
  g.add(box(w * 0.9, 0.12, 0.72, M.timberMed, 0, 0.86, pc.d + 0.42));
  g.add(box(w * 0.86, 0.30, 0.04, M.noren[pc.look > 0.66 ? 'crimson' : pc.look > 0.33 ? 'indigo' : 'hemp'], 0, pc.y - 0.18, pc.d + 0.76));
  if (pc.fare === 'yakitori' || pc.fare === 'dango') {
    for (let x = -w * 0.32; x <= w * 0.32; x += 0.25) {
      const skewer = cyl(0.018, 0.78, M.bamboo, 'y', 5); skewer.position.set(x, 1.18, pc.d + 0.62); g.add(skewer);
      for (let y = 1.0; y < 1.32; y += 0.14) {
        const bite = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), M.goods[pc.fare === 'dango' ? 3 : 0]);
        bite.position.set(x, y, pc.d + 0.62); g.add(bite);
      }
    }
  } else if (pc.fare === 'festival masks') {
    for (let x = -w * 0.3, i = 0; x <= w * 0.3; x += 0.3, i++) {
      const mask = new THREE.Mesh(new THREE.CircleGeometry(0.105, 10), M.goods[(i + 1) % M.goods.length]);
      mask.position.set(x, 1.48, pc.d + 0.82); g.add(mask);
    }
  } else {
    for (let x = -w * 0.3, i = 0; x <= w * 0.3; x += 0.3, i++) {
      const bottle = cyl(0.045, 0.25, M.goods[(i + 4) % M.goods.length], 'y', 7);
      bottle.position.set(x, 1.05, pc.d + 0.58); g.add(bottle);
    }
  }
  const lantern = cyl(0.12, 0.34, pc.look > 0.5 ? M.lanternRed : M.lanternWhite, 'y', 10);
  lantern.position.set(w * 0.36, pc.y - 0.32, pc.d + 0.68); g.add(lantern);
  ctx.add(g);
  ctx.light(ctx.rail, sm + w * 0.28, pc.y - 0.3, pc.d + 0.7);
};

B.rack = (pc, ctx) => {
  const { M, rail } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(rail, sm);
  for (const t of pc.tiers) {
    const x0 = t.s0 - sm, x1 = t.s1 - sm;
    g.add(box(x1 - x0, 0.06, 0.12, M.timber, (x0 + x1) / 2, t.y - 0.03, pc.d));
    for (const x of [x0 + 0.04, x1 - 0.04]) g.add(box(0.07, t.y, 0.07, M.timber, x, t.y / 2, pc.d));
    for (let x = x0 + 0.18; x < x1 - 0.1; x += 0.3) {
      const l = cyl(0.11, 0.3, M.lanternWhite, 'y', 10);
      l.position.set(x, t.y - 0.28, pc.d + 0.02);
      g.add(l);
    }
  }
  ctx.add(g);
  ctx.light(rail, sm, 1.6, pc.d + 0.3);
};

B.float = (pc, ctx) => {
  const { M, rail } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(rail, sm);
  const z = pc.d;

  // Four person-height spoked wheels, with iron tyres, lacquer hubs and
  // through-axles. The open spokes read far more clearly than solid discs as
  // the camera pulls out for the vertical climb.
  for (const x of [-2.1, 2.1]) for (const dz of [-1.25, 1.25]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.13, 7, 24), M.timberMed);
    rim.position.set(x, 0.95, z + dz);
    g.add(rim);
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.955, 0.032, 5, 28), M.steel);
    tyre.position.copy(rim.position);
    g.add(tyre);
    const hub = cyl(0.17, 0.34, M.lacquer, 'z', 10);
    hub.position.copy(rim.position);
    g.add(hub);
    for (let i = 0; i < 8; i++) {
      const spoke = box(1.43, 0.055, 0.065, M.timber, x, 0.95, z + dz);
      spoke.rotation.z = (i * Math.PI) / 8;
      g.add(spoke);
    }
  }
  for (const x of [-2.1, 2.1]) {
    const axle = cyl(0.105, 2.85, M.steel, 'z', 10);
    axle.position.set(x, 0.95, z);
    g.add(axle);
  }

  // Massive undercarriage, visible cross-bracing and the textile-draped
  // lower body. Three separate front panels catch the breeze independently.
  g.add(box(5.8, 0.45, 2.2, M.timber, 0, 1.55, z));
  for (const x of [-2.35, 0, 2.35]) g.add(box(0.18, 1.25, 2.32, M.timberMed, x, 2.05, z));
  g.add(box(5.0, 1.48, 2.34, M.dark, 0, 2.55, z));
  for (let i = 0; i < 3; i++) {
    const x = -1.67 + i * 1.67;
    g.add(box(1.52, 1.42, 0.035, M.brocade[i % 2], x, 2.55, z + 1.19));
  }
  for (const sx of [-1, 1]) g.add(box(0.035, 1.4, 2.12, M.brocade[sx > 0 ? 1 : 0], sx * 2.52, 2.55, z));
  g.add(box(5.2, 0.08, 0.08, M.gold, 0, 3.25, z + 1.23));
  g.add(box(5.2, 0.08, 0.08, M.gold, 0, 1.84, z + 1.23));

  // Lacquer deck, carved brackets and a balustrade at cat height.
  g.add(box(6.0, 0.14, 3.0, M.lacquer, 0, pc.deckY - 0.07, z + 0.2));
  for (const zz of [z - 1.3, z + 1.7]) g.add(box(6.0, 0.06, 0.06, M.gold, 0, pc.deckY + 0.6, zz));
  for (const x of [-2.9, -1.4, 0, 1.4, 2.9]) g.add(box(0.07, 0.6, 0.07, M.lacquer, x, pc.deckY + 0.3, z + 1.7));
  for (const x of [-2.45, -1.65, -0.85, 0, 0.85, 1.65, 2.45]) {
    const bracket = box(0.34, 0.16, 0.28, M.gold, x, pc.deckY - 0.28, z + 1.32);
    bracket.rotation.z = (Math.abs(x) % 1.5 - 0.5) * 0.08;
    g.add(bracket);
  }

  // Pillars to the roof, the lower eave tier and the raised roof.
  for (const x of [-2.4, 2.4]) for (const dz of [-1.0, 1.0]) g.add(box(0.14, pc.eaveY - pc.deckY, 0.14, M.lacquer, x, (pc.eaveY + pc.deckY) / 2, z + dz));
  for (const x of [-2.35, -1.15, 0, 1.15, 2.35]) g.add(box(0.09, pc.eaveY - pc.deckY - 0.2, 0.09, M.timberMed, x, (pc.eaveY + pc.deckY) / 2, z + 1.28));
  g.add(box(5.95, 0.16, 3.0, M.timber, 0, pc.eaveY - 0.11, z));
  g.add(box(5.95, 0.08, 0.1, M.gold, 0, pc.eaveY - 0.01, z + 1.53));
  // A real gabled roof turns the final route from eave to ridge in silhouette.
  slope(g, M.roof, { x: -3.0, y: pc.eaveY, z }, pc.ridgeY - pc.eaveY - 0.18, 3.0, 2.8, -Math.PI / 2, 0.15);
  slope(g, M.roof, { x: 3.0, y: pc.eaveY, z }, pc.ridgeY - pc.eaveY - 0.18, 3.0, 2.8, Math.PI / 2, 0.15);
  ridgeCap(g, M, z - 1.42, z + 1.42, pc.ridgeY - 0.28, 0, true);

  // Lantern frame on the float (komagata), left side.
  for (const y of [pc.deckY + 0.5, pc.deckY + 0.85]) {
    for (let x = -2.6; x < -1.3; x += 0.28) {
      const l = cyl(0.1, 0.28, M.lanternWhite, 'y', 10);
      l.position.set(x, y, z + 1.4);
      g.add(l);
    }
  }
  g.add(box(1.5, 0.06, 0.12, M.timber, -1.95, 4.7 - 0.03, z));

  // The shingi pole stands just behind the climb; a crossbar of sakaki and a
  // small perch bracket stick out from it toward the street. A crescent tops it.
  const zp = z - 0.75, zc = z - 0.2;
  const pole = cyl(0.11, 10.5, M.timber, 'y', 8);
  pole.position.set(0, pc.ridgeY + 5.25, zp);
  g.add(pole);
  const bar = cyl(0.06, 1.3, M.timber, 'x', 6);
  bar.position.set(0, pc.barY - 0.06, zc);
  g.add(bar);
  g.add(box(0.08, 0.08, zc - zp, M.timber, 0, pc.barY - 0.06, (zc + zp) / 2));
  for (const sx of [-1, 1]) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 1), M.pine);
    leaf.position.set(sx * 0.58, pc.barY + 0.02, zc - 0.1);
    g.add(leaf);
  }
  const disc = cyl(0.34, 0.06, M.lacquer, 'y', 14);
  disc.position.set(0, pc.perchY - 0.03, zc);
  g.add(disc);
  g.add(box(0.08, 0.08, zc - zp, M.timber, 0, pc.perchY - 0.08, (zc + zp) / 2));
  const moon = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.07, 6, 18, Math.PI * 1.2), M.gold);
  moon.position.set(0, pc.ridgeY + 10.6, zp);
  moon.rotation.z = 0.9;
  g.add(moon);

  // Shimenawa-like lashings and four guy ropes make the mast feel physically
  // tied into the roof instead of floating above it.
  for (let y = pc.ridgeY + 0.25; y < pc.ridgeY + 0.72; y += 0.12) {
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.024, 5, 12), M.hemp);
    wrap.rotation.x = Math.PI / 2;
    wrap.position.set(0, y, zp);
    g.add(wrap);
  }
  const ropeBetween = (a, b) => {
    const dir = b.clone().sub(a);
    const rope = cyl(0.018, dir.length(), M.hemp, 'y', 5);
    rope.position.copy(a).add(b).multiplyScalar(0.5);
    rope.quaternion.setFromUnitVectors(UP, dir.normalize());
    g.add(rope);
  };
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    ropeBetween(
      new THREE.Vector3(sx * 2.55, pc.eaveY - 0.08, z + sz * 1.1),
      new THREE.Vector3(0, pc.ridgeY + 4.1, zp)
    );
  }

  // Live details stay out of the static merge: tassels and three seated
  // hayashi musicians breathe just enough to keep the parked hoko alive.
  const live = frameGroup(rail, sm);
  const tassels = [];
  for (let i = 0; i < 6; i++) {
    const pivot = new THREE.Group();
    pivot.position.set(-2.55 + i * 1.02, pc.eaveY - 0.03, z + 1.52);
    const cord = cyl(0.014, 0.42, M.hemp, 'y', 5);
    cord.position.y = -0.21;
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 7, 5), M.gold);
    knot.position.y = -0.43;
    const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.34, 8), i % 2 ? M.goods[3] : M.goods[1]);
    tassel.position.y = -0.62;
    pivot.add(cord, knot, tassel);
    pivot.userData.phase = i * 0.83;
    live.add(pivot);
    tassels.push(pivot);
  }

  const musicians = [];
  for (let i = 0; i < 3; i++) {
    const person = new THREE.Group();
    person.position.set(-1.25 + i * 1.25, pc.deckY + 0.04, z - 0.34 + (i % 2) * 0.16);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.43, 8), M.goods[[5, 3, 0][i]]);
    body.position.y = 0.4;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 9, 7), M.plasterWarm);
    head.position.y = 0.72;
    const hachimaki = box(0.23, 0.045, 0.16, M.plaster, 0, 0.75, 0);
    const knees = box(0.46, 0.15, 0.24, M.dark, 0, 0.12, 0);
    person.add(body, head, hachimaki, knees);
    if (i === 1) {
      const drum = cyl(0.18, 0.26, M.timberMed, 'z', 10);
      drum.position.set(0.23, 0.38, 0.12);
      person.add(drum);
    } else {
      const flute = cyl(0.022, 0.58, M.bamboo, 'x', 6);
      flute.position.set(0, 0.55, 0.16);
      flute.rotation.z = i ? -0.08 : 0.08;
      person.add(flute);
    }
    person.userData.phase = i * 1.9;
    person.userData.baseY = person.position.y;
    live.add(person);
    musicians.push(person);
  }

  ctx.add(g);
  ctx.addDyn(live);
  ctx.dynamic.float = { group: live, tassels, musicians };
  ctx.light(rail, sm, pc.deckY + 0.7, z + 1.4);
  ctx.light(rail, sm, 2.4, z + 1.6);
};

B.gate = (pc, ctx) => {
  const { M, rail } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(rail, sm);
  const x0 = pc.s0 - sm, x1 = pc.s1 - sm;
  const zF = pc.dFront, zB = zF - pc.depth, zm = (zF + zB) / 2;
  for (const x of [x0 + 0.3, x0 + 2.2, x1 - 2.2, x1 - 0.3]) for (const z of [zF - 0.3, zB + 0.3]) {
    g.add(box(0.36, pc.foot, 0.36, M.timber, x, pc.foot / 2, z));
  }
  g.add(box(x1 - x0, 0.4, pc.depth, M.timber, 0, pc.foot - 0.2, zm));
  g.add(box(x1 - x0 - 0.4, 0.6, 0.2, M.timber, 0, pc.foot - 1.0, zF - 0.3));
  g.add(box(2.4, 3.2, 0.1, M.timberMed, 0, 1.6, zm));
  tsumaRoof(g, M, x0, x1, zF, zB, pc.foot, pc.ridge, 0.6);
  ctx.add(g);
};

B.tsuiji = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0;
  const g = frameGroup(ctx.rail, sm);
  g.add(box(w, 1.45, 0.7, M.sujibei, 0, 0.72, pc.d));
  slope(g, M.roof, { x: 0, y: 1.42, z: pc.d + 0.6 }, 0.16, 0.5, w + 0.2, 0, 0.08);
  slope(g, M.roof, { x: 0, y: 1.42, z: pc.d - 0.6 }, 0.16, 0.5, w + 0.2, Math.PI, 0.08);
  ctx.add(g);
};

/* ------------------------------------------------------------------ */
/*  Shōki, treats, the distant city                                     */
/* ------------------------------------------------------------------ */

/** A small clay Shōki: robed body, big head, tall hat, a sword held up. */
export function makeShoki(M) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.11, 0.2, 8), M.clay);
  body.position.y = 0.1;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), M.clay);
  head.position.y = 0.25;
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.09, 8), M.clay);
  hat.position.y = 0.33;
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.03), M.clay);
  brim.position.y = 0.36;
  const sword = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.22, 0.012), M.steel);
  sword.position.set(0.09, 0.26, 0.02);
  sword.rotation.z = -0.4;
  g.add(body, head, hat, brim, sword);
  return g;
}

function makeTreat(M) {
  const g = new THREE.Group();
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.03, 14), M.plaster);
  dish.position.y = 0.015;
  const fish = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), M.goods[1]);
  fish.scale.set(1.8, 0.5, 0.6);
  fish.position.y = 0.05;
  g.add(dish, fish);
  return g;
}

/** A sea of low roofs around the route, out to the hills (instanced). */
function buildDistantCity(level, M) {
  const rail = level.rail;
  const houseGeo = new THREE.BoxGeometry(1, 1, 1);
  houseGeo.translate(0, 0.5, 0);
  // Gabled machiya silhouettes, with enough pitch to read as tiled Kyoto
  // roofs at distance instead of almost-flat pyramids on bare cubes.
  const roofGeo = new THREE.BufferGeometry();
  const rp = [], ru = [];
  const quad = (a, b, c, d) => { for (const p of [a,b,c,a,c,d]) { rp.push(...p); ru.push(p[2] * 4, p[0] * 4); } };
  quad([-.57,0,-.6],[-.57,0,.6],[0,.8,.6],[0,.8,-.6]);
  quad([0,.8,-.6],[0,.8,.6],[.57,0,.6],[.57,0,-.6]);
  quad([-.57,0,.6],[.57,0,.6],[0,.8,.6],[0,.8,.6]);
  quad([.57,0,-.6],[-.57,0,-.6],[0,.8,-.6],[0,.8,-.6]);
  roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
  roofGeo.setAttribute('uv', new THREE.Float32BufferAttribute(ru, 2)); roofGeo.computeVertexNormals();
  const pts = [];
  // Distance from the rail polyline (cheap: sample the rail every 2 m).
  const samples = [];
  for (let s = 0; s <= level.length; s += 2) samples.push(rail.pointAt(s));
  const nearRail = (x, z, r) => samples.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < r * r);
  for (let x = (level.bounds?.x0 ?? -230) - 80; x <= (level.bounds?.x1 ?? 200) + 80; x += 7) {
    for (let z = (level.bounds?.z0 ?? -260) - 80; z <= (level.bounds?.z1 ?? 150) + 80; z += 7) {
      const h = hash1(x * 0.37 + z * 1.71);
      const jx = x + (h - 0.5) * 3, jz = z + (hash1(x + z * 3.3) - 0.5) * 3;
      if (nearRail(jx, jz, 14)) continue;
      pts.push([jx, jz, h]);
    }
  }
  // Low dark walls under big roofs: from the run it should read as a sea of
  // kawara, not a field of white boxes.
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x7a6a58, roughness: 0.95 });
  const walls = new THREE.InstancedMesh(houseGeo, wallMat, pts.length);
  const roofs = new THREE.InstancedMesh(roofGeo, M.roof, pts.length);
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  pts.forEach(([x, z, h], i) => {
    const w = 4.5 + h * 3, d = 5 + hash1(h * 91) * 4, hh = 1.7 + (h > 0.86 ? 1.5 : 0) + hash1(h * 7) * 0.7;
    dummy.position.set(x, 0, z);
    dummy.rotation.y = h > .5 ? 0 : Math.PI / 2;
    dummy.scale.set(w, hh, d);
    dummy.updateMatrix();
    walls.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, hh, z);
    dummy.scale.set(w * 1.05, 1.3 + h * 0.6, d * 1.05);
    dummy.updateMatrix();
    roofs.setMatrixAt(i, dummy.matrix);
    const k = hash1(h * 53.1);
    roofs.setColorAt(i, tint.setRGB(0.62 + k * 0.25, 0.64 + k * 0.25, 0.68 + k * 0.25));
    walls.setColorAt(i, tint.setRGB(0.85 + k * 0.3, 0.8 + k * 0.3, 0.74 + k * 0.3));
  });
  walls.receiveShadow = true;
  roofs.receiveShadow = true;
  const g = new THREE.Group();
  g.add(walls, roofs);
  return g;
}

/** A five-storey pagoda silhouette (for the skyline). */
function buildPagoda(M, x, z, scale = 1) {
  const g = new THREE.Group();
  let y = 0;
  for (let i = 0; i < 5; i++) {
    const w = (6.2 - i * 0.7) * scale;
    g.add(box(w * 0.62, 3.2 * scale, w * 0.62, M.timber, 0, y + 1.6 * scale, 0));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.85, 1.1 * scale, 4), M.roof);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = y + 3.4 * scale;
    g.add(roof);
    y += 3.6 * scale;
  }
  const spire = cyl(0.25 * scale, 9 * scale, M.bronze, 'y', 6);
  spire.position.y = y + 4.2 * scale;
  g.add(spire);
  g.position.set(x, 0, z);
  return g;
}

/* ------------------------------------------------------------------ */
/*  Assembly                                                            */
/* ------------------------------------------------------------------ */

const downtown = installDowntown(B, { box, cyl, frameGroup, hiraRoof, ribbon, hash1, mergeParts: mergeByMaterial });

export function buildWorld(level, opts = {}) {
  const M = makeMaterials();
  paintDowntown(M);
  const setView = makeCutaway(M);
  const rail = level.rail;
  const motionScale = opts.reduceMotion ? 0.22 : 1;
  const staticGroup = new THREE.Group();
  const glassGroup = new THREE.Group();
  const root = new THREE.Group();
  const lights = [];
  const dynamic = { boat: null, boats: [], people: [], float: null, shoki: [], treats: [] };
  const ctx = {
    M, rail, dynamic, platforms: level.platforms, alleys: level.alleys,
    add: (o) => staticGroup.add(o),
    addGlass: (m) => { m.userData.glass = true; glassGroup.add(m); },
    addDyn: (o) => root.add(o),
    light: (r, s, y, d) => { const p = r.place(s, d); lights.push(new THREE.Vector3(p.x, y, p.z)); }
  };
  for (const pc of level.pieces) {
    const fn = B[pc.type];
    if (!fn) throw new Error('No Roof Road renderer for ' + pc.type);
    fn(pc, ctx);
    if (pc.type === 'house') downtown.decorateHouse(pc, ctx);
    if (pc.type === 'yatai') downtown.decorateStall(pc, ctx);
  }
  // Glass meshes were added inside frame groups: pull them out with their
  // world transforms so they merge into the transparent bucket.
  staticGroup.updateMatrixWorld(true);
  const glassFromFrames = [];
  staticGroup.traverse((o) => { if (o.isMesh && o.material === M.glass) glassFromFrames.push(o); });
  for (const m of glassFromFrames) {
    m.updateMatrixWorld(true);
    const c = new THREE.Mesh(m.geometry.clone().applyMatrix4(m.matrixWorld), m.material);
    glassGroup.add(c);
    m.parent.remove(m);
  }
  const fixedBatches = mergeByMaterial(staticGroup), glassBatches = mergeByMaterial(glassGroup, false);
  root.add(fixedBatches, glassBatches);

  // Only world-space scenery belongs to this distance culler. Boat and worker
  // batches are baked in their own local frames and move with their parents.
  const batches = [];
  for(const group of [fixedBatches,glassBatches]) group.traverse(o => { if (o.userData.spatialBatch) batches.push(o); });

  // Ground under everything, the distant roofscape and a pagoda on each side.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), M.ground);
  const groundUV=ground.geometry.attributes.uv, groundPosition=ground.geometry.attributes.position;
  for(let i=0;i<groundUV.count;i++)groundUV.setXY(i,groundPosition.getX(i)*.25,groundPosition.getY(i)*.25);
  M.ground.map=M.gravel.map;
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.7;
  ground.receiveShadow = true;
  root.add(ground);
  root.add(buildDistantCity(level, M));
  root.add(buildPagoda(M, 150, -78, 1.35));     // east, behind the float streets
  root.add(buildPagoda(M, -40, 150, 1.6));      // south, over the market roofs
  root.add(buildPagoda(M, -170, -30, 1.1));     // west

  // Shōki and treats stay live so they can be greeted.
  for (const k of level.pickups) {
    const p = rail.place(k.s, k.d);
    const t = rail.tangentAt(k.s);
    const obj = k.kind === 'shoki' ? makeShoki(M) : makeTreat(M);
    obj.position.set(p.x, k.y, p.z);
    obj.rotation.y = Math.atan2(-t.z, t.x) + (k.face || 0);   // face the camera, then turn away
    obj.scale.setScalar(k.kind === 'shoki' ? 1.6 : 1.4);
    obj.userData.pickup = k;
    root.add(obj);
    (k.kind === 'shoki' ? dynamic.shoki : dynamic.treats).push(obj);
  }

  return {
    root, dynamic, lights, M, setView,
    /** Advance moving pieces; night ∈ [0,1] kindles lanterns and windows. */
    update(t, night, platOffset, platforms, playerS = 0) {
      downtown.updatePeople(dynamic.people, t, playerS, opts.lowPower, opts.reduceMotion);
      const player = rail.pointAt(playerS);
      for (const batch of batches) {
        const b = batch.geometry.boundingSphere;
        const range = (opts.lowPower ? 48 : 82) + b.radius;
        batch.visible = (b.center.x - player.x) ** 2 + (b.center.z - player.z) ** 2 < range * range;
      }
      for (const boat of dynamic.boats) {
        const p = platforms[boat.plat];
        boat.group.visible=Math.abs((p.s0+p.s1)/2+platOffset(p,t)-playerS)<(opts.lowPower?42:70);
        const off = platOffset(p, t);
        const s = (p.s0 + p.s1) / 2 + off;
        const pos = rail.place(s, boat.d);
        const tg = rail.tangentAt(s);
        const dt = boat.lastT == null ? 1 / 60 : Math.max(1 / 240, t - boat.lastT);
        const velocity = boat.lastS == null ? 0 : (s - boat.lastS) / dt;
        if (Math.abs(velocity) > 0.035) boat.dir = Math.sign(velocity);
        const pace = Math.min(1, Math.abs(velocity) / 3.2);
        boat.group.position.set(pos.x, 0.005 + Math.sin(t * 1.35) * (0.012 + pace * 0.012), pos.z);
        boat.group.rotation.set(Math.sin(t * 0.9) * 0.012 * pace, Math.atan2(-tg.z, tg.x), Math.sin(t * 1.17) * 0.008 * pace);
        boat.wake.scale.x = boat.dir;
        boat.wake.visible = pace > 0.035;
        M.wake.opacity = 0.08 + pace * 0.34;
        boat.boatman.rotation.y = boat.dir < 0 ? Math.PI : 0;
        boat.pole.rotation.z = -0.48 + boat.dir * 0.14 + Math.sin(t * 1.5) * 0.12 * pace;
        boat.boatman.rotation.z = Math.sin(t * 1.5 + 0.7) * 0.035 * pace;
        boat.lastS = s;
        boat.lastT = t;
      }
      if (dynamic.float) {
        const hoko = dynamic.float;
        hoko.group.visible = Math.abs(playerS - level.mouths[6].s0) < 65;
        for (const tassel of hoko.tassels) {
          const u = t * motionScale + tassel.userData.phase;
          tassel.rotation.z = Math.sin(u * 1.35) * 0.055 * motionScale;
          tassel.rotation.x = Math.cos(u * 0.93) * 0.035 * motionScale;
        }
        for (const person of hoko.musicians) {
          const u = t * motionScale + person.userData.phase;
          person.rotation.z = Math.sin(u * 1.7) * 0.018 * motionScale;
          person.position.y = person.userData.baseY + Math.sin(u * 1.7) * 0.008 * motionScale;
        }
      }
      for (const water of [M.water, M.kamoWater]) {
        water.uniforms.uTime.value = t;
        water.uniforms.uNight.value = night;
      }
      for (const mat of [...M.cloth, ...Object.values(M.noren), ...M.brocade]) {
        if (mat.userData.windShader) mat.userData.windShader.uniforms.uRoofTime.value = t;
      }
      M.lanternRed.emissiveIntensity = 0.15 + night * 1.6;
      M.lanternWhite.emissiveIntensity = 0.15 + night * 1.5;
      M.shoji.emissiveIntensity = night * 0.9;
      M.koshi.emissiveIntensity = night * 0.5;
      for (const mat of [M.blossom, M.blossomPale, M.blossomRose]) mat.emissiveIntensity = night * 0.25;
      for (const s of dynamic.shoki) if (s.visible) s.children[0].rotation.y = Math.sin(t * 0.7 + s.position.x) * 0.06;
    }
  };
}
