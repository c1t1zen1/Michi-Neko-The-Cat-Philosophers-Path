import {CHAPTERS,POSTCARDS,DURATION,CAR_PITCH,TRAIN_LENGTH,ENTRY,EXIT,clamp} from './route.js';
const $=id=>document.getElementById(id);
export class UI {
  constructor(actions){
    this.actions=actions;this.toastUntil=0;this.chapterId=null;this.chapterUntil=0;this.guidance=true;this.paused=false;
    $('postcards').innerHTML=POSTCARDS.map(p=>`<div class="postcard" data-id="${p.id}"><b>${p.icon}</b><span>${p.label}</span></div>`).join('');
    $('chapters').innerHTML=CHAPTERS.map(c=>`<li>${c.place} · ${c.name}</li>`).join('');
    $('start').onclick=()=>actions.start(false);$('continue').onclick=()=>actions.start(true);
    $('menu-button').onclick=()=>actions.pause();$('journal-button').onclick=()=>actions.pause();
    $('close-journal').onclick=$('resume').onclick=()=>actions.pause(false);
    $('next-view').onclick=()=>{actions.pause(false);actions.ride();};
    $('sound').onchange=e=>actions.sound(e.target.checked);$('motion').onchange=e=>actions.motion(e.target.checked);
    $('guidance').onchange=e=>{this.guidance=e.target.checked;document.body.classList.toggle('no-guidance',!this.guidance);};
    $('stay').onclick=()=>actions.stay();$('again').onclick=()=>actions.start(false);
    document.addEventListener('keydown',e=>{
      const modal=this.paused?$('journal'):!$('arrival').hidden?$('arrival'):!$('welcome').hidden?$('welcome'):null;
      if(e.code==='Tab'&&modal){const nodes=[...modal.querySelectorAll('button:not([hidden]):not(:disabled),a,input,summary')].filter(x=>x.offsetParent!==null),first=nodes[0],last=nodes.at(-1);if(!first)return;if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
    });
  }
  loading(message){$('load-status').textContent=message;}
  ready(hasSave){$('start').disabled=false;$('start').textContent='Catch the eastbound train ↗';$('continue').hidden=!hasSave;this.loading('Your train is ready.');}
  begin(){
    $('welcome').hidden=true;$('arrival').hidden=true;$('journal').hidden=true;
    for(const id of ['hud','speed','chapter-card','touch'])$(id).hidden=false;
    this.chapterId=null;this.paused=false;$('scene').focus();
  }
  pause(on){this.paused=on;$('journal').hidden=!on;if(on){this.lastFocus=document.activeElement;$('resume').focus();}else (this.lastFocus||$('scene')).focus();}
  toast(message,seconds=5){$('toast').textContent=message;$('toast').classList.add('show');this.toastUntil=performance.now()+seconds*1000;}
  render(time,route,motor,postcards,prompt,world){
    if(performance.now()>this.toastUntil)$('toast').classList.remove('show');
    if(route.c.id!==this.chapterId){
      this.chapterId=route.c.id;this.chapterUntil=performance.now()+16000;
      $('chapter-jp').textContent=route.c.jp;$('chapter-name').textContent=route.c.name;$('chapter-message').textContent=route.c.message;
    }
    $('chapter-card').classList.toggle('quiet',performance.now()>this.chapterUntil);
    $('speed-number').textContent=Math.round(route.speed);
    $('progress-fill').style.width=clamp(time/DURATION*100,0,100)+'%';$('train-marker').style.left=clamp(time/DURATION*100,0,100)+'%';
    $('place').textContent=route.c.place;
    $('car-label').textContent=motor.mode==='overpass'?'KYOTO OVERPASS':`${motor.mode==='interior'?'INSIDE':'ON THE ROOF'} · ${16-Math.floor(motor.s/CAR_PITCH)}`;
    let objective='Find the green hatch · coach & café';
    if(motor.mode==='overpass')objective='Space / E · leap from the bridge onto the train';
    else if(motor.mode==='boarding')objective='One brave little leap…';
    else if(motor.mode==='interior')objective=motor.cafeVisited?'Brass ladder ahead · return to the roof':'Follow the aisle toward the Cloud Café';
    else if(motor.cafeVisited)objective=time<1500?'Toward the front · or linger with the view':'Reach the front perch · Tokyo is waiting';
    if(motor.s>TRAIN_LENGTH-15&&time<1650)objective='A front-row seat · F to ride to the next view';
    $('objective').textContent=objective;
    $('prompt').hidden=!prompt;$('prompt-text').textContent=prompt?.label||'';
    $('wind-warning').hidden=!world.warning||motor.mode!=='roof';
    $('postcard-count').textContent=`${postcards.size} / ${POSTCARDS.length}`;
    document.querySelectorAll('.postcard').forEach(el=>el.classList.toggle('found',postcards.has(el.dataset.id)));
  }
  arrive(postcards){
    $('arrival').hidden=false;$('arrival-note').textContent=`${postcards.size} little postcards brought all the way from Kyoto.`;$('stay').focus();
  }
}

export function interaction(motor,time,postcards,npcs){
  if(motor.mode==='overpass')return {type:'board',label:'A train below. A little leap. Shall we?'};
  if(motor.mode==='boarding')return null;
  const inside=motor.mode==='interior';
  // Hatches take priority over nearby notebook stamps.
  if(!inside&&Math.abs(motor.s-ENTRY)<3)return {type:'hatch',label:'Open the green hatch · enter the coach'};
  if(inside&&(Math.abs(motor.s-ENTRY)<2.5||Math.abs(motor.s-EXIT)<2.5))return {type:'hatch',label:'Climb the brass ladder · back to the roof'};
  const stamp=POSTCARDS.find(p=>!!p.inside===inside&&!postcards.has(p.id)&&Math.abs(motor.s-p.s)<2.7);
  if(stamp)return {type:'postcard',id:stamp.id,label:`Press a postcard · ${stamp.label}`};
  if(inside){const npc=npcs.find(n=>Math.abs(motor.s-n.s)<4);if(npc)return {type:'npc',npc,label:npc.name==='Yuzu'?'A cup of hōjicha with Yuzu':'Greet Sora by the window'};}
  if(!inside&&motor.s>TRAIN_LENGTH-12){
    if(!motor.coachVisited||!motor.cafeVisited)return {type:'note',label:'The café is still waiting · look for the green hatch'};
    if(time>=DURATION)return {type:'arrival',label:'Tokyo · take in the arrival'};
    return {type:'view',label:'Settle on the front perch · ride to the next view'};
  }
  return null;
}
