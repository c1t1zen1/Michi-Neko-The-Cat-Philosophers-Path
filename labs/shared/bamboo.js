// Bamboo for the fences, the grove and the garden: a unit culm with swollen
// nodes that scales to any length, and a colour ramp from fresh to weathered.
import * as THREE from 'three';
import { TAU, lerp, merge } from './craft.js';

/** A culm of unit height and unit radius, bulging at each node. */
export function culmGeometry({ nodes = 7, radial = 10, taper = 0.72 } = {}) {
  const prof = [];
  const steps = nodes * 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, n = t * nodes, f = n - Math.floor(n);
    const bulge = Math.exp(-Math.pow((f < 0.5 ? f : 1 - f) / 0.05, 2)) * 0.07;
    prof.push(new THREE.Vector2(lerp(1, taper, t) * (1 + bulge), t));
  }
  const g = new THREE.LatheGeometry(prof, radial);
  // a dark ring at each node and the pale waxy band just below it
  const n = g.attributes.position.count, cols = new Float32Array(n * 3), rows = prof.length, per = n / rows;
  for (let r = 0; r < rows; r++) {
    const f = (r / steps * nodes) % 1, d = Math.min(f, 1 - f);
    const dark = Math.exp(-Math.pow(d / 0.03, 2)), band = f > 0.86 ? Math.exp(-Math.pow((f - 0.93) / 0.05, 2)) : 0;
    const v = (1 - dark * 0.8) * (1 + band * 0.42);
    for (let c = 0; c < per; c++) { const i = r * per + c; cols[i * 3] = v; cols[i * 3 + 1] = v; cols[i * 3 + 2] = v * (1 + band * 0.12); }
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return g;
}

const FRESH = new THREE.Color(0x86a84e), DRY = new THREE.Color(0xcab27a), OLD = new THREE.Color(0x8a6e4a), BLACK = new THREE.Color(0x4a3a2e);
/** age 0 fresh green, 0.4 straw, 0.75 weathered brown, 1 dark. */
export function bambooColor(age, out = new THREE.Color()) {
  if (age < 0.4) return out.copy(FRESH).lerp(DRY, age / 0.4);
  if (age < 0.75) return out.copy(DRY).lerp(OLD, (age - 0.4) / 0.35);
  return out.copy(OLD).lerp(BLACK, (age - 0.75) / 0.25);
}

const _o = new THREE.Object3D(), _a = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
/** A matrix placing a unit-height, unit-radius culm from a to b at radius r. */
export function culmMatrix(a, b, r, out = new THREE.Matrix4()) {
  _a.copy(b).sub(a);
  const len = _a.length();
  _o.position.copy(a);
  _o.quaternion.setFromUnitVectors(_up, _a.normalize());
  _o.scale.set(r, len, r);
  _o.updateMatrix();
  return out.copy(_o.matrix);
}
