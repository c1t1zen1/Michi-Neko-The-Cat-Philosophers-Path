// A ripple tank on the GPU: the wave equation on a heightfield, two targets
// ping-ponged (Evan Wallace's WebGL Water, three's webgl_gpgpu_water). Land
// from the field texture is a wall, so rings bounce off the banks and stones.
import * as THREE from 'three';

const VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
const FS = /* glsl */`
uniform sampler2D uPrev, uField;
uniform vec2 uTexel;
uniform float uLevel, uDamp;
uniform vec4 uDrops[8];
varying vec2 vUv;
void main() {
  vec4 c = texture2D(uPrev, vUv);
  float avg = (texture2D(uPrev, vUv - vec2(uTexel.x, 0.)).r + texture2D(uPrev, vUv + vec2(uTexel.x, 0.)).r
             + texture2D(uPrev, vUv - vec2(0., uTexel.y)).r + texture2D(uPrev, vUv + vec2(0., uTexel.y)).r) * 0.25;
  float h = c.r, v = c.g;
  v += (avg - h) * 2.;
  v *= uDamp;
  h += v;
  for (int i = 0; i < 8; i++) {
    vec4 d = uDrops[i];
    if (d.w == 0.) continue;
    float r = length((vUv - d.xy) / uTexel) / d.z;
    h += d.w * max(0., cos(min(r, 1.) * 3.14159) * 0.5 + 0.5) * step(r, 1.);
  }
  float land = step(uLevel - 0.01, texture2D(uField, vUv).r);
  gl_FragColor = vec4(h * (1. - land) * 0.999, v * (1. - land), 0., 1.);
}`;

export class RippleSim {
  constructor(renderer, field, size = 256) {
    this.renderer = renderer;
    const opts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
    const aspect = field.d / field.w;
    this.w = size; this.h = Math.max(16, Math.round(size * aspect));
    this.a = new THREE.WebGLRenderTarget(this.w, this.h, opts);
    this.b = new THREE.WebGLRenderTarget(this.w, this.h, opts);
    this.field = field;
    this.drops = Array.from({ length: 8 }, () => new THREE.Vector4());
    this.queue = [];
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS, depthTest: false, depthWrite: false,
      uniforms: {
        uPrev: { value: null }, uField: { value: field.texture }, uTexel: { value: new THREE.Vector2(1 / this.w, 1 / this.h) },
        uLevel: { value: 0.02 }, uDamp: { value: 0.993 }, uDrops: { value: this.drops }
      }
    });
    this.scene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    quad.frustumCulled = false;
    this.scene.add(quad);
    this.cam = new THREE.Camera();
    this.texel = new THREE.Vector2(1 / this.w, 1 / this.h);
    this.clear();
  }
  get texture() { return this.a.texture; }
  clear() {
    const r = this.renderer, prev = r.getRenderTarget(), c = r.getClearColor(new THREE.Color()), a = r.getClearAlpha();
    r.setClearColor(0x000000, 0);   // the page clears to white: a white start would be h = 1 everywhere
    for (const t of [this.a, this.b]) { r.setRenderTarget(t); r.clear(); }
    r.setClearColor(c, a);
    r.setRenderTarget(prev);
  }
  /** A drop at world (x, z): radius in texels, strength in metres-ish. */
  drop(x, z, radius = 3, strength = 0.03) {
    const f = this.field;
    this.queue.push(new THREE.Vector4((x - f.x0) / f.w, (z - f.z0) / f.d, radius, strength));
  }
  step(level, steps = 2) {
    const r = this.renderer, prev = r.getRenderTarget();
    this.mat.uniforms.uLevel.value = level;
    for (let s = 0; s < steps; s++) {
      for (let i = 0; i < 8; i++) {
        const q = s === 0 ? this.queue.shift() : null;
        if (q) this.drops[i].copy(q); else this.drops[i].set(0, 0, 1, 0);
      }
      this.mat.uniforms.uPrev.value = this.a.texture;
      r.setRenderTarget(this.b);
      r.render(this.scene, this.cam);
      [this.a, this.b] = [this.b, this.a];
    }
    if (this.queue.length > 24) this.queue.length = 24;
    r.setRenderTarget(prev);
  }
  dispose() { this.a.dispose(); this.b.dispose(); this.mat.dispose(); }
}
