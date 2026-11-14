// Optional Playwright review. Keep the package/browser outside this buildless repo.
// Serve the worktree, then ROOFTOP_URL=http://127.0.0.1:8177 \
// PLAYWRIGHT_MODULE=/path/to/playwright node tools/rooftop_browser_test.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.ROOFTOP_URL || 'http://127.0.0.1:8000';
const output = process.env.ROOFTOP_QA_DIR || join(tmpdir(), 'michi-rooftop-review');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: process.platform === 'darwin' ? ['--use-angle=metal'] : ['--enable-webgl'] });
const report = { scenarios: [], errors: [] };
const configs = [
  { name: 'portrait-360', width: 360, height: 780, touch: true },
  { name: 'portrait-390', width: 390, height: 844, touch: true },
  { name: 'landscape-touch', width: 844, height: 390, touch: true },
  { name: 'desktop', width: 1440, height: 900, touch: false }
];
try {
  for (const cfg of configs) {
    const ctx = await browser.newContext({ viewport: { width: cfg.width, height: cfg.height }, isMobile: cfg.touch, hasTouch: cfg.touch, deviceScaleFactor: 1 });
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && /THREE|shader|WebGL|failed/i.test(m.text())) errors.push(m.text()); });
    await page.goto(base + '/kyoto-rooftops.html?qa=1&shot=1&quality=low&shadows=0', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.roofRoad?.catReady, { timeout: 180000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no horizontal page overflow');
    const anatomy = await page.evaluate(() => ({ boats: roofRoad.world.dynamic.boats.length, residents: roofRoad.world.dynamic.people.length, length: roofRoad.level.length }));
    assert.equal(anatomy.boats, 2); assert.equal(anatomy.residents, 30); assert.ok(anatomy.length >= 980);
    // Map is optional, gives focus back and does not turn Escape into Pause.
    await page.locator('#btn-map').click(); await page.locator('#neighbourhood-map').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#route-map .map-lantern').count(), 7);
    await page.screenshot({ path: join(output, cfg.name + '-map.png') });
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#neighbourhood-map').isVisible(), false);
    assert.equal(await page.locator('#pause-panel').isVisible(), false);
    await page.locator('#btn-pause').click(); await page.locator('#pause-panel').waitFor({ state: 'visible' });
    await page.locator('#btn-resume').click();
    assert.equal(await page.locator('#pause-panel').isVisible(), false);
    if (cfg.touch) {
      const client = await ctx.newCDPSession(page);
      const padBox = await page.locator('#pad').boundingBox();
      const jumpBox = await page.locator('#btn-jump').boundingBox();
      const x = 65, y = padBox.y + padBox.height * .55;
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 45, y, id: 1 }] });
      const before = await page.evaluate(() => roofRoad.runner.s);
      const jumpX = jumpBox.x + jumpBox.width / 2, jumpY = jumpBox.y + jumpBox.height / 2;
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x + 45, y, id: 1 }, { x: jumpX, y: jumpY, id: 2 }] });
      const after = await page.evaluate(() => { roofRoad.advanceForReview(.25); return { s: roofRoad.runner.s, y: roofRoad.runner.y }; });
      assert.ok(after.s > before + .5 && after.y > 1.5, 'two thumbs can sprint and jump together');
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await client.detach();
      await page.evaluate(() => roofRoad.advanceForReview(.2));
      const padState = await page.locator('#pad').getAttribute('class');
      assert.ok(!padState.includes('active') && !padState.includes('sprint'), 'touch release clears movement');
    }
    const buffered=await page.evaluate(()=>{
      roofRoad.at(1,1.1);
      dispatchEvent(new KeyboardEvent('keydown',{code:'Space',key:' '}));
      const states=roofRoad.advanceFramesForReview([1,1,1,10]);
      dispatchEvent(new KeyboardEvent('keyup',{code:'Space',key:' '}));return states;
    });
    assert.ok(buffered[0].grounded && buffered[2].grounded && buffered[3].vy>0,'jump survives render frames with no physics tick');
    const dynamicVisibility=await page.evaluate(()=>{
      const visibleBatches=group=>{const list=[];group.traverse(o=>{if(o.userData.spatialBatch)list.push(o.visible);});return list.length>0&&list.every(Boolean);};
      const boats=roofRoad.world.dynamic.boats.map(b=>{const p=roofRoad.level.platforms[b.plat];roofRoad.at((p.s0+p.s1)/2,p.y0);roofRoad.advanceForReview(.1);return b.group.visible&&visibleBatches(b.group);});
      const worker=roofRoad.world.dynamic.people.find(p=>p.role==='stallkeeper'&&p.s>800);
      roofRoad.at(worker.s,0);roofRoad.advanceForReview(.1);
      return {boats,worker:worker.group.visible&&visibleBatches(worker.body)};
    });
    assert.ok(dynamicVisibility.boats.every(Boolean)&&dynamicVisibility.worker,'local boat and resident batches stay visible far from the origin');
    // Choose every actual alley through input, rather than only setting lane
    // state. Walk both ways, including overlaps with low street props.
    for (let id=0;id<6;id++) for(const dir of [1,-1]) {
      const length=await page.evaluate(({id,dir})=>{const a=roofRoad.level.alleys[id];roofRoad.at(dir>0?a.s0+.8:a.s1-.8,0);roofRoad.advanceForReview(.05);return a.s1-a.s0;},{id,dir});
      await page.keyboard.down('ArrowDown');await page.evaluate(()=>roofRoad.advanceForReview(.05));
      assert.equal(await page.evaluate(()=>roofRoad.runner.alley),id,'drop chooses '+id+' direction '+dir+' '+JSON.stringify(await page.evaluate(()=>({s:roofRoad.runner.s,y:roofRoad.runner.y,ground:roofRoad.runner.ground?.label,paused:document.body.classList.contains('paused')}))));
      const key=dir>0?'ArrowRight':'ArrowLeft';await page.keyboard.down(key);
      const alleyRun=await page.evaluate(seconds=>roofRoad.advanceForReview(seconds),length/4.5+.9);
      await page.keyboard.up(key);await page.keyboard.up('ArrowDown');
      assert.equal(await page.evaluate(()=>roofRoad.runner.alley),null,'both alley exits work');
      for(const sample of alleyRun.samples) for(const b of Object.values(sample.bounds)) {
        assert.ok(b.left>=-.93 && b.right<=.93 && b.top<=.65 && b.bottom>=-.65, 'both cats fit throughout chosen alleys');
        if(cfg.width<cfg.height) assert.ok(b.pixelsHigh>=20,'alley cats stay legible');
      }
    }
    await page.evaluate(() => { roofRoad.at(1, 1.1); roofRoad.setAuto(true); });
    const run = await page.evaluate(() => roofRoad.advanceForReview(400));
    assert.ok(run.catReady && run.finale, cfg.name + ' real game loop reaches finale');
    assert.ok(run.samples.length > 500);
    let minCatPixels = Infinity, maxDistance = 0;
    for (const sample of run.samples) {
      maxDistance = Math.max(maxDistance, sample.distance);
      for (const b of Object.values(sample.bounds)) {
        assert.ok(b.left >= -.93 && b.right <= .93, `${cfg.name} cats remain horizontally visible at ${sample.s.toFixed(1)}m`);
        assert.ok(b.top <= .65 && b.bottom >= -.65, `${cfg.name} cats remain clear of HUD/thumb areas at ${sample.s.toFixed(1)}m`);
        minCatPixels = Math.min(minCatPixels, b.pixelsHigh);
      }
    }
    assert.ok(minCatPixels >= (cfg.width < cfg.height ? 20 : 12), `portrait cats stay legible: ${minCatPixels.toFixed(1)}px`);
    assert.ok(['saunter','dash','wait','prowl','feint','detour'].every(m => run.moods.includes(m)));
    await page.waitForTimeout(1600);
    const litPixels = await page.evaluate(() => {
      const c = document.createElement('canvas'); c.width = c.height = 24;
      const x = c.getContext('2d'); x.drawImage(document.getElementById('gl'),0,0,24,24);
      const d = x.getImageData(0,0,24,24).data; let lit=0;
      for(let i=0;i<d.length;i+=4) if(d[i]+d[i+1]+d[i+2]>30) lit++;
      return lit / (24*24);
    });
    assert.ok(litPixels > .15, 'finale renders a scene rather than a black canvas');
    const fires = await page.evaluate(() => roofRoad.view.fires);
    assert.ok(fires.length === 5 && fires.every(f => Math.abs(f.x) < .95 && Math.abs(f.y) < .9), 'five hill fires fit the final panorama');
    await page.screenshot({ path: join(output, cfg.name + '-finale.png') });
    assert.deepEqual(errors, [], cfg.name + ' has no runtime/shader errors');
    const result = { ...cfg, pass: true, samples: run.samples.length, minCatPixels: +minCatPixels.toFixed(1), maxCameraDistance: +maxDistance.toFixed(1), endS: +run.s.toFixed(2), moods: run.moods };
    report.scenarios.push(result); console.log('PASS ' + cfg.name, JSON.stringify(result));
    await ctx.close();
  }
  report.pass = true;
} catch (e) { report.pass = false; report.errors.push(e.stack); throw e; }
finally { await writeFile(join(output, 'browser-report.json'), JSON.stringify(report, null, 2) + '\n'); await browser.close(); }
console.log('Browser review saved to ' + output);
