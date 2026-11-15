// pieces/corner.js — Roof Road piece 'corner': a corner house at a turn, with its hip roof and drying deck.
// Lane r2-roofs-streets (BUILD_GUIDE_FABLE.md §12). Moved verbatim from build.js (r1-roof-split).

import * as THREE from 'three';
import { box } from './common.js';

export const corner = (pc, ctx) => {
  const { M } = ctx;
  const g = new THREE.Group();
  g.position.set(pc.cx, 0, pc.cz);
  g.rotation.y = Math.atan2(-pc.tIn.z, pc.tIn.x);        // local x along the incoming leg
  const h = pc.half, eave = pc.eave;
  g.add(box(h * 2, eave, h * 2, M.plasterWarm, 0, eave / 2, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.16, eave, 0.16, M.timber, sx * (h - 0.08), eave / 2, sz * (h - 0.08)));
  // Hip roof under the deck.
  const roofGeo = new THREE.ConeGeometry((h + 0.45) * Math.SQRT2, 1.0, 4, 1);
  roofGeo.rotateY(Math.PI / 4);
  const roof = new THREE.Mesh(roofGeo, M.roof);
  roof.position.y = eave + 0.5;
  g.add(roof);
  // The drying deck the run crosses, posts down to the roof.
  const top = pc.h, dh = pc.deckHalf;
  g.add(box(dh * 2, 0.12, dh * 2, M.timberMed, 0, top - 0.06, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.12, top - eave, 0.12, M.timber, sx * (dh - 0.1), (top + eave) / 2, sz * (dh - 0.1)));
  g.add(box(dh * 2, 0.06, 0.06, M.timber, 0, top + 0.75, dh - 0.05));
  g.add(box(0.06, 0.06, dh * 2, M.timber, dh - 0.05, top + 0.75, 0));
  for (let i = -2; i <= 2; i++) {
    g.add(box(0.05, 0.75, 0.05, M.timber, i * dh / 2.5, top + 0.37, dh - 0.05));
    g.add(box(0.05, 0.75, 0.05, M.timber, dh - 0.05, top + 0.37, i * dh / 2.5));
  }
  // Façades on the two street sides.
  for (const [rx, rz, ry] of [[0, h + 0.01, 0], [h + 0.01, 0, Math.PI / 2]]) {
    const f = box(h * 1.4, 1.5, 0.05, M.koshi, rx, 1.0, rz);
    f.rotation.y = ry;
    g.add(f);
  }
  ctx.add(g);
};
