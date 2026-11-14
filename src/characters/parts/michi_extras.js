import * as THREE from 'three';
import { makeCollarTexture } from '../../cat_shading.js?v=20261107a';
import { buildCollarCord, collarMaterials } from './collar.js?v=20261107a';

/**
 * Parts only the modular Michi wears (lane c2-michi).
 *
 *  - `eye-shine` (slot `head`): the dusk tapetum glint (lab 19). Two soft
 *    additive discs on the eyes; invisible until `host.setEyeShine(k)` is
 *    given k > 0 (the game feeds it the dusk factor), so by day the head is
 *    exactly the classic head. Hero tier only (hidden on mid/far).
 *  - `kumihimo-indigo` (slot `collar`): the same braided cord in the cool
 *    indigo of a festival collar; swaps with `kumihimo` in place.
 *
 * No Math.random: every number here is fixed.
 */

const SHINE_FIELDS = ['eyeShine', 'setEyeShine'];
const DEFAULT_SHINE = 0xfff0b0;

function shineTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 1, 16, 16, 15);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

export const EYE_SHINE = Object.freeze({
  id: 'eye-shine',
  slot: 'head',
  label: 'Dusk eye shine: a soft glint on each eye, off by day',
  params: Object.freeze({ color: DEFAULT_SHINE, strength: 0.85 }),
  build(host, entry) {
    const tex = shineTexture();
    const mat = new THREE.MeshBasicMaterial({
      map: tex, color: entry.color ?? DEFAULT_SHINE, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const geo = new THREE.CircleGeometry(1, 16);
    const f = host.face;
    const discs = [];
    for (const s of [-1, 1]) {
      const d = new THREE.Mesh(geo, mat);
      const n = new THREE.Vector3(s * f.eyeN.x, f.eyeN.y, f.eyeN.z);
      d.position.set(s * f.eyeC.x, f.eyeC.y, f.eyeC.z).addScaledVector(n, 0.0012);
      d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      d.scale.set(f.eyeSize.x * 0.62, f.eyeSize.y * 0.62, 1);
      d.renderOrder = 3;
      d.visible = false;
      host.head.add(d);
      discs.push(d);
    }
    const peak = entry.strength ?? 0.85;
    host.eyeShine = 0;
    host.setEyeShine = (k) => {
      const v = Math.min(1, Math.max(0, k)) * peak;
      host.eyeShine = v;
      mat.opacity = v;
      const on = v > 0.01 && host.tier === 'hero';
      for (const d of discs) d.visible = on;
    };
    return {
      objects: discs,
      fields: SHINE_FIELDS,
      owned: { geometries: [geo], materials: [mat], textures: [tex] }
    };
  },
  setTier(host, handle, tier) {
    for (const d of handle.objects) d.visible = tier === 'hero' && host.eyeShine > 0.01;
  }
});

const COLLAR_FIELDS = ['collar', 'bellMount', 'matRibbon'];
const INDIGO = 0x2b3d63;

export const KUMIHIMO_INDIGO = Object.freeze({
  id: 'kumihimo-indigo',
  slot: 'collar',
  label: 'Indigo braided cord (kumihimo) with the bell mount',
  params: Object.freeze({ color: INDIGO }),
  materials(host, entry) { collarMaterials(host, entry.color ?? INDIGO); },
  swapTo(host, handle, next, entry) {
    if (next.id !== 'kumihimo-indigo' && next.id !== 'kumihimo') return false;
    const old = host.matRibbon.map;
    host.matRibbon.map = makeCollarTexture(entry.color ?? (next.id === 'kumihimo' ? 0xd63228 : INDIGO));
    host.matRibbon.needsUpdate = true;
    if (old) old.dispose();
    handle.owned.textures = [host.matRibbon.map];
    return true;
  },
  build(host) {
    const { knot, loops } = buildCollarCord(host);
    return {
      objects: [host.collar],
      fields: COLLAR_FIELDS,
      owned: {
        geometries: [knot.geometry, ...loops.map((l) => l.geometry)],
        materials: [host.matRibbon],
        textures: [host.matRibbon.map]
      }
    };
  }
});

export const MICHI_EXTRA_PARTS = [EYE_SHINE, KUMIHIMO_INDIGO];
