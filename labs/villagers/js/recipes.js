// Lab 19 tiles. Tile code = build().
import * as THREE from 'three';
import { loadCatModule } from '../../shared/game.js';
import { V3, TAU } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { COATS, eyeShine } from './kit.js';

let Cat = null;
export const loadDeps = async () => { const m = await loadCatModule(); Cat = m.Cat; };
export const newCat = (o) => new Cat({ ...o, stripeAmount: o.stripes });

export const SOURCES = {
  nat: ['Nature Conservancy Blog · The science of eyeshine', 'https://blog.nature.org/2026/04/14/why-do-some-animals-eyes-glow-in-the-dark-the-science-of-eyeshine/', 'excerpt'],
  hep: ['Hepper · Why cats’ eyes glow', 'https://www.hepper.com/why-do-cats-eyes-glow-in-the-dark/', 'excerpt'],
  wiki: ['Wikipedia · Eyeshine', 'https://wikiwand.com/en/Eyeshine', 'excerpt'],
  hum: ['Humphrey et al., 2020 · Cat eye-narrowing and human communication', 'https://ui.adsabs.harvard.edu/abs/2020NatSR..1016503H', 'excerpt'],
  notes: ['Villagers research notes', 'research.md', 'notes']
};

export const FAMILIES = [
  { key: 'coats', title: 'Three cats, <em>three temperaments</em>', sub: 'Real game cats, from the NPC palette. Each has its own build and its own way of being a cat.' },
  { key: 'poses', title: 'What they do <em>all day</em>', sub: 'The idle actions the game already has, picked from a temperament table.' },
  { key: 'shine', title: 'Why their eyes <em>come back at you</em>', sub: 'The tapetum sends light back the way it came. It needs a light near the viewer, which is what a lantern is for.' }
];

const tile = (coat, action, extra = {}) => ({ k, seed, dt } = {}) => null;

const buildCat = (k, id, action, { scale = 1, shine = false } = {}) => {
  const c = COATS[id], cat = newCat({ fur: c.fur, belly: c.belly, accent: c.accent, eyeColor: c.eyeColor, ribbonColor: c.ribbon, stripes: c.stripes, build: c.build });
  cat.group.scale.setScalar(c.scale * scale);
  const group = new k.THREE.Group(); group.add(cat.group); cat.group.rotation.y = 0.5;
  let timer = 0;
  let shineC = shine ? eyeShine(cat, c.shine) : null;
  const cam = new k.THREE.Vector3(4, 2.4, 4), lp = new k.THREE.Vector3(4, 2.4, 4);
  return { group, update(t, dt) { if ((timer -= dt) < 0) { timer = 5; if (action) cat.startIdleAction(action, 5.5); } cat.update(dt, 0, true, false, false, false, null); if (shineC) { const a = Math.sin(t * 0.8) * 0.5 + 0.5; lp.set(4 + (1 - a) * 3, 2.4, 4 - (1 - a) * 5); shineC.update(lp, k.lab.heroCam ?? { position: cam }, 1); } } };
};

export const SPECIMENS = [
  { id: 'luna', family: 'coats', original: true, name: 'Luna', jp: 'ルナ', tag: 'Silver smoke, dignified', plinth: 'wood', hour: 15, animatedShadow: true, game: () => Cat,
    blurb: 'A real game Cat in her NPC palette and build: slender, with a slow blink for a hello.',
    how: ['The same Cat class the player uses, with the NPC’s coat and build.'], use: 'Baseline.', sources: ['notes'],
    build(k) { return buildCat(k, 'luna', 'sit'); } },
  { id: 'mochi', family: 'coats', original: true, name: 'Mochi', jp: 'モチ', tag: 'Round, and glad to see you', plinth: 'wood', hour: 15, animatedShadow: true, game: () => Cat,
    blurb: 'The bouncy one: round build, full tabby, always mid-stretch.',
    how: ['Mochi’s build makes a rounder trunk.'], use: 'Baseline.', sources: ['notes'],
    build(k) { return buildCat(k, 'mochi', 'stretch'); } },
  { id: 'kuro', family: 'coats', original: true, name: 'Kuro', jp: 'クロ', tag: 'A black coat, unbothered', plinth: 'wood', hour: 15, animatedShadow: true, game: () => Cat,
    blurb: 'Near-black fur gets a cool sheen so he reads as black under warm light rather than brown.',
    how: ['Dark coats turn on the cool-light sheen automatically.'], use: 'Baseline.', sources: ['notes'],
    build(k) { return buildCat(k, 'kuro', 'sit'); } },

  { id: 'groom', family: 'poses', name: 'Grooming', jp: '毛づくろい', tag: 'Paw, lick, behind the ear', plinth: 'wood', hour: 15, animatedShadow: true,
    blurb: 'The game’s existing grooming: a sitting pose, then a paw lifted and licked and a wash behind the ear.',
    how: ['An idle action played through the same pose system.'], use: 'Luna, mostly.', sources: ['notes'],
    build(k) { return buildCat(k, 'luna', 'groom'); } },
  { id: 'yawn', family: 'poses', name: 'A yawn', jp: 'あくび', tag: 'Wide, and then sleepy', plinth: 'wood', hour: 15, animatedShadow: true,
    blurb: 'Head back, jaw open, then settled. Mochi yawns a lot.',
    how: ['An idle action.'], use: 'Before sleep.', sources: ['notes'],
    build(k) { return buildCat(k, 'mochi', 'yawn'); } },
  { id: 'sleep', family: 'poses', name: 'Asleep', jp: '眠り', tag: 'Curled up, breathing', plinth: 'wood', hour: 15, animatedShadow: true,
    blurb: 'The night pose, with the breathing the game drives through the rib cage.',
    how: ['startIdleAction(\'sleep\', 9999).'], use: 'After dark, at each cat’s own spot.', sources: ['notes'],
    build(k) { return buildCat(k, 'michi', 'sleep'); } },

  { id: 'shine', family: 'shine', name: 'Eye-shine', jp: '目の光', tag: 'A sprite on each eye, gated by angle', plinth: 'wood', hour: 21, animatedShadow: true,
    blurb: 'The tapetum sends light back toward its source. Each eye gets an additive sprite that opens only when viewer, light and eye are in line.',
    how: ['pow(dot(toLight, toViewer), 40) is the retroreflection.', 'Colour leans yellow-green in most cats.'], use: 'Villagers at dusk; a nice surprise.', sources: ['nat', 'wiki', 'hep'], also: [eyeShine],
    build(k) { return buildCat(k, 'kuro', 'sit', { shine: true }); } }
];

export const STEPS = [
  { title: 'A cat that does nothing', body: '<p>One idle pose, and it is suddenly a very good statue.</p>', phase: 0 },
  { title: 'Give it a repertoire', body: '<p>Groom, sit, stretch, yawn. Weighted per cat, and the weights are the personality.</p>', code: "idle: { weights: { groom: .42, sit: .4, stretch: .1, yawn: .08 } }", phase: 1 },
  { title: 'Let it notice you', body: '<p>It turns its head at about eight metres and greets you when you are close.</p>', phase: 2 },
  { title: 'Send the light back', body: '<p>At dusk, with a light near your eyes, two small discs appear and are gone again.</p>', code: 'back = pow(max(0, dot(toLight, toViewer)), 40)', phase: 3 }
];

export const ASSEMBLY = {
  radius: 1, target: [0, 0.3, 0], shadow: 2,
  build(k) {
    const c = COATS.luna, cat = newCat({ fur: c.fur, belly: c.belly, accent: c.accent, eyeColor: c.eyeColor, ribbonColor: c.ribbon, stripes: c.stripes, build: c.build });
    cat.group.rotation.y = 0.5;
    const root = new k.THREE.Group(); root.add(cat.group);
    const base = new k.THREE.Mesh(new k.THREE.CylinderGeometry(0.9, 0.9, 0.05, 32), k.M.plain(0xb7a988)); base.position.y = -0.03; root.add(base);
    let t0 = 0;
    return { group: root, setPhase(p) { if (p >= 1) cat.startIdleAction(p === 2 ? 'sit' : 'groom', 5.5); }, update(t, dt) { cat.update(dt, 0, true, false, false, false, null); } };
  }
};
