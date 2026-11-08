// A dry garden. Place the five named stones on raked gravel, draw the rake in
// long arcs behind them, and let a hundred years of moss settle in.
import * as THREE from 'three';
import { loadSkyModule, loadFoliageModule, loadGrassModule } from '../../shared/game.js';
import { LabWorld } from '../../shared/world.js';
import { standardBar } from '../../shared/workshop.js';
import { seg, slider } from '../../shared/ui.js';
import { V3, TAU, rng } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { thump } from '../../shared/sound.js';
import { flag } from '../../shared/stage.js';
import { FORMS, stone, drawRakeStroke } from './kit.js';

const $ = (s) => document.querySelector(s);
const HALF = 9;

export async function makeRockStage(lab) {
  const [{ Sky }, F, GM] = await Promise.all([loadSkyModule(), loadFoliageModule(), loadGrassModule()]);
  const P = 14;
  const stones = [];
  const paintGround = (x, res, toPx, r) => {
    x.fillStyle = '#6b7c4e'; x.fillRect(0, 0, res, res);
    for (let i = 0; i < 1800; i++) { x.fillStyle = `rgba(${70 + r() * 40},${90 + r() * 40},${50 + r() * 25},${0.06 + r() * 0.1})`; x.beginPath(); x.ellipse(r() * res, r() * res, 5 + r() * 20, 3 + r() * 10, r() * 3, 0, TAU); x.fill(); }
    const [ax, ay] = toPx(-HALF, -HALF), [bx, by] = toPx(HALF, HALF);
    x.fillStyle = '#d6cfb9'; x.fillRect(ax, ay, bx - ax, by - ay);
    for (let i = 0; i < 26000; i++) { const px = ax + r() * (bx - ax), py = ay + r() * (by - ay); x.fillStyle = `rgba(${140 + r() * 90},${130 + r() * 90},${105 + r() * 90},${0.15 + r() * 0.3})`; x.beginPath(); x.arc(px, py, 0.5 + r() * 1.2, 0, TAU); x.fill(); }
    // long straight rake lines to start with
    for (let z = -HALF + 0.3; z < HALF; z += 0.7) { const [, py] = toPx(0, z); drawRakeStroke(x, [[ax, py], [bx, py]], 0, { lines: 5, spacing: 5, dark: 'rgba(90,82,62,.32)' }); }
  };
  const blocked = (x, z) => stones.some((s) => Math.hypot(s.x - x, s.z - z) < s.r);
  const world = new LabWorld(lab, $('#stage'), {
    SkyClass: Sky, hour: +flag('hour', 16), plot: P, res: 2048, paint: paintGround, outer: 0x5a7a44, shadowExtent: 15, blocked,
    camera: { az: 0.75, el: 0.42, dist: 15, focus: [0, 0.4, 0] }, bounds: { x0: -11, x1: 11, z0: -11, z1: 11 }, catStart: { x: 9.6, z: 7, heading: -2 },
    views: { stage: { label: 'The garden', az: 0.75, el: 0.42, dist: 15, focus: [0, 0.4, 0] }, kneel: { label: 'Kneel', az: 0.5, el: 0.1, dist: 7.5, focus: [0, 0.8, 0] }, eye: { label: 'Cat-eye', eye: true }, plan: { label: 'Plan', az: 0.6, el: 1.4, dist: 18, focus: [0, 0, 0] } }
  });
  const scene = world.scene, st = { form: 'taido', tool: 'place', moss: 0.2, drag: null };
  // a raised stone kerb round the gravel
  {
    const k = M.stone({ tint: 0x7f7a6e, moss: 0.4, lichen: 0.4 });
    for (const [x, z, w, d] of [[0, -HALF, HALF * 2 + 0.3, 0.3], [0, HALF, HALF * 2 + 0.3, 0.3], [-HALF, 0, 0.3, HALF * 2 + 0.3], [HALF, 0, 0.3, HALF * 2 + 0.3]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), k); m.position.set(x, 0.08, z); m.castShadow = m.receiveShadow = true; scene.add(m); }
  }
  const pick = world.addPick.bind(world);
  const place = (form, x, z, opts = {}) => {
    const seed = stones.length * 7 + 3 + Math.floor(Math.abs(x * 17 + z * 3));
    const m = stone(form, { seed, moss: st.moss, lichen: 0.4 + st.moss * 0.4, ...opts });
    const F = FORMS[form];
    m.position.set(x, F.h * 0.36 * (opts.scale ?? 1), z);
    m.rotation.y = seed * 0.73;
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    const rec = { m, x, z, r: Math.max(F.w, F.d) * 0.55 * (opts.scale ?? 1), form };
    stones.push(rec);
    pick(m, () => { if (st.tool === 'remove') { remove(rec); return; } world.say(`${F.label}: ${F.en.toLowerCase()}.`); }, F.label);
    return rec;
  };
  const remove = (rec) => { scene.remove(rec.m); stones.splice(stones.indexOf(rec), 1); thump({ freq: 110 }); };
  const clearAll = () => { for (const s of stones) scene.remove(s.m); stones.length = 0; };

  /* arrangements */
  const presets = {
    sanzon: () => { clearAll(); place('taido', 0, -1.4); const a = place('reisho', -1.5, -1, { scale: 0.85 }); a.m.rotation.z = -0.15; const b = place('reisho', 1.4, -0.7, { scale: 0.7 }); b.m.rotation.z = 0.2; place('shintai', -0.2, 0.9, { scale: 0.75 }); },
    shichigosan: () => { clearAll(); // 7 + 5 + 3
      const G = [[[-3.5, -2.5, 'taido', 1], [-4.5, -1.7, 'reisho', 0.8], [-2.4, -1.8, 'reisho', 0.6], [-3.9, -0.6, 'shintai', 0.6], [-2.1, -0.7, 'kikyaku', 0.5], [-5.2, -3.1, 'shigyo', 0.7], [-1.7, -3.3, 'shintai', 0.45]],
        [[3.4, -1.6, 'reisho', 0.9], [4.5, -0.8, 'shintai', 0.7], [2.5, -0.6, 'kikyaku', 0.55], [4.1, -2.6, 'shigyo', 0.55], [2.3, -2.7, 'shintai', 0.4]],
        [[0.2, 3.1, 'kikyaku', 0.75], [-1, 2.7, 'reisho', 0.55], [1.2, 2.5, 'shintai', 0.45]]];
      for (const set of G) for (const [x, z, f, s] of set) place(f, x, z, { scale: s }); world.say('Seven, five, three: the Ryōan-ji grouping is fifteen stones.'); },
    clear: () => { clearAll(); }
  };

  /* tools */
  const ctx = world.groundCtx, toPx = world.groundToPx, tex = world.groundTex;
  let rakeLast = null;
  world.onDragStart = (e) => {
    if (st.tool !== 'rake') return false;
    const p = world.groundAt(e); if (!p) return false;
    rakeLast = [toPx(p.x, p.z)];
    return true;
  };
  world.onDrag = (e) => {
    if (!rakeLast) return;
    const p = world.groundAt(e); if (!p) return;
    const q = toPx(p.x, p.z), last = rakeLast[rakeLast.length - 1];
    if (Math.hypot(q[0] - last[0], q[1] - last[1]) > 6) {
      rakeLast.push(q);
      const seg2 = rakeLast.slice(-3);
      if (seg2.length >= 2) { drawRakeStroke(ctx, seg2, 0, { lines: 7, spacing: 11 }); tex.needsUpdate = true; }
    }
  };
  world.onDragEnd = () => { rakeLast = null; };
  world.onGround = (p) => {
    if (st.tool === 'place' && Math.abs(p.x) < HALF - 0.3 && Math.abs(p.z) < HALF - 0.3) { place(st.form, p.x, p.z, { scale: 0.75 + Math.random() * 0.4 }); thump({ freq: 90, vol: 0.28 }); return true; }
    return st.tool !== 'walk' && Math.abs(p.x) < HALF && Math.abs(p.z) < HALF;
  };

  standardBar(world, $('#bar'));
  seg($('#seg-tool'), [{ v: 'place', label: 'Place a stone' }, { v: 'rake', label: 'Rake' }, { v: 'remove', label: 'Remove' }, { v: 'walk', label: 'Walk' }], 'place', (v) => { st.tool = v; world.say(v === 'rake' ? 'Drag across the gravel.' : v === 'place' ? 'Click the gravel to place a stone.' : ''); });
  seg($('#seg-form'), Object.entries(FORMS).map(([v, F]) => ({ v, label: F.en, title: F.label + ': ' + F.hint })), 'taido', (v) => { st.form = v; });
  slider($('#ctl'), { label: 'Years', min: 0, max: 1, step: 0.01, value: st.moss, fmt: (v) => `${Math.round(v * 200)} years`, onInput: (v) => { st.moss = v; const seen = new Set(); for (const s of stones) { const u = s.m.material.userData.u; if (!seen.has(u)) { u.uMoss.value = v * 1.3; u.uLichen.value = 0.3 + v * 0.7; seen.add(u); } } } });
  for (const [id, label] of [['sanzon', 'Sanzon triad'], ['shichigosan', '7 · 5 · 3'], ['clear', 'Clear']]) { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.addEventListener('click', () => presets[id]()); $('#presets').append(b); }

  await world.loadForest(F, { near: 26, nearInner: 13.5, nearCount: 26 });
  world.loadGrass(GM, { paint: (m) => m.rect('excl', 0, 0, HALF * 2 + 0.8, HALF * 2 + 0.8), zones: [['near', 0.14], ['thicket', 0.55]] });
  await world.loadCat();
  presets.shichigosan();
  world.chooseSpec = (spec) => { if (FORMS[spec.id]) { st.form = spec.id; $('#seg-form').querySelector(`[data-v=${spec.id}]`)?.click(); } else if (spec.id === 'sanzon') presets.sanzon(); world.say(spec.name); };
  window.__rocks = { world, st, presets };
  return world;
}
