// The village square at dusk. Say hello to each cat, change their coats, and
// carry a lantern: their eyes come back at you only when the light's by your face.
import * as THREE from 'three';
import { loadSkyModule, loadFoliageModule, loadGrassModule } from '../../shared/game.js';
import { LabWorld } from '../../shared/world.js';
import { standardBar } from '../../shared/workshop.js';
import { slider, toggle, Dropdown } from '../../shared/ui.js';
import { V3, TAU, rng } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { bell } from '../../shared/sound.js';
import { flag } from '../../shared/stage.js';
import { COATS, eyeShine } from './kit.js';
import { newCat } from './recipes.js';

const $ = (s) => document.querySelector(s);

export async function makeVillagerStage(lab) {
  const [{ Sky }, F, GM] = await Promise.all([loadSkyModule(), loadFoliageModule(), loadGrassModule()]);
  const P = 13;
  const world = new LabWorld(lab, $('#stage'), {
    SkyClass: Sky, hour: +flag('hour', 19.1), plot: P, res: 1024, outer: 0x4e6a3c, shadowExtent: 13,
    paint: (x, res) => { x.fillStyle = '#6a644e'; x.fillRect(0, 0, res, res); const r = rng(2); for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${90 + r() * 50},${84 + r() * 40},${60 + r() * 26},${0.06 + r() * 0.16})`; x.beginPath(); x.ellipse(r() * res, r() * res, 3 + r() * 13, 2 + r() * 7, r() * 3, 0, TAU); x.fill(); } },
    camera: { az: 0.45, el: 0.12, dist: 7.5, focus: [0, 0.7, 0] }, bounds: { x0: -8, x1: 8, z0: -8, z1: 8 }, catStart: { x: 0, z: 3.5, heading: Math.PI },
    views: { stage: { label: 'The square', az: 0.45, el: 0.12, dist: 7.5, focus: [0, 0.7, 0] }, close: { label: 'Close', az: 0.5, el: 0.09, dist: 3.2, focus: [0, 0.5, -1] }, eye: { label: 'Cat-eye', eye: true } }
  });
  const scene = world.scene;
  // a bench and a lit doorway at the back of the square
  {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(14, 3, 0.3), M.plaster({ tint: 0xe2d6bd, grime: 0.5, grimeH: 1 })); wall.position.set(0, 1.5, -5.4); wall.castShadow = wall.receiveShadow = true; scene.add(wall);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2), new THREE.MeshStandardMaterial({ color: 0xffb060, emissive: 0xff9a40, emissiveIntensity: 1.1 })); door.position.set(-3, 1, -5.24); scene.add(door);
    world.addGlow(V3(-3, 1.1, -4.7), { size: 3.6, intensity: 6, distance: 11, color: 0xffb060 });
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.6), M.wood()); bench.position.set(2.8, 0.42, -2.4); bench.castShadow = bench.receiveShadow = true; scene.add(bench);
    for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.5), M.wood()); l.position.set(2.8 + s, 0.21, -2.4); l.castShadow = true; scene.add(l); }
  }

  const cats = [];
  const R = rng(5);
  const spots = { luna: [2.2, -2.1], mochi: [-1.8, -0.8], kuro: [3.8, 1.2] };
  for (const id of ['luna', 'mochi', 'kuro']) {
    const c = COATS[id], cat = newCat({ fur: c.fur, belly: c.belly, accent: c.accent, eyeColor: c.eyeColor, ribbonColor: c.ribbon, stripes: c.stripes, build: c.build });
    cat.group.scale.setScalar(c.scale);
    const g = new THREE.Group(); g.add(cat.group); const [x, z] = spots[id]; g.position.set(x, 0, z); g.rotation.y = 1 + cats.length; scene.add(g);
    const shine = eyeShine(cat, c.shine);
    const o = { id, c, cat, g, shine, x, z, t: 2 + R() * 3, home: [x, z], tx: x, tz: z, sp: 0, heading: g.rotation.y };
    cats.push(o);
    const proxy = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); proxy.position.set(x, 0.4, z); g.add(proxy);
    proxy.position.set(0, 0.4, 0);
    world.addPick(proxy, () => greet(o), `Say hello to ${c.label}`);
  }
  const greet = (o) => {
    const c = o.c;
    if (o.id === 'luna') { o.cat.setMood('curious', 2.4, 2); o.cat.startIdleAction('sit', 3); world.say('Luna blinks at you, slowly. That means something.'); }
    else if (o.id === 'mochi') { o.cat.setMood('playful', 2.4, 2); o.cat.startIdleAction('stretch', 2.5); world.say('Mochi comes over, delighted.'); o.tx = world.cat ? world.cat.pos.x + 0.8 : o.x; o.tz = world.cat ? world.cat.pos.y + 0.7 : o.z; }
    else { o.cat.setMood('cautious', 2.2, 2); world.say('Kuro looks at you. You look at Kuro. Nothing else happens.'); }
    bell(780, { vol: 0.08, dur: 0.6, partials: [1, 2.02] });
  };

  // a lantern the player carries: a point light parked near the camera
  const carry = new THREE.PointLight(0xffc27a, 0, 14, 2); scene.add(carry);
  const lantern = { on: false, pos: new THREE.Vector3(), offset: 0 };
  const shineGain = { v: 1 };
  world.onUpdate = (dt, t) => {
    for (const o of cats) {
      const dark = Math.max(0, Math.min(1, (0.1 - world.sky.sunDir.y) * 4));
      // the lantern is carried at camera height, offset to the side by the slider
      const cam = world.camera;
      const side = new THREE.Vector3().crossVectors(cam.getWorldDirection(new THREE.Vector3()), new THREE.Vector3(0, 1, 0)).normalize();
      lantern.pos.copy(cam.position).addScaledVector(side, lantern.offset).y -= 0.25;
      carry.position.copy(lantern.pos); carry.intensity = lantern.on ? 2.8 : 0;
      o.shine.update(lantern.on ? lantern.pos : world.scene.position.clone().add(new THREE.Vector3(0, 30, 0)), cam, (lantern.on ? 1.2 : 0.18) * shineGain.v * dark);
      // a small life of their own: pace, sit, groom
      o.t -= dt;
      if (o.t < 0) {
        o.t = 4 + R() * 6;
        if (R() < 0.45) { const a = R() * TAU, d = R() * 1.4; o.tx = o.home[0] + Math.cos(a) * d; o.tz = o.home[1] + Math.sin(a) * d; } else { const act = o.c.idle[Math.floor(R() * o.c.idle.length)]; o.cat.startIdleAction(act, 3 + R() * 3); }
      }
      const dx = o.tx - o.x, dz = o.tz - o.z, d = Math.hypot(dx, dz);
      if (d > 0.08) { const h = Math.atan2(dx, dz), step = Math.min(d, dt * 0.7); o.x += Math.sin(h) * step; o.z += Math.cos(h) * step; o.heading += ((h - o.heading + Math.PI * 3) % TAU - Math.PI) * Math.min(1, dt * 5); o.sp = 0.7; } else o.sp = 0;
      o.g.position.set(o.x, 0, o.z); o.g.rotation.y = o.heading;
      o.cat.update(dt, o.sp, true, false, false, false, null);
    }
  };

  standardBar(world, $('#bar'), { presets: [[17.5, 'Late sun'], [19.1, 'Dusk'], [21.5, 'Night']] });
  toggle($('#ctl'), { label: 'Carry a lantern', value: false, onChange: (b) => { lantern.on = b; world.say(b ? 'Now look along the beam.' : ''); } });
  slider($('#ctl'), { label: 'Hold it away from your face', min: 0, max: 3, step: 0.05, value: 0, fmt: (v) => `${v.toFixed(2)} m`, onInput: (v) => { lantern.offset = v; } });
  slider($('#ctl'), { label: 'Shine', min: 0, max: 2, step: 0.05, value: 1, onInput: (v) => { shineGain.v = v; } });

  await world.loadForest(F, { near: 22, nearInner: 12, nearCount: 18, keepOut: (x, z) => z < -4 && Math.abs(x) < 10 });
  world.loadGrass(GM, { paint: (m) => { m.disc('excl', 0, 0, 7.5, 1, 1.2); }, zones: [['near', 0.14]] });
  await world.loadCat();
  world.chooseSpec = (spec) => { world.say(spec.name); if (spec.id === 'shine') { document.querySelector('#ctl .tog').click(); world.view('close'); } };
  window.__vil = { world, cats, lantern };
  return world;
}
