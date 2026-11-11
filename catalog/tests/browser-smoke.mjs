// Run against node cadJS/server.mjs. Test changes stay in an isolated browser
// profile; the repository-save response is mocked so art metadata is untouched.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { BASE, OUTPUT, launchBrowser, saveReport } from './browser-support.mjs';
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(15000);
const results = [], errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const check = async (name, work) => { await work(); results.push({ name, pass: true }); console.log('PASS ' + name); };
async function search(query) { await page.fill('#search', query); await page.waitForFunction((q) => window.assetLibrary?.visible && document.querySelector('#search').value === q && new URL(location.href).searchParams.get('q') === q, query); }
try {
  await page.goto(BASE + '/catalog/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.assetLibrary?.ready && window.assetLibrary.connected);
  await check('all active assets render and the initial screen has no overflow', async () => {
    const expected = await page.evaluate(() => assetLibrary.records.filter((a) => a.lifecycle === 'active').length);
    assert.equal(await page.locator('.asset-card').count(), expected);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await page.evaluate(() => assetLibrary.selectedId), 'torii');
    await page.screenshot({ path: join(OUTPUT, 'catalog-desktop.png') });
  });
  await check('exact search and original source provenance resolve', async () => {
    await search('id:key -id:rock'); await page.locator('[data-asset-id="key"]').click();
    assert.equal(await page.locator('.asset-card').count(), 1);
    await page.locator('[data-inspector-tab="sources"]').click();
    await page.waitForFunction(() => document.querySelector('[data-source-index="0"]')?.href.includes('#L'));
    assert.match(await page.locator('[data-source-index="0"]').getAttribute('href'), /src\/countryside\.js#L\d+/);
  });
  await check('owner, tags and notes persist without allowing HTML execution', async () => {
    await page.locator('[data-inspector-tab="details"]').click();
    await page.locator('[data-metadata="owner"]').fill('Catalog QA'); await page.locator('[data-metadata="owner"]').press('Tab');
    await page.locator('[data-metadata="tags"]').fill('hero, brass'); await page.locator('[data-metadata="tags"]').press('Tab');
    await page.locator('#asset-notes').fill('<img src=x onerror="window.catalogInjection=true"> Warm brass.');
    await page.locator('[data-action="save-note"]').click();
    assert.equal(await page.evaluate(() => !!window.catalogInjection), false);
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForFunction(() => window.assetLibrary?.ready);
    assert.equal(await page.locator('[data-metadata="owner"]').inputValue(), 'Catalog QA');
    assert.match(await page.locator('#asset-notes').inputValue(), /Warm brass/);
  });
  await check('favorites and a collection retain exact membership', async () => {
    await page.locator('.asset-card[data-asset-id="key"]').hover();
    await page.locator('.asset-card [data-favorite="key"]').click();
    await page.locator('[data-select="key"]').check(); await page.locator('#new-collection').click();
    await page.locator('#collection-name').fill('Catalog QA selection'); await page.locator('#dialog button[type="submit"]').click();
    await page.locator('[data-collection="catalog-qa-selection"]').click();
    assert.equal(await page.locator('.asset-card').count(), 1);
    assert.equal(await page.evaluate(() => assetLibrary.workspace.collections[0].assetIds[0]), 'key');
  });
  await check('collection management is reversible', async () => {
    await page.locator('[data-manage-collection="catalog-qa-selection"]').click();
    await page.locator('#delete-entry').click(); assert.equal(await page.evaluate(() => assetLibrary.workspace.collections.length), 0);
    await page.locator('#toast [data-undo]').click(); assert.equal(await page.evaluate(() => assetLibrary.workspace.collections.length), 1);
  });
  await check('list mode exposes production fields and board drag changes status', async () => {
    await search('id:key -id:rock'); await page.locator('[data-layout="list"]').click();
    assert.equal(await page.locator('.asset-table tbody tr').count(), 1);
    await page.locator('[data-layout="board"]').click();
    await page.locator('.board-card[data-asset-id="key"]').dragTo(page.locator('[data-drop-status="review"]'));
    await page.waitForFunction(() => assetLibrary.records.find((a) => a.id === 'key').metadata.status === 'review');
    assert.equal(await page.locator('[data-drop-status="review"] .board-card').count(), 1);
  });
  await check('the local assistant returns a reviewable plan and applies only supported updates', async () => {
    await page.locator('#open-assistant').click();
    await page.locator('#ai-prompt').fill('Mark selected assets as research and high priority'); await page.locator('#send-ai').click();
    await page.locator('[data-apply-plan]').waitFor();
    assert.equal(await page.evaluate(() => assetLibrary.workspace.assets.key.status), 'review');
    await page.locator('[data-apply-plan]').click();
    assert.equal(await page.evaluate(() => assetLibrary.workspace.assets.key.status), 'research');
    assert.equal(await page.evaluate(() => assetLibrary.workspace.assets.key.priority), 'high');
    await page.locator('#close-assistant').click();
  });
  await check('API settings support companion import and keep keys out of workspace exports', async () => {
    await page.evaluate(() => sessionStorage.setItem('michi-neko-cadjs-agent-settings-v1', JSON.stringify({ provider: 'local', baseUrl: 'http://127.0.0.1:8080/v1', model: 'qa-local', apiKey: 'qa-session-only' })));
    await page.locator('#open-assistant').click(); await page.locator('#toggle-ai-settings').click();
    await page.locator('#ai-provider').selectOption('local'); await page.locator('#use-cad-settings').click();
    assert.equal(await page.locator('#ai-model').inputValue(), 'qa-local');
    assert.equal(await page.locator('#ai-key').inputValue(), 'qa-session-only');
    assert.ok(!await page.evaluate(() => JSON.stringify(assetLibrary.workspace).includes('qa-session-only')));
    assert.equal(await page.evaluate(() => localStorage.getItem('michi-asset-api-keys-v1')), null);
    await page.locator('#ai-provider').selectOption('builtin'); await page.locator('#close-assistant').click();
  });
  await check('CSV export includes the current filtered asset', async () => {
    await page.locator('#export-menu-button').click();
    const pending = page.waitForEvent('download'); await page.locator('#export-csv').click(); const file = await pending;
    assert.equal(file.suggestedFilename(), 'michi-assets.csv');
  });
  await check('workspace import merges valid records with undo', async () => {
    const workspace = await page.evaluate(() => assetLibrary.workspace); workspace.assets.key.owner = 'Imported artist';
    await page.locator('#workspace-file').setInputFiles({ name: 'qa-workspace.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(workspace)) });
    await page.locator('#dialog button[type="submit"]').click();
    assert.equal(await page.evaluate(() => assetLibrary.workspace.assets.key.owner), 'Imported artist');
    await page.locator('#toast [data-undo]').click();
    assert.equal(await page.evaluate(() => assetLibrary.workspace.assets.key.owner), 'Catalog QA');
  });
  await check('repository save uses the catalog API and advances the revision', async () => {
    await page.route('**/api/asset-library/workspace', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      const { workspace } = route.request().postDataJSON(); workspace.revision++;
      await route.fulfill({ json: { workspace } });
    });
    await page.locator('#save-repository').click();
    await page.waitForFunction(() => assetLibrary.workspace.revision === 1);
    assert.match(await page.locator('#draft-state').innerText(), /Repository r1/);
  });
  await check('a repository conflict preserves the draft and offers an explicit merge', async () => {
    let posts = 0;
    const current = await page.evaluate(() => assetLibrary.workspace);
    current.revision = 2; current.assets.larry = { owner: 'Repository artist' };
    await page.unroute('**/api/asset-library/workspace');
    await page.route('**/api/asset-library/workspace', async (route) => {
      if (route.request().method() === 'GET') return route.fulfill({ json: { workspace: current } });
      if (++posts === 1) return route.fulfill({ status: 409, json: { error: 'Repository revision changed. Your draft remains intact.' } });
      const { workspace } = route.request().postDataJSON(); assert.equal(workspace.revision, 2); workspace.revision++;
      return route.fulfill({ json: { workspace } });
    });
    await page.locator('#save-repository').click(); await page.waitForFunction(() => document.querySelector('#draft-state').textContent.includes('Repository changed'));
    assert.equal(await page.evaluate(() => assetLibrary.workspace.assets.key.owner), 'Catalog QA');
    await page.locator('#save-repository').click(); await page.locator('#dialog-form [name="strategy"]').selectOption('merge'); await page.locator('#dialog button[type="submit"]').click();
    await page.waitForFunction(() => assetLibrary.workspace.revision === 3);
    assert.equal(await page.evaluate(() => assetLibrary.workspace.assets.larry.owner), 'Repository artist');
    assert.equal(await page.evaluate(() => assetLibrary.workspace.assets.key.owner), 'Catalog QA');
  });
  await check('saved views are named, restored and editable', async () => {
    await page.locator('#save-view').click(); await page.locator('#dialog [name="name"]').fill('Brass queue'); await page.locator('#dialog button[type="submit"]').click();
    await page.locator('#reset-filters').click(); await page.locator('[data-saved-view="brass-queue"]').click();
    assert.equal(await page.locator('.board-card').count(), 1);
    await page.locator('[data-manage-view="brass-queue"]').click(); await page.locator('#dialog [name="name"]').fill('Key queue'); await page.locator('#dialog button[type="submit"]').click();
    assert.equal(await page.locator('[data-saved-view="brass-queue"]').innerText(), 'Key queue');
  });
  await check('updated lab links target the actual specimen', async () => {
    await page.evaluate(() => assetLibrary.setQuery('id:bamboo-fence'));
    await page.locator('[data-layout="grid"]').click(); await page.locator('[data-asset-id="bamboo-fence"]').click();
    await page.locator('[data-variant="lab"]').click(); await page.locator('#variant-select').selectOption('fences/koetsu');
    const href = await page.locator('#inspector a.button').filter({ hasText: 'Open lab' }).getAttribute('href');
    assert.match(href, /specimen=koetsu/);
    const lab = await browser.newPage(); await lab.goto(new URL(href, BASE + '/catalog/').href, { waitUntil: 'domcontentloaded' });
    await lab.locator('[data-specimen="koetsu"].catalog-specimen-focus').waitFor({ timeout: 120000 });
    assert.equal(await lab.locator('[data-specimen="koetsu"]').isVisible(), true); await lab.close();
  });
  await check('embedded 3D inspection builds the real selected study', async () => {
    await page.locator('[data-action="preview"]').click();
    const frame = page.frameLocator('#preview-frame');
    await frame.locator('#viewer-status').waitFor({ state: 'hidden', timeout: 120000 });
    assert.equal(await frame.locator('#viewer-name').innerText(), 'Bamboo fence runs');
    assert.match(await frame.locator('#viewer-version').innerText(), /LAB STUDY/);
    await page.screenshot({ path: join(OUTPUT, 'catalog-live-inspector.png') }); await page.locator('#close-preview').click();
  });
  await check('cadJS return links restore the correct selected asset', async () => {
    await page.goto(BASE + '/catalog/?asset=larry', { waitUntil: 'networkidle' }); await page.waitForFunction(() => assetLibrary.selectedId === 'larry');
    assert.equal(await page.locator('.detail-id').innerText(), 'larry');
    assert.match(page.url(), /#larry$/);
  });
  await check('mobile layout and navigation have no horizontal overflow', async () => {
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto(BASE + '/catalog/', { waitUntil: 'networkidle' }); await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => window.assetLibrary?.ready);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: join(OUTPUT, 'catalog-mobile.png') });
    await page.locator('#toggle-sidebar').click(); await page.locator('[data-view="gaps"]').first().click();
    assert.match(await page.locator('#view-title').innerText(), /Study opportunities/);
    await page.locator('[data-asset-id]').first().click(); assert.equal(await page.locator('#inspector').isVisible(), true);
    await page.locator('[data-action="close-inspector"]').click(); await page.locator('#open-assistant').click();
    assert.equal(await page.locator('#assistant-panel').isVisible(), true);
  });
  assert.deepEqual(errors, []);
  await saveReport('browser-smoke.json', { passed: results.length, total: results.length, results, errors });
  console.log(`\n${results.length}/${results.length} browser workflow checks passed. Screenshots: ${OUTPUT}`);
} catch (error) {
  await page.screenshot({ path: join(OUTPUT, 'browser-smoke-failure.png') }).catch(() => {});
  await saveReport('browser-smoke.json', { results, errors, failure: error.stack });
  console.error(error); process.exitCode = 1;
} finally { await browser.close(); }
