// The single bridge from the labs to the game's own modules (cache-tagged).
export * from '../../src/textures.js?v=20261107a';
export const loadCatModule = () => import('../../src/cat.js?v=20261107a');
// The Machiya Lab calls the original builders without constructing the valley.
export const loadCountrysideModule = () => import('../../src/countryside.js?v=20261107a');
// The Ranges Lab builds its wall from the game's own canopy/foliage kit.
export const loadFoliageModule = () => import('../../src/foliage.js?v=20261107a');
// Sky Lab reads the real dome, sprite, moon and lighting builders as its baseline.
export const loadSkyModule = () => import('../../src/sky.js?v=20261107a');
// Ground Lab grows the valley's own grass (GrassSystem + BiomeMask) on its stage.
export const loadGrassModule = () => import('../../src/grass.js?v=20261107a');
