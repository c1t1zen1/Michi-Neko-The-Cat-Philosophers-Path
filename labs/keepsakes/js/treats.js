// Lab 17, treats: the four keepsake ids that had no study (dango, jade-paw,
// secret-fish, interior-fish). Kept apart from recipes.js so the coverage
// report's line links into recipes.js stay valid. Tile code = build().
import { dangoBalls, dangoTrim, jadePawGeometry, fishGeometry, platterGeometry, garnishGeometry } from './shapes.js';

export const TREAT_FAMILY =
{ key: 'treats', title: 'Things the cat <em>eats and earns</em>', sub: 'The charm under the bridge, the corral\u2019s jade paw and two grilled fish. None had a study before this; each is a small shape that has to read from a metre away.' };

export const TREAT_SPECIMENS = [
  { id: 'dango', family: 'treats', name: 'River-Spirit Charm', jp: '団子の御守', tag: 'A golden dango on a skewer', plinth: 'moss', hour: 12,
    blurb: 'The game\u2019s charm is a gold octahedron. Three squashed dumplings on a bamboo skewer, with a red cord and a tassel, says \u201cdango\u201d from across the water.',
    how: ['Three spheres, slightly squashed, stacked on a skewer.', 'Gold with a warm emissive, so it keeps reading under the bridge.'], use: 'The collectible under the bridge.', sources: ['notes'], also: [dangoBalls, dangoTrim],
    build(k) { const g = new k.THREE.Group(); const b = new k.THREE.Mesh(dangoBalls([22, 16]), new k.THREE.MeshStandardMaterial({ color: 0xf2c14e, emissive: 0xd9a441, emissiveIntensity: 0.6, metalness: 0.7, roughness: 0.35 })); const t = new k.THREE.Mesh(dangoTrim([22, 16]), k.M.bag({ rough: 0.75 })); g.add(b, t); g.position.y = 0.34; return g; } },
  { id: 'jade-paw', family: 'treats', name: 'Jade Paw', jp: '翡翠の肉球', tag: 'A medallion with a raised paw', plinth: 'moss', hour: 12,
    blurb: 'A faceted jade ball with a gold ring becomes a thick medallion carved with a cat\u2019s paw on both faces: palm and four toes, ringed in gold.',
    how: ['A cylinder, rotated to face the cat.', 'Five flattened spheres raised on each face.'], use: 'The corral reward.', sources: ['notes'], also: [jadePawGeometry],
    build(k) { const g = new k.THREE.Group(); const m = new k.THREE.Mesh(jadePawGeometry([40, 16, 12]), new k.THREE.MeshStandardMaterial({ color: 0x76c7a1, emissive: 0x245c48, emissiveIntensity: 0.75, metalness: 0.45, roughness: 0.3 })); const r = new k.THREE.Mesh(new k.THREE.TorusGeometry(0.255, 0.03, 8, 40), k.M.bag({ metal: 0.85, rough: 0.32 })); g.add(m, r); g.position.y = 0.36; g.rotation.y = 0.5; return g; } },
  { id: 'secret-fish', family: 'treats', name: 'Grilled fish treat', jp: '焼き魚', tag: 'The secret house\u2019s snack', plinth: 'wood', hour: 12,
    blurb: 'Two primitives and a cone become a tapered fish with a pale belly, dark grill stripes along the back, a fan tail, fins and an eye.',
    how: ['A tapered ellipsoid, coloured per vertex: belly, flank and char.', 'Cone fins and tail, flattened.'], use: 'The treat on the secret house\u2019s table.', sources: ['notes'], also: [fishGeometry],
    build(k) { const m = new k.THREE.Mesh(fishGeometry([22, 16], 0.12, 0.5), k.M.bag({ rough: 0.6 })); m.position.y = 0.09; m.castShadow = true; return m; } },
  { id: 'interior-fish', family: 'treats', name: 'Sea-bream platter', jp: '鯛の塩焼き', tag: 'A fish on a rimmed plate, with garnish', plinth: 'wood', hour: 12,
    blurb: 'The tea house\u2019s bream sits on a plain disc. A lathed platter with a raised rim, grated daikon and a sudachi wedge frames it as a meal.',
    how: ['A lathe profile: foot, floor, rim.', 'The fish geometry again, at the tea house\u2019s larger size.'], use: 'The platter in the tea house.', sources: ['notes'], also: [platterGeometry, garnishGeometry],
    build(k) { const g = new k.THREE.Group(); const china = k.M.plain ? k.M.plain(0xeadfc8) : k.M.bag({ rough: 0.5 }); const p = new k.THREE.Mesh(platterGeometry([22, 16]), k.M.plain ? k.M.plain(0xeadfc8) : china); p.position.y = 0.01; const f = new k.THREE.Mesh(fishGeometry([22, 16], 0.14, 0.5), k.M.bag({ rough: 0.6 })); f.position.y = 0.08; const q = new k.THREE.Mesh(garnishGeometry([22, 16]), k.M.bag({ rough: 0.8 })); q.position.y = 0.022; g.add(p, f, q); g.position.y = 0.08; return g; } }
];
