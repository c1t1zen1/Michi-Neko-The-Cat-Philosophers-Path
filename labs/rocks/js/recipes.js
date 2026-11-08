// Lab 13 tiles. Tile code = build().
import * as THREE from 'three';
import { originalOf, gameKit, ensureCountryside, ownMaterials } from '../../shared/original.js';
import { loadSculptModule } from '../../shared/game.js';
import { V3, Bag, rockGeometry, TAU, fbm3, instances } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { FORMS, stone, gravelCanvas, drawRakeStroke } from './kit.js';

let cs = null, sculpt = null;
export const loadDeps = async () => { cs = (await ensureCountryside()).prototype; const m = await loadSculptModule(); sculpt = (list, h, o) => m.sculptGeometry(m.compilePrims(list), h, o); };
const G = (n) => () => cs[n];

export const SOURCES = {
  naban: ['Nabunken · Five basic stone shapes', 'https://www.nabunken.go.jp/org/bunka/jgd/pages/FiveBasicStoneShapes.html', 'excerpt'],
  jaanus: ['JAANUS · sanzon iwagumi 三尊石組', 'https://projects.mcah.columbia.edu/jaanus/node/1513', 'excerpt'],
  ishi: ['JAANUS · ishigumi 石組', 'https://aisf.or.jp/~jaanus/deta/i/ishigumi.htm', 'excerpt'],
  guide: ['Landscape Gardening in Japan (1912) · garden stones', 'https://www.gardenvisit.com/book/landscape_gardening_in_japan_1912/chapter_2_garden_stones/stone_names_related_to_positions', 'excerpt'],
  rocks100k: ['three.js forum · 100K procedural rocks, brutally optimized', 'https://discourse.threejs.org/t/100k-procedural-rocks-brutally-optimized/89578', 'excerpt'],
  moss: ['GrassSystemThreeJS · moss via onBeforeCompile on up-facing surfaces', 'https://github.com/achrefelouafi/GrassSystemThreeJS', 'excerpt'],
  surfnets: ['0fps · Surface nets', 'https://0fps.net/2012/07/12/smooth-voxel-terrain-part-2/', 'from memory of the method'],
  smin: ['Inigo Quilez · smooth minimum', 'https://iquilezles.org/articles/smin/', 'from memory of the method'],
  notes: ['Rocks research notes', 'research.md', 'notes']
};

export const FAMILIES = [
  { key: 'stones', title: 'How to <em>make a stone</em>', sub: 'The game’s dodecahedron, then four ways of carving one: noise alone, planes that chisel, and a full sculpted field.' },
  { key: 'forms', title: 'The five <em>named stones</em>', sub: 'An Edo manual reduced garden stones to five forms. Every arrangement is built from these.' },
  { key: 'moss', title: 'Years, in <em>one number</em>', sub: 'Moss and lichen settle where a stone faces the sky. It is all one shader.' },
  { key: 'gravel', title: 'Raked <em>gravel</em>', sub: 'The grooves that make still gravel read as water.' }
];

export const SPECIMENS = [
  { id: 'game-boulder', family: 'stones', original: true, name: 'A path boulder', jp: '今の岩', tag: 'A scaled dodecahedron', plinth: 'earth', hour: 15, game: G('buildPathBoulders'),
    blurb: 'One of the real path boulders: a dodecahedron stretched at random. Cheap, and flat-shaded, it reads as a rock at a distance.',
    how: ['A twelve-faced Dodecahedron, rotated and non-uniformly scaled.'], use: 'Baseline.', sources: ['notes'],
    build(k) { const g = new k.THREE.Group(); const m = new k.THREE.Mesh(new k.THREE.DodecahedronGeometry(1, 0), new k.THREE.MeshStandardMaterial({ color: 0x8d8d86, roughness: 0.92 })); m.scale.set(0.5, 0.42, 0.56); m.rotation.set(0.5, 0.8, 0.2); m.position.y = 0.3; g.add(m); return g; } },
  { id: 'game-rock', family: 'stones', original: true, name: 'The key rock', jp: '鍵の岩', tag: 'buildKeyHidingRock(), as it stands', plinth: 'earth', hour: 15, game: G('buildKeyHidingRock'),
    blurb: 'The hiding rock from the real game with its two small companions.',
    how: ['A subdivided dodecahedron plus two low ones.'], use: 'Baseline.', sources: ['notes'],
    build(k) { const kit = gameKit(6); kit.buildKeyHidingRock(0, 0); return ownMaterials(kit.scene); } },
  { id: 'noise', family: 'stones', name: 'Noise only', jp: 'ノイズ', tag: 'An icosphere, pushed in and out', plinth: 'earth', hour: 15,
    blurb: 'Plain fbm displacement on a sphere. Quick, and the result always looks more like a potato than a stone.',
    how: ['Icosphere, detail 5, displaced along normals by fbm.'], use: 'A reminder of why you need the next one.', sources: ['rocks100k'], also: [rockGeometry],
    build(k) { const g = rockGeometry(3, { cuts: 0, rough: 0.28, ridge: 0, flat: 0.3, h: 0.8, w: 0.8, d: 0.72 }); const m = new k.THREE.Mesh(g, k.M.rock({ moss: 0.1, lichen: 0.2 })); m.position.y = 0.5; return m; } },
  { id: 'chisel', family: 'stones', name: 'Chiselled planes', jp: '割面', tag: 'Cut with planes, then roughened', plinth: 'earth', hour: 15,
    blurb: 'Random planes clip the sphere, leaving hard faces and edges, and then a little warped noise roughens them. This is the trick that makes it stone.',
    how: ['Each vertex is pushed back to any plane it crosses.', 'Then fbm and ridged noise in a warped domain.'], use: 'The default valley rock.', sources: ['rocks100k'], also: [rockGeometry],
    build(k) { const g = rockGeometry(7, { cuts: 10, cutDepth: 0.66, rough: 0.14, ridge: 0.06 }); const m = new k.THREE.Mesh(g, k.M.rock({ moss: 0.25 })); m.position.y = 0.45; return m; } },
  { id: 'sculpt', family: 'stones', name: 'Sculpted field', jp: '彫塑', tag: 'Smooth union and carving', plinth: 'earth', hour: 15,
    blurb: 'Soft lobes unioned together, with a carved cleft and pockets taken out, meshed with surface nets. Good for rocks you want a particular shape from.',
    how: ['A field of smooth-unioned ellipsoids minus carving ellipsoids.', 'Meshed once at load.'], use: 'Hero stones, and the rock the key hides under.', sources: ['smin', 'surfnets'],
    build(k) { const p = (c, r, sub) => ({ type: 'ellipsoid', c, r, blend: sub ? 0.04 : 0.12, ...(sub ? { sub: true } : {}) }); const g = sculpt([p([0, 0.45, 0], [0.62, 0.5, 0.48]), p([0.35, 0.25, 0.2], [0.42, 0.32, 0.34]), p([-0.38, 0.32, -0.12], [0.36, 0.4, 0.34]), p([0.1, 0.72, 0.1], [0.28, 0.2, 0.26]), p([-0.05, 0.42, 0.56], [0.1, 0.32, 0.12], true), p([0.5, 0.65, -0.2], [0.18, 0.14, 0.16], true)], 0.024, { relax: 3 }); const m = new k.THREE.Mesh(g, k.M.rock({ moss: 0.3, a: 0x5b5851, b: 0x9b958a })); return m; } },
  ...Object.entries(FORMS).map(([id, F], i) => ({
    id, family: 'forms', name: F.label, jp: ['体胴石', '霊象石', '心体石', '枝形石', '寄脚石'][i], tag: F.en, plinth: 'gravel', hour: 15,
    blurb: `${F.en}: ${F.hint}. From the Edo-period manual Ishigumi sonō yaegakiden.`,
    how: ['Non-uniform scale on the chiselled rock, with its own number of cuts.'], use: 'One of the five forms on the stage’s palette.', sources: ['naban', 'guide'], also: [stone],
    build: new Function('k', `return window.__rockStone(${JSON.stringify(id)}, k);`)
  })),
  { id: 'sanzon', family: 'forms', name: 'Sanzon', jp: '三尊石組', tag: 'One large, two smaller, leaning in', plinth: 'gravel', hour: 15,
    blurb: 'The triad at the heart of Japanese stone arrangement: a tall central stone flanked by two lower ones leaning toward it.',
    how: ['A taidō stone with reishō stones tilted inward.'], use: 'The first thing to try on the stage.', sources: ['jaanus', 'ishi'],
    build(k) { const g = new k.THREE.Group(); const a = stone('taido', { seed: 11 }); a.position.y = 0.7; g.add(a); const b = stone('reisho', { seed: 12, scale: 0.8 }); b.position.set(-0.75, 0.4, 0.15); b.rotation.z = -0.16; g.add(b); const c = stone('reisho', { seed: 13, scale: 0.65 }); c.position.set(0.72, 0.32, 0.2); c.rotation.z = 0.2; g.add(c); return g; } },
  { id: 'moss-young', family: 'moss', name: 'Just moved', jp: '新しい石', tag: 'No moss, bare stone', plinth: 'moss', hour: 15,
    blurb: 'Stone straight off the cart. The colour and bump are all in the shader.',
    how: ['Moss set to zero; brush and rock colour remain.'], use: 'Freshly built walls.', sources: ['moss'],
    build(k) { const m = stone('kikyaku', { seed: 21, moss: 0, lichen: 0.1 }); m.position.y = 0.26; return m; } },
  { id: 'moss-old', family: 'moss', name: 'A hundred years', jp: '苔むす', tag: 'Moss wherever it faces the sky', plinth: 'moss', hour: 15,
    blurb: 'Moss gathers above a slope threshold broken up by noise, and pale lichen scatters across the rest.',
    how: ['moss = smoothstep(normal.y + noise) × amount, in world space.', 'The noise makes the edge ragged rather than a line.'], use: 'Most rocks in the valley.', sources: ['moss', 'rocks100k'],
    build(k) { const m = stone('kikyaku', { seed: 21, moss: 1.2, lichen: 0.8 }); m.position.y = 0.26; return m; } },
  { id: 'rake', family: 'gravel', name: 'Raked gravel', jp: '枯山水', tag: 'Grooves drawn into the ground', plinth: 'none', hour: 15, animatedShadow: false, plinthW: 3,
    blurb: 'The stage’s rake: a dark groove and a lit edge for each tine, drawn in canvas strokes. The eye reads ripples.',
    how: ['Each tine is a dark line with a pale line beside it, following your pointer.'], use: 'The stage’s rake tool.', sources: ['notes'], also: [drawRakeStroke],
    build(k) {
      const [c, x] = gravelCanvas(512); const pts = []; for (let i = 0; i < 90; i++) { const t = i / 89; pts.push([t * 512, 256 + Math.sin(t * 9) * 80]); }
      drawRakeStroke(x, pts, 0, { lines: 9, spacing: 12 });
      for (let y = 40; y < 512; y += 66) drawRakeStroke(x, [[0, y], [256, y + 14], [512, y]], 0, { lines: 5, spacing: 6, dark: 'rgba(90,82,62,.3)' });
      const m = new k.THREE.Mesh(new k.THREE.BoxGeometry(2.8, 0.18, 2.8), [k.M.plain(0xb6ad96), k.M.plain(0xb6ad96), new k.THREE.MeshStandardMaterial({ map: k.canvasTexture(c), roughness: 1 }), k.M.plain(0xb6ad96), k.M.plain(0xb6ad96), k.M.plain(0xb6ad96)]);
      m.position.y = -0.09; const g = new k.THREE.Group(); g.add(m); const s = stone('reisho', { seed: 31, scale: 0.8 }); s.position.set(0.2, 0.42, 0); g.add(s); return g;
    } }
];
window.__rockStone = (id, k) => { const m = stone(id, { seed: 41 + Object.keys(FORMS).indexOf(id) }); m.position.y = FORMS[id].h * 0.36; return m; };

export const STEPS = [
  { title: 'Start with a sphere', body: '<p>Twenty thousand triangles of nothing in particular.</p>', phase: 0 },
  { title: 'Cut it with planes', body: '<p>Pick a few random directions and flatten everything past them. Suddenly it has faces and edges, and that is most of what a stone is.</p>', code: 'if (dot(p, n) > d) p -= n * (dot(p, n) - d)', phase: 1 },
  { title: 'Warp the noise', body: '<p>Displace it with noise whose coordinates are themselves shifted by noise. The fractures stop looking like grid-aligned bumps.</p>', phase: 2 },
  { title: 'Let the moss in', body: '<p>Paint it in world space where the surface faces up.</p>', code: 'float moss = smoothstep(.1, .72, n.y + noise);', phase: 3 }
];

export const ASSEMBLY = {
  radius: 1.3, target: [0, 0.4, 0], shadow: 3,
  build(k) {
    const root = new k.THREE.Group(), base = new k.THREE.Mesh(new k.THREE.CylinderGeometry(1, 1, 0.06, 32), k.M.plain(0xd3cbb5)); base.position.y = -0.03; base.userData.noShadow = true; root.add(base);
    let inner = null;
    const build = (p) => { if (inner) root.remove(inner); const g = rockGeometry(7, { cuts: p >= 1 ? 10 : 0, rough: p >= 2 ? 0.14 : 0.0001, ridge: p >= 2 ? 0.06 : 0, cutDepth: 0.66 }); inner = new k.THREE.Mesh(g, k.M.rock({ moss: p >= 3 ? 1 : 0, lichen: p >= 3 ? 0.7 : 0 })); inner.position.y = 0.42; root.add(inner); };
    build(0);
    return { group: root, setPhase: build };
  }
};
