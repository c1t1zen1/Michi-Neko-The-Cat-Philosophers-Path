import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {M} from '../../labs/shared/painted.js';
import {chochin,washiTexture} from '../../labs/shared/paperlantern.js';
import {rng} from '../../labs/shared/craft.js';
import {instancedAsset} from './assets.js';
import {CAR_LENGTH,CAR_PITCH,CAR_COUNT,TRAIN_LENGTH,ENTRY,EXIT,POSTCARDS,clamp,mix,smooth} from './route.js';

const mod=(a,b)=>((a%b)+b)%b;
const UP=new THREE.Vector3(0,1,0);
const dummy=new THREE.Object3D();
const boxGeo=new THREE.BoxGeometry(1,1,1);
function mesh(parent,geo,mat,p=[0,0,0],scale=[1,1,1]){const m=new THREE.Mesh(geo,mat);m.position.set(...p);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(p,mat,pos,size){return mesh(p,boxGeo,mat,pos,size);}
function tube(parent,points,radius,mat){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(parent,new THREE.TubeGeometry(curve,Math.max(8,points.length*4),radius,6,false),mat);}
function label(text,bg='#eff1dc',ink='#284b5b',w=256,h=128){
  const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.fillStyle=bg;g.fillRect(0,0,w,h);
  g.strokeStyle=ink;g.lineWidth=2;g.strokeRect(7,7,w-14,h-14);g.fillStyle=ink;g.textAlign='center';g.textBaseline='middle';
  const lines=text.split('\n');g.font=`${lines.length>1?23:31}px Georgia,serif`;lines.forEach((t,i)=>g.fillText(t,w/2,h/2+(i-(lines.length-1)/2)*34));
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({map:tex,roughness:.9,side:THREE.DoubleSide,emissive:0xffe1a3,emissiveIntensity:.08});
}
function batchBoxes(parent,items,material,name){
  const geos=items.map(({p,s})=>{const g=boxGeo.clone();g.scale(...s);g.translate(...p);return g;});
  if(!geos.length)return null;const merged=mergeGeometries(geos);geos.forEach(g=>g.dispose());const m=mesh(parent,merged,material);m.name=name;return m;
}

export class World {
  constructor(scene,kit,{low=false}={}) {
    Object.assign(this,{scene,kit,low});this.travel=0;this.time=0;this.tunnel=0;this.nextTrainSeen=false;
    this.root=new THREE.Group();scene.add(this.root);
    this.train=new THREE.Group();this.train.name='Eastbound train';this.root.add(this.train);
    this.cars=[];this.interiors=[];this.seals=[];this.npcs=[];this.hoops=[];
    this.buildTrain();this.buildOverpass();this.buildScenery();this.buildTunnels();this.buildAtmosphere();
  }
  buildTrain(){
    const {kit,train}=this;const brass=M.bronze({color:0xbc9b5c}),dark=M.plain(0x233c43),blue=kit.materials.get('indigo');
    const glazing=new THREE.MeshStandardMaterial({color:0xa0c3c0,roughness:.28,metalness:.12,transparent:true,opacity:.14,depthWrite:false,side:THREE.DoubleSide});
    for(let i=0;i<CAR_COUNT;i++){
      const root=new THREE.Group();root.position.z=-i*CAR_PITCH-CAR_LENGTH/2;root.name=`Car ${16-i}`;train.add(root);
      const body=kit.clone('coach_shell'),roof=kit.clone('coach_roof');root.add(body,roof);
      this.cars.push({root,body,roof});
      for(const x of [-1.735,1.735]){const pane=mesh(root,new THREE.PlaneGeometry(24.5,1.26),glazing,[x,2.73,0]);pane.rotation.y=Math.PI/2;pane.castShadow=false;}
      const badge=mesh(root,new THREE.PlaneGeometry(.6,.35),label(String(16-i).padStart(2,'0')),[1.82,2.06,9]);badge.rotation.y=Math.PI/2;
      // Paw-sized running stripe and carriage-edge markings.
      box(root,blue,[0,4.356,0],[.075,.012,24.3]);
      for(const z of [-12.05,12.05]){
        box(root,brass,[0,4.36,z],[2.3,.015,.13]);
        for(const x of [-1.25,1.25])mesh(root,new THREE.SphereGeometry(.065,8,6),new THREE.MeshBasicMaterial({color:0xffd48c}),[x,4.20,z]);
      }
      if(i<15){
        for(const x of [-1.34,1.34])box(root,dark,[x,2.5,-12.92],[.12,2.7,.72]);
        box(root,dark,[0,3.80,-12.92],[2.7,.12,.72]);
        box(root,kit.materials.get('timber'),[0,1.09,-12.92],[2.7,.12,.72]);
        for(let z=-12.55;z>-13.30;z-=.13)box(root,kit.materials.get('graphite'),[0,3.84,z],[2.7,.09,.04]);
      }
      if(i>=6&&i<=9){
        const interior=new THREE.Group();root.add(interior);this.interiors.push({root:interior,index:i});
        box(interior,this.kit.materials.get('linen'),[0,3.78,0],[3.40,.045,24.90]);
        // Linen roof lining, luggage shelves and warm ceiling lamps (visible from below).
        for(const x of [-1.15,1.15]){
          box(interior,brass,[x,3.20,0],[.50,.045,22]);
          tube(interior,[[x,3.35,-11],[x,3.35,0],[x,3.35,11]],.025,brass);
        }
        for(const z of [-9,-4.5,0,4.5,9])box(interior,kit.materials.get('warm_light'),[0,3.68,z],[.38,.035,1.7]);
        if(i<=7){
          for(let z=-9;z<=9;z+=2.5)for(const side of [-1,1]){
            const seat=kit.clone('seat_pair');seat.position.set(side*1.0,1.15,z);seat.scale.set(.72,.90,.9);interior.add(seat);
          }
          for(const x of [-1.18,1.18]){
            box(interior,kit.materials.get('window'),[x,3.19,-7],[.45,.25,1.2]);
            box(interior,kit.materials.get('vermilion'),[x,3.16,3],[.42,.20,.8]);
          }
        }else{
          const counter=kit.clone('cafe_counter');counter.position.set(1.13,1.15,0);interior.add(counter);
          for(const z of [-8,-5.7,5.7,8]){
            box(interior,kit.materials.get('timber'),[-1.12,1.85,z],[.85,.08,1.15]);
            box(interior,brass,[-1.12,1.48,z],[.08,.65,.08]);
            const tea=kit.clone('tea_set');tea.position.set(-1.12,1.90,z);tea.scale.setScalar(.7);interior.add(tea);
            for(const dz of [-.65,.65]){box(interior,kit.materials.get('sage_cloth'),[-1.15,1.60,z+dz],[.6,.11,.5]);box(interior,brass,[-1.15,1.36,z+dz],[.055,.45,.055]);}
          }
          const sign=mesh(interior,new THREE.PlaneGeometry(1.45,.65),label('雲のカフェ\nCLOUD CAFÉ','#284b4c','#f5e9c8'),[.85,3.10,2.85]);
          const lantern=chochin({h:.4,belly:.14,glow:.7,tex:washiTexture({ribs:12,seed:17})});lantern.position.set(.80,3.1,-3.4);interior.add(lantern);
        }
      }
      // Underbody shadow: painted, not an expensive transparency stack.
      box(root,M.plain(0x657c6c),[0,-.05,0],[3.3,.04,24.5]);
    }
    const nose=kit.clone('nose');nose.position.z=-TRAIN_LENGTH;train.add(nose);
    const rear=kit.clone('nose');rear.rotation.y=Math.PI;train.add(rear);
    this.frontNose=nose;
    // Fictional roof access hatches make the interior route legible and safe.
    for(const [s,name] of [[ENTRY,'COACH ↓'],[EXIT,'ROOF ↑']]){
      const hatch=new THREE.Group();hatch.position.set(0,4.39,-s);train.add(hatch);
      box(hatch,kit.materials.get('sage_cloth'),[0,.035,0],[1.15,.08,1.6]);
      for(const x of [-.57,.57])box(hatch,brass,[x,.10,0],[.035,.16,1.65]);
      const tag=mesh(hatch,new THREE.PlaneGeometry(.72,.55),label(name,'#477264','#f5e9c5'),[0,.085,0]);tag.rotation.x=-Math.PI/2;
      for(const x of [-.45,.45])box(train,brass,[x,2.75,-s],[.04,2.9,.05]);
      for(let y=1.3;y<4.3;y+=.28)box(train,brass,[0,y,-s],[.90,.035,.045]);
    }
    for(const p of POSTCARDS){
      const root=new THREE.Group();root.position.set(p.inside?.43:1.0,p.inside?1.67:4.55,-p.s);train.add(root);
      const seal=mesh(root,new THREE.TorusGeometry(.18,.035,8,24),brass);seal.rotation.x=Math.PI/2;
      const card=mesh(root,new THREE.PlaneGeometry(.24,.32),label(p.icon,'#fff2c8','#556e57'),[0,.14,0]);card.rotation.x=-.4;
      this.seals.push({root,card,id:p.id});
    }
    this.npcs=[
      {name:'Sora',s:ENTRY+24,x:-1.06,y:1.66,coat:{fur:0x9d9b94,belly:0xe5e1cd,accent:0x505b5c,build:'slender'},line:'Sora: “The best seat is whichever one has a mountain in its window.”'},
      {name:'Yuzu',s:8*CAR_PITCH+10,x:1.04,y:2.27,coat:{fur:0xd4ad69,belly:0xf5e6c4,accent:0x906035,build:'michi'},line:'Yuzu: “One hōjicha for our smallest passenger. The roof ladder is farther forward.”'}
    ];
    // A sixteen-car silhouette on the other track, timed to the Kiso crossing.
    this.sister=new THREE.Group();this.sister.visible=false;this.root.add(this.sister);
    for(let i=0;i<8;i++){const g=new THREE.Group();g.position.z=i*CAR_PITCH;g.add(kit.clone('coach_shell'),kit.clone('coach_roof'));this.sister.add(g);}
    const sisterNose=kit.clone('nose');sisterNose.position.z=-12.5;this.sister.add(sisterNose);
    const sisterLead=kit.clone('nose');sisterLead.rotation.y=Math.PI;sisterLead.position.z=7*CAR_PITCH+12.5;this.sister.add(sisterLead);
  }
  buildOverpass(){
    this.overpass=new THREE.Group();this.root.add(this.overpass);
    const red=this.kit.materials.get('vermilion'),wood=M.wood({base:0x8c6740,dark:0x59412b}),stone=this.kit.materials.get('stone');
    box(this.overpass,wood,[0,7.9,-10],[18,.4,4]);
    for(const x of [-6,6])box(this.overpass,stone,[x,3.5,-10],[.65,8,2.2]);
    for(const z of [-12,-8]){
      for(let x=-8.5;x<=8.5;x+=1.1){if(z===-8&&Math.abs(x)<1.6)continue;box(this.overpass,red,[x,8.65,z],[.10,1.3,.12]);}
      box(this.overpass,red,[0,9.25,z],[18,.12,.18]);
    }
    const sign=mesh(this.overpass,new THREE.PlaneGeometry(2,.75),label('東へ · EASTBOUND','#f1e4c5','#315757'),[-4.0,9,-8.05]);sign.rotation.y=Math.PI;
    const lantern=chochin({h:.65,belly:.22,glow:.2});lantern.position.set(-5.8,9.55,-9);this.overpass.add(lantern);
    for(let i=0;i<3;i++){const tree=this.kit.clone('sakura');tree.position.set(-12-i*4,2-i,-14-i*6);tree.scale.setScalar(1.5);this.overpass.add(tree);}
  }
  buildScenery(){
    const scene=this.root;this.landscape=new THREE.Group();scene.add(this.landscape);
    const r=rng(78541),makeSeeds=(n,fn)=>Array.from({length:n},(_,i)=>fn(i));
    this.treeSeeds=makeSeeds(this.low?170:300,()=>({x:(r()<.5?-1:1)*(14+r()*220),z:r()*1500,scale:.65+r()*1.5,rot:r()*6.28}));
    this.trees=instancedAsset(this.kit,'tree',this.treeSeeds.length,this.landscape);
    this.sakuraSeeds=makeSeeds(28,()=>({x:(r()<.5?-1:1)*(13+r()*55),z:r()*1500,scale:.6+r()*.8,rot:r()*6.28}));
    this.sakura=instancedAsset(this.kit,'sakura',28,this.landscape);
    this.houseSeeds=makeSeeds(this.low?40:75,()=>({x:(r()<.5?-1:1)*(30+r()*180),z:r()*1500,scale:.8+r()*.8,rot:r()*6.28}));
    this.houses=instancedAsset(this.kit,'cottage',this.houseSeeds.length,this.landscape);
    this.groundMat=M.plain(0xa4b578,{rough:1,brush:.1,dab:2});
    this.ground=box(this.landscape,this.groundMat,[-180,-5.5,-200],[1200,1,1700]);this.ground.castShadow=false;
    // Fields / flooded paddies / tea ridges: a few instanced draws.
    this.fieldSeeds=makeSeeds(160,i=>({x:(i%2?-1:1)*(20+r()*290),z:r()*1500,w:12+r()*22,d:16+r()*35,shade:r()}));
    this.fields=new THREE.InstancedMesh(boxGeo,M.plain(0x79994f,{rough:1,brush:.12,dab:4}),this.fieldSeeds.length);this.fields.frustumCulled=false;this.landscape.add(this.fields);
    this.paddyWater=new THREE.InstancedMesh(boxGeo,new THREE.MeshStandardMaterial({color:0x9dbbad,roughness:.24,metalness:.25}),80);this.paddyWater.frustumCulled=false;this.landscape.add(this.paddyWater);
    const riceGeo=new THREE.ConeGeometry(.35,1.2,3);riceGeo.translate(0,.6,0);
    this.rice=new THREE.InstancedMesh(riceGeo,M.plain(0x9ebd59,{rough:1}),this.low?1600:3000);this.rice.frustumCulled=false;this.landscape.add(this.rice);
    this.mountainSeeds=makeSeeds(55,()=>({x:(r()<.5?-1:1)*(190+r()*460),z:r()*1900,scale:25+r()*85,h:25+r()*90}));
    this.mountains=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,2),M.plain(0x79988a,{rough:1,brush:.2,dab:.2}),55);this.mountains.frustumCulled=false;this.landscape.add(this.mountains);
    this.citySeeds=makeSeeds(this.low?140:240,()=>({x:(r()<.5?-1:1)*(20+r()*270),z:r()*1500,w:5+r()*14,d:5+r()*13,h:7+r()**2*90,shade:r()}));
    this.cityMat=new THREE.MeshStandardMaterial({map:this.cityTexture(),color:0xf4e0c9,roughness:.8,emissive:0xe0b875,emissiveMap:this.cityTexture(),emissiveIntensity:0});
    this.buildings=new THREE.InstancedMesh(boxGeo,this.cityMat,this.citySeeds.length);this.buildings.frustumCulled=false;this.landscape.add(this.buildings);
    this.trafficRoot=new THREE.Group();this.landscape.add(this.trafficRoot);
    this.trafficSeeds=makeSeeds(80,i=>({x:(i%2?-1:1)*(i%4<2?27.5:32.0),z:r()*1500,dir:i%4<2?1:-1,color:r()}));
    this.traffic=new THREE.InstancedMesh(boxGeo,new THREE.MeshStandardMaterial({color:0xffffff,roughness:.5}),80);
    this.trafficWindows=new THREE.InstancedMesh(boxGeo,M.plain(0x344f5a,{rough:.25}),80);
    this.trafficLights=new THREE.InstancedMesh(new THREE.SphereGeometry(.09,6,4),new THREE.MeshBasicMaterial({color:0xffe6a4}),160);
    for(const m of [this.traffic,this.trafficWindows,this.trafficLights]){m.frustumCulled=false;this.trafficRoot.add(m);}
    for(const side of [-1,1]){
      const road=box(this.trafficRoot,M.plain(0x747d79),[side*30,-4.93,-250],[12,.05,1800]);road.castShadow=false;
      for(const dx of [-5.3,0,5.3]){const line=box(this.trafficRoot,M.plain(0xe1d8b0),[side*30+dx,-4.89,-250],[.10,.01,1800]);line.castShadow=false;}
    }
    this.oceanMat=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uDusk:{value:0}},vertexShader:'varying vec3 p;void main(){p=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 p;uniform float uTime,uDusk;void main(){float wave=sin(p.x*.14+p.z*.28+uTime*1.8)*sin(p.z*.08-uTime*.4);float sparkle=pow(max(0.,sin(p.x*1.13+p.z*.73+wave*2.+uTime)),24.)*.35;vec3 a=mix(vec3(.20,.52,.58),vec3(.29,.38,.49),uDusk);vec3 b=mix(vec3(.66,.82,.75),vec3(.95,.68,.45),uDusk);gl_FragColor=vec4(mix(a,b,.23+wave*.10+sparkle),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`});
    this.ocean=mesh(this.landscape,new THREE.PlaneGeometry(1500,1800),this.oceanMat,[800,-5.0,-250]);this.ocean.rotation.x=-Math.PI/2;this.ocean.castShadow=false;this.ocean.visible=false;
    this.beach=box(this.landscape,M.plain(0xc9bf92,{brush:.14,dab:1}),[64,-5.1,-250],[28,.18,1800]);this.beach.castShadow=false;
    this.river=mesh(this.landscape,new THREE.PlaneGeometry(1000,650),this.oceanMat,[0,-18,-250]);this.river.rotation.x=-Math.PI/2;this.river.castShadow=false;
    this.riverBanks=new THREE.Group();this.landscape.add(this.riverBanks);
    for(const side of [-1,1]){const bank=box(this.riverBanks,this.groundMat,[side*640,-5.5,-250],[1020,1,1800]);bank.castShadow=false;}
    this.viaducts=instancedAsset(this.kit,'viaduct',70,this.landscape);
    this.fuji=this.kit.clone('fuji');this.fuji.position.set(-500,-5,-680);this.fuji.scale.setScalar(1.5);this.landscape.add(this.fuji);
    this.tower=this.kit.clone('tokyo_tower');this.tower.position.set(-100,-5,-330);this.tower.scale.setScalar(1.15);this.landscape.add(this.tower);
    // Track furniture whips past close to camera; distant hills drift slowly.
    this.track=new THREE.Group();scene.add(this.track);
    const trackItems=[],railItems=[],wireItems=[];
    for(const x of [-.77,.77,6.23,7.77])railItems.push({p:[x,.08,-180],s:[.09,.16,1450]});
    for(let z=-900;z<550;z+=1.1)trackItems.push({p:[3.5,-.05,z],s:[10,.14,.18]});
    batchBoxes(this.track,trackItems,M.plain(0x8a8b7a),'Sleepers');batchBoxes(this.track,railItems,M.plain(0x6a7773,{rough:.4}),'Rails');
    for(let z=-900;z<500;z+=45){
      for(const x of [-10,17])wireItems.push({p:[x,2.7,z],s:[.15,14.5,.18]});
      wireItems.push({p:[3.5,9.9,z],s:[27,.14,.16]});
    }
    this.catenary=batchBoxes(this.track,wireItems,M.plain(0x60726d),'Overhead masts');
    for(const x of [0,7])tube(this.track,[[x,9.4,-900],[x,9.1,-450],[x,9.4,0],[x,9.1,500]],.015,M.plain(0x434e45));
    const bankShape=new THREE.Shape();bankShape.moveTo(-14,-5);bankShape.lineTo(-5,-.22);bankShape.lineTo(12,-.22);bankShape.lineTo(21,-5);bankShape.closePath();
    const bankGeo=new THREE.ExtrudeGeometry(bankShape,{depth:1450,bevelEnabled:false,steps:1});bankGeo.translate(0,0,-900);
    this.embankment=mesh(this.track,bankGeo,M.plain(0x7f9865,{brush:.14,dab:3}));this.embankment.castShadow=false;
    this.buildWaysideDetails();
    // Service hoops are a readable fantasy obstacle below the power catenary.
    const hoopMat=M.plain(0xcda951,{rough:.65}),flagMat=M.cloth({color:0xe3ba65});
    for(let i=0;i<3;i++){
      const root=new THREE.Group();this.root.add(root);
      tube(root,[[-2.7,7,0],[-2.5,5.1,0],[0,4.70,0],[2.5,5.1,0],[2.7,7,0]],.045,hoopMat);
      for(const x of [-1.5,0,1.5])box(root,flagMat,[x,4.91,0],[.16,.28,.025]);
      this.hoops.push({root,previous:-999,passed:false});
    }
    // Fishing boats and sails on the ocean's right-hand side.
    this.boats=new THREE.Group();this.landscape.add(this.boats);
    for(let i=0;i<10;i++){
      const b=new THREE.Group();b.position.set(120+r()*400,-4.5,-100-r()*800);
      mesh(b,new THREE.SphereGeometry(1,10,6),M.wood(),[0,0,0],[1.5,.45,4]);
      box(b,kitMat(this.kit,'linen'),[0,2,0],[.08,4,.08]);
      const sail=new THREE.Shape();sail.moveTo(0,0);sail.lineTo(0,3);sail.lineTo(2.3,0);sail.closePath();mesh(b,new THREE.ShapeGeometry(sail),M.cloth({color:0xf1ead6}),[.05,.2,0]);
      this.boats.add(b);
    }
  }
  cityTexture(){
    if(this._cityTexture)return this._cityTexture;
    const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),r=rng(88);g.fillStyle='#a7a6a0';g.fillRect(0,0,256,256);
    for(let y=7;y<256;y+=19)for(let x=8;x<256;x+=22){g.fillStyle=r()>.30?'#f2dba2':'#4f6870';g.fillRect(x,y,11,12);g.fillStyle='#c6c1af';g.fillRect(x-1,y+12,13,2);}
    for(let y=0;y<256;y+=38){g.fillStyle='#74898b';g.fillRect(0,y,256,3);}
    this._cityTexture=new THREE.CanvasTexture(c);this._cityTexture.colorSpace=THREE.SRGBColorSpace;return this._cityTexture;
  }
  buildWaysideDetails(){
    this.wayside=new THREE.Group();this.root.add(this.wayside);const r=rng(345);
    // Bent three-blade tufts and tiny wildflowers on the track embankment.
    const verts=[];
    for(let i=0;i<3;i++){const a=i*Math.PI/3,dx=Math.cos(a)*.075,dz=Math.sin(a)*.075;verts.push(-dx,0,-dz,dx,0,dz,Math.sin(a+.3)*.16,.6+i*.12,Math.cos(a)*.12);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.computeVertexNormals();
    this.bankGrass=new THREE.InstancedMesh(geo,M.plain(0x7a9949,{side:THREE.DoubleSide,brush:.15}),this.low?2200:4600);this.bankGrass.frustumCulled=false;this.wayside.add(this.bankGrass);
    this.grassSeeds=Array.from({length:this.bankGrass.count},()=>({side:r()<.5?-1:1,u:r(),z:r()*1200,scale:.6+r()*.8,rot:r()*6.28}));
    this.flowers=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.085,0),M.plain(0xf4df9b),this.low?300:650);this.flowers.frustumCulled=false;this.wayside.add(this.flowers);
    this.fences=[];
    for(let i=0;i<18;i++){
      const group=new THREE.Group(),items=[];
      for(let z=-12;z<=12;z+=3)items.push({p:[0,.55,z],s:[.12,1.1,.12]});
      for(const y of [.35,.8])items.push({p:[0,y,0],s:[.08,.08,24]});
      batchBoxes(group,items,M.wood({base:0x9f9161,dark:0x746b48}),'Farm fence');
      const x=(i%2?-1:1)*(22+r()*28);this.fences.push({group,x,z:r()*1500});this.wayside.add(group);
    }
    this.shrine=new THREE.Group();this.shrine.position.set(-29,-5,-250);this.wayside.add(this.shrine);
    const red=this.kit.materials.get('vermilion'),wood=this.kit.materials.get('timber');
    for(const x of [-1.5,1.5])box(this.shrine,red,[x,1.6,0],[.18,3.2,.18]);
    box(this.shrine,red,[0,3.15,0],[4.1,.22,.35]);box(this.shrine,red,[0,2.65,0],[3.5,.14,.16]);
    box(this.shrine,wood,[0,1.05,-2.6],[1.6,1.8,1.4]);
    const roof=box(this.shrine,this.kit.materials.get('indigo'),[0,2.05,-2.6],[2.2,.22,2]);roof.rotation.z=.04;
    const sign=mesh(this.shrine,new THREE.PlaneGeometry(.6,.8),label('旅\n安全','#e7dec0','#4f6457'),[0,1.25,-1.87]);
    this.tokyoStation=new THREE.Group();this.root.add(this.tokyoStation);
    const brick=M.plain(0xa75c47,{brush:.15,dab:4}),cream=M.plain(0xe8d9b9),glass=M.plain(0x6e8e91,{rough:.4});
    box(this.tokyoStation,brick,[-26,4.5,0],[11,19,100]);
    for(const y of [-1,4,9])box(this.tokyoStation,cream,[-20.3,y,0],[.3,.35,102]);
    for(let z=-45;z<=45;z+=5)for(const y of [1.4,6.5,11.3]){
      box(this.tokyoStation,cream,[-20.30,y,z],[.20,3.0,1.8]);box(this.tokyoStation,glass,[-20.15,y,z],[.04,2.55,1.40]);
    }
    const dome=mesh(this.tokyoStation,new THREE.SphereGeometry(7,24,12,0,Math.PI*2,0,Math.PI/2),this.kit.materials.get('indigo'),[-26,14,0],[.85,.85,1]);
    const stationSign=mesh(this.tokyoStation,new THREE.PlaneGeometry(8,1.6),label('東 京 駅 · TOKYO','#dfd7b4','#2e535b'),[-20.0,14.7,0]);stationSign.rotation.y=Math.PI/2;
    this.tokyoStation.visible=false;
  }
  updateWayside(travel,coast){
    for(let i=0;i<this.grassSeeds.length;i++){
      const a=this.grassSeeds[i],width=2+a.u*10,x=a.side<0?-5-width:12+width,y=-.2-width*.46;
      dummy.position.set(x,y,mod(a.z+travel,1200)-900);dummy.scale.setScalar(a.scale);dummy.rotation.set(0,a.rot,0);dummy.updateMatrix();this.bankGrass.setMatrixAt(i,dummy.matrix);
      if(i<this.flowers.count){dummy.position.y+=.45;dummy.scale.setScalar(a.scale);dummy.updateMatrix();this.flowers.setMatrixAt(i,dummy.matrix);}
    }
    this.bankGrass.instanceMatrix.needsUpdate=true;this.flowers.instanceMatrix.needsUpdate=true;
    for(const f of this.fences)f.group.position.set(coast?-Math.abs(f.x):f.x,-5,mod(f.z+travel,1500)-1120);
    this.shrine.position.z=mod(400+travel*.6,1500)-1100;
  }
  buildTunnels(){
    this.tunnelRoot=new THREE.Group();this.root.add(this.tunnelRoot);
    this.rings=instancedAsset(this.kit,'tunnel_ring',75,this.tunnelRoot);
    this.tunnelLight=new THREE.PointLight(0xffbb70,0,24,1.4);this.root.add(this.tunnelLight);
  }
  buildAtmosphere(){
    const r=rng(99),n=this.low?85:160,points=new Float32Array(n*3);
    this.particleSeeds=Array.from({length:n},(_,i)=>({x:(r()-.5)*35,y:3+r()*14,z:r()*120,phase:r()*6.28}));
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(points,3));
    this.particles=new THREE.Points(geo,new THREE.PointsMaterial({color:0xf9ecd3,size:.09,transparent:true,opacity:.7,depthWrite:false}));this.root.add(this.particles);
    const birdGeo=new THREE.BufferGeometry();const vertices=[];
    for(let i=0;i<16;i++){const x=35+i*7,y=15+Math.sin(i)*5,z=-110-i*18;vertices.push(x-.8,y+.3,z,x,y,z,x,y,z,x+.8,y+.3,z);}
    birdGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    this.birds=new THREE.LineSegments(birdGeo,new THREE.LineBasicMaterial({color:0xf9f1db}));this.root.add(this.birds);
  }
  update(dt,time,route,motor,{gentle=false,postcards=new Set()}={}){
    this.time=time;this.travel+=dt*route.speed/3.6;const travel=this.travel,inside=motor.mode==='interior';
    this.landscape.position.z=-motor.s;
    this.train.rotation.z=gentle?0:Math.sin(time*5.8)*.0013+Math.sin(time*1.7)*.0015;
    this.overpass.visible=motor.mode==='overpass'||motor.mode==='boarding'||time<8;
    if(motor.mode==='roof')this.overpass.position.z=Math.max(0,travel);
    // Only the current interior and its neighbours are open to the camera.
    for(let i=0;i<this.cars.length;i++){
      this.cars[i].roof.visible=true;
      this.cars[i].root.visible=Math.abs(i*CAR_PITCH-motor.s)<(this.low?135:240);
    }
    const terrain=route.c.terrain,city=route.city,coast=route.ocean,river=route.c.bridge;
    this.embankment.visible=!river;this.wayside.position.z=-motor.s;this.wayside.visible=!river&&!city;
    this.updateWayside(travel,coast);
    this.ground.position.x=coast?-540:-180;this.ground.scale.x=coast?1200:1700;
    this.ground.position.y=river?-21:-5.5;this.groundMat.color.setHex(route.c.color).lerp(new THREE.Color(route.next.color),route.blend);
    for(let i=0;i<this.treeSeeds.length;i++){
      const a=this.treeSeeds[i],base=coast&&a.x>60?-a.x:a.x,x=river?Math.sign(base)*(Math.abs(base)+140):base,z=mod(a.z+travel,1500)-1120;
      this.trees.set(i,x,city?-10:-5,z,a.scale*(city?.55:1),a.rot);
    }this.trees.commit();
    this.sakura.batches.forEach(b=>b.mesh.visible=!river&&!city);
    for(let i=0;i<this.sakuraSeeds.length;i++){const a=this.sakuraSeeds[i];this.sakura.set(i,coast?-Math.abs(a.x):a.x,-5,mod(a.z+travel,1500)-1120,a.scale,a.rot);}this.sakura.commit();
    for(let i=0;i<this.houseSeeds.length;i++){const a=this.houseSeeds[i],base=coast?-Math.abs(a.x):a.x;this.houses.set(i,river?Math.sign(base)*(Math.abs(base)+140):base,-5,mod(a.z+travel,1500)-1120,a.scale*(city?.7:1),a.rot);}this.houses.commit();
    this.fields.visible=!city&&!river;this.paddyWater.visible=terrain==='paddy'||terrain==='fuji';this.rice.visible=this.paddyWater.visible||terrain==='tea';
    for(let i=0;i<this.fieldSeeds.length;i++){
      const a=this.fieldSeeds[i],x=coast?-Math.abs(a.x):a.x,z=mod(a.z+travel,1500)-1120;
      dummy.position.set(x,-4.93,z);dummy.scale.set(a.w,.12,a.d);dummy.rotation.set(0,0,0);dummy.updateMatrix();this.fields.setMatrixAt(i,dummy.matrix);
      this.fields.setColorAt(i,new THREE.Color().setHSL(.20+a.shade*.025,.30+a.shade*.2,.36+a.shade*.14));
      if(i<80){dummy.position.y=-4.81;dummy.scale.set(a.w*.91,.025,a.d*.91);dummy.updateMatrix();this.paddyWater.setMatrixAt(i,dummy.matrix);}
    }this.fields.instanceMatrix.needsUpdate=true;this.fields.instanceColor.needsUpdate=true;this.paddyWater.instanceMatrix.needsUpdate=true;
    for(let i=0;i<this.rice.count;i++){
      const a=this.fieldSeeds[i%80],row=Math.floor(i/80),x=(coast?-Math.abs(a.x):a.x)+(row%6-2.5)*a.w/7;
      dummy.position.set(x,-4.77,mod(a.z+travel+(Math.floor(row/6)-2)*a.d/6,1500)-1120);dummy.scale.set(.55,.5,.55);dummy.updateMatrix();this.rice.setMatrixAt(i,dummy.matrix);
    }this.rice.instanceMatrix.needsUpdate=true;
    for(let i=0;i<this.mountainSeeds.length;i++){
      const a=this.mountainSeeds[i];dummy.position.set(coast?-Math.abs(a.x):a.x,-15,mod(a.z+travel*.10,1900)-1300);
      dummy.scale.set(a.scale*1.5,a.h*(terrain==='mountain'?.65:.38),a.scale*1.3);dummy.rotation.set(0,i,0);dummy.updateMatrix();this.mountains.setMatrixAt(i,dummy.matrix);
      this.mountains.setColorAt(i,new THREE.Color().setHSL(.41+i%4*.015,.16,.42+i%3*.045));
    }this.mountains.instanceMatrix.needsUpdate=true;this.mountains.instanceColor.needsUpdate=true;
    this.buildings.visible=city||terrain==='town';this.cityMat.emissiveIntensity=smooth(16.5,19,route.hour)*.70;
    if(this.buildings.visible){
      for(let i=0;i<this.citySeeds.length;i++){
        const a=this.citySeeds[i],height=city?a.h:Math.min(a.h,12);dummy.position.set(city?Math.sign(a.x)*Math.max(48,Math.abs(a.x)):a.x,-5+height/2,mod(a.z+travel,1500)-1120);dummy.scale.set(a.w,height,a.d);dummy.rotation.set(0,0,0);dummy.updateMatrix();this.buildings.setMatrixAt(i,dummy.matrix);
        this.buildings.setColorAt(i,new THREE.Color().setHSL(.08+a.shade*.1,.05+a.shade*.10,.70+a.shade*.22));
      }this.buildings.instanceMatrix.needsUpdate=true;this.buildings.instanceColor.needsUpdate=true;
    }
    this.trafficRoot.visible=city;
    if(city){
      for(let i=0;i<this.trafficSeeds.length;i++){
        const a=this.trafficSeeds[i],z=mod(a.z+travel+time*a.dir*12,1500)-1120;
        dummy.position.set(a.x,-4.35,z);dummy.scale.set(1.6,.85,3.7);dummy.rotation.set(0,0,0);dummy.updateMatrix();this.traffic.setMatrixAt(i,dummy.matrix);
        this.traffic.setColorAt(i,new THREE.Color().setHSL(a.color,.15+a.color*.35,.45+a.color*.35));
        dummy.position.y=-3.77;dummy.scale.set(1.35,.40,1.95);dummy.updateMatrix();this.trafficWindows.setMatrixAt(i,dummy.matrix);
        for(let j=0;j<2;j++){dummy.position.set(a.x+(j?.5:-.5),-4.32,z+a.dir*1.85);dummy.scale.setScalar(1);dummy.updateMatrix();this.trafficLights.setMatrixAt(i*2+j,dummy.matrix);}
      }
      this.traffic.instanceMatrix.needsUpdate=this.trafficWindows.instanceMatrix.needsUpdate=this.trafficLights.instanceMatrix.needsUpdate=true;this.traffic.instanceColor.needsUpdate=true;
    }
    this.ocean.visible=coast;this.beach.visible=coast;this.boats.visible=coast;this.river.visible=!!river;this.riverBanks.visible=!!river;
    this.oceanMat.uniforms.uTime.value=time;this.oceanMat.uniforms.uDusk.value=smooth(14,18,route.hour);
    this.viaducts.batches.forEach(b=>b.mesh.visible=(!!river||city)&&!(city&&b.mesh.material.name==='vermilion'));
    if(river||city){for(let i=0;i<70;i++)this.viaducts.set(i,3.5,0,mod(i*20+travel,1400)-1000);this.viaducts.commit();}
    this.fuji.visible=['fuji','coast','tea'].includes(terrain);this.fuji.position.set(-500,-5,-680+Math.sin(time*.004)*75);
    this.tower.visible=city;this.tower.position.z=-420+route.t*160;
    this.tokyoStation.visible=route.c.id==='arrival';this.tokyoStation.position.z=-motor.s-220+route.t*200;
    this.track.position.z=-motor.s+mod(travel,1.1);this.catenary.position.z=mod(travel,45)-22;
    this.tunnelRoot.position.z=-motor.s;this.tunnelRoot.visible=route.tunnel>.01;
    if(this.tunnelRoot.visible){for(let i=0;i<75;i++)this.rings.set(i,0,0,mod(i*12+travel,900)-670);this.rings.commit();}
    this.tunnelLight.intensity=route.tunnel*(inside?2:15);this.tunnelLight.position.set(0,5.5,-motor.s-3);
    this.sister.visible=route.c.id==='kiso'&&route.t>.35&&route.t<.52||city&&route.t>.15&&route.t<.32;
    if(this.sister.visible)this.sister.position.set(7,0,-motor.s-560+(route.t-(city?.15:.35))*6500);
    let warning=false,hit=false;
    for(let i=0;i<this.hoops.length;i++){
      const hoop=this.hoops[i],z=mod(time*18+i*180,540)-440;
      hoop.root.position.set(0,0,-motor.s+z);hoop.root.visible=time>35&&!inside&&time<1780;
      if(hoop.root.visible&&z>-55&&z<3)warning=true;
      hoop.previous=z;
    }
    this.warning=warning;this.hit=hit;
    for(const p of this.seals){p.root.visible=!postcards.has(p.id)&&Math.abs(-p.root.position.z-motor.s)<100&&(p.root.position.y<2)===inside;p.card.position.y=.14+Math.sin(time*2)*.05;p.card.rotation.y=time*.3;}
    const attr=this.particles.geometry.attributes.position;
    this.particleSeeds.forEach((p,i)=>{attr.setXYZ(i,p.x+Math.sin(time*.8+p.phase)*1.5,p.y+Math.sin(time+p.phase)*.5,-motor.s+mod(p.z+travel*1.3,120)-90);});attr.needsUpdate=true;
    this.particles.material.opacity=route.tunnel>.5?.12:terrain==='paddy'?.65:.28;
    this.birds.position.set(0,Math.sin(time)*1.2,-motor.s+Math.sin(time*.07)*15);this.birds.visible=coast||river;
    for(const n of this.npcs){if(n.cat){n.cat.group.visible=inside;n.cat.update(dt,0,true);}}
  }
}
function kitMat(kit,name){return kit.materials.get(name);}
