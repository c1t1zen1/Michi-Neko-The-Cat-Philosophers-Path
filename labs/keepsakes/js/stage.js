// Twelve things hidden in a very busy field. A squint slider blurs your eyes
// the way designers do, so you can test what actually survives the grass.
import * as THREE from 'three';
import { loadSkyModule, loadFoliageModule, loadGrassModule } from '../../shared/game.js';
import { LabWorld } from '../../shared/world.js';
import { standardBar } from '../../shared/workshop.js';
import { Dropdown, slider } from '../../shared/ui.js';
import { V3, TAU, rng, sstep, tube, catmull } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { bell, thump } from '../../shared/sound.js';
import { flag } from '../../shared/stage.js';
import { yarnGeometry, yarnMat, fuzzShells, keyGeometry, glintSprite, YARN_COL } from './kit.js';

const $ = (s) => document.querySelector(s);

export async function makeKeepsakeStage(lab) {
  const [{ Sky }, F, GM] = await Promise.all([loadSkyModule(), loadFoliageModule(), loadGrassModule()]);
  const P = 14;
  const world = new LabWorld(lab, $('#stage'), {
    SkyClass: Sky, hour: +flag('hour', 14), plot: P, res: 1024, outer: 0x5a7a44, shadowExtent: 15,
    camera: { az: 0.5, el: 0.2, dist: 11, focus: [0, 0.3, 0] }, bounds: { x0: -11, x1: 11, z0: -11, z1: 11 }, catStart: { x: 0, z: 6, heading: Math.PI },
    views: { stage: { label: 'The field', az: 0.5, el: 0.2, dist: 11, focus: [0, 0.3, 0] }, low: { label: 'Low', az: 0.3, el: 0.05, dist: 5, focus: [0, 0.3, 1] }, eye: { label: 'Cat-eye', eye: true }, high: { label: 'From above', az: 0.6, el: 1.2, dist: 18, focus: [0, 0, 0] } }
  });
  const scene = world.scene, R = rng(19);
  const spots = []; for (let i = 0; i < 12; i++) { const a = R() * TAU, d = 2.4 + Math.sqrt(R()) * 7.5; spots.push([Math.cos(a) * d, Math.sin(a) * d]); }
  const st = { style: flag('style', 'sheen'), found: 0 };
  const ball = new THREE.SphereGeometry(0.18, 24, 18), wound = yarnGeometry(0.18);
  const items = spots.map(([x, z], i) => {
    const isKey = i % 4 === 3;
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const o = { g, x, z, i, isKey, found: false, ph: R() * 6, sprite: null, mesh: null, phase: R() };
    return o;
  });
  const colors = [YARN_COL.peony, YARN_COL.ochre, YARN_COL.snow, YARN_COL.indigo];
  const dress = () => {
    for (const o of items) {
      o.g.clear();
      o.sprite = null;
      if (o.found) continue;
      if (o.isKey) {
        const b = keyGeometry();
        const m = b.mesh(M.bag({ metal: 0.85, rough: st.style === 'plain' ? 0.5 : 0.32 })); m.position.y = 0.32; m.rotation.z = -0.5; m.castShadow = true; o.g.add(m); o.mesh = m;
        if (st.style === 'plain') { const r = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.38, 16), new THREE.MeshBasicMaterial({ color: 0xffe680, transparent: true, opacity: 0.35, side: THREE.DoubleSide })); r.position.y = 0.36; o.g.add(r); }
      } else {
        const col = colors[o.i % colors.length];
        let m;
        if (st.style === 'plain') { m = new THREE.Mesh(ball, new THREE.MeshStandardMaterial({ color: 0xe04a7a, emissive: 0x701030, emissiveIntensity: 0.5, roughness: 0.7 })); const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 16), new THREE.MeshStandardMaterial({ color: 0xf27a9f, roughness: 0.7 })); wrap.rotation.set(1.2, 0.7, 0); m.add(wrap); }
        else m = new THREE.Mesh(wound, yarnMat(col));
        m.position.y = 0.24; m.castShadow = true; o.g.add(m); o.mesh = m;
        if (st.style === 'fuzz') { const f = fuzzShells(wound, col, { layers: 10 }); f.position.y = 0.24; o.g.add(f); }
      }
      if (st.style === 'glint') { const s = glintSprite(o.isKey ? 0xfff3c4 : 0xffe8f0); s.position.set(0.05, 0.42, 0.05); s.material.opacity = 0; o.g.add(s); o.sprite = s; }
      if (st.style === 'bob') o.g.userData.bob = true; else o.g.userData.bob = false;
    }
  };
  dress();

  const proxies = items.map((o) => { const p = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); p.position.set(o.x, 0.3, o.z); scene.add(p); world.addPick(p, () => found(o), 'Something here'); return p; });
  const count = $('#count');
  const say = () => { count.textContent = `${st.found} of ${items.length} found`; };
  function found(o) { if (o.found) return; o.found = true; o.g.clear(); st.found++; say(); bell(900 + st.found * 80, { vol: 0.14, dur: 0.8, partials: [1, 2.5] }); world.say(o.isKey ? 'A key. What does it open?' : 'One of Michi’s yarns.'); if (st.found === items.length) world.say('All twelve. Michi looks very pleased.'); if (!o.isKey) loosen(o); }

  /* a yarn you have found leaves a loose end: a Verlet rope that falls and lies in the grass */
  const threads = [];
  function loosen(o) {
    const N = 26, seg = 0.06, pts = [];
    const a = R() * TAU;
    for (let i = 0; i < N; i++) { const p = V3(o.x + Math.cos(a) * i * seg * 0.3, 0.5 + i * 0.012, o.z + Math.sin(a) * i * seg * 0.3); pts.push({ p, q: p.clone() }); }
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), yarnMat(colors[o.i % colors.length])); mesh.castShadow = true; mesh.frustumCulled = false; scene.add(mesh);
    threads.push({ pts, mesh, seg, life: 2.4, wind: R() * TAU });
  }
  const stepThread = (th, dt) => {
    th.life -= dt;
    for (const n of th.pts) {
      const vx = (n.p.x - n.q.x) * 0.97, vy = (n.p.y - n.q.y) * 0.97, vz = (n.p.z - n.q.z) * 0.97;
      n.q.copy(n.p);
      n.p.x += vx + Math.cos(th.wind) * 0.0009; n.p.y += vy - 0.0028; n.p.z += vz + Math.sin(th.wind) * 0.0009;
      if (n.p.y < 0.015) { n.p.y = 0.015; n.q.x = n.p.x; n.q.z = n.p.z; }
    }
    for (let it = 0; it < 3; it++) for (let i = 0; i < th.pts.length - 1; i++) {
      const a = th.pts[i].p, b = th.pts[i + 1].p, dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, d = Math.hypot(dx, dy, dz) || 1e-5, e = (d - th.seg) / d * 0.5;
      a.x += dx * e; a.y += dy * e; a.z += dz * e; b.x -= dx * e; b.y -= dy * e; b.z -= dz * e;
    }
    th.mesh.geometry.dispose();
    th.mesh.geometry = tube(th.pts.map((n) => n.p), 0.009, { radial: 5, caps: false });
  };
  world.onUpdate = (dt, t) => {
    for (const o of items) {
      if (o.found) continue;
      if (o.g.userData.bob && o.mesh) o.mesh.position.y = 0.26 + Math.sin(t * 2 + o.ph) * 0.05;
      if (o.sprite) { const p = (Math.sin(t * 1.5 + o.ph * 5) + 1) / 2, e = Math.pow(p, 22); o.sprite.material.opacity = e; o.sprite.scale.setScalar(0.1 + e * 0.5); o.sprite.material.rotation = t * 0.4; }
      if (o.mesh && o.g.userData.bob !== undefined) o.mesh.rotation.y = t * 0.2 + o.ph;
    }
    for (const th of threads) if (th.life > 0) stepThread(th, dt);
  };

  const squint = document.createElement('div'); squint.className = 'squint'; $('#stage').append(squint);
  standardBar(world, $('#bar'), { presets: [[9, 'Morning'], [14, 'Noon sun'], [17.5, 'Golden'], [20.5, 'Dusk']] });
  new Dropdown($('#slot-style'), { label: 'How the collectibles try to be seen', value: st.style, items: [
    { value: 'plain', label: 'as they are today', hint: 'a flat ball, a ring, a halo' },
    { value: 'sheen', label: 'wound thread with sheen', hint: 'real fibre, nothing extra' },
    { value: 'glint', label: 'a soft glint', hint: 'a sparkle that comes and goes' },
    { value: 'fuzz', label: 'fuzzy shells', hint: 'shell texturing' },
    { value: 'bob', label: 'a gentle bob', hint: 'motion catches the eye' }
  ], onChange: (v) => { st.style = v; dress(); } });
  slider($('#ctl'), { label: 'Squint', min: 0, max: 14, step: 0.5, value: 0, fmt: (v) => (v === 0 ? 'open' : `${v}px`), onInput: (v) => { squint.style.backdropFilter = `blur(${v}px)`; squint.style.webkitBackdropFilter = `blur(${v}px)`; } });
  $('#btn-reset').addEventListener('click', () => { for (const o of items) o.found = false; st.found = 0; for (const th of threads) scene.remove(th.mesh); threads.length = 0; say(); dress(); });
  say();

  await world.loadForest(F, { near: 24, nearInner: 13, nearCount: 22 });
  world.loadGrass(GM, { paint: (m) => { m.paint('wild', (x, z) => 0.6); m.paint('flower', (x, z) => (Math.sin(x * 0.7) * Math.cos(z * 0.9) > 0.1 ? 0.55 : 0)); }, zones: [['near', 0.11], ['thicket', 0.45], ['flowers', 0.3], ['susuki', 0.9]], palette: { root: 0x3a6a2e, mid: 0x74a64a, tip: 0xc2d86c } });
  await world.loadCat();
  world.chooseSpec = (spec) => { world.say(spec.name); };
  window.__keeps = { world, st };
  return world;
}
