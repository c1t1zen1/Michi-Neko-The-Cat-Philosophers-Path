// Villager defs and the modular NPC path (lane c3-villagers). Run: node tools/villagers_check.mjs
import * as THREE from 'three';
import { Cat } from '../src/cat.js?v=20261113a';
import { NPC } from '../src/npc.js?v=20261113a';
import { VILLAGER_DEFS } from '../src/characters/defs/index.js?v=20261113a';
import { GroomingBehaviour, groomPlan } from '../src/characters/behaviour/grooming.js?v=20261113a';
import { duskEyeShine } from '../src/characters/behaviour/dusk.js?v=20261113a';
import { validateCharacterDef } from '../src/characters/character.js?v=20261113a';

const results = [];
const check = (name, fn) => { try { const r = fn(); results.push([name, r === true || (r && r.ok), r && r.d || '']); } catch (e) { results.push([name, false, String(e.stack || e)]); } };
const walk = (o, f) => o.traverse(f);
const meshCount = (g) => { let n = 0; walk(g, (x) => { if (x.isMesh || x.isSkinnedMesh) n++; }); return n; };
const NAMES = ['Luna', 'Mochi', 'Kuro'];
const stub = (set, quality = 'medium') => ({ quality, setFor: () => set });
// the options src/main.js passes today (Luna none; Mochi and Kuro their coat)
const MAIN_OPTS = { Luna: {}, Mochi: { fur: 0xe8b06a, belly: 0xfaf0dc, accent: 0xb07840 },
  Kuro: { fur: 0x1c1c22, belly: 0x2e2e38, accent: 0x101014, eyeColor: 0xd8b04a } };
const mk = (name, assets) => new NPC(new THREE.Scene(), name, 0x3a3a3f, new THREE.Vector3(), [], { ...MAIN_OPTS[name], assets });
// NPC adds a DOM name tag; keep the page clean
const cleanup = () => document.querySelectorAll('.npc-nametag').forEach((e) => e.remove());

check('three defs valid, frozen, ids luna/mochi/kuro', () => Object.entries(VILLAGER_DEFS).every(([k, d]) =>
  d.id === k && Object.isFrozen(d) && validateCharacterDef(d).ok && d.build === k && d.personality.idle && d.personality.greeting));
for (const n of NAMES) {
  const k = n.toLowerCase(), d = VILLAGER_DEFS[k];
  check(`${n}: classic NPC cat == def cat (palette, face, scale, mesh count)`, () => {
    const classic = mk(n, stub('classic')).cat, via = new Cat({ def: { ...d, accessories: d.accessories.filter((a) => a.slot !== 'head') } }); // without the dusk head part (c2's, covered below)
    const hex = (m) => m.material && m.material.color ? m.material.color.getHex() : null;
    const colours = (c) => { const a = []; walk(c.group, (x) => { if (x.isMesh) a.push(hex(x)); }); return a.join(','); };
    return { ok: meshCount(classic.group) === meshCount(via.group) && colours(classic) === colours(via), d: `${meshCount(via.group)} meshes` };
  });
  check(`${n}: modular NPC uses the def (scale, idle profile, grooming)`, () => {
    const npc = mk(n, stub('modular'));
    return npc.modular && npc.cat.group.scale.x === d.scale && npc.cat.idleProfile === d.personality.idle && !!npc.grooming && npc.persona.greeting === d.personality.greeting;
  });
  check(`${n}: classic stays classic on set classic and on quality low`, () => {
    const a = mk(n, stub('classic')), b = mk(n, stub('modular', 'low')), c = mk(n, undefined);
    return !a.modular && !b.modular && !c.modular && !a.grooming && a.cat.group.scale.x === d.scale;
  });
}
check('personalities differ: three distinct grooming bouts and notice radii', () => {
  const b = Object.values(VILLAGER_DEFS).map((d) => d.personality.groom.bout.join('-'));
  return new Set(b).size === 3 && new Set(Object.values(VILLAGER_DEFS).map((d) => d.personality.notice)).size === 3;
});
check('GroomingBehaviour starts a groom bout at rest, within the def bout range, never while busy', () => {
  const d = VILLAGER_DEFS.luna;
  let u = 0.0; const rng = () => u;   // always chance-pass, shortest pause
  const g = new GroomingBehaviour(d.personality, rng);
  const log = [];
  const cat = { idleAction: null, startIdleAction(n, dur) { log.push([n, dur]); this.idleAction = n; } };
  for (let t = 0; t < 30; t += 0.1) g.update(0.1, cat, false);
  const idleNoRest = log.length === 0;
  for (let t = 0; t < 30 && !log.length; t += 0.1) g.update(0.1, cat, true);
  const [lo, hi] = d.personality.groom.bout;
  const busy = log.length; for (let t = 0; t < 60; t += 0.1) g.update(0.1, cat, true);
  return { ok: idleNoRest && log[0][0] === 'groom' && log[0][1] >= lo && log[0][1] <= hi && log.length === busy, d: JSON.stringify(log[0]) };
});
check('groomPlan is null without a groom entry', () => groomPlan(null) === null && groomPlan({ idle: {} }) === null);
check('modular grooming runs in a real NPC update (groom pose reached)', () => {
  const npc = mk('Luna', stub('modular'));
  npc.grooming.timer = 0; npc.grooming.rng = () => 0;
  npc.idleTimer = 1e9;   // stand still
  for (let i = 0; i < 20; i++) npc.update(1 / 60, new THREE.Vector3(30, 0, 30), null, null, null);
  return npc.cat.idleAction === 'groom';
});
const upd = (npc, hour, at = new THREE.Vector3(30, 0, 30)) => npc.update(1 / 60, at, null, { dayTime: hour }, null);
check('eye shine: the head part on modular villagers; 0 by day, >0.3 at night; none on classic', () => {
  const npc = mk('Kuro', stub('modular'));
  upd(npc, 12); const day = npc.cat.eyeShine;
  upd(npc, 22); const night = npc.cat.eyeShine;
  const slot = (npc.cat.def.accessories.find((a) => a.slot === 'head') || {}).part;
  return { ok: day === 0 && night > 0.3 && slot === 'eye-shine' && !mk('Kuro', stub('classic')).cat.setEyeShine, d: `day ${day} night ${night.toFixed(2)}` };
});
check('the dusk curve is the one canonical curve (17.3-19.5 h, 4.8-6.8 h)', () =>
  duskEyeShine(17.3) === 0 && Math.abs(duskEyeShine(19.5) - 1) < 1e-9 && duskEyeShine(12) === 0 && duskEyeShine(4.8) === 1 && duskEyeShine(6.8) === 0 && duskEyeShine(null) === 0);
check('far villagers (beyond 60 m) run neither eye shine nor grooming', () => {
  const npc = mk('Luna', stub('modular'));
  npc.grooming.timer = 0; npc.grooming.rng = () => 0; npc.idleTimer = 1e9;
  for (let i = 0; i < 20; i++) upd(npc, 22, new THREE.Vector3(200, 0, 200));
  return npc.cat.eyeShine === 0 && npc.cat.idleAction !== 'groom';
});
check('grooming never starts while asleep or on a schedule override', () => {
  const run = (setup) => {
    const npc = mk('Luna', stub('modular'));
    npc.grooming.timer = 0; npc.grooming.rng = () => 0; npc.idleTimer = 1e9;
    setup(npc);
    for (let i = 0; i < 20; i++) { setup(npc); upd(npc, 12); }
    return npc.cat.idleAction;
  };
  const asleep = run((n) => { n.sleeping = true; });
  const away = run((n) => { n.schedule = { rain: new THREE.Vector3(5, 0, 5) }; n.effHome = new THREE.Vector3(5, 0, 5); n.resolveRoutineHome = () => n.effHome; });
  return { ok: asleep !== 'groom' && away !== 'groom', d: `asleep ${asleep}, override ${away}` };
});
cleanup();
const out = results.map(([n, ok, d]) => `${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`).join('\n');
document.getElementById('out').textContent = out;
window.__villagers = { done: true, passed: results.filter((r) => r[1]).length, failed: results.filter((r) => !r[1]).length, out };
