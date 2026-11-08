// Paper lanterns shared by the labs that light things: ribbed lathe bodies,
// washi lit from inside (a warm emissive with a fibre-and-rib map, brighter at
// the middle of the belly where the flame is closest), bamboo frames.
import * as THREE from 'three';
import { TAU, rng, canvas2d, canvasTexture, tube, V3, Bag, merge, lerp } from './craft.js';
import { M, paintify } from './painted.js';

/** A washi sheet: long fibres and the shadow of the bamboo ribs. */
export function washiTexture({ ribs = 14, seed = 7, tint = '#fff4e2' } = {}) {
  const [c, x] = canvas2d(256, 256);
  const r = rng(seed);
  x.fillStyle = tint; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 500; i++) {
    x.strokeStyle = `rgba(150,110,70,${0.04 + r() * 0.08})`; x.lineWidth = 0.5 + r();
    x.beginPath(); const px = r() * 256, py = r() * 256; x.moveTo(px, py); x.quadraticCurveTo(px + (r() - 0.5) * 50, py + (r() - 0.5) * 30, px + (r() - 0.5) * 70, py + (r() - 0.5) * 30); x.stroke();
  }
  for (let i = 0; i < ribs; i++) { const y = (i + 0.5) / ribs * 256; x.fillStyle = 'rgba(120,80,40,.34)'; x.fillRect(0, y - 1.2, 256, 2.4); x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(0, y + 1.2, 256, 1); }
  return canvasTexture(c, { repeat: true });
}

/**
 * Lit washi. glow is a uniform you can drive; the emissive falls off from the
 * belly toward the caps, the way a flame lights the inside of a sphere.
 */
export function lanternMaterial(tex, { color = 0xfff0dc, glowColor = 0xff9a3e } = {}) {
  const u = { uGlow: { value: 0 }, uFall: { value: 1.25 }, uGlowCol: { value: new THREE.Color(glowColor) } };
  const m = new THREE.MeshStandardMaterial({ color, map: tex, roughness: 0.9, side: THREE.DoubleSide });
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, u);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying float vH;').replace('#include <project_vertex>', '#include <project_vertex>\nvH = position.y;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vH; uniform float uGlow, uFall; uniform vec3 uGlowCol;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float bl = exp(-pow(abs(vH) * uFall / 0.28, 2.0));
        vec3 glowC = uGlowCol * (0.5 + 1.6 * bl) * texture2D(map, vMapUv).rgb;
        totalEmissiveRadiance += glowC * uGlow;`);
  };
  m.userData.u = u;
  m.customProgramCacheKey = () => 'washi';
  return m;
}

/** A hanging chōchin: lathe body, black caps, tassel, cord. */
export function chochin({ h = 0.5, belly = 0.17, glow = 0, tint, cord = 0.4, tex } = {}) {
  const g = new THREE.Group();
  const prof = [[0.12, 0.5], [0.3, 0.43], [0.45, 0.28], [0.5, 0.0], [0.45, -0.28], [0.3, -0.43], [0.12, -0.5]].map(([x, y]) => new THREE.Vector2(x * belly * 2, y * h));
  const mat = lanternMaterial(tex || washiTexture({ ribs: Math.round(h * 34) }), tint ? { color: tint } : {});
  mat.userData.u.uGlow.value = glow;
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), mat);
  body.name = 'paper'; g.add(body);
  const dark = M.plain(0x1a1614, { rough: 0.6, brush: 0 });
  for (const s of [1, -1]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(belly * 0.62, belly * 0.54, 0.028, 18), dark); cap.position.y = s * (h / 2 + 0.006); g.add(cap); }
  const b = new Bag();
  b.cyl(0.006, cord, { y: h / 2 + cord / 2, color: 0x2a2018 });
  b.cyl(0.006, 0.14, { y: -h / 2 - 0.09, color: 0xa62c1e });
  for (let i = 0; i < 7; i++) b.cyl(0.004, 0.09, { x: Math.cos(i) * 0.012, y: -h / 2 - 0.19, z: Math.sin(i) * 0.012, color: 0xa62c1e });
  g.add(b.mesh(M.bag({ rough: 0.9 }), 'cord'));
  g.userData.mat = mat;
  return g;
}

/** A tōrō-nagashi float: a square of paper on a wooden tray. */
export function floatLantern({ glow = 1, tint = 0xfff0dc, tex } = {}) {
  const g = new THREE.Group();
  const wood = M.wood({ base: 0x7a5c3a, dark: 0x4a3322 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.34), wood); base.position.y = 0.015; g.add(base);
  const mat = lanternMaterial(tex || washiTexture({ ribs: 0, seed: 3 }), { color: tint });
  mat.userData.u.uGlow.value = glow;
  mat.userData.u.uFall.value = 0.6;
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.28, 1, 4, 1), mat); box.position.y = 0.19; g.add(box);
  const b = new Bag();
  for (const [x, z] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]]) b.box(0.012, 0.34, 0.012, { x, y: 0.19, z, color: 0x4a3322 });
  g.add(b.mesh(M.bag({ rough: 0.8 })));
  g.userData.mat = mat;
  return g;
}

/** Bamboo cut with a slot, lit from inside: take-akari. */
export function takeAkari({ h = 0.9, r = 0.065, glow = 1 } = {}) {
  const g = new THREE.Group(), segs = 5;
  const mat = lanternMaterial(washiTexture({ ribs: 0 }), { color: 0x7fa84f, glowColor: 0xffb25a });
  mat.userData.u.uGlow.value = glow; mat.userData.u.uFall.value = 0.1;
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, h, 16, segs), M.bamboo());
  cyl.position.y = h / 2; g.add(cyl);
  const n = 9, slats = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, sl = new THREE.Mesh(new THREE.BoxGeometry(r * 0.32, h * 0.46, 0.006), mat); sl.position.set(Math.cos(a) * r * 1.01, h * 0.55, Math.sin(a) * r * 1.01); sl.rotation.y = -a + Math.PI / 2; g.add(sl); slats.push(sl); }
  g.userData.mat = mat;
  return g;
}

export { merge, V3, tube, lerp };
