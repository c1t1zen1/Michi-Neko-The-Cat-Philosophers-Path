// pieces/index.js — the Roof Road's PIECES table (BUILD_GUIDE_FABLE.md §12 R1.2).
//
// One entry per level piece type (`level.pieces[].type` in level.js):
//   id        the inventory id it is built under (labs/asset_inventory.json,
//             group "Roof Road"); buildWorld() routes the piece through
//             assets.build(id, layout, classic) with it (R1.3)
//   lane      the Phase 5 lane that owns the type after R1 (r2 mouths 1–2,
//             r3 mouths 3–5, r4 mouths 6–7, r5 the cast)
//   file      the module holding the classic builder (rooftops/js/…)
//   build     the classic builder, build(pc, ctx)
//   decorate  a dressing pass from the downtown kit that runs right after
//             the builder (houses and stalls), or null
// buildWorld() (build.js) walks level.pieces in order and looks each type up
// here; a type missing from this table throws, as it always has.

import { box, cyl, frameGroup, ribbon, mergeByMaterial } from './common.js';
import { hiraRoof } from './machiya.js';
import { hash1 } from '../level.js';
import { installDowntown } from '../downtown.js';
import { street } from './street.js';
import { steps } from './steps.js';
import { bridge } from './bridge.js';
import { kido } from './kido.js';
import { house } from './house.js';
import { kura } from './kura.js';
import { corner } from './corner.js';
import { komayose } from './komayose.js';
import { inuyarai } from './inuyarai.js';
import { roji } from './roji.js';
import { tsuboniwa } from './tsuboniwa.js';
import { deck } from './deck.js';
import { balcony } from './balcony.js';
import { post } from './post.js';
import { water } from './water.js';
import { canalQuarter } from './canalQuarter.js';
import { steppingStone } from './steppingStone.js';
import { canalLanding } from './canalLanding.js';
import { canalBridge } from './canalBridge.js';
import { toro } from './toro.js';
import { cherry } from './cherry.js';
import { boat } from './boat.js';
import { canopy } from './canopy.js';
import { vent } from './vent.js';
import { shopfronts } from './shopfronts.js';
import { marketCrossing } from './marketCrossing.js';
import { rope } from './rope.js';
import { cistern } from './cistern.js';
import { chimney } from './chimney.js';
import { futonRack } from './futonRack.js';
import { yatai } from './yatai.js';
import { rack } from './rack.js';
import { float } from './float.js';
import { gate } from './gate.js';
import { tsuiji } from './tsuiji.js';

// The downtown kit (downtown.js) installs its builders onto an object, as it
// did onto build.js's builder table; its types are listed below like any other.
const DT = {};
export const downtown = installDowntown(DT, { box, cyl, frameGroup, hiraRoof, ribbon, hash1, mergeParts: mergeByMaterial });

const piece = (id, lane, file, build, decorate = null) => Object.freeze({ id, lane, file, build, decorate });

export const PIECES = Object.freeze({
  // r2-roofs-streets: mouths 1–2, the streets and roofs
  street: piece('roof-street', 'r2', 'pieces/street.js', street),
  steps: piece('roof-river-steps', 'r2', 'pieces/steps.js', steps),
  bridge: piece('roof-bridge', 'r2', 'pieces/bridge.js', bridge),
  kido: piece('roof-kido', 'r2', 'pieces/kido.js', kido),
  house: piece('roof-machiya', 'r2', 'pieces/house.js', house, downtown.decorateHouse),
  kura: piece('roof-kura', 'r2', 'pieces/kura.js', kura),
  corner: piece('roof-corner-house', 'r2', 'pieces/corner.js', corner),
  komayose: piece('roof-komayose', 'r2', 'pieces/komayose.js', komayose),
  inuyarai: piece('roof-inuyarai', 'r2', 'pieces/inuyarai.js', inuyarai),
  roji: piece('roof-roji', 'r2', 'pieces/roji.js', roji),
  tsuboniwa: piece('roof-tsuboniwa', 'r2', 'pieces/tsuboniwa.js', tsuboniwa),
  deck: piece('roof-yuka', 'r2', 'pieces/deck.js', deck),
  balcony: piece('roof-balconies', 'r2', 'pieces/balcony.js', balcony),
  post: piece('roof-lantern-post', 'r2', 'pieces/post.js', post),
  crate: piece('roof-crates', 'r2', 'downtown.js', DT.crate),
  barrel: piece('roof-barrels', 'r2', 'downtown.js', DT.barrel),
  komodaru: piece('roof-komodaru', 'r2', 'downtown.js', DT.komodaru),
  zushiTunnel: piece('roof-zushi', 'r2', 'downtown.js', DT.zushiTunnel),
  alleyPocket: piece('roof-alley-pockets', 'r2', 'downtown.js', DT.alleyPocket),
  alleyRoute: piece('roof-alley-routes', 'r2', 'downtown.js', DT.alleyRoute),
  utilityPole: piece('roof-utility-poles', 'r2', 'downtown.js', DT.utilityPole),
  trellis: piece('roof-trellises', 'r2', 'downtown.js', DT.trellis),
  // r3-canal-market: mouths 3–5, Takase, Nishiki and the laundry sky
  water: piece('roof-canal', 'r3', 'pieces/water.js', water),
  canalQuarter: piece('roof-canal-banks', 'r3', 'pieces/canalQuarter.js', canalQuarter),
  steppingStone: piece('roof-stepping-stones', 'r3', 'pieces/steppingStone.js', steppingStone),
  canalLanding: piece('roof-canal-landings', 'r3', 'pieces/canalLanding.js', canalLanding),
  canalBridge: piece('roof-footbridge', 'r3', 'pieces/canalBridge.js', canalBridge),
  toro: piece('roof-toro', 'r3', 'pieces/toro.js', toro),
  cherry: piece('roof-cherry-boughs', 'r3', 'pieces/cherry.js', cherry),
  boat: piece('roof-takasebune', 'r3', 'pieces/boat.js', boat),
  canopy: piece('roof-canopy', 'r3', 'pieces/canopy.js', canopy),
  vent: piece('roof-canopy-vents', 'r3', 'pieces/vent.js', vent),
  shopfronts: piece('roof-market-stalls', 'r3', 'pieces/shopfronts.js', shopfronts),
  marketCrossing: piece('roof-skylight-bridge', 'r3', 'pieces/marketCrossing.js', marketCrossing),
  rope: piece('roof-lines', 'r3', 'pieces/rope.js', rope),
  cistern: piece('roof-cistern', 'r3', 'pieces/cistern.js', cistern),
  chimney: piece('roof-chimney', 'r3', 'pieces/chimney.js', chimney),
  futonRack: piece('roof-futon-racks', 'r3', 'pieces/futonRack.js', futonRack),
  willow: piece('roof-willows', 'r3', 'downtown.js', DT.willow),
  culvertLedge: piece('roof-culvert-ledges', 'r3', 'downtown.js', DT.culvertLedge),
  tenmanguGate: piece('roof-tenmangu-gate', 'r3', 'downtown.js', DT.tenmanguGate),
  // r4-festival: mouths 6–7, Hoko-chō and the float
  yatai: piece('roof-yatai', 'r4', 'pieces/yatai.js', yatai, downtown.decorateStall),
  rack: piece('roof-lantern-racks', 'r4', 'pieces/rack.js', rack),
  float: piece('roof-hoko', 'r4', 'pieces/float.js', float),
  gate: piece('roof-temple-gate', 'r4', 'pieces/gate.js', gate),
  tsuiji: piece('roof-tsuiji', 'r4', 'pieces/tsuiji.js', tsuiji),
  yamaFloat: piece('roof-yama', 'r4', 'downtown.js', DT.yamaFloat),
  // r5-roof-cast
  villager: piece('roof-villagers', 'r5', 'downtown.js', DT.villager)
});
