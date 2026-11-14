// Three benches for the distant life: the foothill stands, the hillside
// village (boxes and pyramids vs gabled roofs with eaves) and the two mists
// (the rim ring, and the dawn ribbons with their time envelope).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LightRig } from '../../shared/light.js';
import { terrainHeight, mulberry32 } from './profiles.js';
import { foothillCarpet, driveFoliage } from './wall.js';
import { friezeGeometry, terrainPatch, gameRangeColors } from './ridge.js';
import { villageHouses, WALL_COLORS, ROOF_COLORS, dawnStrength, sunHeight, hearthGlow } from './life_data.js';

const rig = (scene, hour) => {
  scene.fog = new THREE.FogExp2(0xa8b4cc, 0.0014);
  return new LightRig(scene, { hour, shadows: false, fog: true });
};
const meadow = (scene, color = 0x5d8442, y = 0) => {
  const m = new THREE.Mesh(new THREE.CircleGeometry(300, 48).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color }));
  m.position.y = y; scene.add(m);
};

/* ============ 07 · the foothill stands ============ */

export function buildFoothillBench(F) {
  const scene = new THREE.Scene();
  const light = rig(scene, 10);
  scene.fog.density = 0.0006;
  const cam = new THREE.PerspectiveCamera(40, 1.6, 0.5, 900);
  const land = new THREE.Mesh(terrainPatch({ size: 460, seg: 120, heightAt: terrainHeight, colorAt: (x, z, h, d, c) => gameRangeColors(x, z, h, d, c, 0.6) }), new THREE.MeshLambertMaterial({ vertexColors: true }));
  scene.add(land);
  const group = new THREE.Group(); scene.add(group);
  let carpet = null;
  const set = (kinds) => {
    if (carpet) { group.remove(carpet.group); }
    carpet = foothillCarpet(F, terrainHeight, { r0: 58, r1: 170, seed: 23, kinds, budget: 1800 });
    group.add(carpet.group);
  };
  set('mixed');
  return {
    scene, camera: cam, rig: light, setKinds: set,
    update(dt, t) {
      driveFoliage(F, t, light, 0.8);
      cam.position.set(Math.sin(t * 0.1) * 20, 11, 36);
      cam.lookAt(0, 30, -110);
    }
  };
}

/* ============ 08 · the hillside village ============ */

function houseBoxes(h, mats, winGeo, winMat) {
  const g = new THREE.Group(), s = h.s;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(2.6 * s, 1.6 * s, 2 * s), mats.wall[h.wall]); wall.position.y = 0.8 * s; g.add(wall);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2 * s, 1.1 * s, 4), mats.roof[h.roof]); roof.position.y = 1.6 * s + 0.55 * s; roof.rotation.y = Math.PI / 4; g.add(roof);
  return withWindows(g, h, winGeo, winMat);
}
function gableGeo(w, d, h, over) {
  const hw = w / 2 + over, hd = d / 2 + over;
  const v = new Float32Array([-hw, 0, -hd, hw, 0, -hd, hw, h, 0, -hw, h, 0, -hw, 0, hd, hw, 0, hd]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(v, 3));
  g.setIndex([0, 3, 2, 0, 2, 1, 4, 5, 2, 4, 2, 3, 0, 4, 3, 1, 2, 5]);
  const n = g.toNonIndexed(); n.computeVertexNormals(); return n;
}
function houseGabled(h, mats, winGeo, winMat) {
  const g = new THREE.Group(), s = h.s;
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.72 * s, 0.18 * s, 2.12 * s), mats.stone); plinth.position.y = 0.09 * s; g.add(plinth);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(2.6 * s, 1.5 * s, 2 * s), mats.wall[h.wall]); wall.position.y = 0.18 * s + 0.75 * s; g.add(wall);
  const roof = new THREE.Mesh(gableGeo(2.6 * s, 2 * s, 1.05 * s, 0.35 * s), mats.roof[h.roof]); roof.position.y = 1.68 * s; g.add(roof);
  return withWindows(g, h, winGeo, winMat);
}
function withWindows(g, h, winGeo, winMat) {
  for (const [side, wx, wy] of h.windows) {
    const w = new THREE.Mesh(winGeo, winMat);
    w.position.set(wx, wy, side * 1.004 * h.s);
    if (side === -1) w.rotation.y = Math.PI;
    g.add(w);
  }
  g.position.set(h.x, h.y, h.z); g.rotation.y = h.ry;
  return g;
}

export function buildVillageBench() {
  const scene = new THREE.Scene();
  const light = rig(scene, 17);
  const cam = new THREE.PerspectiveCamera(36, 1.6, 0.5, 700);
  meadow(scene, 0x4f7434, -0.4);
  const slopeY = (z) => Math.max(0, (-z - 50) * 0.16);
  const slopeGeo = new THREE.PlaneGeometry(260, 160, 1, 8).rotateX(-Math.PI / 2);
  for (let i = 0; i < slopeGeo.attributes.position.count; i++) slopeGeo.attributes.position.setY(i, slopeY(slopeGeo.attributes.position.getZ(i) - 78));
  slopeGeo.computeVertexNormals();
  const slope = new THREE.Mesh(slopeGeo, new THREE.MeshLambertMaterial({ color: 0x5f8248 }));
  slope.position.set(0, 0, -78); scene.add(slope);
  const houses = villageHouses(5, [[-26, -78, 10], [30, -92, 12], [4, -64, 6]], (x, z) => slopeY(z) + 0.3);
  const mats = {
    wall: WALL_COLORS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 })),
    roof: ROOF_COLORS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })),
    stone: new THREE.MeshStandardMaterial({ color: 0x8a8478, roughness: 1 })
  };
  const winMat = new THREE.MeshStandardMaterial({ color: 0x8a5a30, emissive: 0xffb45e, emissiveIntensity: 0.1, roughness: 0.6 });
  const winGeo = new THREE.PlaneGeometry(0.34, 0.42);
  const group = new THREE.Group(); scene.add(group);
  let style = 'gabled', hour = 17;
  const rebuild = (s) => {
    style = s;
    group.clear();
    for (const h of houses) group.add((s === 'boxes' ? houseBoxes : houseGabled)(h, mats, winGeo, winMat));
  };
  rebuild('gabled');
  return {
    scene, camera: cam, rig: light, setStyle: rebuild,
    setHour(h) { hour = h; light.setHour(h); winMat.emissiveIntensity = hearthGlow(sunHeight(h)); },
    get glow() { return winMat.emissiveIntensity; },
    update(dt, t) { cam.position.set(Math.sin(t * 0.12) * 14, 7, -22); cam.lookAt(0, 8, -80); }
  };
}

/* ============ 09 · the two mists ============ */

function wisp(size, wide, seed) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), r = mulberry32(seed);
  for (let i = 0; i < 7; i++) {
    const cx = size * (0.5 + (r() - 0.5) * 0.46 * wide), cy = size * (0.5 + (r() - 0.5) * 0.3), rad = size * (0.2 + r() * 0.2), a = 0.2 + r() * 0.18;
    const gr = g.createRadialGradient(cx, cy, rad * 0.1, cx, cy, rad);
    gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(0.55, `rgba(255,255,255,${a * 0.5})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.save(); g.translate(cx, cy); g.scale(1 + 0.5 * wide, 0.7, 1); g.translate(-cx, -cy); g.fillRect(0, 0, size, size); g.restore();
  }
  g.globalCompositeOperation = 'destination-in';
  const e = g.createRadialGradient(size / 2, size / 2, size * 0.18, size / 2, size / 2, size * 0.5);
  e.addColorStop(0, 'rgba(0,0,0,1)'); e.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = e; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildMistBench() {
  const scene = new THREE.Scene();
  const light = rig(scene, 6.25);
  const cam = new THREE.PerspectiveCamera(42, 1.6, 0.5, 500);
  meadow(scene, 0x55783a, -0.2);
  const river = new THREE.Mesh(new THREE.PlaneGeometry(260, 12).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x4d7a8e }));
  river.position.set(0, 0.02, 22); scene.add(river);
  const ridge = new THREE.Mesh(friezeGeometry((u) => 0.35 + 0.25 * Math.sin(u * 9) * Math.sin(u * 3.1), { width: 320, height: 40, depth: 14, jitter: 0.04, seed: 5 }), new THREE.MeshLambertMaterial({ color: 0x3f5e3a }));
  ridge.position.z = -64; scene.add(ridge);
  const r = mulberry32(9), ringTex = wisp(256, 1, 11), dawnTex = wisp(256, 2.2, 23);
  const ring = [], dawn = [];
  for (let i = 0; i < 8; i++) {
    const m = new THREE.SpriteMaterial({ map: ringTex, transparent: true, opacity: 0.75, depthWrite: false });
    const s = new THREE.Sprite(m); s.position.set(-90 + i * 26 + r() * 6, 4 + r() * 3, -56 - r() * 8); s.scale.set(32 + r() * 18, 11 + r() * 6, 1); scene.add(s); ring.push({ s, phase: r() * 6, speed: 0.03 + r() * 0.04, x: s.position.x });
  }
  for (let i = 0; i < 12; i++) {
    const m = new THREE.SpriteMaterial({ map: dawnTex, transparent: true, opacity: 0, depthWrite: false, color: 0xf6efe4 });
    const s = new THREE.Sprite(m); s.position.set(-60 + i * 11, 0.8 + r() * 0.5, 22 + (r() - 0.5) * 3); s.scale.set(15 + r() * 9, 3.2 + r() * 1.6, 1); s.visible = false; s.renderOrder = 1; scene.add(s); dawn.push({ s, phase: r() * 6, speed: 0.04 + r() * 0.05, x: s.position.x, y: s.position.y });
  }
  let weather = 'clear', strength = 0;
  return {
    scene, camera: cam, rig: light,
    setWeather(w) { weather = w; },
    setHour(h) { light.setHour(h); strength = dawnStrength(h, weather); },
    get strength() { return strength; },
    update(dt, t) {
      for (const m of ring) { m.s.position.x = m.x + Math.sin(t * m.speed * 4 + m.phase) * 3; m.s.material.opacity = 0.6 + Math.sin(t * m.speed * 6 + m.phase) * 0.15; }
      for (const m of dawn) {
        const on = strength > 0.02; m.s.visible = on; if (!on) continue;
        m.s.position.x = m.x + Math.sin(t * m.speed * 3 + m.phase) * 1.6;
        m.s.position.y = m.y + Math.sin(t * m.speed * 2 + m.phase) * 0.12 + (1 - strength) * 0.2;
        m.s.material.opacity = strength * (0.5 + Math.sin(t * m.speed * 5 + m.phase) * 0.08);
      }
      cam.position.set(Math.sin(t * 0.1) * 16, 3.4, 48); cam.lookAt(0, 4, 0);
    }
  };
}
