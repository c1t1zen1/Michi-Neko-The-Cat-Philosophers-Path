// Source inventory + evidence-link audit. No browser, CDN or dependencies.
// node tools/labs_coverage.mjs --write  regenerates the readable report.
// node tools/labs_coverage.mjs          checks inventory and report freshness.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LABS } from '../labs/registry.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const INVENTORY = 'labs/asset_inventory.json';
const REPORT = 'labs/ASSET_COVERAGE.md';
const LEVELS = ['direct', 'review', 'embedded', 'related', 'missing'];
const LABELS = { direct: 'Focused lab study', review: 'Review sheet', embedded: 'Embedded in a specimen', related: 'Related evidence only', missing: 'No mapped evidence' };
const METHOD = /^  ((?:build|create)[A-Z]\w*)\(/gm;
const read = (file) => readFileSync(resolve(ROOT, file), 'utf8').replace(/^\uFEFF/, '');
const sourceFiles = () => readdirSync(resolve(ROOT, 'src')).filter((f) => f.endsWith('.js')).sort().map((f) => 'src/' + f);
const strongest = (asset) => LEVELS.find((level) => asset.coverage.some((c) => c.level === level)) || 'missing';
const pct = (n, total) => total ? (100 * n / total).toFixed(1) + '%' : '0.0%';
const esc = (value) => String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

// Verify named specimen selectors without importing browser-dependent modules.
// The three dynamic catalogs below derive IDs from an explicit family/key.
function specimenSelectorMatches(target, readText) {
  const anchor = target.anchor || '';
  const literal = anchor.match(/\bid\s*:\s*['"]([^'"]+)['"]/) || anchor.match(/(?:study|R)\(['"]([^'"]+)['"]/);
  if (literal) return literal[1] === target.selector;
  const baseline = anchor.match(/baseline\('([^']+)',/);
  if (baseline) return target.selector === baseline[1] + '-original' && readText(target.file).includes("family + '-original'");
  if (anchor === "slug: 'original-' + kind") {
    const kinds = readText(target.file).match(/export const VARIANTS = \[([^\]]+)\]\.map/);
    return target.selector.startsWith('original-') && [...(kinds?.[1] || '').matchAll(/'([^']+)'/g)].some((m) => target.selector === 'original-' + m[1]);
  }
  if (anchor === "slug: 'orig-' +") {
    const family = target.selector.replace(/^orig-/, '');
    return target.selector.startsWith('orig-') && readText(target.file).includes(`ORIG('${family}',`);
  }
  // Alley specimens are generated from the keyed prop definitions.
  if (target.file === 'labs/alley/js/props.js') {
    return anchor.trim() === target.selector + ':' && readText('labs/alley/js/recipes.js').includes('Object.entries(PROPS)');
  }
  return false;
}

// Injection lets the regression checks simulate source drift without editing src/.
export function validateInventory(data, { readText = read, files = sourceFiles() } = {}) {
  const errors = [], sources = new Map(), targetKeys = new Set(), assetIds = new Set();
  const labs = new Set([...LABS.map((lab) => lab.slug), 'grass', 'cat', 'tree', 'summit-review']);
  const check = (condition, message) => { if (!condition) errors.push(message); };
  check(data.schemaVersion === 1, 'unsupported inventory schema');
  check(/^\d{4}-\d{2}-\d{2}$/.test(data.reviewedAt), 'reviewedAt must be a calendar date');
  check(Boolean(data.scope && data.claimLimit && data.exclusions?.length), 'scope, limitations and exclusions are required');
  const texts = new Map();
  const text = (file) => {
    if (!texts.has(file)) {
      try { texts.set(file, readText(file)); } catch { errors.push('missing/unreadable file: ' + file); texts.set(file, ''); }
    }
    return texts.get(file);
  };
  const reference = (ref, context) => {
    const inside = typeof ref?.file === 'string' && !relative(ROOT, resolve(ROOT, ref.file)).split(sep).includes('..');
    check(inside, context + ': file must be inside the repository');
    check(typeof ref?.anchor === 'string' && ref.anchor.trim().length > 0, context + ': a nonempty evidence anchor is required');
    if (!inside || !ref?.anchor) return;
    check(text(ref.file).includes(ref.anchor), context + ': stale anchor in ' + ref.file + ': ' + ref.anchor.trim());
  };
  for (const entry of data.sourceFiles) {
    check(!sources.has(entry.file), 'duplicate source-file classification: ' + entry.file);
    sources.set(entry.file, entry);
    check(['assets', 'support', 'excluded'].includes(entry.role), 'invalid source role: ' + entry.file);
    check(Boolean(entry.reason?.trim()), 'source classification needs a reason: ' + entry.file);
  }
  for (const file of files) check(sources.has(file), 'unclassified src module: ' + file);
  for (const file of sources.keys()) check(files.includes(file), 'source module removed/renamed: ' + file);
  for (const [key, target] of Object.entries(data.targets)) {
    targetKeys.add(key);
    reference(target, 'target ' + key);
    check(labs.has(target.lab), 'unknown lab/review page: ' + key);
    check(Boolean(target.selector?.trim()), 'target selector required: ' + key);
    check(key === target.lab + '/' + target.selector, 'target key/selector mismatch: ' + key);
    check(['specimen', 'bench', 'review', 'interaction'].includes(target.kind), 'invalid target kind: ' + key);
    if (target.kind === 'specimen') check(specimenSelectorMatches(target, text), 'specimen selector does not match its definition: ' + key);
    if (target.url) {
      check(!target.url.includes('://') && !target.url.startsWith('/'), 'target URL must be project-relative: ' + key);
      try { readText(target.url.split(/[?#]/)[0]); } catch { errors.push('missing target page: ' + target.url); }
    }
  }
  const usedTargets = new Set(), ownership = new Map();
  const ownMethods = (ref, owner) => {
    if (!ref?.file || !ref?.anchor) return;
    // Anchors must name declarations. A call to another builder cannot account
    // for that builder's source; unrelated files cannot silently close a gap.
    for (const match of ref.anchor.matchAll(new RegExp(METHOD.source, 'gm'))) {
      const key = ref.file + ':' + match[1];
      const owners = ownership.get(key) || [];
      ownership.set(key, [...owners, owner]);
    }
  };
  for (const asset of data.assets) {
    check(/^[a-z][a-z0-9-]*$/.test(asset.id), 'invalid asset id: ' + asset.id);
    check(!assetIds.has(asset.id), 'duplicate asset id: ' + asset.id);
    assetIds.add(asset.id);
    check(Boolean(asset.label?.trim() && asset.group?.trim()), 'asset needs a label and group: ' + asset.id);
    check(['active', 'inactive'].includes(asset.lifecycle), 'invalid lifecycle: ' + asset.id);
    check(asset.sources?.length > 0, 'asset needs game-source evidence: ' + asset.id);
    for (const ref of asset.sources || []) {
      check(sources.has(ref.file), 'asset source is not a classified src module: ' + asset.id);
      reference(ref, 'asset ' + asset.id);
      ownMethods(ref, asset.id);
    }
    const mapped = new Set();
    check(Array.isArray(asset.coverage), 'asset coverage must be an array: ' + asset.id);
    for (const mapping of asset.coverage || []) {
      check(targetKeys.has(mapping.target), 'unknown target for ' + asset.id + ': ' + mapping.target);
      check(!mapped.has(mapping.target), 'duplicate target on ' + asset.id + ': ' + mapping.target);
      mapped.add(mapping.target); usedTargets.add(mapping.target);
      check(LEVELS.slice(0, -1).includes(mapping.level), 'invalid evidence level for ' + asset.id);
      if (mapping.level === 'direct') check(['specimen', 'bench'].includes(data.targets[mapping.target]?.kind), 'direct coverage requires a specimen or bench: ' + asset.id);
      if (mapping.level === 'review') check(data.targets[mapping.target]?.kind === 'review', 'review coverage requires a review target: ' + asset.id);
      if (mapping.level === 'related') check(Boolean(mapping.note?.trim()), 'related evidence needs a limitation: ' + asset.id);
    }
    if (!asset.coverage?.length || asset.lifecycle === 'inactive') check(Boolean(asset.note?.trim()), 'unmapped/inactive asset needs an explanation: ' + asset.id);
  }
  for (const key of targetKeys) check(usedTargets.has(key), 'unused evidence target: ' + key);
  for (const entry of data.nonVisualEntries || []) {
    check(!assetIds.has(entry.id), 'duplicate visual/nonvisual asset id: ' + entry.id);
    assetIds.add(entry.id);
    check(Boolean(entry.label?.trim() && entry.reason?.trim() && entry.sources?.length), 'nonvisual entry needs a label, reason and source: ' + entry.id);
    for (const ref of entry.sources || []) {
      check(sources.has(ref.file), 'nonvisual source is not classified: ' + entry.id);
      reference(ref, 'nonvisual entry ' + entry.id);
    }
  }
  for (const helper of data.ignoredBuilders) {
    reference(helper, 'helper');
    check(sources.has(helper.file), 'helper source is not classified: ' + helper.file);
    check(Boolean(helper.reason?.trim()), 'ignored builder needs a reason: ' + helper.file);
    ownMethods(helper, 'helper: ' + helper.reason);
  }
  let builderCount = 0;
  for (const file of files) {
    for (const match of text(file).matchAll(new RegExp(METHOD.source, 'gm'))) {
      builderCount++;
      check(ownership.has(file + ':' + match[1]), 'unaccounted construction method: ' + file + ':' + match[1]);
    }
  }
  return { errors, builderCount, moduleCount: files.length, readText: text };
}

export function renderReport(data, audit) {
  const active = data.assets.filter((a) => a.lifecycle === 'active');
  const inactive = data.assets.filter((a) => a.lifecycle === 'inactive');
  const counts = Object.fromEntries(LEVELS.map((level) => [level, active.filter((a) => strongest(a) === level).length]));
  const line = (ref) => audit.readText(ref.file).slice(0, audit.readText(ref.file).indexOf(ref.anchor)).split('\n').length;
  const link = (ref, label) => `[${esc(label)}](../${ref.file}#L${line(ref)})`;
  const mapping = (m) => {
    const target = data.targets[m.target];
    return `${link(target, target.lab + ' / ' + target.selector)} (${m.level})${m.note ? ' — ' + esc(m.note) : ''}`;
  };
  const out = [
    '# Game asset inventory and lab coverage', '',
    `Reviewed ${data.reviewedAt}. Generated from [asset_inventory.json](asset_inventory.json) by [labs_coverage.mjs](../tools/labs_coverage.mjs).`, '',
    '[Open the interactive Asset Library](../catalog/) — searchable originals, lab specimens, production notes, cadJS editing and AI plans.', '',
    '## What can be claimed', '',
    `The inventory accounts for **${audit.moduleCount} core source modules** and **${audit.builderCount} build/create construction methods**. It records **${active.length} active asset types and assemblies**, plus **${inactive.length} inactive entries**. **${counts.direct} of ${active.length} (${pct(counts.direct, active.length)}) have a focused lab study.** Full individual specimen coverage is incomplete.`, '',
    data.scope, '',
    data.claimLimit, '',
    'Assemblies and recognizable subcomponents overlap by design. The denominator counts catalog rows, not unique meshes or every object instance. A variant count (including the 381 shelf captures in the construction review) cannot establish an asset coverage percentage.', '',
    '## Coverage rules', '',
    '| Level | Evidence required |', '|---|---|',
    '| Focused lab study (`direct`) | A named specimen, room recipe or explicit bench studies this asset type. The study may be a redesign; mappings state important differences. |',
    '| Review sheet (`review`) | A real game preview/review page can inspect the asset. Whole-scene summit reviews are identified as such and have no individual lab specimen. |',
    '| Embedded (`embedded`) | Returned inside another named specimen with rendering enabled; no focused study is claimed. Camera framing and occlusion still require visual review. |',
    '| Related (`related`) | Similar technique, different source object, hidden reference object or interaction only. This does not close the coverage gap. |',
    '| Missing (`missing`) | No mapped evidence. |', '',
    'Each active row is counted once at its strongest evidence level, in the order above. Review-only rows are outside the focused-lab total. A builder being loaded or constructing an invisible mesh is insufficient evidence of visible coverage.', '',
    '| Strongest evidence | Active rows | Share |', '|---|---:|---:|',
    ...LEVELS.map((level) => `| ${LABELS[level]} | ${counts[level]} | ${pct(counts[level], active.length)} |`), '',
    '## Coverage by area', '', '| Area | Active rows | Focused | Review | Embedded | Related | Missing |', '|---|---:|---:|---:|---:|---:|---:|'
  ];
  const groups = [...new Set(active.map((a) => a.group))];
  for (const group of groups) {
    const rows = active.filter((a) => a.group === group);
    out.push(`| ${esc(group)} | ${rows.length} | ${LEVELS.map((l) => rows.filter((a) => strongest(a) === l).length).join(' | ')} |`);
  }
  out.push('', '## Gaps requiring focused specimens', '',
    'This list includes every active row without a focused study, including review-only and embedded references. Related mappings are leads for future work, not proof of asset coverage.', '',
    '| Asset | Current evidence | Limitation |', '|---|---|---|');
  for (const asset of active.filter((a) => strongest(a) !== 'direct')) {
    const limitations = [asset.note, ...asset.coverage.map((m) => m.note)].filter(Boolean);
    out.push(`| [${esc(asset.label)}](#${asset.id}) | ${LABELS[strongest(asset)]} | ${esc(limitations.join(' ') || 'No individual focused specimen is mapped.')} |`);
  }
  out.push('', '## Inventory and individual evidence', '',
    'Source links resolve to declarations or recognizable construction anchors. Evidence links resolve to the actual specimen definition, bench or review code. Dynamic specimen IDs (for example `original-secret` and `orig-tower`) link to their generating definitions.', '');
  for (const group of [...groups, ...new Set(inactive.map((a) => a.group))]) {
    out.push('### ' + group, '', '| Asset ID / type | Game source | Evidence | Notes |', '|---|---|---|---|');
    for (const asset of data.assets.filter((a) => a.group === group)) {
      out.push(`| <a id="${asset.id}"></a>\`${asset.id}\` — ${esc(asset.label)} | ${asset.sources.map((s) => link(s, s.file + ':' + s.anchor.trim())).join('<br>')} | ${asset.coverage.map(mapping).join('<br>') || '**No mapped evidence**'} | ${asset.lifecycle === 'inactive' ? '**Inactive.** ' : ''}${esc(asset.note || '')} |`);
    }
    out.push('');
  }
  out.push('## Source-module accounting', '',
    'Every current `src/*.js` module is classified. Every class method declared with a `buildX` or `createX` name has an inventory owner or an explicit helper exclusion. Nonconforming entry points (trees, grass additions, scent, cosmetics and optional GLB loading) are mapped manually. New semantic objects added inside an existing method still require human review.', '',
    '| Module | Role | Accounting |', '|---|---|---|',
    ...data.sourceFiles.map((f) => `| [${f.file}](../${f.file}) | ${f.role} | ${esc(f.reason)} |`), '',
    '### Explained construction helpers', '', '| Source | Reason |', '|---|---|',
    ...data.ignoredBuilders.map((h) => `| ${link(h, h.file + ':' + h.anchor.trim())} | ${esc(h.reason)} |`), '',
    '## Scope exclusions and text-only rewards', '', ...data.exclusions.map((s) => '- ' + s), '',
    'Narrative-only characters and journal/progression rewards are recorded separately below, outside the visual-asset denominator. The Guardian’s Feather, Golden Dango and Jade Paw have actual meshes and are inventoried above.', '',
    '| Nonvisual entry | Source | Reason |', '|---|---|---|',
    ...(data.nonVisualEntries || []).map((e) => `| ${esc(e.label)} | ${e.sources.map((s) => link(s, s.file)).join('<br>')} | ${esc(e.reason)} |`), '',
    'Optional media and dormant code are recorded without claiming that a download succeeded or an unused builder is part of the current playable scene. The Roof Road retains its own prototype review and reachability checks.', '',
    '## Keeping the claim current', '',
    '1. Add or update an asset row when an authored visual type changes. Use a game-source declaration or unique construction anchor.',
    '2. Map its actual specimen/bench/review definition. Keep invisible objects and analogous techniques at `related`; record missing coverage with an explanation.',
    '3. Classify new source modules and account for new `buildX`/`createX` methods. Keep retired assets marked `inactive`.',
    '4. Run `node tools/labs_coverage.mjs --write`, then `node tools/labs_coverage.mjs` and `node --test tools/labs_coverage_test.mjs`.', '',
    'The checker validates source anchors, named specimen selectors (including the catalog’s dynamic IDs), target references, unique IDs, method accounting, classifications and report freshness. It does not render the specimens, prove geometric fidelity or verify game integration. Use the browser construction review for visual evidence.', ''
  );
  return out.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  if (args.some((a) => a !== '--write')) throw new Error('Usage: node tools/labs_coverage.mjs [--write]');
  const data = JSON.parse(read(INVENTORY));
  const audit = validateInventory(data);
  if (audit.errors.length) {
    console.error(audit.errors.map((e) => 'FAIL ' + e).join('\n'));
    process.exitCode = 1;
    return;
  }
  const report = renderReport(data, audit);
  if (args.includes('--write')) {
    writeFileSync(resolve(ROOT, REPORT), report);
    console.log('Wrote ' + REPORT);
  } else {
    let current = '';
    try { current = read(REPORT); } catch { /* Missing report is stale. */ }
    if (current !== report) {
      console.error('FAIL coverage report is stale; run node tools/labs_coverage.mjs --write');
      process.exitCode = 1;
      return;
    }
  }
  const active = data.assets.filter((a) => a.lifecycle === 'active');
  console.log(`OK ${audit.moduleCount} source modules, ${audit.builderCount} construction methods, ${data.assets.length} inventory rows, ${Object.keys(data.targets).length} evidence targets`);
  console.log('Active coverage: ' + LEVELS.map((l) => `${l}=${active.filter((a) => strongest(a) === l).length}`).join(', '));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
