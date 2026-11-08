/* Reproducible content build. Writes only dawCAT/media; scratch WAVs use OS tmp. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { SOUNDS } from '../src/library/sounds.js';
import { SCORES, scoreProject } from '../src/library/scores.js';
import { INSTRUMENTS } from '../src/library/instruments.js';
import { renderSound } from '../src/library/sfx-renderer.js';
import { renderScore, waveformPeaks } from '../src/library/score-renderer.js';
import { encodeWav, stats } from '../src/library/pcm.js';
import { writeMidiFile } from '../src/midi.js';
import { writeCollectionIndex } from './collection-index.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), media = path.join(root, 'media');
const args = process.argv.slice(2), only = args.find(x => x.startsWith('--only='))?.slice(7);
const lossless = args.includes('--lossless'), sfxOnly = args.includes('--sfx'), skipExisting = args.includes('--resume');
const run = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }); if (r.status !== 0) throw new Error(`${cmd}: ${r.error?.message || r.stderr}`); return r; };
run('ffmpeg', ['-version']);
for (const sub of ['sfx','music','projects','midi']) fs.mkdirSync(path.join(media, sub), { recursive:true });
const manifestPath = path.join(media, 'manifest.json');
let existing = []; try { existing = JSON.parse(fs.readFileSync(manifestPath)).items || []; } catch {}
const records = new Map(existing.map(x => [x.id,x]));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dawcat-render-'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceHash = hash(Buffer.concat(['src/library/pcm.js','src/library/instruments.js','src/library/voices.js','src/library/sounds.js','src/library/sfx-renderer.js','src/library/scores.js','src/library/score-renderer.js','src/library/mastering.js','src/engine/transport.js','src/midi.js'].map(file=>fs.readFileSync(path.join(root,file)))));
const items = [...SOUNDS,...(sfxOnly ? [] : SCORES)].filter(x => !only || x.id.includes(only));
function saveManifest() {
  const all = [...SCORES,...SOUNDS].map(i => records.get(i.id)).filter(Boolean);
  fs.writeFileSync(manifestPath, JSON.stringify({ version: 1, collection: 'The Kyoto Sessions · Vol. 01', sourceDate:'2026-11-08',
    synthesis:'Original seeded DSP; no third-party samples or pretrained audio models', sampleRate:48000, sourceHash,
    mastering:'24-bit SFX at -4 dBFS peak (-9 for beds). Music: gentle stereo-linked compression; -22 dBFS RMS target constrained to -2 dBFS sample peak. AAC delivery is measured separately with FFmpeg ebur128.',
    instruments:INSTRUMENTS, items:all },null,2)+'\n');
}
try {
  for (let i=0;i<items.length;i++) {
    const item=items[i], sub=item.type==='song'?'music':'sfx', ext=item.type==='song'?'m4a':'wav', relative=`${sub}/${item.id}.${ext}`, dest=path.join(media,relative);
    const previous=records.get(item.id),auxiliaryReady=item.type!=='song'||fs.existsSync(path.join(media,'projects',item.id+'.dawcat.json'))&&fs.existsSync(path.join(media,'midi',item.id+'.mid'));
    const losslessReady=!lossless||item.type!=='song'||fs.existsSync(path.join(media,'music',item.id+'.flac'));
    if(skipExisting && auxiliaryReady && losslessReady && fs.existsSync(dest) && previous?.sourceHash===sourceHash && previous?.recipeSha256===hash(JSON.stringify(item)) && previous?.sha256===hash(fs.readFileSync(dest))) { console.log(`Keep ${item.id}`); continue; }
    const start=Date.now(); console.log(`[${i+1}/${items.length}] ${item.id}`);
    const project=item.type==='song'?scoreProject(item):null;
    const buffer=project?renderScore(project):renderSound(item), measured=stats(buffer);
    if(measured.nonFinite || measured.peak>1 || measured.rms<1e-5) throw new Error(`Bad PCM: ${item.id} ${JSON.stringify(measured)}`);
    const wav=encodeWav(buffer,24), scratch=path.join(temp,item.id+'.wav');
    if(project){
      fs.writeFileSync(scratch,wav);
      run('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',scratch,'-c:a','aac','-b:a','192k','-movflags','+faststart','-metadata',`title=${item.name}`,'-metadata','artist=dawCAT · The Kyoto Sessions',dest]);
      if(lossless)run('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',scratch,'-c:a','flac',path.join(media,'music',item.id+'.flac')]);
      fs.writeFileSync(path.join(media,'projects',item.id+'.dawcat.json'),JSON.stringify(project,null,2)+'\n');
      fs.writeFileSync(path.join(media,'midi',item.id+'.mid'),writeMidiFile(project));
      fs.unlinkSync(scratch);
    }else fs.writeFileSync(dest,wav);
    // Measure the encoded delivery, including codec overshoot, with the ITU
    // implementation provided by FFmpeg rather than mislabelling RMS as LUFS.
    const metering=run('ffmpeg',['-hide_banner','-nostats','-i',dest,'-af','ebur128=peak=true','-f','null','-']).stderr;
    const summaries=[...metering.matchAll(/I:\s+(-?[\d.]+) LUFS/g)], peaks=[...metering.matchAll(/Peak:\s+(-?[\d.]+) dBFS/g)], ranges=[...metering.matchAll(/LRA:\s+([\d.]+) LU/g)];
    const bytes=fs.readFileSync(dest);
    records.set(item.id,{id:item.id,name:item.name,type:item.type,category:item.category,path:relative,duration:buffer.duration,sampleRate:48000,channels:2,sourceHash,
      stats:measured,delivery:{integratedLufs:buffer.duration<.4?null:Number(summaries.at(-1)?.[1]),truePeakDb:Number(peaks.at(-1)?.[1]),loudnessRangeLu:buffer.duration<3?null:Number(ranges.at(-1)?.[1]),note:buffer.duration<.4?'Too short for a 400 ms integrated loudness block':null},
      bytes:bytes.length,sha256:hash(bytes),recipeSha256:hash(JSON.stringify(item)),peaks:waveformPeaks(buffer),seed:item.seed,
      ...(project?{project:`projects/${item.id}.dawcat.json`,midi:`midi/${item.id}.mid`,tracks:project.tracks.length,notes:project.tracks.reduce((n,t)=>n+t.clips.reduce((m,c)=>m+c.notes.length,0),0)}:{recipe:item.recipe,hook:item.hook,loop:item.loop})});
    saveManifest();console.log(`  ${buffer.duration.toFixed(1)}s · ${measured.peakDb.toFixed(1)} dBFS · ${records.get(item.id).delivery.integratedLufs} LUFS · ${((Date.now()-start)/1000).toFixed(1)}s render`);
  }
} finally { fs.rmSync(temp,{recursive:true,force:true}); }
writeCollectionIndex(root);
console.log(`Library ready: ${records.size}/75 items in ${media}`);
