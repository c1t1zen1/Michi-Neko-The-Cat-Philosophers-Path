import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { SOUNDS } from '../src/library/sounds.js';
import { SCORES, scoreProject } from '../src/library/scores.js';
import { parseMidiFile } from '../src/midi.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),media=path.join(root,'media');
const manifest=JSON.parse(fs.readFileSync(path.join(media,'manifest.json'))),records=new Map(manifest.items.map(i=>[i.id,i]));
const report={date:'2026-11-08',checks:[],failures:[],items:[],scope:'Objective file and signal checks; no claim of human listening approval or commercial DAW feature parity'};
const check=(label,fn)=>{try{fn();report.checks.push(label);}catch(e){report.failures.push({label,error:e.message});}};
check('50 SFX and 25 complete songs',()=>{assert.equal(manifest.items.filter(i=>i.type==='sfx').length,50);assert.equal(manifest.items.filter(i=>i.type==='song').length,25);});
let totalMusicSeconds=0,totalBytes=0;
for(const item of [...SOUNDS,...SCORES]){
  const entry=records.get(item.id);
  check(`${item.id}: delivered media hash, format, duration, PCM headroom and data`,()=>{
    assert(entry,'missing manifest record');const full=path.join(media,entry.path),bytes=fs.readFileSync(full);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);
    assert.equal(entry.stats.nonFinite,0);assert(entry.stats.peak<.8);assert(entry.stats.rms>1e-5);assert(Math.abs(entry.stats.dc)<.02);
    const probe=spawnSync('ffprobe',['-v','error','-show_streams','-of','json',full],{encoding:'utf8'});assert.equal(probe.status,0,probe.stderr);
    const stream=JSON.parse(probe.stdout).streams.find(s=>s.codec_type==='audio');assert.equal(Number(stream.sample_rate),48000);assert.equal(stream.channels,2);assert(Math.abs(Number(stream.duration)-entry.duration)<.1);
    if(item.type==='sfx'){assert.equal(stream.bits_per_sample,24);assert.equal(stream.codec_name,'pcm_s24le');}else{assert.equal(stream.codec_name,'aac');assert(Number.isFinite(entry.delivery.integratedLufs));assert(entry.delivery.truePeakDb<-.5);}
    const decode=spawnSync('ffmpeg',['-v','error','-i',full,'-f','null','-'],{encoding:'utf8'});assert.equal(decode.status,0,decode.stderr);
    totalBytes+=bytes.length;if(item.type==='song')totalMusicSeconds+=entry.duration;
    report.items.push({id:item.id,seconds:entry.duration,peakDb:entry.stats.peakDb,rmsDb:entry.stats.rmsDb,delivery:entry.delivery});
  });
  if(item.type==='song')check(`${item.id}: editable project and MIDI including drums`,()=>{
    const p=JSON.parse(fs.readFileSync(path.join(media,entry.project),'utf8'));assert.deepEqual(p,scoreProject(item));assert.equal(p.tracks.length,7);assert.equal(p.markers.length,6);
    const midi=parseMidiFile(fs.readFileSync(path.join(media,entry.midi)));assert.equal(midi.tracks.length,7);assert(Math.abs(midi.bpm-item.tempo)<.01);
  });
}
const catalog=JSON.parse(fs.readFileSync(path.join(root,'docs/GAME_AUDIO_CATALOG.json')));
check('Source audit still matches all three untouched game audio files',()=>{for(const s of catalog.sources)assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,'..',s.file))).digest('hex'),s.sha256);assert.equal(catalog.entries.length,28);});
report.summary={passed:report.checks.length,failed:report.failures.length,sfx:50,songs:25,musicMinutes:totalMusicSeconds/60,mediaMiB:totalBytes/1024/1024};
fs.writeFileSync(path.join(root,'docs/LIBRARY_VERIFICATION.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.summary,null,2));if(report.failures.length){console.error(report.failures);process.exitCode=1;}
