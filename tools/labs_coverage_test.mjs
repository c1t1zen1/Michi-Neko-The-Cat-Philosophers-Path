// Regression checks for false coverage claims and inventory/source drift.
// node --test tools/labs_coverage_test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateInventory, renderReport, roofPieces } from './labs_coverage.mjs';

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
  delete data.assets.find((a) => a.id === 'jade-paw').coverage.find((c) => c.level === 'related').note;
  delete data.assets.find((a) => a.id === 'master-bells').note;
  hasError(data, /related evidence needs a limitation: jade-paw/);
  hasError(data, /unmapped\/inactive asset needs an explanation: master-bells/);
});

test('hidden rewards, guardian crows (now a direct critters study, v-critters) and inactive builders retain honest classifications', () => {
  const assets = inventory().assets;
  assert.deepEqual(assets.find((a) => a.id === 'jade-paw').coverage.map((c) => c.level), ['direct', 'related']);
  assert.deepEqual(assets.find((a) => a.id === 'guardian-crows').coverage.map((c) => c.level), ['direct']);
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

// The Roof Road (BUILD_GUIDE_FABLE.md §12 R1.1): inventoried, not excluded.
const PIECES_FILE = 'rooftops/js/pieces/index.js';
const withPiece = (line) => (file) => read(file) + (file === PIECES_FILE ? '\n' + line + '\n' : '');

test('the Roof Road is inventoried: one row per PIECES type, none excluded', () => {
  const data = inventory();
  assert.ok(!data.exclusions.some((e) => /roof road/i.test(e)), 'the Roof Road is no longer an exclusion');
  const rows = data.assets.filter((a) => a.group === 'Roof Road');
  const pieces = roofPieces();
  assert.ok(pieces.length >= 48, 'PIECES lists every piece type: ' + pieces.length);
  assert.ok(rows.length >= pieces.length + 10, 'piece rows plus roofs, skyline, sky, effects and the cast: ' + rows.length);
  const ids = new Set(rows.map((a) => a.id));
  for (const p of pieces) assert.ok(ids.has(p.id), p.type + ' -> ' + p.id);
  for (const id of ['roof-chidori', 'roof-shoki', 'roof-boatman', 'roof-hayashi', 'roof-okuribi', 'roof-sky', 'roof-hills', 'roof-distant-city', 'roof-skyline-pagodas', 'roof-atmosphere']) assert.ok(ids.has(id), id);
  const audit = validateInventory(data);
  assert.equal(audit.pieceCount, pieces.length);
  assert.ok(audit.roofModuleCount > 40 && audit.roofBuilderCount >= 10);
});

test('a new Roof Road piece type needs an inventory row in the Roof Road group', () => {
  hasError(inventory(), /unaccounted Roof Road piece type: lantern \(roof-new-lantern\)/, {
    readText: withPiece("  lantern: piece('roof-new-lantern', 'r4', 'pieces/lantern.js', lantern),")
  });
  const data = inventory();
  data.assets.find((a) => a.id === 'roof-kido').group = 'Props';
  hasError(data, /Roof Road piece row is not in the Roof Road group: roof-kido/);
});

test('two piece types cannot share one inventory id, and a piece row names its module', () => {
  hasError(inventory(), /Roof Road inventory id used by two piece types: roof-kido \(kido and kidoCopy\)/, {
    readText: withPiece("  kidoCopy: piece('roof-kido', 'r2', 'pieces/kido.js', kido),")
  });
  const data = inventory();
  data.assets.find((a) => a.id === 'roof-bridge').sources = [{ file: 'rooftops/js/pieces/kido.js', anchor: 'export const kido = (pc, ctx) => {' }];
  hasError(data, /Roof Road piece row does not name its module rooftops\/js\/pieces\/bridge.js: roof-bridge/);
});

test('a new Roof Road module or make/build function cannot escape the inventory', () => {
  const data = inventory();
  const roofFiles = [...data.sourceFiles.filter((f) => f.file.startsWith('rooftops/')).map((f) => f.file), 'rooftops/js/pieces/lantern.js'];
  hasError(data, /unclassified Roof Road module: rooftops\/js\/pieces\/lantern.js/, {
    roofFiles, readText: (file) => file === 'rooftops/js/pieces/lantern.js' ? '// A new piece.\n' : read(file)
  });
  hasError(data, /unaccounted Roof Road construction function: rooftops\/js\/pieces\/skyline.js:makeLanternSea/, {
    readText: (file) => read(file) + (file === 'rooftops/js/pieces/skyline.js' ? '\nexport function makeLanternSea(M) {}\n' : '')
  });
  // The runner modules draw nothing: classified excluded, they are not scanned.
  assert.deepEqual(validateInventory(data, {
    readText: (file) => read(file) + (file === 'rooftops/js/reach.js' ? '\nexport function buildShortcuts() {}\n' : '')
  }).errors, []);
});

test('a PIECES entry written another way cannot drop out of the checks', () => {
  hasError(inventory(), /has 49 piece\(\) calls but 48 read as/, {
    readText: withPiece('  "lantern": piece("roof-new-lantern", "r4", "pieces/lantern.js", lantern),')
  });
});

test('the Roof Road shelf is review evidence, not a focused study', () => {
  const data = inventory();
  assert.equal(data.targets['roofroad/bridge'].kind, 'review');
  assert.deepEqual(data.assets.find((a) => a.id === 'roof-bridge').coverage.map((c) => c.level), ['review']);
  data.assets.find((a) => a.id === 'roof-bridge').coverage[0].level = 'direct';
  hasError(data, /direct coverage requires a specimen or bench: roof-bridge/);
});

test('the game side of the Roof Road (src/rooftops/) is scanned: modules and valley builders cannot escape the inventory', () => {
  const data = inventory();
  const valley = data.assets.filter((a) => a.id === 'valley-seven-posts' || a.id === 'valley-odoi');
  assert.equal(valley.length, 2);
  assert.ok(valley.every((a) => a.group === 'Kyoto village' && a.sources.every((s) => s.file === 'src/rooftops/valley.js')));
  // Honest levels: no lab studies the valley props; only the sandbox Shōki is related, with a limitation.
  assert.deepEqual(valley.find((a) => a.id === 'valley-odoi').coverage, []);
  assert.deepEqual(valley.find((a) => a.id === 'valley-seven-posts').coverage.map((c) => c.level), ['related']);
  const roofFiles = [...data.sourceFiles.filter((f) => /^(rooftops|src\/rooftops)\//.test(f.file)).map((f) => f.file), 'src/rooftops/new_gate.js'];
  hasError(data, /unclassified Roof Road module: src\/rooftops\/new_gate.js/, {
    roofFiles, readText: (file) => file === 'src/rooftops/new_gate.js' ? '// A new module.\n' : read(file)
  });
  hasError(data, /unaccounted Roof Road construction function: src\/rooftops\/valley.js:buildNewGate/, {
    readText: (file) => read(file) + (file === 'src/rooftops/valley.js' ? '\nexport function buildNewGate(city) {}\n' : '')
  });
  const stripped = inventory();
  stripped.assets = stripped.assets.filter((a) => a.id !== 'valley-odoi');
  hasError(stripped, /unaccounted Roof Road construction function: src\/rooftops\/valley.js:buildOdoiThicket/);
});
