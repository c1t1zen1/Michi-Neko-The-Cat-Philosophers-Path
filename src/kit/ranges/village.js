// distant-village: the six hillside clusters of pastel houses (Phase 2
// v-ranges). Classic was one group per house (about 4 meshes each, 200 draws,
// unmerged); modular bakes every house into ONE vertex-coloured mesh on the
// shared painted kit material plus ONE window mesh. The window material
// (part `windows`) is the emissive one Countryside.update() kindles at dusk
// (villageWindowMat). The foothill forest is a component the runtime places.
import * as THREE from 'three';
import { Bag } from '../craft.js?v=20261113a';

const WALLS = [0xf5e6c8, 0xf2b8c6, 0xfdf3e0, 0xe8d8f0];
const ROOFS = [0x7a8aa8, 0xc87888, 0x88a890, 0x9a86b0, 0xd8a878];

/** A gabled roof: ridge along x, eaves overhang `over`, rise `h`; slopes only (gable ends are the wall colour). */
function gableRoof(w, d, h, over) {
  const hw = w / 2 + over, hd = d / 2 + over;
  const v = [
    -hw, 0, -hd, hw, 0, -hd, hw, h, 0, -hw, h, 0, // back slope  (0..3)
    -hw, 0, hd, hw, 0, hd,                          // front eave (4,5)
  ];
  const tri = [
    // back slope faces +z-ish outward -z
    0, 3, 2, 0, 2, 1,
    // front slope
    4, 5, 2, 4, 2, 3,
    // gable ends
    0, 4, 3, 1, 2, 5
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(v), 3));
  g.setIndex(tri);
  const ng = g.toNonIndexed();
  ng.computeVertexNormals();
  return ng;
}

const PYRAMID = new THREE.ConeGeometry(1, 1, 4);

export function buildDistantVillage(ctx, layout, p) {
  const T = ctx.THREE, tier = ctx.tier;
  const houses = layout.houses || [];
  const bag = new Bag(), win = new Bag();
  const winGeo = new THREE.PlaneGeometry(0.34, 0.42);
  const c = new THREE.Color();
  const detailed = tier !== 'far';
  const gable = gableRoof(1, 1, 1, 0); // unit; scaled per house
  for (const h of houses) {
    const s = h.s, ry = h.ry, pos = { x: h.x, y: h.y, z: h.z };
    const rot = (lx, ly, lz) => { const co = Math.cos(ry), si = Math.sin(ry); return { x: pos.x + lx * co + lz * si, y: pos.y + ly, z: pos.z - lx * si + lz * co }; };
    const wall = c.setHex(WALLS[h.wall]).offsetHSL(p.warmth * 0.03, 0, 0).getHex();
    const roof = ROOFS[h.roof];
    if (detailed) {
      // stone plinth, walls, a gabled roof with eaves; hero adds an engawa strip and a chimney
      let q = rot(0, 0.09 * s, 0);
      bag.box(2.72 * s, 0.18 * s, 2.12 * s, { ...q, ry, color: 0x8a8478 });
      q = rot(0, 0.18 * s + 0.75 * s, 0);
      bag.box(2.6 * s, 1.5 * s, 2.0 * s, { ...q, ry, color: wall });
      q = rot(0, 1.68 * s, 0);
      bag.add(gable, { ...q, ry, sx: (2.6 + 0.5 * p.eave) * s, sy: 1.05 * s * p.pitch, sz: (2.0 + 0.7 * p.eave) * s, color: roof });
      if (tier === 'hero') {
        q = rot(0.2 * s, 0.22 * s, 1.25 * s);
        bag.box(2.2 * s, 0.07 * s, 0.5 * s, { ...q, ry, color: 0x6a4a32 });
        q = rot(-0.8 * s, 1.68 * s + 0.75 * s * p.pitch, 0);
        bag.box(0.26 * s, 0.7 * s, 0.26 * s, { ...q, ry, color: 0x6e665c });
      }
    } else {
      let q = rot(0, 0.8 * s, 0);
      bag.box(2.6 * s, 1.6 * s, 2.0 * s, { ...q, ry, color: wall });
      q = rot(0, 1.6 * s + 0.55 * s, 0);
      bag.add(PYRAMID, { ...q, ry: ry + Math.PI / 4, sx: 2.0 * s, sy: 1.1 * s, sz: 2.0 * s, color: roof });
    }
    for (const [side, wx, wy] of h.windows) {
      const q = rot(wx, wy, side * 1.004 * s);
      win.add(winGeo, { ...q, ry: ry + (side === -1 ? Math.PI : 0), color: 0xffffff });
    }
  }
  const group = new T.Group(), parts = {};
  const material = ctx.kitMaterials.bag({ rough: 0.78, brush: 0.05 });
  const body = bag.mesh(material) || new T.Mesh(new T.BufferGeometry(), material);
  body.castShadow = body.receiveShadow = false;
  group.add(body); parts.body = body;
  // warm hearth windows; Countryside.update() sets emissiveIntensity at dusk
  const windowMat = new T.MeshStandardMaterial({ color: 0x8a5a30, emissive: 0xffb45e, emissiveIntensity: 0.1, roughness: 0.6 });
  const windows = win.mesh(windowMat) || new T.Mesh(new T.BufferGeometry(), windowMat);
  group.add(windows); parts.windows = windows;
  return {
    group, parts, sockets: {}, live: [windows],
    dispose() { windowMat.dispose(); winGeo.dispose(); gable.dispose(); body.geometry.dispose(); windows.geometry.dispose(); }
  };
}
