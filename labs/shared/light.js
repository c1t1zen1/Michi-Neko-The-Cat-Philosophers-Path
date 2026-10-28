// A reusable time-of-day light rig: sun, moon, hemisphere, fog and a gradient
// sky dome, all driven by one hour value (0..24).
import * as THREE from 'three';

const K = (hour, elev, sun, sunI, skyTop, horizon, hemiSky, hemiGround, hemiI, envI) => ({ hour, elev, sun, sunI, skyTop, horizon, hemiSky, hemiGround, hemiI, envI });
export const HOURS = [
  K(5.0, -8, 0x5a6aa0, 0.0, 0x1b2546, 0x6a6a90, 0x2e3a66, 0x1a1a22, 0.25, 0.15),
  K(6.5, 6, 0xffb88a, 1.2, 0x6d8fc4, 0xf7c6a0, 0x9fb5d8, 0x5a4a3a, 0.55, 0.5),
  K(9.0, 35, 0xfff0d6, 2.2, 0x6fa6dc, 0xd4e6f2, 0xb9d4f0, 0x6b6a48, 0.9, 0.9),
  K(12.0, 62, 0xfff6e6, 2.5, 0x5d9ad8, 0xd9e9f5, 0xc2dcf4, 0x6f6d4a, 1.0, 1),
  K(16.0, 32, 0xffe2b0, 2.2, 0x6b9fd4, 0xf0dcc0, 0xbcd0e6, 0x6e5f44, 0.85, 0.9),
  K(18.0, 8, 0xffa860, 2.0, 0x6a7fb6, 0xffb27a, 0xc8a89a, 0x5a4434, 0.6, 0.6),
  K(19.5, -4, 0xff8a5a, 0.25, 0x2c3462, 0xc77a6a, 0x4a4a78, 0x2a2228, 0.35, 0.3),
  K(22.0, -30, 0x000000, 0, 0x0b1226, 0x26304e, 0x24305a, 0x12121a, 0.22, 0.12)
];
const COLS = ['sun', 'skyTop', 'horizon', 'hemiSky', 'hemiGround'];
const _a = new THREE.Color(), _b = new THREE.Color();

const DOME_VS = /* glsl */`
varying vec3 vDir;
void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const DOME_FS = /* glsl */`
uniform vec3 uTop, uHorizon, uBelow, uSunCol, uSunDir;
uniform float uGlow;
varying vec3 vDir;
void main() {
  float h = vDir.y;
  vec3 c = mix(uHorizon, uTop, pow(clamp(h, 0., 1.), 0.55));
  c = mix(c, uBelow, smoothstep(0., -0.35, h));
  float s = max(dot(normalize(vDir), uSunDir), 0.);
  c += uSunCol * (pow(s, 18.) * 0.35 + pow(s, 300.) * 1.4) * uGlow;
  gl_FragColor = vec4(c, 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class LightRig {
  constructor(scene, { hour = 10.5, shadows = false, shadowSize = 12, sky = true, fog = true, background = true } = {}) {
    this.background = background;
    this.scene = scene;
    this.sunDir = new THREE.Vector3(0, 1, 0);
    this.palette = { sun: new THREE.Color(), skyTop: new THREE.Color(), horizon: new THREE.Color(), ground: new THREE.Color(), fog: new THREE.Color() };
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    this.sun = new THREE.DirectionalLight(0xffffff, 1);
    this.moon = new THREE.DirectionalLight(0x9fb4e8, 0);
    this.sun.castShadow = shadows;
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -shadowSize; sc.right = sc.top = shadowSize; sc.near = 1; sc.far = 140;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    scene.add(this.hemi, this.sun, this.sun.target, this.moon, this.moon.target);
    if (fog) scene.fog = new THREE.FogExp2(0xffffff, 0.012);
    if (sky) {
      this.dome = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({
        vertexShader: DOME_VS, fragmentShader: DOME_FS, side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: {
          uTop: { value: this.palette.skyTop }, uHorizon: { value: this.palette.horizon }, uBelow: { value: new THREE.Color() },
          uSunCol: { value: this.palette.sun }, uSunDir: { value: this.sunDir }, uGlow: { value: 1 }
        }
      }));
      this.dome.frustumCulled = false;
      this.dome.renderOrder = -10;
      scene.add(this.dome);
    }
    this.setHour(hour);
  }

  setHour(h) {
    h = ((h % 24) + 24) % 24;
    this.hour = h;
    let i = HOURS.length - 1;
    while (i > 0 && HOURS[i].hour > (h < HOURS[0].hour ? h + 24 : h)) i--;
    const k0 = HOURS[i], k1 = HOURS[(i + 1) % HOURS.length];
    const e0 = k0.hour, e1 = k1.hour + (k1.hour <= k0.hour ? 24 : 0);
    const hh = h < HOURS[0].hour ? h + 24 : h;
    const f = Math.min(1, Math.max(0, (hh - e0) / (e1 - e0)));
    const L = (a, b) => a + (b - a) * f;
    const col = (name, out) => out.copy(_a.set(k0[name])).lerp(_b.set(k1[name]), f);
    const P = this.palette;
    col('sun', P.sun); col('skyTop', P.skyTop); col('horizon', P.horizon);
    const hemiSky = col('hemiSky', new THREE.Color());
    col('hemiGround', P.ground);
    P.fog.copy(P.horizon).lerp(hemiSky, 0.35);

    const elev = L(k0.elev, k1.elev);
    const el = THREE.MathUtils.degToRad(elev), az = ((h - 6) / 12) * Math.PI;
    this.sunDir.set(Math.cos(az) * Math.cos(el), Math.sin(el), -Math.sin(az) * Math.cos(el)).normalize();
    this.sun.position.copy(this.sunDir).multiplyScalar(60);
    this.sun.color.copy(P.sun);
    this.sun.intensity = L(k0.sunI, k1.sunI);
    this.moon.position.set(-this.sunDir.x, Math.max(0.3, -this.sunDir.y), -this.sunDir.z).normalize().multiplyScalar(60);
    this.moon.intensity = 0.35 * THREE.MathUtils.clamp((-2 - elev) / 6, 0, 1);
    this.hemi.color.copy(hemiSky);
    this.hemi.groundColor.copy(P.ground);
    this.hemi.intensity = L(k0.hemiI, k1.hemiI);
    this.envIntensity = L(k0.envI, k1.envI);
    this.applyEnv();
    if (this.scene.fog) this.scene.fog.color.copy(P.fog);
    if (this.dome) {
      this.dome.material.uniforms.uBelow.value.copy(P.horizon).multiplyScalar(0.7);
      this.dome.material.uniforms.uGlow.value = THREE.MathUtils.clamp((elev + 6) / 10, 0, 1);
    } else if (this.background) this.scene.background = P.horizon;
  }

  applyEnv() {
    this.scene.traverse((o) => {
      for (const m of [].concat(o.material || [])) {
        if (m.isMeshStandardMaterial) m.envMapIntensity = (m.userData.env0 ??= m.envMapIntensity) * this.envIntensity;
      }
    });
  }

  update() { /* uniforms share the palette colours, so nothing to copy */ }
}
