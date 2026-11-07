// Grass Lab kit: shared uniforms, GLSL library, cat-collision physics, blade
// geometry builders and the three shader engines (ribbon blades, alpha cards,
// shells). Every grass in types.js is assembled from these.
//
// Conventions
//  * Grass meshes sit under translation-only parents; the shaders work in
//    object space and add modelMatrix[3].xyz at the end.
//  * Placement is hashed from gl_InstanceID (see gridPos): no per-blade
//    attribute buffers. Density is the uniform uGrid (blades per row).
import * as THREE from 'three';

export function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/*  Shared uniforms (one object per patch; every material references   */
/*  the same {value} holders, so a single write updates all grass)     */
/* ------------------------------------------------------------------ */

export function createUniforms() {
  const stamps = [];
  for (let i = 0; i < 6; i++) stamps.push(new THREE.Vector4(0, 0, 0.3, 0));
  return {
    uTime: { value: 0 },
    uWind: { value: 0.8 },
    uWindDir: { value: new THREE.Vector2(0.86, 0.5) },
    uSunDir: { value: new THREE.Vector3(-0.55, 0.78, 0.32).normalize() },
    uSunCol: { value: new THREE.Color(0xffe4b4).multiplyScalar(1.05) },
    uSkyCol: { value: new THREE.Color(0xa9cbee).multiplyScalar(0.62) },
    uGndCol: { value: new THREE.Color(0x7b8a4a).multiplyScalar(0.4) },
    uFocus: { value: new THREE.Vector3() },
    uFog: { value: new THREE.Vector2(0, 0) },
    uFogCol: { value: new THREE.Color(0xffffff) },
    uPx: { value: 1 },
    uFieldRect: { value: new THREE.Vector4(-1.5, -1.5, 1 / 3, 1 / 3) },
    uFieldOn: { value: 0 },
    uTrailOn: { value: 0 },
    uField: { value: null },
    uTrail: { value: null },
    uStamp: { value: stamps }
  };
}

/* ------------------------------------------------------------------ */
/*  GLSL                                                               */
/* ------------------------------------------------------------------ */

export const GLSL_HEAD = /* glsl */`
#define PI 3.14159265359
uniform float uTime;
uniform float uWind;
uniform vec2 uWindDir;
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform vec3 uSkyCol;
uniform vec3 uGndCol;
uniform vec3 uFocus;
uniform vec2 uFog;
uniform vec3 uFogCol;
uniform vec4 uFieldRect;
uniform float uFieldOn;
uniform float uTrailOn;
uniform sampler2D uField;
uniform sampler2D uTrail;
uniform vec4 uStamp[6];
uniform vec4 uCell;
uniform float uGrid;

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
mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
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

// Jittered-grid position of instance id inside the cell (object space)
vec2 gridPos(inout uint s, int id) {
  float G = uGrid;
  float fid = float(id);
  float iz = floor(fid / G);
  float ix = fid - iz * G;
  vec2 j = vec2(rnd(s), rnd(s));
  return uCell.xy + (vec2(ix, iz) + j) * (uCell.z / G);
}

// Wind as a lean (fraction of blade height) in the XZ plane: rolling gust
// fronts + patchy noise + per-position flutter
vec2 windVec(vec2 p) {
  float t = uTime;
  vec2 d = normalize(uWindDir);
  vec2 n = vec2(-d.y, d.x);
  float along = dot(p, d);
  float across = dot(p, n);
  float swell = sin(along * 0.9 - t * 1.25) * 0.5 + 0.5;
  float gust = vnoise(vec2(along * 0.45 - t * 0.85, across * 0.6));
  float amp = (0.30 + 0.70 * gust * swell) * (0.10 + 0.22 * uWind);
  float flut = sin(t * 3.1 + p.x * 5.0 + p.y * 4.3) * 0.5;
  return d * amp + n * flut * 0.05 * (0.3 + uWind);
}

// Cat-collision field: dx, dz (metres, blades lean away), vx, vz
vec4 fieldAt(vec2 p) {
  if (uFieldOn > 0.5) {
    return texture2D(uField, (p - uFieldRect.xy) * uFieldRect.zw);
  }
  vec2 d = vec2(0.0);
  for (int i = 0; i < 6; i++) {
    vec4 st = uStamp[i];
    vec2 a = p - st.xy;
    float l = length(a);
    float f = (1.0 - smoothstep(0.0, st.z, l)) * st.w;
    d += a / max(l, 0.001) * f * 0.45;
  }
  return vec4(d, 0.0, 0.0);
}
// Slow "pressed grass" memory: lean.x, lean.z, pressed
vec3 trailAt(vec2 p) {
  if (uTrailOn > 0.5) return texture2D(uTrail, (p - uFieldRect.xy) * uFieldRect.zw).xyz;
  return vec3(0.0);
}
vec3 applyFog(vec3 col, float dist) {
  float f = 1.0 - exp(-uFog.x * dist);
  return mix(col, uFogCol, clamp(f, 0.0, 1.0));
}
`;

/* ------------------------------------------------------------------ */
/*  Cat-collision physics: spring field + pressed-grass trail          */
/* ------------------------------------------------------------------ */

const SIM_VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const SPRING_FRAG = /* glsl */`
uniform sampler2D tPrev;
uniform vec2 uTexel;
uniform vec4 uRect;
uniform float uDt, uK, uC, uWave, uMaxD;
uniform vec4 uStamp[6];
varying vec2 vUv;
void main() {
  vec4 s = texture2D(tPrev, vUv);
  vec2 d = s.xy, v = s.zw;
  vec2 dl = texture2D(tPrev, vUv - vec2(uTexel.x, 0.0)).xy;
  vec2 dr = texture2D(tPrev, vUv + vec2(uTexel.x, 0.0)).xy;
  vec2 du = texture2D(tPrev, vUv + vec2(0.0, uTexel.y)).xy;
  vec2 dd = texture2D(tPrev, vUv - vec2(0.0, uTexel.y)).xy;
  vec2 lap = (dl + dr + du + dd) * 0.25 - d;
  vec2 acc = -uK * d - uC * v + uWave * lap;
  v += acc * uDt;
  d += v * uDt;
  vec2 p = uRect.xy + vUv * uRect.zw;
  for (int i = 0; i < 6; i++) {
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
uniform vec4 uRect;
uniform float uDt, uDecay;
uniform vec4 uStamp[6];
varying vec2 vUv;
void main() {
  vec4 o = texture2D(tPrev, vUv);
  vec2 dir = o.xy * exp(-uDecay * uDt);
  vec2 p = uRect.xy + vUv * uRect.zw;
  for (int i = 0; i < 6; i++) {
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

const _sim = new WeakMap();
function simFor(renderer) {
  let s = _sim.get(renderer);
  if (s) return s;
  const geo = new THREE.PlaneGeometry(2, 2);
  const stamps = () => ({ value: createUniforms().uStamp.value });
  const spring = new THREE.ShaderMaterial({
    vertexShader: SIM_VERT, fragmentShader: SPRING_FRAG, depthTest: false, depthWrite: false,
    uniforms: {
      tPrev: { value: null }, uTexel: { value: new THREE.Vector2() }, uRect: { value: new THREE.Vector4() },
      uDt: { value: 1 / 60 }, uK: { value: 58 }, uC: { value: 4.6 }, uWave: { value: 36 }, uMaxD: { value: 0.5 },
      uStamp: stamps()
    }
  });
  const trail = new THREE.ShaderMaterial({
    vertexShader: SIM_VERT, fragmentShader: TRAIL_FRAG, depthTest: false, depthWrite: false,
    uniforms: {
      tPrev: { value: null }, uRect: { value: new THREE.Vector4() }, uDt: { value: 1 / 60 },
      uDecay: { value: 0.16 }, uStamp: stamps()
    }
  });
  const mesh = new THREE.Mesh(geo, spring);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(mesh);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  s = { scene, cam, mesh, spring, trail };
  _sim.set(renderer, s);
  return s;
}

/** Can this GPU render to half-float targets? (WebGL2 + colour-buffer ext) */
export function canSimulate(renderer) {
  const ext = renderer.extensions;
  return !!(ext.get('EXT_color_buffer_float') || ext.get('EXT_color_buffer_half_float'));
}

export class PushField {
  /**
   * rect = { x0, z0, sx, sz } in the patch's object space. `trail` adds the
   * slow pressed-grass memory used by the "Pressed"/"Mown" grasses.
   */
  constructor(renderer, rect, { texelsPerMeter = 20, trail = true } = {}) {
    this.renderer = renderer;
    this.rect = rect;
    this.ok = canSimulate(renderer);
    this.wantTrail = trail;
    this.idleFor = 99;
    this.trailIdleFor = 99;
    const w = Math.max(8, Math.round(rect.sx * texelsPerMeter));
    const h = Math.max(8, Math.round(rect.sz * texelsPerMeter));
    this.w = w; this.h = h;
    this._empty = new THREE.DataTexture(new Uint8Array(4), 1, 1);
    this._empty.needsUpdate = true;
    if (!this.ok) { this.texture = this._empty; this.trailTexture = this._empty; return; }
    const make = () => new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType, format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      depthBuffer: false, stencilBuffer: false, generateMipmaps: false
    });
    this.a = make(); this.b = make();
    this.ta = trail ? make() : null; this.tb = trail ? make() : null;
    this.texture = this.a.texture;
    this.trailTexture = trail ? this.ta.texture : this._empty;
    for (const rt of [this.a, this.b, this.ta, this.tb]) if (rt) this._clear(rt);
  }

  _clear(rt) {
    const r = this.renderer;
    const prev = new THREE.Color(); r.getClearColor(prev); const pa = r.getClearAlpha();
    r.setRenderTarget(rt); r.setClearColor(0x000000, 0); r.clear(true, false, false);
    r.setRenderTarget(null); r.setClearColor(prev, pa);
  }

  /** Advance the springs (and trail) one frame. `stamps`: Vector4[6] */
  step(dt, stamps, active) {
    if (!this.ok) return;
    if (active) { this.idleFor = 0; this.trailIdleFor = 0; } else { this.idleFor += dt; this.trailIdleFor += dt; }
    const doSpring = this.idleFor < 3.2;
    const doTrail = this.wantTrail && this.trailIdleFor < 12;
    if (!doSpring && !doTrail) return;
    const r = this.renderer;
    const sim = simFor(r);
    const rc = this.rect;
    const prevTarget = r.getRenderTarget();
    const prevAuto = r.autoClear;
    r.autoClear = true;
    if (doSpring) {
      const m = sim.spring;
      sim.mesh.material = m;
      m.uniforms.tPrev.value = this.a.texture;
      m.uniforms.uTexel.value.set(1 / this.w, 1 / this.h);
      m.uniforms.uRect.value.set(rc.x0, rc.z0, rc.sx, rc.sz);
      m.uniforms.uDt.value = Math.min(dt, 1 / 30);
      for (let i = 0; i < 6; i++) m.uniforms.uStamp.value[i].copy(stamps[i]);
      r.setRenderTarget(this.b);
      r.render(sim.scene, sim.cam);
      const t = this.a; this.a = this.b; this.b = t;
      this.texture = this.a.texture;
    }
    if (doTrail) {
      const m = sim.trail;
      sim.mesh.material = m;
      m.uniforms.tPrev.value = this.ta.texture;
      m.uniforms.uRect.value.set(rc.x0, rc.z0, rc.sx, rc.sz);
      m.uniforms.uDt.value = Math.min(dt, 1 / 20);
      for (let i = 0; i < 6; i++) m.uniforms.uStamp.value[i].copy(stamps[i]);
      r.setRenderTarget(this.tb);
      r.render(sim.scene, sim.cam);
      const t = this.ta; this.ta = this.tb; this.tb = t;
      this.trailTexture = this.ta.texture;
    }
    r.setRenderTarget(prevTarget);
    r.autoClear = prevAuto;
  }

  dispose() {
    for (const rt of [this.a, this.b, this.ta, this.tb]) if (rt) rt.dispose();
    this._empty.dispose();
  }
}

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
  _push(p, n, uv, b, sh, lo) {
    this.pos.push(p[0], p[1], p[2]); this.nor.push(n[0], n[1], n[2]); this.uv.push(uv[0], uv[1]);
    this.bladeAttr.push(b.offX, b.offZ, b.yaw, b.lean);
    this.shape.push(b.h, b.w, sh.kind, b.cls);
    this.local.push(lo[0], lo[1], lo[2]);
    return this.v++;
  }
  /** One ribbon: `rows` left/right pairs plus a tip vertex. Returns its params. */
  blade(o = {}) {
    const b = { offX: 0, offZ: 0, yaw: 0, lean: 1, h: 1, w: 1, cls: 0, rows: 4, ...o };
    const first = this.v;
    for (let i = 0; i < b.rows; i++) {
      const t = i / b.rows;
      this._push([-1, t, 0], [0, 0, 1], [0, t], b, { kind: 0 }, [0, 0, 0]);
      this._push([1, t, 0], [0, 0, 1], [1, t], b, { kind: 0 }, [0, 0, 0]);
    }
    const tip = this._push([0, 1, 0], [0, 0, 1], [0.5, 1], b, { kind: 0 }, [0, 0, 0]);
    for (let i = 0; i < b.rows - 1; i++) {
      const a = first + i * 2, c = first + (i + 1) * 2;
      this.idx.push(a, c, a + 1, a + 1, c, c + 1);
    }
    const l = first + (b.rows - 1) * 2;
    this.idx.push(l, tip, l + 1);
    return b;
  }
  /**
   * Geometry riding on a blade's tip frame. verts: [{p:[x,y,z], n:[x,y,z], uv:[u,v]}],
   * tris: index triples into verts. kind 1 = oriented to the tip, 2 = camera billboard.
   */
  decor(b, verts, tris, kind = 1) {
    const base = this.v;
    for (const v of verts) this._push([0, 1, 0], v.n || [0, 0, 1], v.uv || [0, 0], b, { kind }, v.p);
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
    g.setIndex(this.idx.length > 65000 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    return g;
  }
}

/** One blade per instance */
export function singleBlade(rows = 4) {
  const b = new RibbonBuilder();
  b.blade({ rows });
  return b.build();
}

/** Small spindle used as a seed head */
export function seedHeadDecor(b, len = 0.07, rad = 0.012) {
  const v = [
    { p: [0, 0, 0], n: [0, -1, 0] },
    { p: [rad, len * 0.3, 0], n: [1, 0, 0] }, { p: [0, len * 0.3, rad], n: [0, 0, 1] },
    { p: [-rad, len * 0.3, 0], n: [-1, 0, 0] }, { p: [0, len * 0.3, -rad], n: [0, 0, -1] },
    { p: [0, len, 0], n: [0, 1, 0] }
  ];
  const t = [[0, 2, 1], [0, 3, 2], [0, 4, 3], [0, 1, 4], [5, 1, 2], [5, 2, 3], [5, 3, 4], [5, 4, 1]];
  return [v, t];
}

/** Add `n` crossed-quad-free tufts: returns geometry of `count` blades fanned out */
export function tuftGeometry({ count = 5, rows = 3, spread = 0.035, hMin = 0.7, hMax = 1.0, wMul = 1, lean = 1.1, seed = 3 } = {}) {
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

/* ------------------------------------------------------------------ */
/*  Instanced-by-hash helper                                           */
/* ------------------------------------------------------------------ */

export function gridFor(perM2, size, density) {
  return Math.max(2, Math.ceil(size * Math.sqrt(Math.max(1, perM2) * density)));
}

/** Instanced mesh whose placement is hashed in the shader (no per-instance buffers). */
export function hashField(ctx, cell, baseGeo, material, perM2, opts = {}) {
  const maxInstances = opts.maxInstances ?? 60000;
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = baseGeo.index;
  for (const k of Object.keys(baseGeo.attributes)) geo.setAttribute(k, baseGeo.attributes[k]);
  const tris = (baseGeo.index ? baseGeo.index.count : baseGeo.attributes.position.count) / 3;
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  const apply = opts.apply ? (density) => opts.apply(density, geo, material) : (density) => {
    let G = gridFor(perM2, cell.size, density);
    if (G * G > maxInstances) G = Math.floor(Math.sqrt(maxInstances));
    material.uniforms.uGrid.value = G;
    geo.instanceCount = G * G;
  };
  apply(ctx.density);
  mesh.userData.hash = { apply, tris, perM2 };
  return mesh;
}

/** Collect objects + stats from hash fields (and anything else) for a cell. */
export function packCell(objects, extra = {}) {
  return {
    objects,
    extra,
    update: extra.update || null,
    setDensity(f) { for (const o of objects) if (o.userData.hash) o.userData.hash.apply(f); },
    stats() {
      let items = 0, tris = 0, kb = 0;
      for (const o of objects) {
        const g = o.geometry;
        const inst = g.isInstancedBufferGeometry ? g.instanceCount : (o.isInstancedMesh ? o.count : 1);
        const per = o.userData.hash ? o.userData.hash.tris : ((g.index ? g.index.count : g.attributes.position.count) / 3);
        items += o.userData.itemsFixed ?? (o.userData.itemsPer ? inst * o.userData.itemsPer : inst);
        tris += inst * per;
        if (o.userData.kb) kb += o.userData.kb;
      }
      return { items, tris, draws: objects.length, kb };
    }
  };
}

/* ------------------------------------------------------------------ */
/*  Ribbon engine                                                      */
/* ------------------------------------------------------------------ */

const RIBBON_VERT = (o) => /* glsl */`
${GLSL_HEAD}
attribute vec4 aBlade;
attribute vec4 aShape;
attribute vec3 aLocal;
struct Blade {
  vec2 root; float h; float w; float yaw; float lean; float phase; float rnd;
  vec3 tint; float alive; vec4 extra; float windMul; float curl;
};
varying float vT;
varying float vSide;
varying vec3 vN;
varying vec3 vW;
varying vec3 vTint;
varying vec4 vX;      // rnd, flat, pressed, cls
varying vec4 vY;      // windAmp, rootX, rootZ, kind
varying vec2 vUv;
varying float vFogD;
${o.vertDecl || ''}
#ifndef WIND_GAIN
#define WIND_GAIN 1.0
#endif
#ifndef PUSH_GAIN
#define PUSH_GAIN 1.0
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
void place(inout Blade B, inout uint s, int id) {
${o.place}
}
void main() {
  uint s = pcg(uint(gl_InstanceID) * 2654435761u + uint(uCell.w) * 40503u + 12345u);
  Blade B;
  B.root = uCell.xy + vec2(uCell.z * 0.5);
  B.h = 0.4; B.w = 0.018; B.yaw = 0.0; B.lean = 0.25; B.phase = 0.0; B.rnd = 0.0;
  B.tint = vec3(1.0); B.alive = 1.0; B.extra = vec4(0.0); B.windMul = 1.0; B.curl = 0.0;
  place(B, s, gl_InstanceID);
  if (B.alive < 0.5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }

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
  vec2 pd = fd.xy * PUSH_GAIN;
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
  // blade frame; a blade pushed sideways along its own width axis would make
  // the projection vanish, so fall back to another axis instead of NaN
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
    // decor verts have t == 1: P/T/Sw/N already are the tip frame
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

  vT = t;
  vSide = side;
  vN = nrm;
  vTint = B.tint;
  vX = vec4(B.rnd, flatK, pressed, aShape.w);
  vY = vec4(length(wv), root.x, root.y, kind);
  vUv = uv;
  vW = pos + offW;
  vFogD = distance(cameraPosition, vW);
  ${o.post || ''}
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}
`;

const RIBBON_FRAG = (o) => /* glsl */`
${GLSL_HEAD}
uniform vec3 uRoot;
uniform vec3 uMid;
uniform vec3 uTip;
uniform float uAO;
uniform float uTrans;
uniform float uSpec;
${o.fragUniforms || ''}
varying float vT;
varying float vSide;
varying vec3 vN;
varying vec3 vW;
varying vec3 vTint;
varying vec4 vX;
varying vec4 vY;
varying vec2 vUv;
varying float vFogD;
vec3 ramp(float t) {
  return t < 0.5 ? mix(uRoot, uMid, t * 2.0) : mix(uMid, uTip, (t - 0.5) * 2.0);
}
${o.fragDecl || ''}
void main() {
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  vec3 L = normalize(uSunDir);
  float t = vT;
  vec3 albedo = ramp(t) * vTint;
  float alpha = 1.0;
  vec3 emit = vec3(0.0);
  ${o.fragColor || ''}
  if (alpha < 0.5) discard;
  float ao = mix(uAO, 1.0, smoothstep(0.0, 0.6, t));
  ao *= 1.0 - 0.3 * vX.y;
  vec3 col;
  ${o.fragLight || `
  float ndl = dot(N, L);
  float wrap = clamp((ndl + 0.5) / 1.5, 0.0, 1.0);
  vec3 amb = mix(uGndCol, uSkyCol, N.y * 0.5 + 0.5);
  float trans = pow(clamp(dot(-V, L), 0.0, 1.0), 4.0) * (0.25 + 0.75 * t);
  col = albedo * (amb + uSunCol * wrap) * ao + albedo * uSunCol * trans * uTrans * ao;
  float sp = pow(max(dot(reflect(-L, N), V), 0.0), 22.0);
  col += uSunCol * sp * uSpec * t;
  `}
  col += emit;
  col = applyFog(col, vFogD);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const _src = new Map();

/** Build a ribbon-blade ShaderMaterial for one cell. `o` is the type's recipe. */
export function ribbonMaterial(ctx, cell, o) {
  let src = _src.get(o.id);
  if (!src) {
    src = { v: RIBBON_VERT(o), f: RIBBON_FRAG(o) };
    _src.set(o.id, src);
  }
  const pal = o.palette;
  const uniforms = Object.assign({}, ctx.U, {
    uCell: { value: new THREE.Vector4(cell.ox, cell.oz, cell.size, cell.seed) },
    uGrid: { value: 32 },
    uRoot: { value: new THREE.Color(pal.root) },
    uMid: { value: new THREE.Color(pal.mid) },
    uTip: { value: new THREE.Color(pal.tip) },
    uAO: { value: o.ao ?? 0.35 },
    uTrans: { value: o.trans ?? 0.55 },
    uSpec: { value: o.spec ?? 0.1 }
  }, o.uniforms ? o.uniforms() : {});
  const defines = Object.assign({}, o.defines || {});
  return new THREE.ShaderMaterial({
    uniforms, vertexShader: src.v, fragmentShader: src.f, side: THREE.DoubleSide, defines,
    toneMapped: true
  });
}

/* ------------------------------------------------------------------ */
/*  Shell engine (stacked layers, strands discarded per layer)         */
/* ------------------------------------------------------------------ */

const SHELL_VERT = (o) => /* glsl */`
${GLSL_HEAD}
uniform float uLayers;
uniform float uShellH;
uniform float uSpread;
varying float vL;
varying vec3 vW;
varying vec2 vStrand;
varying float vFogD;
varying float vFlat;
void main() {
  float layer = float(gl_InstanceID) / max(uLayers - 1.0, 1.0);
  vL = layer;
  vec2 xz = uCell.xy + (position.xz + 0.5) * uCell.z;
  vec4 fd = fieldAt(xz);
  vec3 tr = trailAt(xz);
  float h = pow(layer, uSpread) * uShellH;
  float hn = layer * layer;
  vec2 wv = windVec(xz);
  vec2 d = (wv * 0.9 + fd.xy * 0.9 + tr.xy * 0.25) * hn * uShellH * 2.2;
  float press = clamp(length(fd.xy) * 1.6 + tr.z * 0.6, 0.0, 1.0);
  h *= 1.0 - press * 0.5 * layer;
  vFlat = press;
  vec3 pos = vec3(xz.x + d.x, h, xz.y + d.y);
  vStrand = xz;
  vW = pos + modelMatrix[3].xyz;
  vFogD = distance(cameraPosition, vW);
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}
`;
const SHELL_FRAG = (o) => /* glsl */`
${GLSL_HEAD}
uniform vec3 uRoot;
uniform vec3 uMid;
uniform vec3 uTip;
uniform float uDensity;
uniform float uThick;
uniform float uAO;
varying float vL;
varying vec3 vW;
varying vec2 vStrand;
varying float vFogD;
varying float vFlat;
${o.fragDecl || ''}
void main() {
  vec2 g = vStrand * uDensity;
  vec2 cellId = floor(g);
  float hv = hash12(cellId);
  float len = 0.45 + 0.55 * hv;
  vec2 jit = vec2(hash12(cellId + 7.3), hash12(cellId + 19.1)) * 0.5 + 0.25;
  float d = length(fract(g) - jit);
  float rad = uThick * (1.0 - vL / len);
  if (vL > 0.001 && (vL > len || d > rad)) discard;
  float t = vL;
  vec3 albedo = t < 0.5 ? mix(uRoot, uMid, t * 2.0) : mix(uMid, uTip, (t - 0.5) * 2.0);
  albedo *= 0.8 + 0.4 * hash12(cellId + 3.7);
  vec3 emit = vec3(0.0);
  ${o.fragColor || ''}
  float ao = mix(uAO, 1.0, smoothstep(0.0, 0.7, t));
  vec3 N = normalize(vec3(0.0, 1.0, 0.0) + vec3(fract(g) - jit, 0.0).xzy * 0.6);
  vec3 L = normalize(uSunDir);
  float wrap = clamp((dot(N, L) + 0.5) / 1.5, 0.0, 1.0);
  vec3 amb = mix(uGndCol, uSkyCol, 0.8);
  vec3 col = albedo * (amb + uSunCol * wrap) * ao;
  col *= 1.0 - 0.25 * vFlat;
  col += emit;
  col = applyFog(col, vFogD);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const _shellPlanes = new Map();
export function shellMaterial(ctx, cell, o) {
  let src = _src.get(o.id);
  if (!src) { src = { v: SHELL_VERT(o), f: SHELL_FRAG(o) }; _src.set(o.id, src); }
  const uniforms = Object.assign({}, ctx.U, {
    uCell: { value: new THREE.Vector4(cell.ox, cell.oz, cell.size, cell.seed) },
    uGrid: { value: 1 },
    uLayers: { value: o.layers },
    uShellH: { value: o.height },
    uSpread: { value: o.spread ?? 1.0 },
    uDensity: { value: o.density },
    uThick: { value: o.thick ?? 0.45 },
    uAO: { value: o.ao ?? 0.3 },
    uRoot: { value: new THREE.Color(o.palette.root) },
    uMid: { value: new THREE.Color(o.palette.mid) },
    uTip: { value: new THREE.Color(o.palette.tip) }
  }, o.uniforms ? o.uniforms() : {});
  return new THREE.ShaderMaterial({ uniforms, vertexShader: src.v, fragmentShader: src.f, side: THREE.DoubleSide, toneMapped: true });
}

/** Shell stack: one plane drawn `layers` times via instancing */
export function shellField(ctx, cell, o, layersDensityScale = true) {
  const segs = Math.max(8, Math.ceil(cell.size * 14));
  let _shellPlane = _shellPlanes.get(segs);
  if (!_shellPlane) {
    _shellPlane = new THREE.PlaneGeometry(1, 1, segs, segs);
    _shellPlane.rotateX(-Math.PI / 2);
    _shellPlanes.set(segs, _shellPlane);
  }
  const mat = shellMaterial(ctx, cell, o);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = _shellPlane.index;
  for (const k of Object.keys(_shellPlane.attributes)) geo.setAttribute(k, _shellPlane.attributes[k]);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  const tris = _shellPlane.index.count / 3;
  const apply = (density) => {
    const L = layersDensityScale ? Math.max(6, Math.round(o.layers * (0.45 + 0.55 * density))) : o.layers;
    mat.uniforms.uLayers.value = L;
    geo.instanceCount = L;
  };
  apply(ctx.density);
  mesh.userData.hash = { apply, tris, perM2: 0 };
  mesh.userData.itemsFixed = Math.round(o.density * o.density * cell.size * cell.size);
  return mesh;
}

/* ------------------------------------------------------------------ */
/*  Alpha-card engine (crossed quads with a painted tuft texture)      */
/* ------------------------------------------------------------------ */

export function crossedCards(rows = 4, planes = 2) {
  const pos = [], uv = [], nor = [], idx = [];
  let v = 0;
  for (let p = 0; p < planes; p++) {
    const a = (p / planes) * Math.PI;
    const ca = Math.cos(a), sa = Math.sin(a);
    const base = v;
    for (let i = 0; i <= rows; i++) {
      const t = i / rows;
      for (const sx of [-0.5, 0.5]) {
        pos.push(sx * ca, t, -sx * sa);
        uv.push(sx + 0.5, t);
        nor.push(sa, 0, ca);
        v++;
      }
    }
    for (let i = 0; i < rows; i++) {
      const a0 = base + i * 2;
      idx.push(a0, a0 + 2, a0 + 1, a0 + 1, a0 + 2, a0 + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

const CARD_VERT = (o) => /* glsl */`
${GLSL_HEAD}
varying vec2 vUv;
varying float vT;
varying vec3 vW;
varying vec3 vTint;
varying float vFogD;
varying float vFlat;
varying vec3 vN;
void main() {
  uint s = pcg(uint(gl_InstanceID) * 2654435761u + uint(uCell.w) * 40503u + 777u);
  vec2 root = gridPos(s, gl_InstanceID);
  float r1 = rnd(s), r2 = rnd(s), r3 = rnd(s), r4 = rnd(s);
  float n = fbm(root * 1.5 + uCell.w);
  float size = (${o.sizeMin.toFixed(3)} + r1 * ${(o.sizeMax - o.sizeMin).toFixed(3)}) * (0.8 + 0.5 * n);
  float width = size * (${o.aspect.toFixed(3)} + 0.25 * r2);
  float yaw = r3 * 6.2831853;
  mat2 R = rot2(yaw);
  vec3 lp = position;
  vec2 xz = R * vec2(lp.x * width, lp.z * width);
  float t = lp.y;
  vec4 fd = fieldAt(root);
  vec2 wv = windVec(root);
  float flatK = clamp(length(fd.xy) * 2.2, 0.0, 1.0);
  vec2 d = (wv * 0.9 * size + fd.xy) * t * t;
  float hgt = size * t * (1.0 - flatK * 0.55 * t);
  vec3 pos = vec3(root.x + xz.x + d.x, hgt, root.y + xz.y + d.y);
  vT = t;
  vUv = uv;
  vFlat = flatK;
  float hue = r4;
  vTint = mix(vec3(0.85, 1.0, 0.8), vec3(1.12, 1.0, 0.68), hue * hue) * (0.78 + 0.3 * r2);
  vN = vec3(0.0, 1.0, 0.0);
  vW = pos + modelMatrix[3].xyz;
  vFogD = distance(cameraPosition, vW);
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}
`;
const CARD_FRAG = (o) => /* glsl */`
${GLSL_HEAD}
uniform sampler2D uMap;
uniform float uAO;
varying vec2 vUv;
varying float vT;
varying vec3 vW;
varying vec3 vTint;
varying float vFogD;
varying float vFlat;
varying vec3 vN;
void main() {
  vec4 tex = texture2D(uMap, vUv);
  if (tex.a < 0.42) discard;
  vec3 albedo = tex.rgb * vTint;
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  vec3 L = normalize(uSunDir);
  float wrap = clamp((dot(N, L) + 0.5) / 1.5, 0.0, 1.0);
  vec3 amb = mix(uGndCol, uSkyCol, 0.85);
  float ao = mix(uAO, 1.0, smoothstep(0.0, 0.5, vT)) * (1.0 - 0.28 * vFlat);
  float trans = pow(clamp(dot(-V, L), 0.0, 1.0), 4.0) * vT;
  vec3 col = albedo * (amb + uSunCol * wrap) * ao + albedo * uSunCol * trans * 0.45;
  col = applyFog(col, vFogD);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function cardMaterial(ctx, cell, o, map) {
  let src = _src.get(o.id);
  if (!src) { src = { v: CARD_VERT(o), f: CARD_FRAG(o) }; _src.set(o.id, src); }
  const uniforms = Object.assign({}, ctx.U, {
    uCell: { value: new THREE.Vector4(cell.ox, cell.oz, cell.size, cell.seed) },
    uGrid: { value: 32 },
    uMap: { value: map },
    uAO: { value: o.ao ?? 0.5 }
  });
  return new THREE.ShaderMaterial({ uniforms, vertexShader: src.v, fragmentShader: src.f, side: THREE.DoubleSide, toneMapped: true });
}
