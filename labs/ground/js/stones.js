// Real stones: tobi-ishi the cat steps up onto, the kutsunugi-ishi, a
// sekimori-ishi tied with palm rope, karesansui rocks and the tsukubai. One
// merged mesh per material, rebuilt when the layout changes, and a footprint
// list so the cat and the walkers know where the tops are.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { stoneTextures } from '../../shared/game.js';
import { vnoise, fbm, hash2i } from './util.js';

// Kyoto garden stones: Kurama (iron-rust ochre), Kibune (blue-green, dark),
// Shirakawa granite (pale grey)
export const STONE_KINDS = {
  kurama: [0x9a7a52, 0xb08e5e, 0x7d6448],
  kibune: [0x4f5a58, 0x5d6866, 0x434c4c],
  granite: [0x9c9890, 0xb4afa6, 0x868480]
};
// how proud a stepping stone stands, after the three tea masters
export const PROUD = { rikyu: 0.06, oribe: 0.05, enshu: 0.03 };

/**
 * A weather patch any MeshStandardMaterial can wear: darker and glossier when
 * wet, snow on what faces the sky, moss in the crevices. U holds the shared
 * uniforms (uWet, uWetSpec, uSnow, uEave); `moss` how mossy this material gets.
 */
export function weatherPatch(mat, U, { moss = 0, porosity = 0.4, snow = 1 } = {}) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U, { uMossy: { value: moss }, uPor: { value: porosity }, uSnowK: { value: snow } });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
#ifdef USE_INSTANCING
vWP = (modelMatrix * instanceMatrix * vec4(transformed, 1.)).xyz;
#else
vWP = (modelMatrix * vec4(transformed, 1.)).xyz;
#endif`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vWP;
uniform float uWet, uWetSpec, uSnow, uMossy, uPor, uSnowK;
uniform vec4 uEave;
float wh(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float wn(vec2 p) { vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f); return mix(mix(wh(i), wh(i + vec2(1, 0)), u.x), mix(wh(i + vec2(0, 1)), wh(i + vec2(1, 1)), u.x), u.y); }
float gWS = 0.;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  vec3 nW = normalize((vec4(normal, 0.) * viewMatrix).xyz);
  float exposed = 1.;
  if (uEave.w > .5 && vWP.x > uEave.x && vWP.x < uEave.y) exposed = smoothstep(uEave.z - .05, uEave.z + .06, vWP.z);
  float up = smoothstep(.25, .9, nW.y);
  float n = wn(vWP.xz * 14.) * .6 + wn(vWP.xz * 37.) * .4;
  float mossy = uMossy * smoothstep(.5, .72, n + (1. - up) * .12) * smoothstep(-.3, .4, nW.y);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.28, .4, .16) * (.75 + n * .5), mossy);
  float wet = uWet * exposed;
  diffuseColor.rgb *= mix(1., mix(1., .35, uPor), wet);
  gWS = uWetSpec * exposed;
  float sc = smoothstep(.35, .7, uSnow * uSnowK * (up * 1.2) + (n - .5) * .3) * exposed;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.93, .95, .98), sc);
  normal = normalize(mix(normal, (viewMatrix * vec4(0., 1., 0., 0.)).xyz, sc * .7));
}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor *= mix(1., .38, gWS);');
  };
  mat.customProgramCacheKey = () => 'weather-' + moss + '-' + porosity + '-' + snow;
  return mat;
}

/* ---------------- geometry ---------------- */

/** a pillow stone: flat walking face, rounded shoulders, a ragged plan */
export function pillowStone(rx, rz, top, sink, seed, color) {
  const g = new THREE.IcosahedronGeometry(1, 4);
  const p = g.attributes.position, col = [];
  const c = new THREE.Color(color), c2 = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const k = 1 + (vnoise(Math.cos(a) * 1.6 + seed, Math.sin(a) * 1.6 + seed * 0.7) - 0.5) * 0.36 + (vnoise(Math.cos(a) * 4 + seed, Math.sin(a) * 4) - 0.5) * 0.08;
    const ys = Math.sign(y) * Math.pow(Math.abs(y), 0.32);
    const bump = (fbm(x * 2.2 + seed, z * 2.2, 3) - 0.5) * 0.12;
    x *= rx * k; z *= rz * k;
    y = ys > 0 ? ys * top * (1 + bump) : ys * sink;
    p.setXYZ(i, x, y, z);
    const sh = 0.86 + (fbm(x * 9 + seed, z * 9, 3) - 0.5) * 0.22 + (y > 0 ? 0.06 : -0.12);
    c2.copy(c).multiplyScalar(sh);
    col.push(c2.r, c2.g, c2.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

/** a karesansui rock: craggy above, flat-bottomed, partly buried */
export function rockGeometry(r, seed, color = 0x6f6c66, h = 0.75) {
  const g = new THREE.IcosahedronGeometry(1, 5);
  const p = g.attributes.position, col = [];
  const c = new THREE.Color(color), c2 = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + (fbm(x * 1.2 + seed, y * 1.2 + z * 0.9, 4) - 0.5) * 0.7 + (vnoise(x * 5 + seed, z * 5 + y * 4) - 0.5) * 0.06;
    // strata: soft horizontal steps
    const yy = y * h * k;
    const step = Math.floor(yy * 7) / 7, yS = yy + (step - yy) * 0.12 * (yy > 0 ? 1 : 0);
    p.setXYZ(i, x * k * 1.15 * r, Math.max(yS, -0.25) * r, z * k * r);
    const sh = 0.84 + (fbm(x * 6 + seed, y * 6 + z * 3, 3) - 0.5) * 0.28 + y * 0.1;
    c2.copy(c).multiplyScalar(sh);
    col.push(c2.r, c2.g, c2.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

/** the chōzubachi of a tsukubai: a round basin with a carved bowl */
function basinGeometry(r, h, seed) {
  const pts = [];
  const prof = [[0, -0.05], [r * 0.92, -0.05], [r, h * 0.2], [r * 0.98, h * 0.85], [r * 0.9, h], [r * 0.68, h], [r * 0.62, h * 0.94], [r * 0.5, h * 0.72], [0, h * 0.68]];
  for (const [x, y] of prof) pts.push(new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(pts, 40);
  const p = g.attributes.position, col = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x);
    const k = 1 + (vnoise(Math.cos(a) * 2 + seed, Math.sin(a) * 2 + y * 3) - 0.5) * 0.12;
    p.setXYZ(i, x * k, y, z * k);
    const s = 0.72 + (fbm(x * 8 + seed, z * 8 + y * 5, 3) - 0.5) * 0.45 + y * 0.2;
    col.push(0.56 * s, 0.55 * s, 0.52 * s);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

/* ---------------- the set ---------------- */

export class StoneSet {
  constructor(parent, U, { heightAt = () => 0 } = {}) {
    this.parent = parent;
    this.U = U;
    this.groundAt = heightAt;
    this.stones = [];        // footprints: { kind, x, z, rx, rz, rot, top, block }
    const tex = stoneTextures(0xb0aca4, 21);
    const stoneMat = (moss) => weatherPatch(new THREE.MeshStandardMaterial({ vertexColors: true, map: tex.map, normalMap: tex.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.82 }), U, { moss, porosity: 0.3 });
    this.mats = { stone: stoneMat(0.14), rock: stoneMat(0.05), clean: stoneMat(0.04) };
    this.ropeMat = weatherPatch(new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.95 }), U, { porosity: 0.9, snow: 0.6 });
    this.waterMat = new THREE.MeshStandardMaterial({ color: 0x1d2a26, roughness: 0.04, metalness: 0, envMapIntensity: 1.2 });
    this.group = new THREE.Group();
    this.group.name = 'Stones';
    parent.add(this.group);
    this.style = 'oribe';
    this.kind = 'kurama';
  }

  clear(filter = null) {
    this.stones = filter ? this.stones.filter((s) => !filter(s)) : [];
    this.dirty = true;
  }

  /** a tobi-ishi at (x, z), radius r, set `proud` above the ground */
  tobi(x, z, r = 0.2, { rot = 0, seed = 1, kind = this.kind, proud = PROUD[this.style], tag = 'tobi', big = false } = {}) {
    const h = hash2i(seed, 77);
    const rx = r * (1.05 + h[0] * 0.25), rz = r * (0.78 + h[1] * 0.2);
    const pal = STONE_KINDS[kind];
    this.stones.push({ type: 'pillow', tag, x, z, rx, rz, rot, top: proud, sink: 0.08, seed, color: pal[seed % pal.length], block: false, big });
    this.dirty = true;
  }
  kutsunugi(x, z) {
    this.stones.push({ type: 'pillow', tag: 'kutsunugi', x, z, rx: 0.42, rz: 0.27, rot: 0.08, top: 0.2, sink: 0.12, seed: 41, color: 0x8e8a82, block: false, big: true });
    this.dirty = true;
  }
  barrier(x, z) {
    this.stones = this.stones.filter((s) => s.tag !== 'barrier');
    this.stones.push({ type: 'barrier', tag: 'barrier', x, z, rx: 0.07, rz: 0.07, rot: 0.6, top: 0.11, seed: 5, color: 0x5d5a55, block: true });
    this.dirty = true;
  }
  rock(x, z, r, seed = 3) {
    this.stones.push({ type: 'rock', tag: 'rock', x, z, rx: r * 1.1, rz: r * 0.95, rot: seed, top: r * 0.6, seed, color: 0x837e74, block: true });
    this.dirty = true;
  }
  tsukubai(x, z, r = 0.3) {
    this.stones.push({ type: 'basin', tag: 'basin', x, z, rx: r, rz: r, rot: 0, top: 0.42, seed: 9, color: 0x8a8780, block: true });
    this.dirty = true;
  }

  /** top of the stones at (x, z) above the ground, or -Infinity */
  topAt(x, z) {
    let best = -Infinity;
    for (const s of this.stones) {
      if (s.block) continue;
      const c = Math.cos(-s.rot), si = Math.sin(-s.rot), dx = x - s.x, dz = z - s.z;
      const lx = dx * c - dz * si, lz = dx * si + dz * c;
      const e = (lx / (s.rx * 0.92)) ** 2 + (lz / (s.rz * 0.92)) ** 2;
      if (e < 1) best = Math.max(best, s.y0 + s.top * (e < 0.6 ? 1 : 1 - (e - 0.6) * 0.6));
    }
    return best;
  }
  blockedAt(x, z, pad = 0.05) {
    for (const s of this.stones) {
      if (!s.block) continue;
      if (Math.hypot((x - s.x) / (s.rx + pad), (z - s.z) / (s.rz + pad)) < 1) return true;
    }
    return false;
  }
  near(x, z, r) { return this.stones.filter((s) => Math.hypot(x - s.x, z - s.z) < r + Math.max(s.rx, s.rz)); }

  rebuild() {
    if (!this.dirty) return;
    this.dirty = false;
    for (const m of this.group.children) m.geometry.dispose();
    this.group.clear();
    const buckets = { stone: [], rock: [], clean: [], rope: [], water: [] };
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (const s of this.stones) {
      s.y0 = this.groundAt(s.x, s.z);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.rot);
      m4.compose(new THREE.Vector3(s.x, s.y0, s.z), q, new THREE.Vector3(1, 1, 1));
      if (s.type === 'pillow') {
        buckets[s.big ? 'clean' : 'stone'].push(pillowStone(s.rx, s.rz, s.top, s.sink, s.seed, s.color).applyMatrix4(m4));
      } else if (s.type === 'rock') {
        buckets.rock.push(rockGeometry(s.rx / 1.1, s.seed, s.color).applyMatrix4(m4));
      } else if (s.type === 'barrier') {
        const g = pillowStone(0.068, 0.062, 0.1, 0.02, 7, s.color);
        g.translate(0, 0.0, 0);
        buckets.clean.push(g.applyMatrix4(m4));
        buckets.rope.push(...ropeKnot(0.07, 0.12).map((r) => r.applyMatrix4(m4)));
      } else if (s.type === 'basin') {
        buckets.clean.push(basinGeometry(s.rx, s.top, s.seed).applyMatrix4(m4));
        const w = new THREE.CircleGeometry(s.rx * 0.6, 32);
        w.rotateX(-Math.PI / 2); w.translate(0, s.top * 0.86, 0);
        buckets.water.push(w.applyMatrix4(m4));
      }
    }
    const add = (geos, mat, name, cast = true) => {
      if (!geos.length) return;
      const g = mergeGeometries(geos.map((x) => (x.index ? x.toNonIndexed() : x)), false);
      geos.forEach((x) => x.dispose());
      const m = new THREE.Mesh(g, mat);
      m.name = name; m.castShadow = cast; m.receiveShadow = true;
      this.group.add(m);
    };
    add(buckets.stone, this.mats.stone, 'Tobi-ishi');
    add(buckets.clean, this.mats.clean, 'Kutsunugi-ishi, basin, barrier stone');
    add(buckets.rock, this.mats.rock, 'Karesansui rocks');
    add(buckets.rope, this.ropeMat, 'Palm rope');
    add(buckets.water, this.waterMat, 'Basin water', false);
  }
}

/** shuro-nawa tied crosswise over a fist-sized stone, with a carrying loop */
function ropeKnot(r, h) {
  const tube = (pts, rad = 0.0075) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 24, rad, 6, false);
  const arc = (ang) => {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const t = -Math.PI / 2 + (i / 10) * Math.PI;
      pts.push([Math.sin(t) * r * 1.02 * Math.cos(ang), Math.max(0.01, Math.cos(t) * h * 0.95 + 0.004), Math.sin(t) * r * 1.02 * Math.sin(ang)]);
    }
    return tube(pts);
  };
  const knot = new THREE.TorusGeometry(0.014, 0.008, 6, 12);
  knot.rotateX(Math.PI / 2); knot.translate(0, h + 0.006, 0);
  const loop = tube([[-0.012, h + 0.01, 0], [-0.02, h + 0.04, 0.005], [0, h + 0.058, 0], [0.02, h + 0.04, -0.005], [0.012, h + 0.01, 0]], 0.006);
  return [arc(0), arc(Math.PI / 2), knot, loop];
}
