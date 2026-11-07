// Family 3 — our meadow crossed with the research finds
import * as THREE from 'three';
import { RibbonBuilder, singleBlade, ribbonMaterial, hashField, packCell, shellField } from './kit.js';
import { flowerAtlas } from './textures.js';
import { ribbonMake, MEADOW, MEADOW_ROOT, MEADOW_BODY, PLACE_MEADOW, nearFocusUpdate } from './types_util.js';

let _atlas = null;
const atlas = () => _atlas || (_atlas = flowerAtlas());

/* ---- 11. Carpet & Blades: shell undergrowth + our blades on top ---- */

const carpetShell = {
  id: 'carpet-shell', layers: 16, height: 0.1, spread: 1.0, density: 95, thick: 0.5, ao: 0.3,
  palette: { root: 0x1c3c18, mid: 0x468030, tip: 0x8fc35a }
};
const carpetBlades = {
  id: 'carpet-blades', perM2: 700,
  geo: () => singleBlade(4),
  palette: MEADOW, ao: 0.4, trans: 0.65, spec: 0.08,
  place: PLACE_MEADOW + `
  B.h *= 1.2;
  B.w *= 1.1;`
};

/* ---- 12. Wildflower Cards: blades + billboard blooms on stems ---- */

const wfBlades = {
  id: 'wf-blades', perM2: 1300,
  geo: () => singleBlade(4),
  palette: { root: 0x2f5a27, mid: 0x62a03c, tip: 0xaed062 }, ao: 0.4, trans: 0.65, spec: 0.08,
  place: PLACE_MEADOW
};

function flowerGeometry() {
  const b = new RibbonBuilder();
  const st = b.blade({ rows: 5, lean: 0.8, h: 1, w: 0.22 });
  b.decor(st, [
    { p: [-0.5, -0.5, 0], uv: [0, 0] }, { p: [0.5, -0.5, 0], uv: [1, 0] },
    { p: [0.5, 0.5, 0], uv: [1, 1] }, { p: [-0.5, 0.5, 0], uv: [0, 1] }
  ], [[0, 1, 2], [0, 2, 3]], 2);
  return b.build();
}
const wfFlowers = {
  id: 'wf-flowers', perM2: 130,
  geo: flowerGeometry,
  defines: { TAPER: '0.1', HEAD_SCALE: '0.095', NORMAL_UP: '0.9' },
  palette: { root: 0x2c5524, mid: 0x4f8a34, tip: 0x6fa844 }, ao: 0.4, trans: 0.4, spec: 0.0,
  uniforms: () => ({ uAtlas: { value: atlas() } }),
  fragUniforms: 'uniform sampler2D uAtlas;',
  place: /* glsl */`
  B.root = gridPos(s, id);
  float n = fbm(B.root * 1.3 + uCell.w * 2.0);
  float r1 = rnd(s), r2 = rnd(s), r3 = rnd(s), r4 = rnd(s), r5 = rnd(s);
  if (n < 0.30 + 0.22 * r5) { B.alive = 0.0; return; }
  B.h = 0.30 + r1 * 0.30;
  B.w = 0.018;
  B.yaw = r3 * 6.2832;
  B.lean = 0.08 + r4 * 0.3;
  B.windMul = 1.35;
  B.rnd = r4;
  float kq = floor(rnd(s) * 4.0);
  B.extra = vec4(mod(kq, 2.0), floor(kq / 2.0), 0.0, 0.0);
  B.tint = vec3(0.9 + 0.2 * rnd(s));
`,
  post: 'if (aShape.z > 1.5) vUv = (uv + B.extra.xy) * 0.5;',
  fragColor: `
    if (vY.w > 1.5) {
      vec4 tx = texture2D(uAtlas, vUv);
      if (tx.a < 0.45) alpha = 0.0;
      albedo = tx.rgb * (0.92 + 0.16 * vX.x);
      t = 1.0;
    }`
};

function flowersMake(ctx, cell) {
  const blades = hashField(ctx, cell, ctx.cache('wf:bg', wfBlades.geo), ribbonMaterial(ctx, cell, wfBlades), wfBlades.perM2);
  const flowers = hashField(ctx, cell, ctx.cache('wf:fg', wfFlowers.geo), ribbonMaterial(ctx, cell, wfFlowers), wfFlowers.perM2);
  return packCell([blades, flowers]);
}

/* ---- 13. Pressed Meadow: Bezier blades that keep your footprints ---- */

const pressed = {
  id: 'pressed', perM2: 1500,
  geo: () => singleBlade(6),
  defines: { BEZIER: '', USE_WIDEN: '', WIDEN: '0.7', TAPER: '0.85', NORMAL_UP: '0.55', TRAIL: '' },
  palette: { root: 0x2d5a2b, mid: 0x6aa23f, tip: 0xc4d96f }, ao: 0.45, trans: 0.7, spec: 0.14,
  pre: 'h *= 1.0 - pressed * 0.5;',
  place: /* glsl */`
  B.root = gridPos(s, id);
  vec3 cl = cellular(B.root * 3.4 + vec2(uCell.w * 1.7));
  float md = cl.x;
  float ch = hash12(cl.yz + 3.1);
  vec2 outv = B.root - (cl.yz - vec2(uCell.w * 1.7)) / 3.4;
  float r1 = rnd(s), r2 = rnd(s), r3 = rnd(s), r4 = rnd(s);
  float n = fbm(B.root * 1.4 + uCell.w);
  float clear = 1.0 - smoothstep(0.22, 0.36, n);
  if (rnd(s) < clear * 0.4) { B.alive = 0.0; return; }
  B.h = (0.28 + 0.26 * ch + r1 * 0.14) * (1.0 - 0.4 * smoothstep(0.2, 0.7, md));
  B.yaw = (r3 < 0.7) ? atan(outv.x, outv.y + 1e-5) + (r4 - 0.5) * 1.6 : r3 * 6.2832;
  B.lean = 0.2 + 0.5 * smoothstep(0.0, 0.6, md);
  B.w = 0.011 + r2 * 0.008;
  B.rnd = r4;
  B.tint = mix(vec3(0.85, 1.0, 0.78), vec3(1.05, 1.0, 0.7), ch * ch) * (0.75 + 0.25 * r4);
`,
  fragColor: `
    float pr = vX.z;
    albedo = mix(albedo, albedo * vec3(1.5, 1.4, 0.72) + vec3(0.05, 0.05, 0.0), pr * 0.95);`
};

/* ---- 14. Halo Meadow: tri-quad clumps outside, blades grow in around the cat ---- */

const haloClumps = {
  id: 'halo-clumps', perM2: 330, itemsPer: 9,
  geo: () => {
    const b = new RibbonBuilder();
    for (let k = 0; k < 3; k++) b.blade({ rows: 3, yaw: (k * Math.PI) / 3, lean: 1, h: 1, w: 1, cls: k });
    return b.build();
  },
  defines: { TAPER: '0.12', NORMAL_UP: '0.75', ROUND: '0.1' },
  palette: { root: 0x2b5126, mid: 0x5f9638, tip: 0xaecb62 }, ao: 0.4, trans: 0.6, spec: 0.06,
  place: PLACE_MEADOW + `
  B.w = 0.034 + r2 * 0.016;
  B.lean = 0.08 + r4 * 0.2;
  B.h *= mix(1.0, 0.6, 1.0 - smoothstep(0.3, 0.95, distance(B.root, uFocus.xz)));`,
  fragColor: `
    float kk = (vSide * 0.5 + 0.5) * 3.0;
    float lc = abs(fract(kk) - 0.5) * 2.0;
    float hv = 0.70 + 0.30 * hash12(vec2(floor(kk), vX.w + vX.x * 7.0));
    if (t > hv || lc > pow(max(1.0 - t / hv, 0.0), 0.72)) alpha = 0.0;
    albedo *= 0.86 + 0.14 * sin(vSide * 7.0 + vX.x * 30.0);`
};
const haloBlades = {
  id: 'halo-blades', perM2: 1800,
  geo: () => singleBlade(4),
  palette: { root: 0x2f6a2c, mid: 0x6bb040, tip: 0xc3e06e }, ao: 0.4, trans: 0.7, spec: 0.1,
  place: MEADOW_ROOT + `
  float halo = 1.0 - smoothstep(0.30, 1.0, distance(B.root, uFocus.xz));
  if (halo < 0.03) { B.alive = 0.0; return; }
` + MEADOW_BODY + `
  B.h *= halo * 1.25;
  B.w *= 1.1;`
};

function haloMake(ctx, cell) {
  const clumps = hashField(ctx, cell, ctx.cache('halo:cg', haloClumps.geo), ribbonMaterial(ctx, cell, haloClumps), haloClumps.perM2);
  clumps.userData.itemsPer = 9;
  const blades = hashField(ctx, cell, ctx.cache('halo:bg', haloBlades.geo), ribbonMaterial(ctx, cell, haloBlades), haloBlades.perM2);
  return packCell([clumps, blades], { update: nearFocusUpdate(blades, cell, 1.05) });
}

/* ---- 15. Mown Stripes: short Bezier lawn that lies in bands ---- */

const mown = {
  id: 'mown', perM2: 3300,
  geo: () => singleBlade(3),
  defines: { BEZIER: '', TAPER: '0.9', NORMAL_UP: '0.5', TRAIL: '', ROUND: '0.2' },
  palette: { root: 0x2c5a26, mid: 0x5fa23a, tip: 0xa2d355 }, ao: 0.5, trans: 0.5, spec: 0.12,
  pre: 'h *= 1.0 - pressed * 0.3;',
  place: /* glsl */`
  B.root = gridPos(s, id);
  float r1 = rnd(s), r2 = rnd(s), r3 = rnd(s);
  float st = floor((B.root.x + B.root.y * 0.25 + uCell.w * 0.07) / 0.40);
  float sg = mod(st, 2.0) * 2.0 - 1.0;
  B.h = 0.095 + r1 * 0.035;
  B.w = 0.0075 + r2 * 0.0035;
  B.yaw = (sg > 0.0 ? 1.5708 : -1.5708) + (r3 - 0.5) * 0.5;
  B.lean = 0.55 + r2 * 0.2;
  B.windMul = 0.4;
  B.rnd = r3;
  B.tint = vec3(0.9 + 0.1 * r1) * (1.0 + sg * 0.09);
`,
  fragColor: `
    albedo = mix(albedo, albedo * vec3(1.25, 1.2, 0.85), vX.z * 0.7);`
};

export const MIXED = [
  {
    id: 'carpet-blades', family: 'cross', name: 'Carpet & Blades', tag: 'Shell undergrowth, blade overstory',
    blurb: 'A 16-layer shell carpet fills every gap at the root — the thick, never-see-the-soil feel — while 700 real blades per m² rise out of it. Two draw calls give a depth no single technique reaches: soft fuzz below, crisp motion above.',
    how: [
      'Draw 1: shell carpet, 16 layers, 0.1 m, 95 strands/m — dark base, no geometry cost per strand.',
      'Draw 2: hashed ribbon blades (our meadow recipe) at 700/m², 20% taller.',
      'Both read the same cat-collision field so carpet and blades flatten together.',
      'Quality governor trims shell layers and blade grid with one multiplier.'
    ],
    code: `// carpet: one plane x 16 instances (layer = gl_InstanceID)
shellField(ctx, cell, { layers: 16, height: 0.10, density: 95 });
// overstory: hashed blades at ~40% of the pure-blade density
hashField(ctx, cell, bladeGeo, bladeMat, 700);`,
    sources: [['Godot Shaders — shell texturing', 'https://godotshaders.com/shader/fur-grass-with-shell-texturing/']],
    gpu: 3, use: 'Cat-height meadow where gaps would show the soil.',
    ground: 0x264020, soil: 0xd3e0c3,
    make: (ctx, cell) => {
      const shell = shellField(ctx, cell, carpetShell);
      const blades = hashField(ctx, cell, ctx.cache('cb:bg', carpetBlades.geo), ribbonMaterial(ctx, cell, carpetBlades), carpetBlades.perM2);
      return packCell([shell, blades]);
    }
  },
  {
    id: 'wildflowers', family: 'cross', name: 'Wildflower Cards', tag: 'Billboard blooms on swaying stems',
    blurb: 'Our blades with painted flower cards: each bloom is a camera-facing quad riding the tip of a thin swaying stem, picked from a 4-flower atlas (daisy, buttercup, cosmos, bellflower) and gathered into patches by noise. Pollen-bright, and the stems whip further than the grass.',
    how: [
      'Stem = ribbon blade; bloom = 4 vertices of “billboard decor” on its tip frame (kind 2).',
      'Billboard axes come from the view matrix, so one quad always faces the camera.',
      'Atlas cell chosen per instance in the vertex shader (uv remap); alphaTest cut-out.',
      'Blooms gather where fbm > 0.3–0.5; stems get 1.35× wind so they nod above the blades.'
    ],
    code: `// bloom rides the stem tip, always facing the camera
vec3 camR = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
vec3 camU = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
pos = P + (camR * aLocal.x + camU * aLocal.y) * HEAD_SCALE;
vUv = (uv + B.extra.xy) * 0.5;               // pick 1 of 4 flowers`,
    sources: [['Codrops — alpha-card grass', 'https://tympanus.net/codrops/2025/02/04/how-to-make-the-fluffiest-grass-with-three-js/']],
    gpu: 3, use: 'Meadow clearings, shrine approaches, spring.',
    ground: 0x4a6a35, soil: 0xdfe8d2,
    make: flowersMake
  },
  {
    ...pressed, family: 'cross', name: 'Pressed Meadow', tag: 'Bezier blades that keep your footprints',
    blurb: 'Tsushima-style Bézier blades plus a second, slow physics layer: wherever the cat walks, grass is pressed flat in the direction of travel and slowly stands back up over ~10 seconds, paler where it is bent. You can read the cat’s path in the field long after it passes.',
    how: [
      'Same 11-tri Bézier blade; tip control also takes the trail direction.',
      'Trail texture: half-float ping-pong, new = max(old·e^(−0.16·dt), stamp) — no CPU readback.',
      'Pressed amount shortens blades (−50%), lightens them, and leans them along the stored direction.',
      'Cost: one 20 texel/m pass per frame; only runs while something moves.'
    ],
    code: `// trail pass (GPU)
vec2 dir = texture2D(tPrev, vUv).xy * exp(-uDecay * uDt);   // memory fades
vec2 target = normalize(a) * falloff * stampStrength;
if (dot(target,target) > dot(dir,dir)) dir = target;        // keep the stronger
gl_FragColor = vec4(dir, length(dir), 0.);
// blade: K += tr.xy * 0.75;  h *= 1.0 - pressed * 0.5;`,
    sources: [
      ['Three.js forum — interactive grass patches', 'https://discourse.threejs.org/t/how-do-i-make-interactive-grass-patches/65340'],
      ['Jahrmann & Wimmer — Interactive grass rendering', 'https://www.cg.tuwien.ac.at/research/publications/2013/JAHRMANN-2013-IGR/JAHRMANN-2013-IGR-paper.pdf']
    ],
    gpu: 3, use: 'Paths, stealth moments, anywhere the cat’s trail should read.',
    ground: 0x3a5a2a, soil: 0xdbe6cb,
    make: ribbonMake(pressed)
  },
  {
    id: 'halo-meadow', family: 'cross', name: 'Halo Meadow', tag: 'Clumps outside, blades around the cat',
    blurb: 'Cheap tri-quad clumps cover the whole field; inside a soft halo around the cat, real blades literally grow up through them (height × smoothstep of distance), and shrink away again as the cat leaves. Close-up lushness without paying for it everywhere.',
    how: [
      'Draw 1: 330 tri-quad clumps/m² everywhere (15 tris each), shortened under the halo.',
      'Draw 2: 1,800 blades/m², alive only within 1 m of the focus, height × halo.',
      'On the hero slab the blade draw is hidden for cells further than 1.05 m from the cat.',
      'The grow-in is entirely in the vertex shader — no CPU work as the cat moves.'
    ],
    code: `float halo = 1.0 - smoothstep(0.30, 1.0, distance(B.root, uFocus.xz));
if (halo < 0.03) { B.alive = 0.0; return; }   // collapse the whole blade
B.h *= halo * 1.25;                           // grows up as the cat nears
// clumps meanwhile: B.h *= mix(1.0, 0.6, halo);`,
    sources: [
      ['Hexaquo — LOD tricks (impostors)', 'https://hexaquo.at/pages/grass-rendering-series-part-4-level-of-detail-tricks-for-infinite-plains-of-grass-in-godot/'],
      ['Codrops — False Earth (clumps)', 'https://tympanus.net/codrops/2026/04/21/false-earth-from-webgl-limits-to-a-webgpu-driven-world/']
    ],
    gpu: 2, use: 'Large lush fields with a single detailed focus.',
    ground: 0x3d5e2b, soil: 0xd6e2c6,
    make: haloMake
  },
  {
    ...mown, family: 'cross', name: 'Mown Stripes', tag: 'A lawn that lies in bands',
    blurb: 'Garden turf at 3,300 blades/m²: every blade leans hard to the left or right depending on which stripe it is in, so the sun and the camera see the field as alternating light and dark bands — exactly how a roller-mown lawn looks — and paw prints press dark lines into it.',
    how: [
      'Short Bézier blades (9–13 cm, 3 rows, 5 tris) at 3,300/m².',
      'stripe = floor((x + 0.25z)/0.4); lean yaw = ±90° by parity, tint ±9%.',
      'Normals lean with the blades, so banding comes from lighting, not a texture.',
      'Reads the trail field: paw prints stay pressed and lighter for several seconds.'
    ],
    code: `float st = floor((B.root.x + B.root.y * 0.25) / 0.40);
float sg = mod(st, 2.0) * 2.0 - 1.0;               // alternate stripes
B.yaw  = (sg > 0.0 ? 1.5708 : -1.5708) + (r3 - 0.5) * 0.5;
B.lean = 0.55 + r2 * 0.2;
B.tint = vec3(0.9 + 0.1 * r1) * (1.0 + sg * 0.09);`,
    sources: [['Jahrmann & Wimmer — Interactive grass rendering', 'https://www.cg.tuwien.ac.at/research/publications/2013/JAHRMANN-2013-IGR/JAHRMANN-2013-IGR-paper.pdf']],
    gpu: 3, use: 'Temple courtyards, tea-house lawns, formal gardens.',
    ground: 0x335a2a, soil: 0xdbe8cb,
    make: ribbonMake(mown)
  }
];
