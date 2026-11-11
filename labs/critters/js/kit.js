// Koi with painted hides and a swimming bend in the vertex shader, sparrows,
// and butterflies that pick a flower.
import * as THREE from 'three';
import { V3, TAU, rng, canvas2d, canvasTexture, merge, lerp } from '../../shared/craft.js';

/* ---------------- koi ---------------- */

const PATTERNS = {
  kohaku: { base: '#f6efe0', blobs: [['#d83a18', 5]], label: 'Kohaku', hint: 'white, with patches of red', fin: 0xffe8d8 },
  sanke: { base: '#f6efe0', blobs: [['#d83a18', 4], ['#16131a', 4, 0.5]], label: 'Sanke', hint: 'white, red and small black, on top', fin: 0xffe8d8 },
  showa: { base: '#191720', blobs: [['#d83a18', 4], ['#f6efe0', 3, 0.8]], label: 'Shōwa', hint: 'black, and it wraps the belly', fin: 0x36323c },
  ogon: { base: '#e8b24a', blobs: [['#f6d26a', 6, 1.2]], label: 'Ōgon', hint: 'one colour, and metallic', fin: 0xf0ca72 },
  tancho: { base: '#f8f3e8', blobs: [], crown: true, label: 'Tanchō', hint: 'white, with one red spot on the head', fin: 0xfff1e6 }
};
export const KOI_KINDS = PATTERNS;

export function koiTexture(kind, seed = 3) {
  const P = PATTERNS[kind], [c, x] = canvas2d(256, 256), r = rng(seed * 97 + kind.length);
  x.fillStyle = P.base; x.fillRect(0, 0, 256, 256);
  for (const [col, n, sz = 1] of P.blobs) {
    x.fillStyle = col;
    for (let i = 0; i < n; i++) { const cy = 30 + (i + r()) * (190 / n), cx = 128 + (r() - 0.5) * 120, R = (24 + r() * 26) * sz; for (let k = 0; k < 7; k++) { x.beginPath(); x.ellipse(cx + (r() - 0.5) * R * 1.3, cy + (r() - 0.5) * R * 1.2, R * (0.5 + r() * 0.5), R * (0.5 + r() * 0.4), r() * 3, 0, TAU); x.fill(); } }
  }
  if (P.crown) { x.fillStyle = '#d83a18'; x.beginPath(); x.ellipse(128, 34, 38, 28, 0, 0, TAU); x.fill(); }
  for (const cx of [64, 192]) { x.fillStyle = '#c3b784'; x.beginPath(); x.ellipse(cx, 30, 8, 6, 0, 0, TAU); x.fill(); x.fillStyle = '#14181a'; x.beginPath(); x.ellipse(cx, 30, 5, 4, 0, 0, TAU); x.fill(); }
  // the scale reticulation over the back
  x.strokeStyle = 'rgba(30,20,20,.14)'; x.lineWidth = 1;
  for (let y = 0; y < 256; y += 9) for (let i = 0; i < 28; i++) { x.beginPath(); x.arc(i * 9 + (y % 18 ? 4.5 : 0), y, 6, 0.2, Math.PI - 0.2); x.stroke(); }
  return canvasTexture(c);
}

/** A koi along +Z, nose forward: a lathed body plus two pectorals and a tail. */
export function koiGeometry() {
  const prof = [[0.001, -0.56], [0.03, -0.52], [0.07, -0.4], [0.11, -0.24], [0.13, -0.04], [0.135, 0.12], [0.12, 0.28], [0.08, 0.42], [0.04, 0.5], [0.001, 0.53]];
  const body = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 24).rotateX(Math.PI / 2);
  const pos = body.attributes.position; for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) * 0.72 + Math.max(0, pos.getY(i)) * 0.18);
  body.computeVertexNormals();
  const fin = (w, h, x, y, z, ry, rz) => { const f = new THREE.PlaneGeometry(w, h, 1, 2).translate(w / 2, 0, 0).rotateX(Math.PI / 2).rotateY(ry).rotateZ(rz).translate(x, y, z); const uv = f.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.02, 0.5); const a = new Float32Array(f.attributes.position.count * 3).fill(1); f.setAttribute('color', new THREE.BufferAttribute(a, 3)); return f; };
  const finsL = fin(0.2, 0.15, 0.08, -0.05, 0.2, 0.4, -0.25), finsR = fin(0.2, 0.15, -0.08, -0.05, 0.2, Math.PI - 0.4, 0.25);
  const tail = new THREE.BufferGeometry(); tail.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.46, 0, 0.14, -0.8, 0, 0, -0.69, 0, -0.14, -0.8], 3)); tail.setAttribute('uv', new THREE.Float32BufferAttribute([0.02, 0.5, 0.02, 0.5, 0.02, 0.5, 0.02, 0.5], 2)); tail.setIndex([0, 1, 2, 0, 2, 3]); tail.computeVertexNormals();
  const dorsal = new THREE.BufferGeometry(); dorsal.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.09, 0.2, 0, 0.18, 0.01, 0, 0.1, -0.32], 3)); dorsal.setAttribute('uv', new THREE.Float32BufferAttribute([0.02, 0.5, 0.02, 0.5, 0.02, 0.5], 2)); dorsal.setIndex([0, 1, 2]); dorsal.computeVertexNormals();
  return merge([body, finsL, finsR, tail, dorsal]);
}

/** Bend the koi from nose to tail, and let the amount depend on speed. */
export function koiMaterial(tex, uT) {
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, side: THREE.DoubleSide });
  m.onBeforeCompile = (s) => {
    s.uniforms.uT = uT;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aKoi; uniform float uT;').replace('#include <begin_vertex>', `#include <begin_vertex>
      float tail = clamp((0.45 - position.z) / 1.2, 0., 1.);
      transformed.x += sin(position.z * 9. + uT * aKoi.x + aKoi.y) * tail * tail * 0.07;`);
  };
  m.customProgramCacheKey = () => 'koi';
  return m;
}

/* ---------------- birds ---------------- */

export function sparrowGeo() {
  const body = new THREE.SphereGeometry(0.07, 10, 8); body.scale(0.7, 0.72, 1.3);
  const head = new THREE.SphereGeometry(0.044, 10, 8).translate(0, 0.03, 0.082);
  const beak = new THREE.ConeGeometry(0.012, 0.03, 6).rotateX(Math.PI / 2).translate(0, 0.026, 0.13);
  const tail = new THREE.BoxGeometry(0.05, 0.008, 0.09).translate(0, -0.008, -0.13);
  return merge([body, head, beak, tail]);
}
export const wingGeo = () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.05, 0.15, 0.02, 0.02, 0.13, 0, -0.06, 0, 0, -0.07], 3)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals(); return g; };

/* ---------------- butterflies ---------------- */

export function wingTexture(hue = '#f0b42a', seed = 3) {
  const [c, x] = canvas2d(128, 128), r = rng(seed);
  x.clearRect(0, 0, 128, 128);
  const fore = () => { x.beginPath(); x.moveTo(6, 118); x.quadraticCurveTo(10, 26, 92, 8); x.quadraticCurveTo(124, 46, 104, 86); x.quadraticCurveTo(62, 112, 6, 118); x.closePath(); };
  x.fillStyle = hue; fore(); x.fill();
  x.save(); fore(); x.clip();
  x.strokeStyle = 'rgba(30,20,15,.8)'; x.lineWidth = 2.4; for (let i = 0; i < 7; i++) { x.beginPath(); x.moveTo(6, 118); x.quadraticCurveTo(40 + i * 6, 64, 100 - i * 2, 12 + i * 15); x.stroke(); }
  x.fillStyle = 'rgba(30,20,15,.88)'; x.lineWidth = 3; x.strokeStyle = 'rgba(30,20,15,.9)'; fore(); x.stroke(); x.fillRect(96, 0, 40, 128);
  x.fillStyle = 'rgba(255,245,210,.8)'; for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(106, 22 + i * 15, 3.5, 0, TAU); x.fill(); }
  x.restore();
  return canvasTexture(c);
}
export function butterfly(hue, seed) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ map: wingTexture(hue, seed), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 });
  const L = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.14).translate(0.07, 0, 0).rotateX(-Math.PI / 2), mat), R = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.14).translate(-0.07, 0, 0).rotateX(-Math.PI / 2).scale(1, 1, 1), mat);
  // R already extends into -X. Mirroring it again puts both wings on +X.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 6).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1a1612 }));
  g.add(L, R, body); g.userData.wings = [L, R];
  return g;
}
