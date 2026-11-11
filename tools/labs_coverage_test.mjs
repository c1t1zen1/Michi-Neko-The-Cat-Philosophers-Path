// Regression checks for false coverage claims and inventory/source drift.
// node --test tools/labs_coverage_test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateInventory, renderReport } from './labs_coverage.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const read = (file) => readFileSync(ROOT + file, 'utf8').replace(/^\uFEFF/, '');
const inventory = () => JSON.parse(read('labs/asset_inventory.json'));
const hasError = (data, pattern, options) => assert.ok(validateInventory(data, options).errors.some((e) => pattern.test(e)), String(pattern));

test('the authored inventory resolves against the current game and lab sources', () => {
  const audit = validateInventory(inventory());
  assert.deepEqual(audit.errors, []);
  assert.ok(audit.builderCount > 100);
});

test('adding a visual builder requires an inventory owner', () => {
  hasError(inventory(), /unaccounted construction method.*buildNewTreasure/, {
    readText: (file) => read(file) + (file === 'src/countryside.js' ? '\n  buildNewTreasure() {}\n' : '')
  });
});

test('a new source module cannot silently escape the source inventory', () => {
  const data = inventory();
  hasError(data, /unclassified src module.*new_creature/, {
    files: [...data.sourceFiles.map((f) => f.file), 'src/new_creature.js'],
    readText: (file) => file === 'src/new_creature.js' ? '// A new game module.\n' : read(file)
  });
});

test('renaming a game construction anchor invalidates its evidence', () => {
  const data = inventory();
  data.assets.find((a) => a.id === 'key').sources[0].anchor = '  buildRenamedKey(';
  hasError(data, /stale anchor.*buildRenamedKey/);
  hasError(data, /unaccounted construction method.*buildSecretKey/);
});

test('removing a specimen definition invalidates its evidence target', () => {
  const data = inventory();
  data.targets['keepsakes/game-key'].anchor = "id: 'no-longer-a-specimen'";
  hasError(data, /stale anchor.*no-longer-a-specimen/);
});

test('an existing but different specimen cannot substantiate a selector', () => {
  const data = inventory();
  data.targets['keepsakes/game-key'].anchor = "id: 'game-yarn'";
  hasError(data, /specimen selector does not match its definition: keepsakes\/game-key/);
});

test('unknown target IDs and duplicate asset IDs fail the audit', () => {
  const data = inventory();
  data.assets.push(structuredClone(data.assets[0]));
  data.assets[0].coverage[0].target = 'keepsakes/imaginary';
  hasError(data, /duplicate asset id/);
  hasError(data, /unknown target/);
});

test('a review page cannot be promoted to focused lab coverage', () => {
  const data = inventory();
  data.assets.find((a) => a.id === 'michi').coverage[0].level = 'direct';
  hasError(data, /direct coverage requires a specimen or bench: michi/);
});

test('related evidence and missing coverage need explicit limitations', () => {
  const data = inventory();
  delete data.assets.find((a) => a.id === 'jade-paw').coverage[0].note;
  delete data.assets.find((a) => a.id === 'guardian-crows').note;
  hasError(data, /related evidence needs a limitation: jade-paw/);
  hasError(data, /unmapped\/inactive asset needs an explanation: guardian-crows/);
});

test('hidden rewards, guardian crows and inactive builders retain honest classifications', () => {
  const assets = inventory().assets;
  assert.deepEqual(assets.find((a) => a.id === 'jade-paw').coverage.map((c) => c.level), ['related']);
  assert.equal(assets.find((a) => a.id === 'guardian-crows').coverage.length, 0);
  assert.equal(assets.find((a) => a.id === 'old-petal-drifts').lifecycle, 'inactive');
  assert.equal(assets.find((a) => a.id === 'legacy-summit-gate').lifecycle, 'inactive');
});

test('the report counts overlapping evidence once per active catalog row', () => {
  const data = inventory();
  const asset = data.assets.find((a) => a.id === 'key');
  asset.coverage.push({ target: 'cat/anatomy', level: 'review' });
  // A second kind of evidence must not change the asset denominator or the
  // focused-lab count. Inactive entries must not enter that denominator.
  const report = renderReport(data, validateInventory(data));
  const baseline = renderReport(inventory(), validateInventory(inventory()));
  assert.equal(report.split('## Coverage by area')[0], baseline.split('## Coverage by area')[0]);
});
