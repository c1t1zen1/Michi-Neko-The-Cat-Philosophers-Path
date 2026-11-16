// Planted country, in metres. Farms, hamlets and woodland share one authored
// layout, so trees do not sprout through paddies or slide past their gardens.
import * as THREE from 'three';
import {M} from '../../labs/shared/painted.js';
import {rng} from '../../labs/shared/craft.js';
import {stone} from '../../labs/rocks/js/kit.js';
import {fence} from '../../labs/fences/js/kit.js';
import {gardenBasin} from '../../labs/garden/js/kit.js';
import {mergeTemplate,instancedParts} from './assets.js';
import {sceneryZ,wrap,SCENERY_SPAN} from './motion.js';
const d=new THREE.Object3D(),color=new THREE.Color();
export function groundAt(x,z){
  const t=Math.max(0,Math.min(1,(Math.abs(x)-155)/140)),a=z*Math.PI*2/SCENERY_SPAN;
  return -5+t*t*(8+7*Math.sin(a*3+x*.013)+4*Math.cos(a*5-x*.03));
}
export function corridorPlan(low=false){
  const r=rng(78541),trees=[],nearTrees=[],houses=[],fields=[],bamboo=[];
  const pushTree=(x,z,scale,near=false)=>{(near?nearTrees:trees).push({x,z:wrap(z,SCENERY_SPAN),scale,rot:r()*Math.PI*2});};
  for(const side of [-1,1])for(let row=0;row<36;row++){
    const z=row*50+12,hamlet=row%6===0;
    for(let col=0;col<4;col++){
      const x=side*(43+col*39);
      if(hamlet&&col<2){
        for(let j=0;j<2;j++)houses.push({x:x+(r()-.5)*6,z:z+j*17-8,scale:.9+r()*.2,rot:side>0?-Math.PI/2:Math.PI/2,v:(row+col+j)%3});
        for(let j=0;j<5;j++)pushTree(x+side*(9+r()*8),z+(r()-.5)*43,.95+r()*.4,true);
      }else fields.push({x,z,w:32+r()*3,d:40+r()*3,shade:r()});
    }
    // A ribbon of tree groups breaks the embankment into open views.
    if(row%3!==1)for(let j=0;j<(low?3:5);j++)pushTree(side*(23+r()*10),z+(r()-.5)*30,.9+r()*.45,true);
    for(let j=0;j<(low?8:16);j++)pushTree(side*(185+r()*165),z+(r()-.5)*52,1.3+r()*1.35);
    if(row%6===3)for(let j=0;j<(low?8:14);j++)bamboo.push({x:side*(28+r()*15),z:z+(r()-.5)*25,h:5.2+r()*3.6,r:.055+r()*.04,lean:(r()-.5)*.07,rot:r()*6.28});
  }
  return {trees,nearTrees,houses,fields,bamboo};
}
function instances(geo,mat,seeds,parent){const m=new THREE.InstancedMesh(geo,mat,seeds.length);m.frustumCulled=false;m.receiveShadow=true;parent.add(m);return m;}
export class RuralDetails{
  constructor(parent,F,{low=false}={}){
    this.root=new THREE.Group();this.root.name='Kyoto gardens and field margins';parent.add(this.root);this.batches=[];
    this.grounds=[];
    const groundMat=M.plain(0x839b5d,{rough:1,brush:.18,dab:.7});
    for(const side of [-1,1]){
      const geometry=new THREE.PlaneGeometry(720,SCENERY_SPAN,60,150);geometry.rotateX(-Math.PI/2);
      const p=geometry.attributes.position,colors=[];
      for(let i=0;i<p.count;i++){
        const x=p.getX(i)+side*380,z=p.getZ(i);p.setXYZ(i,x,groundAt(x,z+SCENERY_SPAN*.7)-.08,z);
        const k=(Math.sin(x*.035+z*.016)+Math.sin(x*.08-z*.03))*.018;
        color.setHSL(.225+k,.27,.35+k);colors.push(color.r,color.g,color.b);
      }
      geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
      const mat=groundMat.clone();mat.vertexColors=true;mat.color.setHex(0xffffff);
      for(let j=-1;j<=1;j++){const mesh=new THREE.Mesh(geometry,mat);mesh.name='Rolling planted ground';mesh.receiveShadow=true;this.root.add(mesh);this.grounds.push({mesh,j,side});}
    }
    const r=rng(903);this.shrubSeeds=[];this.rockSeeds=[];this.flowerSeeds=[];this.gardenSeeds=[];
    for(let i=0;i<(low?550:1100);i++){
      const side=i%2?-1:1,z=r()*SCENERY_SPAN,x=side*(19+r()*18);
      this.shrubSeeds.push({x,z,y:groundAt(x,z),s:.40+r()*.65,rot:r()*6.28});
    }
    const shrubGeo=F?F.bushGeometry(193,{lobes:5,detail:1,lump:.26}):new THREE.IcosahedronGeometry(1,1);
    this.shrubs=instances(shrubGeo,M.plain(0x4d773c,{rough:1,brush:.2,dab:5}),this.shrubSeeds,this.root);
    for(let i=0;i<this.shrubSeeds.length;i++)this.shrubs.setColorAt(i,color.setHSL(.24+r()*.035,.26+r()*.13,.33+r()*.14));
    for(let i=0;i<(low?90:180);i++){const x=(i%2?-1:1)*(18+r()*25),z=r()*SCENERY_SPAN;this.rockSeeds.push({x,z,y:-5,s:.7+r()*1.8,rot:r()*6.28});}
    const rock=new THREE.Group();rock.add(stone('kikyaku',{seed:14,moss:.45,lichen:.2}));this.rocks=instancedParts(mergeTemplate(rock),this.rockSeeds.length,this.root);
    for(let i=0;i<(low?1800:3600);i++){
      const side=i%2?-1:1,z=r()*SCENERY_SPAN,x=side*(18+r()*14);this.flowerSeeds.push({x,z,y:-4.75,s:.35+r()*.7,rot:r()*6.28});
    }
    const petal=new THREE.SphereGeometry(.19,5,3);petal.scale(1,.36,1);
    this.flowers=instances(petal,M.plain(0xe8d8b3,{rough:1}),this.flowerSeeds,this.root);
    for(let i=0;i<this.flowerSeeds.length;i++)this.flowers.setColorAt(i,color.set([0xe9c2cd,0xe8d59b,0xf4edd7,0xa6b9d6][i%4]));
    const garden=new THREE.Group(),takegaki=fence([new THREE.Vector3(-5,0,0),new THREE.Vector3(5,0,0)],'yotsume',{seed:8});garden.add(takegaki);
    const basin=gardenBasin();basin.position.set(3,0,-1.5);garden.add(basin);
    for(let row=0;row<36;row+=6)for(const side of [-1,1])this.gardenSeeds.push({x:side*33,z:row*50+12,y:-5,s:1,rot:side*Math.PI/2});
    this.gardens=instancedParts(mergeTemplate(garden),this.gardenSeeds.length,this.root);
    // Paths and irrigation channels are repeated on the same farm grid.
    this.lanes=[];
    const laneMat=M.plain(0xb1a383,{rough:1,brush:.17,dab:3}),ditchMat=M.plain(0x467c78,{rough:.3});
    for(const side of [-1,1])for(let j=-1;j<=1;j++){
      for(const [x,w,mat] of [[side*20,2.0,laneMat],[side*23.3,.65,ditchMat]]){
        const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,.06,SCENERY_SPAN),mat);mesh.position.set(x,-4.97,j*SCENERY_SPAN);this.root.add(mesh);this.lanes.push({mesh,side,j});
      }
    }
    this.teaRows=[];
    // One clipped, scalloped tea hedge template; instanced into field rows.
    this.teaGeo=F?F.bushGeometry(97,{lobes:5,detail:1,lump:.17}):new THREE.IcosahedronGeometry(1,1);
  }
  update(travel,route){
    const coast=route.ocean,river=!!route.c.bridge,city=route.city;
    this.root.visible=!river&&!city;
    if(!this.root.visible)return;
    const put=(mesh,seeds,scaleY=1)=>{
      for(let i=0;i<seeds.length;i++){
        const a=seeds[i],x=coast?-Math.abs(a.x):a.x;
        d.position.set(x,a.y,sceneryZ(a.z,travel));d.rotation.set(0,a.rot,0);d.scale.set(a.s,a.s*scaleY,a.s);d.updateMatrix();mesh.setMatrixAt(i,d.matrix);
      }mesh.instanceMatrix.needsUpdate=true;
    };
    put(this.shrubs,this.shrubSeeds,.8);put(this.flowers,this.flowerSeeds);
    for(const [set,seeds] of [[this.rocks,this.rockSeeds],[this.gardens,this.gardenSeeds]]){seeds.forEach((a,i)=>set.set(i,coast?-Math.abs(a.x):a.x,a.y,sceneryZ(a.z,travel),a.s,a.rot));set.commit();}
    for(const {mesh,j,side} of this.grounds){mesh.visible=!(coast&&side>0);mesh.position.z=wrap(travel,SCENERY_SPAN)+j*SCENERY_SPAN;}
    for(const {mesh,j,side} of this.lanes){mesh.visible=!(coast&&side>0);mesh.position.z=wrap(travel,SCENERY_SPAN)+j*SCENERY_SPAN;}
  }
}
