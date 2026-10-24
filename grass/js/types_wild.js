// Family 4 — five experiments for parts of the game that do not exist yet
import * as THREE from 'three';
import {
  RibbonBuilder, singleBlade, ribbonMaterial, hashField, packCell, mulberry32, GLSL_HEAD
} from './kit.js';
import { ribbonMake } from './types_util.js';

/* ---- 16. Lantern Fibers: bioluminescent night grass + fireflies ---- */

const lantern = {
  id: 'lantern', perM2: 1500,
  geo: () => singleBlade(4),
  defines: { TAPER: '0.9' },
  palette: { root: 0x061826, mid: 0x0c3a4a, tip: 0x2ad4c0 }, ao: 0.25, trans: 0, spec: 0,
  place: /* glsl */`
  B.root = gridPos(s, id);
  float n = fbm(B.root * 1.8 + uCell.w * 2.0);
  float r1 = rnd(s), r2 = rnd(s), r3 = rnd(s), r4 = rnd(s);
  if (n < 0.30 && rnd(s) < 0.5) { B.alive = 0.0; return; }
  B.h = (0.26 + r1 * 0.28) * (0.8 + 0.5 * n);
  B.w = 0.007 + r2 * 0.004;
  B.yaw = r3 * 6.2832;
  B.lean = 0.12 + r4 * 0.3;
  B.rnd = r4;
`,
  fragLight: `
    vec3 moonDir = normalize(vec3(0.3, 0.8, -0.4));
    float nd = clamp(dot(N, moonDir) * 0.5 + 0.5, 0.0, 1.0);
    col = albedo * (vec3(0.03, 0.05, 0.10) + vec3(0.30, 0.42, 0.75) * nd * 0.12) * ao;
    vec3 gA = vec3(0.10, 0.95, 0.80), gB = vec3(0.62, 0.38, 1.0), gC = vec3(1.0, 0.52, 0.72);
    vec3 gc = mix(gA, gB, smoothstep(0.0, 0.85, vX.x));
    if (vX.x > 0.9) gc = gC;
    float pulse = 0.5 + 0.5 * sin(uTime * 1.6 + vX.x * 40.0 + vY.y * 3.0);
    float wave = smoothstep(0.78, 1.0, sin(dot(vY.yz, normalize(uWindDir)) * 3.4 - uTime * 1.1));
    float inten = pow(t, 3.0) * (0.22 + 0.28 * pulse + 0.7 * wave + 2.0 * vX.y);
    emit = gc * inten * 0.62;`
};

const FIREFLY_VERT = /* glsl */`
${GLSL_HEAD}
uniform float uCount;
uniform float uPx;
varying float vTw;
void main() {
  uint s = pcg(uint(gl_VertexID) * 977u + uint(uCell.w) * 31u + 5u);
  vec2 base = uCell.xy + vec2(rnd(s), rnd(s)) * uCell.z;
  float ph = rnd(s) * 6.2832;
  float hgt = 0.14 + rnd(s) * 0.55;
  float sz = 4.0 + rnd(s) * 3.0;
  vec3 p = vec3(base.x + sin(uTime * 0.40 + ph) * 0.25, hgt + sin(uTime * 0.7 + ph * 2.0) * 0.07, base.y + cos(uTime * 0.33 + ph) * 0.25);
  vTw = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (1.4 + rnd(s)) + ph * 5.0));
  if (float(gl_VertexID) >= uCount) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; return; }
  gl_Position = projectionMatrix * viewMatrix * vec4(p + modelMatrix[3].xyz, 1.0);
  gl_PointSize = sz * uPx;
}`;
const FIREFLY_FRAG = /* glsl */`
varying float vTw;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.0, d);
  a *= a;
  vec3 col = vec3(1.0, 0.92, 0.5) * (0.8 + 1.4 * a) * vTw;
  gl_FragColor = vec4(col, a * vTw);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function lanternMake(ctx, cell) {
  const blades = hashField(ctx, cell, ctx.cache('lantern:g', lantern.geo), ribbonMaterial(ctx, cell, lantern), lantern.perM2);
  const maxN = Math.max(8, Math.round(cell.size * cell.size * 7));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(maxN * 3), 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: Object.assign({}, ctx.U, {
      uCell: { value: new THREE.Vector4(cell.ox, cell.oz, cell.size, cell.seed) }, uCount: { value: maxN }
    }),
    vertexShader: FIREFLY_VERT, fragmentShader: FIREFLY_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.userData.hash = { tris: 0, apply(f) { mat.uniforms.uCount.value = Math.round(maxN * f); } };
  pts.userData.itemsFixed = 0;
  return packCell([blades, pts]);
}

/* ---- 17. Susuki Plumes: silver pampas with feathered seed plumes ---- */

function plumeDecor(b, st, rnd) {
  const v = [], t = [];
  const rings = [[9, 0.15, 0.05], [8, 0.11, 0.034], [6, 0.075, 0.02]];
  for (const [n, len, spread] of rings) {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + rnd() * 0.5;
      const L = len * (0.85 + rnd() * 0.3);
      const i0 = v.length;
      v.push({ p: [-0.005, 0, 0], n: [Math.sin(a), 0.4, Math.cos(a)] });
      v.push({ p: [0.005, 0, 0], n: [Math.sin(a), 0.4, Math.cos(a)] });
      v.push({ p: [Math.sin(a) * spread, L, Math.cos(a) * spread], n: [Math.sin(a), 0.8, Math.cos(a)] });
      t.push([i0, i0 + 1, i0 + 2]);
    }
  }
  b.decor(st, v, t, 1);
}

function susukiGeometry() {
  const rnd = mulberry32(21);
  const b = new RibbonBuilder();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rnd() * 0.9;
    b.blade({ rows: 6, offX: Math.sin(a) * 0.02, offZ: Math.cos(a) * 0.02, yaw: a, lean: 1.8, h: 0.75 + rnd() * 0.25, w: 2.6, cls: 0 });
  }
  for (let i = 0; i < 3; i++) {
    const a = rnd() * 6.28;
    const st = b.blade({ rows: 7, offX: Math.sin(a) * 0.015, offZ: Math.cos(a) * 0.015, yaw: a, lean: 0.55 + rnd() * 0.35, h: 1.3 + rnd() * 0.3, w: 0.32, cls: 1 });
    plumeDecor(b, st, rnd);
  }
  return b.build();
}

const susuki = {
  id: 'susuki', perM2: 38,
  geo: susukiGeometry,
  defines: { TAPER: '0.8', NORMAL_UP: '0.5' },
  palette: { root: 0x4a5a2c, mid: 0x93964f, tip: 0xd9c98a }, ao: 0.25, trans: 1.5, spec: 0.0,
  place: /* glsl */`
  B.root = gridPos(s, id);
  float n = fbm(B.root * 1.3 + uCell.w * 1.7);
  float r1 = rnd(s), r2 = rnd(s), r3 = rnd(s), r4 = rnd(s);
  if (n < 0.24 && rnd(s) < 0.5) { B.alive = 0.0; return; }
  B.h = (0.70 + r1 * 0.30) * (0.85 + 0.4 * n);
  B.w = 0.016;
  B.yaw = r3 * 6.2832;
  B.lean = 0.3 + r4 * 0.4;
  B.windMul = 1.25;
  B.rnd = r4;
  B.tint = vec3(0.85 + 0.3 * rnd(s));
`,
  pre: 'wv *= 1.0 + aShape.w * 0.45;',
  fragColor: `
    if (vY.w > 0.5) {
      albedo = vec3(0.88, 0.85, 0.77) * (0.8 + 0.4 * vX.x);
    } else if (vX.w < 0.5) {
      albedo = mix(albedo * 0.95, vec3(0.80, 0.77, 0.50), smoothstep(0.5, 1.0, t) * 0.6);
      albedo *= 1.0 + 0.3 * (1.0 - smoothstep(0.0, 0.14, abs(vSide)));   // pale midrib
    } else {
      albedo = mix(vec3(0.42, 0.48, 0.26), vec3(0.80, 0.74, 0.50), t) * vTint;
    }`
};

/* ---- 18. Sumi-e Brush Grass ---- */

const sumi = {
  id: 'sumi', perM2: 62,
  geo: () => singleBlade(6),
  defines: { TAPER: '0.55', NORMAL_UP: '0.9', ROUND: '0.0' },
  palette: { root: 0x1b1a17, mid: 0x4c4d47, tip: 0xaab5a2 }, ao: 1.0, trans: 0, spec: 0,
  place: /* glsl */`
  B.root = gridPos(s, id);
  float n = fbm(B.root * 1.5 + uCell.w * 2.7);
  float r1 = rnd(s), r2 = rnd(s), r3 = rnd(s), r4 = rnd(s);
  if (n < 0.28 && rnd(s) < 0.5) { B.alive = 0.0; return; }
  B.h = 0.38 + r1 * 0.55;
  B.w = 0.022 + r2 * 0.016;
  B.yaw = r3 * 6.2832;
  B.lean = 0.35 + r4 * 0.5;
  B.rnd = r4;
`,
  fragColor: `
    float bristle = vnoise(vec2(vSide * 13.0 + vX.x * 60.0, t * 2.8 + vX.x * 31.0));
    float dry = smoothstep(0.35, 1.0, t) * 0.55 + abs(vSide) * 0.24 - 0.16;
    if (bristle < dry) alpha = 0.0;
    if (vX.x < 0.045) albedo = mix(vec3(0.62, 0.10, 0.07), vec3(0.92, 0.40, 0.22), t);`,
  fragLight: 'col = albedo * (0.82 + 0.18 * clamp(dot(N, L) * 0.5 + 0.5, 0.0, 1.0));'
};

/* ---- 19. Yarn Curls: springy helix strands ---- */

const yarn = {
  id: 'yarn', perM2: 210,
  geo: () => singleBlade(14),
  defines: { TAPER: '0.5', NORMAL_UP: '0.4', ROUND: '0.5' },
  palette: { root: 0xffffff, mid: 0xffffff, tip: 0xffffff }, ao: 0.5, trans: 0.3, spec: 0.2,
  vertDecl: /* glsl */`
  vec3 hsv(float h, float s, float v) {
    vec3 k = vec3(1.0, 2.0 / 3.0, 1.0 / 3.0);
    vec3 p = abs(fract(vec3(h) + k) * 6.0 - 3.0);
    return v * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), s);
  }`,
  place: /* glsl */`
  B.root = gridPos(s, id);
  float r1 = rnd(s), r2 = rnd(s), r3 = rnd(s), r4 = rnd(s);
  float n = fbm(B.root * 1.4 + uCell.w * 3.3);
  B.h = 0.30 + r1 * 0.26;
  B.w = 0.017 + r2 * 0.006;
  B.yaw = r3 * 6.2832;
  B.lean = 0.1 + r4 * 0.2;
  B.rnd = r4;
  B.phase = r3 * 6.2832;
  B.extra = vec4(r2, r3, 0.0, 0.0);
  B.tint = hsv(fract(r4 * 2.5 + n * 1.4), 0.5, 1.0);
`,
  curlCode: `
    float turns = 2.2 + B.extra.x * 1.6;
    float ang = t * turns * 6.2832 + B.phase;
    float crad = (0.06 + 0.04 * B.extra.y) * (1.0 + speedBlend * 0.9);
    float rr = crad * t;
    P.x += cos(ang) * rr;
    P.z += sin(ang) * rr;
    T.x += -sin(ang) * rr * turns * 6.2832 + cos(ang) * crad;
    T.z += cos(ang) * rr * turns * 6.2832 + sin(ang) * crad;`,
  fragColor: 'albedo = vTint * (0.62 + 0.5 * t);'
};

/* ---- 20. Moss Pillows ---- */

const MOSS_VERT = /* glsl */`
${GLSL_HEAD}
varying vec3 vN;
varying vec3 vW;
varying vec2 vP;
varying float vH;
varying float vFogD;
varying float vFlat;
float pillow(vec2 p) {
  vec3 c = cellular(p * 4.2 + vec2(uCell.w * 2.3));
  float dome = sqrt(max(1.0 - smoothstep(0.0, 0.62, c.x), 0.0));
  float hv = 0.65 + 0.35 * hash12(c.yz);
  return dome * hv * 0.115 + vnoise(p * 38.0) * 0.012;
}
void main() {
  vec2 p = uCell.xy + (position.xz + 0.5) * uCell.z;
  vec4 fd = fieldAt(p);
  vec3 tr = trailAt(p);
  float flatK = clamp(length(fd.xy) * 2.0 + tr.z * 0.8, 0.0, 1.0);
  float h0 = pillow(p);
  float e = 0.02;
  float hx = pillow(p + vec2(e, 0.0));
  float hz = pillow(p + vec2(0.0, e));
  vN = normalize(vec3(-(hx - h0) / e, 1.0, -(hz - h0) / e));
  float h = h0 * (1.0 - 0.6 * flatK);
  vH = h0;
  vFlat = flatK;
  vP = p;
  vec3 pos = vec3(p.x, h, p.y);
  vW = pos + modelMatrix[3].xyz;
  vFogD = distance(cameraPosition, vW);
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;
const MOSS_FRAG = /* glsl */`
${GLSL_HEAD}
varying vec3 vN;
varying vec3 vW;
varying vec2 vP;
varying float vH;
varying float vFogD;
varying float vFlat;
void main() {
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  vec3 L = normalize(uSunDir);
  float hh = clamp(vH / 0.13, 0.0, 1.0);
  vec3 dark = vec3(0.07, 0.20, 0.10), mid = vec3(0.22, 0.46, 0.14), light = vec3(0.52, 0.72, 0.22);
  vec3 albedo = hh < 0.5 ? mix(dark, mid, hh * 2.0) : mix(mid, light, (hh - 0.5) * 2.0);
  float grain = hash12(floor(vP * 260.0));
  albedo *= 0.80 + 0.40 * grain;
  vec3 cs = cellular(vP * 14.0 + 5.0);
  float star = (1.0 - smoothstep(0.05, 0.11, cs.x)) * step(0.84, hash12(cs.yz));
  albedo = mix(albedo, vec3(0.96, 0.95, 0.90), star);
  float wrap = clamp((dot(N, L) + 0.5) / 1.5, 0.0, 1.0);
  vec3 amb = mix(uGndCol, uSkyCol, N.y * 0.5 + 0.5);
  vec3 col = albedo * (amb + uSunCol * wrap) * mix(0.55, 1.0, hh) * (1.0 - 0.25 * vFlat);
  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.2);
  col += vec3(0.55, 0.78, 0.38) * fres * 0.34 * (0.5 + 0.5 * hh) * (0.5 + 0.5 * grain);
  col = applyFog(col, vFogD);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function mossMake(ctx, cell) {
  const seg = Math.max(12, Math.ceil(cell.size * 34));
  const geo = ctx.cache('moss:g' + seg, () => {
    const g = new THREE.PlaneGeometry(1, 1, seg, seg);
    g.rotateX(-Math.PI / 2);
    return g;
  });
  const mat = new THREE.ShaderMaterial({
    uniforms: Object.assign({}, ctx.U, { uCell: { value: new THREE.Vector4(cell.ox, cell.oz, cell.size, cell.seed) } }),
    vertexShader: MOSS_VERT, fragmentShader: MOSS_FRAG, side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.userData.hash = { tris: geo.index.count / 3, apply() {} };
  mesh.userData.itemsFixed = geo.attributes.position.count;
  return packCell([mesh]);
}

export const WILD = [
  {
    ...lantern, family: 'wild', name: 'Lantern Fibers', tag: 'Night grass that glows where you walk',
    blurb: 'A night-time field of hair-thin blades whose tips glow cyan, violet and pink. A wave of light rolls through on the wind, and the cat’s footsteps flare brighter where the grass is pushed. Sixty fireflies per cube are a single Points draw hashed from gl_VertexID.',
    how: [
      'Blades are the zero-attribute recipe, lit by a dim moon term; glow is pure emission.',
      'Emission = tip² × (idle pulse + travelling wave + 2.4 × push flatten) in the fragment shader.',
      'The push value comes from the cat-collision field, so glow is a free by-product of the physics.',
      'Fireflies: Points, positions and twinkle hashed from gl_VertexID, additive blending.'
    ],
    code: `float wave = smoothstep(.78, 1., sin(dot(vY.yz, windDir)*3.4 - uTime*1.1));
float inten = pow(t, 3.0) * (0.22 + 0.28*pulse + 0.7*wave + 2.0*vX.y);
emit = glowColour * inten;           // vX.y = how hard the cat is pushing
// fireflies, no attributes at all:
uint s = pcg(uint(gl_VertexID) * 977u);  vec2 base = cell + vec2(rnd(s), rnd(s)) * size;`,
    sources: [['Beats to Kill — grass highlight devlog', 'https://ironsilk-games.itch.io/beats-to-kill-to/devlog/333959/devlog-10']],
    gpu: 2, use: 'Moon Pool, Lantern Glade, night walks.',
    ground: 0x0a1a22, soil: 0x6e8da0,
    make: lanternMake
  },
  {
    ...susuki, family: 'wild', name: 'Susuki Plumes', tag: 'Silver pampas, feathered and backlit',
    blurb: 'Kyoto’s autumn silver grass: long arching leaves and tall stalks, each stalk capped with a fan of 23 feathery spikes that glow when the sun is behind them. Heavy sway, and the whole clump leans like a wave when the cat pushes through.',
    how: [
      '5 wide arching leaves + 3 stalks per instance; stalks carry a 23-tri plume (“tip decor”).',
      'Plume spikes are thin triangles on the stalk’s end frame; silver albedo, translucency ×1.5.',
      'Stalks take 1.45× wind via the class attribute; plume bobs with the stalk tip.',
      'Only ~38 plants/m²: ~163 tris each, so a whole cube is ~59k tris.'
    ],
    code: `for (const [n, len, spread] of [[9,.15,.05],[8,.11,.034],[6,.075,.02]])
  for (let k = 0; k < n; k++) spike(a, len, spread);   // thin triangle, base on stalk tip
b.decor(stalk, verts, tris, 1);
// vertex: stalks sway more than leaves
wv *= 1.0 + aShape.w * 0.45;`,
    sources: [['src/vegetation.js — buildSusukiGrass', '../src/vegetation.js']],
    gpu: 2, use: 'Autumn hillsides, river banks, moon-viewing deck.',
    ground: 0x6a6a3a, soil: 0xe5dcc0,
    make: ribbonMake(susuki)
  },
  {
    ...sumi, family: 'wild', name: 'Sumi-e Brush Grass', tag: 'Ink strokes on rice paper',
    blurb: 'Not realistic on purpose: each blade is a calligraphic brush stroke — wide, swept, dry-brush at the edges and tip — in ink black washing out to celadon, with the odd cinnabar accent. Unlit, so it costs almost nothing, and the paper below does the rest.',
    how: [
      'Hashed ribbon blades, wide and strongly leaning, only ~60 per m² so the paper shows; 6 rows for a smooth sweep.',
      'Dry-brush: bristle noise along the stroke discards the edges and tip (alpha cut, no blending).',
      'Ink pools dark at the root and washes to pale celadon; 4.5% of strokes are cinnabar.',
      'Flat, almost unlit shading — and a paper-texture ground.'
    ],
    code: `float bristle = vnoise(vec2(vSide * 13. + rnd * 60., t * 2.8 + rnd * 31.));
float dry = smoothstep(.35, 1., t) * .55 + abs(vSide) * .24 - .16;
if (bristle < dry) alpha = 0.;                      // dry-brush edge
if (rnd < 0.045) albedo = mix(cinnabar, vermilion, t);   // seal-red accent`,
    sources: [['Beats to Kill — grass highlight devlog', 'https://ironsilk-games.itch.io/beats-to-kill-to/devlog/333959/devlog-10']],
    gpu: 1, use: 'Dream sequences, scroll interludes, a Kyoto ink-wash chapter.',
    ground: 0xf2ecdc, groundKind: 'paper', soil: 0xefe6d0,
    make: ribbonMake(sumi)
  },
  {
    ...yarn, family: 'wild', name: 'Yarn Curls', tag: 'Springy helix strands',
    blurb: 'A playful pastel field of coiled yarn. Every blade is a helix computed in the vertex shader; walk through and the coils loosen with the spring velocity of the cat-collision field, then bounce back — the grass literally boings. For the yarn-ball corner of the village.',
    how: [
      '14-row ribbon (27 tris); a helix offset (radius ∝ t) added to the spine, tangent corrected analytically.',
      'Coil radius × (1 + 0.9 × spring speed): the field’s velocity channel makes curls loosen and snap back.',
      'Hue from hash + patch noise gives soft pastel drifts, not confetti.',
      'No textures; ~210 fat curls/m².'
    ],
    code: `float ang = t * turns * 6.2832 + phase;
float crad = (0.035 + 0.03 * r) * (1.0 + speed * 0.9);   // speed = |field.zw|
P.x += cos(ang) * crad * t;  P.z += sin(ang) * crad * t;
T.x += -sin(ang) * crad*t * turns * 6.2832 + cos(ang) * crad;   // keep normals right`,
    sources: [],
    gpu: 3, use: 'The yarn-ball playground and other whimsical corners.',
    ground: 0x6d5a6a, soil: 0xecdde4,
    make: ribbonMake(yarn)
  },
  {
    id: 'moss', family: 'wild', name: 'Moss Pillows', tag: 'Dented, springy, velvet',
    blurb: 'Zero blades: a subdivided plane whose heights are Worley domes (little moss pillows), fuzzed with grain, velvet fresnel sheen and tiny star flowers. Paws dent the pillows and they puff back up; the normals are recomputed per vertex so lighting stays right while dented.',
    how: [
      'One 10k-vertex plane per cube; height = √(dome) of Worley noise + fine noise.',
      'Normals by finite differences in the vertex shader; dent = flatten × 0.6 from the field + trail.',
      'Fragment: height ramp (dark → lime), 260-cell grain, fresnel velvet sheen, cellular star flowers.',
      'The cheapest “thick low grass” of all: 1 draw, ~20k tris, no instancing.'
    ],
    code: `float dome = sqrt(max(1.0 - smoothstep(0.0, 0.62, cellular(p*4.2).x), 0.0));
float h0 = dome * hv * 0.115 + vnoise(p * 38.0) * 0.012;
float h  = h0 * (1.0 - 0.6 * flatK);                 // paws dent it
// fragment: velvet
col += mossGlow * pow(1.0 - dot(N, V), 2.2) * 0.34;`,
    sources: [],
    gpu: 1, use: 'Moon Pool banks, shrine steps, damp forest floor.',
    ground: 0x16301a, noGround: true, soil: 0xb8cfa8, unit: 'verts',
    make: mossMake
  }
];
