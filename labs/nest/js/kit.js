// A nest is built, twig by twig: a coarse base, walls laid round, fine stuff
// at the rim, and a soft lining pressed in by a warm body.
import * as THREE from 'three';
import { V3, TAU, tube, rng, merge, lerp, catmull, canvas2d, canvasTexture, Bag } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';

/** A short bent twig of unit length, along +Z. */
export function twigGeometry(seed = 1) {
  const r = rng(seed), pts = [];
  for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push(V3((r() - 0.5) * 0.09 * (0.3 + t), (r() - 0.5) * 0.09 * (0.3 + t), t - 0.5)); }
  return tube(pts, (t) => lerp(1, 0.55, t), { radial: 5, uScale: 0.4 });
}

/** Where a twig goes at each stage, on the surface of a shallow cup. */
export function twigPlacement(R, index, phase, r) {
  const a = r() * TAU;
  if (phase === 'base') {
    const d = Math.sqrt(r()) * R * 0.78;
    return { x: Math.cos(a) * d, y: 0.03 + r() * 0.02, z: Math.sin(a) * d, ry: r() * TAU, tilt: (r() - 0.5) * 0.25, len: 0.34 + r() * 0.16, thick: 0.016 };
  }
  if (phase === 'wall') {
    const d = R * (0.74 + r() * 0.18), h = 0.06 + r() * 0.26;
    return { x: Math.cos(a) * d, y: h, z: Math.sin(a) * d, ry: a + Math.PI / 2 + (r() - 0.5) * 0.8, tilt: (r() - 0.5) * 0.5, len: 0.3 + r() * 0.2, thick: 0.012 };
  }
  // rim
  const d = R * (0.86 + r() * 0.12), h = 0.3 + r() * 0.08;
  return { x: Math.cos(a) * d, y: h, z: Math.sin(a) * d, ry: a + Math.PI / 2 + (r() - 0.5) * 0.4, tilt: (r() - 0.5) * 0.3, len: 0.22 + r() * 0.12, thick: 0.007 };
}

const ALL = [twigGeometry(1), twigGeometry(2), twigGeometry(3)];
export const TWIGS = () => merge(ALL);

/** The nest as one instanced mesh of twigs. */
export function buildNest(R = 0.62, seed = 3, cap = 340) {
  const im = new THREE.InstancedMesh(twigGeometry(seed), M.plain(0x7a5a3c, { rough: 1, brush: 0.14 }), cap);
  im.count = 0; im.frustumCulled = false; im.castShadow = im.receiveShadow = true;
  const r = rng(seed * 7 + 1), o = new THREE.Object3D(), col = new THREE.Color();
  const add = (phase, i) => {
    if (im.count >= cap) return;
    const p = twigPlacement(R, i, phase, r);
    o.position.set(p.x, p.y, p.z); o.rotation.set(p.tilt, p.ry, 0); o.scale.set(p.thick, p.thick, p.len); o.updateMatrix();
    im.setMatrixAt(im.count, o.matrix);
    const tone = phase === 'base' ? 0.65 + r() * 0.15 : phase === 'wall' ? 0.8 + r() * 0.15 : 0.92 + r() * 0.2;
    col.setRGB(tone, tone * 0.92, tone * 0.82);
    im.setColorAt(im.count, col);
    im.count++;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  };
  return { im, add, R };
}

export function eggTexture(seed = 3) {
  const [c, x] = canvas2d(128, 128), r = rng(seed);
  x.fillStyle = '#b8dcd8'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 80; i++) { x.fillStyle = `rgba(${70 + r() * 50},${60 + r() * 40},${50 + r() * 30},${0.2 + r() * 0.5})`; x.beginPath(); x.arc(r() * 128, r() * 128, 1 + r() * 3, 0, TAU); x.fill(); }
  return canvasTexture(c);
}

/** Lining: shredded moss packed into the cup, sized by a warm body. */
export function lining(R = 0.62) {
  const pts = [[0.001, 0.08], [R * 0.3, 0.075], [R * 0.56, 0.11], [R * 0.74, 0.22], [R * 0.82, 0.32], [R * 0.76, 0.33], [R * 0.5, 0.15], [R * 0.2, 0.09], [0.001, 0.09]].map(([a, b]) => new THREE.Vector2(a, b));
  const g = new THREE.LatheGeometry(pts, 32);
  return new THREE.Mesh(g, M.moss({ a: 0x4a5a2a, b: 0x8a8a4a, bump: 0.05, bumpK: 22, moss: 1.1, brush: 0.2 }));
}

/** A feather with a quill and a fan of barbs, painted to a card. */
export function feather(color = '#c8a968') {
  const [c, x] = canvas2d(64, 256);
  x.clearRect(0, 0, 64, 256);
  x.fillStyle = color; x.beginPath(); x.moveTo(32, 8); x.bezierCurveTo(60, 60, 60, 190, 34, 244); x.bezierCurveTo(8, 190, 4, 60, 32, 8); x.fill();
  x.strokeStyle = 'rgba(70,50,30,.55)'; x.lineWidth = 0.8; for (let i = 0; i < 44; i++) { x.beginPath(); x.moveTo(32, 12 + i * 5); x.lineTo(32 + (i % 2 ? 26 : -26), 22 + i * 5); x.stroke(); }
  x.strokeStyle = 'rgba(245,235,215,.85)'; x.lineWidth = 2; x.beginPath(); x.moveTo(32, 6); x.lineTo(33, 250); x.stroke();
  return new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.42), new THREE.MeshStandardMaterial({ map: canvasTexture(c), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.85 }));
}
