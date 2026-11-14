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
  { key: 'petals', title: 'Petals, <em>and where they end up</em>', sub: 'They collect against things. That’s what makes them look real.' },
  { key: 'life', title: 'Small things <em>that move through light</em>', sub: 'Fireflies, motes, a scent trail, a landing, a splash: the game’s little effects, each as a pool of sprites that live and die.' }
];

// shared little glow for the life specimens: one canvas per colour, made on first use
const glowCache = new Map();
function glow(k, rgb) {
  if (!glowCache.has(rgb)) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 31);
    g.addColorStop(0, 'rgba(255,255,248,1)'); g.addColorStop(0.2, `rgba(${rgb},0.9)`); g.addColorStop(0.55, `rgba(${rgb},0.22)`); g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const t = new k.THREE.CanvasTexture(c); t.colorSpace = k.THREE.SRGBColorSpace; glowCache.set(rgb, t);
  }
  return glowCache.get(rgb);
}
// `n` additive sprites, each with its own material so each can fade on its own clock
function glowSprites(k, n, rgb, { additive = true } = {}) {
  const group = new k.THREE.Group(), list = [];
  for (let i = 0; i < n; i++) {
    const m = new k.THREE.SpriteMaterial({ map: glow(k, rgb), transparent: true, depthWrite: false, blending: additive ? k.THREE.AdditiveBlending : k.THREE.NormalBlending, opacity: 0 });
    const sp = new k.THREE.Sprite(m); group.add(sp); list.push(sp);
  }
  return { group, list };
}

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
    build(k) { const r = rng(4), list = []; for (let i = 0; i < 420; i++) { const a = r() * k.TAU, d = Math.pow(r(), 0.3) * 1.0; list.push({ x: Math.cos(a) * d, y: 0.012 + r() * 0.02, z: Math.sin(a) * d, rx: -Math.PI / 2 + (r() - 0.5) * 0.2, ry: r() * 6, s: 0.8 + r() * 0.6, color: r() < 0.4 ? 0xf6cfda : 0xf2bccb }); } const m = k.instances(new k.THREE.CircleGeometry(0.035, 6), k.M.plain(0xffffff, { rough: 0.7, side: k.THREE.DoubleSide, brush: 0 }), list); return m; } },
  { id: 'fireflies', family: 'life', name: 'Fireflies', jp: '蛍', tag: 'Each one blinks on its own clock', plinth: 'moss', hour: 21.5, animatedShadow: false,
    blurb: 'A loose swarm over the grass. The game’s version pulses all seventy together; here every firefly has its own phase, so the meadow shimmers instead of breathing.',
    how: ['A sprite per firefly, each with a glow of its own.', 'Position: a slow Lissajous around a home point. Light: sin² of its own clock, so most of the time it is dim.'], use: 'Meadow edges and the river bank after dusk.', sources: ['notes'],
    build(k) { const { group, list } = glowSprites(k, 26, '236, 236, 120'), r = rng(21); const home = list.map(() => ({ x: (r() - 0.5) * 1.9, y: 0.25 + r() * 0.8, z: (r() - 0.5) * 1.9, p: r() * 40, s: 0.5 + r() })); list.forEach((sp, i) => sp.scale.setScalar(0.16)); return { group, noCast: true, update(t) { list.forEach((sp, i) => { const h = home[i], b = 0.5 + 0.5 * Math.sin(t * 2.2 * h.s + h.p); sp.position.set(h.x + Math.sin(t * 0.5 * h.s + h.p) * 0.25, h.y + Math.sin(t * 0.9 * h.s + h.p * 2) * 0.12, h.z + Math.cos(t * 0.4 * h.s + h.p) * 0.25); sp.material.opacity = b * b; sp.scale.setScalar(0.1 + 0.12 * b); }); } }; } },
  { id: 'dust-motes', family: 'life', name: 'Dust motes', jp: '埃', tag: 'Visible only where the light is', plinth: 'stone', hour: 16, animatedShadow: false,
    blurb: 'Dust is everywhere and seen only in a shaft of light. A column of warm light with specks that drift through it and glint as they turn.',
    how: ['One faint additive card for the shaft.', 'Specks: tiny sprites that rise slowly and glint on a slow sine, brightest inside the column.'], use: 'Under eaves, through the grove, in the tea house.', sources: ['notes'],
    build(k) { const g = new k.THREE.Group(), shaft = new k.THREE.Mesh(new k.THREE.CylinderGeometry(0.35, 0.55, 1.8, 20, 1, true), new k.THREE.MeshBasicMaterial({ map: glow(k, '255, 226, 170'), color: 0xffe2aa, transparent: true, opacity: 0.1, depthWrite: false, blending: k.THREE.AdditiveBlending, side: k.THREE.DoubleSide })); shaft.position.y = 0.95; g.add(shaft); const { group, list } = glowSprites(k, 44, '255, 238, 205'), r = rng(8); const sp0 = list.map(() => ({ a: r() * k.TAU, d: Math.sqrt(r()) * 0.45, y: r() * 1.8, s: 0.05 + r() * 0.12, p: r() * 30 })); g.add(group); return { group: g, noCast: true, update(t) { list.forEach((sp, i) => { const h = sp0[i], y = (h.y + t * h.s) % 1.8; sp.position.set(Math.cos(h.a + t * 0.1) * h.d * (0.8 + y * 0.2), 0.1 + y, Math.sin(h.a + t * 0.1) * h.d * (0.8 + y * 0.2)); const gl = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(t * 0.9 + h.p), 3); sp.material.opacity = gl * 0.8 * Math.min(1, y * 3, (1.8 - y) * 3); sp.scale.setScalar(0.03 + 0.04 * gl); }); } }; } },
  { id: 'scent', family: 'life', name: 'Scent trail', jp: '残り香', tag: 'Honey fading to dusk behind the cat', plinth: 'moss', hour: 12, animatedShadow: false,
    blurb: 'The trail the cat leaves toward something worth finding. Each mote is born warm, drifts up a little and cools to orange as it ages, so the line reads as time as well as place.',
    how: ['A paw walks a figure-eight; every 0.08 s it drops a mote.', 'Each mote lives 3 s: colour honey → orange, opacity fades in then out, a gentle rise.'], use: 'Quest guidance that stays soft: it is there only when you are near something.', sources: ['notes'],
    build(k) { const { group, list } = glowSprites(k, 40, '255, 208, 128'), young = new k.THREE.Color(0xffd080), old = new k.THREE.Color(0xff7040); return { group, noCast: true, update(t) { list.forEach((sp, i) => { const age = ((t * 12.5 - i) % 40 + 40) % 40 / 40, tt = t - age * 3.2; sp.position.set(Math.sin(tt * 0.8) * 0.9, 0.08 + age * 0.35, Math.sin(tt * 1.6) * 0.45); sp.material.color.copy(young).lerp(old, age); sp.material.opacity = Math.min(1, age * 12) * (1 - age) * 0.8; sp.scale.setScalar(0.1 + 0.06 * (1 - age)); }); } }; } },
  { id: 'landing-dust', family: 'life', name: 'Landing dust', jp: '着地の埃', tag: 'A puff and a ring where the paws land', plinth: 'stone', hour: 12, animatedShadow: false,
    blurb: 'Six soft puffs roll out low to the ground when the cat lands from a jump, plus a thin ring on the dirt. It sells the weight of the landing.',
    how: ['Six sprites leave the contact point at spread-out angles, slow quickly and grow as they fade.', 'A flat ring expands once and is gone in 0.4 s.'], use: 'Every landing, scaled by the drop height.', sources: ['notes'],
    build(k) { const { group, list } = glowSprites(k, 6, '214, 196, 168', { additive: false }), ring = new k.THREE.Mesh(new k.THREE.RingGeometry(0.8, 1, 28).rotateX(-Math.PI / 2), new k.THREE.MeshBasicMaterial({ color: 0xe8dcc6, transparent: true, opacity: 0, depthWrite: false, side: k.THREE.DoubleSide })); ring.position.y = 0.01; group.add(ring); return { group, noCast: true, update(t) { const c = (t * 0.7) % 1.4, f = Math.min(1, c / 1.1), live = c < 1.1; list.forEach((sp, i) => { const a = (i / 6) * k.TAU + 0.4, d = 0.1 + 0.55 * (1 - Math.pow(1 - f, 2.2)); sp.position.set(Math.cos(a) * d, 0.06 + f * 0.18, Math.sin(a) * d); sp.scale.setScalar(live ? 0.2 + 0.4 * f : 0.001); sp.material.opacity = live ? 0.55 * (1 - f) * (1 - f) : 0; }); const rf = Math.min(1, c / 0.4); ring.scale.setScalar(0.1 + 0.9 * rf); ring.material.opacity = c < 0.4 ? 0.5 * (1 - rf) : 0; } }; } },
  { id: 'entry-splash', family: 'life', name: 'Water-entry splash', jp: '水しぶき', tag: 'Droplets that arc, fall and ring the surface', plinth: 'moss', hour: 12, animatedShadow: false,
    blurb: 'The cat steps or drops into water. Droplets erupt on a ballistic arc, each its own size, and every one that lands rings the surface.',
    how: ['Twenty droplets, spheres of random size, thrown outward and up with gravity.', 'A ring is born where each one comes back to the surface.'], use: 'Rivers, pools, the paddies: scaled by how hard the cat lands.', sources: ['notes'],
    build(k) { const g = new k.THREE.Group(), r = rng(5), dm = new k.THREE.MeshBasicMaterial({ color: 0xdff6f2, transparent: true, opacity: 0.9 }), drops = []; const geo = new k.THREE.SphereGeometry(0.03, 8, 6), rg = new k.THREE.RingGeometry(0.8, 1, 24).rotateX(-Math.PI / 2); for (let i = 0; i < 20; i++) { const a = r() * k.TAU, m = new k.THREE.Mesh(geo, dm.clone()), ring = new k.THREE.Mesh(rg, new k.THREE.MeshBasicMaterial({ color: 0xeef7f8, transparent: true, opacity: 0, depthWrite: false, side: k.THREE.DoubleSide })); m.scale.setScalar(0.5 + r() * 1.1); drops.push({ m, ring, vx: Math.cos(a) * (0.3 + r() * 0.6), vz: Math.sin(a) * (0.3 + r() * 0.6), vy: 1.7 + r() * 1.5, x0: Math.cos(a) * r() * 0.12, z0: Math.sin(a) * r() * 0.12 }); g.add(m, ring); } return { group: g, noCast: true, update(t) { const c = t % 2.2; for (const d of drops) { const y = 0.02 + d.vy * c - 4.9 * c * c, up = y > 0.02; d.m.visible = up && c < 1.2; d.m.position.set(d.x0 + d.vx * c, y, d.z0 + d.vz * c); d.m.material.opacity = 0.9; const tl = (2 * d.vy / 9.8), age = c - tl; if (age > 0 && age < 0.5) { d.ring.position.set(d.x0 + d.vx * tl, 0.02, d.z0 + d.vz * tl); d.ring.scale.setScalar(0.03 + 0.2 * age * 2); d.ring.material.opacity = 0.6 * (1 - age * 2); } else d.ring.material.opacity = 0; } } }; } } 
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
