// The two stairways of the summit: the stepped torii approach (`summit-entry`:
// seven treads, the landing, rope rails, the entrance torii and a pair of toro)
// and the lower stone path that carries on down through the trees
// (`summit-path`: fifteen fitted treads, rope posts, two more toro). Both build
// in summit-local space (the layout puts the group at the summit origin) from
// the classic constants, so the physics boxes in the layout footprint stay true.
//
// Reuses: the shrine family's torii (pegs off, the span is the classic
// 2 x 1.8 m so the two collider pillars match), the lanterns family's stone
// toro, and the kit's shared cord and dark timber.
import * as THREE from 'three';
import { merge, indexed } from '../craft.js?v=20261113a';
import { resolveParams } from '../contract.js?v=20261113a';
import { assets as gateAssets } from '../shrine/gate.js?v=20261113a';
import { buildStoneLantern } from '../lanterns/build.js?v=20261113a';
import { castMesh, byTier } from '../shrine/util.js?v=20261113a';
import {
  MEADOW_Y, CORRIDOR_Z0, GATE_Z, ENTRY_Y, STEP_COUNT, STEP_RUN, STEP_RISE, LANDING_Z0, LANDING_Z1,
  LOWER_STEP_COUNT, LOWER_STEP_RUN, approachTopAt, lowerStepTopAt
} from '../../summit/common.js?v=20261113a';

const TORII = gateAssets.find((a) => a.id === 'torii');
const TORII_SCALE = 0.56;

/** Warm dressed stone for the stairs: the stone texture, sun-bleached; the family's one new merged stone. */
const warmStone = (km) => km.stone({ tint: 0xb4aa92, seed: 6 });

/** A slab with its top edge hand-cut: the top face's corners nudged so no two treads are quite level. */
function slab(w, h, d, x, y, z, rnd, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) > 0) pos.setY(i, pos.getY(i) + (rnd() - 0.5) * 0.012);
  g.computeVertexNormals();
  g.rotateY(ry).translate(x, y, z);
  return g;
}

function post(x, y, z, lean, tier) {
  return new THREE.CylinderGeometry(0.07, 0.1, 1.05, byTier(tier, 8, 6, 4)).rotateZ(lean).translate(x, y, z);
}

function rope(points, tier, r = 0.026) {
  const seg = byTier(tier, 44, 22, 10);
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), seg, r, byTier(tier, 6, 5, 3), false);
}

/** The two toro both stairs share: kasuga, unlit halo (the summit's own glow material, as classic). */
function toro(ctx, index, height, kasaR, p) {
  return buildStoneLantern(ctx, { index }, p, { kind: 'kasuga', height, kasaR, halo: null, ownHalo: false });
}

function addToro(group, lanterns, ctx, x, y, z, ry, height, kasaR, index) {
  const lamp = toro(ctx, index, height, kasaR, { girth: 1, flame: 0.5 });
  lamp.group.position.set(x, y, z);
  lamp.group.rotation.y = ry;
  group.add(lamp.group);
  lanterns.push(lamp);
}

const chain = (lanterns) => ({
  update(dt, t, env) { for (const l of lanterns) l.update && l.update(dt, t, env); },
  dispose() { for (const l of lanterns) l.dispose && l.dispose(); }
});

/* ------------------------------------------------------------------ entry --- */

export function buildEntry(ctx, layout, p) {
  const { tier, rng, kitMaterials: km } = ctx;
  const rnd = rng;
  const stone = warmStone(km), timber = km.shared('darkWood'), cord = km.shared('cord');
  const group = new THREE.Group(), parts = {};
  const approach = new THREE.Group();
  group.add(approach); parts.approach = approach;

  const tread = [];
  for (let i = 0; i < STEP_COUNT; i++) {
    const z0 = CORRIDOR_Z0 + i * STEP_RUN, top = approachTopAt(z0), width = 5.7 - i * 0.09;
    tread.push(slab(width, 0.34, STEP_RUN + 0.08, 0, top - 0.17, z0 + STEP_RUN * 0.5, rnd));
  }
  const landingDepth = LANDING_Z1 - LANDING_Z0;
  tread.push(slab(5.25, 0.45, landingDepth, 0, ENTRY_Y - 0.225, LANDING_Z0 + landingDepth * 0.5, rnd));
  const steps = castMesh(indexed(merge(tread)), stone);
  approach.add(steps); parts.steps = steps;

  // rope rails along both sides, every tread
  const posts = [], ropes = [];
  for (const side of [-1, 1]) {
    const high = [], low = [];
    for (let i = 0; i <= STEP_COUNT; i++) {
      const z = CORRIDOR_Z0 + i * STEP_RUN, top = Math.max(ENTRY_Y, MEADOW_Y - Math.min(STEP_COUNT - 1, i) * STEP_RISE);
      const x = side * (2.95 - i * 0.045);
      posts.push(post(x, top + 0.52, z + 0.22, -side * 0.025, tier));
      high.push(new THREE.Vector3(x, top + 0.96, z + 0.22));
      low.push(new THREE.Vector3(x, top + 0.62, z + 0.22));
    }
    ropes.push(rope(high, tier), rope(low, tier));
  }
  const postMesh = castMesh(indexed(merge(posts)), timber, { receive: false });
  const ropeMesh = castMesh(indexed(merge(ropes)), cord, { cast: false, receive: false });
  approach.add(postMesh, ropeMesh); parts.posts = postMesh; parts.rope = ropeMesh;

  // the entrance torii: the shrine family's gate at the classic span, pegs off
  const { values } = resolveParams(TORII.params, { pegs: false });
  const gate = TORII.build(ctx, { index: 0 }, values);
  gate.group.scale.setScalar(TORII_SCALE);
  gate.group.position.set(0, ENTRY_Y, GATE_Z);
  approach.add(gate.group); parts.torii = gate.group;

  // a pair of toro on the lower landing
  const lanterns = [];
  const lz = (LANDING_Z0 + LANDING_Z1) / 2 + 0.05;
  for (const side of [-1, 1]) addToro(approach, lanterns, ctx, side * 2.15, ENTRY_Y, lz, side * 0.2, 1.62, 0.4, side < 0 ? 0 : 1);
  const live = lanterns.flatMap((l) => l.live || []);
  return { group, parts, sockets: {}, live, ...chain(lanterns) };
}

/* ------------------------------------------------------------------- path --- */

export function buildLowerPath(ctx, layout, p) {
  const { tier, rng: rnd, kitMaterials: km } = ctx;
  const warm = warmStone(km), cool = km.shared('stone'), timber = km.shared('darkWood'), cord = km.shared('cord');
  const group = new THREE.Group(), parts = {};
  const path = new THREE.Group();
  group.add(path); parts.path = path;

  const a = [], b = [], joints = [];
  for (let i = 0; i < LOWER_STEP_COUNT; i++) {
    const z0 = LANDING_Z1 + i * LOWER_STEP_RUN, top = lowerStepTopAt(z0 + 0.01), width = 4.4 - i * 0.06;
    const pieces = rnd() < 0.5 ? 2 : 3;
    let left = -width / 2;
    for (let k = 0; k < pieces; k++) {
      const remaining = width / 2 - left;
      const w = k === pieces - 1 ? remaining : remaining / (pieces - k) * (0.75 + rnd() * 0.5);
      const g = slab(w - 0.07, 0.72, LOWER_STEP_RUN - 0.06 - rnd() * 0.08, left + w / 2,
        top - 0.36 + (rnd() - 0.5) * 0.03, z0 + LOWER_STEP_RUN * 0.5 + (rnd() - 0.5) * 0.06, rnd, (rnd() - 0.5) * 0.05);
      (rnd() < 0.55 ? a : b).push(g);
      left += w;
      if (tier === 'hero' && k < pieces - 1) joints.push(new THREE.BoxGeometry(0.03, 0.03, LOWER_STEP_RUN * 0.7).translate(left, top + 0.012, z0 + LOWER_STEP_RUN * 0.5));
    }
  }
  for (const [list, mat, name] of [[a, warm, 'stones_warm'], [b, cool, 'stones_grey']]) {
    if (!list.length) continue;
    const m = castMesh(indexed(merge(list)), mat);
    path.add(m); parts[name] = m;
  }
  if (joints.length) {
    const m = castMesh(indexed(merge(joints)), km.shared('moss'), { cast: false });
    path.add(m); parts.moss = m;
  }

  const posts = [], ropes = [];
  for (const side of [-1, 1]) {
    const points = [];
    for (let i = 0; i <= LOWER_STEP_COUNT; i += 2) {
      const z = LANDING_Z1 + 0.35 + i * LOWER_STEP_RUN, x = side * (2.55 - i * 0.035), top = lowerStepTopAt(z + 0.01);
      posts.push(post(x, top + 0.46, z, -side * 0.025 + (rnd() - 0.5) * 0.05, tier));
      points.push(new THREE.Vector3(x, top + 0.9, z));
    }
    for (const dy of [0, -0.34]) {
      ropes.push(rope(points.map((q, i) => q.clone().add(new THREE.Vector3(0, dy - (i > 0 && i < points.length - 1 ? 0.1 : 0), 0))), tier, 0.024));
    }
  }
  const postMesh = castMesh(indexed(merge(posts)), timber, { receive: false });
  const ropeMesh = castMesh(indexed(merge(ropes)), cord, { cast: false, receive: false });
  path.add(postMesh, ropeMesh); parts.posts = postMesh; parts.rope = ropeMesh;

  // a second pair of toro partway down, on a buried footing so the slope never shows a gap
  const lanterns = [];
  const z = LANDING_Z1 + 5.5 * LOWER_STEP_RUN;
  const footings = [];
  for (const side of [-1, 1]) {
    // the classic height (terrain - 0.05) comes with the layout; the step top is only the fallback
    const y = (layout.lanternY && Number.isFinite(layout.lanternY[side < 0 ? 0 : 1])) ? layout.lanternY[side < 0 ? 0 : 1] : lowerStepTopAt(z) - 0.12;
    addToro(path, lanterns, ctx, side * 3.15, y, z, (rnd() - 0.5) * 0.3, 1.5, 0.38, 2 + (side < 0 ? 0 : 1));
    footings.push(new THREE.BoxGeometry(0.46, 0.3, 0.46).translate(side * 3.15, y - 0.15, z));
  }
  const foot = castMesh(indexed(merge(footings)), cool, { cast: false });
  path.add(foot); parts.footings = foot;
  const live = lanterns.flatMap((l) => l.live || []);
  return { group, parts, sockets: {}, live, ...chain(lanterns) };
}
