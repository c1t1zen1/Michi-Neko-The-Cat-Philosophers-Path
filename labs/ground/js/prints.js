// The trail buffer: a fixed render target over the terrain rect. R = surface
// height (1 = untouched), G = dryness. Stamps combine with MIN blending, so
// nothing is read back; a stochastic additive pass heals it per surface.
import * as THREE from 'three';
import { GLSL_HASH } from './hash.js';

const MAX = 64;
const HEAL_FS = /* glsl */`
${GLSL_HASH}
uniform sampler2D uSplat; uniform float uDt, uWet, uSeed;
varying vec2 vUv;
void main() {
  vec4 sp = texture2D(uSplat, vec2(vUv.x, 1. - vUv.y));
  float we = max(1. - sp.x - sp.y - sp.z - sp.w, 0.);
  float rateR = we * mix(1. / 60., 1. / 180., uWet) + sp.x / 40. + sp.y / 15. + (sp.z + sp.w) / 5.;
  float rateG = mix(1. / 25., 1. / 250., uWet);
  vec2 inc = vec2(rateR, rateG) * uDt * 255.;
  uvec2 h = pcg2d(uvec2(gl_FragCoord.xy) + uint(uSeed) * 7919u);
  vec2 r = vec2(h) * (1.0 / 4294967296.0);
  vec2 add = (floor(inc) + step(r, fract(inc))) / 255.;
  gl_FragColor = vec4(add, 0., 1.);
}`;
const STAMP_FS = /* glsl */`
varying vec2 vQ; varying vec3 vS;
float ell(vec2 q, vec2 c, vec2 r) { return 1. - smoothstep(.7, 1., length((q - c) / r)); }
void main() {
  vec2 q = vQ; float s;
  if (vS.z > .5) s = 1. - smoothstep(.5, 1., length(q));
  else {
    s = ell(q, vec2(0., -.22), vec2(.46, .36));
    for (int i = 0; i < 4; i++) { float a = (float(i) - 1.5) * .52; s = max(s, ell(q, vec2(sin(a) * .66, .36 + cos(a) * .22), vec2(.17, .2))); }
  }
  if (s < .01) discard;
  gl_FragColor = vec4(1. - vS.y * s, mix(1., 1. - .8 * s, vS.x), 1., 1.);
}`;
const MIN = { blending: THREE.CustomBlending, blendEquation: THREE.MinEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor };
const ADD = { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor };

export class PrintBuffer {
  constructor(renderer, terrain, res = 1024) {
    this.r = renderer; this.terrain = terrain; this.res = res;
    this.rt = new THREE.WebGLRenderTarget(res, res, { format: THREE.RGBAFormat, type: THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, generateMipmaps: false });
    this.rt.texture.wrapS = this.rt.texture.wrapT = THREE.ClampToEdgeWrapping;
    const h = terrain.size / 2;
    this.cam = new THREE.OrthographicCamera(-h, h, h, -h, 0.1, 50);
    this.cam.position.set(0, 10, 0); this.cam.up.set(0, 0, -1); this.cam.lookAt(0, 0, 0);

    this.healU = { uSplat: { value: terrain.splatTex }, uDt: { value: 0 }, uWet: { value: 0 }, uSeed: { value: 0 } };
    this.healScene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      uniforms: this.healU, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }', fragmentShader: HEAL_FS, depthTest: false, depthWrite: false, ...ADD
    }));
    quad.frustumCulled = false;
    this.healScene.add(quad);

    const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2);
    this.attr = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    g.setAttribute('aS', this.attr);
    this.mesh = new THREE.InstancedMesh(g, new THREE.ShaderMaterial({
      vertexShader: 'attribute vec3 aS; varying vec2 vQ; varying vec3 vS; void main(){ vQ = position.xz * 2.; vS = aS; gl_Position = projectionMatrix * viewMatrix * instanceMatrix * vec4(position, 1.); }',
      fragmentShader: STAMP_FS, depthTest: false, depthWrite: false, side: THREE.DoubleSide, ...MIN
    }), MAX);
    this.mesh.frustumCulled = false; this.mesh.count = 0;
    this.stampScene = new THREE.Scene();
    this.stampScene.add(this.mesh);
    this.queue = [];
    this.fresh = true;
    this.seed = 0;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3();
    this._c = new THREE.Color(); this._vp = new THREE.Vector4();
  }
  get texture() { return this.rt.texture; }
  clear() { this.fresh = true; this.queue.length = 0; }
  stamp(x, z, heading = 0, size = 0.1, wet = 0, depth = 1, kind = 0) { this.queue.push([x, z, heading, size, wet, depth, kind]); }

  update(dt, wet) {
    const r = this.r, n = Math.min(MAX, this.queue.length);
    for (let i = 0; i < n; i++) {
      const [x, z, hd, size, w, d, k] = this.queue[i];
      this._p.set(x, 0, z); this._q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, hd); this._s.setScalar(size);
      this.mesh.setMatrixAt(i, this._m.compose(this._p, this._q, this._s));
      this.attr.setXYZ(i, w, d, k);
    }
    this.queue.splice(0, n);
    this.mesh.count = n;
    if (n) { this.mesh.instanceMatrix.needsUpdate = true; this.attr.needsUpdate = true; }

    const prev = { t: r.getRenderTarget(), ac: r.autoClear, a: r.getClearAlpha(), sc: r.getScissorTest() };
    r.getClearColor(this._c); r.getViewport(this._vp);
    r.setRenderTarget(this.rt); r.setScissorTest(false); r.autoClear = false;
    if (this.fresh) { r.setClearColor(0xffffff, 1); r.clear(true, false, false); this.fresh = false; }
    this.healU.uDt.value = dt; this.healU.uWet.value = wet; this.healU.uSeed.value = ++this.seed;
    r.render(this.healScene, this.cam);
    if (n) r.render(this.stampScene, this.cam);
    r.setRenderTarget(prev.t); r.autoClear = prev.ac; r.setClearColor(this._c, prev.a); r.setScissorTest(prev.sc); r.setViewport(this._vp);
  }
}
