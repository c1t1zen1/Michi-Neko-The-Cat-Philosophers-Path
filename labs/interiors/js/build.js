import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { UNIT, LAYOUTS } from './data.js';
import { material, plain, artwork, shadowTexture, random, PALETTE, isSharedResource } from './materials.js';

const boxCache=new Map();
export function box(parent,w,h,d,mat,x=0,y=0,z=0,rounded=0) {
  const key=[w,h,d,rounded].join('/');
  if(!boxCache.has(key))boxCache.set(key,rounded?new RoundedBoxGeometry(w,h,d,2,rounded):new THREE.BoxGeometry(w,h,d));
  const m=new THREE.Mesh(boxCache.get(key),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;
}
export function mesh(parent,geo,mat,x=0,y=0,z=0) {const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function rod(parent,a,b,r,mat,r2=r) {const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),dir=bv.clone().sub(av);const m=mesh(parent,new THREE.CylinderGeometry(r2,r,dir.length(),7),mat);m.position.copy(av.add(bv).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());return m;}
export function contact(parent,x,y,z,w,d,opacity=.65) { const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({map:shadowTexture(),transparent:true,opacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));m.rotation.x=-Math.PI/2;m.position.set(x,y,z);parent.add(m);return m; }

export function tatami(parent,w=UNIT,d=UNIT*2,finish='fresh',border='moss') {
  const group=new THREE.Group();parent.add(group);
  const core=box(group,w-.012,.043,d-.012,material('tatami','aged'),0,.0215,0,.006);
  const face=box(group,w-.016,.012,d-.016,material('tatami',finish),0,.049,0,.003);
  const hems=new THREE.Group();group.add(hems);
  // Local long axis is z. Half mats get the same two long-side borders.
  for(const side of [-1,1])box(hems,.033,.014,d-.009,material('heri',border),side*(w/2-.024),.053,0,.002);
  return {group,core,face,hems,explode(v){face.position.y=.049+v*.44;hems.position.y=v*.74;core.position.y=.0215;}};
}

/** Revolve the outer wall, lip, inner wall and base as one genuinely hollow profile. */
export function vessel(parent,type='bowl',finish='cream',scale=1) {
  const bowl=[[.001,0],[.058,0],[.061,.016],[.075,.029],[.11,.065],[.123,.108],[.12,.124],[.11,.124],[.104,.107],[.095,.068],[.065,.037],[.001,.033]];
  const vase=[[.001,0],[.055,0],[.075,.025],[.09,.095],[.065,.18],[.032,.23],[.034,.28],[.028,.285],[.024,.275],[.023,.23],[.053,.18],[.078,.095],[.063,.035],[.001,.027]];
  const cup=[[.001,0],[.04,0],[.044,.012],[.055,.09],[.053,.12],[.045,.123],[.044,.1],[.034,.023],[.001,.02]];
  const points=(type==='vase'?vase:type==='cup'?cup:bowl).map(([x,y])=>new THREE.Vector2(x*scale,y*scale));
  const geo=new THREE.LatheGeometry(points,28);const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const y=p.getY(i),a=Math.atan2(p.getZ(i),p.getX(i));const wobble=1+Math.sin(a*3+1)*.022+Math.sin(a*7+y*10)*.009;p.setXYZ(i,p.getX(i)*wobble,y+Math.sin(a*5)*.0017*scale,p.getZ(i)*wobble);}
  geo.computeVertexNormals();return mesh(parent,geo,material('ceramic',finish,{side:THREE.DoubleSide,roughness:finish==='dark'?.5:.28}));
}

export function screen(parent,type='shoji',wood='cedar',width=UNIT,height=1.85) {
  const root=new THREE.Group();parent.add(root);const timber=material('wood',wood);
  const layers={frame:new THREE.Group(),lattice:new THREE.Group(),paper:new THREE.Group()};root.add(...Object.values(layers));
  for(const x of [-width/2+.026,width/2-.026])box(layers.frame,.052,height,.045,timber,x,height/2,0);
  for(const y of [.035,height-.035])box(layers.frame,width,.07,.045,timber,0,y,0);
  if(type==='sudare') {
    const reed=material('tatami','gold');
    for(let i=0;i<65;i++)box(layers.lattice,width-.09,.013,.015,reed,0,.09+i*(height-.18)/65,0);
    for(const x of [-width*.3,width*.3])box(layers.frame,.01,height-.1,.022,plain('#595742'),x,height/2,.015);
  } else if(type==='fusuma') {
    const m=new THREE.MeshStandardMaterial({map:artwork('maple'),roughness:.98,side:THREE.DoubleSide});
    box(layers.paper,width-.07,height-.08,.022,m,0,height/2,-.012);
    const handle=mesh(layers.frame,new THREE.TorusGeometry(.035,.008,6,16),plain('#3d4136'),width*.28,.83,.035);handle.rotation.y=0;
  } else {
    const paper=new THREE.MeshStandardMaterial({map:artwork('paper-shadow'),bumpMap:material('paper','cream').bumpMap,bumpScale:.007,roughness:1,emissive:0xe8ce98,emissiveIntensity:.16,side:THREE.DoubleSide});
    const bottom=type==='yukimi'?.53:.09;
    box(layers.paper,width-.08,height-bottom-.06,.012,paper,0,bottom+(height-bottom-.06)/2,-.018);
    if(type==='yukimi') {
      box(layers.paper,width-.09,.43,.009,new THREE.MeshStandardMaterial({color:0xadc0b6,transparent:true,opacity:.14,roughness:.25,depthWrite:false}),0,.29,-.018);
      box(layers.frame,width,.035,.03,timber,0,.54,0);
    }
    const nx=type==='fine'?6:3,ny=type==='fine'?10:6;
    for(let i=1;i<nx;i++)box(layers.lattice,.012,height-.14,.022,timber,-width/2+i*width/nx,height/2,.004);
    for(let i=1;i<ny;i++){const y=bottom+i*(height-bottom-.08)/ny;box(layers.lattice,width-.07,.013,.022,timber,0,y,.009);}
    // Both faces show the wooden lattice when viewed from the garden.
    const back=layers.lattice.clone();back.position.z=-.044;layers.lattice.add(back);
    root.userData.paper=paper;
  }
  for(const layer of Object.values(layers))mergeStatic(layer);
  return {root,layers,explode(v){layers.paper.position.z=-v*.6;layers.lattice.position.z=v*.4;}};
}

function cushion(parent,x,z,finish='rust',y=.06) {
  const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);
  const geometry=new RoundedBoxGeometry(.59,.13,.55,3,.055),points=geometry.attributes.position;
  for(let i=0;i<points.count;i++){const x=points.getX(i),y=points.getY(i),z=points.getZ(i);if(y>0)points.setY(i,y+.025*Math.max(0,1-(x/.295)**2)*Math.max(0,1-(z/.275)**2));}
  geometry.computeVertexNormals();const m=mesh(g,geometry,material('cloth',finish));m.position.y=.075;
  const seam=plain(PALETTE[finish]||'#777253');
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;rod(g,[0,.151,0],[Math.cos(a)*.035,.145,Math.sin(a)*.035],.0025,seam);}
  for(const sx of [-1,1])for(const sz of [-1,1])rod(g,[sx*.2,.065,sz*.2],[sx*.26,.04,sz*.25],.004,seam);
  return g;
}

function andon(parent,x,z,wood='dark') {
  const g=new THREE.Group();g.position.set(x,.06,z);parent.add(g);const timber=material('wood',wood);
  box(g,.31,.055,.31,timber,0,.027,0,.01);box(g,.27,.035,.27,timber,0,.62,0,.008);
  const paper=material('paper','cream',{emissive:0xffc376,emissiveIntensity:.6}).clone();box(g,.24,.53,.24,paper,0,.325,0,.006);
  for(const x0 of [-.125,.125])for(const z0 of [-.125,.125])box(g,.022,.57,.022,timber,x0,.33,z0);
  for(const y of [.19,.44]){box(g,.26,.009,.012,timber,0,y,.13);box(g,.012,.009,.26,timber,.13,y,0);}
  const l=new THREE.PointLight(0xffbd73,0,3.6,2);l.position.set(0,.48,0);g.add(l);mergeStatic(g);return {g,light:l,paper};
}

function tokonoma(parent,w,d,recipe) {
  const g=new THREE.Group();parent.add(g);const wood=material('wood',recipe.wood),plaster=material('plaster',recipe.wall);
  box(g,w,.12,.64,wood,0,.01,-d/2-.34,.012);
  box(g,w,2.25,.06,plaster,0,1.08,-d/2-.67);
  box(g,.09,2.25,.66,wood,-w/2,1.08,-d/2-.34);
  box(g,.09,2.25,.66,wood,w/2,1.08,-d/2-.34);
  // An off-centre tokobashira separates the scroll bay from chigaidana shelves.
  const postX=w*.19;rod(g,[postX,.06,-d/2-.08],[postX+.018,2.15,-d/2-.08],.045,wood,.035);
  box(g,w, .13,.15,wood,0,2.18,-d/2-.08);
  const scrollX=-w*.16,scrollZ=-d/2-.625;
  box(g,.7,1.32,.018,material('cloth',recipe.accent),scrollX,1.28,scrollZ,.003);
  const artMat=new THREE.MeshStandardMaterial({map:artwork(recipe.season==='autumn'?'maple':'landscape',recipe.season),roughness:1});
  box(g,.53,.91,.022,artMat,scrollX,1.27,scrollZ+.014);
  for(const y of [.6,1.96])rod(g,[scrollX-.38,y,scrollZ],[scrollX+.38,y,scrollZ],.017,wood);
  const shelfX=w*.34;
  box(g,w*.25,.035,.42,wood,shelfX,.57,-d/2-.37);box(g,w*.25,.035,.42,wood,shelfX,.94,-d/2-.37);
  const v=vessel(g,'vase',recipe.accent,1.2);v.position.set(-w*.3,.075,-d/2-.31);
  const stemMat=plain('#62664a');
  for(let i=0;i<3;i++){
    const x=-w*.3,z=-d/2-.31,end=[x+(i-1)*.11,.56+i*.09,z+(i-1)*.04];rod(g,[x,.32,z],end,.007,stemMat,.004);
    for(let j=0;j<3;j++){const leaf=mesh(g,new THREE.SphereGeometry(.042,7,5),plain(recipe.season==='autumn'?'#ba7147':recipe.season==='winter'?'#d1b5a2':'#c9c29a'),end[0]+Math.sin(j*2)*.026,end[1]+j*.007,end[2]+Math.cos(j*2)*.025);leaf.scale.y=.4;}
  }
  box(g,.16,.065,.12,material('wood','dark'),shelfX,.99,-d/2-.37,.015);
  return g;
}

function garden(parent,w,d,recipe) {
  const g=new THREE.Group();parent.add(g);const rnd=random(701);const gx=w/2+1.87;
  const ground=recipe.season==='winter'?'#ccd0b9':'#71805a';
  box(g,2.15,.14,d+.9,material('plaster','earth'),gx,-.23,-.18,.04);
  box(g,2.06,.05,d+.8,plain(ground),gx,-.135,-.18,.04);
  box(g,.08,.85,d+.94,material('wood','dark'),gx+1.06,.15,-.18);
  for(let i=0;i<12;i++)box(g,.022,.9,d/14,material('wood','cedar'),gx+1.008,.18,-d/2-.5+i*(d+.8)/12);
  for(let i=0;i<30;i++){
    const x=gx+(rnd()-.5)*1.8,z=(rnd()-.5)*(d+.3),s=.08+rnd()*.18;
    const stone=mesh(g,new THREE.DodecahedronGeometry(s,0),plain(i%4===0?'#a6ad98':'#888f79'),x,-.1,z);stone.scale.set(1,.4+rnd()*.5,1.2);stone.rotation.set(rnd(),rnd()*3,rnd());
  }
  for(let i=0;i<4;i++){const z=d/2-.25-i*.56;const s=mesh(g,new THREE.CylinderGeometry(.23,.25,.07,9),plain('#aaa998'),gx-.48,-.09,z);s.rotation.y=i*.7;}
  const basin=vessel(g,'bowl','sage',3);basin.position.set(gx+.18,-.09,.76);
  const water=mesh(g,new THREE.CircleGeometry(.27,32),new THREE.MeshStandardMaterial({color:0x738c85,roughness:.2,metalness:.15,transparent:true,opacity:.8}),gx+.18,.19,.76);water.rotation.x=-Math.PI/2;
  rod(g,[gx-.15,.32,.9],[gx+.4,.32,.9],.022,plain('#9a9e67'));
  const trunkX=gx+.28,trunkZ=-d*.28,bark=material('wood','dark');
  const path=new THREE.CatmullRomCurve3([new THREE.Vector3(trunkX,-.15,trunkZ),new THREE.Vector3(trunkX-.1,.65,trunkZ),new THREE.Vector3(trunkX-.25,1.25,trunkZ+.1),new THREE.Vector3(trunkX-.42,1.95,trunkZ-.03)]);
  mesh(g,new THREE.TubeGeometry(path,10,.055,7,false),bark);
  for(let i=0;i<6;i++)rod(g,[trunkX-.18,1.03+i*.12,trunkZ],[trunkX-.5+Math.sin(i*2)*.6,1.75+i*.11,trunkZ+Math.cos(i*2)*.6],.025,bark,.009);
  const shape=new THREE.Shape();const coords=[[0,.12],[.025,.045],[.09,.07],[.055,.015],[.1,-.015],[.035,-.03],[.025,-.08],[0,-.045],[-.035,-.08],[-.04,-.025],[-.1,-.015],[-.06,.02],[-.09,.07],[-.025,.045]];coords.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
  const leaves=new THREE.InstancedMesh(new THREE.ShapeGeometry(shape),new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,side:THREE.DoubleSide}),125);
  const dummy=new THREE.Object3D(),cols=recipe.season==='autumn'?['#ac6540','#bf7a45','#8c653a']:recipe.season==='winter'?['#9ba38c','#c0c5b0','#899078']:['#7e9553','#99a962','#617c49'];
  for(let i=0;i<125;i++){
    const a=rnd()*Math.PI*2,r=Math.sqrt(rnd())*.9;
    dummy.position.set(trunkX-.3+Math.cos(a)*r,1.95+rnd()*.45-r*.22,trunkZ+Math.sin(a)*r*.85);dummy.rotation.set(-.65+rnd(),rnd()*6,rnd()*3);dummy.scale.setScalar(.8+rnd()*.9);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);leaves.setColorAt(i,new THREE.Color(cols[i%3]));
  }
  leaves.castShadow=true;g.add(leaves);
  if(recipe.season==='winter'){const snow=mesh(g,new THREE.SphereGeometry(.2,10,6),plain('#d8dbc9'),gx+.7,.18,-.4);snow.scale.set(1.4,.5,1);}
  return {g,leaves,water};
}

function furniture(parent,recipe,w,d) {
  const g=new THREE.Group();parent.add(g);const wood=material('wood',recipe.wood),platforms=[],solids=[],knockables=[];
  const addPlatform=(x,z,pw,pd,top,name)=>{const p={x0:x-pw/2,x1:x+pw/2,z0:z-pd/2,z1:z+pd/2,top,bottom:.06,name};platforms.push(p);solids.push(p);return p;};
  const f=recipe.furniture;let table=null;
  if(f==='ceremony') {
    const brazier=mesh(g,new THREE.CylinderGeometry(.22,.18,.24,16),plain('#766f5c'),.4,.18,-.1);
    const kettle=mesh(g,new THREE.SphereGeometry(.15,16,10),plain('#42463f'),.4,.41,-.1);kettle.scale.y=.8;
    mesh(g,new THREE.CylinderGeometry(.06,.06,.025,12),plain('#45473e'),.4,.54,-.1);
    const handle=mesh(g,new THREE.TorusGeometry(.13,.012,6,18,Math.PI),plain('#3c3e36'),.4,.47,-.1);handle.rotation.y=Math.PI/2;
    const tea=vessel(g,'bowl','dark',1.1);tea.position.set(-.35,.06,.2);
    const whisk=mesh(g,new THREE.CylinderGeometry(.025,.04,.1,12,1,true),material('tatami','gold'),-.12,.11,.2);
    for(let i=0;i<12;i++)rod(g,[-.12+Math.sin(i)*.025,.16,.2+Math.cos(i)*.025],[-.12+Math.sin(i)*.04,.2,.2+Math.cos(i)*.04],.0015,plain('#b5a36e'));
    solids.push({x0:.13,x1:.67,z0:-.37,z1:.17,top:.6,name:'brazier',noLand:true});
  } else if(f==='futon') {
    box(g,1.12,.16,1.75,material('cloth','cream'),-.33,.14,-.1,.075);
    box(g,1.1,.13,1.27,material('cloth',recipe.accent),-.33,.27,.12,.06);
    box(g,.66,.13,.3,material('cloth','cream'),-.33,.27,-.68,.055);
    addPlatform(-.33,-.1,1.12,1.75,.34,'futon');
    table={x:1.05,z:.48,w:.62,d:.6,top:.51};
  } else {
    table={x:f==='desk'?-.25:-.16,z:f==='desk'?-.55:.05,w:f==='workbench'?1.55:f==='desk'?1.3:1.35,d:f==='desk'?.65:1.0,top:f==='workbench'?.7:f==='desk'?.48:.59};
  }
  if(table) {
    const {x,z,w:tw,d:td,top}=table;
    contact(g,x,.061,z,tw*1.6,td*1.5,.65);
    if(f==='round')mesh(g,new THREE.CylinderGeometry(.7,.7,.065,40),wood,x,top-.032,z);
    else box(g,tw,.065,td,wood,x,top-.032,z,.025);
    for(const sx of [-1,1])for(const sz of [-1,1])box(g,.07,top-.12,.07,wood,x+sx*(tw/2-.14),(top-.12)/2+.06,z+sz*(td/2-.14),.009);
    const p=addPlatform(x,z,f==='round'?1.32:tw,f==='round'?1.32:td,top,f==='desk'?'writing desk':f==='workbench'?'workbench':'table');
    if(f==='round')p.round={x,z,r:.7};
    if(f==='kotatsu') {
      const geo=new THREE.PlaneGeometry(2.08,1.8,16,16);geo.rotateX(-Math.PI/2);const pos=geo.attributes.position;
      for(let i=0;i<pos.count;i++){const px=pos.getX(i),pz=pos.getZ(i),over=Math.max(Math.abs(px)-tw/2+.04,Math.abs(pz)-td/2+.04,0);pos.setY(i,top-.075-Math.min(.4,over*1.05)+Math.sin(px*24+pz*19)*.018*over/.35);}
      geo.computeVertexNormals();const quilt=mesh(g,geo,material('cloth',recipe.accent,{side:THREE.DoubleSide}),x,0,z);quilt.receiveShadow=true;
    }
    if(f==='desk') {
      box(g,.4,.007,.28,plain('#e1dbc6'),x-.25,top+.008,z-.06);box(g,.32,.012,.22,plain('#d4d0b8'),x-.23,top+.019,z-.035);
      rod(g,[x-.36,top+.029,z-.03],[x-.1,top+.029,z-.12],.008,plain('#4c4637'));
      box(g,.12,.02,.06,plain('#474b42'),x+.04,top+.015,z-.1,.006);
    }
    // Cups are dynamic, never merged with the construction meshes.
    const count=f==='workbench'?5:3;
    for(let i=0;i<count;i++) {
      const type=i===1?'bowl':'cup',v=vessel(g,type,i%3===0?'cream':i%3===1?'indigo':recipe.accent,1.15);
      const px=x+(i-(count-1)/2)*(f==='workbench'?.23:.28),pz=z+(i%2===0?.16:-.18);
      v.position.set(px,top+.004,pz);v.userData.dynamic=true;
      knockables.push({mesh:v,home:v.position.clone(),velocity:new THREE.Vector3(),spin:new THREE.Vector3(),active:false,settled:false,radius:.09,support:p});
    }
    if(f!=='desk'&&f!=='workbench') {
      const teapot=mesh(g,new THREE.SphereGeometry(.12,16,10),material('ceramic',recipe.accent),x-.35,top+.1,z-.22);teapot.scale.y=.78;
      mesh(g,new THREE.CylinderGeometry(.055,.055,.025,12),wood,x-.35,top+.2,z-.22);
      rod(g,[x-.28,top+.1,z-.22],[x-.14,top+.16,z-.22],.035,material('ceramic',recipe.accent),.02);
      const handle=mesh(g,new THREE.TorusGeometry(.08,.014,7,18),material('ceramic',recipe.accent),x-.46,top+.1,z-.22);handle.rotation.y=Math.PI/2;
    }
  }
  const nap={x:-w/2+.55,z:d/2-.58,y:.06};
  cushion(g,nap.x,nap.z,recipe.accent);
  if(f!=='ceremony')cushion(g,.98,d/2-.48,recipe.accent);
  // Tansu and stepped sample shelf are both safe landing surfaces.
  const cx=-w/2+.26,cz=-d/2+.57;
  if(f!=='ceremony') {
    box(g,.42,.72,.76,wood,cx,.42,cz,.015);
    for(let i=0;i<3;i++) {box(g,.016,.17,.66,material('wood','cedar'),cx+.218,.2+i*.22,cz,.006);const h=mesh(g,new THREE.TorusGeometry(.032,.006,6,14),plain('#474a3d'),cx+.235,.22+i*.22,cz);h.rotation.y=Math.PI/2;}
    addPlatform(cx,cz,.42,.76,.78,'chest');
    const vase=vessel(g,'vase','indigo',1);vase.position.set(cx,.79,cz-.16);
    if(f==='indigo'||recipe.id==='indigo')for(let i=0;i<3;i++)box(g,.32,.045,.31,material('cloth',i%2?'cream':'indigo'),cx,.8+i*.045,cz+.15,.012);
  }
  return {g,platforms,solids,knockables,table,nap};
}

/** Merge static descendants by material, retaining dynamic objects and parent groups. */
function mergeStatic(root) {
  root.updateWorldMatrix(true,true);const inverse=new THREE.Matrix4().copy(root.matrixWorld).invert(),buckets=new Map();
  root.traverse((o)=>{if(!o.isMesh||o.isInstancedMesh||o.userData.dynamic||o.material.transparent)return;let p=o.parent;while(p&&p!==root){if(p.userData.dynamic)return;p=p.parent;}const key=`${o.material.uuid}/${o.castShadow}/${o.receiveShadow}`;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o);});
  for(const list of buckets.values()) {
    if(list.length<2)continue;const geometries=list.map((m)=>{const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.deleteAttribute('uv2');g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,m.matrixWorld));return g;});
    const geo=mergeGeometries(geometries,false);for(const g of geometries)g.dispose();if(!geo)continue;
    const m=new THREE.Mesh(geo,list[0].material);m.castShadow=list[0].castShadow;m.receiveShadow=list[0].receiveShadow;root.add(m);for(const old of list){old.removeFromParent();if(!boxCacheHas(old.geometry))old.geometry.dispose();}
  }
}

export function createRoom(recipe,{mini=false}={}) {
  const scene=new THREE.Scene();scene.background=new THREE.Color('#faf9f4');
  const root=new THREE.Group();scene.add(root);const layout=LAYOUTS[recipe.layout],w=layout.w*UNIT,d=layout.d*UNIT;
  const groups=Array.from({length:6},()=>new THREE.Group());root.add(...groups);
  const [floor,frame,screens,alcove,props,atmosphere]=groups;
  const timber=material('wood',recipe.wood),wall=material('plaster',recipe.wall);
  box(floor,w+.22,.22,d+.94,timber,0,-.145,-.31,.035);
  const matsRoot=new THREE.Group();matsRoot.userData.dynamic=true;floor.add(matsRoot);
  for(const [x,z,mw,md]of layout.mats) {
    const rotated=mw>md,tw=Math.min(mw,md)*UNIT,td=Math.max(mw,md)*UNIT;
    const mat=tatami(matsRoot,tw,td,recipe.floor,recipe.accent);mat.group.position.set((x+mw/2-layout.w/2)*UNIT,0,(z+md/2-layout.d/2)*UNIT);if(rotated)mat.group.rotation.y=Math.PI/2;
  }
  for(let i=0;i<6;i++)box(floor,.145,.105,d+.14,timber,w/2+.13+i*.145,.003,0,.008);
  box(floor,.09,.17,d+.18,timber,w/2+.96,-.025,0);
  for(const x of [-w/2-.035,w/2+.035])box(floor,.075,.08,d+.2,timber,x,.02,0);
  box(frame,.08,2.18,d+.75,wall,-w/2-.055,1.035,-.3);
  for(const z of [-d/2-.63,-d/2,d/2])box(frame,.105,2.28,.105,timber,-w/2,1.09,z,.008);
  box(frame,.09,.13,d+.82,timber,-w/2,2.18,-.3);
  box(frame,w+.1,.13,.12,timber,0,2.18,-d/2);
  for(const x of [-w/2,w/2])box(frame,.12,2.23,.12,timber,x,1.085,-d/2);
  box(frame,.1,.16,d+.1,timber,w/2,2.15,0);
  // Ranma: an airy band of evenly spaced vertical laths above the sliding panels.
  for(let z=-d/2+.07;z<d/2;z+=.12)box(frame,.035,.23,.015,timber,w/2,2.0,z);
  const ceiling=new THREE.Group();frame.add(ceiling);ceiling.userData.dynamic=true;ceiling.visible=false;
  box(ceiling,w+.18,.07,d+.82,material('wood','cedar'),0,2.32,-.31);
  for(let x=-w/2;x<=w/2;x+=.48)box(ceiling,.065,.09,d+.78,timber,x,2.235,-.31);
  const panels=[];for(let i=0;i<layout.d;i++) {
    const s=screen(screens,recipe.screen,recipe.wood);s.root.position.set(w/2+.025,0,-d/2+UNIT*(i+.5));s.root.rotation.y=Math.PI/2;s.home=s.root.position.z;s.i=i;s.root.userData.dynamic=true;panels.push(s);
  }
  for(const y of [.065,1.9])box(frame,.1,.035,d+.1,timber,w/2,y,0);
  for(const x of [w/2-.025,w/2+.02,w/2+.055])box(frame,.008,.01,d,plain('#584833'),x,.089,0);
  tokonoma(alcove,w,d,recipe);
  const furn=furniture(props,recipe,w,d);const yard=garden(atmosphere,w,d,recipe);
  const lanterns=[andon(atmosphere,-w/2+.33,-d/2+.16,recipe.wood),andon(atmosphere,w/2+.48,-d/2+.25,recipe.wood)];
  for(const l of lanterns)l.g.userData.dynamic=true;
  const hemi=new THREE.HemisphereLight(0xf2e5c9,0x7d8067,2);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffdeb0,3.0);sun.position.set(7,6,4);sun.target.position.set(0,0,0);sun.castShadow=!mini;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.5,far:24});sun.shadow.normalBias=.015;sun.shadow.bias=-.0005;scene.add(sun,sun.target);
  const fill=new THREE.DirectionalLight(0xdce5c8,1.5);fill.position.set(5,2,0);scene.add(fill);
  const front=new THREE.DirectionalLight(0xffe6c4,.6);front.position.set(0,3,6);scene.add(front);
  const dustGeo=new THREE.BufferGeometry(),dustPos=new Float32Array((mini?0:50)*3),rnd=random(321);
  for(let i=0;i<dustPos.length;i+=3){dustPos[i]=(rnd()-.5)*w;dustPos[i+1]=.2+rnd()*1.7;dustPos[i+2]=(rnd()-.5)*d;}
  dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xe7d4a2,size:.018,transparent:true,opacity:.35,depthWrite:false}));atmosphere.add(dust);
  // Weather stays outside the paper screens; one small dynamic buffer per room.
  let weather=null;const weatherSeeds=[];
  if(recipe.season==='rain'||recipe.season==='winter'){
    const count=mini?28:90,raining=recipe.season==='rain',positions=new Float32Array(count*(raining?6:3));
    for(let i=0;i<count;i++)weatherSeeds.push([w/2+1.05+rnd()*1.9,rnd()*3.2,-d/2-.3+rnd()*(d+.5)]);
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
    weather=raining?new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0xa3bac2,transparent:true,opacity:.38,depthWrite:false})):new THREE.Points(geo,new THREE.PointsMaterial({color:0xf2f0e0,size:.035,transparent:true,opacity:.7,depthWrite:false}));
    atmosphere.add(weather);
  }
  // A few translucent, soft discs carry the teapot steam without a postprocess pass.
  const steam=new THREE.Group();atmosphere.add(steam);const steamOrigin=furn.table?new THREE.Vector3(furn.table.x-.35,furn.table.top+.22,furn.table.z-.22):new THREE.Vector3(.4,.55,-.1);
  if(!mini&&recipe.furniture!=='futon'&&recipe.furniture!=='workbench'&&recipe.furniture!=='desk'){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d'),grad=ctx.createRadialGradient(128,128,5,128,128,120);grad.addColorStop(0,'rgba(242,237,214,.5)');grad.addColorStop(1,'rgba(242,237,214,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,256,256);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
    for(let i=0;i<6;i++){const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,opacity:.18,depthWrite:false}));steam.add(sprite);}
  }
  const camera=new THREE.PerspectiveCamera(35,1,.05,80);camera.position.set(8,7,10);camera.lookAt(.9,.65,0);
  const state={hour:recipe.hour,doors:.65,step:6};
  const room={scene,root,recipe,w,d,groups,ceiling,matsRoot,panels,camera,mini,sun,hemi,fill,front,lanterns,dust,yard,...furn,state,
    bounds:{x0:-w/2+.19,x1:w/2+.76,z0:-d/2+.19,z1:d/2-.19},
    labels:[['Tatami · rush & heri',[-.8,.08,.6]],['Tokonoma · display alcove',[0,1.4,-d/2-.4]],['Shoji · paper & kumiko',[w/2,1.2,-d/2+.5]],['Engawa · veranda',[w/2+.5,.12,d/2-.3]],['Tsuboniwa · courtyard',[w/2+1.9,.4,.1]]],
    setHour(hour){state.hour=hour;const day=THREE.MathUtils.smoothstep(hour,6,8)*(1-THREE.MathUtils.smoothstep(hour,17.5,20));const gold=1-THREE.MathUtils.smoothstep(Math.abs(hour-17),0,4),rain=recipe.season==='rain';sun.intensity=day*(rain?.45:2.25+gold*.6);sun.color.set(gold>.3?0xffd39a:0xffebce);sun.position.set(7,Math.max(2,7-gold*4),3.5-gold*2);hemi.intensity=.5+day*(rain?1.05:1.15);hemi.color.set(rain?0xb3c6cb:day>.3?0xeee8d2:0x8dabc4);fill.color.set(day>.3?0xd9e4bf:0x829cc7);fill.intensity=.5+day*.9;front.intensity=.25+day*.35;for(const l of lanterns){l.light.intensity=.12+(1-day)*3.2;l.paper.emissiveIntensity=.25+(1-day)*1.05;}for(const p of panels)if(p.root.userData.paper)p.root.userData.paper.emissiveIntensity=.1+day*.3;},
    setDoors(v){state.doors=v;for(const p of panels)p.root.position.z=p.home-v*p.i*.7;},
    setStep(n){state.step=n;groups.forEach((g,i)=>g.visible=i<n);},
    resetProps(){for(const k of furn.knockables){k.mesh.position.copy(k.home);k.mesh.rotation.set(0,0,0);k.velocity.set(0,0,0);k.spin.set(0,0,0);k.active=k.settled=false;}},
    animate(dt,t,still){
      const time=still?0:t;if(!still){yard.leaves.rotation.z=Math.sin(t*.55)*.008;dust.rotation.y=t*.012;yard.water.material.opacity=.76+Math.sin(t*1.3)*.04;}
      if(weather){const p=weather.geometry.attributes.position,raining=recipe.season==='rain';weatherSeeds.forEach(([x,y,z],i)=>{const yy=((y-time*(raining?2.7:.25))%3.2+3.2)%3.2-.1,xx=x+Math.sin(time*.4+i)*.03;if(raining){p.setXYZ(i*2,xx,yy,z);p.setXYZ(i*2+1,xx-.018,yy+.13,z);}else p.setXYZ(i,xx,yy,z);});p.needsUpdate=true;}
      steam.children.forEach((sprite,i)=>{const phase=(time*.32+i/6)%1;sprite.position.copy(steamOrigin).add(new THREE.Vector3(Math.sin(phase*8+i)*.045,phase*.48,Math.cos(phase*6+i)*.02));sprite.scale.setScalar(.07+phase*.17);sprite.material.opacity=Math.sin(phase*Math.PI)*.17;});
    },
    dispose(){disposeGroup(root);sun.shadow.map?.dispose();}
  };
  // Preserve motion/physics handles; only merge static parts inside each pass.
  mergeStatic(matsRoot);for(const g of groups)mergeStatic(g);
  room.setDoors(.65);room.setHour(recipe.hour);return room;
}
function boxCacheHas(g){for(const value of boxCache.values())if(value===g)return true;return false;}
export function disposeGroup(root){
  const geometries=new Set(),materials=new Set(),textures=new Set();
  root.traverse(o=>{if(o.geometry&&!boxCacheHas(o.geometry))geometries.add(o.geometry);for(const m of [].concat(o.material||[]))if(!isSharedResource(m)){materials.add(m);for(const key of ['map','bumpMap','emissiveMap','alphaMap'])if(m[key]&&!isSharedResource(m[key]))textures.add(m[key]);}});
  for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();
}
