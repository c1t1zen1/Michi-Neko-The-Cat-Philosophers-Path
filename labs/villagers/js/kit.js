// The village cats: each a real Cat with a coat and a temperament, plus the
// eye-shine that makes dusk feel like dusk.
import * as THREE from 'three';
import { canvas2d, canvasTexture, TAU, clamp } from '../../shared/craft.js';

export const COATS = {
  luna: { label: 'Luna', fur: 0x7f8796, belly: 0xdadce2, accent: 0x474e5f, eyeColor: 0xdec056, ribbon: 0x2b3d63, stripes: 0.3, build: 'luna', scale: 1, shine: 0xc6e87a, temper: 'Dignified. Grooms, sits, greets with a slow blink.', idle: ['groom', 'sit', 'sit', 'stretch'] },
  mochi: { label: 'Mochi', fur: 0xc9a06a, belly: 0xf1e6d2, accent: 0x7a5a3a, eyeColor: 0x9ac24a, ribbon: 0xc8402a, stripes: 1, build: 'mochi', scale: 0.96, shine: 0xc6e87a, temper: 'Round and bouncy. Stretches, yawns, comes running.', idle: ['stretch', 'yawn', 'yawn', 'sit'] },
  kuro: { label: 'Kuro', fur: 0x24242a, belly: 0x2c2c33, accent: 0x18181c, eyeColor: 0xa2ba6e, ribbon: 0xc8402a, stripes: 0, build: 'kuro', scale: 1.05, shine: 0xdcef86, temper: 'Aloof. Sits and watches; warms up slowly.', idle: ['sit', 'sit', 'sit', 'groom'] },
  michi: { label: 'Michi', fur: 0xae8450, belly: 0xeedcb8, accent: 0x5e3d26, eyeColor: 0xebb02a, ribbon: 0xd63228, stripes: 1, build: 'michi', scale: 1, shine: 0xc6e87a, temper: 'You.', idle: ['sit', 'groom', 'stretch', 'yawn'] }
};

let glintTex = null;
export function eyeGlintTexture() {
  if (glintTex) return glintTex;
  const [c, x] = canvas2d(64, 64), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  glintTex = canvasTexture(c);
  return glintTex;
}

/** Two sprites on the eyes; update(lightDir, camera) makes them retroreflect. */
export function eyeShine(cat, color = 0xc6e87a) {
  const spr = cat.eyes.map((eye) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: eyeGlintTexture(), color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false }));
    s.scale.setScalar(0.1); s.renderOrder = 20;
    eye.add(s);
    return s;
  });
  const P = new THREE.Vector3(), F = new THREE.Vector3(), V = new THREE.Vector3();
  return {
    spr,
    update(lightPos, camera, amount = 1) {
      spr.forEach((s, i) => {
        cat.eyes[i].getWorldPosition(P);
        cat.head.getWorldDirection(F);
        V.copy(camera.position).sub(P).normalize();
        const L = lightPos.clone().sub(P).normalize();
        // only what comes back along the line of the light: a retroreflector
        const facing = Math.max(0, F.dot(V) * -1 + 0.4);
        const back = Math.pow(Math.max(0, L.dot(V)), 40);
        s.material.opacity = Math.min(1, back * Math.pow(facing, 1.2) * amount * 1.4);
        s.scale.setScalar(0.07 + back * 0.05);
      });
    }
  };
}
