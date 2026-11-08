import { el, toast, download } from './common.js';
import { SOUNDS } from '../library/sounds.js';
import { SCORES, scoreProject } from '../library/scores.js';
import { INSTRUMENTS, instrumentPreset } from '../library/instruments.js';
import { writeMidiFile } from '../midi.js';
import { wavBlob } from '../engine/render.js';
import { peakNormalize } from '../library/pcm.js';
import { createZip } from '../zip.js';
import { OriginalAudioManager } from '../library/original-audio.js';

const ITEMS = [...SCORES, ...SOUNDS];
const time = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2,'0')}`;
const URL_BASE = new URL('../../media/', import.meta.url);
const mediaUrl = item => new URL(`${item.type === 'song' ? 'music' : 'sfx'}/${item.id}.${item.type === 'song' ? 'm4a' : 'wav'}`, URL_BASE).href;

export class LibraryPlayer {
  constructor(app) {
    this.app = app; this.root = document.getElementById('library-player');
    this.selected = ITEMS[0]; this.filter = 'all'; this.query = ''; this.repeat = 'off'; this.shuffle = false; this.queue = []; this.history = [];
    this.take = 0; this.generation = 0; this.blobUrl = null; this.worker = null; this.busy = false;
    try { this.recipeOverrides = JSON.parse(localStorage.getItem('dawcat-kyoto-recipes') || '{}'); } catch { this.recipeOverrides = {}; }
    try { this.favorites = new Set(JSON.parse(localStorage.getItem('dawcat-kyoto-favorites') || '[]')); } catch { this.favorites = new Set(); }
    try { this.playlists = JSON.parse(localStorage.getItem('dawcat-kyoto-playlists') || '{}'); } catch { this.playlists = {}; }
    this.audio = new Audio(); this.audio.preload = 'metadata'; this.audio.volume = .65;
    this.audio.addEventListener('ended', () => this.next(true));
    this.audio.addEventListener('timeupdate', () => this.updatePosition());
    this.audio.addEventListener('loadedmetadata', () => this.updatePosition());
    this.audio.addEventListener('play', () => { this.app.transport.stop(); this.playBtn.textContent = 'Ⅱ Pause'; });
    this.audio.addEventListener('pause', () => { this.playBtn.textContent = '▶ Play'; });
    this.audio.addEventListener('error', () => this.setStatus('Audio file unavailable. Use Generate take or run npm run library:build.'));
    this.app.transport.addEventListener('playstate', () => { if (this.app.transport.playing) this.audio.pause(); });
    this.manifest = {};
    fetch(new URL('manifest.json', URL_BASE)).then(r => r.ok ? r.json() : null).then(data => { this.manifest = Object.fromEntries((data?.items || []).map(x => [x.id,x])); this.showDetails(); }).catch(() => {});
    this.render();
    this.audio.src = mediaUrl(this.selected); this.updatePosition();
  }
  onShow() { this.drawWave(); }
  setStatus(text) { this.status.textContent = text; }
  visibleItems() { return ITEMS.filter(i => (this.filter === 'all' || this.filter === i.type || this.filter === 'favorites' && this.favorites.has(i.id)) && `${i.name} ${i.japanese || ''} ${i.description} ${i.category} ${i.hook || ''}`.toLowerCase().includes(this.query)); }
  render() {
    this.root.innerHTML = '';
    const head = el('div', { class: 'lib-heading' }, el('div', {}, el('span', { class:'lib-eyebrow', text:'THE KYOTO SESSIONS · VOL. 01' }), el('h1', {text:'A city you can hear.'}), el('p', {text:'50 original effects. 25 complete scores. Silk, bamboo, bronze — and a little tomorrow.'})),
      el('a', { href:'docs/RESEARCH_AND_REVIEW.md', target:'_blank', text:'Research & audio review ↗' }));
    this.status = el('div', {class:'lib-status', role:'status', 'aria-live':'polite', text:'Ready to listen · game files remain untouched'});
    const toolbar = el('div', {class:'lib-toolbar'});
    const search = el('input', { type:'search', placeholder:'Find a scene, instrument or game sound…', 'aria-label':'Search Kyoto library' });
    search.addEventListener('input', () => { this.query = search.value.toLowerCase(); this.renderList(); });
    const select = el('select', {'aria-label':'Library filter'});
    [['all','Everything · 75'],['song','Scores · 25'],['sfx','Sound effects · 50'],['favorites','★ Favourites']].forEach(([value,text]) => select.append(el('option', {value,text})));
    select.addEventListener('change', () => { this.filter = select.value; this.renderList(); });
    toolbar.append(search,select,el('button', {class:'btn', text:'↓ Download collection', onclick:()=>this.collection()}));
    this.list = el('div', {class:'lib-list', 'aria-label':'Library tracks'});
    this.details = el('aside', {class:'lib-details'});
    this.playBtn = el('button', {class:'btn primary',text:'▶ Play',onclick:()=>this.toggle()});
    this.nowTitle = el('strong',{text:this.selected.name});
    this.clock = el('span',{class:'lib-clock',text:'0:00 / 0:00'});
    this.seek = el('input',{type:'range',min:0,max:1000,value:0,'aria-label':'Playback position'});
    this.seek.addEventListener('input',()=>{ if (Number.isFinite(this.audio.duration)) this.audio.currentTime = Number(this.seek.value)/1000*this.audio.duration; });
    const volume = el('input',{type:'range',min:0,max:1,step:.01,value:.65,'aria-label':'Audition volume'}); volume.addEventListener('input',()=>this.audio.volume=Number(volume.value));
    const shuffle = el('button',{class:'btn',text:'Shuffle off',onclick:()=>{this.shuffle=!this.shuffle;shuffle.textContent=this.shuffle?'Shuffle on':'Shuffle off';shuffle.setAttribute('aria-pressed',String(this.shuffle));}});
    const repeat = el('button',{class:'btn',text:'Repeat off',onclick:()=>{this.repeat=this.repeat==='off'?'one':this.repeat==='one'?'all':'off';repeat.textContent='Repeat '+this.repeat;}});
    this.queueLabel = el('span',{class:'dim',text:'Queue · 0'});
    const player = el('div',{class:'lib-player'},el('div',{class:'lib-now'},this.nowTitle,this.clock),
      el('div',{class:'lib-controls'},el('button',{class:'btn',text:'⏮',title:'Previous item',onclick:()=>this.previous()}),this.playBtn,el('button',{class:'btn',text:'■',title:'Stop audition',onclick:()=>this.stop()}),el('button',{class:'btn',text:'⏭',title:'Next item',onclick:()=>this.next()}),shuffle,repeat,this.queueLabel),
      this.seek,el('label',{class:'lib-volume'},'Volume ',volume));
    this.root.append(head,toolbar,this.playlistPanel(),el('div',{class:'lib-body'},this.list,this.details),this.status,player,this.midiPanel());
    this.renderList();this.showDetails();
  }
  renderList() {
    this.list.innerHTML = '';
    for (const item of this.visibleItems()) {
      const row = el('div',{class:'lib-row'+(item.id===this.selected.id?' selected':''), 'data-library-id':item.id});
      const title = el('button',{class:'lib-track',onclick:()=>{this.select(item);this.play();}},el('span',{class:'lib-type',text:item.type==='song'?'♫':'◉'}),el('span',{},el('strong',{text:item.name}),el('small',{text:item.type==='song'?`${item.japanese} · ${item.tempo} BPM · ${item.mode}`:item.category})),el('span',{class:'lib-duration',text:time(item.duration)}));
      const fav = el('button',{class:'mini-btn lib-fav',text:this.favorites.has(item.id)?'★':'☆',title:'Toggle favourite','aria-label':'Favourite '+item.name,'aria-pressed':String(this.favorites.has(item.id)),onclick:()=>{
        if(this.favorites.has(item.id))this.favorites.delete(item.id);else this.favorites.add(item.id);
        try{localStorage.setItem('dawcat-kyoto-favorites',JSON.stringify([...this.favorites]));}catch{}this.renderList();}});
      row.append(title,fav,el('button',{class:'mini-btn',text:'＋',title:'Add to queue','aria-label':'Queue '+item.name,onclick:()=>{this.queue.push(item.id);this.queueLabel.textContent='Queue · '+this.queue.length;this.setStatus(`Queued ${item.name}`);}}));
      this.list.append(row);
    }
    if(!this.list.children.length)this.list.append(el('p',{class:'dim',text:'No matching sounds.'}));
  }
  select(item) {
    this.cancelRender(); this.generation++; this.audio.pause(); this.releaseBlob(); this.selected=item;this.take=0;this.audio.src=mediaUrl(item);
    this.nowTitle.textContent=item.name;this.renderList();this.showDetails();this.updatePosition();
  }
  releaseBlob(){if(this.blobUrl){URL.revokeObjectURL(this.blobUrl);this.blobUrl=null;}}
  async play(){
    if(!this.audio.src)this.audio.src=mediaUrl(this.selected);
    this.app.engine.stopAll();
    try{await this.audio.play();this.setStatus('Listening · '+this.selected.name);}catch(err){this.setStatus('Playback unavailable: '+err.message);}
  }
  toggle(){if(this.audio.paused)this.play();else this.audio.pause();}
  stop(){this.audio.pause();this.audio.currentTime=0;this.updatePosition();}
  next(ended=false){
    if(ended&&this.repeat==='one'){this.audio.currentTime=0;this.play();return;}
    if(this.activePlaylist && !this.queue.length){if(ended&&this.repeat!=='all'){this.stop();this.activePlaylist=null;return;}this.queue=this.activePlaylist.slice();}
    const visible=this.visibleItems(), items=visible.length?visible:ITEMS;
    let next=this.queue.length?ITEMS.find(i=>i.id===this.queue.shift()):null;
    this.queueLabel.textContent='Queue · '+this.queue.length;
    if(!next){const idx=items.findIndex(i=>i.id===this.selected.id), at=this.shuffle?Math.floor(Math.random()*Math.max(1,items.length-1)):(idx+1);
      if(ended&&at>=items.length&&this.repeat!=='all'){this.stop();return;}
      next=this.shuffle?items.filter(i=>i.id!==this.selected.id)[at]||items[0]:items[at%items.length];}
    this.history.push(this.selected.id);this.select(next);this.play();
  }
  previous(){const old=this.history.pop();if(old)this.select(ITEMS.find(i=>i.id===old));else{const items=this.visibleItems(),i=items.findIndex(x=>x.id===this.selected.id);this.select(items[(i-1+items.length)%items.length]||ITEMS[0]);}this.play();}
  updatePosition(){const duration=Number.isFinite(this.audio.duration)?this.audio.duration:this.selected.duration;this.clock.textContent=`${time(this.audio.currentTime)} / ${time(duration)}`;this.seek.value=duration?this.audio.currentTime/duration*1000:0;this.drawWave();}
  drawWave(){
    const canvas=this.details.querySelector('canvas');if(!canvas)return;
    const w=canvas.clientWidth||320,h=86;canvas.width=w*2;canvas.height=h*2;const c=canvas.getContext('2d');c.scale(2,2);c.clearRect(0,0,w,h);
    const peaks=this.manifest[this.selected.id]?.peaks||[],pos=this.audio.currentTime/(this.audio.duration||this.selected.duration||1);
    for(let i=0;i<peaks.length;i++){const x=i/peaks.length*w;c.fillStyle=x<w*pos?'#eec582':'#536971';const height=Math.max(1,peaks[i]*h*.9);c.fillRect(x,(h-height)/2,Math.max(1,w/peaks.length),height);}
    if(!peaks.length){c.fillStyle='#819395';c.font='12px sans-serif';c.fillText('Generate library media to see the waveform',12,45);}
  }
  showDetails(){
    if(!this.details)return;this.details.innerHTML='';const item=this.selected,m=this.manifest[item.id];
    this.details.append(el('span',{class:'lib-eyebrow',text:item.type==='song'?'COMPLETE ARRANGEMENT':'PROCEDURAL SOUND DESIGN'}),el('h2',{text:item.name}),el('p',{text:item.description}),el('canvas',{'aria-label':'Audio waveform',role:'img'}));
    const tags=item.type==='song'?[`${item.tempo} BPM`,`${item.bars} bars`,item.mode,'7 tracks','6 sections']:[item.category,item.model,item.loop?'Loopable bed':'One-shot',item.hook||'New sound'];
    this.details.append(el('div',{class:'lib-tags'},...tags.map(text=>el('span',{text}))));
    if(m)this.details.append(el('p',{class:'dim',text:`${m.sampleRate/1000} kHz · ${item.type==='song'?'AAC audition / 24-bit WAV render':'24-bit stereo WAV'} · peak ${m.stats.peakDb.toFixed(1)} dBFS · RMS ${m.stats.rmsDb.toFixed(1)} dBFS`}));
    const actions=el('div',{class:'lib-actions'});
    if(item.type==='song'){
      actions.append(el('button',{class:'btn primary',text:'Open full arrangement',onclick:()=>this.openScore()}),el('button',{class:'btn',text:'↓ MIDI + drum patterns',onclick:()=>download(item.id+'.mid',new Blob([writeMidiFile(scoreProject(item))]),'audio/midi')}),
        el('button',{class:'btn',text:'↓ Editable project',onclick:()=>download(item.id+'.dawcat.json',JSON.stringify(scoreProject(item),null,2),'application/json')}),el('button',{class:'btn',text:'↓ 7 aligned WAV stems',onclick:()=>this.stems()}));
    }else{
      actions.append(el('button',{class:'btn primary',text:'Open in Wave Lab',onclick:()=>this.openWave()}),el('button',{class:'btn',text:'Generate next take',onclick:()=>this.generateTake()}),el('button',{class:'btn',text:'↓ Recipe JSON',onclick:()=>download(item.id+'.recipe.json',JSON.stringify({...item,recipe:{...item.recipe,...this.recipeOverrides[item.id]}},null,2),'application/json')}));
      if(item.hook?.startsWith('play')&&typeof OriginalAudioManager.prototype[item.hook.split(':')[0]]==='function')actions.append(el('button',{class:'btn',text:'A/B · original game sound',onclick:()=>this.compareOriginal()}));
    }
    actions.append(el('button',{class:'btn',text:'↓ 24-bit WAV',onclick:()=>this.exportWav()}),el('button',{class:'btn',text:'Cancel render',onclick:()=>{this.cancelRender();this.setStatus('Render cancelled');}}));
    this.details.append(actions);
    if(item.type==='sfx')this.details.append(this.recipeEditor(item));
    if(item.type==='song')this.details.append(el('div',{class:'lib-form'},...scoreProject(item).markers.map((marker,i)=>el('button',{class:'mini-btn',text:`${marker.bar+1} · ${marker.name}`,onclick:()=>{this.audio.currentTime=marker.bar*240/item.tempo;this.play();}}))));
    this.details.append(el('p',{class:'lib-provenance',text:'Original coded synthesis and composition. These are designed approximations of acoustic instruments and animals. All sources and recipes are included.'}));
    this.drawWave();
  }
  openScore(){
    const item=this.selected;this.stop();this.app.liveMidi.panic();this.app.transport.stop();const st=this.app.state;st.pushUndo();st.flushUndo();st.setProject(scoreProject(item),{resetUndo:false});
    this.app.switchTab('arrangement');this.app.arrangement.zoomFit();toast('Full arrangement loaded · Ctrl+Z restores your previous project');
  }
  async openWave(){
    const item=this.selected,token=this.generation;
    try{this.setStatus('Loading into Wave Lab…');let bytes;if(this.recipeOverrides[item.id]||this.take)bytes=(await this.renderBytes(item)).buffer;else{const r=await fetch(mediaUrl(item));if(!r.ok)throw new Error('Render the library first');bytes=await r.arrayBuffer();}const ctx=this.app.engine.ensure().ctx;const buffer=await ctx.decodeAudioData(bytes);
      if(token!==this.generation)return;await this.app.waveLab.saveBufferAsAsset(buffer,item.name,{select:true});this.stop();this.app.switchTab('wavelab');toast('Audio loaded; trim, reshape, master, or place it on the timeline');
    }catch(e){this.setStatus(e.message);}
  }
  renderBytes(item=this.selected,take=this.take,trackId=null){
    if(this.worker)return Promise.reject(new Error('A render is running. Cancel it before starting another.'));
    return new Promise((resolve,reject)=>{
      const worker=new Worker(new URL('../library/render-worker.js',import.meta.url),{type:'module'});this.worker=worker;this.rejectRender=reject;
      const finish=()=>{worker.terminate();if(this.worker===worker)this.worker=null;this.rejectRender=null;};
      worker.onmessage=({data})=>{if(data.progress){this.setStatus(`Rendering ${data.progress.name} · ${data.progress.track}/${data.progress.total}`);return;}finish();if(data.error)reject(new Error(data.error));else resolve(data.bytes);};
      worker.onerror=e=>{finish();reject(new Error(e.message||'Audio worker failed'));};worker.postMessage({id:item.id,type:item.type,take,trackId,recipe:this.recipeOverrides[item.id]||null});
    });
  }
  cancelRender(){if(this.worker){this.worker.terminate();this.worker=null;const reject=this.rejectRender;this.rejectRender=null;reject?.(new Error('Render cancelled'));}}
  async generateTake(){const item=this.selected,token=this.generation;try{this.setStatus('Synthesizing a new take…');const bytes=await this.renderBytes(item,++this.take);if(token!==this.generation)return;this.releaseBlob();this.blobUrl=URL.createObjectURL(new Blob([bytes],{type:'audio/wav'}));this.audio.src=this.blobUrl;this.play();this.setStatus(`${item.name} · deterministic take ${this.take}`);}catch(e){this.setStatus(e.message);}}
  async exportWav(){const item=this.selected;try{this.setStatus('Rendering 48 kHz / 24-bit WAV…');const bytes=await this.renderBytes(item);download(item.id+'.wav',new Blob([bytes],{type:'audio/wav'}),'audio/wav');this.setStatus('WAV downloaded · '+item.name);}catch(e){this.setStatus(e.message);}}
  async stems(){
    const item=this.selected;if(this.busy)return;this.busy=true;const token=this.generation;
    try{const p=scoreProject(item),entries=[];for(let i=0;i<p.tracks.length;i++){if(token!==this.generation)throw new Error('Stem export cancelled');this.setStatus(`Rendering aligned stem ${i+1}/7…`);const bytes=await this.renderBytes(item,0,p.tracks[i].id);entries.push({name:`${item.id}/${String(i+1).padStart(2,'0')}-${p.tracks[i].preset?.model||'drums'}.wav`,data:bytes});}
      entries.push({name:item.id+'/README.txt',data:'48 kHz 24-bit stereo. All stems start at zero and include the same four-second tail. Track gain, pan, volume automation, sends and master fader are printed. No master compressor or normalization: summing stems recreates the pre-master mix.\n'});
      download(item.id+'-stems.zip',new Blob([createZip(entries)]),'application/zip');this.setStatus('Seven aligned stems downloaded');
    }catch(e){this.setStatus(e.message);}finally{this.busy=false;}
  }
  async compareOriginal(){
    const item=this.selected,token=this.generation,[method,surface]=item.hook.split(':');this.setStatus('Rendering the original game sound…');
    try{const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext,ctx=new Offline(2,48000*Math.ceil(Math.max(3,item.duration+1)),48000),audio=new OriginalAudioManager();
      audio.ctx=ctx;audio.initialized=true;audio.master=ctx.destination;audio.buses={ambient:ctx.destination,sfx:ctx.destination};audio.lastFootstep=-1;
      if(method==='playFootstep')audio[method](surface);else audio[method]();
      const buffer=await ctx.startRendering();if(token!==this.generation)return;peakNormalize(buffer,-4);
      this.releaseBlob();this.blobUrl=URL.createObjectURL(wavBlob(buffer));this.audio.src=this.blobUrl;await this.play();
      this.setStatus('A · original game implementation, peak matched to −4 dBFS. Press the library row for B · new design.');
    }catch(e){this.setStatus('Comparison failed: '+e.message);}
  }
  async collection(){
    if(this.busy)return;this.busy=true;const items=this.visibleItems(),entries=[];
    try{for(let i=0;i<items.length;i++){const item=items[i];this.setStatus(`Packing ${i+1}/${items.length} · ${item.name}`);const r=await fetch(mediaUrl(item));if(!r.ok)throw new Error('Missing rendered media. Run npm run library:build first.');entries.push({name:`${item.type}/${item.id}.${item.type==='song'?'m4a':'wav'}`,data:new Uint8Array(await r.arrayBuffer())});if(item.type==='song'){entries.push({name:`projects/${item.id}.dawcat.json`,data:JSON.stringify(scoreProject(item),null,2)});entries.push({name:`midi/${item.id}.mid`,data:writeMidiFile(scoreProject(item))});}}
      entries.push({name:'recipes.json',data:JSON.stringify({sounds:SOUNDS,scores:SCORES,instruments:INSTRUMENTS},null,2)});
      download('dawcat-kyoto-collection.zip',new Blob([createZip(entries)]),'application/zip');this.setStatus(`Downloaded ${items.length} selected library items, recipes and editable song data`);
    }catch(e){this.setStatus(e.message);}finally{this.busy=false;}
  }
  midiPanel(){
    const midi=this.app.liveMidi,status=el('span',{class:'dim',text:midi.status}),inputs=el('select',{'aria-label':'MIDI input'});
    const refresh=()=>{status.textContent=midi.status;inputs.innerHTML='';inputs.append(el('option',{value:'all',text:'All MIDI inputs'}));if(midi.access)for(const input of midi.access.inputs.values())inputs.append(el('option',{value:input.id,text:input.name||input.id}));inputs.value=midi.inputId;};
    midi.addEventListener('change',refresh);inputs.addEventListener('change',()=>{midi.inputId=inputs.value;midi.panic();});refresh();
    return el('section',{class:'lib-midi'},el('strong',{text:'Studio MIDI'}),el('button',{class:'btn',text:'Connect keyboard',onclick:async()=>{try{await midi.connect();}catch(e){toast(e.message,true);}}}),inputs,
      el('button',{class:'btn',text:'Panic / all notes off',onclick:()=>midi.panic()}),el('button',{class:'btn',text:'Disconnect',onclick:()=>midi.disconnect()}),status,
      el('small',{text:'Select a synth track. Arm it and enable transport Record to capture velocity and held-note lengths. Sustain CC64 and ±2 semitone pitch bend are heard live; only notes are written to MIDI clips.'}));
  }
  recipeEditor(item) {
    const details=el('details',{class:'lib-recipe'},el('summary',{text:'Refine this sound recipe'}));
    const recipe={...item.recipe,...this.recipeOverrides[item.id]},numeric=Object.entries(recipe).filter(([,value])=>typeof value==='number');
    for(const [key,value] of numeric){
      const unit=['open','impact','motion','breath'].includes(key), max=unit?1:['grains','bubbles'].includes(key)?300:key==='f0'?2000:key==='midi'?108:key==='decay'?9:key==='rate'||key==='trill'?160:16000;
      const input=el('input',{type:'number',value,min:0,max,step:unit ? .05 : ['f0','color','grit','body','midi','grains','bubbles','rate','trill'].includes(key)?1:.05,'aria-label':'Recipe '+key});
      input.addEventListener('change',()=>{const next=Math.max(0,Math.min(max,Number(input.value)));if(!Number.isFinite(next))return;input.value=next;this.recipeOverrides[item.id]={...(this.recipeOverrides[item.id]||{}),[key]:next};try{localStorage.setItem('dawcat-kyoto-recipes',JSON.stringify(this.recipeOverrides));}catch{}});
      details.append(el('label',{},key+' ',input));
    }
    details.append(el('button',{class:'btn',text:'Render refined recipe',onclick:()=>this.generateTake()}),el('button',{class:'btn',text:'Reset recipe',onclick:()=>{delete this.recipeOverrides[item.id];try{localStorage.setItem('dawcat-kyoto-recipes',JSON.stringify(this.recipeOverrides));}catch{}this.showDetails();}}));
    return details;
  }
  playlistPanel() {
    const name=el('input',{type:'text',placeholder:'Name a listening playlist','aria-label':'Playlist name',maxlength:60}),select=el('select',{'aria-label':'Saved playlists'});
    const refresh=()=>{select.innerHTML='';select.append(el('option',{value:'',text:'Saved playlists…'}));Object.keys(this.playlists).forEach(n=>select.append(el('option',{value:n,text:`${n} · ${this.playlists[n].length}`})));};refresh();
    const save=()=>{const n=name.value.trim();if(!n){this.setStatus('Enter a playlist name first');return;}const ids=this.queue.length?[...this.queue]:this.visibleItems().map(i=>i.id);Object.defineProperty(this.playlists,n,{value:ids,writable:true,enumerable:true,configurable:true});try{localStorage.setItem('dawcat-kyoto-playlists',JSON.stringify(this.playlists));}catch{}refresh();select.value=n;this.setStatus(`Saved ${ids.length} items in “${n}”`);};
    const play=()=>{const ids=this.playlists[select.value];if(!ids?.length)return;this.activePlaylist=ids.slice();this.queue=ids.slice(1);this.queueLabel.textContent='Queue · '+this.queue.length;this.select(ITEMS.find(i=>i.id===ids[0])||ITEMS[0]);this.play();};
    return el('div',{class:'lib-playlists'},name,el('button',{class:'btn',text:'Save queue / results',onclick:save}),select,
      el('button',{class:'btn',text:'Play playlist',onclick:play}),el('button',{class:'btn',text:'Delete playlist',onclick:()=>{delete this.playlists[select.value];try{localStorage.setItem('dawcat-kyoto-playlists',JSON.stringify(this.playlists));}catch{}refresh();}}),
      el('button',{class:'btn',text:'Clear queue',onclick:()=>{this.queue=[];this.queueLabel.textContent='Queue · 0';}}));
  }
}
