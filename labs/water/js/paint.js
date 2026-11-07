// The painterly pass: the stage is rendered to a target, then a Kuwahara
// filter (four overlapping windows; keep the mean of the calmest one) turns
// texture into flat brush patches while keeping edges sharp. Paper tooth and
// pigment pooling at edges finish it. One slider mixes photo and painting,
// which is the Ghibli / Kyoto Animation balance: real light, painted surfaces.
import * as THREE from 'three';
import { paperTexture } from './textures.js';

const VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
const FS = /* glsl */`
uniform sampler2D uSrc, uPaper;
uniform vec2 uRes;
uniform float uAmount, uStep, uSplit;
varying vec2 vUv;
vec3 comp(vec3 c) { return c / (1. + c); }       // compress HDR before measuring variance
void main() {
  vec3 src = texture2D(uSrc, vUv).rgb;
  if (uAmount <= 0.001) {
    gl_FragColor = vec4(max(src, 0.), 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    return;
  }
  vec2 px = uStep / uRes;
  vec3 m[4]; vec3 s[4];
  for (int k = 0; k < 4; k++) { m[k] = vec3(0.); s[k] = vec3(0.); }
  for (int j = -3; j <= 3; j++) for (int i = -3; i <= 3; i++) {
    vec3 c = comp(texture2D(uSrc, vUv + vec2(float(i), float(j)) * px).rgb);
    vec3 c2 = c * c;
    if (i <= 0 && j <= 0) { m[0] += c; s[0] += c2; }
    if (i >= 0 && j <= 0) { m[1] += c; s[1] += c2; }
    if (i <= 0 && j >= 0) { m[2] += c; s[2] += c2; }
    if (i >= 0 && j >= 0) { m[3] += c; s[3] += c2; }
  }
  float best = 1e9; vec3 pick = comp(src);
  for (int k = 0; k < 4; k++) {
    vec3 mu = m[k] / 16.;
    vec3 v = abs(s[k] / 16. - mu * mu);
    float sv = v.r + v.g + v.b;
    if (sv < best) { best = sv; pick = mu; }
  }
  vec3 paint = pick / max(vec3(1e-3), 1. - pick);
  // pigment pools where tones change, the paper shows through flat washes
  float l0 = dot(comp(texture2D(uSrc, vUv + vec2(px.x * 2., 0.)).rgb), vec3(0.33)) - dot(comp(texture2D(uSrc, vUv - vec2(px.x * 2., 0.)).rgb), vec3(0.33));
  float l1 = dot(comp(texture2D(uSrc, vUv + vec2(0., px.y * 2.)).rgb), vec3(0.33)) - dot(comp(texture2D(uSrc, vUv - vec2(0., px.y * 2.)).rgb), vec3(0.33));
  float edge = smoothstep(0.04, 0.2, length(vec2(l0, l1)));
  vec2 pp = gl_FragCoord.xy / 420.;
  float paper = texture2D(uPaper, pp).r * 0.7 + texture2D(uPaper, pp * 2.7).g * 0.3;
  paint *= 1. - edge * 0.22;
  paint *= 1. + (paper - 0.5) * 0.09;
  float L = dot(paint, vec3(0.3, 0.59, 0.11));
  paint = mix(vec3(L), paint, 1.12);
  vec3 col = mix(src, paint, uAmount);
  if (uSplit >= 0. && vUv.x < uSplit) col = src;
  gl_FragColor = vec4(max(col, 0.), 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class PaintPass {
  constructor() {
    this.rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uSrc: { value: this.rt.texture }, uPaper: { value: paperTexture() }, uRes: { value: new THREE.Vector2(4, 4) }, uAmount: { value: 0 }, uStep: { value: 1 }, uSplit: { value: -1 } },
      vertexShader: VS, fragmentShader: FS, depthTest: false, depthWrite: false
    });
    this.scene = new THREE.Scene();
    const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    q.frustumCulled = false;
    this.scene.add(q);
    this.cam = new THREE.Camera();
  }
  /** Size the target to the stage rect (in device pixels). */
  begin(renderer, rect) {
    const pr = renderer.getPixelRatio();
    const w = Math.max(4, Math.round(rect.width * pr)), h = Math.max(4, Math.round(rect.height * pr));
    if (this.rt.width !== w || this.rt.height !== h) this.rt.setSize(w, h);
    this.mat.uniforms.uRes.value.set(w, h);
    this.mat.uniforms.uStep.value = Math.max(1, pr * 0.9);
    return this.rt;
  }
  /** Draw the filtered image into the stage rect on screen. */
  draw(renderer, rect, amount, split = -1) {
    this.mat.uniforms.uAmount.value = amount;
    this.mat.uniforms.uSplit.value = split;
    const y = innerHeight - rect.bottom;
    renderer.setRenderTarget(null);
    renderer.setScissorTest(true);
    renderer.setViewport(rect.left, y, rect.width, rect.height);
    renderer.setScissor(rect.left, y, rect.width, rect.height);
    renderer.render(this.scene, this.cam);
  }
  dispose() { this.rt.dispose(); this.mat.dispose(); }
}
