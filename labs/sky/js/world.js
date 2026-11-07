import * as THREE from 'three';
import { hash } from './field.js';
import { originalHouse } from './original.js';
import { receiveClouds } from './shadows.js';
import { loadFoliageModule } from '../../shared/game.js';
import { instancedWall } from '../../ranges/js/wall.js';
const foliage=await loadFoliageModule();

function paintedTexture() {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#8d9b66';ctx.fillRect(0,0,256,256);
  for(let i=0;i<6200;i++){
    ctx.fillStyle=`rgba(${70+hash(i,2)*90},${95+hash(i,4)*80},${40+hash(i,5)*65},.12)`;
    ctx.fillRect(hash(i,0)*256,hash(i,1)*256,2+hash(i,3)*7,1+hash(i,8)*3);
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(16,16);return texture;
}
function box(w,h,d,color,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color}));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;return m;}
function ridge(seed,z,color,top,width=1000) {
  const verts=[],colors=[],segments=260,tint=new THREE.Color(color),peak=tint.clone().lerp(new THREE.Color('#c4d2cd'),.28);
  for(let i=0;i<segments;i++){
    const x0=(i/segments-.5)*width,x1=((i+1)/segments-.5)*width;
    const height=x=>top+Math.sin(x*.046+seed)*4+Math.sin(x*.103+seed*2)*2+Math.sin(x*.021+seed*3)*7+Math.sin(x*1.7+seed)*.22;
    verts.push(x0,-4,z,x1,-4,z,x1,height(x1),z,x0,-4,z,x1,height(x1),z,x0,height(x0),z);
  }
  for(let i=0;i<verts.length;i+=3){const c=tint.clone().lerp(peak,Math.max(0,verts[i+1]/(top+10)));colors.push(c.r,c.g,c.b);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();
  return new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}));
}
function grass(uniforms,thumbnail) {
  const geometry=new THREE.PlaneGeometry(.075,.7,1,3);geometry.translate(0,.35,0);
  const material=new THREE.MeshLambertMaterial({color:0xffffff,side:THREE.DoubleSide});
  material.onBeforeCompile=shader=>{
    shader.uniforms.uGrassTime=uniforms.uGrassTime;shader.uniforms.uGrassWind=uniforms.uGrassWind;
    shader.vertexShader='uniform float uGrassTime,uGrassWind;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      transformed.x*=max(.08,1.0-uv.y*.94);
      transformed.y*=.6;
      transformed.x+=sin(uGrassTime*1.4+instanceMatrix[3].x*.6+instanceMatrix[3].z*.4)*pow(uv.y,2.0)*.12*uGrassWind;`);
    shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','vec3 objectNormal=normalize(vec3(normal.x*.2,1.0,normal.z*.2));');
  };
  const count=thumbnail?1000:13000,mesh=new THREE.InstancedMesh(geometry,material,count),dummy=new THREE.Object3D(),tint=new THREE.Color();
  let placed=0;
  for(let i=0;i<count*2&&placed<count;i++){
    const x=(hash(i,1)-.5)*76,z=(hash(i,2)-.5)*65-10;
    if(Math.abs(x-Math.sin(z*.035)*3)<2.5||insideHouse(x,z))continue;
    dummy.position.set(x,0,z);dummy.rotation.y=hash(i,3)*Math.PI*2;dummy.scale.setScalar(.6+hash(i,4)*.7);dummy.updateMatrix();mesh.setMatrixAt(placed,dummy.matrix);
    tint.setHSL(.22+hash(i,5)*.035,.25+hash(i,6)*.13,.39+hash(i,7)*.18);mesh.setColorAt(placed,tint);placed++;
  }
  mesh.count=placed;mesh.receiveShadow=true;return mesh;
}
const HOUSES=[{kind:'tea',x:-9,z:-8,rotation:.15},{kind:'residence',x:9,z:-19,rotation:-.12},{kind:'village',x:-11,z:-29,rotation:.12}];
function insideHouse(x,z){return HOUSES.some(h=>Math.abs(x-h.x)<5&&Math.abs(z-h.z)<4.5);}
export class KyotoWorld {
  constructor(scene,sky,{thumbnail=false}={}) {
    this.root=new THREE.Group();scene.add(this.root);this.scene=scene;
    const U=this.uniforms={...sky.uniforms,uGrassTime:{value:0},uGrassWind:{value:.65}};
    const groundMat=new THREE.MeshLambertMaterial({map:paintedTexture(),color:0xc5cc9b});
    groundMat.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec2 vGroundWorld;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\n vGroundWorld=(modelMatrix*vec4(transformed,1.0)).xz;`);
      shader.fragmentShader='varying vec2 vGroundWorld;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float path=1.0-smoothstep(1.9,2.5,abs(vGroundWorld.x-sin(vGroundWorld.y*.035)*3.0));
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.49,.43,.31),path);`);
    };
    this.ground=new THREE.Mesh(new THREE.PlaneGeometry(300,300),groundMat);this.ground.rotation.x=-Math.PI/2;this.ground.receiveShadow=true;this.root.add(this.ground);
    const houses=thumbnail?HOUSES.slice(0,1):HOUSES;
    this.houses=[];
    for(const h of houses){const group=originalHouse(h.kind);group.position.set(h.x,0,h.z);group.rotation.y=h.rotation;this.root.add(group);this.houses.push(group);}
    const ridges=[[1,-180,0x9faeb0,24],[3,-140,0x899d9d,22],[5,-100,0x6c8584,17],[8,-70,0x6c805f,11]];
    this.ridges=ridges.map(r=>ridge(...r));this.root.add(...this.ridges);
    if(!thumbnail){
      const forest=instancedWall(foliage,{count:70,r0:43,r1:58,arcFrom:Math.PI+.12,arcTo:Math.PI*2-.12,scale:1.15});
      forest.group.traverse(o=>{if(o.isMesh)o.receiveShadow=true;});this.root.add(forest.group);
    }
    this.grass=grass(U,thumbnail);this.root.add(this.grass);
    // Stepping stones and two quiet roadside walls make projected shade easy
    // to inspect at three surface orientations, without rebuilding the town.
    for(let i=0;i<18;i++){const z=6-i*2,x=Math.sin(z*.035)*3;this.root.add(box(1.7,.06,1.1,0xa5a79b,x,.02,z));}
    for(const side of [-1,1]){
      this.root.add(box(.22,1.3,11,0xc9c6ac,side*5,.65,-11));
      this.root.add(box(.38,.12,11.2,0x687580,side*5,1.33,-11));
    }
    receiveClouds(this.root,sky.uniforms);
    this.mists=[];
    for(let i=0;i<3;i++){
      const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{uTint:{value:sky.colors.horizon}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`uniform vec3 uTint;varying vec2 vUv;void main(){float a=exp(-pow((vUv.y-.35)*3.2,2.0))*smoothstep(0.0,.2,vUv.x)*(1.0-smoothstep(.8,1.0,vUv.x));gl_FragColor=vec4(uTint,a*.25);#include <tonemapping_fragment>\n#include <colorspace_fragment>}`.replace(';#include',';\n#include')});
      const mist=new THREE.Mesh(new THREE.PlaneGeometry(200,16),material);mist.position.set(0,7,-78-i*36);mist.renderOrder=1;this.root.add(mist);this.mists.push(mist);
    }
  }
  update(state,time,baseline=false){
    this.uniforms.uGrassTime.value=time;this.uniforms.uGrassWind.value=state.wind;this.mists.forEach(m=>m.visible=!baseline&&state.air==='mist');
    const day=this.uniforms.uDay.value;
    this.ridges.forEach(r=>r.material.color.setRGB(.09+day*.91,.13+day*.87,.25+day*.75));
    foliage.foliageUniforms.uTime.value=time;foliage.foliageUniforms.uWindGlobal.value=state.wind;
    foliage.foliageUniforms.uSunDir.value.copy(this.uniforms.uSun.value);foliage.foliageUniforms.uSunColor.value.copy(this.uniforms.uCrown.value).multiplyScalar(day*.8);
  }
  blocked(x,z){return insideHouse(x,z)||(Math.abs(Math.abs(x)-5)<.5&&z>-16.7&&z<-5.3);}
}
