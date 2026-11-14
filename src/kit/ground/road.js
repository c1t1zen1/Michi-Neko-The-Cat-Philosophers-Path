// The road and its worn shoulders (inventory `path`, `path-shoulders`).
//
// With the valley ground modular too (the game's modular set) they are not
// meshes any more: they are paint in the valley's GroundField. The road lays
// Kyoto paving (nobedan by default: cut and natural stones, the valley's
// "cobbles"; ishidatami setts and four more by param) down the classic ribbon, with the
// same width, wobble and bridge gap; the shoulders are standing wear G0 (the
// lab's "the shoulder is wherever G is in between"), so the meadow is worn to
// earth beside the stones, kicked gravel lies along the edge, ruts hold the
// rain and the snow lies thinner where feet go. The instance keeps an empty
// part so gameplay and the contract see a named asset.
//
// Swapped alone (the ground classic), each builds what the classic built: a
// ribbon (road) or a fading strip (shoulders) at the classic heights, shaded
// by the same ground material over a small field of its own.
import * as THREE from 'three';
import { GroundField, cachedField, PAVE, sstep, CH } from './field.js?v=20261113a';
import { groundLayers } from './layers.js?v=20261113a';
import { createGroundMaterial, sunDirAt, GroundWeather } from './material.js?v=20261113a';
import { currentValleyGround } from './valley.js?v=20261113a';
import { worldNoise } from '../../textures.js?v=20261113a';

/**
 * The road's centreline. Mirrors countryside.js layoutPath() (the path layout
 * carries these as `layout.points`; the shoulders' classic builder hardcodes
 * the same six points, so the shoulder layout carries none).
 */
export const ROAD_POINTS = [[0, 0, 34], [-2, 0, 20], [1.5, 0, 6], [0, 0, -8], [-1, 0, -16], [0, 0, -30]];
// countryside.js meshPathClassic: the ground-level road stops at the bridge approaches
const BRIDGE_GAP = { x: -1, z: 30.5, width: 3.2, depth: 9.0 };

const curveOf = (points) => new THREE.CatmullRomCurve3((points || ROAD_POINTS).map(([x, y, z]) => new THREE.Vector3(x, y, z)));
const roadWobble = (t) => Math.sin(t * 40) * 0.15;                         // meshPathClassic
const shoulderWobble = (t) => Math.sin(t * 27) * 0.35 + Math.sin(t * 61) * 0.2;   // meshPathShouldersClassic
const inGap = (x, z) => Math.abs(x - BRIDGE_GAP.x) < BRIDGE_GAP.width / 2 && Math.abs(z - BRIDGE_GAP.z) < BRIDGE_GAP.depth / 2;

/**
 * The road's frame over a field, for every texel within REACH metres of the
 * centreline: the nearest dense sample's curve parameter t, the signed lateral
 * offset s (positive to the classic ribbon's right), whether that sample is
 * in the bridge gap, and the three edge noises. A pure function of the field
 * rectangle and the points, so it is computed once and shared by the road
 * and the shoulders (and by repeat builds).
 */
const REACH = 4.8;
const _frames = new Map();
function roadFrame(field, points) {
  const key = [field.x0, field.z0, field.w, field.d, field.k, JSON.stringify(points)].join('|');
  if (_frames.has(key)) return _frames.get(key);
  const curve = curveOf(points), n = 480, px = new Float32Array(n + 1), pz = new Float32Array(n + 1), sx = new Float32Array(n + 1), sz = new Float32Array(n + 1);
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = curve.getPoint(t), tan = curve.getTangent(t), l = Math.hypot(tan.x, tan.z) || 1;
    px[i] = p.x; pz[i] = p.z; sx[i] = -tan.z / l; sz[i] = tan.x / l;
  }
  const { nx, nz, k, x0, z0 } = field, R2 = REACH * REACH;
  const best = new Float32Array(field.n).fill(Infinity), which = new Int32Array(field.n).fill(-1);
  for (let q = 0; q <= n; q++) {
    const i0 = Math.max(0, Math.floor((px[q] - REACH - x0) * k)), i1 = Math.min(nx - 1, Math.ceil((px[q] + REACH - x0) * k));
    const j0 = Math.max(0, Math.floor((pz[q] - REACH - z0) * k)), j1 = Math.min(nz - 1, Math.ceil((pz[q] + REACH - z0) * k));
    for (let j = j0; j <= j1; j++) {
      const dz = z0 + (j + 0.5) / k - pz[q], row = j * nx;
      for (let i = i0; i <= i1; i++) {
        const dx = x0 + (i + 0.5) / k - px[q], d2 = dx * dx + dz * dz;
        if (d2 < R2 && d2 < best[row + i]) { best[row + i] = d2; which[row + i] = q; }
      }
    }
  }
  let m = 0;
  for (let idx = 0; idx < field.n; idx++) if (which[idx] >= 0) m++;
  const F = { idx: new Int32Array(m), s: new Float32Array(m), t: new Float32Array(m), gap: new Uint8Array(m), n71: new Float32Array(m), n73: new Float32Array(m), n79: new Float32Array(m) };
  let c = 0;
  for (let idx = 0; idx < field.n; idx++) {
    const q = which[idx];
    if (q < 0) continue;
    const x = x0 + ((idx % nx) + 0.5) / k, z = z0 + (Math.floor(idx / nx) + 0.5) / k;
    F.idx[c] = idx; F.s[c] = (x - px[q]) * sx[q] + (z - pz[q]) * sz[q]; F.t[c] = q / n; F.gap[c] = inGap(px[q], pz[q]) ? 1 : 0;
    F.n71[c] = worldNoise(x, z, 1.6, 2, 71); F.n73[c] = worldNoise(x, z, 0.8, 3, 73); F.n79[c] = worldNoise(x, z, 2.2, 2, 79);
    c++;
  }
  _frames.set(key, F);
  return F;
}

/** Paint the road's paving into a field. */
export function paintRoad(field, points, { width = 3.8, style = 'nobedan', moss = 0.2 } = {}) {
  const sid = PAVE[style] ?? PAVE.setts, half = width / 2, F = roadFrame(field, points);
  for (let c = 0; c < F.idx.length; c++) {
    if (F.gap[c]) continue;
    const rag = (F.n71[c] - 0.5) * 0.22;
    const a = 1 - sstep(half - 0.14 + rag, half + 0.08 + rag, Math.abs(F.s[c] + roadWobble(F.t[c])));
    if (a <= 0.01) continue;
    const idx = F.idx[c];
    field.setAt(idx, { paving: 1, moss }, a);
    if (a > 0.2) field.style[idx] = sid;
    field.snow[idx] = Math.min(field.snow[idx], 1 - 0.3 * a);       // trodden stone holds less snow
  }
  field.touch();
}

/** Paint the worn shoulders (standing wear, kicked gravel, ruts) into a field. */
export function paintShoulders(field, points, { width = 6.4, wear = 0.75, gravel = 0.35 } = {}) {
  const half = width / 2, F = roadFrame(field, points), G = CH.gravel;
  for (let c = 0; c < F.idx.length; c++) {
    const q = Math.abs(F.s[c] + shoulderWobble(F.t[c])) + (F.n73[c] - 0.5) * 0.5;   // ragged, like the classic strip's wobble
    const g0 = wear * (1 - sstep(1.7, half - 0.2, q));
    if (g0 <= 0.01) continue;
    const idx = F.idx[c];
    field.standAt(idx, g0);
    const kick = gravel * sstep(1.8, 2.2, q) * (1 - sstep(2.5, 3.0, q)) * sstep(0.35, 0.6, F.n79[c]);
    if (kick > 0.01) { const o = idx * 8; field.S[o + G] = Math.max(field.S[o + G], kick); }
    // a rut where feet and handcarts keep to the road's edge: the rain stands in it
    field.base[idx] = Math.min(field.base[idx], -0.012 * sstep(1.85, 2.15, q) * (1 - sstep(2.35, 2.75, q)));
    field.snow[idx] = Math.min(field.snow[idx], 1 - 0.55 * g0);
  }
  field.touch();
}

/* ------------------------------------------------- standalone surfaces --- */

// The meadow tint the classic ground has on the road (0x5d8442 at luminance 0.5).
const NEUTRAL_TINT = (() => {
  const c = new THREE.Color(0x5d8442), lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b, k = 0.5 / lum;
  return [c.r * k, c.g * k, c.b * k];
})();

/** A ribbon along the curve: the classic road's or shoulder's geometry, with `tint` (and `edge` for the strip). */
function ribbon(curve, { width, wobble, y, steps = 80, gap = false, edge = false, vRepeat = 0.6 }) {
  const verts = [], uvs = [], idx = [], tint = [], edges = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, p = curve.getPoint(t), tan = curve.getTangent(t);
    const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    const w = wobble(t);
    verts.push(p.x - side.x * (width / 2 + w), y, p.z - side.z * (width / 2 + w), p.x + side.x * (width / 2 - w), y, p.z + side.z * (width / 2 - w));
    uvs.push(0, i * vRepeat, 1, i * vRepeat);
    tint.push(...NEUTRAL_TINT, ...NEUTRAL_TINT);
    edges.push(0, 1);
    if (i < steps) {
      const next = curve.getPoint((i + 1) / steps);
      if (!(gap && inGap((p.x + next.x) / 2, (p.z + next.z) / 2))) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute('tint', new THREE.Float32BufferAttribute(tint, 3));
  if (edge) g.setAttribute('edge', new THREE.Float32BufferAttribute(edges, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A small field around the road (8 texels per metre), earth unless painted. */
function roadField(points) {
  const box = new THREE.Box3().setFromPoints(curveOf(points).getPoints(120));
  const x0 = Math.floor(box.min.x) - 5, z0 = Math.floor(box.min.z) - 5;
  return new GroundField({ x0, z0, w: Math.ceil(box.max.x) + 5 - x0, d: Math.ceil(box.max.z) + 5 - z0, k: 8 });
}

/** update(dt, t, env) for a surface material: the sun from env.hour, the lab's weather schedule. */
function surfaceUpdater(U) {
  const weather = new GroundWeather();
  let time = 0;
  return (dt, t, env = {}) => {
    time += dt; U.uTime.value = time;
    const sun = sunDirAt(typeof env.hour === 'number' ? env.hour : 12, U.uSunDir.value), up = Math.max(0, sun.y);
    U.uSunCol.value.setRGB(1, 0.94, 0.84).multiplyScalar(up > 0 ? Math.min(1, up * 4) : 0);
    weather.update(dt, { rain: env.wet || 0, snowFall: env.snow || 0, mist: typeof env.mist === 'number' ? env.mist : 0, sun: Math.min(1, up * 3) });
    weather.apply(U);
  };
}

function emptyPart(T3, name) {
  const group = new T3.Group();
  const anchor = new T3.Object3D();
  group.add(anchor);
  return { group, parts: { [name]: anchor }, sockets: {}, live: [] };
}

/* --------------------------------------------------------------- builders --- */

export function buildRoad(ctx, layout, p) {
  const { THREE: T3, tier, kitMaterials: km } = ctx;
  const points = layout.points || ROAD_POINTS;
  const ground = currentValleyGround(km);
  if (ground) {
    paintRoad(ground.field, points, { width: p.width, style: p.paving, moss: p.moss });
    return emptyPart(T3, 'road');
  }
  const field = cachedField(`road|${JSON.stringify(points)}|${p.width}|${p.paving}|${p.moss}`, () => {
    const f = roadField(points);
    paintRoad(f, points, { width: p.width, style: p.paving, moss: p.moss });
    return f;
  });
  const material = createGroundMaterial(field, groundLayers(km), { tier, name: `kit-ground:path:${p.paving}-w${p.width}-moss${p.moss}` });
  const mesh = new T3.Mesh(ribbon(curveOf(points), { width: p.width, wobble: roadWobble, y: 0.02, gap: true }), material);
  mesh.receiveShadow = true;
  const group = new T3.Group();
  group.add(mesh);
  return {
    group, parts: { road: mesh }, sockets: {}, live: [],
    update: surfaceUpdater(material.userData.u),
    dispose() { material.dispose(); field.dispose(); }
  };
}

export function buildShoulders(ctx, layout, p) {
  const { THREE: T3, tier, kitMaterials: km } = ctx;
  const points = layout.points || ROAD_POINTS;
  const ground = currentValleyGround(km);
  if (ground) {
    paintShoulders(ground.field, points, { width: p.width, wear: p.wear, gravel: p.gravel });
    return emptyPart(T3, 'shoulders');
  }
  const field = cachedField(`shoulders|${JSON.stringify(points)}|${p.width}|${p.wear}|${p.gravel}`, () => {
    const f = roadField(points);
    for (let i = 0; i < f.n; i++) f.S[i * 8] = 1;                  // meadow floor, worn below
    paintShoulders(f, points, { width: p.width, wear: p.wear, gravel: p.gravel });
    return f;
  });
  const material = createGroundMaterial(field, groundLayers(km), { tier, edgeAlpha: true, name: `kit-ground:path-shoulders:w${p.width}-wear${p.wear}-gravel${p.gravel}` });
  const mesh = new T3.Mesh(ribbon(curveOf(points), { width: p.width, wobble: shoulderWobble, y: 0.012, edge: true, vRepeat: 0.8 }), material);
  mesh.receiveShadow = true;
  mesh.renderOrder = -1;
  const group = new T3.Group();
  group.add(mesh);
  return {
    group, parts: { shoulders: mesh }, sockets: {}, live: [],
    update: surfaceUpdater(material.userData.u),
    dispose() { material.dispose(); field.dispose(); }
  };
}
