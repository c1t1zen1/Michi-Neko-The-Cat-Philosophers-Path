// pieces/pickups.js — the things the cat greets along the run: the seven
// clay Shōki and the treats. Lane r5-roof-cast (BUILD_GUIDE_FABLE.md §12).
// Moved verbatim from build.js (r1-roof-split).

import * as THREE from 'three';

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

export { makeTreat };
