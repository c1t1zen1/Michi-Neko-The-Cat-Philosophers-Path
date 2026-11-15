// build.js — the Roof Road's meshes, built from level.pieces.
//
// Every surface uses the game's painted procedural sets (src/textures.js):
// kawara, plaster, timber, namako, shoji, cobbles. Each piece is built in its
// own rail frame — local x along the rail (s − sMid), y up, z toward the
// camera (depth d) — then the static meshes are merged one per material, the
// way Countryside._mergeStatics() does it in the valley.
//
// This file is the facade: buildWorld() walks level.pieces and builds each
// through the PIECES table (pieces/index.js: one module per piece type under
// pieces/, the material set in pieces/paint.js, the shared geometry in
// pieces/common.js and pieces/machiya.js), then merges, adds the ground, the
// distant city, the skyline pagodas, the Shōki and the treats, and returns the
// per-frame update. Every piece goes through the asset contract
// (BUILD_GUIDE_FABLE.md §3.3–§3.4, R1.3): assets.build(PIECES[type].id,
// layout, classic) runs the classic builder unless that id resolves to a
// registered kit builder (opts.assets is the page's AssetRuntime; without one,
// or with no Roof Road kit asset, every piece is classic). So do the things
// buildWorld() adds around the run: the ground (roof-ground), the distant
// city (roof-distant-city), the skyline pagodas (roof-skyline-pagodas) and
// the pickups (roof-shoki, roof-treats); see extraLayout().
//
// Returns { root, dynamic: {...}, lights: [Vector3], update(t, night) }.

import * as THREE from 'three';
import { paintDowntown } from './downtown.js';
import { cameraObstacles } from './camera-obstacles.js';
import { openAlleyPassages } from './alley-passages.js';
import { makeMaterials } from './pieces/paint.js';
import { mergeByMaterial } from './pieces/common.js';
import { PIECES, downtown } from './pieces/index.js';
import { makeShoki, makeTreat } from './pieces/pickups.js';
import { buildDistantCity, buildPagoda } from './pieces/skyline.js';
import { scopeAssets, isAssetInstance } from '../../src/kit/runtime.js?v=20261114a';

/* ------------------------------------------------------------------ */
/*  Assembly                                                            */
/* ------------------------------------------------------------------ */

export { makeShoki } from './pieces/pickups.js';
export { PIECES } from './pieces/index.js';

/**
 * The layout a piece is built from (§3.4): plain data, no meshes. The frame is
 * the rail frame at the piece's middle — the frame most classic builders use
 * (frameGroup): local x along the rail, y up, z toward the camera (depth d) —
 * and a kit builder builds in it with the ground at y = 0. `piece` is the
 * level record itself (read-only: its heights, depths and platform ids are
 * gameplay, level.js). The facade registers no collision: every surface, wall
 * and ceiling belongs to level.js, so the footprint is empty and a kit piece
 * must draw the surfaces its `piece` names.
 *
 * `rail` is the route under a piece that spans [s0, s1] (null otherwise), for
 * what follows the rail rather than the middle frame: the canal, its banks,
 * the lines, and any piece across a fillet. railSamples() samples it exactly
 * as ribbon() (pieces/common.js) does, so a kit ribbon lands on the classic
 * one's vertices.
 */
export function pieceLayout(pc, index, rail) {
  const s = pc.s ?? (pc.s0 !== undefined ? (pc.s0 + (pc.s1 ?? pc.s0)) / 2 : 0);
  const p = rail.pointAt(s), t = rail.tangentAt(s);
  return {
    index, type: pc.type, piece: pc, s,
    x: p.x, y: 0, z: p.z, ry: Math.atan2(-t.z, t.x),
    rail: Number.isFinite(pc.s0) && Number.isFinite(pc.s1) ? railSamples(rail, pc.s0, pc.s1) : null,
    band: 'near',
    footprint: { colliders: [], exclusions: [], anchors: {} }
  };
}

/** ribbon()'s sample spacing along the rail (pieces/common.js). */
const RIBBON_STEP = 0.5;

/**
 * The rail over [s0, s1] as plain data, sampled the way ribbon() samples it:
 * n = max(1, ceil((s1 − s0) / 0.5)) equal steps, n + 1 points
 * { s, x, z, tx, tz } in world XZ, with the unit tangent t. The point at depth
 * d is (x − tz·d, z + tx·d), which is rail.place(s, d). Into the layout's
 * frame (c = cos ry, sn = sin ry, dx = x − layout.x, dz = z − layout.z):
 * local x = dx·c − dz·sn, local z = dx·sn + dz·c, and the same rotation turns
 * the tangent.
 */
function railSamples(rail, s0, s1) {
  const n = Math.max(1, Math.ceil((s1 - s0) / RIBBON_STEP));
  const points = [];
  for (let i = 0; i <= n; i++) {
    const s = s0 + ((s1 - s0) * i) / n;
    const p = rail.pointAt(s), t = rail.tangentAt(s);
    points.push({ s, x: p.x, z: p.z, tx: t.x, tz: t.z });
  }
  return { s0, s1, step: RIBBON_STEP, points };
}

/**
 * The layout of something buildWorld() adds around the run rather than from a
 * level piece (§3.4: plain data). World coordinates: (x, y, z) is where the
 * classic one stands and ry its heading; a kit builder builds at its own
 * origin. `more` adds what each needs: the ground's `size`, the city's `bounds`
 * and `route` (the rail sampled every 2 m as [x, z], to keep roofs off the
 * run), a pagoda's or pickup's `scale` (the classic one's size: buildPagoda's
 * scale argument, the pickup's model scale; the facade does not scale a kit
 * group) and a pickup's level record `pickup` (read-only, gameplay).
 */
export function extraLayout(type, index, x, y, z, ry, band, more = {}) {
  return { index, type, x, y, z, ry, band, ...more, footprint: { colliders: [], exclusions: [], anchors: {} } };
}

/**
 * Place a kit piece (an AssetInstance) where the classic one would stand:
 * its group in the layout's rail frame, merged with the static batches unless
 * the group itself is `live`; other `live` objects move to the root with their
 * world transforms (unmerged); sockets named `light…` become lantern lights;
 * `dynamic` entries join the world's moving pieces (arrays append, empty slots
 * fill), so a kit boat, float or villager is animated like the classic one.
 * merge: false (the extras, built after the statics were merged) puts the
 * whole group on the root, unmerged, as the classic extras are.
 */
function placePiece(out, layout, { ctx, root, lights, merge = true }) {
  const g = out.group;
  g.position.set(layout.x, layout.y, layout.z);
  g.rotation.set(0, layout.ry, 0);
  if (!merge || out.live.includes(g)) ctx.addDyn(g);
  else {
    ctx.add(g);
    g.updateMatrixWorld(true);
    for (const o of out.live) root.attach(o);
  }
  for (const [key, socket] of Object.entries(out.sockets)) {
    if (!key.startsWith('light')) continue;
    socket.updateWorldMatrix(true, false);
    lights.push(socket.getWorldPosition(new THREE.Vector3()));
  }
  for (const [key, value] of Object.entries(out.dynamic || {})) {
    if (Array.isArray(ctx.dynamic[key])) ctx.dynamic[key].push(...[].concat(value));
    else if (ctx.dynamic[key] == null) ctx.dynamic[key] = value;
  }
}

export function buildWorld(level, opts = {}) {
  const M = makeMaterials();
  paintDowntown(M);
  const rail = level.rail;
  const motionScale = opts.reduceMotion ? 0.22 : 1;
  const staticGroup = new THREE.Group();
  const glassGroup = new THREE.Group();
  const root = new THREE.Group();
  const lights = [];
  // The page's AssetRuntime, scoped to this world's material set (§3.3).
  const assets = scopeAssets(opts.assets, { MAT: M });
  const dynamic = { boat: null, boats: [], people: [], float: null, shoki: [], treats: [] };
  const ctx = {
    M, rail, dynamic, platforms: level.platforms, alleys: level.alleys,
    add: (o) => staticGroup.add(o),
    addGlass: (m) => { m.userData.glass = true; glassGroup.add(m); },
    addDyn: (o) => root.add(o),
    light: (r, s, y, d) => { const p = r.place(s, d); lights.push(new THREE.Vector3(p.x, y, p.z)); }
  };
  const counts = {};
  for (const pc of level.pieces) {
    const piece = PIECES[pc.type];
    if (!piece) throw new Error('No Roof Road renderer for ' + pc.type + ': add it to the PIECES table in rooftops/js/pieces/index.js');
    counts[pc.type] = (counts[pc.type] ?? -1) + 1;
    const layout = pieceLayout(pc, counts[pc.type], rail);
    const firstChild = staticGroup.children.length;
    const out = assets.build(piece.id, layout, () => {
      piece.build(pc, ctx);
      if (piece.decorate) piece.decorate(pc, ctx);
    });
    if (isAssetInstance(out)) placePiece(out, layout, { ctx, root, lights });
    for (const child of staticGroup.children.slice(firstChild)) {
      child.userData.alleyRoute = pc.type === 'alleyRoute';
      child.userData.corner = pc.type === 'corner';
    }
  }
  // Glass meshes were added inside frame groups: pull them out with their
  // world transforms so they merge into the transparent bucket.
  staticGroup.updateMatrixWorld(true);
  const glassFromFrames = [];
  staticGroup.traverse((o) => { if (o.isMesh && o.material === M.glass) glassFromFrames.push(o); });
  for (const m of glassFromFrames) {
    m.updateMatrixWorld(true);
    const c = new THREE.Mesh(m.geometry.clone().applyMatrix4(m.matrixWorld), m.material);
    glassGroup.add(c);
    m.parent.remove(m);
  }
  openAlleyPassages(staticGroup, level);
  openAlleyPassages(glassGroup, level);
  const obstacles = cameraObstacles(staticGroup);
  const fixedBatches = mergeByMaterial(staticGroup), glassBatches = mergeByMaterial(glassGroup, false);
  root.add(fixedBatches, glassBatches);

  // Only world-space scenery belongs to this distance culler. Boat and worker
  // batches are baked in their own local frames and move with their parents.
  const batches = [];
  for(const group of [fixedBatches,glassBatches]) group.traverse(o => { if (o.userData.spatialBatch) batches.push(o); });

  // Ground under everything, the distant roofscape and a pagoda on each side,
  // each through the asset contract like the pieces (a kit one goes on the
  // root, unmerged, where the classic one goes).
  const extra = (id, layout, classic) => {
    const out = assets.build(id, layout, classic);
    if (isAssetInstance(out)) placePiece(out, layout, { ctx, root, lights, merge: false });
    return out;
  };
  extra('roof-ground', extraLayout('ground', 0, 0, -0.7, 0, 0, 'near', { size: 1400 }), () => {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), M.ground);
    const groundUV=ground.geometry.attributes.uv, groundPosition=ground.geometry.attributes.position;
    for(let i=0;i<groundUV.count;i++)groundUV.setXY(i,groundPosition.getX(i)*.25,groundPosition.getY(i)*.25);
    M.ground.map=M.gravel.map;
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.7;
    ground.receiveShadow = true;
    root.add(ground);
  });
  const route = [];
  for (let s = 0; s <= level.length; s += 2) { const p = rail.pointAt(s); route.push([p.x, p.z]); }
  extra('roof-distant-city', extraLayout('distant-city', 0, 0, 0, 0, 0, 'far', { bounds: level.bounds ? { ...level.bounds } : null, route }),
    () => root.add(buildDistantCity(level, M)));
  const PAGODAS = [
    [150, -78, 1.35],    // east, behind the float streets
    [-40, 150, 1.6],     // south, over the market roofs
    [-170, -30, 1.1]     // west
  ];
  PAGODAS.forEach(([x, z, scale], i) => extra('roof-skyline-pagodas', extraLayout('skyline-pagoda', i, x, 0, z, 0, 'far', { scale }),
    () => root.add(buildPagoda(M, x, z, scale))));

  // Shōki and treats stay live so they can be greeted. A kit one is placed
  // unmerged at the classic spot and registered as the pickup itself.
  const pickupCount = { shoki: 0, treat: 0 };
  for (const k of level.pickups) {
    const p = rail.place(k.s, k.d);
    const t = rail.tangentAt(k.s);
    const index = pickupCount[k.kind === 'shoki' ? 'shoki' : 'treat']++;
    const layout = extraLayout(k.kind, index, p.x, k.y, p.z, Math.atan2(-t.z, t.x) + (k.face || 0), 'near',
      { s: k.s, scale: k.kind === 'shoki' ? 1.6 : 1.4, pickup: k });
    const out = extra(k.kind === 'shoki' ? 'roof-shoki' : 'roof-treats', layout, () => {
      const obj = k.kind === 'shoki' ? makeShoki(M) : makeTreat(M);
      obj.position.set(p.x, k.y, p.z);
      obj.rotation.y = Math.atan2(-t.z, t.x) + (k.face || 0);   // face the camera, then turn away
      obj.scale.setScalar(k.kind === 'shoki' ? 1.6 : 1.4);
      return obj;
    });
    const obj = isAssetInstance(out) ? out.group : out;
    obj.userData.pickup = k;
    if (!isAssetInstance(out)) root.add(obj);
    (k.kind === 'shoki' ? dynamic.shoki : dynamic.treats).push(obj);
  }

  // Kit instances that animate get the asset contract's update(dt, t, env).
  // The run's sky follows progress, not a clock: night 0 → 1 reads as 15:00 → 21:00.
  const assetEnv = { hour: 15, wind: 1, wet: 0, snow: 0, lanternOn: false };
  let lastT = null;

  return {
    root, dynamic, lights, M, obstacles,
    /** Advance moving pieces; night ∈ [0,1] kindles lanterns and windows. */
    update(t, night, platOffset, platforms, playerS = 0) {
      assetEnv.hour = 15 + 6 * night;
      assetEnv.lanternOn = night > 0.5;
      assets.update(lastT === null ? 0 : Math.max(0, t - lastT), t, assetEnv);
      lastT = t;
      downtown.updatePeople(dynamic.people, t, playerS, opts.lowPower, opts.reduceMotion);
      const player = rail.pointAt(playerS);
      for (const batch of batches) {
        const b = batch.geometry.boundingSphere;
        const range = (opts.lowPower ? 48 : 82) + b.radius;
        batch.visible = (b.center.x - player.x) ** 2 + (b.center.z - player.z) ** 2 < range * range;
      }
      for (const boat of dynamic.boats) {
        const p = platforms[boat.plat];
        boat.group.visible=Math.abs((p.s0+p.s1)/2+platOffset(p,t)-playerS)<(opts.lowPower?42:70);
        const off = platOffset(p, t);
        const s = (p.s0 + p.s1) / 2 + off;
        const pos = rail.place(s, boat.d);
        const tg = rail.tangentAt(s);
        const dt = boat.lastT == null ? 1 / 60 : Math.max(1 / 240, t - boat.lastT);
        const velocity = boat.lastS == null ? 0 : (s - boat.lastS) / dt;
        if (Math.abs(velocity) > 0.035) boat.dir = Math.sign(velocity);
        const pace = Math.min(1, Math.abs(velocity) / 3.2);
        boat.group.position.set(pos.x, 0.005 + Math.sin(t * 1.35) * (0.012 + pace * 0.012), pos.z);
        boat.group.rotation.set(Math.sin(t * 0.9) * 0.012 * pace, Math.atan2(-tg.z, tg.x), Math.sin(t * 1.17) * 0.008 * pace);
        boat.wake.scale.x = boat.dir;
        boat.wake.visible = pace > 0.035;
        M.wake.opacity = 0.08 + pace * 0.34;
        boat.boatman.rotation.y = boat.dir < 0 ? Math.PI : 0;
        boat.pole.rotation.z = -0.48 + boat.dir * 0.14 + Math.sin(t * 1.5) * 0.12 * pace;
        boat.boatman.rotation.z = Math.sin(t * 1.5 + 0.7) * 0.035 * pace;
        boat.lastS = s;
        boat.lastT = t;
      }
      if (dynamic.float) {
        const hoko = dynamic.float;
        hoko.group.visible = Math.abs(playerS - level.mouths[6].s0) < 65;
        for (const tassel of hoko.tassels) {
          const u = t * motionScale + tassel.userData.phase;
          tassel.rotation.z = Math.sin(u * 1.35) * 0.055 * motionScale;
          tassel.rotation.x = Math.cos(u * 0.93) * 0.035 * motionScale;
        }
        for (const person of hoko.musicians) {
          const u = t * motionScale + person.userData.phase;
          person.rotation.z = Math.sin(u * 1.7) * 0.018 * motionScale;
          person.position.y = person.userData.baseY + Math.sin(u * 1.7) * 0.008 * motionScale;
        }
      }
      for (const water of [M.water, M.kamoWater]) {
        water.uniforms.uTime.value = t;
        water.uniforms.uNight.value = night;
      }
      for (const mat of [...M.cloth, ...Object.values(M.noren), ...M.brocade]) {
        if (mat.userData.windShader) mat.userData.windShader.uniforms.uRoofTime.value = t;
      }
      M.lanternRed.emissiveIntensity = 0.15 + night * 1.6;
      M.lanternWhite.emissiveIntensity = 0.15 + night * 1.5;
      M.shoji.emissiveIntensity = night * 0.9;
      M.koshi.emissiveIntensity = night * 0.5;
      for (const mat of [M.blossom, M.blossomPale, M.blossomRose]) mat.emissiveIntensity = night * 0.25;
      for (const s of dynamic.shoki) if (s.visible && s.children[0]) s.children[0].rotation.y = Math.sin(t * 0.7 + s.position.x) * 0.06;
    }
  };
}
