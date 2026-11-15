// Read-only capture rig. Reuses the actual Stage 2 level, meshes and sky.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildLevel } from '../../rooftops/js/level.js';
import { buildWorld } from '../../rooftops/js/build.js';
import { Sky } from '../../rooftops/js/sky.js';
import { platOffset } from '../../rooftops/js/physics.js';
import { alleyDepth } from '../../rooftops/js/alleys.js';

const width = 1200, height = 750;
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('canvas'), antialias: true, preserveDrawingBuffer: true });
renderer.setSize(width,height); renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
const level = buildLevel();
const sky = new Sky(scene, renderer, { shadows: false, reduceMotion: true, lowPower: false, center: new THREE.Vector3(level.center.x,0,level.center.z) });
const world = buildWorld(level, { reduceMotion: true, lowPower: false });
scene.add(world.root);
const camera = new THREE.OrthographicCamera(-16,16,10,-10,12,1500);

function render(frame) {
  const s = (frame.s0+frame.s1)/2;
  const p = level.rail.pointAt(s), n = level.rail.normalAt(s);
  const span = frame.span || (frame.kind === 'turn' ? 24 : frame.s1-frame.s0);
  const viewH = span*height/width;
  camera.left=-span/2; camera.right=span/2;
  camera.top=viewH/2; camera.bottom=-viewH/2;
  const alley = frame.alley == null ? null : level.alleys[frame.alley];
  let focus = new THREE.Vector3(p.x,6,p.z), eye;
  if (alley) {
    const d = alleyDepth(alley,s);
    focus = new THREE.Vector3(p.x+n.x*d,1.8,p.z+n.z*d);
    eye = focus.clone().add(new THREE.Vector3(n.x*14,24,n.z*14));
    camera.near=.1;
  } else {
    eye = focus.clone().add(new THREE.Vector3(n.x*30,3,n.z*30));
    camera.near=17;
  }
  camera.position.copy(eye); camera.lookAt(focus);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  const night=sky.setPhase(.24);
  sky.update(0,12,focus); world.update(12,night,platOffset,level.platforms,s);
  scene.updateMatrixWorld(true);renderer.render(scene,camera);
  return {position:eye.toArray(),focus:focus.toArray(),projection:'orthographic',span,viewHeight:viewH,kind:frame.kind,near:camera.near};
}
render({s0:0,s1:32,kind:'street'});
await renderer.compileAsync(scene,camera);
window.skretchCapture={ready:true,render,level};
