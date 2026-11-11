// A nest built while you watch. Press the button and a small bird brings it
// twig by twig: coarse on the bottom, walls laid round, fine at the rim. Then
// Michi climbs in.
import * as THREE from 'three';
import { loadSkyModule, loadFoliageModule, loadGrassModule } from '../../shared/game.js';
import { LabWorld } from '../../shared/world.js';
import { standardBar } from '../../shared/workshop.js';
import { slider } from '../../shared/ui.js';
import { V3, TAU, rng, Bag, tube } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { thump, bell } from '../../shared/sound.js';
import { flag } from '../../shared/stage.js';
import { buildNest, twigGeometry, lining, eggTexture, feather } from './kit.js';

const $ = (s) => document.querySelector(s);

export async function makeNestStage(lab) {
  const [{ Sky }, F, GM] = await Promise.all([loadSkyModule(), loadFoliageModule(), loadGrassModule()]);
  const P = 12;
  const world = new LabWorld(lab, $('#stage'), {
    SkyClass: Sky, hour: +flag('hour', 16.5), plot: P, res: 1024, outer: 0x4e6a3c, shadowExtent: 11,
    paint: (x, res) => { x.fillStyle = '#6a6a4a'; x.fillRect(0, 0, res, res); const r = rng(3); for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(${90 + r() * 40},${100 + r() * 40},${60 + r() * 30},${0.08 + r() * 0.14})`; x.beginPath(); x.ellipse(r() * res, r() * res, 4 + r() * 18, 3 + r() * 10, r() * 3, 0, TAU); x.fill(); } },
    camera: { az: 0.5, el: 0.2, dist: 4.2, focus: [0, 0.55, 0] }, bounds: { x0: -8, x1: 8, z0: -8, z1: 8 }, catStart: { x: -2.4, z: 2.2, heading: 2.2 },
    views: { stage: { label: 'The nest', az: 0.5, el: 0.2, dist: 4.2, focus: [0, 0.55, 0] }, eye: { label: 'Cat-eye', eye: true }, wide: { label: 'Roof', az: 0.7, el: 0.28, dist: 8, focus: [0, 0.6, 0] } }
  });
  const scene = world.scene;
  // a broad flat stone for the nest to sit on, and a tiled roof slope behind
  {
    const rock = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.5, 0.24, 28), M.stone({ tint: 0x7f7a6e, moss: 0.6, lichen: 0.4 })); rock.position.y = 0.12; rock.castShadow = rock.receiveShadow = true; scene.add(rock);
    const tile = M.tile({}); const slope = new THREE.Mesh(new THREE.BoxGeometry(9, 0.16, 4), tile); slope.position.set(0, 1.4, -2.8); slope.rotation.x = 0.5; slope.castShadow = slope.receiveShadow = true; scene.add(slope);
    // This is a cutaway roof backdrop, seated on a matching timber/plaster shed.
    const shell = new THREE.BoxGeometry(8.6, 1, 3.2, 1, 1, 2), sp = shell.attributes.position;
    for (let i = 0; i < sp.count; i++) sp.setY(i, sp.getY(i) > 0 ? 1.4 - Math.tan(0.5) * sp.getZ(i) - 0.10 : 0);
    shell.computeVertexNormals(); const house = new THREE.Mesh(shell, M.plaster({ tint: 0xd6c8a8, grime: 0.3 })); house.position.z = -2.8; house.castShadow = house.receiveShadow = true; scene.add(house);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.24, 0.5), M.plain(0x2c3136, { rough: 0.6 })); ridge.position.set(0, 2.42, -4.5); scene.add(ridge);
  }
  const nestGroup = new THREE.Group(); nestGroup.position.y = 0.24; scene.add(nestGroup);
  const nest = buildNest(0.62, 3, 340);
  nestGroup.add(nest.im);
  const lin = lining(); lin.visible = false; nestGroup.add(lin);
  const eggs = new THREE.Group(); const eggM = new THREE.MeshStandardMaterial({ map: eggTexture(), roughness: 0.5 }); for (let i = 0; i < 3; i++) { const a = i / 3 * TAU, e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 14), eggM); e.scale.set(1, 1.35, 1); e.position.set(Math.cos(a) * 0.14, 0.16, Math.sin(a) * 0.14); e.castShadow = true; eggs.add(e); } eggs.visible = false; nestGroup.add(eggs);
  const gf = feather('#e0b84c'); gf.position.set(0.05, 0.42, 0.04); gf.rotation.set(0.5, 0.4, 0.3); gf.visible = false; nestGroup.add(gf);

  /* the bird */
  const bird = new THREE.Group();
  { const b = new Bag(); b.sphere(0.08, { sx: 0.7, sy: 0.75, sz: 1.2, color: 0x6a5444 }); b.sphere(0.05, { y: 0.03, z: 0.085, color: 0x7a6250 }); b.add(new THREE.ConeGeometry(0.015, 0.04, 6).rotateX(Math.PI / 2), { y: 0.03, z: 0.14, color: 0xd2a13a }); bird.add(b.mesh(M.bag({ rough: 0.8 }))); }
  const wingG = new THREE.BufferGeometry(); wingG.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.05, 0.2, 0.02, 0.02, 0.17, 0, -0.08, 0, 0, -0.08], 3)); wingG.setIndex([0, 1, 2, 0, 2, 3]); wingG.computeVertexNormals();
  const L = new THREE.Mesh(wingG, M.plain(0x54402f, { side: THREE.DoubleSide, rough: 0.8 })), R = L.clone(); R.scale.x = -1; bird.add(L, R); bird.scale.setScalar(1.2);
  const carried = new THREE.Mesh(tube([V3(0, 0, -0.16), V3(0, 0, 0.16)], 0.008, { radial: 5 }), M.plain(0x8a6a44)); carried.position.set(0, 0.04, 0.16); bird.add(carried);
  bird.visible = false; scene.add(bird);
  const st = { stage: 0, count: 0, auto: false, flying: 0, target: V3(), from: V3(), carry: true };
  const stages = [{ name: 'Coarse base', ph: 'base', to: 70 }, { name: 'Walls, tangent to the rim', ph: 'wall', to: 250 }, { name: 'Fine stuff at the rim', ph: 'rim', to: 340 }, { name: 'Pressed and lined', ph: 'done', to: 340 }];
  const label = $('#stage-name');
  const updateLabel = () => { const s = stages[st.stage]; label.textContent = s ? `${s.name} · ${nest.im.count} twigs` : 'Finished'; };

  const placeBatch = (n) => {
    const S = stages[st.stage];
    if (!S || S.ph === 'done') return;
    for (let i = 0; i < n && nest.im.count < S.to; i++) nest.add(S.ph, nest.im.count);
    updateLabel();
    if (nest.im.count >= S.to) nextStage();
  };
  const nextStage = () => {
    st.stage++;
    if (st.stage === 3) { lin.visible = true; eggs.visible = true; gf.visible = true; world.say('Lined with moss. Eggs, and something golden.'); bell(880, { vol: 0.12, dur: 1.4 }); updateLabel(); setTimeout(curl, 900); }
    updateLabel();
  };
  const curl = () => {
    if (!world.cat) return; const c = world.cat;
    c.goTo(0, 0.05);
    const id = setInterval(() => { if (Math.hypot(c.pos.x, c.pos.y - 0.05) < 0.28 || !c.target) { clearInterval(id); c.heading = 1.2; c.cat?.startIdleAction('sleep', 9999); world.say('Michi has found a good place to be.'); } }, 80);
  };
  let flight = 0, flightDur = 1.25;
  const startTrip = () => {
    const a = Math.random() * TAU, d = 7 + Math.random() * 3;
    st.from.set(Math.cos(a) * d, 3 + Math.random() * 1.5, Math.sin(a) * d);
    const r = Math.random() * 0.5, b = Math.random() * TAU;
    st.target.set(Math.cos(b) * r, 0.66, Math.sin(b) * r);
    bird.visible = true; flight = 0; st.flying = 1; carried.visible = true;
  };
  world.onUpdate = (dt, t) => {
    if (st.auto && !st.flying && st.stage < 3) startTrip();
    if (st.flying) {
      flight += dt / flightDur;
      const k = Math.min(1, flight), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const pos = st.from.clone().lerp(st.target, e); pos.y += Math.sin(k * Math.PI) * 1.2;
      bird.position.copy(pos);
      const dir = st.target.clone().sub(st.from); bird.rotation.y = Math.atan2(dir.x, dir.z);
      const flap = Math.sin(t * 26) * 0.9; L.rotation.z = flap; R.rotation.z = -flap;
      if (k >= 1) { if (st.flying === 1) { st.flying = 2; placeBatch(3); thump({ vol: 0.06, freq: 300 }); carried.visible = false; flight = 0; const tmp = st.from.clone(); st.from.copy(st.target); st.target.copy(tmp); } else { st.flying = 0; if (!st.auto) bird.visible = false; } }
    }
  };

  standardBar(world, $('#bar'));
  $('#btn-auto').addEventListener('click', (e) => { st.auto = !st.auto; e.currentTarget.textContent = st.auto ? 'Pause' : 'Send the bird →'; });
  $('#btn-add').addEventListener('click', () => { if (!st.flying) startTrip(); });
  $('#btn-skip').addEventListener('click', () => { while (st.stage < 3) { const S = stages[st.stage]; if (S.ph === 'done') break; placeBatch(S.to); } });
  $('#btn-reset').addEventListener('click', () => { nest.im.count = 0; nest.im.instanceMatrix.needsUpdate = true; st.stage = 0; st.auto = false; lin.visible = false; eggs.visible = false; gf.visible = false; $('#btn-auto').textContent = 'Send the bird →'; if (world.cat) { world.cat.cat?.endIdleAction?.(); world.cat.pos.set(-2.4, 2.2); } updateLabel(); });
  updateLabel();

  await world.loadForest(F, { near: 18, nearInner: 12, nearCount: 22 });
  world.loadGrass(GM, { paint: (m) => m.disc('excl', 0, 0, 1.6, 1, 0.5), zones: [['near', 0.14]] });
  await world.loadCat();
  world.chooseSpec = (spec) => { world.say(spec.name); };
  if (flag('built')) { for (let i = 0; i < 3; i++) placeBatch(400); }
  window.__nest = { world, st, nest };
  return world;
}
