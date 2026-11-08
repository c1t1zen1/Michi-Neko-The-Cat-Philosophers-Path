// The reward view: a perch over the basin with the city laid out below. Layer
// the air, and at dusk watch the windows come on, starting at the river.
import * as THREE from 'three';
import { loadSkyModule, loadFoliageModule } from '../../shared/game.js';
import { LabWorld } from '../../shared/world.js';
import { standardBar } from '../../shared/workshop.js';
import { slider } from '../../shared/ui.js';
import { V3, TAU, rng, sstep, clamp, instances, canvas2d, canvasTexture, sweep, ringRect } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { bell } from '../../shared/sound.js';
import { flag } from '../../shared/stage.js';

const $ = (s) => document.querySelector(s);

export async function makeSummitStage(lab) {
  const [{ Sky }, F] = await Promise.all([loadSkyModule(), loadFoliageModule()]);
  const P = 11, Drop = (z) => -34 * sstep(6, 38, z);
  const world = new LabWorld(lab, $('#stage'), {
    SkyClass: Sky, hour: +flag('hour', 17.6), plot: P, res: 1024, outer: 0x3c5230, shadowExtent: 16, ambient: 0.9,
    heightAt: (x, z) => Drop(z),
    paint: (x, res) => { x.fillStyle = '#6b6b4a'; x.fillRect(0, 0, res, res); const r = rng(4); for (let i = 0; i < 2200; i++) { x.fillStyle = `rgba(${90 + r() * 40},${96 + r() * 40},${60 + r() * 24},${0.08 + r() * 0.14})`; x.beginPath(); x.ellipse(r() * res, r() * res, 4 + r() * 18, 3 + r() * 9, r() * 3, 0, TAU); x.fill(); } },
    camera: { az: Math.PI + 0.03, el: 0.07, dist: 6, focus: [0, 1.9, 10] }, bounds: { x0: -7, x1: 7, z0: -7, z1: 5 }, catStart: { x: 1, z: 3.2, heading: 0 },
    views: { stage: { label: 'The perch', az: Math.PI + 0.03, el: 0.07, dist: 6, focus: [0, 1.9, 10] }, sit: { label: 'Sit', az: Math.PI + 0.02, el: -0.04, dist: 3.2, focus: [0, 2.6, 4] }, eye: { label: 'Cat-eye', eye: true } }
  });
  const scene = world.scene, r = rng(17);
  const city = { list: [], lights: [] };
  // city: instanced walls and roofs on the basin floor, with the river kept clear
  {
    const walls = [], roofs = [], riverX = (z) => 18 * Math.sin(z * 0.02 + 0.5) - 6;
    for (let i = 0, tries = 0; i < 5600 && tries < 40000; tries++) {
      const z = 38 + Math.pow(r(), 0.8) * 230, halfW = 46 + (z - 38) * 0.8, x = (r() - 0.5) * halfW * 2;
      if (Math.abs(x - riverX(z)) < 7 + z * 0.015) continue;
      if (Math.abs(((x + 8) % 26 + 26) % 26 - 13) < 1.0 || Math.abs(((z - 50) % 23 + 23) % 23 - 11.5) < 0.7) continue;
      const near = 1 - clamp((z - 38) / 230, 0, 1), w = 1.4 + r() * (1.8 + near), d = 1.4 + r() * (1.8 + near), h = 0.6 + r() * (0.7 + near * 0.4), y = world.ringY(x, z), ry = (r() < 0.16 ? Math.PI / 2 : 0) + (r() - 0.5) * 0.14;
      walls.push({ x, y: y + h / 2, z, sx: w, sy: h, sz: d, ry, color: [0xd3c39e, 0xc4b48f, 0xd9cfb5, 0xb9aa89][Math.floor(r() * 4)] });
      roofs.push({ x, y: y + h + 0.42, z, sx: w * 1.02, sy: 0.85, sz: d * 1.02, ry, color: [0x495967, 0x5a6570, 0x3f4e5a, 0x68727b][Math.floor(r() * 4)] });
      if (r() < 0.65) city.lights.push({ x: x + (r() - 0.5) * w * 0.8, y: y + h * 0.6, z, dist: Math.hypot(x - riverX(z), z - 60) });
      i++;
    }
    const wM = M.plain(0xffffff, { rough: 0.9, brush: 0.04 }), hip = new THREE.ConeGeometry(1, 1, 4); hip.rotateY(Math.PI / 4);
    const W = instances(new THREE.BoxGeometry(1, 1, 1), wM, walls, 'City walls'); const R = instances(hip, M.plain(0xffffff, { rough: 0.85, brush: 0.04 }), roofs, 'City roofs'); W.castShadow = R.castShadow = false; W.receiveShadow = R.receiveShadow = true; W.frustumCulled = R.frustumCulled = false; scene.add(W, R);
    // the river
    const pts = []; for (let z = 34; z < 280; z += 6) pts.push(V3(riverX(z), world.ringY(riverX(z), z) + 0.06, z));
    const river = new THREE.Mesh(sweep(pts, ringRect(0.06, 9)), new THREE.MeshStandardMaterial({ color: 0x4f7f8a, roughness: 0.12, metalness: 0.5 })); river.receiveShadow = true; scene.add(river);
    // a landmark pagoda
    const pag = new THREE.Group(), body = M.wood({ base: 0x5a3a2a, dark: 0x3a241a }), tile = M.tile({});
    const py = world.ringY(26, 120); for (let i = 0; i < 5; i++) { const w = 6 - i * 0.85, y = py + 3 + i * 3.3; const b = new THREE.Mesh(new THREE.BoxGeometry(w, 2.6, w), body); b.position.y = y; pag.add(b); const c = new THREE.Mesh(new THREE.ConeGeometry(w * 0.86, 1.2, 4), tile); c.rotation.y = Math.PI / 4; c.position.y = y + 1.8; pag.add(c); } pag.position.set(26, 0, 120); scene.add(pag);
  }
  // window lights
  const lightGeo = new THREE.BufferGeometry(), N = city.lights.length, pos = new Float32Array(N * 3), onset = new Float32Array(N);
  city.lights.forEach((l, i) => { pos[i * 3] = l.x; pos[i * 3 + 1] = l.y; pos[i * 3 + 2] = l.z; onset[i] = l.dist; });
  lightGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); lightGeo.setAttribute('aOnset', new THREE.BufferAttribute(onset, 1));
  const lu = { uTime: { value: 0 }, uWave: { value: 0 }, uSize: { value: 1 } };
  const lightMat = new THREE.ShaderMaterial({ uniforms: lu, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, vertexShader: `attribute float aOnset; uniform float uWave, uTime, uSize; varying float vOn; void main(){ float f = sin(aOnset*7. + uTime*1.3)*.2+.8; vOn = smoothstep(aOnset, aOnset - 12., uWave)*f; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = uSize * 240. / -mv.z; gl_Position = projectionMatrix*mv; }`, fragmentShader: `varying float vOn; void main(){ vec2 c = gl_PointCoord-.5; float d = length(c)*2.; float a = smoothstep(1.,.1,d)*vOn; if(a<=.01) discard; gl_FragColor = vec4(1.,.76,.42,1.)*a; #include <colorspace_fragment>\n }`.replace('#include <colorspace_fragment>', '\n#include <colorspace_fragment>\n') });
  const lights = new THREE.Points(lightGeo, lightMat); lights.frustumCulled = false; scene.add(lights);
  // a perch to sit on: a low wall, a stone and a cherry
  {
    const stone = M.stone({ tint: 0x7f7a6e, moss: 0.6, lichen: 0.4 });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 0.8), stone); wall.position.set(0, 0.25, 5); wall.castShadow = wall.receiveShadow = true; scene.add(wall);
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.74, 0.16, 16), stone); seat.position.set(-1.8, 0.58, 4.6); seat.castShadow = seat.receiveShadow = true; scene.add(seat);
  }
  // kasumi: layered haze cards at fixed distances across the basin
  const hazes = [];
  {
    const [c, x] = canvas2d(512, 128); const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.55, 'rgba(255,255,255,.75)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 512, 128);
    const t = canvasTexture(c, { srgb: false });
    for (const z of [70, 110, 160, 210, 260]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1200, 42), new THREE.MeshBasicMaterial({ map: t, color: 0xf0e0d0, transparent: true, depthWrite: false, opacity: 0.4, fog: false })); m.position.set(0, world.ringY(0, z) + 11, z); m.rotation.y = Math.PI; m.renderOrder = 3; scene.add(m); hazes.push(m); }
  }
  const st = { haze: 0.5, wave: -40, waveOn: false };
  world.onUpdate = (dt, t) => {
    lu.uTime.value = t;
    const dark = clamp((0.06 - world.sky.sunDir.y) * 3.2, 0, 1);
    lights.visible = dark > 0.02;
    if (st.waveOn) st.wave = Math.min(st.wave + dt * 28, 280);
    lu.uWave.value = st.wave;
    const p = world.sky.resolvePalette();
    hazes.forEach((m, i) => { m.material.color.copy(p.fog).lerp(p.horizon, 0.3); m.material.opacity = (i + 1) * 0.11 * st.haze; });
  };

  standardBar(world, $('#bar'), { presets: [[9, 'Morning'], [17.6, 'Golden'], [19.6, 'Dusk'], [21, 'Night']] });
  slider($('#ctl'), { label: 'Haze', min: 0, max: 1.4, step: 0.02, value: st.haze, onInput: (v) => { st.haze = v; } });
  $('#btn-lights').addEventListener('click', (e) => { st.waveOn = !st.waveOn; if (st.waveOn) { st.wave = -40; bell(660, { vol: 0.1, dur: 2.4 }); world.say('Starting at the river and moving out.'); e.currentTarget.textContent = 'Put the city to bed'; } else { st.wave = -40; e.currentTarget.textContent = 'Light the city →'; } });

  world.loadForest(F, { near: 20, nearInner: 12, nearCount: 18, keepOut: (x, z) => z > 7 });
  world.chooseSpec = (spec) => { world.say(spec.name); };
  await world.loadCat();
  world.cat.heading = 0;
  if (flag('lit')) { st.waveOn = true; st.wave = 280; }
  window.__summit = { world, st };
  return world;
}
