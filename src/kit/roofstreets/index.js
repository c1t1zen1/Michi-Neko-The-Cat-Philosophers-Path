// The roofstreets family (Phase 5, lane r2-roofs-streets): Roof Road street
// props for mouths 1-2 and everywhere the same piece types recur. The layout
// is rooftops/js/build.js pieceLayout(): the level record is `layout.piece`.
// Lab: labs/roofroad. Sizes come from the record, so the run's platforms stay
// exactly where level.js put them.
import { defineAsset } from '../contract.js?v=20261114a';
import { buildMachiya, buildKura, buildKido, buildSteps, buildKomayose, buildInuyarai, buildTsuboniwa } from './roofs.js?v=20261114a';
import { buildCrate, buildBarrel, buildKomodaru, buildLanternPost, buildYuka, buildUtilityPole, buildTrellis } from './props.js?v=20261114a';

const wear = { wear: { type: 'number', default: 0.5, min: 0, max: 1, step: 0.1, label: 'Wear' } };
const T = ['hero', 'mid', 'far'];
// samples are the largest real record of each type in level.js
const at = (piece) => ({ index: 0, type: piece.type, piece, s: 0, x: 0, y: 0, z: 0, ry: 0, band: 'near' });

export const assets = [
  defineAsset({ id: 'roof-crates', family: 'roofstreets', label: 'Roof Road crates', params: wear, tiers: T,
    sample: at({ type: 'crate', s0: 0, s1: 1.2, y: 1.18, y0: 1.18, d: 2 }), build: buildCrate }),
  defineAsset({ id: 'roof-barrels', family: 'roofstreets', label: 'Roof Road barrels', params: wear, tiers: T,
    sample: at({ type: 'barrel', s0: 0, s1: 0.64, y: 0.82, y0: 0.82, d: 2.1 }), build: buildBarrel }),
  defineAsset({ id: 'roof-komodaru', family: 'roofstreets', label: 'Roof Road komodaru', params: wear, tiers: T,
    sample: at({ type: 'komodaru', s0: 0, s1: 0.84, y: 1.05, y0: 1.05, d: 1.95 }), build: buildKomodaru }),
  defineAsset({ id: 'roof-lantern-post', family: 'roofstreets', label: 'Lantern post', tiers: T, floating: ['post_timber', 'post_steel', 'post_red', 'post_lamp'],
    sample: at({ type: 'post', s0: 0, s1: 0.36, y: 2.05, y0: 2.05, d: 2.7 }), build: buildLanternPost }),
  defineAsset({ id: 'roof-yuka', family: 'roofstreets', label: 'Yuka deck', tiers: T,
    sample: at({ type: 'deck', style: 'yuka', s0: 0, s1: 7.4, y: 1.4, d: 2.4 }), build: buildYuka }),
  defineAsset({ id: 'roof-utility-poles', family: 'roofstreets', label: 'Utility pole', tiers: T,
    sample: at({ type: 'utilityPole', s: 0, s0: -0.55, s1: 0.55, d: 1.65, lowY: 3.6, highY: 4.85, wireSpan: 8.5 }), build: buildUtilityPole }),
  defineAsset({ id: 'roof-trellises', family: 'roofstreets', label: 'Wisteria trellis', tiers: T,
    sample: at({ type: 'trellis', s0: -3.2, s1: 3.2, y: 4.45, d: -0.6, flower: 'wisteria' }), build: buildTrellis }),
  // part b: buildings. Samples are the largest real records in level.js (the 67 m near-row machiya is
  // widened with the deck/futon/vines/lanterns/kaisho options so the contract sees every branch).
  defineAsset({ id: 'roof-machiya', family: 'roofstreets', label: 'Roof Road machiya', tiers: T, floating: [],
    sample: at({ type: 'house', s0: -33.5, s1: 33.4, storeys: 2, style: 'hira', eave: 3.7, ridge: 4.5, hisashi: 2.4, dFront: 0, depth: 5, row: 'near', look: 0.6,
      noren: 'crimson', lanterns: true, kaisho: true, byobu: true, vines: true,
      deck: { s0: -32.5, s1: -26, y: 5 }, futon: { s0: -20, s1: -18, y: 3.4 } }), build: buildMachiya }),
  defineAsset({ id: 'roof-kura', family: 'roofstreets', label: 'Roof Road kura', tiers: T,
    sample: at({ type: 'kura', s0: -3.8, s1: 3.8, foot: 4.5, ridge: 5.4, dFront: 0, depth: 4.5 }), build: buildKura }),
  defineAsset({ id: 'roof-kido', family: 'roofstreets', label: 'Kido gate', tiers: T,
    sample: at({ type: 'kido', s0: -1.3, s1: 1.3, y: 2.45, y0: 2.45, d: 0.6 }), build: buildKido }),
  defineAsset({ id: 'roof-river-steps', family: 'roofstreets', label: 'River steps', tiers: T,
    sample: at({ type: 'steps', s0: -0.5, s1: 0.5, y: -0.3, y0: -0.3, d: 2.2 }), build: buildSteps }),
  defineAsset({ id: 'roof-komayose', family: 'roofstreets', label: 'Komayose rail', tiers: T,
    sample: at({ type: 'komayose', s0: -0.8, s1: 0.8, y: 1, y0: 1, d: 1.8 }), build: buildKomayose }),
  defineAsset({ id: 'roof-inuyarai', family: 'roofstreets', label: 'Inuyarai', tiers: T,
    sample: at({ type: 'inuyarai', s0: -0.85, s1: 0.85, y: 0.92, y0: 0.92, d: 0.5 }), build: buildInuyarai }),
  defineAsset({ id: 'roof-tsuboniwa', family: 'roofstreets', label: 'Tsuboniwa tree', tiers: T,
    sample: at({ type: 'tsuboniwa', s0: -2.3, s1: 2.3, d: -1.5 }), build: buildTsuboniwa })
];
