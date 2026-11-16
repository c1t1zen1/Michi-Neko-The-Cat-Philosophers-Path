// GitHub Pages-style, read-only static hosting; exercise a phone-sized viewport.
import { openPage } from '../../tools/headless.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const h = await openPage('/Skretch/', { size: '390x844', timeout: 120 });
const { page } = h;
try {
  await page.waitForFunction(() => window.skretch?.state.route);
  const check = (value, label) => { if (!value) throw Error(label); console.log('  ✔ ' + label); };
  check(await page.evaluate(() => !skretch.state.online), 'static hosting detected');
  check(await page.locator('#btn-save').isVisible(), 'download action visible on phone');
  const strip = await page.locator('#strip').boundingBox();
  await page.evaluate(() => skretch.selectTool('pen'));
  await page.mouse.move(90, strip.y + 80); await page.mouse.down();
  await page.mouse.move(180, strip.y + 120, { steps: 8 }); await page.mouse.up();
  await page.evaluate(() => skretch.selectTool('note'));
  await page.mouse.click(200, strip.y + 160);
  await page.fill('#note-title', 'Raise this roof');
  await page.fill('#note-body', 'Add a handrail beside the ridge.');
  await page.locator('#popup footer .primary').click();
  check(await page.locator('.pin').count() === 1, 'phone-sized board accepts a note');
  await page.reload(); await page.waitForFunction(() => window.skretch?.state.route);
  check(await page.locator('.pin').count() === 1 && await page.locator('svg.ink path').count() === 1, 'browser draft survives reload');
  await page.evaluate(() => skretch.selectTool('hand'));
  const box = await page.locator('#strip').boundingBox();
  await page.mouse.click(80, box.y + 70);
  check(await page.evaluate(() => skretch.state.zoom > 1), 'tap opens a larger scene on a phone');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#btn-save')]);
  const file = join(tmpdir(), 'skretch-static-test.json'); await download.saveAs(file);
  const review = JSON.parse(await readFile(file, 'utf8'));
  check(review.routes.main.notes[0].title === 'Raise this roof', 'review download contains the note');
  await page.click('#btn-menu');
  const [jpeg] = await Promise.all([page.waitForEvent('download'), page.click('#m-export-image')]);
  check(jpeg.suggestedFilename().endsWith('-annotated.jpg'), 'annotated scene downloads as a JPEG');
  await page.click('#btn-menu');
  const [report] = await Promise.all([page.waitForEvent('download'), page.click('#m-export-md')]);
  const mdFile = join(tmpdir(), 'skretch-static-test.md'); await report.saveAs(mdFile);
  check((await readFile(mdFile, 'utf8')).includes('Raise this roof'), 'static report contains the note');
  // Reopen the file via the import control: merging the same IDs must not duplicate them.
  await page.setInputFiles('#import-file', file);
  await page.waitForFunction(() => skretch.data().notes.filter(n => !n.deleted).length === 1);
  check(true, 'review file reopens without duplicate notes');
  // The old board remains available at its own URL and keeps its v2 draft.
  await page.evaluate(() => {
    const old = { schemaVersion: 1, boardId: 'rooftops-stage-2', captureId: 'route-elevations-20261115', revision: 0, updatedAt: null,
      routes: { main: { strokes: [], notes: [{ id: 'old-note', updatedAt: '2026-11-15T00:00:00Z', x: 100, y: 100, color: '#d54b3e', title: 'Earlier capture note', body: '', category: 'layout', status: 'open' }] } } };
    localStorage.setItem('skretch:v2:review', JSON.stringify(old));
  });
  await page.goto(h.origin + '/Skretch/legacy/elevations-20261115/');
  await page.waitForFunction(() => window.skretch?.state.route);
  check(await page.locator('.pin').count() === 1 && await page.evaluate(() => skretch.data().notes[0].title === 'Earlier capture note'), 'previous board retains its browser draft');
  await page.goto(h.origin + '/Skretch/');
  await page.waitForFunction(() => window.skretch?.state.route);
  check(await page.evaluate(() => skretch.data().notes[0].title === 'Raise this roof'), 'new board keeps a separate draft');
  await page.screenshot({path: '/tmp/skretch-mobile-test.png'});
  check(h.errors.every(e => e.includes('/api/review') && e.includes('404')), 'no unexpected browser errors');
} finally { await h.close(); }
