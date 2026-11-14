// Page data: the wall/ridge/kasumi options, the learn-by-building passes,
// and the research source list (mirrors research.md).
export const WALL_METHODS = [
  { value: 'mass', label: 'Leaf-mass instances', hint: 'the game’s way · 4 variants' },
  { value: 'cards', label: 'Crossed cards', hint: '2 quads per tree · one draw' },
  { value: 'impostor', label: 'Octahedral impostors', hint: 'one quad · 16 baked views' },
  { value: 'painted', label: 'Painted treeline', hint: 'one cylinder · one texture' },
  { value: 'off', label: 'No wall', hint: 'the field alone' }
];

export const RIDGE_MODES = [
  { v: 'patch', label: 'Heightfield', title: 'The game’s way: one displaced plane, baked colours' },
  { v: 'stack', label: 'The stack', title: 'Three frieze arcs that share one air' },
  { v: 'paper', label: 'Paper', title: 'Same stack, three gouache bands of light' }
];

export const KASUMI_STYLES = [
  { value: 'none', label: 'No kasumi' },
  { value: 'heian', label: 'Heian soft', hint: '平安霞 · transparent indigo' },
  { value: 'suyari', label: 'Suyari crisp', hint: 'すやり霞 · spear-head bands' },
  { value: 'edo', label: 'Edo gold', hint: '金地雲 · gilded cloud' }
];

export const STACK_PROFILES = [
  { value: 'higashiyama', label: 'Higashiyama 36 peaks', hint: '東山三十六峰' },
  { value: 'kitayama', label: 'Kitayama cedars', hint: '北山杉' },
  { value: 'atago', label: 'Mt. Atago', hint: '愛宕山' },
  { value: 'arashiyama', label: 'Arashiyama', hint: '嵐山 · momiji' },
  { value: 'valley-near', label: 'The valley’s own', hint: '麓の丘' },
  { value: 'paper', label: 'Paper range', hint: '大和絵' }
];

/* The learn-by-building passes, applied live to the hero valley. */
export const STEPS = [
  {
    title: 'The field alone',
    body: `<p>Everything starts as a flat disc of painted meadow. The playable bowl stays flat to r ≈ 55 — the game’s own promise — while <code>worldNoise</code> lays broad pools of darker grass over it. No wall, no ranges: the eye slides straight off the world.</p>`,
    code: `terrainPatch({\n  size: 560, seg: 150,\n  heightAt: terrainHeight,\n  colorAt: meadowColors // ported from buildGround\n});`,
    state: { wall: 'off', carpet: false, ridges: 'patch', kasumi: 'none' }
  },
  {
    title: 'The edge’s two belts',
    body: `<p>Against the trees, shrubs and climbers make the <em>mantle</em> (マント群落); in front of them, a knee-high <em>sode</em> (ソデ) sleeve of herbs softens the meeting of grass and wood. Field ecology names the layers; the game builds only the mantle.</p>`,
    code: `edgeBelts(F, {\n  r0: 35.5, r1: 43.5, count: 140,\n  // mantle: instanced bushGeometry\n  // sode:   instanced lumpyTuftGeometry, flat & pale\n});`,
    state: { wall: 'mass', carpet: false, ridges: 'patch', kasumi: 'none' }
  },
  {
    title: 'The forest wall',
    body: `<p>230 instanced trees from the real <code>buildCanopy</code> — four leaf-mass variants, painted at load, swaying in the shared wind. This is <code>buildEdgeForest</code> verbatim: the ring that holds the valley in.</p>`,
    code: `instancedWall(F, {\n  count: 230, r0: 37, r1: 44,\n  variants: 4, style: 'masses',\n  massMap: leafMassTexture('leaf')\n});`,
    state: { wall: 'mass', carpet: false, ridges: 'patch', kasumi: 'none' }
  },
  {
    title: 'The foothill carpet',
    body: `<p>2,600 instanced cones and crowns ride the real <code>terrainHeight</code> — sugi spires on the steeps, broadleaf crowns below. The sector’s <code>opening</code> thins them toward the pagoda so the south stays sunlit.</p>`,
    code: `foothillCarpet(F, terrainHeight, {\n  count: 2600, r0: 55, r1: 185,\n  cedarChance: r < 95 ? 0.5 : 0.78\n});`,
    state: { wall: 'mass', carpet: true, ridges: 'patch', kasumi: 'none' }
  },
  {
    title: 'One range becomes three',
    body: `<p>The game’s single displaced plane works, but its near, mid and far rings share one material and one baked haze. Cut them into three frieze arcs — each a silhouette with a shoulder — and every range can hold its own veil, its own light, its own mist at the feet.</p>`,
    code: `arcFriezeGeometry(profile, {\n  radius: 300, arc: 4.7, height: 105,\n  wall: (a) => terrainSector(...).wall\n  // sinks at the flanks, vanishes south\n});`,
    state: { wall: 'mass', carpet: true, ridges: 'stack', kasumi: 'none' }
  },
  {
    title: 'Kasumi divides the planes',
    body: `<p>Mist bands are the oldest depth cue in the book — かすみ does the compositing a painter does by hand. The Heian style is a soft indigo wash; the later <em>suyari-gasumi</em> carries crisp rounded spear-heads; the Edo screens gild it. Each band scrolls, slow.</p>`,
    code: `kasumiGroup('suyari', [\n  { y: 4.2, z: -62,  width: 150, height: 12 },\n  { y: 7.5, z: -92,  width: 190, height: 15 },\n  { y: 12,  z: -168, width: 260, height: 17 }\n]);`,
    state: { wall: 'mass', carpet: true, ridges: 'stack', kasumi: 'suyari' }
  },
  {
    title: 'The air itself',
    body: `<p>Every layer now samples the same air: exponential veils by distance (Gurney’s wedding veils), a veil colour that bends toward the sun (Quilez), wavelength extinction warming the far ridge, and one cloud field throwing shadows over every slope at once. Turn the hour dial — the whole backdrop follows.</p>`,
    code: `fog = 1 - exp(-d * β)\nextinct = exp(-d * (r, g, b) )\nveil  = mix(horizon, sunCol, pow(dot(dir, sun), 8))\ncloud = cloudField(pos.xz * s + wind * t)`,
    state: { wall: 'mass', carpet: true, ridges: 'stack', kasumi: 'suyari' }
  },
  {
    title: 'The gilded hour',
    body: `<p>One more pass: the Edo-gold band and a lower sun. Reverse aerial perspective warms the farthest ridge instead of cooling it — the screens knew this six hundred years before the shader papers. Michi’s valley at golden hour, or something close.</p>`,
    code: `rig.setHour(17.8)\nkasumi: 'edo'\nair.u.uVeilSun = 1.4   // warm bend\nair.u.uSunTint = 0.5   // sun-stained slopes`,
    state: { wall: 'mass', carpet: true, ridges: 'stack', kasumi: 'edo' },
    hour: 17.8
  }
];

export const SOURCES = [
  { title: 'Aerial perspective — Wikipedia', url: 'https://en.wikipedia.org/wiki/Aerial_perspective', note: 'The standard account: contrast and saturation fall with distance, colour shifts toward the sky’s background. Warned not to trust the simple linear model.' },
  { title: 'Color and Light · Atmospheric perspective — James Gurney', url: 'https://gurneyjourney.blogspot.com/2011/11/color-and-light-part-8-atmospheric.html', note: 'The “wedding veil” model — exponential attenuation, not linear — and the rule that each farther plane carries more sky light than the last.' },
  { title: 'Atmospheric distance and value — Gurney', url: 'https://gurneyjourney.blogspot.com/2010/05/atmospheric-distance-and-value.html', note: 'Measuring the falloff: darker objects hold value longer than light ones; the farthest planes approach the horizon’s own value.' },
  { title: 'Reverse aerial perspective — Gurney', url: 'https://gurneyjourney.blogspot.com/2011/11/reverse-atmospheric-perspective.html', note: 'Counter-example documented by painters: near a low sun the distant ridge warms instead of cooling. Our air bench reproduces it with one uniform.' },
  { title: 'Fog — Inigo Quilez', url: 'https://iquilezles.org/articles/fog.htm', note: 'The sun-aware scattering trick: tint the fog colour toward the sun by pow(dot(rayDir, sunDir), 8). One dot product, and low sun lights the whole veil.' },
  { title: 'Kyoto’s basin topography — Kyoto City', url: 'https://www.city.kyoto.lg.jp/', note: 'The city sits in a basin walled on three sides: Higashiyama east, Kitayama and Mt. Atago north-west, Arashiyama west — opening only to the south. The valley’s own sector mask is the same shape.' },
  { title: 'Higashiyama forests — Japan Forestry Agency', url: 'https://www.rinya.maff.go.jp/', note: 'The east mountains in public forest: red pine ridges historically cropped for fuel, now dark cedar and cypress stands — the “leaf mass” colour band our wall uses.' },
  { title: 'Kasumi — JAANUS dictionary', url: 'http://www.aisf.or.jp/~jaanus/', note: 'Mist bands that divide picture planes into foreground, middle and background; the compositing device of Heian Yamato-e.' },
  { title: 'Suyari-gasumi — JAANUS / museum entries', url: 'http://www.aisf.or.jp/~jaanus/', note: 'The Kamakura-onward style: straight-edged mist with clean rounded lobes — “spear-head mist” — the band in our middle plane.' },
  { title: 'Rakuchū rakugai-zu (scenes in and around Kyoto)', url: 'https://en.wikipedia.org/wiki/Scenes_in_and_around_Kyoto', note: 'The screens that close the composition in gold mist — the Edo band, kinji — and the panoramic stacked-ridge reading of the basin.' },
  { title: 'Musgrave · Procedural fractal terrains', url: 'https://dl.acm.org/doi/book/10.5555/5648', note: 'Ridged multifractal: fold the basis (1 − |n|), sharpen, weight octaves. The far peaks’ silhouette function, and the game’s own folded-noise ridges.' },
  { title: 'Ryan Brucks — Impostor baking (80.lv tutorial)', url: 'https://80.lv/articles/tutorial-creating-tree-impostors-in-unreal/', note: 'The production recipe: render the asset from an octahedral grid into one atlas, then one quad per instance picks frames by view direction.' },
  { title: 'Improved impostors — LightBulbBox', url: 'https://lightbulbbox.itch.io/', note: 'Per-frame normal/depth maps and bilinear frame blending — where our blend=1 uniform aims; per-object impostors still beat per-pixel when the silhouettes are forgiving.' },
  { title: 'The multiplane camera — Disney/SMPE history', url: 'https://en.wikipedia.org/wiki/Multiplane_camera', note: 'Painting divided onto glass planes and pulled apart for parallax: the “stack” view here is the same machine, rebuilt in one draw call per plane.' },
  { title: 'Cloud shadows on terrain — tosijs / Mirza Beig', url: 'https://tosiasander.itch.io/', note: 'A single top-down cloud field sampled by world-space xz and scrolled by wind; shadows darken before lighting so sun and ambient dim together.' },
  { title: 'Japan Shader — Konrad Earth', url: 'https://konrad.earth/', note: 'Painting Japan in fragment shaders: layered ridge silhouettes, moving kasumi bands, value-graded distance. The strongest prior art for this exact scene.' },
  { title: 'Kameoka basin fog (京都・亀岡の霧)', url: 'https://www.kyoto-kameoka-kankou.jp/', note: 'Kyoto’s neighbour basin fills with radiation fog on autumn dawns — the physical reference for the mist ring and the foot-mist bands.' },
  { title: 'Mantle and sode communities — forest-edge ecology', url: 'https://www.jstage.jst.go.jp/', note: 'Japanese forest-edge studies name the shrub belt (mantle) and the low herbaceous sleeve (sode) the wall’s foot is really made of.' },
];
