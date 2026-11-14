// corral-sign (the corral's warning sign, a component of 'corral'): a knotted
// bamboo post with a rain cap, a framed board, a painted lit face and two cord
// lashings. Promoted from labs/fences/js/sign.js. Origin at the ground in
// front of the north fence; the face reads from -z like the classic sign.
import { defineAsset } from '../contract.js?v=20261113a';
import { culmGeometry, knotGeometry } from './culm.js?v=20261113a';
import { canvas2d, canvasTexture } from '../craft.js?v=20261113a';

let faceMap = null;   // one canvas texture for the page (shared: never disposed by an instance)
function faceTexture(THREE) {
  if (faceMap && faceMap.userData.rev === THREE.REVISION) return faceMap;
  const [c, x] = canvas2d(512, 160);
  x.fillStyle = '#e7d0a4'; x.fillRect(0, 0, 512, 160);
  for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(120,86,48,${0.025 + (i % 5) * 0.01})`; x.fillRect((i * 97) % 512, (i * 31) % 160, 90 + (i % 7) * 20, 2); }
  x.strokeStyle = '#5a311d'; x.lineWidth = 12; x.strokeRect(6, 6, 500, 148);
  x.fillStyle = '#7b2018'; x.font = 'bold 52px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('警告・凶暴な亀', 256, 80);
  faceMap = canvasTexture(c);
  faceMap.userData.rev = THREE.REVISION;
  return faceMap;
}

export const corralSign = defineAsset({
  id: 'corral-sign', family: 'fences', lab: 'fences/corral-sign',
  label: 'Corral warning sign',
  tiers: ['hero', 'mid', 'far'],
  legacyName: 'Corral Warning Sign',
  params: {
    height: { type: 'number', default: 1.7, min: 1.4, max: 2, step: 0.05, label: 'Post height' },
    cap: { type: 'boolean', default: true, label: 'Rain cap' }
  },
  sample: { name: 'Corral Warning Sign', footprint: { colliders: [], platforms: [], exclusions: [], waterRects: [], anchors: {}, lists: {} } },
  build(ctx, layout, params) {
    const { THREE, kitMaterials: km, tier } = ctx;
    const group = new THREE.Group();
    const H = params.height, boardY = H - 0.4;
    const darkWood = km.wood({ base: 0x4a3320, dark: 0x2a1a10 });
    const boardWood = tier === 'far' ? darkWood : km.wood({ base: 0x9b7a4e, dark: 0x5b4228 });

    const post = new THREE.Mesh(culmGeometry(THREE, tier), (tier === 'far' ? darkWood : km.bamboo({ color: 0x8a7242, vcol: true, rough: 0.5 })));
    post.scale.set(0.065, H, 0.065);
    post.userData.sharedGeometry = true;
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.4, 0.1), boardWood);
    board.position.y = boardY;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.34), km.paper({ color: 0xffffff, map: faceTexture(THREE), side: THREE.FrontSide }));
    face.position.set(0, boardY, -0.052);
    face.rotation.y = Math.PI;
    const parts = { post, board, face };
    group.add(post, board, face);
    if (params.cap && tier !== 'far') {
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.1, tier === 'hero' ? 8 : 5), darkWood);
      cap.position.y = H + 0.05;
      group.add(cap); parts.cap = cap;
    }
    if (tier === 'hero') {
      const kg = knotGeometry(THREE, tier), kmat = km.plain(0x2a2017, { rough: 1 });
      const lash = new THREE.InstancedMesh(kg, kmat, 2);
      const o = new THREE.Object3D();
      [boardY - 0.12, boardY + 0.12].forEach((y, i) => { o.position.set(0, y, 0); o.rotation.set(Math.PI / 2, 0, 0); o.scale.setScalar(0.075); o.updateMatrix(); lash.setMatrixAt(i, o.matrix); });
      lash.instanceMatrix.needsUpdate = true;
      lash.userData.sharedGeometry = true;
      group.add(lash); parts.lashing = lash;
    }
    group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return { group, parts };
  }
});
