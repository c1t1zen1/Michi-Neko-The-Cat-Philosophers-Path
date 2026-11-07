// Thirty grounds: every technique worth trying, as a recipe for a 2.4 m core
// sample. paint(field) authors the sample; defines pick the shader
// path; anim(ctx, dt, t, hover) makes weather on it; plant(stage, ui) puts
// the technique on the corner. Sources are keyed into SOURCES below.
import { PAVE } from './field.js';
import { vnoise, fbm, sstep, clamp } from './util.js';

export const FAMILIES = [
  { id: 'meet', title: 'How grounds <em>meet</em>', sub: 'The same four materials, joined five ways.' },
  { id: 'tile', title: 'Breaking the <em>tile</em>', sub: 'One gravel texture over five metres, four ways to hide that it repeats.' },
  { id: 'stone', title: 'Stone <em>underfoot</em>', sub: 'Kyoto’s pavings, from the formal to the hailstone, evaluated in world space.' },
  { id: 'loose', title: 'Loose & <em>living</em> ground', sub: 'What feet, rakes, brooms and the seasons do to it.' },
  { id: 'weather', title: 'Weather on the <em>ground</em>', sub: 'Wet, puddled, splashed, snowed on and dappled.' },
  { id: 'paint', title: 'The painted <em>finish</em>', sub: 'From photograph to painting, and the cost of each.' }
];

const OFF = { ANTI: 3, HBLEND: 1, POM: 0, WEAR: 0, WET: 0, SNOW: 0, PRINTS: 0, GROOVES: 0, MACRO: 1, FRINGE: 1, TOON: 0, EDGEINK: 0, DITHER: 0, DEBUG: 0 };
const D = (o) => ({ ...OFF, ...o });

// a four-way sampler: earth, gravel, moss, sand meeting in the middle
function quad(f, wob = 0.25) {
  f.fill((x, z) => {
    const n = (fbm(x * 1.4 + 3, z * 1.4, 3) - 0.5) * wob * 2;
    const a = sstep(-0.12, 0.12, x + n), b = sstep(-0.12, 0.12, z - n);
    return { m: { gravel: a * (1 - b), moss: (1 - a) * b, sand: a * b * 0.9 } };
  });
}
const lanePath = (f, half = 0.45, rut = true) => f.fill((x, z) => {
  const c = Math.sin(x * 1.1) * 0.25, d = Math.abs(z - c), e = (vnoise(x * 3, 5) - 0.5) * 0.18;
  const lane = 1 - sstep(half - 0.12 + e, half + 0.1 + e, d);
  return { m: { grass: 1 - lane * 0.95 } };
});
const allOf = (m) => (f) => f.fill(() => ({ m }));
const paved = (style, extra = {}) => (f) => { f.paveStyle = style; f.fill((x, z) => ({ m: { paving: 1, ...extra } })); f.style.fill(style); };

export const VARIANTS = [
  /* ---------------- how grounds meet ---------------- */
  {
    id: 'today', fam: 'meet', name: 'The game today', jp: '今', romaji: 'ima', tag: 'vertex tint + alpha strips',
    blurb: 'One tiling meadow texture tinted by vertex colour, a dirt ribbon whose edges fade by UV alpha, and a cobble ribbon on top. Cheap and honest, and every edge is a stripe.',
    how: ['countryside.js buildGround(): groundTextures(6), repeat size ÷ 3.2', 'buildPathShoulders(): 6.4 m strip, alpha = smoothstep over u', 'buildPath(): a ribbon of cobbleTextures'],
    code: `ground.material = texturedMaterial(groundTextures(6), { repeat: [w / 3.2, d / 3.2] });\nground.material.vertexColors = true;`, use: 'the baseline every other card is measured against', src: ['game'], today: true,
    plant: (s, ui) => ui.setCompare?.('game')
  },
  {
    id: 'linear', fam: 'meet', name: 'Linear splat', jp: '混', romaji: 'mazeru', tag: 'the classic RGBA weight map',
    blurb: 'Each layer’s weight from a splat map, blended linearly: THREE.Terrain, textureSplat and most forum terrains do this. The joins are soft blurs: stones look “evenly soiled by sand”.',
    how: ['One RGBA splat texture: four weights, earth is the remainder', 'Sample each layer, multiply by its weight, add'],
    code: `col = earth * (1. - a.r - a.g - a.b) + gravel * a.r + moss * a.g + sand * a.b;`, use: 'far ground, where nobody looks closely', src: ['ice', 't5069', 'mish'], defines: D({ HBLEND: 0 }), paint: quad,
    plant: (s) => s.setDefines({ HBLEND: 0 })
  },
  {
    id: 'height', fam: 'meet', name: 'Height blend', jp: '高', romaji: 'takasa', tag: 'Mishkinis’s depth window',
    blurb: 'Add each weight to its layer’s height and keep only what lies within a narrow window of the top. Sand drops into the gaps between pebbles first, moss climbs into the joints, stone tops stay clean.',
    how: ['Height lives in each painted tile’s alpha', 'ma = max(h + w) − depth; b = max(h + w − ma, 0)', 'depth 0.2 here; 0 would be a hard cut'],
    code: `float ma = max(h1 + a1, h2 + a2) - depth;\nfloat b1 = max(h1 + a1 - ma, 0.), b2 = max(h2 + a2 - ma, 0.);\ncol = (c1 * b1 + c2 * b2) / (b1 + b2);`, use: 'everything near the cat', src: ['mish', 'atvi'], defines: D({}), paint: quad,
    plant: (s) => s.setDefines({ HBLEND: 1 })
  },
  {
    id: 'dither', fam: 'meet', name: 'Threshold edge', jp: '際', romaji: 'kiwa', tag: 'stylised, from an SDF path mask',
    blurb: 'No blend at all: each layer is in or out against its own noise, so edges are ragged and crisp. The look of a painted path mask with edge noise (dedekpo’s stylised scene); good from far away, busy up close.',
    how: ['w = smoothstep(n − ε, n + ε, w) per layer', 'noise frequency sets the raggedness'],
    code: `float th = vn(p * 11. + float(i) * 7.1) * .7 + .15;\nw[i] = smoothstep(th - .015, th + .015, w[i]);`, use: 'a toon or flat-shaded valley', src: ['stylized'], defines: D({ DITHER: 1, HBLEND: 0 }), paint: quad,
    plant: (s) => s.setDefines({ DITHER: 1 })
  },
  {
    id: 'ink', fam: 'meet', name: 'Painted edge', jp: '縁', romaji: 'fuchi', tag: 'pigment pools where layers meet',
    blurb: 'Where two layers share the pixel, darken a little, the way watercolour pools along a wash’s edge. With the height blend under it, the gravel reads as set into the earth instead of lying on it.',
    how: ['edge = 1 − max(normalised blend weight)', 'darken by up to 35 % across the join'],
    code: `float mx = 0.; for (...) mx = max(mx, b[i] / bs);\ncol *= 1. - .35 * smoothstep(.3, .62, 1. - mx);`, use: 'the painted finish, at cat-eye distance', src: ['oga', 'heckel'], defines: D({ EDGEINK: 1 }), paint: quad,
    plant: (s) => s.setDefines({ EDGEINK: 1 })
  },

  /* ---------------- breaking the tile ---------------- */
  {
    id: 'repeat', fam: 'tile', name: 'Plain repeat', jp: '繰', romaji: 'kurikaeshi', tag: 'one tap, and a grid',
    blurb: 'The painted gravel tile, repeated. The red grid marks each 0.75 m tile; the eye finds the same three pebbles every tile within seconds.',
    how: ['uv = p / tile; one textureGrad'], code: `a = textureGrad(uAlb, vec3(p / tile, L), dx, dy);`,
    use: 'nothing near the camera', src: ['iq'], size: 5, defines: D({ ANTI: 0, MACRO: 0, DEBUG: 3 }), paint: allOf({ gravel: 1 }), cam: { dist: 6.5, el: 0.85 },
    plant: (s) => s.setDefines({ ANTI: 0 })
  },
  {
    id: 'quilez1', fam: 'tile', name: 'Per-tile offset', jp: '散', romaji: 'chirasu', tag: 'Quilez, technique 1 (4 taps)',
    blurb: 'Every tile gets a random offset and mirror; four samples are blended across tile borders. The repetition goes, at four texture reads per layer and some blur along the seams.',
    how: ['hash the integer tile → offset + sign', 'blend 2 × 2 neighbours with smoothstep(.25, .75, fract(uv))'],
    code: `vec2 o = hash2i(c), m = sign(hash2i(c + 5) - .5);\nA[k] = textureGrad(uAlb, vec3(uv * m + o, L), dx * m, dy * m);`, use: 'large flat areas', src: ['iq'], size: 5, defines: D({ ANTI: 1, MACRO: 0 }), paint: allOf({ gravel: 1 }), cam: { dist: 6.5, el: 0.85 },
    plant: (s) => s.setDefines({ ANTI: 1 })
  },
  {
    id: 'quilez2', fam: 'tile', name: 'Noise index', jp: '揺', romaji: 'yuragi', tag: 'Quilez, technique 3 (2 taps)',
    blurb: 'A slow noise picks one of eight offsets; two samples cross-fade between neighbouring indices. The cheapest fix: two reads, no seams, only a soft blend where the index changes.',
    how: ['k = noise(p) × 8; offsets sin(vec2(3, 7) × floor(k))', 'mix the two by fract(k), biased by the colour difference'],
    code: `vec2 oa = sin(vec2(3., 7.) * ia), ob = sin(vec2(3., 7.) * (ia + 1.));\na = mix(a0, a1, smoothstep(.2, .8, f - .1 * dot(a0 - a1, vec3(1.))));`, use: 'mobile, and the far ring', src: ['iq'], size: 5, defines: D({ ANTI: 2, MACRO: 0 }), paint: allOf({ gravel: 1 }), cam: { dist: 6.5, el: 0.85 },
    plant: (s) => s.setDefines({ ANTI: 2 })
  },
  {
    id: 'hex', fam: 'tile', name: 'Hex-tiling', jp: '亀甲', romaji: 'kikkō', tag: 'Mikkelsen 2022 (3 taps)',
    blurb: 'A triangle grid; three tiles each turned about their own centre and shifted, blended by barycentric weights to the 7th power and nudged by brightness. The corner uses it, with one grid shared by every layer.',
    how: ['skew the plane: (x − .577 y, 1.155 y) × 2√3', 'rotate each tile about its centre; offsets from a hash', 'weights = lerp(1, luminance, .6) × w⁷'],
    code: `HexG g = hexGrid(p / cell, .75);\nvec2 q1 = (g.r1 * (st - g.c1) + g.c1) * cell / tile + g.o1;\nvec3 W = mix(vec3(1.), lums, .6) * pow(g.w, vec3(7.));`, use: 'everywhere near the cat', src: ['mmikk', 'hexdemo', 'ameo', 'heitz'], size: 5, defines: D({ ANTI: 3, MACRO: 0 }), paint: allOf({ gravel: 1 }), cam: { dist: 6.5, el: 0.85 },
    plant: (s) => s.setDefines({ ANTI: 3 })
  },
  {
    id: 'macro', fam: 'tile', name: 'Big shapes first', jp: '大', romaji: 'ōkiku', tag: 'hex-tiling + two macro washes',
    blurb: 'On top of the hex-tiling, two noises at 9 m and 3 m shift value and warmth. It is what a background painter does first, and it is why the corner never looks like one material.',
    how: ['col *= mix(.86, 1.1, fbm(p × .11))', 'a warm–cool drift at fbm(p × .37)'],
    code: `col *= mix(.86, 1.1, fbm3(p * .11));\ncol = mix(col, col * vec3(1.07, .98, .88), (fbm3(p * .37) - .5) * .7);`, use: 'every layer, always', src: ['oga'], size: 5, defines: D({ ANTI: 3, MACRO: 1 }), paint: allOf({ gravel: 1 }), cam: { dist: 6.5, el: 0.85 },
    plant: (s) => s.setDefines({ MACRO: 1 })
  },

  /* ---------------- stone underfoot ---------------- */
  {
    id: 'setts', fam: 'stone', name: 'Ishidatami setts', jp: '石畳', romaji: 'ishidatami', tag: 'flat-shaded, running bond',
    blurb: 'Granite setts in a running bond, after Ishibe-kōji, whose paving is tram stone the city lifted in the 1970s. Each stone’s colour and height come from its hashed cell, so the CPU can find any one of them.',
    how: ['row = floor(z / h), offset by half a stone on odd rows', 'rounded-rect SDF; worn domed tops', 'colour: grey granite, a few warm, a few cool'],
    code: `float row = floor(p.y / size.y), off = mod(row, 2.) * size.x * .5;\nvec2 dq = abs(q) - (size * .5 - joint * .5 - r);\nd = length(max(dq, 0.)) + min(max(dq.x, dq.y), 0.) - r;`, use: 'the village street', src: ['ishibe', 'nara-pave'], defines: D({ POM: 0 }), paint: paved(PAVE.setts, { moss: 0.12 }), cam: { dist: 2.6, el: 0.42 },
    plant: (s, ui) => { ui.setTool('pave'); }
  },
  {
    id: 'pom', fam: 'stone', name: 'Setts in relief', jp: '凹凸', romaji: 'ōtotsu', tag: 'parallax occlusion, 10 steps + secant',
    blurb: 'The same setts with the view ray marched into their height field: joints sink, stones occlude each other at low angles. three.js dropped its parallax example in r132, so this is hand-written, and it fades out by nine metres.',
    how: ['march −V.xz / V.y × height in 10 layers', 'secant between the last two layers', 'fade the height with distance'],
    code: `for (int s = 0; s < 10; s++) { if (cur >= hh) break; cur += layer; o += dir * layer;\n  hh = 1. - pavingH(p + o, style); }\nfloat t = a / (a - b); pp = p + o - dir * layer * t;`, use: 'paving the cat walks on', src: ['dixon', 'cinevva', 'r131'], defines: D({ POM: 1 }), paint: paved(PAVE.setts, { moss: 0.12 }), cam: { dist: 1.9, el: 0.22 },
    plant: (s) => s.setDefines({ POM: 1 })
  },
  {
    id: 'slabs', fam: 'stone', name: 'Kiri-ishi slabs', jp: '切石', romaji: 'kiri-ishi', tag: '600 × 300 mm, moss in the joints',
    blurb: 'Dressed granite slabs at the size Kyoto specifies for its stone roads (600 × 300 × 80 mm). With moss in the splat under them, the height blend lets it show only in the joints.',
    how: ['the same bond with bigger stones and tighter joints', 'moss weight 0.35 under the paving'],
    code: `paving(p, 1, pix, col);   // style 1: slabs\nw[moss] = .35;            // shows in the joints only`, use: 'the shrine approach, kerbs', src: ['kawabata', 'nara-pave'], defines: D({ POM: 1 }), paint: paved(PAVE.slabs, { moss: 0.35 }), cam: { dist: 2.6, el: 0.45 },
    plant: (s, ui) => ui.setTool('pave')
  },
  {
    id: 'nobedan', fam: 'stone', name: 'Nobedan', jp: '延段', romaji: 'nobedan', tag: 'cut and natural stones together',
    blurb: 'A paved strip of uniform width, smooth natural and dressed stones laid together (also called tatami-ishi). Voronoi cells with a mortar line; a third of them warm, a third granite, a third dark.',
    how: ['Voronoi F2 − F1 below a width = the joint', 'stone height from the cell hash'],
    code: `vec3 v = vor(p, .21, .85, id);\nfloat m = smoothstep(.06, .1 + pix / .21, v.y - v.x);`, use: 'the formal (shin) path', src: ['nara-nobedan', 'nara-shin'], defines: D({}), paint: paved(PAVE.nobedan, { gravel: 0.3 }), cam: { dist: 2.6, el: 0.45 },
    plant: (s) => s.pave('shin')
  },
  {
    id: 'arare', fam: 'stone', name: 'Arare-koboshi', jp: '霰零し', romaji: 'arare-koboshi', tag: '“scattered hailstones”',
    blurb: 'Small round stones set close in mortar, the feeling of hail spread on the ground. Cells of 7 cm, a round dome in each, a few nearly black.',
    how: ['Voronoi at 7 cm, a disc of radius .38–.48 per cell', 'dome height √(1 − r²)'],
    code: `float m = 1. - smoothstep(r - .06, r, v.x);\nh = m * sqrt(sat(1. - (v.x / r) * (v.x / r)));`, use: 'the semi-formal (gyō) path, an entrance', src: ['nara-arare', 'nara-stony'], defines: D({}), paint: paved(PAVE.arare), cam: { dist: 2.0, el: 0.5 },
    plant: (s, ui) => ui.setTool('pave')
  },
  {
    id: 'uroko', fam: 'stone', name: 'Irokojiki', jp: '鱗敷', romaji: 'irokojiki', tag: 'fish-scale squares, after Konchi-in',
    blurb: 'Square-cut stones in a grid, every other one turned 45 degrees, the pattern Konchi-in’s garden is known for. Its gaps are open, so whatever is under the paving (moss here) fills them.',
    how: ['checkerboard of squares and diamonds', 'the joints show the layer beneath'],
    code: `float diamond = mod(g.x + g.y, 2.);\nvec2 r = diamond > .5 ? vec2(l.x + l.y, l.y - l.x) * .7071 : l;`, use: 'a garden path that wants to be looked at', src: ['nara-uroko'], defines: D({}), paint: paved(PAVE.uroko, { moss: 0.55 }), cam: { dist: 2.6, el: 0.55 },
    plant: (s, ui) => ui.setTool('pave')
  },
  {
    id: 'araidashi', fam: 'stone', name: 'Araidashi', jp: '洗い出し', romaji: 'araidashi', tag: 'pebbles washed out of cement',
    blurb: 'A Meiji–Taishō plasterer’s finish: cement with black nachiguro pebbles, washed before it sets so the pebbles stand out. Kyoto machiya entrances still have it. At 1.6 cm cells it averages out early, so it fades to its mean colour with distance.',
    how: ['Voronoi at 1.6 cm, black and grey pebbles', 'detail fades by pixel footprint'],
    code: `float far = smoothstep(.002, .006, pix);\ncol = mix(detail, vec3(.32, .31, .3), far);`, use: 'the doma of the tea house', src: ['sanyo-araidashi'], defines: D({}), paint: paved(PAVE.araidashi), cam: { dist: 1.6, el: 0.5 },
    plant: (s, ui) => ui.setTool('pave')
  },
  {
    id: 'tobi', fam: 'stone', name: 'Tobi-ishi in moss', jp: '飛石', romaji: 'tobi-ishi', tag: 'real stones, chidori-gake',
    blurb: 'Stepping stones are geometry: pillow-shaped, flat-faced, set 5 cm proud (Oribe; Rikyū set them at 6, Enshū at 3) in a plover’s zig-zag. The cat steps up onto them; the moss between them is never trodden.',
    how: ['icosphere, y → sign(y)·|y|^0.32 for a flat walking face', 'Kurama, Kibune and Shirakawa granite tints', 'heightAt returns the stone top inside its footprint'],
    code: `y = ys > 0 ? ys * top * (1 + bump) : ys * sink;\nstones.tobi(x, z, r, { proud: PROUD.oribe, kind: 'kurama' });`, use: 'the roji, crossing moss and lawn', src: ['nara-tobi', 'jaanus-tobi', 'nara-junction'], defines: D({}), paint: allOf({ moss: 1 }), stones: 'tobi', cam: { dist: 2.8, el: 0.55 },
    plant: (s, ui) => ui.setTool('stones')
  },

  /* ---------------- loose and living ---------------- */
  {
    id: 'trail', fam: 'loose', name: 'A trail forming', jp: '獣道', romaji: 'kemonomichi', tag: 'Helbing’s active walkers, live',
    blurb: 'Three ghost cats cross the meadow between three favourite places. Each footfall raises the wear field; it relaxes back over time; and each walker leans toward trodden ground. Watch three straight lines merge into a Y, then a path.',
    how: ['dG/dt = (G0 − G)/T + I(1 − G/Gmax) per footfall', 'heading = way there + attraction × ∇(blurred G)', 'grass and moss give way to earth as G rises'],
    code: `g.dir = sim.steer(g.x, g.z, g.to, g.dir);\nfield.step(x, z, .1, 1);   // Q = I (1 - G/Gmax)\nfield.regrow(dt);          // (G0 - G) / T`, use: 'every place NPCs walk in the valley', src: ['helbing', 'helbing2'], defines: D({ WEAR: 1 }), paint: allOf({ grass: 0.6, moss: 0.4 }), walkers: true, cam: { dist: 3.2, el: 0.95 },
    plant: (s) => s.fastForward(90)
  },
  {
    id: 'samon', fam: 'loose', name: 'Samon', jp: '砂紋', romaji: 'samon', tag: 'raked Shirakawa sand',
    blurb: 'Ripples (sazanami-mon) and rings round a rock (mizu-mon) in Shirakawa sand, the weathered granite from Kitashirakawa that can no longer be quarried. The buffer stores only “how far across the rake”; the shader draws twelve ridges per 76 cm stroke.',
    how: ['strokes render across-distance into an 8-bit buffer', 'ridges = cos(across / 6.3 cm)', 'paw prints flatten them'],
    code: `float ac = (g.r * 2. - 1.) * .38;\nh = .5 + .5 * cos(ac / .063 * PI2);`, use: 'the karesansui and the shrine’s gravel', src: ['nara-samon', 'nara-shirakawa', 'shirakawa-ku'], defines: D({ GROOVES: 1, PRINTS: 1 }), paint: allOf({ sand: 1 }), grooves: 'samon', cam: { dist: 2.8, el: 0.6 },
    plant: (s, ui) => ui.setTool('rake')
  },
  {
    id: 'hokime', fam: 'loose', name: 'Hōkime', jp: '箒目', romaji: 'hōkime', tag: 'broom marks on swept earth',
    blurb: 'A temple yard swept at dawn keeps the fan of the bamboo broom in its earth. Same buffer as the rake, a different profile: fine irregular streaks about 6 mm apart, wavering along the stroke.',
    how: ['streak k = floor(across / 6.5 mm), height from its hash', 'a slow wave along the stroke'],
    code: `float k = ac / .0065;\nh = mix(h12(vec2(floor(k), 3.1)), h12(vec2(floor(k) + 1., 3.1)), smoothstep(.2, .8, fract(k)));`, use: 'the shrine yard each morning', src: ['nara-samon'], defines: D({ GROOVES: 1, PRINTS: 1 }), paint: allOf({}), grooves: 'broom', cam: { dist: 2.6, el: 0.55 },
    plant: (s, ui) => ui.setTool('sweep')
  },
  {
    id: 'moss', fam: 'loose', name: 'Sugigoke', jp: '杉苔', romaji: 'sugigoke', tag: 'painted moss cushions',
    blurb: 'Kyoto Prefecture records 560 mosses, and sugigoke is the garden one. Painted as cushions, dark between and yellow-green where the tips catch the light; it cannot take trampling, which is why the tobi-ishi exist.',
    how: ['900 small domes, 1800 tip strokes, 2400 bright specks', 'relief kept low: moss is soft, not bumpy'],
    code: `t.dome(x, y, r, r, rot, '#34522a', '#5f8634', h0, h1);\nt.stroke(x, y, len, w, a, '#8cab48', hcol);`, use: 'the roji, the shade under trees', src: ['moss-types', 'kokepamph'], defines: D({ WEAR: 1 }), paint: allOf({ moss: 1 }), cam: { dist: 2.2, el: 0.45 },
    plant: (s, ui) => ui.setTool('moss')
  },
  {
    id: 'matsuba', fam: 'loose', name: 'Shikimatsuba', jp: '敷松葉', romaji: 'shikimatsuba', tag: 'pine needles laid for winter',
    blurb: 'In winter the gardener covers the moss with dry pine needles against the frost, and it doubles as a winter decoration in tea gardens. Laid combed one way, a few crosswise.',
    how: ['2600 thin strokes, angle 0.5 ± 0.45 rad, 12 % turned', 'height from each stroke'],
    code: `t.stroke(x, y, len, w, .5 + rnd(-.45, .45), needleColour, heightGrey);`, use: 'the roji from December to March', src: ['nara-matsuba'], defines: D({}), paint: (f) => f.fill((x, z) => ({ m: { needles: 0.88 * sstep(-0.9, -0.5, -Math.abs(x)) + 0.1, moss: 0.4 } })), cam: { dist: 2.6, el: 0.5 },
    plant: (s, ui) => ui.setSeason('winter')
  },
  {
    id: 'tataki', fam: 'loose', name: 'Tataki', jp: '三和土', romaji: 'tataki', tag: 'rammed earth, lime and nigari',
    blurb: '“Three things mixed”: red earth, slaked lime and nigari, rammed hard for the doma and the toriniwa. Trowel arcs, lime flecks, a fine crazing, and a little sheen. Wet paws print it dark, and the prints dry from the edges.',
    how: ['trowel strokes, lime specks, random-walk cracks', 'low porosity: wet paws show, puddles stand'],
    code: `t.stroke(x, y, len, w, a, trowelColour, heightGrey, .1);   // trowel arcs\nfor (k < 14) { t.stroke(x, y, l, .7, a, crack, low); a += rnd(-.7, .7); }`, use: 'machiya doma, the door', src: ['tataki', 'tataki-js'], defines: D({ PRINTS: 1, WET: 1 }), paint: allOf({ tataki: 1 }), walkers: 'wetpaws', cam: { dist: 2.4, el: 0.5 },
    plant: (s, ui) => ui.setTool('pave')
  },

  /* ---------------- weather ---------------- */
  {
    id: 'wet', fam: 'weather', name: 'Wet and dry', jp: '濡', romaji: 'nure', tag: 'Lagarde: porosity, then the film',
    blurb: 'Rain on four materials at once. Porous ground darkens toward 20 % of its colour; non-porous stone gets a film and shines; the film dries off first, the darkening lasts. Shirakawa sand nearly turns black (the mica).',
    how: ['albedo × lerp(1, lerp(1, .2, porosity), wet)', 'roughness × lerp(1, lerp(.32, .66, porosity), wetSpec)', 'wetSpec dries ~2× faster than wet'],
    code: `float dark = mix(1., mix(1., .22, por), wet);\nrough *= mix(1., mix(.32, .66, por), wetS);`, use: 'all weather', src: ['lag3', 'lekner', 'shirakawa-ku'], defines: D({ WET: 1 }), paint: (f) => { quad(f); f.fill((x, z) => (x > 0.1 && z < -0.1 ? { m: { paving: 1 } } : null)); }, anim: 'wetcycle', cam: { dist: 2.8, el: 0.55 },
    plant: (s, ui) => ui.setSky('rain')
  },
  {
    id: 'puddles', fam: 'weather', name: 'Puddles, lowest first', jp: '水溜', romaji: 'mizutamari', tag: 'a water level against the relief',
    blurb: 'The water level rises with the rain. It meets the ruts first, then the low spots, and only where the ground is compacted or sealed. Inside: a flat normal, silt in the colour, a sky reflection, and rings in 3 × 3 hashed cells.',
    how: ['depth = (level − (height + micro)) × imperm', 'normal → up as depth grows; roughness → .035', 'rings: radial derivative of sin(31 d), each cell on its own clock'],
    code: `float depth = (uWater - ground) * imperm;\nfloat pud = smoothstep(0., .005, depth);\nN = normalize(N + vec3(rainRings(p * 6., t), 0.) * pud);`, use: 'the lane after rain', src: ['lag2', 'puddle', 'fxguide'], defines: D({ WET: 1, WEAR: 1 }), paint: lanePath, wearLane: true, anim: 'puddles', cam: { dist: 2.8, el: 0.5 },
    plant: (s, ui) => ui.setSky('rain')
  },
  {
    id: 'uchimizu', fam: 'weather', name: 'Uchimizu', jp: '打ち水', romaji: 'uchimizu', tag: 'a ladle of water on a hot day',
    blurb: 'Shopkeepers sweep the front of the shop and throw water on it in summer: to settle the dust, to welcome, and because evaporation cools the ground (Kyoto City measured about 1.8 °C near the surface). Each drop darkens where it lands and dries back.',
    how: ['droplets thrown in a fan, simulated with gravity', 'each landing wets a disc in the field', 'drying ~ 1/80 s, faster at the edges'],
    code: `ladle.throw(x, z, heading);\nladle.update(dt, heightAt, (x, z, s) => field.wetAt(x, z, s * 1.6, .75));`, use: 'the machiya frontage in summer', src: ['uchimizu', 'uchimizu2'], defines: D({ WET: 1 }), paint: allOf({}), anim: 'ladle', cam: { dist: 2.8, el: 0.6 },
    plant: (s, ui) => ui.setTool('ladle')
  },
  {
    id: 'snow', fam: 'weather', name: 'First snow', jp: '初雪', romaji: 'hatsuyuki', tag: 'cover by height, broken by paws',
    blurb: 'Snow takes the high points first: stone tops, pebble crowns, the edges of moss. Warm bare earth holds out longest. A cat’s prints break it back to the ground, and the broom clears it.',
    how: ['cover = smoothstep(amount + (height − .5) × .55 + noise)', 'prints and the snow field subtract', 'a few glints where the sun catches'],
    code: `float sc = smoothstep(.32, .62, sn * 1.25 + (hgt - .5) * .55 + n - bEarth * .1);\ncol = mix(col, vec3(.92, .94, .97), sc);`, use: 'winter', src: ['puddle', 'shards'], defines: D({ SNOW: 1, PRINTS: 1 }), paint: (f) => { quad(f, 0.4); }, stones: 'few', anim: 'snow', walkers: 'paws', cam: { dist: 2.8, el: 0.55 },
    plant: (s, ui) => { ui.setSeason('winter'); ui.setSky('snow'); }
  },
  {
    id: 'komorebi', fam: 'weather', name: 'Komorebi', jp: '木漏れ日', romaji: 'komorebi', tag: 'leaf shade with a warm fringe',
    blurb: 'Light through leaves, from a real shadow map: here a sheet of leaf cut-outs drifting overhead. The ground keeps the shadow term, glows warm only at the penumbra, and lets the shade go blue.',
    how: ['the shadow term is captured from three’s light loop', 'fringe = s (1 − s) × 4, warm', 'shade × a cool tint'],
    code: `if (UNROLLED_LOOP_INDEX == 0) gSun = gShI;\noutgoingLight += albedo * sunCol * gSun * (1. - gSun) * 4. * warm;`, use: 'under every tree in the valley', src: ['dappled'], defines: D({ FRINGE: 1 }), paint: allOf({ moss: 0.5, gravel: 0.2 }), canopy: true, cam: { dist: 2.8, el: 0.6 },
    plant: (s, ui) => ui.setHour(15.5)
  },

  /* ---------------- the finish ---------------- */
  {
    id: 'kuwahara', fam: 'paint', name: 'Kuwahara brush', jp: '筆', romaji: 'fude', tag: '4 windows, keep the calmest',
    blurb: 'A post pass: in each of four overlapping 4 × 4 windows, the mean and the variance; keep the mean of the calmest. Texture becomes flat strokes, edges stay sharp. 49 reads a pixel, so it lives at the end of the frame.',
    how: ['compress HDR before measuring variance', 'pigment pools where tones change', 'paper tooth over the washes'],
    code: `for (j, i in -3..3) { m[k] += c; s[k] += c * c; }   // four windows\nif (variance < best) pick = mean;`, use: 'the painted mode, photos', src: ['heckel', 'susurrus'], defines: D({}), paint: quad, finish: 0.9, cam: { dist: 2.6, el: 0.5 },
    plant: (s) => { s.opt.finish = 0.9; }
  },
  {
    id: 'toon', fam: 'paint', name: 'Stepped light', jp: '階', romaji: 'kaidan', tag: 'three tones and cool shade',
    blurb: 'Quantise the light, not the colour: the ground keeps its painted detail, but the light falls in three bands with blue shade, like a cel background. Cheaper than Kuwahara and more graphic.',
    how: ['L = lum(light) / lum(albedo)', 'q = floor(L × 3.2 + .5) / 3.2'],
    code: `float L0 = lum(outgoingLight) / max(lum(diffuseColor.rgb), .03);\noutgoingLight *= mix(1., (floor(L0 * 3.2 + .5) / 3.2) / L0, .85);`, use: 'a graphic mode, small screens', src: ['oga'], defines: D({ TOON: 1 }), paint: quad, canopy: true, cam: { dist: 2.6, el: 0.5 },
    plant: (s) => s.setDefines({ TOON: 1 })
  }
];

export const byId = (id) => VARIANTS.find((v) => v.id === id);

// [label, url, note]
export const SRC = {
  game: ['Michi-Neko, src/countryside.js (buildGround, buildPathShoulders, buildPath)', '../../src/countryside.js'],
  mish: ['Andrey Mishkinis, Advanced Terrain Texture Splatting', 'https://www.gamedeveloper.com/programming/advanced-terrain-texture-splatting', 'excerpt'],
  ice: ['IceCreamYou, THREE.Terrain (generateBlendedMaterial)', 'https://github.com/IceCreamYou/THREE.Terrain', 'excerpt'],
  t5069: ['three.js forum, How to create a multiple textured terrain', 'https://discourse.threejs.org/t/how-to-create-a-multiple-textured-terrain/5069', 'excerpt'],
  atvi: ['Activision, Large Scale Terrain Rendering (Advances 2023): reveal maps', 'https://advances.realtimerendering.com/s2023/', 'excerpt'],
  stylized: ['dedekpo, stylized-scene: path SDF, edge noise, ground-colour projection', 'https://github.com/dedekpo/stylized-scene', 'read'],
  iq: ['Inigo Quilez, Texture repetition', 'https://iquilezles.org/articles/texturerepetition/', 'excerpt'],
  mmikk: ['Morten Mikkelsen, Practical Real-Time Hex-Tiling, JCGT 11(3), 2022', 'https://jcgt.org/published/0011/03/05/', 'excerpt'],
  hexdemo: ['mmikk/hextile-demo, hextiling.h', 'https://github.com/mmikk/hextile-demo', 'read'],
  ameo: ['ameobea, three-hex-tiling', 'https://github.com/ameobea/three-hex-tiling', 'excerpt'],
  heitz: ['Heitz & Neyret, High-Performance By-Example Noise (HPG 2018)', 'https://doi.org/10.1145/3233304', 'abstract'],
  dixon: ['Kristian Dixon, Parallax mapping in three.js (2025)', 'http://kristiandixon.com/2025/05/13/Parallax.html', 'read'],
  cinevva: ['Cinevva, Open world in the browser 20: parallax occlusion', 'https://app.cinevva.com/blog/2026-05-05-open-world-browser-part-20-parallax-occlusion', 'read'],
  r131: ['three.js #22529: the parallax example removed in r132', 'https://github.com/mrdoob/three.js/issues/22529', 'excerpt'],
  lag2: ['Sébastien Lagarde, Water drop 2b: dynamic rain and its effects', 'https://seblagarde.wordpress.com/2013/01/03/water-drop-2b-dynamic-rain-and-its-effects/', 'excerpt'],
  lag3: ['Sébastien Lagarde, Water drop 3b: physically based wet surfaces', 'https://seblagarde.wordpress.com/2013/04/14/water-drop-3b-physically-based-wet-surfaces/', 'read'],
  lekner: ['Lekner & Dorf, Why some things are darker when wet (1988)', 'https://www.wgtn.ac.nz/scps/staff/pdf/darkerwhenwet.pdf', 'excerpt'],
  puddle: ['scottstts, three.js precipitation surfaces: rain-puddle system', 'https://github.com/scottstts/Threejs-Awesome-Graphics-Agent-Skills', 'read'],
  fxguide: ['fxguide, Game environments part C: wet environments', 'https://www.fxguide.com/fxfeatured/game-environments-partc/', 'excerpt'],
  shards: ['Shards of Stone, Snow that remembers where you walked', 'https://www.shardsofstone.com/blog/snow-that-remembers-where-you-walked', 'read'],
  helbing: ['Helbing, Schweitzer, Keltsch & Molnár, Active walker model for human and animal trail systems (1997)', 'https://arxiv.org/abs/cond-mat/9806097', 'read'],
  helbing2: ['Helbing, Keltsch & Molnár, Modelling the evolution of human trail systems, Nature 388 (1997)', 'https://arxiv.org/abs/cond-mat/9805158', 'excerpt'],
  heckel: ['Maxime Heckel, On crafting painterly shaders', 'https://blog.maximeheckel.com/posts/on-crafting-painterly-shaders', 'excerpt'],
  susurrus: ['Codrops, Susurrus: a watercolour world with three.js and Kuwahara', 'https://tympanus.net/codrops/2026/04/24/susurrus-crafting-a-cozy-watercolor-world-with-three-js-and-shaders/', 'excerpt'],
  dappled: ['Jacky Zhao, Experiments in procedural dappled light', 'https://jzhao.xyz/posts/dappled-light', 'read'],
  turchet: ['Nordahl, Serafin & Turchet, Sound synthesis of footsteps (IEEE VR 2010)', 'https://vbn.aau.dk/ws/files/40509677/NORDAHL_IEEE_VR_2010.pdf', 'excerpt'],
  oga: ['Animation Obsessive, What Kazuo Oga thinks about when he thinks about backgrounds', 'https://animationobsessive.substack.com/p/what-kazuo-oga-thinks-about-when', 'excerpt'],
  kyoani: ['Anime Corner, Sparks of Tomorrow: painting the light into the background (Kyoto Animation)', 'https://animecorner.me/interview-sparks-of-tomorrow-director-minoru-ota-and-producer-satori-senami-on-kyoto-animations-new-creative-challenge/', 'excerpt'],
  'nara-tobi': ['Nara NRICP, Japanese Garden Dictionary: Stepping stones 飛石', 'https://www.nabunken.go.jp/org/bunka/jgd/pages/SteppingStones.html', 'read'],
  'nara-nobedan': ['Nara NRICP: Nobedan pavement 延段', 'https://www.nabunken.go.jp/org/bunka/jgd/pages/NobedanPavement.html', 'read'],
  'nara-pave': ['Nara NRICP: Stone pavement 敷石', 'https://www.nabunken.go.jp/org/bunka/jgd/pages/StonePavement.html', 'read'],
  'nara-arare': ['Nara NRICP: Scattered hailstone pavement 霰こぼし', 'https://www.nabunken.go.jp/org/bunka/jgd/pages/ScatteredHailstonePavement.html', 'read'],
  'nara-stony': ['Nara NRICP: Stony path 霰くずし', 'https://www.nabunken.go.jp/org/bunka/jgd/pages/StonyPath.html', 'read'],
  'nara-uroko': ['Nara NRICP: Fish scale paving 鱗敷', 'https://www.nabunken.go.jp/org/bunka/jgd/pages/FishScalePaving.html', 'read'],
  'nara-samon': ['Nara NRICP: Raked pattern 砂紋', 'https://www.nabunken.go.jp/org/bunka/jgd/pages/RakedPattern.html', 'read'],
  'nara-shirakawa': ['Nara NRICP: Shirakawa sand 白川砂', 'https://www.nabunken.go.jp/org/bunka/jgd/pages/ShirakawaSand.html', 'read'],
  'nara-matsuba': ['Nara NRICP: Pine-needle covering 敷松葉', 'https://www.nabunken.go.jp/org/bunka/jgd/pages/PineNeedleCovering.html', 'read'],
  'nara-barrier': ['Nara NRICP: Barrier stone 関守石', 'https://www.nabunken.go.jp/org/bunka/jgd/pages/BarrierStone.html', 'read'],
  'nara-junction': ['Nara NRICP: Path junction stone 踏分石', 'https://www.nabunken.go.jp/org/bunka/jgd/pages/PathJunctionStone.html', 'read'],
  'nara-kutsunugi': ['Nara NRICP: Shoe-removing stone 沓脱石', 'https://www.nabunken.go.jp/org/bunka/jgd/pages/ShoeRemovingStone_kutsunugiIshi.html', 'read'],
  'nara-shin': ['Nara NRICP: Shin-gyō-sō 真行草', 'https://www.nabunken.go.jp/org/bunka/jgd/pages/ShinGyoSoClassification.html', 'read'],
  'nara-roji': ['Nara NRICP: Tea garden 露地', 'https://www.nabunken.go.jp/org/bunka/jgd/pages/TeaGarden_roji.html', 'read'],
  'jaanus-tobi': ['JAANUS, tobi-ishi 飛石 (heights after Rikyū, Oribe, Enshū)', 'https://projects.mcah.columbia.edu/jaanus/record/tobiishi', 'excerpt'],
  'jaanus-amaochi': ['JAANUS, amaochi 雨落', 'https://projects.mcah.columbia.edu/jaanus/record/amaochi', 'excerpt'],
  'jaanus-inuyarai': ['JAANUS, inuyarai 犬矢来 (≈ 60 cm)', 'https://projects.mcah.columbia.edu/jaanus/record/inuyarai', 'excerpt'],
  'shirakawa-ku': ['Kyoto University repository: Shirakawa sand, darkening when wet', 'https://repository.kulib.kyoto-u.ac.jp/dspace/bitstream/2433/232337/2/dnogk02262.pdf', 'excerpt'],
  jila: ['J-STAGE, Landscape Research Japan 81(5): substitutes for Shirakawa sand', 'https://www.jstage.jst.go.jp/article/jila/81/5/81_467/_article/-char/ja', 'excerpt'],
  ishibe: ['Keihan, 石塀小路: paved with stones from the Kyoto tram', 'https://www.keihan.co.jp/navi/kyoto_tsu/tsu201802.html', 'excerpt'],
  kawabata: ['Kyoto City, Kawabata-dōri paving specification (600 × 300 × 80 mm)', 'https://www2.nyusatsu.city.kyoto.lg.jp/keiyaku/mitsumori/up_file/20250417154726_00411034/tenp1.pdf', 'excerpt'],
  uchimizu: ['Kyoto City Waterworks Bureau, 打ち水 (≈ 1.8 °C cooler at the surface)', 'https://www.city.kyoto.lg.jp/suido/cmsfiles/contents/0000343/343487/20250801_uchimizu.pdf', 'excerpt'],
  uchimizu2: ['Shikibo, 打ち水: sweeping, then water, as welcome', 'https://www.shikibo.co.jp/product/textile/pdf/Uchimizu.pdf', 'excerpt'],
  tataki: ['Tokyu Livable, 三和土 (red earth, slaked lime, nigari)', 'https://www.livable.co.jp/l-note/?p=18151', 'excerpt'],
  'tataki-js': ['Yano & Yano, 三和土の配合に関する研究, Quality Engineering 19(2) 2011', 'https://www.jstage.jst.go.jp/article/qes/19/2/19_60/_article/-char/ja', 'excerpt'],
  'sanyo-araidashi': ['Sanyo Chemical, 洗い出し in Kyoto machiya', 'https://www.sanyo-chemical.co.jp/magazine/wp/wp-content/uploads/2021/01/No.524kyo.pdf', 'excerpt'],
  inubashiri: ['at home, 犬走り (40–60 cm)', 'https://www.athome.co.jp/contents/custom/build-design/scarcement/', 'excerpt'],
  'moss-types': ['japanesegardens.jp, Moss in the Japanese garden', 'https://japanesegardens.jp/moss-types-overview/', 'excerpt'],
  kokepamph: ['Kyoto Prefecture, moss pamphlet (560 species)', 'https://www.pref.kyoto.jp/kankyo/documents/kokepamphlet.pdf', 'excerpt']
};
export const SOURCES = Object.values(SRC).filter(([, u]) => u.startsWith('http')).map(([l, u, n]) => [l, u, n]);

export const GAME = [
  '<code>buildGround()</code> keeps its plane but wears <code>createGroundMaterial</code>: a village <em>GroundField</em> (64 m at 16 texels/m, four RGBA8 textures, 16 MB) over the centre and a 2 texel/m one to the rim. The splat is painted from what the valley already knows: <code>pathSamples</code>, <code>vegetationExclusions</code>, the paddies, the river bed.',
  '<code>buildPath()</code> and <code>buildPathShoulders()</code> stop being ribbons. The path is painted into the field: earth with standing ruts (<code>G0</code>), setts through the village (style 0), slabs and nobedan up the sandō. The shoulder is no longer authored: it is wherever <code>G</code> is between 0.1 and 0.5.',
  '<code>Vegetation.buildMeadow()</code> calls <code>field.writeGrassMask(mask)</code> instead of baking exclusions alone, so the grass thins on trodden ground and an edge thicket grows along every path. The ground under the grass is the meadow floor layer, which is <code>groundTextures(6)</code>.',
  'NPC routines in <code>npc.js</code> and the player’s paws call <code>field.step()</code>: the valley wears <em>kemonomichi</em> where Luna, Mochi and Kuro really walk, and regrows over a game week (<code>T</code> ≈ 7 game days). Upload only the dirty rows.',
  '<code>main.js</code> weather drives <code>Weather.apply(U)</code>: wetness, the puddle level, rain rings, snow cover. The river keeps its own rain rings; the ground gets the low-first puddles in the ruts.',
  'Every building with an eave gets an <em>amaochi</em> strip and a dry band (<code>uEave</code> becomes a short list of eave rects); <code>buildWalkwaySlabs()</code> (never called today) is replaced by real tobi-ishi through the tea house garden, set 5 cm proud so the cat steps up onto them.',
  'Quiet activities, no fail states: rake the shrine sand as a stillness moment, sweep the tea house frontage at dawn, a ladle by the fishmonger’s in summer. The trail map can go in the journal.'
];
