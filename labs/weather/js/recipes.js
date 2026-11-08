// Lab 20 tiles. Tile code = build().
import * as THREE from 'three';
import { loadParticlesModule } from '../../shared/game.js';
import { V3, TAU, Bag, rng, instances } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';

let Particles = null;
export const loadDeps = async () => { ({ Particles } = await loadParticlesModule()); };
let cache = null;
const gameP = () => (cache ||= new Particles(new THREE.Group(), {}));

export const SOURCES = {
  webgpu: ['three.js · webgpu_compute_particles_rain example', 'https://github.com/mrdoob/three.js/blob/99fd53fbadc511febcc11eab6273f47bf02a329e/examples/webgpu_compute_particles_rain.html', 'excerpt'],
  snow80: ['80.lv · Real-time snowfall in Three.js', 'https://80.lv/articles/artist-shares-real-time-snowfall-system-built-with-three-js-webgl', 'excerpt'],
  skill: ['threejs-rain-snow-and-wet-surfaces notes', 'https://raw.githubusercontent.com/linegel/threejs-complete-set-of-skill/main/threejs-rain-snow-and-wet-surfaces/SKILL.md', 'excerpt'],
  notes: ['Weather research notes', 'research.md', 'notes']
};

export const FAMILIES = [
  { key: 'rain', title: 'What rain <em>actually does</em>', sub: 'The game’s rain falls but never lands. Here it splashes, rings the water and turns the ground dark.' },
  { key: 'snow', title: 'Where snow <em>settles</em>', sub: 'Not the falling, which is easy, but the sitting down.' },
  { key: 'petals', title: 'Petals, <em>and where they end up</em>', sub: 'They collect against things. That’s what makes them look real.' }
];

function rainQuads(k, count = 90) {
  const g = new k.THREE.PlaneGeometry(0.012, 0.42), m = new k.THREE.MeshBasicMaterial({ color: 0xbcd4ea, transparent: true, opacity: 0.55, depthWrite: false, side: k.THREE.DoubleSide });
  const im = new k.THREE.InstancedMesh(g, m, count), o = new k.THREE.Object3D(), r = rng(3);
  const seeds = Array.from({ length: count }, () => ({ x: (r() - 0.5) * 2.2, z: (r() - 0.5) * 2.2, p: r() }));
  return { im, update(t) { seeds.forEach((s, i) => { const y = 2 - ((t * 1.7 + s.p) % 1) * 2; o.position.set(s.x, y, s.z); o.rotation.set(0, 0.8, 0); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }); im.instanceMatrix.needsUpdate = true; } };
}

export const SPECIMENS = [
  { id: 'game-rain', family: 'rain', original: true, name: 'The game’s rain', jp: '今の雨', tag: 'LineSegments that fall forever', plinth: 'stone', hour: 15, animatedShadow: false, game: () => Particles.prototype.buildRain,
    blurb: 'A still of the real system: 1,100 line segments. It reads as rain in the air, and leaves no trace when it arrives.',
    how: ['A LineSegments buffer stepped in JavaScript.'], use: 'Baseline.', sources: ['notes'],
    build(k) { const p = gameP(); p.rainMat.opacity = 0.7; p.rain.visible = true; const r = p.rain.clone(); r.scale.setScalar(0.05); r.position.y = 0.4; return r; } },
  { id: 'streak', family: 'rain', name: 'Streak quads', jp: '雨脚', tag: 'Thin billboards, instanced', plinth: 'stone', hour: 15, animatedShadow: false,
    blurb: 'Instanced planes rather than lines, so the width can stay right at any distance and the blend can fade near the ground.',
    how: ['One instanced quad per streak.'], use: 'Any place you want rain to be seen.', sources: ['skill', 'webgpu'], also: [rainQuads],
    build(k) { const r = rainQuads(k); const g = new k.THREE.Group(); g.add(r.im); return { group: g, update: r.update }; } },
  { id: 'splash', family: 'rain', name: 'Splash rings', jp: '水跳ね', tag: 'A small ring wherever a drop lands', plinth: 'stone', hour: 15, animatedShadow: false,
    blurb: 'Each drop gets a tiny expanding ring on the ground. The eye reads rain from the ground up, as much as from the air down.',
    how: ['A pool of ring meshes, each restarted when it fades.'], use: 'Everywhere it’s raining.', sources: ['skill'],
    build(k) { const g = new k.THREE.Group(), m = new k.THREE.MeshBasicMaterial({ color: 0xd8e8f4, transparent: true, opacity: 0.8, side: k.THREE.DoubleSide, depthWrite: false }); const rings = Array.from({ length: 12 }, (_, i) => { const r = new k.THREE.Mesh(new k.THREE.RingGeometry(0.04, 0.05, 20).rotateX(-Math.PI / 2), m.clone()); r.userData.p = i / 12; r.position.set((Math.random() - 0.5) * 2, 0.01, (Math.random() - 0.5) * 2); g.add(r); return r; }); return { group: g, update(t) { for (const r of rings) { const f = (t * 0.9 + r.userData.p) % 1; r.scale.setScalar(1 + f * 5); r.material.opacity = (1 - f) * 0.8; } } }; } },
  { id: 'wet', family: 'rain', name: 'Wet ground', jp: '濡れ色', tag: 'Darker, and suddenly glossy', plinth: 'none', hour: 15, animatedShadow: false,
    blurb: 'Rain darkens stone and pulls its roughness down, so the sky starts reflecting in it. Two numbers change everything.',
    how: ['Albedo × 0.62 and roughness × 0.3, driven by one wetness value.'], use: 'Every surface, on a slow timer.', sources: ['skill'],
    build(k) { const u = { value: 0 }, m = k.M.stone({ tint: 0x9e998c, wet: u }), g = new k.THREE.Group(); const slab = new k.THREE.Mesh(new k.THREE.BoxGeometry(2.4, 0.15, 2.4), m); slab.position.y = 0.08; g.add(slab); return { group: g, update(t) { u.value = 0.5 + 0.5 * Math.sin(t * 0.7); } }; } },

  { id: 'game-snow', family: 'snow', original: true, name: 'The game’s snow', jp: '今の雪', tag: 'Points, falling', plinth: 'stone', hour: 11, animatedShadow: false, game: () => Particles.prototype.buildSnow,
    blurb: 'A still of the real system: soft points, gently swaying. It stops at the ground and disappears.',
    how: ['A Points cloud moved in JavaScript.'], use: 'Baseline.', sources: ['notes'],
    build(k) { const p = gameP(); p.snow.visible = true; p.snow.material.opacity = 1; const s = p.snow.clone(); s.scale.setScalar(0.05); s.position.y = 0.5; return { group: s, noCast: true }; } },
  { id: 'settle', family: 'snow', name: 'Snow that settles', jp: '積雪', tag: 'Whatever faces up turns white', plinth: 'stone', hour: 11, animatedShadow: false,
    blurb: 'Accumulation isn’t particles at all. A world-space normal test on every material, with a little noise along the edge.',
    how: ['snow = smoothstep(.25, .75, normal.y + noise) × amount.', 'Used here on the same paintify shader as the moss.'], use: 'Roofs, stones and walls, all at once.', sources: ['snow80'],
    build(k) { const u = { value: 0 }, g = new k.THREE.Group(), s = new k.THREE.Mesh(k.rockGeometry(11, { detail: 4, rough: 0.14 }), k.M.rock({ moss: 0, lichen: 0.2, snow: u })); s.position.y = 0.45; g.add(s); const b = new k.THREE.Mesh(new k.THREE.BoxGeometry(1.8, 0.2, 1.8), k.M.stone({ tint: 0x8f8a7e, snow: u })); b.position.y = 0.1; g.add(b); return { group: g, update(t) { u.value = 0.5 + 0.5 * Math.sin(t * 0.5); } }; } },

  { id: 'game-petal', family: 'petals', original: true, name: 'The game’s petals', jp: '今の花弁', tag: 'Points that drift and vanish', plinth: 'moss', hour: 12, animatedShadow: false, game: () => Particles.prototype.buildPetals,
    blurb: 'A still of the real petals: textured points that drift along. They’re a soft effect that never touches the ground.',
    how: ['A Points cloud moved in JavaScript.'], use: 'Baseline.', sources: ['notes'],
    build(k) { const p = gameP(); p.petals.visible = true; p.petals.material.opacity = 1; const s = p.petals.clone(); s.scale.setScalar(0.06); s.position.y = 0.4; return { group: s, noCast: true }; } },
  { id: 'drift', family: 'petals', name: 'Drifts', jp: '花筏', tag: 'They land, and they stay', plinth: 'moss', hour: 12, animatedShadow: false,
    blurb: 'Petals that come to rest pile up against the edges. On water they raft. It’s the settling that sells it.',
    how: ['Each falling petal hands off to a static instance when it lands.'], use: 'Under every cherry tree.', sources: ['notes'],
    build(k) { const r = rng(4), list = []; for (let i = 0; i < 420; i++) { const a = r() * k.TAU, d = Math.pow(r(), 0.3) * 1.0; list.push({ x: Math.cos(a) * d, y: 0.012 + r() * 0.02, z: Math.sin(a) * d, rx: -Math.PI / 2 + (r() - 0.5) * 0.2, ry: r() * 6, s: 0.8 + r() * 0.6, color: r() < 0.4 ? 0xf6cfda : 0xf2bccb }); } const m = k.instances(new k.THREE.CircleGeometry(0.035, 6), k.M.plain(0xffffff, { rough: 0.7, side: k.THREE.DoubleSide, brush: 0 }), list); return m; } }
];

export const STEPS = [
  { title: 'It falls', body: '<p>This part is easy, and most games stop here.</p>', phase: 0 },
  { title: 'It lands', body: '<p>Now every drop has a place to end. A ring on the ground and a dark patch where it has been.</p>', phase: 1 },
  { title: 'It stays', body: '<p>Wetness dries slowly, and snow and petals stay where they fall. The world remembers the weather.</p>', phase: 2 }
];

export const ASSEMBLY = {
  radius: 1.6, target: [0, 0.5, 0], shadow: 3,
  build(k) {
    const u = { value: 0 }, snow = { value: 0 }, root = new k.THREE.Group();
    const base = new k.THREE.Mesh(new k.THREE.BoxGeometry(2.4, 0.15, 2.4), k.M.stone({ tint: 0x9e998c, wet: u, snow })); base.position.y = -0.08; root.add(base);
    const s = new k.THREE.Mesh(k.rockGeometry(4, { detail: 4 }), k.M.rock({ moss: 0.2, wet: u, snow })); s.position.y = 0.45; root.add(s);
    const r = rainQuads(k, 80); root.add(r.im);
    let ph = 0;
    return { group: root, setPhase(p) { ph = p; }, update(t, dt) { if (ph >= 1) u.value += (1 - u.value) * Math.min(1, dt); else u.value *= 0.96; r.im.visible = ph < 2; snow.value += ((ph >= 2 ? 1 : 0) - snow.value) * Math.min(1, dt * 0.8); r.update(t); } };
  }
};
