// The garden's instruments: a deer-scarer on its pivot, a buried water harp, a
// glass wind chime. Each is geometry plus a small piece of physics.
import * as THREE from 'three';
import { V3, TAU, tube, rng, Bag, lerp, catmull } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { culmGeometry } from '../../shared/bamboo.js';
import { gardenBasin, bambooFeed } from '../../shared/waterprops.js';
export { gardenBasin, bambooFeed } from '../../shared/waterprops.js';

/** Hollow bamboo, with a diagonal mouth at -X, an internal node and a closed tail. */
export function sozu({ len = 1.1, r = 0.055 } = {}) {
  const profiles = [], radial = 24, wall = r * 0.2;
  // Each ring is (radius, x, diagonal cut). The inner return makes a visible rim.
  for (const [radius, x, cut] of [[r, len / 2, 0], [r, -len / 2, 1], [r - wall, -len / 2, 1], [r - wall, len * 0.12, 0]]) {
    for (let j = 0; j <= radial; j++) {
      const a = j / radial * TAU, y = Math.cos(a) * radius;
      profiles.push(x + cut * y * 1.6, y, Math.sin(a) * radius);
    }
  }
  const idx = [], stride = radial + 1;
  for (let row = 0; row < 3; row++) for (let j = 0; j < radial; j++) {
    const a = row * stride + j, b = a + 1, c = a + stride, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const skin = new THREE.BufferGeometry(); skin.setAttribute('position', new THREE.Float32BufferAttribute(profiles, 3)); skin.setIndex(idx); skin.computeVertexNormals();
  const root = new THREE.Group(), bamboo = M.bamboo({ color: 0x9baa62, side: THREE.DoubleSide });
  const body = new THREE.Mesh(skin, bamboo); body.name = 'Hollow diagonal mouth'; root.add(body);
  for (const x of [len * 0.12, len / 2]) {
    const node = new THREE.Mesh(new THREE.CylinderGeometry(r, r, wall, 24).rotateZ(Math.PI / 2), bamboo); node.position.x = x; root.add(node);
    const band = new THREE.Mesh(new THREE.TorusGeometry(r, wall * 0.38, 6, 24).rotateY(Math.PI / 2), M.bamboo({ color: 0x6c8044 })); band.position.x = x - wall; root.add(band);
  }
  return root;
}

/** Fill, tip, drain, return and strike. Stream endpoints follow the moving mouth. */
export function shishiOdoshi({ flow = 1, onClack = () => {} } = {}) {
  const root = new THREE.Group(), wood = M.bamboo({ color: 0x887746 });
  const basin = gardenBasin(); basin.position.x = -0.34; root.add(basin);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x568181, roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.8 });
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.35, 32).rotateX(-Math.PI / 2), waterMat); water.position.set(-0.34, 0.19, 0); root.add(water);
  for (const s of [-1, 1]) root.add(new THREE.Mesh(tube([V3(0.18, 0, s * 0.12), V3(0.18, 0.78, s * 0.12)], 0.032, { radial: 12 }), wood));
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.34, 10).rotateX(Math.PI / 2), wood); axle.position.set(0.18, 0.67, 0); root.add(axle);
  const pivot = new THREE.Group(); pivot.position.copy(axle.position); root.add(pivot);
  const tubeM = sozu(); tubeM.position.x = -0.05; pivot.add(tubeM);
  const rest = 0.62, top = -0.65;
  const anvilH = 0.67 - 0.5 * Math.sin(rest) - 0.055 * Math.cos(rest);
  const anvil = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, anvilH, 9), M.stone({ tint: 0x757065, moss: 0.12 })); anvil.position.set(0.18 + 0.5 * Math.cos(rest), anvilH / 2, 0); root.add(anvil);
  const outlet = bambooFeed(root);
  const streamMat = new THREE.MeshStandardMaterial({ color: 0xc4e1de, transparent: true, opacity: 0.65, roughness: 0.12 });
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.011, 1, 8), streamMat); root.add(stream);
  const pour = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.027, 1, 8), streamMat.clone()); pour.visible = false; root.add(pour);
  const S = { fill: 0, a: rest, va: 0, tipping: 0, flow };
  const mouth = V3(), end = V3(), up = V3(0, 1, 0), direction = V3();
  const connect = (mesh, a, b) => { direction.copy(a).sub(b); mesh.position.copy(a).add(b).multiplyScalar(0.5); mesh.quaternion.setFromUnitVectors(up, direction.clone().normalize()); mesh.scale.y = direction.length(); };
  const pose = () => {
    pivot.rotation.z = -S.a;
    // Local kinematics keep this correct even if the entire instrument is scaled.
    mouth.set(-0.6, 0.02, 0).applyAxisAngle(V3(0, 0, 1), -S.a).add(pivot.position);
    const catching = S.tipping <= 0;
    end.set(outlet.x, catching ? mouth.y + 0.018 : 0.195, 0);
    connect(stream, outlet, end); stream.visible = S.flow > 0;
    pour.visible = S.tipping > 0.35 && S.a < -0.2;
    if (pour.visible) connect(pour, mouth, V3(mouth.x, 0.195, mouth.z));
  };
  pose();
  return { group: root, pivot, S, pose, mouth, outlet, anvil,
    update(dt) {
      if (S.tipping <= 0) {
        S.fill = Math.min(1.02, S.fill + dt * 0.26 * S.flow);
        S.a += (rest - 0.07 * S.fill - S.a) * Math.min(1, dt * 7);
        if (S.fill >= 1) { S.tipping = 0.9; S.va = -5.7; }
      } else {
        S.va += 12 * dt; S.a += S.va * dt; S.tipping -= dt;
        if (S.a < top) { S.a = top; S.va = Math.max(0, S.va); }
        if (S.a >= rest) { S.a = rest; if (S.va > 1.5) onClack(); S.va = -S.va * 0.22; }
        if (S.tipping <= 0) { S.fill = 0; S.a = rest; S.va = 0; S.tipping = 0; }
      }
      pose();
    }
  };
}

/** An inverted jar with a small top drip hole; the missing sector is the cutaway. */
export function waterHarp() {
  const g = new THREE.Group();
  const prof = [[0.22, -0.5], [0.38, -0.46], [0.53, -0.27], [0.55, 0.02], [0.43, 0.34], [0.16, 0.5], [0.025, 0.52], [0.025, 0.49], [0.14, 0.47], [0.4, 0.31], [0.52, 0.02], [0.5, -0.26], [0.35, -0.43], [0.2, -0.47]].map(([x, y]) => new THREE.Vector2(x, y));
  const jar = new THREE.Mesh(new THREE.LatheGeometry(prof, 36, Math.PI * 0.3, Math.PI * 1.4), M.plain(0x6e4c30, { rough: 0.7, side: THREE.DoubleSide, brush: 0.06 })); g.add(jar);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(0.35, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x224a55, roughness: 0.1, metalness: 0.15 })); pool.position.y = -0.435; g.add(pool);
  return { group: g, pool };
}

/** A glass furin with its paper strip, as a spring on a string. */
export function furin({ hue = 0x9ccfe6, onRing = () => {} } = {}) {
  const root = new THREE.Group(), pivot = new THREE.Group();
  root.add(pivot);
  const prof = [[0.006, 0], [0.032, -0.009], [0.064, -0.03], [0.078, -0.06], [0.076, -0.09]].map(([x, y]) => new THREE.Vector2(x, y));
  const glass = new THREE.MeshPhysicalMaterial({ color: hue, transparent: true, opacity: 0.45, roughness: 0.08, transmission: 0.0, side: THREE.DoubleSide, clearcoat: 1 });
  const bell = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), glass); bell.name = 'Open bell'; pivot.add(bell);
  const suspension = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.12), M.plain(0xe7d8ba)); suspension.position.y = 0.06; root.add(suspension);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.16), M.plain(0xe7d8ba)); cord.position.y = -0.08; pivot.add(cord);
  const clap = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 8), M.bronze({ color: 0x8a6a3a })); clap.position.y = -0.085; pivot.add(clap);
  const stripP = new THREE.Group(); stripP.position.y = -0.16; pivot.add(stripP);
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
