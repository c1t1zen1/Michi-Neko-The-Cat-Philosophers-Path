// Terraced paddies through the year. Each plot is a basin on a plateau:
// earth ridges (aze) round a sheet of still water, rice hills on the
// machine-transplanting grid (30 cm rows, 15 cm apart), and a mizuguchi
// notch where the upper paddy spills into the lower one.
import * as THREE from 'three';
import { HASH, NOISE } from '../../shared/glsl.js';
import { WATER_UNIFORMS, WATER_FUNCS } from './glsl.js';
import { Parts } from './bridges.js';
import { rectSolid } from './physics.js';

export const PADDY_STYLES = ['mirror', 'taue', 'summer', 'autumn', 'winter', 'game'];
const MODE = { game: 0, mirror: 1, taue: 2, summer: 3, autumn: 4, winter: 5 };
// rice height (m) by stage: seedlings ~15 cm after transplanting, ~70 cm in
// high summer, ~100 cm at heading (Koshihikari, Toyama data); winter stubble.
const RICE = {
  taue: { h: 0.16, blades: 4, color: [0x8fbf4e, 0xc4e07a], spread: 0.1 },
  summer: { h: 0.72, blades: 11, color: [0x3f7a2a, 0x7db14a], spread: 0.32 },
  autumn: { h: 0.95, blades: 10, color: [0xa49a3e, 0xe2c25a], spread: 0.36, heads: 4 },
  winter: { h: 0.08, blades: 9, color: [0x9c8a5e, 0xcdb98a], spread: 0.05, stubble: true }
};

const PADDY_FS = /* glsl */`
#include <common>
#include <fog_pars_fragment>
${HASH}
${NOISE}
${WATER_UNIFORMS}
uniform vec4 uPlot;
uniform int uMode;
varying vec3 vWorld;
${WATER_FUNCS}
void main() {
  vec3 P = vWorld; vec2 p = P.xz; float t = uTime;
  vec3 V = normalize(cameraPosition - P);
  vec3 amb = ambientWater();
  float edgeD = min(min(p.x - uPlot.x, uPlot.z - p.x), min(p.y - uPlot.y, uPlot.w - p.y));
  float gust = smoothstep(0.42, 0.78, vnoise2(p * 0.11 + vec2(t * 0.045, t * 0.02)) * 0.7 + vnoise2(p * 0.3 - vec2(t * 0.03, t * 0.05)) * 0.3);
  vec2 slope = nslope(p / 1.9 + vec2(t * 0.02, t * 0.013)) * 0.025 + nslope(p / 0.55 - vec2(t * 0.06, 0.)) * 0.07 * gust;
  float rf;
  slope += ripples(p, t, rf) * 0.9 + rainRings(p, t) * uRain;
  if (uMode == 5) slope *= 0.04;
  vec3 N = normalize(vec3(slope.x, 1., slope.y));
  float fres = 0.02 + 0.98 * pow(1. - max(dot(N, V), 0.), 5.);
  vec3 R = reflect(-V, N); R.y = abs(R.y);
  vec3 refl = mirrorColor(P, N, skyColor(R), 0.025);
  vec3 H = normalize(uSunDir + V);
  vec3 spec = uSunCol * uSunI * (pow(max(dot(N, H), 0.), 300.) * 6. + pow(max(dot(N, H), 0.), 30.) * 0.06) * smoothstep(-0.05, 0.1, uSunDir.y);
  spec += lightGlitter(P, N, V);
  float film = smoothstep(0.7, 0., edgeD) * smoothstep(0.45, 0.8, vnoise2(p * 1.7 + 3.));
  vec3 col; float a;
  if (uMode == 0) {
    // the game's paddy: a tinted translucent sheet
    vec3 bed = mix(vec3(0.03, 0.04, 0.025), vec3(0.06, 0.09, 0.045), vnoise2(p * 0.9));
    col = mix(bed, refl * 0.66, clamp(0.06 + 0.9 * pow(1. - max(dot(N, V), 0.), 2.6), 0., 0.72)) + spec * 0.5;
    col = mix(col, vec3(0.16, 0.3, 0.05) * (0.6 + 0.4 * uDay), film * 0.55);
    col *= 0.22 + 0.78 * uDay;
    a = 0.85;
    if (uGameEncode > 0.5) col = pow(max(col, 0.), vec3(2.2));   // as the game shows it (see water.js)
    gl_FragColor = vec4(col * a, a);
    return;
  }
  // still water over mud: a mirror whenever the view is low (mizukagami)
  float mirror = uMode == 1 ? 0.35 : uMode == 2 ? 0.25 : uMode == 3 ? 0.12 : 0.18;
  float F = clamp(fres + mirror * (1. - gust * 0.6), 0., 1.);
  vec3 body = mix(vec3(0.07, 0.065, 0.045), vec3(0.11, 0.12, 0.07), vnoise2(p * 0.8)) * amb * 1.5;
  if (uMode == 3) body = mix(body, vec3(0.08, 0.15, 0.05) * amb * 2., 0.6);
  float absorb = uMode == 3 ? 0.75 : 0.42;
  col = body * absorb * (1. - F) + refl * F + spec;
  a = absorb * (1. - F) + F;
  col = mix(col, vec3(0.2, 0.33, 0.08) * amb * 2.2 * a, film * (uMode == 3 ? 0.8 : 0.45));
  if (uMode == 4) {
    // drained for the harvest: only puddles left in the ruts
    float pud = smoothstep(0.52, 0.6, vnoise2(p * 1.1) * 0.7 + vnoise2(p * 4.3) * 0.3);
    if (pud < 0.02) discard;
    col *= pud; a *= pud;
  } else if (uMode == 5) {
    // a skin of ice: frosty, cracked, snow drifted against the ridges
    vec3 vo = voronoi2(p * 2.4);
    float crack = 1. - smoothstep(0., 0.03, vo.y - vo.x);
    vec3 ice = mix(vec3(0.62, 0.7, 0.76), vec3(0.85, 0.9, 0.95), vnoise2(p * 3.)) * (amb * 1.4 + 0.1);
    ice = mix(ice, refl, 0.25 + fres * 0.5);
    ice *= 1. - crack * 0.3;
    float snow = smoothstep(0.5, 0., edgeD) + smoothstep(0.6, 0.75, vnoise2(p * 0.7));
    ice = mix(ice, vec3(0.92, 0.94, 0.98) * (amb * 1.2 + 0.2), clamp(snow, 0., 1.));
    col = ice * 0.95; a = 0.95;
  }
  col = mix(col, (uSkyHor * 0.4 + 0.3) * a, rf * 0.6);
  #ifdef USE_FOG
    float fogF = 1. - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
    col = mix(col, fogColor * a, fogF);
  #endif
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const PADDY_VS = /* glsl */`
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

function paddyWater(style, U, plot) {
  const own = {
    uPlot: { value: new THREE.Vector4(plot.ix0, plot.iz0, plot.ix1, plot.iz1) },
    uMode: { value: MODE[style] ?? 1 },
    uMirror: { value: null }, uMirrorMat: { value: new THREE.Matrix4() }, uMirrorOn: { value: 0 }
  };
  const uniforms = Object.assign(THREE.UniformsUtils.clone(THREE.UniformsLib.fog), U, own);
  const m = new THREE.ShaderMaterial({ uniforms, vertexShader: PADDY_VS, fragmentShader: PADDY_FS, transparent: true, premultipliedAlpha: true, depthWrite: false, fog: style !== 'game' });
  m.toneMapped = style !== 'game';
  return m;
}

/* ---------------- rice ---------------- */

const hillCache = new Map();
function hillGeometry(style) {
  if (hillCache.has(style)) return hillCache.get(style);
  const R = RICE[style];
  const pos = [], col = [], idx = [];
  const c0 = new THREE.Color(R.color[0]), c1 = new THREE.Color(R.color[1]), cc = new THREE.Color();
  const strip = (pts, w0, w1, ca, cb) => {
    const base = pos.length / 3;
    for (let i = 0; i < pts.length; i++) {
      const t = i / (pts.length - 1), [x, y, z, sx, sz] = pts[i], w = w0 + (w1 - w0) * t;
      cc.copy(ca).lerp(cb, t);
      pos.push(x - sx * w, y, z - sz * w, x + sx * w, y, z + sz * w);
      col.push(cc.r, cc.g, cc.b, cc.r, cc.g, cc.b);
      if (i) { const a = base + (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
  };
  for (let b = 0; b < R.blades; b++) {
    const a = (b / R.blades) * Math.PI * 2 + b * 0.7, ca = Math.cos(a), sa = Math.sin(a);
    const h = R.h * (0.75 + ((b * 37) % 10) / 40);
    const pts = [];
    const lean = R.spread * (0.6 + ((b * 13) % 7) / 10);
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      const out = lean * t * t * h + 0.012;
      pts.push([ca * out, h * t * (1 - lean * 0.35 * t), sa * out, -sa, ca]);
    }
    strip(pts, 0.007, 0.0015, c0, c1);
  }
  for (let k = 0; k < (R.heads || 0); k++) {
    // a ripe panicle nodding over: gold grains on a drooping stem
    const a = (k / R.heads) * Math.PI * 2 + 0.4, ca = Math.cos(a), sa = Math.sin(a);
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const r = 0.04 + t * 0.16, y = R.h * (0.92 + 0.12 * Math.sin(t * Math.PI * 0.6)) - t * t * 0.28;
      pts.push([ca * r, y, sa * r, -sa, ca]);
    }
    strip(pts, 0.012, 0.006, new THREE.Color(0xd9b44a), new THREE.Color(0xf0d27a));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  hillCache.set(style, g);
  return g;
}

function stubbleGeometry() {
  if (hillCache.has('stub')) return hillCache.get('stub');
  const parts = [];
  for (let b = 0; b < 9; b++) {
    const a = b * 2.39, r = 0.012 + (b % 3) * 0.01;
    const c = new THREE.CylinderGeometry(0.006, 0.007, 0.07 + (b % 4) * 0.012, 5, 1, true);
    c.translate(Math.cos(a) * r, 0.04, Math.sin(a) * r);
    parts.push(c.toNonIndexed());
  }
  const pos = [], col = [];
  const c0 = new THREE.Color(0x8c7a52), c1 = new THREE.Color(0xd2bf8e);
  for (const p of parts) {
    const P = p.attributes.position;
    for (let i = 0; i < P.count; i++) {
      pos.push(P.getX(i), P.getY(i), P.getZ(i));
      const t = Math.min(1, P.getY(i) / 0.1);
      col.push(c0.r + (c1.r - c0.r) * t, c0.g + (c1.g - c0.g) * t, c0.b + (c1.b - c0.b) * t);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  hillCache.set('stub', g);
  return g;
}

function riceMaterial(U, wind, cat) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime; sh.uniforms.uWind = wind; sh.uniforms.uCat = cat;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform vec2 uWind;\nuniform vec3 uCat;')
      .replace('#include <project_vertex>', `
        vec4 mvPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
          vec2 base = (instanceMatrix * vec4(0., 0., 0., 1.)).xz;
        #else
          vec2 base = vec2(0.);
        #endif
        float hh = max(position.y, 0.);
        // honami: waves rolling across the field with the wind
        float wave = pow(sin(dot(base, vec2(0.85, 0.3)) * 0.9 - uTime * 1.5) * 0.5 + 0.5, 3.);
        vec2 bend = vec2(0.85, 0.3) * (0.05 + 0.22 * wave) * uWind.y * hh * hh * 1.6;
        vec2 away = base - uCat.xy;
        float d = length(away);
        bend += away / max(d, 1e-3) * smoothstep(uCat.z, 0., d) * 0.5 * hh;
        mvPosition.xz += bend;
        mvPosition.y -= dot(bend, bend) * 0.8;
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;`);
  };
  m.customProgramCacheKey = () => 'lab02-rice';
  return m;
}

/* ---------------- the paddies ---------------- */

/**
 * plots: [{ x0, z0, x1, z1, floor, level, notch?: { side: 'x0'|'x1', z } }]
 * Returns { group, solids, waters: [{ mesh, plot }], update(dt, t, catPos), dispose }.
 */
export function buildPaddies({ style, plots, U, groundMat, wind, rnd, rw = 0.42, rh = 0.22 }) {
  const group = new THREE.Group();
  group.name = 'paddies-' + style;
  const solids = [], waters = [];
  const P = new Parts(55);
  const catU = { value: new THREE.Vector3(999, 999, 0.35) };
  const profile = new THREE.Shape();
  profile.moveTo(-rw / 2, -0.06);
  for (const [x, y] of [[-rw * 0.4, rh * 0.72], [-rw * 0.24, rh * 0.95], [0, rh], [rw * 0.24, rh * 0.95], [rw * 0.4, rh * 0.72], [rw / 2, -0.06]]) profile.lineTo(x, y);
  profile.closePath();
  const ridge = (xa, za, xb, zb, y) => {
    const len = Math.hypot(xb - xa, zb - za);
    if (len < 0.05) return;
    const g = new THREE.ExtrudeGeometry(profile, { depth: len, bevelEnabled: false, steps: Math.max(1, Math.round(len * 2)) });
    const ang = Math.atan2(xb - xa, zb - za);
    P.put('ridge', g, new THREE.Matrix4().compose(new THREE.Vector3(xa, y, za), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ang, 0)), new THREE.Vector3(1, 1, 1)));
    solids.push(rectSolid({ x0: Math.min(xa, xb) - (xa === xb ? rw / 2 : 0), x1: Math.max(xa, xb) + (xa === xb ? rw / 2 : 0), z0: Math.min(za, zb) - (za === zb ? rw / 2 : 0), z1: Math.max(za, zb) + (za === zb ? rw / 2 : 0), top: y + rh, bottom: -20, kind: 'ridge', name: 'an aze ridge' }));
  };
  for (const pl of plots) {
    const h = rw / 2, y = pl.floor;
    pl.ix0 = pl.x0 + rw; pl.ix1 = pl.x1 - rw; pl.iz0 = pl.z0 + rw; pl.iz1 = pl.z1 - rw;
    const n = pl.notch;
    const side = (k, xa, za, xb, zb) => {
      if (n && n.side === k) {
        ridge(xa, za, xb, n.z - 0.16, y);
        ridge(xa, n.z + 0.16, xb, zb, y);
      } else ridge(xa, za, xb, zb, y);
    };
    side('z0', pl.x0, pl.z0 + h, pl.x1, pl.z0 + h);
    side('z1', pl.x0, pl.z1 - h, pl.x1, pl.z1 - h);
    side('x0', pl.x0 + h, pl.z0 + rw, pl.x0 + h, pl.z1 - rw);
    side('x1', pl.x1 - h, pl.z0 + rw, pl.x1 - h, pl.z1 - rw);
    {
      const mat = paddyWater(style, U, pl);
      const water = new THREE.Mesh(new THREE.PlaneGeometry(pl.ix1 - pl.ix0 + 0.1, pl.iz1 - pl.iz0 + 0.1), mat);
      water.rotation.x = -Math.PI / 2;
      water.position.set((pl.ix0 + pl.ix1) / 2, pl.level, (pl.iz0 + pl.iz1) / 2);
      water.renderOrder = 2;
      water.name = 'paddy water';
      group.add(water);
      waters.push({ mesh: water, plot: pl });
    }
  }
  group.add(P.build({ ridge: groundMat }));
  // rice: hills on a 30 x 15 cm grid (rows 30 cm apart)
  let rice = null;
  if (style === 'game') {
    const geo = new THREE.ConeGeometry(0.05, 0.5, 4);
    let n = 0;
    for (const pl of plots) n += Math.floor((pl.ix1 - pl.ix0) * (pl.iz1 - pl.iz0) / 1.6);
    rice = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0x86b23e, roughness: 0.9 }), n);
    const d = new THREE.Object3D();
    let k = 0;
    for (const pl of plots) for (let i = 0; i < Math.floor((pl.ix1 - pl.ix0) * (pl.iz1 - pl.iz0) / 1.6); i++) {
      d.position.set(pl.ix0 + 0.3 + rnd() * (pl.ix1 - pl.ix0 - 0.6), pl.floor + 0.26, pl.iz0 + 0.3 + rnd() * (pl.iz1 - pl.iz0 - 0.6));
      d.rotation.set(0, rnd() * Math.PI, 0);
      d.scale.setScalar(0.7 + rnd() * 0.6);
      d.updateMatrix();
      rice.setMatrixAt(k++, d.matrix);
    }
    rice.count = k;
  } else if (RICE[style]) {
    const geo = style === 'winter' ? stubbleGeometry() : hillGeometry(style);
    const spots = [];
    for (const pl of plots) {
      for (let x = pl.ix0 + 0.16; x < pl.ix1 - 0.1; x += 0.3) for (let z = pl.iz0 + 0.12; z < pl.iz1 - 0.08; z += 0.15) {
        if (style === 'autumn' && x > (pl.ix0 + pl.ix1) / 2 + 0.6 && pl.harvested) continue;
        spots.push([x + (rnd() - 0.5) * 0.03, pl.floor - 0.01, z + (rnd() - 0.5) * 0.03]);
      }
    }
    rice = new THREE.InstancedMesh(geo, riceMaterial(U, wind, catU), spots.length);
    const d = new THREE.Object3D();
    spots.forEach(([x, y, z], i) => {
      d.position.set(x, y, z);
      d.rotation.set(0, rnd() * Math.PI * 2, 0);
      d.scale.setScalar(0.85 + rnd() * 0.3);
      d.updateMatrix();
      rice.setMatrixAt(i, d.matrix);
    });
  }
  if (rice) { rice.name = 'rice'; rice.receiveShadow = true; group.add(rice); }
  // the mizuguchi spill between two levels
  const spills = [];
  for (const pl of plots) {
    if (!pl.notch || !pl.spillTo) continue;
    const lo = pl.spillTo;
    const xa = pl.notch.side === 'x0' ? pl.ix0 + 0.05 : pl.ix1 - 0.05, xb = pl.notch.side === 'x0' ? lo.ix1 - 0.15 : lo.ix0 + 0.15;
    // a sheet of water down the riser, built straight in world space
    const g = new THREE.BufferGeometry();
    const w = 0.13, z = pl.notch.z, ya = pl.level + 0.01, yb = lo.level + 0.01;
    g.setAttribute('position', new THREE.Float32BufferAttribute([xa, ya, z - w, xa, ya, z + w, xb, yb, z - w, xb, yb, z + w], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
    g.setIndex([0, 2, 1, 1, 2, 3]);
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: U.uTime, uSkyHor: U.uSkyHor, uSunI: U.uSunI },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: `uniform float uTime, uSunI; uniform vec3 uSkyHor; varying vec2 vUv;
        void main(){ float s = fract(vUv.y * 6. - uTime * 2.2 + sin(vUv.x * 9.) * 0.2); float f = smoothstep(0.55, 0.9, s) * 0.7 + 0.25;
          float side = smoothstep(0., 0.2, vUv.x) * smoothstep(1., 0.8, vUv.x); vec3 c = (uSkyHor * 0.5 + 0.35) * (0.5 + uSunI * 0.25) * (0.8 + f * 0.5); float a = (0.45 + f * 0.4) * side;
          gl_FragColor = vec4(c * a, a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true, premultipliedAlpha: true, depthWrite: false, side: THREE.DoubleSide
    });
    const sheet = new THREE.Mesh(g, m);
    sheet.renderOrder = 3;
    group.add(sheet);
    spills.push({ x: xb, y: lo.level, z: pl.notch.z });
  }
  return {
    style, group, solids, waters, spills, rice,
    update(dt, t, cat) { if (cat) catU.value.set(cat.x, cat.z, cat.r ?? 0.35); },
    dispose() { const keep = new Set(hillCache.values()); group.traverse((o) => { if (o.isMesh && o.geometry && !keep.has(o.geometry)) o.geometry.dispose(); }); }
  };
}
