// Skretch review model + server API smoke tests. Run: cd Skretch && npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  emptyReview, routeReview, routeGeometry, locatePoint, validateReview,
  mergeReviews, reviewMarkdown, uid
} from '../js/model.js';
import { createSkretchServer } from '../server.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(here, '../assets/manifest.json'), 'utf8'));
const main = manifest.routes.find(r => r.id === 'main');

test('manifest frames cover the whole route in order', () => {
  assert.equal(manifest.id, 'rooftops-stage-2');
  assert.ok(main.frames.length >= 40);
  assert.equal(main.frames[0].s0, 0);
  assert.ok(Math.abs(main.frames.at(-1).s1 - manifest.source.length) < 0.01);
  for (const f of main.frames) for (const p of [f.image, f.thumb])
    assert.ok(p.startsWith('assets/'), f.id + ' path');
});

test('locatePoint maps strip x to frame + route metres', () => {
  const geo = routeGeometry(main);
  const f = main.frames[7];
  const hit = locatePoint(main, f.index * 1200 + 600, 400);
  assert.equal(hit.frameId, f.id);
  assert.ok(Math.abs(hit.s - (f.s0 + f.s1) / 2) < (f.s1 - f.s0) / 2 + 0.01);
  assert.equal(geo.width, main.frames.length * 1200);
});

test('validateReview round-trips strokes and notes', () => {
  const review = emptyReview();
  const r = routeReview(review, 'main');
  const t = new Date().toISOString();
  r.strokes.push({ id: uid(), updatedAt: t, tool: 'pen', size: 4, color: '#d54b3e', points: [[10, 10, .5], [500, 30, .6]] });
  r.notes.push({ id: uid(), updatedAt: t, x: 1200 * 10 + 30, y: 400, color: '#397bb5', title: 'widen this gap', body: 'cat cannot make the jump', category: 'layout', status: 'open' });
  const out = validateReview(review, manifest);
  assert.equal(out.routes.main.strokes.length, 1);
  assert.equal(out.routes.main.notes[0].anchor.frameId, 'main-011');
  assert.ok(reviewMarkdown(out, manifest).includes('widen this gap'));
});

test('validateReview rejects bad colour and unknown route', () => {
  const bad = emptyReview();
  routeReview(bad, 'main').strokes.push({ id: 'x', updatedAt: new Date().toISOString(), tool: 'pen', size: 4, color: 'red', points: [[1, 1]] });
  assert.throws(() => validateReview(bad, manifest), /ink color/);
  const badRoute = emptyReview();
  routeReview(badRoute, 'nowhere');
  assert.throws(() => validateReview(badRoute, manifest), /Unknown route/);
});

test('mergeReviews keeps the newer record per id', () => {
  const a = emptyReview(), b = emptyReview();
  const old = { id: 'n1', updatedAt: '2026-01-01T00:00:00Z', x: 5, y: 5, color: '#d54b3e', title: 'old', body: '', category: 'other', status: 'open' };
  const newer = { ...old, title: 'new', updatedAt: '2026-02-01T00:00:00Z' };
  routeReview(a, 'main').notes.push(old);
  routeReview(b, 'main').notes.push(newer);
  const merged = mergeReviews(a, b);
  assert.equal(merged.routes.main.notes[0].title, 'new');
});

test('server GET/PUT review round-trip with revision check', async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'skretch-'));
  const server = createSkretchServer({ dataDir });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/Skretch/api/`;
  try {
    const got = await (await fetch(base + 'review')).json();
    assert.equal(got.review.revision, 0);
    const review = got.review;
    routeReview(review, 'main').notes.push({ id: uid(), updatedAt: new Date().toISOString(), x: 100, y: 100, color: '#3c8468', title: 'test note', body: '', category: 'scenery', status: 'open' });
    const put = await fetch(base + 'review', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseRevision: 0, review }) });
    assert.equal(put.status, 200);
    const saved = (await put.json()).review;
    assert.equal(saved.revision, 1);
    const again = await fetch(base + 'review', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseRevision: 0, review }) });
    assert.equal(again.status, 409);
    const report = await fetch(base + 'report');
    assert.ok((await report.text()).includes('test note'));
    const files = await readFile(path.join(dataDir, 'review.json'), 'utf8');
    assert.ok(files.includes('test note'));
  } finally {
    server.close();
    await rm(dataDir, { recursive: true, force: true });
  }
});
