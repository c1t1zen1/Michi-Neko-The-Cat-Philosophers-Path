import * as THREE from 'three';
import {
  compilePrims, sculptGeometry, bakeSkin, evalField, evalGradient,
  compileChain, accumulateChain, writeTopBones
} from './cat_sdf.js?v=20261022d';

/**
 * Cat anatomy: skeleton landmarks, sculpt primitives and the derived
 * geometry for one body type ("build"). Everything here is in the cat's body
 * space at rest — +Z forward, +Y up, X across (the cat's left is +X), paw
 * pads resting on y = GROUND.
 *
 * Proportions follow a domestic shorthair, gently stylised: a deep keeled
 * ribcage that tucks up into the waist, a pelvis carried slightly higher
 * than the withers, near-vertical forelegs with a visible elbow point, and
 * hind legs in the feline zig-zag (thigh forward to the stifle, shin back to
 * a high hock, long metatarsus down to the toes). The tail is about half the
 * body length.
 *
 * Geometry is cached per build, so NPCs that share proportions share
 * buffers; every Cat still gets its own skeleton.
 */

export const GROUND = 0.015;

// Stylised head scale: a little larger than life, as in the painted films.
const HEAD_BASE = 1.22;

export const BUILDS = {
  michi: { girth: 1.0, leg: 0.96, head: 1.0, tail: 1.0, cheeks: 1.0 },
  luna: { girth: 0.93, leg: 1.0, head: 0.97, tail: 1.08, cheeks: 0.94 },
  mochi: { girth: 1.12, leg: 0.9, head: 1.05, tail: 0.9, cheeks: 1.14 },
  kuro: { girth: 0.98, leg: 1.02, head: 1.02, tail: 1.1, cheeks: 1.0 }
};

const SIDES = [[-1, 'R'], [1, 'L']];
const v3 = (x, y, z) => [x, y, z];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => scale(a, 1 / len(a));
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Skeleton landmarks for a build (body space, rest pose). */
function landmarks(b) {
  // Leg length raises everything above the paws; girth widens the trunk.
  const ly = (y) => GROUND + (y - GROUND) * b.leg;
  const trunkY = ly(0.45);
  const L = {
    hips: v3(0, trunkY, -0.17),
    chest: v3(0, trunkY, 0.12),
    neck: v3(0, trunkY + 0.07, 0.245),
    head: v3(0, trunkY + 0.165, 0.335),
    front: {},
    hind: {}
  };
  for (const [s, k] of SIDES) {
    const fx = s * 0.066 * b.girth;
    L.front[k] = {
      scap: v3(s * 0.05 * b.girth, trunkY + 0.095, 0.115),
      shoulder: v3(s * 0.072 * b.girth, ly(0.41), 0.212),
      elbow: v3(fx, ly(0.287), 0.138),
      wrist: v3(fx, ly(0.078), 0.150),
      knuckle: v3(fx, GROUND + 0.017, 0.172),
      toe: v3(fx, GROUND + 0.008, 0.214)
    };
    const hx = s * 0.07 * b.girth;
    const hip = v3(hx, ly(0.43), -0.175);
    const stifle = v3(hx, ly(0.275), -0.095);
    const hock = v3(hx, ly(0.13), -0.225);
    // Pantograph rest pose: the metatarsus runs parallel to the femur, so
    // the leg IK can treat thigh + metatarsus as one link.
    const u = norm(sub(stifle, hip));
    const meta = (hock[1] - (GROUND + 0.025)) / -u[1];
    const ball = add(hock, scale(u, meta));
    L.hind[k] = { hip, stifle, hock, ball, toe: add(ball, v3(0, -0.017, 0.046)) };
  }
  const tailLen = 0.35 * b.tail;
  const tailDir = norm(v3(0, -0.22, -1));
  const tailBase = v3(0, trunkY + 0.06, -0.302);
  L.tail = [];
  for (let i = 0; i <= 6; i++) L.tail.push(add(tailBase, scale(tailDir, (tailLen * i) / 6)));
  L.tailDir = tailDir;
  L.tailLen = tailLen;
  return L;
}

/** Bone list: { name, parent, pos } in body space. Order = skeleton order. */
function boneDefs(L) {
  const B = [
    { name: 'body', parent: null, pos: v3(0, 0, 0) },
    { name: 'hips', parent: 'body', pos: L.hips },
    { name: 'chest', parent: 'body', pos: L.chest },
    { name: 'neck', parent: 'chest', pos: L.neck },
    { name: 'head', parent: 'neck', pos: L.head }
  ];
  for (const [, k] of SIDES) {
    const f = L.front[k];
    B.push({ name: 'scap' + k, parent: 'chest', pos: f.scap });
    B.push({ name: 'humerus' + k, parent: 'scap' + k, pos: f.shoulder });
    B.push({ name: 'forearm' + k, parent: 'humerus' + k, pos: f.elbow });
    B.push({ name: 'wrist' + k, parent: 'forearm' + k, pos: f.wrist });
    B.push({ name: 'fpaw' + k, parent: 'wrist' + k, pos: f.knuckle });
  }
  for (const [, k] of SIDES) {
    const h = L.hind[k];
    B.push({ name: 'femur' + k, parent: 'hips', pos: h.hip });
    B.push({ name: 'tibia' + k, parent: 'femur' + k, pos: h.stifle });
    B.push({ name: 'meta' + k, parent: 'tibia' + k, pos: h.hock });
    B.push({ name: 'hpaw' + k, parent: 'meta' + k, pos: h.ball });
  }
  for (let i = 0; i < 6; i++) {
    B.push({ name: 'tail' + i, parent: i === 0 ? 'hips' : 'tail' + (i - 1), pos: L.tail[i] });
  }
  return B;
}

/** Body sculpt: trunk, neck and the four legs as one smooth coat. */
function bodyPrims(L, b) {
  const g = b.girth;
  const Y = L.chest[1] - 0.45;
  const P = [];
  const E = (c, r, opt = {}) => P.push({ type: 'ellipsoid', c, r, ...opt });
  const C = (a, bb, ra, rb, opt = {}) => P.push({ type: 'cone', a, b: bb, ra, rb, ...opt });

  // Trunk: ribcage → waist → pelvis, with the deep sternum keel between
  // the forelegs and a soft belly line that tucks up toward the flank.
  E(v3(0, 0.448 + Y, 0.112), v3(0.102 * g, 0.128 * g, 0.165), { region: 'trunk' });
  E(v3(0, 0.392 + Y, 0.198), v3(0.066 * g, 0.088 * g, 0.088), { blend: 0.065, region: 'trunk' });
  E(v3(0, 0.458 + Y, -0.072), v3(0.1 * g, 0.102 * g, 0.15), { blend: 0.07, region: 'trunk' });
  E(v3(0, 0.468 + Y, -0.2), v3(0.098 * g, 0.104 * g, 0.112), { blend: 0.06, region: 'trunk' });
  E(v3(0, 0.392 + Y, -0.118), v3(0.068 * g, 0.05 * g, 0.1), { blend: 0.06, region: 'trunk' });
  // Chest ruff under the throat and the neck rising to the skull
  E(v3(0, 0.462 + Y, 0.238), v3(0.074 * g, 0.088 * g, 0.072), { blend: 0.055, region: 'neck' });
  C(v3(0, 0.468 + Y, 0.17), add(L.head, v3(0, -0.035, -0.045)), 0.092 * g, 0.07, { blend: 0.055, region: 'neck' });

  for (const [s, k] of SIDES) {
    const f = L.front[k];
    const reg = 'front' + k;
    // Scapula: a flat blade sloping from the withers down to the shoulder
    E(lerp3(f.scap, f.shoulder, 0.42), v3(0.036 * g, 0.082, 0.058), { rot: [-0.62, 0, s * 0.1], blend: 0.06, region: reg });
    // Upper arm (mostly inside the chest silhouette) and the elbow point
    C(f.shoulder, f.elbow, 0.048 * g, 0.036, { blend: 0.045, region: reg });
    E(add(f.elbow, v3(0, 0.004, -0.014)), v3(0.026, 0.03, 0.026), { blend: 0.025, region: reg });
    // Forearm: muscular at the top, slim at the wrist
    C(f.elbow, f.wrist, 0.036, 0.024, { blend: 0.03, region: reg });
    E(lerp3(f.elbow, f.wrist, 0.26), v3(0.033, 0.065, 0.036), { blend: 0.03, region: reg });
    // Pastern and the rounded mitten of the paw
    C(f.wrist, add(f.knuckle, v3(0, 0.008, 0)), 0.024, 0.026, { blend: 0.02, region: reg });
    E(v3(f.knuckle[0], GROUND + 0.024, f.knuckle[2] + 0.017), v3(0.028, 0.022, 0.035), { blend: 0.018, region: reg });
  }
  for (const [s, k] of SIDES) {
    const h = L.hind[k];
    const reg = 'hind' + k;
    // Haunch: the big thigh mass, broad at the hip, narrowing to the stifle
    E(add(lerp3(h.hip, h.stifle, 0.36), v3(-s * 0.008, 0.01, -0.012)), v3(0.05 * g, 0.112, 0.092), { rot: [-0.5, 0, 0], blend: 0.065, region: reg });
    C(h.hip, h.stifle, 0.058 * g, 0.037, { blend: 0.04, region: reg });
    // Shin with the calf bulge behind it, then the point of the hock
    C(h.stifle, h.hock, 0.037, 0.022, { blend: 0.03, region: reg });
    E(add(lerp3(h.stifle, h.hock, 0.33), v3(0, 0.006, -0.012)), v3(0.027, 0.052, 0.03), { rot: [0.85, 0, 0], blend: 0.028, region: reg });
    E(add(h.hock, v3(0, 0.004, -0.01)), v3(0.02, 0.024, 0.02), { blend: 0.016, region: reg });
    // Long metatarsus down to the hind paw
    C(h.hock, add(h.ball, v3(0, 0.006, 0)), 0.022, 0.025, { blend: 0.02, region: reg });
    E(v3(h.ball[0], GROUND + 0.024, h.ball[2] + 0.02), v3(0.029, 0.022, 0.039), { blend: 0.018, region: reg });
  }
  return P;
}

function regionsFor(L) {
  const R = {
    trunk: { chain: { joints: [v3(0, L.hips[1], -0.45), v3(0, L.hips[1], -0.045), v3(0, L.hips[1], 0.45)], bones: ['hips', 'chest'], soft: 0.085 } },
    neck: { chain: { joints: [L.neck, L.head, add(L.head, v3(0, 0.06, 0.06))], bones: ['neck', 'head'], root: 'chest', soft: 0.035 } }
  };
  for (const [, k] of SIDES) {
    const f = L.front[k];
    R['front' + k] = {
      leg: true,
      chain: {
        joints: [f.scap, f.shoulder, f.elbow, f.wrist, f.knuckle, f.toe],
        bones: ['scap' + k, 'humerus' + k, 'forearm' + k, 'wrist' + k, 'fpaw' + k],
        root: 'chest', soft: 0.032
      }
    };
    const h = L.hind[k];
    R['hind' + k] = {
      leg: true,
      chain: {
        joints: [h.hip, h.stifle, h.hock, h.ball, h.toe],
        bones: ['femur' + k, 'tibia' + k, 'meta' + k, 'hpaw' + k],
        root: 'hips', soft: 0.03
      }
    };
  }
  return R;
}

/**
 * Head sculpt in head-bone space: round cranium, broad cheeks below the
 * eyes, a short muzzle with whisker pads and chin, shallow eye sockets and
 * a few tufts of cheek fluff for the painted-cel silhouette.
 */
function headPrims(b) {
  const k = b.head * HEAD_BASE;
  const ch = b.cheeks;
  const P = [];
  const E = (c, r, opt = {}) => P.push({ type: 'ellipsoid', c: scale(c, k), r: scale(r, k), ...opt });
  const C = (a, bb, ra, rb, opt = {}) => P.push({ type: 'cone', a: scale(a, k), b: scale(bb, k), ra: ra * k, rb: rb * k, ...opt });
  // Cranium and the flatter face plate in front of it
  E(v3(0, 0.015, -0.01), v3(0.085, 0.078, 0.082));
  E(v3(0, 0.01, 0.035), v3(0.074, 0.062, 0.058), { blend: 0.04 });
  for (const s of [-1, 1]) {
    // Cheeks: widest just below the eyes, tucking in toward a small jaw
    E(v3(s * 0.045 * ch, -0.024, 0.02), v3(0.05 * ch, 0.04, 0.048), { blend: 0.04 });
  }
  // Short muzzle, rounded whisker pads, small chin, and the nose bridge
  E(v3(0, -0.026, 0.076), v3(0.036, 0.03, 0.036), { blend: 0.03 });
  for (const s of [-1, 1]) {
    E(v3(s * 0.017, -0.034, 0.093), v3(0.021, 0.018, 0.019), { blend: 0.014 });
  }
  E(v3(0, -0.054, 0.068), v3(0.022, 0.015, 0.022), { blend: 0.018 });
  C(v3(0, 0.03, 0.074), v3(0, -0.006, 0.104), 0.02, 0.01, { blend: 0.03 });
  for (const s of [-1, 1]) {
    // A shallow dish where the painted eye sits
    E(v3(s * 0.038, 0.012, 0.094), v3(0.022, 0.016, 0.007), { sub: true, blend: 0.012 });
    // Cheek fluff at the widest point of the face, swept back and down
    C(v3(s * 0.084 * ch, -0.024, 0.0), v3(s * 0.106 * ch, -0.046, -0.018), 0.016, 0.004, { blend: 0.012 });
    C(v3(s * 0.076 * ch, -0.044, 0.012), v3(s * 0.094 * ch, -0.066, -0.004), 0.013, 0.004, { blend: 0.012 });
  }
  return P;
}

/** March along `dir` from `from` until the field crosses zero. */
function hitSurface(prims, from, dir, maxDist = 0.3) {
  let t0 = 0, t1 = maxDist;
  const f = (t) => evalField(prims, from[0] + dir[0] * t, from[1] + dir[1] * t, from[2] + dir[2] * t);
  // coarse march to bracket, then bisect
  const steps = 60;
  let prev = f(0);
  for (let i = 1; i <= steps; i++) {
    const t = (maxDist * i) / steps;
    const cur = f(t);
    if ((prev < 0) !== (cur < 0)) { t0 = (maxDist * (i - 1)) / steps; t1 = t; break; }
    prev = cur;
  }
  const s0 = f(t0) < 0;
  for (let i = 0; i < 30; i++) {
    const m = (t0 + t1) / 2;
    if ((f(m) < 0) === s0) t0 = m; else t1 = m;
  }
  const t = (t0 + t1) / 2;
  return add(from, scale(dir, t));
}

function surfaceNormal(prims, p) {
  const g = [0, 0, 0];
  evalGradient(prims, p[0], p[1], p[2], g);
  return norm(g);
}

/** Tapered tail tube along the rest direction, skinned to the tail chain. */
function tailGeometry(L, boneIndex) {
  const radial = 14;
  const rings = 44;
  const total = L.tailLen;
  const base = L.tail[0];
  const dir = L.tailDir;
  // Frame around the tail axis
  const side = v3(1, 0, 0);
  const up = norm([
    dir[1] * side[2] - dir[2] * side[1],
    dir[2] * side[0] - dir[0] * side[2],
    dir[0] * side[1] - dir[1] * side[0]
  ]);
  const radius = (s) => {
    const t = Math.min(1, Math.max(0, s / total));
    return 0.031 - 0.009 * t - 0.004 * t * t;
  };
  const tipR = radius(total);
  const sStart = -0.04;
  const sEnd = total + tipR;
  const pos = [];
  const nrm = [];
  const body = [];
  const sVals = [];
  for (let r = 0; r <= rings; r++) {
    const s = sStart + ((sEnd - sStart) * r) / rings;
    let rad = radius(Math.min(s, total));
    let along = s;
    let capN = 0;
    if (s > total) {
      // Hemispherical tip
      const a = Math.min(1, (s - total) / tipR);
      const th = a * Math.PI / 2;
      rad = tipR * Math.cos(th);
      along = total + tipR * Math.sin(th);
      capN = Math.sin(th);
    }
    for (let i = 0; i < radial; i++) {
      const a = (i / radial) * Math.PI * 2;
      const cx = Math.cos(a), cy = Math.sin(a);
      const off = add(scale(side, cx), scale(up, cy));
      const p = add(base, add(scale(dir, along), scale(off, rad)));
      pos.push(...p);
      const n = norm(add(scale(off, 1 - capN), scale(dir, capN + 0.08)));
      nrm.push(...n);
      body.push(cx * rad, along / total, cy * rad);
      sVals.push(along);
    }
  }
  const index = [];
  for (let r = 0; r < rings; r++) {
    for (let i = 0; i < radial; i++) {
      const a = r * radial + i;
      const b2 = r * radial + ((i + 1) % radial);
      const c = (r + 1) * radial + i;
      const d = (r + 1) * radial + ((i + 1) % radial);
      index.push(a, b2, c, b2, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('aBody', new THREE.Float32BufferAttribute(body, 3));
  geo.setIndex(index);
  // Skin: soft hand-offs half a segment wide give a continuous curve
  const chain = compileChain({
    joints: L.tail,
    bones: ['tail0', 'tail1', 'tail2', 'tail3', 'tail4', 'tail5'],
    root: 'hips',
    soft: (total / 6) * 0.5
  }, boneIndex);
  const n = pos.length / 3;
  const skinIndex = new Uint16Array(n * 4);
  const skinWeight = new Float32Array(n * 4);
  const acc = new Float32Array(boneIndex.size);
  for (let v = 0; v < n; v++) {
    acc.fill(0);
    accumulateChain(chain, pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2], 1, acc);
    writeTopBones(acc, v, skinIndex, skinWeight, boneIndex.get('hips'));
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
  return geo;
}

/**
 * Ear shell: a cupped triangle, convex fur on the back and a concave pink
 * bowl in front, meeting at a thin rim. Local frame: +Y up the ear, +Z out
 * of the bowl. Returns { outer, inner } geometries.
 */
function earGeometry(k) {
  const W = 0.04 * k, H = 0.078 * k, D = 0.026 * k;
  const nu = 14, na = 16;
  const build = (depthK, flip) => {
    const pos = [];
    const uv = [];
    for (let iu = 0; iu <= nu; iu++) {
      const u = iu / nu;
      // Slightly rounded tip: width falls off faster in the last tenth
      const w = W * Math.pow(1 - u, 0.92) * (1 - 0.25 * Math.pow(u, 6));
      const d = D * Math.pow(1 - u, 0.85);
      for (let ia = 0; ia <= na; ia++) {
        const a = (ia / na) * 2 - 1;
        const x = w * Math.sin(a * Math.PI / 2);
        const z = -d * depthK * Math.cos(a * Math.PI / 2);
        // Lean the ear back a touch toward the tip
        pos.push(x, H * u, z - 0.012 * k * u * u);
        uv.push(ia / na, u);
      }
    }
    const index = [];
    for (let iu = 0; iu < nu; iu++) {
      for (let ia = 0; ia < na; ia++) {
        const a = iu * (na + 1) + ia, b2 = a + 1, c = a + na + 1, d = c + 1;
        if (flip) index.push(a, b2, c, b2, d, c);
        else index.push(a, c, b2, b2, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(index);
    geo.computeVertexNormals();
    return geo;
  };
  const outer = build(1, false);
  const inner = build(0.5, true);
  inner.translate(0, 0, 0.0006);
  // Fur coordinates for the ear back: y = height fraction
  const p = outer.attributes.position;
  const body = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { body[i * 3] = p.getX(i); body[i * 3 + 1] = p.getY(i) / H; body[i * 3 + 2] = p.getZ(i); }
  outer.setAttribute('aBody', new THREE.BufferAttribute(body, 3));
  return { outer, inner };
}

/**
 * Collar band: a braided cord that hugs the fur. The neck + head surface
 * is ray-cast around the neck axis so the band sits on the coat all the way
 * round rather than floating or sinking. Built in neck-bone space.
 */
function collarGeometry(bodyCompiled, headCompiled, L, b) {
  const axis = norm(sub(L.head, L.neck));
  const centre = lerp3(L.neck, L.head, 0.45);
  const ref = v3(1, 0, 0);
  const e2 = norm([
    axis[1] * ref[2] - axis[2] * ref[1],
    axis[2] * ref[0] - axis[0] * ref[2],
    axis[0] * ref[1] - axis[1] * ref[0]
  ]);
  const e1 = norm([
    e2[1] * axis[2] - e2[2] * axis[1],
    e2[2] * axis[0] - e2[0] * axis[2],
    e2[0] * axis[1] - e2[1] * axis[0]
  ]);
  const headOff = L.head;
  const field = (x, y, z) => Math.min(
    evalField(bodyCompiled, x, y, z),
    evalField(headCompiled, x - headOff[0], y - headOff[1], z - headOff[2])
  );
  const samples = 72;
  const radii = [];
  for (let i = 0; i < samples; i++) {
    const a = (i / samples) * Math.PI * 2;
    const dir = add(scale(e1, Math.cos(a)), scale(e2, Math.sin(a)));
    let t0 = 0.0, t1 = 0.2;
    for (let it = 0; it < 32; it++) {
      const m = (t0 + t1) / 2;
      const p = add(centre, scale(dir, m));
      if (field(p[0], p[1], p[2]) < 0) t0 = m; else t1 = m;
    }
    radii.push((t0 + t1) / 2);
  }
  // Light smoothing so tufts of the cheek fluff don't kink the band
  const smooth = radii.map((r, i) => (radii[(i + samples - 1) % samples] + 2 * r + radii[(i + 1) % samples]) / 4);
  const thick = 0.0075, width = 0.019;
  const prof = 12;
  const pos = [], nrm = [], uv = [];
  for (let i = 0; i <= samples; i++) {
    const a = (i / samples) * Math.PI * 2;
    const dir = add(scale(e1, Math.cos(a)), scale(e2, Math.sin(a)));
    const r = smooth[i % samples] - 0.0015;
    for (let j = 0; j <= prof; j++) {
      // Rounded-rectangle cross-section: outward bulge × along-axis width
      const t = (j / prof) * Math.PI * 2;
      const ca = Math.cos(t), sa = Math.sin(t);
      const ex = Math.sign(ca) * Math.pow(Math.abs(ca), 0.55);
      const ey = Math.sign(sa) * Math.pow(Math.abs(sa), 0.55);
      const out = r + thick * 0.5 + ex * thick * 0.5;
      const p = add(add(centre, scale(dir, out)), scale(axis, ey * width * 0.5));
      pos.push(...sub(p, L.neck));
      const nn = norm(add(scale(dir, ca), scale(axis, sa * 0.6)));
      nrm.push(...nn);
      uv.push((i / samples) * 18, j / prof);
    }
  }
  const index = [];
  for (let i = 0; i < samples; i++) {
    for (let j = 0; j < prof; j++) {
      const a = i * (prof + 1) + j, b2 = a + 1, c = a + prof + 1, d = c + 1;
      index.push(a, c, b2, b2, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(index);
  // Front of the throat: the lowest point of the band facing forward-down
  let best = 0, bestScore = Infinity;
  for (let i = 0; i < samples; i++) {
    const a = (i / samples) * Math.PI * 2;
    const dir = add(scale(e1, Math.cos(a)), scale(e2, Math.sin(a)));
    const score = dir[1] - dir[2] * 0.4;
    if (score < bestScore) { bestScore = score; best = i; }
  }
  const a = (best / samples) * Math.PI * 2;
  const dir = add(scale(e1, Math.cos(a)), scale(e2, Math.sin(a)));
  const front = sub(add(centre, scale(dir, smooth[best] + thick)), L.neck);
  return { geometry: geo, front, frontDir: dir, axis };
}

/** Pink nose leather: an inverted, softly domed rounded triangle. */
function noseGeometry(k) {
  const geo = new THREE.SphereGeometry(0.0096 * k, 18, 12);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ny = y / (0.0096 * k);
    // Wide at the top, pinched to a point at the bottom
    x *= 1.18 * (0.62 + 0.38 * (ny + 1) * 0.5 + 0.12);
    y *= 0.62;
    z *= 0.6;
    p.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

const cache = new Map();

/**
 * Build (or fetch) every geometry for a body type.
 * Returns { bones, boneIndex, body, tail, head, ears, collar, nose, face }.
 */
export function getCatAnatomy(build = BUILDS.michi) {
  const b = { ...BUILDS.michi, ...build };
  const key = JSON.stringify(b);
  if (cache.has(key)) return cache.get(key);
  const t0 = performance.now();
  const L = landmarks(b);
  const bones = boneDefs(L);
  const boneIndex = new Map(bones.map((d, i) => [d.name, i]));

  const timings = {};
  const bodyCompiled = compilePrims(bodyPrims(L, b));
  const body = sculptGeometry(bodyCompiled, 0.0085, { timings });
  let ts = performance.now();
  bakeSkin(body, bodyCompiled, regionsFor(L), boneIndex, 0.03, 4);
  timings.skin = performance.now() - ts;
  // Body-space coordinates for the coat pattern (bind pose)
  body.setAttribute('aBody', body.attributes.position.clone());
  body.computeBoundingSphere();

  const headCompiled = compilePrims(headPrims(b));
  const headTimings = {};
  const head = sculptGeometry(headCompiled, 0.005, { timings: headTimings });
  timings.head = Object.values(headTimings).reduce((a, x) => a + x, 0);
  ts = performance.now();
  head.setAttribute('aBody', head.attributes.position.clone());
  head.computeBoundingSphere();

  // Face landmarks, found on the sculpted surface
  const hk = b.head * HEAD_BASE;
  const eyeC = hitSurface(headCompiled, v3(0.04 * hk, 0.013 * hk, 0.2), v3(0, 0, -1));
  const eyeN = surfaceNormal(headCompiled, eyeC);
  const nose = hitSurface(headCompiled, v3(0, -0.002 * hk, 0.2), v3(0, 0, -1));
  const noseN = surfaceNormal(headCompiled, nose);
  const earBase = [];
  for (const s of [-1, 1]) {
    const dirE = norm(v3(s * 0.52, 0.85, -0.05));
    const pE = hitSurface(headCompiled, v3(0, 0.0, -0.005 * hk), dirE);
    earBase.push({ pos: add(pE, scale(surfaceNormal(headCompiled, pE), -0.012 * hk)), side: s });
  }
  const whiskerRoot = hitSurface(headCompiled, v3(0.026 * hk, -0.036 * hk, 0.2), v3(0, 0, -1));

  const tail = tailGeometry(L, boneIndex);
  tail.computeBoundingSphere();
  const ears = earGeometry(hk);
  const collar = collarGeometry(bodyCompiled, headCompiled, L, b);
  const noseGeo = noseGeometry(hk);
  timings.parts = performance.now() - ts;

  const out = {
    build: b, landmarks: L, bones, boneIndex,
    body, head, tail, ears, collar, nose: noseGeo,
    face: { eyeC, eyeN, nose, noseN, earBase, whiskerRoot, headScale: hk },
    buildMs: performance.now() - t0,
    timings
  };
  cache.set(key, out);
  return out;
}
