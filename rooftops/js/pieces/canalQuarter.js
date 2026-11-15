// pieces/canalQuarter.js — Roof Road piece 'canalQuarter': the canal's architectural shell: wet banks, mooring stakes, drains, rain chains, greenery.
// Lane r3-canal-market (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import * as THREE from 'three';
import { box, cyl, frameGroup } from './common.js';

/** The canal's architectural shell: wet banks, towpath, drains and greenery. */
export const canalQuarter = (pc, ctx) => {
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
