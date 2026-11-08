// Collectibles: thread wound round a ball, fuzzy shells, and a key that glints.
import * as THREE from 'three';
import { V3, TAU, rng, tube, Bag, canvas2d, canvasTexture, merge, catmull, lerp } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { HASH, NOISE } from '../../shared/glsl.js';

/** A ball of yarn: bands of thread, each band a tube wound round the sphere. */
export function yarnGeometry(R = 0.18, { bands = 6, turns = 22, seed = 3, r = 0.014 } = {}) {
  const geos = [], rand = rng(seed);
  for (let b = 0; b < bands; b++) {
    const axis = V3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
    const side = V3(1, 0, 0).cross(axis).normalize(), up = axis.clone().cross(side);
    const thick = 0.42 + rand() * 0.3;
    for (let k = 0; k < 5; k++) {
      const pts = [], off = k * r * 2.2, phase = rand() * TAU;
      for (let i = 0; i <= 90; i++) {
        const t = i / 90 * TAU * (turns / 22), a = phase + t;
        const lift = Math.sin(a * 2.3 + b) * thick * 0.12 + off - k * r * 2.2 * 2;
        const p = side.clone().multiplyScalar(Math.cos(a) * R).add(up.clone().multiplyScalar(Math.sin(a) * R)).add(axis.clone().multiplyScalar(lift * R * 3));
        p.normalize().multiplyScalar(R * (1 + 0.04 * Math.sin(a * 5 + k)));
        pts.push(p);
      }
      geos.push(tube(pts, r, { radial: 5, caps: false }));
    }
  }
  return merge(geos);
}

export const YARN_COL = { peony: 0xd94a6a, ochre: 0xd49a3a, indigo: 0x3a4a8a, moss: 0x6a8a3a, snow: 0xe8e0d0 };

/** Sheen: MeshPhysicalMaterial's retroreflective cloth lobe. */
export const yarnMat = (color = YARN_COL.peony) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.95, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.5) });

/** Shell-textured fuzz: stacked inflated copies, thresholded harder near the tips. */
export function fuzzShells(geo, color, { layers = 12, length = 0.022, density = 280 } = {}) {
  const g = new THREE.Group();
  const col = new THREE.Color(color);
  for (let i = 0; i < layers; i++) {
    const t = (i + 1) / layers;
    const mat = new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(0.65 + 0.5 * t), roughness: 1 });
    mat.onBeforeCompile = (s) => {
      s.uniforms.uT = { value: t }; s.uniforms.uL = { value: length }; s.uniforms.uD = { value: density };
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT, uL; varying vec3 vO;').replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normal * uT * uL;\nvO = position;');
      s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>\nuniform float uT, uD; varying vec3 vO;\n${HASH}\n${NOISE}`)
        .replace('#include <map_fragment>', `#include <map_fragment>\nvec3 sp = normalize(vO); vec2 uvF = vec2(atan(sp.z, sp.x) * 12., sp.y * 24.) * uD / 280.; vec3 vr = voronoi2(uvF); if (vr.x > (1. - uT) * .62) discard;`);
    };
    mat.customProgramCacheKey = () => 'fuzz' + i;
    g.add(new THREE.Mesh(geo, mat));
  }
  return g;
}

/** A warded key from a lathe bow and shaped bits. */
export function keyGeometry() {
  const g = new Bag();
  g.add(new THREE.TorusGeometry(0.1, 0.022, 10, 26), { x: 0, y: 0.19, color: 0xd8b24a });
  g.add(new THREE.TorusGeometry(0.052, 0.012, 8, 20), { x: 0, y: 0.19, rz: 0.8, color: 0xc29c3a });
  g.cyl(0.018, 0.34, { y: -0.05, color: 0xd8b24a });
  g.cyl(0.03, 0.03, { y: 0.1, color: 0xc29c3a });
  g.box(0.09, 0.024, 0.02, { x: 0.05, y: -0.17, color: 0xd8b24a });
  g.box(0.06, 0.02, 0.02, { x: 0.035, y: -0.13, color: 0xd8b24a });
  return g;
}

/** A soft four-point sparkle, timed so it is rarely on two keys at once. */
export function glintSprite(color = 0xfff3c4) {
  const [c, x] = canvas2d(128, 128);
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  x.globalCompositeOperation = 'lighter'; x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 3;
  for (const a of [0, Math.PI / 2]) { x.save(); x.translate(64, 64); x.rotate(a); const gr = x.createLinearGradient(-64, 0, 64, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.strokeStyle = gr; x.beginPath(); x.moveTo(-64, 0); x.lineTo(64, 0); x.stroke(); x.restore(); }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(c), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false }));
  sp.renderOrder = 10;
  return sp;
}

export { M, catmull, tube, lerp };
