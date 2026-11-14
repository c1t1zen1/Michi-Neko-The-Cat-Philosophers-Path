// The single bridge from the labs to the game's own modules (cache-tagged).
export * from '../../src/textures.js?v=20261113a';
export const loadCatModule = () => import('../../src/cat.js?v=20261113a');
// The modular Michi def and its parts (labs/cat).
export const loadMichiModule = () => import('../../src/characters/defs/michi.js?v=20261113a');
// The Machiya Lab calls the original builders without constructing the valley.
export const loadCountrysideModule = () => import('../../src/countryside.js?v=20261113a');
// The Ranges Lab builds its wall from the game's own canopy/foliage kit.
export const loadFoliageModule = () => import('../../src/foliage.js?v=20261113a');
// Sky Lab reads the real dome, sprite, moon and lighting builders as its baseline.
export const loadSkyModule = () => import('../../src/sky.js?v=20261113a');
// Ground Lab grows the valley's own grass (GrassSystem + BiomeMask) on its stage.
export const loadGrassModule = () => import('../../src/grass.js?v=20261113a');
// The original specimens in the Tier 2-4 labs: real builders, read-only.
export const loadVegetationModule = () => import('../../src/vegetation.js?v=20261113a');
export const loadHiddenPlacesModule = () => import('../../src/hidden_places.js?v=20261113a');
export const loadAmbientLifeModule = () => import('../../src/ambient_life.js?v=20261113a');
export const loadParticlesModule = () => import('../../src/particles.js?v=20261113a');
export const loadNpcModule = () => import('../../src/npc.js?v=20261113a');
// Asset Library: the original unmerged tea-house interior for isolated editing.
export const loadInteriorModule = () => import('../../src/interior.js?v=20261113a');
// Statues (komainu and friends) use the cat's signed-distance sculptor.
export const loadSculptModule = () => import('../../src/cat_sdf.js?v=20261113a');
export const loadSummitModule = () => import('../../src/mountaintop.js?v=20261113a');
// Asset Library (lane t1-catalog): the modular kit registry, read-only. The
// catalog builds the "production" variant through AssetRuntime from whatever
// families src/kit/index.js registers, so families merged later need no change.
export const loadKitIndexModule = () => import('../../src/kit/index.js?v=20261113a');
export const loadKitRuntimeModule = () => import('../../src/kit/runtime.js?v=20261113a');
export const loadKitContractModule = () => import('../../src/kit/contract.js?v=20261113a');
export const loadKitMaterialsModule = () => import('../../src/kit/materials.js?v=20261113a');
