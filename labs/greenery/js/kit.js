// Bamboo that grows while you watch, and the clipped green of the street.
import * as THREE from 'three';
import { V3, TAU, rng, lerp, sstep, Bag, canvas2d, canvasTexture } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { culmGeometry, bambooColor } from '../../shared/bamboo.js';

export const CULM = culmGeometry({ nodes: 11, radial: 9, taper: 0.5 });

let leafTex = null;
export function leafTexture() {
  if (leafTex) return leafTex;
  const [c, x] = canvas2d(128, 256);
  x.clearRect(0, 0, 128, 256);
  x.fillStyle = '#6f9a42';
  x.beginPath(); x.moveTo(64, 6); x.quadraticCurveTo(116, 90, 64, 250); x.quadraticCurveTo(12, 90, 64, 6); x.fill();
  x.strokeStyle = 'rgba(220,240,160,.7)'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(64, 12); x.lineTo(64, 240); x.stroke();
  x.strokeStyle = 'rgba(200,225,140,.3)'; x.lineWidth = 1; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(64, 30 + i * 22); x.lineTo(30 + (i % 2) * 68, 44 + i * 22); x.stroke(); }
  leafTex = canvasTexture(c);
  return leafTex;
}

/** Sway a mesh from its base; uses instance position and height. */
export function swayMat(mat, u) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (s) => {
    prev?.(s);
    s.uniforms.uT = u.uT; s.uniforms.uW = u.uW;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT, uW;').replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec4 iw = instanceMatrix * vec4(transformed, 1.); float ht = max(0., iw.y) / 9.; float ph = instanceMatrix[3].x * .4 + instanceMatrix[3].z * .3;
        vec3 off = vec3(sin(uT * 1.25 + ph) + .5 * sin(uT * 3.1 + ph * 1.7), 0., cos(uT * 1.1 + ph * 1.2)) * uW * .32 * ht * ht;
        transformed += (inverse(mat3(instanceMatrix)) * off);
      #endif`);
  };
  mat.customProgramCacheKey = () => 'sway' + (mat.defines?.P_BRUSH || '');
  mat.needsUpdate = true;
  return mat;
}

export function growthCurve(days, born, life = 42) {
  const t = (days - born) / life;
  if (t <= 0) return 0;
  // slow, fast, slow: internodes stretch in a wave from the bottom up
  return Math.pow(sstep(0, 1, Math.min(1, t)), 1.2);
}
