// A Kyoto resident for the Roof Road, built on its own origin: local Y up, +Z
// toward the street, feet at y 0. A port of rooftops/js/people.js makeResident
// plus the role props of rooftops/js/downtown.js B.villager, made tiered:
//   hero  the full figure (lathe robes 20 segments, lapels, brows, apron, hair fringe);
//         4 materials: the painted work cloth, skin, the painted face, one vertex-colour bag
//   mid   10-segment robes, no lapels or brow tubes; work cloth + the bag
//   far   a robe, head, hair and two arm stubs in the bag alone (about 300 triangles)
// Everything small (sash, apron, hair, sandals, props) is vertex-coloured in the
// kit's one `bag` material, baked into ONE mesh per material; only the shoulder
// pivots, the head and the laundry towel stay separate so they animate.
import * as THREE from 'three';

const TAU = Math.PI * 2;
const SEG = { hero: 20, mid: 10, far: 8 };
// built on first use: a kit family does no THREE work at module load (R67, cadJS loads every family under a stub)
let _balls = null;
const BALLS = new Proxy({}, { get: (_, k) => (_balls = _balls || { hero: new THREE.SphereGeometry(1, 16, 12), mid: new THREE.SphereGeometry(1, 10, 7), far: new THREE.SphereGeometry(1, 6, 4) })[k] });
const FALLBACK = {
  hair: 0x302c30, terracotta: 0xa8553a, agedWood: 0x6e4c30, dark: 0x1e1915, bamboo: 0x8f9a52, straw: 0xc8a96a,
  steel: 0x5d6168, enamel: 0xe8e4da
};

export function residentMats(ctx) {
  const M = ctx.MAT || {}, km = ctx.kitMaterials;
  const hex = (m, fb) => (m && m.color ? m.color.getHex() : fb);
  // a textured material's own colour is its tint (often white), so the painted ones use the fallback colour
  const one = (name) => ({ hex: M[name] && M[name].map ? (FALLBACK[name] ?? 0x888888) : hex(M[name], FALLBACK[name] ?? 0x888888) });
  const list = (name, colours) => (Array.isArray(M[name]) && M[name].length ? M[name] : colours.map((c) => km.plain(c, { rough: 0.95 })));
  const marks = (arr) => arr.map((m) => ({ hex: hex(m, 0x888888) }));
  const skin = list('skin', [0xe8c4a0, 0xd9a981, 0xc99068]);
  const cloth = marks(list('cloth', [0xf2efe6, 0x2f4c78, 0xe6d6a8, 0xd9e2ea, 0xb8584a]));
  return {
    bag: km.bag({ rough: 0.9 }),
    skin,
    skinHex: marks(skin),
    clothHex: marks(list('workCloth', [0x4a5d73, 0x7a6a4c, 0x5d6b4e, 0x6b4e5a])),
    faces: Array.isArray(M.faces) && M.faces.length ? M.faces : skin,
    workCloth: list('workCloth', [0x4a5d73, 0x7a6a4c, 0x5d6b4e, 0x6b4e5a]),
    cloth,
    goods: marks(list('goods', [0xc8513c, 0xd9a441, 0x4f7a9c, 0x6c9a4f, 0x8a5a9c, 0xe0c9a0])),
    hair: one('hair'), terracotta: one('terracotta'), agedWood: one('agedWood'), dark: one('dark'),
    bamboo: one('bamboo'), straw: one('straw'), steel: one('steel'), enamel: one('enamel')
  };
}

/** Bake every mesh under `source` (identity-parented) into one mesh per material. */
function bake(source, castShadow = true) {
  source.updateMatrixWorld(true);
  const buckets = new Map();
  source.traverse((o) => {
    if (!o.isMesh) return;
    let g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    if (g.index) g = g.toNonIndexed();
    if (!g.attributes.normal) g.computeVertexNormals();
    const vc = o.material.vertexColors === true;
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', ...(vc ? ['color'] : [])].includes(k)) g.deleteAttribute(k);
    if (vc) {
      const c = new THREE.Color(o.userData.hex ?? 0x888888), a = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    }
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material).push(g);
  });
  const out = [];
  for (const [mat, geos] of buckets) {
    const merged = geos.length === 1 ? geos[0] : mergeList(geos);
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = castShadow; m.receiveShadow = true;
    out.push(m);
  }
  return out;
}
function mergeList(geos) {
  let n = 0;
  for (const g of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = geos[0].attributes.color ? new Float32Array(n * 3) : null;
  let o = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); uv.set(g.attributes.uv.array, o * 2);
    if (col) col.set(g.attributes.color.array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}

let BAG = null;
/** A mesh on a real material, or (a { hex } marker) on the vertex-colour bag painted that colour. */
function mk(geo, m) {
  if (m && m.hex !== undefined) { const x = new THREE.Mesh(geo, BAG); x.userData.hex = m.hex; return x; }
  return new THREE.Mesh(geo, m);
}
const boxMesh = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = mk(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
const cylMesh = (r, len, mat, seg = 8) => mk(new THREE.CylinderGeometry(r, r, len, seg), mat);

/**
 * Build one resident. → { group, body, head, arms, towel, dispose }.
 * `pc` is the level record: look, role, fare, y (stands at y), d (depth).
 */
export function buildResident(ctx, pc) {
  const mats = residentMats(ctx); BAG = mats.bag;
  const tier = ctx.tier, hero = tier === 'hero', far = tier === 'far';
  const seg = SEG[tier] || 12, role = pc.role || 'stallkeeper', look = pc.look ?? 0.5, seated = !!pc.seated, waist = seated ? -0.46 : 0;
  const variant = Math.floor(look * 4) % 4;
  const si = Math.floor(look * 3) % 3, ball = BALLS[tier] || BALLS.mid;
  const cloth = hero || tier === 'mid' ? mats.workCloth[variant] : mats.clothHex[variant];
  const skin = hero ? mats.skin[si] : mats.skinHex[si], faceMat = hero ? (mats.faces[si] || skin) : skin;
  const group = new THREE.Group();
  const body = new THREE.Group(), head = new THREE.Group();
  const rigid = new THREE.Group(), faceSrc = new THREE.Group();
  const oval = (parent, mat, x, y, z, sx, sy, sz) => { const m = mk(ball, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m; };
  const drape = (parent, mat, rings, depth = 0.7, phase = 0) => {
    const geo = new THREE.LatheGeometry(rings.map(([r, y]) => new THREE.Vector2(r, y)), seg);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = p.getY(i), phi = Math.atan2(z, x);
      const fold = 1 + 0.025 * Math.sin(phi * 7 + phase) + 0.018 * Math.sin(phi * 11 + y * 9);
      p.setXYZ(i, x * fold, y, z * fold * depth);
    }
    geo.computeVertexNormals();
    const mesh = mk(geo, mat); parent.add(mesh); return mesh;
  };

  // legs, tabi and sandals (far: one skirt)
  if (seated) {
    for (const sd of [-1, 1]) oval(rigid, cloth, sd * 0.17, 0.12, 0.13, 0.17, 0.13, 0.28);   // crossed legs
  } else if (far) { const skirt = drape(rigid, cloth, [[0.12, 0.0], [0.17, 0.3], [0.2, 0.58]], 0.8, look * 5); skirt.position.y = 0.02; }
  else for (const side of [-1, 1]) {
    const leg = drape(rigid, cloth, [[0.065, 0.12], [0.08, 0.18], [0.09, 0.34], [0.087, 0.52], [0.105, 0.72]], 0.87, side);
    leg.position.set(side * 0.10, 0, side * 0.022);
    oval(rigid, mats.cloth[0], side * 0.10, 0.09, 0.025, 0.067, 0.065, 0.135);
    oval(rigid, mats.agedWood, side * 0.10, 0.037, 0.05, 0.079, 0.025, 0.157);
    if (hero) { const strap = oval(rigid, mats.dark, side * 0.10, 0.105, 0.085, 0.06, 0.018, 0.035); strap.rotation.z = side * 0.1; }
  }
  // robe, neck, sash (a seated figure's torso sits 0.46 m lower)
  const torso = new THREE.Group(); torso.position.y = waist; rigid.add(torso);
  drape(torso, cloth, [[0.20, 0.58], [0.225, 0.61], [0.19, 0.72], [0.17, 0.83], [0.20, 1.02], [0.205, 1.10], [0.15, 1.17], [0.09, 1.20]], 0.7, look * 8);
  oval(torso, skin, 0, 1.215, 0, 0.052, 0.065, 0.05);
  const sash = drape(torso, mats.cloth[variant % 2 ? 2 : 4], [[0.185, 0.70], [0.185, 0.77], [0.176, 0.79]], 0.73);
  sash.rotation.z = 0.035;
  if (!far) {
    if (hero) for (const side of [-1, 1]) {
      const path = new THREE.CatmullRomCurve3([new THREE.Vector3(side * 0.095, 1.18, 0.068), new THREE.Vector3(side * 0.05, 1.06, 0.14), new THREE.Vector3(-side * 0.06, 0.86, 0.13)]);
      torso.add(mk(new THREE.TubeGeometry(path, 12, 0.018, 5, false), mats.cloth[0]));
    }
    if (role === 'laundry') drape(torso, cloth, [[0.27, 0.17], [0.25, 0.24], [0.22, 0.45], [0.19, 0.70]], 0.72, 2);
    const apronGeo = new THREE.PlaneGeometry(0.30, 0.58, hero ? 8 : 3, hero ? 8 : 3), ap = apronGeo.attributes.position;
    for (let i = 0; i < ap.count; i++) {
      const x = ap.getX(i), y = ap.getY(i);
      ap.setXYZ(i, x * (1 - (y + 0.29) * 0.22), y + 0.52, 0.135 + 0.035 * Math.cos(x * 17) + 0.009 * Math.sin(y * 32 + x * 23));
    }
    apronGeo.computeVertexNormals();
    torso.add(mk(apronGeo, mats.cloth[0]));
  }

  // head: painted oval face (tapered jaw), ears, hair, headband
  head.position.set(0, 1.425 + waist, 0.012);
  const faceGeo = hero ? new THREE.SphereGeometry(1, 24, 16) : ball.clone(), fp = faceGeo.attributes.position;
  for (let i = 0; i < fp.count; i++) if (fp.getY(i) < -0.1) fp.setX(i, fp.getX(i) * (0.86 + 0.14 * (fp.getY(i) + 1) / 0.9));
  faceGeo.computeVertexNormals();
  faceGeo.scale(0.136, 0.187, 0.13); faceGeo.computeVertexNormals();   // the scale baked in, so the head is plain unscaled meshes
  const face = mk(faceGeo, faceMat); (hero ? head : faceSrc).add(face);
  oval(faceSrc, skin, 0, -0.018, 0.126, 0.016, 0.025, 0.022);
  if (!far) for (const side of [-1, 1]) {
    oval(faceSrc, mats.cloth[0], side * 0.049, 0.024, 0.118, 0.025, 0.011, 0.009);
    oval(faceSrc, mats.hair, side * 0.048, 0.024, 0.126, 0.008, 0.010, 0.004);
    oval(faceSrc, skin, side * 0.134, -0.015, -0.005, 0.024, 0.041, 0.024);
    if (hero) {
      const brow = new THREE.CatmullRomCurve3([new THREE.Vector3(side * 0.027, 0.056, 0.119), new THREE.Vector3(side * 0.049, 0.061, 0.120), new THREE.Vector3(side * 0.070, 0.053, 0.110)]);
      faceSrc.add(mk(new THREE.TubeGeometry(brow, 8, 0.0035, 4, false), mats.hair));
    }
  }
  if (hero) {
    const smile = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.021, -0.070, 0.117), new THREE.Vector3(0, -0.075, 0.122), new THREE.Vector3(0.023, -0.067, 0.116)]);
    faceSrc.add(mk(new THREE.TubeGeometry(smile, 10, 0.0028, 4, false), { hex: 0x8a5147 }));
  }
  const hair = mk(new THREE.SphereGeometry(1, hero ? 18 : far ? 6 : 10, hero ? 12 : far ? 3 : 6, 0, TAU, 0, Math.PI * 0.62), mats.hair);
  hair.scale.set(0.145, 0.19, 0.143); hair.position.set(0, 0.025, -0.015); faceSrc.add(hair);
  if (!far) for (let i = 0; i < (hero ? 5 : 3); i++) {
    const n = hero ? 5 : 3, fr = oval(faceSrc, mats.hair, (i - (n - 1) / 2) * (hero ? 0.043 : 0.07), 0.115 + Math.sin(i + look) * 0.018, 0.091, hero ? 0.042 : 0.06, 0.068, 0.035);
    fr.rotation.z = (i - (n - 1) / 2) * 0.2 - 0.12;
  }
  if (role === 'laundry') oval(faceSrc, mats.hair, 0.025, 0.085, -0.14, 0.079, 0.084, 0.06);
  else if (!far) {
    const band = mk(new THREE.CylinderGeometry(0.146, 0.145, 0.035, hero ? 20 : 12, 1, true), { hex: 0xe3d7b6 });
    band.scale.z = 0.94; band.position.y = 0.085; faceSrc.add(band);
    oval(faceSrc, mats.cloth[0], -0.13, 0.07, -0.07, 0.04, 0.025, 0.025);
  }
  if (far) { faceSrc.position.copy(head.position); rigid.add(faceSrc); }   // far: head and arms bake into the body
  else for (const m of bake(faceSrc)) head.add(m);
  body.add(head);

  // shoulders: a pivot each, the sleeve, forearm and hand baked inside it
  const arms = [-1, 1].map((side) => {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.18, 1.09 + waist, 0); body.add(pivot);
    const src = new THREE.Group();
    oval(src, hero ? cloth : mats.clothHex[variant], side * 0.012, -0.045, 0, 0.088, 0.115, 0.09);
    if (!far) { const sleeve = drape(src, hero ? cloth : mats.clothHex[variant], [[0.108, -0.32], [0.12, -0.27], [0.10, -0.12], [0.085, -0.04]], 0.88, side); sleeve.rotation.z = side * -0.10; }
    const fore = new THREE.Group(); fore.position.set(side * 0.022, -0.28, 0.01); fore.rotation.x = -0.18; src.add(fore);
    oval(fore, skin, 0, -0.10, 0, 0.047, 0.14, 0.047);
    if (!far) oval(fore, skin, 0, -0.23, 0.012, 0.051, 0.065, 0.037);
    if (!far) oval(fore, skin, -side * 0.042, -0.212, 0.035, 0.021, 0.037, 0.021);
    pivot.rotation.z = side * 0.08;
    pivot.userData.src = src;
    return pivot;
  });

  // role props (downtown.js B.villager)
  let towel = null, rackNode = null;
  if (role === 'laundry') {
    towel = boxMesh(0.42, 0.55, 0.02, mats.cloth[3], 0, -0.4, 0); arms[1].userData.src.add(towel);   // stays live below
    const basket = mk(new THREE.CylinderGeometry(0.28, 0.21, 0.25, seg, 1, true), mats.bamboo); basket.position.set(-0.45, 0.14, 0.15); rigid.add(basket);
    for (let j = 0; j < 3; j++) rigid.add(boxMesh(0.32, 0.045, 0.24, mats.cloth[j], -0.45, 0.21 + j * 0.035, 0.15));
  }
  if (role === 'sweeper') {
    const broom = cylMesh(0.015, 1.25, mats.bamboo, 6); broom.position.y = -0.45; arms[0].userData.src.add(broom);
    arms[0].userData.src.add(boxMesh(0.22, 0.3, 0.06, mats.straw, 0, -1.0, 0));
  }
  if (role === 'stallkeeper') {
    const ladle = cylMesh(0.012, 0.36, mats.bamboo, 6); ladle.position.y = -0.43; arms[1].userData.src.add(ladle);
    if (/yaki|ayu/.test(pc.fare || '')) arms[1].userData.src.add(boxMesh(0.09, 0.1, 0.015, mats.steel, 0, -0.62, 0));
    else { const bowl = mk(new THREE.SphereGeometry(0.065, 8, 5, 0, TAU, 0, Math.PI / 2), mats.enamel); bowl.rotation.z = Math.PI; bowl.position.y = -0.61; arms[1].userData.src.add(bowl); }
    arms[0].userData.src.add(boxMesh(0.23, 0.025, 0.16, mats.terracotta, 0, -0.32, 0.06));
  }
  for (const a of arms) {
    const towelHere = towel && a.userData.src.children.includes(towel);
    if (towelHere) a.userData.src.remove(towel);
    if (far) { const w = new THREE.Group(); w.position.copy(a.position); w.rotation.z = a.rotation.z; w.add(a.userData.src); rigid.add(w); }
    else for (const m of bake(a.userData.src)) a.add(m);
    if (towelHere) a.add(towel);
    delete a.userData.src;
  }
  for (const m of bake(rigid)) body.add(m);

  // the laundry woman's drying rack stands beside her on the street
  if (role === 'laundry') {
    const rack = new THREE.Group();
    rack.add(boxMesh(1.5, 0.04, 0.04, mats.bamboo, 0, 1.62, 0.12));
    for (const x of [-0.7, 0.7]) rack.add(boxMesh(0.035, 1.65, 0.035, mats.bamboo, x, 0.82, 0.12));
    for (const x of [-0.45, 0.4]) { rack.add(boxMesh(0.35, 0.6, 0.02, mats.cloth[2], x, 1.3, 0.12)); rack.add(boxMesh(0.03, 0.09, 0.04, mats.agedWood, x, 1.59, 0.15)); }
    const baked = new THREE.Group(); baked.position.set(0, pc.y, pc.d);
    for (const m of bake(rack)) baked.add(m);
    baked.name = 'rack'; group.add(baked); rackNode = baked;
  }

  body.rotation.y = role === 'laundry' ? Math.PI * 0.12 : 0;
  body.scale.setScalar(0.96 + look * 0.07);
  body.position.set(0, pc.y, pc.d - (role === 'laundry' ? 0.36 : 0));
  if (role === 'sweeper') head.rotation.x = 0.07;
  group.add(body);
  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { group, body, head, arms, towel, rack: rackNode };
}
