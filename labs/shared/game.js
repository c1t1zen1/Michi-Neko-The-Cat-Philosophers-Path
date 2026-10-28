// The single bridge from the labs to the game's own modules (cache-tagged).
export * from '../../src/textures.js?v=20261024c';
export const loadCatModule = () => import('../../src/cat.js?v=20261024c');
