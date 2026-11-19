import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {AOPass,GradeOutputShader} from '../../src/postfx.js';
import {loadCatModule,loadSkyModule} from '../../labs/shared/game.js';
import {loadKit} from './assets.js';
import {loadSceneryModules} from './scenery.js';
import {World} from './world.js';
import {travelAt} from './motion.js';
import {Input} from './input.js';
import {CatMotor} from './physics.js';
import {TrainAudio} from './audio.js';
import {UI,interaction} from './ui.js';
import {DURATION,CHAPTERS,POSTCARDS,CAR_PITCH,TRAIN_LENGTH,ENTRY,EXIT,FLOOR,routeAt,roofHeight,clamp,mix,smooth} from './route.js';

const Q=new URLSearchParams(location.search),$=id=>document.getElementById(id);
const low=Q.get('quality')==='low'||(Q.get('quality')!=='high'&&(matchMedia('(pointer:coarse)').matches||navigator.hardwareConcurrency<=4));
const SAVE_KEY=Q.has('qa')||Q.has('shot')?'michi.shinkansen.review.v1':'michi.shinkansen.v1';
let started=false,paused=false,arrived=false,finishing=false,journeyTime=0,lastSave=0,accumulator=0,heading=Math.PI,boardingTime=0;
let motor=new CatMotor(),postcards=new Set(),world,cat,sky,renderer,camera,scene,input;
let gentle=matchMedia('(prefers-reduced-motion:reduce)').matches;
let saved=null;
try{const raw=JSON.parse(localStorage.getItem(SAVE_KEY));if(raw?.version===1&&Number.isFinite(raw.time)&&raw.time>=0&&raw.time<=DURATION&&raw.motor&&Number.isFinite(raw.motor.s))saved=raw;}catch{}
const audio=new TrainAudio();
const actions={
  start(restore){
    motor=new CatMotor();postcards=new Set();journeyTime=0;arrived=false;finishing=false;heading=Math.PI;boardingTime=0;
    if(restore&&saved){motor.restore(saved.motor);journeyTime=saved.time;postcards=new Set((Array.isArray(saved.postcards)?saved.postcards:[]).filter(id=>POSTCARDS.some(p=>p.id===id)));}
    else{try{localStorage.removeItem(SAVE_KEY);}catch{}}
    lastSave=journeyTime-9;
    started=true;paused=false;accumulator=0;world.travel=travelAt(journeyTime);world.hoops.forEach(h=>h.previous=-999);world.overpass.position.z=0;
    ui.begin();input.clear();cameraSnap=true;ui.toast(restore?'The train kept your place. Welcome back.':'Space or E · a soft leap from the bridge onto the waiting train.',6);
  },
  pause(force){if(!started||finishing)return;paused=typeof force==='boolean'?force:!paused;input.clear();ui.pause(paused);save();},
  sound(on){audio.setEnabled(typeof on==='boolean'?on:!audio.enabled);$('sound').checked=audio.enabled;},
  motion(on){gentle=on;$('motion').checked=gentle;},
  reset(){if(!started||paused)return;motor.reset();ui.toast('Back to four steady paws.');cameraSnap=true;},
  blur(){if(started&&!paused&&!finishing)actions.pause(true);},
  ride(){
    if(!started||paused||finishing||motor.mode==='overpass'||motor.mode==='boarding')return;
    const c=routeAt(journeyTime).c;
    journeyTime=Math.min(DURATION,c.end+.02);motor.hoopCycle=null;
    world.travel=travelAt(journeyTime);ui.toast('Michi settles in. The country turns another page…',4);audio.chime();save();
  },
  stay(){finishing=false;$('arrival').hidden=true;ui.toast('No more destinations. Just the city lights.',6);$('scene').focus();}
};
const ui=new UI(actions);$('motion').checked=gentle;
let cameraSnap=true;const cameraTarget=new THREE.Vector3(),cameraDesired=new THREE.Vector3(),look=new THREE.Vector3();
function save(){
  if(!started||motor.mode==='overpass'||motor.mode==='boarding')return;
  saved={version:1,time:journeyTime,motor:motor.save(),postcards:[...postcards]};
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(saved));}catch{}
}
function use(){
  const prompt=interaction(motor,journeyTime,postcards,world.npcs);if(!prompt)return;
  switch(prompt.type){
    case 'board':motor.board();break;
    case 'hatch':{const result=motor.interact();cameraSnap=true;audio.chime();ui.toast(result==='enter'?'The roar of the wind becomes a quiet travelling room.':'Back into the breeze. The front of the train is ahead.',6);break;}
    case 'postcard':postcards.add(prompt.id);audio.chime();ui.toast('A little piece of the journey, tucked into your sketchbook.');break;
    case 'npc':
      ui.toast(prompt.npc.line,8);prompt.npc.cat?.triggerMeow();
      if(prompt.npc.name==='Yuzu'){motor.hadTea=true;audio.chime();}break;
    case 'arrival':finish();break;
    case 'view':actions.ride();break;
    case 'note':ui.toast('The green coach hatch is halfway back, marked COACH ↓. The café is inside, toward the front.',8);break;
  }
  save();
}
function finish(){
  if(arrived)return;arrived=true;finishing=true;audio.chime('arrival');ui.arrive(postcards);save();input.clear();
}
function physics(dt,controls){
  if(!started||paused||finishing)return;
  if(controls.use)use();
  const oldMode=motor.mode;
  if(motor.mode!=='overpass'&&motor.mode!=='boarding')journeyTime=Math.min(DURATION,journeyTime+dt);
  motor.step(dt,controls,journeyTime);
  if(oldMode==='boarding'&&motor.mode==='roof'){audio.chime();ui.toast('You’re aboard. W / ↑ toward Tokyo · hold C under amber hoops · Space across the carriage seams.',8);}
  if(motor.lastEvent==='hoop')ui.toast('Whuff! Michi flattens his ears and scoots back a little. Hold C for the next low hoop.',5);
  if(motor.lastEvent==='caught')ui.toast('A paw catches the lip. Safe again. Try a running jump at the brass seam.',5);
  if(motor.lastEvent==='jump')audio.chime('jump');
  if(journeyTime-lastSave>8){lastSave=journeyTime;save();}
}
function updateCamera(dt,route){
  const inside=motor.mode==='interior',overpass=motor.mode==='overpass';
  const aspect=camera.aspect,portrait=aspect<.85;
  const x=started?motor.x:-.4,s=started?motor.s:11,y=started?motor.y:6.8;
  const yaw=started?input.yaw:-.56,dist=inside?Math.min(input.distance,3.1):overpass?9.2:input.distance*(portrait?1.12:1);
  const pitch=inside?clamp(input.pitch,.10,.25):input.pitch;
  cameraTarget.set(x,y+(inside?.48:.5),-s);
  cameraDesired.set(x+Math.sin(yaw)*dist,y+Math.sin(pitch)*dist+(inside?.38:.8),-s+Math.cos(yaw)*dist);
  if(inside){cameraDesired.x=clamp(cameraDesired.x,-.44,.44);cameraDesired.y=clamp(cameraDesired.y,FLOOR+.80,3.12);}
  if(route.tunnel>.5&&!inside)cameraDesired.y=Math.min(cameraDesired.y,7.0);
  const k=cameraSnap?1:1-Math.exp(-dt*(inside?7:5));camera.position.lerp(cameraDesired,k);look.lerp(cameraTarget,k);camera.lookAt(look);cameraSnap=false;
  const fov=inside?68:gentle?52:mix(52,57,route.speed/285);camera.fov=portrait?fov+8:fov;camera.updateProjectionMatrix();
  if(!gentle&&started&&!paused&&motor.mode==='roof'){
    camera.position.x+=Math.sin(journeyTime*19)*.009;camera.position.y+=Math.sin(journeyTime*23)*.011;
  }
}
function render(dt){
  const route=routeAt(journeyTime),inside=motor.mode==='interior';
  if(!started)world.overpass.visible=true;
  if(cat){
    const moving=Math.hypot(motor.vx,motor.vs),desired=moving>.15?Math.atan2(motor.vx,-motor.vs):heading;
    heading+=Math.atan2(Math.sin(desired-heading),Math.cos(desired-heading))*(1-Math.exp(-dt*9));
    cat.group.position.set(motor.x,motor.y,-motor.s);cat.group.rotation.y=heading;
    cat.setProwling(motor.duck);cat.update(paused||finishing?0:dt,moving,motor.grounded,moving>3.2);
    cat.group.visible=true;
  }
  sky.dayTime=route.hour;sky.cycleSpeed=0;sky.weatherTimer=1e9;
  sky.update(paused?0:dt,new THREE.Vector3(motor.x,motor.y,-motor.s));
  for(const c of sky.clouds)c.position.z=c.userData.trainBaseZ-motor.s;
  sky.sun.intensity*=1-route.tunnel*.88;sky.hemi.intensity*=1-route.tunnel*.72;
  scene.fog.near=route.tunnel>.5?22:120;scene.fog.far=route.tunnel>.5?160:1000;
  if(route.tunnel>.5)scene.fog.color.setHex(0x555750);
  world.update(paused||finishing?0:dt,journeyTime,route,motor,{gentle,postcards});
  updateCamera(dt,route);
  composer.render();
  if(started)ui.render(journeyTime,route,motor,postcards,interaction(motor,journeyTime,postcards,world.npcs),world);
  audio.update(dt,route,inside,paused||finishing);
}
let last=0,frameCount=0,slowFrames=0;
function frame(now){
  requestAnimationFrame(frame);const dt=Math.min((now-(last||now))/1000,.08);last=now;
  if(!world)return;
  accumulator+=paused||finishing?0:dt;
  // Keep edge presses queued until there is a physics tick to consume them.
  if(accumulator>=1/60){
    const controls=input.read(dt);let first=true;
    while(accumulator>=1/60){physics(1/60,first?controls:{...controls,jump:false,use:false});accumulator-=1/60;first=false;}
  }
  render(dt);
  if(++frameCount>180&&dt>.039)slowFrames++;
  if(slowFrames>200&&renderer.getPixelRatio()>1){renderer.setPixelRatio(1);resize();slowFrames=0;}
}
function resize(){if(!renderer)return;renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();cameraSnap=true;composer.setSize(innerWidth,innerHeight);}
async function boot(){
  if(location.protocol==='file:')throw Error('Serve the repository root over HTTP: python3 -m http.server 8000. Then open http://localhost:8000/Shinkansen/');
  renderer=new THREE.WebGLRenderer({canvas:$('scene'),antialias:false,powerPreference:low?'low-power':'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,low?1.25:1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
  renderer.shadowMap.enabled=!low&&Q.get('shadows')!=='0';renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();scene.background=new THREE.Color(0xc6d8ce);camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.08,1600);
  // Multisampled HDR target with depth attachment for the post chain (AO, bloom, grade).
  const rtSize=renderer.getDrawingBufferSize(new THREE.Vector2());
  const renderTarget=new THREE.WebGLRenderTarget(rtSize.width,rtSize.height,{samples:low?0:4,type:THREE.HalfFloatType,depthTexture:new THREE.DepthTexture(rtSize.width,rtSize.height)});
  const composer=new EffectComposer(renderer,renderTarget);
  composer.renderTarget2.depthTexture=new THREE.DepthTexture(rtSize.width,rtSize.height);
  composer.addPass(new RenderPass(scene,camera));
  composer.addPass(new AOPass(camera,rtSize.width,rtSize.height,{scale:0.5,samples:low?8:14}));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth/2,window.innerHeight/2),0.38,0.85,0.82));
  composer.addPass(new ShaderPass(GradeOutputShader));
  resize();
  ui.loading('Opening the travelling rooms…');
  const [kit,catModule,skyModule,scenery]=await Promise.all([loadKit(),loadCatModule(),loadSkyModule(),loadSceneryModules()]);
  sky=new skyModule.Sky(scene);sky.dayTime=9.3;sky.cycleSpeed=0;sky.weatherPool=['clear'];
  // Keep the valley's painted sky rig, with a clear travel-day palette.
  sky.paletteOverride={phases:{
    day:{...sky.palettes.day,top:new THREE.Color(0x82bed5),mid:new THREE.Color(0xb9d7d8),horizon:new THREE.Color(0xdbe1ca),warm:new THREE.Color(0x718d91),fog:new THREE.Color(0xc3d3bd)},
    sunset:{...sky.palettes.sunset,top:new THREE.Color(0x6e8198),mid:new THREE.Color(0xc6aea6),horizon:new THREE.Color(0xe4c6a2),warm:new THREE.Color(0xa07c68),sun:new THREE.Color(0xffdfb1),fog:new THREE.Color(0xbfb5aa),cloud:new THREE.Color(0xf1d9c4)}
  }};
  for(const c of sky.clouds)c.userData.trainBaseZ=c.position.z;
  if(sky.sun.shadow){sky.sun.shadow.mapSize.set(low?1024:2048,low?1024:2048);sky.sun.shadow.camera.left=-18;sky.sun.shadow.camera.right=18;sky.sun.shadow.camera.top=18;sky.sun.shadow.camera.bottom=-18;}
  sky.attachRenderer(renderer);
  ui.loading('Painting the windows, tea fields, and faraway hills…');
  world=new World(scene,kit,{low,scenery,sky});
  ui.loading('Michi is finding his paws…');await new Promise(r=>setTimeout(r,30));
  cat=new catModule.Cat();scene.add(cat.group);
  catModule.catRimUniforms.uRimStrength.value=.24;catModule.catRimUniforms.uRimColor.value.set(0xffe0ab);
  for(const n of world.npcs){n.cat=new catModule.Cat(n.coat);n.cat.group.position.set(n.x,n.y,-n.s);n.cat.group.rotation.y=-Math.PI/2;n.cat.group.scale.setScalar(.94);scene.add(n.cat.group);}
  input=new Input($('scene'),actions);
  ui.ready(!!saved);addEventListener('resize',resize);addEventListener('pagehide',save);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)actions.blur();});
  $('scene').addEventListener('webglcontextlost',e=>{e.preventDefault();save();actions.pause(true);ui.toast('The drawing surface is resting. Your journey is saved. Reload to continue.',15);});
  if(Q.has('nohud'))document.body.classList.add('nohud');
  if(Q.has('shot')||Q.has('qa')){
    actions.start(false);
    if(Q.has('chapter')){const c=CHAPTERS.find(c=>c.id===Q.get('chapter'));if(c)journeyTime=c.start+45;}
    if(Q.has('at'))motor.restore({s:Number(Q.get('at')),mode:Q.get('inside')==='1'?'interior':'roof',coachVisited:true,cafeVisited:true});
    if(Q.has('inside')&&!Q.has('at'))motor.restore({s:ENTRY+30,mode:'interior',coachVisited:true});
    if(Q.has('yaw'))input.yaw=Number(Q.get('yaw'))||0;
    if(Q.has('pitch'))input.pitch=clamp(Number(Q.get('pitch')),.05,.9);
    if(Q.has('dist'))input.distance=clamp(Number(Q.get('dist')),4,16);
  }
  window.shinkansen={
    get ready(){return !!cat;},get motor(){return motor;},get time(){return journeyTime;},get paused(){return paused;},get arrived(){return arrived;},get postcards(){return [...postcards];},get world(){return world;},get camera(){return camera;},get renderer(){return renderer;},get input(){return input;},
    view(){const p=new THREE.Vector3(motor.x,motor.y+.35,-motor.s).project(camera);return {x:p.x,y:p.y,draws:renderer.info.render.calls,triangles:renderer.info.render.triangles};}
  };
  if(Q.has('qa'))Object.assign(window.shinkansen,{
    start:actions.start,pause:actions.pause,use,ride:actions.ride,save,
    at(s,mode='roof'){motor.restore({s,mode,coachVisited:motor.coachVisited,cafeVisited:motor.cafeVisited,hadTea:motor.hadTea});cameraSnap=true;render(1/60);},
    chapter(id){const c=CHAPTERS.find(c=>c.id===id);if(c){journeyTime=c.start+60;motor.hoopCycle=null;cameraSnap=true;render(1/60);}},
    advance(seconds,controls={}){const ticks=Math.ceil(seconds*60),physical=input.read(1/60);for(let i=0;i<ticks;i++)physics(1/60,{...physical,...controls,jump:!!(controls.jump??physical.jump)&&i===0,use:!!(controls.use??physical.use)&&i===0});render(1/60);return {s:motor.s,x:motor.x,y:motor.y,mode:motor.mode,time:journeyTime,coach:motor.coachVisited,cafe:motor.cafeVisited,arrived};},
    render(){render(1/60);}
  });
  requestAnimationFrame(frame);
}
boot().catch(error=>{console.error(error);ui.loading(error.message);$('start').textContent='Journey could not load';const retry=document.createElement('button');retry.className='text-button';retry.textContent='Try again ↻';retry.onclick=()=>location.reload();$('load-status').after(retry);});
