// Lab 11 tiles. Tile code = build().
import * as THREE from 'three';
import { originalOf, gameKit, ensureCountryside, ownMaterials } from '../../shared/original.js';
import { V3, Bag, TAU, lerp } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { chochin, floatLantern, takeAkari, washiTexture, lanternMaterial } from '../../shared/paperlantern.js';
import { toro, TORO_KINDS, andon } from './kit.js';

let cs = null;
export const loadDeps = async () => { cs = (await ensureCountryside()).prototype; };
const G = (n) => () => cs[n];

export const SOURCES = {
  mark: ['Mark Schumacher · Ishidōrō: Japanese stone lanterns', 'https://onmarkproductions.com/html/ishidoro.shtml', 'excerpt'],
  jobj: ['Japan Objects · What are tōrō?', 'https://japanobjects.com/features/japanese-lanterns', 'excerpt'],
  gardens: ['japanesegardens.jp · Stone lanterns in the Japanese garden', 'https://japanesegardens.jp/stone-lanterns-in-the-japanese-garden/', 'excerpt'],
  wikic: ['Japanese Wiki Corpus · Tōrō (garden lantern)', 'https://japanese-wiki-corpus.github.io/culture/Toro (Garden Lantern).html', 'excerpt'],
  lathe: ['Three.js docs · LatheGeometry', 'https://threejs.org/docs/pages/LatheGeometry.html', 'docs'],
  point: ['Three.js docs · PointLight', 'https://threejs.org/docs/pages/PointLight.html', 'docs'],
  sss: ['three.js · TranslucentShader (GDC 2011 approximation)', 'https://threejs.org/docs/pages/module-SubsurfaceScatteringShader.html', 'docs'],
  notes: ['Lanterns research notes', 'research.md', 'notes']
};

export const FAMILIES = [
  { key: 'stone', title: 'Stone, <em>and a small room for a flame</em>', sub: 'The game’s lantern, then the four types you actually meet in Kyoto: each has the same parts, and quite different manners.' },
  { key: 'paper', title: 'Paper <em>on a frame</em>', sub: 'The game’s cylinder, then a real lathe body with ribs, a folding Odawara and a painted Gifu.' },
  { key: 'street', title: 'What lights <em>the street</em>', sub: 'The game’s square street lamp, and what might stand there instead.' },
  { key: 'light', title: 'Where the <em>light goes</em>', sub: 'How much of a lantern’s effect is the flame, the paper, or the patch of ground it warms.' }
];

const hang = (g, y = 0.8) => { const w = new THREE.Group(); g.position.y = y; w.add(g); return w; };

export const SPECIMENS = [
  { id: 'game-toro', family: 'stone', original: true, name: 'Our tōrō', jp: '今の灯籠', tag: 'buildToroLantern(), as it stands', plinth: 'stone', hour: 20, game: G('buildToroLantern'),
    blurb: 'A cylinder, a box, a glowing box and a cone. It reads clearly at a distance and has a perch on top that Michi uses.',
    how: ['Primitive stack with one emissive box for the light.', 'A real AddOrientedPlatform perch tops it: keep that.'], use: 'Baseline.', sources: ['notes'],
    build(k) { return originalOf('buildToroLantern', 0, 0).group; } },
  { id: 'kasuga', family: 'stone', name: 'Kasuga', jp: '春日', tag: 'The tall one, after Kasuga Taisha', plinth: 'stone', hour: 20, spin: 1,
    blurb: 'Long shaft, high firebox, a hexagon roof with a swept skirt, finished with a little onion jewel on top.',
    how: ['Six-sided cylinders stacked: kiso, sao, chūdai, hibukuro, kasa, hōju.', 'The kasa is a lathe with a concave profile and six segments.'], use: 'The default for streets and approaches.', sources: ['mark', 'jobj', 'gardens'], also: [toro],
    build(k) { return litToro('kasuga'); } },
  { id: 'yukimi', family: 'stone', name: 'Yukimi', jp: '雪見', tag: 'Low, broad, for watching the snow', plinth: 'gravel', hour: 20,
    blurb: 'Three bowed legs and a wide round cap, built to hold a pillow of snow. It often stands right at the water’s edge.',
    how: ['Legs are tubes on short curves.', 'The round kasa uses 40 radial segments.'], use: 'Beside ponds and low in gardens.', sources: ['mark', 'wikic'], also: [toro],
    build(k) { return litToro('yukimi'); } },
  { id: 'oribe', family: 'stone', name: 'Oribe', jp: '織部', tag: 'Square, sunk straight into the earth', plinth: 'moss', hour: 20,
    blurb: 'Named for tea master Furuta Oribe. No base at all: the square shaft goes straight into the ground, with a small figure carved at its foot.',
    how: ['Four-sided versions of the same parts.', 'One thin box stands in for the carved figure.'], use: 'Tea gardens and the side of a roji.', sources: ['mark', 'gardens'], also: [toro],
    build(k) { return litToro('oribe'); } },
  { id: 'kotoji', family: 'stone', name: 'Kotoji', jp: '琴柱', tag: 'Two legs, one standing in the water', plinth: 'water', hour: 20,
    blurb: 'Like the bridge of a koto: a long leg on the bank and a short leg in the pond, the shape Kenroku-en is known for.',
    how: ['Two curved tubes of different height carrying the same firebox.'], use: 'One, at the edge of the Moon Pool.', sources: ['wikic'], also: [toro],
    build(k) { return litToro('kotoji'); } },
  { id: 'age', family: 'stone', name: 'A century of lichen', jp: '古色', tag: 'The same Kasuga, left outside', plinth: 'moss', hour: 12,
    blurb: 'All the ageing is in the shader: moss on what faces up, pale lichen speckle, dark grime at the foot.',
    how: ['paintify() reads the world-space normal for moss.', 'Lichen is voronoi spots gated by low-frequency noise.'], use: 'Most lanterns in the valley should look like this.', sources: ['notes'],
    build(k) { return toro('kasuga', { moss: 1.1, lichen: 1, tint: 0x8a857a }); } },
  { id: 'parts', family: 'stone', name: 'The parts, pulled apart', jp: '部位', tag: 'Hōju, kasa, hibukuro, chūdai, sao, kiso', plinth: 'stone', hour: 16, animatedShadow: true,
    blurb: 'The six named parts, exploded and slowly settling back together.',
    how: ['Each part is its own mesh, so the Stepper and this tile can move them apart.'], use: 'A diagram that happens to be the real thing.', sources: ['mark', 'jobj'], also: [toro],
    build(k) { const g = toro('kasuga'), kids = [...g.children], base = kids.map((m) => m.position.y); return { group: g, update(t) { const e = 0.5 + 0.5 * Math.sin(t * 0.7); kids.forEach((m, i) => { m.position.y = base[i] + e * i * 0.075; }); } }; } },

  { id: 'game-chochin', family: 'paper', original: true, name: 'Our chōchin', jp: '今の提灯', tag: 'createChochinLantern(), as it stands', plinth: 'wood', hour: 20, game: G('createChochinLantern'),
    blurb: 'A ten-sided cylinder with a red box for the band. Hung in rows it works well enough.',
    how: ['CylinderGeometry and a box.'], use: 'Baseline.', sources: ['notes'],
    build(k) { const kit = gameKit(), g = new k.THREE.Group(); kit.createChochinLantern(0, 0.8, 0, g); return ownMaterials(g); } },
  { id: 'gifu', family: 'paper', name: 'Lathed washi', jp: '丸提灯', tag: 'Ribs and a belly, lit from inside', plinth: 'wood', hour: 20, animatedShadow: false,
    blurb: 'A proper lathe profile, ribs in the fibre map, and an emissive that is hottest at the belly.',
    how: ['Emissive = warm colour × Gaussian in height × paper map.'], use: 'Replaces the cylinder directly.', sources: ['sss', 'lathe'], also: [lanternMaterial],
    build(k) { return hang(chochin({ h: 0.56, belly: 0.2, glow: 1.5 })); } },
  { id: 'odawara', family: 'paper', name: 'Odawara', jp: '小田原提灯', tag: 'A tall folding travel lantern', plinth: 'wood', hour: 20, animatedShadow: false,
    blurb: 'Long and narrow, built to fold into its own cap. The ribs are close together so it reads as a bellows.',
    how: ['Same builder with h: 0.72, belly: 0.1 and a dense rib count.'], use: 'Hung at doors and carried by the village cats on festival nights.', sources: ['sss'], also: [chochin],
    build(k) { return hang(chochin({ h: 0.74, belly: 0.11, glow: 1.3, tex: washiTexture({ ribs: 26, seed: 3 }) }), 0.95); } },
  { id: 'crest', family: 'paper', name: 'A crested lantern', jp: '紋提灯', tag: 'Painted with a house crest', plinth: 'wood', hour: 20, animatedShadow: false,
    blurb: 'A plain chōchin with a big black crest painted on: the signature of a shop or a shrine, and it reads in silhouette too.',
    how: ['A separate painted washi canvas with the crest drawn onto it.'], use: 'Shop fronts and shrine gates.', sources: ['sss'], also: [chochin],
    build(k) {
      const [c, x] = k.canvas2d(256, 256); x.fillStyle = '#fff4e2'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 12; i++) { x.fillStyle = 'rgba(120,80,40,.3)'; x.fillRect(0, i * 21.5, 256, 2); }
      x.fillStyle = '#231a14'; x.beginPath(); x.arc(128, 128, 60, 0, k.TAU); x.fill(); x.fillStyle = '#fff4e2'; for (let i = 0; i < 3; i++) { const a = i / 3 * k.TAU - 1.5; x.beginPath(); x.arc(128 + Math.cos(a) * 32, 128 + Math.sin(a) * 32, 18, 0, k.TAU); x.fill(); }
      return hang(chochin({ h: 0.6, belly: 0.22, glow: 1.4, tex: k.canvasTexture(c) }));
    } },
  { id: 'take', family: 'paper', name: 'Take-akari', jp: '竹あかり', tag: 'Bamboo with slots and a flame inside', plinth: 'moss', hour: 20, animatedShadow: false,
    blurb: 'Slotted culms lit from inside, a Kyushu festival craft that now turns up along temple paths.',
    how: ['Small boxes on the culm carry the emissive.'], use: 'Festival paths.', sources: ['notes'], also: [takeAkari],
    build(k) { const g = new k.THREE.Group(); for (const [x, h] of [[-0.3, 1.0], [0.05, 1.25], [0.4, 0.85]]) { const t = takeAkari({ h, glow: 1.4 }); t.position.x = x; g.add(t); } return g; } },

  { id: 'game-street', family: 'street', original: true, name: 'A street lamp', jp: '今の街灯', tag: 'One from buildLanterns()', plinth: 'stone', hour: 20, game: G('buildLanterns'),
    blurb: 'The real square lamp from the game’s street, taken from the group of seven and centred.',
    how: ['Box base, post, box light and a four-sided cone.'], use: 'Baseline.', sources: ['notes'],
    build(k) { const kit = gameKit(); kit.buildLanterns(); const l = kit.scene.children[0]; l.position.set(0, 0, 0); return ownMaterials(l); } },
  { id: 'andon', family: 'street', name: 'Andon', jp: '行灯', tag: 'A paper-walled floor lamp', plinth: 'wood', hour: 20, animatedShadow: false,
    blurb: 'A wooden frame and paper walls: the classic interior lamp, also set out on an engawa or at a shop door.',
    how: ['Frame bars baked into one Bag; paper inner box.'], use: 'Doorways and verandas.', sources: ['notes'], also: [andon],
    build(k) { return andon({ h: 0.78 }); } },

  { id: 'just-emissive', family: 'light', name: 'Emissive only', jp: '灯りだけ', tag: 'The lantern glows; nothing else knows', plinth: 'stone', hour: 21, animatedShadow: false,
    blurb: 'The cheapest version: the flame only lights the paper. Cheap, but the lantern looks stuck on.',
    how: ['A brightly emissive surface and nothing else.'], use: 'Hundreds of far lanterns.', sources: ['point'],
    build(k) { return litToro('kasuga', { pool: 0 }); } },
  { id: 'pool', family: 'light', name: 'A real pool of light', jp: '灯り溜まり', tag: 'A point light, warm and short', plinth: 'stone', hour: 21, animatedShadow: false,
    blurb: 'One PointLight with a short distance and a square falloff. The floor and the stone both warm up, and now it belongs there.',
    how: ['PointLight(warm, 1.6, 2.6, 2).', 'In the game, a pool of four lights hops between the lanterns nearest the cat.'], use: 'The nearest few lanterns only.', sources: ['point'],
    build(k) { return litToro('kasuga', { pool: 1.8 }); } },
  { id: 'courtyard-toro', family: 'stone', name: 'Courtyard tōrō', jp: '坪庭の灯籠', tag: 'A small Kasuga for the tea-house courtyard', plinth: 'gravel', hour: 20,
    blurb: 'The interior\u2019s courtyard lantern is a stack of four boxes, 1.04 m tall. This is the same lantern drawn properly at that size: a short shaft, a hollow firebox with its higuchi, a kasa with a swept skirt, a lit paper chamber inside.',
    how: ['The Kasuga builder squeezed to 1.05 m: x/z \u00d7 0.72, y \u00d7 0.58 (nothing is rebuilt).', 'The paper inside is always warm: the courtyard is seen from a room that is already lit.'], use: 'The courtyard behind the tea house; any small garden corner.', sources: ['mark', 'gardens'], also: [toro],
    build(k) { const g = toro('kasuga', { moss: 0.25, lichen: 0.35, tint: 0x8f968f }); g.scale.set(0.72, 0.58, 0.72); g.userData.paper.userData.u.uGlow.value = 1.2; return g; } },
  { id: 'pool-toro', family: 'stone', name: 'Moon Pool tōrō', jp: '月池の灯籠', tag: 'The little lantern at the pool\u2019s edge', plinth: 'moss', hour: 21, animatedShadow: false,
    blurb: 'A 1.14 m stone lantern that wakes when the light goes. The game\u2019s version is a stack of cylinders with one glowing cube and a halo sprite; this one has a hollow firebox, so the flame reads through the openings and the halo is only the bloom around it.',
    how: ['Kasuga scaled to 1.14 m (x/z \u00d7 0.8, y \u00d7 0.63).', 'A short warm PointLight stands in for the game\u2019s halo sprite and glow ramp.'], use: 'The edge of the Moon Pool, and any water\u2019s edge that needs one light.', sources: ['mark', 'wikic', 'point'], also: [toro],
    build(k) { const g = litToro('kasuga', { pool: 1.4 }); g.scale.set(0.8, 0.63, 0.8); return g; } }
];

function litToro(kind, { pool = 0 } = {}) {
  const g = toro(kind);
  g.userData.paper.userData.u.uGlow.value = 1.6;
  if (pool) { const l = new THREE.PointLight(0xffb060, pool, 2.8, 2); l.position.y = g.userData.lampY; g.add(l); }
  return g;
}

export const STEPS = [
  { title: 'Kiso, the foot', body: '<p>Two six-sided rings to hold it off the ground, slightly wider at the bottom.</p>', code: 'new CylinderGeometry(r, r * 1.2, h, 6)', phase: 0 },
  { title: 'Sao, the shaft', body: '<p>On a Kasuga it is long and round, and much of the lantern’s elegance comes from how slender it is.</p>', phase: 1 },
  { title: 'Chūdai, the shelf', body: '<p>A flared hexagon that carries the firebox.</p>', phase: 2 },
  { title: 'Hibukuro, the firebox', body: '<p>The one part a tōrō must have. Stone frame, paper inside.</p>', code: 'mat.uGlow = 1.6', phase: 3 },
  { title: 'Kasa, the roof', body: '<p>A lathe with a concave profile. Six segments give the hexagon, so the curve you draw is the skirt.</p>', code: 'LatheGeometry(concaveProfile, 6)', phase: 4 },
  { title: 'Hōju, the jewel', body: '<p>An onion on top. You will know it’s right when you stop noticing it.</p>', phase: 5 }
];

export const ASSEMBLY = {
  radius: 1.6, target: [0, 0.9, 0], shadow: 3,
  build(k) {
    const g = toro('kasuga');
    const groups = { kiso: 0, sao: 1, chudai: 2, hibukuro: 3, window: 3, kasa: 4, hoju: 5 };
    const items = g.children.map((m) => ({ m, p: groups[m.name] ?? 0, y: m.position.y }));
    g.userData.paper.userData.u.uGlow.value = 1.2;
    const ground = new k.THREE.Mesh(new k.THREE.CylinderGeometry(1.1, 1.1, 0.08, 32), k.M.plain(0xbcb6a6)); ground.position.y = -0.04; ground.userData.noShadow = true;
    const root = new k.THREE.Group(); root.add(g, ground);
    let phase = 0;
    return { group: root, setPhase(p) { phase = p; for (const it of items) { it.m.visible = it.p <= p; } }, update(t, dt) { for (const it of items) if (it.m.visible) { const target = it.y; it.m.position.y += (target - it.m.position.y) * Math.min(1, dt * 5); } } };
  }
};
