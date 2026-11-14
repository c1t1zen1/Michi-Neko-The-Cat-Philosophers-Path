// The three thick mountain ranges that close the bay (horizon), built on the
// ranges family's polar height-field (`ridgeRingGeometry`, read-only): one
// ring per range, each keeping only the arc the seat looks over, so the ridge
// is a true surface that curves round the bay instead of a flat card.
// Each range keeps the classic's profile, colour and per-layer material, so the
// summit's haze lerp (horizonRangeMats, userData { baseColor, layer }) drives it
// unchanged; the surface adds a lit crest and a pale ridge line against the
// sky.
import * as THREE from 'three';
import { worldNoise } from '../../textures.js?v=20261113a';
import { ridgeRingGeometry } from '../ranges/landform.js?v=20261113a';
import { clamp01, pick, disposeAll } from './ground.js?v=20261113a';

// [r0, r1] cover the classic slab's depth on the +z axis; the rest is its definition
const RANGES = [
  { r0: 332, r1: 408, base: -14.2, peak: 43, color: 0x4a8195, seed: 41, cx: -58, width: 540 },
  { r0: 430, r1: 520, base: -15.1, peak: 37, color: 0x6497aa, seed: 57, cx: 66, width: 720 },
  { r0: 525, r1: 625, base: -16, peak: 31, color: 0x86b0c0, seed: 73, cx: 0, width: 900 }
];
const ARC = 1.15;      // keep |bearing| < 1.15 rad of the +z axis: the whole bay and its flanks

function profile(def, x, z, relief) {
  const r = Math.hypot(x, z), u = clamp01((r - def.r0) / (def.r1 - def.r0));
  const prof = Math.pow(Math.max(0, Math.sin(u * Math.PI)), 0.58);
  const broad = 0.52 + Math.sin(x * 0.012 + def.seed) * 0.2 + Math.sin(x * 0.029 + def.seed * 0.3) * 0.1;
  const detail = worldNoise(x, def.seed * 9, 0.014, 4, def.seed) * 0.42;
  return { y: def.base + prof * def.peak * relief * Math.max(0.2, broad + detail), detail, prof };
}

export function buildHorizon(ctx, layout, p) {
  const { tier } = ctx;
  const around = pick(tier, 300, 200, 120), rings = pick(tier, 10, 8, 6);
  const group = new THREE.Group(), parts = {}, mats = [], geos = [];
  RANGES.forEach((def, layer) => {
    let lx = NaN, lz = NaN, last = null;     // heightAt then colorAt visit the same (x, z): one noise pass
    const at = (x, z) => { if (x !== lx || z !== lz) { lx = x; lz = z; last = profile(def, x, z, p.relief); } return last; };
    const ring = ridgeRingGeometry({
      r0: def.r0, r1: def.r1, around, rings, grade: 1, floorDrop: 0,
      heightAt: (x, z) => at(x, z).y,
      colorAt: (x, z, h, ny, d, c) => {
        // the classic's neutral shade (the live material colour carries the hue), plus a lit crest on up-facing slopes
        const { detail } = at(x, z);
        const slopeLight = clamp01(0.25 + detail + (x / def.width + 0.5) * 0.28);
        const s = 0.72 + slopeLight * 0.22 + layer * 0.025 + (ny - 0.6) * 0.12 * p.crest;
        c.setRGB(s, s, s);
      }
    });
    // keep only the arc the seat looks over
    const pos = ring.attributes.position, idx = ring.index.array, keep = [];
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i], b = idx[i + 1], c = idx[i + 2];
      const x = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3, z = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3;
      if (Math.abs(Math.atan2(x, z)) < ARC) keep.push(a, b, c);
    }
    ring.setIndex(keep);
    ring.computeBoundingSphere();
    const mat = new THREE.MeshBasicMaterial({ color: def.color, vertexColors: true, fog: false, side: THREE.DoubleSide });
    mat.userData = { baseColor: new THREE.Color(def.color), layer };
    const mesh = new THREE.Mesh(ring, mat);
    mesh.name = `range_${layer + 1}`; mesh.castShadow = mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    group.add(mesh); parts[`range_${layer + 1}`] = mesh;
    mats.push(mat); geos.push(ring);
  });
  return {
    group, parts, sockets: {}, live: [],
    footprint: { colliders: layout.footprint?.colliders || [], platforms: layout.footprint?.platforms || [], exclusions: [], anchors: { horizonRangeMats: mats } },
    dispose() { disposeAll([...geos, ...mats]); }
  };
}
