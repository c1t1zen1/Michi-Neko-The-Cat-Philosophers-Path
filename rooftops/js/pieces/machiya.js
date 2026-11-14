// pieces/machiya.js — machiya parts shared by several pieces: the ridge cap
// with onigawara, the hira-iri and tsuma-iri roofs, the street façade and the
// eave details. Used by house, kura, kido, gate, float and the downtown kit.
// Moved verbatim from build.js (r1-roof-split).

import { box, cyl, slope, triangle } from './common.js';

/** Ridge crest + cap, with onigawara blocks at both ends. */
function ridgeCap(g, M, x0, x1, y, z, alongZ = false) {
  const len = Math.abs(x1 - x0);
  const cx = (x0 + x1) / 2;
  const c = cyl(0.13, len + 0.1, M.ridge, alongZ ? 'z' : 'x', 8);
  const crest = alongZ ? box(0.28, 0.1, len, M.ridge) : box(len, 0.1, 0.28, M.ridge);
  if (alongZ) { c.position.set(z, y + 0.08, cx); crest.position.set(z, y + 0.2, cx); }
  else { c.position.set(cx, y + 0.08, z); crest.position.set(cx, y + 0.2, z); }
  g.add(c, crest);
  for (const e of [x0, x1]) {
    const oni = alongZ ? box(0.4, 0.42, 0.14, M.ridge) : box(0.14, 0.42, 0.4, M.ridge);
    if (alongZ) oni.position.set(z, y + 0.22, e); else oni.position.set(e, y + 0.22, z);
    g.add(oni);
  }
}

/** Hira-iri roof: ridge along x, slopes front (+z) and back (−z). */
function hiraRoof(g, M, x0, x1, zFront, zBack, eave, ridgeTop, oh = 0.35) {
  const ridge = ridgeTop - 0.25;                 // the crest tops out at ridgeTop
  const w = x1 - x0 + oh * 2, xm = (x0 + x1) / 2;
  const zR = (zFront + zBack) / 2;
  const rise = ridge - eave;
  slope(g, M.roof, { x: xm, y: eave, z: zFront + 0.55 }, rise, zFront + 0.55 - zR, w, 0);
  slope(g, M.roof, { x: xm, y: eave, z: zBack - 0.55 }, rise, zR - (zBack - 0.55), w, Math.PI);
  ridgeCap(g, M, x0 - oh, x1 + oh, ridge, zR);
  // Ichimonji eave: the dead-straight dark line along the front edge.
  g.add(box(w, 0.07, 0.08, M.ridge, xm, eave - 0.01, zFront + 0.6));
  for (const x of [x0, x1]) {
    g.add(triangle(M.plaster, x, eave - 0.02, zFront, x, ridge - 0.05, zR, x, eave - 0.02, zBack));
    g.add(box(0.08, 0.08, Math.hypot(zFront - zR, rise) + 0.1, M.timber, x, (eave + ridge) / 2, (zFront + zR) / 2));
  }
}

/** Tsuma-iri roof: gable to the camera; slopes fall to −x and +x. */
function tsumaRoof(g, M, x0, x1, zFront, zBack, eave, ridgeTop, oh = 0.25, roofMat = null) {
  const ridge = ridgeTop - 0.06;                 // the slope surface meets the platform line
  const xm = (x0 + x1) / 2;
  const half = (x1 - x0) / 2 + oh;
  const width = zFront - zBack + 1.1;
  const zm = (zFront + zBack) / 2;
  const mat = roofMat || M.roof;
  slope(g, mat, { x: x0 - oh, y: eave, z: zm }, ridge - eave, half, width, -Math.PI / 2);
  slope(g, mat, { x: x1 + oh, y: eave, z: zm }, ridge - eave, half, width, Math.PI / 2);
  ridgeCap(g, M, zBack - 0.55, zFront + 0.55, ridge - 0.2, xm, true);
  // The gable face toward the street, with its timber frame.
  g.add(triangle(M.plaster, x0, eave, zFront + 0.02, x1, eave, zFront + 0.02, xm, ridge - 0.08, zFront + 0.02));
  g.add(box(x1 - x0 + 0.1, 0.1, 0.1, M.timber, xm, eave + 0.02, zFront + 0.05));
  g.add(box(0.1, ridge - eave - 0.1, 0.1, M.timber, xm, (eave + ridge) / 2 - 0.05, zFront + 0.05));
  g.add(triangle(M.plaster, x1, eave, zBack, x0, eave, zBack, xm, ridge - 0.08, zBack));
}

/** A street-facing façade: kōshi, noren, timber posts, mushiko upstairs. */
function facade(g, M, pc, x0, x1, zF, look) {
  const w = x1 - x0, xm = (x0 + x1) / 2;
  const st = pc.storeys;
  const groundTop = st === 2 ? pc.hisashi : pc.eave;
  g.add(box(0.14, groundTop, 0.16, M.timber, x0 + 0.07, groundTop / 2, zF + 0.04));
  g.add(box(0.14, groundTop, 0.16, M.timber, x1 - 0.07, groundTop / 2, zF + 0.04));
  g.add(box(w, 0.12, 0.16, M.timber, xm, Math.min(2.0, groundTop - 0.08), zF + 0.05));
  // Kōshi across most of the front, a door gap with a noren.
  const doorX = x0 + w * (0.25 + 0.5 * look);
  const lw = Math.max(0.6, w - 1.6);
  const lat = box(lw, 1.55, 0.05, M.koshi, xm, 1.0, zF + 0.06);
  g.add(lat);
  if (pc.noren) {
    const n = box(1.1, 0.55, 0.02, M.noren[pc.noren] || M.noren.indigo, doorX, 1.65, zF + 0.16);
    g.add(n);
  }
  g.add(box(w, 0.22, 0.2, M.stone, xm, 0.11, zF + 0.05));     // plinth
  if (st === 2) {
    // Hisashi: the lower lean-to roof over the street.
    slope(g, M.roof, { x: xm, y: pc.hisashi, z: zF + 0.85 }, 0.42, 0.85, w + 0.2, 0);
    g.add(box(w + 0.2, 0.06, 0.07, M.ridge, xm, pc.hisashi - 0.01, zF + 0.9));
    // Second floor: plaster with mushiko-mado.
    const midY = (pc.hisashi + 0.42 + pc.eave) / 2;
    g.add(box(Math.min(w * 0.62, 3.2), 0.55, 0.04, M.mushiko, xm, midY, zF + 0.03));
  }
}

/** Small things that make a machiya eave believable at cat height. */
function streetEaveDetails(g, M, pc, x0, x1, zF, look) {
  const w = x1 - x0;
  const y = pc.storeys === 2 ? pc.hisashi : pc.eave;
  const z = zF + (pc.storeys === 2 ? 0.91 : 0.64);

  // Exposed rafter tails and round kawara end caps make a readable scalloped
  // edge without needing a unique roof mesh for every building.
  for (let x = x0 + 0.18; x < x1 - 0.1; x += 0.42) {
    g.add(box(0.075, 0.075, 0.48, M.timber, x, y - 0.12, z - 0.18));
    const cap = cyl(0.075, 0.075, M.ridge, 'z', 8);
    cap.position.set(x, y - 0.015, z + 0.055);
    g.add(cap);
  }

  // Dark rain gutter, one downpipe and a small shop board. The choice of side
  // is deterministic so an entire block does not repeat as a kit of clones.
  const gutter = cyl(0.045, w + 0.12, M.bronze, 'x', 7);
  gutter.position.set((x0 + x1) / 2, y - 0.08, z + 0.06);
  g.add(gutter);
  const pipeX = look > 0.5 ? x0 + 0.16 : x1 - 0.16;
  const pipe = cyl(0.032, Math.max(0.4, y - 0.26), M.bronze, 'y', 7);
  pipe.position.set(pipeX, (y - 0.26) / 2 + 0.18, zF + 0.16);
  g.add(pipe);
  if (pc.noren && w > 4.2) {
    const sign = box(0.42, 0.92, 0.055, look > 0.5 ? M.lacquer : M.timberMed,
      look > 0.5 ? x1 - 0.58 : x0 + 0.58, Math.min(1.55, y - 0.52), zF + 0.21);
    sign.rotation.z = (look - 0.5) * 0.025;
    g.add(sign);
    for (let i = 0; i < 3; i++) {
      g.add(box(0.22, 0.026, 0.01, M.plasterWarm, sign.position.x,
        sign.position.y + 0.23 - i * 0.22, zF + 0.244));
    }
  }
}

export { ridgeCap, hiraRoof, tsumaRoof, facade, streetEaveDetails };
