// The secret house's sliding door and its brass lock plate. The door group is
// what gameplay slides (secretDoorMesh); the lock plate is a component placed
// into it (lockPlate, hidden once the lock is opened). Gameplay names and the
// anchors come from the layout untouched: this file only draws.
//   secret-door  origin on the floor, centre of the leaf: 2.35 x 2.05 x 0.08 shoji panel (y 0.025..2.075)
//   lock-plate   origin = the door's origin; plate at (0, 1.05, 0.1), shackle above it
// The koushi lattice in front of the door is its own asset (placed by the house).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Bag, bagMat, matOr, meshOf, assemble, seg, tint, worldUV, merge } from './common.js?v=20261113a';

function buildSecretDoor(ctx, layout, p) {
  const { tier, kitMaterials: km } = ctx;
  const W = 2.35, H = 2.05, T = 0.08;
  const paper = p.lit ? matOr(ctx, 'shoji', () => km.paper({ glow: 0.12 })) : matOr(ctx, 'shojiOff', () => km.paper({}));
  const panel = meshOf(new THREE.BoxGeometry(W, H, T).translate(0, 1.05, 0), paper);
  const wood = 0x41302a, bag = new Bag(), z = 0;
  const x0 = W / 2, y0 = 0.025, y1 = 2.075;
  bag.box(0.09, H + 0.05, 0.1, { x: -x0 + 0.045, y: 1.05, z, color: wood });          // stiles
  bag.box(0.09, H + 0.05, 0.1, { x: x0 - 0.045, y: 1.05, z, color: wood });
  bag.box(W, 0.11, 0.1, { y: 0.055, z, color: tint(wood, -0.03) });                      // bottom rail rides the floor track
  bag.box(W, 0.07, 0.1, { y: y1 - 0.01, z, color: wood });                               // top rail
  if (p.kumiko && tier !== 'far') {                                                      // the shoji's fine grid, both faces
    const cols = 4, rows = 6, bars = tier === 'hero' ? 2 : 1;
    for (let s = 0; s < bars; s++) {
      const zz = s ? -T / 2 - 0.006 : T / 2 + 0.006;
      for (let i = 1; i < cols; i++) bag.box(0.016, H - 0.2, 0.012, { x: -x0 + (W * i) / cols, y: 1.05, z: zz, color: tint(wood, 0.05) });
      for (let j = 1; j < rows; j++) bag.box(W - 0.2, 0.016, 0.012, { y: 0.11 + ((H - 0.2) * j) / rows, z: zz, color: tint(wood, 0.05) });
    }
  }
  if (tier !== 'far') {                                                                  // hikite: a lacquered pull recess
    bag.add(new THREE.CylinderGeometry(0.05, 0.05, 0.02, seg(tier, 14, 8, 5)).rotateX(Math.PI / 2), { x: x0 - 0.3, y: 0.95, z: 0.055, color: 0x1f1610 });
  }
  return assemble({ panel, frame: meshOf(bag.geometry(), bagMat(km)) });
}

function buildLockPlate(ctx, layout, p) {
  const { tier, kitMaterials: km } = ctx;
  const gold = matOr(ctx, 'goldAntique', () => km.bronze({ color: 0xb08a3a }));
  const geos = [];
  const add = (g, x = 0, y = 0, z = 0) => { geos.push(worldUV(g.translate(x, y, z), 2)); };
  const rb = (w, h, d, r, s = 1) => new RoundedBoxGeometry(w, h, d, s, Math.min(r, w / 3, h / 3, d / 3));
  add(rb(0.24, 0.3, 0.06, p.bevel, tier === 'hero' ? 2 : 1), 0, 1.05, 0.1);                       // backplate
  // the shackle: the classic half-torus arch on its two posts
  add(new THREE.TorusGeometry(0.09, 0.025, seg(tier, 8, 6, 4), seg(tier, 20, 12, 8), Math.PI), 0, 1.2, 0.1);
  if (tier !== 'far') for (const sx of [-1, 1]) add(new THREE.CylinderGeometry(0.025, 0.025, 0.05, seg(tier, 8, 6, 4)), sx * 0.09, 1.17, 0.1);
  if (p.screws) for (const sx of [-1, 1]) for (const sy of [-1, 1])
    add(new THREE.CylinderGeometry(0.014, 0.014, 0.012, seg(tier, 10, 6, 4)).rotateX(Math.PI / 2), sx * 0.085, 1.05 + sy * 0.12, 0.136);
  const plate = meshOf(merge(geos), gold);
  const bag = new Bag();
  bag.cyl(0.018, 0.012, { x: 0, y: 1.07, z: 0.133, rx: Math.PI / 2, color: 0x16110d });          // keyhole
  bag.box(0.012, 0.05, 0.012, { x: 0, y: 1.03, z: 0.133, color: 0x16110d });
  return assemble({ plate, keyhole: meshOf(bag.geometry(), bagMat(km)) });
}

export const doorAssets = [
  {
    id: 'secret-door', family: 'machiya', lab: 'machiya/door', label: 'Secret sliding door', legacyName: 'Secret Sliding Door',
    params: {
      lit: { type: 'boolean', default: true, label: 'Lit paper' },
      kumiko: { type: 'boolean', default: true, label: 'Shoji grid bars' }
    },
    sample: { index: 0, name: 'Secret Sliding Door', z: 2.52 },
    build: buildSecretDoor
  },
  {
    id: 'lock-plate', family: 'machiya', lab: 'machiya/lock', label: 'Brass lock plate', legacyName: 'Brass Lock Plate',
    params: {
      bevel: { type: 'number', default: 0.012, min: 0.002, max: 0.03, step: 0.002, label: 'Edge bevel' },
      screws: { type: 'boolean', default: true, label: 'Screws' }
    },
    floating: ['plate', 'keyhole'],   // it is screwed to the door leaf (its sibling), 0.9 m up
    sample: { index: 0, name: 'Brass Lock Plate' },
    build: buildLockPlate
  }
];
