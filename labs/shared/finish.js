// Finishes: one scene, painted eight ways. The scene renders once into a
// half-float target (linear light plus depth), is tone-mapped into an 8-bit
// target in display space (where painters and Kuwahara both work), an
// optional quarter-size glow is blurred from it, and one stylise pass writes
// the screen. 'physical' skips all of it and draws straight to the canvas,
// exactly as the game does.
import * as THREE from 'three';
import { HASH, NOISE } from './glsl.js';

export const FX_LAYER = 2;   // clouds, mist, stars: drawn in colour, skipped in the normal pass

export const FINISHES = [
  { key: 'physical', name: 'Physical light', jp: '写実', hint: 'ACES straight to the screen, as the game ships' },
  { key: 'background', name: 'Background art', jp: '背景美術', hint: 'Ghibli × KyoAni: real light, painted surface, diffusion glow' },
  { key: 'gouache', name: 'Gouache', jp: '不透明水彩', hint: 'generalised 8-sector Kuwahara' },
  { key: 'watercolor', name: 'Watercolour', jp: '透明水彩', hint: 'wobble, pigment pooling at edges, granulation' },
  { key: 'ink', name: 'Ink line', jp: '線画', hint: 'Sobel on depth and normals, hatching in shade' },
  { key: 'cel', name: 'Cel', jp: 'セル画', hint: 'three tones, ink line, rim light' },
  { key: 'woodblock', name: 'Woodblock', jp: '木版画', hint: 'block palette, key line, bokashi sky' },
  { key: 'sumi', name: 'Sumi-e', jp: '水墨画', hint: 'ink wash that thins into mist' }
];
const MODE = { physical: 0, background: 1, gouache: 2, watercolor: 3, ink: 4, cel: 5, woodblock: 6, sumi: 7 };
const NEEDS_NORMAL = new Set(['ink', 'cel', 'woodblock', 'sumi']);
const NEEDS_GLOW = new Set(['background', 'gouache', 'cel']);

const VS = /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// three r160's ACESFilmicToneMapping, then the sRGB transfer
const TONE_FS = /* glsl */`
uniform sampler2D tHdr; uniform float uExposure; varying vec2 vUv;
vec3 RRTAndODTFit(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
vec3 aces(vec3 color) {
  const mat3 IN = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
  const mat3 OUT = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
  color *= uExposure / 0.6;
  return clamp(OUT * RRTAndODTFit(IN * color), 0.0, 1.0);
}
vec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
void main() { vec4 h = texture2D(tHdr, vUv); gl_FragColor = vec4(srgb(aces(h.rgb)), 1.0); }`;

const GLOW_FS = /* glsl */`
uniform sampler2D tSrc; uniform vec2 uDir; uniform float uBright; varying vec2 vUv;
void main() {
  if (uBright > 0.5) {
    vec3 c = texture2D(tSrc, vUv).rgb;
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    gl_FragColor = vec4(c * smoothstep(0.58, 0.95, l), 1.0);
    return;
  }
  vec3 s = vec3(0.0);
  float w[5] = float[5](0.227, 0.194, 0.122, 0.054, 0.016);
  s += texture2D(tSrc, vUv).rgb * w[0];
  for (int i = 1; i < 5; i++) {
    s += texture2D(tSrc, vUv + uDir * float(i) * 1.6).rgb * w[i];
    s += texture2D(tSrc, vUv - uDir * float(i) * 1.6).rgb * w[i];
  }
  gl_FragColor = vec4(s, 1.0);
}`;

const STYLE_FS = /* glsl */`
uniform sampler2D tCol, tDepth, tNrm, tGlow;
uniform vec2 uRes; uniform float uMode, uTime, uNear, uFar, uStrength, uKasumi, uKasumiNear, uOrtho, uLineFar, uKeepBg, uPaintMix, uSat;
uniform vec3 uSun, uPaper, uInk, uMist, uBg;
uniform vec4 uBlob;
varying vec2 vUv;
${HASH}
${NOISE}
float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
float linDepth(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  if (uOrtho > 0.5) return uNear + d * (uFar - uNear);
  float z = d * 2.0 - 1.0;
  return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear));
}
// generalised Kuwahara: eight overlapping sectors, each a fan of three
// spokes × four rings with gaussian weights; sectors blend by 1/(1+σ⁴)
vec3 kuwahara(vec2 uv, float radius) {
  vec2 px = 1.0 / uRes;
  vec3 c0 = texture2D(tCol, uv).rgb;
  vec3 acc = vec3(0.0); float wsum = 0.0;
  for (int k = 0; k < 8; k++) {
    vec3 m = c0, s = c0 * c0; float w = 1.0;
    for (int j = -1; j <= 1; j++) {
      float a = (float(k) * 2.0 + float(j)) * 0.3926991;
      vec2 dir = vec2(cos(a), sin(a)) * px * radius * 0.25;
      for (int r = 1; r <= 4; r++) {
        vec3 c = texture2D(tCol, uv + dir * float(r)).rgb;
        float g = exp(-float(r * r) * 0.11);
        m += c * g; s += c * c * g; w += g;
      }
    }
    m /= w;
    float sd = sqrt(max(0.0, lum(abs(s / w - m * m))));
    float a = 1.0 / (1.0 + pow(sd * 255.0 / 6.0, 4.0));
    acc += m * a; wsum += a;
  }
  return acc / max(wsum, 1e-6);
}
// depth edges from the Laplacian of inverse depth: 1/z is affine across a
// plane in screen space, so planes (even at grazing angles) give zero and
// only real silhouettes and creases fire; normal edges from a Sobel
float edgeDN(vec2 uv, float t) {
  vec2 px = t / uRes;
  float w0 = 1.0 / linDepth(uv);
  float wl = 1.0 / linDepth(uv - vec2(px.x, 0.0)), wr = 1.0 / linDepth(uv + vec2(px.x, 0.0));
  float wd = 1.0 / linDepth(uv - vec2(0.0, px.y)), wu = 1.0 / linDepth(uv + vec2(0.0, px.y));
  float lap = (abs(wl + wr - 2.0 * w0) + abs(wd + wu - 2.0 * w0)) / max(w0, 1e-7);
  float de = smoothstep(0.03, 0.12, lap);
  vec3 nx = vec3(0.0), ny = vec3(0.0);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 o = vec2(float(x), float(y));
    float wx = float(x) * (y == 0 ? 2.0 : 1.0), wy = float(y) * (x == 0 ? 2.0 : 1.0);
    vec3 n = texture2D(tNrm, uv + o * px).rgb;
    nx += n * wx; ny += n * wy;
  }
  float ne = smoothstep(0.55, 1.2, length(nx) + length(ny));
  return clamp(max(de, ne), 0.0, 1.0);
}
float edgeLum(vec2 uv, float t) {
  vec2 px = t / uRes;
  float l = lum(texture2D(tCol, uv + vec2(px.x, 0.0)).rgb) - lum(texture2D(tCol, uv - vec2(px.x, 0.0)).rgb);
  float m = lum(texture2D(tCol, uv + vec2(0.0, px.y)).rgb) - lum(texture2D(tCol, uv - vec2(0.0, px.y)).rgb);
  return sqrt(l * l + m * m);
}
float paper(vec2 p) {
  return 0.6 * vnoise2(p * vec2(0.9, 0.35)) + 0.4 * vnoise2(p * vec2(0.18, 2.6));
}
vec3 screen(vec3 a, vec3 b) { return 1.0 - (1.0 - a) * (1.0 - b); }
vec3 nearestBlock(vec3 c) {
  vec3 P[13] = vec3[13](vec3(0.94, 0.89, 0.78), vec3(0.62, 0.74, 0.82), vec3(0.24, 0.43, 0.59), vec3(0.12, 0.24, 0.37), vec3(0.16, 0.15, 0.13),
    vec3(0.77, 0.28, 0.18), vec3(0.82, 0.66, 0.36), vec3(0.5, 0.6, 0.42), vec3(0.31, 0.42, 0.27), vec3(0.56, 0.55, 0.5), vec3(0.85, 0.6, 0.53),
    vec3(0.5, 0.38, 0.27), vec3(0.74, 0.65, 0.5));
  vec3 best = P[0]; float bd = 1e9;
  for (int i = 0; i < 13; i++) { vec3 d = (c - P[i]) * vec3(0.9, 1.2, 0.8); float e = dot(d, d); if (e < bd) { bd = e; best = P[i]; } }
  return best;
}
void main() {
  vec2 uv = vUv;
  vec2 fc = uv * uRes;
  float s = uStrength * max(0.6, uRes.y / 900.0);
  float depth = linDepth(uv);
  bool sky = texture2D(tDepth, uv).x > 0.99999;
  vec3 c = texture2D(tCol, uv).rgb;
  int mode = int(uMode + 0.5);
  float fiber = paper(fc);
  float lineFade = 1.0 - smoothstep(uLineFar * 0.35, uLineFar, depth);

  if (mode == 1) {
    c = mix(c, kuwahara(uv, 2.6 * s), uPaintMix);
    c = screen(c, texture2D(tGlow, uv).rgb * 0.6);
    float L = lum(c);
    c = mix(vec3(L), c, uSat);
    c = (c - 0.5) * 1.07 + 0.5;
    c += vec3(0.02, 0.026, 0.06) * (1.0 - smoothstep(0.0, 0.42, L));
    c = mix(c, c * vec3(1.05, 1.0, 0.92), smoothstep(0.55, 1.0, L));
    if (uSun.z > 0.0) {
      float a = uRes.x / uRes.y;
      float d = distance(uv * vec2(a, 1.0), uSun.xy * vec2(a, 1.0));
      c = screen(c, vec3(1.0, 0.78, 0.5) * 0.3 * exp(-d * 2.4) * uSun.z);
    }
    c *= 0.975 + 0.04 * fiber;
  } else if (mode == 2) {
    c = kuwahara(uv, 5.0 * s);
    c = screen(c, texture2D(tGlow, uv).rgb * 0.3);
    float L = lum(c);
    c = mix(vec3(L), c, 1.18);
    c *= 0.95 + 0.08 * fiber;
  } else if (mode == 3) {
    vec2 wob = (vec2(vnoise2(fc / 70.0 + 3.1), vnoise2(fc / 70.0 + 7.7)) - 0.5) * 7.0 / uRes;
    c = kuwahara(uv + wob, 2.2 * s);
    float e = edgeLum(uv + wob, 1.5);
    c *= 1.0 - smoothstep(0.04, 0.25, e) * 0.3;
    float t = fbm2(fc / 260.0, 3);
    c = pow(max(c, 0.0), vec3(1.0 + (t - 0.5) * 0.4));
    float gran = fbm2(fc / 2.5, 3);
    c *= 1.0 - (gran - 0.5) * 0.3 * (1.0 - lum(c));
    c = mix(c, uPaper, 0.1 + 0.08 * fbm2(fc / 400.0 + 9.0, 2));
    c *= 0.96 + 0.06 * fiber;
  } else if (mode == 4) {
    vec2 disp = vec2(hash12(fc) * sin(fc.y * 0.08), hash12(fc + 7.0) * cos(fc.x * 0.08)) * 1.6 / uRes;
    float e = edgeDN(uv + disp, 1.0 + 0.6 * s) * lineFade;
    float L = lum(c);
    vec3 base = mix(vec3(L), c, 0.7) * vec3(1.03, 1.0, 0.94);
    base = mix(base, floor(base * 6.0 + 0.5) / 6.0, 0.5);
    float h = 0.0;
    if (!sky) {
      vec2 q = fc + disp * uRes;
      if (L < 0.62 && mod(q.x + q.y, 7.0) < 1.0) h = 0.55;
      if (L < 0.42 && mod(q.x, 6.0) < 1.0) h = 0.8;
      if (L < 0.24 && mod(q.y, 5.0) < 1.0) h = 1.0;
      h *= lineFade;
    }
    c = mix(base * mix(uPaper, vec3(1.0), 0.5), uInk, max(e, h * 0.7));
    c *= 0.96 + 0.06 * fiber;
  } else if (mode == 5) {
    vec3 b = kuwahara(uv, 1.6 * s);
    float L = lum(b);
    float band = mix(0.46, 0.76, smoothstep(0.24, 0.27, L));
    band = mix(band, 1.0, smoothstep(0.56, 0.6, L));
    c = clamp(b / max(L, 0.06) * band * 0.66, 0.0, 1.0);
    vec3 n = texture2D(tNrm, uv).rgb * 2.0 - 1.0;
    float rim = sky ? 0.0 : smoothstep(0.55, 0.9, 1.0 - abs(n.z)) * 0.18;
    c += vec3(1.0, 0.92, 0.8) * rim;
    c = screen(c, texture2D(tGlow, uv).rgb * 0.35);
    c = mix(c, uInk, edgeDN(uv, 1.0 + 0.4 * s) * 0.85 * lineFade);
  } else if (mode == 6) {
    vec3 b = kuwahara(uv, 2.0 * s);
    if (sky) b = mix(b, vec3(0.12, 0.24, 0.37), smoothstep(0.62, 1.0, uv.y) * 0.85);
    c = nearestBlock(b);
    c *= 1.0 - 0.05 * sin(fc.y * 0.32 + vnoise2(fc / 30.0) * 7.0) * (1.0 - lum(c));
    float e = edgeDN(uv + vec2(1.2, -0.8) / uRes, 1.0 + 0.5 * s) * lineFade;
    c = mix(c, vec3(0.16, 0.15, 0.13), e * 0.9);
    c *= 0.95 + 0.07 * fiber;
  } else if (mode == 7) {
    vec3 b = kuwahara(uv, 3.0 * s);
    float mist = sky ? 1.0 : smoothstep(120.0, uLineFar, depth);
    float ink = 1.0 - lum(b);
    ink = mix(ink, floor(ink * 4.0 + 0.5) / 4.0, 0.55);
    ink *= (1.0 - mist * 0.88) * 1.15;
    ink += (fbm2(fc / 45.0, 3) - 0.5) * 0.12 * ink;
    c = mix(uPaper, uInk, clamp(ink, 0.0, 1.0) * 0.92);
    float e = edgeDN(uv, 1.2 + 0.8 * s) * (0.55 + 0.45 * vnoise2(fc / 18.0)) * (1.0 - mist);
    c = mix(c, uInk, e * 0.8);
    c *= 0.95 + 0.07 * fiber;
  }

  if (mode >= 1 && uKasumi > 0.0 && !(mode == 7)) {
    float farM = smoothstep(uKasumiNear, uKasumiNear * 1.6 + 500.0, depth) * (sky ? 0.55 : 1.0);
    float band = smoothstep(0.5, 0.72, fbm2(vec2(uv.x * 1.6 + uTime * 0.004, uv.y * 11.0) + 4.0, 4));
    c = mix(c, uMist, band * farM * uKasumi * 0.7);
  }
  if (mode == 1 || mode == 2) c *= 1.0 - 0.16 * pow(length(uv - 0.5) * 1.25, 2.6);
  if (uKeepBg > 0.5 && sky) {
    float br = uBlob.z > 0.0 ? length((uv - uBlob.xy) / uBlob.zw) : 2.0;
    c = mix(uBg, uBg * vec3(0.74, 0.76, 0.72), smoothstep(1.0, 0.2, br) * 0.62);
  }
  gl_FragColor = vec4(c, 1.0);
}`;

export class Finisher {
  constructor(renderer) {
    this.r = renderer;
    this.pool = new Map();
    this.qs = new THREE.Scene();
    this.qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.qs.add(this.quad);
    const mk = (fs, uniforms) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false, toneMapped: false });
    this.tone = mk(TONE_FS, { tHdr: { value: null }, uExposure: { value: 1 } });
    this.glow = mk(GLOW_FS, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() }, uBright: { value: 0 } });
    this.style = mk(STYLE_FS, {
      tCol: { value: null }, tDepth: { value: null }, tNrm: { value: null }, tGlow: { value: null },
      uRes: { value: new THREE.Vector2() }, uMode: { value: 1 }, uTime: { value: 0 }, uNear: { value: 0.1 }, uFar: { value: 1000 }, uOrtho: { value: 0 },
      uStrength: { value: 1 }, uKasumi: { value: 0 }, uKasumiNear: { value: 260 }, uLineFar: { value: 1800 },
      uBlob: { value: new THREE.Vector4() }, uSat: { value: 1.2 }, uPaintMix: { value: 1 }, uKeepBg: { value: 0 }, uBg: { value: new THREE.Color(1, 1, 1) }, uSun: { value: new THREE.Vector3() }, uPaper: { value: new THREE.Color(0.95, 0.92, 0.85) }, uInk: { value: new THREE.Color(0.11, 0.1, 0.09) }, uMist: { value: new THREE.Color(0.98, 0.9, 0.76) }
    });
    this.normalMat = new THREE.MeshNormalMaterial();
    this._c = new THREE.Color();
  }

  targets(w, h) {
    const key = w + 'x' + h;
    let T = this.pool.get(key);
    if (T) { this.pool.delete(key); this.pool.set(key, T); return T; }
    const hdr = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(w, h) });
    const q = { type: THREE.HalfFloatType };
    T = { hdr, ldr: new THREE.WebGLRenderTarget(w, h), nrm: new THREE.WebGLRenderTarget(w, h), g1: new THREE.WebGLRenderTarget(Math.max(2, w >> 2), Math.max(2, h >> 2), q), g2: new THREE.WebGLRenderTarget(Math.max(2, w >> 2), Math.max(2, h >> 2), q) };
    this.pool.set(key, T);
    if (this.pool.size > 6) {
      const [oldKey, old] = this.pool.entries().next().value;
      for (const t of Object.values(old)) { t.depthTexture?.dispose(); t.dispose(); }
      this.pool.delete(oldKey);
    }
    return T;
  }

  _pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.qs, this.qc); }

  /** Draw scene through camera into the page rect (CSS px). clip = [x0, x1] fraction of the rect to write. */
  render(scene, camera, rect, mode, { strength = 1, kasumi = 0, kasumiNear = 260, sun = null, time = 0, clip = null, exposure = null, lineFar = 1800, keepBg = false, paintMix = 1, blob = null, sat = 1.2 } = {}) {
    const r = this.r, pr = r.getPixelRatio();
    const y = innerHeight - rect.bottom;
    if (camera.isPerspectiveCamera) {
      const a = rect.width / Math.max(1, rect.height);
      if (Math.abs(camera.aspect - a) > 1e-4) { camera.aspect = a; camera.updateProjectionMatrix(); }
    }
    const sc = clip ? [rect.left + clip[0] * rect.width, (clip[1] - clip[0]) * rect.width] : [rect.left, rect.width];
    if (mode === 'physical') {
      r.setRenderTarget(null);
      r.setScissorTest(true);
      r.setViewport(rect.left, y, rect.width, rect.height);
      r.setScissor(sc[0], y, sc[1], rect.height);
      r.render(scene, camera);
      return;
    }
    const w = Math.max(2, Math.round(rect.width * pr)), h = Math.max(2, Math.round(rect.height * pr));
    const T = this.targets(w, h);
    r.setScissorTest(false);
    r.getClearColor(this._c);
    const alpha = r.getClearAlpha();
    r.setRenderTarget(T.hdr); r.clear(); r.render(scene, camera);
    if (NEEDS_NORMAL.has(mode)) {
      const bg = scene.background, mask = camera.layers.mask;
      scene.overrideMaterial = this.normalMat; scene.background = null;
      camera.layers.disable(FX_LAYER);
      r.setClearColor(0x8080ff, 1);
      r.setRenderTarget(T.nrm); r.clear(); r.render(scene, camera);
      scene.overrideMaterial = null; scene.background = bg; camera.layers.mask = mask;
      r.setClearColor(this._c, alpha);
    }
    this.tone.uniforms.tHdr.value = T.hdr.texture;
    this.tone.uniforms.uExposure.value = exposure ?? r.toneMappingExposure;
    this._pass(this.tone, T.ldr);
    if (NEEDS_GLOW.has(mode)) {
      const G = this.glow.uniforms;
      G.tSrc.value = T.ldr.texture; G.uBright.value = 1; this._pass(this.glow, T.g1);
      G.uBright.value = 0;
      G.tSrc.value = T.g1.texture; G.uDir.value.set(1 / T.g1.width, 0); this._pass(this.glow, T.g2);
      G.tSrc.value = T.g2.texture; G.uDir.value.set(0, 1 / T.g1.height); this._pass(this.glow, T.g1);
    }
    const U = this.style.uniforms;
    U.tCol.value = T.ldr.texture; U.tDepth.value = T.hdr.depthTexture; U.tNrm.value = T.nrm.texture; U.tGlow.value = T.g1.texture;
    U.uRes.value.set(w, h); U.uMode.value = MODE[mode] ?? 1; U.uTime.value = time;
    U.uNear.value = camera.near; U.uFar.value = camera.far; U.uOrtho.value = camera.isOrthographicCamera ? 1 : 0;
    U.uSat.value = sat; U.uPaintMix.value = paintMix; if (blob) U.uBlob.value.copy(blob); else U.uBlob.value.set(0, 0, 0, 0); U.uKeepBg.value = keepBg ? 1 : 0; U.uStrength.value = strength; U.uKasumi.value = kasumi; U.uKasumiNear.value = kasumiNear; U.uLineFar.value = lineFar;
    if (sun) U.uSun.value.copy(sun); else U.uSun.value.set(0, 0, 0);
    r.setRenderTarget(null);
    r.setViewport(rect.left, y, rect.width, rect.height);
    r.setScissor(sc[0], y, sc[1], rect.height);
    r.setScissorTest(true);
    this.quad.material = this.style;
    r.render(this.qs, this.qc);
  }
}
