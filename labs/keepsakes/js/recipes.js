// Lab 17 tiles. Tile code = build().
import * as THREE from 'three';
import { gameKit, ensureCountryside, ownMaterials } from '../../shared/original.js';
import { V3, TAU, Bag } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { yarnGeometry, yarnMat, fuzzShells, keyGeometry, glintSprite, YARN_COL } from './kit.js';

let cs = null;
export const loadDeps = async () => { cs = (await ensureCountryside()).prototype; };
const G = (n) => () => cs[n];

export const SOURCES = {
  fuzzy: ['Zadvorsky · Fuzzy Meshes', 'https://medium.com/@Zadvorsky/fuzzy-meshes-4c7fd3910d6f', 'excerpt'],
  fur: ['piellardj · fur-threejs (shells and fins)', 'https://piellardj.github.io/fur-threejs/readme', 'excerpt'],
  shell: ['Godot Shaders · fur/grass with shell texturing', 'https://godotshaders.com/shader/fur-grass-with-shell-texturing/', 'excerpt'],
  thread: ['three.js forum · interactive thread/cable simulation', 'https://discourse.threejs.org/t/interactive-thread-cable-simulation-in-three-js/92563', 'excerpt'],
  kay: ['Three.js From Zero · hair and fur', 'https://masterallarts.pages.dev/learn/threejs-from-zero/s4-07-hair-fur/', 'excerpt'],
  phys: ['Three.js docs · MeshPhysicalMaterial sheen', 'https://threejs.org/docs/pages/MeshPhysicalMaterial.html', 'docs'],
  notes: ['Keepsakes research notes', 'research.md', 'notes']
};

export const FAMILIES = [
  { key: 'yarn', title: 'Thread, <em>wound round a ball</em>', sub: 'A sphere is a sphere. Yarn is many strands going round, and you can tell from across a field.' },
  { key: 'key', title: 'Something <em>worth finding</em>', sub: 'The game’s key has a halo ring. Compare that to a key shaped like a key that glints only now and then.' },
  { key: 'read', title: 'Can you <em>spot it?</em>', sub: 'The grass got a lot busier. Everything here is measured against it on the stage.' }
];

const sphere = (k, m) => new k.THREE.Mesh(new k.THREE.SphereGeometry(0.18, 24, 18), m);

export const SPECIMENS = [
  { id: 'game-yarn', family: 'yarn', original: true, name: 'Our yarn', jp: '今の毛糸', tag: 'buildYarn(), as it stands', plinth: 'moss', hour: 12, game: G('buildYarn'),
    blurb: 'A pink sphere with a single torus around it. Emissive, so it keeps reading in shade.',
    how: ['SphereGeometry plus one TorusGeometry.'], use: 'Baseline.', sources: ['notes'],
    build(k) { const kit = gameKit(); kit.buildYarn(); const y = kit.collectibles[0]; y.position.set(0, 0.22, 0); return ownMaterials(y); } },
  { id: 'wound', family: 'yarn', name: 'Wound thread', jp: '巻き糸', tag: 'Dozens of strands around a ball', plinth: 'moss', hour: 12,
    blurb: 'Several bands of tube-swept thread, each going round its own axis, the way you actually wind a ball.',
    how: ['Each band is a tube on a great circle; bands cross at random axes.'], use: 'The new collectible.', sources: ['kay'], also: [yarnGeometry],
    build(k) { const m = new k.THREE.Mesh(yarnGeometry(), yarnMat()); m.position.y = 0.22; return m; } },
  { id: 'sheen', family: 'yarn', name: 'Fibre sheen', jp: '光沢', tag: 'Light that hugs the edge', plinth: 'moss', hour: 12,
    blurb: 'Cloth’s characteristic edge glow, from MeshPhysicalMaterial’s sheen term. Good cheap readability.',
    how: ['sheen 1, sheenRoughness 0.55, sheenColor paler than the base.'], use: 'Against dark grass.', sources: ['phys', 'kay'], also: [yarnMat],
    build(k) { const m = new k.THREE.Mesh(yarnGeometry(), yarnMat(YARN_COL.indigo)); m.position.y = 0.22; return m; } },
  { id: 'fuzz', family: 'yarn', name: 'Shell fuzz', jp: '毛羽', tag: 'Twelve shells with little holes in them', plinth: 'moss', hour: 12,
    blurb: 'Shell texturing: draw the ball a dozen times, each one a little bigger and thinner. Fuzz, with no hair geometry.',
    how: ['Each shell discards more pixels than the last.', '12 draws: nice up close, not for a whole meadow.'], use: 'The one yarn the cat is about to bat.', sources: ['fuzzy', 'fur', 'shell'], also: [fuzzShells],
    build(k) { const g = yarnGeometry(0.16); const w = new k.THREE.Group(); w.add(new k.THREE.Mesh(g, yarnMat(YARN_COL.ochre))); w.add(fuzzShells(g, YARN_COL.ochre, { layers: 10 })); w.position.y = 0.22; return w; } },
  { id: 'colors', family: 'yarn', name: 'A basket of colours', jp: '色', tag: 'Ten yarns, ten colours', plinth: 'wood', hour: 12,
    blurb: 'If you want to tell them apart in a field, keep the colours warm and let the field stay green and yellow.',
    how: ['Same geometry, several materials.'], use: 'Decide which colours survive the meadow.', sources: ['notes'],
    build(k) { const g = new k.THREE.Group(), base = yarnGeometry(0.13); Object.values(YARN_COL).forEach((c, i) => { const m = new k.THREE.Mesh(base, yarnMat(c)); m.position.set((i - 2) * 0.28, 0.14, (i % 2) * 0.16); g.add(m); }); return g; } },

  { id: 'game-key', family: 'key', original: true, name: 'Our key', jp: '今の鍵', tag: 'buildSecretKey(), as it stands', plinth: 'moss', hour: 12, game: G('buildSecretKey'),
    blurb: 'A gold torus, a stem, wards made of boxes and a flat yellow ring behind it to catch your eye.',
    how: ['Torus and boxes; a RingGeometry halo.'], use: 'Baseline.', sources: ['notes'],
    build(k) { const kit = gameKit(); kit.buildSecretKey(0, 0.42, 0); return ownMaterials(kit.scene); } },
  { id: 'old-key', family: 'key', name: 'An old key', jp: '古鍵', tag: 'Worn gold, proper wards', plinth: 'moss', hour: 12,
    blurb: 'A shaped bow with an inner ring and a stepped bit: reads as an object rather than a symbol.',
    how: ['Torus bow, cylinder stem, small boxes for the wards.'], use: 'The real key.', sources: ['notes'], also: [keyGeometry],
    build(k) { const b = keyGeometry(); const m = b.mesh(k.M.bag({ metal: 0.85, rough: 0.34 })); m.position.y = 0.4; m.rotation.z = -0.5; const g = new k.THREE.Group(); g.add(m); return g; } },
  { id: 'glint', family: 'key', name: 'A soft glint', jp: '瞬き', tag: 'Only sometimes, so you notice', plinth: 'moss', hour: 12, animatedShadow: false,
    blurb: 'A small four-point sparkle that blooms for a moment every few seconds. It’s the timing that catches the eye.',
    how: ['An additive sprite with a depth-independent pop.', 'Each key is on its own slow timer.'], use: 'The stage’s preferred way to mark a key.', sources: ['notes'], also: [glintSprite],
    build(k) { const b = keyGeometry(), m = b.mesh(k.M.bag({ metal: 0.85, rough: 0.34 })); m.position.y = 0.4; m.rotation.z = -0.5; const s = glintSprite(); s.position.set(0.06, 0.5, 0.04); const g = new k.THREE.Group(); g.add(m, s); return { group: g, noCast: true, update: (t) => { const p = (Math.sin(t * 1.6) + 1) / 2, e = Math.pow(p, 18); s.material.opacity = e; s.scale.setScalar(0.08 + e * 0.32); s.material.rotation = t * 0.3; } }; } },

  { id: 'vs-field', family: 'read', name: 'Against the grass', jp: '草と毛糸', tag: 'What survives the meadow', plinth: 'moss', hour: 12, animatedShadow: false,
    blurb: 'Same object, six treatments, lined up as they would be in a meadow. Squint at them.',
    how: ['Each uses a different combination of emissive, sheen, and contrast.'], use: 'Used to pick the stage’s best treatment.', sources: ['notes'],
    build(k) { const g = new k.THREE.Group(), geo = yarnGeometry(0.13); const mats = [new k.THREE.MeshStandardMaterial({ color: 0xe04a7a, emissive: 0x701030, emissiveIntensity: 0.5, roughness: 0.7 }), yarnMat(YARN_COL.peony), yarnMat(YARN_COL.snow), yarnMat(YARN_COL.ochre), yarnMat(YARN_COL.indigo), new k.THREE.MeshStandardMaterial({ color: 0xf0d060, emissive: 0x806010, emissiveIntensity: 0.6 })]; mats.forEach((mat, i) => { const m = new k.THREE.Mesh(geo, mat); m.position.set((i % 3 - 1) * 0.4, 0.15, (Math.floor(i / 3) - 0.5) * 0.45); g.add(m); }); return g; } }
];

export const STEPS = [
  { title: 'Wind a band', body: '<p>Pick a great circle, run a tube around it, and bump it slightly in and out so it doesn’t look machine wound.</p>', code: 'tube(greatCircle, r, { radial: 5 })', phase: 0 },
  { title: 'Wind another', body: '<p>Same again around a different axis. Bands crossing each other is what reads as yarn.</p>', phase: 1 },
  { title: 'Bring out the fibre', body: '<p>Sheen gives an edge glow that responds to light, the way cloth does.</p>', code: 'sheen: 1, sheenRoughness: .55', phase: 2 },
  { title: 'Fuzz', body: '<p>Twelve shells that each discard a few more pixels. Only for the one you are about to touch.</p>', phase: 3 }
];

export const ASSEMBLY = {
  radius: 0.6, target: [0, 0.3, 0], shadow: 1.2,
  build(k) {
    const g = new k.THREE.Group(), bands = [1, 2, 6].map((n) => new k.THREE.Mesh(yarnGeometry(0.2, { bands: n }), yarnMat())); bands.forEach((b) => { b.position.y = 0.3; g.add(b); });
    const base = new k.THREE.Mesh(new k.THREE.CylinderGeometry(0.5, 0.5, 0.04, 32), k.M.plain(0x6b7c4e)); base.position.y = -0.02; g.add(base);
    const fuzz = fuzzShells(yarnGeometry(0.2), YARN_COL.peony, { layers: 12 }); fuzz.position.y = 0.3; g.add(fuzz);
    return { group: g, setPhase(p) { bands.forEach((b, i) => { b.visible = i === Math.min(p, 2); }); fuzz.visible = p >= 3; } };
  }
};
