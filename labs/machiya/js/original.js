// Read-only adapter: run the actual game's builders, without building a valley
// or registering gameplay state. Clone materials before lab lighting touches them.
import * as THREE from 'three';
import { loadCountrysideModule } from '../../shared/game.js';
const { Countryside } = await loadCountrysideModule();
export function originalKit() {
  const kit = Object.create(Countryside.prototype);
  Object.assign(kit, {
    scene: new THREE.Group(), lanterns: [], colliders: [], nestPos: new THREE.Vector3(),
    villageHouseColliders: { left: [], right: [] }, random: () => 0.57,
    addPlatform() {}, addOrientedPlatform() {}, addSlopedRoofPlatforms() {},
    addBuildingWallColliders() {}, addCollider() {}
  });
  return kit;
}
export function originalHouse(kind = 'tea') {
  const kit = originalKit();
  const method = { tea: 'buildMachiyaTeaHouse', residence: 'buildMachiyaResidence', secret: 'buildSecretMachiya', village: 'buildVillageHouse' }[kind];
  kit[method](0, 0, 0);
  const group = kit.scene;
  const materials = new Map();
  group.traverse(o => {
    if (!o.material) return;
    o.material = [].concat(o.material).map(m => {
      if (!materials.has(m)) materials.set(m, m.clone());
      return materials.get(m);
    });
    if (o.material.length === 1) o.material = o.material[0];
    o.userData.original = true;
  });
  return { group, original: true, update() {} };
}
// Real game components, used as the first specimen in every part family.
export function originalPart(part) {
  const kit = originalKit(), root = new THREE.Group();
  if (part === 'roof') root.add(kit.createKawaraRoof(4.8, 3.4, 1.0, 0.5));
  else if (part === 'lattice' || part === 'window') root.add(kit.createKoushi(3.0, part === 'window' ? 1 : 1.7, part === 'window' ? 14 : 11));
  else if (part === 'deck') root.add(kit.createEngawa(4.6, 1.4, 0.42));
  else if (part === 'lantern') kit.createChochinLantern(0, 0.8, 0, root);
  else {
    const b = originalHouse('tea');
    const children = b.group.children[0].children;
    // Ground wall, exact corner posts/eave beam, and single-piece noren.
    const chosen = part === 'wall' ? [children[0]] : part === 'frame' ? children.slice(2, 7) : [children[10]];
    for (const child of chosen) root.add(child.clone(true));
    if (part === 'cloth') root.children[0].position.set(0, 0, 0);
  }
  // No original inuyarai exists in the valley house builders; the bamboo
  // family's baseline is the unadorned wall, labelled explicitly in the UI.
  return root;
}
