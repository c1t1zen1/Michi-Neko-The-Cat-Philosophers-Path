// The nine variants: one per Three.js technique, each built live by the same
// machiya kit and rendered in an isometric view. Data (blurbs, code, sources)
// doubles as the research trail; build() doubles as the WebGL proof.
import * as THREE from 'three';
import { LightRig } from '../../shared/light.js';
import { buildMachiya } from './machiya.js';

export const FAMILIES = [
  { key: 'ours', title: 'The game\u2019s vocabulary', sub: 'Boxes with world-scaled UVs today, real geometry next.' },
  { key: 'surface', title: 'Surfaces that read from 1\u2009m', sub: 'Plaster, tile and lattice \u2014 the materials a cat\u2019s eye is close to.' },
  { key: 'style', title: 'Ghibli shading', sub: 'Cel, painterly, and the photoreal-plus-paint hybrid.' },
  { key: 'street', title: 'Street & age', sub: 'Weathering and the facade typologies that line a Kyoto block.' }
];

const SMALL = { w: 4.6, d: 3.4, gh: 2.1, upper: null, roof: { eaveY: 2.1, ridgeH: 0.95, overhang: 0.5 }, engawaOpts: { front: true, back: false, h: 0.38, depth: 1.0 }, koushiPattern: 'komeya' };
const TWO = { w: 4.6, d: 3.4, gh: 2.2, upper: { w: 4.0, d: 2.9, h: 1.6 }, roof: { eaveY: 3.8, ridgeH: 1.3, overhang: 0.6 }, engawaOpts: { front: true, back: false, h: 0.38, depth: 1.0 }, mushikoMado: true };

export const VARIANTS = [
  {
    slug: 'today', family: 'ours', name: 'The game today', tag: 'boxes · world-scaled UVs', gpu: 1,
    blurb: 'What src/countryside.js builds now: about 140 box() parts, koushi as a row of thin boxes, and a curved slab roof. One texture stretched over each box by world-scaled UVs.',
    unit: 'parts', how: ['Each wall is one BoxGeometry with its UVs rescaled to world metres', 'Koushi is N thin boxes in a loop', 'The roof is two curved slabs plus a cylinder ridge', 'No bevels, no frame, no weathering'],
    code: 'box(w, h, d, mat, x, y, z);   // BoxGeometry + worldScaleBoxUVs(geo, 1)\nkoushi = (w,h,n) => { for (i<n) box(0.018, h, 0.021, mat, sx, 0, 0) }',
    use: 'The cheapest thing that still reads as a machiya from across the street.',
    sources: [['Nippon.com \u2014 Machiya features', 'https://www.nippon.com/en/articles/-/16823']],
    build: (r, hour) => one(r, hour, { ...SMALL, detail: 'boxes', style: 'standard' })
  },
  {
    slug: 'geometry', family: 'ours', name: 'Post, beam & nuki', tag: 'instanced tiles & slats', gpu: 2,
    blurb: 'The same house rebuilt the way a carpenter frames it: real half-round sangawara tiles as one InstancedMesh, koushi slats as another, beveled posts and a through nuki. About a tenth of the draw calls.',
    unit: 'draws', how: ['Roof tiles: one InstancedMesh of half-cylinders, staggered per course', 'Koushi: one InstancedMesh of slats instead of N boxes', 'Posts are distinct 121 mm members, not part of the wall box', 'Everything still shares one material set, so it stays mergeable'],
    code: 'const im = new THREE.InstancedMesh(tileGeo, mat, cols*rows*2);\nfor (r) for (c) { d.position.set(x, sy, z); d.updateMatrix(); im.setMatrixAt(n++, d.matrix); }',
    use: 'The valley\u2019s real buildings: one draw call for a whole tiled roof.',
    sources: [['mysimulator \u2014 Procedural buildings', 'https://www.mysimulator.uk/content/tutorials/procedural-building-threejs-tutorial.html'], ['three-low-poly \u2014 instancing', 'https://github.com/jasonsturges/three-low-poly/']],
    build: (r, hour) => one(r, hour, { ...SMALL, detail: 'geometry', style: 'standard' })
  },
  {
    slug: 'plaster', family: 'surface', name: 'Shikkui plaster', tag: 'tsuchikabe · namako skirt', gpu: 2,
    blurb: 'The seven-coat earth wall, collapsed to a painterly 256 px texture with hairline cracks, a grime band at the sill and a normal map, plus a namako-kabe skirt of slate tiles in raised white joints.',
    unit: 'tex reads', how: ['Plaster = fbm mottling + bezier hairline cracks + a sill grime band', 'The height field becomes a normal map for the clay\u2019s relief', 'Namako: diagonal slate tiles, joints raised to a sea-cucumber profile', 'World-scaled UVs keep the texel density even on long walls'],
    code: 'const set = plasterTextures(0xf3ebda, 1);   // { map, normalMap }\ntexturedMaterial(set, { roughness: 0.96, normalScale: 0.9 })',
    use: 'Every plaster wall in the valley \u2014 warm, cracked, and catching lantern light.',
    sources: [['JAANUS \u2014 tsuchikabe', 'https://projects.mcah.columbia.edu/jaanus/record/tsuchikabe'], ['Namako-kabe (Shimizu)', 'https://www.shimizu-spirit.jp/post/02-01-namakokabe']],
    build: (r, hour) => one(r, hour, { ...TWO, detail: 'geometry', style: 'standard', namako: true })
  },
  {
    slug: 'kawara', family: 'surface', name: 'Kawara tiles', tag: 'sangawara · moss · sh\u014dki', gpu: 2,
    blurb: 'Clay tiles fired above 1100\u2009\u00b0C, laid about 235\u2009mm to the course with a rounded lip, a dead-straight ichimonji eave and a Sh\u014dki figure on the corner. Moss settles on the shaded, damp tiles.',
    unit: 'tiles', how: ['Each tile is a half-cylinder with a lipped nose, painted into the height field', 'The eave gets a row of round nokigawara end tiles', 'A Sh\u014dki (demon-queller) stands on the lower eave', 'Moss grows where fbm says the tile is shaded and damp'],
    code: 'const dome = sqrt(max(0., 1. - (cx*2.15)*(cx*2.15)));\nconst lip  = smooth(clamp((ly/tileH - .86)/.14, 0., 1.));\nconst moss = max(0., fbm(u, v, 3, 3, seed) - .6);',
    use: 'The roof that reads as tiled from the street, and holds a cat from the ridge.',
    sources: [['Blue Vagabond \u2014 kawara workshop', 'https://blue-vagabond.com/2019/05/10/kawara-japanese-roof-building-workshop/'], ['Nihongawara (Govt of Japan)', 'https://www.gov-online.go.jp/hlj/en/march_2026/march_2026-08.html']],
    build: (r, hour) => one(r, hour, { ...TWO, detail: 'geometry', style: 'standard', shokiFig: true })
  },
  {
    slug: 'koushi', family: 'surface', name: 'K\u014dshi lattice', tag: 'itoya · komeya · bengara', gpu: 1,
    blurb: 'You can see out but not in. The slat width, spacing and count once named the trade \u2014 itoya thread, komeya rice, sakaya sake \u2014 and bengara iron-oxide red preserves the pine.',
    unit: 'slats', how: ['The pattern chooses slat width, gap and count', 'Real slats are one InstancedMesh with wood-grain running along V', 'Bengara red-ochre tint on the frame', 'Deg\u014dshi projects past the post line and becomes a shop shelf when removed'],
    code: 'const KOUSHI = { itoya:{slat:.018,gap:.055}, komeya:{slat:.034,gap:.040},\n  sakaya:{slat:.034,gap:.042}, fuya:{slat:.020,gap:.060}, shimotaya:{slat:.016,gap:.062} };',
    use: 'Facade variety per shop \u2014 the lattice tells you what is sold inside.',
    sources: [['Japanese Wiki Corpus \u2014 Kyo-machiya', 'https://www.japanesewiki.com/building/Kyo-machiya.html'], ['Nara Machiya guide (PDF)', 'http://naramachi-nigiwainoie.jp/english/wp-content/uploads/2018/11/machiya_guide_english.pdf']],
    build: (r, hour) => one(r, hour, { ...SMALL, detail: 'geometry', style: 'standard', koushiPattern: 'itoya', norenColor: 'norenIndigo' })
  },
  {
    slug: 'toon', family: 'style', name: 'Cel shading', tag: 'MeshToonMaterial · outline', gpu: 2,
    blurb: 'Light is quantised into three hard bands through a gradient map, and an inverted hull draws the ink outline. This is the Ghibli look: painted, not rendered.',
    unit: 'bands', how: ['MeshToonMaterial samples a 3-step gradient map (NearestFilter)', 'The gradient map turns N\u00b7L into three flat tones', 'An inverted hull (back faces, extruded along normals) draws the outline', 'A Fresnel rim light separates the roof from the sky'],
    code: 'const g = new THREE.DataTexture(new Uint8Array([118,224]), 3, 1, THREE.RedFormat);\ng.minFilter = g.magFilter = THREE.NearestFilter;\nnew THREE.MeshToonMaterial({ color, gradientMap: g })',
    use: 'The painterly pass \u2014 cheap, forgiving, and the signature Ghibli banding.',
    sources: [['Three.js \u2014 MeshToonMaterial', 'https://threejs.org/docs/pages/MeshToonMaterial.html'], ['D. J. Morris \u2014 Ghibli shader', 'https://danieljohnmorris.com/writing/ghibli-shader-parallax-scene/'], ['Moonjump \u2014 toon shading', 'https://moonjump.com/game-dev-mechanics-toon-shading-cel-shading-how-it-works/']],
    build: (r, hour) => one(r, hour, { ...TWO, detail: 'geometry', style: 'toon' }, true)
  },
  {
    slug: 'hybrid', family: 'style', name: 'Photoreal + painterly', tag: 'PBR textures · soft toon', gpu: 2,
    blurb: 'The Kyoto Animation trick: keep the background physically-based (painterly PBR textures, env map, ACES tone mapping) and light it with a soft five-band toon ramp, so surfaces feel real but read as paint.',
    unit: 'bands', how: ['Same painted textures as standard \u2014 the photorealism lives in the maps', 'MeshToonMaterial with a soft five-step gradient map replaces the hard cel', 'More, closer bands = finer quantisation = painterly, not cartoon', 'ACES tone mapping and the light rig keep the shadows warm'],
    code: 'const soft = new Uint8Array([72,128,176,214,246]);   // 5 close bands\nnew THREE.MeshToonMaterial({ map, normalMap, gradientMap: soft })',
    use: 'The target look: a photoreal machiya that still feels hand-painted.',
    sources: [['ZerodotStudio \u2014 anime chars + realistic bg', 'https://note.com/zerodot/n/n42a3aecab98f?hl=en'], ['80.lv \u2014 First Love painterly', 'https://80.lv/articles/transforming-first-love-into-3d-environment-with-japanese-aesthetics']],
    build: (r, hour) => one(r, hour, { ...TWO, detail: 'geometry', style: 'hybrid' })
  },
  {
    slug: 'weather', family: 'street', name: 'Weathering', tag: 'bengara fade · moss · grime', gpu: 2,
    blurb: 'One slider ages the house: bengara fades, kakishibu darkens, timber greys, moss creeps onto the north tiles and grime gathers at the sill and the drip line.',
    unit: 'slider', how: ['Bengara red fades toward a dusty rose as it oxidises', 'Kakishibu persimmon-tannin darkens the timbers', 'Roof tiles grey-green as moss settles on the shaded slope', 'A grime band gathers at the base and under the eave drip'],
    code: 'applyWeathering(build, t) {\n  mats.kawara.color.lerp(MOSS, t*.5);\n  mats.plaster.color.lerp(GRIME, t*.35);\n  mats.timberDark.color.lerp(AGED, t*.3);\n}',
    use: 'Makes a repeated house kit read as an old, lived-in street.',
    sources: [['Nippon.com \u2014 Machiya features', 'https://www.nippon.com/en/articles/-/16823'], ['Japanese Wiki Corpus \u2014 Kyo-machiya', 'https://www.japanesewiki.com/building/Kyo-machiya.html']],
    build: (r, hour) => { const b = one(r, hour, { ...TWO, detail: 'geometry', style: 'standard' }, false, 0.75); return b; }
  },
  {
    slug: 'facades', family: 'street', name: 'Facade typologies', tag: 'tsushi-nikai · hon-nikai', gpu: 3,
    blurb: 'A tsushi-nikai has a low storage loft and a mushiko-mado; a hon-nikai has a full second storey. Neighbours\u2019 eaves overlap so rain sheds between them \u2014 a built-in staircase for a cat.',
    unit: 'houses', how: ['Tsushi-nikai: a low upper floor (servants\u2019 rooms, storage)', 'Hon-nikai: a full second storey, the later form', 'Eaves sit at uneven heights and overlap, so each roof is a different step', 'A battari-sh\u014dgi bench folds up against the lattice'],
    code: 'tsushi = { upper:{w:4.0,d:2.9,h:1.2} }   // low loft + mushiko-mado\nhon    = { upper:{w:4.0,d:2.9,h:2.0} }   // full second storey',
    use: 'The rhythm of a Kyoto street \u2014 and the rooftop steps between houses.',
    sources: [['Nippon.com \u2014 tsushi-nikai', 'https://www.nippon.com/en/articles/-/16823'], ['Japanese Wiki Corpus \u2014 Kyo-machiya', 'https://www.japanesewiki.com/building/Kyo-machiya.html']],
    build: (r, hour) => two(r, hour)
  }
];

const _isoCam = (half = 5.2) => {
  const cam = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, 80);
  const az = Math.PI / 4, el = 0.58, d = 30;
  cam.position.set(Math.cos(az) * Math.cos(el) * d, Math.sin(el) * d, Math.sin(az) * Math.cos(el) * d);
  cam.lookAt(0, 1.4, 0);
  return cam;
};

const plinth = (parent, w = 8, d = 6) => {
  const g = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, 0.16, 64), new THREE.MeshStandardMaterial({ color: 0xddd2bd, roughness: 1 }));
  g.position.y = -0.09;
  g.receiveShadow = true;
  parent.add(g);
  return g;
};

function one(renderer, hour, opts, outline = false, weather = 0) {
  const scene = new THREE.Scene();
  const rig = new LightRig(scene, { hour, sky: false, fog: false, shadows: false, background: false });
  const t0 = performance.now();
  const b = buildMachiya({ ...opts, x: 0, z: 0 });
  if (weather) applyWeathering(b, weather);
  const spin = new THREE.Group();
  spin.add(b.group);
  plinth(spin);
  scene.add(spin);
  const built = performance.now() - t0;
  if (outline) outlineScene(b.group);
  return { scene, camera: _isoCam(), rig, built, counts: countScene(b.group), spin };
}

function two(renderer, hour) {
  const scene = new THREE.Scene();
  const rig = new LightRig(scene, { hour, sky: false, fog: false, shadows: false, background: false });
  const t0 = performance.now();
  const a = buildMachiya({ ...TWO, upper: { w: 4.0, d: 2.9, h: 1.2 }, x: -3.2, z: 0, detail: 'geometry', style: 'standard', battari: true });
  const b = buildMachiya({ ...TWO, upper: { w: 4.0, d: 2.9, h: 2.0 }, x: 3.2, z: 0, detail: 'geometry', style: 'standard' });
  const spin = new THREE.Group();
  spin.add(a.group, b.group);
  plinth(spin, 12, 6);
  scene.add(spin);
  return { scene, camera: _isoCam(6.0), rig, built: performance.now() - t0, counts: countScene(a.group) + countScene(b.group), spin };
}

/** Tint a built machiya\u2019s materials toward age, by a 0..1 amount. */
export function applyWeathering(build, t) {
  const M = build.mats;
  const lerpTo = (m, hex, k) => { if (m && m.color) m.color.lerp(new THREE.Color(hex), t * k); };
  lerpTo(M.kawara, 0x5f6a5c, 0.55);          // moss on the tiles
  lerpTo(M.kawaraDark, 0x4c5550, 0.5);
  lerpTo(M.plaster, 0x9c8c72, 0.35);         // grime
  lerpTo(M.plasterWarm, 0x9c8c72, 0.35);
  lerpTo(M.timberDark, 0x6a6a66, 0.3);       // silvered wood
  lerpTo(M.timberLight, 0x8a8070, 0.3);
  lerpTo(M.bengara, 0xa86a5c, 0.5);          // bengara fading
  lerpTo(M.norenIndigo, 0x8a8478, 0.5);
  lerpTo(M.norenCrimson, 0x9a6a60, 0.5);
}

/** Count the meshes and triangles of a build for the card stats. */
function countScene(root) {
  let tris = 0, meshes = 0;
  root.traverse((o) => {
    if (o.isMesh || o.isInstancedMesh) {
      meshes++;
      const g = o.geometry;
      const idx = g.index ? g.index.count : g.attributes.position.count;
      tris += o.isInstancedMesh ? Math.floor(idx / 3) * o.count : Math.floor(idx / 3);
    }
  });
  return { tris, meshes };
}

/** Add an inverted-hull outline to every plain mesh in a build (the cel ink
 *  line). InstancedMeshes are skipped: a hull of the base tile would sit at
 *  the origin, not at each instance. */
function outlineScene(root) {
  root.traverse((o) => {
    if (o.isMesh && !o.isInstancedMesh && !o.userData.outline) {
      const hull = new THREE.Mesh(o.geometry, new THREE.MeshBasicMaterial({ color: 0x2a2018, side: THREE.BackSide }));
      hull.scale.setScalar(1.03);
      hull.userData.outline = true;
      o.add(hull);
    }
  });
}