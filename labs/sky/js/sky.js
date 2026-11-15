import * as THREE from 'three';
import { Sky as AnalyticSky } from 'three/addons/objects/Sky.js';
import { FIELD_GLSL, volumeNoise, clamp } from './field.js';
import { OriginalSky } from './original.js';
import { SHADOW_MODES } from './shadows.js';
import { NightSky } from './night.js';

const VS=/*glsl*/`
varying vec3 vSkyWorld;
void main(){vSkyWorld=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
`;
const FS=/*glsl*/`
${FIELD_GLSL}
precision highp sampler3D;
uniform sampler3D uVolume;
uniform sampler2D uPainting;
uniform vec3 uZenith,uHorizon,uCrown,uBelly,uWarm;
uniform float uCloudMode,uSkyMode,uAirMode,uPigment,uDay,uSteps,uNight,uSunDisk;
varying vec3 vSkyWorld;
float hashSky(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 atmosphere(vec3 d){
  float h=pow(clamp(d.y*2.0,0.0,1.0),0.45);
  vec3 col=mix(uHorizon,uZenith,h);
  float toward=max(dot(d,uSun),0.0);
  float horizonBand=exp(-max(d.y,0.0)*5.0);
  col+=uWarm*pow(toward,8.0)*horizonBand*0.17*uDay;
  col+=uWarm*(pow(toward,800.0)*2.0+pow(toward,45.0)*0.16)*uDay*uSunDisk;
  col*=1.0+(hashSky(floor(d.xz*950.0))-.5)*.035*uPigment;
  if(uAirMode>2.5&&uAirMode<3.5){
    float a=acos(clamp(dot(d,uSun),-1.0,1.0));
    col+=vec3(.18,.14,.10)*exp(-pow((a-radians(22.0))/.012,2.0))*uDay;
  }
  if(uAirMode>3.5){
    float a=acos(clamp(dot(d,-uSun),-1.0,1.0));
    float band=exp(-pow((a-radians(42.0))/.026,2.0))*smoothstep(0.0,.08,d.y)*uDay;
    vec3 rainbow=.5+.5*cos(vec3(0.0,2.1,4.2)+(a-radians(42.0))*100.0);
    col+=rainbow*band*.13;
  }
  return col;
}
float volumeDensity(vec3 p){
  float h=(p.y-uCloudBase)/uCloudDepth;
  float profile=smoothstep(0.0,.13,h)*(1.0-smoothstep(.72,1.0,h));
  float threshold=.8-uCoverage*.65+h*h*.26;
  float weather=smoothstep(threshold-.04,threshold+.12,texture2D(uField,cloudUV(p.xz)).r);
  vec3 advected=p+vec3(uCloudOffset.x*180.0,0.0,uCloudOffset.y*180.0);
  float erosion=texture(uVolume,advected*.047).r;
  float anvil=step(6.5,uCloudMode)*smoothstep(.55,.9,h)*.12;
  return max(0.0,weather+anvil-(1.0-erosion)*.65)*profile;
}
vec4 marchCloud(vec3 ro,vec3 rd){
  float t0=max(0.0,(uCloudBase-ro.y)/rd.y);
  float t1=min(1300.0,(uCloudBase+uCloudDepth-ro.y)/rd.y);
  if(t1<=t0)return vec4(0.0);
  float ds=(t1-t0)/uSteps;
  float jitter=hashSky(floor(gl_FragCoord.xy));
  float t=t0+ds*(.3+jitter*.4),trans=1.0;
  vec3 radiance=vec3(0.0);
  float g=.45;
  float forward=min(3.0,(1.0-g*g)/pow(max(.1,1.0+g*g-2.0*g*dot(rd,uSun)),1.5));
  for(int i=0;i<24;i++){
    if(float(i)>=uSteps||trans<.025)break;
    vec3 p=ro+rd*t;
    float density=volumeDensity(p);
    if(density>.001){
      float lightDepth=volumeDensity(p+uSun*2.5)*2.5+volumeDensity(p+uSun*6.0)*3.5;
      float sunLight=exp(-lightDepth*.42);
      float powder=1.0-exp(-density*3.0);
      vec3 color=mix(uBelly,uCrown,clamp(sunLight*.8+powder*.22,.0,1.0));
      color+=uWarm*forward*sunLight*.12*uDay;
      float a=1.0-exp(-density*ds*.34);
      radiance+=trans*a*color;trans*=1.0-a;
    }
    t+=ds;
  }
  return vec4(radiance,1.0-trans);
}
vec4 flatCloud(vec3 ro,vec3 d){
  float t=(uCloudBase+uCloudDepth*.45-ro.y)/d.y;
  if(t<0.0)return vec4(0.0);
  vec2 uv=cloudUV((ro+d*t).xz);
  if(uCloudMode>2.5&&uCloudMode<3.5){
    vec3 paint=vec3(0.0);float trans=1.0;
    for(int i=0;i<4;i++){
      float layer=float(i)/3.0;
      float depth=(uCloudBase+uCloudDepth*layer-ro.y)/d.y;
      vec2 at=cloudUV((ro+d*depth).xz);
      vec4 painting=texture2D(uPainting,at);
      float threshold=.8-uCoverage*.65+abs(layer-.3)*.23;
      float alpha=smoothstep(threshold-.025,threshold+.09,painting.a)*.8;
      vec3 value=mix(painting.rgb,uCrown,layer*.32);
      paint+=value*alpha*trans;trans*=1.0-alpha;
    }
    return vec4(paint,1.0-trans);
  }
  float density=fieldDensity(uv);
  float dx=fieldDensity(uv+vec2(.006,0.0))-density;
  float dz=fieldDensity(uv+vec2(0.0,.006))-density;
  vec3 normal=normalize(vec3(-dx*14.0,.7,-dz*14.0));
  float lit=dot(normal,normalize(vec3(uSun.x,max(.3,uSun.y),uSun.z)))*.5+.5;
  if(uCloudMode>1.5&&uCloudMode<2.5)lit=floor(lit*3.0)/3.0;
  vec3 color=mix(uBelly,uCrown,lit);
  float rim=pow(max(dot(d,uSun),0.0),16.0)*(1.0-density);
  color+=uWarm*rim*.35*uDay;
  color*=1.0+(hashSky(floor(uv*1500.0))-.5)*uPigment*.06;
  float alpha=smoothstep(.04,.75,density);
  if(uCloudMode>1.5&&uCloudMode<2.5)alpha=smoothstep(.12,.16,density);
  return vec4(color*alpha,alpha);
}
void main(){
  vec3 d=normalize(vSkyWorld-cameraPosition);
  vec3 col=atmosphere(d);
  float fade=smoothstep(.025,.09,d.y);
  vec4 cloud=vec4(0.0);
  if(uCloudMode>.5&&d.y>.025&&uCoverage>.001){
    if(uCloudMode>3.5&&uCloudMode<4.5||uCloudMode>6.5)cloud=marchCloud(cameraPosition,d);
    else cloud=flatCloud(cameraPosition,d);
  }
  // Optional clouds-only overlay above the official Preetham box.
  if(uSkyMode>3.5){
    if(cloud.a<.001)discard;
    gl_FragColor=vec4(cloud.rgb/max(cloud.a,.001),cloud.a*fade);
  }else{
    if(uAirMode>1.5&&uAirMode<2.5&&d.y>.025){
      float rays=0.0,decay=1.0;
      for(int i=0;i<12;i++){
        vec3 q=normalize(mix(d,uSun,float(i)/14.0));
        if(q.y>.025){vec2 p=(cameraPosition+q*(uCloudBase-cameraPosition.y)/q.y).xz;rays+=(1.0-cloudAtWorld(p))*decay;}
        decay*=.88;
      }
      col+=uWarm*(rays/12.0)*pow(max(dot(d,uSun),0.0),5.0)*.18*uDay*(1.0-cloud.a);
    }
    col=col*(1.0-cloud.a*fade)+cloud.rgb*fade;
    gl_FragColor=vec4(col,1.0);
  }
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const PALETTES=[
  [0,'#101e39','#34445f','#939eb4','#2f3e59','#465474'],
  [5,'#293959','#ae8a96','#dfbcc0','#615b7e','#e4ad98'],
  [6.6,'#7cacc8','#f3d5bc','#fff1dc','#9ba5b8','#ffc29b'],
  [10,'#4b8ebd','#d7e7e6','#fff7e4','#9caec3','#ffe5bb'],
  [15.5,'#538cba','#e7e6d6','#fff4dc','#939db2','#ffd3a1'],
  [17.8,'#748fb4','#f3d1ae','#ffe6bd','#aa9caf','#ffc089'],
  [18.8,'#6d78a0','#e4ac99','#f5c7af','#887d9c','#eeac88'],
  [20,'#303e65','#73758c','#b5abc2','#52546f','#9a84a7'],
  [22,'#111f3c','#3b4b67','#899ab7','#2f405c','#5c7194'],
  [24,'#101e39','#34445f','#939eb4','#2f3e59','#465474']
];
const _temp=new THREE.Color();
function palette(hour,out) {
  const h=((hour%24)+24)%24;
  let i=0;while(i<PALETTES.length-2&&h>=PALETTES[i+1][0])i++;
  const a=PALETTES[i],b=PALETTES[i+1],t=(h-a[0])/(b[0]-a[0]);
  ['zenith','horizon','crown','belly','warm'].forEach((k,j)=>out[k].set(a[j+1]).lerp(_temp.set(b[j+1]),t));
}
export const CLOUD_MODES={game:0,field:1,paper:2,painted:3,volume:4,cirrus:5,scales:5,sheep:6,tower:7};
const AIR_MODES={game:0,mist:1,rays:2,halo:3,rainbow:4};

export class SkySystem {
  constructor(scene,field,{thumbnail=false}={}) {
    this.scene=scene;this.field=field;this.original=new OriginalSky(scene);this.offset=new THREE.Vector2(.15,.6);this.envMaterials=[];
    this.colors=Object.fromEntries(['zenith','horizon','crown','belly','warm'].map(k=>[k,new THREE.Color()]));
    this.sunDir=new THREE.Vector3();
    this.uniforms={uField:{value:field.texture},uPainting:{value:field.painting},uVolume:{value:volumeNoise()},uCloudOffset:{value:this.offset},uCoverage:{value:.5},uCloudBase:{value:40},uCloudDepth:{value:18},uSun:{value:this.sunDir},uCloudShade:{value:.75},uShadowMode:{value:2},uZenith:{value:this.colors.zenith},uHorizon:{value:this.colors.horizon},uCrown:{value:this.colors.crown},uBelly:{value:this.colors.belly},uWarm:{value:this.colors.warm},uCloudMode:{value:3},uSkyMode:{value:1},uAirMode:{value:0},uPigment:{value:.5},uDay:{value:1},uNight:{value:0},uSteps:{value:thumbnail?12:24},uSunDisk:{value:1}};
    this.material=new THREE.ShaderMaterial({vertexShader:VS,fragmentShader:FS,side:THREE.BackSide,depthWrite:false,depthTest:true,transparent:true,uniforms:this.uniforms});
    this.dome=new THREE.Mesh(new THREE.SphereGeometry(580,40,24),this.material);this.dome.renderOrder=-900;this.dome.frustumCulled=false;scene.add(this.dome);
    this.analytic=new AnalyticSky();this.analytic.scale.setScalar(900);this.analytic.renderOrder=-950;this.analytic.material.depthTest=false;scene.add(this.analytic);
    this.sun=new THREE.DirectionalLight(0xffe6bb,2.5);this.sun.castShadow=!thumbnail;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-32,right:32,top:32,bottom:-32,near:1,far:180});this.sun.shadow.bias=-.0003;this.sun.shadow.normalBias=.035;
    this.hemi=new THREE.HemisphereLight(0xc3d9e7,0x6c6b4b,1.2);this.moon=new THREE.DirectionalLight(0x95b0df,.1);this.moon.position.set(-30,40,20);
    scene.add(this.sun,this.sun.target,this.hemi,this.moon);this.lastBake='';this.bakeMs=0;
    this.night=new NightSky(scene,{thumbnail});
  }
  collectEnvironmentMaterials(){
    const materials=new Set();this.scene.traverse(o=>{for(const m of [].concat(o.material||[]))if(m.isMeshStandardMaterial)materials.add(m);});
    this.envMaterials=[...materials].map(material=>({material,base:material.envMapIntensity}));
  }
  update(state,time,{baseline=false,steps=24}={}) {
    this.original.update(state,time*state.wind);
    const game=this.original.sky;
    this.sunDir.copy(game.sunDir);
    if(!baseline)this.sunDir.applyAxisAngle(THREE.Object3D.DEFAULT_UP,THREE.MathUtils.degToRad(state.azimuth));
    const daylight=THREE.MathUtils.smoothstep(this.sunDir.y,-.08,.14);
    for(const {material,base} of this.envMaterials)material.envMapIntensity=base*(.055+.945*daylight);
    palette(state.hour,this.colors);
    if(state.sky==='haze'){this.colors.zenith.lerp(_temp.set('#b8cbd6'),.42);this.colors.horizon.lerp(_temp.set('#f1dcd2'),.35);}
    const originalSky=baseline||state.sky==='game',originalCloud=baseline||state.cloud==='game';
    this.original.show({dome:originalSky,clouds:originalCloud,night:true});
    const U=this.uniforms;
    U.uCoverage.value=state.coverage;U.uCloudDepth.value=state.cloud==='tower'?28:18;
    U.uCloudMode.value=originalCloud?0:CLOUD_MODES[state.cloud];U.uCloudShade.value=state.shade;
    U.uShadowMode.value=baseline||originalCloud?0:SHADOW_MODES[state.shadow];
    U.uAirMode.value=baseline?0:AIR_MODES[state.air];U.uPigment.value=state.painter;U.uDay.value=daylight;U.uNight.value=1-daylight;U.uSteps.value=steps;
    const physical=state.sky==='preetham'&&daylight>.05&&!baseline;
    this.analytic.visible=physical;
    U.uSunDisk.value=physical?0:1;U.uSkyMode.value=physical||originalSky?4:1;
    this.dome.visible=!originalSky||!originalCloud;
    if(physical){
      const au=this.analytic.material.uniforms;
      au.sunPosition.value.copy(this.sunDir).multiplyScalar(450000);au.turbidity.value=4;au.rayleigh.value=2;au.mieCoefficient.value=.005;au.mieDirectionalG.value=.8;
    }
    if(!baseline){
      game.starMat.uniforms.uOpacity.value=(1-daylight)*(1-state.coverage*.75);
      game.moonMat.opacity=(1-daylight)*.95*(1-state.coverage*.45);
    }
    this.night.update(baseline?{...state,night:'game'}:state,time,game);
    this.sun.position.copy(this.sunDir).multiplyScalar(100);
    this.sun.intensity=baseline?game.sun.intensity:Math.pow(Math.max(0,this.sunDir.y),.45)*2.8;
    this.sun.color.copy(baseline?game.sun.color:this.colors.crown);
    this.hemi.color.copy(baseline?game.hemi.color:this.colors.horizon);
    this.hemi.groundColor.set(0x737054).lerp(_temp.set(0x17263e),1-daylight);
    this.hemi.intensity=baseline?game.hemi.intensity:.25+daylight*.95;
    this.moon.intensity=(1-daylight)*.5;
    if(!this.scene.fog)this.scene.fog=new THREE.Fog(this.colors.horizon,90,250);
    this.scene.fog.color.copy(baseline||state.sky==='game'?game.currentPalette.fog:this.colors.horizon);
    this.scene.fog.near=baseline?110:state.air==='mist'?35:90;this.scene.fog.far=baseline?420:state.air==='mist'?180:280;
    const signature=`${this.field.revision}|${state.hour.toFixed(2)}|${state.azimuth.toFixed(1)}|${state.painter.toFixed(2)}|${state.sky}`;
    if(!baseline&&signature!==this.lastBake){
      const start=performance.now();this.field.bake(this.sunDir,this.colors.crown,this.colors.belly,state.painter);this.bakeMs=performance.now()-start;this.lastBake=signature;
    }
  }
}
