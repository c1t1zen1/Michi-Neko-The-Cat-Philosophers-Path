// Scenery lab-swaps: the board's old cone-and-cylinder scenery is replaced by
// the real builders developed in the Labs — game foliage canopies, the ranges
// frieze/ridge shader, countryside houses, torii, tōrō, bamboo, the parametric
// pagoda, a taiko river bridge, the pond-water shader and kit butterflies.
// Everything is instanced or merged so draw calls stay flat at 55 km/h.
import * as THREE from 'three';
import {M} from '../../labs/shared/painted.js';
import {rng as mulberry32} from '../../labs/shared/craft.js';
import {HASH, NOISE} from '../../labs/shared/glsl.js';
import {mergeTemplate} from './assets.js';
import {friezeGeometry} from '../../labs/ranges/js/ridge.js';
import {worldNoise} from '../../labs/ranges/js/profiles.js';
import {Air, CloudField} from '../../labs/ranges/js/air.js';
import {heianBand, suyariBand} from '../../labs/ranges/js/kasumi.js';
import {culmGeometry, bambooColor} from '../../labs/shared/bamboo.js';
import {bridgeMaterials, buildBridge} from '../../labs/water/js/bridges.js';
import {toro} from '../../labs/lanterns/js/kit.js';
import {buildPagoda} from '../../labs/pagoda/js/pagoda.js';
import {butterfly} from '../../labs/critters/js/kit.js';
import {loadFoliageModule, loadCountrysideModule} from '../../labs/shared/game.js';

const mod=(a,b)=>((a%b)+b)%b;
const _d=new THREE.Object3D();
const _m=new THREE.Matrix4();

/** The shared game modules this board borrows (read-only bridges). */
export function loadSceneryModules(){
  return Promise.all([loadFoliageModule(),loadCountrysideModule()])
    .then(([F,cside])=>({F,Countryside:cside.Countryside}));
}

/* ---------------------------------------------------------------- trees */

const FOREST_GREENS=[0x2f4f1c,0x3f6626,0x5a8536,0x7aa348];
export const SAKURA_PINKS=[0xe8a7b8,0xf2bcc9,0xf7d4dc,0xfbe6ea];

/** Instanced game-canopy forest for the corridor — the valley's own tree,
 *  built with the ranges lab's wall recipe (masses style, per-variant sets
 *  with a slot → (variant, index) map). Same set(i,x,y,z,scale,rot)/commit()
 *  contract as instancedAsset. */
export function corridorForest(F,count,{colors=FOREST_GREENS,seed=5,parent,scale=1}={}){
  const r=mulberry32(seed);
  const leafMat=F.createFoliageMaterial({sss:.3,wind:.65,mottle:.26,bump:.45,vertexColors:true,massMap:F.leafMassTexture('leaf'),massScale:1/1.2,ragged:1});
  const barkMat=M.bark({base:0x6a4b35,dark:0x2c1b12});
  const assign=[],per=[0,0,0,0];
  for(let i=0;i<count;i++){const v=(r()*4)|0;assign.push(v);per[v]++;}
  const sets=[];
  for(let v=0;v<4;v++){
    const built=F.buildCanopy(mulberry32(seed*97+v*31),{
      style:'masses',scale:1,trunkH:2.2,trunkR:.15,primaries:5,tilt:.74+v*.07,tiltVar:.22,
      droop:-.02,bend:.12,branchLen:1.5,secondaries:2,twigs:false,crownFill:3,
      colors,clumpR:.5,tuftsPerClump:[3,3,2],tuftFlat:.74,lump:.4,seed:seed+v*7});
    const set={tufts:new THREE.InstancedMesh(built.tufts,leafMat,per[v]),branches:new THREE.InstancedMesh(built.branches,barkMat,per[v])};
    for(const m of [set.tufts,set.branches]){m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;m.count=per[v];parent.add(m);}
    sets.push(set);
  }
  const trunkGeo=new THREE.CylinderGeometry(.11,.34,2.6,7);trunkGeo.translate(0,1.15,0);
  const trunks=new THREE.InstancedMesh(trunkGeo,barkMat,count);
  trunks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);trunks.frustumCulled=false;parent.add(trunks);
  const cursors=[0,0,0,0],slotIdx=assign.map(v=>cursors[v]++);
  const col=new THREE.Color();
  sets.forEach((s,v)=>{for(let j=0;j<per[v];j++){col.setRGB(.84+r()*.28,.87+r()*.26,.8+r()*.28);s.tufts.setColorAt(j,col);}if(s.tufts.instanceColor)s.tufts.instanceColor.needsUpdate=true;});
  const batches=sets.flatMap(s=>[s.tufts,s.branches]).concat([trunks]).map(mesh=>({mesh}));
  return {count,batches,
    set(i,x,y,z,s=1,rot=0){
      _d.position.set(x,y,z);_d.rotation.set(0,rot,0);_d.scale.setScalar(s*scale);_d.updateMatrix();
      const set=sets[assign[i]],j=slotIdx[i];
      set.tufts.setMatrixAt(j,_d.matrix);set.branches.setMatrixAt(j,_d.matrix);
      trunks.setMatrixAt(i,_d.matrix);
    },
    commit(){for(const b of batches)b.mesh.instanceMatrix.needsUpdate=true;}};
}

/** One free-standing canopy tree (overpass sakura). */
export function canopyTree(F,{colors=SAKURA_PINKS,seed=7,scale=1.4}={}){
  const built=F.buildCanopy(mulberry32(seed),{style:'masses',scale,trunkH:2.6,trunkR:.17,primaries:6,tilt:.82,tiltVar:.2,
    bend:.14,branchLen:1.6,secondaries:2,twigs:false,crownFill:4,colors,clumpR:.55,
    tuftsPerClump:[3,3,2],tuftFlat:.78,lump:.42,seed});
  const leafMat=F.createFoliageMaterial({sss:.4,wind:.5,mottle:.2,bump:.4,vertexColors:true,massMap:F.leafMassTexture('leaf'),massScale:1/1.1,ragged:1});
  const barkMat=M.bark({base:0x584238,dark:0x2c1b12});
  const g=new THREE.Group();
  g.add(new THREE.Mesh(built.tufts,leafMat),new THREE.Mesh(built.branches,barkMat));
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.13,.4,3.2,7),barkMat);
  trunk.position.y=1.5;g.add(trunk);
  return g;
}

/* ------------------------------------------------------------- ranges */

const FRIEZE_SPAN=2300;          // profile period (world z), also scroll wrap
const FRIEZE_W=FRIEZE_SPAN*2;    // two profile periods per frieze

/** Circle-sampled ridge profile: every term orbits an integer number of
 *  times across the frieze width, so the silhouette is periodic and the
 *  scroll wrap is invisible. */
function circleProfile(seed,amp,base){
  return (u)=>{
    const a=u*Math.PI*4,b=u*Math.PI*12; // 2 and 6 periods → period = FRIEZE_SPAN
    const n=worldNoise(Math.cos(a)*1.6+seed*.37,Math.sin(a)*1.6-seed*.21,.5,4,seed);
    const m=worldNoise(Math.cos(b)*3.1-seed*.13,Math.sin(b)*3.1,.55,3,seed+31);
    return Math.max(.05,base+amp*(n*.72+m*.42-.32));
  };
}

const LAYERS=[
  {x:215,h:62, dist:300,foot:0x3d6238,crown:0x568047,rock:0x767468,treed:1.4,rocky:.08,footMist:.10,fogK:.42,rate:.16,seed:11,kasumi:'suyari'},
  {x:395,h:135,dist:520,foot:0x3f5c49,crown:0x607c70,rock:0x6f7080,treed:.8, rocky:.45,footMist:.24,fogK:.8, rate:.095,seed:23,kasumi:'heian'},
  {x:660,h:235,dist:840,foot:0x556a80,crown:0x7f8fa6,rock:0x8c92a8,treed:.3, rocky:.7, footMist:.4, fogK:1.15,rate:.055,seed:37,kasumi:'heian'}
];

export class Ranges{
  constructor(parent,{low=false}={}){
    this.group=new THREE.Group();parent.add(this.group);
    this.right=new THREE.Group();this.group.add(this.right);
    this.field=new CloudField({seed:9});
    this.air=new Air(this.field);
    this.field.scale=this.air.u.uCloudScale.value=1/1900;
    this.layers=[];
    for(const side of[-1,1])for(const L of LAYERS){
      const geo=friezeGeometry(circleProfile(L.seed+side*3,.95,.12),{width:FRIEZE_W,height:L.h,depth:L.h*.42,dip:.14,cols:low?110:170,rows:6,jitter:.07,seed:L.seed+side});
      const mat=this.air.rangeMaterial({dist:L.dist,foot:L.foot,crown:L.crown,rock:L.rock,treed:L.treed,rocky:L.rocky,footMist:L.footMist,fogK:L.fogK});
      const mesh=new THREE.Mesh(geo,mat);
      mesh.rotation.y=side<0?Math.PI/2:-Math.PI/2;
      mesh.position.x=side*L.x;mesh.position.y=-5.6;
      mesh.frustumCulled=false;
      (side>0?this.right:this.group).add(mesh);
      // drifting mist strip at the foot of this wall
      const mk=L.kasumi==='heian'?heianBand:suyariBand;
      const band=mk({width:FRIEZE_W*.96,height:L.h*.34});
      band.mesh.rotation.y=mesh.rotation.y;
      band.mesh.position.x=side*(L.x-42);band.mesh.position.y=-5+L.h*.17;
      band.mesh.renderOrder=6;
      (side>0?this.right:this.group).add(band.mesh);
      this.layers.push({mesh,band,rate:L.rate,off:(L.seed*side*137)%FRIEZE_SPAN,baseX:L.x,side});
    }
    this.t=0;
  }
  /** Patch any lit material so cloud shadows drift over it too. */
  cloudOn(mat,amt=.55){this.air.applyCloudShadow(mat,amt);}
  update(dt,time,travel,sky,mountainK=1,coast=false){
    this.t=time;this.field.update(dt);
    this.air.update({sunDir:sky.sunDir,palette:sky.resolvePalette()});
    const veil=this.air.u.uVeil.value;
    for(const L of this.layers){
      const s=mod(L.off+travel*L.rate,FRIEZE_SPAN)-FRIEZE_SPAN+1100;
      L.mesh.position.z=s;L.band.mesh.position.z=s;
      const target=coast?L.baseX+140:L.baseX;
      L.mesh.position.x=L.side*target;L.band.mesh.position.x=L.side*(target-42);
      const ty=mountainK*1.15;
      L.mesh.scale.y+=(ty-L.mesh.scale.y)*Math.min(1,dt*1.6);
      L.band.tex.offset.x+=dt*.006*(L.side>0?1:-1);
      L.band.mesh.material.color.copy(veil).lerp(_white,.35);
    }
    // on the coast the right-hand shore opens to the sea — keep only the far
    // peninsula wall (Izu across the bay)
    for(const L of this.layers)if(L.side>0&&L.baseX<600)L.mesh.visible=L.band.mesh.visible=!coast;
  }
}
const _white=new THREE.Color(1,1,1);

/* --------------------------------------------------------- countryside */

/** The labs' read-only adapter for the game's own Countryside builders
 *  (same shape as labs/machiya/js/original.js). */
export function countrysideKit(Countryside,random=Math.random){
  const kit=Object.create(Countryside.prototype);
  Object.assign(kit,{
    scene:new THREE.Group(),lanterns:[],colliders:[],nestPos:new THREE.Vector3(),
    villageHouseColliders:{left:[],right:[]},random,
    npcs:[],addNpc(){},addPlatform(){},addOrientedPlatform(){},addSlopedRoofPlatforms(){},
    addBuildingWallColliders(){},addCollider(){}
  });
  return kit;
}

const _toroKit=_=>toro('kasuga');

/** Merged draw-ready parts arrays: two village-house variants + a residence. */
export function houseTemplates(Countryside){
  const r=mulberry32(913),T=[];
  for(let v=0;v<3;v++){
    const kit=countrysideKit(Countryside,()=>r());
    if(v<2)kit.buildVillageHouse(0,0,0);else kit.buildMachiyaResidence(0,0,0);
    T.push(mergeTemplate(kit.scene));
  }
  return T;
}

export function toriiParts(Countryside){
  const kit=countrysideKit(Countryside);
  kit.buildTorii(0,0);
  return mergeTemplate(kit.scene);
}

export function toroParts(){
  const wrap=new THREE.Group();wrap.add(_toroKit());
  return mergeTemplate(wrap);
}

/** Instanced set that assigns each slot to a template variant. Each variant's
 *  parts are instanced at its own slot count; set() writes the instance that
 *  owns slot i and leaves the rest untouched. */
export function variantSet(templates,slots,parent){
  const batches=[];
  templates.forEach((parts,v)=>{
    const ids=[];slots.forEach((sv,i)=>{if(sv===v)ids.push(i);});
    for(const p of parts){
      const mesh=new THREE.InstancedMesh(p.geometry,p.material,Math.max(1,ids.length));
      mesh.count=ids.length;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;
      parent.add(mesh);batches.push({mesh,local:p.local||new THREE.Matrix4(),ids});
    }
  });
  const writes=slots.map(()=>[]);
  for(const b of batches)b.ids.forEach((i,j)=>writes[i].push({mesh:b.mesh,local:b.local,j}));
  return {count:slots.length,batches,
    set(i,x,y,z,scale=1,rot=0){
      _d.position.set(x,y,z);_d.rotation.set(0,rot,0);_d.scale.setScalar(scale);_d.updateMatrix();
      for(const w of writes[i]){_m.multiplyMatrices(_d.matrix,w.local);w.mesh.setMatrixAt(w.j,_m);}
    },
    commit(){for(const b of batches)b.mesh.instanceMatrix.needsUpdate=true;}};
}

/* -------------------------------------------------------------- bamboo */

/** A stand of bamboo culms + canopy tufts along the corridor. */
export function bambooStand(F,count,{seed=41,parent}={}){
  const r=mulberry32(seed);
  const culmGeo=culmGeometry({nodes:6,radial:7});
  const culmMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.78,metalness:0,envMapIntensity:.3});
  const culms=new THREE.InstancedMesh(culmGeo,culmMat,count);
  const tuftGeo=F.lumpyTuftGeometry(1,3,.5);
  const tuftMat=F.createFoliageMaterial({sss:.24,wind:.7,mottle:.3,bump:.4,vertexColors:false,massMap:F.leafMassTexture('leaf'),massScale:.9});
  const nTuft=Math.ceil(count/2);
  const tufts=new THREE.InstancedMesh(tuftGeo,tuftMat,nTuft);
  for(const m of [culms,tufts]){m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;parent.add(m);}
  const col=new THREE.Color();
  for(let i=0;i<count;i++)culms.setColorAt(i,bambooColor(.05+r()*.55,col));
  for(let i=0;i<nTuft;i++)tufts.setColorAt(i,col.setHSL(.26+r()*.06,.4,.3+r()*.12));
  const batches=[{mesh:culms},{mesh:tufts}];
  return {count,batches,
    set(i,x,y,z,h,rad,leanX,rot,tuft){
      _d.position.set(x,y,z);_d.rotation.set(leanX,rot,leanX*.5);_d.scale.set(rad,h,rad);_d.updateMatrix();
      culms.setMatrixAt(i,_d.matrix);
      if(tuft>=0){_d.position.y=y+h*.9;_d.rotation.set(0,rot,0);_d.scale.set(h*.55,h*.22,h*.55);_d.updateMatrix();tufts.setMatrixAt(tuft,_d.matrix);}
    },
    commit(){culms.instanceMatrix.needsUpdate=tufts.instanceMatrix.needsUpdate=true;}};
}

/* ------------------------------------------------------------ landmarks */

/** The parametric gojū-no-tō from the pagoda lab — Yasaka over the Kyoto hills. */
export function pagodaLandmark(){
  const p=buildPagoda({preset:'yasaka'},{detail:'mid'});
  p.group.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
  return p.group;
}

/** A long vermilion taiko-bashi crossing the Ōi/Kiso river stage. */
export function riverBridge(){
  const U={uLevel:{value:-17.8},uRain:{value:0}};
  const mats=bridgeMaterials(U);
  const b=buildBridge('taiko',{x:0,zc:0,L:600,W:7,H:-6,ramp:0,level:-17.8,s:2,bedAt:()=>-21.5,groundAt:()=>-5.6,mats,seed:9});
  b.group.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
  return b.group;
}

/** Hillside shrine + torii + stone lanterns for the wayside shrine pockets. */
export function shrineGroup(Countryside){
  const kit=countrysideKit(Countryside);
  const g=new THREE.Group();
  kit.buildShrine(0,0);
  kit.buildTorii(0,4.6);
  for(const child of [...kit.scene.children])g.add(child.clone());
  const t1=_toroKit(),t2=_toroKit();
  t1.position.set(1.8,0,2.6);t2.position.set(-1.8,0,2.6);
  g.add(t1,t2);
  return g;
}

/* ---------------------------------------------------------------- water */

const WATER_VS=/* glsl */`
varying vec3 vW;
void main(){
  vec4 w=modelMatrix*
  #ifdef USE_INSTANCING
    instanceMatrix*
  #endif
  vec4(position,1.);
  vW=w.xyz;
  gl_Position=projectionMatrix*viewMatrix*w;
}`;

const WATER_FS=/* glsl */`
varying vec3 vW;
uniform float uTime,uDusk,uCalm;
uniform vec3 uSunDir,uSkyTop,uSkyHor,uDeep,uShallow,uSunCol;
${HASH}
${NOISE}
void main(){
  vec2 q=vW.xz;float t=uTime;
  float w1=sin(q.x*.13+q.y*.21+t*1.6)*sin(q.y*.09-t*.5);
  float w2=sin(q.x*.41-q.y*.27+t*2.2);
  float rip=(fbm2(q*.16+vec2(t*.05,-t*.03),3)-.5)*(1.-uCalm*.7);
  vec3 n=normalize(vec3(w1*.14+w2*.05+rip*.3,1.,w1*.11-w2*.07+rip*.24));
  vec3 V=normalize(cameraPosition-vW);
  vec3 R=reflect(-V,n);
  float fres=.05+.95*pow(1.-max(dot(V,n),0.),4.);
  vec3 sky=mix(uSkyHor,uSkyTop,pow(clamp(R.y,0.,1.),.6));
  vec3 body=mix(uShallow,uDeep,.55+.45*fres);
  vec3 col=mix(body,sky,clamp(fres*.9+.07,0.,1.));
  col+=uSunCol*pow(max(dot(R,uSunDir),0.),600.)*7.*(1.+w2*1.5);
  col+=vec3(1.,.96,.84)*pow(max(0.,sin(q.x*1.7+q.y*1.3+w1*3.+t*1.4)),28.)*.3;
  col=mix(col,col*vec3(1.04,.9,.78),uDusk*.5);
  gl_FragColor=vec4(col,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** Pond-water inspired surface: fresnel sky reflection + sun glitter. */
export function waterMaterial({deep=0x163f4b,shallow=0x3a6f68,skyTop=0x7fb4d4,skyHor=0xd9e4d8,calm=0}={}){
  return new THREE.ShaderMaterial({
    vertexShader:WATER_VS,fragmentShader:WATER_FS,
    uniforms:{
      uTime:{value:0},uDusk:{value:0},uCalm:{value:calm},
      uSunDir:{value:new THREE.Vector3(0,1,0)},uSunCol:{value:new THREE.Color(1,.95,.85)},
      uSkyTop:{value:new THREE.Color(skyTop)},uSkyHor:{value:new THREE.Color(skyHor)},
      uDeep:{value:new THREE.Color(deep)},uShallow:{value:new THREE.Color(shallow)}
    }});
}

export function feedWater(mat,sky,time,dusk=0){
  const u=mat.uniforms,p=sky.resolvePalette();
  u.uTime.value=time;u.uDusk.value=dusk;
  u.uSunDir.value.copy(sky.sunDir).normalize();
  u.uSunCol.value.copy(p.sun).multiplyScalar(1.15);
  u.uSkyTop.value.copy(p.top);u.uSkyHor.value.copy(p.horizon);
}

/* ----------------------------------------------------------------- life */

/** Butterflies from the critters lab, drifting through the wayside. */
export function butterflies(count,{seed=77}={}){
  const r=mulberry32(seed),group=new THREE.Group(),list=[];
  const shades=['#f0b42a','#e88fb1','#f4f1e6','#7fb5d9'];
  for(let i=0;i<count;i++){
    const b=butterfly(shades[i%4],3+i*7);
    const wings=b.userData.wings;
    b.userData={wings,x:(r()<.5?-1:1)*(8+r()*18),y:-3.6+r()*2.6,z:r()*1500,ph:r()*6.28,f:9+r()*4};
    group.add(b);list.push(b);
  }
  return {group,update(time,travel){
    for(const b of list){const u=b.userData;
      b.position.set(u.x+Math.sin(time*.7+u.ph)*2.4,u.y+Math.sin(time*1.1+u.ph)*.5,mod(u.z+travel,1500)-1150);
      b.rotation.y=Math.sin(time*.5+u.ph)*.9;
      const f=Math.sin(time*u.f+u.ph)*1.1;
      u.wings[0].rotation.z=f;u.wings[1].rotation.z=-f;
    }
  }};
}

/* ------------------------------------------------------------------ town */

/** A richer painted facade for the instanced city/town blocks. */
export function cityTexture(){
  const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),r=mulberry32(88);
  const gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#9d968c');gr.addColorStop(1,'#b3aa9c');
  g.fillStyle=gr;g.fillRect(0,0,256,256);
  for(let y=0;y<256;y+=38){g.fillStyle='rgba(70,84,88,.5)';g.fillRect(0,y,256,3);}
  for(let y=7;y<224;y+=19)for(let x=8;x<252;x+=22){
    const k=r();
    g.fillStyle=k>.72?'#f7dfa6':k>.34?'#e8c98e':k>.14?'#54707c':'#465a63';
    g.fillRect(x,y,11,12);
    g.fillStyle='rgba(255,255,255,.13)';g.fillRect(x,y,11,2);
    g.fillStyle='#8d8578';g.fillRect(x-1,y+12,13,2);
  }
  g.fillStyle='#5a5148';g.fillRect(0,224,256,32);
  for(let x=4;x<250;x+=16+((r()*16)|0)){g.fillStyle=['#e8b45a','#d97f68','#7fb3c9','#e5d7a4'][r()*4|0];g.fillRect(x,228+((r()*8)|0),6+r()*9,15+r()*7);}
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
