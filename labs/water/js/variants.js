// The twenty-eight variants: what each one is, how it is made, what it is
// good for and where the idea came from. Clicking a card plants it on the
// stage; the cube beside it is built by gallery.js from `kind` + `style`.

export const SOURCES = {
  vlachos: ['Alex Vlachos — Water Flow in Portal 2 (SIGGRAPH 2010)', 'https://alex.vlachos.com/graphics/Vlachos-SIGGRAPH10-WaterFlow.pdf'],
  flowmap: ['three.js — webgl_water_flowmap example', 'https://threejs.org/examples/webgl_water_flowmap.html'],
  water2: ['three.js — Water2.js (flow map, reflector + refractor)', 'https://github.com/mrdoob/three.js/blob/r160/examples/jsm/objects/Water2.js'],
  ocean: ['three.js — Water.js / webgl_shaders_ocean', 'https://threejs.org/examples/webgl_shaders_ocean.html'],
  gems1: ['GPU Gems ch. 1 — Effective Water Simulation from Physical Models (Gerstner waves)', 'https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models'],
  gems2: ['GPU Gems ch. 2 — Rendering Water Caustics', 'https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-2-rendering-water-caustics'],
  roystan: ['Roystan — Toon water shader', 'https://github.com/IronWarrior/ToonWaterShader'],
  tuts: ['Envato Tuts+ — Creating Toon Water for the Web (depth-buffer foam lines)', 'https://code.tutsplus.com/creating-toon-water-for-the-web-part-1--cms-30447t'],
  toonForum: ['three.js forum — toon water with depth fog and intersection foam', 'https://discourse.threejs.org/t/toon-water-shader-with-depth-based-fog-and-intersection-foam/35978'],
  alisavakis: ['Harry Alisavakis — My take on shaders: stylized water', 'https://halisavakis.com/my-take-on-shaders-stylized-water-shader/'],
  cyanilux: ['Cyanilux — Shoreline shader breakdown', 'https://www.cyanilux.com/tutorials/shoreline-shader-breakdown/'],
  wallace: ['Evan Wallace — WebGL Water', 'https://madebyevan.com/webgl-water/'],
  wallaceCaustics: ['Evan Wallace — Rendering realtime caustics in WebGL', 'https://medium.com/@evanwallace/rendering-realtime-caustics-in-webgl-2a99a29a0b2c'],
  gpgpu: ['three.js — webgl_gpgpu_water example', 'https://threejs.org/examples/webgl_gpgpu_water.html'],
  reflector: ['three.js — Reflector docs', 'https://threejs.org/docs/pages/Reflector.html'],
  lengyel: ['Eric Lengyel — Oblique view frustum depth projection and clipping', 'https://terathon.com/lengyel/Lengyel-Oblique.pdf'],
  heckel: ['Maxime Heckel — On Crafting Painterly Shaders (Kuwahara)', 'https://blog.maximeheckel.com/posts/on-crafting-painterly-shaders/'],
  susurrus: ['Codrops — Susurrus: a cozy watercolor world with three.js (Kuwahara as the only pass)', 'https://tympanus.net/codrops/2026/04/24/susurrus-crafting-a-cozy-watercolor-world-with-three-js-and-shaders/'],
  oga: ['Animation Obsessive — What Kazuo Oga thinks about when he thinks about backgrounds', 'https://animationobsessive.substack.com/p/what-kazuo-oga-thinks-about-when'],
  gurney: ['Gurney Journey — Painting in Ghibli style (poster colour)', 'https://gurneyjourney.blogspot.com/2018/05/painting-in-ghibli-style.html'],
  rainey: ['Jenna Rainey — Painting water reflections', 'https://jennarainey.com/painting-water-reflections/'],
  kauffman: ['Robert Kauffman — River dynamics (pillows, holes, eddies)', 'https://www.frostburg.edu/faculty/rkauffman/_files/images_swr/Ch04_RiverDynamics_v2.pdf'],
  tinkler: ['Tinkler (1997) — velocity from standing waves, v ≈ 1.25√λ', 'https://doi.org/10.1061/(asce)0733-9429(1997)123:10(918)'],
  nps: ['National Park Service — Fluvial features: meandering stream', 'https://www.nps.gov/articles/meandering-stream.htm'],
  kelvin: ['Kelvin wake pattern (19.47°)', 'https://en.wikipedia.org/wiki/Kelvin_wake_pattern'],
  kameishi: ['Atlas Obscura — Kamo River turtle stepping stones', 'https://www.atlasobscura.com/places/kamogawa-river-turtle-stepping-stones'],
  delta: ['Kanpai — Demachiyanagi delta (stepping stones, KyoAni locations)', 'https://www.kanpai-japan.com/kyoto/demachiyanagi-delta'],
  giboshi: ['Muza-chan — Traditional Japanese bridge architecture: giboshi', 'https://muza-chan.net/japan/index.php/blog/traditional-japanese-bridge-architecture-giboshi'],
  kouran: ['JAANUS — kōran (hokogi, hirageta, jifuku, tsuka, masu)', 'https://www.aisf.or.jp/~jaanus/deta/k/kouran.htm'],
  wayou: ['JAANUS — wayō kōran (giboshi on the corner posts)', 'https://projects.mcah.columbia.edu/jaanus/node/302'],
  hasami: ['JAANUS — hashibasami-ishi (corner stones of a stone bridge)', 'https://projects.mcah.columbia.edu/jaanus/node/4193'],
  hlj: ['Highlighting Japan (Sept 2023) — The history of traditional Japanese bridges', 'https://www.gov-online.go.jp/eng/publicity/book/hlj/html/202309/202309_00_en.html'],
  sanjoWood: ['Mokuzai Hozon 49-1 (2023) — Kyoto’s Sanjō Ōhashi: how its railing weathers', 'https://doi.org/10.5990/jwpa.49.28'],
  sanjoNdl: ['NDL reference — giboshi of Kyoto’s bridges', 'https://crd.ndl.go.jp/reference/entry/index.php?id=1000102410&page=ref_view'],
  taiko: ['MLIT multilingual database — Sorihashi (Taikobashi)', 'https://www.mlit.go.jp/tagengo-db/en/R3-00129.html'],
  taiko2: ['Japanese Gardens — Taiko-bashi at shrines and temples', 'https://japanesegardens.jp/taiko-bashi-and-their-use-in-japanese-shrines-and-temples/'],
  yatsu: ['MLIT multilingual database — Yatsuhashi bridge and Japanese irises', 'https://www.mlit.go.jp/tagengo-db/en/R2-01679.html'],
  yatsu2: ['JAANUS — yatsuhashi', 'https://projects.mcah.columbia.edu/jaanus/node/193'],
  kozuya: ['Kōzuya-bashi (nagare-bashi), Yawata', 'https://japanese-wiki-corpus.github.io/building/Kozuya-bashi%20Bridge.html'],
  kozuya2: ['Kansai Scene — The bridge that flows', 'https://www.kansaiscene.com/2012/07/the-bridge-that-flows/'],
  gyoja: ['NFAJ location database — Ippon-bashi / Gyōja-bashi on the Shirakawa', 'https://jl-db.nfaj.go.jp/en/location/260200010'],
  uji: ['Highlighting Japan — Uji-bashi and the tea house (the san-no-ma)', 'https://www.gov-online.go.jp/pdf/hlj/20230901/hlj_202309_10-11_uji-bashi_bridge_and_tea_house.pdf'],
  uji2: ['Uji-bashi (宇治橋)', 'https://japanese-wiki-corpus.github.io/building/Uji-bashi%20Bridge.html'],
  mirrorPaddy: ['The Mainichi — water-filled rice terraces reflect the sky', 'https://mainichi.jp/english/articles/20220507/p2a/00m/0na/008000c'],
  jarq: ['JARQ 14-2 — Rice transplanters (30 cm rows)', 'https://www.jircas.go.jp/sites/default/files/publication/jarq/14-2-084-087_0.pdf'],
  irri: ['IRRI Rice Knowledge Bank — Transplanting', 'http://www.knowledgebank.irri.org/step-by-step-production/growth/planting/transplanting'],
  haza: ['Nippon.com — Rice dried the old-fashioned way on racks (haza, inagi)', 'https://www.nippon.com/en/japan-video/ct171000038/delicious-rice-dried-the-old-fashioned-way-on-racks-in-the-sun-noto-ishikawa-prefecture.html'],
  hasakake: ['Google Arts & Culture — Kihachi Homma, “Hasakake” (1951)', 'https://artsandculture.google.com/asset/3wHndYnD-KEE_Q'],
  frogs: ['Japanese tree frog choruses in paddy fields (PMC)', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5384602'],
  firefly: ['Genji firefly flash intervals, east vs west', 'https://nishi2.jp/en/?p=49204'],
  toro: ['Kansai Finder — Arashiyama tōrō-nagashi', 'https://kansaifinder.com/event/arashiyama-lantern-festival'],
  toro2: ['MLIT multilingual database — Tōrō nagashi', 'https://www.mlit.go.jp/tagengo-db/en/R1-00499.html'],
  canal: ['Nippon.com — A blossom-viewing stroll along the Philosopher’s Walk', 'https://www.nippon.com/en/guide-to-japan/gu003021/'],
  dickerson: ['Dickerson, Mills & Hu (2012) — Wet mammals shake at tuned frequencies to dry', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3481573'],
  wetdark: ['Why does water make a shirt darker? (Baird, WTAMU)', 'https://wtamu.edu/~cbaird/sq/2013/11/06/why-does-water-make-a-shirt-darker']
};

const S = (...k) => k.map((x) => SOURCES[x]);

export const FAMILIES = [
  { key: 'field', title: 'Water, from the field', sub: 'Seven techniques from talks, papers, examples and forums.' },
  { key: 'kyoto', title: 'Water, painted for Kyoto', sub: 'The game today, the lab’s river, and five crosses with Kyoto and the painters.' },
  { key: 'bridges', title: 'Bridges', sub: 'Eight ways across, from the game’s box to the bridge that floats away.' },
  { key: 'paddies', title: 'Paddies through the year', sub: 'Mirror, seedlings, green, gold and ice: the same two terraces.' }
];

export const VARIANTS = [
  /* ---------------- water: from the field ---------------- */
  {
    id: 'scroll', family: 'field', kind: 'water', style: 'scroll', name: 'Scrolling normals', jp: '流し法線', gpu: 1,
    tag: 'the classic: four normal maps sliding',
    blurb: 'The three.js ocean’s trick: one ripple normal map sampled four times at different scales, each scrolling its own way. Cheap and convincing on a lake, but it ignores the river: the ripples drift the same way round every bend and behind every rock.',
    how: ['One tileable 256 px normal map, painted at load time from integer-wavenumber sines so it tiles exactly.', 'Four lookups with fixed scroll velocities, summed into one slope.', 'Fresnel sky, sun highlight and Beer-Lambert depth, the same as every lit style here.'],
    code: `slope = nslope(p / 2.1 + vec2(t * .032, t * .011))
      + nslope(p / 1.3 - vec2(t * .021, -t * .017))
      + nslope(p / 3.7 + vec2(-t * .013, t * .025))
      + nslope(p / .83 + vec2(t * .04, -t * .03)) * .6;
vec3 N = normalize(vec3(slope.x * .16, 1., slope.y * .16));`,
    use: 'still ponds and the Moon Pool, where nothing flows.', sources: S('ocean')
  },
  {
    id: 'flowmap', family: 'field', kind: 'water', style: 'flowmap', name: 'Flow map', jp: 'フローマップ', gpu: 2,
    tag: 'Valve’s two-phase trick',
    blurb: 'Distort the normal map’s coordinates along a per-texel flow vector instead of scrolling them. Two layers run half a cycle apart and cross-fade, so neither restart shows. This is three.js Water2, with its tiny 0.02 base reflectivity.',
    how: ['The field texture stores flow in m/s (GB), built from the centreline: fastest on the thalweg, still at the banks.', 'Layer offsets are flow × (phase − ½) × period, so the pattern moves at the water’s real speed.', 'Without a per-pixel phase offset the whole river “breathes” once a cycle: look closely.'],
    code: `float p0 = fract(t * rate), p1 = fract(t * rate + .5);
float w0 = 1. - abs(2. * p0 - 1.);   // zero at each restart
vec2 a = nslope(p - flow * (p0 - .5) * T);
vec2 b = nslope(p - flow * (p1 - .5) * T + .37);
slope = a * w0 + b * (1. - w0);`,
    use: 'any water with a current; the base of the lab’s river.', sources: S('vlachos', 'flowmap', 'water2')
  },
  {
    id: 'gerstner', family: 'field', kind: 'water', style: 'gerstner', name: 'Gerstner waves', jp: 'ゲルストナー波', gpu: 2,
    tag: 'real geometry that moves',
    blurb: 'Four trochoidal waves displace the mesh itself, pinching the crests and widening the troughs like real deep-water waves. Lovely on a sea, wrong on a shallow river: the waves walk straight through the bends. It is here to show why the river needs a flow field.',
    how: ['Each wave: direction, wavelength L, amplitude A, phase speed √(g·k).', 'Steepness Q shifts vertices toward the crests; the normals come out analytically.', 'Displacement fades to nothing in the shallows using the bed from the field texture.'],
    code: `float k = 6.2831853 / L, c = sqrt(9.8 / k);
float f = k * (dot(D, p) - c * t);
disp.xz += Q * A * D * cos(f);
disp.y  += A * sin(f);`,
    use: 'the summit bay and the sea beyond Kyoto.', sources: S('gems1')
  },
  {
    id: 'toon', family: 'field', kind: 'water', style: 'toon', name: 'Toon water', jp: 'トゥーン', gpu: 1,
    tag: 'hard bands and a foam line',
    blurb: 'Depth in three flat bands, white streaks combed along the flow and a wobbly foam line wherever the water gets shallow. Roystan’s toon water and the Tuts+ series do it with the depth buffer; here the bed height is already known, so it costs nothing.',
    how: ['Bands at 16 cm and 50 cm of water, nudged by noise so the edges wobble.', 'Streaks: a flow-advected noise thresholded hard.', 'Foam line: depth below 5–10 cm, the threshold distorted by noise.'],
    code: `col = d < .16 ? shallow : d < .5 ? mid : deep;
float streak = step(.8, flowFoam(p, flow, t).g);
float line = step(depth, .05 + wobble * .05);`,
    use: 'a reduced-detail tier, or the map screen.', sources: S('roystan', 'tuts', 'toonForum', 'alisavakis')
  },
  {
    id: 'ripple', family: 'field', kind: 'water', style: 'ripple', name: 'Ripple tank', jp: '波紋シミュレーション', gpu: 3,
    tag: 'the wave equation on the GPU',
    blurb: 'A heightfield simulated every frame: each cell is pulled toward the average of its neighbours, damped a little. Paws, stones and raindrops push it; the banks reflect it. Hover the cube. On the stage, Michi’s paddling makes real interfering rings.',
    how: ['Two half-float targets ping-ponged, two steps a frame (Evan Wallace’s WebGL Water; three’s gpgpu water).', 'Land from the field texture is a wall, so rings bounce off the banks and stones.', 'Where the surface curves in, light focuses: the Laplacian brightens the crests, a cheap caustic cue.'],
    code: `v += (avg - h) * 2.;   // accelerate toward the neighbours
v *= .993;            // damping
h += v;
h *= 1. - land;       // banks reflect`,
    use: 'the Moon Pool and puddles: small, still water the cat disturbs.', sources: S('wallace', 'gpgpu')
  },
  {
    id: 'mirror', family: 'field', kind: 'water', style: 'mirror', name: 'Planar mirror', jp: '鏡面反射', gpu: 4,
    tag: 'the scene, re-rendered upside down',
    blurb: 'three’s Reflector, unbundled: a virtual camera reflected through the water, its near plane bent onto the surface so nothing below leaks in, rendered at half resolution and wobbled by the flow normals. This is what lets the drum bridge close its circle.',
    how: ['Mirror the camera position and target through y = level.', 'Lengyel’s oblique clip makes the water plane the near plane.', 'Sample with uv + N.xz × 0.05: ripples break the reflection into streaks.'],
    code: `q = inverse(P) * vec4(sign(c.x), sign(c.y), 1., 1.);
c *= 2. / dot(c, q);
P[2] = c.x - P[3]; P[6] = c.y - P[7];
P[10] = c.z - P[11]; P[14] = c.w - P[15];`,
    use: 'the river near the bridge, the Moon Pool at night.', sources: S('reflector', 'lengyel', 'water2')
  },
  {
    id: 'caustic', family: 'field', kind: 'water', style: 'caustic', name: 'Caustic shallows', jp: '光の網', gpu: 3,
    tag: 'light nets on the bed',
    blurb: 'Very clear water, and on the bed the moving net of light that a rippled surface focuses: two animated Voronoi layers multiplied, split into red and blue a hair apart. GPU Gems says it plainly: caustics are strongest for vertical light and shallow water.',
    how: ['Drawn by the ground shader where the bed is under 0.02–0.8 m of water, faded by depth and by sun height.', 'Two Voronoi cell-edge layers at different scales and drifts, multiplied.', 'Evan Wallace’s exact method refracts a light mesh through the surface; this is the cheap cousin.'],
    code: `vec3 v1 = voronoi2(p * 1.7 + t * vec2(.23, .11));
vec3 v2 = voronoi2(p * 2.31 + t * vec2(-.19, .27));
float c = (1. - smoothstep(0., .17, v1.y - v1.x))
        * (1. - smoothstep(0., .17, v2.y - v2.x));`,
    use: 'the shallows by the stepping stones, the Moon Pool rim.', sources: S('gems2', 'wallaceCaustics', 'cyanilux')
  },

  /* ---------------- water: painted for Kyoto ---------------- */
  {
    id: 'game', family: 'kyoto', kind: 'water', style: 'game', name: 'Ours today', jp: 'いまの川', gpu: 1,
    tag: 'countryside.js, as it ships',
    blurb: 'The game’s river: crossing sine ripples in world X and Z, a bank tint from the ribbon’s UV, Fresnel sky, sparkles and two foam bands. Pretty from above, but the ripples ignore the bends, depth is a guess and the bridge piers leave no wake.',
    how: ['A ported createRiverWaterMaterial(): same constants, same colours, same lack of tone mapping.', 'Depth comes from how far you are from the bank, not from the carved bed.', 'Kept here as the baseline for every comparison.'],
    code: `float r1 = sin(p.x * 2.1 - t * 1.4 + sin(p.y * 3. + t * .7) * .8);
float r2 = sin(p.y * 3.4 + p.x * .6 - t * 2.1);
// ...the same everywhere, whatever the current`,
    use: 'the before picture.', sources: []
  },
  {
    id: 'kyoto', family: 'kyoto', kind: 'water', style: 'kyoto', name: 'The lab’s river', jp: '鴨川の水', gpu: 3,
    tag: 'flow, depth, foam, light, a mirror and a brush',
    blurb: 'Everything above, joined up. Flow-mapped ripples with a per-pixel phase offset, Beer-Lambert depth from the real bed, foam on the pillows and eddy lines the field works out round every stone, a dark wet band on the banks, caustics, the half-res mirror, lantern glitter at night, and a painterly finish on top.',
    how: ['Potential flow round each rock, pier and turtle stone; an eddy behind (the flow reverses) and foam where the currents shear.', 'The thalweg leans to the outside of each bend, where the cut bank is; the point bar on the inside is shallow gravel.', 'Premultiplied alpha: the body covers the bed by absorption, then reflection and foam sit on top.'],
    code: `float absorb = 1. - exp(-depth * clarity);
col = body * absorb * (1. - F) + refl * F + spec;
a   = absorb * (1. - F) + F;
col = col * (1. - foam) + foamCol * foam;`,
    use: 'the valley river. This is the recommendation.', sources: S('vlachos', 'kauffman', 'nps', 'cyanilux', 'alisavakis')
  },
  {
    id: 'painted', family: 'kyoto', kind: 'water', style: 'painted', name: 'Ghibli painted', jp: '背景美術', gpu: 2,
    tag: 'poster colour on a wet ground',
    blurb: 'How a background painter would do it: three flat tones, the sky gradient turned upside down (light far away, dark underfoot), white strokes combed along the current and a dark line where the water meets the bank. Oga painted with Nicker poster colour on a wet base; the stage’s Kuwahara pass does the brushwork.',
    how: ['Tones posterised to four steps; far water fades toward the sky colour.', 'Strokes: an anisotropic flow-advected noise, thresholded into crisp white shapes.', 'Sun highlights become flat white shapes rather than a glow.'],
    code: `body = mix(deepP, skyP * .85, far * .75);
body = posterize(body, 4., .8);
float stroke = smoothstep(.78, .82, st.g);
inkLine = 1. - smoothstep(0., .03, depth);`,
    use: 'stillness moments and the photo mode, mixed in with the slider.', sources: S('oga', 'gurney', 'rainey', 'heckel')
  },
  {
    id: 'weir', family: 'kyoto', kind: 'water', style: 'kyoto', setup: 'weir', name: 'Kamogawa weir', jp: '落差工', gpu: 3,
    tag: 'a white line across the river',
    blurb: 'The Kamo River is stepped with low weirs, each a line of white water. Here a granite sill sits just under the surface: the field speeds the water over it and lays standing waves below, spaced by the speed (v ≈ 1.25√λ, so a 1.5 m/s current gives crests about 1.4 m apart).',
    how: ['The bed carries a sill 3–4 cm under the surface and a scour pool downstream.', 'Foam along the crest, then decaying standing-wave rows at the wavelength the speed implies.', 'Hover the cube to drop pebbles into the tail water.'],
    code: `float lambda = pow(v / 1.25, 2.);   // Tinkler / Kennedy
foam += .95 * exp(-pow(dw - .32, 2.) / .05);
foam += .5 * pow(max(0., sin((dw - .5) / lambda * 6.283)), 3.)
           * exp(-(dw - .5) / 2.6);`,
    use: 'the river upstream of the bridge, where it is heard before it is seen.', sources: S('tinkler', 'kauffman')
  },
  {
    id: 'hanaikada', family: 'kyoto', kind: 'water', style: 'kyoto', setup: 'petals', name: 'Hanaikada', jp: '花筏', gpu: 3,
    tag: 'petal rafts on the current',
    blurb: 'In early April the Biwako canal under the Philosopher’s Path carries rafts of cherry petals. Each petal here is a particle the field pushes: they lag the water a little, spin faster where it is fast, pile up in the eddies behind stones and gather in the shallows.',
    how: ['Petals read the same CPU flow the shader draws, faded in the shallows the same way.', 'Inertia: velocity relaxes toward the flow over ~0.4 s, so rafts form instead of lines.', 'Below 3 cm of water they slow and stay: the drifts along the bank.'],
    code: `field.flowAt(p.x, p.z, level, f);
p.vx += (f.x - p.vx) * min(1., dt * 2.5);
p.vz += (f.z - p.vz) * min(1., dt * 2.5);
if (depth < .03) { p.vx *= .9; p.vz *= .9; }`,
    use: 'spring in the valley; the petal-drift task in the ground pass.', sources: S('canal')
  },
  {
    id: 'toro', family: 'kyoto', kind: 'water', style: 'kyoto', setup: 'night', name: 'Moon & tōrō-nagashi', jp: '灯籠流し', gpu: 4,
    tag: 'lanterns and their streaks at night',
    blurb: 'On 16 August, Arashiyama sets thousands of paper lanterns on the Katsura River to send the ancestors home. Each lantern here floats on the field and is also a light the water shader knows: broken ripples stretch every lantern, and the moon, into a vertical streak of glitter.',
    how: ['Up to eight point lights reach the water; a sharp Blinn lobe on rippled normals makes the streak by itself.', 'Lanterns drift with the flow and bob; the cube’s light rig is fixed at 21:30.', 'The moon is a sharp lobe in the sky function, so it reflects with the mirror off too.'],
    code: `vec3 H = normalize(normalize(L.xyz - P) + V);
float nh = max(dot(N, H), 0.);
c += lantern * (pow(nh, 260.) * 4. + pow(nh, 28.) * .09)
   * L.w / (1. + dot(d, d) * .07);`,
    use: 'the valley’s Obon evening, and every lantern by water.', sources: S('toro', 'toro2')
  },
  {
    id: 'sumi', family: 'kyoto', kind: 'water', style: 'sumi', name: 'Sumi-e', jp: '水墨', gpu: 1,
    tag: 'ink on paper',
    blurb: 'A strange one: the water becomes paper and the current is drawn in ink. Lines follow the flow, the wash darkens with depth, the bank is a dark stroke and the eddy lines behind stones write themselves.',
    how: ['Flow-advected noise sliced into contour lines (fract × 5.5).', 'Depth adds a pale wash; the field’s foam becomes ink.', 'Paper grain from the foam texture.'],
    code: `float lines = 1. - smoothstep(.03, .08,
    abs(fract(fm.g * 5.5) - .5) - .38);
ink = wash + lines * .55 * speed + shore * .8;`,
    use: 'the journal’s illustrations, or a dream sequence.', sources: []
  },

  /* ---------------- bridges ---------------- */
  {
    id: 'b-game', family: 'bridges', kind: 'bridge', type: 'game', name: 'Ours today', jp: 'いまの橋', gpu: 1,
    tag: 'one box deck, no piers',
    blurb: 'buildRiverAndBridge() as it ships: a 2.6 × 8.4 m box deck a metre up, seven box posts a side, flat rail caps wide enough to walk, ramps of cobble, and nothing holding it up. From cat height every edge is a box edge.',
    how: ['Ported part for part: deck, cobble skin, beam, posts, rail caps and panels, ramps.', 'The rail caps are walkable ledges, as in the game.', 'No piers, so no wakes in the water.'],
    code: `const deck = box(2.6, 0.16, 8.4, deckMat, 0, deckY, 0);
for (let i = 0; i <= 6; i++) ... box(0.1, 0.6, 0.1, ...)`,
    use: 'the before picture.', sources: []
  },
  {
    id: 'b-sanjo', family: 'bridges', kind: 'bridge', type: 'sanjo', name: 'Sanjō Ōhashi', jp: '三条大橋', gpu: 2,
    tag: 'a timber beam bridge with a giboshi kōran',
    blurb: 'A mokugeta-bashi, the wooden beam bridge most Japanese bridges were until the modern age. Pier bents of round posts in the river, keta beams, planks with a gap between each, and a wayō kōran: jifuku curb, tozuka struts on masu blocks, hirageta, the round hokogi, and bronze giboshi on the main posts.',
    how: ['Wood weathers by orientation, as recorded on Sanjō Ōhashi: algae on north faces, the top rail bleaching first, damp and green near the water.', 'Giboshi patina gathers verdigris on what faces the sky.', 'Each post is also a flow obstacle, so the river gets its wakes.'],
    code: `koran(P, { x, z0, z1, yAt, oya: [ends, ...bents] });
// jifuku, hirageta, hokogi; tozuka + masu every 0.95 m
giboshi(P, x, y + H1 + 0.12, z);   // lathe: collar, ring, onion, point`,
    use: 'the valley bridge. This is the recommendation.', sources: S('kouran', 'wayou', 'giboshi', 'sanjoWood', 'sanjoNdl', 'hlj')
  },
  {
    id: 'b-taiko', family: 'bridges', kind: 'bridge', type: 'taiko', name: 'Taikobashi', jp: '太鼓橋', gpu: 3,
    tag: 'the drum bridge closes its circle in the water',
    blurb: 'The sorihashi (arched bridge) is called the drum bridge for what its reflection does: the arc and its mirror image make a drum. So steep it needs cleats; the arch saves the long approaches a high bridge would otherwise need. Vermilion lacquer, giboshi at the four ends.',
    how: ['A circular arc through the chord and a 1.95 m rise; planks follow it, cleats where it passes 35 %.', 'Laminated ribs under the deck, two bents of lacquered posts.', 'Needs the planar mirror to read as a drum: try it with the mirror off.'],
    code: `const Rc = (L * L / 4 + f * f) / (2 * f);
const arc = (dz) => g0 + Math.sqrt(Rc * Rc - dz * dz) - (Rc - f);`,
    use: 'the shrine precinct’s pond.', sources: S('taiko', 'taiko2')
  },
  {
    id: 'b-yatsuhashi', family: 'bridges', kind: 'bridge', type: 'yatsuhashi', name: 'Yatsuhashi', jp: '八橋', gpu: 1,
    tag: 'eight planks in a zigzag',
    blurb: 'From The Tales of Ise: travellers resting at an iris marsh crossed by eight planks. Boards laid end to end, each turned the other way, low over shallow water and kakitsubata irises. Raise the water and the planks go under.',
    how: ['Eight planks at ±24°, each on a pair of stub posts.', 'Irises placed only where the water is 2–40 cm deep.', 'Walkable as oriented boxes; no railing, so a cat can step off.'],
    code: `const ang = Math.atan2(nx - px, nz - pz);
P.box('wood', .36, .07, len, cx, top, cz, { ry: ang });
obbSolid({ cx, cz, ang, hl: len / 2, hw: .2, top });`,
    use: 'the iris marsh by the Lantern Glade.', sources: S('yatsu', 'yatsu2')
  },
  {
    id: 'b-ippon', family: 'bridges', kind: 'bridge', type: 'ippon', name: 'Ippon-bashi', jp: '一本橋', gpu: 1,
    tag: 'one granite slab, no railing',
    blurb: 'The Shirakawa’s Gyōja-bashi near Chion-in: a narrow stone slab and nothing to hold. Here two slabs meet on a pier of dressed blocks, and hashibasami-ishi, the four corner stones of a stone bridge, pin the ends. Walk off the side and you swim.',
    how: ['Slabs 56 cm wide; the pier is a flow obstacle with a big wake.', 'Stone steps up from each bank.', 'The cat’s support is three paw points, so it can straddle the joint.'],
    code: `P.box('stone', .56, .2, L / 2 + .2, x, top - .1, zc ± L / 4);
// hashibasami-ishi at the four corners
P.box('stone', .22, .62, .22, x ± .45, top + .12, zEnd);`,
    use: 'Gion-style canal crossings in the town.', sources: S('gyoja', 'hasami')
  },
  {
    id: 'b-nagare', family: 'bridges', kind: 'bridge', type: 'nagare', name: 'Nagare-bashi', jp: '流れ橋', gpu: 2,
    tag: 'built to float away in a flood',
    blurb: 'Kōzuya-bashi at Yawata is not fastened down: when the river rises its deck sections lift off the piers and swing downstream on wires, to be put back afterwards. It was built in 1953 and first washed off that same August. Hover the cube, or raise the water on the stage, and ride a section.',
    how: ['Four sections, each pivoting on its tether post; buoyancy and swing are damped springs.', 'Above the trigger level, sections float and turn up to 70° downstream.', 'Sections are moving solids: a cat standing on one is carried.'],
    code: `const lift = level - (Hn - .16);
const ty  = lift > 0 ? level + .05 : Hn;
const tth = lift > 0 ? Math.min(1.25, lift * 3.2) : 0;
sec.vth += ((tth - sec.th) * 3.2 - sec.vth * 2.2) * dt;`,
    use: 'a rainy-season event on the river.', sources: S('kozuya', 'kozuya2')
  },
  {
    id: 'b-uji', family: 'bridges', kind: 'bridge', type: 'uji', name: 'Uji-bashi', jp: '宇治橋', gpu: 2,
    tag: 'a gentle bow and the san-no-ma',
    blurb: 'Uji-bashi rises gently over its length and has a square platform, the san-no-ma, on its upstream side, where tradition says Hideyoshi had water drawn for tea. Michi’s leap from this bridge goes upstream, off the san-no-ma, and the current brings the cat back under the deck.',
    how: ['A parabolic bow over the span on three pier bents.', 'The san-no-ma has its own kōran, with the main railing opened to it.', 'Uji is the river of Kyoto Animation’s Sound! Euphonium.'],
    code: `const yAt = profile(c, (dz) => H + bow * (1 - (dz / (L / 2)) ** 2));
koran(P, { x: upstream, ..., skip: [sz0, sz1] });   // opening`,
    use: 'a tea-house landmark on the river.', sources: S('uji', 'uji2')
  },
  {
    id: 'b-stones', family: 'bridges', kind: 'bridge', type: 'stones', name: 'Kame-ishi', jp: '亀石', gpu: 1,
    tag: 'no bridge: turtles, plovers and blocks',
    blurb: 'The Kamo River’s stepping stones: concrete turtles, plovers and plain blocks, about a metre long, laid in 1992 at the Demachiyanagi delta. They hold back gravel the rapids would scour; locals read the river off them (“the turtle is in up to its neck”). On the stage they are always downstream; here they are the only way across.',
    how: ['Each turtle: a plinth, a domed shell, head and four flippers. Plovers: a long block with a beak and fan tail.', 'Their tops sit 24 cm over normal water; the stage HUD says when a turtle is up to its neck.', 'Each stone is a flow obstacle: wakes and pillows.'],
    code: `blob(P, 'concrete', x, top - .13, z, .5, .14, .56);  // shell
blob(P, 'concrete', head..., .13, .085, .17);       // head
ellipseSolid({ x, z, rx, rz, top: dome });`,
    use: 'the valley river below the bridge.', sources: S('kameishi', 'delta')
  },

  /* ---------------- paddies ---------------- */
  {
    id: 'p-game', family: 'paddies', kind: 'paddy', paddy: 'game', name: 'Ours today', jp: 'いまの田', gpu: 1,
    tag: 'flat sheets and cone rice',
    blurb: 'buildPaddies() as it ships: a translucent tinted sheet over a mud plane, box ridges, and four-sided cones for rice scattered at random. The shader’s cat’s-paws are good; the rice is not rice.',
    how: ['The paddy shader ported in spirit: tint, Fresnel sky, duckweed film by the bunds.', 'Cone stalks, one per 1.6 m², randomly placed.', 'The baseline.'],
    code: `const riceGeo = new THREE.ConeGeometry(0.05, 0.5, 4);
for (...) dummy.position.set(px + (random() - .5) * (w - 1.2), .26, ...);`,
    use: 'the before picture.', sources: []
  },
  {
    id: 'p-mirror', family: 'paddies', kind: 'paddy', paddy: 'mirror', name: 'Mizukagami', jp: '水鏡', gpu: 3,
    tag: 'spring: the water mirror',
    blurb: 'From May into early June the flooded, freshly puddled paddies hold the sky. Windless mornings give the clearest mirror; a gust sends cat’s-paws across and breaks it. Each plot here has its own planar reflection at its own level.',
    how: ['A mirror per plot (0.35 resolution), off in Eco quality.', 'Still water over dark mud: the reflection wins at any low angle.', 'Cat’s-paw gusts drift across and roughen the sheet.'],
    code: `float F = clamp(fres + .35 * (1. - gust * .6), 0., 1.);
col = mud * absorb * (1. - F) + mirror * F + spec;`,
    use: 'spring in the valley, and every photo of it.', sources: S('mirrorPaddy')
  },
  {
    id: 'p-taue', family: 'paddies', kind: 'paddy', paddy: 'taue', name: 'Taue', jp: '田植え', gpu: 3,
    tag: 'early summer: seedlings in rows',
    blurb: 'Machine transplanting puts rice in rows 30 cm apart, hills 15 cm apart along them, a few seedlings a hill in 2–3 cm of water. The rows are the first thing you see; the frogs are the first thing you hear. Walk Michi along a ridge.',
    how: ['Instanced hills on the 30 × 15 cm grid: about 22 hills per square metre.', 'Four seedling blades a hill, about 15 cm tall.', 'Amagaeru sit on the ridges and plop into the water when Michi comes near.'],
    code: `for (x = ix0; x < ix1; x += .30)    // rows
  for (z = iz0; z < iz1; z += .15)  // hills
    spots.push([x + jitter, floor, z + jitter]);`,
    use: 'early summer, and frog song at dusk.', sources: S('jarq', 'irri', 'frogs')
  },
  {
    id: 'p-summer', family: 'paddies', kind: 'paddy', paddy: 'summer', name: 'Ao-ta', jp: '青田', gpu: 4,
    tag: 'high summer: green waves',
    blurb: 'By late July the rice is about 70 cm, taller than a cat, and the wind sends waves across the field. Michi pushes the stalks aside. The water is mostly hidden now, green with algae where it shows.',
    how: ['Eleven arching blades a hill, vertex-coloured base to tip.', 'Honami: a travelling wave in the vertex shader, cubed so the crests are narrow.', 'Stalks lean away from the cat inside a 35 cm radius.'],
    code: `float wave = pow(sin(dot(base, wind) * .9 - t * 1.5) * .5 + .5, 3.);
vec2 bend = wind * (.05 + .22 * wave) * gust * h * h;
bend += away / d * smoothstep(r, 0., d) * .5 * h;`,
    use: 'summer, where the cat disappears into the field.', sources: S('jarq')
  },
  {
    id: 'p-autumn', family: 'paddies', kind: 'paddy', paddy: 'autumn', name: 'Inaho', jp: '稲穂', gpu: 4,
    tag: 'autumn: gold heads and the drying rack',
    blurb: 'Near a metre tall at heading, the panicles nod gold. The field is drained to puddles for the harvest, and the sheaves go up on a hasakake (haza, inagi) rack to dry in the sun, slower and gentler than a machine dryer.',
    how: ['Ten blades and four drooping panicles a hill.', 'Drained water: only puddles in the ruts survive.', 'The hasakake on the stage appears in autumn: crossed legs, three poles, sheaves hung heads-down.'],
    code: `float pud = smoothstep(.52, .6, vnoise2(p * 1.1) * .7
                              + vnoise2(p * 4.3) * .3);
if (pud < .02) discard;`,
    use: 'autumn, with the valley’s harvest.', sources: S('haza', 'hasakake')
  },
  {
    id: 'p-winter', family: 'paddies', kind: 'paddy', paddy: 'winter', name: 'Fuyuta', jp: '冬田', gpu: 2,
    tag: 'winter: stubble and ice',
    blurb: 'Cut stubble in its rows, a skin of cracked ice on what water is left, and snow drifted against the ridges. Michi can walk on the ice.',
    how: ['Stubble: nine short open tubes a hill, straw coloured.', 'Ice: Voronoi cracks, frost noise, a faint reflection; ripples damped to almost nothing.', 'The ground shader lays snow on whatever faces up.'],
    code: `vec3 vo = voronoi2(p * 2.4);
float crack = 1. - smoothstep(0., .03, vo.y - vo.x);
ice = mix(ice, refl, .25 + fres * .5) * (1. - crack * .3);`,
    use: 'winter, and the quiet of it.', sources: []
  }
];

VARIANTS.forEach((v, i) => { v.index = i; });
export const byId = (id) => VARIANTS.find((v) => v.id === id);
