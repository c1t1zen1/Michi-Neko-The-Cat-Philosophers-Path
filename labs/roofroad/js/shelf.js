// The Roof Road's piece shelf (BUILD_GUIDE_FABLE.md §12 R1.5): one specimen
// per piece type in rooftops/js/pieces/index.js (the PIECES table), plus the
// things buildWorld() adds around the run. Every specimen is the classic
// builder itself, run read-only on the real level: the first piece of that
// type in buildLevel(), built with the same ctx shape buildWorld() hands it,
// then turned so its rail frame faces the shelf (local x along the rail, z
// toward the camera). Nothing here changes a Roof Road file.
//
// The inventory (labs/asset_inventory.json, group "Roof Road") maps each row
// to `roofroad/<specimen id>` here; tools/labs_coverage.mjs checks that every
// PIECES type has an inventory row. SHELF below is that list in words: one
// line per specimen, keyed by its id (the piece type for pieces).
import * as THREE from 'three';
import { buildLevel } from '../../../rooftops/js/level.js';
import { pieceLayout } from '../../../rooftops/js/build.js';
import { PIECES } from '../../../rooftops/js/pieces/index.js';
import { makeMaterials } from '../../../rooftops/js/pieces/paint.js';
import { paintDowntown } from '../../../rooftops/js/downtown.js';
import { makeShoki, makeTreat } from '../../../rooftops/js/pieces/pickups.js';
import { buildDistantCity, buildPagoda } from '../../../rooftops/js/pieces/skyline.js';

// [name, Japanese, what it is]. Lanes and inventory ids come from PIECES.
export const SHELF = {
  // r2-roofs-streets: mouths 1–2
  street: ['Street ribbons', '通り', 'The ground under the run: Kamo gravel and river, the canal bank, market slabs and cobbled lanes. The first one is the Kamo.'],
  steps: ['River steps', '石段', 'The stone steps down from the bridge to the Kamo bed.'],
  bridge: ['Sanjō bridge', '三条大橋', 'Riverbed, deck joinery, piers with cutwaters, the bronze giboshi caps and the ramp where the run starts.'],
  kido: ['Kido gate', '木戸', 'The neighbourhood gate at the first street, its leaves standing open and a lantern under the roof.'],
  house: ['Machiya', '町家', 'Walls, façade, a hira or tsuma roof, eave details, a drying deck, festival lanterns and lit shoji, then the downtown dressing pass.'],
  kura: ['Kura storehouse', '蔵', 'Thick white walls over a namako skirt, with a barred window.'],
  corner: ['Corner house', '角屋', 'A house at a turn of the route, with a hip roof and the drying deck the run crosses.'],
  komayose: ['Komayose rails', '駒寄せ', 'The low timber rails along a frontage.'],
  inuyarai: ['Inuyarai', '犬矢来', 'Curved bamboo guards at a wall foot.'],
  roji: ['Roji side alley', '路地', 'A lantern-lit side alley with a drain, tobi-ishi, a tsukubai and a service door.'],
  tsuboniwa: ['Tsuboniwa tree', '坪庭', 'A courtyard garden tree leaning over a wall.'],
  deck: ['Yuka deck', '川床', 'Summer river decks on stilts, and the kaisho plank.'],
  balcony: ['Engawa and awnings', '縁側', 'Engawa, shop awnings and the little bridges between alley houses.'],
  post: ['Lantern post', '提灯', 'A post with its red chōchin.'],
  crate: ['Crates', '木箱', 'Stacked wooden crates the cat can climb.'],
  barrel: ['Barrels', '樽', 'Wooden barrels; the same builder as the komodaru.'],
  komodaru: ['Komodaru', '菰樽', 'Straw-wrapped sake casks, stacked at shop fronts.'],
  zushiTunnel: ['Zushi tunnel', '図子', 'A covered passage under a bridged machiya, with its solid soffit.'],
  alleyPocket: ['Alley pocket', '袋小路', 'A dead-end court off a back alley: flags, casks, an ita-bei fence and a shed eave.'],
  alleyRoute: ['Alley route', '抜け道', 'The deep routes through the interiors of downtown blocks.'],
  utilityPole: ['Utility pole', '電柱', 'A pole with crossarms and sagging wires.'],
  trellis: ['Vine trellis', '藤棚', 'A vine trellis over an alley.'],
  // r3-canal-market: mouths 3–5
  water: ['Takase canal', '高瀬川', 'The canal water and its towpath.'],
  canalQuarter: ['Canal banks', '川端', 'The canal’s architectural shell: wet banks, mooring stakes, drains, rain chains and greenery.'],
  steppingStone: ['Stepping stone', '飛石', 'A wet stepping stone with a moss cap.'],
  canalLanding: ['Canal landing', '舟入', 'A landing with its steps and posts.'],
  canalBridge: ['Canal footbridge', '橋', 'The arched footbridge over the canal.'],
  toro: ['Stone tōrō', '灯籠', 'A stone lantern by the canal.'],
  cherry: ['Cherry bough', '桜', 'A cherry bough over the canal: trunk, twigs and blossom.'],
  boat: ['Takasebune', '高瀬舟', 'A cargo boat: hull, rice bales, planks, the boatman and the wake. It moves on the run.'],
  canopy: ['Nishiki canopy', '錦のアーケード', 'The glass canopy over Nishiki: vault sections, steel ribs, skylight gaps and banners.'],
  vent: ['Canopy vent', '換気口', 'A vent on the canopy roof.'],
  shopfronts: ['Market stalls', '店先', 'The covered stalls along the back of the market street.'],
  marketCrossing: ['Skylight bridge', '渡り', 'A crossing slung under a skylight.'],
  rope: ['Lines', '物干し竿', 'Laundry poles, the tow rope and lantern lines.'],
  cistern: ['Cistern', '水槽', 'A rooftop cistern with its stand and ladder.'],
  chimney: ['Chimney', '煙突', 'A chimney with its rain cap.'],
  futonRack: ['Futon rack', '布団干し', 'A rack of airing futons the cat can bounce on.'],
  willow: ['Willow', '柳', 'A canal willow with hanging fronds.'],
  culvertLedge: ['Culvert ledge', '暗渠', 'A ledge under a bridge culvert.'],
  tenmanguGate: ['Tenmangū gate', '天満宮', 'The small shrine gate on Teramachi.'],
  // r4-festival: mouths 6–7 and beyond the run
  yatai: ['Yatai stall', '屋台', 'A festival stall, then the downtown dressing pass.'],
  rack: ['Lantern rack', '駒形提灯', 'A tiered rack of festival lanterns.'],
  float: ['Hoko float', '鉾', 'Wheels, undercarriage, brocade, deck, roof, the shingi mast, tassels and the hayashi musicians.'],
  gate: ['Temple gate', '山門', 'The temple gate at the end of the festival streets.'],
  tsuiji: ['Tsuiji wall', '築地塀', 'The tiled temple wall.'],
  yamaFloat: ['Yama float', '山', 'A smaller yama float with its pine.'],
  'distant-city': ['Distant city', '町並み', 'The instanced sea of roofs around the run.'],
  'skyline-pagoda': ['Skyline pagoda', '五重塔', 'One of the three pagodas on the skyline (the east one, at its scale).'],
  // r5-roof-cast
  villager: ['Villager', '町の人', 'A downtown worker or neighbour; they animate along the run.'],
  shoki: ['Shōki', '鍾馗', 'One of the seven clay Shōki on the eaves, greeted along the run.'],
  treat: ['Treat', 'おやつ', 'A hidden treat.']
};

// Extras: not level pieces; their owner lane and inventory id.
const EXTRA = {
  'distant-city': { lane: 'r4', id: 'roof-distant-city', file: 'pieces/skyline.js' },
  'skyline-pagoda': { lane: 'r4', id: 'roof-skyline-pagodas', file: 'pieces/skyline.js' },
  shoki: { lane: 'r5', id: 'roof-shoki', file: 'pieces/pickups.js' },
  treat: { lane: 'r5', id: 'roof-treats', file: 'pieces/pickups.js' }
};

let shared = null;
/** The level and the material set, built once per page. */
export function roofRoad() {
  if (!shared) {
    const level = buildLevel();
    const M = makeMaterials();
    paintDowntown(M);
    shared = { level, M };
  }
  return shared;
}

/** Which mouth an arc length falls in (any number of mouths). */
export function mouthOf(level, s) {
  return level.mouths.find((m) => s >= m.s0 && s < m.s1) || level.mouths[level.mouths.length - 1];
}

/** Every shelf entry with its owner lane, inventory id and first piece. */
export function shelfEntries() {
  const { level } = roofRoad();
  const out = [];
  for (const [key, [name, jp, blurb]] of Object.entries(SHELF)) {
    const piece = PIECES[key];
    const extra = EXTRA[key];
    if (!piece && !extra) throw new Error('Roof Road shelf: no piece type or extra for ' + key);
    const all = piece ? level.pieces.filter((p) => p.type === key) : [];
    const first = all[0] || null;
    const s = first ? pieceLayout(first, 0, level.rail).s : null;
    out.push({ key, name, jp, blurb, piece, lane: piece ? piece.lane : extra.lane, id: piece ? piece.id : extra.id, file: piece ? piece.file : extra.file, count: all.length, first, s, mouth: s === null ? null : mouthOf(level, s) });
  }
  // A type added to PIECES without a shelf line still gets a plain tile.
  for (const [key, piece] of Object.entries(PIECES)) {
    if (SHELF[key]) continue;
    console.warn('Roof Road shelf: piece type without a shelf line: ' + key);
    const all = level.pieces.filter((p) => p.type === key), first = all[0] || null;
    const s = first ? pieceLayout(first, 0, level.rail).s : null;
    out.push({ key, name: key, jp: '', blurb: 'A Roof Road piece type with no shelf line yet.', piece, lane: piece.lane, id: piece.id, file: piece.file, count: all.length, first, s, mouth: s === null ? null : mouthOf(level, s) });
  }
  return out;
}

/** The ctx buildWorld() hands a builder, collecting into one group. */
function pieceCtx(group) {
  const { level, M } = roofRoad();
  const lights = [];
  const ctx = {
    M, rail: level.rail, platforms: level.platforms, alleys: level.alleys,
    dynamic: { boat: null, boats: [], people: [], float: null, shoki: [], treats: [] },
    add: (o) => group.add(o),
    addGlass: (m) => { m.userData.glass = true; group.add(m); },
    addDyn: (o) => group.add(o),
    light: (r, s, y, d) => { const p = r.place(s, d); lights.push(new THREE.Vector3(p.x, y, p.z)); }
  };
  return { ctx, lights };
}

/** Moving water and cloth, as buildWorld().update() drives them. */
function animate(M) {
  return (t) => {
    for (const w of [M.water, M.kamoWater]) if (w?.uniforms?.uTime) w.uniforms.uTime.value = t;
    for (const mat of [...(M.cloth || []), ...Object.values(M.noren || {}), ...(M.brocade || [])]) {
      if (mat.userData.windShader) mat.userData.windShader.uniforms.uRoofTime.value = t;
    }
  };
}

/**
 * Build one shelf entry: the classic builder on the first piece of its type,
 * turned into its rail frame (a kit piece is built in the same frame, see
 * pieceLayout in build.js). Returns { group, lights, update }.
 */
export function buildEntry(entry) {
  const { level, M } = roofRoad();
  const group = new THREE.Group();
  group.name = 'roofroad/' + entry.key;
  if (entry.piece) {
    if (!entry.first) throw new Error('No ' + entry.key + ' piece on the run');
    const frame = new THREE.Group();
    const layout = pieceLayout(entry.first, 0, level.rail);
    const { ctx, lights } = pieceCtx(frame);
    entry.piece.build(entry.first, ctx);
    if (entry.piece.decorate) entry.piece.decorate(entry.first, ctx);
    frame.position.set(-layout.x, 0, -layout.z);
    const turn = new THREE.Group();
    turn.rotation.y = -layout.ry;
    turn.add(frame);
    group.add(turn);
    return { group, lights, update: animate(M) };
  }
  if (entry.key === 'distant-city') group.add(buildDistantCity(level, M));
  else if (entry.key === 'skyline-pagoda') group.add(buildPagoda(M, 0, 0, 1.35));
  else if (entry.key === 'shoki') group.add(makeShoki(M));
  else if (entry.key === 'treat') group.add(makeTreat(M));
  return { group, lights: [], update: animate(M) };
}
