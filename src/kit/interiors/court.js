// The courtyard's two surfaces as their own ids (wave 2.2b): the raked gravel
// court and the timber boundary wall. Same numbers as the classic boxes
// (src/interior.js meshGravelClassic / meshCourtyardWallClassic), with the
// detail the classic slabs lack. tea-interior builds its own inline copy;
// these are for a mixed room (classic or kit frame around them).
import * as THREE from 'three';
import { Bag } from '../craft.js?v=20261113a';
import { TexBag, roomMats, bagMesh, groupOf, tierFlags } from './common.js?v=20261113a';

/**
 * The raked gravel court. Origin at the court's centre, top surface at y 0
 * (the classic box is centred at -0.05, 0.1 thick). Ridges run along z and part
 * round each of the three stones, which sit in rings of raked gravel.
 */
export function buildGravel(ctx, L = {}, tier = 'hero', o = {}) {
  const { hi, far } = tierFlags(tier), m = roomMats(ctx), rng = ctx.rng;
  const [W, T, D] = L.size || [4.0, 0.1, 6.0];
  const bed = new TexBag(m.plaster).box(W, T, D, 0, -T / 2, 0);
  const rake = new Bag(), stones = new Bag();
  // stones: (x, z, size) in court space (the room-space picks 6.1/8.3/8.6 minus the court centre 7.2)
  const spots = [[-1.1, 1.7, 0.2], [1.1, 1.9, 0.16], [1.4, -2.2, 0.22]];
  const shades = [0x7f857b, 0x8a8c80, 0x717a72];
  const ring = (s) => s * 2.6;
  spots.forEach(([x, z, s], i) => {
    const g = new THREE.DodecahedronGeometry(s, hi ? 1 : 0);
    stones.add(g, { x, y: 0.03, z, sy: 0.55, ry: rng() * 3, color: shades[i] });
    if (!far) stones.add(new THREE.DodecahedronGeometry(s * 0.42, 0), { x: x + s * 1.25, y: 0.012, z: z + s * 0.5, sy: 0.6, ry: rng() * 3, color: 0x9a9d90 });
    if (hi) stones.add(new THREE.SphereGeometry(s * 0.62, 8, 5), { x, y: 0.1 * s + 0.045, z, sy: 0.22, color: 0x587a3a });   // a cap of moss
  });
  if (!far) {
    const lines = o.rakes || (hi ? 24 : 12), step = (W - 0.4) / lines;
    for (let k = 0; k < lines; k++) {
      const x = -W / 2 + 0.2 + k * step + step / 2;
      // the ridge is cut where a stone's ring crosses it
      const cuts = spots.filter(([sx, , s]) => Math.abs(x - sx) < ring(s)).map(([sx, sz, s]) => { const h = Math.sqrt(ring(s) ** 2 - (x - sx) ** 2); return [sz - h, sz + h]; }).sort((a, b) => a[0] - b[0]);
      let z0 = -D / 2 + 0.2;
      const z1 = D / 2 - 0.2;
      for (const [a, b] of cuts) { if (a - z0 > 0.05) rake.box(0.035, 0.012, a - z0, { x, y: 0.005, z: (z0 + a) / 2, color: 0xb9b3a0 }); z0 = Math.max(z0, b); }
      if (z1 - z0 > 0.05) rake.box(0.035, 0.012, z1 - z0, { x, y: 0.005, z: (z0 + z1) / 2, color: 0xb9b3a0 });
    }
    for (const [x, z, s] of spots) {                                              // rings round each stone
      for (let r = 0; r < (hi ? 3 : 1); r++) {
        const rad = s * (1.5 + r * 0.55);
        rake.add(new THREE.TorusGeometry(rad, 0.014, 4, hi ? 28 : 14), { x, y: 0.007, z, rx: Math.PI / 2, color: 0xb9b3a0 });
      }
    }
    const e = 0.012;                                                              // a darker edge board where the gravel meets the deck
    rake.box(e, 0.02, D, { x: -W / 2 + e / 2, y: 0.002, color: 0x4a2f1a });
  }
  return groupOf('Courtyard Gravel', bed.mesh('gravel'), bagMesh(rake, m.bag, 'rake'), bagMesh(stones, m.bag, 'stones'));
}

/**
 * The courtyard's three timber walls in room-frame coordinates (the classic
 * boxes: the far wall at x 9.2, the side walls at z +-3.2). Adds a stone plinth,
 * two nuki rails, a tiled cap, and battens on the court faces.
 */
export function buildCourtWall(ctx, L = {}, tier = 'hero') {
  const { hi, far } = tierFlags(tier), m = roomMats(ctx);
  const wall = new TexBag(m.timber).box(0.3, 3.2, 6.4, 9.2, 1.6, 0).box(5.0, 3.2, 0.3, 6.8, 1.6, -3.2).box(5.0, 3.2, 0.3, 6.8, 1.6, 3.2);
  const trim = new Bag(), cap = new Bag();
  const dark = 0x2e1d12, mid = 0x4a3220;
  cap.box(0.5, 0.12, 6.7, { x: 9.2, y: 3.26, color: 0x4a5058 });                    // the tiled coping (kawara grey)
  for (const s of [-1, 1]) cap.box(5.3, 0.12, 0.5, { x: 6.7, y: 3.26, z: s * 3.2, color: 0x4a5058 });
  if (!far) {
    cap.box(0.56, 0.04, 6.76, { x: 9.2, y: 3.34, color: 0x2f353b });                 // the ridge row
    for (const s of [-1, 1]) cap.box(5.36, 0.04, 0.56, { x: 6.7, y: 3.34, z: s * 3.2, color: 0x2f353b });
    trim.box(0.42, 0.22, 6.5, { x: 9.2, y: 0.11, color: 0x6c685e });                  // stone plinth
    for (const s of [-1, 1]) trim.box(5.1, 0.22, 0.42, { x: 6.8, y: 0.11, z: s * 3.2, color: 0x6c685e });
    for (const y of [1.15, 2.4]) {                                                    // nuki rails on the court faces
      trim.box(0.06, 0.12, 6.3, { x: 9.02, y, color: mid });
      for (const s of [-1, 1]) trim.box(4.9, 0.12, 0.06, { x: 6.8, y, z: s * 3.02, color: mid });
    }
  }
  if (hi) for (let i = 0; i < 11; i++) {                                              // battens on the wall faces
    trim.box(0.03, 3.2, 0.07, { x: 9.035, y: 1.6, z: -3.0 + i * 0.6, color: dark });
    if (i < 8) for (const s of [-1, 1]) trim.box(0.07, 3.2, 0.03, { x: 4.8 + i * 0.6, y: 1.6, z: s * 3.035, color: dark });
  }
  return groupOf('Courtyard Wall', wall.mesh('wall'), bagMesh(trim, m.bag, 'trim'), bagMesh(cap, m.bag, 'cap'));
}
