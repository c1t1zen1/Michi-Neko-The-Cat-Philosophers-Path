// Rain state (wetness, water level), rain streaks and eave drips.
import * as THREE from 'three';
import { hash2i } from './hash.js';
import { addRipple } from './material.js';

const clamp = THREE.MathUtils.clamp;

export class Weather {
  constructor() { this.rain = 0; this.target = 0; this.wet = 0; this.water = -0.06; }
  setRain(v) { this.target = clamp(v, 0, 1); }
  update(dt) {
    this.rain += (this.target - this.rain) * Math.min(1, dt * 1.5);
    const raining = this.rain > 0.05, goal = raining ? Math.min(1, this.rain * 1.25) : 0;
    this.wet = goal > this.wet ? Math.min(goal, this.wet + dt / 6) : Math.max(goal, this.wet - dt / 40);
    if (this.rain >= 0.1) this.water += 0.004 * this.rain * dt; else this.water -= 0.0008 * dt;
    this.water = clamp(this.water, -0.06, 0.012);
  }
  reset() { this.rain = this.target = this.wet = 0; this.water = -0.06; }
  bind(mat, terrain, t) {
    const u = mat.userData.u;
    u.uWet.value = Math.max(this.wet, terrain.wetFloor);
    u.uWater.value = this.water + terrain.waterBias;
    u.uRain.value = this.rain; u.uTime.value = t;
  }
}

export class RainStreaks {
  constructor(size, palette, n = 900, height = 7) {
    this.n = n;
    const g = new THREE.InstancedBufferGeometry();
    g.copy(new THREE.PlaneGeometry(1, 1));
    const a = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { const h = hash2i(i, 41), k = hash2i(i, 42); a.set([h[0], h[1], k[0], 0.8 + 0.4 * k[1]], i * 4); }
    g.setAttribute('aR', new THREE.InstancedBufferAttribute(a, 4));
    g.instanceCount = 0;
    this.u = { uTime: { value: 0 }, uSize: { value: size }, uH: { value: height }, uCol: { value: palette.horizon }, uA: { value: 0.16 } };
    this.mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({
      uniforms: this.u, transparent: true, depthWrite: false, fog: false,
      vertexShader: `attribute vec4 aR; uniform float uTime, uSize, uH; void main() {
        float y = uH - mod(uTime * aR.w * 9. + aR.z * uH, uH);
        vec3 c = vec3((aR.x - .5) * uSize, y, (aR.y - .5) * uSize), tc = cameraPosition - c;
        vec3 r = normalize(cross(vec3(0., 1., 0.), vec3(tc.x, 0., tc.z) + 1e-4));
        vec3 p = c + r * position.x * .007 + vec3(.05, 1., 0.) * position.y * .4;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.); }`,
      fragmentShader: 'uniform vec3 uCol; uniform float uA; void main() { gl_FragColor = vec4(uCol * 1.3 + .1, uA); }'
    }));
    this.mesh.frustumCulled = false;
  }
  update(t, rain) { this.u.uTime.value = t; this.mesh.geometry.instanceCount = Math.floor(this.n * clamp(rain, 0, 1) ** 1.2); this.mesh.visible = rain > 0.02; }
}

export class EaveDrips {
  constructor(mat, prints, { x0, x1, z, y = 2.2, spacing = 0.25 }) {
    this.mat = mat; this.prints = prints; this.y0 = y;
    this.drops = [];
    for (let x = x0 + spacing / 2, i = 0; x < x1; x += spacing, i++) { const h = hash2i(i, 5); this.drops.push({ x: x + (h[0] - 0.5) * 0.06, z, T: 0.9 + h[1] * 0.8, p: hash2i(i, 6)[0], cyc: -1, landed: true }); }
    this.mesh = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.012, 0.07, 2, 6), new THREE.MeshBasicMaterial({ color: 0xcfe6f2, transparent: true, opacity: 0.7 }), this.drops.length);
    this.mesh.frustumCulled = false; this.mesh.count = 0;
    this.m = new THREE.Matrix4(); this.fall = Math.sqrt(2 * y / 9.8);
  }
  update(t, rain, groundY = 0) {
    if (rain < 0.05) { this.mesh.count = 0; return; }
    this.mesh.count = this.drops.length;
    this.drops.forEach((d, i) => {
      const u = t / d.T + d.p, cyc = Math.floor(u), age = (u - cyc) * d.T;
      if (cyc !== d.cyc) { d.cyc = cyc; d.landed = false; }
      if (age < this.fall) this.m.makeTranslation(d.x, this.y0 - 4.9 * age * age, d.z);
      else {
        this.m.makeScale(0, 0, 0);
        if (!d.landed) { d.landed = true; addRipple(this.mat, d.x, d.z, 1); if (this.prints) this.prints.stamp(d.x, d.z, 0, 0.09, 1, 0, 1); }
      }
      this.mesh.setMatrixAt(i, this.m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
