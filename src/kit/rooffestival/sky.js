// roof-sky: the dome, the clouds and the moon of rooftops/js/sky.js (the lights, fog and the route-progress
// phase stay in Sky). Same uniforms (uTop, uHor, uSunDir, uSunCol, uNight) and the same cloud/moon records
// Sky.setPhase/update drive: this adds a horizon haze band, a sun halo, two star layers and cloud sprites with
// more lobes and a lit upper rim; the moon gets maria and a soft limb.
import { defineAsset } from '../contract.js?v=20261114a';
import { hashCloud, canvas, canvasTex, disposeTree } from './fx.js?v=20261114a';

const DOME = { hero: [48, 24], mid: [32, 16], far: [20, 10] };
const CLOUDS = { hero: 13, mid: 6, far: 1 };

function cloudTexture(T, seed, w) {
  const [c, g] = canvas(w, w / 2), k = w / 256;
  const grad = g.createLinearGradient(0, 20 * k, 0, 112 * k);
  grad.addColorStop(0, 'rgba(255,253,244,.98)');
  grad.addColorStop(0.58, 'rgba(244,233,216,.86)');
  grad.addColorStop(1, 'rgba(143,157,170,0)');
  g.fillStyle = grad;
  g.filter = `blur(${2 * k}px)`;
  for (let i = 0; i < 16; i++) {
    const x = (24 + hashCloud(seed + i * 3.1) * 208) * k, y = (56 + hashCloud(seed * 2 + i * 7.7) * 30) * k;
    const rx = (22 + hashCloud(seed + i * 5.2) * 34) * k, ry = (13 + hashCloud(seed + i * 9.3) * 19) * k;
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
  }
  g.globalCompositeOperation = 'source-atop';       // a pale lit rim on the upper edge
  const rim = g.createLinearGradient(0, 0, 0, 70 * k);
  rim.addColorStop(0, 'rgba(255,255,250,.5)'); rim.addColorStop(1, 'rgba(255,255,250,0)');
  g.fillStyle = rim; g.fillRect(0, 0, w, 70 * k);
  return canvasTex(c);
}

function moonTexture(T) {
  const [c, g] = canvas(128, 128);
  const glow = g.createRadialGradient(64, 64, 17, 64, 64, 63);
  glow.addColorStop(0, 'rgba(255,250,220,1)');
  glow.addColorStop(0.28, 'rgba(233,238,220,.95)');
  glow.addColorStop(0.43, 'rgba(190,205,220,.22)');
  glow.addColorStop(1, 'rgba(130,160,210,0)');
  g.fillStyle = glow; g.fillRect(0, 0, 128, 128);
  g.fillStyle = 'rgba(150,160,170,.28)';             // maria
  for (const [x, y, r] of [[54, 56, 8], [72, 52, 6], [62, 72, 9], [76, 70, 5]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  return canvasTex(c);
}

function buildSky(ctx, layout) {
  const T = ctx.THREE, tier = ctx.tier, group = new T.Group();
  const uniforms = {
    uTop: { value: new T.Color() }, uHor: { value: new T.Color() }, uSunDir: { value: new T.Vector3(0, 1, 0) },
    uSunCol: { value: new T.Color() }, uNight: { value: 0 }
  };
  const [ws, hs] = DOME[tier] || DOME.mid;
  const dome = new T.Mesh(new T.SphereGeometry(900, ws, hs), new T.ShaderMaterial({
    uniforms, side: T.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`,
    fragmentShader: `
      uniform vec3 uTop, uHor, uSunDir, uSunCol; uniform float uNight; varying vec3 vDir;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
      void main(){
        float y = clamp(vDir.y, -0.2, 1.0);
        vec3 col = mix(uHor, uTop, pow(smoothstep(-0.05, 0.75, y), 0.75));
        col = mix(col, uHor * 1.08, (1.0 - smoothstep(0.0, 0.16, y)) * 0.35);          // haze band on the horizon
        float sd = max(0.0, dot(normalize(vDir), normalize(uSunDir)));
        col += uSunCol * (pow(sd, 260.0) * 2.5 + pow(sd, 8.0) * 0.25 + pow(sd, 36.0) * 0.18) * (1.0 - uNight * 0.85);
        vec3 cell = floor(vDir * 220.0);
        float star = step(0.9975, h(cell)) * smoothstep(0.05, 0.35, y);
        vec3 cell2 = floor(vDir * 90.0);
        float big = step(0.9985, h(cell2 + 7.0)) * smoothstep(0.1, 0.4, y);              // fewer, brighter stars
        col += vec3(star * 0.9 + big * 1.4) * uNight;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  group.add(dome);

  const clouds = [], parts = { dome };
  const count = Math.min(CLOUDS[tier] || 6, layout.lowPower ? 7 : 13), c0 = layout.center || { x: 0, z: 0 };
  const tw = tier === 'hero' ? 256 : 128;
  for (let i = 0; i < count; i++) {
    const seed = hashCloud(80 + i * 11.7);
    const mat = new T.SpriteMaterial({
      map: cloudTexture(T, seed * 100, tw), color: new T.Color().setHSL(0.1, 0.18, 0.93 - seed * 0.08),
      transparent: true, opacity: 0.62 + seed * 0.2, depthWrite: false, fog: false
    });
    const cloud = new T.Sprite(mat);
    const a = (i / count) * Math.PI * 2 + seed * 0.7, radius = 185 + hashCloud(i * 4.7) * 190;
    cloud.position.set(c0.x + Math.cos(a) * radius, 48 + hashCloud(i * 9.1) * 62, c0.z + Math.sin(a) * radius);
    const w = 48 + hashCloud(i * 3.4) * 78;
    cloud.scale.set(w, w * (0.28 + seed * 0.12), 1);
    cloud.userData.base = cloud.position.clone();
    cloud.userData.speed = 0.45 + hashCloud(i * 8.3) * 0.7;
    cloud.userData.phase = seed * Math.PI * 2;
    cloud.renderOrder = -4;
    clouds.push(cloud); group.add(cloud);
    parts[`cloud_${i + 1}`] = cloud;
  }
  const moon = new T.Sprite(new T.SpriteMaterial({ map: moonTexture(T), transparent: true, opacity: 0, depthWrite: false, fog: false, blending: T.AdditiveBlending }));
  moon.scale.set(42, 42, 1);
  moon.renderOrder = -3;
  group.add(moon);
  parts.moon = moon;
  return { group, parts, sockets: {}, live: [], uniforms, dome, clouds, moon, dispose() { disposeTree(group); } };
}

export const skyAsset = defineAsset({
  id: 'roof-sky', family: 'rooffestival', lab: 'roofroad/sky', label: 'Roof Road sky', tiers: ['hero', 'mid', 'far'],
  floating: ['dome', 'moon', ...Array.from({ length: 13 }, (_, i) => `cloud_${i + 1}`)],
  sample: { x: -13, y: 0, z: -57, ry: 0, index: 0, band: 'near', center: { x: -13, z: -57 }, lowPower: false },
  build: buildSky
});
