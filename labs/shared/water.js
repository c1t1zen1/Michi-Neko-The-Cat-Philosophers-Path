// PondWater: a still pool with a real wave simulation and a planar reflection.
// The surface is a heightfield stepped on the CPU (the classic two-buffer wave
// equation) and read in the fragment shader for its normals; the reflection is
// the scene drawn again from a mirrored camera. Drop something in and the sky
// breaks up the way it should.
import * as THREE from 'three';
import { HASH, NOISE } from './glsl.js';
import { canvas2d, canvasTexture, TAU, clamp } from './craft.js';

const VS = /* glsl */`
varying vec3 vP;
#include <fog_pars_vertex>
void main() {
  vec4 w = modelMatrix * vec4(position, 1.); vP = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FS = /* glsl */`
precision highp float;
uniform sampler2D tH, tRefl; uniform mat4 uReflVP;
uniform vec3 uCam, uSunDir, uSunCol, uMoonDir, uMoonCol, uDeep, uShallow, uSkyTop, uSkyHor;
uniform vec2 uCenter; uniform float uTexel, uSize, uScale, uTime, uBreeze, uRadius, uHasRefl, uLit, uHeightGain, uOpacity;
varying vec3 vP;
#include <fog_pars_fragment>
${HASH}
${NOISE}
float hTex(vec2 uv) {
  vec2 st = uv / uTexel - .5, i = floor(st), f = st - i;
  float a = texture2D(tH, (i + vec2(.5, .5)) * uTexel).r, b = texture2D(tH, (i + vec2(1.5, .5)) * uTexel).r;
  float c = texture2D(tH, (i + vec2(.5, 1.5)) * uTexel).r, d = texture2D(tH, (i + vec2(1.5, 1.5)) * uTexel).r;
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
void main() {
  vec2 uv = (vP.xz - uCenter) / uSize + .5;
  float e = uTexel;
  float hL = hTex(uv - vec2(e, 0.)), hR = hTex(uv + vec2(e, 0.)), hD = hTex(uv - vec2(0., e)), hU = hTex(uv + vec2(0., e));
  vec3 n = normalize(vec3((hL - hR) * uScale, 1., (hD - hU) * uScale));
  // breeze: small drifting wavelets over the simulated rings
  if (uBreeze > 0.) {
    vec2 q = vP.xz;
    float nx = fbm2(q * 1.7 + vec2(uTime * .22, 0.), 3) - fbm2(q * 1.7 + vec2(uTime * .22, 3.1), 3);
    float nz = fbm2(q * 1.9 + vec2(0., -uTime * .18) + 7., 3) - fbm2(q * 1.9 + vec2(0., -uTime * .18) + 4.3, 3);
    n = normalize(n + vec3(nx, 0., nz) * uBreeze * .7);
  }
  vec3 V = normalize(uCam - vP);
  float cosT = max(dot(V, n), 0.);
  float fres = .025 + .975 * pow(1. - cosT, 5.);
  float d = clamp(length(vP.xz - uCenter) / uRadius, 0., 1.);
  vec3 body = mix(uShallow, uDeep, smoothstep(.15, .98, 1. - pow(d, 2.2)));
  body *= uLit;
  vec3 R = reflect(-V, n);
  vec3 refl;
  if (uHasRefl > .5) {
    vec4 c = uReflVP * vec4(vP, 1.);
    vec2 suv = c.xy / c.w * .5 + .5;
    suv += n.xz * vec2(.05, .08);
    refl = texture2D(tRefl, suv).rgb;
  } else {
    float h = pow(clamp(R.y, 0., 1.), .55);
    refl = mix(uSkyHor, uSkyTop, h);
  }
  vec3 col = mix(body, refl, clamp(fres + .05, 0., 1.));
  // the moon's and sun's specular: narrow disc, widened only by the waves
  float moon = pow(max(dot(R, uMoonDir), 0.), 1800.) * 14.;
  float sun = pow(max(dot(R, uSunDir), 0.), 900.) * 10.;
  col += uMoonCol * moon + uSunCol * sun;
  gl_FragColor = vec4(col, uOpacity + (1. - uOpacity) * clamp(fres * 1.1 + moon + sun, 0., 1.));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export class PondWater {
  constructor({ renderer, radius = 6, res = 256, center = [0, 0], y = 0, sky = null, breeze = 0.35, reflectRes = 768, deep = 0x0d2a36, shallow = 0x3f6a6a, rect = null, opacity = 1 }) {
    this.renderer = renderer; this.res = res; this.sky = sky; this.y = y; this.radius = radius; this.center = new THREE.Vector2(...center);
    const size = rect ? Math.max(rect[0], rect[1]) : radius * 2;
    this.size = size;
    this.a = new Float32Array(res * res); this.b = new Float32Array(res * res);
    this.tex = new THREE.DataTexture(this.a, res, res, THREE.RedFormat, THREE.FloatType);
    this.tex.minFilter = this.tex.magFilter = THREE.NearestFilter;
    this.tex.needsUpdate = true;
    this.mask = new Uint8Array(res * res);
    for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
      const u = (i + 0.5) / res - 0.5, v = (j + 0.5) / res - 0.5;
      const inside = rect ? Math.abs(u) * size < rect[0] / 2 && Math.abs(v) * size < rect[1] / 2 : Math.hypot(u, v) * size < radius * 0.995;
      this.mask[j * res + i] = inside ? 1 : 0;
    }
    this.rt = new THREE.WebGLRenderTarget(reflectRes, reflectRes, { type: THREE.HalfFloatType, depthBuffer: true });
    this.rcam = new THREE.PerspectiveCamera();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y);
    const U = this.U = Object.assign(THREE.UniformsUtils.merge([THREE.UniformsLib.fog]), {
      tH: { value: this.tex }, tRefl: { value: this.rt.texture }, uReflVP: { value: new THREE.Matrix4() }, uCam: { value: new THREE.Vector3() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color() }, uMoonDir: { value: new THREE.Vector3(0, 1, 0) }, uMoonCol: { value: new THREE.Color(0xdfeaff) },
      uDeep: { value: new THREE.Color(deep) }, uShallow: { value: new THREE.Color(shallow) }, uSkyTop: { value: new THREE.Color(0x4a6a9e) }, uSkyHor: { value: new THREE.Color(0xffc98a) },
      uCenter: { value: this.center }, uTexel: { value: 1 / res }, uSize: { value: size }, uScale: { value: 54 }, uTime: { value: 0 }, uBreeze: { value: breeze }, uRadius: { value: radius }, uHasRefl: { value: 1 }, uLit: { value: 1 }, uHeightGain: { value: 1 }, uOpacity: { value: opacity }
    });
    this.opacity = opacity;
    const geo = rect ? new THREE.PlaneGeometry(rect[0], rect[1], 1, 1).rotateX(-Math.PI / 2) : new THREE.CircleGeometry(radius, 96).rotateX(-Math.PI / 2);
    this.mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VS, fragmentShader: FS, fog: true, transparent: opacity < 1, depthWrite: opacity >= 1 });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.position.set(center[0], y, center[1]);
    this.mesh.name = 'Water';
    this.acc = 0;
    this.hide = [];
  }

  /** A disturbance at a world position: strength is in metres of displacement. */
  drop(wx, wz, strength = 0.14, r = 3) {
    const { res, size, center, a } = this;
    const ci = Math.round((((wx - center.x) / size) + 0.5) * res), cj = Math.round((((wz - center.y) / size) + 0.5) * res);
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      const x = ci + i, y = cj + j;
      if (x < 1 || y < 1 || x >= res - 1 || y >= res - 1 || !this.mask[y * res + x]) continue;
      const d = Math.hypot(i, j) / r;
      if (d <= 1) a[y * res + x] += strength * (0.5 + 0.5 * Math.cos(d * Math.PI));
    }
  }

  /** Water height at a world position (for floating things). */
  sample(wx, wz) {
    const { res, size, center, a } = this;
    const i = clamp(Math.round((((wx - center.x) / size) + 0.5) * res), 0, res - 1), j = clamp(Math.round((((wz - center.y) / size) + 0.5) * res), 0, res - 1);
    return a[j * res + i];
  }
  slope(wx, wz) {
    const e = this.size / this.res * 2;
    return [(this.sample(wx - e, wz) - this.sample(wx + e, wz)) / (2 * e), (this.sample(wx, wz - e) - this.sample(wx, wz + e)) / (2 * e)];
  }

  _step() {
    const { res: n, a, b, mask } = this;
    for (let j = 1; j < n - 1; j++) {
      for (let i = 1; i < n - 1; i++) {
        const k = j * n + i;
        if (!mask[k]) { b[k] = 0; continue; }
        b[k] = ((a[k - 1] + a[k + 1] + a[k - n] + a[k + n]) * 0.5 - b[k]) * 0.986;
      }
    }
    this.a = b; this.b = a;
    this.tex.image.data = this.a;
  }

  update(dt, t) {
    this.acc = Math.min(this.acc + dt, 0.08);
    let stepped = false;
    while (this.acc >= 1 / 60) { this._step(); this.acc -= 1 / 60; stepped = true; }
    if (stepped) this.tex.needsUpdate = true;
    this.U.uTime.value = t;
  }

  /** Feed sky colours and sun or moon direction; call before rendering. */
  feed(sky, moonDir) {
    const p = sky.resolvePalette(), U = this.U, up = Math.max(0, sky.sunDir.y);
    U.uSkyTop.value.copy(p.top); U.uSkyHor.value.copy(p.horizon);
    U.uSunDir.value.copy(sky.sunDir); U.uSunCol.value.copy(p.sun).multiplyScalar(up > 0 ? 1 : 0);
    if (moonDir) U.uMoonDir.value.copy(moonDir);
    U.uMoonCol.value.setRGB(0.86, 0.9, 1).multiplyScalar(clamp(-sky.sunDir.y * 6, 0, 1));
    U.uLit.value = 0.15 + clamp(up * 2, 0, 1) * 0.85;
  }

  /** Draw the mirrored scene. */
  reflect(renderer, scene, camera) {
    const rc = this.rcam, y = this.y;
    rc.copy(camera);
    rc.position.y = 2 * y - camera.position.y;
    const d = camera.getWorldDirection(_d);
    _t.copy(rc.position).add(_d2.set(d.x, -d.y, d.z));
    rc.up.set(0, 1, 0);
    rc.lookAt(_t);
    rc.updateMatrixWorld(true);
    this.U.uCam.value.copy(camera.position);
    _vp.multiplyMatrices(rc.projectionMatrix, rc.matrixWorldInverse);
    this.U.uReflVP.value.copy(_vp);
    const was = [];
    this.mesh.visible = false;
    for (const o of this.hide) { was.push(o.visible); o.visible = false; }
    const clip = renderer.clippingPlanes, target = renderer.getRenderTarget();
    const sh = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    renderer.clippingPlanes = [this.plane];
    renderer.setRenderTarget(this.rt);
    renderer.clear();
    renderer.render(scene, rc);
    renderer.setRenderTarget(target);
    renderer.clippingPlanes = clip;
    renderer.shadowMap.autoUpdate = sh;
    this.mesh.visible = true;
    this.hide.forEach((o, i) => { o.visible = was[i]; });
  }
}
const _d = new THREE.Vector3(), _d2 = new THREE.Vector3(), _t = new THREE.Vector3(), _vp = new THREE.Matrix4();

/** A moon disc with a real terminator. phase 0 = new, 0.5 = full, 1 = new. */
export function moonTexture(phase = 0.5, size = 256) {
  const [c, x] = canvas2d(size, size);
  const r = size * 0.46, m = size / 2;
  const g = x.createRadialGradient(m - r * 0.2, m - r * 0.25, r * 0.1, m, m, r);
  g.addColorStop(0, '#fffdf2'); g.addColorStop(0.75, '#e6e7da'); g.addColorStop(1, '#bfc4c4');
  x.fillStyle = g; x.beginPath(); x.arc(m, m, r, 0, TAU); x.fill();
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = 'rgba(140,145,150,.55)';
  for (const [a, b, s] of [[0.1, -0.2, 0.2], [-0.25, 0.05, 0.28], [0.3, 0.3, 0.15], [-0.05, 0.42, 0.17], [-0.42, -0.3, 0.13]]) { x.beginPath(); x.arc(m + a * r, m + b * r, s * r, 0, TAU); x.fill(); }
  x.globalCompositeOperation = 'destination-out';
  // the shadow: outer half-circle joined to an ellipse that sets the phase
  const k = Math.cos(phase * TAU);
  x.fillStyle = '#000';
  x.beginPath();
  x.arc(m, m, r + 2, -Math.PI / 2, Math.PI / 2, phase < 0.5);
  x.ellipse(m, m, Math.abs(k) * (r + 2), r + 2, 0, Math.PI / 2, -Math.PI / 2, (phase < 0.25 || (phase > 0.5 && phase < 0.75)));
  x.fill();
  x.globalCompositeOperation = 'source-over';
  return canvasTexture(c, { srgb: true, aniso: 2 });
}
