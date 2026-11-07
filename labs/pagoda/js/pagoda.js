// The parametric gojū-no-tō. One function, buildPagoda(opts, { detail }),
// builds a five-storey pagoda in real metres from a handful of measured
// proportions (see presets.js): storey widths taper by teigen, each eave is a
// near-constant projection so the eave-to-body ratio grows upward (2.2 → 3.0
// at Hōryū-ji), storey heights are solved so H ÷ W₁ and the sōrin share match
// the record, and every roof is lofted with the measured corner rise (sori).
// Detail tiers: hero (instanced kumimono, futanoki rafters, swept tile rows,
// kōran, fūtaku, full sōrin), mid (shader tiles, a stepped bracket shelf, a
// painted soffit) and far (silhouette: roofs, dark eave band, needle sōrin).
import * as THREE from 'three';
import { Bag, UNIT, gridGeometry, clamp, paint, countMesh, suienTexture, doorTexture, renjiTexture, eaveTexture, bracketCardTexture } from './util.js';
import { addPatch } from './air.js';
import { PAINTS, byKey } from './presets.js';
import { HASH, NOISE } from '../../shared/glsl.js';
import { plasterTextures, stoneTextures, texturedMaterial } from '../../shared/game.js';

export const DEFAULTS = {
  preset: 'valley', storeys: 5,
  roof: 'tile',          // flat | tile | ribbon | bark | copper
  brackets: 'mitesaki',  // none | shadow | shelf | card | mitesaki
  rafters: 'futanoki',   // none | soffit | futanoki | fan
  body: 'wayo',          // plain | wayo
  koran: 'rail',         // none | band | rail
  sorinStyle: 'full',    // needle | full
  bells: true, ornaments: true, podium: 'kidan',
  snow: 0, age: 0.35
};
const PROPS = ['H', 'ratio', 'top', 'overhang', 'oTaper', 'sorin', 'curve', 'start', 'sori', 'flare', 'pitch', 'pitchUp', 'paint', 'mokoshi'];

export function resolveOpts(input = {}) {
  const P = byKey(input.preset || DEFAULTS.preset);
  const base = { ...DEFAULTS };
  for (const k of PROPS) base[k] = P[k];
  if (P.roof === 'bark') base.roof = 'bark';
  return { ...base, ...input, preset: P.key };
}

export function tierOpts(o, detail) {
  if (detail === 'mid') return { ...o, brackets: o.brackets === 'mitesaki' ? 'shelf' : o.brackets, rafters: o.rafters === 'none' ? 'none' : 'soffit', roof: o.roof === 'ribbon' ? 'tile' : o.roof, koran: o.koran === 'rail' ? 'band' : o.koran, bells: false, ornaments: false };
  if (detail === 'far') return { ...o, brackets: o.brackets === 'none' ? 'none' : 'shadow', rafters: 'none', roof: o.roof === 'ribbon' ? 'tile' : o.roof, koran: 'none', bells: false, sorinStyle: 'needle', body: 'plain', podium: 'slab', ornaments: false, mokoshi: false, lowpoly: true };
  return o;
}

/* ---------------- proportions ---------------- */

export function towerDims(o) {
  const n = o.storeys;
  const f = (i) => (n > 1 ? i / (n - 1) : 0);
  const S = [];
  for (let i = 0; i < n; i++) {
    const w = 1 - (1 - o.top) * f(i);
    const bs = 0.074 * (0.8 + 0.2 * w);
    S.push({
      i, w, bs, bays: w >= 0.6 ? 3 : 2,
      proj: 4.25 * bs, b: 3.45 * bs,
      ov: o.overhang * (1 - o.oTaper * f(i)),
      hb: i === 0 ? 0.6 : 0.3 + 0.1 * w,
      pitch: o.pitch + o.pitchUp * f(i)
    });
  }
  const kd = 0.1, podiumH = 0.16, robanHalf = 0.1;
  const stack = (k) => {
    let y = podiumH;
    for (let i = 0; i < n; i++) {
      const s = S[i];
      s.R = s.w / 2 + s.ov;
      s.y0 = y; s.h = k * s.hb; s.yTop = y + s.h; s.yB = s.yTop + s.b;
      s.concave = i === n - 1 ? 0.3 : 0.45;
      s.sr = s.pitch * (1 - s.concave);              // the roof's slope at the eave
      s.yE = s.yB + 0.08 - s.sr * Math.max(0, s.R - (s.w / 2 + s.proj));
      s.rIn = i < n - 1 ? S[i + 1].w / 2 + kd + 0.012 : robanHalf;
      s.yR = s.yE + s.pitch * (s.R - s.rIn);
      y = s.yR + (i < n - 1 ? 0.025 : 0);
    }
    return y;
  };
  const sumHb = S.reduce((a, s) => a + s.hb, 0);
  const T0 = stack(0);
  let k = 1;
  if (o.ratio) k = clamp((o.ratio * (1 - o.sorin) - T0) / sumHb, 0.5, 1.9);
  const top = stack(k);
  const Hu = top / (1 - o.sorin);
  const m = o.H / Hu;                  // metres per first-storey width
  for (const s of S) for (const key of ['w', 'bs', 'proj', 'b', 'ov', 'R', 'y0', 'h', 'yTop', 'yB', 'yE', 'rIn', 'yR']) s[key] *= m;
  for (const s of S) {
    s.rise = o.curve * o.sori * 2 * s.R;
    s.edgeH = 0.07 * m * (0.85 + 0.15 * s.w / m);
    s.rd = 0.034 * m;
    s.bellH = 0.05 * m * (0.85 + 0.15 * s.w / m);
  }
  return {
    S, n, W1: m, H: o.H, k, kd: kd * m, podiumH: podiumH * m, robanHalf: robanHalf * m,
    podiumHalf: (0.5 + 0.36) * m, sorinY: top * m, sorinH: (Hu - top) * m,
    ratio: Hu, eaveRatio: S.map((s) => (2 * s.R) / s.w)
  };
}

/* ---------------- the roof surface ---------------- */

export const NK = [], TK = [];
for (let k = 0; k < 4; k++) { const a = (k * Math.PI) / 2; NK.push(new THREE.Vector3(Math.sin(a), 0, Math.cos(a))); TK.push(new THREE.Vector3(Math.cos(a), 0, -Math.sin(a))); }

/** Square hipped roof lofted from the eave (half-span R at yE, rising toward
 *  the corners by the sori) to the inner square (rIn at yR). u ∈ [-1, 1]
 *  runs along the eave, t ∈ [0, 1] from the eave up the slope. */
export function roofFrame({ R, rIn, yE, yR, rise, start, flare, concave = 0.45 }) {
  const lift = (a) => { const x = clamp((Math.abs(a) - start) / (1 - start), 0, 1); return x * x; };
  const g = (t) => t * (1 - concave) + concave * t * t;
  const S = (k, u, t, out = new THREE.Vector3()) => {
    const fu = lift(u), rr = R + (rIn - R) * t, ext = R * flare * fu * (1 - t);
    const nd = rr + ext, td = u * rr + Math.sign(u) * ext;
    const y = yE + rise * fu * Math.pow(1 - t, 1.6) + (yR - yE) * g(t);
    return out.set(NK[k].x * nd + TK[k].x * td, y, NK[k].z * nd + TK[k].z * td);
  };
  return { S, lift, R, rIn, yE, yR, rise, flare };
}

/* ---------------- materials ---------------- */

const ROOF_PARS = /* glsl */`
uniform float uStyle, uRib, uRibAmp, uSnow, uAge, uBump;
varying vec2 vRoofUv; varying float vRoofUp;
${HASH}
${NOISE}
float roofH(vec2 p) {
  if (uStyle < 0.5) return 0.0;
  if (uStyle < 1.5) {
    float x = fract(p.x / uRib) - 0.5;
    float rnd = sqrt(max(0.0, 1.0 - (x / 0.2) * (x / 0.2)));
    float pan = -0.4 * (1.0 - pow(abs(x) / 0.5, 2.0));
    float c = fract(p.y / 0.32);
    return mix(pan, rnd, step(abs(x), 0.2)) * uRibAmp + smoothstep(0.0, 0.1, c) * 0.25 - 0.25;
  }
  if (uStyle < 2.5) {
    float c = fract(p.y / 0.05 + vnoise2(p * vec2(1.5, 0.2)) * 0.4);
    return smoothstep(0.0, 0.3, c) * 0.7 + vnoise2(p * vec2(9.0, 50.0)) * 0.3;
  }
  float x = fract(p.x / 0.45);
  return (smoothstep(0.44, 0.5, x) - smoothstep(0.5, 0.56, x)) * 1.2;
}
vec3 pgPerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir) {
  vec3 sx = dFdx(surf_pos), sy = dFdy(surf_pos);
  vec3 r1 = cross(sy, surf_norm), r2 = cross(surf_norm, sx);
  float det = dot(sx, r1) * faceDir;
  vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
  return normalize(abs(det) * surf_norm - grad);
}
`;

/** Kawara, hiwada (cypress bark) or dōban (copper) roof, plus snow and age. */
export function roofMaterial(style, color, { rib = 0.3, ribAmp = 1, snow = 0, age = 0.35, bump = 0.012 } = {}) {
  const STY = { flat: 0, tile: 1, ribbon: 1, bark: 2, copper: 3 };
  const s = STY[style] ?? 1;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: s === 3 ? 0.45 : s === 2 ? 0.95 : 0.62, metalness: s === 3 ? 0.35 : 0.04 });
  const U = { uStyle: { value: s }, uRib: { value: rib }, uRibAmp: { value: ribAmp }, uSnow: { value: snow }, uAge: { value: age }, uBump: { value: bump } };
  mat.userData.roofU = U;
  return addPatch(mat, 'roof', (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec2 vRoofUv; varying float vRoofUp;\n' + sh.vertexShader
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvRoofUv = uv;')
      .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\nvRoofUp = normalize(mat3(modelMatrix) * objectNormal).y;');
    sh.fragmentShader = ROOF_PARS + sh.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec2 rp = vRoofUv;
        float rh = roofH(rp);
        float n1 = vnoise2(rp * vec2(0.5, 0.22));
        float streak = vnoise2(vec2(rp.x * 2.6, rp.y * 0.12));
        if (uStyle > 0.5 && uStyle < 1.5) {
          diffuseColor.rgb *= 0.8 + 0.3 * clamp(rh * 0.5 + 0.5, 0.0, 1.0);
          diffuseColor.rgb *= 0.9 + 0.16 * n1;
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.72, 0.78, 0.66), uAge * smoothstep(0.5, 0.85, streak) * 0.7);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.5, 0.54, 0.34), smoothstep(0.86, 0.94, vnoise2(rp * 3.6)) * uAge * 0.35);
        } else if (uStyle > 1.5 && uStyle < 2.5) {
          diffuseColor.rgb *= 0.75 + 0.35 * rh;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.3, 0.32, 0.22), smoothstep(0.55, 0.9, streak) * uAge * 0.6);
        } else if (uStyle > 2.5) {
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.55, 0.62, 0.55), smoothstep(0.45, 0.8, streak) * 0.6);
          diffuseColor.rgb *= 0.9 + 0.2 * n1;
        } else {
          diffuseColor.rgb *= 0.92 + 0.12 * n1;
        }
        float snowAmt = uSnow * smoothstep(0.3, 0.7, vRoofUp + rh * 0.12 + (n1 - 0.5) * 0.45);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.94, 0.96, 1.0), snowAmt);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.92, snowAmt);')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          float hh = rh * uBump * (1.0 - snowAmt * 0.8);
          hh *= 1.0 - smoothstep(0.25, 0.9, fwidth(vRoofUv.x) / uRib);
          normal = pgPerturb(-vViewPosition, normal, vec2(dFdx(hh), dFdy(hh)), faceDirection);
        }`);
  });
}

const sharedTex = new Map();
const shared = (key, make) => { if (!sharedTex.has(key)) sharedTex.set(key, make()); return sharedTex.get(key); };
const css = (h) => '#' + new THREE.Color(h).getHexString();
const soffitTex = (P, light) => shared('soffit' + P.timber + light, () => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = light ? css(P.wall) : '#3a2a22'; x.fillRect(0, 0, 64, 64);
  x.fillStyle = css(P.timber); x.fillRect(20, 0, 24, 64);
  x.fillStyle = css(P.ends); x.fillRect(20, 60, 24, 4);
  x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(42, 0, 3, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
});

function makeMaterials(o) {
  const P = PAINTS[o.paint] || PAINTS.vermilion;
  const roofCol = { bark: 0x6f4b33, copper: 0x5c9886 }[o.roof] ?? P.tile;
  const lightBoards = new THREE.Color(P.wall).getHSL({}).l > 0.6 && o.paint !== 'natural';
  return {
    P,
    timber: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.74 }),
    plaster: texturedMaterial(shared('plaster' + P.wall, () => plasterTextures(P.wall, 3)), { roughness: 0.95 }),
    door: new THREE.MeshStandardMaterial({ map: doorTexture(P.door), roughness: 0.72 }),
    renji: new THREE.MeshStandardMaterial({ map: renjiTexture(), roughness: 0.8 }),
    roof: roofMaterial(o.roof, roofCol, { snow: o.snow, age: o.age, ribAmp: o.roof === 'ribbon' ? 0 : 1 }),
    ridge: roofMaterial('flat', new THREE.Color(roofCol).multiplyScalar(0.72), { snow: o.snow, age: o.age }),
    rib: roofMaterial('flat', new THREE.Color(roofCol).multiplyScalar(1.12), { snow: o.snow, age: o.age }),
    eave: new THREE.MeshStandardMaterial({ map: eaveTexture(), roughness: 0.7 }),
    soffit: new THREE.MeshStandardMaterial({ color: lightBoards ? P.wall : 0x3e2d23, roughness: 0.9 }),
    soffitPainted: new THREE.MeshStandardMaterial({ map: soffitTex(P, lightBoards), roughness: 0.9 }),
    stone: texturedMaterial(shared('stone', () => stoneTextures(0x9a978e, 5)), { roughness: 0.92 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x625c46, metalness: 0.72, roughness: 0.42 }),
    suien: new THREE.MeshStandardMaterial({ color: 0x625c46, metalness: 0.72, roughness: 0.42, alphaMap: suienTexture(), alphaTest: 0.5, side: THREE.DoubleSide }),
    shin: new THREE.MeshStandardMaterial({ color: 0xd9a96a, roughness: 0.6, emissive: 0x3a1c06, emissiveIntensity: 0.5 }),
    shadow: new THREE.MeshStandardMaterial({ color: 0x1f1814, roughness: 1 }),
    card: new THREE.MeshStandardMaterial({ map: bracketCardTexture(css(P.bracket)), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 })
  };
}

/* ---------------- part builders ---------------- */

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const _o = new THREE.Object3D();
const xf = (p, ry = 0) => { _o.position.copy(p); _o.rotation.set(0, ry, 0); _o.scale.set(1, 1, 1); _o.updateMatrix(); return _o.matrix.clone(); };
const between = (a, b, w, h) => {
  _o.position.copy(a).add(b).multiplyScalar(0.5);
  _o.rotation.set(0, 0, 0); _o.scale.set(1, 1, 1);
  _o.lookAt(b);
  _o.scale.set(w, h, a.distanceTo(b));
  _o.updateMatrix();
  return _o.matrix.clone();
};
function instanced(geo, mat, xforms, name) {
  if (!xforms.length) return null;
  const m = new THREE.InstancedMesh(geo, mat, xforms.length);
  xforms.forEach((x, i) => m.setMatrixAt(i, x));
  m.instanceMatrix.needsUpdate = true;
  m.name = name;
  m.computeBoundingSphere();
  return m;
}

/** One mitesaki (three-step) bracket cluster facing +z, base on the column top. */
export function bracketCluster(bs, P, corner = false) {
  const B = new Bag();
  const armH = 0.42 * bs, armW = 0.34 * bs, blkS = 0.62 * bs, blkH = 0.4 * bs;
  const arm = (len, x, y, z, alongZ) => (alongZ
    ? B.box(armW, armH, len, { x, y: y + armH / 2, z, color: P.bracket })
    : B.box(len, armH, armW, { x, y: y + armH / 2, z, color: P.bracket }));
  const blk = (x, y, z) => B.box(blkS, blkH, blkS, { x, y: y + blkH / 2, z, color: P.bracketEnd });
  B.box(1.1 * bs, 0.5 * bs, 1.1 * bs, { y: 0.25 * bs, color: P.bracketEnd });      // daito
  let y = 0.5 * bs;
  arm(2.1 * bs, 0, y, 0.5 * bs, true); arm(2.6 * bs, 0, y, 0, false);             // step 1
  y += armH; blk(0, y, 1.45 * bs); blk(-1.1 * bs, y, 0); blk(1.1 * bs, y, 0);
  y += blkH;
  arm(3.3 * bs, 0, y, 1.25 * bs, true); arm(2.6 * bs, 0, y, 1.45 * bs, false);    // step 2
  y += armH; blk(0, y, 2.8 * bs); blk(-1.1 * bs, y, 1.45 * bs); blk(1.1 * bs, y, 1.45 * bs);
  y += blkH;
  // odaruki: the tail rafter that levers the third step out under the eave
  B.beam(V(0, y + 0.95 * bs, -1.5 * bs), V(0, y + 0.05 * bs, 4.35 * bs), 0.42 * bs, 0.5 * bs, { color: P.bracket });
  blk(0, y + 0.2 * bs, 4.25 * bs);
  arm(2.6 * bs, 0, y + 0.2 * bs + blkH, 4.25 * bs, false);                        // step 3
  for (const dx of [-1.1, 0, 1.1]) blk(dx * bs, y + 0.2 * bs + blkH + armH, 4.25 * bs);
  const g = B.geometry();
  if (!corner) return g;
  // the corner set: the same stack facing +z and +x, and a diagonal arm to the hip
  B.add(g, { keep: true }); B.add(g, { ry: Math.PI / 2, keep: true });
  B.beam(V(0, y + 1.1 * bs, 0), V(4.6 * bs, y + 0.05 * bs, 4.6 * bs), 0.46 * bs, 0.55 * bs, { color: P.bracket });
  B.box(blkS * 1.15, blkH, blkS * 1.15, { x: 4.4 * bs, y: y + 0.3 * bs, z: 4.4 * bs, ry: Math.PI / 4, color: P.bracketEnd });
  g.dispose();
  return B.geometry();
}

export function bellGeometry() {
  const pts = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(0.14 + 0.34 * Math.pow(t, 1.7) + (t > 0.9 ? 0.05 : 0), -t)); }
  pts.push(new THREE.Vector2(0.001, -1));
  const B = new Bag();
  B.add(new THREE.LatheGeometry(pts, 12), { color: 0xffffff });
  B.add(UNIT.sphere, { sx: 0.1, sy: 0.12, sz: 0.1, y: 0.04 });
  return B.geometry();
}
export function plateGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.bezierCurveTo(0.55, -0.1, 0.5, -0.8, 0, -1.05); s.bezierCurveTo(-0.5, -0.8, -0.55, -0.1, 0, 0);
  const B = new Bag();
  B.add(new THREE.ShapeGeometry(s, 6), { y: -1.15, sx: 0.8, sy: 0.8 });
  B.add(new THREE.ShapeGeometry(s, 6), { y: -1.15, sx: 0.8, sy: 0.8, ry: Math.PI });
  B.box(0.04, 1.2, 0.04, { y: -0.6 });
  return B.geometry();
}

/* ---------------- the tower ---------------- */

const RANK = { kidan: 0, shin: 1, frame: 2, wall: 3, kumi: 4, rafter: 5, roof: 6, tile: 7, koran: 8, sorin: 9, bell: 10 };

export function buildPagoda(input = {}, { detail = 'hero', shadows = false, slice = 'all' } = {}) {
  const t0 = performance.now();
  const opts = resolveOpts(input);
  const o = tierOpts(opts, detail);
  const D = towerDims(o);
  const M = makeMaterials(o);
  const P = M.P, W = D.W1, low = !!o.lowpoly;
  const group = new THREE.Group();
  group.name = 'Pagoda';
  const storeys = [], bells = [];
  const inSlice = (i) => slice === 'all' || (slice === 'base' && i === 0) || (slice === 'two' && i <= 1) || (slice === 'top' && i === D.n - 1);
  const tag = (m, part, storey = -1) => { if (m) { m.userData.part = part; m.userData.storey = storey; } return m; };
  const put = (parent, m, part, storey) => { if (m) parent.add(tag(m, part, storey)); return m; };
  const onFace = (k, r, t, y) => NK[k].clone().multiplyScalar(r).addScaledVector(TK[k], t).setY(y);

  /* podium (kidan) and the heart pillar (shinbashira) */
  if (slice !== 'top') {
    const B = new Bag(), ph = D.podiumH, pw = D.podiumHalf;
    if (o.podium === 'kidan') {
      B.box(pw * 2, ph * 0.84, pw * 2, { y: ph * 0.42, color: 0xb9b5aa });
      B.box(pw * 2 + 0.05 * W, ph * 0.18, pw * 2 + 0.05 * W, { y: ph * 0.91, color: 0xd2cec4 });
      for (let k = 0; k < 4; k++) for (let s = 0; s < 3; s++) {
        const d = pw + (s + 0.5) * 0.07 * W, hs = ph * (1 - (s + 1) / 4);
        B.box(0.4 * W, hs, 0.07 * W, { x: NK[k].x * d, y: hs / 2, z: NK[k].z * d, ry: (k * Math.PI) / 2, color: 0xc4c0b6 });
      }
    } else B.box(pw * 2, ph, pw * 2, { y: ph / 2, color: 0xb0aca2 });
    put(group, B.mesh(M.stone, 'Kidan'), 'kidan', -1);
  }
  if (slice === 'all' && !low) {
    const B = new Bag();
    B.cyl(0.042 * W, D.sorinY + D.sorinH * 0.4 - D.podiumH, { y: D.podiumH + (D.sorinY + D.sorinH * 0.4 - D.podiumH) / 2, color: 0xffffff });
    B.cyl(0.11 * W, 0.04 * W, { y: D.podiumH + 0.02 * W, color: 0x999999 });
    const shin = put(group, B.mesh(M.shin, 'Shinbashira'), 'shin', -1);
    shin.visible = false;
  }

  const frames = [];
  for (let i = 0; i < D.n; i++) {
    if (!inSlice(i)) { storeys.push(null); frames.push(null); continue; }
    const s = D.S[i], hw = s.w / 2;
    const G = new THREE.Group();
    G.name = `Storey ${i + 1}`;
    G.userData.storey = i;
    group.add(G);
    storeys.push(G);

    /* body: columns, nageshi, plaster, doors and renji windows */
    const colR = 0.034 * W * (0.85 + (0.15 * s.w) / W);
    const T = new Bag(), WL = new Bag(), DR = new Bag(), RJ = new Bag();
    WL.box(s.w - colR, s.h, s.w - colR, { y: s.y0 + s.h / 2 });
    const xs = s.bays === 3 ? [-hw, -hw / 3, hw / 3, hw] : [-hw, 0, hw];
    if (o.body === 'wayo') {
      const seen = new Set();
      for (let k = 0; k < 4; k++) for (const x of xs) {
        const p = onFace(k, hw, x, 0), key = p.x.toFixed(2) + ',' + p.z.toFixed(2);
        if (seen.has(key)) continue;
        seen.add(key);
        T.cyl(colR, s.h, { x: p.x, y: s.y0 + s.h / 2, z: p.z, color: P.timber });
      }
      const bh = 0.034 * W, bd = colR * 1.25;
      for (const fy of [0.05, 0.7, 0.9]) for (let k = 0; k < 4; k++) {
        const c = onFace(k, hw, 0, s.y0 + s.h * fy);
        T.box(s.w + colR * 2, bh, bd, { x: c.x, y: c.y, z: c.z, ry: (k * Math.PI) / 2, color: P.beam });
      }
      for (let k = 0; k < 4; k++) {   // daiwa: the top plate the brackets stand on
        const c = onFace(k, hw, 0, s.yTop - bh * 0.35);
        T.box(s.w + colR * 3, bh * 0.7, bd * 1.3, { x: c.x, y: c.y, z: c.z, ry: (k * Math.PI) / 2, color: P.beam });
      }
      const bay = s.w / s.bays;
      for (let k = 0; k < 4; k++) {
        const ry = (k * Math.PI) / 2;
        if (s.bays === 3) {
          const c = onFace(k, hw + 0.004 * W, 0, s.y0 + s.h * 0.375);
          DR.box(bay * 0.8, s.h * 0.62, 0.012 * W, { x: c.x, y: c.y, z: c.z, ry });
        }
        for (const x of s.bays === 3 ? [-bay, bay] : [-bay / 2, bay / 2]) {
          const c = onFace(k, hw + 0.004 * W, x, s.y0 + s.h * 0.45);
          RJ.box(bay * 0.58, s.h * 0.34, 0.012 * W, { x: c.x, y: c.y, z: c.z, ry });
        }
      }
    } else {
      for (let k = 0; k < 4; k++) {
        const p = onFace(k, hw, hw, 0);
        T.box(colR * 2, s.h, colR * 2, { x: p.x, y: s.y0 + s.h / 2, z: p.z, color: P.timber });
      }
      for (let k = 0; k < 4; k++) {
        const c = onFace(k, hw, 0, s.yTop - 0.03 * W);
        T.box(s.w + colR * 2, 0.05 * W, colR * 2, { x: c.x, y: c.y, z: c.z, ry: (k * Math.PI) / 2, color: P.beam });
      }
    }

    /* kumimono */
    const yT = s.yTop;
    if (o.brackets === 'mitesaki') {
      const pos = s.bays === 3 ? [-hw / 3, hw / 3] : [0];
      const hx = [], cx = [];
      for (let k = 0; k < 4; k++) {
        const ry = Math.atan2(NK[k].x, NK[k].z);
        for (const x of pos) hx.push(xf(onFace(k, hw, x, yT), ry));
        cx.push(xf(onFace(k, hw, hw, yT), ry));
      }
      put(G, instanced(bracketCluster(s.bs, P), M.timber, hx, 'Kumimono'), 'kumi', i);
      put(G, instanced(bracketCluster(s.bs, P, true), M.timber, cx, 'Kumimono corners'), 'kumi', i);
      // continuous purlins on each step, and kentozuka struts between the clusters
      for (let k = 0; k < 4; k++) {
        for (const [z, y0, hh] of [[0, 1.74, 0.42], [1.45, 2.14, 0.4], [4.25, 3.1, 0.38]]) {
          const c = onFace(k, hw + z * s.bs, 0, yT + (y0 + hh / 2) * s.bs);
          T.box(2 * (hw + z * s.bs), hh * s.bs, 0.36 * s.bs, { x: c.x, y: c.y, z: c.z, ry: (k * Math.PI) / 2, color: P.bracket });
        }
        for (const x of s.bays === 3 ? [-2 * hw / 3, 0, 2 * hw / 3] : [-hw / 2, hw / 2]) {
          const c = onFace(k, hw, x, yT);
          T.box(0.32 * s.bs, 1.1 * s.bs, 0.32 * s.bs, { x: c.x, y: c.y + 0.55 * s.bs, z: c.z, color: P.bracket });
          T.box(0.6 * s.bs, 0.38 * s.bs, 0.6 * s.bs, { x: c.x, y: c.y + 1.3 * s.bs, z: c.z, color: P.bracketEnd });
        }
      }
    } else if (o.brackets === 'shelf' || o.brackets === 'card') {
      for (let k = 0; k < 4; k++) {
        const ry = (k * Math.PI) / 2;
        for (const [z, y0, hh, col] of [[0.6, 0.4, 1.0, P.bracketEnd], [1.9, 1.35, 0.85, P.bracket], [3.3, 2.15, 0.8, P.bracketEnd], [4.25, 2.95, 0.5, P.bracket]]) {
          if (o.brackets === 'card' && z > 1) continue;
          const c = onFace(k, hw + (z * s.bs) / 2, 0, yT + (y0 + hh / 2) * s.bs);
          T.box(2 * (hw + z * s.bs), hh * s.bs, z * s.bs, { x: c.x, y: c.y, z: c.z, ry, color: col });
        }
      }
      if (o.brackets === 'card') {
        const geos = [];
        for (let k = 0; k < 4; k++) {
          const len = 2 * (hw + s.proj * 0.55), g = new THREE.PlaneGeometry(len, s.b * 0.9);
          const uv = g.attributes.uv;
          for (let v = 0; v < uv.count; v++) uv.setX(v, uv.getX(v) * (len / (2.8 * s.bs * 4)));
          g.rotateX(-0.42); g.rotateY((k * Math.PI) / 2);
          const c = onFace(k, hw + s.proj * 0.55, 0, yT + s.b * 0.5);
          g.translate(c.x, c.y, c.z);
          geos.push(g);
        }
        const B = new Bag(); for (const g of geos) B.add(g);
        const m = B.mesh(M.card, 'Bracket card');
        m.geometry.deleteAttribute('color');
        put(G, m, 'kumi', i);
      }
    } else if (o.brackets === 'shadow') {
      const B = new Bag();
      for (let k = 0; k < 4; k++) {
        const c = onFace(k, hw + s.proj / 2, 0, yT + s.b / 2);
        B.box(2 * (hw + s.proj), s.b, s.proj, { x: c.x, y: c.y, z: c.z, ry: (k * Math.PI) / 2 });
      }
      put(G, B.mesh(M.shadow, 'Eave shadow'), 'kumi', i);
    }
    put(G, T.mesh(M.timber, 'Frame'), 'frame', i);
    put(G, WL.mesh(M.plaster, 'Walls'), 'wall', i);
    put(G, DR.mesh(M.door, 'Doors'), 'wall', i);
    put(G, RJ.mesh(M.renji, 'Renji windows'), 'wall', i);

    /* the roof: tiled top, fascia, soffit, hips */
    const top = i === D.n - 1;
    const F = roofFrame({ R: s.R, rIn: s.rIn, yE: s.yE, yR: s.yR, rise: s.rise, start: o.start, flare: o.flare, concave: s.concave });
    frames.push(F);
    // the core (kokabe): plaster on the wall line from the column tops up to
    // the next floor, or to just under the top roof, so the bracket band and
    // the hollow between soffit and tiles never open through the tower
    const cw = (s.w - colR) / 2;
    let yCore = top ? s.yR : D.S[i + 1].y0 - 0.02 * W;
    if (cw > s.rIn) yCore = Math.min(yCore, F.S(0, 0, (s.R - cw) / (s.R - s.rIn)).y - 0.01 * W);
    const CB = new Bag();
    CB.box(2 * cw, yCore - s.yTop, 2 * cw, { y: (s.yTop + yCore) / 2 });
    if (!top && cw <= s.rIn) CB.box(2 * s.rIn - 0.008 * W, 0.025 * W, 2 * s.rIn - 0.008 * W, { y: yCore - 0.0125 * W });   // floor out to the roof's inner edge
    put(G, CB.mesh(M.plaster, 'Core'), 'roof', i);
    const segU = low ? 8 : 26, segT = low ? 3 : 10;
    const L = Math.hypot(s.R - s.rIn, s.yR - s.yE);
    const rafterTop = (r) => s.yE + s.sr * (s.R - r) - 0.012 * W;
    const ySi = rafterTop(hw) - 2 * s.rd;
    const tops = new Bag(), fasc = new Bag(), soff = new Bag();
    for (let k = 0; k < 4; k++) {
      const tk = TK[k], up = NK[k].clone().setY(1.4);
      tops.add(gridGeometry(segU, segT, (a, b, out) => F.S(k, a * 2 - 1, b, out), (a, b, q) => [q.x * tk.x + q.z * tk.z, b * L], up));
      fasc.add(gridGeometry(segU, 1, (a, b, out) => F.S(k, a * 2 - 1, 0, out).add(V(0, -b * s.edgeH, 0)), (a, b, q) => [(q.x * tk.x + q.z * tk.z) / 0.3, 1 - b], NK[k]));
      const sp = 0.075 * W;
      soff.add(gridGeometry(segU, 2, (a, b, out) => {
        const u = a * 2 - 1;
        F.S(k, u, 0, out).add(V(0, -s.edgeH, 0));
        const inner = onFace(k, cw, u * cw, ySi);
        return out.lerp(inner, b);
      }, (a, b, q) => [(q.x * tk.x + q.z * tk.z) / sp, b], V(0, -1, 0)));
    }
    put(G, tops.mesh(M.roof, 'Roof'), 'roof', i);
    if (!low) put(G, fasc.mesh(M.eave, 'Kayaoi'), 'roof', i);
    else { const fm = fasc.mesh(M.shadow, 'Eave'); put(G, fm, 'roof', i); }
    put(G, soff.mesh(o.rafters === 'soffit' ? M.soffitPainted : M.soffit, 'Soffit'), 'roof', i);

    if (!low) {
      // hips (sumimune), onigawara and, for the upper storeys, the ridge round the balcony
      const H = new Bag(), rr = 0.03 * W;
      for (let k = 0; k < 4; k++) {
        const pts = [];
        for (let j = 0; j <= 8; j++) pts.push(F.S(k, 1, j / 8).add(V(0, rr * 0.6, 0)));
        H.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, rr, 6, false));
        const e = F.S(k, 1, 0), d = NK[k].clone().add(TK[k]).normalize();
        H.box(rr * 2.8, rr * 3.2, rr * 1.8, { x: e.x + d.x * rr, y: e.y + rr * 1.5, z: e.z + d.z * rr, ry: Math.atan2(d.x, d.z), rx: -0.35, order: 'YXZ' });
      }
      if (!top) for (let k = 0; k < 4; k++) {
        const c = onFace(k, s.rIn - 0.01 * W, 0, s.yR + rr * 0.5);
        H.box(2 * s.rIn, rr * 1.6, rr * 2, { x: c.x, y: c.y, z: c.z, ry: (k * Math.PI) / 2 });
      }
      put(G, H.mesh(M.ridge, 'Hips'), 'tile', i);
    }
    if (o.roof === 'ribbon' && !low) put(G, tileRibs(F, s, M.rib), 'tile', i);
    if (!top && !inSlice(i + 1)) {
      const C = new Bag();
      C.box(2 * s.rIn, 0.05 * W, 2 * s.rIn, { y: s.yR + 0.02 * W, color: P.beam });
      put(G, C.mesh(M.timber, 'Deck'), 'koran', i);
    }

    /* rafters: futanoki (two tiers, parallel) or ōgidaruki (fanned corners) */
    if (o.rafters === 'futanoki' || o.rafters === 'fan') {
      const sp = 0.075 * W, rp = hw + s.proj, rMid = rp + 0.5 * (s.R - rp);
      const liftAt = (u, r) => F.rise * F.lift(u) * Math.pow(1 - clamp((s.R - r) / (s.R - s.rIn), 0, 1), 1.6);
      const lower = [], upper = [], ends = [];
      for (let k = 0; k < 4; k++) {
        const pt = (r, t, up) => onFace(k, r, t, rafterTop(r) + liftAt(t / s.R, r) + up);   // up: offset of the centreline from the top line
        for (let st = -s.R + sp / 2; st <= s.R - sp / 2; st += sp) {
          const a = Math.abs(st);
          if (o.rafters === 'fan' && a > hw * 0.35) {
            const focus = Math.sign(st) * (hw * 0.35 + (a - hw * 0.35) * 0.3);
            const q = onFace(k, hw, focus, rafterTop(hw) - 1.5 * s.rd);
            const tip = pt(s.R - 0.012 * W, st, -0.5 * s.rd);
            const midP = q.clone().lerp(tip, 0.62);
            lower.push(between(q, midP, 0.022 * W, s.rd));
            upper.push(between(q.clone().lerp(tip, 0.55).add(V(0, s.rd, 0)), tip, 0.02 * W, s.rd * 0.85));
            ends.push(between(tip, tip.clone().add(tip.clone().sub(q).setY(0).normalize().multiplyScalar(0.008 * W)), 0.021 * W, s.rd * 0.86));
            continue;
          }
          const rIn1 = Math.max(hw + 0.01 * W, a);
          if (rIn1 < rMid - sp) lower.push(between(pt(rIn1, st, -1.5 * s.rd), pt(rMid, st, -1.5 * s.rd), 0.024 * W, s.rd));
          const fStart = Math.max(rMid - 0.25 * (s.R - rp), a);
          if (fStart < s.R - 0.03 * W) {
            const tip = pt(s.R - 0.012 * W, st, -0.5 * s.rd);
            upper.push(between(pt(fStart, st, -0.5 * s.rd), tip, 0.022 * W, s.rd * 0.85));
            ends.push(between(tip, pt(s.R - 0.004 * W, st, -0.5 * s.rd), 0.023 * W, s.rd * 0.87));
          }
        }
      }
      const rg = paint(UNIT.box.clone(), P.timber), eg = paint(UNIT.box.clone(), P.ends);
      put(G, instanced(rg, M.timber, lower, 'Jidaruki'), 'rafter', i);
      put(G, instanced(rg, M.timber, upper, 'Hiendaruki'), 'rafter', i);
      put(G, instanced(eg, M.timber, ends, 'Rafter ends'), 'rafter', i);
      // sumigi: the hip rafters
      const SB = new Bag();
      for (let k = 0; k < 4; k++) {
        const a = onFace(k, hw, hw, s.yB + 0.1 * s.bs), b = F.S(k, 1, 0).add(V(0, -s.edgeH * 0.55, 0));
        SB.beam(a, b, 0.05 * W, 0.06 * W, { color: P.timber });
        const d = b.clone().sub(a).normalize();
        SB.beam(b, b.clone().addScaledVector(d, 0.025 * W), 0.052 * W, 0.062 * W, { color: P.ends });
      }
      put(G, SB.mesh(M.timber, 'Sumigi'), 'rafter', i);
    }

    /* kōran: the balcony round every upper storey */
    if (i > 0 && o.koran !== 'none') {
      const B = new Bag(), kd = D.kd, y = s.y0, deckT = 0.035 * W;
      for (let k = 0; k < 4; k++) {
        const c = onFace(k, hw + kd / 2, 0, y - deckT / 2);
        B.box(s.w + 2 * kd, deckT, kd, { x: c.x, y: c.y, z: c.z, ry: (k * Math.PI) / 2, color: P.beam });
      }
      const kh = 0.1 * W, r0 = hw + kd - 0.012 * W;
      for (let k = 0; k < 4; k++) {
        const ry = (k * Math.PI) / 2;
        if (o.koran === 'rail') {
          for (const [fy, th] of [[0.1, 0.014], [0.55, 0.012]]) {
            const c = onFace(k, r0, 0, y + kh * fy);
            B.box(2 * r0 + 0.03 * W, th * W, th * W, { x: c.x, y: c.y, z: c.z, ry, color: P.beam });
          }
          const c = onFace(k, r0, 0, y + kh);
          B.cyl(0.009 * W, 2 * r0 + 0.06 * W, { x: c.x, y: c.y, z: c.z, rz: Math.PI / 2, ry, order: 'YXZ', color: P.beam }, true);
          const nPost = Math.max(3, Math.round((2 * r0) / (0.16 * W)));
          for (let j = 0; j <= nPost; j++) {
            const p = onFace(k, r0, -r0 + (j * 2 * r0) / nPost, y + kh / 2);
            B.box(0.013 * W, kh, 0.013 * W, { x: p.x, y: p.y, z: p.z, color: P.timber });
          }
        } else {
          const c = onFace(k, r0, 0, y + kh * 0.6);
          B.box(2 * r0, 0.025 * W, 0.012 * W, { x: c.x, y: c.y, z: c.z, ry, color: P.beam });
        }
      }
      put(G, B.mesh(M.timber, 'Koran'), 'koran', i);
    }

    /* mokoshi: Hōryū-ji's pent roof skirting the ground storey */
    if (i === 0 && o.mokoshi) {
      const mr = hw + 0.2 * W, my = s.y0 + s.h * 0.36;
      const B = new Bag(), WB = new Bag();
      for (let k = 0; k < 4; k++) {
        const c = onFace(k, mr, 0, (D.podiumH + my) / 2);
        WB.box(2 * mr, my - D.podiumH, 0.03 * W, { x: c.x, y: c.y, z: c.z, ry: (k * Math.PI) / 2 });
        const p = onFace(k, mr, mr, (D.podiumH + my) / 2);
        B.box(0.05 * W, my - D.podiumH, 0.05 * W, { x: p.x, y: p.y, z: p.z, color: P.timber });
      }
      put(G, B.mesh(M.timber, 'Mokoshi frame'), 'frame', i);
      put(G, WB.mesh(M.plaster, 'Mokoshi wall'), 'wall', i);
      const MF = roofFrame({ R: hw + 0.4 * W, rIn: hw, yE: my + 0.03 * W, yR: my + 0.03 * W + 0.3 * 0.4 * W, rise: s.rise * 0.5, start: o.start, flare: o.flare * 0.5 });
      const MT = new Bag(), MS = new Bag();
      for (let k = 0; k < 4; k++) {
        const tk = TK[k];
        MT.add(gridGeometry(18, 4, (a, b, out) => MF.S(k, a * 2 - 1, b, out), (a, b, q) => [q.x * tk.x + q.z * tk.z, b * 0.45 * W], NK[k].clone().setY(1.4)));
        MS.add(gridGeometry(18, 1, (a, b, out) => { MF.S(k, a * 2 - 1, 0, out).add(V(0, -s.edgeH * 0.8, 0)); return out.lerp(onFace(k, mr, (a * 2 - 1) * mr, my), b); }, null, V(0, -1, 0)));
      }
      put(G, MT.mesh(M.roof, 'Mokoshi roof'), 'roof', i);
      put(G, MS.mesh(M.soffit, 'Mokoshi soffit'), 'roof', i);
    }

    /* fūtaku hooks under each corner of this roof */
    if (o.bells && !low) {
      for (let k = 0; k < 4; k++) {
        const d = NK[k].clone().add(TK[k]).normalize();
        const hook = F.S(k, 1, 0).add(V(0, -s.edgeH * 0.95, 0)).addScaledVector(d, -0.01 * W);
        bells.push({ storey: i, k, hook, h: s.bellH, ax: 0, az: 0, vx: 0, vz: 0, w2: 9.8 / (s.bellH * 2.4), phase: i * 1.7 + k * 2.3, cool: 0, pitch: 1 + (4 - i) * 0.035 + k * 0.012 });
      }
    }
  }

  /* sōrin */
  const sorin = new THREE.Group();
  sorin.name = 'Sorin';
  if (inSlice(D.n - 1)) {
    group.add(sorin);
    const Sh = D.sorinH, y0 = D.sorinY, rb = D.robanHalf;
    const B = new Bag();
    if (o.sorinStyle === 'needle') {
      B.box(rb * 1.8, Sh * 0.05, rb * 1.8, { y: y0 + Sh * 0.025 });
      B.cyl(rb * 0.14, Sh * 0.9, { y: y0 + Sh * 0.45 }, true);
      for (let r = 0; r < 3; r++) B.cyl(rb * 0.7, Sh * 0.03, { y: y0 + Sh * (0.25 + r * 0.16) }, true);
      B.add(UNIT.sphere, { y: y0 + Sh * 0.93, sx: rb * 0.3, sy: rb * 0.38, sz: rb * 0.3 });
    } else {
      B.box(rb * 2, Sh * 0.045, rb * 2, { y: y0 + Sh * 0.0225 });                               // roban
      B.box(rb * 2.2, Sh * 0.012, rb * 2.2, { y: y0 + Sh * 0.051 });
      B.add(UNIT.sphere, { y: y0 + Sh * 0.057, sx: rb * 0.8, sy: Sh * 0.055, sz: rb * 0.8 });     // fukubachi
      for (let p = 0; p < 8; p++) {                                                               // ukebana
        const a = (p * Math.PI) / 4, r = rb * 0.5;
        B.add(UNIT.sphere, { x: Math.sin(a) * r, y: y0 + Sh * 0.14, z: Math.cos(a) * r, sx: rb * 0.2, sy: Sh * 0.03, sz: rb * 0.07, ry: a, rx: 0.55, order: 'YXZ' });
        B.add(UNIT.sphere, { x: Math.sin(a + 0.39) * r, y: y0 + Sh * 0.115, z: Math.cos(a + 0.39) * r, sx: rb * 0.2, sy: Sh * 0.024, sz: rb * 0.07, ry: a + 0.39, rx: -0.5, order: 'YXZ' });
      }
      B.cyl(rb * 0.13, Sh * 0.8, { y: y0 + Sh * 0.53 });                                         // sasshin
      for (let r = 0; r < 9; r++) {                                                               // kurin
        const rad = rb * (0.86 - r * 0.018), yy = y0 + Sh * (0.19 + r * 0.052);
        B.cyl(rad, Sh * 0.012, { y: yy });
        B.cyl(rad * 0.9, Sh * 0.02, { y: yy - Sh * 0.004 });
      }
      for (let p = 0; p < 4; p++) {                                                               // fūtaku on the top ring
        const a = Math.PI / 4 + (p * Math.PI) / 2, r = rb * 0.72;
        B.add(UNIT.sphere, { x: Math.sin(a) * r, y: y0 + Sh * 0.585, z: Math.cos(a) * r, sx: rb * 0.09, sy: rb * 0.13, sz: rb * 0.09 });
      }
      B.add(UNIT.sphere, { y: y0 + Sh * 0.86, sx: rb * 0.38, sy: Sh * 0.02, sz: rb * 0.38 });    // ryūsha
      B.add(UNIT.sphere, { y: y0 + Sh * 0.915, sx: rb * 0.3, sy: rb * 0.34, sz: rb * 0.3 });     // hōju
      B.add(new THREE.ConeGeometry(1, 1, 10), { y: y0 + Sh * 0.955, sx: rb * 0.16, sy: Sh * 0.05, sz: rb * 0.16 });
      // suien: four openwork sheets at right angles
      const SU = new Bag(), sw = Sh * 0.1, sh = Sh * 0.2;
      for (let p = 0; p < 2; p++) SU.add(new THREE.PlaneGeometry(sw * 2, sh), { y: y0 + Sh * 0.735, ry: (p * Math.PI) / 2 });
      const su = SU.mesh(M.suien, 'Suien');
      su.geometry.deleteAttribute('color');
      put(sorin, su, 'sorin', D.n - 1);
    }
    put(sorin, B.mesh(M.metal, 'Sorin'), 'sorin', D.n - 1);
  }

  /* fūtaku: one instanced set of bells and wind plates */
  let bellMesh = null, plateMesh = null;
  if (bells.length) {
    bellMesh = new THREE.InstancedMesh(bellGeometry(), M.metal, bells.length);
    plateMesh = new THREE.InstancedMesh(plateGeometry(), M.metal, bells.length);
    bellMesh.name = 'Futaku'; plateMesh.name = 'Futaku plates';
    for (const m of [bellMesh, plateMesh]) { m.frustumCulled = false; group.add(tag(m, 'bell', -1)); }
  }

  if (shadows) group.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });

  /* ---------------- motion ---------------- */
  const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4();
  const state = { quake: 0, quakeT: 0, explode: 0, onRing: null };
  const offsets = storeys.map(() => new THREE.Vector3());

  function poseBells() {
    if (!bellMesh) return;
    bells.forEach((b, j) => {
      const off = offsets[b.storey];
      _p.copy(b.hook).add(off);
      if (storeys[b.storey]) _p.y += storeys[b.storey].position.y;
      _q.setFromEuler(_e.set(b.az, 0, -b.ax));
      _m.compose(_p, _q, _s.setScalar(b.h));
      bellMesh.setMatrixAt(j, _m);
      _q.setFromEuler(_e.set(b.az * 1.6, 0, -b.ax * 1.6));
      _m2.compose(_p.set(0, -1.02, 0), _q, _s.setScalar(0.85));
      plateMesh.setMatrixAt(j, _m.clone().multiply(_m2));
    });
    bellMesh.instanceMatrix.needsUpdate = true;
    plateMesh.instanceMatrix.needsUpdate = true;
  }
  poseBells();

  function update(dt, time, { wind = 0.4, windDir = V(0.8, 0, 0.6) } = {}) {
    dt = Math.min(dt, 0.05);
    // the snake dance: storeys sway out of phase round a still heart pillar
    const q = state.quake;
    if (q > 0.001 || state.wasQuaking) {
      state.quakeT += dt;
      const A = q * W * 0.07, t = state.quakeT;
      storeys.forEach((G, i) => {
        if (!G) return;
        const x = A * (Math.sin(t * 7.3) * 0.32 * (1 - i * 0.1) + Math.sin(t * 3.9 - i * 1.9) * (0.22 + 0.13 * i));
        const z = A * 0.45 * (Math.cos(t * 6.1 + 0.7) * 0.3 + Math.sin(t * 3.3 - i * 2.1) * (0.18 + 0.1 * i));
        offsets[i].set(x, 0, z);
        G.position.x = x; G.position.z = z;
        G.rotation.z = -x / (W * 9); G.rotation.x = z / (W * 9);
      });
      const last = offsets[D.n - 1];
      sorin.position.x = last.x; sorin.position.z = last.z;
      state.wasQuaking = q > 0.001;
      if (!state.wasQuaking) { storeys.forEach((G, i) => { if (G) { G.position.x = G.position.z = 0; G.rotation.set(0, 0, 0); offsets[i].set(0, 0, 0); } }); sorin.position.x = sorin.position.z = 0; }
    }
    if (!bellMesh) return;
    for (const b of bells) {
      const gust = wind * (0.55 + 0.45 * Math.sin(time * 0.63 + b.phase) * Math.sin(time * 1.71 + b.phase * 1.7));
      const shakeX = q * Math.sin(state.quakeT * 7.3 + b.storey) * 9, shakeZ = q * Math.cos(state.quakeT * 6.1 + b.storey) * 6;
      const fx = windDir.x * gust * 2.4 + Math.sin(time * 2.9 + b.phase * 3.1) * wind * 0.8 + shakeX;
      const fz = windDir.z * gust * 2.4 + Math.cos(time * 2.3 + b.phase * 2.2) * wind * 0.8 + shakeZ;
      b.vx += (-b.w2 * b.ax - 1.1 * b.vx + fx) * dt; b.ax = clamp(b.ax + b.vx * dt, -0.9, 0.9);
      b.vz += (-b.w2 * b.az - 1.1 * b.vz + fz) * dt; b.az = clamp(b.az + b.vz * dt, -0.9, 0.9);
      b.cool -= dt;
      const sp = Math.hypot(b.vx, b.vz);
      if (sp > 1.1 && b.cool <= 0) { b.cool = 0.3 + Math.random() * 0.4; state.onRing?.(b, Math.min(1, sp / 4)); }
    }
    poseBells();
  }

  function strike(j = -1, strength = 1) {
    const list = j < 0 ? bells : [bells[j]];
    list.forEach((b, n) => {
      const a = Math.random() * Math.PI * 2, f = (2.4 + Math.random()) * strength;
      setTimeout(() => { b.vx += Math.cos(a) * f; b.vz += Math.sin(a) * f; b.cool = 0; }, j < 0 ? n * 55 + Math.random() * 80 : 0);
    });
  }

  // vertical placement = explode lift + rise (the build animation)
  const kidan = group.children.find((m) => m.userData.part === 'kidan');
  const shinM = group.children.find((m) => m.userData.part === 'shin');
  const ease = (x) => { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); };
  function place() {
    const e = state.explode, p = state.rise;
    storeys.forEach((G, i) => {
      if (!G) return;
      const a = 0.16 + i * 0.13, k = ease((p - a) / 0.14);
      G.position.y = e * (i + 0.6) * 0.5 * W + (1 - k) * D.H * 0.55;
      G.visible = p >= a;
    });
    const k = ease((p - 0.82) / 0.14);
    sorin.position.y = e * (D.n + 0.6) * 0.5 * W + (1 - k) * D.sorinH * 1.2;
    sorin.visible = p >= 0.82;
    if (kidan) kidan.position.y = -(1 - ease(p / 0.1)) * D.podiumH * 1.1;
    if (shinM) shinM.scale.y = Math.max(0.001, ease((p - 0.06) / 0.12));
    if (bellMesh) bellMesh.visible = plateMesh.visible = p >= 0.97;
  }
  state.rise = 1;
  function setExplode(e) { state.explode = e; place(); }
  function setRise(p) { state.rise = p; place(); if (shinM && p < 1) shinM.visible = true; }
  function setFrame(on) {
    group.traverse((m) => {
      const p = m.userData.part;
      if (!p) return;
      if (p === 'shin') m.visible = on;
      else if (p === 'wall' || p === 'roof' || p === 'tile') m.visible = !on;
    });
  }
  function setAssembly(phase) {
    group.traverse((m) => {
      const p = m.userData.part;
      if (!p) return;
      const rank = RANK[p], st = m.userData.storey;
      let vis = rank <= phase;
      if (st > 0 && phase < 8) vis = false;
      if (p === 'shin') vis = phase >= 1 && phase < 11;
      m.visible = vis;
    });
  }

  /* ---------------- reference points ---------------- */
  const S0 = D.S[0], S1 = D.S[Math.min(1, D.n - 1)], Sh = D.sorinH, sy = D.sorinY, rb = D.robanHalf;
  const anchors = [
    { id: 'hoju', title: 'Hōju', sub: '宝珠 · the jewel', pos: V(rb * 0.4, sy + Sh * 0.92, 0) },
    { id: 'suien', title: 'Suien', sub: '水煙 · water flame', pos: V(Sh * 0.1, sy + Sh * 0.74, 0) },
    { id: 'kurin', title: 'Kurin', sub: '九輪 · nine rings', pos: V(rb * 0.9, sy + Sh * 0.4, 0), side: 'left' },
    { id: 'ukebana', title: 'Ukebana & fukubachi', sub: '請花・伏鉢', pos: V(rb * 0.8, sy + Sh * 0.11, 0) },
    { id: 'roban', title: 'Roban', sub: '露盤 · dew basin', pos: V(rb, sy + Sh * 0.03, rb), side: 'left' },
    { id: 'sumimune', title: 'Sumimune', sub: '隅棟 · hip ridge', pos: frames[1] ? frames[1].S(0, 1, 0.45) : V(0, 0, 0) },
    { id: 'sori', title: 'Noki-zori', sub: '軒反り · the lift', pos: frames[2] ? frames[2].S(0, 0.93, 0) : V(0, 0, 0), side: 'left' },
    { id: 'koran', title: 'Kōran', sub: '高欄 · balcony rail', pos: V(0, S1.y0 + 0.1 * W, S1.w / 2 + D.kd), side: 'left' },
    { id: 'kayaoi', title: 'Kayaoi', sub: '茅負 · the eave edge', pos: V(-S0.R * 0.35, S0.yE - S0.edgeH / 2, S0.R), side: 'left' },
    { id: 'kumimono', title: 'Kumimono', sub: '三手先 · three-step brackets', pos: V(S0.w / 6, S0.yTop + S0.b * 0.5, S0.w / 2 + S0.proj * 0.5) },
    { id: 'futaku', title: 'Fūtaku', sub: '風鐸 · wind bell', pos: frames[0] ? frames[0].S(0, 1, 0).add(V(0, -S0.edgeH - S0.bellH, 0)) : V(0, 0, 0) },
    { id: 'tobira', title: 'Tobira & renji', sub: '扉・連子窓', pos: V(-S0.w / 3, S0.y0 + S0.h * 0.45, S0.w / 2), side: 'left' },
    { id: 'kidan', title: 'Kidan', sub: '基壇 · stone podium', pos: V(D.podiumHalf * 0.6, D.podiumH * 0.5, D.podiumHalf) },
    { id: 'shin', title: 'Shinbashira', sub: '心柱 · heart pillar', pos: V(0, D.H * 0.32, 0), frame: true, side: 'left' }
  ];
  const features = [
    { key: 'tower', label: 'The tower', jp: '塔', size: D.H },
    { key: 'sorin', label: 'The sōrin', jp: '相輪', size: Sh },
    { key: 'roofs', label: 'Five roof lines', jp: '五重', size: (D.S[D.n - 1].yE - D.S[0].yE) / (D.n - 1) },
    { key: 'sori', label: 'Corner lift', jp: '反り', size: S0.rise },
    { key: 'eave', label: 'Eave edge', jp: '茅負', size: S0.edgeH },
    { key: 'kumi', label: 'Bracket blocks', jp: '組物', size: S0.bs },
    { key: 'koran', label: 'Balcony rail', jp: '高欄', size: 0.1 * W },
    { key: 'kurin', label: 'Nine rings', jp: '九輪', size: Sh * 0.052 },
    { key: 'rafter', label: 'Rafter rhythm', jp: '垂木', size: 0.075 * W },
    { key: 'bell', label: 'Fūtaku bells', jp: '風鐸', size: S0.bellH },
    { key: 'tile', label: 'Tile rows', jp: '瓦', size: 0.3 }
  ];

  function dispose() {
    group.traverse((m) => { if (m.isMesh) m.geometry.dispose(); });
    for (const [k, m] of Object.entries(M)) if (k !== 'P' && m.dispose) m.dispose();
  }

  const built = performance.now() - t0;
  return {
    group, opts, tier: o, dims: D, materials: M, storeys, sorin, frames, bells, bellMesh, anchors, features, built, detail, state,
    update, strike, setExplode, setFrame, setAssembly, setRise, dispose,
    setQuake: (q) => { state.quake = q; if (q > 0 && !state.wasQuaking) state.quakeT = 0; },
    counts: () => countMesh(group)
  };
}

/** Round tiles (marugawara) as half-tubes swept up each roof face, cut by the hips. */
function tileRibs(F, s, mat) {
  const P = 0.3, rad = 0.085, segA = 5;
  const pos = [], nor = [], uv = [], idx = [];
  const p = new THREE.Vector3(), pu = new THREE.Vector3(), pt = new THREE.Vector3(), n = new THREE.Vector3(), side = new THREE.Vector3();
  const L = Math.hypot(s.R - s.rIn, s.yR - s.yE);
  for (let k = 0; k < 4; k++) {
    for (let st = -s.R + P / 2; st < s.R; st += P) {
      const a = Math.abs(st);
      const tMax = a <= s.rIn ? 1 : clamp((s.R - a) / (s.R - s.rIn), 0, 1);
      if (tMax < 0.04) continue;
      const nT = Math.max(2, Math.ceil(tMax * 9));
      const base = pos.length / 3;
      for (let j = 0; j <= nT; j++) {
        const t = (j / nT) * tMax * 0.985;
        const rr = s.R + (s.rIn - s.R) * t, u = clamp(st / rr, -1, 1);
        F.S(k, u, t, p);
        F.S(k, clamp(u + 0.01, -1, 1), t, pu).sub(p);
        F.S(k, u, Math.min(1, t + 0.01), pt).sub(p);
        n.crossVectors(pt, pu).normalize();
        if (n.y < 0) n.negate();
        side.copy(TK[k]);
        for (let c = 0; c <= segA; c++) {
          const ang = (c / segA) * Math.PI, cs = Math.cos(ang), sn = Math.sin(ang);
          pos.push(p.x + side.x * cs * rad + n.x * sn * rad, p.y + side.y * cs * rad + n.y * sn * rad, p.z + side.z * cs * rad + n.z * sn * rad);
          nor.push(side.x * cs + n.x * sn, side.y * cs + n.y * sn, side.z * cs + n.z * sn);
          uv.push(st, t * L);
        }
      }
      for (let j = 0; j < nT; j++) for (let c = 0; c < segA; c++) {
        const a0 = base + j * (segA + 1) + c, b0 = a0 + segA + 1;
        idx.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  const m = new THREE.Mesh(g, mat);
  m.name = 'Marugawara';
  return m;
}
