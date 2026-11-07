// The single bridge from the labs to the game's own modules (cache-tagged).
export * from '../../src/textures.js?v=20261106a';
export const loadCatModule = () => import('../../src/cat.js?v=20261106a');
// The Machiya Lab calls the original builders without constructing the valley.
export const loadCountrysideModule = () => import('../../src/countryside.js?v=20261106a');
// The Ranges Lab builds its wall from the game's own canopy/foliage kit.
export const loadFoliageModule = () => import('../../src/foliage.js?v=20261106a');
