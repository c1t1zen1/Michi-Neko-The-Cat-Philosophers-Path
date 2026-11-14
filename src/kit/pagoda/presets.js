// Promoted from labs/pagoda/js/presets.js (keep in step). Kit change: the `valley`
// preset's overhang is 0.42 (lab: 0.62) so the first roof spans ~6.5 m like the classic.
// Real towers as numbers. `src` names where a number came from (see
// research.md); anything in `est` was judged from photographs for the look and
// is not a measurement. H is metres to the hōju; ratio is H ÷ first-storey
// width; top is fifth ÷ first storey width (teigen); sorin is its share of H;
// curve is Yamahata et al.'s kayaoi "ratio of curve" (corner rise ÷ eave
// length) and start where along the half-eave the curve begins (0 = centre).
export const PRESETS = [
  {
    key: 'valley', name: 'Michi’s valley', jp: '谷の塔', place: 'the game, r ≈ 57 m from the bridge', year: '2026', era: 'Game fit',
    H: 19.4, ratio: 5.1, top: 0.58, overhang: 0.42, oTaper: 0.16, sorin: 0.27, curve: 0.034, start: 0.22, sori: 1.8, flare: 0.07,
    pitch: 0.34, pitchUp: 0.2, paint: 'game', roof: 'tile', bark: false, mokoshi: false,
    src: 'Height from the shipped builder (15.7 units × 1.232); H/W₁ and teigen after Hōryū-ji; sori ×1.8 for a 57 m read.',
    est: ['top', 'overhang', 'sori'], blurb: 'The tower the valley needs: the shipped height and footprint, Hōryū-ji’s proportions, and a sori pushed a little past life so the corners still lift at 57 metres.'
  },
  {
    key: 'horyuji', name: 'Hōryū-ji', jp: '法隆寺', place: 'Ikaruga, Nara', year: 'late 7th c.', era: 'Asuka',
    H: 32.55, ratio: 5.1, top: 0.51, overhang: 0.6, oTaper: 0.17, sorin: 1 / 3.4, curve: 0.0365, start: 0.1, sori: 1, flare: 0.04,
    pitch: 0.32, pitchUp: 0.26, paint: 'ochre', roof: 'tile', mokoshi: true,
    src: 'IITK/WCEE: 32.55 m, H/W₁ 5.1, top/first 0.51, eave/body 2.2→3.0, sōrin 1:3.4. Yamahata 2008: curve 0.0365.',
    est: ['overhang'], blurb: 'The oldest wooden tower standing: the strongest taper of all (the top storey is half the first), very deep eaves, and a pent-roof skirt (mokoshi) round the ground floor.'
  },
  {
    key: 'daigoji', name: 'Daigo-ji', jp: '醍醐寺', place: 'Fushimi, Kyoto', year: '951', era: 'Heian',
    H: 38, ratio: 5.3, top: 0.56, overhang: 0.6, oTaper: 0.15, sorin: 13 / 38, curve: 0.031, start: 0.15, sori: 1, flare: 0.05,
    pitch: 0.33, pitchUp: 0.24, paint: 'faded', roof: 'tile', mokoshi: false,
    src: 'MLIT: 38 m, sōrin ≈ 13 m, oldest wooden building in Kyoto. Yamahata 2008: curve 0.0310.',
    est: ['ratio', 'top', 'overhang'], blurb: 'Kyoto’s oldest building. Its bronze sōrin is about a third of the whole height, which is why it reads as a spire from across the valley.'
  },
  {
    key: 'yasaka', name: 'Yasaka-no-tō', jp: '八坂の塔', place: 'Hōkan-ji, Higashiyama, Kyoto', year: '1440', era: 'Muromachi',
    H: 46, ratio: 5.6, top: 0.64, overhang: 0.55, oTaper: 0.12, sorin: 0.26, curve: 0.028, start: 0.32, sori: 1.15, flare: 0.05,
    pitch: 0.34, pitchUp: 0.18, paint: 'natural', roof: 'tile', mokoshi: false,
    src: 'Kyoto Travel, japan365days: 46 m, rebuilt 1440, hongawara-buki roof.',
    est: ['ratio', 'top', 'overhang', 'curve'], blurb: 'The tower over the roofs of Higashiyama, seen up the slope of Yasaka-dōri. Dark timber, white walls, and a street of tiles running to its feet.'
  },
  {
    key: 'kofukuji', name: 'Kōfuku-ji', jp: '興福寺', place: 'Nara', year: '1426', era: 'Muromachi',
    H: 50.1, ratio: 5.5, top: 0.66, overhang: 0.55, oTaper: 0.12, sorin: 0.25, curve: 0.011, start: 0.4, sori: 1, flare: 0.03,
    pitch: 0.35, pitchUp: 0.16, paint: 'natural', roof: 'tile', mokoshi: false,
    src: 'Second-tallest wooden pagoda in Japan (≈50 m). Yamahata 2008: curve 0.0110, among the flattest measured.',
    est: ['ratio', 'top', 'overhang'], blurb: 'Nara’s landmark, with the flattest eaves in the survey: the roofs read as level lines, and the height does the talking.'
  },
  {
    key: 'ruriko', name: 'Rurikō-ji', jp: '瑠璃光寺', place: 'Yamaguchi', year: '1442', era: 'Muromachi',
    H: 31.2, ratio: 5.2, top: 0.6, overhang: 0.6, oTaper: 0.14, sorin: 0.28, curve: 0.0214, start: 0.3, sori: 1, flare: 0.05,
    pitch: 0.36, pitchUp: 0.2, paint: 'natural', roof: 'bark', mokoshi: false,
    src: 'Yamaguchi City: 31.2 m, hiwada-buki (cypress bark). Yamahata 2008: curve 0.0214.',
    est: ['ratio', 'top', 'overhang'], blurb: 'Often called the most beautiful of them all: a cypress-bark roof (hiwada-buki), thick soft eaves and a lake below.'
  },
  {
    key: 'toji', name: 'Tō-ji', jp: '東寺', place: 'Minami-ku, Kyoto', year: '1644', era: 'Edo',
    H: 54.8, ratio: 54.8 / 9.48, top: 0.7, overhang: 0.48, oTaper: 0.08, sorin: 0.24, curve: 0.0209, start: 0.6, sori: 1, flare: 0.03,
    pitch: 0.36, pitchUp: 0.12, paint: 'natural', roof: 'tile', mokoshi: false,
    src: 'Tō-ji: 55 m, rebuilt 1644; first storey ≈ 9.48 m (excerpt). Yamahata 2008: curve 0.0209 (Kyōō-gokoku-ji).',
    est: ['top', 'overhang'], blurb: 'The tallest wooden tower in Japan and Kyoto’s skyline mark from the station. Edo-period: the roofs shrink little, and the corner lift starts late.'
  },
  {
    key: 'ninnaji', name: 'Ninna-ji', jp: '仁和寺', place: 'Ukyō-ku, Kyoto', year: '1644', era: 'Edo',
    H: 36.18, ratio: 5.6, top: 0.8, overhang: 0.45, oTaper: 0.05, sorin: 0.25, curve: 0.0224, start: 0.62, sori: 1, flare: 0.03,
    pitch: 0.38, pitchUp: 0.1, paint: 'natural', roof: 'tile', mokoshi: false,
    src: '36.18 m (sources give 36.2–37.1). Yamahata 2008: curve 0.0224.',
    est: ['ratio', 'top', 'overhang'], blurb: 'The Edo extreme: five roofs of almost the same size, so the tower reads as a column with fins rather than a cone.'
  },
  {
    key: 'muroji', name: 'Murō-ji', jp: '室生寺', place: 'Uda, Nara', year: 'c. 800', era: 'Heian',
    H: 16.1, ratio: 6.4, top: 0.62, overhang: 0.72, oTaper: 0.12, sorin: 0.3, curve: 0.034, start: 0.16, sori: 1.1, flare: 0.05,
    pitch: 0.3, pitchUp: 0.2, paint: 'vermilion', roof: 'bark', mokoshi: false,
    src: 'MLIT: 16.1 m, the smallest outdoor five-storey pagoda; hiwada-buki roof.',
    est: ['ratio', 'top', 'overhang', 'curve'], blurb: 'Sixteen metres among cedars: vermilion timber, white walls, bark roofs, and eaves so deep the body nearly vanishes.'
  }
];
export const byKey = (k) => PRESETS.find((p) => p.key === k) || PRESETS[0];

// Paint schemes: column/beam, wall, door, rafter end, bracket, tile tint.
export const PAINTS = {
  vermilion: { name: 'Vermilion (ni-nuri)', timber: 0xc4442c, beam: 0xc4442c, wall: 0xf0e9da, door: '#a3392a', ends: 0xf2e6c4, bracket: 0xc4442c, bracketEnd: 0xe8c56a, tile: 0x4d555b },
  faded: { name: 'Weathered vermilion', timber: 0xa64b33, beam: 0x9b4632, wall: 0xe8e0cd, door: '#7d3a28', ends: 0xe7dcc0, bracket: 0xa04a33, bracketEnd: 0xd9c08a, tile: 0x51585d },
  ochre: { name: 'Red ochre & white', timber: 0x9a5236, beam: 0x8f4c33, wall: 0xece4d2, door: '#6e3b28', ends: 0xe9dfc6, bracket: 0x93503a, bracketEnd: 0xd6bf8e, tile: 0x585e62 },
  natural: { name: 'Aged hinoki', timber: 0x4d3b2e, beam: 0x433327, wall: 0xe9e3d4, door: '#3d2e23', ends: 0xe8e0cc, bracket: 0x4f3d30, bracketEnd: 0xd8ccb2, tile: 0x4a5257 },
  game: { name: 'The game’s palette', timber: 0xc4442c, beam: 0x2b1e18, wall: 0x5a2e22, door: '#3a1e16', ends: 0xe8d9b8, bracket: 0xb8432c, bracketEnd: 0xdcb46a, tile: 0x2a3438 }
};
