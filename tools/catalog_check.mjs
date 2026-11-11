// Dependency-free source/data checks for the Asset Library.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { validateWorkspace, createRecords, summarize } from '../catalog/js/model.mjs';
import { getAssetCapabilities } from '../catalog/js/asset-loader.mjs';
import { resolveTargetLink } from '../catalog/js/links.mjs';
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const read = (file) => readFileSync(resolve(ROOT, file));
const inventory = JSON.parse(read('labs/asset_inventory.json'));
const thumbs = JSON.parse(read('catalog/thumbnails.json'));
const ids = new Set(inventory.assets.map((a) => a.id));
const problems = [], images = new Set();
const check = (ok, message) => { if (!ok) problems.push(message); };
const walk = (dir) => readdirSync(dir).flatMap((file) => { const path = join(dir, file); return statSync(path).isDirectory() ? walk(path) : [path]; });
const modules = walk(resolve(ROOT, 'catalog')).filter((f) => f.endsWith('.mjs'));
for (const file of modules) {
  try { execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' }); }
  catch (error) { problems.push('Module syntax: ' + file + '\n' + error.stderr); }
  check(!/(?:from\s*|import\s*\(\s*)['"](?:(?:\.\.\/)+|\/)src\//.test(readFileSync(file, 'utf8')), 'Game module imports must use labs/shared/game.js: ' + file);
}
validateWorkspace(JSON.parse(read('catalog/metadata.json')), [...ids]);
for (const target of Object.values(inventory.targets)) {
  try { const link = resolveTargetLink(target); const local = resolve(ROOT, 'catalog', link.split(/[?#]/)[0]); check(statSync(local).isFile() || statSync(local).isDirectory(), 'Missing evidence page: ' + link); }
  catch (error) { problems.push('Evidence link: ' + error.message); }
}
function image(record, name) {
  check(['original', 'study', 'context'].includes(record.kind), 'Invalid image provenance: ' + name);
  check(typeof record.label === 'string' && record.label.length > 0, 'Image label required: ' + name);
  check(/^thumbnails\/[a-z0-9][a-z0-9_.-]*\.webp$/i.test(record.src), 'Unsafe image path: ' + name);
  try {
    const bytes = read('catalog/' + record.src);
    check(bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP', 'Invalid WebP: ' + record.src);
    images.add(record.src);
  } catch { problems.push('Missing image: ' + record.src); }
}
for (const [id, record] of Object.entries(thumbs.assets)) { check(ids.has(id), 'Thumbnail uses an unknown asset: ' + id); image(record, id); check(Boolean(thumbs.targets[record.targetId]), 'Thumbnail target missing: ' + id); }
for (const [id, record] of Object.entries(thumbs.targets)) image(record, id);
const bytes = [...images].reduce((sum, src) => sum + read('catalog/' + src).length, 0);
check(bytes < 10 * 1024 * 1024, 'Thumbnail budget exceeds 10 MB');
const stats = summarize(createRecords(inventory, undefined, getAssetCapabilities));
if (problems.length) { console.error(problems.map((p) => 'FAIL ' + p).join('\n')); process.exitCode = 1; }
else console.log(`OK Asset Library: ${modules.length} modules, ${stats.total} records, ${Object.keys(inventory.targets).length} evidence targets, ${Object.keys(thumbs.assets).length} pictured assets, ${images.size} WebP files (${(bytes / 1e6).toFixed(2)} MB), ${stats.editable} active editable entries`);
