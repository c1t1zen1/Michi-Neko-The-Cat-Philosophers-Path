// Hidden places family (Phase 2, wave 2.2): lab 07 "moonpool" for the two
// secrets of the valley floor. The Moon Pool and the Lantern Glade each come
// as a whole (the kit composes every part, pool toro included) and part by
// part (a classic parent places the kit parts it asks for). Water, moon,
// motes, fireflies and lantern light animate themselves from update(dt, t, env).
import { defineAsset } from '../contract.js?v=20261113a';
import { samplePool, sampleGlade } from './samples.js?v=20261113a';
import { buildMoonPool, buildApron, buildWater, buildMoon, buildRim, buildPoolSeat, buildPads, buildLotus, buildMotes } from './pool.js?v=20261113a';
import { buildLanternGlade, buildFloor, buildBamboo, buildLanternSet, buildGladeSeat, buildFlies } from './glade.js?v=20261113a';

const num = (def, min, max, step, label) => ({ type: 'number', default: def, min, max, step, label });
const moss = (d) => num(d, 0, 1.2, 0.1, 'Moss');
const density = num(1, 0.5, 1.5, 0.1, 'Density');
const spread = num(1, 0.85, 1.2, 0.05, 'Spread');
const white = { type: 'color', default: 0xffffff, label: 'Tint' };

const L = (pick) => () => pick(samplePool());
const G = (pick) => () => pick(sampleGlade());

export const assets = [
  defineAsset({
    id: 'moon-pool', family: 'hidden', lab: 'moonpool/pool-assembly', label: 'Moon Pool', legacyName: 'Moon Pool',
    params: { shine: num(0.06, 0.02, 0.3, 0.02, 'Water gloss'), moss: moss(0.7), density },
    floating: [], sample: samplePool, build: buildMoonPool
  }),
  defineAsset({
    id: 'pool-apron', family: 'hidden', lab: 'moonpool/pool-apron', label: 'Pool apron',
    params: { spread, tint: white }, floating: ['disc'], sample: L((s) => s.apron), build: buildApron
  }),
  defineAsset({
    id: 'pool-water', family: 'hidden', lab: 'moonpool/game-water', label: 'Pool water',
    params: { shine: num(0.06, 0.02, 0.3, 0.02, 'Water gloss'), tint: white }, floating: ['surface', 'caustic'], sample: L((s) => s.water), build: buildWater
  }),
  defineAsset({
    id: 'pool-moon', family: 'hidden', lab: 'moonpool/game-moon', label: 'Moon on the water',
    params: { size: num(1, 0.7, 1.4, 0.1, 'Size') }, floating: ['sprite', 'glints'], sample: L((s) => s.moon), build: buildMoon
  }),
  defineAsset({
    id: 'pool-rim', family: 'hidden', lab: 'moonpool/pool-rim', label: 'Pool rim stones',
    params: { size: num(1, 0.8, 1.25, 0.05, 'Stone size'), moss: moss(0.7), facets: num(8, 3, 12, 1, 'Chisel cuts') }, sample: L((s) => s.rim), build: buildRim
  }),
  defineAsset({
    id: 'pool-seat', family: 'hidden', lab: 'moonpool/pool-seat', label: 'Pool sitting stone',
    params: { size: num(1, 0.85, 1.2, 0.05, 'Size'), moss: moss(0.5) }, sample: L((s) => s.seat), build: buildPoolSeat
  }),
  defineAsset({
    id: 'lily-pads', family: 'hidden', lab: 'moonpool/game-pad', label: 'Lily pad',
    params: { curl: num(1, 0, 2, 0.1, 'Rim curl'), size: num(1, 0.8, 1.3, 0.05, 'Size') }, floating: ['pad'],
    sample: L((s) => s.pads[0]), build: (ctx, l, p) => buildPads(ctx, [l], p, 'pad', true)
  }),
  defineAsset({
    id: 'lotus', family: 'hidden', lab: 'moonpool/lotus', label: 'Lotus',
    params: { height: num(1, 0.7, 1.5, 0.1, 'Stem height') }, sample: L((s) => s.lotus[0]), build: (ctx, l, p) => buildLotus(ctx, [l], p, 'bloom', true)
  }),
  defineAsset({
    id: 'pool-motes', family: 'hidden', lab: 'moonpool/game-motes', label: 'Pool motes',
    params: { density }, floating: ['points'], sample: L((s) => s.motes), build: buildMotes
  }),
  defineAsset({
    id: 'lantern-glade', family: 'hidden', lab: 'moonpool/lantern-glade', label: 'Lantern Glade', legacyName: 'Lantern Glade',
    params: { girth: num(1, 0.8, 1.4, 0.05, 'Culm girth'), moss: moss(1), density },
    floating: [], sample: sampleGlade, build: buildLanternGlade
  }),
  defineAsset({
    id: 'glade-floor', family: 'hidden', lab: 'moonpool/glade-floor', label: 'Glade floor',
    params: { spread, tint: white }, floating: ['disc'], sample: G((s) => s.floor), build: buildFloor
  }),
  defineAsset({
    id: 'glade-bamboo', family: 'hidden', lab: 'moonpool/glade-bamboo', label: 'Glade bamboo',
    params: { girth: num(1, 0.8, 1.5, 0.05, 'Culm girth'), height: num(1, 0.8, 1.2, 0.05, 'Height'), leaf: num(1, 0.6, 1.5, 0.1, 'Blade width') },
    floating: ['leaves'], sample: G((s) => s.bamboo), build: buildBamboo
  }),
  defineAsset({
    id: 'glade-lanterns', family: 'hidden', lab: 'moonpool/glade-lamp', label: 'Glade lantern',
    params: { size: num(1, 0.8, 1.3, 0.05, 'Size') }, floating: ['frame', 'paper', 'halos'],
    sample: G((s) => s.lanterns[0]), build: (ctx, l, p) => buildLanternSet(ctx, [{ L: l, o: [0, 0, 0] }], p)
  }),
  defineAsset({
    id: 'glade-seat', family: 'hidden', lab: 'moonpool/glade-seat', label: 'Glade seat and boulder',
    params: { size: num(1, 0.85, 1.2, 0.05, 'Size'), moss: moss(0.9) }, sample: G((s) => s.seat), build: buildGladeSeat
  }),
  defineAsset({
    id: 'glade-fireflies', family: 'hidden', lab: 'moonpool/fireflies', label: 'Glade fireflies',
    params: { density }, floating: ['points'], sample: G((s) => s.flies), build: buildFlies
  })
];
