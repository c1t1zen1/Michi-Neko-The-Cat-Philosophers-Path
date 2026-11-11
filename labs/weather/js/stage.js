// A corner of town and a weather brush: drag a storm across the ground. Rain
// rings the water and darkens the stone, snow settles, petals pile against walls.
import * as THREE from 'three';
import { gableRoofGeometry, gableAtticGeometry } from '../../shared/architecture.js';
import { loadSkyModule, loadFoliageModule, loadGrassModule } from '../../shared/game.js';
import { LabWorld } from '../../shared/world.js';
import { standardBar } from '../../shared/workshop.js';
import { seg, slider } from '../../shared/ui.js';
import { V3, TAU, rng, clamp, sstep, canvas2d, canvasTexture, instances, rockGeometry } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { Bed, drip } from '../../shared/sound.js';
import { flag } from '../../shared/stage.js';
import { PondWater } from '../../shared/water.js';

const $ = (s) => document.querySelector(s);
const SIZE = 28, RES = 256;

export async function makeWeatherStage(lab) {
  const [{ Sky }, F, GM] = await Promise.all([loadSkyModule(), loadFoliageModule(), loadGrassModule()]);
  const P = 15, wetU = { value: 0 }, snowU = { value: 0 };
  const world = new LabWorld(lab, $('#stage'), {
    SkyClass: Sky, hour: +flag('hour', 13), plot: P, res: 1024, outer: 0x4e6a3c, shadowExtent: 16, heightAt: (x, z) => -0.5 * (1 - sstep(3.05, 3.55, Math.hypot(x - 2, z + 1))),
    paint: (x, res) => { x.fillStyle = '#7d7a68'; x.fillRect(0, 0, res, res); const r = rng(7); for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(${110 + r() * 60},${106 + r() * 50},${88 + r() * 40},${0.08 + r() * 0.16})`; x.beginPath(); x.ellipse(r() * res, r() * res, 3 + r() * 11, 2 + r() * 7, r() * 3, 0, TAU); x.fill(); } },
    camera: { az: 0.5, el: 0.25, dist: 15, focus: [0, 0.6, 0] }, bounds: { x0: -12, x1: 12, z0: -12, z1: 12 }, catStart: { x: -6, z: 7, heading: 2.4 },
    blocked: (x, z) => Math.hypot(x - 2, z + 1) < 3.4 || (Math.abs(x + 4) < 3.2 && Math.abs(z + 6) < 2.1) || (Math.abs(x) < 8 && Math.abs(z + 11.2) < 0.8),
    views: { stage: { label: 'The corner', az: 0.5, el: 0.25, dist: 15, focus: [0, 0.6, 0] }, low: { label: 'Low', az: 0.42, el: 0.07, dist: 7, focus: [1.6, 0.6, 1] }, eye: { label: 'Cat-eye', eye: true }, high: { label: 'From above', az: 0.6, el: 1.2, dist: 22, focus: [0, 0, 0] } }
  });
  const scene = world.scene, sky = world.sky;
  // the wet map: a small canvas multiplied over the ground and its gloss
  const [wc, wx] = canvas2d(RES, RES); wx.fillStyle = '#000'; wx.fillRect(0, 0, RES, RES);
  const wetTex = canvasTexture(wc, { srgb: false, aniso: 1 }); wetTex.flipY = false;
  const toW = (x, z) => [(x / SIZE + 0.5) * RES, (z / SIZE + 0.5) * RES];
  const gm = world.groundMat, prev = gm.onBeforeCompile;
  gm.onBeforeCompile = (s) => {
    prev(s);
    s.uniforms.tWet = { value: wetTex }; s.uniforms.uSize = { value: SIZE };
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tWet; uniform float uSize; float wetK = 0.;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        { vec4 w0 = texture2D(tWet, vPW.xz / uSize + .5); wetK = w0.r; diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(.52, .54, .56), w0.r); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.92, .94, 1.), w0.g); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.95, .74, .8), w0.b * .8); }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, .08, wetK);`);
  };
  gm.customProgramCacheKey = () => 'ground-wx';
  gm.needsUpdate = true;
  const fadeW = (r, g, b, k) => { wx.globalCompositeOperation = 'source-over'; wx.fillStyle = `rgba(0,0,0,${k})`; wx.fillRect(0, 0, RES, RES); };
  // pond in one corner, a house and a low wall in the others
  const water = new PondWater({ renderer: lab.renderer, radius: 3.2, res: 192, center: [2, -1], y: -0.04, breeze: 0.1, reflectRes: 512 }); scene.add(water.mesh);
  {
    const rock = instances(rockGeometry(4, { detail: 4, rough: 0.14 }), M.rock({ moss: 0.4, a: 0x54504a, b: 0x8e887c, snow: snowU, wet: wetU, lichen: 0.3 }), Array.from({ length: 28 }, (_, i) => { const a = i / 28 * TAU; return { x: 2 + Math.cos(a) * 3.25, y: 0.12, z: -1 + Math.sin(a) * 3.25, sx: 0.5, sy: 0.3, sz: 0.5, ry: i }; }), 'Rim'); rock.castShadow = rock.receiveShadow = true; scene.add(rock);
    const body = new THREE.Mesh(new THREE.BoxGeometry(6, 2.4, 3.6), M.plaster({ tint: 0xe2d6bd, grime: 0.5, grimeH: 1, snow: snowU, wet: wetU })); body.position.set(-4, 1.2, -6); body.castShadow = body.receiveShadow = true; scene.add(body);
    const roof = new THREE.Mesh(gableRoofGeometry(6.6, 4.2, 1.0), M.tile({ snow: snowU, wet: wetU })); roof.name = 'Pitched kawara roof'; roof.position.set(-4, 2.4, -6); roof.castShadow = roof.receiveShadow = true; scene.add(roof);
    const attic = new THREE.Mesh(gableAtticGeometry(6, 3.6, 4.2, 1.0), body.material); attic.position.copy(roof.position); attic.castShadow = attic.receiveShadow = true; scene.add(attic);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(6.72, 0.16, 0.22), roof.material); ridge.position.set(-4, 3.43, -6); ridge.castShadow = true; scene.add(ridge);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(16, 1.3, 0.3), M.plaster({ tint: 0xe2d6bd, grime: 0.5, grimeH: 1, snow: snowU, wet: wetU })); wall.position.set(0, 0.65, -11.2); wall.castShadow = wall.receiveShadow = true; scene.add(wall);
  }
  // particles
  const R = rng(9), rainN = 1400, snowN = 1100, petalN = 320, restN = 1400;
  const rainMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.012, 0.46), new THREE.MeshBasicMaterial({ color: 0xc4d4e6, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide }), rainN); rainMesh.frustumCulled = false; scene.add(rainMesh);
  const snowMesh = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(snowN * 3), 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 0.09, transparent: true, opacity: 0.9, depthWrite: false })); snowMesh.frustumCulled = false; scene.add(snowMesh);
  const petalM = M.plain(0xf4c8d6, { rough: 0.7, side: THREE.DoubleSide, brush: 0.02 });
  const petals = new THREE.InstancedMesh(new THREE.CircleGeometry(0.05, 6), petalM, petalN); petals.frustumCulled = false; scene.add(petals);
  const rests = new THREE.InstancedMesh(new THREE.CircleGeometry(0.05, 6), petalM, restN); rests.frustumCulled = false; rests.count = 0; rests.receiveShadow = true; scene.add(rests);
  const ring = new THREE.InstancedMesh(new THREE.RingGeometry(0.04, 0.055, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xdfeaf2, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }), 200); ring.frustumCulled = false; ring.count = 200; scene.add(ring);
  const O = new THREE.Object3D();
  const cells = [];   // {x, z, r, kind, t}
  const rains = Array.from({ length: rainN }, () => ({ x: 0, y: 8 + R() * 8, z: 0, c: 0, live: false }));
  const snows = Array.from({ length: snowN }, () => ({ x: 0, y: 8 + R() * 8, z: 0, ph: R() * 6, c: 0, live: false }));
  const pets = Array.from({ length: petalN }, () => ({ x: 0, y: 8 + R() * 8, z: 0, ph: R() * 6, live: false, r: R() * 3 }));
  const ringsD = Array.from({ length: 200 }, () => ({ x: 0, z: 0, t: 1 + R() }));
  const collides = (x, z) => x < -11 || x > 11 || z < -10.9 || z > 11;
  let ringI = 0, paintT = 0, restC = 0;
  const pick = (kind) => { const list = cells.filter((c) => c.kind === kind); return list.length ? list[Math.floor(R() * list.length)] : null; };
  const sample = (c) => { const a = R() * TAU, d = Math.sqrt(R()) * c.r; return [c.x + Math.cos(a) * d, c.z + Math.sin(a) * d]; };
  const st = { tool: flag('tool', 'rain'), wind: 0.6, r: 3.4 };
  world.onDragStart = (e) => { if (st.tool === 'walk') return false; const p = world.groundAt(e); if (p) { brush(p); return true; } return false; };
  world.onDrag = (e) => { const p = world.groundAt(e); if (p) brush(p); };
  const brush = (p) => { if (st.tool === 'clear') { for (let i = cells.length - 1; i >= 0; i--) if (Math.hypot(cells[i].x - p.x, cells[i].z - p.z) < st.r) cells.splice(i, 1); return; } if (!cells.some((c) => c.kind === st.tool && Math.hypot(c.x - p.x, c.z - p.z) < st.r * 0.4)) { cells.push({ x: p.x, z: p.z, r: st.r, kind: st.tool, t: 0 }); if (cells.length > 40) cells.shift(); } };
  world.onGround = (p) => { if (st.tool === 'walk') return false; brush(p); return true; };
  const bed = new Bed({ type: 'bandpass', freq: 3000, q: 0.5, max: 0.16 });

  world.onUpdate = (dt, t) => {
    const wind = st.wind;
    world.wind = wind * 0.9;
    water.update(dt, t); water.feed(sky, V3(0.5, 0.7, -0.5).normalize()); if (world.active) water.reflect(lab.renderer, scene, world.camera);
    const hasRain = cells.some((c) => c.kind === 'rain'), hasSnow = cells.some((c) => c.kind === 'snow');
    rainMesh.visible = hasRain; snowMesh.visible = hasSnow;
    bed.set(hasRain ? 0.7 : 0);
    // the sky's grey follows how much weather there is
    const cover = clamp(cells.length / 14, 0, 1);
    world.ambient = 0.85 - cover * 0.3; world.sunGain = 1.15 - cover * 0.95;
    wetU.value += ((hasRain ? 1 : 0) - wetU.value) * Math.min(1, dt * (hasRain ? 0.35 : 0.08));
    snowU.value += ((hasSnow ? 1 : 0) - snowU.value) * Math.min(1, dt * (hasSnow ? 0.1 : 0.05));
    // rain
    let ri = 0;
    if (hasRain) for (const d of rains) {
      if (!d.live) { const c = pick('rain'); if (!c) continue; const [x, z] = sample(c); d.x = x + (6 * wind) * 0.2; d.z = z; d.y = 10 + R() * 6; d.live = true; d.c = c; }
      d.y -= dt * 22; d.x -= dt * wind * 3;
      if (d.y < 0.02) {
        d.live = false;
        if (Math.hypot(d.x - 2, d.z + 1) < 3.2) { water.drop(d.x, d.z, 0.04, 2); if (R() < 0.04) drip({ vol: 0.04 }); } else { const k = ringsD[ringI = (ringI + 1) % 200]; k.x = d.x; k.z = d.z; k.t = 0; }
        continue;
      }
      if (ri < rainN) { O.position.set(d.x, d.y, d.z); O.rotation.set(0, world.orbit.az, -wind * 0.13); O.scale.setScalar(1); O.updateMatrix(); rainMesh.setMatrixAt(ri++, O.matrix); }
    }
    rainMesh.count = ri; rainMesh.instanceMatrix.needsUpdate = true;
    // ground splash rings
    ringsD.forEach((k, i) => { k.t += dt * 1.8; const s = k.t < 1 ? 1 + k.t * 3.5 : 0; O.position.set(k.x, 0.012, k.z); O.rotation.set(0, 0, 0); O.scale.setScalar(s); O.updateMatrix(); ring.setMatrixAt(i, O.matrix); });
    ring.instanceMatrix.needsUpdate = true; ring.material.opacity = hasRain ? 0.55 : 0;
    // snow
    if (hasSnow) { const pos = snowMesh.geometry.attributes.position; let si = 0; for (const s of snows) { if (!s.live) { const c = pick('snow'); if (!c) continue; const [x, z] = sample(c); s.x = x; s.z = z; s.y = 9 + R() * 7; s.live = true; } s.y -= dt * 1.25; s.x += Math.sin(t * 1.6 + s.ph) * dt * 0.45 - wind * dt * 0.8; if (s.y < 0.02) s.live = false; pos.setXYZ(si++, s.x, s.y, s.z); } pos.needsUpdate = true; snowMesh.geometry.setDrawRange(0, si); }
    // petals: fall, spin, drift with the wind, and rest against the walls
    let pi = 0;
    for (const p of pets) {
      if (!p.live) { const c = pick('petal'); if (!c) continue; const [x, z] = sample(c); p.x = x; p.z = z; p.y = 6 + R() * 5; p.live = true; p.vx = (R() - 0.5) * 0.3; }
      p.y -= dt * 0.9; p.x += (Math.sin(t * 1.3 + p.ph) * 0.4 - wind * 0.9) * dt + p.vx * dt; p.z += Math.cos(t * 1.1 + p.ph) * dt * 0.3;
      if (p.y < 0.02 || collides(p.x, p.z)) {
        p.live = false;
        if (restC < restN) { O.position.set(Math.min(11, Math.max(-11, p.x)), 0.01 + R() * 0.02, Math.min(10.8, Math.max(-10.8, p.z))); O.rotation.set(-Math.PI / 2 + (R() - 0.5) * 0.3, 0, R() * 6); O.scale.setScalar(0.8 + R() * 0.7); O.updateMatrix(); rests.setMatrixAt(restC++, O.matrix); rests.count = restC; rests.instanceMatrix.needsUpdate = true; }
        continue;
      }
      if (pi < petalN) { O.position.set(p.x, p.y, p.z); O.rotation.set(t * 2 + p.r, t * 1.3 + p.r, 0); O.scale.setScalar(1); O.updateMatrix(); petals.setMatrixAt(pi++, O.matrix); }
    }
    petals.count = pi; petals.instanceMatrix.needsUpdate = true;
    // the wet map: paint where it is raining or snowing, fade slowly toward dry
    if ((paintT -= dt) < 0) {
      paintT = 0.12;
      wx.globalCompositeOperation = 'source-over'; wx.fillStyle = 'rgba(0,0,0,0.018)'; wx.fillRect(0, 0, RES, RES);
      wx.globalCompositeOperation = 'lighter';
      for (const c of cells) {
        const [cx, cy] = toW(c.x, c.z), rad = c.r / SIZE * RES;
        const col = c.kind === 'rain' ? [255, 0, 0] : c.kind === 'snow' ? [0, 255, 0] : [0, 0, 255];
        const g = wx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},.12)`); g.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
        wx.fillStyle = g; wx.beginPath(); wx.arc(cx, cy, rad, 0, TAU); wx.fill();
      }
      wetTex.needsUpdate = true;
    }
  };

  standardBar(world, $('#bar'), { presets: [[9, 'Morning'], [13, 'Noon'], [17, 'Late']] });
  seg($('#seg-tool'), [{ v: 'rain', label: 'Rain' }, { v: 'snow', label: 'Snow' }, { v: 'petal', label: 'Petals' }, { v: 'clear', label: 'Clear' }, { v: 'walk', label: 'Walk' }], st.tool, (v) => { st.tool = v; });
  slider($('#ctl'), { label: 'Wind', min: 0, max: 1.4, step: 0.02, value: st.wind, onInput: (v) => { st.wind = v; } });
  slider($('#ctl'), { label: 'Brush', min: 1.4, max: 6, step: 0.1, value: st.r, fmt: (v) => `${v.toFixed(1)} m`, onInput: (v) => { st.r = v; } });

  await world.loadForest(F, { near: 26, nearInner: 13, nearCount: 22, keepOut: (x, z) => z > 8 && Math.abs(x) < 8 });
  world.loadGrass(GM, { paint: (m) => { m.paint('excl', (x, z) => 1 - sstep(4.2, 6, Math.hypot(x - 2, z + 1))); m.rect('excl', -4, -6, 9, 6); m.rect('excl', 0, -11, 18, 2); }, zones: [['near', 0.14]] });
  water.hide = [...(world.grass?.meshes || [])];
  await world.loadCat();
  world.chooseSpec = (spec) => { const f = spec.family === 'rain' ? 'rain' : spec.family === 'snow' ? 'snow' : 'petal'; st.tool = f; $('#seg-tool').querySelector(`[data-v=${f}]`).click(); world.say('Now drag across the ground.'); };
  if (flag('demo')) { for (const [x, z, k] of [[2, -1, 'rain'], [5, -2, 'rain'], [-1, 2, 'rain'], [-4, -6, 'snow'], [-1, -4, 'snow'], [-5, 6, 'petal']]) cells.push({ x, z, r: 3.2, kind: k, t: 0 }); }
  window.__wx = { world, cells };
  return world;
}
