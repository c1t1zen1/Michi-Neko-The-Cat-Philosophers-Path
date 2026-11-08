// Lab 09 tiles. Tile code = build(). The game's summit is read, never edited.
import * as THREE from 'three';
import { loadSummitModule } from '../../shared/game.js';
import { V3, TAU, rng, instances, canvas2d, canvasTexture, Bag } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';

let SM = null;
export const loadDeps = async () => { ({ SummitManager: SM } = await loadSummitModule()); };

/** Run a summit builder with only the state it writes to. Nothing in the game module changes. */
function summitKit() {
  const kit = Object.create(SM.prototype);
  Object.assign(kit, { previewQuality: true, vista: new THREE.Group(), group: new THREE.Group() });
  kit.terrainHeightAt = () => 0;
  return kit;
}

export const SOURCES = {
  neon: ['Neon Zenith · README (chunks, analytic curtain walls, height haze)', 'https://raw.githubusercontent.com/billpwchan/neon-zenith/main/README.md', 'excerpt'],
  tokyo: ['Procedural Tokyo · wiki (aerial perspective, far-to-near facades)', 'https://github.com/jeantimex/tokyo/wiki', 'excerpt'],
  infini: ['Infinitown · a wrapping grid of city blocks', 'https://demos.littleworkshop.fr/infinitown', 'excerpt'],
  light: ['Lightstorm Megacity · GPU-driven instancing', 'https://luma.gl/next/examples/showcase/lightstorm-megacity', 'excerpt'],
  notes: ['Summit notes', 'research.md', 'notes']
};

export const FAMILIES = [
  { key: 'city', title: 'A city, <em>from far enough away</em>', sub: 'The game’s Kyoto, then how little you can draw and still get a city. At this distance, every house is about four pixels.' },
  { key: 'night', title: 'When the windows <em>come on</em>', sub: 'Every lit window is a single point.' },
  { key: 'haze', title: 'Layers <em>of air</em>', sub: 'Painters separate distance by value. So can we.' }
];

export function roofInstances(k, { count = 800, spread = 3.4 } = {}) {
  const r = rng(11), wall = [], roof = [];
  for (let i = 0; i < count; i++) {
    const z = (r() - 0.5) * spread * 2, x = (r() - 0.5) * spread * 2;
    if (Math.abs(((x + 8) % 1.1 + 1.1) % 1.1 - 0.55) < 0.05 || Math.abs(((z - 3) % 1.35 + 1.35) % 1.35 - 0.67) < 0.04) continue;
    const w = 0.07 + r() * 0.1, d = 0.08 + r() * 0.1, h = 0.05 + r() * 0.07, ry = (r() < 0.2 ? Math.PI / 2 : 0) + (r() - 0.5) * 0.12;
    wall.push({ x, y: h / 2, z, sx: w, sy: h, sz: d, ry, color: [0xd3c39e, 0xc4b48f, 0xd9cfb5, 0xb9aa89][Math.floor(r() * 4)] });
    roof.push({ x, y: h + 0.03, z, sx: w * 0.78, sy: 0.05, sz: d * 0.78, ry, color: [0x495967, 0x5a6570, 0x3f4e5a, 0x68727b][Math.floor(r() * 4)] });
  }
  const g = new k.THREE.Group();
  g.add(k.instances(new k.THREE.BoxGeometry(1, 1, 1), k.M.plain(0xffffff, { rough: 0.9, brush: 0 }), wall));
  const hip = new k.THREE.ConeGeometry(1, 1, 4); hip.rotateY(Math.PI / 4);
  g.add(k.instances(hip, k.M.plain(0xffffff, { rough: 0.85, brush: 0 }), roof));
  return g;
}

export function windowPoints(k, { count = 500, spread = 3.4, y = 0.09, size = 0.05, color = 0xffc070 } = {}) {
  const r = rng(13), pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) { pos[i * 3] = (r() - 0.5) * spread * 2; pos[i * 3 + 1] = y + r() * 0.03; pos[i * 3 + 2] = (r() - 0.5) * spread * 2; }
  const g = new k.THREE.BufferGeometry(); g.setAttribute('position', new k.THREE.BufferAttribute(pos, 3));
  const [c, x] = k.canvas2d(32, 32); const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
  return new k.THREE.Points(g, new k.THREE.PointsMaterial({ color, size, map: k.canvasTexture(c), transparent: true, depthWrite: false, blending: k.THREE.AdditiveBlending }));
}

export const SPECIMENS = [
  { id: 'game-city', family: 'city', original: true, name: 'The city, today', jp: '今の京都', tag: 'buildKyotoCity(), preview quality', plinth: 'none', hour: 16, zoom: 0.72, game: () => SM.prototype.buildKyotoCity, plinthW: 7,
    blurb: 'The real city builder run in its 430-house preview mode. Instanced walls, roofs, eaves and a sprinkle of garden trees.',
    how: ['Boxes and a four-sided cone, instanced, with a road grid and the river kept clear.'], use: 'Baseline, read only: the summit is owned by another effort.', sources: ['notes'],
    build(k) { const kit = summitKit(); kit.buildKyotoCity(); const g = kit.vista; const wrap = new k.THREE.Group(); g.position.set(-0.3, 0, -90); wrap.add(g); wrap.scale.setScalar(0.03); return wrap; } },
  { id: 'grid', family: 'city', name: 'Roofs on a grid', jp: '瓦の海', tag: 'Four instanced draws for a city', plinth: 'stone', hour: 16,
    blurb: 'Walls and hip roofs, instanced, with a road grid knocked out. Every house costs no more than the transform.',
    how: ['Two InstancedMeshes and a colour per instance.', 'Roads are just a gap in the random placement.'], use: 'Everywhere in the middle distance.', sources: ['neon', 'infini'], also: [roofInstances],
    build(k) { return roofInstances(k); } },
  { id: 'card', family: 'city', name: 'A painted strip', jp: '絵の街', tag: 'The furthest layer is one card', plinth: 'stone', hour: 16,
    blurb: 'Past a certain distance, a city is a picture. The farthest layer is a single painted card, cheaper than the sky.',
    how: ['A canvas of roof marks, alpha-tested on a plane.'], use: 'Beyond about 400 m.', sources: ['tokyo'],
    build(k) { const [c, x] = k.canvas2d(512, 128); x.clearRect(0, 0, 512, 128); const r = rng(4); for (let i = 0; i < 1400; i++) { const px = r() * 512, py = 40 + r() * r() * 88; x.fillStyle = `rgba(${70 + r() * 40},${84 + r() * 40},${100 + r() * 30},${0.6 + r() * 0.4})`; x.fillRect(px, py, 2 + r() * 5, 2 + r() * 3); } const m = new k.THREE.Mesh(new k.THREE.PlaneGeometry(5, 1.25), new k.THREE.MeshBasicMaterial({ map: k.canvasTexture(c), transparent: true, side: k.THREE.DoubleSide })); m.position.y = 0.62; return m; } },
  { id: 'night', family: 'night', name: 'Points for windows', jp: '街の灯', tag: 'Thousands of lights, one draw', plinth: 'stone', hour: 21,
    blurb: 'Each lit window is a soft additive point. At this distance a window is a point.',
    how: ['One Points object with an additive falloff.'], use: 'The night view from the perch.', sources: ['neon', 'light'], also: [windowPoints],
    build(k) { const g = roofInstances(k); g.add(windowPoints(k)); return g; } },
  { id: 'haze', family: 'haze', name: 'Layered haze', jp: '霞', tag: 'Fog is not enough', plinth: 'stone', hour: 15, animatedShadow: false,
    blurb: 'A row of soft cards between the near and far city. Each pale layer hides a little more of what is behind, which is how painters do it.',
    how: ['A few wide transparent planes, drawn back to front.'], use: 'The view from the perch.', sources: ['tokyo'],
    build(k) { const g = roofInstances(k, { count: 700 }); const [c, x] = k.canvas2d(256, 64); const gr = x.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(235,235,245,0)'); gr.addColorStop(0.6, 'rgba(235,235,245,.55)'); gr.addColorStop(1, 'rgba(235,235,245,0)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 64); const t = k.canvasTexture(c); for (const z of [-1.6, -0.3, 1]) { const m = new k.THREE.Mesh(new k.THREE.PlaneGeometry(7, 0.6), new k.THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, side: k.THREE.DoubleSide })); m.position.set(0, 0.3, z); g.add(m); } return g; } }
];

export const STEPS = [
  { title: 'A grid with holes in it', body: '<p>Random placement, and the roads are just where no house is allowed to land.</p>', phase: 0 },
  { title: 'Two meshes, many houses', body: '<p>One instanced box, one instanced roof. A thousand houses cost two draws.</p>', phase: 1 },
  { title: 'Air between the layers', body: '<p>Pale bands between distances, because that is how you tell far from very far.</p>', phase: 2 },
  { title: 'Then wait for dark', body: '<p>The windows come on in a wave that starts at the river.</p>', phase: 3 }
];

export const ASSEMBLY = {
  radius: 4.2, target: [0, 0.2, 0], shadow: 5,
  build(k) {
    const root = new k.THREE.Group(), base = new k.THREE.Mesh(new k.THREE.BoxGeometry(7.4, 0.1, 7.4), k.M.plain(0x8f8a7a)); base.position.y = -0.05; base.userData.noShadow = true; root.add(base);
    const city = roofInstances(k); root.add(city); const lights = windowPoints(k, {}); lights.visible = false; root.add(lights);
    const haze = new k.THREE.Group(); root.add(haze); const [c, x] = k.canvas2d(256, 64), gr = x.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(235,235,245,0)'); gr.addColorStop(0.6, 'rgba(235,235,245,.5)'); gr.addColorStop(1, 'rgba(235,235,245,0)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 64); const t = k.canvasTexture(c); for (const z of [-2, 0.4]) { const m = new k.THREE.Mesh(new k.THREE.PlaneGeometry(7.6, 0.8), new k.THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, side: k.THREE.DoubleSide })); m.position.set(0, 0.4, z); haze.add(m); } haze.visible = false;
    return { group: root, setPhase(p) { city.children.forEach((c, i) => { c.count = p >= 1 ? 800 : 220; c.instanceMatrix.needsUpdate = true; }); haze.visible = p >= 2; lights.visible = p >= 3; } };
  }
};
