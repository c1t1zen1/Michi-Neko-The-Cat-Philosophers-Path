import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createRenderer,Views,Loop,Meter,Governor,Q,reduceMotion,SHOT,inView } from '../../shared/stage.js';
import { mountLabChrome } from '../../shared/nav.js';
import { ROOMS,byId,SOURCES,BUILD_STEPS,LAYOUTS } from './data.js';
import { createRoom } from './build.js';
import { InteriorCat } from './cat.js';
import { updateKnockables,supportAt } from './physics.js';
import { CraftBench,CRAFTS } from './craft.js';
import { mountSpecimenLinks } from '../../shared/specimen-link.js';

const $=(s)=>document.querySelector(s),$$=(s)=>[...document.querySelectorAll(s)];
const clamp=THREE.MathUtils.clamp;
const paramNumber=(key,fallback,min,max)=>{const n=Number(Q.get(key));return Q.has(key)&&Number.isFinite(n)?clamp(n,min,max):fallback;};
const motion={still:reduceMotion||Q.get('still')==='1'||SHOT};
mountLabChrome('interiors');
const {renderer,gpu}=createRenderer($('#gl'),{clear:0xfaf9f4,exposure:1.08,shadows:true,maxPR:1.5});
const views=new Views(renderer);const stage=$('#stage');
let room=createRoom(byId(Q.get('room'))),hour=paramNumber('hour',room.recipe.hour,6,23),doors=paramNumber('doors',.65,0,1),view=Q.get('view')||'dollhouse',step=6;
let quality=Q.get('quality')||'auto';if(!['auto','eco','lush'].includes(quality))quality='auto';
if(!['dollhouse','eye','plan'].includes(view))view='dollhouse';
const eyeCam=new THREE.PerspectiveCamera(58,1,.035,40),planCam=new THREE.OrthographicCamera(-5,5,4,-4,.05,50);
const currentCamera=()=>view==='eye'?eyeCam:view==='plan'?planCam:room.camera;
const message=(text)=>{$('#message').textContent=text;};
const cat=new InteriorCat({room,dom:stage,camera:currentCamera,onMessage:message});
const controls=new OrbitControls(room.camera,stage);controls.enableDamping=!motion.still;controls.dampingFactor=.09;controls.enablePan=false;controls.minDistance=5;controls.maxDistance=24;controls.maxPolarAngle=Math.PI*.48;controls.minPolarAngle=.18;controls.target.set(.9,.65,-.1);controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE};
controls.addEventListener('start',()=>{if(view==='dollhouse')stage.focus({preventScroll:true});});
const initialPose=()=>{const aspect=stage.clientWidth/Math.max(1,stage.clientHeight),dist=Math.max(11.4,14.1/Math.max(.6,aspect));const direction=new THREE.Vector3(6.2,5.7,8.5).normalize();room.camera.position.copy(controls.target).addScaledVector(direction,dist);room.camera.lookAt(controls.target);controls.update();};
initialPose();
addEventListener('resize', initialPose);
function setView(v){view=v;controls.enabled=v==='dollhouse';cat.eyeInit=false;$$('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===v));}
function modeButtons(tour){$('#mode-tour').setAttribute('aria-pressed',tour);$('#mode-walk').setAttribute('aria-pressed',!tour);}
function setHour(v){hour=v;room.setHour(v);$('#hour').value=v;$('#hour-out').textContent=`${String(Math.floor(v)).padStart(2,'0')}:${String(Math.round(v%1*60)).padStart(2,'0')}`;}
function setDoors(v){doors=v;room.setDoors(v);$('#doors').value=v;$('#doors-out').textContent=`${Math.round(v*100)}%`;if(cat.touring)cat.tour();}
function setStep(n){step=n;room.setStep(n);cat.cancel();if(n<5){cat.y=.055;cat.pos.set(-.55,room.d/2-.47);cat.velocityY=0;cat.grounded=true;}$$('[data-step]').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.step===n));message(`Pass ${n}: ${BUILD_STEPS[n-1][0]}.`);}
function updateRoomCopy(){const r=room.recipe;$('#house-heading').textContent=r.name;$('#room-caption').textContent=r.note;$('#room-jp').textContent=r.jp;$('#room-note').textContent=r.detail;$('#room-count').textContent=`${String(ROOMS.indexOf(r)+1).padStart(2,'0')} / 12`;$('#room-materials').textContent=`${LAYOUTS[r.layout].name} · ${r.wood==='dark'?'smoke-dark timber':'cedar'} · ${r.screen==='fusuma'?'painted fusuma':r.screen==='sudare'?'reed screen':'kōzo-inspired paper'} · earthen plaster`;$('#room-select').value=r.id;$$('.room-tile').forEach(el=>{const selected=el.dataset.room===r.id;el.classList.toggle('selected-room',selected);el.querySelector('.room-mini').setAttribute('aria-pressed',selected);});}
let labels=[];
function makeLabels(){const mount=$('#labels');mount.replaceChildren();labels=room.labels.map(([title,pos])=>{const el=document.createElement('span');el.className='part-label';el.textContent=title;if(title.startsWith('Shoji'))el.textContent=room.recipe.screen==='fusuma'?'Fusuma · painted partition':room.recipe.screen==='sudare'?'Sudare · open reed screen':title;mount.append(el);return {el,pos:new THREE.Vector3(...pos)};});}
function updateLabels(){if($('#labels').hidden)return;const camera=currentCamera();camera.updateMatrixWorld();for(const {el,pos}of labels){const p=pos.clone().project(camera);el.hidden=p.z>1||p.z< -1||p.x<-.95||p.x>.95||p.y<-.9||p.y>.92;el.style.left=`${(p.x*.5+.5)*100}%`;el.style.top=`${(-p.y*.5+.5)*100}%`;}}
const heroView=views.add(stage,{scene:room.scene,camera:room.camera,update(dt,t,rect,v){
  cat.active=rect.top<innerHeight*.85&&rect.bottom>innerHeight*.2;
  cat.update(dt);if(room.state.step>=5)updateKnockables(room,dt,cat);room.animate(dt,t,motion.still);
  cat.root.visible=view!=='eye';
  controls.update();
  if(view==='eye')cat.eyeCamera(eyeCam,dt,{back:.95,height:.6,ahead:.8});
  if(view==='plan'){const aspect=rect.width/rect.height,h=Math.max(3.15,4.1/aspect);Object.assign(planCam,{left:-h*aspect,right:h*aspect,top:h,bottom:-h});planCam.position.set(.9,15,.01);planCam.lookAt(.9,0,0);planCam.updateProjectionMatrix();}
  v.camera=currentCamera();updateLabels();
}});

function selectRoom(id,{scroll=false}={}) {
  const next=createRoom(byId(id));const env=room.scene.environment;next.scene.environment=env;
  const old=room;room=next;cat.setRoom(room);heroView.scene=room.scene;heroView.camera=room.camera;controls.object=room.camera;controls.target.set(room.w/2-.95,.65,-.1);initialPose();room.ceiling.visible=$('#roof-toggle').checked;step=6;room.setStep(6);$$('[data-step]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.step==='6'));setHour(room.recipe.hour);setDoors(doors);modeButtons(false);updateRoomCopy();makeLabels();setView(view);old.dispose();message('A new room, and a fresh place to explore.');
  setQuality(quality);if(scroll)$('#house').scrollIntoView({behavior:motion.still?'instant':'smooth',block:'start'});
}

$('#room-select').innerHTML=ROOMS.map((r,i)=>`<option value="${r.id}">${String(i+1).padStart(2,'0')} · ${r.name}</option>`).join('');
$('#room-select').addEventListener('change',e=>selectRoom(e.target.value));
$('#hour').addEventListener('input',e=>setHour(+e.target.value));$('#doors').addEventListener('input',e=>setDoors(+e.target.value));
$('#labels-toggle').addEventListener('change',e=>{$('#labels').hidden=!e.target.checked;});
$('#roof-toggle').addEventListener('change',e=>{room.ceiling.visible=e.target.checked;});
$('#motion-toggle').checked=motion.still;$('#motion-toggle').addEventListener('change',e=>{motion.still=e.target.checked;controls.enableDamping=!motion.still;});
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
// OrbitControls captures the pointer; HUD controls must retain their own click.
$('.view-switch').addEventListener('pointerdown',e=>e.stopPropagation());
$('#reset-camera').addEventListener('click',()=>{setView('dollhouse');initialPose();});
$('#mode-walk').addEventListener('click',()=>{cat.cancel();modeButtons(false);message('Click the floor, or use WASD. Space makes a little jump.');stage.focus({preventScroll:true});});
$('#mode-tour').addEventListener('click',()=>{cat.tour();modeButtons(true);});
$('#hop-table').addEventListener('click',()=>{cat.hopOnto();modeButtons(false);});
$('#nap').addEventListener('click',()=>{if(step<5){message('Add the furniture in pass 05 to find the cushion.');return;}cat.nap();modeButtons(false);});
$('#reset-props').addEventListener('click',()=>{room.resetProps();message('Everything back in its place. For now.');});
$('#turn-mats').addEventListener('click',()=>{room.matsRoot.rotation.y+=room.w===room.d?Math.PI/2:Math.PI;message('The whole tatami arrangement turns together. Every joint still follows the no-four-corners rule.');});
$('#share').addEventListener('click',async()=>{const u=new URL(location.href);u.search='';u.hash='house';u.searchParams.set('room',room.recipe.id);u.searchParams.set('hour',hour);u.searchParams.set('doors',doors.toFixed(2));u.searchParams.set('view',view);if(motion.still)u.searchParams.set('still','1');try{await navigator.clipboard.writeText(u.href);message('Room link copied, including the light and screen position.');}catch{message(`Room link: ${u.href}`);}});
$('#save-image').addEventListener('click',()=>{
  const width=1200,height=750,target=new THREE.WebGLRenderTarget(width,height),cam=room.camera.clone();target.samples=renderer.capabilities.isWebGL2?4:0;target.texture.colorSpace=THREE.SRGBColorSpace;cam.aspect=width/height;cam.position.set(7.2,6.1,8.7);cam.lookAt(1.15,.65,-.15);cam.updateProjectionMatrix();
  const old=renderer.getRenderTarget(),viewport=new THREE.Vector4(),scissor=new THREE.Vector4(),scissorTest=renderer.getScissorTest();renderer.getViewport(viewport);renderer.getScissor(scissor);
  const catVisible=cat.root.visible;cat.root.visible=true;renderer.setRenderTarget(target);renderer.setScissorTest(false);renderer.setViewport(0,0,width,height);renderer.render(room.scene,cam);const pixels=new Uint8Array(width*height*4);renderer.readRenderTargetPixels(target,0,0,width,height,pixels);renderer.setRenderTarget(old);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);cat.root.visible=catVisible;target.dispose();
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d'),data=ctx.createImageData(width,height);for(let y=0;y<height;y++)data.data.set(pixels.subarray((height-y-1)*width*4,(height-y)*width*4),y*width*4);ctx.putImageData(data,0,0);
  const link=document.createElement('a');link.download=`interiors-${room.recipe.id}.png`;link.href=canvas.toDataURL('image/png');link.click();message('Saved a 1200 × 750 room study.');
});
for(const b of $$('[data-move]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);cat.cancel();cat.keys.add(b.dataset.move);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>cat.keys.delete(b.dataset.move));}
$('#touch-jump').addEventListener('click',()=>cat.jump());$('#touch-bat').addEventListener('click',()=>cat.batCup());
stage.addEventListener('pointerup',()=>modeButtons(cat.touring));

/* Room book: lazy scenes, one WebGL canvas, only visible views render. */
const tiles=[];
for(const [i,recipe]of ROOMS.entries()) {
  const article=document.createElement('article');article.className='room-tile';article.dataset.room=recipe.id;
  article.innerHTML=`<button type="button" class="room-mini" aria-label="Enter ${recipe.name}" aria-pressed="false"></button><div class="tile-meta"><span>${String(i+1).padStart(2,'0')} / ${LAYOUTS[recipe.layout].name}</span><span class="jp" lang="ja">${recipe.jp}</span></div><h3>${recipe.name}</h3><p>${recipe.detail}</p><button type="button" class="recipe-link">Make yourself at home ↗</button><details><summary>Construction recipe</summary><pre class="code"></pre></details><p class="source-hint">Reference · <a href="${SOURCES[recipe.source].url}" target="_blank" rel="noopener">${SOURCES[recipe.source].title.split(' · ')[0]} ↗</a></p>`;
  article.querySelector('pre').textContent=`createRoom({\n  layout: '${recipe.layout}',\n  screen: '${recipe.screen}',\n  furniture: '${recipe.furniture}',\n  floor: '${recipe.floor}',\n  wood: '${recipe.wood}',\n  season: '${recipe.season}',\n  hour: ${recipe.hour}\n});`;
  $('#gallery').append(article);const el=article.querySelector('.room-mini');el.addEventListener('click',()=>selectRoom(recipe.id,{scroll:true}));article.querySelector('.recipe-link').addEventListener('click',()=>selectRoom(recipe.id,{scroll:true}));
  let mini=null,hover=false;el.addEventListener('pointerenter',()=>hover=true);el.addEventListener('pointerleave',()=>hover=false);
  const v=views.add(el,{margin:200,build(){mini=createRoom(recipe,{mini:true});return {scene:mini.scene,camera:mini.camera};},update(dt,t,rect){mini.setHour(recipe.hour);mini.animate(dt,t,motion.still);const direction=new THREE.Vector3(6.2,5.7,8.5).normalize(),dist=Math.max(11.2,12.1/(rect.width/rect.height));const target=new THREE.Vector3(.9,.6,-.1);mini.camera.position.copy(target).addScaledVector(direction,dist);if(hover&&!motion.still)mini.camera.position.x+=Math.sin(t*.6)*.3;mini.camera.lookAt(target);}});
  tiles.push({article,recipe,view:v});
}
$$('[data-filter]').forEach(b=>b.addEventListener('click',()=>{const filter=b.dataset.filter;$$('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',x===b));for(const t of tiles)t.article.hidden=filter!=='all'&&t.recipe.family!==filter;}));

/* The craft bench shares the actual production builders. */
const bench=new CraftBench();views.add($('#craft-stage'),{scene:bench.scene,camera:bench.camera,update:(dt,t)=>bench.frame(dt,t,motion.still)});
function setCraft(type,finish=null){
  const c=CRAFTS[type];$$('[data-craft]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.craft===type));$('#craft-jp').textContent=c.jp;$('#craft-title').textContent=c.title;$('#craft-description').textContent=c.description;$('#explode-label').textContent=c.slider;$('#finish-label').textContent=c.finish;$('#craft-key').innerHTML=c.key.map(s=>`<li>${s}</li>`).join('');$('#craft-code').textContent=c.code;$('#craft-finish').innerHTML=c.options.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');$('#craft-finish').value=finish||c.options[0][0];bench.set(type,$('#craft-finish').value);$('#craft-stage').setAttribute('aria-label',`Live construction specimen: ${type}`);
}
$$('[data-craft]').forEach(b=>b.addEventListener('click',()=>setCraft(b.dataset.craft)));
$('#craft-finish').addEventListener('change',e=>bench.set(bench.type,e.target.value));$('#explode').addEventListener('input',e=>bench.explode(+e.target.value));
for(const [i,[title,text]]of BUILD_STEPS.entries()){const b=document.createElement('button');b.type='button';b.className='build-step';b.dataset.step=i+1;b.setAttribute('aria-pressed',i===5);b.innerHTML=`<span>${String(i+1).padStart(2,'0')}</span><h3>${title}</h3><p>${text}</p>`;b.addEventListener('click',()=>setStep(i+1));$('#build-steps').append(b);}
$('#source-list').innerHTML=SOURCES.map(s=>`<li><a href="${s.url}" target="_blank" rel="noopener">${s.title} ↗</a><small>${s.note}</small></li>`).join('');

/* Quality lowers resolution and shadows; no additional dependencies or asset requests. */
const gov=new Governor({onScale(scale){if(scale<.55&&quality==='auto'){renderer.setPixelRatio(1);room.sun.castShadow=false;renderer.shadowMap.needsUpdate=true;}},onPixelRatio(pr){renderer.setPixelRatio(pr);}});
function setQuality(q){quality=q;$('#quality').value=q;gov.enabled=q==='auto'&&!SHOT;renderer.setPixelRatio(q==='eco'?1:Math.min(devicePixelRatio,1.5));room.sun.castShadow=q!=='eco';renderer.shadowMap.needsUpdate=true;}
$('#quality').addEventListener('change',e=>setQuality(e.target.value));
const meter=new Meter($('#perf'),gpu);let statusClock=0;
new Loop((dt,t,raw)=>{
  const start=performance.now();
  const rect=stage.getBoundingClientRect();if(!inView(rect)){cat.active=false;cat.keys.clear();}
  views.render(dt,t);meter.tick(raw,performance.now()-start,quality);gov.tick(dt,raw*1000);
  if((statusClock+=dt)>.25){statusClock=0;const p=room.platforms.find(p=>Math.abs(p.top-cat.y)<.06&&supportAt([p],cat.pos.x,cat.pos.y)>.1);$('#cat-status').textContent=`Michi · ${cat.sleeping?'asleep on the cushion':!cat.grounded?'a little leap':p?`on the ${p.name}`:cat.pos.x>room.w/2?'on the engawa':'on the tatami'}`;$('#stats').textContent=`${heroView.stats.calls} draws · ${heroView.stats.tris.toLocaleString()} triangles · ${renderer.info.memory.textures} textures · 256 px surfaces`;modeButtons(cat.touring);}
}).start();

updateRoomCopy();makeLabels();setCraft(Object.hasOwn(CRAFTS,Q.get('craft'))?Q.get('craft'):'tatami');setHour(hour);setDoors(doors);setView(view);setQuality(quality);
mountSpecimenLinks(tiles, { getId: (tile) => tile.recipe.id, getElement: (tile) => tile.article });
const loadingScene=room.scene;
cat.load({scene:loadingScene,renderer,sunDir:room.sun.position.clone().normalize()}).then(()=>{
  if(!room.scene.environment)room.scene.environment=loadingScene.environment;
  if(cat.ready){cat.cat.group.traverse(o=>{if(o.isMesh)o.castShadow=true;});$('#wake').hidden=true;}
  else if(Q.get('cat')==='0')$('#wake').hidden=true;
  else{$('#wake').textContent='Michi could not wake up. The room is still open; reload to try the cat again.';}
});

// Readable QA hooks, also useful when composing review shots.
window.interiorLab={get room(){return room;},cat,renderer,views,bench,selectRoom,setHour,setDoors,setView,setStep,setQuality,stats:()=>({room:room.recipe.id,catReady:cat.ready,grounded:cat.grounded,y:cat.y,position:[cat.pos.x,cat.pos.y],draws:heroView.stats.calls,triangles:heroView.stats.tris,frames:window.__frames})};
if(Q.has('shot'))document.body.classList.add('shot');
