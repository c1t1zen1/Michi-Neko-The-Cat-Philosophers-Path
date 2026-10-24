// The Roof Road: seven "mouths" of the old city as data.
//
// buildLevel() lays every piece along the rail by arc length and returns
//   platforms  one-way surfaces in (s, y) with a visual depth d
//   walls      one-way side walls of tall buildings (block entering only)
//   pieces     what build.js turns into meshes
//   pickups    the seven Shōki and two treats
//   perches    where Chidori, the guide cat, waits
//   checkpoints, mouths
//
// Heights are game scale (a valley shop's eave is 2.1 m). Depth: +d is
// toward the camera; the façade line of a street is d = 0, the street in
// front of it +2.2, ridges about −2.5. Pure data — no three.js.
//
// The numbers are tuned to tools/rooftop_test.mjs: every route link fits
// 80 % of the running jump (no mantle), and the street always has a way back
// up within 12 m. Change a height here, run the test.

import { Rail } from './rail.js';

// Three right-angle turns, all away from the camera: the run spirals inward,
// so the camera always rides the outside of a corner.
export const RAIL_POINTS = [
  { x: 0, z: 0 }, { x: 50, z: 0 }, { x: 50, z: -114 }, { x: -76, z: -114 }, { x: -76, z: -64 }
];
export const RAIL_RADIUS = 2.5;

export const MOUTHS = [
  { id: 1, kanji: '粟田口', romaji: 'Awataguchi', title: 'the Mouth', note: 'Sanjō Ōhashi, where the Tōkaidō came in' },
  { id: 2, kanji: '先斗町', romaji: 'Pontochō', title: 'the Narrow Lane', note: 'roofs on both sides, yuka decks over the river' },
  { id: 3, kanji: '高瀬川', romaji: 'Takase', title: 'the Shallow Canal', note: 'thirty centimetres deep; the boats were hauled by hand' },
  { id: 4, kanji: '錦', romaji: 'Nishiki', title: 'the Long Canopy', note: 'the market roof, four hundred metres of it' },
  { id: 5, kanji: '物干し', romaji: 'Monohoshi', title: 'Laundry Sky', note: 'drying decks, where the sun reaches' },
  { id: 6, kanji: '鉾町', romaji: 'Hoko-chō', title: 'Festival Streets', note: 'Yoiyama: the floats stand lit in the street' },
  { id: 7, kanji: '送り火', romaji: 'Okuribi', title: 'the Sending Fires', note: 'five fires on the hills, one after another' }
];

/** Small deterministic hash for per-piece looks (never Math.random). */
export function hash1(x) {
  const s = Math.sin(x * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function buildLevel() {
  const rail = new Rail(RAIL_POINTS, RAIL_RADIUS);
  const C = rail.corners;
  const L = {
    rail,
    length: rail.length,
    platforms: [],
    walls: [],
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
    L.platforms.push(p);
    return p;
  };
  const wall = (s, y1, dir, d0, d1, y0 = 0) => L.walls.push({ s, y0, y1, dir, d0, d1 });
  const piece = (o) => { L.pieces.push(o); return o; };
  const sides = (s0, s1, top, d0, d1) => { wall(s0, top, +1, d0, d1); wall(s1, top, -1, d0, d1); };

  const street = (s0, s1, d, surface = 'cobble', y = 0) => {
    const kind = surface === 'water' ? 'water' : 'street';
    const p = plat({ s0, s1, y, d, kind, label: surface });
    piece({ type: surface === 'water' ? 'water' : 'street', s0, s1, y, d, surface, plat: p.id });
    return p;
  };

  /**
   * A machiya. Hira-iri (ridge along the street) gives an eave ledge and a
   * ridge line; tsuma-iri (gable to the street) gives two slopes. Two-storey
   * houses are tsushi-nikai with a lower eave (hisashi) over the street.
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
      look: o.look ?? hash1(s0), noren: o.noren, lanterns: !!o.lanterns, deck: null, plats: {}
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

  /** A kura storehouse: tall namako-walled box, gable to the street. */
  const kura = (s0, s1, foot, ridge, label = 'kura', dF = 0) => {
    const m = (s0 + s1) / 2;
    const pc = piece({ type: 'kura', s0, s1, foot, ridge, dFront: dF, depth: 4.5, plats: {} });
    pc.plats.left = plat({ s0: s0 - 0.25, s1: m, y0: foot, y1: ridge, d: dF - 0.6, kind: 'roof', label: label + ' roof' });
    pc.plats.right = plat({ s0: m, s1: s1 + 0.25, y0: ridge, y1: foot, d: dF - 0.6, kind: 'roof', label: label + ' roof' });
    sides(s0, s1, foot, dF - 4.5, dF + 0.1);
    return pc;
  };

  /** Corner house under a square drying deck, centred on fillet i. */
  const corner = (i, h, label) => {
    const c = C[i];
    const s0 = c.s0 - 2.6, s1 = c.s1 + 2.6;
    const p = plat({ s0, s1, y: h, d: 0, kind: 'deck', label });
    const tIn = rail.tangentAt(c.s0 - 0.01), tOut = rail.tangentAt(c.s1 + 0.01);
    piece({ type: 'corner', s0, s1, cx: c.c.x, cz: c.c.z, tIn, tOut, half: 2.8, deckHalf: 2.9, h, eave: h - 1.25, plat: p.id });
    return p;
  };

  const small = (type, s0, s1, y, d, kind = 'step', label = type, extra = {}) => {
    const p = plat({ s0, s1, y0: extra.y0 ?? y, y1: y, d, kind, label });
    piece({ type, s0, s1, y, y0: extra.y0 ?? y, d, plat: p.id, ...extra });
    return p;
  };
  const barrel = (s, d = 2.0) => small('barrel', s - 0.3, s + 0.3, 0.8, d, 'step', 'barrel');
  const komayose = (s0, s1, d = 1.8) => small('komayose', s0, s1, 1.0, d, 'step', 'komayose fence');
  // The bamboo guard curves in depth, so from the side it is a 0.9 m hop.
  const inuyarai = (s0, s1, d = 0.45) => small('inuyarai', s0, s1, 0.9, d, 'step', 'inuyarai');
  const toro = (s, d = 2.4) => small('toro', s - 0.2, s + 0.2, 1.45, d, 'cap', 'stone lantern');
  const crate = (s0, s1, y, d = 2.0) => small('crate', s0, s1, y, d, 'step', 'crates');

  const rope = (s0, s1, y, d, style) => {
    const p = plat({ s0, s1, y, d, kind: 'rope', label: style === 'laundry' ? 'laundry pole' : 'lantern line' });
    piece({ type: 'rope', s0, s1, y, d, style, plat: p.id });
    return p;
  };

  const rack = (s0, s1, d = 1.6) => {
    const w = s1 - s0;
    const tiers = [
      plat({ s0, s1, y: 1.0, d, kind: 'rack', label: 'lantern rack' }),
      plat({ s0: s0 + w / 6, s1: s1 - w / 6, y: 1.9, d, kind: 'rack', label: 'lantern rack' }),
      plat({ s0: s0 + w / 3, s1: s1 - w / 3, y: 2.8, d, kind: 'rack', label: 'lantern rack' })
    ];
    piece({ type: 'rack', s0, s1, d, tiers: tiers.map((t) => ({ s0: t.s0, s1: t.s1, y: t.y0 })) });
    return tiers;
  };

  const shoki = (id, s, y, d, face = 0) => L.pickups.push({ id, kind: 'shoki', s, y, d, face });
  const treat = (id, s, y, d, label) => L.pickups.push({ id, kind: 'treat', s, y, d, label });
  const perch = (s, y, d) => L.perches.push({ s, y, d });
  const checkpoint = (mouth, s, y) => L.checkpoints.push({ mouth, s, y });
  const route = (...ps) => ps.forEach((p) => { p.route = L._r = (L._r ?? -1) + 1; });

  /* ================= ① Awataguchi — the Mouth ================= */

  street(0, 9.6, 2.2, 'gravel', -0.6);                    // the Kamo riverbed under the bridge
  small('steps', 9.6, 10.4, -0.3, 2.2, 'street', 'river steps');
  street(10.4, C[0].s0, 2.2, 'cobble');

  const deck = plat({ s0: 0, s1: 11.0, y: 1.1, d: 0, kind: 'deck', label: 'bridge deck' });
  deck.start = true;
  const ramp = plat({ s0: 11.0, s1: 13.4, y0: 1.1, y1: 0.05, d: 0, kind: 'deck', label: 'bridge ramp' });
  const capS = [1.8, 4.3, 6.8, 9.3];
  const caps = capS.map((s, i) => plat({ s0: s - 0.18, s1: s + 0.18, y: 1.95, d: 1.25, kind: 'cap', label: 'giboshi ' + (i + 1) }));
  piece({ type: 'bridge', s0: 0, s1: 13.4, deckY: 1.1, caps: capS, capY: 1.95, plats: [deck.id, ramp.id] });

  const kido = small('kido', 11.5, 13.9, 2.45, 0.6, 'roof', 'kido gate');
  const A1 = house(14.8, 20.4, { eave: 2.1, ridge: 3.0, label: 'shop', noren: 'indigo', lanterns: true });
  barrel(21.0);
  const A2 = house(21.6, 27.0, { style: 'tsuma', eave: 2.2, ridge: 3.3, label: 'gable house', noren: 'hemp' });
  piece({ type: 'roji', s0: 27.25, s1: 28.6, d: 0 });
  const A3 = house(28.6, 34.2, { eave: 2.0, ridge: 2.9, label: 'shop', noren: 'crimson' });
  inuyarai(29.4, 30.9);
  const A4 = house(34.6, 40.6, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'tsushi-nikai', noren: 'indigo' });
  komayose(35.0, 36.6);
  const A5 = house(40.9, 44.5, { eave: 2.1, ridge: 3.0, label: 'shop', noren: 'hemp' });
  const K1 = corner(0, 3.4, 'corner deck');

  route(deck, caps[0], caps[1], caps[2], caps[3], kido, A1.plats.ridge, A2.plats.left, A2.plats.right,
    A3.plats.ridge, A4.plats.eave, A4.plats.ridge, A5.plats.ridge, K1);
  shoki(1, 18.2, 2.1, A1.plats.eave.d + 0.15, 0.4);
  checkpoint(1, 1.0, 1.1);
  checkpoint(2, (C[0].s0 + C[0].s1) / 2, 3.4);
  perch(12.7, 2.45, 0.6); perch(24.3, 3.3, -0.6); perch(37.6, 4.4, -2.5); perch((C[0].s0 + C[0].s1) / 2, 3.4, 0);

  /* ================= ② Pontochō — the Narrow Lane ================= */
  // Camera over the Kamo: the river-side row is near (yuka decks in front of
  // it), the alley behind it, the far row behind that.

  street(C[0].s0, 122.0, 4.0, 'bank');
  const nearRow = [[54.4, 62.15], [65.45, 75.15], [78.85, 88.15], [92.25, 101.15], [104.85, 111.15]];
  const farRow = [[59.8, 67.4], [73.0, 81.2], [86.0, 94.2], [99.2, 107.0]];
  const N = nearRow.map(([a, b], i) => house(a, b, { eave: 2.45, ridge: 3.2, label: 'river-side house', noren: i % 2 ? 'crimson' : 'indigo', lanterns: true }));
  const F = farRow.map(([a, b]) => house(a, b, { storeys: 2, eave: 3.7, ridge: 4.5, hisashi: 3.0, dFront: -4.4, depth: 5, row: 'far', label: 'alley house' }));
  // Gardens and roji in the near row's gaps; lantern lines over two of them.
  for (let i = 0; i + 1 < nearRow.length; i++) piece({ type: 'tsuboniwa', s0: nearRow[i][1], s1: nearRow[i + 1][0], d: -1.5 });
  const R1 = rope(75.0, 79.0, 3.3, -3.9, 'lanterns');
  const R2 = rope(101.0, 105.0, 3.3, -3.9, 'lanterns');
  // The low road: yuka decks over the riverbank, lanterns on posts.
  const yuka = [[56.0, 63.0], [63.6, 70.4], [71.0, 78.0], [78.6, 86.0], [86.6, 94.0], [94.6, 102.0], [102.6, 110.0]]
    .map(([a, b]) => { const p = plat({ s0: a, s1: b, y: 1.4, d: 2.4, kind: 'deck', label: 'yuka deck' }); piece({ type: 'deck', style: 'yuka', s0: a, s1: b, y: 1.4, d: 2.4, plat: p.id }); return p; });
  for (const s of [60.0, 74.5, 89.5, 108.6]) small('post', s - 0.15, s + 0.15, 2.0, 2.7, 'cap', 'lantern post');
  const KA = kura(111.8, 116.0, 3.7, 4.6, 'kura');
  const KB = kura(116.8, 121.2, 4.5, 5.4, 'kura');

  route(N[0].plats.ridge, F[0].plats.eave, N[1].plats.ridge, R1, N[2].plats.ridge, F[2].plats.eave,
    N[3].plats.ridge, R2, N[4].plats.ridge, KA.plats.left, KA.plats.right, KB.plats.left, KB.plats.right);
  shoki(2, 90.0, 4.5, F[2].plats.ridge.d, -0.5);
  treat(1, 97.0, 1.4, 2.4, 'a dried sardine (niboshi) left on a yuka deck');
  perch(63.6, 3.7, F[0].plats.eave.d); perch(77.0, 3.3, -3.9); perch(96.0, 3.2, -2.5);
  perch(113.9, 4.6, -0.6); perch(119.0, 5.4, -0.6);

  /* ================= ③ Takase — the Shallow Canal ================= */

  street(122.0, 128.6, 3.0, 'cobble');
  street(128.6, 149.0, 3.0, 'water', -0.25);
  street(149.0, C[1].s1, 3.0, 'cobble');
  const T1 = house(122.2, 128.0, { eave: 2.1, ridge: 3.0, label: 'Kiyamachi house', noren: 'hemp' });
  inuyarai(123.0, 124.4);
  const boat = plat({ s0: 129.0, s1: 131.6, y: 1.3, d: 2.6, kind: 'boat', label: 'takasebune', move: { amp: 15.6, period: 16, phase: 0 } });
  piece({ type: 'boat', plat: boat.id, len: 2.6, y: 1.3, d: 2.6, s0: 129.0, s1: 147.2 });
  const boughs = [[131.6, 133.6, 2.7], [137.0, 139.0, 2.9], [142.4, 144.4, 2.7]].map(([a, b, y]) => {
    const p = plat({ s0: a, s1: b, y, d: 1.6, kind: 'branch', label: 'cherry bough' });
    piece({ type: 'cherry', s0: a - 1.4, s1: b, bough: { s0: a, s1: b, y }, d: 1.6, plat: p.id });
    return p;
  });
  boughs.forEach((p) => { p.sprint = true; });
  const TF = house(148.6, 156.2, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'far-bank house', noren: 'crimson' });
  toro(150.4);
  const K2 = corner(1, 4.2, 'corner deck');

  route(T1.plats.ridge, boat, TF.plats.hisashi, TF.plats.eave, TF.plats.ridge, K2);
  shoki(3, 151.6, 2.3, TF.plats.hisashi.d + 0.1, 0.6);
  checkpoint(3, 124.5, 3.0);
  checkpoint(4, (C[1].s0 + C[1].s1) / 2, 4.2);
  perch(126.0, 3.0, -2.5); perch(153.0, 4.4, -2.5); perch((C[1].s0 + C[1].s1) / 2, 4.2, 0);

  /* ================= ④ Nishiki — the Long Canopy ================= */

  street(C[1].s1, 229.6, 2.2, 'market');
  const NS1 = house(167.3, 173.4, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'shop', noren: 'indigo' });
  komayose(168.0, 169.6);
  const canopySegs = [[174.0, 190.0], [191.4, 206.0], [207.4, 222.0]];
  const CN = canopySegs.map(([a, b]) => plat({ s0: a, s1: b, y: 5.0, d: 1.2, kind: 'canopy', label: 'Nishiki canopy', solid: true }));
  piece({ type: 'canopy', s0: 174.0, s1: 222.0, y: 5.0, d: 1.2, gaps: [[190.0, 191.4], [206.0, 207.4]] });
  for (const [a, b] of [[181.5, 182.2], [197.5, 198.2], [213.5, 214.2]]) {
    small('vent', a, b, 5.42, 1.2, 'roof', 'canopy vent');
    sides(a, b, 5.42, 0.2, 2.2);
  }
  // Under each skylight: a shop stack up from the market (crates → hisashi → eave → ridge).
  for (const g of [190.0, 206.0]) {
    crate(g - 0.4, g + 0.4, 1.1);
    const sh = house(g - 2.0, g + 2.6, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'market shop', noren: 'hemp' });
    sh.covered = true;
  }
  piece({ type: 'shopfronts', s0: 174.0, s1: 222.0, d: 0 });
  const NS2 = house(222.6, 229.2, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'fishmonger', noren: 'indigo', deck: { s0: 223.4, s1: 228.4, y: 5.0 } });
  komayose(223.0, 224.6);

  route(NS1.plats.ridge, CN[0], CN[1], CN[2], NS2.plats.deck);
  shoki(4, 224.2, 2.3, NS2.plats.hisashi.d + 0.1, -0.3);
  treat(2, 225.6, 5.0, NS2.plats.deck.d, 'a sliver of grilled fish, set out on purpose');
  checkpoint(5, 232.0, 5.0);                              // on the first drying deck of ⑤
  perch(170.5, 4.4, -2.5); perch(186.0, 5.0, 1.2); perch(202.0, 5.0, 1.2); perch(218.0, 5.0, 1.2); perch(226.5, 5.0, NS2.plats.deck.d);

  /* ================= ⑤ Monohoshi — Laundry Sky ================= */

  street(229.6, C[2].s1, 2.2, 'cobble');
  const M1 = house(229.8, 236.0, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'drying-deck house', deck: { s0: 230.4, s1: 235.4, y: 5.0 } });
  komayose(230.4, 232.0);
  piece({ type: 'tsuboniwa', s0: 236.0, s1: 240.0, d: -1.5 });
  const P1 = rope(235.4, 239.8, 5.5, -1.0, 'laundry');
  const M2 = house(240.0, 245.8, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'drying-deck house', deck: { s0: 240.4, s1: 244.2, y: 5.0, futon: [244.2, 245.4] } });
  komayose(241.0, 242.6);
  const K = kura(246.2, 251.6, 6.7, 7.8, 'tall kura');
  const M3 = house(252.6, 258.8, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'drying-deck house', deck: { s0: 253.2, s1: 258.0, y: 5.0 } });
  komayose(253.5, 255.1);
  const P2 = rope(258.0, 262.6, 5.5, -1.0, 'laundry');
  piece({ type: 'tsuboniwa', s0: 258.8, s1: 263.0, d: -1.5 });
  const M4 = house(263.0, 269.0, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'drying-deck house', deck: { s0: 263.4, s1: 268.2, y: 5.0 } });
  komayose(264.0, 265.6);
  const M5 = house(269.6, 275.2, { eave: 2.1, ridge: 3.0, label: 'shop', noren: 'crimson' });
  barrel(270.2);
  const M6 = house(275.6, 281.8, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'tsushi-nikai', noren: 'indigo' });
  komayose(276.2, 277.8);
  const K3 = corner(2, 4.0, 'corner deck');

  route(M1.plats.deck, P1, M2.plats.deck, M2.plats.futon, K.plats.left, K.plats.right, M3.plats.deck, P2,
    M4.plats.deck, M5.plats.ridge, M6.plats.eave, M6.plats.ridge, K3);
  shoki(5, 248.9, 7.8, K.plats.left.d, 0.2);
  checkpoint(6, (C[2].s0 + C[2].s1) / 2, 4.0);
  perch(237.6, 5.5, -1.0); perch(243.0, 5.0, M2.plats.deck.d); perch(248.9, 7.8, -0.6); perch(256.0, 5.0, M3.plats.deck.d);
  perch(266.0, 5.0, M4.plats.deck.d); perch(278.7, 4.4, -2.5); perch((C[2].s0 + C[2].s1) / 2, 4.0, 0);

  /* ================= ⑥ Hoko-chō — Festival Streets ================= */

  street(C[2].s1, rail.length, 2.2, 'cobble');
  const H1 = house(292.4, 298.4, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'merchant house', noren: 'crimson', lanterns: true });
  komayose(293.0, 294.6);
  const H2 = house(298.9, 304.5, { eave: 2.1, ridge: 3.0, label: 'shop', noren: 'hemp', lanterns: true });
  rack(300.0, 303.6);
  const H3 = house(305.0, 311.6, { storeys: 2, eave: 3.6, ridge: 4.4, hisashi: 2.3, label: 'kaisho', noren: 'indigo', kaisho: true, lanterns: true });
  const plank = plat({ s0: 311.6, s1: 316.0, y: 3.3, d: 1.0, kind: 'deck', label: 'kaisho plank' });
  piece({ type: 'deck', style: 'plank', s0: 311.6, s1: 316.0, y: 3.3, d: 1.0, plat: plank.id });
  rack(312.4, 315.6);

  /* ================= ⑦ Okuribi — the float and the fires ================= */

  const fd = 1.0;
  const fDeck = plat({ s0: 316.0, s1: 322.0, y: 3.6, d: fd + 0.2, kind: 'deck', label: 'float deck' });
  const fFrame = plat({ s0: 316.3, s1: 317.7, y: 4.7, d: fd, kind: 'rack', label: 'float lantern frame' });
  const fEaveL = plat({ s0: 316.3, s1: 317.9, y: 5.8, d: fd, kind: 'roof', label: 'float eave' });
  const fEaveR = plat({ s0: 320.1, s1: 321.7, y: 5.8, d: fd, kind: 'roof', label: 'float eave' });
  const fRidge = plat({ s0: 317.6, s1: 320.4, y: 6.9, d: fd - 0.2, kind: 'roof', label: 'float roof' });
  const fBar = plat({ s0: 318.4, s1: 319.6, y: 8.0, d: fd - 0.2, kind: 'branch', label: 'shingi crossbar' });
  const fPerch = plat({ s0: 318.7, s1: 319.3, y: 9.1, d: fd - 0.2, kind: 'perch', label: 'float top' });
  piece({ type: 'float', s0: 316.0, s1: 322.0, deckY: 3.6, eaveY: 5.8, ridgeY: 6.9, barY: 8.0, perchY: 9.1, d: fd });
  rack(322.6, 325.8);
  const gate = piece({ type: 'gate', s0: 324.2, s1: 330.6, foot: 5.2, ridge: 6.6, dFront: -0.4, depth: 4, plats: {} });
  gate.plats.left = plat({ s0: 323.95, s1: 327.4, y0: 5.2, y1: 6.6, d: -0.8, kind: 'roof', label: 'temple gate roof' });
  gate.plats.right = plat({ s0: 327.4, s1: 330.85, y0: 6.6, y1: 5.2, d: -0.8, kind: 'roof', label: 'temple gate roof' });
  sides(324.2, 330.6, 5.2, -4.4, -0.3);
  small('tsuiji', 331.4, rail.length - 0.2, 1.6, -0.6, 'cap', 'temple wall');

  route(H1.plats.ridge, H2.plats.ridge, H3.plats.eave, plank, fDeck, fFrame, fEaveL, fRidge, fBar, fPerch);
  shoki(6, 308.3, 4.4, H3.plats.ridge.d, 0.5);
  shoki(7, 327.4, 6.6, -0.8, -0.6);
  checkpoint(7, 318.0, 3.6);
  perch(295.4, 4.4, -2.5); perch(302.0, 2.8, 1.6); perch(308.3, 4.4, -2.5); perch(313.8, 3.3, 1.0);
  perch(317.0, 4.7, fd); perch(319.9, 6.9, fd - 0.2);

  /* ---------------- mouth ranges ---------------- */
  // A corner belongs to the mouth it turns into: the title card comes up as
  // the street swings round, and each mouth's lantern stands inside it.
  const M = L.mouths;
  M[0].s0 = 0; M[0].s1 = C[0].s0;
  M[1].s0 = C[0].s0; M[1].s1 = 122.0;
  M[2].s0 = 122.0; M[2].s1 = C[1].s0;
  M[3].s0 = C[1].s0; M[3].s1 = 229.6;
  M[4].s0 = 229.6; M[4].s1 = C[2].s0;
  M[5].s0 = C[2].s0; M[5].s1 = rail.length;
  M[6].s0 = 316.0; M[6].s1 = 322.0; M[6].minY = 6.4;      // the float's roof
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
