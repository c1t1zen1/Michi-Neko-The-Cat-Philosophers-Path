// Lab 14 tiles. Tile code = build().
import * as THREE from 'three';
import { originalOf, gameKit, ensureCountryside, ownMaterials } from '../../shared/original.js';
import { V3, TAU, Bag } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { shishiOdoshi, waterHarp, furin, sozu } from './kit.js';

let cs = null;
export const loadDeps = async () => { cs = (await ensureCountryside()).prototype; };
const G = (n) => () => cs[n];

export const SOURCES = {
  nab: ['Nabunken · Deer scarer (shishi-odoshi)', 'https://www.nabunken.go.jp/org/bunka/jgd/pages/DeerScarer.html', 'excerpt'],
  prim: ['Primrose · how a bamboo water feature works', 'https://www.primrose.co.uk/blog/?p=15631', 'excerpt'],
  jila: ['Watanabe et al., 1991 · suikinkutsu resonance (JILA)', 'https://www.jstage.jst.go.jp/article/jila1934/55/5/55_5_133/_article/-char/en', 'excerpt'],
  ca: ['Contemporary Aesthetics · From Edo gardens to Kankyō Ongaku', 'https://contempaesthetics.org/2026/05/23/from-edo-gardens-to-kankyo-ongaku-environmental-music-appreciation-of-environmental-sound-in-japan/', 'excerpt'],
  webaudio: ['MDN · Web Audio API', 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API', 'docs'],
  phys: ['Three.js docs · MeshPhysicalMaterial', 'https://threejs.org/docs/pages/MeshPhysicalMaterial.html', 'docs'],
  notes: ['Garden research notes', 'research.md', 'notes']
};

export const FAMILIES = [
  { key: 'shishi', title: 'The sound of a <em>tube filling</em>', sub: 'The game’s rocker is a mesh that tips on a timer. A real one tips because of the water.' },
  { key: 'furin', title: 'Glass in <em>the wind</em>', sub: 'The game’s chime, then a blown bell, its paper strip, and an iron one from Morioka.' },
  { key: 'harp', title: 'An instrument <em>under the ground</em>', sub: 'Suikinkutsu: a jar buried upside-down, so drops of water ring inside it.' }
];

const anim = (m) => ({ group: m.group, update: (t, dt) => m.update(dt) });

export const SPECIMENS = [
  { id: 'game-shishi', family: 'shishi', original: true, name: 'Our shishi-odoshi', jp: '今の鹿威し', tag: 'buildShishiOdoshi(), as it stands', plinth: 'moss', hour: 16, game: G('buildShishiOdoshi'),
    blurb: 'A stone basin, a spout and a bamboo rocker that the game animates. Pivot posts and a tube, all boxes and cylinders.',
    how: ['The rocker is a plain cylinder, rotated from main.js.'], use: 'Baseline.', sources: ['nab'],
    build(k) { const kit = gameKit(); const g = new k.THREE.Group(); kit.buildShishiOdoshi(0, 0, 0, g); return ownMaterials(g); } },
  { id: 'shishi', family: 'shishi', name: 'A working sōzu', jp: '添水', tag: 'Cut on the diagonal, tipped by its own water', plinth: 'moss', hour: 16, animatedShadow: true,
    blurb: 'A tube cut on the diagonal, weighted so the empty end sits heavy. Water runs in, the balance shifts, and it tips and clacks back onto the stone.',
    how: ['Fill rises with flow; the pivot angle follows it until it passes the balance point.', 'Then gravity, the stone, and a little bounce.'], use: 'The stage version. Flow changes the rhythm.', sources: ['nab', 'prim'], also: [shishiOdoshi],
    build(k) { return anim(shishiOdoshi({ flow: 1.4 })); } },
  { id: 'sozu-cut', family: 'shishi', name: 'The diagonal cut', jp: '切り口', tag: 'Where the water sits', plinth: 'moss', hour: 16,
    blurb: 'The mouth is cut on a slant so the tube can hold water until it tips far enough to dump it. A straight cut would not work.',
    how: ['The top of the open end is slid back with x by height.'], use: 'A close-up study of what the eye reads.', sources: ['prim'], also: [sozu],
    build(k) { const m = sozu({ len: 0.8, r: 0.07 }); m.rotation.z = 0.3; m.position.y = 0.2; return m; } },

  { id: 'game-chime', family: 'furin', original: true, name: 'Our wind chime', jp: '今の風鈴', tag: 'buildWindChime(), as it stands', plinth: 'wood', hour: 16, game: G('buildWindChime'),
    blurb: 'A half-sphere dome, a clapper and a paper tag, hung from the tea house eave.',
    how: ['Half a sphere, a small cylinder, a thin box tag.'], use: 'Baseline.', sources: ['notes'],
    build(k) { const kit = gameKit(); kit.buildWindChime(0, 0.92, 0); return ownMaterials(kit.scene); } },
  { id: 'glass', family: 'furin', name: 'Blown glass', jp: 'ガラス風鈴', tag: 'A bell, a clapper and a paper strip', plinth: 'wood', hour: 16, animatedShadow: true,
    blurb: 'Blown glass with a real profile, a damped spring for the bell and a second, faster one for the paper strip.',
    how: ['Two coupled springs driven by the wind.', 'It sings when the strip swings hard enough to knock the clapper.'], use: 'The tea house eave.', sources: ['phys'], also: [furin],
    build(k) { const f = furin({}); const g = new k.THREE.Group(); f.group.position.y = 0.72; g.add(f.group); return { group: g, update: (t, dt) => f.update(dt, 1, t) }; } },
  { id: 'iron', family: 'furin', name: 'Nanbu iron', jp: '南部風鈴', tag: 'Cast iron, and a very long ring', plinth: 'wood', hour: 16, animatedShadow: true,
    blurb: 'A cast-iron bell from Morioka: heavier, darker, and it rings for several seconds.',
    how: ['The same builder with a dark, rough metal in place of the glass.'], use: 'Temple porches.', sources: ['notes'], also: [furin],
    build(k) { const f = furin({ hue: 0x2c2a28 }); f.group.traverse((o) => { if (o.material?.isMeshPhysicalMaterial) { o.material = k.M.plain(0x2c2a28, { rough: 0.55, metal: 0.8, side: k.THREE.DoubleSide }); } }); const g = new k.THREE.Group(); f.group.position.y = 0.72; g.add(f.group); return { group: g, update: (t, dt) => f.update(dt, 0.8, t) }; } },

  { id: 'harp', family: 'harp', name: 'The buried jar', jp: '水琴窟', tag: 'Drops ring inside a pot underground', plinth: 'stone', hour: 16, animatedShadow: false,
    blurb: 'A buried jar turned upside-down with a hole in the top, seen in cutaway. Each drop excites the air inside it, and the sound comes back up through the gravel.',
    how: ['An upside-down, open sphere with a pool in the bottom.', 'On the stage, drips trigger tones.'], use: 'The stage’s heart. Use real audio.', sources: ['jila', 'ca', 'webaudio'], also: [waterHarp],
    build(k) { const h = waterHarp(); h.group.position.y = 0.55; return h.group; } }
];

export const STEPS = [
  { title: 'Hang it from the pivot', body: '<p>The tube sits on a bar a little off centre. With nothing in it, the closed end is the heavy one, and it rests down on the stone.</p>', phase: 0 },
  { title: 'Let the water in', body: '<p>Water runs into the mouth. The balance point creeps toward the open end, and the tube begins to tilt back.</p>', code: 'S.fill += dt * 0.26 * flow', phase: 1 },
  { title: 'Tip', body: '<p>Past the balance point, it falls open-end down, dumps its water, and is suddenly very light.</p>', code: 'if (S.fill >= 1) S.va = -2.8', phase: 2 },
  { title: 'Clack', body: '<p>The closed end comes down onto the stone. The rhythm is set by the flow: faster water, more frequent clacks.</p>', code: 'if (S.a >= rest) { onClack(); S.va = -S.va * 0.32; }', phase: 3 }
];

export const ASSEMBLY = {
  radius: 1.1, target: [0, 0.5, 0], shadow: 3,
  build(k) {
    const m = shishiOdoshi({ flow: 1.4 }); const base = new k.THREE.Mesh(new k.THREE.CylinderGeometry(1, 1, 0.06, 32), k.M.plain(0xbdb8a7)); base.position.y = -0.03; base.userData.noShadow = true; m.group.add(base);
    let flowOn = false;
    return { group: m.group, setPhase(p) { flowOn = p >= 1; }, update(t, dt) { if (flowOn) m.update(dt); else m.pivot.rotation.z = -0.28; } };
  }
};
