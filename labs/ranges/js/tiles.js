// The bench scenes for the sections below the hero — each is a small,
// self-contained scene + camera + api for the page to drive.
import * as THREE from 'three';
import { Air, CloudField } from './air.js';
import { LightRig } from '../../shared/light.js';
import { profileHeight, strokeToProfile, mulberry32 } from './profiles.js';
import { friezeGeometry } from './ridge.js';
import { instancedWall, cardWall, bakeCardAtlas, paintedTreeline, edgeSlice, driveFoliage, FOREST_GREENS } from './wall.js';
import { bakeImpostor, impostorField } from './impostor.js';
import { kasumiGroup } from './kasumi.js';

const miniRig = (scene, hour) => {
  scene.fog = new THREE.FogExp2(0xa8b4cc, 0.0012);
  return new LightRig(scene, { hour, shadows: false, fog: true });
};
const floor = (scene, color = 0x5d8442, y = 0) => {
  const m = new THREE.Mesh(new THREE.CircleGeometry(240, 48).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color }));
  m.position.y = y;
  scene.add(m);
  return m;
};

/* ============ 01 · the landscape stack (multiplane) ============ */

export function buildStack({ profile = 'higashiyama' } = {}) {
  const scene = new THREE.Scene();
  const rig = miniRig(scene, 9.5);
  const field = new CloudField();
  const air = new Air(field);
  const cam = new THREE.PerspectiveCamera(46, 1.6, 0.1, 900);
  cam.position.set(0, 6, 46);
  const look = new THREE.Vector3(0, 16, -60);
  const group = new THREE.Group();
  scene.add(group);
  let meshes = [];
  const specs = [
    { z: -34, h: 15, w: 200, dist: 34, footMist: 0.06 },
    { z: -88, h: 34, w: 280, dist: 88, footMist: 0.14 },
    { z: -190, h: 62, w: 380, dist: 190, footMist: 0.24 }
  ];
  const pals = {
    higashiyama: [[0x3d5e30, 0x66854a], [0x3a5634, 0x5d7a4c], [0x46586c, 0x6d7f96]],
    kitayama: [[0x2e4a2c, 0x44683a], [0x324f36, 0x4a7048], [0x4c5a66, 0x74859a]],
    atago: [[0x3a5a34, 0x5d7a44], [0x3e5638, 0x56704a], [0x5a6478, 0x8290a6]],
    arashiyama: [[0x4e5c2c, 0x8a6838], [0x4a5636, 0x7a5e3e], [0x5e5c72, 0x8a8098]],
    'valley-near': [[0x33502c, 0x53793f], [0x2c4a2e, 0x46683c], [0x3c4c58, 0x5d6e84]],
    paper: [[0x6a7a90, 0x94a6bc], [0x7a8a9c, 0xa2b4c6], [0x8c99ac, 0xb6c2d2]]
  };
  function rebuild(key) {
    for (const m of meshes) { group.remove(m); m.geometry.dispose(); }
    meshes = [];
    const p = pals[key] || pals.higashiyama;
    specs.forEach((s, i) => {
      const geo = friezeGeometry((u) => profileHeight(key === 'valley-near' ? ['valley-near', 'valley-mid', 'valley-far'][i] : key, u), {
        width: s.w, height: s.h, depth: 10 + i * 8, jitter: 0.06, seed: i * 7 + 3
      });
      const mat = air.rangeMaterial({ dist: s.dist, foot: p[i][0], crown: p[i][1], rock: 0x6a6a70, footMist: s.footMist, treed: 1 - i * 0.25, rocky: i * 0.35 });
      const m = new THREE.Mesh(geo, mat);
      m.position.z = s.z;
      m.userData.baseZ = s.z;
      group.add(m); meshes.push(m);
    });
  }
  rebuild(profile);
  let gap = 0;
  return {
    scene, camera: cam, air,
    setProfile: rebuild,
    setGap(v) { gap = v; },
    update(dt, t) {
      field.update(dt); air.update(rig);
      for (const m of meshes) {
        m.position.z = m.userData.baseZ * (1 + gap * 1.3);
        m.position.y = -gap * (2 + (Math.abs(m.userData.baseZ) / 90) * 2);
      }
      if (!document.hidden) {
        cam.position.x = Math.sin(t * 0.16) * 7;
        cam.position.y = 5 + Math.sin(t * 0.11) * 1.4;
      }
      cam.lookAt(look);
    }
  };
}

/* ============ 02 · the forest wall, four ways ============ */

export function buildWallBench(renderer, F, { kind: kind0 = 'mass' } = {}) {
  const scene = new THREE.Scene();
  const rig = miniRig(scene, 10.5);
  const field = new CloudField();
  const air = new Air(field);
  const cam = new THREE.PerspectiveCamera(42, 1.6, 0.1, 200);
  cam.position.set(0, 3.2, 15);
  const look = new THREE.Vector3(0, 4.4, 0);
  floor(scene, 0x55783a);
  // a straight run of wall, 24 m wide, facing the camera
  const walls = {}; let atlas = null, cardAtlas = null;
  const cyc = { t: 0 };
  function build(kind) {
    if (kind === 'mass') {
      const w = instancedWall(F, { count: 26, r0: 0.3, r1: 0.55, seed: 7, arcFrom: Math.PI, arcTo: Math.PI });
      // flatten the ring into a straight run
      w.group.children.forEach((inst) => {
        const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
        for (let i = 0; i < inst.count; i++) {
          inst.getMatrixAt(i, m); m.decompose(p, q, s);
          const x = (i / Math.max(1, inst.count - 1) - 0.5) * 22 + (hash(i * 31) - 0.5) * 1.4;
          const z = -0.6 - hash(i * 17) * 3.4;
          m.compose(p.set(x, p.y, z), q, s);
          inst.setMatrixAt(i, m);
        }
        inst.instanceMatrix.needsUpdate = true;
      });
      air.applyCloudShadow(w.material, 0.5);
      walls.mass = w.group; scene.add(w.group);
    } else if (kind === 'cards') {
      if (!cardAtlas) cardAtlas = bakeCardAtlas(renderer, F);
      const w = cardWall(cardAtlas, { count: 26, r0: 0.3, r1: 0.5, seed: 7 });
      w.group.children.forEach((mesh) => {
        const pos = mesh.geometry.getAttribute('iPos');
        for (let i = 0; i < pos.count; i++) {
          const x = (i / Math.max(1, pos.count - 1) - 0.5) * 22 + (hash(i * 29) - 0.5) * 1.2;
          pos.setXYZW(i, x, 0, -0.6 - hash(i * 13) * 3.2, pos.getW(i));
        }
        pos.needsUpdate = true;
      });
      walls.cards = w.group; scene.add(w.group);
    } else if (kind === 'impostor') {
      const rng = mulberry32(7);
      const built = F.buildCanopy(rng, {
        style: 'masses', scale: 1, trunkH: 1.15, trunkR: 0.14, primaries: 5, tilt: 0.76, tiltVar: 0.22,
        droop: -0.02, bend: 0.12, branchLen: 0.78, secondaries: 2, twigs: false, crownFill: 3,
        colors: FOREST_GREENS, clumpR: 0.36, tuftsPerClump: [3, 3, 2], tuftFlat: 0.74, lump: 0.4, seed: 53
      });
      const obj = new THREE.Group();
      obj.add(new THREE.Mesh(built.tufts, F.createFoliageMaterial({ sss: 0.24, wind: 0, mottle: 0.24, bump: 0.42, vertexColors: true, massMap: F.leafMassTexture('leaf'), massScale: 1 / 1.5, ragged: 1 })), new THREE.Mesh(built.branches, new THREE.MeshStandardMaterial({ color: 0x6a5a48, roughness: 1 })));
      atlas = bakeImpostor(renderer, obj, { grid: 4, cell: 192 });
      const positions = [];
      for (let i = 0; i < 26; i++) {
        positions.push({
          x: (i / 25 - 0.5) * 22 + (hash(i * 31) - 0.5) * 1.2,
          z: -0.6 - hash(i * 17) * 3.4,
          h: atlas.worldH * (1.6 + hash(i * 23) * 1.8),
          yaw: hash(i * 41) * Math.PI * 2,
          tint: [0.9 + hash(i * 5) * 0.2, 0.92 + hash(i * 9) * 0.16, 0.88 + hash(i * 13) * 0.18, 1]
        });
      }
      const { mesh } = impostorField(atlas, positions, { blend: 1 });
      walls.impostor = mesh; scene.add(mesh);
    } else if (kind === 'painted') {
      // a matte line: one 27 m wide quad with the painted treeline strip —
      // the ring texture tiles every ~36 m so the bench band shows ~0.8 tile
      const w = paintedTreeline({ radius: 40, height: 8.5, repeat: 7 });
      const mat = w.group.material.clone();
      mat.map = w.group.material.map.clone();
      mat.map.repeat.x = 0.8;
      mat.map.needsUpdate = true;
      const band = new THREE.Mesh(new THREE.PlaneGeometry(27, 8.5), mat);
      band.position.set(0, 4.0, -2.4);
      walls.painted = band; scene.add(band);
    }
  }
  let kind = kind0;
  function set(k) {
    kind = k;
    if (!walls[k]) build(k);
    for (const [key, g] of Object.entries(walls)) g.visible = key === k;
  }
  set(kind0);
  return {
    scene, camera: cam, air,
    get atlas() { return atlas; },
    set,
    update(dt, t) {
      field.update(dt); air.update(rig); driveFoliage(F, t, rig, 0.8);
      cam.position.x = Math.sin(t * 0.2) * 3.4;
      cam.position.y = 3.0 + Math.sin(t * 0.13) * 0.5;
      cam.lookAt(look);
    }
  };
}
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/* ============ 03 · the edge in section ============ */

export function buildEdgeScene(F) {
  const scene = new THREE.Scene();
  const rig = miniRig(scene, 10.5);
  const cam = new THREE.PerspectiveCamera(38, 1.6, 0.1, 120);
  const built = edgeSlice(F, {});
  scene.add(built.group);
  return {
    scene, camera: cam, labels: built.labels,
    update(dt, t) {
      driveFoliage(F, t, rig, 0.7);
      const a = t * 0.12;
      cam.position.set(Math.sin(a) * 13.5, 3.4 + Math.sin(t * 0.17) * 0.4, Math.cos(a) * 7 + 2);
      cam.lookAt(0, 2.4, -2);
    }
  };
}

/* ============ 04 · the air bench (aerial perspective) ============ */

export function buildAirBench() {
  const scene = new THREE.Scene();
  const rig = miniRig(scene, 8.2);
  const field = new CloudField();
  const air = new Air(field);
  const cam = new THREE.PerspectiveCamera(40, 1.6, 0.1, 1200);
  cam.position.set(0, 7, 60);
  const look = new THREE.Vector3(0, 26, -220);
  floor(scene, 0x4f7434, -0.4);
  const rows = [];
  const specs = [
    { z: -46, h: 16, w: 190, mist: 0.04, c: [0x33502c, 0x53793f] },
    { z: -110, h: 34, w: 300, mist: 0.1, c: [0x2f4c32, 0x4f7143] },
    { z: -200, h: 56, w: 420, mist: 0.16, c: [0x34495a, 0x54667e] },
    { z: -330, h: 82, w: 560, mist: 0.22, c: [0x3c4e68, 0x5f718c] },
    { z: -480, h: 104, w: 700, mist: 0.3, c: [0x46546e, 0x6a7a96] }
  ];
  for (const s of specs) {
    const geo = friezeGeometry((u) => profileHeight('valley-mid', u), { width: s.w, height: s.h, depth: 14, jitter: 0.05, seed: s.z });
    const mat = air.rangeMaterial({ dist: Math.abs(s.z), foot: s.c[0], crown: s.c[1], rock: 0x6a6a70, footMist: s.mist });
    const m = new THREE.Mesh(geo, mat);
    m.position.z = s.z;
    scene.add(m); rows.push(m);
  }
  let veil = 1, reverse = 0;
  return {
    scene, camera: cam, air, rows,
    setVeil(k) {
      veil = k;
      for (const m of rows) m.material.uniforms.uFogT.value = Math.min(0.97, m.material.userData.fogT0 * k);
    },
    setReverse(on) {
      reverse = on;
      air.u.uVeilSun.value = on ? 1.6 : 0.85;
      air.u.uSunTint.value = on ? 0.55 : 0.35;
    },
    update(dt, t) {
      field.update(dt); air.update(rig);
      if (reverse) air.u.uVeil.value.lerp(air.u.uSunCol.value, 0.16); // nudge the veil warm
      cam.position.x = Math.sin(t * 0.14) * 6;
      cam.lookAt(look);
    }
  };
}

/* ============ 05 · draw a ridge ============ */

export function buildDrawScene() {
  const scene = new THREE.Scene();
  const rig = miniRig(scene, 9.2);
  const field = new CloudField();
  const air = new Air(field);
  const cam = new THREE.PerspectiveCamera(42, 1.6, 0.1, 900);
  cam.position.set(0, 5.5, 52);
  const look = new THREE.Vector3(0, 13, -60);
  floor(scene, 0x55783a);
  const group = new THREE.Group();
  scene.add(group);
  let strokeFn = null;
  let mesh = null, mist = null;
  const kasumi = kasumiGroup('suyari', [{ x: 0, y: 7, z: -64, width: 210, height: 13, speed: 0.005 }]);
  scene.add(kasumi.group);
  const palette = { foot: 0x38523a, crown: 0x5d7a4c, rock: 0x7a6a58 };
  function rebuild(points) {
    strokeFn = points && points.length > 1 ? strokeToProfile(points) : (u) => 0.32 + Math.sin(u * 9) * 0.05;
    if (mesh) { group.remove(mesh); mesh.geometry.dispose(); }
    mesh = new THREE.Mesh(
      friezeGeometry(strokeFn, { width: 300, height: 46, depth: 18, cols: 200, jitter: 0.02, seed: 9 }),
      air.rangeMaterial({ dist: 90, footMist: 0.1, treed: 1, rocky: 0.5, ...palette })
    );
    mesh.position.z = -62;
    group.add(mesh);
  }
  rebuild(null);
  let kasumiOn = true;
  return {
    scene, camera: cam, air,
    setStroke: rebuild,
    setKasumi(b) { kasumiOn = b; kasumi.group.visible = b; },
    setPalette(p) { Object.assign(palette, p); },
    update(dt, t) {
      field.update(dt); air.update(rig);
      if (kasumiOn) kasumi.update(dt);
      cam.position.x = Math.sin(t * 0.15) * 5;
      cam.lookAt(look);
    }
  };
}
