// The finish: the stage renders into a multisampled target with mipmaps, then
// one pass grades it. The "photograph" half keeps real light; the "painting"
// half is what a background painter would do to it:
//   - glow:   bright light bleeds (read from a blurry mip, nearly free), the
//             diffusion Kyoto Animation's photography department adds
//   - grade:  shadows lean cool, light leans warm, greens are lifted (Oga's
//             muted greens with a warm neighbour beside them)
//   - haze:   a soft warm wash from where the sun is on screen
//   - brush:  a Kuwahara filter (four windows, keep the calmest mean): flat
//             strokes, sharp edges, and pigment pooling where tones change
//   - paper:  a faint tooth over the flat washes
import * as THREE from 'three';
import { paperTexture } from './paint.js';

const VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
const FS = /* glsl */`
uniform sampler2D uSrc, uPaper;
uniform vec2 uRes, uSun;
uniform float uPaint, uGrade, uGlow, uSplit, uStep, uSunVis, uNight;
uniform vec3 uSunCol;
varying vec2 vUv;
vec3 comp(vec3 c) { return c / (1. + c); }
vec3 kuwahara(vec2 uv, vec2 px) {
  vec3 m[4], s[4];
  for (int k = 0; k < 4; k++) { m[k] = vec3(0.); s[k] = vec3(0.); }
  for (int j = -3; j <= 3; j++) for (int i = -3; i <= 3; i++) {
    vec3 c = comp(texture2D(uSrc, uv + vec2(float(i), float(j)) * px).rgb), c2 = c * c;
    if (i <= 0 && j <= 0) { m[0] += c; s[0] += c2; }
    if (i >= 0 && j <= 0) { m[1] += c; s[1] += c2; }
    if (i <= 0 && j >= 0) { m[2] += c; s[2] += c2; }
    if (i >= 0 && j >= 0) { m[3] += c; s[3] += c2; }
  }
  float best = 1e9; vec3 pick = vec3(0.);
  for (int k = 0; k < 4; k++) {
    vec3 mu = m[k] / 16., v = abs(s[k] / 16. - mu * mu);
    float sv = v.r + v.g + v.b;
    if (sv < best) { best = sv; pick = mu; }
  }
  return pick / max(vec3(1e-3), 1. - pick);
}
vec3 grade(vec3 c, vec2 uv, float amt) {
  float L = dot(c, vec3(.2126, .7152, .0722));
  // glow: the soft mip, only what is bright
  vec3 blur = textureLod(uSrc, uv, 4.5).rgb * .5 + textureLod(uSrc, uv, 6.).rgb * .5;
  c += max(blur - .62, 0.) * uGlow * 1.1;
  // split-tone: cool in the shade, warm in the light (Ghibli shade is blue, not black)
  float sh = 1. - smoothstep(.02, .45, L);
  c *= mix(vec3(1.), mix(vec3(.9, .97, 1.13), vec3(1.05, 1.0, .9), smoothstep(.25, .9, L)), amt);
  c += vec3(.012, .02, .045) * sh * amt * (1. - uNight * .5);
  // greens a little brighter and more yellow, as painters push them
  float g = smoothstep(.0, .12, c.g - max(c.r, c.b));
  c = mix(c, c * vec3(1.06, 1.08, .92), g * amt * .6);
  float L2 = dot(c, vec3(.2126, .7152, .0722));
  c = mix(vec3(L2), c, 1. + .1 * amt);
  // the sun's haze
  vec2 d = (uv - uSun) * vec2(uRes.x / uRes.y, 1.);
  float haze = exp(-dot(d, d) * 1.4) * uSunVis;
  c += uSunCol * haze * .16 * amt;
  // a soft vignette
  vec2 q = uv - .5;
  c *= 1. - dot(q, q) * .28 * amt;
  return c;
}
void main() {
  vec4 src4 = texture2D(uSrc, vUv);
  vec3 src = max(src4.rgb, 0.);
  vec3 photo = grade(src, vUv, uGrade * .55);
  vec3 col = photo;
  if (uPaint > .001) {
    vec2 px = uStep / uRes;
    vec3 paint = kuwahara(vUv, px);
    float l0 = dot(comp(texture2D(uSrc, vUv + vec2(px.x * 2., 0.)).rgb) - comp(texture2D(uSrc, vUv - vec2(px.x * 2., 0.)).rgb), vec3(.33));
    float l1 = dot(comp(texture2D(uSrc, vUv + vec2(0., px.y * 2.)).rgb) - comp(texture2D(uSrc, vUv - vec2(0., px.y * 2.)).rgb), vec3(.33));
    float edge = smoothstep(.04, .2, length(vec2(l0, l1)));
    vec2 pp = gl_FragCoord.xy / 380.;
    float paper = texture2D(uPaper, pp).r * .7 + texture2D(uPaper, pp * 2.7).g * .3;
    paint *= 1. - edge * .2;
    paint *= 1. + (paper - .5) * .1;
    paint = grade(paint, vUv, uGrade);
    col = mix(photo, paint, uPaint);
  }
  if (uSplit >= 0. && vUv.x < uSplit) col = src;
  gl_FragColor = vec4(col, 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  // where nothing was drawn (cleared to alpha 0), show the white page
  gl_FragColor.rgb = mix(vec3(1.), gl_FragColor.rgb, smoothstep(.0, .5, src4.a));
}`;

export class Finish {
  constructor(renderer) {
    this.renderer = renderer;
    this.rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
    this.rt.texture.generateMipmaps = true;
    this.rt.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uSrc: { value: this.rt.texture }, uPaper: { value: paperTexture() }, uRes: { value: new THREE.Vector2(4, 4) },
        uSun: { value: new THREE.Vector2(0.5, 0.9) }, uSunVis: { value: 0 }, uSunCol: { value: new THREE.Color() },
        uPaint: { value: 0 }, uGrade: { value: 1 }, uGlow: { value: 0.8 }, uSplit: { value: -1 }, uStep: { value: 1 }, uNight: { value: 0 }
      },
      vertexShader: VS, fragmentShader: FS, depthTest: false, depthWrite: false
    });
    this.scene = new THREE.Scene();
    const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    q.frustumCulled = false;
    this.scene.add(q);
    this.cam = new THREE.Camera();
    this._v = new THREE.Vector3();
  }
  /** size the target to the stage rect (device pixels) and return it */
  begin(rect) {
    const pr = this.renderer.getPixelRatio();
    const w = Math.max(4, Math.round(rect.width * pr)), h = Math.max(4, Math.round(rect.height * pr));
    if (this.rt.width !== w || this.rt.height !== h) this.rt.setSize(w, h);
    this.mat.uniforms.uRes.value.set(w, h);
    this.mat.uniforms.uStep.value = Math.max(1.2, pr * 1.5);
    return this.rt;
  }
  /** where the sun is on screen, for the haze */
  sun(camera, sunDir, sunCol, elev) {
    const v = this._v.copy(camera.position).addScaledVector(sunDir, 100).project(camera);
    const U = this.mat.uniforms;
    U.uSun.value.set(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5);
    U.uSunVis.value = v.z < 1 ? Math.max(0, Math.min(1, elev * 4)) : 0;
    U.uSunCol.value.copy(sunCol);
  }
  draw(rect, { paint = 0, grade = 1, glow = 0.8, split = -1, night = 0 } = {}) {
    const U = this.mat.uniforms, r = this.renderer;
    U.uPaint.value = paint; U.uGrade.value = grade; U.uGlow.value = glow; U.uSplit.value = split; U.uNight.value = night;
    const y = innerHeight - rect.bottom;
    r.setRenderTarget(null);
    r.setScissorTest(true);
    r.setViewport(rect.left, y, rect.width, rect.height);
    r.setScissor(rect.left, y, rect.width, rect.height);
    r.render(this.scene, this.cam);
  }
}
