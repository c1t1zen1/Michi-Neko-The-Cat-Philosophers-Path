// The ground under and around the water. A heightfield (the stage, or a cube
// slab with strata on its sides) shaded by one MeshStandard material that
// knows where the water is: silt and pebbles under it, a dark wet band just
// above it, caustics on the bed, mud in the paddies, snow in winter.
import * as THREE from 'three';
import { HASH, NOISE } from '../../shared/glsl.js';
import { groundTextures, dirtTextures, stoneTextures } from '../../shared/game.js';

export const SEASONS = {
  spring: { grass: [1.04, 1.1, 0.92], snow: 0 },
  early: { grass: [0.96, 1.08, 0.86], snow: 0 },
  summer: { grass: [0.82, 0.98, 0.72], snow: 0 },
  autumn: { grass: [1.16, 0.98, 0.66], snow: 0 },
  winter: { grass: [0.92, 0.86, 0.74], snow: 1 }
};

const CHUNK_VS = /* glsl */`
varying vec3 vWP;
varying vec3 vWN;`;

const CHUNK_FS = /* glsl */`
varying vec3 vWP;
varying vec3 vWN;
uniform sampler2D uField, uGrass, uDirt, uStone;
uniform vec4 uBox;
uniform float uLevel, uTime, uCaustic, uChroma, uWetBand, uRain, uSnow, uPaint;
uniform vec3 uSunDir, uSunCol, uGrassTint;
uniform float uSunI;
uniform vec4 uPaddy[3];
uniform vec3 uPaddyLvl;
uniform float uPaddyMud;
${HASH}
${NOISE}
float caustic(vec2 p, float t) {
  vec3 v1 = voronoi2(p * 1.7 + vec2(t * 0.23, t * 0.11));
  vec3 v2 = voronoi2(p * 2.31 + vec2(-t * 0.19, t * 0.27) + 5.1);
  float a = 1. - smoothstep(0., 0.17, v1.y - v1.x);
  float b = 1. - smoothstep(0., 0.17, v2.y - v2.x);
  return a * b * 1.7 + (a + b) * 0.07;
}`;

const COLOR_FS = /* glsl */`
  vec3 P = vWP; vec3 Nw = normalize(vWN);
  float h = P.y - uLevel;
  vec3 grass = texture2D(uGrass, P.xz * 0.22).rgb * uGrassTint;
  // broad tonal drifts, like a painted meadow: moss-dark hollows, sunlit yellow-green swells
  float drift = gnoise2(P.xz * 0.11 + 7.);
  grass *= mix(vec3(0.78, 0.86, 0.8), vec3(1.12, 1.08, 0.86), smoothstep(0.25, 0.75, drift));
  vec3 earth = texture2D(uDirt, P.xz * 0.31).rgb;
  vec3 stone = texture2D(uStone, P.xz * 0.55).rgb;
  float n1 = gnoise2(P.xz * 0.9), n2 = gnoise2(P.xz * 3.7 + 3.) * 0.65 + gnoise2(P.xz * 9.3) * 0.35;
  float slope = 1. - Nw.y;
  vec3 col = mix(grass, earth * 0.92, smoothstep(0.2, 0.5, slope + (n1 - 0.5) * 0.15));
  // the bank: earth, and gravel where the current has dropped it
  float bank = 1. - smoothstep(0.06, 0.3 + n1 * 0.14, h);
  vec3 gravel = mix(stone * 0.68, earth * 0.95, smoothstep(0.32, 0.68, n2));
  col = mix(col, mix(earth * 0.88, gravel, smoothstep(0.42, 0.62, n1 + (1. - slope) * 0.08)), bank);
  // the bed, seen through the water: silt with pebbles
  float under = smoothstep(0.0, -0.05, h);
  vec3 silt = mix(vec3(0.36, 0.33, 0.25), vec3(0.24, 0.24, 0.2), n1);
  vec3 pebble = stone * (0.55 + n2 * 0.4);
  col = mix(col, mix(silt, pebble, smoothstep(0.4, 0.7, n2 + (n1 - 0.5) * 0.3)), under);
  // paddy floors: puddled mud
  float inPaddy = 0.;
  for (int i = 0; i < 3; i++) {
    vec4 r = uPaddy[i];
    if (r.z <= r.x) continue;
    float d = max(max(r.x - P.x, P.x - r.z), max(r.y - P.z, P.z - r.w));
    float m = (1. - smoothstep(-0.05, 0.05, d)) * step(P.y, uPaddyLvl[i] + 0.06);
    inPaddy = max(inPaddy, m);
  }
  col = mix(col, mix(vec3(0.2, 0.17, 0.12), vec3(0.3, 0.26, 0.18), n2) * mix(1., 1.6, 1. - uPaddyMud), inPaddy);
  // strata on the cut faces of a slab
  float wall = 1. - smoothstep(0.05, 0.2, abs(Nw.y));
  // strata on a cut face: noise along the face and up it, so the layers wander and pebbles show
  vec2 fq = vec2(P.x + P.z, P.y);
  float s1 = gnoise2(fq * vec2(1.2, 2.5)), s2 = gnoise2(fq * vec2(7., 9.) + 4.);
  vec3 strata = P.y > -0.16 + (s1 - 0.5) * 0.1 ? vec3(0.27, 0.2, 0.14)
    : P.y > -0.62 + (s1 - 0.5) * 0.14 ? vec3(0.5, 0.41, 0.28) * (0.92 + s2 * 0.16)
    : mix(vec3(0.4, 0.38, 0.34), vec3(0.58, 0.56, 0.5), smoothstep(0.55, 0.7, s2));
  col = mix(col, strata * (0.92 + s1 * 0.12), wall);
  // the wet band above the waterline, plus everything when it rains
  float wet = (1. - smoothstep(0.0, uWetBand, h)) * step(-0.03, h) * (1. - wall);
  wet = clamp(wet + uRain * 0.55 + inPaddy * 0.6, 0., 1.);
  col *= 1. - 0.42 * wet;
  // snow on what faces up
  float snow = uSnow * smoothstep(0.75, 0.95, Nw.y) * smoothstep(0.35, 0.55, n1 + 0.2) * step(0.04, h) * (1. - inPaddy * 0.7);
  col = mix(col, vec3(0.9, 0.93, 0.98), snow);
  diffuseColor.rgb = col;
  float wetGloss = wet;`;

const ROUGH_FS = /* glsl */`
#include <roughnessmap_fragment>
  roughnessFactor = mix(roughnessFactor, 0.28, wetGloss * 0.85);`;

const EMISSIVE_FS = /* glsl */`
#include <emissivemap_fragment>
  {
    float dep = uLevel - vWP.y;
    float k = uCaustic * smoothstep(0.02, 0.16, dep) * exp(-dep * 1.25) * smoothstep(0., 0.25, uSunDir.y) * (1. - wall) * (1. - inPaddy);
    if (k > 0.002) {
      vec2 q = vWP.xz;
      float c = caustic(q, uTime);
      vec3 cc = vec3(c);
      if (uChroma > 0.) cc = vec3(caustic(q + vec2(0.025, 0.), uTime), c, caustic(q - vec2(0.025, 0.), uTime));
      totalEmissiveRadiance += cc * uSunCol * uSunI * k * 0.22;
    }
  }`;

/** Ground material. U: shared water uniforms (uField, uBox, uLevel, uTime, sun). */
export function createGroundMaterial(U, extra = {}) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0 });
  const G = groundTextures(6), D = dirtTextures(7), S = stoneTextures(0x8d8a80, 5);
  const own = {
    uGrass: { value: G.map }, uDirt: { value: D.map }, uStone: { value: S.map },
    uCaustic: { value: 1 }, uChroma: { value: 0 }, uWetBand: { value: 0.22 }, uRain: U.uRain, uSnow: { value: 0 }, uPaint: U.uPaint,
    uGrassTint: { value: new THREE.Vector3(1, 1, 1) },
    uPaddy: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] }, uPaddyLvl: { value: new THREE.Vector3(-9, -9, -9) },
    uPaddyMud: { value: 1 },
    ...extra
  };
  for (const k of ['uField', 'uBox', 'uLevel', 'uTime', 'uSunDir', 'uSunCol', 'uSunI']) own[k] = U[k];
  mat.userData.u = own;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, own);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + CHUNK_VS)
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vWP = (modelMatrix * vec4(transformed, 1.)).xyz;\n  vWN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + CHUNK_FS)
      .replace('#include <map_fragment>', COLOR_FS)
      .replace('#include <roughnessmap_fragment>', ROUGH_FS)
      .replace('#include <emissivemap_fragment>', EMISSIVE_FS);
  };
  mat.customProgramCacheKey = () => 'lab02-ground';
  return mat;
}

export function setSeason(mat, season) {
  const s = SEASONS[season] || SEASONS.spring;
  mat.userData.u.uGrassTint.value.set(...s.grass);
  mat.userData.u.uSnow.value = s.snow;
}

/** A heightfield sampled on a grid; heightAt() is bilinear over the same grid the mesh uses. */
export class HeightGrid {
  constructor({ x0, z0, w, d, res, fn }) {
    Object.assign(this, { x0, z0, w, d, res });
    this.nx = Math.round(w * res) + 1;
    this.nz = Math.round(d * res) + 1;
    this.h = new Float32Array(this.nx * this.nz);
    for (let j = 0; j < this.nz; j++) for (let i = 0; i < this.nx; i++) this.h[j * this.nx + i] = fn(x0 + i / res, z0 + j / res);
  }
  heightAt(x, z) {
    const fx = (x - this.x0) * this.res, fz = (z - this.z0) * this.res;
    const i = Math.max(0, Math.min(this.nx - 2, Math.floor(fx))), j = Math.max(0, Math.min(this.nz - 2, Math.floor(fz)));
    const u = Math.min(1, Math.max(0, fx - i)), v = Math.min(1, Math.max(0, fz - j));
    const H = this.h, k = j * this.nx + i;
    // match the mesh's triangle split (PlaneGeometry: a-b-d / b-c-d)
    if (u + v <= 1) return H[k] + (H[k + 1] - H[k]) * u + (H[k + this.nx] - H[k]) * v;
    return H[k + this.nx + 1] + (H[k + this.nx] - H[k + this.nx + 1]) * (1 - u) + (H[k + 1] - H[k + this.nx + 1]) * (1 - v);
  }
  /** Top surface, plus skirts down to `bottom` when given (a cube slab). */
  geometry(bottom = null) {
    const { nx, nz, x0, z0, res } = this;
    const pos = [], idx = [], uv = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      pos.push(x0 + i / res, this.h[j * nx + i], z0 + j / res);
      uv.push(i / (nx - 1), j / (nz - 1));
    }
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, c = a + nx + 1, d = a + nx;
      idx.push(a, d, b, b, d, c);
    }
    if (bottom !== null) {
      const edge = (list, outward) => {
        const base = pos.length / 3;
        for (const [i, j] of list) {
          const x = x0 + i / res, z = z0 + j / res;
          pos.push(x, this.h[j * nx + i], z, x, bottom, z);
          uv.push(0, 0, 0, 1);
        }
        for (let k = 0; k < list.length - 1; k++) {
          const a = base + k * 2, b = a + 1, c = a + 2, d = a + 3;
          if (outward) idx.push(a, b, c, c, b, d); else idx.push(a, c, b, c, d, b);
        }
      };
      edge([...Array(nx).keys()].map((i) => [i, nz - 1]), true);
      edge([...Array(nx).keys()].map((i) => [i, 0]), false);
      edge([...Array(nz).keys()].map((j) => [nx - 1, j]), false);
      edge([...Array(nz).keys()].map((j) => [0, j]), true);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
}

/**
 * The glass-tank cutaway on a cube's sides: a vertical strip from the bed up
 * to the water line on each face, darker with depth.
 */
export function cutawayGeometry(grid, level) {
  const { nx, nz, x0, z0, res } = grid;
  const pos = [], dep = [], idx = [];
  const strip = (pts) => {
    const base = pos.length / 3;
    for (const [x, z] of pts) {
      const b = Math.min(level, grid.heightAt(x, z));
      pos.push(x, b, z, x, level, z);
      dep.push(level - b, 0);
    }
    for (let k = 0; k < pts.length - 1; k++) {
      const a = base + k * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  };
  const xs = [...Array(nx).keys()].map((i) => x0 + i / res), zs = [...Array(nz).keys()].map((j) => z0 + j / res);
  const x1 = x0 + (nx - 1) / res, z1 = z0 + (nz - 1) / res;
  strip(xs.map((x) => [x, z1 - 0.002]));
  strip(zs.map((z) => [x1 - 0.002, z]));
  strip(xs.map((x) => [x, z0 + 0.002]));
  strip(zs.map((z) => [x0 + 0.002, z]));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aDepth', new THREE.Float32BufferAttribute(dep, 1));
  g.setIndex(idx);
  return g;
}

export function cutawayMaterial(U) {
  return new THREE.ShaderMaterial({
    uniforms: { uDeep: U.uDeep, uShallow: U.uShallow, uLevel: U.uLevel, uSkyTop: U.uSkyTop, uSunI: U.uSunI },
    vertexShader: 'attribute float aDepth; varying float vD; varying float vY; void main(){ vD = aDepth; vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform vec3 uDeep, uShallow, uSkyTop; uniform float uLevel, uSunI; varying float vD; varying float vY;
      void main() {
        float d = uLevel - vY;
        vec3 c = mix(uShallow * 1.2, uDeep * 0.7, smoothstep(0., 0.9, d)) * (0.5 + uSunI * 0.3) + uSkyTop * 0.08;
        float a = mix(0.55, 0.88, smoothstep(0., 0.9, d));
        float line = 1. - smoothstep(0., 0.012, d);
        c = mix(c, vec3(0.9, 0.97, 1.), line * 0.8);
        gl_FragColor = vec4(c * a, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, premultipliedAlpha: true, depthWrite: false, side: THREE.DoubleSide
  });
}
