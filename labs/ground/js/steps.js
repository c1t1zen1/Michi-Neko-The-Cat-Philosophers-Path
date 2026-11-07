// Build it up: twelve steps from the game's floor to the corner. Each step is
// cumulative: it sets the whole feature list, so going back works too.
const OFF = { ANTI: 0, HBLEND: 0, POM: 0, WEAR: 0, WET: 0, SNOW: 0, PRINTS: 0, GROOVES: 0, MACRO: 0, FRINGE: 0, TOON: 0, EDGEINK: 0, DEBUG: 0 };
const ON = [
  {}, {},
  { HBLEND: 1 },
  { ANTI: 3, MACRO: 1 },
  { POM: 1 },
  {},
  { WEAR: 1, PRINTS: 1 },
  { FRINGE: 1 },
  { WET: 1 },
  { GROOVES: 1 },
  { SNOW: 1 },
  {}
];
function setup(i, stage, ui, extra = () => {}) {
  const d = { ...OFF };
  for (let k = 0; k <= i; k++) Object.assign(d, ON[k]);
  stage.setDefines(d);
  stage.setGameToday(i === 0);
  stage.opt.grass = i === 0 || i >= 5;
  stage.opt.litter = i >= 10;
  stage.opt.finish = i >= 11 ? 0.55 : 0;
  stage.opt.grade = i >= 11 ? 1 : 0.35;
  stage.opt.wearOn = i >= 6;
  stage.U.uFringe.value = i >= 7 ? 1 : 0;
  stage.U.uCool.value = i >= 7 ? 0.55 : 0;
  ui.finishCtl?.set(stage.opt.finish);
  extra();
}

export const STEPS = [
  {
    title: 'The game today',
    body: '<p>The valley’s floor is one 260 m plane: a tiling meadow texture, tinted by vertex colour so the repeat hides under broad painterly patches. The paths are ribbons laid on top: a cobble strip, and a dirt strip under it whose edges fade by a UV alpha. That is the “shoulder”. Nothing blends by height, nothing gets wet, and wherever the grass thins the tiling shows.</p>',
    code: `// countryside.js, buildGround()\nconst ground = new THREE.Mesh(geo, texturedMaterial(groundTextures(6), {\n  roughness: 0.96, repeat: [size / 3.2, size / 3.2] }));\nground.material.vertexColors = true;\n// buildPathShoulders(): a 6.4 m strip, alpha fades across u\ndiffuseColor.a *= smoothstep(0.0, 0.42, vU) * smoothstep(1.0, 0.58, vU) * 0.9;`,
    apply: (stage, ui) => setup(0, stage, ui)
  },
  {
    title: 'Seven painted grounds',
    body: '<p>Each ground is painted at load time on a 256 px canvas with ragged dabs, big shapes first and grit last, the order Kazuo Oga paints in. Masa-do (decomposed granite, warm ochre with quartz grit and black biotite flecks), the game’s own meadow floor, sugigoke moss, tamajari pebbles, Shirakawa sand, tataki and pine needles. Height rides in the alpha channel. Here they are mixed linearly, which is how most splat maps work: edges are soft blurs.</p>',
    code: `const t = new Tile(seed, '#b7a283', 0.42);   // base colour, base height\nt.wash(26, palette, [26, 64], [0.18, 0.4]);  // big shapes\nt.dome(x, y, r, r, rot, edge, top, h0, h1);  // pebbles, moss cushions\nt.speck(2600, grit, height);                  // grit last`,
    apply: (stage, ui) => setup(1, stage, ui)
  },
  {
    title: 'Blend by height',
    body: '<p>Add each layer’s weight to its own height and keep only what lies within a narrow band of the top (Mishkinis). Sand falls into the cracks between pebbles; moss climbs into the joints between setts; stone tops stay clean. Set the band to zero and it is the linear splat again.</p>',
    code: `float ma = max over layers (h[i] * .55 + w[i]) - uBlend;\nb[i] = max(h[i] * .55 + w[i] - ma, 0.);   // then normalise`,
    apply: (stage, ui) => setup(2, stage, ui)
  },
  {
    title: 'Break the tile',
    body: '<p>Hex-tiling (Mikkelsen 2022): three samples from a triangle grid, each tile rotated about its own centre and offset by a hash, blended by barycentric weights sharpened to the 7th power and nudged by luminance. One grid per pixel is shared by every layer. On top, two very large noises shift value and warmth, the “big shapes” a painter puts down before any detail.</p>',
    code: `vec2 q1 = (R1 * (st - c1) + c1) * cell / tile + o1;   // and q2, q3\nvec3 W = mix(vec3(1.), vec3(lum(a1), lum(a2), lum(a3)), .6) * pow(w, vec3(7.));\na = (W.x * a1 + W.y * a2 + W.z * a3) / (W.x + W.y + W.z);`,
    apply: (stage, ui) => setup(3, stage, ui)
  },
  {
    title: 'Stone you can feel',
    body: '<p>The stone paving is not a texture: setts, slabs, nobedan, arare-koboshi, irokojiki and araidashi are evaluated in world space, so their joints are crisp at any distance and the CPU knows every stone. Near the camera, parallax occlusion marches the view ray into the stone height (ten steps and a secant), fading out by nine metres. Stepping stones are real geometry that Michi steps up onto.</p>',
    code: `vec2 dir = -V.xz / max(V.y, .25) * uPomH;\nfor (int s = 0; s < 10; s++) { if (cur >= hh) break; cur += layer; o += dir * layer;\n  hh = 1. - pavingH(p + o, style); }\npp = p + o - dir * layer * t;              // secant refinement`,
    apply: (stage, ui) => setup(4, stage, ui)
  },
  {
    title: 'The grass agrees',
    body: '<p>The game’s own <code>GrassSystem</code> grows here, but its biome mask is written from the ground field every quarter second: grass where the splat says grass, an edge thicket where the verge meets bare ground, roadside flowers along the shoulders. The ground under the blades is the game’s meadow floor, so the two never disagree.</p>',
    code: `field.writeGrassMask(mask);   // r meadow, g edge thicket, b flowers, a wild\n// meadow = grass * (1 - smoothstep(.06, .42, wear))`,
    apply: (stage, ui) => setup(5, stage, ui)
  },
  {
    title: 'Feet write the path',
    body: '<p>Every paw-down raises the wear field G a little, saturating as it nears full: Q = I (1 − G/Gmax). Everywhere, G relaxes back toward its natural value with a time constant T. That is the active walker model of Helbing and colleagues. Grass thins, then goes; moss wears through to earth; the earth packs down 4.5 cm and darkens; and the shoulder is simply where G is in between. Let the village cats roam, or let a season pass.</p>',
    code: `dG/dt = (G0 − G) / T  +  I (1 − G / Gmax) Σ δ(r − r_paw)\ne = ∇[U + V_tr] / |∇[U + V_tr]|        // the walkers' heading\nV_tr = G blurred (σ ≈ 0.9 m) × attraction`,
    apply: (stage, ui) => setup(6, stage, ui)
  },
  {
    title: 'Light through the leaves',
    body: '<p>The maple and the pine are the game’s own canopies, alpha-cut leaf sprays with matching depth materials, so their shade is leaf-shaped and moves in the wind. The ground keeps the sun’s shadow term: where shade meets light it adds a thin warm fringe (real komorebi glows at its edges), and the shade itself leans blue, the way Ghibli’s does, instead of going grey.</p>',
    code: `float fr = gSun * (1. - gSun) * 4.;        // only at the penumbra\noutgoingLight += albedo * uSunCol * fr * vec3(1., .58, .22) * .55;\noutgoingLight *= mix(vec3(1.), uShadowTint, (1. - gSun) * uCool);`,
    apply: (stage, ui) => setup(7, stage, ui, () => ui.setHour(15.5))
  },
  {
    title: 'Rain and what it leaves',
    body: '<p>Wetness after Lagarde: porous ground darkens toward 20 % of its albedo, smooth stone gets a glossy film, and the film goes before the darkening does. Shirakawa sand goes nearly black (the mica). The water level rises with the rain and fills the lowest ground first: the ditch, then the ruts the cats wore, then the low spots. Only compacted or paved ground holds a puddle. Rain rings run on hashed cells, three by three.</p>',
    code: `col *= mix(1., mix(1., .22, porosity), wet);\nfloat depth = (uWater - ground) * imperm;   // imperm: worn earth, stone\nN = normalize(N + vec3(rainRings(p * 6., t), 0.) * pud);`,
    apply: (stage, ui) => setup(8, stage, ui, () => ui.setSky('after'))
  },
  {
    title: 'The gardener’s hand',
    body: '<p>A rake drags twelve teeth over 76 cm; a broom leaves fine streaks (hōkime). Both draw into a coarse buffer that stores only how far across the stroke a texel is, so the ridges themselves are computed in the shader, sharp at any zoom. Raking wipes paw prints; paw prints break the ridges. Uchimizu throws a fan of water that darkens where each drop lands and dries in the sun.</p>',
    code: `float ac = (g.r * 2. - 1.) * .38;            // metres across the rake\nh = .5 + .5 * cos(ac / .063 * PI2);           // a ridge every 6.3 cm`,
    apply: (stage, ui) => setup(9, stage, ui, () => ui.setSky('clear'))
  },
  {
    title: 'The seasons',
    body: '<p>Spring petals blow in from the west and drift against whatever catches them: grass, kerbs, ruts, the foot of the inuyarai. In autumn the maple turns and drops its leaves, which rain glues down. In winter the gardener lays shikimatsuba, pine needles, over the roji moss to keep the frost off, and snow lies on what faces the sky until paws and the broom take it away.</p>',
    code: `const hold = catches(x, z);   // grass, kerbs, low ground, walls\nconst push = max(0, gust - .35 - hold * 1.2);\nleaf.x += wind.x * push * dt;`,
    apply: (stage, ui) => setup(10, stage, ui, () => ui.setSeason('autumn'))
  },
  {
    title: 'The painted finish',
    body: '<p>Kyoto Animation keeps real light and lets it bloom; Oga’s greens are muted, with a warm colour beside them. So the stage renders into a target, and one pass adds a glow from a blurry mip, cool shade and warm light, a sun haze and a Kuwahara brush (four windows, keep the calmest) with paper tooth. Slide “Painted” from photograph to painting.</p>',
    code: `vec3 blur = textureLod(uSrc, uv, 4.5).rgb;   // glow, nearly free\nc *= mix(vec3(.9, .97, 1.13), vec3(1.05, 1., .9), smoothstep(.25, .9, L));\nvec3 paint = kuwahara(uv, px);`,
    apply: (stage, ui) => setup(11, stage, ui)
  }
];
