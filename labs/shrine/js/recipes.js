// Every tile on the shelves. A tile's code on the page is its build() below.
import * as THREE from 'three';
import { originalOf, gameKit, ownMaterials, ensureCountryside } from '../../shared/original.js';
import { loadSculptModule } from '../../shared/game.js';
import { V3, Bag, merge, tube, sweep, ringRect, lerp, instances, rng, TAU, shadows } from '../../shared/craft.js';
import { worldScaleBoxUVs } from '../../shared/game.js';
import { M } from '../../shared/painted.js';
import { bambooFeed } from '../../shared/waterprops.js';
import { gateParts, gateGeos, gateMats, buildGate, SORI, shimenawa, sagari, hangShide, shideGeo, shideMat, buildSuzu, komainuPrims, hallRoofSurface, hiwadaTexture, sidePosts, curveOf, catenary, ropeProfiles } from './gate.js';

let sculpt = null;
export async function loadShrineDeps() {
  await ensureCountryside();
  const { sculptGeometry, compilePrims } = await loadSculptModule();
  sculpt = (list, h, o) => sculptGeometry(compilePrims(list), h, o);
  return sculpt;
}
const Cside = async () => (await ensureCountryside()).prototype;
let cs = null;
export const primeSource = async () => { cs = await Cside(); };
const gameFn = (name) => () => cs[name];

export const SOURCES = {
  jaanus: ['JAANUS · myōjin torii (labelled parts, proportions)', 'https://www.aisf.or.jp/~jaanus/deta/m/myoujintorii.htm', 'excerpt'],
  jref: ['Japan Reference · Torii', 'https://jref.com/articles/torii.33/', 'excerpt'],
  commons: ['Wikimedia Commons · torii variation chart', 'https://commons.wikimedia.org/wiki/File:Torii_gate_variation.svg', 'reference image'],
  inari: ['Fushimi Inari Taisha · Senbon Torii', 'http://inari.jp/en/map/spot_07/', 'excerpt'],
  metkoma: ['The Met · Guardian lion-dogs (Komainu)', 'https://metmuseum.org/art/collection/search/53190', 'excerpt'],
  tkyoto: ['Traditional Kyoto · Lions (Komainu)', 'https://traditionalkyoto.com/culture/figures/lions-komainu/', 'excerpt'],
  shide: ['Wikipedia · Shide (Shinto)', 'https://en.wikipedia.org/wiki/Shide_(Shinto)', 'excerpt'],
  otaki: ['Ōtakiage Jinja · 紙垂（しで）とは', 'https://otakiagejinja.com/media/3825', 'excerpt'],
  rope: ['Nippon.com · Shimenawa: the sacred rope', 'https://www.nippon.com/en/articles/-/12567', 'excerpt'],
  wha: ['World History Encyclopedia · Shinto architecture', 'https://www.worldhistory.org/Shinto_Architecture/', 'excerpt'],
  kasuga: ['Wikipedia · Kasuga-zukuri', 'https://en.wikipedia.com/wiki/Kasuga-zukuri', 'excerpt'],
  ise: ['Ise Jingū · Pray (temizu)', 'https://www.isejingu.or.jp/en/pray/', 'excerpt'],
  tube: ['Three.js docs · TubeGeometry', 'https://threejs.org/docs/pages/TubeGeometry.html', 'docs'],
  tubeExt: ['three.js forum · Extended TubeGeometry (varying radii)', 'https://discourse.threejs.org/t/extended-tubegeometry/80539', 'excerpt'],
  lathe: ['Three.js docs · LatheGeometry', 'https://threejs.org/docs/pages/LatheGeometry.html', 'docs'],
  instancing: ['three.js forum · frustum culling with InstancedMesh', 'https://discourse.threejs.org/t/how-to-do-frustum-culling-with-instancedmesh/22633', 'excerpt'],
  instances2: ['@three.ez/instanced-mesh · per-instance culling and BVH', 'https://www.npmjs.com/package/%40three.ez%2Finstanced-mesh', 'excerpt'],
  sdf: ['Inigo Quilez · smooth minimum (the sculptor’s blend)', 'https://iquilezles.org/articles/smin/', 'from memory of the method'],
  surfnets: ['0fps · Smooth voxel terrain and surface nets', 'https://0fps.net/2012/07/12/smooth-voxel-terrain-part-2/', 'from memory of the method'],
  heckel: ['Maxime Heckel · On Crafting Painterly Shaders', 'https://blog.maximeheckel.com/posts/on-crafting-painterly-shaders', 'read (first half)'],
  papari: ['Papari et al. · Artistic edge and corner enhancing smoothing', 'https://core.ac.uk/download/pdf/148194268.pdf', 'cited by Heckel'],
  kypri: ['Kyprianidis et al. · Anisotropic Kuwahara with polynomial weighting', 'https://www.umsl.edu/~kangh/Papers/kang-tpcg2010.pdf', 'cited by Heckel'],
  susurrus: ['Codrops · Susurrus: a cozy watercolor world in Three.js', 'https://tympanus.net/codrops/2026/04/24/susurrus-crafting-a-cozy-watercolor-world-with-three-js-and-shaders/', 'excerpt'],
  fwd: ['Mikkelsen · Bump mapping unparametrized surfaces', 'https://mmikk.github.io/papers3d/mm_sfgrad_bump.pdf', 'from memory of the method']
};

export const FAMILIES = [
  { key: 'gate', title: 'What gives a gate <em>its lift</em>', sub: 'Eight torii, from the one the game ships to a three-legged oddity. Each keeps the same measured parts and changes the lintel, the lean or the count.' },
  { key: 'rope', title: 'Rope <em>and paper</em>', sub: 'The game hangs a plain cylinder. A shimenawa is twisted straw that swells in the middle, and its paper zigzags fold three ways.' },
  { key: 'guard', title: 'What lines <em>the approach</em>', sub: 'The game’s sandō has no guardians or basin yet. A pair of lion-dogs, one mouth open and one shut, and the water you wash in.' },
  { key: 'hall', title: 'The house <em>of the god</em>', sub: 'The game’s hall, then the three roofs Kyoto’s shrines are built from.' },
  { key: 'altar', title: 'Small bells, <em>quiet places</em>', sub: 'The mist altar and the offering bells that send Michi round the valley.' }
];

/* ---------------- shared bits for several tiles ---------------- */

function gateOf(o) { return buildGate(o); }

let hiwada = null;
const hiwadaMat = () => (hiwada ||= new THREE.MeshStandardMaterial({ map: hiwadaTexture(), roughness: 1, side: THREE.DoubleSide }));

function ropeFrame(k, profile, school, { sag = 0.16 } = {}) {
  const g = new k.THREE.Group();
  const post = k.M.wood({ base: 0x7a5c3a, dark: 0x4a3322 });
  for (const s of [-1, 1]) g.add(new k.THREE.Mesh(k.tube([k.V3(s * 1.5, 0, 0), k.V3(s * 1.5, 2.1, 0)], 0.09, { radial: 12 }), post));
  const R = shimenawa(3.2, 1.95, { profile, sag });
  g.add(new k.THREE.Mesh(R.geo, k.M.straw({ color: 0xcdb077 })));
  g.add(sagari(R.pts));
  let sway = null;
  if (school) { const h = hangShide(R.pts, school, 4); g.add(h.group); sway = h.sway; }
  return { group: g, update: (t) => sway && sway(t) };
}

/** A shrine hall in one of the three classic roofs. */
export function hallOf(k, style = 'nagare') {
  const T = k.THREE, g = new T.Group(), P = { nagare: { w: 3.1, d: 2.5, h: 1.75, ridge: 1.15, over: 0.55, front: 1.45, sori: 0.2 }, shinmei: { w: 3.4, d: 2.6, h: 2.0, ridge: 1.5, over: 0.5, front: 0, sori: 0 }, kasuga: { w: 2.1, d: 2.3, h: 1.6, ridge: 1.05, over: 0.5, front: 0.5, sori: 0.24 } }[style];
  const vermilion = style === 'kasuga', wood = k.M.wood({ base: vermilion ? 0xb7442c : 0xa98257, dark: vermilion ? 0x9a3522 : 0x94714b, seed: vermilion ? 9 : 4 });
  const stone = k.M.stone({ tint: 0x8f8a7e, moss: 0.3, lichen: 0.3 });
  const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
  g.add(at(new T.Mesh(new T.BoxGeometry(P.w + 1.3, 0.3, P.d + 1.5), stone), 0, 0.15, 0));
  const b = new Bag(), dark = 0x3a2616, frame = vermilion ? 0xa93a26 : 0x8a6238;
  const floor = 0.62;
  const veranda = 0xa3835e;
  b.box(P.w + 0.2, 0.08, P.d + 0.8, { y: floor, color: veranda });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1], [0, -1]]) b.cyl(0.085, P.h + floor, { x: sx * P.w / 2, y: (P.h + floor) / 2, z: sz * P.d / 2, color: frame });
  b.box(P.w, 0.1, 0.1, { y: P.h + floor, z: P.d / 2, color: frame }); b.box(P.w, 0.1, 0.1, { y: P.h + floor, z: -P.d / 2, color: frame });
  b.box(0.1, 0.1, P.d, { x: P.w / 2, y: P.h + floor, color: frame }); b.box(0.1, 0.1, P.d, { x: -P.w / 2, y: P.h + floor, color: frame });
  // Leave the stair/door approach open between the two kōran runs.
  for (const sign of [-1, 1]) {
    const inner = 0.75, outer = P.w / 2 + 0.15, length = outer - inner;
    const n = Math.max(1, Math.ceil(length / 0.35));
    for (let i = 0; i <= n; i++) b.box(0.04, 0.6, 0.04, { x: sign * (inner + length * i / n), y: floor + 0.34, z: P.d / 2 + 0.28, color: veranda });
    b.box(length + 0.04, 0.05, 0.08, { x: sign * (inner + outer) / 2, y: floor + 0.66, z: P.d / 2 + 0.28, color: veranda });
  }
  for (let i = 0; i < 4; i++) b.box(1.5, floor * (i + 1) / 4, 0.34, { y: floor * (i + 1) / 8, z: P.d / 2 + 0.48 + (3 - i) * 0.3, color: veranda });   // grounded kizahashi steps
  g.add(b.mesh(k.M.bag({ rough: 0.7 }), 'frame'));
  const wall = new T.BoxGeometry(P.w - 0.1, P.h, P.d - 0.1); worldScaleBoxUVs(wall, 0.7);
  const infill = vermilion ? k.M.plaster({ tint: 0xeee5d1, grime: 0.1 }) : wood;
  g.add(at(new T.Mesh(wall, infill), 0, floor + P.h / 2, 0));
  const door = new T.Mesh(new T.BoxGeometry(1.1, P.h * 0.82, 0.05), k.M.plain(dark, { rough: 0.5 })); door.position.set(0, floor + P.h * 0.42, P.d / 2 - 0.03); g.add(door);
  // the roof: two curved skins
  const roofMat = style === 'shinmei' ? k.M.straw({ color: 0x9a8352, side: T.DoubleSide }) : hiwadaMat();
  const roofGroup = new T.Group(), rw = style === 'kasuga' ? P.d : P.w, rd = style === 'kasuga' ? P.w : P.d, front = style === 'kasuga' ? 0 : P.front;
  roofGroup.position.y = floor + P.h + P.ridge + 0.04;
  if (style === 'kasuga') roofGroup.rotation.y = Math.PI / 2;
  g.add(roofGroup);
  const roof = new T.Mesh(hallRoofSurface({ w: rw, d: rd, ridge: P.ridge, over: P.over, sori: P.sori, frontOver: front }), roofMat); roof.name = 'Bark roof and soffit'; roofGroup.add(roof);
  // Fill the attic to the underside of the very same curved roof. No open
  // triangular hole above a wall and no floating ridge or gable ornament.
  const atticGeo = new T.BoxGeometry(rw, 1, rd, 1, 1, 32), ap = atticGeo.attributes.position;
  for (let i = 0; i < ap.count; i++) {
    const z = ap.getZ(i), run = rd / 2 + P.over + (z > 0 ? front : 0), v = Math.abs(z) / run;
    const dy = -P.ridge * (1 - Math.pow(1 - v, 1.28)) + P.sori * v ** 3 + P.sori * 0.55 * Math.pow(Math.abs(ap.getX(i)) / ((rw + P.over * 2) / 2), 2.4) * Math.pow(v, 1.5);
    ap.setY(i, ap.getY(i) > 0 ? dy - 0.09 : -P.ridge - 0.05);
  }
  atticGeo.computeVertexNormals(); const attic = new T.Mesh(atticGeo, infill); attic.name = 'Closed gables'; roofGroup.add(attic);
  const ridge = new T.Mesh(new T.BoxGeometry(rw + P.over * 2 + 0.1, 0.16, 0.2), k.M.plain(0x2a2219, { rough: 0.7 })); ridge.position.y = 0.05; roofGroup.add(ridge);
  const chigiM = k.M.wood({ base: 0xcdb284, dark: 0x8a6a42 });
  if (style !== 'nagare') {
    for (const s of [-1, 1]) for (const f of [-1, 1]) {
      const c = new T.Mesh(new T.BoxGeometry(0.1, 1.15, 0.13), chigiM);
      c.position.set(s * (rw / 2 + P.over * 0.8), 0.42, f * 0.28);
      c.rotation.x = f * 0.5;
      roofGroup.add(c);
    }
    for (const x of [-0.9, -0.3, 0.3, 0.9]) { const lg = new T.Mesh(new T.CylinderGeometry(0.09, 0.09, 0.62, 10), chigiM); lg.rotation.x = Math.PI / 2; lg.position.set(x * rw / 2, 0.16, 0); roofGroup.add(lg); }
  }
  if (style === 'kasuga') {
    const canopy = new T.Mesh(hallRoofSurface({ w: P.w, d: 0.8, ridge: 0.3, over: 0.12, frontOver: 0.35, sori: 0.05 }), roofMat);
    canopy.name = 'Kasuga porch roof'; canopy.position.set(0, floor + P.h - 0.04, P.d / 2 + 0.45); g.add(canopy);
    const porchZ = P.d / 2 + 0.8, v = (porchZ - canopy.position.z) / (0.4 + 0.12 + 0.35);
    const soffit = canopy.position.y - 0.3 * (1 - Math.pow(1 - v, 1.28)) + 0.05 * v ** 3 - 0.09;
    const bearingY = soffit - 0.06;
    const beam = at(new T.Mesh(new T.BoxGeometry(1.65, 0.14, 0.14), wood), 0, bearingY, porchZ);
    beam.name = 'Kasuga porch bearing beam'; g.add(beam);
    for (const x of [-0.7, 0.7]) {
      g.add(at(new T.Mesh(new T.BoxGeometry(0.24, 0.1, 0.24), stone), x, 0.05, porchZ));
      const post = at(new T.Mesh(new T.BoxGeometry(0.12, bearingY - 0.08, 0.12), wood), x, (bearingY + 0.08) / 2, porchZ);
      post.name = 'Kasuga porch pillar'; g.add(post);
    }
  }
  if (style === 'nagare') {
    const porchZ = P.d / 2 + P.front * 0.65, run = P.d / 2 + P.over + P.front;
    const underside = (x, z) => {
      const v = z / run;
      return roofGroup.position.y - P.ridge * (1 - Math.pow(1 - v, 1.28)) + P.sori * v ** 3 + P.sori * 0.55 * Math.pow(Math.abs(x) / ((P.w + P.over * 2) / 2), 2.4) * Math.pow(v, 1.5) - 0.13;
    };
    for (const x of [-0.92, 0.92]) {
      const y = underside(x, porchZ);
      g.add(at(new T.Mesh(new T.BoxGeometry(0.24, 0.1, 0.24), stone), x, 0.05, porchZ));
      g.add(at(new T.Mesh(new T.BoxGeometry(0.12, y - 0.08, 0.12), wood), x, (y + 0.08) / 2, porchZ));
      const pts = Array.from({ length: 19 }, (_, i) => { const z = P.d / 2 - 0.1 + (run - P.d / 2) * i / 18; return k.V3(x, underside(x, z), z); });
      g.add(new T.Mesh(sweep(pts, ringRect(0.12, 0.14, 0.01)), wood));
    }
  }
  return g;
}

export const SPECIMENS = [
  /* -------- gate -------- */
  {
    id: 'game-torii', family: 'gate', original: true, name: 'Our torii', jp: '今の鳥居', tag: 'What Michi walks under today', plinth: 'earth', game: gameFn('buildTorii'),
    blurb: 'The real buildTorii(), called in isolation. Lacquer posts, boxes for the swept kasagi, and pegs for the late-game climb.',
    how: ['Straight box beams, with the wing ends rotated by hand to suggest a sweep.', 'A black collar stands in for the kamebara and the sleeve.'],
    use: 'The baseline. It reads from far away and is cheap, but the box joints show from the cat-eye camera.',
    sources: ['jaanus', 'jref'],
    build(k) { return originalOf('buildTorii', 0, 0).group; }
  },
  {
    id: 'myojin', family: 'gate', name: 'Myōjin', jp: '明神', tag: 'The swept lintel, drawn as one curve', plinth: 'earth',
    blurb: 'Kasagi and shimaki are swept along a single curve, the ends cut on a slant, posts leaning in on their kamebara stones.',
    how: ['The lintels are a rectangular section swept along a Catmull-Rom curve, not boxes.', 'The nuki passes through the posts and projects a fifth of its length in total.', 'Merged per material: 3 draws for the whole gate.'],
    use: 'The new default for the valley. Every other gate here is this one with different numbers.',
    sources: ['jaanus', 'commons', 'tube'], also: [gateParts],
    build(k) { return gateOf({ kind: 'myojin' }); }
  },
  {
    id: 'shinmei', family: 'gate', name: 'Shinmei', jp: '神明', tag: 'Straight, round, unpainted', plinth: 'earth',
    blurb: 'The older Ise form: an unpainted round log over straight posts, no shimaki, and nothing sweeping upward.',
    how: ['Round kasagi, plain wood, zero lean.', 'The nuki stops at the posts.'],
    use: 'Quiet inner shrines, or the valley’s oldest corner.',
    sources: ['jref', 'commons'], also: [gateParts],
    build(k) { return gateOf({ kind: 'shinmei', lean: 0, sori: SORI.straight }); }
  },
  {
    id: 'ishi', family: 'gate', name: 'Ishi-dorii', jp: '石鳥居', tag: 'Granite, with the moss already on', plinth: 'stone',
    blurb: 'The same myōjin measurements cut from granite. Moss gathers on the top of the kasagi and the feet.',
    how: ['Only the material changes: the paintify moss mask reads the world-space normal.', 'A heavier post and shallower sweep suit stone.'],
    use: 'A landmark that ages well in rain.',
    sources: ['commons', 'fwd'], also: [gateParts],
    build(k) { return gateOf({ kind: 'ishi', postR: 0.27, sori: SORI.gentle, lean: 0.02, moss: 0.9 }); }
  },
  {
    id: 'deep', family: 'gate', name: 'A deep sweep', jp: '反り増し', tag: 'The same gate, more lift', plinth: 'earth',
    blurb: 'Sorimashi is the amount the ends rise. This one is pushed well past normal to show how much of the gate’s character lives there.',
    how: ['Only the sori array changes.', 'Try it yourself in the kasagi editor on the stage.'],
    use: 'A reference: the eye forgives very little here.',
    sources: ['jaanus'], also: [curveOf],
    build(k) { return gateOf({ kind: 'myojin', sori: SORI.deep }); }
  },
  {
    id: 'ryobu', family: 'gate', name: 'Ryōbu', jp: '両部', tag: 'Four small posts holding up the two', plinth: 'earth',
    blurb: 'Each main post gets two short supporting legs, braced fore and aft, the form seen at Itsukushima and many sea-facing shrines.',
    how: ['Sode posts are short tubes offset along z, tied in with a low cross beam.', 'They add a footprint players can walk around.'],
    use: 'A gate that stands in water or on a slope.',
    sources: ['commons'],
    build(k) {
      const g = gateOf({ kind: 'myojin' }), m = gateMats({});
      for (const s of [-1, 1]) for (const f of [-1, 1]) {
        const a = k.V3(s * 1.8, 0, f * 0.85), b = k.V3(s * 1.8, 2.2, f * 0.85);
        g.add(new k.THREE.Mesh(k.tube([a, b], 0.1, { radial: 12 }), m.paint));
        g.add(new k.THREE.Mesh(new k.THREE.BoxGeometry(0.1, 0.13, 0.9).translate(s * 1.8, 2.05, f * 0.42), m.paint));
      }
      return g;
    }
  },
  {
    id: 'miwa', family: 'gate', name: 'Miwa', jp: '三輪', tag: 'Two small gates at its shoulders', plinth: 'earth',
    blurb: 'A central myōjin flanked by two lesser openings, joined into one screen: rare, and very good from a distance.',
    how: ['Two smaller gates are built with the same function and placed at the sides.', 'Beams tie them at the height of the side lintels.'],
    use: 'An entrance worth a screenshot.',
    sources: ['commons'],
    build(k) {
      const g = new k.THREE.Group();
      g.add(gateOf({ kind: 'myojin' }));
      for (const s of [-1, 1]) {
        const sideOptions = { kind: 'myojin', span: 1.5, height: 2.9, postR: 0.14, lintelH: 0.2, lintelD: 0.26, ext: 0.3, nukiDrop: 0.5, sori: SORI.gentle, lean: 0 };
        const small = new k.THREE.Group(), materials = gateMats({});
        for (const part of gateParts(sideOptions)) {
          part.geo.computeBoundingBox();
          const centreX = part.geo.boundingBox.getCenter(k.V3()).x;
          if (['hashira', 'nemaki', 'kamebara'].includes(part.name) && Math.sign(centreX) !== s) continue;
          small.add(new k.THREE.Mesh(part.geo, materials[part.mat]));
        }
        small.position.x = s * (1.8 - 0.03 * 2.9 + 0.75);
        g.add(small);
      }
      return g;
    }
  },
  {
    id: 'mihashira', family: 'gate', name: 'Mihashira', jp: '三柱', tag: 'Three gates sharing a triangle', plinth: 'earth',
    blurb: 'Three gates set in a triangle around a sacred spot. There is no front to it, so it asks you to walk round.',
    how: ['Three copies rotated by 120°, each with its outer post shared by the next.', 'Radius r = span / √3 so the post positions coincide.'],
    use: 'A hidden place: Michi could circle it.',
    sources: ['commons'],
    build(k) {
      const g = new k.THREE.Group(), span = 2.6, r = span / Math.sqrt(3);
      for (let i = 0; i < 3; i++) {
        const a = i / 3 * k.TAU, gate = gateOf({ kind: 'myojin', span, height: 3.3, postR: 0.15, lintelH: 0.22, lintelD: 0.26, ext: 0.3, nukiDrop: 0.55, lean: 0, sori: SORI.gentle });
        gate.position.set(Math.sin(a) * r * 0.5, 0, Math.cos(a) * r * 0.5);
        gate.rotation.y = a;
        g.add(gate);
      }
      return g;
    }
  },

  /* -------- rope -------- */
  {
    id: 'game-rope', family: 'rope', original: true, name: 'Our rope', jp: '今の注連縄', tag: 'One straw-coloured cylinder', plinth: 'wood', game: gameFn('buildShrine'),
    blurb: 'Pulled straight out of the real buildShrine(). The comment says “with paper Shide zigzags”, but only the cylinder made it in.',
    how: ['A CylinderGeometry of radius 5 cm, rotated flat.'],
    use: 'The baseline. It is here so the difference is honest.',
    sources: ['rope'],
    build(k) {
      const shrine = originalOf('buildShrine', 0, 0).group, g = new k.THREE.Group();
      shrine.traverse((o) => { if (o.isMesh && o.geometry.type === 'CylinderGeometry' && o.geometry.parameters.radiusTop === 0.05) g.add(o.clone()); });
      g.children.forEach((c) => c.position.set(0, 0.2, 0));
      return g;
    }
  },
  {
    id: 'daikon', family: 'rope', name: 'Daikon-jime', jp: '大根注連', tag: 'Fat in the middle, like the radish', plinth: 'wood',
    blurb: 'Three straw strands wound as helices, the radius swelling toward the centre, with combed sagari tufts below.',
    how: ['The rope is three tubes following helices round a catenary.', 'radius(t) = base + bulge · sin(πt)^1.3.'],
    use: 'The shrine’s main rope.',
    sources: ['rope', 'tubeExt'], also: [ropeProfiles.daikon],
    build(k) { return ropeFrame(k, 'daikon', null); }
  },
  {
    id: 'gobo', family: 'rope', name: 'Gobō-jime', jp: '牛蒡注連', tag: 'Slim, even, burdock-root rope', plinth: 'wood',
    blurb: 'The everyday rope for gates and sacred trees: thinner, more even, and far cheaper to hang in numbers.',
    how: ['Same builder, with a flat radius profile.'],
    use: 'Torii, the sacred tree, the mountain gate.',
    sources: ['rope'], also: [ropeProfiles.gobo],
    build(k) { return ropeFrame(k, 'gobo', null); }
  },
  {
    id: 'yoshida', family: 'rope', name: 'Yoshida shide', jp: '吉田流', tag: 'Every fold to the same side', plinth: 'wood', animatedShadow: true,
    blurb: 'The most common school of paper zigzag: each tongue steps the same way, so the strip walks down and sideways like lightning.',
    how: ['Four paper tongues, each offset by a fixed step and folded alternately in z.', 'A small sine sway is enough to sell it.'],
    use: 'Default paper for valley ropes.',
    sources: ['shide', 'otaki'], also: [shideGeo],
    build(k) { return ropeFrame(k, 'gobo', 'yoshida'); }
  },
  {
    id: 'shirakawa', family: 'rope', name: 'Shirakawa shide', jp: '白川流', tag: 'Folds that alternate', plinth: 'wood', animatedShadow: true,
    blurb: 'The tongues alternate left and right, so the strip hangs straight and zigzags as it goes.',
    how: ['Only the offset function changes.'],
    use: 'A second school for a different shrine.',
    sources: ['shide', 'otaki'], also: [shideGeo],
    build(k) { return ropeFrame(k, 'gobo', 'shirakawa'); }
  },
  {
    id: 'ise', family: 'rope', name: 'Ise shide', jp: '伊勢流', tag: 'Longer, narrower tongues', plinth: 'wood', animatedShadow: true,
    blurb: 'The third school, cut differently: slimmer tongues with a long tail on the last fold.',
    how: ['A narrower strip and a stretched last tier.'],
    use: 'Rare enough to feel like a discovery.',
    sources: ['shide', 'otaki'], also: [shideGeo],
    build(k) { return ropeFrame(k, 'gobo', 'ise'); }
  },

  /* -------- guardians and the approach -------- */
  {
    id: 'game-approach', family: 'guard', original: true, name: 'The approach today', jp: '今の参道', tag: 'No guardians, no basin yet', plinth: 'gravel',
    blurb: 'The game has neither komainu nor a chōzuya, so this tile is honestly empty: raked gravel and the gate’s footing.',
    how: ['There is no original to compare against. The new pieces below are additions, not replacements.'],
    use: 'A reminder of what is missing.',
    sources: ['tkyoto'],
    build(k) { const g = new k.THREE.Group(); g.add(new k.THREE.Mesh(new k.THREE.BoxGeometry(0.4, 0.02, 0.4), k.M.plain(0xd6cfbb))); return g; }
  },
  {
    id: 'agyo', family: 'guard', name: 'A-gyō', jp: '阿形', tag: 'Mouth open: the first sound', plinth: 'stone',
    blurb: 'A seated lion-dog sculpted from soft primitives with the game’s own cat sculptor, its open mouth carved out of the field.',
    how: ['Haunches, chest, legs, head and rows of mane curls are smooth-unioned into one field.', 'A subtracted ellipsoid makes the open mouth.', 'Surface nets mesh it at 2 cm.'],
    use: 'The left guardian. One statue costs about one draw.',
    sources: ['metkoma', 'tkyoto', 'sdf', 'surfnets'], also: [komainuPrims],
    build(k) { return komainu(k, true); }
  },
  {
    id: 'ungyo', family: 'guard', name: 'Un-gyō', jp: '吽形', tag: 'Mouth shut: the last sound, and the horn', plinth: 'stone',
    blurb: 'The partner: closed mouth and a single horn. Together they say a-un, the beginning and end of all things.',
    how: ['The same field with the mouth cut swapped for a line and a horn added.', 'Moss comes from the world-space normal, so it sits where rain would.'],
    use: 'The right guardian.',
    sources: ['metkoma', 'tkyoto', 'sdf'], also: [komainuPrims],
    build(k) { return komainu(k, false); }
  },
  {
    id: 'chozuya', family: 'guard', name: 'Chōzuya', jp: '手水舎', tag: 'The roofed basin', plinth: 'stone', animatedShadow: false,
    blurb: 'Four posts and a small roof over a stone trough, a bamboo spout running and a dipper resting across it.',
    how: ['The water sits below the stone rim, inside a hollow trough.', 'A straight hollow feeder sits on a grounded supply riser and lashed trestle.'],
    use: 'Michi can drink here. Worth a stop.',
    sources: ['ise'],
    build(k) { return chozuya(k); }
  },
  {
    id: 'sando', family: 'guard', name: 'Sandō and seichū', jp: '参道', tag: 'Paved path, with the middle kept for the god', plinth: 'gravel',
    blurb: 'Rectangular paving through gravel. The centre line, the seichū, is left for the kami, so visitors walk at the sides.',
    how: ['Stones are instanced boxes jittered in size and yaw.'],
    use: 'The path the shrine stage is laid on.',
    sources: ['ise'],
    build(k) {
      const list = [], r = k.rand;
      for (let z = 0; z < 7; z++) for (let x = 0; x < 3; x++) {
        const w = 0.5 + r() * 0.1, d = 0.46 + r() * 0.1;
        list.push({ x: (x - 1) * 0.62 + (z % 2 ? 0.14 : 0), y: 0.03, z: (z - 3) * 0.56, sx: w, sy: 0.06, sz: d, ry: (r() - 0.5) * 0.08, color: 0xa39e93 });
      }
      return k.instances(new k.THREE.BoxGeometry(1, 1, 1), k.M.stone({ tint: 0xb4afa3 }), list);
    }
  },

  /* -------- hall -------- */
  {
    id: 'game-hall', family: 'hall', original: true, name: 'Our hall', jp: '今の本殿', tag: 'buildShrine(), as it stands', plinth: 'stone', game: gameFn('buildShrine'),
    blurb: 'A boxed hall on a stepped plinth under a kawara gable, with chigi, katsuogi, the rope, the bell and the offering box.',
    how: ['Boxes and a shared kawara roof builder.'],
    use: 'The baseline.',
    sources: ['wha'],
    build(k) { return originalOf('buildShrine', 0, 0).group; }
  },
  {
    id: 'nagare', family: 'hall', name: 'Nagare-zukuri', jp: '流造', tag: 'The roof that flows over the steps', plinth: 'stone',
    blurb: 'The most common shrine form in Japan: the front slope runs on over the stairs, so the roof is asymmetric from the side.',
    how: ['One curved grid surface per slope, the front one extended by frontOver.', 'Cypress-bark courses are painted as a canvas texture.'],
    use: 'The best fit for the game’s hall. It keeps the silhouette low and generous.',
    sources: ['wha', 'kasuga'], also: [hallRoofSurface],
    build(k) { return hallOf(k, 'nagare'); }
  },
  {
    id: 'shinmei-h', family: 'hall', name: 'Shinmei-zukuri', jp: '神明造', tag: 'Thatch, straight lines, rice storehouse', plinth: 'stone',
    blurb: 'The oldest form: straight thatched gables with chigi and katsuogi, modelled on Yayoi-period rice stores.',
    how: ['Same builder with no eave sweep and a thatch material.', 'Chigi cross at the gable ends and katsuogi sit along the ridge.'],
    use: 'A far older shrine deeper in the forest.',
    sources: ['wha'], also: [hallRoofSurface],
    build(k) { return hallOf(k, 'shinmei'); }
  },
  {
    id: 'kasuga-h', family: 'hall', name: 'Kasuga-zukuri', jp: '春日造', tag: 'Small, vermilion, entered from the gable', plinth: 'stone',
    blurb: 'A little vermilion hall with its door under the gable and a canopy over the steps, common around Nara and southern Kyoto.',
    how: ['A shorter, narrower plan and a stronger eave lift.'],
    use: 'Roadside shrines, repeated cheaply.',
    sources: ['kasuga', 'wha'], also: [hallRoofSurface],
    build(k) { return hallOf(k, 'kasuga'); }
  },
  {
    id: 'suzu', family: 'hall', name: 'Suzu and offering box', jp: '鈴と賽銭箱', tag: 'The doorbell, and the coin before it', plinth: 'wood', animatedShadow: false,
    blurb: 'A lathed bronze crotal bell with its slit, hung on a striped rope above a slatted offering box.',
    how: ['A lathe profile, then a thin dark box for the slit.', 'On the stage, this bell swings and rings when clicked.'],
    use: 'The interactive heart of the shrine.',
    sources: ['lathe'], also: [buildSuzu],
    build(k) {
      const g = new k.THREE.Group();
      const s = buildSuzu({ cord: 0.9 }); s.position.y = 1.5; g.add(s);
      const b = new k.Bag(), c = 0x5a3a24;
      b.box(0.8, 0.42, 0.5, { y: 0.21, color: 0x4a2f1c });
      for (let i = 0; i < 9; i++) b.box(0.74, 0.03, 0.05, { y: 0.44, z: (i - 4) * 0.055, rx: 0.5, color: c });
      g.add(b.mesh(k.M.bag({ rough: 0.65 })));
      return g;
    }
  },

  /* -------- altar -------- */
  {
    id: 'game-altar', family: 'altar', original: true, name: 'The mist altar', jp: '霧の祠', tag: 'Only there when the mist is', plinth: 'moss', game: gameFn('buildMistAltar'), animatedShadow: false,
    blurb: 'The real buildMistAltar(), with its fade-in held fully open so you can see it without waiting for weather.',
    how: ['Its materials start at opacity 0 and fade in with the mist. The tile sets them to 1.'],
    use: 'The baseline.',
    sources: [],
    build(k) {
      const { group } = originalOf('buildMistAltar', 0, 0);
      group.traverse((o) => {
        if (o.isSprite) o.material.opacity = 0.7;
        else if (o.material?.isMeshStandardMaterial) { o.material.opacity = 1; o.material.transparent = false; }
      });
      return group;
    }
  },
  {
    id: 'game-bell', family: 'altar', original: true, name: 'An offering bell', jp: '今の鈴', tag: 'Five of these hide in the valley', plinth: 'moss', game: gameFn('buildOfferingBells'),
    blurb: 'One of the five bells from the real buildOfferingBells(), the quest that walks you round the valley.',
    how: ['A half-sphere dome, a clapper and a ring.'],
    use: 'The baseline.',
    sources: [],
    build(k) { const kit = gameKit(); kit.buildOfferingBells(); const bell = kit.offeringBells[0]; bell.position.set(0, 0, 0); bell.rotation.y = 0; return ownMaterials(bell); }
  },
  {
    id: 'bell-new', family: 'altar', name: 'A proper offering bell', jp: '鈴', tag: 'A lathed crotal that catches the low sun', plinth: 'moss',
    blurb: 'The same size and job as the game’s bell, with a real profile, a slit and a tied red cord, so it reads as a bell at cat height.',
    how: ['The same suzu builder at a tenth the size, with a short cord and a little sway.', 'Metal this polished needs an environment map to look like anything.'],
    use: 'A direct swap for the five quest bells.',
    sources: ['lathe'], also: [buildSuzu],
    build(k) {
      const g = new k.THREE.Group();
      const s = buildSuzu({ cord: 0.32 }); s.scale.setScalar(0.5); s.position.y = 0.34; g.add(s);
      return { group: g, update: (t) => { s.rotation.z = Math.sin(t * 2.1) * 0.08; } };
    }
  },
  {
    id: 'saisen-bako', family: 'hall', name: 'Saisen-bako', jp: '賽銭箱', tag: 'The offering box, up close', plinth: 'wood', animatedShadow: false,
    blurb: 'A focused study of the box the coin goes into: a dark core behind vertical front slats, a tilted grating on top (the coin slot), a rope strap and a few coins resting on the bars. It is the game\u2019s offering-box, 0.8 m wide.',
    how: ['Boards are thin boxes baked into one vertex-coloured mesh: no textures, one draw.', 'The top bars tilt a little toward the front so coins slide into the gaps.', 'The kit asset offering-box in src/kit/shrine builds exactly this, in three tiers.'],
    use: 'Stands on the upper dan at the foot of the hall; the cat\u2019s eye line sees the front slats and the coins.',
    sources: ['lathe'],
    build(k) {
      const g = new k.THREE.Group(), b = new k.Bag(), sl = [0x5a3a24, 0x4d3220, 0x65432a], r = rng(5);
      b.box(0.78, 0.42, 0.48, { y: 0.21, color: 0x22160d });
      for (let i = 0; i < 9; i++) b.box(0.72 / 9 - 0.012, 0.36, 0.02, { x: -0.36 + i * 0.09, y: 0.2, z: 0.245, color: sl[i % 3] });
      for (const sx of [-1, 1]) b.box(0.02, 0.36, 0.44, { x: sx * 0.39, y: 0.2, color: sl[1] });
      b.box(0.8, 0.05, 0.5, { y: 0.025, color: 0x47301d });
      b.box(0.82, 0.04, 0.52, { y: 0.43, color: 0x694630 });
      for (let i = 0; i < 9; i++) b.box(0.74, 0.03, 0.03, { y: 0.465, z: -0.19 + i * 0.0475, rx: -0.12, color: sl[(i + 1) % 3] });
      b.box(0.82, 0.03, 0.012, { y: 0.3, z: 0.262, color: 0xcdb077 });
      for (let i = 0; i < 4; i++) b.cyl(0.016, 0.004, { x: -0.25 + r() * 0.5, y: 0.485, z: -0.12 + r() * 0.3, rx: -0.12, color: i % 2 ? 0xc9a86a : 0xbfc2c4 });
      g.add(b.mesh(k.M.bag({ rough: 0.65 })));
      return g;
    }
  }
];

/* tiles that need the sculptor */
function komainu(k, open) {
  const g = new k.THREE.Group();
  const geo = sculpt(komainuPrims(open), 0.02, { relax: 3 });
  const m = new k.THREE.Mesh(geo, k.M.rock({ a: 0x77736a, b: 0xb3ad9f, moss: 0.65, lichen: 0.7, bump: 0.016 }));
  m.position.y = 0.26;
  g.add(m);
  const base = new k.THREE.Mesh(new k.THREE.BoxGeometry(0.72, 0.26, 0.82), k.M.stone({ tint: 0x9a958a, moss: 0.3, lichen: 0.5 }));
  base.position.y = 0.13;
  g.add(base);
  return g;
}

export function chozuya(k) {
  const T = k.THREE, g = new T.Group(), wood = k.M.wood({ base: 0x7a5c3a, dark: 0x4a3322 }), stone = k.M.stone({ tint: 0x9e998e, moss: 0.4, lichen: 0.4 });
  for (const [x, z] of [[-1, -0.65], [1, -0.65], [-1, 0.65], [1, 0.65]]) g.add(new T.Mesh(k.tube([k.V3(x, 0, z), k.V3(x, 2.05, z)], 0.07, { radial: 10 }), wood));
  const roof = new T.Mesh(hallRoofSurface({ w: 2.3, d: 1.5, ridge: 0.5, over: 0.28, sori: 0.1 }), k.M.tile({ side: T.DoubleSide }));
  roof.position.y = 2.52; g.add(roof);
  const frame = new k.Bag();
  for (const z of [-0.65, 0.65]) frame.box(2.2, 0.14, 0.16, { y: 2.08, z, color: 0x735234 });
  for (const x of [-1, 0, 1]) {
    frame.box(0.13, 0.14, 1.5, { x, y: 2.08, color: 0x735234 });
    frame.box(0.12, 0.37, 0.12, { x, y: 2.30, color: 0x735234 });
  }
  g.add(frame.mesh(k.M.bag({ rough: 0.8 }), 'Roof bearings'));
  const trough = new T.Group(); trough.name = 'Hollow stone trough'; g.add(trough);
  const block = (w, h, d, x, y, z) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), stone); m.position.set(x, y, z); trough.add(m); };
  block(1.4, 0.14, 0.74, 0, 0.07, 0);
  for (const s of [-1, 1]) { block(0.12, 0.45, 0.74, s * 0.64, 0.335, 0); block(1.16, 0.45, 0.12, 0, 0.335, s * 0.31); }
  const water = new T.Mesh(new T.BoxGeometry(1.16, 0.01, 0.5), new T.MeshStandardMaterial({ color: 0x4a7a7c, roughness: 0.12, metalness: 0.15 })); water.position.y = 0.485; g.add(water);
  const outlet = bambooFeed(g, k.V3(-0.42, 0.92, 0.18));
  const stream = new T.Mesh(k.tube([outlet, k.V3(outlet.x, 0.49, outlet.z)], 0.008, { radial: 6 }), new T.MeshStandardMaterial({ color: 0xb8dcd6, transparent: true, opacity: 0.65, roughness: 0.12 })); g.add(stream);
  for (const x of [-0.35, 0.35]) g.add(new T.Mesh(k.tube([k.V3(x, 0.585, -0.4), k.V3(x, 0.585, 0.4)], 0.018, { radial: 8 }), k.M.bamboo()));
  const hishaku = new T.Group(), cup = new T.Mesh(new T.LatheGeometry([[0.001, 0], [0.055, 0], [0.055, 0.065], [0.045, 0.065], [0.045, 0.012], [0.001, 0.012]].map(([x, y]) => new T.Vector2(x, y)), 20), k.M.wood({ base: 0xc9a06a }));
  cup.position.set(0.35, 0.603, 0.1); hishaku.add(cup);
  hishaku.add(new T.Mesh(k.tube([k.V3(-0.35, 0.612, 0.1), k.V3(0.35, 0.612, 0.1)], 0.008, { radial: 8 }), wood)); g.add(hishaku);
  return g;
}

/* ---------------- the stepper ---------------- */

export const STEPS = [
  { title: 'Seat the stones', body: '<p>A torii starts with two <em>kamebara</em>, swelling stone feet. Everything above leans on them.</p>', code: 'LatheGeometry(mound profile, 18) // one per post', phase: 0 },
  { title: 'Stand the posts', body: '<p><em>Hashira</em> are tapered and lean inward a little (<em>uchikorobi</em>). The lean is small and you feel it more than you see it.</p>', code: 'tube([base, mid, top], t => R * lerp(1, 0.8, t), { radial: 18 })', phase: 1 },
  { title: 'Slip in the nuki', body: '<p>The tie beam passes straight through the posts and projects past them. Roughly, the ground to its underside equals the clear span.</p>', code: 'sweep([a, b], ringRect(h, d, bevel))', phase: 2 },
  { title: 'Drive the wedges', body: '<p><em>Kusabi</em> lock the nuki in place. They are a tiny detail you can only see from the ground, which is where a cat is.</p>', phase: 3 },
  { title: 'Set the strut', body: '<p>The <em>gakuzuka</em> stands between nuki and lintel and often carries the shrine’s name tablet.</p>', phase: 4 },
  { title: 'Lift the shimaki', body: '<p>The lower lintel is the first to take the curve. Drawn along the same curve as the kasagi, slightly shorter.</p>', code: 'beamOnCurve(L * 0.965, y - h, t => C(t) * 0.96, ...)', phase: 5 },
  { title: 'Cap it with the kasagi', body: '<p>The black top lintel, swept up at the ends and cut on a slant. Most of the gate’s character is in this one curve.</p>', code: 'beamOnCurve(L, y, C, h, d, bevel, tan = 0.35)', phase: 6 },
  { title: 'Hang the rope and paper', body: '<p>A <em>shimenawa</em> across the opening, paper tongues folded and tied in. The gate is now a gate.</p>', code: 'rope(catenary(a, b, sag), profile, { strands: 3, twist: 7 })', phase: 7 }
];

export const ASSEMBLY = {
  radius: 3.8, target: [0, 2.6, 0], shadow: 7,
  build(k) {
    const g = new k.THREE.Group(), parts = gateParts({ kind: 'myojin' }), mats = gateMats({});
    const order = { kamebara: 0, hashira: 1, nemaki: 1, nuki: 2, kusabi: 3, gakuzuka: 4, shimaki: 5, kasagi: 6 };
    const meshes = parts.map((p) => { const m = new k.THREE.Mesh(p.geo, mats[p.mat]); m.userData.phase = order[p.name]; g.add(m); return m; });
    const R = shimenawa(3.1, 3.72, { profile: 'gobo', sag: 0.1 }), ropeM = new k.THREE.Mesh(R.geo, k.M.straw({ color: 0xcdb077 }));
    ropeM.userData.phase = 7; g.add(ropeM);
    const h = hangShide(R.pts, 'yoshida', 4); h.group.userData.phase = 7; g.add(h.group);
    meshes.push(ropeM, h.group);
    const ground = new k.THREE.Mesh(new k.THREE.BoxGeometry(6.4, 0.2, 3.2), k.M.plain(0xd6cfbb)); ground.position.y = -0.1; g.add(ground); ground.userData.noShadow = true;
    let phase = 0;
    const set = (p) => { phase = p; for (const m of meshes) { m.visible = m.userData.phase <= p; if (m.userData.phase === p) m.userData.a = 0; else m.userData.a = 1; } };
    set(0);
    return { group: g, setPhase: set, update(t, dt) { for (const m of meshes) { if (m.visible && m.userData.a < 1) { m.userData.a = Math.min(1, m.userData.a + dt * 1.5); const e = 1 - Math.pow(1 - m.userData.a, 3); m.position.y = (1 - e) * 1.4; } else if (m.visible) m.position.y = 0; } h.sway(t); } };
  }
};

export { catenary, ropeProfiles };
