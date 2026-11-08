// The garden's instruments: a deer-scarer on its pivot, a buried water harp, a
// glass wind chime. Each is geometry plus a small piece of physics.
import * as THREE from 'three';
import { V3, TAU, tube, rng, Bag, lerp, catmull } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { culmGeometry } from '../../shared/bamboo.js';

/** A bamboo tube cut on the diagonal at the open end (the sōzu). */
export function sozu({ len = 0.72, r = 0.05 } = {}) {
  const g = new THREE.CylinderGeometry(r * 0.92, r, len, 16, 10, true).rotateZ(Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    if (x > len * 0.1) { const cut = (x - len * 0.1) * 0.6; if (y > 0) p.setX(i, x - Math.max(0, y) * cut * 3); }   // slope the top of the mouth back
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, M.bamboo({ color: 0x8fb25a }));
  m.material.side = THREE.DoubleSide;
  return m;
}

/** The whole deer-scarer. Returned update(dt) runs the fill-tip-clack cycle. */
export function shishiOdoshi({ flow = 1, onClack = () => {} } = {}) {
  const root = new THREE.Group(), wood = M.wood({ base: 0x6a4e34, dark: 0x3e2a1a }), bamboo = M.bamboo({ color: 0x7ca24c });
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.42, 22), M.stone({ tint: 0x7e7a6e, moss: 0.5, lichen: 0.4 })); basin.position.set(-0.36, 0.21, 0); root.add(basin);
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.36, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x28606a, roughness: 0.05, metalness: 0.5 })); water.position.set(-0.36, 0.415, 0); root.add(water);
  for (const s of [-1, 1]) { const p = new THREE.Mesh(tube([V3(0.18, 0, s * 0.12), V3(0.18, 0.62, s * 0.12)], 0.028, { radial: 8 }), wood); root.add(p); }
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 8).rotateX(Math.PI / 2), M.plain(0x2a2a2a, { metal: 0.6, rough: 0.4 })); axle.position.set(0.18, 0.5, 0); root.add(axle);
  const pivot = new THREE.Group(); pivot.position.set(0.18, 0.5, 0); root.add(pivot);
  const tubeM = sozu(); tubeM.position.x = -0.15; pivot.add(tubeM);
  const plug = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), bamboo); plug.scale.set(0.5, 1, 1); plug.position.x = 0.21; pivot.add(plug);
  // the stone it strikes and the feeder that fills it
  const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.14), M.stone({ tint: 0x757065 })); anvil.position.set(0.5, 0.045, 0); root.add(anvil);
  const feed = catmull([V3(-0.2, 1.05, 0), V3(-0.02, 0.97, 0), V3(0.05, 0.84, 0)], 10);
  root.add(new THREE.Mesh(tube(feed, 0.022, { radial: 8 }), bamboo));
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.26, 6), new THREE.MeshStandardMaterial({ color: 0xbfe0e8, transparent: true, opacity: 0.75, roughness: 0.1 })); stream.position.set(0.05, 0.71, 0); root.add(stream);
  const pour = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0xbfe0e8, transparent: true, opacity: 0, roughness: 0.1 })); pour.position.set(-0.42, 0.56, 0); root.add(pour);
  const S = { fill: 0, a: 0.28, va: 0, tipping: 0, flow };
  const rest = 0.28, top = -0.62;
  return {
    group: root, pivot, S,
    update(dt) {
      // water runs in; the tube's balance shifts until the mouth end goes heavy
      if (S.tipping <= 0) {
        S.fill = Math.min(1.02, S.fill + dt * 0.26 * S.flow);
        const want = rest + (top - rest) * Math.pow(S.fill, 2.4);
        S.a += (want - S.a) * Math.min(1, dt * 7);
        if (S.fill >= 1) { S.tipping = 0.9; S.va = -2.8; }
      } else {
        S.va += 20 * dt; S.a += S.va * dt; S.tipping -= dt;
        if (S.a >= rest) { S.a = rest; if (S.va > 1.5) onClack(); S.va = -S.va * 0.32; }
        if (S.tipping < 0) { S.fill = 0; S.a = rest; S.va = 0; S.tipping = 0; }
      }
      pivot.rotation.z = -S.a;
      stream.scale.y = 1;
      pour.material.opacity = (S.tipping > 0.4) ? 0.7 : 0;
    }
  };
}

/** A suikinkutsu in cutaway: a buried, upside-down jar with a drip hole. */
export function waterHarp() {
  const g = new THREE.Group();
  const jar = new THREE.Mesh(new THREE.SphereGeometry(0.55, 28, 18, 0, TAU, 0, Math.PI * 0.82), M.plain(0x6e4c30, { rough: 0.7, side: THREE.DoubleSide, brush: 0.06 }));
  jar.scale.y = 1.1; jar.position.y = 0.0; g.add(jar);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(0.48, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x224a55, roughness: 0.1, metalness: 0.3 })); pool.position.y = -0.46; g.add(pool);
  return { group: g, pool };
}

/** A glass furin with its paper strip, as a spring on a string. */
export function furin({ hue = 0x9ccfe6, onRing = () => {} } = {}) {
  const root = new THREE.Group(), pivot = new THREE.Group();
  root.add(pivot);
  const prof = [[0.001, 0], [0.058, 0.005], [0.075, 0.03], [0.076, 0.06], [0.06, 0.08]].map(([x, y]) => new THREE.Vector2(x, y));
  const glass = new THREE.MeshPhysicalMaterial({ color: hue, transparent: true, opacity: 0.45, roughness: 0.08, transmission: 0.0, side: THREE.DoubleSide, clearcoat: 1 });
  const bell = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), glass); bell.position.y = -0.09; bell.rotation.x = Math.PI; pivot.add(bell);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.14), M.plain(0xe7d8ba)); cord.position.y = -0.17; pivot.add(cord);
  const clap = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 8), M.bronze({ color: 0x8a6a3a })); clap.position.y = -0.235; pivot.add(clap);
  const stripP = new THREE.Group(); stripP.position.y = -0.25; pivot.add(stripP);
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.22, 1, 8).translate(0, -0.11, 0), M.plain(0xf1e6c8, { side: THREE.DoubleSide, brush: 0.03 })); stripP.add(strip);
  const S = { a: 0, v: 0, s: 0, sv: 0, cool: 0 };
  return {
    group: root, S,
    update(dt, wind, t) {
      const f = wind * (0.6 + Math.sin(t * 1.7) * 0.4 + Math.sin(t * 3.9) * 0.3) * 1.6;
      S.v += (f - S.a * 22 - S.v * 2.5) * dt; S.a += S.v * dt;
      S.sv += ((f * 0.7 - S.s * 36 - S.sv * 4) + S.v * 2) * dt; S.s += S.sv * dt;
      pivot.rotation.z = S.a; stripP.rotation.z = S.s * 1.3 + S.a * 0.5;
      S.cool -= dt;
      if (Math.abs(S.s - S.a) > 0.12 && S.cool <= 0) { S.cool = 0.28 + Math.random() * 0.4; onRing(); }
    },
    strike() { S.v += 2.4 * (Math.random() < 0.5 ? -1 : 1); S.sv += 3; }
  };
}

export { culmGeometry, lerp };
