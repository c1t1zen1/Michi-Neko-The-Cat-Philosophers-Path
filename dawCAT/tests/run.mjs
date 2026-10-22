/* Runs every tests/*.test.mjs suite. Usage: node tests/run.mjs [filter] */
import { readdirSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { setFile, runAll, test } from './harness.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(here).filter((f) => f.endsWith('.test.mjs')).sort();

// A suite whose import throws (e.g. a module it tests doesn't exist yet) is
// reported as one failing test instead of aborting every other suite.
for (const f of files) {
  setFile(f);
  try {
    await import(pathToFileURL(join(here, f)).href);
  } catch (err) {
    test('suite loads', () => { throw err; });
  }
}

const failed = await runAll({ filter: process.argv[2] || '' });
process.exit(failed ? 1 : 0);
