// The corral's warning sign (L4 gap study). The game's sign is a lathe-free
// cylinder, a flat box and an unlit canvas plane. This study keeps the same
// footprint and reading (警告・凶暴な亀, post on the corral's north side) and
// changes how it is made: a bamboo-nodded post with a rain cap, a framed
// board with a painted, lit face, and two cord lashings where the board meets
// the post. src/kit/fences/sign.js is the promoted version.
import * as THREE from 'three';
import { canvas2d, canvasTexture } from '../../shared/craft.js';
import { M } from '../../shared/painted.js';
import { culmGeometry } from '../../shared/bamboo.js';

/** The painted face: cream ground, brown frame, red warning text, a worn edge. */
export function signTexture() {
  const [c, x] = canvas2d(512, 160);
  x.fillStyle = '#e7d0a4'; x.fillRect(0, 0, 512, 160);
  for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(120,86,48,${0.025 + (i % 5) * 0.01})`; x.fillRect((i * 97) % 512, (i * 31) % 160, 90 + (i % 7) * 20, 2); }
  x.strokeStyle = '#5a311d'; x.lineWidth = 12; x.strokeRect(6, 6, 500, 148);
  x.fillStyle = '#7b2018'; x.font = 'bold 52px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('警告・凶暴な亀', 256, 80);
  return canvasTexture(c);
}

export function warningSign() {
  const g = new THREE.Group();
  const post = new THREE.Mesh(culmGeometry({ nodes: 4, radial: 8 }), M.bamboo({ color: 0x8a7242, vcol: true }));
  post.scale.set(0.065, 1.7, 0.065); g.add(post);
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.4, 0.1), M.wood({ base: 0x9b7a4e, dark: 0x5b4228 }));
  board.position.y = 1.3; g.add(board);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.34), M.paper({ color: 0xffffff, map: signTexture(), side: THREE.FrontSide }));
  face.position.set(0, 1.3, -0.052); face.rotation.y = Math.PI; g.add(face);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.1, 8), M.wood({ base: 0x4a3320, dark: 0x2a1a10 }));
  cap.position.y = 1.75; g.add(cap);
  for (const y of [1.18, 1.42]) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.014, 5, 10), M.plain(0x2a2017, { rough: 1 })); l.position.y = y; l.rotation.x = Math.PI / 2; g.add(l); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
