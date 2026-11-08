import { test, assert, installDomShims } from './harness.mjs';
import { createHash } from 'node:crypto';
import { SOUNDS } from '../src/library/sounds.js';
import { SCORES, scoreProject, MODES } from '../src/library/scores.js';
import { INSTRUMENTS, instrumentPreset } from '../src/library/instruments.js';
import { renderSound } from '../src/library/sfx-renderer.js';
import { renderScore } from '../src/library/score-renderer.js';
import { synthVoice, drumVoice } from '../src/library/voices.js';
import { pcm, stats, encodeWav } from '../src/library/pcm.js';
import { processMastering } from '../src/library/mastering.js';
import { buildClipEvents } from '../src/engine/transport.js';
import { decodeMidi, LiveMidi } from '../src/engine/live-midi.js';
import { writeMidiFile, parseMidiFile, midiDrumClips } from '../src/midi.js';
import { playSynthNote } from '../src/engine/synth.js';
import { exportToGame } from '../src/bridge.js';
import { AppState } from '../src/state.js';
import { FakeAudioContext } from './fake-audio.mjs';
import { scheduleParameterAutomation, scheduleDeviceAutomation } from '../src/engine/render.js';
installDomShims();
const digest = data => createHash('sha256').update(data).digest('hex');
const floatHash = data => digest(new Uint8Array(data.buffer,data.byteOffset,data.byteLength));

test('Kyoto library contains exactly 50 distinct sound recipes and 25 distinct scores',()=>{
  assert.equal(SOUNDS.length,50);assert.equal(SCORES.length,25);assert.equal(new Set([...SOUNDS,...SCORES].map(x=>x.id)).size,75);
  assert.equal(new Set(SOUNDS.map(s=>JSON.stringify([s.model,s.recipe]))).size,50);
  assert.equal(new Set(SCORES.map(s=>JSON.stringify([s.motif,s.rhythm]))).size,25);
});
for(const sound of SOUNDS)test(`PCM / ${sound.id}: finite, audible, headroom, fades and reproducible`,()=>{
  const a=renderSound(sound,{sampleRate:12000}),b=renderSound(sound,{sampleRate:12000}),s=stats(a),d=a.getChannelData(0);
  assert.equal(a.length,Math.ceil(sound.duration*12000));assert.equal(s.nonFinite,0);assert(s.peak<.64);assert(s.rms>1e-5);assert(Math.abs(s.dc)<.02);
  assert(Math.abs(d[0])<1e-9);assert(Math.abs(d.at(-1))<1e-9);assert.equal(floatHash(d),floatHash(b.getChannelData(0)));
});
test('New takes change animal, foley and ambience PCM without changing duration',()=>{
  for(const id of ['cat-greeting','paw-gravel','water-splash','rain-eaves']){
    const s=SOUNDS.find(s=>s.id===id),a=renderSound(s,{sampleRate:12000,take:1}),b=renderSound(s,{sampleRate:12000,take:2});assert.notEqual(floatHash(a.getChannelData(0)),floatHash(b.getChannelData(0)));assert.equal(a.length,b.length);
  }
});
for(const score of SCORES)test(`Arrangement / ${score.id}: complete sections, scale, drums and editable MIDI`,()=>{
  const p=scoreProject(score),q=scoreProject(score);assert.deepEqual(p,q);assert.equal(p.tracks.length,7);assert.equal(p.markers.length,6);assert.equal(p.bars,36);
  const events=p.tracks.flatMap(t=>t.clips.flatMap(c=>buildClipEvents(p,t,c))),notes=events.filter(e=>e.kind==='note'),drums=events.filter(e=>e.kind==='drum');
  assert(notes.length>200);assert(drums.length>10);assert(notes.every(n=>n.beat>=0&&n.beat<144&&n.len>0&&n.vel>0&&n.vel<=1));
  assert(notes.every(n=>MODES[score.mode].includes(((n.midi-score.root)%12+12)%12)));
  for(const section of p.markers)assert(events.some(e=>e.beat>=section.bar*4&&e.beat<(section.bar+4)*4));
  const midi=writeMidiFile(p),parsed=parseMidiFile(midi);assert.equal(parsed.tracks.length,7);assert(Math.abs(parsed.bpm-p.tempo)<.01);
  const drumTrack=parsed.tracks.find(t=>t.name.includes('06'));assert.equal(drumTrack.channel,9);assert(drumTrack.notes.length>10);assert(drumTrack.notes.every(n=>[36,38,39,42,46,45,37,56].includes(n.midi)));
  const importedHits=midiDrumClips(drumTrack.notes).reduce((n,c)=>n+Object.values(c.steps).flat().filter(Boolean).length,0);assert.equal(importedHits,drums.length);
  const state=new AppState();assert(state.loadJSON(JSON.stringify(p)));assert.equal(state.project.tracks[0].preset.model,score.lead);
});
test('All 16 instruments render real PCM and every drum lane has a distinct modeled voice',()=>{
  const hashes=new Set();
  for(const i of INSTRUMENTS){const v=synthVoice(i.id,60,.4,.7,12000,1,instrumentPreset(i.id)),s=stats(pcm(12000,[v]));assert.equal(s.nonFinite,0);assert(s.rms>1e-5);hashes.add(floatHash(v));}
  assert.equal(hashes.size,16);
  const drums=['kick','snare','clap','hatC','hatO','tom','rim','perc'].map(l=>drumVoice(l,'kyoto',.8,24000));assert.equal(new Set(drums.map(floatHash)).size,8);
});
test('String instruments are tuned near concert C4, with velocity-responsive energy',()=>{
  const sr=24000,expected=261.625565;
  for(const name of ['koto','shamisen','biwa']){
    const d=synthVoice(name,60,1,.8,sr,1);let best=-1,lag=0;
    for(let l=80;l<105;l++){let xy=0,xx=0,yy=0;for(let i=3600;i<8400;i++){xy+=d[i]*d[i+l];xx+=d[i]**2;yy+=d[i+l]**2;}const c=xy/Math.sqrt(xx*yy);if(c>best){best=c;lag=l;}}
    assert(Math.abs(1200*Math.log2(sr/lag/expected))<25,`${name} tuning`);
    assert(stats(pcm(sr,[synthVoice(name,60,.5,.9,sr)])).rms>stats(pcm(sr,[synthVoice(name,60,.5,.25,sr)])).rms);
  }
});
test('Portable dry stems sum to the same complete pre-master mix',()=>{
  const p=scoreProject(SCORES[1]);p.tracks=p.tracks.slice(0,2).map(t=>({...t,clips:t.clips.slice(0,2)}));
  const mix=renderScore(p,{sampleRate:8000,master:false}),stems=p.tracks.map(t=>renderScore(p,{sampleRate:8000,trackId:t.id,master:false}));
  let max=0;for(let ch=0;ch<2;ch++)for(let i=0;i<mix.length;i++)max=Math.max(max,Math.abs(mix.getChannelData(ch)[i]-stems[0].getChannelData(ch)[i]-stems[1].getChannelData(ch)[i]));
  assert(max<2e-6,`stem summation error ${max}`);
});
test('24-bit WAV has consistent stereo byte layout, bounded values and deterministic dither',()=>{
  const p=pcm(48000,[new Float32Array([0,.5,-.5,1,-1]),new Float32Array(5)]),bytes=encodeWav(p),v=new DataView(bytes.buffer);
  assert.equal(v.getUint16(34,true),24);assert.equal(v.getUint32(24,true),48000);assert.equal(v.getUint32(40,true),30);assert.equal(bytes.length,74);assert.deepEqual(encodeWav(p),bytes);
  assert.throws(()=>encodeWav(p,32));assert.throws(()=>encodeWav(pcm(48000,[new Float32Array([NaN])])));
});
test('Mastering preserves stereo ratio, removes DC, honours peak ceiling and leaves source immutable',()=>{
  const L=Float32Array.from({length:8000},(_,i)=>.3+Math.sin(i*.2)*.5),R=Float32Array.from(L,x=>x*.5),source=pcm(8000,[L,R]),before=floatHash(L);
  const dc=processMastering(source,'dc');assert(Math.abs(stats(dc).dc)<1e-6);assert.equal(floatHash(L),before);
  const compressed=processMastering(source,'compress',{threshold:-20,ratio:4});for(let i=0;i<L.length;i+=73)assert(Math.abs(compressed.getChannelData(1)[i]*2-compressed.getChannelData(0)[i])<1e-6);
  const normalized=processMastering(source,'normalize',{ceiling:-3});assert(Math.abs(stats(normalized).peakDb+3)<.001);
});
test('Modeled voices use AudioBuffer playback on the native engine and are guarded from incompatible game exports',()=>{
  const ctx=new FakeAudioContext({sampleRate:12000});playSynthNote({ctx},ctx.destination,instrumentPreset('koto'),60,0,.3,.6);
  assert(ctx.nodes.some(n=>n.kind==='bufferSource'&&n.buffer?.length>0));assert.throws(()=>exportToGame(scoreProject(SCORES[0])),/integration is pending/);
});
test('MIDI decodes zero-velocity offs, sustain and signed 14-bit pitch bend',()=>{
  assert.deepEqual(decodeMidi([0x92,64,100]),{type:'on',channel:2,note:64,velocity:100/127});assert.equal(decodeMidi([0x90,60,0]).type,'off');
  assert.equal(decodeMidi([0xe0,0,64]).semitones,0);assert.equal(decodeMidi([0xe0,0,0]).semitones,-2);assert.equal(decodeMidi([0xb0,64,127]).controller,64);
});
test('Offline export schedules real track/device/master automation with correct beat timing',()=>{
  const ctx=new FakeAudioContext(),param=ctx.createGain().gain;
  scheduleParameterAutomation(param,[{beat:4,value:.8},{beat:0,value:.2}],.5,.75);
  assert.deepEqual(param.events,[['set',.2*.75,0],['lin',.2*.75,0],['lin',.8*.75,2]]);
  const filter=ctx.createBiquadFilter();scheduleDeviceAutomation({deviceParams:{f:{freq:filter.frequency}}},{automation:{devices:{f:{freq:[{beat:0,value:500},{beat:8,value:4000}]}}}},.5);
  assert.deepEqual(filter.frequency.events.at(-1),['lin',4000,4]);
});
test('Hardware MIDI capture retains held duration and sustain, then panic cleans voices',()=>{
  const state=new AppState();state.setProject(scoreProject(SCORES[0]));state.project.tracks[0].arm=true;
  const ctx=new FakeAudioContext({sampleRate:8000,currentTime:1}),transport=new EventTarget();Object.assign(transport,{playing:true,recording:true,spb:1,timeToBeat:t=>t});
  const app={state,transport,engine:{ctx,pack:{ctx},ensure(){return this.pack;},rebuildAll(){},trackInput(){return ctx.destination;},register(){}}},midi=new LiveMidi(app);
  midi.receive([0x90,60,90]);midi.receive([0xb0,64,127]);ctx.currentTime=2;midi.receive([0x80,60,0]);assert.equal(midi.voices.size,1);
  ctx.currentTime=3;midi.receive([0xb0,64,0]);assert.equal(midi.voices.size,0);
  const notes=state.project.tracks[0].clips.flatMap(c=>c.notes);assert(notes.some(n=>n.midi===60&&n.len===2&&n.vel===90/127));midi.panic();state.flushUndo();
});
