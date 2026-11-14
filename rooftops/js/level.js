// The Roof Road: seven "mouths" of downtown Kyoto (rakuchū) as a ~1,082 m maze.
//
// buildLevel() lays every piece along the 14-leg downtown grid rail by arc
// length and returns:
//   platforms   one-way surfaces in (s, y) with a visual depth d
//   walls       one-way side walls of tall buildings (block entering only)
//   ceilings    solid tunnel soffits under bridged machiya (zushiTunnel)
//   pieces      what build.js turns into painted 3D Kyoto meshes
//   pickups     the seven Shōki guardians and hidden downtown treats
//   perches     dense main + mischievous detour nodes for Chidori
//   checkpoints, mouths, center, bounds
//
// Heights are game scale (a valley shop's eave is 2.1 m). Depth: +d is
// toward the camera; the façade line of a street is d = 0, the street in
// front of it +2.2, deep back-alleys −3.8…−4.8, ridges about −2.5.
// Pure data — no three.js.

import { Rail } from './rail.js';

// 14 legs weaving north, south, east and west across downtown Kyoto:
// Sanjō Ōhashi → Awataguchi → Pontochō → Pontochō–Kiyamachi roji → Kaburenjō lane →
// Takasegawa boat basin & willow canal → Teramachi/Tenmangū → Nishiki Market →
// Yanaginobanba & Rokkaku monohoshi blocks → Muromachi & Shinmachi Hoko-chō.
export const RAIL_POINTS = [
  { x: 0, z: 0 },       // Leg 0 (68m E): Sanjō Ōhashi & Awataguchi gate
  { x: 68, z: 0 },      // Leg 1 (68m N): Kamo riverside & south Pontochō
  { x: 68, z: -68 },    // Leg 2 (42m W): Pontochō → Kiyamachi roji alley cut
  { x: 26, z: -68 },    // Leg 3 (70m N): Inner Pontochō / Kaburenjō back-lane
  { x: 26, z: -138 },   // Leg 4 (70m W): Ichi-no-Funairi Takase boat basin
  { x: -44, z: -138 },  // Leg 5 (92m S): Takasegawa willow & cherry canal run
  { x: -44, z: -46 },   // Leg 6 (60m W): Teramachi arcade & Tenmangū gate
  { x: -104, z: -46 },  // Leg 7 (130m N): Nishiki stained-glass canopy maze
  { x: -104, z: -176 }, // Leg 8 (68m W): Yanaginobanba tunnel-roji alley
  { x: -172, z: -176 }, // Leg 9 (88m S): Monohoshi Laundry Sky & cisterns
  { x: -172, z: -88 },  // Leg 10 (56m W): Rokkaku courtyard & fence-top lane
  { x: -228, z: -88 },  // Leg 11 (108m N): Muromachi Yoiyama street fair
  { x: -228, z: -196 }, // Leg 12 (56m W): Shinmachi festival lantern canyon
  { x: -284, z: -196 }, // Leg 13 (120m S): Yamahoko Avenue & Okuribi float
  { x: -284, z: -76 }
];
export const RAIL_RADIUS = 2.5;

export const MOUTHS = [
  { id: 1, kanji: '粟田口', romaji: 'Awataguchi', title: 'the Mouth', note: 'Sanjō Ōhashi, a hidden tunnel roji, and the first shops of rakuchū' },
  { id: 2, kanji: '先斗町', romaji: 'Pontochō', title: 'the Alley Maze', note: 'yuka river decks, narrow geiko zushi, vine trellises and crooked ridges' },
  { id: 3, kanji: '高瀬川', romaji: 'Takase', title: 'the Water Maze', note: 'two cargo takasebune, willow fronds, bridge culverts and cherry boughs' },
  { id: 4, kanji: '錦', romaji: 'Nishiki', title: 'the Long Canopy', note: 'Teramachi lanterns, stained-glass vaults, rafter catwalks and skylights' },
  { id: 5, kanji: '物干し', romaji: 'Monohoshi', title: 'Laundry Sky', note: 'drying decks, folks hanging yukata, tunnel lanes, futons and high cisterns' },
  { id: 6, kanji: '鉾町', romaji: 'Hoko-chō', title: 'Festival Streets', note: 'bustling yatai stalls, folding screens, a kakiyama and the great hoko float' },
  { id: 7, kanji: '送り火', romaji: 'Okuribi', title: 'the Sending Fires', note: 'five fires on the Kyoto hills, across the roofs you ran' }
];

/** Small deterministic hash for per-piece looks (never Math.random). */
export function hash1(x) {
  const s = Math.sin(x * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function buildLevel() {
  const rail = new Rail(RAIL_POINTS, RAIL_RADIUS);
  const C = rail.corners;
  const legs = rail.segs.filter((g) => g.type === 'line');
  const L = {
    rail,
    length: rail.length,
    center: { x: -108, z: -98 },
    bounds: { x0: -308, x1: 92, z0: -220, z1: 28 },
    platforms: [],
    walls: [],
    ceilings: [],
    pieces: [],
    pickups: [],
    perches: [],
    checkpoints: [],
    mouths: MOUTHS.map((m) => ({ ...m }))
  };

  /* ---------------- primitives ---------------- */

  const plat = (o) => {
    const y0 = o.y0 ?? o.y, y1 = o.y1 ?? o.y;
    const p = {
      id: L.platforms.length, s0: o.s0, s1: o.s1, y0, y1, d: o.d ?? 0,
      kind: o.kind || 'roof', label: o.label || o.kind || 'roof'
    };
    if (o.solid) p.solid = true;
    if (o.move) p.move = o.move;
    if (o.sprint) p.sprint = true;
    L.platforms.push(p);
    return p;
  };
  const wall = (s, y1, dir, d0, d1, y0 = 0) => L.walls.push({ s, y0, y1, dir, d0, d1 });
  const ceiling = (s0, s1, y, d0 = -3.5, d1 = 3.5) => L.ceilings.push({ s0, s1, y, d0, d1 });
  const piece = (o) => { L.pieces.push(o); return o; };
  const sides = (s0, s1, top, d0, d1, y0 = 0) => { wall(s0, top, +1, d0, d1, y0); wall(s1, top, -1, d0, d1, y0); };

  const street = (s0, s1, d, surface = 'cobble', y = 0) => {
    const kind = surface === 'water' ? 'water' : 'street';
    const p = plat({ s0, s1, y, d, kind, label: surface });
    piece({ type: surface === 'water' ? 'water' : 'street', s0, s1, y, d, surface, plat: p.id });
    return p;
  };

  /**
   * A machiya townhouse. Hira-iri gives an eave ledge and a ridge line;
   * tsuma-iri gives two gable slopes. Optional byobu opens the ground lattice
   * to display a gold folding screen during Yoiyama.
   */
  const house = (s0, s1, o) => {
    const st = o.storeys || 1;
    const style = o.style || 'hira';
    const dF = o.dFront ?? 0;
    const depth = o.depth ?? 5;
    const dRidge = dF - depth / 2;
    const name = o.label || 'house';
    const pc = piece({
      type: 'house', s0, s1, storeys: st, style, eave: o.eave, ridge: o.ridge,
      hisashi: o.hisashi, dFront: dF, depth, row: o.row || 'near',
      look: o.look ?? hash1(s0), noren: o.noren, lanterns: !!o.lanterns,
      kaisho: !!o.kaisho, byobu: !!o.byobu, vines: !!o.vines, deck: null, plats: {}
    });
    if (st === 2) {
      pc.plats.hisashi = plat({ s0: s0 + 0.05, s1: s1 - 0.05, y: o.hisashi, d: dF + 0.7, kind: 'eave', label: name + ' hisashi' });
    }
    if (style === 'hira') {
      pc.plats.eave = plat({ s0: s0 + 0.05, s1: s1 - 0.05, y: o.eave, d: dF + (st === 2 ? 0.15 : 0.45), kind: 'eave', label: name + ' eave' });
      pc.plats.ridge = plat({ s0: s0 + 0.15, s1: s1 - 0.15, y: o.ridge, d: dRidge, kind: 'ridge', label: name + ' ridge' });
    } else {
      const m = (s0 + s1) / 2;
      pc.plats.left = plat({ s0: s0 - 0.25, s1: m, y0: o.eave, y1: o.ridge, d: dF - 0.6, kind: 'roof', label: name + ' gable' });
      pc.plats.right = plat({ s0: m, s1: s1 + 0.25, y0: o.ridge, y1: o.eave, d: dF - 0.6, kind: 'roof', label: name + ' gable' });
    }
    sides(s0, s1, o.eave, dF - depth, dF + 0.1);
    if (o.deck) {
      const dk = o.deck;
      pc.deck = { s0: dk.s0, s1: dk.s1, y: dk.y };
      pc.plats.deck = plat({ s0: dk.s0, s1: dk.s1, y: dk.y, d: dRidge + 0.9, kind: 'deck', label: name + ' drying deck' });
      if (dk.futon) {
        pc.futon = { s0: dk.futon[0], s1: dk.futon[1], y: dk.y + 0.85 };
        pc.plats.futon = plat({ s0: dk.futon[0], s1: dk.futon[1], y: dk.y + 0.85, d: dRidge + 1.5, kind: 'futon', label: name + ' futon' });
      }
    }
    return pc;
  };

  /**
   * A Kyoto "tunnel roji" (トンネル路地 / 辻子): a two-storey machiya whose
   * ground floor opens as a timber-beamed tunnel passage you can run straight
   * through, with agility shelves inside AND full eaves/ridge overhead.
   */
  const zushiTunnel = (s0, s1, o = {}) => {
    const dF = o.dFront ?? 0;
    const depth = o.depth ?? 5.0;
    const dRidge = dF - depth / 2;
    const tunnelH = o.tunnelH ?? 2.15;
    const hisashi = o.hisashi ?? 2.45;
    const eave = o.eave ?? 3.65;
    const ridge = o.ridge ?? 4.45;
    const name = o.label || 'tunnel roji';
    const pc = piece({
      type: 'zushiTunnel', s0, s1, tunnelH, hisashi, eave, ridge,
      dFront: dF, depth, look: o.look ?? hash1(s0 * 1.9),
      noren: o.noren || 'indigo', lanterns: true, vines: !!o.vines, plats: {}
    });
    // Upper walls only block above the tunnel opening, so a cat below tunnelH
    // dashes cleanly underneath the second floor!
    sides(s0, s1, eave, dF - depth, dF + 0.3, tunnelH);
    ceiling(s0 + 0.15, s1 - 0.15, tunnelH, dF - 2.6, dF + 2.4);
    pc.plats.hisashi = plat({ s0: s0 + 0.05, s1: s1 - 0.05, y: hisashi, d: dF + 0.65, kind: 'eave', label: name + ' hisashi' });
    pc.plats.eave = plat({ s0: s0 + 0.05, s1: s1 - 0.05, y: eave, d: dF + 0.15, kind: 'eave', label: name + ' eave' });
    pc.plats.ridge = plat({ s0: s0 + 0.15, s1: s1 - 0.15, y: ridge, d: dRidge, kind: 'ridge', label: name + ' ridge' });
    // Inside-tunnel cat agility path: wooden shelf, bamboo conduit, sake barrel.
    const w = s1 - s0;
    pc.plats.stepIn = plat({ s0: s0 + 0.25, s1: s0 + w * 0.36, y: 0.78, d: dF - 0.85, kind: 'step', label: name + ' crate step' });
    pc.plats.shelf = plat({ s0: s0 + w * 0.30, s1: s1 - w * 0.30, y: 1.32, d: dF - 1.15, kind: 'deck', label: name + ' beam shelf' });
    pc.plats.stepOut = plat({ s0: s1 - w * 0.36, s1: s1 - 0.25, y: 0.86, d: dF - 0.75, kind: 'step', label: name + ' barrel step' });
    return pc;
  };

  /**
   * A branching deep back-alley pocket (路地奥): drops into the interior of a
   * Kyoto block (d ≈ −3.9…−4.6) with staggered fence-tops, barrels and a
   * climb-back ladder of eaves to rejoin the roofs.
   */
  const alleyPocket = (s0, s1, o = {}) => {
    const w = s1 - s0;
    const dDeep = o.d ?? -4.1;
    const topY = o.topY ?? 2.85;
    const name = o.label || 'back alley';
    const pFloor = plat({ s0: s0 + 0.2, s1: s1 - 0.2, y: 0.18, d: dDeep, kind: 'deck', label: name + ' flags' });
    const pCask = plat({ s0: s0 + 0.35, s1: s0 + Math.min(1.6, w * 0.34), y: 0.96, d: dDeep + 0.35, kind: 'step', label: name + ' sake casks' });
    const pFence = plat({ s0: s0 + w * 0.28, s1: s1 - w * 0.24, y: 1.88, d: dDeep - 0.25, kind: 'cap', label: name + ' ita-bei coping' });
    const pShed = plat({ s0: s1 - Math.min(2.2, w * 0.42), s1: s1 - 0.15, y: topY, d: dDeep + 0.55, kind: 'roof', label: name + ' shed eave' });
    piece({ type: 'alleyPocket', s0, s1, d: dDeep, topY, look: hash1(s0 * 3.1), plats: [pFloor.id, pCask.id, pFence.id, pShed.id] });
    return { floor: pFloor, cask: pCask, fence: pFence, shed: pShed };
  };

  /** A kura storehouse: tall namako-walled box, gable to the street. */
  const kura = (s0, s1, foot, ridge, label = 'kura', dF = 0) => {
    const m = (s0 + s1) / 2;
    const pc = piece({ type: 'kura', s0, s1, foot, ridge, dFront: dF, depth: 4.5, plats: {} });
    pc.plats.left = plat({ s0: s0 - 0.25, s1: m, y0: foot, y1: ridge, d: dF - 0.6, kind: 'roof', label: label + ' roof' });
    pc.plats.right = plat({ s0: m, s1: s1 + 0.25, y0: ridge, y1: foot, d: dF - 0.6, kind: 'roof', label: label + ' roof' });
    sides(s0, s1, foot, dF - 4.5, dF + 0.1);
    return pc;
  };

  /** Corner crossing centred on fillet i (outside machiya deck or inside gallery bridge). */
  const corner = (i, h, label = 'corner deck') => {
    const c = C[i];
    const s0 = c.s0 - 2.5, s1 = c.s1 + 2.5;
    const p = plat({ s0, s1, y: h, d: 0, kind: 'deck', label });
    const tIn = rail.tangentAt(c.s0 - 0.01), tOut = rail.tangentAt(c.s1 + 0.01);
    piece({
      type: 'corner', s0, s1, cx: c.c.x, cz: c.c.z, vertex: c.vertex, sweep: c.sweep,
      tIn, tOut, half: 2.8, deckHalf: 2.9, h, eave: h - 1.25, plat: p.id
    });
    return p;
  };

  const small = (type, s0, s1, y, d, kind = 'step', label = type, extra = {}) => {
    const p = plat({ s0, s1, y0: extra.y0 ?? y, y1: y, d, kind, label });
    piece({ type, s0, s1, y, y0: extra.y0 ?? y, d, plat: p.id, ...extra });
    return p;
  };
  const barrel = (s, d = 2.0) => small('barrel', s - 0.32, s + 0.32, 0.82, d, 'step', 'barrel');
  const komodaru = (s, y = 1.05, d = 1.85) => small('komodaru', s - 0.42, s + 0.42, y, d, 'step', 'sake barrels');
  const komayose = (s0, s1, d = 1.8) => small('komayose', s0, s1, 1.0, d, 'step', 'komayose fence');
  const inuyarai = (s0, s1, d = 0.45) => small('inuyarai', s0, s1, 0.92, d, 'step', 'inuyarai');
  const toro = (s, d = 2.35) => small('toro', s - 0.22, s + 0.22, 1.45, d, 'cap', 'stone lantern');
  const crate = (s0, s1, y, d = 2.0) => small('crate', s0, s1, y, d, 'step', 'slatted crates');

  /** Iconic Kyoto wooden utility pole (denchū) with walkable crossarms & wires. */
  const utilityPole = (s, d = 1.65, lowY = 3.35, highY = 4.45, wireSpan = 0) => {
    const armLow = plat({ s0: s - 0.45, s1: s + 0.45, y: lowY, d, kind: 'cap', label: 'utility pole crossarm' });
    const armHigh = plat({ s0: s - 0.52, s1: s + 0.52, y: highY, d, kind: 'cap', label: 'transformer crossarm' });
    piece({ type: 'utilityPole', s, s0: s - 0.55, s1: s + 0.55, d, lowY, highY, wireSpan, look: hash1(s * 5.3), plats: [armLow.id, armHigh.id] });
    return { low: armLow, high: armHigh };
  };

  /** Vine or wisteria pergola trellis bridging between roofs or across an alley. */
  const trellis = (s0, s1, y, d = 0.4, flower = 'wisteria', label = 'vine trellis') => {
    const p = plat({ s0, s1, y, d, kind: 'deck', label });
    piece({ type: 'trellis', s0, s1, y, d, flower, look: hash1(s0 * 2.3 + d), plat: p.id });
    return p;
  };

  /** Weeping willow (yanagi) leaning over canal or riverbank with a playable limb. */
  const willow = (s0, s1, y, d, bank = 'near') => {
    const p = plat({ s0, s1, y, d, kind: 'branch', label: 'willow limb' });
    piece({ type: 'willow', s0: s0 - 1.2, s1: s1 + 0.4, bough: { s0, s1, y }, d, bank, look: hash1(s0 * 4.7), plat: p.id });
    return p;
  };

  const steppingStone = (s0, s1, y, d = 3.0, i = 0, shape = 'stone') => {
    const p = plat({ s0, s1, y, d, kind: 'step', label: 'canal stepping stone' });
    piece({ type: 'steppingStone', s0, s1, y, d, shape, plat: p.id, look: hash1(31 + i * 7.3) });
    return p;
  };

  const culvertLedge = (s0, s1, y, d = 2.45) => {
    const p = plat({ s0, s1, y, d, kind: 'step', label: 'under-bridge culvert ledge' });
    piece({ type: 'culvertLedge', s0, s1, y, d, plat: p.id });
    return p;
  };

  const canalLanding = (s0, s1, y, d, side = 'near') => {
    const p = plat({ s0, s1, y, d, kind: 'deck', label: 'canal landing' });
    piece({ type: 'canalLanding', s0, s1, y, d, side, plat: p.id });
    return p;
  };

  const canalBridge = (s0, s1, y, d) => {
    const p = plat({ s0, s1, y, d, kind: 'deck', label: 'Takase footbridge' });
    piece({ type: 'canalBridge', s0, s1, y, d, plat: p.id });
    return p;
  };

  const balcony = (s0, s1, y, d, style = 'engawa', label = 'alley balcony') => {
    const p = plat({ s0, s1, y, d, kind: 'deck', label });
    piece({ type: 'balcony', s0, s1, y, d, style, plat: p.id, look: hash1(s0 * 1.73 + d) });
    return p;
  };

  const marketCrossing = (s0, s1, y, d, side = 'far') => {
    const p = plat({ s0, s1, y, d, kind: 'deck', label: 'Nishiki skylight bridge' });
    piece({ type: 'marketCrossing', s0, s1, y, d, side, plat: p.id });
    return p;
  };

  const tenmanguGate = (s0, s1, y = 3.45, d = 0.85) => {
    const p = plat({ s0, s1, y, d, kind: 'cap', label: 'Tenmangū lantern gate' });
    piece({ type: 'tenmanguGate', s0, s1, y, d, plat: p.id });
    return p;
  };

  const cistern = (s0, s1, y, d) => {
    const p = plat({ s0, s1, y, d, kind: 'cap', label: 'rooftop water cistern' });
    piece({ type: 'cistern', s0, s1, y, d, plat: p.id });
    return p;
  };

  const chimney = (s0, s1, y, d) => {
    const p = plat({ s0, s1, y, d, kind: 'cap', label: 'kitchen chimney cap' });
    piece({ type: 'chimney', s0, s1, y, d, plat: p.id, look: hash1(s0 * 2.7) });
    return p;
  };

  const futonRack = (s0, s1, y, d, look = 0) => {
    const p = plat({ s0, s1, y, d, kind: 'futon', label: 'sun-warmed futon rack' });
    piece({ type: 'futonRack', s0, s1, y, d, plat: p.id, look });
    return p;
  };

  const yatai = (s0, s1, y, d, fare = 'yakitori', staffed = true) => {
    const p = plat({ s0, s1, y, d, kind: 'deck', label: `${fare} yatai roof` });
    piece({ type: 'yatai', s0, s1, y, d, fare, staffed, plat: p.id, look: hash1(s0 * 4.1) });
    return p;
  };

  const yamaFloat = (s0, s1, deckY = 2.65, pineY = 4.65, d = 1.15) => {
    const pDeck = plat({ s0, s1, y: deckY, d, kind: 'deck', label: 'kakiyama float stage' });
    const m = (s0 + s1) / 2;
    const pBough = plat({ s0: m - 0.9, s1: m + 0.9, y: deckY + 1.05, d: d - 0.1, kind: 'rack', label: 'kakiyama tapestry rail' });
    const pPine = plat({ s0: m - 0.65, s1: m + 0.65, y: pineY, d: d - 0.15, kind: 'branch', label: 'kakiyama sacred pine' });
    piece({ type: 'yamaFloat', s0, s1, deckY, pineY, d, plats: [pDeck.id, pBough.id, pPine.id] });
    return { deck: pDeck, rail: pBough, pine: pPine };
  };

  const rope = (s0, s1, y, d, style) => {
    const label = style === 'laundry' ? 'laundry pole' : style === 'vines' ? 'vine-wrapped line' : style === 'tow' ? 'canal haul rope' : 'lantern line';
    const p = plat({ s0, s1, y, d, kind: 'rope', label });
    piece({ type: 'rope', s0, s1, y, d, style, plat: p.id });
    return p;
  };

  const rack = (s0, s1, d = 1.6, top = 2.8) => {
    const w = s1 - s0;
    const tiers = [
      plat({ s0, s1, y: top - 1.8, d, kind: 'rack', label: 'lantern rack' }),
      plat({ s0: s0 + w / 6, s1: s1 - w / 6, y: top - 0.9, d, kind: 'rack', label: 'lantern rack' }),
      plat({ s0: s0 + w / 3, s1: s1 - w / 3, y: top, d, kind: 'rack', label: 'lantern rack' })
    ];
    piece({ type: 'rack', s0, s1, d, tiers: tiers.map((t) => ({ s0: t.s0, s1: t.s1, y: t.y0 })) });
    return tiers;
  };

  const villager = (s, y, d, role = 'stallkeeper', extra = {}) =>
    piece({ type: 'villager', s, s0: s - 0.35, s1: s + 0.35, y, d, role, look: hash1(s * 6.7 + d), ...extra });

  const shoki = (id, s, y, d, face = 0) => L.pickups.push({ id, kind: 'shoki', s, y, d, face });
  const treat = (id, s, y, d, label) => L.pickups.push({ id, kind: 'treat', s, y, d, label });
  const perch = (s, y, d, opts = {}) => L.perches.push({
    s, y, d,
    mood: opts.mood || 'beckon',
    detour: !!opts.detour,
    note: opts.note || null
  });
  const checkpoint = (mouth, s, y) => L.checkpoints.push({ mouth, s, y });
  const route = (...ps) => ps.forEach((p) => { if (p) p.route = L._r = (L._r ?? -1) + 1; });

  /** Sprinkle regular climb-backs along a street segment so no stretch is ever >10 m from a way up. */
  const streetProps = (sStart, sEnd, step = 8.5, d = 1.95) => {
    let idx = 0;
    for (let s = sStart; s <= sEnd; s += step, idx++) {
      const m = idx % 4;
      if (m === 0) barrel(s, d);
      else if (m === 1) inuyarai(s - 0.7, s + 0.7, 0.5);
      else if (m === 2) komodaru(s, 1.05, d - 0.1);
      else crate(s - 0.45, s + 0.45, 1.08, d);
    }
  };

  /* ======================================================================== */
  /*  ① Awataguchi — the Mouth (Legs 0 & 1a: s ≈ 0 .. 104 m)                  */
  /* ======================================================================== */
  {
    const g0 = legs[0], g1 = legs[1];
    street(0, 12.6, 2.2, 'gravel', -0.6);
    small('steps', 12.6, 13.6, -0.3, 2.2, 'street', 'river steps');
    street(13.6, C[0].s0, 2.2, 'cobble');

    const deck = plat({ s0: 0, s1: 14.0, y: 1.1, d: 0, kind: 'deck', label: 'Sanjō Ōhashi deck' });
    deck.start = true;
    const ramp = plat({ s0: 14.0, s1: 16.6, y0: 1.1, y1: 0.05, d: 0, kind: 'deck', label: 'bridge ramp' });
    const capS = [1.8, 4.1, 6.4, 8.7, 11.0, 13.2];
    const caps = capS.map((s, i) => plat({ s0: s - 0.2, s1: s + 0.2, y: 1.95, d: 1.25, kind: 'cap', label: 'giboshi ' + (i + 1) }));
    piece({ type: 'bridge', s0: 0, s1: 16.6, deckY: 1.1, caps: capS, capY: 1.95, plats: [deck.id, ramp.id] });
    willow(11.6, 14.2, 2.35, -1.8, 'far');

    const kido = small('kido', 14.6, 17.2, 2.45, 0.6, 'roof', 'Awataguchi kido gate');
    const A1 = house(18.0, 24.0, { eave: 2.1, ridge: 3.0, label: 'tea-cake shop', noren: 'indigo', lanterns: true, vines: true });
    villager(20.2, 0, 1.5, 'sweeper');
    komodaru(24.55, 1.05, 1.85);
    const A2 = house(25.1, 31.1, { style: 'tsuma', eave: 2.2, ridge: 3.3, label: 'gable sandal shop', noren: 'hemp' });
    piece({ type: 'roji', s0: 31.25, s1: 32.85, d: 0 });
    // First playable tunnel-roji! Run over the roof OR duck straight through the lantern-lit tunnel below!
    const AT1 = zushiTunnel(33.0, 40.2, { tunnelH: 2.15, hisashi: 2.45, eave: 3.55, ridge: 4.35, label: 'Sanjō zushi tunnel', noren: 'crimson', vines: true });
    inuyarai(40.5, 42.0, 0.48);
    // Deep alley pocket right behind the tunnel exit for curious cats.
    const AP1 = alleyPocket(40.6, 46.2, { d: -4.0, topY: 2.75, label: 'potter back-roji' });
    const A3 = house(42.2, 48.4, { eave: 2.15, ridge: 3.05, label: 'pottery shop', noren: 'indigo', lanterns: true });
    const UP1 = utilityPole(49.2, 1.65, 3.3, 4.35, 8.5);
    komayose(49.6, 51.2);
    const A4 = house(50.2, 56.8, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'traveller inn', noren: 'hemp', lanterns: true });
    barrel(57.3);
    const A5 = house(57.8, g0.s1 - 2.8, { eave: 2.35, ridge: 3.25, label: 'cornersweet shop', noren: 'crimson' });
    const K0 = corner(0, 3.45, 'Awataguchi corner deck');

    // Leg 1a (north along Kamo approach up to s = 104, where Pontochō proper begins):
    const split1 = g1.s0 + 31.0;
    street(C[0].s0, split1, 2.4, 'cobble');
    const A6 = house(g1.s0 + 2.8, g1.s0 + 9.2, { eave: 2.25, ridge: 3.15, label: 'lantern maker', noren: 'indigo', lanterns: true });
    inuyarai(g1.s0 + 9.4, g1.s0 + 10.9);
    const TR1 = trellis(g1.s0 + 9.4, g1.s0 + 13.6, 3.35, 0.55, 'ivy', 'ivy alley arbor');
    barrel(g1.s0 + 12.2, 1.95);
    const A7 = house(g1.s0 + 14.0, g1.s0 + 21.0, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'fan workshop', noren: 'crimson', vines: true });
    komodaru(g1.s0 + 21.5, 1.05, 1.85);
    const A8 = house(g1.s0 + 22.0, split1 - 0.6, { eave: 2.35, ridge: 3.25, label: 'riverside teahouse', noren: 'hemp', lanterns: true });

    route(
      deck, caps[0], caps[1], caps[2], caps[3], caps[4], caps[5], kido,
      A1.plats.ridge, A2.plats.left, A2.plats.right,
      AT1.plats.hisashi, AT1.plats.eave, AT1.plats.ridge,
      A3.plats.ridge, UP1.low, A4.plats.eave, A4.plats.ridge, A5.plats.ridge, K0,
      A6.plats.ridge, TR1, A7.plats.eave, A7.plats.ridge, A8.plats.ridge
    );

    shoki(1, 21.0, 2.1, A1.plats.eave.d + 0.15, 0.4);
    treat(1, (AT1.plats.shelf.s0 + AT1.plats.shelf.s1) / 2, AT1.plats.shelf.y0, AT1.plats.shelf.d, 'a sweet rice-cracker hidden on the tunnel beam');
    treat(2, (AP1.fence.s0 + AP1.fence.s1) / 2, AP1.fence.y0, AP1.fence.d, 'a sun-dried sardine atop the potter’s back-alley fence');
    checkpoint(1, 1.0, 1.1);

    perch(6.4, 1.95, 1.25, { mood: 'beckon' });
    perch(12.2, 1.95, 1.25, { mood: 'sprint' });
    perch(15.9, 2.45, 0.6, { mood: 'beckon' });
    perch(21.2, 3.0, -2.5, { mood: 'saunter' });
    perch(28.1, 3.3, -0.6, { mood: 'beckon' });
    perch(34.2, 0.78, -0.85, { mood: 'mischief', detour: true, note: 'tunnel' });
    perch(36.6, 4.35, -2.5, { mood: 'beckon' });
    perch(43.2, 1.88, -4.35, { mood: 'mischief', detour: true, note: 'alley' });
    perch(45.4, 3.05, -2.5, { mood: 'sprint' });
    perch(49.2, 3.3, 1.65, { mood: 'beckon' });
    perch(54.0, 4.4, -2.5, { mood: 'saunter' });
    perch(60.5, 3.25, -2.5, { mood: 'beckon' });
    perch((C[0].s0 + C[0].s1) / 2, 3.45, 0, { mood: 'beckon' });
    perch(g1.s0 + 6.0, 3.15, -2.5, { mood: 'sprint' });
    perch(g1.s0 + 11.5, 3.35, 0.55, { mood: 'beckon' });
    perch(g1.s0 + 17.5, 4.4, -2.5, { mood: 'saunter' });
    perch(g1.s0 + 26.0, 3.25, -2.5, { mood: 'beckon' });
  }

  /* ======================================================================== */
  /*  ② Pontochō — the Alley Maze (Legs 1b, 2, 3: s ≈ 100 .. 246 m)           */
  /* ======================================================================== */
  {
    const g1 = legs[1], g2 = legs[2], g3 = legs[3];
    const pStart = g1.s0 + 31.0;
    checkpoint(2, pStart + 2.4, 3.2);

    // Leg 1b: Kamo riverside ochaya with summer nōryō-yuka dining decks over the water.
    street(pStart, C[1].s0, 4.0, 'bank');
    const near1 = [
      [pStart + 0.6, pStart + 7.8],
      [pStart + 10.6, pStart + 18.2],
      [pStart + 21.0, g1.s1 - 2.8]
    ];
    const far1 = [
      [pStart + 4.8, pStart + 12.6],
      [pStart + 16.0, pStart + 24.4]
    ];
    const N1 = near1.map(([a, b], i) => house(a, b, { eave: 2.45, ridge: 3.2, label: 'Pontochō ochaya', noren: i % 2 ? 'crimson' : 'indigo', lanterns: true }));
    const F1 = far1.map(([a, b]) => house(a, b, { storeys: 2, eave: 3.7, ridge: 4.5, hisashi: 3.0, dFront: -4.4, depth: 5, row: 'far', label: 'geiko alley house', lanterns: true }));
    for (let i = 0; i + 1 < near1.length; i++) piece({ type: 'tsuboniwa', s0: near1[i][1], s1: near1[i + 1][0], d: -1.5 });
    const PR1 = rope(near1[1][1] - 0.15, near1[2][0] + 0.15, 3.3, -3.9, 'lanterns');

    // Low road: 4 riverside yuka dining decks on stilts + lantern posts.
    for (let i = 0; i < 4; i++) {
      const a = pStart + 1.0 + i * 7.2, b = Math.min(g1.s1 - 1.2, a + 6.5);
      const p = plat({ s0: a, s1: b, y: 1.4, d: 2.4, kind: 'deck', label: 'kawayuka river deck' });
      piece({ type: 'deck', style: 'yuka', s0: a, s1: b, y: 1.4, d: 2.4, plat: p.id });
    }
    small('post', pStart + 5.2, pStart + 5.5, 2.05, 2.7, 'cap', 'plover lantern post');
    small('post', pStart + 19.6, pStart + 19.9, 2.05, 2.7, 'cap', 'plover lantern post');
    balcony(pStart + 2.0, pStart + 6.4, 2.15, 0.85, 'engawa', 'Pontochō river engawa');
    balcony(pStart + 7.2, pStart + 11.4, 2.55, -3.75, 'bridge', 'Pontochō alley bridge');
    balcony(pStart + 12.2, pStart + 16.8, 2.18, 0.85, 'awning', 'Pontochō awning');
    balcony(pStart + 17.6, pStart + 22.0, 2.62, -3.80, 'engawa', 'Pontochō far engawa');
    const K1 = corner(1, 3.45, 'Pontochō river corner');

    // Leg 2 (42 m West): Turns right DOWN a narrow Pontochō–Kiyamachi roji alley!
    street(C[1].s0, C[2].s0, 2.2, 'cobble');
    streetProps(g2.s0 + 3.0, g2.s1 - 3.5, 8.2, 1.9);
    const Z1 = house(g2.s0 + 2.8, g2.s0 + 9.2, { eave: 2.35, ridge: 3.2, label: 'shamisen house', noren: 'crimson', lanterns: true, vines: true });
    // Bridged okiya tunnel-roji in the narrow lane!
    const ZT = zushiTunnel(g2.s0 + 9.8, g2.s0 + 17.4, { tunnelH: 2.15, hisashi: 2.45, eave: 3.6, ridge: 4.4, label: 'okiya tunnel zushi', noren: 'indigo', vines: true });
    const ZTR = trellis(g2.s0 + 17.8, g2.s0 + 22.4, 3.65, -1.2, 'wisteria', 'roji wisteria bridge');
    const Z2 = house(g2.s0 + 22.8, g2.s0 + 29.4, { storeys: 2, eave: 3.65, ridge: 4.45, hisashi: 2.35, label: 'obanzai kitchen', noren: 'hemp', lanterns: true });
    const Z3 = house(g2.s0 + 29.9, g2.s1 - 2.8, { eave: 2.55, ridge: 3.35, label: 'roji teahouse', noren: 'crimson', lanterns: true });
    // Middle crooked balconies weaving across the narrow roji:
    for (let i = 0; i < 5; i++) {
      const a = g2.s0 + 3.2 + i * 6.2;
      balcony(a, Math.min(g2.s1 - 2.0, a + 4.8), 2.15 + (i % 2) * 0.42, i % 2 ? -3.65 : 0.85, i % 3 === 1 ? 'bridge' : i % 2 ? 'engawa' : 'awning', `roji ${i + 1}`);
    }
    const K2 = corner(2, 3.5, 'Kiyamachi zushi gallery');

    // Leg 3 (70 m North): Inner Kaburenjō & izakaya lane with 3-layer depth swaps + stepped kura!
    street(C[2].s0, C[3].s0, 3.8, 'bank');
    const near3 = [
      [g3.s0 + 2.8, g3.s0 + 10.6],
      [g3.s0 + 13.8, g3.s0 + 22.2],
      [g3.s0 + 25.8, g3.s0 + 34.4],
      [g3.s0 + 38.0, g3.s0 + 46.2]
    ];
    const far3 = [
      [g3.s0 + 8.0, g3.s0 + 16.2],
      [g3.s0 + 20.0, g3.s0 + 28.4],
      [g3.s0 + 32.2, g3.s0 + 40.6]
    ];
    const N3 = near3.map(([a, b], i) => house(a, b, { eave: 2.45, ridge: 3.25, label: 'izakaya', noren: i % 2 ? 'indigo' : 'crimson', lanterns: true, vines: i === 1 }));
    const F3 = far3.map(([a, b]) => house(a, b, { storeys: 2, eave: 3.7, ridge: 4.5, hisashi: 3.0, dFront: -4.4, depth: 5, row: 'far', label: 'Kaburenjō house', lanterns: true }));
    for (let i = 0; i + 1 < near3.length; i++) piece({ type: 'tsuboniwa', s0: near3[i][1], s1: near3[i + 1][0], d: -1.5 });
    const PR2 = rope(near3[0][1] - 0.15, near3[1][0] + 0.15, 3.3, -3.9, 'lanterns');
    const PR3 = rope(near3[2][1] - 0.15, near3[3][0] + 0.15, 3.35, -3.9, 'vines');
    // Yuka & crooked middle road along Leg 3:
    for (let i = 0; i < 5; i++) {
      const a = g3.s0 + 3.2 + i * 8.6;
      const p = plat({ s0: a, s1: a + 7.4, y: 1.4, d: 2.4, kind: 'deck', label: 'yuka deck' });
      piece({ type: 'deck', style: 'yuka', s0: a, s1: a + 7.4, y: 1.4, d: 2.4, plat: p.id });
    }
    for (let i = 0; i < 8; i++) {
      const a = g3.s0 + 3.0 + i * 5.4;
      balcony(a, a + 4.4, 2.15 + (i % 2) * 0.48, i % 2 ? -3.8 : 0.85, ['engawa', 'bridge', 'awning'][i % 3], `Kaburenjō balcony ${i + 1}`);
    }
    for (const off of [9.5, 24.5, 39.5]) small('post', g3.s0 + off - 0.18, g3.s0 + off + 0.18, 2.0, 2.7, 'cap', 'lantern post');
    const UP2 = utilityPole(g3.s0 + 47.0, 1.65, 3.45, 4.45, 7.5);
    const KA = kura(g3.s0 + 48.0, g3.s0 + 53.8, 3.75, 4.65, 'tea kura');
    const KB = kura(g3.s0 + 54.6, g3.s1 - 2.8, 4.5, 5.4, 'kaburenjō kura');
    crate(g3.s0 + 53.8, g3.s0 + 55.0, 1.18, 2.0);
    balcony(g3.s0 + 53.2, g3.s0 + 58.0, 2.35, 0.85, 'engawa', 'kura climb-back engawa');
    balcony(g3.s0 + 52.4, g3.s0 + 56.8, 3.55, 0.75, 'awning', 'kura climb-back awning');
    inuyarai(g3.s0 + 56.5, g3.s0 + 58.2, 0.5);
    villager(g3.s0 + 12.2, 0, 1.55, 'sweeper');
    const K3 = corner(3, 4.35, 'canal-head corner deck');

    route(
      N1[0].plats.ridge, F1[0].plats.eave, N1[1].plats.ridge, PR1, N1[2].plats.ridge, K1,
      Z1.plats.ridge, ZT.plats.hisashi, ZT.plats.eave, ZT.plats.ridge, ZTR, Z2.plats.ridge, Z3.plats.ridge, K2,
      N3[0].plats.ridge, PR2, N3[1].plats.ridge, F3[1].plats.eave, N3[2].plats.ridge, PR3, N3[3].plats.ridge,
      UP2.low, KA.plats.left, KA.plats.right, KB.plats.left, KB.plats.right, K3
    );

    shoki(2, (F3[1].plats.ridge.s0 + F3[1].plats.ridge.s1) / 2, 4.5, F3[1].plats.ridge.d, -0.5);
    treat(3, pStart + 18.0, 1.4, 2.4, 'a dried sardine (niboshi) left on a riverside yuka table');
    treat(4, (ZT.plats.shelf.s0 + ZT.plats.shelf.s1) / 2, ZT.plats.shelf.y0, ZT.plats.shelf.d, 'a tiny pouch of katsuobushi tucked inside the okiya tunnel');

    for (let s = pStart + 3; s < C[3].s0 - 3; s += 5.4) {
      perch(s, 3.3 + (Math.floor(s) % 2) * 0.9, (Math.floor(s / 5) % 2) ? -3.8 : -2.2, {
        mood: (Math.floor(s) % 3 === 0) ? 'sprint' : 'beckon'
      });
    }
    perch(pStart + 17.5, 1.4, 2.4, { mood: 'mischief', detour: true, note: 'yuka' });
    perch(g2.s0 + 13.0, 1.32, -1.15, { mood: 'mischief', detour: true, note: 'tunnel' });
    perch(g3.s0 + 21.0, 2.63, -3.8, { mood: 'mischief', detour: true, note: 'balcony' });
    perch((C[3].s0 + C[3].s1) / 2, 4.35, 0, { mood: 'beckon' });
  }

  /* ======================================================================== */
  /*  ③ Takase — the Water Maze (Legs 4 & 5: s ≈ 246 .. 406 m)                */
  /* ======================================================================== */
  {
    const g4 = legs[4], g5 = legs[5];
    checkpoint(3, (C[3].s0 + C[3].s1) / 2, 4.35);

    // --- Leg 4 (70 m West): Ichi-no-Funairi historic boat basin & upper Takase canal ---
    const w4a = g4.s0 + 8.6, w4b = g4.s1 - 7.6;
    street(C[3].s0, w4a, 3.0, 'cobble');
    street(w4a, w4b, 3.0, 'water', -0.38);
    street(w4b, C[4].s0, 3.0, 'cobble');
    piece({ type: 'canalQuarter', s0: g4.s0 + 6.4, s1: g4.s1 - 5.4, water0: w4a, water1: w4b, d: 3.0 });

    const T1 = house(g4.s0 + 2.8, g4.s0 + 9.2, { storeys: 2, eave: 3.55, ridge: 4.35, hisashi: 2.25, label: 'Suminokura canal house', noren: 'hemp', lanterns: true });
    inuyarai(g4.s0 + 3.6, g4.s0 + 5.2);
    canalLanding(w4a + 0.4, w4a + 2.8, 0.7, 1.5, 'near');
    // Moving Takasebune #1 in the upper boat basin!
    const boat1 = plat({
      s0: w4a + 2.0, s1: w4a + 6.6, y: 1.28, d: 2.65, kind: 'boat', label: 'Ichi-no-Funairi takasebune',
      move: { amp: 18.5, period: 15, phase: 0 }
    });
    piece({ type: 'boat', plat: boat1.id, len: 4.6, y: 1.28, d: 2.65, s0: w4a + 2.0, s1: w4a + 25.1 });

    // Stepping stones (alternating mossy river stones & turtle/plover shapes!)
    for (let i = 0; i < 9; i++) {
      const a = w4a + 1.2 + i * 5.1;
      steppingStone(a, a + 1.25, 0.16 + (i % 3) * 0.06, 3.0 + (i % 2 ? 0.3 : -0.24), i, i === 4 ? 'turtle' : 'stone');
    }
    const CB1 = canalBridge(w4a + 18.0, w4a + 21.2, 2.08, 3.0);
    culvertLedge(w4a + 19.0, w4a + 20.3, 0.34, 2.45);
    const W4_1 = willow(w4a + 24.2, w4a + 27.4, 2.12, 3.55, 'far');
    const W4_2 = willow(w4a + 28.4, w4a + 31.6, 2.48, 1.45, 'near');
    const TR_C1 = trellis(w4a + 32.6, w4a + 36.8, 2.75, 3.65, 'wisteria', 'canal wisteria arbor');
    const W4_3 = willow(w4a + 37.8, w4a + 41.2, 2.52, 1.5, 'far');
    const TR_C2 = trellis(w4a + 42.2, w4a + 45.8, 2.65, 3.45, 'ivy', 'basin ivy pergola');
    const W4_4 = willow(w4a + 46.6, w4b - 0.4, 2.42, 1.45, 'near');
    canalLanding(w4b - 3.2, w4b - 0.6, 0.72, 2.1, 'far');
    const T2 = house(w4b - 1.4, g4.s1 - 2.8, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'lumber-yard machiya', noren: 'indigo', lanterns: true });
    toro(g4.s1 - 4.0);
    const K4 = corner(4, 4.15, 'Kiyamachi willow corner');

    // --- Leg 5 (92 m South): Lower Takasegawa Willow & Cherry Blossom Run ---
    const w5a = g5.s0 + 7.8, w5b = g5.s1 - 9.2;
    street(C[4].s0, w5a, 3.0, 'cobble');
    street(w5a, w5b, 3.0, 'water', -0.38);
    street(w5b, C[5].s0, 3.0, 'cobble');
    piece({ type: 'canalQuarter', s0: g5.s0 + 5.8, s1: g5.s1 - 7.0, water0: w5a, water1: w5b, d: 3.0 });

    const T3 = house(g5.s0 + 2.8, g5.s0 + 8.6, { eave: 2.4, ridge: 3.25, label: 'canal tea stall', noren: 'crimson', lanterns: true, vines: true });
    barrel(g5.s0 + 4.2, 2.1);
    canalLanding(w5a + 0.4, w5a + 2.8, 0.68, 1.5, 'near');

    // Moving Takasebune #2 along the cherry-blossom canal!
    const boat2 = plat({
      s0: w5a + 1.8, s1: w5a + 6.4, y: 1.25, d: 2.65, kind: 'boat', label: 'cherry-canal takasebune',
      move: { amp: 22.0, period: 16, phase: 0.35 }
    });
    piece({ type: 'boat', plat: boat2.id, len: 4.6, y: 1.25, d: 2.65, s0: w5a + 1.8, s1: w5a + 28.4 });

    for (let i = 0; i < 13; i++) {
      const a = w5a + 1.4 + i * 5.2;
      steppingStone(a, a + 1.28, 0.15 + (i % 3) * 0.07, 3.0 + (i % 2 ? -0.25 : 0.28), 10 + i, i % 5 === 2 ? 'turtle' : 'stone');
    }
    const CB2 = canalBridge(w5a + 16.0, w5a + 19.2, 2.1, 3.0);
    culvertLedge(w5a + 17.0, w5a + 18.2, 0.34, 2.45);
    const CB3 = canalBridge(w5a + 44.0, w5a + 47.2, 2.12, 3.0);
    culvertLedge(w5a + 45.0, w5a + 46.2, 0.34, 2.45);
    // Waterside tea balconies along the far bank so middle-layer explorers have a full road too:
    balcony(w5a + 29.2, w5a + 34.0, 1.88, 1.25, 'engawa', 'waterside engawa');
    balcony(w5a + 35.4, w5a + 40.4, 2.15, 1.2, 'awning', 'canal awning');
    balcony(w5a + 48.6, w5a + 53.8, 1.95, 1.3, 'engawa', 'willow teahouse deck');
    canalLanding(w5a + 34.0, w5a + 36.4, 0.72, 1.85, 'near');
    canalLanding(w5b - 3.2, w5b - 0.6, 0.72, 2.1, 'far');

    // High cherry-bough & haul-rope sprint line overhead:
    const boughDefs = [
      [w5a + 28.8, w5a + 32.0, 2.35, 1.4],
      [w5a + 33.8, w5a + 37.0, 2.72, 3.85],
      [w5a + 38.8, w5a + 42.2, 2.48, 1.45],
      [w5a + 46.8, w5a + 50.2, 2.82, 3.95],
      [w5a + 52.0, w5a + 55.4, 2.52, 1.5],
      [w5a + 57.2, w5a + 60.8, 2.78, 3.8],
      [w5a + 62.4, w5a + 65.8, 2.48, 1.45],
      [w5a + 66.6, w5a + 69.2, 2.42, 1.35]
    ];
    const boughs = boughDefs.map(([a, b, y, d], i) => {
      const p = plat({ s0: a, s1: b, y, d, kind: 'branch', label: 'cherry bough', sprint: true });
      piece({ type: 'cherry', s0: a - 1.4, s1: b + 0.2, bough: { s0: a, s1: b, y }, d, bank: i % 2 ? 'far' : 'near', plat: p.id });
      return p;
    });
    const towRope = rope(w5a + 42.0, w5a + 47.0, 2.95, 2.7, 'tow');

    const TF = house(w5b - 1.2, g5.s1 - 2.8, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'Kiyamachi sake house', noren: 'crimson', lanterns: true });
    komodaru(g5.s1 - 4.8, 1.05, 1.9);
    const K5 = corner(5, 3.85, 'Teramachi crossing bridge');

    route(
      T1.plats.eave, T1.plats.hisashi, boat1, W4_1, W4_2, TR_C1, W4_3, TR_C2, W4_4,
      T2.plats.hisashi, T2.plats.eave, T2.plats.ridge, K4,
      T3.plats.ridge, boat2,
      boughs[0], boughs[1], boughs[2], towRope, boughs[3], boughs[4], boughs[5], boughs[6], boughs[7],
      TF.plats.hisashi, TF.plats.eave, TF.plats.ridge, K5
    );

    shoki(3, (TF.plats.hisashi.s0 + TF.plats.hisashi.s1) / 2, 2.3, TF.plats.hisashi.d + 0.1, 0.6);
    treat(5, (CB1.s0 + CB1.s1) / 2, CB1.y0, CB1.d, 'a bonito flake tucked beneath the upper canal bridge rail');
    treat(6, w5a + 17.6, 0.34, 2.45, 'a cool river-prawn hidden on the stone culvert ledge under the bridge');

    for (let s = g4.s0 + 4; s < C[5].s0 - 3; s += 5.8) {
      perch(s, 2.5 + (Math.floor(s) % 3) * 0.45, (Math.floor(s / 6) % 2) ? 3.5 : 1.5, {
        mood: (Math.floor(s) % 2) ? 'sprint' : 'beckon'
      });
    }
    perch(w4a + 19.5, 0.34, 2.45, { mood: 'mischief', detour: true, note: 'culvert' });
    perch((CB2.s0 + CB2.s1) / 2, 2.1, 3.0, { mood: 'mischief', detour: true, note: 'bridge' });
    perch((CB3.s0 + CB3.s1) / 2, 2.12, 3.0, { mood: 'saunter' });
    perch((C[5].s0 + C[5].s1) / 2, 3.85, 0, { mood: 'beckon' });
  }

  /* ======================================================================== */
  /*  ④ Nishiki & Teramachi — the Covered Arcades (Legs 6 & 7: s ≈ 406..594m) */
  /* ======================================================================== */
  {
    const g6 = legs[6], g7 = legs[7];
    checkpoint(4, (C[5].s0 + C[5].s1) / 2, 3.85);

    // --- Leg 6 (60 m West): Teramachi book/tea/incense shops, market tunnel & Tenmangū gate ---
    street(C[5].s0, C[6].s0, 2.2, 'market');
    streetProps(g6.s0 + 3.5, g6.s1 - 4.0, 8.8, 1.95);
    const TM1 = house(g6.s0 + 3.2, g6.s0 + 10.2, { storeys: 2, eave: 3.55, ridge: 4.35, hisashi: 2.3, label: 'Teramachi tea merchant', noren: 'hemp', lanterns: true });
    // Shinkyōgoku–Teramachi covered zushi passage:
    const TMT = zushiTunnel(g6.s0 + 10.8, g6.s0 + 18.6, { tunnelH: 2.15, hisashi: 2.45, eave: 3.6, ridge: 4.4, label: 'Shinkyōgoku arcade zushi', noren: 'indigo' });
    const TMP = alleyPocket(g6.s0 + 19.0, g6.s0 + 24.8, { d: -4.1, topY: 2.85, label: 'woodblock print courtyard' });
    const TM2 = house(g6.s0 + 19.2, g6.s0 + 26.4, { eave: 2.55, ridge: 3.4, label: 'incense apothecary', noren: 'crimson', lanterns: true, vines: true });
    const UP3 = utilityPole(g6.s0 + 27.3, 1.65, 3.4, 4.4, 8.0);
    const TM3 = house(g6.s0 + 28.2, g6.s0 + 35.8, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'brush & paper shop', noren: 'indigo', lanterns: true });
    // Nishiki Tenmangū shrine lantern wall & stone torii at the market entrance!
    const TG = tenmanguGate(g6.s0 + 36.8, g6.s0 + 41.2, 3.55, 0.85);
    villager(g6.s0 + 38.8, 0, 1.65, 'festivalgoer');
    const TM4 = house(g6.s0 + 42.0, g6.s1 - 2.8, { storeys: 2, eave: 3.65, ridge: 4.45, hisashi: 2.35, label: 'Tenmangū sweet shop', noren: 'crimson', lanterns: true });
    komodaru(g6.s1 - 5.0, 1.05, 1.95); // a final shop delivery step before the inside turn
    const K6 = corner(6, 4.35, 'Nishikikōji corner gallery');

    // --- Leg 7 (130 m North): Nishiki Market ("Kyoto's Kitchen") stained-glass canopy ---
    street(C[6].s0, C[7].s0, 2.2, 'market');
    // Keep 9 m after inside corner C[6] as low stepped shops before the 5 m glass vault rises!
    const NS0 = house(g7.s0 + 3.0, g7.s0 + 9.8, { storeys: 2, eave: 3.65, ridge: 4.45, hisashi: 2.35, label: 'tsukemono pickle shop', noren: 'indigo', lanterns: true });
    komodaru(g7.s0 + 5.2, 1.05, 1.9);

    const cStart = g7.s0 + 10.6;
    const gA = [cStart + 22.0, cStart + 25.2];
    const gB = [cStart + 49.0, cStart + 52.2];
    const gC = [cStart + 76.0, cStart + 79.2];
    const cEnd = g7.s1 - 11.4;
    const canopySegs = [
      [cStart, gA[0]],
      [gA[1], gB[0]],
      [gB[1], gC[0]],
      [gC[1], cEnd]
    ];
    const CN = canopySegs.map(([a, b], i) => plat({ s0: a, s1: b, y: 5.0, d: 1.2, kind: 'canopy', label: `Nishiki stained-glass bay ${i + 1}`, solid: true }));
    piece({ type: 'canopy', s0: cStart, s1: cEnd, y: 5.0, d: 1.2, gaps: [gA, gB, gC], skipGaps: [gA, gB, gC] });

    // Lowered skylight bridges swapping depth across the market:
    const NX1 = marketCrossing(gA[0] + 0.45, gA[1] - 0.45, 3.92, -0.45, 'far');
    const NX2 = marketCrossing(gB[0] + 0.45, gB[1] - 0.45, 3.86, 2.25, 'near');
    const NX3 = marketCrossing(gC[0] + 0.45, gC[1] - 0.45, 3.90, -0.45, 'far');

    // Interior rafter & banner catwalk tunnel *underneath* the stained-glass canopy!
    // Players who stay inside the market vault can run a full mid-air catwalk at y ≈ 3.15..3.55!
    for (const [seg0, seg1] of canopySegs) {
      for (let s = seg0 + 2.2, k = 0; s < seg1 - 3.6; s += 6.2, k++) {
        balcony(s, s + 4.2, 3.18 + (k % 2) * 0.28, k % 2 ? 1.85 : -0.35, k % 2 ? 'awning' : 'bridge', 'market rafter catwalk');
      }
    }

    // Rooftop vents along the canopy bays:
    for (const [seg0, seg1] of canopySegs) {
      const vm = (seg0 + seg1) / 2;
      small('vent', vm - 0.35, vm + 0.35, 5.42, 1.2, 'roof', 'canopy vent');
      sides(vm - 0.35, vm + 0.35, 5.42, 0.2, 2.2, 5.0);
    }

    // Covered skylight shops & regular floor climb-backs all down Nishiki's 100 m market aisle:
    for (const gMid of [(gA[0] + gA[1]) / 2, (gB[0] + gB[1]) / 2, (gC[0] + gC[1]) / 2]) {
      crate(gMid - 0.45, gMid + 0.45, 1.12);
      const sh = house(gMid - 2.2, gMid + 2.4, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'Nishiki skylight shop', noren: 'hemp' });
      sh.covered = true;
    }
    streetProps(cStart + 1.5, cEnd - 1.5, 8.6, 1.95);
    for (let s = cStart + 7.5, i = 0; s < cEnd - 6; s += 19.5, i++) {
      villager(s, 0, 0.75, 'stallkeeper', { market: true, fare: ['fish', 'pickles', 'tofu', 'knives', 'sweets'][i % 5] });
    }
    piece({ type: 'shopfronts', s0: cStart, s1: cEnd, d: 0, gaps: [gA, gB, gC] });

    const NS2 = house(cEnd + 0.6, g7.s1 - 2.8, {
      storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'Nishiki fishmonger',
      noren: 'indigo', lanterns: true, deck: { s0: cEnd + 1.4, s1: g7.s1 - 3.4, y: 5.0 }
    });
    komayose(cEnd + 1.2, cEnd + 2.8);
    const K7 = corner(7, 4.6, 'Nishiki west corner deck');

    route(
      TM1.plats.eave, TM1.plats.ridge, TMT.plats.eave, TMT.plats.ridge,
      TM2.plats.ridge, UP3.low, TM3.plats.eave, TM3.plats.ridge, TG, TM4.plats.eave, TM4.plats.ridge, K6,
      NS0.plats.ridge, CN[0], NX1, CN[1], NX2, CN[2], NX3, CN[3], NS2.plats.deck, K7
    );

    shoki(4, cEnd + 2.4, 2.3, NS2.plats.hisashi.d + 0.1, -0.3);
    treat(7, (TMP.fence.s0 + TMP.fence.s1) / 2, TMP.fence.y0, TMP.fence.d, 'a sesame senbei behind the Teramachi print shop');
    treat(8, cEnd + 3.8, 5.0, NS2.plats.deck.d, 'a sliver of charcoal-grilled sea bream set out by the fishmonger');
    treat(9, cStart + 35.0, 3.46, 1.85, 'a strip of fresh yuba drying on the market rafter catwalk');

    for (let s = g6.s0 + 4; s < C[7].s0 - 3; s += 5.8) {
      const inCanopy = s >= cStart && s <= cEnd;
      perch(s, inCanopy ? 5.0 : 3.9, inCanopy ? 1.2 : -1.8, {
        mood: inCanopy ? 'sprint' : 'beckon'
      });
    }
    perch(g6.s0 + 14.5, 1.32, -1.15, { mood: 'mischief', detour: true, note: 'tunnel' });
    perch(cStart + 14.5, 3.18, -0.35, { mood: 'mischief', detour: true, note: 'rafter' });
    perch(cStart + 62.0, 3.46, 1.85, { mood: 'mischief', detour: true, note: 'rafter' });
    perch((C[7].s0 + C[7].s1) / 2, 4.6, 0, { mood: 'beckon' });
  }

  /* ======================================================================== */
  /*  ⑤ Monohoshi — Laundry Sky & Roji Tunnels (Legs 8, 9, 10: s ≈ 594..803m) */
  /* ======================================================================== */
  {
    const g8 = legs[8], g9 = legs[9], g10 = legs[10];
    checkpoint(5, (C[7].s0 + C[7].s1) / 2, 4.6);

    // --- Leg 8 (68 m West): Yanaginobanba residential tunnel-roji & vine poles ---
    street(C[7].s0, C[8].s0, 2.2, 'cobble');
    streetProps(g8.s0 + 3.2, g8.s1 - 3.5, 8.5, 1.95);

    const YN1 = house(g8.s0 + 2.8, g8.s0 + 9.4, {
      storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'dyer house',
      noren: 'indigo', deck: { s0: g8.s0 + 3.4, s1: g8.s0 + 8.8, y: 5.0 }
    });
    villager(g8.s0 + 6.1, 5.0, -1.6, 'laundry');
    const YNT1 = zushiTunnel(g8.s0 + 10.2, g8.s0 + 17.8, { tunnelH: 2.15, hisashi: 2.45, eave: 3.65, ridge: 4.45, label: 'Yanaginobanba tunnel roji', noren: 'hemp', vines: true });
    const YNP = alleyPocket(g8.s0 + 18.2, g8.s0 + 24.4, { d: -4.2, topY: 2.9, label: 'indigo-vat courtyard' });
    const YN2 = house(g8.s0 + 24.8, g8.s0 + 31.8, {
      storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'kimono tailor',
      deck: { s0: g8.s0 + 25.4, s1: g8.s0 + 31.2, y: 5.0 }
    });
    const YTR1 = trellis(g8.s0 + 18.0, g8.s0 + 24.6, 4.65, -0.8, 'wisteria', 'dyer wisteria bridge');
    const UP4 = utilityPole(g8.s0 + 32.8, 1.65, 3.6, 4.85, 8.2);
    const YNT2 = zushiTunnel(g8.s0 + 33.8, g8.s0 + 41.4, { tunnelH: 2.15, hisashi: 2.45, eave: 3.65, ridge: 4.45, label: 'wellhouse zushi tunnel', noren: 'crimson' });
    const YN3 = house(g8.s0 + 42.2, g8.s0 + 49.4, {
      storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'tatami maker',
      deck: { s0: g8.s0 + 42.8, s1: g8.s0 + 48.8, y: 5.0 }
    });
    villager(g8.s0 + 45.6, 5.0, -1.6, 'laundry');
    const YN4 = house(g8.s0 + 50.2, g8.s1 - 2.8, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'corner apothecary', noren: 'indigo' });
    const K8 = corner(8, 4.8, 'Rokkaku monohoshi corner');

    // --- Leg 9 (88 m South): Classic Monohoshi Laundry Sky (futons, poles, cisterns, tall kura, chimneys!) ---
    street(C[8].s0, C[9].s0, 2.2, 'cobble');
    streetProps(g9.s0 + 3.5, g9.s1 - 3.5, 9.0, 1.95);

    const M1 = house(g9.s0 + 2.8, g9.s0 + 9.4, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'drying-deck house', deck: { s0: g9.s0 + 3.4, s1: g9.s0 + 8.8, y: 5.0 } });
    villager(g9.s0 + 5.8, 5.0, -1.6, 'laundry');
    piece({ type: 'tsuboniwa', s0: g9.s0 + 9.4, s1: g9.s0 + 13.8, d: -1.5 });
    const P1 = rope(g9.s0 + 8.7, g9.s0 + 13.7, 5.45, -1.0, 'laundry');
    const W1 = cistern(g9.s0 + 10.6, g9.s0 + 13.0, 6.08, -1.0);
    futonRack(g9.s0 + 10.8, g9.s0 + 12.6, 1.62, 1.55, 0.2);
    balcony(g9.s0 + 12.0, g9.s0 + 14.8, 3.18, 0.75, 'engawa', 'futon climb-back balcony');

    const M2 = house(g9.s0 + 13.8, g9.s0 + 20.2, {
      storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'sun-futon house',
      deck: { s0: g9.s0 + 14.2, s1: g9.s0 + 18.4, y: 5.0, futon: [g9.s0 + 18.4, g9.s0 + 19.8] }
    });
    const K_TALL = kura(g9.s0 + 20.6, g9.s0 + 26.4, 6.65, 7.8, 'tall merchant kura');
    const M3 = house(g9.s0 + 27.2, g9.s0 + 34.0, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'sheet-drying house', deck: { s0: g9.s0 + 27.8, s1: g9.s0 + 33.2, y: 5.0 } });
    villager(g9.s0 + 30.2, 5.0, -1.6, 'laundry');
    const CH1 = chimney(g9.s0 + 31.8, g9.s0 + 33.4, 6.02, -1.55);
    const P2 = rope(g9.s0 + 33.2, g9.s0 + 38.2, 5.45, -1.0, 'laundry');
    piece({ type: 'tsuboniwa', s0: g9.s0 + 34.0, s1: g9.s0 + 38.6, d: -1.5 });
    futonRack(g9.s0 + 34.8, g9.s0 + 36.6, 1.58, 1.45, 0.7);
    balcony(g9.s0 + 36.0, g9.s0 + 39.0, 3.16, 0.70, 'awning', 'laundry climb-back awning');

    const M4 = house(g9.s0 + 38.6, g9.s0 + 45.4, {
      storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'yukata-airing house',
      deck: { s0: g9.s0 + 39.2, s1: g9.s0 + 43.4, y: 5.0, futon: [g9.s0 + 43.4, g9.s0 + 44.8] }
    });
    const W2 = cistern(g9.s0 + 45.8, g9.s0 + 48.2, 6.45, -1.1);
    const M5 = house(g9.s0 + 49.0, g9.s0 + 56.0, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'breeze-deck house', deck: { s0: g9.s0 + 49.6, s1: g9.s0 + 55.2, y: 5.0 } });
    villager(g9.s0 + 52.4, 5.0, -1.6, 'laundry');
    const CH2 = chimney(g9.s0 + 56.4, g9.s0 + 58.0, 5.35, -1.45);
    const M6 = house(g9.s0 + 58.6, g9.s0 + 65.4, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'weaver machiya', noren: 'crimson', vines: true });
    const UP5 = utilityPole(g9.s0 + 66.4, 1.65, 3.4, 4.4, 7.8);
    const M7 = house(g9.s0 + 67.4, g9.s0 + 73.6, { eave: 2.4, ridge: 3.3, label: 'tofu shop', noren: 'hemp', lanterns: true });
    const M8 = house(g9.s0 + 74.2, g9.s1 - 2.8, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'corner lacquer house', noren: 'indigo' });
    const K9 = corner(9, 4.1, 'Rokkaku crossing bridge');

    // --- Leg 10 (56 m West): Rokkaku courtyard kura, bamboo & Jizō tunnel lane ---
    street(C[9].s0, C[10].s0, 2.2, 'cobble');
    streetProps(g10.s0 + 3.2, g10.s1 - 3.5, 8.4, 1.95);
    const RK1 = house(g10.s0 + 2.8, g10.s0 + 9.6, { storeys: 2, eave: 3.55, ridge: 4.35, hisashi: 2.3, label: 'bamboo-craft house', noren: 'hemp', vines: true });
    const RKT = zushiTunnel(g10.s0 + 10.4, g10.s0 + 18.0, { tunnelH: 2.15, hisashi: 2.45, eave: 3.6, ridge: 4.4, label: 'Jizō shrine tunnel', noren: 'crimson', vines: true });
    const RKP = alleyPocket(g10.s0 + 18.4, g10.s0 + 24.8, { d: -4.2, topY: 3.0, label: 'mossy kura roji' });
    const RK_TR = trellis(g10.s0 + 18.2, g10.s0 + 24.6, 4.45, -0.6, 'ivy', 'Rokkaku ivy bridge');
    const RK_K = kura(g10.s0 + 25.2, g10.s0 + 31.4, 4.45, 5.45, 'brocade kura');
    const P3 = rope(g10.s0 + 31.2, g10.s0 + 35.8, 4.85, -0.9, 'laundry');
    const RK2 = house(g10.s0 + 35.6, g10.s0 + 42.4, {
      storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'obi dyer',
      deck: { s0: g10.s0 + 36.2, s1: g10.s0 + 41.8, y: 4.85 }
    });
    villager(g10.s0 + 38.8, 4.85, -1.6, 'laundry');
    const RK3 = house(g10.s0 + 43.0, g10.s1 - 2.8, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'Muromachi corner shop', noren: 'indigo', lanterns: true });
    const K10 = corner(10, 4.15, 'Muromachi festival corner');

    route(
      YN1.plats.deck, YNT1.plats.ridge, YTR1, YN2.plats.deck, UP4.high, YNT2.plats.ridge, YN3.plats.deck, YN4.plats.ridge, K8,
      M1.plats.deck, P1, W1, M2.plats.deck, M2.plats.futon, K_TALL.plats.left, K_TALL.plats.right,
      M3.plats.deck, CH1, P2, M4.plats.deck, M4.plats.futon, W2, M5.plats.deck, CH2,
      M6.plats.ridge, UP5.high, M7.plats.ridge, M8.plats.eave, M8.plats.ridge, K9,
      RK1.plats.ridge, RKT.plats.ridge, RK_TR, RK_K.plats.left, RK_K.plats.right, P3, RK2.plats.deck, RK3.plats.ridge, K10
    );

    shoki(5, (K_TALL.plats.left.s0 + K_TALL.plats.right.s1) / 2, 7.8, K_TALL.plats.left.d, 0.2);
    treat(10, (W1.s0 + W1.s1) / 2, W1.y0, W1.d, 'a saucer of cool well-water atop the rooftop cedar cistern');
    treat(11, (RKT.plats.shelf.s0 + RKT.plats.shelf.s1) / 2, RKT.plats.shelf.y0, RKT.plats.shelf.d, 'a little offering rice-ball beside the tunnel Jizō');

    for (let s = g8.s0 + 4; s < C[10].s0 - 3; s += 5.6) {
      perch(s, 4.8 + (Math.floor(s) % 2) * 0.6, -1.2, {
        mood: (Math.floor(s) % 3 === 0) ? 'saunter' : 'beckon'
      });
    }
    perch(g8.s0 + 21.0, 1.88, -4.45, { mood: 'mischief', detour: true, note: 'alley' });
    perch(g9.s0 + 11.6, 1.62, 1.55, { mood: 'mischief', detour: true, note: 'futon' });
    perch(g10.s0 + 14.2, 1.32, -1.15, { mood: 'mischief', detour: true, note: 'tunnel' });
    perch((C[10].s0 + C[10].s1) / 2, 4.15, 0, { mood: 'beckon' });
  }

  /* ======================================================================== */
  /*  ⑥ Hoko-chō — Yoiyama Street Fair & Festival Maze (Legs 11, 12, 13)      */
  /* ======================================================================== */
  {
    const g11 = legs[11], g12 = legs[12], g13 = legs[13];
    checkpoint(6, (C[10].s0 + C[10].s1) / 2, 4.15);

    // --- Leg 11 (108 m North): Muromachi Yoiyama Street Fair! ---
    street(C[10].s0, C[11].s0, 2.2, 'cobble');
    streetProps(g11.s0 + 3.4, g11.s1 - 3.6, 8.6, 1.95);
    const H_M1 = house(g11.s0 + 3.0, g11.s0 + 10.4, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'byōbu merchant house', noren: 'crimson', lanterns: true, byobu: true });
    yatai(g11.s0 + 3.2, g11.s0 + 6.2, 1.9, 2.35, 'yakitori');
    villager(g11.s0 + 4.7, 0, 1.65, 'stallkeeper', { fare: 'yakitori' });
    yatai(g11.s0 + 6.8, g11.s0 + 9.8, 2.04, 1.48, 'hiyashi-ame');
    villager(g11.s0 + 8.3, 0, 0.85, 'stallkeeper', { fare: 'hiyashi-ame' });

    const H_M2 = house(g11.s0 + 11.2, g11.s0 + 18.4, { eave: 2.1, ridge: 3.0, label: 'fan & lantern shop', noren: 'indigo', lanterns: true });
    const MR1 = rack(g11.s0 + 12.2, g11.s0 + 15.8, 1.6, 3.35);
    yatai(g11.s0 + 13.4, g11.s0 + 16.4, 1.88, 2.35, 'kingyo-sukui');
    villager(g11.s0 + 14.9, 0, 1.65, 'stallkeeper', { fare: 'kingyo-sukui' });
    villager(g11.s0 + 15.6, 0, 2.85, 'festivalgoer');

    const ML1 = rope(g11.s0 + 14.4, g11.s0 + 19.6, 3.15, 1.35, 'lanterns');
    const H_M3 = house(g11.s0 + 19.2, g11.s0 + 27.6, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'folding-screen chaya', noren: 'hemp', lanterns: true, byobu: true });
    yatai(g11.s0 + 19.8, g11.s0 + 22.8, 2.02, 1.5, 'kakigori');
    villager(g11.s0 + 21.3, 0, 0.85, 'stallkeeper', { fare: 'kakigori' });
    yatai(g11.s0 + 23.6, g11.s0 + 26.6, 1.92, 2.35, 'takoyaki');
    villager(g11.s0 + 25.1, 0, 1.65, 'stallkeeper', { fare: 'takoyaki' });

    // Neighborhood Kakiyama (carried pine mountain float) parked mid-fair!
    const YAMA = yamaFloat(g11.s0 + 28.0, g11.s0 + 33.2, 2.75, 4.65, 1.15);
    const ML2 = rope(g11.s0 + 31.2, g11.s0 + 35.4, 4.35, 0.85, 'lanterns');

    const H_M4 = house(g11.s0 + 35.0, g11.s0 + 42.8, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'kimono guild house', noren: 'indigo', lanterns: true, byobu: true });
    yatai(g11.s0 + 35.6, g11.s0 + 38.6, 1.9, 2.35, 'ringo-ame');
    yatai(g11.s0 + 39.4, g11.s0 + 42.4, 2.05, 1.48, 'wind chimes');
    villager(g11.s0 + 40.9, 0, 0.85, 'stallkeeper', { fare: 'wind chimes' });
    villager(g11.s0 + 37.2, 0, 2.85, 'festivalgoer');

    // Festival side-alley tunnel with glowing chōchin ceiling:
    const H_MT = zushiTunnel(g11.s0 + 43.6, g11.s0 + 51.4, { tunnelH: 2.15, hisashi: 2.45, eave: 3.65, ridge: 4.45, label: 'Matsuri kaisho tunnel', noren: 'crimson' });
    const H_M5 = house(g11.s0 + 52.2, g11.s0 + 60.0, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'sake merchant', noren: 'crimson', lanterns: true });
    komodaru(g11.s0 + 53.6, 1.05, 1.95);
    yatai(g11.s0 + 55.4, g11.s0 + 58.4, 1.92, 2.35, 'yakisoba');
    villager(g11.s0 + 56.9, 0, 1.65, 'stallkeeper', { fare: 'yakisoba' });

    const UP6 = utilityPole(g11.s0 + 61.0, 1.65, 3.45, 4.45, 8.4);
    const H_M6 = house(g11.s0 + 62.0, g11.s0 + 70.0, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'silk wholesaler', noren: 'hemp', lanterns: true, byobu: true });
    yatai(g11.s0 + 63.4, g11.s0 + 66.4, 2.04, 1.5, 'sweet ayu');
    const MR2 = rack(g11.s0 + 70.8, g11.s0 + 74.6, 1.6, 3.5);
    const ML3 = rope(g11.s0 + 73.2, g11.s0 + 77.2, 3.45, 1.25, 'lanterns');
    const H_M7 = house(g11.s0 + 76.8, g11.s0 + 85.0, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'drum guild machiya', noren: 'indigo', lanterns: true });
    yatai(g11.s0 + 78.2, g11.s0 + 81.2, 1.9, 2.35, 'cotton candy');
    villager(g11.s0 + 82.4, 0, 2.75, 'festivalgoer');
    const H_MK = kura(g11.s0 + 85.8, g11.s0 + 92.0, 4.35, 5.3, 'float treasure kura');
    const H_M8 = house(g11.s0 + 92.8, g11.s1 - 2.8, { storeys: 2, eave: 3.65, ridge: 4.45, hisashi: 2.35, label: 'corner chaya', noren: 'crimson', lanterns: true });
    barrel(g11.s0 + 89.0, 2.05);
    inuyarai(g11.s0 + 94.0, g11.s0 + 95.6, 0.5);
    const K11 = corner(11, 4.2, 'Shinmachi lantern corner');

    // --- Leg 12 (56 m West): Shinmachi Lantern Canyon ---
    street(C[11].s0, C[12].s0, 2.2, 'cobble');
    streetProps(g12.s0 + 3.2, g12.s1 - 3.5, 8.8, 1.95);
    const HS1 = house(g12.s0 + 2.8, g12.s0 + 10.4, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'Shinmachi tapestry house', noren: 'indigo', lanterns: true, byobu: true });
    const HSR1 = rack(g12.s0 + 11.2, g12.s0 + 15.0, 1.6, 3.55);
    const HSL1 = rope(g12.s0 + 13.6, g12.s0 + 17.8, 3.45, 1.25, 'lanterns');
    yatai(g12.s0 + 14.0, g12.s0 + 17.0, 1.9, 2.35, 'taiyaki');
    villager(g12.s0 + 15.5, 0, 1.65, 'stallkeeper', { fare: 'taiyaki' });
    const HS2 = house(g12.s0 + 17.4, g12.s0 + 25.4, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'lantern-painter house', noren: 'crimson', lanterns: true });
    const HSTR = trellis(g12.s0 + 25.8, g12.s0 + 31.2, 4.35, 0.45, 'wisteria', 'festival lantern trellis');
    yatai(g12.s0 + 26.8, g12.s0 + 29.8, 1.94, 2.35, 'matcha');
    const HS3 = house(g12.s0 + 31.6, g12.s0 + 39.6, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'flute-maker house', noren: 'hemp', lanterns: true, byobu: true });
    const HS4 = house(g12.s0 + 40.4, g12.s1 - 2.8, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'procession corner house', noren: 'indigo', lanterns: true });
    const K12 = corner(12, 4.05, 'Yamahoko turn deck');

    // --- Leg 13 (120 m South): Grand Yamahoko Avenue & Okuribi Float Finale! ---
    street(C[12].s0, rail.length, 2.2, 'cobble');
    streetProps(g13.s0 + 3.4, g13.s0 + 62.0, 8.6, 1.95);
    const HA0 = house(g13.s0 + 2.8, g13.s0 + 10.6, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'procession merchant', noren: 'crimson', lanterns: true, byobu: true });
    yatai(g13.s0 + 3.6, g13.s0 + 6.6, 1.9, 2.35, 'yakitori');
    yatai(g13.s0 + 7.4, g13.s0 + 10.4, 2.04, 1.48, 'ramune');
    villager(g13.s0 + 8.9, 0, 0.85, 'stallkeeper', { fare: 'ramune' });

    const HA1 = zushiTunnel(g13.s0 + 11.4, g13.s0 + 19.2, { tunnelH: 2.15, hisashi: 2.45, eave: 3.6, ridge: 4.4, label: 'chōnaikai courtyard zushi', noren: 'indigo' });
    const HAP = alleyPocket(g13.s0 + 19.6, g13.s0 + 25.8, { d: -4.1, topY: 2.9, label: 'wheelwright yard' });
    const HATR = trellis(g13.s0 + 19.4, g13.s0 + 25.6, 4.35, -0.5, 'wisteria', 'chōnaikai lantern arbor');

    const HA2 = house(g13.s0 + 26.0, g13.s0 + 34.0, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'gilded-screen machiya', noren: 'hemp', lanterns: true, byobu: true });
    yatai(g13.s0 + 27.2, g13.s0 + 30.2, 1.88, 2.35, 'dango');
    villager(g13.s0 + 28.7, 0, 1.65, 'stallkeeper', { fare: 'dango' });
    villager(g13.s0 + 31.4, 0, 2.8, 'festivalgoer');

    const UP7 = utilityPole(g13.s0 + 35.0, 1.65, 3.45, 4.45, 8.0);
    const HA3 = house(g13.s0 + 36.0, g13.s0 + 44.0, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'brocade merchant', noren: 'crimson', lanterns: true });
    yatai(g13.s0 + 37.6, g13.s0 + 40.6, 2.06, 1.52, 'okonomiyaki');
    villager(g13.s0 + 39.1, 0, 0.85, 'stallkeeper', { fare: 'okonomiyaki' });

    const HA4 = house(g13.s0 + 44.8, g13.s0 + 51.4, { eave: 2.15, ridge: 3.05, label: 'chōchin shop', noren: 'hemp', lanterns: true });
    const HR1 = rack(g13.s0 + 46.0, g13.s0 + 49.8, 1.6, 3.35);
    const HL1 = rope(g13.s0 + 48.4, g13.s0 + 52.4, 3.15, 1.35, 'lanterns');
    yatai(g13.s0 + 50.0, g13.s0 + 53.0, 1.88, 2.28, 'festival masks');
    villager(g13.s0 + 51.5, 0, 1.6, 'stallkeeper', { fare: 'festival masks' });

    // Kaisho boarding house & second-floor corridor plank to the Grand Hoko Float!
    const H_KAISHO = house(g13.s0 + 52.0, g13.s0 + 59.6, {
      storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'Hoko kaisho',
      noren: 'indigo', kaisho: true, lanterns: true, byobu: true
    });
    yatai(g13.s0 + 54.0, g13.s0 + 57.0, 2.08, 1.55, 'candied chestnuts');
    const plankS0 = g13.s0 + 59.1, floatS0 = g13.s0 + 64.2, floatS1 = floatS0 + 6.0;
    const plank = plat({ s0: plankS0, s1: floatS0, y: 3.3, d: 1.0, kind: 'deck', label: 'kaisho boarding plank' });
    piece({ type: 'deck', style: 'plank', s0: plankS0, s1: floatS0, y: 3.3, d: 1.0, plat: plank.id });
    const HR2 = rack(plankS0 + 1.2, floatS0 - 0.5, 1.6, 3.55);
    const HL2 = rope(floatS0 - 1.8, floatS0 + 0.2, 3.42, 1.35, 'lanterns');
    yatai(plankS0 - 0.4, plankS0 + 2.5, 1.9, 2.35, 'sweet ame');

    /* ================= ⑦ Okuribi — the Grand Hoko Float & Fires ================= */
    const fd = 1.0;
    const fDeck = plat({ s0: floatS0, s1: floatS1, y: 3.6, d: fd + 0.2, kind: 'deck', label: 'float deck' });
    const fFrame = plat({ s0: floatS0 + 0.3, s1: floatS0 + 1.7, y: 4.7, d: fd, kind: 'rack', label: 'float lantern frame' });
    const fEaveL = plat({ s0: floatS0 + 0.3, s1: floatS0 + 1.9, y: 5.8, d: fd, kind: 'roof', label: 'float eave' });
    const fEaveR = plat({ s0: floatS1 - 1.9, s1: floatS1 - 0.3, y: 5.8, d: fd, kind: 'roof', label: 'float eave' });
    const fRidge = plat({ s0: floatS0 + 1.6, s1: floatS1 - 1.6, y: 6.9, d: fd - 0.2, kind: 'roof', label: 'float roof' });
    const fBar = plat({ s0: floatS0 + 2.4, s1: floatS1 - 2.4, y: 8.0, d: fd - 0.2, kind: 'branch', label: 'shingi crossbar' });
    const fPerch = plat({ s0: floatS0 + 2.7, s1: floatS1 - 2.7, y: 9.1, d: fd - 0.2, kind: 'perch', label: 'float top' });
    piece({ type: 'float', s0: floatS0, s1: floatS1, deckY: 3.6, eaveY: 5.8, ridgeY: 6.9, barY: 8.0, perchY: 9.1, d: fd });

    // Temple Sanmon gate & sujibei wall past the float (holding the 7th Shōki, plus safe climb-backs to rail end!)
    rack(floatS1 + 0.6, floatS1 + 3.8);
    const gateS0 = floatS1 + 2.2, gateS1 = gateS0 + 6.4, gateMid = (gateS0 + gateS1) / 2;
    const gate = piece({ type: 'gate', s0: gateS0, s1: gateS1, foot: 5.2, ridge: 6.6, dFront: -0.4, depth: 4, plats: {} });
    gate.plats.left = plat({ s0: gateS0 - 0.25, s1: gateMid, y0: 5.2, y1: 6.6, d: -0.8, kind: 'roof', label: 'temple gate roof' });
    gate.plats.right = plat({ s0: gateMid, s1: gateS1 + 0.25, y0: 6.6, y1: 5.2, d: -0.8, kind: 'roof', label: 'temple gate roof' });
    sides(gateS0, gateS1, 5.2, -4.4, -0.3);
    // Keep temple garden wall & climb-back props all the way to rail.length so every last metre of street has a climb-back!
    small('tsuiji', gateS1 + 0.8, rail.length - 0.6, 1.6, -0.6, 'cap', 'temple sujibei wall');
    streetProps(gateS1 + 1.5, rail.length - 1.5, 8.0, 1.9);
    // Stepping ledges from the temple wall back onto the Sanmon gate & float so the end of the avenue never soft-locks:
    for (let s = gateS1 + 3.0; s < rail.length - 3.5; s += 9.5) {
      balcony(s, Math.min(rail.length - 1.2, s + 4.4), 2.75, -0.5, 'engawa', 'temple garden porch');
    }
    willow(gateS1 + 1.8, gateS1 + 5.2, 3.95, -0.65, 'near');

    route(
      H_M1.plats.ridge, H_M2.plats.ridge, MR1[2], ML1, H_M3.plats.eave, H_M3.plats.ridge,
      YAMA.rail, YAMA.pine, ML2, H_M4.plats.ridge, H_MT.plats.ridge, H_M5.plats.ridge,
      UP6.high, H_M6.plats.ridge, MR2[2], ML3, H_M7.plats.eave, H_M7.plats.ridge, H_MK.plats.left, H_MK.plats.right, H_M8.plats.ridge, K11,
      HS1.plats.ridge, HSR1[2], HSL1, HS2.plats.eave, HS2.plats.ridge, HSTR, HS3.plats.ridge, HS4.plats.ridge, K12,
      HA0.plats.ridge, HA1.plats.ridge, HATR, HA2.plats.ridge, UP7.high, HA3.plats.ridge,
      HA4.plats.ridge, HR1[2], HL1, H_KAISHO.plats.eave, H_KAISHO.plats.ridge,
      plank, HR2[2], HL2, fDeck, fFrame, fEaveL, fRidge, fBar, fPerch
    );

    shoki(6, (H_KAISHO.plats.ridge.s0 + H_KAISHO.plats.ridge.s1) / 2, 4.4, H_KAISHO.plats.ridge.d, 0.5);
    shoki(7, gateMid, 6.6, -0.8, -0.6);
    treat(12, g11.s0 + 14.9, 1.88, 2.35, 'a festival fish-cracker beside the goldfish-scooping stall');
    treat(13, g13.s0 + 8.9, 2.04, 1.48, 'a chilled drop of sweet hiyashi-ame above the ramune yatai');
    treat(14, (HAP.fence.s0 + HAP.fence.s1) / 2, HAP.fence.y0, HAP.fence.d, 'a festival charm ribbon left in the wheelwright’s yard');
    checkpoint(7, floatS0 + 2.0, 3.6);

    for (let s = g11.s0 + 4; s < floatS0 - 2; s += 5.6) {
      perch(s, 4.1 + (Math.floor(s) % 2) * 0.4, (Math.floor(s / 6) % 2) ? 1.4 : -2.2, {
        mood: (Math.floor(s) % 3 === 1) ? 'sprint' : 'beckon'
      });
    }
    perch(g11.s0 + 14.9, 1.88, 2.35, { mood: 'mischief', detour: true, note: 'yatai' });
    perch(g11.s0 + 47.0, 1.32, -1.15, { mood: 'mischief', detour: true, note: 'tunnel' });
    perch(g13.s0 + 28.7, 1.88, 2.35, { mood: 'mischief', detour: true, note: 'yatai' });
    perch(floatS0 + 1.0, 4.7, fd, { mood: 'beckon' });
    perch(floatS0 + 3.9, 6.9, fd - 0.2, { mood: 'beckon' });

    // Sort perches in ascending s so Chidori's progression index is monotonic:
    L.perches.sort((a, b) => a.s - b.s);

    /* ---------------- mouth ranges ---------------- */
    const M = L.mouths;
    M[0].s0 = 0; M[0].s1 = legs[1].s0 + 31.0;
    M[1].s0 = M[0].s1; M[1].s1 = C[3].s0;
    M[2].s0 = C[3].s0; M[2].s1 = C[5].s0;
    M[3].s0 = C[5].s0; M[3].s1 = C[7].s0;
    M[4].s0 = C[7].s0; M[4].s1 = C[10].s0;
    M[5].s0 = C[10].s0; M[5].s1 = rail.length;
    M[6].s0 = floatS0; M[6].s1 = floatS1; M[6].minY = 6.4;
  }

  delete L._r;
  return L;
}

/** Which mouth the cat is in (the float roof counts as the seventh). */
export function mouthAt(L, s, y) {
  const last = L.mouths[6];
  if (s >= last.s0 && s <= last.s1 && y >= last.minY) return last;
  for (let i = 0; i < 6; i++) if (s >= L.mouths[i].s0 && s < L.mouths[i].s1) return L.mouths[i];
  return L.mouths[5];
}
