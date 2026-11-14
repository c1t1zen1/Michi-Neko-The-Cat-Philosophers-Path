// Larry's modular body: a scuted carapace, a pale plastron, a neck and head,
// four flipper pivots and a tail, in metres with the ground point at the origin
// and the nose on +Z (classic Larry is 1.2 x 0.6 x 1.1 m, shell top at 0.57).
// Tiers: hero (9 live meshes: shell, plastron, neck, head with eyes, four
// flippers, tail), mid (body + head + four flippers), far (ONE merged mesh).
// Behaviour (countryside.js updateCorralGuardian) moves only the group; the
// gait here is read from the group's own displacement, so a patrol, a chase and
// the idle breathing all animate the legs without the patrol code knowing.
import * as THREE from 'three';
import { Bag, UNIT } from '../../kit/craft.js?v=20261113a';

const _mats = new Map();
const shared = (g) => { g.userData.sharedGeometry = true; return g; };
const col = (h) => new THREE.Color(h);

function material(def) {
  const key = def.id + ':' + Object.values(def.palette).join(',');
  if (!_mats.has(key)) {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, flatShading: true, name: 'larry:skin' });
    m.userData.kit = true;
    _mats.set(key, m);
  }
  return _mats.get(key);
}

const ell = (bag, rx, ry, rz, o) => bag.add(UNIT.sphere, { ...o, sx: rx, sy: ry, sz: rz }); // Bag.sphere() overrides sx/sy/sz with r
const hash2 = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

/** A carapace dome: scutes in two rings round a crown plate, seams darker, each scute a touch different. */
function carapace(P, seg) {
  const g = new THREE.SphereGeometry(1, seg * 2, seg + 1, 0, Math.PI * 2, 0, Math.PI * 0.58);
  g.scale(0.6, 0.27, 0.47);
  const p = g.attributes.position, c = new Float32Array(p.count * 3), k = new THREE.Color();
  const dark = col(P.shell), light = col(P.shellLight);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / 0.6, y = p.getY(i) / 0.27, z = p.getZ(i) / 0.47;
    const ring = y > 0.78 ? 0 : y > 0.4 ? 1 : 2;
    const n = ring === 0 ? 1 : ring === 1 ? 6 : 11;
    const u = (Math.atan2(z, x) / (Math.PI * 2) + 1) % 1 * n;
    const cell = ring === 0 ? 0 : Math.floor(u);
    const edge = ring === 0 ? Math.min(1, (1 - y) * 6) : Math.min(u - cell, 1 - (u - cell));
    k.copy(dark).lerp(light, 0.25 + hash2(cell, ring) * 0.55);
    const rim = Math.min(Math.abs(y - 0.78), Math.abs(y - 0.4)); // the ring seams
    k.multiplyScalar(0.45 + 0.55 * Math.min(1, edge * 6, ring === 0 ? 1 : rim * 12)); // dark seams
    c.set([k.r, k.g, k.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

const geoCache = new Map();
function parts(def, tier) {
  const key = def.id + ':' + tier;
  if (geoCache.has(key)) return geoCache.get(key);
  const P = def.palette, hero = tier === 'hero', seg = hero ? 14 : tier === 'mid' ? 7 : 3;
  const out = {};
  const shell = new Bag().add(carapace(P, seg), { y: 0.3, keep: true });
  const plastron = (bag) => ell(bag, 0.5, 0.07, 0.4, { x: 0, y: 0.2, z: 0, color: P.plastron });
  const neck = (bag) => bag.cyl(0.1, 0.3, { x: 0, y: 0.27, z: 0.42, rx: Math.PI / 2 - 0.15, color: P.skin });
  const head = (bag, ox = 0, oy = 0, oz = 0) => {
    ell(bag, 0.16, 0.145, 0.195, { x: ox, y: oy + 0.27, z: oz + 0.62, color: P.skin });
    ell(bag, 0.056, 0.038, 0.07, { x: ox, y: oy + 0.24, z: oz + 0.78, color: P.skin }); // snout
    if (hero) for (const s of [-1, 1]) bag.sphere(0.028, { x: ox + s * 0.1, y: oy + 0.32, z: oz + 0.7, color: P.eye });
  };
  const flipperGeo = (front) => {
    const bag = new Bag();
    ell(bag, 0.156, 0.143, front ? 0.143 : 0.11, { x: 0, y: -0.06, z: front ? 0.03 : 0, color: P.skin });
    return shared(bag.geometry());
  };
  const tailGeo = (bag) => bag.add(new THREE.ConeGeometry(0.05, 0.2, 5).rotateX(-Math.PI / 2 - 0.3), { x: 0, y: 0.2, z: -0.52, color: P.skin });

  if (tier === 'far') {
    // a handful of low solids: dome, belly slab, head, four feet (about 250 triangles)
    const low = new THREE.SphereGeometry(1, 6, 4), bag = new Bag();
    bag.add(carapace(P, seg), { y: 0.3, keep: true });
    bag.box(1.0, 0.14, 0.8, { y: 0.2, color: P.plastron });
    bag.add(low, { x: 0, y: 0.27, z: 0.65, sx: 0.17, sy: 0.15, sz: 0.22, color: P.skin });
    for (const [x, z] of [[-0.4, -0.35], [0.4, -0.35], [-0.4, 0.34], [0.4, 0.34]]) bag.add(low, { x, y: 0.06, z, sx: 0.16, sy: 0.07, sz: 0.11, color: P.skin });
    low.dispose();
    out.body = shared(bag.geometry());
  } else if (hero) {
    out.shell = shared(shell.geometry());
    out.plastron = shared(plastron(new Bag()).geometry());
    out.neck = shared(neck(new Bag()).geometry());
    out.head = shared((() => { const b = new Bag(); head(b); return b.geometry(); })());
    out.tail = shared(tailGeo(new Bag()).geometry());
    out.flipperF = flipperGeo(true); out.flipperB = flipperGeo(false);
  } else {
    const bag = new Bag(); bag.add(carapace(P, seg), { y: 0.3, keep: true }); plastron(bag); neck(bag); tailGeo(bag);
    out.body = shared(bag.geometry());
    out.head = shared((() => { const b = new Bag(); head(b); return b.geometry(); })());
    out.flipperF = flipperGeo(true); out.flipperB = flipperGeo(false);
  }
  geoCache.set(key, out);
  return out;
}

const HIPS = { fl: [0.4, 0.2, 0.33], fr: [-0.4, 0.2, 0.33], bl: [0.4, 0.2, -0.35], br: [-0.4, 0.2, -0.35] };

/** Build Larry. → { group, parts, live, update, setTier, dispose } (an AssetInstance without a footprint: the layout's is used). */
export function buildTurtle(def, ctx, layout, p = {}) {
  const tier = ctx.tier, G = parts(def, tier), mat = material(def);
  const group = new THREE.Group(), pr = {}, live = [];
  const mesh = (geo, name, parent = group) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; parent.add(m); live.push(m); pr[name] = m; return m; };
  if (tier === 'far') mesh(G.body, 'body');
  else {
    if (tier === 'hero') { mesh(G.shell, 'shell'); mesh(G.plastron, 'plastron'); mesh(G.neck, 'neck'); mesh(G.tail, 'tail'); }
    else { mesh(G.body, 'shell'); }
    const head = mesh(G.head, 'head'); head.position.set(0, 0, 0);
    for (const k of ['fl', 'fr', 'bl', 'br']) {
      const pivot = new THREE.Group(); pivot.position.set(...HIPS[k]); group.add(pivot);
      mesh(k[0] === 'f' ? G.flipperF : G.flipperB, 'flipper_' + k + '_mesh', pivot);
      pr['flipper_' + k] = pivot;
    }
  }
  const s = (def.scale || 1) * (p.size || 1);
  group.scale.setScalar(s);
  group.userData.baseScale = s;

  let lx = null, lz = null, phase = 0, speed = 0;
  const update = (dt, t) => {
    if (tier === 'far' || !(dt > 0)) return;
    const gp = group.position;
    if (lx !== null) {
      const v = Math.hypot(gp.x - lx, gp.z - lz) / dt;
      speed += (Math.min(v, 2) - speed) * Math.min(1, dt * 6);
    }
    lx = gp.x; lz = gp.z;
    phase += dt * (1.5 + speed * 5);
    const swing = Math.min(1, speed * 1.6) * 0.55;
    pr.flipper_fl.rotation.x = Math.sin(phase) * swing;
    pr.flipper_br.rotation.x = Math.sin(phase) * swing;
    pr.flipper_fr.rotation.x = -Math.sin(phase) * swing;
    pr.flipper_bl.rotation.x = -Math.sin(phase) * swing;
    // the head noses forward while walking and breathes at rest
    pr.head.position.z = 0.02 * Math.sin(phase) * Math.min(1, speed * 2) + 0.01 * Math.sin(t * 1.7);
    pr.head.position.y = 0.012 * Math.sin(t * 1.7);
  };
  return { group, parts: pr, sockets: {}, live, update, dispose() {} };
}
