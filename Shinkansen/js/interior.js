// The travelling rooms. All dimensions share the motor's real floor and aisle.
import * as THREE from 'three';
import {mergeTemplate} from './assets.js';
import {M} from '../../labs/shared/painted.js';
import {chochin,washiTexture} from '../../labs/shared/paperlantern.js';
import {CAR_LENGTH,CAR_PITCH,FLOOR} from './route.js';
const cube=new THREE.BoxGeometry(1,1,1);
function put(g,geo,mat,p,s=[1,1,1]){const m=new THREE.Mesh(geo,mat);m.position.set(...p);m.scale.set(...s);g.add(m);return m;}
const box=(g,m,p,s)=>put(g,cube,m,p,s);
function artwork(kind){
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');
  x.fillStyle='#eee7d0';x.fillRect(0,0,256,256);
  if(kind==='map'){
    x.fillStyle='#254d52';x.font='18px Georgia';x.fillText('東海道  /  EASTBOUND',18,34);
    x.strokeStyle='#a48b59';x.lineWidth=3;x.beginPath();x.moveTo(24,130);x.bezierCurveTo(85,180,120,70,232,105);x.stroke();
    ['京都','近江','富士','東京'].forEach((t,i)=>{const px=28+i*65,py=135-Math.sin(i)*34;x.fillStyle='#c37e60';x.beginPath();x.arc(px,py,5,0,7);x.fill();x.fillStyle='#254d52';x.font='15px serif';x.fillText(t,px-14,py+29);});
    x.font='italic 14px Georgia';x.fillText('a little cat, a long way home',32,222);
  }else if(kind==='menu'){
    x.fillStyle='#254c45';x.fillRect(8,8,240,240);x.fillStyle='#e9d6a7';x.textAlign='center';
    ['雲 の カ フ ェ','CLOUD CAFÉ','────────','ほうじ茶   Hōjicha','抹茶   Matcha','季節の和菓子','Tea & little sweet things'].forEach((t,i)=>{x.font=i===0?'22px serif':i===1?'17px Georgia':'15px Georgia';x.fillText(t,128,42+i*27);});
  }else{
    x.fillStyle='#b9cbb6';x.fillRect(15,15,226,226);
    for(let i=0;i<4;i++){x.fillStyle=['#9eafa5','#7b9c8c','#567e68','#e4e8d0'][i];x.beginPath();x.moveTo(15,230);x.lineTo(15,170-i*17);x.quadraticCurveTo(100,40+i*23,241,135+i*12);x.lineTo(241,241);x.lineTo(15,241);x.fill();}
    x.fillStyle='#d3ad69';x.beginPath();x.arc(178,55,18,0,7);x.fill();
    x.fillStyle='#264e48';x.font='16px Georgia';x.fillText('旅の余白  /  slow moments',27,223);
  }
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshStandardMaterial({map:tex,roughness:.85});
}
export class TravellingRooms{
  constructor(train,kit,label){
    this.portals=[];this.groups=[];this.kit=kit;this.label=label;
    this.mat={ivory:M.plain(0xe6e3d2,{rough:.76,brush:.025}),wood:M.wood({base:0x886744,dark:0x6b5038}),gold:M.bronze({color:0xb79a61,metal:.35}),sage:M.cloth({color:0x678b7f}),dark:M.plain(0x263d40),carpet:M.cloth({color:0x3c6264}),light:new THREE.MeshStandardMaterial({color:0xffedc9,emissive:0xffd49b,emissiveIntensity:.75}),glass:new THREE.MeshStandardMaterial({color:0xacc8c0,transparent:true,opacity:.13,depthWrite:false,roughness:.25}),map:artwork('map'),menu:artwork('menu'),print:artwork('print')};
    for(let i=6;i<=9;i++)this.car(train,kit,i);
    for(let i=6;i<9;i++)this.gangway(train,i);
    this.light=new THREE.PointLight(0xffe8c6,3.3,13,1.4);train.add(this.light);
  }
  car(train,kit,index){
    const root=new THREE.Group();root.name=index<8?'Window-seat saloon':'Cloud Café';root.position.z=-index*CAR_PITCH-CAR_LENGTH/2;train.add(root);this.groups.push(root);
    const g=new THREE.Group();root.add(g);const m=this.mat,cafe=index>=8;
    box(g,m.wood,[0,FLOOR-.025,0],[3.38,.04,24.98]);
    box(g,m.carpet,[0,FLOOR+.002,0],[1.50,.012,24.97]);
    for(const x of [-.73,.73])box(g,m.gold,[x,FLOOR+.012,0],[.018,.006,24.98]);
    // Recessed timber panels, framed windows and cream roller blinds.
    for(const side of [-1,1]){
      box(g,m.wood,[side*1.62,1.60,0],[.065,.88,24.8]);
      box(g,m.ivory,[side*1.61,2.045,0],[.14,.07,24.8]);
      box(g,m.gold,[side*1.68,2.11,0],[.08,.018,24.8]);
      box(g,m.dark,[side*1.61,1.21,0],[.05,.10,24.8]);
      for(let j=0;j<11;j++){
        const z=-9.275+j*1.85;
        for(const dz of [-.81,.81])box(g,m.ivory,[side*1.64,2.75,z+dz],[.12,1.26,.075]);
        box(g,m.ivory,[side*1.64,3.38,z],[.12,.09,1.7]);
        box(g,m.ivory,[side*1.66,3.23,z],[.10,.21,1.58]);
        box(g,m.gold,[side*1.60,3.13,z],[.018,.015,1.58]);
        if(cafe){box(g,m.wood,[side*1.48,2.08,z],[.28,.065,1.55]);}
      }
      // Rounded soffits, indirect amber cove light and slatted luggage racks.
      box(g,m.ivory,[side*1.40,3.52,0],[.48,.32,24.7]);
      box(g,m.light,[side*1.15,3.49,0],[.04,.045,24.4]);
      if(!cafe){
        for(const x of [1.17,1.31,1.45,1.59])box(g,m.gold,[side*x,3.19,0],[.035,.035,20.8]);
        for(let z=-10;z<=10;z+=1.85)box(g,m.gold,[side*1.39,3.19,z],[.55,.045,.045]);
        for(let j=0;j<4;j++){
          const z=-7+j*4.5;box(g,j%2?m.dark:m.sage,[side*1.4,3.36,z],[.38,.26,.65]);
          box(g,m.gold,[side*1.4,3.50,z],[.14,.025,.30]);
        }
      }
    }
    // A softly arched ceiling, with a continuous central lighting channel.
    const pts=[];for(let i=0;i<=20;i++){const x=-1.66+i*3.32/20;pts.push(new THREE.Vector2(x,3.57+.20*(1-(x/1.66)**2)));}
    const verts=[],idx=[];pts.forEach(p=>verts.push(p.x,p.y,-12.47,p.x,p.y,12.47));
    for(let i=0;i<20;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
    const ceiling=new THREE.BufferGeometry();ceiling.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));ceiling.setIndex(idx);ceiling.computeVertexNormals();
    const ceilMat=m.ivory.clone();ceilMat.side=THREE.DoubleSide;put(g,ceiling,ceilMat,[0,0,0]);
    box(g,m.wood,[0,3.71,0],[.6,.04,24.8]);
    for(let z=-10;z<=10;z+=3.2){box(g,m.light,[0,3.676,z],[.32,.025,1.55]);}
    if(cafe)this.cafe(g,kit,index);else this.seating(g,kit,index);
    for(const end of [-1,1]){
      const z=end*10.9,terminal=(index===6&&end===1)||(index===9&&end===-1);
      for(const side of [-1,1]){
        box(g,m.wood,[side*1.30,2.30,z],[.64,2.3,.14]);
        const art=put(g,new THREE.PlaneGeometry(.43,.57),cafe?m.menu:m.print,[side*1.30,2.57,z-end*.085]);art.rotation.y=end>0?Math.PI:0;
      }
      box(g,m.ivory,[0,3.40,z],[2.05,.26,.18]);
      const sign=put(g,new THREE.PlaneGeometry(1.48,.23),this.label(terminal?'旅  EASTBOUND':index===7&&end===-1?'雲のカフェ  →  CAFÉ':'窓の車両  ·  WINDOW SALOON'),[0,3.40,z-end*.10]);sign.rotation.y=end>0?Math.PI:0;
      const portal=new THREE.Group();portal.position.z=z;portal.userData.sliding=true;g.add(portal);const panels=[];
      for(const side of [-1,1]){
        const panel=new THREE.Group();portal.add(panel);panels.push({panel,side});
        box(panel,m.sage,[0,2.25,0],[.90,2.20,.075]);
        box(panel,m.glass,[0,2.67,-end*.045],[.68,.65,.012]);
        box(panel,m.gold,[-side*.32,2.12,-end*.065],[.025,.30,.025]);
      }
      this.portals.push({panels,s:index*CAR_PITCH+12.5-z,terminal,open:0});
      box(g,m.gold,[0,FLOOR+.014,z],[1.9,.016,.22]);
    }
    // Flatten static detail by material; moving doors retain their own meshes.
    const doors=g.children.filter(o=>o.userData.sliding);doors.forEach(o=>g.remove(o));root.remove(g);
    const parts=mergeTemplate(g);g.clear();for(const p of parts){const o=put(g,p.geometry,p.material,[0,0,0]);o.receiveShadow=true;}
    doors.forEach(o=>g.add(o));root.add(g);
  }
  seating(g,kit,index){
    const m=this.mat;
    for(let row=0;row<8;row++)for(const side of [-1,1]){
      const z=-8.5+row*2.5,seat=kit.clone('seat_pair');seat.position.set(side*1.23,FLOOR,z);seat.scale.set(.53,.91,.9);g.add(seat);
      // Seat-back pockets and individual inset tables.
      box(g,m.dark,[side*1.23,1.78,z+.41],[.63,.22,.025]);
      box(g,m.ivory,[side*1.23,1.83,z+.43],[.34,.12,.012]);
      if(row%3===1){const tea=kit.clone('tea_set');tea.position.set(side*1.23,2.03,z+.5);tea.scale.setScalar(.27);g.add(tea);}
    }
    const route=put(g,new THREE.PlaneGeometry(.70,.70),m.map,[-1.575,2.68,9.4]);route.rotation.y=Math.PI/2;
  }
  cafe(g,kit,index){
    const m=this.mat,counter=kit.clone('cafe_counter');counter.position.set(1.15,FLOOR,0);g.add(counter);
    // Cabinet stiles and a tiled, tea-coloured back bar.
    box(g,m.wood,[1.58,2.45,0],[.12,.65,5.9]);
    for(const z of [-2.2,-.8,.8,2.2]){
      box(g,m.gold,[.73,1.72,z],[.025,.025,.9]);
      box(g,m.wood,[1.40,2.94,z],[.40,.04,1.2]);
      for(let j=0;j<3;j++){
        put(g,new THREE.CylinderGeometry(.055,.045,.13,10),m.ivory,[1.38,3.025,z-.35+j*.27]);
      }
    }
    for(const z of [-8,-5.5,5.5,8]){
      box(g,m.wood,[-1.18,1.91,z],[.84,.10,1.18]);box(g,m.gold,[-1.18,1.53,z],[.055,.76,.055]);
      const tea=kit.clone('tea_set');tea.position.set(-1.18,1.98,z);tea.scale.setScalar(.65);g.add(tea);
      for(const dz of [-.74,.74]){
        box(g,m.sage,[-1.17,1.60,z+dz],[.67,.16,.51]);box(g,m.wood,[-1.17,1.36,z+dz],[.10,.43,.13]);
        box(g,m.sage,[-1.17,1.90,z+dz+Math.sign(dz)*.20],[.67,.57,.10]);
      }
      put(g,new THREE.SphereGeometry(.09,10,6),M.plain(0xbd8757),[-1.38,2.025,z+.24],[1,.45,.75]);
    }
    for(const z of [-7,0,7]){
      const lantern=chochin({h:.33,belly:.115,glow:.5,tex:washiTexture({ribs:16,seed:17})});lantern.position.set(-.92,3.27,z);g.add(lantern);
    }
    for(const side of [-1,1]){
      const menu=put(g,new THREE.PlaneGeometry(.72,.80),m.menu,[side*1.575,2.68,4.0]);menu.rotation.y=-side*Math.PI/2;
      // Tiny ceramic vase with foliage and a seasonal flower.
      put(g,new THREE.CylinderGeometry(.045,.075,.19,12),m.ivory,[side*1.43,2.20,-4.4]);
      box(g,m.sage,[side*1.43,2.40,-4.4],[.012,.25,.012]);
      put(g,new THREE.IcosahedronGeometry(.085,1),M.plain(0xe5b8ba),[side*1.43,2.53,-4.4],[1,.45,1]);
    }
  }
  gangway(train,i){
    const g=new THREE.Group();g.name='Enclosed flexible gangway';g.position.z=-(i*CAR_PITCH+25.425);train.add(g);const m=this.mat;
    box(g,m.dark,[0,1.09,0],[3.04,.12,.92]);box(g,m.carpet,[0,1.152,0],[1.50,.012,.92]);
    for(const side of [-1,1])box(g,m.ivory,[side*1.38,2.39,0],[.14,2.48,.94]);
    box(g,m.ivory,[0,3.66,0],[2.90,.10,.94]);
    for(let z=-.42;z<=.42;z+=.12){
      for(const side of [-1,1])box(g,m.dark,[side*1.48,2.40,z],[.08,2.58,.045]);
      box(g,m.dark,[0,3.73,z],[3.04,.055,.045]);box(g,m.gold,[0,1.164,z],[2.74,.015,.025]);
    }
    box(g,m.light,[0,3.59,0],[.36,.02,.45]);
    const parts=mergeTemplate(g);g.clear();g.position.z=0;
    for(const p of parts)put(g,p.geometry,p.material,[0,0,0]);
  }
  update(dt,motor,cameraS=motor.s-4){
    for(const portal of this.portals){
      const target=!portal.terminal&&(Math.abs(portal.s-motor.s)<7||Math.abs(portal.s-cameraS)<6)?1:0;
      portal.open+=(target-portal.open)*Math.min(1,dt*7);
      for(const {panel,side} of portal.panels)panel.position.x=side*(.46+portal.open*.99);
    }
    this.light.position.set(0,3.15,-motor.s+1.2);this.light.intensity=motor.mode==='interior'?3.3:0;
    for(const g of this.groups)g.visible=Math.abs(-g.position.z-motor.s)<65;
  }
}
