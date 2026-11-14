// The cat's and the koi's ripple rings (Countryside.spawnRipple recycles them),
// promoted from Lab 02's ripple studies (`ripple`, effects.js rings): each
// ring is a soft travelling wave train (a crisp crest, an echo inside it and
// a faint dimple) instead of a flat white annulus, and the pool registers its
// rings on the family's shared state (sky.js `registerRings` → `uRip`), so the
// kit river's and paddies' own surface bends under every ring.
//
// The pool contract is the classic's, unchanged: `count` rings, parts
// ring_1…ring_N, each its own material (update() writes each ring's opacity),
// laid flat at y = 0.045 in world space (the group stays at the origin),
// hidden until spawned, outer radius 1 × scale, render order 2.
import { ringTexture } from './textures.js?v=20261113a';
import { waterSky } from './sky.js?v=20261113a';

export function buildRipples(ctx, layout, p) {
  const { THREE: T, kitMaterials: km } = ctx;
  const count = Math.max(1, layout.count || 24);
  const group = new T.Group();
  const parts = {}, materials = [];
  const geo = new T.PlaneGeometry(2, 2, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const tex = ringTexture(km);
  const tint = new T.Color(p.color);
  for (let i = 0; i < count; i++) {
    const material = new T.MeshBasicMaterial({
      name: `kit-water:ripple(${p.color.toString(16)})`, color: tint, map: tex,
      transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide
    });
    const ring = new T.Mesh(geo, material);
    ring.position.y = 0.045;
    ring.visible = false;
    ring.renderOrder = 2;
    ring.userData.sharedGeometry = i > 0; // one geometry for the pool; the first ring frees it
    group.add(ring);
    parts[`ring_${i + 1}`] = ring;
    materials.push(material);
  }
  // the kit river and paddies bend their surface under every visible ring
  const rings = Object.values(parts);
  const shared = waterSky(km);
  shared.registerRings(rings);
  return {
    group, parts, sockets: {}, live: rings,
    dispose() { shared.unregisterRings(rings); for (const m of materials) m.dispose(); }
  };
}
