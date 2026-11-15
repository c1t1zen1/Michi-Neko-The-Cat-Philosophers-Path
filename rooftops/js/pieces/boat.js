// pieces/boat.js — Roof Road piece 'boat': a takasebune: hull, rice bales, planks, the boatman and the wake.
// Lane r3-canal-market (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import * as THREE from 'three';
import { box, cyl, mergeByMaterial } from './common.js';

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

export const boat = (pc, ctx) => {
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
