// Terraced paddies through the year, promoted from Lab 02's paddies
// (labs/water/js/paddies.js: `p-mirror` spring, `p-taue` early summer,
// `p-summer`, `p-autumn`, `p-winter`) and the `p-aze` bund study added for
// this lane (L4):
//   paddies      the still water sheets (parts water_1…water_4, one material
//                each, as the classic): mizukagami mirror in spring, seedling
//                rows under the sheet in early summer, green in high summer,
//                drained to puddles in autumn, iced over in winter; a snowfall
//                (env.snow) sets the ice whatever the season, and rain rings
//                and the pool's ripple rings break the mirror.
//   paddy-bunds  one plot's silty bed and its aze: earth banks with a rounded
//                crest, the inner face plastered smooth and wet (aze-nuri), a
//                grassy crest, and a mizuguchi notch with its seki-ita board.
//   rice         hills on the transplanting grid (rows across the plot), each
//                hill a few blades in the season's height and colour, swaying
//                in honami waves with the wind.
// The season is a param (`season`, the same default on all three: 'early',
// nearest the classic's seedling cones); the game has no season clock yet.
// Water level (y = 0.02) and every water rect stay the classic ones.
import { HASH, NOISE } from '../materials.js?v=20261113a';
import { noise3 } from '../craft.js?v=20261113a';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { waterSky, rootOf, WATER_GLSL, FOG_PREMULT } from './sky.js?v=20261113a';
import { rippleNormals } from './textures.js?v=20261113a';
import { WATER_Y } from './field.js?v=20261113a';

export const SEASONS = ['spring', 'early', 'summer', 'autumn', 'winter'];
const SEASON_I = { spring: 0, early: 1, summer: 2, autumn: 3, winter: 4 };

/* ------------------------------------------------------------- water --- */

const VERT = /* glsl */`
#include <common>
#include <fog_pars_vertex>
varying vec3 vWorld;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.);
  vWorld = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */`
#include <common>
#include <fog_pars_fragment>
${HASH}
${NOISE}
${WATER_GLSL}
uniform sampler2D uNormal;
uniform vec4 uPlot;
uniform float uSeason, uStill, uFilm;
varying vec3 vWorld;
vec2 nslope(vec2 uv) { vec3 n = texture2D(uNormal, uv).xyz * 2. - 1.; return n.xy / max(n.z, 0.2); }
void main() {
  vec3 P = vWorld; vec2 p = P.xz; float t = uTime;
  vec3 V = normalize(cameraPosition - P);
  vec3 amb = ambientWater();
  float edgeD = min(min(p.x - uPlot.x, uPlot.z - p.x), min(p.y - uPlot.y, uPlot.w - p.y));
  // wind cat's-paws drifting across the sheet
  float gust = smoothstep(0.42, 0.78, vnoise2(p * 0.11 + vec2(t * 0.045, t * 0.02)) * 0.7 + vnoise2(p * 0.3 - vec2(t * 0.03, t * 0.05)) * 0.3) * clamp(uWind, 0., 2.);
  vec2 slope = nslope(p / 1.9 + vec2(t * 0.02, t * 0.013)) * 0.025 + nslope(p / 0.55 - vec2(t * 0.06, 0.)) * 0.07 * gust;
  float crest = 0.;
  slope += ringWaves(p, crest) * 0.9 + rainRings(p, t) * uRain;
  float ice = max(step(3.5, uSeason), smoothstep(0.35, 0.85, uSnow));
  slope *= 1. - ice * 0.96;
  vec3 N = normalize(vec3(slope.x, 1., slope.y));
  float fres = 0.02 + 0.98 * pow(1. - max(dot(N, V), 0.), 5.);
  vec3 R = reflect(-V, N); R.y = abs(R.y);
  vec3 refl = skyColor(R);
  refl = mix(refl, uWarm, uDusk * 0.2);
  vec3 L = normalize(uSunDir);
  vec3 H = normalize(L + V);
  float sunUp = smoothstep(-0.05, 0.1, L.y);
  vec3 spec = uSunColor * (pow(max(dot(N, H), 0.), 300.) * 6. + pow(max(dot(N, H), 0.), 30.) * 0.06) * sunUp;
  vec3 Hm = normalize(uMoonDir + V);
  spec += vec3(0.8, 0.86, 1.) * pow(max(dot(N, Hm), 0.), 260.) * 5. * uMoonI;
  float summer = step(1.5, uSeason) * step(uSeason, 2.5);
  // duckweed film gathering along the bunds
  float film = smoothstep(0.7, 0., edgeD) * smoothstep(0.45, 0.8, vnoise2(p * 1.7 + 3.)) * uFilm;
  // still water over mud: a mirror whenever the view is low (mizukagami)
  float mirror = uStill * (uSeason < 0.5 ? 1.4 : uSeason < 1.5 ? 1. : uSeason < 2.5 ? 0.48 : 0.72);
  float F = clamp(fres + mirror * (1. - gust * 0.6), 0., 1.);
  // the silty bed, with the seedling rows' shade (rows 0.48 m apart along x)
  float rows = 0.5 + 0.5 * sin(p.y * 13.09);
  vec3 bed = mix(vec3(0.07, 0.065, 0.045), vec3(0.11, 0.12, 0.07), vnoise2(p * 0.8)) * (0.86 + rows * 0.14 * step(0.5, uSeason)) * amb * 1.5;
  bed = mix(bed, vec3(0.08, 0.15, 0.05) * amb * 2., 0.6 * summer);
  float absorb = mix(0.42, 0.75, summer);
  vec3 col = bed * absorb * (1. - F) + refl * F + spec;
  float a = absorb * (1. - F) + F;
  col = mix(col, vec3(0.2, 0.33, 0.08) * amb * 2.2 * a, film * mix(0.45, 0.8, summer));
  if (uSeason > 2.5 && uSeason < 3.5) {
    // drained for the harvest: only puddles left in the ruts
    float pud = smoothstep(0.52, 0.6, vnoise2(p * 1.1) * 0.7 + vnoise2(p * 4.3) * 0.3);
    col *= pud; a *= pud;
  }
  if (ice > 0.001) {
    // a skin of ice, frosty and cracked, snow drifted against the bunds
    vec3 vo = voronoi2(p * 2.4);
    float crack = 1. - smoothstep(0., 0.03, vo.y - vo.x);
    vec3 iceC = mix(vec3(0.62, 0.7, 0.76), vec3(0.85, 0.9, 0.95), vnoise2(p * 3.)) * (amb * 1.4 + 0.1);
    iceC = mix(iceC, refl, 0.25 + fres * 0.5) * (1. - crack * 0.3);
    float snow = clamp(smoothstep(0.5, 0., edgeD) + smoothstep(0.6, 0.75, vnoise2(p * 0.7)) + uSnow * 0.4, 0., 1.);
    iceC = mix(iceC, vec3(0.92, 0.94, 0.98) * (amb * 1.2 + 0.2), snow);
    col = mix(col, iceC * 0.95, ice);
    a = mix(a, 0.95, ice);
  }
  col += (uSky * 0.4 + 0.3) * smoothstep(0.35, 1.2, crest) * 0.45 * a;
  col = min(col, vec3(1.6));
  ${FOG_PREMULT}
  gl_FragColor = vec4(col, clamp(a, 0., 1.));
}`;

export function buildPaddies(ctx, layout, p) {
  const { THREE: T, kitMaterials: km, tier } = ctx;
  const sky = waterSky(km);
  const group = new T.Group();
  const parts = {}, live = [], materials = [];
  const plots = layout.plots || [];
  plots.forEach(([px, pz, w, d], k) => {
    const uniforms = Object.assign(T.UniformsUtils.clone(T.UniformsLib.fog), sky.u, {
      uNormal: { value: rippleNormals(km) },
      uPlot: { value: new T.Vector4(px - w / 2, pz - d / 2, px + w / 2, pz + d / 2) },
      uSeason: { value: SEASON_I[p.season] ?? 1 },
      uStill: { value: p.still },
      uFilm: { value: p.film }
    });
    const material = new T.ShaderMaterial({
      name: `kit-water:paddy(${tier} season=${p.season} still=${p.still} film=${p.film})`,
      uniforms, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, premultipliedAlpha: true, depthWrite: false, fog: true
    });
    const water = new T.Mesh(new T.PlaneGeometry(w, d, 1, 1), material);
    water.rotation.x = -Math.PI / 2;
    water.position.set(px, WATER_Y, pz);
    group.add(water);
    parts[`water_${k + 1}`] = water;
    live.push(water);
    materials.push(material);
  });
  return {
    group, parts, sockets: {}, live,
    update(dt, t, env) { sky.sync(t, env, rootOf(group)); },
    dispose() { for (const m of materials) m.dispose(); }
  };
}

/* ------------------------------------------------------------- bunds --- */

// the aze cross-section, inner (paddy) side first: base 0.5 m, crest 0.28 m (the classic ridge's size)
const PROFILE = {
  hero: [[-0.25, -0.02], [-0.205, 0.16], [-0.14, 0.25], [-0.06, 0.28], [0.06, 0.28], [0.14, 0.25], [0.205, 0.16], [0.25, -0.02]],
  mid: [[-0.25, -0.02], [-0.17, 0.22], [-0.06, 0.28], [0.06, 0.28], [0.17, 0.22], [0.25, -0.02]],
  far: [[-0.25, -0.02], [-0.1, 0.28], [0.1, 0.28], [0.25, -0.02]]
};
const STEP = { hero: 0.4, mid: 1.0, far: 0 };
const COL = { mud: [0.29, 0.25, 0.18], mudWet: [0.2, 0.17, 0.12], grass: [0.37, 0.48, 0.23], grass2: [0.46, 0.55, 0.27], earth: [0.42, 0.4, 0.27] };

/**
 * One aze ridge from A to B (xz), `out` the unit direction away from the
 * paddy; the crest dips at `notch` (0..1 along, or -1) for the mizuguchi.
 * Vertex colours carry the plastered inner face, the grassy crest and the
 * outer slope; the material is the kit's shared vertex-colour matte.
 */
function ridgeGeometry(T, A, B, out, tier, seed, notch) {
  const prof = PROFILE[tier];
  const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
  const segs = STEP[tier] ? Math.max(1, Math.round(len / STEP[tier])) : 1;
  const ax = (B[0] - A[0]) / len, az = (B[1] - A[1]) / len;
  const pos = [], col = [], uv = [], idx = [];
  const K = prof.length;
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, d = t * len;
    const wob = tier === 'far' ? 0 : (noise3(d * 0.6, seed, 0.5) - 0.5) * 0.05;
    const dip = notch >= 0 ? Math.exp(-((((t - notch) * len) / 0.22) ** 2)) * 0.08 : 0;
    for (let j = 0; j < K; j++) {
      const [c, y0] = prof[j];
      const top = y0 > 0.2;
      const lift = tier === 'far' ? 0 : (noise3(d * 1.7, seed + j * 0.37, 2.1) - 0.5) * 0.035 * Math.max(0, y0) / 0.28;
      const y = Math.max(-0.02, y0 + lift - (top ? dip : dip * 0.5 * Math.max(0, y0) / 0.28));
      const cc = c + wob;
      pos.push(A[0] + ax * d + out[0] * cc, y, A[1] + az * d + out[1] * cc);
      uv.push(d, c + 0.25);
      const n = noise3(d * 2.3, seed + 7, j * 0.9);
      let rgb;
      if (top) rgb = mix(COL.grass, COL.grass2, n);
      else if (c < 0) rgb = mix(COL.mudWet, COL.mud, Math.min(1, Math.max(0, y0 / 0.2)) * 0.6 + n * 0.3);
      else rgb = mix(COL.earth, COL.grass, n * 0.7);
      col.push(...rgb);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < K - 1; j++) {
    const a = i * K + j, b = a + 1, c = a + K, e = c + 1;
    idx.push(a, c, b, b, c, e);
  }
  // end caps
  for (const [i, flip] of [[0, true], [segs, false]]) {
    const base = i * K;
    for (let j = 1; j < K - 1; j++) flip ? idx.push(base, base + j, base + j + 1) : idx.push(base, base + j + 1, base + j);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function buildBunds(ctx, layout, p) {
  const { THREE: T, tier, rng, kitMaterials: km, MAT } = ctx;
  const w = layout.w || 12, d = layout.d || 10, rw = 0.5;
  const group = new T.Group();
  const parts = {};
  // the silty floor just under the sheet, as the classic bed
  const mud = (MAT && MAT.paddyMud) || km.plain(0x4d4634, { rough: 1 });
  const bedGeo = new T.PlaneGeometry(w, d, 1, 1);
  const buv = bedGeo.attributes.uv;
  for (let i = 0; i < buv.count; i++) buv.setXY(i, buv.getX(i) * w * 0.5, buv.getY(i) * d * 0.5);
  const bed = new T.Mesh(bedGeo, mud);
  bed.rotation.x = -Math.PI / 2;
  bed.position.y = 0.008;
  bed.receiveShadow = true;
  group.add(bed);
  parts.bed = bed;
  // the four aze: north / south run the full length over the corners, east / west tuck under them
  const seed = 1 + Math.floor(rng() * 900);
  const notchSide = Math.floor(rng() * 4), notchAt = 0.25 + rng() * 0.5;
  const sides = [
    ['n', [-w / 2 - rw, -d / 2 - rw / 2], [w / 2 + rw, -d / 2 - rw / 2], [0, -1]],
    ['s', [w / 2 + rw, d / 2 + rw / 2], [-w / 2 - rw, d / 2 + rw / 2], [0, 1]],
    ['w', [-w / 2 - rw / 2, d / 2 + 0.15], [-w / 2 - rw / 2, -d / 2 - 0.15], [-1, 0]],
    ['e', [w / 2 + rw / 2, -d / 2 - 0.15], [w / 2 + rw / 2, d / 2 + 0.15], [1, 0]]
  ];
  const ridges = [];
  let board = null;
  sides.forEach(([, A, B, out], k) => {
    const hasNotch = p.mizuguchi && tier !== 'far' && k === notchSide;
    ridges.push(ridgeGeometry(T, A, B, out, tier, seed + k * 13, hasNotch ? notchAt : -1));
    if (hasNotch) {
      // seki-ita: the board that sets the water level, standing in the notch
      const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const t = notchAt * len, ax = (B[0] - A[0]) / len, az = (B[1] - A[1]) / len;
      board = new T.Mesh(new T.BoxGeometry(0.34, 0.16, 0.035), (MAT && MAT.timberDark) || km.shared('darkWood'));
      board.position.set(A[0] + ax * t, 0.2, A[1] + az * t);
      board.rotation.y = Math.atan2(-az, ax);
      board.castShadow = true;
      board.receiveShadow = true;
    }
  });
  // the four aze in one mesh on the kit's shared vertex-colour matte
  const ridgeGeo = mergeGeometries(ridges);
  for (const g of ridges) g.dispose();
  ridgeGeo.computeBoundingSphere();
  const ridgeMesh = new T.Mesh(ridgeGeo, km.shared('matte'));
  ridgeMesh.castShadow = tier !== 'far';
  ridgeMesh.receiveShadow = true;
  group.add(ridgeMesh);
  parts.ridges = ridgeMesh;
  // the same part list on every plot and tier: an empty marker where there is no board
  if (!board) board = new T.Group();
  group.add(board);
  parts.weir = board;
  return { group, parts, sockets: {}, live: [] };
}

/* -------------------------------------------------------------- rice --- */

// per season: hill height (m), blades, base/tip colours, lean, and the autumn panicle
const RICE = {
  spring: { h: 0.1, blades: 3, bent: 0, color: [0x9cc85a, 0xd4e890], lean: 0.12 },
  early: { h: 0.2, blades: 4, bent: 0, color: [0x7fb04a, 0xc4e07a], lean: 0.16 },
  summer: { h: 0.62, blades: 3, bent: 2, color: [0x3f7a2a, 0x7db14a], lean: 0.3 },
  autumn: { h: 0.82, blades: 2, bent: 0, color: [0xa49a3e, 0xe2c25a], lean: 0.26, heads: 1 },
  winter: { h: 0.08, blades: 3, bent: 0, color: [0x9c8a5e, 0xcdb98a], lean: 0.05 }
};
// hill grid per tier: rows (m apart, along x) and hills along each row; blades capped on the lower tiers
const GRID = { hero: { row: 0.48, hill: 0.32, maxBlades: 4, bent: true }, mid: { row: 0.62, hill: 0.44, maxBlades: 3, bent: false }, far: { row: 1.2, hill: 0.9, maxBlades: 2, bent: false } };

/** Plot rectangles from the classic stalks (the rice layout carries stalks, not plots): connected clusters on a 1 m grid. */
export function plotsFromStalks(stalks, margin = 0.6) {
  const cell = new Map();
  const key = (i, j) => i * 100003 + j;
  for (const [x, z] of stalks) cell.set(key(Math.floor(x), Math.floor(z)), [Math.floor(x), Math.floor(z)]);
  const seen = new Set(), rects = [];
  for (const [k0, [i0, j0]] of cell) {
    if (seen.has(k0)) continue;
    const queue = [[i0, j0]];
    seen.add(k0);
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    while (queue.length) {
      const [i, j] = queue.pop();
      x0 = Math.min(x0, i); x1 = Math.max(x1, i + 1); z0 = Math.min(z0, j); z1 = Math.max(z1, j + 1);
      for (let di = -2; di <= 2; di++) for (let dj = -2; dj <= 2; dj++) {
        const k = key(i + di, j + dj);
        if (cell.has(k) && !seen.has(k)) { seen.add(k); queue.push([i + di, j + dj]); }
      }
    }
    // the stalks' own extent inside the cluster, plus the classic's planting margin
    let sx0 = Infinity, sx1 = -Infinity, sz0 = Infinity, sz1 = -Infinity;
    for (const [x, z] of stalks) {
      if (x < x0 || x > x1 || z < z0 || z > z1) continue;
      sx0 = Math.min(sx0, x); sx1 = Math.max(sx1, x); sz0 = Math.min(sz0, z); sz1 = Math.max(sz1, z);
    }
    rects.push([sx0 - margin, sz0 - margin, sx1 + margin, sz1 + margin]);
  }
  return rects.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

/** One hill: blades fanned round the base (a blade is a tapered triangle, or a bent strip of three). */
function hillGeometry(T, season, grid) {
  const R = RICE[season] || RICE.early;
  const blades = Math.min(R.blades, grid.maxBlades);
  const bent = grid.bent ? Math.min(R.bent, blades) : 0;
  const c0 = new T.Color(R.color[0]), c1 = new T.Color(R.color[1]);
  const pos = [], col = [], nor = [], idx = [];
  const push = (x, y, z, c, nx, nz) => {
    pos.push(x, y, z); col.push(c.r, c.g, c.b);
    const l = Math.hypot(nx * 0.4, 0.92, nz * 0.4);
    nor.push(nx * 0.4 / l, 0.92 / l, nz * 0.4 / l); // normals lean up: thin blades light like a sward
  };
  const cc = new T.Color();
  for (let b = 0; b < blades; b++) {
    const a = (b / blades) * Math.PI * 2 + b * 0.7, ca = Math.cos(a), sa = Math.sin(a);
    const h = R.h * (0.8 + ((b * 37) % 10) / 45);
    const lean = R.lean * (0.6 + ((b * 13) % 7) / 10);
    const w = Math.max(0.006, R.h * 0.045);
    const base = pos.length / 3;
    if (b < bent) {
      // a strip of three triangles: base, a bend half way, the tip falling outward
      const pts = [[0, 0, w], [0.5, 0.55, w * 0.7], [1, 0.92, 0]];
      pts.forEach(([t, yk, ww]) => {
        const out = lean * t * t * h + 0.012;
        cc.copy(c0).lerp(c1, t);
        if (ww > 0) {
          push(ca * out - sa * ww, h * yk, sa * out + ca * ww, cc, ca, sa);
          push(ca * out + sa * ww, h * yk, sa * out - ca * ww, cc, ca, sa);
        } else push(ca * out, h * yk, sa * out, cc, ca, sa);
      });
      idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2, base + 2, base + 3, base + 4);
    } else {
      const out = lean * h + 0.012;
      push(-sa * w + ca * 0.012, 0, ca * w + sa * 0.012, c0, ca, sa);
      push(sa * w + ca * 0.012, 0, -ca * w + sa * 0.012, c0, ca, sa);
      push(ca * out, h, sa * out, c1, ca, sa);
      idx.push(base, base + 1, base + 2);
    }
  }
  if (R.heads && grid.bent) {
    // a ripe panicle nodding over: a gold blade bowed down past the leaves
    const ca = Math.cos(0.4), sa = Math.sin(0.4), w = 0.012, base = pos.length / 3;
    const gold0 = new T.Color(0xd9b44a), gold1 = new T.Color(0xf0d27a);
    [[0, R.h * 0.9], [0.14, R.h * 1.0], [0.24, R.h * 0.8]].forEach(([r, y], i) => {
      cc.copy(gold0).lerp(gold1, i / 2);
      push(ca * r - sa * w, y, sa * r + ca * w, cc, ca, sa);
      push(ca * r + sa * w, y, sa * r - ca * w, cc, ca, sa);
    });
    idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2, base + 2, base + 3, base + 4, base + 3, base + 5, base + 4);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/** Rice material: vertex colours, both sides, honami waves rolling across the field with the wind. */
function riceMaterial(T, sky, name) {
  const m = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide });
  m.name = name;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = sky.u.uTime;
    sh.uniforms.uWind = sky.u.uWind;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          #ifdef USE_INSTANCING
            vec2 base = (instanceMatrix * vec4(0., 0., 0., 1.)).xz;
          #else
            vec2 base = vec2(0.);
          #endif
          float hh = max(position.y, 0.);
          float wave = pow(sin(dot(base, vec2(0.85, 0.3)) * 0.9 - uTime * 1.5) * 0.5 + 0.5, 3.);
          vec2 bend = vec2(0.85, 0.3) * (0.05 + 0.22 * wave) * clamp(uWind, 0., 3.) * hh * hh * 1.6;
          transformed.xz += bend;
          transformed.y -= dot(bend, bend) * 0.8;
        }`);
  };
  m.customProgramCacheKey = () => 'kit-water-rice';
  return m;
}

export function buildRice(ctx, layout, p) {
  const { THREE: T, tier, rng, kitMaterials: km } = ctx;
  const grid = GRID[tier] || GRID.mid;
  const sky = waterSky(km);
  const stalks = layout.stalks || [];
  const rects = plotsFromStalks(stalks);
  const spots = [];
  for (const [x0, z0, x1, z1] of rects) {
    for (let z = z0 + 0.3; z <= z1 - 0.3 + 1e-6; z += grid.row) {
      for (let x = x0 + 0.3; x <= x1 - 0.3 + 1e-6; x += grid.hill) spots.push([x, z]);
    }
  }
  const geo = hillGeometry(T, p.season, grid);
  const material = riceMaterial(T, sky, `kit-water:rice(${tier} season=${p.season} height=${p.height})`);
  const rice = new T.InstancedMesh(geo, material, Math.max(1, spots.length));
  const o = new T.Object3D();
  spots.forEach(([x, z], i) => {
    o.position.set(x + (rng() - 0.5) * 0.06, 0, z + (rng() - 0.5) * 0.06);
    o.rotation.set(0, rng() * Math.PI * 2, 0);
    const s = (0.85 + rng() * 0.3);
    o.scale.set(s, s * p.height, s);
    o.updateMatrix();
    rice.setMatrixAt(i, o.matrix);
  });
  rice.count = spots.length;
  rice.instanceMatrix.needsUpdate = true;
  rice.castShadow = false;   // as the classic
  rice.receiveShadow = true;
  rice.computeBoundingSphere();
  const group = new T.Group();
  group.add(rice);
  return {
    group, parts: { stalks: rice }, sockets: {}, live: [rice],
    update(dt, t, env) { sky.sync(t, env, rootOf(group)); },
    dispose() { material.dispose(); }
  };
}
