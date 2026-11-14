// tea-interior: the whole room as one kit asset (Hisomu-an's zashiki).
// A kit parent replaces the whole (handoff f3 §4): it builds every part the
// classic room routes under its own ids, composed from the same builders the
// standalone ids use, plus the engawa and courtyard, the grilled fish (part
// `fish`, bound to InteriorManager.fishMesh) and the room's two lights. The
// andon and the courtyard toro are the lanterns family's builders.
import * as THREE from 'three';
import { Bag } from '../craft.js?v=20261113a';
import { buildAndon, buildStoneLantern } from '../lanterns/build.js?v=20261113a';
import { TexBag, roomMats, bagMesh, groupOf, tierFlags, paperMat, shojiLight } from './common.js?v=20261113a';
import { buildTatami, buildFrame, buildDoor, buildTokonoma, buildScroll, buildChabudai } from './room.js?v=20261113a';
import { buildZabuton, buildBonsai, buildTeaware, buildFishPlatter } from './small.js?v=20261113a';

/** Engawa boards, the raked gravel court with its stones, and the courtyard's timber wall. Room frame. */
export function buildCourtyard(ctx, tier = 'hero') {
  const { hi, far } = tierFlags(tier), m = roomMats(ctx), rng = ctx.rng;
  const deck = new TexBag(m.engawa).box(1.6, 0.22, 4.4, 4.9, 0.11, 0);
  const ground = new TexBag(m.plaster).box(4.0, 0.1, 6.0, 7.2, -0.05, 0);
  const wall = new TexBag(m.timber).box(0.3, 3.2, 6.4, 9.2, 1.6, 0).box(5.0, 3.2, 0.3, 6.8, 1.6, -3.2).box(5.0, 3.2, 0.3, 6.8, 1.6, 3.2);
  const trim = new Bag();
  if (!far) {
    for (let i = 0; i < 11; i++) trim.box(1.6, 0.004, 0.012, { x: 4.9, y: 0.222, z: -2.0 + i * 0.4, color: 0x4a2f1a });          // board gaps
    const lines = hi ? 24 : 12, step = 3.6 / lines;
    for (let k = 0; k < lines; k++) trim.box(0.035, 0.012, 5.6, { x: 5.4 + k * step + step / 2, y: 0.005, z: 0, color: 0xb9b3a0 });    // rake ridges
    for (const [x, z, s] of [[6.1, 1.7, 0.2], [8.3, 1.9, 0.16], [8.6, -2.2, 0.22]]) {
      const g = new THREE.DodecahedronGeometry(s, 0);
      trim.add(g, { x, y: 0.03, z, sy: 0.55, ry: rng() * 3, color: 0x7f857b });
    }
    if (hi) for (let i = 0; i < 11; i++) {                                                                                              // battens on the wall faces
      trim.box(0.03, 3.2, 0.07, { x: 9.035, y: 1.6, z: -3.0 + i * 0.6, color: 0x2e1d12 });
      if (i < 8) for (const s of [-1, 1]) trim.box(0.07, 3.2, 0.03, { x: 4.8 + i * 0.6, y: 1.6, z: s * 3.035, color: 0x2e1d12 });
    }
  }
  return groupOf('Courtyard', deck.mesh('engawa'), ground.mesh('gravel'), wall.mesh('wall'), bagMesh(trim, m.bag, 'trim', false));
}

export function buildTeaInterior(ctx, layout, p) {
  const { tier } = ctx;
  const L = layout || {};
  const root = new THREE.Group();
  const parts = {}, live = [], updates = [], disposers = [];
  const put = (key, g, x = 0, y = 0, z = 0) => { g.name = ''; g.position.set(x, y, z); root.add(g); parts[key] = g; return g; };
  const at = (rec, d) => [(rec && rec.x) ?? d[0], (rec && rec.y) ?? d[1], (rec && rec.z) ?? d[2]];

  put('tatami', buildTatami(ctx, L.tatami, tier));
  put('frame', buildFrame(ctx, L.frame, tier));
  put('tokonoma', buildTokonoma(ctx, L.tokonoma, tier, { earth: p.wall_earth }));
  put('scroll', buildScroll(ctx, L.scroll, tier), ...at(L.scroll, [0, 0.8, -3.42]));
  put('bonsai', buildBonsai(ctx, L.bonsai, tier), ...at(L.bonsai, [0.9, 0.21, -3.0]));
  const tz = (L.chabudai && L.chabudai.z) ?? -0.2;
  put('chabudai', buildChabudai(ctx, L.chabudai, tier), 0, 0, tz);
  const tw = at(L.teaware, [-0.45, 0.49, -0.25]);
  put('teaware', buildTeaware(ctx, L.teaware, tier), tw[0], tw[1], tw[2] + tz);
  const fl = at(L.fish, [0.3, 0.49, 0.1]);
  const dish = buildFishPlatter(ctx, tier);
  put('platter', dish.plate, fl[0], fl[1], fl[2] + tz);
  put('fish', dish.fish, fl[0], fl[1], fl[2] + tz);
  put('zabuton', buildZabuton(ctx, L.zabuton, tier, { cushion: p.cushion }), ...at(L.zabuton, [-2.2, 0, -1.2]));
  put('door', buildDoor(ctx, L.door, tier), ...at(L.door, [0, 0, 3.6]));
  put('courtyard', buildCourtyard(ctx, tier));

  // the lanterns family's andon and courtyard toro (their own live parts and update)
  const ap = at(L.andon, [2.8, 0, -2.2]), tp = at(L.toro, [7.2, 0, -1.2]);
  const andon = buildAndon(ctx, { index: 0 }, { flame: p.lamp_warmth });
  const toro = buildStoneLantern(ctx, { index: 0 }, { girth: 1, flame: p.lamp_warmth }, { kind: 'kasuga', height: 1.04, kasaR: 0.275, halo: null, always: 0.9 });
  put('andon', andon.group, ap[0], ap[1], ap[2]);
  put('toro', toro.group, tp[0], tp[1], tp[2]);
  for (const inst of [andon, toro]) { live.push(...(inst.live || [])); if (inst.update) updates.push(inst.update); if (inst.dispose) disposers.push(inst.dispose); }

  // the room's two lights stay dark until the cat is inside (a light in the scene costs every fragment)
  const lamp = new THREE.PointLight(0xffb855, 7.5, 12, 1.4);
  lamp.name = 'Andon Glow Light'; lamp.position.set(ap[0], 1.2, ap[2]); lamp.visible = false;
  const fill = new THREE.PointLight(0xffdfa8, 4.5, 14, 1.2);
  fill.name = 'Room Fill Light'; fill.position.set(0, 2.6, 0); fill.visible = false;
  root.add(lamp, fill);
  const lights = [lamp, fill];
  const paper = paperMat(ctx);
  shojiLight(paper, 12);
  let called = false;
  const setLightsActive = (on) => { called = true; for (const l of lights) l.visible = on; };
  const ROOM_ENV = { hour: 22, wind: 0, wet: 0, snow: 0, lanternOn: true };   // the indoor lamps are lit at any hour, as in the classic room
  let warned = 0;
  return {
    group: root, parts, sockets: {}, live,
    setLightsActive,
    update(dt, t, env) {
      shojiLight(paper, env && env.hour);
      for (const u of updates) u(dt, t, ROOM_ENV);
      if (!called && ++warned === 600 && typeof console !== 'undefined') console.warn('[kit] tea-interior: setLightsActive() was never called, the room lights stay off (InteriorManager must forward it)');
    },
    dispose() { for (const d of disposers) d(); }
  };
}
