import * as THREE from 'three';
import { tatami,screen,vessel,contact,disposeGroup } from './build.js';import { SPECIMENS,SPECIMEN_CRAFTS } from './specimens.js';

export const CRAFTS={...SPECIMEN_CRAFTS,
  tatami:{jp:'畳 / TATAMI',title:'A little field, woven.',description:'A traditional mat is a compressed straw core, a woven rush surface, and fabric borders. This specimen follows the Kyoto 191 × 95.5 cm module. The weave changes direction when the mat turns.',slider:'Pull the layers apart',finish:'The rush surface',options:[['fresh','Fresh igusa'],['aged','Aged straw'],['gold','Sun-gold rush']],key:['Toko — the compressed straw core.','Omote — rush woven across warp yarns.','Heri — brocade along the two long edges.'],code:"const mat = tatami(root, .955, 1.91, 'fresh');\nmat.explode(amount);\n// CanvasTexture colour: SRGBColorSpace\n// Separate scalar bump: NoColorSpace\n// A real 5.5 cm core, surface and heri."},
  shoji:{jp:'障子 / SHOJI',title:'A wall that holds the light.',description:'The outer frame runs in grooves. Kumiko subdivides it into a fine grid, and warm, fibrous paper softens the view. Slide the specimen apart to see the construction; try the lower viewing pane, a painted fusuma, or an airy reed screen.',slider:'Separate frame, lattice & paper',finish:'The partition',options:[['shoji','Shoji · regular grid'],['fine','Shoji · fine kumiko'],['yukimi','Yukimi · lower viewing pane'],['fusuma','Fusuma · painted opaque panel'],['sudare','Summer · reed screen']],key:['Outer timber frame and rails.','Thin geometric kumiko, built as real laths.','Paper, glass, painted panel, or open reeds.'],code:"const panel = screen(root, 'yukimi', 'cedar');\npanel.explode(amount);\n// Kumiko is geometry, so it casts shadows.\n// Paper glow + branch wash approximate diffusion.\n// Opacity is not measured light transmission."},
  pottery:{jp:'器 / UTSUWA',title:'A bowl has an inside, too.',description:'A ceramic profile travels from the foot to the rim and back down the inside. Revolve it, introduce a tiny irregularity, then paint a 256 px glaze. Open the section to look into the wall of the bowl.',slider:'Open a section through the vessel',finish:'The glaze',options:[['cream','Ivory · tea bowl'],['dark','Black · Raku-inspired bowl'],['indigo','Indigo · painted bowl'],['rust','Iron red · tea cup'],['sage','Celadon-inspired · flower vase']],key:['Foot ring and a weighted base.','Continuous outer wall, lip, and inner wall.','A hand-shaped rim and restrained glaze variation.'],code:"const points = profile.map(([r,y]) =>\n  new THREE.Vector2(r, y));\nconst geometry = new THREE.LatheGeometry(points, 28);\n// Profile includes the inner wall and foot.\n// A small radial wobble avoids a factory-perfect rim."}
};

export class CraftBench {
  constructor(){
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#faf9f4');
    this.camera=new THREE.PerspectiveCamera(35,1,.01,30);this.camera.position.set(3,2.3,3.7);this.camera.lookAt(0,.5,0);
    this.scene.add(new THREE.HemisphereLight(0xffeed4,0x82866c,2.4));const sun=new THREE.DirectionalLight(0xffe5b8,2.4);sun.position.set(3,5,4);this.scene.add(sun);
    this.root=new THREE.Group();this.scene.add(this.root);this.value=.65;this.type='tatami';this.finish='fresh';this.set('tatami','fresh');
  }
  set(type,finish){
    disposeGroup(this.root);this.root.clear();this.root.position.set(0,0,0);this.root.rotation.set(0,0,0);this.type=type;this.finish=finish;
    if(type==='tatami'){this.specimen=tatami(this.root,.955,1.91,finish);contact(this.root,0,-.008,0,2,2.8,.5);this.camera.position.set(2.8,2.4,3.5);this.camera.lookAt(0,.45,0);}
    if(type==='shoji'){this.specimen=screen(this.root,finish,'cedar',.955,1.85);this.camera.position.set(2.5,1.9,3.1);this.camera.lookAt(0,.95,0);}
    if(type==='pottery'){this.specimen=vessel(this.root,finish==='sage'?'vase':finish==='rust'?'cup':'bowl',finish,5);this.camera.position.set(2,1.8,2.4);this.camera.lookAt(0,.35,0);contact(this.root,0,-.006,0,2,2,.5);}
    if(SPECIMENS[type]){const sp=SPECIMENS[type];this.specimen=sp.build(this.root,finish);this.camera.position.set(...sp.cam);this.camera.lookAt(...sp.look);contact(this.root,0,-.006,0,2.6,2.6,.45);}
    this.explode(this.value);
  }
  explode(v){this.value=v;if(this.type==='pottery'){const g=this.specimen.geometry;g.setDrawRange(0,Math.floor(g.index.count*(1-v*.43)/3)*3);this.root.rotation.y=-v*1.7;}else this.specimen.explode(v);}
  frame(dt,t,still){if(this.type==='tatami'&&!still)this.root.rotation.y=Math.sin(t*.12)*.12;}
}
