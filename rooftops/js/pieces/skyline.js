// pieces/skyline.js — what lies beyond the run: the instanced sea of distant
// roofs and the skyline pagodas. Lane r4-festival (BUILD_GUIDE_FABLE.md §12).
// Moved verbatim from build.js (r1-roof-split).

import * as THREE from 'three';
import { box, cyl } from './common.js';
import { hash1 } from '../level.js';

/** A sea of low roofs around the route, out to the hills (instanced). */
function buildDistantCity(level, M) {
  const rail = level.rail;
  const houseGeo = new THREE.BoxGeometry(1, 1, 1);
  houseGeo.translate(0, 0.5, 0);
  // Gabled machiya silhouettes, with enough pitch to read as tiled Kyoto
  // roofs at distance instead of almost-flat pyramids on bare cubes.
  const roofGeo = new THREE.BufferGeometry();
  const rp = [], ru = [];
  const quad = (a, b, c, d) => { for (const p of [a,b,c,a,c,d]) { rp.push(...p); ru.push(p[2] * 4, p[0] * 4); } };
  quad([-.57,0,-.6],[-.57,0,.6],[0,.8,.6],[0,.8,-.6]);
  quad([0,.8,-.6],[0,.8,.6],[.57,0,.6],[.57,0,-.6]);
  quad([-.57,0,.6],[.57,0,.6],[0,.8,.6],[0,.8,.6]);
  quad([.57,0,-.6],[-.57,0,-.6],[0,.8,-.6],[0,.8,-.6]);
  roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
  roofGeo.setAttribute('uv', new THREE.Float32BufferAttribute(ru, 2)); roofGeo.computeVertexNormals();
  const pts = [];
  // Distance from the rail polyline (cheap: sample the rail every 2 m).
  const samples = [];
  for (let s = 0; s <= level.length; s += 2) samples.push(rail.pointAt(s));
  const nearRail = (x, z, r) => samples.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < r * r);
  for (let x = (level.bounds?.x0 ?? -230) - 80; x <= (level.bounds?.x1 ?? 200) + 80; x += 7) {
    for (let z = (level.bounds?.z0 ?? -260) - 80; z <= (level.bounds?.z1 ?? 150) + 80; z += 7) {
      const h = hash1(x * 0.37 + z * 1.71);
      const jx = x + (h - 0.5) * 3, jz = z + (hash1(x + z * 3.3) - 0.5) * 3;
      if (nearRail(jx, jz, 14)) continue;
      pts.push([jx, jz, h]);
    }
  }
  // Low dark walls under big roofs: from the run it should read as a sea of
  // kawara, not a field of white boxes.
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x7a6a58, roughness: 0.95 });
  const walls = new THREE.InstancedMesh(houseGeo, wallMat, pts.length);
  const roofs = new THREE.InstancedMesh(roofGeo, M.roof, pts.length);
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  pts.forEach(([x, z, h], i) => {
    const w = 4.5 + h * 3, d = 5 + hash1(h * 91) * 4, hh = 1.7 + (h > 0.86 ? 1.5 : 0) + hash1(h * 7) * 0.7;
    dummy.position.set(x, 0, z);
    dummy.rotation.y = h > .5 ? 0 : Math.PI / 2;
    dummy.scale.set(w, hh, d);
    dummy.updateMatrix();
    walls.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, hh, z);
    dummy.scale.set(w * 1.05, 1.3 + h * 0.6, d * 1.05);
    dummy.updateMatrix();
    roofs.setMatrixAt(i, dummy.matrix);
    const k = hash1(h * 53.1);
    roofs.setColorAt(i, tint.setRGB(0.62 + k * 0.25, 0.64 + k * 0.25, 0.68 + k * 0.25));
    walls.setColorAt(i, tint.setRGB(0.85 + k * 0.3, 0.8 + k * 0.3, 0.74 + k * 0.3));
  });
  walls.receiveShadow = true;
  roofs.receiveShadow = true;
  const g = new THREE.Group();
  g.add(walls, roofs);
  return g;
}

/** A five-storey pagoda silhouette (for the skyline). */
function buildPagoda(M, x, z, scale = 1) {
  const g = new THREE.Group();
  let y = 0;
  for (let i = 0; i < 5; i++) {
    const w = (6.2 - i * 0.7) * scale;
    g.add(box(w * 0.62, 3.2 * scale, w * 0.62, M.timber, 0, y + 1.6 * scale, 0));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.85, 1.1 * scale, 4), M.roof);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = y + 3.4 * scale;
    g.add(roof);
    y += 3.6 * scale;
  }
  const spire = cyl(0.25 * scale, 9 * scale, M.bronze, 'y', 6);
  spire.position.y = y + 4.2 * scale;
  g.add(spire);
  g.position.set(x, 0, z);
  return g;
}

export { buildDistantCity, buildPagoda };
