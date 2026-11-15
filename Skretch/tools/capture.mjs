#!/usr/bin/env node
// Run from the repository root. External packages only: PLAYWRIGHT_MODULE and
// SHARP_MODULE may name their installed modules. No game source is modified.
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage } from '../../tools/headless.mjs';
import { buildLevel } from '../../rooftops/js/level.js';
const require=createRequire(import.meta.url);
const sharp=require(process.env.SHARP_MODULE || 'sharp');
const dir=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const level=buildLevel(), width=1200,height=750;
const main={id:'main',name:'Full stage',length:level.length,frames:[]};
const routes=[main];
const district=s=>[...level.mouths].reverse().find(m=>s>=m.s0)?.romaji || 'Awataguchi';
for(const seg of level.rail.segs) {
  const count=seg.type==='arc'?1:Math.max(1,Math.round((seg.s1-seg.s0)/32));
  for(let i=0;i<count;i++) {
    const s0=seg.s0+(seg.s1-seg.s0)*i/count, s1=seg.s0+(seg.s1-seg.s0)*(i+1)/count;
    const index=main.frames.length,id=`main-${String(index+1).padStart(3,'0')}`;
    main.frames.push({id,index,title:seg.type==='arc'?'Street turn':district((s0+s1)/2),district:district((s0+s1)/2),s0,s1,kind:seg.type==='arc'?'turn':'street',leg:seg.leg??null,image:`assets/frames/${id}.jpg`,thumb:`assets/thumbs/${id}.jpg`,width,height});
  }
}
if(main.frames.length*width>65000)throw new Error('Main JPEG would exceed the JPEG width limit');
for(const a of level.alleys) {
  const route={id:`alley-${a.id}`,name:a.name,length:a.s1-a.s0,s0:a.s0,s1:a.s1,frames:[]};
  const count=2;
  for(let i=0;i<count;i++) {
    const id=`alley-${a.id}-${i+1}`, s0=a.s0+(a.s1-a.s0)*i/count,s1=a.s0+(a.s1-a.s0)*(i+1)/count;
    route.frames.push({id,index:i,title:a.name,district:district((s0+s1)/2),s0,s1,alley:a.id,kind:'alley',span:27,image:`assets/frames/${id}.jpg`,thumb:`assets/thumbs/${id}.jpg`,width,height});
  }
  routes.push(route);
}
for(const p of ['assets/frames','assets/thumbs'])await mkdir(join(dir,p),{recursive:true});
const h=await openPage('/Skretch/tools/capture.html',{size:`${width}x${height}`,timeout:240});
try {
  await h.page.waitForFunction(()=>window.skretchCapture?.ready,{timeout:240000});
  for(const route of routes) for(const frame of route.frames) {
    frame.camera=await h.page.evaluate(frame=>skretchCapture.render(frame),frame);
    await h.page.screenshot({path:join(dir,frame.image),type:'jpeg',quality:93});
    await sharp(join(dir,frame.image)).resize(320,200).jpeg({quality:78}).toFile(join(dir,frame.thumb));
    console.log(frame.id,frame.kind,`${frame.s0.toFixed(1)}–${frame.s1.toFixed(1)}m`);
  }
  if(h.errors.length)throw new Error(h.errors.join('\n'));
} finally {await h.close();}
const stitched=join(dir,'assets/rooftops-stage-2-full.jpg');
await sharp({create:{width:main.frames.length*width,height,channels:3,background:'#e6d9c2'}})
 .composite(main.frames.map((frame,i)=>({input:join(dir,frame.image),left:i*width,top:0})))
 .jpeg({quality:92}).toFile(stitched);
const sourcePaths=['rooftops/js/level.js','rooftops/js/build.js','rooftops/js/alleys.js','rooftops/js/downtown.js'];
const files={};
for(const p of sourcePaths)files[p]=createHash('sha256').update(await readFile(join(dir,'..',p))).digest('hex');
const manifest={version:1,id:'rooftops-stage-2',title:'The Roof Road',capturedAt:new Date().toISOString(),width,height,
 panorama:'assets/rooftops-stage-2-full.jpg',panoramaWidth:main.frames.length*width,panoramaHeight:height,
 source:{entry:'../kyoto-rooftops.html',length:level.length,files,lighting:'Fixed warm daytime phase 0.24',method:'Real Stage 2 geometry, orthographic elevations. Straight street panels meet at matching edges; each curved turn is a separate wider view. The winding 3D route is unfolded in travel order, so turn boundaries are intentional perspective transitions. Alley supplements use oblique overhead views to expose the courts behind street façades.',frameCount:routes.reduce((n,r)=>n+r.frames.length,0)},districts:level.mouths,routes};
await writeFile(join(dir,'assets/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({frames:manifest.source.frameCount,main:main.frames.length,panorama:manifest.panorama,width:manifest.panoramaWidth,height}));
