import * as THREE from 'three';
import { toonMat, outlineMaterial, getEarInnerTexture } from '../../cat_shading.js?v=20261107a';

/**
 * The face: the eye frame the head shader paints the eyes into, the nose
 * leather and whiskers on the muzzle, the eye markers (look-at targets for
 * tools), and the ears on their animated pivots.
 *
 * Moved verbatim from src/cat.js (lane c1-rig-split). Functions take the
 * character `host` (the Cat) and set the fields the Cat always had: `face`,
 * `matEarInner`, `matNose`, `muzzle`, `nose`, `eyes`, `pupils`, `ears`; also
 * `whiskers` and the ear outlines in `host.outlines` (for tiers).
 */

const _v2 = new THREE.Vector3();
let _whiskerMat = null;

/**
 * The face uniforms the head shader reads (bound by reference: the mood
 * writes `state`, `look` and `mouth` every frame). Eye frame on the sculpted
 * face: up projected onto the skin, the outer corner tilted up a touch for
 * the almond, cat-like set.
 */
export function faceFrame(host, eyeColor) {
  const A = host.anatomy;
  const f = A.face;
  const n = new THREE.Vector3(...f.eyeN);
  const up = new THREE.Vector3(0, 1, 0).addScaledVector(n, -n.y).normalize();
  const right = new THREE.Vector3().crossVectors(up, n).normalize();
  const tilt = 0.14;
  const r = right.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(up, Math.sin(tilt));
  const u = up.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(right, -Math.sin(tilt));
  const hk = f.headScale;
  host.face = {
    eyeC: new THREE.Vector3(...f.eyeC).addScaledVector(n, 0.0004),
    eyeR: r, eyeU: u, eyeN: n,
    eyeSize: new THREE.Vector2(0.0228 * hk, 0.0208 * hk),
    eyeColor: new THREE.Color(eyeColor),
    state: new THREE.Vector4(0, 0, 1, 0),
    look: new THREE.Vector2(),
    nose: new THREE.Vector3(...f.nose),
    mouth: { value: 0 }
  };
}

/** Inner ear and nose leather; a nose colour of null/undefined is derived from the coat. Needs `host.palette`. */
export function faceMaterials(host, noseColor) {
  const cool = host.palette.cool;
  host.matEarInner = toonMat(new THREE.Color(0xffffff).lerp(new THREE.Color(0x7d6168), cool * 0.75), { map: getEarInnerTexture() });
  host.matNose = toonMat(noseColor ?? new THREE.Color(0xd9868c).lerp(new THREE.Color(0x4f3a40), cool));
}

export function buildFace(host) {
  const A = host.anatomy;
  const f = A.face;
  const hk = f.headScale;
  // Muzzle group: nose leather and whiskers
  host.muzzle = new THREE.Group();
  host.muzzle.name = 'Muzzle';
  host.head.add(host.muzzle);
  const nose = new THREE.Mesh(A.nose, host.matNose);
  const nn = new THREE.Vector3(...f.noseN);
  nose.position.set(...f.nose).addScaledVector(nn, 0.0015 * hk);
  nose.quaternion.setFromUnitVectors(_v2.set(0, 0, 1), nn);
  host.muzzle.add(nose);
  host.nose = nose;

  // Whiskers: four per side, fanning out and drooping a little
  if (!_whiskerMat) _whiskerMat = new THREE.LineBasicMaterial({ color: 0xf4eee4, transparent: true, opacity: 0.7 });
  const pts = [];
  const root = f.whiskerRoot;
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const lift = 0.07 - i * 0.055;
      const len = (0.105 + (i === 1 ? 0.012 : 0)) * hk;
      let prev = null;
      for (let k = 0; k <= 4; k++) {
        const t = k / 4;
        const p = new THREE.Vector3(
          s * (root[0] + 0.004 * hk + len * t),
          root[1] - i * 0.0042 * hk + len * lift * t - 0.016 * hk * t * t,
          root[2] - 0.002 * hk - len * 0.28 * t
        );
        if (prev) pts.push(prev, p);
        prev = p;
      }
    }
  }
  const whiskers = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), _whiskerMat);
  host.muzzle.add(whiskers);
  host.whiskers = whiskers;

  // Eye markers (the eyes themselves are painted by the head shader)
  host.eyes = [];
  host.pupils = [];
  for (const s of [-1, 1]) {
    const eye = new THREE.Object3D();
    eye.position.set(s * host.face.eyeC.x, host.face.eyeC.y, host.face.eyeC.z);
    const pupil = new THREE.Object3D();
    eye.add(pupil);
    host.head.add(eye);
    host.eyes.push(eye);
    host.pupils.push(pupil);
  }

  // Ears: a fixed base orientation, with an inner pivot that animates
  host.ears = [];
  for (const e of f.earBase) {
    const s = e.side;
    const base = new THREE.Group();
    base.position.set(e.pos[0], e.pos[1], e.pos[2]);
    base.rotation.set(-0.12, s * 0.38, s * -0.34);
    const ear = new THREE.Group();
    const outer = new THREE.Mesh(A.ears.outer, host.matEar);
    outer.castShadow = true;
    const inner = new THREE.Mesh(A.ears.inner, host.matEarInner);
    const outline = new THREE.Mesh(A.ears.outer, outlineMaterial(0.0016));
    ear.add(outer, inner, outline);
    (host.outlines ||= []).push(outline);
    base.add(ear);
    host.head.add(base);
    ear.userData.side = s;
    host.ears.push(ear);
  }
}
