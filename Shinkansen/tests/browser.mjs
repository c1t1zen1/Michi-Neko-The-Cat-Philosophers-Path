// Optional real-browser verification. Playwright stays outside this buildless game.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.SHINKANSEN_URL||'http://127.0.0.1:8000';
const out=process.env.SHINKANSEN_QA_DIR||join(tmpdir(),'michi-shinkansen-review');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:process.platform==='darwin'?['--use-angle=metal']:['--enable-webgl']});
const report={scenarios:[],errors:[]};
try{
 for(const config of [{name:'desktop',width:1440,height:900,touch:false},{name:'portrait',width:390,height:844,touch:true},{name:'landscape',width:844,height:390,touch:true}]){
  const context=await browser.newContext({viewport:{width:config.width,height:config.height},hasTouch:config.touch,isMobile:config.touch,deviceScaleFactor:1});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL|failed/i.test(m.text()))errors.push(m.text());});
  await page.goto(base+'/Shinkansen/?qa=1&quality=low&shadows=0',{waitUntil:'networkidle',timeout:120000});
  await page.waitForFunction(()=>window.shinkansen?.ready,{timeout:120000});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal overflow');
  await page.evaluate(()=>shinkansen.start(false));
  await page.keyboard.press('Space');await page.evaluate(()=>shinkansen.advance(1.6));
  assert.equal(await page.evaluate(()=>shinkansen.motor.mode),'roof','bridge leap lands on train');
  const moved=await page.evaluate(()=>{const before=shinkansen.motor.s;shinkansen.advance(1,{s:1,duck:true});return shinkansen.motor.s-before;});
  assert.ok(moved>.5,'forward input walks on roof');
  const beforePause=await page.evaluate(()=>shinkansen.time);
  await page.locator('#menu-button').click();assert.equal(await page.locator('#journal').isVisible(),true);
  await page.evaluate(()=>shinkansen.advance(10));assert.ok(Math.abs(await page.evaluate(()=>shinkansen.time)-beforePause)<.15,'pause stops the journey');
  await page.keyboard.press('Escape');assert.equal(await page.locator('#journal').isVisible(),false);
  await page.evaluate(()=>{shinkansen.at(24);shinkansen.advance(1,{s:1,holdJump:true,jump:true});});
  assert.ok(await page.evaluate(()=>shinkansen.motor.s>25.85),'real loop jumps a carriage gap');
  await page.evaluate(()=>shinkansen.at(160.1));await page.keyboard.press('KeyE');await page.evaluate(()=>shinkansen.advance(.1));
  assert.equal(await page.evaluate(()=>shinkansen.motor.mode),'interior','E enters coach hatch');
  assert.equal(await page.evaluate(()=>shinkansen.motor.coachVisited),true);
  await page.evaluate(()=>shinkansen.advance(32,{s:1,sprint:true}));
  assert.equal(await page.evaluate(()=>shinkansen.motor.cafeVisited),true,'walk through coach gangways into cafe');
  await page.evaluate(()=>shinkansen.at(216.8,'interior'));await page.keyboard.press('KeyE');await page.evaluate(()=>shinkansen.advance(.05));
  // First press at a brass seal collects a postcard, next press greets Yuzu.
  await page.keyboard.press('KeyE');await page.evaluate(()=>shinkansen.advance(.05));
  assert.equal(await page.evaluate(()=>shinkansen.motor.hadTea),true);
  await page.evaluate(()=>shinkansen.at(251.65,'interior'));await page.keyboard.press('KeyE');await page.evaluate(()=>shinkansen.advance(.05));
  assert.equal(await page.evaluate(()=>shinkansen.motor.mode),'roof','forward ladder returns to roof');
  for(const chapter of ['kyoto','biwa','ibuki','kiso','coach','tea','oi','fuji','suruga','hakone','tokyo','arrival']){
   await page.evaluate(id=>{shinkansen.chapter(id);shinkansen.render();},chapter);await page.waitForTimeout(120);
   const view=await page.evaluate(()=>shinkansen.view());assert.ok(Math.abs(view.x)<.9&&Math.abs(view.y)<.75,chapter+' keeps Michi visible');assert.ok(view.draws>10);
  }
  await page.evaluate(()=>{shinkansen.at(285);shinkansen.chapter('fuji');shinkansen.input.yaw=.65;});await page.waitForTimeout(700);
  await page.screenshot({path:join(out,config.name+'-fuji.png')});
  if(config.touch){
   const cdp=await context.newCDPSession(page),pad=await page.locator('#move-pad').boundingBox(),jump=await page.locator('#touch-jump').boundingBox();
   await page.evaluate(()=>{shinkansen.at(270);shinkansen.input.yaw=0;});
   const x=pad.x+pad.width/2,y=pad.y+pad.height/2;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-44,id:1}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:y-44,id:1},{x:jump.x+jump.width/2,y:jump.y+jump.height/2,id:2}]});
   await page.waitForTimeout(180);assert.ok(await page.evaluate(()=>shinkansen.motor.y>4.5),'two thumbs move and jump together');
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  }
  await page.evaluate(()=>{shinkansen.chapter('arrival');shinkansen.advance(150,{duck:true});shinkansen.at(402);shinkansen.use();});
  assert.equal(await page.evaluate(()=>shinkansen.arrived),true,'actual game loop completes the journey');
  assert.equal(await page.locator('#arrival').isVisible(),true);await page.screenshot({path:join(out,config.name+'-arrival.png')});
  await page.locator('#stay').click();assert.equal(await page.locator('#arrival').isVisible(),false);
  await page.evaluate(()=>shinkansen.save());await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.shinkansen?.ready);
  await page.evaluate(()=>shinkansen.start(true));assert.ok(await page.evaluate(()=>shinkansen.motor.coachVisited&&shinkansen.motor.cafeVisited),'reload restores interior milestones');
  assert.deepEqual(errors,[],config.name+' has no runtime or shader errors');
  report.scenarios.push({...config,pass:true});console.log('PASS',config.name);await context.close();
 }
}catch(error){report.errors.push(error.stack||String(error));throw error;}
finally{await writeFile(join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();}
