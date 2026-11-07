import * as THREE from 'three';
import { createRenderer, Views, Loop, Meter, Governor, renderRect, flag, reduceMotion } from '../../shared/stage.js';
import { seg, slider, Stepper } from '../../shared/ui.js';
import { mountLabChrome } from '../../shared/nav.js';
import { LightRig } from '../../shared/light.js';
import { Hero } from './hero.js?rev=20261107-staves';
import { VARIANTS, FAMILIES, SOURCES } from './variants.js?rev=20261107-staves';
import { buildMachiya } from './machiya.js?rev=20261107-staves';
import { STEPS } from './steps.js';
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>\"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
mountLabChrome('machiya');
const lab = window.__machiya = { style: flag('style', 'hybrid'), hour: Number(flag('hour', 16.5)), recipe: {} };
if (!['hybrid','standard','toon'].includes(lab.style)) lab.style = 'hybrid';
if (!Number.isFinite(lab.hour)) lab.hour = 16.5;
lab.hour = THREE.MathUtils.clamp(lab.hour, 0, 24);
const { renderer, gpu } = createRenderer($('#gl'), { shadows: true, exposure: 1.05, maxPR: 1.5 });
lab.renderer = renderer;
const views = new Views(renderer), hero = new Hero(lab, $('#stage'));
lab.hero = hero;
const heroView = views.add($('#stage'), { scene:hero.scene, camera:hero.iso, update:(dt,t,r) => hero.frame(dt,t,r), render:(r,rect) => renderRect(r,rect,hero.scene,hero.camera) });
const updateRecipe = () => {
  const config = { ...lab.recipe, style:lab.style, age:hero.age, wet:hero.wet };
  $('#recipe-code').textContent = 'import { buildMachiya } from "./js/machiya.js";\n\nconst house = buildMachiya(' + JSON.stringify(config,null,2) + ');\nscene.add(house.group);\nhouse.update(time, hour, wind);';
  $('#selected-recipe').textContent = `${lab.recipe.roofRecipe || 'wave'} roof · ${lab.recipe.koushiPattern || 'itoya'} lattice · ${lab.style} · age ${Math.round(hero.age*100)}%`;
};
const refresh = () => { hero.setStyle(lab.style); updateRecipe(); };
const styleCtl = seg($('#seg-style'), [{v:'hybrid',label:'Painterly PBR'},{v:'standard',label:'Physical'},{v:'toon',label:'Cel study'}], lab.style, v => { lab.style=v; refresh(); });
lab.setStyle = v => { lab.style=v; styleCtl.set(v); refresh(); };
const hourCtl = slider($('#hour-mount'), {label:'Hour',min:0,max:24,step:.1,value:lab.hour,fmt:h => `${String(Math.floor(h)).padStart(2,'0')}:${String(Math.floor(h%1*60)).padStart(2,'0')}`,onInput:h => setHour(h)});
function setHour(h) { lab.hour=h; hero.setHour(h); }
seg($('#hour-presets'), [{v:9,label:'Morning'},{v:17.5,label:'Golden'},{v:21,label:'Lanterns'}], null, h => { hourCtl.set(h); setHour(h); });
const viewCtl = seg($('#seg-view'), [{v:'iso',label:'Street'},{v:'eye',label:'Cat-eye'},{v:'detail',label:'Detail'}], 'iso', v => { hero.setView(v); if (v==='detail'&&!hero.focus) hero.focusPart('roof'); });
lab.setView = v => { viewCtl.set(v); hero.setView(v); };
lab.setProwl = b => hero.setProwl(b);
seg($('#start-at'), [{v:'street',label:'Street'},{v:'eaves',label:'Eaves'},{v:'ridge',label:'Roof'}], null, v => { hero.perch(v); $('#stage').focus({preventScroll:true}); });
$('#btn-tour').addEventListener('click', () => { if (hero.tour) { hero.tour=false; hero.target=null; hero.jumpHeld=false; } else hero.startTour(); $('#stage').focus({preventScroll:true}); });
$('#btn-rotl').addEventListener('click', () => hero.rotate(-1)); $('#btn-rotr').addEventListener('click', () => hero.rotate(1));
const partLabels = [['roof','Roof'],['frame','Joinery'],['wall','Walls'],['lattice','Kōshi'],['window','Mushiko'],['deck','Engawa'],['bamboo','Bamboo'],['cloth','Noren'],['lantern','Lantern']];
for (const [key,label] of partLabels) {
  const b=document.createElement('button'); b.textContent=label; b.type='button';
  b.addEventListener('click',()=>{ hero.focusPart(key); lab.setView('detail'); $('#part-pills').querySelectorAll('button').forEach(el=>el.setAttribute('aria-pressed',String(el===b))); });
  b.setAttribute('aria-pressed','false'); $('#part-pills').append(b);
}
const ageCtl = slider($('#age-mount'), {label:'Age',min:0,max:1,step:.05,value:0,fmt:v=>`${Math.round(v*100)}%`,onInput:v=>{hero.setWeather(v,hero.wet);updateRecipe();}});
slider($('#wet-mount'), {label:'Wet tiles',min:0,max:1,step:.05,value:0,fmt:v=>`${Math.round(v*100)}%`,onInput:v=>{hero.setWeather(hero.age,v);updateRecipe();}});
slider($('#wind-mount'), {label:'Breeze',min:0,max:1.5,step:.1,value:reduceMotion?0:.5,onInput:v=>{hero.wind=v;}});
for (const [id,key] of [['roof-select','roofRecipe'],['lattice-select','koushiPattern'],['timber-select','latticeRecipe']]) $('#'+id).addEventListener('change',e=>{lab.recipe[key]=e.target.value;refresh();});
$('#compare-select').addEventListener('change', e=>hero.compare(e.target.value==='original'));
function syncControls() {
  $('#roof-select').value=lab.recipe.roofRecipe||'wave'; $('#lattice-select').value=lab.recipe.koushiPattern||'itoya'; $('#timber-select').value=lab.recipe.latticeRecipe||'instance';
  styleCtl.set(lab.style); $('#compare-select').value=hero.showOriginal?'original':'new';
}
function choose(v) {
  if (v.original) { hero.compare(true,v.kind || 'tea'); }
  else {
    hero.compare(false); const opts={...v.opts};
    // Compact specimen dimensions never replace the full-size hero house.
    if (opts.upper) { opts.upper={ w:6.8,d:4.6,h:1.25 }; opts.roof={eaveY:3.65,ridgeH:1.5,overhang:.65}; }
    if (opts.style) {lab.style=opts.style;delete opts.style;}
    if (opts.hour) {hourCtl.set(opts.hour);setHour(opts.hour);delete opts.hour;}
    if ('age' in opts) {ageCtl.set(opts.age);hero.setWeather(opts.age,hero.wet);delete opts.age;}
    Object.assign(lab.recipe,opts); refresh();
  }
  syncControls(); $('#stage-caption').textContent=v.name;
  document.querySelectorAll('.tile').forEach(el=>el.classList.toggle('selected',el.dataset.slug===v.slug));
  $('#walk').scrollIntoView({behavior:reduceMotion?'instant':'smooth',block:'start'});
}
const tiles=[];
for (const [fi,fam] of FAMILIES.entries()) {
  const section=document.createElement('section'); section.className='family';section.id='shelf-'+fam.key;
  section.innerHTML=`<div class="fam-head"><span class="fam-num">${String(fi+1).padStart(2,'0')}</span><h2>${fam.title}</h2><p class="fam-sub">${esc(fam.sub)}</p></div><div class="variants"></div>`;
  $('#shelves').append(section);
  const filterOpt=document.createElement('option');filterOpt.value=fam.key;filterOpt.textContent=fam.title.replace(/<[^>]*>/g,'');$('#family-filter').append(filterOpt);
  for (const v of VARIANTS.filter(x=>x.family===fam.key)) {
    const card=document.createElement('article');card.className='tile';card.dataset.slug=v.slug;
    card.innerHTML=`<div class="specimen-mark">${v.original?'GAME REFERENCE':'WORKSHOP RECIPE'}<span>${esc(v.family)}</span></div><div class="view" role="button" tabindex="0" aria-label="${v.original?'Compare':'Apply'} ${esc(v.name)}"></div><h3 class="name">${esc(v.name)}</h3><p class="tag">${esc(v.tag)}</p><p class="blurb">${esc(v.blurb)}</p><dl class="stats"><div><dd class="s-tris">–</dd><dt>tris</dt></div><div><dd class="s-meshes">–</dd><dt>meshes</dt></div><div><dd class="s-calls">–</dd><dt>draws</dt></div><div><dd class="s-build">–</dd><dt>ms build</dt></div></dl><div class="card-actions"><button class="apply-recipe">${v.original?'Compare original':'Try this recipe'} ↗</button><button class="copy-card" aria-label="Copy ${esc(v.name)} source">Copy code</button></div><details><summary>Recipe, source &amp; tradeoffs</summary><ul class="how">${v.how.map(h=>`<li>${esc(h)}</li>`).join('')}</ul><pre class="code"><code>${esc(v.code)}</code></pre><p class="use">${esc(v.use)}</p><p class="source-file"><a href="${v.file}" target="_blank">Complete runnable source ↗</a></p><ul class="srcs">${v.sources.map(([l,u])=>`<li><a href="${u}" target="_blank" rel="noopener">${esc(l)}</a></li>`).join('')}</ul></details>`;
    section.querySelector('.variants').append(card);
    const el=card.querySelector('.view');let hover=false;
    el.addEventListener('pointerenter',()=>hover=true);el.addEventListener('pointerleave',()=>hover=false);
    el.addEventListener('click',()=>choose(v));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(v);}});
    card.querySelector('.apply-recipe').addEventListener('click',()=>choose(v));
    card.querySelector('.copy-card').addEventListener('click',e=>copy(v.code,e.currentTarget));
    const view=views.add(el,{margin:150,build(){
      const res=v.build(renderer,lab.hour);res.scene.environment=hero.scene.environment;res.rig.applyEnv();
      card.querySelector('.s-tris').textContent=res.counts.tris.toLocaleString();card.querySelector('.s-meshes').textContent=res.counts.meshes;card.querySelector('.s-build').textContent=res.built.toFixed(0);
      const baseHeight=res.camera.top;
      return {scene:res.scene,camera:res.camera,update(dt,t,rect){
        if(!reduceMotion&&!hover)res.spin.rotation.y+=dt*.13;
        const hour=v.opts?.hour??lab.hour;
        if(res.rig.hour!==hour)res.rig.setHour(hour);
        res.update?.(t,hour,reduceMotion?0:.5);
        res.camera.left=-baseHeight*rect.width/rect.height;res.camera.right=-res.camera.left;res.camera.updateProjectionMatrix();
      }};
    }});tiles.push({card,view,v});
  }
}
function filter() {
  const word=$('#recipe-search').value.trim().toLowerCase(), family=$('#family-filter').value;let count=0;
  for(const {card,v} of tiles){const show=(!word||[v.name,v.blurb,v.tag,v.family].join(' ').toLowerCase().includes(word))&&(family==='all'||family===v.family||(family==='original'&&v.original));card.hidden=!show;if(show)count++;}
  for(const sec of document.querySelectorAll('#shelves .family'))sec.hidden=![...sec.querySelectorAll('.tile')].some(c=>!c.hidden);
  $('#recipe-count').textContent=`${count} / ${VARIANTS.length} specimens`;$('#empty-search').hidden=count>0;
}
$('#recipe-search').addEventListener('input',filter);$('#family-filter').addEventListener('change',filter);filter();
$('#srcList').innerHTML=Object.values(SOURCES).map(([l,u])=>`<li><a href="${u}" target="_blank" rel="noopener">${esc(l)}</a></li>`).join('');
// A second live stage belongs to the assembly stepper, leaving the cat's street
// intact while the reader studies how the house goes together.
const assembly=buildMachiya({style:'hybrid'}), assemblyScene=new THREE.Scene();assemblyScene.add(assembly.group);assemblyScene.environment=hero.scene.environment;
const assemblyRig=new LightRig(assemblyScene,{hour:lab.hour,shadows:false,sky:false,fog:false,background:false});
const assemblyCam=new THREE.OrthographicCamera(-8,8,7,-7,.1,100);assemblyCam.position.set(15,12,18);assemblyCam.lookAt(0,3,0);
let phase=0,explosion=0;
const stepper=new Stepper($('#steps-mount'),{steps:STEPS,onStep:(i,s)=>{phase=s.phase;assembly.setAssembly(phase,explosion);}});
slider($('#explode-mount'),{label:'Explode the layers',min:0,max:1,step:.05,value:0,onInput:v=>{explosion=v;assembly.setAssembly(phase,v);}});
$('#assembly-finished').addEventListener('click',()=>stepper.go(STEPS.length-1));
views.add($('#assembly-view'),{scene:assemblyScene,camera:assemblyCam,update:(dt,t,r)=>{
  const aspect=r.width/r.height;assemblyCam.left=-7*aspect;assemblyCam.right=7*aspect;assemblyCam.updateProjectionMatrix();
  if(!reduceMotion)assembly.group.rotation.y+=dt*.1;assembly.update(t,lab.hour,reduceMotion?0:.3);
  if(assemblyRig.hour!==lab.hour)assemblyRig.setHour(lab.hour);
}});
async function copy(text,button) {const previous=button.textContent;try{await navigator.clipboard.writeText(text);button.textContent='Copied ✓';}catch{button.textContent='Select source below';$('#recipe-code').closest('details').open=true;}setTimeout(()=>button.textContent=previous,1800);}
$('#copy-recipe').addEventListener('click',e=>copy($('#recipe-code').textContent,e.currentTarget));
$('#save-recipe').addEventListener('click',()=>{
  const config={lab:'machiya',version:2,options:{...lab.recipe,style:lab.style,age:hero.age,wet:hero.wet},lighting:{hour:lab.hour},wind:hero.wind};
  const url=URL.createObjectURL(new Blob([JSON.stringify(config,null,2)+'\n'],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='michi-machiya-recipe.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
for(const button of document.querySelectorAll('[data-key]')) {
  button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);hero.tour=false;hero.target=null;hero.keys.add(button.dataset.key);});
  const release=()=>hero.keys.delete(button.dataset.key);button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);
}
$('#touch-jump').addEventListener('pointerdown',e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);hero.buffer=.12;hero.jumpHeld=true;hero.tour=false;});
for(const event of ['pointerup','pointercancel'])$('#touch-jump').addEventListener(event,()=>hero.jumpHeld=false);
lab.onCatReady=()=>{$('#wake').hidden=true;window.__catReady=true;};
lab.onCatError=()=>{$('#wake').textContent='Michi could not load. The architecture workshop is ready; reload to try the cat again.';};
if(flag('cat')==='0')$('#wake').hidden=true;
const meter=new Meter($('#perf'),gpu),gov=new Governor({onScale:()=>{},onPixelRatio:pr=>renderer.setPixelRatio(pr)});let statClock=0;
new Loop((dt,t,raw)=>{
  const start=performance.now();views.render(dt,t);meter.tick(raw,performance.now()-start,`${lab.style} · ${lab.hour.toFixed(1)} h`);gov.tick(dt,raw*1000);
  if((statClock+=dt)>.4){statClock=0;
    for(const {card,view}of tiles)if(view.built&&!card.hidden)card.querySelector('.s-calls').textContent=view.stats.calls;
    $('#hudState').textContent=hero.showOriginal?`Original game ${hero.originalKind}`:hero.tour?'Michi’s roof wander':hero.climbing?'Climbing the lattice':!hero.grounded?'A little leap':hero.y>3.3?'Up on the tiles':hero.y>1.5?'Under the eaves':hero.y>.2?'On the engawa':'On the street';
    $('#btn-tour').textContent=hero.tour?'Pause the wander':'Let Michi wander ↗';
    const counts=hero.counts;$('#heroStats').textContent=`${counts.meshes} meshes · ${counts.tris.toLocaleString()} triangles · ${heroView.stats.calls} draws · ${heroView.cpuMs.toFixed(1)} ms CPU`;
  }
}).start();
updateRecipe();lab.setRecipe=opts=>{Object.assign(lab.recipe,opts);refresh();syncControls();};lab.variants=VARIANTS;lab.views=views;lab.assembly=assembly;lab.stepper=stepper;
if(flag('cat')!=='0')hero.loadCat();
window.lab=lab;window.hero=hero;
