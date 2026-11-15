// End-to-end: boot the Skretch server, open the board in headless Chromium,
// draw a stroke, pin a note, save, reload and prove both persist.
//   node tests/browser.mjs      (Playwright outside the repo, as tools/headless.mjs)
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSkretchServer } from '../server.mjs';
import { openPage } from '../../tools/headless.mjs';

const dataDir = await mkdtemp(path.join(tmpdir(), 'skretch-e2e-'));
const server = createSkretchServer({ dataDir });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
let failed = 0;
const ok = (cond, label) => { console.log((cond ? '  ✔ ' : '  ✘ ') + label); if (!cond) failed++; };

let h;
try {
  h = await openPage(origin + '/Skretch/', { size: '900x600', timeout: 120 });
  const { page } = h;
  await page.waitForFunction(() => window.skretch?.manifest, { timeout: 30000 });
  ok(true, 'board boots');

  const frames = await page.locator('.frame').count();
  ok(frames === 47, `47 main frames on the strip (got ${frames})`);
  ok(await page.locator('#ruler-track .seg').count() >= 7, 'district ruler built');

  // Pick the pen and draw a short stroke on the strip.
  await page.evaluate(() => skretch.selectTool('pen'));
  const strip = await page.locator('#strip').boundingBox();
  const y = strip.y + strip.height * .5, x0 = strip.x + 300;
  await page.mouse.move(x0, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(x0 + i * 12, y + Math.sin(i) * 20);
  await page.mouse.up();
  ok(await page.locator('svg.ink path').count() === 1, 'pen stroke lands as ink');

  // Pin a note.
  await page.evaluate(() => skretch.selectTool('note'));
  await page.mouse.click(strip.x + 500, y);
  await page.fill('#note-title', 'widen this rooftop gap');
  await page.fill('#note-body', 'Michi cannot make this jump at sprint speed.');
  await page.locator('#popup footer .primary').click();
  ok(await page.locator('.pin').count() === 1, 'note pin placed');

  // Save → revision 1, file on disk.
  await page.evaluate(() => skretch.save());
  await page.waitForFunction(() => skretch.state.baseRevision === 1, { timeout: 10000 });
  ok(true, 'saved rev 1');
  const onDisk = JSON.parse(await readFile(path.join(dataDir, 'review.json'), 'utf8'));
  ok(onDisk.routes.main.notes[0].title === 'widen this rooftop gap', 'review.json holds the note');
  ok(onDisk.routes.main.strokes.length === 1, 'review.json holds the stroke');
  const report = await (await fetch(origin + '/Skretch/api/report')).text();
  ok(report.includes('widen this rooftop gap') && report.includes('~'), 'report.md renders anchors');

  // Reload — annotations come back from the server.
  await page.reload();
  await page.waitForFunction(() => window.skretch?.manifest && skretch.state.baseRevision === 1, { timeout: 30000 });
  ok(await page.locator('svg.ink path').count() === 1, 'stroke survives reload');
  ok(await page.locator('.pin').count() === 1, 'pin survives reload');

  // Zoom into a frame by tapping (mouse click on the hand tool).
  await page.evaluate(() => skretch.selectTool('hand'));
  await page.mouse.click(strip.x + 200, strip.y + 100);
  await page.waitForFunction(() => skretch.state.zoom > 1.5, { timeout: 5000 });
  ok(true, 'tap zooms into the frame');
} catch (e) {
  failed++;
  console.log('  ✘ crashed: ' + (e?.message || e));
  if (h?.errors?.length) console.log('  page errors: ' + h.errors.join(' | '));
} finally {
  await h?.close();
  server.close();
  await rm(dataDir, { recursive: true, force: true });
}
console.log(failed ? `\n${failed} check(s) failed` : '\nall browser checks passed');
process.exit(failed ? 1 : 0);
