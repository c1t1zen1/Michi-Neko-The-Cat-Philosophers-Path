// Lab 16 tiles. Tile code = build().
import * as THREE from 'three';
import { gameKit, ensureCountryside, ownMaterials } from '../../shared/original.js';
import { V3, TAU, Bag, rng } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { PROPS } from './props.js';

let cs = null;
export const loadDeps = async () => { cs = (await ensureCountryside()).prototype; };
const G = (n) => () => cs[n];

export const SOURCES = {
  ajiki: ['Kyoto City Tourism · Ajiki Alley (warm-white light)', 'https://kyoto.travel/en/see-and-do/Ajiki_Alley.html', 'excerpt'],
  roji: ['Kyoto Tourism · a row of wooden tenements', 'https://kyoto.travel/en/travel-inspiration/a-row-of-traditional-wooden-tenement-houses-that-support-young-artists-and-what-the-scenes-of-everyday-life-here-convey-to-visitors-kyoto-tourism-today/', 'excerpt'],
  yokogao: ['Yokogao · Recreating Tokyo back alleys in 3D', 'https://www.yokogaomag.com/editorial/tokyo-back-alleys-michael-yoshimura', 'excerpt'],
  azuma: ['Saigoneer · Kiyohiko Azuma’s street sketches', 'https://saigoneer.com/saigon-arts-culture/10040-photos-kiyohiko-azuma%E2%80%99s-intricate-sketches-of-tokyo%E2%80%99s-urban-landscapes', 'excerpt'],
  notes: ['Alley research notes', 'research.md', 'notes']
};

export const FAMILIES = [
  { key: 'crates', title: 'What Michi <em>climbs today</em>', sub: 'The game’s crates are boxes with collision. They need to keep doing that, and to look like something somebody left there.' },
  { key: 'props', title: 'What a lane <em>actually holds</em>', sub: 'Ten things that make a back lane feel lived in. Each is small, and all of them are seen from a metre away.' }
];

export const SPECIMENS = [
  { id: 'game-crates', family: 'crates', original: true, name: 'Our climb crates', jp: '今の木箱', tag: 'createClimbCrates(), as it stands', plinth: 'earth', hour: 16, game: G('createClimbCrates'),
    blurb: 'The real crates and barrel, four steps high, with the platforms Michi uses to climb onto the tea house.',
    how: ['Boxes and a cylinder. The gameplay lives in the platform boxes they register.'], use: 'Baseline.', sources: ['notes'],
    build(k) { const kit = gameKit(); const g = new k.THREE.Group(); kit.createClimbCrates(0, 0, 0, g, 0); return ownMaterials(g); } },
  { id: 'crate', family: 'crates', name: 'A slatted crate', jp: '木箱', tag: 'Boards with gaps and old rope', plinth: 'earth', hour: 16,
    blurb: 'Five boards a side and two battens, so the light gets between them. One geometry per crate and all of it in one draw.',
    how: ['Boards and battens baked into a single Bag.'], use: 'Replaces the boxes, and keeps the same platform heights.', sources: ['yokogao'], also: [PROPS.crate.build],
    build(k) { const g = PROPS.crate.build(); const h = PROPS.crate.build(); h.position.set(0.1, 0.52, 0.02); h.rotation.y = 0.15; const w = new k.THREE.Group(); w.add(g, h); return w; } },
  ...Object.entries(PROPS).filter(([id]) => id !== 'crate').map(([id, P]) => ({
    id, family: 'props', name: P.label, tag: { pot: 'Every step and sill grows something', barrel: 'Water for the garden and for fires', komodaru: 'Straw-wrapped, with a painted crest', bicycle: 'A mamachari, leaned in by someone in a hurry', sign: 'A vertical signboard on a stand', broom: 'A bundle of bamboo twigs, propped by the door', tanuki: 'A pot-bellied welcome outside the shop', tiles: 'Roof tiles waiting for a repair' }[id], plinth: 'stone', hour: 16,
    blurb: { pot: 'Terracotta and a dozen leaf cards. Rows of these line every sunny doorstep in Kyoto.', barrel: 'Staves, hoops and a surface of still water that catches the sky.', komodaru: 'Woven straw painted with a crest, the kind you see stacked at shrines.', bicycle: 'Two wheels, a frame of tubes and a basket on the front. Everyone leaves one against a wall.', sign: 'A board of brush characters on a little stand.', broom: 'The first thing out in the morning.', tanuki: 'A stoneware raccoon-dog in a straw hat, a promise of good business.', tiles: 'A small stack of spares, the sort that stays for decades.' }[id],
    how: ['A Group of a few primitives and painted canvases.'], use: 'Click it onto the stage and then look at it from a cat’s height.', sources: ['yokogao', 'azuma'], also: [P.build],
    build: new Function('k', `return window.__alleyProp(${JSON.stringify(id)});`)
  }))
];
window.__alleyProp = (id) => PROPS[id].build();

export const STEPS = [
  { title: 'Two walls and a sliver of sky', body: '<p>A roji is a narrow lane, and in Kyoto often a cul-de-sac. Most of the picture is two walls and a strip of sky.</p>', phase: 0 },
  { title: 'Something on every step', body: '<p>A pot, a broom, a stone. Detail is what makes a place feel inhabited, and this is where it gets added.</p>', phase: 1 },
  { title: 'Something leaning', body: '<p>Things in a real lane are at an angle. Nothing is square to the wall.</p>', phase: 2 },
  { title: 'Then get low', body: '<p>Everything is seen from about 25 centimetres. Check the underside of things.</p>', phase: 3 }
];

export const ASSEMBLY = {
  radius: 1.6, target: [0, 0.55, 0], shadow: 3,
  build(k) {
    const root = new k.THREE.Group(), floor = new k.THREE.Mesh(new k.THREE.BoxGeometry(3, 0.1, 2), k.M.plain(0xa8a397)); floor.position.y = -0.05; floor.userData.noShadow = true; root.add(floor);
    const wall = new k.THREE.Mesh(new k.THREE.BoxGeometry(3, 1.8, 0.08), k.M.plaster({ tint: 0xe6d9bf, grime: 0.5, grimeH: 0.8 })); wall.position.set(0, 0.9, -0.96); root.add(wall);
    const a = PROPS.pot.build(); a.position.set(-0.8, 0, -0.5); root.add(a);
    const b = PROPS.broom.build(); b.position.set(-0.3, 0, -0.75); root.add(b);
    const c = PROPS.barrel.build(); c.position.set(0.7, 0, -0.5); root.add(c);
    const d = PROPS.bicycle.build(); d.position.set(0.1, 0, 0.2); d.rotation.y = 0.2; root.add(d);
    return { group: root, setPhase(p) { a.visible = p >= 1; c.visible = p >= 1; b.visible = p >= 2; d.visible = p >= 2; } };
  }
};
