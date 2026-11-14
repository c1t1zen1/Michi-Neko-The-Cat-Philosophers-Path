// Focused specimens for the four components that used to live only inside a
// whole-house specimen: namako, tea-bench, secret-door, lock-plate. Each family
// has the game's own part (read-only, through original.js) and a study that
// matches what src/kit/machiya builds. Original code for Three.js r160.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { namakoTextures, texturedMaterial, shojiTextures, woodTextures } from '../../shared/game.js';
import { originalKit } from './original.js';

const std = (color, roughness = .85, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m; };
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function secretHouse() { const kit = originalKit(); kit.buildSecretMachiya(0, 0, 0); return kit; }

export const GAP_BUILDERS = {
  namako(original) {
    const g = new THREE.Group();
    if (original) { originalKit().meshNamakoClassic({ w: 5.4, d: 3.6 }, g); return g; }
    // slate pillows in running bond over lime joints: a lime backing and one instanced tile
    const w = 3.4, h = .92, back = mesh(new THREE.BoxGeometry(w, h, .04), std(0xe9dfc8, .95), 0, .72, 0);
    g.add(back);
    const cw = .3, ch = .15, cols = Math.floor(w / cw), rows = Math.floor(h / ch);
    const tile = new RoundedBoxGeometry(cw - .03, ch - .03, .03, 2, .012), inst = new THREE.InstancedMesh(tile, std(0x2b3036, .6), cols * rows), d = new THREE.Object3D();
    let i = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      d.position.set(-w / 2 + cw / 2 + c * cw + (r % 2 ? cw / 2 - .15 : 0) * .0, .26 + ch / 2 + r * ch, .028); d.updateMatrix(); inst.setMatrixAt(i, d.matrix);
      inst.setColorAt(i++, new THREE.Color().setHSL(.6, .1, .13 + hash(r * 31 + c) * .05));
    }
    inst.castShadow = inst.receiveShadow = true; g.add(inst);
    g.add(mesh(new THREE.BoxGeometry(w + .05, .05, .07), std(0xe9dfc8), 0, .26 + h + .02, 0), mesh(new THREE.BoxGeometry(w + .03, .06, .07), std(0x2e241c), 0, .28, 0));
    return g;
  },
  bench(original) {
    const g = new THREE.Group();
    if (original) { const b = originalKit().meshTeaBenchClassic({}, g); b.position.x = 0; b.position.z = 0; g.children[1].position.set(0, .03, 0); return g; }
    const wood = std(0x4b3427), felt = std(0xb52b22, .95);
    g.add(mesh(new THREE.BoxGeometry(2.25, .06, .95), std(0x35261c), 0, .03, 0), mesh(new THREE.BoxGeometry(2.2, .05, .9), wood, 0, .145, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(.08, .12, .08), wood, sx * 1.05, .09, sz * .4));
    g.add(mesh(new RoundedBoxGeometry(2.2, .27, .9, 3, .07), felt, 0, .285, 0));
    for (const z of [-.3, .3]) g.add(mesh(new THREE.BoxGeometry(2.04, .012, .012), std(0xc84a3e), 0, .419, z));
    return g;
  },
  door(original) {
    if (original) { const k = secretHouse(); const g = new THREE.Group(); const door = k.secretDoorMesh.clone(true); door.position.set(0, 0, 0); g.add(door); return g; }
    const g = new THREE.Group(), wood = std(0x4b3427);
    g.add(mesh(new THREE.BoxGeometry(2.35, 2.05, .08), texturedMaterial(shojiTextures(4, 6), { emissive: 0xffb264, emissiveIntensity: .12, roughness: .85 }), 0, 1.05, 0));
    for (const sx of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(.09, 2.1, .1), wood, sx * 1.13, 1.05, 0));
    g.add(mesh(new THREE.BoxGeometry(2.35, .11, .1), wood, 0, .055, 0), mesh(new THREE.BoxGeometry(2.35, .07, .1), wood, 0, 2.065, 0));
    for (let i = 1; i < 4; i++) g.add(mesh(new THREE.BoxGeometry(.016, 1.85, .012), wood, -1.175 + 2.35 * i / 4, 1.05, .046));
    for (let j = 1; j < 6; j++) g.add(mesh(new THREE.BoxGeometry(2.15, .016, .012), wood, 0, .11 + 1.85 * j / 6, .046));
    g.add(mesh(new THREE.CylinderGeometry(.05, .05, .02, 14).rotateX(Math.PI / 2), std(0x1f1610), .88, .95, .055));
    return g;
  },
  lock(original) {
    if (original) { const k = secretHouse(); const g = new THREE.Group(); g.add(k.lockPlate.clone(true)); return g; }
    const g = new THREE.Group(), gold = std(0xb08a3a, .35, .85);
    g.add(mesh(new RoundedBoxGeometry(.24, .3, .06, 3, .012), gold, 0, 1.05, .1));
    g.add(mesh(new THREE.TorusGeometry(.09, .025, 8, 20, Math.PI), gold, 0, 1.2, .1));
    for (const sx of [-1, 1]) { g.add(mesh(new THREE.CylinderGeometry(.025, .025, .05, 8), gold, sx * .09, 1.17, .1)); for (const sy of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(.014, .014, .012, 10).rotateX(Math.PI / 2), gold, sx * .085, 1.05 + sy * .12, .136)); }
    g.add(mesh(new THREE.CylinderGeometry(.018, .018, .012, 10).rotateX(Math.PI / 2), std(0x16110d), 0, 1.07, .133), mesh(new THREE.BoxGeometry(.012, .05, .012), std(0x16110d), 0, 1.03, .133));
    return g;
  }
};
