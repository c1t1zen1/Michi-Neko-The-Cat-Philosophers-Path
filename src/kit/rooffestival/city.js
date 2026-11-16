// roof-distant-city: the sea of low roofs around the Roof Road (rooftops/js/pieces/skyline.js buildDistantCity).
// Classic is ~6,800 instanced houses (two InstancedMeshes, ~130k triangles). The kit builds MERGED silhouettes
// instead: one gabled block (low wall + tiled roof) per grid cell, the cell size growing with the tier, all in ONE
// mesh on the shared vertex-colour matte kit material (KIT_SHARED.matte: already in the pagoda's far draw), so the whole
// city is one draw (classic: two). Cells within 14 m of the route stay empty, as classic. Deterministic: ctx.rng.
import { defineAsset } from '../contract.js?v=20261116a';
import { disposeTree } from './fx.js?v=20261116a';

const STEP = { hero: 16, mid: 34, far: 8.5 };

/** A flat-array accumulator for coloured boxes and gabled prisms (no per-shape geometry objects). */
class Soup {
  constructor() { this.p = []; this.n = []; this.c = []; }
  tri(a, b, c, col) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const lc = col.map((v) => v ** 2.2);   // authored as display colours; vertex colours are linear
    for (const q of [a, b, c]) { this.p.push(q[0], q[1], q[2]); this.n.push(nx, ny, nz); this.c.push(lc[0], lc[1], lc[2]); }
  }
  quad(a, b, c, d, col) { this.tri(a, b, c, col); this.tri(a, c, d, col); }
}

function house(S, x, z, w, d, hh, rise, along, wallCol, roofCol, withWalls) {
  // local frame: u along the ridge (length L), v across; ridge along x when along, else z
  const L = along ? w : d, W = along ? d : w, X = (u, v) => (along ? [x + u, z + v] : [x + v, z + u]);
  const P = (u, v, y) => { const q = X(u, v); return [q[0], y, q[1]]; };
  const l = L / 2, wd = W / 2 * 1.05, top = hh + rise;
  if (withWalls) {
    const wl = [wallCol[0], wallCol[1], wallCol[2]], dk = wl.map((v) => v * 0.8);
    S.quad(P(-l, wd * 0.95, 0), P(l, wd * 0.95, 0), P(l, wd * 0.95, hh), P(-l, wd * 0.95, hh), dk);
    S.quad(P(l, -wd * 0.95, 0), P(-l, -wd * 0.95, 0), P(-l, -wd * 0.95, hh), P(l, -wd * 0.95, hh), wl);
    S.quad(P(l, wd * 0.95, 0), P(l, -wd * 0.95, 0), P(l, -wd * 0.95, hh), P(l, wd * 0.95, hh), dk);
    S.quad(P(-l, -wd * 0.95, 0), P(-l, wd * 0.95, 0), P(-l, wd * 0.95, hh), P(-l, -wd * 0.95, hh), wl);
  }
  const lit = roofCol.map((v) => v * 1.12);
  S.quad(P(-l, wd, hh), P(l, wd, hh), P(l, 0, top), P(-l, 0, top), roofCol);          // front slope
  S.quad(P(l, -wd, hh), P(-l, -wd, hh), P(-l, 0, top), P(l, 0, top), lit);            // back slope
  S.tri(P(l, wd, hh), P(l, -wd, hh), P(l, 0, top), roofCol);                           // gables
  S.tri(P(-l, -wd, hh), P(-l, wd, hh), P(-l, 0, top), roofCol);
}

/** Far tier: ONE InstancedMesh of a 14-triangle gabled house on the shared matte material, on a 8.5 m lattice (classic 7 m)
 *  (classic: 7,956 houses as two InstancedMeshes). From the Roof Road camera the city IS the skyline, so the far tier keeps
 *  classic's density and coverage instead of dropping blocks. */
function buildFarCity(ctx, layout) {
  const T = ctx.THREE, rng = ctx.rng, step = STEP.far;
  const b = layout.bounds || { x0: -230, x1: 200, z0: -260, z1: 150 }, route = layout.route || [];
  const cell = 16, hash = new Map();
  for (const [x, z] of route) { const k = Math.floor(x / cell) + ',' + Math.floor(z / cell); (hash.get(k) || hash.set(k, []).get(k)).push([x, z]); }
  const near = (x, z, r) => {
    const cx = Math.floor(x / cell), cz = Math.floor(z / cell), m = Math.ceil(r / cell);
    for (let i = -m; i <= m; i++) for (let j = -m; j <= m; j++) for (const p of hash.get((cx + i) + ',' + (cz + j)) || []) if ((p[0] - x) ** 2 + (p[1] - z) ** 2 < r * r) return true;
    return false;
  };
  // unit house: walls 0..0.5 (light), gabled roof 0.5..1 (dark), ridge along x
  const S = new Soup(), WL = [0.42, 0.36, 0.3], DK = WL.map((v) => v * 0.8), RF = [0.17, 0.18, 0.22], RL = RF.map((v) => v * 1.12);
  const hx = 0.5, hz = 0.5, wy = 0.5;
  S.quad([-hx, 0, hz], [hx, 0, hz], [hx, wy, hz], [-hx, wy, hz], DK);
  S.quad([hx, 0, -hz], [-hx, 0, -hz], [-hx, wy, -hz], [hx, wy, -hz], WL);
  S.quad([hx, 0, hz], [hx, 0, -hz], [hx, wy, -hz], [hx, wy, hz], DK);
  S.quad([-hx, 0, -hz], [-hx, 0, hz], [-hx, wy, hz], [-hx, wy, -hz], WL);
  S.quad([-hx, wy, hz * 1.05], [hx, wy, hz * 1.05], [hx, 1, 0], [-hx, 1, 0], RF);
  S.quad([hx, wy, -hz * 1.05], [-hx, wy, -hz * 1.05], [-hx, 1, 0], [hx, 1, 0], RL);
  S.tri([hx, wy, hz], [hx, wy, -hz], [hx, 1, 0], RF);
  S.tri([-hx, wy, -hz], [-hx, wy, hz], [-hx, 1, 0], RF);
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(S.p, 3));
  geo.setAttribute('normal', new T.Float32BufferAttribute(S.n, 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array((S.p.length / 3) * 2), 2));
  geo.setAttribute('color', new T.Float32BufferAttribute(S.c, 3));
  const pts = [];
  for (let x = (b.x0 ?? -230) - 80; x <= (b.x1 ?? 200) + 80; x += step) {
    for (let z = (b.z0 ?? -260) - 80; z <= (b.z1 ?? 150) + 80; z += step) {
      const h = rng(), jx = x + (h - 0.5) * 3, jz = z + (rng() - 0.5) * 3;
      if (near(jx, jz, 14)) continue;
      pts.push([jx, jz, h, rng(), rng()]);
    }
  }
  const mesh = new T.InstancedMesh(geo, ctx.kitMaterials.shared('matte'), pts.length);
  const d = new T.Object3D(), tint = new T.Color();
  pts.forEach(([x, z, h, r1, r2], i) => {
    const w = 4.5 + h * 3, dd = 5 + r1 * 4, hh = 1.7 + (h > 0.86 ? 1.5 : 0) + r2 * 0.7;
    const roofH = 1.3 * 0.78 + h * 0.6 * 0.78;
    d.position.set(x, 0, z); d.rotation.y = h > 0.5 ? 0 : Math.PI / 2; d.scale.set(w * 1.05, (hh + roofH) * 1.0, dd * 1.05); d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
    const k = 0.85 + r1 * 0.3; mesh.setColorAt(i, tint.setRGB(k, k * 0.98, k * 0.95));
  });
  mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.receiveShadow = true;
  mesh.name = '';
  const group = new T.Group();
  group.add(mesh);
  return { group, parts: { city: mesh }, sockets: {}, live: [], blocks: pts.length, dispose() { geo.dispose(); disposeTree(group); } };
}

function buildCity(ctx, layout) {
  if (ctx.tier === 'far') return buildFarCity(ctx, layout);
  const T = ctx.THREE, tier = ctx.tier, rng = ctx.rng, step = STEP[tier] || 30, S = new Soup();
  const b = layout.bounds || { x0: -230, x1: 200, z0: -260, z1: 150 }, route = layout.route || [];
  const cell = 16, hash = new Map();                                // route points bucketed for the 14 m test
  for (const [x, z] of route) { const k = Math.floor(x / cell) + ',' + Math.floor(z / cell); (hash.get(k) || hash.set(k, []).get(k)).push([x, z]); }
  const near = (x, z, r) => {
    const cx = Math.floor(x / cell), cz = Math.floor(z / cell), m = Math.ceil(r / cell);
    for (let i = -m; i <= m; i++) for (let j = -m; j <= m; j++) for (const p of hash.get((cx + i) + ',' + (cz + j)) || []) if ((p[0] - x) ** 2 + (p[1] - z) ** 2 < r * r) return true;
    return false;
  };
  const far = tier === 'far', k = step / 7;                         // blocks stand for k x k classic houses
  let n = 0;
  for (let x = (b.x0 ?? -230) - 80; x <= (b.x1 ?? 200) + 80; x += step) {
    for (let z = (b.z0 ?? -260) - 80; z <= (b.z1 ?? 150) + 80; z += step) {
      const h = rng(), jx = x + (h - 0.5) * step * 0.3, jz = z + (rng() - 0.5) * step * 0.3;
      if (near(jx, jz, 14 + Math.min(step * 0.35, 6))) continue;   // a3: the gap beside the route stays small (was 14 + 0.35 step = 36 m at far: bare ground under the run camera)
      const w = (4.5 + h * 3) * (0.9 + k * 0.28), d = (5 + rng() * 4) * (0.9 + k * 0.28);
      const hh = 1.7 + (h > 0.86 ? 1.5 : 0) + rng() * 0.7, rise = (1.3 + h * 0.6) * 0.78;
      const kk = rng(), roof = [0.36 + kk * 0.14, 0.4 + kk * 0.14, 0.45 + kk * 0.15], wall = [0.56 + kk * 0.14, 0.5 + kk * 0.12, 0.42 + kk * 0.1];
      house(S, jx, jz, Math.min(w, step * 0.86), Math.min(d, step * 0.86), far ? 0 : hh, far ? hh + rise * 2 : rise * 1.4, h > 0.5, wall, roof, !far);
      n++;
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(S.p, 3));
  geo.setAttribute('normal', new T.Float32BufferAttribute(S.n, 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array((S.p.length / 3) * 2), 2));
  geo.setAttribute('color', new T.Float32BufferAttribute(S.c, 3));
  geo.computeBoundingSphere();
  const mesh = new T.Mesh(geo, ctx.kitMaterials.shared('matte'));
  mesh.receiveShadow = true;
  mesh.name = '';
  const group = new T.Group();
  group.add(mesh);
  return { group, parts: { city: mesh }, sockets: {}, live: [], blocks: n, dispose() { disposeTree(group); } };
}

/** A route like the real one: a zig-zag of legs across the bounds, a point every 2 m. */
function sampleRoute() {
  const pts = [], legs = [[-230, -260], [68, -68], [68, 150], [-120, 100], [-228, -88], [-284, -196], [-284, 60]];
  for (let i = 0; i + 1 < legs.length; i++) {
    const [ax, az] = legs[i], [bx, bz] = legs[i + 1], len = Math.hypot(bx - ax, bz - az);
    for (let s = 0; s < len; s += 2) pts.push([ax + (bx - ax) * s / len, az + (bz - az) * s / len]);
  }
  return pts;
}

export const cityAsset = defineAsset({
  id: 'roof-distant-city', family: 'rooffestival', lab: 'roofroad/city', label: 'Distant city', tiers: ['hero', 'mid', 'far'],
  sample: () => ({ x: 0, y: 0, z: 0, ry: 0, index: 0, band: 'far', bounds: { x0: -290, x1: 100, z0: -470, z1: 200 }, route: sampleRoute() }),
  build: buildCity
});
