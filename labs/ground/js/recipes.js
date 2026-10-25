// Recipe painters (world metres, centred on the origin, any terrain size) and
// the content of their gallery cards. `env` gives a painter its props:
// stones, rock, wall, eave, setCobble, tint.
import { vnoise } from './hash.js';

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const nz = (x, z, s, o = 0) => vnoise(x * s + o, z * s + o * 0.7) - 0.5;
const ring = (t, cx, cz, R, n = 40) => {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, b = ((i + 1.02) / n) * Math.PI * 2;
    t.rakeStroke(cx + Math.cos(a) * R, cz + Math.sin(a) * R, cx + Math.cos(b) * R, cz + Math.sin(b) * R);
  }
};
const big = (t) => t.size > 4;

const SRC = {
  mish: ['Andrey Mishkinis, Advanced Terrain Texture Splatting', 'https://www.gamedeveloper.com/programming/advanced-terrain-texture-splatting'],
  lag2: ['Sébastien Lagarde, Water drop 2b', 'https://seblagarde.wordpress.com/2013/01/03/water-drop-2b-dynamic-rain-and-its-effects/'],
  lag3: ['Sébastien Lagarde, Water drop 3b', 'https://seblagarde.wordpress.com/2013/04/14/water-drop-3b-physically-based-wet-surfaces/'],
  kyoto: ['Kyoto ni Kanpai, 石塀小路', 'https://kyotonikanpai.com/spot/02_01_gion_higashiyama/ishibekoji.php'],
  sym: ['symbios-texture, cobblestone', 'https://docs.rs/symbios-texture/latest/symbios_texture/cobblestone/index.html'],
  free: ['FreeAlphas, Large cobblestone', 'https://freealphas.com/a/large-cobblestone/'],
  nobedan: ['JAANUS, nobedan 延段', 'https://projects.mcah.columbia.edu/jaanus/record/nobedan'],
  rake: ['NAJGA, 7 Common Raking Patterns', 'https://najga.org/7-common-raking-patterns-in-japanese-dry-landscape-gardens/'],
  pull: ['NAJGA, Pulling the Rake', 'https://najga.org/pulling-the-rake-a-practical-guide-to-raking-karesansui-garden/'],
  samon: ['JAANUS, samon 砂紋', 'https://projects.mcah.columbia.edu/jaanus/record/samon'],
  tobi: ['JAANUS, tobi-ishi 飛石', 'https://projects.mcah.columbia.edu/jaanus/record/tobiishi'],
  paths: ['NAJGA, Japanese Garden Paths', 'https://najga.org/japanese-garden-paths/'],
  saiho: ['into Saihoji, What Little Moss Teaches Us', 'https://intosaihoji.com/en/journal/kosaten004-2/'],
  amao: ['JAANUS, amaochi 雨落', 'https://projects.mcah.columbia.edu/jaanus/record/amaochi'],
  hongo: ['Hongō Fujiyama Park, 雨落ち', 'https://hongofujiyama.jp/guidance/cultural-property/museum/'],
  arch: ['NAJGA, The Architectural Interface', 'https://najga.org/japanese-gardens-the-architectural-interface/'],
  shards: ['Shards of Stone, Snow that remembers where you walked', 'https://www.shardsofstone.com/blog/snow-that-remembers-where-you-walked']
};
export const SOURCES = SRC;

export const SAMPLER = {
  id: 'sampler', name: 'Sampler',
  paint(t, env) {
    const zc = (x) => 2 - (x + 6) * 0.25 + Math.sin(x * 0.45) * 0.9;
    t.setSplat((x, z) => {
      const e = nz(x, z, 3) * 0.3;
      let g = 0, m = 0.55 * (0.55 + 0.45 * (nz(x, z, 0.6, 3) + 0.5)), s = 0, c = 0;
      const dp = Math.abs(z - zc(x)) / 1.1 / 0.7, pw = 1 - sm(0.8, 1.1, dp + e);
      m *= 1 - pw;
      g += 0.55 * sm(0.75, 1.0, dp + e) * (1 - sm(1.15, 1.5, dp + e));
      const lane = 1 - sm(1.0, 1.12, Math.abs(z + 3.5) + e * 0.3);
      if (lane > 0) { s = 0.85 * lane; m = lane * 0.3 * sm(-3.6, -2.5, z) + (1 - lane) * m; g *= 1 - lane; }
      const ne = sm(1.3, 1.7, x) * sm(1.3, 1.7, z); m = m * (1 - ne) + 0.95 * ne; g *= 1 - ne;
      const bed = 1 - sm(1.4, 1.55, Math.max(Math.abs(x + 3.5), Math.abs(z - 3.5)) + e * 0.4);
      g = g * (1 - bed) + 0.95 * bed; m *= 1 - bed;
      const cb = 1 - sm(1.0, 1.2, Math.hypot(x - 4, z + 1) + e * 0.5);
      c = 0.95 * cb; g *= 1 - cb; m *= 1 - cb;
      return [g, m, s, c];
    });
    t.setHeight((x, z, h) => {
      const hollow = 0.03 * (1 - sm(0, 0.45, Math.hypot(x - 0.5, z - 0.8))), gut = Math.abs(x) < 6 ? 0.035 * (1 - sm(0, 0.07, Math.abs(z + 4.55))) : 0;
      const worn = 0.01 * (1 - sm(0.2, 0.7, Math.abs(z - zc(x))));
      return h - hollow - gut - worn;
    });
    t.rakeStroke(-4.9, 2.35, -2.1, 2.35); t.rakeStroke(-4.9, 4.65, -2.1, 4.65);
    ring(t, -3.5, 3.5, 0.95);
    env.rock(-3.5, 3.5, 0.5);
    env.stones.lay('chidorigake', { x: 2, z: 1.8 }, { x: 5, z: 5 }, 'oribe');
  }
};

export const RECIPES = [
  {
    id: 'path', name: 'Packed earth path', jp: '踏み固めた土', romaji: 'fumikatameta tsuchi', tag: 'the valley’s paths, re-dug',
    blurb: 'A foot-worn line of loam with pebbles pressed into it. The centre sits a little lower and harder, so after rain the puddles run down the middle.',
    how: ['Earth only, with gravel bleeding in at the edges through a noise-broken splat border', 'The worn centre is dug 2–3 cm, so the water finds it first', 'Prints last a long time in the wet centre'],
    use: 'The main path and its shoulders, replacing the dirt strip from buildPathShoulders().',
    sources: [SRC.mish, SRC.lag2], layers: ['earth', 'gravel', 'moss'],
    code: "const d = Math.abs(z - zc(x)) / hw;       // 0 on the centre line\ng += 0.55 * sm(0.75, 1.0, d + edge);        // gravel bleeds in at the shoulder\nh -= 0.025 * (1 - sm(0, 1, d));           // the worn centre sits 2.5 cm low",
    paint(t) {
      const hw = Math.min(0.7, t.size * 0.28), zc = (x) => Math.sin(x * 0.6) * (big(t) ? 0.9 : 0.2);
      t.setSplat((x, z) => {
        const d = Math.abs(z - zc(x)) / hw, e = nz(x, z, 3) * 0.3, mo = 0.55 * (0.55 + 0.45 * (nz(x, z, 0.7, 4) + 0.5));
        return [0.55 * sm(0.75, 1.0, d + e) * (1 - sm(1.2, 1.7, d + e)), mo * sm(0.9, 1.3, d + e), 0, 0];
      });
      t.setHeight((x, z, h) => h - 0.025 * (1 - sm(0, 1, Math.abs(z - zc(x)) / hw)));
    }
  },
  {
    id: 'ishidatami', name: 'Ishidatami lane', jp: '石畳', romaji: 'ishidatami', tag: 'Ishibe-kōji’s reused tram stones',
    blurb: 'Granite setts in running bond, sand in the joints, and moss creeping into the joints at the edge. Part of Ishibe-kōji’s paving in Gion came from Kyoto’s old city tram.',
    how: ['Setts evaluated in world space: a running-bond grid of 30 × 15 cm stones with a colour per stone from an integer hash', 'Moss painted at low weight shows only in the joints, because the stone tops stand higher in the height blend', 'A shallow gutter along one side carries the rain'],
    use: 'The village street and the walkway slabs (buildWalkwaySlabs()).',
    sources: [SRC.kyoto, SRC.mish], layers: ['setts', 'moss', 'earth', 'gravel'],
    code: "row = floor(z / 0.15);  off = (row & 1) * 0.15;   // running bond\ncol = floor((x + off) / 0.30);\ncolour = settCol(ivec2(col, row));                 // PCG2D, same in JS",
    paint(t) {
      const lz = big(t) ? -3.5 : 0, hw = big(t) ? 1.1 : 0.78;
      t.setSplat((x, z) => {
        const e = nz(x, z, 3) * 0.3, dl = Math.abs(z - lz), lane = 1 - sm(hw - 0.1, hw, dl + e * 0.3);
        const out = 0.35 * (0.5 + nz(x, z, 0.8, 5));
        const gut = 1 - sm(0.04, 0.09, Math.abs(z - (lz - hw + 0.06)));
        return [gut * 0.8 * lane, lane * 0.3 * sm(lz - 0.1, lz + hw, z) + (1 - lane) * out, 0.85 * lane * (1 - gut), 0];
      });
      t.setHeight((x, z, h) => h - 0.035 * (1 - sm(0, 0.07, Math.abs(z - (lz - hw + 0.06)))));
    }
  },
  {
    id: 'tamaishi', name: 'Tama-ishi cobbles', jp: '玉石敷', romaji: 'tama-ishi-jiki', tag: 'river stones set in earth',
    blurb: 'Round river stones packed into earth. Water stands between them after rain, and their tops dry first.',
    how: ['World-space Voronoi, where the gap between the nearest and second-nearest stone is the joint and each stone is a dome 1 − (d/r)^1.4', 'Colour from the cell hash: slate, blue-grey, ochre, pale granite', 'Near the cat each cell becomes a real pebble at the same feature point'],
    use: 'The shrine forecourt edges and the riverside path.',
    sources: [SRC.sym, SRC.free, SRC.nobedan], layers: ['cobble', 'earth'],
    code: "float d = length(vec2(g) + .5 + (h - .5) * 0.55 - f);   // feature point per cell\nmask = smoothstep(0.1, 0.16, f2 - f1);                  // joint where F2 - F1 is small\nh    = max(1. - pow(f1 / .55, 1.4), 0.);                // dome",
    paint(t) {
      const R = big(t) ? 2.5 : 0.95;
      t.setSplat((x, z) => [0, 0, 0, 0.95 * (1 - sm(R - 0.2, R + 0.1, Math.hypot(x, z) + nz(x, z, 3, 2) * 0.4))]);
      t.setHeight((x, z, h) => h - 0.012 * (nz(x, z, 2.2, 8) + 0.5));
    }
  },
  {
    id: 'samon', name: 'Raked gravel', jp: '砂紋', romaji: 'samon', tag: 'sazanami-mon and mizu-mon',
    blurb: 'Pale gravel raked into parallel ripples that curl into rings around a stone. Pick the rake on the stage and draw your own.',
    how: ['A rake texture stores each stroke’s phase and strength, and the gravel height adds a cosine ridge every 6.3 cm (a 76 cm, twelve-tooth rake)', 'The ridges catch low sun, so the pattern changes through the day', 'Rain softens the ridges over time (lower strength while wet)'],
    use: 'The shrine sandō between the mown lawns.',
    sources: [SRC.rake, SRC.pull, SRC.samon], layers: ['gravel', 'earth'],
    code: "float ph = dot(P, nn) / 0.063 + rake.r;                 // nn: stroke normal\nh += rake.g * (0.5 + 0.5 * cos(6.2831853 * ph)) * 0.6;   // ridge",
    paint(t, env) {
      const rockR = big(t) ? 0.5 : 0.2, ringR = rockR + 0.45, hx = big(t) ? 3 : 1.2, hz = big(t) ? 2 : 1.2;
      t.setSplat((x, z) => [0.95 * (1 - sm(Math.min(hx, hz) - 0.15, Math.min(hx, hz), Math.max(Math.abs(x) * hz / hx, Math.abs(z)) + nz(x, z, 3) * 0.2)) * (big(t) ? 1 : 1), 0, 0, 0]);
      if (big(t)) { t.rakeStroke(-2.9, ringR + 0.7, 2.9, ringR + 0.7); t.rakeStroke(-2.9, -ringR - 0.7, 2.9, -ringR - 0.7); }
      ring(t, 0, 0, ringR);
      env.rock(0, 0, rockR);
    }
  },
  {
    id: 'koke', name: 'Moss and stepping stones', jp: '苔と飛石', romaji: 'koke to tobi-ishi', tag: 'Rikyū’s stones over the moss',
    blurb: 'A moss carpet crossed by stepping stones in a plover zig-zag (chidorigake), 6 cm proud in Rikyū’s style. A worn earth line shows where the gardener always steps.',
    how: ['Stones are instanced slabs laid by a pattern function (chokuuchi, chidorigake, gan’uchi, sets of three), about 10 cm apart', 'Height presets: Rikyū 6 cm, Oribe 5 cm, Enshū 3 cm', 'Moss drinks the rain, darkening and deepening instead of shining'],
    use: 'The Moon Pool banks and the tea house garden.',
    sources: [SRC.tobi, SRC.paths, SRC.saiho], layers: ['moss', 'earth'],
    code: "lay('chidorigake', from, to, 'rikyu');\n// lateral offset alternates +-0.22 m, gap 0.10 m, a yaku-ishi at the end\nextraH = (x, z, g) => insideStone(x, z) ? stoneTop : g;   // the cat steps up",
    paint(t, env) {
      const a = { x: -t.size * 0.36, z: -t.size * 0.2 }, b = { x: t.size * 0.36, z: t.size * 0.2 };
      const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz);
      t.setSplat((x, z) => {
        const s = Math.min(1, Math.max(0, ((x - a.x) * dx + (z - a.z) * dz) / (L * L))), d = Math.hypot(x - a.x - dx * s, z - a.z - dz * s);
        return [0, 0.92 * (0.8 + 0.2 * (nz(x, z, 2, 6) + 0.5)) * (1 - 0.85 * (1 - sm(0.12, 0.38, d + nz(x, z, 5) * 0.12))), 0, 0];
      });
      env.stones.lay('chidorigake', a, b, 'rikyu');
    }
  },
  {
    id: 'amaochi', name: 'Amaochi', jp: '雨落ち', romaji: 'amaochi', tag: 'the drip line under the eaves',
    blurb: 'Before gutters, rain fell straight off the eaves. A strip of river pebbles, about 35 cm toward the wall and 15 cm past the drip line, keeps mud off the plaster. Make it rain and watch the drips land in a line.',
    how: ['A plaster wall and an eave edge along one side, with the pebble strip at a 7 cm cobble size', 'In rain, drops fall from the eave line and stamp splashes', 'Under the eave the packed earth stays dry'],
    use: 'Around the tea house, the residence and the village houses.',
    sources: [SRC.amao, SRC.hongo, SRC.arch], layers: ['cobble', 'earth', 'moss'],
    code: "const drip = wallZ + 0.55;                         // eave edge\nstrip = z > drip - 0.35 && z < drip + 0.15;         // 35 cm in, 15 cm out\nshelter = z < drip - 0.35 ? 1 : 0;                  // rain never reaches it",
    paint(t, env) {
      const wallZ = -t.size / 2 + (big(t) ? 0.5 : 0.2), drip = wallZ + 0.55;
      t.setSplat((x, z) => {
        const strip = (1 - sm(0.0, 0.05, z - (drip + 0.15) + nz(x, 0, 6) * 0.04)) * sm(-0.05, 0.0, z - (drip - 0.35));
        return [0, 0.3 * (0.5 + nz(x, z, 1.1, 2)) * (1 - strip) * sm(drip + 0.2, drip + 0.9, z), 0, 0.95 * strip];
      });
      t.setShelter((x, z) => (z < drip - 0.35 ? 1 : 0));
      t.setHeight((x, z, h) => h - 0.012 * sm(drip - 0.35, drip + 0.15, z) * (1 - sm(drip + 0.15, drip + 0.4, z)));
      env.setCobble(0.07);
      env.wall(wallZ, drip);
      env.eave({ x0: -t.size / 2 + 0.1, x1: t.size / 2 - 0.1, z: drip });
    }
  },
  {
    id: 'nobedan', name: 'Nobedan', jp: '延段', romaji: 'nobedan', tag: 'a paved strip of many stones',
    blurb: 'A 75 cm strip of cut and round stones fitted together through the moss. The joint pattern is called arare-koboshi, “scattered hail”.',
    how: ['Setts and cobbles mixed in one strip, with a straight cut-stone kerb', 'Joints filled with fine gravel', 'The formal end of the shin–gyō–sō path vocabulary'],
    use: 'The shrine approach, before the torii.',
    sources: [SRC.nobedan, SRC.paths], layers: ['setts', 'cobble', 'moss', 'gravel'],
    code: "const strip = 1 - sm(0.3, 0.375, Math.abs(z - zc) + edge);\nconst kerb  = Math.abs(z - zc) > 0.22;            // cut stone along both edges\nsetts  = strip * (kerb || n > 0) ? 0.9 : 0;   cobble = strip * (!kerb && n <= 0) ? 0.9 : 0;",
    paint(t) {
      const zc = (x) => Math.sin(x * 0.5) * (big(t) ? 0.5 : 0.1);
      t.setSplat((x, z) => {
        const d = Math.abs(z - zc(x)), e = nz(x, z, 3) * 0.06, strip = 1 - sm(0.3, 0.375, d + e), kerb = d > 0.22, k = sm(-0.04, 0.04, nz(x, z, 4.5, 3));
        const s = kerb ? 1 : k, c = kerb ? 0 : 1 - k;
        return [0.12 * strip, (1 - strip) * 0.85 * (0.6 + 0.4 * (nz(x, z, 0.8, 2) + 0.5)), 0.85 * strip * s, 0.85 * strip * c];
      });
    }
  },
  {
    id: 'mud', name: 'Riverbank mud', jp: '川岸の泥', romaji: 'kawagishi no doro', tag: 'silt that keeps every print',
    blurb: 'Dark silt at the waterline with a gravel bar. It never quite dries: puddles stand in it and paw prints last.',
    how: ['Earth tinted to silt, with the wetness floor raised and the water table a few centimetres higher', 'The trail buffer heals slowly here, so prints persist', 'A gravel bar where the current would drop its stones'],
    use: 'The river banks and under the bridge.',
    sources: [SRC.shards, SRC.lag3], layers: ['earth', 'gravel'],
    code: "terrain.wetFloor  = 0.8;            // never quite dry\nterrain.waterBias = 0.012;          // puddles stand a little higher\nmaterial.uTint.set(0.55, 0.5, 0.45); // earth turned to silt",
    paint(t, env) {
      env.tint([0.55, 0.5, 0.46]);
      t.wetFloor = 0.8; t.waterBias = 0.012;
      const S = t.size;
      t.setSplat((x, z) => {
        const gx = (x - S * 0.22) / (S * 0.3), gz = (z - S * 0.08) / (S * 0.16), bar = 1 - sm(0.7, 1, Math.hypot(gx, gz) + nz(x, z, 3) * 0.3);
        return [0.9 * bar, 0.12 * (nz(x, z, 1, 1) + 0.5) * (1 - bar) * (1 - sm(-S * 0.1, S * 0.3, z)), 0, 0];
      });
      t.setHeight((x, z, h) => h - 0.05 * sm(-S * 0.1, S * 0.45, z) - 0.015 * (nz(x, z, 3, 4) + 0.5));
    }
  }
];

export const recipeById = (id) => (id === 'sampler' ? SAMPLER : RECIPES.find((r) => r.id === id));
export const texReads = (r) => 2 + 4 * r.layers.filter((l) => l === 'earth' || l === 'gravel' || l === 'moss').length;
