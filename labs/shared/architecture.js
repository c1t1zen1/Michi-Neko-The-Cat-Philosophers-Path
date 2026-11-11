// A closed pitched roof. Ridge runs along X; eaves run along ±Z.
import * as THREE from 'three';

export function gableRoofGeometry(w, d, rise, thickness = 0.12) {
  const g = new THREE.BoxGeometry(w, thickness, d, 1, 1, 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setY(i, rise * (1 - Math.abs(p.getZ(i)) / (d / 2)) + p.getY(i) - thickness / 2);
  }
  g.computeVertexNormals();
  return g;
}

/** Solid attic below a roof, clipped to the walls' footprint. */
export function gableAtticGeometry(w, d, roofD, rise) {
  const g = new THREE.BoxGeometry(w, 1, d, 1, 1, 2), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) > 0 ? rise * (1 - Math.abs(p.getZ(i)) / (roofD / 2)) - 0.11 : -0.02);
  g.computeVertexNormals();
  return g;
}
