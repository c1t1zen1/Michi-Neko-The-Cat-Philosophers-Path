// Family 2 — five techniques found in the research (see docs/GRASS_RESEARCH_2026-10-23.md)
import * as THREE from 'three';
import {
  RibbonBuilder, singleBlade, ribbonMaterial, hashField, packCell, shellField, crossedCards, cardMaterial,
  GLSL_HEAD
} from './kit.js';
import { tuftTexture } from './textures.js';
import { ribbonMake, MEADOW, MEADOW_ROOT, MEADOW_BODY, PLACE_MEADOW, nearFocusUpdate } from './types_util.js';

/* ---- 6. Alpha-Card Tufts (Codrops "fluffiest grass") ---- */

const cards = { id: 'cards', perM2: 95, sizeMin: 0.30, sizeMax: 0.56, aspect: 0.9, ao: 0.45 };

function cardsMake(ctx, cell) {
  const geo = ctx.cache('cards:geo', () => crossedCards(4, 2));
  const map = ctx.cache('cards:tex', () => tuftTexture());
  const mat = cardMaterial(ctx, cell, cards, map);
  const mesh = hashField(ctx, cell, geo, mat, cards.perM2);
  return packCell([mesh]);
}

/* ---- 7. Bezier Blades (Ghost of Tsushima style) ---- */

const bezier = {
  id: 'bezier', perM2: 1500,
  geo: () => singleBlade(6),
  defines: { BEZIER: '', USE_WIDEN: '', WIDEN: '0.7', TAPER: '0.85', NORMAL_UP: '0.55' },
  palette: { root: 0x244620, mid: 0x5c8f33, tip: 0xbbd36b }, ao: 0.45, trans: 0.7, spec: 0.14,
  place: /* glsl */`
  B.root = gridPos(s, id);
  vec3 cl = cellular(B.root * 3.4 + vec2(uCell.w * 1.7));
  float md = cl.x;
  float ch = hash12(cl.yz + 3.1);
  vec2 centre = (cl.yz - vec2(uCell.w * 1.7)) / 3.4;
  vec2 outv = B.root - centre;
  float r1 = rnd(s), r2 = rnd(s), r3 = rnd(s), r4 = rnd(s);
  float n = fbm(B.root * 1.4 + uCell.w);
  float clear = 1.0 - smoothstep(0.22, 0.38, n);
  if (rnd(s) < clear * 0.45) { B.alive = 0.0; return; }
  B.h = (0.26 + 0.26 * ch + r1 * 0.14) * (1.0 - 0.4 * smoothstep(0.2, 0.7, md));
  float outYaw = atan(outv.x, outv.y + 1e-5);
  B.yaw = (r3 < 0.7) ? outYaw + (r4 - 0.5) * 1.6 : r3 * 6.2832;
  B.lean = 0.2 + 0.5 * smoothstep(0.0, 0.6, md);
  B.w = 0.011 + r2 * 0.008;
  B.rnd = r4;
  B.tint = mix(vec3(0.85, 1.0, 0.78), vec3(1.05, 1.0, 0.7), ch * ch) * (0.75 + 0.25 * r4);
`
};

/* ---- 8. Tri-Quad Clumps (False Earth / Cinevva) ---- */

function triQuadGeometry() {
  const b = new RibbonBuilder();
  for (let k = 0; k < 3; k++) b.blade({ rows: 3, yaw: (k * Math.PI) / 3, lean: 1, h: 1, w: 1, cls: k });
  return b.build();
}

const triquad = {
  id: 'triquad', perM2: 330, itemsPer: 9,
  geo: triQuadGeometry,
  defines: { TAPER: '0.12', NORMAL_UP: '0.75', ROUND: '0.1' },
  palette: { root: 0x2b5126, mid: 0x5f9638, tip: 0xaecb62 }, ao: 0.4, trans: 0.6, spec: 0.06,
  place: PLACE_MEADOW + `
  B.w = 0.034 + r2 * 0.016;
  B.lean = 0.08 + r4 * 0.2;`,
  fragColor: `
    float kk = (vSide * 0.5 + 0.5) * 3.0;
    float lc = abs(fract(kk) - 0.5) * 2.0;
    float hv = 0.70 + 0.30 * hash12(vec2(floor(kk), vX.w + vX.x * 7.0));
    if (t > hv || lc > pow(max(1.0 - t / hv, 0.0), 0.72)) alpha = 0.0;
    albedo *= 0.86 + 0.14 * sin(vSide * 7.0 + vX.x * 30.0);`
};

/* ---- 9. Shell Turf (Acerola / Godot fur-grass) ---- */

const shell = {
  id: 'shell', layers: 30, height: 0.2, spread: 1.15, density: 62, thick: 0.46, ao: 0.32,
  palette: { root: 0x2a5622, mid: 0x5b9a3a, tip: 0xaed863 }
};

/* ---- 10. Ring LOD: following detail window + thinning rings + impostor ---- */

const R1 = 0.95, R2 = 1.9;
const ringNear = {
  id: 'ring-near',
  geo: () => singleBlade(5),
  palette: MEADOW, ao: 0.4, trans: 0.65, spec: 0.08,
  uniforms: () => ({ uA: { value: 0.0235 } }),
  vertDecl: 'uniform float uA;',
  place: /* glsl */`
  float G = uGrid;
  float fid = float(id);
  float iz = floor(fid / G);
  float ix = fid - iz * G;
  vec2 wc = floor(uFocus.xz / uA) - floor(G * 0.5) + vec2(ix, iz);
  uint s2 = pcg(uint(int(wc.x) + 100000) * 73856093u) ^ pcg(uint(int(wc.y) + 100000) * 19349663u);
  s2 = pcg(s2);
  B.root = (wc + vec2(rnd(s2), rnd(s2))) * uA;
  s = s2;
  float dist = distance(B.root, uFocus.xz);
  if (B.root.x < uCell.x || B.root.y < uCell.y || B.root.x > uCell.x + uCell.z || B.root.y > uCell.y + uCell.z || dist > R1) {
    B.alive = 0.0; return;
  }
` + MEADOW_BODY + `
  B.h *= 1.0 - smoothstep(R1 * 0.78, R1, dist);`,
  defines: { R1: R1.toFixed(3), R2: R2.toFixed(3) }
};
const ringFar = {
  id: 'ring-far', perM2: 1100,
  geo: () => singleBlade(2),
  palette: MEADOW, ao: 0.4, trans: 0.65, spec: 0.0,
  place: MEADOW_ROOT + `
  float dist = distance(B.root, uFocus.xz);
  float ring = smoothstep(R1, R2, dist);
  if (dist < R1 * 0.9) { B.alive = 0.0; return; }
  if (rnd(s) > mix(0.95, 0.36, ring)) { B.alive = 0.0; return; }
` + MEADOW_BODY + `
  B.w *= mix(1.3, 2.0, ring);`,
  defines: { R1: R1.toFixed(3), R2: R2.toFixed(3) }
};

const IMPOSTOR_VERT = /* glsl */`
${GLSL_HEAD}
varying vec3 vW;
varying vec2 vP;
varying float vFogD;
void main() {
  vP = uCell.xy + (position.xz + 0.5) * uCell.z;
  vec3 p = vec3(vP.x, 0.004, vP.y);
  vW = p + modelMatrix[3].xyz;
  vFogD = distance(cameraPosition, vW);
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;
const IMPOSTOR_FRAG = /* glsl */`
${GLSL_HEAD}
varying vec3 vW;
varying vec2 vP;
varying float vFogD;
void main() {
  float dist = distance(vP, uFocus.xz);
  float fade = smoothstep(R1 * 0.95, R2 * 1.05, dist);
  if (hash12(gl_FragCoord.xy) > fade) discard;
  float n1 = vnoise(vP * 55.0);
  float n2 = fbm(vP * 7.0 + uCell.w);
  vec3 dark = vec3(0.07, 0.16, 0.06), light = vec3(0.22, 0.38, 0.12);
  vec3 albedo = mix(dark, light, clamp(n1 * 0.6 + n2 * 0.6, 0.0, 1.0));
  vec3 up = vec3(0.0, 1.0, 0.0);
  vec3 L = normalize(uSunDir);
  float wrap = clamp((dot(up, L) + 0.5) / 1.5, 0.0, 1.0);
  vec3 col = albedo * (mix(uGndCol, uSkyCol, 0.9) + uSunCol * wrap) * 0.85;
  col = applyFog(col, vFogD);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function ringMake(ctx, cell) {
  const nearGeo = ctx.cache('ring:ng', () => singleBlade(5));
  const farGeo = ctx.cache('ring:fg', () => singleBlade(2));
  const nearMat = ribbonMaterial(ctx, cell, ringNear);
  const near = hashField(ctx, cell, nearGeo, nearMat, 1800, {
    apply: (f, geo, mat) => {
      const a = 0.0235 / Math.sqrt(Math.max(f, 0.05));
      const G = Math.ceil((2 * R1) / a) + 2;
      mat.uniforms.uA.value = a;
      mat.uniforms.uGrid.value = G;
      geo.instanceCount = G * G;
    }
  });
  const far = hashField(ctx, cell, farGeo, ribbonMaterial(ctx, cell, ringFar), ringFar.perM2);
  const plane = ctx.cache('ring:plane', () => { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); return g; });
  const imp = new THREE.Mesh(plane, new THREE.ShaderMaterial({
    uniforms: Object.assign({}, ctx.U, { uCell: { value: new THREE.Vector4(cell.ox, cell.oz, cell.size, cell.seed) } }),
    vertexShader: IMPOSTOR_VERT, fragmentShader: IMPOSTOR_FRAG, defines: { R1: R1.toFixed(3), R2: R2.toFixed(3) }
  }));
  imp.frustumCulled = false;
  imp.userData.hash = { apply() {}, tris: 2 };
  imp.userData.itemsFixed = 0;
  imp.geometry = plane;
  const pack = packCell([imp, far, near], { update: nearFocusUpdate(near, cell, R1 + 0.15) });
  return pack;
}

export const FIELD = [
  {
    ...cards, family: 'field', name: 'Alpha-Card Tufts', tag: 'Painted tufts on crossed quads',
    blurb: 'The classic cheap trick: each instance is two crossed quads carrying a painted 17-blade tuft with an alpha cut-out. 16 triangles buy what 17 real blades would cost in 119 — and every card is hash-placed, scaled, hued and swayed in the vertex shader.',
    how: [
      'Crossed-quad geometry, 4 rows tall so the top bends in the wind (16 tris/card).',
      'Tuft painted once into a 256px canvas texture; alphaTest cut-out, no sorting.',
      'Per-card size, width, yaw and hue from the instance hash; bend ∝ height².',
      'Cost is overdraw: keep silhouettes tight and cards sparse.'
    ],
    code: `if (tex.a < 0.42) discard;                 // alphaTest, not blending
vec2 d = (windVec(root) * 0.9 * size + push) * t * t;
float hgt = size * t * (1.0 - flat * 0.55 * t);
vec3 pos = vec3(root.x + xz.x + d.x, hgt, root.y + xz.y + d.y);`,
    sources: [
      ['Codrops — Fluffiest grass with Three.js', 'https://tympanus.net/codrops/2025/02/04/how-to-make-the-fluffiest-grass-with-three-js/'],
      ['Three.js forum — what is the most performant way to make grass', 'https://discourse.threejs.org/t/whats-the-most-performant-way-to-make-grass/39774']
    ],
    gpu: 2, use: 'Distant meadows and anywhere triangles are tight.',
    ground: 0x4d6a36, soil: 0xdfe8d2,
    make: cardsMake
  },
  {
    ...bezier, family: 'field', name: 'Bezier Blades', tag: 'Ghost-of-Tsushima spine',
    blurb: 'Each blade is a cubic Bézier evaluated per vertex: wind and the cat nudge the tip control point, the blade keeps its length, and blades that are edge-on to the camera are widened in view space so the silhouette never thins to nothing. Clumps come from Worley noise.',
    how: [
      '6 rows + tip (11 tris); spine P(t) = cubic Bézier with tip control driven by wind + push.',
      'Length preserved: tip height = √(h² − bend²·0.85) so a pushed blade lies down instead of stretching.',
      'View-space widening: offset along cross(T, V) × (1 − |N·V|).',
      'Worley (cellular) noise sets clump height, outward splay and lean.'
    ],
    code: `vec3 p1 = vec3(K*0.08, h*0.38), p2 = vec3(K*0.44, .5*ty+.35*h), p3 = vec3(K, ty);
P = 3.*it*it*t*p1 + 3.*it*t*t*p2 + t*t*t*p3;       // cubic Bezier
T = 3.*it*it*p1 + 6.*it*t*(p2-p1) + 3.*t*t*(p3-p2); // analytic tangent
vec3 Rv = normalize(cross(T, V));
pos += Rv * side * ww * 0.7 * (1.0 - abs(dot(N, V)));  // widen when edge-on`,
    sources: [
      ['GDC — Procedural Grass in Ghost of Tsushima', 'https://gdcvault.com/play/1027214/Advanced-Graphics-Summit-Procedural-Grass'],
      ['GodotGrass (GoT reimplementation)', 'https://github.com/2Retr0/GodotGrass']
    ],
    gpu: 3, use: 'Hero meadows where the cat is close.',
    ground: 0x3f5e2d, soil: 0xdbe6cb,
    make: ribbonMake(bezier)
  },
  {
    ...triquad, family: 'field', name: 'Tri-Quad Clumps', tag: 'Three quads, nine blades',
    blurb: 'From the WebGPU “False Earth” write-up: a clump is three tapered quads 60° apart, so one is always near-perpendicular to the camera and the clump covers three blade-widths of screen. Here each quad is alpha-cut into three pointed blades — 15 triangles for nine blades, placed by hash.',
    how: [
      'Three 3-row quads at 0°, 60°, 120° (15 tris per clump, 9 blades).',
      'Fragment alpha-cuts each quad into three tapered blades of varied height.',
      'No instance buffers: position, size, tint hashed from gl_InstanceID.',
      'Wind and push gated by height so the clump base stays anchored.'
    ],
    code: `// 3 quads 60deg apart
for (let k = 0; k < 3; k++) b.blade({ rows: 3, yaw: k * Math.PI / 3, w: 1 });
// fragment: carve three blades from each quad
float kk = (vSide * .5 + .5) * 3.0, lc = abs(fract(kk) - .5) * 2.0;
if (t > hv || lc > pow(1.0 - t / hv, 0.72)) alpha = 0.0;`,
    sources: [
      ['Codrops — False Earth (WebGPU)', 'https://tympanus.net/codrops/2026/04/21/false-earth-from-webgl-limits-to-a-webgpu-driven-world/'],
      ['Cinevva — Open World Browser pt. 28', 'https://app.cinevva.com/blog/2026-05-14-open-world-browser-part-28-grass-and-occlusion']
    ],
    gpu: 2, use: 'Big, cheap fields with a hand-planted look.',
    ground: 0x4a6a35, soil: 0xdbe6cb,
    make: ribbonMake(triquad)
  },
  {
    ...shell, family: 'field', name: 'Shell Turf', tag: 'Thirty layers, zero blades',
    blurb: 'No blade geometry at all. One subdivided plane is drawn thirty times, each copy lifted a little higher; every pixel discards itself where a per-strand hash says the strand is shorter than this layer. Dense, soft, and its cost is layers × pixels instead of blade count.',
    how: [
      'One subdivided plane (≈3.5k tris on a cube), instanced `layers` times — layer = gl_InstanceID.',
      'Fragment: strand cell = floor(uv·density); hash gives length; radius shrinks with height.',
      'Wind and the cat bend upper layers more (∝ layer²) so strands shear naturally.',
      'Breaks at grazing angles (layers show) — best seen from above.'
    ],
    code: `float layer = float(gl_InstanceID) / (uLayers - 1.0);
vec3 pos = vec3(xz + d * layer*layer, pow(layer, uSpread) * uShellH, ...);
// fragment
float len = 0.45 + 0.55 * hash12(floor(uv * uDensity));
if (layer > len || dist > uThick * (1.0 - layer / len)) discard;`,
    sources: [
      ['Godot Shaders — Fur/Grass with Shell Texturing (CC0)', 'https://godotshaders.com/shader/fur-grass-with-shell-texturing/'],
      ['j-vandy — Shell Textured Grass Rendering', 'https://jvandy.itch.io/shell-texturing']
    ],
    gpu: 4, use: 'Short lawns, moss-adjacent turf and far-field ground cover.',
    ground: 0x2b4a22, soil: 0xd3e0c3,
    make: (ctx, cell) => packCell([shellField(ctx, cell, shell)])
  },
  {
    id: 'ring-lod', family: 'field', name: 'Ring LOD', tag: 'Detail follows the cat',
    blurb: 'Full-detail blades exist only in a window that follows the cat; the hash grid is snapped to world space so blades never swim as it moves. Beyond it, 2-row blades thin out ring by ring and widen to keep coverage, while a dithered ground impostor fades in. Detail where you look, almost nothing elsewhere.',
    how: [
      'Near window ≈ 1.9 m wide, ~7k blades, world-cell hashing (stable while the window slides).',
      'Far mesh: 3-tri blades at 1,100/m², kept with probability 0.95 → 0.36 by distance and widened up to 2×.',
      'Ground impostor with value-noise carpet, dithered fade-in (hash of gl_FragCoord).',
      'Culled instances still run a trivial vertex shader — chunked CPU LOD would trim that too.'
    ],
    code: `vec2 wc = floor(uFocus.xz / uA) - floor(G*0.5) + vec2(ix, iz);  // world cell
uint s2 = pcg(uint(int(wc.x)+100000)*73856093u) ^ pcg(uint(int(wc.y)+100000)*19349663u);
B.root = (wc + vec2(rnd(s2), rnd(s2))) * uA;     // same blade whatever the window
if (distance(B.root, uFocus.xz) > R1) B.alive = 0.0;
// far: keep = mix(0.95, 0.36, smoothstep(R1, R2, dist)); width *= mix(1.3, 2.0, ring)`,
    sources: [
      ['skills.cat — procedural grass (ring LOD table)', 'https://skills.cat/skills/ck42bb/procedural-grass-threejs'],
      ['Hexaquo — LOD tricks for infinite plains of grass', 'https://hexaquo.at/pages/grass-rendering-series-part-4-level-of-detail-tricks-for-infinite-plains-of-grass-in-godot/']
    ],
    gpu: 2, use: 'Large open fields: the cheapest way to keep the cat’s feet lush.',
    ground: 0x3a5a2a, soil: 0xd8e4c8, noGround: false,
    make: ringMake
  }
];
