// Garden plumbing shared by the object labs. Dimensions are in metres.
import * as THREE from 'three';
import { V3, tube } from './craft.js';
import { M } from './painted.js';

/** A carved basin: the lathed profile returns down the inside to its floor. */
export function gardenBasin({ r = 0.46, h = 0.24, drain = false } = {}) {
  const bore = drain ? 0.025 : 0.001;
  const points = [[bore, 0], [r * 0.78, 0], [r, h * 0.65], [r * 0.99, h], [r * 0.81, h], [r * 0.74, h * 0.3], [bore, h * 0.24], [bore, 0]];
  return new THREE.Mesh(new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), 32), M.stone({ tint: 0x878176, moss: 0.2, lichen: 0.2 }));
}

/** A feeder on a grounded supply riser and two lashed trestle legs. */
export function bambooFeed(root, outlet = V3(-0.29, 1.24, 0)) {
  const bamboo = M.bamboo({ color: 0x9baa62 }), dark = M.plain(0x3d3020, { rough: 1 });
  const start = outlet.clone().add(V3(-0.76, 0.13, -0.18)), path = [start, outlet];
  const pipe = new THREE.Mesh(tube(path, 0.032, { radial: 16, caps: false }), bamboo); pipe.name = 'Supported supply pipe'; root.add(pipe);
  const inner = new THREE.Mesh(tube(path, 0.024, { radial: 16, caps: false }), M.plain(0x725c31, { side: THREE.BackSide })); root.add(inner);
  root.add(new THREE.Mesh(tube([V3(start.x, -0.02, start.z), start], 0.034, { radial: 12 }), bamboo));
  const p = start.clone().lerp(outlet, 0.62);
  for (const s of [-1, 1]) root.add(new THREE.Mesh(tube([V3(p.x, 0, p.z + s * 0.55), V3(p.x, p.y - 0.02, p.z + s * 0.025)], 0.022, { radial: 8 }), bamboo));
  for (const x of [p.x - 0.018, p.x + 0.018]) {
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.006, 6, 16).rotateY(Math.PI / 2), dark); tie.position.set(x, p.y - 0.02, p.z); root.add(tie);
  }
  return outlet;
}

