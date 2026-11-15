// The camera tests the actual opaque scenery, before material batching loses
// individual bounds. A small BVH keeps queries local along the kilometre route.
import * as THREE from 'three';

export function cameraObstacles(group) {
  group.updateMatrixWorld(true);
  const entries = [];
  group.traverse(mesh => {
    if (!mesh.isMesh || !mesh.geometry.attributes.position.count || mesh.material.transparent || mesh.material.alphaTest > 0) return;
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
    entries.push({ mesh, box, center: box.getCenter(new THREE.Vector3()) });
  });
  function branch(items) {
    const box = new THREE.Box3();
    for (const item of items) box.union(item.box);
    if (items.length <= 12) return { box, items };
    const size = box.getSize(new THREE.Vector3());
    const axis = size.x > size.z ? 'x' : 'z';
    items.sort((a, b) => a.center[axis] - b.center[axis]);
    const mid = items.length >> 1;
    return { box, left: branch(items.slice(0, mid)), right: branch(items.slice(mid)) };
  }
  const tree = branch(entries), raycaster = new THREE.Raycaster();
  const hit = new THREE.Vector3(), hits = [], direction = new THREE.Vector3();
  // Double-sided collision also catches a camera looking out through a roof's
  // underside. Shared render materials remain opaque and unchanged.
  const collisionMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const proxy = new THREE.Mesh(undefined, collisionMaterial);
  let lastHit = null;
  function distance(from, to) {
    lastHit = null;
    const length = direction.subVectors(to, from).length();
    if (length < .001) return length;
    raycaster.set(from, direction.multiplyScalar(1 / length));
    raycaster.near = .10; raycaster.far = length;
    let nearest = length;
    function visit(node) {
      if (!node.box.containsPoint(from) && (!raycaster.ray.intersectBox(node.box, hit) || hit.distanceTo(from) > nearest)) return;
      if (!node.items) { visit(node.left); visit(node.right); return; }
      for (const item of node.items) {
        if (!item.box.containsPoint(from) && (!raycaster.ray.intersectBox(item.box, hit) || hit.distanceTo(from) > nearest)) continue;
        proxy.geometry = item.mesh.geometry;
        proxy.matrixWorld.copy(item.mesh.matrixWorld);
        hits.length = 0; proxy.raycast(raycaster, hits);
        for (const h of hits) if (h.distance < nearest) { nearest = h.distance; lastHit = {box:[item.box.min.toArray(),item.box.max.toArray()],point:h.point.toArray(),type:item.mesh.geometry.type}; }
      }
    }
    visit(tree);
    return nearest;
  }
  return { distance, trace(from,to) { const d=distance(from,to);return {distance:d,hit:lastHit}; }, count: entries.length };
}
