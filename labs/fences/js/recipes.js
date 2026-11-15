// Lab 12 tiles. Tile code = build().
import * as THREE from 'three';
import { originalOf, gameKit, ensureCountryside, ownMaterials } from '../../shared/original.js';
import { V3, Bag, TAU } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { fence, STYLES, straight, runAlong } from './kit.js';
import { warningSign } from './sign.js';

let cs = null;
export const loadDeps = async () => { cs = (await ensureCountryside()).prototype; };
const G = (n) => () => cs[n];

export const SOURCES = {
  glt: ['Glitter · Bamboo fences of Kyoto', 'https://www.gltjp.com/en/directory/item/17445/', 'excerpt'],
  terebess: ['Terebess · Japanese fence types', 'https://terebess.hu/kert/fence.pdf', 'excerpt'],
  pass: ['Passport and Baggage · Yotsume-gaki', 'https://passportandbaggage.com/?p=23667', 'excerpt'],
  ketchell: ['Robert Ketchell · Fences', 'https://robertketchell.blogspot.com/2014/04/fences.html', 'excerpt'],
  jaanus: ['JAANUS · takegaki 竹垣', 'https://aisf.or.jp/~jaanus/deta/t/takegaki.htm', 'excerpt'],
  instanced: ['Three.js docs · InstancedMesh', 'https://threejs.org/docs/pages/InstancedMesh.html', 'docs'],
  lathe: ['Three.js docs · LatheGeometry', 'https://threejs.org/docs/pages/LatheGeometry.html', 'docs'],
  notes: ['Fences research notes', 'research.md', 'notes']
};

export const FAMILIES = [
  { key: 'runs', title: 'Fences, <em>and what they say</em>', sub: 'The game’s fence, then the five Kyoto fences most people mean when they say takegaki. Which ones you can see through matters.' },
  { key: 'detail', title: 'Knots, <em>nodes, and time</em>', sub: 'At cat height you are looking at the lashing. A culm is not a cylinder and a fence gets old.' },
  { key: 'corral', title: 'The corral', sub: 'The real thing, turtle and all.' }
];

const run = (k, style, len = 3.2, o = {}) => fence(straight(len), style, { age: 0.3, seed: 5, ...o });

export const SPECIMENS = [
  { id: 'game-fence', family: 'runs', original: true, name: 'Our takegaki', jp: '今の竹垣', tag: 'buildBambooFence(), as it stands', plinth: 'earth', game: G('buildBambooFence'),
    blurb: 'Two rails and vertical cylinders in a timber colour, one mesh each. It reads well, and you can see the separate cylinders from close up.',
    how: ['About twenty separate meshes for a two-metre run.'], use: 'Baseline.', sources: ['notes'],
    build(k) { const kit = gameKit(5); kit.buildBambooFence(0, 0, 0, { length: 3.2, rotationJitter: false }); return ownMaterials(kit.scene); } },
  { id: 'yotsume', family: 'runs', name: 'Yotsume-gaki', jp: '四ツ目垣', tag: 'Open: four spaces at each crossing', plinth: 'earth',
    blurb: 'Verticals alternate front and back of three rails, tied at every crossing. You can see straight through it, which is the point.',
    how: ['One instanced culm mesh for posts, rails and verticals.', 'Each crossing gets a small dark knot.'], use: 'Inside gardens: it divides without closing.', sources: ['pass', 'jaanus'], also: [fence],
    build(k) { return run(k, 'yotsume'); } },
  { id: 'kenninji', family: 'runs', name: 'Kenninji-gaki', jp: '建仁寺垣', tag: 'A closed wall of split bamboo', plinth: 'earth',
    blurb: 'Densely packed halves behind four cover rails. The most common screening fence in Japan, in three degrees of formality.',
    how: ['Verticals sit close together, overlapping slightly, with heavier cover rails on top.'], use: 'Street frontages and boundaries.', sources: ['terebess', 'glt'], also: [fence],
    build(k) { return run(k, 'kenninji'); } },
  { id: 'teppo', family: 'runs', name: 'Teppō-gaki', jp: '鉄砲垣', tag: 'The rifle-barrel fence', plinth: 'earth',
    blurb: 'Thick poles set alternately front and back of the rails, so it looks like a row of barrels from one side and a screen from the other.',
    how: ['Alternating z offsets and radii.'], use: 'Boundaries that are meant to look substantial.', sources: ['ketchell', 'terebess'], also: [fence],
    build(k) { return run(k, 'teppo'); } },
  { id: 'koetsu', family: 'runs', name: 'Kōetsu-gaki', jp: '光悦垣', tag: 'A diagonal lattice, for Honami Kōetsu', plinth: 'earth',
    blurb: 'A rising diagonal lattice with a curved top rail, named for the artist who built the first at his family’s temple.',
    how: ['Paired diagonals crossing in the fence plane.'], use: 'One special place: the path to a tea house.', sources: ['glt'], also: [fence],
    build(k) { return run(k, 'koetsu'); } },
  { id: 'ginkaku', family: 'runs', name: 'Ginkakuji-gaki', jp: '銀閣寺垣', tag: 'Low bamboo along a stone wall', plinth: 'stone',
    blurb: 'A low fence on top of a stone footing, after the long approach to Ginkaku-ji.',
    how: ['Stone slabs under a short, dense run of verticals.'], use: 'Along the sandō.', sources: ['terebess'], also: [fence],
    build(k) { return run(k, 'ginkaku'); } },

  { id: 'knot', family: 'detail', name: 'Lashing', jp: '結び', tag: 'Dark shuro cord at every crossing', plinth: 'wood', hour: 15,
    blurb: 'Close up, a crossing of two culms and a figure of cord. Fences are held together by this, and from cat height it is the main event.',
    how: ['Instanced tori, one per crossing, rotated to sit on the joint.'], use: 'Every fence that the cat walks along.', sources: ['glt', 'jaanus'], also: [fence],
    build(k) { return fence([k.V3(-0.42, 0, 0), k.V3(0.42, 0, 0)], 'yotsume', { age: 0.2, seed: 2 }); } },
  { id: 'culm', family: 'detail', name: 'A culm, not a cylinder', jp: '節', tag: 'Swollen nodes every span', plinth: 'wood', hour: 15,
    blurb: 'A lathe profile with a small bulge at each node. One geometry, instanced everywhere and scaled to length.',
    how: ['Radius = taper × (1 + Gaussian bump at each node).'], use: 'Every bamboo object in the valley.', sources: ['lathe', 'instanced'],
    build(k) { const g = new k.THREE.Group(); const C = (r, h, x) => { const m = new k.THREE.InstancedMesh(culmG(), k.M.bamboo({ vcol: true }), 1); const o = new k.THREE.Object3D(); o.position.set(x, 0, 0); o.scale.set(r, h, r); o.updateMatrix(); m.setMatrixAt(0, o.matrix); g.add(m); }; C(0.05, 1.6, -0.2); C(0.035, 1.3, 0.05); C(0.025, 1.05, 0.25); return g; } },
  { id: 'aged', family: 'detail', name: 'What ten years does', jp: '経年', tag: 'From green to straw to weathered', plinth: 'earth',
    blurb: 'The same run at four ages. Bamboo fences are replaced on a regular cycle, so a garden usually has several ages in view at once.',
    how: ['Age drives instance colour through a four-stop ramp.'], use: 'A slider on the stage.', sources: ['notes'], also: [fence],
    build(k) { const g = new k.THREE.Group(); [0, 0.35, 0.65, 1].forEach((a, i) => { const f = fence([k.V3(-0.7, 0, (i - 1.5) * 0.6), k.V3(0.7, 0, (i - 1.5) * 0.6)], 'yotsume', { age: a, seed: 2 + i }); g.add(f); }); return g; } },

  { id: 'corral', family: 'corral', original: true, name: 'The corral, and Larry', jp: '囲い', tag: 'buildBambooCorral(), complete', plinth: 'earth', game: G('buildBambooCorral'),
    blurb: 'The real corral with its warning sign and the turtle guardian. Our fences need to replace this and keep the sign, the reward and the turtle.',
    how: ['Four fences and a post, all through the game’s builder.'], use: 'Baseline.', sources: ['notes'],
    build(k) { const kit = gameKit(4); kit.vegetationExclusions = []; kit.collectibles = []; kit.buildBambooCorral(0, 0); return ownMaterials(kit.scene); } },
  { id: 'corral-sign', family: 'corral', name: 'The warning sign', jp: '警告の札', tag: 'Post, board and painted face, studied alone', plinth: 'earth',
    blurb: 'The sign on the corral’s north side, apart from the corral. A knotted bamboo post with a small rain cap, a framed board and a lit painted face, lashed with cord. It keeps the game’s reading and footprint.',
    how: ['The post is the instanced culm profile with nodes.', 'The face is a canvas texture on a lit paper material, so it dims at dusk instead of glowing.', 'Two torus lashings sit where the board crosses the post.'], use: 'Corral, one per pen; the same board works for any farm warning.', sources: ['notes'],
    build() { return warningSign(); } }
];

function culmG() { return culmCached ||= (window.__culmG); }
let culmCached = null;
import { culmGeometry } from '../../shared/bamboo.js';
window.__culmG = culmGeometry({ nodes: 7, radial: 12 });

export const STEPS = [
  { title: 'Set the posts', body: '<p>Thick culms every metre and a half or so.</p>', phase: 0 },
  { title: 'Run the rails', body: '<p>Horizontal members tied between the posts. These decide the fence’s height and rhythm.</p>', phase: 1 },
  { title: 'Weave the verticals', body: '<p>The verticals go alternately in front of and behind the rails. That alternation is what makes it hold together.</p>', phase: 2 },
  { title: 'Tie every crossing', body: '<p>A small knot of dark cord. Hundreds of them, and they are the first thing you see from a cat’s height.</p>', code: 'knots.push(position, radius)', phase: 3 },
  { title: 'Let it age', body: '<p>Green to straw to brown. Age changes colour and, slowly, its lean.</p>', code: 'bambooColor(age)', phase: 4 }
];

export const ASSEMBLY = {
  radius: 2.1, target: [0, 0.7, 0], shadow: 4,
  build(k) {
    const root = new k.THREE.Group(), L = [k.V3(-1.3, 0, 0), k.V3(1.3, 0, 0)];
    const ground = new k.THREE.Mesh(new k.THREE.BoxGeometry(3.2, 0.1, 1.5), k.M.plain(0xb7a988)); ground.position.y = -0.05; ground.userData.noShadow = true; root.add(ground);
    let inner = null;
    const build = (ph, age) => { if (inner) root.remove(inner); inner = fence(L, 'yotsume', { age, seed: 7 }); const c = inner.getObjectByName('Culms'), n = inner.getObjectByName('Knots'); if (c) { c.count = ph <= 0 ? 2 : ph === 1 ? 5 : c.count; c.instanceMatrix.needsUpdate = true; } if (n) n.visible = ph >= 3; root.add(inner); };
    build(0, 0.2);
    return { group: root, setPhase(p) { build(p, p >= 4 ? 0.7 : 0.2); } };
  }
};
