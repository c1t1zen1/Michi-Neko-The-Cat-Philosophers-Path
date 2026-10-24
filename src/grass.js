import * as THREE from 'three';

/**
 * Game grass — the Grass Lab (grass/, docs/GRASS_RESEARCH_2026-10-23.md)
 * brought into the valley and the summit.
 *
 * Every blade is placed by hashing gl_InstanceID against a WORLD-snapped
 * grid (no per-blade buffers), so a layer is one draw call whose density is
 * a single uniform. Layers come in two shapes:
 *
 *  - rings: a window of instances that follows the cat (shifted toward
 *    where the camera looks). Near ring = Bezier blade tufts with pressed
 *    trails, mid ring = tri-quad clumps, far ring = painted alpha cards.
 *    Each ring fades out where the next one fades in (the "halo" grow-in).
 *  - zones: fixed rectangles (a glade, a lawn, a summit clearing).
 *
 * A CPU-baked biome mask (RGBA: meadow, edge thicket, flowers, wild/wet)
 * keeps grass off paths, water and buildings and decides which grass grows
 * where. A GPU spring + trail simulation (half-float ping-pong that scrolls
 * with the cat) bends blades away from the cat's body and paws, ripples
 * outward, and leaves a slowly recovering pressed path.
 *
 * Blades render through MeshLambertMaterial (vertex + colour stages
 * replaced in onBeforeCompile) so they keep the scene's shadows, lantern
 * lights and fog.
 */

export function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STAMPS = 8;

/* ------------------------------------------------------------------ */
/*  GLSL library                                                       */
/* ------------------------------------------------------------------ */

const GLSL_LIB = /* glsl */`
uniform float uTime;
uniform float uWind;
uniform vec2 uWindDir;
uniform vec3 uFocus;
uniform vec4 uFieldRect;
uniform float uFieldOn;
uniform sampler2D uField;
uniform sampler2D uTrail;
uniform vec4 uStamp[${STAMPS}];
uniform sampler2D uMask;
uniform vec4 uMaskRect;
uniform float uMaskOn;
uniform vec4 uRingA;
uniform vec4 uRingB;
uniform vec4 uZone;
uniform float uSpacing;
uniform float uGrid;
uniform float uGridZ;
uniform float uSeed;
uniform float uNight;

uint pcg(uint v) {
  uint s = v * 747796405u + 2891336453u;
  uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
float rnd(inout uint s) {
  s = pcg(s);
  return float(s) * (1.0 / 4294967295.0);
}
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 3; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return s;
}
// Worley noise: x = distance to the nearest feature point, yz = that point
vec3 cellular(vec2 p) {
  vec2 ci = floor(p);
  float md = 9.0;
  vec2 mc = vec2(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = ci + vec2(float(i), float(j));
      vec2 c = g + vec2(hash12(g), hash12(g + 31.7));
      float d = distance(p, c);
      if (d < md) { md = d; mc = c; }
    }
  }
  return vec3(md, mc);
}
// Wind as a lean (fraction of blade height): rolling gust fronts + patchy
// noise + per-position flutter
vec2 windVec(vec2 p) {
  float t = uTime;
  vec2 d = normalize(uWindDir);
  vec2 n = vec2(-d.y, d.x);
  float along = dot(p, d);
  float across = dot(p, n);
  float swell = sin(along * 0.45 - t * 1.1) * 0.5 + 0.5;
  float gust = vnoise(vec2(along * 0.22 - t * 0.75, across * 0.3));
  float amp = (0.30 + 0.70 * gust * swell) * (0.10 + 0.22 * uWind);
  float flut = sin(t * 3.1 + p.x * 5.0 + p.y * 4.3) * 0.5;
  return d * amp + n * flut * 0.05 * (0.3 + uWind);
}
// Cat-collision spring field: xy = lean (m, away from the cat), zw = velocity
vec4 fieldAt(vec2 p) {
  vec2 uv = (p - uFieldRect.xy) * uFieldRect.zw;
  if (uFieldOn > 0.5) {
    if (uv.x <= 0.0 || uv.y <= 0.0 || uv.x >= 1.0 || uv.y >= 1.0) return vec4(0.0);
    return texture2D(uField, uv);
  }
  vec2 d = vec2(0.0);
  for (int i = 0; i < ${STAMPS}; i++) {
    vec4 st = uStamp[i];
    vec2 a = p - st.xy;
    float l = length(a);
    float f = (1.0 - smoothstep(0.0, st.z, l)) * st.w;
    d += a / max(l, 0.001) * f * 0.45;
  }
  return vec4(d, 0.0, 0.0);
}
// Slow "pressed grass" memory: lean.xy, pressed
vec3 trailAt(vec2 p) {
  if (uFieldOn < 0.5) return vec3(0.0);
  vec2 uv = (p - uFieldRect.xy) * uFieldRect.zw;
  if (uv.x <= 0.0 || uv.y <= 0.0 || uv.x >= 1.0 || uv.y >= 1.0) return vec3(0.0);
  return texture2D(uTrail, uv).xyz;
}
// Biome mask: r meadow, g edge thicket, b flowers, a wild / wet bank
vec4 maskAt(vec2 p) {
  if (uMaskOn < 0.5) return vec4(1.0, 0.0, 0.0, 0.0);
  vec2 uv = (p - uMaskRect.xy) * uMaskRect.zw;
  if (uv.x <= 0.0 || uv.y <= 0.0 || uv.x >= 1.0 || uv.y >= 1.0) return vec4(0.0);
  return texture2D(uMask, uv);
}
// World-snapped grid cell for instance id: the same blade grows in the same
// place however the window slides.
vec2 snapRoot(inout uint s, int id, vec2 centre) {
  float G = uGrid;
  float fid = float(id);
  float iz = floor(fid / G);
  float ix = fid - iz * G;
  vec2 wc = floor(centre / uSpacing) - floor(vec2(G, uGridZ) * 0.5) + vec2(ix, iz);
  uint s2 = pcg(uint(int(wc.x) + 100000) * 73856093u) ^ pcg(uint(int(wc.y) + 100000) * 19349663u);
  s = pcg(s2 + uint(uSeed) * 2654435761u);
  return (wc + vec2(rnd(s), rnd(s))) * uSpacing;
}
// Ring membership: 1 inside this ring, fading out at its rim and fading in
// over the inner ring's rim, so neighbouring rings cross-fade.
float ringKeep(vec2 p) {
  float dA = distance(p, uRingA.xy);
  float k = 1.0 - smoothstep(uRingA.w * 0.8, uRingA.w, dA);
  if (uRingB.z > 0.0) k *= smoothstep(uRingB.z * 0.8, uRingB.z, distance(p, uRingB.xy));
  if (uZone.z > 0.0) {
    vec2 q = abs(p - uZone.xy) - uZone.zw;
    if (q.x > 0.0 || q.y > 0.0) k = 0.0;
  }
  return k;
}
`;

/* ------------------------------------------------------------------ */
/*  Geometry builders                                                  */
/* ------------------------------------------------------------------ */

/**
 * Ribbon-blade geometry. Per-vertex attributes (shared by every instance):
 *  position  (side -1..1, t 0..1, 0)       ribbon verts
 *  aBlade    (offX, offZ, yawOff, leanMul) tuft placement of this blade
 *  aShape    (heightMul, widthMul, kind, cls)   kind 0 ribbon, 1 tip decor, 2 billboard
 *  aLocal    decor-local position (tip frame: x across, y along, z facing)
 */
export class RibbonBuilder {
  constructor() {
    this.pos = []; this.nor = []; this.uv = []; this.bladeAttr = []; this.shape = []; this.local = []; this.idx = [];
    this.v = 0;
  }
  _push(p, n, uv, b, kind, lo) {
    this.pos.push(p[0], p[1], p[2]); this.nor.push(n[0], n[1], n[2]); this.uv.push(uv[0], uv[1]);
    this.bladeAttr.push(b.offX, b.offZ, b.yaw, b.lean);
    this.shape.push(b.h, b.w, kind, b.cls);
    this.local.push(lo[0], lo[1], lo[2]);
    return this.v++;
  }
  blade(o = {}) {
    const b = { offX: 0, offZ: 0, yaw: 0, lean: 1, h: 1, w: 1, cls: 0, rows: 4, ...o };
    const first = this.v;
    for (let i = 0; i < b.rows; i++) {
      const t = i / b.rows;
      this._push([-1, t, 0], [0, 0, 1], [0, t], b, 0, [0, 0, 0]);
      this._push([1, t, 0], [0, 0, 1], [1, t], b, 0, [0, 0, 0]);
    }
    const tip = this._push([0, 1, 0], [0, 0, 1], [0.5, 1], b, 0, [0, 0, 0]);
    for (let i = 0; i < b.rows - 1; i++) {
      const a = first + i * 2, c = first + (i + 1) * 2;
      this.idx.push(a, c, a + 1, a + 1, c, c + 1);
    }
    const l = first + (b.rows - 1) * 2;
    this.idx.push(l, tip, l + 1);
    return b;
  }
  decor(b, verts, tris, kind = 1) {
    const base = this.v;
    for (const v of verts) this._push([0, 1, 0], v.n || [0, 0, 1], v.uv || [0, 0], b, kind, v.p);
    for (const t of tris) this.idx.push(base + t[0], base + t[1], base + t[2]);
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('aBlade', new THREE.Float32BufferAttribute(this.bladeAttr, 4));
    g.setAttribute('aShape', new THREE.Float32BufferAttribute(this.shape, 4));
    g.setAttribute('aLocal', new THREE.Float32BufferAttribute(this.local, 3));
    g.setIndex(this.idx);
    return g;
  }
}

function singleBlade(rows = 4) {
  const b = new RibbonBuilder();
  b.blade({ rows });
  return b.build();
}

function tuftGeometry({ count = 3, rows = 5, spread = 0.035, hMin = 0.7, hMax = 1.0, wMul = 1, lean = 1.1, seed = 3 } = {}) {
  const rnd = mulberry32(seed);
  const b = new RibbonBuilder();
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rnd() * 0.8;
    const r = i === 0 ? 0 : spread * (0.5 + rnd() * 0.7);
    b.blade({
      rows, offX: Math.sin(a) * r, offZ: Math.cos(a) * r, yaw: a + (rnd() - 0.5) * 0.7,
      lean: lean * (0.7 + rnd() * 0.6), h: i === 0 ? hMax : hMin + rnd() * (hMax - hMin),
      w: wMul * (0.85 + rnd() * 0.3)
    });
  }
  return b.build();
}

function triQuadGeometry(rows = 3) {
  const b = new RibbonBuilder();
  for (let k = 0; k < 3; k++) b.blade({ rows, yaw: (k * Math.PI) / 3, lean: 1, h: 1, w: 1, cls: k });
  return b.build();
}

function seedHeadDecor(len = 0.07, rad = 0.012) {
  const v = [
    { p: [0, 0, 0], n: [0, -1, 0] },
    { p: [rad, len * 0.3, 0], n: [1, 0, 0] }, { p: [0, len * 0.3, rad], n: [0, 0, 1] },
    { p: [-rad, len * 0.3, 0], n: [-1, 0, 0] }, { p: [0, len * 0.3, -rad], n: [0, 0, -1] },
    { p: [0, len, 0], n: [0, 1, 0] }
  ];
  const t = [[0, 2, 1], [0, 3, 2], [0, 4, 3], [0, 1, 4], [5, 1, 2], [5, 2, 3], [5, 3, 4], [5, 4, 1]];
  return [v, t];
}

function thicketGeometry() {
  const rnd = mulberry32(9);
  const b = new RibbonBuilder();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rnd();
    b.blade({ rows: 3, offX: Math.sin(a) * 0.03, offZ: Math.cos(a) * 0.03, yaw: a, lean: 1.3, h: 0.5 + rnd() * 0.15, w: 1.5, cls: 0 });
  }
  for (let i = 0; i < 3; i++) {
    const a = rnd() * 6.28;
    b.blade({ rows: 4, offX: Math.sin(a) * 0.02, offZ: Math.cos(a) * 0.02, yaw: a, lean: 1.0, h: 0.95 + rnd() * 0.25, w: 1.0, cls: 1 });
  }
  for (let i = 0; i < 2; i++) {
    const a = rnd() * 6.28;
    const st = b.blade({ rows: 6, offX: Math.sin(a) * 0.015, offZ: Math.cos(a) * 0.015, yaw: a, lean: 0.7, h: 1.65 + rnd() * 0.3, w: 0.5, cls: 2 });
    if (i === 0) {
      const [v, t] = seedHeadDecor(0.05, 0.008);
      b.decor(st, v, t, 1);
    }
  }
  return b.build();
}

function flowerGeometry() {
  const b = new RibbonBuilder();
  const st = b.blade({ rows: 4, lean: 0.8, h: 1, w: 0.22 });
  b.decor(st, [
    { p: [-0.5, -0.5, 0], uv: [0, 0] }, { p: [0.5, -0.5, 0], uv: [1, 0] },
    { p: [0.5, 0.5, 0], uv: [1, 1] }, { p: [-0.5, 0.5, 0], uv: [0, 1] }
  ], [[0, 1, 2], [0, 2, 3]], 2);
  return b.build();
}

function susukiGeometry() {
  const rnd = mulberry32(21);
  const b = new RibbonBuilder();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rnd() * 0.9;
    b.blade({ rows: 5, offX: Math.sin(a) * 0.02, offZ: Math.cos(a) * 0.02, yaw: a, lean: 1.8, h: 0.75 + rnd() * 0.25, w: 2.6, cls: 0 });
  }
  for (let i = 0; i < 3; i++) {
    const a = rnd() * 6.28;
    const st = b.blade({ rows: 6, offX: Math.sin(a) * 0.015, offZ: Math.cos(a) * 0.015, yaw: a, lean: 0.55 + rnd() * 0.35, h: 1.3 + rnd() * 0.3, w: 0.32, cls: 1 });
    const v = [], t = [];
    for (const [n, len, spread] of [[9, 0.15, 0.05], [8, 0.11, 0.034], [6, 0.075, 0.02]]) {
      for (let k = 0; k < n; k++) {
        const ang = (k / n) * Math.PI * 2 + rnd() * 0.5;
        const L = len * (0.85 + rnd() * 0.3);
        const i0 = v.length;
        v.push({ p: [-0.005, 0, 0], n: [Math.sin(ang), 0.4, Math.cos(ang)] });
        v.push({ p: [0.005, 0, 0], n: [Math.sin(ang), 0.4, Math.cos(ang)] });
        v.push({ p: [Math.sin(ang) * spread, L, Math.cos(ang) * spread], n: [Math.sin(ang), 0.8, Math.cos(ang)] });
        t.push([i0, i0 + 1, i0 + 2]);
      }
    }
    b.decor(st, v, t, 1);
  }
  return b.build();
}

/** Crossed quads (alpha cards) in ribbon layout so the same engine bends them */
function cardGeometry(rows = 2, planes = 2) {
  const b = new RibbonBuilder();
  for (let p = 0; p < planes; p++) b.blade({ rows, yaw: (p / planes) * Math.PI, lean: 1, h: 1, w: 1, cls: p });
  return b.build();
}

/* ------------------------------------------------------------------ */
/*  Canvas textures (painted at load, 256px or smaller)                */
/* ------------------------------------------------------------------ */

function canvasTex(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A painted tuft of ~17 curved blades, root-dark to tip-light, alpha cut-out */
function tuftTexture(seed = 5) {
  return canvasTex(128, 128, (g) => {
    const r = mulberry32(seed);
    for (let i = 0; i < 17; i++) {
      const x0 = 64 + (r() - 0.5) * 52;
      const lean = (r() - 0.5) * 60 + (x0 - 64) * 0.7;
      const hgt = 65 + r() * 59;
      const w = 3.5 + r() * 4;
      const tipX = x0 + lean, tipY = 128 - hgt;
      const midX = x0 + lean * 0.25, midY = 128 - hgt * 0.55;
      const grad = g.createLinearGradient(0, 128, 0, tipY);
      grad.addColorStop(0, 'rgb(150,150,150)');
      grad.addColorStop(1, `rgb(${235 + r() * 20},${235 + r() * 20},${235 + r() * 20})`);
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(x0 - w, 129);
      g.quadraticCurveTo(midX - w * 0.55, midY, tipX, tipY);
      g.quadraticCurveTo(midX + w * 0.55, midY, x0 + w, 129);
      g.closePath();
      g.fill();
    }
  });
}

/** 2x2 atlas: daisy, buttercup, nadeshiko pink, kikyo bellflower */
function flowerAtlas() {
  return canvasTex(256, 256, (g) => {
    const petals = (cx, cy, n, len, wid, col, col2, centre, centreR) => {
      for (let i = 0; i < n; i++) {
        g.save();
        g.translate(cx, cy);
        g.rotate((i / n) * Math.PI * 2);
        const gr = g.createLinearGradient(0, 0, 0, -len);
        gr.addColorStop(0, col2); gr.addColorStop(1, col);
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(wid, -len * 0.55, 0, -len);
        g.quadraticCurveTo(-wid, -len * 0.55, 0, 0);
        g.fill();
        g.restore();
      }
      const cg = g.createRadialGradient(cx, cy, 0, cx, cy, centreR);
      cg.addColorStop(0, centre[0]); cg.addColorStop(1, centre[1]);
      g.fillStyle = cg;
      g.beginPath(); g.arc(cx, cy, centreR, 0, Math.PI * 2); g.fill();
    };
    petals(64, 64, 15, 52, 9, '#ffffff', '#f2eddc', ['#ffd24a', '#e8a21c'], 12);
    petals(192, 64, 5, 40, 24, '#ffe14d', '#f2b705', ['#ffe9a0', '#f0b400'], 8);
    petals(64, 192, 8, 50, 21, '#ff8fb8', '#d94f86', ['#ffd54a', '#e0951b'], 9);
    petals(192, 192, 5, 44, 26, '#a98cf2', '#6b4fc8', ['#f3e9ff', '#c9b8ff'], 8);
  });
}

/* ------------------------------------------------------------------ */
/*  Cat-collision physics: scrolling spring field + pressed trail      */
/* ------------------------------------------------------------------ */

const SIM_VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const SPRING_FRAG = /* glsl */`
uniform sampler2D tPrev;
uniform vec2 uTexel;
uniform vec2 uShift;
uniform vec4 uRect;
uniform float uDt, uK, uC, uWave, uMaxD;
uniform vec4 uStamp[${STAMPS}];
varying vec2 vUv;
vec4 prev(vec2 uv) {
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec4(0.0);
  return texture2D(tPrev, uv);
}
void main() {
  vec2 uv = vUv + uShift;
  vec4 s = prev(uv);
  vec2 d = s.xy, v = s.zw;
  vec2 lap = (prev(uv - vec2(uTexel.x, 0.0)).xy + prev(uv + vec2(uTexel.x, 0.0)).xy
            + prev(uv + vec2(0.0, uTexel.y)).xy + prev(uv - vec2(0.0, uTexel.y)).xy) * 0.25 - d;
  vec2 acc = -uK * d - uC * v + uWave * lap;
  v += acc * uDt;
  d += v * uDt;
  vec2 p = uRect.xy + vUv * uRect.zw;
  for (int i = 0; i < ${STAMPS}; i++) {
    vec4 st = uStamp[i];
    if (st.w <= 0.0) continue;
    vec2 a = p - st.xy;
    float l = length(a);
    float f = 1.0 - smoothstep(0.0, st.z, l);
    if (f <= 0.0) continue;
    vec2 target = (a / max(l, 0.001)) * f * st.w * uMaxD;
    if (dot(target, target) > dot(d, d)) { d = mix(d, target, 0.7); v *= 0.6; }
  }
  float m = length(d);
  if (m > uMaxD) d *= uMaxD / m;
  gl_FragColor = vec4(d, v);
}
`;
const TRAIL_FRAG = /* glsl */`
uniform sampler2D tPrev;
uniform vec2 uShift;
uniform vec4 uRect;
uniform float uDt, uDecay;
uniform vec4 uStamp[${STAMPS}];
varying vec2 vUv;
void main() {
  vec2 uv = vUv + uShift;
  vec4 o = (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) ? vec4(0.0) : texture2D(tPrev, uv);
  vec2 dir = o.xy * exp(-uDecay * uDt);
  vec2 p = uRect.xy + vUv * uRect.zw;
  for (int i = 0; i < ${STAMPS}; i++) {
    vec4 st = uStamp[i];
    if (st.w <= 0.0) continue;
    vec2 a = p - st.xy;
    float l = length(a);
    float f = 1.0 - smoothstep(0.0, st.z * 0.9, l);
    if (f <= 0.0) continue;
    vec2 target = (a / max(l, 0.001)) * f * st.w;
    if (dot(target, target) > dot(dir, dir)) dir = target;
  }
  gl_FragColor = vec4(dir, length(dir), 0.0);
}
`;

/**
 * Half-float spring + trail fields in a square window that follows the cat.
 * When the window re-centres (in whole texels) the next pass reads the old
 * state through uShift, so the pressed path stays put in the world.
 */
class PushField {
  constructor(renderer, { size = 22, texelsPerMeter = 9 } = {}) {
    this.renderer = renderer;
    const ext = renderer && renderer.extensions;
    this.ok = !!(ext && renderer.capabilities.isWebGL2 &&
      (ext.get('EXT_color_buffer_float') || ext.get('EXT_color_buffer_half_float')));
    this.size = size;
    this.n = Math.round(size * texelsPerMeter);
    this.texel = size / this.n;
    this.x0 = -size / 2; this.z0 = -size / 2;
    this.idleFor = 99;
    this.trailIdleFor = 99;
    this._shift = new THREE.Vector2();
    this._fresh = true;
    if (!this.ok) return;
    const make = () => new THREE.WebGLRenderTarget(this.n, this.n, {
      type: THREE.HalfFloatType, format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      depthBuffer: false, stencilBuffer: false, generateMipmaps: false
    });
    this.a = make(); this.b = make(); this.ta = make(); this.tb = make();
    const stamps = () => {
      const v = [];
      for (let i = 0; i < STAMPS; i++) v.push(new THREE.Vector4());
      return { value: v };
    };
    this.spring = new THREE.ShaderMaterial({
      vertexShader: SIM_VERT, fragmentShader: SPRING_FRAG, depthTest: false, depthWrite: false,
      uniforms: {
        tPrev: { value: null }, uTexel: { value: new THREE.Vector2(1 / this.n, 1 / this.n) },
        uShift: { value: new THREE.Vector2() }, uRect: { value: new THREE.Vector4() },
        uDt: { value: 1 / 60 }, uK: { value: 58 }, uC: { value: 4.6 }, uWave: { value: 30 }, uMaxD: { value: 0.5 },
        uStamp: stamps()
      }
    });
    this.trail = new THREE.ShaderMaterial({
      vertexShader: SIM_VERT, fragmentShader: TRAIL_FRAG, depthTest: false, depthWrite: false,
      uniforms: {
        tPrev: { value: null }, uShift: { value: new THREE.Vector2() }, uRect: { value: new THREE.Vector4() },
        uDt: { value: 1 / 60 }, uDecay: { value: 0.14 }, uStamp: stamps()
      }
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.spring);
    this.quad.frustumCulled = false;
    this.simScene = new THREE.Scene();
    this.simScene.add(this.quad);
    this.simCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  get texture() { return this.ok ? this.a.texture : null; }
  get trailTexture() { return this.ok ? this.ta.texture : null; }

  /** Re-centre on (x, z) in whole texels; returns the uv shift for the next pass. */
  _follow(x, z) {
    const half = this.size / 2;
    const nx = Math.round((x - half) / this.texel) * this.texel;
    const nz = Math.round((z - half) / this.texel) * this.texel;
    if (this._fresh) { this.x0 = nx; this.z0 = nz; this._fresh = false; this._shift.set(0, 0); return; }
    // Only move once the cat has drifted a quarter of the window
    if (Math.abs(x - (this.x0 + half)) < this.size * 0.25 && Math.abs(z - (this.z0 + half)) < this.size * 0.25) {
      this._shift.set(0, 0);
      return;
    }
    this._shift.set((nx - this.x0) / this.size, (nz - this.z0) / this.size);
    this.x0 = nx; this.z0 = nz;
  }

  step(dt, stamps, active, focusX, focusZ) {
    if (!this.ok) return;
    this._follow(focusX, focusZ);
    const moved = this._shift.x !== 0 || this._shift.y !== 0;
    if (active) { this.idleFor = 0; this.trailIdleFor = 0; } else { this.idleFor += dt; this.trailIdleFor += dt; }
    const doSpring = this.idleFor < 3.2 || moved;
    const doTrail = this.trailIdleFor < 14 || moved;
    if (!doSpring && !doTrail) return;
    const r = this.renderer;
    const prevTarget = r.getRenderTarget();
    const prevAuto = r.autoClear;
    r.autoClear = true;
    const rect = [this.x0, this.z0, this.size, this.size];
    if (doSpring) {
      const m = this.spring;
      this.quad.material = m;
      m.uniforms.tPrev.value = this.a.texture;
      m.uniforms.uShift.value.copy(this._shift);
      m.uniforms.uRect.value.set(...rect);
      m.uniforms.uDt.value = Math.min(dt, 1 / 30);
      for (let i = 0; i < STAMPS; i++) m.uniforms.uStamp.value[i].copy(stamps[i]);
      r.setRenderTarget(this.b);
      r.render(this.simScene, this.simCam);
      const t = this.a; this.a = this.b; this.b = t;
    }
    if (doTrail) {
      const m = this.trail;
      this.quad.material = m;
      m.uniforms.tPrev.value = this.ta.texture;
      m.uniforms.uShift.value.copy(this._shift);
      m.uniforms.uRect.value.set(...rect);
      m.uniforms.uDt.value = Math.min(dt, 1 / 20);
      for (let i = 0; i < STAMPS; i++) m.uniforms.uStamp.value[i].copy(stamps[i]);
      r.setRenderTarget(this.tb);
      r.render(this.simScene, this.simCam);
      const t = this.ta; this.ta = this.tb; this.tb = t;
    }
    r.setRenderTarget(prevTarget);
    r.autoClear = prevAuto;
  }
}

/* ------------------------------------------------------------------ */
/*  Ribbon engine on MeshLambertMaterial                               */
/* ------------------------------------------------------------------ */

const RIBBON_VERT_DECL = (o) => /* glsl */`
${GLSL_LIB}
attribute vec4 aBlade;
attribute vec4 aShape;
attribute vec3 aLocal;
struct Blade {
  vec2 root; float h; float w; float yaw; float lean; float phase; float rnd;
  vec3 tint; float alive; vec4 extra; float windMul;
};
varying float gvT;
varying float gvSide;
varying vec3 gvW;
varying vec3 gvTint;
varying vec4 gvX;      // rnd, flat, pressed, cls
varying vec4 gvY;      // windAmp, rootX, rootZ, kind
varying vec2 gvUv;
${o.vertDecl || ''}
#ifndef WIND_GAIN
#define WIND_GAIN 1.0
#endif
#ifndef TAPER
#define TAPER 1.0
#endif
#ifndef NORMAL_UP
#define NORMAL_UP 0.7
#endif
#ifndef ROUND
#define ROUND 0.35
#endif
#ifndef WIDEN
#define WIDEN 0.6
#endif
#ifndef HEAD_SCALE
#define HEAD_SCALE 1.0
#endif
#ifndef TRAIL_LEAN
#define TRAIL_LEAN 0.75
#endif
#ifndef HEIGHT_MUL
#define HEIGHT_MUL 1.0
#endif
#ifndef SUSUKI_SCALE
#define SUSUKI_SCALE 1.0
#endif
void place(inout Blade B, inout uint s, int id) {
  float keep = 1.0;
  B.root = snapRoot(s, id, uRingA.xy);
  keep = ringKeep(B.root);
  if (keep <= 0.0 || rnd(s) > keep) { B.alive = 0.0; return; }
  vec4 M = maskAt(B.root);
${o.place}
  B.h *= mix(0.55, 1.0, keep);
}
void grassEval(out vec3 gPos, out vec3 gNrm) {
  uint s = 12345u;
  Blade B;
  B.root = vec2(0.0);
  B.h = 0.4; B.w = 0.018; B.yaw = 0.0; B.lean = 0.25; B.phase = 0.0; B.rnd = 0.0;
  B.tint = vec3(1.0); B.alive = 1.0; B.extra = vec4(0.0); B.windMul = 1.0;
  place(B, s, gl_InstanceID);
  if (B.alive < 0.5 || B.h < 0.01) {
    gPos = vec3(0.0, -50.0, 0.0); gNrm = vec3(0.0, 1.0, 0.0);
    gvT = 0.0; gvSide = 0.0; gvW = gPos; gvTint = vec3(0.0); gvX = vec4(0.0); gvY = vec4(0.0); gvUv = vec2(0.0);
    return;
  }

  float cy = cos(B.yaw), sy = sin(B.yaw);
  vec2 off = vec2(aBlade.x * cy + aBlade.y * sy, -aBlade.x * sy + aBlade.y * cy);
  vec2 root = B.root + off;
  float yaw = B.yaw + aBlade.z;
  float lean = B.lean * aBlade.w;
  float h = B.h * aShape.x;
  float w = B.w * aShape.y;
  vec2 F = vec2(sin(yaw), cos(yaw));
  vec2 S = vec2(cos(yaw), -sin(yaw));

  vec2 wv = windVec(root) * B.windMul * WIND_GAIN;
  vec4 fd = fieldAt(root);
  vec2 pd = fd.xy;
  float flatK = clamp(length(fd.xy) * 2.2, 0.0, 1.0);
  vec3 tr = trailAt(root);
  float pressed = clamp(tr.z, 0.0, 1.0);
#ifdef TRAIL
  pd += tr.xy * TRAIL_LEAN;
#endif
  float speedBlend = clamp(length(fd.zw) * 0.8, 0.0, 1.0);
  ${o.pre || ''}

  vec2 K = F * lean * h + wv * h * 0.9 + pd;
  float kl = length(K);
  float maxK = h * 1.04;
  if (kl > maxK) { K *= maxK / kl; kl = maxK; }
  float ty = sqrt(max(h * h - kl * kl * 0.85, 0.02 * h * h));

  float t = position.y;
  float side = position.x;
  vec3 P; vec3 T;
#ifdef BEZIER
  float it = 1.0 - t;
  vec2 k1 = K * 0.08, k2 = K * 0.44;
  float y1 = h * 0.38, y2 = 0.5 * ty + 0.35 * h, y3 = ty;
  vec3 p1 = vec3(k1.x, y1, k1.y), p2 = vec3(k2.x, y2, k2.y), p3 = vec3(K.x, y3, K.y);
  P = 3.0 * it * it * t * p1 + 3.0 * it * t * t * p2 + t * t * t * p3;
  T = 3.0 * it * it * p1 + 6.0 * it * t * (p2 - p1) + 3.0 * t * t * (p3 - p2);
#else
  vec2 hd = K * t * t;
  float yy = h * t - (h - ty) * t * t;
  P = vec3(hd.x, yy, hd.y);
  T = vec3(2.0 * t * K.x, h - 2.0 * (h - ty) * t, 2.0 * t * K.y);
#endif
  ${o.curlCode || ''}
  T = normalize(T + vec3(0.0, 1e-5, 0.0));
  vec3 Sw = vec3(S.x, 0.0, S.y);
  vec3 Sp = Sw - T * dot(Sw, T);
  float spl = length(Sp);
  if (spl > 1e-3) Sw = Sp / spl;
  else Sw = normalize(cross(abs(T.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0), T));
  vec3 N = normalize(cross(Sw, T));
  vec3 offW = modelMatrix[3].xyz;

  vec3 pos;
  vec3 nrm;
  float kind = aShape.z;
  if (kind < 0.5) {
    float ww = w * pow(max(1.0 - t, 0.0), TAPER);
    pos = P + Sw * side * ww;
#ifdef USE_WIDEN
    vec3 V0 = normalize(cameraPosition - (P + vec3(root.x, 0.0, root.y) + offW));
    float facing = abs(dot(N, V0));
    vec3 Rv = cross(T, V0);
    float rvl = length(Rv);
    Rv = rvl > 1e-4 ? Rv / rvl : Sw;
    pos += Rv * side * ww * WIDEN * (1.0 - facing);
#endif
    nrm = normalize(mix(N, vec3(0.0, 1.0, 0.0), NORMAL_UP) + Sw * side * ROUND);
  } else {
    ${o.tipCode || ''}
    if (kind < 1.5) {
      pos = P + (Sw * aLocal.x + T * aLocal.y + N * aLocal.z) * HEAD_SCALE;
      nrm = normalize(Sw * normal.x + T * normal.y + N * normal.z);
    } else {
      vec3 camR = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
      vec3 camU = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
      pos = P + (camR * aLocal.x + camU * aLocal.y) * HEAD_SCALE;
      nrm = normalize(mix(vec3(0.0, 1.0, 0.0), cross(camR, camU), 0.5));
    }
  }
  pos += vec3(root.x, 0.0, root.y);

  gvT = t;
  gvSide = side;
  gvTint = B.tint;
  gvX = vec4(B.rnd, flatK, pressed, aShape.w);
  gvY = vec4(length(wv), root.x, root.y, kind);
  gvUv = uv;
  gvW = pos + offW;
  ${o.post || ''}
  gPos = pos;
  gNrm = nrm;
}
`;

const RIBBON_FRAG_DECL = (o) => /* glsl */`
${GLSL_LIB}
uniform vec3 uRoot;
uniform vec3 uMid;
uniform vec3 uTip;
uniform float uAO;
uniform float uTrans;
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform float uGustLit;
${o.fragUniforms || ''}
varying float gvT;
varying float gvSide;
varying vec3 gvW;
varying vec3 gvTint;
varying vec4 gvX;
varying vec4 gvY;
varying vec2 gvUv;
vec3 ramp(float t) {
  return t < 0.5 ? mix(uRoot, uMid, t * 2.0) : mix(uMid, uTip, (t - 0.5) * 2.0);
}
`;

const RIBBON_FRAG_COLOR = (o) => /* glsl */`
  float t = gvT;
  vec3 albedo = ramp(t) * gvTint;
  float alpha = 1.0;
  vec3 emit = vec3(0.0);
  ${o.fragColor || ''}
  if (alpha < 0.5) discard;
  float gAO = mix(uAO, 1.0, smoothstep(0.0, 0.6, t)) * (1.0 - 0.3 * gvX.y);
  // Painted-meadow wind: soft lighter / darker streaks roll with the gusts
  float gStream = vnoise(gvW.xz * 0.42 - normalize(uWindDir) * uTime * 0.85);
  albedo *= mix(1.0 - 0.16 * uGustLit, 1.0 + 0.2 * uGustLit, smoothstep(0.38, 0.8, gStream)) ;
  diffuseColor.rgb *= albedo * gAO;
`;

const RIBBON_FRAG_EMIT = /* glsl */`
  {
    vec3 gV = normalize(cameraPosition - gvW);
    vec3 gL = normalize(uSunDir);
    float gThru = pow(clamp(dot(-gV, gL), 0.0, 1.0), 4.0) * (0.25 + 0.75 * gvT);
    totalEmissiveRadiance += albedo * uSunCol * (gThru * uTrans + 0.05 * gvT * gvT) * gAO + emit;
  }
`;

/** A ribbon-blade grass material: Lambert with the blade built in the vertex stage. */
function ribbonMaterial(recipe, shared, palette) {
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const own = {
    uRingA: { value: new THREE.Vector4(0, 0, 0, 1) },
    uRingB: { value: new THREE.Vector4(0, 0, 0, 0) },
    uZone: { value: new THREE.Vector4(0, 0, 0, 0) },
    uSpacing: { value: 0.1 },
    uGrid: { value: 2 },
    uGridZ: { value: 2 },
    uSeed: { value: recipe.seed || 1 },
    uRoot: { value: new THREE.Color(palette.root) },
    uMid: { value: new THREE.Color(palette.mid) },
    uTip: { value: new THREE.Color(palette.tip) },
    uAO: { value: recipe.ao ?? 0.4 },
    uTrans: { value: recipe.trans ?? 0.6 },
    uGustLit: { value: recipe.gustLit ?? 0.5 }
  };
  if (recipe.uniforms) Object.assign(own, recipe.uniforms());
  mat.uniforms = Object.assign({}, shared, own);
  const defines = recipe.defines || {};
  const defineStr = Object.entries(defines).map(([k, v]) => `#define ${k} ${v}`).join('\n');
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, mat.uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${defineStr}\n${RIBBON_VERT_DECL(recipe)}`)
      .replace('#include <beginnormal_vertex>', 'vec3 gPos; vec3 gNrm; grassEval(gPos, gNrm); vec3 objectNormal = gNrm;')
      .replace('#include <begin_vertex>', 'vec3 transformed = gPos;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${defineStr}\n${RIBBON_FRAG_DECL(recipe)}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${RIBBON_FRAG_COLOR(recipe)}`)
      .replace('#include <normal_fragment_begin>', /* glsl */`
        #include <normal_fragment_begin>
        // Both faces of a blade shade like the sky-facing side
        normal = normalize(mix(normal * faceDirection, normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz), 0.25));
      `)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${RIBBON_FRAG_EMIT}`);
  };
  const key = 'grass-' + recipe.id + JSON.stringify(defines);
  mat.customProgramCacheKey = () => key;
  return mat;
}

/* ------------------------------------------------------------------ */
/*  Recipes (see grass/js/types_*.js for the lab versions)             */
/* ------------------------------------------------------------------ */

// Meadow body shared by the ring layers: fbm patchiness (clearings thin
// out, thick clumps grow tall) + the game's four colour flavours, scaled by
// the biome mask (short near paths, tall and wild near edges and banks).
const MEADOW_BODY = /* glsl */`
  float n = fbm(B.root * 0.55 + uSeed * 3.1);
  float thick = smoothstep(0.50, 0.70, n);
  float clear = 1.0 - smoothstep(0.24, 0.40, n);
  float r1 = rnd(s), r2 = rnd(s), r3 = rnd(s), r4 = rnd(s);
  if (rnd(s) > M.r || rnd(s) < clear * 0.45) { B.alive = 0.0; return; }
  float wild = max(M.g, M.a);
  B.h = (0.22 + r1 * 0.22) * (1.0 + thick * (0.45 + r2 * 0.55)) * (1.0 - clear * 0.25);
  B.h *= (0.5 + 0.5 * smoothstep(0.0, 0.7, M.r)) * (1.0 + wild * 0.55) * HEIGHT_MUL;
  B.w = 0.012 + r2 * 0.009;
  B.yaw = r3 * 6.2832;
  B.lean = 0.12 + r4 * 0.30;
  B.rnd = r4;
  float fl = rnd(s);
  vec3 tint;
  if (fl < 0.30) tint = vec3(0.67, 0.87, 0.77);
  else if (fl < 0.60) tint = vec3(0.87, 1.02, 0.83);
  else if (fl < 0.82) tint = vec3(0.94, 0.99, 0.85);
  else tint = vec3(1.06, 1.0, 0.66);
  float br = 0.74 + rnd(s) * 0.26;
  if (thick > 0.5) br *= 0.84;
  B.tint = tint * br * mix(vec3(1.0), vec3(1.06, 1.0, 0.8), M.a * 0.6);
`;

const RECIPES = {
  // Near ring: Ghost-of-Tsushima Bezier blades in 3-blade tufts, Worley
  // clumps splaying outward, widened when edge-on, pressed by the trail.
  near: {
    id: 'near', ao: 0.42, trans: 0.7,
    geo: () => tuftGeometry({ count: 3, rows: 5, spread: 0.03, hMin: 0.72, hMax: 1.0, lean: 1.1, seed: 4 }),
    defines: { BEZIER: '', USE_WIDEN: '', WIDEN: '0.7', TAPER: '0.85', NORMAL_UP: '0.55', TRAIL: '', HEIGHT_MUL: '1.0' },
    pre: 'h *= 1.0 - pressed * 0.5;',
    place: MEADOW_BODY + /* glsl */`
  vec3 cl = cellular(B.root * 2.4 + vec2(uSeed * 1.7));
  vec2 centre = (cl.yz - vec2(uSeed * 1.7)) / 2.4;
  vec2 outv = B.root - centre;
  B.yaw = (r3 < 0.7) ? atan(outv.x, outv.y + 1e-5) + (r4 - 0.5) * 1.6 : r3 * 6.2832;
  B.lean += 0.25 * smoothstep(0.0, 0.6, cl.x);
  B.w *= 1.05;`,
    fragColor: `
    float pr = gvX.z;
    albedo = mix(albedo, albedo * vec3(1.32, 1.26, 0.78) + vec3(0.03, 0.03, 0.0), pr * 0.8);`
  },
  // Mid ring: False-Earth tri-quad clumps, each quad alpha-cut into three blades
  mid: {
    id: 'mid', ao: 0.42, trans: 0.6,
    geo: () => triQuadGeometry(3),
    defines: { TAPER: '0.12', NORMAL_UP: '0.75', ROUND: '0.1', TRAIL: '', HEIGHT_MUL: '1.05' },
    pre: 'h *= 1.0 - pressed * 0.4;',
    place: MEADOW_BODY + `
  B.w = 0.05 + r2 * 0.02;
  B.lean = 0.08 + r4 * 0.2;`,
    fragColor: `
    float kk = (gvSide * 0.5 + 0.5) * 3.0;
    float lc = abs(fract(kk) - 0.5) * 2.0;
    float hv = 0.70 + 0.30 * hash12(vec2(floor(kk), gvX.w + gvX.x * 7.0));
    if (t > hv || lc > pow(max(1.0 - t / hv, 0.0), 0.72)) alpha = 0.0;
    albedo *= 0.86 + 0.14 * sin(gvSide * 7.0 + gvX.x * 30.0);`
  },
  // Far ring: Codrops-style painted tuft cards on crossed quads
  far: {
    id: 'far', ao: 0.5, trans: 0.4,
    geo: () => cardGeometry(2, 2),
    defines: { TAPER: '0.0', NORMAL_UP: '0.9', ROUND: '0.0', HEIGHT_MUL: '1.2' },
    uniforms: () => ({ uCard: { value: tuftTexture(5) } }),
    fragUniforms: 'uniform sampler2D uCard;',
    place: MEADOW_BODY + `
  B.w = B.h * (0.5 + 0.2 * r2);
  B.lean = 0.05;`,
    fragColor: `
    vec4 tx = texture2D(uCard, gvUv);
    if (tx.a < 0.42) alpha = 0.0;
    albedo *= tx.r * 1.15;`
  },
  // Shell-free undergrowth cousin: the Cat-Eye Thicket — dark undergrowth,
  // mid blades and straw seed-head stalks along paths, walls and banks.
  thicket: {
    id: 'thicket', ao: 0.14, trans: 1.0,
    geo: thicketGeometry,
    defines: { WIND_GAIN: '1.0', TRAIL: '' },
    pre: 'wv *= 0.7 + aShape.w * 0.55; h *= 1.0 - pressed * 0.35;',
    place: /* glsl */`
  float r1 = rnd(s), r2 = rnd(s), r3 = rnd(s), r4 = rnd(s);
  float edge = max(M.g, M.a * 0.7) * smoothstep(0.05, 0.4, M.r);
  edge *= smoothstep(0.28, 0.55, fbm(B.root * 0.45 + uSeed * 5.3));
  if (rnd(s) > smoothstep(0.18, 0.7, edge)) { B.alive = 0.0; return; }
  B.h = (0.28 + r1 * 0.16) * (0.8 + 0.5 * edge);
  B.w = 0.012 + r2 * 0.006;
  B.yaw = r3 * 6.2832;
  B.lean = 0.12 + r4 * 0.3;
  B.rnd = r4;
  B.tint = vec3(0.86 + 0.24 * rnd(s));`,
    fragColor: `
    if (gvY.w > 0.5) {
      albedo = mix(vec3(0.30, 0.20, 0.07), vec3(0.62, 0.44, 0.16), gvX.x);
    } else if (gvX.w < 0.5) {
      albedo *= vec3(0.6, 0.72, 0.62);
    } else if (gvX.w > 1.5) {
      albedo = mix(albedo, vec3(0.78, 0.68, 0.34) * gvTint, smoothstep(0.5, 1.0, t));
    }`
  },
  // Wildflower cards: billboard blooms (daisy, buttercup, nadeshiko, kikyo)
  // on thin stems that nod above the blades, gathered into drifts.
  flowers: {
    id: 'flowers', ao: 0.45, trans: 0.4, gustLit: 0.2,
    geo: flowerGeometry,
    defines: { TAPER: '0.1', HEAD_SCALE: '0.1', NORMAL_UP: '0.9', TRAIL: '' },
    uniforms: () => ({ uAtlas: { value: flowerAtlas() } }),
    fragUniforms: 'uniform sampler2D uAtlas;',
    pre: 'h *= 1.0 - pressed * 0.4;',
    place: /* glsl */`
  float n = fbm(B.root * 0.35 + uSeed * 2.0);
  float r1 = rnd(s), r2 = rnd(s), r3 = rnd(s), r4 = rnd(s), r5 = rnd(s);
  float drift = M.b * smoothstep(0.1, 0.5, M.r);
  if (r5 > drift || n < 0.28) { B.alive = 0.0; return; }
  B.h = 0.26 + r1 * 0.26;
  B.w = 0.018;
  B.yaw = r3 * 6.2832;
  B.lean = 0.08 + r4 * 0.3;
  B.windMul = 1.35;
  B.rnd = r4;
  // drifts lean to one bloom: hue comes from the patch, not each stem
  float pick = fract(hash12(floor(B.root * 0.32 + uSeed)) * 3.7 + (rnd(s) < 0.25 ? rnd(s) : 0.0));
  float kq = floor(pick * 4.0);
  B.extra = vec4(mod(kq, 2.0), floor(kq / 2.0), 0.0, 0.0);
  B.tint = vec3(0.9 + 0.2 * rnd(s));`,
    post: 'if (aShape.z > 1.5) gvUv = (uv + B.extra.xy) * 0.5;',
    fragColor: `
    if (gvY.w > 1.5) {
      vec4 tx = texture2D(uAtlas, gvUv);
      if (tx.a < 0.45) alpha = 0.0;
      albedo = tx.rgb * (0.92 + 0.16 * gvX.x);
      t = 1.0;
    }`
  },
  // Susuki plumes: silver pampas with feathered seed plumes on river banks,
  // paddy bunds and the wild rim of the valley.
  susuki: {
    id: 'susuki', ao: 0.25, trans: 1.5, gustLit: 0.3,
    geo: susukiGeometry,
    defines: { TAPER: '0.8', NORMAL_UP: '0.5', TRAIL: '', TRAIL_LEAN: '0.5' },
    pre: 'wv *= 1.0 + aShape.w * 0.45;',
    place: /* glsl */`
  float n = fbm(B.root * 0.4 + uSeed * 1.7);
  float r1 = rnd(s), r2 = rnd(s), r3 = rnd(s), r4 = rnd(s);
  float wild = M.a * smoothstep(0.05, 0.35, M.r);
  if (rnd(s) > smoothstep(0.25, 0.85, wild) * smoothstep(0.3, 0.55, n)) { B.alive = 0.0; return; }
  B.h = (0.75 + r1 * 0.35) * (0.85 + 0.4 * n) * SUSUKI_SCALE;
  B.w = 0.017;
  B.yaw = r3 * 6.2832;
  B.lean = 0.3 + r4 * 0.4;
  B.windMul = 1.25;
  B.rnd = r4;
  B.tint = vec3(0.85 + 0.3 * rnd(s));`,
    fragColor: `
    if (gvY.w > 0.5) {
      albedo = vec3(0.88, 0.85, 0.77) * (0.8 + 0.4 * gvX.x);
    } else if (gvX.w < 0.5) {
      albedo = mix(albedo * 0.95, vec3(0.80, 0.77, 0.50), smoothstep(0.5, 1.0, t) * 0.6);
      albedo *= 1.0 + 0.3 * (1.0 - smoothstep(0.0, 0.14, abs(gvSide)));
    } else {
      albedo = mix(vec3(0.42, 0.48, 0.26), vec3(0.80, 0.74, 0.50), t) * gvTint;
    }`
  },
  // Mown stripes: a short lawn whose blades lie left/right by stripe, so the
  // sun reads alternating bands; paws press lighter lines into it.
  mown: {
    id: 'mown', ao: 0.5, trans: 0.45,
    geo: () => singleBlade(3),
    defines: { BEZIER: '', TAPER: '0.9', NORMAL_UP: '0.5', TRAIL: '', ROUND: '0.2' },
    pre: 'h *= 1.0 - pressed * 0.3;',
    place: /* glsl */`
  float r1 = rnd(s), r2 = rnd(s), r3 = rnd(s);
  if (rnd(s) > M.g * (1.0 - M.r)) { B.alive = 0.0; return; }
  float st = floor((B.root.x * 0.966 + B.root.y * 0.259) / 0.55);
  float sg = mod(st, 2.0) * 2.0 - 1.0;
  B.h = 0.10 + r1 * 0.04;
  B.w = 0.009 + r2 * 0.004;
  B.yaw = (sg > 0.0 ? 1.5708 : -1.5708) + (r3 - 0.5) * 0.5;
  B.lean = 0.55 + r2 * 0.2;
  B.windMul = 0.4;
  B.rnd = r3;
  B.tint = vec3(0.92 + 0.1 * r1) * (1.0 + sg * 0.1);`,
    fragColor: 'albedo = mix(albedo, albedo * vec3(1.25, 1.2, 0.85), gvX.z * 0.7);'
  },
  // Lantern fibers: hair-thin blades whose tips glow cyan / violet / pink at
  // night, a light wave rolling on the wind, flaring where the cat pushes.
  lantern: {
    id: 'lantern', ao: 0.3, trans: 0.3, gustLit: 0.2,
    geo: () => singleBlade(4),
    defines: { TAPER: '0.9', TRAIL: '' },
    place: /* glsl */`
  float n = fbm(B.root * 1.1 + uSeed * 2.0);
  float r1 = rnd(s), r2 = rnd(s), r3 = rnd(s), r4 = rnd(s);
  float dz = length((B.root - uZone.xy) / uZone.zw);
  if (dz > 1.0 || rnd(s) > smoothstep(0.3, 0.5, dz) * smoothstep(1.0, 0.86, dz)) { B.alive = 0.0; return; }
  if (n < 0.30 && rnd(s) < 0.5) { B.alive = 0.0; return; }
  B.h = (0.26 + r1 * 0.3) * (0.8 + 0.5 * n);
  B.w = 0.008 + r2 * 0.004;
  B.yaw = r3 * 6.2832;
  B.lean = 0.12 + r4 * 0.3;
  B.rnd = r4;`,
    fragColor: `
    vec3 gA = vec3(0.10, 0.95, 0.80), gB = vec3(0.62, 0.38, 1.0), gC = vec3(1.0, 0.52, 0.72);
    vec3 gc = mix(gA, gB, smoothstep(0.0, 0.85, gvX.x));
    if (gvX.x > 0.9) gc = gC;
    float pulse = 0.5 + 0.5 * sin(uTime * 1.6 + gvX.x * 40.0 + gvY.y * 3.0);
    float wave = smoothstep(0.78, 1.0, sin(dot(gvY.yz, normalize(uWindDir)) * 3.4 - uTime * 1.1));
    float inten = pow(t, 3.0) * (0.22 + 0.28 * pulse + 0.7 * wave + 2.0 * gvX.y + 1.2 * gvX.z);
    albedo = mix(albedo, albedo * vec3(0.55, 0.8, 0.95), uNight);
    emit = gc * inten * 0.75 * uNight;`
  },
  // Sumi-e brush grass: calligraphic dry-brush strokes in ink green washing
  // to celadon, the odd cinnabar accent — for the summit's ensō stone.
  sumi: {
    id: 'sumi', ao: 0.9, trans: 0.15, gustLit: 0.0,
    geo: () => singleBlade(6),
    defines: { TAPER: '0.55', NORMAL_UP: '0.9', ROUND: '0.0' },
    place: /* glsl */`
  float r1 = rnd(s), r2 = rnd(s), r3 = rnd(s), r4 = rnd(s);
  float dz = length((B.root - uZone.xy) / uZone.zw);
  if (dz < 0.42 || rnd(s) > smoothstep(1.0, 0.7, dz) * M.r) { B.alive = 0.0; return; }
  B.h = 0.32 + r1 * 0.42;
  B.w = 0.02 + r2 * 0.014;
  B.yaw = r3 * 6.2832;
  B.lean = 0.35 + r4 * 0.5;
  B.rnd = r4;`,
    fragColor: `
    float bristle = vnoise(vec2(gvSide * 13.0 + gvX.x * 60.0, t * 2.8 + gvX.x * 31.0));
    float dry = smoothstep(0.35, 1.0, t) * 0.55 + abs(gvSide) * 0.24 - 0.16;
    if (bristle < dry) alpha = 0.0;
    if (gvX.x < 0.06) albedo = mix(vec3(0.62, 0.10, 0.07), vec3(0.92, 0.40, 0.22), t);`
  },
  // Yarn curls: pastel helix strands that loosen with the spring field's
  // velocity and boing back — around the cat's own nest.
  yarn: {
    id: 'yarn', ao: 0.5, trans: 0.3, gustLit: 0.0,
    geo: () => singleBlade(12),
    defines: { TAPER: '0.5', NORMAL_UP: '0.4', ROUND: '0.5' },
    vertDecl: /* glsl */`
  vec3 hsv(float h, float s, float v) {
    vec3 k = vec3(1.0, 2.0 / 3.0, 1.0 / 3.0);
    vec3 p = abs(fract(vec3(h) + k) * 6.0 - 3.0);
    return v * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), s);
  }`,
    place: /* glsl */`
  float r1 = rnd(s), r2 = rnd(s), r3 = rnd(s), r4 = rnd(s);
  float dz = length((B.root - uZone.xy) / uZone.zw);
  if (rnd(s) > smoothstep(1.0, 0.55, dz)) { B.alive = 0.0; return; }
  float n = fbm(B.root * 1.4 + uSeed * 3.3);
  B.h = (0.18 + r1 * 0.16) * smoothstep(1.05, 0.5, dz);
  B.w = 0.013 + r2 * 0.005;
  B.yaw = r3 * 6.2832;
  B.lean = 0.1 + r4 * 0.2;
  B.rnd = r4;
  B.phase = r3 * 6.2832;
  B.extra = vec4(r2, r3, 0.0, 0.0);
  B.tint = hsv(fract(r4 * 2.5 + n * 1.4), 0.62, 1.0);`,
    curlCode: `
    float turns = 2.2 + B.extra.x * 1.6;
    float ang = t * turns * 6.2832 + B.phase;
    float crad = (0.035 + 0.025 * B.extra.y) * (1.0 + speedBlend * 0.9);
    float rr = crad * t;
    P.x += cos(ang) * rr;
    P.z += sin(ang) * rr;
    T.x += -sin(ang) * rr * turns * 6.2832 + cos(ang) * crad;
    T.z += cos(ang) * rr * turns * 6.2832 + sin(ang) * crad;`,
    fragColor: 'albedo = gvTint * (0.62 + 0.5 * t);'
  }
};

/* ------------------------------------------------------------------ */
/*  Shell carpet + moss pillows (plane engines, custom light)          */
/* ------------------------------------------------------------------ */

const PLANE_LIGHT_DECL = /* glsl */`
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform vec3 uSkyCol;
uniform vec3 uGndCol;
uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;
`;

const SHELL_VERT = /* glsl */`
${GLSL_LIB}
uniform float uLayers;
uniform float uShellH;
uniform float uShellR;
varying float vL;
varying vec3 vW;
varying vec2 vStrand;
varying float vFlat;
varying float vEdge;
varying float vM;
void main() {
  float layer = (float(gl_InstanceID) + 1.0) / uLayers;
  vL = layer;
  vec2 xz = floor(uRingA.xy / 0.5) * 0.5 + position.xz * uShellR * 2.0;
  vEdge = 1.0 - smoothstep(uShellR * 0.6, uShellR, distance(xz, uRingA.xy));
  vec4 M = maskAt(xz);
  vM = M.r * vEdge;
  vec4 fd = fieldAt(xz);
  vec3 tr = trailAt(xz);
  float hn = layer * layer;
  vec2 d = (windVec(xz) * 0.9 + fd.xy * 0.9 + tr.xy * 0.25) * hn * uShellH * 2.2;
  float press = clamp(length(fd.xy) * 1.6 + tr.z * 0.6, 0.0, 1.0);
  float h = layer * uShellH * (1.0 - press * 0.5 * layer) * (0.4 + 0.6 * vM);
  vFlat = press;
  vec3 pos = vec3(xz.x + d.x, h + 0.004, xz.y + d.y);
  vStrand = xz;
  vW = pos + modelMatrix[3].xyz;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}
`;
const SHELL_FRAG = /* glsl */`
${GLSL_LIB}
${PLANE_LIGHT_DECL}
uniform vec3 uRoot;
uniform vec3 uMid;
uniform vec3 uTip;
uniform float uDensity;
varying float vL;
varying vec3 vW;
varying vec2 vStrand;
varying float vFlat;
varying float vEdge;
varying float vM;
void main() {
  vec2 g = vStrand * uDensity;
  vec2 cellId = floor(g);
  float hv = hash12(cellId);
  float len = (0.35 + 0.65 * hv) * vM;
  vec2 jit = vec2(hash12(cellId + 7.3), hash12(cellId + 19.1)) * 0.5 + 0.25;
  float d = length(fract(g) - jit);
  float rad = 0.46 * (1.0 - vL / max(len, 0.001));
  if (vL > len || d > rad) discard;
  float t = vL;
  vec3 albedo = t < 0.5 ? mix(uRoot, uMid, t * 2.0) : mix(uMid, uTip, (t - 0.5) * 2.0);
  albedo *= 0.8 + 0.4 * hash12(cellId + 3.7);
  vec3 N = normalize(vec3(0.0, 1.0, 0.0) + vec3(fract(g) - jit, 0.0).xzy * 0.6);
  vec3 L = normalize(uSunDir);
  float wrap = clamp((dot(N, L) + 0.5) / 1.5, 0.0, 1.0);
  vec3 col = albedo * (mix(uGndCol, uSkyCol, 0.8) + uSunCol * wrap) * mix(0.35, 1.0, t);
  col *= 1.0 - 0.25 * vFlat;
  float fd = distance(cameraPosition, vW);
  col = mix(col, fogColor, smoothstep(fogNear, fogFar, fd));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const MOSS_VERT = /* glsl */`
${GLSL_LIB}
attribute vec4 aPatch;   // centre x, z, radius, seed
varying vec3 vN;
varying vec3 vW;
varying vec2 vP;
varying float vH;
varying float vFlat;
varying float vFade;
float pillow(vec2 p, float seed) {
  vec3 c = cellular(p * 4.2 + vec2(seed * 2.3));
  float dome = sqrt(max(1.0 - smoothstep(0.0, 0.62, c.x), 0.0));
  float hv = 0.65 + 0.35 * hash12(c.yz);
  return dome * hv * 0.1 + vnoise(p * 38.0) * 0.01;
}
void main() {
  vec2 p = position.xz;
  float r = distance(p, aPatch.xy) / aPatch.z;
  float ragged = vnoise(p * 1.7 + aPatch.w) * 0.35;
  vFade = 1.0 - smoothstep(0.55 - ragged * 0.5, 1.0 - ragged * 0.3, r);
  vec4 fd = fieldAt(p);
  vec3 tr = trailAt(p);
  float flatK = clamp(length(fd.xy) * 2.0 + tr.z * 0.8, 0.0, 1.0);
  float h0 = pillow(p, aPatch.w) * vFade;
  float e = 0.02;
  float hx = pillow(p + vec2(e, 0.0), aPatch.w) * vFade;
  float hz = pillow(p + vec2(0.0, e), aPatch.w) * vFade;
  vN = normalize(vec3(-(hx - h0) / e, 1.0, -(hz - h0) / e));
  float h = h0 * (1.0 - 0.6 * flatK);
  vH = h0;
  vFlat = flatK;
  vP = p;
  vec3 pos = vec3(p.x, position.y + h + 0.012, p.y);
  vW = pos + modelMatrix[3].xyz;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;
const MOSS_FRAG = /* glsl */`
${GLSL_LIB}
${PLANE_LIGHT_DECL}
varying vec3 vN;
varying vec3 vW;
varying vec2 vP;
varying float vH;
varying float vFlat;
varying float vFade;
void main() {
  if (vFade < 0.02 || hash12(floor(vP * 90.0)) > vFade * 1.6) discard;
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  vec3 L = normalize(uSunDir);
  float hh = clamp(vH / 0.11, 0.0, 1.0);
  vec3 dark = vec3(0.05, 0.16, 0.07), mid = vec3(0.17, 0.38, 0.11), light = vec3(0.38, 0.58, 0.17);
  vec3 albedo = hh < 0.5 ? mix(dark, mid, hh * 2.0) : mix(mid, light, (hh - 0.5) * 2.0);
  float grain = hash12(floor(vP * 260.0));
  albedo *= 0.80 + 0.40 * grain;
  vec3 cs = cellular(vP * 14.0 + 5.0);
  float star = (1.0 - smoothstep(0.05, 0.11, cs.x)) * step(0.95, hash12(cs.yz));
  albedo = mix(albedo, vec3(0.96, 0.95, 0.90), star * smoothstep(0.3, 0.8, hh));
  float wrap = clamp((dot(N, L) + 0.5) / 1.5, 0.0, 1.0);
  vec3 amb = mix(uGndCol, uSkyCol, N.y * 0.5 + 0.5);
  vec3 col = albedo * (amb + uSunCol * wrap) * mix(0.55, 1.0, hh) * (1.0 - 0.25 * vFlat);
  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.2);
  col += vec3(0.55, 0.78, 0.38) * fres * 0.12 * (0.5 + 0.5 * hh) * (0.5 + 0.5 * grain) * (uSunCol.g * 0.6 + 0.2);
  float fd = distance(cameraPosition, vW);
  col = mix(col, fogColor, smoothstep(fogNear, fogFar, fd));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const FIREFLY_VERT = /* glsl */`
${GLSL_LIB}
uniform float uCount;
uniform float uPx;
varying float vTw;
void main() {
  uint s = pcg(uint(gl_VertexID) * 977u + 5u);
  vec2 base = uZone.xy + (vec2(rnd(s), rnd(s)) * 2.0 - 1.0) * uZone.zw;
  float ph = rnd(s) * 6.2832;
  float hgt = 0.18 + rnd(s) * 0.9;
  float sz = 4.0 + rnd(s) * 3.0;
  vec3 p = vec3(base.x + sin(uTime * 0.40 + ph) * 0.35, hgt + sin(uTime * 0.7 + ph * 2.0) * 0.1, base.y + cos(uTime * 0.33 + ph) * 0.35);
  vTw = (0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (1.4 + rnd(s)) + ph * 5.0))) * uNight;
  if (float(gl_VertexID) >= uCount || uNight < 0.02) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; return; }
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

/* ------------------------------------------------------------------ */
/*  Biome mask                                                         */
/* ------------------------------------------------------------------ */

/**
 * CPU painter for the RGBA biome mask over a square [x0, x0+size]².
 * Channels: r meadow (1 grass, 0 bare), g edge thicket, b flower drifts,
 * a wild / wet. Shapes are stamped directly (O(area), not O(texels × rules)).
 */
export class BiomeMask {
  constructor(x0, z0, size, res) {
    this.x0 = x0; this.z0 = z0; this.size = size; this.res = res;
    this.k = res / size;
    this.excl = new Float32Array(res * res);   // 1 = no grass
    this.wild = new Float32Array(res * res);
    this.flower = new Float32Array(res * res);
    this.edgeBoost = new Float32Array(res * res);
    this.lawn = new Float32Array(res * res);
  }
  /** fn(x, z) -> 0..1 for every texel, kept as the max with what is there */
  paint(field, fn) {
    const arr = this[field], n = this.res;
    for (let j = 0; j < n; j++) {
      const z = this.z0 + (j + 0.5) / this.k;
      for (let i = 0; i < n; i++) {
        const v = fn(this.x0 + (i + 0.5) / this.k, z);
        if (v > arr[j * n + i]) arr[j * n + i] = v;
      }
    }
  }
  _each(cx, cz, r, fn) {
    const k = this.k, n = this.res;
    const i0 = Math.max(0, Math.floor((cx - r - this.x0) * k)), i1 = Math.min(n - 1, Math.ceil((cx + r - this.x0) * k));
    const j0 = Math.max(0, Math.floor((cz - r - this.z0) * k)), j1 = Math.min(n - 1, Math.ceil((cz + r - this.z0) * k));
    for (let j = j0; j <= j1; j++) {
      const z = this.z0 + (j + 0.5) / k;
      for (let i = i0; i <= i1; i++) {
        const x = this.x0 + (i + 0.5) / k;
        fn(j * n + i, x, z);
      }
    }
  }
  disc(field, cx, cz, r, v = 1, soft = 0) {
    const arr = this[field];
    this._each(cx, cz, r + soft, (idx, x, z) => {
      const d = Math.hypot(x - cx, z - cz);
      const f = soft > 0 ? 1 - Math.min(1, Math.max(0, (d - r) / soft)) : (d <= r ? 1 : 0);
      if (f > 0) arr[idx] = Math.max(arr[idx], f * v);
    });
  }
  rect(field, cx, cz, w, d, v = 1) {
    const arr = this[field];
    const hw = w / 2, hd = d / 2;
    this._each(cx, cz, Math.max(hw, hd), (idx, x, z) => {
      if (Math.abs(x - cx) <= hw && Math.abs(z - cz) <= hd) arr[idx] = Math.max(arr[idx], v);
    });
  }
  box(field, minX, minZ, maxX, maxZ, v = 1) {
    this.rect(field, (minX + maxX) / 2, (minZ + maxZ) / 2, maxX - minX, maxZ - minZ, v);
  }
  /** Separable box blur (radius in texels) */
  static blur(src, n, rad) {
    const tmp = new Float32Array(n * n), out = new Float32Array(n * n);
    const w = 1 / (rad * 2 + 1);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        let s = 0;
        for (let k = -rad; k <= rad; k++) s += src[j * n + Math.min(n - 1, Math.max(0, i + k))];
        tmp[j * n + i] = s * w;
      }
    }
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        let s = 0;
        for (let k = -rad; k <= rad; k++) s += tmp[Math.min(n - 1, Math.max(0, j + k)) * n + i];
        out[j * n + i] = s * w;
      }
    }
    return out;
  }
  /** Bake to an RGBA DataTexture; `outer(x, z)` returns 0..1 meadow fall-off. */
  bake(outer = null) {
    const n = this.res;
    const soft = BiomeMask.blur(this.excl, n, 1);
    const near = BiomeMask.blur(this.excl, n, Math.max(2, Math.round(1.6 * this.k)));
    const wild = BiomeMask.blur(this.wild, n, 2);
    const flower = BiomeMask.blur(this.flower, n, 3);
    const data = new Uint8Array(n * n * 4);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const idx = j * n + i;
        const x = this.x0 + (i + 0.5) / this.k, z = this.z0 + (j + 0.5) / this.k;
        const o = outer ? outer(x, z) : 1;
        if (this.lawn[idx] > 0.5) {
          // Tended lawn: no meadow, g says where the lawn grows
          data[idx * 4 + 1] = Math.round(Math.max(0, 1 - this.excl[idx]) * 255);
          continue;
        }
        const meadow = Math.max(0, 1 - Math.max(soft[idx] * 1.15, this.excl[idx])) * o;
        const edge = meadow > 0.05 ? Math.min(1, near[idx] * 2.6 + this.edgeBoost[idx]) * (1 - this.excl[idx]) : 0;
        data[idx * 4] = Math.round(meadow * 255);
        data[idx * 4 + 1] = Math.round(Math.min(1, edge) * 255);
        data[idx * 4 + 2] = Math.round(Math.min(1, flower[idx]) * 255);
        data[idx * 4 + 3] = Math.round(Math.min(1, wild[idx]) * 255);
      }
    }
    const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    this.texture = tex;
    this.rectUniform = new THREE.Vector4(this.x0, this.z0, 1 / this.size, 1 / this.size);
    return tex;
  }
}

/* ------------------------------------------------------------------ */
/*  GrassSystem                                                        */
/* ------------------------------------------------------------------ */

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _fwd = new THREE.Vector3();

/**
 * One grass world (the valley, or the summit). `parent` is a translation-only
 * node; every position handed in (zones, focus) is in its local space.
 *
 *   const g = new GrassSystem(scene, { mask, palette, wind });
 *   g.addRing('near', { name: 'near', radius: 8, spacing: 0.11, lead: 0.25 });
 *   g.addRing('mid', { name: 'mid', radius: 24, spacing: 0.27, inside: 'near' });
 *   g.addZone('mown', { x, z, hw, hd, spacing: 0.04 });
 *   g.update(dt, { renderer, camera, focus, cat, sky, wind, others });
 */
export class GrassSystem {
  constructor(parent, opts = {}) {
    this.parent = parent;
    this.palette = Object.assign({ root: 0x36622a, mid: 0x669a3e, tip: 0xa6c65c }, opts.palette || {});
    this.groundY = opts.groundY || 0;
    this.density = 1;
    this.quality = 2;
    this.time = 0;
    this.windTarget = opts.wind ?? 0.6;
    this.gustLit = opts.gustLit ?? 0.5;
    this.layers = [];
    this.meshes = [];
    this.stamps = [];
    for (let i = 0; i < STAMPS; i++) this.stamps.push(new THREE.Vector4(0, 0, 0.3, 0));
    this.field = null;
    const mask = opts.mask || null;
    this.U = {
      uTime: { value: 0 },
      uWind: { value: this.windTarget },
      uWindDir: { value: new THREE.Vector2(0.86, 0.5) },
      uFocus: { value: new THREE.Vector3() },
      uFieldRect: { value: new THREE.Vector4(0, 0, 1, 1) },
      uFieldOn: { value: 0 },
      uField: { value: null },
      uTrail: { value: null },
      uStamp: { value: this.stamps },
      uMask: { value: mask ? mask.texture : null },
      uMaskRect: { value: mask ? mask.rectUniform : new THREE.Vector4(0, 0, 1, 1) },
      uMaskOn: { value: mask ? 1 : 0 },
      uNight: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.3, 0.8, 0.2).normalize() },
      uSunCol: { value: new THREE.Color(0xffe6b8) },
      uSkyCol: { value: new THREE.Color(0x9ab4d6).multiplyScalar(0.55) },
      uGndCol: { value: new THREE.Color(0x7b8a4a).multiplyScalar(0.35) },
      uPx: { value: 1 }
    };
    this._geoCache = new Map();
  }

  _geo(recipe) {
    let g = this._geoCache.get(recipe.id);
    if (!g) { g = recipe.geo(); this._geoCache.set(recipe.id, g); }
    return g;
  }

  _add(mesh, layer) {
    mesh.position.y = this.groundY;
    mesh.userData.noChunk = true;
    this.parent.add(mesh);
    this.meshes.push(mesh);
    layer.mesh = mesh;
    layer.qualityOn = true;
    this.layers.push(layer);
    return layer;
  }

  _ribbon(recipeName, opts) {
    const recipe = Object.assign({}, RECIPES[recipeName], opts.recipe || {});
    if (opts.defines) recipe.defines = Object.assign({}, recipe.defines, opts.defines);
    recipe.gustLit = opts.gustLit ?? recipe.gustLit ?? this.gustLit;
    const palette = Object.assign({}, this.palette, opts.palette || {});
    const base = this._geo(RECIPES[recipeName]);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    for (const k of Object.keys(base.attributes)) geo.setAttribute(k, base.attributes[k]);
    geo.instanceCount = 1;
    // Placement lives in the shader, so culling uses a sphere kept around
    // the layer's window (updated every frame for rings).
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1);
    const mat = ribbonMaterial(recipe, this.U, palette);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.name = 'Grass ' + (opts.name || recipeName);
    return { mesh, mat, geo };
  }

  /**
   * A ring that follows the cat. `lead` (fraction of the radius) shifts its
   * centre toward where the camera looks; `inside` names the layer whose
   * disc this one leaves to it (the two cross-fade over its rim).
   */
  addRing(recipe, { radius, spacing, lead = 0, inside = null, minQuality = 0, name = recipe, ...rest }) {
    const r = this._ribbon(recipe, { name, ...rest });
    return this._add(r.mesh, { kind: 'ring', name, radius, spacing, lead, inside, minQuality, mat: r.mat, geo: r.geo, centre: new THREE.Vector2() });
  }

  /**
   * A fixed rectangle (centre x/z, half extents hw/hd) of one recipe;
   * `maxDist` hides it while the cat is further away than that.
   */
  addZone(recipe, { x, z, hw, hd, spacing, inside = null, maxDist = Infinity, minQuality = 0, name = recipe, ...rest }) {
    const r = this._ribbon(recipe, { name, ...rest });
    r.mat.uniforms.uZone.value.set(x, z, hw, hd);
    r.geo.boundingSphere.set(new THREE.Vector3(x, 0.6, z), Math.hypot(hw, hd) + 1.5);
    return this._add(r.mesh, {
      kind: 'zone', name, x, z, hw, hd, spacing, inside, maxDist, minQuality, mat: r.mat, geo: r.geo,
      radius: Math.max(hw, hd), centre: new THREE.Vector2(x, z)
    });
  }

  /** Shell-texture carpet under the near ring (fills root gaps at cat height). */
  addShell({ radius = 5, layers = 10, height = 0.09, density = 70, lead = 0.3, palette = null, minQuality = 1 } = {}) {
    const plane = new THREE.PlaneGeometry(1, 1, 36, 36);
    plane.rotateX(-Math.PI / 2);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = plane.index;
    for (const k of Object.keys(plane.attributes)) geo.setAttribute(k, plane.attributes[k]);
    geo.instanceCount = layers;
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius + 1);
    const pal = palette || { root: 0x1c3c18, mid: 0x3f7a2c, tip: 0x86b852 };
    const mat = new THREE.ShaderMaterial({
      uniforms: Object.assign({}, THREE.UniformsUtils.clone(THREE.UniformsLib.fog), this.U, {
        uRingA: { value: new THREE.Vector4() }, uRingB: { value: new THREE.Vector4() }, uZone: { value: new THREE.Vector4() },
        uSpacing: { value: 1 }, uGrid: { value: 1 }, uGridZ: { value: 1 }, uSeed: { value: 1 },
        uLayers: { value: layers }, uShellH: { value: height }, uShellR: { value: radius },
        uDensity: { value: density },
        uRoot: { value: new THREE.Color(pal.root) }, uMid: { value: new THREE.Color(pal.mid) }, uTip: { value: new THREE.Color(pal.tip) }
      }),
      vertexShader: SHELL_VERT, fragmentShader: SHELL_FRAG, side: THREE.DoubleSide, fog: true
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'Grass shell carpet';
    return this._add(mesh, { kind: 'shell', name: 'shell', mat, geo, radius, lead, layersFull: layers, minQuality, centre: new THREE.Vector2() });
  }

  /** Moss pillows: one merged mesh of round patches [{x, z, r, y?}]. */
  addMoss(patches, { minQuality = 0 } = {}) {
    if (!patches.length) return null;
    const pos = [], patch = [], idx = [];
    let base = 0;
    patches.forEach((p, n) => {
      const seg = Math.max(10, Math.min(36, Math.round(p.r * 9)));
      const y = p.y || 0;
      for (let j = 0; j <= seg; j++) {
        for (let i = 0; i <= seg; i++) {
          pos.push(p.x - p.r + (i / seg) * p.r * 2, y, p.z - p.r + (j / seg) * p.r * 2);
          patch.push(p.x, p.z, p.r, n * 1.37 + 0.5);
        }
      }
      for (let j = 0; j < seg; j++) {
        for (let i = 0; i < seg; i++) {
          const a = base + j * (seg + 1) + i, b = a + 1, c = a + seg + 1, d = c + 1;
          idx.push(a, c, b, b, c, d);
        }
      }
      base += (seg + 1) * (seg + 1);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aPatch', new THREE.Float32BufferAttribute(patch, 4));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    const mat = new THREE.ShaderMaterial({
      uniforms: Object.assign({}, THREE.UniformsUtils.clone(THREE.UniformsLib.fog), this.U, {
        uRingA: { value: new THREE.Vector4() }, uRingB: { value: new THREE.Vector4() }, uZone: { value: new THREE.Vector4() },
        uSpacing: { value: 1 }, uGrid: { value: 1 }, uGridZ: { value: 1 }, uSeed: { value: 1 }
      }),
      vertexShader: MOSS_VERT, fragmentShader: MOSS_FRAG, fog: true
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'Moss pillows';
    return this._add(mesh, { kind: 'moss', name: 'moss', mat, geo, minQuality });
  }

  /** Night fireflies over a zone (Points hashed from gl_VertexID). */
  addFireflies({ x, z, hw, hd, count = 40 }) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(x, 0.8, z), Math.hypot(hw, hd) + 1);
    const mat = new THREE.ShaderMaterial({
      uniforms: Object.assign({}, this.U, {
        uRingA: { value: new THREE.Vector4() }, uRingB: { value: new THREE.Vector4() },
        uZone: { value: new THREE.Vector4(x, z, hw, hd) },
        uSpacing: { value: 1 }, uGrid: { value: 1 }, uGridZ: { value: 1 }, uSeed: { value: 1 }, uCount: { value: count }
      }),
      vertexShader: FIREFLY_VERT, fragmentShader: FIREFLY_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const pts = new THREE.Points(geo, mat);
    pts.name = 'Grass fireflies';
    return this._add(pts, { kind: 'fireflies', name: 'fireflies', mat, geo, count, minQuality: 0 });
  }

  /** Quality-tier lever: 1 = full, 0.75 medium, 0.5 low. */
  setDensity(f) {
    this.density = THREE.MathUtils.clamp(f, 0.2, 1);
    this.quality = this.density >= 0.95 ? 2 : this.density >= 0.7 ? 1 : 0;
    for (const L of this.layers) {
      L.qualityOn = this.quality >= (L.minQuality || 0);
      L.mesh.visible = L.qualityOn;
      if (L.kind === 'shell') {
        L.geo.instanceCount = Math.max(4, Math.round(L.layersFull * (0.5 + 0.5 * this.density)));
        L.mat.uniforms.uLayers.value = L.geo.instanceCount;
      }
      if (L.kind === 'fireflies') L.mat.uniforms.uCount.value = Math.round(L.count * this.density);
    }
  }

  /** Cat body + paws (+ nearby villagers) into the physics stamps. */
  _stamp(cat, focus, others) {
    for (const s of this.stamps) s.w = 0;
    let n = 0;
    const p = this.parent;
    p.updateMatrixWorld();
    const e = p.matrixWorld.elements;
    const ox = e[12], oy = e[13] + this.groundY, oz = e[14];
    if (cat && cat.chest && cat.legs) {
      cat.chest.getWorldPosition(_v); this.stamps[n++].set(_v.x - ox, _v.z - oz, 0.36, 0.9);
      const chestY = _v.y;
      cat.hips.getWorldPosition(_v); this.stamps[n++].set(_v.x - ox, _v.z - oz, 0.32, 0.85);
      for (let i = 0; i < 4 && i < cat.legs.length; i++) {
        cat.legs[i].paw.getWorldPosition(_w);
        const planted = _w.y - oy < 0.07;
        this.stamps[n++].set(_w.x - ox, _w.z - oz, 0.14, planted ? 0.75 : 0.25);
      }
      // A cat up on a roof or a wall does not part the grass
      if (chestY - oy > 0.9) for (let i = 0; i < n; i++) this.stamps[i].w = 0;
    } else if (focus) {
      this.stamps[n++].set(focus.x, focus.z, 0.46, 1);
    }
    if (others) {
      for (const o of others) {
        if (n >= STAMPS) break;
        this.stamps[n++].set(o.x - ox, o.z - oz, 0.4, 0.8);
      }
    }
    for (let i = 0; i < n; i++) if (this.stamps[i].w > 0) return true;
    return false;
  }

  /**
   * state: { renderer, camera, focus (local Vector3), cat, sky, wind, others: [world Vector3] }
   */
  update(dt, state) {
    this.time += dt;
    const U = this.U;
    U.uTime.value = this.time;
    const focus = state.focus;
    U.uFocus.value.copy(focus);
    const wind = state.wind ?? this.windTarget;
    U.uWind.value += (wind - U.uWind.value) * Math.min(1, dt * 0.8);

    const sky = state.sky;
    if (sky) {
      const pal = sky.resolvePalette();
      const sunUp = Math.max(0, sky.sunDir.y);
      U.uSunDir.value.copy(sky.sunDir);
      U.uSunCol.value.copy(pal.sun).multiplyScalar(Math.pow(sunUp, 0.5));
      if (pal.hemiSky) U.uSkyCol.value.copy(pal.hemiSky).multiplyScalar(0.55);
      if (pal.hemiGround) U.uGndCol.value.copy(pal.hemiGround).multiplyScalar(0.4);
      const night = THREE.MathUtils.clamp((0.08 - sky.sunDir.y) / 0.22, 0, 1);
      U.uNight.value += (night - U.uNight.value) * Math.min(1, dt * 0.5);
    }

    // Ring centres: around the cat, led toward the view direction
    const cam = state.camera;
    let fx = 0, fz = 0;
    if (cam && cam.getWorldDirection) {
      cam.getWorldDirection(_fwd);
      const l = Math.hypot(_fwd.x, _fwd.z);
      if (l > 1e-3) { fx = _fwd.x / l; fz = _fwd.z / l; }
    }
    const f = this.density;
    const byName = {};
    for (const L of this.layers) {
      if (L.kind === 'ring' || L.kind === 'shell') {
        L.centre.set(focus.x + fx * L.radius * L.lead, focus.z + fz * L.radius * L.lead);
        L.geo.boundingSphere.center.set(L.centre.x, 0.6, L.centre.y);
        L.geo.boundingSphere.radius = L.radius + 2;
      }
      byName[L.name] = L;
    }
    for (const L of this.layers) {
      if (L.kind === 'zone') {
        L.mesh.visible = L.qualityOn && Math.hypot(focus.x - L.x, focus.z - L.z) < L.maxDist + L.radius;
      }
      if (!L.mesh.visible) continue;
      const u = L.mat.uniforms;
      if (L.kind === 'ring' || L.kind === 'zone') {
        const a = L.spacing / Math.sqrt(Math.max(f, 0.2));
        const gx = L.kind === 'zone' ? L.hw : L.radius;
        const gz = L.kind === 'zone' ? L.hd : L.radius;
        const G = Math.ceil((2 * gx) / a) + 2, GZ = Math.ceil((2 * gz) / a) + 2;
        u.uSpacing.value = a;
        u.uGrid.value = G;
        u.uGridZ.value = GZ;
        L.geo.instanceCount = G * GZ;
        u.uRingA.value.set(L.centre.x, L.centre.y, 0, L.kind === 'zone' ? (gx + gz) * 4 : L.radius);
        const inner = L.inside ? byName[L.inside] : null;
        if (inner && inner.mesh.visible) u.uRingB.value.set(inner.centre.x, inner.centre.y, inner.radius, 0);
        else u.uRingB.value.set(0, 0, 0, 0);
      } else if (L.kind === 'shell') {
        u.uRingA.value.set(L.centre.x, L.centre.y, 0, L.radius);
      }
    }

    // Physics
    if (state.renderer && !this.field) {
      this.field = new PushField(state.renderer, { size: 22, texelsPerMeter: 9 });
      if (this.field.ok) U.uFieldOn.value = 1;
    }
    const active = this._stamp(state.cat, focus, state.others);
    if (this.field && this.field.ok) {
      this.field.step(dt, this.stamps, active, focus.x, focus.z);
      U.uField.value = this.field.texture;
      U.uTrail.value = this.field.trailTexture;
      U.uFieldRect.value.set(this.field.x0, this.field.z0, 1 / this.field.size, 1 / this.field.size);
    }
    if (state.renderer) U.uPx.value = state.renderer.getPixelRatio();
  }
}
