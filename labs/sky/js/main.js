import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createRenderer, Views, Loop, Governor, renderRect, renderSplit, flag, reduceMotion, SHOT } from '../../shared/stage.js';
import { seg, slider, Stepper } from '../../shared/ui.js';
import { mountLabChrome } from '../../shared/nav.js';
import { CatWalker } from '../../shared/catwalk.js';
import { BASE, POSTCARDS, OPTIONS, FAMILIES, VARIANTS, SOURCES, STEPS } from './data.js';
import { WeatherField, clamp, fract } from './field.js';
import { SkySystem } from './sky.js';
import { KyotoWorld } from './world.js';
import { receiveClouds } from './shadows.js';

const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
mountLabChrome('sky');
if(SHOT&&flag('nohud')==='1')document.body.classList.add('shot');
const {renderer,gpu}=createRenderer($('#gl'),{clear:0xfcfdfd,exposure:1.03,shadows:true,maxPR:1.5});
if(!renderer.capabilities.isWebGL2)throw new Error('Sky Lab requires WebGL2 for the 3D cloud density texture.');
const scene=new THREE.Scene(),field=new WeatherField(BASE.shape),sky=new SkySystem(scene,field),world=new KyotoWorld(scene,sky);
const stage=$('#stage'),camera=new THREE.PerspectiveCamera(48,2,.08,1000);
const controls=new OrbitControls(camera,stage);controls.enableDamping=true;controls.dampingFactor=.1;controls.maxDistance=110;controls.minDistance=3;controls.maxPolarAngle=1.94;
controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};
controls.target.set(-1,10,-30);camera.position.set(18,5.8,24);controls.update();
const eyeCam=new THREE.PerspectiveCamera(62,2,.04,1000);
const S={...BASE,playing:!reduceMotion&&!SHOT,compare:false,split:.5,time:Number(flag('at',0))||0};
if(!Number.isFinite(S.time)||S.time<0)S.time=0;
const lab=window.__sky={S,renderer,scene,field,sky,world,camera,controls,variants:VARIANTS};
const views=new Views(renderer);
let scaledSteps=24,dirtyMap=true,mapClock=0,statClock=0,frameMs=16,noticeTimer;
const activeCamera=()=>S.view==='eye'?eyeCam:camera;
const walker=new CatWalker({parent:scene,dom:stage,camera:activeCamera,ground:world.ground,heightAt:()=>0,bounds:{x0:-32,x1:32,z0:-48,z1:15},blocked:(x,z)=>world.blocked(x,z),start:{x:.7,z:3,heading:Math.PI}});
lab.walker=walker;
walker.clickToGo=true;
const governor=new Governor({onScale:v=>{scaledSteps=v<.7?12:24;world.grass.count=Math.floor(world.grass.instanceMatrix.count*Math.max(.3,v));},onPixelRatio:p=>renderer.setPixelRatio(p)});

const hourText=h=>`${String(Math.floor(h)%24).padStart(2,'0')}:${String(Math.round((h%1)*60)%60).padStart(2,'0')}`;
const sliderBindings={};
function makeSlider(key,mount,label,min,max,step,fmt){sliderBindings[key]=slider($(mount),{label,min,max,step,value:S[key],fmt,onInput:v=>apply({[key]:v})});}
makeSlider('hour','#hour-control','Hour',0,23.95,.05,hourText);
makeSlider('azimuth','#azimuth-control','Bearing',-180,180,1,v=>`${Math.round(v)}°`);
makeSlider('coverage','#coverage-control','Cover',0,1,.01,v=>`${Math.round(v*100)}%`);
makeSlider('wind','#wind-control','Breeze',0,2,.05,v=>`${v.toFixed(2)}×`);
makeSlider('shade','#shadow-control','Shade',0,1,.01,v=>`${Math.round(v*100)}%`);
makeSlider('painter','#paint-control','Pigment',0,1,.01,v=>`${Math.round(v*100)}%`);
for(const [key,items] of Object.entries(OPTIONS)){
  const select=$(`#${key}-select`);select.innerHTML=items.map(([v,label])=>`<option value="${v}">${label}</option>`).join('');
  select.addEventListener('change',()=>apply({[key]:select.value}));
}
const viewCtl=seg($('#view-controls'),['valley','roof','eye','sun'].map((v,i)=>({v,label:['Valley','Roofline','Cat-eye','Sun-eye'][i]})),S.view,setView);
const qualityCtl=seg($('#quality-controls'),['auto','eco','study'].map(v=>({v,label:v[0].toUpperCase()+v.slice(1)})),S.quality,v=>apply({quality:v}));
let brushMode='add';
const brushCtl=seg($('#brush-mode'),[{v:'add',label:'Clouds +'},{v:'erase',label:'Openings −'}],brushMode,v=>{brushMode=v;});
for(const card of POSTCARDS){
  const button=document.createElement('button');button.className='weather-card';button.type='button';button.dataset.id=card.id;button.setAttribute('aria-pressed',String(card.id==='summer'));
  button.innerHTML=`<span class="swatch" style="background:${card.swatch}"></span><span>${card.name}<small lang="ja">${card.jp}</small></span>`;
  button.addEventListener('click',()=>{apply(card.state);$('#scene-name').textContent=card.name;field.reset();document.querySelectorAll('.weather-card').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));});
  $('#weather-presets').append(button);
}
function notify(text){$('#notice').textContent=text;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('#notice').textContent='',6500);}
function setView(v){
  S.view=v;viewCtl?.set(v);controls.enabled=v!=='eye';
  if(v==='valley'){camera.position.set(18,5.8,24);controls.target.set(-1,10,-30);}
  if(v==='roof'){camera.position.set(-2,5.3,-2);controls.target.set(-2,15,-65);}
  if(v==='sun'){
    camera.position.set(0,3.5,9);controls.target.copy(camera.position).addScaledVector(sky.sunDir,70);controls.target.y=Math.max(7,controls.target.y);
  }
  controls.update();
}
function apply(values,{cameraChange=true}={}){
  const previousView=S.view;
  for(const key of ['hour','azimuth','coverage','wind','shade','painter'])if(Number.isFinite(+values[key]))S[key]=clamp(+values[key],key==='hour'?0:key==='azimuth'?-180:0,key==='hour'?23.95:key==='azimuth'?180:key==='wind'?2:1);
  for(const key of ['sky','cloud','shadow','air'])if(OPTIONS[key].some(([v])=>v===values[key]))S[key]=values[key];
  if(['auto','eco','study'].includes(values.quality))S.quality=values.quality;
  if(['valley','roof','eye','sun'].includes(values.view))S.view=values.view;
  if(['cumulus','cirrus','scales','sheep','storm','veil'].includes(values.shape))S.shape=values.shape;
  const shape={cirrus:'cirrus',scales:'scales',sheep:'sheep',tower:'storm'}[S.cloud];
  if(shape)S.shape=shape;
  else if(values.cloud&&values.cloud!=='game'&&!values.shape)S.shape='cumulus';
  field.setShape(S.shape);dirtyMap=true;
  for(const [key,binding] of Object.entries(sliderBindings))binding.set(S[key]);
  for(const key of Object.keys(OPTIONS))$(`#${key}-select`).value=S[key];
  qualityCtl.set(S.quality);governor.enabled=S.quality==='auto'&&!SHOT;
  renderer.setPixelRatio(S.quality==='eco'?1:Math.min(devicePixelRatio||1,1.5));
  world.grass.count=S.quality==='eco'?Math.min(4500,world.grass.instanceMatrix.count):world.grass.instanceMatrix.count;
  $('#clock').textContent=hourText(S.hour);
  const t=clamp((S.hour-6)/13.2);$('#sun-knob').setAttribute('cx',18+244*t);$('#sun-knob').setAttribute('cy',104-340*t*(1-t));
  const cloudNames={cumulus:'綿雲 · wata-gumo',cirrus:'筋雲 · suji-gumo',scales:'鱗雲 · uroko-gumo',sheep:'羊雲 · hitsuji-gumo',storm:'入道雲 · nyūdō-gumo',veil:'朧雲 · oboro-gumo'};
  $('#cloud-name').textContent=S.cloud==='game'?'いつもの雲 · our painted puffs':cloudNames[S.shape];
  const original=S.cloud==='game';
  $('#map-note').textContent=original?'Original sprites have no field':'Shared by clouds + shade';
  $('#weather-map').setAttribute('aria-disabled',String(original));
  $('#shadow-select').disabled=original;
  sky.update(S,S.time,{steps:steps()});world.update(S,S.time);
  if(cameraChange&&(previousView!==S.view||S.view==='sun'))setView(S.view);
}
lab.apply=apply;lab.setView=setView;
function steps(){return S.quality==='eco'?12:S.quality==='study'?24:scaledSteps;}

// Time controls freeze sky, shadows, grass, walker and gallery together.
function updatePlay(){const b=$('#play');b.textContent=S.playing?'Ⅱ Pause the breeze':'▷ Let the sky drift';b.setAttribute('aria-pressed',String(S.playing));b.classList.toggle('active',S.playing);}
$('#play').addEventListener('click',()=>{S.playing=!S.playing;updatePlay();});updatePlay();
function advance(seconds){S.time+=seconds;sky.offset.x+=seconds*S.wind*.0015;sky.offset.y+=seconds*S.wind*.0006;}
$('#drift').addEventListener('click',()=>advance(30));
$('#compare').addEventListener('click',()=>{
  S.compare=!S.compare;$('#compare').setAttribute('aria-pressed',String(S.compare));$('#compare-label').hidden=$('#compare-handle').hidden=!S.compare;
});
$('#split').addEventListener('input',e=>{S.split=+e.target.value/100;$('#compare-handle').style.setProperty('--split',`${e.target.value}%`);});
$('#chase').addEventListener('click',()=>{const on=walker.mode!=='wander';walker.setMode(on?'wander':'drive');$('#chase').setAttribute('aria-pressed',String(on));$('#chase').textContent=on?'Michi is wandering':'Let Michi wander';});

// Pointer + keyboard weather authoring, in the texture's own coordinates.
const map=$('#weather-map'),mapCtx=map.getContext('2d');let drawing=false,pointer={u:.5,v:.5},mapPointer=false;
function paint(){if(S.cloud==='game')return;field.stamp(pointer.u,pointer.v,brushMode==='add'?.1:-.1);dirtyMap=true;}
function pointMap(e){const r=map.getBoundingClientRect();pointer={u:clamp((e.clientX-r.left)/r.width),v:clamp((e.clientY-r.top)/r.height)};mapPointer=true;dirtyMap=true;}
map.addEventListener('pointerdown',e=>{if(S.cloud==='game')return;pointMap(e);drawing=true;map.setPointerCapture(e.pointerId);paint();});
map.addEventListener('pointermove',e=>{pointMap(e);if(drawing)paint();});
for(const event of ['pointerup','pointercancel','lostpointercapture'])map.addEventListener(event,()=>drawing=false);
map.addEventListener('pointerleave',()=>{mapPointer=false;dirtyMap=true;});
map.addEventListener('keydown',e=>{
  const delta={ArrowLeft:[-.025,0],ArrowRight:[.025,0],ArrowUp:[0,-.025],ArrowDown:[0,.025]}[e.key];
  if(delta){e.preventDefault();e.stopPropagation();pointer.u=fract(pointer.u+delta[0]);pointer.v=fract(pointer.v+delta[1]);mapPointer=true;dirtyMap=true;}
  if(e.key==='Enter'||e.key===' '){e.preventDefault();paint();}
});
$('#map-reset').addEventListener('click',()=>{field.reset();sky.lastBake='';dirtyMap=true;});
let dialDown=false;const dial=$('#sun-dial');
function dialMove(e){const r=dial.getBoundingClientRect(),t=clamp((e.clientX-r.left-r.width*18/280)/(r.width*244/280));apply({hour:6+t*13.2});}
dial.addEventListener('pointerdown',e=>{dialDown=true;dial.setPointerCapture(e.pointerId);dialMove(e);});
dial.addEventListener('pointermove',e=>{if(dialDown)dialMove(e);});
for(const event of ['pointerup','pointercancel','lostpointercapture'])dial.addEventListener(event,()=>dialDown=false);

const prepBaseline=()=>{sky.update(S,S.time,{baseline:true,steps:steps()});world.update(S,S.time,true);};
const prepNew=()=>{if(field.dirty)field.flush();sky.update(S,S.time,{steps:steps()});world.update(S,S.time);};
const heroView=views.add(stage,{
  scene,camera,
  update(dt,t,rect){
    walker.active=rect.top<innerHeight*.7&&rect.bottom>innerHeight*.3&&document.activeElement!==map;
    walker.update(S.playing?dt:0,{camera:activeCamera(),tank:S.view==='eye'});
    if(S.view==='eye')walker.eyeCamera(eyeCam,dt,{back:1.7,height:.85,ahead:3});
    else{controls.update();camera.position.y=Math.max(.45,camera.position.y);}
    if(field.dirty){field.flush();sky.lastBake='';}
  },
  render(r,rect){
    if(S.compare)renderSplit(r,rect,S.split,[scene,activeCamera(),prepBaseline],[scene,activeCamera(),prepNew]);
    else{prepNew();renderRect(r,rect,scene,activeCamera());}
    prepNew();
  }
});

// One canvas, scissored views; specimens are built only as they approach.
const tiles=[];
for(const [familyIndex,family] of FAMILIES.entries()){
  const section=document.createElement('section');section.className='family';section.id=family.id;
  section.innerHTML=`<div class="fam-head"><span class="fam-num">0${familyIndex+1}</span><h2>${family.title}</h2></div><p class="fam-sub">${family.subtitle}</p><div class="sky-grid"></div>`;
  $('#families').append(section);
  for(const variant of family.variants){
    const article=document.createElement('article');article.className='study';article.dataset.id=variant.id;
    const sources=variant.source.map(k=>`<a href="${esc(SOURCES[k].url)}" target="_blank" rel="noopener">${esc(SOURCES[k].title)}</a>`).join(' · ');
    article.innerHTML=`<div class="view"><button type="button" aria-label="Try ${esc(variant.name)} in the observatory"><span>try this sky ↗</span></button></div><h3 class="name">${variant.name}${variant.tag.includes('original')?'<small>IN OUR GAME</small>':''}</h3><p class="tag"><span lang="ja" class="jp">${variant.jp}</span> · ${variant.tag}</p><p class="blurb">${variant.blurb}</p><p class="cost">${variant.cost}</p><details><summary>Recipe &amp; source code</summary><pre class="code"><code>${esc(variant.code)}</code></pre><p class="recipe-foot">${variant.limit}</p><p class="recipe-foot">${sources}</p><div class="recipe-actions"><button type="button" class="copy-code">Copy recipe</button><a href="js/${variant.file}" target="_blank">Implementation ↗</a></div></details>`;
    section.querySelector('.sky-grid').append(article);
    article.querySelector('.view button').addEventListener('click',()=>{apply(variant.opts);$('#scene-name').textContent=variant.name;stage.scrollIntoView({behavior:reduceMotion?'instant':'smooth',block:'center'});});
    article.querySelector('.copy-code').addEventListener('click',async e=>{const b=e.currentTarget;try{await navigator.clipboard.writeText(variant.code);b.textContent='Copied ✓';}catch{b.textContent='Select the code above to copy';}});
    const vstate={...BASE,...variant.opts,quality:'eco'};
    const tile={variant,state:vstate,built:false};tiles.push(tile);
    views.add(article.querySelector('.view'),{build(){
      const tileScene=new THREE.Scene(),f=new WeatherField(vstate.shape),sk=new SkySystem(tileScene,f,{thumbnail:true}),w=new KyotoWorld(tileScene,sk,{thumbnail:true});
      const cam=new THREE.PerspectiveCamera(52,1.4,.1,1000);cam.position.set(14,5.8,23);cam.lookAt(-2,13,-42);
      Object.assign(tile,{field:f,sky:sk,world:w,built:true});
      return {scene:tileScene,camera:cam,update(){sk.offset.copy(sky.offset);sk.update(vstate,S.time,{steps:12});w.update(vstate,S.time);}};
    },margin:SHOT?-1:120});
  }
}
let initializingStepper=true;
const stepper=new Stepper($('#steps-mount'),{steps:STEPS,onStep:(i,step)=>{if(!initializingStepper){apply(step.state);$('#scene-name').textContent=`Step ${i+1} · ${step.title}`;}}});
initializingStepper=false;lab.stepper=stepper;
$('#srcList').innerHTML=Object.values(SOURCES).map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a><small>${s.note}</small></li>`).join('');

function download(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function recipe(){return {version:1,lab:'sky',three:'0.160.0',state:Object.fromEntries(Object.keys(BASE).map(k=>[k,S[k]])),time:S.time,offset:sky.offset.toArray(),fieldEdits:Array.from(field.brush,v=>Math.round(v*127)),note:'The field edits are a signed 256×256 array. Values are divided by 127 on restore.'};}
function restoreRecipe(value){
  if(!value||value.version!==1||!value.state)throw new Error('Unsupported sky recipe');
  apply(value.state);S.time=Number.isFinite(value.time)?Math.max(0,value.time):0;
  if(Array.isArray(value.offset)&&value.offset.length===2&&value.offset.every(Number.isFinite))sky.offset.fromArray(value.offset);
  if(Array.isArray(value.fieldEdits)&&value.fieldEdits.length===256*256){field.brush.set(value.fieldEdits.map(v=>clamp(Number(v)||0,-127,127)/127));field.dirty=true;}
  dirtyMap=true;
}
lab.recipe=recipe;lab.restore=restoreRecipe;
$('#save-recipe').addEventListener('click',()=>{download(new Blob([JSON.stringify(recipe(),null,2)],{type:'application/json'}),'michi-sky-recipe.json');notify('Recipe saved, including your painted cloud field.');});
// Re-import through the same control: dropping a saved recipe onto the map.
map.addEventListener('dragover',e=>e.preventDefault());
map.addEventListener('drop',async e=>{e.preventDefault();try{const file=e.dataTransfer.files[0];if(!file||file.size>2e6)throw new Error('Choose a Sky Lab JSON recipe under 2 MB.');restoreRecipe(JSON.parse(await file.text()));notify('Your saved sky is back.');}catch(error){notify(error.message);}});
map.title='Drag to paint; drop a saved Sky Lab JSON recipe here to restore it.';
$('#share').addEventListener('click',async()=>{
  const url=new URL(location.href);url.search='';url.hash='';
  for(const key of Object.keys(BASE))url.searchParams.set(key,String(S[key]));
  url.searchParams.set('at',S.time.toFixed(2));url.searchParams.set('ox',sky.offset.x.toFixed(5));url.searchParams.set('oy',sky.offset.y.toFixed(5));
  try{await navigator.clipboard.writeText(url.href);notify('Link copied. Use Save recipe to keep hand-painted field edits too.');}catch{notify('Clipboard unavailable. The recipe download keeps this sky.');}
});
function postcard(){
  const cam=activeCamera(),aspect=cam.aspect,oldSize=renderer.getSize(new THREE.Vector2()),oldPR=renderer.getPixelRatio(),oldViewport=renderer.getViewport(new THREE.Vector4()),oldScissor=renderer.getScissor(new THREE.Vector4()),scissorOn=renderer.getScissorTest();
  try{
    cam.aspect=1200/750;cam.updateProjectionMatrix();prepNew();renderer.setScissorTest(false);renderer.setPixelRatio(1);renderer.setSize(1200,750,false);renderer.setViewport(0,0,1200,750);renderer.clear();renderer.render(scene,cam);
    // Copy immediately after rendering, in the same task. This preserves the
    // screen's ACES + sRGB output without retaining every animation frame.
    const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=750;canvas.getContext('2d').drawImage(renderer.domElement,0,0);
    return canvas;
  }finally{
    renderer.setPixelRatio(oldPR);renderer.setSize(oldSize.x,oldSize.y,false);renderer.setViewport(oldViewport);renderer.setScissor(oldScissor);renderer.setScissorTest(scissorOn);cam.aspect=aspect;cam.updateProjectionMatrix();
  }
}
lab.postcard=postcard;
$('#save-postcard').addEventListener('click',()=>{postcard().toBlob(blob=>{if(blob){download(blob,'michi-sky-postcard.png');notify('A little piece of Kyoto, saved.');}});});

new Loop((dt,t,raw)=>{
  if(S.playing)advance(dt);frameMs+=(raw*1000-frameMs)*.05;
  views.render(dt,t);
  mapClock+=dt;
  if((dirtyMap||mapClock>.2)&&!document.body.classList.contains('shot')){field.drawMap(mapCtx,S,sky.offset,mapPointer?pointer:null);dirtyMap=false;mapClock=0;}
  governor.tick(dt,raw*1000);statClock+=dt;
  if(statClock>.5){
    statClock=0;
    $('#stats').textContent=`${gpu} · ${Math.round(1000/Math.max(frameMs,1))} fps · ${heroView.stats.calls} draws · ${(heroView.stats.tris/1000).toFixed(1)}k triangles · ${S.cloud==='volume'||S.cloud==='tower'?steps()+' view samples · ':''}field 256² · ${sky.bakeMs.toFixed(1)} ms last paint bake · ${S.quality}`;
  }
  lab.frames=(lab.frames||0)+1;
}).start();

const queryState=Object.fromEntries(new URLSearchParams(location.search));
if(flag('scene'))Object.assign(queryState,POSTCARDS.find(p=>p.id===flag('scene'))?.state||{});
apply(queryState);setView(S.view);
if(Number.isFinite(+flag('ox'))&&flag('ox')!==null)sky.offset.x=+flag('ox');
if(Number.isFinite(+flag('oy'))&&flag('oy')!==null)sky.offset.y=+flag('oy');
if(flag('step'))stepper.go(clamp(+flag('step')-1,0,STEPS.length-1));
walker.load({scene,renderer,sunDir:sky.sunDir}).then(()=>{receiveClouds(walker.root,sky.uniforms);sky.collectEnvironmentMaterials();$('#wake').hidden=true;lab.catReady=walker.ready;});
if(flag('cat')==='0')$('#wake').hidden=true;
lab.ready=true;
