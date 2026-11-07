// The specimen shelves. Every family opens with the game's own version of
// that part (from src/countryside.js buildDistantPagoda), then the recipes.
// `tile` says how the live view is built (see tiles.js); `apply` says what
// "Try on the tower" changes on the viewing platform.
import { PRESETS } from './presets.js';
import { FINISHES } from './finish.js';

export const SOURCES = {
  iitk: ['IITK / WCEE: earthquake response of the Hōryū-ji five-storey pagoda', 'https://www.iitk.ac.in/nicee/wcee/article/1229.pdf'],
  yamahata: ['Yamahata, Goto & Ando (2008): A study on the roof curve of Japanese pagodas, JGG 12(2)', 'https://www.heldermann-verlag.de/jgg/jgg12/j12h2yama.pdf'],
  tokyo: ['Wikipedia: Tokyō (architecture), bracket sets and steps', 'https://en.wikipedia.org/wiki/Toky%C5%8D_(architecture)'],
  pagoda: ['Wikipedia: Japanese pagoda (teigen, shinbashira, sōrin)', 'https://en.wikipedia.org/wiki/Japanese_pagoda'],
  sorin: ['Wikipedia: Sōrin, its parts top to bottom', 'https://en.wikipedia.org/wiki/S%C5%8Drin'],
  jaanusUkebana: ['JAANUS: ukebana (double row of lotus petals)', 'https://aisf.or.jp/~jaanus/deta/u/ukebana.htm'],
  jaanusKoran: ['JAANUS: kōran (three-rail balustrade)', 'https://aisf.or.jp/~jaanus/deta/k/kouran.htm'],
  jaanusOgi: ['JAANUS: ōgidaruki (fan rafters)', 'https://aisf.or.jp/~jaanus/deta/o/ougidaruki.htm'],
  jaanusSumigi: ['JAANUS: sumigi (hip rafter)', 'https://aisf.or.jp/~jaanus/deta/s/sumigi.htm'],
  jaanusMitesaki: ['JAANUS: mitesaki tokyō', 'https://projects.mcah.columbia.edu/jaanus/record/mitesakitoky%C5%8D'],
  toji: ['Tō-ji: the five-storied pagoda', 'https://toji.or.jp/en/inside/pagoda.html'],
  daigoji: ['MLIT: Daigo-ji Gojū-no-tō (38 m, sōrin ≈ 13 m)', 'https://www.mlit.go.jp/tagengo-db/en/R1-00324.html'],
  muroji: ['MLIT: Murō-ji five-storied pagoda (16.1 m, cypress bark)', 'https://www.mlit.go.jp/tagengo-db/en/R1-00975.html'],
  ruriko: ['Yamaguchi City: Rurikō-ji pagoda restoration (hiwada-buki)', 'https://yamaguchi-city.jp/kozantop/restoration-en.html'],
  yasaka: ['Kyoto Travel: Hōkan-ji (Yasaka Pagoda)', 'https://kyoto.travel/en/destinations/hokanji-templeyasaka-pagoda/'],
  futakuBrit: ['Britannica: wind-bell (bells on pagoda eaves)', 'https://www.britannica.com/art/wind-bell'],
  niponica: ['Niponica: bells hung under the four corners of temple roofs', 'https://web-japan.org/niponica/niponica22/en/feature/feature09.html'],
  heckelPaint: ['Maxime Heckel: On crafting painterly shaders (Kuwahara)', 'https://blog.maximeheckel.com/posts/on-crafting-painterly-shaders'],
  heckelMoebius: ['Maxime Heckel: Moebius-style post-processing (Sobel on depth & normals)', 'https://blog.maximeheckel.com/posts/moebius-style-post-processing'],
  kyprianidis: ['Kang, Kyprianidis et al.: anisotropic Kuwahara filtering', 'https://www.umsl.edu/~kangh/Papers/kang-tpcg2010.pdf'],
  watercolor: ['Real-time watercolor for virtual environments (edge darkening, granulation)', 'https://www.cs.nthu.edu.tw/~chunfa/pcm2004.pdf'],
  quilez: ['Íñigo Quílez: better fog (extinction, in-scatter, sun glow)', 'https://iquilezles.org/articles/fog/'],
  gurneyOga: ['Gurney Journey: a demo by Kazuo Oga (wet-into-wet, large passages first)', 'https://gurneyjourney.blogspot.com/2017/03/demo-by-kazuo-oga.html'],
  obsessiveOga: ['Animation Obsessive: what Kazuo Oga thinks about backgrounds', 'https://animationobsessive.substack.com/p/what-kazuo-oga-thinks-about-when'],
  dangerousLight: ['Animation Obsessive: Dangerous Light (diffusion and glow in anime compositing)', 'https://animationobsessive.substack.com/p/dangerous-light'],
  impostor: ['Cinevva: open world in the browser, part 19 (impostors)', 'https://app.cinevva.com/blog/2026-05-04-open-world-browser-part-19-imposters'],
  octaForum: ['three.js forum: a forest of octahedral impostors', 'https://discourse.threejs.org/t/a-forest-of-octahedral-impostors/85735'],
  fadeTiles: ['3d-tiles-renderer: wrapFadeMaterial (Bayer fade)', 'https://app.unpkg.com/3d-tiles-renderer@0.4.19/files/src/three/plugins/fade/wrapFadeMaterial.js'],
  towersSkill: ['MengTo/Skills: threejs-towers (roof function, shared builders)', 'https://raw.githubusercontent.com/MengTo/Skills/main/agent-skills/web-design/threejs-towers/SKILL.md'],
  bellModal: ['CCRMA (DAFx-19): modal synthesis of bell sounds', 'https://ccrma.stanford.edu/~orchi/Documents/DAFx19_paper_34.pdf'],
  threeLOD: ['three.js docs: LOD', 'https://threejs.org/docs/#api/en/objects/LOD'],
  threeInst: ['three.js docs: InstancedMesh', 'https://threejs.org/docs/#api/en/objects/InstancedMesh'],
  threeLathe: ['three.js docs: LatheGeometry', 'https://threejs.org/docs/#api/en/geometries/LatheGeometry'],
  threeToon: ['three.js docs: MeshToonMaterial', 'https://threejs.org/docs/#api/en/materials/MeshToonMaterial'],
  game: ['src/countryside.js: buildDistantPagoda (the shipped tower)', '../../src/countryside.js']
};
const S = (...keys) => keys.map((k) => SOURCES[k]);

export const FAMILIES = [
  { key: 'tower', title: 'The tower, <em>nine ways</em>', jp: '塔', sub: 'Eight recorded towers and one made for the valley. The same builder every time: only the numbers change.' },
  { key: 'roof', title: 'Roof &amp; <em>the lift</em>', jp: '屋根と反り', sub: 'The measured corner rise, eras of curve, and four ways to cover a roof.' },
  { key: 'kumimono', title: 'Brackets, <em>kumimono</em>', jp: '組物', sub: 'From a single dark band to the full three-step cluster with its tail rafter.' },
  { key: 'eaves', title: 'Rafters &amp; <em>the eave edge</em>', jp: '垂木と軒先', sub: 'The underside is what you see from the street. Futanoki, fans and a painted cheat.' },
  { key: 'body', title: 'The <em>body</em>', jp: '軸部', sub: 'Columns, tie beams, plank doors, lattice windows, and Hōryū-ji’s skirt.' },
  { key: 'koran', title: '<em>Kōran</em>, the balconies', jp: '高欄', sub: 'The rail that rings every upper storey and gives each roof its shadowed lip.' },
  { key: 'sorin', title: 'The <em>sōrin</em>', jp: '相輪', sub: 'Eight bronze parts on one shaft: a quarter to a third of the tower.' },
  { key: 'bells', title: 'Fūtaku &amp; <em>corners</em>', jp: '風鐸', sub: 'Twenty bells, one at every eave corner, and the tiles that end each hip.' },
  { key: 'base', title: 'Podium &amp; <em>heart pillar</em>', jp: '基壇・心柱', sub: 'What the tower stands on, and the pillar that lets it sway instead of fall.' },
  { key: 'distance', title: 'Reading at <em>a kilometre</em>', jp: '遠景', sub: 'Detail tiers, crossfades, a baked impostor, and the air itself.' },
  { key: 'finish', title: 'The <em>finish</em>', jp: '画風', sub: 'One scene, eight hands. Physical light first, then paint.' }
];

const ORIG = (family, view, parts, extra = {}) => ({
  slug: 'orig-' + family, family, original: true,
  name: 'The game’s ' + ({ tower: 'pagoda', roof: 'roofs', kumimono: 'storey bands', eaves: 'eave edges', body: 'storey bodies', koran: 'storey joints', sorin: 'finial', bells: 'corners', base: 'dais', distance: 'pagoda at range' }[family]),
  jp: '原作', tag: 'src/countryside.js · buildDistantPagoda()',
  tile: { kind: 'orig', view, parts },
  apply: { compare: true },
  use: 'The reference to beat. “Compare with the game” splits the viewing platform: the shipped tower on the left, the new one on the right.',
  sources: S('game'),
  ...extra
});

const towerCode = (p) => `buildPagoda({ preset: '${p.key}' }, { detail: 'mid' });
// ${p.name}: H ${p.H} m · H/W₁ ${(+p.ratio).toFixed(2)} · top/first ${p.top}
// sōrin ${(p.sorin * 100).toFixed(0)}% · curve ${p.curve} from ${p.start}`;

export const VARIANTS = [
  /* ---------------- the tower ---------------- */
  ORIG('tower', 'tower', null, {
    blurb: 'Five boxes narrowing from 4.55 to 2.68 units, vermilion corner posts, four-sided cone roofs with box eaves and lifted corner sticks, and eight discs on a shaft. 93 meshes, scaled ×1.232 to 19.4 m beside the forest wall.',
    how: ['Each storey: a dark box, four vermilion posts, a timber rail and a vermilion band.', 'Roofs are ConeGeometry(radius, h, 4) turned 45°, flattened 10% in z.', 'Corner lift is a tilted 0.42-unit box at each corner.', 'The finial: a shaft, eight discs, a sphere and a cone.'],
    code: `const roof = new THREE.Mesh(new THREE.ConeGeometry(roofSpan / Math.SQRT2, roofH, 4), roofTileDark);
roof.rotation.y = Math.PI / 4;
roof.scale.set(1, 1, 0.9);
// ...
pagoda.scale.setScalar(1.12 * 1.1);`
  }),
  ...PRESETS.map((p) => ({
    slug: 'tower-' + p.key, family: 'tower', name: p.name, jp: p.jp, tag: `${p.era} · ${p.year} · ${p.H} m`,
    blurb: p.blurb,
    how: [`From the record: ${p.src}`, p.est.length ? `Estimated from photographs for the look: ${p.est.join(', ')}.` : 'Every proportion here is measured.', `Storey heights are solved so H ÷ W₁ = ${(+p.ratio).toFixed(2)} with the sōrin at ${(p.sorin * 100).toFixed(0)}% of the height.`],
    code: towerCode(p),
    use: p.key === 'valley' ? 'The candidate for the game: same height and footprint as today’s, with every part the shelves below can add.' : 'A preset for the viewing platform, and a reference for proportion.',
    tile: { kind: 'tower', opts: { preset: p.key } },
    apply: { preset: p.key },
    sources: S('iitk', 'yamahata', ...(p.key === 'toji' ? ['toji'] : p.key === 'daigoji' ? ['daigoji'] : p.key === 'muroji' ? ['muroji'] : p.key === 'ruriko' ? ['ruriko'] : p.key === 'yasaka' ? ['yasaka'] : []))
  })),

  /* ---------------- roof ---------------- */
  ORIG('roof', 'roof', ['roof', 'eave', 'corner'], {
    blurb: 'A four-sided cone, flat-shaded, with a box laid along each edge and a stick tilted up at each corner. It reads as a roof, but the eave line is straight and the corners are props.',
    how: ['ConeGeometry with four radial segments, rotated π/4.', 'flatShading: true on a dark tile colour.', 'Corners: box(0.13, 0.42, 0.13) rotated ±0.42 rad.'],
    code: `const upturnedCorner = box(0.13, 0.42, 0.13, roofEdgeMat, sx * roofSpan * 0.5, eaveY + 0.16, sz * roofSpan * 0.36);
upturnedCorner.rotation.z = sx * 0.42;
upturnedCorner.rotation.x = -sz * 0.42;`
  }),
  {
    slug: 'roof-straight', family: 'roof', name: 'Straight hip', jp: '直線', tag: 'The loft with no sori: a baseline',
    blurb: 'The same lofted roof with the corner rise set to zero. It shows how much of “pagoda” lives in the curve: without it the tower looks stacked, not lifted.',
    how: ['roofFrame() lofts each face from the eave square to the inner square.', 'rise = 0, flare = 0; the slope keeps its concave profile.'],
    code: `buildPagoda({ ...opts, sori: 0, flare: 0 });`,
    use: 'Only as a control.', tile: { kind: 'part', view: 'roof', opts: { sori: 0, flare: 0 } }, apply: { opts: { sori: 0, flare: 0 } }, sources: S('yamahata')
  },
  {
    slug: 'roof-heian', family: 'roof', name: 'Heian sori', jp: '古代の反り', tag: 'Curve from the centre · ratio 0.0365',
    blurb: 'Hōryū-ji’s measured kayaoi: the rise begins near the middle of each eave and grows the whole way out. Yamahata found every curve before the Edo period starts near the centre.',
    how: ['lift(u) = rise · x², x = (|u| − start) / (1 − start).', 'rise = 0.0365 × eave length, start = 0.1.', 'The lift fades up the slope as (1 − t)^1.6, so only the eave bends.'],
    code: `const lift = (a) => { const x = clamp((Math.abs(a) - start) / (1 - start), 0, 1); return x * x; };
const y = yE + rise * lift(u) * Math.pow(1 - t, 1.6) + (yR - yE) * g(t);`,
    use: 'The honest curve for an early tower.', tile: { kind: 'part', view: 'roof', opts: { curve: 0.0365, start: 0.1, sori: 1 } }, apply: { opts: { curve: 0.0365, start: 0.1, sori: 1 } }, sources: S('yamahata', 'towersSkill')
  },
  {
    slug: 'roof-edo', family: 'roof', name: 'Edo sori', jp: '近世の反り', tag: 'Curve from the ends · ratio 0.0209',
    blurb: 'Tō-ji (1644): the eave runs level for most of its length and turns up only near the corners. The paper calls the Edo curves a builder’s “mannerism”: technique without the eye.',
    how: ['start = 0.6: the first 60% of each half-eave stays straight.', 'rise = 0.0209 × eave length (Kyōō-gokoku-ji).'],
    code: `buildPagoda({ ...opts, curve: 0.0209, start: 0.6, sori: 1 });`,
    use: 'For an Edo tower, or to see why later roofs look stiffer.', tile: { kind: 'part', view: 'roof', opts: { curve: 0.0209, start: 0.6, sori: 1 } }, apply: { opts: { curve: 0.0209, start: 0.6, sori: 1 } }, sources: S('yamahata')
  },
  {
    slug: 'roof-painted', family: 'roof', name: 'Painted sori ×2.2', jp: '絵の反り', tag: 'Push the lift past life',
    blurb: 'Background painters exaggerate what must read at a distance. Doubling the measured rise and flaring the corners outward keeps the lift visible at 57 m from the valley bridge, where the real curve flattens to a pixel.',
    how: ['sori multiplies the measured ratio (here ×2.2).', 'flare pushes the eave corners outward in plan as well as up.', 'The lift is still a curve from the preset’s start: only the amplitude is drawn bigger.'],
    code: `const ext = R * flare * fu * (1 - t);              // corners reach out
const nd = rr + ext, td = u * rr + Math.sign(u) * ext;`,
    use: 'The valley preset uses ×1.8. Raise it for a smaller tower.', tile: { kind: 'part', view: 'roof', opts: { sori: 2.2, flare: 0.1 } }, apply: { opts: { sori: 2.2, flare: 0.1 } }, sources: S('gurneyOga', 'obsessiveOga')
  },
  {
    slug: 'roof-tile', family: 'roof', name: 'Hongawara in the shader', jp: '本瓦葺', tag: 'Round over pan tiles · one draw',
    blurb: 'The roof stays smooth; the fragment shader writes 0.3 m rows of round tiles over concave pans, course steps every 0.32 m, rain streaks, lichen and snow. Its bump fades with fwidth() so it never shimmers at range.',
    how: ['uv = (metres along the eave, metres up the slope): rows run straight down the slope and the hips cut them.', 'Height → normal by screen derivatives (perturbNormalArb), no tangents needed.', 'Age adds streaks and lichen; snow settles on up-facing faces and in the pans first.'],
    code: `float x = fract(p.x / uRib) - 0.5;
float rnd = sqrt(max(0.0, 1.0 - (x / 0.2) * (x / 0.2)));   // marugawara
float pan = -0.4 * (1.0 - pow(abs(x) / 0.5, 2.0));        // hiragawara
hh *= 1.0 - smoothstep(0.25, 0.9, fwidth(vRoofUv.x) / uRib);`,
    use: 'The mid tier everywhere, and the hero tier when tri budget matters.', tile: { kind: 'part', view: 'roof', opts: { roof: 'tile' } }, apply: { opts: { roof: 'tile' } }, sources: S('pagoda')
  },
  {
    slug: 'roof-ribbon', family: 'roof', name: 'Swept marugawara', jp: '丸瓦', tag: 'Real half-tubes, cut by the hips',
    blurb: 'Every row of round tiles is a half-tube swept up the lofted surface along its normal, stopping where it meets the hip. One merged mesh per roof; the shader adds the pan courses between.',
    how: ['For each row st: t runs from the eave to where |st| meets the hip line.', 'Surface normal from finite differences of roofFrame().S().', 'Five-segment half-circle cross-section, radius 8.5 cm.'],
    code: `F.S(k, u, t, p);
F.S(k, u + 0.01, t, pu).sub(p); F.S(k, u, t + 0.01, pt).sub(p);
n.crossVectors(pt, pu).normalize();
// ring of 6 verts: p + side·cos θ·r + n·sin θ·r`,
    use: 'The hero tier: what Michi sees from a neighbouring roof.', tile: { kind: 'part', view: 'roof', opts: { roof: 'ribbon' } }, apply: { opts: { roof: 'ribbon' } }, sources: S('towersSkill')
  },
  {
    slug: 'roof-bark', family: 'roof', name: 'Hiwada-buki', jp: '檜皮葺', tag: 'Cypress bark · Rurikō-ji, Murō-ji',
    blurb: 'Thin layers of cypress bark laid in fine courses, warm brown, with soft thick eaves. The shader draws 5 cm courses with a little wander and lets age dark-streak them.',
    how: ['uStyle 2: courses every 0.05 m + fine noise.', 'Warm base 0x6f4b33, rough 0.95.'],
    code: `float c = fract(p.y / 0.05 + vnoise2(p * vec2(1.5, 0.2)) * 0.4);
return smoothstep(0.0, 0.3, c) * 0.7 + vnoise2(p * vec2(9.0, 50.0)) * 0.3;`,
    use: 'A gentler, older roof for a mountain temple.', tile: { kind: 'part', view: 'roof', opts: { roof: 'bark' } }, apply: { opts: { roof: 'bark' } }, sources: S('muroji', 'ruriko')
  },
  {
    slug: 'roof-copper', family: 'roof', name: 'Dōban-buki', jp: '銅板葺', tag: 'Copper with rokushō patina',
    blurb: 'Standing seams every 45 cm and the green-blue verdigris of old copper, darker where rain runs. Half metal, half paint.',
    how: ['uStyle 3: a thin ridge every 0.45 m.', 'metalness 0.35, roughness 0.45, colour 0x5c9886 with streaks.'],
    code: `float x = fract(p.x / 0.45);
return (smoothstep(0.44, 0.5, x) - smoothstep(0.5, 0.56, x)) * 1.2;`,
    use: 'A later restoration look; catches the sky.', tile: { kind: 'part', view: 'roof', opts: { roof: 'copper' } }, apply: { opts: { roof: 'copper' } }, sources: S('pagoda')
  },
  {
    slug: 'roof-snow', family: 'roof', name: 'Snow on the tiles', jp: '雪', tag: 'Up-facing first, pans before crests',
    blurb: 'Snow settles where the surface faces the sky and the tile pans hold it, leaving the round rows and the eave edge dark: the line drawing a Kyoto winter makes of every roof.',
    how: ['snow = uSnow · smoothstep(0.3, 0.7, worldNormal.y + height · 0.12 + noise).', 'The bump flattens under snow; roughness rises.'],
    code: `float snowAmt = uSnow * smoothstep(0.3, 0.7, vRoofUp + rh * 0.12 + (n1 - 0.5) * 0.45);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.94, 0.96, 1.0), snowAmt);`,
    use: 'Winter on the viewing platform.', tile: { kind: 'part', view: 'roof', opts: { snow: 1 } }, apply: { season: 'winter' }, sources: S('pagoda')
  },

  /* ---------------- kumimono ---------------- */
  ORIG('kumimono', 'corner', ['band', 'post', 'body'], {
    blurb: 'No brackets: a dark timber rail at the foot of each storey and a vermilion band at its head stand in for the whole bracket zone.',
    how: ['box(bodyW + 0.34, 0.16, bodyD + 0.34, MAT.vermilion) at the storey head.', 'box(bodyW + 0.24, 0.16, …, MAT.timberDark) at its foot.'],
    code: `pagoda.add(box(bodyW + 0.24, 0.16, bodyD + 0.24, MAT.timberDark, 0, baseY + 0.18, 0));
pagoda.add(box(bodyW + 0.34, 0.16, bodyD + 0.34, MAT.vermilion, 0, baseY + storyH - 0.14, 0));`
  }),
  {
    slug: 'kumi-shadow', family: 'kumimono', name: 'A dark band', jp: '影', tag: 'Far tier · what a bracket zone is at 1 km',
    blurb: 'At range the three-step stack is just the darkest value under each roof. A box ring the depth of the projection, painted near-black, keeps that line.',
    how: ['One box per side, 2(hw + proj) long, proj deep, b tall.', 'Colour 0x1f1814: no texture, no detail.'],
    code: `B.box(2 * (hw + s.proj), s.b, s.proj, { x: c.x, y: c.y, z: c.z, ry: k * Math.PI / 2 });`,
    use: 'The far tier, and the impostor bake.', tile: { kind: 'part', view: 'corner', opts: { brackets: 'shadow', rafters: 'none' } }, apply: { opts: { brackets: 'shadow' } }, sources: S('gurneyOga')
  },
  {
    slug: 'kumi-shelf', family: 'kumimono', name: 'Stepped shelf', jp: '段', tag: 'Mid tier · four boxes per side',
    blurb: 'The silhouette of mitesaki without its parts: four continuous beams stepping out and up, alternating vermilion and ochre so the steps catch light.',
    how: ['Depths 0.6, 1.9, 3.3, 4.25 × block size; heights stepping to the purlin.', 'Lengths reach the diagonal, so corners close.'],
    code: `for (const [z, y0, hh, col] of [[0.6, 0.4, 1.0, ends], [1.9, 1.35, 0.85, paint], [3.3, 2.15, 0.8, ends], [4.25, 2.95, 0.5, paint]])
  T.box(2 * (hw + z * bs), hh * bs, z * bs, { ... });`,
    use: 'Mid distance: 100–400 px tall.', tile: { kind: 'part', view: 'corner', opts: { brackets: 'shelf' } }, apply: { opts: { brackets: 'shelf' } }, sources: S('tokyo')
  },
  {
    slug: 'kumi-card', family: 'kumimono', name: 'Painted card', jp: '絵', tag: 'Alpha-tested strip, tilted out',
    blurb: 'A canvas-painted rhythm of blocks and arms on a plane leaning out under the eave. It costs four quads and reads as brackets from the street, but goes flat from the side.',
    how: ['bracketCardTexture(): 256×64 canvas, one cluster per 64 px.', 'alphaTest 0.5, DoubleSide, rotated −0.42 rad about x.'],
    code: `const g = new THREE.PlaneGeometry(len, s.b * 0.9);
g.rotateX(-0.42); g.rotateY(k * Math.PI / 2);`,
    use: 'A cheap middle step, or for many far towers.', tile: { kind: 'part', view: 'corner', opts: { brackets: 'card' } }, apply: { opts: { brackets: 'card' } }, sources: S('threeInst')
  },
  {
    slug: 'kumi-mitesaki', family: 'kumimono', name: 'Mitesaki tokyō', jp: '三手先', tag: 'Three steps, odaruki, instanced',
    blurb: 'The full cluster: a daito on the column, arms projecting in three steps with blocks at every joint, lateral arms at each step, and the odaruki tail rafter levering the third step out. One InstancedMesh per cluster type per storey.',
    how: ['Clusters at the intermediate columns face out; corner clusters combine both faces and a diagonal arm to the hip.', 'Continuous purlins run along each step; kentozuka struts fill the bays.', 'Block size is nearly constant up the tower, so upper eaves project further in proportion, as at Hōryū-ji.'],
    code: `arm(2.1 * bs, 0, y, 0.5 * bs, true);  arm(2.6 * bs, 0, y, 0, false);   // step 1
// ... step 2 ...
B.beam(V(0, y + 0.95 * bs, -1.5 * bs), V(0, y + 0.05 * bs, 4.35 * bs), 0.42 * bs, 0.5 * bs); // odaruki
const m = new THREE.InstancedMesh(bracketCluster(bs, P), timber, xforms.length);`,
    use: 'The hero tier: close enough to count the blocks.', tile: { kind: 'part', view: 'corner', opts: { brackets: 'mitesaki' } }, apply: { opts: { brackets: 'mitesaki' } }, sources: S('tokyo', 'jaanusMitesaki', 'threeInst')
  },

  /* ---------------- eaves ---------------- */
  ORIG('eaves', 'eave', ['eave', 'corner', 'roof'], {
    blurb: 'Four boxes under each cone make a dark eave line; the underside is the cone’s open base. There is nothing to see from below.',
    how: ['box(roofSpan, 0.1, 0.14) along x, box(0.14, 0.1, roofSpan · 0.72) along z.'],
    code: `pagoda.add(box(roofSpan, 0.1, 0.14, roofEdgeMat, 0, eaveY, s * roofSpan * 0.36));
pagoda.add(box(0.14, 0.1, roofSpan * 0.72, roofEdgeMat, s * roofSpan * 0.5, eaveY, 0));`
  }),
  {
    slug: 'eave-plain', family: 'eaves', name: 'Plain soffit', jp: '軒裏', tag: 'Boards only',
    blurb: 'A lofted underside from the eave fascia in to the wall head, following the lift. In vermilion schemes it is white plaster-board; in natural ones, dark timber.',
    how: ['Grid from the fascia foot (t = 0) to (w/2, yB + 0.28·proj − rd).', 'Wound to face down; the corner lift carries through.'],
    code: `soff.add(gridGeometry(segU, 2, (a, b, out) => {
  F.S(k, a * 2 - 1, 0, out).add(V(0, -s.edgeH, 0));
  return out.lerp(onFace(k, hw, (a * 2 - 1) * hw, ySi), b);
}, uv, V(0, -1, 0)));`,
    use: 'Under any rafter set; on its own for the far tier.', tile: { kind: 'part', view: 'eave', opts: { rafters: 'none' } }, apply: { opts: { rafters: 'none' } }, sources: S('pagoda')
  },
  {
    slug: 'eave-painted', family: 'eaves', name: 'Painted rafters', jp: '描き垂木', tag: 'Mid tier · a 64 px stripe',
    blurb: 'The soffit carries a repeating stripe of rafter, gap and painted end, scaled so one repeat is one rafter spacing. From the street it is rafters; from the side it is paint.',
    how: ['uv.x = metres along the eave ÷ rafter spacing (7.5% of W₁).', 'Colours from the paint scheme: timber, boards, end caps.'],
    code: `x.fillStyle = css(P.timber); x.fillRect(20, 0, 24, 64);   // the rafter
x.fillStyle = css(P.ends);   x.fillRect(20, 60, 24, 4);   // its painted end`,
    use: 'Mid distance.', tile: { kind: 'part', view: 'eave', opts: { rafters: 'soffit' } }, apply: { opts: { rafters: 'soffit' } }, sources: S('pagoda')
  },
  {
    slug: 'eave-futanoki', family: 'eaves', name: 'Futanoki', jp: '二軒', tag: 'Base rafters + flying rafters',
    blurb: 'Two tiers: jidaruki run from the wall to past the outer purlin, hiendaruki ride on them to the eave, lifting with the sori. Near the corners each rafter starts at the hip, so they shorten into the corner the way parallel rafters do.',
    how: ['Rafter top line y(r) = yE + 0.28(R − r) plus the lift, fading inward.', 'Inner end at max(wall, |st|): the hip line.', 'Painted ends: a third InstancedMesh of tiny boxes.'],
    code: `const rIn1 = Math.max(hw + 0.01 * W, Math.abs(st));
if (rIn1 < rMid - sp) lower.push(between(pt(rIn1, st, 0), pt(rMid, st, 0), 0.024 * W, s.rd));
upper.push(between(pt(fStart, st, s.rd * 0.9), tip, 0.022 * W, s.rd * 0.85));`,
    use: 'The hero tier.', tile: { kind: 'part', view: 'eave', opts: { rafters: 'futanoki' } }, apply: { opts: { rafters: 'futanoki' } }, sources: S('jaanusSumigi', 'pagoda')
  },
  {
    slug: 'eave-fan', family: 'eaves', name: 'Ōgidaruki', jp: '扇垂木', tag: 'Fan rafters at the corners',
    blurb: 'In the corner zones the rafters swing toward a point on the wall, opening like a fan. A Zen-style and continental habit, with Nara-period examples excavated; it changes the corner from a grid into a flower.',
    how: ['Outside 35% of the wall half-width, inner ends converge: focus = 0.35·hw + (|st| − 0.35·hw)·0.3.', 'Each rafter splits into a lower and a flying length along its own ray.'],
    code: `const focus = Math.sign(st) * (hw * 0.35 + (a - hw * 0.35) * 0.3);
const q = onFace(k, hw, focus, yTopAt(hw) - s.rd / 2);
lower.push(between(q, q.clone().lerp(tip, 0.62), 0.022 * W, s.rd));`,
    use: 'A Zen-style variant; try it on Rurikō-ji.', tile: { kind: 'part', view: 'eave', opts: { rafters: 'fan' } }, apply: { opts: { rafters: 'fan' } }, sources: S('jaanusOgi')
  },
  {
    slug: 'eave-kayaoi', family: 'eaves', name: 'Kayaoi & tile ends', jp: '茅負・軒瓦', tag: 'The eave edge, one strip',
    blurb: 'The line that draws the roof at any distance. A vertical strip under the eave carries a row of round tile ends over a pale kayaoi board; one disc per tile row, so it lines up with the ribs above.',
    how: ['Fascia grid: S(k, u, 0) down by edgeH, uv.x = metres ÷ 0.3.', 'Yamahata: real kayaoi are about 1.2× taller at the ends than mid-eave, to correct for the view from below.'],
    code: `fasc.add(gridGeometry(segU, 1, (a, b, out) => F.S(k, a * 2 - 1, 0, out).add(V(0, -b * s.edgeH, 0)),
  (a, b, q) => [(q.x * tk.x + q.z * tk.z) / 0.3, 1 - b], NK[k]));`,
    use: 'Always: it is the roof’s outline.', tile: { kind: 'part', view: 'eave', opts: { rafters: 'futanoki' }, zoom: 0.55 }, apply: { opts: { rafters: 'futanoki' } }, sources: S('yamahata')
  },

  /* ---------------- body ---------------- */
  ORIG('body', 'body', ['body', 'post', 'band'], {
    blurb: 'A dark warm box per storey with a vermilion post at each corner. From the bridge it gives the tower its red rhythm; up close there are no doors, windows or bays.',
    how: ['box(bodyW, storyH, bodyD, warmWallMat 0x5a2e22).', 'Four box(0.18, storyH + 0.22, 0.18) posts in MAT.vermilion.'],
    code: `const body = box(bodyW, storyH, bodyD, warmWallMat, 0, bodyY, 0);
for (const sx of [-1, 1]) for (const sz of [-1, 1])
  pagoda.add(box(0.18, storyH + 0.22, 0.18, MAT.vermilion, sx * (bodyW / 2 - 0.06), bodyY, sz * (bodyD / 2 - 0.06)));`
  }),
  {
    slug: 'body-plain', family: 'body', name: 'Plain box', jp: '箱', tag: 'Far tier',
    blurb: 'Plaster box, corner posts, one head beam. What survives at 100 px.',
    how: ['Walls: one box with the plaster set from the game’s textures.js.', 'Corner posts and a head band only.'],
    code: `WL.box(s.w - colR, s.h, s.w - colR, { y: s.y0 + s.h / 2 });`,
    use: 'Far tier.', tile: { kind: 'part', view: 'body', opts: { body: 'plain' } }, apply: { opts: { body: 'plain' } }, sources: S('pagoda')
  },
  {
    slug: 'body-wayo', family: 'body', name: 'Wayō, three bays', jp: '和様', tag: 'Columns, nageshi, doors, renji',
    blurb: 'Round columns on every bay line, sill, lintel and head ties, plank doors studded with iron in the central bay and vertical-bar renji windows either side. Upper storeys below 60% width drop to two bays, as Hōryū-ji’s top storey does.',
    how: ['Columns deduplicated round the perimeter (12 for three bays).', 'Nageshi at 5%, 70% and 90% of the storey; a daiwa plate on top.', 'Door and window textures painted at load: 128×256 and 128×128.'],
    code: `const xs = s.bays === 3 ? [-hw, -hw / 3, hw / 3, hw] : [-hw, 0, hw];
for (const fy of [0.05, 0.7, 0.9]) for (let k = 0; k < 4; k++) T.box(s.w + colR * 2, bh, bd, { ... });`,
    use: 'Hero and mid tiers.', tile: { kind: 'part', view: 'body', opts: { body: 'wayo', paint: 'vermilion' } }, apply: { opts: { body: 'wayo' } }, sources: S('pagoda', 'iitk')
  },
  {
    slug: 'body-natural', family: 'body', name: 'Aged hinoki', jp: '素木', tag: 'Unpainted timber, white walls',
    blurb: 'Tō-ji, Yasaka and Kōfuku-ji show dark weathered wood against white plaster. The same builder with the natural scheme: one palette swap.',
    how: ['PAINTS.natural: timber 0x4d3b2e, walls 0xe9e3d4, ends 0xe8e0cc.'],
    code: `buildPagoda({ ...opts, paint: 'natural' });`,
    use: 'Most Kyoto towers.', tile: { kind: 'part', view: 'body', opts: { paint: 'natural' } }, apply: { opts: { paint: 'natural' } }, sources: S('toji', 'yasaka')
  },
  {
    slug: 'body-mokoshi', family: 'body', name: 'Mokoshi skirt', jp: '裳階', tag: 'Hōryū-ji’s pent roof',
    blurb: 'A lean-to roof and low wall wrapped round the ground storey, so the tower seems to have a sixth roof at its foot.',
    how: ['Wall ring at w/2 + 0.2·W₁ up to 36% of the storey.', 'A small roofFrame() with half the sori.'],
    code: `const MF = roofFrame({ R: hw + 0.4 * W, rIn: hw, yE: my + 0.03 * W, yR: my + 0.15 * W, rise: s.rise * 0.5, start, flare });`,
    use: 'The Hōryū-ji preset; a nice variation for the game.', tile: { kind: 'part', view: 'body', opts: { mokoshi: true }, zoom: 1.3 }, apply: { opts: { mokoshi: true } }, sources: S('iitk', 'pagoda')
  },

  /* ---------------- kōran ---------------- */
  ORIG('koran', 'koran', ['band', 'roof', 'body'], {
    blurb: 'The game’s storeys meet their roofs with no balcony: the next body sits on the cone. (There is no original kōran; this is the bare junction it would replace.)',
    how: ['The next tier starts at baseY += storyH + roofH · 0.62.'],
    code: `baseY += storyH + roofH * 0.62;`
  }),
  {
    slug: 'koran-band', family: 'koran', name: 'A band', jp: '線', tag: 'Mid tier',
    blurb: 'A deck ring and one thin rail: the shadowed lip every upper storey has, without posts.',
    how: ['Deck: four boxes from w/2 to w/2 + kd.', 'One 2.5 cm rail at 60% of the rail height.'],
    code: `B.box(2 * r0, 0.025 * W, 0.012 * W, { x: c.x, y: y + kh * 0.6, z: c.z, ry });`,
    use: 'Mid tier.', tile: { kind: 'part', view: 'koran', opts: { koran: 'band' } }, apply: { opts: { koran: 'band' } }, sources: S('jaanusKoran')
  },
  {
    slug: 'koran-rail', family: 'koran', name: 'Three-rail kōran', jp: '高欄', tag: 'Hokogi, hirageta, jifuku',
    blurb: 'JAANUS: three horizontal members, the round top rail (hokogi), the middle rail (hirageta) and the bottom rail (jifuku), carried on posts. The top rails run past the corners and cross.',
    how: ['Top rail: a six-sided cylinder laid along each side, 6 cm past the corner.', 'Posts every ~16% of W₁.'],
    code: `B.cyl(0.009 * W, 2 * r0 + 0.06 * W, { x: c.x, y: y + kh, z: c.z, rz: Math.PI / 2, ry, order: 'YXZ' }, true);`,
    use: 'Hero tier.', tile: { kind: 'part', view: 'koran', opts: { koran: 'rail' } }, apply: { opts: { koran: 'rail' } }, sources: S('jaanusKoran')
  },

  /* ---------------- sōrin ---------------- */
  ORIG('sorin', 'sorin', ['sorin', 'roof'], {
    blurb: 'A shaft with eight equal-ish discs, a sphere and a cone tip: about 3.4 units on a 15.7-unit tower (≈ 21%, short of the 25–34% of the records).',
    how: ['CylinderGeometry(0.075, 0.075, 2.6) shaft.', 'Eight discs radius 0.28 → 0.18; SphereGeometry(0.17) jewel; ConeGeometry(0.12, 0.58) tip.'],
    code: `for (let i = 0; i < 8; i++) {
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.28 - i * 0.014, 0.28 - i * 0.014, 0.065, 12), finialMat);
  disc.position.y = finialBaseY + 0.42 + i * 0.22;
}`
  }),
  {
    slug: 'sorin-needle', family: 'sorin', name: 'Needle', jp: '針', tag: 'Far tier · three discs',
    blurb: 'At range the sōrin is a line with a few beads and a dot. A hexagonal shaft, three discs and the jewel keep its height share, which is what reads.',
    how: ['Six-sided shaft, three discs at 25%, 41%, 57%.'],
    code: `B.cyl(rb * 0.14, Sh * 0.9, { y: y0 + Sh * 0.45 }, true);`,
    use: 'Far tier and impostor.', tile: { kind: 'part', view: 'sorin', opts: { sorinStyle: 'needle' } }, apply: { opts: { sorinStyle: 'needle' } }, sources: S('sorin')
  },
  {
    slug: 'sorin-full', family: 'sorin', name: 'The eight-part chain', jp: '相輪', tag: 'Roban to hōju',
    blurb: 'Bottom to top: roban (dew basin, square like the roof), fukubachi (inverted bowl), ukebana (two rows of eight lotus petals, the upper turned up), nine kurin rings on the sasshin shaft with fūtaku on the top ring, suien (four openwork flame sheets at right angles), ryūsha (dragon wheel) and hōju (jewel).',
    how: ['Kurin occupy 19–61% of the sōrin; suien 63–84%; hōju from 88%.', 'Petals: scaled spheres, upper row tilted out 0.55 rad, lower row turned down.', 'Bronze 0x625c46, metalness 0.72.'],
    code: `for (let r = 0; r < 9; r++) {
  const rad = rb * (0.86 - r * 0.018), yy = y0 + Sh * (0.19 + r * 0.052);
  B.cyl(rad, Sh * 0.012, { y: yy });
}`,
    use: 'Hero and mid tiers.', tile: { kind: 'part', view: 'sorin', opts: { sorinStyle: 'full' } }, apply: { opts: { sorinStyle: 'full' } }, sources: S('sorin', 'jaanusUkebana', 'threeLathe')
  },
  {
    slug: 'sorin-suien', family: 'sorin', name: 'Suien openwork', jp: '水煙', tag: 'Alpha-cut flame sheets',
    blurb: 'Two crossed planes cut by a canvas mask: a scalloped flame outline with scrolls and small flying figures pierced through, the way the bronze is. Up close it glitters; far off it thickens the spire.',
    how: ['suienTexture(): 128×256 white shape, destination-out holes.', 'alphaMap + alphaTest 0.5 + DoubleSide.'],
    code: `x.globalCompositeOperation = 'destination-out';
x.beginPath(); x.arc(cx, cy, rad, a0, a0 + 4.2); x.stroke();   // a scroll`,
    use: 'Hero tier.', tile: { kind: 'part', view: 'suien', opts: { sorinStyle: 'full' } }, apply: { opts: { sorinStyle: 'full' } }, sources: S('sorin')
  },

  /* ---------------- bells ---------------- */
  ORIG('bells', 'bell', ['corner', 'eave', 'roof'], {
    blurb: 'Each corner ends in a tilted dark stick. No bells hang in the game.',
    how: ['Four upturned boxes per tier.'],
    code: `upturnedCorner.rotation.z = sx * 0.42;`
  }),
  {
    slug: 'bell-futaku', family: 'bells', name: 'Fūtaku in the wind', jp: '風鐸', tag: 'Pendulums · click to ring',
    blurb: 'A lathed bronze bell and a heart-shaped wind plate under every eave corner: twenty on a five-storey tower. Each is a damped pendulum (ω² = g / L) pushed by gusts; a hard swing rings it through a modal bell synth.',
    how: ['One InstancedMesh for bells and one for plates; matrices rebuilt each frame.', 'vx += (−ω²·ax − 1.1·vx + wind) · dt.', 'A strike above 1.1 rad/s plays six decaying partials (1, 1.004, 2.31, 3.86, 5.43, 7.92).'],
    code: `b.vx += (-b.w2 * b.ax - 1.1 * b.vx + fx) * dt; b.ax += b.vx * dt;
if (Math.hypot(b.vx, b.vz) > 1.1 && b.cool <= 0) state.onRing?.(b, strength);`,
    use: 'Hero tier, and the sound of the valley.', tile: { kind: 'part', view: 'bell', opts: { bells: true }, wind: 1.2 }, apply: { ring: true }, sources: S('futakuBrit', 'niponica', 'bellModal')
  },
  {
    slug: 'bell-hips', family: 'bells', name: 'Hips & onigawara', jp: '隅棟・鬼瓦', tag: 'Tubes along the hips, a block at the end',
    blurb: 'Each hip ridge is a tube swept along the roof’s diagonal, ending in a tilted onigawara block over the corner. The hip rafter (sumigi) runs under it and ends in a painted cap.',
    how: ['TubeGeometry(CatmullRomCurve3(S(k, 1, t)), 16, r, 6).', 'Onigawara: box rotated to the diagonal, tipped back 0.35 rad.'],
    code: `for (let j = 0; j <= 8; j++) pts.push(F.S(k, 1, j / 8).add(V(0, rr * 0.6, 0)));
H.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, rr, 6, false));`,
    use: 'Hero tier.', tile: { kind: 'part', view: 'hip', opts: {} }, apply: { opts: { roof: 'ribbon' } }, sources: S('jaanusSumigi')
  },

  /* ---------------- base ---------------- */
  ORIG('base', 'base', ['dais', 'body', 'post'], {
    blurb: 'Two stacked stone boxes, 5.6 and 4.9 units, mostly hidden by the forest from the valley.',
    how: ['box(5.6, 0.6, 5.6, MAT.stoneDark); box(4.9, 0.32, 4.9, MAT.stone).'],
    code: `pagoda.add(box(5.6, 0.6, 5.6, MAT.stoneDark, 0, 0.3, 0));
pagoda.add(box(4.9, 0.32, 4.9, MAT.stone, 0, 0.76, 0));`
  }),
  {
    slug: 'base-slab', family: 'base', name: 'Slab', jp: '台', tag: 'Far tier',
    blurb: 'One stone box under the eaves’ drip line.',
    how: ['Half-width = (0.5 + 0.36) · W₁.'],
    code: `B.box(pw * 2, ph, pw * 2, { y: ph / 2 });`,
    use: 'Far tier.', tile: { kind: 'part', view: 'base', opts: { podium: 'slab' } }, apply: { opts: { podium: 'slab' } }, sources: S('pagoda')
  },
  {
    slug: 'base-kidan', family: 'base', name: 'Kidan with stairs', jp: '基壇', tag: 'Dressed stone, four flights',
    blurb: 'A dressed-stone podium with a lighter coping course and a three-step flight in the middle of every side, textured with the game’s own stone set.',
    how: ['stoneTextures(0x9a978e) from src/textures.js through labs/shared/game.js.', 'Steps 0.4·W₁ wide, each 0.07·W₁ deep.'],
    code: `for (let s = 0; s < 3; s++) {
  const d = pw + (s + 0.5) * 0.07 * W, hs = ph * (1 - (s + 1) / 4);
  B.box(0.4 * W, hs, 0.07 * W, { x: NK[k].x * d, y: hs / 2, z: NK[k].z * d, ry: k * Math.PI / 2 });
}`,
    use: 'Hero and mid tiers.', tile: { kind: 'part', view: 'base', opts: { podium: 'kidan' } }, apply: { opts: { podium: 'kidan' } }, sources: S('pagoda')
  },
  {
    slug: 'base-shin', family: 'base', name: 'Shinbashira & the snake dance', jp: '心柱', tag: 'Storeys sway, the pillar holds',
    blurb: 'No column ties one storey to the next: each is its own frame round a central pillar that carries the sōrin. In an earthquake the storeys move out of phase, the “snake dance” Tō-ji describes, and the pillar keeps them from walking off.',
    how: ['Frame view hides walls and roofs and shows the pillar.', 'Each storey: x = A·(0.32·sin 7.3t·(1 − 0.1i) + (0.22 + 0.13i)·sin(3.9t − 1.9i)): a wave travelling up.', 'Bells swing with the shaking.'],
    code: `const x = A * (Math.sin(t * 7.3) * 0.32 * (1 - i * 0.1) + Math.sin(t * 3.9 - i * 1.9) * (0.22 + 0.13 * i));
G.position.x = x; G.rotation.z = -x / (W * 9);`,
    use: 'Press “Shake” on the viewing platform.', tile: { kind: 'special', which: 'shin' }, apply: { shake: true, frame: true }, sources: S('toji', 'pagoda', 'iitk')
  },

  /* ---------------- distance ---------------- */
  ORIG('distance', 'far', null, {
    name: 'The game’s pagoda at range', blurb: 'The shipped tower is light in triangles but heavy in objects: 93 separate meshes, every one drawn at every distance. At the valley’s 57 m it is about 300 px tall; from the summit it is a handful.',
    how: ['No LOD; the mesh merge pass in _mergeStatics() joins MAT meshes only.'],
    code: `// buildDistantPagoda: no LOD, castShadow on every part
pagoda.traverse((node) => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });`
  }),
  {
    slug: 'far-tiers', family: 'distance', name: 'Pixel-budget tiers', jp: '詳細度', tag: 'Hero ≥ 380 px · mid ≥ 110 · far ≥ 26',
    blurb: 'Choose the tier by how tall the tower is on screen, not by metres: the same rule works for a 16 m tower in a valley and a 55 m one across a city. The tile dollies in and out and shows each switch.',
    how: ['pxH = H · viewportH / (2 · d · tan(fov / 2)).', 'Each feature has a size in metres; below ~1.5 px it goes, below ~4 px it simplifies.'],
    code: `const pxH = H * rect.height / (2 * dist * Math.tan(fov / 2));
want = pxH >= 380 ? 'hero' : pxH >= 110 ? 'mid' : pxH >= 26 ? 'far' : 'impostor';`,
    use: 'The policy for the game, where the same tower is seen from 57 m and from the summit.', tile: { kind: 'special', which: 'tiers' }, apply: { tierMode: 'auto' }, sources: S('threeLOD')
  },
  {
    slug: 'far-dither', family: 'distance', name: 'Bayer crossfade', jp: 'ディザ', tag: 'Screen-door, no blending',
    blurb: 'For half a second both tiers draw; each discards the pixels above its share of a 4×4 Bayer threshold. No sorting, no transparency, no pop. The tile breathes between the mid and far tiers.',
    how: ['uFade per tier; incoming k, outgoing 1 − k.', 'bayer4(gl_FragCoord.xy) from a const float[16].'],
    code: `float bayer4(vec2 p) {
  ivec2 i = ivec2(mod(p, 4.0));
  const float m[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
  return (m[i.x + i.y * 4] + 0.5) / 16.0;
}
if (uFade < 0.999 && bayer4(gl_FragCoord.xy) >= uFade) discard;`,
    use: 'Every tier change.', tile: { kind: 'special', which: 'dither' }, apply: { tierMode: 'auto' }, sources: S('fadeTiles')
  },
  {
    slug: 'far-impostor', family: 'distance', name: '16-view impostor', jp: '張りぼて', tag: 'One quad, baked at the current light',
    blurb: 'The far tier rendered from sixteen azimuths into a half-float atlas, then drawn as a quad that turns about its vertical axis and blends the two nearest views. Rebaked when the light moves.',
    how: ['Orthographic bake, one row of 16 cells 128×256.', 'Runtime: az = atan(toCam.x, toCam.z); mix two cells by fract().', 'Colour is un-premultiplied; air is applied in the billboard shader.'],
    code: `float f = mod(vAz / 6.2831853 * uViews + uViews, uViews);
float i0 = floor(f), i1 = mod(i0 + 1.0, uViews), fr = f - i0;
vec4 c = mix(texture2D(tAtlas, vec2((i0 + vUv.x) / uViews, vUv.y)), texture2D(tAtlas, vec2((i1 + vUv.x) / uViews, vUv.y)), fr);`,
    use: 'Below ~26 px: the summit view, and many towers on one horizon.', tile: { kind: 'special', which: 'impostor' }, apply: { tierMode: 'impostor' }, sources: S('impostor', 'octaForum')
  },
  {
    slug: 'far-air', family: 'distance', name: 'Aerial perspective', jp: '空気遠近', tag: 'Blue goes first',
    blurb: 'The same tower at 250, 900 and 2,200 m. Air removes blue fastest (wavelength extinction), so timber warms and darkens into a violet-grey silhouette, then the veil, bent golden toward the sun, takes it.',
    how: ['ext = exp(−β·d), β = (1.6, 2.3, 4.1) × 10⁻⁴ per metre.', 'veil = mix(air, sun, pow(max(dot(ray, sun), 0), 8) · 0.55).', 'One patch on every material, before tone mapping.'],
    code: `vec3 airExt = exp(-uBeta * airD * uAir);
float airSun = pow(max(dot(airRay / airD, uSunW), 0.0), 8.0);
gl_FragColor.rgb = gl_FragColor.rgb * airExt + mix(uAirCol, uSunCol * 1.15, airSun * 0.55) * (1.0 - airExt);`,
    use: 'Everything in the hero world wears it.', tile: { kind: 'special', which: 'air' }, apply: { distance: 900 }, sources: S('quilez', 'gurneyOga')
  },
  {
    slug: 'far-rim', family: 'distance', name: 'Back-lit rim', jp: '逆光', tag: 'The sunset silhouette',
    blurb: 'With the sun behind the tower, a Fresnel term in the sun’s colour outlines every roof edge, the way glare wraps a silhouette in late light. It fades as the sun climbs.',
    how: ['fres = (1 − |n·v|)³; back = sun-in-front factor in view space.', 'uRim follows the hour: strongest near the horizon.'],
    code: `float fres = pow(1.0 - clamp(abs(dot(normal, V)), 0.0, 1.0), 3.0);
vec3 sv = normalize((viewMatrix * vec4(uRimSun, 0.0)).xyz);
gl_FragColor.rgb += uRimCol * fres * clamp(-sv.z * 0.5 + 0.5, 0.0, 1.0) * uRim;`,
    use: 'Golden hour.', tile: { kind: 'special', which: 'rim' }, apply: { hour: 17.6 }, sources: S('dangerousLight')
  },
  {
    slug: 'far-night', family: 'distance', name: 'Night light-up', jp: 'ライトアップ', tag: 'Lit from the ground',
    blurb: 'Kyoto lights its towers from below: walls glow, soffits blaze, roof tops stay dark, and the glow fades with height. No lights at all: an emissive term from the normal and the height.',
    how: ['up = clamp(0.55 − n.y · 0.65) · (1 − y / H · 0.6).', 'Scaled by night, so it rises as the sun sets.'],
    code: `float up = clamp(0.55 - wn.y * 0.65, 0.0, 1.0) * (1.0 - clamp(vAirWorld.y / uUpH, 0.0, 1.0) * 0.6);
gl_FragColor.rgb += uUpCol * uUplight * up * (diffuseColor.rgb + 0.06);`,
    use: 'Evening in the valley.', tile: { kind: 'special', which: 'night' }, apply: { hour: 19.3 }, sources: S('toji')
  },

  /* ---------------- finishes ---------------- */
  ...FINISHES.map((f, i) => ({
    slug: 'finish-' + f.key, family: 'finish', name: f.name, jp: f.jp, tag: f.hint, original: i === 0,
    blurb: {
      physical: 'What the game draws: PBR materials, ACES tone mapping, straight to the canvas. Every finish below starts from this image.',
      background: 'The target look: real light and real distance, then a painted surface. A soft 8-sector Kuwahara (radius ~2.6 px) flattens textures into strokes while keeping edges; a quarter-size diffusion glow is screened back the way anime compositing does; shadows lift toward violet and highlights warm; light leaks from the sun; distant air breaks into horizontal kasumi bands.',
      gouache: 'A bigger Kuwahara (radius 5): flat opaque patches with crisp edges, a little more saturation, and a soft paper tooth.',
      watercolor: 'UVs wobble on slow noise, the filter flattens, pigment pools at colour edges (edge darkening), low-frequency density varies the wash, granulation settles into the paper, and the whole thing thins toward the paper colour.',
      ink: 'Edges from the Laplacian of inverse depth and a Sobel on view normals (after Heckel’s Moebius pass), drawn with a hand wobble; hatching in three bands by luminance; colours desaturate warm; lines thin out with distance.',
      cel: 'Three tones that keep their hue, a rim where normals turn away, ink lines from depth and normals, and a little glow.',
      woodblock: 'Every pixel snapped to a thirteen-colour block palette (bero-ai blues, sumi, beni, ochre, sage, tea-brown), a key line printed slightly off register, a bokashi gradient at the top of the sky and wood grain in the flats.',
      sumi: 'Luminance becomes ink, quantised into washes, thinning to paper with distance so the far hills become mist; brush lines vary in weight.'
    }[f.key],
    how: {
      physical: ['WebGLRenderer → screen; toneMapping ACESFilmic.'],
      background: ['scene → HalfFloat RT (+ depth) → ACES + sRGB into RGBA8.', 'bright-pass → ¼ size → 9-tap blur H, V.', 'kuwahara(2.6) → screen(glow · 0.6) → grade → leak → kasumi → vignette.'],
      gouache: ['kuwahara(5.0); 8 sectors × 3 spokes × 4 rings; sectors blend by 1/(1 + (σ·255/6)⁴).'],
      watercolor: ['wobble = (noise − 0.5) · 7 px.', 'edge darkening: luminance gradient → ×(1 − 0.3).', 'granulation: fbm at 2.5 px scale × (1 − luminance).'],
      ink: ['edge = max(Laplacian of 1/z, normal Sobel): planes never fire, silhouettes always do.', 'disp = hash · sin(fc.y · 0.08) per Heckel.', 'hatch: diagonal < 0.62, vertical < 0.42, horizontal < 0.24.'],
      cel: ['band = 0.46 / 0.76 / 1.0 at luminance 0.25 and 0.58.', 'rim = smoothstep(0.55, 0.9, 1 − |n.z|).'],
      woodblock: ['nearestBlock(): weighted RGB distance to thirteen inks.', 'Sky (depth = 1) blends to deep ai above 62% height first.'],
      sumi: ['ink = 1 − luminance, quantised to quarters, × (1 − mist · 0.88).']
    }[f.key],
    code: {
      physical: `renderer.toneMapping = THREE.ACESFilmicToneMapping;\nrenderer.render(scene, camera);`,
      background: `c = kuwahara(uv, 2.6 * s);
c = screen(c, texture2D(tGlow, uv).rgb * 0.6);
c += vec3(0.03, 0.035, 0.075) * (1.0 - smoothstep(0.0, 0.42, L));   // violet shadows
c = screen(c, vec3(1.0, 0.78, 0.5) * 0.3 * exp(-d * 2.4) * uSun.z); // light leak`,
      gouache: `for (int k = 0; k < 8; k++) { /* 3 spokes × 4 rings, gaussian */ }
float a = 1.0 / (1.0 + pow(sd * 255.0 / 6.0, 4.0));
acc += m * a; wsum += a;`,
      watercolor: `vec2 wob = (vec2(vnoise2(fc / 70.0 + 3.1), vnoise2(fc / 70.0 + 7.7)) - 0.5) * 7.0 / uRes;
c *= 1.0 - smoothstep(0.04, 0.25, edgeLum(uv + wob, 1.5)) * 0.3;
c *= 1.0 - (fbm2(fc / 2.5, 3) - 0.5) * 0.3 * (1.0 - lum(c));`,
      ink: `// 1/z is affine across a plane in screen space: its Laplacian is zero
// on planes, even at grazing angles, and spikes only at silhouettes
float lap = (abs(wl + wr - 2.0 * w0) + abs(wd + wu - 2.0 * w0)) / w0;
float de = smoothstep(0.03, 0.12, lap);
float ne = smoothstep(0.55, 1.2, length(nx) + length(ny));   // normal Sobel`,
      cel: `float band = mix(0.46, 0.76, smoothstep(0.24, 0.27, L));
band = mix(band, 1.0, smoothstep(0.56, 0.6, L));
c = clamp(b / max(L, 0.06) * band * 0.66, 0.0, 1.0);`,
      woodblock: `if (sky) b = mix(b, vec3(0.12, 0.24, 0.37), smoothstep(0.62, 1.0, uv.y) * 0.85);
c = nearestBlock(b);
c = mix(c, sumi, edgeDN(uv + vec2(1.2, -0.8) / uRes, 1.0) * 0.9);   // off-register key block`,
      sumi: `float ink = 1.0 - lum(b);
ink = mix(ink, floor(ink * 4.0 + 0.5) / 4.0, 0.55) * (1.0 - mist * 0.88) * 1.15;
c = mix(uPaper, uInk, clamp(ink, 0.0, 1.0) * 0.92);`
    }[f.key],
    use: f.key === 'background' ? 'The recommendation for the game: physical light underneath, a painted surface on top.' : f.key === 'physical' ? 'The game today.' : 'A study; switch it on the viewing platform to judge it on the real town.',
    tile: { kind: 'finish', finish: f.key },
    apply: { finish: f.key },
    sources: f.key === 'physical' ? S('game') : f.key === 'ink' ? S('heckelMoebius') : f.key === 'watercolor' ? S('watercolor', 'heckelPaint') : f.key === 'background' ? S('heckelPaint', 'kyprianidis', 'dangerousLight', 'obsessiveOga', 'gurneyOga') : f.key === 'cel' ? S('threeToon', 'heckelMoebius') : S('heckelPaint', 'kyprianidis')
  }))
];
