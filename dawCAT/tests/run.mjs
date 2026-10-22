/* Runs every tests/*.test.mjs suite. Usage: node tests/run.mjs [filter] */
import { readdirSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { setFile, runAll } from './harness.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(here).filter((f) => f.endsWith('.test.mjs')).sort();

for (const f of files) {
  setFile(f);
  await import(pathToFileURL(join(here, f)).href);
}

const failed = await runAll({ filter: process.argv[2] || '' });
process.exit(failed ? 1 : 0);
