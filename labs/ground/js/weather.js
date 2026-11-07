// Weather on the ground. One schedule drives everything the shader reads:
//   wet     diffuse darkening (porous ground drinks, then dries slowly)
//   wetSpec the shine of a water film (goes first when the rain stops; Lagarde)
//   water   the puddle level in metres: it rises in the rain, fills the ditch,
//           then the ruts, then the low spots, and drains as the ground drinks
//   snow    how deep the snow cover reads (melts faster in sun)
// Plus the particles: rain streaks and splashes (all on the GPU), snowfall,
// and the ladle of uchimizu, whose droplets wet the field where they land.
import * as THREE from 'three';
import { sstep, clamp } from './util.js';

export const SKIES = { clear: 'Clear', drops: 'First drops', rain: 'Rain', after: 'After the rain', snow: 'Snow' };

export class Weather {
  constructor() {
    this.mode = 'clear';
    this.rain = 0; this.wet = 0; this.wetSpec = 0; this.water = -0.3; this.snow = 0; this.snowFall = 0;
    this.dryTime = 90;         // seconds to dry after rain (shortened in the fast-forward)
  }
  set(mode) {
    this.mode = mode;
    if (mode === 'after') { this.rain = 0; this.wet = Math.max(this.wet, 0.95); this.wetSpec = Math.max(this.wetSpec, 0.9); this.water = Math.max(this.water, -0.03); }
    if (mode === 'clear') { /* dries on its own */ }
  }
  update(dt, { sun = 1, speed = 1 } = {}) {
    const d = dt * speed, m = this.mode;
    const rainT = m === 'rain' ? 1 : m === 'drops' ? 0.25 : 0;
    this.rain += (rainT - this.rain) * Math.min(1, d * 0.6);
    const snowT = m === 'snow' ? 1 : 0;
    this.snowFall += (snowT - this.snowFall) * Math.min(1, d * 0.5);
    if (this.rain > 0.02) {
      this.wet = Math.min(1, this.wet + d * this.rain / (m === 'drops' ? 30 : 9));
      this.wetSpec = Math.min(1, this.wetSpec + d * this.rain / 5);
      this.water = Math.min(-0.028, this.water + d * this.rain * 0.0045);
    } else {
      const k = (0.55 + sun * 0.9) / this.dryTime;
      this.wetSpec = Math.max(0, this.wetSpec - d * k * 1.9);
      this.wet = Math.max(0, this.wet - d * k * (0.4 + this.wet * 0.8));
      this.water = Math.max(-0.3, this.water - d * (0.0004 + 0.0011 * sun));
    }
    if (this.snowFall > 0.05) this.snow = Math.min(1, this.snow + d * this.snowFall / 35);
    else this.snow = Math.max(0, this.snow - d * (0.004 + 0.02 * sun) * (this.rain > 0.1 ? 4 : 1));
    if (m === 'snow') this.wet = Math.max(0, this.wet - d * 0.01);
  }
  apply(U) {
    U.uWet.value = this.wet; U.uWetSpec.value = this.wetSpec; U.uWater.value = this.water;
    U.uRain.value = this.rain; U.uSnow.value = this.snow;
  }
}

/* ---------------- rain: streaks and splashes, placed and timed in the shader ---------------- */

const RAIN_VS = /* glsl */`
uniform float uTime, uAmt, uTop;
uniform vec4 uBox;   // x0, z0, w, d
uniform vec2 uWind;
attribute vec3 aSeed;
varying float vA;
float hh(float n) { return fract(sin(n) * 43758.5453); }
void main() {
  float id = aSeed.x;
  float speed = 7.5 + hh(id * 1.7) * 2.5;
  float t = uTime * speed / uTop + hh(id * 3.1);
  float cyc = floor(t), ph = fract(t);
  vec2 xz = uBox.xy + vec2(hh(id * 7.3 + cyc * 1.3), hh(id * 9.1 + cyc * 2.7)) * uBox.zw;
  float y = uTop * (1. - ph);
  vec3 p = vec3(xz.x, y, xz.y) + vec3(uWind.x, 0., uWind.y) * (1. - ph) * 1.2;
  vec3 dir = normalize(vec3(uWind.x * .18, -1., uWind.y * .18));
  p += dir * position.y * .32;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  vec3 side = normalize(cross((viewMatrix * vec4(dir, 0.)).xyz, vec3(0., 0., 1.)));
  mv.xyz += side * position.x * .006;
  vA = step(hh(id * 5.3), uAmt) * (.3 + .4 * hh(id * 2.2));
  gl_Position = projectionMatrix * mv;
}`;
const RAIN_FS = /* glsl */`
uniform vec3 uCol;
varying float vA;
void main() { if (vA < .01) discard; gl_FragColor = vec4(uCol, vA * .55); }`;

const SPLASH_VS = /* glsl */`
uniform float uTime, uAmt;
uniform vec4 uBox;
attribute float aId;
varying vec2 vQ; varying float vF;
float hh(float n) { return fract(sin(n) * 43758.5453); }
void main() {
  float t = uTime * (2.2 + hh(aId) * .8) + hh(aId * 3.7);
  float cyc = floor(t), ph = fract(t);
  vec2 xz = uBox.xy + vec2(hh(aId * 7.3 + cyc * 1.9), hh(aId * 4.1 + cyc * 3.3)) * uBox.zw;
  float s = .02 + ph * .07;
  vQ = position.xy;
  vF = (1. - ph) * step(hh(aId * 1.1), uAmt);
  vec4 mv = modelViewMatrix * vec4(xz.x, .012 + ph * .02, xz.y, 1.);
  mv.xy += position.xy * s;
  gl_Position = projectionMatrix * mv;
}`;
const SPLASH_FS = /* glsl */`
uniform vec3 uCol;
varying vec2 vQ; varying float vF;
void main() {
  float r = length(vQ);
  float ring = smoothstep(.5, .4, r) * smoothstep(.25, .4, r);
  if (ring * vF < .02) discard;
  gl_FragColor = vec4(uCol, ring * vF * .7);
}`;

export class Rain {
  constructor(box, n = 2600) {
    const quad = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = quad.index; g.setAttribute('position', quad.attributes.position);
    const seeds = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) seeds[i * 3] = i + 1;
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 3));
    g.instanceCount = n;
    this.U = { uTime: { value: 0 }, uAmt: { value: 0 }, uTop: { value: 7 }, uBox: { value: new THREE.Vector4(box.x0, box.z0, box.w, box.d) }, uWind: { value: new THREE.Vector2(0.6, 0.25) }, uCol: { value: new THREE.Color(0xc9d6e2) } };
    this.mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: this.U, vertexShader: RAIN_VS, fragmentShader: RAIN_FS, transparent: true, depthWrite: false }));
    this.mesh.frustumCulled = false;
    this.mesh.name = 'Rain';
    const sg = new THREE.InstancedBufferGeometry();
    sg.index = quad.index; sg.setAttribute('position', quad.attributes.position);
    const ids = new Float32Array(900);
    for (let i = 0; i < ids.length; i++) ids[i] = i + 1;
    sg.setAttribute('aId', new THREE.InstancedBufferAttribute(ids, 1));
    sg.instanceCount = ids.length;
    this.splash = new THREE.Mesh(sg, new THREE.ShaderMaterial({ uniforms: this.U, vertexShader: SPLASH_VS, fragmentShader: SPLASH_FS, transparent: true, depthWrite: false }));
    this.splash.frustumCulled = false;
    this.splash.name = 'Rain splashes';
    this.group = new THREE.Group();
    this.group.add(this.mesh, this.splash);
  }
  update(dt, amount, sky) {
    this.U.uTime.value += dt;
    this.U.uAmt.value = amount;
    this.group.visible = amount > 0.01;
    if (sky) this.U.uCol.value.copy(sky).lerp(new THREE.Color(1, 1, 1), 0.4);
  }
}

/* ---------------- snowfall ---------------- */

const SNOW_VS = /* glsl */`
uniform float uTime, uAmt, uTop;
uniform vec4 uBox;
attribute float aId;
varying float vA;
float hh(float n) { return fract(sin(n) * 43758.5453); }
void main() {
  float speed = .55 + hh(aId) * .4;
  float t = uTime * speed / uTop + hh(aId * 3.1);
  float cyc = floor(t), ph = fract(t);
  vec2 xz = uBox.xy + vec2(hh(aId * 7.3 + cyc), hh(aId * 9.1 + cyc * 2.)) * uBox.zw;
  xz += vec2(sin(uTime * .9 + aId) * .25, cos(uTime * .7 + aId * 1.3) * .2);
  vec4 mv = modelViewMatrix * vec4(xz.x, uTop * (1. - ph), xz.y, 1.);
  vA = step(hh(aId * 5.3), uAmt);
  gl_PointSize = (1. + hh(aId * 1.9) * 2.2) * (26. / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const SNOW_FS = /* glsl */`
varying float vA;
void main() { float r = length(gl_PointCoord - .5); if (r > .5 || vA < .5) discard; gl_FragColor = vec4(1., 1., 1., smoothstep(.5, .15, r) * .75); }`;

export class Snow {
  constructor(box, n = 3000) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
    const ids = new Float32Array(n);
    for (let i = 0; i < n; i++) ids[i] = i + 1;
    g.setAttribute('aId', new THREE.Float32BufferAttribute(ids, 1));
    this.U = { uTime: { value: 0 }, uAmt: { value: 0 }, uTop: { value: 7 }, uBox: { value: new THREE.Vector4(box.x0, box.z0, box.w, box.d) } };
    this.mesh = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: this.U, vertexShader: SNOW_VS, fragmentShader: SNOW_FS, transparent: true, depthWrite: false }));
    this.mesh.frustumCulled = false;
    this.mesh.name = 'Snowfall';
  }
  update(dt, amount) { this.U.uTime.value += dt; this.U.uAmt.value = amount; this.mesh.visible = amount > 0.01; }
}

/* ---------------- uchimizu: a ladle of water thrown in a fan ---------------- */

export class Ladle {
  constructor(n = 600) {
    this.n = n;
    this.drops = [];
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 3);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setDrawRange(0, 0);
    this.mesh = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdfeef4, size: 0.035, transparent: true, opacity: 0.8, depthWrite: false }));
    this.mesh.frustumCulled = false;
    this.mesh.name = 'Uchimizu drops';
  }
  /** throw from (x, z) toward heading `a`: a fan of droplets from about knee height */
  throw(x, z, a, rnd = Math.random) {
    for (let i = 0; i < 70 && this.drops.length < this.n; i++) {
      const spread = (rnd() - 0.5) * 1.3, v = 2.2 + rnd() * 2.3;
      const d = a + spread;
      this.drops.push({ x: x - Math.cos(a) * 0.7, y: 0.7 + rnd() * 0.15, z: z - Math.sin(a) * 0.7, vx: Math.cos(d) * v, vy: 1.2 + rnd() * 1.4, vz: Math.sin(d) * v, size: 0.05 + rnd() * 0.07 });
    }
  }
  /** advance; calls land(x, z, size) where a drop meets the ground */
  update(dt, groundAt, land) {
    const D = this.drops;
    for (let i = D.length - 1; i >= 0; i--) {
      const d = D[i];
      d.vy -= 9.8 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
      if (d.y <= groundAt(d.x, d.z)) { land(d.x, d.z, d.size); D.splice(i, 1); }
    }
    for (let i = 0; i < D.length; i++) { this.pos[i * 3] = D[i].x; this.pos[i * 3 + 1] = D[i].y; this.pos[i * 3 + 2] = D[i].z; }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.setDrawRange(0, D.length);
  }
}

/** sun exposure for drying: 1 in full sun, less at dawn/dusk and in the leaf shade */
export function sunFactor(sunDir) { return clamp(sstep(-0.05, 0.45, sunDir.y), 0, 1); }
