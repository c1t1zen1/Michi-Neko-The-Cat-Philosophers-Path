import * as THREE from 'three';

/**
 * Dusk eye shine (lab 19 `shine`, promoted for modular villagers). The
 * tapetum sends light back the way it came, so each eye gets an additive
 * sprite that opens only when eye, viewer and light line up, and only as the
 * light dims. In the game the light is the viewer's own (the camera), so the
 * glint shows when a cat at dusk or night looks toward you. Deterministic:
 * the glint texture is drawn from a gradient, no randomness.
 */
let glintTex = null;
function glintTexture() {
  if (glintTex) return glintTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  glintTex = new THREE.CanvasTexture(c);
  return glintTex;
}

/** 0 by day, 1 at night: ramps over 17.5-19.5 and 5.5-6.5 (hours). */
export function duskAmount(dayTime) {
  if (dayTime == null) return 0;
  if (dayTime >= 19.5 || dayTime < 5.5) return 1;
  if (dayTime >= 17.5) return (dayTime - 17.5) / 2;
  if (dayTime < 6.5) return 1 - (dayTime - 5.5);
  return 0;
}

const P = new THREE.Vector3(), F = new THREE.Vector3(), V = new THREE.Vector3();

export class EyeShine {
  constructor(cat, color = 0xc6e87a) {
    this.cat = cat;
    this.sprites = cat.eyes.map((eye) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTexture(), color, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false }));
      s.scale.setScalar(0.07); s.renderOrder = 20; s.visible = false;
      eye.add(s);
      return s;
    });
  }

  /** Returns the opacity of the brighter eye (0 = off). */
  update(camera, dayTime) {
    const amount = duskAmount(dayTime);
    let top = 0;
    for (let i = 0; i < this.sprites.length; i++) {
      const s = this.sprites[i];
      if (!camera || amount <= 0) { s.visible = false; continue; }
      this.cat.eyes[i].getWorldPosition(P);
      this.cat.head.getWorldDirection(F);
      V.copy(camera.position).sub(P).normalize();
      const facing = Math.max(0, -F.dot(V) + 0.4);
      const o = Math.min(1, Math.pow(facing, 1.2) * amount * 1.1);
      s.material.opacity = o; s.visible = o > 0.01;
      s.scale.setScalar(0.07 + o * 0.04);
      top = Math.max(top, o);
    }
    return top;
  }
}
