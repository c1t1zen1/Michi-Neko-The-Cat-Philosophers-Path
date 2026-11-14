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

/** Open, shallow hull for a historical Takase cargo boat. */
function boatHullGeometry(len = 4.8, width = 1.55, depth = 0.48) {
  const xs = [-len / 2, -len * 0.34, len * 0.34, len / 2];
  const ws = [width * 0.18, width * 0.5, width * 0.5, width * 0.18];
  const bs = [-depth * 0.42, -depth, -depth, -depth * 0.42];
  const pos = [], uv = [];
  const q = (a, b, c, d) => {
    for (const p of [a, b, c, a, c, d]) { pos.push(...p); uv.push(p[0] / len + 0.5, p[2] / width + 0.5); }
  };
  for (let i = 0; i < xs.length - 1; i++) {
    const aL = [xs[i], 0, -ws[i]], aR = [xs[i], 0, ws[i]];
    const bL = [xs[i + 1], 0, -ws[i + 1]], bR = [xs[i + 1], 0, ws[i + 1]];
    const abL = [xs[i], bs[i], -ws[i] * 0.62], abR = [xs[i], bs[i], ws[i] * 0.62];
    const bbL = [xs[i + 1], bs[i + 1], -ws[i + 1] * 0.62], bbR = [xs[i + 1], bs[i + 1], ws[i + 1] * 0.62];
    q(aL, bL, bbL, abL);                 // port side
    q(bR, aR, abR, bbR);                 // starboard side
    q(abL, bbL, bbR, abR);               // shallow bottom
  }
  q([xs[0], 0, ws[0]], [xs[0], 0, -ws[0]], [xs[0], bs[0], -ws[0] * 0.62], [xs[0], bs[0], ws[0] * 0.62]);
  q([xs[3], 0, -ws[3]], [xs[3], 0, ws[3]], [xs[3], bs[3], ws[3] * 0.62], [xs[3], bs[3], -ws[3] * 0.62]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}

/* ------------------------------------------------------------------ */
/*  Piece builders                                                      */
/* ------------------------------------------------------------------ */

const B = {};
Object.assign(B, { street, steps, bridge, kido, house, kura, corner, komayose, inuyarai, roji, tsuboniwa, deck, balcony, post });

B.water = (pc, ctx) => {
  const { M, rail } = ctx;
  const waterY = pc.y + 0.18;
  ctx.add(ribbon(rail, pc.s0, pc.s1, pc.d - 1.55, pc.d + 1.65, pc.y - 0.04, M.sand, 0.5));
  ctx.addGlass(ribbon(rail, pc.s0, pc.s1, pc.d - 1.53, pc.d + 1.63, waterY, M.water, 0.24));
  // Soft current lines collect against the dressed-stone banks.
  ctx.addGlass(ribbon(rail, pc.s0 + 0.2, pc.s1 - 0.2, pc.d - 1.48, pc.d - 1.34, waterY + 0.018, M.foam, 0.7));
  ctx.addGlass(ribbon(rail, pc.s0 + 0.2, pc.s1 - 0.2, pc.d + 1.43, pc.d + 1.57, waterY + 0.018, M.foam, 0.7));
  // Kiyamachi's towpath remains the safe ground-level route beside the flow.
  // Keep it lane-narrow: an over-wide foreground apron hid the canal and its
  // stepping-stone maze whenever the cat dropped to water level.
  ctx.add(ribbon(rail, pc.s0, pc.s1, pc.d + 1.82, pc.d + 4.35, 0.0, M.cobble, 1));
};

/** The canal's architectural shell: wet banks, towpath, drains and greenery. */
B.canalQuarter = (pc, ctx) => {
  const { M, rail } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const len = pc.s1 - pc.s0;
  const g = frameGroup(rail, sm);
  const zFar = pc.d - 1.68, zNear = pc.d + 1.78;

  // Retaining walls sit in the water, darker below the waterline. Individual
  // cap blocks break the long strip into hand-laid masonry at cat-eye height.
  for (const z of [zFar, zNear]) {
    g.add(box(len, 0.72, 0.38, M.wetStone, 0, -0.12, z));
    for (let x = -len / 2 + 0.55, i = 0; x < len / 2 - 0.2; x += 1.08, i++) {
      const cap = box(0.98, 0.16, 0.52, i % 3 === 0 ? M.slab : M.stone, x, 0.28 + (i % 2) * 0.018, z);
      cap.rotation.y = (i % 3 - 1) * 0.012;
      g.add(cap);
    }
  }

  // A near-bank stone walk connects the canal to the town around it.
  // Its weathered edge replaces the empty ground beyond the water ribbon.
  g.add(box(len, 0.16, 5.0, M.slab, 0, 0.0, zNear + 2.55));

  // A narrow far-bank towpath and its timber edge. It gives the canal depth
  // behind the cat, especially where the route jumps onto the far boughs.
  g.add(box(len, 0.16, 1.35, M.slab, 0, 0.08, zFar - 0.72));
  g.add(box(len, 0.13, 0.12, M.timber, 0, 0.26, zFar + 0.23));

  // Mooring stakes and the thick hand-haul rope used by the takasebune.
  for (const u of [-0.41, -0.18, 0.13, 0.39]) {
    const x = u * len;
    const post = cyl(0.075, 1.05, M.timberMed, 'y', 8);
    post.position.set(x, 0.55, zNear - 0.18);
    g.add(post);
    for(let j=0;j<3;j++){const wrap=new THREE.Mesh(new THREE.TorusGeometry(.085,.012,5,10),M.twine);wrap.rotation.x=Math.PI/2;wrap.position.set(x,.66+j*.028,zNear-.18);g.add(wrap);}
    const cap=box(.17,.035,.17,M.agedWood,x,1.09,zNear-.18);cap.rotation.z=.025;g.add(cap);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 5, 10), M.steel);
    ring.position.set(x, 0.77, zNear - 0.36);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
  }

  // A round storm drain, stone lip and trickle on the far wall.
  const drainX = -len * 0.22;
  const drain = new THREE.Mesh(new THREE.CircleGeometry(0.28, 16), M.dark);
  drain.position.set(drainX, -0.04, zFar + 0.205);
  g.add(drain);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.055, 6, 16), M.wetStone);
  rim.position.copy(drain.position);
  g.add(rim);
  const trickle = box(0.13, 0.03, 0.7, M.water, drainX, -0.18, zFar + 0.55);
  trickle.rotation.x = Math.PI / 2;
  g.add(trickle);

  // Kiyamachi details: rain chains, potted nandina and two low paper lamps.
  for (const u of [-0.34, 0.27]) {
    const x = u * len;
    const chain = cyl(0.018, 2.1, M.bronze, 'y', 6);
    chain.position.set(x, 1.15, zFar - 1.37);
    g.add(chain);
    for (let j = 0; j < 4; j++) {
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12 + j * 0.015, 1), j % 2 ? M.pine : M.foliage);
      leaf.position.set(x + (j - 1.5) * 0.12, 0.48 + j * 0.12, zFar - 1.0 + (j % 2) * 0.1);
      g.add(leaf);
    }
    g.add(cyl(0.18, 0.34, M.clay, 'y', 10));
    g.children[g.children.length - 1].position.set(x, 0.17, zFar - 1.0);
  }
  ctx.add(g);
  ctx.light(rail, pc.s0 + len * 0.28, 1.2, zFar - 0.8);
  ctx.light(rail, pc.s0 + len * 0.72, 1.2, zFar - 0.8);
};

B.steppingStone = (pc, ctx) => {
  const g = frameGroup(ctx.rail, (pc.s0 + pc.s1) / 2);
  const w = pc.s1 - pc.s0;
  const geo = new THREE.DodecahedronGeometry(0.55, 0);
  const stone = new THREE.Mesh(geo, ctx.M.wetStone);
  stone.scale.set(w, 0.24 + pc.look * 0.08, 0.78 + pc.look * 0.28);
  stone.rotation.set(0.04 * (pc.look - 0.5), pc.look * 0.7, 0.035 * (pc.look - 0.5));
  stone.position.set(0, pc.y - 0.17, pc.d);
  g.add(stone);
  // A thin moss cap keeps each stone readable against the moving water.
  const moss = new THREE.Mesh(new THREE.CircleGeometry(0.34 + pc.look * 0.12, 9), ctx.M.pine);
  moss.rotation.x = -Math.PI / 2;
  moss.scale.x = 1.25;
  moss.position.set(0.08, pc.y + 0.015, pc.d - 0.04);
  g.add(moss);
  ctx.add(g);
};

B.canalLanding = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(ctx.rail, sm);
  const w = pc.s1 - pc.s0;
  g.add(box(w, 0.14, 1.25, M.timberMed, 0, pc.y - 0.07, pc.d));
  for (let i = 0; i < 3; i++) {
    const h = pc.y * (i + 1) / 3;
    const step = box(w * 0.62, 0.12, 0.36, M.wetStone, (i - 1) * w * 0.14, h - 0.06, pc.d + (pc.side === 'near' ? 0.75 + i * 0.28 : -0.75 - i * 0.28));
    g.add(step);
  }
  for (const x of [-w / 2 + 0.12, w / 2 - 0.12]) {
    const post = box(0.08, pc.y + 0.48, 0.08, M.timber, x, (pc.y + 0.48) / 2, pc.d + 0.52);
    g.add(post);
  }
  ctx.add(g);
};

B.canalBridge = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(ctx.rail, sm);
  const w = pc.s1 - pc.s0;
  // A tiny sori bridge: three gently stepped planks span bank to bank. The
  // collision top stays flat and forgiving while the silhouette reads arched.
  for (let i = -3; i <= 3; i++) {
    const z = pc.d + i * 0.62;
    const y = pc.y - 0.12 + 0.18 * (1 - Math.abs(i) / 3);
    g.add(box(w, 0.15, 0.66, M.timberMed, 0, y, z));
  }
  for (const side of [-1, 1]) {
    const z = pc.d + side * 2.0;
    g.add(box(w, 0.08, 0.08, M.lacquer, 0, pc.y + 0.65, z));
    for (let x = -w / 2 + 0.12; x <= w / 2 - 0.08; x += 0.48) {
      g.add(box(0.06, 0.7, 0.06, M.lacquer, x, pc.y + 0.3, z));
    }
  }
  const plaque = box(0.9, 0.35, 0.05, M.noren.indigo, 0, pc.y + 0.9, pc.d + 2.04);
  g.add(plaque);
  ctx.add(g);
};

B.toro = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(ctx.rail, sm);
  g.add(box(0.5, 0.15, 0.5, M.stone, 0, 0.08, pc.d));
  const post = cyl(0.11, 0.7, M.stone, 'y', 8); post.position.set(0, 0.5, pc.d); g.add(post);
  g.add(box(0.42, 0.12, 0.42, M.stone, 0, 0.9, pc.d));
  g.add(box(0.3, 0.25, 0.3, M.lanternWhite, 0, 1.08, pc.d));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.25, 4), M.stone);
  roof.rotation.y = Math.PI / 4; roof.position.set(0, 1.33, pc.d);
  g.add(roof);
  ctx.add(g);
  ctx.light(ctx.rail, sm, 1.1, pc.d);
};

B.rope = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0;
  const g = frameGroup(ctx.rail, sm);
  if (pc.style === 'laundry') {
    const pole = cyl(0.045, w + 0.4, M.bamboo, 'x', 8);
    pole.position.set(0, pc.y - 0.04, pc.d);
    g.add(pole);
    for (let x = -w / 2 + 0.45, i = 0; x < w / 2 - 0.3; x += 0.8, i++) {
      const fabric=M.cloth[(i*2+Math.floor(sm))%M.cloth.length];
      g.add(box(.46,.75,.018,fabric,x,pc.y-.48,pc.d+.02));
      if(i%2===0) for(const side of [-1,1]) g.add(box(.23,.28,.018,fabric,x+side*.3,pc.y-.24,pc.d+.02));
      for(const side of [-1,1]) g.add(box(.025,.09,.04,M.agedWood,x+side*.17,pc.y-.07,pc.d+.04));
    }
  } else if (pc.style === 'tow') {
    // The Takase boats were hauled by hand. A weathered hemp line crosses
    // between two mooring posts and doubles as the upper route's balance beam.
    const line = cyl(0.045, w + 0.36, M.hemp, 'x', 8);
    line.position.set(0, pc.y - 0.045, pc.d);
    line.rotation.x = 0.025;
    g.add(line);
    for (const x of [-w / 2 - 0.08, w / 2 + 0.08]) {
      const post = cyl(0.075, 1.0, M.timberMed, 'y', 8);
      post.position.set(x, pc.y - 0.52, pc.d);
      g.add(post);
      const knot = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 5, 9), M.hemp);
      knot.position.set(x, pc.y - 0.06, pc.d);
      knot.rotation.y = Math.PI / 2;
      g.add(knot);
    }
  } else {
    const line = cyl(0.02, w + 0.3, M.dark, 'x', 5);
    line.position.set(0, pc.y - 0.03, pc.d);
    g.add(line);
    for (let x = -w / 2 + 0.3, i = 0; x < w / 2 - 0.2; x += 0.55, i++) {
      const l = cyl(0.11, 0.26, i % 3 === 1 ? M.lanternWhite : M.lanternRed, 'y', 10);
      l.position.set(x, pc.y - 0.28, pc.d);
      g.add(l);
    }
    ctx.light(ctx.rail, sm, pc.y - 0.3, pc.d);
  }
  ctx.add(g);
};

B.marketCrossing = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0;
  const g = frameGroup(ctx.rail, sm);

  // A narrow bridge slung below the missing canopy bay. The long crossbeams
  // and suspension ropes make the depth change legible from a side camera.
  g.add(box(w, 0.11, 1.2, M.timberMed, 0, pc.y - 0.055, pc.d));
  for (let x = -w / 2 + 0.18; x <= w / 2 - 0.12; x += 0.34) {
    g.add(box(0.07, 0.08, 1.34, M.timber, x, pc.y - 0.12, pc.d));
  }
  for (const x of [-w / 2 + 0.08, w / 2 - 0.08]) {
    for (const z of [pc.d - 0.52, pc.d + 0.52]) {
      const rope = cyl(0.018, 1.12, M.hemp, 'y', 5);
      rope.position.set(x, pc.y + 0.55, z);
      g.add(rope);
    }
  }
  const toward = pc.side === 'near' ? 1 : -1;
  const crossZ = pc.d - toward * 1.65;
  g.add(box(0.13, 0.1, 4.3, M.steel, 0, pc.y + 1.05, crossZ));
  for (const z of [-1, 0, 1]) {
    const pennant = box(0.42, 0.52, 0.018, M.goods[(z + 3) % M.goods.length], 0,
      pc.y + 0.72, crossZ + z * 0.82);
    pennant.rotation.y = 0.04 * z;
    g.add(pennant);
  }
  const lamp = cyl(0.13, 0.34, M.lanternWhite, 'y', 10);
  lamp.position.set(0, pc.y + 0.42, pc.d + toward * 0.8);
  g.add(lamp);
  ctx.add(g);
  ctx.light(ctx.rail, sm, pc.y + 0.42, pc.d + toward * 0.8);
};

B.cistern = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0;
  const g = frameGroup(ctx.rail, sm);
  const tankH = 1.28, radius = Math.min(0.96, w * 0.43);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.94, radius, tankH, 16), M.timberMed);
  tank.position.set(0, pc.y - tankH / 2 - 0.06, pc.d);
  g.add(tank);
  for (const y of [pc.y - 0.25, pc.y - 0.66, pc.y - 1.06]) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.015, 0.025, 5, 18), M.steel);
    hoop.rotation.x = Math.PI / 2; hoop.position.set(0, y, pc.d); g.add(hoop);
  }
  const lid = cyl(radius * 0.96, 0.1, M.timber, 'y', 16);
  lid.position.set(0, pc.y - 0.05, pc.d); g.add(lid);
  const cap = cyl(0.16, 0.09, M.bronze, 'y', 10);
  cap.position.set(0, pc.y + 0.045, pc.d); g.add(cap);
  // Cross-braced stand and a tiny ladder explain the high cat route.
  for (const x of [-radius * 0.62, radius * 0.62]) {
    g.add(box(0.11, 1.0, 0.11, M.timber, x, pc.y - 1.78, pc.d));
  }
  for (let y = pc.y - 1.95; y < pc.y - 0.78; y += 0.24) {
    g.add(box(0.62, 0.04, 0.05, M.bamboo, radius + 0.16, y, pc.d + 0.74));
  }
  for (const x of [radius - 0.13, radius + 0.45]) {
    g.add(box(0.045, 1.35, 0.045, M.bamboo, x, pc.y - 1.36, pc.d + 0.74));
  }
  ctx.add(g);
};

B.chimney = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0;
  const g = frameGroup(ctx.rail, sm);
  const h = 1.55;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.32, w * 0.42, h, 8), pc.look > 0.5 ? M.bengara : M.plasterWarm);
  body.position.set(0, pc.y - h / 2 - 0.08, pc.d); g.add(body);
  g.add(box(w * 0.86, 0.13, w * 0.82, M.stone, 0, pc.y - 0.1, pc.d));
  const rainCap = new THREE.Mesh(new THREE.ConeGeometry(w * 0.48, 0.22, 4), M.ridge);
  rainCap.rotation.y = Math.PI / 4; rainCap.position.set(0, pc.y + 0.07, pc.d); g.add(rainCap);
  for (const x of [-w * 0.29, w * 0.29]) g.add(box(0.05, 0.25, 0.05, M.steel, x, pc.y - 0.02, pc.d));
  ctx.add(g);
};

B.futonRack = (pc, ctx) => {
  const { M } = ctx;
  const sm = (pc.s0 + pc.s1) / 2, w = pc.s1 - pc.s0;
  const g = frameGroup(ctx.rail, sm);
  g.add(box(w + 0.18, 0.12, 1.18, M.futon, 0, pc.y - 0.06, pc.d));
  g.add(box(w + 0.12, 0.56, 0.1, M.futon, 0, pc.y - 0.34, pc.d + 0.54));
  for (const x of [-w / 2 + 0.08, w / 2 - 0.08]) {
    g.add(box(0.08, pc.y, 0.08, M.timber, x, pc.y / 2, pc.d - 0.45));
  }
  for (const x of [-w * 0.28, w * 0.28]) {
    const tie = box(0.055, 0.15, 1.24, pc.look > 0.5 ? M.noren.crimson : M.noren.indigo, x, pc.y - 0.03, pc.d);
    g.add(tie);
  }
  ctx.add(g);
};

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

B.cherry = (pc, ctx) => {
  const { M, rail } = ctx;
  const bg = pc.bough;
  const sm = (bg.s0 + bg.s1) / 2;
  const g = frameGroup(rail, sm);
  const bx0 = bg.s0 - sm, bx1 = bg.s1 - sm;
  // Trunk leaning out over the canal from alternating banks. The playable
  // branch zigzags in depth, so this is a real upper-layer route, not scenery.
  const bankDir = pc.bank === 'far' ? -1 : 1;
  const trunk = cyl(0.14, bg.y + 0.9, M.bark, 'y', 7);
  trunk.position.set(bx0 - 0.5, (bg.y - 0.3) / 2, pc.d + bankDir * 1.55);
  trunk.rotation.x = -bankDir * 0.35;
  g.add(trunk);
  const bough = cyl(0.09, bx1 - bx0 + 0.6, M.bark, 'x', 6);
  bough.position.set((bx0 + bx1) / 2, bg.y - 0.09, pc.d);
  g.add(bough);

  // Fine side twigs keep the blossom cloud connected to the playable limb.
  // They alternate across the canal, making the high route read as a real old
  // tree instead of a row of floating pom-poms.
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1;
    const len = 0.48 + 0.42 * hash1(sm * 1.7 + i * 4.3);
    const twig = cyl(0.028 + 0.008 * hash1(sm + i), len, M.bark, 'z', 5);
    twig.position.set(bx0 + (i + 0.55) / 6 * (bx1 - bx0), bg.y + 0.05, pc.d + side * len * 0.46);
    twig.rotation.x = side * (0.18 + 0.12 * hash1(sm * 2.2 + i));
    g.add(twig);
  }

  // Many small, irregular clumps read as blossom sprays at cat scale. Keep
  // them above and mostly behind the bough so the route remains legible.
  const blossomMats = [M.blossomPale, M.blossom, M.blossomRose];
  for (let i = 0; i < 30; i++) {
    const r = 0.065 + 0.075 * hash1(sm + i * 3.1);
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), blossomMats[i % blossomMats.length]);
    const u = (i + hash1(sm * 0.7 + i * 5.9) * 0.8) / 30;
    c.position.set(
      bx0 - 0.45 + u * (bx1 - bx0 + 0.9),
      bg.y + 0.18 + 0.42 * hash1(sm + i),
      pc.d - bankDir * (0.12 + 0.82 * hash1(sm * 2 + i))
    );
    g.add(c);
  }
  ctx.add(g);
};

B.boat = (pc, ctx) => {
  const { M } = ctx;
  const g = new THREE.Group();
  const len = pc.len || 4.4;

  // Tapered open hull, dark inside, raised gunwales and visible deck ribs.
  const hull = new THREE.Mesh(boatHullGeometry(len + 0.5, 1.58, 0.5), M.hull);
  hull.position.y = 0.28;
  g.add(hull);
  g.add(box(len - 0.35, 0.07, 1.08, M.timberMed, 0, 0.22, 0));
  for (const z of [-0.76, 0.76]) g.add(box(len + 0.18, 0.12, 0.1, M.timber, 0, 0.34, z));
  for (let x = -len / 2 + 0.45; x < len / 2 - 0.15; x += 0.55) {
    g.add(box(0.065, 0.2, 1.42, M.timberMed, x, 0.24, 0));
  }
  for(const z of [-.78,.78]) {
    g.add(box(len-.4,.045,.035,M.hullBand,0,.16,z));
    for(let x=-len/2+.5;x<len/2-.2;x+=.5) {const nail=new THREE.Mesh(new THREE.SphereGeometry(.014,5,4),M.steel);nail.position.set(x,.32,z+.02*Math.sign(z));g.add(nail);}
  }
  for(let j=0;j<4;j++) {const coil=new THREE.Mesh(new THREE.TorusGeometry(.13+j*.025,.012,5,18),M.twine);coil.rotation.x=Math.PI/2;coil.position.set(-len*.35,.33,.22);g.add(coil);}
  const bailer=new THREE.Mesh(new THREE.CylinderGeometry(.13,.10,.22,9,1,true),M.agedWood);bailer.position.set(len*.36,.4,.35);g.add(bailer);
  g.add(box(.03,.06,.48,M.agedWood,len*.36,.52,.35));
  // Curled bow guards give the little boat a memorable animation silhouette.
  for (const sx of [-1, 1]) {
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.055, 6, 12, Math.PI * 0.9), M.timber);
    bow.position.set(sx * (len / 2 + 0.12), 0.48, 0);
    bow.rotation.set(Math.PI / 2, 0, sx > 0 ? 0.25 : Math.PI + 0.25);
    g.add(bow);
  }

  // Rice bales are lashed as a climbable cargo island; their crown matches
  // the moving physics platform exactly at pc.y.
  const cargo = [
    [-1.0, 0.57, -0.29], [-0.18, 0.57, -0.29], [0.64, 0.57, -0.29],
    [-1.0, 0.57, 0.29], [-0.18, 0.57, 0.29], [0.64, 0.57, 0.29],
    [-0.62, 1.02, 0.0], [0.18, 1.02, 0.0]
  ];
  for (const [x, y, z] of cargo) {
    const bale = cyl(0.28, 0.76, M.straw, 'x', 10);
    bale.position.set(x, y, z);
    bale.rotation.x = 0.04 * Math.sin(x * 8);
    g.add(bale);
    for (const dx of [-0.23, 0.23]) {
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.012, 5, 12), M.hemp);
      tie.rotation.y = Math.PI / 2;
      tie.position.set(x + dx, y, z);
      g.add(tie);
    }
  }

  // Loading planks across the lashed bales agree with the whole walkable
  // platform, including its ends (no invisible floating cargo surface).
  for (let x = -len / 2 + .12; x < len / 2; x += .26) {
    g.add(box(.24, .065, .88, M.agedWood, x, pc.y - .0325, 0));
  }
  for (const z of [-.54, .54]) {
    const rope = cyl(.025, len - .2, M.twine, 'x', 6); rope.position.set(0, .82, z); g.add(rope);
  }
  // A small boatman in a woven kasa works the pole. He is intentionally a
  // simple painted silhouette so Michi remains the scene's visual focus.
  const boatman = new THREE.Group();
  const legs = box(0.24, 0.32, 0.2, M.goods[1], 0, 0.16, 0);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.42, 8), M.bengara);
  body.position.y = 0.5;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 7), M.plasterWarm);
  head.position.y = 0.79;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.13, 16), M.straw);
  hat.position.y = 0.91;
  const polePivot = new THREE.Group();
  polePivot.position.set(0.04, 0.66, 0.0);
  const pole = cyl(0.027, 3.8, M.bamboo, 'y', 6);
  pole.position.y = -0.25;
  polePivot.add(pole);
  boatman.add(legs, body, head, hat, polePivot);
  boatman.position.set(1.55, 0.28, -0.24);
  g.add(boatman);

  // A faint V wake and bow ring are live meshes so their strength follows
  // boat speed and reverses correctly at either landing.
  const wake = new THREE.Group();
  for (const z of [-0.36, 0.36]) {
    const streak = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.12), M.wake);
    streak.rotation.x = -Math.PI / 2;
    streak.rotation.z = z > 0 ? 0.17 : -0.17;
    streak.position.set(-1.2, -0.205, z);
    wake.add(streak);
  }
  const bowRing = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.39, 20, 1, 0.15, Math.PI * 1.7), M.wake);
  bowRing.rotation.x = -Math.PI / 2;
  bowRing.position.set(len / 2 + 0.2, -0.205, 0);
  wake.add(bowRing);
  g.add(wake);

  // Merge the working hull/cargo locally; moving boats keep a small draw budget.
  const fixed = new THREE.Group();
  for (const child of [...g.children]) if (child !== boatman && child !== wake) fixed.add(child);
  g.add(mergeByMaterial(fixed));
  const boat = { group: g, plat: pc.plat, d: pc.d, boatman, pole: polePivot, wake, bowRing, lastS: null, dir: 1 };
  ctx.dynamic.boats.push(boat);
  ctx.dynamic.boat ||= boat;
  ctx.addDyn(g);
};

B.canopy = (pc, ctx) => {
  const { M, rail } = ctx;
  const sm = (pc.s0 + pc.s1) / 2;
  const g = frameGroup(rail, sm);
  const R = 3.63, half = Math.asin(2.0 / R);
  const yC = pc.y - R;
  // Translucent vault in sections, skipping the skylights.
  const cuts = [pc.s0, ...pc.gaps.flat(), pc.s1];
  for (let i = 0; i < cuts.length; i += 2) {
    const a = cuts[i] - sm, b = cuts[i + 1] - sm;
    const pos = [], idx = [];
    const K = 10;
    for (const x of [a, b]) {
      for (let k = 0; k <= K; k++) {
        const ang = -half + (2 * half * k) / K;
        pos.push(x, yC + Math.cos(ang) * R, pc.d + Math.sin(ang) * R);
      }
    }
    for (let k = 0; k < K; k++) idx.push(k, k + 1, K + 1 + k, k + 1, K + 2 + k, K + 1 + k);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, M.glass));         // pulled out with its world transform in buildWorld()
  }
  // Steel ribs and the side beams the vault springs from.
  for (let x = pc.s0 - sm; x <= pc.s1 - sm + 0.01; x += 2.4) {
    for (let k = 0; k < 6; k++) {
      const a0 = -half + (2 * half * k) / 6, a1 = -half + (2 * half * (k + 1)) / 6;
      const z0 = pc.d + Math.sin(a0) * R, y0 = yC + Math.cos(a0) * R;
      const z1 = pc.d + Math.sin(a1) * R, y1 = yC + Math.cos(a1) * R;
      const seg = box(0.06, 0.08, Math.hypot(z1 - z0, y1 - y0) + 0.02, M.steel, x, (y0 + y1) / 2, (z0 + z1) / 2);
      seg.rotation.x = -Math.atan2(y1 - y0, z1 - z0);
      g.add(seg);
    }
  }
  const len = pc.s1 - pc.s0;
  for (const z of [pc.d - 2.0, pc.d + 2.0]) {
    g.add(box(len, 0.14, 0.14, M.steel, 0, yC + Math.cos(half) * R - 0.05, z));
  }
  // Hanging banners in the market's colours.
  for (let x = pc.s0 - sm + 1.2, i = 0; x < pc.s1 - sm - 0.5; x += 3.6, i++) {
    g.add(box(0.7, 1.0, 0.015, M.goods[i % M.goods.length], x, pc.y - 1.35, pc.d + (i % 2 ? 0.9 : -0.9)));
  }
  ctx.add(g);
  for (let s = pc.s0 + 4; s < pc.s1; s += 9) ctx.light(rail, s, pc.y - 1.0, pc.d);
};

B.vent = (pc, ctx) => {
  const g = frameGroup(ctx.rail, (pc.s0 + pc.s1) / 2);
  const w = pc.s1 - pc.s0;
  g.add(box(w, pc.y - 4.95, 1.0, ctx.M.steel, 0, (pc.y + 4.95) / 2, pc.d));
  for (let i = 0; i < 3; i++) g.add(box(w + 0.02, 0.03, 1.02, ctx.M.dark, 0, 5.05 + i * 0.12, pc.d));
  ctx.add(g);
};

B.shopfronts = (pc, ctx) => {
  const { M, rail } = ctx;
  // Covered market stalls along the back of the market street.
  for (let s = pc.s0 + 0.2; s < pc.s1 - 1; s += 3.2) {
    if (pc.gaps?.some(([a, b]) => s + 3 > a - .4 && s < b + .4)) continue;
    const g = frameGroup(rail, s + 1.5);
    const k = hash1(s);
    g.add(box(3.0, 3.6, 4.0, k > 0.5 ? M.plaster : M.plasterWarm, 0, 1.8, -2.0));
    g.add(box(3.0, 0.1, 0.9, M.timberMed, 0, 2.3, 0.4));
    g.add(box(2.6, 0.8, 0.7, M.timberMed, 0, 0.4, 0.4));
    for (let i = 0; i < 5; i++) {
      const goods = box(0.4, 0.18, 0.4, M.goods[(i + Math.floor(k * 6)) % M.goods.length], -1.0 + i * 0.5, 0.9, 0.4 + (i % 2) * 0.1);
      g.add(goods);
    }
    g.add(box(1.0, 0.55, 0.02, M.noren[k > 0.66 ? 'crimson' : k > 0.33 ? 'indigo' : 'hemp'], 0.6, 1.95, 0.05));
    ctx.add(g);
  }
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
