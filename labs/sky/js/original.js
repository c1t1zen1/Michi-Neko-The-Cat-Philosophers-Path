// Read-only baseline. Constructing Sky runs the actual current builders;
// without attachRenderer() it does not bake an environment or build a valley.
import * as THREE from 'three';
import { loadSkyModule, loadCountrysideModule } from '../../shared/game.js';
const [{Sky},{Countryside}]=await Promise.all([loadSkyModule(),loadCountrysideModule()]);
const ORIGIN=new THREE.Vector3();
export class OriginalSky {
  constructor(scene) {
    this.sky=new Sky(scene);this.sky.cycleSpeed=0;this.sky.envPaused=true;this.sky.weatherTimer=Infinity;
    this.sky.sun.castShadow=false;this.sky.bounce.visible=false;
    this.sky.dome.renderOrder=-1000;
    this.positions=this.sky.clouds.map(c=>c.position.clone());
  }
  update(state,time) {
    const g=this.sky;
    g.dayTime=state.hour;g.time=time;g._palFrame++;g.updateDayNight(0,ORIGIN);
    for(let i=0;i<g.clouds.length;i++) {
      const c=g.clouds[i],p=this.positions[i];
      c.position.copy(p);c.position.x=((p.x+time*(.6+i*.13)+230)%460+460)%460-230;
    }
    // Original phase palette and sun path stay intact for comparison.
    // Our scene light rig is separate, so these cannot double-light the town.
    g.sun.visible=g.hemi.visible=g.fill.visible=g.bounce.visible=false;
  }
  show({dome,clouds,night=true}) {
    this.sky.dome.visible=dome;
    this.sky.clouds.forEach(c=>c.visible=clouds);
    this.sky.stars.visible=this.sky.moon.visible=night;
  }
}
export function originalHouse(kind='tea') {
  const kit=Object.create(Countryside.prototype);
  Object.assign(kit,{scene:new THREE.Group(),lanterns:[],colliders:[],collectibles:[],ripples:[],nestPos:new THREE.Vector3(),villageHouseColliders:{left:[],right:[]},random:()=>.57,addPlatform(){},addOrientedPlatform(){},addSlopedRoofPlatforms(){},addBuildingWallColliders(){},addCollider(){}});
  kit[{tea:'buildMachiyaTeaHouse',residence:'buildMachiyaResidence',village:'buildVillageHouse'}[kind]](0,0,0);
  kit._mergeStatics();
  const clones=new Map();
  kit.scene.traverse(o=>{
    if(!o.material)return;
    const mats=[].concat(o.material).map(m=>{if(!clones.has(m))clones.set(m,m.clone());return clones.get(m);});
    o.material=mats.length===1?mats[0]:mats;
    if(o.isMesh)o.castShadow=o.receiveShadow=true;
  });
  return kit.scene;
}
