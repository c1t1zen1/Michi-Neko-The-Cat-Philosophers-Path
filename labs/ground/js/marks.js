// Marks the ground keeps, on the GPU: paw prints and tool grooves. Neither is
// ever read back; the ground shader samples both.
//
// PrintBuffer  R = depth, G = wetness carried by the paw. Stamps blend with
//              MAX, a multiply pass fades them (rain fills prints, wet marks
//              dry). A broom or a rake wipes them with MIN.
// GrooveBuffer R = across the stroke, G = coverage, B = stroke angle, A = tool.
//              The shader turns "across" into rake ridges (every 6.3 cm) or
//              broom streaks, so the buffer can be coarse and still sharp.
import * as THREE from 'three';

const FS_VERT = 'void main() { gl_Position = vec4(position.xy, 0., 1.); }';
const MAX = { blending: THREE.CustomBlending, blendEquation: THREE.MaxEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor };
const MIN = { blending: THREE.CustomBlending, blendEquation: THREE.MinEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor };
// dst × src: an exponential fade that can never go below zero on a float target
const MUL = { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor };

function target(w, h, type) {
  const rt = new THREE.WebGLRenderTarget(w, h, { type, format: THREE.RGBAFormat, depthBuffer: false, stencilBuffer: false });
  rt.texture.minFilter = rt.texture.magFilter = THREE.LinearFilter;
  rt.texture.generateMipmaps = false;
  return rt;
}

const STAMP_VS = /* glsl */`
attribute vec4 aStamp;   // x, z, heading, size
attribute vec3 aVal;     // depth, wet, kind (0 fore paw, 1 hind paw, 2 round)
uniform vec4 uRect;
varying vec2 vQ; varying vec3 vV;
void main() {
  float c = cos(aStamp.z), s = sin(aStamp.z);
  vec2 q = position.xy;
  vec2 w = aStamp.xy + vec2(q.x * c + q.y * s, -q.x * s + q.y * c) * aStamp.w;
  vQ = q; vV = aVal;
  gl_Position = vec4(((w - uRect.xy) * uRect.zw) * 2. - 1., 0., 1.);
}`;
// a cat paw: a lobed metacarpal pad and four toe beans (hind paws a bit longer)
const STAMP_FS = /* glsl */`
varying vec2 vQ; varying vec3 vV;
float ell(vec2 q, vec2 c, vec2 r) { return 1. - smoothstep(.62, 1., length((q - c) / r)); }
void main() {
  vec2 q = vQ * 2.;
  float s;
  if (vV.z > 1.5) s = 1. - smoothstep(.4, 1., length(q));
  else {
    float hind = vV.z;
    s = ell(q, vec2(0., -.3 - hind * .08), vec2(.44, .34 + hind * .06));
    s = max(s, ell(q, vec2(-.24, -.34), vec2(.2, .22)) * .9);
    s = max(s, ell(q, vec2(.24, -.34), vec2(.2, .22)) * .9);
    for (int i = 0; i < 4; i++) {
      float a = (float(i) - 1.5) * .5;
      s = max(s, ell(q, vec2(sin(a) * .62, .34 + cos(a) * .2), vec2(.15, .19)));
    }
  }
  if (s < .01) discard;
  gl_FragColor = vec4(vV.x * s, vV.y * smoothstep(0., .5, s), 0., 0.);
}`;
const HEAL_FS = /* glsl */`
uniform vec2 uKeep;
void main() { gl_FragColor = vec4(uKeep, 1., 1.); }`;

export class PrintBuffer {
  constructor(renderer, field, { k = 96, max = 64 } = {}) {
    this.renderer = renderer;
    this.rect = field.rect.clone();
    this.half = renderer.capabilities.isWebGL2 && (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));
    const type = this.half ? THREE.HalfFloatType : THREE.UnsignedByteType;
    this.acc = 0;
    this.rt = target(Math.round(field.w * k), Math.round(field.d * k), type);
    this.texture = this.rt.texture;
    this.max = max;
    const plane = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = plane.index;
    g.setAttribute('position', plane.attributes.position);
    this.aStamp = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
    this.aVal = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    g.setAttribute('aStamp', this.aStamp); g.setAttribute('aVal', this.aVal);
    g.instanceCount = 0;
    this.stampMesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { uRect: { value: this.rect } }, vertexShader: STAMP_VS, fragmentShader: STAMP_FS, depthTest: false, depthWrite: false, ...MAX }));
    this.stampMesh.frustumCulled = false;
    this.healMat = new THREE.ShaderMaterial({ uniforms: { uKeep: { value: new THREE.Vector2(1, 1) } }, vertexShader: FS_VERT, fragmentShader: HEAL_FS, depthTest: false, depthWrite: false, ...MUL });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.healMat);
    this.quad.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.stampMesh, this.quad);
    this.cam = new THREE.Camera();
    this.queue = [];
    this.clear();
  }
  clear() { this._draw(() => this.renderer.clear(true, false, false), 0x000000, 0); }
  _draw(fn, color = null, alpha = 0) {
    // autoClear would wipe the marks with the page's clear colour on every render
    const r = this.renderer, prev = r.getRenderTarget(), pc = r.getClearColor(new THREE.Color()), pa = r.getClearAlpha(), sc = r.getScissorTest(), ac = r.autoClear;
    r.autoClear = false;
    r.setRenderTarget(this.rt);
    r.setScissorTest(false);
    if (color !== null) r.setClearColor(color, alpha);
    fn();
    r.setRenderTarget(prev);
    r.setClearColor(pc, pa);
    r.setScissorTest(sc);
    r.autoClear = ac;
  }
  /** kind: 0 fore paw, 1 hind paw, 2 round (a stone set down, a ladle splash) */
  stamp(x, z, heading, size, depth, wet, kind = 0) {
    if (this.queue.length < this.max) this.queue.push([x, z, heading, size, depth, wet, kind]);
  }
  /** per frame: draw queued stamps, then fade at these rates (1/s) */
  update(dt, { depth = 1 / 300, dry = 1 / 30 } = {}) {
    const q = this.queue;
    this.acc += dt;
    const kR = Math.exp(-this.acc * depth), kG = Math.exp(-this.acc * dry);
    // an 8-bit target cannot hold a tiny fade: save it up until it shows
    const heal = this.half || kG < 0.985 || kR < 0.985;
    this._draw(() => {
      if (q.length) {
        for (let i = 0; i < q.length; i++) {
          const s = q[i];
          this.aStamp.setXYZW(i, s[0], s[1], s[2], s[3]);
          this.aVal.setXYZ(i, s[4], s[5], s[6]);
        }
        this.aStamp.needsUpdate = this.aVal.needsUpdate = true;
        this.stampMesh.geometry.instanceCount = q.length;
        this.stampMesh.visible = true; this.quad.visible = false;
        this.renderer.render(this.scene, this.cam);
        q.length = 0;
      }
      if (!heal) return;
      this.healMat.uniforms.uKeep.value.set(kR, kG);
      this.stampMesh.visible = false; this.quad.visible = true;
      this.renderer.render(this.scene, this.cam);
      this.acc = 0;
    });
  }
}

/* ---------------- grooves ---------------- */

const STROKE_VS = /* glsl */`
attribute vec3 aInfo;    // across (−1..1), angle (0..1), tool
uniform vec4 uRect;
varying vec3 vI; varying vec2 vW;
void main() {
  vI = aInfo; vW = position.xz;
  gl_Position = vec4(((position.xz - uRect.xy) * uRect.zw) * 2. - 1., 0., 1.);
}`;
const STROKE_FS = /* glsl */`
uniform float uMode;     // 0 ribbon, 1 rings round uC
uniform vec3 uC;         // ring centre x, z, inner radius
varying vec3 vI; varying vec2 vW;
void main() {
  float ac = vI.x, ang = vI.y;
  if (uMode > .5) {
    vec2 d = vW - uC.xy;
    float r = length(d);
    ac = clamp((r - uC.z) / .38 - 1., -1., 1.);
    vec2 t = vec2(-d.y, d.x) / max(r, 1e-4);
    ang = fract(atan(t.y, t.x) / 3.14159265);
    if (r < uC.z) discard;
  }
  gl_FragColor = vec4(ac * .5 + .5, 1., ang, vI.z);
}`;
const WIPE_FS = 'void main() { gl_FragColor = vec4(0., 60000., 60000., 60000.); }';

export class GrooveBuffer {
  constructor(renderer, field, { k = 64 } = {}) {
    this.renderer = renderer;
    this.rect = field.rect.clone();
    this.rt = target(Math.round(field.w * k), Math.round(field.d * k), THREE.UnsignedByteType);
    this.texture = this.rt.texture;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uRect: { value: this.rect }, uMode: { value: 0 }, uC: { value: new THREE.Vector3() } },
      vertexShader: STROKE_VS, fragmentShader: STROKE_FS, depthTest: false, depthWrite: false, blending: THREE.NoBlending
    });
    this.scene = new THREE.Scene();
    this.cam = new THREE.Camera();
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.mat);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
    this.wipeMat = new THREE.ShaderMaterial({ uniforms: { uRect: { value: this.rect } }, vertexShader: STROKE_VS, fragmentShader: WIPE_FS, depthTest: false, depthWrite: false, ...MIN });
    this.clear();
  }
  clear() {
    const r = this.renderer, prev = r.getRenderTarget(), pc = r.getClearColor(new THREE.Color()), pa = r.getClearAlpha();
    r.setRenderTarget(this.rt); r.setClearColor(0x000000, 0); r.clear(true, false, false);
    r.setRenderTarget(prev); r.setClearColor(pc, pa);
  }
  _render(geo, mode = 0, centre = null, target = this.rt, mat = this.mat) {
    const r = this.renderer, prev = r.getRenderTarget(), sc = r.getScissorTest(), ac = r.autoClear;
    r.autoClear = false;
    this.mesh.geometry = geo;
    this.mesh.material = mat;
    this.mat.uniforms.uMode.value = mode;
    if (centre) this.mat.uniforms.uC.value.copy(centre);
    r.setRenderTarget(target); r.setScissorTest(false);
    r.render(this.scene, this.cam);
    r.setRenderTarget(prev); r.setScissorTest(sc);
    r.autoClear = ac;
    geo.dispose();
  }
  /** one segment of a stroke from a to b: tool 0 rake (76 cm), 1 broom (48 cm) */
  segment(ax, az, bx, bz, tool = 0, wipe = null) {
    const half = tool ? 0.24 : 0.38;
    const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
    if (len < 1e-4) return;
    const tx = dx / len, tz = dz / len, nx = -tz, nz = tx;
    // a little overlap so consecutive segments join without seams
    const ex = tx * 0.02, ez = tz * 0.02;
    const ang = ((Math.atan2(tz, tx) % Math.PI) + Math.PI) % Math.PI / Math.PI;
    const P = [ax - ex + nx * half, az - ez + nz * half, ax - ex - nx * half, az - ez - nz * half, bx + nx * half, bz + nz * half, bx - nx * half, bz - nz * half];
    const pos = new Float32Array([P[0], 0, P[1], P[2], 0, P[3], P[4], 0, P[5], P[6], 0, P[7]]);
    const info = new Float32Array([1, ang, tool, -1, ang, tool, 1, ang, tool, -1, ang, tool]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aInfo', new THREE.BufferAttribute(info, 3));
    g.setIndex([0, 1, 2, 1, 3, 2]);
    if (wipe) this._render(g.clone(), 0, null, wipe.rt, this.wipeMat);
    this._render(g);
  }
  /** mizu-mon: rake bands round a stone at (x, z) from radius r0 out, n bands */
  rings(x, z, r0, n = 2, wipe = null) {
    const R = r0 + n * 0.76;
    const g = new THREE.RingGeometry(r0, R, 96, 1);
    g.rotateX(Math.PI / 2);
    g.translate(x, 0, z);
    const info = new Float32Array(g.attributes.position.count * 3);
    g.setAttribute('aInfo', new THREE.BufferAttribute(info, 3));
    if (wipe) this._render(g.clone(), 0, null, wipe.rt, this.wipeMat);
    for (let i = 0; i < n; i++) {
      const gi = new THREE.RingGeometry(r0 + i * 0.76, r0 + (i + 1) * 0.76, 96, 1);
      gi.rotateX(Math.PI / 2); gi.translate(x, 0, z);
      gi.setAttribute('aInfo', new THREE.BufferAttribute(new Float32Array(gi.attributes.position.count * 3), 3));
      this._render(gi, 1, new THREE.Vector3(x, z, r0 + i * 0.76));
    }
    g.dispose();
  }
}
