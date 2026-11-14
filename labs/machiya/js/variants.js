// Each card renders the code it describes. The first card in each family is
// the actual game component (or explicitly its absence), never a replica.
import * as THREE from 'three';
import { LightRig } from '../../shared/light.js';
import { buildMachiya, countScene } from './machiya.js?rev=20261107-staves';
import { originalHouse, originalPart } from './original.js'; import { GAP_BUILDERS } from './gaps.js';
export const SOURCES = {
  instancing: ['Three.js r160 · instancing example', 'https://github.com/mrdoob/three.js/blob/r160/examples/webgl_instancing_dynamic.html'],
  buffer: ['Three.js · BufferGeometry', 'https://threejs.org/docs/pages/BufferGeometry.html'],
  bevel: ['Three.js r160 · RoundedBoxGeometry source', 'https://github.com/mrdoob/three.js/blob/r160/examples/jsm/geometries/RoundedBoxGeometry.js'],
  extrude: ['Three.js · ExtrudeGeometry', 'https://threejs.org/docs/pages/ExtrudeGeometry.html'],
  tube: ['Three.js · TubeGeometry', 'https://threejs.org/docs/pages/TubeGeometry.html'],
  lathe: ['Three.js · LatheGeometry', 'https://threejs.org/docs/pages/LatheGeometry.html'],
  shader: ['Three.js r160 · modified material example', 'https://github.com/mrdoob/three.js/blob/r160/examples/webgl_materials_modified.html'],
  pbr: ['Three.js · MeshStandardMaterial', 'https://threejs.org/docs/pages/MeshStandardMaterial.html'],
  toon: ['Three.js r160 · MeshToonMaterial source', 'https://github.com/mrdoob/three.js/blob/r160/src/materials/MeshToonMaterial.js'],
  color: ['Three.js · colour management', 'https://threejs.org/manual/pages/color-management.html'],
  araki: ['Araki builders · inuyarai restoration', 'https://www.kyoto-araki.jp/sekou/konnaie/kyomachiya/machi_raisa.html'],
  tiles: ['Araki builders · ichimonji tiles & earthen walls', 'https://www.kyoto-araki.jp/sekou/konnaie/kyomachiya/machi_maii.html'],
  loft: ['Hachise · tsushi-nikai', 'https://www.hachise.com/kyomachiya/features/facadeTsushinikai.html'],
  bamboo: ['Araki builders · façade construction notes', 'https://www.kyoto-araki.jp/kyomachiya/sumaiarekore/kouen_thehouse1.html']
};
export const FAMILIES = [
  { key: 'houses', title: 'Four houses, <em>already home</em>', sub: 'The actual valley builders, called in isolation. These are our baseline, including their proportions and quirks.' },
  { key: 'roof', title: 'A roof with <em>no daylight through it</em>', sub: 'Original curved slab → continuous shell with overlapping pans → sculpted pan-and-roll courses. All new roofs share one height function with the cat.' },
  { key: 'frame', title: 'The light along <em>a timber edge</em>', sub: 'Original squared posts, softened joinery and red-ochre framing. Bevel only what the low camera can see.' },
  { key: 'wall', title: 'Earth, lime <em>and a little age</em>', sub: 'The game’s painted plaster is the starting point. Compare warm clay and a slate-and-white namako base.' },
  { key: 'lattice', title: 'A shop’s <em>handwriting</em>', sub: 'Original eleven-slat lattice, cut-back thread-shop slats, and a heavier bengara rice-shop screen.' },
  { key: 'window', title: 'The upstairs <em>insect cage</em>', sub: 'The game has a timber upper lattice. The plaster-coated mushiko study adds a real shaped opening and bars with rounded edges.' },
  { key: 'deck', title: 'A shady place <em>for paws</em>', sub: 'Original solid engawa and separate boards over beams and stones. A raised deck should have a shadow underneath.' },
  { key: 'bamboo', title: 'The bend <em>of split bamboo</em>', sub: 'The game has no inuyarai on these houses. Compare that bare frontage with straight staves and a curved, instanced screen.' },
  { key: 'cloth', title: 'A curtain <em>in the breeze</em>', sub: 'One original slab becomes three pinned cloth panels, with folds and a simple undyed crest. Motion is restrained.' },
  { key: 'lantern', title: 'When the shop <em>stays open</em>', sub: 'The original cylinder, then a lathed paper profile with real ribs. At dusk, a local light reaches the wall and pavement.' },
  { key: 'namako', title: 'The slate <em>skirt</em>', sub: 'The lower wall of a street house: the game’s textured panel against slate pillows set in lime joints, with a kick board and a capping rail.' }, { key: 'bench', title: 'A red felt <em>mosen bench</em>', sub: 'The tea house’s front bench: the game’s two boxes against a legged frame, a rounded felt cushion and piped seams.' }, { key: 'door', title: 'The hidden <em>sliding door</em>', sub: 'Hisomu-an’s door leaf: one lit shoji box against a framed leaf with a floor rail, a shoji grid and a pull recess.' }, { key: 'lock', title: 'A brass <em>padlock plate</em>', sub: 'The plate the cat unlocks: a flat box and a half-torus against a bevelled plate, posts, screws and a keyhole.' }, { key: 'style', title: 'Real light, <em>painted surfaces</em>', sub: 'Same geometry, three treatments. The animated-film mood here is our art direction, not a claim to reproduce a studio’s production shader.' }
];
const compact = { w: 4.8, d: 3.4, gh: 2.2, upper: { w: 4.2, d: 2.9, h: 1.4 }, roof: { eaveY: 3.6, ridgeH: 1.1, overhang: .5 }, engawaOpts: { front: true, back: false, h: .42, depth: 1.1 } };
const partKeys = { roof: ['roof'], frame: ['foundation', 'frame'], wall: ['wall'], lattice: ['lattice'], window: ['window'], deck: ['deck'], bamboo: ['bamboo'], cloth: ['cloth'], lantern: ['lantern'] };
function presentation(root, hour, built, update = () => {}) {
  const scene = new THREE.Scene(), spin = new THREE.Group();
  const bounds = new THREE.Box3().setFromObject(root), size = bounds.getSize(new THREE.Vector3()), centre = bounds.getCenter(new THREE.Vector3());
  root.position.sub(centre); root.position.y += size.y / 2 + .1; spin.add(root);
  const radius = Math.max(size.x, size.z, size.y * 1.4, 1) * .59;
  const slab = new THREE.Mesh(new THREE.CylinderGeometry(radius * .94, radius, .14, 48), new THREE.MeshStandardMaterial({ color: 0xd8c9ae, roughness: 1 }));
  slab.position.y = -.03; slab.receiveShadow = true; spin.add(slab); scene.add(spin);
  const rig = new LightRig(scene, { hour, sky: false, fog: false, shadows: false, background: false });
  const camera = new THREE.OrthographicCamera(-radius * 1.45, radius * 1.45, radius * 1.1, -radius * 1.1, .01, 100);
  camera.position.set(14, 10, 18); camera.lookAt(0, size.y * .4, 0);
  return { scene, camera, spin, rig, counts: countScene(root), built, update };
}
function buildSpecimen(part, options, original, hour) {
  const t = performance.now(); if (GAP_BUILDERS[part]) return presentation(GAP_BUILDERS[part](original), hour, performance.now() - t);
  let root, update;
  if (original) root = part === 'style' ? originalHouse('tea').group : originalPart(part === 'bamboo' ? 'wall' : part);
  else {
    const b = buildMachiya({ ...compact, ...options });
    if (part === 'style') root = b.group;
    else { root = new THREE.Group(); for (const key of partKeys[part]) root.add(b.parts[key]); }
    update = b.update;
  }
  return presentation(root, hour, performance.now() - t, update);
}
export const VARIANTS = ['tea', 'residence', 'secret', 'village'].map((kind, i) => ({
  slug: 'original-' + kind, kind, family: 'houses', name: ['The tea house', 'The craftsman’s residence', 'Hisomu-an', 'A village house'][i],
  tag: '01 / original game builder', original: true, blurb: ['Indigo curtain, red bench, stepped eaves and the rooftop nest.', 'Shoji frontage, garden-side engawa and the bamboo water clacker.', 'The low, enclosed house with a sliding door and a furnished room.', 'The seeded street kit, including the namako skirt and low step.'][i],
  how: ['Calls Countryside.prototype directly; the valley constructor is never run.', 'Only gameplay registration is stubbed. The meshes and materials are the game’s own.'],
  code: `const kit = originalKit();\nkit.${['buildMachiyaTeaHouse', 'buildMachiyaResidence', 'buildSecretMachiya', 'buildVillageHouse'][i]}(0, 0, 0);`,
  file: 'js/original.js', sources: [], use: 'A faithful reference for the house we will eventually replace.',
  build: (r, hour) => { const t = performance.now(); return presentation(originalHouse(kind).group, hour, performance.now() - t); }
}));
function recipe(family, slug, name, tag, blurb, opts, how, code, refs, original = false) {
  VARIANTS.push({ family, slug, name, tag, blurb, opts, how, code, original, file: original ? 'js/original.js' : 'js/machiya.js',
    sources: refs.map(k => SOURCES[k]), use: original ? 'The game baseline for this exact part.' : 'Select this card to try its recipe on the workshop house.',
    build: (r, hour) => buildSpecimen(family, opts, original, hour) });
}
const baseline = (family, name, blurb, code) => recipe(family, family + '-original', name, '01 / original game part', blurb, {}, ['Built with the original game method or extracted from its actual tea-house mesh.'], code, [], true);
baseline('roof', 'The curved slab', 'The actual game roof: two closed curved slabs, end tiles, rafters and a ridge.', 'originalKit().createKawaraRoof(4.8, 3.4, 1.0, .5)');
recipe('roof', 'roof-courses', 'Overlapping pans', '02 / continuous shell + instancing', 'Broad low-relief pans overlap in both axes. The complete deck beneath them blocks every accidental pinhole.', { roofRecipe: 'courses' }, ['A closed 48-segment roof shell carries all tiles.', 'Tile length is 1.18 × course length; width is 1.015 × column pitch.', 'Per-instance colour breaks repeated rows without new draw calls.'], 'kawaraRoof(parent, w, d, rise, overhang, eaveY, mats, "courses");', ['buffer', 'instancing', 'tiles']);
recipe('roof', 'roof-wave', 'Sangawara study', '03 / sculpted pan-and-roll · recommended', 'A continuous wave section, overlapping lips and a straight eave. Real silhouette detail sits over the painted texture.', { roofRecipe: 'wave' }, ['Closed tile geometry with a shallow cosine cross-section.', 'Tile rotations follow the local derivative of roofHeight().', 'Bargeboards, rafter tails and circular eave faces finish the edges.'], 'const tile = tileGeometry(columnPitch * 1.015, courseLength * 1.18, "wave");\ninstances(roof, tile, mats.kawara, transforms, "tile courses");', ['buffer', 'instancing', 'tiles']);
baseline('frame', 'Square hashira', 'The original tea-house posts and eave beam, with world-scaled timber UVs.', '// Actual tea-house corner posts + eave beam, extracted by originalPart("frame").');
recipe('frame', 'frame-bevel', 'Sun on the joinery', '02 / RoundedBoxGeometry', 'A 16 cm game-scale post on a stone shoe. Small bevels catch the sun without turning the whole house into soft clay.', { frameRecipe: 'bevel' }, ['Radius is limited by the smallest member dimension.', 'Timber texture follows world-scale box UVs.', 'Separate beams and posts leave the infill visually recessed.'], 'new RoundedBoxGeometry(.16, height, .16, 1, .025);', ['bevel', 'araki']);
recipe('frame', 'frame-bengara', 'Bengara frontage', '03 / red-ochre joinery', 'Warm iron-oxide tones on the lattice frame make the frontage glow against blue-grey tiles.', { frameRecipe: 'bengara', latticeRecipe: 'bengara' }, ['The full house uses the bengara lattice material.', 'Compare this finish in the workshop using the lattice control.'], 'const mat = texturedMaterial(wood, { color: 0xa75b46, roughness: .85 });', ['pbr', 'araki']);
baseline('wall', 'Painted game plaster', 'The real 256 px plaster-painted wall box. Its texture already carries much of the painterly vocabulary.', '// Tea-house groundFloor mesh, including the game’s material.');
recipe('wall', 'wall-clay', 'Warm earthen infill', '02 / ochre clay', 'An earthy wall between the timbers, with shallow panels and the upstairs wall left in lime white.', { wallRecipe: 'clay' }, ['Ground-floor infill uses the clay finish.', 'A gentle object-space brush modulation leaves the daylight response physical.'], 'buildMachiya({ wallRecipe: "clay", style: "hybrid" });', ['shader', 'tiles']);
recipe('wall', 'wall-namako', 'Slate at the foot', '03 / namako skirt', 'The game’s existing diagonal slate-and-white texture wraps the lower side walls. Texture detail carries the small joints.', { wallRecipe: 'namako', age: .45 }, ['Uses namakoTextures() from the game.', 'The age uniform grades the albedo; this is an art control, not a physical ageing model.'], 'buildMachiya({ wallRecipe: "namako", age: .45 });', ['pbr', 'araki']);
baseline('lattice', 'Eleven original slats', 'The game’s exact narrow slats and box frame. Compare how much of the backing is visible.', 'originalKit().createKoushi(3.0, 1.7, 11);');
recipe('lattice', 'lattice-itoya', 'Thread-shop rhythm', '02 / cut-back itoya', 'Two shorter slats between each tall one open the top of the screen. One instanced slat mesh per panel.', { koushiPattern: 'itoya' }, ['A repeating 3-slat rhythm changes height and position per instance.', 'Thin horizontal ties sit behind the slats.'], 'koushi(parent, width, height, mats, "itoya", "instance");', ['instancing', 'tiles']);
recipe('lattice', 'lattice-rice', 'Rice-shop red', '03 / komeya + bengara', 'Heavier slats and red-ochre timber produce a denser, stronger-looking frontage.', { koushiPattern: 'komeya', latticeRecipe: 'bengara' }, ['Pattern parameters choose width and spacing.', 'All slats share one material and geometry.'], 'koushi(parent, width, height, mats, "komeya", "bengara");', ['instancing', 'araki']);
baseline('window', 'Timber upper lattice', 'Our current tea-house upper window is timber, rather than a plaster-coated mushiko opening.', 'originalKit().createKoushi(3.0, 1, 14);');
recipe('window', 'window-plaster', 'Plaster insect cage', '02 / Shape.holes + extrusion', 'A dark recess, rounded shoulders and lime-coated bars. The surround has a real hole through it.', { windowRecipe: 'plaster' }, ['The hole winds opposite the outer Shape.', 'ExtrudeGeometry gives the opening thickness.', 'Bars use instanced rounded boxes.'], 'shape.holes.push(opening);\nnew THREE.ExtrudeGeometry(shape, { depth: .13, bevelSize: .018, bevelThickness: .018 });', ['extrude', 'bevel', 'loft']);
recipe('window', 'window-low', 'The low storage loft', '03 / tsushi-nikai proportions', 'A compressed upstairs changes the whole silhouette. Its small mushiko window belongs to a storage loft.', { upper: { w: 4.2, d: 2.9, h: 1.05 }, roof: { eaveY: 3.25, ridgeH: 1.1, overhang: .5 } }, ['Same window builder, shorter upper storey.', 'The workshop preset adjusts wall and roof height together.'], 'upper = { w: 4.2, d: 2.9, h: 1.05 };\nroof.eaveY = groundHeight + upper.h;', ['loft', 'extrude']);
baseline('deck', 'One veranda slab', 'The real engawa deck, its stone supports and the stepping stone in front.', 'originalKit().createEngawa(4.6, 1.4, .42);');
recipe('deck', 'deck-boards', 'Boards over shade', '02 / instanced planks', 'Individual boards with narrow joints, longitudinal beams and timber feet over separate stone shoes.', { deckRecipe: 'planks' }, ['One draw for boards, with deterministic colour variation.', 'The feet stop at stones; no solid skirting closes the crawl space.'], 'engawa(parent, width, depth, .42, mats, "planks");', ['instancing', 'araki']);
recipe('deck', 'deck-silver', 'A well-used threshold', '03 / aged planks', 'The same construction, its timber graded toward quieter, older tones. Use the age and wetness sliders to compare.', { deckRecipe: 'planks', age: .9 }, ['Shares plank geometry with the clean version.', 'Age is reversible and always evaluated from the unmodified material.'], 'house.setWeather(.9, 0); // age, wetness', ['shader', 'pbr']);
baseline('bamboo', 'The bare frontage', 'There is no inuyarai on the game’s current house builders. This specimen is their original wall, so the absence is visible.', '// Original tea-house wall; no inuyarai builder exists in the game.');
recipe('bamboo', 'bamboo-straight', 'Straight stave study', '02 / leaning instanced cylinders', 'Straight bamboo staves lean toward the wall, with three cross rails seated on their outward faces.', { bambooRecipe: 'straight' }, ['One CylinderGeometry spans the full diagonal from the street-side foot to the wall-side top.', 'Cross rails follow the same straight profile and rest against the sloping staves.', 'Useful at distance, but misses the bowed Kyoto profile.'], 'inuyarai(parent, width, .85, mats, "straight");', ['instancing', 'bamboo']);
recipe('bamboo', 'bamboo-curved', 'Bowed inuyarai', '03 / Bézier + TubeGeometry', 'Each split-bamboo stave bends in the vertical plane, away from the wall at the foot. A single curve mesh is instanced across the screen.', { bambooRecipe: 'curved' }, ['QuadraticBezierCurve3 sets the Y/Z bend.', 'TubeGeometry samples the curve fourteen times.', 'The screen is decorative; the crate stair is the playable route.'], 'const path = new THREE.QuadraticBezierCurve3(foot, bow, top);\nconst stave = new THREE.TubeGeometry(path, 14, .023, 5, false);', ['tube', 'instancing', 'bamboo']);
baseline('cloth', 'The original noren slab', 'Our game currently uses one thin box for the tea-house curtain.', '// Original tea-house noren mesh, extracted without changing its geometry.');
recipe('cloth', 'cloth-indigo', 'Pinned indigo cloth', '02 / segmented cloth planes', 'Three panels hang from one concealed sleeve, with restrained folds and an undyed ring crest.', { clothRecipe: 'cloth' }, ['PlaneGeometry has 6 × 9 segments.', 'Displacement grows toward the free bottom edge.', 'The crest follows its panel. Reduced motion keeps the cloth still.'], 'z = restZ + sin(time * 1.7 + phase) * .075 * freeEdge ** 2 * wind;', ['buffer', 'shader']);
recipe('cloth', 'cloth-red', 'Tea-house crimson', '03 / the same cloth, warm dye', 'A warmer colour variant for a different shop. Geometry, folds and animation stay the same.', { clothRecipe: 'cloth', red: true }, ['Shared construction, a separate dye palette.', 'Try golden hour and night to judge colour separation.'], 'buildMachiya({ clothRecipe: "cloth", red: true });', ['color', 'araki']);
baseline('lantern', 'The game’s chōchin', 'The exact cylinder, lacquer caps, red band and tassel used beside the valley doors.', 'originalKit().createChochinLantern(0, 0, 0, parent);');
recipe('lantern', 'lantern-ribs', 'Paper over ribs', '02 / lathed profile', 'A soft barrel silhouette with a small corrugation, separate circular ribs, and lacquer caps.', { lanternRecipe: 'ribbed' }, ['A 25-point radius profile is revolved with LatheGeometry.', 'Twelve ribs reinforce the silhouette.', 'A local point light is enabled only at dusk.'], 'new THREE.LatheGeometry(profile, 16);\nnew THREE.PointLight(0xffb96e, night * 9, 4, 2);', ['lathe', 'pbr']);
recipe('lantern', 'lantern-dusk', 'Open after sunset', '03 / warm paper at dusk', 'The same lantern with the page clock set to dusk when selected. Watch the warm pool on the frontage.', { lanternRecipe: 'ribbed', hour: 19.3 }, ['Emissive paper and a local light serve different purposes.', 'Emission follows the same hour as the sky rig.'], 'house.update(time, 19.3, wind); // warms the paper and lights the wall', ['pbr', 'color']);
baseline('style', 'The game’s materials', 'The original tea house under this lab’s light rig, with the game’s standard materials intact.', 'originalHouse("tea");');
recipe('style', 'style-pbr', 'Physical daylight', '02 / MeshStandardMaterial', 'Painted albedo, normal maps and roughness, with ACES tone mapping and a shared environment.', { style: 'standard' }, ['The normal map changes light response, not silhouette.', 'Colour textures are sRGB; normal data stays linear.'], 'texturedMaterial(maps, { roughness: .85, normalScale: .45 });', ['pbr', 'color']);
recipe('style', 'style-paint', 'An afternoon in paint', '03 / painterly PBR · recommended', 'Physical light on warm lime, blue-grey clay and brushlike albedo variation. Shadows keep the joinery legible.', { style: 'hybrid' }, ['A small onBeforeCompile albedo modulation preserves standard lighting.', 'No screen-space filter or downloaded bitmap is needed.', 'This is the lab’s interpretation of an animated-film background.'], 'material.onBeforeCompile = shader => {\n  // subtle object-space brush modulation after map_fragment\n};', ['shader', 'pbr', 'color']);
recipe('style', 'style-toon', 'Three-band colour study', '04 / MeshToonMaterial', 'A useful stylisation boundary: three explicit light bands. Compare what happens to plaster relief and the roof silhouette.', { style: 'toon' }, ['A three-texel RedFormat DataTexture supplies three valid bands.', 'NearestFilter preserves the discrete ramp.'], 'new THREE.DataTexture(new Uint8Array([80,158,240]), 3, 1, THREE.RedFormat);', ['toon']);

baseline('namako', 'The textured panel', 'The game’s namako skirt: one flat box per wall face carrying the slate-and-lime texture.', 'originalKit().meshNamakoClassic({ w: 5.4, d: 3.6 }, group);');
recipe('namako', 'namako-pillows', 'Slate pillows in lime', '02 / instanced rounded tiles', 'Real bulging slate tiles over a lime backing, a dark kick board at the foot and a lime rail on top. Matches src/kit/machiya (hero tier).', {}, ['One InstancedMesh of RoundedBoxGeometry tiles with per-tile value variation.', 'The kit keeps the game texture at mid and far, where the relief cannot be seen.'], 'new RoundedBoxGeometry(cw - .03, ch - .03, .03, 2, .012);', ['instancing', 'bevel']);
baseline('bench', 'Two boxes', 'The game’s bench: a scarlet box on a dark plinth, 2.2 m long.', 'originalKit().meshTeaBenchClassic({}, group);');
recipe('bench', 'bench-felt', 'A legged bench with felt', '02 / RoundedBoxGeometry', 'A frame on four feet, a rounded scarlet cushion and light piping along the seams. Same 2.2 x 0.9 outline.', {}, ['Outer size matches the classic box so the doorway reads the same.', 'The kit adds felt colours and an optional tea tray.'], 'new RoundedBoxGeometry(2.2, .27, .9, 3, .07);', ['bevel']);
baseline('door', 'One shoji box', 'The real sliding door leaf, taken from the secret house the game builds.', 'const k = originalKit(); k.buildSecretMachiya(0, 0, 0); k.secretDoorMesh;');
recipe('door', 'door-shoji', 'A framed shoji leaf', '02 / frame + kumiko', 'Stiles, a floor rail and top rail around the lit paper, a fine grid and a pull recess. The koushi lattice stays its own part.', {}, ['Gameplay slides the leaf group; the study keeps the same 2.35 x 2.05 x 0.08 body.'], 'new THREE.BoxGeometry(.016, 1.85, .012); // kumiko bars', ['buffer']);
baseline('lock', 'Plate and shackle', 'The real brass lock from the secret house door: a box and a half-torus.', 'k.lockPlate;');
recipe('lock', 'lock-bevel', 'A bevelled plate', '02 / RoundedBoxGeometry', 'Soft plate edges, shackle posts, four screws and a keyhole in the same 0.24 x 0.3 outline.', {}, ['The shackle arch is the classic half torus; the kit hides the whole plate when the lock opens.'], 'new THREE.TorusGeometry(.09, .025, 8, 20, Math.PI);', ['bevel']);
