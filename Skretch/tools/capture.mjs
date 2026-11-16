#!/usr/bin/env node
// Capture one continuous, unfolded world at a constant orthographic scale.
// Build in a temporary directory, verify all overlaps, then publish assets.
import { mkdir, writeFile, readFile, mkdtemp, copyFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { openPage } from '../../tools/headless.mjs';
import { buildLevel } from '../../rooftops/js/level.js';
const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const dir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const level = buildLevel(), width = 1200, height = 750, span = 32, overscan = 32;
const main = { id: 'main', name: 'Full stage', length: level.length, frames: [] };
const district = s => [...level.mouths].reverse().find(m => s >= m.s0)?.romaji || 'Awataguchi';
for (let s0 = 0; s0 < level.length; s0 += span) {
  const index = main.frames.length, id = `main-${String(index + 1).padStart(3, '0')}`;
  const s1 = s0 + span;
  main.frames.push({ id, index, title: district(Math.min(level.length, s0 + span / 2)), district: district(Math.min(level.length, s0 + span / 2)), s0, s1, kind: 'street', image: `assets/frames/${id}.jpg`, thumb: `assets/thumbs/${id}.jpg`, width, height });
}
const staging = await mkdtemp(join(tmpdir(), 'skretch-capture-'));
let h, previous, maxDelta = 0, pixelsOver8 = 0, worstMismatchFraction = 0;
try {
  h = await openPage('/Skretch/tools/capture.html', { size: `${width + 2 * overscan}x${height}`, timeout: 240 });
  await h.page.waitForFunction(() => window.skretchCapture?.ready, { timeout: 240000 });
  for (const frame of main.frames) {
    frame.camera = await h.page.evaluate(f => skretchCapture.render(f), frame);
    const shot = await h.page.screenshot({ type: 'png' });
    if (previous) {
      const strip = { top: 0, width: overscan * 2, height };
      const a = await sharp(previous).extract({ ...strip, left: width }).removeAlpha().raw().toBuffer();
      const b = await sharp(shot).extract({ ...strip, left: 0 }).removeAlpha().raw().toBuffer();
      let seamOver8 = 0;
      for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); maxDelta = Math.max(maxDelta, d); if (d > 8) { pixelsOver8++; seamOver8++; } }
      worstMismatchFraction = Math.max(worstMismatchFraction, seamOver8 / a.length);
      if (seamOver8) console.log(`overlap ${frame.id}: ${seamOver8} channels differ by >8`);
    }
    previous = shot;
    await writeFile(join(staging, frame.id + '-wide.png'), shot);
    console.log(frame.id, `${frame.s0}–${Math.min(level.length, frame.s1).toFixed(1)}m`);
  }
  if (h.errors.length) throw new Error(h.errors.join('\n'));
  if (worstMismatchFraction > .02) throw new Error(`Capture overlaps do not match: worst mismatch ${(100 * worstMismatchFraction).toFixed(2)}%.`);
  // Crossfade the same world pixels in each 64-pixel overlap. This removes
  // subpixel rasterisation differences before the final strip is sliced.
  for (const frame of main.frames) {
    const png = join(staging, frame.id + '.png');
    await sharp(join(staging, frame.id + '-wide.png')).extract({ left: overscan, top: 0, width, height }).png().toFile(png);
  }
  for (let i = 1; i < main.frames.length; i++) {
    const left = main.frames[i - 1], right = main.frames[i];
    const a = await sharp(join(staging, left.id + '-wide.png')).extract({ left: width, top: 0, width: 2 * overscan, height }).removeAlpha().raw().toBuffer();
    const b = await sharp(join(staging, right.id + '-wide.png')).extract({ left: 0, top: 0, width: 2 * overscan, height }).removeAlpha().raw().toBuffer();
    for (let y = 0; y < height; y++) for (let x = 0; x < 2 * overscan; x++) {
      const t = (x + .5) / (2 * overscan), k = (y * 2 * overscan + x) * 3;
      for (let c = 0; c < 3; c++) a[k + c] = Math.round(a[k + c] * (1 - t) + b[k + c] * t);
    }
    const blend = { raw: { width: 2 * overscan, height, channels: 3 } };
    const leftHalf = await sharp(a, blend).extract({ left: 0, top: 0, width: overscan, height }).png().toBuffer();
    const rightHalf = await sharp(a, blend).extract({ left: overscan, top: 0, width: overscan, height }).png().toBuffer();
    for (const [f, input, x] of [[left, leftHalf, width - overscan], [right, rightHalf, 0]]) {
      const png = join(staging, f.id + '.png');
      const patched = await sharp(png).composite([{ input, left: x, top: 0 }]).png().toBuffer();
      await writeFile(png, patched);
    }
  }
  for (const frame of main.frames) {
    const png = join(staging, frame.id + '.png');
    await sharp(png).jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toFile(join(staging, frame.id + '.jpg'));
    await sharp(png).resize(320, 200).jpeg({ quality: 80 }).toFile(join(staging, frame.id + '-thumb.jpg'));
  }
  const panoramaWidth = main.frames.length * width;
  if (panoramaWidth > 65535) throw new Error('Full JPEG exceeds the format width limit; split the output into ordered parts.');
  const panoramaPath = 'assets/rooftops-stage-2-seamless.jpg';
  await sharp({ create: { width: panoramaWidth, height, channels: 3, background: '#dce8e1' } })
    .composite(main.frames.map((f, i) => ({ input: join(staging, f.id + '.png'), left: i * width, top: 0 })))
    .jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toFile(join(staging, 'panorama.jpg'));
  const files = {};
  for (const p of ['rooftops/js/level.js', 'rooftops/js/build.js', 'rooftops/js/alleys.js', 'rooftops/js/downtown.js'])
    files[p] = createHash('sha256').update(await readFile(join(dir, '..', p))).digest('hex');
  const manifest = { version: 2, id: 'rooftops-stage-2', captureId: 'unfolded-20261115', title: 'The Roof Road', capturedAt: new Date().toISOString(), width, height,
    panoramas: [{ path: panoramaPath, firstFrame: main.frames[0].id, lastFrame: main.frames.at(-1).id, width: panoramaWidth, height }], panoramaWidth, panoramaHeight: height,
    source: { entry: '../kyoto-rooftops.html', length: level.length, files, lighting: 'Fixed, even daylight', method: 'Actual route pieces built on a straightened rail, captured from one orthographic elevation at 32 metres per panel. The final panel includes blank space past the end.', frameCount: main.frames.length, panelSpan: span, viewHeight: 20, seamCheck: { overlapPixels: overscan * 2, maxDelta, pixelsOver8, worstMismatchFraction, blended: true } }, districts: level.mouths, routes: [main] };
  for (const p of ['assets/frames', 'assets/thumbs']) await mkdir(join(dir, p), { recursive: true });
  for (const frame of main.frames) {
    await copyFile(join(staging, frame.id + '.jpg'), join(dir, frame.image));
    await copyFile(join(staging, frame.id + '-thumb.jpg'), join(dir, frame.thumb));
  }
  await copyFile(join(staging, 'panorama.jpg'), join(dir, panoramaPath));
  await writeFile(join(dir, 'assets/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ frames: main.frames.length, panorama: panoramaPath, panoramaWidth, maxDelta, pixelsOver8 }));
} finally { await h?.close(); await rm(staging, { recursive: true, force: true }); }
