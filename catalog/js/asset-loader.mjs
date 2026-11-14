/* Explicit, read-only bridges from the asset inventory to editable Three.js objects.
   No game source is changed and no manifest text is evaluated as JavaScript.
   update(dt, elapsedSeconds) is optional; cadJS deliberately freezes the loaded pose. */
const INVENTORY_URL = new URL('../../labs/asset_inventory.json', import.meta.url);
let inventoryPromise;
const inventory = () => inventoryPromise ||= fetch(INVENTORY_URL).then(async response => {
  if (!response.ok) throw new Error(`Asset inventory could not load (${response.status}). Serve the repository over HTTP.`);
  return response.json();
}).catch(error => { inventoryPromise = null; throw error; });

const cs = (method, args = [], extra = {}) => ({ type: 'countryside', method, args, ...extra });
const context = (method, label, args = []) => cs(method, args, { fidelity: 'context', context: label });
const ORIGINAL = {
  michi: { type: 'cat', coat: 'michi' }, luna: { type: 'cat', coat: 'luna' }, mochi: { type: 'cat', coat: 'mochi' }, kuro: { type: 'cat', coat: 'kuro' },
  'cat-coat': { type: 'cat', coat: 'michi', fidelity: 'context', context: 'Full cat rig; coat meshes remain editable in the hierarchy.' },
  'cat-face': { type: 'cat', coat: 'michi', fidelity: 'context', context: 'Full cat rig; the head and face remain attached to their bones.' },
  'cat-collar': { type: 'cat', coat: 'michi', part: 'collar' },
  'master-bells': { type: 'cat', coat: 'michi', master: true, part: 'collar' },
  'cat-shadow': { type: 'cat', coat: 'michi', part: 'blob' },
  larry: cs('buildBambooCorral', [0, 0], { name: 'Turtle Guardian (Larry)' }),
  corral: cs('buildBambooCorral', [0, 0]),
  'corral-sign': cs('buildBambooCorral', [0, 0], { name: 'Corral Warning Sign' }),
  'jade-paw': cs('buildBambooCorral', [0, 0], { field: 'corralRewardMesh', reveal: true, caption: 'The real hidden reward, deliberately revealed for isolated editing.' }),
  'guardian-crows': { type: 'life', field: 'guardianBirds', index: 0 },
  sparrows: { type: 'life', field: 'birds', index: 0 }, koi: { type: 'life', field: 'koi', index: 1 },
  butterflies: { type: 'life', field: 'butterflies', reveal: true },
  'valley-ground': cs('buildGround', [], { field: 'groundMesh' }),
  path: cs('buildPath', [], { name: 'Cobbled Path' }),
  'path-shoulders': cs('buildPathShoulders'),
  'path-slabs': { type: 'path-slabs' },
  'path-boulders': cs('buildPath', [], { prefix: 'Path Boulder' }),
  'key-rock': cs('buildKeyHidingRock', [0, 0]),
  river: cs('buildRiverAndBridge', [], { name: 'River' }),
  bridge: cs('buildRiverAndBridge', [], { name: 'Kiyomizu Bridge' }),
  dango: cs('buildRiverAndBridge', [], { name: 'River-Spirit Charm' }),
  paddies: cs('buildPaddies'),
  'paddy-bunds': cs('buildPaddies', [], { prefixes: ['Paddy Bed', 'Paddy Ridge'] }),
  rice: cs('buildPaddies', [], { name: 'Rice Stalks' }),
  'tea-house': cs('buildMachiyaTeaHouse', [0, 0, 0]),
  residence: cs('buildMachiyaResidence', [0, 0, 0]),
  'secret-house': cs('buildSecretMachiya', [0, 0, 0]),
  'street-house': cs('buildVillageHouse', [0, 0, 0, 'left']),
  'village-street': cs('buildVillageStreet'),
  'kawara-roof': cs('createKawaraRoof', [4.8, 3.4, 1.1, 0.5]),
  koushi: cs('createKoushi', [3, 1.7, 11]),
  engawa: cs('createEngawa', [4.6, 1.4, 0.42]),
  'timber-frame': { type: 'house-part', part: 'frame' },
  'upper-windows': { type: 'house-part', part: 'window' },
  noren: { type: 'house-part', part: 'cloth' },
  namako: context('buildVillageHouse', 'Full original street-house context, including namako skirt walls.', [0, 0, 0, 'left']),
  'tea-bench': context('buildMachiyaTeaHouse', 'Full tea-house context; the red bench is retained in its original hierarchy.', [0, 0, 0]),
  'secret-door': cs('buildSecretMachiya', [0, 0, 0], { field: 'secretDoorMesh' }),
  'lock-plate': cs('buildSecretMachiya', [0, 0, 0], { field: 'lockPlate' }),
  crates: { type: 'crates' }, 'sake-barrel': { type: 'crates', part: 'barrel' },
  nest: { type: 'nest' }, 'nest-eggs': { type: 'nest', part: 'eggs' }, 'guardian-feather': { type: 'nest', part: 'feather' },
  toro: cs('buildToroLantern', [0, 0]), chochin: { type: 'chochin' },
  'street-lamps': cs('buildLanterns'), 'bamboo-fence': cs('buildBambooFence', [0, 0, 0]),
  shishi: { type: 'shishi' }, 'wind-chime': cs('buildWindChime', [0, 1, 0]),
  torii: cs('buildTorii', [0, 0]), 'shrine-hall': cs('buildShrine', [0, 0]),
  shimenawa: context('buildShrine', 'Full shrine context; its sacred rope and shide remain attached.', [0, 0]),
  'shrine-bell': context('buildShrine', 'Full shrine context; its bronze bell and hanging cords remain attached.', [0, 0]),
  'offering-box': context('buildShrine', 'Full shrine context; the offering box remains in its original position.', [0, 0]),
  'mist-altar': cs('buildMistAltar', [0, 0], { reveal: true }),
  'distant-pagoda': cs('buildDistantPagoda', [0, 0]),
  yarn: cs('buildYarn', [], { firstCollectible: true }), key: cs('buildSecretKey', [0, 0, 0], { field: 'secretKeyMesh' }),
  'offering-bells': cs('buildOfferingBells', [], { firstCollectible: true }),
  'secret-fish': cs('buildSecretMachiya', [0, 0, 0], { field: 'fishMesh' }),
  'secret-tatami': cs('buildSecretMachiya', [0, 0, 0], { name: 'Tatami Floor' }),
  'secret-table': cs('buildSecretMachiya', [0, 0, 0], { name: 'Chabudai Table' }),
  'secret-bed': context('buildSecretMachiya', 'Full secret-house context; the nap cushion keeps its source placement.', [0, 0, 0]),
  'secret-andon': cs('buildSecretMachiya', [0, 0, 0], { name: 'Andon Lantern' }),
  sakura: { type: 'tree', method: 'sakuraTree' }, maples: { type: 'tree', method: 'mapleTree' }, pines: { type: 'tree', method: 'pineTree' },
  'rim-trees': { type: 'tree', method: 'mapleTree', rim: true },
  'tree-trunks': { type: 'tree', method: 'sakuraTree', fidelity: 'context', context: 'One original sakura, with trunk and branches kept in context.' },
  'tree-canopies': { type: 'tree', method: 'sakuraTree', fidelity: 'context', context: 'One original leaf-spray canopy on its real sakura tree.' },
  'bamboo-groves': { type: 'bamboo' },
  'street-bushes': cs('buildStreetBushes'),
  'roadside-moss': cs('buildStreetGreenery', [], { name: 'Roadside Moss' }),
  'grass-near': { type: 'grass', recipe: 'near' }, 'grass-mid': { type: 'grass', recipe: 'mid' },
  'grass-far': { type: 'grass', recipe: 'far' }, 'grass-thicket': { type: 'grass', recipe: 'thicket' },
  'grass-flowers': { type: 'grass', recipe: 'flowers' }, 'grass-susuki': { type: 'grass', recipe: 'susuki' },
  'grass-mown': { type: 'grass', recipe: 'mown' }, 'grass-lantern': { type: 'grass', recipe: 'lantern' },
  'grass-sumi': { type: 'grass', recipe: 'sumi' }, 'grass-yarn': { type: 'grass', recipe: 'yarn' },
  'grass-shell': { type: 'grass', recipe: 'shell' }, 'grass-moss': { type: 'grass', recipe: 'moss' },
  'moon-pool': { type: 'hidden', place: 'pool' }, 'pool-apron': { type: 'hidden', place: 'pool', fidelity: 'context', context: 'Moon Pool context, including the mossy apron.' },
  'pool-water': { type: 'hidden', place: 'pool', materials: ['poolWaterMat', 'causticMat'] },
  'pool-moon': { type: 'hidden', place: 'pool', field: 'moonGlow', reveal: true },
  'pool-rim': { type: 'hidden', place: 'pool', name: 'Moon Pool Stones' },
  'lily-pads': { type: 'hidden', place: 'pool', shape: 'pads' }, lotus: { type: 'hidden', place: 'pool', shape: 'lotus' },
  'pool-seat': { type: 'hidden', place: 'pool', fidelity: 'context', context: 'Moon Pool context; the sitting stone keeps its real shoreline position.' },
  'pool-toro': { type: 'hidden', place: 'pool', fidelity: 'context', context: 'Moon Pool context, including its stone toro.' },
  'pool-motes': { type: 'hidden', place: 'pool', field: 'poolMotePoints', reveal: true },
  'lantern-glade': { type: 'hidden', place: 'glade' }, 'glade-floor': { type: 'hidden', place: 'glade', firstChild: true },
  'glade-bamboo': { type: 'hidden', place: 'glade', names: ['Glade Bamboo', 'Glade Bamboo Leaves'] },
  'glade-lanterns': { type: 'hidden', place: 'glade', lantern: true, reveal: true },
  'glade-seat': { type: 'hidden', place: 'glade', fidelity: 'context', context: 'Lantern Glade context, including the sitting stone and boulder.' },
  'glade-fireflies': { type: 'hidden', place: 'glade', field: 'gladeFlyPoints', reveal: true },
  'tea-interior': { type: 'interior' }, tatami: { type: 'interior', name: 'Tatami Floor' },
  'interior-frame': { type: 'interior', fidelity: 'context', context: 'The original room with its timber frame, posts and ceiling.' },
  'shoji-doors': { type: 'interior', name: 'Exit Door' }, tokonoma: { type: 'interior', name: 'Tokonoma Alcove' },
  scroll: { type: 'interior', fidelity: 'context', context: 'The original alcove with its scroll and bonsai.' , name: 'Tokonoma Alcove' },
  bonsai: { type: 'interior', fidelity: 'context', context: 'The original tokonoma with its bonsai pine; components remain editable.', name: 'Tokonoma Alcove' },
  chabudai: { type: 'interior', name: 'Chabudai Table' },
  teaware: { type: 'interior', fidelity: 'context', context: 'The original table including its ceramic teapot and cups.', name: 'Chabudai Table' },
  zabuton: { type: 'interior', name: 'Zabuton Nap Bed' }, andon: { type: 'interior', name: 'Andon Lantern' },
  'interior-fish': { type: 'interior', field: 'fishMesh' }, 'courtyard-toro': { type: 'interior', name: 'Courtyard Toro Lantern' },
  'courtyard-gravel': { type: 'interior', fidelity: 'context', context: 'The original interior and courtyard; gravel is retained in context.' },
  'courtyard-wall': { type: 'interior', fidelity: 'context', context: 'The original interior and courtyard boundary walls.' },
  knockables: { type: 'interior', knockables: true },
  'blender-roofscape': { type: 'glb', url: 'assets/models/summit_kyoto_landmarks.glb', optional: true }
};

const target = (id, label) => ({ id, label, lab: id.split('/')[0], selector: id.split('/')[1] });
const LAB = {
  'bamboo-fence': [target('fences/koetsu', 'Kōetsu fence'), target('fences/yotsume', 'Yotsume fence'), target('fences/kenninji', 'Kenninji fence')],
  corral: [target('fences/yotsume', 'Yotsume fence study')],
  'corral-sign': [],
  'key-rock': [target('rocks/chisel', 'Chiselled stone'), target('rocks/sculpt', 'Sculpted stone')],
  'path-boulders': [target('rocks/chisel', 'Chiselled stone'), target('rocks/sculpt', 'Sculpted stone')],
  toro: [target('lanterns/kasuga', 'Kasuga stone lantern'), target('lanterns/yukimi', 'Yukimi stone lantern'), target('lanterns/kotoji', 'Kotoji stone lantern')],
  chochin: [target('lanterns/gifu', 'Ribbed Gifu chochin'), target('lanterns/odawara', 'Odawara chochin')],
  'street-lamps': [target('lanterns/andon', 'Andon lantern study')],
  andon: [target('lanterns/andon', 'Andon paper lantern')],
  crates: [target('alley/crate', 'Slatted climb crate')], 'sake-barrel': [target('alley/komodaru', 'Straw-wrapped sake barrel')],
  nest: [target('nest/lined', 'Woven and lined nest')], 'nest-eggs': [target('nest/eggs', 'Painted eggs')], 'guardian-feather': [target('nest/feather', 'Painted feather')],
  shishi: [target('garden/shishi', 'Supported shishi-odoshi'), target('garden/sozu-cut', 'Receiver cutaway')],
  'wind-chime': [target('garden/glass', 'Glass furin'), target('garden/iron', 'Iron furin')],
  torii: [target('shrine/myojin', 'Myōjin torii'), target('shrine/shinmei', 'Shinmei torii'), target('shrine/miwa', 'Miwa torii')],
  'shrine-hall': [target('shrine/nagare', 'Nagare hall'), target('shrine/kasuga-h', 'Kasuga hall')],
  shimenawa: [target('shrine/daikon', 'Daikon sacred rope'), target('shrine/shirakawa', 'Shirakawa paper folds')],
  'shrine-bell': [target('shrine/suzu', 'Suzu bell')],
  'offering-bells': [target('shrine/bell-new', 'Bronze offering bell')],
  key: [target('keepsakes/old-key', 'Worn brass key'), target('keepsakes/glint', 'Key with soft glint')],
  yarn: [target('keepsakes/wound', 'Wound thread'), target('keepsakes/fuzz', 'Shell fuzz')],
  koi: [target('critters/showa', 'Shōwa koi'), target('critters/kohaku', 'Kōhaku koi'), target('critters/sanke', 'Sanke koi')],
  sparrows: [target('critters/flock', 'Instanced sparrow flock')], butterflies: [target('critters/hinge', 'Painted hinged butterfly')],
  luna: [target('villagers/luna', 'Luna pose specimen')], mochi: [target('villagers/mochi', 'Mochi pose specimen')], kuro: [target('villagers/shine', 'Kuro eye-shine study')],
  michi: [target('villagers/sleep', 'Michi sleeping pose')],
  'bamboo-groves': [target('greenery/nodes', 'Nodes and scars'), target('greenery/leaves', 'Attached bamboo leaves')],
  'street-bushes': [target('greenery/karikomi', 'Karikomi clipped bushes')],
  'moon-pool': [target('moonpool/sim', 'Wave-simulation pond study'), target('moonpool/painted', 'Painted pond study')],
  'pool-water': [target('moonpool/sim', 'Wave-simulation pond'), target('moonpool/painted', 'Painted water')],
  'pool-moon': [target('moonpool/moon-phase', 'Crescent reflection study')],
  'lily-pads': [target('moonpool/pad-new', 'Notched lily pad')], lotus: [target('moonpool/lotus', 'Raised lotus blossom')],
  'glade-lanterns': [target('moonpool/chochin', 'Ribbed washi lantern'), target('moonpool/float', 'Floating lantern')],
  'glade-fireflies': [target('moonpool/fireflies', 'Glade firefly study')],
  'courtyard-gravel': [target('rocks/rake', 'Raked garden gravel')],
  'tea-house': [target('machiya/style-paint', 'Painted hybrid machiya')], residence: [target('machiya/style-paint', 'Painted hybrid machiya study')],
  'secret-house': [target('machiya/style-paint', 'Painted hybrid machiya study')], 'street-house': [target('machiya/style-paint', 'Painted hybrid machiya study')],
  'kawara-roof': [target('machiya/roof-wave', 'Sculpted pan-and-roll roof')],
  koushi: [target('machiya/lattice-itoya', 'Thread-shop lattice')],
  engawa: [target('machiya/deck-boards', 'Boarded engawa')],
  'timber-frame': [target('machiya/frame-bevel', 'Beveled timber joinery')],
  'upper-windows': [target('machiya/window-plaster', 'Plaster mushiko window')],
  noren: [target('machiya/cloth-indigo', 'Folded noren study')],
  namako: [target('machiya/wall-namako', 'Slate-and-plaster skirt')],
  'distant-pagoda': [target('pagoda/tower-valley', 'Game-fit valley pagoda'), target('pagoda/tower-yasaka', 'Yasaka pagoda')],
  'summit-pagoda': [target('pagoda/tower-valley', 'Valley pagoda study')],
  'tea-interior': [target('interiors/garden', 'Garden zashiki'), target('interiors/sukiya', 'Sukiya tea room')],
  tatami: [target('interiors/tatami', 'Tatami construction bench')],
  'shoji-doors': [target('interiors/shoji', 'Shoji construction bench')],
  teaware: [target('interiors/pottery', 'Hollow ceramic bowl')],
  knockables: [target('interiors/pottery', 'Hollow pottery study')],
  tokonoma: [target('interiors/garden', 'Garden zashiki with alcove')],
  chabudai: [target('interiors/garden', 'Garden zashiki with low table')],
  zabuton: [target('interiors/garden', 'Garden zashiki with cushions')],
  'dappled-light': [target('komorebi/coins', 'Projected sun images'), target('komorebi/eclipse', 'Eclipse light images')]
};
const UNSUPPORTED = {
  'meadow-system': 'The full biome/LOD system depends on the game scene. Open its lab to work with the complete simulation.',
  'summit-transition': 'Video media is not editable mesh geometry.',
  'old-sakura-grove': 'This retired builder is empty and produces no asset.',
  'old-petal-drifts': 'This retired builder returns before creating geometry.'
};

export function getAssetCapabilities(assetOrId) {
  const id = typeof assetOrId === 'string' ? assetOrId : assetOrId?.id;
  const original = ORIGINAL[id]; const targets = (LAB[id] || []).map(value => ({ ...value }));
  return {
    original: Boolean(original), lab: targets.length > 0,
    originalLabel: original?.fidelity === 'context' ? 'Original game context' : original?.type === 'glb' ? 'Optional original GLB' : 'Original game asset',
    labLabel: targets.length ? 'Lab study' : undefined,
    reason: !original ? UNSUPPORTED[id] || 'No isolated editing adapter is available for this scene-wide system. Use its source, game preview or lab links.' : original.context || (original.optional ? 'Available when the optional model file is present.' : ''),
    targets
  };
}

const WORKSHOPS = {
  fences: () => import('../../labs/fences/js/recipes.js'), rocks: () => import('../../labs/rocks/js/recipes.js'),
  lanterns: () => import('../../labs/lanterns/js/recipes.js'), alley: () => import('../../labs/alley/js/recipes.js'),
  nest: () => import('../../labs/nest/js/recipes.js'), garden: () => import('../../labs/garden/js/recipes.js'),
  shrine: () => import('../../labs/shrine/js/recipes.js'), keepsakes: () => import('../../labs/keepsakes/js/recipes.js'),
  critters: () => import('../../labs/critters/js/recipes.js'), villagers: () => import('../../labs/villagers/js/recipes.js'),
  greenery: () => import('../../labs/greenery/js/recipes.js'), moonpool: () => import('../../labs/moonpool/js/recipes.js'),
  komorebi: () => import('../../labs/komorebi/js/recipes.js')
};

function take(THREE, root, matches) {
  const selected = matches.filter(Boolean);
  if (!selected.length) throw new Error('The original builder no longer exposes the expected object. Its adapter needs review.');
  root.updateMatrixWorld(true);
  const group = new THREE.Group();
  // Only top-level selected nodes are moved, avoiding duplication of a child
  // when both a parent and descendant matched the semantic selector.
  for (const object of selected.filter(object => !selected.some(parent => parent !== object && isDescendant(object, parent)))) group.attach(object);
  return group;
}
function isDescendant(object, ancestor) { for (let p = object.parent; p; p = p.parent) if (p === ancestor) return true; return false; }
function findAll(root, predicate) { const matches = []; root.traverse(object => { if (predicate(object)) matches.push(object); }); return matches; }
function selected(THREE, root, kit, def) {
  if (def.field) return take(THREE, root, [kit[def.field]]);
  if (def.name) return take(THREE, root, [root.getObjectByName(def.name)]);
  if (def.names) return take(THREE, root, def.names.map(name => root.getObjectByName(name)));
  if (def.prefix || def.prefixes) return take(THREE, root, findAll(root, object => (def.prefixes || [def.prefix]).some(prefix => object.name.startsWith(prefix))));
  if (def.firstCollectible) return take(THREE, root, [kit.collectibles[0]]);
  return root;
}
async function countrysideKit() {
  const { ensureCountryside, gameKit } = await import('../../labs/shared/original.js');
  await ensureCountryside();
  return Object.assign(gameKit(0x4d43), { seed: 20260729, waterRects: [], riverSamples: [], pathSamples: [], vegetationExclusions: [], ripples: [], paddyWaterMaterials: [], platforms: [], animated: [], time: 0 });
}

async function buildOriginal(id, def, THREE) {
  if (def.type === 'cat') {
    const [{ loadCatModule }, { COATS }] = await Promise.all([import('../../labs/shared/game.js'), import('../../labs/villagers/js/kit.js')]);
    const { Cat } = await loadCatModule(); const coat = COATS[def.coat];
    const cat = new Cat({ fur: coat.fur, belly: coat.belly, accent: coat.accent, eyeColor: coat.eyeColor, ribbonColor: coat.ribbon, stripes: coat.stripes, build: coat.build });
    cat.group.scale.setScalar(coat.scale); cat.update(0.016, 0, true, false, false, false, null);
    if (def.master) cat.setMasterCat();
    return { group: def.part ? take(THREE, cat.group, [cat[def.part]]) : cat.group, source: { file: 'src/cat.js', symbol: def.master ? 'Cat.setMasterCat' : 'Cat' } };
  }
  if (def.type === 'countryside') {
    const kit = await countrysideKit(); const built = kit[def.method](...def.args);
    const root = built?.isObject3D ? built : kit.scene;
    return { group: selected(THREE, root, kit, def), source: { file: 'src/countryside.js', symbol: def.method } };
  }
  if (def.type === 'path-slabs') {
    const kit = await countrysideKit();
    const curve = new THREE.CatmullRomCurve3([[0, 0, 34], [-2, 0, 20], [1.5, 0, 6], [0, 0, -8], [-1, 0, -16], [0, 0, -30]].map(point => new THREE.Vector3(...point)));
    kit.buildWalkwaySlabs(curve);
    return { group: kit.scene, source: { file: 'src/countryside.js', symbol: 'buildWalkwaySlabs' } };
  }
  if (['crates', 'nest', 'chochin', 'shishi'].includes(def.type)) {
    const kit = await countrysideKit(); const root = new THREE.Group(); let symbol;
    if (def.type === 'crates') { symbol = 'createClimbCrates'; kit.createClimbCrates(0, 0, 0, root); }
    if (def.type === 'nest') { symbol = 'buildBirdNest'; kit.buildBirdNest(root, new THREE.Vector3()); }
    if (def.type === 'chochin') { symbol = 'createChochinLantern'; kit.createChochinLantern(0, 1, 0, root); }
    if (def.type === 'shishi') { symbol = 'buildShishiOdoshi'; kit.buildShishiOdoshi(0, 0, 0, root); }
    let group = root;
    if (def.part === 'barrel') group = take(THREE, root, [root.children[0].children[2]]);
    if (def.part === 'feather') group = take(THREE, root, [kit.nestFeatherMesh]);
    if (def.part === 'eggs') group = take(THREE, root, findAll(root, object => object.geometry?.type === 'SphereGeometry' && object.geometry.parameters.radius === 0.065));
    return { group, source: { file: 'src/countryside.js', symbol } };
  }
  if (def.type === 'house-part') {
    const { originalPart } = await import('../../labs/machiya/js/original.js');
    return { group: originalPart(def.part), source: { file: 'src/countryside.js', symbol: def.part === 'window' ? 'createKoushi' : 'buildMachiyaTeaHouse' } };
  }
  if (def.type === 'life') {
    const { loadAmbientLifeModule } = await import('../../labs/shared/game.js'); const { AmbientLife } = await loadAmbientLifeModule();
    const scene = new THREE.Group(); const life = new AmbientLife(scene, null, new THREE.Vector3());
    const value = life[def.field]; const object = def.index === undefined ? value : value?.[def.index]?.mesh;
    if (def.reveal && life.bflyMat) life.bflyMat.opacity = 1;
    return { group: take(THREE, scene, [object]), source: { file: 'src/ambient_life.js', symbol: def.field === 'guardianBirds' ? 'buildGuardianBirds' : def.field === 'birds' ? 'buildBirds' : def.field === 'koi' ? 'buildKoi' : 'buildButterflies' } };
  }
  if (def.type === 'tree' || def.type === 'bamboo') {
    const { ensureVegetation } = await import('../../labs/shared/original.js'); const Vegetation = await ensureVegetation();
    // Avoid constructing the full valley or grass system. Material setup and
    // the exact named tree method are the same code used by the game.
    const kit = Object.create(Vegetation.prototype);
    Object.assign(kit, { scene: new THREE.Group(), colliders: [], swayables: [], _treeCount: 0, _shrubCount: 0, _staticAccum: new Map(), grassMeshes: [], groundCoverMeshes: [], sakuraSpots: [[0, 0, 1]], dapplePools: [], dappleMeshes: [], time: 0 });
    let seed = 77; kit.rng = () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
    kit._initMaterials(); kit.matBamboo = new THREE.MeshStandardMaterial({ color: 0x6f9e4c, roughness: 0.6 });
    if (def.type === 'bamboo') {
      kit.bambooTime = { value: 0 }; kit.matBambooSway = kit.bambooSwayMaterial(false, false); kit.matBambooLeafSway = kit.bambooSwayMaterial(true, false); kit.bambooDepthStalk = kit.bambooSwayMaterial(false, true); kit.bambooDepthLeaf = kit.bambooSwayMaterial(true, true);
      kit.buildBambooGrove(0, 0, 2.2);
    } else kit[def.method](def.rim ? 44 : 0, 0, 1);
    kit._finalizeStatic();
    return { group: kit.scene, update: def.type === 'bamboo' ? (dt, time) => { kit.bambooTime.value = time; } : undefined, source: { file: 'src/vegetation.js', symbol: def.type === 'bamboo' ? 'buildBambooGrove' : def.method } };
  }
  if (def.type === 'hidden') {
    const { loadHiddenPlacesModule, glowTexture } = await import('../../labs/shared/game.js'); const { HiddenPlaces } = await loadHiddenPlacesModule();
    const scene = new THREE.Group(); const city = { vegetationExclusions: [], waterRects: [], colliders: [], lanternHaloTex: glowTexture(255, 214, 150), addCollider() {} };
    const hidden = new HiddenPlaces(scene, city); const root = def.place === 'pool' ? hidden.poolGroup : hidden.gladeGroup;
    let group = selected(THREE, root, hidden, def);
    if (def.firstChild) group = take(THREE, root, [root.children[0]]);
    if (def.materials) group = take(THREE, root, findAll(root, object => def.materials.some(key => object.material === hidden[key])));
    if (def.shape === 'pads') group = take(THREE, root, findAll(root, object => object.geometry?.type === 'CircleGeometry' && object.geometry.parameters.radius === 0.3));
    if (def.shape === 'lotus') group = take(THREE, root, findAll(root, object => object.isGroup && object.children.length === 7 && object.children.every(child => child.geometry?.type === 'ConeGeometry')));
    if (def.lantern) group = take(THREE, root, [hidden.lanterns[0]?.lamp]);
    if (def.reveal) {
      hidden.moonMat.opacity = 0.8; hidden.poolMoteMat.opacity = 0.8; hidden.gladeFlyMat.opacity = 0.8;
      hidden.updatePoolMotes(0.016, 1); hidden.updateGladeFlies(0.016, 1);
      hidden.lanterns.forEach(lamp => { lamp.mat.emissiveIntensity = 1.3; });
    }
    return { group, source: { file: 'src/hidden_places.js', symbol: def.place === 'pool' ? 'buildMoonPool' : 'buildLanternGlade' } };
  }
  if (def.type === 'interior') {
    // Use the unmerged original builder so source components remain editable.
    const { loadInteriorModule } = await import('../../labs/shared/game.js');
    const module = await loadInteriorModule(); const kit = Object.create(module.InteriorManager.prototype);
    const root = new THREE.Group(); Object.assign(kit, { origin: new THREE.Vector3(), group: root, colliders: [], platforms: [], knockables: [] });
    kit.buildInterior(); if (def.knockables) kit.buildKnockables();
    const group = def.knockables ? take(THREE, root, kit.knockables.map(item => item.mesh)) : selected(THREE, root, kit, def);
    return { group, source: { file: 'src/interior.js', symbol: def.knockables ? 'buildKnockables' : 'buildInterior' } };
  }
  if (def.type === 'grass') {
    const { loadGrassModule } = await import('../../labs/shared/game.js'); const { GrassSystem, BiomeMask } = await loadGrassModule();
    const root = new THREE.Group(), mask = new BiomeMask(-3, -3, 6, 32);
    if (def.recipe === 'mown') mask.lawn.fill(1); else { mask.wild.fill(1); mask.flower.fill(1); mask.edgeBoost.fill(1); }
    mask.bake(); const grass = new GrassSystem(root, { mask, wind: 0.4 });
    if (def.recipe === 'shell') grass.addShell({ radius: 2, layers: 10, height: 0.085, density: 75, lead: 0 });
    else if (def.recipe === 'moss') grass.addMoss([{ x: 0, z: 0, r: 1.2 }]);
    else grass.addZone(def.recipe, { x: 0, z: 0, hw: 1.7, hd: 1.7, spacing: def.recipe === 'mown' ? 0.055 : def.recipe === 'susuki' ? 0.55 : 0.15 });
    const focus = new THREE.Vector3(); const update = (dt, time) => { grass.update(dt, { focus }); grass.U.uTime.value = time; };
    update(0.016, 0);
    // Instance roots are displaced in GLSL; CPU positions describe one blade,
    // so supply the actual patch extent for editor/camera framing.
    for (const mesh of grass.meshes) mesh.geometry.boundingBox = new THREE.Box3(new THREE.Vector3(-2, -0.05, -2), new THREE.Vector3(2, 1.6, 2));
    return { group: root, update, source: { file: 'src/grass.js', symbol: def.recipe === 'shell' ? 'addShell' : def.recipe === 'moss' ? 'addMoss' : `RECIPES.${def.recipe}` }, caption: 'The shipped grass recipe on a small isolated patch; biome placement and paw physics remain game systems.', disposeExtra: () => mask.texture?.dispose() };
  }
  if (def.type === 'glb') {
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    try { const gltf = await new GLTFLoader().loadAsync(new URL('../../' + def.url, import.meta.url).href); return { group: gltf.scene, source: { file: def.url, symbol: 'GLTF scene' } }; }
    catch { throw new Error('The optional summit GLB is not available in this checkout. The game continues to use its procedural fallback.'); }
  }
  throw new Error('This original asset has no editing adapter.');
}

async function buildLab(descriptor, THREE, renderer) {
  const { lab, selector } = descriptor;
  if (WORKSHOPS[lab]) {
    const [module, craft, painted] = await Promise.all([WORKSHOPS[lab](), import('../../labs/shared/craft.js'), import('../../labs/shared/painted.js')]);
    if (lab === 'shrine') { await module.loadShrineDeps(); await module.primeSource(); }
    else await module.loadDeps?.();
    const specimen = module.SPECIMENS.find(item => item.id === selector);
    if (!specimen) throw new Error(`The ${lab}/${selector} specimen has changed or been removed.`);
    const k = { THREE, ...craft, M: painted.M, paintify: painted.paintify, seed: 7, rand: craft.rng(8), lab: { renderer, heroCam: { position: new THREE.Vector3(4, 3, 5) } } };
    const built = specimen.build(k); const group = built.group || built;
    return { group, update: built.update ? (dt, time) => built.update(time, dt) : undefined, source: { file: `labs/${lab}/js/recipes.js`, symbol: selector }, caption: `${specimen.name}: ${specimen.original ? 'original specimen in the lab' : 'lab study; not automatically shipped to the game'}.` };
  }
  if (lab === 'machiya') {
    const { VARIANTS } = await import('../../labs/machiya/js/variants.js'); const variant = VARIANTS.find(item => item.slug === selector);
    if (!variant) throw new Error(`The machiya/${selector} specimen has changed or been removed.`);
    const built = variant.build(null, 15); const group = built.spin.children[0];
    return { group, update: built.update ? (dt, time) => built.update(time, 15, 0.3) : undefined, source: { file: 'labs/machiya/js/variants.js', symbol: selector }, caption: `${variant.name}: actual lab recipe; architectural study rather than a live game replacement.` };
  }
  if (lab === 'pagoda') {
    const [{ VARIANTS }, { buildTile }] = await Promise.all([import('../../labs/pagoda/js/variants.js'), import('../../labs/pagoda/js/tiles.js')]);
    const variant = VARIANTS.find(item => item.slug === selector);
    if (!variant || !['tower', 'part', 'orig'].includes(variant.tile?.kind)) throw new Error('This pagoda variant is not an editable geometry specimen.');
    const built = buildTile(variant, { env: null, reduceMotion: true });
    return { group: built.subject, update: built.update ? (dt, time) => built.update(dt, time, { width: 600, height: 600 }) : undefined, source: { file: 'labs/pagoda/js/variants.js', symbol: selector }, caption: `${variant.name}: actual pagoda lab geometry.` };
  }
  if (lab === 'interiors') {
    const build = await import('../../labs/interiors/js/build.js'); const root = new THREE.Group();
    if (selector === 'tatami') build.tatami(root);
    else if (selector === 'shoji') build.screen(root);
    else if (selector === 'pottery') build.vessel(root);
    else {
      const { ROOMS } = await import('../../labs/interiors/js/data.js'); const recipe = ROOMS.find(item => item.id === selector);
      if (!recipe) throw new Error('This room recipe is no longer available.');
      const room = build.createRoom(recipe, { mini: true });
      return { group: room.root, source: { file: 'labs/interiors/js/data.js', symbol: selector }, caption: `${recipe.name}: actual room recipe, separate from the shipped tea-house interior.` };
    }
    return { group: root, source: { file: 'labs/interiors/js/craft.js', symbol: selector }, caption: `${selector}: the actual construction-bench geometry.` };
  }
  throw new Error('This lab currently has a link-only adapter.');
}

// Kept dependency-free so the shader-preservation contract is testable in Node.
export function cloneCatalogMaterial(original) {
  const copy = original.clone();
  copy.onBeforeCompile = original.onBeforeCompile;
  copy.customProgramCacheKey = original.customProgramCacheKey;
  // Built-in materials carry game shader defines (CAT_PART, grass recipe
  // switches) which their normal copy() methods do not retain.
  if (original.defines) copy.defines = { ...original.defines };
  if (original.extensions) copy.extensions = { ...original.extensions };
  // Keep per-factory animation closures connected to their uniforms.
  if (original.isShaderMaterial) copy.uniforms = original.uniforms;
  return copy;
}

function editableMaterialsAndGeometry(group) {
  const materials = new Map(), geometry = new Map();
  const material = original => {
    if (!original) return original;
    if (!materials.has(original)) {
      // Three.Material.clone does not preserve custom shader callbacks.
      materials.set(original, cloneCatalogMaterial(original));
    }
    return materials.get(original);
  };
  group.traverse(object => {
    if (object.geometry) { if (!geometry.has(object.geometry)) geometry.set(object.geometry, object.geometry.clone()); object.geometry = geometry.get(object.geometry); }
    if (object.material) object.material = Array.isArray(object.material) ? object.material.map(material) : material(object.material);
    if (object.customDepthMaterial) object.customDepthMaterial = material(object.customDepthMaterial);
    if (object.customDistanceMaterial) object.customDistanceMaterial = material(object.customDistanceMaterial);
  });
  return () => { for (const value of geometry.values()) value.dispose(); for (const value of materials.values()) value.dispose(); };
}

/* ------------------------------------------------------------ production --- */
// The modular kit, read through labs/shared/game.js. The allowlist is the set of
// asset ids the registered families export; nothing is ever evaluated from text.
let kitPromise;
export function getKitIndex({ force = false } = {}) {
  if (force) kitPromise = null;
  return kitPromise ||= (async () => {
    const { loadKitIndexModule } = await import('../../labs/shared/game.js');
    const { FAMILIES } = await loadKitIndexModule();
    const assets = new Map(), errors = [];
    await Promise.all(Object.entries(FAMILIES).map(async ([family, load]) => {
      try { for (const def of (await load()).assets || []) assets.set(def.id, def); }
      catch (error) { errors.push(`${family}: ${error.message}`); }
    }));
    return { assets, families: Object.keys(FAMILIES), errors };
  })().catch((error) => { kitPromise = null; throw error; });
}
/** Summary rows for UIs: id, family, label, tiers and the param schema. */
export async function listKitAssets() {
  const { assets } = await getKitIndex();
  return [...assets.values()].map((d) => ({ id: d.id, family: d.family, label: d.label, tiers: d.tiers, params: d.params || {} })).sort((a, b) => a.id.localeCompare(b.id));
}

let kitRuntime, kitWarnings = [];
async function productionRuntime(THREE) {
  if (kitRuntime) return kitRuntime;
  const game = await import('../../labs/shared/game.js'), { FAMILIES } = await game.loadKitIndexModule(), { AssetRuntime } = await game.loadKitRuntimeModule();
  const logger = { warn: (...a) => kitWarnings.push(a.join(' ')), log() {}, error: (...a) => kitWarnings.push(a.join(' ')) };
  const runtime = new AssetRuntime({ THREE, quality: 'high', search: '?assets=modular', loadFamilies: async () => FAMILIES, fetchOverrides: async () => null, logger });
  await runtime.preload();
  return kitRuntime = runtime;
}

async function buildProduction(assetId, { tier = 'mid', params = {} } = {}, THREE) {
  const runtime = await productionRuntime(THREE);
  const def = runtime.defs.get(assetId);
  if (!def) throw new Error('This asset has no kit version yet: classic only.');
  kitWarnings = [];
  const sample = typeof def.sample === 'function' ? def.sample() : { ...(def.sample || {}) };
  const layout = { ...sample, tier: def.tiers.includes(tier) ? tier : def.tiers[0], params };
  const instance = runtime.build(assetId, layout, () => { throw new Error(`The kit builder failed${kitWarnings.length ? ': ' + kitWarnings.join('; ') : '.'}`); });
  return {
    group: instance.group, instance, runtime, def,
    update: (dt, time) => runtime.update(dt, time, undefined, [instance]),
    disposeExtra() { try { instance.dispose(); } catch { /* already disposed */ } },
    source: { file: `src/kit/${def.family}/index.js`, symbol: def.id },
    caption: `${def.label}: modular kit asset (${def.family}) at ${instance.tier} tier. ${Object.keys(def.params || {}).length} parameters.`
  };
}

export async function loadCatalogAsset(assetId, { variant = 'original', targetId = null, renderer = null, tier = 'mid', params = {} } = {}) {
  if (!['original', 'lab', 'production'].includes(variant)) throw new Error('Choose an original game asset or a lab study, or the production kit version.');
  const data = await inventory(); const asset = data.assets.find(item => item.id === assetId);
  if (!asset) throw new Error('Unknown asset ID. Choose an asset from the catalog.');
  const caps = getAssetCapabilities(asset);
  if (variant === 'production') {
    const THREE = await import('three'), built = await buildProduction(assetId, { tier, params }, THREE);
    built.update?.(0.016, 0);
    const disposeResources = editableMaterialsAndGeometry(built.group);
    built.group.userData = { ...built.group.userData, catalogAssetId: assetId, catalogVariant: 'production', catalogTarget: null };
    return { group: built.group, update: built.update, dispose() { disposeResources(); built.disposeExtra(); }, source: built.source, caption: built.caption, fidelity: 'production', def: built.def, instance: built.instance };
  }
  if (!caps[variant]) throw new Error(caps.reason || 'This asset has no isolated editing adapter.');
  // Reject foreign target IDs before loading any rendering dependency.
  let descriptor;
  if (variant === 'lab') {
    descriptor = targetId ? caps.targets.find(item => item.id === targetId) : caps.targets[0];
    if (!descriptor) throw new Error('That lab specimen is not registered for this asset.');
  }
  // All import destinations and factory names come from the allowlists above.
  const THREE = await import('three');
  const built = variant === 'original' ? await buildOriginal(assetId, ORIGINAL[assetId], THREE) : await buildLab(descriptor, THREE, renderer);
  if (!built.group?.isObject3D) throw new Error('The builder produced no editable scene object.');
  if (variant === 'original' && ORIGINAL[assetId].reveal) {
    built.group.visible = true;
    built.group.traverse(object => { object.visible = true; if (object.material?.opacity === 0) object.material.opacity = 1; });
  }
  built.update?.(0.016, 0);
  const disposeResources = editableMaterialsAndGeometry(built.group);
  built.group.name ||= asset.label;
  built.group.userData = { ...built.group.userData, catalogAssetId: assetId, catalogVariant: variant, catalogTarget: descriptor?.id || null };
  return {
    group: built.group,
    update: built.update,
    dispose() { disposeResources(); built.disposeExtra?.(); },
    source: built.source,
    caption: built.caption || (variant === 'original' ? ORIGINAL[assetId].caption || ORIGINAL[assetId].context || `${asset.label}: real game builder in isolation.` : `${asset.label}: lab study.`),
    fidelity: variant === 'lab' ? 'study' : ORIGINAL[assetId].fidelity || 'original'
  };
}
