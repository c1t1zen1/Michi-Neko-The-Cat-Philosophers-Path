// What a Kyoto back lane actually holds, at cat height.
import * as THREE from 'three';
import { V3, TAU, Bag, tube, rng, lerp, canvas2d, canvasTexture } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { culmGeometry } from '../../shared/bamboo.js';

const lathe = (pts, s = 24) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), s);

export const PROPS = {
  pot: { label: 'Potted plant', r: 0.2, build() {
    const g = new THREE.Group(), pot = new THREE.Mesh(lathe([[0.001, 0], [0.13, 0], [0.16, 0.2], [0.18, 0.24], [0.15, 0.24]]), M.plain(0xa8603a, { rough: 0.9, grime: 0.4, grimeH: 0.2 })); g.add(pot);
    const leaf = M.plain(0x4f7f3a, { side: THREE.DoubleSide, rough: 0.7 }), r = rng(5);
    for (let i = 0; i < 16; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.36, 1, 3).translate(0, 0.18, 0), leaf), a = r() * TAU; l.position.y = 0.24; l.rotation.set(0.5 + r() * 0.6, a, 0, 'YXZ'); g.add(l); }
    return g; } },
  barrel: { label: 'Rain barrel', r: 0.34, build() {
    const g = new THREE.Group(), w = M.wood({ base: 0x7a5c3e, dark: 0x4a3322, grime: 0.5, grimeH: 0.5 });
    const b = new THREE.Mesh(lathe([[0.26, 0], [0.31, 0.08], [0.33, 0.33], [0.31, 0.6], [0.27, 0.68]]), w); g.add(b);
    const bag = new Bag(); for (const y of [0.1, 0.42, 0.62]) bag.cyl(0.33, 0.03, { y, color: 0x3e3226 });
    g.add(bag.mesh(M.bag({ rough: 0.7, metal: 0.25 })));
    const wat = new THREE.Mesh(new THREE.CircleGeometry(0.26, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2c5660, roughness: 0.08, metalness: 0.5 })); wat.position.y = 0.64; g.add(wat);
    return g; } },
  komodaru: { label: 'Sake barrel', r: 0.3, build() {
    const g = new THREE.Group();
    const [c, x] = canvas2d(256, 256); x.fillStyle = '#c9b582'; x.fillRect(0, 0, 256, 256); const r = rng(3); for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${90 + r() * 80},${70 + r() * 60},${30 + r() * 30},.3)`; x.fillRect(r() * 256, r() * 256, 2, 8 + r() * 22); }
    x.fillStyle = '#a02e22'; x.beginPath(); x.arc(128, 128, 62, 0, TAU); x.fill(); x.fillStyle = '#f2e2c6'; x.font = 'bold 74px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('酒', 128, 126);
    const mat = new THREE.MeshStandardMaterial({ map: canvasTexture(c), roughness: 1 });
    g.add(new THREE.Mesh(lathe([[0.2, 0], [0.26, 0.05], [0.28, 0.25], [0.26, 0.45], [0.2, 0.5], [0.001, 0.5]]), mat));
    const rope = new Bag(); for (const y of [0.06, 0.25, 0.44]) rope.cyl(0.285, 0.018, { y, color: 0x8a7248 }); g.add(rope.mesh(M.bag({ rough: 1 }))); return g; } },
  crate: { label: 'Crate', r: 0.36, build() {
    const g = new THREE.Group(), b = new Bag(), c = [0x9c7a4e, 0x88683f, 0xa58660];
    for (let i = 0; i < 5; i++) { b.box(0.6, 0.1, 0.48, { y: 0.06 + i * 0.1, color: c[i % 3] }); }
    b.box(0.06, 0.52, 0.5, { x: -0.3, y: 0.26, color: 0x6e5236 }); b.box(0.06, 0.52, 0.5, { x: 0.3, y: 0.26, color: 0x6e5236 });
    g.add(b.mesh(M.bag({ rough: 0.8, grime: 0.4, grimeH: 0.3 }))); return g; } },
  bicycle: { label: 'Bicycle', r: 0.72, build() {
    const g = new THREE.Group(), st = M.plain(0x8a2c2c, { rough: 0.4, metal: 0.5 }), rim = M.plain(0x2a2a2c, { rough: 0.6 });
    const wheel = (x) => { const w = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.018, 8, 32), rim); w.position.set(x, 0.32, 0); g.add(w); for (let i = 0; i < 10; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.6), M.plain(0xb5b5b5, { metal: 0.8, rough: 0.3 })); s.position.set(x, 0.32, 0); s.rotation.z = i / 10 * Math.PI; g.add(s); } };
    wheel(-0.52); wheel(0.52);
    const f = (a, b, r = 0.016) => g.add(new THREE.Mesh(tube([V3(...a), V3(...b)], r, { radial: 8 }), st));
    f([-0.52, 0.32, 0], [-0.08, 0.32, 0]); f([-0.08, 0.32, 0], [-0.26, 0.68, 0]); f([-0.52, 0.32, 0], [-0.26, 0.68, 0]); f([-0.08, 0.32, 0], [0.34, 0.66, 0]); f([-0.26, 0.68, 0], [0.34, 0.66, 0]); f([0.34, 0.66, 0], [0.52, 0.32, 0]); f([0.34, 0.66, 0], [0.38, 0.84, 0]);
    const seat = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), M.plain(0x2a1f18, { rough: 0.7 })); seat.scale.set(1.4, 0.4, 0.8); seat.position.set(-0.27, 0.75, 0); g.add(seat);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42), st); bar.rotation.x = Math.PI / 2; bar.position.set(0.38, 0.86, 0); g.add(bar);
    const bsk = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.17, 0.26), M.plain(0x9a7a4a, { rough: 0.9 })); bsk.position.set(0.5, 0.76, 0); g.add(bsk);
    return g; } },
  sign: { label: 'Kanban', r: 0.28, build() {
    const g = new THREE.Group(), [c, x] = canvas2d(160, 400);
    x.fillStyle = '#d9c6a0'; x.fillRect(0, 0, 160, 400); x.fillStyle = '#2a1e14'; x.font = 'bold 72px serif'; x.textAlign = 'center'; x.fillText('御', 80, 90); x.fillText('茶', 80, 180); x.fillText('所', 80, 270);
    const b = new Bag(); b.box(0.46, 0.04, 0.3, { y: 0.02, color: 0x5a3f28 }); b.box(0.04, 1.0, 0.04, { x: -0.16, y: 0.5, color: 0x5a3f28 }); b.box(0.04, 1.0, 0.04, { x: 0.16, y: 0.5, color: 0x5a3f28 });
    g.add(b.mesh(M.bag({ rough: 0.8 })));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.86), new THREE.MeshStandardMaterial({ map: canvasTexture(c), roughness: 0.85, side: THREE.DoubleSide })); face.position.set(0, 0.56, 0.02); g.add(face);
    return g; } },
  broom: { label: 'Bamboo broom', r: 0.14, build() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(tube([V3(0, 0.1, 0), V3(0.04, 1.42, 0)], 0.012, { radial: 8 }), M.bamboo()));
    const b = new Bag(), r = rng(9); for (let i = 0; i < 44; i++) { const a = r() * TAU, d = r() * 0.08; b.cyl(0.003, 0.3 + r() * 0.1, { x: Math.cos(a) * d, y: 0.16, z: Math.sin(a) * d, color: 0xc4a860, rz: Math.cos(a) * 0.3, rx: Math.sin(a) * 0.3 }); }
    g.add(b.mesh(M.bag({ rough: 1 }))); g.rotation.z = 0.28; return g; } },
  tanuki: { label: 'Tanuki', r: 0.3, build() {
    const g = new THREE.Group(), c = M.plain(0x6e5a40, { rough: 0.55, brush: 0.1, grime: 0.3 }), dark = M.plain(0x3e3224, { rough: 0.6 }), lt = M.plain(0xd8c8a4, { rough: 0.7 });
    const add = (geo, m, x, y, z, s = 1) => { const a = new THREE.Mesh(geo, m); a.position.set(x, y, z); a.scale.setScalar(s); g.add(a); return a; };
    const sph = new THREE.SphereGeometry(1, 18, 14);
    add(sph, c, 0, 0.26, 0, 0.26); add(sph, lt, 0, 0.24, 0.17, 0.17); add(sph, c, 0, 0.6, 0.02, 0.17); add(sph, lt, 0, 0.56, 0.15, 0.08);
    add(sph, dark, -0.06, 0.65, 0.16, 0.025); add(sph, dark, 0.06, 0.65, 0.16, 0.025); add(sph, dark, 0, 0.57, 0.22, 0.02);
    const hat = add(new THREE.ConeGeometry(0.28, 0.1, 18), M.straw({ color: 0xb79a60 }), 0, 0.75, 0); hat.rotation.x = -0.1;
    add(new THREE.CylinderGeometry(0.03, 0.04, 0.12), M.plain(0x8a3a24), 0.22, 0.34, 0.08);
    return g; } },
  tiles: { label: 'Spare tiles', r: 0.3, build() {
    const g = new THREE.Group(); const mat = M.plain(0x5e6872, { rough: 0.5 }), r = rng(11);
    for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.3, 14, 1, true, 0, Math.PI), M.plain(0x5e6872, { rough: 0.5, side: THREE.DoubleSide })); m.rotation.set(0, r() * 0.4, Math.PI / 2); m.position.set((i % 3 - 1) * 0.19, 0.05 + Math.floor(i / 3) * 0.1, (r() - 0.5) * 0.08); g.add(m); }
    return g; } }
};

export { culmGeometry };
