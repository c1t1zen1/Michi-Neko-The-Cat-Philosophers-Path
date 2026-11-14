import * as THREE from 'three';
import { furMaterial, FUR_PART, outlineMaterial } from '../../cat_shading.js?v=20261107a';

/**
 * The coat: one continuous sculpted body skinned to the skeleton, the tail
 * tube (with its bottlebrush morph), the rigid head, and their ink outline
 * hulls. The tabby pattern, eyes and mouth are painted by the coat shader
 * (src/cat_shading.js) from the palette and the face uniforms.
 *
 * Moved verbatim from src/cat.js (lane c1-rig-split). Functions take the
 * character `host` (the Cat) and set the fields the Cat always had:
 * `palette`, `matBody`, `matHead`, `matTail`, `matEar`, `coat`, `tailMesh`,
 * `headMesh`. Outline hulls are also listed in `host.outlines` (for tiers).
 */

// The four back stripes (body-space z of their centres over the spine):
// withers to saddle, clear of the rump and the tail root
export const STRIPE_Z = [0.165, 0.07, -0.025, -0.12];

/**
 * The coat palette the fur shader reads (its colours are bound by reference:
 * recolouring `palette.fur` recolours the cat). `stripes` is how much of the
 * tabby pattern shows (0 = solid coat).
 */
export function coatPalette(anatomy, { fur, belly, accent, stripes }) {
  const A = anatomy;
  const L = A.landmarks;
  const palette = {
    fur: new THREE.Color(fur),
    belly: new THREE.Color(belly),
    stripe: new THREE.Color(accent),
    stripeAmount: stripes,
    stripeZ: new THREE.Vector4(...STRIPE_Z),
    trunk: new THREE.Vector4(L.chest[1], A.build.girth, A.face.headScale, 5.4)
  };
  // Near-black coats read as black (not brown) under warm light with a
  // cool sheen, and get a dusky nose and inner ear
  const lum = palette.fur.r * 0.3 + palette.fur.g * 0.59 + palette.fur.b * 0.11;
  palette.cool = THREE.MathUtils.clamp((0.16 - lum) / 0.1, 0, 1);
  return palette;
}

/** Fur materials for the body, head (with the face uniforms), tail and ear backs. Needs `host.face`. */
export function coatMaterials(host) {
  host.matBody = furMaterial(host.palette, FUR_PART.body);
  host.matHead = furMaterial(host.palette, FUR_PART.head, host.face);
  host.matTail = furMaterial(host.palette, FUR_PART.tail);
  host.matEar = furMaterial(host.palette, FUR_PART.ear);
}

export function buildCoat(host) {
  const A = host.anatomy;
  const skinned = (geo, mat, outline) => {
    const m = new THREE.SkinnedMesh(geo, mat);
    m.bind(host.skeleton, new THREE.Matrix4());
    m.castShadow = true;
    // Poses reach well beyond the rest silhouette; keep culling generous
    m.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.38, -0.02), 0.85);
    host.group.add(m);
    if (outline) {
      const o = new THREE.SkinnedMesh(geo, outlineMaterial(outline));
      o.bind(host.skeleton, new THREE.Matrix4());
      o.boundingSphere = m.boundingSphere;
      host.group.add(o);
      m.userData.outline = o;
      (host.outlines ||= []).push(o);
    }
    return m;
  };
  host.coat = skinned(A.body, host.matBody, 0.0032);
  host.coat.name = 'Cat Coat';
  host.tailMesh = skinned(A.tail, host.matTail, 0.0028);

  const head = new THREE.Mesh(A.head, host.matHead);
  head.castShadow = true;
  head.name = 'Cat Head';
  host.head.add(head);
  const headOutline = new THREE.Mesh(A.head, outlineMaterial(0.0026));
  host.head.add(headOutline);
  (host.outlines ||= []).push(headOutline);
  host.headMesh = head;
}
