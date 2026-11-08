// Every gap in a canopy is a pinhole, and every coin of light on the ground is
// a picture of the sun. So the coins can be drawn as exactly that.
import * as THREE from 'three';
import { TAU, rng } from '../../shared/craft.js';

const VS = /* glsl */`
attribute vec4 aGap;   // x, z, gap height, seed
varying vec2 vP; varying float vSeed; varying float vLit;
uniform float uTime, uWind, uTan, uSinEl, uOpen, uGain; uniform vec2 uSunXZ; uniform vec3 uSunDir;
void main() {
  vSeed = aGap.w; vP = position.xz;
  float h = aGap.z;
  // the gap moves as the leaves do
  float s = aGap.w * 6.28;
  vec2 sway = vec2(sin(uTime * (.8 + aGap.w * .9) + s) + .4 * sin(uTime * 2.3 + s * 3.), cos(uTime * (.7 + aGap.w * .7) + s * 1.7)) * uWind * (.05 + aGap.w * .08);
  // light travels from the gap to the ground along the sun's direction
  vec2 foot = aGap.xy + sway + uSunXZ * h;
  float flick = .75 + .25 * sin(uTime * (1.2 + aGap.w * 2.) + s * 2.);
  vLit = step(aGap.w, uOpen) * flick;
  // the image of the sun: diameter h·tan(0.53°), stretched along the sun by 1/sin(el)
  float R = (h * uTan) * (.55 + aGap.w * 1.15);
  vec2 dir = uSunXZ / max(length(uSunXZ), 1e-3);
  vec2 local = position.xz * R;
  vec2 stretched = dir * local.x / max(uSinEl, .2) + vec2(-dir.y, dir.x) * local.y;
  vec4 wp = vec4(foot.x + stretched.x, .018, foot.y + stretched.y, 1.);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const FS = /* glsl */`
precision highp float;
varying vec2 vP; varying float vSeed; varying float vLit;
uniform float uEclipse, uSharp, uMoonAng, uGain; uniform vec3 uCol;
void main() {
  if (vLit <= .001) discard;
  vec2 p = vP * 1.24;
  float soft = mix(.16, .03, uSharp);
  float d = length(p);
  float disc = smoothstep(1. + soft, 1. - soft, d);
  // the moon: another disc of the same size, offset toward the opposite side of the image
  float e = clamp(uEclipse, 0., 1.);
  vec2 mo = vec2(cos(uMoonAng), sin(uMoonAng)) * 2. * (1. - e);
  float moon = smoothstep(1.05 - soft, 1.05 + soft, length(p - mo));
  float v = disc * moon;
  if (v <= .002) discard;
  gl_FragColor = vec4(uCol * uGain * v * vLit, v * vLit);
  #include <colorspace_fragment>
}`;

export function makeCoins({ count = 1800, spread = 11, heightMin = 5, heightMax = 9, seed = 5, gaps = null } = {}) {
  const r = rng(seed), attr = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    let x = 0, z = 0;
    if (gaps) { const g = gaps[i % gaps.length]; x = g[0] + (r() - 0.5) * g[2]; z = g[1] + (r() - 0.5) * g[2]; }
    else {
      // rejection-sample into loose clumps, so light gathers where the canopy thins
      for (let t = 0; t < 12; t++) { const a = r() * TAU, d = Math.sqrt(r()) * spread; x = Math.cos(a) * d; z = Math.sin(a) * d; if (Math.sin(x * 0.7 + 1.3) * Math.cos(z * 0.6 + 0.4) + Math.sin(x * 1.7 - z * 1.1) * 0.5 > 0.0) break; }
    }
    attr[i * 4] = x; attr[i * 4 + 1] = z; attr[i * 4 + 2] = heightMin + r() * (heightMax - heightMin); attr[i * 4 + 3] = r();
  }
  const geo = new THREE.InstancedBufferGeometry();
  const plane = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
  geo.index = plane.index; geo.setAttribute('position', plane.attributes.position);
  geo.setAttribute('aGap', new THREE.InstancedBufferAttribute(attr, 4));
  geo.instanceCount = count;
  const U = { uTime: { value: 0 }, uWind: { value: 0.6 }, uTan: { value: Math.tan(0.53 * Math.PI / 180) * 1.7 }, uSinEl: { value: 0.7 }, uOpen: { value: 0.75 }, uGain: { value: 0.72 }, uSunXZ: { value: new THREE.Vector2() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uEclipse: { value: 0 }, uSharp: { value: 0.3 }, uMoonAng: { value: 2.4 }, uCol: { value: new THREE.Color(1, 0.92, 0.72) } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = 2; m.name = 'Sun coins';
  return {
    mesh: m, U,
    feed(sky, t, wind) {
      U.uTime.value = t; U.uWind.value = wind;
      const sd = sky.sunDir, el = Math.max(0.05, sd.y);
      U.uSunXZ.value.set(sd.x, sd.z).multiplyScalar(-1 / Math.max(sd.y, 0.2));   // from gap to ground, away from the sun
      U.uSinEl.value = el;
      const p = sky.resolvePalette();
      U.uCol.value.copy(p.sun).multiplyScalar(Math.min(1, el * 3));
    }
  };
}
